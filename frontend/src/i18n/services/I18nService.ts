/**
 * I18n Service
 * 
 * Comprehensive internationalization service for MediMate Malaysia
 * with cultural context, dynamic language switching, and Malaysia-specific
 * healthcare terminology support.
 */

import { culturalService } from '@/api/services/culturalService';
import { 
  translations, 
  type SupportedLanguage, 
  type TranslationResources,
  languageMetadata,
  medicalTerminology,
  culturalFormatting,
  rtlSupport,
} from '../translations';

interface I18nContext {
  language: SupportedLanguage;
  region: string;
  culturalProfile?: any;
  fallbackLanguage: SupportedLanguage;
}

interface TranslationOptions {
  count?: number;
  context?: string;
  variables?: Record<string, string | number>;
  fallback?: string;
  culturalContext?: boolean;
}

interface CulturalTranslationRequest {
  key: string;
  language: SupportedLanguage;
  culturalContext?: {
    religion?: string;
    region?: string;
    familyStructure?: string;
    medicalContext?: boolean;
  };
}

export class I18nService {
  private currentLanguage: SupportedLanguage = 'en';
  private fallbackLanguage: SupportedLanguage = 'en';
  private context: I18nContext;
  private cache: Map<string, string> = new Map();
  private observers: Array<(language: SupportedLanguage) => void> = [];
  
  constructor() {
    this.context = {
      language: 'en',
      region: 'MY',
      fallbackLanguage: 'en',
    };
    
    this.loadLanguageFromStorage();
  }

  /**
   * Initialize i18n service with cultural profile
   */
  async initialize(culturalProfile?: any): Promise<void> {
    try {
      if (culturalProfile?.language) {
        await this.setLanguage(culturalProfile.language);
      }
      
      this.context = {
        ...this.context,
        culturalProfile,
      };
      
      // Pre-load common medical terms
      await this.preloadMedicalTerminology();
    } catch (error) {
      console.warn('I18n initialization warning:', error);
    }
  }

  /**
   * Set current language with cultural context
   */
  async setLanguage(language: SupportedLanguage): Promise<void> {
    if (!this.isLanguageSupported(language)) {
      console.warn(`Language ${language} not supported, falling back to ${this.fallbackLanguage}`);
      language = this.fallbackLanguage;
    }

    const previousLanguage = this.currentLanguage;
    this.currentLanguage = language;
    
    // Update context
    this.context = {
      ...this.context,
      language,
      fallbackLanguage: languageMetadata[language].fallbacks[0] || 'en',
    };

    // Clear cache to force re-translation
    this.cache.clear();

    // Save to storage
    await this.saveLanguageToStorage(language);

    // Notify observers
    if (previousLanguage !== language) {
      this.notifyLanguageChange(language);
    }
  }

  /**
   * Get current language
   */
  getCurrentLanguage(): SupportedLanguage {
    return this.currentLanguage;
  }

  /**
   * Check if language is supported
   */
  isLanguageSupported(language: string): language is SupportedLanguage {
    return language in translations;
  }

  /**
   * Translate text with full cultural context
   */
  translate(key: string, options: TranslationOptions = {}): string {
    const cacheKey = this.buildCacheKey(key, options);
    
    // Check cache first
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    let translation = this.getTranslation(key, this.currentLanguage, options);

    // Apply variable substitution
    if (options.variables) {
      translation = this.substituteVariables(translation, options.variables);
    }

    // Apply pluralization
    if (options.count !== undefined) {
      translation = this.applyPluralization(translation, options.count, this.currentLanguage);
    }

    // Apply cultural context if needed
    if (options.culturalContext && this.context.culturalProfile) {
      translation = this.applyCulturalContext(translation, key);
    }

    // Cache the result
    this.cache.set(cacheKey, translation);
    
    return translation;
  }

  /**
   * Translate medical terminology with cultural context
   */
  translateMedical(
    term: string, 
    targetLanguage?: SupportedLanguage, 
    culturalContext?: any
  ): string {
    const language = targetLanguage || this.currentLanguage;
    
    // Check if it's a standard medical term
    if (medicalTerminology[term]) {
      return medicalTerminology[term][language] || medicalTerminology[term]['en'];
    }

    // For complex medical phrases, use AI-powered translation
    return this.translate(`medical.${term}`, { culturalContext: !!culturalContext });
  }

