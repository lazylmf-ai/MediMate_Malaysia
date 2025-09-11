/**
 * API Endpoints Configuration
 * 
 * Complete mapping of all MediMate Malaysia backend endpoints
 * organized by service domains for easy maintenance and integration
 */

import { CONFIG } from '@/constants/config';

const BASE_URL = CONFIG.apiUrl;

export const API_ENDPOINTS = {
  // Health & System Information
  HEALTH: {
    CHECK: `${BASE_URL}/health`,
    CONTEXT: `${BASE_URL}/context`,
  },

  // Authentication (extending existing)
  AUTH: {
    LOGIN: `${BASE_URL}/auth/login`,
    REGISTER: `${BASE_URL}/auth/register`,
    LOGOUT: `${BASE_URL}/auth/logout`,
    REFRESH_TOKEN: `${BASE_URL}/auth/refresh-token`,
    PROFILE: `${BASE_URL}/auth/profile`,
  },

  // Cultural Intelligence Services
  CULTURAL: {
    // Prayer Times
    PRAYER_TIMES: (stateCode: string) => `${BASE_URL}/cultural/prayer-times/${stateCode}`,
    PRAYER_TIMES_CURRENT: (stateCode: string) => `${BASE_URL}/cultural/prayer-times/${stateCode}/current`,
    
    // Translation Services
    TRANSLATE: `${BASE_URL}/cultural/translate`,
    
    // Halal Validation
    HALAL_VALIDATE_MEDICATION: `${BASE_URL}/cultural/halal/validate-medication`,
    
    // Cultural Calendar
    RAMADAN_INFO: (year: number) => `${BASE_URL}/cultural/calendar/ramadan/${year}`,
    
    // Legacy endpoints (maintain compatibility)
    SETTINGS: `${BASE_URL}/cultural/settings`,
    FESTIVALS: `${BASE_URL}/cultural/festivals`,
  },

  // Patient Management
  PATIENTS: {
    LIST: `${BASE_URL}/patients`,
    CREATE: `${BASE_URL}/patients`,
    GET_BY_ID: (patientId: string) => `${BASE_URL}/patients/${patientId}`,
    UPDATE: (patientId: string) => `${BASE_URL}/patients/${patientId}`,
    DELETE: (patientId: string) => `${BASE_URL}/patients/${patientId}`,
  },

  // Appointment Management
  APPOINTMENTS: {
    LIST: `${BASE_URL}/appointments`,
    CREATE: `${BASE_URL}/appointments`,
    GET_BY_ID: (appointmentId: string) => `${BASE_URL}/appointments/${appointmentId}`,
    UPDATE: (appointmentId: string) => `${BASE_URL}/appointments/${appointmentId}`,
    DELETE: (appointmentId: string) => `${BASE_URL}/appointments/${appointmentId}`,
  },

  // Medication Management
  MEDICATIONS: {
    LIST: `${BASE_URL}/medications`,
    CREATE: `${BASE_URL}/medications`,
    GET_BY_ID: (medicationId: string) => `${BASE_URL}/medications/${medicationId}`,
    UPDATE: (medicationId: string) => `${BASE_URL}/medications/${medicationId}`,
    DELETE: (medicationId: string) => `${BASE_URL}/medications/${medicationId}`,
    
    // Legacy endpoints (maintain compatibility)
    SCHEDULE: `${BASE_URL}/medications/schedule`,
    INTERACTIONS: `${BASE_URL}/medications/interactions`,
  },

  // Real-time Services
  REALTIME: {
    NOTIFICATIONS_SUBSCRIBE: `${BASE_URL}/realtime/notifications/subscribe`,
    DASHBOARD_CONNECT: `${BASE_URL}/realtime/dashboard/connect`,
    WEBSOCKET_CONNECT: `${BASE_URL}/ws/connect`,
  },

  // FHIR Integration
  FHIR: {
    PATIENT_SEARCH: `${BASE_URL}/fhir/Patient`,
    PATIENT_CREATE: `${BASE_URL}/fhir/Patient`,
    PATIENT_GET: (patientId: string) => `${BASE_URL}/fhir/Patient/${patientId}`,
    PATIENT_UPDATE: (patientId: string) => `${BASE_URL}/fhir/Patient/${patientId}`,
  },

  // Developer Portal
  DEVELOPER: {
    API_KEYS_LIST: `${BASE_URL}/developer/api-keys`,
    API_KEYS_CREATE: `${BASE_URL}/developer/api-keys`,
    API_KEY_GET: (keyId: string) => `${BASE_URL}/developer/api-keys/${keyId}`,
    API_KEY_DELETE: (keyId: string) => `${BASE_URL}/developer/api-keys/${keyId}`,
    SANDBOX_GENERATE_DATA: `${BASE_URL}/developer/sandbox/generate-data`,
  },

  // Documentation
  DOCUMENTATION: {
    POSTMAN_COLLECTION: `${BASE_URL}/docs/postman-collection`,
  },
} as const;

