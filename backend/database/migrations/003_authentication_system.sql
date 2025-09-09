-- ============================================================================
-- MediMate Malaysia - Authentication System Extension
-- Migration 003: OAuth 2.0, Malaysian IC Authentication & RBAC System
-- Date: 2025-09-09
-- ============================================================================

-- ============================================================================
-- HEALTHCARE ROLES AND PERMISSIONS
-- ============================================================================

-- Healthcare roles with Malaysian medical hierarchy
CREATE TABLE healthcare_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_name VARCHAR(50) UNIQUE NOT NULL,
    role_code VARCHAR(10) UNIQUE NOT NULL, -- DR, NS, PH, AD, PT
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    
    -- Malaysian medical hierarchy
    hierarchy_level INTEGER NOT NULL DEFAULT 1, -- 1=lowest, 10=highest
    parent_role_id UUID REFERENCES healthcare_roles(id),
    
    -- Role characteristics
    can_prescribe BOOLEAN DEFAULT FALSE,
    can_diagnose BOOLEAN DEFAULT FALSE,
    can_access_full_records BOOLEAN DEFAULT FALSE,
    requires_medical_license BOOLEAN DEFAULT FALSE,
    requires_mmc_registration BOOLEAN DEFAULT FALSE, -- Malaysian Medical Council
    
    -- Emergency access
    emergency_access_level INTEGER DEFAULT 0, -- 0=none, 3=full emergency access
    can_override_restrictions BOOLEAN DEFAULT FALSE,
    
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert healthcare roles
INSERT INTO healthcare_roles (role_name, role_code, display_name, description, hierarchy_level, can_prescribe, can_diagnose, can_access_full_records, requires_medical_license, requires_mmc_registration, emergency_access_level) VALUES
('patient', 'PT', 'Patient', 'Healthcare service recipient', 1, FALSE, FALSE, FALSE, FALSE, FALSE, 0),
('pharmacist', 'PH', 'Pharmacist', 'Licensed pharmacist', 4, FALSE, FALSE, TRUE, TRUE, FALSE, 1),
('nurse', 'NS', 'Nurse', 'Registered nurse', 5, FALSE, FALSE, TRUE, TRUE, FALSE, 2),
('specialist_nurse', 'SN', 'Specialist Nurse', 'Specialist registered nurse', 6, FALSE, TRUE, TRUE, TRUE, FALSE, 2),
('doctor', 'DR', 'Doctor', 'Licensed medical doctor', 8, TRUE, TRUE, TRUE, TRUE, TRUE, 3),
('specialist_doctor', 'SD', 'Specialist Doctor', 'Medical specialist', 9, TRUE, TRUE, TRUE, TRUE, TRUE, 3),
('admin', 'AD', 'Administrator', 'System administrator', 7, FALSE, FALSE, TRUE, FALSE, FALSE, 2),
('system_admin', 'SA', 'System Administrator', 'Full system access', 10, FALSE, FALSE, TRUE, FALSE, FALSE, 3);

-- Granular permissions for medical data access
CREATE TABLE healthcare_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    permission_name VARCHAR(100) UNIQUE NOT NULL,
    permission_code VARCHAR(20) UNIQUE NOT NULL,
    category VARCHAR(50) NOT NULL, -- medical_records, prescriptions, diagnostics, administrative
    description TEXT,
    
    -- Risk level for PDPA compliance
    data_sensitivity INTEGER DEFAULT 1, -- 1=low, 5=critical
    requires_audit BOOLEAN DEFAULT FALSE,
    requires_patient_consent BOOLEAN DEFAULT FALSE,
    
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert healthcare permissions
INSERT INTO healthcare_permissions (permission_name, permission_code, category, description, data_sensitivity, requires_audit, requires_patient_consent) VALUES
-- Medical Records
('view_basic_medical_records', 'VIEW_BASIC_MED', 'medical_records', 'View basic medical history and non-sensitive records', 2, TRUE, FALSE),
('view_full_medical_records', 'VIEW_FULL_MED', 'medical_records', 'View complete medical records including sensitive data', 5, TRUE, TRUE),
('create_medical_records', 'CREATE_MED', 'medical_records', 'Create new medical records and entries', 4, TRUE, FALSE),
('edit_medical_records', 'EDIT_MED', 'medical_records', 'Modify existing medical records', 5, TRUE, TRUE),
('delete_medical_records', 'DELETE_MED', 'medical_records', 'Delete medical records (audit trail retained)', 5, TRUE, TRUE),

