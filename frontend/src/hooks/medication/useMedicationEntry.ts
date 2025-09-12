/**
 * Medication Entry Hook
 * 
 * Hook for medication entry functionality with:
 * - Manual medication entry with validation
 * - OCR-assisted entry with user confirmation
 * - Integration with Stream C database services
 * - Cultural validation and suggestions
 * - Form state management and error handling
 */

import { useCallback, useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  searchMedications,
  getAutocompleteSuggestions,
  getMedicationDetails,
  selectSearchResults,
  selectAutocompleteResults,
  selectCulturalPreferences,
  clearSearchResults,
  clearAutocompleteResults,
} from '../../store/slices/medicationSlice';
import { MedicationServices } from '../../services/medication';
import {
  Medication,
  MedicationEntry,
  MedicationDosage,
  MedicationCategory,
  OCRResult,
  MalaysianMedicationInfo,
} from '../../types/medication';
import useMedicationScheduling from './useMedicationScheduling';

interface MedicationFormData {
  name: string;
  genericName: string;
  brandName: string;
  dosage: Partial<MedicationDosage>;
  category: MedicationCategory;
  instructions: string;
  images: string[];
  culturalNotes: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string[]>;
  warnings: Record<string, string[]>;
  suggestions: string[];
}

interface EntryState {
  formData: Partial<MedicationFormData>;
  selectedMedication: MalaysianMedicationInfo | null;
  ocrData: OCRResult | null;
  isValidating: boolean;
  isSubmitting: boolean;
  error: string | null;
  validationResult: ValidationResult | null;
  step: 'search' | 'details' | 'schedule' | 'review' | 'complete';
}

