/**
 * HL7 v2.x Legacy System Integration Service
 * 
 * Handles integration with legacy hospital systems using HL7 v2.x messaging
 * Provides MLLP (Minimal Lower Layer Protocol) message processing and 
 * conversion between HL7 v2.x and FHIR R4 formats
 */

import net from 'net';
import { DatabaseService } from '../database/databaseService';
import { FHIRService } from '../fhir/fhir.service';
import { 
  HL7v2Message, 
  HL7v2Segment, 
  ADTMessage 
} from '../../types/fhir/fhir-operations';
import { 
  MalaysianPatient, 
  MalaysianPractitioner, 
  MalaysianEncounter 
} from '../../types/fhir/malaysian-profiles';
import { v4 as uuidv4 } from 'uuid';
import { RealtimeService } from '../realtime/realtime.service';

export interface HL7v2Config {
  port: number;
  host: string;
  enableServer: boolean;
  maxConnections: number;
  messageTimeout: number;
  acknowledgmentMode: 'AL' | 'NE' | 'SU' | 'ER';
  retryAttempts: number;
  retryDelay: number;
}

export interface HL7v2Connection {
  id: string;
  facilityCode: string;
  facilityName: string;
  host: string;
  port: number;
  isActive: boolean;
  lastActivity: string;
  messageCount: number;
}

export interface HL7v2ProcessingResult {
  success: boolean;
  messageControlId: string;
  messageType: string;
  processingTime: number;
  fhirResourcesCreated: string[];
  fhirResourcesUpdated: string[];
  errors: string[];
  warnings: string[];
  acknowledgment: string;
}

export class HL7v2LegacyService {
  private static instance: HL7v2LegacyService;
  private server: net.Server | null = null;
  private connections: Map<string, net.Socket> = new Map();
  private db: DatabaseService;
  private fhirService: FHIRService;
  private realtimeService: RealtimeService;
  private config: HL7v2Config;

  // HL7 v2.x control characters
  private readonly FIELD_SEPARATOR = '|';
  private readonly COMPONENT_SEPARATOR = '^';
  private readonly REPETITION_SEPARATOR = '~';
  private readonly ESCAPE_CHARACTER = '\\';
  private readonly SUBCOMPONENT_SEPARATOR = '&';
  private readonly START_OF_BLOCK = '\x0B'; // VT
  private readonly END_OF_BLOCK = '\x1C'; // FS
  private readonly CARRIAGE_RETURN = '\x0D'; // CR

  constructor() {
    this.db = DatabaseService.getInstance();
    this.fhirService = FHIRService.getInstance();
    this.realtimeService = RealtimeService.getInstance();
    this.config = this.loadConfig();
    
    if (this.config.enableServer) {
      this.startServer();
    }
  }

  public static getInstance(): HL7v2LegacyService {
    if (!HL7v2LegacyService.instance) {
      HL7v2LegacyService.instance = new HL7v2LegacyService();
    }
    return HL7v2LegacyService.instance;
  }

  /**
   * Start HL7 v2.x MLLP server
   */
  public startServer(): void {
    if (this.server) {
      console.log('HL7 v2.x server is already running');
      return;
    }

    this.server = net.createServer((socket) => {
      const connectionId = uuidv4();
      this.connections.set(connectionId, socket);

      console.log(`HL7 v2.x connection established: ${connectionId} from ${socket.remoteAddress}:${socket.remotePort}`);

      socket.on('data', async (data) => {
        try {
          await this.processIncomingMessage(connectionId, data, socket);
        } catch (error) {
          console.error('Error processing HL7 v2.x message:', error);
          const ack = this.createNAK('AE', 'Message processing failed');
          socket.write(this.wrapMLLP(ack));
        }
      });

      socket.on('close', () => {
        console.log(`HL7 v2.x connection closed: ${connectionId}`);
        this.connections.delete(connectionId);
      });

      socket.on('error', (error) => {
        console.error(`HL7 v2.x connection error ${connectionId}:`, error);
        this.connections.delete(connectionId);
      });

      socket.setTimeout(this.config.messageTimeout);
      socket.on('timeout', () => {
        console.log(`HL7 v2.x connection timeout: ${connectionId}`);
        socket.destroy();
      });
    });

    this.server.listen(this.config.port, this.config.host, () => {
      console.log(`HL7 v2.x MLLP server listening on ${this.config.host}:${this.config.port}`);
    });

    this.server.on('error', (error) => {
      console.error('HL7 v2.x server error:', error);
    });
  }

