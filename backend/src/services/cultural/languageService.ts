/**
 * Malaysian Healthcare Language Service
 * Provides multi-language support for healthcare terminology
 * Supports Bahasa Malaysia, English, Tamil, Mandarin with medical context
 */

import path from 'path';
import fs from 'fs/promises';

export interface LanguageConfig {
  code: string;
  name_en: string;
  name_native: string;
  name_ms: string;
  official: boolean;
  medical_terms_available: boolean;
  healthcare_translation_priority: number;
  common_greetings: Record<string, string>;
  medical_phrases: Record<string, string>;
}

export interface TranslationContext {
  domain?: 'general' | 'medical' | 'emergency' | 'appointment' | 'prescription' | 'diagnosis';
  urgency?: 'low' | 'medium' | 'high' | 'critical';
  audience?: 'patient' | 'family' | 'provider' | 'admin';
  cultural_sensitivity?: boolean;
}

export interface TranslationResult {
  text: string;
  language: string;
  confidence: number;
  context_adapted: boolean;
  cultural_notes?: string[];
  alternatives?: string[];
  pronunciation?: string;
}

export interface MedicalTerminology {
  term_id: string;
  category: string;
  en: string;
  ms: string;
  zh: string;
  ta: string;
  definition?: {
    en?: string;
    ms?: string;
    zh?: string;
    ta?: string;
  };
  context?: string;
  severity?: 'informational' | 'concerning' | 'urgent' | 'critical';
  cultural_considerations?: string[];
}

export class LanguageService {
  private languages: Map<string, LanguageConfig> = new Map();
  private medicalTerminology: Map<string, MedicalTerminology> = new Map();
  private translations: Map<string, Map<string, string>> = new Map();
  private initialized = false;

  // Malaysian healthcare specialty translations
  private readonly HEALTHCARE_SPECIALTIES = {
    'cardiology': {
      en: 'Cardiology',
      ms: 'Kardiologi',
      zh: '心脏科',
      ta: 'இதயவியல்'
    },
    'dermatology': {
      en: 'Dermatology',
      ms: 'Dermatologi',
      zh: '皮肤科',
      ta: 'தோல்நோயியல்'
    },
    'orthopedics': {
      en: 'Orthopedics',
      ms: 'Ortopedik',
      zh: '骨科',
      ta: 'எலும்பியல்'
    },
    'pediatrics': {
      en: 'Pediatrics',
      ms: 'Pediatrik',
      zh: '儿科',
      ta: 'குழந்தைகள் மருத்துவம்'
    },
    'psychiatry': {
      en: 'Psychiatry',
      ms: 'Psikiatri',
      zh: '精神科',
      ta: 'மனநல மருத்துவம்'
    }
  };

  // Common medical conditions in all languages
  private readonly MEDICAL_CONDITIONS = {
    'diabetes': {
      en: 'Diabetes',
      ms: 'Kencing Manis',
      zh: '糖尿病',
      ta: 'நீரிழிவு',
      cultural_considerations: ['dietary restrictions', 'fasting during Ramadan']
    },
    'hypertension': {
      en: 'High Blood Pressure',
      ms: 'Tekanan Darah Tinggi',
      zh: '高血压',
      ta: 'உயர் இரத்த அழுத்தம்'
    },
    'fever': {
      en: 'Fever',
      ms: 'Demam',
      zh: '发烧',
      ta: 'காய்ச்சல்'
    },
    'chest_pain': {
      en: 'Chest Pain',
      ms: 'Sakit Dada',
      zh: '胸痛',
      ta: 'மார்பு வலி',
      cultural_considerations: ['emergency symptom', 'immediate attention needed']
    }
  };

  // Emergency medical phrases
  private readonly EMERGENCY_PHRASES = {
    'call_ambulance': {
      en: 'Call an ambulance',
      ms: 'Panggil ambulan',
      zh: '叫救护车',
      ta: 'ஆம்புலன்ஸை அழைக்கவும்'
    },
    'emergency_room': {
      en: 'Emergency Room',
      ms: 'Bilik Kecemasan',
      zh: '急诊室',
      ta: 'அவசர சிகிச்சை அறை'
    },
    'severe_pain': {
      en: 'Severe pain',
      ms: 'Sakit yang teruk',
      zh: '剧烈疼痛',
      ta: 'கடுமையான வலி'
    },
    'allergic_reaction': {
      en: 'Allergic reaction',
      ms: 'Reaksi alahan',
      zh: '过敏反应',
      ta: 'ஒவ்வாமை எதிர்வினை'
    }
  };

