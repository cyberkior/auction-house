-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum types
CREATE TYPE auction_status AS ENUM ('upcoming', 'current', 'past', 'settling', 'completed', 'failed');
CREATE TYPE moderation_status AS ENUM ('pending', 'approved', 'flagged', 'removed');
CREATE TYPE report_category AS ENUM ('nsfw', 'scam', 'stolen', 'harassment');
CREATE TYPE report_outcome AS ENUM ('pending', 'dismissed', 'actioned');
CREATE TYPE settlement_status AS ENUM ('pending', 'paid', 'failed');

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    wallet_address TEXT UNIQUE NOT NULL,
    username TEXT,
    avatar_url TEXT,
    credits INTEGER DEFAULT 100 NOT NULL,
    strikes INTEGER DEFAULT 0 NOT NULL,
    is_restricted BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Auctions table
CREATE TABLE auctions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    creator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    image_url TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}',
    reserve_price BIGINT DEFAULT 0 NOT NULL, -- in lamports
    min_bid_increment BIGINT NOT NULL, -- in lamports
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    status auction_status DEFAULT 'upcoming' NOT NULL,
    winner_id UUID REFERENCES users(id),
    winning_bid BIGINT,
    moderation_status moderation_status DEFAULT 'pending' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Bids table
CREATE TABLE bids (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auction_id UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
    bidder_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount BIGINT NOT NULL, -- in lamports
    collateral_locked BIGINT NOT NULL, -- in lamports (10% of amount)
    is_top_3 BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    outbid_at TIMESTAMPTZ
);

-- Settlements table
CREATE TABLE settlements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    auction_id UUID UNIQUE NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
    winner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    payment_deadline TIMESTAMPTZ NOT NULL,
    payment_tx_signature TEXT,
    fee_tx_signature TEXT,
    status settlement_status DEFAULT 'pending' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Reports table
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    auction_id UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
    category report_category NOT NULL,
    description TEXT NOT NULL,
    outcome report_outcome DEFAULT 'pending' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_users_wallet ON users(wallet_address);
CREATE INDEX idx_auctions_status ON auctions(status);
CREATE INDEX idx_auctions_creator ON auctions(creator_id);
CREATE INDEX idx_auctions_end_time ON auctions(end_time);
CREATE INDEX idx_bids_auction ON bids(auction_id);
CREATE INDEX idx_bids_bidder ON bids(bidder_id);
CREATE INDEX idx_bids_top_3 ON bids(auction_id, is_top_3) WHERE is_top_3 = TRUE;

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER auctions_updated_at
    BEFORE UPDATE ON auctions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Users: Public read, own profile write
CREATE POLICY "Users are viewable by everyone"
    ON users FOR SELECT
    USING (true);

CREATE POLICY "Users can update own profile"
    ON users FOR UPDATE
    USING (wallet_address = current_setting('app.current_user_wallet', true));

-- Auctions: Public read, creator can create/update
CREATE POLICY "Auctions are viewable by everyone"
    ON auctions FOR SELECT
    USING (true);

CREATE POLICY "Users can create auctions"
    ON auctions FOR INSERT
    WITH CHECK (
        creator_id IN (
            SELECT id FROM users
            WHERE wallet_address = current_setting('app.current_user_wallet', true)
        )
    );

CREATE POLICY "Creators can update own auctions"
    ON auctions FOR UPDATE
    USING (
        creator_id IN (
            SELECT id FROM users
            WHERE wallet_address = current_setting('app.current_user_wallet', true)
        )
    );

-- Bids: Public read, authenticated users can create
CREATE POLICY "Bids are viewable by everyone"
    ON bids FOR SELECT
    USING (true);

CREATE POLICY "Users can create bids"
    ON bids FOR INSERT
    WITH CHECK (
        bidder_id IN (
            SELECT id FROM users
            WHERE wallet_address = current_setting('app.current_user_wallet', true)
        )
    );

-- Settlements: Involved parties can view
CREATE POLICY "Settlements viewable by participants"
    ON settlements FOR SELECT
    USING (
        winner_id IN (
            SELECT id FROM users
            WHERE wallet_address = current_setting('app.current_user_wallet', true)
        )
        OR
        auction_id IN (
            SELECT id FROM auctions
            WHERE creator_id IN (
                SELECT id FROM users
                WHERE wallet_address = current_setting('app.current_user_wallet', true)
            )
        )
    );

