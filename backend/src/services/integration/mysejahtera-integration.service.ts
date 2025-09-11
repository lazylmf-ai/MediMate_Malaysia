/**
 * MySejahtera Integration Service
 * 
 * Integrates with Malaysia's national MySejahtera health application
 * for vaccination records, health status, and contact tracing data
 */

import axios, { AxiosInstance } from 'axios';
import { DatabaseService } from '../database/databaseService';
import { FHIRService } from '../fhir/fhir.service';
import { 
  MySejahteraIntegrationData
} from '../../types/fhir/fhir-operations';
import { MalaysianPatient } from '../../types/fhir/malaysian-profiles';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

export interface MySejahteraConfig {
  baseUrl: string;
  apiKey: string;
  clientId: string;
  clientSecret: string;
  environment: 'development' | 'staging' | 'production';
  timeout: number;
  encryptionKey: string;
}

export interface MySejahteraVaccination {
  vaccineType: string;
  vaccineName: string;
  manufacturer: string;
  lotNumber: string;
  doseNumber: number;
  totalDoses: number;
  administrationDate: string;
  administrationSite: string;
  vaccinationCenter: {
    code: string;
    name: string;
    address: string;
  };
  practitioner: {
    id: string;
    name: string;
    qualification: string;
  };
  nextDueDate?: string;
}

export interface MySejahteraHealthStatus {
  patientId: string;
  nationalId: string;
  healthStatus: 'low-risk' | 'high-risk' | 'positive' | 'recovered';
  covidStatus: 'negative' | 'positive' | 'recovered' | 'unknown';
  riskLevel: 'low' | 'medium' | 'high';
  lastAssessment: string;
  symptoms?: string[];
  exposureRisk?: {
    level: 'low' | 'medium' | 'high';
    lastExposure?: string;
    contactCount?: number;
  };
  quarantineStatus?: {
    isQuarantined: boolean;
    startDate?: string;
    endDate?: string;
    location?: string;
  };
}

export interface MySejahteraTravelHistory {
  patientId: string;
  nationalId: string;
  travels: Array<{
    departureCountry: string;
    arrivalCountry: string;
    departureDate: string;
    arrivalDate: string;
    flightNumber?: string;
    seatNumber?: string;
    purpose: 'business' | 'leisure' | 'medical' | 'family' | 'education' | 'other';
    declarationId: string;
  }>;
}

export interface MySejahteraSubmissionResult {
  success: boolean;
  transactionId: string;
  mysejahteraReference?: string;
  timestamp: string;
  errors?: string[];
  warnings?: string[];
}

export class MySejahteraIntegrationService {
  private static instance: MySejahteraIntegrationService;
  private axiosInstance: AxiosInstance;
  private db: DatabaseService;
  private fhirService: FHIRService;
  private config: MySejahteraConfig;

  constructor() {
    this.db = DatabaseService.getInstance();
    this.fhirService = FHIRService.getInstance();
    this.config = this.loadConfig();
    this.axiosInstance = this.createAxiosInstance();
  }

  public static getInstance(): MySejahteraIntegrationService {
    if (!MySejahteraIntegrationService.instance) {
      MySejahteraIntegrationService.instance = new MySejahteraIntegrationService();
    }
    return MySejahteraIntegrationService.instance;
  }

