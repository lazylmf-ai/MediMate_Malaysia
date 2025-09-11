/**
 * FHIR Controller
 * 
 * Handles all FHIR R4 API endpoints with Malaysian healthcare profiles
 * Supports CREATE, READ, UPDATE, DELETE, and SEARCH operations
 * Includes proper authentication, authorization, and audit logging
 */

import { Request, Response } from 'express';
import { FHIRService } from '../../services/fhir/fhir.service';
import { MalaysianTerminologyService } from '../../services/terminology/malaysian-terminology.service';
import { MOHIntegrationService } from '../../services/integration/moh-integration.service';
import { AuditService } from '../../services/audit/auditService';
import { FHIRSearchParameters } from '../../types/fhir/fhir-operations';
import { OperationOutcome } from 'fhir/r4';

export class FHIRController {
  private fhirService: FHIRService;
  private terminologyService: MalaysianTerminologyService;
  private mohService: MOHIntegrationService;
  private auditService: AuditService;

  constructor() {
    this.fhirService = FHIRService.getInstance();
    this.terminologyService = MalaysianTerminologyService.getInstance();
    this.mohService = MOHIntegrationService.getInstance();
    this.auditService = AuditService.getInstance();
  }

  /**
   * GET /fhir/metadata - FHIR Capability Statement
   */
  public getCapabilityStatement = async (req: Request, res: Response): Promise<void> => {
    try {
      const capabilityStatement = this.fhirService.getCapabilityStatement();
      
      res.set({
        'Content-Type': 'application/fhir+json',
        'Cache-Control': 'public, max-age=3600' // Cache for 1 hour
      });

      res.status(200).json(capabilityStatement);

      // Audit log
      await this.auditService.logDataAccess(
        req.user?.id || 'anonymous',
        'CapabilityStatement',
        'metadata',
        'read',
        true,
        req.ip,
        req.get('User-Agent')
      );

    } catch (error) {
      console.error('FHIR capability statement error:', error);
      const operationOutcome = this.createOperationOutcome(
        'error',
        'exception',
        error instanceof Error ? error.message : 'Unknown error'
      );
      res.status(500).json(operationOutcome);
    }
  };

