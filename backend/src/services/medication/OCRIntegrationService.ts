/**
 * OCR Integration Service
 *
 * Integrates with Stream A OCR results to process Malaysian medication information
 * Provides validation, enhancement, and medication creation from OCR data
 */

import { MedicationService } from './MedicationService';
import { HalalValidationService } from '../cultural/halalValidationService';
import { MalaysianTerminologyService } from '../terminology/malaysian-terminology.service';
import {
  OCRResult,
  Medication,
  MedicationValidationResult,
  MedicationDatabaseEntry,
  MedicationDosage
} from '../../types/medication/medication.types';

export interface OCRProcessingOptions {
  validateWithDatabase?: boolean;
  culturalContext?: {
    malayContent?: boolean;
    halalOnly?: boolean;
    languagePreference?: 'ms' | 'en' | 'zh' | 'ta';
  };
  confidenceThreshold?: number;
  enhanceImageForOCR?: boolean;
}

export interface OCRProcessingResult {
  confidence: number;
  extractedMedication: Partial<Medication>;
  validation: MedicationValidationResult;
  culturalAnalysis: CulturalAnalysisResult;
  suggestions: MedicationDatabaseEntry[];
  warnings: string[];
  requiresManualVerification: boolean;
}

export interface CulturalAnalysisResult {
  halalIndicators: {
    found: boolean;
    certificationBodies: string[];
    confidence: number;
  };
  manufacturerInfo: {
    detected: boolean;
    name?: string;
    isLocal: boolean;
    confidence: number;
  };
  regulatoryInfo: {
    mohRegistration?: string;
    dcaRegistration?: string;
    confidence: number;
  };
  languageAnalysis: {
    primaryLanguage: 'ms' | 'en' | 'zh' | 'mixed';
    confidence: number;
    textDistribution: {
      ms: number;
      en: number;
      zh: number;
    };
  };
  culturalInstructions: {
    ramadanConsiderations: string[];
    prayerTimeNotes: string[];
    foodTimingInstructions: string[];
  };
}

export class OCRIntegrationService {
  private static instance: OCRIntegrationService;
  private medicationService: MedicationService;
  private halalValidationService: HalalValidationService;
  private terminologyService: MalaysianTerminologyService;

  constructor() {
    this.medicationService = MedicationService.getInstance();
    this.halalValidationService = HalalValidationService.getInstance();
    this.terminologyService = MalaysianTerminologyService.getInstance();
  }

  public static getInstance(): OCRIntegrationService {
    if (!OCRIntegrationService.instance) {
      OCRIntegrationService.instance = new OCRIntegrationService();
    }
    return OCRIntegrationService.instance;
  }

  /**
   * Process OCR results and create medication entry
   */
  async processOCRForMedication(
    ocrResult: OCRResult,
    options: OCRProcessingOptions = {}
  ): Promise<OCRProcessingResult> {
    const {
      validateWithDatabase = true,
      culturalContext = {},
      confidenceThreshold = 0.7
    } = options;

    try {
      // Analyze cultural patterns in OCR text
      const culturalAnalysis = await this.analyzeCulturalPatterns(ocrResult);

      // Extract medication information using cultural context
      const extractedMedication = await this.extractMedicationFromOCR(
        ocrResult,
        culturalAnalysis
      );

      // Validate against Malaysian medication database
      let validation: MedicationValidationResult = {
        isValid: false,
        confidence: 0,
        suggestions: [],
        warnings: [],
        culturalConsiderations: []
      };

      if (validateWithDatabase) {
        validation = await this.medicationService.validateAgainstMalaysianDatabase(
          extractedMedication as Medication
        );
      }

      // Calculate overall confidence score
      const overallConfidence = this.calculateOverallConfidence(
        ocrResult,
        culturalAnalysis,
        validation
      );

      // Generate suggestions based on partial matches
      const suggestions = await this.generateMedicationSuggestions(
        extractedMedication,
        culturalAnalysis,
        culturalContext
      );

      // Compile warnings and recommendations
      const warnings = this.compileWarningsAndRecommendations(
        ocrResult,
        culturalAnalysis,
        validation,
        overallConfidence
      );

      return {
        confidence: overallConfidence,
        extractedMedication,
        validation,
        culturalAnalysis,
        suggestions,
        warnings,
        requiresManualVerification: overallConfidence < confidenceThreshold
      };
    } catch (error) {
      throw new Error(`OCR processing failed: ${error.message}`);
    }
  }

