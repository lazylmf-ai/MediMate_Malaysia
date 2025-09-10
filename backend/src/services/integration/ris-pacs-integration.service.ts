/**
 * Radiology Information System (RIS) and PACS Integration Service
 * 
 * Integrates with Malaysian radiology systems for imaging orders, DICOM management,
 * and radiology report processing. Supports major hospital imaging departments
 * and private radiology centers across Malaysia
 */

import axios, { AxiosInstance } from 'axios';
import { DatabaseService } from '../database/databaseService';
import { FHIRService } from '../fhir/fhir.service';
import { RealtimeService } from '../realtime/realtimeServer';
import { v4 as uuidv4 } from 'uuid';

export interface RISConfig {
  primaryRisUrl: string;
  pacsUrl: string;
  dicomWebUrl: string;
  apiKey: string;
  timeout: number;
  enableDICOMRetrieval: boolean;
  enableReportGeneration: boolean;
  enableCriticalResults: boolean;
}

export interface ImagingModality {
  modalityCode: string;
  modalityName: string;
  modalityNameMs: string; // Bahasa Malaysia
  modalityNameZh: string; // Chinese
  modalityNameTa: string; // Tamil
  description: string;
  bodyParts: string[];
  procedures: Array<{
    procedureCode: string;
    procedureName: string;
    duration: number; // minutes
    preparation: string[];
    contrast: {
      required: boolean;
      type?: string;
      contraindications?: string[];
    };
    radiation: {
      dose: number; // mSv
      category: 'low' | 'medium' | 'high';
    };
  }>;
  equipment: string[];
  specialInstructions: string[];
  halalConsiderations?: {
    contrastAgentsHalal: boolean;
    specialRequirements?: string[];
  };
  cost: {
    amount: number;
    currency: 'MYR';
    subsidized?: boolean;
  };
  isActive: boolean;
}

export interface RadiologyOrderSubmission {
  orderId: string;
  studyInstanceUID?: string;
  patientInfo: {
    nationalId: string;
    name: string;
    dateOfBirth: string;
    gender: 'male' | 'female' | 'other';
    weight?: number;
    height?: number;
    contactNumber: string;
  };
  practitionerInfo: {
    license: string;
    name: string;
    facility: string;
    specialty: string;
  };
  orderDetails: {
    modality: string;
    procedureCode: string;
    procedureName: string;
    bodyPart: string;
    urgency: 'routine' | 'urgent' | 'stat';
    scheduledDate?: string;
    scheduledTime?: string;
    clinicalIndication: string;
    clinicalHistory: string;
    symptoms?: string[];
    provisionalDiagnosis?: string;
  };
  contrastInfo?: {
    required: boolean;
    type: string;
    allergies?: string[];
    previousReactions?: string[];
    creatinine?: number; // for nephrotoxicity screening
  };
  culturalRequirements?: {
    languagePreference: 'en' | 'ms' | 'zh' | 'ta';
    genderPreference?: 'same' | 'any';
    religiousConsiderations?: string[];
    halalRequirements?: {
      contrastHalalRequired: boolean;
      specialInstructions?: string[];
    };
  };
  insuranceInfo?: {
    provider: string;
    policyNumber: string;
    preAuthorization?: string;
  };
}

export interface DICOMSeries {
  seriesInstanceUID: string;
  seriesNumber: number;
  seriesDescription: string;
  modality: string;
  bodyPartExamined: string;
  instanceCount: number;
  seriesDate: string;
  seriesTime: string;
  performingPhysician: string;
  protocolName: string;
  sliceThickness?: number;
  pixelSpacing?: string;
  imageOrientation?: string;
  acquisitionParameters: {
    kvp?: number;
    exposureTime?: number;
    xrayTubeCurrent?: number;
    contrastAgent?: string;
  };
}

export interface RadiologyStudy {
  studyInstanceUID: string;
  accessionNumber: string;
  patientId: string;
  patientName: string;
  modality: string;
  studyDescription: string;
  studyDate: string;
  studyTime: string;
  referringPhysician: string;
  performingPhysician?: string;
  radiologist?: {
    name: string;
    license: string;
    specialization: string;
  };
  institutionName: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'reported';
  series: DICOMSeries[];
  report?: RadiologyReport;
  qualityControl: {
    imageQuality: 'excellent' | 'good' | 'acceptable' | 'poor';
    technicalNotes?: string[];
    repeatRequired?: boolean;
  };
  radiation: {
    totalDose: number; // mSv
    exposureParameters: any[];
  };
}

