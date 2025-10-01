/**
 * Traditional Medicine Integration Service
 * 
 * Service for managing interactions between traditional medicines and modern medications
 * in the Malaysian context. Supports TCM (Traditional Chinese Medicine), 
 * Malay traditional medicine (Ubat Tradisional), and Ayurvedic medicine practices.
 */

import { Medication } from '../../types/medication';
import { EnhancedCulturalProfile } from '../../types/cultural';

export interface TraditionalMedicine {
  id: string;
  name: {
    english: string;
    local: string; // Chinese characters, Malay, Tamil, etc.
    scientific?: string;
  };
  type: 'herbal' | 'mineral' | 'animal' | 'combination';
  culture: 'tcm' | 'malay' | 'ayurvedic' | 'general';
  commonUses: string[];
  activeCompounds: string[];
  administration: {
    methods: ('oral' | 'topical' | 'inhalation' | 'bath')[];
    timing: {
      preferredTimes: string[]; // e.g., "empty stomach", "before meals"
      culturalTiming?: string[]; // e.g., "during qi circulation", "after prayers"
      avoidTimes?: string[];
    };
    preparation: string[];
  };
  interactions: TraditionalMedicineInteraction[];
}

export interface TraditionalMedicineInteraction {
  modernMedication: {
    name: string;
    category: string; // e.g., "anticoagulant", "diabetes medication"
    activeIngredient?: string;
  };
  interactionType: 'contraindicated' | 'caution' | 'monitor' | 'synergistic' | 'unknown';
  severity: 'critical' | 'high' | 'medium' | 'low';
  mechanism: string; // How the interaction occurs
  clinicalEvidence: 'strong' | 'moderate' | 'weak' | 'anecdotal';
  timeBuffer: {
    minimum: number; // minutes
    recommended: number; // minutes
    maximum?: number; // minutes
  };
  monitoringRequired: string[];
  culturalConsiderations: string[];
  alternatives: {
    traditionalAlternatives: string[];
    modernAlternatives: string[];
    combinedApproach?: string[];
  };
}

export interface TraditionalMedicineSchedule {
  traditionalMedicine: TraditionalMedicine;
  schedule: Array<{
    time: string;
    dosage: string;
    preparation: string;
    culturalNotes: string[];
  }>;
  modernMedicationBuffers: Array<{
    modernMedication: string;
    bufferBefore: number; // minutes
    bufferAfter: number; // minutes
    reason: string;
  }>;
}

export interface IntegrationAssessment {
  safetyLevel: 'safe' | 'caution' | 'unsafe' | 'unknown';
  recommendations: string[];
  requiredMonitoring: string[];
  timeAdjustments: Array<{
    medication: string;
    originalTime: string;
    adjustedTime: string;
    reason: string;
  }>;
  culturalGuidance: string[];
  consultationNeeded: {
    tcmPractitioner: boolean;
    malayHealer: boolean;
    ayurvedicPractitioner: boolean;
    modernDoctor: boolean;
    pharmacist: boolean;
  };
}

class TraditionalMedicineIntegration {
  private static instance: TraditionalMedicineIntegration;

