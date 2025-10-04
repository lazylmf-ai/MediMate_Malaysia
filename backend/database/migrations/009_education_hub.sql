-- Migration: 009_education_hub.sql
-- Description: Create Education Hub database schema for educational content management
-- Author: MediMate Team
-- Date: 2025-10-02

-- ============================================================================
-- UP MIGRATION
-- ============================================================================

-- Table 1: education_content
-- Stores all educational materials (articles, videos, quizzes, infographics)
CREATE TABLE IF NOT EXISTS education_content (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type VARCHAR(20) NOT NULL CHECK (type IN ('article', 'video', 'infographic', 'quiz')),
    category VARCHAR(50) NOT NULL,

    -- Multi-language content stored as JSONB
    -- Format: {ms: "Malay text", en: "English text", zh: "Chinese text", ta: "Tamil text"}
    title JSONB NOT NULL,
    description JSONB NOT NULL,
    content JSONB NOT NULL,

    -- Metadata and tagging
    tags TEXT[],
    related_medications TEXT[], -- Medication IDs for personalized recommendations
    related_conditions TEXT[], -- ICD-10 codes for condition-based matching
    difficulty VARCHAR(20) CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    estimated_read_time INT, -- In minutes

    -- Medical review and quality assurance
    medical_reviewer VARCHAR(255),
    review_date TIMESTAMP,

    -- Publishing status
    published_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT NOW(),
    is_published BOOLEAN DEFAULT false,

    -- Denormalized analytics for performance
    view_count INT DEFAULT 0,
    completion_count INT DEFAULT 0,
    average_rating DECIMAL(3,2),

    -- Full-text search support
    search_vector tsvector
);

-- Indexes for education_content
CREATE INDEX idx_content_category ON education_content(category);
CREATE INDEX idx_content_published ON education_content(published_at) WHERE is_published = true;
CREATE INDEX idx_content_tags ON education_content USING GIN(tags);
CREATE INDEX idx_content_medications ON education_content USING GIN(related_medications);
CREATE INDEX idx_content_conditions ON education_content USING GIN(related_conditions);
CREATE INDEX idx_content_search ON education_content USING GIN(search_vector);
CREATE INDEX idx_content_type ON education_content(type);

-- Table 2: education_user_progress
-- Tracks which content users have viewed and completed
CREATE TABLE IF NOT EXISTS education_user_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content_id UUID NOT NULL REFERENCES education_content(id) ON DELETE CASCADE,

    viewed_at TIMESTAMP,
    completed_at TIMESTAMP,
    time_spent INT, -- Time spent in seconds

    -- Ensure one progress record per user per content
    UNIQUE(user_id, content_id)
);

-- Indexes for education_user_progress
CREATE INDEX idx_user_progress_user ON education_user_progress(user_id);
CREATE INDEX idx_user_progress_content ON education_user_progress(content_id);
CREATE INDEX idx_user_progress_completed ON education_user_progress(user_id, completed_at) WHERE completed_at IS NOT NULL;

-- Table 3: education_quiz_submissions
-- Records quiz attempts, answers, and scores
CREATE TABLE IF NOT EXISTS education_quiz_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    quiz_id UUID NOT NULL REFERENCES education_content(id) ON DELETE CASCADE,

    answers JSONB NOT NULL, -- User's selected answers
    score INT NOT NULL, -- Percentage score (0-100)
    passed BOOLEAN NOT NULL, -- Whether user passed (e.g., score >= 70%)
    submitted_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for education_quiz_submissions
CREATE INDEX idx_quiz_user ON education_quiz_submissions(user_id);
CREATE INDEX idx_quiz_quiz_id ON education_quiz_submissions(quiz_id);
CREATE INDEX idx_quiz_passed ON education_quiz_submissions(user_id, passed) WHERE passed = true;
CREATE INDEX idx_quiz_submitted ON education_quiz_submissions(submitted_at);

