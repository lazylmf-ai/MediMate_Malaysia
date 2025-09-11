-- ============================================================================
-- MediMate Malaysia - FHIR Integration Database Schema
-- Migration 007: FHIR R4 Resource Storage and Malaysian Healthcare Integration
-- Date: 2025-09-10
-- ============================================================================

-- Enable extensions if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ============================================================================
-- FHIR RESOURCES TABLE
-- ============================================================================

-- Core FHIR resource storage with versioning support
CREATE TABLE fhir_resources (
    id UUID PRIMARY KEY,
    resource_type VARCHAR(100) NOT NULL,
    resource_data JSONB NOT NULL,
    version_id VARCHAR(50) NOT NULL DEFAULT '1',
    last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Malaysian healthcare facility context
    facility_code VARCHAR(50),
    facility_name VARCHAR(200),
    
    -- Resource metadata
    profile_urls TEXT[], -- FHIR profiles this resource conforms to
    security_labels TEXT[], -- Security classification
    tags TEXT[], -- Resource tags
    
    -- Search and indexing
    search_elements JSONB DEFAULT '{}', -- Extracted search parameters
    text_content TEXT, -- Full-text searchable content
    
    -- Status and lifecycle
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- Audit trail
    created_by VARCHAR(100),
    updated_by VARCHAR(100),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Resource versioning history
CREATE TABLE fhir_resource_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    resource_id UUID NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_data JSONB NOT NULL,
    version_id VARCHAR(50) NOT NULL,
    last_updated TIMESTAMP WITH TIME ZONE NOT NULL,
    
    -- Change tracking
    change_type VARCHAR(20) NOT NULL CHECK (change_type IN ('create', 'update', 'delete')),
    changed_by VARCHAR(100),
    change_reason TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- FHIR SEARCH INDICES
-- ============================================================================

-- Primary indices
CREATE INDEX idx_fhir_resources_type ON fhir_resources(resource_type);
CREATE INDEX idx_fhir_resources_last_updated ON fhir_resources(last_updated);
CREATE INDEX idx_fhir_resources_facility ON fhir_resources(facility_code);
CREATE INDEX idx_fhir_resources_active ON fhir_resources(resource_type, is_deleted) WHERE is_deleted = FALSE;

-- JSONB indices for search parameters
CREATE INDEX idx_fhir_resources_search_elements ON fhir_resources USING GIN (search_elements);
CREATE INDEX idx_fhir_resources_data ON fhir_resources USING GIN (resource_data);
CREATE INDEX idx_fhir_resources_text ON fhir_resources USING GIN (to_tsvector('english', text_content));

-- Profile and security indices
CREATE INDEX idx_fhir_resources_profiles ON fhir_resources USING GIN (profile_urls);
CREATE INDEX idx_fhir_resources_security ON fhir_resources USING GIN (security_labels);

-- History table indices
CREATE INDEX idx_fhir_history_resource ON fhir_resource_history(resource_id, version_id);
CREATE INDEX idx_fhir_history_type ON fhir_resource_history(resource_type, last_updated);

-- ============================================================================
-- MALAYSIAN HEALTHCARE INTEGRATION TABLES
-- ============================================================================

-- MOH Malaysia integration tracking
CREATE TABLE moh_integration_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id VARCHAR(100) UNIQUE NOT NULL,
    
    -- Integration details
    integration_type VARCHAR(50) NOT NULL CHECK (integration_type IN (
        'patient_sync', 'practitioner_sync', 'organization_sync', 
        'encounter_sync', 'mysejahtera_sync', 'health_data_exchange'
    )),
    
    -- Request/Response tracking
    request_data JSONB,
    response_data JSONB,
    
    -- FHIR resource references
    fhir_resource_type VARCHAR(100),
    fhir_resource_id UUID,
    
    -- MOH system details
    moh_system VARCHAR(100), -- HRMIS, MySejahtara, etc.
    facility_code VARCHAR(50),
    
    -- Status tracking
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'processing', 'completed', 'failed', 'retrying'
    )),
    error_message TEXT,
    retry_count INTEGER DEFAULT 0,
    
    -- Timestamps
    requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Hospital system integration configurations
