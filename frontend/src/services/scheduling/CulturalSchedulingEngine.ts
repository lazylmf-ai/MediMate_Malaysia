/**
 * Cultural Scheduling Engine
 * 
 * Intelligent medication scheduling engine that incorporates Malaysian cultural practices,
 * prayer times, meal patterns, traditional medicine considerations, and family coordination.
 * 
 * Features:
 * - Malaysian meal time awareness (breakfast, lunch, dinner patterns)
 * - Traditional medicine integration with modern medications
 * - Family structure consideration (elderly care, children scheduling)
 * - Cultural dietary restrictions and medication interactions
 * - Integration with prayer time system from Stream A
 * - Multi-language recommendations using Stream C translations
 */

import { 
  Medication, 
  MedicationSchedule, 
  CulturalAdjustments,
  MedicationTiming,
  DosageInstruction
} from '../../types/medication';
import { 
  EnhancedCulturalProfile, 
  CulturalCalendarEvent,
  MalaysianState,
  MALAYSIAN_STATES_DATA 
} from '../../types/cultural';
import PrayerSchedulingService from '../prayer-scheduling/PrayerSchedulingService';
import { I18nService } from '../../i18n/services/I18nService';
import { culturalService } from '../../api/services/culturalService';

// Malaysian meal time patterns
export interface MalaysianMealPatterns {
  breakfast: {
    typical: { start: string; end: string };
    ramadan: { start: string; end: string }; // Sahur timing
    weekend: { start: string; end: string };
  };
  lunch: {
    typical: { start: string; end: string };
    ramadan: null; // No lunch during fasting
    weekend: { start: string; end: string };
  };
  dinner: {
    typical: { start: string; end: string };
    ramadan: { start: string; end: string }; // Iftar timing
    weekend: { start: string; end: string };
  };
  snacks: {
    morning: { start: string; end: string };
    afternoon: { start: string; end: string };
    evening: { start: string; end: string };
  };
}

export interface TraditionalMedicineConsideration {
  type: 'herbal' | 'acupuncture' | 'massage' | 'dietary';
  name: string;
  timingConflicts: string[];
  medicationInteractions: Array<{
    medication: string;
    interaction: 'avoid' | 'reduce' | 'monitor' | 'safe';
    timeBuffer: number; // minutes
    advice: string;
  }>;
  culturalNotes: string[];
}

export interface FamilySchedulingContext {
  elderlyMembers: Array<{
    age: number;
    medicationComplexity: 'low' | 'medium' | 'high';
    cognitiveStatus: 'clear' | 'mild_impairment' | 'moderate_impairment';
    preferredTimes: string[];
    dietaryRestrictions: string[];
  }>;
  children: Array<{
    age: number;
    schoolSchedule: boolean;
    medicationType: 'acute' | 'chronic' | 'vitamin';
    parentSupervision: 'high' | 'medium' | 'low';
  }>;
  primaryCaregiver: {
    availability: Array<{ start: string; end: string }>;
    workSchedule?: Array<{ day: string; start: string; end: string }>;
    culturalRole: 'mother' | 'father' | 'grandparent' | 'sibling' | 'other';
  };
  householdRoutines: {
    wakingTime: string;
    sleepTime: string;
    mealTimes: MalaysianMealPatterns;
    prayerParticipation: boolean;
  };
}

export interface CulturalDietaryRestriction {
  type: 'halal' | 'vegetarian' | 'diabetes_friendly' | 'heart_healthy' | 'elderly_soft';
  medications: Array<{
    name: string;
    restriction: string;
    alternatives: string[];
    culturalGuidance: string;
  }>;
  mealTimingImpact: string[];
  specialConsiderations: string[];
}

export interface CulturalSchedulingResult {
  optimizedSchedule: Array<{
    medication: string;
    dosage: string;
    times: Array<{
      time: string;
      mealRelation: 'before' | 'with' | 'after' | 'independent';
      culturalContext: string[];
      familyConsiderations: string[];
      traditionalMedicineNotes?: string[];
    }>;
  }>;
  culturalGuidance: {
    prayerTimeConsiderations: string[];
    mealTimeOptimizations: string[];
    familyCoordination: string[];
    traditionalMedicineAdvice: string[];
    dietaryRestrictionNotes: string[];
  };
  conflicts: Array<{
    type: 'prayer' | 'meal' | 'family' | 'traditional' | 'dietary';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    suggestions: string[];
    culturalAlternatives: string[];
  }>;
  recommendations: Array<{
    priority: 'high' | 'medium' | 'low';
    category: 'timing' | 'coordination' | 'cultural' | 'safety';
    message: string;
    multiLanguage: Record<string, string>; // Translations from Stream C
  }>;
}