  /**
   * Sync vaccination data from MySejahtera
   */
  public async syncVaccinationData(nationalId: string): Promise<MySejahteraVaccination[]> {
    try {
      const encryptedId = this.encryptNationalId(nationalId);
      
      const response = await this.axiosInstance.get(`/vaccinations/${encryptedId}`);
      
      if (response.data.success) {
        const vaccinations: MySejahteraVaccination[] = response.data.data.vaccinations || [];
        
        // Store vaccination data in local database
        await this.storeVaccinationData(nationalId, vaccinations);
        
        // Convert to FHIR Immunization resources
        await this.convertToFHIRImmunizations(nationalId, vaccinations);
        
        return vaccinations;
      } else {
        throw new Error(response.data.error?.message || 'Failed to sync vaccination data');
      }
    } catch (error) {
      console.error('MySejahtera vaccination sync failed:', error);
      throw new Error(`MySejahtera vaccination sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get health status from MySejahtera
   */
  public async getHealthStatus(nationalId: string): Promise<MySejahteraHealthStatus> {
    try {
      const encryptedId = this.encryptNationalId(nationalId);
      
      const response = await this.axiosInstance.get(`/health-status/${encryptedId}`);
      
      if (response.data.success) {
        const healthStatus: MySejahteraHealthStatus = response.data.data;
        
        // Store health status in local database
        await this.storeHealthStatus(nationalId, healthStatus);
        
        return healthStatus;
      } else {
        throw new Error(response.data.error?.message || 'Failed to get health status');
      }
    } catch (error) {
      console.error('MySejahtera health status query failed:', error);
      throw new Error(`MySejahtera health status query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Submit vaccination record to MySejahtera
   */
  public async submitVaccinationRecord(vaccinationData: MySejahteraVaccination): Promise<MySejahteraSubmissionResult> {
    try {
      const encryptedData = this.encryptVaccinationData(vaccinationData);
      
      const request = {
        data: encryptedData,
        timestamp: new Date().toISOString(),
        signature: this.generateSignature(vaccinationData)
      };

      const response = await this.axiosInstance.post('/vaccinations/submit', request);
      
      const result: MySejahteraSubmissionResult = {
        success: response.data.success,
        transactionId: response.data.transactionId || uuidv4(),
        mysejahteraReference: response.data.data?.reference,
        timestamp: response.data.timestamp || new Date().toISOString(),
        errors: response.data.error ? [response.data.error.message] : undefined
      };

      // Store submission record
      await this.storeSubmissionRecord('vaccination', vaccinationData, result);

      return result;
    } catch (error) {
      console.error('MySejahtera vaccination submission failed:', error);
      throw new Error(`MySejahtera vaccination submission failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Submit health status update to MySejahtera
   */
  public async submitHealthStatusUpdate(healthStatus: MySejahteraHealthStatus): Promise<MySejahteraSubmissionResult> {
    try {
      const encryptedData = this.encryptHealthStatusData(healthStatus);
      
      const request = {
        data: encryptedData,
        timestamp: new Date().toISOString(),
        signature: this.generateSignature(healthStatus)
      };

      const response = await this.axiosInstance.post('/health-status/update', request);
      
      const result: MySejahteraSubmissionResult = {
        success: response.data.success,
        transactionId: response.data.transactionId || uuidv4(),
        mysejahteraReference: response.data.data?.reference,
        timestamp: response.data.timestamp || new Date().toISOString(),
        errors: response.data.error ? [response.data.error.message] : undefined
      };

      await this.storeSubmissionRecord('health_status', healthStatus, result);

      return result;
    } catch (error) {
      console.error('MySejahtera health status submission failed:', error);
      throw new Error(`MySejahtera health status submission failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get travel history from MySejahtera
   */
  public async getTravelHistory(nationalId: string, fromDate?: string, toDate?: string): Promise<MySejahteraTravelHistory> {
    try {
      const encryptedId = this.encryptNationalId(nationalId);
      
      const params: any = {};
      if (fromDate) params.from = fromDate;
      if (toDate) params.to = toDate;

      const response = await this.axiosInstance.get(`/travel-history/${encryptedId}`, { params });
      
      if (response.data.success) {
        const travelHistory: MySejahteraTravelHistory = response.data.data;
        
        // Store travel history in local database
        await this.storeTravelHistory(nationalId, travelHistory);
        
        return travelHistory;
      } else {
        throw new Error(response.data.error?.message || 'Failed to get travel history');
      }
    } catch (error) {
      console.error('MySejahtera travel history query failed:', error);
      throw new Error(`MySejahtera travel history query failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check MySejahtera API availability
   */
  public async checkApiAvailability(): Promise<{ available: boolean; version?: string; maintenance?: any }> {
    try {
      const response = await this.axiosInstance.get('/health');
      return {
        available: response.data.status === 'healthy',
        version: response.data.version,
        maintenance: response.data.maintenance
      };
    } catch (error) {
      console.error('MySejahtera API health check failed:', error);
      return { available: false };
    }
  }

  /**
   * Bulk sync patient data from MySejahtera
   */
  public async bulkSyncPatientData(nationalIds: string[]): Promise<{ successes: number; failures: number; errors: string[] }> {
    const results = {
      successes: 0,
      failures: 0,
      errors: [] as string[]
    };

    for (const nationalId of nationalIds) {
      try {
        // Sync vaccination data
        await this.syncVaccinationData(nationalId);
        
        // Get health status
        await this.getHealthStatus(nationalId);
        
        // Get travel history (last 30 days)
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        await this.getTravelHistory(nationalId, thirtyDaysAgo);
        
        results.successes++;
      } catch (error) {
        results.failures++;
        results.errors.push(`${nationalId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return results;
  }

  /**
   * Get MySejahtera integration status for a patient
   */
  public async getPatientIntegrationStatus(nationalId: string): Promise<any> {
    try {
      const connection = this.db.getConnection();
      
      const status = await connection.oneOrNone(`
        SELECT 
          ms.national_id,
          ms.last_vaccination_sync,
          ms.last_health_status_sync,
          ms.last_travel_history_sync,
          ms.integration_status,
          COUNT(mv.id) as vaccination_count,
          mhs.health_status,
          mhs.covid_status,
          mhs.risk_level
        FROM mysejahtera_sync ms
        LEFT JOIN mysejahtera_vaccinations mv ON ms.national_id = mv.national_id
        LEFT JOIN mysejahtera_health_status mhs ON ms.national_id = mhs.national_id
        WHERE ms.national_id = $1
        GROUP BY ms.national_id, ms.last_vaccination_sync, ms.last_health_status_sync, 
                 ms.last_travel_history_sync, ms.integration_status, 
                 mhs.health_status, mhs.covid_status, mhs.risk_level
      `, [nationalId]);

      return status || {
        national_id: nationalId,
        integration_status: 'not_synced',
        vaccination_count: 0
      };
    } catch (error) {
      console.error('Failed to get patient integration status:', error);
      throw new Error(`Failed to get patient integration status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private loadConfig(): MySejahteraConfig {
    return {
      baseUrl: process.env.MYSEJAHTERA_API_BASE_URL || 'https://api.mysejahtera.gov.my',
      apiKey: process.env.MYSEJAHTERA_API_KEY || '',
      clientId: process.env.MYSEJAHTERA_CLIENT_ID || '',
      clientSecret: process.env.MYSEJAHTERA_CLIENT_SECRET || '',
      environment: (process.env.NODE_ENV as 'development' | 'staging' | 'production') || 'development',
      timeout: parseInt(process.env.MYSEJAHTERA_TIMEOUT || '30000'),
      encryptionKey: process.env.MYSEJAHTERA_ENCRYPTION_KEY || 'default-key-change-me'
    };
  }

  private createAxiosInstance(): AxiosInstance {
    const instance = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-API-Key': this.config.apiKey,
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
          return instance.request(error.config);
        }
        return Promise.reject(error);
      }
    );

    return instance;
  }

  private async getAccessToken(): Promise<string | null> {
    try {
      const connection = this.db.getConnection();
      const cachedToken = await connection.oneOrNone(
        'SELECT access_token, expires_at FROM mysejahtera_tokens WHERE client_id = $1 AND expires_at > NOW()',
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
        scope: 'health-data vaccination-data travel-data'
      });

      const { access_token, expires_in } = tokenResponse.data;
      const expiresAt = new Date(Date.now() + (expires_in * 1000));

      // Cache the token
      await connection.none(
        `INSERT INTO mysejahtera_tokens (client_id, access_token, expires_at) 
         VALUES ($1, $2, $3) 
         ON CONFLICT (client_id) 
         DO UPDATE SET access_token = $2, expires_at = $3`,
        [this.config.clientId, access_token, expiresAt]
      );

      return access_token;
    } catch (error) {
      console.error('Failed to get MySejahtera access token:', error);
      return null;
    }
  }

  private async refreshAccessToken(): Promise<void> {
    const connection = this.db.getConnection();
    await connection.none('DELETE FROM mysejahtera_tokens WHERE client_id = $1', [this.config.clientId]);
  }

  private encryptNationalId(nationalId: string): string {
    const cipher = crypto.createCipher('aes-256-cbc', this.config.encryptionKey);
    let encrypted = cipher.update(nationalId, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  private encryptVaccinationData(data: MySejahteraVaccination): string {
    const cipher = crypto.createCipher('aes-256-cbc', this.config.encryptionKey);
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  private encryptHealthStatusData(data: MySejahteraHealthStatus): string {
    const cipher = crypto.createCipher('aes-256-cbc', this.config.encryptionKey);
    let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return encrypted;
  }

  private generateSignature(data: any): string {
    const payload = JSON.stringify(data);
    return crypto.createHmac('sha256', this.config.clientSecret).update(payload).digest('hex');
  }

  private async storeVaccinationData(nationalId: string, vaccinations: MySejahteraVaccination[]): Promise<void> {
    try {
      const connection = this.db.getConnection();
      
      for (const vaccination of vaccinations) {
        await connection.none(
          `INSERT INTO mysejahtera_vaccinations (
            id, national_id, vaccine_type, vaccine_name, manufacturer, 
            lot_number, dose_number, total_doses, administration_date,
            administration_site, vaccination_center, practitioner_data, 
            next_due_date, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
          ON CONFLICT (national_id, dose_number, administration_date) 
          DO UPDATE SET 
            vaccine_type = $3, vaccine_name = $4, manufacturer = $5,
            lot_number = $6, total_doses = $8, administration_site = $10,
            vaccination_center = $11, practitioner_data = $12, next_due_date = $13`,
          [
            uuidv4(),
            nationalId,
            vaccination.vaccineType,
            vaccination.vaccineName,
            vaccination.manufacturer,
            vaccination.lotNumber,
            vaccination.doseNumber,
            vaccination.totalDoses,
            vaccination.administrationDate,
            vaccination.administrationSite,
            JSON.stringify(vaccination.vaccinationCenter),
            JSON.stringify(vaccination.practitioner),
            vaccination.nextDueDate
          ]
        );
      }

      // Update sync status
      await this.updateSyncStatus(nationalId, 'vaccination');
    } catch (error) {
      console.error('Failed to store vaccination data:', error);
    }
  }

  private async storeHealthStatus(nationalId: string, healthStatus: MySejahteraHealthStatus): Promise<void> {
    try {
      const connection = this.db.getConnection();
      
      await connection.none(
        `INSERT INTO mysejahtera_health_status (
          id, national_id, health_status, covid_status, risk_level,
          last_assessment, symptoms, exposure_risk, quarantine_status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
        ON CONFLICT (national_id) 
        DO UPDATE SET 
          health_status = $3, covid_status = $4, risk_level = $5,
          last_assessment = $6, symptoms = $7, exposure_risk = $8,
          quarantine_status = $9, updated_at = NOW()`,
        [
          uuidv4(),
          nationalId,
          healthStatus.healthStatus,
          healthStatus.covidStatus,
          healthStatus.riskLevel,
          healthStatus.lastAssessment,
          JSON.stringify(healthStatus.symptoms),
          JSON.stringify(healthStatus.exposureRisk),
          JSON.stringify(healthStatus.quarantineStatus)
        ]
      );

      await this.updateSyncStatus(nationalId, 'health_status');
    } catch (error) {
      console.error('Failed to store health status:', error);
    }
  }

  private async storeTravelHistory(nationalId: string, travelHistory: MySejahteraTravelHistory): Promise<void> {
    try {
      const connection = this.db.getConnection();
      
      for (const travel of travelHistory.travels) {
        await connection.none(
          `INSERT INTO mysejahtera_travel_history (
            id, national_id, departure_country, arrival_country,
            departure_date, arrival_date, flight_number, seat_number,
            purpose, declaration_id, created_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
          ON CONFLICT (national_id, declaration_id) 
          DO UPDATE SET 
            departure_country = $3, arrival_country = $4,
            departure_date = $5, arrival_date = $6,
            flight_number = $7, seat_number = $8, purpose = $9`,
          [
            uuidv4(),
            nationalId,
            travel.departureCountry,
            travel.arrivalCountry,
            travel.departureDate,
            travel.arrivalDate,
            travel.flightNumber,
            travel.seatNumber,
            travel.purpose,
            travel.declarationId
          ]
        );
      }

      await this.updateSyncStatus(nationalId, 'travel_history');
    } catch (error) {
      console.error('Failed to store travel history:', error);
    }
  }

  private async storeSubmissionRecord(type: string, data: any, result: MySejahteraSubmissionResult): Promise<void> {
    try {
      const connection = this.db.getConnection();
      await connection.none(
        `INSERT INTO mysejahtera_submissions (
          id, submission_type, submission_data, result_data, 
          transaction_id, created_at
        ) VALUES ($1, $2, $3, $4, $5, NOW())`,
        [
          uuidv4(),
          type,
          JSON.stringify(data),
          JSON.stringify(result),
          result.transactionId
        ]
      );
    } catch (error) {
      console.error('Failed to store MySejahtera submission record:', error);
    }
  }

  private async updateSyncStatus(nationalId: string, syncType: 'vaccination' | 'health_status' | 'travel_history'): Promise<void> {
    try {
      const connection = this.db.getConnection();
      const columnName = `last_${syncType}_sync`;
      
      await connection.none(
        `INSERT INTO mysejahtera_sync (national_id, ${columnName}, integration_status, updated_at)
         VALUES ($1, NOW(), 'active', NOW())
         ON CONFLICT (national_id) 
         DO UPDATE SET ${columnName} = NOW(), integration_status = 'active', updated_at = NOW()`,
        [nationalId]
      );
    } catch (error) {
      console.error('Failed to update sync status:', error);
    }
  }

  private async convertToFHIRImmunizations(nationalId: string, vaccinations: MySejahteraVaccination[]): Promise<void> {
    try {
      // Find patient by national ID
      const patientSearchResult = await this.fhirService.searchResources('Patient', {
        identifier: `https://fhir.moh.gov.my/identifier/mykad|${nationalId}`
      });

      if (!patientSearchResult.entry || patientSearchResult.entry.length === 0) {
        console.warn(`Patient not found for national ID: ${nationalId}`);
        return;
      }

      const patient = patientSearchResult.entry[0].resource as MalaysianPatient;

      for (const vaccination of vaccinations) {
        const immunization = {
          resourceType: 'Immunization',
          id: uuidv4(),
          status: 'completed',
          vaccineCode: {
            coding: [{
              system: 'https://fhir.moh.gov.my/CodeSystem/vaccine-codes',
              code: vaccination.vaccineType,
              display: vaccination.vaccineName
            }]
          },
          patient: {
            reference: `Patient/${patient.id}`,
            display: patient.name?.[0]?.given?.join(' ') + ' ' + patient.name?.[0]?.family
          },
          occurrenceDateTime: vaccination.administrationDate,
          manufacturer: {
            display: vaccination.manufacturer
          },
          lotNumber: vaccination.lotNumber,
          site: {
            coding: [{
              system: 'https://fhir.moh.gov.my/CodeSystem/vaccination-sites',
              code: vaccination.administrationSite,
              display: vaccination.administrationSite
            }]
          },
          performer: [{
            function: {
              coding: [{
                system: 'http://terminology.hl7.org/CodeSystem/v2-0443',
                code: 'AP',
                display: 'Administering Provider'
              }]
            },
            actor: {
              display: vaccination.practitioner.name
            }
          }],
          location: {
            display: vaccination.vaccinationCenter.name
          },
          meta: {
            tag: [{
              system: 'https://fhir.medimate.my/CodeSystem/data-source',
              code: 'mysejahtera',
              display: 'MySejahtera'
            }]
          }
        };

        await this.fhirService.createResource('Immunization', immunization);
      }
    } catch (error) {
      console.error('Failed to convert vaccination to FHIR:', error);
    }
  }
}

export default MySejahteraIntegrationService;