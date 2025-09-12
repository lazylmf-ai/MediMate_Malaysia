/**
 * Malaysian Medication Parser
 * 
 * Specialized parser for Malaysian pharmaceutical labels supporting
 * Bahasa Malaysia, English, and Chinese text patterns commonly found
 * on medication packaging in Malaysia.
 */

import { TextRecognitionResult } from '@react-native-ml-kit/text-recognition';

export interface MalaysianParsingOptions {
  primaryLanguage: 'ms' | 'en' | 'zh' | 'mixed';
  culturalContext?: {
    malayContent?: boolean;
    chineseContent?: boolean;
    traditionalMedicine?: boolean;
  };
  enhanceAccuracy?: boolean;
}

export interface ParsedMedicationInfo {
  name?: string;
  genericName?: string;
  brandName?: string;
  dosage?: string;
  strength?: string;
  instructions?: string;
  manufacturer?: string;
  registrationNumber?: string;
  halalStatus?: boolean;
  confidence: {
    name: number;
    dosage: number;
    instructions: number;
    overall: number;
  };
  detectedPatterns: {
    language: string[];
    medicationType: 'prescription' | 'otc' | 'traditional' | 'supplement' | 'unknown';
    culturalIndicators: string[];
  };
}

export class MalaysianMedicationParser {
  private static instance: MalaysianMedicationParser;

  // Malaysian pharmaceutical company patterns
  private readonly malaysianManufacturers = [
    'pharmaniaga', 'duopharma', 'kotra pharma', 'kotra', 'y.s.p', 'ysp',
    'hovid', 'dpharma', 'apex', 'mega', 'hup soon', 'ccm', 'chemical company',
    'malaysian bio-x', 'bioxcell', 'lyna medicare', 'globeray', 'acesmedical',
    'karyacure', 'kary', 'dinamik', 'sterling', 'sterling healthcare'
  ];

  // Common Malaysian medication name patterns
  private readonly malayMedicationTerms = [
    'ubat', 'pil', 'kapsul', 'tablet', 'cecair', 'sirap', 'krim', 'gel',
    'titis', 'suntikan', 'salap', 'plaster', 'inhaler', 'suppositoria'
  ];

  // Malaysian dosage instruction patterns
  private readonly malayInstructionPatterns = [
    /(?:ambil|minum|gunakan)\s*(\d+)\s*(?:biji|tablet|pil|kapsul|titis)/i,
    /(\d+)\s*(?:kali|times)\s*(?:sehari|daily|per day)/i,
    /(?:sekali|once|twice|2x|3x)\s*(?:sehari|daily)/i,
    /(?:selepas|sebelum|before|after)\s*(?:makan|meal|food)/i,
    /(?:pada|at)\s*(?:waktu|time)\s*(?:tidur|bedtime|sleep)/i,
    /(?:jika|if|when)\s*(?:perlu|needed|diperlukan)/i
  ];

  // English medication patterns
  private readonly englishInstructionPatterns = [
    /take\s*(\d+)\s*(?:tablet|capsule|pill)s?\s*(?:daily|per day|once|twice)/i,
    /(\d+)\s*(?:time|times)\s*(?:daily|per day|a day)/i,
    /(?:once|twice|three times|thrice)\s*(?:daily|per day|a day)/i,
    /(?:before|after)\s*(?:meal|food|eating)/i,
    /(?:at|during)\s*(?:bedtime|sleep|night)/i,
    /(?:as|when)\s*(?:needed|required|necessary)/i,
    /(?:with|without)\s*food/i
  ];

  // Dosage strength patterns
  private readonly dosagePatterns = [
    /(\d+(?:\.\d+)?)\s*(mg|milligram)/i,
    /(\d+(?:\.\d+)?)\s*(ml|milliliter)/i,
    /(\d+(?:\.\d+)?)\s*(g|gram)/i,
    /(\d+(?:\.\d+)?)\s*(mcg|microgram)/i,
    /(\d+(?:\.\d+)?)\s*(iu|unit)/i,
    /(\d+(?:\.\d+)?)\s*mg\/(\d+(?:\.\d+)?)\s*ml/i,
    /(\d+)\s*(?:tablet|kapsul|pil)/i
  ];

  // Malaysian drug registration patterns
  private readonly registrationPatterns = [
    /(?:MAL|mal)\s*(\d{8}[A-Z]?\d*)/i,
    /(?:DCA|dca)\s*(\d+)/i,
    /(?:MOH|moh)\s*(?:reg|registration)?\s*(?:no|number)?\s*:?\s*([A-Z0-9]+)/i
  ];

  // Halal certification patterns
  private readonly halalPatterns = [
    /halal/i,
    /jakim/i,
    /logo?\s*halal/i,
    /sijil\s*halal/i,
    /halal\s*cert/i,
    /certified\s*halal/i
  ];

