/**
 * Language Components Index
 * 
 * Central export for all language-related components, hooks, and utilities.
 */

// Core Language Components
export { default as LanguageProvider, useLanguageContext, withLanguageProvider } from './provider/LanguageProvider';
export { default as LanguageSwitcher } from './switcher/LanguageSwitcher';
export { default as CulturalThemeProvider, useCulturalTheme, useCulturalStyles } from './ui/CulturalThemeProvider';

// Re-export translation hooks for convenience
export {
  useTranslation,
  useMedicalTranslation,
  useCulturalFormatting,
  useLanguageSwitcher,
  useRtlSupport,
  usePrayerTimeTranslation,
} from '@/i18n/hooks/useTranslation';

// Re-export i18n service
export { i18nService } from '@/i18n/services/I18nService';

// Re-export utilities
export { default as CulturalFormatters } from '@/utils/localization/formatters/CulturalFormatters';
export { default as RtlSupport } from '@/utils/localization/rtl/RtlSupport';

// Re-export types
export type { SupportedLanguage, TranslationResources } from '@/i18n/translations';

export default {
  LanguageProvider,
  LanguageSwitcher,
  CulturalThemeProvider,
};