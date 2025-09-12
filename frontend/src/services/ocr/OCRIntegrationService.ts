/**
 * OCR Integration Service
 * 
 * Integrates OCR functionality with Stream A processed images and 
 * Stream C medication database validation for complete Malaysian 
 * medication recognition workflow.
 */

import { OCRService } from './OCRService';
import { ImageProcessor } from '../../utils/image/ImageProcessor';
import { MedicationServices } from '../medication';
import { 
  OCRResult, 
  CapturedImage, 
  ProcessingResult, 
  Medication,
  MedicationSearchResult 
} from '../../types/medication';

export interface OCRIntegrationOptions {
  enhanceImageForOCR?: boolean;
  validateWithDatabase?: boolean;
  includeSuggestions?: boolean;
  culturalContext?: {
    malayContent?: boolean;
    chineseContent?: boolean;
    traditionalMedicine?: boolean;
    halalOnly?: boolean;
  };
  confidenceThreshold?: number; // Minimum confidence for automatic acceptance
  maxSuggestions?: number;
}

export interface IntegratedOCRResult {
  ocrResult: OCRResult;
  processedImage: CapturedImage;
  databaseValidation?: {
    isValid: boolean;
    matchedMedications: any[];
    suggestions: string[];
    confidence: number;
  };
  recommendations: {
    shouldRetake: boolean;
    reasons: string[];
    suggestions: string[];
    alternativeActions: string[];
  };
  processingStats: {
    imageProcessingTime: number;
    ocrProcessingTime: number;
    databaseValidationTime: number;
    totalTime: number;
  };
}

export class OCRIntegrationService {
  private static instance: OCRIntegrationService;
  private ocrService: OCRService;
  private imageProcessor: ImageProcessor;

  private constructor() {
    this.ocrService = OCRService.getInstance();
    this.imageProcessor = ImageProcessor.getInstance();
  }

  public static getInstance(): OCRIntegrationService {
    if (!OCRIntegrationService.instance) {
      OCRIntegrationService.instance = new OCRIntegrationService();
    }
    return OCRIntegrationService.instance;
  }

  /**
   * Complete OCR workflow: process image, extract text, validate with database
   */
  public async processImageWithValidation(
    image: CapturedImage,
    options: OCRIntegrationOptions = {}
  ): Promise<IntegratedOCRResult> {
    const startTime = Date.now();
    let processedImage = image;
    let imageProcessingTime = 0;
    let ocrProcessingTime = 0;
    let databaseValidationTime = 0;

    try {
      // Step 1: Enhance image for OCR if requested
      if (options.enhanceImageForOCR !== false) {
        const imageStartTime = Date.now();
        
        const processingResult = await this.imageProcessor.processForOCR(image, {
          enhanceContrast: true,
          adjustBrightness: true,
          autoRotate: true,
          cropToLabel: true,
          resizeForOCR: true,
          targetWidth: 1800,
          targetHeight: 1200
        });
        
        processedImage = processingResult.processedImage;
        imageProcessingTime = Date.now() - imageStartTime;
      }

      // Step 2: Perform OCR on processed image
      const ocrStartTime = Date.now();
      const ocrResult = await this.ocrService.extractMedicationInfo(processedImage, {
        enhanceAccuracy: true,
        includeConfidenceScoring: true,
        culturalContext: options.culturalContext,
        validationStrength: 'high'
      });
      ocrProcessingTime = Date.now() - ocrStartTime;

      // Step 3: Validate with medication database if requested
      let databaseValidation;
      if (options.validateWithDatabase !== false) {
        const dbStartTime = Date.now();
        databaseValidation = await this.validateWithMedicationDatabase(
          ocrResult,
          options
        );
        databaseValidationTime = Date.now() - dbStartTime;
      }

      // Step 4: Generate recommendations
      const recommendations = this.generateProcessingRecommendations(
        ocrResult,
        databaseValidation,
        options
      );

      // Step 5: Compile processing statistics
      const totalTime = Date.now() - startTime;
      const processingStats = {
        imageProcessingTime,
        ocrProcessingTime,
        databaseValidationTime,
        totalTime
      };

      return {
        ocrResult,
        processedImage,
        databaseValidation,
        recommendations,
        processingStats
      };

    } catch (error) {
      console.error('OCR integration processing failed:', error);
      
      return {
        ocrResult: {
          confidence: 0,
          extractedText: '',
          language: 'en',
          boundingBoxes: [],
          processingTime: Date.now() - startTime,
          imageQuality: 'poor'
        },
        processedImage,
        recommendations: {
          shouldRetake: true,
          reasons: ['Processing failed due to technical error'],
          suggestions: ['Please try again with a clearer photo'],
          alternativeActions: ['Enter medication details manually']
        },
        processingStats: {
          imageProcessingTime,
          ocrProcessingTime,
          databaseValidationTime,
          totalTime: Date.now() - startTime
        }
      };
    }
  }

