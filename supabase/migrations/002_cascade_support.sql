-- Migration: Add cascade support for settlement failures
-- When a winner fails to pay, the auction can cascade to the next bidder

-- Add cascade tracking columns to settlements
ALTER TABLE settlements ADD COLUMN cascade_position INTEGER DEFAULT 1 NOT NULL;
ALTER TABLE settlements ADD COLUMN original_winner_id UUID REFERENCES users(id);
ALTER TABLE settlements ADD COLUMN cascade_reason TEXT;

-- Remove the unique constraint on auction_id to allow multiple settlement attempts
-- (Each cascade creates a new settlement record for audit trail)
ALTER TABLE settlements DROP CONSTRAINT IF EXISTS settlements_auction_id_key;

-- Add index for finding settlements by auction
CREATE INDEX IF NOT EXISTS idx_settlements_auction ON settlements(auction_id, created_at DESC);

-- Add index for finding expired pending settlements
CREATE INDEX IF NOT EXISTS idx_settlements_pending_deadline ON settlements(status, payment_deadline)
WHERE status = 'pending';

-- Function to process settlement cascade
-- Called by cron job or manually to check for expired settlements
CREATE OR REPLACE FUNCTION process_settlement_cascade()
RETURNS TABLE(
    processed_count INTEGER,
    cascaded_count INTEGER,
    failed_count INTEGER
) AS $$
DECLARE
    v_settlement RECORD;
    v_processed INTEGER := 0;
    v_cascaded INTEGER := 0;
    v_failed INTEGER := 0;
    v_next_bidder RECORD;
    v_auction RECORD;
    v_original_winner_id UUID;
BEGIN
    -- Find all expired pending settlements
    FOR v_settlement IN
        SELECT s.*, a.id as auction_id, a.winning_bid
        FROM settlements s
        JOIN auctions a ON s.auction_id = a.id
        WHERE s.status = 'pending'
        AND s.payment_deadline < NOW()
        ORDER BY s.payment_deadline ASC
    LOOP
        v_processed := v_processed + 1;

        -- Mark current settlement as failed
        UPDATE settlements
        SET status = 'failed',
            cascade_reason = 'Payment deadline expired'
        WHERE id = v_settlement.id;

        -- Issue strike to defaulting winner
        UPDATE users
        SET strikes = strikes + 1,
            is_restricted = CASE WHEN strikes + 1 >= 3 THEN TRUE ELSE is_restricted END
        WHERE id = v_settlement.winner_id;

        -- Track original winner for cascade chain
        v_original_winner_id := COALESCE(v_settlement.original_winner_id, v_settlement.winner_id);

        -- Find next eligible bidder (in top 3, not the defaulter, unique wallet)
        SELECT DISTINCT ON (u.wallet_address) b.*, u.id as user_id, u.wallet_address, u.is_restricted
        INTO v_next_bidder
        FROM bids b
        JOIN users u ON b.bidder_id = u.id
        WHERE b.auction_id = v_settlement.auction_id
        AND b.bidder_id != v_settlement.winner_id
        AND b.bidder_id != v_original_winner_id
        AND u.is_restricted = FALSE
        AND NOT EXISTS (
            -- Skip users who already had a settlement for this auction
            SELECT 1 FROM settlements s2
            WHERE s2.auction_id = v_settlement.auction_id
            AND s2.winner_id = b.bidder_id
        )
        ORDER BY u.wallet_address, b.amount DESC;

        IF v_next_bidder IS NOT NULL AND v_settlement.cascade_position < 3 THEN
            -- Create new settlement for next bidder
            INSERT INTO settlements (
                auction_id,
                winner_id,
                payment_deadline,
                status,
                cascade_position,
                original_winner_id
            ) VALUES (
                v_settlement.auction_id,
                v_next_bidder.user_id,
                NOW() + INTERVAL '30 minutes',
                'pending',
                v_settlement.cascade_position + 1,
                v_original_winner_id
            );

            -- Update auction with new winner
            UPDATE auctions
            SET winner_id = v_next_bidder.user_id,
                winning_bid = v_next_bidder.amount
            WHERE id = v_settlement.auction_id;

            v_cascaded := v_cascaded + 1;
        ELSE
            -- No more eligible bidders or max cascade reached - mark auction as failed
            UPDATE auctions
            SET status = 'failed'
            WHERE id = v_settlement.auction_id;

            v_failed := v_failed + 1;
        END IF;
    END LOOP;

    RETURN QUERY SELECT v_processed, v_cascaded, v_failed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the settlement RLS policy to allow viewing cascade info
DROP POLICY IF EXISTS "Settlements viewable by participants" ON settlements;

CREATE POLICY "Settlements viewable by participants"
    ON settlements FOR SELECT
    USING (
        -- Winner can view their settlement
        winner_id IN (
            SELECT id FROM users
            WHERE wallet_address = current_setting('app.current_user_wallet', true)
        )
        OR
        -- Original winner can view cascade chain
        original_winner_id IN (
            SELECT id FROM users
            WHERE wallet_address = current_setting('app.current_user_wallet', true)
        )
        OR
        -- Auction creator can view all settlements
        auction_id IN (
            SELECT id FROM auctions
            WHERE creator_id IN (
                SELECT id FROM users
                WHERE wallet_address = current_setting('app.current_user_wallet', true)
            )
        )
    );
