/**
 * Prayer Times Hook
 * 
 * React hook for managing Islamic prayer times with:
 * - Real-time prayer time calculations
 * - Automatic location-based updates
 * - Madhab support (Shafi'i and Hanafi)
 * - Qibla direction integration
 * - Cultural preferences integration
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAppSelector } from '../../store/hooks';
import { selectCulturalPreferences } from '../../store/slices/culturalSlice';
import { 
  PrayerTimeService, 
  PrayerTimes, 
  PrayerTimeCalculationParams 
} from '../../services/prayer-scheduling';
import { MalaysianState, MALAYSIAN_STATES_DATA } from '../../types/cultural';

export interface UsePrayerTimesOptions {
  autoUpdate?: boolean;
  updateInterval?: number; // minutes
  location?: {
    latitude: number;
    longitude: number;
    state?: MalaysianState;
  };
  madhab?: 'shafi' | 'hanafi';
  date?: Date;
}

export interface PrayerTimeState {
  prayerTimes: PrayerTimes | null;
  currentPrayer: {
    name: string;
    time: Date;
    isActive: boolean;
  } | null;
  nextPrayer: {
    name: string;
    time: Date;
    minutesUntil: number;
  } | null;
  qiblaDirection: number | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

export interface PrayerTimeActions {
  refreshPrayerTimes: () => Promise<void>;
  updateLocation: (location: { latitude: number; longitude: number; state?: MalaysianState }) => void;
  updateMadhab: (madhab: 'shafi' | 'hanafi') => void;
  clearError: () => void;
  isPrayerTime: (bufferMinutes?: number) => boolean;
  getTimeUntilNextPrayer: () => number | null;
  getPrayerTimeForDate: (date: Date) => Promise<PrayerTimes | null>;
}

export const usePrayerTimes = (options: UsePrayerTimesOptions = {}): PrayerTimeState & PrayerTimeActions => {
  const culturalPreferences = useAppSelector(selectCulturalPreferences);
  const prayerService = useMemo(() => PrayerTimeService.getInstance(), []);

  const [state, setState] = useState<PrayerTimeState>({
    prayerTimes: null,
    currentPrayer: null,
    nextPrayer: null,
    qiblaDirection: null,
    isLoading: false,
    error: null,
    lastUpdated: null
  });

  const [location, setLocation] = useState(
    options.location || {
      latitude: 3.139,
      longitude: 101.6869,
      state: 'kuala_lumpur' as MalaysianState
    }
  );

  const [madhab, setMadhab] = useState<'shafi' | 'hanafi'>(
    options.madhab || culturalPreferences?.prayerTimes?.madhab || 'shafi'
  );

  // Calculate prayer times
  const calculatePrayerTimes = useCallback(async (date: Date = new Date()) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      const params: PrayerTimeCalculationParams = {
        latitude: location.latitude,
        longitude: location.longitude,
        date,
        madhab,
        method: 'jakim',
        adjustments: culturalPreferences?.prayerTimes?.adjustments
      };

      const prayerTimes = await prayerService.calculatePrayerTimes(params);
      const currentPrayer = getCurrentPrayer(prayerTimes, date);
      const nextPrayer = getNextPrayerInfo(prayerTimes, date);

      setState(prev => ({
        ...prev,
        prayerTimes,
        currentPrayer,
        nextPrayer,
        qiblaDirection: prayerTimes.qibla,
        isLoading: false,
        lastUpdated: new Date()
      }));

    } catch (error) {
      console.error('Failed to calculate prayer times:', error);
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to calculate prayer times'
      }));
    }
  }, [location, madhab, culturalPreferences, prayerService]);

  // Get current prayer information
  const getCurrentPrayer = (prayerTimes: PrayerTimes, date: Date) => {
    const prayers = [
      { name: 'fajr', time: prayerTimes.fajr },
      { name: 'dhuhr', time: prayerTimes.dhuhr },
      { name: 'asr', time: prayerTimes.asr },
      { name: 'maghrib', time: prayerTimes.maghrib },
      { name: 'isha', time: prayerTimes.isha }
    ].sort((a, b) => a.time.getTime() - b.time.getTime());

    // Check if currently within 30 minutes of any prayer time
    const bufferMs = 30 * 60 * 1000; // 30 minutes in milliseconds
    
    for (const prayer of prayers) {
      const timeDiff = Math.abs(date.getTime() - prayer.time.getTime());
      if (timeDiff <= bufferMs) {
        return {
          name: prayer.name,
          time: prayer.time,
          isActive: timeDiff <= 15 * 60 * 1000 // Within 15 minutes is considered "active"
        };
      }
    }

    return null;
  };

  // Get next prayer information
  const getNextPrayerInfo = (prayerTimes: PrayerTimes, date: Date) => {
    const prayers = [
      { name: 'fajr', time: prayerTimes.fajr },
      { name: 'dhuhr', time: prayerTimes.dhuhr },
      { name: 'asr', time: prayerTimes.asr },
      { name: 'maghrib', time: prayerTimes.maghrib },
      { name: 'isha', time: prayerTimes.isha }
    ].sort((a, b) => a.time.getTime() - b.time.getTime());

    for (const prayer of prayers) {
      if (prayer.time > date) {
        const minutesUntil = Math.round((prayer.time.getTime() - date.getTime()) / (1000 * 60));
        return {
          name: prayer.name,
          time: prayer.time,
          minutesUntil
        };
      }
    }

    // If no prayer found today, return tomorrow's Fajr
    const tomorrowFajr = new Date(prayerTimes.fajr);
    tomorrowFajr.setDate(tomorrowFajr.getDate() + 1);
    const minutesUntil = Math.round((tomorrowFajr.getTime() - date.getTime()) / (1000 * 60));
    
    return {
      name: 'fajr',
      time: tomorrowFajr,
      minutesUntil
    };
  };

  // Actions
  const refreshPrayerTimes = useCallback(async () => {
    await calculatePrayerTimes(options.date || new Date());
  }, [calculatePrayerTimes, options.date]);

  const updateLocation = useCallback((newLocation: { latitude: number; longitude: number; state?: MalaysianState }) => {
    setLocation(prev => ({ ...prev, ...newLocation }));
  }, []);

  const updateMadhab = useCallback((newMadhab: 'shafi' | 'hanafi') => {
    setMadhab(newMadhab);
  }, []);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const isPrayerTime = useCallback((bufferMinutes: number = 30): boolean => {
    if (!state.prayerTimes) return false;

    const now = new Date();
    const prayers = [
      state.prayerTimes.fajr,
      state.prayerTimes.dhuhr,
      state.prayerTimes.asr,
      state.prayerTimes.maghrib,
      state.prayerTimes.isha
    ];

    return prayers.some(prayerTime => {
      const timeDiff = Math.abs(now.getTime() - prayerTime.getTime()) / (1000 * 60);
      return timeDiff <= bufferMinutes;
    });
  }, [state.prayerTimes]);

  const getTimeUntilNextPrayer = useCallback((): number | null => {
    return state.nextPrayer?.minutesUntil || null;
  }, [state.nextPrayer]);

  const getPrayerTimeForDate = useCallback(async (date: Date): Promise<PrayerTimes | null> => {
    try {
      const params: PrayerTimeCalculationParams = {
        latitude: location.latitude,
        longitude: location.longitude,
        date,
        madhab,
        method: 'jakim',
        adjustments: culturalPreferences?.prayerTimes?.adjustments
      };

      return await prayerService.calculatePrayerTimes(params);
    } catch (error) {
      console.error('Failed to get prayer time for date:', error);
      return null;
    }
  }, [location, madhab, culturalPreferences, prayerService]);

  // Initialize prayer times on mount and location/madhab changes
  useEffect(() => {
    calculatePrayerTimes(options.date);
  }, [calculatePrayerTimes, options.date]);

  // Auto-update prayer times
  useEffect(() => {
    if (!options.autoUpdate) return;

    const intervalMinutes = options.updateInterval || 60; // Default 1 hour
    const intervalMs = intervalMinutes * 60 * 1000;

    const interval = setInterval(() => {
      calculatePrayerTimes();
    }, intervalMs);

    return () => clearInterval(interval);
  }, [options.autoUpdate, options.updateInterval, calculatePrayerTimes]);

  // Update next prayer info every minute
  useEffect(() => {
    if (!state.prayerTimes) return;

    const interval = setInterval(() => {
      const now = new Date();
      const currentPrayer = getCurrentPrayer(state.prayerTimes!, now);
      const nextPrayer = getNextPrayerInfo(state.prayerTimes!, now);

      setState(prev => ({
        ...prev,
        currentPrayer,
        nextPrayer
      }));
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, [state.prayerTimes]);

  // Update location from cultural preferences
  useEffect(() => {
    if (culturalPreferences?.location) {
      const stateData = MALAYSIAN_STATES_DATA[culturalPreferences.location.state as MalaysianState];
      if (stateData) {
        setLocation({
          latitude: stateData.coordinates.latitude,
          longitude: stateData.coordinates.longitude,
          state: culturalPreferences.location.state as MalaysianState
        });
      }
    }
  }, [culturalPreferences?.location]);

  return {
    // State
    ...state,
    
    // Actions
    refreshPrayerTimes,
    updateLocation,
    updateMadhab,
    clearError,
    isPrayerTime,
    getTimeUntilNextPrayer,
    getPrayerTimeForDate
  };
};