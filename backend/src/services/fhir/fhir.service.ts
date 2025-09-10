/**
 * FHIR Service
 * 
 * Core FHIR R4 implementation with Malaysian healthcare profiles
 * Provides FHIR resource management, validation, and operations
 */

import { 
  Patient, 
  Practitioner, 
  Organization, 
  Encounter,
  Bundle,
  OperationOutcome 
} from 'fhir/r4';
import { validate } from 'fhir';
import { DatabaseService } from '../database/databaseService';
import { 
  MalaysianPatient, 
  MalaysianPractitioner, 
  MalaysianOrganization, 
  MalaysianEncounter,
  MALAYSIAN_FHIR_SYSTEMS 
} from '../../types/fhir/malaysian-profiles';
import {
  FHIRSearchParameters,
  FHIRBundleResponse,
  FHIRValidationResult,
  FHIRValidationError,
  FHIRValidationWarning
} from '../../types/fhir/fhir-operations';
import { v4 as uuidv4 } from 'uuid';

export class FHIRService {
  private static instance: FHIRService;
  private db: DatabaseService;

  constructor() {
    this.db = DatabaseService.getInstance();
  }

  public static getInstance(): FHIRService {
    if (!FHIRService.instance) {
      FHIRService.instance = new FHIRService();
    }
    return FHIRService.instance;
  }

