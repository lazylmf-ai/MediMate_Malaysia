/**
 * Adherence FHIR Service
 *
 * Stream D - Provider Reporting & FHIR Integration
 *
 * Provides FHIR R4 compliant data export for clinic visits and adherence tracking.
 * Integrates with existing FHIR infrastructure and Malaysian healthcare profiles
 * to ensure interoperability with healthcare provider systems.
 *
 * Features:
 * - FHIR R4 MedicationStatement generation
 * - Adherence observation entries
 * - Malaysian healthcare profile compliance
 * - Cultural context preservation in FHIR resources
 * - Provider consent management
 * - Automated periodic reports
 */

import {
  AdherenceRecord,
  ProgressMetrics,
  AdherenceReport,
  MedicationAdherenceReport,
  CulturalInsight
} from '../../types/adherence';
import { Medication } from '../../types/medication';
import { ClinicalInsight, ProviderInsightProfile } from '../analytics/ClinicalInsightsEngine';

// FHIR R4 Types for Adherence
export interface FHIRMedicationStatement {
  resourceType: 'MedicationStatement';
  id?: string;
  meta?: {
    profile: string[];
    lastUpdated: string;
    versionId?: string;
  };
  status: 'active' | 'completed' | 'entered-in-error' | 'intended' | 'stopped' | 'on-hold' | 'unknown' | 'not-taken';
  statusReason?: {
    coding: Array<{
      system: string;
      code: string;
      display: string;
    }>;
    text?: string;
  };
  medicationCodeableConcept?: {
    coding: Array<{
      system: string;
      code: string;
      display: string;
    }>;
    text: string;
  };
  subject: {
    reference: string;
    display?: string;
  };
  context?: {
    reference: string;
  };
  effectiveDateTime?: string;
  effectivePeriod?: {
    start: string;
    end?: string;
  };
  dateAsserted: string;
  informationSource?: {
    reference: string;
    display?: string;
  };
  derivedFrom?: Array<{
    reference: string;
  }>;
  reasonCode?: Array<{
    coding: Array<{
      system: string;
      code: string;
      display: string;
    }>;
    text?: string;
  }>;
  dosage?: Array<{
    sequence?: number;
    text?: string;
    timing?: {
      repeat?: {
        frequency?: number;
        period?: number;
        periodUnit?: string;
      };
    };
    route?: {
      coding: Array<{
        system: string;
        code: string;
        display: string;
      }>;
    };
    doseAndRate?: Array<{
      doseQuantity?: {
        value: number;
        unit: string;
        system: string;
        code: string;
      };
    }>;
  }>;
  extension?: Array<{
    url: string;
    valueString?: string;
    valueDecimal?: number;
    valueBoolean?: boolean;
    valueCodeableConcept?: {
      coding: Array<{
        system: string;
        code: string;
        display: string;
      }>;
      text?: string;
    };
  }>;
}

export interface FHIRObservation {
  resourceType: 'Observation';
  id?: string;
  meta?: {
    profile: string[];
    lastUpdated: string;
  };
  status: 'registered' | 'preliminary' | 'final' | 'amended' | 'corrected' | 'cancelled' | 'entered-in-error' | 'unknown';
  category: Array<{
    coding: Array<{
      system: string;
      code: string;
      display: string;
    }>;
  }>;
  code: {
    coding: Array<{
      system: string;
      code: string;
      display: string;
    }>;
    text: string;
  };
  subject: {
    reference: string;
  };
  effectiveDateTime?: string;
  effectivePeriod?: {
    start: string;
    end?: string;
  };
  valueQuantity?: {
    value: number;
    unit: string;
    system: string;
    code: string;
  };
  valueString?: string;
  valueBoolean?: boolean;
  component?: Array<{
    code: {
      coding: Array<{
        system: string;
        code: string;
        display: string;
      }>;
      text: string;
    };
    valueQuantity?: {
      value: number;
      unit: string;
      system: string;
      code: string;
    };
    valueString?: string;
    valueBoolean?: boolean;
  }>;
  extension?: Array<{
    url: string;
    valueString?: string;
    valueDecimal?: number;
    valueBoolean?: boolean;
  }>;
}

