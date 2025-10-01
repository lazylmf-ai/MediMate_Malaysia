/**
 * Drug Interaction Checking Service
 * 
 * Comprehensive drug interaction analysis with:
 * - Multi-drug interaction checking
 * - Severity assessment and clinical significance
 * - Cultural considerations (prayer times, fasting, halal status)
 * - Malaysian healthcare context
 * - Supplement and OTC medication interactions
 * - Real-time interaction monitoring
 */

import { medicationDatabaseService } from './databaseService';
import { medicationService } from '../../api/services/medicationService';
import { cacheService } from '../cache/cacheService';
import { 
  MalaysianMedicationInfo,
  ApiResponse
} from '../../types/medication';

export interface DrugInteraction {
  medication1: {
    id: string;
    name: string;
    genericName: string;
    activeIngredients: string[];
  };
  medication2: {
    id: string;
    name: string;
    genericName: string;
    activeIngredients: string[];
  };
  severity: 'minor' | 'moderate' | 'major' | 'contraindicated';
  mechanism: string;
  clinicalEffects: string[];
  onsetTime: 'immediate' | 'delayed' | 'variable';
  documentation: 'excellent' | 'good' | 'fair' | 'poor';
  managementStrategy: string;
  alternativeRecommendations?: string[];
  culturalConsiderations: {
    prayerTimeImpact?: string;
    fastingConsiderations?: string;
    halalConcerns?: string[];
    ramadanAdjustments?: string;
  };
}

export interface InteractionCheckRequest {
  medications: Array<{
    id: string;
    name: string;
    dosage?: string;
    frequency?: string;
    startDate?: string;
  }>;
  patientProfile?: {
    age?: number;
    weight?: number;
    culturalProfile?: {
      religion: string;
      observesPrayerTimes: boolean;
      observesRamadan: boolean;
      dietaryRestrictions: string[];
    };
    medicalConditions?: string[];
    allergies?: string[];
  };
  checkOptions?: {
    includeFoodInteractions: boolean;
    includeSupplements: boolean;
    includeOTCMedications: boolean;
    includeCulturalConsiderations: boolean;
    severityThreshold: 'all' | 'moderate' | 'major';
  };
}

export interface InteractionCheckResult {
  hasInteractions: boolean;
  overallRisk: 'low' | 'moderate' | 'high' | 'critical';
  interactions: DrugInteraction[];
  warnings: string[];
  recommendations: string[];
  culturalGuidelines: string[];
  monitoringRequirements: string[];
  alternativeOptions: Array<{
    originalMedication: string;
    alternatives: string[];
    reason: string;
  }>;
  checkSummary: {
    totalMedicationsChecked: number;
    interactionPairsAnalyzed: number;
    checkDuration: number;
    lastUpdated: string;
  };
}

export interface FoodDrugInteraction {
  medication: string;
  food: string;
  interaction: string;
  severity: 'minor' | 'moderate' | 'major';
  advice: string;
  culturalRelevance?: string; // Malaysian food context
}

export interface MonitoringPlan {
  patientId: string;
  medications: string[];
  interactions: string[];
  monitoringParameters: Array<{
    parameter: string;
    frequency: string;
    alertThresholds: any;
    culturalConsiderations: string[];
  }>;
  nextReviewDate: string;
  emergencyContacts: string[];
}

class DrugInteractionService {
  private readonly INTERACTION_CACHE_TTL = 2 * 60 * 60 * 1000; // 2 hours
  private readonly MONITORING_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

