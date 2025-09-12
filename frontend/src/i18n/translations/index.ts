/**
 * Translations Index
 * 
 * Central export for all translation files with type definitions
 * and language configuration for MediMate Malaysia.
 */

import en from './en';
import ms from './ms';
import zh from './zh';
import ta from './ta';

export type SupportedLanguage = 'en' | 'ms' | 'zh' | 'ta';
export type TranslationResources = typeof en;

export const translations = {
  en,
  ms,
  zh,
  ta,
} as const;

// Language metadata for cultural context
export interface LanguageMetadata {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  dir: 'ltr' | 'rtl';
  region: string;
  culturalContext: string[];
  primaryScript: string;
  fontFamily?: string;
  fallbacks: SupportedLanguage[];
}

export const languageMetadata: Record<SupportedLanguage, LanguageMetadata> = {
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    dir: 'ltr',
    region: 'International',
    culturalContext: ['international', 'western'],
    primaryScript: 'Latin',
    fontFamily: 'System',
    fallbacks: ['ms'],
  },
  ms: {
    code: 'ms',
    name: 'Malay',
    nativeName: 'Bahasa Malaysia',
    dir: 'ltr',
    region: 'Malaysia',
    culturalContext: ['malay', 'islamic', 'southeast_asian'],
    primaryScript: 'Latin',
    fontFamily: 'System',
    fallbacks: ['en'],
  },
  zh: {
    code: 'zh',
    name: 'Chinese',
    nativeName: '中文（简体）',
    dir: 'ltr',
    region: 'Malaysia',
    culturalContext: ['chinese', 'buddhist', 'confucian', 'traditional_medicine'],
    primaryScript: 'Han',
    fontFamily: 'PingFang SC, Noto Sans CJK SC, SimHei',
    fallbacks: ['en', 'ms'],
  },
  ta: {
    code: 'ta',
    name: 'Tamil',
    nativeName: 'தமிழ்',
    dir: 'ltr',
    region: 'Malaysia',
    culturalContext: ['tamil', 'hindu', 'south_indian', 'traditional_medicine'],
    primaryScript: 'Tamil',
    fontFamily: 'Noto Sans Tamil, Tamil Sangam MN',
    fallbacks: ['en', 'ms'],
  },
};

// Malaysian cultural holidays and events
export const culturalEvents: Record<string, Array<{ name: string; languages: SupportedLanguage[] }>> = {
  'islamic': [
    { name: 'Ramadan', languages: ['ms', 'en'] },
    { name: 'Eid al-Fitr', languages: ['ms', 'en'] },
    { name: 'Eid al-Adha', languages: ['ms', 'en'] },
  ],
  'chinese': [
    { name: 'Chinese New Year', languages: ['zh', 'en'] },
    { name: 'Mid-Autumn Festival', languages: ['zh', 'en'] },
    { name: 'Dragon Boat Festival', languages: ['zh', 'en'] },
  ],
  'tamil': [
    { name: 'Deepavali', languages: ['ta', 'en'] },
    { name: 'Thaipusam', languages: ['ta', 'en'] },
    { name: 'Thai New Year', languages: ['ta', 'en'] },
  ],
  'malaysian': [
    { name: 'Merdeka Day', languages: ['ms', 'en', 'zh', 'ta'] },
    { name: 'Malaysia Day', languages: ['ms', 'en', 'zh', 'ta'] },
    { name: 'Kings Birthday', languages: ['ms', 'en', 'zh', 'ta'] },
  ],
};

// Medical terminology translations with cultural context
export const medicalTerminology: Record<string, Record<SupportedLanguage, string>> = {
  // Dosage timing - Malaysian healthcare context
  'before_meals': {
    en: 'Before meals',
    ms: 'Sebelum makan',
    zh: '饭前',
    ta: 'உணவுக்கு முன்',
  },
  'after_meals': {
    en: 'After meals',
    ms: 'Selepas makan', 
    zh: '饭后',
    ta: 'உணவுக்குப் பின்',
  },
  'with_meals': {
    en: 'With meals',
    ms: 'Bersama makanan',
    zh: '随餐',
    ta: 'உணவுடன்',
  },
  'empty_stomach': {
    en: 'On empty stomach',
    ms: 'Pada perut kosong',
    zh: '空腹',
    ta: 'வெறும் வயிற்றில்',
  },
  
  // Prayer times - Islamic context for Malaysian Muslims
  'before_fajr': {
    en: 'Before Fajr prayer',
    ms: 'Sebelum solat Subuh',
    zh: '晨礼前',
    ta: 'பஜ்ர் தொழுகைக்கு முன்',
  },
  'after_maghrib': {
    en: 'After Maghrib prayer',
    ms: 'Selepas solat Maghrib',
    zh: '昏礼后',
    ta: 'மக்ரிப் தொழுகைக்கு பின்',
  },
  
  // Traditional medicine integration
  'with_traditional_medicine': {
    en: 'With traditional medicine',
    ms: 'Dengan ubat tradisional',
    zh: '配合传统中药',
    ta: 'பாரம்பரிய மருந்துடன்',
  },
  
  // Emergency terms
  'emergency': {
    en: 'Emergency',
    ms: 'Kecemasan',
    zh: '紧急情况',
    ta: 'அவசரநிலை',
  },
  'hospital': {
    en: 'Hospital',
    ms: 'Hospital',
    zh: '医院',
    ta: 'மருத்துவமனை',
  },
  'pharmacy': {
    en: 'Pharmacy',
    ms: 'Farmasi',
    zh: '药房',
    ta: 'மருந்தகம்',
  },
};

// Cultural formatting preferences
export const culturalFormatting: Record<SupportedLanguage, {
  dateFormat: string;
  timeFormat: string;
  currencyFormat: string;
  numberFormat: string;
  preferredCalendar?: string;
}> = {
  en: {
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '12h',
    currencyFormat: 'RM',
    numberFormat: '1,234.56',
  },
  ms: {
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '24h',
    currencyFormat: 'RM',
    numberFormat: '1,234.56',
  },
  zh: {
    dateFormat: 'YYYY年MM月DD日',
    timeFormat: '24h',
    currencyFormat: '马币',
    numberFormat: '1,234.56',
    preferredCalendar: 'lunar',
  },
  ta: {
    dateFormat: 'DD/MM/YYYY',
    timeFormat: '12h',
    currencyFormat: 'RM',
    numberFormat: '1,234.56',
  },
};

// Right-to-left support for Arabic/Persian pharmaceutical terms
export const rtlSupport: Record<SupportedLanguage, {
  hasRtlContent: boolean;
  rtlWords?: string[];
  rtlPhrases?: string[];
}> = {
  en: { hasRtlContent: false },
  ms: { 
    hasRtlContent: true,
    rtlWords: ['الله', 'حلال', 'حرام'], // Common Arabic terms in Malay
    rtlPhrases: ['بسم الله', 'إن شاء الله'],
  },
  zh: { hasRtlContent: false },
  ta: { hasRtlContent: false },
};

export default translations;