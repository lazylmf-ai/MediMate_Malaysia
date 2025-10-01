/**
 * Cultural Formatters
 * 
 * Comprehensive formatting utilities for Malaysian healthcare context
 * with cultural preferences, medication instructions, and localized content.
 */

import type { SupportedLanguage } from '@/i18n/translations';

export interface MedicationInstruction {
  timing: string;
  dosage: string;
  frequency: string;
  specialInstructions?: string[];
  culturalNotes?: string[];
}

export interface CulturalDateTimeOptions {
  showLunarDate?: boolean;
  includePrayerTimes?: boolean;
  malaysianFormat?: boolean;
  elderlyFriendly?: boolean;
}

export interface FormattingContext {
  language: SupportedLanguage;
  religion?: string;
  region?: string;
  culturalProfile?: any;
  elderlyMode?: boolean;
}

export class CulturalFormatters {
  private static readonly MALAYSIAN_STATES = [
    'johor', 'kedah', 'kelantan', 'malacca', 'negeri_sembilan',
    'pahang', 'penang', 'perak', 'perlis', 'sabah', 'sarawak',
    'selangor', 'terengganu', 'kuala_lumpur', 'labuan', 'putrajaya'
  ];

  private static readonly PRAYER_NAMES = {
    en: { fajr: 'Fajr', dhuhr: 'Dhuhr', asr: 'Asr', maghrib: 'Maghrib', isha: 'Isha' },
    ms: { fajr: 'Subuh', dhuhr: 'Zohor', asr: 'Asar', maghrib: 'Maghrib', isha: 'Isyak' },
    zh: { fajr: '晨礼', dhuhr: '晌礼', asr: '晡礼', maghrib: '昏礼', isha: '宵礼' },
    ta: { fajr: 'பஜ்ர்', dhuhr: 'துஹர்', asr: 'அஸர்', maghrib: 'மக்ரிப்', isha: 'இஷா' },
  };

  /**
   * Format medication instructions with cultural context
   */
  static formatMedicationInstructions(
    instruction: MedicationInstruction,
    context: FormattingContext
  ): string {
    const { language, religion, elderlyMode } = context;
    let formatted = '';

    // Format basic instruction
    formatted += this.formatBasicInstruction(instruction, language);

    // Add prayer time considerations for Muslim users
    if (religion === 'islam') {
      const prayerConsiderations = this.getPrayerTimeConsiderations(instruction, language);
      if (prayerConsiderations) {
        formatted += '\n\n' + prayerConsiderations;
      }
    }

    // Add cultural notes
    if (instruction.culturalNotes && instruction.culturalNotes.length > 0) {
      formatted += '\n\n' + this.formatCulturalNotes(instruction.culturalNotes, language);
    }

    // Simplify for elderly users
    if (elderlyMode) {
      formatted = this.simplifyForElderly(formatted, language);
    }

    return formatted;
  }

  /**
   * Format date and time with Malaysian cultural context
   */
  static formatCulturalDateTime(
    date: Date,
    context: FormattingContext,
    options: CulturalDateTimeOptions = {}
  ): string {
    const { language, culturalProfile } = context;
    let formatted = '';

    // Base date formatting
    formatted += this.formatDate(date, language, options.malaysianFormat);

    // Add lunar date for Chinese users during festivals
    if (language === 'zh' && options.showLunarDate) {
      const lunarDate = this.getLunarDate(date);
      if (lunarDate) {
        formatted += ` (${lunarDate})`;
      }
    }

    // Add prayer times context if requested
    if (options.includePrayerTimes && culturalProfile?.prayerTimes?.enabled) {
      const prayerContext = this.getPrayerTimeContext(date, language);
      if (prayerContext) {
        formatted += ` - ${prayerContext}`;
      }
    }

    return formatted;
  }

  /**
   * Format medication dosage with Malaysian pharmacy standards
   */
  static formatDosage(
    amount: number,
    unit: string,
    language: SupportedLanguage,
    elderlyFriendly: boolean = false
  ): string {
    const dosageTranslations = {
      en: {
        tablet: 'tablet(s)',
        capsule: 'capsule(s)',
        ml: 'ml',
        mg: 'mg',
        teaspoon: 'teaspoon(s)',
        tablespoon: 'tablespoon(s)',
      },
      ms: {
        tablet: 'tablet',
        capsule: 'kapsul',
        ml: 'ml',
        mg: 'mg',
        teaspoon: 'sudu teh',
        tablespoon: 'sudu makan',
      },
      zh: {
        tablet: '片',
        capsule: '粒',
        ml: '毫升',
        mg: '毫克',
        teaspoon: '茶匙',
        tablespoon: '汤匙',
      },
      ta: {
        tablet: 'மாத்திரை',
        capsule: 'காப்சூல்',
        ml: 'மி.லி',
        mg: 'மி.கி',
        teaspoon: 'தேக்கரண்டி',
        tablespoon: 'மேசைக்கரண்டி',
      },
    };

    const unitTranslation = dosageTranslations[language][unit] || unit;
    
    if (elderlyFriendly) {
      // Use clearer formatting for elderly users
      return `${amount} ${unitTranslation}`;
    }

    return `${amount} ${unitTranslation}`;
  }

