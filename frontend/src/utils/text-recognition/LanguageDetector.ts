/**
 * Language Detector for Malaysian Medication Labels
 * 
 * Detects and classifies languages present in OCR text, specifically
 * optimized for Malaysian pharmaceutical contexts with support for
 * Bahasa Malaysia, English, Chinese, and mixed language scenarios.
 */

export interface LanguageDetectionResult {
  primaryLanguage: 'ms' | 'en' | 'zh' | 'mixed';
  languageDistribution: {
    ms: number; // Percentage of Bahasa Malaysia content
    en: number; // Percentage of English content
    zh: number; // Percentage of Chinese content
    other: number; // Percentage of unidentified content
  };
  confidence: number; // Overall detection confidence (0-1)
  detectedPatterns: {
    malayWords: string[];
    englishWords: string[];
    chineseCharacters: string[];
    mixedPhrases: string[];
  };
  culturalContext: {
    malayContent: boolean;
    chineseContent: boolean;
    traditionalMedicine: boolean;
    westernMedicine: boolean;
  };
}

export class LanguageDetector {
  private static instance: LanguageDetector;

  // Bahasa Malaysia medication vocabulary
  private readonly malayMedicationTerms = [
    // Basic medication terms
    'ubat', 'pil', 'tablet', 'kapsul', 'cecair', 'sirap', 'krim', 'gel',
    'titis', 'suntikan', 'salap', 'plaster', 'inhaler', 'suppositoria',
    
    // Instructions
    'ambil', 'minum', 'gunakan', 'sapu', 'teteskan', 'hirup', 'telan',
    'kunyah', 'hisap', 'masukkan',
    
    // Frequency and timing
    'sekali', 'dua kali', 'tiga kali', 'empat kali', 'sehari', 'seminggu',
    'sebulan', 'pagi', 'tengahari', 'petang', 'malam', 'waktu tidur',
    'sebelum', 'selepas', 'semasa', 'makan', 'makanan',
    
    // Medical conditions (common in Malaysian context)
    'demam', 'sakit kepala', 'batuk', 'selsema', 'muntah', 'cirit-birit',
    'asma', 'diabetes', 'darah tinggi', 'jantung', 'gout', 'arthritis',
    
    // Body parts
    'mata', 'telinga', 'hidung', 'mulut', 'tenggorokan', 'dada', 'perut',
    'kulit', 'kepala', 'tangan', 'kaki',
    
    // Quantities and measurements
    'biji', 'sudu', 'teh', 'besar', 'kecil', 'sendok', 'gelas', 'botol',
    'kotak', 'pak', 'dos',
    
    // Warnings and precautions
    'awas', 'jangan', 'elak', 'bahaya', 'racun', 'simpan', 'jauhkan',
    'kanak-kanak', 'hamil', 'menyusu'
  ];

  // English medication terms commonly used in Malaysia
  private readonly englishMedicationTerms = [
    // Basic medication terms
    'medicine', 'tablet', 'capsule', 'syrup', 'cream', 'ointment', 'drops',
    'injection', 'inhaler', 'suppository', 'liquid', 'powder',
    
    // Instructions
    'take', 'swallow', 'chew', 'dissolve', 'apply', 'insert', 'inhale',
    'instill', 'use', 'administer',
    
    // Frequency and timing
    'once', 'twice', 'thrice', 'daily', 'weekly', 'monthly', 'morning',
    'noon', 'evening', 'night', 'bedtime', 'before', 'after', 'during',
    'with', 'without', 'meal', 'food', 'empty stomach',
    
    // Medical terms
    'prescription', 'dosage', 'dose', 'strength', 'concentration',
    'active ingredient', 'generic', 'brand', 'expiry', 'batch',
    'manufactured', 'distributed',
    
    // Measurements
    'mg', 'ml', 'gram', 'milligram', 'milliliter', 'units', 'iu',
    'mcg', 'microgram',
    
    // Warnings
    'warning', 'caution', 'keep', 'store', 'refrigerate', 'dry place',
    'children', 'pregnant', 'breastfeeding'
  ];

