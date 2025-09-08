-- ============================================================================
-- MediMate Malaysia - Healthcare Database Schema Extension
-- Migration 001: Enhanced Healthcare Tables with Malaysian Integration
-- Date: 2025-09-08
-- ============================================================================

-- ============================================================================
-- MEDICAL RECORDS AND HEALTH HISTORY
-- ============================================================================

-- Comprehensive medical records with Malaysian healthcare context
CREATE TABLE medical_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider_id UUID REFERENCES healthcare_providers(id),
    record_type VARCHAR(50) NOT NULL CHECK (record_type IN (
        'consultation', 'diagnosis', 'procedure', 'lab_result', 
        'imaging', 'prescription', 'discharge_summary', 'referral'
    )),
    
    -- Medical identification
    visit_date DATE NOT NULL,
    visit_time TIME,
    appointment_id UUID, -- Will reference appointments table
    
    -- Medical content
    chief_complaint TEXT,
    history_of_present_illness TEXT,
    past_medical_history TEXT,
    family_history TEXT,
    social_history TEXT,
    
    -- Physical examination
    vital_signs JSONB DEFAULT '{}', -- BP, HR, Temperature, etc.
    physical_examination TEXT,
    
    -- Assessment and plan
    clinical_assessment TEXT,
    diagnosis_codes TEXT[], -- ICD-10 codes
    treatment_plan TEXT,
    follow_up_instructions TEXT,
    
    -- Malaysian cultural considerations
    cultural_factors JSONB DEFAULT '{
        "language_used": "en",
        "cultural_sensitivities": [],
        "religious_considerations": [],
        "dietary_restrictions_noted": []
    }',
    
    -- Document references
    documents JSONB DEFAULT '[]', -- Array of document IDs/URLs
    
    -- Provider information
    attending_physician VARCHAR(200),
    physician_license VARCHAR(50),
    facility_name VARCHAR(200),
    
    -- Confidentiality and access
    confidentiality_level VARCHAR(20) DEFAULT 'standard' CHECK (
        confidentiality_level IN ('standard', 'sensitive', 'restricted')
    ),
    access_permissions JSONB DEFAULT '{
        "patient": true,
        "family": false,
        "emergency_contacts": false,
        "healthcare_providers": true
    }',
    
    -- Status and workflow
    record_status VARCHAR(20) DEFAULT 'active' CHECK (
        record_status IN ('draft', 'active', 'amended', 'archived')
    ),
    reviewed_by VARCHAR(200),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Medical conditions and chronic disease management