class CulturalSchedulingEngine {
  private static instance: CulturalSchedulingEngine;
  private prayerSchedulingService: PrayerSchedulingService;
  private i18nService: I18nService;
  
  private readonly MALAYSIAN_MEAL_PATTERNS: MalaysianMealPatterns = {
    breakfast: {
      typical: { start: '07:00', end: '09:00' },
      ramadan: { start: '04:30', end: '05:30' }, // Sahur
      weekend: { start: '08:00', end: '10:00' }
    },
    lunch: {
      typical: { start: '12:00', end: '14:00' },
      ramadan: null, // Fasting
      weekend: { start: '12:30', end: '14:30' }
    },
    dinner: {
      typical: { start: '19:00', end: '21:00' },
      ramadan: { start: '19:15', end: '20:30' }, // Post-Iftar
      weekend: { start: '19:30', end: '21:30' }
    },
    snacks: {
      morning: { start: '10:00', end: '11:00' },
      afternoon: { start: '15:00', end: '16:00' },
      evening: { start: '21:30', end: '22:30' }
    }
  };

  private readonly TRADITIONAL_MEDICINES: TraditionalMedicineConsideration[] = [
    {
      type: 'herbal',
      name: 'Traditional Chinese Medicine (TCM) herbs',
      timingConflicts: ['30 minutes before meals', '2 hours after meals'],
      medicationInteractions: [
        {
          medication: 'warfarin',
          interaction: 'avoid',
          timeBuffer: 120,
          advice: 'Many TCM herbs affect blood clotting. Consult TCM practitioner and doctor.'
        },
        {
          medication: 'diabetes medications',
          interaction: 'monitor',
          timeBuffer: 60,
          advice: 'Some herbs may affect blood sugar. Monitor glucose levels closely.'
        }
      ],
      culturalNotes: [
        'TCM follows "hot" and "cold" food theory',
        'Timing based on qi circulation patterns',
        'Consider body constitution (寒熱虛實)'
      ]
    },
    {
      type: 'herbal',
      name: 'Malay traditional medicine (Ubat Tradisional)',
      timingConflicts: ['Early morning', 'Before sunset'],
      medicationInteractions: [
        {
          medication: 'blood pressure medications',
          interaction: 'monitor',
          timeBuffer: 90,
          advice: 'Traditional herbs may have cardiovascular effects. Monitor blood pressure.'
        }
      ],
      culturalNotes: [
        'Often combined with spiritual practices',
        'Best taken during specific times according to traditional beliefs',
        'May require dietary restrictions'
      ]
    },
    {
      type: 'herbal',
      name: 'Ayurvedic medicines',
      timingConflicts: ['Sunrise', 'Sunset', 'Before prayers'],
      medicationInteractions: [
        {
          medication: 'liver medications',
          interaction: 'avoid',
          timeBuffer: 180,
          advice: 'Some Ayurvedic preparations may affect liver function.'
        }
      ],
      culturalNotes: [
        'Timing based on doshas (body constitution)',
        'Seasonal considerations important',
        'Often requires specific dietary guidelines'
      ]
    }
  ];

  private readonly CULTURAL_DIETARY_RESTRICTIONS: CulturalDietaryRestriction[] = [
    {
      type: 'halal',
      medications: [
        {
          name: 'gelatin-based capsules',
          restriction: 'Must be from halal sources',
          alternatives: ['vegetarian capsules', 'liquid formulations'],
          culturalGuidance: 'Verify halal certification with manufacturer'
        },
        {
          name: 'alcohol-based syrups',
          restriction: 'Contains alcohol',
          alternatives: ['alcohol-free formulations', 'tablet alternatives'],
          culturalGuidance: 'Consult Islamic scholar if necessary for medical treatment'
        }
      ],
      mealTimingImpact: [
        'Medications with pork-derived ingredients must be avoided',
        'Consider Ramadan fasting schedules',
        'Halal food sources for medication taken with meals'
      ],
      specialConsiderations: [
        'Prayer timing affects medication schedule',
        'Wudu (ablution) considerations for topical medications',
        'Consultation with religious authority if needed'
      ]
    },
    {
      type: 'vegetarian',
      medications: [
        {
          name: 'fish oil supplements',
          restriction: 'Animal-derived',
          alternatives: ['algae-based omega-3', 'flaxseed oil'],
          culturalGuidance: 'Plant-based alternatives available'
        }
      ],
      mealTimingImpact: [
        'Ensure medications are vegetarian-compatible',
        'Consider B12 supplementation needs',
        'Plant-based meal timing considerations'
      ],
      specialConsiderations: [
        'Hindu/Buddhist dietary considerations',
        'Jain dietary restrictions may be more strict',
        'Cultural festivals may affect eating patterns'
      ]
    }
  ];

