/**
 * Cultural Dietary Restrictions Service
 * 
 * Comprehensive service for managing medication interactions with Malaysian cultural
 * dietary restrictions including Halal requirements, vegetarian considerations,
 * festival fasting periods, and traditional dietary practices.
 */

import { Medication } from '../../types/medication';
import { EnhancedCulturalProfile, CulturalCalendarEvent } from '../../types/cultural';

export interface DietaryRestriction {
  id: string;
  name: string;
  culture: 'islamic' | 'hindu' | 'buddhist' | 'chinese_traditional' | 'general';
  type: 'religious' | 'cultural' | 'health' | 'traditional';
  description: string;
  restrictions: {
    prohibitedIngredients: string[];
    prohibitedSources: string[];
    prohibitedPreparations: string[];
    prohibitedTiming: string[];
  };
  medicationConsiderations: {
    capsuleRestrictions: boolean;
    alcoholBasedMedications: boolean;
    animalDerivedIngredients: boolean;
    fastingInteractions: boolean;
  };
  alternativeApproaches: string[];
  culturalNotes: string[];
}

export interface MedicationDietaryInteraction {
  medicationName: string;
  restrictionType: string;
  interactionSeverity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  culturalImplications: string[];
  alternatives: Array<{
    alternativeMedication?: string;
    alternativeFormulation: string;
    availability: 'readily_available' | 'special_order' | 'compound_required';
    costImpact: 'none' | 'low' | 'medium' | 'high';
    effectiveness: 'equivalent' | 'slightly_reduced' | 'significantly_reduced';
  }>;
  consultationRequired: {
    pharmacist: boolean;
    doctor: boolean;
    religiousScholar: boolean;
    culturalLeader: boolean;
  };
}

export interface FastingPeriodAnalysis {
  periodName: string;
  culture: string;
  dates: { start: Date; end: Date };
  fastingRules: {
    completelyProhibited: string[];
    timeRestricted: Array<{
      substance: string;
      prohibitedHours: { start: string; end: string };
    }>;
    exceptions: string[];
  };
  medicationImpact: {
    scheduleAdjustment: 'major' | 'minor' | 'none';
    dosageConsiderations: string[];
    timingRecommendations: Array<{
      originalTime: string;
      adjustedTime: string;
      reasoning: string;
    }>;
  };
  culturalGuidance: string[];
}

export interface DietaryComplianceResult {
  overallCompliance: 'compliant' | 'needs_attention' | 'major_issues' | 'non_compliant';
  medicationAssessment: Array<{
    medication: string;
    complianceStatus: 'compliant' | 'questionable' | 'non_compliant';
    issues: string[];
    solutions: string[];
    urgency: 'low' | 'medium' | 'high' | 'critical';
  }>;
  dietaryGuidance: {
    generalRecommendations: string[];
    culturalConsiderations: string[];
    fastingAdjustments: string[];
    alternativeOptions: string[];
  };
  consultationNeeded: {
    level: 'none' | 'pharmacist' | 'doctor' | 'religious_authority' | 'multiple_specialists';
    specialists: string[];
    urgency: 'routine' | 'soon' | 'urgent' | 'immediate';
  };
}

class CulturalDietaryRestrictions {
  private static instance: CulturalDietaryRestrictions;