  /**
   * Analyze cultural patterns in OCR text
   */
  private async analyzeCulturalPatterns(ocrResult: OCRResult): Promise<CulturalAnalysisResult> {
    const text = ocrResult.extractedText.toLowerCase();

    // Analyze halal indicators
    const halalIndicators = this.detectHalalIndicators(ocrResult);

    // Detect manufacturer information
    const manufacturerInfo = await this.detectManufacturerInfo(ocrResult);

    // Extract regulatory information
    const regulatoryInfo = this.extractRegulatoryInfo(ocrResult);

    // Analyze language distribution
    const languageAnalysis = this.analyzeLanguageDistribution(ocrResult);

    // Extract cultural instructions
    const culturalInstructions = this.extractCulturalInstructions(ocrResult);

    return {
      halalIndicators,
      manufacturerInfo,
      regulatoryInfo,
      languageAnalysis,
      culturalInstructions
    };
  }

  /**
   * Extract medication information from OCR with cultural context
   */
  private async extractMedicationFromOCR(
    ocrResult: OCRResult,
    culturalAnalysis: CulturalAnalysisResult
  ): Promise<Partial<Medication>> {
    const medicationName = this.extractMedicationName(ocrResult, culturalAnalysis);
    const dosageInfo = this.extractDosageInformation(ocrResult, culturalAnalysis);
    const instructions = this.extractInstructions(ocrResult, culturalAnalysis);

    return {
      name: medicationName,
      genericName: await this.findGenericName(medicationName),
      brandName: await this.findBrandName(medicationName, culturalAnalysis),
      dosage: dosageInfo,
      cultural: {
        takeWithFood: this.detectFoodInstructions(ocrResult),
        avoidDuringFasting: this.detectFastingConsiderations(ocrResult),
        prayerTimeConsiderations: culturalAnalysis.culturalInstructions.prayerTimeNotes,
        halalStatus: {
          isHalal: culturalAnalysis.halalIndicators.found,
          concerns: culturalAnalysis.halalIndicators.found ? [] : ['Halal status not verified'],
          alternatives: []
        },
        languagePreference: this.mapLanguageToPreference(culturalAnalysis.languageAnalysis.primaryLanguage)
      },
      ocrData: ocrResult,
      malaysianInfo: {
        mohRegistration: culturalAnalysis.regulatoryInfo.mohRegistration,
        dcaRegistration: culturalAnalysis.regulatoryInfo.dcaRegistration,
        localManufacturer: culturalAnalysis.manufacturerInfo.name,
        availability: 'widely_available',
        halalCertified: culturalAnalysis.halalIndicators.found,
        localAlternatives: []
      }
    };
  }