  /**
   * Validate FHIR resource against R4 specification and Malaysian profiles
   */
  public async validateResource(resource: any, profileUrl?: string): Promise<FHIRValidationResult> {
    const errors: FHIRValidationError[] = [];
    const warnings: FHIRValidationWarning[] = [];

    try {
      // Basic FHIR R4 validation
      const fhirValidation = validate(resource);
      
      if (!fhirValidation.valid) {
        fhirValidation.issues.forEach(issue => {
          if (issue.severity === 'error' || issue.severity === 'fatal') {
            errors.push({
              severity: issue.severity as 'fatal' | 'error',
              code: issue.code || 'validation-error',
              details: issue.diagnostics || 'FHIR validation failed',
              location: issue.location?.[0],
              expression: issue.expression
            });
          } else {
            warnings.push({
              severity: issue.severity as 'warning' | 'information',
              code: issue.code || 'validation-warning',
              details: issue.diagnostics || 'FHIR validation warning',
              location: issue.location?.[0],
              expression: issue.expression
            });
          }
        });
      }

      // Malaysian-specific validation
      await this.validateMalaysianProfile(resource, errors, warnings);

      const operationOutcome: OperationOutcome = {
        resourceType: 'OperationOutcome',
        issue: [
          ...errors.map(error => ({
            severity: error.severity,
            code: error.code,
            details: { text: error.details },
            location: error.location ? [error.location] : undefined,
            expression: error.expression
          })),
          ...warnings.map(warning => ({
            severity: warning.severity,
            code: warning.code,
            details: { text: warning.details },
            location: warning.location ? [warning.location] : undefined,
            expression: warning.expression
          }))
        ]
      };

      return {
        isValid: errors.length === 0,
        operationOutcome: operationOutcome.issue.length > 0 ? operationOutcome : undefined,
        errors,
        warnings
      };

    } catch (error) {
      errors.push({
        severity: 'error',
        code: 'exception',
        details: `Validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      });

      return {
        isValid: false,
        errors,
        warnings
      };
    }
  }

  /**
   * Create a new FHIR resource
   */
  public async createResource(resourceType: string, resource: any): Promise<any> {
    // Validate resource first
    const validation = await this.validateResource(resource);
    if (!validation.isValid) {
      throw new Error(`Resource validation failed: ${validation.errors.map(e => e.details).join(', ')}`);
    }

    // Generate ID if not provided
    if (!resource.id) {
      resource.id = uuidv4();
    }

    // Add metadata
    resource.meta = {
      ...resource.meta,
      versionId: '1',
      lastUpdated: new Date().toISOString(),
      profile: this.getMalaysianProfileUrl(resourceType)
    };

    try {
      const connection = this.db.getConnection();
      
      // Store in database
      const result = await connection.one(
        'INSERT INTO fhir_resources (id, resource_type, resource_data, version_id, last_updated) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [resource.id, resourceType, JSON.stringify(resource), resource.meta.versionId, resource.meta.lastUpdated]
      );

      return resource;
    } catch (error) {
      throw new Error(`Failed to create resource: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Read a FHIR resource by ID
   */
  public async readResource(resourceType: string, id: string): Promise<any> {
    try {
      const connection = this.db.getConnection();
      
      const result = await connection.oneOrNone(
        'SELECT resource_data FROM fhir_resources WHERE id = $1 AND resource_type = $2 AND is_deleted = false',
        [id, resourceType]
      );

      if (!result) {
        throw new Error(`Resource ${resourceType}/${id} not found`);
      }

      return result.resource_data;
    } catch (error) {
      throw new Error(`Failed to read resource: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update a FHIR resource
   */
  public async updateResource(resourceType: string, id: string, resource: any): Promise<any> {
    // Validate resource first
    const validation = await this.validateResource(resource);
    if (!validation.isValid) {
      throw new Error(`Resource validation failed: ${validation.errors.map(e => e.details).join(', ')}`);
    }

    // Ensure ID matches
    resource.id = id;

    try {
      const connection = this.db.getConnection();
      
      // Get current version
      const current = await connection.oneOrNone(
        'SELECT version_id FROM fhir_resources WHERE id = $1 AND resource_type = $2 AND is_deleted = false',
        [id, resourceType]
      );

      if (!current) {
        throw new Error(`Resource ${resourceType}/${id} not found`);
      }

      // Increment version
      const newVersionId = (parseInt(current.version_id) + 1).toString();
      
      // Update metadata
      resource.meta = {
        ...resource.meta,
        versionId: newVersionId,
        lastUpdated: new Date().toISOString(),
        profile: this.getMalaysianProfileUrl(resourceType)
      };

      // Store updated resource
      await connection.none(
        'UPDATE fhir_resources SET resource_data = $1, version_id = $2, last_updated = $3 WHERE id = $4 AND resource_type = $5',
        [JSON.stringify(resource), newVersionId, resource.meta.lastUpdated, id, resourceType]
      );

      return resource;
    } catch (error) {
      throw new Error(`Failed to update resource: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Delete a FHIR resource (soft delete)
   */
  public async deleteResource(resourceType: string, id: string): Promise<void> {
    try {
      const connection = this.db.getConnection();
      
      const result = await connection.result(
        'UPDATE fhir_resources SET is_deleted = true, deleted_at = NOW() WHERE id = $1 AND resource_type = $2 AND is_deleted = false',
        [id, resourceType]
      );

      if (result.rowCount === 0) {
        throw new Error(`Resource ${resourceType}/${id} not found`);
      }
    } catch (error) {
      throw new Error(`Failed to delete resource: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Search FHIR resources
   */
  public async searchResources(resourceType: string, searchParams: FHIRSearchParameters): Promise<FHIRBundleResponse> {
    try {
      const connection = this.db.getConnection();
      
      // Build search query
      const { query, params } = this.buildSearchQuery(resourceType, searchParams);
      
      // Execute search
      const results = await connection.manyOrNone(query, params);
      
      // Build bundle response
      const bundle: FHIRBundleResponse = {
        resourceType: 'Bundle',
        id: uuidv4(),
        type: 'searchset',
        total: results.length,
        entry: results.map(result => ({
          fullUrl: `${process.env.FHIR_BASE_URL || 'https://fhir.medimate.my'}/${resourceType}/${result.resource_data.id}`,
          resource: result.resource_data,
          search: {
            mode: 'match'
          }
        })),
        meta: {
          lastUpdated: new Date().toISOString()
        }
      };

      // Add pagination links if needed
      if (searchParams._count && searchParams._offset !== undefined) {
        bundle.link = this.buildPaginationLinks(resourceType, searchParams, results.length);
      }

      return bundle;
    } catch (error) {
      throw new Error(`Failed to search resources: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get FHIR capability statement
   */
  public getCapabilityStatement(): any {
    return {
      resourceType: 'CapabilityStatement',
      id: 'medimate-malaysia-fhir-server',
      url: `${process.env.FHIR_BASE_URL || 'https://fhir.medimate.my'}/metadata`,
      version: '1.0.0',
      name: 'MediMateMalaysiaFHIRServer',
      title: 'MediMate Malaysia FHIR R4 Server',
      status: 'active',
      date: new Date().toISOString(),
      publisher: 'MediMate Malaysia',
      description: 'FHIR R4 server with Malaysian healthcare profiles for interoperability',
      kind: 'instance',
      implementation: {
        description: 'MediMate Malaysia FHIR Server with Malaysian healthcare integration',
        url: process.env.FHIR_BASE_URL || 'https://fhir.medimate.my'
      },
      fhirVersion: '4.0.1',
      format: ['json', 'xml'],
      patchFormat: ['application/json-patch+json'],
      rest: [{
        mode: 'server',
        security: {
          cors: true,
          service: [{
            coding: [{
              system: 'http://terminology.hl7.org/CodeSystem/restful-security-service',
              code: 'OAuth',
              display: 'OAuth2'
            }]
          }]
        },
        resource: [
          this.getResourceCapability('Patient'),
          this.getResourceCapability('Practitioner'),
          this.getResourceCapability('Organization'),
          this.getResourceCapability('Encounter'),
          this.getResourceCapability('Observation'),
          this.getResourceCapability('DiagnosticReport'),
          this.getResourceCapability('MedicationRequest'),
          this.getResourceCapability('AllergyIntolerance')
        ]
      }]
    };
  }

  /**
   * Malaysian-specific validation
   */
  private async validateMalaysianProfile(resource: any, errors: FHIRValidationError[], warnings: FHIRValidationWarning[]): Promise<void> {
    const resourceType = resource.resourceType;

    switch (resourceType) {
      case 'Patient':
        this.validateMalaysianPatient(resource as MalaysianPatient, errors, warnings);
        break;
      case 'Practitioner':
        this.validateMalaysianPractitioner(resource as MalaysianPractitioner, errors, warnings);
        break;
      case 'Organization':
        this.validateMalaysianOrganization(resource as MalaysianOrganization, errors, warnings);
        break;
      case 'Encounter':
        this.validateMalaysianEncounter(resource as MalaysianEncounter, errors, warnings);
        break;
    }
  }

  private validateMalaysianPatient(patient: MalaysianPatient, errors: FHIRValidationError[], warnings: FHIRValidationWarning[]): void {
    // Validate Malaysian identifiers
    if (patient.identifier) {
      patient.identifier.forEach((id, index) => {
        if (id.system && Object.values(MALAYSIAN_FHIR_SYSTEMS.PATIENT_IDENTIFIERS).includes(id.system)) {
          if (id.system === MALAYSIAN_FHIR_SYSTEMS.PATIENT_IDENTIFIERS.MYKAD) {
            if (!this.validateMyKadNumber(id.value)) {
              errors.push({
                severity: 'error',
                code: 'invalid-identifier',
                details: `Invalid MyKad number format: ${id.value}`,
                location: `Patient.identifier[${index}].value`
              });
            }
          }
        }
      });
    }

    // Validate Malaysian address format
    if (patient.address) {
      patient.address.forEach((addr, index) => {
        if (addr.state && !this.isValidMalaysianState(addr.state)) {
          warnings.push({
            severity: 'warning',
            code: 'invalid-state',
            details: `Unrecognized Malaysian state: ${addr.state}`,
            location: `Patient.address[${index}].state`
          });
        }
      });
    }
  }

  private validateMalaysianPractitioner(practitioner: MalaysianPractitioner, errors: FHIRValidationError[], warnings: FHIRValidationWarning[]): void {
    // Validate Malaysian medical licenses
    if (practitioner.identifier) {
      practitioner.identifier.forEach((id, index) => {
        if (id.system && Object.values(MALAYSIAN_FHIR_SYSTEMS.PRACTITIONER_IDENTIFIERS).includes(id.system)) {
          if (!id.value || id.value.length === 0) {
            errors.push({
              severity: 'error',
              code: 'missing-identifier',
              details: 'Malaysian practitioner identifier value is required',
              location: `Practitioner.identifier[${index}].value`
            });
          }
        }
      });
    }
  }

  private validateMalaysianOrganization(organization: MalaysianOrganization, errors: FHIRValidationError[], warnings: FHIRValidationWarning[]): void {
    // Validate Malaysian facility codes
    if (organization.identifier) {
      organization.identifier.forEach((id, index) => {
        if (id.system && Object.values(MALAYSIAN_FHIR_SYSTEMS.ORGANIZATION_IDENTIFIERS).includes(id.system)) {
          if (!id.value || id.value.length === 0) {
            errors.push({
              severity: 'error',
              code: 'missing-identifier',
              details: 'Malaysian organization identifier value is required',
              location: `Organization.identifier[${index}].value`
            });
          }
        }
      });
    }
  }

  private validateMalaysianEncounter(encounter: MalaysianEncounter, errors: FHIRValidationError[], warnings: FHIRValidationWarning[]): void {
    // Validate encounter class
    if (encounter.class && !encounter.class.system) {
      warnings.push({
        severity: 'warning',
        code: 'missing-system',
        details: 'Encounter class should include system URI',
        location: 'Encounter.class.system'
      });
    }
  }

  private validateMyKadNumber(myKadNumber: string): boolean {
    // MyKad format: YYMMDD-PB-XXXX
    const myKadRegex = /^\d{6}-\d{2}-\d{4}$/;
    return myKadRegex.test(myKadNumber);
  }

  private isValidMalaysianState(state: string): boolean {
    const malaysianStates = [
      'Johor', 'Kedah', 'Kelantan', 'Malacca', 'Negeri Sembilan', 'Pahang',
      'Penang', 'Perak', 'Perlis', 'Sabah', 'Sarawak', 'Selangor', 'Terengganu',
      'Kuala Lumpur', 'Labuan', 'Putrajaya'
    ];
    return malaysianStates.includes(state);
  }

  private getMalaysianProfileUrl(resourceType: string): string[] {
    const baseUrl = 'https://fhir.moh.gov.my/StructureDefinition';
    return [`${baseUrl}/Malaysian${resourceType}`];
  }

  private buildSearchQuery(resourceType: string, searchParams: FHIRSearchParameters): { query: string; params: any[] } {
    let query = 'SELECT resource_data FROM fhir_resources WHERE resource_type = $1 AND is_deleted = false';
    const params: any[] = [resourceType];
    let paramIndex = 2;

    // Add search parameters
    const conditions: string[] = [];
    
    // Handle common search parameters
    if (searchParams._lastUpdated) {
      conditions.push(`last_updated >= $${paramIndex}`);
      params.push(searchParams._lastUpdated);
      paramIndex++;
    }

    if (conditions.length > 0) {
      query += ' AND ' + conditions.join(' AND ');
    }

    // Add ordering
    if (searchParams._sort) {
      // Simple implementation - can be enhanced
      query += ' ORDER BY last_updated DESC';
    } else {
      query += ' ORDER BY last_updated DESC';
    }

    // Add pagination
    if (searchParams._count) {
      query += ` LIMIT $${paramIndex}`;
      params.push(searchParams._count);
      paramIndex++;
    }

    if (searchParams._offset) {
      query += ` OFFSET $${paramIndex}`;
      params.push(searchParams._offset);
      paramIndex++;
    }

    return { query, params };
  }

  private buildPaginationLinks(resourceType: string, searchParams: FHIRSearchParameters, resultCount: number): any[] {
    const links: any[] = [];
    const baseUrl = process.env.FHIR_BASE_URL || 'https://fhir.medimate.my';
    const count = searchParams._count || 20;
    const offset = searchParams._offset || 0;

    // Self link
    links.push({
      relation: 'self',
      url: `${baseUrl}/${resourceType}?_count=${count}&_offset=${offset}`
    });

    // Previous link
    if (offset > 0) {
      const prevOffset = Math.max(0, offset - count);
      links.push({
        relation: 'previous',
        url: `${baseUrl}/${resourceType}?_count=${count}&_offset=${prevOffset}`
      });
    }

    // Next link
    if (resultCount === count) {
      const nextOffset = offset + count;
      links.push({
        relation: 'next',
        url: `${baseUrl}/${resourceType}?_count=${count}&_offset=${nextOffset}`
      });
    }

    return links;
  }

  private getResourceCapability(resourceType: string): any {
    return {
      type: resourceType,
      profile: `https://fhir.moh.gov.my/StructureDefinition/Malaysian${resourceType}`,
      interaction: [
        { code: 'read' },
        { code: 'create' },
        { code: 'update' },
        { code: 'delete' },
        { code: 'search-type' }
      ],
      searchParam: this.getSearchParameters(resourceType)
    };
  }

  private getSearchParameters(resourceType: string): any[] {
    const commonParams = [
      { name: '_id', type: 'token', documentation: 'Logical id of this artifact' },
      { name: '_lastUpdated', type: 'date', documentation: 'When the resource was last updated' }
    ];

    switch (resourceType) {
      case 'Patient':
        return [
          ...commonParams,
          { name: 'identifier', type: 'token', documentation: 'A patient identifier' },
          { name: 'name', type: 'string', documentation: 'A server defined search that may match any of the string fields in the HumanName' },
          { name: 'birthdate', type: 'date', documentation: 'The patient\'s date of birth' },
          { name: 'gender', type: 'token', documentation: 'Gender of the patient' }
        ];
      case 'Practitioner':
        return [
          ...commonParams,
          { name: 'identifier', type: 'token', documentation: 'A practitioner identifier' },
          { name: 'name', type: 'string', documentation: 'A server defined search that may match any of the string fields in the HumanName' }
        ];
      default:
        return commonParams;
    }
  }
}

export default FHIRService;