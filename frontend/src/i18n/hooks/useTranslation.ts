/**
 * Translation Hooks
 * 
 * React hooks for internationalization with Malaysian cultural context,
 * dynamic language switching, and medication-specific translations.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { setLanguage } from '@/store/slices/culturalSlice';
import { i18nService } from '../services/I18nService';
import type { SupportedLanguage } from '../translations';

interface TranslationOptions {
  count?: number;
  context?: string;
  variables?: Record<string, string | number>;
  fallback?: string;
  culturalContext?: boolean;
}

interface UseTranslationResult {
  t: (key: string, options?: TranslationOptions) => string;
  currentLanguage: SupportedLanguage;
  changeLanguage: (language: SupportedLanguage) => Promise<void>;
  isLanguageSupported: (language: string) => boolean;
  getAvailableLanguages: () => Array<{
    code: SupportedLanguage;
    name: string;
    nativeName: string;
  }>;
  isLoading: boolean;
  error: string | null;
}

interface UseMedicalTranslationResult {
  translateMedical: (term: string, targetLanguage?: SupportedLanguage) => string;
  translateDosageInstructions: (instructions: string, culturalContext?: any) => string;
  translatePrayerTimeConflict: (prayer: string, medication: string) => string;
  translateHalalStatus: (status: 'halal' | 'haram' | 'syubhah' | 'unknown') => string;
}

interface UseCulturalFormattingResult {
  formatDate: (date: Date, type?: 'date' | 'time' | 'datetime') => string;
  formatCurrency: (amount: number) => string;
  getTextDirection: () => 'ltr' | 'rtl';
  getFontFamily: () => string;
  hasRtlContent: (text: string) => boolean;
}

/**
 * Main translation hook with cultural context
 */