  // Chinese characters commonly found on Malaysian medication
  private readonly chineseMedicationChars = [
    // Basic characters for medicine
    '藥', '药', '丸', '片', '膠', '囊', '液', '糖', '漿', '膏', '霜',
    
    // Instructions
    '服', '用', '取', '吃', '飲', '喝', '塗', '擦', '滴', '噴',
    
    // Frequency
    '次', '日', '天', '週', '月', '早', '午', '晚', '前', '後',
    '飯', '餐', '時', '小', '大',
    
    // Body parts and conditions
    '頭', '眼', '耳', '鼻', '口', '喉', '胸', '腹', '手', '足',
    '痛', '熱', '咳', '喘', '吐', '瀉'
  ];

  // Malaysian pharmaceutical company keywords
  private readonly malaysianPharmaceuticalTerms = [
    'pharmaniaga', 'duopharma', 'kotra', 'hovid', 'dpharma', 'apex',
    'mega', 'ccm', 'chemical company of malaysia', 'y.s.p', 'ysp',
    'lyna', 'globeray', 'sterling', 'dinamik', 'bioxcell'
  ];

  private constructor() {}

  public static getInstance(): LanguageDetector {
    if (!LanguageDetector.instance) {
      LanguageDetector.instance = new LanguageDetector();
    }
    return LanguageDetector.instance;
  }

  /**
   * Detect primary language and distribution from OCR text
   */
  public async detectLanguage(
    text: string,
    culturalContext?: {
      malayContent?: boolean;
      chineseContent?: boolean;
      traditionalMedicine?: boolean;
    }
  ): Promise<'ms' | 'en' | 'zh' | 'mixed'> {
    if (!text || text.trim().length === 0) {
      return 'en'; // Default to English for empty text
    }

    const result = await this.analyzeLanguageDistribution(text, culturalContext);
    return result.primaryLanguage;
  }

  /**
   * Perform comprehensive language analysis
   */
  public async analyzeLanguageDistribution(
    text: string,
    culturalContext?: {
      malayContent?: boolean;
      chineseContent?: boolean;
      traditionalMedicine?: boolean;
    }
  ): Promise<LanguageDetectionResult> {
    const cleanText = text.toLowerCase().trim();
    const words = cleanText.split(/\s+/).filter(word => word.length > 0);
    
    // Initialize result structure
    const result: LanguageDetectionResult = {
      primaryLanguage: 'en',
      languageDistribution: { ms: 0, en: 0, zh: 0, other: 0 },
      confidence: 0,
      detectedPatterns: {
        malayWords: [],
        englishWords: [],
        chineseCharacters: [],
        mixedPhrases: []
      },
      culturalContext: {
        malayContent: false,
        chineseContent: false,
        traditionalMedicine: false,
        westernMedicine: true
      }
    };

    try {
      // Step 1: Detect Bahasa Malaysia content
      const malayAnalysis = this.detectMalayContent(text, words);
      result.languageDistribution.ms = malayAnalysis.percentage;
      result.detectedPatterns.malayWords = malayAnalysis.matchedWords;

      // Step 2: Detect English content
      const englishAnalysis = this.detectEnglishContent(text, words);
      result.languageDistribution.en = englishAnalysis.percentage;
      result.detectedPatterns.englishWords = englishAnalysis.matchedWords;

      // Step 3: Detect Chinese characters
      const chineseAnalysis = this.detectChineseContent(text);
      result.languageDistribution.zh = chineseAnalysis.percentage;
      result.detectedPatterns.chineseCharacters = chineseAnalysis.matchedCharacters;

      // Step 4: Calculate remaining as "other"
      const totalIdentified = result.languageDistribution.ms + 
                            result.languageDistribution.en + 
                            result.languageDistribution.zh;
      result.languageDistribution.other = Math.max(0, 100 - totalIdentified);

      // Step 5: Determine primary language
      result.primaryLanguage = this.determinePrimaryLanguage(result.languageDistribution);

      // Step 6: Detect mixed language phrases
      result.detectedPatterns.mixedPhrases = this.detectMixedPhrases(text);

      // Step 7: Analyze cultural context
      result.culturalContext = this.analyzeCulturalContext(text, result);

      // Step 8: Calculate confidence score
      result.confidence = this.calculateDetectionConfidence(result, words.length);

      // Step 9: Apply cultural context adjustments if provided
      if (culturalContext) {
        this.applyCulturalContextAdjustments(result, culturalContext);
      }

      return result;

    } catch (error) {
      console.error('Error in language detection:', error);
      return result;
    }
  }

