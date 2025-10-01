/**
 * Cultural Scheduling Services
 * 
 * Main export file for all cultural scheduling engine services.
 * Stream D - Cultural Scheduling Engine implementation.
 */

// Core Scheduling Engine
export { default as CulturalSchedulingEngine } from './CulturalSchedulingEngine';

// Malaysian Meal Patterns Service
export { default as MalaysianMealPatterns } from './MalaysianMealPatterns';

// Traditional Medicine Integration
export { default as TraditionalMedicineIntegration } from './TraditionalMedicineIntegration';

// Family Scheduling Coordination
export { default as FamilySchedulingCoordination } from './FamilySchedulingCoordination';

// Cultural Dietary Restrictions
export { default as CulturalDietaryRestrictions } from './CulturalDietaryRestrictions';

// Re-export types for convenience
export type {
  // Cultural Scheduling Engine types
  CulturalSchedulingResult,
  FamilySchedulingContext,
  TraditionalMedicineConsideration,
  CulturalDietaryRestriction,
  MalaysianMealPatterns as MealPatternsType,
} from './CulturalSchedulingEngine';

export type {
  // Malaysian Meal Patterns types
  MealTimingPattern,
  SpecialMealPattern,
  FamilyMealCoordination,
} from './MalaysianMealPatterns';

export type {
  // Traditional Medicine types
  TraditionalMedicine,
  TraditionalMedicineInteraction,
  TraditionalMedicineSchedule,
  IntegrationAssessment,
} from './TraditionalMedicineIntegration';

export type {
  // Family Coordination types
  FamilyMember,
  HouseholdStructure,
  CoordinationChallenge,
  FamilySchedulingResult,
} from './FamilySchedulingCoordination';

export type {
  // Dietary Restrictions types
  DietaryRestriction,
  MedicationDietaryInteraction,
  FastingPeriodAnalysis,
  DietaryComplianceResult,
} from './CulturalDietaryRestrictions';

// Service instances (singleton pattern)
export const culturalSchedulingEngine = CulturalSchedulingEngine.getInstance();
export const malaysianMealPatterns = MalaysianMealPatterns.getInstance();
export const traditionalMedicineIntegration = TraditionalMedicineIntegration.getInstance();
export const familySchedulingCoordination = FamilySchedulingCoordination.getInstance();
export const culturalDietaryRestrictions = CulturalDietaryRestrictions.getInstance();

// Utility functions for common operations
export const schedulingUtils = {
  /**
   * Quick cultural schedule generation for a single medication
   */
  async generateQuickCulturalSchedule(
    medication: any,
    culturalProfile: any
  ) {
    try {
      const result = await culturalSchedulingEngine.generateCulturalSchedule(
        [medication],
        culturalProfile,
        {
          elderlyMembers: [],
          children: [],
          primaryCaregiver: {
            availability: [{ start: '00:00', end: '23:59' }],
            culturalRole: 'mother'
          },
          householdRoutines: {
            wakingTime: '07:00',
            sleepTime: '22:00',
            mealTimes: malaysianMealPatterns.getMealPattern(culturalProfile.primaryCulture).pattern,
            prayerParticipation: culturalProfile.preferences.prayerTimes?.enabled || false
          }
        }
      );
      
      return result;
    } catch (error) {
      console.error('Quick cultural schedule generation failed:', error);
      return null;
    }
  },

  /**
   * Check if current time is optimal for medication
   */
  async isOptimalMedicationTime(
    currentTime: Date,
    culturalProfile: any
  ) {
    try {
      const mealPeriod = malaysianMealPatterns.getCurrentMealPeriod(
        culturalProfile,
        currentTime
      );
      
      return {
        isOptimal: mealPeriod.isOptimalForMedication,
        period: mealPeriod.period,
        notes: mealPeriod.notes,
        nextOptimalTime: mealPeriod.nextMealTime
      };
    } catch (error) {
      console.error('Optimal time check failed:', error);
      return {
        isOptimal: true, // Conservative fallback
        period: 'unknown',
        notes: ['Unable to determine optimal timing'],
        nextOptimalTime: '08:00'
      };
    }
  },

  /**
   * Get meal timing recommendations for medication
   */
  getMealTimingRecommendations(
    medication: any,
    culturalProfile: any
  ) {
    try {
      const mealPattern = malaysianMealPatterns.getPersonalizedMealPattern(culturalProfile);
      
      // Determine meal relationship from instructions
      const instructions = medication.instructions?.toLowerCase() || '';
      let mealRelation: 'before' | 'with' | 'after' | 'independent' = 'independent';
      
      if (instructions.includes('before meal') || instructions.includes('empty stomach')) {
        mealRelation = 'before';
      } else if (instructions.includes('with meal') || instructions.includes('with food')) {
        mealRelation = 'with';
      } else if (instructions.includes('after meal')) {
        mealRelation = 'after';
      }
      
      return malaysianMealPatterns.calculateOptimalMedicationTiming(
        mealRelation,
        mealPattern,
        1 // Single dose timing
      );
    } catch (error) {
      console.error('Meal timing recommendations failed:', error);
      return [{
        time: '08:00',
        meal: 'breakfast',
        notes: ['Default timing - system unavailable']
      }];
    }
  },

  /**
   * Quick dietary compliance check
   */
  async checkDietaryCompliance(
    medication: any,
    culturalProfile: any
  ) {
    try {
      const compliance = culturalDietaryRestrictions.assessDietaryCompliance(
        [medication],
        culturalProfile
      );
      
      return {
        isCompliant: compliance.overallCompliance === 'compliant',
        issues: compliance.medicationAssessment[0]?.issues || [],
        solutions: compliance.medicationAssessment[0]?.solutions || [],
        urgency: compliance.medicationAssessment[0]?.urgency || 'low'
      };
    } catch (error) {
      console.error('Dietary compliance check failed:', error);
      return {
        isCompliant: true, // Conservative fallback
        issues: ['Unable to check dietary compliance'],
        solutions: ['Manually verify with pharmacist'],
        urgency: 'medium' as const
      };
    }
  },

  /**
   * Get traditional medicine interaction warnings
   */
  async getTraditionalMedicineWarnings(
    medication: any,
    traditionalMedicines: string[],
    culturalProfile: any
  ) {
    try {
      const assessment = traditionalMedicineIntegration.assessIntegrationSafety(
        [medication],
        traditionalMedicines,
        culturalProfile
      );
      
      return {
        safetyLevel: assessment.safetyLevel,
        warnings: assessment.recommendations.filter(r => r.includes('⚠️') || r.includes('🚫')),
        consultationNeeded: assessment.consultationNeeded,
        timeAdjustments: assessment.timeAdjustments
      };
    } catch (error) {
      console.error('Traditional medicine warnings failed:', error);
      return {
        safetyLevel: 'unknown' as const,
        warnings: ['Unable to assess traditional medicine interactions'],
        consultationNeeded: {
          tcmPractitioner: false,
          malayHealer: false,
          ayurvedicPractitioner: false,
          modernDoctor: true,
          pharmacist: true
        },
        timeAdjustments: []
      };
    }
  }
};