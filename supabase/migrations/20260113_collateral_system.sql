-- Collateral System Migration
-- Implements top 3 bidder collateral locking with cascading 24h payment windows

-- ============================================================================
-- STEP 1: Add columns to bids table
-- ============================================================================

ALTER TABLE bids ADD COLUMN IF NOT EXISTS collateral_status TEXT DEFAULT 'none';
-- Values: 'none', 'locked', 'returned', 'forfeited', 'applied'
-- 'applied' = collateral was used as part of the winning payment (10% deposit + 90% payment = 100%)

ALTER TABLE bids ADD COLUMN IF NOT EXISTS collateral_locked_at TIMESTAMPTZ;
ALTER TABLE bids ADD COLUMN IF NOT EXISTS collateral_returned_at TIMESTAMPTZ;
ALTER TABLE bids ADD COLUMN IF NOT EXISTS collateral_forfeited_at TIMESTAMPTZ;

ALTER TABLE bids ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';
-- Values: 'pending', 'paid', 'failed'

ALTER TABLE bids ADD COLUMN IF NOT EXISTS payment_deadline TIMESTAMPTZ;
ALTER TABLE bids ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

-- Index for finding bids by collateral status
CREATE INDEX IF NOT EXISTS idx_bids_collateral_status ON bids(collateral_status);

-- ============================================================================
-- STEP 2: Add columns to auctions table
-- ============================================================================

ALTER TABLE auctions ADD COLUMN IF NOT EXISTS current_winner_position INT DEFAULT 1;
ALTER TABLE auctions ADD COLUMN IF NOT EXISTS winner_deadline TIMESTAMPTZ;
ALTER TABLE auctions ADD COLUMN IF NOT EXISTS settlement_started_at TIMESTAMPTZ;
ALTER TABLE auctions ADD COLUMN IF NOT EXISTS total_settlement_deadline TIMESTAMPTZ;

-- Index for finding auctions in settlement
CREATE INDEX IF NOT EXISTS idx_auctions_settling ON auctions(status, winner_deadline)
    WHERE status = 'settling';

-- ============================================================================
-- STEP 3: Create collateral_transactions audit table
-- ============================================================================

