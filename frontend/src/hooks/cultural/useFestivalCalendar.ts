/**
 * Festival Calendar Hook
 * 
 * React hook for managing Malaysian festival calendar data
 * with medication scheduling integration
 */

import { useState, useEffect, useCallback } from 'react';
import { festivalCalendarService, FestivalEvent, RamadanSchedule } from '../../services/festivals/FestivalCalendarService';

export interface UseFestivalCalendarResult {
  // Festival data
  festivals: FestivalEvent[];
  upcomingFestivals: FestivalEvent[];
  currentFestival: FestivalEvent | null;
  
  // Ramadan-specific
  ramadanSchedule: RamadanSchedule | null;
  isCurrentlyRamadan: boolean;
  ramadanDaysRemaining: number | null;
  ramadanPhase: 'beginning' | 'middle' | 'end' | null;
  
  // Loading states
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  
  // Actions
  refreshCalendar: () => Promise<void>;
  getFestivalsByType: (type: 'islamic' | 'chinese' | 'hindu' | 'malaysian' | 'public_holiday') => FestivalEvent[];
  checkFestivalConflict: (date: Date) => Promise<{
    hasFestival: boolean;
    festivals: FestivalEvent[];
    medicationImpact: boolean;
    recommendations: string[];
  }>;
  getFestivalMedicationGuidance: (festivalId: string, medicationType: string) => Promise<any>;
}

export const useFestivalCalendar = (
  options: {
    autoRefresh?: boolean;
    daysAhead?: number;
    enableRamadan?: boolean;
  } = {}
): UseFestivalCalendarResult => {
  const {
    autoRefresh = true,
    daysAhead = 30,
    enableRamadan = true
  } = options;

  const [festivals, setFestivals] = useState<FestivalEvent[]>([]);
  const [upcomingFestivals, setUpcomingFestivals] = useState<FestivalEvent[]>([]);
  const [currentFestival, setCurrentFestival] = useState<FestivalEvent | null>(null);
  const [ramadanSchedule, setRamadanSchedule] = useState<RamadanSchedule | null>(null);
  const [isCurrentlyRamadan, setIsCurrentlyRamadan] = useState(false);
  const [ramadanDaysRemaining, setRamadanDaysRemaining] = useState<number | null>(null);
  const [ramadanPhase, setRamadanPhase] = useState<'beginning' | 'middle' | 'end' | null>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load festival calendar data
   */
  const loadFestivalData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      // Load all festivals for current year
      const allFestivals = await festivalCalendarService.getFestivalCalendar();
      setFestivals(allFestivals);

      // Load upcoming festivals
      const upcoming = await festivalCalendarService.getUpcomingFestivals(daysAhead);
      setUpcomingFestivals(upcoming);

      // Check for current festival
      const now = new Date();
      const currentFestivalData = await festivalCalendarService.checkFestivalConflict(now);
      if (currentFestivalData.hasFestival && currentFestivalData.festivals.length > 0) {
        setCurrentFestival(currentFestivalData.festivals[0]);
      } else {
        setCurrentFestival(null);
      }

      // Load Ramadan data if enabled
      if (enableRamadan) {
        const ramadanData = await festivalCalendarService.getRamadanSchedule();
        setRamadanSchedule(ramadanData);

        const currentRamadanStatus = await festivalCalendarService.isCurrentlyRamadan();
        setIsCurrentlyRamadan(currentRamadanStatus.isRamadan);
        setRamadanDaysRemaining(currentRamadanStatus.daysRemaining || null);
        setRamadanPhase(currentRamadanStatus.currentPhase || null);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load festival calendar';
      setError(errorMessage);
      console.error('Festival calendar loading error:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [daysAhead, enableRamadan]);

  /**
   * Refresh calendar data
   */
  const refreshCalendar = useCallback(async () => {
    await loadFestivalData(true);
  }, [loadFestivalData]);

  /**
   * Get festivals by specific type
   */
  const getFestivalsByType = useCallback((
    type: 'islamic' | 'chinese' | 'hindu' | 'malaysian' | 'public_holiday'
  ): FestivalEvent[] => {
    return festivals.filter(festival => festival.type === type);
  }, [festivals]);

  /**
   * Check for festival conflicts on a specific date
   */
  const checkFestivalConflict = useCallback(async (date: Date) => {
    try {
      return await festivalCalendarService.checkFestivalConflict(date);
    } catch (err) {
      console.error('Festival conflict check error:', err);
      return {
        hasFestival: false,
        festivals: [],
        medicationImpact: false,
        recommendations: []
      };
    }
  }, []);

  /**
   * Get medication guidance for a specific festival
   */
  const getFestivalMedicationGuidance = useCallback(async (
    festivalId: string,
    medicationType: string
  ) => {
    try {
      return await festivalCalendarService.getFestivalMedicationGuidance(
        festivalId,
        medicationType
      );
    } catch (err) {
      console.error('Festival medication guidance error:', err);
      return null;
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadFestivalData();
  }, [loadFestivalData]);

  // Auto-refresh setup
  useEffect(() => {
    if (!autoRefresh) return;

    // Refresh daily at midnight
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const msUntilMidnight = tomorrow.getTime() - now.getTime();
    
    const timeoutId = setTimeout(() => {
      refreshCalendar();
      
      // Set up daily refresh interval
      const intervalId = setInterval(() => {
        refreshCalendar();
      }, 24 * 60 * 60 * 1000); // 24 hours
      
      return () => clearInterval(intervalId);
    }, msUntilMidnight);

    return () => clearTimeout(timeoutId);
  }, [autoRefresh, refreshCalendar]);

  return {
    festivals,
    upcomingFestivals,
    currentFestival,
    ramadanSchedule,
    isCurrentlyRamadan,
    ramadanDaysRemaining,
    ramadanPhase,
    isLoading,
    isRefreshing,
    error,
    refreshCalendar,
    getFestivalsByType,
    checkFestivalConflict,
    getFestivalMedicationGuidance
  };
};