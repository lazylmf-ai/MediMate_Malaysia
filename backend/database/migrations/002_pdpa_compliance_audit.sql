-- ============================================================================
-- PDPA Compliance & Audit Framework Migration 002
-- Malaysian Personal Data Protection Act 2010 Compliance Implementation
-- Date: 2025-09-08
-- ============================================================================

-- ============================================================================
-- ENHANCED AUDIT SYSTEM FOR PDPA COMPLIANCE
-- ============================================================================

-- Enhanced audit log with PDPA-specific fields
ALTER TABLE audit_log ADD COLUMN IF NOT EXISTS 
    session_id VARCHAR(64),
    request_id VARCHAR(64),
    data_subject_id UUID,
    data_categories TEXT[],
    processing_purpose VARCHAR(200),
    legal_basis VARCHAR(50) CHECK (legal_basis IN (
        'consent', 'contract', 'legal_obligation', 'vital_interests', 
        'public_task', 'legitimate_interests'
    )),
    retention_period_days INTEGER DEFAULT 2555, -- 7 years for healthcare
    anonymization_date DATE,
    geographic_location VARCHAR(100),
    sensitive_data_flag BOOLEAN DEFAULT FALSE,
    cross_border_transfer BOOLEAN DEFAULT FALSE,
    breach_risk_level VARCHAR(20) DEFAULT 'low' CHECK (breach_risk_level IN ('low', 'medium', 'high', 'critical'));

-- Create indexes for PDPA audit queries
CREATE INDEX IF NOT EXISTS idx_audit_log_data_subject ON audit_log (data_subject_id, changed_at);
CREATE INDEX IF NOT EXISTS idx_audit_log_retention ON audit_log (changed_at, retention_period_days);
CREATE INDEX IF NOT EXISTS idx_audit_log_sensitive ON audit_log (sensitive_data_flag, changed_at) WHERE sensitive_data_flag = TRUE;
CREATE INDEX IF NOT EXISTS idx_audit_log_breach_risk ON audit_log (breach_risk_level, changed_at) WHERE breach_risk_level IN ('high', 'critical');

-- ============================================================================
-- PDPA CONSENT MANAGEMENT SYSTEM
-- ============================================================================

-- Enhanced consent records with granular PDPA tracking
ALTER TABLE consent_records ADD COLUMN IF NOT EXISTS
    consent_method VARCHAR(50) DEFAULT 'digital' CHECK (consent_method IN (
        'digital', 'written', 'verbal', 'implied', 'opt_in', 'opt_out'
    )),
    data_retention_consent BOOLEAN DEFAULT FALSE,
    marketing_consent BOOLEAN DEFAULT FALSE,
    third_party_sharing_consent BOOLEAN DEFAULT FALSE,
    analytics_consent BOOLEAN DEFAULT FALSE,
    ip_address INET,
    browser_info TEXT,
    consent_evidence JSONB DEFAULT '{}',
    renewal_required BOOLEAN DEFAULT FALSE,
    renewal_date DATE,
    processor_consent JSONB DEFAULT '{}'; -- Third-party processors consent

-- Consent renewal tracking
CREATE TABLE consent_renewals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    consent_record_id UUID NOT NULL REFERENCES consent_records(id) ON DELETE CASCADE,
    renewal_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    previous_consent_status BOOLEAN NOT NULL,
    new_consent_status BOOLEAN NOT NULL,
    renewal_method VARCHAR(50) DEFAULT 'system_prompt',
    renewal_reason TEXT,
    evidence_document_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_consent_renewals_record_date ON consent_renewals (consent_record_id, renewal_date DESC);

-- ============================================================================
-- DATA SUBJECT RIGHTS MANAGEMENT
-- ============================================================================

