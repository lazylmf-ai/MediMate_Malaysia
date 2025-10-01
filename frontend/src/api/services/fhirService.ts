/**
 * FHIR Integration Service
 * 
 * Provides HL7 FHIR R4 integration with Malaysian healthcare profiles
 * Includes MyKad integration and cultural healthcare contexts
 */

import { apiClient } from '../client';
import { API_ENDPOINTS, buildQuery } from '../endpoints';
import type { ApiResponse, FHIRBundle, FHIRPatient, FHIRMedicationStatement, FHIRObservation } from '../types';
import type { AdherenceReport, AdherenceRecord, ProgressMetrics } from '../../types/adherence';

export interface FHIRSearchParams {
  identifier?: string; // MyKad number
  name?: string;
  birthdate?: string;
  gender?: 'male' | 'female';
  active?: boolean;
}

export class FHIRService {
  /**
   * Search FHIR patients
   */
  async searchPatients(params: FHIRSearchParams = {}): Promise<ApiResponse<FHIRBundle>> {
    const queryString = buildQuery.fhirPatients(params);
    const endpoint = queryString ? `${API_ENDPOINTS.FHIR.PATIENT_SEARCH}?${queryString}` : API_ENDPOINTS.FHIR.PATIENT_SEARCH;

    return apiClient.request<FHIRBundle>(endpoint, {
      cacheKey: `fhir_patients_${JSON.stringify(params)}`,
      cacheTTL: 300000, // 5 minutes cache
    });
  }

  /**
   * Get FHIR patient by ID
   */
  async getPatientById(patientId: string): Promise<ApiResponse<FHIRPatient>> {
    return apiClient.request<FHIRPatient>(
      API_ENDPOINTS.FHIR.PATIENT_GET(patientId),
      {
        cacheKey: `fhir_patient_${patientId}`,
        cacheTTL: 600000, // 10 minutes cache
      }
    );
  }

  /**
   * Search patient by MyKad number
   */
  async searchByMyKad(mykadNumber: string): Promise<ApiResponse<FHIRBundle>> {
    return this.searchPatients({
      identifier: mykadNumber,
    });
  }

  /**
   * Create FHIR patient with Malaysian profile
   */
  async createPatient(patientData: {
    mykadNumber: string;
    name: {
      family: string;
      given: string[];
    };
    gender: 'male' | 'female';
    birthDate: string;
    race?: string;
    religion?: string;
    address?: {
      line: string[];
      city: string;
      state: string;
      postalCode: string;
      country: string;
    };
  }): Promise<ApiResponse<FHIRPatient>> {
    const fhirPatient: FHIRPatient = {
      resourceType: 'Patient',
      id: `patient-${Date.now()}`, // Temporary ID
      identifier: [{
        use: 'official',
        system: 'urn:oid:1.2.458.1000000.2.1.1.1', // Malaysian MyKad system
        value: patientData.mykadNumber,
      }],
      name: [{
        use: 'official',
        family: patientData.name.family,
        given: patientData.name.given,
      }],
      gender: patientData.gender,
      birthDate: patientData.birthDate,
      extension: [],
    };

    // Add Malaysian-specific extensions
    if (patientData.race) {
      fhirPatient.extension!.push({
        url: 'http://medimate.my/fhir/StructureDefinition/malaysian-race',
        valueString: patientData.race,
      });
    }

    if (patientData.religion) {
      fhirPatient.extension!.push({
        url: 'http://medimate.my/fhir/StructureDefinition/religion',
        valueString: patientData.religion,
      });
    }

    return apiClient.request<FHIRPatient>(
      API_ENDPOINTS.FHIR.PATIENT_CREATE,
      {
        method: 'POST',
        body: JSON.stringify(fhirPatient),
        headers: {
          'Content-Type': 'application/fhir+json',
        },
      }
    );
  }

  /**
   * Update FHIR patient
   */
  async updatePatient(patientId: string, patientData: Partial<FHIRPatient>): Promise<ApiResponse<FHIRPatient>> {
    return apiClient.request<FHIRPatient>(
      API_ENDPOINTS.FHIR.PATIENT_UPDATE(patientId),
      {
        method: 'PUT',
        body: JSON.stringify(patientData),
        headers: {
          'Content-Type': 'application/fhir+json',
        },
      }
    );
  }