  // Common traditional medicines in Malaysia
  private readonly TRADITIONAL_MEDICINES: TraditionalMedicine[] = [
    // TCM (Traditional Chinese Medicine)
    {
      id: 'tcm_ginseng',
      name: {
        english: 'Asian Ginseng',
        local: '人参',
        scientific: 'Panax ginseng'
      },
      type: 'herbal',
      culture: 'tcm',
      commonUses: ['energy boost', 'immune support', 'diabetes management'],
      activeCompounds: ['ginsenosides', 'polysaccharides'],
      administration: {
        methods: ['oral'],
        timing: {
          preferredTimes: ['morning', 'before meals'],
          culturalTiming: ['during yang qi peak (morning)'],
          avoidTimes: ['evening', 'with hot foods']
        },
        preparation: ['tea', 'powder', 'capsules', 'raw']
      },
      interactions: [
        {
          modernMedication: {
            name: 'warfarin',
            category: 'anticoagulant',
            activeIngredient: 'warfarin sodium'
          },
          interactionType: 'caution',
          severity: 'high',
          mechanism: 'May affect INR levels and bleeding risk',
          clinicalEvidence: 'moderate',
          timeBuffer: {
            minimum: 120,
            recommended: 240
          },
          monitoringRequired: ['INR levels', 'bleeding signs'],
          culturalConsiderations: [
            'TCM theory suggests avoiding "hot" medicines with blood-thinning herbs',
            'Consult TCM practitioner for constitution assessment'
          ],
          alternatives: {
            traditionalAlternatives: ['American ginseng (cooler nature)', 'Cordyceps'],
            modernAlternatives: ['Discuss with doctor about warfarin alternatives'],
            combinedApproach: ['Reduce ginseng dose', 'More frequent monitoring']
          }
        },
        {
          modernMedication: {
            name: 'diabetes medications',
            category: 'antidiabetic'
          },
          interactionType: 'synergistic',
          severity: 'medium',
          mechanism: 'May enhance blood sugar lowering effects',
          clinicalEvidence: 'moderate',
          timeBuffer: {
            minimum: 60,
            recommended: 120
          },
          monitoringRequired: ['blood glucose levels', 'hypoglycemia symptoms'],
          culturalConsiderations: [
            'TCM views diabetes as kidney and spleen deficiency',
            'Ginseng tonifies qi which may support medication effects'
          ],
          alternatives: {
            traditionalAlternatives: ['Bitter melon', 'Gymnema'],
            modernAlternatives: ['Adjust medication dosing'],
            combinedApproach: ['Start with small ginseng doses', 'Monitor closely']
          }
        }
      ]
    },
    // Malay Traditional Medicine
    {
      id: 'malay_tongkat_ali',
      name: {
        english: 'Tongkat Ali',
        local: 'Tongkat Ali',
        scientific: 'Eurycoma longifolia'
      },
      type: 'herbal',
      culture: 'malay',
      commonUses: ['male vitality', 'energy', 'stress relief'],
      activeCompounds: ['quassinoids', 'alkaloids', 'glycosaponins'],
      administration: {
        methods: ['oral'],
        timing: {
          preferredTimes: ['morning', 'empty stomach'],
          culturalTiming: ['after morning prayers', 'before sunrise'],
          avoidTimes: ['during menstruation', 'with coffee']
        },
        preparation: ['boiled root', 'powder', 'capsules', 'tincture']
      },
      interactions: [
        {
          modernMedication: {
            name: 'blood pressure medications',
            category: 'antihypertensive'
          },
          interactionType: 'monitor',
          severity: 'medium',
          mechanism: 'May have mild blood pressure lowering effects',
          clinicalEvidence: 'weak',
          timeBuffer: {
            minimum: 60,
            recommended: 120
          },
          monitoringRequired: ['blood pressure', 'dizziness', 'fatigue'],
          culturalConsiderations: [
            'Traditional use for "weak constitution" may complement BP treatment',
            'Spiritual preparation often involves prayers and specific timing'
          ],
          alternatives: {
            traditionalAlternatives: ['Misai kucing', 'Pegaga'],
            modernAlternatives: ['Monitor BP response'],
            combinedApproach: ['Start with low doses', 'Traditional preparation methods']
          }
        }
      ]
    },
    // Ayurvedic Medicine
    {
      id: 'ayur_turmeric',
      name: {
        english: 'Turmeric',
        local: 'மஞ்சள்',
        scientific: 'Curcuma longa'
      },
      type: 'herbal',
      culture: 'ayurvedic',
      commonUses: ['inflammation', 'digestive health', 'joint pain'],
      activeCompounds: ['curcumin', 'turmerones'],
      administration: {
        methods: ['oral', 'topical'],
        timing: {
          preferredTimes: ['with meals', 'morning'],
          culturalTiming: ['during kapha time', 'after oil pulling'],
          avoidTimes: ['empty stomach for some', 'before surgery']
        },
        preparation: ['fresh root', 'powder', 'milk', 'paste', 'capsules']
      },
      interactions: [
        {
          modernMedication: {
            name: 'blood thinners',
            category: 'anticoagulant'
          },
          interactionType: 'caution',
          severity: 'medium',
          mechanism: 'May increase bleeding risk',
          clinicalEvidence: 'moderate',
          timeBuffer: {
            minimum: 120,
            recommended: 180
          },
          monitoringRequired: ['bleeding signs', 'bruising', 'clotting tests'],
          culturalConsiderations: [
            'Ayurveda considers turmeric as blood purifier',
            'Dosage and preparation method affect potency',
            'Constitution (prakriti) determines optimal timing'
          ],
          alternatives: {
            traditionalAlternatives: ['Boswellia', 'Ashwagandha'],
            modernAlternatives: ['Topical use only', 'Lower doses'],
            combinedApproach: ['Alternate days', 'Traditional milk preparation']
          }
        }
      ]
    }
  ];