-- Prescriptions
('view_prescriptions', 'VIEW_PRESC', 'prescriptions', 'View patient prescriptions', 3, TRUE, FALSE),
('create_prescriptions', 'CREATE_PRESC', 'prescriptions', 'Issue new prescriptions', 4, TRUE, FALSE),
('modify_prescriptions', 'EDIT_PRESC', 'prescriptions', 'Modify existing prescriptions', 4, TRUE, TRUE),
('dispense_medications', 'DISPENSE_MED', 'prescriptions', 'Dispense medications to patients', 3, TRUE, FALSE),

-- Diagnostics
('view_lab_results', 'VIEW_LAB', 'diagnostics', 'View laboratory test results', 4, TRUE, FALSE),
('view_imaging_results', 'VIEW_IMAGING', 'diagnostics', 'View medical imaging results', 4, TRUE, FALSE),
('order_diagnostics', 'ORDER_DIAG', 'diagnostics', 'Order diagnostic tests', 3, TRUE, FALSE),

-- Administrative
('manage_appointments', 'MANAGE_APPT', 'administrative', 'Create and manage patient appointments', 2, FALSE, FALSE),
('view_insurance_data', 'VIEW_INS', 'administrative', 'View patient insurance information', 3, TRUE, FALSE),
('emergency_access', 'EMERG_ACCESS', 'administrative', 'Emergency override access to patient data', 5, TRUE, TRUE),
('system_administration', 'SYS_ADMIN', 'administrative', 'Full system administrative access', 5, TRUE, TRUE);

-- Role-permission mapping
CREATE TABLE role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_id UUID NOT NULL REFERENCES healthcare_roles(id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES healthcare_permissions(id) ON DELETE CASCADE,
    
    -- Permission constraints
    granted BOOLEAN DEFAULT TRUE,
    can_delegate BOOLEAN DEFAULT FALSE, -- Can grant this permission to others
    conditions JSONB DEFAULT '{}', -- Additional conditions for permission
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(role_id, permission_id)
);

-- ============================================================================
-- AUTHENTICATION INFRASTRUCTURE
-- ============================================================================

-- OAuth providers configuration
CREATE TABLE oauth_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_name VARCHAR(50) UNIQUE NOT NULL, -- google, microsoft, local
    provider_code VARCHAR(10) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    
    -- OAuth configuration
    client_id VARCHAR(200),
    client_secret_encrypted TEXT, -- Encrypted client secret
    authorization_endpoint TEXT,
    token_endpoint TEXT,
    userinfo_endpoint TEXT,
    
    -- Provider settings
    scopes TEXT[] DEFAULT '{}',
    supported_features JSONB DEFAULT '{}',
    
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert OAuth providers
INSERT INTO oauth_providers (provider_name, provider_code, display_name, scopes) VALUES
('google', 'GOOGLE', 'Google', ARRAY['openid', 'email', 'profile']),
('microsoft', 'MSFT', 'Microsoft', ARRAY['openid', 'email', 'profile']),
('local', 'LOCAL', 'Local Authentication', ARRAY[]);