  /**
   * Convert internal patient to FHIR format
   */
  convertToFHIRPatient(internalPatient: {
    personal_info: {
      name: string;
      mykad_number: string;
      date_of_birth: string;
      gender: string;
      race: string;
      religion: string;
    };
    contact_info: {
      phone: string;
      email?: string;
      address: {
        street: string;
        city: string;
        state: string;
        postcode: string;
        country: string;
      };
    };
  }): FHIRPatient {
    // Parse name (assuming format: "FirstName LastName" or "FirstName MiddleName LastName")
    const nameParts = internalPatient.personal_info.name.split(' ');
    const family = nameParts[nameParts.length - 1];
    const given = nameParts.slice(0, -1);

    const fhirPatient: FHIRPatient = {
      resourceType: 'Patient',
      id: `converted-${Date.now()}`,
      identifier: [{
        use: 'official',
        system: 'urn:oid:1.2.458.1000000.2.1.1.1',
        value: internalPatient.personal_info.mykad_number,
      }],
      name: [{
        use: 'official',
        family: family,
        given: given.length > 0 ? given : [''],
      }],
      gender: internalPatient.personal_info.gender === 'male' ? 'male' : 'female',
      birthDate: internalPatient.personal_info.date_of_birth,
      extension: [
        {
          url: 'http://medimate.my/fhir/StructureDefinition/malaysian-race',
          valueString: internalPatient.personal_info.race,
        },
        {
          url: 'http://medimate.my/fhir/StructureDefinition/religion',
          valueString: internalPatient.personal_info.religion,
        },
      ],
    };

    return fhirPatient;
  }

  /**
   * Convert FHIR patient to internal format
   */
  convertFromFHIRPatient(fhirPatient: FHIRPatient): {
    personal_info: {
      name: string;
      mykad_number: string;
      date_of_birth: string;
      gender: string;
      race?: string;
      religion?: string;
    };
  } {
    // Get MyKad identifier
    const mykadIdentifier = fhirPatient.identifier.find(
      id => id.system === 'urn:oid:1.2.458.1000000.2.1.1.1'
    );

    // Construct full name
    const nameData = fhirPatient.name[0];
    const fullName = nameData.given.length > 0 
      ? `${nameData.given.join(' ')} ${nameData.family}` 
      : nameData.family;

    // Extract extensions
    const raceExtension = fhirPatient.extension?.find(
      ext => ext.url === 'http://medimate.my/fhir/StructureDefinition/malaysian-race'
    );
    
    const religionExtension = fhirPatient.extension?.find(
      ext => ext.url === 'http://medimate.my/fhir/StructureDefinition/religion'
    );

    return {
      personal_info: {
        name: fullName,
        mykad_number: mykadIdentifier?.value || '',
        date_of_birth: fhirPatient.birthDate,
        gender: fhirPatient.gender,
        race: raceExtension?.valueString,
        religion: religionExtension?.valueString,
      },
    };
  }