  // Malaysian cultural dietary restrictions
  private readonly DIETARY_RESTRICTIONS: DietaryRestriction[] = [
    {
      id: 'islamic_halal',
      name: 'Islamic Halal Requirements',
      culture: 'islamic',
      type: 'religious',
      description: 'Islamic dietary laws requiring halal-compliant medications and avoiding haram substances',
      restrictions: {
        prohibitedIngredients: [
          'pork-derived gelatin',
          'ethyl alcohol',
          'bovine gelatin (non-halal source)',
          'stearic acid (animal source)',
          'magnesium stearate (animal source)',
          'shellac'
        ],
        prohibitedSources: [
          'pork',
          'non-halal slaughtered animals',
          'alcohol fermentation',
          'cross-contaminated facilities'
        ],
        prohibitedPreparations: [
          'alcohol-based tinctures',
          'pork gelatin capsules',
          'wine-based extracts'
        ],
        prohibitedTiming: [
          'during Ramadan fasting hours',
          'during other voluntary fasts'
        ]
      },
      medicationConsiderations: {
        capsuleRestrictions: true,
        alcoholBasedMedications: true,
        animalDerivedIngredients: true,
        fastingInteractions: true
      },
      alternativeApproaches: [
        'Vegetarian capsules (HPMC)',
        'Halal-certified medications',
        'Compounded alcohol-free formulations',
        'Alternative active ingredients'
      ],
      culturalNotes: [
        'Necessity (darurat) may permit haram medications in life-threatening situations',
        'Consult Islamic scholar for complex cases',
        'Malaysian JAKIM halal certification preferred',
        'Some medications have halal alternatives from different manufacturers'
      ]
    },
    {
      id: 'hindu_vegetarian',
      name: 'Hindu Vegetarian Dietary Laws',
      culture: 'hindu',
      type: 'religious',
      description: 'Hindu vegetarian principles avoiding animal-derived medication ingredients',
      restrictions: {
        prohibitedIngredients: [
          'gelatin (any animal source)',
          'stearic acid (animal source)',
          'lactose (if vegan)',
          'shellac',
          'carmine (insect-derived coloring)'
        ],
        prohibitedSources: [
          'beef (especially sacred)',
          'any animal-derived ingredients',
          'insect-derived substances'
        ],
        prohibitedPreparations: [
          'gelatin capsules',
          'animal-derived coatings',
          'non-vegetarian stabilizers'
        ],
        prohibitedTiming: [
          'during religious fasting periods',
          'Ekadashi (11th day) fasts',
          'festival fasting days'
        ]
      },
      medicationConsiderations: {
        capsuleRestrictions: true,
        alcoholBasedMedications: false, // Generally acceptable
        animalDerivedIngredients: true,
        fastingInteractions: true
      },
      alternativeApproaches: [
        'Plant-based capsules',
        'Vegetarian formulations',
        'Ayurvedic alternatives where appropriate',
        'Synthetic alternatives to animal ingredients'
      ],
      culturalNotes: [
        'Ahimsa (non-violence) principle guides medication choices',
        'Individual interpretation may vary',
        'Modern synthetic alternatives often acceptable',
        'Ayurvedic integration may complement modern medicine'
      ]
    },
    {
      id: 'buddhist_vegetarian',
      name: 'Buddhist Vegetarian Practice',
      culture: 'buddhist',
      type: 'religious',
      description: 'Buddhist vegetarian principles emphasizing compassion and non-harm',
      restrictions: {
        prohibitedIngredients: [
          'gelatin (animal source)',
          'animal-derived ingredients',
          'alcohol (some traditions)',
          'garlic, onion extracts (some traditions)'
        ],
        prohibitedSources: [
          'all animal sources',
          'insect-derived substances'
        ],
        prohibitedPreparations: [
          'animal gelatin capsules',
          'alcohol-based extracts (some traditions)'
        ],
        prohibitedTiming: [
          'during retreat periods',
          'specific fasting days',
          'Vesak day observances'
        ]
      },
      medicationConsiderations: {
        capsuleRestrictions: true,
        alcoholBasedMedications: false, // Varies by tradition
        animalDerivedIngredients: true,
        fastingInteractions: true
      },
      alternativeApproaches: [
        'Vegetarian capsules',
        'Plant-based formulations',
        'Traditional Chinese medicine integration',
        'Compassionate use exceptions for serious illness'
      ],
      culturalNotes: [
        'Compassion principle may allow necessary medications',
        'Individual practice interpretation varies',
        'Traditional Chinese medicine often acceptable',
        'Mindful consumption approach'
      ]
    },
    {
      id: 'chinese_traditional',
      name: 'Traditional Chinese Dietary Practices',
      culture: 'chinese_traditional',
      type: 'traditional',
      description: 'Traditional Chinese medicine dietary principles affecting medication timing',
      restrictions: {
        prohibitedIngredients: [],
        prohibitedSources: [],
        prohibitedPreparations: [],
        prohibitedTiming: [
          'conflicting with TCM herb timing',
          'during "cooling" periods for "hot" constitution',
          'festival fasting periods'
        ]
      },
      medicationConsiderations: {
        capsuleRestrictions: false,
        alcoholBasedMedications: false,
        animalDerivedIngredients: false,
        fastingInteractions: true
      },
      alternativeApproaches: [
        'Coordinate with TCM practitioner',
        'Adjust timing based on qi circulation',
        'Consider food-medicine interactions',
        'Seasonal adjustments'
      ],
      culturalNotes: [
        'Hot/cold balance important in timing',
        'Lunar calendar affects some practices',
        'Individual constitution determines optimal approach',
        'Integration with TCM requires careful planning'
      ]
    }
  ];

