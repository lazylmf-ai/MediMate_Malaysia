-- MediMate Malaysia - Database Schema
-- Healthcare medication management system optimized for Malaysian users

-- ============================================================================
-- CORE USER MANAGEMENT
-- ============================================================================

-- Family groups for caregiver functionality
CREATE TABLE families (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    family_name VARCHAR(100) NOT NULL,
    family_code VARCHAR(8) UNIQUE NOT NULL DEFAULT UPPER(substring(gen_random_uuid()::text from 1 for 8)),
    settings JSONB NOT NULL DEFAULT '{}',
    privacy_settings JSONB NOT NULL DEFAULT '{
        "share_adherence": true,
        "notify_missed_doses": true,
        "share_location": false,
        "emergency_contacts_access": true
    }',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Users table with Malaysian cultural considerations
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ic_number_hash VARCHAR(64) UNIQUE, -- Hashed Malaysian IC for privacy
    email VARCHAR(255) UNIQUE,
    phone_number VARCHAR(15),
    full_name VARCHAR(200) NOT NULL,
    preferred_name VARCHAR(100),
    date_of_birth DATE,
    gender VARCHAR(1) CHECK (gender IN ('M', 'F', 'O')),
    preferred_language VARCHAR(5) NOT NULL DEFAULT 'ms',
    secondary_languages TEXT[] DEFAULT '{}',
    
    -- Malaysian cultural profile
    cultural_profile JSONB NOT NULL DEFAULT '{
        "religion": null,
        "prayer_times_enabled": false,
        "fasting_periods": [],
        "dietary_restrictions": [],
        "cultural_holidays": [],
        "meal_times": {
            "breakfast": "07:00",
            "lunch": "13:00",
            "dinner": "19:30"
        }
    }',
    
    -- Family and role management
    family_id UUID REFERENCES families(id) ON DELETE SET NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'patient' CHECK (role IN ('patient', 'caregiver', 'both')),
    
    -- Account status and security
    email_verified BOOLEAN DEFAULT FALSE,
    phone_verified BOOLEAN DEFAULT FALSE,
    account_status VARCHAR(20) DEFAULT 'active' CHECK (account_status IN ('active', 'suspended', 'inactive')),
    last_login TIMESTAMP WITH TIME ZONE,
    
    -- Privacy and consent
    privacy_consent JSONB NOT NULL DEFAULT '{
        "data_collection": false,
        "family_sharing": false,
        "healthcare_provider_sharing": false,
        "analytics_participation": false,
        "marketing_communication": false
    }',
    consent_date TIMESTAMP WITH TIME ZONE,
    
    -- Location for prayer times and cultural events
    location JSONB DEFAULT '{
        "city": null,
        "state": null,
        "timezone": "Asia/Kuala_Lumpur"
    }',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- HEALTHCARE PROVIDER INTEGRATION
-- ============================================================================

-- Healthcare providers (hospitals, clinics, pharmacies)
CREATE TABLE healthcare_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_name VARCHAR(200) NOT NULL,
    provider_type VARCHAR(50) NOT NULL CHECK (provider_type IN ('hospital', 'clinic', 'pharmacy', 'specialist')),
    
    -- Malaysian healthcare registration
    registration_number VARCHAR(50) UNIQUE,
    registration_type VARCHAR(30) CHECK (registration_type IN ('MOH', 'private', 'pharmacy_board')),
    
    -- Contact and location information
    contact_info JSONB NOT NULL DEFAULT '{}',
    address JSONB,
    operating_hours JSONB,
    
    -- System integration
    api_endpoint VARCHAR(500),
    api_credentials_encrypted TEXT,
    integration_status VARCHAR(20) DEFAULT 'inactive' CHECK (integration_status IN ('active', 'inactive', 'testing')),
    
    -- Subscription and features
    subscription_tier VARCHAR(20) DEFAULT 'basic' CHECK (subscription_tier IN ('basic', 'professional', 'enterprise')),
    features_enabled JSONB DEFAULT '{}',
    
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Healthcare provider-user relationships
CREATE TABLE provider_user_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES healthcare_providers(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    relationship_type VARCHAR(30) NOT NULL CHECK (relationship_type IN ('primary_care', 'specialist', 'pharmacy', 'emergency')),
    
    -- Consent and permissions
    data_sharing_consent BOOLEAN DEFAULT FALSE,
    consent_date TIMESTAMP WITH TIME ZONE,
    access_level VARCHAR(20) DEFAULT 'basic' CHECK (access_level IN ('basic', 'full', 'emergency_only')),
    
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(provider_id, user_id, relationship_type)
);

