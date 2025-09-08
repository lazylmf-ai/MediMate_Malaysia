/**
 * MediMate Malaysia - Healthcare Database Models
 * TypeScript interfaces and types for extended healthcare database schema
 * PDPA compliant with Malaysian healthcare standards
 */

// ============================================================================
// BASE TYPES AND ENUMS
// ============================================================================

export enum RecordType {
  CONSULTATION = 'consultation',
  DIAGNOSIS = 'diagnosis',
  PROCEDURE = 'procedure',
  LAB_RESULT = 'lab_result',
  IMAGING = 'imaging',
  PRESCRIPTION = 'prescription',
  DISCHARGE_SUMMARY = 'discharge_summary',
  REFERRAL = 'referral'
}

export enum ConditionStatus {
  ACTIVE = 'active',
  RESOLVED = 'resolved',
  CHRONIC = 'chronic',
  REMISSION = 'remission',
  RELAPSED = 'relapsed'
}

export enum Severity {
  MILD = 'mild',
  MODERATE = 'moderate',
  SEVERE = 'severe',
  CRITICAL = 'critical'
}

export enum ConfidentialityLevel {
  PUBLIC = 'public',
  STANDARD = 'standard',
  SENSITIVE = 'sensitive',
  RESTRICTED = 'restricted'
}

export enum AppointmentStatus {
  SCHEDULED = 'scheduled',
  CONFIRMED = 'confirmed',
  RESCHEDULED = 'rescheduled',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
  COMPLETED = 'completed',
  IN_PROGRESS = 'in_progress',
  WAITING = 'waiting'
}

export enum VaccinationStatus {
  SCHEDULED = 'scheduled',
  COMPLETED = 'completed',
  OVERDUE = 'overdue',
  EXEMPTED = 'exempted',
  CONTRAINDICATED = 'contraindicated'
}

// ============================================================================
// CULTURAL CONTEXT INTERFACES
// ============================================================================

export interface CulturalFactors {
  language_used?: string;
  cultural_sensitivities?: string[];
  religious_considerations?: string[];
  dietary_restrictions_noted?: string[];
}

export interface CulturalAdjustments {
  prayer_time_avoidance?: boolean;
  fasting_consideration?: boolean;
  cultural_interpreter_needed?: boolean;
  gender_preference?: 'male' | 'female' | null;
}

export interface CulturalImpact {
  dietary_restrictions?: string[];
  religious_considerations?: string[];
  cultural_treatments_used?: string[];
  family_support_available?: boolean;
}

// ============================================================================
// MEDICAL RECORDS MODELS
// ============================================================================

export interface MedicalRecord {
  id: string;
  user_id: string;
  provider_id?: string;
  record_type: RecordType;
  
  // Scheduling
  visit_date: Date;
  visit_time?: string;
  appointment_id?: string;
  
  // Medical content
  chief_complaint?: string;
  history_of_present_illness?: string;
  past_medical_history?: string;
  family_history?: string;
  social_history?: string;
  
  // Physical examination
  vital_signs?: {
    blood_pressure_systolic?: number;
    blood_pressure_diastolic?: number;
    heart_rate?: number;
    temperature?: number;
    respiratory_rate?: number;
    oxygen_saturation?: number;
    weight?: number;
    height?: number;
  };
  physical_examination?: string;
  
  // Assessment and plan
  clinical_assessment?: string;
  diagnosis_codes?: string[];
  treatment_plan?: string;
  follow_up_instructions?: string;
  
  // Malaysian cultural considerations
  cultural_factors?: CulturalFactors;
  
  // Documents and references
  documents?: string[];
  
  // Provider information
  attending_physician?: string;
  physician_license?: string;
  facility_name?: string;
  
  // Security and access
  confidentiality_level: ConfidentialityLevel;
  access_permissions?: {
    patient?: boolean;
    family?: boolean;
    emergency_contacts?: boolean;
    healthcare_providers?: boolean;
  };
  
  // Status
  record_status: 'draft' | 'active' | 'amended' | 'archived';
  reviewed_by?: string;
  reviewed_at?: Date;
  
  created_at: Date;
  updated_at: Date;
}