  /**
   * POST /fhir/{resourceType} - Create FHIR Resource
   */
  public createResource = async (req: Request, res: Response): Promise<void> => {
    try {
      const { resourceType } = req.params;
      const resource = req.body;

      // Validate resource type
      if (!this.isValidResourceType(resourceType)) {
        const operationOutcome = this.createOperationOutcome(
          'error',
          'not-supported',
          `Resource type '${resourceType}' is not supported`
        );
        res.status(400).json(operationOutcome);
        return;
      }

      // Ensure resource type matches URL
      if (resource.resourceType !== resourceType) {
        const operationOutcome = this.createOperationOutcome(
          'error',
          'invalid',
          'Resource type in body must match URL path'
        );
        res.status(400).json(operationOutcome);
        return;
      }

      // Create resource
      const createdResource = await this.fhirService.createResource(resourceType, resource);

      // Submit to MOH if required for certain resource types
      if (this.shouldSubmitToMOH(resourceType)) {
        try {
          await this.submitResourceToMOH(resourceType, createdResource);
        } catch (mohError) {
          console.warn('MOH submission warning:', mohError);
          // Continue - don't fail the creation for MOH submission issues
        }
      }

      res.set({
        'Content-Type': 'application/fhir+json',
        'Location': `/fhir/${resourceType}/${createdResource.id}`,
        'ETag': `W/"${createdResource.meta.versionId}"`
      });

      res.status(201).json(createdResource);

      // Audit log
      await this.auditService.logDataAccess(
        req.user?.id || 'anonymous',
        resourceType,
        createdResource.id,
        'create',
        true,
        req.ip,
        req.get('User-Agent'),
        { resourceSize: JSON.stringify(resource).length }
      );

    } catch (error) {
      console.error('FHIR create resource error:', error);
      const operationOutcome = this.createOperationOutcome(
        'error',
        'exception',
        error instanceof Error ? error.message : 'Unknown error'
      );
      res.status(400).json(operationOutcome);

      // Audit log for failed attempt
      await this.auditService.logDataAccess(
        req.user?.id || 'anonymous',
        req.params.resourceType,
        'unknown',
        'create',
        false,
        req.ip,
        req.get('User-Agent'),
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  };

  /**
   * GET /fhir/{resourceType}/{id} - Read FHIR Resource
   */
  public readResource = async (req: Request, res: Response): Promise<void> => {
    try {
      const { resourceType, id } = req.params;

      // Validate resource type
      if (!this.isValidResourceType(resourceType)) {
        const operationOutcome = this.createOperationOutcome(
          'error',
          'not-supported',
          `Resource type '${resourceType}' is not supported`
        );
        res.status(404).json(operationOutcome);
        return;
      }

      const resource = await this.fhirService.readResource(resourceType, id);

      res.set({
        'Content-Type': 'application/fhir+json',
        'ETag': `W/"${resource.meta?.versionId || '1'}"`
      });

      res.status(200).json(resource);

      // Audit log
      await this.auditService.logDataAccess(
        req.user?.id || 'anonymous',
        resourceType,
        id,
        'read',
        true,
        req.ip,
        req.get('User-Agent')
      );

    } catch (error) {
      console.error('FHIR read resource error:', error);
      
      if (error instanceof Error && error.message.includes('not found')) {
        const operationOutcome = this.createOperationOutcome(
          'error',
          'not-found',
          `Resource ${req.params.resourceType}/${req.params.id} not found`
        );
        res.status(404).json(operationOutcome);
      } else {
        const operationOutcome = this.createOperationOutcome(
          'error',
          'exception',
          error instanceof Error ? error.message : 'Unknown error'
        );
        res.status(500).json(operationOutcome);
      }

      // Audit log for failed attempt
      await this.auditService.logDataAccess(
        req.user?.id || 'anonymous',
        req.params.resourceType,
        req.params.id,
        'read',
        false,
        req.ip,
        req.get('User-Agent'),
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  };

  /**
   * PUT /fhir/{resourceType}/{id} - Update FHIR Resource
   */
  public updateResource = async (req: Request, res: Response): Promise<void> => {
    try {
      const { resourceType, id } = req.params;
      const resource = req.body;

      // Validate resource type
      if (!this.isValidResourceType(resourceType)) {
        const operationOutcome = this.createOperationOutcome(
          'error',
          'not-supported',
          `Resource type '${resourceType}' is not supported`
        );
        res.status(404).json(operationOutcome);
        return;
      }

      // Ensure resource type and ID match URL
      if (resource.resourceType !== resourceType || resource.id !== id) {
        const operationOutcome = this.createOperationOutcome(
          'error',
          'invalid',
          'Resource type and ID in body must match URL path'
        );
        res.status(400).json(operationOutcome);
        return;
      }

      // Check If-Match header for optimistic locking
      const ifMatch = req.get('If-Match');
      if (ifMatch) {
        const existingResource = await this.fhirService.readResource(resourceType, id);
        if (ifMatch !== `W/"${existingResource.meta?.versionId}"`) {
          const operationOutcome = this.createOperationOutcome(
            'error',
            'conflict',
            'Resource has been modified by another user'
          );
          res.status(409).json(operationOutcome);
          return;
        }
      }

      const updatedResource = await this.fhirService.updateResource(resourceType, id, resource);

      // Submit to MOH if required
      if (this.shouldSubmitToMOH(resourceType)) {
        try {
          await this.submitResourceToMOH(resourceType, updatedResource);
        } catch (mohError) {
          console.warn('MOH submission warning:', mohError);
        }
      }

      res.set({
        'Content-Type': 'application/fhir+json',
        'Location': `/fhir/${resourceType}/${updatedResource.id}`,
        'ETag': `W/"${updatedResource.meta.versionId}"`
      });

      res.status(200).json(updatedResource);

      // Audit log
      await this.auditService.logDataAccess(
        req.user?.id || 'anonymous',
        resourceType,
        id,
        'update',
        true,
        req.ip,
        req.get('User-Agent'),
        { 
          previousVersion: ifMatch?.replace(/W\/"|"/g, ''),
          newVersion: updatedResource.meta.versionId
        }
      );

    } catch (error) {
      console.error('FHIR update resource error:', error);
      
      if (error instanceof Error && error.message.includes('not found')) {
        const operationOutcome = this.createOperationOutcome(
          'error',
          'not-found',
          `Resource ${req.params.resourceType}/${req.params.id} not found`
        );
        res.status(404).json(operationOutcome);
      } else {
        const operationOutcome = this.createOperationOutcome(
          'error',
          'exception',
          error instanceof Error ? error.message : 'Unknown error'
        );
        res.status(400).json(operationOutcome);
      }

      // Audit log for failed attempt
      await this.auditService.logDataAccess(
        req.user?.id || 'anonymous',
        req.params.resourceType,
        req.params.id,
        'update',
        false,
        req.ip,
        req.get('User-Agent'),
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  };

  /**
   * DELETE /fhir/{resourceType}/{id} - Delete FHIR Resource
   */
  public deleteResource = async (req: Request, res: Response): Promise<void> => {
    try {
      const { resourceType, id } = req.params;

      // Validate resource type
      if (!this.isValidResourceType(resourceType)) {
        const operationOutcome = this.createOperationOutcome(
          'error',
          'not-supported',
          `Resource type '${resourceType}' is not supported`
        );
        res.status(404).json(operationOutcome);
        return;
      }

      await this.fhirService.deleteResource(resourceType, id);

      res.status(204).send(); // No Content

      // Audit log
      await this.auditService.logDataAccess(
        req.user?.id || 'anonymous',
        resourceType,
        id,
        'delete',
        true,
        req.ip,
        req.get('User-Agent')
      );

    } catch (error) {
      console.error('FHIR delete resource error:', error);
      
      if (error instanceof Error && error.message.includes('not found')) {
        const operationOutcome = this.createOperationOutcome(
          'error',
          'not-found',
          `Resource ${req.params.resourceType}/${req.params.id} not found`
        );
        res.status(404).json(operationOutcome);
      } else {
        const operationOutcome = this.createOperationOutcome(
          'error',
          'exception',
          error instanceof Error ? error.message : 'Unknown error'
        );
        res.status(500).json(operationOutcome);
      }

      // Audit log for failed attempt
      await this.auditService.logDataAccess(
        req.user?.id || 'anonymous',
        req.params.resourceType,
        req.params.id,
        'delete',
        false,
        req.ip,
        req.get('User-Agent'),
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  };

  /**
   * GET /fhir/{resourceType} - Search FHIR Resources
   */
  public searchResources = async (req: Request, res: Response): Promise<void> => {
    try {
      const { resourceType } = req.params;
      
      // Validate resource type
      if (!this.isValidResourceType(resourceType)) {
        const operationOutcome = this.createOperationOutcome(
          'error',
          'not-supported',
          `Resource type '${resourceType}' is not supported`
        );
        res.status(404).json(operationOutcome);
        return;
      }

      // Convert query parameters to FHIR search parameters
      const searchParams: FHIRSearchParameters = this.parseSearchParameters(req.query);

      const bundle = await this.fhirService.searchResources(resourceType, searchParams);

      res.set({
        'Content-Type': 'application/fhir+json'
      });

      res.status(200).json(bundle);

      // Audit log
      await this.auditService.logDataAccess(
        req.user?.id || 'anonymous',
        resourceType,
        'search',
        'search',
        true,
        req.ip,
        req.get('User-Agent'),
        { 
          searchParams: JSON.stringify(searchParams),
          resultCount: bundle.entry?.length || 0
        }
      );

    } catch (error) {
      console.error('FHIR search resources error:', error);
      const operationOutcome = this.createOperationOutcome(
        'error',
        'exception',
        error instanceof Error ? error.message : 'Unknown error'
      );
      res.status(400).json(operationOutcome);

      // Audit log for failed attempt
      await this.auditService.logDataAccess(
        req.user?.id || 'anonymous',
        req.params.resourceType,
        'search',
        'search',
        false,
        req.ip,
        req.get('User-Agent'),
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  };

  /**
   * GET /fhir/{resourceType}/{id}/_history - Get Resource History
   */
  public getResourceHistory = async (req: Request, res: Response): Promise<void> => {
    try {
      const { resourceType, id } = req.params;

      // Validate resource type
      if (!this.isValidResourceType(resourceType)) {
        const operationOutcome = this.createOperationOutcome(
          'error',
          'not-supported',
          `Resource type '${resourceType}' is not supported`
        );
        res.status(404).json(operationOutcome);
        return;
      }

      // This would be implemented in FHIRService
      const historyBundle = {
        resourceType: 'Bundle',
        type: 'history',
        id: `${resourceType}-${id}-history`,
        meta: {
          lastUpdated: new Date().toISOString()
        },
        entry: [
          // Would contain historical versions
        ]
      };

      res.set({
        'Content-Type': 'application/fhir+json'
      });

      res.status(200).json(historyBundle);

      // Audit log
      await this.auditService.logDataAccess(
        req.user?.id || 'anonymous',
        resourceType,
        id,
        'history',
        true,
        req.ip,
        req.get('User-Agent')
      );

    } catch (error) {
      console.error('FHIR resource history error:', error);
      const operationOutcome = this.createOperationOutcome(
        'error',
        'exception',
        error instanceof Error ? error.message : 'Unknown error'
      );
      res.status(500).json(operationOutcome);
    }
  };

  /**
   * POST /fhir/$validate - Validate FHIR Resource
   */
  public validateResource = async (req: Request, res: Response): Promise<void> => {
    try {
      const resource = req.body;
      const profile = req.query.profile as string;

      if (!resource || !resource.resourceType) {
        const operationOutcome = this.createOperationOutcome(
          'error',
          'required',
          'Resource is required for validation'
        );
        res.status(400).json(operationOutcome);
        return;
      }

      const validationResult = await this.fhirService.validateResource(resource, profile);

      res.set({
        'Content-Type': 'application/fhir+json'
      });

      res.status(200).json(validationResult.operationOutcome || this.createOperationOutcome(
        'information',
        'informational',
        'Resource is valid'
      ));

      // Audit log
      await this.auditService.logDataAccess(
        req.user?.id || 'anonymous',
        resource.resourceType,
        'validation',
        'validate',
        validationResult.isValid,
        req.ip,
        req.get('User-Agent'),
        { 
          profile,
          errorCount: validationResult.errors.length,
          warningCount: validationResult.warnings.length
        }
      );

    } catch (error) {
      console.error('FHIR validation error:', error);
      const operationOutcome = this.createOperationOutcome(
        'error',
        'exception',
        error instanceof Error ? error.message : 'Unknown error'
      );
      res.status(400).json(operationOutcome);
    }
  };

  private isValidResourceType(resourceType: string): boolean {
    const supportedResourceTypes = [
      'Patient', 'Practitioner', 'Organization', 'Encounter',
      'Observation', 'DiagnosticReport', 'MedicationRequest',
      'AllergyIntolerance', 'Condition', 'Procedure',
      'ImagingStudy', 'ServiceRequest', 'Immunization',
      'Coverage', 'Claim', 'ExplanationOfBenefit'
    ];

    return supportedResourceTypes.includes(resourceType);
  }

  private parseSearchParameters(query: any): FHIRSearchParameters {
    const searchParams: FHIRSearchParameters = {};

    Object.keys(query).forEach(key => {
      const value = query[key];
      
      // Handle special search parameters
      if (key.startsWith('_')) {
        switch (key) {
          case '_count':
            searchParams._count = parseInt(value);
            break;
          case '_offset':
            searchParams._offset = parseInt(value);
            break;
          case '_sort':
            searchParams._sort = value;
            break;
          case '_include':
            searchParams._include = Array.isArray(value) ? value : [value];
            break;
          case '_revinclude':
            searchParams._revinclude = Array.isArray(value) ? value : [value];
            break;
          case '_elements':
            searchParams._elements = Array.isArray(value) ? value : [value];
            break;
          case '_summary':
            searchParams._summary = value;
            break;
          case '_format':
            searchParams._format = value;
            break;
          case '_pretty':
            searchParams._pretty = value === 'true';
            break;
          case '_lastUpdated':
            searchParams._lastUpdated = value;
            break;
          default:
            searchParams[key] = value;
        }
      } else {
        // Regular search parameters
        searchParams[key] = value;
      }
    });

    return searchParams;
  }

  private createOperationOutcome(severity: 'fatal' | 'error' | 'warning' | 'information', code: string, details: string): OperationOutcome {
    return {
      resourceType: 'OperationOutcome',
      issue: [{
        severity,
        code,
        details: {
          text: details
        }
      }]
    };
  }

  private shouldSubmitToMOH(resourceType: string): boolean {
    // Determine which resources should be submitted to MOH
    const mohResourceTypes = ['Patient', 'Encounter', 'Immunization', 'DiagnosticReport'];
    return mohResourceTypes.includes(resourceType);
  }

  private async submitResourceToMOH(resourceType: string, resource: any): Promise<void> {
    const facilityCode = process.env.FACILITY_CODE || 'DEFAULT_FACILITY';
    
    switch (resourceType) {
      case 'Patient':
        await this.mohService.submitPatientRegistration(resource, facilityCode);
        break;
      case 'Encounter':
        await this.mohService.submitEncounterData(resource.id, facilityCode);
        break;
      default:
        console.log(`MOH submission not configured for resource type: ${resourceType}`);
    }
  }
}

export default FHIRController;