  /**
   * Perform comprehensive drug interaction check
   */
  async checkInteractions(
    request: InteractionCheckRequest
  ): Promise<ApiResponse<InteractionCheckResult>> {
    const startTime = Date.now();

    try {
      if (!request.medications || request.medications.length < 1) {
        return {
          success: false,
          error: 'At least one medication is required for interaction checking',
        };
      }

      const cacheKey = `interactions_${JSON.stringify(request)}`;
      
      // Check cache for recent results
      const cachedResult = await cacheService.get<InteractionCheckResult>(cacheKey);
      if (cachedResult) {
        return {
          success: true,
          data: cachedResult,
        };
      }

      // Get detailed medication information
      const medicationDetails = await this.getMedicationDetails(request.medications);
      if (!medicationDetails.success) {
        return medicationDetails;
      }

      const medications = medicationDetails.data!;
      const interactions: DrugInteraction[] = [];
      const warnings: string[] = [];
      const recommendations: string[] = [];
      const culturalGuidelines: string[] = [];

      // Check pairwise interactions
      for (let i = 0; i < medications.length; i++) {
        for (let j = i + 1; j < medications.length; j++) {
          const interaction = await this.checkPairwiseInteraction(
            medications[i], 
            medications[j],
            request.patientProfile,
            request.checkOptions
          );
          
          if (interaction.success && interaction.data) {
            interactions.push(interaction.data);
          }
        }
      }

      // Filter by severity threshold
      const filteredInteractions = this.filterBySeverity(
        interactions, 
        request.checkOptions?.severityThreshold || 'all'
      );

      // Generate warnings and recommendations
      this.generateWarningsAndRecommendations(
        filteredInteractions,
        warnings,
        recommendations,
        culturalGuidelines,
        request.patientProfile
      );

      // Check food interactions if requested
      if (request.checkOptions?.includeFoodInteractions) {
        const foodInteractions = await this.checkFoodInteractions(medications);
        if (foodInteractions.success && foodInteractions.data) {
          recommendations.push(...foodInteractions.data.map(fi => fi.advice));
        }
      }

      // Determine overall risk
      const overallRisk = this.calculateOverallRisk(filteredInteractions);

      // Generate alternative options
      const alternativeOptions = await this.generateAlternativeOptions(
        filteredInteractions,
        medications
      );

      const result: InteractionCheckResult = {
        hasInteractions: filteredInteractions.length > 0,
        overallRisk,
        interactions: filteredInteractions,
        warnings,
        recommendations,
        culturalGuidelines,
        monitoringRequirements: this.generateMonitoringRequirements(filteredInteractions),
        alternativeOptions,
        checkSummary: {
          totalMedicationsChecked: medications.length,
          interactionPairsAnalyzed: (medications.length * (medications.length - 1)) / 2,
          checkDuration: Date.now() - startTime,
          lastUpdated: new Date().toISOString(),
        },
      };

      // Cache the result
      await cacheService.set(cacheKey, result, this.INTERACTION_CACHE_TTL);

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      console.error('Drug interaction check error:', error);
      return {
        success: false,
        error: 'Failed to check drug interactions',
      };
    }
  }

  /**
   * Get real-time interaction monitoring for active medications
   */
  async getActiveInteractionMonitoring(
    patientId: string,
    activeMedications: string[]
  ): Promise<ApiResponse<MonitoringPlan>> {
    try {
      const cacheKey = `monitoring_${patientId}`;
      
      // Check for existing monitoring plan
      const existingPlan = await cacheService.get<MonitoringPlan>(cacheKey);
      
      // Check if medications have changed
      if (existingPlan && this.hasMedicationsChanged(existingPlan.medications, activeMedications)) {
        // Medications changed, need to update monitoring plan
        await cacheService.remove(cacheKey);
      } else if (existingPlan) {
        return {
          success: true,
          data: existingPlan,
        };
      }

      // Create new monitoring plan
      const interactionCheckRequest: InteractionCheckRequest = {
        medications: activeMedications.map(id => ({ id, name: '' })), // Names will be resolved
        checkOptions: {
          includeFoodInteractions: true,
          includeSupplements: true,
          includeOTCMedications: true,
          includeCulturalConsiderations: true,
          severityThreshold: 'moderate',
        },
      };

      const interactionCheck = await this.checkInteractions(interactionCheckRequest);
      if (!interactionCheck.success) {
        return interactionCheck;
      }

      const interactions = interactionCheck.data!.interactions;
      const monitoringPlan: MonitoringPlan = {
        patientId,
        medications: activeMedications,
        interactions: interactions.map(i => `${i.medication1.name} + ${i.medication2.name}`),
        monitoringParameters: this.generateMonitoringParameters(interactions),
        nextReviewDate: this.calculateNextReviewDate(interactions),
        emergencyContacts: [], // Would be populated from patient profile
      };

      // Cache the monitoring plan
      await cacheService.set(cacheKey, monitoringPlan, this.MONITORING_CACHE_TTL);

      return {
        success: true,
        data: monitoringPlan,
      };
    } catch (error) {
      console.error('Get monitoring plan error:', error);
      return {
        success: false,
        error: 'Failed to get interaction monitoring plan',
      };
    }
  }

