-- ============================================================================
-- MediMate Malaysia - FHIR Integration Rollback
-- Migration 007 Rollback: Remove FHIR R4 and Healthcare Integration Tables
-- Date: 2025-09-10
-- ============================================================================

-- Drop triggers first (to avoid dependency issues)
DROP TRIGGER IF EXISTS trigger_radiology_integration_timestamps ON radiology_integration;
DROP TRIGGER IF EXISTS trigger_lab_integration_timestamps ON lab_integration;
DROP TRIGGER IF EXISTS trigger_drug_database_timestamps ON malaysian_drug_database;
DROP TRIGGER IF EXISTS trigger_cdss_timestamps ON cdss_interactions;
DROP TRIGGER IF EXISTS trigger_hospital_config_timestamps ON hospital_integration_config;
DROP TRIGGER IF EXISTS trigger_fhir_resources_timestamps ON fhir_resources;
DROP TRIGGER IF EXISTS trigger_fhir_resource_history ON fhir_resources;
DROP TRIGGER IF EXISTS trigger_update_fhir_search_elements ON fhir_resources;

-- Drop functions
DROP FUNCTION IF EXISTS update_timestamps();
DROP FUNCTION IF EXISTS create_fhir_resource_history();
DROP FUNCTION IF EXISTS update_fhir_search_elements();

-- Drop integration tables
DROP TABLE IF EXISTS radiology_integration;
DROP TABLE IF EXISTS lab_integration;
DROP TABLE IF EXISTS malaysian_drug_database;
DROP TABLE IF EXISTS cdss_interactions;
DROP TABLE IF EXISTS hl7v2_messages;
DROP TABLE IF EXISTS hospital_integration_config;
DROP TABLE IF EXISTS moh_integration_log;

-- Drop FHIR tables
DROP TABLE IF EXISTS fhir_resource_history;
DROP TABLE IF EXISTS fhir_resources;

-- Note: Extensions are left intact as they may be used by other parts of the system
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
-- CREATE EXTENSION IF NOT EXISTS "pg_trgm";