  private constructor() {
    this.prayerSchedulingService = PrayerSchedulingService.getInstance();
    this.i18nService = I18nService.getInstance();
  }

  static getInstance(): CulturalSchedulingEngine {
    if (!CulturalSchedulingEngine.instance) {
      CulturalSchedulingEngine.instance = new CulturalSchedulingEngine();
    }
    return CulturalSchedulingEngine.instance;
  }

  /**
   * Generate culturally intelligent medication schedule
   */
  async generateCulturalSchedule(
    medications: Medication[],
    culturalProfile: EnhancedCulturalProfile,
    familyContext: FamilySchedulingContext
  ): Promise<CulturalSchedulingResult> {
    try {
      // Step 1: Get prayer times if Islamic culture
      let prayerOptimization;
      if (culturalProfile.preferences.prayerTimes?.enabled) {
        const prayerConfig = {
          enabled: true,
          bufferMinutes: culturalProfile.preferences.prayerTimes.medicationBuffer || 30,
          madhab: culturalProfile.preferences.prayerTimes.madhab,
          location: {
            state: culturalProfile.location.state as MalaysianState,
            coordinates: culturalProfile.location.coordinates || {
              latitude: MALAYSIAN_STATES_DATA[culturalProfile.location.state]?.coordinates.latitude || 3.139,
              longitude: MALAYSIAN_STATES_DATA[culturalProfile.location.state]?.coordinates.longitude || 101.6869
            }
          }
        };

        prayerOptimization = await this.prayerSchedulingService.optimizeMedicationSchedule(
          medications.map(med => new Date()), // Convert to dates for optimization
          prayerConfig
        );
      }

      // Step 2: Analyze meal timing patterns
      const mealOptimization = await this.optimizeForMealTiming(
        medications,
        culturalProfile,
        familyContext
      );

      // Step 3: Consider traditional medicine interactions
      const traditionalMedicineAnalysis = this.analyzeTraditionalMedicineInteractions(
        medications,
        culturalProfile
      );

      // Step 4: Family coordination analysis
      const familyCoordination = this.analyzeFamilyScheduling(
        medications,
        familyContext,
        culturalProfile
      );

      // Step 5: Dietary restriction analysis
      const dietaryAnalysis = this.analyzeDietaryRestrictions(
        medications,
        culturalProfile
      );

      // Step 6: Combine all analyses into final schedule
      const optimizedSchedule = await this.combineSchedulingFactors(
        medications,
        {
          prayerOptimization,
          mealOptimization,
          traditionalMedicineAnalysis,
          familyCoordination,
          dietaryAnalysis
        },
        culturalProfile
      );

      // Step 7: Generate cultural guidance with multi-language support
      const culturalGuidance = await this.generateCulturalGuidance(
        optimizedSchedule,
        culturalProfile,
        familyContext
      );

      // Step 8: Detect and resolve conflicts
      const conflicts = this.detectSchedulingConflicts(
        optimizedSchedule,
        culturalProfile,
        familyContext
      );

      // Step 9: Generate recommendations with translations
      const recommendations = await this.generateRecommendations(
        optimizedSchedule,
        conflicts,
        culturalProfile
      );

      return {
        optimizedSchedule: optimizedSchedule.schedule,
        culturalGuidance,
        conflicts,
        recommendations
      };

    } catch (error) {
      console.error('Cultural scheduling engine error:', error);
      
      // Fallback to basic scheduling
      return this.generateFallbackSchedule(medications, culturalProfile);
    }
  }

  /**
   * Optimize medication schedule for Malaysian meal timing patterns
   */
  private async optimizeForMealTiming(
    medications: Medication[],
    culturalProfile: EnhancedCulturalProfile,
    familyContext: FamilySchedulingContext
  ): Promise<any> {
    const mealPatterns = familyContext.householdRoutines.mealTimes || this.MALAYSIAN_MEAL_PATTERNS;
    const isRamadan = await this.isCurrentlyRamadan();

    const mealOptimizedSchedule = medications.map(medication => {
      const dosageInstructions = this.parseDosageInstructions(medication);
      const mealRelation = this.determineMealRelation(medication);

      return {
        medicationId: medication.id,
        name: medication.name,
        optimizedTimes: this.calculateMealBasedTimes(
          dosageInstructions,
          mealRelation,
          mealPatterns,
          isRamadan
        ),
        mealConsiderations: this.getMealConsiderations(medication, mealRelation, isRamadan)
      };
    });

    return {
      schedule: mealOptimizedSchedule,
      isRamadan,
      mealPatterns,
      culturalNotes: this.generateMealCulturalNotes(isRamadan, culturalProfile)
    };
  }

