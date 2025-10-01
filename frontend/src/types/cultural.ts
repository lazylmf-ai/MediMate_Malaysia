/**
 * Enhanced Cultural Types for Stream B
 * 
 * Extended cultural types with location-based defaults,
 * accessibility features, and Malaysian-specific enhancements.
 */

import type { CulturalProfile, PrayerAdjustments } from './auth';

export type MalaysianState = 
  | 'johor' | 'kedah' | 'kelantan' | 'malacca' | 'negeri_sembilan'
  | 'pahang' | 'penang' | 'perak' | 'perlis' | 'sabah' | 'sarawak'
  | 'selangor' | 'terengganu' | 'kuala_lumpur' | 'labuan' | 'putrajaya';

export interface LocationDefaults {
  state: MalaysianState;
  city: string;
  timezone: string;
  coordinates: {
    latitude: number;
    longitude: number;
  };
  defaultPrayerTimes: PrayerTimeDefaults;
  culturalContext: CulturalContext;
}

export interface PrayerTimeDefaults {
  madhab: 'shafi' | 'hanafi';
  calculationMethod: 'jakim' | 'isna' | 'mwl' | 'egypt' | 'makkah';
  adjustments: PrayerAdjustments;
  highLatitudeRule: 'angle' | 'night_middle' | 'one_seventh';
}

export interface CulturalContext {
  predominantReligion: 'islam' | 'buddhism' | 'hinduism' | 'christianity' | 'mixed';
  commonLanguages: Array<'ms' | 'en' | 'zh' | 'ta'>;
  majorFestivals: string[];
  elderlyCareTraditions: ElderlyCareTradition[];
}

export interface ElderlyCareTradition {
  name: string;
  description: string;
  practices: string[];
  relevantMedicationTimes?: string[];
}

export interface UserBehaviorPattern {
  action: string;
  frequency: number;
  timeOfDay: string;
  culturalContext?: string;
  lastUpdated: string;
}

export interface CulturalInsight {
  id: string;
  type: 'prayer_time' | 'festival' | 'family_care' | 'language' | 'medication';
  message: string;
  actionable: boolean;
  priority: 'low' | 'medium' | 'high';
  expiresAt?: string;
}

export interface EnhancedCulturalProfile extends CulturalProfile {
  locationDefaults: LocationDefaults;
  adaptivePreferences: {
    suggestionHistory: string[];
    userBehaviorPatterns: UserBehaviorPattern[];
    culturalInsights: CulturalInsight[];
    lastAnalyzed: string;
  };
  accessibility: AccessibilityConfig;
  offlineData: {
    cachedPrayerTimes: any[];
    cachedFestivals: any[];
    lastSyncAt: string;
  };
}

export interface AccessibilityConfig {
  textSize: 'normal' | 'large' | 'extra-large';
  highContrast: boolean;
  hapticFeedback: boolean;
  voiceGuidance: boolean;
  simpleNavigation: boolean;
  emergencyMode: boolean;
  elderlyOptimizations: {
    largeButtons: boolean;
    reducedAnimations: boolean;
    voiceCommands: boolean;
    quickEmergencyAccess: boolean;
  };
}

export interface CulturalCalendarEvent {
  id: string;
  name: string;
  type: 'islamic' | 'chinese' | 'hindu' | 'malaysian' | 'personal';
  date: string;
  duration?: number; // days
  description?: string;
  medicationImpact?: {
    fasting: boolean;
    timingAdjustments: boolean;
    specialConsiderations: string[];
  };
  deepLink?: string;
}