export function useTranslation(): UseTranslationResult {
  const dispatch = useAppDispatch();
  const culturalProfile = useAppSelector(state => state.cultural.profile);
  const isLoading = useAppSelector(state => state.cultural.isLoading);
  
  const [currentLanguage, setCurrentLanguage] = useState<SupportedLanguage>('en');
  const [error, setError] = useState<string | null>(null);

  // Initialize i18n service with cultural profile
  useEffect(() => {
    const initializeI18n = async () => {
      try {
        await i18nService.initialize(culturalProfile);
        setCurrentLanguage(i18nService.getCurrentLanguage());
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to initialize translations');
      }
    };

    initializeI18n();
  }, [culturalProfile]);

  // Subscribe to language changes
  useEffect(() => {
    const unsubscribe = i18nService.onLanguageChange((newLanguage) => {
      setCurrentLanguage(newLanguage);
    });

    return unsubscribe;
  }, []);

  // Translation function with cultural context
  const translate = useCallback((key: string, options: TranslationOptions = {}): string => {
    try {
      // Add cultural context from Redux state
      const enhancedOptions = {
        ...options,
        culturalContext: options.culturalContext ?? !!culturalProfile,
      };

      return i18nService.translate(key, enhancedOptions);
    } catch (err) {
      console.warn(`Translation error for key "${key}":`, err);
      return options.fallback || key;
    }
  }, [culturalProfile]);

  // Change language function with Redux sync
  const changeLanguage = useCallback(async (language: SupportedLanguage): Promise<void> => {
    try {
      setError(null);
      await i18nService.setLanguage(language);
      
      // Update Redux state
      dispatch(setLanguage(language));
      
      setCurrentLanguage(language);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to change language';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, [dispatch]);

  // Check if language is supported
  const isLanguageSupported = useCallback((language: string): boolean => {
    return i18nService.isLanguageSupported(language);
  }, []);

  // Get available languages
  const getAvailableLanguages = useCallback(() => {
    return i18nService.getAvailableLanguages().map(lang => ({
      code: lang.code,
      name: lang.name,
      nativeName: lang.nativeName,
    }));
  }, []);

  return {
    t: translate,
    currentLanguage,
    changeLanguage,
    isLanguageSupported,
    getAvailableLanguages,
    isLoading,
    error,
  };
}

/**
 * Medical-specific translation hook
 */
export function useMedicalTranslation(): UseMedicalTranslationResult {
  const { t, currentLanguage } = useTranslation();
  const culturalProfile = useAppSelector(state => state.cultural.profile);

  const translateMedical = useCallback((
    term: string, 
    targetLanguage?: SupportedLanguage
  ): string => {
    return i18nService.translateMedical(term, targetLanguage, culturalProfile);
  }, [culturalProfile]);

  const translateDosageInstructions = useCallback((
    instructions: string,
    culturalContext?: any
  ): string => {
    const context = culturalContext || culturalProfile;
    
    // Check for prayer time adjustments
    if (context?.prayerTimes?.enabled) {
      if (instructions.includes('morning')) {
        return t('instructions.cultural.ramadanAdjustment', { 
          variables: { time: 'morning' } 
        });
      }
      if (instructions.includes('evening')) {
        return t('instructions.cultural.prayerTimeBuffer');
      }
    }

    // Check for halal considerations
    if (context?.religion === 'islam') {
      return `${instructions} ${t('instructions.cultural.halalCertified')}`;
    }

    return instructions;
  }, [t, culturalProfile]);

  const translatePrayerTimeConflict = useCallback((
    prayer: string, 
    medication: string
  ): string => {
    return t('medications.reminders.prayerTimeConflict', {
      variables: { prayer, medication }
    });
  }, [t]);

  const translateHalalStatus = useCallback((
    status: 'halal' | 'haram' | 'syubhah' | 'unknown'
  ): string => {
    const statusMap = {
      'halal': t('medications.cultural.halalApproved'),
      'haram': t('medications.cultural.halalConcern'),
      'syubhah': t('medications.cultural.halalConcern'),
      'unknown': t('medications.cultural.halalUnknown'),
    };

    return statusMap[status];
  }, [t]);

  return {
    translateMedical,
    translateDosageInstructions,
    translatePrayerTimeConflict,
    translateHalalStatus,
  };
}

/**
 * Cultural formatting hook
 */
export function useCulturalFormatting(): UseCulturalFormattingResult {
  const { currentLanguage } = useTranslation();

  const formatDate = useCallback((
    date: Date, 
    type: 'date' | 'time' | 'datetime' = 'datetime'
  ): string => {
    return i18nService.formatDateTime(date, type);
  }, []);

  const formatCurrency = useCallback((amount: number): string => {
    return i18nService.formatCurrency(amount);
  }, []);

  const getTextDirection = useCallback((): 'ltr' | 'rtl' => {
    return i18nService.getTextDirection();
  }, []);

  const getFontFamily = useCallback((): string => {
    return i18nService.getFontFamily();
  }, []);

  const hasRtlContent = useCallback((text: string): boolean => {
    return i18nService.hasRtlContent(text);
  }, []);

  return {
    formatDate,
    formatCurrency,
    getTextDirection,
    getFontFamily,
    hasRtlContent,
  };
}

/**
 * Language switching hook for UI components
 */
export function useLanguageSwitcher() {
  const { currentLanguage, changeLanguage, getAvailableLanguages, isLoading } = useTranslation();
  const [isChanging, setIsChanging] = useState(false);

  const switchLanguage = useCallback(async (language: SupportedLanguage) => {
    if (language === currentLanguage || isChanging) return;

    setIsChanging(true);
    try {
      await changeLanguage(language);
    } finally {
      setIsChanging(false);
    }
  }, [currentLanguage, changeLanguage, isChanging]);

  const availableLanguages = useMemo(() => getAvailableLanguages(), [getAvailableLanguages]);

  return {
    currentLanguage,
    availableLanguages,
    switchLanguage,
    isChanging: isChanging || isLoading,
  };
}

/**
 * RTL support hook for text display
 */
export function useRtlSupport() {
  const { getTextDirection, hasRtlContent } = useCulturalFormatting();

  const isRtl = useMemo(() => getTextDirection() === 'rtl', [getTextDirection]);

  const getTextStyle = useCallback((text: string) => {
    const hasRtl = hasRtlContent(text);
    
    return {
      textAlign: hasRtl ? 'right' as const : 'left' as const,
      writingDirection: hasRtl ? 'rtl' as const : 'ltr' as const,
    };
  }, [hasRtlContent]);

  return {
    isRtl,
    hasRtlContent,
    getTextStyle,
  };
}

/**
 * Prayer time localization hook
 */
export function usePrayerTimeTranslation() {
  const { t } = useTranslation();

  const translatePrayerName = useCallback((prayerName: string): string => {
    const prayerMap = {
      'fajr': t('cultural.prayerTimes.fajr'),
      'dhuhr': t('cultural.prayerTimes.dhuhr'),
      'asr': t('cultural.prayerTimes.asr'),
      'maghrib': t('cultural.prayerTimes.maghrib'),
      'isha': t('cultural.prayerTimes.isha'),
    };

    return prayerMap[prayerName.toLowerCase() as keyof typeof prayerMap] || prayerName;
  }, [t]);

  const translatePrayerTime = useCallback((prayerName: string, time: Date): string => {
    const translatedName = translatePrayerName(prayerName);
    const formattedTime = i18nService.formatDateTime(time, 'time');
    
    return `${translatedName}: ${formattedTime}`;
  }, [translatePrayerName]);

  return {
    translatePrayerName,
    translatePrayerTime,
  };
}

export default useTranslation;