  /**
   * Get culturally appropriate date/time formatting
   */
  formatDateTime(
    date: Date, 
    type: 'date' | 'time' | 'datetime' = 'datetime',
    language?: SupportedLanguage
  ): string {
    const lang = language || this.currentLanguage;
    const formatting = culturalFormatting[lang];
    
    const options: Intl.DateTimeFormatOptions = {};
    
    if (type === 'date' || type === 'datetime') {
      if (lang === 'zh' && formatting.preferredCalendar === 'lunar') {
        // Add lunar calendar support for Chinese users
        options.calendar = 'chinese';
      }
      
      options.year = 'numeric';
      options.month = '2-digit';
      options.day = '2-digit';
    }
    
    if (type === 'time' || type === 'datetime') {
      options.hour = '2-digit';
      options.minute = '2-digit';
      options.hour12 = formatting.timeFormat === '12h';
    }

    try {
      return new Intl.DateTimeFormat(this.getLocaleCode(lang), options).format(date);
    } catch (error) {
      // Fallback to simple formatting
      return date.toLocaleDateString();
    }
  }

  /**
   * Format currency for Malaysian context
   */
  formatCurrency(amount: number, language?: SupportedLanguage): string {
    const lang = language || this.currentLanguage;
    const formatting = culturalFormatting[lang];
    
    try {
      return new Intl.NumberFormat(this.getLocaleCode(lang), {
        style: 'currency',
        currency: 'MYR',
        currencyDisplay: 'symbol',
      }).format(amount);
    } catch (error) {
      // Fallback formatting
      return `${formatting.currencyFormat} ${amount.toFixed(2)}`;
    }
  }

  /**
   * Get language metadata
   */
  getLanguageMetadata(language?: SupportedLanguage) {
    return languageMetadata[language || this.currentLanguage];
  }

  /**
   * Check if text contains RTL content
   */
  hasRtlContent(text: string, language?: SupportedLanguage): boolean {
    const lang = language || this.currentLanguage;
    const rtlInfo = rtlSupport[lang];
    
    if (!rtlInfo.hasRtlContent) return false;
    
    // Check for RTL words or phrases
    if (rtlInfo.rtlWords?.some(word => text.includes(word))) return true;
    if (rtlInfo.rtlPhrases?.some(phrase => text.includes(phrase))) return true;
    
    return false;
  }

  /**
   * Get text direction for current language
   */
  getTextDirection(language?: SupportedLanguage): 'ltr' | 'rtl' {
    const lang = language || this.currentLanguage;
    return languageMetadata[lang].dir;
  }

  /**
   * Get font family for current language
   */
  getFontFamily(language?: SupportedLanguage): string {
    const lang = language || this.currentLanguage;
    return languageMetadata[lang].fontFamily || 'System';
  }

  /**
   * Subscribe to language changes
   */
  onLanguageChange(callback: (language: SupportedLanguage) => void): () => void {
    this.observers.push(callback);
    
    // Return unsubscribe function
    return () => {
      const index = this.observers.indexOf(callback);
      if (index > -1) {
        this.observers.splice(index, 1);
      }
    };
  }

  /**
   * Get available languages with metadata
   */
  getAvailableLanguages() {
    return Object.entries(languageMetadata).map(([code, metadata]) => ({
      code: code as SupportedLanguage,
      ...metadata,
    }));
  }

  /**
   * Advanced translation with AI fallback for complex medical terms
   */
  async translateWithAI(request: CulturalTranslationRequest): Promise<string> {
    try {
      // First try local translation
      const localTranslation = this.translate(request.key);
      
      // If it's a medical context and we have cultural context, enhance with AI
      if (request.culturalContext?.medicalContext && this.context.culturalProfile) {
        const enhancedRequest = {
          text: localTranslation,
          target_language: request.language,
          source_language: 'en' as const,
          context: {
            domain: 'medical' as const,
            cultural_context: request.culturalContext,
          },
        };

        const aiResponse = await culturalService.translateText(enhancedRequest);
        
        if (aiResponse.success && aiResponse.data?.translated_text) {
          return aiResponse.data.translated_text;
        }
      }

      return localTranslation;
    } catch (error) {
      console.warn('AI translation failed, using local fallback:', error);
      return this.translate(request.key);
    }
  }