  /**
   * Detect halal indicators in OCR text
   */
  private detectHalalIndicators(ocrResult: OCRResult): CulturalAnalysisResult['halalIndicators'] {
    const halalPatterns = [
      /halal/i,
      /jakim/i,
      /sertifikat\s+halal/i,
      /halal\s+certified/i,
      /ms\s+1500/i, // Malaysian Halal Standard
      /logo\s+halal/i
    ];

    const certificationBodies = [
      'JAKIM',
      'JAIN', // Johor
      'MAIS', // Selangor
      'MAIK', // Kelantan
      'MUIS', // Singapore
      'MUI' // Indonesia
    ];

    let found = false;
    const detectedBodies: string[] = [];
    let totalMatches = 0;

    // Check for halal patterns
    halalPatterns.forEach(pattern => {
      if (pattern.test(ocrResult.extractedText)) {
        found = true;
        totalMatches++;
      }
    });

    // Check for certification bodies
    certificationBodies.forEach(body => {
      const regex = new RegExp(body, 'i');
      if (regex.test(ocrResult.extractedText)) {
        detectedBodies.push(body);
        found = true;
      }
    });

    // Check cultural patterns from OCR
    if (ocrResult.culturalPatterns?.halalIndicators) {
      ocrResult.culturalPatterns.halalIndicators.forEach(indicator => {
        if (indicator && !detectedBodies.includes(indicator)) {
          detectedBodies.push(indicator);
          found = true;
        }
      });
    }

    const confidence = Math.min(
      (totalMatches * 0.3) + (detectedBodies.length * 0.4),
      1.0
    );

    return {
      found,
      certificationBodies: detectedBodies,
      confidence
    };
  }

  /**
   * Detect manufacturer information
   */
  private async detectManufacturerInfo(ocrResult: OCRResult): Promise<CulturalAnalysisResult['manufacturerInfo']> {
    const malaysianManufacturers = await this.terminologyService.getMalaysianPharmaceuticalCompanies();

    let detectedName: string | undefined;
    let isLocal = false;
    let confidence = 0;

    // Check against known Malaysian manufacturers
    for (const manufacturer of malaysianManufacturers) {
      const regex = new RegExp(manufacturer.name, 'i');
      if (regex.test(ocrResult.extractedText)) {
        detectedName = manufacturer.name;
        isLocal = manufacturer.isLocal;
        confidence = 0.9;
        break;
      }
    }

    // Check cultural patterns
    if (!detectedName && ocrResult.culturalPatterns?.manufacturerInfo) {
      detectedName = ocrResult.culturalPatterns.manufacturerInfo;
      confidence = 0.6;
    }

    // Use simple pattern matching for common pharmaceutical terms
    if (!detectedName) {
      const manufacturerPatterns = [
        /manufactured\s+by[:\s]+(.*?)(?:\n|\.|$)/i,
        /dibuat\s+oleh[:\s]+(.*?)(?:\n|\.|$)/i,
        /pengeluar[:\s]+(.*?)(?:\n|\.|$)/i,
        /kilang[:\s]+(.*?)(?:\n|\.|$)/i
      ];

      for (const pattern of manufacturerPatterns) {
        const match = ocrResult.extractedText.match(pattern);
        if (match && match[1]) {
          detectedName = match[1].trim();
          confidence = 0.4;
          break;
        }
      }
    }

    return {
      detected: !!detectedName,
      name: detectedName,
      isLocal,
      confidence
    };
  }

  /**
   * Extract regulatory information (MOH, DCA registration numbers)
   */
  private extractRegulatoryInfo(ocrResult: OCRResult): CulturalAnalysisResult['regulatoryInfo'] {
    const mohPattern = /MAL\d{8}[A-Z]?/i;
    const dcaPattern = /DCA\d{8}[A-Z]?/i;

    const mohMatch = ocrResult.extractedText.match(mohPattern);
    const dcaMatch = ocrResult.extractedText.match(dcaPattern);

    // Check cultural patterns
    const registrationNumbers = ocrResult.culturalPatterns?.registrationNumbers || [];

    let mohRegistration = mohMatch?.[0];
    let dcaRegistration = dcaMatch?.[0];

    // Check cultural patterns for additional registration numbers
    registrationNumbers.forEach(regNum => {
      if (regNum.startsWith('MAL')) {
        mohRegistration = mohRegistration || regNum;
      } else if (regNum.startsWith('DCA')) {
        dcaRegistration = dcaRegistration || regNum;
      }
    });

    const confidence = (mohRegistration ? 0.5 : 0) + (dcaRegistration ? 0.5 : 0);

    return {
      mohRegistration,
      dcaRegistration,
      confidence
    };
  }

