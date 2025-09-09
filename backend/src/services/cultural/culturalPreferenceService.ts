/**
 * Malaysian Cultural Preference Service
 * Central service for managing and integrating all cultural preferences
 * Coordinates prayer times, language, halal validation, calendar, and dietary services
 */

import { PrayerTimeService, PrayerTimeResponse } from './prayerTimeService';
import { LanguageService, TranslationResult, LanguageConfig } from './languageService';
import { HalalValidationService, MedicationHalalInfo } from './halalValidationService';
import { CulturalCalendarService, CulturalEvent, RamadanInfo } from './culturalCalendarService';
import { DietaryService, PatientDietaryProfile, DietaryValidation } from './dietaryService';

export interface CulturalPreferences {
  user_id: string;
  
  // Basic demographics
  religion?: 'Islam' | 'Buddhism' | 'Hinduism' | 'Christianity' | 'Other';
  ethnicity?: 'Malay' | 'Chinese' | 'Indian' | 'Other';
  primary_language: string;
  secondary_languages: string[];
  
  // Location and regional preferences  
  state_code: string;
  region: string;
  
  // Religious and cultural practices
  religious_observance_level: 'strict' | 'moderate' | 'flexible' | 'cultural_only';
  prayer_time_notifications: boolean;
  cultural_calendar_integration: boolean;
  
  // Dietary preferences
  halal_requirements: boolean;
  vegetarian_preference: boolean;
  dietary_restrictions: string[];
  ramadan_fasting: boolean;
  
  // Healthcare preferences
  gender_preference_provider?: 'male' | 'female' | 'no_preference';
  cultural_interpreter_needed: boolean;
  family_involvement_level: 'minimal' | 'moderate' | 'high';
  traditional_medicine_interest: boolean;
  
  // Communication preferences
  cultural_greetings: boolean;
  religious_considerations_in_communication: boolean;
  cultural_sensitivity_required: boolean;
  
  // Emergency and flexibility
  cultural_flexibility_in_emergencies: boolean;
  religious_exemptions_for_medical_care: boolean;
  
  // Metadata
  created_at: Date;
  updated_at: Date;
  last_cultural_assessment_date?: Date;
}

export interface CulturalHealthcareRecommendation {
  category: 'scheduling' | 'medication' | 'dietary' | 'communication' | 'treatment';
  priority: 'high' | 'medium' | 'low';
  recommendation: string;
  reasoning: string[];
  cultural_context: string;
  implementation_notes: string[];
  alternatives?: string[];
}

export interface CulturalAssessment {
  user_id: string;
  assessment_date: Date;
  cultural_compatibility_score: number; // 0-100
  key_considerations: string[];
  recommendations: CulturalHealthcareRecommendation[];
  potential_conflicts: string[];
  cultural_strengths: string[];
  follow_up_needed: boolean;
  assessment_notes: string;
}

export interface IntegratedCulturalResponse {
  prayer_info?: {
    current_prayer_status: any;
    next_prayer: any;
    ramadan_adjustments?: any;
  };
  language_support: {
    preferred_language: string;
    available_translations: string[];
    cultural_greetings: Record<string, string>;
  };
  halal_validation?: {
    medication_status: any;
    dietary_guidance: any;
  };
  cultural_events: CulturalEvent[];
  dietary_recommendations: any;
  healthcare_adjustments: CulturalHealthcareRecommendation[];
}

export class CulturalPreferenceService {
  private prayerService: PrayerTimeService;
  private languageService: LanguageService;
  private halalService: HalalValidationService;
  private calendarService: CulturalCalendarService;
  private dietaryService: DietaryService;
  private initialized = false;

  constructor() {
    this.prayerService = new PrayerTimeService();
    this.languageService = new LanguageService();
    this.halalService = new HalalValidationService();
    this.calendarService = new CulturalCalendarService();
    this.dietaryService = new DietaryService();
  }

