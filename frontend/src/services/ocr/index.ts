/**
 * OCR Services Module Exports
 * 
 * Centralized exports for all OCR-related services and utilities
 * for Malaysian medication recognition.
 */

export { OCRService } from './OCRService';
export { OCRIntegrationService } from './OCRIntegrationService';

export type {
  OCROptions,
  OCRProcessingStats
} from './OCRService';

export type {
  OCRIntegrationOptions,
  IntegratedOCRResult
} from './OCRIntegrationService';