  // Fasting periods and their medication implications
  private readonly FASTING_PERIODS: Partial<FastingPeriodAnalysis>[] = [
    {
      periodName: 'Ramadan',
      culture: 'islamic',
      fastingRules: {
        completelyProhibited: [
          'food',
          'water',
          'oral medications (during fasting hours)',
          'liquid medications'
        ],
        timeRestricted: [
          {
            substance: 'all oral intake',
            prohibitedHours: { start: '05:00', end: '19:15' } // Approximate, varies by location
          }
        ],
        exceptions: [
          'life-threatening medical conditions',
          'diabetes with severe hypoglycemia risk',
          'elderly with medical exemption',
          'pregnant/nursing mothers with medical advice'
        ]
      },
      medicationImpact: {
        scheduleAdjustment: 'major',
        dosageConsiderations: [
          'Combine doses where medically safe',
          'Use long-acting formulations',
          'Adjust to pre-dawn and post-sunset timing'
        ],
        timingRecommendations: [
          {
            originalTime: '08:00',
            adjustedTime: '05:00',
            reasoning: 'Pre-dawn (Sahur) timing before fast begins'
          },
          {
            originalTime: '13:00',
            adjustedTime: '19:30',
            reasoning: 'Post-sunset (Iftar) timing after fast ends'
          },
          {
            originalTime: '18:00',
            adjustedTime: '21:00',
            reasoning: 'Evening timing after Iftar meal'
          }
        ]
      },
      culturalGuidance: [
        'Consult Islamic scholar for complex medical situations',
        'Medical necessity (darurat) may override fasting requirements',
        'Insulin injections generally permissible during fasting',
        'Topical medications usually acceptable'
      ]
    },
    {
      periodName: 'Ekadashi',
      culture: 'hindu',
      fastingRules: {
        completelyProhibited: [
          'grains',
          'legumes',
          'certain vegetables'
        ],
        timeRestricted: [
          {
            substance: 'food (partial fast)',
            prohibitedHours: { start: '06:00', end: '18:00' }
          }
        ],
        exceptions: [
          'medical necessity',
          'pregnancy',
          'elderly with health conditions',
          'children under 12'
        ]
      },
      medicationImpact: {
        scheduleAdjustment: 'minor',
        dosageConsiderations: [
          'Take with permitted foods',
          'Timing adjustment may be needed',
          'Liquid medications generally acceptable'
        ],
        timingRecommendations: []
      },
      culturalGuidance: [
        'Individual interpretation varies',
        'Medical needs generally override fasting',
        'Consult with family elder or religious guide'
      ]
    }
  ];

  private constructor() {}

  static getInstance(): CulturalDietaryRestrictions {
    if (!CulturalDietaryRestrictions.instance) {
      CulturalDietaryRestrictions.instance = new CulturalDietaryRestrictions();
    }
    return CulturalDietaryRestrictions.instance;
  }