export interface MedicalCondition {
  id: string;
  user_id: string;
  
  // Condition identification
  condition_name: string;
  condition_code?: string;
  condition_category?: string;
  
  // Malaysian terminology
  condition_name_ms?: string;
  condition_name_zh?: string;
  condition_name_ta?: string;
  
  // Medical details
  severity?: Severity;
  onset_date?: Date;
  diagnosis_date: Date;
  diagnosed_by?: string;
  provider_id?: string;
  
  // Management
  current_status: ConditionStatus;
  treatment_approach?: string;
  lifestyle_modifications?: string;
  
  // Cultural impact
  cultural_impact?: CulturalImpact;
  
  // Monitoring
  monitoring_frequency?: string;
  key_metrics?: Record<string, any>;
  target_values?: Record<string, any>;
  
  // Emergency
  emergency_protocols?: string;
  critical_thresholds?: Record<string, any>;
  
  // Family history
  hereditary_factor?: boolean;
  family_history_notes?: string;
  
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface MedicalDocument {
  id: string;
  user_id: string;
  medical_record_id?: string;
  provider_id?: string;
  
  // Document identification
  document_name: string;
  document_type: 'prescription' | 'lab_report' | 'xray' | 'mri' | 'ct_scan' | 
                 'discharge_summary' | 'referral_letter' | 'insurance_form' |
                 'consent_form' | 'medical_certificate' | 'vaccination_record';
  document_subtype?: string;
  
  // File information
  file_path: string;
  file_name?: string;
  file_size?: number;
  mime_type?: string;
  file_hash?: string;
  
  // Content metadata
  document_date?: Date;
  issuer_name?: string;
  issuer_license?: string;
  
  // Searchable content
  extracted_text?: string;
  searchable_keywords?: string[];
  
  // Compliance
  confidentiality_level: ConfidentialityLevel;
  retention_period_years: number;
  auto_delete_date?: Date;
  
  // Access control
  access_permissions?: {
    patient?: boolean;
    family?: boolean;
    emergency_contacts?: boolean;
    healthcare_providers?: boolean;
    insurance?: boolean;
  };
  
  // Version control
  version: number;
  parent_document_id?: string;
  
  // Status
  document_status: 'active' | 'superseded' | 'archived' | 'deleted';
  
  created_at: Date;
  updated_at: Date;
}

// ============================================================================
// EMERGENCY CONTACTS MODEL
// ============================================================================

export interface EmergencyContact {
  id: string;
  user_id: string;
  
  // Contact identification
  full_name: string;
  relationship: string;
  contact_priority: number;
  
  // Contact information
  phone_primary: string;
  phone_secondary?: string;
  email?: string;
  address?: string;
  
  // Cultural context
  preferred_language: string;
  cultural_notes?: string;
  
  // Medical context
  medical_decision_authority?: boolean;
  healthcare_proxy?: boolean;
  medical_knowledge_level: 'none' | 'basic' | 'intermediate' | 'advanced' | 'medical_professional';
  
  // Availability
  availability_hours?: {
    weekdays?: string;
    weekends?: string;
    holidays?: string;
  };
  location_proximity: 'same_household' | 'local' | 'distant' | 'overseas';
  
  // Notification preferences
  notification_methods?: string[];
  critical_conditions_only?: boolean;
  conditions_to_notify?: string[];
  
  // Legal and consent
  consent_to_contact: boolean;
  consent_date?: Date;
  legal_guardian?: boolean;
  
  // Verification
  verified?: boolean;
  verification_method?: string;
  verified_at?: Date;
  
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

// ============================================================================
// VACCINATION RECORDS MODEL
// ============================================================================

export interface VaccinationRecord {
  id: string;
  user_id: string;
  provider_id?: string;
  
  // Vaccine identification
  vaccine_name: string;
  vaccine_type: string;
  manufacturer?: string;
  batch_number?: string;
  lot_number?: string;
  
  // Malaysian integration
  malaysia_vaccine_code?: string;
  immunization_program?: string;
  vaccine_source: 'government' | 'private' | 'employer' | 'travel_clinic' | 'international';
  
