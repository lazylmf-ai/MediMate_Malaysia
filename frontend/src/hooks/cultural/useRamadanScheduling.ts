/**
 * Ramadan Medication Scheduling Hook
 * 
 * Specialized hook for managing medication schedules during Ramadan
 * with fasting-aware timing adjustments
 */

import { useState, useEffect, useCallback } from 'react';
import { festivalCalendarService, RamadanSchedule } from '../../services/festivals/FestivalCalendarService';
import { useFestivalCalendar } from './useFestivalCalendar';

export interface RamadanMedicationSchedule {
  medicationId: string;
  medicationName: string;
  originalSchedule: string[];
  adjustedSchedule: RamadanAdjustedTiming[];
  conflicts: RamadanConflict[];
  recommendations: string[];
}

export interface RamadanAdjustedTiming {
  time: string;
  window: 'pre_suhoor' | 'post_iftar' | 'night' | 'normal';
  description: string;
  culturalNote: string;
}

export interface RamadanConflict {
  originalTime: string;
  conflict: 'fasting_hours' | 'prayer_time' | 'meal_timing';
  severity: 'low' | 'medium' | 'high' | 'critical';
  suggestion: string;
}

export interface UseRamadanSchedulingResult {
  // Ramadan status
  isRamadan: boolean;
  daysRemaining: number | null;
  currentPhase: 'beginning' | 'middle' | 'end' | null;
  ramadanSchedule: RamadanSchedule | null;
  
  // Scheduling data
  adjustedSchedules: RamadanMedicationSchedule[];
  fastingHours: { start: string; end: string } | null;
  medicationWindows: {
    preSuhoor: { start: string; end: string; description: string };
    postIftar: { start: string; end: string; description: string };
    night: { start: string; end: string; description: string };
  } | null;
  
  // Actions
  adjustScheduleForRamadan: (medications: Array<{
    id: string;
    name: string;
    schedule: string[];
    type?: 'before_meals' | 'after_meals' | 'with_food' | 'empty_stomach' | 'as_needed';
  }>) => Promise<RamadanMedicationSchedule[]>;
  checkRamadanConflicts: (schedule: string[]) => RamadanConflict[];
  getSuhoorIftarTimes: () => { suhoor: string; iftar: string } | null;
  getMedicationGuidance: () => string[];
  
  // Loading states
  isLoading: boolean;
  error: string | null;
}