  /**
   * Initialize all cultural services
   */
  async initialize(): Promise<void> {
    console.log('🕌 Initializing Cultural Preference Service...');
    
    try {
      // Initialize all sub-services in parallel
      await Promise.all([
        this.prayerService.initialize(),
        this.languageService.initialize(),
        this.halalService.initialize(),
        this.calendarService.initialize(),
        this.dietaryService.initialize()
      ]);
      
      this.initialized = true;
      console.log('✅ Cultural Preference Service fully initialized');
    } catch (error) {
      console.error('❌ Failed to initialize Cultural Preference Service:', error);
      throw error;
    }
  }

  /**
   * Create comprehensive cultural profile for a patient
   */
  async createCulturalProfile(profileData: Partial<CulturalPreferences>): Promise<CulturalPreferences> {
    if (!this.initialized) {
      throw new Error('Cultural Preference Service not initialized');
    }

    // Set defaults based on Malaysian healthcare context
    const profile: CulturalPreferences = {
      user_id: profileData.user_id || '',
      religion: profileData.religion,
      ethnicity: profileData.ethnicity,
      primary_language: profileData.primary_language || 'ms',
      secondary_languages: profileData.secondary_languages || ['en'],
      state_code: profileData.state_code || 'KUL',
      region: profileData.region || 'Kuala Lumpur',
      religious_observance_level: profileData.religious_observance_level || 'moderate',
      prayer_time_notifications: profileData.prayer_time_notifications ?? (profileData.religion === 'Islam'),
      cultural_calendar_integration: profileData.cultural_calendar_integration ?? true,
      halal_requirements: profileData.halal_requirements ?? (profileData.religion === 'Islam'),
      vegetarian_preference: profileData.vegetarian_preference ?? false,
      dietary_restrictions: profileData.dietary_restrictions || [],
      ramadan_fasting: profileData.ramadan_fasting ?? (profileData.religion === 'Islam'),
      gender_preference_provider: profileData.gender_preference_provider,
      cultural_interpreter_needed: profileData.cultural_interpreter_needed ?? false,
      family_involvement_level: profileData.family_involvement_level || 'moderate',
      traditional_medicine_interest: profileData.traditional_medicine_interest ?? false,
      cultural_greetings: profileData.cultural_greetings ?? true,
      religious_considerations_in_communication: profileData.religious_considerations_in_communication ?? true,
      cultural_sensitivity_required: profileData.cultural_sensitivity_required ?? true,
      cultural_flexibility_in_emergencies: profileData.cultural_flexibility_in_emergencies ?? true,
      religious_exemptions_for_medical_care: profileData.religious_exemptions_for_medical_care ?? true,
      created_at: new Date(),
      updated_at: new Date()
    };

    return profile;
  }

  /**
   * Get integrated cultural recommendations for healthcare
   */
  async getIntegratedCulturalGuidance(
    preferences: CulturalPreferences,
    context?: {
      appointment_date?: Date;
      medications?: string[];
      medical_conditions?: string[];
      emergency?: boolean;
    }
  ): Promise<IntegratedCulturalResponse> {
    if (!this.initialized) {
      throw new Error('Cultural Preference Service not initialized');
    }

    const response: IntegratedCulturalResponse = {
      language_support: {
        preferred_language: preferences.primary_language,
        available_translations: await this.getAvailableLanguages(),
        cultural_greetings: this.languageService.getCulturalGreetings(preferences.primary_language)
      },
      cultural_events: [],
      dietary_recommendations: null,
      healthcare_adjustments: []
    };

    // Prayer and Islamic considerations
    if (preferences.religion === 'Islam' && preferences.prayer_time_notifications) {
      try {
        const currentStatus = await this.prayerService.getCurrentPrayerStatus(preferences.state_code);
        response.prayer_info = { current_prayer_status: currentStatus, next_prayer: currentStatus.next_prayer };

        // Add Ramadan considerations if applicable
        if (preferences.ramadan_fasting) {
          const ramadanAdjustments = await this.prayerService.getRamadanAdjustments(
            preferences.state_code,
            context?.appointment_date
          );
          response.prayer_info.ramadan_adjustments = ramadanAdjustments;
        }
      } catch (error) {
        console.error('Failed to get prayer information:', error);
      }
    }

    // Halal validation for medications
    if (preferences.halal_requirements && context?.medications) {
      try {
        const halalValidations = await Promise.all(
          context.medications.map(med => this.halalService.validateMedication(med))
        );
        response.halal_validation = {
          medication_status: halalValidations,
          dietary_guidance: await this.halalService.getIslamicMedicalGuidelines()
        };
      } catch (error) {
        console.error('Failed to validate halal status:', error);
      }
    }

    // Cultural events and calendar
    if (preferences.cultural_calendar_integration) {
      try {
        const startDate = context?.appointment_date || new Date();
        const endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000); // Next 7 days
        
        response.cultural_events = await this.calendarService.getCulturalEvents(
          startDate,
          endDate,
          undefined,
          [preferences.state_code]
        );
      } catch (error) {
        console.error('Failed to get cultural events:', error);
      }
    }