-- Data subject access requests (Right to Access)
CREATE TABLE data_access_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    request_type VARCHAR(50) NOT NULL CHECK (request_type IN (
        'access', 'rectification', 'erasure', 'portability', 'restriction', 'objection'
    )),
    request_status VARCHAR(30) DEFAULT 'pending' CHECK (request_status IN (
        'pending', 'in_progress', 'completed', 'rejected', 'partially_completed'
    )),
    
    -- Request details
    request_description TEXT,
    requested_data_categories TEXT[],
    date_range_from DATE,
    date_range_to DATE,
    
    -- Malaysian IC verification
    identity_verification_method VARCHAR(50) DEFAULT 'ic_number',
    identity_verified BOOLEAN DEFAULT FALSE,
    verification_evidence JSONB DEFAULT '{}',
    
    -- Processing details
    assigned_to VARCHAR(100),
    estimated_completion_date DATE,
    actual_completion_date DATE,
    response_method VARCHAR(30) DEFAULT 'email' CHECK (response_method IN (
        'email', 'postal_mail', 'in_person', 'secure_download'
    )),
    
    -- Legal and compliance
    legal_review_required BOOLEAN DEFAULT FALSE,
    legal_review_completed BOOLEAN DEFAULT FALSE,
    third_party_involvement BOOLEAN DEFAULT FALSE,
    third_party_notifications JSONB DEFAULT '{}',
    
    -- Response tracking
    response_sent BOOLEAN DEFAULT FALSE,
    response_sent_at TIMESTAMP WITH TIME ZONE,
    response_document_id UUID,
    customer_satisfaction_rating INTEGER CHECK (customer_satisfaction_rating BETWEEN 1 AND 5),
    
    -- Escalation
    escalated BOOLEAN DEFAULT FALSE,
    escalation_reason TEXT,
    escalated_to VARCHAR(100),
    escalated_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Data erasure tracking (Right to be Forgotten)
CREATE TABLE data_erasure_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    data_access_request_id UUID REFERENCES data_access_requests(id),
    table_name VARCHAR(100) NOT NULL,
    record_id UUID,
    erasure_type VARCHAR(30) NOT NULL CHECK (erasure_type IN (
        'full_deletion', 'anonymization', 'pseudonymization', 'archival'
    )),
    
    -- Erasure details
    original_data_hash VARCHAR(64), -- For verification
    erasure_method VARCHAR(100),
    anonymization_algorithm VARCHAR(50),
    retention_override_reason TEXT,
    
    -- Legal and compliance
    legal_basis_for_retention TEXT,
    regulatory_requirement BOOLEAN DEFAULT FALSE,
    healthcare_necessity BOOLEAN DEFAULT FALSE,
    
    -- Verification and rollback
    erasure_verified BOOLEAN DEFAULT FALSE,
    verification_method VARCHAR(50),
    rollback_possible BOOLEAN DEFAULT FALSE,
    rollback_data_location TEXT,
    
    performed_by VARCHAR(100) NOT NULL DEFAULT current_user,
    performed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_data_erasure_user_date ON data_erasure_log (user_id, performed_at DESC);
CREATE INDEX idx_data_erasure_table ON data_erasure_log (table_name, performed_at DESC);

-- ============================================================================
-- DATA BREACH DETECTION AND NOTIFICATION
-- ============================================================================