CREATE TABLE medical_conditions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Condition identification
    condition_name VARCHAR(200) NOT NULL,
    condition_code VARCHAR(20), -- ICD-10 or SNOMED code
    condition_category VARCHAR(100), -- diabetes, hypertension, asthma, etc.
    
    -- Malaysian terminology
    condition_name_ms VARCHAR(200), -- Bahasa Malaysia translation
    condition_name_zh VARCHAR(200), -- Chinese translation
    condition_name_ta VARCHAR(200), -- Tamil translation
    
    -- Medical details
    severity VARCHAR(20) CHECK (severity IN ('mild', 'moderate', 'severe', 'critical')),
    onset_date DATE,
    diagnosis_date DATE NOT NULL,
    diagnosed_by VARCHAR(200),
    provider_id UUID REFERENCES healthcare_providers(id),
    
    -- Management and treatment
    current_status VARCHAR(20) DEFAULT 'active' CHECK (
        current_status IN ('active', 'resolved', 'chronic', 'remission', 'relapsed')
    ),
    treatment_approach TEXT,
    lifestyle_modifications TEXT,
    
    -- Cultural and lifestyle factors
    cultural_impact JSONB DEFAULT '{
        "dietary_restrictions": [],
        "religious_considerations": [],
        "cultural_treatments_used": [],
        "family_support_available": true
    }',
    
    -- Monitoring and metrics
    monitoring_frequency VARCHAR(50), -- daily, weekly, monthly, quarterly
    key_metrics JSONB DEFAULT '{}', -- Blood sugar, BP readings, etc.
    target_values JSONB DEFAULT '{}',
    
    -- Emergency information
    emergency_protocols TEXT,
    critical_thresholds JSONB DEFAULT '{}',
    
    -- Family history relevance
    hereditary_factor BOOLEAN DEFAULT FALSE,
    family_history_notes TEXT,
    
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Medical documents and file attachments
CREATE TABLE medical_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    medical_record_id UUID REFERENCES medical_records(id) ON DELETE SET NULL,
    provider_id UUID REFERENCES healthcare_providers(id),
    
    -- Document identification
    document_name VARCHAR(200) NOT NULL,
    document_type VARCHAR(50) NOT NULL CHECK (document_type IN (
        'prescription', 'lab_report', 'xray', 'mri', 'ct_scan', 
        'discharge_summary', 'referral_letter', 'insurance_form',
        'consent_form', 'medical_certificate', 'vaccination_record'
    )),
    document_subtype VARCHAR(100),
    
    -- File information
    file_path TEXT NOT NULL,
    file_name VARCHAR(255),
    file_size INTEGER,
    mime_type VARCHAR(100),
    file_hash VARCHAR(64), -- SHA-256 for integrity
    
    -- Document content metadata
    document_date DATE,
    issuer_name VARCHAR(200),
    issuer_license VARCHAR(50),
    
    -- OCR and searchable content
    extracted_text TEXT,
    searchable_keywords TEXT[],
    
    -- Malaysian compliance
    confidentiality_level VARCHAR(20) DEFAULT 'standard' CHECK (
        confidentiality_level IN ('public', 'standard', 'sensitive', 'restricted')
    ),
    retention_period_years INTEGER DEFAULT 7, -- PDPA requirement
    auto_delete_date DATE,
    
    -- Access control
    access_permissions JSONB DEFAULT '{
        "patient": true,
        "family": false,
        "emergency_contacts": false,
        "healthcare_providers": true,
        "insurance": false
    }',
    
    -- Version control
    version INTEGER DEFAULT 1,
    parent_document_id UUID REFERENCES medical_documents(id),
    
    -- Status
    document_status VARCHAR(20) DEFAULT 'active' CHECK (
        document_status IN ('active', 'superseded', 'archived', 'deleted')
    ),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Emergency contacts with healthcare context
CREATE TABLE emergency_contacts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Contact identification
    full_name VARCHAR(200) NOT NULL,
    relationship VARCHAR(50) NOT NULL, -- spouse, parent, child, sibling, friend, etc.
    contact_priority INTEGER NOT NULL DEFAULT 1, -- 1=primary, 2=secondary, etc.
    
    -- Contact information
    phone_primary VARCHAR(20) NOT NULL,
    phone_secondary VARCHAR(20),
    email VARCHAR(255),
    address TEXT,
    
    -- Malaysian cultural context
    preferred_language VARCHAR(5) DEFAULT 'ms',
    cultural_notes TEXT, -- Religious considerations, cultural preferences
    
    -- Medical context
    medical_decision_authority BOOLEAN DEFAULT FALSE, -- Can make medical decisions
    healthcare_proxy BOOLEAN DEFAULT FALSE, -- Designated healthcare proxy
    medical_knowledge_level VARCHAR(20) DEFAULT 'basic' CHECK (
        medical_knowledge_level IN ('none', 'basic', 'intermediate', 'advanced', 'medical_professional')
    ),
    
    -- Availability and accessibility
    availability_hours JSONB DEFAULT '{
        "weekdays": "00:00-23:59",
        "weekends": "00:00-23:59",
        "holidays": "00:00-23:59"
    }',
    location_proximity VARCHAR(20) DEFAULT 'local' CHECK (
        location_proximity IN ('same_household', 'local', 'distant', 'overseas')
    ),
    
    -- Emergency protocols
    notification_methods JSONB DEFAULT '["phone", "sms"]', -- phone, sms, email, app
    critical_conditions_only BOOLEAN DEFAULT FALSE, -- Only notify for critical conditions
    conditions_to_notify TEXT[], -- Specific conditions to notify about
    
    -- Legal and consent
    consent_to_contact BOOLEAN DEFAULT TRUE,
    consent_date TIMESTAMP WITH TIME ZONE,
    legal_guardian BOOLEAN DEFAULT FALSE,
    
    -- Verification
    verified BOOLEAN DEFAULT FALSE,
    verification_method VARCHAR(50),
    verified_at TIMESTAMP WITH TIME ZONE,
    
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- VACCINATION AND IMMUNIZATION RECORDS
-- ============================================================================