// Endpoint path builders for dynamic routes
export const buildEndpoint = {
  prayerTimes: (stateCode: string, date?: string) => {
    const url = API_ENDPOINTS.CULTURAL.PRAYER_TIMES(stateCode);
    return date ? `${url}?date=${date}` : url;
  },
  
  prayerTimesCurrent: (stateCode: string) => 
    API_ENDPOINTS.CULTURAL.PRAYER_TIMES_CURRENT(stateCode),
  
  ramadanInfo: (year: number = new Date().getFullYear()) => 
    API_ENDPOINTS.CULTURAL.RAMADAN_INFO(year),
  
  patient: (patientId: string) => 
    API_ENDPOINTS.PATIENTS.GET_BY_ID(patientId),
  
  appointment: (appointmentId: string) => 
    API_ENDPOINTS.APPOINTMENTS.GET_BY_ID(appointmentId),
  
  medication: (medicationId: string) => 
    API_ENDPOINTS.MEDICATIONS.GET_BY_ID(medicationId),
  
  fhirPatient: (patientId: string) => 
    API_ENDPOINTS.FHIR.PATIENT_GET(patientId),
  
  apiKey: (keyId: string) => 
    API_ENDPOINTS.DEVELOPER.API_KEY_GET(keyId),
};

// Query parameter builders for common API operations
export const buildQuery = {
  patients: (params: {
    page?: number;
    limit?: number;
    search?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params.page) searchParams.append('page', params.page.toString());
    if (params.limit) searchParams.append('limit', params.limit.toString());
    if (params.search) searchParams.append('search', params.search);
    return searchParams.toString();
  },
  
  appointments: (params: {
    date_from?: string;
    date_to?: string;
    patient_id?: string;
    provider_id?: string;
    include_prayer_conflicts?: boolean;
  }) => {
    const searchParams = new URLSearchParams();
    if (params.date_from) searchParams.append('date_from', params.date_from);
    if (params.date_to) searchParams.append('date_to', params.date_to);
    if (params.patient_id) searchParams.append('patient_id', params.patient_id);
    if (params.provider_id) searchParams.append('provider_id', params.provider_id);
    if (params.include_prayer_conflicts !== undefined) {
      searchParams.append('include_prayer_conflicts', params.include_prayer_conflicts.toString());
    }
    return searchParams.toString();
  },
  
  medications: (params: {
    search?: string;
    halal_only?: boolean;
    category?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params.search) searchParams.append('search', params.search);
    if (params.halal_only !== undefined) searchParams.append('halal_only', params.halal_only.toString());
    if (params.category) searchParams.append('category', params.category);
    return searchParams.toString();
  },
  
  fhirPatients: (params: {
    identifier?: string;
    name?: string;
    birthdate?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params.identifier) searchParams.append('identifier', params.identifier);
    if (params.name) searchParams.append('name', params.name);
    if (params.birthdate) searchParams.append('birthdate', params.birthdate);
    return searchParams.toString();
  },
};