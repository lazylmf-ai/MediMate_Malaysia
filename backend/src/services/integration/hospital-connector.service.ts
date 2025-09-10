/**
 * Hospital Connector Service
 * 
 * Manages connections and data exchange with Malaysian hospital information systems (HIS)
 * Supports multiple hospital systems and standardizes data exchange through FHIR
 */

import axios, { AxiosInstance } from 'axios';
import { DatabaseService } from '../database/databaseService';
import { FHIRService } from '../fhir/fhir.service';
import { 
  HospitalIntegrationConfig,
  FHIRBundleResponse 
} from '../../types/fhir/fhir-operations';
import { 
  MalaysianPatient, 
  MalaysianPractitioner, 
  MalaysianOrganization, 
  MalaysianEncounter 
} from '../../types/fhir/malaysian-profiles';
import { v4 as uuidv4 } from 'uuid';
import { RealtimeService } from '../realtime/realtime.service';

export interface HospitalSyncResult {
  success: boolean;
  hospitalId: string;
  resourcesProcessed: number;
  resourcesCreated: number;
  resourcesUpdated: number;
  resourcesSkipped: number;
  errors: string[];
  warnings: string[];
  timestamp: string;
}

export interface HospitalSearchQuery {
  resourceType: string;
  parameters: {
    [key: string]: any;
  };
  hospitalId: string;
  includeDeleted?: boolean;
}

export class HospitalConnectorService {
  private static instance: HospitalConnectorService;
  private db: DatabaseService;
  private fhirService: FHIRService;
  private realtimeService: RealtimeService;
  private hospitalConnections: Map<string, AxiosInstance> = new Map();

  constructor() {
    this.db = DatabaseService.getInstance();
    this.fhirService = FHIRService.getInstance();
    this.realtimeService = RealtimeService.getInstance();
    this.initializeHospitalConnections();
  }

  public static getInstance(): HospitalConnectorService {
    if (!HospitalConnectorService.instance) {
      HospitalConnectorService.instance = new HospitalConnectorService();
    }
    return HospitalConnectorService.instance;
  }