export interface FHIRBundle {
  resourceType: 'Bundle';
  id: string;
  meta: {
    lastUpdated: string;
    profile?: string[];
  };
  type: 'collection' | 'searchset' | 'transaction' | 'document';
  timestamp: string;
  total?: number;
  entry: Array<{
    fullUrl?: string;
    resource: FHIRMedicationStatement | FHIRObservation | any;
    search?: {
      mode: 'match' | 'include' | 'outcome';
      score?: number;
    };
  }>;
}

export interface FHIRConsentRecord {
  patientId: string;
  providerId: string;
  consentGiven: boolean;
  consentDate: Date;
  dataTypes: string[];
  expirationDate?: Date;
  culturalConsiderations?: string[];
  familyInvolvement?: boolean;
}

export interface AdherenceFHIRExportOptions {
  patientId: string;
  providerId: string;
  startDate: Date;
  endDate: Date;
  includeCulturalContext: boolean;
  includeInsights: boolean;
  includePredictions: boolean;
  format: 'json' | 'xml';
  malaysianProfileCompliant: boolean;
}

export class AdherenceFHIRService {
  private static instance: AdherenceFHIRService;
  private consentRecords: Map<string, FHIRConsentRecord> = new Map();

  // Malaysian FHIR Systems
  private readonly MALAYSIAN_SYSTEMS = {
    PATIENT_IDENTIFIER: 'https://fhir.moh.gov.my/identifier/mykad',
    PRACTITIONER_IDENTIFIER: 'https://fhir.moh.gov.my/identifier/mmcid',
    ORGANIZATION_IDENTIFIER: 'https://fhir.moh.gov.my/identifier/facility-code',
    MEDICATION_CODE: 'https://fhir.moh.gov.my/CodeSystem/medication-code',
    ADHERENCE_OBSERVATION: 'https://fhir.moh.gov.my/CodeSystem/adherence-observation',
    CULTURAL_EXTENSION: 'https://fhir.moh.gov.my/StructureDefinition/cultural-context',
    MALAYSIAN_PROFILE_BASE: 'https://fhir.moh.gov.my/StructureDefinition'
  };

  private readonly LOINC_CODES = {
    MEDICATION_ADHERENCE: '18776-5', // Medication adherence observation
    MEDICATION_COMPLIANCE: 'LP94892-4', // Treatment compliance
    CULTURAL_FACTORS: '81364-2' // Social and cultural factors
  };

  private readonly SNOMED_CODES = {
    MEDICATION_ADHERENCE: '182840001', // Drug compliance good
    NON_ADHERENCE: '182841002', // Drug compliance poor
    CULTURAL_BARRIER: '160244002', // Cultural barrier to care
    RELIGIOUS_CONSIDERATION: '160245001', // Religious consideration
    FAMILY_SUPPORT: '160560008' // Family support
  };

  private constructor() {}

  public static getInstance(): AdherenceFHIRService {
    if (!AdherenceFHIRService.instance) {
      AdherenceFHIRService.instance = new AdherenceFHIRService();
    }
    return AdherenceFHIRService.instance;
  }

