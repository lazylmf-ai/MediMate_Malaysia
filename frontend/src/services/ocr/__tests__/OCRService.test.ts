/**
 * OCR Service Tests
 * 
 * Comprehensive tests for Malaysian medication OCR functionality
 * including accuracy validation and cultural pattern recognition.
 */

import { OCRService } from '../OCRService';
import { CapturedImage, OCRResult } from '../../../types/medication';

// Mock the ML Kit text recognition module
jest.mock('@react-native-ml-kit/text-recognition', () => ({
  __esModule: true,
  default: {
    recognize: jest.fn()
  }
}));

// Mock the utility modules
jest.mock('../../../utils/text-recognition/MalaysianMedicationParser', () => ({
  MalaysianMedicationParser: {
    getInstance: jest.fn(() => ({
      parseMedicationText: jest.fn()
    }))
  }
}));

jest.mock('../../../utils/text-recognition/TextQualityAnalyzer', () => ({
  TextQualityAnalyzer: {
    getInstance: jest.fn(() => ({
      analyzeRecognitionResult: jest.fn()
    }))
  }
}));

jest.mock('../../../utils/text-recognition/LanguageDetector', () => ({
  LanguageDetector: {
    getInstance: jest.fn(() => ({
      detectLanguage: jest.fn()
    }))
  }
}));

