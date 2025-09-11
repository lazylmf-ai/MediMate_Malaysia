/**
 * API Types for MediMate Malaysia
 * 
 * Complete type definitions for all API endpoints and services
 * Includes Malaysian healthcare specific types and cultural context
 */

// Base API Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    total_pages?: number;
  };
}

export interface ApiError {
  success: false;
  error: string;
  details?: Record<string, any>;
  code?: string;
}

// Health & System Types
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    database: 'connected' | 'disconnected' | 'error';
    redis: 'connected' | 'disconnected' | 'error';
    cultural_services: 'operational' | 'degraded' | 'offline';
  };
  cultural_context: string;
  supported_languages: string[];
}

export interface MalaysianContext {
  country: string;
  healthcare_system: string;
  supported_states: Array<{
    code: string;
    name: string;
    name_ms: string;
  }>;
  cultural_features: {
    prayer_times: boolean;
    halal_validation: boolean;
    multi_language: boolean;
    cultural_calendar: boolean;
  };
  compliance: {
    pdpa_2010: boolean;
    moh_guidelines: boolean;
  };
}

// Cultural Intelligence Types
export interface PrayerTimesResponse {
  state_code: string;
  state_name: string;
  date: string;
  prayer_times: {
    fajr: string;
    dhuhr: string;
    asr: string;
    maghrib: string;
    isha: string;
  };
  qibla_direction: number;
  hijri_date: {
    day: number;
    month: string;
    year: number;
  };
}

export interface CurrentPrayerStatus {
  current_time: string;
  current_prayer: string | null;
  next_prayer: string;
  next_prayer_time: string;
  is_prayer_time: boolean;
  prayer_window_end?: string;
}

export interface TranslationRequest {
  text: string;
  target_language: 'ms' | 'en' | 'zh' | 'ta';
  source_language: 'ms' | 'en' | 'zh' | 'ta';
  context?: {
    domain: 'prescription' | 'appointment' | 'diagnosis' | 'general';
    urgency: 'low' | 'medium' | 'high' | 'urgent';
  };
}

export interface TranslationResponse {
  original_text: string;
  translated_text: string;
  confidence: number;
  source_language: string;
  target_language: string;
  cultural_notes?: string[];
}

export interface HalalMedicationRequest {
  medication_name: string;
  manufacturer?: string;
  active_ingredients: string[];
  batch_number?: string;
}

export interface HalalValidationResponse {
  medication_name: string;
  halal_status: 'halal' | 'haram' | 'syubhah' | 'unknown';
  certification_body?: string;
  certification_number?: string;
  concerns?: string[];
  alternatives?: Array<{
    name: string;
    manufacturer: string;
    halal_certified: boolean;
  }>;
}

export interface RamadanInfo {
  year: number;
  start_date: string;
  end_date: string;
  eid_al_fitr: string;
  healthcare_considerations: {
    fasting_hours: {
      start: string;
      end: string;
    };
    medication_timing_adjustments: boolean;
    emergency_care_notes: string[];
  };
}

// Patient Management Types
export interface PatientCreateRequest {
  personal_info: {
    name: string;
    mykad_number: string;
    date_of_birth: string;
    gender: 'male' | 'female';
    race: 'Malay' | 'Chinese' | 'Indian' | 'Other';
    religion: 'Islam' | 'Buddhism' | 'Christianity' | 'Hinduism' | 'Other';
    nationality: string;
  };
  contact_info: {
    phone: string;
    email?: string;
    address: {
      street: string;
      city: string;
      state: string;
      postcode: string;
      country: string;
    };
  };
  cultural_preferences: {
    primary_language: 'ms' | 'en' | 'zh' | 'ta';
    secondary_languages?: Array<'ms' | 'en' | 'zh' | 'ta'>;
    prayer_time_notifications: boolean;
    halal_medication_only: boolean;
    preferred_gender_provider?: 'same' | 'opposite' | 'no_preference';
  };
  pdpa_consent: {
    data_processing: boolean;
    marketing: boolean;
    third_party_sharing: boolean;
    consent_date: string;
  };
}

export interface PatientUpdateRequest {
  personal_info?: Partial<PatientCreateRequest['personal_info']>;
  contact_info?: Partial<PatientCreateRequest['contact_info']>;
  cultural_preferences?: Partial<PatientCreateRequest['cultural_preferences']>;
  pdpa_consent?: Partial<PatientCreateRequest['pdpa_consent']>;
}

export interface PatientResponse {
  patient_id: string;
  personal_info: PatientCreateRequest['personal_info'];
  contact_info: PatientCreateRequest['contact_info'];
  cultural_preferences: PatientCreateRequest['cultural_preferences'];
  pdpa_consent: PatientCreateRequest['pdpa_consent'];
  created_at: string;
  updated_at: string;
  created_by: string;
  status: 'active' | 'inactive' | 'deceased';
}