  /**
   * Validate OCR results with medication database
   */
  private async validateWithMedicationDatabase(
    ocrResult: OCRResult,
    options: OCRIntegrationOptions
  ): Promise<{
    isValid: boolean;
    matchedMedications: any[];
    suggestions: string[];
    confidence: number;
  }> {
    const validation = {
      isValid: false,
      matchedMedications: [] as any[],
      suggestions: [] as string[],
      confidence: 0
    };

    try {
      // Search for medication if name was extracted
      if (ocrResult.medicationName && ocrResult.medicationName.length > 2) {
        const searchResult = await MedicationServices.searchMedications(
          ocrResult.medicationName,
          {
            culturalPreferences: {
              halalOnly: options.culturalContext?.halalOnly || false,
              language: ocrResult.language === 'ms' ? 'ms' : 'en',
              observesRamadan: false // Will be set based on user profile
            },
            includeAutocomplete: true
          }
        );

        if (searchResult.medications && searchResult.medications.length > 0) {
          validation.matchedMedications = searchResult.medications.slice(0, 5);
          
          // Check for exact or close matches
          const exactMatch = searchResult.medications.find(med =>
            med.name.toLowerCase() === ocrResult.medicationName!.toLowerCase() ||
            med.genericName?.toLowerCase() === ocrResult.medicationName!.toLowerCase()
          );

          if (exactMatch) {
            validation.isValid = true;
            validation.confidence = 0.9;
          } else {
            // Check for partial matches
            const partialMatches = searchResult.medications.filter(med =>
              this.calculateSimilarity(med.name, ocrResult.medicationName!) > 0.7 ||
              (med.genericName && this.calculateSimilarity(med.genericName, ocrResult.medicationName!) > 0.7)
            );

            if (partialMatches.length > 0) {
              validation.isValid = true;
              validation.confidence = 0.7;
              validation.suggestions = partialMatches
                .slice(0, options.maxSuggestions || 3)
                .map(med => med.name);
            }
          }
        }

        // If no direct matches, try autocomplete suggestions
        if (!validation.isValid && searchResult.suggestions) {
          validation.suggestions = searchResult.suggestions.slice(0, options.maxSuggestions || 5);
          validation.confidence = 0.4;
        }
      }

      // Validate dosage information if available
      if (ocrResult.dosageInfo) {
        const dosageValidation = this.validateDosageFormat(ocrResult.dosageInfo);
        if (!dosageValidation.isValid) {
          validation.confidence *= 0.8; // Reduce confidence for invalid dosage
        }
      }

      // Apply cultural context validation
      if (options.culturalContext?.halalOnly && validation.matchedMedications.length > 0) {
        // Filter for halal-certified medications
        validation.matchedMedications = validation.matchedMedications.filter(med =>
          med.cultural?.halalCertified !== false
        );
      }

    } catch (error) {
      console.error('Database validation failed:', error);
      validation.suggestions.push('Database validation temporarily unavailable');
    }

    return validation;
  }

