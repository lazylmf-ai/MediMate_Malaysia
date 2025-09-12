/**
 * OCR Service for Malaysian Medication Recognition
 * 
 * Provides text recognition capabilities specifically optimized for Malaysian
 * pharmaceutical labels, supporting multiple languages and cultural contexts.
 */

import TextRecognition, { TextRecognitionResult } from '@react-native-ml-kit/text-recognition';
import { 
  OCRResult, 
  TextBoundingBox, 
  CapturedImage,
  ProcessingResult 
} from '../../types/medication';
import { MalaysianMedicationParser } from '../../utils/text-recognition/MalaysianMedicationParser';
import { TextQualityAnalyzer } from '../../utils/text-recognition/TextQualityAnalyzer';
import { LanguageDetector } from '../../utils/text-recognition/LanguageDetector';

export interface OCROptions {
  language?: 'auto' | 'ms' | 'en' | 'zh';
  enhanceAccuracy?: boolean;
  includeConfidenceScoring?: boolean;
  culturalContext?: {
    malayContent?: boolean;
    chineseContent?: boolean;
    traditionalMedicine?: boolean;
  };
  validationStrength?: 'low' | 'medium' | 'high';
}

export interface OCRProcessingStats {
  totalProcessingTime: number;
  textDetectionTime: number;
  parsingTime: number;
  validationTime: number;
  charactersRecognized: number;
  wordsRecognized: number;
  confidenceDistribution: {
    excellent: number; // 90-100%
    good: number;      // 70-89%
    fair: number;      // 50-69%
    poor: number;      // 0-49%
  };
}

export class OCRService {
  private static instance: OCRService;
  private malaysianParser: MalaysianMedicationParser;
  private qualityAnalyzer: TextQualityAnalyzer;
  private languageDetector: LanguageDetector;

  private constructor() {
    this.malaysianParser = MalaysianMedicationParser.getInstance();
    this.qualityAnalyzer = TextQualityAnalyzer.getInstance();
    this.languageDetector = LanguageDetector.getInstance();
  }

  public static getInstance(): OCRService {
    if (!OCRService.instance) {
      OCRService.instance = new OCRService();
    }
    return OCRService.instance;
  }

  /**
   * Extract medication information from processed image
   */
  public async extractMedicationInfo(
    image: CapturedImage,
    options: OCROptions = {}
  ): Promise<OCRResult> {
    const startTime = Date.now();

    try {
      // Step 1: Perform text recognition using ML Kit
      const textDetectionStart = Date.now();
      const recognitionResult = await this.performTextRecognition(image.uri);
      const textDetectionTime = Date.now() - textDetectionStart;

      // Step 2: Analyze text quality and filter low-confidence results
      const qualityResult = await this.qualityAnalyzer.analyzeRecognitionResult(
        recognitionResult,
        options.validationStrength || 'medium'
      );

      // Step 3: Detect primary language
      const parsingStart = Date.now();
      const detectedLanguage = await this.languageDetector.detectLanguage(
        recognitionResult.text,
        options.culturalContext
      );

      // Step 4: Parse Malaysian medication patterns
      const medicationInfo = await this.malaysianParser.parseMedicationText(
        recognitionResult,
        {
          primaryLanguage: detectedLanguage,
          culturalContext: options.culturalContext,
          enhanceAccuracy: options.enhanceAccuracy
        }
      );
      const parsingTime = Date.now() - parsingStart;

      // Step 5: Build OCR result with confidence scoring
      const validationStart = Date.now();
      const ocrResult = await this.buildOCRResult(
        recognitionResult,
        medicationInfo,
        detectedLanguage,
        qualityResult,
        startTime
      );
      const validationTime = Date.now() - validationStart;

      // Step 6: Generate processing statistics
      if (options.includeConfidenceScoring) {
        const stats = this.generateProcessingStats({
          totalProcessingTime: Date.now() - startTime,
          textDetectionTime,
          parsingTime,
          validationTime,
          recognitionResult,
          ocrResult
        });
        
        // Add stats to result metadata
        (ocrResult as any).processingStats = stats;
      }

      return ocrResult;

    } catch (error) {
      console.error('OCR processing failed:', error);
      
      // Return error result with minimal confidence
      return {
        confidence: 0,
        extractedText: '',
        language: 'en',
        boundingBoxes: [],
        processingTime: Date.now() - startTime,
        imageQuality: 'poor'
      };
    }
  }

