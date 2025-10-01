/**
 * Medication Database Service Tests
 * 
 * Comprehensive tests for medication database integration functionality:
 * - Search and autocomplete
 * - Medication details retrieval
 * - Generic/brand name mapping
 * - Drug interaction checking
 * - Offline sync capabilities
 * - Cultural medication preferences
 */

import { medicationDatabaseService } from '../databaseService';
import { cacheService } from '../../cache/cacheService';
import { medicationService } from '../../../api/services/medicationService';
import { culturalService } from '../../../api/services/culturalService';

// Mock dependencies
jest.mock('../../cache/cacheService');
jest.mock('../../../api/services/medicationService');
jest.mock('../../../api/services/culturalService');

const mockCacheService = cacheService as jest.Mocked<typeof cacheService>;
const mockMedicationService = medicationService as jest.Mocked<typeof medicationService>;
const mockCulturalService = culturalService as jest.Mocked<typeof culturalService>;

describe('MedicationDatabaseService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('searchMedications', () => {
    const mockSearchResponse = {
      success: true,
      data: {
        medications: [
          {
            medication_id: 'med_001',
            name: 'Paracetamol',
            generic_name: 'Acetaminophen',
            manufacturer: 'Pharmaniaga',
            category: 'analgesic',
            halal_status: 'halal',
          },
        ],
      },
    };

    beforeEach(() => {
      mockMedicationService.searchMedications.mockResolvedValue(mockSearchResponse as any);
      mockCacheService.get.mockResolvedValue(null);
      mockCacheService.set.mockResolvedValue();
    });

    it('should search medications with basic query', async () => {
      const result = await medicationDatabaseService.searchMedications('paracetamol');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.medications).toHaveLength(1);
      expect(result.data!.searchQuery).toBe('paracetamol');
      expect(mockMedicationService.searchMedications).toHaveBeenCalledWith(
        'paracetamol',
        expect.objectContaining({
          halalOnly: undefined,
          language: undefined,
        })
      );
    });

    it('should apply halal filtering when culturalFilter.halalOnly is true', async () => {
      await medicationDatabaseService.searchMedications('paracetamol', {
        culturalFilter: { halalOnly: true },
      });

      expect(mockMedicationService.searchMedications).toHaveBeenCalledWith(
        'paracetamol',
        expect.objectContaining({
          halalOnly: true,
        })
      );
    });

    it('should use cached results when available', async () => {
      const cachedResult = {
        medications: [],
        totalCount: 0,
        searchQuery: 'paracetamol',
        filters: {},
      };
      mockCacheService.get.mockResolvedValueOnce(cachedResult);

      const result = await medicationDatabaseService.searchMedications('paracetamol');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(cachedResult);
      expect(mockMedicationService.searchMedications).not.toHaveBeenCalled();
    });

    it('should handle API errors gracefully', async () => {
      mockMedicationService.searchMedications.mockResolvedValue({
        success: false,
        error: 'API Error',
      });

      const result = await medicationDatabaseService.searchMedications('paracetamol');

      expect(result.success).toBe(false);
      expect(result.error).toBe('API Error');
    });

    it('should cache search results after successful search', async () => {
      await medicationDatabaseService.searchMedications('paracetamol');

      expect(mockCacheService.set).toHaveBeenCalledWith(
        expect.stringContaining('medication_search_paracetamol'),
        expect.objectContaining({
          medications: expect.any(Array),
          totalCount: expect.any(Number),
          searchQuery: 'paracetamol',
        }),
        expect.any(Number)
      );
    });

    it('should generate search suggestions', async () => {
      const result = await medicationDatabaseService.searchMedications('para');

      expect(result.success).toBe(true);
      expect(result.data!.suggestions).toBeDefined();
      expect(Array.isArray(result.data!.suggestions)).toBe(true);
    });
  });

  describe('getMedicationDetails', () => {
    const mockMedicationDetailsResponse = {
      success: true,
      data: {
        medication_id: 'med_001',
        name: 'Paracetamol',
        generic_name: 'Acetaminophen',
        manufacturer: 'Pharmaniaga',
        dosage_form: 'tablet',
        strength: '500mg',
        prescribing_info: {
          indications: ['Fever', 'Pain relief'],
          contraindications: ['Liver disease'],
          side_effects: ['Nausea'],
        },
      },
    };

    beforeEach(() => {
      mockMedicationService.getMedicationById.mockResolvedValue(mockMedicationDetailsResponse as any);
      mockCacheService.get.mockResolvedValue(null);
      mockCacheService.set.mockResolvedValue();
    });

    it('should get medication details with basic options', async () => {
      const result = await medicationDatabaseService.getMedicationDetails('med_001');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.id).toBe('med_001');
      expect(result.data!.name).toBe('Paracetamol');
    });

    it('should include interaction data when requested', async () => {
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
          recommendations: [],
        },
      });

      const result = await medicationDatabaseService.getMedicationDetails('med_001', {
        includeInteractions: true,
      });

      expect(result.success).toBe(true);
      expect(result.data!.interactions).toBeDefined();
      expect(mockMedicationService.checkMedicationInteractions).toHaveBeenCalledWith(['med_001']);
    });

    it('should use cached details when available and not requesting fresh data', async () => {
      const cachedDetails = {
        id: 'med_001',
        name: 'Cached Paracetamol',
      };
      mockCacheService.get.mockResolvedValueOnce(cachedDetails);

      const result = await medicationDatabaseService.getMedicationDetails('med_001');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(cachedDetails);
      expect(mockMedicationService.getMedicationById).not.toHaveBeenCalled();
    });

    it('should handle medication not found', async () => {
      mockMedicationService.getMedicationById.mockResolvedValue({
        success: false,
        error: 'Medication not found',
      });

      const result = await medicationDatabaseService.getMedicationDetails('invalid_id');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Medication not found');
    });
  });

  describe('mapMedicationNames', () => {
    const mockSearchResponse = {
      success: true,
      data: {
        medications: [
          {
            medication_id: 'med_001',
            name: 'Panadol',
            generic_name: 'Paracetamol',
            manufacturer: 'GlaxoSmithKline',
          },
          {
            medication_id: 'med_002',
            name: 'Panadol Extra',
            generic_name: 'Paracetamol',
            manufacturer: 'GlaxoSmithKline',
          },
        ],
      },
    };

    beforeEach(() => {
      mockCacheService.get.mockResolvedValue(null);
      mockCacheService.set.mockResolvedValue();
    });

    it('should map brand name to generic names', async () => {
      // Mock the search method to return the search response
      jest.spyOn(medicationDatabaseService, 'searchMedications').mockResolvedValue({
        success: true,
        data: mockSearchResponse.data,
      } as any);

      const result = await medicationDatabaseService.mapMedicationNames('Panadol', 'generic');

      expect(result.success).toBe(true);
      expect(result.data!.original).toBe('Panadol');
      expect(result.data!.type).toBe('generic');
      expect(result.data!.mappedNames).toContain('Paracetamol');
      expect(result.data!.malaysianContext.localManufacturers).toContain('GlaxoSmithKline');
    });

    it('should map generic name to brand names', async () => {
      jest.spyOn(medicationDatabaseService, 'searchMedications').mockResolvedValue({
        success: true,
        data: mockSearchResponse.data,
      } as any);

      const result = await medicationDatabaseService.mapMedicationNames('Paracetamol', 'brand');

      expect(result.success).toBe(true);
      expect(result.data!.type).toBe('brand');
      expect(result.data!.mappedNames).toContain('Panadol');
      expect(result.data!.mappedNames).toContain('Panadol Extra');
    });

    it('should use cached mapping when available', async () => {
      const cachedMapping = {
        original: 'Panadol',
        mappedNames: ['Paracetamol'],
        type: 'generic' as const,
        confidence: 0.9,
        malaysianContext: {},
      };
      mockCacheService.get.mockResolvedValueOnce(cachedMapping);

      const result = await medicationDatabaseService.mapMedicationNames('Panadol', 'generic');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(cachedMapping);
    });

    it('should handle no mappings found', async () => {
      jest.spyOn(medicationDatabaseService, 'searchMedications').mockResolvedValue({
        success: true,
        data: { medications: [], totalCount: 0, searchQuery: 'unknown', filters: {} },
      } as any);

      const result = await medicationDatabaseService.mapMedicationNames('UnknownMed', 'generic');

      expect(result.success).toBe(true);
      expect(result.data!.mappedNames).toHaveLength(0);
      expect(result.data!.confidence).toBeLessThan(0.5);
    });
  });

  describe('checkDrugInteractions', () => {
    const mockInteractionResponse = {
      success: true,
      data: {
        has_interactions: true,
        interactions: [
          {
            medication_1: 'med_001',
            medication_2: 'med_002',
            severity: 'moderate',
            description: 'May increase risk of side effects',
          },
        ],
        recommendations: ['Monitor patient for side effects'],
      },
    };

    beforeEach(() => {
      mockMedicationService.checkMedicationInteractions.mockResolvedValue(mockInteractionResponse as any);
    });

    it('should check single medication (no interactions)', async () => {
      const result = await medicationDatabaseService.checkDrugInteractions({
        medicationIds: ['med_001'],
      });

      expect(result.success).toBe(true);
      expect(result.data!.hasInteractions).toBe(false);
      expect(result.data!.severity).toBe('low');
    });

    it('should check multiple medications for interactions', async () => {
      const result = await medicationDatabaseService.checkDrugInteractions({
        medicationIds: ['med_001', 'med_002'],
      });

      expect(result.success).toBe(true);
      expect(result.data!.hasInteractions).toBe(true);
      expect(result.data!.interactions).toHaveLength(1);
      expect(mockMedicationService.checkMedicationInteractions).toHaveBeenCalledWith(['med_001', 'med_002']);
    });

    it('should include cultural considerations when requested', async () => {
      const result = await medicationDatabaseService.checkDrugInteractions({
        medicationIds: ['med_001', 'med_002'],
        includeCulturalConsiderations: true,
      });

      expect(result.success).toBe(true);
      expect(result.data!.culturalGuidelines).toBeDefined();
      expect(result.data!.culturalGuidelines!.length).toBeGreaterThan(0);
    });

    it('should assess overall risk based on interaction severity', async () => {
      // Mock high severity interaction
      const severeInteractionResponse = {
        ...mockInteractionResponse,
        data: {
          ...mockInteractionResponse.data,
          interactions: [
            {
              ...mockInteractionResponse.data.interactions[0],
              severity: 'severe',
            },
          ],
        },
      };
      mockMedicationService.checkMedicationInteractions.mockResolvedValue(severeInteractionResponse as any);

      const result = await medicationDatabaseService.checkDrugInteractions({
        medicationIds: ['med_001', 'med_002'],
      });

      expect(result.success).toBe(true);
      expect(result.data!.severity).toBe('high');
    });
  });

  describe('syncOfflineDatabase', () => {
    const mockSyncStatus = {
      lastSyncDate: new Date('2024-01-01'),
      medicationsCount: 100,
      searchIndexSize: 1024,
      cacheUsage: 50,
      syncInProgress: false,
      nextScheduledSync: new Date('2024-01-08'),
    };

    beforeEach(() => {
      mockCacheService.get.mockResolvedValue(null);
      mockCacheService.set.mockResolvedValue();
      mockMedicationService.getMedications.mockResolvedValue({
        success: true,
        data: {
          medications: Array(10).fill(0).map((_, i) => ({
            medication_id: `med_${i}`,
            name: `Medication ${i}`,
            generic_name: `Generic ${i}`,
            manufacturer: 'Test Manufacturer',
          })),
        },
      } as any);
    });

    it('should sync medications for offline use', async () => {
      const progressCallback = jest.fn();

      const result = await medicationDatabaseService.syncOfflineDatabase({
        syncCallback: progressCallback,
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.medicationsCount).toBeGreaterThan(0);
      expect(progressCallback).toHaveBeenCalledWith(100);
    });

    it('should not sync if already in progress', async () => {
      const inProgressStatus = { ...mockSyncStatus, syncInProgress: true };
      mockCacheService.get.mockResolvedValueOnce(inProgressStatus);

      const result = await medicationDatabaseService.syncOfflineDatabase();

      expect(result.success).toBe(true);
      expect(result.data!.syncInProgress).toBe(true);
      expect(mockMedicationService.getMedications).not.toHaveBeenCalled();
    });

    it('should force refresh when requested', async () => {
      const recentSyncStatus = {
        ...mockSyncStatus,
        lastSyncDate: new Date(), // Recent sync
      };
      mockCacheService.get.mockResolvedValueOnce(recentSyncStatus);

      const result = await medicationDatabaseService.syncOfflineDatabase({
        forceRefresh: true,
      });

      expect(result.success).toBe(true);
      expect(mockMedicationService.getMedications).toHaveBeenCalled();
    });

    it('should apply halal filtering during sync when requested', async () => {
      await medicationDatabaseService.syncOfflineDatabase({
        halalOnly: true,
      });

      expect(mockMedicationService.getMedications).toHaveBeenCalledWith(
        expect.objectContaining({
          halal_only: true,
        })
      );
    });

    it('should handle sync errors gracefully', async () => {
      mockMedicationService.getMedications.mockRejectedValue(new Error('Network error'));

      const result = await medicationDatabaseService.syncOfflineDatabase();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to sync medication database');
    });

    it('should update progress during sync', async () => {
      const progressCallback = jest.fn();
      
      // Mock multiple pages of results
      mockMedicationService.getMedications
        .mockResolvedValueOnce({
          success: true,
          data: { medications: Array(100).fill({}).map((_, i) => ({ medication_id: `med_${i}` })) },
        } as any)
        .mockResolvedValueOnce({
          success: true,
          data: { medications: Array(50).fill({}).map((_, i) => ({ medication_id: `med_${i + 100}` })) },
        } as any)
        .mockResolvedValueOnce({
          success: true,
          data: { medications: [] }, // No more results
        } as any);

      await medicationDatabaseService.syncOfflineDatabase({
        syncCallback: progressCallback,
      });

      expect(progressCallback).toHaveBeenCalledTimes(3); // Called for progress updates + final 100%
      expect(progressCallback).toHaveBeenLastCalledWith(100);
    });
  });

  describe('getOfflineSyncStatus', () => {
    it('should return cached sync status', async () => {
      const mockStatus = {
        lastSyncDate: new Date(),
        medicationsCount: 150,
        searchIndexSize: 2048,
        cacheUsage: 75,
        syncInProgress: false,
        nextScheduledSync: new Date(),
      };
      mockCacheService.get.mockResolvedValue(mockStatus);

      const result = await medicationDatabaseService.getOfflineSyncStatus();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockStatus);
    });

    it('should return default status when no cache exists', async () => {
      mockCacheService.get.mockResolvedValue(null);

      const result = await medicationDatabaseService.getOfflineSyncStatus();

      expect(result.success).toBe(true);
      expect(result.data!.lastSyncDate).toEqual(new Date(0));
      expect(result.data!.medicationsCount).toBe(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle cache service errors gracefully', async () => {
      mockCacheService.get.mockRejectedValue(new Error('Cache error'));
      mockMedicationService.searchMedications.mockResolvedValue({
        success: true,
        data: { medications: [] },
      } as any);

      const result = await medicationDatabaseService.searchMedications('test');

      expect(result.success).toBe(true); // Should still work without cache
    });

    it('should handle API service network errors', async () => {
      mockMedicationService.searchMedications.mockRejectedValue(new Error('Network error'));

      const result = await medicationDatabaseService.searchMedications('test');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to search medications');
    });
  });

  describe('Cultural Integration', () => {
    it('should get cultural medication information', async () => {
      mockMedicationService.validateMedicationHalal.mockResolvedValue({
        success: true,
        data: {
          isHalal: true,
          status: 'halal',
          certification: {
            body: 'JAKIM',
            number: 'HALAL001',
          },
          alternatives: [],
        },
      });

      const result = await medicationDatabaseService.getMedicationDetails('med_001', {
        includeCulturalInfo: true,
      });

      expect(result.success).toBe(true);
      expect(result.data!.culturalInfo).toBeDefined();
    });

    it('should provide halal alternatives when medication is not halal', async () => {
      mockMedicationService.validateMedicationHalal.mockResolvedValue({
        success: true,
        data: {
          isHalal: false,
          status: 'haram',
          alternatives: [
            {
              name: 'Alternative Med',
              manufacturer: 'Halal Pharma',
              halal_certified: true,
            },
          ],
        },
      });

      const result = await medicationDatabaseService.getMedicationDetails('med_001', {
        includeCulturalInfo: true,
      });

      expect(result.success).toBe(true);
      expect(result.data!.culturalInfo?.alternatives).toBeDefined();
      expect(result.data!.culturalInfo.alternatives.length).toBeGreaterThan(0);
    });
  });
});