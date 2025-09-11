/**
 * Laboratory Information System (LIS) Integration Service
 * 
 * Integrates with Malaysian laboratory systems for test ordering, result processing,
 * and quality control. Supports major laboratory chains and hospital labs across Malaysia
 */

import axios, { AxiosInstance } from 'axios';
import { DatabaseService } from '../database/databaseService';
import { FHIRService } from '../fhir/fhir.service';
import { RealtimeService } from '../realtime/realtimeServer';
import { 
  LabOrderRequest,
  LabResultResponse
} from '../../types/fhir/fhir-operations';
import { v4 as uuidv4 } from 'uuid';

export interface LISConfig {
  primaryLisUrl: string;
  backupLisUrl?: string;
  apiKey: string;
  timeout: number;
  enableRealTimeResults: boolean;
  enableQualityControl: boolean;
  enableCriticalValueAlerts: boolean;
}

export interface LabTest {
  testCode: string;
  testName: string;
  testNameMs: string; // Bahasa Malaysia
  testNameZh: string; // Chinese
  testNameTa: string; // Tamil
  category: 'chemistry' | 'hematology' | 'microbiology' | 'immunology' | 'pathology' | 'genetics' | 'toxicology';
  specimen: {
    type: string;
    volume: number;
    unit: string;
    container: string;
    specialInstructions?: string[];
  };
  turnaroundTime: {
    routine: number; // hours
    urgent: number; // hours
    stat: number; // hours
  };
  referenceRanges: Array<{
    population: 'adult_male' | 'adult_female' | 'pediatric' | 'newborn' | 'geriatric';
    ageRange?: string;
    unit: string;
    lowValue?: number;
    highValue?: number;
    textualRange?: string;
    malaysianSpecific?: boolean;
  }>;
  criticalValues: {
    lowCritical?: number;
    highCritical?: number;
    unit: string;
  };
  methodology: string;
  interference: string[];
  preparation: string[];
  halalConsiderations?: {
    reagentsHalal: boolean;
    specialRequirements?: string[];
  };
  cost: {
    amount: number;
    currency: 'MYR';
    subsidized?: boolean;
  };
  isActive: boolean;
}

export interface LabOrderSubmission {
  orderId: string;
  patientInfo: {
    nationalId: string;
    name: string;
    dateOfBirth: string;
    gender: 'male' | 'female' | 'other';
    contactNumber: string;
    address: string;
  };
  practitionerInfo: {
    license: string;
    name: string;
    facility: string;
    contactNumber: string;
  };
  orderDetails: {
    urgency: 'routine' | 'urgent' | 'stat';
    collectionDate?: string;
    collectionTime?: string;
    clinicalIndication: string;
    diagnosis?: string[];
    symptoms?: string[];
    relevantHistory?: string;
  };
  tests: Array<{
    testCode: string;
    testName: string;
    specimenType: string;
    collectionInstructions?: string;
    fasting?: boolean;
    specialPreparation?: string[];
  }>;
  culturalRequirements?: {
    languagePreference: 'en' | 'ms' | 'zh' | 'ta';
    halalRequirements: {
      avoidPorkProducts: boolean;
      avoidAlcoholBasedReagents: boolean;
    };
    religiousConsiderations?: string[];
  };
  insuranceInfo?: {
    provider: string;
    policyNumber: string;
    coverageType: 'full' | 'partial' | 'none';
  };
}

export interface LabResult {
  resultId: string;
  orderId: string;
  patientId: string;
  testCode: string;
  testName: string;
  value: string | number;
  unit?: string;
  referenceRange?: string;
  status: 'preliminary' | 'final' | 'corrected' | 'cancelled';
  abnormalFlag?: 'high' | 'low' | 'critical-high' | 'critical-low' | 'abnormal';
  interpretation?: string;
  methodology?: string;
  performedDate: string;
  resultedDate: string;
  reviewedBy?: {
    pathologist: string;
    license: string;
    signature?: string;
  };
  qualityControl: {
    controlsPassed: boolean;
    calibrationStatus: 'pass' | 'fail';
    instrumentId: string;
    lot?: string;
  };
  criticalValue?: {
    isCritical: boolean;
    notifiedAt?: string;
    notifiedTo?: string;
    acknowledgment?: string;
  };
}

