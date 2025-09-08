-- ============================================================================
-- PDPA Compliance & Audit Framework Rollback Migration 002
-- Rollback Malaysian Personal Data Protection Act 2010 Compliance Implementation
-- Date: 2025-09-08
-- ============================================================================

-- Audit rollback tracking
INSERT INTO audit_log (table_name, operation, new_data, changed_by, compliance_reason) VALUES
('migration_rollback', 'ROLLBACK', '{"migration": "002_pdpa_compliance_audit", "timestamp": "' || NOW() || '"}', current_user, 'Migration rollback - removing PDPA compliance tables');

-- ============================================================================
-- DROP TRIGGERS
-- ============================================================================

DROP TRIGGER IF EXISTS update_data_retention_policies_timestamp ON data_retention_policies;
DROP TRIGGER IF EXISTS update_data_breach_incidents_timestamp ON data_breach_incidents;
DROP TRIGGER IF EXISTS update_data_access_requests_timestamp ON data_access_requests;

DROP TRIGGER IF EXISTS audit_data_breach_incidents_trigger ON data_breach_incidents;
DROP TRIGGER IF EXISTS audit_data_access_requests_trigger ON data_access_requests;
DROP TRIGGER IF EXISTS audit_consent_records_trigger ON consent_records;

-- ============================================================================
-- DROP INDEXES
-- ============================================================================

DROP INDEX IF EXISTS idx_compliance_violations_severity;
DROP INDEX IF EXISTS idx_anonymization_jobs_status;
DROP INDEX IF EXISTS idx_retention_policies_table;
DROP INDEX IF EXISTS idx_data_breach_incidents_notification;
DROP INDEX IF EXISTS idx_data_breach_incidents_severity;
DROP INDEX IF EXISTS idx_data_access_requests_type_date;
DROP INDEX IF EXISTS idx_data_access_requests_user_status;

DROP INDEX IF EXISTS idx_audit_log_breach_risk;
DROP INDEX IF EXISTS idx_audit_log_sensitive;
DROP INDEX IF EXISTS idx_audit_log_retention;
DROP INDEX IF EXISTS idx_audit_log_data_subject;

-- ============================================================================
-- DROP TABLES IN REVERSE DEPENDENCY ORDER
-- ============================================================================

DROP TABLE IF EXISTS compliance_violations;
DROP TABLE IF EXISTS compliance_reports;
DROP TABLE IF EXISTS anonymization_jobs;
DROP TABLE IF EXISTS data_retention_policies;
DROP TABLE IF EXISTS breach_notifications;
DROP TABLE IF EXISTS data_breach_incidents;
DROP TABLE IF EXISTS data_erasure_log;
DROP TABLE IF EXISTS data_access_requests;
DROP TABLE IF EXISTS consent_renewals;

-- ============================================================================
-- DROP SEQUENCES
-- ============================================================================

DROP SEQUENCE IF EXISTS breach_sequence;

-- ============================================================================
-- REMOVE ENHANCED COLUMNS FROM EXISTING TABLES
-- ============================================================================

-- Remove PDPA-specific columns from audit_log
ALTER TABLE audit_log DROP COLUMN IF EXISTS session_id;
ALTER TABLE audit_log DROP COLUMN IF EXISTS request_id;
ALTER TABLE audit_log DROP COLUMN IF EXISTS data_subject_id;
ALTER TABLE audit_log DROP COLUMN IF EXISTS data_categories;
ALTER TABLE audit_log DROP COLUMN IF EXISTS processing_purpose;
ALTER TABLE audit_log DROP COLUMN IF EXISTS legal_basis;
ALTER TABLE audit_log DROP COLUMN IF EXISTS retention_period_days;
ALTER TABLE audit_log DROP COLUMN IF EXISTS anonymization_date;
ALTER TABLE audit_log DROP COLUMN IF EXISTS geographic_location;
ALTER TABLE audit_log DROP COLUMN IF EXISTS sensitive_data_flag;
ALTER TABLE audit_log DROP COLUMN IF EXISTS cross_border_transfer;
ALTER TABLE audit_log DROP COLUMN IF EXISTS breach_risk_level;

