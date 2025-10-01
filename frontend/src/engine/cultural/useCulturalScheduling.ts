/**
 * Cultural Scheduling Hook
 * 
 * Enhanced scheduling engine hook that provides comprehensive cultural intelligence
 * for medication scheduling. Integrates all Stream D services with existing
 * prayer time system (Stream A) and multi-language support (Stream C).
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { selectCulturalProfile, selectUserLocation } from '../../store/slices/culturalSlice';
import { selectCurrentMedication } from '../../store/slices/medicationSlice';
import { 
  culturalSchedulingEngine,
  malaysianMealPatterns,
  traditionalMedicineIntegration,
  familySchedulingCoordination,
  culturalDietaryRestrictions,
  schedulingUtils,
  type CulturalSchedulingResult,
  type MealTimingPattern,
  type IntegrationAssessment,
  type DietaryComplianceResult
} from '../../services/scheduling';
import { usePrayerScheduling } from '../../hooks/prayer';
import { useTranslation } from '../../i18n/hooks/useTranslation';
import { Medication } from '../../types/medication';
import { EnhancedCulturalProfile } from '../../types/cultural';

interface CulturalSchedulingState {
  isLoading: boolean;
  error: string | null;
  culturalSchedule: CulturalSchedulingResult | null;
  mealPatterns: MealTimingPattern | null;
  dietaryCompliance: DietaryComplianceResult | null;
  traditionalMedicineAssessment: IntegrationAssessment | null;
  currentOptimalTime: {
    isOptimal: boolean;
    period: string;
    nextOptimalTime: string;
    culturalNotes: string[];
  };
}

interface CulturalSchedulingOptions {
  includeTraditionalMedicine?: boolean;
  includeFamilyCoordination?: boolean;
  includeDietaryRestrictions?: boolean;
  includePrayerTimes?: boolean;
  includeRamadanAdjustments?: boolean;
  traditionalMedicines?: string[];
  familyMembers?: any[];
}

export const useCulturalScheduling = (
  medications?: Medication[],
  options: CulturalSchedulingOptions = {}
) => {
  const dispatch = useAppDispatch();
  const culturalProfile = useAppSelector(selectCulturalProfile);
  const userLocation = useAppSelector(selectUserLocation);
  const currentMedication = useAppSelector(selectCurrentMedication);
  
  // Integration with Stream A (Prayer Times)
  const {
    optimizeSchedule: optimizePrayerSchedule,
    isCurrentlyAvoidableTime,
    config: prayerConfig
  } = usePrayerScheduling({
    enabled: options.includePrayerTimes !== false && culturalProfile?.preferences?.prayerTimes?.enabled,
    location: userLocation
  });

  // Integration with Stream C (Multi-language)
  const { t, translateMedical, currentLanguage } = useTranslation();

  // State management
  const [state, setState] = useState<CulturalSchedulingState>({
    isLoading: false,
    error: null,
    culturalSchedule: null,
    mealPatterns: null,
    dietaryCompliance: null,
    traditionalMedicineAssessment: null,
    currentOptimalTime: {
      isOptimal: true,
      period: 'unknown',
      nextOptimalTime: '08:00',
      culturalNotes: []
    }
  });

  // Memoized meal patterns based on cultural profile
  const personalizedMealPatterns = useMemo(() => {
    if (!culturalProfile) return null;
    
    try {
      return malaysianMealPatterns.getPersonalizedMealPattern(culturalProfile);
    } catch (error) {
      console.error('Failed to get personalized meal patterns:', error);
      return null;
    }
  }, [culturalProfile]);

  // Check current optimal timing
  const checkCurrentOptimalTiming = useCallback(async () => {
    if (!culturalProfile) return;

    try {
      const currentTime = new Date();
      const optimalTime = await schedulingUtils.isOptimalMedicationTime(
        currentTime,
        culturalProfile
      );

      // Add cultural context
      const culturalNotes: string[] = [...optimalTime.notes];
      
      // Add prayer time context if enabled
      if (options.includePrayerTimes !== false && culturalProfile.preferences?.prayerTimes?.enabled) {
        const isPrayerTime = await isCurrentlyAvoidableTime();
        if (isPrayerTime) {
          culturalNotes.push(t('scheduling.prayer_time_avoid'));
          optimalTime.isOptimal = false;
        }
      }

      setState(prev => ({
        ...prev,
        currentOptimalTime: {
          ...optimalTime,
          culturalNotes
        }
      }));
    } catch (error) {
      console.error('Failed to check optimal timing:', error);
    }
  }, [culturalProfile, options.includePrayerTimes, isCurrentlyAvoidableTime, t]);

  // Generate comprehensive cultural schedule
  const generateCulturalSchedule = useCallback(async (
    targetMedications?: Medication[]
  ): Promise<CulturalSchedulingResult | null> => {
    const medsToSchedule = targetMedications || medications || (currentMedication ? [currentMedication] : []);
    
    if (!culturalProfile || medsToSchedule.length === 0) {
      return null;
    }

    setState(prev => ({ ...prev, isLoading: true, error: null }));

    try {
      // Build family context
      const familyContext = {
        elderlyMembers: options.familyMembers?.filter(m => m.age >= 65) || [],
        children: options.familyMembers?.filter(m => m.age < 18) || [],
        primaryCaregiver: {
          availability: [{ start: '07:00', end: '22:00' }],
          culturalRole: culturalProfile.preferences?.family?.primaryCaregiver ? 'caregiver' : 'parent'
        },
        householdRoutines: {
          wakingTime: '07:00',
          sleepTime: '22:00',
          mealTimes: personalizedMealPatterns?.pattern || malaysianMealPatterns.getMealPattern('mixed').pattern,
          prayerParticipation: culturalProfile.preferences?.prayerTimes?.enabled || false
        }
      };

      // Generate cultural schedule
      const culturalSchedule = await culturalSchedulingEngine.generateCulturalSchedule(
        medsToSchedule,
        culturalProfile,
        familyContext
      );

      setState(prev => ({ 
        ...prev, 
        culturalSchedule,
        isLoading: false 
      }));

      return culturalSchedule;

    } catch (error) {
      console.error('Cultural scheduling generation failed:', error);
      setState(prev => ({ 
        ...prev, 
        error: error instanceof Error ? error.message : 'Cultural scheduling failed',
        isLoading: false 
      }));
      
      return null;
    }
  }, [medications, currentMedication, culturalProfile, personalizedMealPatterns, options.familyMembers]);

  // Assess dietary compliance
  const assessDietaryCompliance = useCallback(async (
    targetMedications?: Medication[]
  ): Promise<DietaryComplianceResult | null> => {
    if (!options.includeDietaryRestrictions || !culturalProfile) return null;

    const medsToCheck = targetMedications || medications || (currentMedication ? [currentMedication] : []);
    if (medsToCheck.length === 0) return null;

    try {
      const compliance = culturalDietaryRestrictions.assessDietaryCompliance(
        medsToCheck,
        culturalProfile
      );

      setState(prev => ({ ...prev, dietaryCompliance: compliance }));
      return compliance;

    } catch (error) {
      console.error('Dietary compliance assessment failed:', error);
      return null;
    }
  }, [medications, currentMedication, culturalProfile, options.includeDietaryRestrictions]);

  // Assess traditional medicine integration
  const assessTraditionalMedicine = useCallback(async (
    targetMedications?: Medication[]
  ): Promise<IntegrationAssessment | null> => {
    if (!options.includeTraditionalMedicine || !options.traditionalMedicines?.length || !culturalProfile) {
      return null;
    }

    const medsToCheck = targetMedications || medications || (currentMedication ? [currentMedication] : []);
    if (medsToCheck.length === 0) return null;

    try {
      const assessment = traditionalMedicineIntegration.assessIntegrationSafety(
        medsToCheck,
        options.traditionalMedicines,
        culturalProfile
      );

      setState(prev => ({ ...prev, traditionalMedicineAssessment: assessment }));
      return assessment;

    } catch (error) {
      console.error('Traditional medicine assessment failed:', error);
      return null;
    }
  }, [medications, currentMedication, culturalProfile, options.includeTraditionalMedicine, options.traditionalMedicines]);

  // Get meal timing recommendations
  const getMealTimingRecommendations = useCallback((medication: Medication) => {
    if (!culturalProfile) return [];
    
    return schedulingUtils.getMealTimingRecommendations(medication, culturalProfile);
  }, [culturalProfile]);

  // Check if medication is culturally compliant
  const checkCulturalCompliance = useCallback(async (medication: Medication) => {
    if (!culturalProfile) return { isCompliant: true, issues: [], solutions: [] };
    
    return await schedulingUtils.checkDietaryCompliance(medication, culturalProfile);
  }, [culturalProfile]);

  // Get traditional medicine warnings
  const getTraditionalMedicineWarnings = useCallback(async (
    medication: Medication,
    traditionalMedicines: string[]
  ) => {
    if (!culturalProfile) return { safetyLevel: 'unknown', warnings: [] };
    
    return await schedulingUtils.getTraditionalMedicineWarnings(
      medication, 
      traditionalMedicines, 
      culturalProfile
    );
  }, [culturalProfile]);

  // Translate scheduling recommendations
  const translateSchedulingRecommendation = useCallback(async (
    recommendation: string
  ): Promise<string> => {
    try {
      if (currentLanguage === 'en') return recommendation;
      
      return await translateMedical(recommendation, 'scheduling') || recommendation;
    } catch (error) {
      console.error('Translation failed:', error);
      return recommendation;
    }
  }, [currentLanguage, translateMedical]);

  // Get culturally appropriate scheduling windows
  const getCulturalSchedulingWindows = useCallback(() => {
    if (!culturalProfile || !personalizedMealPatterns) return [];

    const now = new Date();
    const windows = [];

    // Morning window (after breakfast)
    if (personalizedMealPatterns.pattern.breakfast) {
      const breakfastEnd = personalizedMealPatterns.pattern.breakfast.end;
      windows.push({
        start: breakfastEnd,
        end: personalizedMealPatterns.pattern.lunch?.start || '12:00',
        type: 'morning',
        culturalNotes: personalizedMealPatterns.culturalNotes.filter(note => 
          note.toLowerCase().includes('morning') || note.toLowerCase().includes('breakfast')
        )
      });
    }

    // Afternoon window (after lunch)
    if (personalizedMealPatterns.pattern.lunch) {
      const lunchEnd = personalizedMealPatterns.pattern.lunch.end;
      windows.push({
        start: lunchEnd,
        end: personalizedMealPatterns.pattern.dinner?.start || '19:00',
        type: 'afternoon',
        culturalNotes: personalizedMealPatterns.culturalNotes.filter(note => 
          note.toLowerCase().includes('lunch') || note.toLowerCase().includes('afternoon')
        )
      });
    }

    // Evening window (after dinner)
    if (personalizedMealPatterns.pattern.dinner) {
      const dinnerEnd = personalizedMealPatterns.pattern.dinner.end;
      windows.push({
        start: dinnerEnd,
        end: '22:00',
        type: 'evening',
        culturalNotes: personalizedMealPatterns.culturalNotes.filter(note => 
          note.toLowerCase().includes('dinner') || note.toLowerCase().includes('evening')
        )
      });
    }

    return windows;
  }, [culturalProfile, personalizedMealPatterns]);

  // Optimize schedule with prayer times integration
  const optimizeScheduleWithPrayerTimes = useCallback(async (
    medicationTimes: Date[]
  ) => {
    if (!options.includePrayerTimes || !culturalProfile?.preferences?.prayerTimes?.enabled) {
      return medicationTimes;
    }

    try {
      const optimizedSchedule = await optimizePrayerSchedule(medicationTimes);
      return optimizedSchedule?.optimizedTimes || medicationTimes;
    } catch (error) {
      console.error('Prayer time optimization failed:', error);
      return medicationTimes;
    }
  }, [options.includePrayerTimes, culturalProfile, optimizePrayerSchedule]);

  // Check for Ramadan adjustments
  const checkRamadanAdjustments = useCallback(async () => {
    if (!options.includeRamadanAdjustments || !culturalProfile) return null;

    try {
      const ramadanAnalysis = culturalDietaryRestrictions.analyzeFastingImpact(
        medications || (currentMedication ? [currentMedication] : []),
        'ramadan',
        culturalProfile
      );

      return ramadanAnalysis;
    } catch (error) {
      console.error('Ramadan adjustment check failed:', error);
      return null;
    }
  }, [options.includeRamadanAdjustments, culturalProfile, medications, currentMedication]);

  // Initialize and update current optimal timing
  useEffect(() => {
    checkCurrentOptimalTiming();
    
    // Update every 15 minutes
    const interval = setInterval(checkCurrentOptimalTiming, 15 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [checkCurrentOptimalTiming]);

  // Auto-assess dietary compliance when medications or profile changes
  useEffect(() => {
    if (options.includeDietaryRestrictions) {
      assessDietaryCompliance();
    }
  }, [assessDietaryCompliance, options.includeDietaryRestrictions]);

  // Auto-assess traditional medicine when relevant options change
  useEffect(() => {
    if (options.includeTraditionalMedicine && options.traditionalMedicines?.length) {
      assessTraditionalMedicine();
    }
  }, [assessTraditionalMedicine, options.includeTraditionalMedicine, options.traditionalMedicines]);

  // Update meal patterns when profile changes
  useEffect(() => {
    setState(prev => ({ ...prev, mealPatterns: personalizedMealPatterns }));
  }, [personalizedMealPatterns]);

  return {
    // State
    ...state,
    
    // Configuration
    isConfigured: !!culturalProfile,
    currentLanguage,
    
    // Core functions
    generateCulturalSchedule,
    assessDietaryCompliance,
    assessTraditionalMedicine,
    checkCurrentOptimalTiming,
    
    // Utility functions
    getMealTimingRecommendations,
    checkCulturalCompliance,
    getTraditionalMedicineWarnings,
    translateSchedulingRecommendation,
    getCulturalSchedulingWindows,
    optimizeScheduleWithPrayerTimes,
    checkRamadanAdjustments,
    
    // Computed values
    mealPatterns: personalizedMealPatterns,
    isCurrentlyOptimal: state.currentOptimalTime.isOptimal,
    currentPeriod: state.currentOptimalTime.period,
    nextOptimalTime: state.currentOptimalTime.nextOptimalTime,
    
    // Cultural context
    culturalNotes: state.currentOptimalTime.culturalNotes,
    hasTraditionalMedicineWarnings: state.traditionalMedicineAssessment?.safetyLevel === 'caution' || 
                                   state.traditionalMedicineAssessment?.safetyLevel === 'unsafe',
    hasDietaryRestrictions: state.dietaryCompliance?.overallCompliance !== 'compliant',
    needsConsultation: state.dietaryCompliance?.consultationNeeded.level !== 'none' ||
                      state.traditionalMedicineAssessment?.consultationNeeded.modernDoctor,
    
    // Prayer time integration
    isPrayerTimeEnabled: culturalProfile?.preferences?.prayerTimes?.enabled && options.includePrayerTimes !== false,
    isCurrentlyPrayerTime: isCurrentlyAvoidableTime(),
    prayerConfig,
    
    // Family coordination
    hasFamilyCoordination: options.includeFamilyCoordination && options.familyMembers?.length,
    
    // Multi-language support
    t,
    translateMedical
  };
};