  /**
   * Detect Bahasa Malaysia content
   */
  private detectMalayContent(text: string, words: string[]): {
    percentage: number;
    matchedWords: string[];
  } {
    const matchedWords: string[] = [];
    let malayWordCount = 0;

    for (const word of words) {
      const cleanWord = word.replace(/[^\w]/g, '').toLowerCase();
      if (this.malayMedicationTerms.includes(cleanWord)) {
        malayWordCount++;
        if (!matchedWords.includes(cleanWord)) {
          matchedWords.push(cleanWord);
        }
      }
    }

    // Check for Malay pharmaceutical company names
    for (const company of this.malaysianPharmaceuticalTerms) {
      if (text.toLowerCase().includes(company)) {
        malayWordCount += 2; // Weight company names higher
        matchedWords.push(company);
      }
    }

    // Check for common Malay phrases in medication contexts
    const malayPhrases = [
      'ambil sekali sehari', 'minum selepas makan', 'ubat untuk',
      'dos untuk dewasa', 'kanak-kanak bawah', 'simpan di tempat sejuk'
    ];

    for (const phrase of malayPhrases) {
      if (text.toLowerCase().includes(phrase)) {
        malayWordCount += 3; // Weight phrases higher
        matchedWords.push(phrase);
      }
    }

    const percentage = words.length > 0 ? Math.min(100, (malayWordCount / words.length) * 100) : 0;
    
    return { percentage, matchedWords };
  }

  /**
   * Detect English content
   */
  private detectEnglishContent(text: string, words: string[]): {
    percentage: number;
    matchedWords: string[];
  } {
    const matchedWords: string[] = [];
    let englishWordCount = 0;

    for (const word of words) {
      const cleanWord = word.replace(/[^\w]/g, '').toLowerCase();
      if (this.englishMedicationTerms.includes(cleanWord)) {
        englishWordCount++;
        if (!matchedWords.includes(cleanWord)) {
          matchedWords.push(cleanWord);
        }
      }
    }

    // Check for English medical patterns
    const englishPatterns = [
      /\d+\s*mg/, /\d+\s*ml/, /\d+\s*tablet/, /take\s+\d+/, /once\s+daily/,
      /twice\s+daily/, /prescription\s+only/, /active\s+ingredient/
    ];

    for (const pattern of englishPatterns) {
      const matches = text.match(new RegExp(pattern.source, 'gi'));
      if (matches) {
        englishWordCount += matches.length * 2; // Weight patterns higher
        matchedWords.push(pattern.source);
      }
    }

    const percentage = words.length > 0 ? Math.min(100, (englishWordCount / words.length) * 100) : 0;
    
    return { percentage, matchedWords };
  }

  /**
   * Detect Chinese characters
   */
  private detectChineseContent(text: string): {
    percentage: number;
    matchedCharacters: string[];
  } {
    const matchedCharacters: string[] = [];
    const chineseChars = text.match(/[\u4e00-\u9fff]/g) || [];
    
    for (const char of chineseChars) {
      if (this.chineseMedicationChars.includes(char) && !matchedCharacters.includes(char)) {
        matchedCharacters.push(char);
      }
    }

    // Calculate percentage based on Chinese character density
    const totalChars = text.length;
    const chineseCharCount = chineseChars.length;
    const percentage = totalChars > 0 ? (chineseCharCount / totalChars) * 100 : 0;

    return { percentage, matchedCharacters };
  }

  /**
   * Determine primary language from distribution
   */
  private determinePrimaryLanguage(distribution: {
    ms: number;
    en: number;
    zh: number;
    other: number;
  }): 'ms' | 'en' | 'zh' | 'mixed' {
    const threshold = 40; // Threshold for primary language
    const mixedThreshold = 60; // If total identified content is below this, consider mixed

    const totalIdentified = distribution.ms + distribution.en + distribution.zh;
    
    // If overall identification is low, classify as mixed
    if (totalIdentified < mixedThreshold) {
      return 'mixed';
    }

    // Find the dominant language
    if (distribution.ms > threshold && distribution.ms > distribution.en && distribution.ms > distribution.zh) {
      return 'ms';
    }
    
    if (distribution.en > threshold && distribution.en > distribution.ms && distribution.en > distribution.zh) {
      return 'en';
    }
    
    if (distribution.zh > threshold && distribution.zh > distribution.ms && distribution.zh > distribution.en) {
      return 'zh';
    }

    // If no clear dominant language, classify as mixed
    return 'mixed';
  }

