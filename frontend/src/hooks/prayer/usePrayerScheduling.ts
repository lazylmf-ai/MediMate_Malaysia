/**
 * Prayer Scheduling Hook
 * 
 * React hook for integrating prayer times with medication scheduling:
 * - Prayer time conflict detection
 * - Schedule optimization
 * - Ramadan adjustments
 * - Cultural scheduling preferences
 */

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useAppSelector } from '../../store/hooks';
import { selectCulturalPreferences } from '../../store/slices/culturalSlice';
import { 
  PrayerSchedulingService, 
  PrayerSchedulingConfig,
  ScheduleOptimizationResult,
  PrayerTimeAvoidanceSettings,
  RamadanScheduleAdjustment
} from '../../services/prayer-scheduling';
import { MedicationSchedule, CulturalAdjustments } from '../../types/medication';
import { MalaysianState } from '../../types/cultural';
import { usePrayerTimes } from './usePrayerTimes';

export interface UsePrayerSchedulingOptions {
  enabled?: boolean;
  bufferMinutes?: number;
  madhab?: 'shafi' | 'hanafi';
  location?: {
    state: MalaysianState;
    coordinates: { latitude: number; longitude: number };
  };
  avoidanceSettings?: Partial<PrayerTimeAvoidanceSettings>;
}

export interface PrayerSchedulingState {
  config: PrayerSchedulingConfig;
  lastOptimization: ScheduleOptimizationResult | null;
  ramadanAdjustments: RamadanScheduleAdjustment | null;
  avoidanceSettings: PrayerTimeAvoidanceSettings;
  isOptimizing: boolean;
  error: string | null;
}

export interface PrayerSchedulingActions {
  optimizeSchedule: (medicationTimes: Date[]) => Promise<ScheduleOptimizationResult>;
  generateCulturalSchedule: (
    frequency: MedicationSchedule['frequency'],
    culturalAdjustments: CulturalAdjustments
  ) => Promise<{ schedule: Date[]; culturalNotes: string[] }>;
  updateConfig: (config: Partial<PrayerSchedulingConfig>) => void;
  updateAvoidanceSettings: (settings: Partial<PrayerTimeAvoidanceSettings>) => void;
  validateSchedule: (medicationTimes: Date[]) => Promise<{
    isValid: boolean;
    conflicts: any[];
    suggestions: string[];
  }>;
  isCurrentlyAvoidableTime: () => boolean;
  getOptimalSchedulingWindows: (date?: Date) => Promise<any[]>;
  generateRamadanSchedule: (originalTimes: Date[]) => Promise<RamadanScheduleAdjustment>;
  clearError: () => void;
}

