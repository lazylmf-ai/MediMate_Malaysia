/**
 * Cultural Navigation Hook
 * 
 * Provides navigation utilities with cultural context awareness,
 * prayer time considerations, and cultural preference handling.
 */

import { useCallback, useMemo, useEffect, useState } from 'react';
import { useNavigation, CommonActions, useFocusEffect } from '@react-navigation/native';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import type { CulturalProfile } from '@/types/cultural';

interface CulturalNavigationOptions {
  respectPrayerTimes?: boolean;
  considerFestivalDates?: boolean;
  adaptToLanguage?: boolean;
  trackCulturalPatterns?: boolean;
}

interface PrayerTimeInfo {
  name: string;
  time: Date;
  isActive: boolean;
  minutesUntil: number;
}

interface CulturalNavigationResult {
  // Navigation functions
  navigateWithCulturalContext: (route: string, params?: any) => void;
  navigateRespectingPrayerTime: (route: string, params?: any, options?: { delay?: boolean }) => Promise<void>;
  navigateToLocalizedScreen: (route: string, params?: any) => void;
  
  // Cultural context
  getCurrentPrayerInfo: () => PrayerTimeInfo | null;
  isPrayerTimeActive: () => boolean;
  getNextPrayerTime: () => PrayerTimeInfo | null;
  isActiveFestivalPeriod: () => boolean;
  
  // Cultural preferences
  getLocalizedRoute: (route: string) => string;
  getCulturalTheme: () => string;
  shouldShowCulturalInsights: () => boolean;
  
  // Navigation analytics
  trackCulturalNavigation: (route: string, culturalContext?: any) => void;
  getCulturalNavigationHistory: () => any[];
}

/**
 * Cultural Navigation Hook
 */
