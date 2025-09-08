-- ============================================================================
-- MediMate Malaysia - Healthcare Database Schema Extension Rollback
-- Rollback Migration 001: Remove extended healthcare tables
-- Date: 2025-09-08
-- ============================================================================

-- Log rollback initiation
INSERT INTO audit_log (table_name, operation, new_data, changed_by, compliance_reason) VALUES
('healthcare_extension_rollback', 'DELETE', 
 '{"action": "healthcare_extension_rollback_initiated", "reason": "rollback_migration_001"}', 
 'system', 'database_maintenance_rollback');

-- ============================================================================
-- DROP INDEXES (IN REVERSE ORDER)
-- ============================================================================

-- Insurance coverage indexes
DROP INDEX IF EXISTS idx_insurance_expiry;
DROP INDEX IF EXISTS idx_insurance_provider_type;
DROP INDEX IF EXISTS idx_user_insurance_active;

-- Appointment indexes
DROP INDEX IF EXISTS idx_appointments_follow_up;
DROP INDEX IF EXISTS idx_appointments_cultural;
DROP INDEX IF EXISTS idx_appointments_status_date;
DROP INDEX IF EXISTS idx_appointments_provider_date;
DROP INDEX IF EXISTS idx_appointments_user_date;

-- Vaccination records indexes
DROP INDEX IF EXISTS idx_vaccination_program;
DROP INDEX IF EXISTS idx_vaccination_due_dates;
DROP INDEX IF EXISTS idx_vaccination_type_date;
DROP INDEX IF EXISTS idx_vaccination_user_date;

-- Emergency contacts indexes
DROP INDEX IF EXISTS idx_emergency_contacts_proximity;
DROP INDEX IF EXISTS idx_emergency_contacts_medical_authority;
DROP INDEX IF EXISTS idx_emergency_contacts_user_priority;

-- Medical conditions indexes
DROP INDEX IF EXISTS idx_medical_conditions_monitoring;
DROP INDEX IF EXISTS idx_medical_conditions_cultural;
DROP INDEX IF EXISTS idx_medical_conditions_category_status;
DROP INDEX IF EXISTS idx_medical_conditions_user_active;

-- Medical records indexes
DROP INDEX IF EXISTS idx_medical_records_cultural;
DROP INDEX IF EXISTS idx_medical_records_diagnosis;
DROP INDEX IF EXISTS idx_medical_records_type_status;
DROP INDEX IF EXISTS idx_medical_records_provider_date;
DROP INDEX IF EXISTS idx_medical_records_user_date;

-- ============================================================================
-- DROP TRIGGERS (IN REVERSE ORDER)
-- ============================================================================

DROP TRIGGER IF EXISTS update_appointments_timestamp ON appointments;
DROP TRIGGER IF EXISTS update_medical_conditions_timestamp ON medical_conditions;
DROP TRIGGER IF EXISTS update_medical_records_timestamp ON medical_records;

DROP TRIGGER IF EXISTS audit_vaccination_records_trigger ON vaccination_records;
DROP TRIGGER IF EXISTS audit_medical_conditions_trigger ON medical_conditions;
DROP TRIGGER IF EXISTS audit_medical_records_trigger ON medical_records;

-- ============================================================================
-- REVOKE PERMISSIONS
-- ============================================================================

-- Revoke permissions from healthcare provider role
REVOKE INSERT, UPDATE ON appointments FROM medimate_healthcare;
REVOKE SELECT ON medical_records, medical_conditions, emergency_contacts, 
      vaccination_records, appointments FROM medimate_healthcare;

-- Revoke permissions from analytics role
REVOKE SELECT ON medical_records, medical_conditions, vaccination_records, 
      appointments, user_insurance_coverage FROM medimate_analytics;

-- Revoke permissions from application role
REVOKE SELECT, INSERT, UPDATE, DELETE ON medical_records, medical_conditions, medical_documents, 
      emergency_contacts, vaccination_records, appointment_types, appointments,
      insurance_providers, user_insurance_coverage FROM medimate_app;

-- ============================================================================
-- DROP TABLES (IN REVERSE ORDER OF DEPENDENCIES)
-- ============================================================================

-- Drop insurance and payment tables
DROP TABLE IF EXISTS user_insurance_coverage CASCADE;
DROP TABLE IF EXISTS insurance_providers CASCADE;

-- Drop appointment system tables
DROP TABLE IF EXISTS appointments CASCADE;
DROP TABLE IF EXISTS appointment_types CASCADE;

-- Drop vaccination records
DROP TABLE IF EXISTS vaccination_records CASCADE;

-- Drop emergency contacts
DROP TABLE IF EXISTS emergency_contacts CASCADE;

-- Drop medical documents and records
DROP TABLE IF EXISTS medical_documents CASCADE;
DROP TABLE IF EXISTS medical_records CASCADE;
DROP TABLE IF EXISTS medical_conditions CASCADE;

-- ============================================================================
-- LOG ROLLBACK COMPLETION
-- ============================================================================

INSERT INTO audit_log (table_name, operation, new_data, changed_by, compliance_reason) VALUES
('healthcare_extension_rollback', 'DELETE', 
 '{"action": "healthcare_extension_rollback_completed", "tables_removed": [
   "user_insurance_coverage", "insurance_providers", "appointments", "appointment_types",
   "vaccination_records", "emergency_contacts", "medical_documents", "medical_records", 
   "medical_conditions"
 ]}', 
 'system', 'database_maintenance_rollback_completed');

-- Display rollback summary
DO $$
BEGIN
    RAISE NOTICE 'MediMate Malaysia healthcare extension rollback completed:';
    RAISE NOTICE '  - All extended healthcare tables removed';
    RAISE NOTICE '  - All related indexes dropped';
    RAISE NOTICE '  - All related triggers removed';
    RAISE NOTICE '  - All related permissions revoked';
    RAISE NOTICE '  - Database returned to pre-extension state';
    RAISE NOTICE '  - Original MediMate core tables preserved';
    RAISE NOTICE '  - PDPA audit trail maintained';
END $$;