// Malaysian Location Constants
export const MALAYSIAN_STATES_DATA: Record<MalaysianState, Omit<LocationDefaults, 'city'> & { cities: string[] }> = {
  kuala_lumpur: {
    cities: ['Kuala Lumpur', 'Cheras', 'Petaling Jaya', 'Shah Alam'],
    timezone: 'Asia/Kuala_Lumpur',
    coordinates: { latitude: 3.139, longitude: 101.6869 },
    defaultPrayerTimes: {
      madhab: 'shafi',
      calculationMethod: 'jakim',
      adjustments: { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
      highLatitudeRule: 'angle'
    },
    culturalContext: {
      predominantReligion: 'mixed',
      commonLanguages: ['ms', 'en', 'zh', 'ta'],
      majorFestivals: ['Hari Raya', 'Chinese New Year', 'Deepavali', 'Christmas'],
      elderlyCareTraditions: [
        {
          name: 'Multi-generational Care',
          description: 'Traditional practice of caring for elderly at home',
          practices: ['Regular family meals', 'Medication reminders by family', 'Cultural festivities participation'],
          relevantMedicationTimes: ['morning', 'afternoon', 'evening']
        }
      ]
    }
  },
  selangor: {
    cities: ['Shah Alam', 'Petaling Jaya', 'Subang Jaya', 'Klang'],
    timezone: 'Asia/Kuala_Lumpur',
    coordinates: { latitude: 3.0738, longitude: 101.5183 },
    defaultPrayerTimes: {
      madhab: 'shafi',
      calculationMethod: 'jakim',
      adjustments: { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
      highLatitudeRule: 'angle'
    },
    culturalContext: {
      predominantReligion: 'islam',
      commonLanguages: ['ms', 'en', 'zh'],
      majorFestivals: ['Hari Raya', 'Chinese New Year', 'Merdeka Day'],
      elderlyCareTraditions: [
        {
          name: 'Traditional Malay Elder Care',
          description: 'Respect for elders with family-centered care',
          practices: ['Morning prayers together', 'Traditional medicine alongside modern', 'Family involvement in health decisions'],
          relevantMedicationTimes: ['after_prayer', 'with_meals']
        }
      ]
    }
  },
  // Add other states as needed...
  johor: {
    cities: ['Johor Bahru', 'Muar', 'Batu Pahat', 'Kluang'],
    timezone: 'Asia/Kuala_Lumpur',
    coordinates: { latitude: 1.4927, longitude: 103.7414 },
    defaultPrayerTimes: {
      madhab: 'shafi',
      calculationMethod: 'jakim',
      adjustments: { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
      highLatitudeRule: 'angle'
    },
    culturalContext: {
      predominantReligion: 'islam',
      commonLanguages: ['ms', 'en'],
      majorFestivals: ['Hari Raya', 'Merdeka Day', 'Malaysia Day'],
      elderlyCareTraditions: [
        {
          name: 'Southern Malay Traditions',
          description: 'Strong family bonds with emphasis on respect for elders',
          practices: ['Daily family check-ins', 'Traditional herbal remedies', 'Community support networks'],
          relevantMedicationTimes: ['morning', 'evening']
        }
      ]
    }
  },
  penang: {
    cities: ['George Town', 'Butterworth', 'Bukit Mertajam', 'Balik Pulau'],
    timezone: 'Asia/Kuala_Lumpur',
    coordinates: { latitude: 5.4141, longitude: 100.3288 },
    defaultPrayerTimes: {
      madhab: 'shafi',
      calculationMethod: 'jakim',
      adjustments: { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
      highLatitudeRule: 'angle'
    },
    culturalContext: {
      predominantReligion: 'mixed',
      commonLanguages: ['ms', 'en', 'zh', 'ta'],
      majorFestivals: ['Chinese New Year', 'Hari Raya', 'Deepavali', 'Christmas'],
      elderlyCareTraditions: [
        {
          name: 'Peranakan Elder Care',
          description: 'Blend of Chinese and Malay traditions in caring for elderly',
          practices: ['Herbal medicine traditions', 'Multi-cultural meal sharing', 'Festival-based medication timing'],
          relevantMedicationTimes: ['with_tea', 'before_meals', 'after_dinner']
        }
      ]
    }
  },
  // Simplified for other states - in real implementation, all 16 states would be included
  kedah: { cities: ['Alor Setar'], timezone: 'Asia/Kuala_Lumpur', coordinates: { latitude: 6.1248, longitude: 100.3678 }, defaultPrayerTimes: { madhab: 'shafi', calculationMethod: 'jakim', adjustments: { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 }, highLatitudeRule: 'angle' }, culturalContext: { predominantReligion: 'islam', commonLanguages: ['ms', 'en'], majorFestivals: ['Hari Raya'], elderlyCareTraditions: [] } },
  kelantan: { cities: ['Kota Bharu'], timezone: 'Asia/Kuala_Lumpur', coordinates: { latitude: 6.1254, longitude: 102.2386 }, defaultPrayerTimes: { madhab: 'shafi', calculationMethod: 'jakim', adjustments: { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 }, highLatitudeRule: 'angle' }, culturalContext: { predominantReligion: 'islam', commonLanguages: ['ms'], majorFestivals: ['Hari Raya'], elderlyCareTraditions: [] } },
  malacca: { cities: ['Malacca City'], timezone: 'Asia/Kuala_Lumpur', coordinates: { latitude: 2.1896, longitude: 102.2501 }, defaultPrayerTimes: { madhab: 'shafi', calculationMethod: 'jakim', adjustments: { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 }, highLatitudeRule: 'angle' }, culturalContext: { predominantReligion: 'mixed', commonLanguages: ['ms', 'en', 'zh'], majorFestivals: ['Hari Raya', 'Chinese New Year'], elderlyCareTraditions: [] } },
  negeri_sembilan: { cities: ['Seremban'], timezone: 'Asia/Kuala_Lumpur', coordinates: { latitude: 2.7297, longitude: 101.9381 }, defaultPrayerTimes: { madhab: 'shafi', calculationMethod: 'jakim', adjustments: { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 }, highLatitudeRule: 'angle' }, culturalContext: { predominantReligion: 'islam', commonLanguages: ['ms', 'en'], majorFestivals: ['Hari Raya'], elderlyCareTraditions: [] } },
  pahang: { cities: ['Kuantan'], timezone: 'Asia/Kuala_Lumpur', coordinates: { latitude: 3.8077, longitude: 103.3260 }, defaultPrayerTimes: { madhab: 'shafi', calculationMethod: 'jakim', adjustments: { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 }, highLatitudeRule: 'angle' }, culturalContext: { predominantReligion: 'islam', commonLanguages: ['ms', 'en'], majorFestivals: ['Hari Raya'], elderlyCareTraditions: [] } },
  perak: { cities: ['Ipoh'], timezone: 'Asia/Kuala_Lumpur', coordinates: { latitude: 4.5975, longitude: 101.0901 }, defaultPrayerTimes: { madhab: 'shafi', calculationMethod: 'jakim', adjustments: { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 }, highLatitudeRule: 'angle' }, culturalContext: { predominantReligion: 'mixed', commonLanguages: ['ms', 'en', 'zh'], majorFestivals: ['Hari Raya', 'Chinese New Year'], elderlyCareTraditions: [] } },
  perlis: { cities: ['Kangar'], timezone: 'Asia/Kuala_Lumpur', coordinates: { latitude: 6.4414, longitude: 100.1986 }, defaultPrayerTimes: { madhab: 'shafi', calculationMethod: 'jakim', adjustments: { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 }, highLatitudeRule: 'angle' }, culturalContext: { predominantReligion: 'islam', commonLanguages: ['ms'], majorFestivals: ['Hari Raya'], elderlyCareTraditions: [] } },
  sabah: { cities: ['Kota Kinabalu'], timezone: 'Asia/Kuching', coordinates: { latitude: 5.9804, longitude: 116.0735 }, defaultPrayerTimes: { madhab: 'shafi', calculationMethod: 'jakim', adjustments: { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 }, highLatitudeRule: 'angle' }, culturalContext: { predominantReligion: 'mixed', commonLanguages: ['ms', 'en'], majorFestivals: ['Hari Raya', 'Christmas'], elderlyCareTraditions: [] } },
  sarawak: { cities: ['Kuching'], timezone: 'Asia/Kuching', coordinates: { latitude: 1.5533, longitude: 110.3592 }, defaultPrayerTimes: { madhab: 'shafi', calculationMethod: 'jakim', adjustments: { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 }, highLatitudeRule: 'angle' }, culturalContext: { predominantReligion: 'mixed', commonLanguages: ['ms', 'en', 'zh'], majorFestivals: ['Hari Raya', 'Chinese New Year', 'Christmas'], elderlyCareTraditions: [] } },
  terengganu: { cities: ['Kuala Terengganu'], timezone: 'Asia/Kuala_Lumpur', coordinates: { latitude: 5.3117, longitude: 103.1324 }, defaultPrayerTimes: { madhab: 'shafi', calculationMethod: 'jakim', adjustments: { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 }, highLatitudeRule: 'angle' }, culturalContext: { predominantReligion: 'islam', commonLanguages: ['ms'], majorFestivals: ['Hari Raya'], elderlyCareTraditions: [] } },
  labuan: { cities: ['Victoria'], timezone: 'Asia/Kuching', coordinates: { latitude: 5.2831, longitude: 115.2308 }, defaultPrayerTimes: { madhab: 'shafi', calculationMethod: 'jakim', adjustments: { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 }, highLatitudeRule: 'angle' }, culturalContext: { predominantReligion: 'mixed', commonLanguages: ['ms', 'en'], majorFestivals: ['Hari Raya'], elderlyCareTraditions: [] } },
  putrajaya: { cities: ['Putrajaya'], timezone: 'Asia/Kuala_Lumpur', coordinates: { latitude: 2.9264, longitude: 101.6964 }, defaultPrayerTimes: { madhab: 'shafi', calculationMethod: 'jakim', adjustments: { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 }, highLatitudeRule: 'angle' }, culturalContext: { predominantReligion: 'islam', commonLanguages: ['ms', 'en'], majorFestivals: ['Hari Raya'], elderlyCareTraditions: [] } }
};

// Default accessibility configuration for elderly users
export const DEFAULT_ELDERLY_ACCESSIBILITY: AccessibilityConfig = {
  textSize: 'large',
  highContrast: true,
  hapticFeedback: true,
  voiceGuidance: true,
  simpleNavigation: true,
  emergencyMode: false,
  elderlyOptimizations: {
    largeButtons: true,
    reducedAnimations: true,
    voiceCommands: true,
    quickEmergencyAccess: true,
  }
};

// Prayer time calculation utilities for Malaysian context
export interface PrayerTimeCalculationParams {
  latitude: number;
  longitude: number;
  date: Date;
  madhab: 'shafi' | 'hanafi';
  method: 'jakim' | 'isna' | 'mwl' | 'egypt' | 'makkah';
  adjustments?: PrayerAdjustments;
}