-- Vaccination records with Malaysian immunization program
CREATE TABLE vaccination_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider_id UUID REFERENCES healthcare_providers(id),
    
    -- Vaccine identification
    vaccine_name VARCHAR(200) NOT NULL,
    vaccine_type VARCHAR(100) NOT NULL, -- COVID-19, Hepatitis B, MMR, etc.
    manufacturer VARCHAR(100),
    batch_number VARCHAR(50),
    lot_number VARCHAR(50),
    
    -- Malaysian vaccine program integration
    malaysia_vaccine_code VARCHAR(20), -- MOH vaccine coding
    immunization_program VARCHAR(100), -- National Immunization Program, etc.
    vaccine_source VARCHAR(50) CHECK (vaccine_source IN (
        'government', 'private', 'employer', 'travel_clinic', 'international'
    )),
    
    -- Administration details
    administration_date DATE NOT NULL,
    dose_number INTEGER NOT NULL DEFAULT 1, -- 1st dose, 2nd dose, booster
    total_doses_required INTEGER,
    dosage_amount VARCHAR(20),
    administration_route VARCHAR(50), -- intramuscular, oral, nasal, subcutaneous
    injection_site VARCHAR(50),
    
    -- Healthcare provider details
    administered_by VARCHAR(200),
    administrator_license VARCHAR(50),
    clinic_name VARCHAR(200),
    
    -- Medical considerations
    pre_vaccination_health_check BOOLEAN DEFAULT FALSE,
    contraindications_checked BOOLEAN DEFAULT TRUE,
    adverse_reactions TEXT,
    reaction_severity VARCHAR(20) CHECK (
        reaction_severity IN ('none', 'mild', 'moderate', 'severe')
    ),
    
    -- Malaysian cultural considerations
    halal_certified BOOLEAN DEFAULT FALSE,
    religious_exemption BOOLEAN DEFAULT FALSE,
    cultural_concerns TEXT,
    
    -- Next dose scheduling
    next_due_date DATE,
    reminder_sent BOOLEAN DEFAULT FALSE,
    
    -- Compliance and certification
    certificate_number VARCHAR(100),
    digital_certificate_id VARCHAR(100), -- For digital health certificates
    who_recognized BOOLEAN DEFAULT FALSE, -- WHO-recognized vaccine
    travel_validity BOOLEAN DEFAULT FALSE, -- Valid for international travel
    
    -- Status and verification
    vaccination_status VARCHAR(20) DEFAULT 'completed' CHECK (
        vaccination_status IN ('scheduled', 'completed', 'overdue', 'exempted', 'contraindicated')
    ),
    verified BOOLEAN DEFAULT FALSE,
    verification_source VARCHAR(100),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- APPOINTMENT SCHEDULING SYSTEM
-- ============================================================================

