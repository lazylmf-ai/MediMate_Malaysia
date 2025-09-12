/**
 * Cultural Pattern Recognizer for Malaysian Pharmaceutical Formats
 * 
 * Recognizes Malaysian-specific patterns in medication packaging including
 * halal certification, local manufacturer information, regulatory details,
 * and cultural considerations for medication instructions.
 */

import { OCRResult, TextBoundingBox } from '../../types/medication';

export interface CulturalPattern {
  type: 'halal_certification' | 'manufacturer' | 'registration' | 'pricing' | 'cultural_instruction';
  pattern: string;
  confidence: number;
  culturalSignificance: 'high' | 'medium' | 'low';
  description: string;
  malayTranslation?: string;
}

export interface CulturalRecognitionResult {
  patterns: CulturalPattern[];
  halalStatus: {
    isHalal: boolean;
    confidence: number;
    certificationDetails?: string;
  };
  manufacturerInfo: {
    isLocalMalaysian: boolean;
    company?: string;
    confidence: number;
  };
  regulatoryInfo: {
    registrationNumber?: string;
    registrationType: 'MAL' | 'DCA' | 'MOH' | 'unknown';
    confidence: number;
  };
  culturalInstructions: {
    ramadanConsiderations: boolean;
    prayerTimeRelevant: boolean;
    foodTimingSpecified: boolean;
    instructions: string[];
  };
  culturalScore: number; // Overall Malaysian cultural relevance (0-100)
}

export class CulturalPatternRecognizer {
  private static instance: CulturalPatternRecognizer;

  // Halal certification patterns
  private readonly halalPatterns = [
    { pattern: /halal/i, weight: 1.0 },
    { pattern: /jakim/i, weight: 0.9 },
    { pattern: /logo?\s*halal/i, weight: 0.8 },
    { pattern: /sijil\s*halal/i, weight: 0.9 },
    { pattern: /halal\s*cert/i, weight: 0.8 },
    { pattern: /certified\s*halal/i, weight: 0.8 },
    { pattern: /\bڤيڤيد\b/i, weight: 0.7 }, // Jawi script for "halal"
  ];

  // Malaysian pharmaceutical companies
  private readonly malaysianManufacturers = [
    { name: 'Pharmaniaga Berhad', pattern: /pharmaniaga/i, weight: 1.0 },
    { name: 'Duopharma Biotech', pattern: /duopharma/i, weight: 1.0 },
    { name: 'Kotra Pharma (M) Sdn Bhd', pattern: /kotra\s*pharma/i, weight: 1.0 },
    { name: 'Y.S.P Industries (M) Sdn Bhd', pattern: /y\.?s\.?p/i, weight: 1.0 },
    { name: 'Hovid Berhad', pattern: /hovid/i, weight: 1.0 },
    { name: 'Apex Pharmacy Marketing Sdn Bhd', pattern: /apex\s*pharmacy/i, weight: 1.0 },
    { name: 'CCM Pharmaceuticals Sdn Bhd', pattern: /ccm\s*pharmaceuticals?/i, weight: 1.0 },
    { name: 'Chemical Company of Malaysia', pattern: /chemical\s*company.*malaysia/i, weight: 1.0 },
    { name: 'Lyna Medicare Sdn Bhd', pattern: /lyna\s*medicare/i, weight: 0.9 },
    { name: 'Sterling Healthcare Sdn Bhd', pattern: /sterling\s*healthcare/i, weight: 0.9 },
    { name: 'Dinamik Healthcare Sdn Bhd', pattern: /dinamik\s*healthcare/i, weight: 0.9 },
    { name: 'Globeray Healthcare Sdn Bhd', pattern: /globeray/i, weight: 0.9 },
  ];

  // Malaysian drug registration patterns
  private readonly registrationPatterns = [
    { type: 'MAL', pattern: /MAL\s*(\d{8}[A-Z]?\d*)/i, weight: 1.0 },
    { type: 'DCA', pattern: /DCA\s*(\d+)/i, weight: 0.9 },
    { type: 'MOH', pattern: /MOH\s*(?:reg|registration)?\s*(?:no|number)?\s*:?\s*([A-Z0-9]+)/i, weight: 0.8 },
    { type: 'NPRA', pattern: /NPRA\s*(\d+)/i, weight: 0.9 },
  ];