-- Remove enhanced columns from consent_records
ALTER TABLE consent_records DROP COLUMN IF EXISTS consent_method;
ALTER TABLE consent_records DROP COLUMN IF EXISTS data_retention_consent;
ALTER TABLE consent_records DROP COLUMN IF EXISTS marketing_consent;
ALTER TABLE consent_records DROP COLUMN IF EXISTS third_party_sharing_consent;
ALTER TABLE consent_records DROP COLUMN IF EXISTS analytics_consent;
ALTER TABLE consent_records DROP COLUMN IF EXISTS ip_address;
ALTER TABLE consent_records DROP COLUMN IF EXISTS browser_info;
ALTER TABLE consent_records DROP COLUMN IF EXISTS consent_evidence;
ALTER TABLE consent_records DROP COLUMN IF EXISTS renewal_required;
ALTER TABLE consent_records DROP COLUMN IF EXISTS renewal_date;
ALTER TABLE consent_records DROP COLUMN IF EXISTS processor_consent;

-- ============================================================================
-- DROP ENHANCED FUNCTIONS
-- ============================================================================

DROP FUNCTION IF EXISTS pdpa_audit_trigger();

-- ============================================================================
-- DROP ROLES
-- ============================================================================

-- Note: Roles are not dropped automatically to prevent accidental data access issues
-- Uncomment the following lines if you want to remove the roles completely:
-- REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM medimate_dpo;
-- REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA public FROM medimate_compliance;
-- DROP ROLE IF EXISTS medimate_dpo;
-- DROP ROLE IF EXISTS medimate_compliance;

-- Instead, we revoke the specific permissions
REVOKE ALL PRIVILEGES ON audit_log FROM medimate_dpo;
REVOKE ALL PRIVILEGES ON compliance_reports FROM medimate_dpo;
REVOKE ALL PRIVILEGES ON compliance_violations FROM medimate_dpo;

-- ============================================================================
-- RESTORE ORIGINAL TRIGGERS IF NEEDED
-- ============================================================================

-- Recreate original audit triggers if they were replaced
-- This assumes the original audit_trigger function still exists
DROP TRIGGER IF EXISTS audit_medical_records_trigger ON medical_records;
DROP TRIGGER IF EXISTS audit_medical_conditions_trigger ON medical_conditions;
DROP TRIGGER IF EXISTS audit_vaccination_records_trigger ON vaccination_records;

CREATE TRIGGER audit_medical_records_trigger
    AFTER INSERT OR UPDATE OR DELETE ON medical_records
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER audit_medical_conditions_trigger
    AFTER INSERT OR UPDATE OR DELETE ON medical_conditions
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();

CREATE TRIGGER audit_vaccination_records_trigger
    AFTER INSERT OR UPDATE OR DELETE ON vaccination_records
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();

-- ============================================================================
-- ROLLBACK COMPLETION TRACKING
-- ============================================================================

INSERT INTO audit_log (table_name, operation, new_data, changed_by, compliance_reason) VALUES
('migration_rollback', 'COMPLETE', '{"migration": "002_pdpa_compliance_audit", "status": "rolled_back", "timestamp": "' || NOW() || '"}', current_user, 'Migration rollback completed successfully');

-- Display rollback summary
DO $$
BEGIN
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'PDPA Compliance Migration Rollback Completed';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'Rollback Summary:';
    RAISE NOTICE '  - PDPA compliance tables removed';
    RAISE NOTICE '  - Enhanced audit columns removed';
    RAISE NOTICE '  - PDPA-specific indexes dropped';
    RAISE NOTICE '  - PDPA audit triggers removed';
    RAISE NOTICE '  - Original audit triggers restored';
    RAISE NOTICE '  - Compliance roles permissions revoked';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'Database restored to pre-PDPA compliance state';
    RAISE NOTICE 'Note: Role accounts still exist but permissions have been revoked';
    RAISE NOTICE '============================================================================';
END;
$$;