-- Data breach incidents tracking
CREATE TABLE data_breach_incidents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    incident_reference VARCHAR(50) UNIQUE NOT NULL DEFAULT 'BREACH-' || EXTRACT(YEAR FROM NOW()) || '-' || LPAD(nextval('breach_sequence')::TEXT, 4, '0'),
    
    -- Incident classification
    breach_type VARCHAR(50) NOT NULL CHECK (breach_type IN (
        'unauthorized_access', 'data_theft', 'accidental_disclosure', 
        'system_compromise', 'insider_threat', 'third_party_breach',
        'physical_breach', 'ransomware', 'other'
    )),
    severity_level VARCHAR(20) NOT NULL CHECK (severity_level IN ('low', 'medium', 'high', 'critical')),
    
    -- Incident details
    incident_date TIMESTAMP WITH TIME ZONE NOT NULL,
    discovery_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    incident_description TEXT NOT NULL,
    potential_impact TEXT,
    root_cause TEXT,
    
    -- Data involved
    affected_data_categories TEXT[] NOT NULL,
    estimated_affected_users INTEGER DEFAULT 0,
    sensitive_data_involved BOOLEAN DEFAULT FALSE,
    
    -- Malaysian context
    cross_border_data_involved BOOLEAN DEFAULT FALSE,
    government_data_involved BOOLEAN DEFAULT FALSE,
    healthcare_data_involved BOOLEAN DEFAULT TRUE,
    
    -- Response and containment
    containment_measures TEXT,
    containment_completed BOOLEAN DEFAULT FALSE,
    containment_date TIMESTAMP WITH TIME ZONE,
    
    -- Risk assessment
    likelihood_of_harm VARCHAR(20) DEFAULT 'medium' CHECK (likelihood_of_harm IN ('low', 'medium', 'high')),
    risk_mitigation_measures TEXT,
    ongoing_risk BOOLEAN DEFAULT FALSE,
    
    -- Notification requirements
    pdpa_notification_required BOOLEAN DEFAULT FALSE,
    pdpa_notification_sent BOOLEAN DEFAULT FALSE,
    pdpa_notification_date TIMESTAMP WITH TIME ZONE,
    user_notification_required BOOLEAN DEFAULT FALSE,
    user_notifications_sent INTEGER DEFAULT 0,
    
    -- Investigation and resolution
    investigation_status VARCHAR(30) DEFAULT 'ongoing' CHECK (investigation_status IN (
        'ongoing', 'completed', 'closed', 'escalated'
    )),
    resolution_status VARCHAR(30) DEFAULT 'open' CHECK (resolution_status IN (
        'open', 'resolved', 'partially_resolved', 'closed'
    )),
    lessons_learned TEXT,
    
    -- Responsible parties
    discovered_by VARCHAR(100),
    incident_manager VARCHAR(100),
    data_protection_officer_notified BOOLEAN DEFAULT FALSE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sequence for breach reference numbers
CREATE SEQUENCE IF NOT EXISTS breach_sequence START 1;

-- Breach notification log
CREATE TABLE breach_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    breach_incident_id UUID NOT NULL REFERENCES data_breach_incidents(id) ON DELETE CASCADE,
    notification_type VARCHAR(30) NOT NULL CHECK (notification_type IN (
        'regulatory', 'user', 'internal', 'third_party', 'public'
    )),
    
    -- Recipient details
    recipient_category VARCHAR(50) NOT NULL,
    recipient_contact TEXT,
    notification_method VARCHAR(30) DEFAULT 'email',
    
    -- Content and timing
    notification_sent_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    notification_content TEXT,
    acknowledgment_required BOOLEAN DEFAULT FALSE,
    acknowledgment_received BOOLEAN DEFAULT FALSE,
    acknowledgment_date TIMESTAMP WITH TIME ZONE,
    
    -- Malaysian regulatory context
    pdpa_compliance_reference VARCHAR(100),
    regulatory_body VARCHAR(100),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- DATA ANONYMIZATION AND RETENTION
-- ============================================================================