export interface LabOrderResponse {
  success: boolean;
  orderId: string;
  externalOrderId: string;
  laboratoryId: string;
  laboratoryName: string;
  estimatedCompletionTime: string;
  totalCost: {
    amount: number;
    currency: 'MYR';
    breakdown: Array<{
      testCode: string;
      testName: string;
      cost: number;
    }>;
  };
  collectionInstructions: {
    location: string;
    dateTime: string;
    specialInstructions?: string[];
    fasting?: {
      required: boolean;
      hours: number;
    };
  };
  trackingNumber: string;
  errors?: string[];
  warnings?: string[];
}

export interface LabResultNotification {
  resultId: string;
  orderId: string;
  patientId: string;
  patientName: string;
  testName: string;
  result: string;
  abnormalFlag?: string;
  criticalValue: boolean;
  laboratoryName: string;
  resultDate: string;
  practitionerId: string;
  practitionerName: string;
}

export class LISIntegrationService {
  private static instance: LISIntegrationService;
  private axiosInstance: AxiosInstance;
  private db: DatabaseService;
  private fhirService: FHIRService;
  private realtimeService: RealtimeService;
  private config: LISConfig;

  constructor() {
    this.db = DatabaseService.getInstance();
    this.fhirService = FHIRService.getInstance();
    this.realtimeService = RealtimeService.getInstance();
    this.config = this.loadConfig();
    this.axiosInstance = this.createAxiosInstance();
  }

  public static getInstance(): LISIntegrationService {
    if (!LISIntegrationService.instance) {
      LISIntegrationService.instance = new LISIntegrationService();
    }
    return LISIntegrationService.instance;
  }

