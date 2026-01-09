-- Migration: Add notifications system
-- Real-time notifications for auction events

-- Create notification type enum
CREATE TYPE notification_type AS ENUM (
  'outbid',
  'auction_won',
  'auction_lost',
  'settlement_reminder',
  'payment_confirmed',
  'new_bid_received',
  'auction_ending_soon'
);

-- Create notifications table
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  auction_id UUID REFERENCES auctions(id) ON DELETE CASCADE,
  metadata JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT FALSE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Indexes for efficient queries
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(user_id, created_at DESC) WHERE is_read = FALSE;

-- Enable Row Level Security
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Users can only view their own notifications
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (
    user_id IN (
      SELECT id FROM users
      WHERE wallet_address = current_setting('app.current_user_wallet', true)
    )
  );

-- Users can update (mark as read) their own notifications
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (
    user_id IN (
      SELECT id FROM users
      WHERE wallet_address = current_setting('app.current_user_wallet', true)
    )
  );

-- Function to create a notification
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_type notification_type,
  p_title TEXT,
  p_message TEXT,
  p_auction_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS notifications AS $$
DECLARE
  v_notification notifications;
BEGIN
  INSERT INTO notifications (user_id, type, title, message, auction_id, metadata)
  VALUES (p_user_id, p_type, p_title, p_message, p_auction_id, p_metadata)
  RETURNING * INTO v_notification;

  RETURN v_notification;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function: Notify on new bid (outbid previous high bidder)
CREATE OR REPLACE FUNCTION notify_on_new_bid()
RETURNS TRIGGER AS $$
DECLARE
  v_auction auctions;
  v_previous_high_bid bids;
  v_bidder users;
BEGIN
  -- Get auction details
  SELECT * INTO v_auction FROM auctions WHERE id = NEW.auction_id;

  -- Get the bidder's info
  SELECT * INTO v_bidder FROM users WHERE id = NEW.bidder_id;

  -- Find previous highest bidder (not the new bidder)
  SELECT b.* INTO v_previous_high_bid
  FROM bids b
  WHERE b.auction_id = NEW.auction_id
    AND b.id != NEW.id
    AND b.bidder_id != NEW.bidder_id
  ORDER BY b.amount DESC
  LIMIT 1;

  -- Notify the outbid user
  IF v_previous_high_bid IS NOT NULL THEN
    PERFORM create_notification(
      v_previous_high_bid.bidder_id,
      'outbid',
      'You''ve been outbid!',
      format('Someone placed a higher bid on "%s"', v_auction.title),
      NEW.auction_id,
      jsonb_build_object('bid_amount', NEW.amount)
    );
  END IF;

  -- Notify auction creator of new bid
  IF v_auction.creator_id != NEW.bidder_id THEN
    PERFORM create_notification(
      v_auction.creator_id,
      'new_bid_received',
      'New bid on your auction',
      format('%s placed a bid on "%s"',
        COALESCE(v_bidder.username, LEFT(v_bidder.wallet_address, 8) || '...'),
        v_auction.title),
      NEW.auction_id,
      jsonb_build_object('bid_amount', NEW.amount, 'bidder_id', NEW.bidder_id)
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for bid notifications
DROP TRIGGER IF EXISTS bid_notification_trigger ON bids;
CREATE TRIGGER bid_notification_trigger
  AFTER INSERT ON bids
  FOR EACH ROW EXECUTE FUNCTION notify_on_new_bid();

-- Function to notify auction end (called by cron or status update)
CREATE OR REPLACE FUNCTION notify_auction_ended(p_auction_id UUID)
RETURNS void AS $$
DECLARE
  v_auction auctions;
  v_winner users;
  v_bid RECORD;
BEGIN
  -- Get auction with winner
  SELECT * INTO v_auction FROM auctions WHERE id = p_auction_id;

  IF v_auction IS NULL OR v_auction.status NOT IN ('settling', 'completed') THEN
    RETURN;
  END IF;

  -- Get winner info
  IF v_auction.winner_id IS NOT NULL THEN
    SELECT * INTO v_winner FROM users WHERE id = v_auction.winner_id;

    -- Notify winner
    PERFORM create_notification(
      v_auction.winner_id,
      'auction_won',
      'Congratulations! You won!',
      format('You won "%s" with a bid of %s SOL',
        v_auction.title,
        (v_auction.winning_bid / 1000000000.0)::numeric(20,4)),
      p_auction_id
    );
  END IF;

  -- Notify losing bidders (those who are not the winner)
  FOR v_bid IN
    SELECT DISTINCT ON (b.bidder_id) b.bidder_id
    FROM bids b
    WHERE b.auction_id = p_auction_id
      AND b.bidder_id != COALESCE(v_auction.winner_id, '00000000-0000-0000-0000-000000000000')
  LOOP
    PERFORM create_notification(
      v_bid.bidder_id,
      'auction_lost',
      'Auction ended',
      format('The auction for "%s" has ended. Better luck next time!', v_auction.title),
      p_auction_id
    );
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable Supabase Realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