  // Appointment-related phrases
  private readonly APPOINTMENT_PHRASES = {
    'book_appointment': {
      en: 'Book an appointment',
      ms: 'Buat temujanji',
      zh: '预约',
      ta: 'சந்திப்பை முன்பதிவு செய்யவும்'
    },
    'reschedule': {
      en: 'Reschedule',
      ms: 'Ubah jadual',
      zh: '重新安排',
      ta: 'மீண்டும் திட்டமிடுங்கள்'
    },
    'follow_up': {
      en: 'Follow-up appointment',
      ms: 'Temujanji susulan',
      zh: '复诊',
      ta: 'பின்தொடர்தல் சந்திப்பு'
    }
  };

  /**
   * Initialize the language service
   */
  async initialize(): Promise<void> {
    console.log('🗣️ Initializing Malaysian Healthcare Language Service...');
    
    try {
      await this.loadLanguageConfigs();
      await this.loadMedicalTerminology();
      await this.loadTranslations();
      
      this.initialized = true;
      console.log(`✅ Language Service initialized with ${this.languages.size} languages`);
    } catch (error) {
      console.error('❌ Failed to initialize Language Service:', error);
      throw error;
    }
  }

  /**
   * Translate text to target language with medical context
   */
  async translate(
    text: string,
    targetLanguage: string,
    sourceLanguage: string = 'en',
    context?: TranslationContext
  ): Promise<TranslationResult> {
    if (!this.initialized) {
      throw new Error('Language Service not initialized');
    }

    const langConfig = this.languages.get(targetLanguage);
    if (!langConfig) {
      throw new Error(`Unsupported target language: ${targetLanguage}`);
    }

    // Check for direct medical terminology translations
    const medicalTranslation = await this.translateMedicalTerm(text, targetLanguage, context);
    if (medicalTranslation) {
      return medicalTranslation;
    }

    // Check for common healthcare phrases
    const phraseTranslation = await this.translateHealthcarePhrase(text, targetLanguage, context);
    if (phraseTranslation) {
      return phraseTranslation;
    }

    // Fallback to general translation
    return this.performGeneralTranslation(text, targetLanguage, sourceLanguage, context);
  }

  /**
   * Get medical terminology in all supported languages
   */
  getMedicalTerm(termKey: string): MedicalTerminology | null {
    return this.medicalTerminology.get(termKey) || null;
  }

  /**
   * Search medical terminology
   */
  searchMedicalTerms(query: string, language: string = 'en'): MedicalTerminology[] {
    const results: MedicalTerminology[] = [];
    const lowerQuery = query.toLowerCase();

    for (const term of this.medicalTerminology.values()) {
      const searchText = term[language as keyof MedicalTerminology] as string;
      if (searchText && searchText.toLowerCase().includes(lowerQuery)) {
        results.push(term);
      }
    }

    return results.slice(0, 10); // Limit results
  }

  /**
   * Get culturally appropriate greetings
   */
  getCulturalGreetings(language: string): Record<string, string> {
    const langConfig = this.languages.get(language);
    return langConfig?.common_greetings || {};
  }

  /**
   * Get medical phrases for a language
   */
  getMedicalPhrases(language: string): Record<string, string> {
    const langConfig = this.languages.get(language);
    return langConfig?.medical_phrases || {};
  }

  /**
   * Get emergency phrases in multiple languages
   */
  getEmergencyPhrases(languages: string[] = ['ms', 'en', 'zh', 'ta']): Record<string, Record<string, string>> {
    const result: Record<string, Record<string, string>> = {};
    
    for (const [key, translations] of Object.entries(this.EMERGENCY_PHRASES)) {
      result[key] = {};
      for (const lang of languages) {
        if (translations[lang as keyof typeof translations]) {
          result[key][lang] = translations[lang as keyof typeof translations];
        }
      }
    }

    return result;
  }

