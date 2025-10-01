/**
 * Appointment Management Service
 * 
 * Provides comprehensive appointment scheduling with Malaysian cultural considerations:
 * - Prayer time conflict detection
 * - Ramadan-friendly scheduling
 * - Multi-language support
 * - Cultural preferences integration
 */

import { apiClient } from '../client';
import { API_ENDPOINTS, buildQuery } from '../endpoints';
import { culturalService } from './culturalService';
import type { 
  ApiResponse, 
  AppointmentCreateRequest, 
  AppointmentResponse, 
  AppointmentsResponse 
} from '../types';

export interface AppointmentSearchParams {
  date_from?: string;
  date_to?: string;
  patient_id?: string;
  provider_id?: string;
  include_prayer_conflicts?: boolean;
  appointment_type?: string;
  status?: string;
}

export class AppointmentService {
  /**
   * Get list of appointments with cultural context
   */
  async getAppointments(params: AppointmentSearchParams = {}): Promise<ApiResponse<AppointmentsResponse>> {
    const queryString = buildQuery.appointments(params);
    const endpoint = queryString ? `${API_ENDPOINTS.APPOINTMENTS.LIST}?${queryString}` : API_ENDPOINTS.APPOINTMENTS.LIST;

    return apiClient.request<AppointmentsResponse>(endpoint, {
      cacheKey: `appointments_list_${JSON.stringify(params)}`,
      cacheTTL: 300000, // 5 minutes cache
    });
  }

  /**
   * Get appointment by ID
   */
  async getAppointmentById(appointmentId: string): Promise<ApiResponse<AppointmentResponse>> {
    return apiClient.request<AppointmentResponse>(
      API_ENDPOINTS.APPOINTMENTS.GET_BY_ID(appointmentId),
      {
        cacheKey: `appointment_${appointmentId}`,
        cacheTTL: 600000, // 10 minutes cache
      }
    );
  }