-- ============================================================================
-- MEDICATION MANAGEMENT
-- ============================================================================

-- Malaysian medication database
CREATE TABLE medication_database (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    medication_name VARCHAR(200) NOT NULL,
    generic_name VARCHAR(200),
    brand_names TEXT[],
    
    -- Malaysian drug registration
    drug_registration_number VARCHAR(50) UNIQUE,
    manufacturer VARCHAR(200),
    import_permit_number VARCHAR(50),
    
    -- Medication details
    dosage_forms TEXT[] NOT NULL, -- tablet, capsule, liquid, injection
    strengths TEXT[] NOT NULL,
    therapeutic_class VARCHAR(100),
    
    -- Cultural considerations
    halal_certified BOOLEAN DEFAULT FALSE,
    contains_gelatin BOOLEAN DEFAULT FALSE,
    contains_alcohol BOOLEAN DEFAULT FALSE,
    vegetarian_suitable BOOLEAN DEFAULT TRUE,
    
    -- Safety information
    contraindications TEXT[],
    side_effects TEXT[],
    interactions TEXT[],
    pregnancy_category VARCHAR(5),
    
    -- Prescription requirements
    prescription_required BOOLEAN DEFAULT TRUE,
    controlled_substance BOOLEAN DEFAULT FALSE,
    
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User medications (prescribed and tracked)
CREATE TABLE medications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    medication_db_id UUID REFERENCES medication_database(id),
    
    -- Medication identification
    medication_name VARCHAR(200) NOT NULL,
    generic_name VARCHAR(200),
    dosage VARCHAR(100) NOT NULL,
    form VARCHAR(50), -- tablet, capsule, ml, etc.
    
    -- Prescription details
    prescribed_by VARCHAR(200),
    prescriber_registration VARCHAR(50),
    provider_id UUID REFERENCES healthcare_providers(id),
    prescription_date DATE,
    prescription_number VARCHAR(100),
    
    -- Schedule and timing
    frequency VARCHAR(50) NOT NULL, -- daily, twice_daily, weekly, as_needed
    schedule_times TIME[] NOT NULL, -- Array of times to take medication
    duration_days INTEGER,
    start_date DATE NOT NULL,
    end_date DATE,
    
    -- Malaysian cultural adjustments
    cultural_adjustments JSONB DEFAULT '{
        "avoid_prayer_times": false,
        "ramadan_adjustments": false,
        "meal_timing_preference": "before", 
        "cultural_notes": null
    }',
    
    -- Instructions and notes
    instructions TEXT,
    special_instructions TEXT,
    food_instructions VARCHAR(100), -- with_food, without_food, empty_stomach
    
    -- Tracking and status
    total_quantity INTEGER,
    remaining_quantity INTEGER,
    refill_reminder_days INTEGER DEFAULT 7,
    active BOOLEAN DEFAULT TRUE,
    
    -- Emergency information
    critical_medication BOOLEAN DEFAULT FALSE,
    emergency_contact_on_missed BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- ADHERENCE TRACKING
-- ============================================================================

-- Medication adherence logs
CREATE TABLE adherence_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    medication_id UUID NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Timing information
    scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
    actual_time TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) NOT NULL CHECK (status IN ('taken', 'missed', 'late', 'early', 'skipped')),
    
    -- Delay tracking (minutes)
    delay_minutes INTEGER,
    
    -- Context and location
    notes TEXT,
    location_taken VARCHAR(100),
    taken_with VARCHAR(50), -- food, water, empty_stomach
    
    -- Family and verification
    family_verified BOOLEAN DEFAULT FALSE,
    verified_by UUID REFERENCES users(id),
    verification_method VARCHAR(20), -- photo, family_confirmation, self_report
    
    -- Photo evidence
    photo_url TEXT,
    photo_metadata JSONB,
    
    -- Side effects or reactions
    side_effects TEXT,
    effectiveness_rating INTEGER CHECK (effectiveness_rating BETWEEN 1 AND 5),
    
    -- Healthcare provider notification
    provider_notified BOOLEAN DEFAULT FALSE,
    provider_notification_sent_at TIMESTAMP WITH TIME ZONE,
    
    -- Cultural context
    cultural_factors JSONB DEFAULT '{}', -- prayer_time_conflict, fasting_period, etc.
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adherence summary for performance
CREATE TABLE adherence_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    medication_id UUID NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
    
    -- Time period
    summary_date DATE NOT NULL,
    period_type VARCHAR(10) NOT NULL CHECK (period_type IN ('daily', 'weekly', 'monthly')),
    
    -- Statistics
    scheduled_doses INTEGER NOT NULL DEFAULT 0,
    taken_doses INTEGER NOT NULL DEFAULT 0,
    missed_doses INTEGER NOT NULL DEFAULT 0,
    late_doses INTEGER NOT NULL DEFAULT 0,
    adherence_rate DECIMAL(5,2) NOT NULL DEFAULT 0.0,
    
    -- Timing analysis
    avg_delay_minutes INTEGER DEFAULT 0,
    consistency_score DECIMAL(5,2) DEFAULT 0.0, -- How consistent timing is
    
    -- Cultural impact
    cultural_adjustments_made INTEGER DEFAULT 0,
    prayer_time_conflicts INTEGER DEFAULT 0,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, medication_id, summary_date, period_type)
);