  /**
   * Perform raw text recognition using ML Kit
   */
  private async performTextRecognition(imageUri: string): Promise<TextRecognitionResult> {
    try {
      const result = await TextRecognition.recognize(imageUri);
      return result;
    } catch (error) {
      console.error('ML Kit text recognition failed:', error);
      throw new Error('Text recognition failed');
    }
  }

  /**
   * Build structured OCR result from recognition data
   */
  private async buildOCRResult(
    recognitionResult: TextRecognitionResult,
    medicationInfo: any,
    language: 'ms' | 'en' | 'zh' | 'mixed',
    qualityResult: any,
    startTime: number
  ): Promise<OCRResult> {
    // Convert ML Kit blocks to our bounding box format
    const boundingBoxes: TextBoundingBox[] = [];
    
    for (const block of recognitionResult.blocks || []) {
      for (const line of block.lines || []) {
        for (const element of line.elements || []) {
          boundingBoxes.push({
            text: element.text || '',
            bounds: {
              x: element.frame?.x || 0,
              y: element.frame?.y || 0,
              width: element.frame?.width || 0,
              height: element.frame?.height || 0
            },
            confidence: (element.confidence || 0) / 100, // Convert to 0-1 scale
            type: this.classifyTextElement(element.text || '', medicationInfo)
          });
        }
      }
    }

    // Calculate overall confidence based on various factors
    const overallConfidence = this.calculateOverallConfidence(
      recognitionResult,
      medicationInfo,
      qualityResult
    );

    // Determine image quality category
    const imageQuality = this.determineImageQuality(qualityResult, overallConfidence);

    return {
      confidence: overallConfidence,
      extractedText: recognitionResult.text || '',
      medicationName: medicationInfo?.name,
      dosageInfo: medicationInfo?.dosage,
      instructions: medicationInfo?.instructions,
      language,
      boundingBoxes,
      processingTime: Date.now() - startTime,
      imageQuality
    };
  }

  /**
   * Classify text elements by type for better parsing
   */
  private classifyTextElement(
    text: string, 
    medicationInfo: any
  ): 'medication_name' | 'dosage' | 'instructions' | 'manufacturer' | 'other' {
    const cleanText = text.toLowerCase().trim();
    
    // Check if this text matches the parsed medication name
    if (medicationInfo?.name && cleanText.includes(medicationInfo.name.toLowerCase())) {
      return 'medication_name';
    }
    
    // Check for dosage patterns
    if (/\d+\s*(mg|ml|tablet|capsule|mg\/ml)/i.test(text)) {
      return 'dosage';
    }
    
    // Check for instruction keywords
    if (/\b(take|minum|ambil|sekali|once|twice|daily|hari)\b/i.test(text)) {
      return 'instructions';
    }
    
    // Check for Malaysian pharmaceutical companies
    const malayManufacturers = [
      'pharmaniaga', 'duopharma', 'kotra pharma', 'y.s.p', 'hovid', 
      'dpharma', 'apex', 'mega', 'hup soon', 'ccm'
    ];
    
    if (malayManufacturers.some(mfg => cleanText.includes(mfg))) {
      return 'manufacturer';
    }
    
    return 'other';
  }