-- Appointment types with Malaysian healthcare context
CREATE TABLE appointment_types (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type_name VARCHAR(100) NOT NULL,
    type_code VARCHAR(20) UNIQUE NOT NULL,
    
    -- Malaysian terminology
    type_name_ms VARCHAR(100),
    type_name_zh VARCHAR(100),
    type_name_ta VARCHAR(100),
    
    -- Appointment characteristics
    category VARCHAR(50) NOT NULL CHECK (category IN (
        'consultation', 'follow_up', 'screening', 'procedure',
        'vaccination', 'lab_test', 'imaging', 'emergency'
    )),
    typical_duration INTEGER NOT NULL, -- minutes
    
    -- Scheduling rules
    advance_booking_days INTEGER DEFAULT 7,
    same_day_booking BOOLEAN DEFAULT FALSE,
    requires_referral BOOLEAN DEFAULT FALSE,
    requires_fasting BOOLEAN DEFAULT FALSE,
    requires_preparation BOOLEAN DEFAULT FALSE,
    preparation_instructions TEXT,
    
    -- Malaysian cultural considerations
    cultural_scheduling_rules JSONB DEFAULT '{
        "avoid_prayer_times": false,
        "respect_fasting_periods": false,
        "cultural_holidays_affect": false
    }',
    
    -- Provider requirements
    provider_types TEXT[] DEFAULT '{}', -- Which provider types can offer this
    special_qualifications TEXT[],
    equipment_required TEXT[],
    
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Appointments with Malaysian calendar integration
CREATE TABLE appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES healthcare_providers(id) ON DELETE CASCADE,
    appointment_type_id UUID NOT NULL REFERENCES appointment_types(id),
    
    -- Scheduling details
    appointment_date DATE NOT NULL,
    appointment_time TIME NOT NULL,
    duration_minutes INTEGER NOT NULL DEFAULT 30,
    end_time TIME GENERATED ALWAYS AS (appointment_time + (duration_minutes || ' minutes')::INTERVAL) STORED,
    
    -- Appointment management
    appointment_status VARCHAR(20) DEFAULT 'scheduled' CHECK (appointment_status IN (
        'scheduled', 'confirmed', 'rescheduled', 'cancelled', 'no_show',
        'completed', 'in_progress', 'waiting'
    )),
    booking_source VARCHAR(20) DEFAULT 'manual' CHECK (booking_source IN (
        'manual', 'online', 'phone', 'walk_in', 'referral', 'system'
    )),
    
    -- Patient information
    chief_complaint TEXT,
    appointment_notes TEXT,
    special_requirements TEXT,
    
    -- Cultural scheduling considerations
    cultural_adjustments JSONB DEFAULT '{
        "prayer_time_avoidance": false,
        "fasting_consideration": false,
        "cultural_interpreter_needed": false,
        "gender_preference": null
    }',
    
    -- Reminder and notification
    reminders_sent INTEGER DEFAULT 0,
    last_reminder_sent TIMESTAMP WITH TIME ZONE,
    notification_preferences JSONB DEFAULT '["sms", "email"]',
    
    -- Healthcare provider details
    assigned_physician VARCHAR(200),
    physician_license VARCHAR(50),
    room_number VARCHAR(20),
    clinic_location VARCHAR(200),
    
    -- Follow-up information
    follow_up_required BOOLEAN DEFAULT FALSE,
    follow_up_interval_days INTEGER,
    follow_up_notes TEXT,
    
    -- Insurance and payment
    insurance_covered BOOLEAN DEFAULT FALSE,
    estimated_cost DECIMAL(10,2),
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN (
        'pending', 'paid', 'partially_paid', 'insurance_claimed', 'waived'
    )),
    
    -- Cancellation and rescheduling
    cancellation_reason TEXT,
    cancelled_by VARCHAR(100), -- patient, provider, system
    cancelled_at TIMESTAMP WITH TIME ZONE,
    reschedule_reason TEXT,
    original_appointment_id UUID REFERENCES appointments(id),
    
    -- Outcome tracking
    appointment_outcome VARCHAR(50) CHECK (appointment_outcome IN (
        'completed_successful', 'completed_with_issues', 'partial_completion',
        'cancelled_by_patient', 'cancelled_by_provider', 'no_show', 'emergency'
    )),
    outcome_notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- MALAYSIAN INSURANCE AND PAYMENT SYSTEMS
-- ============================================================================