  /**
   * Stop HL7 v2.x MLLP server
   */
  public stopServer(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.server) {
        resolve();
        return;
      }

      // Close all connections
      this.connections.forEach((socket, connectionId) => {
        socket.destroy();
        this.connections.delete(connectionId);
      });

      this.server.close(() => {
        this.server = null;
        console.log('HL7 v2.x server stopped');
        resolve();
      });
    });
  }

  /**
   * Send HL7 v2.x message to a facility
   */
  public async sendMessage(facilityCode: string, message: string): Promise<string> {
    try {
      const facility = await this.getFacilityConnection(facilityCode);
      if (!facility) {
        throw new Error(`No connection configuration found for facility: ${facilityCode}`);
      }

      return new Promise((resolve, reject) => {
        const socket = new net.Socket();
        
        socket.connect(facility.port, facility.host, () => {
          console.log(`Connected to ${facility.facilityName} (${facility.host}:${facility.port})`);
          socket.write(this.wrapMLLP(message));
        });

        socket.on('data', (data) => {
          const response = this.unwrapMLLP(data);
          socket.destroy();
          resolve(response);
        });

        socket.on('error', (error) => {
          socket.destroy();
          reject(error);
        });

        socket.setTimeout(this.config.messageTimeout);
        socket.on('timeout', () => {
          socket.destroy();
          reject(new Error('Message timeout'));
        });
      });
    } catch (error) {
      throw new Error(`Failed to send HL7 v2.x message: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse HL7 v2.x message
   */
  public parseMessage(rawMessage: string): HL7v2Message {
    const lines = rawMessage.split('\r');
    const segments: HL7v2Segment[] = [];

    let messageType = '';
    let messageControlId = '';
    let sendingApplication = '';
    let sendingFacility = '';
    let receivingApplication = '';
    let receivingFacility = '';
    let timestamp = '';

    for (const line of lines) {
      if (line.trim() === '') continue;

      const fields = line.split(this.FIELD_SEPARATOR);
      const segmentType = fields[0];

      segments.push({
        segmentType,
        fields: fields.slice(1),
        raw: line
      });

      // Extract header information from MSH segment
      if (segmentType === 'MSH') {
        messageType = fields[9] || '';
        messageControlId = fields[10] || '';
        sendingApplication = fields[3] || '';
        sendingFacility = fields[4] || '';
        receivingApplication = fields[5] || '';
        receivingFacility = fields[6] || '';
        timestamp = fields[7] || '';
      }
    }

    return {
      messageType,
      messageControlId,
      sendingApplication,
      sendingFacility,
      receivingApplication,
      receivingFacility,
      timestamp,
      segments,
      raw: rawMessage
    };
  }

  /**
   * Convert HL7 v2.x ADT message to FHIR resources
   */
  public async convertADTToFHIR(adtMessage: ADTMessage): Promise<{ patient: MalaysianPatient; encounter: MalaysianEncounter; practitioner?: MalaysianPractitioner }> {
    // Convert patient information
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
      gender: this.mapHL7GenderToFHIR(adtMessage.patientInfo.gender),
      birthDate: adtMessage.patientInfo.birthDate,
      address: adtMessage.patientInfo.address ? [{
        use: 'home',
        type: 'physical',
        line: adtMessage.patientInfo.address.line,
        city: adtMessage.patientInfo.address.city,
        state: adtMessage.patientInfo.address.state,
        postalCode: adtMessage.patientInfo.address.postalCode,
        country: adtMessage.patientInfo.address.country
      }] : undefined
    };

    // Convert encounter information
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
      status: this.mapHL7EncounterStatus(adtMessage.messageType),
      class: {
        system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode',
        code: this.mapHL7EncounterClass(adtMessage.encounterInfo.encounterClass),
        display: this.getEncounterClassDisplay(adtMessage.encounterInfo.encounterClass)
      },
      subject: {
        reference: `Patient/${patient.id}`,
        display: `${adtMessage.patientInfo.name.given.join(' ')} ${adtMessage.patientInfo.name.family}`
      },
      period: {
        start: adtMessage.encounterInfo.admissionDate,
        end: adtMessage.encounterInfo.dischargeDate
      },
      location: [{
        location: {
          display: `${adtMessage.encounterInfo.location.facility}${adtMessage.encounterInfo.location.department ? ` - ${adtMessage.encounterInfo.location.department}` : ''}`
        }
      }]
    };

    // Convert practitioner if available
    let practitioner: MalaysianPractitioner | undefined;
    if (adtMessage.encounterInfo.attendingPhysician) {
      practitioner = {
        resourceType: 'Practitioner',
        id: uuidv4(),
        identifier: [{
          use: 'official',
          type: {
            coding: [{
              system: 'https://fhir.moh.gov.my/CodeSystem/identifier-type',
              code: 'MMC',
              display: 'Malaysian Medical Council Number'
            }]
          },
          system: 'https://fhir.mmc.gov.my/identifier/mmc-number',
          value: adtMessage.encounterInfo.attendingPhysician.id
        }],
        name: [{
          use: 'official',
          text: adtMessage.encounterInfo.attendingPhysician.name
        }]
      };

      // Add practitioner reference to encounter
      encounter.participant = [{
        type: [{
          coding: [{
            system: 'http://terminology.hl7.org/CodeSystem/v3-ParticipationType',
            code: 'ATND',
            display: 'attender'
          }]
        }],
        individual: {
          reference: `Practitioner/${practitioner.id}`,
          display: practitioner.name?.[0]?.text
        }
      }];
    }

    return { patient, encounter, practitioner };
  }

  /**
   * Process incoming HL7 v2.x message
   */
  private async processIncomingMessage(connectionId: string, data: Buffer, socket: net.Socket): Promise<void> {
    const startTime = Date.now();
    const result: HL7v2ProcessingResult = {
      success: false,
      messageControlId: '',
      messageType: '',
      processingTime: 0,
      fhirResourcesCreated: [],
      fhirResourcesUpdated: [],
      errors: [],
      warnings: [],
      acknowledgment: ''
    };

    try {
      const rawMessage = this.unwrapMLLP(data);
      const message = this.parseMessage(rawMessage);
      
      result.messageControlId = message.messageControlId;
      result.messageType = message.messageType;

      // Store incoming message
      await this.storeIncomingMessage(connectionId, message);

      // Process based on message type
      if (message.messageType.startsWith('ADT^')) {
        await this.processADTMessage(message as ADTMessage, result);
      } else {
        result.warnings.push(`Unsupported message type: ${message.messageType}`);
      }

      result.success = result.errors.length === 0;
      result.processingTime = Date.now() - startTime;

      // Create acknowledgment
      if (result.success) {
        result.acknowledgment = this.createACK(message.messageControlId, 'AA', 'Message processed successfully');
      } else {
        result.acknowledgment = this.createNAK(message.messageControlId, 'AE', result.errors.join('; '));
      }

      // Send acknowledgment
      socket.write(this.wrapMLLP(result.acknowledgment));

      // Store processing result
      await this.storeProcessingResult(connectionId, message, result);

      // Emit real-time event
      this.realtimeService.emitHealthcareEvent('hl7v2-message-processed', {
        connectionId,
        messageType: result.messageType,
        messageControlId: result.messageControlId,
        success: result.success,
        processingTime: result.processingTime,
        resourcesCreated: result.fhirResourcesCreated.length,
        resourcesUpdated: result.fhirResourcesUpdated.length
      });

    } catch (error) {
      result.errors.push(`Processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      result.processingTime = Date.now() - startTime;
      
      const ack = this.createNAK('', 'AE', 'Message processing failed');
      socket.write(this.wrapMLLP(ack));
      
      console.error('HL7 v2.x message processing error:', error);
    }
  }

  private async processADTMessage(adtMessage: ADTMessage, result: HL7v2ProcessingResult): Promise<void> {
    try {
      // Convert HL7 v2.x to FHIR
      const { patient, encounter, practitioner } = await this.convertADTToFHIR(adtMessage);

      // Process patient
      const existingPatient = await this.findExistingPatient(patient);
      if (existingPatient) {
        await this.fhirService.updateResource('Patient', existingPatient.id, patient);
        result.fhirResourcesUpdated.push(`Patient/${existingPatient.id}`);
      } else {
        await this.fhirService.createResource('Patient', patient);
        result.fhirResourcesCreated.push(`Patient/${patient.id}`);
      }

      // Process practitioner if available
      if (practitioner) {
        const existingPractitioner = await this.findExistingPractitioner(practitioner);
        if (existingPractitioner) {
          await this.fhirService.updateResource('Practitioner', existingPractitioner.id, practitioner);
          result.fhirResourcesUpdated.push(`Practitioner/${existingPractitioner.id}`);
        } else {
          await this.fhirService.createResource('Practitioner', practitioner);
          result.fhirResourcesCreated.push(`Practitioner/${practitioner.id}`);
        }
      }

      // Process encounter
      const existingEncounter = await this.findExistingEncounter(encounter);
      if (existingEncounter) {
        await this.fhirService.updateResource('Encounter', existingEncounter.id, encounter);
        result.fhirResourcesUpdated.push(`Encounter/${existingEncounter.id}`);
      } else {
        await this.fhirService.createResource('Encounter', encounter);
        result.fhirResourcesCreated.push(`Encounter/${encounter.id}`);
      }

    } catch (error) {
      result.errors.push(`ADT processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private loadConfig(): HL7v2Config {
    return {
      port: parseInt(process.env.HL7V2_PORT || '2575'),
      host: process.env.HL7V2_HOST || '0.0.0.0',
      enableServer: process.env.HL7V2_ENABLE_SERVER === 'true',
      maxConnections: parseInt(process.env.HL7V2_MAX_CONNECTIONS || '50'),
      messageTimeout: parseInt(process.env.HL7V2_MESSAGE_TIMEOUT || '30000'),
      acknowledgmentMode: (process.env.HL7V2_ACK_MODE as 'AL' | 'NE' | 'SU' | 'ER') || 'AL',
      retryAttempts: parseInt(process.env.HL7V2_RETRY_ATTEMPTS || '3'),
      retryDelay: parseInt(process.env.HL7V2_RETRY_DELAY || '1000')
    };
  }

  private wrapMLLP(message: string): Buffer {
    return Buffer.from(this.START_OF_BLOCK + message + this.END_OF_BLOCK + this.CARRIAGE_RETURN);
  }

  private unwrapMLLP(data: Buffer): string {
    let message = data.toString();
    
    // Remove MLLP wrapper characters
    if (message.startsWith(this.START_OF_BLOCK)) {
      message = message.substring(1);
    }
    
    if (message.endsWith(this.END_OF_BLOCK + this.CARRIAGE_RETURN)) {
      message = message.substring(0, message.length - 2);
    } else if (message.endsWith(this.END_OF_BLOCK)) {
      message = message.substring(0, message.length - 1);
    }
    
    return message;
  }

  private createACK(messageControlId: string, acknowledgmentCode: string, textMessage: string): string {
    const timestamp = this.formatHL7Timestamp(new Date());
    
    return [
      `MSH|^~\\&|MediMate|MediMate Malaysia|${this.config.host}|${this.config.host}|${timestamp}||ACK^A01^ACK|${messageControlId}|P|2.5`,
      `MSA|${acknowledgmentCode}|${messageControlId}|${textMessage}`
    ].join('\r');
  }

  private createNAK(messageControlId: string, acknowledgmentCode: string, errorMessage: string): string {
    const timestamp = this.formatHL7Timestamp(new Date());
    
    return [
      `MSH|^~\\&|MediMate|MediMate Malaysia|${this.config.host}|${this.config.host}|${timestamp}||ACK^A01^ACK|${messageControlId || uuidv4()}|P|2.5`,
      `MSA|${acknowledgmentCode}|${messageControlId}|${errorMessage}`,
      `ERR|||207^Application Internal Error^HL70357||E|||${errorMessage}`
    ].join('\r');
  }

  private formatHL7Timestamp(date: Date): string {
    return date.toISOString().replace(/[-:T]/g, '').substring(0, 14);
  }

  private mapHL7GenderToFHIR(hl7Gender: string): 'male' | 'female' | 'other' | 'unknown' {
    switch (hl7Gender?.toUpperCase()) {
      case 'M': return 'male';
      case 'F': return 'female';
      case 'O': return 'other';
      default: return 'unknown';
    }
  }

  private mapHL7EncounterStatus(messageType: string): 'planned' | 'arrived' | 'triaged' | 'in-progress' | 'onleave' | 'finished' | 'cancelled' {
    switch (messageType) {
      case 'ADT^A01': // Admit
      case 'ADT^A04': // Register
        return 'arrived';
      case 'ADT^A02': // Transfer
        return 'in-progress';
      case 'ADT^A03': // Discharge
        return 'finished';
      case 'ADT^A08': // Update
        return 'in-progress';
      case 'ADT^A11': // Cancel admit
      case 'ADT^A12': // Cancel transfer
      case 'ADT^A13': // Cancel discharge
        return 'cancelled';
      default:
        return 'in-progress';
    }
  }

  private mapHL7EncounterClass(hl7Class: string): string {
    switch (hl7Class?.toUpperCase()) {
      case 'I': return 'IMP'; // Inpatient
      case 'O': return 'AMB'; // Outpatient/Ambulatory
      case 'A': return 'AMB'; // Ambulatory
      case 'E': return 'EMER'; // Emergency
      default: return 'AMB';
    }
  }

  private getEncounterClassDisplay(hl7Class: string): string {
    switch (hl7Class?.toUpperCase()) {
      case 'I': return 'Inpatient';
      case 'O': return 'Outpatient';
      case 'A': return 'Ambulatory';
      case 'E': return 'Emergency';
      default: return 'Ambulatory';
    }
  }

  private async getFacilityConnection(facilityCode: string): Promise<HL7v2Connection | null> {
    try {
      const connection = this.db.getConnection();
      const facility = await connection.oneOrNone(
        'SELECT * FROM hl7v2_connections WHERE facility_code = $1 AND is_active = true',
        [facilityCode]
      );

      if (facility) {
        return {
          id: facility.id,
          facilityCode: facility.facility_code,
          facilityName: facility.facility_name,
          host: facility.host,
          port: facility.port,
          isActive: facility.is_active,
          lastActivity: facility.last_activity,
          messageCount: facility.message_count
        };
      }

      return null;
    } catch (error) {
      console.error('Failed to get facility connection:', error);
      return null;
    }
  }

  private async storeIncomingMessage(connectionId: string, message: HL7v2Message): Promise<void> {
    try {
      const connection = this.db.getConnection();
      await connection.none(
        `INSERT INTO hl7v2_messages (
          id, connection_id, message_type, message_control_id, 
          sending_application, sending_facility, receiving_application, 
          receiving_facility, timestamp, raw_message, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
        [
          uuidv4(),
          connectionId,
          message.messageType,
          message.messageControlId,
          message.sendingApplication,
          message.sendingFacility,
          message.receivingApplication,
          message.receivingFacility,
          message.timestamp,
          message.raw
        ]
      );
    } catch (error) {
      console.error('Failed to store incoming HL7 v2.x message:', error);
    }
  }

  private async storeProcessingResult(connectionId: string, message: HL7v2Message, result: HL7v2ProcessingResult): Promise<void> {
    try {
      const connection = this.db.getConnection();
      await connection.none(
        `INSERT INTO hl7v2_processing_results (
          id, connection_id, message_control_id, message_type,
          success, processing_time, fhir_resources_created, 
          fhir_resources_updated, errors, warnings, acknowledgment, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())`,
        [
          uuidv4(),
          connectionId,
          message.messageControlId,
          message.messageType,
          result.success,
          result.processingTime,
          JSON.stringify(result.fhirResourcesCreated),
          JSON.stringify(result.fhirResourcesUpdated),
          JSON.stringify(result.errors),
          JSON.stringify(result.warnings),
          result.acknowledgment
        ]
      );
    } catch (error) {
      console.error('Failed to store HL7 v2.x processing result:', error);
    }
  }

  private async findExistingPatient(patient: MalaysianPatient): Promise<any> {
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
          // Continue searching
        }
      }
    }
    return null;
  }

  private async findExistingPractitioner(practitioner: MalaysianPractitioner): Promise<any> {
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
          // Continue searching
        }
      }
    }
    return null;
  }

  private async findExistingEncounter(encounter: MalaysianEncounter): Promise<any> {
    if (encounter.identifier) {
      for (const id of encounter.identifier) {
        try {
          const searchResult = await this.fhirService.searchResources('Encounter', {
            identifier: `${id.system}|${id.value}`
          });

          if (searchResult.entry && searchResult.entry.length > 0) {
            return searchResult.entry[0].resource;
          }
        } catch (error) {
          // Continue searching
        }
      }
    }
    return null;
  }
}

export default HL7v2LegacyService;