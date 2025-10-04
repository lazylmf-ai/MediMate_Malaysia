/**
 * Use Cultural Preferences Hook
 * Provides access to user's cultural preferences for the Education Hub
 * Integrates language selection, prayer times, and cultural settings
 */

import { useState, useEffect, useCallback } from 'react';

export type SupportedLanguage = 'ms' | 'en' | 'zh' | 'ta';

export interface CulturalPreferences {
  user_id: string;
  religion?: 'Islam' | 'Buddhism' | 'Hinduism' | 'Christianity' | 'Other';
  ethnicity?: 'Malay' | 'Chinese' | 'Indian' | 'Other';
  primary_language: SupportedLanguage;
  secondary_languages: SupportedLanguage[];
  state_code: string;
  region: string;
  prayer_time_notifications: boolean;
  cultural_calendar_integration: boolean;
  halal_requirements: boolean;
  ramadan_fasting: boolean;
}

export interface CulturalSettings {
  language: SupportedLanguage;
  respectPrayerTimes: boolean;
  showCulturalGreetings: boolean;
  culturalSensitivity: boolean;
}

export interface UseCulturalPreferencesResult {
  // Current preferences
  preferences: CulturalPreferences | null;
  language: SupportedLanguage;
  culturalSettings: CulturalSettings;

  // Status
  isLoading: boolean;
  error: string | null;

  // Actions
  updateLanguage: (language: SupportedLanguage) => Promise<void>;
  updatePreferences: (updates: Partial<CulturalPreferences>) => Promise<void>;
  refreshPreferences: () => Promise<void>;

  // Utilities
  getGreeting: () => string;
  formatDate: (date: Date) => string;
  getCulturalContext: () => {
    isMuslim: boolean;
    requiresHalal: boolean;
    respectsPrayerTimes: boolean;
  };
}

/**
 * Hook to access and manage user's cultural preferences
 */
export const useCulturalPreferences = (): UseCulturalPreferencesResult => {
  const [preferences, setPreferences] = useState<CulturalPreferences | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /**
   * Load cultural preferences from storage/API
   */
  const loadPreferences = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // In production, this would fetch from API or AsyncStorage
      // For now, return default preferences
      const defaultPreferences: CulturalPreferences = {
        user_id: 'current_user',
        religion: 'Islam',
        ethnicity: 'Malay',
        primary_language: 'ms',
        secondary_languages: ['en'],
        state_code: 'KUL',
        region: 'Kuala Lumpur',
        prayer_time_notifications: true,
        cultural_calendar_integration: true,
        halal_requirements: true,
        ramadan_fasting: true
      };

      setPreferences(defaultPreferences);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load cultural preferences';
      setError(errorMessage);
      console.error('[useCulturalPreferences] Error loading preferences:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Update user's language preference
   */
  const updateLanguage = useCallback(async (language: SupportedLanguage) => {
    try {
      setPreferences(prev => {
        if (!prev) return prev;
        return { ...prev, primary_language: language };
      });

      // In production, persist to API/storage
      console.log(`[useCulturalPreferences] Language updated to: ${language}`);
    } catch (err) {
      console.error('[useCulturalPreferences] Failed to update language:', err);
      throw err;
    }
  }, []);

  /**
   * Update cultural preferences
   */
  const updatePreferences = useCallback(async (updates: Partial<CulturalPreferences>) => {
    try {
      setPreferences(prev => {
        if (!prev) return prev;
        return { ...prev, ...updates };
      });

      // In production, persist to API/storage
      console.log('[useCulturalPreferences] Preferences updated:', updates);
    } catch (err) {
      console.error('[useCulturalPreferences] Failed to update preferences:', err);
      throw err;
    }
  }, []);

  /**
   * Refresh preferences from server
   */
  const refreshPreferences = useCallback(async () => {
    await loadPreferences();
  }, [loadPreferences]);

  /**
   * Get culturally appropriate greeting
   */
  const getGreeting = useCallback((): string => {
    if (!preferences) return 'Hello';

    const hour = new Date().getHours();
    const language = preferences.primary_language;

    // Morning (5-11), Afternoon (12-17), Evening (18-21), Night (22-4)
    const greetings: Record<SupportedLanguage, { morning: string; afternoon: string; evening: string; night: string }> = {
      ms: {
        morning: 'Selamat Pagi',
        afternoon: 'Selamat Tengah Hari',
        evening: 'Selamat Petang',
        night: 'Selamat Malam'
      },
      en: {
        morning: 'Good Morning',
        afternoon: 'Good Afternoon',
        evening: 'Good Evening',
        night: 'Good Night'
      },
      zh: {
        morning: '早上好',
        afternoon: '下午好',
        evening: '晚上好',
        night: '晚安'
      },
      ta: {
        morning: 'காலை வணக்கம்',
        afternoon: 'மதிய வணக்கம்',
        evening: 'மாலை வணக்கம்',
        night: 'இரவு வணக்கம்'
      }
    };

    const langGreetings = greetings[language] || greetings.en;

    if (hour >= 5 && hour < 12) return langGreetings.morning;
    if (hour >= 12 && hour < 18) return langGreetings.afternoon;
    if (hour >= 18 && hour < 22) return langGreetings.evening;
    return langGreetings.night;
  }, [preferences]);

  /**
   * Format date according to cultural preferences
   */
  const formatDate = useCallback((date: Date): string => {
    if (!preferences) {
      return date.toLocaleDateString('en-US');
    }

    const localeMap: Record<SupportedLanguage, string> = {
      ms: 'ms-MY',
      en: 'en-MY',
      zh: 'zh-CN',
      ta: 'ta-IN'
    };

    const locale = localeMap[preferences.primary_language] || 'en-MY';
    return date.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }, [preferences]);

  /**
   * Get cultural context for decision making
   */
  const getCulturalContext = useCallback(() => {
    const isMuslim = preferences?.religion === 'Islam';
    const requiresHalal = preferences?.halal_requirements || false;
    const respectsPrayerTimes = preferences?.prayer_time_notifications || false;

    return {
      isMuslim,
      requiresHalal,
      respectsPrayerTimes
    };
  }, [preferences]);

  /**
   * Compute cultural settings
   */
  const culturalSettings: CulturalSettings = {
    language: preferences?.primary_language || 'en',
    respectPrayerTimes: preferences?.prayer_time_notifications || false,
    showCulturalGreetings: true,
    culturalSensitivity: true
  };

  /**
   * Load preferences on mount
   */
  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  return {
    preferences,
    language: preferences?.primary_language || 'en',
    culturalSettings,
    isLoading,
    error,
    updateLanguage,
    updatePreferences,
    refreshPreferences,
    getGreeting,
    formatDate,
    getCulturalContext
  };
};

export default useCulturalPreferences;