  /**
   * Assess dietary compliance for medications
   */
  assessDietaryCompliance(
    medications: Medication[],
    culturalProfile: EnhancedCulturalProfile,
    currentFastingPeriods?: CulturalCalendarEvent[]
  ): DietaryComplianceResult {
    try {
      // Find applicable dietary restrictions
      const applicableRestrictions = this.getApplicableRestrictions(culturalProfile);
      
      // Assess each medication
      const medicationAssessments = medications.map(medication => 
        this.assessMedicationCompliance(medication, applicableRestrictions)
      );

      // Determine overall compliance
      const overallCompliance = this.calculateOverallCompliance(medicationAssessments);

      // Generate dietary guidance
      const dietaryGuidance = this.generateDietaryGuidance(
        applicableRestrictions,
        medicationAssessments,
        culturalProfile,
        currentFastingPeriods
      );

      // Determine consultation needs
      const consultationNeeded = this.determineConsultationNeeds(medicationAssessments);

      return {
        overallCompliance,
        medicationAssessment: medicationAssessments,
        dietaryGuidance,
        consultationNeeded
      };

    } catch (error) {
      console.error('Dietary compliance assessment error:', error);
      
      // Return safe fallback
      return this.generateFallbackCompliance(medications, culturalProfile);
    }
  }

  /**
   * Analyze fasting period impacts on medication schedule
   */
  analyzeFastingImpact(
    medications: Medication[],
    fastingPeriod: string,
    culturalProfile: EnhancedCulturalProfile
  ): FastingPeriodAnalysis | null {
    const fastingTemplate = this.FASTING_PERIODS.find(fp => 
      fp.periodName?.toLowerCase() === fastingPeriod.toLowerCase()
    );

    if (!fastingTemplate) {
      return null;
    }

    // Calculate current year dates (simplified - in real implementation, use proper calendar calculations)
    const currentYear = new Date().getFullYear();
    let startDate: Date, endDate: Date;

    if (fastingPeriod.toLowerCase() === 'ramadan') {
      // Approximate Ramadan dates (in real implementation, use Islamic calendar)
      startDate = new Date(currentYear, 3, 13); // April 13
      endDate = new Date(currentYear, 4, 12); // May 12
    } else {
      startDate = new Date();
      endDate = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day
    }

    // Analyze medication impact
    const medicationImpact = {
      scheduleAdjustment: fastingTemplate.medicationImpact?.scheduleAdjustment || 'none',
      dosageConsiderations: fastingTemplate.medicationImpact?.dosageConsiderations || [],
      timingRecommendations: medications.flatMap(medication => {
        return medication.timing?.map(timing => {
          // Find appropriate adjusted time
          const recommendation = fastingTemplate.medicationImpact?.timingRecommendations?.find(
            tr => tr.originalTime === timing.time
          );
          
          return {
            originalTime: timing.time,
            adjustedTime: recommendation?.adjustedTime || timing.time,
            reasoning: recommendation?.reasoning || 'No adjustment needed'
          };
        }) || [];
      })
    } as FastingPeriodAnalysis['medicationImpact'];

    return {
      periodName: fastingTemplate.periodName!,
      culture: fastingTemplate.culture!,
      dates: { start: startDate, end: endDate },
      fastingRules: fastingTemplate.fastingRules!,
      medicationImpact,
      culturalGuidance: fastingTemplate.culturalGuidance || []
    };
  }

