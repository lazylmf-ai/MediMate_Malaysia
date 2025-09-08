/**
 * Malaysian Healthcare i18n Configuration
 * Supports Bahasa Malaysia, English, Mandarin, and Tamil
 * Healthcare-specific terminology and cultural context
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as RNLocalize from 'react-native-localize';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import language resources
import en from './locales/en.json';
import ms from './locales/ms.json'; // Bahasa Malaysia
import zh from './locales/zh.json'; // Mandarin Chinese
import ta from './locales/ta.json'; // Tamil

// Healthcare terminology imports
import medicalTermsEn from './medical/en.json';
import medicalTermsMs from './medical/ms.json';
import medicalTermsZh from './medical/zh.json';
import medicalTermsTa from './medical/ta.json';

// Cultural context imports
import culturalEn from './cultural/en.json';
import culturalMs from './cultural/ms.json';
import culturalZh from './cultural/zh.json';
import culturalTa from './cultural/ta.json';

// Prayer and Islamic terminology
import islamicTerms from './islamic/terms.json';

// Malaysian healthcare system terminology
import healthcareSystem from './healthcare/malaysian-system.json';

/**
 * Language resource configuration
 * Organized by namespace for better maintenance
 */
const resources = {
  en: {
    translation: en,
    medical: medicalTermsEn,
    cultural: culturalEn,
    islamic: islamicTerms.en,
    healthcare: healthcareSystem.en
  },
  ms: {
    translation: ms,
    medical: medicalTermsMs,
    cultural: culturalMs,
    islamic: islamicTerms.ms,
    healthcare: healthcareSystem.ms
  },
  zh: {
    translation: zh,
    medical: medicalTermsZh,
    cultural: culturalZh,
    islamic: islamicTerms.zh,
    healthcare: healthcareSystem.zh
  },
  ta: {
    translation: ta,
    medical: medicalTermsTa,
    cultural: culturalTa,
    islamic: islamicTerms.ta,
    healthcare: healthcareSystem.ta
  }
};

/**
 * Detect device language and determine best match
 * Prioritizes Malaysian languages over others
 */
const getDeviceLanguage = () => {
  const locales = RNLocalize.getLocales();
  
  // Priority order for Malaysian healthcare context
  const supportedLanguages = ['ms', 'en', 'zh', 'ta'];
  const malaysiaPriorityLanguages = ['ms', 'zh-MY', 'ta-MY', 'en-MY'];
  
  // First try to match Malaysian locale variants
  for (const locale of locales) {
    if (malaysiaPriorityLanguages.includes(locale.languageTag)) {
      const langCode = locale.languageCode;
      if (supportedLanguages.includes(langCode)) {
        return langCode;
      }
    }
  }
  
  // Then try general language matching
  for (const locale of locales) {
    if (supportedLanguages.includes(locale.languageCode)) {
      return locale.languageCode;
    }
  }
  
  // Default to Bahasa Malaysia for Malaysian context
  return 'ms';
};

/**
 * Get saved language preference or detect device language
 */
const getInitialLanguage = async () => {
  try {
    const savedLanguage = await AsyncStorage.getItem('user_language');
    if (savedLanguage && Object.keys(resources).includes(savedLanguage)) {
      return savedLanguage;
    }
    return getDeviceLanguage();
  } catch (error) {
    console.warn('Failed to get saved language, using device detection:', error);
    return getDeviceLanguage();
  }
};

/**
 * Malaysian healthcare-specific pluralization rules
 */
const pluralizationRules = {
  ms: {
    // Bahasa Malaysia doesn't have complex pluralization
    rule: (count) => count === 1 ? 'one' : 'other'
  },
  en: {
    rule: (count) => count === 1 ? 'one' : 'other'
  },
  zh: {
    // Chinese doesn't have pluralization
    rule: () => 'other'
  },
  ta: {
    // Tamil pluralization is complex, simplified for healthcare context
    rule: (count) => count === 1 ? 'one' : 'other'
  }
};

