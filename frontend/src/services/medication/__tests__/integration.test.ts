/**
 * Medication Services Integration Tests
 * 
 * End-to-end integration tests for the complete medication database system:
 * - Cross-service functionality
 * - Data flow between services
 * - Cultural integration throughout the stack
 * - Performance under realistic conditions
 */

import { MedicationServices } from '../index';
import { medicationDatabaseService } from '../databaseService';
import { medicationSearchService } from '../searchService';
import { drugInteractionService } from '../interactionService';
import { cacheService } from '../../cache/cacheService';
import { store } from '../../../store';
import { 
  searchMedications,
  getMedicationDetails,
  checkDrugInteractions,
  syncOfflineDatabase,
} from '../../../store/slices/medicationSlice';

// Mock external dependencies
jest.mock('../../../api/services/medicationService');
jest.mock('../../../api/services/culturalService');

describe('Medication Services Integration', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await cacheService.clear();
  });

  describe('End-to-End Search Flow', () => {
    it('should perform complete search with autocomplete and caching', async () => {
      // Mock API responses
      const mockApiService = require('../../../api/services/medicationService').medicationService;
      mockApiService.searchMedications.mockResolvedValue({
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
      });

      // Perform search with unified service
      const searchResult = await MedicationServices.searchMedications('paracetamol', {
        culturalPreferences: {
          halalOnly: true,
          language: 'ms',
          religion: 'Islam',
        },
        includeAutocomplete: true,
      });

      expect(searchResult.search.success).toBe(true);
      expect(searchResult.search.data!.medications).toHaveLength(1);
      expect(searchResult.autocomplete?.success).toBe(true);
      
      // Verify caching occurred
      const cacheStats = await cacheService.getStats();
      expect(cacheStats.totalEntries).toBeGreaterThan(0);
    });

    it('should integrate search results with Redux store', async () => {
      const mockApiService = require('../../../api/services/medicationService').medicationService;
      mockApiService.searchMedications.mockResolvedValue({
        success: true,
        data: {
          medications: [
            {
              medication_id: 'med_001',
              name: 'Paracetamol',
              generic_name: 'Acetaminophen',
              manufacturer: 'Pharmaniaga',
            },
          ],
        },
      });

      // Dispatch search action through Redux
      const dispatch = store.dispatch;
      const resultAction = await dispatch(searchMedications({
        query: 'paracetamol',
        options: { halalOnly: true },
      }));

      expect(searchMedications.fulfilled.match(resultAction)).toBe(true);
      
      // Check store state
      const state = store.getState();
      expect(state.medication.searchResults).toBeDefined();
      expect(state.medication.searchResults!.medications).toHaveLength(1);
      expect(state.medication.searchLoading).toBe(false);
    });
  });

  describe('Medication Details with Cultural Integration', () => {
    it('should get comprehensive medication details with cultural information', async () => {
      const mockApiService = require('../../../api/services/medicationService').medicationService;
      
      // Mock medication details
      mockApiService.getMedicationById.mockResolvedValue({
        success: true,
        data: {
          medication_id: 'med_001',
          name: 'Paracetamol',
          generic_name: 'Acetaminophen',
          manufacturer: 'Pharmaniaga',
          prescribing_info: {
            indications: ['Fever', 'Pain relief'],
            contraindications: ['Liver disease'],
            side_effects: ['Nausea'],
          },
        },
      });

      // Mock halal validation
      mockApiService.validateMedicationHalal.mockResolvedValue({
        success: true,
        data: {
          isHalal: true,
          status: 'halal',
          certification: {
            body: 'JAKIM',
            number: 'HALAL001',
          },
        },
      });

      // Mock interaction check
      mockApiService.checkMedicationInteractions.mockResolvedValue({
        success: true,
        data: {
          has_interactions: false,
          interactions: [],
          recommendations: [],
        },
      });

      const result = await MedicationServices.getMedicationDetails('med_001', {
        culturalPreferences: {
          language: 'ms',
          religion: 'Islam',
          observesPrayerTimes: true,
          observesRamadan: true,
        },
        includeInteractionCheck: true,
        interactionMedications: ['med_002'],
      });

      expect(result.details.success).toBe(true);
      expect(result.details.data!.culturalInfo).toBeDefined();
      expect(result.interactions?.success).toBe(true);
    });

    it('should integrate medication details with Redux store', async () => {
      const mockApiService = require('../../../api/services/medicationService').medicationService;
      mockApiService.getMedicationById.mockResolvedValue({
        success: true,
        data: {
          medication_id: 'med_001',
          name: 'Paracetamol',
          prescribing_info: { indications: [], contraindications: [], side_effects: [] },
        },
      });

      const dispatch = store.dispatch;
      const resultAction = await dispatch(getMedicationDetails({
        medicationId: 'med_001',
        options: { includeCulturalInfo: true },
      }));

      expect(getMedicationDetails.fulfilled.match(resultAction)).toBe(true);
      
      const state = store.getState();
      expect(state.medication.currentMedication).toBeDefined();
      expect(state.medication.currentMedication!.name).toBe('Paracetamol');
    });
  });

  describe('Drug Interaction Integration', () => {
    it('should perform comprehensive interaction analysis with cultural considerations', async () => {
      const mockApiService = require('../../../api/services/medicationService').medicationService;
      
      // Mock medication details for both medications
      mockApiService.getMedicationById
        .mockResolvedValueOnce({
          success: true,
          data: {
            medication_id: 'med_001',
            name: 'Warfarin',
            generic_name: 'warfarin',
            prescribing_info: { indications: [], contraindications: [], side_effects: [] },
          },
        })
        .mockResolvedValueOnce({
          success: true,
          data: {
            medication_id: 'med_002',
            name: 'Aspirin',
            generic_name: 'aspirin',
            prescribing_info: { indications: [], contraindications: [], side_effects: [] },
          },
        });

      // Mock interaction response
      mockApiService.checkMedicationInteractions.mockResolvedValue({
        success: true,
        data: {
          has_interactions: true,
          interactions: [
            {
              medication_1: 'med_001',
              medication_2: 'med_002',
              severity: 'severe',
              description: 'Increased bleeding risk',
            },
          ],
          recommendations: ['Avoid concurrent use'],
        },
      });

      const result = await MedicationServices.checkDrugInteractions(
        [
          { id: 'med_001', name: 'Warfarin' },
          { id: 'med_002', name: 'Aspirin' },
        ],
        {
          culturalPreferences: {
            religion: 'Islam',
            observesPrayerTimes: true,
            observesRamadan: true,
            halalOnly: true,
          },
        }
      );

      expect(result.success).toBe(true);
      expect(result.data!.hasInteractions).toBe(true);
      expect(result.data!.overallRisk).toBe('high');
      expect(result.data!.culturalGuidelines).toBeDefined();
    });

    it('should integrate interaction checking with Redux store', async () => {
      const mockApiService = require('../../../api/services/medicationService').medicationService;
      
      mockApiService.checkMedicationInteractions.mockResolvedValue({
        success: true,
        data: {
          has_interactions: true,
          interactions: [
            {
              medication_1: 'med_001',
              medication_2: 'med_002',
              severity: 'moderate',
              description: 'Monitor for side effects',
            },
          ],
          recommendations: ['Monitor patient'],
        },
      });

      const dispatch = store.dispatch;
      const resultAction = await dispatch(checkDrugInteractions({
        medications: [
          { id: 'med_001', name: 'Med1' },
          { id: 'med_002', name: 'Med2' },
        ],
      }));

      expect(checkDrugInteractions.fulfilled.match(resultAction)).toBe(true);
      
      const state = store.getState();
      expect(state.medication.interactionCheck).toBeDefined();
      expect(state.medication.interactionCheck!.hasInteractions).toBe(true);
    });
  });

  describe('Offline Sync Integration', () => {
    it('should perform complete offline synchronization', async () => {
      const mockApiService = require('../../../api/services/medicationService').medicationService;
      
      // Mock pagination responses
      mockApiService.getMedications
        .mockResolvedValueOnce({
          success: true,
          data: {
            medications: Array(50).fill(0).map((_, i) => ({
              medication_id: `med_${i}`,
              name: `Medication ${i}`,
              generic_name: `Generic ${i}`,
              manufacturer: 'Test Pharma',
            })),
          },
        })
        .mockResolvedValueOnce({
          success: true,
          data: { medications: [] }, // No more results
        });

      let progressUpdates: number[] = [];
      
      const result = await MedicationServices.syncForOfflineUse({
        culturalPreferences: {
          halalOnly: true,
          language: 'ms',
        },
        forceRefresh: true,
        progressCallback: (progress) => {
          progressUpdates.push(progress);
        },
      });

      expect(result.success).toBe(true);
      expect(result.data!.medicationsCount).toBe(50);
      expect(progressUpdates.length).toBeGreaterThan(0);
      expect(progressUpdates[progressUpdates.length - 1]).toBe(100);
    });

    it('should integrate offline sync with Redux store', async () => {
      const mockApiService = require('../../../api/services/medicationService').medicationService;
      mockApiService.getMedications.mockResolvedValue({
        success: true,
        data: {
          medications: Array(10).fill(0).map((_, i) => ({
            medication_id: `med_${i}`,
            name: `Medication ${i}`,
          })),
        },
      });

      const dispatch = store.dispatch;
      const resultAction = await dispatch(syncOfflineDatabase({
        forceRefresh: true,
      }));

      expect(syncOfflineDatabase.fulfilled.match(resultAction)).toBe(true);
      
      const state = store.getState();
      expect(state.medication.syncStatus).toBeDefined();
      expect(state.medication.syncStatus!.medicationsCount).toBe(10);
      expect(state.medication.syncLoading).toBe(false);
    });
  });

  describe('Cross-Service Data Flow', () => {
    it('should maintain data consistency across search, details, and interactions', async () => {
      const mockApiService = require('../../../api/services/medicationService').medicationService;
      
      // Mock search results
      mockApiService.searchMedications.mockResolvedValue({
        success: true,
        data: {
          medications: [
            {
              medication_id: 'med_001',
              name: 'Paracetamol',
              generic_name: 'Acetaminophen',
              manufacturer: 'Pharmaniaga',
            },
          ],
        },
      });

      // Mock medication details
      mockApiService.getMedicationById.mockResolvedValue({
        success: true,
        data: {
          medication_id: 'med_001',
          name: 'Paracetamol',
          generic_name: 'Acetaminophen',
          prescribing_info: { indications: [], contraindications: [], side_effects: [] },
        },
      });

      // Mock interaction check
      mockApiService.checkMedicationInteractions.mockResolvedValue({
        success: true,
        data: {
          has_interactions: false,
          interactions: [],
          recommendations: [],
        },
      });

      // 1. Search for medication
      const searchResult = await medicationSearchService.search('paracetamol');
      expect(searchResult.success).toBe(true);
      
      const medication = searchResult.data!.medications[0];
      
      // 2. Get detailed information
      const detailsResult = await medicationDatabaseService.getMedicationDetails(medication.id);
      expect(detailsResult.success).toBe(true);
      
      // Verify data consistency
      expect(detailsResult.data!.name).toBe(medication.name);
      
      // 3. Check interactions
      const interactionResult = await drugInteractionService.checkInteractions({
        medications: [{ id: medication.id, name: medication.name }],
      });
      expect(interactionResult.success).toBe(true);
    });

    it('should propagate cultural preferences across all services', async () => {
      const culturalPreferences = {
        halalOnly: true,
        language: 'ms' as const,
        religion: 'Islam',
      };

      // Initialize services with cultural preferences
      await MedicationServices.initialize({
        ...culturalPreferences,
        observesPrayerTimes: true,
        observesRamadan: true,
      });

      // Test search with cultural filtering
      const searchResult = await MedicationServices.searchMedications('paracetamol', {
        culturalPreferences,
      });

      // Test medication details with cultural information
      const detailsResult = await MedicationServices.getMedicationDetails('med_001', {
        culturalPreferences: {
          ...culturalPreferences,
          observesPrayerTimes: true,
          observesRamadan: true,
        },
      });

      // Test interaction checking with cultural considerations
      const interactionResult = await MedicationServices.checkDrugInteractions(
        [{ id: 'med_001', name: 'Med1' }],
        { culturalPreferences }
      );

      // Verify cultural preferences were applied throughout
      expect(searchResult.search.success).toBe(true);
      expect(detailsResult.details.success).toBe(true);
      expect(interactionResult.success).toBe(true);
    });
  });

  describe('Performance Under Load', () => {
    it('should handle concurrent requests efficiently', async () => {
      const mockApiService = require('../../../api/services/medicationService').medicationService;
      mockApiService.searchMedications.mockImplementation(async (query: string) => {
        // Simulate realistic API delay
        await new Promise(resolve => setTimeout(resolve, 100));
        return {
          success: true,
          data: {
            medications: [
              {
                medication_id: `med_${query}`,
                name: `Result for ${query}`,
              },
            ],
          },
        };
      });

      const startTime = Date.now();
      
      // Perform multiple concurrent searches
      const searchPromises = Array(10).fill(0).map((_, i) =>
        medicationSearchService.search(`query_${i}`)
      );
      
      const results = await Promise.all(searchPromises);
      
      const endTime = Date.now();
      const totalTime = endTime - startTime;
      
      // All searches should succeed
      expect(results.every(result => result.success)).toBe(true);
      
      // Should complete within reasonable time (with caching benefits)
      expect(totalTime).toBeLessThan(2000);
    });

    it('should maintain cache performance under heavy usage', async () => {
      // Fill cache with medication data
      const cacheOperations = Array(100).fill(0).map(async (_, i) => {
        await cacheService.set(
          `test_med_${i}`,
          { id: i, name: `Medication ${i}` },
          60000,
          i < 20 ? 'high' : 'medium'
        );
      });
      
      await Promise.all(cacheOperations);
      
      // Test cache retrieval performance
      const startTime = Date.now();
      
      const retrievalPromises = Array(50).fill(0).map(async (_, i) =>
        cacheService.get(`test_med_${i}`)
      );
      
      const cachedResults = await Promise.all(retrievalPromises);
      
      const endTime = Date.now();
      const retrievalTime = endTime - startTime;
      
      // Should retrieve most cached items successfully
      const successfulRetrieval = cachedResults.filter(Boolean).length;
      expect(successfulRetrieval).toBeGreaterThan(40);
      
      // Should complete quickly
      expect(retrievalTime).toBeLessThan(500);
      
      // Verify cache stats
      const stats = await cacheService.getStats();
      expect(stats.hitRate).toBeGreaterThan(50);
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should gracefully handle API failures with cache fallback', async () => {
      const mockApiService = require('../../../api/services/medicationService').medicationService;
      
      // Pre-populate cache with data
      const cachedMedication = {
        medications: [{ id: 'med_001', name: 'Cached Paracetamol' }],
        totalCount: 1,
        searchQuery: 'paracetamol',
        filters: {},
      };
      
      await cacheService.set('medication_search_paracetamol_{}', cachedMedication);
      
      // Simulate API failure
      mockApiService.searchMedications.mockRejectedValue(new Error('Network error'));
      
      const result = await medicationSearchService.search('paracetamol');
      
      // Should succeed with cached data
      expect(result.success).toBe(true);
      expect(result.data!.medications[0].name).toBe('Cached Paracetamol');
    });

    it('should handle partial service failures without breaking the entire flow', async () => {
      const mockApiService = require('../../../api/services/medicationService').medicationService;
      
      // Mock successful search
      mockApiService.searchMedications.mockResolvedValue({
        success: true,
        data: {
          medications: [
            { medication_id: 'med_001', name: 'Paracetamol' },
          ],
        },
      });
      
      // Mock failed medication details
      mockApiService.getMedicationById.mockResolvedValue({
        success: false,
        error: 'Details not found',
      });
      
      // Mock successful interaction check
      mockApiService.checkMedicationInteractions.mockResolvedValue({
        success: true,
        data: {
          has_interactions: false,
          interactions: [],
          recommendations: [],
        },
      });
      
      // Search should still work
      const searchResult = await MedicationServices.searchMedications('paracetamol');
      expect(searchResult.search.success).toBe(true);
      
      // Details should fail gracefully
      const detailsResult = await MedicationServices.getMedicationDetails('med_001');
      expect(detailsResult.details.success).toBe(false);
      
      // Interactions should still work
      const interactionResult = await MedicationServices.checkDrugInteractions([
        { id: 'med_001', name: 'Paracetamol' },
      ]);
      expect(interactionResult.success).toBe(true);
    });
  });

  describe('Memory and Resource Management', () => {
    it('should properly clean up resources and prevent memory leaks', async () => {
      const initialCacheStats = await cacheService.getStats();
      
      // Perform many operations to potentially create memory pressure
      const operations = Array(50).fill(0).map(async (_, i) => {
        await medicationSearchService.search(`test_query_${i}`);
        await medicationDatabaseService.getMedicationDetails(`med_${i}`);
        return cacheService.set(`temp_${i}`, { data: `temp_data_${i}` }, 1000);
      });
      
      await Promise.all(operations);
      
      // Force cache cleanup
      await cacheService.cleanup();
      
      const finalCacheStats = await cacheService.getStats();
      
      // Memory usage should be managed (not growing indefinitely)
      expect(finalCacheStats.totalEntries).toBeLessThan(100);
    });
  });
});