  // Private methods

  private getTranslation(
    key: string, 
    language: SupportedLanguage, 
    options: TranslationOptions
  ): string {
    const keys = key.split('.');
    let value: any = translations[language];

    // Navigate through nested keys
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        // Try fallback language
        value = this.getFallbackTranslation(key, language);
        break;
      }
    }

    if (typeof value === 'string') {
      return value;
    }

    // Return fallback or key if translation not found
    return options.fallback || key;
  }

  private getFallbackTranslation(key: string, originalLanguage: SupportedLanguage): string {
    const fallbackLang = languageMetadata[originalLanguage].fallbacks[0];
    
    if (fallbackLang && fallbackLang !== originalLanguage) {
      const keys = key.split('.');
      let value: any = translations[fallbackLang];

      for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
          value = value[k];
        } else {
          return key; // Return key if even fallback fails
        }
      }

      if (typeof value === 'string') {
        return value;
      }
    }

    return key;
  }

  private substituteVariables(text: string, variables: Record<string, string | number>): string {
    return text.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      return variables[key]?.toString() || match;
    });
  }

  private applyPluralization(text: string, count: number, language: SupportedLanguage): string {
    // Simple pluralization logic - can be enhanced for complex plural rules
    if (language === 'en' && count !== 1) {
      // Basic English pluralization
      if (text.endsWith('s')) return text;
      return text + 's';
    }
    
    // Other languages may have different pluralization rules
    return text;
  }

  private applyCulturalContext(translation: string, key: string): string {
    const profile = this.context.culturalProfile;
    
    if (!profile) return translation;

    // Apply prayer time context
    if (key.includes('prayer') && profile.prayerTimes?.enabled) {
      // Add cultural notes based on madhab
      if (profile.prayerTimes.madhab === 'hanafi') {
        translation += ` (${this.translate('cultural.hanafi_calculation')})`;
      }
    }

    // Apply halal context
    if (key.includes('medication') && profile.religion === 'islam') {
      // Add halal consideration note
      translation += ` ${this.translate('medications.cultural.halalConsideration')}`;
    }

    return translation;
  }

  private buildCacheKey(key: string, options: TranslationOptions): string {
    return `${this.currentLanguage}:${key}:${JSON.stringify(options)}`;
  }

  private getLocaleCode(language: SupportedLanguage): string {
    const localeMap = {
      'en': 'en-MY',
      'ms': 'ms-MY',
      'zh': 'zh-CN',
      'ta': 'ta-MY',
    };
    return localeMap[language];
  }

  private async preloadMedicalTerminology(): Promise<void> {
    // Pre-cache common medical terms for better performance
    const commonTerms = Object.keys(medicalTerminology);
    
    for (const term of commonTerms) {
      for (const lang of Object.keys(translations) as SupportedLanguage[]) {
        const translation = medicalTerminology[term][lang];
        if (translation) {
          this.cache.set(`${lang}:medical.${term}:{}`, translation);
        }
      }
    }
  }

  private async saveLanguageToStorage(language: SupportedLanguage): Promise<void> {
    try {
      // This would integrate with your storage service
      // await storageService.setItem('app_language', language);
      console.log(`Language ${language} saved to storage`);
    } catch (error) {
      console.warn('Failed to save language to storage:', error);
    }
  }

  private async loadLanguageFromStorage(): Promise<void> {
    try {
      // This would integrate with your storage service
      // const storedLanguage = await storageService.getItem('app_language');
      // if (storedLanguage && this.isLanguageSupported(storedLanguage)) {
      //   this.currentLanguage = storedLanguage;
      // }
    } catch (error) {
      console.warn('Failed to load language from storage:', error);
    }
  }

  private notifyLanguageChange(language: SupportedLanguage): void {
    this.observers.forEach(callback => {
      try {
        callback(language);
      } catch (error) {
        console.error('Error in language change observer:', error);
      }
    });
  }
}

// Singleton instance
export const i18nService = new I18nService();
export default i18nService;