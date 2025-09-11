/**
 * Medication Management Service
 * 
 * Provides comprehensive medication management with Malaysian healthcare integration:
 * - Halal medication validation
 * - Cultural considerations for scheduling
 * - Multi-language medication information
 * - Ramadan-friendly dosing schedules
 */

import { apiClient } from '../client';
import { API_ENDPOINTS, buildQuery } from '../endpoints';
import { culturalService } from './culturalService';
import type { 
  ApiResponse, 
  MedicationResponse, 
  MedicationsResponse 
} from '../types';

export interface MedicationSearchParams {
  search?: string;
  halal_only?: boolean;
  category?: 'analgesic' | 'antibiotic' | 'antiviral' | 'vaccine' | 'supplement';
  manufacturer?: string;
  page?: number;
  limit?: number;
}

export interface MedicationScheduleRequest {
  medication_id: string;
  patient_id: string;
  dosage: string;
  frequency: number; // times per day
  duration_days: number;
  start_date: string;
  special_instructions?: string;
  cultural_considerations?: {
    avoid_prayer_times: boolean;
    ramadan_adjustments: boolean;
    preferred_language: 'ms' | 'en' | 'zh' | 'ta';
  };
}

export class MedicationService {
  /**
   * Get list of medications with filtering
   */
  async getMedications(params: MedicationSearchParams = {}): Promise<ApiResponse<MedicationsResponse>> {
    const queryString = buildQuery.medications(params);
    const endpoint = queryString ? `${API_ENDPOINTS.MEDICATIONS.LIST}?${queryString}` : API_ENDPOINTS.MEDICATIONS.LIST;

    return apiClient.request<MedicationsResponse>(endpoint, {
      cacheKey: `medications_list_${JSON.stringify(params)}`,
      cacheTTL: 1800000, // 30 minutes cache for medications
    });
  }

  /**
   * Get medication by ID
   */
  async getMedicationById(medicationId: string): Promise<ApiResponse<MedicationResponse>> {
    return apiClient.request<MedicationResponse>(
      API_ENDPOINTS.MEDICATIONS.GET_BY_ID(medicationId),
      {
        cacheKey: `medication_${medicationId}`,
        cacheTTL: 3600000, // 1 hour cache
      }
    );
  }

  /**
   * Search medications by name or active ingredient
   */
  async searchMedications(
    searchTerm: string,
    options?: {
      halalOnly?: boolean;
      category?: string;
      language?: string;
    }
  ): Promise<ApiResponse<MedicationsResponse>> {
    const params: MedicationSearchParams = {
      search: searchTerm,
      halal_only: options?.halalOnly,
      category: options?.category as any,
      limit: 50,
    };

    return this.getMedications(params);
  }

  /**
   * Get halal medications only
   */
  async getHalalMedications(category?: string): Promise<ApiResponse<MedicationsResponse>> {
    return this.getMedications({
      halal_only: true,
      category: category as any,
      limit: 100,
    });
  }

  /**
   * Validate medication halal status
   */
  async validateMedicationHalal(medicationName: string, manufacturer?: string): Promise<ApiResponse<{
    isHalal: boolean;
    status: 'halal' | 'haram' | 'syubhah' | 'unknown';
    certification?: {
      body: string;
      number: string;
      expiry_date?: string;
    };
    alternatives?: Array<{
      name: string;
      manufacturer: string;
      halal_certified: boolean;
    }>;
  }>> {
    const response = await culturalService.validateMedicationHalal({
      medication_name: medicationName,
      manufacturer,
      active_ingredients: [], // Would be populated in real implementation
    });

    if (!response.success) {
      return response;
    }

    const halalData = response.data!;
    return {
      success: true,
      data: {
        isHalal: halalData.halal_status === 'halal',
        status: halalData.halal_status,
        certification: halalData.certification_body ? {
          body: halalData.certification_body,
          number: halalData.certification_number || '',
        } : undefined,
        alternatives: halalData.alternatives,
      },
    };
  }