-- Extended user authentication data
CREATE TABLE user_authentication (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    
    -- Malaysian IC integration
    ic_number_encrypted TEXT, -- Encrypted IC number for verification
    ic_verification_status VARCHAR(20) DEFAULT 'unverified' CHECK (ic_verification_status IN (
        'unverified', 'pending', 'verified', 'failed', 'expired'
    )),
    ic_verification_date TIMESTAMP WITH TIME ZONE,
    ic_verification_method VARCHAR(50), -- manual, api, document_scan
    
    -- Demographic data extracted from IC
    ic_birth_date DATE,
    ic_birth_place_code VARCHAR(2), -- State code from IC
    ic_gender CHAR(1) CHECK (ic_gender IN ('M', 'F')),
    ic_citizenship_status VARCHAR(20), -- citizen, permanent_resident, foreigner
    
    -- Password authentication (for local accounts)
    password_hash TEXT,
    password_salt VARCHAR(32),
    password_last_changed TIMESTAMP WITH TIME ZONE,
    password_expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Password policy compliance
    password_history_hash TEXT[], -- Previous 5 password hashes
    failed_login_attempts INTEGER DEFAULT 0,
    account_locked_until TIMESTAMP WITH TIME ZONE,
    lockout_reason VARCHAR(100),
    
    -- Healthcare role assignment
    healthcare_role_id UUID REFERENCES healthcare_roles(id),
    role_assigned_by UUID REFERENCES users(id),
    role_assigned_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Professional registration (for healthcare staff)
    medical_license_number VARCHAR(50),
    mmc_registration_number VARCHAR(50), -- Malaysian Medical Council
    pharmacy_board_number VARCHAR(50),
    nursing_board_number VARCHAR(50),
    license_verification_status VARCHAR(20) DEFAULT 'unverified',
    license_verification_date TIMESTAMP WITH TIME ZONE,
    license_expiry_date DATE,
    
    -- Security settings
    mfa_enabled BOOLEAN DEFAULT FALSE,
    mfa_methods TEXT[] DEFAULT '{}', -- sms, email, totp, backup_codes
    backup_codes_generated_at TIMESTAMP WITH TIME ZONE,
    
    -- Session management
    concurrent_sessions_allowed INTEGER DEFAULT 3,
    session_timeout_minutes INTEGER DEFAULT 480, -- 8 hours
    require_password_change BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- OAuth account linking
CREATE TABLE oauth_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES oauth_providers(id) ON DELETE CASCADE,
    
    -- OAuth account data
    provider_user_id VARCHAR(200) NOT NULL, -- User ID from OAuth provider
    email VARCHAR(255),
    verified BOOLEAN DEFAULT FALSE,
    
    -- Account metadata
    account_data JSONB DEFAULT '{}', -- Provider-specific data
    scope_granted TEXT[],
    
    -- Token management
    access_token_hash VARCHAR(64), -- Hashed access token
    refresh_token_hash VARCHAR(64), -- Hashed refresh token
    token_expires_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(provider_id, provider_user_id),
    UNIQUE(user_id, provider_id)
);

-- ============================================================================
-- SESSION AND TOKEN MANAGEMENT
-- ============================================================================

-- User sessions with cultural preferences
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token_hash VARCHAR(64) UNIQUE NOT NULL,
    
    -- Session metadata
    ip_address INET NOT NULL,
    user_agent TEXT,
    device_fingerprint VARCHAR(64),
    
    -- Location and cultural context
    location_city VARCHAR(100),
    location_state VARCHAR(100),
    timezone VARCHAR(50) DEFAULT 'Asia/Kuala_Lumpur',
    
    -- Cultural session preferences
    active_language VARCHAR(5) DEFAULT 'ms',
    prayer_times_enabled BOOLEAN DEFAULT FALSE,
    cultural_calendar_active BOOLEAN DEFAULT FALSE,
    
    -- Session timing
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Session status
    active BOOLEAN DEFAULT TRUE,
    logout_type VARCHAR(20), -- manual, timeout, force, security
    logout_reason TEXT,
    
    -- Security flags
    mfa_verified BOOLEAN DEFAULT FALSE,
    high_risk_session BOOLEAN DEFAULT FALSE,
    emergency_access_used BOOLEAN DEFAULT FALSE
);

-- JWT tokens for API access
CREATE TABLE api_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Token identification
    token_name VARCHAR(100) NOT NULL, -- User-friendly name
    token_hash VARCHAR(64) UNIQUE NOT NULL,
    token_prefix VARCHAR(8) NOT NULL, -- First 8 chars for identification
    
    -- Token permissions
    scopes TEXT[] NOT NULL DEFAULT '{}',
    role_permissions JSONB DEFAULT '{}',
    
    -- Rate limiting
    rate_limit_per_hour INTEGER DEFAULT 1000,
    rate_limit_per_day INTEGER DEFAULT 10000,
    
    -- Token lifecycle
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_used_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Usage statistics
    total_requests INTEGER DEFAULT 0,
    
    active BOOLEAN DEFAULT TRUE
);

-- ============================================================================
-- MULTI-FACTOR AUTHENTICATION
-- ============================================================================

