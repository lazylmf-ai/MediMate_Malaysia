/**
 * Cultural Scheduling Engine
 * 
 * Main export file for Stream D - Cultural Scheduling Engine hooks and utilities.
 * Provides comprehensive Malaysian cultural intelligence for medication scheduling.
 */

// Core hooks
export { useCulturalScheduling } from './useCulturalScheduling';
export { useFamilyMedicationCoordination } from './useFamilyMedicationCoordination';

// Re-export types for convenience
export type {
  // Cultural scheduling types
  CulturalSchedulingResult,
  MealTimingPattern,
  IntegrationAssessment,
  DietaryComplianceResult,
  
  // Family coordination types
  FamilyMember,
  HouseholdStructure,
  CoordinationChallenge,
  FamilySchedulingResult,
  
  // Traditional medicine types
  TraditionalMedicine,
  TraditionalMedicineInteraction,
  TraditionalMedicineSchedule,
  
  // Dietary restriction types
  DietaryRestriction,
  MedicationDietaryInteraction,
  FastingPeriodAnalysis,
} from '../../services/scheduling';

// Utility hooks and functions
export const culturalEngineUtils = {
  /**
   * Check if cultural scheduling is properly configured
   */
  isCulturalSchedulingAvailable: (culturalProfile: any): boolean => {
    return !!(
      culturalProfile?.primaryCulture &&
      culturalProfile?.preferences &&
      culturalProfile?.location
    );
  },

  /**
   * Get cultural scheduling complexity level
   */
  getCulturalComplexity: (culturalProfile: any, familyMembers: any[] = []): 'low' | 'medium' | 'high' => {
    let complexityScore = 0;

    // Cultural factors
    if (culturalProfile?.religion && culturalProfile.religion !== 'none') complexityScore += 1;
    if (culturalProfile?.preferences?.prayerTimes?.enabled) complexityScore += 2;
    if (culturalProfile?.preferences?.dietary?.halal || culturalProfile?.preferences?.dietary?.vegetarian) complexityScore += 1;
    
    // Family factors
    if (familyMembers.length > 0) {
      complexityScore += Math.min(familyMembers.length, 3); // Cap at 3 for family size
      const elderlyCount = familyMembers.filter(m => m.age >= 65).length;
      const childrenCount = familyMembers.filter(m => m.age < 18).length;
      complexityScore += elderlyCount + childrenCount;
    }

    if (complexityScore <= 3) return 'low';
    if (complexityScore <= 7) return 'medium';
    return 'high';
  },

  /**
   * Get recommended cultural features to enable
   */
  getRecommendedFeatures: (culturalProfile: any, familyMembers: any[] = []): {
    prayerTimes: boolean;
    mealPatterns: boolean;
    dietaryRestrictions: boolean;
    traditionalMedicine: boolean;
    familyCoordination: boolean;
    multilanguage: boolean;
  } => {
    const features = {
      prayerTimes: false,
      mealPatterns: true, // Always recommended for Malaysian users
      dietaryRestrictions: false,
      traditionalMedicine: false,
      familyCoordination: false,
      multilanguage: false
    };

    // Prayer times for Islamic users
    if (culturalProfile?.religion === 'islam' || culturalProfile?.preferences?.prayerTimes?.enabled) {
      features.prayerTimes = true;
    }

    // Dietary restrictions
    if (culturalProfile?.preferences?.dietary?.halal || 
        culturalProfile?.preferences?.dietary?.vegetarian ||
        culturalProfile?.religion === 'islam' ||
        culturalProfile?.religion === 'hinduism' ||
        culturalProfile?.religion === 'buddhism') {
      features.dietaryRestrictions = true;
    }

    // Traditional medicine for specific cultures
    if (culturalProfile?.primaryCulture === 'chinese' ||
        culturalProfile?.primaryCulture === 'malay' ||
        culturalProfile?.primaryCulture === 'indian') {
      features.traditionalMedicine = true;
    }

    // Family coordination for multi-member households
    if (familyMembers.length > 1) {
      features.familyCoordination = true;
    }

    // Multi-language for non-English primary language
    if (culturalProfile?.languages?.length > 1 ||
        culturalProfile?.languages?.[0]?.code !== 'en') {
      features.multilanguage = true;
    }

    return features;
  },

  /**
   * Validate cultural profile completeness
   */
  validateCulturalProfile: (culturalProfile: any): {
    isValid: boolean;
    missingFields: string[];
    recommendations: string[];
  } => {
    const missingFields: string[] = [];
    const recommendations: string[] = [];

    if (!culturalProfile) {
      return {
        isValid: false,
        missingFields: ['cultural_profile'],
        recommendations: ['Complete cultural profile setup']
      };
    }

    // Required fields
    if (!culturalProfile.primaryCulture) {
      missingFields.push('primaryCulture');
    }

    if (!culturalProfile.location?.state) {
      missingFields.push('location.state');
    }

    if (!culturalProfile.languages?.length) {
      missingFields.push('languages');
    }

    // Recommendations for better experience
    if (!culturalProfile.religion || culturalProfile.religion === 'none') {
      recommendations.push('Add religious preference for better cultural scheduling');
    }

    if (!culturalProfile.preferences?.dietary) {
      recommendations.push('Add dietary restrictions for medication compliance checking');
    }

    if (culturalProfile.religion === 'islam' && !culturalProfile.preferences?.prayerTimes?.enabled) {
      recommendations.push('Enable prayer time integration for Islamic scheduling');
    }

    return {
      isValid: missingFields.length === 0,
      missingFields,
      recommendations
    };
  },

  /**
   * Get cultural scheduling readiness status
   */
  getSchedulingReadiness: (culturalProfile: any, medications: any[] = []): {
    status: 'ready' | 'partial' | 'setup_needed';
    message: string;
    nextSteps: string[];
  } => {
    const validation = culturalEngineUtils.validateCulturalProfile(culturalProfile);
    
    if (!validation.isValid) {
      return {
        status: 'setup_needed',
        message: 'Cultural profile setup required for intelligent scheduling',
        nextSteps: [
          'Complete cultural profile',
          'Add location information',
          'Select primary language',
          'Add dietary preferences if applicable'
        ]
      };
    }

    if (medications.length === 0) {
      return {
        status: 'partial',
        message: 'Cultural profile ready, add medications to begin intelligent scheduling',
        nextSteps: [
          'Add medications to your profile',
          'Set medication timing preferences',
          'Enable relevant cultural features'
        ]
      };
    }

    if (validation.recommendations.length > 0) {
      return {
        status: 'partial',
        message: 'Basic cultural scheduling available, additional setup recommended',
        nextSteps: validation.recommendations.slice(0, 3) // Limit to top 3 recommendations
      };
    }

    return {
      status: 'ready',
      message: 'Cultural scheduling engine fully configured and ready',
      nextSteps: [
        'Generate your personalized medication schedule',
        'Review cultural recommendations',
        'Set up family coordination if needed'
      ]
    };
  }
};