  /**
   * Generate processing recommendations based on OCR and validation results
   */
  private generateProcessingRecommendations(
    ocrResult: OCRResult,
    databaseValidation?: {
      isValid: boolean;
      matchedMedications: any[];
      suggestions: string[];
      confidence: number;
    },
    options: OCRIntegrationOptions = {}
  ): {
    shouldRetake: boolean;
    reasons: string[];
    suggestions: string[];
    alternativeActions: string[];
  } {
    const recommendations = {
      shouldRetake: false,
      reasons: [] as string[],
      suggestions: [] as string[],
      alternativeActions: [] as string[]
    };

    const confidenceThreshold = options.confidenceThreshold || 0.7;

    // Analyze OCR quality
    if (ocrResult.confidence < confidenceThreshold) {
      recommendations.shouldRetake = true;
      recommendations.reasons.push(`OCR confidence (${Math.round(ocrResult.confidence * 100)}%) below threshold`);
    }

    if (ocrResult.imageQuality === 'poor') {
      recommendations.shouldRetake = true;
      recommendations.reasons.push('Image quality is too poor for reliable text recognition');
    }

    // Analyze extracted content
    if (!ocrResult.medicationName || ocrResult.medicationName.length < 3) {
      recommendations.shouldRetake = true;
      recommendations.reasons.push('Medication name not clearly detected');
    }

    if (ocrResult.extractedText.length < 20) {
      recommendations.shouldRetake = true;
      recommendations.reasons.push('Very little text detected in image');
    }

    // Analyze database validation if available
    if (databaseValidation) {
      if (!databaseValidation.isValid && databaseValidation.suggestions.length === 0) {
        recommendations.reasons.push('Medication not found in database');
        recommendations.alternativeActions.push('Verify medication name spelling');
        recommendations.alternativeActions.push('Check if medication is available in Malaysia');
      }

      if (databaseValidation.confidence < 0.5) {
        recommendations.shouldRetake = true;
        recommendations.reasons.push('Low confidence in medication identification');
      }
    }

    // Generate suggestions based on issues identified
    if (recommendations.shouldRetake) {
      if (ocrResult.imageQuality === 'poor') {
        recommendations.suggestions.push('Ensure good lighting when taking the photo');
        recommendations.suggestions.push('Hold the camera steady and wait for focus');
        recommendations.suggestions.push('Move closer to the medication label');
      }

      if (!ocrResult.medicationName) {
        recommendations.suggestions.push('Focus on the main medication name on the label');
        recommendations.suggestions.push('Avoid capturing multiple labels at once');
      }

      if (ocrResult.language === 'mixed' || ocrResult.confidence < 0.5) {
        recommendations.suggestions.push('Try capturing the label from a different angle');
        recommendations.suggestions.push('Clean the camera lens if the image appears blurry');
      }
    } else {
      // Provide positive feedback for good results
      recommendations.suggestions.push('Good image quality detected');
      if (databaseValidation?.isValid) {
        recommendations.suggestions.push('Medication found in database');
      }
    }

    // Always provide alternative actions
    recommendations.alternativeActions.push('Enter medication details manually');
    if (databaseValidation?.suggestions && databaseValidation.suggestions.length > 0) {
      recommendations.alternativeActions.push('Select from suggested medications');
    }
    recommendations.alternativeActions.push('Search medication database directly');

    return recommendations;
  }

  /**
   * Batch process multiple images with validation
   */
  public async batchProcessWithValidation(
    images: CapturedImage[],
    options: OCRIntegrationOptions = {}
  ): Promise<IntegratedOCRResult[]> {
    const results: IntegratedOCRResult[] = [];

    for (const image of images) {
      try {
        const result = await this.processImageWithValidation(image, options);
        results.push(result);
      } catch (error) {
        console.error(`Batch processing failed for image ${image.uri}:`, error);
        // Add error result
        results.push({
          ocrResult: {
            confidence: 0,
            extractedText: '',
            language: 'en',
            boundingBoxes: [],
            processingTime: 0,
            imageQuality: 'poor'
          },
          processedImage: image,
          recommendations: {
            shouldRetake: true,
            reasons: ['Processing failed'],
            suggestions: ['Try again with a clearer photo'],
            alternativeActions: ['Enter details manually']
          },
          processingStats: {
            imageProcessingTime: 0,
            ocrProcessingTime: 0,
            databaseValidationTime: 0,
            totalTime: 0
          }
        });
      }
    }

    return results;
  }