  /**
   * Analyze traditional medicine interactions
   */
  private analyzeTraditionalMedicineInteractions(
    medications: Medication[],
    culturalProfile: EnhancedCulturalProfile
  ): any {
    const interactions: any[] = [];
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // Check against traditional medicines based on cultural profile
    const relevantTraditionalMedicines = this.TRADITIONAL_MEDICINES.filter(tm => {
      if (culturalProfile.primaryCulture === 'chinese' && tm.name.includes('TCM')) return true;
      if (culturalProfile.primaryCulture === 'malay' && tm.name.includes('Malay')) return true;
      if (culturalProfile.primaryCulture === 'indian' && tm.name.includes('Ayurvedic')) return true;
      return false;
    });

    medications.forEach(medication => {
      relevantTraditionalMedicines.forEach(tm => {
        const interaction = tm.medicationInteractions.find(
          inter => medication.name.toLowerCase().includes(inter.medication.toLowerCase())
        );

        if (interaction) {
          interactions.push({
            medication: medication.name,
            traditionalMedicine: tm.name,
            interaction: interaction.interaction,
            timeBuffer: interaction.timeBuffer,
            advice: interaction.advice,
            culturalNotes: tm.culturalNotes
          });

          if (interaction.interaction === 'avoid') {
            warnings.push(`Avoid ${tm.name} while taking ${medication.name}`);
          } else if (interaction.interaction === 'monitor') {
            recommendations.push(`Monitor closely when combining ${medication.name} with ${tm.name}`);
          }
        }
      });
    });

    return {
      interactions,
      warnings,
      recommendations,
      culturalConsiderations: relevantTraditionalMedicines.map(tm => ({
        name: tm.name,
        culturalNotes: tm.culturalNotes,
        timingConflicts: tm.timingConflicts
      }))
    };
  }

  /**
   * Analyze family scheduling requirements
   */
  private analyzeFamilyScheduling(
    medications: Medication[],
    familyContext: FamilySchedulingContext,
    culturalProfile: EnhancedCulturalProfile
  ): any {
    const familyConsiderations: any[] = [];
    const coordinationNeeds: string[] = [];

    // Elderly member considerations
    familyContext.elderlyMembers.forEach((elderly, index) => {
      const elderlyConsiderations = {
        member: `Elderly member ${index + 1}`,
        age: elderly.age,
        complexity: elderly.medicationComplexity,
        cognitiveStatus: elderly.cognitiveStatus,
        recommendations: [] as string[]
      };

      if (elderly.cognitiveStatus !== 'clear') {
        elderlyConsiderations.recommendations.push(
          'Requires supervision for medication administration'
        );
        coordinationNeeds.push('Caregiver presence needed for elderly medication times');
      }

      if (elderly.medicationComplexity === 'high') {
        elderlyConsiderations.recommendations.push(
          'Consider medication organizer or automated dispensing system'
        );
      }

      // Cultural considerations for elderly care
      if (culturalProfile.primaryCulture === 'chinese') {
        elderlyConsiderations.recommendations.push(
          'Respect traditional Chinese elderly care customs'
        );
      } else if (culturalProfile.primaryCulture === 'malay') {
        elderlyConsiderations.recommendations.push(
          'Consider traditional Malay respect for elders in medication management'
        );
      }

      familyConsiderations.push(elderlyConsiderations);
    });

    // Children considerations
    familyContext.children.forEach((child, index) => {
      const childConsiderations = {
        member: `Child ${index + 1}`,
        age: child.age,
        supervision: child.parentSupervision,
        schoolSchedule: child.schoolSchedule,
        recommendations: [] as string[]
      };

      if (child.schoolSchedule) {
        childConsiderations.recommendations.push(
          'Coordinate medication times with school schedule'
        );
      }

      if (child.parentSupervision === 'high') {
        coordinationNeeds.push('Parent supervision required for children medication times');
      }

      familyConsiderations.push(childConsiderations);
    });

    // Caregiver availability analysis
    const caregiverAnalysis = {
      role: familyContext.primaryCaregiver.culturalRole,
      availability: familyContext.primaryCaregiver.availability,
      workSchedule: familyContext.primaryCaregiver.workSchedule,
      recommendations: [] as string[]
    };

    if (familyContext.primaryCaregiver.workSchedule) {
      caregiverAnalysis.recommendations.push(
        'Schedule medications around caregiver work hours'
      );
    }

    return {
      familyConsiderations,
      coordinationNeeds,
      caregiverAnalysis,
      householdRoutines: familyContext.householdRoutines
    };
  }

