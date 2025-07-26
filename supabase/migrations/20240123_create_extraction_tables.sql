-- Create extraction_jobs table
CREATE TABLE IF NOT EXISTS extraction_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  result JSONB,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  UNIQUE(url)
);

-- Create analysis table for historical records
CREATE TABLE IF NOT EXISTS analysis (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  url TEXT NOT NULL,
  content TEXT,
  summary TEXT,
  indicators JSONB,
  confidence NUMERIC(3,2),
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_extraction_jobs_status ON extraction_jobs(status);
CREATE INDEX idx_extraction_jobs_url ON extraction_jobs(url);
CREATE INDEX idx_extraction_jobs_created_at ON extraction_jobs(created_at);
CREATE INDEX idx_analysis_url ON analysis(url);
CREATE INDEX idx_analysis_created_at ON analysis(created_at);

-- Enable Row Level Security
ALTER TABLE extraction_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE analysis ENABLE ROW LEVEL SECURITY;

-- Create policies (adjust based on your auth requirements)
-- For now, allow authenticated users to read their own analysis
CREATE POLICY "Users can view analysis" ON analysis
  FOR SELECT USING (true);

CREATE POLICY "Service role can manage extraction_jobs" ON extraction_jobs
  FOR ALL USING (auth.role() = 'service_role');