describe('OCRService', () => {
  let ocrService: OCRService;
  let mockImage: CapturedImage;

  beforeEach(() => {
    ocrService = OCRService.getInstance();
    mockImage = {
      uri: 'file://test-image.jpg',
      width: 1200,
      height: 800,
      fileSize: 500000,
      format: 'jpg',
      quality: 0.8
    };

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = OCRService.getInstance();
      const instance2 = OCRService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('extractMedicationInfo', () => {
    it('should successfully extract medication information from clear text', async () => {
      // Mock successful ML Kit recognition
      const mockMLKitResult = {
        text: 'PARACETAMOL 500mg\nTake 1 tablet twice daily\nPharmaniaga Berhad',
        blocks: [
          {
            lines: [
              {
                elements: [
                  { text: 'PARACETAMOL', confidence: 95 },
                  { text: '500mg', confidence: 90 }
                ]
              }
            ]
          }
        ]
      };

      const TextRecognition = require('@react-native-ml-kit/text-recognition').default;
      TextRecognition.recognize.mockResolvedValue(mockMLKitResult);

      // Mock parser result
      const mockParserResult = {
        name: 'PARACETAMOL',
        dosage: '500mg',
        instructions: 'Take 1 tablet twice daily',
        confidence: { name: 0.95, dosage: 0.9, instructions: 0.85, overall: 0.9 }
      };

      const { MalaysianMedicationParser } = require('../../../utils/text-recognition/MalaysianMedicationParser');
      MalaysianMedicationParser.getInstance().parseMedicationText.mockResolvedValue(mockParserResult);

      // Mock quality analyzer result
      const { TextQualityAnalyzer } = require('../../../utils/text-recognition/TextQualityAnalyzer');
      TextQualityAnalyzer.getInstance().analyzeRecognitionResult.mockResolvedValue({
        score: 85,
        issues: []
      });

      // Mock language detector result
      const { LanguageDetector } = require('../../../utils/text-recognition/LanguageDetector');
      LanguageDetector.getInstance().detectLanguage.mockResolvedValue('en');

      const result = await ocrService.extractMedicationInfo(mockImage);

      expect(result).toBeDefined();
      expect(result.medicationName).toBe('PARACETAMOL');
      expect(result.dosageInfo).toBe('500mg');
      expect(result.instructions).toBe('Take 1 tablet twice daily');
      expect(result.language).toBe('en');
      expect(result.confidence).toBeGreaterThan(0.8);
      expect(result.imageQuality).toBe('excellent');
    });

    it('should handle Malaysian medication with Bahasa Malaysia text', async () => {
      const mockMLKitResult = {
        text: 'UBAT BATUK\nSirap 100ml\nAmbil 1 sudu teh 3 kali sehari\nHOVID BERHAD',
        blocks: [
          {
            lines: [
              {
                elements: [
                  { text: 'UBAT', confidence: 85 },
                  { text: 'BATUK', confidence: 88 }
                ]
              }
            ]
          }
        ]
      };

      const TextRecognition = require('@react-native-ml-kit/text-recognition').default;
      TextRecognition.recognize.mockResolvedValue(mockMLKitResult);

      const mockParserResult = {
        name: 'UBAT BATUK',
        dosage: '100ml',
        instructions: 'Ambil 1 sudu teh 3 kali sehari',
        manufacturer: 'HOVID BERHAD',
        confidence: { name: 0.86, dosage: 0.8, instructions: 0.9, overall: 0.85 }
      };

      const { MalaysianMedicationParser } = require('../../../utils/text-recognition/MalaysianMedicationParser');
      MalaysianMedicationParser.getInstance().parseMedicationText.mockResolvedValue(mockParserResult);

      const { LanguageDetector } = require('../../../utils/text-recognition/LanguageDetector');
      LanguageDetector.getInstance().detectLanguage.mockResolvedValue('ms');

      const { TextQualityAnalyzer } = require('../../../utils/text-recognition/TextQualityAnalyzer');
      TextQualityAnalyzer.getInstance().analyzeRecognitionResult.mockResolvedValue({
        score: 80,
        issues: []
      });

      const result = await ocrService.extractMedicationInfo(mockImage, {
        culturalContext: { malayContent: true }
      });

      expect(result.medicationName).toBe('UBAT BATUK');
      expect(result.language).toBe('ms');
      expect(result.instructions).toContain('Ambil');
    });

    it('should handle mixed language text', async () => {
      const mockMLKitResult = {
        text: 'PARACETAMOL 500mg\nAmbil 1 tablet sehari\nTake with food\n丸剂',
        blocks: [
          {
            lines: [
              {
                elements: [
                  { text: 'PARACETAMOL', confidence: 90 },
                  { text: '丸剂', confidence: 75 }
                ]
              }
            ]
          }
        ]
      };

      const TextRecognition = require('@react-native-ml-kit/text-recognition').default;
      TextRecognition.recognize.mockResolvedValue(mockMLKitResult);

      const { LanguageDetector } = require('../../../utils/text-recognition/LanguageDetector');
      LanguageDetector.getInstance().detectLanguage.mockResolvedValue('mixed');

      const { MalaysianMedicationParser } = require('../../../utils/text-recognition/MalaysianMedicationParser');
      MalaysianMedicationParser.getInstance().parseMedicationText.mockResolvedValue({
        name: 'PARACETAMOL',
        dosage: '500mg',
        confidence: { overall: 0.8 }
      });

      const { TextQualityAnalyzer } = require('../../../utils/text-recognition/TextQualityAnalyzer');
      TextQualityAnalyzer.getInstance().analyzeRecognitionResult.mockResolvedValue({
        score: 75,
        issues: []
      });

      const result = await ocrService.extractMedicationInfo(mockImage, {
        culturalContext: {
          malayContent: true,
          chineseContent: true
        }
      });

      expect(result.language).toBe('mixed');
    });

    it('should handle low quality images gracefully', async () => {
      const mockMLKitResult = {
        text: 'blurred text', // Simulated poor OCR result
        blocks: [
          {
            lines: [
              {
                elements: [
                  { text: 'blurred', confidence: 30 },
                  { text: 'text', confidence: 25 }
                ]
              }
            ]
          }
        ]
      };

      const TextRecognition = require('@react-native-ml-kit/text-recognition').default;
      TextRecognition.recognize.mockResolvedValue(mockMLKitResult);

      const { MalaysianMedicationParser } = require('../../../utils/text-recognition/MalaysianMedicationParser');
      MalaysianMedicationParser.getInstance().parseMedicationText.mockResolvedValue({
        confidence: { overall: 0.3 }
      });

      const { TextQualityAnalyzer } = require('../../../utils/text-recognition/TextQualityAnalyzer');
      TextQualityAnalyzer.getInstance().analyzeRecognitionResult.mockResolvedValue({
        score: 25,
        issues: [
          { type: 'low_confidence', severity: 'high', description: 'Very low confidence' }
        ]
      });

      const { LanguageDetector } = require('../../../utils/text-recognition/LanguageDetector');
      LanguageDetector.getInstance().detectLanguage.mockResolvedValue('en');

      const result = await ocrService.extractMedicationInfo(mockImage);

      expect(result.confidence).toBeLessThan(0.5);
      expect(result.imageQuality).toBe('poor');
    });

    it('should handle ML Kit recognition failures', async () => {
      const TextRecognition = require('@react-native-ml-kit/text-recognition').default;
      TextRecognition.recognize.mockRejectedValue(new Error('ML Kit failed'));

      const result = await ocrService.extractMedicationInfo(mockImage);

      expect(result.confidence).toBe(0);
      expect(result.extractedText).toBe('');
      expect(result.imageQuality).toBe('poor');
    });
  });

  describe('batchProcessImages', () => {
    it('should process multiple images successfully', async () => {
      const images: CapturedImage[] = [
        { ...mockImage, uri: 'file://image1.jpg' },
        { ...mockImage, uri: 'file://image2.jpg' },
        { ...mockImage, uri: 'file://image3.jpg' }
      ];

      // Mock successful processing for all images
      const TextRecognition = require('@react-native-ml-kit/text-recognition').default;
      TextRecognition.recognize
        .mockResolvedValueOnce({ text: 'PARACETAMOL', blocks: [] })
        .mockResolvedValueOnce({ text: 'ASPIRIN', blocks: [] })
        .mockResolvedValueOnce({ text: 'IBUPROFEN', blocks: [] });

      const { MalaysianMedicationParser } = require('../../../utils/text-recognition/MalaysianMedicationParser');
      MalaysianMedicationParser.getInstance().parseMedicationText
        .mockResolvedValueOnce({ name: 'PARACETAMOL', confidence: { overall: 0.9 } })
        .mockResolvedValueOnce({ name: 'ASPIRIN', confidence: { overall: 0.85 } })
        .mockResolvedValueOnce({ name: 'IBUPROFEN', confidence: { overall: 0.8 } });

      const { TextQualityAnalyzer } = require('../../../utils/text-recognition/TextQualityAnalyzer');
      TextQualityAnalyzer.getInstance().analyzeRecognitionResult
        .mockResolvedValue({ score: 80, issues: [] });

      const { LanguageDetector } = require('../../../utils/text-recognition/LanguageDetector');
      LanguageDetector.getInstance().detectLanguage
        .mockResolvedValue('en');

      const results = await ocrService.batchProcessImages(images);

      expect(results).toHaveLength(3);
      expect(results[0].medicationName).toBe('PARACETAMOL');
      expect(results[1].medicationName).toBe('ASPIRIN');
      expect(results[2].medicationName).toBe('IBUPROFEN');
    });

    it('should handle partial failures in batch processing', async () => {
      const images: CapturedImage[] = [
        { ...mockImage, uri: 'file://image1.jpg' },
        { ...mockImage, uri: 'file://image2.jpg' }
      ];

      const TextRecognition = require('@react-native-ml-kit/text-recognition').default;
      TextRecognition.recognize
        .mockResolvedValueOnce({ text: 'PARACETAMOL', blocks: [] })
        .mockRejectedValueOnce(new Error('Failed'));

      const { MalaysianMedicationParser } = require('../../../utils/text-recognition/MalaysianMedicationParser');
      MalaysianMedicationParser.getInstance().parseMedicationText
        .mockResolvedValueOnce({ name: 'PARACETAMOL', confidence: { overall: 0.9 } });

      const { TextQualityAnalyzer } = require('../../../utils/text-recognition/TextQualityAnalyzer');
      TextQualityAnalyzer.getInstance().analyzeRecognitionResult
        .mockResolvedValue({ score: 80, issues: [] });

      const { LanguageDetector } = require('../../../utils/text-recognition/LanguageDetector');
      LanguageDetector.getInstance().detectLanguage
        .mockResolvedValue('en');

      const results = await ocrService.batchProcessImages(images);

      expect(results).toHaveLength(2);
      expect(results[0].medicationName).toBe('PARACETAMOL');
      expect(results[1].confidence).toBe(0); // Failed processing
    });
  });

  describe('validateOCRResult', () => {
    it('should validate against known medications list', async () => {
      const ocrResult: OCRResult = {
        confidence: 0.9,
        extractedText: 'PARACETAMOL 500mg',
        medicationName: 'PARACETAMOL',
        dosageInfo: '500mg',
        language: 'en',
        boundingBoxes: [],
        processingTime: 1000,
        imageQuality: 'good'
      };

      const knownMedications = ['Paracetamol', 'Aspirin', 'Ibuprofen'];

      const validation = await ocrService.validateOCRResult(ocrResult, knownMedications);

      expect(validation.isValid).toBe(true);
      expect(validation.validationScore).toBeGreaterThan(0.8);
      expect(validation.issues).toHaveLength(0);
    });

    it('should suggest similar medications for partial matches', async () => {
      const ocrResult: OCRResult = {
        confidence: 0.8,
        extractedText: 'PARACETMOL', // Typo
        medicationName: 'PARACETMOL',
        language: 'en',
        boundingBoxes: [],
        processingTime: 1000,
        imageQuality: 'good'
      };

      const knownMedications = ['Paracetamol', 'Aspirin', 'Ibuprofen'];

      const validation = await ocrService.validateOCRResult(ocrResult, knownMedications);

      expect(validation.isValid).toBe(true); // Should still be valid due to similarity
      expect(validation.suggestions).toContain('Paracetamol');
    });

    it('should identify invalid dosage formats', async () => {
      const ocrResult: OCRResult = {
        confidence: 0.8,
        extractedText: 'PARACETAMOL abc123',
        medicationName: 'PARACETAMOL',
        dosageInfo: 'abc123', // Invalid dosage format
        language: 'en',
        boundingBoxes: [],
        processingTime: 1000,
        imageQuality: 'good'
      };

      const validation = await ocrService.validateOCRResult(ocrResult);

      expect(validation.issues).toContain('Dosage format appears incorrect');
      expect(validation.validationScore).toBeLessThan(0.8);
    });
  });

  describe('Error Handling', () => {
    it('should handle empty image gracefully', async () => {
      const emptyImage: CapturedImage = {
        ...mockImage,
        uri: ''
      };

      const TextRecognition = require('@react-native-ml-kit/text-recognition').default;
      TextRecognition.recognize.mockRejectedValue(new Error('Empty image'));

      const result = await ocrService.extractMedicationInfo(emptyImage);

      expect(result.confidence).toBe(0);
      expect(result.extractedText).toBe('');
    });

    it('should handle corrupted image data', async () => {
      const TextRecognition = require('@react-native-ml-kit/text-recognition').default;
      TextRecognition.recognize.mockRejectedValue(new Error('Corrupted image'));

      const result = await ocrService.extractMedicationInfo(mockImage);

      expect(result.confidence).toBe(0);
      expect(result.imageQuality).toBe('poor');
    });
  });

  describe('Performance Tests', () => {
    it('should complete processing within reasonable time', async () => {
      const TextRecognition = require('@react-native-ml-kit/text-recognition').default;
      TextRecognition.recognize.mockResolvedValue({
        text: 'PARACETAMOL 500mg',
        blocks: []
      });

      const { MalaysianMedicationParser } = require('../../../utils/text-recognition/MalaysianMedicationParser');
      MalaysianMedicationParser.getInstance().parseMedicationText.mockResolvedValue({
        confidence: { overall: 0.9 }
      });

      const { TextQualityAnalyzer } = require('../../../utils/text-recognition/TextQualityAnalyzer');
      TextQualityAnalyzer.getInstance().analyzeRecognitionResult.mockResolvedValue({
        score: 80,
        issues: []
      });

      const { LanguageDetector } = require('../../../utils/text-recognition/LanguageDetector');
      LanguageDetector.getInstance().detectLanguage.mockResolvedValue('en');

      const startTime = Date.now();
      const result = await ocrService.extractMedicationInfo(mockImage);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(result.processingTime).toBeGreaterThan(0);
    });
  });
});