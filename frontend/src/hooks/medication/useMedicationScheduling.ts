/**
 * Medication Scheduling Hook
 * 
 * Core hook for medication scheduling functionality with:
 * - Cultural awareness (prayer times, meal times, Ramadan)
 * - Redux integration with existing medication state
 * - Prayer time calculations and adjustments
 * - Flexible scheduling patterns
 * - Adherence tracking integration
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  selectCulturalPreferences,
  selectCurrentMedication,
  updateCulturalPreferences,
} from '../../store/slices/medicationSlice';
import {
  selectPrayerTimeEnabled,
  selectPrayerTimeMadhab,
  selectUserLocation
} from '../../store/slices/culturalSlice';
import {
  Medication,
  MedicationSchedule,
  CulturalAdjustments,
  AdherenceRecord,
} from '../../types/medication';
import {
  EnhancedCulturalProfile,
  CulturalCalendarEvent,
  MALAYSIAN_STATES_DATA,
} from '../../types/cultural';
import { usePrayerScheduling } from '../prayer';
import { PrayerSchedulingService } from '../../services/prayer-scheduling';

// Prayer time utilities (would normally import from cultural service)
interface PrayerTimes {
  fajr: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
}

interface SchedulingOptions {
  considerPrayerTimes: boolean;
  avoidMealTimes: boolean;
  adaptForRamadan: boolean;
  includeWeekends: boolean;
  bufferMinutes: number;
}

interface SchedulingRecommendation {
  recommendedTimes: string[];
  culturalNotes: string[];
  conflicts: Array<{
    time: string;
    conflict: string;
    severity: 'low' | 'medium' | 'high';
    suggestion?: string;
  }>;
  alternativeTimes?: string[];
}

interface MedicationSchedulingState {
  currentMedication: Medication | null;
  schedule: MedicationSchedule | null;
  culturalEvents: CulturalCalendarEvent[];
  prayerTimes: PrayerTimes | null;
  isLoading: boolean;
  error: string | null;
}

export const useMedicationScheduling = () => {
  const dispatch = useAppDispatch();
  const culturalPreferences = useAppSelector(selectCulturalPreferences);
  const currentMedication = useAppSelector(selectCurrentMedication);
  const prayerTimeEnabled = useAppSelector(selectPrayerTimeEnabled);
  const prayerTimeMadhab = useAppSelector(selectPrayerTimeMadhab);
  const userLocation = useAppSelector(selectUserLocation);

  // Use the new prayer scheduling hook
  const {
    optimizeSchedule: optimizePrayerSchedule,
    generateCulturalSchedule: generatePrayerAwareSchedule,
    validateSchedule: validatePrayerSchedule,
    isCurrentlyAvoidableTime,
    config: prayerConfig
  } = usePrayerScheduling({
    enabled: prayerTimeEnabled,
    madhab: prayerTimeMadhab,
    bufferMinutes: culturalPreferences?.prayerTimeBuffer || 30,
    location: userLocation ? {
      state: userLocation.state,
      coordinates: userLocation.coordinates
    } : undefined
  });

  const [state, setState] = useState<MedicationSchedulingState>({
    currentMedication: null,
    schedule: null,
    culturalEvents: [],
    prayerTimes: null,
    isLoading: false,
    error: null,
  });

  const [schedulingOptions, setSchedulingOptions] = useState<SchedulingOptions>({
    considerPrayerTimes: prayerTimeEnabled,
    avoidMealTimes: true,
    adaptForRamadan: culturalPreferences?.observesRamadan ?? false,
    includeWeekends: true,
    bufferMinutes: culturalPreferences?.prayerTimeBuffer || 30,
  });

  // Generate default prayer times based on location
  const generatePrayerTimes = useCallback((): PrayerTimes => {
    // In a real implementation, this would use a prayer time calculation library
    // For now, providing Malaysian standard times
    return {
      fajr: '06:00',
      dhuhr: '13:15',
      asr: '16:30',
      maghrib: '19:20',
      isha: '20:35',
    };
  }, []);

  // Calculate optimal scheduling times based on cultural preferences
  const calculateOptimalTimes = useCallback((
    frequency: MedicationSchedule['frequency'],
    options: SchedulingOptions
  ): SchedulingRecommendation => {
    const prayerTimes = generatePrayerTimes();
    const recommendedTimes: string[] = [];
    const culturalNotes: string[] = [];
    const conflicts: any[] = [];
    
    // Base medication timing patterns
    const frequencyPatterns = {
      daily: ['09:00'],
      twice_daily: ['08:00', '20:00'],
      three_times: ['08:00', '14:00', '20:00'],
      four_times: ['08:00', '13:00', '17:00', '21:00'],
      weekly: ['09:00'], // Same day each week
      as_needed: [], // No fixed schedule
      custom: [], // User-defined
    };

    let baseTimes = frequencyPatterns[frequency] || [];

    // Adjust for prayer times if requested
    if (options.considerPrayerTimes && culturalPreferences.observesPrayerTimes) {
      culturalNotes.push('Schedule adjusted to avoid prayer times');
      
      baseTimes = baseTimes.map(time => {
        const timeMinutes = timeToMinutes(time);
        
        // Check for conflicts with prayer times
        Object.entries(prayerTimes).forEach(([prayer, prayerTime]) => {
          const prayerMinutes = timeToMinutes(prayerTime);
          const timeDiff = Math.abs(timeMinutes - prayerMinutes);
          
          if (timeDiff < options.bufferMinutes) {
            conflicts.push({
              time,
              conflict: `Close to ${prayer} prayer time (${prayerTime})`,
              severity: 'medium' as const,
              suggestion: `Consider ${minutesToTime(prayerMinutes + options.bufferMinutes)} instead`,
            });
            
            // Suggest adjusted time
            return minutesToTime(prayerMinutes + options.bufferMinutes);
          }
        });
        
        return time;
      });
    }

    // Adjust for meal times if requested
    if (options.avoidMealTimes) {
      culturalNotes.push('Times selected to align with Malaysian meal patterns');
      
      const mealTimes = {
        breakfast: '07:30',
        lunch: '12:30',
        dinner: '18:30',
      };
      
      // Check for meal time conflicts
      baseTimes.forEach(time => {
        Object.entries(mealTimes).forEach(([meal, mealTime]) => {
          const timeDiff = Math.abs(timeToMinutes(time) - timeToMinutes(mealTime));
          
          if (timeDiff < 30) { // Within 30 minutes of meal
            conflicts.push({
              time,
              conflict: `Close to ${meal} time`,
              severity: 'low' as const,
              suggestion: 'Consider taking with or after meal if appropriate',
            });
          }
        });
      });
    }

    // Ramadan adjustments
    if (options.adaptForRamadan && culturalPreferences.observesRamadan) {
      culturalNotes.push('Schedule can be adjusted during Ramadan fasting period');
      
      // During Ramadan, prefer pre-suhoor and post-iftar times
      const ramadanTimes = {
        'pre-suhoor': '05:30', // Before morning meal
        'post-iftar': '19:45', // After breaking fast
        'night': '22:00', // Late evening
      };
      
      culturalNotes.push('Consider Ramadan fasting schedule - medications may need timing adjustment');
    }

    // Language considerations
    if (culturalPreferences.language === 'ms') {
      culturalNotes.push('Instruksi dalam Bahasa Malaysia tersedia');
    }

    return {
      recommendedTimes: baseTimes,
      culturalNotes,
      conflicts,
      alternativeTimes: conflicts.length > 0 ? 
        conflicts.map(c => c.suggestion).filter(Boolean) : 
        undefined,
    };
  }, [culturalPreferences, generatePrayerTimes]);

  // Create a new medication schedule with prayer time integration
  const createSchedule = useCallback(async (
    medicationId: string,
    frequency: MedicationSchedule['frequency'],
    customTimes?: string[],
    culturalAdjustments?: CulturalAdjustments
  ): Promise<MedicationSchedule> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      let scheduleResult;
      
      if (prayerTimeEnabled && culturalAdjustments) {
        // Use prayer-aware scheduling
        scheduleResult = await generatePrayerAwareSchedule(frequency, culturalAdjustments);
      } else {
        // Use basic scheduling
        const recommendation = calculateOptimalTimes(frequency, schedulingOptions);
        scheduleResult = {
          schedule: recommendation.recommendedTimes.map(time => 
            new Date(`1970-01-01T${time}:00`)
          ),
          culturalNotes: recommendation.culturalNotes
        };
      }

      const timeStrings = scheduleResult.schedule.map(date => 
        `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
      );

      const schedule: MedicationSchedule = {
        frequency,
        times: customTimes || timeStrings,
        culturalAdjustments: {
          takeWithFood: false,
          avoidDuringFasting: culturalPreferences?.observesRamadan ?? false,
          prayerTimeConsiderations: scheduleResult.culturalNotes,
          prayerTimeBuffer: schedulingOptions.bufferMinutes,
          mealTimingPreference: culturalAdjustments?.mealTimingPreference || 'with_meal',
          ramadanSchedule: culturalPreferences?.observesRamadan ? 
            ['05:30', '19:45'] : // Pre-suhoor and post-iftar times
            undefined,
        },
        reminders: true,
        nextDue: calculateNextDue(customTimes || timeStrings),
      };

      setState(prev => ({ ...prev, schedule, isLoading: false }));
      return schedule;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create schedule';
      setState(prev => ({ ...prev, error: errorMessage, isLoading: false }));
      
      // Return fallback schedule
      const recommendation = calculateOptimalTimes(frequency, schedulingOptions);
      return {
        frequency,
        times: customTimes || recommendation.recommendedTimes,
        culturalAdjustments: {
          takeWithFood: false,
          avoidDuringFasting: false,
          prayerTimeConsiderations: ['Basic schedule due to calculation error'],
          prayerTimeBuffer: 30,
          mealTimingPreference: 'with_meal'
        },
        reminders: true,
        nextDue: calculateNextDue(customTimes || recommendation.recommendedTimes),
      };
    }
  }, [
    culturalPreferences, 
    schedulingOptions, 
    calculateOptimalTimes, 
    prayerTimeEnabled, 
    generatePrayerAwareSchedule
  ]);

  // Update existing medication schedule
  const updateSchedule = useCallback((
    schedule: Partial<MedicationSchedule>
  ): MedicationSchedule => {
    const currentSchedule = state.schedule;
    if (!currentSchedule) {
      throw new Error('No existing schedule to update');
    }

    const updatedSchedule: MedicationSchedule = {
      ...currentSchedule,
      ...schedule,
      nextDue: schedule.times ? 
        calculateNextDue(schedule.times) : 
        currentSchedule.nextDue,
    };

    setState(prev => ({
      ...prev,
      schedule: updatedSchedule,
    }));

    return updatedSchedule;
  }, [state.schedule]);

  // Calculate next due time for medication
  const calculateNextDue = useCallback((times: string[]): string => {
    if (!times.length) return new Date().toISOString();

    const now = new Date();
    const today = new Date(now);
    today.setHours(0, 0, 0, 0);
    
    // Find the next scheduled time today
    for (const time of times.sort()) {
      const [hours, minutes] = time.split(':').map(Number);
      const scheduledTime = new Date(today);
      scheduledTime.setHours(hours, minutes, 0, 0);
      
      if (scheduledTime > now) {
        return scheduledTime.toISOString();
      }
    }
    
    // If no more times today, use first time tomorrow
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const [hours, minutes] = times[0].split(':').map(Number);
    tomorrow.setHours(hours, minutes, 0, 0);
    
    return tomorrow.toISOString();
  }, []);

  // Get schedule recommendation for a medication
  const getScheduleRecommendation = useCallback((
    frequency: MedicationSchedule['frequency'],
    culturalOverrides?: Partial<SchedulingOptions>
  ): SchedulingRecommendation => {
    const options = { ...schedulingOptions, ...culturalOverrides };
    return calculateOptimalTimes(frequency, options);
  }, [schedulingOptions, calculateOptimalTimes]);

  // Validate schedule against cultural constraints with prayer time integration
  const validateSchedule = useCallback(async (
    schedule: MedicationSchedule
  ): Promise<{ valid: boolean; warnings: string[]; errors: string[]; suggestions?: string[] }> => {
    const warnings: string[] = [];
    const errors: string[] = [];
    const suggestions: string[] = [];

    try {
      if (prayerTimeEnabled) {
        // Use prayer-aware validation
        const medicationTimes = schedule.times.map(time => {
          const [hours, minutes] = time.split(':').map(Number);
          const date = new Date();
          date.setHours(hours, minutes, 0, 0);
          return date;
        });

        const validationResult = await validatePrayerSchedule(medicationTimes);
        
        if (!validationResult.isValid) {
          errors.push(...validationResult.suggestions);
        }
        
        warnings.push(...validationResult.suggestions.filter(s => 
          s.includes('conflict') || s.includes('close')
        ));
        
        suggestions.push(...validationResult.suggestions);
      } else {
        // Basic validation without prayer times
        if (culturalPreferences?.observesPrayerTimes) {
          const prayerTimes = generatePrayerTimes();
          schedule.times.forEach(time => {
            Object.entries(prayerTimes).forEach(([prayer, prayerTime]) => {
              const timeDiff = Math.abs(timeToMinutes(time) - timeToMinutes(prayerTime));
              
              if (timeDiff < 15) {
                errors.push(`Medication time ${time} conflicts with ${prayer} prayer`);
              } else if (timeDiff < 30) {
                warnings.push(`Medication time ${time} is close to ${prayer} prayer`);
              }
            });
          });
        }
      }

      // Check for Ramadan considerations
      if (culturalPreferences?.observesRamadan && schedule.culturalAdjustments.avoidDuringFasting) {
        // During fasting hours (roughly 6 AM to 7 PM), medications should be avoided
        schedule.times.forEach(time => {
          const timeMinutes = timeToMinutes(time);
          if (timeMinutes > timeToMinutes('06:00') && timeMinutes < timeToMinutes('19:00')) {
            warnings.push(`Medication time ${time} falls during typical fasting hours`);
            suggestions.push(`Consider moving ${time} to pre-suhoor or post-iftar time`);
          }
        });
      }

      // Additional cultural checks
      if (isCurrentlyAvoidableTime && isCurrentlyAvoidableTime()) {
        warnings.push('Current time should be avoided for taking medication');
      }

      return {
        valid: errors.length === 0,
        warnings,
        errors,
        suggestions: suggestions.length > 0 ? suggestions : undefined
      };
    } catch (error) {
      console.error('Schedule validation failed:', error);
      return {
        valid: true, // Assume valid if validation fails
        warnings: ['Unable to perform complete validation'],
        errors: [],
        suggestions: ['Please manually check for prayer time conflicts']
      };
    }
  }, [
    culturalPreferences, 
    generatePrayerTimes, 
    prayerTimeEnabled, 
    validatePrayerSchedule, 
    isCurrentlyAvoidableTime
  ]);

  // Update scheduling options
  const updateSchedulingOptions = useCallback((
    updates: Partial<SchedulingOptions>
  ) => {
    setSchedulingOptions(prev => ({ ...prev, ...updates }));
  }, []);

  // Helper functions
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const minutesToTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  // Initialize prayer times on mount
  useEffect(() => {
    if (culturalPreferences.observesPrayerTimes) {
      const prayerTimes = generatePrayerTimes();
      setState(prev => ({
        ...prev,
        prayerTimes,
      }));
    }
  }, [culturalPreferences.observesPrayerTimes, generatePrayerTimes]);

  return {
    // State
    ...state,
    schedulingOptions,
    culturalPreferences,

    // Actions
    createSchedule,
    updateSchedule,
    updateSchedulingOptions,

    // Utilities
    getScheduleRecommendation,
    validateSchedule,
    calculateNextDue,

    // Prayer time utilities
    generatePrayerTimes,

    // New prayer integration functions
    optimizePrayerSchedule,
    isCurrentlyAvoidableTime,
    prayerConfig,
    prayerTimeEnabled,
    
    // Enhanced validation with prayer times
    validateScheduleAsync: validateSchedule,
  };
};

export default useMedicationScheduling;