  /**
   * Create medication schedule with cultural considerations
   */
  async createMedicationSchedule(scheduleData: MedicationScheduleRequest): Promise<ApiResponse<{
    schedule_id: string;
    medication_id: string;
    patient_id: string;
    schedule: Array<{
      time: string;
      dosage: string;
      cultural_notes?: string[];
    }>;
    cultural_adjustments: {
      prayer_time_avoided: boolean;
      ramadan_adjusted: boolean;
      special_instructions: string[];
    };
  }>> {
    // Get medication details for validation
    const medicationResponse = await this.getMedicationById(scheduleData.medication_id);
    if (!medicationResponse.success) {
      return {
        success: false,
        error: 'Invalid medication ID',
      };
    }

    // Generate schedule with cultural considerations
    const schedule = await this.generateCulturallyAwareSchedule(scheduleData);
    
    if (!schedule.success) {
      return schedule;
    }

    // In a real implementation, this would call the backend API
    return {
      success: true,
      data: {
        schedule_id: `schedule_${Date.now()}`,
        medication_id: scheduleData.medication_id,
        patient_id: scheduleData.patient_id,
        schedule: schedule.data!.schedule,
        cultural_adjustments: schedule.data!.cultural_adjustments,
      },
    };
  }

  /**
   * Generate culturally aware medication schedule
   */
  private async generateCulturallyAwareSchedule(
    scheduleData: MedicationScheduleRequest
  ): Promise<ApiResponse<{
    schedule: Array<{
      time: string;
      dosage: string;
      cultural_notes?: string[];
    }>;
    cultural_adjustments: {
      prayer_time_avoided: boolean;
      ramadan_adjusted: boolean;
      special_instructions: string[];
    };
  }>> {
    const specialInstructions: string[] = [];
    let prayerTimeAvoided = false;
    let ramadanAdjusted = false;

    // Get prayer times if needed
    let prayerTimes: any = null;
    if (scheduleData.cultural_considerations?.avoid_prayer_times) {
      const prayerResponse = await culturalService.getPrayerTimes('KUL'); // Default to KL
      if (prayerResponse.success) {
        prayerTimes = prayerResponse.data!.prayer_times;
        prayerTimeAvoided = true;
        specialInstructions.push('Schedule adjusted to avoid prayer times');
      }
    }

    // Check Ramadan adjustments
    let isRamadan = false;
    if (scheduleData.cultural_considerations?.ramadan_adjustments) {
      const ramadanResponse = await culturalService.isRamadanPeriod();
      if (ramadanResponse.success && ramadanResponse.data?.isRamadan) {
        isRamadan = true;
        ramadanAdjusted = true;
        specialInstructions.push('Schedule adjusted for Ramadan fasting');
      }
    }

    // Generate schedule times based on frequency
    const schedule: Array<{
      time: string;
      dosage: string;
      cultural_notes?: string[];
    }> = [];

    const frequency = scheduleData.frequency;
    const hoursInterval = 24 / frequency;

    for (let i = 0; i < frequency; i++) {
      let hour = 8 + (i * hoursInterval); // Start at 8 AM
      let culturalNotes: string[] = [];

      // Adjust for prayer times
      if (prayerTimes && scheduleData.cultural_considerations?.avoid_prayer_times) {
        // Check if scheduled time conflicts with prayer
        Object.entries(prayerTimes).forEach(([prayerName, prayerTime]) => {
          const prayerHour = parseInt((prayerTime as string).split(':')[0]);
          if (Math.abs(hour - prayerHour) < 1) {
            hour = prayerHour < 12 ? prayerHour - 1 : prayerHour + 1;
            culturalNotes.push(`Adjusted to avoid ${prayerName} prayer time`);
          }
        });
      }

      // Ramadan adjustments
      if (isRamadan) {
        if (hour >= 6 && hour <= 18) { // Typical fasting hours
          if (i === 0) {
            hour = 5; // Sahur time
            culturalNotes.push('Scheduled for Sahur (pre-dawn meal)');
          } else if (i === frequency - 1) {
            hour = 19; // After Iftar
            culturalNotes.push('Scheduled after Iftar (breaking fast)');
          }
        }
      }

      // Ensure hour is within valid range
      hour = Math.max(6, Math.min(22, hour));

      const timeString = `${Math.floor(hour).toString().padStart(2, '0')}:00`;
      
      schedule.push({
        time: timeString,
        dosage: scheduleData.dosage,
        cultural_notes: culturalNotes.length > 0 ? culturalNotes : undefined,
      });
    }

    // Add language-specific instructions
    if (scheduleData.cultural_considerations?.preferred_language !== 'en') {
      const language = scheduleData.cultural_considerations.preferred_language;
      specialInstructions.push(`Instructions should be provided in ${language}`);
    }

    return {
      success: true,
      data: {
        schedule: schedule.sort((a, b) => a.time.localeCompare(b.time)),
        cultural_adjustments: {
          prayer_time_avoided: prayerTimeAvoided,
          ramadan_adjusted: ramadanAdjusted,
          special_instructions: specialInstructions,
        },
      },
    };
  }

