-- ============================================================================
-- MediMate Malaysia - Education Administration Schema
-- Migration 010: Content Management, Translation, and Versioning
-- Date: 2025-10-03
-- Purpose: Support content admin tools, translation tracking, and audit trail
-- ============================================================================

-- ============================================================================
-- EDUCATION CONTENT BASE TABLE EXTENSIONS
-- ============================================================================

-- Extend education content table with admin workflow fields
-- Note: This assumes education_content table exists from Task 30
ALTER TABLE education_content
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'draft' NOT NULL 
    CHECK (status IN ('draft', 'in_review', 'approved', 'published', 'archived')),
ADD COLUMN IF NOT EXISTS author_id UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS reviewer_id UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS review_notes TEXT,
ADD COLUMN IF NOT EXISTS published_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1 NOT NULL,
ADD COLUMN IF NOT EXISTS view_count INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN IF NOT EXISTS completion_count INTEGER DEFAULT 0 NOT NULL;

-- ============================================================================
-- TRANSLATION STATUS TRACKING
-- ============================================================================

-- Track translation status per language for each content piece
CREATE TABLE education_translation_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id UUID NOT NULL REFERENCES education_content(id) ON DELETE CASCADE,
    language VARCHAR(5) NOT NULL CHECK (language IN ('ms', 'en', 'zh', 'ta')),
    status VARCHAR(20) NOT NULL DEFAULT 'missing' 
        CHECK (status IN ('missing', 'draft', 'review', 'approved')),
    
    -- Translation metadata
    translator_id UUID REFERENCES users(id),
    reviewer_id UUID REFERENCES users(id),
    translation_notes TEXT,
    word_count INTEGER DEFAULT 0,
    
    -- Tracking timestamps
    started_at TIMESTAMP,
    draft_completed_at TIMESTAMP,
    submitted_for_review_at TIMESTAMP,
    approved_at TIMESTAMP,
    last_updated TIMESTAMP DEFAULT NOW() NOT NULL,
    
    -- Quality metrics
    quality_score DECIMAL(3,2) CHECK (quality_score >= 0 AND quality_score <= 5),
    review_comments TEXT,
    
    -- Audit trail
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    
    -- Ensure one status record per content-language combination
    UNIQUE(content_id, language)
);

-- ============================================================================
-- CONTENT VERSION HISTORY
-- ============================================================================

-- Complete version history for all content changes
CREATE TABLE education_content_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id UUID NOT NULL REFERENCES education_content(id) ON DELETE CASCADE,
    version INTEGER NOT NULL,
    
    -- Content snapshot (full copy at this version)
    title JSONB NOT NULL,
    description JSONB NOT NULL,
    body JSONB NOT NULL,
    metadata JSONB DEFAULT '{}',
    
    -- Version control metadata
    changed_by UUID NOT NULL REFERENCES users(id),
    changed_at TIMESTAMP DEFAULT NOW() NOT NULL,
    change_note TEXT,
    change_type VARCHAR(50) CHECK (change_type IN (
        'created', 'updated', 'translated', 'reviewed', 
        'published', 'unpublished', 'archived', 'restored'
    )),
    
    -- Previous version reference for changelog
    previous_version INTEGER,
    
    -- Content state at this version
    status_at_version VARCHAR(20),
    
    -- Ensure version numbers are unique per content
    UNIQUE(content_id, version)
);

-- ============================================================================
-- REVIEW WORKFLOW
-- ============================================================================

-- Review comments and feedback
CREATE TABLE education_review_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id UUID NOT NULL REFERENCES education_content(id) ON DELETE CASCADE,
    version INTEGER,
    reviewer_id UUID NOT NULL REFERENCES users(id),
    
    -- Comment details
    comment TEXT NOT NULL,
    section VARCHAR(100), -- Which part of content (e.g., "introduction", "body")
    severity VARCHAR(20) CHECK (severity IN ('info', 'suggestion', 'required', 'critical')),
    status VARCHAR(20) NOT NULL DEFAULT 'pending' 
        CHECK (status IN ('pending', 'addressed', 'resolved', 'wont_fix')),
    
    -- Thread support
    parent_comment_id UUID REFERENCES education_review_comments(id),
    
    -- Tracking
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    resolved_at TIMESTAMP,
    resolved_by UUID REFERENCES users(id)
);