-- Table 4: education_achievements
-- User badges and gamification (e.g., "7-day streak", "Quiz master")
CREATE TABLE IF NOT EXISTS education_achievements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    badge_id VARCHAR(50) NOT NULL, -- Identifier like 'first_content', '7_day_streak', 'quiz_master'
    earned_at TIMESTAMP DEFAULT NOW(),

    -- Ensure one badge per user (can't earn same badge twice)
    UNIQUE(user_id, badge_id)
);

-- Indexes for education_achievements
CREATE INDEX idx_achievements_user ON education_achievements(user_id);
CREATE INDEX idx_achievements_badge ON education_achievements(badge_id);
CREATE INDEX idx_achievements_earned ON education_achievements(earned_at);

-- Table 5: education_recommendations
-- Cached personalized content recommendations for users
CREATE TABLE IF NOT EXISTS education_recommendations (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content_id UUID NOT NULL REFERENCES education_content(id) ON DELETE CASCADE,

    score INT NOT NULL, -- Relevance score (0-100) for ranking
    reason VARCHAR(50), -- Why recommended: 'medication', 'condition', 'adherence', 'popular'
    generated_at TIMESTAMP DEFAULT NOW(),

    PRIMARY KEY (user_id, content_id)
);

-- Indexes for education_recommendations
CREATE INDEX idx_recommendations_user ON education_recommendations(user_id, score DESC);
CREATE INDEX idx_recommendations_reason ON education_recommendations(reason);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to update search vector when content changes
CREATE OR REPLACE FUNCTION update_education_content_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    -- Combine all language versions for search
    NEW.search_vector :=
        setweight(to_tsvector('simple', COALESCE(NEW.title->>'ms', '')), 'A') ||
        setweight(to_tsvector('simple', COALESCE(NEW.title->>'en', '')), 'A') ||
        setweight(to_tsvector('simple', COALESCE(NEW.title->>'zh', '')), 'A') ||
        setweight(to_tsvector('simple', COALESCE(NEW.title->>'ta', '')), 'A') ||
        setweight(to_tsvector('simple', COALESCE(NEW.description->>'ms', '')), 'B') ||
        setweight(to_tsvector('simple', COALESCE(NEW.description->>'en', '')), 'B') ||
        setweight(to_tsvector('simple', COALESCE(NEW.description->>'zh', '')), 'B') ||
        setweight(to_tsvector('simple', COALESCE(NEW.description->>'ta', '')), 'B') ||
        setweight(to_tsvector('simple', array_to_string(NEW.tags, ' ')), 'C');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update search vector
CREATE TRIGGER trigger_update_education_content_search_vector
    BEFORE INSERT OR UPDATE ON education_content
    FOR EACH ROW
    EXECUTE FUNCTION update_education_content_search_vector();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_education_content_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update timestamp
CREATE TRIGGER trigger_update_education_content_timestamp
    BEFORE UPDATE ON education_content
    FOR EACH ROW
    EXECUTE FUNCTION update_education_content_timestamp();

-- ============================================================================
-- DOWN MIGRATION (Rollback)
-- ============================================================================

-- To rollback this migration, run the following SQL:
-- (Uncomment when rolling back)

/*
-- Drop triggers
DROP TRIGGER IF EXISTS trigger_update_education_content_search_vector ON education_content;
DROP TRIGGER IF EXISTS trigger_update_education_content_timestamp ON education_content;

-- Drop functions
DROP FUNCTION IF EXISTS update_education_content_search_vector();
DROP FUNCTION IF EXISTS update_education_content_timestamp();

-- Drop tables in reverse order (respecting foreign keys)
DROP TABLE IF EXISTS education_recommendations;
DROP TABLE IF EXISTS education_achievements;
DROP TABLE IF EXISTS education_quiz_submissions;
DROP TABLE IF EXISTS education_user_progress;
DROP TABLE IF EXISTS education_content;
*/

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
