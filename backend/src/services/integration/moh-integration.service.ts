/**
 * MOH Malaysia Integration Service
 * 
 * Handles integration with Malaysia's Ministry of Health (MOH) systems
 * for national health data exchange and compliance reporting
 */

import axios, { AxiosInstance, AxiosRequestConfig } from 'axios';
import { DatabaseService } from '../database/databaseService';
import { FHIRService } from '../fhir/fhir.service';
import { 
  MOHIntegrationRequest, 
  MOHIntegrationResponse 
} from '../../types/fhir/fhir-operations';
import { 
  MalaysianPatient, 
  MalaysianPractitioner, 
  MalaysianOrganization 
} from '../../types/fhir/malaysian-profiles';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

export interface MOHConfig {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  certificatePath?: string;
  privateKeyPath?: string;
  environment: 'development' | 'staging' | 'production';
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
}

export interface MOHSubmissionResult {
  success: boolean;
  transactionId: string;
  mohReference?: string;
  timestamp: string;
  errors?: string[];
  warnings?: string[];
}

export class MOHIntegrationService {
  private static instance: MOHIntegrationService;
  private axiosInstance: AxiosInstance;
  private db: DatabaseService;
  private fhirService: FHIRService;
  private config: MOHConfig;

  constructor() {
    this.db = DatabaseService.getInstance();
    this.fhirService = FHIRService.getInstance();
    this.config = this.loadConfig();
    this.axiosInstance = this.createAxiosInstance();
  }

  public static getInstance(): MOHIntegrationService {
    if (!MOHIntegrationService.instance) {
      MOHIntegrationService.instance = new MOHIntegrationService();
    }
    return MOHIntegrationService.instance;
  }