  // Administration
  administration_date: Date;
  dose_number: number;
  total_doses_required?: number;
  dosage_amount?: string;
  administration_route?: string;
  injection_site?: string;
  
  // Provider details
  administered_by?: string;
  administrator_license?: string;
  clinic_name?: string;
  
  // Medical considerations
  pre_vaccination_health_check?: boolean;
  contraindications_checked?: boolean;
  adverse_reactions?: string;
  reaction_severity?: 'none' | 'mild' | 'moderate' | 'severe';
  
  // Cultural considerations
  halal_certified?: boolean;
  religious_exemption?: boolean;
  cultural_concerns?: string;
  
  // Scheduling
  next_due_date?: Date;
  reminder_sent?: boolean;
  
  // Certification
  certificate_number?: string;
  digital_certificate_id?: string;
  who_recognized?: boolean;
  travel_validity?: boolean;
  
  // Status
  vaccination_status: VaccinationStatus;
  verified?: boolean;
  verification_source?: string;
  
  created_at: Date;
  updated_at: Date;
}

// ============================================================================
// APPOINTMENT SYSTEM MODELS
// ============================================================================

export interface AppointmentType {
  id: string;
  type_name: string;
  type_code: string;
  
  // Malaysian terminology
  type_name_ms?: string;
  type_name_zh?: string;
  type_name_ta?: string;
  
  // Characteristics
  category: 'consultation' | 'follow_up' | 'screening' | 'procedure' |
           'vaccination' | 'lab_test' | 'imaging' | 'emergency';
  typical_duration: number;
  
  // Scheduling rules
  advance_booking_days: number;
  same_day_booking?: boolean;
  requires_referral?: boolean;
  requires_fasting?: boolean;
  requires_preparation?: boolean;
  preparation_instructions?: string;
  
  // Cultural considerations
  cultural_scheduling_rules?: {
    avoid_prayer_times?: boolean;
    respect_fasting_periods?: boolean;
    cultural_holidays_affect?: boolean;
  };
  
  // Provider requirements
  provider_types?: string[];
  special_qualifications?: string[];
  equipment_required?: string[];
  
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface Appointment {
  id: string;
  user_id: string;
  provider_id: string;
  appointment_type_id: string;
  
  // Scheduling
  appointment_date: Date;
  appointment_time: string;
  duration_minutes: number;
  end_time: string;
  
  // Management
  appointment_status: AppointmentStatus;
  booking_source: 'manual' | 'online' | 'phone' | 'walk_in' | 'referral' | 'system';
  
  // Patient information
  chief_complaint?: string;
  appointment_notes?: string;
  special_requirements?: string;
  
  // Cultural considerations
  cultural_adjustments?: CulturalAdjustments;
  
  // Reminders
  reminders_sent: number;
  last_reminder_sent?: Date;
  notification_preferences?: string[];
  
  // Provider details
  assigned_physician?: string;
  physician_license?: string;
  room_number?: string;
  clinic_location?: string;
  
  // Follow-up
  follow_up_required?: boolean;
  follow_up_interval_days?: number;
  follow_up_notes?: string;
  
  // Payment
  insurance_covered?: boolean;
  estimated_cost?: number;
  payment_status: 'pending' | 'paid' | 'partially_paid' | 'insurance_claimed' | 'waived';
  
  // Cancellation/Rescheduling
  cancellation_reason?: string;
  cancelled_by?: string;
  cancelled_at?: Date;
  reschedule_reason?: string;
  original_appointment_id?: string;
  
  // Outcome
  appointment_outcome?: 'completed_successful' | 'completed_with_issues' | 
                       'partial_completion' | 'cancelled_by_patient' | 
                       'cancelled_by_provider' | 'no_show' | 'emergency';
  outcome_notes?: string;
  
  created_at: Date;
  updated_at: Date;
}

// ============================================================================
// INSURANCE MODELS
// ============================================================================

export interface InsuranceProvider {
  id: string;
  provider_name: string;
  provider_type: 'government' | 'private' | 'corporate' | 'international' | 'takaful';
  
  // Malaysian details
  company_registration?: string;
  license_number?: string;
  regulator?: string;
  
