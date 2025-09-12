/**
 * Text Recognition Utilities Module Exports
 * 
 * Centralized exports for Malaysian medication text recognition utilities.
 */

export { MalaysianMedicationParser } from './MalaysianMedicationParser';
export { TextQualityAnalyzer } from './TextQualityAnalyzer';
export { LanguageDetector } from './LanguageDetector';

export type {
  MalaysianParsingOptions,
  ParsedMedicationInfo
} from './MalaysianMedicationParser';

export type {
  QualityAnalysisResult,
  QualityIssue
} from './TextQualityAnalyzer';

export type {
  LanguageDetectionResult
} from './LanguageDetector';