/**
 * Prayer Time Integration Hook
 *
 * React hook for managing prayer time integration with medication scheduling
 */

import { useState, useEffect, useCallback } from 'react';
import { Alert } from 'react-native';
import PrayerTimeService, {
  PrayerTimes,
  MedicationSchedulingWindow,
  PrayerConflict,
  PrayerTimeCalculationParams
} from '../../services/prayer-scheduling/PrayerTimeService';
import { useLocation } from '../location';
import { useCulturalProfile } from './useCulturalProfile';
import { useTranslation } from '../../i18n';

export interface UsePrayerTimeIntegrationReturn {
  // Prayer time data
  prayerTimes: PrayerTimes | null;
  schedulingWindows: MedicationSchedulingWindow[];
  conflicts: PrayerConflict[];
  nextPrayer: { name: string; time: Date } | null;
  qiblaDirection: number | null;

  // Status
  isLoading: boolean;
  error: string | null;

  // Actions
  refreshPrayerTimes: () => Promise<void>;
  checkConflicts: (medicationTimes: Date[], prayerTimes: PrayerTimes, bufferMinutes?: number) => Promise<PrayerConflict[]>;
  getMedicationWindows: (prayerTimes: PrayerTimes, bufferMinutes?: number) => Promise<MedicationSchedulingWindow[]>;
  updatePrayerSettings: (settings: Partial<PrayerSettings>) => Promise<void>;
}

interface PrayerSettings {
  madhab: 'shafi' | 'hanafi';
  calculationMethod: 'jakim' | 'isna' | 'mwl' | 'egypt' | 'makkah';
  bufferMinutes: number;
  adjustments?: {
    fajr: number;
    dhuhr: number;
    asr: number;
    maghrib: number;
    isha: number;
  };
}

export const usePrayerTimeIntegration = (
  customLocation?: { latitude: number; longitude: number }
): UsePrayerTimeIntegrationReturn => {
  const [prayerTimes, setPrayerTimes] = useState<PrayerTimes | null>(null);
  const [schedulingWindows, setSchedulingWindows] = useState<MedicationSchedulingWindow[]>([]);
  const [conflicts, setConflicts] = useState<PrayerConflict[]>([]);
  const [nextPrayer, setNextPrayer] = useState<{ name: string; time: Date } | null>(null);
  const [qiblaDirection, setQiblaDirection] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { location } = useLocation();
  const { culturalProfile } = useCulturalProfile();
  const { t } = useTranslation();

  const prayerService = PrayerTimeService.getInstance();

  /**
   * Get current location for prayer time calculation
   */
  const getCurrentLocation = useCallback(() => {
    if (customLocation) return customLocation;
    if (location) return { latitude: location.latitude, longitude: location.longitude };

    // Default to Kuala Lumpur if no location available
    return { latitude: 3.139, longitude: 101.6869 };
  }, [customLocation, location]);

  /**
   * Get prayer calculation parameters from cultural profile
   */
  const getPrayerCalculationParams = useCallback((): PrayerTimeCalculationParams => {
    const currentLocation = getCurrentLocation();
    const preferences = culturalProfile?.preferences?.prayerTimes;

    return {
      latitude: currentLocation.latitude,
      longitude: currentLocation.longitude,
      date: new Date(),
      madhab: preferences?.madhab || 'shafi',
      method: 'jakim', // Default to JAKIM for Malaysia
      adjustments: preferences?.adjustments || {
        fajr: 0,
        dhuhr: 0,
        asr: 0,
        maghrib: 0,
        isha: 0
      }
    };
  }, [getCurrentLocation, culturalProfile]);

  /**
   * Load prayer times for current date and location
   */
  const loadPrayerTimes = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const params = getPrayerCalculationParams();
      const times = await prayerService.calculatePrayerTimes(params);

      setPrayerTimes(times);
      setQiblaDirection(times.qibla);

      // Calculate next prayer
      const next = prayerService.getNextPrayer(times);
      setNextPrayer(next);

      // Calculate scheduling windows
      const windows = await prayerService.getMedicationSchedulingWindows(
        times,
        culturalProfile?.preferences?.prayerTimes?.medicationBuffer || 30
      );
      setSchedulingWindows(windows);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : t('prayer.error_loading');
      setError(errorMessage);
      console.error('Failed to load prayer times:', err);
    } finally {
      setIsLoading(false);
    }
  }, [getPrayerCalculationParams, prayerService, culturalProfile, t]);

  /**
   * Refresh prayer times
   */
  const refreshPrayerTimes = useCallback(async () => {
    // Clear cache to force fresh calculation
    prayerService.clearCache();
    await loadPrayerTimes();
  }, [loadPrayerTimes, prayerService]);

  /**
   * Check for medication conflicts with prayer times
   */
  const checkConflicts = useCallback(async (
    medicationTimes: Date[],
    prayerTimesToCheck: PrayerTimes,
    bufferMinutes: number = 30
  ): Promise<PrayerConflict[]> => {
    try {
      const detectedConflicts = prayerService.checkMedicationConflicts(
        medicationTimes,
        prayerTimesToCheck,
        bufferMinutes
      );

      setConflicts(detectedConflicts);

      // Show notification for high severity conflicts
      const highSeverityConflicts = detectedConflicts.filter(c => c.severity === 'high');
      if (highSeverityConflicts.length > 0) {
        Alert.alert(
          t('prayer.high_conflict_title'),
          t('prayer.high_conflict_message', { count: highSeverityConflicts.length }),
          [
            { text: t('common.dismiss'), style: 'cancel' },
            { text: t('prayer.review_conflicts'), onPress: () => {} }
          ]
        );
      }

      return detectedConflicts;
    } catch (err) {
      console.error('Failed to check conflicts:', err);
      return [];
    }
  }, [prayerService, t]);

  /**
   * Get medication scheduling windows
   */
  const getMedicationWindows = useCallback(async (
    prayerTimesToCheck: PrayerTimes,
    bufferMinutes: number = 30
  ): Promise<MedicationSchedulingWindow[]> => {
    try {
      const windows = await prayerService.getMedicationSchedulingWindows(
        prayerTimesToCheck,
        bufferMinutes
      );

      setSchedulingWindows(windows);
      return windows;
    } catch (err) {
      console.error('Failed to get medication windows:', err);
      return [];
    }
  }, [prayerService]);

  /**
   * Update prayer settings and recalculate
   */
  const updatePrayerSettings = useCallback(async (settings: Partial<PrayerSettings>) => {
    try {
      // In a real app, this would update the user's cultural profile
      // For now, we'll trigger a recalculation with new settings
      await loadPrayerTimes();
    } catch (err) {
      console.error('Failed to update prayer settings:', err);
      setError(t('prayer.error_updating_settings'));
    }
  }, [loadPrayerTimes, t]);

  /**
   * Load prayer times on mount and when dependencies change
   */
  useEffect(() => {
    loadPrayerTimes();
  }, [loadPrayerTimes]);

  /**
   * Set up automatic refresh at midnight to get new day's prayer times
   */
  useEffect(() => {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const msUntilMidnight = tomorrow.getTime() - now.getTime();

    const timeout = setTimeout(() => {
      loadPrayerTimes();
    }, msUntilMidnight);

    return () => clearTimeout(timeout);
  }, [loadPrayerTimes]);

  return {
    prayerTimes,
    schedulingWindows,
    conflicts,
    nextPrayer,
    qiblaDirection,
    isLoading,
    error,
    refreshPrayerTimes,
    checkConflicts,
    getMedicationWindows,
    updatePrayerSettings,
  };
};