  private constructor() {}

  static getInstance(): TraditionalMedicineIntegration {
    if (!TraditionalMedicineIntegration.instance) {
      TraditionalMedicineIntegration.instance = new TraditionalMedicineIntegration();
    }
    return TraditionalMedicineIntegration.instance;
  }

  /**
   * Assess safety of combining traditional medicines with modern medications
   */
  assessIntegrationSafety(
    modernMedications: Medication[],
    traditionalMedicines: string[], // Traditional medicine names/IDs
    culturalProfile: EnhancedCulturalProfile
  ): IntegrationAssessment {
    const interactions: TraditionalMedicineInteraction[] = [];
    const recommendations: string[] = [];
    const requiredMonitoring: string[] = [];
    const timeAdjustments: Array<{
      medication: string;
      originalTime: string;
      adjustedTime: string;
      reason: string;
    }> = [];
    const culturalGuidance: string[] = [];

    let overallSafetyLevel: IntegrationAssessment['safetyLevel'] = 'safe';
    const consultationNeeded = {
      tcmPractitioner: false,
      malayHealer: false,
      ayurvedicPractitioner: false,
      modernDoctor: false,
      pharmacist: false
    };

    // Find traditional medicines in database
    const foundTraditionalMeds = traditionalMedicines
      .map(tmName => this.findTraditionalMedicine(tmName))
      .filter(tm => tm !== null) as TraditionalMedicine[];

    // Check each combination
    foundTraditionalMeds.forEach(tradMed => {
      modernMedications.forEach(modernMed => {
        const interaction = this.findInteraction(tradMed, modernMed);
        
        if (interaction) {
          interactions.push(interaction);
          
          // Update safety level
          if (interaction.severity === 'critical') {
            overallSafetyLevel = 'unsafe';
          } else if (interaction.severity === 'high' && overallSafetyLevel !== 'unsafe') {
            overallSafetyLevel = 'caution';
          }

          // Add monitoring requirements
          requiredMonitoring.push(...interaction.monitoringRequired);

          // Add cultural guidance
          culturalGuidance.push(...interaction.culturalConsiderations);

          // Calculate time adjustments
          if (modernMed.timing && modernMed.timing.length > 0) {
            modernMed.timing.forEach(time => {
              const adjustedTime = this.calculateAdjustedTime(
                time.time, 
                interaction.timeBuffer.recommended
              );
              
              timeAdjustments.push({
                medication: modernMed.name,
                originalTime: time.time,
                adjustedTime,
                reason: `Buffer for ${tradMed.name.english} interaction`
              });
            });
          }

          // Determine consultation needs
          if (tradMed.culture === 'tcm') {
            consultationNeeded.tcmPractitioner = true;
          } else if (tradMed.culture === 'malay') {
            consultationNeeded.malayHealer = true;
          } else if (tradMed.culture === 'ayurvedic') {
            consultationNeeded.ayurvedicPractitioner = true;
          }

          if (interaction.severity === 'critical' || interaction.severity === 'high') {
            consultationNeeded.modernDoctor = true;
            consultationNeeded.pharmacist = true;
          }
        }
      });

      // Add traditional medicine specific recommendations
      recommendations.push(
        ...this.getTraditionalMedicineRecommendations(tradMed, culturalProfile)
      );
    });

    // Generate general recommendations
    if (interactions.length === 0) {
      recommendations.push('No known interactions found between your medications and traditional medicines.');
    } else {
      recommendations.push(`${interactions.length} potential interactions identified.`);
      
      const criticalInteractions = interactions.filter(i => i.severity === 'critical');
      if (criticalInteractions.length > 0) {
        recommendations.push(
          `⚠️ ${criticalInteractions.length} CRITICAL interactions require immediate medical consultation.`
        );
      }
    }

    // Add cultural-specific guidance
    this.addCulturalSpecificGuidance(culturalGuidance, culturalProfile, foundTraditionalMeds);

    return {
      safetyLevel: overallSafetyLevel,
      recommendations: [...new Set(recommendations)], // Remove duplicates
      requiredMonitoring: [...new Set(requiredMonitoring)],
      timeAdjustments,
      culturalGuidance: [...new Set(culturalGuidance)],
      consultationNeeded
    };
  }