  // Cultural instruction patterns
  private readonly culturalInstructionPatterns = [
    {
      pattern: /(?:selepas|sebelum)\s*(?:berbuka|iftar|sahur)/i,
      type: 'ramadan_timing',
      malayTranslation: 'Timing related to Ramadan meals',
      significance: 'high' as const
    },
    {
      pattern: /(?:waktu|masa)\s*(?:solat|sembahyang|prayer)/i,
      type: 'prayer_timing',
      malayTranslation: 'Prayer time considerations',
      significance: 'high' as const
    },
    {
      pattern: /(?:dengan|tanpa)\s*makanan/i,
      type: 'food_timing',
      malayTranslation: 'With or without food',
      significance: 'medium' as const
    },
    {
      pattern: /(?:perut\s*kosong|empty\s*stomach)/i,
      type: 'empty_stomach',
      malayTranslation: 'On empty stomach',
      significance: 'medium' as const
    },
    {
      pattern: /(?:sebelum|before)\s*(?:tidur|sleep|bedtime)/i,
      type: 'bedtime',
      malayTranslation: 'Before sleep/bedtime',
      significance: 'medium' as const
    },
    {
      pattern: /(?:jika|if)\s*(?:diperlukan|needed|perlu)/i,
      type: 'as_needed',
      malayTranslation: 'When needed',
      significance: 'low' as const
    },
  ];

  // Malaysian pricing patterns
  private readonly pricingPatterns = [
    { pattern: /RM\s*\d+\.?\d*/i, currency: 'MYR', weight: 1.0 },
    { pattern: /ringgit\s*malaysia/i, currency: 'MYR', weight: 0.9 },
    { pattern: /harga\s*:\s*RM/i, currency: 'MYR', weight: 0.8 },
  ];

  private constructor() {}

  public static getInstance(): CulturalPatternRecognizer {
    if (!CulturalPatternRecognizer.instance) {
      CulturalPatternRecognizer.instance = new CulturalPatternRecognizer();
    }
    return CulturalPatternRecognizer.instance;
  }

  /**
   * Analyze OCR result for Malaysian cultural patterns
   */
  public async analyzeCulturalPatterns(ocrResult: OCRResult): Promise<CulturalRecognitionResult> {
    const text = ocrResult.extractedText;
    
    const result: CulturalRecognitionResult = {
      patterns: [],
      halalStatus: { isHalal: false, confidence: 0 },
      manufacturerInfo: { isLocalMalaysian: false, confidence: 0 },
      regulatoryInfo: { registrationType: 'unknown', confidence: 0 },
      culturalInstructions: {
        ramadanConsiderations: false,
        prayerTimeRelevant: false,
        foodTimingSpecified: false,
        instructions: []
      },
      culturalScore: 0
    };

    try {
      // Step 1: Analyze halal certification
      result.halalStatus = this.analyzeHalalStatus(text);
      if (result.halalStatus.isHalal) {
        result.patterns.push({
          type: 'halal_certification',
          pattern: 'Halal certification detected',
          confidence: result.halalStatus.confidence,
          culturalSignificance: 'high',
          description: 'Medication is halal certified',
          malayTranslation: 'Ubat ini mendapat sijil halal'
        });
      }

      // Step 2: Analyze manufacturer information
      result.manufacturerInfo = this.analyzeManufacturer(text);
      if (result.manufacturerInfo.isLocalMalaysian) {
        result.patterns.push({
          type: 'manufacturer',
          pattern: result.manufacturerInfo.company || 'Local Malaysian manufacturer',
          confidence: result.manufacturerInfo.confidence,
          culturalSignificance: 'medium',
          description: 'Manufactured by Malaysian company',
          malayTranslation: 'Dikilangkan oleh syarikat Malaysia'
        });
      }

      // Step 3: Analyze regulatory information
      result.regulatoryInfo = this.analyzeRegulatoryInfo(text);
      if (result.regulatoryInfo.registrationNumber) {
        result.patterns.push({
          type: 'registration',
          pattern: result.regulatoryInfo.registrationNumber,
          confidence: result.regulatoryInfo.confidence,
          culturalSignificance: 'medium',
          description: 'Malaysian drug registration number',
          malayTranslation: 'Nombor pendaftaran ubat Malaysia'
        });
      }

      // Step 4: Analyze cultural instructions
      result.culturalInstructions = this.analyzeCulturalInstructions(text);
      
      // Step 5: Detect pricing in Malaysian Ringgit
      const pricingInfo = this.analyzePricing(text);
      if (pricingInfo.hasMalaysianPricing) {
        result.patterns.push({
          type: 'pricing',
          pattern: pricingInfo.priceText || 'Malaysian Ringgit pricing',
          confidence: pricingInfo.confidence,
          culturalSignificance: 'low',
          description: 'Priced in Malaysian Ringgit',
          malayTranslation: 'Harga dalam Ringgit Malaysia'
        });
      }

      // Step 6: Calculate overall cultural score
      result.culturalScore = this.calculateCulturalScore(result);

      return result;

    } catch (error) {
      console.error('Error analyzing cultural patterns:', error);
      return result;
    }
  }