-- ============================================================================
-- CULTURAL AND CALENDAR INTEGRATION
-- ============================================================================

-- Malaysian cultural events and holidays
CREATE TABLE cultural_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_name VARCHAR(100) NOT NULL,
    event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('islamic', 'chinese', 'indian', 'christian', 'national', 'local')),
    event_date DATE NOT NULL,
    event_time TIME,
    
    -- Impact on medications
    affects_medication BOOLEAN DEFAULT FALSE,
    adjustment_rules JSONB DEFAULT '{}',
    
    -- Location relevance
    applicable_states TEXT[], -- Malaysian states where this applies
    applicable_cities TEXT[],
    
    -- Description and instructions
    description TEXT,
    medication_guidelines TEXT,
    
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(event_name, event_date, event_type)
);

-- Prayer times cache for Malaysian cities
CREATE TABLE prayer_times (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    city VARCHAR(50) NOT NULL,
    state VARCHAR(50) NOT NULL,
    prayer_date DATE NOT NULL,
    
    -- Five daily prayers
    fajr TIME NOT NULL,
    dhuhr TIME NOT NULL,
    asr TIME NOT NULL,
    maghrib TIME NOT NULL,
    isha TIME NOT NULL,
    
    -- Additional Islamic times
    sunrise TIME,
    sunset TIME,
    
    -- Metadata
    calculation_method VARCHAR(50) DEFAULT 'JAKIM',
    timezone VARCHAR(50) DEFAULT 'Asia/Kuala_Lumpur',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(city, state, prayer_date)
);

-- ============================================================================
-- REMINDERS AND NOTIFICATIONS
-- ============================================================================

-- Medication reminders
CREATE TABLE medication_reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    medication_id UUID NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
    
    -- Reminder configuration
    reminder_time TIMESTAMP WITH TIME ZONE NOT NULL,
    reminder_type VARCHAR(20) NOT NULL CHECK (reminder_type IN ('dose', 'refill', 'appointment', 'side_effect_check')),
    
    -- Notification preferences
    notification_methods JSONB NOT NULL DEFAULT '["push", "sms"]', -- push, sms, email, family
    advance_notice_minutes INTEGER DEFAULT 5,
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'acknowledged', 'snoozed', 'cancelled')),
    sent_at TIMESTAMP WITH TIME ZONE,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    snooze_until TIMESTAMP WITH TIME ZONE,
    
    -- Family notifications
    notify_family BOOLEAN DEFAULT FALSE,
    family_notification_delay_minutes INTEGER DEFAULT 15, -- Notify family if not acknowledged
    
    -- Cultural adjustments
    cultural_adjusted BOOLEAN DEFAULT FALSE,
    original_time TIMESTAMP WITH TIME ZONE,
    adjustment_reason VARCHAR(100),
    
    -- Repeat configuration
    repeat_pattern VARCHAR(20), -- daily, weekly, monthly, custom
    repeat_until DATE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- AUDIT AND COMPLIANCE
-- ============================================================================

-- Audit log for PDPA compliance
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(100) NOT NULL,
    operation VARCHAR(10) NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
    record_id UUID,
    old_data JSONB,
    new_data JSONB,
    changed_by VARCHAR(100) NOT NULL DEFAULT current_user,
    changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    ip_address INET,
    user_agent TEXT,
    compliance_reason VARCHAR(100) -- PDPA requirement, medical necessity, etc.
);

-- Data consent tracking
CREATE TABLE consent_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    consent_type VARCHAR(50) NOT NULL,
    consent_granted BOOLEAN NOT NULL,
    consent_date TIMESTAMP WITH TIME ZONE NOT NULL,
    expiry_date TIMESTAMP WITH TIME ZONE,
    
    -- Legal basis
    legal_basis VARCHAR(50) NOT NULL, -- consent, legitimate_interest, vital_interest
    purposes TEXT[] NOT NULL,
    data_categories TEXT[] NOT NULL,
    
    -- Withdrawal
    withdrawn BOOLEAN DEFAULT FALSE,
    withdrawal_date TIMESTAMP WITH TIME ZONE,
    withdrawal_reason TEXT,
    
    -- Version and language
    consent_version VARCHAR(10) NOT NULL,
    consent_language VARCHAR(5) NOT NULL,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- User indexes
