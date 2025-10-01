/**
 * Localization Utilities Index
 * 
 * Central export for all localization utilities including cultural formatters,
 * RTL support, and Malaysian healthcare-specific formatting functions.
 */

// Core Utilities
export { default as CulturalFormatters } from './formatters/CulturalFormatters';
export { default as RtlSupport } from './rtl/RtlSupport';

// Re-export types for convenience
export type {
  MedicationInstruction,
  CulturalDateTimeOptions,
  FormattingContext,
} from './formatters/CulturalFormatters';

// Quick utility functions for common operations
export const formatMalaysianPhone = (phone: string): string => {
  return CulturalFormatters.formatMalaysianPhoneNumber(phone);
};

export const formatMalaysianCurrency = (
  amount: number, 
  language: 'en' | 'ms' | 'zh' | 'ta' = 'en'
): string => {
  return CulturalFormatters.formatCurrency(amount, language);
};

export const detectRtlText = (text: string) => {
  return RtlSupport.detectRtlContent(text);
};

export const formatMedicationInstruction = (
  instruction: any,
  context: any
): string => {
  return CulturalFormatters.formatMedicationInstructions(instruction, context);
};

export default {
  CulturalFormatters,
  RtlSupport,
  formatMalaysianPhone,
  formatMalaysianCurrency,
  detectRtlText,
  formatMedicationInstruction,
};