  /**
   * Generate integrated schedule with traditional medicine timing
   */
  generateIntegratedSchedule(
    modernMedications: Medication[],
    traditionalMedicineNames: string[],
    culturalProfile: EnhancedCulturalProfile
  ): {
    modernSchedule: Array<{
      medication: string;
      adjustedTimes: string[];
      buffers: Array<{ reason: string; minutes: number }>;
    }>;
    traditionalSchedule: TraditionalMedicineSchedule[];
    coordinatedGuidance: string[];
  } {
    const assessment = this.assessIntegrationSafety(
      modernMedications, 
      traditionalMedicineNames, 
      culturalProfile
    );

    const modernSchedule = modernMedications.map(med => {
      const relevantAdjustments = assessment.timeAdjustments.filter(
        adj => adj.medication === med.name
      );

      const adjustedTimes = med.timing?.map(t => 
        relevantAdjustments.find(adj => adj.originalTime === t.time)?.adjustedTime || t.time
      ) || ['08:00'];

      const buffers = this.calculateBuffersForMedication(med, traditionalMedicineNames);

      return {
        medication: med.name,
        adjustedTimes,
        buffers
      };
    });

    const traditionalSchedule = traditionalMedicineNames.map(tmName => {
      const tradMed = this.findTraditionalMedicine(tmName);
      if (!tradMed) return null;

      return this.createTraditionalMedicineSchedule(tradMed, modernMedications, culturalProfile);
    }).filter(s => s !== null) as TraditionalMedicineSchedule[];

    const coordinatedGuidance = this.generateCoordinatedGuidance(
      assessment,
      modernSchedule,
      traditionalSchedule,
      culturalProfile
    );

    return {
      modernSchedule,
      traditionalSchedule,
      coordinatedGuidance
    };
  }

  /**
   * Get traditional medicine recommendations for cultural profile
   */
  getTraditionalMedicineRecommendations(
    traditionalMed: TraditionalMedicine,
    culturalProfile: EnhancedCulturalProfile
  ): string[] {
    const recommendations: string[] = [];

    // Culture-specific recommendations
    if (traditionalMed.culture === 'tcm' && culturalProfile.primaryCulture === 'chinese') {
      recommendations.push(
        'Consider your body constitution (寒熱虛實) when taking TCM herbs',
        'Timing based on qi circulation patterns may optimize effectiveness',
        'Consult TCM practitioner for personalized prescription'
      );
    } else if (traditionalMed.culture === 'malay' && culturalProfile.primaryCulture === 'malay') {
      recommendations.push(
        'Traditional Malay medicine often involves spiritual practices',
        'Timing may be aligned with prayer times and Islamic practices',
        'Consult traditional healer (bomoh/dukun) for proper preparation'
      );
    } else if (traditionalMed.culture === 'ayurvedic' && culturalProfile.primaryCulture === 'indian') {
      recommendations.push(
        'Ayurvedic timing considers your dosha (body constitution)',
        'Seasonal and daily rhythm timing affects medicine potency',
        'Consult Ayurvedic practitioner for constitutional assessment'
      );
    }

    // General traditional medicine guidance
    recommendations.push(
      `Best taken: ${traditionalMed.administration.timing.preferredTimes.join(', ')}`,
      `Available preparations: ${traditionalMed.administration.preparation.join(', ')}`
    );

    if (traditionalMed.administration.timing.avoidTimes) {
      recommendations.push(
        `Avoid taking: ${traditionalMed.administration.timing.avoidTimes.join(', ')}`
      );
    }

    return recommendations;
  }