  /**
   * Validate MyKad format for FHIR
   */
  validateMyKadForFHIR(mykad: string): {
    valid: boolean;
    errors: string[];
    extractedInfo?: {
      birthDate: string;
      birthPlace: string;
      gender: 'male' | 'female';
    };
  } {
    const errors: string[] = [];

    // Basic format validation
    const mykadRegex = /^\d{6}-\d{2}-\d{4}$/;
    if (!mykadRegex.test(mykad)) {
      errors.push('Invalid MyKad format. Expected: YYMMDD-PB-###G');
      return { valid: false, errors };
    }

    try {
      // Extract information from MyKad
      const [datePart, placePart, serialPart] = mykad.split('-');
      
      // Extract birth date (YYMMDD)
      const year = parseInt(datePart.substring(0, 2));
      const month = parseInt(datePart.substring(2, 4));
      const day = parseInt(datePart.substring(4, 6));
      
      // Determine century (00-31 = 2000s, 32-99 = 1900s)
      const fullYear = year <= 31 ? 2000 + year : 1900 + year;
      
      // Validate date
      const birthDate = new Date(fullYear, month - 1, day);
      if (birthDate.getFullYear() !== fullYear || 
          birthDate.getMonth() !== month - 1 || 
          birthDate.getDate() !== day) {
        errors.push('Invalid birth date in MyKad');
      }

      // Validate month
      if (month < 1 || month > 12) {
        errors.push('Invalid month in MyKad');
      }

      // Extract place of birth
      const placeCode = parseInt(placePart);
      const placeNames: Record<number, string> = {
        1: 'Johor', 2: 'Kedah', 3: 'Kelantan', 4: 'Malacca', 5: 'Negeri Sembilan',
        6: 'Pahang', 7: 'Penang', 8: 'Perak', 9: 'Perlis', 10: 'Selangor',
        11: 'Terengganu', 12: 'Sabah', 13: 'Sarawak', 14: 'Kuala Lumpur',
        15: 'Labuan', 16: 'Putrajaya', 21: 'Johor', 22: 'Johor', 23: 'Johor', 24: 'Johor',
        25: 'Kedah', 26: 'Kedah', 27: 'Kedah', 28: 'Kelantan', 29: 'Kelantan',
        30: 'Malacca', 31: 'Negeri Sembilan', 32: 'Pahang', 33: 'Pahang',
        34: 'Penang', 35: 'Perak', 36: 'Perak', 37: 'Perak', 38: 'Perlis',
        39: 'Selangor', 40: 'Selangor', 41: 'Selangor', 42: 'Selangor', 43: 'Selangor',
        44: 'Selangor', 45: 'Selangor', 46: 'Selangor', 47: 'Selangor', 48: 'Selangor',
        49: 'Selangor', 50: 'Terengganu', 51: 'Terengganu', 52: 'Terengganu', 53: 'Terengganu',
        54: 'Kuala Lumpur', 55: 'Kuala Lumpur', 56: 'Kuala Lumpur', 57: 'Kuala Lumpur',
        58: 'Kuala Lumpur', 59: 'Kuala Lumpur', 60: 'Sabah', 61: 'Sabah', 62: 'Sabah',
        63: 'Sabah', 64: 'Sabah', 65: 'Sabah', 66: 'Sabah', 67: 'Sabah', 68: 'Sabah',
        69: 'Sabah', 70: 'Sarawak', 71: 'Sarawak', 72: 'Sarawak', 73: 'Sarawak',
        74: 'Sarawak', 75: 'Sarawak', 76: 'Sarawak', 77: 'Sarawak', 78: 'Sarawak', 79: 'Sarawak',
      };

      const birthPlace = placeNames[placeCode] || 'Unknown';

      // Extract gender (last digit: odd = male, even = female)
      const lastDigit = parseInt(serialPart.substring(3, 4));
      const gender = lastDigit % 2 === 1 ? 'male' : 'female';

      const extractedInfo = {
        birthDate: `${fullYear}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`,
        birthPlace: birthPlace,
        gender: gender,
      };

      return {
        valid: errors.length === 0,
        errors,
        extractedInfo: errors.length === 0 ? extractedInfo : undefined,
      };
    } catch (error) {
      errors.push('Failed to parse MyKad number');
      return { valid: false, errors };
    }
  }

  /**
   * Search patients with Malaysian cultural context
   */
  async searchPatientsWithCulturalContext(params: FHIRSearchParams & {
    race?: string;
    religion?: string;
    state?: string;
  }): Promise<ApiResponse<{
    bundle: FHIRBundle;
    culturalSummary: {
      totalPatients: number;
      byRace: Record<string, number>;
      byReligion: Record<string, number>;
      byState: Record<string, number>;
    };
  }>> {
    const searchResponse = await this.searchPatients(params);
    
    if (!searchResponse.success) {
      return searchResponse;
    }

    const bundle = searchResponse.data!;
    const culturalSummary = {
      totalPatients: bundle.total,
      byRace: {} as Record<string, number>,
      byReligion: {} as Record<string, number>,
      byState: {} as Record<string, number>,
    };

    // Analyze cultural demographics from FHIR extensions
    bundle.entry.forEach(entry => {
      const patient = entry.resource;
      
      // Extract race
      const raceExtension = patient.extension?.find(
        ext => ext.url === 'http://medimate.my/fhir/StructureDefinition/malaysian-race'
      );
      if (raceExtension?.valueString) {
        const race = raceExtension.valueString;
        culturalSummary.byRace[race] = (culturalSummary.byRace[race] || 0) + 1;
      }

      // Extract religion
      const religionExtension = patient.extension?.find(
        ext => ext.url === 'http://medimate.my/fhir/StructureDefinition/religion'
      );
      if (religionExtension?.valueString) {
        const religion = religionExtension.valueString;
        culturalSummary.byReligion[religion] = (culturalSummary.byReligion[religion] || 0) + 1;
      }

      // Extract state from MyKad
      const mykadIdentifier = patient.identifier.find(
        id => id.system === 'urn:oid:1.2.458.1000000.2.1.1.1'
      );
      if (mykadIdentifier?.value) {
        const validation = this.validateMyKadForFHIR(mykadIdentifier.value);
        if (validation.valid && validation.extractedInfo) {
          const state = validation.extractedInfo.birthPlace;
          culturalSummary.byState[state] = (culturalSummary.byState[state] || 0) + 1;
        }
      }
    });

    return {
      success: true,
      data: {
        bundle,
        culturalSummary,
      },
    };
  }