  /**
   * Validate text for cultural sensitivity
   */
  validateCulturalSensitivity(text: string, language: string): {
    is_appropriate: boolean;
    concerns?: string[];
    suggestions?: string[];
  } {
    const concerns: string[] = [];
    const suggestions: string[] = [];

    // Check for potentially sensitive terms
    const sensitivePatterns = {
      'pork': 'Consider using "non-halal meat" for Muslim patients',
      'alcohol': 'Note religious considerations for Muslim patients',
      'blood_transfusion': 'Some religious groups may have concerns',
      'organ_donation': 'Cultural and religious sensitivities may apply'
    };

    for (const [pattern, suggestion] of Object.entries(sensitivePatterns)) {
      if (text.toLowerCase().includes(pattern.replace('_', ' '))) {
        concerns.push(pattern);
        suggestions.push(suggestion);
      }
    }

    return {
      is_appropriate: concerns.length === 0,
      concerns: concerns.length > 0 ? concerns : undefined,
      suggestions: suggestions.length > 0 ? suggestions : undefined
    };
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages(): LanguageConfig[] {
    return Array.from(this.languages.values())
      .sort((a, b) => a.healthcare_translation_priority - b.healthcare_translation_priority);
  }

  /**
   * Check if language is supported
   */
  isLanguageSupported(languageCode: string): boolean {
    return this.languages.has(languageCode);
  }

  /**
   * Get language configuration
   */
  getLanguageConfig(languageCode: string): LanguageConfig | null {
    return this.languages.get(languageCode) || null;
  }

  /**
   * Get pronunciation guide for medical terms
   */
  getPronunciationGuide(term: string, language: string): string | null {
    // Simple pronunciation mapping for common terms
    const pronunciationMap: Record<string, Record<string, string>> = {
      'ms': {
        'hospital': 'hos-pi-tal',
        'doktor': 'dok-tor',
        'ubat': 'u-bat',
        'demam': 'de-mam'
      },
      'zh': {
        '医院': 'yī yuán',
        '医生': 'yī shēng',
        '药': 'yào',
        '发烧': 'fā shāo'
      },
      'ta': {
        'மருத்துவமனை': 'ma-rut-tu-va-ma-nai',
        'மருத்துவர்': 'ma-rut-tu-var',
        'மருந்து': 'ma-run-tu',
        'காய்ச்சல்': 'kaai-ch-chal'
      }
    };

    return pronunciationMap[language]?.[term] || null;
  }

  // Private methods

  private async loadLanguageConfigs(): Promise<void> {
    try {
      const languageDataPath = path.join(process.cwd(), 'data', 'malaysia', 'languages.json');
      const languageData = await fs.readFile(languageDataPath, 'utf-8');
      const languages: LanguageConfig[] = JSON.parse(languageData);

      for (const lang of languages) {
        this.languages.set(lang.code, lang);
      }

      console.log(`📚 Loaded ${languages.length} language configurations`);
    } catch (error) {
      console.error('Failed to load language configs:', error);
      // Fallback to hardcoded configs
      this.loadFallbackLanguages();
    }
  }

  private loadFallbackLanguages(): void {
    const fallbackLanguages: LanguageConfig[] = [
      {
        code: 'ms',
        name_en: 'Malay',
        name_native: 'Bahasa Melayu',
        name_ms: 'Bahasa Melayu',
        official: true,
        medical_terms_available: true,
        healthcare_translation_priority: 1,
        common_greetings: {
          hello: 'Selamat datang',
          good_morning: 'Selamat pagi',
          thank_you: 'Terima kasih'
        },
        medical_phrases: {
          doctor: 'Doktor',
          hospital: 'Hospital',
          medicine: 'Ubat'
        }
      },
      {
        code: 'en',
        name_en: 'English',
        name_native: 'English',
        name_ms: 'Bahasa Inggeris',
        official: true,
        medical_terms_available: true,
        healthcare_translation_priority: 2,
        common_greetings: {
          hello: 'Hello',
          good_morning: 'Good morning',
          thank_you: 'Thank you'
        },
        medical_phrases: {
          doctor: 'Doctor',
          hospital: 'Hospital',
          medicine: 'Medicine'
        }
      }
    ];

    for (const lang of fallbackLanguages) {
      this.languages.set(lang.code, lang);
    }
  }

  private async loadMedicalTerminology(): Promise<void> {
    // Load medical terms from healthcare specialties and conditions
    for (const [key, translations] of Object.entries({...this.HEALTHCARE_SPECIALTIES, ...this.MEDICAL_CONDITIONS})) {
      const terminology: MedicalTerminology = {
        term_id: key,
        category: 'medical',
        en: translations.en,
        ms: translations.ms,
        zh: translations.zh,
        ta: translations.ta,
        cultural_considerations: translations.cultural_considerations
      };

      this.medicalTerminology.set(key, terminology);
    }

    console.log(`📖 Loaded ${this.medicalTerminology.size} medical terms`);
  }

  private async loadTranslations(): Promise<void> {
    // Load phrase translations
    const phraseCategories = {
      emergency: this.EMERGENCY_PHRASES,
      appointments: this.APPOINTMENT_PHRASES
    };

    for (const [category, phrases] of Object.entries(phraseCategories)) {
      const categoryTranslations = new Map<string, string>();
      
      for (const [key, translations] of Object.entries(phrases)) {
        for (const [lang, text] of Object.entries(translations)) {
          categoryTranslations.set(`${key}_${lang}`, text);
        }
      }
      
      this.translations.set(category, categoryTranslations);
    }

    console.log(`🔤 Loaded translations for ${this.translations.size} categories`);
  }

  private async translateMedicalTerm(
    text: string,
    targetLanguage: string,
    context?: TranslationContext
  ): Promise<TranslationResult | null> {
    const lowerText = text.toLowerCase();
    
    for (const [termId, term] of this.medicalTerminology.entries()) {
      if (term.en.toLowerCase() === lowerText) {
        const translatedText = term[targetLanguage as keyof MedicalTerminology] as string;
        
        if (translatedText) {
          return {
            text: translatedText,
            language: targetLanguage,
            confidence: 0.95,
            context_adapted: true,
            cultural_notes: term.cultural_considerations,
            pronunciation: this.getPronunciationGuide(translatedText, targetLanguage) || undefined
          };
        }
      }
    }

    return null;
  }

  private async translateHealthcarePhrase(
    text: string,
    targetLanguage: string,
    context?: TranslationResult
  ): Promise<TranslationResult | null> {
    const lowerText = text.toLowerCase();
    
    // Check emergency phrases first for urgent contexts
    if (context?.urgency === 'critical' || context?.urgency === 'high') {
      for (const [key, translations] of Object.entries(this.EMERGENCY_PHRASES)) {
        if (translations.en.toLowerCase() === lowerText) {
          const translatedText = translations[targetLanguage as keyof typeof translations];
          if (translatedText) {
            return {
              text: translatedText,
              language: targetLanguage,
              confidence: 0.90,
              context_adapted: true,
              cultural_notes: ['Emergency phrase - use with appropriate urgency']
            };
          }
        }
      }
    }

    // Check appointment phrases
    for (const [key, translations] of Object.entries(this.APPOINTMENT_PHRASES)) {
      if (translations.en.toLowerCase() === lowerText) {
        const translatedText = translations[targetLanguage as keyof typeof translations];
        if (translatedText) {
          return {
            text: translatedText,
            language: targetLanguage,
            confidence: 0.85,
            context_adapted: true
          };
        }
      }
    }

    return null;
  }

  private performGeneralTranslation(
    text: string,
    targetLanguage: string,
    sourceLanguage: string,
    context?: TranslationContext
  ): TranslationResult {
    // Fallback general translation (in production, integrate with translation API)
    return {
      text: `[${targetLanguage.toUpperCase()}] ${text}`, // Mock translation
      language: targetLanguage,
      confidence: 0.60,
      context_adapted: false,
      cultural_notes: ['Machine translation - review for cultural appropriateness']
    };
  }
}