  /**
   * Check medication interactions
   */
  async checkMedicationInteractions(
    medicationIds: string[]
  ): Promise<ApiResponse<{
    has_interactions: boolean;
    interactions: Array<{
      medication_1: string;
      medication_2: string;
      severity: 'mild' | 'moderate' | 'severe';
      description: string;
      cultural_considerations?: string[];
    }>;
    recommendations: string[];
  }>> {
    // In a real implementation, this would call the backend API
    // For now, returning a mock response structure

    const interactions = [];
    const recommendations: string[] = [];

    // Mock interaction checking logic
    if (medicationIds.length > 1) {
      recommendations.push('Monitor patient for potential side effects');
      recommendations.push('Consider spacing medication times');
    }

    return {
      success: true,
      data: {
        has_interactions: interactions.length > 0,
        interactions,
        recommendations,
      },
    };
  }

  /**
   * Get medication statistics for dashboard
   */
  async getMedicationStatistics(): Promise<ApiResponse<{
    total: number;
    byCategory: Record<string, number>;
    halalCertified: number;
    halalPercentage: number;
    byManufacturer: Record<string, number>;
    culturalConsiderations: {
      withCulturalNotes: number;
      ramadanFriendly: number;
      multiLanguageSupport: number;
    };
  }>> {
    const medicationsResponse = await this.getMedications({ limit: 1000 });
    
    if (!medicationsResponse.success) {
      return medicationsResponse;
    }

    const medications = medicationsResponse.data!.medications;
    
    const stats = {
      total: medications.length,
      byCategory: {} as Record<string, number>,
      halalCertified: 0,
      halalPercentage: 0,
      byManufacturer: {} as Record<string, number>,
      culturalConsiderations: {
        withCulturalNotes: 0,
        ramadanFriendly: 0,
        multiLanguageSupport: 0,
      },
    };

    medications.forEach(medication => {
      // Count by category
      stats.byCategory[medication.category] = (stats.byCategory[medication.category] || 0) + 1;

      // Count halal certified
      if (medication.halal_status === 'halal') {
        stats.halalCertified++;
      }

      // Count by manufacturer
      stats.byManufacturer[medication.manufacturer] = (stats.byManufacturer[medication.manufacturer] || 0) + 1;

      // Count cultural considerations
      if (medication.cultural_notes) {
        stats.culturalConsiderations.withCulturalNotes++;
        
        if (medication.cultural_notes.ramadan_considerations) {
          stats.culturalConsiderations.ramadanFriendly++;
        }
      }

      // Multi-language support (would be based on available translations)
      stats.culturalConsiderations.multiLanguageSupport++;
    });

    stats.halalPercentage = medications.length > 0 ? 
      Math.round((stats.halalCertified / medications.length) * 100) : 0;

    return {
      success: true,
      data: stats,
    };
  }

