-- Add language support to existing tables
ALTER TABLE analysis ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'en';
ALTER TABLE analysis ADD COLUMN IF NOT EXISTS language_confidence NUMERIC(3,2) DEFAULT 0.5;
ALTER TABLE extraction_jobs ADD COLUMN IF NOT EXISTS detected_language VARCHAR(10);

-- Create index for language filtering
CREATE INDEX IF NOT EXISTS idx_analysis_language ON analysis(language);

-- Update existing records to have default language
UPDATE analysis SET language = 'en' WHERE language IS NULL;
UPDATE analysis SET language_confidence = 0.5 WHERE language_confidence IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN analysis.language IS 'Detected language of content (en, pt-br, es)';
COMMENT ON COLUMN analysis.language_confidence IS 'Confidence score for language detection (0.0-1.0)';
COMMENT ON COLUMN extraction_jobs.detected_language IS 'Language detected during extraction';