/**
 * Cultural number formatting for Malaysian context
 */
const numberFormatting = {
  // Malaysian Ringgit formatting
  currency: {
    ms: { style: 'currency', currency: 'MYR', currencyDisplay: 'symbol' },
    en: { style: 'currency', currency: 'MYR', currencyDisplay: 'symbol' },
    zh: { style: 'currency', currency: 'MYR', currencyDisplay: 'symbol' },
    ta: { style: 'currency', currency: 'MYR', currencyDisplay: 'symbol' }
  },
  
  // Medical dosage formatting
  dosage: {
    ms: { minimumFractionDigits: 1, maximumFractionDigits: 2 },
    en: { minimumFractionDigits: 1, maximumFractionDigits: 2 },
    zh: { minimumFractionDigits: 1, maximumFractionDigits: 2 },
    ta: { minimumFractionDigits: 1, maximumFractionDigits: 2 }
  }
};

/**
 * Malaysian date/time formatting
 */
const dateTimeFormatting = {
  ms: {
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'HH:mm',
    dateTimeFormat: 'DD/MM/YYYY, HH:mm',
    timezone: 'Asia/Kuala_Lumpur'
  },
  en: {
    dateFormat: 'DD/MM/YYYY', // Malaysian format even in English
    timeFormat: 'HH:mm',
    dateTimeFormat: 'DD/MM/YYYY, HH:mm',
    timezone: 'Asia/Kuala_Lumpur'
  },
  zh: {
    dateFormat: 'YYYY年MM月DD日',
    timeFormat: 'HH:mm',
    dateTimeFormat: 'YYYY年MM月DD日 HH:mm',
    timezone: 'Asia/Kuala_Lumpur'
  },
  ta: {
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'HH:mm',
    dateTimeFormat: 'DD/MM/YYYY, HH:mm',
    timezone: 'Asia/Kuala_Lumpur'
  }
};

/**
 * Initialize i18n with Malaysian healthcare configuration
 */
const initI18n = async () => {
  const initialLanguage = await getInitialLanguage();
  
  await i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: initialLanguage,
      fallbackLng: 'ms', // Default to Bahasa Malaysia
      
      // Namespace configuration for healthcare context
      defaultNS: 'translation',
      ns: ['translation', 'medical', 'cultural', 'islamic', 'healthcare'],
      
      // Interpolation settings for Malaysian content
      interpolation: {
        escapeValue: false, // React already escapes
        
        // Custom formatters for Malaysian context
        format: (value, format, lng) => {
          if (format === 'currency') {
            return new Intl.NumberFormat(lng, numberFormatting.currency[lng] || numberFormatting.currency.ms)
              .format(value);
          }
          
          if (format === 'dosage') {
            return new Intl.NumberFormat(lng, numberFormatting.dosage[lng] || numberFormatting.dosage.ms)
              .format(value);
          }
          
          if (format === 'date') {
            const dateConfig = dateTimeFormatting[lng] || dateTimeFormatting.ms;
            return new Date(value).toLocaleDateString(lng, {
              timeZone: dateConfig.timezone,
              year: 'numeric',
              month: '2-digit',
              day: '2-digit'
            });
          }
          
          if (format === 'time') {
            const timeConfig = dateTimeFormatting[lng] || dateTimeFormatting.ms;
            return new Date(value).toLocaleTimeString(lng, {
              timeZone: timeConfig.timezone,
              hour: '2-digit',
              minute: '2-digit',
              hour12: false // 24-hour format for Malaysian healthcare
            });
          }
          
          if (format === 'prayerTime') {
            // Special formatting for prayer times
            return new Date(`2000-01-01T${value}`).toLocaleTimeString(lng, {
              hour: '2-digit',
              minute: '2-digit',
              hour12: false
            });
          }
          
          return value;
        }
      },
      
      // Pluralization rules
      pluralSeparator: '_',
      contextSeparator: '_',
      
      // Development settings
      debug: __DEV__,
      
      // React settings
      react: {
        useSuspense: false, // For React Native compatibility
        bindI18n: 'languageChanged loaded',
        bindI18nStore: 'added removed',
        transEmptyNodeValue: '',
        transSupportBasicHtmlNodes: true,
        transKeepBasicHtmlNodesFor: ['br', 'strong', 'i', 'em']
      },
      
      // Backend settings for dynamic loading
      backend: {
        loadPath: '/cultural/locales/{{lng}}/{{ns}}.json',
        addPath: '/cultural/locales/{{lng}}/{{ns}}.missing.json',
        allowMultiLoading: true,
        crossDomain: true
      }
    });

  // Set up language change persistence
  i18n.on('languageChanged', async (lng) => {
    try {
      await AsyncStorage.setItem('user_language', lng);
      console.log(`🌍 Language changed to: ${lng}`);
    } catch (error) {
      console.warn('Failed to save language preference:', error);
    }
  });

  return i18n;
};