-- Malaysian insurance providers and schemes
CREATE TABLE insurance_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_name VARCHAR(200) NOT NULL,
    provider_type VARCHAR(50) NOT NULL CHECK (provider_type IN (
        'government', 'private', 'corporate', 'international', 'takaful'
    )),
    
    -- Malaysian insurance details
    company_registration VARCHAR(50),
    license_number VARCHAR(50),
    regulator VARCHAR(50) DEFAULT 'Bank Negara Malaysia',
    
    -- Contact information
    contact_info JSONB DEFAULT '{}',
    website VARCHAR(255),
    customer_service_phone VARCHAR(20),
    
    -- Coverage and services
    coverage_types TEXT[] DEFAULT '{}', -- medical, dental, optical, pharmacy
    network_hospitals TEXT[],
    direct_billing BOOLEAN DEFAULT FALSE,
    cashless_treatment BOOLEAN DEFAULT FALSE,
    
    -- Malaysian cultural considerations
    shariah_compliant BOOLEAN DEFAULT FALSE, -- For Takaful products
    cultural_services JSONB DEFAULT '{
        "multilingual_support": [],
        "cultural_liaisons": false,
        "religious_dietary_coverage": false
    }',
    
    -- Integration capabilities
    api_endpoint VARCHAR(500),
    real_time_eligibility BOOLEAN DEFAULT FALSE,
    claim_submission_method VARCHAR(50),
    
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User insurance coverage
CREATE TABLE user_insurance_coverage (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    insurance_provider_id UUID NOT NULL REFERENCES insurance_providers(id),
    
    -- Policy details
    policy_number VARCHAR(100) NOT NULL,
    group_number VARCHAR(50),
    member_id VARCHAR(100),
    
    -- Coverage period
    effective_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    coverage_status VARCHAR(20) DEFAULT 'active' CHECK (coverage_status IN (
        'active', 'expired', 'suspended', 'cancelled', 'pending'
    )),
    
    -- Coverage details
    coverage_type VARCHAR(50) NOT NULL, -- primary, secondary, supplemental
    annual_limit DECIMAL(12,2),
    annual_utilized DECIMAL(12,2) DEFAULT 0,
    deductible_amount DECIMAL(10,2) DEFAULT 0,
    co_payment_percentage DECIMAL(5,2) DEFAULT 0,
    
    -- Malaysian specific coverage
    government_scheme BOOLEAN DEFAULT FALSE, -- 1Malaysia, MySejahtera
    employer_coverage BOOLEAN DEFAULT FALSE,
    individual_policy BOOLEAN DEFAULT FALSE,
    
    -- Dependent information
    is_dependent BOOLEAN DEFAULT FALSE,
    primary_holder_id UUID REFERENCES users(id),
    relationship_to_primary VARCHAR(50),
    
    -- Pre-authorization and referrals
    requires_pre_auth BOOLEAN DEFAULT FALSE,
    referral_required BOOLEAN DEFAULT FALSE,
    preferred_providers TEXT[],
    
    -- Cultural considerations
    cultural_benefits JSONB DEFAULT '{
        "traditional_medicine_covered": false,
        "halal_pharmaceuticals_preferred": false,
        "cultural_interpreter_coverage": false
    }',
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(user_id, insurance_provider_id, policy_number)
);

-- ============================================================================
-- ENHANCED INDEXES FOR MALAYSIAN HEALTHCARE PATTERNS
-- ============================================================================

-- Medical records indexes
CREATE INDEX idx_medical_records_user_date ON medical_records (user_id, visit_date DESC);
CREATE INDEX idx_medical_records_provider_date ON medical_records (provider_id, visit_date DESC);
CREATE INDEX idx_medical_records_type_status ON medical_records (record_type, record_status);
CREATE INDEX idx_medical_records_diagnosis ON medical_records USING GIN (diagnosis_codes);
CREATE INDEX idx_medical_records_cultural ON medical_records USING GIN (cultural_factors);

-- Medical conditions indexes
CREATE INDEX idx_medical_conditions_user_active ON medical_conditions (user_id, active) WHERE active = TRUE;
CREATE INDEX idx_medical_conditions_category_status ON medical_conditions (condition_category, current_status);
CREATE INDEX idx_medical_conditions_cultural ON medical_conditions USING GIN (cultural_impact);
CREATE INDEX idx_medical_conditions_monitoring ON medical_conditions (monitoring_frequency, current_status);