  /**
   * Analyze halal certification status
   */
  private analyzeHalalStatus(text: string): {
    isHalal: boolean;
    confidence: number;
    certificationDetails?: string;
  } {
    let maxConfidence = 0;
    let certificationDetails: string | undefined;
    
    for (const { pattern, weight } of this.halalPatterns) {
      const matches = text.match(new RegExp(pattern.source, 'gi'));
      if (matches) {
        const confidence = weight * (matches.length > 1 ? 0.95 : 0.8);
        if (confidence > maxConfidence) {
          maxConfidence = confidence;
          certificationDetails = matches[0];
        }
      }
    }

    // Look for JAKIM logo or specific halal certificate numbers
    const jakimMatch = text.match(/JAKIM\s*(?:MS\s*)?(\d+)/i);
    if (jakimMatch) {
      maxConfidence = Math.max(maxConfidence, 0.95);
      certificationDetails = jakimMatch[0];
    }

    return {
      isHalal: maxConfidence > 0.5,
      confidence: maxConfidence,
      certificationDetails
    };
  }

  /**
   * Analyze manufacturer information
   */
  private analyzeManufacturer(text: string): {
    isLocalMalaysian: boolean;
    company?: string;
    confidence: number;
  } {
    let maxConfidence = 0;
    let detectedCompany: string | undefined;

    for (const { name, pattern, weight } of this.malaysianManufacturers) {
      const match = text.match(pattern);
      if (match) {
        const confidence = weight * 0.9; // Slight reduction for text recognition uncertainty
        if (confidence > maxConfidence) {
          maxConfidence = confidence;
          detectedCompany = name;
        }
      }
    }

    // Look for general Malaysian manufacturer indicators
    const malaysianIndicators = [
      /sdn\s*bhd/i,
      /berhad/i,
      /malaysia/i,
      /kuala\s*lumpur/i,
      /selangor/i,
      /penang/i,
      /johor/i
    ];

    for (const indicator of malaysianIndicators) {
      if (indicator.test(text)) {
        maxConfidence = Math.max(maxConfidence, 0.6);
      }
    }

    return {
      isLocalMalaysian: maxConfidence > 0.5,
      company: detectedCompany,
      confidence: maxConfidence
    };
  }

  /**
   * Analyze regulatory information
   */
  private analyzeRegulatoryInfo(text: string): {
    registrationNumber?: string;
    registrationType: 'MAL' | 'DCA' | 'MOH' | 'unknown';
    confidence: number;
  } {
    let maxConfidence = 0;
    let registrationNumber: string | undefined;
    let registrationType: 'MAL' | 'DCA' | 'MOH' | 'unknown' = 'unknown';

    for (const { type, pattern, weight } of this.registrationPatterns) {
      const match = text.match(pattern);
      if (match) {
        const confidence = weight * 0.9;
        if (confidence > maxConfidence) {
          maxConfidence = confidence;
          registrationNumber = match[0];
          registrationType = type as 'MAL' | 'DCA' | 'MOH';
        }
      }
    }

    return {
      registrationNumber,
      registrationType,
      confidence: maxConfidence
    };
  }

  /**
   * Analyze cultural instructions
   */
  private analyzeCulturalInstructions(text: string): {
    ramadanConsiderations: boolean;
    prayerTimeRelevant: boolean;
    foodTimingSpecified: boolean;
    instructions: string[];
  } {
    const instructions: string[] = [];
    let ramadanConsiderations = false;
    let prayerTimeRelevant = false;
    let foodTimingSpecified = false;

    for (const { pattern, type, malayTranslation } of this.culturalInstructionPatterns) {
      const matches = text.match(new RegExp(pattern.source, 'gi'));
      if (matches) {
        instructions.push(malayTranslation || matches[0]);
        
        switch (type) {
          case 'ramadan_timing':
            ramadanConsiderations = true;
            break;
          case 'prayer_timing':
            prayerTimeRelevant = true;
            break;
          case 'food_timing':
          case 'empty_stomach':
            foodTimingSpecified = true;
            break;
        }
      }
    }

    return {
      ramadanConsiderations,
      prayerTimeRelevant,
      foodTimingSpecified,
      instructions
    };
  }

