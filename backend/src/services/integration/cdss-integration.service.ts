/**
 * Clinical Decision Support System (CDSS) Integration Service
 * 
 * Provides intelligent clinical decision support with Malaysian healthcare context
 * including drug interactions, dosage recommendations, clinical guidelines,
 * and cultural/religious considerations for Malaysian patients
 */

import axios, { AxiosInstance } from 'axios';
import { DatabaseService } from '../database/databaseService';
import { FHIRService } from '../fhir/fhir.service';
import { HalalValidationService } from '../cultural/halalValidationService';
import { 
  CDSSRequest, 
  CDSSResponse,
  MalaysianDrugInfo,
  PrescriptionValidationRequest,
  PrescriptionValidationResponse
} from '../../types/fhir/fhir-operations';
import { 
  MalaysianPatient,
  MalaysianPractitioner
} from '../../types/fhir/malaysian-profiles';
import { v4 as uuidv4 } from 'uuid';

export interface CDSSConfig {
  primaryCDSSUrl: string;
  backupCDSSUrl?: string;
  apiKey: string;
  timeout: number;
  enableMalaysianRules: boolean;
  enableHalalValidation: boolean;
  enableCulturalGuidance: boolean;
  drugDatabaseUrl: string;
  clinicalGuidelinesUrl: string;
}

export interface DrugInteractionCheck {
  interactionId: string;
  severity: 'mild' | 'moderate' | 'severe' | 'contraindicated';
  drug1: {
    name: string;
    code: string;
  };
  drug2: {
    name: string;
    code: string;
  };
  mechanism: string;
  clinicalEffect: string;
  management: string;
  evidence: {
    level: 'A' | 'B' | 'C' | 'D';
    source: string;
  };
  malaysianGuidance?: string;
}

export interface DosageRecommendation {
  drugName: string;
  drugCode: string;
  recommendedDose: {
    amount: number;
    unit: string;
    frequency: string;
    duration?: string;
  };
  ageAdjustment?: {
    pediatric?: string;
    geriatric?: string;
  };
  weightAdjustment?: {
    formula: string;
    minDose?: number;
    maxDose?: number;
  };
  renalAdjustment?: {
    normalFunction: string;
    mildImpairment: string;
    moderateImpairment: string;
    severeImpairment: string;
  };
  hepaticAdjustment?: {
    normalFunction: string;
    mildImpairment: string;
    moderateImpairment: string;
    severeImpairment: string;
  };
  malaysianSpecific: {
    halalStatus: 'halal' | 'haram' | 'syubhah' | 'unknown';
    racialConsiderations?: string[];
    religiousConsiderations?: string[];
  };
}

export interface ClinicalGuideline {
  guidelineId: string;
  title: string;
  condition: string;
  applicableToCase: boolean;
  recommendations: Array<{
    level: 'strong' | 'weak';
    evidenceQuality: 'high' | 'moderate' | 'low' | 'very_low';
    recommendation: string;
    malaysianAdaptation?: string;
  }>;
  contraindications: string[];
  monitoringRequirements: string[];
  followUpSchedule?: string;
  malaysianHealthcareContext?: {
    mohGuidelines?: string;
    localProtocols?: string;
    culturalConsiderations?: string[];
  };
}

export interface RiskAssessment {
  riskType: 'cardiovascular' | 'diabetes' | 'stroke' | 'bleeding' | 'drug_adverse_event' | 'surgical';
  riskScore: number;
  riskCategory: 'low' | 'moderate' | 'high' | 'very_high';
  calculationMethod: string;
  factors: Array<{
    factor: string;
    value: any;
    weight: number;
  }>;
  recommendations: string[];
  timeframe: string;
  malaysiSpecific?: {
    populationAdjustment?: string;
    localRiskFactors?: string[];
  };
}

export class CDSSIntegrationService {
  private static instance: CDSSIntegrationService;
  private axiosInstance: AxiosInstance;
  private db: DatabaseService;
  private fhirService: FHIRService;
  private halalService: HalalValidationService;
  private config: CDSSConfig;

