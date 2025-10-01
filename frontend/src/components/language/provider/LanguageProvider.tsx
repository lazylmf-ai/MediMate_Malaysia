/**
 * Language Provider Component
 * 
 * Provides language context throughout the app with cultural preferences,
 * automatic initialization, and seamless language switching support.
 */

import React, { 
  createContext, 
  useContext, 
  useEffect, 
  useState, 
  useCallback,
  ReactNode 
} from 'react';
import { Alert } from 'react-native';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { loadCulturalProfile } from '@/store/slices/culturalSlice';
import { i18nService } from '@/i18n/services/I18nService';
import type { SupportedLanguage } from '@/i18n/translations';

interface LanguageContextType {
  currentLanguage: SupportedLanguage;
  isInitialized: boolean;
  isLoading: boolean;
  error: string | null;
  changeLanguage: (language: SupportedLanguage) => Promise<void>;
  getAvailableLanguages: () => Array<{
    code: SupportedLanguage;
    name: string;
    nativeName: string;
  }>;
  translate: (key: string, options?: any) => string;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

interface LanguageProviderProps {
  children: ReactNode;
  fallbackLanguage?: SupportedLanguage;
  autoDetectLanguage?: boolean;
  showInitializationErrors?: boolean;
}

export function LanguageProvider({
  children,
  fallbackLanguage = 'en',
  autoDetectLanguage = true,
  showInitializationErrors = true,
}: LanguageProviderProps) {
  const dispatch = useAppDispatch();
  const culturalProfile = useAppSelector(state => state.cultural.profile);
  const culturalLoading = useAppSelector(state => state.cultural.isLoading);
  const culturalError = useAppSelector(state => state.cultural.error);

  const [currentLanguage, setCurrentLanguage] = useState<SupportedLanguage>(fallbackLanguage);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize language service
  const initializeLanguageService = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Load cultural profile if not already loaded
      if (!culturalProfile && !culturalLoading) {
        dispatch(loadCulturalProfile());
        return; // Wait for cultural profile to load
      }

      // Initialize i18n service with cultural context
      await i18nService.initialize(culturalProfile);
      
      // Set initial language
      let initialLanguage = fallbackLanguage;
      
      if (autoDetectLanguage && culturalProfile?.language) {
        initialLanguage = culturalProfile.language;
      }
      
      await i18nService.setLanguage(initialLanguage);
      setCurrentLanguage(initialLanguage);
      
      setIsInitialized(true);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to initialize language service';
      setError(errorMessage);
      
      if (showInitializationErrors) {
        Alert.alert('Language Initialization Error', errorMessage);
      }
      
      console.error('Language initialization error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [
    culturalProfile, 
    culturalLoading, 
    fallbackLanguage, 
    autoDetectLanguage, 
    showInitializationErrors, 
    dispatch
  ]);

  // Initialize on mount and when cultural profile changes
  useEffect(() => {
    initializeLanguageService();
  }, [initializeLanguageService]);

  // Handle cultural profile errors
  useEffect(() => {
    if (culturalError) {
      setError(`Cultural profile error: ${culturalError}`);
      setIsLoading(false);
    }
  }, [culturalError]);

  // Subscribe to language changes from i18n service
  useEffect(() => {
    const unsubscribe = i18nService.onLanguageChange((newLanguage) => {
      setCurrentLanguage(newLanguage);
    });

    return unsubscribe;
  }, []);

  // Change language function
  const changeLanguage = useCallback(async (language: SupportedLanguage): Promise<void> => {
    try {
      setError(null);
      
      if (!i18nService.isLanguageSupported(language)) {
        throw new Error(`Language ${language} is not supported`);
      }

      await i18nService.setLanguage(language);
      setCurrentLanguage(language);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to change language';
      setError(errorMessage);
      throw new Error(errorMessage);
    }
  }, []);

  // Get available languages
  const getAvailableLanguages = useCallback(() => {
    return i18nService.getAvailableLanguages().map(lang => ({
      code: lang.code,
      name: lang.name,
      nativeName: lang.nativeName,
    }));
  }, []);

  // Translation function with error handling
  const translate = useCallback((key: string, options: any = {}) => {
    try {
      if (!isInitialized) {
        return key; // Return key if not initialized yet
      }
      
      return i18nService.translate(key, options);
    } catch (err) {
      console.warn(`Translation error for key "${key}":`, err);
      return options.fallback || key;
    }
  }, [isInitialized]);

  // Context value
  const contextValue: LanguageContextType = {
    currentLanguage,
    isInitialized,
    isLoading,
    error,
    changeLanguage,
    getAvailableLanguages,
    translate,
  };

  return (
    <LanguageContext.Provider value={contextValue}>
      {children}
    </LanguageContext.Provider>
  );
}

// Hook to use language context
export function useLanguageContext(): LanguageContextType {
  const context = useContext(LanguageContext);
  
  if (!context) {
    throw new Error('useLanguageContext must be used within a LanguageProvider');
  }
  
  return context;
}

// HOC for components that need language context
export function withLanguageProvider<T extends object>(
  Component: React.ComponentType<T>,
  providerProps?: Partial<LanguageProviderProps>
) {
  return function WrappedComponent(props: T) {
    return (
      <LanguageProvider {...providerProps}>
        <Component {...props} />
      </LanguageProvider>
    );
  };
}

export default LanguageProvider;