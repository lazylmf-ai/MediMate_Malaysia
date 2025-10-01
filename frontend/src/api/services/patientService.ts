/**
 * Patient Management Service
 * 
 * Provides comprehensive patient management with PDPA compliance
 * and Malaysian healthcare cultural integration
 */

import { apiClient } from '../client';
import { API_ENDPOINTS, buildQuery } from '../endpoints';
import type { 
  ApiResponse, 
  PatientCreateRequest, 
  PatientUpdateRequest, 
  PatientResponse, 
  PatientsResponse 
} from '../types';

export interface PatientSearchParams {
  page?: number;
  limit?: number;
  search?: string;
  state?: string;
  race?: string;
  religion?: string;
  language?: string;
}

export class PatientService {
  /**
   * Get list of patients with filtering and pagination
   */
  async getPatients(params: PatientSearchParams = {}): Promise<ApiResponse<PatientsResponse>> {
    const queryString = buildQuery.patients(params);
    const endpoint = queryString ? `${API_ENDPOINTS.PATIENTS.LIST}?${queryString}` : API_ENDPOINTS.PATIENTS.LIST;

    return apiClient.request<PatientsResponse>(endpoint, {
      cacheKey: `patients_list_${JSON.stringify(params)}`,
      cacheTTL: 300000, // 5 minutes cache
    });
  }

  /**
   * Get patient by ID
   */
  async getPatientById(patientId: string): Promise<ApiResponse<PatientResponse>> {
    return apiClient.request<PatientResponse>(
      API_ENDPOINTS.PATIENTS.GET_BY_ID(patientId),
      {
        cacheKey: `patient_${patientId}`,
        cacheTTL: 600000, // 10 minutes cache
      }
    );
  }

  /**
   * Create new patient with cultural profile
   */
  async createPatient(patientData: PatientCreateRequest): Promise<ApiResponse<PatientResponse>> {
    // Validate MyKad format
    if (!this.validateMyKadFormat(patientData.personal_info.mykad_number)) {
      return {
        success: false,
        error: 'Invalid MyKad number format',
      };
    }

    // Ensure PDPA consent is provided
    if (!patientData.pdpa_consent.data_processing) {
      return {
        success: false,
        error: 'PDPA data processing consent is required',
      };
    }

    return apiClient.request<PatientResponse>(
      API_ENDPOINTS.PATIENTS.CREATE,
      {
        method: 'POST',
        body: JSON.stringify(patientData),
      }
    );
  }

  /**
   * Update existing patient
   */
  async updatePatient(
    patientId: string,
    updateData: PatientUpdateRequest
  ): Promise<ApiResponse<PatientResponse>> {
    // Clear cache after update
    apiClient.clearCache(`patient_${patientId}`);
    
    return apiClient.request<PatientResponse>(
      API_ENDPOINTS.PATIENTS.UPDATE(patientId),
      {
        method: 'PUT',
        body: JSON.stringify(updateData),
      }
    );
  }

  /**
   * Search patients by various criteria
   */
  async searchPatients(searchTerm: string, filters?: {
    race?: string;
    religion?: string;
    state?: string;
    language?: string;
  }): Promise<ApiResponse<PatientsResponse>> {
    const params: PatientSearchParams = {
      search: searchTerm,
      ...filters,
      limit: 50, // Increased limit for search results
    };

    return this.getPatients(params);
  }

  /**
   * Get patients by Malaysian state
   */
  async getPatientsByState(stateCode: string): Promise<ApiResponse<PatientsResponse>> {
    return this.getPatients({
      state: stateCode,
      limit: 100,
    });
  }

  /**
   * Get patients with specific cultural preferences
   */
  async getPatientsWithCulturalPreferences(preferences: {
    halalMedicationOnly?: boolean;
    prayerTimeNotifications?: boolean;
    preferredLanguage?: string;
  }): Promise<ApiResponse<PatientResponse[]>> {
    // This would require a more sophisticated query in real implementation
    const allPatientsResponse = await this.getPatients({ limit: 100 });
    
    if (!allPatientsResponse.success) {
      return allPatientsResponse;
    }

    const filteredPatients = allPatientsResponse.data!.patients.filter(patient => {
      const culturalPrefs = patient.cultural_preferences;
      
      if (preferences.halalMedicationOnly !== undefined && 
          culturalPrefs.halal_medication_only !== preferences.halalMedicationOnly) {
        return false;
      }
      
      if (preferences.prayerTimeNotifications !== undefined && 
          culturalPrefs.prayer_time_notifications !== preferences.prayerTimeNotifications) {
        return false;
      }
      
      if (preferences.preferredLanguage && 
          culturalPrefs.primary_language !== preferences.preferredLanguage) {
        return false;
      }
      
      return true;
    });

    return {
      success: true,
      data: filteredPatients,
    };
  }