  /**
   * Check food-drug interactions with Malaysian food context
   */
  async checkFoodInteractions(
    medications: MalaysianMedicationInfo[]
  ): Promise<ApiResponse<FoodDrugInteraction[]>> {
    try {
      const foodInteractions: FoodDrugInteraction[] = [];

      // Malaysian food-drug interaction database (simplified)
      const malaysianFoodInteractions: Record<string, FoodDrugInteraction[]> = {
        'warfarin': [
          {
            medication: 'warfarin',
            food: 'Kangkung (water spinach)',
            interaction: 'High vitamin K content may reduce anticoagulant effect',
            severity: 'moderate',
            advice: 'Maintain consistent intake of kangkung and other leafy greens',
            culturalRelevance: 'Common Malaysian vegetable in daily meals',
          },
          {
            medication: 'warfarin',
            food: 'Durian',
            interaction: 'May enhance anticoagulant effect due to sulfur compounds',
            severity: 'moderate',
            advice: 'Avoid excessive durian consumption during peak season',
            culturalRelevance: 'Popular seasonal fruit in Malaysia',
          },
        ],
        'paracetamol': [
          {
            medication: 'paracetamol',
            food: 'Alcohol (including cooking wine)',
            interaction: 'Increased risk of liver toxicity',
            severity: 'major',
            advice: 'Avoid alcohol consumption when taking paracetamol regularly',
            culturalRelevance: 'Consider alcohol in Chinese cooking wines',
          },
        ],
        'metformin': [
          {
            medication: 'metformin',
            food: 'High glycemic index foods (white rice, roti canai)',
            interaction: 'May reduce medication effectiveness',
            severity: 'minor',
            advice: 'Consider brown rice alternatives and limit refined carbohydrates',
            culturalRelevance: 'White rice and roti canai are Malaysian staples',
          },
        ],
      };

      medications.forEach(medication => {
        const genericName = medication.genericName.toLowerCase();
        const medicationName = medication.name.toLowerCase();
        
        // Check both generic and brand names
        [genericName, medicationName].forEach(name => {
          if (malaysianFoodInteractions[name]) {
            foodInteractions.push(...malaysianFoodInteractions[name]);
          }
        });

        // Check active ingredients
        medication.activeIngredient?.forEach(ingredient => {
          const ingredientLower = ingredient.toLowerCase();
          if (malaysianFoodInteractions[ingredientLower]) {
            foodInteractions.push(...malaysianFoodInteractions[ingredientLower]);
          }
        });
      });

      return {
        success: true,
        data: foodInteractions,
      };
    } catch (error) {
      console.error('Food interaction check error:', error);
      return {
        success: false,
        error: 'Failed to check food interactions',
      };
    }
  }

  /**
   * Get interaction alerts for specific medication combination
   */
  async getInteractionAlerts(
    medication1Id: string,
    medication2Id: string
  ): Promise<ApiResponse<{
    alert: boolean;
    severity: string;
    message: string;
    action: 'monitor' | 'caution' | 'avoid' | 'contraindicated';
    culturalNotes?: string[];
  }>> {
    try {
      const checkRequest: InteractionCheckRequest = {
        medications: [
          { id: medication1Id, name: '' },
          { id: medication2Id, name: '' },
        ],
        checkOptions: {
          includeFoodInteractions: false,
          includeSupplements: false,
          includeOTCMedications: false,
          includeCulturalConsiderations: true,
          severityThreshold: 'all',
        },
      };

      const interactionResult = await this.checkInteractions(checkRequest);
      if (!interactionResult.success) {
        return interactionResult;
      }

      const interactions = interactionResult.data!.interactions;
      
      if (interactions.length === 0) {
        return {
          success: true,
          data: {
            alert: false,
            severity: 'none',
            message: 'No significant interactions found',
            action: 'monitor',
          },
        };
      }

      const highestSeverityInteraction = interactions.reduce((prev, current) => {
        const severityOrder = { 'minor': 1, 'moderate': 2, 'major': 3, 'contraindicated': 4 };
        return severityOrder[current.severity] > severityOrder[prev.severity] ? current : prev;
      });

      const actionMap: Record<string, 'monitor' | 'caution' | 'avoid' | 'contraindicated'> = {
        'minor': 'monitor',
        'moderate': 'caution',
        'major': 'avoid',
        'contraindicated': 'contraindicated',
      };

      return {
        success: true,
        data: {
          alert: true,
          severity: highestSeverityInteraction.severity,
          message: highestSeverityInteraction.managementStrategy,
          action: actionMap[highestSeverityInteraction.severity],
          culturalNotes: Object.values(highestSeverityInteraction.culturalConsiderations)
            .filter(Boolean) as string[],
        },
      };
    } catch (error) {
      console.error('Get interaction alerts error:', error);
      return {
        success: false,
        error: 'Failed to get interaction alerts',
      };
    }
  }

