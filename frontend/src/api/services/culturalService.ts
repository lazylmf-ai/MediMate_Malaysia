/**
 * Cultural Intelligence Service
 * 
 * Provides comprehensive Malaysian cultural services including:
 * - Prayer times and Islamic calendar
 * - Halal medication validation
 * - Multi-language translation
 * - Cultural calendar events (Ramadan, festivals)
 */

import { apiClient } from '../client';
import { API_ENDPOINTS, buildEndpoint } from '../endpoints';
import type { 
  ApiResponse, 
  PrayerTimesResponse, 
  CurrentPrayerStatus, 
  TranslationRequest, 
  TranslationResponse, 
  HalalMedicationRequest, 
  HalalValidationResponse, 
  RamadanInfo 
} from '../types';

export class CulturalService {
  /**
   * Get prayer times for Malaysian state
   */
  async getPrayerTimes(
    stateCode: string,
    date?: string
  ): Promise<ApiResponse<PrayerTimesResponse>> {
    const endpoint = buildEndpoint.prayerTimes(stateCode, date);
    
    return apiClient.request<PrayerTimesResponse>(endpoint, {
      cacheKey: `prayer_times_${stateCode}_${date || 'today'}`,
      cacheTTL: 3600000, // 1 hour cache for prayer times
      culturalContext: {
        stateCode,
        timezone: 'Asia/Kuala_Lumpur',
      },
    });
  }

  /**
   * Get current prayer status for scheduling
   */
  async getCurrentPrayerStatus(stateCode: string): Promise<ApiResponse<CurrentPrayerStatus>> {
    const endpoint = buildEndpoint.prayerTimesCurrent(stateCode);
    
    return apiClient.request<CurrentPrayerStatus>(endpoint, {
      cacheKey: `current_prayer_${stateCode}`,
      cacheTTL: 60000, // 1 minute cache for current status
      culturalContext: {
        stateCode,
        timezone: 'Asia/Kuala_Lumpur',
      },
    });
  }

  /**
   * Check if current time conflicts with prayer
   */
  async checkPrayerConflict(
    stateCode: string,
    appointmentTime: Date
  ): Promise<ApiResponse<{
    hasConflict: boolean;
    conflictingPrayer?: string;
    alternativeTime?: string;
    severity: 'none' | 'minor' | 'major' | 'critical';
  }>> {
    const prayerResponse = await this.getCurrentPrayerStatus(stateCode);
    
    if (!prayerResponse.success) {
      return {
        success: false,
        error: 'Unable to check prayer times',
      };
    }

    const prayerData = prayerResponse.data!;
    const appointmentHour = appointmentTime.getHours();
    const appointmentMinute = appointmentTime.getMinutes();
    const appointmentTimeString = `${appointmentHour.toString().padStart(2, '0')}:${appointmentMinute.toString().padStart(2, '0')}`;

    // Simple conflict detection (in real implementation, this would be more sophisticated)
    const hasConflict = prayerData.is_prayer_time;
    
    return {
      success: true,
      data: {
        hasConflict,
        conflictingPrayer: hasConflict ? prayerData.current_prayer : undefined,
        alternativeTime: hasConflict ? prayerData.next_prayer_time : undefined,
        severity: hasConflict ? 'major' : 'none',
      },
    };
  }

  /**
   * Translate healthcare text with cultural context
   */
  async translateText(request: TranslationRequest): Promise<ApiResponse<TranslationResponse>> {
    return apiClient.request<TranslationResponse>(
      API_ENDPOINTS.CULTURAL.TRANSLATE,
      {
        method: 'POST',
        body: JSON.stringify(request),
        culturalContext: {
          language: request.target_language,
        },
        cacheKey: `translation_${request.text}_${request.source_language}_${request.target_language}`,
        cacheTTL: 86400000, // 24 hours cache for translations
      }
    );
  }

  /**
   * Translate common medical phrases
   */
  async translateMedicalPhrase(
    phrase: string,
    targetLanguage: 'ms' | 'en' | 'zh' | 'ta',
    sourceLanguage: 'ms' | 'en' | 'zh' | 'ta' = 'en'
  ): Promise<ApiResponse<TranslationResponse>> {
    const request: TranslationRequest = {
      text: phrase,
      target_language: targetLanguage,
      source_language: sourceLanguage,
      context: {
        domain: 'prescription',
        urgency: 'medium',
      },
    };

    return this.translateText(request);
  }

  /**
   * Validate medication halal status
   */
  async validateMedicationHalal(request: HalalMedicationRequest): Promise<ApiResponse<HalalValidationResponse>> {
    return apiClient.request<HalalValidationResponse>(
      API_ENDPOINTS.CULTURAL.HALAL_VALIDATE_MEDICATION,
      {
        method: 'POST',
        body: JSON.stringify(request),
        cacheKey: `halal_validation_${request.medication_name}_${request.manufacturer || 'unknown'}`,
        cacheTTL: 86400000, // 24 hours cache for halal validation
      }
    );
  }