// Pre-configured hooks for common use cases
export const useBasicCulturalScheduling = (medications?: any[]) => {
  return useCulturalScheduling(medications, {
    includePrayerTimes: true,
    includeDietaryRestrictions: true,
    includeRamadanAdjustments: true
  });
};

export const useAdvancedCulturalScheduling = (medications?: any[], traditionalMedicines?: string[]) => {
  return useCulturalScheduling(medications, {
    includePrayerTimes: true,
    includeDietaryRestrictions: true,
    includeTraditionalMedicine: true,
    includeRamadanAdjustments: true,
    traditionalMedicines
  });
};

export const useFamilyCulturalScheduling = (
  medications?: any[], 
  familyMembers?: any[], 
  traditionalMedicines?: string[]
) => {
  const culturalScheduling = useCulturalScheduling(medications, {
    includePrayerTimes: true,
    includeDietaryRestrictions: true,
    includeTraditionalMedicine: !!traditionalMedicines?.length,
    includeFamilyCoordination: true,
    includeRamadanAdjustments: true,
    traditionalMedicines,
    familyMembers
  });

  const familyCoordination = useFamilyMedicationCoordination(familyMembers || [], undefined, {
    enableElderlySupervision: true,
    enableChildrenScheduling: true,
    includeCulturalHierarchy: true,
    includeWorkScheduleCoordination: true,
    includePrayerTimeCoordination: true
  });

  return {
    ...culturalScheduling,
    ...familyCoordination,
    // Combined functionality
    isFullyConfigured: culturalScheduling.isConfigured && familyCoordination.isConfigured,
    overallComplexity: culturalEngineUtils.getCulturalComplexity(
      culturalScheduling.currentLanguage, 
      familyMembers
    )
  };
};

export default {
  useCulturalScheduling,
  useFamilyMedicationCoordination,
  useBasicCulturalScheduling,
  useAdvancedCulturalScheduling,
  useFamilyCulturalScheduling,
  culturalEngineUtils
};