-- MFA methods for enhanced security
CREATE TABLE mfa_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- MFA method details
    method_type VARCHAR(20) NOT NULL CHECK (method_type IN (
        'sms', 'email', 'totp', 'backup_codes', 'hardware_token'
    )),
    method_name VARCHAR(100), -- User-friendly name
    
    -- Method configuration
    phone_number VARCHAR(15), -- For SMS
    email_address VARCHAR(255), -- For email
    totp_secret_encrypted TEXT, -- Encrypted TOTP secret
    backup_codes_encrypted TEXT, -- Encrypted backup codes
    
    -- Malaysian mobile network optimization
    sms_carrier VARCHAR(50), -- Maxis, Celcom, Digi, etc.
    preferred_delivery_time TIME, -- Avoid prayer times
    
    -- Method status
    verified BOOLEAN DEFAULT FALSE,
    verified_at TIMESTAMP WITH TIME ZONE,
    primary_method BOOLEAN DEFAULT FALSE,
    
    -- Usage tracking
    last_used_at TIMESTAMP WITH TIME ZONE,
    failure_count INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, method_type, phone_number),
    UNIQUE(user_id, method_type, email_address)
);

-- MFA verification attempts
CREATE TABLE mfa_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mfa_method_id UUID REFERENCES mfa_methods(id) ON DELETE SET NULL,
    
    -- Attempt details
    attempt_type VARCHAR(20) NOT NULL, -- login, password_reset, sensitive_action
    method_used VARCHAR(20) NOT NULL,
    
    -- Verification data
    code_sent VARCHAR(10), -- Partial code for audit
    success BOOLEAN NOT NULL,
    failure_reason VARCHAR(100),
    
    -- Request context
    ip_address INET NOT NULL,
    user_agent TEXT,
    session_id UUID REFERENCES user_sessions(id),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- AUDIT AND COMPLIANCE ENHANCEMENTS
-- ============================================================================

-- Authentication events for PDPA compliance
CREATE TABLE authentication_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    
    -- Event details
    event_type VARCHAR(50) NOT NULL, -- login, logout, failed_login, password_change, etc.
    event_status VARCHAR(20) NOT NULL, -- success, failure, partial
    event_description TEXT,
    
    -- Authentication method
    auth_method VARCHAR(50), -- password, oauth, mfa, emergency
    provider_used VARCHAR(50), -- google, microsoft, local, emergency
    
    -- Request context
    ip_address INET NOT NULL,
    user_agent TEXT,
    device_fingerprint VARCHAR(64),
    
    -- Location context
    location_country VARCHAR(50) DEFAULT 'Malaysia',
    location_city VARCHAR(100),
    location_state VARCHAR(100),
    
    -- Risk assessment
    risk_score INTEGER DEFAULT 0, -- 0-100 risk score
    risk_factors TEXT[],
    blocked_by_security BOOLEAN DEFAULT FALSE,
    
    -- Cultural context
    prayer_time_conflict BOOLEAN DEFAULT FALSE,
    cultural_holiday_context VARCHAR(100),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Emergency access log for audit trail
CREATE TABLE emergency_access_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    accessing_user_id UUID NOT NULL REFERENCES users(id),
    patient_user_id UUID NOT NULL REFERENCES users(id),
    
    -- Emergency details
    emergency_type VARCHAR(50) NOT NULL, -- medical_emergency, system_failure, court_order
    emergency_description TEXT NOT NULL,
    justification TEXT NOT NULL,
    
    -- Authorization
    authorized_by UUID REFERENCES users(id),
    authorization_code VARCHAR(20),
    
    -- Access details
    data_accessed TEXT[], -- Types of data accessed
    duration_minutes INTEGER,
    
    -- Audit requirements
    requires_followup BOOLEAN DEFAULT TRUE,
    followup_completed BOOLEAN DEFAULT FALSE,
    followup_notes TEXT,
    
    -- Legal compliance
    legal_basis VARCHAR(100), -- vital_interest, public_task, legitimate_interest
    patient_notification_required BOOLEAN DEFAULT TRUE,
    patient_notified_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR AUTHENTICATION PERFORMANCE
-- ============================================================================

-- Authentication indexes
CREATE INDEX idx_user_auth_ic_verification ON user_authentication (ic_verification_status, ic_verification_date);
CREATE INDEX idx_user_auth_healthcare_role ON user_authentication (healthcare_role_id, role_assigned_date);
CREATE INDEX idx_user_auth_mfa ON user_authentication (mfa_enabled, user_id) WHERE mfa_enabled = TRUE;

-- OAuth indexes
CREATE INDEX idx_oauth_accounts_provider_user ON oauth_accounts (provider_id, provider_user_id);
CREATE INDEX idx_oauth_accounts_user_verified ON oauth_accounts (user_id, verified);