  /**
   * Generate FHIR MedicationStatement from adherence data
   */
  async generateMedicationStatement(
    patientId: string,
    medication: Medication,
    adherenceRecords: AdherenceRecord[],
    options: Partial<AdherenceFHIRExportOptions> = {}
  ): Promise<FHIRMedicationStatement> {
    try {
      console.log(`Generating FHIR MedicationStatement for patient ${patientId}, medication ${medication.id}`);

      const medicationRecords = adherenceRecords.filter(r => r.medicationId === medication.id);

      if (medicationRecords.length === 0) {
        throw new Error('No adherence records found for medication');
      }

      // Calculate adherence rate
      const adherenceRate = (medicationRecords.filter(r =>
        r.status === 'taken_on_time' || r.status === 'taken_late'
      ).length / medicationRecords.length) * 100;

      // Determine status based on recent adherence
      const recentRecords = medicationRecords.slice(-7); // Last 7 records
      const recentMissed = recentRecords.filter(r => r.status === 'missed').length;
      const status = recentMissed >= 5 ? 'stopped' : 'active';

      // Get date range
      const sortedRecords = medicationRecords.sort((a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime());
      const startDate = sortedRecords[0].scheduledTime;
      const endDate = sortedRecords[sortedRecords.length - 1].scheduledTime;

      // Build MedicationStatement
      const medicationStatement: FHIRMedicationStatement = {
        resourceType: 'MedicationStatement',
        id: `med-statement-${patientId}-${medication.id}-${Date.now()}`,
        meta: {
          profile: options.malaysianProfileCompliant
            ? [`${this.MALAYSIAN_SYSTEMS.MALAYSIAN_PROFILE_BASE}/MalaysianMedicationStatement`]
            : ['http://hl7.org/fhir/StructureDefinition/MedicationStatement'],
          lastUpdated: new Date().toISOString(),
          versionId: '1'
        },
        status,
        medicationCodeableConcept: {
          coding: [
            {
              system: this.MALAYSIAN_SYSTEMS.MEDICATION_CODE,
              code: medication.id,
              display: medication.name
            }
          ],
          text: medication.name
        },
        subject: {
          reference: `Patient/${patientId}`,
          display: `Patient ${patientId}`
        },
        effectivePeriod: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        },
        dateAsserted: new Date().toISOString(),
        informationSource: {
          reference: `Patient/${patientId}`,
          display: 'Patient self-reported via MediMate app'
        },
        derivedFrom: medicationRecords.map(record => ({
          reference: `Observation/adherence-${record.id}`
        })),
        extension: []
      };

      // Add adherence rate extension
      medicationStatement.extension!.push({
        url: `${this.MALAYSIAN_SYSTEMS.MALAYSIAN_PROFILE_BASE}/adherence-rate`,
        valueDecimal: Math.round(adherenceRate * 100) / 100
      });

      // Add cultural context if available and requested
      if (options.includeCulturalContext) {
        const culturalRecords = medicationRecords.filter(r => r.culturalContext);
        if (culturalRecords.length > 0) {
          const culturalExtensions = this.buildCulturalExtensions(culturalRecords);
          medicationStatement.extension!.push(...culturalExtensions);
        }
      }

      // Add dosage information if available
      if (medication.dosage) {
        medicationStatement.dosage = [{
          text: medication.dosage,
          timing: {
            repeat: {
              frequency: medication.frequency || 1,
              period: 1,
              periodUnit: 'day'
            }
          },
          doseAndRate: [{
            doseQuantity: {
              value: medication.strength || 1,
              unit: medication.unit || 'tablet',
              system: 'http://unitsofmeasure.org',
              code: medication.unit || 'tablet'
            }
          }]
        }];
      }

      console.log(`FHIR MedicationStatement generated with ${adherenceRate.toFixed(1)}% adherence rate`);

      return medicationStatement;
    } catch (error) {
      console.error('Failed to generate FHIR MedicationStatement:', error);
      throw error;
    }
  }