  /**
   * Calculate overall confidence score
   */
  private calculateOverallConfidence(
    recognitionResult: TextRecognitionResult,
    medicationInfo: any,
    qualityResult: any
  ): number {
    let totalConfidence = 0;
    let elementCount = 0;

    // Average ML Kit element confidence
    for (const block of recognitionResult.blocks || []) {
      for (const line of block.lines || []) {
        for (const element of line.elements || []) {
          if (element.confidence) {
            totalConfidence += element.confidence;
            elementCount++;
          }
        }
      }
    }

    const averageMLConfidence = elementCount > 0 ? totalConfidence / elementCount : 0;
    
    // Boost confidence if we successfully parsed medication info
    let medicationBoost = 0;
    if (medicationInfo?.name) medicationBoost += 20;
    if (medicationInfo?.dosage) medicationBoost += 15;
    if (medicationInfo?.instructions) medicationBoost += 10;
    
    // Quality adjustment
    const qualityAdjustment = qualityResult?.score || 0;
    
    // Combine factors (ML Kit confidence is 0-100, normalize to 0-1)
    const combinedScore = Math.min(100, 
      (averageMLConfidence * 0.6) + 
      medicationBoost + 
      (qualityAdjustment * 0.3)
    ) / 100;
    
    return Math.round(combinedScore * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Determine image quality category
   */
  private determineImageQuality(
    qualityResult: any, 
    confidence: number
  ): 'excellent' | 'good' | 'fair' | 'poor' {
    if (confidence > 0.9 && qualityResult?.score > 80) return 'excellent';
    if (confidence > 0.7 && qualityResult?.score > 60) return 'good';
    if (confidence > 0.5 && qualityResult?.score > 40) return 'fair';
    return 'poor';
  }

  /**
   * Generate processing statistics
   */
  private generateProcessingStats(params: {
    totalProcessingTime: number;
    textDetectionTime: number;
    parsingTime: number;
    validationTime: number;
    recognitionResult: TextRecognitionResult;
    ocrResult: OCRResult;
  }): OCRProcessingStats {
    const { recognitionResult, ocrResult } = params;
    
    // Count characters and words
    const charactersRecognized = ocrResult.extractedText.length;
    const wordsRecognized = ocrResult.extractedText.split(/\s+/).filter(w => w.length > 0).length;
    
    // Analyze confidence distribution
    const confidenceDistribution = {
      excellent: 0,
      good: 0,
      fair: 0,
      poor: 0
    };
    
    ocrResult.boundingBoxes.forEach(box => {
      if (box.confidence > 0.9) confidenceDistribution.excellent++;
      else if (box.confidence > 0.7) confidenceDistribution.good++;
      else if (box.confidence > 0.5) confidenceDistribution.fair++;
      else confidenceDistribution.poor++;
    });
    
    return {
      totalProcessingTime: params.totalProcessingTime,
      textDetectionTime: params.textDetectionTime,
      parsingTime: params.parsingTime,
      validationTime: params.validationTime,
      charactersRecognized,
      wordsRecognized,
      confidenceDistribution
    };
  }

  /**
   * Batch process multiple images
   */
  public async batchProcessImages(
    images: CapturedImage[],
    options: OCROptions = {}
  ): Promise<OCRResult[]> {
    const results: OCRResult[] = [];
    
    for (const image of images) {
      try {
        const result = await this.extractMedicationInfo(image, options);
        results.push(result);
      } catch (error) {
        console.error(`Batch OCR failed for image ${image.uri}:`, error);
        results.push({
          confidence: 0,
          extractedText: '',
          language: 'en',
          boundingBoxes: [],
          processingTime: 0,
          imageQuality: 'poor'
        });
      }
    }
    
    return results;
  }

  /**
   * Validate OCR result against known medication patterns
   */
  public async validateOCRResult(
    ocrResult: OCRResult,
    knownMedications?: string[]
  ): Promise<{
    isValid: boolean;
    validationScore: number;
    suggestions: string[];
    issues: string[];
  }> {
    const issues: string[] = [];
    const suggestions: string[] = [];
    let validationScore = ocrResult.confidence;

    // Check if medication name is recognized
    if (ocrResult.medicationName && knownMedications) {
      const isKnown = knownMedications.some(med => 
        med.toLowerCase().includes(ocrResult.medicationName!.toLowerCase()) ||
        ocrResult.medicationName!.toLowerCase().includes(med.toLowerCase())
      );
      
      if (!isKnown) {
        issues.push('Medication name not found in database');
        validationScore *= 0.8;
        
        // Find similar medications
        const similar = knownMedications.filter(med =>
          this.calculateSimilarity(med, ocrResult.medicationName!) > 0.7
        );
        suggestions.push(...similar.slice(0, 3));
      }
    }

    // Check dosage format
    if (ocrResult.dosageInfo && !this.isValidDosageFormat(ocrResult.dosageInfo)) {
      issues.push('Dosage format appears incorrect');
      validationScore *= 0.9;
    }

    // Check text coherence
    if (ocrResult.extractedText.length < 10) {
      issues.push('Very little text detected');
      validationScore *= 0.7;
    }

    const isValid = issues.length === 0 && validationScore > 0.6;

    return {
      isValid,
      validationScore,
      suggestions,
      issues
    };
  }

  /**
   * Calculate text similarity for medication matching
   */
  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.computeEditDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }

  /**
   * Compute edit distance for similarity calculation
   */
  private computeEditDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // deletion
          matrix[j - 1][i] + 1,     // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  /**
   * Validate dosage format
   */
  private isValidDosageFormat(dosage: string): boolean {
    // Common Malaysian medication dosage patterns
    const dosagePatterns = [
      /^\d+\s*(mg|ml|tablet|kapsul|titis)/i,
      /^\d+\s*mg\/\d+\s*ml/i,
      /^\d+\s*tablet\s*(sekali|sehari|daily)/i,
      /^\d+\.\d+\s*(mg|ml)/i
    ];
    
    return dosagePatterns.some(pattern => pattern.test(dosage.trim()));
  }
}