-- Session indexes
CREATE INDEX idx_sessions_user_active ON user_sessions (user_id, active, expires_at) WHERE active = TRUE;
CREATE INDEX idx_sessions_token_hash ON user_sessions (session_token_hash) WHERE active = TRUE;
CREATE INDEX idx_sessions_cleanup ON user_sessions (expires_at, active) WHERE active = FALSE;

-- API token indexes
CREATE INDEX idx_api_tokens_hash ON api_tokens (token_hash) WHERE active = TRUE;
CREATE INDEX idx_api_tokens_user_active ON api_tokens (user_id, active, expires_at) WHERE active = TRUE;

-- MFA indexes
CREATE INDEX idx_mfa_methods_user_type ON mfa_methods (user_id, method_type, active) WHERE active = TRUE;
CREATE INDEX idx_mfa_methods_primary ON mfa_methods (user_id, primary_method) WHERE primary_method = TRUE;

-- Audit indexes
CREATE INDEX idx_auth_audit_user_time ON authentication_audit (user_id, created_at DESC);
CREATE INDEX idx_auth_audit_event_time ON authentication_audit (event_type, created_at DESC);
CREATE INDEX idx_auth_audit_risk ON authentication_audit (risk_score DESC, created_at DESC) WHERE risk_score > 50;

-- Emergency access indexes
CREATE INDEX idx_emergency_access_patient ON emergency_access_log (patient_user_id, created_at DESC);
CREATE INDEX idx_emergency_access_followup ON emergency_access_log (requires_followup, followup_completed) WHERE requires_followup = TRUE;

-- ============================================================================
-- ROLE-BASED ACCESS CONTROL VIEWS
-- ============================================================================

-- User roles and permissions view
CREATE VIEW user_roles_permissions AS
SELECT 
    u.id as user_id,
    u.full_name,
    u.email,
    ua.healthcare_role_id,
    hr.role_name,
    hr.role_code,
    hr.display_name as role_display_name,
    hr.hierarchy_level,
    ua.medical_license_number,
    ua.mmc_registration_number,
    ARRAY_AGG(hp.permission_code) as permission_codes,
    ARRAY_AGG(hp.permission_name) as permission_names
FROM users u
JOIN user_authentication ua ON u.id = ua.user_id
JOIN healthcare_roles hr ON ua.healthcare_role_id = hr.id
LEFT JOIN role_permissions rp ON hr.id = rp.role_id AND rp.granted = TRUE
LEFT JOIN healthcare_permissions hp ON rp.permission_id = hp.id AND hp.active = TRUE
WHERE hr.active = TRUE
GROUP BY u.id, u.full_name, u.email, ua.healthcare_role_id, hr.role_name, hr.role_code, hr.display_name, hr.hierarchy_level, ua.medical_license_number, ua.mmc_registration_number;

-- Active sessions with user context
CREATE VIEW active_user_sessions AS
SELECT 
    s.id as session_id,
    s.user_id,
    u.full_name,
    u.email,
    hr.role_name,
    s.ip_address,
    s.location_city,
    s.location_state,
    s.active_language,
    s.created_at,
    s.last_activity,
    s.expires_at,
    s.mfa_verified
FROM user_sessions s
JOIN users u ON s.user_id = u.id
JOIN user_authentication ua ON u.id = ua.user_id
LEFT JOIN healthcare_roles hr ON ua.healthcare_role_id = hr.id
WHERE s.active = TRUE AND s.expires_at > NOW();

-- ============================================================================
-- TRIGGERS FOR AUTHENTICATION SYSTEM
-- ============================================================================

-- Update timestamp triggers
CREATE TRIGGER update_oauth_providers_timestamp
    BEFORE UPDATE ON oauth_providers
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_user_authentication_timestamp
    BEFORE UPDATE ON user_authentication
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_oauth_accounts_timestamp
    BEFORE UPDATE ON oauth_accounts
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_mfa_methods_timestamp
    BEFORE UPDATE ON mfa_methods
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_emergency_access_timestamp
    BEFORE UPDATE ON emergency_access_log
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Audit triggers for sensitive authentication tables
CREATE TRIGGER audit_user_authentication_trigger
    AFTER INSERT OR UPDATE OR DELETE ON user_authentication
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER audit_oauth_accounts_trigger
    AFTER INSERT OR UPDATE OR DELETE ON oauth_accounts
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER audit_mfa_methods_trigger
    AFTER INSERT OR UPDATE OR DELETE ON mfa_methods
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();