-- ============================================================================
-- CONTENT ANALYTICS
-- ============================================================================

-- Track individual content views
CREATE TABLE education_analytics_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id UUID NOT NULL REFERENCES education_content(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    language VARCHAR(5) NOT NULL CHECK (language IN ('ms', 'en', 'zh', 'ta')),
    
    -- Session info
    session_id UUID,
    device_type VARCHAR(20),
    platform VARCHAR(50),
    
    -- Tracking
    viewed_at TIMESTAMP DEFAULT NOW() NOT NULL,
    
    -- Privacy: no personally identifiable tracking
    -- Aggregated analytics only
    INDEX idx_analytics_views_content (content_id),
    INDEX idx_analytics_views_date (viewed_at),
    INDEX idx_analytics_views_language (language)
);

-- Track content completion events
CREATE TABLE education_analytics_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id UUID NOT NULL REFERENCES education_content(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    
    -- Completion metrics
    time_spent_seconds INTEGER NOT NULL,
    completion_percentage DECIMAL(5,2) DEFAULT 100.00 
        CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
    
    -- Tracking
    completed_at TIMESTAMP DEFAULT NOW() NOT NULL,
    
    INDEX idx_analytics_completions_content (content_id),
    INDEX idx_analytics_completions_date (completed_at)
);

-- User ratings and feedback
CREATE TABLE education_content_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id UUID NOT NULL REFERENCES education_content(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id),
    
    -- Rating
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    feedback TEXT,
    
    -- Tracking
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
    
    -- One rating per user per content
    UNIQUE(content_id, user_id)
);

-- ============================================================================
-- AUDIT TRAIL
-- ============================================================================

-- Comprehensive audit log for all admin actions
CREATE TABLE education_admin_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Action details
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL, -- 'content', 'translation', 'review', etc.
    entity_id UUID NOT NULL,
    
    -- Actor
    user_id UUID NOT NULL REFERENCES users(id),
    user_role VARCHAR(50),
    
    -- Changes
    old_values JSONB,
    new_values JSONB,
    change_summary TEXT,
    
    -- Context
    ip_address INET,
    user_agent TEXT,
    
    -- Tracking
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    
    -- Indexes for audit queries
    INDEX idx_audit_entity (entity_type, entity_id),
    INDEX idx_audit_user (user_id),
    INDEX idx_audit_date (created_at),
    INDEX idx_audit_action (action)
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Content workflow indexes
CREATE INDEX IF NOT EXISTS idx_education_content_status ON education_content(status);
CREATE INDEX IF NOT EXISTS idx_education_content_author ON education_content(author_id);
CREATE INDEX IF NOT EXISTS idx_education_content_reviewer ON education_content(reviewer_id);
CREATE INDEX IF NOT EXISTS idx_education_content_published ON education_content(published_at) 
    WHERE status = 'published';

-- Translation tracking indexes
CREATE INDEX idx_translation_status_content ON education_translation_status(content_id);
CREATE INDEX idx_translation_status_language ON education_translation_status(language);
CREATE INDEX idx_translation_status_translator ON education_translation_status(translator_id);
CREATE INDEX idx_translation_status_updated ON education_translation_status(last_updated);

-- Version history indexes
CREATE INDEX idx_content_versions_content ON education_content_versions(content_id, version DESC);
CREATE INDEX idx_content_versions_changed_by ON education_content_versions(changed_by);
CREATE INDEX idx_content_versions_changed_at ON education_content_versions(changed_at DESC);

-- Review comments indexes
CREATE INDEX idx_review_comments_content ON education_review_comments(content_id);
CREATE INDEX idx_review_comments_reviewer ON education_review_comments(reviewer_id);
CREATE INDEX idx_review_comments_status ON education_review_comments(status);
CREATE INDEX idx_review_comments_parent ON education_review_comments(parent_comment_id) 
    WHERE parent_comment_id IS NOT NULL;

-- ============================================================================
-- TRIGGERS FOR AUTOMATION
-- ============================================================================

