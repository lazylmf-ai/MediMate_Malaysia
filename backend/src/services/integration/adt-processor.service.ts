/**
 * ADT (Admit, Discharge, Transfer) Message Processor Service
 * 
 * Specialized service for processing hospital ADT messages and maintaining
 * real-time patient admission status across Malaysian healthcare facilities
 */

import { DatabaseService } from '../database/databaseService';
import { FHIRService } from '../fhir/fhir.service';
import { MOHIntegrationService } from './moh-integration.service';
import { 
  ADTMessage, 
  HL7v2Message 
} from '../../types/fhir/fhir-operations';
import { 
  MalaysianPatient, 
  MalaysianEncounter, 
  MalaysianOrganization 
} from '../../types/fhir/malaysian-profiles';
import { v4 as uuidv4 } from 'uuid';
import { RealtimeServer } from '../realtime/realtimeServer';

export interface ADTEventNotification {
  eventType: 'admit' | 'discharge' | 'transfer' | 'update' | 'cancel';
  patientId: string;
  encounterId: string;
  facilityCode: string;
  facilityName: string;
  timestamp: string;
  details: {
    patientName: string;
    location: {
      department?: string;
      room?: string;
      bed?: string;
    };
    attendingPhysician?: string;
    admissionDate?: string;
    dischargeDate?: string;
    transferFrom?: string;
    transferTo?: string;
  };
}

export interface PatientAdmissionStatus {
  patientId: string;
  nationalId: string;
  patientName: string;
  admissionStatus: 'admitted' | 'discharged' | 'transferred' | 'outpatient';
  currentFacility?: {
    code: string;
    name: string;
  };
  currentLocation?: {
    department?: string;
    room?: string;
    bed?: string;
  };
  admissionDate?: string;
  dischargeDate?: string;
  encounters: Array<{
    encounterId: string;
    facilityCode: string;
    status: string;
    admissionDate: string;
    dischargeDate?: string;
  }>;
  lastUpdated: string;
}

export interface ADTProcessingResult {
  success: boolean;
  eventType: string;
  patientId: string;
  encounterId: string;
  messageControlId: string;
  processingTime: number;
  actions: string[];
  notifications: ADTEventNotification[];
  errors: string[];
  warnings: string[];
}

export class ADTProcessorService {
  private static instance: ADTProcessorService;
  private db: DatabaseService;
  private fhirService: FHIRService;
  private mohService: MOHIntegrationService;
  private realtimeService: RealtimeServer;

  constructor() {
    this.db = DatabaseService.getInstance();
    this.fhirService = FHIRService.getInstance();
    this.mohService = MOHIntegrationService.getInstance();
    this.realtimeService = RealtimeServer.getInstance();
  }

  public static getInstance(): ADTProcessorService {
    if (!ADTProcessorService.instance) {
      ADTProcessorService.instance = new ADTProcessorService();
    }
    return ADTProcessorService.instance;
  }

