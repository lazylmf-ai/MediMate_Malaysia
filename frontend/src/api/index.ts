/**
 * Comprehensive API Service Layer for MediMate Malaysia
 * 
 * Provides complete API integration with all 19+ backend endpoints including:
 * - Health & System Information
 * - Cultural Intelligence Services
 * - Patient Management
 * - Appointment Management
 * - Medication Management
 * - Real-time Services
 * - FHIR Integration
 * - Developer Portal
 * - Documentation Services
 */

export * from './endpoints';
export * from './types';
export * from './services/healthService';
export * from './services/culturalService';
export * from './services/patientService';
export * from './services/appointmentService';
export * from './services/medicationService';
export * from './services/realtimeService';
export * from './services/fhirService';
export * from './services/developerService';
export * from './services/documentationService';
export * from './client';