  /**
   * Format frequency with Malaysian healthcare context
   */
  static formatFrequency(
    frequency: string,
    language: SupportedLanguage,
    includeAbbreviations: boolean = true
  ): string {
    const frequencyTranslations = {
      en: {
        'once_daily': includeAbbreviations ? 'Once daily (OD)' : 'Once daily',
        'twice_daily': includeAbbreviations ? 'Twice daily (BD)' : 'Twice daily',
        'three_times': includeAbbreviations ? 'Three times daily (TDS)' : 'Three times daily',
        'four_times': includeAbbreviations ? 'Four times daily (QDS)' : 'Four times daily',
        'as_needed': includeAbbreviations ? 'As needed (PRN)' : 'As needed',
      },
      ms: {
        'once_daily': 'Sekali sehari',
        'twice_daily': 'Dua kali sehari',
        'three_times': 'Tiga kali sehari',
        'four_times': 'Empat kali sehari',
        'as_needed': 'Mengikut keperluan',
      },
      zh: {
        'once_daily': '每日一次',
        'twice_daily': '每日两次',
        'three_times': '每日三次',
        'four_times': '每日四次',
        'as_needed': '按需要',
      },
      ta: {
        'once_daily': 'நாளொன்றுக்கு ஒருமுறை',
        'twice_daily': 'நாளொன்றுக்கு இருமுறை',
        'three_times': 'நாளொன்றுக்கு மூன்று முறை',
        'four_times': 'நாளொன்றுக்கு நான்கு முறை',
        'as_needed': 'தேவைக்கேற்ப',
      },
    };

    return frequencyTranslations[language][frequency] || frequency;
  }

  /**
   * Format currency for Malaysian context
   */
  static formatCurrency(
    amount: number,
    language: SupportedLanguage,
    includeSymbol: boolean = true
  ): string {
    const symbols = {
      en: 'RM',
      ms: 'RM',
      zh: '马币',
      ta: 'RM',
    };

    const symbol = includeSymbol ? symbols[language] + ' ' : '';
    
    // Format with appropriate decimal places and thousands separator
    const formatted = new Intl.NumberFormat('en-MY', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);

    return `${symbol}${formatted}`;
  }

  /**
   * Format phone number for Malaysian context
   */
  static formatMalaysianPhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters
    const digits = phoneNumber.replace(/\D/g, '');
    
    // Malaysian mobile numbers (format: +60 XX-XXX XXXX)
    if (digits.length === 11 && digits.startsWith('60')) {
      return `+${digits.substring(0, 2)} ${digits.substring(2, 4)}-${digits.substring(4, 7)} ${digits.substring(7)}`;
    }
    
    // Local mobile numbers (format: XXX-XXX XXXX)
    if (digits.length === 10 || digits.length === 11) {
      const start = digits.length === 11 ? 1 : 0;
      return `${digits.substring(start, start + 3)}-${digits.substring(start + 3, start + 6)} ${digits.substring(start + 6)}`;
    }
    