  /**
   * Register a new hospital for integration
   */
  public async registerHospital(config: HospitalIntegrationConfig): Promise<string> {
    try {
      const connection = this.db.getConnection();
      const hospitalId = uuidv4();

      await connection.none(
        `INSERT INTO hospital_integrations (
          id, facility_code, facility_name, endpoint, auth_type, 
          credentials, fhir_version, supported_resources, message_format,
          enable_realtime, retry_config, is_active, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true, NOW())`,
        [
          hospitalId,
          config.facilityCode,
          config.facilityName,
          config.endpoint,
          config.authType,
          JSON.stringify(config.credentials),
          config.fhirVersion,
          JSON.stringify(config.supportedResources),
          config.messageFormat,
          config.enableRealTime,
          JSON.stringify(config.retryConfig)
        ]
      );

      // Create axios instance for this hospital
      this.createHospitalConnection(hospitalId, config);

      // Test connection
      const testResult = await this.testHospitalConnection(hospitalId);
      if (!testResult.success) {
        throw new Error(`Hospital connection test failed: ${testResult.error}`);
      }

      return hospitalId;
    } catch (error) {
      throw new Error(`Failed to register hospital: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Sync patient data from a specific hospital
   */
  public async syncPatientData(hospitalId: string, lastSyncTime?: string): Promise<HospitalSyncResult> {
    const result: HospitalSyncResult = {
      success: false,
      hospitalId,
      resourcesProcessed: 0,
      resourcesCreated: 0,
      resourcesUpdated: 0,
      resourcesSkipped: 0,
      errors: [],
      warnings: [],
      timestamp: new Date().toISOString()
    };

    try {
      const config = await this.getHospitalConfig(hospitalId);
      if (!config) {
        throw new Error(`Hospital configuration not found: ${hospitalId}`);
      }

      if (!config.supportedResources.includes('Patient')) {
        result.warnings.push('Hospital does not support Patient resource');
        return result;
      }

      const axiosInstance = this.hospitalConnections.get(hospitalId);
      if (!axiosInstance) {
        throw new Error(`No connection available for hospital: ${hospitalId}`);
      }

      // Query for patients
      const queryParams: any = {};
      if (lastSyncTime) {
        queryParams._lastUpdated = `gt${lastSyncTime}`;
      }

      const response = await axiosInstance.get('/Patient', { params: queryParams });
      const bundle: FHIRBundleResponse = response.data;

      if (bundle.entry) {
        for (const entry of bundle.entry) {
          try {
            const patient = entry.resource as MalaysianPatient;
            
            // Add hospital source metadata
            patient.meta = {
              ...patient.meta,
              tag: [
                ...(patient.meta?.tag || []),
                {
                  system: 'https://fhir.medimate.my/CodeSystem/data-source',
                  code: 'hospital-his',
                  display: `Hospital HIS: ${config.facilityName}`
                }
              ]
            };

            // Check if patient already exists
            const existingPatient = await this.findExistingPatient(patient);
            
            if (existingPatient) {
              // Update existing patient
              await this.fhirService.updateResource('Patient', existingPatient.id, patient);
              result.resourcesUpdated++;
            } else {
              // Create new patient
              await this.fhirService.createResource('Patient', patient);
              result.resourcesCreated++;
            }

            result.resourcesProcessed++;

            // Emit real-time event
            this.realtimeService.emitHealthcareEvent('patient-sync', {
              action: existingPatient ? 'updated' : 'created',
              resourceType: 'Patient',
              resourceId: patient.id,
              hospitalId,
              facilityName: config.facilityName
            });

          } catch (error) {
            result.errors.push(`Failed to process patient ${entry.resource?.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            result.resourcesSkipped++;
          }
        }
      }

      // Update last sync time
      await this.updateLastSyncTime(hospitalId, 'Patient', result.timestamp);

      result.success = result.errors.length === 0;
      return result;

    } catch (error) {
      result.errors.push(`Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return result;
    }
  }

  /**
   * Sync practitioner data from a specific hospital
   */
  public async syncPractitionerData(hospitalId: string, lastSyncTime?: string): Promise<HospitalSyncResult> {
    const result: HospitalSyncResult = {
      success: false,
      hospitalId,
      resourcesProcessed: 0,
      resourcesCreated: 0,
      resourcesUpdated: 0,
      resourcesSkipped: 0,
      errors: [],
      warnings: [],
      timestamp: new Date().toISOString()
    };

    try {
      const config = await this.getHospitalConfig(hospitalId);
      if (!config) {
        throw new Error(`Hospital configuration not found: ${hospitalId}`);
      }

      if (!config.supportedResources.includes('Practitioner')) {
        result.warnings.push('Hospital does not support Practitioner resource');
        return result;
      }

      const axiosInstance = this.hospitalConnections.get(hospitalId);
      if (!axiosInstance) {
        throw new Error(`No connection available for hospital: ${hospitalId}`);
      }

      const queryParams: any = {};
      if (lastSyncTime) {
        queryParams._lastUpdated = `gt${lastSyncTime}`;
      }

      const response = await axiosInstance.get('/Practitioner', { params: queryParams });
      const bundle: FHIRBundleResponse = response.data;

      if (bundle.entry) {
        for (const entry of bundle.entry) {
          try {
            const practitioner = entry.resource as MalaysianPractitioner;
            
            // Add hospital source metadata
            practitioner.meta = {
              ...practitioner.meta,
              tag: [
                ...(practitioner.meta?.tag || []),
                {
                  system: 'https://fhir.medimate.my/CodeSystem/data-source',
                  code: 'hospital-his',
                  display: `Hospital HIS: ${config.facilityName}`
                }
              ]
            };

            // Check if practitioner already exists
            const existingPractitioner = await this.findExistingPractitioner(practitioner);
            
            if (existingPractitioner) {
              await this.fhirService.updateResource('Practitioner', existingPractitioner.id, practitioner);
              result.resourcesUpdated++;
            } else {
              await this.fhirService.createResource('Practitioner', practitioner);
              result.resourcesCreated++;
            }

            result.resourcesProcessed++;

            this.realtimeService.emitHealthcareEvent('practitioner-sync', {
              action: existingPractitioner ? 'updated' : 'created',
              resourceType: 'Practitioner',
              resourceId: practitioner.id,
              hospitalId,
              facilityName: config.facilityName
            });

          } catch (error) {
            result.errors.push(`Failed to process practitioner ${entry.resource?.id}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            result.resourcesSkipped++;
          }
        }
      }

      await this.updateLastSyncTime(hospitalId, 'Practitioner', result.timestamp);
      result.success = result.errors.length === 0;
      return result;

    } catch (error) {
      result.errors.push(`Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      return result;
    }
  }

  /**
   * Search for resources in a specific hospital
   */
  public async searchHospitalResources(query: HospitalSearchQuery): Promise<FHIRBundleResponse> {
    try {
      const config = await this.getHospitalConfig(query.hospitalId);
      if (!config) {
        throw new Error(`Hospital configuration not found: ${query.hospitalId}`);
      }

      if (!config.supportedResources.includes(query.resourceType)) {
        throw new Error(`Hospital does not support ${query.resourceType} resource`);
      }

      const axiosInstance = this.hospitalConnections.get(query.hospitalId);
      if (!axiosInstance) {
        throw new Error(`No connection available for hospital: ${query.hospitalId}`);
      }

      const response = await axiosInstance.get(`/${query.resourceType}`, {
        params: query.parameters
      });

      return response.data;
    } catch (error) {
      throw new Error(`Hospital search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Send data to hospital system
   */
  public async sendToHospital(hospitalId: string, resourceType: string, resource: any): Promise<any> {
    try {
      const config = await this.getHospitalConfig(hospitalId);
      if (!config) {
        throw new Error(`Hospital configuration not found: ${hospitalId}`);
      }

      const axiosInstance = this.hospitalConnections.get(hospitalId);
      if (!axiosInstance) {
        throw new Error(`No connection available for hospital: ${hospitalId}`);
      }

      const response = await axiosInstance.post(`/${resourceType}`, resource);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to send to hospital: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Test connection to a hospital
   */
  public async testHospitalConnection(hospitalId: string): Promise<{ success: boolean; error?: string; metadata?: any }> {
    try {
      const axiosInstance = this.hospitalConnections.get(hospitalId);
      if (!axiosInstance) {
        return { success: false, error: 'No connection instance found' };
      }

      const response = await axiosInstance.get('/metadata');
      return { 
        success: true, 
        metadata: response.data 
      };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get sync status for all hospitals
   */
  public async getAllHospitalSyncStatus(): Promise<any[]> {
    try {
      const connection = this.db.getConnection();
      const hospitals = await connection.manyOrNone(`
        SELECT 
          hi.id,
          hi.facility_code,
          hi.facility_name,
          hi.is_active,
          hss.last_sync,
          hss.resource_type,
          hss.sync_status
        FROM hospital_integrations hi
        LEFT JOIN hospital_sync_status hss ON hi.id = hss.hospital_id
        WHERE hi.is_active = true
        ORDER BY hi.facility_name, hss.resource_type
      `);

      // Group by hospital
      const hospitalMap = new Map();
      
      hospitals.forEach(row => {
        if (!hospitalMap.has(row.id)) {
          hospitalMap.set(row.id, {
            id: row.id,
            facilityCode: row.facility_code,
            facilityName: row.facility_name,
            isActive: row.is_active,
            syncStatus: {}
          });
        }
        
        if (row.resource_type) {
          hospitalMap.get(row.id).syncStatus[row.resource_type] = {
            lastSync: row.last_sync,
            status: row.sync_status
          };
        }
      });

      return Array.from(hospitalMap.values());
    } catch (error) {
      throw new Error(`Failed to get sync status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Schedule automatic sync for all hospitals
   */
  public async scheduleHospitalSync(): Promise<void> {
    try {
      const connection = this.db.getConnection();
      const activeHospitals = await connection.manyOrNone(
        'SELECT id, facility_code, facility_name FROM hospital_integrations WHERE is_active = true'
      );

      for (const hospital of activeHospitals) {
        // Get last sync times
        const lastPatientSync = await this.getLastSyncTime(hospital.id, 'Patient');
        const lastPractitionerSync = await this.getLastSyncTime(hospital.id, 'Practitioner');

        // Sync patients
        if (await this.shouldSync(hospital.id, 'Patient', lastPatientSync)) {
          const patientSyncResult = await this.syncPatientData(hospital.id, lastPatientSync);
          console.log(`Patient sync for ${hospital.facility_name}:`, patientSyncResult);
        }

        // Sync practitioners
        if (await this.shouldSync(hospital.id, 'Practitioner', lastPractitionerSync)) {
          const practitionerSyncResult = await this.syncPractitionerData(hospital.id, lastPractitionerSync);
          console.log(`Practitioner sync for ${hospital.facility_name}:`, practitionerSyncResult);
        }
      }
    } catch (error) {
      console.error('Scheduled hospital sync failed:', error);
    }
  }

  private async initializeHospitalConnections(): Promise<void> {
    try {
      const connection = this.db.getConnection();
      const hospitals = await connection.manyOrNone(
        'SELECT * FROM hospital_integrations WHERE is_active = true'
      );

      for (const hospital of hospitals) {
        const config: HospitalIntegrationConfig = {
          facilityCode: hospital.facility_code,
          facilityName: hospital.facility_name,
          endpoint: hospital.endpoint,
          authType: hospital.auth_type,
          credentials: JSON.parse(hospital.credentials),
          fhirVersion: hospital.fhir_version,
          supportedResources: JSON.parse(hospital.supported_resources),
          messageFormat: hospital.message_format,
          enableRealTime: hospital.enable_realtime,
          retryConfig: JSON.parse(hospital.retry_config)
        };

        this.createHospitalConnection(hospital.id, config);
      }
    } catch (error) {
      console.error('Failed to initialize hospital connections:', error);
    }
  }

  private createHospitalConnection(hospitalId: string, config: HospitalIntegrationConfig): void {
    const axiosInstance = axios.create({
      baseURL: config.endpoint,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/fhir+json',
        'Accept': 'application/fhir+json',
        'User-Agent': 'MediMate-Malaysia/1.0.0'
      }
    });

    // Add authentication interceptor
    axiosInstance.interceptors.request.use(async (axiosConfig) => {
      switch (config.authType) {
        case 'oauth2':
          if (config.credentials.clientId && config.credentials.clientSecret) {
            // Implement OAuth2 token acquisition
            const token = await this.getOAuth2Token(config.credentials);
            axiosConfig.headers.Authorization = `Bearer ${token}`;
          }
          break;
        case 'apiKey':
          if (config.credentials.apiKey) {
            axiosConfig.headers['X-API-Key'] = config.credentials.apiKey;
          }
          break;
        case 'certificate':
          // Certificate-based auth would be configured at axios instance level
          break;
      }
      return axiosConfig;
    });

    // Add retry interceptor
    axiosInstance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const retryConfig = config.retryConfig;
        const retryCount = error.config.__retryCount || 0;

        if (retryCount < retryConfig.maxRetries) {
          error.config.__retryCount = retryCount + 1;
          
          await new Promise(resolve => 
            setTimeout(resolve, retryConfig.retryDelay * Math.pow(retryConfig.backoffMultiplier, retryCount))
          );
          
          return axiosInstance.request(error.config);
        }

        return Promise.reject(error);
      }
    );

    this.hospitalConnections.set(hospitalId, axiosInstance);
  }

  private async getHospitalConfig(hospitalId: string): Promise<HospitalIntegrationConfig | null> {
    try {
      const connection = this.db.getConnection();
      const hospital = await connection.oneOrNone(
        'SELECT * FROM hospital_integrations WHERE id = $1 AND is_active = true',
        [hospitalId]
      );

      if (!hospital) return null;

      return {
        facilityCode: hospital.facility_code,
        facilityName: hospital.facility_name,
        endpoint: hospital.endpoint,
        authType: hospital.auth_type,
        credentials: JSON.parse(hospital.credentials),
        fhirVersion: hospital.fhir_version,
        supportedResources: JSON.parse(hospital.supported_resources),
        messageFormat: hospital.message_format,
        enableRealTime: hospital.enable_realtime,
        retryConfig: JSON.parse(hospital.retry_config)
      };
    } catch (error) {
      console.error('Failed to get hospital config:', error);
      return null;
    }
  }

  private async findExistingPatient(patient: MalaysianPatient): Promise<any> {
    // Search by Malaysian identifiers
    if (patient.identifier) {
      for (const id of patient.identifier) {
        try {
          const searchResult = await this.fhirService.searchResources('Patient', {
            identifier: `${id.system}|${id.value}`
          });

          if (searchResult.entry && searchResult.entry.length > 0) {
            return searchResult.entry[0].resource;
          }
        } catch (error) {
          // Continue searching with other identifiers
        }
      }
    }

    return null;
  }

  private async findExistingPractitioner(practitioner: MalaysianPractitioner): Promise<any> {
    // Search by Malaysian practitioner identifiers
    if (practitioner.identifier) {
      for (const id of practitioner.identifier) {
        try {
          const searchResult = await this.fhirService.searchResources('Practitioner', {
            identifier: `${id.system}|${id.value}`
          });

          if (searchResult.entry && searchResult.entry.length > 0) {
            return searchResult.entry[0].resource;
          }
        } catch (error) {
          // Continue searching with other identifiers
        }
      }
    }

    return null;
  }

  private async getOAuth2Token(credentials: any): Promise<string> {
    // Implement OAuth2 token acquisition
    // This would typically involve making a request to the hospital's OAuth2 token endpoint
    // For now, return a placeholder
    return 'oauth2-token-placeholder';
  }

  private async updateLastSyncTime(hospitalId: string, resourceType: string, timestamp: string): Promise<void> {
    try {
      const connection = this.db.getConnection();
      await connection.none(
        `INSERT INTO hospital_sync_status (hospital_id, resource_type, last_sync, sync_status)
         VALUES ($1, $2, $3, 'success')
         ON CONFLICT (hospital_id, resource_type)
         DO UPDATE SET last_sync = $3, sync_status = 'success'`,
        [hospitalId, resourceType, timestamp]
      );
    } catch (error) {
      console.error('Failed to update last sync time:', error);
    }
  }

  private async getLastSyncTime(hospitalId: string, resourceType: string): Promise<string | null> {
    try {
      const connection = this.db.getConnection();
      const result = await connection.oneOrNone(
        'SELECT last_sync FROM hospital_sync_status WHERE hospital_id = $1 AND resource_type = $2',
        [hospitalId, resourceType]
      );

      return result?.last_sync || null;
    } catch (error) {
      console.error('Failed to get last sync time:', error);
      return null;
    }
  }

  private async shouldSync(hospitalId: string, resourceType: string, lastSyncTime: string | null): Promise<boolean> {
    // Simple logic: sync if no previous sync or if last sync was more than 1 hour ago
    if (!lastSyncTime) return true;
    
    const lastSync = new Date(lastSyncTime);
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    return lastSync < oneHourAgo;
  }
}

export default HospitalConnectorService;