  /**
   * Analyze pricing in Malaysian currency
   */
  private analyzePricing(text: string): {
    hasMalaysianPricing: boolean;
    priceText?: string;
    confidence: number;
  } {
    let maxConfidence = 0;
    let priceText: string | undefined;

    for (const { pattern, weight } of this.pricingPatterns) {
      const match = text.match(pattern);
      if (match) {
        maxConfidence = Math.max(maxConfidence, weight * 0.8);
        priceText = match[0];
      }
    }

    return {
      hasMalaysianPricing: maxConfidence > 0.5,
      priceText,
      confidence: maxConfidence
    };
  }

  /**
   * Calculate overall cultural relevance score
   */
  private calculateCulturalScore(result: CulturalRecognitionResult): number {
    let score = 0;
    const weights = {
      halal: 30,
      manufacturer: 25,
      registration: 20,
      cultural_instructions: 15,
      pricing: 10
    };

    // Halal certification
    if (result.halalStatus.isHalal) {
      score += weights.halal * result.halalStatus.confidence;
    }

    // Malaysian manufacturer
    if (result.manufacturerInfo.isLocalMalaysian) {
      score += weights.manufacturer * result.manufacturerInfo.confidence;
    }

    // Regulatory registration
    if (result.regulatoryInfo.registrationNumber) {
      score += weights.registration * result.regulatoryInfo.confidence;
    }

    // Cultural instructions
    const culturalInstructionScore = (
      (result.culturalInstructions.ramadanConsiderations ? 1 : 0) +
      (result.culturalInstructions.prayerTimeRelevant ? 1 : 0) +
      (result.culturalInstructions.foodTimingSpecified ? 0.5 : 0)
    ) / 2.5; // Normalize to 0-1
    score += weights.cultural_instructions * culturalInstructionScore;

    // Malaysian pricing
    const pricingPattern = result.patterns.find(p => p.type === 'pricing');
    if (pricingPattern) {
      score += weights.pricing * pricingPattern.confidence;
    }

    return Math.min(100, Math.max(0, score));
  }

  /**
   * Generate cultural adaptation recommendations
   */
  public generateCulturalRecommendations(
    result: CulturalRecognitionResult
  ): {
    halalConsiderations: string[];
    timingRecommendations: string[];
    culturalNotes: string[];
  } {
    const recommendations = {
      halalConsiderations: [] as string[],
      timingRecommendations: [] as string[],
      culturalNotes: [] as string[]
    };

    if (result.halalStatus.isHalal) {
      recommendations.halalConsiderations.push('Medication is halal certified');
      recommendations.halalConsiderations.push('Safe for Muslim consumption');
    } else {
      recommendations.halalConsiderations.push('Halal status not confirmed');
      recommendations.halalConsiderations.push('Check with pharmacist for halal alternatives');
    }

    if (result.culturalInstructions.ramadanConsiderations) {
      recommendations.timingRecommendations.push('Special Ramadan timing considerations apply');
      recommendations.timingRecommendations.push('Adjust schedule for Sahur and Iftar times');
    }

    if (result.culturalInstructions.prayerTimeRelevant) {
      recommendations.timingRecommendations.push('Consider prayer times when scheduling medication');
      recommendations.timingRecommendations.push('Allow buffer time before/after prayers');
    }

    if (result.culturalInstructions.foodTimingSpecified) {
      recommendations.timingRecommendations.push('Specific food timing requirements detected');
      recommendations.timingRecommendations.push('Follow meal timing instructions carefully');
    }

    if (result.manufacturerInfo.isLocalMalaysian) {
      recommendations.culturalNotes.push('Manufactured locally in Malaysia');
      recommendations.culturalNotes.push('Complies with Malaysian pharmaceutical standards');
    }

    if (result.culturalScore > 70) {
      recommendations.culturalNotes.push('High cultural adaptation for Malaysian users');
    } else if (result.culturalScore < 30) {
      recommendations.culturalNotes.push('Limited Malaysian cultural adaptation detected');
    }

    return recommendations;
  }
}