  /**
   * Find halal alternatives for medications
   */
  findHalalAlternatives(
    medication: Medication
  ): Array<{
    alternativeName: string;
    availability: string;
    certificationStatus: string;
    notes: string[];
  }> {
    const alternatives: Array<{
      alternativeName: string;
      availability: string;
      certificationStatus: string;
      notes: string[];
    }> = [];

    // Common halal alternatives (this would be a comprehensive database in real implementation)
    const commonAlternatives = [
      {
        originalIssue: 'gelatin capsules',
        alternative: 'HPMC (hydroxypropyl methylcellulose) capsules',
        availability: 'readily_available',
        certification: 'halal_certified',
        notes: ['Plant-based capsule material', 'Widely accepted halal alternative']
      },
      {
        originalIssue: 'alcohol-based syrups',
        alternative: 'Alcohol-free liquid formulations',
        availability: 'special_order',
        certification: 'halal_certified',
        notes: ['Glycerin-based alternatives available', 'May require compounding']
      },
      {
        originalIssue: 'animal-derived stearates',
        alternative: 'Plant-based stearic acid',
        availability: 'readily_available',
        certification: 'halal_certified',
        notes: ['Palm oil or coconut oil derived', 'Functionally equivalent']
      }
    ];

    // Check medication against common issues and suggest alternatives
    const medicationName = medication.name.toLowerCase();
    const medicationForm = medication.form?.toLowerCase() || '';

    if (medicationForm.includes('capsule') || medicationName.includes('capsule')) {
      alternatives.push({
        alternativeName: `${medication.name} in HPMC capsules`,
        availability: 'readily_available',
        certificationStatus: 'halal_certified',
        notes: [
          'Vegetarian capsule alternative',
          'Same active ingredient, halal capsule material',
          'Available from multiple manufacturers'
        ]
      });
    }

    if (medicationForm.includes('syrup') || medicationForm.includes('liquid')) {
      alternatives.push({
        alternativeName: `${medication.name} alcohol-free formulation`,
        availability: 'special_order',
        certificationStatus: 'halal_certified',
        notes: [
          'Alcohol-free base using glycerin or propylene glycol',
          'May require special order or compounding',
          'Taste may differ slightly from original'
        ]
      });
    }

    return alternatives;
  }

  /**
   * Generate meal timing recommendations considering dietary restrictions
   */
  generateMealTimingRecommendations(
    medications: Medication[],
    culturalProfile: EnhancedCulturalProfile,
    currentFastingPeriod?: string
  ): Array<{
    medication: string;
    originalTiming: string;
    recommendedTiming: string;
    mealRelation: 'before' | 'with' | 'after' | 'independent';
    culturalConsiderations: string[];
    fastingAdjustments: string[];
  }> {
    const recommendations: Array<{
      medication: string;
      originalTiming: string;
      recommendedTiming: string;
      mealRelation: 'before' | 'with' | 'after' | 'independent';
      culturalConsiderations: string[];
      fastingAdjustments: string[];
    }> = [];

    medications.forEach(medication => {
      medication.timing?.forEach(timing => {
        let recommendedTiming = timing.time;
        const culturalConsiderations: string[] = [];
        const fastingAdjustments: string[] = [];
        
        // Determine meal relation
        const instructions = medication.instructions?.toLowerCase() || '';
        let mealRelation: 'before' | 'with' | 'after' | 'independent' = 'independent';
        
        if (instructions.includes('before meal') || instructions.includes('empty stomach')) {
          mealRelation = 'before';
        } else if (instructions.includes('with meal') || instructions.includes('with food')) {
          mealRelation = 'with';
        } else if (instructions.includes('after meal')) {
          mealRelation = 'after';
        }

        // Apply cultural considerations
        if (culturalProfile.preferences.dietary?.halal) {
          culturalConsiderations.push('Ensure meal is halal-compliant when taking with food');
          if (mealRelation === 'with') {
            culturalConsiderations.push('Verify medication ingredients are halal-certified');
          }
        }

        if (culturalProfile.preferences.dietary?.vegetarian) {
          culturalConsiderations.push('Ensure vegetarian meal when taking with food');
          culturalConsiderations.push('Check medication for vegetarian-compatible ingredients');
        }

        // Apply fasting adjustments
        if (currentFastingPeriod === 'ramadan') {
          const fastingAnalysis = this.analyzeFastingImpact(
            [medication], 
            'ramadan', 
            culturalProfile
          );
          
          if (fastingAnalysis) {
            const adjustment = fastingAnalysis.medicationImpact.timingRecommendations.find(
              tr => tr.originalTime === timing.time
            );
            
            if (adjustment) {
              recommendedTiming = adjustment.adjustedTime;
              fastingAdjustments.push(adjustment.reasoning);
            }
            
            if (mealRelation !== 'independent') {
              fastingAdjustments.push('Meal timing adjusted for Ramadan fasting schedule');
            }
          }
        }

        recommendations.push({
          medication: medication.name,
          originalTiming: timing.time,
          recommendedTiming,
          mealRelation,
          culturalConsiderations,
          fastingAdjustments
        });
      });
    });

    return recommendations;
  }