CREATE TABLE IF NOT EXISTS collateral_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bid_id UUID NOT NULL REFERENCES bids(id) ON DELETE CASCADE,
    auction_id UUID NOT NULL REFERENCES auctions(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount BIGINT NOT NULL,
    type TEXT NOT NULL,  -- 'locked', 'returned', 'forfeited'
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_collateral_tx_bid ON collateral_transactions(bid_id);
CREATE INDEX IF NOT EXISTS idx_collateral_tx_auction ON collateral_transactions(auction_id);
CREATE INDEX IF NOT EXISTS idx_collateral_tx_user ON collateral_transactions(user_id);

-- RLS for collateral_transactions
ALTER TABLE collateral_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Collateral transactions viewable by participants"
    ON collateral_transactions FOR SELECT
    USING (
        user_id IN (
            SELECT id FROM users
            WHERE wallet_address = current_setting('app.current_user_wallet', true)
        )
    );

-- ============================================================================
-- STEP 4: Backfill existing top 3 bids
-- ============================================================================

UPDATE bids
SET collateral_status = 'locked',
    collateral_locked_at = created_at
WHERE is_top_3 = TRUE
  AND collateral_status = 'none';

-- ============================================================================
-- STEP 5: Update place_bid function to track collateral status
-- ============================================================================

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
    v_old_top_3_ids UUID[];
    v_new_top_3_ids UUID[];
    v_entering_top_3 UUID[];
    v_leaving_top_3 UUID[];
    v_bid_record RECORD;
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

    -- Capture old top 3 before inserting new bid
    SELECT ARRAY_AGG(id ORDER BY amount DESC)
    INTO v_old_top_3_ids
    FROM (
        SELECT id, amount
        FROM bids
        WHERE auction_id = p_auction_id
        ORDER BY amount DESC
        LIMIT 3
    ) t;

    -- Create the bid
    INSERT INTO bids (auction_id, bidder_id, amount, collateral_locked, collateral_status, collateral_locked_at)
    VALUES (p_auction_id, v_bidder.id, p_amount, p_amount / 10, 'locked', NOW())
    RETURNING * INTO v_new_bid;

    -- Insert audit record for new bid's collateral lock
    INSERT INTO collateral_transactions (bid_id, auction_id, user_id, amount, type)
    VALUES (v_new_bid.id, p_auction_id, v_bidder.id, v_new_bid.collateral_locked, 'locked');

    -- Calculate new top 3 after inserting new bid
    SELECT ARRAY_AGG(id ORDER BY amount DESC)
    INTO v_new_top_3_ids
    FROM (
        SELECT id, amount
        FROM bids
        WHERE auction_id = p_auction_id
        ORDER BY amount DESC
        LIMIT 3
    ) t;

    -- Find bids leaving top 3 (were in old, not in new)
    SELECT ARRAY_AGG(id)
    INTO v_leaving_top_3
    FROM unnest(v_old_top_3_ids) AS id
    WHERE id IS NOT NULL
      AND id != v_new_bid.id
      AND NOT (id = ANY(v_new_top_3_ids));

    -- Update bids leaving top 3: return their collateral
    IF v_leaving_top_3 IS NOT NULL AND array_length(v_leaving_top_3, 1) > 0 THEN
        -- Update collateral status
        UPDATE bids
        SET collateral_status = 'returned',
            collateral_returned_at = NOW(),
            is_top_3 = FALSE,
            outbid_at = COALESCE(outbid_at, NOW())
        WHERE id = ANY(v_leaving_top_3);

        -- Insert audit records for returned collateral
        FOR v_bid_record IN
            SELECT b.id, b.auction_id, b.bidder_id, b.collateral_locked
            FROM bids b
            WHERE b.id = ANY(v_leaving_top_3)
        LOOP
            INSERT INTO collateral_transactions (bid_id, auction_id, user_id, amount, type)
            VALUES (v_bid_record.id, v_bid_record.auction_id, v_bid_record.bidder_id, v_bid_record.collateral_locked, 'returned');
        END LOOP;
    END IF;

    -- Reset all is_top_3 flags
    UPDATE bids
    SET is_top_3 = FALSE
    WHERE auction_id = p_auction_id;

    -- Mark the new top 3
    UPDATE bids
    SET is_top_3 = TRUE
    WHERE id = ANY(v_new_top_3_ids);

    -- Mark bids outside top 3 as outbid
    UPDATE bids
    SET outbid_at = COALESCE(outbid_at, NOW())
    WHERE auction_id = p_auction_id
    AND is_top_3 = FALSE
    AND outbid_at IS NULL;

    -- Anti-sniping: extend if bid within last 60 seconds
    IF v_auction.end_time - NOW() < v_anti_snipe_threshold THEN
        UPDATE auctions
        SET end_time = end_time + v_anti_snipe_extension
        WHERE id = p_auction_id;
    END IF;

    RETURN v_new_bid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 6: Create start_settlement function
-- ============================================================================

CREATE OR REPLACE FUNCTION start_settlement(p_auction_id UUID)
RETURNS void AS $$
DECLARE
    v_auction auctions;
    v_winner_bid bids;
BEGIN
    -- Get auction
    SELECT * INTO v_auction FROM auctions WHERE id = p_auction_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Auction not found';
    END IF;

    -- Only start settlement for auctions that just entered settling status
    IF v_auction.status != 'settling' THEN
        RAISE EXCEPTION 'Auction is not in settling status';
    END IF;

    -- Don't restart if already started
    IF v_auction.settlement_started_at IS NOT NULL THEN
        RETURN;
    END IF;

    -- Get the top bid (winner #1)
    SELECT * INTO v_winner_bid
    FROM bids
    WHERE auction_id = p_auction_id
    ORDER BY amount DESC
    LIMIT 1;

    IF NOT FOUND THEN
        -- No bids, mark as failed
        UPDATE auctions
        SET status = 'failed'
        WHERE id = p_auction_id;
        RETURN;
    END IF;

    -- Set settlement deadlines
    UPDATE auctions
    SET settlement_started_at = NOW(),
        current_winner_position = 1,
        winner_deadline = NOW() + INTERVAL '24 hours',
        total_settlement_deadline = NOW() + INTERVAL '72 hours'
    WHERE id = p_auction_id;

    -- Set payment deadline on winner #1's bid
    UPDATE bids
    SET payment_deadline = NOW() + INTERVAL '24 hours'
    WHERE id = v_winner_bid.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 7: Create process_winner_timeout function
-- ============================================================================

CREATE OR REPLACE FUNCTION process_winner_timeout(p_auction_id UUID)
RETURNS void AS $$
DECLARE
    v_auction auctions;
    v_current_winner bids;
    v_next_winner bids;
    v_top_3_count INT;
BEGIN
    -- Get auction
    SELECT * INTO v_auction FROM auctions WHERE id = p_auction_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Auction not found';
    END IF;

    -- Only process settling auctions
    IF v_auction.status != 'settling' THEN
        RETURN;
    END IF;

    -- Check if deadline has passed
    IF v_auction.winner_deadline > NOW() THEN
        RETURN; -- Deadline not yet passed
    END IF;

    -- Check if 72h total deadline exceeded
    IF v_auction.total_settlement_deadline <= NOW() THEN
        -- Forfeit all remaining locked collateral and fail auction
        UPDATE bids
        SET collateral_status = 'forfeited',
            collateral_forfeited_at = NOW(),
            payment_status = 'failed'
        WHERE auction_id = p_auction_id
        AND is_top_3 = TRUE
        AND collateral_status = 'locked';

        -- Insert audit records for forfeited collateral
        INSERT INTO collateral_transactions (bid_id, auction_id, user_id, amount, type)
        SELECT id, auction_id, bidder_id, collateral_locked, 'forfeited'
        FROM bids
        WHERE auction_id = p_auction_id
        AND collateral_forfeited_at = NOW();

        UPDATE auctions
        SET status = 'failed'
        WHERE id = p_auction_id;

        RETURN;
    END IF;

    -- Get current winner's bid (by position)
    SELECT * INTO v_current_winner
    FROM bids
    WHERE auction_id = p_auction_id
    ORDER BY amount DESC
    OFFSET (v_auction.current_winner_position - 1)
    LIMIT 1;

    IF NOT FOUND THEN
        -- No more winners, fail auction
        UPDATE auctions
        SET status = 'failed'
        WHERE id = p_auction_id;
        RETURN;
    END IF;

    -- Forfeit current winner's collateral
    UPDATE bids
    SET collateral_status = 'forfeited',
        collateral_forfeited_at = NOW(),
        payment_status = 'failed'
    WHERE id = v_current_winner.id;

    -- Insert audit record for forfeited collateral
    INSERT INTO collateral_transactions (bid_id, auction_id, user_id, amount, type)
    VALUES (v_current_winner.id, p_auction_id, v_current_winner.bidder_id, v_current_winner.collateral_locked, 'forfeited');

    -- Count how many bids exist
    SELECT COUNT(*) INTO v_top_3_count
    FROM bids
    WHERE auction_id = p_auction_id;

    -- Check if there's a next winner
    IF v_auction.current_winner_position >= 3 OR v_auction.current_winner_position >= v_top_3_count THEN
        -- No more winners, fail auction
        UPDATE auctions
        SET status = 'failed'
        WHERE id = p_auction_id;
        RETURN;
    END IF;

    -- Move to next winner
    SELECT * INTO v_next_winner
    FROM bids
    WHERE auction_id = p_auction_id
    ORDER BY amount DESC
    OFFSET v_auction.current_winner_position
    LIMIT 1;

    IF NOT FOUND THEN
        UPDATE auctions
        SET status = 'failed'
        WHERE id = p_auction_id;
        RETURN;
    END IF;

    -- Update auction to next winner
    UPDATE auctions
    SET current_winner_position = current_winner_position + 1,
        winner_deadline = NOW() + INTERVAL '24 hours'
    WHERE id = p_auction_id;

    -- Set payment deadline on next winner's bid
    UPDATE bids
    SET payment_deadline = NOW() + INTERVAL '24 hours'
    WHERE id = v_next_winner.id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 8: Create confirm_payment function
-- ============================================================================

CREATE OR REPLACE FUNCTION confirm_payment(p_auction_id UUID, p_bidder_wallet TEXT)
RETURNS void AS $$
DECLARE
    v_auction auctions;
    v_bidder users;
    v_current_winner bids;
    v_bid_record RECORD;
BEGIN
    -- Get auction
    SELECT * INTO v_auction FROM auctions WHERE id = p_auction_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Auction not found';
    END IF;

    -- Only process settling auctions
    IF v_auction.status != 'settling' THEN
        RAISE EXCEPTION 'Auction is not in settling status';
    END IF;

    -- Get bidder
    SELECT * INTO v_bidder FROM users WHERE wallet_address = p_bidder_wallet;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'User not found';
    END IF;

    -- Get current winner's bid
    SELECT * INTO v_current_winner
    FROM bids
    WHERE auction_id = p_auction_id
    ORDER BY amount DESC
    OFFSET (v_auction.current_winner_position - 1)
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No current winner found';
    END IF;

    -- Verify caller is current winner
    IF v_current_winner.bidder_id != v_bidder.id THEN
        RAISE EXCEPTION 'Only the current winner can confirm payment';
    END IF;

    -- Check deadline hasn't passed
    IF v_auction.winner_deadline < NOW() THEN
        RAISE EXCEPTION 'Payment deadline has passed';
    END IF;

    -- Mark payment as complete
    -- Collateral becomes part of the payment (not returned separately)
    UPDATE bids
    SET payment_status = 'paid',
        paid_at = NOW(),
        collateral_status = 'applied',  -- Applied to purchase, not returned
        collateral_returned_at = NULL
    WHERE id = v_current_winner.id;

    -- Insert audit record for applied collateral (used toward payment)
    INSERT INTO collateral_transactions (bid_id, auction_id, user_id, amount, type)
    VALUES (v_current_winner.id, p_auction_id, v_current_winner.bidder_id, v_current_winner.collateral_locked, 'applied');

    -- Return collateral to other top 3 bidders who haven't forfeited
    FOR v_bid_record IN
        SELECT b.id, b.auction_id, b.bidder_id, b.collateral_locked
        FROM bids b
        WHERE b.auction_id = p_auction_id
        AND b.id != v_current_winner.id
        AND b.is_top_3 = TRUE
        AND b.collateral_status = 'locked'
    LOOP
        UPDATE bids
        SET collateral_status = 'returned',
            collateral_returned_at = NOW()
        WHERE id = v_bid_record.id;

        INSERT INTO collateral_transactions (bid_id, auction_id, user_id, amount, type)
        VALUES (v_bid_record.id, v_bid_record.auction_id, v_bid_record.bidder_id, v_bid_record.collateral_locked, 'returned');
    END LOOP;

    -- Mark auction as completed
    UPDATE auctions
    SET status = 'completed',
        winner_id = v_current_winner.bidder_id,
        winning_bid = v_current_winner.amount
    WHERE id = p_auction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 9: Update update_auction_statuses to handle settlement
-- ============================================================================

CREATE OR REPLACE FUNCTION update_auction_statuses()
RETURNS void AS $$
DECLARE
    v_auction_record RECORD;
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

    -- Start settlement for newly settling auctions
    FOR v_auction_record IN
        SELECT id FROM auctions
        WHERE status = 'settling'
        AND settlement_started_at IS NULL
    LOOP
        PERFORM start_settlement(v_auction_record.id);
    END LOOP;

    -- Process winner timeouts for auctions past their deadline
    FOR v_auction_record IN
        SELECT id FROM auctions
        WHERE status = 'settling'
        AND winner_deadline IS NOT NULL
        AND winner_deadline <= NOW()
    LOOP
        PERFORM process_winner_timeout(v_auction_record.id);
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
