/**
 * useCulturalPreferences Hook
 *
 * Provides access to user's cultural preferences including
 * language, prayer times, dietary restrictions, etc.
 */

import { useAppSelector } from '@/store/hooks';

export interface CulturalPreferences {
  language: 'ms' | 'en' | 'zh' | 'ta';
  religion?: 'Islam' | 'Buddhism' | 'Hinduism' | 'Christianity' | 'Other';
  state_code?: string;
  region?: string;
  prayer_time_notifications?: boolean;
  halal_medication_only?: boolean;
  dietary_restrictions?: string[];
  preferred_contact_start_hour?: number;
  preferred_contact_end_hour?: number;
  do_not_disturb_during_prayer?: boolean;
}

export interface CulturalSettings {
  timezone: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  firstDayOfWeek: 0 | 1; // 0 = Sunday, 1 = Monday
}

/**
 * Hook to access cultural preferences and settings
 */
export const useCulturalPreferences = () => {
  // Get language from app state
  const language = useAppSelector((state) => state.app?.language || 'en') as 'ms' | 'en' | 'zh' | 'ta';

  // In a full implementation, these would come from a cultural preferences slice
  // For now, provide defaults
  const culturalPreferences: CulturalPreferences = {
    language,
    religion: undefined,
    state_code: 'KUL', // Default to Kuala Lumpur
    region: 'Kuala Lumpur',
    prayer_time_notifications: false,
    halal_medication_only: false,
    dietary_restrictions: [],
    preferred_contact_start_hour: 8,
    preferred_contact_end_hour: 22,
    do_not_disturb_during_prayer: false,
  };

  const culturalSettings: CulturalSettings = {
    timezone: 'Asia/Kuala_Lumpur',
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '12h',
    firstDayOfWeek: 1, // Monday
  };

  return {
    language,
    culturalPreferences,
    culturalSettings,
  };
};

export default useCulturalPreferences;