  /**
   * Private helper methods
   */
  
  private getApplicableRestrictions(culturalProfile: EnhancedCulturalProfile): DietaryRestriction[] {
    const applicable: DietaryRestriction[] = [];

    // Add Islamic restrictions if Muslim
    if (culturalProfile.religion === 'islam' || culturalProfile.preferences.dietary?.halal) {
      const islamicRestriction = this.DIETARY_RESTRICTIONS.find(r => r.id === 'islamic_halal');
      if (islamicRestriction) applicable.push(islamicRestriction);
    }

    // Add Hindu restrictions if Hindu and vegetarian
    if (culturalProfile.religion === 'hinduism' || culturalProfile.preferences.dietary?.vegetarian) {
      const hinduRestriction = this.DIETARY_RESTRICTIONS.find(r => r.id === 'hindu_vegetarian');
      if (hinduRestriction) applicable.push(hinduRestriction);
    }

    // Add Buddhist restrictions if Buddhist
    if (culturalProfile.religion === 'buddhism') {
      const buddhistRestriction = this.DIETARY_RESTRICTIONS.find(r => r.id === 'buddhist_vegetarian');
      if (buddhistRestriction) applicable.push(buddhistRestriction);
    }

    // Add Chinese traditional if Chinese culture
    if (culturalProfile.primaryCulture === 'chinese') {
      const chineseRestriction = this.DIETARY_RESTRICTIONS.find(r => r.id === 'chinese_traditional');
      if (chineseRestriction) applicable.push(chineseRestriction);
    }

    return applicable;
  }

  private assessMedicationCompliance(
    medication: Medication,
    restrictions: DietaryRestriction[]
  ): any {
    const issues: string[] = [];
    const solutions: string[] = [];
    let urgency: 'low' | 'medium' | 'high' | 'critical' = 'low';
    let complianceStatus: 'compliant' | 'questionable' | 'non_compliant' = 'compliant';

    restrictions.forEach(restriction => {
      // Check for prohibited ingredients (simplified check)
      const medicationName = medication.name.toLowerCase();
      const medicationForm = medication.form?.toLowerCase() || '';
      
      restriction.restrictions.prohibitedIngredients.forEach(ingredient => {
        if (medicationName.includes(ingredient.toLowerCase()) || 
            medicationForm.includes(ingredient.toLowerCase())) {
          issues.push(`Contains ${ingredient} which violates ${restriction.name}`);
          complianceStatus = 'non_compliant';
          urgency = 'high';
          
          // Suggest alternatives
          solutions.push(`Consider ${restriction.name}-compliant alternative formulation`);
        }
      });

      // Check capsule restrictions
      if (restriction.medicationConsiderations.capsuleRestrictions && 
          medicationForm.includes('capsule')) {
        issues.push(`Capsule form may not comply with ${restriction.name}`);
        complianceStatus = 'questionable';
        if (urgency === 'low') urgency = 'medium';
        
        solutions.push('Consider vegetarian/HPMC capsule alternative');
      }

      // Check alcohol-based medications
      if (restriction.medicationConsiderations.alcoholBasedMedications && 
          (medicationForm.includes('syrup') || medicationForm.includes('liquid'))) {
        issues.push(`Liquid formulation may contain alcohol, violating ${restriction.name}`);
        complianceStatus = 'questionable';
        if (urgency === 'low') urgency = 'medium';
        
        solutions.push('Verify alcohol content and consider alcohol-free alternatives');
      }
    });

    return {
      medication: medication.name,
      complianceStatus,
      issues,
      solutions,
      urgency
    };
  }