  /**
   * Submit lab order to laboratory system
   */
  public async submitLabOrder(orderRequest: LabOrderSubmission, laboratoryId: string): Promise<LabOrderResponse> {
    try {
      // Validate order first
      const validation = await this.validateLabOrder(orderRequest);
      if (!validation.isValid) {
        throw new Error(`Lab order validation failed: ${validation.errors.join(', ')}`);
      }

      // Get laboratory configuration
      const labConfig = await this.getLaboratoryConfig(laboratoryId);
      if (!labConfig) {
        throw new Error(`Laboratory configuration not found: ${laboratoryId}`);
      }

      // Prepare order for submission
      const orderPayload = {
        orderDetails: orderRequest.orderDetails,
        patientInfo: orderRequest.patientInfo,
        practitionerInfo: orderRequest.practitionerInfo,
        tests: orderRequest.tests,
        culturalRequirements: orderRequest.culturalRequirements,
        facilityCode: labConfig.facilityCode,
        timestamp: new Date().toISOString()
      };

      // Submit to laboratory system
      const response = await this.axiosInstance.post(`/laboratory/${laboratoryId}/orders`, orderPayload);

      if (!response.data.success) {
        throw new Error(response.data.error || 'Lab order submission failed');
      }

      // Create FHIR ServiceRequest
      await this.createFHIRServiceRequest(orderRequest, response.data.externalOrderId);

      // Store order in local database
      await this.storeLabOrder(orderRequest, response.data);

      const labOrderResponse: LabOrderResponse = {
        success: true,
        orderId: orderRequest.orderId,
        externalOrderId: response.data.externalOrderId,
        laboratoryId,
        laboratoryName: labConfig.laboratoryName,
        estimatedCompletionTime: response.data.estimatedCompletion,
        totalCost: response.data.totalCost,
        collectionInstructions: response.data.collectionInstructions,
        trackingNumber: response.data.trackingNumber,
        warnings: response.data.warnings
      };

      // Emit real-time event
      this.realtimeService.emitHealthcareEvent('lab-order-submitted', {
        orderId: orderRequest.orderId,
        patientId: orderRequest.patientInfo.nationalId,
        laboratoryName: labConfig.laboratoryName,
        testCount: orderRequest.tests.length,
        urgency: orderRequest.orderDetails.urgency
      });

      return labOrderResponse;

    } catch (error) {
      console.error('Lab order submission failed:', error);
      throw new Error(`Lab order submission failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process incoming lab results
   */
  public async processLabResults(resultsData: any[]): Promise<{ processed: number; errors: number }> {
    let processed = 0;
    let errors = 0;

    for (const resultData of resultsData) {
      try {
        const labResult = await this.parseLabResult(resultData);
        
        // Store result in local database
        await this.storeLabResult(labResult);

        // Create FHIR DiagnosticReport and Observation
        await this.createFHIRDiagnosticReport(labResult);

        // Check for critical values
        if (labResult.criticalValue?.isCritical) {
          await this.handleCriticalValue(labResult);
        }

        // Emit real-time result notification
        await this.emitResultNotification(labResult);

        processed++;

      } catch (error) {
        console.error(`Failed to process lab result:`, error);
        errors++;
      }
    }

    return { processed, errors };
  }

  /**
   * Get lab test catalog
   */
  public async getLabTestCatalog(category?: string, searchTerm?: string): Promise<LabTest[]> {
    try {
      const connection = this.db.getConnection();
      
      let query = 'SELECT * FROM lab_test_catalog WHERE is_active = true';
      const params: any[] = [];
      let paramIndex = 1;

      if (category) {
        query += ` AND category = $${paramIndex}`;
        params.push(category);
        paramIndex++;
      }

      if (searchTerm) {
        query += ` AND (test_name ILIKE $${paramIndex} OR test_code ILIKE $${paramIndex})`;
        params.push(`%${searchTerm}%`);
        paramIndex++;
      }

      query += ' ORDER BY category, test_name';

      const tests = await connection.manyOrNone(query, params);

      return tests.map((test: any) => ({
        testCode: test.test_code,
        testName: test.test_name,
        testNameMs: test.test_name_ms,
        testNameZh: test.test_name_zh,
        testNameTa: test.test_name_ta,
        category: test.category,
        specimen: JSON.parse(test.specimen),
        turnaroundTime: JSON.parse(test.turnaround_time),
        referenceRanges: JSON.parse(test.reference_ranges),
        criticalValues: JSON.parse(test.critical_values),
        methodology: test.methodology,
        interference: test.interference || [],
        preparation: test.preparation || [],
        halalConsiderations: test.halal_considerations ? JSON.parse(test.halal_considerations) : undefined,
        cost: JSON.parse(test.cost),
        isActive: test.is_active
      }));

    } catch (error) {
      console.error('Failed to get lab test catalog:', error);
      throw new Error(`Failed to get lab test catalog: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get lab order status
   */
  public async getLabOrderStatus(orderId: string): Promise<any> {
    try {
      const connection = this.db.getConnection();
      
      const orderStatus = await connection.oneOrNone(`
        SELECT 
          lo.*,
          COUNT(lr.id) as result_count,
          COUNT(CASE WHEN lr.status = 'final' THEN 1 END) as final_results,
          COUNT(CASE WHEN lr.critical_value = true THEN 1 END) as critical_results
        FROM lab_orders lo
        LEFT JOIN lab_results lr ON lo.order_id = lr.order_id
        WHERE lo.order_id = $1
        GROUP BY lo.id
      `, [orderId]);

      if (!orderStatus) {
        throw new Error(`Lab order not found: ${orderId}`);
      }

      const results = await connection.manyOrNone(
        'SELECT * FROM lab_results WHERE order_id = $1 ORDER BY resulted_date DESC',
        [orderId]
      );

      return {
        orderId: orderStatus.order_id,
        externalOrderId: orderStatus.external_order_id,
        status: orderStatus.status,
        patientInfo: JSON.parse(orderStatus.patient_info),
        laboratoryName: orderStatus.laboratory_name,
        orderedDate: orderStatus.ordered_date,
        estimatedCompletion: orderStatus.estimated_completion,
        totalTests: orderStatus.result_count || 0,
        completedTests: orderStatus.final_results || 0,
        criticalResults: orderStatus.critical_results || 0,
        results: results.map((result: any) => ({
          testName: result.test_name,
          value: result.value,
          unit: result.unit,
          referenceRange: result.reference_range,
          status: result.status,
          abnormalFlag: result.abnormal_flag,
          resultDate: result.resulted_date,
          isCritical: result.critical_value
        }))
      };

    } catch (error) {
      console.error('Failed to get lab order status:', error);
      throw new Error(`Failed to get lab order status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get patient lab history
   */
  public async getPatientLabHistory(patientId: string, testCode?: string, fromDate?: string, toDate?: string): Promise<any[]> {
    try {
      const connection = this.db.getConnection();
      
      let query = `
        SELECT 
          lr.*,
          lo.ordered_date,
          lo.laboratory_name,
          lo.practitioner_info
        FROM lab_results lr
        JOIN lab_orders lo ON lr.order_id = lo.order_id
        WHERE lo.patient_info->>'nationalId' = $1
      `;
      const params: any[] = [patientId];
      let paramIndex = 2;

      if (testCode) {
        query += ` AND lr.test_code = $${paramIndex}`;
        params.push(testCode);
        paramIndex++;
      }

      if (fromDate) {
        query += ` AND lr.resulted_date >= $${paramIndex}`;
        params.push(fromDate);
        paramIndex++;
      }

      if (toDate) {
        query += ` AND lr.resulted_date <= $${paramIndex}`;
        params.push(toDate);
        paramIndex++;
      }

      query += ' ORDER BY lr.resulted_date DESC LIMIT 100';

      const history = await connection.manyOrNone(query, params);

      return history.map((record: any) => ({
        resultId: record.result_id,
        orderId: record.order_id,
        testCode: record.test_code,
        testName: record.test_name,
        value: record.value,
        unit: record.unit,
        referenceRange: record.reference_range,
        abnormalFlag: record.abnormal_flag,
        status: record.status,
        resultDate: record.resulted_date,
        orderedDate: record.ordered_date,
        laboratoryName: record.laboratory_name,
        practitioner: JSON.parse(record.practitioner_info),
        isCritical: record.critical_value
      }));

    } catch (error) {
      console.error('Failed to get patient lab history:', error);
      throw new Error(`Failed to get patient lab history: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private loadConfig(): LISConfig {
    return {
      primaryLisUrl: process.env.LIS_PRIMARY_URL || 'https://lis.moh.gov.my/api',
      backupLisUrl: process.env.LIS_BACKUP_URL,
      apiKey: process.env.LIS_API_KEY || '',
      timeout: parseInt(process.env.LIS_TIMEOUT || '30000'),
      enableRealTimeResults: process.env.LIS_REALTIME_RESULTS !== 'false',
      enableQualityControl: process.env.LIS_QUALITY_CONTROL !== 'false',
      enableCriticalValueAlerts: process.env.LIS_CRITICAL_ALERTS !== 'false'
    };
  }

  private createAxiosInstance(): AxiosInstance {
    return axios.create({
      baseURL: this.config.primaryLisUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-API-Key': this.config.apiKey,
        'User-Agent': 'MediMate-Malaysia-LIS/1.0.0'
      }
    });
  }

  private async validateLabOrder(orderRequest: LabOrderSubmission): Promise<{ isValid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // Validate patient info
    if (!orderRequest.patientInfo.nationalId) {
      errors.push('Patient national ID is required');
    }

    // Validate practitioner info
    if (!orderRequest.practitionerInfo.license) {
      errors.push('Practitioner license is required');
    }

    // Validate tests
    if (!orderRequest.tests || orderRequest.tests.length === 0) {
      errors.push('At least one test must be specified');
    }

    for (const test of orderRequest.tests) {
      const testInfo = await this.getTestInfo(test.testCode);
      if (!testInfo) {
        errors.push(`Invalid test code: ${test.testCode}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  private async getLaboratoryConfig(laboratoryId: string): Promise<any> {
    try {
      const connection = this.db.getConnection();
      const config = await connection.oneOrNone(
        'SELECT * FROM laboratory_config WHERE laboratory_id = $1 AND is_active = true',
        [laboratoryId]
      );

      return config ? {
        laboratoryId: config.laboratory_id,
        laboratoryName: config.laboratory_name,
        facilityCode: config.facility_code,
        endpoint: config.endpoint,
        authConfig: JSON.parse(config.auth_config),
        supportedTests: config.supported_tests || [],
        turnaroundTimes: JSON.parse(config.turnaround_times),
        pricing: JSON.parse(config.pricing)
      } : null;

    } catch (error) {
      console.error('Failed to get laboratory config:', error);
      return null;
    }
  }

  private async getTestInfo(testCode: string): Promise<LabTest | null> {
    try {
      const connection = this.db.getConnection();
      const test = await connection.oneOrNone(
        'SELECT * FROM lab_test_catalog WHERE test_code = $1 AND is_active = true',
        [testCode]
      );

      if (!test) return null;

      return {
        testCode: test.test_code,
        testName: test.test_name,
        testNameMs: test.test_name_ms,
        testNameZh: test.test_name_zh,
        testNameTa: test.test_name_ta,
        category: test.category,
        specimen: JSON.parse(test.specimen),
        turnaroundTime: JSON.parse(test.turnaround_time),
        referenceRanges: JSON.parse(test.reference_ranges),
        criticalValues: JSON.parse(test.critical_values),
        methodology: test.methodology,
        interference: test.interference || [],
        preparation: test.preparation || [],
        halalConsiderations: test.halal_considerations ? JSON.parse(test.halal_considerations) : undefined,
        cost: JSON.parse(test.cost),
        isActive: test.is_active
      };

    } catch (error) {
      console.error('Failed to get test info:', error);
      return null;
    }
  }

  private async createFHIRServiceRequest(orderRequest: LabOrderSubmission, externalOrderId: string): Promise<void> {
    try {
      const serviceRequest = {
        resourceType: 'ServiceRequest',
        id: uuidv4(),
        identifier: [{
          use: 'usual',
          system: 'https://fhir.medimate.my/identifier/lab-order',
          value: orderRequest.orderId
        }, {
          use: 'secondary',
          system: 'https://fhir.medimate.my/identifier/external-lab-order',
          value: externalOrderId
        }],
        status: 'active',
        intent: 'order',
        priority: orderRequest.orderDetails.urgency === 'stat' ? 'stat' : 
                 orderRequest.orderDetails.urgency === 'urgent' ? 'urgent' : 'routine',
        code: {
          coding: orderRequest.tests.map(test => ({
            system: 'https://fhir.moh.gov.my/CodeSystem/lab-tests',
            code: test.testCode,
            display: test.testName
          }))
        },
        subject: {
          reference: `Patient/${orderRequest.patientInfo.nationalId}`,
          display: orderRequest.patientInfo.name
        },
        requester: {
          reference: `Practitioner/${orderRequest.practitionerInfo.license}`,
          display: orderRequest.practitionerInfo.name
        },
        reasonCode: [{
          text: orderRequest.orderDetails.clinicalIndication
        }],
        specimen: orderRequest.tests.map(test => ({
          reference: `Specimen/${test.specimenType}`,
          display: test.specimenType
        })),
        authoredOn: new Date().toISOString()
      };

      await this.fhirService.createResource('ServiceRequest', serviceRequest);

    } catch (error) {
      console.error('Failed to create FHIR ServiceRequest:', error);
    }
  }

  private async createFHIRDiagnosticReport(labResult: LabResult): Promise<void> {
    try {
      // Create Observation
      const observation = {
        resourceType: 'Observation',
        id: uuidv4(),
        status: labResult.status,
        category: [{
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/observation-category',
            code: 'laboratory',
            display: 'Laboratory'
          }]
        }],
        code: {
          coding: [{
            system: 'https://fhir.moh.gov.my/CodeSystem/lab-tests',
            code: labResult.testCode,
            display: labResult.testName
          }]
        },
        subject: {
          reference: `Patient/${labResult.patientId}`
        },
        effectiveDateTime: labResult.performedDate,
        valueQuantity: typeof labResult.value === 'number' ? {
          value: labResult.value,
          unit: labResult.unit
        } : undefined,
        valueString: typeof labResult.value === 'string' ? labResult.value : undefined,
        interpretation: labResult.abnormalFlag ? [{
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation',
            code: labResult.abnormalFlag.toUpperCase(),
            display: labResult.abnormalFlag
          }]
        }] : undefined,
        referenceRange: labResult.referenceRange ? [{
          text: labResult.referenceRange
        }] : undefined
      };

      await this.fhirService.createResource('Observation', observation);

      // Create DiagnosticReport
      const diagnosticReport = {
        resourceType: 'DiagnosticReport',
        id: uuidv4(),
        identifier: [{
          use: 'usual',
          system: 'https://fhir.medimate.my/identifier/lab-result',
          value: labResult.resultId
        }],
        status: labResult.status,
        category: [{
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/v2-0074',
            code: 'LAB',
            display: 'Laboratory'
          }]
        }],
        code: {
          coding: [{
            system: 'https://fhir.moh.gov.my/CodeSystem/lab-tests',
            code: labResult.testCode,
            display: labResult.testName
          }]
        },
        subject: {
          reference: `Patient/${labResult.patientId}`
        },
        effectiveDateTime: labResult.performedDate,
        issued: labResult.resultedDate,
        result: [{
          reference: `Observation/${observation.id}`
        }],
        performer: labResult.reviewedBy ? [{
          actor: {
            display: labResult.reviewedBy.pathologist
          }
        }] : undefined
      };

      await this.fhirService.createResource('DiagnosticReport', diagnosticReport);

    } catch (error) {
      console.error('Failed to create FHIR DiagnosticReport:', error);
    }
  }

  private async parseLabResult(resultData: any): Promise<LabResult> {
    return {
      resultId: resultData.resultId || uuidv4(),
      orderId: resultData.orderId,
      patientId: resultData.patientId,
      testCode: resultData.testCode,
      testName: resultData.testName,
      value: resultData.value,
      unit: resultData.unit,
      referenceRange: resultData.referenceRange,
      status: resultData.status || 'final',
      abnormalFlag: resultData.abnormalFlag,
      interpretation: resultData.interpretation,
      methodology: resultData.methodology,
      performedDate: resultData.performedDate,
      resultedDate: resultData.resultedDate || new Date().toISOString(),
      reviewedBy: resultData.reviewedBy,
      qualityControl: resultData.qualityControl || {
        controlsPassed: true,
        calibrationStatus: 'pass',
        instrumentId: 'unknown'
      },
      criticalValue: resultData.criticalValue
    };
  }

  private async handleCriticalValue(labResult: LabResult): Promise<void> {
    try {
      // Log critical value
      console.log(`Critical lab value detected: ${labResult.testName} = ${labResult.value} for patient ${labResult.patientId}`);

      // Send immediate notification
      await this.sendCriticalValueAlert(labResult);

      // Store critical value notification
      await this.storeCriticalValueNotification(labResult);

    } catch (error) {
      console.error('Failed to handle critical value:', error);
    }
  }

  private async sendCriticalValueAlert(labResult: LabResult): Promise<void> {
    // Implementation would send alerts via SMS, email, or push notification
    // to the ordering physician and other relevant healthcare providers
  }

  private async storeCriticalValueNotification(labResult: LabResult): Promise<void> {
    try {
      const connection = this.db.getConnection();
      await connection.none(`
        INSERT INTO critical_value_notifications (
          id, result_id, order_id, patient_id, test_name,
          result_value, critical_threshold, notified_at,
          notification_methods, acknowledgment_status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8, 'pending', NOW())
      `, [
        uuidv4(),
        labResult.resultId,
        labResult.orderId,
        labResult.patientId,
        labResult.testName,
        labResult.value.toString(),
        JSON.stringify(labResult.criticalValue),
        JSON.stringify(['real-time-alert', 'email'])
      ]);
    } catch (error) {
      console.error('Failed to store critical value notification:', error);
    }
  }

  private async emitResultNotification(labResult: LabResult): Promise<void> {
    const notification: LabResultNotification = {
      resultId: labResult.resultId,
      orderId: labResult.orderId,
      patientId: labResult.patientId,
      patientName: 'Patient Name', // Would get from patient record
      testName: labResult.testName,
      result: labResult.value.toString(),
      abnormalFlag: labResult.abnormalFlag,
      criticalValue: labResult.criticalValue?.isCritical || false,
      laboratoryName: 'Laboratory Name', // Would get from lab config
      resultDate: labResult.resultedDate,
      practitionerId: 'Practitioner ID', // Would get from order
      practitionerName: 'Practitioner Name' // Would get from order
    };

    this.realtimeService.emitHealthcareEvent('lab-result-available', notification);
  }

  private async storeLabOrder(orderRequest: LabOrderSubmission, response: any): Promise<void> {
    try {
      const connection = this.db.getConnection();
      await connection.none(`
        INSERT INTO lab_orders (
          order_id, external_order_id, laboratory_id, laboratory_name,
          patient_info, practitioner_info, order_details, tests,
          cultural_requirements, estimated_completion, total_cost,
          tracking_number, status, ordered_date, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW(), NOW())
      `, [
        orderRequest.orderId,
        response.externalOrderId,
        response.laboratoryId,
        response.laboratoryName,
        JSON.stringify(orderRequest.patientInfo),
        JSON.stringify(orderRequest.practitionerInfo),
        JSON.stringify(orderRequest.orderDetails),
        JSON.stringify(orderRequest.tests),
        JSON.stringify(orderRequest.culturalRequirements),
        response.estimatedCompletionTime,
        JSON.stringify(response.totalCost),
        response.trackingNumber,
        'submitted'
      ]);
    } catch (error) {
      console.error('Failed to store lab order:', error);
    }
  }

  private async storeLabResult(labResult: LabResult): Promise<void> {
    try {
      const connection = this.db.getConnection();
      await connection.none(`
        INSERT INTO lab_results (
          result_id, order_id, patient_id, test_code, test_name,
          value, unit, reference_range, status, abnormal_flag,
          interpretation, methodology, performed_date, resulted_date,
          reviewed_by, quality_control, critical_value, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW())
      `, [
        labResult.resultId,
        labResult.orderId,
        labResult.patientId,
        labResult.testCode,
        labResult.testName,
        labResult.value.toString(),
        labResult.unit,
        labResult.referenceRange,
        labResult.status,
        labResult.abnormalFlag,
        labResult.interpretation,
        labResult.methodology,
        labResult.performedDate,
        labResult.resultedDate,
        JSON.stringify(labResult.reviewedBy),
        JSON.stringify(labResult.qualityControl),
        labResult.criticalValue?.isCritical || false
      ]);
    } catch (error) {
      console.error('Failed to store lab result:', error);
    }
  }
}

export default LISIntegrationService;