  /**
   * Check for potential herb-drug interactions
   */
  checkHerbDrugInteractions(
    herbName: string,
    modernMedications: Medication[]
  ): Array<{
    medication: string;
    interaction: TraditionalMedicineInteraction | null;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    recommendations: string[];
  }> {
    const herb = this.findTraditionalMedicine(herbName);
    if (!herb) return [];

    return modernMedications.map(med => {
      const interaction = this.findInteraction(herb, med);
      
      let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
      const recommendations: string[] = [];

      if (interaction) {
        switch (interaction.severity) {
          case 'critical':
            riskLevel = 'critical';
            recommendations.push('🚫 DO NOT COMBINE - Consult doctor immediately');
            break;
          case 'high':
            riskLevel = 'high';
            recommendations.push('⚠️ High risk - Medical supervision required');
            break;
          case 'medium':
            riskLevel = 'medium';
            recommendations.push('⚡ Monitor closely - Consider time separation');
            break;
          case 'low':
            riskLevel = 'low';
            recommendations.push('ℹ️ Low risk - Basic precautions recommended');
            break;
        }

        // Add specific recommendations
        recommendations.push(...interaction.alternatives.combinedApproach || []);
      } else {
        recommendations.push('No known interactions - Monitor for unexpected effects');
      }

      return {
        medication: med.name,
        interaction,
        riskLevel,
        recommendations
      };
    });
  }

  /**
   * Private helper methods
   */

  private findTraditionalMedicine(nameOrId: string): TraditionalMedicine | null {
    return this.TRADITIONAL_MEDICINES.find(tm => 
      tm.id === nameOrId || 
      tm.name.english.toLowerCase().includes(nameOrId.toLowerCase()) ||
      tm.name.local.includes(nameOrId) ||
      (tm.name.scientific && tm.name.scientific.toLowerCase().includes(nameOrId.toLowerCase()))
    ) || null;
  }

  private findInteraction(
    traditionalMed: TraditionalMedicine, 
    modernMed: Medication
  ): TraditionalMedicineInteraction | null {
    return traditionalMed.interactions.find(interaction =>
      modernMed.name.toLowerCase().includes(interaction.modernMedication.name.toLowerCase()) ||
      modernMed.category?.toLowerCase().includes(interaction.modernMedication.category.toLowerCase()) ||
      (modernMed.activeIngredient && 
       modernMed.activeIngredient.toLowerCase().includes(interaction.modernMedication.activeIngredient?.toLowerCase() || ''))
    ) || null;
  }

  private calculateAdjustedTime(originalTime: string, bufferMinutes: number): string {
    const [hours, minutes] = originalTime.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes + bufferMinutes;
    
    const adjustedHours = Math.floor(totalMinutes / 60) % 24;
    const adjustedMinutes = totalMinutes % 60;
    
    return `${adjustedHours.toString().padStart(2, '0')}:${adjustedMinutes.toString().padStart(2, '0')}`;
  }

  private calculateBuffersForMedication(
    medication: Medication,
    traditionalMedicineNames: string[]
  ): Array<{ reason: string; minutes: number }> {
    const buffers: Array<{ reason: string; minutes: number }> = [];
    
    traditionalMedicineNames.forEach(tmName => {
      const tradMed = this.findTraditionalMedicine(tmName);
      if (tradMed) {
        const interaction = this.findInteraction(tradMed, medication);
        if (interaction) {
          buffers.push({
            reason: `Buffer for ${tradMed.name.english} interaction`,
            minutes: interaction.timeBuffer.recommended
          });
        }
      }
    });
    
    return buffers;
  }

  private createTraditionalMedicineSchedule(
    traditionalMed: TraditionalMedicine,
    modernMedications: Medication[],
    culturalProfile: EnhancedCulturalProfile
  ): TraditionalMedicineSchedule {
    // Create a basic schedule based on traditional timing preferences
    const preferredTimes = traditionalMed.administration.timing.preferredTimes;
    const culturalTimes = traditionalMed.administration.timing.culturalTiming || [];
    
    // Default to common times if no specific timing
    const defaultTimes = ['08:00', '16:00'];
    const scheduleTimes = preferredTimes.length > 0 ? 
      this.convertPreferredTimesToSchedule(preferredTimes) : defaultTimes;
    
    const schedule = scheduleTimes.map(time => ({
      time,
      dosage: 'As prescribed by traditional medicine practitioner',
      preparation: traditionalMed.administration.preparation[0] || 'Standard preparation',
      culturalNotes: culturalTimes
    }));

    // Calculate buffers for modern medications
    const modernMedicationBuffers = modernMedications.map(med => {
      const interaction = this.findInteraction(traditionalMed, med);
      if (interaction) {
        return {
          modernMedication: med.name,
          bufferBefore: interaction.timeBuffer.recommended,
          bufferAfter: interaction.timeBuffer.recommended,
          reason: interaction.mechanism
        };
      }
      return null;
    }).filter(buffer => buffer !== null) as Array<{
      modernMedication: string;
      bufferBefore: number;
      bufferAfter: number;
      reason: string;
    }>;

    return {
      traditionalMedicine: traditionalMed,
      schedule,
      modernMedicationBuffers
    };
  }