  /**
   * Quick halal check for medication by name
   */
  async quickHalalCheck(medicationName: string): Promise<ApiResponse<{
    isHalal: boolean;
    status: 'halal' | 'haram' | 'syubhah' | 'unknown';
    confidence: 'high' | 'medium' | 'low';
  }>> {
    const response = await this.validateMedicationHalal({
      medication_name: medicationName,
      active_ingredients: [], // Basic check without ingredients
    });

    if (!response.success) {
      return response;
    }

    const halalData = response.data!;
    const isHalal = halalData.halal_status === 'halal';
    const confidence = halalData.certification_body ? 'high' : 
                     halalData.halal_status === 'unknown' ? 'low' : 'medium';

    return {
      success: true,
      data: {
        isHalal,
        status: halalData.halal_status,
        confidence,
      },
    };
  }

  /**
   * Get Ramadan information and healthcare considerations
   */
  async getRamadanInfo(year: number = new Date().getFullYear()): Promise<ApiResponse<RamadanInfo>> {
    const endpoint = buildEndpoint.ramadanInfo(year);
    
    return apiClient.request<RamadanInfo>(endpoint, {
      cacheKey: `ramadan_info_${year}`,
      cacheTTL: 86400000 * 30, // 30 days cache for Ramadan info
    });
  }

  /**
   * Check if current date is during Ramadan
   */
  async isRamadanPeriod(): Promise<ApiResponse<{
    isRamadan: boolean;
    daysRemaining?: number;
    specialConsiderations: string[];
  }>> {
    const currentYear = new Date().getFullYear();
    const response = await this.getRamadanInfo(currentYear);

    if (!response.success) {
      return {
        success: false,
        error: 'Unable to check Ramadan status',
      };
    }

    const ramadanData = response.data!;
    const now = new Date();
    const startDate = new Date(ramadanData.start_date);
    const endDate = new Date(ramadanData.end_date);

    const isRamadan = now >= startDate && now <= endDate;
    const daysRemaining = isRamadan ? Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : undefined;

    const specialConsiderations = isRamadan ? [
      'Adjust medication timing for Sahur and Iftar',
      'Consider fasting impact on medication absorption',
      'Schedule non-urgent appointments after Iftar',
      'Provide hydration guidance for break-fast',
    ] : [];

    return {
      success: true,
      data: {
        isRamadan,
        daysRemaining,
        specialConsiderations,
      },
    };
  }

  /**
   * Get culturally appropriate appointment times
   */
  async getSuggestedAppointmentTimes(
    stateCode: string,
    preferredDate: string,
    duration: number = 30
  ): Promise<ApiResponse<Array<{
    time: string;
    conflicts: string[];
    suitabilityScore: number;
    culturalNotes: string[];
  }>>> {
    const prayerResponse = await this.getPrayerTimes(stateCode, preferredDate);
    const ramadanResponse = await this.isRamadanPeriod();

    if (!prayerResponse.success) {
      return {
        success: false,
        error: 'Unable to fetch prayer times for scheduling',
      };
    }

    const prayerTimes = prayerResponse.data!.prayer_times;
    const isRamadan = ramadanResponse.data?.isRamadan || false;

    // Generate suggested times (simplified logic)
    const suggestions = [
      { time: '08:00', conflicts: [], suitabilityScore: 90, culturalNotes: ['Good morning time, after Fajr prayer'] },
      { time: '10:00', conflicts: [], suitabilityScore: 95, culturalNotes: ['Optimal morning time'] },
      { time: '14:00', conflicts: ['Close to Asr prayer'], suitabilityScore: 70, culturalNotes: ['Avoid if close to prayer time'] },
      { time: '16:00', conflicts: [], suitabilityScore: 85, culturalNotes: ['Good afternoon time'] },
    ];

    // Adjust for Ramadan
    if (isRamadan) {
      suggestions.forEach(suggestion => {
        suggestion.culturalNotes.push('Consider fasting schedule during Ramadan');
        if (suggestion.time >= '12:00' && suggestion.time <= '18:00') {
          suggestion.suitabilityScore -= 20;
          suggestion.culturalNotes.push('Patient may be fasting');
        }
      });
    }

    return {
      success: true,
      data: suggestions,
    };
  }

  /**
   * Legacy methods for compatibility with existing code
   */
  
  /**
   * @deprecated Use getPrayerTimes instead
   */
  async fetchPrayerTimes(latitude: number, longitude: number): Promise<ApiResponse<any>> {
    // Convert lat/lng to Malaysian state code (simplified)
    const stateCode = 'KUL'; // This should be a proper conversion in real implementation
    return this.getPrayerTimes(stateCode);
  }

  /**
   * @deprecated Use getCulturalSettings from existing API service
   */
  async getCulturalSettings(): Promise<ApiResponse<any>> {
    return apiClient.request<any>('/cultural/settings');
  }

  /**
   * @deprecated Use getCulturalSettings from existing API service  
   */
  async updateCulturalSettings(settings: any): Promise<ApiResponse<any>> {
    return apiClient.request<any>('/cultural/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }
}

export const culturalService = new CulturalService();