-- ============================================================================
-- SECURITY FUNCTIONS
-- ============================================================================

-- Function to check if user has specific permission
CREATE OR REPLACE FUNCTION user_has_permission(
    p_user_id UUID,
    p_permission_code VARCHAR(20)
) RETURNS BOOLEAN AS $$
DECLARE
    has_permission BOOLEAN := FALSE;
BEGIN
    SELECT COUNT(*) > 0 INTO has_permission
    FROM users u
    JOIN user_authentication ua ON u.id = ua.user_id
    JOIN healthcare_roles hr ON ua.healthcare_role_id = hr.id
    JOIN role_permissions rp ON hr.id = rp.role_id
    JOIN healthcare_permissions hp ON rp.permission_id = hp.id
    WHERE u.id = p_user_id
      AND hp.permission_code = p_permission_code
      AND hr.active = TRUE
      AND hp.active = TRUE
      AND rp.granted = TRUE;
    
    RETURN has_permission;
END;
$$ LANGUAGE plpgsql;

-- Function to validate Malaysian IC number format
CREATE OR REPLACE FUNCTION validate_malaysian_ic(ic_number TEXT) RETURNS BOOLEAN AS $$
BEGIN
    -- Basic IC format validation: YYMMDD-PB-###G
    -- YY: Year, MM: Month, DD: Day
    -- PB: Place of birth code (01-59, 82, 86-87)
    -- ###: Serial number
    -- G: Gender digit (odd=male, even=female)
    
    -- Check length and format
    IF LENGTH(ic_number) != 12 OR ic_number !~ '^\d{12}$' THEN
        RETURN FALSE;
    END IF;
    
    -- Validate date portion
    DECLARE
        year_part INTEGER := SUBSTRING(ic_number FROM 1 FOR 2)::INTEGER;
        month_part INTEGER := SUBSTRING(ic_number FROM 3 FOR 2)::INTEGER;
        day_part INTEGER := SUBSTRING(ic_number FROM 5 FOR 2)::INTEGER;
        place_part INTEGER := SUBSTRING(ic_number FROM 7 FOR 2)::INTEGER;
    BEGIN
        -- Validate month
        IF month_part < 1 OR month_part > 12 THEN
            RETURN FALSE;
        END IF;
        
        -- Validate day
        IF day_part < 1 OR day_part > 31 THEN
            RETURN FALSE;
        END IF;
        
        -- Validate place of birth codes for Malaysian states
        IF NOT (place_part BETWEEN 1 AND 59 OR place_part IN (82, 86, 87)) THEN
            RETURN FALSE;
        END IF;
        
        RETURN TRUE;
    END;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- GRANTS AND PERMISSIONS FOR AUTHENTICATION
-- ============================================================================

-- Grant permissions to application role
GRANT SELECT, INSERT, UPDATE, DELETE ON 
    healthcare_roles, healthcare_permissions, role_permissions,
    oauth_providers, user_authentication, oauth_accounts,
    user_sessions, api_tokens, mfa_methods, mfa_attempts,
    authentication_audit, emergency_access_log
TO medimate_app;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO medimate_app;

-- Grant read-only access to analytics role for audit data
GRANT SELECT ON 
    authentication_audit, emergency_access_log, user_sessions,
    user_roles_permissions, active_user_sessions
TO medimate_analytics;

-- Grant healthcare provider limited access
GRANT SELECT ON 
    user_roles_permissions, healthcare_roles, healthcare_permissions
TO medimate_healthcare;

COMMENT ON TABLE healthcare_roles IS 'Malaysian healthcare role hierarchy with medical licensing integration';
COMMENT ON TABLE user_authentication IS 'Extended authentication data with Malaysian IC validation and MFA support';
COMMENT ON TABLE oauth_accounts IS 'OAuth provider account linking for Google, Microsoft, and local authentication';
COMMENT ON TABLE mfa_methods IS 'Multi-factor authentication methods optimized for Malaysian mobile networks';
COMMENT ON TABLE authentication_audit IS 'PDPA-compliant audit trail for all authentication events';
COMMENT ON TABLE emergency_access_log IS 'Break-glass emergency access audit trail with legal compliance tracking';

-- Set default role permissions (executed after role creation)
-- This will be populated by the application initialization