  /**
   * Analyze language distribution in OCR text
   */
  private analyzeLanguageDistribution(ocrResult: OCRResult): CulturalAnalysisResult['languageAnalysis'] {
    const text = ocrResult.extractedText;

    // Simple language detection patterns
    const malayWords = [
      'ubat', 'kapsul', 'tablet', 'dos', 'ambil', 'selepas', 'sebelum', 'makan',
      'pagi', 'petang', 'malam', 'sekali', 'kali', 'hari', 'minggu'
    ];

    const englishWords = [
      'tablet', 'capsule', 'dose', 'take', 'after', 'before', 'meal', 'food',
      'morning', 'evening', 'night', 'once', 'twice', 'daily', 'weekly'
    ];

    const chinesePattern = /[\u4e00-\u9fff]/g;

    let malayCount = 0;
    let englishCount = 0;
    let chineseCount = 0;

    // Count Malay words
    malayWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      malayCount += (text.match(regex) || []).length;
    });

    // Count English words
    englishWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      englishCount += (text.match(regex) || []).length;
    });

    // Count Chinese characters
    const chineseMatches = text.match(chinesePattern);
    chineseCount = chineseMatches ? chineseMatches.length : 0;

    const total = malayCount + englishCount + chineseCount;

    let primaryLanguage: 'ms' | 'en' | 'zh' | 'mixed' = 'en';
    let confidence = 0.5;

    if (total > 0) {
      const malayRatio = malayCount / total;
      const englishRatio = englishCount / total;
      const chineseRatio = chineseCount / total;

      if (malayRatio > 0.5) {
        primaryLanguage = 'ms';
        confidence = malayRatio;
      } else if (englishRatio > 0.5) {
        primaryLanguage = 'en';
        confidence = englishRatio;
      } else if (chineseRatio > 0.3) {
        primaryLanguage = 'zh';
        confidence = chineseRatio;
      } else if (malayRatio > 0.2 || englishRatio > 0.2) {
        primaryLanguage = 'mixed';
        confidence = Math.max(malayRatio, englishRatio);
      }
    }

    // Use OCR language detection if available
    if (ocrResult.language && ocrResult.language !== 'mixed') {
      primaryLanguage = ocrResult.language;
      confidence = Math.max(confidence, 0.8);
    }

    return {
      primaryLanguage,
      confidence,
      textDistribution: {
        ms: total > 0 ? malayCount / total : 0,
        en: total > 0 ? englishCount / total : 0,
        zh: total > 0 ? chineseCount / total : 0
      }
    };
  }

  /**
   * Extract cultural instructions from OCR text
   */
  private extractCulturalInstructions(ocrResult: OCRResult): CulturalAnalysisResult['culturalInstructions'] {
    const text = ocrResult.extractedText.toLowerCase();

    const ramadanPatterns = [
      /ramadan/i,
      /berbuka/i,
      /sahur/i,
      /puasa/i,
      /iftar/i,
      /suhur/i
    ];

    const prayerPatterns = [
      /solat/i,
      /prayer/i,
      /sembahyang/i,
      /sebelum\s+solat/i,
      /after\s+prayer/i
    ];

    const foodTimingPatterns = [
      /selepas\s+makan/i,
      /sebelum\s+makan/i,
      /after\s+meal/i,
      /before\s+meal/i,
      /dengan\s+makanan/i,
      /with\s+food/i
    ];

    const ramadanConsiderations: string[] = [];
    const prayerTimeNotes: string[] = [];
    const foodTimingInstructions: string[] = [];

    // Extract Ramadan considerations
    ramadanPatterns.forEach(pattern => {
      if (pattern.test(text)) {
        ramadanConsiderations.push('Ramadan timing considerations detected');
      }
    });

    // Extract prayer time notes
    prayerPatterns.forEach(pattern => {
      if (pattern.test(text)) {
        prayerTimeNotes.push('Prayer time considerations detected');
      }
    });

    // Extract food timing instructions
    foodTimingPatterns.forEach(pattern => {
      if (pattern.test(text)) {
        const match = text.match(pattern);
        if (match) {
          foodTimingInstructions.push(match[0]);
        }
      }
    });

    return {
      ramadanConsiderations,
      prayerTimeNotes,
      foodTimingInstructions
    };
  }

  /**
   * Extract medication name from OCR with cultural context
   */
  private extractMedicationName(ocrResult: OCRResult, culturalAnalysis: CulturalAnalysisResult): string {
    // Use OCR-detected medication name if available
    if (ocrResult.medicationName) {
      return ocrResult.medicationName;
    }

    // Try to extract from first line (common pattern)
    const lines = ocrResult.extractedText.split('\n').filter(line => line.trim());

    if (lines.length > 0) {
      // Clean the first line to get medication name
      const firstLine = lines[0]
        .replace(/^\d+\.?\s*/, '') // Remove numbering
        .replace(/^tablet\s+|^kapsul\s+/i, '') // Remove form prefixes
        .trim();

      if (firstLine.length > 2) {
        return firstLine;
      }
    }

    return 'Unknown Medication';
  }

  /**
   * Extract dosage information from OCR
   */
  private extractDosageInformation(ocrResult: OCRResult, culturalAnalysis: CulturalAnalysisResult): MedicationDosage {
    const text = ocrResult.extractedText;

    // Use OCR-detected dosage if available
    if (ocrResult.dosageInfo) {
      return this.parseDosageString(ocrResult.dosageInfo);
    }

    // Common Malaysian dosage patterns
    const dosagePatterns = [
      /(\d+)\s*(mg|ml|gram|g|mcg)/i,
      /(\d+)\s*(tablet|kapsul|capsule)/i,
      /dos[:\s]*(\d+)\s*(mg|ml|tablet)/i
    ];

    for (const pattern of dosagePatterns) {
      const match = text.match(pattern);
      if (match) {
        return {
          amount: parseInt(match[1]),
          unit: this.normalizeUnit(match[2]),
          form: this.determineForm(text),
          instructions: this.extractInstructions(ocrResult, culturalAnalysis)
        };
      }
    }

    return {
      amount: 1,
      unit: 'tablet',
      form: 'tablet',
      instructions: 'Take as directed'
    };
  }

  /**
   * Extract medication instructions
   */
  private extractInstructions(ocrResult: OCRResult, culturalAnalysis: CulturalAnalysisResult): string {
    if (ocrResult.instructions) {
      return ocrResult.instructions;
    }

    const instructionPatterns = [
      /ambil\s+.*?(?:\n|$)/i,
      /take\s+.*?(?:\n|$)/i,
      /dos\s+.*?(?:\n|$)/i,
      /cara\s+penggunaan[:\s]*(.*?)(?:\n|$)/i
    ];

    for (const pattern of instructionPatterns) {
      const match = ocrResult.extractedText.match(pattern);
      if (match) {
        return match[0].trim();
      }
    }

    // Combine cultural instructions
    const culturalInsts = culturalAnalysis.culturalInstructions.foodTimingInstructions;
    if (culturalInsts.length > 0) {
      return culturalInsts.join(', ');
    }

    return 'Take as directed';
  }

  // Additional helper methods...

  private parseDosageString(dosageString: string): MedicationDosage {
    const match = dosageString.match(/(\d+)\s*(mg|ml|tablet|capsule|g|mcg)/i);

    return {
      amount: match ? parseInt(match[1]) : 1,
      unit: match ? this.normalizeUnit(match[2]) : 'tablet',
      form: this.determineForm(dosageString),
      instructions: 'Take as directed'
    };
  }

  private normalizeUnit(unit: string): any {
    const unitMap: { [key: string]: string } = {
      'g': 'gram',
      'mcg': 'mcg',
      'mg': 'mg',
      'ml': 'ml',
      'tablet': 'tablet',
      'capsule': 'capsule',
      'kapsul': 'capsule'
    };

    return unitMap[unit.toLowerCase()] || 'tablet';
  }

  private determineForm(text: string): any {
    if (/tablet/i.test(text)) return 'tablet';
    if (/capsule|kapsul/i.test(text)) return 'tablet';
    if (/liquid|cecair/i.test(text)) return 'liquid';
    if (/injection|suntikan/i.test(text)) return 'injection';
    if (/topical|sapuan/i.test(text)) return 'topical';

    return 'tablet';
  }

  private async findGenericName(medicationName: string): Promise<string | undefined> {
    const searchResults = await this.medicationService.searchMalaysianDrugDatabase({
      query: medicationName,
      type: 'brand'
    });

    return searchResults.length > 0 ? searchResults[0].genericName : undefined;
  }

  private async findBrandName(medicationName: string, culturalAnalysis: CulturalAnalysisResult): Promise<string | undefined> {
    // If manufacturer is detected, this might be a brand name
    if (culturalAnalysis.manufacturerInfo.detected) {
      return medicationName;
    }

    return undefined;
  }

  private detectFoodInstructions(ocrResult: OCRResult): boolean {
    const foodPatterns = [
      /with\s+food/i,
      /dengan\s+makanan/i,
      /selepas\s+makan/i,
      /after\s+meal/i
    ];

    return foodPatterns.some(pattern => pattern.test(ocrResult.extractedText));
  }

  private detectFastingConsiderations(ocrResult: OCRResult): boolean {
    const fastingPatterns = [
      /avoid.*fasting/i,
      /not.*during.*fast/i,
      /elak.*puasa/i
    ];

    return fastingPatterns.some(pattern => pattern.test(ocrResult.extractedText));
  }

  private mapLanguageToPreference(language: 'ms' | 'en' | 'zh' | 'mixed'): 'ms' | 'en' | 'zh' | 'ta' {
    if (language === 'mixed') return 'ms';
    return language as 'ms' | 'en' | 'zh';
  }

  private calculateOverallConfidence(
    ocrResult: OCRResult,
    culturalAnalysis: CulturalAnalysisResult,
    validation: MedicationValidationResult
  ): number {
    const ocrConfidence = ocrResult.confidence || 0.5;
    const culturalConfidence = (
      culturalAnalysis.halalIndicators.confidence +
      culturalAnalysis.manufacturerInfo.confidence +
      culturalAnalysis.regulatoryInfo.confidence +
      culturalAnalysis.languageAnalysis.confidence
    ) / 4;
    const validationConfidence = validation.confidence;

    return (ocrConfidence * 0.4) + (culturalConfidence * 0.3) + (validationConfidence * 0.3);
  }

  private async generateMedicationSuggestions(
    extractedMedication: Partial<Medication>,
    culturalAnalysis: CulturalAnalysisResult,
    culturalContext: any
  ): Promise<MedicationDatabaseEntry[]> {
    const searchParams = {
      query: extractedMedication.name || '',
      halalOnly: culturalContext.halalOnly || false,
      language: culturalContext.languagePreference
    };

    return await this.medicationService.searchMalaysianDrugDatabase(searchParams);
  }

  private compileWarningsAndRecommendations(
    ocrResult: OCRResult,
    culturalAnalysis: CulturalAnalysisResult,
    validation: MedicationValidationResult,
    confidence: number
  ): string[] {
    const warnings: string[] = [];

    if (confidence < 0.5) {
      warnings.push('Low confidence in medication identification - manual verification required');
    }

    if (!culturalAnalysis.halalIndicators.found && culturalAnalysis.halalIndicators.confidence > 0.3) {
      warnings.push('Halal status not verified - consult with pharmacist');
    }

    if (!culturalAnalysis.regulatoryInfo.mohRegistration) {
      warnings.push('MOH registration number not detected - verify with healthcare provider');
    }

    if (ocrResult.confidence < 0.7) {
      warnings.push('Image quality may affect accuracy - consider retaking photo');
    }

    warnings.push(...validation.warnings);

    return warnings;
  }
}