  private constructor() {}

  public static getInstance(): MalaysianMedicationParser {
    if (!MalaysianMedicationParser.instance) {
      MalaysianMedicationParser.instance = new MalaysianMedicationParser();
    }
    return MalaysianMedicationParser.instance;
  }

  /**
   * Parse Malaysian medication text from OCR result
   */
  public async parseMedicationText(
    recognitionResult: TextRecognitionResult,
    options: MalaysianParsingOptions
  ): Promise<ParsedMedicationInfo> {
    const fullText = recognitionResult.text || '';
    const lines = this.extractTextLines(recognitionResult);

    // Initialize parsing result
    const result: ParsedMedicationInfo = {
      confidence: { name: 0, dosage: 0, instructions: 0, overall: 0 },
      detectedPatterns: {
        language: [],
        medicationType: 'unknown',
        culturalIndicators: []
      }
    };

    try {
      // Step 1: Detect languages present in the text
      result.detectedPatterns.language = this.detectLanguages(fullText);

      // Step 2: Extract medication name (most critical)
      const nameResult = this.extractMedicationName(lines, options);
      if (nameResult) {
        result.name = nameResult.name;
        result.genericName = nameResult.generic;
        result.brandName = nameResult.brand;
        result.confidence.name = nameResult.confidence;
      }

      // Step 3: Extract dosage and strength information
      const dosageResult = this.extractDosageInfo(lines, fullText);
      if (dosageResult) {
        result.dosage = dosageResult.dosage;
        result.strength = dosageResult.strength;
        result.confidence.dosage = dosageResult.confidence;
      }

      // Step 4: Extract usage instructions
      const instructionsResult = this.extractInstructions(lines, options);
      if (instructionsResult) {
        result.instructions = instructionsResult.instructions;
        result.confidence.instructions = instructionsResult.confidence;
      }

      // Step 5: Extract manufacturer information
      result.manufacturer = this.extractManufacturer(lines);

      // Step 6: Extract registration number
      result.registrationNumber = this.extractRegistrationNumber(fullText);

      // Step 7: Detect halal status
      result.halalStatus = this.detectHalalStatus(fullText);

      // Step 8: Determine medication type
      result.detectedPatterns.medicationType = this.classifyMedicationType(fullText, lines);

      // Step 9: Extract cultural indicators
      result.detectedPatterns.culturalIndicators = this.extractCulturalIndicators(fullText);

      // Step 10: Calculate overall confidence
      result.confidence.overall = this.calculateOverallConfidence(result);

      return result;

    } catch (error) {
      console.error('Error parsing Malaysian medication text:', error);
      return result;
    }
  }

  /**
   * Extract text lines from recognition result
   */
  private extractTextLines(result: TextRecognitionResult): string[] {
    const lines: string[] = [];
    
    for (const block of result.blocks || []) {
      for (const line of block.lines || []) {
        const lineText = line.elements?.map(e => e.text).join(' ').trim();
        if (lineText && lineText.length > 1) {
          lines.push(lineText);
        }
      }
    }
    
    return lines;
  }

  /**
   * Detect languages present in the text
   */
  private detectLanguages(text: string): string[] {
    const languages = new Set<string>();
    
    // Check for Bahasa Malaysia indicators
    const malayWords = ['ubat', 'pil', 'minum', 'ambil', 'sehari', 'kali', 'tablet', 'kapsul'];
    if (malayWords.some(word => text.toLowerCase().includes(word))) {
      languages.add('ms');
    }
    
    // Check for English indicators
    const englishWords = ['take', 'tablet', 'daily', 'times', 'before', 'after', 'medicine'];
    if (englishWords.some(word => text.toLowerCase().includes(word))) {
      languages.add('en');
    }
    
    // Check for Chinese characters (basic detection)
    if (/[\u4e00-\u9fff]/.test(text)) {
      languages.add('zh');
    }
    
    return Array.from(languages);
  }

  /**
   * Extract medication name with brand/generic identification
   */
  private extractMedicationName(
    lines: string[], 
    options: MalaysianParsingOptions
  ): { name: string; generic?: string; brand?: string; confidence: number } | null {
    let bestMatch: { name: string; generic?: string; brand?: string; confidence: number } | null = null;
    let highestConfidence = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.length < 3) continue;

      // Skip lines that are clearly not medication names
      if (this.isNotMedicationName(line)) continue;

      // Check if line contains medication indicators
      const confidence = this.calculateNameConfidence(line, lines, i);
      