export interface RadiologyReport {
  reportId: string;
  studyInstanceUID: string;
  accessionNumber: string;
  patientId: string;
  reportingRadiologist: {
    name: string;
    license: string;
    specialization: string;
    signature?: string;
  };
  reportDate: string;
  reportTime: string;
  status: 'preliminary' | 'final' | 'addendum' | 'corrected';
  priority: 'routine' | 'urgent' | 'critical';
  findings: {
    impression: string;
    findings: string;
    recommendation?: string;
    followUp?: string;
    comparison?: string;
    technique?: string;
  };
  measurements?: Array<{
    structure: string;
    measurement: number;
    unit: string;
    normalRange?: string;
  }>;
  criticalFinding?: {
    isCritical: boolean;
    description?: string;
    urgency?: 'immediate' | 'within_4_hours' | 'within_24_hours';
    notificationSent?: boolean;
    acknowledgedBy?: string;
    acknowledgedAt?: string;
  };
  malaysianContext?: {
    languageUsed: 'en' | 'ms' | 'zh' | 'ta';
    culturalConsiderations?: string[];
    familyDisclosureRequirements?: boolean;
  };
  templateUsed?: string;
  dictatedBy?: string;
  transcribedBy?: string;
  verifiedBy?: string;
}

export interface RadiologyOrderResponse {
  success: boolean;
  orderId: string;
  accessionNumber: string;
  studyInstanceUID: string;
  facilityId: string;
  facilityName: string;
  scheduledDateTime: string;
  estimatedDuration: number; // minutes
  preparationInstructions: string[];
  totalCost: {
    amount: number;
    currency: 'MYR';
    breakdown: Array<{
      item: string;
      cost: number;
    }>;
  };
  appointmentDetails: {
    location: string;
    department: string;
    room?: string;
    equipment: string;
    technologist?: string;
    specialInstructions?: string[];
  };
  contrastProtocol?: {
    agent: string;
    dosage: string;
    route: string;
    timing: string;
    monitoring: string[];
  };
  errors?: string[];
  warnings?: string[];
}

export class RISPACSIntegrationService {
  private static instance: RISPACSIntegrationService;
  private axiosInstance: AxiosInstance;
  private pacsInstance: AxiosInstance;
  private db: DatabaseService;
  private fhirService: FHIRService;
  private realtimeService: RealtimeService;
  private config: RISConfig;

  constructor() {
    this.db = DatabaseService.getInstance();
    this.fhirService = FHIRService.getInstance();
    this.realtimeService = RealtimeService.getInstance();
    this.config = this.loadConfig();
    this.axiosInstance = this.createAxiosInstance();
    this.pacsInstance = this.createPACSAxiosInstance();
  }

  public static getInstance(): RISPACSIntegrationService {
    if (!RISPACSIntegrationService.instance) {
      RISPACSIntegrationService.instance = new RISPACSIntegrationService();
    }
    return RISPACSIntegrationService.instance;
  }

