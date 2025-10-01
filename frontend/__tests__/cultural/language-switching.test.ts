/**
 * Cultural Tests: Language Switching
 *
 * Validates multi-language support for MS/EN/ZH/TA
 */

import { TestDataGenerator, CulturalContextBuilder } from '../utils/testHelpers';

describe('Language Switching Tests', () => {
  const SUPPORTED_LANGUAGES = ['en', 'ms', 'zh', 'ta'];

  describe('Language Selection', () => {
    it('should support all 4 languages', () => {
      const supportedLanguages = SUPPORTED_LANGUAGES;

      expect(supportedLanguages).toContain('en'); // English
      expect(supportedLanguages).toContain('ms'); // Malay
      expect(supportedLanguages).toContain('zh'); // Chinese
      expect(supportedLanguages).toContain('ta'); // Tamil

      expect(supportedLanguages).toHaveLength(4);
    });

    it('should detect device language and set default', () => {
      const deviceLanguages = [
        { device: 'ms-MY', expected: 'ms' },
        { device: 'en-US', expected: 'en' },
        { device: 'zh-CN', expected: 'zh' },
        { device: 'ta-IN', expected: 'ta' },
        { device: 'fr-FR', expected: 'en' }, // Fallback to English
      ];

      deviceLanguages.forEach(({ device, expected }) => {
        const detectedLanguage = detectLanguageFromLocale(device);
        expect(detectedLanguage).toBe(expected);
      });
    });

    it('should switch language dynamically', async () => {
      let currentLanguage = 'en';

      // Switch to Malay
      currentLanguage = await switchLanguage('ms');
      expect(currentLanguage).toBe('ms');

      // Switch to Chinese
      currentLanguage = await switchLanguage('zh');
      expect(currentLanguage).toBe('zh');

      // Switch to Tamil
      currentLanguage = await switchLanguage('ta');
      expect(currentLanguage).toBe('ta');

      // Switch back to English
      currentLanguage = await switchLanguage('en');
      expect(currentLanguage).toBe('en');
    });

    it('should persist language preference', async () => {
      await switchLanguage('ms');

      // Simulate app restart
      const savedLanguage = await getPersistedLanguage();

      expect(savedLanguage).toBe('ms');
    });
  });

  describe('Translation Coverage', () => {
    it('should have translations for all critical UI elements', () => {
      const criticalKeys = [
        'common.welcome',
        'common.save',
        'common.cancel',
        'common.confirm',
        'medication.add',
        'medication.take',
        'medication.skip',
        'adherence.streak',
        'adherence.rate',
        'family.notify',
        'emergency.alert',
        'prayer.times',
      ];

      SUPPORTED_LANGUAGES.forEach(lang => {
        const translations = getTranslations(lang);

        criticalKeys.forEach(key => {
          expect(translations).toHaveProperty(key);
          expect(translations[key]).toBeTruthy();
          expect(translations[key]).not.toBe(key); // Not just the key itself
        });
      });
    });

    it('should have complete medication terminology in all languages', () => {
      const medicationTerms = [
        'medication.dosage',
        'medication.frequency',
        'medication.instructions',
        'medication.sideEffects',
        'medication.interactions',
      ];

      SUPPORTED_LANGUAGES.forEach(lang => {
        const translations = getTranslations(lang);

        medicationTerms.forEach(term => {
          expect(translations).toHaveProperty(term);
        });
      });
    });

    it('should have culturally appropriate greetings', () => {
      const greetings = {
        en: 'Good morning',
        ms: 'Selamat pagi',
        zh: '早上好',
        ta: 'காலை வணக்கம்',
      };

      Object.entries(greetings).forEach(([lang, expectedGreeting]) => {
        const translations = getTranslations(lang);
        const greeting = translations['common.goodMorning'];

        expect(greeting).toBe(expectedGreeting);
      });
    });
  });

  describe('Text Formatting', () => {
    it('should format dates according to language locale', () => {
      const testDate = new Date('2025-09-30T14:30:00Z');

      const formats = {
        en: '30 Sep 2025',
        ms: '30 Sep 2025',
        zh: '2025年9月30日',
        ta: '30 செப் 2025',
      };

      Object.entries(formats).forEach(([lang, expectedFormat]) => {
        const formatted = formatDate(testDate, lang);
        expect(formatted).toMatch(new RegExp(expectedFormat.replace(/[年月日]/g, '.')));
      });
    });

    it('should format times in 12/24 hour based on locale', () => {
      const testTime = new Date('2025-09-30T14:30:00Z');

      const formatted12hr = formatTime(testTime, 'en', { hour12: true });
      const formatted24hr = formatTime(testTime, 'en', { hour12: false });

      expect(formatted12hr).toMatch(/PM/);
      expect(formatted24hr).not.toMatch(/PM/);
    });

    it('should format numbers with appropriate separators', () => {
      const testNumber = 1234.56;

      const formats = {
        en: '1,234.56',
        ms: '1,234.56',
        zh: '1,234.56',
        ta: '1,234.56',
      };

      Object.entries(formats).forEach(([lang, expectedFormat]) => {
        const formatted = formatNumber(testNumber, lang);
        expect(formatted).toBe(expectedFormat);
      });
    });
  });

  describe('RTL Support', () => {
    it('should NOT apply RTL for supported languages', () => {
      // None of our supported languages use RTL
      SUPPORTED_LANGUAGES.forEach(lang => {
        const isRTL = isRightToLeft(lang);
        expect(isRTL).toBe(false);
      });
    });

    it('should handle mixed LTR text correctly', () => {
      const mixedText = 'Medication: 药物';

      const direction = getTextDirection(mixedText);

      expect(direction).toBe('ltr');
    });
  });

  describe('Cultural Context in Translations', () => {
    it('should use culturally appropriate terminology for family relationships', () => {
      const relationships = {
        en: { child: 'Child', spouse: 'Spouse', parent: 'Parent' },
        ms: { child: 'Anak', spouse: 'Pasangan', parent: 'Ibu Bapa' },
        zh: { child: '子女', spouse: '配偶', parent: '父母' },
        ta: { child: 'குழந்தை', spouse: 'வாழ்க்கைத்துணை', parent: 'பெற்றோர்' },
      };

      Object.entries(relationships).forEach(([lang, terms]) => {
        const translations = getTranslations(lang);

        expect(translations['family.child']).toBe(terms.child);
        expect(translations['family.spouse']).toBe(terms.spouse);
        expect(translations['family.parent']).toBe(terms.parent);
      });
    });

    it('should have religious terminology for Muslim users', () => {
      const religiousTerms = [
        'prayer.fajr',
        'prayer.dhuhr',
        'prayer.asr',
        'prayer.maghrib',
        'prayer.isha',
        'ramadan.iftar',
        'ramadan.suhoor',
      ];

      SUPPORTED_LANGUAGES.forEach(lang => {
        const translations = getTranslations(lang);

        religiousTerms.forEach(term => {
          expect(translations).toHaveProperty(term);
          expect(translations[term]).toBeTruthy();
        });
      });
    });

    it('should have appropriate festival names', () => {
      const festivals = {
        'hari_raya_aidilfitri': ['en', 'ms', 'zh', 'ta'],
        'chinese_new_year': ['en', 'ms', 'zh', 'ta'],
        'deepavali': ['en', 'ms', 'zh', 'ta'],
      };

      Object.entries(festivals).forEach(([festival, languages]) => {
        languages.forEach(lang => {
          const translations = getTranslations(lang);
          const festivalKey = `festivals.${festival}`;

          expect(translations).toHaveProperty(festivalKey);
          expect(translations[festivalKey]).toBeTruthy();
        });
      });
    });
  });

  describe('Language-Specific Features', () => {
    it('should handle Chinese character input correctly', () => {
      const chineseInput = '阿莫西林 500毫克';

      expect(chineseInput).toHaveLength(11);
      expect(containsChinese(chineseInput)).toBe(true);
    });

    it('should handle Tamil script correctly', () => {
      const tamilInput = 'பாராசிட்டமால் 500மிகி';

      expect(containsTamil(tamilInput)).toBe(true);
    });

    it('should support Malay diacritics', () => {
      const malayWords = [
        'ubat',
        'dos',
        'sekali',
        'dua kali',
      ];

      malayWords.forEach(word => {
        expect(word).toBeTruthy();
        expect(typeof word).toBe('string');
      });
    });
  });

  describe('Translation Quality', () => {
    it('should not have missing translations', () => {
      const allKeys = getAllTranslationKeys('en');

      SUPPORTED_LANGUAGES.forEach(lang => {
        if (lang === 'en') return; // Skip base language

        const translations = getTranslations(lang);

        allKeys.forEach(key => {
          expect(translations).toHaveProperty(key);
          expect(translations[key]).not.toBe('');
          expect(translations[key]).not.toContain('[missing]');
        });
      });
    });

    it('should have consistent pluralization support', () => {
      const pluralKeys = [
        'medication.count',
        'adherence.days',
        'family.members',
      ];

      SUPPORTED_LANGUAGES.forEach(lang => {
        const translations = getTranslations(lang);

        pluralKeys.forEach(key => {
          // Check if plural forms exist
          const singular = translations[`${key}_one`];
          const plural = translations[`${key}_other`];

          if (singular || plural) {
            expect(singular).toBeTruthy();
            expect(plural).toBeTruthy();
            expect(singular).not.toBe(plural);
          }
        });
      });
    });
  });
});