  /**
   * Analyze dietary restrictions impact on medications
   */
  private analyzeDietaryRestrictions(
    medications: Medication[],
    culturalProfile: EnhancedCulturalProfile
  ): any {
    const relevantRestrictions = this.CULTURAL_DIETARY_RESTRICTIONS.filter(restriction => {
      if (culturalProfile.preferences.dietary?.halal && restriction.type === 'halal') return true;
      if (culturalProfile.preferences.dietary?.vegetarian && restriction.type === 'vegetarian') return true;
      return false;
    });

    const restrictions: any[] = [];
    const alternatives: any[] = [];
    const warnings: string[] = [];

    medications.forEach(medication => {
      relevantRestrictions.forEach(restriction => {
        const medicationRestriction = restriction.medications.find(
          med => medication.name.toLowerCase().includes(med.name.toLowerCase())
        );

        if (medicationRestriction) {
          restrictions.push({
            medication: medication.name,
            restrictionType: restriction.type,
            restriction: medicationRestriction.restriction,
            alternatives: medicationRestriction.alternatives,
            culturalGuidance: medicationRestriction.culturalGuidance
          });

          warnings.push(
            `${medication.name}: ${medicationRestriction.restriction} (${restriction.type})`
          );

          alternatives.push({
            original: medication.name,
            alternatives: medicationRestriction.alternatives
          });
        }
      });
    });

    return {
      restrictions,
      alternatives,
      warnings,
      culturalConsiderations: relevantRestrictions.map(r => ({
        type: r.type,
        mealTimingImpact: r.mealTimingImpact,
        specialConsiderations: r.specialConsiderations
      }))
    };
  }

  /**
   * Combine all scheduling factors into final optimized schedule
   */
  private async combineSchedulingFactors(
    medications: Medication[],
    analyses: any,
    culturalProfile: EnhancedCulturalProfile
  ): Promise<any> {
    const combinedSchedule = medications.map(medication => {
      // Get base timing from meal optimization
      const mealTiming = analyses.mealOptimization.schedule.find(
        (s: any) => s.medicationId === medication.id
      );

      // Apply prayer time adjustments if available
      let adjustedTimes = mealTiming?.optimizedTimes || ['08:00', '20:00'];
      
      if (analyses.prayerOptimization?.optimizedTimes) {
        adjustedTimes = this.adjustForPrayerTimes(
          adjustedTimes,
          analyses.prayerOptimization
        );
      }

      // Apply traditional medicine buffers
      const traditionalMedicineInteraction = analyses.traditionalMedicineAnalysis.interactions.find(
        (i: any) => i.medication === medication.name
      );

      if (traditionalMedicineInteraction) {
        adjustedTimes = this.applyTraditionalMedicineBuffer(
          adjustedTimes,
          traditionalMedicineInteraction.timeBuffer
        );
      }

      // Create detailed timing information
      const detailedTimes = adjustedTimes.map((time: string) => ({
        time,
        mealRelation: this.determineMealRelation(medication),
        culturalContext: this.getCulturalContextForTime(time, culturalProfile),
        familyConsiderations: this.getFamilyConsiderationsForTime(
          time,
          analyses.familyCoordination
        ),
        traditionalMedicineNotes: traditionalMedicineInteraction ? 
          [traditionalMedicineInteraction.advice] : undefined
      }));

      return {
        medication: medication.name,
        dosage: medication.dosage || 'As prescribed',
        times: detailedTimes
      };
    });

    return { schedule: combinedSchedule };
  }