  /**
   * Generate FHIR Observation for adherence metrics
   */
  async generateAdherenceObservation(
    patientId: string,
    progressMetrics: ProgressMetrics,
    culturalInsights?: CulturalInsight[]
  ): Promise<FHIRObservation> {
    try {
      console.log(`Generating FHIR Observation for adherence metrics - patient ${patientId}`);

      const observation: FHIRObservation = {
        resourceType: 'Observation',
        id: `adherence-obs-${patientId}-${Date.now()}`,
        meta: {
          profile: [`${this.MALAYSIAN_SYSTEMS.MALAYSIAN_PROFILE_BASE}/MalaysianAdherenceObservation`],
          lastUpdated: new Date().toISOString()
        },
        status: 'final',
        category: [{
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/observation-category',
            code: 'therapy',
            display: 'Therapy'
          }]
        }],
        code: {
          coding: [{
            system: 'http://loinc.org',
            code: this.LOINC_CODES.MEDICATION_ADHERENCE,
            display: 'Medication adherence'
          }, {
            system: 'http://snomed.info/sct',
            code: progressMetrics.overallAdherence >= 80
              ? this.SNOMED_CODES.MEDICATION_ADHERENCE
              : this.SNOMED_CODES.NON_ADHERENCE,
            display: progressMetrics.overallAdherence >= 80
              ? 'Drug compliance good'
              : 'Drug compliance poor'
          }],
          text: 'Medication Adherence Rate'
        },
        subject: {
          reference: `Patient/${patientId}`
        },
        effectivePeriod: {
          start: progressMetrics.startDate.toISOString(),
          end: progressMetrics.endDate.toISOString()
        },
        valueQuantity: {
          value: Math.round(progressMetrics.overallAdherence * 100) / 100,
          unit: '%',
          system: 'http://unitsofmeasure.org',
          code: '%'
        },
        component: []
      };

      // Add components for detailed metrics
      observation.component!.push({
        code: {
          coding: [{
            system: this.MALAYSIAN_SYSTEMS.ADHERENCE_OBSERVATION,
            code: 'current-streak',
            display: 'Current adherence streak'
          }],
          text: 'Current Streak Days'
        },
        valueQuantity: {
          value: progressMetrics.streaks.currentStreak,
          unit: 'days',
          system: 'http://unitsofmeasure.org',
          code: 'd'
        }
      });

      observation.component!.push({
        code: {
          coding: [{
            system: this.MALAYSIAN_SYSTEMS.ADHERENCE_OBSERVATION,
            code: 'longest-streak',
            display: 'Longest adherence streak'
          }],
          text: 'Longest Streak Days'
        },
        valueQuantity: {
          value: progressMetrics.streaks.longestStreak,
          unit: 'days',
          system: 'http://unitsofmeasure.org',
          code: 'd'
        }
      });

      // Add cultural insights as components
      if (culturalInsights && culturalInsights.length > 0) {
        culturalInsights.forEach((insight, index) => {
          observation.component!.push({
            code: {
              coding: [{
                system: 'http://loinc.org',
                code: this.LOINC_CODES.CULTURAL_FACTORS,
                display: 'Cultural factors'
              }],
              text: `Cultural Factor ${index + 1}`
            },
            valueString: `${insight.type}: ${insight.description} (Impact: ${insight.adherenceImpact}%)`
          });
        });
      }

      // Add extensions for Malaysian-specific data
      observation.extension = [{
        url: `${this.MALAYSIAN_SYSTEMS.CULTURAL_EXTENSION}/observation-method`,
        valueString: 'Mobile app self-reporting with cultural intelligence'
      }];

      console.log(`FHIR Adherence Observation generated with ${observation.component!.length} components`);

