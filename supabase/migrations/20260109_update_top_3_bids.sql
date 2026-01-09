-- Function to recalculate top 3 bids after bid deletion
CREATE OR REPLACE FUNCTION update_top_3_bids(p_auction_id UUID)
RETURNS void AS $$
BEGIN
  -- Reset all bids for auction
  UPDATE bids
  SET is_top_3 = false
  WHERE auction_id = p_auction_id;

  -- Mark top 3
  UPDATE bids
  SET is_top_3 = true
  WHERE id IN (
    SELECT id
    FROM bids
    WHERE auction_id = p_auction_id
    ORDER BY amount DESC
    LIMIT 3
  );
END;
$$ LANGUAGE plpgsql;