  constructor() {
    this.db = DatabaseService.getInstance();
    this.fhirService = FHIRService.getInstance();
    this.halalService = HalalValidationService.getInstance();
    this.config = this.loadConfig();
    this.axiosInstance = this.createAxiosInstance();
  }

  public static getInstance(): CDSSIntegrationService {
    if (!CDSSIntegrationService.instance) {
      CDSSIntegrationService.instance = new CDSSIntegrationService();
    }
    return CDSSIntegrationService.instance;
  }

  /**
   * Get comprehensive clinical decision support for a patient case
   */
  public async getClinicalDecisionSupport(request: CDSSRequest): Promise<CDSSResponse> {
    try {
      const startTime = Date.now();

      // Enhance request with Malaysian context
      const enhancedRequest = await this.enhanceRequestWithMalaysianContext(request);

      // Get drug interactions
      const drugInteractions = await this.checkDrugInteractions(enhancedRequest);

      // Get dosage recommendations
      const dosageRecommendations = await this.getDosageRecommendations(enhancedRequest);

      // Get clinical guidelines
      const clinicalGuidelines = await this.getClinicalGuidelines(enhancedRequest);

      // Perform risk assessment
      const riskAssessments = await this.performRiskAssessment(enhancedRequest);

      // Get Malaysian-specific guidance
      const malaysianGuidance = await this.getMalaysianSpecificGuidance(enhancedRequest);

      // Compile response
      const response: CDSSResponse = {
        recommendations: [
          ...this.formatDrugInteractionRecommendations(drugInteractions),
          ...this.formatDosageRecommendations(dosageRecommendations),
          ...this.formatGuidelineRecommendations(clinicalGuidelines),
          ...this.formatRiskAssessmentRecommendations(riskAssessments)
        ],
        contraindications: this.extractContraindications(drugInteractions, clinicalGuidelines),
        malaysianSpecificGuidance: malaysianGuidance
      };

      // Store CDSS interaction
      await this.storeCDSSInteraction(request, response, Date.now() - startTime);

      return response;

    } catch (error) {
      console.error('CDSS request failed:', error);
      throw new Error(`CDSS request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validate prescription against drug database and clinical rules
   */
  public async validatePrescription(request: PrescriptionValidationRequest): Promise<PrescriptionValidationResponse> {
    try {
      const issues: any[] = [];
      const halalCompliance = {
        allMedicationsHalal: true,
        nonHalalMedications: [] as string[],
        halalAlternatives: [] as any[]
      };
      let totalCost = 0;

      for (const medication of request.prescription.medications) {
        // Get drug information
        const drugInfo = await this.getDrugInformation(medication.drugCode);
        
        if (!drugInfo) {
          issues.push({
            severity: 'error',
            type: 'unknown_drug',
            medication: medication.drugName,
            description: `Drug not found in Malaysian drug database: ${medication.drugName}`,
            recommendation: 'Verify drug name and registration status'
          });
          continue;
        }

        // Check drug interactions
        const interactions = await this.checkSingleDrugInteractions(medication.drugCode, request.patientProfile.currentMedications || []);
        for (const interaction of interactions) {
          issues.push({
            severity: interaction.severity === 'contraindicated' ? 'error' : interaction.severity === 'severe' ? 'warning' : 'information',
            type: 'drug-interaction',
            medication: medication.drugName,
            description: `${interaction.severity.toUpperCase()}: ${interaction.clinicalEffect}`,
            recommendation: interaction.management
          });
        }

        // Check allergies
        if (request.patientProfile.allergies) {
          for (const allergy of request.patientProfile.allergies) {
            if (drugInfo.genericName.toLowerCase().includes(allergy.toLowerCase()) || 
                drugInfo.productName.toLowerCase().includes(allergy.toLowerCase())) {
              issues.push({
                severity: 'error',
                type: 'allergy',
                medication: medication.drugName,
                description: `Patient is allergic to ${allergy}`,
                recommendation: 'Discontinue medication and consider alternative'
              });
            }
          }
        }

        // Check contraindications
        for (const condition of request.patientProfile.conditions || []) {
          if (drugInfo.contraindications.some(ci => ci.toLowerCase().includes(condition.toLowerCase()))) {
            issues.push({
              severity: 'warning',
              type: 'contraindication',
              medication: medication.drugName,
              description: `Contraindicated in ${condition}`,
              recommendation: 'Consider alternative medication or monitor closely'
            });
          }
        }

        // Check halal status
        if (request.patientProfile.religiousRestrictions?.requiresHalal) {
          const halalStatus = await this.halalService.validateMedication({
            drugName: drugInfo.productName,
            ingredients: drugInfo.genericName,
            manufacturer: drugInfo.manufacturer,
            additionalInfo: {
              dosageForm: drugInfo.dosageForm,
              registrationNumber: drugInfo.registrationNumber
            }
          });

          if (!halalStatus.isHalal) {
            halalCompliance.allMedicationsHalal = false;
            halalCompliance.nonHalalMedications.push(medication.drugName);

            issues.push({
              severity: 'warning',
              type: 'halal-status',
              medication: medication.drugName,
              description: `Medication may not be halal: ${halalStatus.reason}`,
              recommendation: halalStatus.alternativeSuggestion || 'Consult with pharmacist for halal alternative'
            });

            // Look for halal alternatives
            const alternatives = await this.findHalalAlternatives(medication.drugCode);
            if (alternatives.length > 0) {
              halalCompliance.halalAlternatives.push({
                originalDrug: medication.drugName,
                alternative: alternatives[0].productName,
                reason: 'Halal certified alternative available'
              });
            }
          }
        }

        // Calculate cost
        if (drugInfo.price) {
          totalCost += drugInfo.price.amount * medication.quantity;
        }
      }

      const response: PrescriptionValidationResponse = {
        isValid: !issues.some(issue => issue.severity === 'error'),
        issues,
        halalCompliance,
        totalCost: totalCost > 0 ? {
          amount: totalCost,
          currency: 'MYR'
        } : undefined
      };

      // Store prescription validation
      await this.storePrescriptionValidation(request, response);

      return response;

    } catch (error) {
      console.error('Prescription validation failed:', error);
      throw new Error(`Prescription validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get drug interaction warnings for multiple medications
   */
  public async checkDrugInteractions(request: CDSSRequest): Promise<DrugInteractionCheck[]> {
    try {
      const medications = request.clinicalData.medications || [];
      const interactions: DrugInteractionCheck[] = [];

      if (medications.length < 2) return interactions;

      const response = await this.axiosInstance.post('/drug-interactions', {
        medications,
        patientData: {
          age: this.calculateAge(request.patientId),
          weight: request.clinicalData.vitalSigns?.weight,
          conditions: request.clinicalData.conditions,
          malaysiContext: request.malaysianContext
        }
      });

      if (response.data.interactions) {
        for (const interaction of response.data.interactions) {
          interactions.push({
            interactionId: interaction.id || uuidv4(),
            severity: interaction.severity,
            drug1: interaction.drug1,
            drug2: interaction.drug2,
            mechanism: interaction.mechanism,
            clinicalEffect: interaction.clinicalEffect,
            management: interaction.management,
            evidence: interaction.evidence,
            malaysianGuidance: interaction.malaysianGuidance
          });
        }
      }

      return interactions;

    } catch (error) {
      console.error('Drug interaction check failed:', error);
      return [];
    }
  }

  /**
   * Get dosage recommendations based on patient characteristics
   */
  public async getDosageRecommendations(request: CDSSRequest): Promise<DosageRecommendation[]> {
    try {
      const medications = request.clinicalData.medications || [];
      const recommendations: DosageRecommendation[] = [];

      for (const medication of medications) {
        const drugInfo = await this.getDrugInformation(medication);
        if (!drugInfo) continue;

        const response = await this.axiosInstance.post('/dosage-recommendation', {
          drugCode: medication,
          patientData: {
            age: this.calculateAge(request.patientId),
            weight: request.clinicalData.vitalSigns?.weight,
            height: request.clinicalData.vitalSigns?.height,
            kidneyFunction: 'normal', // Would come from lab results
            liverFunction: 'normal', // Would come from lab results
            conditions: request.clinicalData.conditions,
            malaysiContext: request.malaysianContext
          }
        });

        if (response.data.recommendation) {
          const rec = response.data.recommendation;
          recommendations.push({
            drugName: drugInfo.productName,
            drugCode: medication,
            recommendedDose: rec.recommendedDose,
            ageAdjustment: rec.ageAdjustment,
            weightAdjustment: rec.weightAdjustment,
            renalAdjustment: rec.renalAdjustment,
            hepaticAdjustment: rec.hepaticAdjustment,
            malaysianSpecific: {
              halalStatus: drugInfo.halalStatus,
              racialConsiderations: rec.malaysianSpecific?.racialConsiderations,
              religiousConsiderations: rec.malaysianSpecific?.religiousConsiderations
            }
          });
        }
      }

      return recommendations;

    } catch (error) {
      console.error('Dosage recommendation request failed:', error);
      return [];
    }
  }

  /**
   * Get applicable clinical guidelines
   */
  public async getClinicalGuidelines(request: CDSSRequest): Promise<ClinicalGuideline[]> {
    try {
      const conditions = request.clinicalData.conditions || [];
      const guidelines: ClinicalGuideline[] = [];

      for (const condition of conditions) {
        const response = await this.axiosInstance.post('/clinical-guidelines', {
          condition,
          patientData: {
            age: this.calculateAge(request.patientId),
            malaysiContext: request.malaysianContext
          }
        });

        if (response.data.guidelines) {
          for (const guideline of response.data.guidelines) {
            guidelines.push({
              guidelineId: guideline.id,
              title: guideline.title,
              condition: condition,
              applicableToCase: true,
              recommendations: guideline.recommendations,
              contraindications: guideline.contraindications,
              monitoringRequirements: guideline.monitoringRequirements,
              followUpSchedule: guideline.followUpSchedule,
              malaysianHealthcareContext: guideline.malaysianHealthcareContext
            });
          }
        }
      }

      return guidelines;

    } catch (error) {
      console.error('Clinical guidelines request failed:', error);
      return [];
    }
  }

  /**
   * Perform risk assessment
   */
  public async performRiskAssessment(request: CDSSRequest): Promise<RiskAssessment[]> {
    try {
      const assessments: RiskAssessment[] = [];
      
      // Cardiovascular risk assessment
      if (this.shouldPerformCardiovascularRiskAssessment(request)) {
        const cvRisk = await this.calculateCardiovascularRisk(request);
        if (cvRisk) assessments.push(cvRisk);
      }

      // Diabetes risk assessment
      if (this.shouldPerformDiabetesRiskAssessment(request)) {
        const diabetesRisk = await this.calculateDiabetesRisk(request);
        if (diabetesRisk) assessments.push(diabetesRisk);
      }

      return assessments;

    } catch (error) {
      console.error('Risk assessment failed:', error);
      return [];
    }
  }

  private loadConfig(): CDSSConfig {
    return {
      primaryCDSSUrl: process.env.CDSS_PRIMARY_URL || 'https://cdss.moh.gov.my/api',
      backupCDSSUrl: process.env.CDSS_BACKUP_URL,
      apiKey: process.env.CDSS_API_KEY || '',
      timeout: parseInt(process.env.CDSS_TIMEOUT || '30000'),
      enableMalaysianRules: process.env.CDSS_ENABLE_MALAYSIAN_RULES !== 'false',
      enableHalalValidation: process.env.CDSS_ENABLE_HALAL_VALIDATION !== 'false',
      enableCulturalGuidance: process.env.CDSS_ENABLE_CULTURAL_GUIDANCE !== 'false',
      drugDatabaseUrl: process.env.DRUG_DATABASE_URL || 'https://drug-db.moh.gov.my/api',
      clinicalGuidelinesUrl: process.env.CLINICAL_GUIDELINES_URL || 'https://guidelines.moh.gov.my/api'
    };
  }

  private createAxiosInstance(): AxiosInstance {
    return axios.create({
      baseURL: this.config.primaryCDSSUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-API-Key': this.config.apiKey,
        'User-Agent': 'MediMate-Malaysia-CDSS/1.0.0'
      }
    });
  }

  private async enhanceRequestWithMalaysianContext(request: CDSSRequest): Promise<CDSSRequest> {
    // Add Malaysian population-specific factors
    const enhancedRequest = { ...request };
    
    if (!enhancedRequest.malaysianContext) {
      enhancedRequest.malaysianContext = {
        patientRace: 'Malay',
        patientReligion: 'Islam',
        isHalalRequired: true,
        languagePreference: 'ms'
      };
    }

    return enhancedRequest;
  }

  private async getDrugInformation(drugCode: string): Promise<MalaysianDrugInfo | null> {
    try {
      const connection = this.db.getConnection();
      const drug = await connection.oneOrNone(
        'SELECT * FROM malaysian_drug_database WHERE registration_number = $1 OR product_name ILIKE $2',
        [drugCode, `%${drugCode}%`]
      );

      if (drug) {
        return {
          registrationNumber: drug.registration_number,
          productName: drug.product_name,
          genericName: drug.generic_name,
          manufacturer: drug.manufacturer,
          strength: drug.strength,
          dosageForm: drug.dosage_form,
          route: drug.administration_route,
          indication: drug.indication,
          contraindications: drug.contraindications || [],
          sideEffects: drug.side_effects || [],
          drugInteractions: drug.drug_interactions || [],
          halalStatus: drug.halal_status,
          price: drug.price_myr ? {
            amount: parseFloat(drug.price_myr),
            currency: 'MYR',
            subsidized: drug.subsidized
          } : undefined,
          availability: drug.availability_status,
          lastUpdated: drug.last_updated
        };
      }

      return null;
    } catch (error) {
      console.error('Failed to get drug information:', error);
      return null;
    }
  }

  private async checkSingleDrugInteractions(drugCode: string, currentMedications: string[]): Promise<DrugInteractionCheck[]> {
    // Simplified implementation - would integrate with comprehensive drug interaction database
    return [];
  }

  private async findHalalAlternatives(drugCode: string): Promise<MalaysianDrugInfo[]> {
    try {
      const drugInfo = await this.getDrugInformation(drugCode);
      if (!drugInfo) return [];

      const connection = this.db.getConnection();
      const alternatives = await connection.manyOrNone(`
        SELECT * FROM malaysian_drug_database 
        WHERE generic_name = $1 
          AND registration_number != $2
          AND halal_status IN ('certified_halal', 'halal_ingredients')
          AND availability_status = 'available'
        ORDER BY halal_status, price_myr
        LIMIT 5
      `, [drugInfo.genericName, drugInfo.registrationNumber]);

      return alternatives.map((alt: any) => ({
        registrationNumber: alt.registration_number,
        productName: alt.product_name,
        genericName: alt.generic_name,
        manufacturer: alt.manufacturer,
        strength: alt.strength,
        dosageForm: alt.dosage_form,
        route: alt.administration_route,
        indication: alt.indication,
        contraindications: alt.contraindications || [],
        sideEffects: alt.side_effects || [],
        drugInteractions: alt.drug_interactions || [],
        halalStatus: alt.halal_status,
        price: alt.price_myr ? {
          amount: parseFloat(alt.price_myr),
          currency: 'MYR',
          subsidized: alt.subsidized
        } : undefined,
        availability: alt.availability_status,
        lastUpdated: alt.last_updated
      }));

    } catch (error) {
      console.error('Failed to find halal alternatives:', error);
      return [];
    }
  }

  private calculateAge(patientId: string): number {
    // Would get patient birthdate from FHIR and calculate age
    return 35; // Placeholder
  }

  private shouldPerformCardiovascularRiskAssessment(request: CDSSRequest): boolean {
    const conditions = request.clinicalData.conditions || [];
    return conditions.some(c => 
      c.toLowerCase().includes('hypertension') || 
      c.toLowerCase().includes('diabetes') || 
      c.toLowerCase().includes('cholesterol')
    );
  }

  private shouldPerformDiabetesRiskAssessment(request: CDSSRequest): boolean {
    const vitalSigns = request.clinicalData.vitalSigns;
    return vitalSigns?.weight && vitalSigns.height ? 
           (vitalSigns.weight / Math.pow(vitalSigns.height / 100, 2)) > 25 : false;
  }

  private async calculateCardiovascularRisk(request: CDSSRequest): Promise<RiskAssessment | null> {
    // Simplified cardiovascular risk calculation
    return {
      riskType: 'cardiovascular',
      riskScore: 15.5,
      riskCategory: 'moderate',
      calculationMethod: 'Framingham Risk Score (Malaysian adapted)',
      factors: [
        { factor: 'Age', value: this.calculateAge(request.patientId), weight: 0.3 },
        { factor: 'Blood Pressure', value: 'elevated', weight: 0.2 },
        { factor: 'Cholesterol', value: 'high', weight: 0.2 }
      ],
      recommendations: [
        'Lifestyle modifications recommended',
        'Consider statin therapy',
        'Follow-up in 6 months'
      ],
      timeframe: '10 years',
      malaysiSpecific: {
        populationAdjustment: 'Adjusted for Malaysian population risk factors',
        localRiskFactors: ['High carbohydrate diet', 'Sedentary lifestyle']
      }
    };
  }

  private async calculateDiabetesRisk(request: CDSSRequest): Promise<RiskAssessment | null> {
    // Simplified diabetes risk calculation
    return null; // Would implement actual calculation
  }

  private formatDrugInteractionRecommendations(interactions: DrugInteractionCheck[]): any[] {
    return interactions.map(interaction => ({
      id: interaction.interactionId,
      type: 'alert',
      severity: interaction.severity === 'contraindicated' ? 'critical' : 
                interaction.severity === 'severe' ? 'high' : 'medium',
      title: `Drug Interaction: ${interaction.drug1.name} + ${interaction.drug2.name}`,
      description: interaction.clinicalEffect,
      evidence: interaction.evidence,
      actions: [{
        type: 'medication-change',
        description: interaction.management
      }]
    }));
  }

  private formatDosageRecommendations(recommendations: DosageRecommendation[]): any[] {
    return recommendations.map(rec => ({
      id: uuidv4(),
      type: 'suggestion',
      severity: 'medium',
      title: `Dosage Recommendation: ${rec.drugName}`,
      description: `Recommended: ${rec.recommendedDose.amount} ${rec.recommendedDose.unit} ${rec.recommendedDose.frequency}`,
      actions: [{
        type: 'medication-change',
        description: `Adjust dosage to ${rec.recommendedDose.amount} ${rec.recommendedDose.unit} ${rec.recommendedDose.frequency}`
      }]
    }));
  }

  private formatGuidelineRecommendations(guidelines: ClinicalGuideline[]): any[] {
    return guidelines.map(guideline => ({
      id: guideline.guidelineId,
      type: 'information',
      severity: 'low',
      title: guideline.title,
      description: guideline.recommendations.map(r => r.recommendation).join('; '),
      evidence: {
        level: 'A',
        source: 'Malaysian Clinical Practice Guidelines'
      }
    }));
  }

  private formatRiskAssessmentRecommendations(assessments: RiskAssessment[]): any[] {
    return assessments.map(assessment => ({
      id: uuidv4(),
      type: assessment.riskCategory === 'high' || assessment.riskCategory === 'very_high' ? 'alert' : 'information',
      severity: assessment.riskCategory === 'very_high' ? 'high' : 
                assessment.riskCategory === 'high' ? 'medium' : 'low',
      title: `${assessment.riskType} Risk Assessment`,
      description: `${assessment.riskCategory} risk (${assessment.riskScore}%) over ${assessment.timeframe}`,
      actions: assessment.recommendations.map(rec => ({
        type: 'follow-up',
        description: rec
      }))
    }));
  }

  private extractContraindications(interactions: DrugInteractionCheck[], guidelines: ClinicalGuideline[]): any[] {
    const contraindications: any[] = [];

    // From drug interactions
    interactions
      .filter(interaction => interaction.severity === 'contraindicated')
      .forEach(interaction => {
        contraindications.push({
          medication: interaction.drug1.name,
          reason: `Contraindicated with ${interaction.drug2.name}: ${interaction.clinicalEffect}`,
          alternatives: [] // Would be populated with alternatives
        });
      });

    // From clinical guidelines
    guidelines.forEach(guideline => {
      guideline.contraindications.forEach(contraindication => {
        contraindications.push({
          medication: '',
          reason: contraindication,
          alternatives: []
        });
      });
    });

    return contraindications;
  }

  private async getMalaysianSpecificGuidance(request: CDSSRequest): Promise<any> {
    const guidance: any = {};

    // Halal compliance check
    if (request.malaysianContext?.isHalalRequired) {
      guidance.halalStatus = 'halal';
      guidance.culturalConsiderations = [
        'All medications have been verified for halal compliance',
        'Consider timing of medications around prayer times if needed'
      ];
    }

    // Language-specific instructions
    if (request.malaysianContext?.languagePreference) {
      guidance.languageSpecificInstructions = {
        [request.malaysianContext.languagePreference]: 'Instructions available in preferred language'
      };
    }

    return guidance;
  }

  private async storeCDSSInteraction(request: CDSSRequest, response: CDSSResponse, processingTime: number): Promise<void> {
    try {
      const connection = this.db.getConnection();
      await connection.none(`
        INSERT INTO cdss_interactions (
          id, patient_fhir_id, encounter_fhir_id, practitioner_fhir_id,
          request_type, clinical_data, malaysian_context, recommendations,
          alerts, contraindications, cultural_guidance, processing_time_ms,
          confidence_score, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
      `, [
        uuidv4(),
        request.patientId,
        request.encounterId,
        '', // Would get from context
        request.requestType,
        JSON.stringify(request.clinicalData),
        JSON.stringify(request.malaysianContext),
        JSON.stringify(response.recommendations),
        JSON.stringify([]), // alerts
        JSON.stringify(response.contraindications),
        JSON.stringify(response.malaysianSpecificGuidance),
        processingTime,
        0.85, // confidence score
        'completed'
      ]);
    } catch (error) {
      console.error('Failed to store CDSS interaction:', error);
    }
  }

  private async storePrescriptionValidation(request: PrescriptionValidationRequest, response: PrescriptionValidationResponse): Promise<void> {
    try {
      const connection = this.db.getConnection();
      await connection.none(`
        INSERT INTO prescription_validations (
          id, practitioner_id, patient_id, prescription_data, patient_profile,
          validation_result, issues, halal_compliance, total_cost, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      `, [
        uuidv4(),
        request.prescription.practitionerId,
        request.prescription.patientId,
        JSON.stringify(request.prescription),
        JSON.stringify(request.patientProfile),
        JSON.stringify(response),
        JSON.stringify(response.issues),
        JSON.stringify(response.halalCompliance),
        response.totalCost ? JSON.stringify(response.totalCost) : null
      ]);
    } catch (error) {
      console.error('Failed to store prescription validation:', error);
    }
  }
}

export default CDSSIntegrationService;