  /**
   * Get FHIR compliance status
   */
  async getFHIRComplianceStatus(): Promise<ApiResponse<{
    compliant: boolean;
    version: string;
    supportedResources: string[];
    malaysianProfiles: {
      patient: boolean;
      practitioner: boolean;
      organization: boolean;
    };
    culturalExtensions: {
      race: boolean;
      religion: boolean;
      language: boolean;
    };
  }>> {
    // In a real implementation, this would call a capability statement endpoint
    return {
      success: true,
      data: {
        compliant: true,
        version: 'R4',
        supportedResources: ['Patient', 'Practitioner', 'Organization', 'Appointment', 'Medication', 'MedicationStatement', 'Observation'],
        malaysianProfiles: {
          patient: true,
          practitioner: true,
          organization: true,
        },
        culturalExtensions: {
          race: true,
          religion: true,
          language: true,
        },
      },
    };
  }

  /**
   * Create FHIR MedicationStatement for adherence reporting
   */
  async createMedicationStatement(
    patientId: string,
    medicationStatement: {
      medicationName: string;
      medicationCode?: string;
      status: 'active' | 'completed' | 'stopped' | 'not-taken';
      effectiveStart: Date;
      effectiveEnd?: Date;
      dosageText: string;
      adherenceRecords?: AdherenceRecord[];
      culturalContext?: any;
    }
  ): Promise<ApiResponse<FHIRMedicationStatement>> {
    const fhirStatement: FHIRMedicationStatement = {
      resourceType: 'MedicationStatement',
      id: `medication-statement-${Date.now()}`,
      status: medicationStatement.status,
      medicationCodeableConcept: {
        coding: [{
          system: 'http://snomed.info/sct',
          code: medicationStatement.medicationCode || '182840001',
          display: medicationStatement.medicationName,
        }],
        text: medicationStatement.medicationName,
      },
      subject: {
        reference: `Patient/${patientId}`,
        display: 'Patient',
      },
      effectivePeriod: {
        start: medicationStatement.effectiveStart.toISOString(),
        end: medicationStatement.effectiveEnd?.toISOString(),
      },
      dateAsserted: new Date().toISOString(),
      dosage: [{
        text: medicationStatement.dosageText,
      }],
      extension: [],
    };

    // Add Malaysian cultural extensions
    if (medicationStatement.culturalContext) {
      fhirStatement.extension!.push({
        url: 'http://medimate.my/fhir/StructureDefinition/cultural-adherence-context',
        extension: [
          {
            url: 'prayerTimeAdjustment',
            valueBoolean: medicationStatement.culturalContext.prayerTimeAdjustment || false,
          },
          {
            url: 'ramadanConsideration',
            valueBoolean: medicationStatement.culturalContext.ramadanConsideration || false,
          },
          {
            url: 'culturalSensitivityLevel',
            valueString: medicationStatement.culturalContext.culturalSensitivityLevel || 'medium',
          },
        ],
      });
    }

    // Add adherence metrics extension
    if (medicationStatement.adherenceRecords?.length) {
      const adherenceRate = this.calculateAdherenceRate(medicationStatement.adherenceRecords);
      fhirStatement.extension!.push({
        url: 'http://medimate.my/fhir/StructureDefinition/adherence-metrics',
        extension: [
          {
            url: 'adherenceRate',
            valueDecimal: adherenceRate,
          },
          {
            url: 'totalDoses',
            valueDecimal: medicationStatement.adherenceRecords.length,
          },
          {
            url: 'takenDoses',
            valueDecimal: medicationStatement.adherenceRecords.filter(r => r.status === 'taken_on_time' || r.status === 'taken_late').length,
          },
        ],
      });
    }

    return apiClient.request<FHIRMedicationStatement>(
      `${API_ENDPOINTS.FHIR.PATIENT_GET(patientId)}/MedicationStatement`,
      {
        method: 'POST',
        body: JSON.stringify(fhirStatement),
        headers: {
          'Content-Type': 'application/fhir+json',
        },
      }
    );
  }