  /**
   * Detect mixed language phrases common in Malaysian context
   */
  private detectMixedPhrases(text: string): string[] {
    const mixedPhrases: string[] = [];
    
    // Common mixed English-Malay phrases in Malaysian medication
    const patterns = [
      /take.*sekali/gi,
      /ambil.*tablet/gi,
      /minum.*daily/gi,
      /ubat.*medicine/gi,
      /dose.*dos/gi,
      /before.*sebelum/gi,
      /after.*selepas/gi
    ];

    for (const pattern of patterns) {
      const matches = text.match(pattern);
      if (matches) {
        mixedPhrases.push(...matches);
      }
    }

    return mixedPhrases;
  }

  /**
   * Analyze cultural context indicators
   */
  private analyzeCulturalContext(
    text: string, 
    result: LanguageDetectionResult
  ): {
    malayContent: boolean;
    chineseContent: boolean;
    traditionalMedicine: boolean;
    westernMedicine: boolean;
  } {
    const lowerText = text.toLowerCase();
    
    const malayContent = result.languageDistribution.ms > 20 || 
                        result.detectedPatterns.malayWords.length > 3;

    const chineseContent = result.languageDistribution.zh > 10 || 
                          result.detectedPatterns.chineseCharacters.length > 5;

    // Traditional medicine indicators
    const traditionalKeywords = [
      'herbal', 'traditional', 'tcm', 'chinese medicine', 'jamu',
      'tradisional', '中藥', '草藥', 'natural', 'organic'
    ];
    const traditionalMedicine = traditionalKeywords.some(keyword => 
      lowerText.includes(keyword.toLowerCase())
    );

    // Western medicine indicators
    const westernKeywords = [
      'pharmaceutical', 'prescription', 'mg', 'ml', 'tablet', 'capsule',
      'active ingredient', 'generic', 'brand'
    ];
    const westernMedicine = westernKeywords.some(keyword => 
      lowerText.includes(keyword.toLowerCase())
    );

    return {
      malayContent,
      chineseContent,
      traditionalMedicine,
      westernMedicine: westernMedicine || (!traditionalMedicine && !chineseContent)
    };
  }

  /**
   * Calculate overall detection confidence
   */
  private calculateDetectionConfidence(
    result: LanguageDetectionResult,
    totalWords: number
  ): number {
    let confidence = 0.5; // Base confidence

    // Boost confidence for higher identification rates
    const totalIdentified = result.languageDistribution.ms + 
                          result.languageDistribution.en + 
                          result.languageDistribution.zh;
    
    confidence += (totalIdentified / 100) * 0.3;

    // Boost confidence for specific word matches
    const totalMatches = result.detectedPatterns.malayWords.length + 
                        result.detectedPatterns.englishWords.length + 
                        result.detectedPatterns.chineseCharacters.length;
    
    confidence += Math.min(0.3, totalMatches * 0.05);

    // Boost confidence for adequate text length
    if (totalWords >= 5) confidence += 0.1;
    if (totalWords >= 10) confidence += 0.1;

    // Penalize for very mixed content (unclear primary language)
    if (result.primaryLanguage === 'mixed') confidence -= 0.2;

    return Math.min(1, Math.max(0, confidence));
  }

  /**
   * Apply cultural context adjustments
   */
  private applyCulturalContextAdjustments(
    result: LanguageDetectionResult,
    culturalContext: {
      malayContent?: boolean;
      chineseContent?: boolean;
      traditionalMedicine?: boolean;
    }
  ): void {
    // Boost Malay detection if cultural context suggests Malay content
    if (culturalContext.malayContent && result.languageDistribution.ms < 30) {
      result.languageDistribution.ms += 15;
      result.languageDistribution.en -= 10;
      result.primaryLanguage = this.determinePrimaryLanguage(result.languageDistribution);
    }

    // Boost Chinese detection for traditional medicine context
    if (culturalContext.traditionalMedicine && culturalContext.chineseContent) {
      result.languageDistribution.zh += 20;
      result.culturalContext.traditionalMedicine = true;
      result.primaryLanguage = this.determinePrimaryLanguage(result.languageDistribution);
    }

    // Recalculate confidence with context adjustments
    result.confidence = Math.min(1, result.confidence + 0.1);
  }
}