export function useCulturalNavigation(
  options: CulturalNavigationOptions = {}
): CulturalNavigationResult {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  
  const { profile } = useAppSelector((state) => state.cultural);
  const { user } = useAppSelector((state) => state.auth);
  
  const [navigationHistory, setNavigationHistory] = useState<any[]>([]);
  const [currentPrayerInfo, setCurrentPrayerInfo] = useState<PrayerTimeInfo | null>(null);

  // Memoized cultural context
  const culturalContext = useMemo(() => {
    if (!profile) return null;
    
    return {
      language: profile.language,
      timezone: profile.timezone,
      prayerTimes: profile.prayerTimes,
      festivals: profile.festivals,
      familyStructure: profile.familyStructure,
    };
  }, [profile]);

  // Prayer time calculations
  const calculateCurrentPrayerInfo = useCallback((): PrayerTimeInfo | null => {
    if (!profile?.prayerTimes?.enabled || !profile.timezone) {
      return null;
    }

    const now = new Date();
    const prayerTimes = getCurrentPrayerTimes();
    
    // Find the current or next prayer time
    for (const prayer of prayerTimes) {
      const prayerTime = new Date(prayer.time);
      const diffMinutes = Math.floor((prayerTime.getTime() - now.getTime()) / (1000 * 60));
      
      if (diffMinutes >= -15 && diffMinutes <= 15) {
        // Prayer time is active (15 minutes before/after)
        return {
          name: prayer.name,
          time: prayerTime,
          isActive: true,
          minutesUntil: diffMinutes,
        };
      }
    }

    return null;
  }, [profile]);

  const getCurrentPrayerTimes = useCallback(() => {
    // This would integrate with actual prayer time calculation service
    // For now, return mock data
    const now = new Date();
    return [
      { name: 'Fajr', time: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 5, 30) },
      { name: 'Dhuhr', time: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 45) },
      { name: 'Asr', time: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 16, 0) },
      { name: 'Maghrib', time: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 19, 15) },
      { name: 'Isha', time: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 20, 45) },
    ];
  }, []);

  // Navigation functions
  const navigateWithCulturalContext = useCallback((route: string, params: any = {}) => {
    const contextualParams = {
      ...params,
      culturalContext,
      timestamp: Date.now(),
    };

    if (options.trackCulturalPatterns) {
      trackCulturalNavigation(route, culturalContext);
    }

    navigation.dispatch(
      CommonActions.navigate(route, contextualParams)
    );
  }, [navigation, culturalContext, options.trackCulturalPatterns]);

  const navigateRespectingPrayerTime = useCallback(async (
    route: string,
    params: any = {},
    navOptions: { delay?: boolean } = {}
  ) => {
    if (!options.respectPrayerTimes || !profile?.prayerTimes?.enabled) {
      navigateWithCulturalContext(route, params);
      return;
    }

    const prayerInfo = calculateCurrentPrayerInfo();
    
    if (prayerInfo?.isActive && navOptions.delay) {
      // Show prayer time notification and delay navigation
      console.log(`Delaying navigation to respect ${prayerInfo.name} prayer time`);
      
      // Schedule navigation after prayer time
      setTimeout(() => {
        navigateWithCulturalContext(route, {
          ...params,
          delayedForPrayer: true,
          prayerReason: prayerInfo.name,
        });
      }, Math.abs(prayerInfo.minutesUntil) * 60 * 1000);
      
      return;
    }

    navigateWithCulturalContext(route, params);
  }, [
    navigateWithCulturalContext,
    options.respectPrayerTimes,
    profile?.prayerTimes?.enabled,
    calculateCurrentPrayerInfo,
  ]);

  const navigateToLocalizedScreen = useCallback((route: string, params: any = {}) => {
    if (!options.adaptToLanguage || !profile?.language) {
      navigateWithCulturalContext(route, params);
      return;
    }

    const localizedRoute = getLocalizedRoute(route);
    const localizedParams = {
      ...params,
      language: profile.language,
      localized: true,
    };

    navigateWithCulturalContext(localizedRoute, localizedParams);
  }, [navigateWithCulturalContext, options.adaptToLanguage, profile?.language]);

  // Cultural context functions
  const getCurrentPrayerInfo = useCallback(() => {
    return currentPrayerInfo;
  }, [currentPrayerInfo]);

  const isPrayerTimeActive = useCallback(() => {
    return currentPrayerInfo?.isActive ?? false;
  }, [currentPrayerInfo]);

  const getNextPrayerTime = useCallback((): PrayerTimeInfo | null => {
    if (!profile?.prayerTimes?.enabled) {
      return null;
    }

    const now = new Date();
    const prayerTimes = getCurrentPrayerTimes();
    
    // Find next prayer time
    for (const prayer of prayerTimes) {
      const prayerTime = new Date(prayer.time);
      const diffMinutes = Math.floor((prayerTime.getTime() - now.getTime()) / (1000 * 60));
      
      if (diffMinutes > 0) {
        return {
          name: prayer.name,
          time: prayerTime,
          isActive: false,
          minutesUntil: diffMinutes,
        };
      }
    }

    return null;
  }, [profile?.prayerTimes?.enabled, getCurrentPrayerTimes]);

  const isActiveFestivalPeriod = useCallback(() => {
    if (!options.considerFestivalDates || !profile?.festivals) {
      return false;
    }

    // This would integrate with cultural calendar service
    // For now, return false
    return false;
  }, [options.considerFestivalDates, profile?.festivals]);

  // Cultural preference functions
  const getLocalizedRoute = useCallback((route: string) => {
    if (!profile?.language || profile.language === 'en') {
      return route;
    }

    // Route localization mapping
    const routeMapping: Record<string, Record<string, string>> = {
      'Home': {
        'ms': 'Utama',
        'zh': '首页',
        'ta': 'முகப்பு',
      },
      'Medications': {
        'ms': 'Ubat',
        'zh': '药物',
        'ta': 'மருந்துகள்',
      },
      'Family': {
        'ms': 'Keluarga',
        'zh': '家庭',
        'ta': 'குடும்பம்',
      },
      'Profile': {
        'ms': 'Profil',
        'zh': '个人资料',
        'ta': 'சுயவிவரம்',
      },
    };

    return routeMapping[route]?.[profile.language] || route;
  }, [profile?.language]);

  const getCulturalTheme = useCallback(() => {
    if (!profile?.language) {
      return 'default';
    }

    const themes = {
      'ms': 'malaysian',
      'zh': 'chinese',
      'ta': 'tamil',
      'en': 'international',
    };

    return themes[profile.language] || 'default';
  }, [profile?.language]);

  const shouldShowCulturalInsights = useCallback(() => {
    if (!profile) return false;

    // Show insights if user has cultural preferences set
    return !!(
      profile.prayerTimes?.enabled ||
      Object.values(profile.festivals || {}).some(enabled => enabled) ||
      profile.familyStructure
    );
  }, [profile]);

  // Analytics functions
  const trackCulturalNavigation = useCallback((route: string, context?: any) => {
    const navigationEvent = {
      route,
      culturalContext: context,
      timestamp: Date.now(),
      userLanguage: profile?.language,
      prayerTimeActive: isPrayerTimeActive(),
    };

    setNavigationHistory(prev => [
      ...prev.slice(-49), // Keep last 50 entries
      navigationEvent,
    ]);

    // This would integrate with analytics service
    console.log('Cultural navigation tracked:', navigationEvent);
  }, [profile?.language, isPrayerTimeActive]);

  const getCulturalNavigationHistory = useCallback(() => {
    return navigationHistory;
  }, [navigationHistory]);

  // Update prayer time info periodically
  useEffect(() => {
    const updatePrayerInfo = () => {
      setCurrentPrayerInfo(calculateCurrentPrayerInfo());
    };

    updatePrayerInfo();
    
    // Update every minute
    const interval = setInterval(updatePrayerInfo, 60000);
    
    return () => clearInterval(interval);
  }, [calculateCurrentPrayerInfo]);

  // Track screen focus for cultural navigation
  useFocusEffect(
    useCallback(() => {
      if (options.trackCulturalPatterns) {
        const currentRoute = navigation.getState().routes[navigation.getState().index]?.name;
        if (currentRoute) {
          trackCulturalNavigation(currentRoute, culturalContext);
        }
      }
    }, [navigation, trackCulturalNavigation, culturalContext, options.trackCulturalPatterns])
  );

  return {
    // Navigation functions
    navigateWithCulturalContext,
    navigateRespectingPrayerTime,
    navigateToLocalizedScreen,
    
    // Cultural context
    getCurrentPrayerInfo,
    isPrayerTimeActive,
    getNextPrayerTime,
    isActiveFestivalPeriod,
    
    // Cultural preferences
    getLocalizedRoute,
    getCulturalTheme,
    shouldShowCulturalInsights,
    
    // Navigation analytics
    trackCulturalNavigation,
    getCulturalNavigationHistory,
  };
}

/**
 * Prayer Time Aware Navigation Hook
 */
export function usePrayerTimeNavigation() {
  return useCulturalNavigation({
    respectPrayerTimes: true,
    trackCulturalPatterns: true,
  });
}

/**
 * Festival Aware Navigation Hook
 */
export function useFestivalNavigation() {
  return useCulturalNavigation({
    considerFestivalDates: true,
    adaptToLanguage: true,
    trackCulturalPatterns: true,
  });
}

/**
 * Full Cultural Navigation Hook
 */
export function useFullCulturalNavigation() {
  return useCulturalNavigation({
    respectPrayerTimes: true,
    considerFestivalDates: true,
    adaptToLanguage: true,
    trackCulturalPatterns: true,
  });
}