export const useRamadanScheduling = (): UseRamadanSchedulingResult => {
  const {
    isCurrentlyRamadan,
    ramadanDaysRemaining,
    ramadanPhase,
    ramadanSchedule,
    isLoading: festivalLoading,
    error: festivalError
  } = useFestivalCalendar({ enableRamadan: true });

  const [adjustedSchedules, setAdjustedSchedules] = useState<RamadanMedicationSchedule[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Derived states
  const fastingHours = ramadanSchedule ? {
    start: '05:30', // Approximate Fajr time
    end: '19:30'    // Approximate Maghrib time
  } : null;

  const medicationWindows = ramadanSchedule?.medicationWindows || null;

  /**
   * Adjust medication schedule for Ramadan fasting
   */
  const adjustScheduleForRamadan = useCallback(async (
    medications: Array<{
      id: string;
      name: string;
      schedule: string[];
      type?: 'before_meals' | 'after_meals' | 'with_food' | 'empty_stomach' | 'as_needed';
    }>
  ): Promise<RamadanMedicationSchedule[]> => {
    if (!isCurrentlyRamadan || !ramadanSchedule) {
      return [];
    }

    setIsLoading(true);
    setError(null);

    try {
      const adjustedSchedules = await Promise.all(
        medications.map(async (med) => {
          const conflicts = checkRamadanConflicts(med.schedule);
          const adjustedTiming = await calculateRamadanTiming(med);
          
          const guidance = await festivalCalendarService.getFestivalMedicationGuidance(
            `ramadan_${new Date().getFullYear()}`,
            med.type || 'as_needed'
          );

          return {
            medicationId: med.id,
            medicationName: med.name,
            originalSchedule: med.schedule,
            adjustedSchedule: adjustedTiming,
            conflicts,
            recommendations: guidance?.alternatives || getDefaultRecommendations(med.type)
          } as RamadanMedicationSchedule;
        })
      );

      setAdjustedSchedules(adjustedSchedules);
      return adjustedSchedules;

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to adjust schedule for Ramadan';
      setError(errorMessage);
      console.error('Ramadan scheduling error:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [isCurrentlyRamadan, ramadanSchedule]);

  /**
   * Calculate adjusted timing for Ramadan
   */
  const calculateRamadanTiming = useCallback(async (medication: {
    schedule: string[];
    type?: string;
  }): Promise<RamadanAdjustedTiming[]> => {
    if (!ramadanSchedule) return [];

    const adjustedTiming: RamadanAdjustedTiming[] = [];

    for (const originalTime of medication.schedule) {
      const hour = parseInt(originalTime.split(':')[0]);
      
      // Check if time falls during fasting hours (approx 5:30 AM - 7:30 PM)
      if (hour >= 6 && hour <= 19) {
        // Adjust to appropriate Ramadan window
        if (medication.type === 'before_meals' || medication.type === 'with_food') {
          // Schedule with Suhoor or Iftar
          adjustedTiming.push({
            time: '04:15', // Pre-Suhoor
            window: 'pre_suhoor',
            description: 'Take with Suhoor (pre-dawn meal)',
            culturalNote: 'Before the last meal before fasting begins'
          });
          
          adjustedTiming.push({
            time: '19:45', // Post-Iftar
            window: 'post_iftar',
            description: 'Take with Iftar (breaking fast meal)',
            culturalNote: 'After breaking the fast at sunset'
          });
        } else {
          // Schedule outside fasting hours
          if (hour < 12) {
            // Morning medication -> Pre-Suhoor
            adjustedTiming.push({
              time: '03:30',
              window: 'pre_suhoor',
              description: 'Take before Suhoor',
              culturalNote: 'Early morning before pre-dawn meal'
            });
          } else {
            // Afternoon/Evening medication -> Post-Iftar
            adjustedTiming.push({
              time: '20:30',
              window: 'post_iftar',
              description: 'Take after Iftar',
              culturalNote: 'Evening after breaking the fast'
            });
          }
        }
      } else {
        // Time is outside fasting hours - keep original or adjust slightly
        adjustedTiming.push({
          time: originalTime,
          window: 'normal',
          description: 'Normal timing (outside fasting hours)',
          culturalNote: 'No adjustment needed'
        });
      }
    }

    return adjustedTiming;
  }, [ramadanSchedule]);

  /**
   * Check for Ramadan conflicts in schedule
   */
  const checkRamadanConflicts = useCallback((schedule: string[]): RamadanConflict[] => {
    if (!isCurrentlyRamadan || !fastingHours) return [];

    const conflicts: RamadanConflict[] = [];

    schedule.forEach(time => {
      const hour = parseInt(time.split(':')[0]);
      
      // Check if medication time falls during fasting hours
      if (hour >= 6 && hour <= 19) {
        conflicts.push({
          originalTime: time,
          conflict: 'fasting_hours',
          severity: 'high',
          suggestion: 'Reschedule to Suhoor (pre-dawn) or Iftar (evening) time'
        });
      }
      
      // Check for meal timing conflicts
      if (hour >= 12 && hour <= 14) {
        conflicts.push({
          originalTime: time,
          conflict: 'meal_timing',
          severity: 'medium',
          suggestion: 'Consider taking with Iftar meal instead'
        });
      }
    });

    return conflicts;
  }, [isCurrentlyRamadan, fastingHours]);

  /**
   * Get Suhoor and Iftar times
   */
  const getSuhoorIftarTimes = useCallback(() => {
    if (!ramadanSchedule) return null;
    
    return {
      suhoor: ramadanSchedule.suhoorTime,
      iftar: ramadanSchedule.iftarTime
    };
  }, [ramadanSchedule]);

  /**
   * Get general medication guidance for Ramadan
   */
  const getMedicationGuidance = useCallback((): string[] => {
    if (!isCurrentlyRamadan) return [];

    const guidance = [
      'Take medications with Suhoor (pre-dawn meal) or Iftar (breaking fast)',
      'Stay hydrated during non-fasting hours',
      'Monitor blood sugar levels if diabetic',
      'Consult healthcare provider for critical medications',
      'Consider once-daily or extended-release formulations',
      'Elderly and sick individuals may be exempt from fasting'
    ];

    // Phase-specific guidance
    if (ramadanPhase === 'beginning') {
      guidance.push('Allow time for body to adjust to new schedule');
      guidance.push('Monitor for side effects during adjustment period');
    } else if (ramadanPhase === 'end') {
      guidance.push('Prepare for return to normal schedule after Ramadan');
    }

    return guidance;
  }, [isCurrentlyRamadan, ramadanPhase]);

  /**
   * Get default recommendations based on medication type
   */
  const getDefaultRecommendations = useCallback((medicationType?: string): string[] => {
    const baseRecommendations = [
      'Consult healthcare provider before making changes',
      'Monitor for any adverse effects',
      'Maintain hydration during non-fasting hours'
    ];

    switch (medicationType) {
      case 'before_meals':
        return [
          ...baseRecommendations,
          'Take 30 minutes before Suhoor or Iftar',
          'Ensure adequate time for absorption'
        ];
      case 'after_meals':
        return [
          ...baseRecommendations,
          'Take within 1 hour after Suhoor or Iftar',
          'Consider medication with dates (traditional breaking fast food)'
        ];
      case 'with_food':
        return [
          ...baseRecommendations,
          'Take during Suhoor or Iftar meals',
          'Avoid taking on empty stomach during fasting'
        ];
      case 'empty_stomach':
        return [
          ...baseRecommendations,
          'Take 1 hour before Suhoor or 2 hours after Iftar',
          'May need to adjust timing significantly'
        ];
      default:
        return baseRecommendations;
    }
  }, []);

  // Update error state from festival calendar
  useEffect(() => {
    if (festivalError) {
      setError(festivalError);
    }
  }, [festivalError]);

  return {
    isRamadan: isCurrentlyRamadan,
    daysRemaining: ramadanDaysRemaining,
    currentPhase: ramadanPhase,
    ramadanSchedule,
    adjustedSchedules,
    fastingHours,
    medicationWindows,
    adjustScheduleForRamadan,
    checkRamadanConflicts,
    getSuhoorIftarTimes,
    getMedicationGuidance,
    isLoading: isLoading || festivalLoading,
    error
  };
};