export const useMedicationEntry = () => {
  const dispatch = useAppDispatch();
  const searchResults = useAppSelector(selectSearchResults);
  const autocompleteResults = useAppSelector(selectAutocompleteResults);
  const culturalPreferences = useAppSelector(selectCulturalPreferences);
  const { createSchedule, getScheduleRecommendation } = useMedicationScheduling();

  const [state, setState] = useState<EntryState>({
    formData: {},
    selectedMedication: null,
    ocrData: null,
    isValidating: false,
    isSubmitting: false,
    error: null,
    validationResult: null,
    step: 'search',
  });

  // Initialize empty form
  const initializeForm = useCallback(() => {
    setState(prev => ({
      ...prev,
      formData: {
        name: '',
        genericName: '',
        brandName: '',
        dosage: {
          amount: 0,
          unit: 'mg',
          form: 'tablet',
        },
        category: 'prescription',
        instructions: '',
        images: [],
        culturalNotes: '',
      },
      step: 'search',
      error: null,
      validationResult: null,
    }));
  }, []);

  // Search medications in database
  const searchMedicationDatabase = useCallback(async (query: string) => {
    if (query.length < 2) {
      dispatch(clearSearchResults());
      return;
    }

    try {
      await dispatch(searchMedications({
        query,
        options: {
          halalOnly: culturalPreferences.halalOnly,
          language: culturalPreferences.language,
          limit: 10,
        },
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Failed to search medication database',
      }));
    }
  }, [dispatch, culturalPreferences]);

  // Get autocomplete suggestions
  const getAutocompleteSuggestions = useCallback(async (query: string) => {
    if (query.length < 2) {
      dispatch(clearAutocompleteResults());
      return;
    }

    try {
      await dispatch(getAutocompleteSuggestions({
        query,
        options: {
          halalOnly: culturalPreferences.halalOnly,
          language: culturalPreferences.language,
        },
      }));
    } catch (error) {
      // Silently handle autocomplete errors
    }
  }, [dispatch, culturalPreferences]);

  // Select medication from search results
  const selectMedication = useCallback(async (medication: MalaysianMedicationInfo) => {
    setState(prev => ({
      ...prev,
      selectedMedication: medication,
      isValidating: true,
    }));

    try {
      // Get detailed medication information
      const details = await dispatch(getMedicationDetails({
        medicationId: medication.id,
        options: {
          includeCulturalInfo: true,
          language: culturalPreferences.language,
        },
      }));

      // Pre-populate form with selected medication data
      setState(prev => ({
        ...prev,
        formData: {
          ...prev.formData,
          name: medication.name,
          genericName: medication.genericName,
          brandName: medication.brandNames[0] || '',
          category: medication.availability === 'prescription' ? 'prescription' : 'otc',
        },
        step: 'details',
        isValidating: false,
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: 'Failed to load medication details',
        isValidating: false,
      }));
    }
  }, [dispatch, culturalPreferences]);

  // Process OCR results for medication entry
  const processOCRData = useCallback((ocrData: OCRResult) => {
    setState(prev => ({
      ...prev,
      ocrData,
      isValidating: true,
    }));

    // Extract medication information from OCR
    const extractedData: Partial<MedicationFormData> = {
      name: ocrData.medicationName || '',
      instructions: ocrData.instructions || '',
      dosage: parseDosageFromOCR(ocrData.dosageInfo || ''),
    };

    // Auto-search based on OCR medication name
    if (ocrData.medicationName) {
      searchMedicationDatabase(ocrData.medicationName);
    }

    setState(prev => ({
      ...prev,
      formData: { ...prev.formData, ...extractedData },
      isValidating: false,
      step: 'details',
    }));
  }, [searchMedicationDatabase]);

  // Update form data
  const updateFormData = useCallback((updates: Partial<MedicationFormData>) => {
    setState(prev => ({
      ...prev,
      formData: { ...prev.formData, ...updates },
    }));
  }, []);

  // Validate medication form
  const validateForm = useCallback((formData: Partial<MedicationFormData>): ValidationResult => {
    const errors: Record<string, string[]> = {};
    const warnings: Record<string, string[]> = {};
    const suggestions: string[] = [];

    // Required field validation
    if (!formData.name?.trim()) {
      errors.name = ['Medication name is required'];
    }

    if (!formData.dosage?.amount || formData.dosage.amount <= 0) {
      errors.dosage = ['Valid dosage amount is required'];
    }

    if (!formData.dosage?.unit) {
      errors.dosage = [...(errors.dosage || []), 'Dosage unit is required'];
    }

    if (!formData.dosage?.form) {
      errors.dosage = [...(errors.dosage || []), 'Medication form is required'];
    }

    // Cultural validation
    if (culturalPreferences.halalOnly && state.selectedMedication) {
      // Check if medication is halal-certified
      // This would normally check against the medication database
      warnings.cultural = ['Please verify halal certification with your pharmacist'];
    }

    // Language-specific suggestions
    if (culturalPreferences.language === 'ms') {
      suggestions.push('Arahan dalam Bahasa Malaysia boleh didapati dari farmasi');
    }

    // Dosage validation
    if (formData.dosage?.amount && formData.dosage.amount > 1000) {
      warnings.dosage = ['High dosage amount - please verify with healthcare provider'];
    }

    // Category validation
    if (formData.category === 'prescription' && !state.selectedMedication) {
      warnings.category = ['Prescription medications should be verified in database'];
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
      warnings,
      suggestions,
    };
  }, [culturalPreferences, state.selectedMedication]);

  // Submit medication entry
  const submitMedication = useCallback(async () => {
    const validation = validateForm(state.formData);
    
    setState(prev => ({
      ...prev,
      validationResult: validation,
    }));

    if (!validation.isValid) {
      return { success: false, error: 'Form validation failed' };
    }

    setState(prev => ({ ...prev, isSubmitting: true, error: null }));

    try {
      // Create medication object
      const medication: Partial<Medication> = {
        name: state.formData.name || '',
        genericName: state.formData.genericName || '',
        brandName: state.formData.brandName || '',
        dosage: state.formData.dosage as MedicationDosage,
        category: state.formData.category || 'prescription',
        images: state.formData.images || [],
        ocrData: state.ocrData || undefined,
        cultural: {
          takeWithFood: false,
          avoidDuringFasting: culturalPreferences.observesRamadan,
          prayerTimeConsiderations: [],
          culturalNotes: state.formData.culturalNotes,
        },
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // Save medication using API service
      const result = await MedicationServices.saveMedication(medication);

      if (result.success) {
        setState(prev => ({
          ...prev,
          isSubmitting: false,
          step: 'complete',
        }));
        
        return { success: true, medication: result.data };
      } else {
        throw new Error(result.error || 'Failed to save medication');
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to save medication',
        isSubmitting: false,
      }));
      
      return { success: false, error: state.error };
    }
  }, [state, validateForm, culturalPreferences]);

  // Navigate to next step
  const nextStep = useCallback(() => {
    const stepOrder: EntryState['step'][] = ['search', 'details', 'schedule', 'review', 'complete'];
    const currentIndex = stepOrder.indexOf(state.step);
    
    if (currentIndex < stepOrder.length - 1) {
      setState(prev => ({
        ...prev,
        step: stepOrder[currentIndex + 1],
      }));
    }
  }, [state.step]);

  // Navigate to previous step
  const previousStep = useCallback(() => {
    const stepOrder: EntryState['step'][] = ['search', 'details', 'schedule', 'review', 'complete'];
    const currentIndex = stepOrder.indexOf(state.step);
    
    if (currentIndex > 0) {
      setState(prev => ({
        ...prev,
        step: stepOrder[currentIndex - 1],
      }));
    }
  }, [state.step]);

  // Reset form
  const resetForm = useCallback(() => {
    setState({
      formData: {},
      selectedMedication: null,
      ocrData: null,
      isValidating: false,
      isSubmitting: false,
      error: null,
      validationResult: null,
      step: 'search',
    });
    dispatch(clearSearchResults());
    dispatch(clearAutocompleteResults());
  }, [dispatch]);

  // Helper function to parse dosage from OCR text
  const parseDosageFromOCR = (dosageText: string): Partial<MedicationDosage> => {
    // Simple regex patterns for common dosage formats
    const amountMatch = dosageText.match(/(\d+(?:\.\d+)?)\s*(mg|ml|tablet|capsule)/i);
    const formMatch = dosageText.match(/(tablet|liquid|injection|topical|inhaler|capsule)/i);

    return {
      amount: amountMatch ? parseFloat(amountMatch[1]) : 0,
      unit: (amountMatch?.[2]?.toLowerCase() as MedicationDosage['unit']) || 'mg',
      form: (formMatch?.[1]?.toLowerCase() as MedicationDosage['form']) || 'tablet',
    };
  };

  // Auto-validate form when data changes
  useEffect(() => {
    if (state.step === 'details' || state.step === 'review') {
      const validation = validateForm(state.formData);
      setState(prev => ({
        ...prev,
        validationResult: validation,
      }));
    }
  }, [state.formData, state.step, validateForm]);

  return {
    // State
    ...state,
    searchResults,
    autocompleteResults,
    culturalPreferences,

    // Actions
    initializeForm,
    searchMedicationDatabase,
    getAutocompleteSuggestions: getAutocompleteSuggestions,
    selectMedication,
    processOCRData,
    updateFormData,
    submitMedication,
    nextStep,
    previousStep,
    resetForm,

    // Utilities
    validateForm,
  };
};

export default useMedicationEntry;