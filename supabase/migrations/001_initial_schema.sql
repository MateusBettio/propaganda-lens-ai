-- Initial database schema for Propaganda Lens
-- No authentication required for now

-- Analysis results table
CREATE TABLE IF NOT EXISTS analyses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  
  -- Input data
  original_url text,
  content_type text NOT NULL,
  
  -- Extracted content info  
  extracted_content jsonb,
  source_info jsonb,
  
  -- Analysis results
  quick_assessment text NOT NULL,
  manipulation_score integer CHECK (manipulation_score >= 0 AND manipulation_score <= 10),
  techniques jsonb NOT NULL DEFAULT '[]'::jsonb,
  counter_perspective text,
  reflection_questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  
  -- Metadata
  processing_time_ms integer,
  model_used text,
  
  -- Indexes
  CONSTRAINT valid_manipulation_score CHECK (manipulation_score BETWEEN 0 AND 10)
);

-- Index for performance
CREATE INDEX IF NOT EXISTS analyses_created_at_idx ON analyses(created_at DESC);
CREATE INDEX IF NOT EXISTS analyses_content_type_idx ON analyses(content_type);
CREATE INDEX IF NOT EXISTS analyses_manipulation_score_idx ON analyses(manipulation_score);

-- Content extraction cache table (to avoid re-extracting same URLs)
CREATE TABLE IF NOT EXISTS content_cache (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  url text UNIQUE NOT NULL,
  content_hash text NOT NULL,
  extracted_content jsonb NOT NULL,
  extracted_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  extraction_method text NOT NULL, -- 'jina', 'youtube', 'custom'
  
  -- Cache expiry (24 hours for news, longer for static content)
  expires_at timestamp with time zone DEFAULT (timezone('utc'::text, now()) + interval '24 hours') NOT NULL
);

-- Index for cache lookups
CREATE INDEX IF NOT EXISTS content_cache_url_idx ON content_cache(url);
CREATE INDEX IF NOT EXISTS content_cache_expires_idx ON content_cache(expires_at);

-- Function to clean expired cache entries
CREATE OR REPLACE FUNCTION clean_expired_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM content_cache WHERE expires_at < timezone('utc'::text, now());
END;
$$ LANGUAGE plpgsql;

-- Comments for documentation
COMMENT ON TABLE analyses IS 'Stores all propaganda analysis results';
COMMENT ON TABLE content_cache IS 'Caches extracted content to improve performance';
COMMENT ON COLUMN analyses.techniques IS 'Array of detected propaganda techniques with confidence scores';
COMMENT ON COLUMN analyses.extracted_content IS 'Full extracted content from URLs (transcripts, articles, etc)';
COMMENT ON COLUMN analyses.source_info IS 'Metadata about content source (thumbnails, titles, etc)';