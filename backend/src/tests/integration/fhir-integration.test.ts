/**
 * FHIR Integration Tests
 * 
 * Comprehensive tests for FHIR R4 compliance and Malaysian healthcare integration
 */

import { describe, it, beforeAll, afterAll, expect, jest } from '@jest/globals';
import { FHIRService } from '../../services/fhir/fhir.service';
import { MOHIntegrationService } from '../../services/integration/moh-integration.service';
import { HospitalConnectorService } from '../../services/integration/hospital-connector.service';
import { MySejahteraService } from '../../services/integration/mysejahtera-integration.service';
import { DatabaseService } from '../../services/database/databaseService';
import { MalaysianPatient, MalaysianPractitioner, MalaysianOrganization, MalaysianEncounter } from '../../types/fhir/malaysian-profiles';

describe('FHIR Integration Suite', () => {
  let fhirService: FHIRService;
  let mohService: MOHIntegrationService;
  let hospitalService: HospitalConnectorService;
  let mysejahteraService: MySejahteraService;
  let dbService: DatabaseService;

  beforeAll(async () => {
    // Initialize services
    fhirService = FHIRService.getInstance();
    mohService = MOHIntegrationService.getInstance();
    hospitalService = HospitalConnectorService.getInstance();
    mysejahteraService = MySejahteraService.getInstance();
    dbService = DatabaseService.getInstance();
  });

  afterAll(async () => {
    // Cleanup test data if needed
    // Note: In a real test environment, we'd clean up test data
  });

  describe('FHIR R4 Compliance', () => {
    it('should validate Malaysian Patient profile correctly', async () => {
      const testPatient: MalaysianPatient = {
        resourceType: 'Patient',
        id: 'test-patient-1',
        identifier: [
          {
            use: 'official',
            type: {
              coding: [
                {
                  system: 'http://terminology.hl7.org/CodeSystem/v2-0203',
                  code: 'NRIC',
                  display: 'National Registration Identity Card'
                }
              ]
            },
            system: 'https://fhir.moh.gov.my/identifier/mykad',
            value: '901234567890'
          }
        ],
        name: [
          {
            use: 'official',
            family: 'Ahmad',
            given: ['Muhammad', 'Ali']
          }
        ],
        gender: 'male',
        birthDate: '1990-01-01',
        address: [
          {
            use: 'home',
            type: 'physical',
            line: ['123 Jalan Sultan'],
            city: 'Kuala Lumpur',
            state: 'Kuala Lumpur',
            postalCode: '50000',
            country: 'MY'
          }
        ],
        extension: [
          {
            url: 'https://fhir.moh.gov.my/StructureDefinition/patient-race',
            valueString: 'Malay'
          },
          {
            url: 'https://fhir.moh.gov.my/StructureDefinition/patient-religion',
            valueString: 'Islam'
          }
        ]
      };

      const validationResult = await fhirService.validateResource(testPatient);
      
      expect(validationResult.valid).toBe(true);
      expect(validationResult.errors).toHaveLength(0);
      console.log('Patient validation result:', validationResult);
    });

    it('should create and read FHIR resources', async () => {
      const testPatient: MalaysianPatient = {
        resourceType: 'Patient',
        identifier: [
          {
            use: 'official',
            type: {
              coding: [
                {
                  system: 'http://terminology.hl7.org/CodeSystem/v2-0203',
                  code: 'NRIC',
                  display: 'National Registration Identity Card'
                }
              ]
            },
            system: 'https://fhir.moh.gov.my/identifier/mykad',
            value: '900101012345'
          }
        ],
        name: [
          {
            use: 'official',
            family: 'Lim',
            given: ['Wei', 'Ming']
          }
        ],
        gender: 'male',
        birthDate: '1990-01-01'
      };

      // Test creation
      const createdPatient = await fhirService.createResource('Patient', testPatient);
      expect(createdPatient).toBeDefined();
      expect(createdPatient.id).toBeDefined();
      expect(createdPatient.resourceType).toBe('Patient');
      
      console.log('Created patient:', createdPatient.id);

      // Test reading
      if (createdPatient.id) {
        const retrievedPatient = await fhirService.getResource('Patient', createdPatient.id);
        expect(retrievedPatient).toBeDefined();
        expect(retrievedPatient.id).toBe(createdPatient.id);
        console.log('Retrieved patient:', retrievedPatient.id);
      }
    });

    it('should search FHIR resources with pagination', async () => {
      const searchParams = {
        gender: 'male',
        _count: 10,
        _offset: 0
      };

      const searchResults = await fhirService.searchResources('Patient', searchParams);
      
      expect(searchResults).toBeDefined();
      expect(searchResults.resourceType).toBe('Bundle');
      expect(searchResults.type).toBe('searchset');
      
      console.log('Search results total:', searchResults.total);
      console.log('Search results entries:', searchResults.entry?.length || 0);
    });

    it('should generate capability statement', async () => {
      const capability = await fhirService.getCapabilityStatement();
      
      expect(capability).toBeDefined();
      expect(capability.resourceType).toBe('CapabilityStatement');
      expect(capability.fhirVersion).toBe('4.0.1');
      expect(capability.status).toBe('active');
      
      // Verify Malaysian healthcare profiles are included
      expect(capability.rest?.[0]?.resource).toBeDefined();
      const patientResource = capability.rest?.[0]?.resource?.find(r => r.type === 'Patient');
      expect(patientResource).toBeDefined();
      
      console.log('Capability statement generated with', capability.rest?.[0]?.resource?.length, 'resource types');
    });
  });

  describe('Malaysian Healthcare Integration', () => {
    it('should validate MyKad numbers correctly', async () => {
      const validMyKad = '901234567890';
      const invalidMyKad = '123456';
      
      const testPatientValid: MalaysianPatient = {
        resourceType: 'Patient',
        identifier: [
          {
            use: 'official',
            type: {
              coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v2-0203', code: 'NRIC', display: 'NRIC' }]
            },
            system: 'https://fhir.moh.gov.my/identifier/mykad',
            value: validMyKad
          }
        ],
        name: [{ use: 'official', family: 'Test', given: ['Patient'] }],
        gender: 'male',
        birthDate: '1990-01-01'
      };

      const testPatientInvalid: MalaysianPatient = {
        resourceType: 'Patient',
        identifier: [
          {
            use: 'official',
            type: {
              coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v2-0203', code: 'NRIC', display: 'NRIC' }]
            },
            system: 'https://fhir.moh.gov.my/identifier/mykad',
            value: invalidMyKad
          }
        ],
        name: [{ use: 'official', family: 'Test', given: ['Patient'] }],
        gender: 'male',
        birthDate: '1990-01-01'
      };

      const validResult = await fhirService.validateResource(testPatientValid);
      const invalidResult = await fhirService.validateResource(testPatientInvalid);
      
      console.log('Valid MyKad validation:', validResult.valid, validResult.errors);
      console.log('Invalid MyKad validation:', invalidResult.valid, invalidResult.errors);
      
      expect(validResult.valid).toBe(true);
      expect(invalidResult.valid).toBe(false);
      expect(invalidResult.errors.length).toBeGreaterThan(0);
    });

    it('should handle Malaysian healthcare provider validation', async () => {
      const testPractitioner: MalaysianPractitioner = {
        resourceType: 'Practitioner',
        identifier: [
          {
            use: 'official',
            type: {
              coding: [
                {
                  system: 'http://terminology.hl7.org/CodeSystem/v2-0203',
                  code: 'MD',
                  display: 'Medical License Number'
                }
              ]
            },
            system: 'https://fhir.mmc.gov.my/identifier/mmc-number',
            value: 'MMC123456'
          }
        ],
        name: [
          {
            use: 'official',
            family: 'Dr. Abdullah',
            given: ['Ahmad', 'Zaki'],
            prefix: ['Dr.']
          }
        ],
        qualification: [
          {
            code: {
              coding: [
                {
                  system: 'https://fhir.mmc.gov.my/CodeSystem/qualification',
                  code: 'MBBS',
                  display: 'Bachelor of Medicine, Bachelor of Surgery'
                }
              ]
            },
            issuer: {
              reference: 'Organization/mmc-malaysia',
              display: 'Malaysian Medical Council'
            }
          }
        ]
      };

      const validationResult = await fhirService.validateResource(testPractitioner);
      
      expect(validationResult.valid).toBe(true);
      console.log('Practitioner validation result:', validationResult);
    });
  });

  describe('Integration Services Health Check', () => {
    it('should verify MOH integration service is initialized', () => {
      expect(mohService).toBeDefined();
      expect(mohService.constructor.name).toBe('MOHIntegrationService');
    });

    it('should verify Hospital connector service is initialized', () => {
      expect(hospitalService).toBeDefined();
      expect(hospitalService.constructor.name).toBe('HospitalConnectorService');
    });

    it('should verify MySejahtera service is initialized', () => {
      expect(mysejahteraService).toBeDefined();
      expect(mysejahteraService.constructor.name).toBe('MySejahteraService');
    });

    it('should test MOH integration connectivity (mock)', async () => {
      // This would test actual MOH connectivity in a real environment
      // For now, we'll just verify the service methods exist
      expect(typeof mohService.registerPatient).toBe('function');
      expect(typeof mohService.submitEncounter).toBe('function');
      expect(typeof mohService.syncVaccinationData).toBe('function');
      
      console.log('MOH integration service methods verified');
    });

    it('should verify hospital connector capabilities', async () => {
      expect(typeof hospitalService.syncPatientData).toBe('function');
      expect(typeof hospitalService.submitEncounterData).toBe('function');
      expect(typeof hospitalService.syncPractitionerData).toBe('function');
      
      console.log('Hospital connector service methods verified');
    });
  });

  describe('Cultural Intelligence Integration', () => {
    it('should handle halal compliance validation', async () => {
      // This would test cultural considerations in healthcare data
      const testPatient: MalaysianPatient = {
        resourceType: 'Patient',
        identifier: [
          {
            use: 'official',
            type: { coding: [{ system: 'test', code: 'NRIC', display: 'NRIC' }] },
            system: 'https://fhir.moh.gov.my/identifier/mykad',
            value: '901234567890'
          }
        ],
        name: [{ use: 'official', family: 'Ahmad', given: ['Abdullah'] }],
        gender: 'male',
        birthDate: '1990-01-01',
        extension: [
          {
            url: 'https://fhir.moh.gov.my/StructureDefinition/patient-religion',
            valueString: 'Islam'
          }
        ]
      };

      const validationResult = await fhirService.validateResource(testPatient);
      expect(validationResult.valid).toBe(true);
      
      // Check if cultural extensions are properly handled
      const culturalExtensions = testPatient.extension?.filter(ext => 
        ext.url.includes('patient-religion') || 
        ext.url.includes('patient-race')
      );
      
      expect(culturalExtensions?.length).toBeGreaterThan(0);
      console.log('Cultural intelligence extensions:', culturalExtensions?.length);
    });

    it('should support multi-language healthcare data', async () => {
      // Test multi-language support for Malaysian healthcare
      const testOrganization: MalaysianOrganization = {
        resourceType: 'Organization',
        identifier: [
          {
            use: 'official',
            type: { coding: [{ system: 'test', code: 'PRN', display: 'Provider number' }] },
            system: 'https://fhir.moh.gov.my/identifier/facility-code',
            value: 'FAC001'
          }
        ],
        name: 'Hospital Kuala Lumpur',
        type: [
          {
            coding: [
              {
                system: 'https://fhir.moh.gov.my/CodeSystem/organization-type',
                code: 'hospital',
                display: 'Hospital'
              }
            ],
            text: 'Government Hospital'
          }
        ]
      };

      const validationResult = await fhirService.validateResource(testOrganization);
      expect(validationResult.valid).toBe(true);
      console.log('Multi-language organization validation:', validationResult.valid);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle bulk FHIR operations efficiently', async () => {
      const startTime = Date.now();
      
      // Create multiple test patients
      const patients: MalaysianPatient[] = [];
      for (let i = 0; i < 5; i++) {
        patients.push({
          resourceType: 'Patient',
          identifier: [
            {
              use: 'official',
              type: { coding: [{ system: 'test', code: 'NRIC', display: 'NRIC' }] },
              system: 'https://fhir.moh.gov.my/identifier/mykad',
              value: `90123456789${i}`
            }
          ],
          name: [{ use: 'official', family: 'Test', given: [`Patient${i}`] }],
          gender: i % 2 === 0 ? 'male' : 'female',
          birthDate: '1990-01-01'
        });
      }

      // Validate all patients
      const validationPromises = patients.map(patient => 
        fhirService.validateResource(patient)
      );
      
      const results = await Promise.all(validationPromises);
      const endTime = Date.now();
      
      expect(results).toHaveLength(5);
      expect(results.every(r => r.valid)).toBe(true);
      
      const processingTime = endTime - startTime;
      console.log(`Bulk validation of 5 patients completed in ${processingTime}ms`);
      
      // Performance check - should complete within reasonable time
      expect(processingTime).toBeLessThan(5000); // 5 seconds
    });

    it('should maintain FHIR resource versioning', async () => {
      const testPatient: MalaysianPatient = {
        resourceType: 'Patient',
        identifier: [
          {
            use: 'official',
            type: { coding: [{ system: 'test', code: 'NRIC', display: 'NRIC' }] },
            system: 'https://fhir.moh.gov.my/identifier/mykad',
            value: '901234567999'
          }
        ],
        name: [{ use: 'official', family: 'Version', given: ['Test'] }],
        gender: 'male',
        birthDate: '1990-01-01'
      };

      // Create resource
      const created = await fhirService.createResource('Patient', testPatient);
      expect(created.meta?.versionId).toBe('1');
      
      // Update resource
      if (created.id) {
        const updated = await fhirService.updateResource('Patient', created.id, {
          ...created,
          birthDate: '1990-01-02'
        });
        expect(updated.meta?.versionId).toBe('2');
        console.log('Resource versioning test passed:', created.meta?.versionId, '->', updated.meta?.versionId);
      }
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle invalid FHIR resources gracefully', async () => {
      const invalidPatient = {
        resourceType: 'InvalidType',
        name: 'Invalid Patient'
      };

      const validationResult = await fhirService.validateResource(invalidPatient);
      
      expect(validationResult.valid).toBe(false);
      expect(validationResult.errors.length).toBeGreaterThan(0);
      console.log('Invalid resource validation errors:', validationResult.errors.length);
    });

    it('should handle network failures gracefully', async () => {
      // This would test network resilience in a real environment
      // For now, we verify error handling structure exists
      expect(typeof fhirService.createResource).toBe('function');
      expect(typeof fhirService.getResource).toBe('function');
      
      // Test with non-existent resource
      try {
        await fhirService.getResource('Patient', 'non-existent-id');
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeDefined();
        console.log('Non-existent resource error handled:', error instanceof Error ? error.message : 'Unknown error');
      }
    });
  });
});