  /**
   * Get patient cultural context summary
   */
  async getPatientCulturalContext(patientId: string): Promise<ApiResponse<{
    language: string;
    secondaryLanguages: string[];
    religiousConsiderations: {
      religion: string;
      halalMedicationRequired: boolean;
      prayerTimeNotifications: boolean;
      genderPreference?: string;
    };
    culturalNotes: string[];
  }>> {
    const patientResponse = await this.getPatientById(patientId);
    
    if (!patientResponse.success) {
      return patientResponse;
    }

    const patient = patientResponse.data!;
    const culturalNotes: string[] = [];

    // Generate cultural context notes
    if (patient.personal_info.religion === 'Islam') {
      culturalNotes.push('Consider Islamic dietary restrictions and prayer times');
      if (patient.cultural_preferences.halal_medication_only) {
        culturalNotes.push('Halal medication verification required');
      }
    }

    if (patient.cultural_preferences.primary_language !== 'en') {
      culturalNotes.push(`Primary communication in ${patient.cultural_preferences.primary_language}`);
    }

    if (patient.cultural_preferences.preferred_gender_provider) {
      culturalNotes.push(`Prefers ${patient.cultural_preferences.preferred_gender_provider} gender healthcare provider`);
    }

    return {
      success: true,
      data: {
        language: patient.cultural_preferences.primary_language,
        secondaryLanguages: patient.cultural_preferences.secondary_languages || [],
        religiousConsiderations: {
          religion: patient.personal_info.religion,
          halalMedicationRequired: patient.cultural_preferences.halal_medication_only,
          prayerTimeNotifications: patient.cultural_preferences.prayer_time_notifications,
          genderPreference: patient.cultural_preferences.preferred_gender_provider,
        },
        culturalNotes,
      },
    };
  }

  /**
   * Validate patient data before submission
   */
  async validatePatientData(patientData: PatientCreateRequest): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate MyKad
    if (!this.validateMyKadFormat(patientData.personal_info.mykad_number)) {
      errors.push('Invalid MyKad number format');
    }

    // Validate age consistency
    if (!this.validateDateOfBirth(patientData.personal_info.date_of_birth, patientData.personal_info.mykad_number)) {
      warnings.push('Date of birth may not match MyKad number');
    }

    // Validate phone number
    if (!this.validateMalaysianPhone(patientData.contact_info.phone)) {
      errors.push('Invalid Malaysian phone number format');
    }

    // Validate PDPA consent
    if (!patientData.pdpa_consent.data_processing) {
      errors.push('PDPA data processing consent is required');
    }

    // Cultural preference validations
    if (patientData.personal_info.religion === 'Islam' && 
        !patientData.cultural_preferences.prayer_time_notifications) {
      warnings.push('Consider enabling prayer time notifications for Muslim patients');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Private validation methods
   */
  private validateMyKadFormat(mykad: string): boolean {
    // Malaysian MyKad format: YYMMDD-PB-###G
    const mykadRegex = /^\d{6}-\d{2}-\d{4}$/;
    return mykadRegex.test(mykad);
  }

  private validateDateOfBirth(dob: string, mykad: string): boolean {
    // Extract birth date from MyKad and compare with provided DOB
    const mykadDate = mykad.substring(0, 6);
    const dobDate = new Date(dob);
    
    // Simplified validation - in real implementation, this would be more comprehensive
    return dobDate.getFullYear() >= 1900 && dobDate <= new Date();
  }

  private validateMalaysianPhone(phone: string): boolean {
    // Malaysian phone formats: +60XXXXXXXXX or 0XXXXXXXXX
    const phoneRegex = /^(\+60|0)[1-9]\d{8,9}$/;
    return phoneRegex.test(phone.replace(/\s|-/g, ''));
  }

  /**
   * Get patient statistics for dashboard
   */
  async getPatientStatistics(): Promise<ApiResponse<{
    total: number;
    byRace: Record<string, number>;
    byReligion: Record<string, number>;
    byState: Record<string, number>;
    byLanguage: Record<string, number>;
    culturalPreferences: {
      halalMedicationOnly: number;
      prayerTimeNotifications: number;
      multiLanguage: number;
    };
  }>> {
    const patientsResponse = await this.getPatients({ limit: 1000 }); // Get larger sample
    
    if (!patientsResponse.success) {
      return patientsResponse;
    }

    const patients = patientsResponse.data!.patients;
    
    const stats = {
      total: patients.length,
      byRace: {} as Record<string, number>,
      byReligion: {} as Record<string, number>,
      byState: {} as Record<string, number>,
      byLanguage: {} as Record<string, number>,
      culturalPreferences: {
        halalMedicationOnly: 0,
        prayerTimeNotifications: 0,
        multiLanguage: 0,
      },
    };

    patients.forEach(patient => {
      // Count by race
      const race = patient.personal_info.race;
      stats.byRace[race] = (stats.byRace[race] || 0) + 1;

      // Count by religion
      const religion = patient.personal_info.religion;
      stats.byReligion[religion] = (stats.byReligion[religion] || 0) + 1;

      // Count by state (from address)
      const state = patient.contact_info.address.state;
      stats.byState[state] = (stats.byState[state] || 0) + 1;

      // Count by language
      const language = patient.cultural_preferences.primary_language;
      stats.byLanguage[language] = (stats.byLanguage[language] || 0) + 1;

      // Count cultural preferences
      if (patient.cultural_preferences.halal_medication_only) {
        stats.culturalPreferences.halalMedicationOnly++;
      }
      
      if (patient.cultural_preferences.prayer_time_notifications) {
        stats.culturalPreferences.prayerTimeNotifications++;
      }
      
      if (patient.cultural_preferences.secondary_languages && 
          patient.cultural_preferences.secondary_languages.length > 0) {
        stats.culturalPreferences.multiLanguage++;
      }
    });

    return {
      success: true,
      data: stats,
    };
  }
}

export const patientService = new PatientService();