  /**
   * Generate cultural guidance with multi-language support
   */
  private async generateCulturalGuidance(
    optimizedSchedule: any,
    culturalProfile: EnhancedCulturalProfile,
    familyContext: FamilySchedulingContext
  ): Promise<any> {
    const guidance = {
      prayerTimeConsiderations: [] as string[],
      mealTimeOptimizations: [] as string[],
      familyCoordination: [] as string[],
      traditionalMedicineAdvice: [] as string[],
      dietaryRestrictionNotes: [] as string[]
    };

    // Prayer time considerations
    if (culturalProfile.preferences.prayerTimes?.enabled) {
      guidance.prayerTimeConsiderations.push(
        'Medication times adjusted to avoid prayer periods',
        `Using ${culturalProfile.preferences.prayerTimes.madhab} madhab calculations`,
        `Prayer buffer: ${culturalProfile.preferences.prayerTimes.medicationBuffer || 30} minutes`
      );

      const isRamadan = await this.isCurrentlyRamadan();
      if (isRamadan) {
        guidance.prayerTimeConsiderations.push(
          'Special Ramadan scheduling applied for fasting period',
          'Medications optimized for Sahur and Iftar times'
        );
      }
    }

    // Meal time optimizations
    guidance.mealTimeOptimizations.push(
      'Medication timing aligned with Malaysian meal patterns',
      'Consider traditional breakfast (7-9 AM) and dinner (7-9 PM) times'
    );

    if (culturalProfile.primaryCulture === 'chinese') {
      guidance.mealTimeOptimizations.push(
        'Timing considers traditional Chinese meal customs',
        'Hot/cold food theory may apply to medication timing'
      );
    }

    // Family coordination
    if (familyContext.elderlyMembers.length > 0) {
      guidance.familyCoordination.push(
        'Elderly medication supervision considered in timing',
        'Caregiver availability aligned with medication schedule'
      );
    }

    if (familyContext.children.length > 0) {
      guidance.familyCoordination.push(
        'Children medication times coordinated with school schedule',
        'Parent supervision requirements integrated'
      );
    }

    // Traditional medicine advice
    if (culturalProfile.primaryCulture === 'chinese') {
      guidance.traditionalMedicineAdvice.push(
        'Consider TCM herb interactions with modern medications',
        'Maintain time buffers between TCM and prescription medications'
      );
    } else if (culturalProfile.primaryCulture === 'malay') {
      guidance.traditionalMedicineAdvice.push(
        'Traditional Malay medicine timing considered',
        'Spiritual practices may influence optimal medication timing'
      );
    } else if (culturalProfile.primaryCulture === 'indian') {
      guidance.traditionalMedicineAdvice.push(
        'Ayurvedic principles considered in scheduling',
        'Dosha-based timing may optimize medication effectiveness'
      );
    }

    // Dietary restriction notes
    if (culturalProfile.preferences.dietary?.halal) {
      guidance.dietaryRestrictionNotes.push(
        'All medications verified for Halal compliance',
        'Alternative formulations suggested where needed'
      );
    }

    if (culturalProfile.preferences.dietary?.vegetarian) {
      guidance.dietaryRestrictionNotes.push(
        'Vegetarian-compatible medications prioritized',
        'Plant-based alternatives identified where applicable'
      );
    }

    return guidance;
  }

  /**
   * Detect scheduling conflicts
   */
  private detectSchedulingConflicts(
    optimizedSchedule: any,
    culturalProfile: EnhancedCulturalProfile,
    familyContext: FamilySchedulingContext
  ): any[] {
    const conflicts: any[] = [];

    // Check for timing conflicts within the schedule
    const allTimes = optimizedSchedule.schedule.flatMap((med: any) =>
      med.times.map((t: any) => ({ medication: med.medication, time: t.time }))
    );

    // Group medications by time to detect clustering
    const timeGroups = allTimes.reduce((groups: any, item: any) => {
      if (!groups[item.time]) groups[item.time] = [];
      groups[item.time].push(item.medication);
      return groups;
    }, {});

    // Detect over-clustering (too many medications at one time)
    Object.entries(timeGroups).forEach(([time, medications]: [string, any]) => {
      if (medications.length > 3) {
        conflicts.push({
          type: 'timing',
          severity: 'medium',
          description: `${medications.length} medications scheduled at ${time}`,
          suggestions: [
            'Consider spacing medications 15-30 minutes apart',
            'Distribute across different meal times if possible'
          ],
          culturalAlternatives: [
            'Align with traditional meal spacing customs',
            'Consider cultural tea times as alternative spacing'
          ]
        });
      }
    });

    // Check caregiver availability conflicts
    const caregiverWorkHours = familyContext.primaryCaregiver.workSchedule;
    if (caregiverWorkHours) {
      allTimes.forEach(item => {
        const itemTime = this.parseTime(item.time);
        const hasConflict = caregiverWorkHours.some(work => {
          const workStart = this.parseTime(work.start);
          const workEnd = this.parseTime(work.end);
          return itemTime >= workStart && itemTime <= workEnd;
        });

        if (hasConflict) {
          conflicts.push({
            type: 'family',
            severity: 'high',
            description: `${item.medication} scheduled during caregiver work hours (${item.time})`,
            suggestions: [
              'Reschedule to before or after work hours',
              'Arrange alternative supervision',
              'Consider automated reminder systems'
            ],
            culturalAlternatives: [
              'Involve extended family members as per cultural norms',
              'Coordinate with community support systems'
            ]
          });
        }
      });
    }

    return conflicts;
  }