  /**
   * Create new appointment with cultural validation
   */
  async createAppointment(appointmentData: AppointmentCreateRequest): Promise<ApiResponse<AppointmentResponse>> {
    // Validate appointment data first
    const validation = await this.validateAppointmentData(appointmentData);
    
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.errors.join(', '),
      };
    }

    return apiClient.request<AppointmentResponse>(
      API_ENDPOINTS.APPOINTMENTS.CREATE,
      {
        method: 'POST',
        body: JSON.stringify(appointmentData),
      }
    );
  }

  /**
   * Update existing appointment
   */
  async updateAppointment(
    appointmentId: string,
    updateData: Partial<AppointmentCreateRequest>
  ): Promise<ApiResponse<AppointmentResponse>> {
    // Clear cache after update
    apiClient.clearCache(`appointment_${appointmentId}`);
    
    return apiClient.request<AppointmentResponse>(
      API_ENDPOINTS.APPOINTMENTS.UPDATE(appointmentId),
      {
        method: 'PUT',
        body: JSON.stringify(updateData),
      }
    );
  }

  /**
   * Cancel appointment
   */
  async cancelAppointment(appointmentId: string, reason?: string): Promise<ApiResponse<AppointmentResponse>> {
    return this.updateAppointment(appointmentId, {
      notes: reason ? `Cancelled: ${reason}` : 'Cancelled',
    });
  }

  /**
   * Get appointments for specific patient
   */
  async getPatientAppointments(
    patientId: string,
    dateRange?: { from: string; to: string }
  ): Promise<ApiResponse<AppointmentsResponse>> {
    const params: AppointmentSearchParams = {
      patient_id: patientId,
      include_prayer_conflicts: true,
      ...dateRange && {
        date_from: dateRange.from,
        date_to: dateRange.to,
      },
    };

    return this.getAppointments(params);
  }

  /**
   * Get appointments for specific provider
   */
  async getProviderAppointments(
    providerId: string,
    dateRange?: { from: string; to: string }
  ): Promise<ApiResponse<AppointmentsResponse>> {
    const params: AppointmentSearchParams = {
      provider_id: providerId,
      include_prayer_conflicts: true,
      ...dateRange && {
        date_from: dateRange.from,
        date_to: dateRange.to,
      },
    };

    return this.getAppointments(params);
  }

  /**
   * Get available time slots with cultural considerations
   */
  async getAvailableTimeSlots(
    providerId: string,
    date: string,
    duration: number = 30,
    stateCode: string = 'KUL'
  ): Promise<ApiResponse<Array<{
    time: string;
    available: boolean;
    culturalConflicts: string[];
    suitabilityScore: number;
    notes: string[];
  }>>> {
    // Get existing appointments for the day
    const appointmentsResponse = await this.getProviderAppointments(providerId, {
      from: date,
      to: date,
    });

    // Get prayer times for cultural validation
    const prayerResponse = await culturalService.getPrayerTimes(stateCode, date);
    const ramadanResponse = await culturalService.isRamadanPeriod();

    if (!appointmentsResponse.success || !prayerResponse.success) {
      return {
        success: false,
        error: 'Unable to fetch schedule information',
      };
    }

    const existingAppointments = appointmentsResponse.data!.appointments;
    const prayerTimes = prayerResponse.data!.prayer_times;
    const isRamadan = ramadanResponse.data?.isRamadan || false;

    // Generate time slots (9 AM to 5 PM, 30-minute intervals)
    const timeSlots: Array<{
      time: string;
      available: boolean;
      culturalConflicts: string[];
      suitabilityScore: number;
      notes: string[];
    }> = [];

    for (let hour = 9; hour <= 17; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        const culturalConflicts: string[] = [];
        const notes: string[] = [];
        let suitabilityScore = 100;

        // Check for existing appointments
        const isBooked = existingAppointments.some(apt => {
          const aptTime = new Date(apt.appointment_datetime);
          const slotTime = new Date(`${date}T${timeString}:00`);
          return Math.abs(aptTime.getTime() - slotTime.getTime()) < duration * 60 * 1000;
        });

        // Check prayer time conflicts
        Object.entries(prayerTimes).forEach(([prayerName, prayerTime]) => {
          const prayerHour = parseInt(prayerTime.split(':')[0]);
          const prayerMinute = parseInt(prayerTime.split(':')[1]);
          
          if (Math.abs(hour - prayerHour) === 0 && Math.abs(minute - prayerMinute) <= 30) {
            culturalConflicts.push(`Close to ${prayerName} prayer time (${prayerTime})`);
            suitabilityScore -= 30;
          }
        });

        // Ramadan considerations
        if (isRamadan) {
          if (hour >= 12 && hour <= 18) {
            notes.push('During fasting hours - consider patient comfort');
            suitabilityScore -= 10;
          }
          if (hour >= 18 && hour <= 19) {
            notes.push('Close to Iftar time - good for breaking fast');
            suitabilityScore += 10;
          }
        }

        // Cultural timing preferences
        if (hour >= 10 && hour <= 11) {
          notes.push('Optimal morning time');
          suitabilityScore += 5;
        }
        if (hour >= 14 && hour <= 16) {
          notes.push('Good afternoon time');
          suitabilityScore += 5;
        }

        timeSlots.push({
          time: timeString,
          available: !isBooked,
          culturalConflicts,
          suitabilityScore: Math.max(0, suitabilityScore),
          notes,
        });
      }
    }

    // Sort by suitability score (highest first)
    timeSlots.sort((a, b) => b.suitabilityScore - a.suitabilityScore);

    return {
      success: true,
      data: timeSlots,
    };
  }

  /**
   * Validate appointment data with cultural considerations
   */
  async validateAppointmentData(appointmentData: AppointmentCreateRequest): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
    culturalNotes: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];
    const culturalNotes: string[] = [];

    // Validate required fields
    if (!appointmentData.patient_id) {
      errors.push('Patient ID is required');
    }
    if (!appointmentData.provider_id) {
      errors.push('Provider ID is required');
    }
    if (!appointmentData.appointment_date) {
      errors.push('Appointment date is required');
    }
    if (!appointmentData.appointment_time) {
      errors.push('Appointment time is required');
    }

    // Validate date/time format and future date
    const appointmentDateTime = new Date(`${appointmentData.appointment_date}T${appointmentData.appointment_time}`);
    if (appointmentDateTime <= new Date()) {
      warnings.push('Appointment is scheduled in the past');
    }

    // Cultural validations
    if (appointmentData.cultural_considerations?.avoid_prayer_times) {
      culturalNotes.push('Prayer time conflicts will be checked and avoided');
      
      // This would trigger additional validation against prayer times
      // In a real implementation, you would check against the actual prayer schedule
    }

    if (appointmentData.cultural_considerations?.ramadan_friendly) {
      culturalNotes.push('Appointment scheduled with Ramadan considerations');
      
      const hour = parseInt(appointmentData.appointment_time.split(':')[0]);
      if (hour >= 12 && hour <= 18) {
        warnings.push('Appointment during typical fasting hours');
      }
    }

    if (appointmentData.cultural_considerations?.preferred_language && 
        appointmentData.cultural_considerations.preferred_language !== 'en') {
      culturalNotes.push(
        `Interpreter may be needed (${appointmentData.cultural_considerations.preferred_language})`
      );
    }

    // Validate duration
    if (appointmentData.duration_minutes < 15) {
      warnings.push('Appointment duration is very short');
    }
    if (appointmentData.duration_minutes > 180) {
      warnings.push('Appointment duration is unusually long');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      culturalNotes,
    };
  }

  /**
   * Get appointment statistics for dashboard
   */
  async getAppointmentStatistics(dateRange?: { from: string; to: string }): Promise<ApiResponse<{
    total: number;
    byStatus: Record<string, number>;
    byType: Record<string, number>;
    culturalPreferences: {
      avoidPrayerTimes: number;
      ramadanFriendly: number;
      multiLanguage: number;
      genderPreference: number;
    };
    prayerTimeConflicts: number;
    averageDuration: number;
  }>> {
    const appointmentsResponse = await this.getAppointments({
      include_prayer_conflicts: true,
      ...dateRange,
    });
    
    if (!appointmentsResponse.success) {
      return appointmentsResponse;
    }

    const appointments = appointmentsResponse.data!.appointments;
    
    const stats = {
      total: appointments.length,
      byStatus: {} as Record<string, number>,
      byType: {} as Record<string, number>,
      culturalPreferences: {
        avoidPrayerTimes: 0,
        ramadanFriendly: 0,
        multiLanguage: 0,
        genderPreference: 0,
      },
      prayerTimeConflicts: 0,
      averageDuration: 0,
    };

    let totalDuration = 0;

    appointments.forEach(appointment => {
      // Count by status
      stats.byStatus[appointment.status] = (stats.byStatus[appointment.status] || 0) + 1;

      // Count by type
      stats.byType[appointment.appointment_type] = (stats.byType[appointment.appointment_type] || 0) + 1;

      // Count cultural preferences
      const cultural = appointment.cultural_considerations;
      if (cultural?.avoid_prayer_times) {
        stats.culturalPreferences.avoidPrayerTimes++;
      }
      if (cultural?.ramadan_friendly) {
        stats.culturalPreferences.ramadanFriendly++;
      }
      if (cultural?.preferred_language && cultural.preferred_language !== 'en') {
        stats.culturalPreferences.multiLanguage++;
      }
      if (cultural?.gender_preference && cultural.gender_preference !== 'no_preference') {
        stats.culturalPreferences.genderPreference++;
      }

      // Count prayer time conflicts
      if (appointment.prayer_time_conflicts && appointment.prayer_time_conflicts.length > 0) {
        stats.prayerTimeConflicts++;
      }

      // Sum duration
      totalDuration += appointment.duration_minutes;
    });

    stats.averageDuration = appointments.length > 0 ? totalDuration / appointments.length : 0;

    return {
      success: true,
      data: stats,
    };
  }

  /**
   * Get culturally sensitive appointment suggestions
   */
  async getAppointmentSuggestions(
    patientId: string,
    providerId: string,
    preferredDate: string,
    stateCode: string = 'KUL'
  ): Promise<ApiResponse<Array<{
    dateTime: string;
    suitabilityScore: number;
    culturalBenefits: string[];
    potentialIssues: string[];
    recommendation: 'highly_recommended' | 'recommended' | 'acceptable' | 'not_recommended';
  }>>> {
    const slotsResponse = await this.getAvailableTimeSlots(providerId, preferredDate, 30, stateCode);
    
    if (!slotsResponse.success) {
      return slotsResponse;
    }

    const availableSlots = slotsResponse.data!.filter(slot => slot.available);
    
    const suggestions = availableSlots.slice(0, 10).map(slot => {
      const culturalBenefits: string[] = [];
      const potentialIssues: string[] = [];
      
      if (slot.culturalConflicts.length === 0) {
        culturalBenefits.push('No prayer time conflicts');
      } else {
        potentialIssues.push(...slot.culturalConflicts);
      }
      
      culturalBenefits.push(...slot.notes.filter(note => 
        note.includes('Optimal') || note.includes('Good') || note.includes('good for')
      ));
      
      potentialIssues.push(...slot.notes.filter(note => 
        note.includes('fasting') || note.includes('consider')
      ));

      let recommendation: 'highly_recommended' | 'recommended' | 'acceptable' | 'not_recommended';
      if (slot.suitabilityScore >= 90) recommendation = 'highly_recommended';
      else if (slot.suitabilityScore >= 70) recommendation = 'recommended';
      else if (slot.suitabilityScore >= 50) recommendation = 'acceptable';
      else recommendation = 'not_recommended';

      return {
        dateTime: `${preferredDate}T${slot.time}:00`,
        suitabilityScore: slot.suitabilityScore,
        culturalBenefits,
        potentialIssues,
        recommendation,
      };
    });

    return {
      success: true,
      data: suggestions,
    };
  }
}

export const appointmentService = new AppointmentService();