    return phoneNumber; // Return as-is if format not recognized
  }

  /**
   * Format emergency information
   */
  static formatEmergencyInfo(
    info: {
      allergies?: string[];
      medications?: string[];
      conditions?: string[];
    },
    language: SupportedLanguage
  ): string {
    const labels = {
      en: {
        allergies: 'Allergies',
        medications: 'Current Medications',
        conditions: 'Medical Conditions',
        none: 'None reported',
      },
      ms: {
        allergies: 'Alahan',
        medications: 'Ubatan Semasa',
        conditions: 'Keadaan Perubatan',
        none: 'Tiada dilaporkan',
      },
      zh: {
        allergies: '过敏史',
        medications: '目前用药',
        conditions: '疾病史',
        none: '无报告',
      },
      ta: {
        allergies: 'ஒவ்வாமைகள்',
        medications: 'தற்போதைய மருந்துகள்',
        conditions: 'மருத்துவ நிலைமைகள்',
        none: 'எதுவும் தெரிவிக்கப்படவில்லை',
      },
    };

    const l = labels[language];
    let formatted = '';

    if (info.allergies && info.allergies.length > 0) {
      formatted += `${l.allergies}: ${info.allergies.join(', ')}\n`;
    } else {
      formatted += `${l.allergies}: ${l.none}\n`;
    }

    if (info.medications && info.medications.length > 0) {
      formatted += `${l.medications}: ${info.medications.join(', ')}\n`;
    } else {
      formatted += `${l.medications}: ${l.none}\n`;
    }

    if (info.conditions && info.conditions.length > 0) {
      formatted += `${l.conditions}: ${info.conditions.join(', ')}`;
    } else {
      formatted += `${l.conditions}: ${l.none}`;
    }

    return formatted;
  }

  // Private helper methods

  private static formatBasicInstruction(
    instruction: MedicationInstruction,
    language: SupportedLanguage
  ): string {
    const timing = this.formatTiming(instruction.timing, language);
    const dosage = instruction.dosage;
    const frequency = this.formatFrequency(instruction.frequency, language);

    return `${dosage} ${frequency} ${timing}`.trim();
  }

  private static formatTiming(timing: string, language: SupportedLanguage): string {
    const timingTranslations = {
      en: {
        'before_meals': 'before meals',
        'after_meals': 'after meals',
        'with_meals': 'with meals',
        'empty_stomach': 'on empty stomach',
        'bedtime': 'at bedtime',
        'morning': 'in the morning',
        'evening': 'in the evening',
      },
      ms: {
        'before_meals': 'sebelum makan',
        'after_meals': 'selepas makan',
        'with_meals': 'bersama makanan',
        'empty_stomach': 'pada perut kosong',
        'bedtime': 'sebelum tidur',
        'morning': 'pada waktu pagi',
        'evening': 'pada waktu petang',
      },
      zh: {
        'before_meals': '饭前',
        'after_meals': '饭后',
        'with_meals': '随餐',
        'empty_stomach': '空腹',
        'bedtime': '睡前',
        'morning': '上午',
        'evening': '晚上',
      },
      ta: {
        'before_meals': 'உணவுக்கு முன்',
        'after_meals': 'உணவுக்குப் பின்',
        'with_meals': 'உணவுடன்',
        'empty_stomach': 'வெறும் வயிற்றில்',
        'bedtime': 'தூங்குவதற்கு முன்',
        'morning': 'காலையில்',
        'evening': 'மாலையில்',
      },
    };

    return timingTranslations[language][timing] || timing;
  }

  private static getPrayerTimeConsiderations(
    instruction: MedicationInstruction,
    language: SupportedLanguage
  ): string | null {
    if (!instruction.timing.includes('morning') && !instruction.timing.includes('evening')) {
      return null;
    }

    const considerations = {
      en: 'Note: Adjust timing to avoid prayer times. Take 30 minutes before or after prayer.',
      ms: 'Nota: Laraskan masa untuk mengelakkan waktu solat. Ambil 30 minit sebelum atau selepas solat.',
      zh: '注意：调整时间以避开祈祷时间。在祈祷前后30分钟服用。',
      ta: 'குறிப்பு: தொழுகை நேரங்களைத் தவிர்க்க நேரத்தை சரிசெய்யவும். தொழுகைக்கு 30 நிமிடம் முன் அல்லது பின் எடுக்கவும்.',
    };

    return considerations[language];
  }

  private static formatCulturalNotes(
    notes: string[],
    language: SupportedLanguage
  ): string {
    const noteLabels = {
      en: 'Cultural Notes:',
      ms: 'Nota Budaya:',
      zh: '文化提示：',
      ta: 'கலாச்சார குறிப்புகள்:',
    };

    return `${noteLabels[language]}\n• ${notes.join('\n• ')}`;
  }

  private static simplifyForElderly(
    instruction: string,
    language: SupportedLanguage
  ): string {
    // Simplify language and add clear structure for elderly users
    const simplifiedPrefixes = {
      en: 'IMPORTANT: ',
      ms: 'PENTING: ',
      zh: '重要：',
      ta: 'முக்கியம்: ',
    };

    return `${simplifiedPrefixes[language]}${instruction}`;
  }

  private static formatDate(
    date: Date,
    language: SupportedLanguage,
    malaysianFormat: boolean = true
  ): string {
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
    };

    const locales = {
      en: 'en-MY',
      ms: 'ms-MY',
      zh: 'zh-CN',
      ta: 'ta-MY',
    };

    try {
      return new Intl.DateTimeFormat(locales[language], options).format(date);
    } catch (error) {
      return date.toLocaleDateString();
    }
  }

  private static getLunarDate(date: Date): string | null {
    // Simplified lunar date calculation - in production, use proper lunar calendar library
    // This is a placeholder implementation
    try {
      const lunarOptions: Intl.DateTimeFormatOptions = {
        calendar: 'chinese',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      };
      
      return new Intl.DateTimeFormat('zh-CN-u-ca-chinese', lunarOptions).format(date);
    } catch (error) {
      return null;
    }
  }

  private static getPrayerTimeContext(
    date: Date,
    language: SupportedLanguage
  ): string | null {
    // This would integrate with actual prayer time service
    // For now, return a placeholder
    const hour = date.getHours();
    
    if (hour >= 5 && hour < 7) {
      return this.PRAYER_NAMES[language].fajr;
    } else if (hour >= 12 && hour < 14) {
      return this.PRAYER_NAMES[language].dhuhr;
    } else if (hour >= 15 && hour < 17) {
      return this.PRAYER_NAMES[language].asr;
    } else if (hour >= 18 && hour < 20) {
      return this.PRAYER_NAMES[language].maghrib;
    } else if (hour >= 20 && hour < 22) {
      return this.PRAYER_NAMES[language].isha;
    }
    
    return null;
  }
}

export default CulturalFormatters;