-- Data retention policies
CREATE TABLE data_retention_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_name VARCHAR(100) NOT NULL UNIQUE,
    table_name VARCHAR(100) NOT NULL,
    data_category VARCHAR(100) NOT NULL,
    
    -- Retention rules
    retention_period_days INTEGER NOT NULL DEFAULT 2555, -- 7 years
    legal_basis_for_retention TEXT NOT NULL,
    regulatory_requirement BOOLEAN DEFAULT TRUE,
    
    -- Malaysian healthcare specific
    healthcare_category VARCHAR(50) CHECK (healthcare_category IN (
        'medical_records', 'prescription_data', 'patient_demographics',
        'consent_records', 'audit_logs', 'insurance_claims'
    )),
    moh_requirement BOOLEAN DEFAULT FALSE,
    
    -- Retention actions
    action_after_expiry VARCHAR(30) DEFAULT 'anonymize' CHECK (action_after_expiry IN (
        'delete', 'anonymize', 'archive', 'manual_review'
    )),
    anonymization_method VARCHAR(50) DEFAULT 'k_anonymity',
    
    -- Policy metadata
    policy_version INTEGER DEFAULT 1,
    effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
    review_frequency_months INTEGER DEFAULT 12,
    next_review_date DATE,
    
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Data anonymization jobs
CREATE TABLE anonymization_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    retention_policy_id UUID NOT NULL REFERENCES data_retention_policies(id),
    job_type VARCHAR(30) NOT NULL CHECK (job_type IN (
        'scheduled', 'manual', 'breach_response', 'user_request'
    )),
    
    -- Job configuration
    target_table VARCHAR(100) NOT NULL,
    anonymization_algorithm VARCHAR(50) NOT NULL,
    date_range_start DATE,
    date_range_end DATE,
    record_count_estimated INTEGER,
    
    -- Processing status
    job_status VARCHAR(30) DEFAULT 'pending' CHECK (job_status IN (
        'pending', 'running', 'completed', 'failed', 'cancelled'
    )),
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    
    -- Results
    records_processed INTEGER DEFAULT 0,
    records_anonymized INTEGER DEFAULT 0,
    records_deleted INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    error_log TEXT,
    
    -- Verification
    verification_hash VARCHAR(64),
    rollback_data_location TEXT,
    rollback_expiry_date DATE,
    
    performed_by VARCHAR(100) NOT NULL DEFAULT current_user,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- COMPLIANCE MONITORING AND REPORTING
-- ============================================================================

-- Compliance audit reports
CREATE TABLE compliance_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_type VARCHAR(50) NOT NULL CHECK (report_type IN (
        'monthly_audit', 'quarterly_review', 'annual_report', 'breach_summary',
        'consent_summary', 'retention_review', 'access_request_summary'
    )),
    
    -- Report period
    report_period_start DATE NOT NULL,
    report_period_end DATE NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Report content
    executive_summary TEXT,
    key_metrics JSONB NOT NULL DEFAULT '{}',
    compliance_score DECIMAL(5,2),
    risk_assessment TEXT,
    recommendations TEXT,
    
    -- Malaysian regulatory context
    pdpa_compliance_status VARCHAR(30) DEFAULT 'compliant' CHECK (pdpa_compliance_status IN (
        'compliant', 'minor_issues', 'major_issues', 'non_compliant'
    )),
    moh_requirements_met BOOLEAN DEFAULT TRUE,
    regulatory_changes_noted TEXT,
    
    -- Distribution
    report_recipients TEXT[],
    confidentiality_level VARCHAR(20) DEFAULT 'internal',
    
    generated_by VARCHAR(100) NOT NULL DEFAULT current_user
);

-- Real-time compliance monitoring
CREATE TABLE compliance_violations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    violation_type VARCHAR(50) NOT NULL CHECK (violation_type IN (
        'consent_expired', 'retention_exceeded', 'unauthorized_access',
        'data_minimization_breach', 'purpose_limitation_violation'
    )),
    
    -- Violation details
    severity_level VARCHAR(20) NOT NULL CHECK (severity_level IN ('low', 'medium', 'high', 'critical')),
    violation_description TEXT NOT NULL,
    affected_table VARCHAR(100),
    affected_record_id UUID,
    affected_user_id UUID REFERENCES users(id),
    
    -- Detection
    detection_method VARCHAR(50) DEFAULT 'automated',
    detected_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    detection_rule VARCHAR(100),
    
    -- Resolution
    resolution_status VARCHAR(30) DEFAULT 'open' CHECK (resolution_status IN (
        'open', 'investigating', 'resolved', 'false_positive'
    )),
    resolution_action TEXT,
    resolved_by VARCHAR(100),
    resolved_at TIMESTAMP WITH TIME ZONE,
    
    -- Escalation
    escalation_required BOOLEAN DEFAULT FALSE,
    escalated_to VARCHAR(100),
    escalated_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE AND COMPLIANCE QUERIES