-- Emergency contacts indexes
CREATE INDEX idx_emergency_contacts_user_priority ON emergency_contacts (user_id, contact_priority) WHERE active = TRUE;
CREATE INDEX idx_emergency_contacts_medical_authority ON emergency_contacts (user_id, medical_decision_authority) WHERE medical_decision_authority = TRUE;
CREATE INDEX idx_emergency_contacts_proximity ON emergency_contacts (user_id, location_proximity);

-- Vaccination records indexes
CREATE INDEX idx_vaccination_user_date ON vaccination_records (user_id, administration_date DESC);
CREATE INDEX idx_vaccination_type_date ON vaccination_records (vaccine_type, administration_date DESC);
CREATE INDEX idx_vaccination_due_dates ON vaccination_records (next_due_date) WHERE next_due_date IS NOT NULL;
CREATE INDEX idx_vaccination_program ON vaccination_records (immunization_program, vaccine_source);

-- Appointment indexes
CREATE INDEX idx_appointments_user_date ON appointments (user_id, appointment_date, appointment_time);
CREATE INDEX idx_appointments_provider_date ON appointments (provider_id, appointment_date, appointment_time);
CREATE INDEX idx_appointments_status_date ON appointments (appointment_status, appointment_date);
CREATE INDEX idx_appointments_cultural ON appointments USING GIN (cultural_adjustments);
CREATE INDEX idx_appointments_follow_up ON appointments (user_id, follow_up_required, appointment_date) WHERE follow_up_required = TRUE;

-- Insurance coverage indexes
CREATE INDEX idx_user_insurance_active ON user_insurance_coverage (user_id, coverage_status, expiry_date) WHERE coverage_status = 'active';
CREATE INDEX idx_insurance_provider_type ON user_insurance_coverage (insurance_provider_id, coverage_type, coverage_status);
CREATE INDEX idx_insurance_expiry ON user_insurance_coverage (expiry_date) WHERE coverage_status = 'active';

-- ============================================================================
-- TRIGGERS FOR AUDIT AND AUTOMATION
-- ============================================================================

-- Medical records audit
CREATE TRIGGER audit_medical_records_trigger
    AFTER INSERT OR UPDATE OR DELETE ON medical_records
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();

-- Medical conditions audit  
CREATE TRIGGER audit_medical_conditions_trigger
    AFTER INSERT OR UPDATE OR DELETE ON medical_conditions
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();

-- Vaccination records audit
CREATE TRIGGER audit_vaccination_records_trigger
    AFTER INSERT OR UPDATE OR DELETE ON vaccination_records
    FOR EACH ROW EXECUTE FUNCTION audit_trigger();

-- Update timestamp triggers
CREATE TRIGGER update_medical_records_timestamp
    BEFORE UPDATE ON medical_records
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_medical_conditions_timestamp
    BEFORE UPDATE ON medical_conditions
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_appointments_timestamp
    BEFORE UPDATE ON appointments
    FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- ============================================================================
-- PERMISSIONS AND SECURITY
-- ============================================================================

-- Grant permissions to application role
GRANT SELECT, INSERT, UPDATE, DELETE ON medical_records, medical_conditions, medical_documents, 
      emergency_contacts, vaccination_records, appointment_types, appointments,
      insurance_providers, user_insurance_coverage TO medimate_app;

-- Grant read-only access to analytics role
GRANT SELECT ON medical_records, medical_conditions, vaccination_records, 
      appointments, user_insurance_coverage TO medimate_analytics;

-- Grant limited access to healthcare provider role
GRANT SELECT ON medical_records, medical_conditions, emergency_contacts, 
      vaccination_records, appointments TO medimate_healthcare;
GRANT INSERT, UPDATE ON appointments TO medimate_healthcare;

COMMENT ON SCHEMA public IS 'MediMate Malaysia - Extended healthcare database with Malaysian cultural intelligence and PDPA compliance';