  private calculateOverallCompliance(assessments: any[]): 'compliant' | 'needs_attention' | 'major_issues' | 'non_compliant' {
    const nonCompliant = assessments.filter(a => a.complianceStatus === 'non_compliant').length;
    const questionable = assessments.filter(a => a.complianceStatus === 'questionable').length;
    const critical = assessments.filter(a => a.urgency === 'critical').length;
    const high = assessments.filter(a => a.urgency === 'high').length;

    if (critical > 0 || nonCompliant >= assessments.length / 2) {
      return 'non_compliant';
    } else if (high > 0 || nonCompliant > 0) {
      return 'major_issues';
    } else if (questionable > 0) {
      return 'needs_attention';
    } else {
      return 'compliant';
    }
  }

  private generateDietaryGuidance(
    restrictions: DietaryRestriction[],
    assessments: any[],
    culturalProfile: EnhancedCulturalProfile,
    fastingPeriods?: CulturalCalendarEvent[]
  ): any {
    const guidance = {
      generalRecommendations: [] as string[],
      culturalConsiderations: [] as string[],
      fastingAdjustments: [] as string[],
      alternativeOptions: [] as string[]
    };

    // General recommendations
    guidance.generalRecommendations.push(
      'Always verify medication ingredients with pharmacist',
      'Keep a list of acceptable and non-acceptable ingredients',
      'Inform all healthcare providers about dietary restrictions'
    );

    // Cultural considerations
    restrictions.forEach(restriction => {
      guidance.culturalConsiderations.push(...restriction.culturalNotes);
      guidance.alternativeOptions.push(...restriction.alternativeApproaches);
    });

    // Fasting adjustments
    if (fastingPeriods && fastingPeriods.length > 0) {
      guidance.fastingAdjustments.push(
        'Coordinate medication timing with fasting schedule',
        'Consult religious authority for complex medical situations',
        'Consider long-acting formulations during fasting periods'
      );
    }

    return guidance;
  }

  private determineConsultationNeeds(assessments: any[]): any {
    const criticalIssues = assessments.filter(a => a.urgency === 'critical').length;
    const highIssues = assessments.filter(a => a.urgency === 'high').length;
    const nonCompliant = assessments.filter(a => a.complianceStatus === 'non_compliant').length;

    let level: 'none' | 'pharmacist' | 'doctor' | 'religious_authority' | 'multiple_specialists' = 'none';
    let urgency: 'routine' | 'soon' | 'urgent' | 'immediate' = 'routine';
    const specialists: string[] = [];

    if (criticalIssues > 0) {
      level = 'multiple_specialists';
      urgency = 'immediate';
      specialists.push('doctor', 'pharmacist', 'religious_authority');
    } else if (highIssues > 0 || nonCompliant > 0) {
      level = 'doctor';
      urgency = 'urgent';
      specialists.push('doctor', 'pharmacist');
    } else if (assessments.some(a => a.complianceStatus === 'questionable')) {
      level = 'pharmacist';
      urgency = 'soon';
      specialists.push('pharmacist');
    }

    return { level, specialists, urgency };
  }

  private generateFallbackCompliance(
    medications: Medication[],
    culturalProfile: EnhancedCulturalProfile
  ): DietaryComplianceResult {
    const medicationAssessment = medications.map(med => ({
      medication: med.name,
      complianceStatus: 'questionable' as const,
      issues: ['Unable to assess dietary compliance - system unavailable'],
      solutions: ['Manually verify ingredients with pharmacist'],
      urgency: 'medium' as const
    }));

    return {
      overallCompliance: 'needs_attention',
      medicationAssessment,
      dietaryGuidance: {
        generalRecommendations: [
          'Dietary compliance system temporarily unavailable',
          'Manually verify all medications with pharmacist',
          'Consult religious/cultural authority if needed'
        ],
        culturalConsiderations: ['Standard precautions recommended'],
        fastingAdjustments: ['Manual scheduling required'],
        alternativeOptions: ['Consult healthcare provider for alternatives']
      },
      consultationNeeded: {
        level: 'pharmacist',
        specialists: ['pharmacist'],
        urgency: 'soon'
      }
    };
  }
}

export default CulturalDietaryRestrictions;