-- ============================================================================

CREATE INDEX idx_data_access_requests_user_status ON data_access_requests (user_id, request_status, created_at DESC);
CREATE INDEX idx_data_access_requests_type_date ON data_access_requests (request_type, created_at DESC);
CREATE INDEX idx_data_breach_incidents_severity ON data_breach_incidents (severity_level, incident_date DESC);
CREATE INDEX idx_data_breach_incidents_notification ON data_breach_incidents (pdpa_notification_required, incident_date) WHERE pdpa_notification_required = TRUE;
CREATE INDEX idx_retention_policies_table ON data_retention_policies (table_name, active) WHERE active = TRUE;
CREATE INDEX idx_anonymization_jobs_status ON anonymization_jobs (job_status, created_at) WHERE job_status IN ('pending', 'running');
CREATE INDEX idx_compliance_violations_severity ON compliance_violations (severity_level, detected_at DESC) WHERE resolution_status = 'open';

-- ============================================================================
-- AUDIT TRIGGERS FOR NEW TABLES
-- ============================================================================

CREATE TRIGGER audit_consent_records_trigger
    AFTER INSERT OR UPDATE OR DELETE ON consent_records
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER audit_data_access_requests_trigger
    AFTER INSERT OR UPDATE OR DELETE ON data_access_requests
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER audit_data_breach_incidents_trigger
    AFTER INSERT OR UPDATE OR DELETE ON data_breach_incidents
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();

-- ============================================================================
-- ENHANCED AUDIT TRIGGER FUNCTION FOR PDPA
-- ============================================================================

-- Enhanced audit trigger with PDPA context
CREATE OR REPLACE FUNCTION pdpa_audit_trigger()
RETURNS TRIGGER AS $$
DECLARE
    current_session_id TEXT;
    current_request_id TEXT;
    subject_id UUID;
    data_cats TEXT[];
    is_sensitive BOOLEAN := FALSE;
BEGIN
    -- Extract session and request context
    current_session_id := current_setting('app.session_id', true);
    current_request_id := current_setting('app.request_id', true);
    
    -- Determine data subject ID
    IF TG_TABLE_NAME IN ('users', 'medical_records', 'medications', 'adherence_logs') THEN
        IF TG_OP = 'DELETE' THEN
            subject_id := OLD.user_id;
        ELSE
            subject_id := NEW.user_id;
        END IF;
    END IF;
    
    -- Classify data categories
    CASE TG_TABLE_NAME
        WHEN 'users' THEN data_cats := ARRAY['personal_data', 'contact_information'];
        WHEN 'medical_records' THEN 
            data_cats := ARRAY['health_data', 'medical_history'];
            is_sensitive := TRUE;
        WHEN 'medications' THEN 
            data_cats := ARRAY['health_data', 'prescription_data'];
            is_sensitive := TRUE;
        WHEN 'adherence_logs' THEN 
            data_cats := ARRAY['health_data', 'behavioral_data'];
            is_sensitive := TRUE;
        ELSE data_cats := ARRAY['system_data'];
    END CASE;
    
    -- Insert into audit log with PDPA context
    IF TG_OP = 'DELETE' THEN
        INSERT INTO audit_log (
            table_name, operation, old_data, changed_by, changed_at,
            session_id, request_id, data_subject_id, data_categories,
            processing_purpose, legal_basis, sensitive_data_flag
        ) VALUES (
            TG_TABLE_NAME, TG_OP, row_to_json(OLD), current_user, NOW(),
            current_session_id, current_request_id, subject_id, data_cats,
            'data_processing', 'legitimate_interests', is_sensitive
        );
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO audit_log (
            table_name, operation, old_data, new_data, changed_by, changed_at,
            session_id, request_id, data_subject_id, data_categories,
            processing_purpose, legal_basis, sensitive_data_flag
        ) VALUES (
            TG_TABLE_NAME, TG_OP, row_to_json(OLD), row_to_json(NEW), current_user, NOW(),
            current_session_id, current_request_id, subject_id, data_cats,
            'data_processing', 'legitimate_interests', is_sensitive
        );
        RETURN NEW;
    ELSIF TG_OP = 'INSERT' THEN
        INSERT INTO audit_log (
            table_name, operation, new_data, changed_by, changed_at,
            session_id, request_id, data_subject_id, data_categories,
            processing_purpose, legal_basis, sensitive_data_flag
        ) VALUES (
            TG_TABLE_NAME, TG_OP, row_to_json(NEW), current_user, NOW(),
            current_session_id, current_request_id, subject_id, data_cats,
            'data_processing', 'legitimate_interests', is_sensitive
        );
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- UPDATE TIMESTAMP TRIGGERS
-- ============================================================================