export interface PatientsResponse {
  patients: PatientResponse[];
  pagination: {
    current_page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

// Appointment Management Types
export interface AppointmentCreateRequest {
  patient_id: string;
  provider_id: string;
  appointment_date: string;
  appointment_time: string;
  duration_minutes: number;
  appointment_type: 'consultation' | 'follow_up' | 'emergency' | 'screening';
  cultural_considerations?: {
    avoid_prayer_times: boolean;
    ramadan_friendly: boolean;
    preferred_language: 'ms' | 'en' | 'zh' | 'ta';
    gender_preference?: 'same' | 'opposite' | 'no_preference';
  };
  notes?: string;
}

export interface AppointmentResponse {
  appointment_id: string;
  patient_id: string;
  provider_id: string;
  appointment_datetime: string;
  duration_minutes: number;
  appointment_type: string;
  status: 'scheduled' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'no_show';
  cultural_considerations?: AppointmentCreateRequest['cultural_considerations'];
  prayer_time_conflicts?: Array<{
    prayer_name: string;
    prayer_time: string;
    conflict_severity: 'minor' | 'major' | 'critical';
  }>;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface AppointmentsResponse {
  appointments: AppointmentResponse[];
  cultural_context?: {
    ramadan_period: boolean;
    prayer_times: PrayerTimesResponse['prayer_times'];
  };
  pagination: {
    current_page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

// Medication Management Types
export interface MedicationResponse {
  medication_id: string;
  name: string;
  generic_name?: string;
  manufacturer: string;
  active_ingredients: string[];
  dosage_form: 'tablet' | 'capsule' | 'liquid' | 'injection' | 'topical' | 'inhaler';
  strength: string;
  category: 'analgesic' | 'antibiotic' | 'antiviral' | 'vaccine' | 'supplement';
  halal_status: HalalValidationResponse['halal_status'];
  halal_certification?: {
    body: string;
    number: string;
    expiry_date?: string;
  };
  prescribing_info: {
    indications: string[];
    contraindications: string[];
    side_effects: string[];
    dosage_instructions: string;
  };
  cultural_notes?: {
    ramadan_considerations?: string;
    prayer_time_adjustments?: string;
    cultural_sensitivities?: string[];
  };
}

export interface MedicationsResponse {
  medications: MedicationResponse[];
  filters_applied: {
    halal_only?: boolean;
    category?: string;
    search_term?: string;
  };
  pagination: {
    current_page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

// Real-time Services Types
export interface NotificationSubscriptionRequest {
  device_token: string;
  platform: 'ios' | 'android' | 'web';
  notification_types: Array<
    'appointment_reminder' | 'medication_reminder' | 'prayer_time' | 
    'emergency_alert' | 'family_update' | 'cultural_event'
  >;
  cultural_preferences: {
    language: 'ms' | 'en' | 'zh' | 'ta';
    prayer_time_notifications: boolean;
    ramadan_adjustments: boolean;
  };
}

export interface SubscriptionResponse {
  subscription_id: string;
  device_token: string;
  platform: string;
  notification_types: string[];
  status: 'active' | 'inactive';
  created_at: string;
}

// FHIR Types
export interface FHIRBundle {
  resourceType: 'Bundle';
  id: string;
  type: 'searchset';
  total: number;
  entry: Array<{
    resource: FHIRPatient;
  }>;
}

export interface FHIRPatient {
  resourceType: 'Patient';
  id: string;
  identifier: Array<{
    use: 'official';
    system: 'urn:oid:1.2.458.1000000.2.1.1.1';
    value: string; // MyKad number
  }>;
  name: Array<{
    use: 'official';
    family: string;
    given: string[];
  }>;
  gender: 'male' | 'female';
  birthDate: string;
  extension?: Array<{
    url: string;
    valueString: string;
  }>;
}

// Developer Portal Types
export interface ApiKeyRequest {
  name: string;
  description?: string;
  permissions: string[];
  environment: 'development' | 'staging' | 'production';
  cultural_features?: {
    prayer_time_access: boolean;
    halal_validation_access: boolean;
    translation_access: boolean;
    cultural_calendar_access: boolean;
  };
  malaysian_compliance?: {
    pdpa_compliant: boolean;
    audit_trail: boolean;
  };
}

export interface ApiKeyResponse {
  api_key_id: string;
  name: string;
  description?: string;
  key: string; // Only returned on creation
  permissions: string[];
  environment: string;
  status: 'active' | 'inactive' | 'suspended';
  cultural_features?: ApiKeyRequest['cultural_features'];
  malaysian_compliance?: ApiKeyRequest['malaysian_compliance'];
  usage_stats?: {
    total_requests: number;
    last_30_days: number;
    rate_limit: {
      requests_per_window: number;
      window_minutes: number;
    };
  };
  created_at: string;
  last_used?: string;
}

export interface SandboxDataRequest {
  data_type: 'patients' | 'appointments' | 'medications';
  count: number;
  malaysian_profiles?: {
    include_races?: string[];
    include_religions?: string[];
    states?: string[];
    languages?: string[];
  };
  cultural_considerations?: {
    include_prayer_times: boolean;
    include_halal_preferences: boolean;
    include_cultural_events: boolean;
  };
}

export interface SandboxDataResponse {
  data_type: string;
  generated_count: number;
  data: any[];
  cultural_context: {
    prayer_times_included: boolean;
    halal_preferences_included: boolean;
    languages_used: string[];
    states_represented: string[];
  };
  generated_at: string;
}