  /**
   * Process ADT message and update patient admission status
   */
  public async processADTMessage(message: HL7v2Message): Promise<ADTProcessingResult> {
    const startTime = Date.now();
    const result: ADTProcessingResult = {
      success: false,
      eventType: '',
      patientId: '',
      encounterId: '',
      messageControlId: message.messageControlId,
      processingTime: 0,
      actions: [],
      notifications: [],
      errors: [],
      warnings: []
    };

    try {
      const adtMessage = this.parseADTMessage(message);
      result.eventType = this.getEventType(adtMessage.messageType);
      
      // Process based on ADT event type
      switch (adtMessage.messageType) {
        case 'ADT^A01': // Admit/visit notification
          await this.processAdmission(adtMessage, result);
          break;
        case 'ADT^A02': // Transfer a patient
          await this.processTransfer(adtMessage, result);
          break;
        case 'ADT^A03': // Discharge/end visit
          await this.processDischarge(adtMessage, result);
          break;
        case 'ADT^A04': // Register a patient
          await this.processRegistration(adtMessage, result);
          break;
        case 'ADT^A08': // Update patient information
          await this.processPatientUpdate(adtMessage, result);
          break;
        case 'ADT^A11': // Cancel admit/visit notification
          await this.processCancelAdmission(adtMessage, result);
          break;
        case 'ADT^A12': // Cancel transfer
          await this.processCancelTransfer(adtMessage, result);
          break;
        case 'ADT^A13': // Cancel discharge/end visit
          await this.processCancelDischarge(adtMessage, result);
          break;
        default:
          result.warnings.push(`Unsupported ADT message type: ${adtMessage.messageType}`);
      }

      result.success = result.errors.length === 0;
      result.processingTime = Date.now() - startTime;

      // Send notifications and update real-time status
      await this.sendNotifications(result);
      
      // Store processing result
      await this.storeADTProcessingResult(adtMessage, result);

      return result;

    } catch (error) {
      result.errors.push(`ADT processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      result.processingTime = Date.now() - startTime;
      return result;
    }
  }

  /**
   * Get current admission status for a patient
   */
  public async getPatientAdmissionStatus(patientIdentifier: { type: string; value: string }): Promise<PatientAdmissionStatus | null> {
    try {
      const connection = this.db.getConnection();
      
      const patient = await connection.oneOrNone(`
        SELECT 
          pas.patient_id,
          pas.national_id,
          pas.patient_name,
          pas.admission_status,
          pas.current_facility_code,
          pas.current_facility_name,
          pas.current_location,
          pas.admission_date,
          pas.discharge_date,
          pas.last_updated
        FROM patient_admission_status pas
        WHERE (pas.national_id = $1 AND $2 = 'national_id') 
           OR (pas.patient_id = $1 AND $2 = 'patient_id')
      `, [patientIdentifier.value, patientIdentifier.type]);

      if (!patient) return null;

      // Get encounter history
      const encounters = await connection.manyOrNone(`
        SELECT 
          encounter_id,
          facility_code,
          status,
          admission_date,
          discharge_date
        FROM patient_encounters
        WHERE patient_id = $1
        ORDER BY admission_date DESC
        LIMIT 10
      `, [patient.patient_id]);

      return {
        patientId: patient.patient_id,
        nationalId: patient.national_id,
        patientName: patient.patient_name,
        admissionStatus: patient.admission_status,
        currentFacility: patient.current_facility_code ? {
          code: patient.current_facility_code,
          name: patient.current_facility_name
        } : undefined,
        currentLocation: patient.current_location ? JSON.parse(patient.current_location) : undefined,
        admissionDate: patient.admission_date,
        dischargeDate: patient.discharge_date,
        encounters: encounters || [],
        lastUpdated: patient.last_updated
      };

    } catch (error) {
      console.error('Failed to get patient admission status:', error);
      throw new Error(`Failed to get patient admission status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get admission statistics for a facility
   */
  public async getFacilityAdmissionStats(facilityCode: string, date?: string): Promise<any> {
    try {
      const connection = this.db.getConnection();
      const queryDate = date || new Date().toISOString().split('T')[0];

      const stats = await connection.one(`
        SELECT 
          COUNT(CASE WHEN admission_status = 'admitted' THEN 1 END) as current_admissions,
          COUNT(CASE WHEN DATE(admission_date) = $2 THEN 1 END) as todays_admissions,
          COUNT(CASE WHEN DATE(discharge_date) = $2 THEN 1 END) as todays_discharges,
          COUNT(CASE WHEN DATE(last_updated) = $2 AND admission_status = 'transferred' THEN 1 END) as todays_transfers,
          AVG(CASE 
            WHEN admission_status = 'discharged' AND admission_date IS NOT NULL AND discharge_date IS NOT NULL
            THEN EXTRACT(EPOCH FROM (discharge_date::timestamp - admission_date::timestamp)) / 86400.0
          END) as avg_length_of_stay
        FROM patient_admission_status
        WHERE current_facility_code = $1
      `, [facilityCode, queryDate]);

      return {
        facilityCode,
        date: queryDate,
        currentAdmissions: parseInt(stats.current_admissions) || 0,
        todaysAdmissions: parseInt(stats.todays_admissions) || 0,
        todaysDischarges: parseInt(stats.todays_discharges) || 0,
        todaysTransfers: parseInt(stats.todays_transfers) || 0,
        avgLengthOfStay: parseFloat(stats.avg_length_of_stay) || 0
      };

    } catch (error) {
      console.error('Failed to get facility admission stats:', error);
      throw new Error(`Failed to get facility admission stats: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get real-time bed occupancy for a facility
   */
  public async getFacilityBedOccupancy(facilityCode: string): Promise<any> {
    try {
      const connection = this.db.getConnection();

      const occupancy = await connection.manyOrNone(`
        SELECT 
          current_location->>'department' as department,
          current_location->>'room' as room,
          current_location->>'bed' as bed,
          patient_name,
          admission_date,
          national_id
        FROM patient_admission_status
        WHERE current_facility_code = $1 
          AND admission_status = 'admitted'
          AND current_location IS NOT NULL
        ORDER BY 
          current_location->>'department',
          current_location->>'room',
          current_location->>'bed'
      `, [facilityCode]);

      // Group by department and room
      const departments: any = {};
      
      for (const patient of occupancy) {
        const dept = patient.department || 'General';
        const room = patient.room || 'Unknown';
        
        if (!departments[dept]) {
          departments[dept] = {};
        }
        
        if (!departments[dept][room]) {
          departments[dept][room] = [];
        }
        
        departments[dept][room].push({
          bed: patient.bed,
          patientName: patient.patient_name,
          admissionDate: patient.admission_date,
          nationalId: patient.national_id
        });
      }

      return {
        facilityCode,
        totalOccupied: occupancy.length,
        departments,
        lastUpdated: new Date().toISOString()
      };

    } catch (error) {
      console.error('Failed to get facility bed occupancy:', error);
      throw new Error(`Failed to get facility bed occupancy: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private parseADTMessage(message: HL7v2Message): ADTMessage {
    // Parse PID segment for patient information
    const pidSegment = message.segments.find(s => s.segmentType === 'PID');
    if (!pidSegment) {
      throw new Error('PID segment not found in ADT message');
    }

    // Parse PV1 segment for encounter information
    const pv1Segment = message.segments.find(s => s.segmentType === 'PV1');
    if (!pv1Segment) {
      throw new Error('PV1 segment not found in ADT message');
    }

    const patientId = pidSegment.fields[2] || ''; // Patient ID
    const nationalId = pidSegment.fields[3] || ''; // National ID
    const patientName = this.parseHL7Name(pidSegment.fields[4] || '');
    const birthDate = this.parseHL7Date(pidSegment.fields[6] || '');
    const gender = pidSegment.fields[7] || '';
    const address = this.parseHL7Address(pidSegment.fields[10] || '');

    const encounterId = pv1Segment.fields[18] || ''; // Visit number
    const encounterClass = pv1Segment.fields[1] || ''; // Patient class
    const location = this.parseHL7Location(pv1Segment.fields[2] || '');
    const attendingDoctor = this.parseHL7Doctor(pv1Segment.fields[6] || '');
    const admissionDate = this.parseHL7DateTime(pv1Segment.fields[43] || '');
    const dischargeDate = this.parseHL7DateTime(pv1Segment.fields[44] || '');

    return {
      messageType: message.messageType as 'ADT^A01' | 'ADT^A02' | 'ADT^A03' | 'ADT^A04' | 'ADT^A08' | 'ADT^A11' | 'ADT^A12' | 'ADT^A13',
      messageControlId: message.messageControlId,
      sendingApplication: message.sendingApplication,
      sendingFacility: message.sendingFacility,
      receivingApplication: message.receivingApplication,
      receivingFacility: message.receivingFacility,
      timestamp: message.timestamp,
      segments: message.segments,
      raw: message.raw,
      patientInfo: {
        patientId,
        nationalId,
        name: patientName,
        birthDate,
        gender: gender as 'M' | 'F' | 'O' | 'U',
        address
      },
      encounterInfo: {
        encounterId,
        encounterClass: encounterClass as 'I' | 'O' | 'A' | 'E',
        admissionDate,
        dischargeDate,
        location: {
          facility: message.sendingFacility,
          department: location.department,
          room: location.room,
          bed: location.bed
        },
        attendingPhysician: attendingDoctor
      }
    };
  }

  private async processAdmission(adtMessage: ADTMessage, result: ADTProcessingResult): Promise<void> {
    try {
      // Update or create patient admission status
      await this.updatePatientAdmissionStatus(adtMessage, 'admitted');
      result.actions.push('Updated patient admission status to admitted');

      // Create or update FHIR resources
      const fhirResources = await this.createFHIRResources(adtMessage);
      result.patientId = fhirResources.patient.id!;
      result.encounterId = fhirResources.encounter.id!;
      result.actions.push('Created/updated FHIR resources');

      // Create notification
      const notification: ADTEventNotification = {
        eventType: 'admit',
        patientId: result.patientId,
        encounterId: result.encounterId,
        facilityCode: adtMessage.sendingFacility,
        facilityName: adtMessage.sendingFacility, // TODO: Get actual facility name
        timestamp: new Date().toISOString(),
        details: {
          patientName: `${adtMessage.patientInfo.name.given.join(' ')} ${adtMessage.patientInfo.name.family}`,
          location: adtMessage.encounterInfo.location,
          attendingPhysician: adtMessage.encounterInfo.attendingPhysician?.name,
          admissionDate: adtMessage.encounterInfo.admissionDate
        }
      };
      result.notifications.push(notification);

      // Submit to MOH if configured
      try {
        await this.mohService.submitEncounterData(result.encounterId, adtMessage.sendingFacility);
        result.actions.push('Submitted encounter data to MOH');
      } catch (error) {
        result.warnings.push(`MOH submission failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }

    } catch (error) {
      result.errors.push(`Admission processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async processDischarge(adtMessage: ADTMessage, result: ADTProcessingResult): Promise<void> {
    try {
      // Update patient admission status
      await this.updatePatientAdmissionStatus(adtMessage, 'discharged');
      result.actions.push('Updated patient admission status to discharged');

      // Update FHIR encounter
      const encounter = await this.findOrCreateFHIREncounter(adtMessage);
      encounter.status = 'finished';
      encounter.period = {
        ...encounter.period,
        end: adtMessage.encounterInfo.dischargeDate
      };

      await this.fhirService.updateResource('Encounter', encounter.id!, encounter);
      result.patientId = encounter.subject?.reference?.split('/')[1] || adtMessage.patientInfo.patientId;
      result.encounterId = encounter.id!;
      result.actions.push('Updated FHIR encounter status to finished');

      // Create notification
      const notification: ADTEventNotification = {
        eventType: 'discharge',
        patientId: result.patientId,
        encounterId: result.encounterId,
        facilityCode: adtMessage.sendingFacility,
        facilityName: adtMessage.sendingFacility,
        timestamp: new Date().toISOString(),
        details: {
          patientName: `${adtMessage.patientInfo.name.given.join(' ')} ${adtMessage.patientInfo.name.family}`,
          location: adtMessage.encounterInfo.location,
          dischargeDate: adtMessage.encounterInfo.dischargeDate
        }
      };
      result.notifications.push(notification);

    } catch (error) {
      result.errors.push(`Discharge processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async processTransfer(adtMessage: ADTMessage, result: ADTProcessingResult): Promise<void> {
    try {
      // Update patient location
      await this.updatePatientAdmissionStatus(adtMessage, 'transferred');
      result.actions.push('Updated patient location for transfer');

      // Update FHIR encounter location
      const encounter = await this.findOrCreateFHIREncounter(adtMessage);
      if (!encounter.location) encounter.location = [];
      
      encounter.location.push({
        location: {
          display: `${adtMessage.encounterInfo.location.facility}${adtMessage.encounterInfo.location.department ? ` - ${adtMessage.encounterInfo.location.department}` : ''}`
        },
        period: {
          start: new Date().toISOString()
        }
      });

      await this.fhirService.updateResource('Encounter', encounter.id!, encounter);
      result.patientId = encounter.subject?.reference?.split('/')[1] || adtMessage.patientInfo.patientId;
      result.encounterId = encounter.id!;
      result.actions.push('Updated FHIR encounter location');

      // Create notification
      const notification: ADTEventNotification = {
        eventType: 'transfer',
        patientId: result.patientId,
        encounterId: result.encounterId,
        facilityCode: adtMessage.sendingFacility,
        facilityName: adtMessage.sendingFacility,
        timestamp: new Date().toISOString(),
        details: {
          patientName: `${adtMessage.patientInfo.name.given.join(' ')} ${adtMessage.patientInfo.name.family}`,
          location: adtMessage.encounterInfo.location,
          transferTo: `${adtMessage.encounterInfo.location.department || ''} ${adtMessage.encounterInfo.location.room || ''} ${adtMessage.encounterInfo.location.bed || ''}`.trim()
        }
      };
      result.notifications.push(notification);

    } catch (error) {
      result.errors.push(`Transfer processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async processRegistration(adtMessage: ADTMessage, result: ADTProcessingResult): Promise<void> {
    // Registration is similar to admission for outpatients
    await this.processAdmission(adtMessage, result);
    result.actions = result.actions.map(action => action.replace('admitted', 'registered'));
  }

  private async processPatientUpdate(adtMessage: ADTMessage, result: ADTProcessingResult): Promise<void> {
    try {
      // Update FHIR patient resource
      const patient = await this.findOrCreateFHIRPatient(adtMessage);
      await this.fhirService.updateResource('Patient', patient.id!, patient);
      result.patientId = patient.id!;
      result.actions.push('Updated FHIR patient information');

      // Update admission status if needed
      const currentStatus = await this.getPatientAdmissionStatus({ type: 'patient_id', value: result.patientId });
      if (currentStatus) {
        await this.updatePatientAdmissionStatus(adtMessage, currentStatus.admissionStatus);
        result.actions.push('Updated patient admission status');
      }

    } catch (error) {
      result.errors.push(`Patient update processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async processCancelAdmission(adtMessage: ADTMessage, result: ADTProcessingResult): Promise<void> {
    try {
      // Cancel the admission
      await this.updatePatientAdmissionStatus(adtMessage, 'discharged');
      result.actions.push('Cancelled admission');

      // Update FHIR encounter status
      const encounter = await this.findOrCreateFHIREncounter(adtMessage);
      encounter.status = 'cancelled';
      await this.fhirService.updateResource('Encounter', encounter.id!, encounter);
      result.patientId = encounter.subject?.reference?.split('/')[1] || adtMessage.patientInfo.patientId;
      result.encounterId = encounter.id!;
      result.actions.push('Updated FHIR encounter status to cancelled');

    } catch (error) {
      result.errors.push(`Cancel admission processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async processCancelTransfer(adtMessage: ADTMessage, result: ADTProcessingResult): Promise<void> {
    // Revert to previous location (implementation would need location history)
    result.warnings.push('Cancel transfer processing not fully implemented - would require location history');
  }

  private async processCancelDischarge(adtMessage: ADTMessage, result: ADTProcessingResult): Promise<void> {
    try {
      // Revert discharge
      await this.updatePatientAdmissionStatus(adtMessage, 'admitted');
      result.actions.push('Cancelled discharge - patient re-admitted');

      // Update FHIR encounter status
      const encounter = await this.findOrCreateFHIREncounter(adtMessage);
      encounter.status = 'in-progress';
      encounter.period = {
        ...encounter.period,
        end: undefined // Remove end date
      };
      
      await this.fhirService.updateResource('Encounter', encounter.id!, encounter);
      result.patientId = encounter.subject?.reference?.split('/')[1] || adtMessage.patientInfo.patientId;
      result.encounterId = encounter.id!;
      result.actions.push('Updated FHIR encounter status to in-progress');

    } catch (error) {
      result.errors.push(`Cancel discharge processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private getEventType(messageType: string): string {
    switch (messageType) {
      case 'ADT^A01': return 'admit';
      case 'ADT^A02': return 'transfer';
      case 'ADT^A03': return 'discharge';
      case 'ADT^A04': return 'register';
      case 'ADT^A08': return 'update';
      case 'ADT^A11': return 'cancel_admit';
      case 'ADT^A12': return 'cancel_transfer';
      case 'ADT^A13': return 'cancel_discharge';
      default: return 'unknown';
    }
  }

  private parseHL7Name(nameField: string): { family: string; given: string[] } {
    const parts = nameField.split('^');
    return {
      family: parts[0] || '',
      given: parts[1] ? [parts[1]] : []
    };
  }

  private parseHL7Date(dateField: string): string {
    if (!dateField || dateField.length < 8) return '';
    
    const year = dateField.substring(0, 4);
    const month = dateField.substring(4, 6);
    const day = dateField.substring(6, 8);
    
    return `${year}-${month}-${day}`;
  }

  private parseHL7DateTime(dateTimeField: string): string {
    if (!dateTimeField || dateTimeField.length < 8) return '';
    
    const date = this.parseHL7Date(dateTimeField);
    if (dateTimeField.length >= 14) {
      const hour = dateTimeField.substring(8, 10);
      const minute = dateTimeField.substring(10, 12);
      const second = dateTimeField.substring(12, 14);
      return `${date}T${hour}:${minute}:${second}`;
    }
    
    return `${date}T00:00:00`;
  }

  private parseHL7Address(addressField: string): any {
    const parts = addressField.split('^');
    return {
      line: parts[0] ? [parts[0]] : [],
      city: parts[2] || '',
      state: parts[3] || '',
      postalCode: parts[4] || '',
      country: parts[5] || 'Malaysia'
    };
  }

  private parseHL7Location(locationField: string): { department?: string; room?: string; bed?: string } {
    const parts = locationField.split('^');
    return {
      department: parts[0] || undefined,
      room: parts[1] || undefined,
      bed: parts[2] || undefined
    };
  }

  private parseHL7Doctor(doctorField: string): { id: string; name: string } | undefined {
    if (!doctorField) return undefined;
    
    const parts = doctorField.split('^');
    return {
      id: parts[0] || '',
      name: parts[1] || ''
    };
  }

  private async updatePatientAdmissionStatus(adtMessage: ADTMessage, status: string): Promise<void> {
    const connection = this.db.getConnection();
    
    await connection.none(`
      INSERT INTO patient_admission_status (
        patient_id, national_id, patient_name, admission_status,
        current_facility_code, current_facility_name, current_location,
        admission_date, discharge_date, last_updated
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      ON CONFLICT (patient_id)
      DO UPDATE SET
        admission_status = $4,
        current_facility_code = CASE WHEN $4 = 'admitted' OR $4 = 'transferred' THEN $5 ELSE NULL END,
        current_facility_name = CASE WHEN $4 = 'admitted' OR $4 = 'transferred' THEN $6 ELSE NULL END,
        current_location = CASE WHEN $4 = 'admitted' OR $4 = 'transferred' THEN $7 ELSE NULL END,
        admission_date = CASE WHEN $4 = 'admitted' THEN $8 ELSE patient_admission_status.admission_date END,
        discharge_date = CASE WHEN $4 = 'discharged' THEN $9 ELSE NULL END,
        last_updated = NOW()
    `, [
      adtMessage.patientInfo.patientId,
      adtMessage.patientInfo.nationalId,
      `${adtMessage.patientInfo.name.given.join(' ')} ${adtMessage.patientInfo.name.family}`,
      status,
      adtMessage.sendingFacility,
      adtMessage.sendingFacility, // TODO: Get actual facility name
      JSON.stringify(adtMessage.encounterInfo.location),
      adtMessage.encounterInfo.admissionDate,
      adtMessage.encounterInfo.dischargeDate
    ]);
  }

  private async createFHIRResources(adtMessage: ADTMessage): Promise<{ patient: MalaysianPatient; encounter: MalaysianEncounter }> {
    const patient = await this.findOrCreateFHIRPatient(adtMessage);
    const encounter = await this.findOrCreateFHIREncounter(adtMessage);
    
    return { patient, encounter };
  }

  private async findOrCreateFHIRPatient(adtMessage: ADTMessage): Promise<MalaysianPatient> {
    // Try to find existing patient first
    const searchResult = await this.fhirService.searchResources('Patient', {
      identifier: `https://fhir.moh.gov.my/identifier/mykad|${adtMessage.patientInfo.nationalId}`
    });

    if (searchResult.entry && searchResult.entry.length > 0) {
      return searchResult.entry[0].resource as MalaysianPatient;
    }

    // Create new patient
    const patient: MalaysianPatient = {
      resourceType: 'Patient',
      id: uuidv4(),
      identifier: [{
        use: 'usual',
        type: {
          coding: [{
            system: 'https://fhir.moh.gov.my/CodeSystem/identifier-type',
            code: 'NRIC',
            display: 'National Registration Identity Card'
          }]
        },
        system: 'https://fhir.moh.gov.my/identifier/mykad',
        value: adtMessage.patientInfo.nationalId || adtMessage.patientInfo.patientId
      }],
      name: [{
        use: 'official',
        family: adtMessage.patientInfo.name.family,
        given: adtMessage.patientInfo.name.given
      }],
      gender: adtMessage.patientInfo.gender === 'M' ? 'male' : 
             adtMessage.patientInfo.gender === 'F' ? 'female' : 
             adtMessage.patientInfo.gender === 'O' ? 'other' : 'unknown',
      birthDate: adtMessage.patientInfo.birthDate,
      address: adtMessage.patientInfo.address ? [adtMessage.patientInfo.address] : undefined
    };

    await this.fhirService.createResource('Patient', patient);
    return patient;
  }

  private async findOrCreateFHIREncounter(adtMessage: ADTMessage): Promise<MalaysianEncounter> {
    // Try to find existing encounter first
    const searchResult = await this.fhirService.searchResources('Encounter', {
      identifier: `https://fhir.moh.gov.my/identifier/encounter|${adtMessage.encounterInfo.encounterId}`
    });

    if (searchResult.entry && searchResult.entry.length > 0) {
      return searchResult.entry[0].resource as MalaysianEncounter;
    }

    // Get or create patient first
    const patient = await this.findOrCreateFHIRPatient(adtMessage);

    // Create new encounter
    const encounter: MalaysianEncounter = {
      resourceType: 'Encounter',
      id: uuidv4(),
      identifier: [{
        use: 'usual',
        type: {
          coding: [{
            system: 'https://fhir.moh.gov.my/CodeSystem/identifier-type',
            code: 'ENCOUNTER',
            display: 'Encounter Identifier'
          }]
        },
        system: 'https://fhir.moh.gov.my/identifier/encounter',
        value: adtMessage.encounterInfo.encounterId
      }],
      status: 'in-progress',
      class: {
        system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
        code: adtMessage.encounterInfo.encounterClass === 'I' ? 'IMP' : 'AMB',
        display: adtMessage.encounterInfo.encounterClass === 'I' ? 'Inpatient' : 'Ambulatory'
      },
      subject: {
        reference: `Patient/${patient.id}`,
        display: `${adtMessage.patientInfo.name.given.join(' ')} ${adtMessage.patientInfo.name.family}`
      },
      period: {
        start: adtMessage.encounterInfo.admissionDate,
        end: adtMessage.encounterInfo.dischargeDate
      }
    };

    await this.fhirService.createResource('Encounter', encounter);
    return encounter;
  }

  private async sendNotifications(result: ADTProcessingResult): Promise<void> {
    for (const notification of result.notifications) {
      // Emit real-time event (placeholder - would need to implement proper event emission)
      console.log('ADT Event notification:', notification);
    }
  }

  private async storeADTProcessingResult(adtMessage: ADTMessage, result: ADTProcessingResult): Promise<void> {
    try {
      const connection = this.db.getConnection();
      await connection.none(`
        INSERT INTO adt_processing_results (
          id, message_control_id, message_type, event_type,
          patient_id, encounter_id, facility_code, success,
          processing_time, actions, notifications, errors, warnings, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
      `, [
        uuidv4(),
        result.messageControlId,
        adtMessage.messageType,
        result.eventType,
        result.patientId,
        result.encounterId,
        adtMessage.sendingFacility,
        result.success,
        result.processingTime,
        JSON.stringify(result.actions),
        JSON.stringify(result.notifications),
        JSON.stringify(result.errors),
        JSON.stringify(result.warnings)
      ]);
    } catch (error) {
      console.error('Failed to store ADT processing result:', error);
    }
  }
}

export default ADTProcessorService;