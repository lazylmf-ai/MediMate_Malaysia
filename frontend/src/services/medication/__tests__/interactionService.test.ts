/**
 * Drug Interaction Service Tests
 * 
 * Tests for comprehensive drug interaction analysis including:
 * - Multi-drug interaction checking
 * - Severity assessment and clinical significance
 * - Cultural considerations (prayer times, fasting, halal status)
 * - Malaysian healthcare context
 */

import { drugInteractionService } from '../interactionService';
import { medicationDatabaseService } from '../databaseService';
import { medicationService } from '../../../api/services/medicationService';

// Mock dependencies
jest.mock('../databaseService');
jest.mock('../../../api/services/medicationService');

const mockDatabaseService = medicationDatabaseService as jest.Mocked<typeof medicationDatabaseService>;
const mockMedicationService = medicationService as jest.Mocked<typeof medicationService>;

describe('DrugInteractionService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockMedicationDetails = {
    success: true,
    data: {
      id: 'med_001',
      name: 'Paracetamol',
      genericName: 'Acetaminophen',
      activeIngredients: ['Acetaminophen'],
      manufacturer: 'Test Pharma',
    },
  };

  describe('checkInteractions', () => {
    beforeEach(() => {
      mockDatabaseService.getMedicationDetails.mockResolvedValue(mockMedicationDetails as any);
      mockMedicationService.checkMedicationInteractions.mockResolvedValue({
        success: true,
        data: {
          has_interactions: true,
          interactions: [
            {
              medication_1: 'med_001',
              medication_2: 'med_002',
              severity: 'moderate',
              description: 'May increase side effects',
            },
          ],
          recommendations: ['Monitor patient'],
        },
      });
    });

    it('should reject requests with no medications', async () => {
      const result = await drugInteractionService.checkInteractions({
        medications: [],
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('At least one medication is required');
    });

    it('should check interactions between multiple medications', async () => {
      const request = {
        medications: [
          { id: 'med_001', name: 'Paracetamol' },
          { id: 'med_002', name: 'Ibuprofen' },
        ],
      };

      const result = await drugInteractionService.checkInteractions(request);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.hasInteractions).toBe(true);
      expect(result.data!.interactions).toHaveLength(1);
    });

    it('should calculate overall risk correctly', async () => {
      // Mock severe interaction
      mockMedicationService.checkMedicationInteractions.mockResolvedValue({
        success: true,
        data: {
          has_interactions: true,
          interactions: [
            {
              medication_1: 'med_001',
              medication_2: 'med_002',
              severity: 'severe',
              description: 'Dangerous interaction',
            },
          ],
          recommendations: ['Avoid concurrent use'],
        },
      });

      const request = {
        medications: [
          { id: 'med_001', name: 'Warfarin' },
          { id: 'med_002', name: 'Aspirin' },
        ],
      };

      const result = await drugInteractionService.checkInteractions(request);

      expect(result.success).toBe(true);
      expect(result.data!.overallRisk).toBe('high');
    });

    it('should include cultural considerations when requested', async () => {
      const request = {
        medications: [
          { id: 'med_001', name: 'Paracetamol' },
          { id: 'med_002', name: 'Ibuprofen' },
        ],
        patientProfile: {
          culturalProfile: {
            religion: 'Islam',
            observesPrayerTimes: true,
            observesRamadan: true,
            dietaryRestrictions: [],
          },
        },
        checkOptions: {
          includeCulturalConsiderations: true,
          includeFoodInteractions: false,
          includeSupplements: false,
          includeOTCMedications: false,
          severityThreshold: 'all' as const,
        },
      };

      const result = await drugInteractionService.checkInteractions(request);

      expect(result.success).toBe(true);
      expect(result.data!.culturalGuidelines).toBeDefined();
      expect(result.data!.culturalGuidelines.length).toBeGreaterThan(0);
    });

    it('should filter interactions by severity threshold', async () => {
      // Mock multiple interactions with different severities
      mockMedicationService.checkMedicationInteractions.mockResolvedValue({
        success: true,
        data: {
          has_interactions: true,
          interactions: [
            {
              medication_1: 'med_001',
              medication_2: 'med_002',
              severity: 'mild',
              description: 'Minor interaction',
            },
            {
              medication_1: 'med_001',
              medication_2: 'med_003',
              severity: 'moderate',
              description: 'Moderate interaction',
            },
          ],
          recommendations: [],
        },
      });

      // Add third medication mock
      mockDatabaseService.getMedicationDetails
        .mockResolvedValueOnce(mockMedicationDetails as any)
        .mockResolvedValueOnce(mockMedicationDetails as any)
        .mockResolvedValueOnce(mockMedicationDetails as any);

      const request = {
        medications: [
          { id: 'med_001', name: 'Med1' },
          { id: 'med_002', name: 'Med2' },
          { id: 'med_003', name: 'Med3' },
        ],
        checkOptions: {
          severityThreshold: 'moderate' as const,
          includeFoodInteractions: false,
          includeSupplements: false,
          includeOTCMedications: false,
          includeCulturalConsiderations: false,
        },
      };

      const result = await drugInteractionService.checkInteractions(request);

      expect(result.success).toBe(true);
      // Should only include moderate and above interactions
      expect(result.data!.interactions.length).toBe(1);
      expect(result.data!.interactions[0].severity).toBe('moderate');
    });

    it('should generate alternative recommendations for major interactions', async () => {
      // Mock alternative medications search
      mockDatabaseService.searchMedications.mockResolvedValue({
        success: true,
        data: {
          medications: [
            { id: 'alt_001', name: 'Alternative Med 1' },
            { id: 'alt_002', name: 'Alternative Med 2' },
          ],
          totalCount: 2,
          searchQuery: 'test',
          filters: {},
        },
      } as any);

      // Mock major interaction
      mockMedicationService.checkMedicationInteractions.mockResolvedValue({
        success: true,
        data: {
          has_interactions: true,
          interactions: [
            {
              medication_1: 'med_001',
              medication_2: 'med_002',
              severity: 'severe',
              description: 'Major interaction',
            },
          ],
          recommendations: [],
        },
      });

      const request = {
        medications: [
          { id: 'med_001', name: 'Med1' },
          { id: 'med_002', name: 'Med2' },
        ],
      };

      const result = await drugInteractionService.checkInteractions(request);

      expect(result.success).toBe(true);
      expect(result.data!.alternativeOptions.length).toBeGreaterThan(0);
    });

    it('should provide monitoring requirements based on interaction severity', async () => {
      const request = {
        medications: [
          { id: 'med_001', name: 'Warfarin' },
          { id: 'med_002', name: 'Aspirin' },
        ],
      };

      const result = await drugInteractionService.checkInteractions(request);

      expect(result.success).toBe(true);
      expect(result.data!.monitoringRequirements).toBeDefined();
      expect(result.data!.monitoringRequirements.length).toBeGreaterThan(0);
    });

    it('should handle medication details retrieval errors', async () => {
      mockDatabaseService.getMedicationDetails.mockResolvedValue({
        success: false,
        error: 'Medication not found',
      });

      const request = {
        medications: [
          { id: 'invalid_med', name: 'Invalid Med' },
        ],
      };

      const result = await drugInteractionService.checkInteractions(request);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Failed to get details');
    });
  });

  describe('getActiveInteractionMonitoring', () => {
    it('should create monitoring plan for active medications', async () => {
      const mockInteractionResult = {
        success: true,
        data: {
          hasInteractions: true,
          overallRisk: 'moderate' as const,
          interactions: [
            {
              medication1: { id: 'med_001', name: 'Med1' },
              medication2: { id: 'med_002', name: 'Med2' },
              severity: 'moderate' as const,
              mechanism: 'Test mechanism',
              clinicalEffects: ['Side effect'],
              onsetTime: 'delayed' as const,
              documentation: 'good' as const,
              managementStrategy: 'Monitor patient',
              culturalConsiderations: {},
            },
          ],
          warnings: [],
          recommendations: [],
          culturalGuidelines: [],
          monitoringRequirements: [],
          alternativeOptions: [],
          checkSummary: {
            totalMedicationsChecked: 2,
            interactionPairsAnalyzed: 1,
            checkDuration: 100,
            lastUpdated: new Date().toISOString(),
          },
        },
      };

      jest.spyOn(drugInteractionService, 'checkInteractions')
        .mockResolvedValue(mockInteractionResult);

      const result = await drugInteractionService.getActiveInteractionMonitoring(
        'patient_001',
        ['med_001', 'med_002']
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.patientId).toBe('patient_001');
      expect(result.data!.medications).toEqual(['med_001', 'med_002']);
      expect(result.data!.monitoringParameters.length).toBeGreaterThan(0);
    });

    it('should use cached monitoring plan when medications unchanged', async () => {
      // Mock cache with existing plan
      const mockCacheService = require('../../cache/cacheService').cacheService;
      const existingPlan = {
        patientId: 'patient_001',
        medications: ['med_001', 'med_002'],
        interactions: [],
        monitoringParameters: [],
        nextReviewDate: new Date().toISOString(),
        emergencyContacts: [],
      };
      mockCacheService.get.mockResolvedValueOnce(existingPlan);

      const result = await drugInteractionService.getActiveInteractionMonitoring(
        'patient_001',
        ['med_001', 'med_002']
      );

      expect(result.success).toBe(true);
      expect(result.data).toEqual(existingPlan);
    });
  });

  describe('checkFoodInteractions', () => {
    const mockMalaysianMedications = [
      {
        id: 'med_001',
        name: 'Warfarin',
        genericName: 'warfarin',
        brandNames: ['Warfarin'],
        manufacturer: 'Test Pharma',
        registrationNumber: 'REG001',
        dosageFormsAvailable: ['tablet'],
        strengthsAvailable: ['5mg'],
        indicationsMs: 'Antikoagulan',
        indicationsEn: 'Anticoagulant',
        contraindications: [],
        sideEffects: [],
        interactions: [],
        storageInstructions: 'Store cool',
        availability: 'prescription' as const,
        activeIngredient: ['warfarin'],
      },
    ];

    it('should identify Malaysian food-drug interactions', async () => {
      const result = await drugInteractionService.checkFoodInteractions(mockMalaysianMedications);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.length).toBeGreaterThan(0);
      
      // Should include kangkung interaction with warfarin
      const kangkungInteraction = result.data!.find(
        interaction => interaction.food === 'Kangkung (water spinach)'
      );
      expect(kangkungInteraction).toBeDefined();
      expect(kangkungInteraction!.culturalRelevance).toContain('Malaysian');
    });

    it('should provide culturally relevant dietary advice', async () => {
      const result = await drugInteractionService.checkFoodInteractions(mockMalaysianMedications);

      expect(result.success).toBe(true);
      
      const interactions = result.data!;
      interactions.forEach(interaction => {
        expect(interaction.advice).toBeDefined();
        expect(interaction.culturalRelevance).toBeDefined();
      });
    });

    it('should handle medications with no food interactions', async () => {
      const noInteractionMeds = [
        {
          ...mockMalaysianMedications[0],
          name: 'Unknown Med',
          genericName: 'unknown',
          activeIngredient: ['unknown_ingredient'],
        },
      ];

      const result = await drugInteractionService.checkFoodInteractions(noInteractionMeds);

      expect(result.success).toBe(true);
      expect(result.data!).toHaveLength(0);
    });
  });

  describe('getInteractionAlerts', () => {
    it('should provide interaction alert for medication pair', async () => {
      const mockCheckResult = {
        success: true,
        data: {
          hasInteractions: true,
          overallRisk: 'moderate' as const,
          interactions: [
            {
              medication1: { id: 'med_001', name: 'Med1' },
              medication2: { id: 'med_002', name: 'Med2' },
              severity: 'moderate' as const,
              managementStrategy: 'Use with caution',
              culturalConsiderations: {
                prayerTimeImpact: 'Monitor during prayer times',
              },
            },
          ],
          warnings: [],
          recommendations: [],
          culturalGuidelines: [],
          monitoringRequirements: [],
          alternativeOptions: [],
          checkSummary: {
            totalMedicationsChecked: 2,
            interactionPairsAnalyzed: 1,
            checkDuration: 50,
            lastUpdated: new Date().toISOString(),
          },
        },
      };

      jest.spyOn(drugInteractionService, 'checkInteractions')
        .mockResolvedValue(mockCheckResult);

      const result = await drugInteractionService.getInteractionAlerts('med_001', 'med_002');

      expect(result.success).toBe(true);
      expect(result.data!.alert).toBe(true);
      expect(result.data!.severity).toBe('moderate');
      expect(result.data!.action).toBe('caution');
      expect(result.data!.culturalNotes).toContain('Monitor during prayer times');
    });

    it('should indicate no alert when no interactions found', async () => {
      jest.spyOn(drugInteractionService, 'checkInteractions')
        .mockResolvedValue({
          success: true,
          data: {
            hasInteractions: false,
            overallRisk: 'low',
            interactions: [],
            warnings: [],
            recommendations: [],
            culturalGuidelines: [],
            monitoringRequirements: [],
            alternativeOptions: [],
            checkSummary: {
              totalMedicationsChecked: 2,
              interactionPairsAnalyzed: 1,
              checkDuration: 25,
              lastUpdated: new Date().toISOString(),
            },
          },
        });

      const result = await drugInteractionService.getInteractionAlerts('med_001', 'med_002');

      expect(result.success).toBe(true);
      expect(result.data!.alert).toBe(false);
      expect(result.data!.severity).toBe('none');
      expect(result.data!.action).toBe('monitor');
    });

    it('should map severity to appropriate action', async () => {
      const severityActionPairs = [
        { severity: 'minor', expectedAction: 'monitor' },
        { severity: 'moderate', expectedAction: 'caution' },
        { severity: 'major', expectedAction: 'avoid' },
        { severity: 'contraindicated', expectedAction: 'contraindicated' },
      ];

      for (const { severity, expectedAction } of severityActionPairs) {
        jest.spyOn(drugInteractionService, 'checkInteractions')
          .mockResolvedValue({
            success: true,
            data: {
              hasInteractions: true,
              overallRisk: 'moderate',
              interactions: [
                {
                  severity: severity as any,
                  managementStrategy: `Action for ${severity}`,
                  culturalConsiderations: {},
                } as any,
              ],
            } as any,
          });

        const result = await drugInteractionService.getInteractionAlerts('med_001', 'med_002');

        expect(result.success).toBe(true);
        expect(result.data!.action).toBe(expectedAction);
      }
    });
  });

  describe('Error Handling', () => {
    it('should handle API service errors', async () => {
      mockDatabaseService.getMedicationDetails.mockResolvedValue(mockMedicationDetails as any);
      mockMedicationService.checkMedicationInteractions.mockResolvedValue({
        success: false,
        error: 'API Error',
      });

      const request = {
        medications: [
          { id: 'med_001', name: 'Med1' },
          { id: 'med_002', name: 'Med2' },
        ],
      };

      const result = await drugInteractionService.checkInteractions(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to check drug interactions');
    });

    it('should handle network errors gracefully', async () => {
      mockDatabaseService.getMedicationDetails.mockRejectedValue(new Error('Network error'));

      const request = {
        medications: [
          { id: 'med_001', name: 'Med1' },
        ],
      };

      const result = await drugInteractionService.checkInteractions(request);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to check drug interactions');
    });
  });

  describe('Cultural Considerations', () => {
    it('should provide Ramadan-specific guidance', async () => {
      const request = {
        medications: [
          { id: 'med_001', name: 'Med1' },
          { id: 'med_002', name: 'Med2' },
        ],
        patientProfile: {
          culturalProfile: {
            religion: 'Islam',
            observesPrayerTimes: true,
            observesRamadan: true,
            dietaryRestrictions: [],
          },
        },
        checkOptions: {
          includeCulturalConsiderations: true,
          includeFoodInteractions: false,
          includeSupplements: false,
          includeOTCMedications: false,
          severityThreshold: 'all' as const,
        },
      };

      const result = await drugInteractionService.checkInteractions(request);

      expect(result.success).toBe(true);
      const culturalGuidelines = result.data!.culturalGuidelines;
      expect(culturalGuidelines.some(guideline => 
        guideline.includes('Ramadan') || guideline.includes('fasting')
      )).toBe(true);
    });

    it('should provide prayer time considerations', async () => {
      const request = {
        medications: [
          { id: 'med_001', name: 'Med1' },
          { id: 'med_002', name: 'Med2' },
        ],
        patientProfile: {
          culturalProfile: {
            religion: 'Islam',
            observesPrayerTimes: true,
            observesRamadan: false,
            dietaryRestrictions: [],
          },
        },
        checkOptions: {
          includeCulturalConsiderations: true,
          includeFoodInteractions: false,
          includeSupplements: false,
          includeOTCMedications: false,
          severityThreshold: 'all' as const,
        },
      };

      const result = await drugInteractionService.checkInteractions(request);

      expect(result.success).toBe(true);
      const culturalGuidelines = result.data!.culturalGuidelines;
      expect(culturalGuidelines.some(guideline => 
        guideline.includes('prayer')
      )).toBe(true);
    });
  });

  describe('Performance', () => {
    it('should complete interaction check within reasonable time', async () => {
      const startTime = Date.now();
      
      const request = {
        medications: [
          { id: 'med_001', name: 'Med1' },
          { id: 'med_002', name: 'Med2' },
        ],
      };

      await drugInteractionService.checkInteractions(request);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
    });

    it('should handle large number of medications efficiently', async () => {
      const medications = Array(10).fill(0).map((_, i) => ({
        id: `med_${i}`,
        name: `Medication ${i}`,
      }));

      const startTime = Date.now();
      
      const request = { medications };
      await drugInteractionService.checkInteractions(request);
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should still complete within reasonable time even with many medications
      expect(duration).toBeLessThan(5000);
    });
  });
});