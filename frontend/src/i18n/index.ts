/**
 * I18n System Index
 * 
 * Central export for the complete internationalization system
 * with Malaysian cultural context and healthcare-specific features.
 */

// Core Services
export { i18nService } from './services/I18nService';

// Translation Resources
export { 
  translations, 
  languageMetadata, 
  culturalEvents, 
  medicalTerminology, 
  culturalFormatting,
  rtlSupport,
  type SupportedLanguage, 
  type TranslationResources,
  type LanguageMetadata,
} from './translations';

// Hooks
export {
  useTranslation,
  useMedicalTranslation,
  useCulturalFormatting,
  useLanguageSwitcher,
  useRtlSupport,
  usePrayerTimeTranslation,
} from './hooks/useTranslation';

// Initialize i18n system with cultural profile
export const initializeI18n = async (culturalProfile?: any) => {
  try {
    await i18nService.initialize(culturalProfile);
    console.log('I18n system initialized successfully');
    return true;
  } catch (error) {
    console.error('Failed to initialize i18n system:', error);
    return false;
  }
};

// Quick translation function for use outside React components
export const t = (key: string, options?: any) => {
  return i18nService.translate(key, options);
};

// Language detection utilities
export const detectUserLanguage = (): SupportedLanguage => {
  // This would implement actual language detection logic
  // For now, return default
  return 'en';
};

export const getCurrentLanguage = (): SupportedLanguage => {
  return i18nService.getCurrentLanguage();
};

export const changeLanguage = async (language: SupportedLanguage): Promise<void> => {
  await i18nService.setLanguage(language);
};

export default {
  service: i18nService,
  translations,
  initializeI18n,
  t,
  detectUserLanguage,
  getCurrentLanguage,
  changeLanguage,
};