-- Auto-update timestamp trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to relevant tables
CREATE TRIGGER update_translation_status_updated_at
    BEFORE UPDATE ON education_translation_status
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_review_comments_updated_at
    BEFORE UPDATE ON education_review_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_content_ratings_updated_at
    BEFORE UPDATE ON education_content_ratings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Version increment trigger
CREATE OR REPLACE FUNCTION increment_content_version()
RETURNS TRIGGER AS $$
BEGIN
    -- Only increment version on actual content changes
    IF (OLD.title IS DISTINCT FROM NEW.title OR 
        OLD.description IS DISTINCT FROM NEW.description OR 
        OLD.body IS DISTINCT FROM NEW.body) THEN
        NEW.version = OLD.version + 1;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER content_version_increment
    BEFORE UPDATE ON education_content
    FOR EACH ROW
    WHEN (OLD.* IS DISTINCT FROM NEW.*)
    EXECUTE FUNCTION increment_content_version();

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- Translation progress overview
CREATE OR REPLACE VIEW education_translation_progress AS
SELECT 
    ec.id AS content_id,
    ec.title->>'en' AS title,
    ec.status,
    COUNT(ets.id) AS total_languages,
    SUM(CASE WHEN ets.status = 'approved' THEN 1 ELSE 0 END) AS approved_count,
    SUM(CASE WHEN ets.status = 'review' THEN 1 ELSE 0 END) AS review_count,
    SUM(CASE WHEN ets.status = 'draft' THEN 1 ELSE 0 END) AS draft_count,
    SUM(CASE WHEN ets.status = 'missing' THEN 1 ELSE 0 END) AS missing_count,
    ROUND(
        (SUM(CASE WHEN ets.status = 'approved' THEN 1 ELSE 0 END)::DECIMAL / 
         COUNT(ets.id)) * 100, 
        2
    ) AS completion_percentage
FROM education_content ec
LEFT JOIN education_translation_status ets ON ec.id = ets.content_id
GROUP BY ec.id, ec.title, ec.status;

-- Content with latest version info
CREATE OR REPLACE VIEW education_content_with_versions AS
SELECT 
    ec.*,
    ecv.version AS latest_version,
    ecv.changed_by AS last_changed_by,
    ecv.changed_at AS last_changed_at,
    ecv.change_note AS last_change_note
FROM education_content ec
LEFT JOIN LATERAL (
    SELECT * FROM education_content_versions
    WHERE content_id = ec.id
    ORDER BY version DESC
    LIMIT 1
) ecv ON true;

-- Review workload dashboard
CREATE OR REPLACE VIEW education_review_workload AS
SELECT 
    reviewer_id,
    COUNT(*) AS total_assigned,
    SUM(CASE WHEN status = 'in_review' THEN 1 ELSE 0 END) AS pending_reviews,
    SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS approved_count
FROM education_content
WHERE reviewer_id IS NOT NULL
GROUP BY reviewer_id;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE education_translation_status IS 
    'Tracks translation status for each language per content piece';
COMMENT ON TABLE education_content_versions IS 
    'Complete version history with full content snapshots for audit trail';
COMMENT ON TABLE education_review_comments IS 
    'Review feedback and comments from medical reviewers';
COMMENT ON TABLE education_analytics_views IS 
    'Individual content view events for analytics';
COMMENT ON TABLE education_analytics_completions IS 
    'Content completion tracking for engagement metrics';
COMMENT ON TABLE education_content_ratings IS 
    'User ratings and feedback on educational content';
COMMENT ON TABLE education_admin_audit_log IS 
    'Comprehensive audit trail for all admin actions';

-- ============================================================================
-- INITIAL DATA SETUP
-- ============================================================================

-- Insert default translation status for existing content (if any)
-- This will be run by the application during migration
-- Note: Assumes education_content exists from Task 30

-- ============================================================================
-- GRANTS (Security)
-- ============================================================================

-- Grant appropriate permissions
-- These would be customized based on actual role definitions

-- GRANT SELECT, INSERT, UPDATE ON education_translation_status TO content_creator;
-- GRANT SELECT, INSERT, UPDATE, DELETE ON education_translation_status TO admin;
-- GRANT SELECT ON education_translation_status TO medical_reviewer;

-- Similar grants for other tables...

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