CREATE INDEX idx_users_ic_hash ON users (ic_number_hash);
CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_family_role ON users (family_id, role) WHERE family_id IS NOT NULL;
CREATE INDEX idx_users_location ON users USING GIN (location);

-- Medication indexes
CREATE INDEX idx_medications_user_active ON medications (user_id, active) WHERE active = TRUE;
CREATE INDEX idx_medications_schedule ON medications USING GIN (schedule_times);
CREATE INDEX idx_medications_dates ON medications (start_date, end_date);

-- Adherence indexes for analytics
CREATE INDEX idx_adherence_user_date ON adherence_logs (user_id, scheduled_time DESC);
CREATE INDEX idx_adherence_medication_status ON adherence_logs (medication_id, status, scheduled_time);
CREATE INDEX idx_adherence_provider_date ON adherence_logs (user_id, scheduled_time) 
    WHERE status IN ('missed', 'late');

-- Cultural event indexes
CREATE INDEX idx_cultural_events_date_type ON cultural_events (event_date, event_type);
CREATE INDEX idx_prayer_times_city_date ON prayer_times (city, state, prayer_date);

-- Performance indexes
CREATE INDEX idx_reminders_user_time ON medication_reminders (user_id, reminder_time, status);
CREATE INDEX idx_audit_log_table_time ON audit_log (table_name, changed_at);
CREATE INDEX idx_consent_user_type ON consent_records (user_id, consent_type, consent_granted);

-- ============================================================================
-- TRIGGERS FOR AUDIT AND AUTOMATION
-- ============================================================================

-- Audit triggers for sensitive tables
CREATE TRIGGER audit_users_trigger
    AFTER INSERT OR UPDATE OR DELETE ON users
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER audit_medications_trigger
    AFTER INSERT OR UPDATE OR DELETE ON medications
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER audit_adherence_logs_trigger
    AFTER INSERT OR UPDATE OR DELETE ON adherence_logs
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();

-- Updated timestamp triggers
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_families_timestamp
    BEFORE UPDATE ON families
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_users_timestamp
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_medications_timestamp
    BEFORE UPDATE ON medications
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- ============================================================================
-- GRANTS AND PERMISSIONS
-- ============================================================================

-- Grant permissions to application role
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO medimate_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO medimate_app;

-- Grant read-only access to analytics role
GRANT SELECT ON adherence_logs, adherence_summaries, medications, users, cultural_events TO medimate_analytics;

-- Grant limited access to healthcare provider role
GRANT SELECT ON users, medications, adherence_logs TO medimate_healthcare;
GRANT INSERT, UPDATE ON adherence_logs TO medimate_healthcare;

-- Row-level security policies would be added here for production
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY user_data_policy ON users FOR ALL TO medimate_app USING (id = current_user_id());

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- Active medications with user details
CREATE VIEW active_medications_view AS
SELECT 
    m.id,
    m.medication_name,
    m.dosage,
    m.frequency,
    m.schedule_times,
    m.start_date,
    m.end_date,
    u.full_name,
    u.preferred_language,
    u.cultural_profile,
    f.family_name
FROM medications m
JOIN users u ON m.user_id = u.id
LEFT JOIN families f ON u.family_id = f.id
WHERE m.active = TRUE 
  AND (m.end_date IS NULL OR m.end_date >= CURRENT_DATE);

-- Adherence summary view
CREATE VIEW adherence_overview AS
SELECT 
    u.id as user_id,
    u.full_name,
    m.medication_name,
    COUNT(*) FILTER (WHERE al.status = 'taken') as doses_taken,
    COUNT(*) FILTER (WHERE al.status = 'missed') as doses_missed,
    COUNT(*) as total_scheduled,
    ROUND(
        (COUNT(*) FILTER (WHERE al.status = 'taken')::DECIMAL / NULLIF(COUNT(*), 0)) * 100, 
        2
    ) as adherence_percentage
FROM users u
JOIN medications m ON u.id = m.user_id
JOIN adherence_logs al ON m.id = al.medication_id
WHERE m.active = TRUE 
  AND al.scheduled_time >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY u.id, u.full_name, m.id, m.medication_name;

COMMENT ON DATABASE medimate_dev IS 'MediMate Malaysia - Healthcare medication management with cultural intelligence';