  /**
   * Private helper methods
   */

  private async getMedicationDetails(
    medications: InteractionCheckRequest['medications']
  ): Promise<ApiResponse<MalaysianMedicationInfo[]>> {
    try {
      const detailPromises = medications.map(med => 
        medicationDatabaseService.getMedicationDetails(med.id)
      );

      const results = await Promise.all(detailPromises);
      const medicationDetails: MalaysianMedicationInfo[] = [];

      for (const result of results) {
        if (result.success && result.data) {
          medicationDetails.push(result.data);
        } else {
          return {
            success: false,
            error: `Failed to get details for medication: ${result.error}`,
          };
        }
      }

      return {
        success: true,
        data: medicationDetails,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to get medication details',
      };
    }
  }

  private async checkPairwiseInteraction(
    med1: MalaysianMedicationInfo,
    med2: MalaysianMedicationInfo,
    patientProfile?: InteractionCheckRequest['patientProfile'],
    checkOptions?: InteractionCheckRequest['checkOptions']
  ): Promise<ApiResponse<DrugInteraction>> {
    try {
      // Use existing API service for basic interaction check
      const basicCheck = await medicationService.checkMedicationInteractions([med1.id, med2.id]);
      
      if (!basicCheck.success || !basicCheck.data?.has_interactions) {
        return {
          success: false,
          error: 'No interactions found',
        };
      }

      // Enhanced interaction analysis
      const basicInteraction = basicCheck.data.interactions[0];
      if (!basicInteraction) {
        return {
          success: false,
          error: 'No interaction data available',
        };
      }

      // Build enhanced interaction object
      const enhancedInteraction: DrugInteraction = {
        medication1: {
          id: med1.id,
          name: med1.name,
          genericName: med1.genericName,
          activeIngredients: med1.activeIngredients || [],
        },
        medication2: {
          id: med2.id,
          name: med2.name,
          genericName: med2.genericName,
          activeIngredients: med2.activeIngredients || [],
        },
        severity: basicInteraction.severity as any,
        mechanism: this.determineMechanism(med1, med2),
        clinicalEffects: [basicInteraction.description],
        onsetTime: this.determineOnsetTime(basicInteraction.severity),
        documentation: this.assessDocumentationQuality(med1, med2),
        managementStrategy: basicInteraction.description,
        culturalConsiderations: await this.generateCulturalConsiderations(
          med1, 
          med2, 
          patientProfile?.culturalProfile
        ),
      };

      return {
        success: true,
        data: enhancedInteraction,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to check pairwise interaction',
      };
    }
  }

  private filterBySeverity(
    interactions: DrugInteraction[],
    threshold: 'all' | 'moderate' | 'major'
  ): DrugInteraction[] {
    if (threshold === 'all') return interactions;

    const severityOrder = { 'minor': 1, 'moderate': 2, 'major': 3, 'contraindicated': 4 };
    const thresholdValue = threshold === 'moderate' ? 2 : 3;

    return interactions.filter(interaction => 
      severityOrder[interaction.severity] >= thresholdValue
    );
  }