/**
 * Helper functions for Malaysian healthcare context
 */
export const i18nHelpers = {
  /**
   * Get localized prayer name
   */
  getPrayerName: (prayerKey, language = i18n.language) => {
    return i18n.t(`islamic:prayers.${prayerKey}`, { lng: language });
  },
  
  /**
   * Get localized holiday name
   */
  getHolidayName: (holidayKey, language = i18n.language) => {
    return i18n.t(`cultural:holidays.${holidayKey}`, { lng: language });
  },
  
  /**
   * Get localized medication instruction
   */
  getMedicationInstruction: (instructionKey, language = i18n.language) => {
    return i18n.t(`medical:instructions.${instructionKey}`, { lng: language });
  },
  
  /**
   * Format Malaysian healthcare greeting based on time and language
   */
  getHealthcareGreeting: (language = i18n.language) => {
    const hour = new Date().getHours();
    let timeOfDay;
    
    if (hour < 12) timeOfDay = 'morning';
    else if (hour < 17) timeOfDay = 'afternoon';
    else timeOfDay = 'evening';
    
    return i18n.t(`cultural:greetings.healthcare.${timeOfDay}`, { lng: language });
  },
  
  /**
   * Get culturally appropriate medication reminder message
   */
  getMedicationReminder: (prayerName, medicationName, language = i18n.language) => {
    return i18n.t('medical:reminders.afterPrayer', {
      prayer: prayerName,
      medication: medicationName,
      lng: language
    });
  },
  
  /**
   * Format Malaysian healthcare provider name
   */
  getProviderName: (providerType, providerName, language = i18n.language) => {
    const localizedType = i18n.t(`healthcare:providerTypes.${providerType}`, { lng: language });
    return `${localizedType} ${providerName}`;
  },
  
  /**
   * Get Ramadan-specific messaging
   */
  getRamadanMessage: (messageKey, language = i18n.language) => {
    return i18n.t(`islamic:ramadan.${messageKey}`, { lng: language });
  }
};

/**
 * Language switcher utility
 */
export const switchLanguage = async (languageCode) => {
  if (Object.keys(resources).includes(languageCode)) {
    await i18n.changeLanguage(languageCode);
    return true;
  }
  
  console.warn(`Unsupported language: ${languageCode}`);
  return false;
};

/**
 * Get available languages with native names
 */
export const getAvailableLanguages = () => [
  { code: 'ms', name: 'Bahasa Malaysia', nativeName: 'بهاس مليسيا' },
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' }
];

/**
 * Get current language configuration
 */
export const getCurrentLanguageConfig = () => ({
  language: i18n.language,
  dateTime: dateTimeFormatting[i18n.language] || dateTimeFormatting.ms,
  number: numberFormatting,
  isRTL: false // None of our supported languages are RTL
});

// Initialize i18n system
export const initializeI18n = initI18n;

export default i18n;