-- Reports: Reporter can view own, create
CREATE POLICY "Users can view own reports"
    ON reports FOR SELECT
    USING (
        reporter_id IN (
            SELECT id FROM users
            WHERE wallet_address = current_setting('app.current_user_wallet', true)
        )
    );

CREATE POLICY "Users can create reports"
    ON reports FOR INSERT
    WITH CHECK (
        reporter_id IN (
            SELECT id FROM users
            WHERE wallet_address = current_setting('app.current_user_wallet', true)
        )
    );

-- Function to get or create user by wallet address
CREATE OR REPLACE FUNCTION get_or_create_user(p_wallet_address TEXT)
RETURNS users AS $$
DECLARE
    v_user users;
BEGIN
    SELECT * INTO v_user FROM users WHERE wallet_address = p_wallet_address;

    IF NOT FOUND THEN
        INSERT INTO users (wallet_address) VALUES (p_wallet_address)
        RETURNING * INTO v_user;
    END IF;

    RETURN v_user;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update auction statuses based on time
CREATE OR REPLACE FUNCTION update_auction_statuses()
RETURNS void AS $$
BEGIN
    -- Upcoming -> Current
    UPDATE auctions
    SET status = 'current'
    WHERE status = 'upcoming'
    AND start_time <= NOW();

    -- Current -> Past (for auctions with no bids)
    -- Current -> Settling (for auctions with bids)
    UPDATE auctions
    SET status = CASE
        WHEN EXISTS (SELECT 1 FROM bids WHERE bids.auction_id = auctions.id)
        THEN 'settling'::auction_status
        ELSE 'past'::auction_status
    END
    WHERE status = 'current'
    AND end_time <= NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to place a bid
CREATE OR REPLACE FUNCTION place_bid(
    p_auction_id UUID,
    p_bidder_wallet TEXT,
    p_amount BIGINT
)
RETURNS bids AS $$
DECLARE
    v_auction auctions;
    v_bidder users;
    v_current_highest BIGINT;
    v_new_bid bids;
    v_anti_snipe_threshold INTERVAL := INTERVAL '60 seconds';
    v_anti_snipe_extension INTERVAL := INTERVAL '120 seconds';
BEGIN
    -- Get auction
    SELECT * INTO v_auction FROM auctions WHERE id = p_auction_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Auction not found';
    END IF;

    -- Verify auction is current
    IF v_auction.status != 'current' THEN
        RAISE EXCEPTION 'Auction is not active';
    END IF;

    -- Get bidder
    SELECT * INTO v_bidder FROM users WHERE wallet_address = p_bidder_wallet;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found';
    END IF;

    -- Check if bidder is restricted
    IF v_bidder.is_restricted THEN
        RAISE EXCEPTION 'User is restricted from bidding';
    END IF;

    -- Get current highest bid
    SELECT COALESCE(MAX(amount), v_auction.reserve_price) INTO v_current_highest
    FROM bids WHERE auction_id = p_auction_id;

    -- Verify bid amount
    IF p_amount < v_current_highest + v_auction.min_bid_increment THEN
        RAISE EXCEPTION 'Bid must be at least % lamports', v_current_highest + v_auction.min_bid_increment;
    END IF;

    -- Create the bid
    INSERT INTO bids (auction_id, bidder_id, amount, collateral_locked)
    VALUES (p_auction_id, v_bidder.id, p_amount, p_amount / 10)
    RETURNING * INTO v_new_bid;

    -- Mark previous bidder as outbid (if not in top 3)
    UPDATE bids
    SET outbid_at = NOW(), is_top_3 = FALSE
    WHERE auction_id = p_auction_id
    AND id != v_new_bid.id
    AND is_top_3 = FALSE;

    -- Update top 3 flags
    WITH ranked_bids AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY amount DESC) as rank
        FROM bids
        WHERE auction_id = p_auction_id AND outbid_at IS NULL
    )
    UPDATE bids
    SET is_top_3 = (ranked_bids.rank <= 3)
    FROM ranked_bids
    WHERE bids.id = ranked_bids.id;

    -- Anti-sniping: extend if bid within last 60 seconds
    IF v_auction.end_time - NOW() < v_anti_snipe_threshold THEN
        UPDATE auctions
        SET end_time = end_time + v_anti_snipe_extension
        WHERE id = p_auction_id;
    END IF;

    RETURN v_new_bid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