  /**
   * Submit radiology order to RIS
   */
  public async submitRadiologyOrder(orderRequest: RadiologyOrderSubmission, facilityId: string): Promise<RadiologyOrderResponse> {
    try {
      // Validate order
      const validation = await this.validateRadiologyOrder(orderRequest);
      if (!validation.isValid) {
        throw new Error(`Radiology order validation failed: ${validation.errors.join(', ')}`);
      }

      // Get facility configuration
      const facilityConfig = await this.getFacilityConfig(facilityId);
      if (!facilityConfig) {
        throw new Error(`Radiology facility configuration not found: ${facilityId}`);
      }

      // Generate study instance UID
      const studyInstanceUID = orderRequest.studyInstanceUID || this.generateStudyInstanceUID();
      const accessionNumber = this.generateAccessionNumber();

      // Prepare order for submission
      const orderPayload = {
        studyInstanceUID,
        accessionNumber,
        patientInfo: orderRequest.patientInfo,
        practitionerInfo: orderRequest.practitionerInfo,
        orderDetails: orderRequest.orderDetails,
        contrastInfo: orderRequest.contrastInfo,
        culturalRequirements: orderRequest.culturalRequirements,
        facilityCode: facilityConfig.facilityCode,
        timestamp: new Date().toISOString()
      };

      // Submit to RIS
      const response = await this.axiosInstance.post(`/facility/${facilityId}/orders`, orderPayload);

      if (!response.data.success) {
        throw new Error(response.data.error || 'Radiology order submission failed');
      }

      // Create FHIR ImagingStudy
      await this.createFHIRImagingStudy(orderRequest, studyInstanceUID, accessionNumber);

      // Store order in local database
      await this.storeRadiologyOrder(orderRequest, response.data);

      const radiologyOrderResponse: RadiologyOrderResponse = {
        success: true,
        orderId: orderRequest.orderId,
        accessionNumber,
        studyInstanceUID,
        facilityId,
        facilityName: facilityConfig.facilityName,
        scheduledDateTime: response.data.scheduledDateTime,
        estimatedDuration: response.data.estimatedDuration,
        preparationInstructions: response.data.preparationInstructions || [],
        totalCost: response.data.totalCost,
        appointmentDetails: response.data.appointmentDetails,
        contrastProtocol: response.data.contrastProtocol,
        warnings: response.data.warnings
      };

      // Emit real-time event
      this.realtimeService.emitHealthcareEvent('radiology-order-submitted', {
        orderId: orderRequest.orderId,
        patientId: orderRequest.patientInfo.nationalId,
        modality: orderRequest.orderDetails.modality,
        procedure: orderRequest.orderDetails.procedureName,
        facilityName: facilityConfig.facilityName,
        urgency: orderRequest.orderDetails.urgency,
        scheduledDateTime: response.data.scheduledDateTime
      });

      return radiologyOrderResponse;

    } catch (error) {
      console.error('Radiology order submission failed:', error);
      throw new Error(`Radiology order submission failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get radiology study from PACS
   */
  public async getRadiologyStudy(studyInstanceUID: string): Promise<RadiologyStudy> {
    try {
      // Get study metadata from RIS
      const studyResponse = await this.axiosInstance.get(`/studies/${studyInstanceUID}`);
      
      if (!studyResponse.data) {
        throw new Error(`Study not found: ${studyInstanceUID}`);
      }

      // Get DICOM metadata from PACS if enabled
      let series: DICOMSeries[] = [];
      if (this.config.enableDICOMRetrieval) {
        try {
          const dicomResponse = await this.pacsInstance.get(`/studies/${studyInstanceUID}/series`);
          series = dicomResponse.data.series || [];
        } catch (error) {
          console.warn('Failed to retrieve DICOM series metadata:', error);
        }
      }

      // Get radiology report if available
      let report: RadiologyReport | undefined;
      if (studyResponse.data.reportId) {
        report = await this.getRadiologyReport(studyResponse.data.reportId);
      }

      const study: RadiologyStudy = {
        studyInstanceUID: studyResponse.data.studyInstanceUID,
        accessionNumber: studyResponse.data.accessionNumber,
        patientId: studyResponse.data.patientId,
        patientName: studyResponse.data.patientName,
        modality: studyResponse.data.modality,
        studyDescription: studyResponse.data.studyDescription,
        studyDate: studyResponse.data.studyDate,
        studyTime: studyResponse.data.studyTime,
        referringPhysician: studyResponse.data.referringPhysician,
        performingPhysician: studyResponse.data.performingPhysician,
        radiologist: studyResponse.data.radiologist,
        institutionName: studyResponse.data.institutionName,
        status: studyResponse.data.status,
        series,
        report,
        qualityControl: studyResponse.data.qualityControl || {
          imageQuality: 'good'
        },
        radiation: studyResponse.data.radiation || {
          totalDose: 0,
          exposureParameters: []
        }
      };

      return study;

    } catch (error) {
      console.error('Failed to get radiology study:', error);
      throw new Error(`Failed to get radiology study: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get radiology report
   */
  public async getRadiologyReport(reportId: string): Promise<RadiologyReport> {
    try {
      const response = await this.axiosInstance.get(`/reports/${reportId}`);
      
      if (!response.data) {
        throw new Error(`Radiology report not found: ${reportId}`);
      }

      return response.data as RadiologyReport;

    } catch (error) {
      console.error('Failed to get radiology report:', error);
      throw new Error(`Failed to get radiology report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Submit radiology report
   */
  public async submitRadiologyReport(report: RadiologyReport): Promise<{ success: boolean; reportId: string }> {
    try {
      // Validate report
      const validation = await this.validateRadiologyReport(report);
      if (!validation.isValid) {
        throw new Error(`Report validation failed: ${validation.errors.join(', ')}`);
      }

      // Submit report to RIS
      const response = await this.axiosInstance.post('/reports', report);

      if (!response.data.success) {
        throw new Error(response.data.error || 'Report submission failed');
      }

      // Create FHIR DiagnosticReport
      await this.createFHIRDiagnosticReportFromRadiology(report);

      // Store report in local database
      await this.storeRadiologyReport(report);

      // Handle critical findings
      if (report.criticalFinding?.isCritical) {
        await this.handleCriticalRadiologyFinding(report);
      }

      // Emit real-time event
      this.realtimeService.emitHealthcareEvent('radiology-report-available', {
        reportId: report.reportId,
        studyInstanceUID: report.studyInstanceUID,
        patientId: report.patientId,
        modality: 'Unknown', // Would get from study
        status: report.status,
        isCritical: report.criticalFinding?.isCritical || false,
        radiologist: report.reportingRadiologist.name
      });

      return {
        success: true,
        reportId: response.data.reportId
      };

    } catch (error) {
      console.error('Radiology report submission failed:', error);
      throw new Error(`Radiology report submission failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get imaging modalities catalog
   */
  public async getImagingModalitiesCatalog(): Promise<ImagingModality[]> {
    try {
      const connection = this.db.getConnection();
      
      const modalities = await connection.manyOrNone(
        'SELECT * FROM imaging_modalities WHERE is_active = true ORDER BY modality_name'
      );

      return modalities.map((modality: any) => ({
        modalityCode: modality.modality_code,
        modalityName: modality.modality_name,
        modalityNameMs: modality.modality_name_ms,
        modalityNameZh: modality.modality_name_zh,
        modalityNameTa: modality.modality_name_ta,
        description: modality.description,
        bodyParts: modality.body_parts || [],
        procedures: JSON.parse(modality.procedures),
        equipment: modality.equipment || [],
        specialInstructions: modality.special_instructions || [],
        halalConsiderations: modality.halal_considerations ? JSON.parse(modality.halal_considerations) : undefined,
        cost: JSON.parse(modality.cost),
        isActive: modality.is_active
      }));

    } catch (error) {
      console.error('Failed to get imaging modalities catalog:', error);
      throw new Error(`Failed to get imaging modalities catalog: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get patient radiology history
   */
  public async getPatientRadiologyHistory(patientId: string, modality?: string, fromDate?: string, toDate?: string): Promise<RadiologyStudy[]> {
    try {
      const connection = this.db.getConnection();
      
      let query = `
        SELECT * FROM radiology_studies 
        WHERE patient_id = $1
      `;
      const params: any[] = [patientId];
      let paramIndex = 2;

      if (modality) {
        query += ` AND modality = $${paramIndex}`;
        params.push(modality);
        paramIndex++;
      }

      if (fromDate) {
        query += ` AND study_date >= $${paramIndex}`;
        params.push(fromDate);
        paramIndex++;
      }

      if (toDate) {
        query += ` AND study_date <= $${paramIndex}`;
        params.push(toDate);
        paramIndex++;
      }

      query += ' ORDER BY study_date DESC, study_time DESC LIMIT 50';

      const studies = await connection.manyOrNone(query, params);

      const results: RadiologyStudy[] = [];

      for (const study of studies) {
        // Get series data
        const series = await connection.manyOrNone(
          'SELECT * FROM dicom_series WHERE study_instance_uid = $1',
          [study.study_instance_uid]
        );

        // Get report if available
        let report: RadiologyReport | undefined;
        if (study.report_id) {
          const reportData = await connection.oneOrNone(
            'SELECT * FROM radiology_reports WHERE report_id = $1',
            [study.report_id]
          );
          
          if (reportData) {
            report = {
              reportId: reportData.report_id,
              studyInstanceUID: reportData.study_instance_uid,
              accessionNumber: reportData.accession_number,
              patientId: reportData.patient_id,
              reportingRadiologist: JSON.parse(reportData.reporting_radiologist),
              reportDate: reportData.report_date,
              reportTime: reportData.report_time,
              status: reportData.status,
              priority: reportData.priority,
              findings: JSON.parse(reportData.findings),
              measurements: reportData.measurements ? JSON.parse(reportData.measurements) : undefined,
              criticalFinding: reportData.critical_finding ? JSON.parse(reportData.critical_finding) : undefined,
              malaysianContext: reportData.malaysian_context ? JSON.parse(reportData.malaysian_context) : undefined
            };
          }
        }

        results.push({
          studyInstanceUID: study.study_instance_uid,
          accessionNumber: study.accession_number,
          patientId: study.patient_id,
          patientName: study.patient_name,
          modality: study.modality,
          studyDescription: study.study_description,
          studyDate: study.study_date,
          studyTime: study.study_time,
          referringPhysician: study.referring_physician,
          performingPhysician: study.performing_physician,
          radiologist: study.radiologist ? JSON.parse(study.radiologist) : undefined,
          institutionName: study.institution_name,
          status: study.status,
          series: series.map((s: any) => ({
            seriesInstanceUID: s.series_instance_uid,
            seriesNumber: s.series_number,
            seriesDescription: s.series_description,
            modality: s.modality,
            bodyPartExamined: s.body_part_examined,
            instanceCount: s.instance_count,
            seriesDate: s.series_date,
            seriesTime: s.series_time,
            performingPhysician: s.performing_physician,
            protocolName: s.protocol_name,
            sliceThickness: s.slice_thickness,
            pixelSpacing: s.pixel_spacing,
            imageOrientation: s.image_orientation,
            acquisitionParameters: s.acquisition_parameters ? JSON.parse(s.acquisition_parameters) : {}
          })),
          report,
          qualityControl: study.quality_control ? JSON.parse(study.quality_control) : { imageQuality: 'good' },
          radiation: study.radiation ? JSON.parse(study.radiation) : { totalDose: 0, exposureParameters: [] }
        });
      }

      return results;

    } catch (error) {
      console.error('Failed to get patient radiology history:', error);
      throw new Error(`Failed to get patient radiology history: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private loadConfig(): RISConfig {
    return {
      primaryRisUrl: process.env.RIS_PRIMARY_URL || 'https://ris.moh.gov.my/api',
      pacsUrl: process.env.PACS_URL || 'https://pacs.moh.gov.my',
      dicomWebUrl: process.env.DICOM_WEB_URL || 'https://dicomweb.moh.gov.my',
      apiKey: process.env.RIS_API_KEY || '',
      timeout: parseInt(process.env.RIS_TIMEOUT || '30000'),
      enableDICOMRetrieval: process.env.RIS_ENABLE_DICOM !== 'false',
      enableReportGeneration: process.env.RIS_ENABLE_REPORTS !== 'false',
      enableCriticalResults: process.env.RIS_CRITICAL_RESULTS !== 'false'
    };
  }

  private createAxiosInstance(): AxiosInstance {
    return axios.create({
      baseURL: this.config.primaryRisUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-API-Key': this.config.apiKey,
        'User-Agent': 'MediMate-Malaysia-RIS/1.0.0'
      }
    });
  }

  private createPACSAxiosInstance(): AxiosInstance {
    return axios.create({
      baseURL: this.config.dicomWebUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-API-Key': this.config.apiKey,
        'User-Agent': 'MediMate-Malaysia-PACS/1.0.0'
      }
    });
  }

  private async validateRadiologyOrder(orderRequest: RadiologyOrderSubmission): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Validate patient info
    if (!orderRequest.patientInfo.nationalId) {
      errors.push('Patient national ID is required');
    }

    // Validate practitioner info
    if (!orderRequest.practitionerInfo.license) {
      errors.push('Practitioner license is required');
    }

    // Validate order details
    if (!orderRequest.orderDetails.modality) {
      errors.push('Imaging modality is required');
    }

    if (!orderRequest.orderDetails.clinicalIndication) {
      errors.push('Clinical indication is required');
    }

    // Validate modality and procedure
    const modalityInfo = await this.getModalityInfo(orderRequest.orderDetails.modality);
    if (!modalityInfo) {
      errors.push(`Invalid imaging modality: ${orderRequest.orderDetails.modality}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private async validateRadiologyReport(report: RadiologyReport): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    if (!report.studyInstanceUID) {
      errors.push('Study instance UID is required');
    }

    if (!report.reportingRadiologist.license) {
      errors.push('Reporting radiologist license is required');
    }

    if (!report.findings.impression) {
      errors.push('Impression is required');
    }

    if (!report.findings.findings) {
      errors.push('Findings section is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private async getFacilityConfig(facilityId: string): Promise<any> {
    try {
      const connection = this.db.getConnection();
      const config = await connection.oneOrNone(
        'SELECT * FROM radiology_facility_config WHERE facility_id = $1 AND is_active = true',
        [facilityId]
      );

      return config ? {
        facilityId: config.facility_id,
        facilityName: config.facility_name,
        facilityCode: config.facility_code,
        endpoint: config.endpoint,
        pacsEndpoint: config.pacs_endpoint,
        authConfig: JSON.parse(config.auth_config),
        supportedModalities: config.supported_modalities || [],
        equipmentList: JSON.parse(config.equipment_list)
      } : null;

    } catch (error) {
      console.error('Failed to get facility config:', error);
      return null;
    }
  }

  private async getModalityInfo(modalityCode: string): Promise<ImagingModality | null> {
    try {
      const connection = this.db.getConnection();
      const modality = await connection.oneOrNone(
        'SELECT * FROM imaging_modalities WHERE modality_code = $1 AND is_active = true',
        [modalityCode]
      );

      if (!modality) return null;

      return {
        modalityCode: modality.modality_code,
        modalityName: modality.modality_name,
        modalityNameMs: modality.modality_name_ms,
        modalityNameZh: modality.modality_name_zh,
        modalityNameTa: modality.modality_name_ta,
        description: modality.description,
        bodyParts: modality.body_parts || [],
        procedures: JSON.parse(modality.procedures),
        equipment: modality.equipment || [],
        specialInstructions: modality.special_instructions || [],
        halalConsiderations: modality.halal_considerations ? JSON.parse(modality.halal_considerations) : undefined,
        cost: JSON.parse(modality.cost),
        isActive: modality.is_active
      };

    } catch (error) {
      console.error('Failed to get modality info:', error);
      return null;
    }
  }

  private generateStudyInstanceUID(): string {
    // Generate DICOM-compliant Study Instance UID
    const orgRoot = '1.2.840.10008.3.1.2'; // Example organization root
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000000);
    return `${orgRoot}.${timestamp}.${random}`;
  }

  private generateAccessionNumber(): string {
    // Generate unique accession number
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `RAD${date}${random}`;
  }

  private async createFHIRImagingStudy(orderRequest: RadiologyOrderSubmission, studyInstanceUID: string, accessionNumber: string): Promise<void> {
    try {
      const imagingStudy = {
        resourceType: 'ImagingStudy',
        id: uuidv4(),
        identifier: [{
          use: 'usual',
          system: 'https://fhir.medimate.my/identifier/radiology-order',
          value: orderRequest.orderId
        }, {
          use: 'secondary',
          system: 'urn:dicom:uid',
          value: studyInstanceUID
        }],
        status: 'registered',
        modality: [{
          system: 'http://dicom.nema.org/resources/ontology/DCM',
          code: orderRequest.orderDetails.modality,
          display: orderRequest.orderDetails.modality
        }],
        subject: {
          reference: `Patient/${orderRequest.patientInfo.nationalId}`,
          display: orderRequest.patientInfo.name
        },
        started: orderRequest.orderDetails.scheduledDate,
        basedOn: [{
          reference: `ServiceRequest/${orderRequest.orderId}`,
          display: orderRequest.orderDetails.procedureName
        }],
        referrer: {
          reference: `Practitioner/${orderRequest.practitionerInfo.license}`,
          display: orderRequest.practitionerInfo.name
        },
        procedureCode: {
          coding: [{
            system: 'https://fhir.moh.gov.my/CodeSystem/radiology-procedures',
            code: orderRequest.orderDetails.procedureCode,
            display: orderRequest.orderDetails.procedureName
          }]
        },
        reasonCode: [{
          text: orderRequest.orderDetails.clinicalIndication
        }],
        note: [{
          text: `Clinical History: ${orderRequest.orderDetails.clinicalHistory}`
        }]
      };

      await this.fhirService.createResource('ImagingStudy', imagingStudy);

    } catch (error) {
      console.error('Failed to create FHIR ImagingStudy:', error);
    }
  }

  private async createFHIRDiagnosticReportFromRadiology(report: RadiologyReport): Promise<void> {
    try {
      const diagnosticReport = {
        resourceType: 'DiagnosticReport',
        id: uuidv4(),
        identifier: [{
          use: 'usual',
          system: 'https://fhir.medimate.my/identifier/radiology-report',
          value: report.reportId
        }],
        status: report.status,
        category: [{
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/v2-0074',
            code: 'RAD',
            display: 'Radiology'
          }]
        }],
        code: {
          text: 'Radiology Report'
        },
        subject: {
          reference: `Patient/${report.patientId}`
        },
        issued: report.reportDate,
        performer: [{
          actor: {
            display: report.reportingRadiologist.name
          }
        }],
        imagingStudy: [{
          reference: `ImagingStudy/${report.studyInstanceUID}`,
          display: `Study ${report.accessionNumber}`
        }],
        conclusion: report.findings.impression,
        conclusionCode: report.criticalFinding?.isCritical ? [{
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation',
            code: 'A',
            display: 'Abnormal'
          }]
        }] : undefined
      };

      await this.fhirService.createResource('DiagnosticReport', diagnosticReport);

    } catch (error) {
      console.error('Failed to create FHIR DiagnosticReport:', error);
    }
  }

  private async handleCriticalRadiologyFinding(report: RadiologyReport): Promise<void> {
    try {
      // Log critical finding
      console.log(`Critical radiology finding detected: ${report.reportId} for patient ${report.patientId}`);

      // Send immediate notification
      await this.sendCriticalFindingAlert(report);

      // Store critical finding notification
      await this.storeCriticalFindingNotification(report);

    } catch (error) {
      console.error('Failed to handle critical radiology finding:', error);
    }
  }

  private async sendCriticalFindingAlert(report: RadiologyReport): Promise<void> {
    // Implementation would send alerts to referring physician and other relevant providers
    console.log('Sending critical radiology finding alert...');
  }

  private async storeCriticalFindingNotification(report: RadiologyReport): Promise<void> {
    try {
      const connection = this.db.getConnection();
      await connection.none(`
        INSERT INTO critical_radiology_notifications (
          id, report_id, study_instance_uid, patient_id,
          critical_finding, urgency, notified_at,
          notification_methods, acknowledgment_status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), $7, 'pending', NOW())
      `, [
        uuidv4(),
        report.reportId,
        report.studyInstanceUID,
        report.patientId,
        report.criticalFinding?.description,
        report.criticalFinding?.urgency,
        JSON.stringify(['real-time-alert', 'email', 'phone'])
      ]);
    } catch (error) {
      console.error('Failed to store critical finding notification:', error);
    }
  }

  private async storeRadiologyOrder(orderRequest: RadiologyOrderSubmission, response: any): Promise<void> {
    try {
      const connection = this.db.getConnection();
      await connection.none(`
        INSERT INTO radiology_orders (
          order_id, study_instance_uid, accession_number, facility_id,
          patient_info, practitioner_info, order_details, contrast_info,
          cultural_requirements, scheduled_datetime, estimated_duration,
          total_cost, appointment_details, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
      `, [
        orderRequest.orderId,
        response.studyInstanceUID,
        response.accessionNumber,
        response.facilityId,
        JSON.stringify(orderRequest.patientInfo),
        JSON.stringify(orderRequest.practitionerInfo),
        JSON.stringify(orderRequest.orderDetails),
        JSON.stringify(orderRequest.contrastInfo),
        JSON.stringify(orderRequest.culturalRequirements),
        response.scheduledDateTime,
        response.estimatedDuration,
        JSON.stringify(response.totalCost),
        JSON.stringify(response.appointmentDetails),
        'scheduled'
      ]);
    } catch (error) {
      console.error('Failed to store radiology order:', error);
    }
  }

  private async storeRadiologyReport(report: RadiologyReport): Promise<void> {
    try {
      const connection = this.db.getConnection();
      await connection.none(`
        INSERT INTO radiology_reports (
          report_id, study_instance_uid, accession_number, patient_id,
          reporting_radiologist, report_date, report_time, status,
          priority, findings, measurements, critical_finding,
          malaysian_context, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
      `, [
        report.reportId,
        report.studyInstanceUID,
        report.accessionNumber,
        report.patientId,
        JSON.stringify(report.reportingRadiologist),
        report.reportDate,
        report.reportTime,
        report.status,
        report.priority,
        JSON.stringify(report.findings),
        JSON.stringify(report.measurements),
        JSON.stringify(report.criticalFinding),
        JSON.stringify(report.malaysianContext)
      ]);
    } catch (error) {
      console.error('Failed to store radiology report:', error);
    }
  }
}

export default RISPACSIntegrationService;