  /**
   * Get medication recommendations based on cultural profile
   */
  async getCulturalMedicationRecommendations(
    patientCulturalProfile: {
      religion: string;
      halal_medication_only: boolean;
      primary_language: string;
      ramadan_observant?: boolean;
    },
    condition: string
  ): Promise<ApiResponse<{
    recommended_medications: Array<{
      medication: MedicationResponse;
      suitability_score: number;
      cultural_benefits: string[];
      considerations: string[];
    }>;
    cultural_guidelines: string[];
  }>> {
    // Search for relevant medications
    const medicationsResponse = await this.searchMedications(condition, {
      halalOnly: patientCulturalProfile.halal_medication_only,
    });

    if (!medicationsResponse.success) {
      return medicationsResponse;
    }

    const medications = medicationsResponse.data!.medications;
    const culturalGuidelines: string[] = [];

    // Score medications based on cultural fit
    const recommendedMedications = medications.map(medication => {
      let suitabilityScore = 100;
      const culturalBenefits: string[] = [];
      const considerations: string[] = [];

      // Halal considerations
      if (patientCulturalProfile.religion === 'Islam') {
        if (medication.halal_status === 'halal') {
          suitabilityScore += 20;
          culturalBenefits.push('Halal certified medication');
        } else if (medication.halal_status === 'haram') {
          suitabilityScore -= 50;
          considerations.push('Not suitable for Muslim patients');
        } else if (medication.halal_status === 'syubhah') {
          suitabilityScore -= 10;
          considerations.push('Uncertain halal status - consult with Islamic scholar');
        }
      }

      // Cultural notes considerations
      if (medication.cultural_notes?.ramadan_considerations && patientCulturalProfile.ramadan_observant) {
        suitabilityScore += 10;
        culturalBenefits.push('Has Ramadan-specific guidance');
      }

      // Language considerations
      if (patientCulturalProfile.primary_language !== 'en') {
        considerations.push(`Instructions may need translation to ${patientCulturalProfile.primary_language}`);
      }

      return {
        medication,
        suitability_score: Math.max(0, suitabilityScore),
        cultural_benefits: culturalBenefits,
        considerations: considerations,
      };
    });

    // Sort by suitability score
    recommendedMedications.sort((a, b) => b.suitability_score - a.suitability_score);

    // Generate cultural guidelines
    if (patientCulturalProfile.religion === 'Islam') {
      culturalGuidelines.push('Prioritize halal-certified medications when available');
      if (patientCulturalProfile.ramadan_observant) {
        culturalGuidelines.push('Adjust medication timing for Sahur and Iftar during Ramadan');
      }
    }

    if (patientCulturalProfile.primary_language !== 'en') {
      culturalGuidelines.push(`Provide medication instructions in ${patientCulturalProfile.primary_language}`);
    }

    return {
      success: true,
      data: {
        recommended_medications: recommendedMedications.slice(0, 10), // Top 10 recommendations
        cultural_guidelines: culturalGuidelines,
      },
    };
  }

  /**
   * Legacy methods for compatibility
   */
  
  /**
   * @deprecated Use getMedications with category filter instead
   */
  async getMedicationsByCategory(category: string): Promise<ApiResponse<MedicationsResponse>> {
    return this.getMedications({ category: category as any });
  }

  /**
   * @deprecated Use existing schedule endpoint
   */
  async getSchedule(): Promise<ApiResponse<any>> {
    return apiClient.request<any>(API_ENDPOINTS.MEDICATIONS.SCHEDULE);
  }

  /**
   * @deprecated Use checkMedicationInteractions instead
   */
  async getInteractions(): Promise<ApiResponse<any>> {
    return apiClient.request<any>(API_ENDPOINTS.MEDICATIONS.INTERACTIONS);
  }
}

export const medicationService = new MedicationService();