-- Create tweet cache table to reduce Twitter API calls
CREATE TABLE IF NOT EXISTS tweet_cache (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tweet_id VARCHAR(50) NOT NULL UNIQUE,
  tweet_data JSONB NOT NULL,
  cached_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
  language VARCHAR(10),
  language_confidence NUMERIC(3,2)
);

-- Create indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_tweet_cache_tweet_id ON tweet_cache(tweet_id);
CREATE INDEX IF NOT EXISTS idx_tweet_cache_expires_at ON tweet_cache(expires_at);

-- Add comments for documentation
COMMENT ON TABLE tweet_cache IS 'Cache for Twitter API responses to reduce rate limit usage';
COMMENT ON COLUMN tweet_cache.tweet_id IS 'Twitter tweet ID (extracted from URL)';
COMMENT ON COLUMN tweet_cache.tweet_data IS 'Full Twitter API response data';
COMMENT ON COLUMN tweet_cache.expires_at IS 'When this cache entry expires (24 hours by default)';

-- Clean up expired cache entries (run this periodically)
-- DELETE FROM tweet_cache WHERE expires_at < NOW();