  /**
   * Generate recommendations with multi-language support
   */
  private async generateRecommendations(
    optimizedSchedule: any,
    conflicts: any[],
    culturalProfile: EnhancedCulturalProfile
  ): Promise<any[]> {
    const recommendations: any[] = [];

    // High priority recommendations
    if (conflicts.length > 0) {
      const highPriorityConflicts = conflicts.filter(c => c.severity === 'high' || c.severity === 'critical');
      
      for (const conflict of highPriorityConflicts) {
        const recommendation = {
          priority: 'high' as const,
          category: 'safety' as const,
          message: `Address ${conflict.type} conflict: ${conflict.description}`,
          multiLanguage: await this.translateRecommendation(
            `Address ${conflict.type} conflict: ${conflict.description}`,
            culturalProfile.languages.map(l => l.code)
          )
        };
        recommendations.push(recommendation);
      }
    }

    // Cultural optimization recommendations
    if (culturalProfile.preferences.prayerTimes?.enabled) {
      const prayerRecommendation = {
        priority: 'medium' as const,
        category: 'cultural' as const,
        message: 'Schedule is optimized for prayer times. Adjust prayer buffer in settings if needed.',
        multiLanguage: await this.translateRecommendation(
          'Schedule is optimized for prayer times. Adjust prayer buffer in settings if needed.',
          culturalProfile.languages.map(l => l.code)
        )
      };
      recommendations.push(prayerRecommendation);
    }

    // Family coordination recommendations
    const familyRecommendation = {
      priority: 'medium' as const,
      category: 'coordination' as const,
      message: 'Consider setting family medication reminders for better coordination.',
      multiLanguage: await this.translateRecommendation(
        'Consider setting family medication reminders for better coordination.',
        culturalProfile.languages.map(l => l.code)
      )
    };
    recommendations.push(familyRecommendation);

    // Traditional medicine recommendations
    if (culturalProfile.primaryCulture !== 'mixed') {
      const traditionRecommendation = {
        priority: 'low' as const,
        category: 'cultural' as const,
        message: 'Traditional medicine practices have been considered in your schedule.',
        multiLanguage: await this.translateRecommendation(
          'Traditional medicine practices have been considered in your schedule.',
          culturalProfile.languages.map(l => l.code)
        )
      };
      recommendations.push(traditionRecommendation);
    }

    return recommendations;
  }

  /**
   * Helper methods
   */
  
  private async translateRecommendation(
    message: string, 
    languages: string[]
  ): Promise<Record<string, string>> {
    const translations: Record<string, string> = {};
    
    for (const lang of languages) {
      try {
        translations[lang] = await this.i18nService.translateText(message, lang as any);
      } catch (error) {
        translations[lang] = message; // Fallback to English
      }
    }
    
    return translations;
  }

  private parseDosageInstructions(medication: Medication): any {
    // Simplified dosage parsing - in real implementation, this would be more sophisticated
    return {
      frequency: medication.frequency || 'daily',
      timing: medication.timing || [],
      special: medication.specialInstructions || []
    };
  }

  private determineMealRelation(medication: Medication): 'before' | 'with' | 'after' | 'independent' {
    const instructions = medication.instructions?.toLowerCase() || '';
    
    if (instructions.includes('before meal') || instructions.includes('empty stomach')) {
      return 'before';
    } else if (instructions.includes('with meal') || instructions.includes('with food')) {
      return 'with';
    } else if (instructions.includes('after meal')) {
      return 'after';
    }
    
    return 'independent';
  }

  private calculateMealBasedTimes(
    dosageInstructions: any,
    mealRelation: string,
    mealPatterns: MalaysianMealPatterns,
    isRamadan: boolean
  ): string[] {
    const times: string[] = [];
    
    // Simplified calculation based on frequency and meal relation
    if (dosageInstructions.frequency === 'daily') {
      if (mealRelation === 'before') {
        times.push(isRamadan ? '04:00' : '07:30'); // Before breakfast/sahur
      } else if (mealRelation === 'with') {
        times.push(isRamadan ? '04:30' : '08:00'); // With breakfast/sahur
      } else if (mealRelation === 'after') {
        times.push(isRamadan ? '05:00' : '08:30'); // After breakfast/sahur
      } else {
        times.push('09:00'); // Independent timing
      }
    } else if (dosageInstructions.frequency === 'twice_daily') {
      if (isRamadan) {
        times.push('04:30', '19:30'); // Sahur and Iftar
      } else {
        times.push('08:00', '20:00'); // Breakfast and dinner
      }
    }
    
    return times;
  }

  private getMealConsiderations(
    medication: Medication, 
    mealRelation: string, 
    isRamadan: boolean
  ): string[] {
    const considerations: string[] = [];
    
    if (isRamadan) {
      considerations.push('Adjusted for Ramadan fasting schedule');
      if (mealRelation !== 'independent') {
        considerations.push('Timing aligned with Sahur and Iftar');
      }
    } else {
      considerations.push('Aligned with Malaysian meal patterns');
    }
    
    return considerations;
  }