CREATE TABLE hospital_integration_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    facility_code VARCHAR(50) UNIQUE NOT NULL,
    facility_name VARCHAR(200) NOT NULL,
    
    -- Integration settings
    endpoint_url VARCHAR(500) NOT NULL,
    auth_type VARCHAR(20) NOT NULL CHECK (auth_type IN ('oauth2', 'api_key', 'certificate')),
    auth_config JSONB NOT NULL, -- Credentials and config
    
    -- FHIR capabilities
    fhir_version VARCHAR(10) NOT NULL DEFAULT 'R4',
    supported_resources TEXT[] NOT NULL,
    message_format VARCHAR(20) NOT NULL DEFAULT 'FHIR' CHECK (message_format IN ('FHIR', 'HL7v2', 'CUSTOM')),
    
    -- Real-time settings
    enable_real_time BOOLEAN DEFAULT FALSE,
    webhook_endpoint VARCHAR(500),
    
    -- Retry configuration
    retry_config JSONB DEFAULT '{
        "max_retries": 3,
        "retry_delay": 5000,
        "backoff_multiplier": 2
    }',
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    last_sync TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- HL7 v2.x message processing
CREATE TABLE hl7v2_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Message identification
    message_control_id VARCHAR(100) NOT NULL,
    message_type VARCHAR(20) NOT NULL,
    
    -- Source and destination
    sending_application VARCHAR(100),
    sending_facility VARCHAR(100),
    receiving_application VARCHAR(100),
    receiving_facility VARCHAR(100),
    
    -- Message content
    raw_message TEXT NOT NULL,
    parsed_segments JSONB,
    
    -- Processing status
    processing_status VARCHAR(20) DEFAULT 'received' CHECK (processing_status IN (
        'received', 'parsing', 'processed', 'error', 'acknowledged'
    )),
    processing_error TEXT,
    
    -- FHIR conversion
    fhir_bundle_id UUID REFERENCES fhir_resources(id),
    conversion_status VARCHAR(20) CHECK (conversion_status IN (
        'pending', 'converted', 'failed'
    )),
    
    -- Timestamps
    message_timestamp TIMESTAMP WITH TIME ZONE,
    received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Clinical Decision Support System (CDSS) requests and responses
CREATE TABLE cdss_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Patient context
    patient_fhir_id UUID REFERENCES fhir_resources(id),
    encounter_fhir_id UUID REFERENCES fhir_resources(id),
    practitioner_fhir_id UUID REFERENCES fhir_resources(id),
    
    -- Request details
    request_type VARCHAR(50) NOT NULL CHECK (request_type IN (
        'drug_interaction', 'dosage_recommendation', 'clinical_guidelines', 
        'risk_assessment', 'halal_compliance', 'cultural_guidance'
    )),
    clinical_data JSONB NOT NULL,
    malaysian_context JSONB, -- Race, religion, halal requirements, language
    
    -- Response details
    recommendations JSONB, -- Array of CDSS recommendations
    alerts JSONB, -- Critical alerts and warnings
    contraindications JSONB, -- Drug contraindications
    cultural_guidance JSONB, -- Malaysian-specific guidance
    
    -- Processing metadata
    cdss_system VARCHAR(100), -- Which CDSS system was used
    processing_time_ms INTEGER,
    confidence_score DECIMAL(3,2), -- 0.00 to 1.00
    
    -- Status
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN (
        'pending', 'completed', 'failed'
    )),
    error_message TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Malaysian drug database integration