  /**
   * Create FHIR Observations for adherence tracking
   */
  async createAdherenceObservations(
    patientId: string,
    adherenceData: {
      medicationName: string;
      adherenceRate: number;
      period: string;
      culturalInsights?: string[];
      recommendations?: string[];
    }
  ): Promise<ApiResponse<FHIRObservation[]>> {
    const observations: FHIRObservation[] = [];

    // Primary adherence observation
    const primaryObservation: FHIRObservation = {
      resourceType: 'Observation',
      id: `adherence-obs-${Date.now()}`,
      status: 'final',
      category: [{
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/observation-category',
          code: 'therapy',
          display: 'Therapy',
        }],
      }],
      code: {
        coding: [{
          system: 'http://loinc.org',
          code: '71799-1',
          display: 'Medication adherence',
        }],
        text: 'Medication Adherence Rate',
      },
      subject: {
        reference: `Patient/${patientId}`,
        display: 'Patient',
      },
      effectiveDateTime: new Date().toISOString(),
      valueQuantity: {
        value: adherenceData.adherenceRate,
        unit: '%',
        system: 'http://unitsofmeasure.org',
        code: '%',
      },
      extension: [],
    };

    // Add cultural insights as extensions
    if (adherenceData.culturalInsights?.length) {
      primaryObservation.extension!.push({
        url: 'http://medimate.my/fhir/StructureDefinition/cultural-insights',
        valueString: adherenceData.culturalInsights.join('; '),
      });
    }

    // Add recommendations as extensions
    if (adherenceData.recommendations?.length) {
      primaryObservation.extension!.push({
        url: 'http://medimate.my/fhir/StructureDefinition/adherence-recommendations',
        valueString: adherenceData.recommendations.join('; '),
      });
    }

    observations.push(primaryObservation);

    // Create all observations
    const createdObservations = await Promise.all(
      observations.map(obs =>
        apiClient.request<FHIRObservation>(
          `${API_ENDPOINTS.FHIR.PATIENT_GET(patientId)}/Observation`,
          {
            method: 'POST',
            body: JSON.stringify(obs),
            headers: {
              'Content-Type': 'application/fhir+json',
            },
          }
        )
      )
    );

    return {
      success: true,
      data: createdObservations.filter(r => r.success).map(r => r.data!),
    };
  }

  /**
   * Generate FHIR adherence report for provider
   */
  async generateAdherenceReport(
    patientId: string,
    adherenceReport: AdherenceReport
  ): Promise<ApiResponse<{
    medicationStatements: FHIRMedicationStatement[];
    observations: FHIRObservation[];
    summary: {
      overallAdherence: number;
      culturalConsiderations: string[];
      recommendations: string[];
    };
  }>> {
    try {
      const medicationStatements: FHIRMedicationStatement[] = [];
      const observations: FHIRObservation[] = [];

      // Create medication statements for each medication in the report
      for (const medReport of adherenceReport.medications) {
        const statementResponse = await this.createMedicationStatement(patientId, {
          medicationName: medReport.medication.name,
          medicationCode: medReport.medication.id,
          status: medReport.adherenceRate > 80 ? 'active' : 'stopped',
          effectiveStart: adherenceReport.periodStart,
          effectiveEnd: adherenceReport.periodEnd,
          dosageText: medReport.medication.dosage?.amount + ' ' + medReport.medication.dosage?.unit || 'As prescribed',
          culturalContext: {
            prayerTimeAdjustment: medReport.culturalFactors.includes('prayer_time'),
            ramadanConsideration: medReport.culturalFactors.includes('ramadan'),
            culturalSensitivityLevel: 'high',
          },
        });

        if (statementResponse.success && statementResponse.data) {
          medicationStatements.push(statementResponse.data);
        }

        // Create adherence observation for this medication
        const observationResponse = await this.createAdherenceObservations(patientId, {
          medicationName: medReport.medication.name,
          adherenceRate: medReport.adherenceRate,
          period: `${adherenceReport.periodStart.toISOString()} to ${adherenceReport.periodEnd.toISOString()}`,
          culturalInsights: medReport.culturalFactors,
          recommendations: medReport.recommendations,
        });

        if (observationResponse.success && observationResponse.data) {
          observations.push(...observationResponse.data);
        }
      }

      return {
        success: true,
        data: {
          medicationStatements,
          observations,
          summary: {
            overallAdherence: adherenceReport.overallAdherence,
            culturalConsiderations: adherenceReport.culturalConsiderations,
            recommendations: adherenceReport.recommendations,
          },
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to generate FHIR adherence report',
      };
    }
  }

  /**
   * Convert adherence progress metrics to FHIR Bundle
   */
  convertProgressMetricsToFHIRBundle(
    patientId: string,
    progressMetrics: ProgressMetrics
  ): FHIRBundle {
    const entries: Array<{ resource: FHIRObservation | FHIRMedicationStatement }> = [];

    // Create overall adherence observation
    const overallObservation: FHIRObservation = {
      resourceType: 'Observation',
      id: `overall-adherence-${Date.now()}`,
      status: 'final',
      category: [{
        coding: [{
          system: 'http://terminology.hl7.org/CodeSystem/observation-category',
          code: 'therapy',
          display: 'Therapy',
        }],
      }],
      code: {
        coding: [{
          system: 'http://loinc.org',
          code: '71799-1',
          display: 'Overall medication adherence',
        }],
        text: 'Overall Medication Adherence Rate',
      },
      subject: {
        reference: `Patient/${patientId}`,
        display: 'Patient',
      },
      effectiveDateTime: new Date().toISOString(),
      valueQuantity: {
        value: progressMetrics.overallAdherence,
        unit: '%',
        system: 'http://unitsofmeasure.org',
        code: '%',
      },
      extension: [{
        url: 'http://medimate.my/fhir/StructureDefinition/adherence-period',
        extension: [
          {
            url: 'startDate',
            valueDateTime: progressMetrics.startDate.toISOString(),
          },
          {
            url: 'endDate',
            valueDateTime: progressMetrics.endDate.toISOString(),
          },
          {
            url: 'period',
            valueString: progressMetrics.period,
          },
        ],
      }],
    };

    entries.push({ resource: overallObservation });

    // Add cultural insights as observations
    if (progressMetrics.culturalInsights?.length) {
      progressMetrics.culturalInsights.forEach((insight, index) => {
        const culturalObservation: FHIRObservation = {
          resourceType: 'Observation',
          id: `cultural-insight-${Date.now()}-${index}`,
          status: 'final',
          category: [{
            coding: [{
              system: 'http://medimate.my/fhir/CodeSystem/observation-category',
              code: 'cultural-insight',
              display: 'Cultural Insight',
            }],
          }],
          code: {
            coding: [{
              system: 'http://medimate.my/fhir/CodeSystem/cultural-insights',
              code: insight.type,
              display: insight.type.replace(/_/g, ' '),
            }],
            text: insight.description,
          },
          subject: {
            reference: `Patient/${patientId}`,
            display: 'Patient',
          },
          effectiveDateTime: new Date().toISOString(),
          valueString: insight.description,
          extension: [{
            url: 'http://medimate.my/fhir/StructureDefinition/adherence-impact',
            valueDecimal: insight.adherenceImpact,
          }],
        };

        entries.push({ resource: culturalObservation });
      });
    }

    return {
      resourceType: 'Bundle',
      id: `adherence-bundle-${Date.now()}`,
      type: 'searchset',
      total: entries.length,
      entry: entries,
    };
  }

  /**
   * Calculate adherence rate from adherence records
   */
  private calculateAdherenceRate(records: AdherenceRecord[]): number {
    if (records.length === 0) return 0;

    const takenOnTime = records.filter(r => r.status === 'taken_on_time').length;
    const takenLate = records.filter(r => r.status === 'taken_late').length;

    return Math.round(((takenOnTime + takenLate * 0.8) / records.length) * 100);
  }
}

export const fhirService = new FHIRService();