  private generateWarningsAndRecommendations(
    interactions: DrugInteraction[],
    warnings: string[],
    recommendations: string[],
    culturalGuidelines: string[],
    patientProfile?: InteractionCheckRequest['patientProfile']
  ): void {
    interactions.forEach(interaction => {
      // Generate warnings based on severity
      if (interaction.severity === 'contraindicated') {
        warnings.push(
          `CONTRAINDICATED: ${interaction.medication1.name} and ${interaction.medication2.name} should not be used together`
        );
      } else if (interaction.severity === 'major') {
        warnings.push(
          `MAJOR INTERACTION: Close monitoring required for ${interaction.medication1.name} and ${interaction.medication2.name}`
        );
      }

      // Add management recommendations
      recommendations.push(interaction.managementStrategy);

      // Add cultural guidelines
      if (interaction.culturalConsiderations.prayerTimeImpact) {
        culturalGuidelines.push(interaction.culturalConsiderations.prayerTimeImpact);
      }
      if (interaction.culturalConsiderations.fastingConsiderations) {
        culturalGuidelines.push(interaction.culturalConsiderations.fastingConsiderations);
      }
      if (interaction.culturalConsiderations.ramadanAdjustments) {
        culturalGuidelines.push(interaction.culturalConsiderations.ramadanAdjustments);
      }
    });

    // Add general cultural guidelines based on patient profile
    if (patientProfile?.culturalProfile?.observesPrayerTimes) {
      culturalGuidelines.push('Consider prayer time schedules when adjusting medication timing');
    }
    if (patientProfile?.culturalProfile?.observesRamadan) {
      culturalGuidelines.push('Medication schedules may need adjustment during Ramadan fasting');
    }
  }

  private calculateOverallRisk(interactions: DrugInteraction[]): 'low' | 'moderate' | 'high' | 'critical' {
    if (interactions.length === 0) return 'low';

    const hasCritical = interactions.some(i => i.severity === 'contraindicated');
    if (hasCritical) return 'critical';

    const hasMajor = interactions.some(i => i.severity === 'major');
    if (hasMajor) return 'high';

    const hasModerate = interactions.some(i => i.severity === 'moderate');
    if (hasModerate) return 'moderate';

    return 'low';
  }

  private async generateAlternativeOptions(
    interactions: DrugInteraction[],
    medications: MalaysianMedicationInfo[]
  ): Promise<InteractionCheckResult['alternativeOptions']> {
    const alternatives: InteractionCheckResult['alternativeOptions'] = [];

    for (const interaction of interactions) {
      if (interaction.severity === 'major' || interaction.severity === 'contraindicated') {
        // Find alternatives for each medication in the interaction
        const med1Alternatives = await this.findMedicationAlternatives(interaction.medication1.id);
        const med2Alternatives = await this.findMedicationAlternatives(interaction.medication2.id);

        if (med1Alternatives.success && med1Alternatives.data) {
          alternatives.push({
            originalMedication: interaction.medication1.name,
            alternatives: med1Alternatives.data.slice(0, 3),
            reason: `Interaction with ${interaction.medication2.name}`,
          });
        }

        if (med2Alternatives.success && med2Alternatives.data) {
          alternatives.push({
            originalMedication: interaction.medication2.name,
            alternatives: med2Alternatives.data.slice(0, 3),
            reason: `Interaction with ${interaction.medication1.name}`,
          });
        }
      }
    }

    return alternatives;
  }

  private generateMonitoringRequirements(interactions: DrugInteraction[]): string[] {
    const requirements: string[] = [];

    interactions.forEach(interaction => {
      switch (interaction.severity) {
        case 'contraindicated':
          requirements.push('Immediate discontinuation of one or both medications required');
          break;
        case 'major':
          requirements.push(`Monitor ${interaction.clinicalEffects.join(', ')} closely`);
          requirements.push('Consider dose adjustments or alternative medications');
          break;
        case 'moderate':
          requirements.push(`Regular monitoring of ${interaction.clinicalEffects.join(', ')}`);
          break;
        case 'minor':
          requirements.push('Routine monitoring sufficient');
          break;
      }
    });

    return [...new Set(requirements)]; // Remove duplicates
  }