CREATE TABLE malaysian_drug_database (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Drug identification
    registration_number VARCHAR(50) UNIQUE NOT NULL,
    product_name VARCHAR(300) NOT NULL,
    generic_name VARCHAR(300),
    
    -- Manufacturer details
    manufacturer VARCHAR(200),
    country_of_origin VARCHAR(100),
    
    -- Drug details
    strength VARCHAR(100),
    dosage_form VARCHAR(100),
    administration_route VARCHAR(100),
    
    -- Therapeutic information
    indication TEXT,
    contraindications TEXT[],
    side_effects TEXT[],
    drug_interactions TEXT[],
    
    -- Malaysian specific
    halal_status VARCHAR(20) DEFAULT 'unknown' CHECK (halal_status IN (
        'certified_halal', 'halal_ingredients', 'non_halal', 'syubhah', 'unknown'
    )),
    halal_certification_body VARCHAR(100),
    
    -- Regulatory status
    registration_date DATE,
    expiry_date DATE,
    registration_status VARCHAR(20) DEFAULT 'active' CHECK (registration_status IN (
        'active', 'suspended', 'cancelled', 'expired'
    )),
    
    -- Pricing
    price_myr DECIMAL(10,2),
    subsidized BOOLEAN DEFAULT FALSE,
    
    -- Availability
    availability_status VARCHAR(20) DEFAULT 'available' CHECK (availability_status IN (
        'available', 'limited', 'discontinued', 'shortage'
    )),
    
    -- Metadata
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    data_source VARCHAR(100) DEFAULT 'DRA', -- Drug Registration Authority
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Laboratory integration and result management
CREATE TABLE lab_integration (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Order identification
    lab_order_id VARCHAR(100) UNIQUE NOT NULL,
    external_order_id VARCHAR(100), -- Lab system order ID
    
    -- Patient and provider context
    patient_fhir_id UUID REFERENCES fhir_resources(id),
    practitioner_fhir_id UUID REFERENCES fhir_resources(id),
    encounter_fhir_id UUID REFERENCES fhir_resources(id),
    
    -- Laboratory details
    lab_facility_code VARCHAR(50),
    lab_name VARCHAR(200),
    lab_license VARCHAR(100),
    
    -- Test details
    tests_ordered JSONB NOT NULL, -- Array of test codes and names
    clinical_indication TEXT,
    urgency VARCHAR(20) DEFAULT 'routine' CHECK (urgency IN ('routine', 'urgent', 'stat')),
    
    -- Results
    results JSONB, -- Lab results in structured format
    diagnostic_report_fhir_id UUID REFERENCES fhir_resources(id),
    
    -- Malaysian considerations
    halal_requirements JSONB DEFAULT '{
        "avoid_pork_products": false,
        "avoid_alcohol_reagents": false
    }',
    preferred_language VARCHAR(5) DEFAULT 'en',
    
    -- Status tracking
    order_status VARCHAR(20) DEFAULT 'ordered' CHECK (order_status IN (
        'ordered', 'collected', 'in_progress', 'completed', 'cancelled'
    )),
    
    -- Timestamps
    ordered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    collected_at TIMESTAMP WITH TIME ZONE,
    resulted_at TIMESTAMP WITH TIME ZONE,
    reviewed_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Radiology and PACS integration
CREATE TABLE radiology_integration (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Study identification
    study_instance_uid VARCHAR(200) UNIQUE NOT NULL,
    accession_number VARCHAR(100),
    
    -- Patient and provider context
    patient_fhir_id UUID REFERENCES fhir_resources(id),
    practitioner_fhir_id UUID REFERENCES fhir_resources(id),
    encounter_fhir_id UUID REFERENCES fhir_resources(id),
    
    -- Imaging details
    modality VARCHAR(20) NOT NULL, -- CT, MRI, X-RAY, etc.
    body_part VARCHAR(100),
    study_description TEXT,
    clinical_indication TEXT,
    
    -- PACS integration
    pacs_server VARCHAR(200),
    dicom_series JSONB, -- Array of DICOM series information
    
    -- Results
    radiology_report TEXT,
    diagnostic_report_fhir_id UUID REFERENCES fhir_resources(id),
    
    -- Malaysian radiologist information
    reporting_radiologist VARCHAR(200),
    radiologist_license VARCHAR(100),
    
    -- Status tracking
    study_status VARCHAR(20) DEFAULT 'scheduled' CHECK (study_status IN (
        'scheduled', 'in_progress', 'completed', 'cancelled'
    )),
    report_status VARCHAR(20) DEFAULT 'pending' CHECK (report_status IN (
        'pending', 'preliminary', 'final', 'amended'
    )),
    
    -- Timestamps
    scheduled_at TIMESTAMP WITH TIME ZONE,
    performed_at TIMESTAMP WITH TIME ZONE,
    reported_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- INDICES FOR INTEGRATION TABLES
-- ============================================================================

-- MOH integration indices
CREATE INDEX idx_moh_integration_transaction ON moh_integration_log(transaction_id);
CREATE INDEX idx_moh_integration_status ON moh_integration_log(status, requested_at);
CREATE INDEX idx_moh_integration_facility ON moh_integration_log(facility_code);

-- Hospital integration indices
CREATE INDEX idx_hospital_config_facility ON hospital_integration_config(facility_code);
CREATE INDEX idx_hospital_config_active ON hospital_integration_config(is_active);

-- HL7 message indices
CREATE INDEX idx_hl7v2_control_id ON hl7v2_messages(message_control_id);
CREATE INDEX idx_hl7v2_type ON hl7v2_messages(message_type, received_at);
CREATE INDEX idx_hl7v2_facility ON hl7v2_messages(sending_facility, receiving_facility);

-- CDSS indices
CREATE INDEX idx_cdss_patient ON cdss_interactions(patient_fhir_id);
CREATE INDEX idx_cdss_type ON cdss_interactions(request_type, created_at);

-- Drug database indices
CREATE INDEX idx_drug_registration ON malaysian_drug_database(registration_number);
CREATE INDEX idx_drug_name ON malaysian_drug_database USING GIN (to_tsvector('english', product_name));
CREATE INDEX idx_drug_generic ON malaysian_drug_database USING GIN (to_tsvector('english', generic_name));
CREATE INDEX idx_drug_halal ON malaysian_drug_database(halal_status);

-- Lab integration indices
CREATE INDEX idx_lab_order_id ON lab_integration(lab_order_id);
CREATE INDEX idx_lab_patient ON lab_integration(patient_fhir_id);
CREATE INDEX idx_lab_status ON lab_integration(order_status, ordered_at);

-- Radiology integration indices
CREATE INDEX idx_radiology_study_uid ON radiology_integration(study_instance_uid);
CREATE INDEX idx_radiology_patient ON radiology_integration(patient_fhir_id);
CREATE INDEX idx_radiology_modality ON radiology_integration(modality, performed_at);

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to update FHIR resource search elements
CREATE OR REPLACE FUNCTION update_fhir_search_elements()
RETURNS TRIGGER AS $$
BEGIN
    -- Extract common search parameters based on resource type
    CASE NEW.resource_type
        WHEN 'Patient' THEN
            NEW.search_elements := jsonb_build_object(
                'identifier', COALESCE(NEW.resource_data->'identifier', '[]'::jsonb),
                'name', COALESCE(NEW.resource_data->'name', '[]'::jsonb),
                'birthdate', NEW.resource_data->>'birthDate',
                'gender', NEW.resource_data->>'gender'
            );
        WHEN 'Practitioner' THEN
            NEW.search_elements := jsonb_build_object(
                'identifier', COALESCE(NEW.resource_data->'identifier', '[]'::jsonb),
                'name', COALESCE(NEW.resource_data->'name', '[]'::jsonb)
            );
        WHEN 'Organization' THEN
            NEW.search_elements := jsonb_build_object(
                'identifier', COALESCE(NEW.resource_data->'identifier', '[]'::jsonb),
                'name', NEW.resource_data->>'name',
                'type', COALESCE(NEW.resource_data->'type', '[]'::jsonb)
            );
        ELSE
            NEW.search_elements := '{}'::jsonb;
    END CASE;
    
    -- Extract text content for full-text search
    NEW.text_content := NEW.resource_data::text;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update search elements
CREATE TRIGGER trigger_update_fhir_search_elements
    BEFORE INSERT OR UPDATE ON fhir_resources
    FOR EACH ROW
    EXECUTE FUNCTION update_fhir_search_elements();

-- Function to create resource history on changes
CREATE OR REPLACE FUNCTION create_fhir_resource_history()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        INSERT INTO fhir_resource_history (
            resource_id, resource_type, resource_data, version_id, 
            last_updated, change_type, changed_by
        ) VALUES (
            NEW.id, NEW.resource_type, NEW.resource_data, NEW.version_id,
            NEW.last_updated, 'create', NEW.updated_by
        );
    ELSIF TG_OP = 'UPDATE' THEN
        INSERT INTO fhir_resource_history (
            resource_id, resource_type, resource_data, version_id,
            last_updated, change_type, changed_by
        ) VALUES (
            NEW.id, NEW.resource_type, NEW.resource_data, NEW.version_id,
            NEW.last_updated, 'update', NEW.updated_by
        );
    ELSIF TG_OP = 'DELETE' THEN
        INSERT INTO fhir_resource_history (
            resource_id, resource_type, resource_data, version_id,
            last_updated, change_type, changed_by
        ) VALUES (
            OLD.id, OLD.resource_type, OLD.resource_data, OLD.version_id,
            OLD.last_updated, 'delete', OLD.updated_by
        );
    END IF;
    
    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Trigger to maintain resource history
CREATE TRIGGER trigger_fhir_resource_history
    AFTER INSERT OR UPDATE OR DELETE ON fhir_resources
    FOR EACH ROW
    EXECUTE FUNCTION create_fhir_resource_history();

-- Function to update timestamps
CREATE OR REPLACE FUNCTION update_timestamps()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at := NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply timestamp triggers to relevant tables
CREATE TRIGGER trigger_fhir_resources_timestamps
    BEFORE UPDATE ON fhir_resources
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamps();

CREATE TRIGGER trigger_hospital_config_timestamps
    BEFORE UPDATE ON hospital_integration_config
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamps();

CREATE TRIGGER trigger_cdss_timestamps
    BEFORE UPDATE ON cdss_interactions
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamps();

CREATE TRIGGER trigger_drug_database_timestamps
    BEFORE UPDATE ON malaysian_drug_database
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamps();

CREATE TRIGGER trigger_lab_integration_timestamps
    BEFORE UPDATE ON lab_integration
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamps();

CREATE TRIGGER trigger_radiology_integration_timestamps
    BEFORE UPDATE ON radiology_integration
    FOR EACH ROW
    EXECUTE FUNCTION update_timestamps();

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Insert sample Malaysian healthcare facility configurations
INSERT INTO hospital_integration_config (
    facility_code, facility_name, endpoint_url, auth_type, auth_config,
    fhir_version, supported_resources, message_format, enable_real_time
) VALUES 
(
    'MY-MOH-HKL',
    'Hospital Kuala Lumpur',
    'https://hkl-fhir.moh.gov.my/fhir',
    'oauth2',
    '{"client_id": "medimate_hkl", "token_endpoint": "https://auth.moh.gov.my/oauth/token"}',
    'R4',
    ARRAY['Patient', 'Practitioner', 'Organization', 'Encounter', 'Observation'],
    'FHIR',
    true
),
(
    'MY-MOH-SGH',
    'Selayang Hospital',
    'https://sgh-fhir.moh.gov.my/fhir',
    'oauth2',
    '{"client_id": "medimate_sgh", "token_endpoint": "https://auth.moh.gov.my/oauth/token"}',
    'R4',
    ARRAY['Patient', 'Practitioner', 'Organization', 'Encounter', 'DiagnosticReport'],
    'FHIR',
    true
),
(
    'MY-PVT-GH',
    'Gleneagles Hospital Kuala Lumpur',
    'https://fhir.gleneagles.com.my',
    'api_key',
    '{"api_key_header": "X-API-Key"}',
    'R4',
    ARRAY['Patient', 'Practitioner', 'Encounter', 'MedicationRequest'],
    'FHIR',
    false
);

-- Insert sample Malaysian drug entries
INSERT INTO malaysian_drug_database (
    registration_number, product_name, generic_name, manufacturer,
    strength, dosage_form, administration_route, indication,
    halal_status, registration_date, price_myr
) VALUES
(
    'MAL19871234C',
    'Panadol 500mg Tablets',
    'Paracetamol',
    'GlaxoSmithKline Consumer Healthcare',
    '500mg',
    'Tablet',
    'Oral',
    'Pain relief and fever reduction',
    'certified_halal',
    '1987-01-01',
    12.50
),
(
    'MAL20201456B',
    'Insulin Human Injection',
    'Human Insulin',
    'Novo Nordisk Malaysia',
    '100 units/ml',
    'Injection',
    'Subcutaneous',
    'Treatment of diabetes mellitus',
    'halal_ingredients',
    '2020-03-15',
    85.00
);

COMMENT ON TABLE fhir_resources IS 'Core FHIR R4 resource storage with Malaysian healthcare profiles';
COMMENT ON TABLE moh_integration_log IS 'Integration tracking with Malaysian Ministry of Health systems';
COMMENT ON TABLE hospital_integration_config IS 'Configuration for Malaysian hospital system integrations';
COMMENT ON TABLE hl7v2_messages IS 'HL7 v2.x message processing for legacy hospital systems';
COMMENT ON TABLE cdss_interactions IS 'Clinical Decision Support System interactions with Malaysian context';
COMMENT ON TABLE malaysian_drug_database IS 'Malaysian Drug Registration Authority database integration';
COMMENT ON TABLE lab_integration IS 'Laboratory Information System integration';
COMMENT ON TABLE radiology_integration IS 'Radiology Information System and PACS integration';