  // Contact information
  contact_info?: Record<string, any>;
  website?: string;
  customer_service_phone?: string;
  
  // Services
  coverage_types?: string[];
  network_hospitals?: string[];
  direct_billing?: boolean;
  cashless_treatment?: boolean;
  
  // Cultural considerations
  shariah_compliant?: boolean;
  cultural_services?: {
    multilingual_support?: string[];
    cultural_liaisons?: boolean;
    religious_dietary_coverage?: boolean;
  };
  
  // Integration
  api_endpoint?: string;
  real_time_eligibility?: boolean;
  claim_submission_method?: string;
  
  active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface UserInsuranceCoverage {
  id: string;
  user_id: string;
  insurance_provider_id: string;
  
  // Policy details
  policy_number: string;
  group_number?: string;
  member_id?: string;
  
  // Coverage period
  effective_date: Date;
  expiry_date: Date;
  coverage_status: 'active' | 'expired' | 'suspended' | 'cancelled' | 'pending';
  
  // Coverage details
  coverage_type: string;
  annual_limit?: number;
  annual_utilized?: number;
  deductible_amount?: number;
  co_payment_percentage?: number;
  
  // Malaysian specific
  government_scheme?: boolean;
  employer_coverage?: boolean;
  individual_policy?: boolean;
  
  // Dependent information
  is_dependent?: boolean;
  primary_holder_id?: string;
  relationship_to_primary?: string;
  
  // Authorization
  requires_pre_auth?: boolean;
  referral_required?: boolean;
  preferred_providers?: string[];
  
  // Cultural benefits
  cultural_benefits?: {
    traditional_medicine_covered?: boolean;
    halal_pharmaceuticals_preferred?: boolean;
    cultural_interpreter_coverage?: boolean;
  };
  
  created_at: Date;
  updated_at: Date;
}

// ============================================================================
// DATABASE QUERY INTERFACES
// ============================================================================

export interface MedicalRecordQuery {
  user_id?: string;
  provider_id?: string;
  record_type?: RecordType;
  visit_date_from?: Date;
  visit_date_to?: Date;
  diagnosis_codes?: string[];
  confidentiality_level?: ConfidentialityLevel;
  record_status?: string;
}

export interface AppointmentQuery {
  user_id?: string;
  provider_id?: string;
  appointment_date_from?: Date;
  appointment_date_to?: Date;
  appointment_status?: AppointmentStatus;
  appointment_type_id?: string;
}

export interface VaccinationQuery {
  user_id?: string;
  vaccine_type?: string;
  administration_date_from?: Date;
  administration_date_to?: Date;
  vaccination_status?: VaccinationStatus;
  immunization_program?: string;
}

// ============================================================================
// API RESPONSE INTERFACES
// ============================================================================

export interface HealthcareApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
    cultural_message?: {
      en?: string;
      ms?: string;
      zh?: string;
      ta?: string;
    };
  };
  meta?: {
    total?: number;
    page?: number;
    limit?: number;
    cultural_context?: string;
    malaysian_state?: string;
  };
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  has_next: boolean;
  has_prev: boolean;
}

// ============================================================================
// CULTURAL INTELLIGENCE TYPES
// ============================================================================

export interface MalaysianHealthcareContext {
  state?: string;
  language?: string;
  religion?: string;
  cultural_preferences?: {
    prayer_times_enabled?: boolean;
    dietary_restrictions?: string[];
    cultural_holidays?: string[];
    gender_preferences?: Record<string, any>;
  };
  healthcare_preferences?: {
    traditional_medicine?: boolean;
    cultural_interpreter_needed?: boolean;
    family_involvement_level?: 'minimal' | 'moderate' | 'high';
  };
}

// ============================================================================
// EXPORT ALL MODELS
// ============================================================================

export type {
  MedicalRecord,
  MedicalCondition,
  MedicalDocument,
  EmergencyContact,
  VaccinationRecord,
  AppointmentType,
  Appointment,
  InsuranceProvider,
  UserInsuranceCoverage,
  MedicalRecordQuery,
  AppointmentQuery,
  VaccinationQuery,
  HealthcareApiResponse,
  PaginatedResponse,
  MalaysianHealthcareContext
};