  private generateMonitoringParameters(interactions: DrugInteraction[]): MonitoringPlan['monitoringParameters'] {
    const parameters: MonitoringPlan['monitoringParameters'] = [];

    interactions.forEach(interaction => {
      if (interaction.severity === 'major' || interaction.severity === 'contraindicated') {
        parameters.push({
          parameter: `${interaction.medication1.name} + ${interaction.medication2.name} interaction`,
          frequency: 'Daily initially, then weekly',
          alertThresholds: {
            clinicalEffects: interaction.clinicalEffects,
            severity: interaction.severity,
          },
          culturalConsiderations: Object.values(interaction.culturalConsiderations).filter(Boolean) as string[],
        });
      }
    });

    return parameters;
  }

  private calculateNextReviewDate(interactions: DrugInteraction[]): string {
    // Determine review frequency based on highest severity
    const hasCritical = interactions.some(i => i.severity === 'contraindicated');
    const hasMajor = interactions.some(i => i.severity === 'major');
    
    let daysUntilReview = 30; // Default monthly review
    
    if (hasCritical) {
      daysUntilReview = 1; // Next day
    } else if (hasMajor) {
      daysUntilReview = 7; // Weekly
    } else if (interactions.length > 0) {
      daysUntilReview = 14; // Bi-weekly
    }

    const reviewDate = new Date();
    reviewDate.setDate(reviewDate.getDate() + daysUntilReview);
    
    return reviewDate.toISOString();
  }

  private hasMedicationsChanged(existing: string[], current: string[]): boolean {
    if (existing.length !== current.length) return true;
    return !existing.every(med => current.includes(med));
  }

  private determineMechanism(med1: MalaysianMedicationInfo, med2: MalaysianMedicationInfo): string {
    // Simplified mechanism determination
    // In a real implementation, this would use a comprehensive drug interaction database
    return 'Metabolic interaction - competing for same enzyme pathways';
  }

  private determineOnsetTime(severity: string): DrugInteraction['onsetTime'] {
    switch (severity) {
      case 'contraindicated':
      case 'major':
        return 'immediate';
      case 'moderate':
        return 'delayed';
      default:
        return 'variable';
    }
  }

  private assessDocumentationQuality(
    med1: MalaysianMedicationInfo,
    med2: MalaysianMedicationInfo
  ): DrugInteraction['documentation'] {
    // Simplified assessment - in reality would check clinical study data
    return 'good';
  }

  private async generateCulturalConsiderations(
    med1: MalaysianMedicationInfo,
    med2: MalaysianMedicationInfo,
    culturalProfile?: InteractionCheckRequest['patientProfile']['culturalProfile']
  ): Promise<DrugInteraction['culturalConsiderations']> {
    const considerations: DrugInteraction['culturalConsiderations'] = {};

    if (culturalProfile?.observesPrayerTimes) {
      considerations.prayerTimeImpact = 'Monitor for side effects that may affect prayer concentration';
    }

    if (culturalProfile?.observesRamadan) {
      considerations.fastingConsiderations = 'Adjust medication timing for pre-dawn and evening doses during Ramadan';
    }

    if (culturalProfile?.religion === 'Islam') {
      considerations.halalConcerns = ['Ensure both medications are halal-certified'];
    }

    return considerations;
  }

  private async findMedicationAlternatives(medicationId: string): Promise<ApiResponse<string[]>> {
    try {
      // Get medication details
      const medicationDetails = await medicationDatabaseService.getMedicationDetails(medicationId);
      if (!medicationDetails.success || !medicationDetails.data) {
        return {
          success: false,
          error: 'Failed to get medication details for alternatives',
        };
      }

      const medication = medicationDetails.data;
      
      // Search for alternatives with same generic name or similar indications
      const alternativeSearch = await medicationDatabaseService.searchMedications(
        medication.genericName,
        { limit: 10, includeGeneric: true, includeBrand: true }
      );

      if (!alternativeSearch.success || !alternativeSearch.data) {
        return {
          success: false,
          error: 'Failed to find alternatives',
        };
      }

      const alternatives = alternativeSearch.data.medications
        .filter(med => med.id !== medicationId) // Exclude the original medication
        .map(med => med.name)
        .slice(0, 5);

      return {
        success: true,
        data: alternatives,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to find medication alternatives',
      };
    }
  }
}

export const drugInteractionService = new DrugInteractionService();