  /**
   * Submit patient registration to MOH system
   */
  public async submitPatientRegistration(patient: MalaysianPatient, facilityCode: string): Promise<MOHSubmissionResult> {
    try {
      const request: MOHIntegrationRequest = {
        resourceType: 'Patient',
        resource: patient,
        facilityCode,
        practitionerId: '', // Will be populated from context
        timestamp: new Date().toISOString(),
        signature: this.generateSignature(patient)
      };

      const response = await this.makeRequest<MOHIntegrationResponse>('POST', '/patients/register', request);
      
      // Store submission record
      await this.storeSubmissionRecord('patient_registration', request, response);

      return {
        success: response.success,
        transactionId: response.transactionId,
        mohReference: response.data?.mohPatientId,
        timestamp: response.timestamp,
        errors: response.error ? [response.error.message] : undefined
      };
    } catch (error) {
      console.error('MOH patient registration failed:', error);
      throw new Error(`MOH patient registration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Submit practitioner registration to MOH system
   */
  public async submitPractitionerRegistration(practitioner: MalaysianPractitioner, facilityCode: string): Promise<MOHSubmissionResult> {
    try {
      const request: MOHIntegrationRequest = {
        resourceType: 'Practitioner',
        resource: practitioner,
        facilityCode,
        practitionerId: practitioner.id || '',
        timestamp: new Date().toISOString(),
        signature: this.generateSignature(practitioner)
      };

      const response = await this.makeRequest<MOHIntegrationResponse>('POST', '/practitioners/register', request);
      
      await this.storeSubmissionRecord('practitioner_registration', request, response);

      return {
        success: response.success,
        transactionId: response.transactionId,
        mohReference: response.data?.mohPractitionerId,
        timestamp: response.timestamp,
        errors: response.error ? [response.error.message] : undefined
      };
    } catch (error) {
      console.error('MOH practitioner registration failed:', error);
      throw new Error(`MOH practitioner registration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Submit organization registration to MOH system
   */
  public async submitOrganizationRegistration(organization: MalaysianOrganization): Promise<MOHSubmissionResult> {
    try {
      const request: MOHIntegrationRequest = {
        resourceType: 'Organization',
        resource: organization,
        facilityCode: organization.id || '',
        practitionerId: '', // Administrative submission
        timestamp: new Date().toISOString(),
        signature: this.generateSignature(organization)
      };

      const response = await this.makeRequest<MOHIntegrationResponse>('POST', '/organizations/register', request);
      
      await this.storeSubmissionRecord('organization_registration', request, response);

      return {
        success: response.success,
        transactionId: response.transactionId,
        mohReference: response.data?.mohOrganizationId,
        timestamp: response.timestamp,
        errors: response.error ? [response.error.message] : undefined
      };
    } catch (error) {
      console.error('MOH organization registration failed:', error);
      throw new Error(`MOH organization registration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Submit encounter data to MOH system for reporting
   */
  public async submitEncounterData(encounterId: string, facilityCode: string): Promise<MOHSubmissionResult> {
    try {
      // Get encounter and related data
      const encounter = await this.fhirService.readResource('Encounter', encounterId);
      const patient = await this.fhirService.readResource('Patient', encounter.subject.reference.split('/')[1]);
      
      const encounterData = {
        encounter,
        patient,
        // Add other related resources as needed
      };

      const request: MOHIntegrationRequest = {
        resourceType: 'Encounter',
        resource: encounterData,
        facilityCode,
        practitionerId: encounter.participant?.[0]?.individual?.reference?.split('/')[1] || '',
        timestamp: new Date().toISOString(),
        signature: this.generateSignature(encounterData)
      };

      const response = await this.makeRequest<MOHIntegrationResponse>('POST', '/encounters/submit', request);
      
      await this.storeSubmissionRecord('encounter_data', request, response);

      return {
        success: response.success,
        transactionId: response.transactionId,
        timestamp: response.timestamp,
        errors: response.error ? [response.error.message] : undefined
      };
    } catch (error) {
      console.error('MOH encounter submission failed:', error);
      throw new Error(`MOH encounter submission failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Query MOH system for patient data
   */
  public async queryPatientData(patientIdentifier: { type: string; value: string }, facilityCode: string): Promise<any> {
    try {
      const queryParams = {
        identifierType: patientIdentifier.type,
        identifierValue: patientIdentifier.value,
        facilityCode,
        timestamp: new Date().toISOString()
      };

      const signature = this.generateSignature(queryParams);
      
      const response = await this.makeRequest<MOHIntegrationResponse>('GET', '/patients/query', {
        ...queryParams,
        signature
      });

      if (response.success && response.data) {
        return response.data;
      } else {
        throw new Error(response.error?.message || 'Patient data not found');
      }
    } catch (error) {
      console.error('MOH patient query failed:', error);
      throw new Error(`MOH patient query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Submit vaccination data to MOH system
   */
  public async submitVaccinationData(patientId: string, vaccinationData: any, facilityCode: string): Promise<MOHSubmissionResult> {
    try {
      const patient = await this.fhirService.readResource('Patient', patientId);
      
      const request: MOHIntegrationRequest = {
        resourceType: 'Immunization',
        resource: {
          patient,
          vaccination: vaccinationData
        },
        facilityCode,
        practitionerId: vaccinationData.practitionerId || '',
        timestamp: new Date().toISOString(),
        signature: this.generateSignature(vaccinationData)
      };

      const response = await this.makeRequest<MOHIntegrationResponse>('POST', '/vaccinations/submit', request);
      
      await this.storeSubmissionRecord('vaccination_data', request, response);

      return {
        success: response.success,
        transactionId: response.transactionId,
        timestamp: response.timestamp,
        errors: response.error ? [response.error.message] : undefined
      };
    } catch (error) {
      console.error('MOH vaccination submission failed:', error);
      throw new Error(`MOH vaccination submission failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Submit notifiable disease report to MOH
   */
  public async submitNotifiableDiseaseReport(diseaseReport: any, facilityCode: string): Promise<MOHSubmissionResult> {
    try {
      const request: MOHIntegrationRequest = {
        resourceType: 'DiagnosticReport',
        resource: diseaseReport,
        facilityCode,
        practitionerId: diseaseReport.practitionerId || '',
        timestamp: new Date().toISOString(),
        signature: this.generateSignature(diseaseReport)
      };

      const response = await this.makeRequest<MOHIntegrationResponse>('POST', '/diseases/report', request);
      
      await this.storeSubmissionRecord('disease_report', request, response);

      return {
        success: response.success,
        transactionId: response.transactionId,
        timestamp: response.timestamp,
        errors: response.error ? [response.error.message] : undefined
      };
    } catch (error) {
      console.error('MOH disease report submission failed:', error);
      throw new Error(`MOH disease report submission failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get MOH system status and announcements
   */
  public async getSystemStatus(): Promise<{ status: string; announcements: any[]; maintenance?: any }> {
    try {
      const response = await this.makeRequest<any>('GET', '/system/status', {});
      return {
        status: response.data?.status || 'unknown',
        announcements: response.data?.announcements || [],
        maintenance: response.data?.maintenance
      };
    } catch (error) {
      console.error('MOH system status check failed:', error);
      return {
        status: 'unavailable',
        announcements: []
      };
    }
  }

  /**
   * Generate compliance report for MOH
   */
  public async generateComplianceReport(facilityCode: string, reportPeriod: { from: string; to: string }): Promise<any> {
    try {
      const connection = this.db.getConnection();
      
      // Get submission statistics
      const stats = await connection.one(`
        SELECT 
          COUNT(*) as total_submissions,
          COUNT(CASE WHEN response_data->>'success' = 'true' THEN 1 END) as successful_submissions,
          COUNT(CASE WHEN submission_type = 'patient_registration' THEN 1 END) as patient_registrations,
          COUNT(CASE WHEN submission_type = 'encounter_data' THEN 1 END) as encounter_submissions,
          COUNT(CASE WHEN submission_type = 'vaccination_data' THEN 1 END) as vaccination_submissions
        FROM moh_submissions 
        WHERE facility_code = $1 
        AND created_at BETWEEN $2 AND $3
      `, [facilityCode, reportPeriod.from, reportPeriod.to]);

      const complianceReport = {
        facilityCode,
        reportPeriod,
        statistics: stats,
        complianceScore: this.calculateComplianceScore(stats),
        generatedAt: new Date().toISOString()
      };

      // Submit report to MOH
      const request: MOHIntegrationRequest = {
        resourceType: 'ComplianceReport',
        resource: complianceReport,
        facilityCode,
        practitionerId: '', // System generated
        timestamp: new Date().toISOString(),
        signature: this.generateSignature(complianceReport)
      };

      const response = await this.makeRequest<MOHIntegrationResponse>('POST', '/compliance/report', request);
      
      return {
        ...complianceReport,
        submissionResult: {
          success: response.success,
          transactionId: response.transactionId,
          timestamp: response.timestamp
        }
      };
    } catch (error) {
      console.error('MOH compliance report generation failed:', error);
      throw new Error(`MOH compliance report generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private loadConfig(): MOHConfig {
    return {
      baseUrl: process.env.MOH_API_BASE_URL || 'https://api.moh.gov.my/fhir',
      clientId: process.env.MOH_CLIENT_ID || '',
      clientSecret: process.env.MOH_CLIENT_SECRET || '',
      certificatePath: process.env.MOH_CERTIFICATE_PATH,
      privateKeyPath: process.env.MOH_PRIVATE_KEY_PATH,
      environment: (process.env.NODE_ENV as 'development' | 'staging' | 'production') || 'development',
      timeout: parseInt(process.env.MOH_TIMEOUT || '30000'),
      retryAttempts: parseInt(process.env.MOH_RETRY_ATTEMPTS || '3'),
      retryDelay: parseInt(process.env.MOH_RETRY_DELAY || '1000')
    };
  }

  private createAxiosInstance(): AxiosInstance {
    const instance = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'MediMate-Malaysia/1.0.0'
      }
    });

    // Add request interceptor for authentication
    instance.interceptors.request.use(async (config) => {
      const token = await this.getAccessToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Add response interceptor for error handling
    instance.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Token expired, try to refresh
          await this.refreshAccessToken();
          // Retry the original request
          return instance.request(error.config);
        }
        return Promise.reject(error);
      }
    );

    return instance;
  }

  private async makeRequest<T>(method: 'GET' | 'POST' | 'PUT' | 'DELETE', endpoint: string, data?: any): Promise<T> {
    const config: AxiosRequestConfig = {
      method,
      url: endpoint,
      ...(data && (method === 'POST' || method === 'PUT') ? { data } : { params: data })
    };

    let lastError: Error;
    
    for (let attempt = 1; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const response = await this.axiosInstance.request<T>(config);
        return response.data;
      } catch (error) {
        lastError = error as Error;
        
        if (attempt < this.config.retryAttempts) {
          await this.delay(this.config.retryDelay * attempt);
        }
      }
    }

    throw lastError!;
  }

  private async getAccessToken(): Promise<string | null> {
    try {
      // Check if we have a cached valid token
      const connection = this.db.getConnection();
      const cachedToken = await connection.oneOrNone(
        'SELECT access_token, expires_at FROM moh_tokens WHERE client_id = $1 AND expires_at > NOW()',
        [this.config.clientId]
      );

      if (cachedToken) {
        return cachedToken.access_token;
      }

      // Get new token
      const tokenResponse = await axios.post(`${this.config.baseUrl}/oauth/token`, {
        grant_type: 'client_credentials',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        scope: 'fhir-api'
      });

      const { access_token, expires_in } = tokenResponse.data;
      const expiresAt = new Date(Date.now() + (expires_in * 1000));

      // Cache the token
      await connection.none(
        `INSERT INTO moh_tokens (client_id, access_token, expires_at) 
         VALUES ($1, $2, $3) 
         ON CONFLICT (client_id) 
         DO UPDATE SET access_token = $2, expires_at = $3`,
        [this.config.clientId, access_token, expiresAt]
      );

      return access_token;
    } catch (error) {
      console.error('Failed to get MOH access token:', error);
      return null;
    }
  }

  private async refreshAccessToken(): Promise<void> {
    const connection = this.db.getConnection();
    await connection.none('DELETE FROM moh_tokens WHERE client_id = $1', [this.config.clientId]);
  }

  private generateSignature(data: any): string {
    const payload = JSON.stringify(data);
    return crypto.createHmac('sha256', this.config.clientSecret).update(payload).digest('hex');
  }

  private async storeSubmissionRecord(type: string, request: MOHIntegrationRequest, response: MOHIntegrationResponse): Promise<void> {
    try {
      const connection = this.db.getConnection();
      await connection.none(
        `INSERT INTO moh_submissions (
          id, submission_type, facility_code, practitioner_id, 
          request_data, response_data, transaction_id, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
        [
          uuidv4(),
          type,
          request.facilityCode,
          request.practitionerId,
          JSON.stringify(request),
          JSON.stringify(response),
          response.transactionId
        ]
      );
    } catch (error) {
      console.error('Failed to store MOH submission record:', error);
      // Don't throw - this shouldn't fail the main operation
    }
  }

  private calculateComplianceScore(stats: any): number {
    const totalSubmissions = parseInt(stats.total_submissions);
    const successfulSubmissions = parseInt(stats.successful_submissions);
    
    if (totalSubmissions === 0) return 0;
    
    return Math.round((successfulSubmissions / totalSubmissions) * 100);
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export default MOHIntegrationService;