      return observation;
    } catch (error) {
      console.error('Failed to generate FHIR Adherence Observation:', error);
      throw error;
    }
  }

  /**
   * Generate comprehensive FHIR Bundle for provider report
   */
  async generateProviderFHIRBundle(
    patientId: string,
    providerId: string,
    medications: Medication[],
    adherenceRecords: AdherenceRecord[],
    progressMetrics: ProgressMetrics,
    providerInsights?: ProviderInsightProfile,
    options: Partial<AdherenceFHIRExportOptions> = {}
  ): Promise<FHIRBundle> {
    try {
      console.log(`Generating FHIR Bundle for provider ${providerId}, patient ${patientId}`);

      // Check consent
      const hasConsent = await this.checkProviderConsent(patientId, providerId);
      if (!hasConsent) {
        throw new Error('Patient has not consented to data sharing with this provider');
      }

      const bundleId = `bundle-${patientId}-${providerId}-${Date.now()}`;
      const timestamp = new Date().toISOString();

      const bundle: FHIRBundle = {
        resourceType: 'Bundle',
        id: bundleId,
        meta: {
          lastUpdated: timestamp,
          profile: options.malaysianProfileCompliant
            ? [`${this.MALAYSIAN_SYSTEMS.MALAYSIAN_PROFILE_BASE}/MalaysianAdherenceBundle`]
            : undefined
        },
        type: 'collection',
        timestamp,
        entry: []
      };

      // Add MedicationStatements for each medication
      for (const medication of medications) {
        const medRecords = adherenceRecords.filter(r => r.medicationId === medication.id);
        if (medRecords.length > 0) {
          const medicationStatement = await this.generateMedicationStatement(
            patientId,
            medication,
            medRecords,
            options
          );

          bundle.entry.push({
            fullUrl: `urn:uuid:${medicationStatement.id}`,
            resource: medicationStatement
          });
        }
      }

      // Add overall adherence observation
      const adherenceObservation = await this.generateAdherenceObservation(
        patientId,
        progressMetrics,
        progressMetrics.culturalInsights
      );

      bundle.entry.push({
        fullUrl: `urn:uuid:${adherenceObservation.id}`,
        resource: adherenceObservation
      });

      // Add individual adherence observations for detailed tracking
      const detailedObservations = await this.generateDetailedAdherenceObservations(
        patientId,
        adherenceRecords,
        options
      );

      detailedObservations.forEach(obs => {
        bundle.entry.push({
          fullUrl: `urn:uuid:${obs.id}`,
          resource: obs
        });
      });

      // Add clinical insights as observations if included
      if (options.includeInsights && providerInsights?.keyInsights) {
        const insightObservations = await this.generateInsightObservations(
          patientId,
          providerInsights.keyInsights
        );

        insightObservations.forEach(obs => {
          bundle.entry.push({
            fullUrl: `urn:uuid:${obs.id}`,
            resource: obs
          });
        });
      }

      bundle.total = bundle.entry.length;

      console.log(`FHIR Bundle generated with ${bundle.total} resources`);

      return bundle;
    } catch (error) {
      console.error('Failed to generate FHIR Bundle:', error);
      throw error;
    }
  }

  /**
   * Export adherence data in FHIR format
   */
  async exportAdherenceDataFHIR(
    options: AdherenceFHIRExportOptions
  ): Promise<{ data: string; mimeType: string; filename: string }> {
    try {
      console.log(`Exporting adherence data for patient ${options.patientId} to provider ${options.providerId}`);

      // This would typically fetch data from services
      // For now, we'll create a simplified export
      const mockMedications: Medication[] = []; // Would be fetched
      const mockRecords: AdherenceRecord[] = []; // Would be fetched
      const mockMetrics: ProgressMetrics = {} as ProgressMetrics; // Would be fetched

      const bundle = await this.generateProviderFHIRBundle(
        options.patientId,
        options.providerId,
        mockMedications,
        mockRecords,
        mockMetrics,
        undefined,
        options
      );

      let data: string;
      let mimeType: string;
      let filename: string;

      if (options.format === 'xml') {
        data = this.convertBundleToXML(bundle);
        mimeType = 'application/fhir+xml';
        filename = `adherence-report-${options.patientId}-${Date.now()}.xml`;
      } else {
        data = JSON.stringify(bundle, null, 2);
        mimeType = 'application/fhir+json';
        filename = `adherence-report-${options.patientId}-${Date.now()}.json`;
      }

      console.log(`FHIR export completed: ${filename} (${data.length} bytes)`);

      return { data, mimeType, filename };
    } catch (error) {
      console.error('Failed to export FHIR data:', error);
      throw error;
    }
  }

  /**
   * Manage provider consent for data access
   */
  async grantProviderConsent(
    patientId: string,
    providerId: string,
    dataTypes: string[],
    expirationDate?: Date,
    culturalConsiderations?: string[],
    familyInvolvement?: boolean
  ): Promise<void> {
    try {
      const consentKey = `${patientId}_${providerId}`;

      const consent: FHIRConsentRecord = {
        patientId,
        providerId,
        consentGiven: true,
        consentDate: new Date(),
        dataTypes,
        expirationDate,
        culturalConsiderations,
        familyInvolvement
      };

      this.consentRecords.set(consentKey, consent);

      console.log(`Provider consent granted: Patient ${patientId} -> Provider ${providerId}`);
    } catch (error) {
      console.error('Failed to grant provider consent:', error);
      throw error;
    }
  }

  /**
   * Revoke provider consent
   */
  async revokeProviderConsent(patientId: string, providerId: string): Promise<void> {
    try {
      const consentKey = `${patientId}_${providerId}`;

      const consent = this.consentRecords.get(consentKey);
      if (consent) {
        consent.consentGiven = false;
        this.consentRecords.set(consentKey, consent);
      }

      console.log(`Provider consent revoked: Patient ${patientId} -> Provider ${providerId}`);
    } catch (error) {
      console.error('Failed to revoke provider consent:', error);
      throw error;
    }
  }

  /**
   * Check if provider has valid consent
   */
  async checkProviderConsent(patientId: string, providerId: string): Promise<boolean> {
    try {
      const consentKey = `${patientId}_${providerId}`;
      const consent = this.consentRecords.get(consentKey);

      if (!consent || !consent.consentGiven) {
        return false;
      }

      // Check if consent has expired
      if (consent.expirationDate && consent.expirationDate < new Date()) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Failed to check provider consent:', error);
      return false;
    }
  }

  /**
   * Validate FHIR resource against Malaysian profiles
   */
  async validateMalaysianFHIRCompliance(resource: any): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    try {
      const errors: string[] = [];
      const warnings: string[] = [];

      // Basic FHIR validation
      if (!resource.resourceType) {
        errors.push('Missing resourceType');
      }

      if (!resource.id) {
        warnings.push('Missing resource ID');
      }

      // Malaysian profile validation
      if (resource.meta?.profile) {
        const hasmalayProfile = resource.meta.profile.some(
          (profile: string) => profile.includes(this.MALAYSIAN_SYSTEMS.MALAYSIAN_PROFILE_BASE)
        );

        if (!hasmalayProfile) {
          warnings.push('Resource does not use Malaysian FHIR profile');
        }
      }

      // Specific validations based on resource type
      if (resource.resourceType === 'MedicationStatement') {
        this.validateMedicationStatementMalaysian(resource, errors, warnings);
      } else if (resource.resourceType === 'Observation') {
        this.validateObservationMalaysian(resource, errors, warnings);
      }

      return {
        isValid: errors.length === 0,
        errors,
        warnings
      };
    } catch (error) {
      console.error('FHIR validation failed:', error);
      return {
        isValid: false,
        errors: ['Validation process failed'],
        warnings: []
      };
    }
  }

  // Private helper methods

  private buildCulturalExtensions(culturalRecords: AdherenceRecord[]): Array<{
    url: string;
    valueString?: string;
    valueBoolean?: boolean;
    valueCodeableConcept?: any;
  }> {
    const extensions: any[] = [];

    // Prayer time conflicts
    const prayerConflicts = culturalRecords.filter(r => r.culturalContext?.prayerTime);
    if (prayerConflicts.length > 0) {
      extensions.push({
        url: `${this.MALAYSIAN_SYSTEMS.CULTURAL_EXTENSION}/prayer-time-consideration`,
        valueBoolean: true
      });
    }

    // Fasting periods
    const fastingRecords = culturalRecords.filter(r => r.culturalContext?.fastingPeriod);
    if (fastingRecords.length > 0) {
      extensions.push({
        url: `${this.MALAYSIAN_SYSTEMS.CULTURAL_EXTENSION}/fasting-period-adjustment`,
        valueBoolean: true
      });
    }

    // Family involvement
    const familyRecords = culturalRecords.filter(r => r.culturalContext?.familyInvolvement);
    if (familyRecords.length > 0) {
      extensions.push({
        url: `${this.MALAYSIAN_SYSTEMS.CULTURAL_EXTENSION}/family-involvement`,
        valueBoolean: true
      });
    }

    // Traditional medicine interactions
    const traditionalMedicine = culturalRecords.filter(r => r.culturalContext?.traditionalMedicineInteraction);
    if (traditionalMedicine.length > 0) {
      extensions.push({
        url: `${this.MALAYSIAN_SYSTEMS.CULTURAL_EXTENSION}/traditional-medicine-interaction`,
        valueBoolean: true
      });
    }

    return extensions;
  }

  private async generateDetailedAdherenceObservations(
    patientId: string,
    adherenceRecords: AdherenceRecord[],
    options: Partial<AdherenceFHIRExportOptions>
  ): Promise<FHIRObservation[]> {
    const observations: FHIRObservation[] = [];

    // Group records by medication for detailed observations
    const medicationGroups = new Map<string, AdherenceRecord[]>();
    adherenceRecords.forEach(record => {
      if (!medicationGroups.has(record.medicationId)) {
        medicationGroups.set(record.medicationId, []);
      }
      medicationGroups.get(record.medicationId)!.push(record);
    });

    // Create observation for each medication's adherence pattern
    for (const [medicationId, records] of medicationGroups) {
      const adherenceRate = (records.filter(r =>
        r.status === 'taken_on_time' || r.status === 'taken_late'
      ).length / records.length) * 100;

      const observation: FHIRObservation = {
        resourceType: 'Observation',
        id: `med-adherence-${patientId}-${medicationId}-${Date.now()}`,
        meta: {
          profile: [`${this.MALAYSIAN_SYSTEMS.MALAYSIAN_PROFILE_BASE}/MalaysianMedicationAdherence`],
          lastUpdated: new Date().toISOString()
        },
        status: 'final',
        category: [{
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/observation-category',
            code: 'therapy',
            display: 'Therapy'
          }]
        }],
        code: {
          coding: [{
            system: 'http://loinc.org',
            code: this.LOINC_CODES.MEDICATION_ADHERENCE,
            display: 'Medication adherence'
          }],
          text: `Adherence for Medication ${medicationId}`
        },
        subject: {
          reference: `Patient/${patientId}`
        },
        effectiveDateTime: new Date().toISOString(),
        valueQuantity: {
          value: Math.round(adherenceRate * 100) / 100,
          unit: '%',
          system: 'http://unitsofmeasure.org',
          code: '%'
        }
      };

      observations.push(observation);
    }

    return observations;
  }

  private async generateInsightObservations(
    patientId: string,
    insights: ClinicalInsight[]
  ): Promise<FHIRObservation[]> {
    const observations: FHIRObservation[] = [];

    insights.forEach(insight => {
      const observation: FHIRObservation = {
        resourceType: 'Observation',
        id: `insight-${insight.id}`,
        meta: {
          profile: [`${this.MALAYSIAN_SYSTEMS.MALAYSIAN_PROFILE_BASE}/ClinicalInsight`],
          lastUpdated: new Date().toISOString()
        },
        status: 'final',
        category: [{
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/observation-category',
            code: 'clinical',
            display: 'Clinical'
          }]
        }],
        code: {
          coding: [{
            system: this.MALAYSIAN_SYSTEMS.ADHERENCE_OBSERVATION,
            code: insight.type,
            display: insight.title
          }],
          text: insight.title
        },
        subject: {
          reference: `Patient/${patientId}`
        },
        effectiveDateTime: insight.generatedAt.toISOString(),
        valueString: insight.description,
        extension: [{
          url: `${this.MALAYSIAN_SYSTEMS.CULTURAL_EXTENSION}/clinical-significance`,
          valueString: insight.clinicalSignificance
        }, {
          url: `${this.MALAYSIAN_SYSTEMS.CULTURAL_EXTENSION}/confidence-level`,
          valueDecimal: insight.confidenceLevel
        }]
      };

      observations.push(observation);
    });

    return observations;
  }

  private convertBundleToXML(bundle: FHIRBundle): string {
    // Simplified XML conversion - in a real implementation, this would use a proper FHIR XML library
    return `<?xml version="1.0" encoding="UTF-8"?>
<Bundle xmlns="http://hl7.org/fhir">
  <id value="${bundle.id}"/>
  <meta>
    <lastUpdated value="${bundle.meta.lastUpdated}"/>
  </meta>
  <type value="${bundle.type}"/>
  <timestamp value="${bundle.timestamp}"/>
  <total value="${bundle.total}"/>
  <!-- XML conversion simplified for demonstration -->
  <!-- In production, use proper FHIR XML serialization -->
</Bundle>`;
  }

  private validateMedicationStatementMalaysian(
    resource: FHIRMedicationStatement,
    errors: string[],
    warnings: string[]
  ): void {
    // Check for required Malaysian extensions
    if (!resource.extension?.some(ext =>
      ext.url.includes('adherence-rate')
    )) {
      warnings.push('Missing adherence rate extension for Malaysian profile');
    }

    // Check medication coding system
    if (resource.medicationCodeableConcept?.coding) {
      const hasMalaysianCode = resource.medicationCodeableConcept.coding.some(
        coding => coding.system === this.MALAYSIAN_SYSTEMS.MEDICATION_CODE
      );

      if (!hasMalaysianCode) {
        warnings.push('No Malaysian medication code system found');
      }
    }
  }

  private validateObservationMalaysian(
    resource: FHIRObservation,
    errors: string[],
    warnings: string[]
  ): void {
    // Check observation category
    if (!resource.category?.some(cat =>
      cat.coding?.some(coding => coding.code === 'therapy')
    )) {
      warnings.push('Observation should include therapy category for adherence tracking');
    }

    // Check for cultural extensions if applicable
    if (!resource.extension?.some(ext =>
      ext.url.includes(this.MALAYSIAN_SYSTEMS.CULTURAL_EXTENSION)
    )) {
      warnings.push('Consider adding cultural context extensions for Malaysian patients');
    }
  }

  /**
   * Get consent summary for provider dashboard
   */
  getProviderConsentSummary(providerId: string): Array<{
    patientId: string;
    consentStatus: 'active' | 'expired' | 'revoked';
    expirationDate?: Date;
    dataTypes: string[];
  }> {
    const summary: any[] = [];

    this.consentRecords.forEach((consent, key) => {
      if (consent.providerId === providerId) {
        let status: 'active' | 'expired' | 'revoked' = 'active';

        if (!consent.consentGiven) {
          status = 'revoked';
        } else if (consent.expirationDate && consent.expirationDate < new Date()) {
          status = 'expired';
        }

        summary.push({
          patientId: consent.patientId,
          consentStatus: status,
          expirationDate: consent.expirationDate,
          dataTypes: consent.dataTypes
        });
      }
    });

    return summary;
  }

  /**
   * Clear cache and reset state (for testing)
   */
  clearCache(): void {
    this.consentRecords.clear();
  }
}

export default AdherenceFHIRService;