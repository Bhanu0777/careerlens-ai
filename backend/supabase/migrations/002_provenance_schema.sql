-- CareerLens AI Database Schema - Provenance & Data Integrity Extensions
-- This migration adds data provenance, verification status, and source tracking
-- to ensure "Evidence Before Intelligence" principle

-- Enable UUID extension (if not already)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- for gen_random_uuid()

-- ============================================================
-- JOBS TABLE EXTENSIONS - Add provenance & verification fields
-- ============================================================
ALTER TABLE jobs
ADD COLUMN IF NOT EXISTS source_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS source_url TEXT,
ADD COLUMN IF NOT EXISTS first_seen_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS last_verified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS verification_status VARCHAR(50) DEFAULT 'needs_verification',
ADD COLUMN IF NOT EXISTS content_hash VARCHAR(64),
ADD COLUMN IF NOT EXISTS verification_notes TEXT;

-- Add check constraint for verification status
ALTER TABLE jobs
DROP CONSTRAINT IF EXISTS jobs_verification_status_check;
ALTER TABLE jobs
ADD CONSTRAINT jobs_verification_status_check
CHECK (verification_status IN ('verified_active', 'needs_verification', 'inactive', 'expired'));

-- Indexes for verification queries
CREATE INDEX IF NOT EXISTS idx_jobs_verification_status ON jobs(verification_status);
CREATE INDEX IF NOT EXISTS idx_jobs_last_verified ON jobs(last_verified_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_content_hash ON jobs(content_hash);
CREATE INDEX IF NOT EXISTS idx_jobs_source_name ON jobs(source_name);

-- ============================================================
-- MARKET STATISTICS TABLE - Source-attributed market data
-- ============================================================
CREATE TABLE IF NOT EXISTS market_statistics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    skill VARCHAR(255) NOT NULL,
    role VARCHAR(255),
    location VARCHAR(255),
    job_count INTEGER NOT NULL DEFAULT 0,
    total_jobs_analyzed INTEGER NOT NULL DEFAULT 0,
    demand_pct DECIMAL(5,2),
    source VARCHAR(100) NOT NULL,
    source_url TEXT,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',
    UNIQUE(skill, role, location, source, period_start, period_end)
);

CREATE INDEX IF NOT EXISTS idx_market_stats_skill ON market_statistics(skill);
CREATE INDEX IF NOT EXISTS idx_market_stats_source ON market_statistics(source);
CREATE INDEX IF NOT EXISTS idx_market_stats_period ON market_statistics(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_market_stats_calculated ON market_statistics(calculated_at DESC);

-- ============================================================
-- SKILLS TABLE EXTENSIONS - Track evidence source
-- ============================================================
ALTER TABLE skills
ADD COLUMN IF NOT EXISTS evidence_source VARCHAR(50) DEFAULT 'resume',
ADD COLUMN IF NOT EXISTS evidence_details TEXT,
ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(3,2) DEFAULT 1.0;

-- Evidence source check constraint
ALTER TABLE skills
DROP CONSTRAINT IF EXISTS skills_evidence_source_check;
ALTER TABLE skills
ADD CONSTRAINT skills_evidence_source_check
CHECK (evidence_source IN ('resume', 'user_input', 'github', 'linkedin', 'portfolio', 'inferred'));

-- ============================================================
-- JOB MATCHES TABLE EXTENSIONS - Full breakdown storage
-- ============================================================
ALTER TABLE job_matches
ADD COLUMN IF NOT EXISTS skill_match_score INTEGER,
ADD COLUMN IF NOT EXISTS experience_match_score INTEGER,
ADD COLUMN IF NOT EXISTS project_match_score INTEGER,
ADD COLUMN IF NOT EXISTS education_match_score INTEGER,
ADD COLUMN IF NOT EXISTS seniority_match_score INTEGER,
ADD COLUMN IF NOT EXISTS location_match_score INTEGER,
ADD COLUMN IF NOT EXISTS domain_match_score INTEGER,
ADD COLUMN IF NOT EXISTS calculation_method VARCHAR(50) DEFAULT 'deterministic',
ADD COLUMN IF NOT EXISTS evidence JSONB DEFAULT '{}';

-- ============================================================
-- DATA COLLECTION LOG - Track ingestion runs
-- ============================================================
CREATE TABLE IF NOT EXISTS data_collection_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    source VARCHAR(100) NOT NULL,
    source_url TEXT,
    query_params JSONB DEFAULT '{}',
    jobs_found INTEGER DEFAULT 0,
    jobs_new INTEGER DEFAULT 0,
    jobs_updated INTEGER DEFAULT 0,
    jobs_failed INTEGER DEFAULT 0,
    status VARCHAR(50) DEFAULT 'completed',
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_collection_log_source ON data_collection_log(source);
CREATE INDEX IF NOT EXISTS idx_collection_log_started ON data_collection_log(started_at DESC);

-- ============================================================
-- USER DATA SOURCES - Track connected external sources
-- ============================================================
CREATE TABLE IF NOT EXISTS user_data_sources (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    source_type VARCHAR(50) NOT NULL,
    source_identifier VARCHAR(255),
    access_token_encrypted TEXT,
    refresh_token_encrypted TEXT,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    last_sync_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, source_type, source_identifier)
);

CREATE INDEX IF NOT EXISTS idx_user_data_sources_user ON user_data_sources(user_id);

-- ============================================================
-- UPDATED_AT TRIGGERS FOR NEW TABLES
-- ============================================================
CREATE TRIGGER update_market_statistics_updated_at BEFORE UPDATE ON market_statistics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- VIEW: Verified Active Jobs (for "Apply First" list)
-- ============================================================
CREATE OR REPLACE VIEW verified_active_jobs AS
SELECT *
FROM jobs
WHERE verification_status = 'verified_active'
  AND status = 'active'
  AND (posted_date IS NULL OR posted_date > NOW() - INTERVAL '90 days')
ORDER BY last_verified_at DESC;

-- ============================================================
-- VIEW: Market Skills with Source Attribution
-- ============================================================
CREATE OR REPLACE VIEW market_skills_with_source AS
SELECT
    ms.skill,
    ms.job_count,
    ms.demand_score,
    ms.trend,
    ms.category,
    ms.updated_at,
    json_agg(
        json_build_object(
            'source', mstat.source,
            'source_url', mstat.source_url,
            'job_count', mstat.job_count,
            'total_analyzed', mstat.total_jobs_analyzed,
            'period', concat(mstat.period_start, ' to ', mstat.period_end),
            'calculated_at', mstat.calculated_at
        )
    ) FILTER (WHERE mstat.id IS NOT NULL) AS sources
FROM market_skills ms
LEFT JOIN market_statistics mstat ON ms.skill = mstat.skill
GROUP BY ms.skill, ms.job_count, ms.demand_score, ms.trend, ms.category, ms.updated_at;