  private convertPreferredTimesToSchedule(preferredTimes: string[]): string[] {
    const timeMap: Record<string, string> = {
      'morning': '08:00',
      'before meals': '07:30',
      'after meals': '08:30',
      'empty stomach': '07:00',
      'evening': '18:00',
      'night': '21:00',
      'bedtime': '22:00'
    };

    return preferredTimes.map(prefTime => {
      const lowerTime = prefTime.toLowerCase();
      return timeMap[lowerTime] || '08:00';
    });
  }

  private generateCoordinatedGuidance(
    assessment: IntegrationAssessment,
    modernSchedule: any[],
    traditionalSchedule: TraditionalMedicineSchedule[],
    culturalProfile: EnhancedCulturalProfile
  ): string[] {
    const guidance: string[] = [];

    guidance.push(
      `Integration safety level: ${assessment.safetyLevel.toUpperCase()}`,
      `Traditional medicines scheduled: ${traditionalSchedule.length}`,
      `Modern medications with adjustments: ${modernSchedule.filter(m => m.buffers.length > 0).length}`
    );

    if (assessment.requiredMonitoring.length > 0) {
      guidance.push(`Monitoring required: ${assessment.requiredMonitoring.join(', ')}`);
    }

    // Add culture-specific coordination advice
    if (culturalProfile.primaryCulture === 'chinese') {
      guidance.push(
        'TCM: Consider "hot" and "cold" nature of medicines when combining',
        'Schedule TCM herbs during appropriate qi circulation times'
      );
    } else if (culturalProfile.primaryCulture === 'malay') {
      guidance.push(
        'Traditional Malay: Align timing with prayer times when possible',
        'Consider spiritual aspects of traditional medicine preparation'
      );
    } else if (culturalProfile.primaryCulture === 'indian') {
      guidance.push(
        'Ayurvedic: Consider dosha timing for optimal effectiveness',
        'Seasonal and daily rhythm affects medicine potency'
      );
    }

    return guidance;
  }

  private addCulturalSpecificGuidance(
    culturalGuidance: string[],
    culturalProfile: EnhancedCulturalProfile,
    traditionalMedicines: TraditionalMedicine[]
  ): void {
    // Add general cultural guidance based on profile
    if (culturalProfile.preferences.dietary?.halal) {
      culturalGuidance.push('Ensure traditional medicine preparations meet halal requirements');
    }

    if (culturalProfile.preferences.prayerTimes?.enabled) {
      culturalGuidance.push(
        'Traditional medicine timing can be coordinated with prayer schedule',
        'Some traditional practices align well with Islamic daily routines'
      );
    }

    // Add guidance based on traditional medicines being used
    const cultures = [...new Set(traditionalMedicines.map(tm => tm.culture))];
    
    cultures.forEach(culture => {
      switch (culture) {
        case 'tcm':
          culturalGuidance.push(
            'TCM practitioners can advise on constitutional compatibility',
            'Consider seasonal adjustments in TCM herb selection'
          );
          break;
        case 'malay':
          culturalGuidance.push(
            'Traditional Malay healers understand local climate effects',
            'Spiritual preparation may be part of traditional treatment'
          );
          break;
        case 'ayurvedic':
          culturalGuidance.push(
            'Ayurvedic timing considers individual constitution (prakriti)',
            'Daily and seasonal rhythms important in Ayurvedic medicine'
          );
          break;
      }
    });
  }
}

export default TraditionalMedicineIntegration;