    // Dietary recommendations
    if (preferences.dietary_restrictions.length > 0 || preferences.halal_requirements) {
      try {
        const dietaryProfile = await this.dietaryService.createPatientProfile(
          preferences.user_id,
          preferences.religion,
          preferences.dietary_restrictions,
          context?.medical_conditions,
          preferences.religious_observance_level === 'strict' ? 'strict' : 'moderate'
        );
        
        if (context?.medications) {
          const medicationInteractions = await Promise.all(
            context.medications.map(med => 
              this.dietaryService.getMedicationDietInteraction(med, dietaryProfile)
            )
          );
          response.dietary_recommendations = { medication_interactions: medicationInteractions };
        }

        // Ramadan dietary guidance
        if (preferences.ramadan_fasting) {
          const ramadanGuidance = await this.dietaryService.getRamadanDietaryGuidance(dietaryProfile);
          response.dietary_recommendations = {
            ...response.dietary_recommendations,
            ramadan_guidance: ramadanGuidance
          };
        }
      } catch (error) {
        console.error('Failed to get dietary recommendations:', error);
      }
    }

    // Healthcare adjustments and recommendations
    response.healthcare_adjustments = await this.generateHealthcareRecommendations(preferences, context);

    return response;
  }

  /**
   * Perform cultural assessment for healthcare delivery
   */
  async performCulturalAssessment(
    preferences: CulturalPreferences,
    healthcareContext?: {
      treatment_type?: string;
      provider_cultural_competency?: number;
      facility_cultural_resources?: string[];
    }
  ): Promise<CulturalAssessment> {
    if (!this.initialized) {
      throw new Error('Cultural Preference Service not initialized');
    }

    let compatibilityScore = 70; // Base score
    const keyConsiderations: string[] = [];
    const potentialConflicts: string[] = [];
    const culturalStrengths: string[] = [];
    let followUpNeeded = false;

    // Assess language compatibility
    if (preferences.cultural_interpreter_needed) {
      keyConsiderations.push('Patient requires cultural interpreter services');
      if (!healthcareContext?.facility_cultural_resources?.includes('interpreter')) {
        potentialConflicts.push('Interpreter services may not be available');
        compatibilityScore -= 15;
        followUpNeeded = true;
      } else {
        culturalStrengths.push('Interpreter services available');
        compatibilityScore += 10;
      }
    }

    // Assess religious considerations
    if (preferences.religious_observance_level === 'strict') {
      keyConsiderations.push('Patient has strict religious observance requirements');
      
      if (preferences.religion === 'Islam') {
        keyConsiderations.push('Islamic dietary and prayer considerations essential');
        if (preferences.gender_preference_provider) {
          keyConsiderations.push(`Patient prefers ${preferences.gender_preference_provider} healthcare provider`);
        }
      }
      
      if (preferences.religion === 'Hinduism' && preferences.vegetarian_preference) {
        keyConsiderations.push('Vegetarian dietary requirements must be respected');
      }
    }

    // Assess family involvement
    if (preferences.family_involvement_level === 'high') {
      keyConsiderations.push('High level of family involvement expected in healthcare decisions');
      culturalStrengths.push('Strong family support system');
      compatibilityScore += 5;
    }

    // Assess cultural flexibility
    if (preferences.cultural_flexibility_in_emergencies) {
      culturalStrengths.push('Patient shows cultural flexibility for emergency medical care');
      compatibilityScore += 10;
    } else {
      potentialConflicts.push('Limited cultural flexibility may complicate emergency care');
      compatibilityScore -= 10;
      followUpNeeded = true;
    }

    // Generate recommendations
    const recommendations = await this.generateHealthcareRecommendations(preferences);

    return {
      user_id: preferences.user_id,
      assessment_date: new Date(),
      cultural_compatibility_score: Math.max(0, Math.min(100, compatibilityScore)),
      key_considerations: keyConsiderations,
      recommendations,
      potential_conflicts: potentialConflicts,
      cultural_strengths: culturalStrengths,
      follow_up_needed: followUpNeeded,
      assessment_notes: `Cultural assessment completed. Score: ${compatibilityScore}/100. ${followUpNeeded ? 'Follow-up recommended.' : 'No immediate follow-up needed.'}`
    };
  }

  /**
   * Validate cultural appropriateness of healthcare plan
   */
  async validateHealthcarePlan(
    preferences: CulturalPreferences,
    healthcarePlan: {
      medications: string[];
      appointment_times: string[];
      dietary_recommendations: string[];
      treatment_procedures: string[];
    }
  ): Promise<{
    overall_compatibility: 'high' | 'medium' | 'low';
    medication_issues: any[];
    scheduling_conflicts: any[];
    dietary_conflicts: any[];
    cultural_recommendations: string[];
    required_adjustments: string[];
  }> {
    const medicationIssues: any[] = [];
    const schedulingConflicts: any[] = [];
    const dietaryConflicts: any[] = [];
    const culturalRecommendations: string[] = [];
    const requiredAdjustments: string[] = [];

    // Validate medications for halal compliance
    if (preferences.halal_requirements) {
      for (const medication of healthcarePlan.medications) {
        try {
          const halalInfo = await this.halalService.validateMedication(medication);
          if (halalInfo.halal_status.status === 'haram') {
            medicationIssues.push({
              medication,
              issue: 'Not halal certified',
              alternatives: halalInfo.alternatives
            });
            requiredAdjustments.push(`Replace ${medication} with halal alternative`);
          }
        } catch (error) {
          console.error(`Failed to validate ${medication}:`, error);
        }
      }
    }

    // Validate appointment times against prayer schedule
    if (preferences.prayer_time_notifications && preferences.religion === 'Islam') {
      for (const appointmentTime of healthcarePlan.appointment_times) {
        try {
          const isPrayerTime = await this.prayerService.isPrayerTime(preferences.state_code);
          if (isPrayerTime.is_prayer_time) {
            schedulingConflicts.push({
              time: appointmentTime,
              issue: 'Conflicts with prayer time',
              suggestion: 'Reschedule to avoid prayer periods'
            });
          }
        } catch (error) {
          console.error('Failed to check prayer times:', error);
        }
      }
    }

    // Validate dietary recommendations
    if (preferences.dietary_restrictions.length > 0) {
      try {
        const dietaryProfile = await this.dietaryService.createPatientProfile(
          preferences.user_id,
          preferences.religion,
          preferences.dietary_restrictions
        );

        for (const dietaryItem of healthcarePlan.dietary_recommendations) {
          const validation = await this.dietaryService.validateDietaryItem(dietaryItem, dietaryProfile);
          if (!validation.is_suitable) {
            dietaryConflicts.push({
              item: dietaryItem,
              issues: validation.concerns,
              alternatives: validation.alternatives
            });
          }
        }
      } catch (error) {
        console.error('Failed to validate dietary recommendations:', error);
      }
    }

    // Generate cultural recommendations
    if (preferences.cultural_sensitivity_required) {
      culturalRecommendations.push('Use culturally appropriate communication');
      culturalRecommendations.push('Respect religious practices and beliefs');
    }

    if (preferences.family_involvement_level === 'high') {
      culturalRecommendations.push('Include family members in healthcare discussions');
    }

    // Determine overall compatibility
    const totalIssues = medicationIssues.length + schedulingConflicts.length + dietaryConflicts.length;
    let overallCompatibility: 'high' | 'medium' | 'low' = 'high';

    if (totalIssues > 3) {
      overallCompatibility = 'low';
    } else if (totalIssues > 1) {
      overallCompatibility = 'medium';
    }

    return {
      overall_compatibility: overallCompatibility,
      medication_issues: medicationIssues,
      scheduling_conflicts: schedulingConflicts,
      dietary_conflicts: dietaryConflicts,
      cultural_recommendations: culturalRecommendations,
      required_adjustments: requiredAdjustments
    };
  }

  // Private helper methods

  private async getAvailableLanguages(): Promise<string[]> {
    const supportedLanguages = this.languageService.getSupportedLanguages();
    return supportedLanguages.map(lang => lang.code);
  }

  private async generateHealthcareRecommendations(
    preferences: CulturalPreferences,
    context?: any
  ): Promise<CulturalHealthcareRecommendation[]> {
    const recommendations: CulturalHealthcareRecommendation[] = [];

    // Language and communication recommendations
    if (preferences.cultural_interpreter_needed) {
      recommendations.push({
        category: 'communication',
        priority: 'high',
        recommendation: 'Provide certified cultural interpreter',
        reasoning: ['Patient requires cultural interpreter for effective communication'],
        cultural_context: 'Language barriers can significantly impact healthcare outcomes',
        implementation_notes: ['Schedule interpreter in advance', 'Use certified medical interpreters']
      });
    }

    // Prayer time scheduling recommendations
    if (preferences.religion === 'Islam' && preferences.prayer_time_notifications) {
      recommendations.push({
        category: 'scheduling',
        priority: 'medium',
        recommendation: 'Schedule appointments outside prayer times',
        reasoning: ['Patient observes daily Islamic prayers', 'Prayer times vary by season and location'],
        cultural_context: 'Five daily prayers are a fundamental Islamic practice',
        implementation_notes: [
          'Check current prayer times for patient\'s location',
          'Allow flexibility for prayer breaks during long appointments'
        ]
      });
    }

    // Dietary recommendations
    if (preferences.halal_requirements) {
      recommendations.push({
        category: 'dietary',
        priority: 'high',
        recommendation: 'Ensure all medications and dietary recommendations are halal',
        reasoning: ['Patient requires halal compliance', 'Islamic dietary laws are religiously mandated'],
        cultural_context: 'Halal compliance is essential for observant Muslims',
        implementation_notes: [
          'Verify medication ingredients',
          'Provide halal meal options',
          'Check supplement sources'
        ]
      });
    }

    // Family involvement recommendations
    if (preferences.family_involvement_level === 'high') {
      recommendations.push({
        category: 'communication',
        priority: 'medium',
        recommendation: 'Include family members in healthcare decisions and communication',
        reasoning: ['Patient prefers high family involvement', 'Family support improves healthcare outcomes'],
        cultural_context: 'Many Malaysian cultures emphasize family-centered healthcare decisions',
        implementation_notes: [
          'Obtain consent for family involvement',
          'Schedule appointments to accommodate family members',
          'Provide information to designated family contacts'
        ]
      });
    }

    // Emergency flexibility
    if (!preferences.cultural_flexibility_in_emergencies) {
      recommendations.push({
        category: 'treatment',
        priority: 'high',
        recommendation: 'Develop cultural emergency protocols',
        reasoning: ['Patient has limited cultural flexibility in emergencies', 'Emergency care may conflict with cultural practices'],
        cultural_context: 'Emergency situations may require immediate cultural consultation',
        implementation_notes: [
          'Have cultural liaison available for emergencies',
          'Develop rapid cultural consultation protocols',
          'Document cultural preferences for emergency scenarios'
        ]
      });
    }

    return recommendations;
  }

  /**
   * Check if service is fully initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get service health status
   */
  getServiceStatus(): {
    cultural_preference: boolean;
    prayer_time: boolean;
    language: boolean;
    halal_validation: boolean;
    cultural_calendar: boolean;
    dietary: boolean;
  } {
    return {
      cultural_preference: this.initialized,
      prayer_time: true, // PrayerTimeService doesn't have public isInitialized method
      language: this.languageService.isInitialized(),
      halal_validation: true, // HalalValidationService doesn't have public isInitialized method
      cultural_calendar: true, // CulturalCalendarService doesn't have public isInitialized method
      dietary: this.dietaryService.isInitialized()
    };
  }
}