  /**
   * Create medication entry from OCR result with database validation
   */
  public async createMedicationFromOCR(
    ocrResult: OCRResult,
    databaseValidation: any,
    userConfirmation: boolean = false
  ): Promise<Partial<Medication>> {
    const medicationEntry: Partial<Medication> = {
      name: ocrResult.medicationName || 'Unknown Medication',
      ocrData: ocrResult,
      category: 'prescription', // Default, can be updated
      status: 'active'
    };

    // Use database validation to enhance the entry
    if (databaseValidation?.isValid && databaseValidation.matchedMedications.length > 0) {
      const bestMatch = databaseValidation.matchedMedications[0];
      
      medicationEntry.name = bestMatch.name;
      medicationEntry.genericName = bestMatch.genericName;
      medicationEntry.brandName = bestMatch.brandNames?.[0];
      
      // Set dosage if extracted from OCR
      if (ocrResult.dosageInfo) {
        medicationEntry.dosage = {
          amount: this.extractDosageAmount(ocrResult.dosageInfo),
          unit: this.extractDosageUnit(ocrResult.dosageInfo),
          form: this.extractDosageForm(ocrResult.dosageInfo),
          instructions: ocrResult.instructions
        };
      }

      // Set cultural information
      medicationEntry.cultural = {
        takeWithFood: false, // Default, can be parsed from instructions
        avoidDuringFasting: false,
        prayerTimeConsiderations: []
      };
    }

    return medicationEntry;
  }

  // Helper methods

  private calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.computeEditDistance(longer.toLowerCase(), shorter.toLowerCase());
    return (longer.length - editDistance) / longer.length;
  }

  private computeEditDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  private validateDosageFormat(dosage: string): { isValid: boolean; format: string } {
    const patterns = [
      { pattern: /^\d+\s*mg$/i, format: 'mg' },
      { pattern: /^\d+\s*ml$/i, format: 'ml' },
      { pattern: /^\d+\s*tablet$/i, format: 'tablet' },
      { pattern: /^\d+\.\d+\s*mg$/i, format: 'decimal_mg' },
      { pattern: /^\d+\s*mg\/\d+\s*ml$/i, format: 'concentration' }
    ];

    for (const { pattern, format } of patterns) {
      if (pattern.test(dosage.trim())) {
        return { isValid: true, format };
      }
    }

    return { isValid: false, format: 'unknown' };
  }

  private extractDosageAmount(dosage: string): number {
    const match = dosage.match(/(\d+(?:\.\d+)?)/);
    return match ? parseFloat(match[1]) : 0;
  }

  private extractDosageUnit(dosage: string): 'mg' | 'ml' | 'tablet' | 'capsule' {
    const lowerDosage = dosage.toLowerCase();
    if (lowerDosage.includes('ml')) return 'ml';
    if (lowerDosage.includes('tablet') || lowerDosage.includes('pil')) return 'tablet';
    if (lowerDosage.includes('capsule') || lowerDosage.includes('kapsul')) return 'capsule';
    return 'mg'; // Default
  }

  private extractDosageForm(dosage: string): 'tablet' | 'liquid' | 'injection' | 'topical' | 'inhaler' | 'capsule' {
    const lowerDosage = dosage.toLowerCase();
    if (lowerDosage.includes('tablet') || lowerDosage.includes('pil')) return 'tablet';
    if (lowerDosage.includes('capsule') || lowerDosage.includes('kapsul')) return 'capsule';
    if (lowerDosage.includes('ml') || lowerDosage.includes('sirap')) return 'liquid';
    if (lowerDosage.includes('injection') || lowerDosage.includes('suntikan')) return 'injection';
    if (lowerDosage.includes('cream') || lowerDosage.includes('krim')) return 'topical';
    if (lowerDosage.includes('inhaler')) return 'inhaler';
    return 'tablet'; // Default
  }
}