      if (confidence > highestConfidence) {
        highestConfidence = confidence;
        
        // Attempt to separate brand and generic names
        const nameAnalysis = this.analyzeMedicationName(line);
        
        bestMatch = {
          name: nameAnalysis.primary,
          generic: nameAnalysis.generic,
          brand: nameAnalysis.brand,
          confidence
        };
      }
    }

    return bestMatch;
  }

  /**
   * Check if a line is clearly not a medication name
   */
  private isNotMedicationName(line: string): boolean {
    const excludePatterns = [
      /^(?:batch|lot|exp|mfg|date)/i,
      /^\d+\s*(?:mg|ml|tablet|g)/i,
      /^(?:take|ambil|minum|gunakan)/i,
      /^(?:store|simpan|keep)/i,
      /^(?:warning|amaran|caution)/i,
      /^(?:side effects|kesan sampingan)/i,
      /^(?:dosage|dos)/i,
      /^(?:www\.|http)/i,
      /^[0-9\s\-\/]+$/,
      /^[A-Z0-9]{6,}$/ // Registration numbers
    ];

    return excludePatterns.some(pattern => pattern.test(line));
  }

  /**
   * Calculate confidence score for medication name candidate
   */
  private calculateNameConfidence(line: string, lines: string[], index: number): number {
    let confidence = 0.5; // Base confidence

    // Position bonus (medication names often appear near the top)
    if (index < 3) confidence += 0.2;
    if (index === 0) confidence += 0.1;

    // Length bonus (medication names are typically 3-50 characters)
    const length = line.length;
    if (length >= 3 && length <= 50) {
      confidence += 0.1;
      if (length >= 5 && length <= 30) confidence += 0.1;
    }

    // Capitalization patterns (many brand names are capitalized)
    if (/^[A-Z][a-z]+/.test(line)) confidence += 0.1;
    if (/^[A-Z]+$/.test(line) && length > 2) confidence += 0.05;

    // Check for common Malaysian medication suffixes/prefixes
    if (/-?(forte|plus|sr|xl|cr|er|la)$/i.test(line)) confidence += 0.15;

    // Penalty for numbers at start (likely dosage or batch info)
    if (/^\d/.test(line)) confidence -= 0.3;

    // Bonus for being followed by dosage information
    if (index < lines.length - 1) {
      const nextLine = lines[index + 1];
      if (/\d+\s*(mg|ml|tablet)/i.test(nextLine)) confidence += 0.2;
    }

    return Math.min(1, Math.max(0, confidence));
  }

  /**
   * Analyze medication name to separate brand/generic components
   */
  private analyzeMedicationName(name: string): {
    primary: string;
    generic?: string;
    brand?: string;
  } {
    const cleanName = name.trim();
    
    // Check for common generic name patterns in parentheses
    const genericMatch = cleanName.match(/^(.+?)\s*\((.+?)\)$/);
    if (genericMatch) {
      return {
        primary: cleanName,
        brand: genericMatch[1].trim(),
        generic: genericMatch[2].trim()
      };
    }

    // Check for reverse pattern (generic) brand
    const reverseMatch = cleanName.match(/^\((.+?)\)\s*(.+)$/);
    if (reverseMatch) {
      return {
        primary: cleanName,
        generic: reverseMatch[1].trim(),
        brand: reverseMatch[2].trim()
      };
    }

    // Single name - classify as brand or generic based on patterns
    return {
      primary: cleanName,
      brand: this.isLikelyBrandName(cleanName) ? cleanName : undefined,
      generic: this.isLikelyGenericName(cleanName) ? cleanName : undefined
    };
  }

  /**
   * Check if name is likely a brand name
   */
  private isLikelyBrandName(name: string): boolean {
    // Brand names often have these characteristics
    return /^[A-Z]/.test(name) || // Starts with capital
           /-?(forte|plus|sr|xl|cr|er|la)$/i.test(name) || // Has suffix
           name.length <= 15; // Shorter names are often brands
  }

  /**
   * Check if name is likely a generic name
   */
  private isLikelyGenericName(name: string): boolean {
    // Generic names often end with common drug suffixes
    const genericSuffixes = [
      'cillin', 'mycin', 'ine', 'ole', 'azole', 'pril', 'sartan', 
      'statin', 'olol', 'pine', 'zide', 'thiazide'
    ];
    
    return genericSuffixes.some(suffix => name.toLowerCase().endsWith(suffix));
  }

  /**
   * Extract dosage and strength information
   */
  private extractDosageInfo(lines: string[], fullText: string): {
    dosage: string;
    strength: string;
    confidence: number;
  } | null {
    let bestDosage: string | null = null;
    let bestStrength: string | null = null;
    let highestConfidence = 0;

    // Search through all lines for dosage patterns
    for (const line of lines) {
      for (const pattern of this.dosagePatterns) {
        const match = line.match(pattern);
        if (match) {
          const confidence = 0.8;
          if (confidence > highestConfidence) {
            highestConfidence = confidence;
            
            if (match[1] && match[2]) {
              bestStrength = `${match[1]}${match[2]}`;
              bestDosage = match[0];
            }
          }
        }
      }
    }

    if (bestDosage) {
      return {
        dosage: bestDosage,
        strength: bestStrength || bestDosage,
        confidence: highestConfidence
      };
    }

    return null;
  }

  /**
   * Extract usage instructions
   */
  private extractInstructions(lines: string[], options: MalaysianParsingOptions): {
    instructions: string;
    confidence: number;
  } | null {
    const instructionLines: { text: string; confidence: number }[] = [];

    // Check each line for instruction patterns
    for (const line of lines) {
      let confidence = 0;
      
      // Check Malay instruction patterns
      for (const pattern of this.malayInstructionPatterns) {
        if (pattern.test(line)) {
          confidence = Math.max(confidence, 0.85);
        }
      }
      
      // Check English instruction patterns
      for (const pattern of this.englishInstructionPatterns) {
        if (pattern.test(line)) {
          confidence = Math.max(confidence, 0.8);
        }
      }
      
      if (confidence > 0.5) {
        instructionLines.push({ text: line, confidence });
      }
    }

    if (instructionLines.length > 0) {
      // Sort by confidence and combine
      instructionLines.sort((a, b) => b.confidence - a.confidence);
      const bestInstructions = instructionLines.slice(0, 3); // Take top 3
      
      return {
        instructions: bestInstructions.map(i => i.text).join('. '),
        confidence: bestInstructions[0].confidence
      };
    }

    return null;
  }

  /**
   * Extract manufacturer information
   */
  private extractManufacturer(lines: string[]): string | undefined {
    for (const line of lines) {
      const lowerLine = line.toLowerCase();
      for (const manufacturer of this.malaysianManufacturers) {
        if (lowerLine.includes(manufacturer)) {
          return line.trim();
        }
      }
      
      // Check for "manufactured by" patterns
      if (/(?:manufactured|made|produced)\s+by/i.test(line)) {
        return line.trim();
      }
    }
    
    return undefined;
  }

  /**
   * Extract Malaysian drug registration number
   */
  private extractRegistrationNumber(text: string): string | undefined {
    for (const pattern of this.registrationPatterns) {
      const match = text.match(pattern);
      if (match) {
        return match[0];
      }
    }
    
    return undefined;
  }

  /**
   * Detect halal certification status
   */
  private detectHalalStatus(text: string): boolean {
    return this.halalPatterns.some(pattern => pattern.test(text));
  }

  /**
   * Classify medication type
   */
  private classifyMedicationType(
    fullText: string, 
    lines: string[]
  ): 'prescription' | 'otc' | 'traditional' | 'supplement' | 'unknown' {
    const text = fullText.toLowerCase();
    
    // Check for prescription indicators
    if (/(?:prescription|ubat dokter|dengan preskripsi|rx only)/i.test(text)) {
      return 'prescription';
    }
    
    // Check for OTC indicators
    if (/(?:otc|over.the.counter|tanpa preskripsi|non.prescription)/i.test(text)) {
      return 'otc';
    }
    
    // Check for traditional medicine indicators
    if (/(?:traditional|tradisional|herbal|chinese medicine|tcm|jamu)/i.test(text)) {
      return 'traditional';
    }
    
    // Check for supplement indicators
    if (/(?:supplement|vitamin|mineral|makanan tambahan)/i.test(text)) {
      return 'supplement';
    }
    
    return 'unknown';
  }

  /**
   * Extract cultural indicators
   */
  private extractCulturalIndicators(text: string): string[] {
    const indicators: string[] = [];
    const lowerText = text.toLowerCase();
    
    if (this.detectHalalStatus(text)) {
      indicators.push('halal_certified');
    }
    
    if (/(?:ramadan|puasa|fasting)/i.test(text)) {
      indicators.push('ramadan_consideration');
    }
    
    if (/(?:chinese|traditional|tcm)/i.test(text)) {
      indicators.push('traditional_medicine');
    }
    
    if (/(?:vegetarian|vegan|nabati)/i.test(text)) {
      indicators.push('vegetarian_friendly');
    }
    
    return indicators;
  }

  /**
   * Calculate overall parsing confidence
   */
  private calculateOverallConfidence(result: ParsedMedicationInfo): number {
    const weights = {
      name: 0.4,
      dosage: 0.3,
      instructions: 0.3
    };
    
    const weightedSum = 
      (result.confidence.name * weights.name) +
      (result.confidence.dosage * weights.dosage) +
      (result.confidence.instructions * weights.instructions);
    
    // Boost confidence for additional parsed information
    let bonus = 0;
    if (result.manufacturer) bonus += 0.05;
    if (result.registrationNumber) bonus += 0.05;
    if (result.halalStatus) bonus += 0.03;
    if (result.detectedPatterns.language.length > 1) bonus += 0.02;
    
    return Math.min(1, weightedSum + bonus);
  }
}