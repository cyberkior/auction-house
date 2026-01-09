-- Migration: Add full-text search support for auctions
-- Enables searching by title, description, and tags

-- Add search vector column for full-text search
ALTER TABLE auctions ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Create function to update search vector
CREATE OR REPLACE FUNCTION auctions_search_update()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(NEW.description, '')), 'B') ||
    setweight(to_tsvector('english', array_to_string(COALESCE(NEW.tags, '{}'), ' ')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to auto-update search vector on insert/update
DROP TRIGGER IF EXISTS auctions_search_trigger ON auctions;
CREATE TRIGGER auctions_search_trigger
  BEFORE INSERT OR UPDATE OF title, description, tags ON auctions
  FOR EACH ROW EXECUTE FUNCTION auctions_search_update();

-- Create GIN index for fast full-text search
CREATE INDEX IF NOT EXISTS idx_auctions_search ON auctions USING GIN(search_vector);

-- Create index for tag filtering (using GIN for array containment)
CREATE INDEX IF NOT EXISTS idx_auctions_tags ON auctions USING GIN(tags);

-- Backfill search vectors for existing auctions
UPDATE auctions SET search_vector =
  setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
  setweight(to_tsvector('english', COALESCE(description, '')), 'B') ||
  setweight(to_tsvector('english', array_to_string(COALESCE(tags, '{}'), ' ')), 'C')
WHERE search_vector IS NULL;

-- Function to get popular tags (for filter UI)
CREATE OR REPLACE FUNCTION get_popular_tags(limit_count INTEGER DEFAULT 20)
RETURNS TABLE(tag TEXT, count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT unnest(tags) as tag, COUNT(*) as count
  FROM auctions
  WHERE status IN ('current', 'upcoming')
  AND moderation_status != 'removed'
  GROUP BY tag
  ORDER BY count DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