CREATE TRIGGER update_data_access_requests_timestamp
    BEFORE UPDATE ON data_access_requests
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_data_breach_incidents_timestamp
    BEFORE UPDATE ON data_breach_incidents
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_data_retention_policies_timestamp
    BEFORE UPDATE ON data_retention_policies
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- ============================================================================
-- GRANTS AND PERMISSIONS
-- ============================================================================

-- Grant permissions for PDPA tables
GRANT SELECT, INSERT, UPDATE, DELETE ON 
    consent_renewals, data_access_requests, data_erasure_log, data_breach_incidents,
    breach_notifications, data_retention_policies, anonymization_jobs,
    compliance_reports, compliance_violations
    TO medimate_app;

-- Grant read-only access to compliance officer role
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'medimate_compliance') THEN
        CREATE ROLE medimate_compliance WITH LOGIN PASSWORD 'medimate_compliance_pass';
    END IF;
END
$$;

GRANT SELECT ON ALL TABLES IN SCHEMA public TO medimate_compliance;
GRANT INSERT, UPDATE ON data_access_requests, data_breach_incidents, compliance_reports TO medimate_compliance;

-- Grant audit access to DPO role
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'medimate_dpo') THEN
        CREATE ROLE medimate_dpo WITH LOGIN PASSWORD 'medimate_dpo_pass';
    END IF;
END
$$;

GRANT SELECT ON ALL TABLES IN SCHEMA public TO medimate_dpo;
GRANT ALL PRIVILEGES ON audit_log, compliance_reports, compliance_violations TO medimate_dpo;

-- ============================================================================
-- SEED DATA FOR TESTING
-- ============================================================================

-- Insert default retention policies
INSERT INTO data_retention_policies (
    policy_name, table_name, data_category, retention_period_days,
    legal_basis_for_retention, healthcare_category, moh_requirement
) VALUES 
    ('Medical Records Retention', 'medical_records', 'health_data', 2555, 'Legal obligation under Malaysian healthcare regulations', 'medical_records', TRUE),
    ('Prescription Data Retention', 'medications', 'prescription_data', 2555, 'Legal obligation for controlled substances', 'prescription_data', TRUE),
    ('Audit Log Retention', 'audit_log', 'system_data', 2555, 'PDPA compliance requirement', 'audit_logs', TRUE),
    ('User Consent Records', 'consent_records', 'consent_data', 2555, 'Legal obligation for consent proof', 'consent_records', TRUE)
ON CONFLICT (policy_name) DO NOTHING;

COMMENT ON SCHEMA public IS 'MediMate Malaysia - PDPA Compliant Healthcare Database with Audit Framework';