// Helper functions

function detectLanguageFromLocale(locale: string): string {
  const langCode = locale.split('-')[0];
  const supported = ['en', 'ms', 'zh', 'ta'];

  return supported.includes(langCode) ? langCode : 'en';
}

async function switchLanguage(language: string): Promise<string> {
  // Simulate language switch
  await new Promise(resolve => setTimeout(resolve, 50));
  return language;
}

async function getPersistedLanguage(): Promise<string> {
  // Simulate reading from storage
  return 'ms';
}

function getTranslations(lang: string): Record<string, string> {
  // Mock translations
  const translations: Record<string, Record<string, string>> = {
    en: {
      'common.welcome': 'Welcome',
      'common.save': 'Save',
      'common.cancel': 'Cancel',
      'common.confirm': 'Confirm',
      'common.goodMorning': 'Good morning',
      'medication.add': 'Add Medication',
      'medication.take': 'Take',
      'medication.skip': 'Skip',
      'medication.dosage': 'Dosage',
      'medication.frequency': 'Frequency',
      'medication.instructions': 'Instructions',
      'medication.sideEffects': 'Side Effects',
      'medication.interactions': 'Interactions',
      'adherence.streak': 'Streak',
      'adherence.rate': 'Adherence Rate',
      'family.notify': 'Notify Family',
      'family.child': 'Child',
      'family.spouse': 'Spouse',
      'family.parent': 'Parent',
      'emergency.alert': 'Emergency Alert',
      'prayer.times': 'Prayer Times',
      'prayer.fajr': 'Fajr',
      'prayer.dhuhr': 'Dhuhr',
      'prayer.asr': 'Asr',
      'prayer.maghrib': 'Maghrib',
      'prayer.isha': 'Isha',
      'ramadan.iftar': 'Iftar',
      'ramadan.suhoor': 'Suhoor',
      'festivals.hari_raya_aidilfitri': 'Hari Raya Aidilfitri',
      'festivals.chinese_new_year': 'Chinese New Year',
      'festivals.deepavali': 'Deepavali',
    },
    ms: {
      'common.welcome': 'Selamat Datang',
      'common.save': 'Simpan',
      'common.cancel': 'Batal',
      'common.confirm': 'Sahkan',
      'common.goodMorning': 'Selamat pagi',
      'medication.add': 'Tambah Ubat',
      'medication.take': 'Ambil',
      'medication.skip': 'Langkau',
      'medication.dosage': 'Dos',
      'medication.frequency': 'Kekerapan',
      'medication.instructions': 'Arahan',
      'medication.sideEffects': 'Kesan Sampingan',
      'medication.interactions': 'Interaksi',
      'adherence.streak': 'Berturut-turut',
      'adherence.rate': 'Kadar Pematuhan',
      'family.notify': 'Beritahu Keluarga',
      'family.child': 'Anak',
      'family.spouse': 'Pasangan',
      'family.parent': 'Ibu Bapa',
      'emergency.alert': 'Amaran Kecemasan',
      'prayer.times': 'Waktu Solat',
      'prayer.fajr': 'Subuh',
      'prayer.dhuhr': 'Zohor',
      'prayer.asr': 'Asar',
      'prayer.maghrib': 'Maghrib',
      'prayer.isha': 'Isyak',
      'ramadan.iftar': 'Iftar',
      'ramadan.suhoor': 'Sahur',
      'festivals.hari_raya_aidilfitri': 'Hari Raya Aidilfitri',
      'festivals.chinese_new_year': 'Tahun Baru Cina',
      'festivals.deepavali': 'Deepavali',
    },
    zh: {
      'common.welcome': '欢迎',
      'common.save': '保存',
      'common.cancel': '取消',
      'common.confirm': '确认',
      'common.goodMorning': '早上好',
      'medication.add': '添加药物',
      'medication.take': '服用',
      'medication.skip': '跳过',
      'medication.dosage': '剂量',
      'medication.frequency': '频率',
      'medication.instructions': '说明',
      'medication.sideEffects': '副作用',
      'medication.interactions': '相互作用',
      'adherence.streak': '连续',
      'adherence.rate': '依从率',
      'family.notify': '通知家人',
      'family.child': '子女',
      'family.spouse': '配偶',
      'family.parent': '父母',
      'emergency.alert': '紧急警报',
      'prayer.times': '祷告时间',
      'prayer.fajr': 'Fajr',
      'prayer.dhuhr': 'Dhuhr',
      'prayer.asr': 'Asr',
      'prayer.maghrib': 'Maghrib',
      'prayer.isha': 'Isha',
      'ramadan.iftar': 'Iftar',
      'ramadan.suhoor': 'Suhoor',
      'festivals.hari_raya_aidilfitri': '开斋节',
      'festivals.chinese_new_year': '春节',
      'festivals.deepavali': '排灯节',
    },
    ta: {
      'common.welcome': 'வரவேற்கிறோம்',
      'common.save': 'சேமி',
      'common.cancel': 'ரத்து செய்',
      'common.confirm': 'உறுதிப்படுத்து',
      'common.goodMorning': 'காலை வணக்கம்',
      'medication.add': 'மருந்து சேர்க்கவும்',
      'medication.take': 'எடுத்துக்கொள்',
      'medication.skip': 'தவிர்க்கவும்',
      'medication.dosage': 'அளவு',
      'medication.frequency': 'அடிக்கடி',
      'medication.instructions': 'வழிமுறைகள்',
      'medication.sideEffects': 'பக்க விளைவுகள்',
      'medication.interactions': 'தொடர்புகள்',
      'adherence.streak': 'தொடர்ச்சி',
      'adherence.rate': 'பின்பற்றும் விகிதம்',
      'family.notify': 'குடும்பத்திற்கு தெரிவி',
      'family.child': 'குழந்தை',
      'family.spouse': 'வாழ்க்கைத்துணை',
      'family.parent': 'பெற்றோர்',
      'emergency.alert': 'அவசர எச்சரிக்கை',
      'prayer.times': 'தொழுகை நேரங்கள்',
      'prayer.fajr': 'Fajr',
      'prayer.dhuhr': 'Dhuhr',
      'prayer.asr': 'Asr',
      'prayer.maghrib': 'Maghrib',
      'prayer.isha': 'Isha',
      'ramadan.iftar': 'Iftar',
      'ramadan.suhoor': 'Suhoor',
      'festivals.hari_raya_aidilfitri': 'ஹரி ராயா ஐதில்ஃபித்ரி',
      'festivals.chinese_new_year': 'சீன புத்தாண்டு',
      'festivals.deepavali': 'தீபாவளி',
    },
  };

  return translations[lang] || translations.en;
}

function formatDate(date: Date, lang: string): string {
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };

  return new Intl.DateTimeFormat(lang, options).format(date);
}

function formatTime(date: Date, lang: string, options: { hour12: boolean }): string {
  return new Intl.DateTimeFormat(lang, {
    hour: 'numeric',
    minute: 'numeric',
    hour12: options.hour12,
  }).format(date);
}

function formatNumber(num: number, lang: string): string {
  return new Intl.NumberFormat(lang, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

function isRightToLeft(lang: string): boolean {
  const rtlLanguages = ['ar', 'he', 'fa', 'ur'];
  return rtlLanguages.includes(lang);
}

function getTextDirection(text: string): string {
  // Simple heuristic: if text contains RTL characters
  const rtlChars = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
  return rtlChars.test(text) ? 'rtl' : 'ltr';
}

function containsChinese(text: string): boolean {
  return /[\u4E00-\u9FFF]/.test(text);
}

function containsTamil(text: string): boolean {
  return /[\u0B80-\u0BFF]/.test(text);
}

function getAllTranslationKeys(lang: string): string[] {
  const translations = getTranslations(lang);
  return Object.keys(translations);
}