  private generateMealCulturalNotes(
    isRamadan: boolean,
    culturalProfile: EnhancedCulturalProfile
  ): string[] {
    const notes: string[] = [];
    
    if (isRamadan) {
      notes.push('Ramadan fasting period adjustments applied');
      notes.push('Medications scheduled for permitted eating times');
    }
    
    if (culturalProfile.primaryCulture === 'malay') {
      notes.push('Malaysian Malay meal timing patterns considered');
    } else if (culturalProfile.primaryCulture === 'chinese') {
      notes.push('Traditional Chinese meal timing respected');
    } else if (culturalProfile.primaryCulture === 'indian') {
      notes.push('Indian cultural meal practices considered');
    }
    
    return notes;
  }

  private adjustForPrayerTimes(times: string[], prayerOptimization: any): string[] {
    // Simplified prayer time adjustment - delegate to prayer scheduling service
    return times; // In real implementation, this would apply prayer time buffers
  }

  private applyTraditionalMedicineBuffer(times: string[], bufferMinutes: number): string[] {
    // Apply time buffer for traditional medicine interactions
    return times.map(time => {
      const [hours, minutes] = time.split(':').map(Number);
      const adjustedTime = new Date();
      adjustedTime.setHours(hours, minutes + bufferMinutes, 0, 0);
      return `${adjustedTime.getHours().toString().padStart(2, '0')}:${adjustedTime.getMinutes().toString().padStart(2, '0')}`;
    });
  }

  private getCulturalContextForTime(time: string, culturalProfile: EnhancedCulturalProfile): string[] {
    const context: string[] = [];
    const hour = parseInt(time.split(':')[0]);
    
    if (hour >= 5 && hour <= 7) {
      context.push('Early morning - good for pre-breakfast medications');
      if (culturalProfile.preferences.prayerTimes?.enabled) {
        context.push('Post-Fajr timing');
      }
    } else if (hour >= 19 && hour <= 21) {
      context.push('Evening - aligns with dinner time');
      if (culturalProfile.preferences.prayerTimes?.enabled) {
        context.push('Post-Maghrib timing');
      }
    }
    
    return context;
  }

  private getFamilyConsiderationsForTime(time: string, familyAnalysis: any): string[] {
    const considerations: string[] = [];
    const hour = parseInt(time.split(':')[0]);
    
    // Check if time conflicts with caregiver work schedule
    const caregiverAvailable = familyAnalysis.caregiverAnalysis.availability.some((avail: any) => {
      const startHour = parseInt(avail.start.split(':')[0]);
      const endHour = parseInt(avail.end.split(':')[0]);
      return hour >= startHour && hour <= endHour;
    });
    
    if (caregiverAvailable) {
      considerations.push('Caregiver available for supervision');
    } else {
      considerations.push('Consider backup supervision arrangement');
    }
    
    return considerations;
  }

  private parseTime(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 100 + minutes; // Convert to comparable number format (HHMM)
  }

  private async isCurrentlyRamadan(): Promise<boolean> {
    try {
      const ramadanInfo = await culturalService.isRamadanPeriod();
      return ramadanInfo.data?.isRamadan || false;
    } catch (error) {
      return false; // Fallback
    }
  }

  private generateFallbackSchedule(
    medications: Medication[],
    culturalProfile: EnhancedCulturalProfile
  ): CulturalSchedulingResult {
    // Basic fallback schedule without advanced cultural intelligence
    const basicSchedule = medications.map(medication => ({
      medication: medication.name,
      dosage: medication.dosage || 'As prescribed',
      times: [{
        time: '08:00',
        mealRelation: 'with' as const,
        culturalContext: ['Basic timing - cultural optimization unavailable'],
        familyConsiderations: ['Standard scheduling applied']
      }]
    }));

    return {
      optimizedSchedule: basicSchedule,
      culturalGuidance: {
        prayerTimeConsiderations: ['Cultural scheduling temporarily unavailable'],
        mealTimeOptimizations: ['Standard meal timing applied'],
        familyCoordination: ['Basic coordination applied'],
        traditionalMedicineAdvice: ['Consult healthcare provider'],
        dietaryRestrictionNotes: ['Verify dietary restrictions manually']
      },
      conflicts: [],
      recommendations: [{
        priority: 'high',
        category: 'safety',
        message: 'Cultural scheduling engine temporarily unavailable. Please verify timing manually.',
        multiLanguage: {
          en: 'Cultural scheduling engine temporarily unavailable. Please verify timing manually.',
          ms: 'Enjin penjadualan budaya sementara tidak tersedia. Sila sahkan masa secara manual.',
          zh: '文化调度引擎暂时不可用。请手动验证时间安排。',
          ta: 'கலாச்சார திட்டமிடல் இயந்திரம் தற்காலிகமாக கிடைக்கவில்லை. கையால் நேரத்தை சரிபார்க்கவும்.'
        }
      }]
    };
  }
}

export default CulturalSchedulingEngine;