export const usePrayerScheduling = (
  options: UsePrayerSchedulingOptions = {}
): PrayerSchedulingState & PrayerSchedulingActions => {
  const culturalPreferences = useAppSelector(selectCulturalPreferences);
  const prayerSchedulingService = useMemo(() => PrayerSchedulingService.getInstance(), []);
  const { prayerTimes, isPrayerTime } = usePrayerTimes({
    autoUpdate: true,
    madhab: options.madhab,
    location: options.location?.coordinates
  });

  // Initialize default config based on cultural preferences
  const getDefaultConfig = useCallback((): PrayerSchedulingConfig => {
    const defaultLocation = {
      state: (culturalPreferences?.location?.state as MalaysianState) || 'kuala_lumpur',
      coordinates: {
        latitude: 3.139,
        longitude: 101.6869
      }
    };

    return {
      enabled: options.enabled ?? culturalPreferences?.prayerTimes?.enabled ?? true,
      bufferMinutes: options.bufferMinutes ?? culturalPreferences?.prayerTimes?.buffer ?? 30,
      avoidPrayerTimes: culturalPreferences?.prayerTimes?.enabled ?? true,
      adjustForRamadan: culturalPreferences?.observesRamadan ?? true,
      madhab: options.madhab ?? culturalPreferences?.prayerTimes?.madhab ?? 'shafi',
      location: options.location || defaultLocation
    };
  }, [options, culturalPreferences]);

  const getDefaultAvoidanceSettings = useCallback((): PrayerTimeAvoidanceSettings => {
    const defaultBuffer = options.bufferMinutes ?? 30;
    const defaultSetting = { avoid: true, bufferMinutes: defaultBuffer };

    return {
      fajr: options.avoidanceSettings?.fajr ?? defaultSetting,
      dhuhr: options.avoidanceSettings?.dhuhr ?? defaultSetting,
      asr: options.avoidanceSettings?.asr ?? defaultSetting,
      maghrib: options.avoidanceSettings?.maghrib ?? defaultSetting,
      isha: options.avoidanceSettings?.isha ?? defaultSetting
    };
  }, [options]);

  const [state, setState] = useState<PrayerSchedulingState>({
    config: getDefaultConfig(),
    lastOptimization: null,
    ramadanAdjustments: null,
    avoidanceSettings: getDefaultAvoidanceSettings(),
    isOptimizing: false,
    error: null
  });

  // Actions
  const optimizeSchedule = useCallback(async (
    medicationTimes: Date[]
  ): Promise<ScheduleOptimizationResult> => {
    setState(prev => ({ ...prev, isOptimizing: true, error: null }));

    try {
      const result = await prayerSchedulingService.optimizeMedicationSchedule(
        medicationTimes,
        state.config
      );

      setState(prev => ({
        ...prev,
        lastOptimization: result,
        isOptimizing: false
      }));

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Optimization failed';
      setState(prev => ({
        ...prev,
        isOptimizing: false,
        error: errorMessage
      }));

      // Return fallback result
      return {
        optimizedTimes: medicationTimes,
        conflicts: [],
        warnings: [errorMessage],
        culturalNotes: [],
        alternativeSuggestions: []
      };
    }
  }, [prayerSchedulingService, state.config]);

  const generateCulturalSchedule = useCallback(async (
    frequency: MedicationSchedule['frequency'],
    culturalAdjustments: CulturalAdjustments
  ): Promise<{ schedule: Date[]; culturalNotes: string[] }> => {
    setState(prev => ({ ...prev, isOptimizing: true, error: null }));

    try {
      const result = await prayerSchedulingService.generateCulturalSchedule(
        frequency,
        culturalAdjustments,
        state.config
      );

      setState(prev => ({ ...prev, isOptimizing: false }));
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Schedule generation failed';
      setState(prev => ({
        ...prev,
        isOptimizing: false,
        error: errorMessage
      }));

      // Return fallback schedule
      return {
        schedule: getBasicSchedule(frequency),
        culturalNotes: ['Failed to generate cultural schedule, using basic pattern']
      };
    }
  }, [prayerSchedulingService, state.config]);

  const updateConfig = useCallback((configUpdates: Partial<PrayerSchedulingConfig>) => {
    setState(prev => ({
      ...prev,
      config: { ...prev.config, ...configUpdates }
    }));

    // Update the service config
    prayerSchedulingService.updateConfig(configUpdates);
  }, [prayerSchedulingService]);

  const updateAvoidanceSettings = useCallback((
    settingsUpdates: Partial<PrayerTimeAvoidanceSettings>
  ) => {
    setState(prev => ({
      ...prev,
      avoidanceSettings: { ...prev.avoidanceSettings, ...settingsUpdates }
    }));
  }, []);

  const validateSchedule = useCallback(async (medicationTimes: Date[]) => {
    if (!prayerTimes) {
      return {
        isValid: true,
        conflicts: [],
        suggestions: ['Prayer times not available for validation']
      };
    }

    try {
      const optimizationResult = await prayerSchedulingService.optimizeMedicationSchedule(
        medicationTimes,
        state.config
      );

      const hasConflicts = optimizationResult.conflicts.length > 0;
      const suggestions: string[] = [];

      if (hasConflicts) {
        suggestions.push(
          `${optimizationResult.conflicts.length} prayer time conflicts detected`,
          ...optimizationResult.culturalNotes,
          ...optimizationResult.warnings
        );
      } else {
        suggestions.push('Schedule is optimized for prayer times');
      }

      return {
        isValid: !hasConflicts,
        conflicts: optimizationResult.conflicts,
        suggestions
      };
    } catch (error) {
      return {
        isValid: false,
        conflicts: [],
        suggestions: ['Unable to validate schedule due to calculation error']
      };
    }
  }, [prayerSchedulingService, state.config, prayerTimes]);

  const isCurrentlyAvoidableTime = useCallback((): boolean => {
    if (!state.config.enabled || !state.config.avoidPrayerTimes) {
      return false;
    }

    return isPrayerTime(state.config.bufferMinutes);
  }, [state.config, isPrayerTime]);

  const getOptimalSchedulingWindows = useCallback(async (date: Date = new Date()) => {
    try {
      return await prayerSchedulingService.getOptimalSchedulingWindows(date, state.config);
    } catch (error) {
      console.error('Failed to get scheduling windows:', error);
      return [];
    }
  }, [prayerSchedulingService, state.config]);

  const generateRamadanSchedule = useCallback(async (
    originalTimes: Date[]
  ): Promise<RamadanScheduleAdjustment> => {
    try {
      const optimizationResult = await prayerSchedulingService.optimizeMedicationSchedule(
        originalTimes,
        { ...state.config, adjustForRamadan: true }
      );

      const ramadanAdjustments = optimizationResult.ramadanAdjustments || {
        originalSchedule: originalTimes,
        adjustedSchedule: optimizationResult.optimizedTimes,
        adjustmentReason: optimizationResult.culturalNotes,
        suhoorWindow: { start: new Date(), end: new Date() },
        iftarWindow: { start: new Date(), end: new Date() },
        nightWindow: { start: new Date(), end: new Date() }
      };

      setState(prev => ({ ...prev, ramadanAdjustments }));
      return ramadanAdjustments;
    } catch (error) {
      console.error('Failed to generate Ramadan schedule:', error);
      throw error;
    }
  }, [prayerSchedulingService, state.config]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // Helper function for basic schedule generation
  const getBasicSchedule = (frequency: MedicationSchedule['frequency']): Date[] => {
    const baseDate = new Date();
    baseDate.setHours(0, 0, 0, 0);

    const patterns: Record<string, number[]> = {
      daily: [9],
      twice_daily: [8, 20],
      three_times: [8, 14, 20],
      four_times: [8, 13, 17, 21],
      weekly: [9],
      as_needed: [],
      custom: []
    };

    const hours = patterns[frequency] || [9];
    
    return hours.map(hour => {
      const time = new Date(baseDate);
      time.setHours(hour, 0, 0, 0);
      return time;
    });
  };

  // Update config when cultural preferences change
  useEffect(() => {
    const newConfig = getDefaultConfig();
    setState(prev => ({ ...prev, config: newConfig }));
    prayerSchedulingService.updateConfig(newConfig);
  }, [getDefaultConfig, prayerSchedulingService]);

  // Update avoidance settings when options change
  useEffect(() => {
    const newAvoidanceSettings = getDefaultAvoidanceSettings();
    setState(prev => ({ ...prev, avoidanceSettings: newAvoidanceSettings }));
  }, [getDefaultAvoidanceSettings]);

  return {
    // State
    ...state,

    // Actions
    optimizeSchedule,
    generateCulturalSchedule,
    updateConfig,
    updateAvoidanceSettings,
    validateSchedule,
    isCurrentlyAvoidableTime,
    getOptimalSchedulingWindows,
    generateRamadanSchedule,
    clearError
  };
};