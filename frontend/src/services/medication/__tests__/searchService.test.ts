/**
 * Medication Search Service Tests
 * 
 * Tests for advanced medication search functionality including:
 * - Intelligent autocomplete for Malaysian medications
 * - Fuzzy matching and typo tolerance
 * - Cultural filtering (halal, language preferences)
 * - Malaysian pharmaceutical database integration
 */

import { medicationSearchService } from '../searchService';
import { medicationDatabaseService } from '../databaseService';
import { cacheService } from '../../cache/cacheService';

// Mock dependencies
jest.mock('../databaseService');
jest.mock('../../cache/cacheService');

const mockDatabaseService = medicationDatabaseService as jest.Mocked<typeof medicationDatabaseService>;
const mockCacheService = cacheService as jest.Mocked<typeof cacheService>;

describe('MedicationSearchService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('search', () => {
    const mockSearchResults = {
      success: true,
      data: {
        medications: [
          {
            id: 'med_001',
            name: 'Paracetamol',
            genericName: 'Acetaminophen',
            manufacturer: 'Pharmaniaga',
            availability: 'otc' as const,
          },
        ],
        totalCount: 1,
        searchQuery: 'paracetamol',
        filters: {},
      },
    };

    beforeEach(() => {
      mockDatabaseService.searchMedications.mockResolvedValue(mockSearchResults as any);
      mockCacheService.get.mockResolvedValue(null);
      mockCacheService.set.mockResolvedValue();
    });

    it('should perform basic medication search', async () => {
      const result = await medicationSearchService.search('paracetamol');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.medications).toHaveLength(1);
      expect(result.data!.analytics).toBeDefined();
      expect(result.data!.analytics.query).toBe('paracetamol');
    });

    it('should reject queries that are too short', async () => {
      const result = await medicationSearchService.search('a');

      expect(result.success).toBe(false);
      expect(result.error).toContain('at least 2 characters');
    });

    it('should normalize Malaysian language queries', async () => {
      const result = await medicationSearchService.search('ubat demam', {
        language: 'ms',
      });

      expect(mockDatabaseService.searchMedications).toHaveBeenCalledWith(
        'medication fever', // Should be translated
        expect.any(Object)
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

      const result = await medicationSearchService.search('paracetamol');

      expect(result.success).toBe(true);
      expect(result.data!.medications).toEqual(cachedResult.medications);
      expect(mockDatabaseService.searchMedications).not.toHaveBeenCalled();
    });

    it('should apply cultural filtering', async () => {
      await medicationSearchService.search('paracetamol', {
        halalOnly: true,
        culturalContext: {
          religion: 'Islam',
          dietaryRestrictions: ['haram'],
        },
      });

      expect(mockDatabaseService.searchMedications).toHaveBeenCalledWith(
        'paracetamol',
        expect.objectContaining({
          culturalFilter: {
            halalOnly: true,
            language: undefined,
          },
        })
      );
    });

    it('should filter by manufacturers when specified', async () => {
      mockDatabaseService.searchMedications.mockResolvedValue({
        success: true,
        data: {
          medications: [
            { id: '1', name: 'Med1', manufacturer: 'Pharmaniaga' },
            { id: '2', name: 'Med2', manufacturer: 'Duopharma' },
            { id: '3', name: 'Med3', manufacturer: 'Pharmaniaga' },
          ],
          totalCount: 3,
          searchQuery: 'test',
          filters: {},
        },
      } as any);

      const result = await medicationSearchService.search('test', {
        manufacturers: ['Pharmaniaga'],
      });

      expect(result.success).toBe(true);
      expect(result.data!.medications).toHaveLength(2);
      expect(result.data!.medications.every(med => med.manufacturer === 'Pharmaniaga')).toBe(true);
    });

    it('should filter by prescription requirement', async () => {
      mockDatabaseService.searchMedications.mockResolvedValue({
        success: true,
        data: {
          medications: [
            { id: '1', name: 'Med1', availability: 'prescription' },
            { id: '2', name: 'Med2', availability: 'otc' },
            { id: '3', name: 'Med3', availability: 'prescription' },
          ],
          totalCount: 3,
          searchQuery: 'test',
          filters: {},
        },
      } as any);

      const result = await medicationSearchService.search('test', {
        prescriptionOnly: true,
      });

      expect(result.success).toBe(true);
      expect(result.data!.medications).toHaveLength(2);
      expect(result.data!.medications.every(med => med.availability === 'prescription')).toBe(true);
    });

    it('should apply pagination', async () => {
      mockDatabaseService.searchMedications.mockResolvedValue({
        success: true,
        data: {
          medications: Array(50).fill(0).map((_, i) => ({
            id: `med_${i}`,
            name: `Medication ${i}`,
          })),
          totalCount: 50,
          searchQuery: 'test',
          filters: {},
        },
      } as any);

      const result = await medicationSearchService.search('test', {
        offset: 10,
        limit: 20,
      });

      expect(result.success).toBe(true);
      expect(result.data!.medications).toHaveLength(20);
    });

    it('should sort results by relevance by default', async () => {
      mockDatabaseService.searchMedications.mockResolvedValue({
        success: true,
        data: {
          medications: [
            { id: '1', name: 'Paracetamol', genericName: 'Acetaminophen' },
            { id: '2', name: 'Para Plus', genericName: 'Acetaminophen' },
            { id: '3', name: 'Test Medicine', genericName: 'Other' },
          ],
          totalCount: 3,
          searchQuery: 'para',
          filters: {},
        },
      } as any);

      const result = await medicationSearchService.search('para');

      expect(result.success).toBe(true);
      // Paracetamol should be first (exact start match)
      expect(result.data!.medications[0].name).toBe('Paracetamol');
    });

    it('should track search analytics', async () => {
      const result = await medicationSearchService.search('paracetamol');

      expect(result.success).toBe(true);
      expect(result.data!.analytics).toEqual(
        expect.objectContaining({
          query: 'paracetamol',
          resultsCount: 1,
          searchTime: expect.any(Number),
          timestamp: expect.any(Number),
        })
      );
    });
  });

  describe('getAutocompleteSuggestions', () => {
    beforeEach(() => {
      mockCacheService.get.mockResolvedValue(null);
      mockCacheService.set.mockResolvedValue();
    });

    it('should return empty suggestions for very short queries', async () => {
      const result = await medicationSearchService.getAutocompleteSuggestions('');

      expect(result.success).toBe(true);
      expect(result.data!.suggestions).toHaveLength(0);
      expect(result.data!.totalMatches).toBe(0);
    });

    it('should provide medication name suggestions', async () => {
      const result = await medicationSearchService.getAutocompleteSuggestions('para');

      expect(result.success).toBe(true);
      expect(result.data!.suggestions.length).toBeGreaterThan(0);
      expect(result.data!.suggestions[0].type).toBe('medication');
      expect(result.data!.suggestions[0].confidence).toBeGreaterThan(0);
    });

    it('should include generic name suggestions when enabled', async () => {
      const result = await medicationSearchService.getAutocompleteSuggestions('aceta', {
        includeGeneric: true,
      });

      expect(result.success).toBe(true);
      const genericSuggestions = result.data!.suggestions.filter(s => s.type === 'generic');
      expect(genericSuggestions.length).toBeGreaterThan(0);
    });

    it('should provide manufacturer suggestions', async () => {
      const result = await medicationSearchService.getAutocompleteSuggestions('pharma');

      expect(result.success).toBe(true);
      const manufacturerSuggestions = result.data!.suggestions.filter(s => s.type === 'manufacturer');
      expect(manufacturerSuggestions.length).toBeGreaterThan(0);
    });

    it('should provide category suggestions', async () => {
      const result = await medicationSearchService.getAutocompleteSuggestions('analg');

      expect(result.success).toBe(true);
      const categorySuggestions = result.data!.suggestions.filter(s => s.type === 'category');
      expect(categorySuggestions.length).toBeGreaterThan(0);
    });

    it('should handle Malaysian language aliases', async () => {
      const result = await medicationSearchService.getAutocompleteSuggestions('ubat', {
        language: 'ms',
      });

      expect(result.success).toBe(true);
      expect(result.data!.suggestions.length).toBeGreaterThan(0);
    });

    it('should limit suggestions to maximum count', async () => {
      const result = await medicationSearchService.getAutocompleteSuggestions('a');

      expect(result.success).toBe(true);
      expect(result.data!.suggestions.length).toBeLessThanOrEqual(10); // MAX_AUTOCOMPLETE_RESULTS
    });

    it('should use cached suggestions when available', async () => {
      const cachedSuggestions = {
        suggestions: [
          { text: 'Paracetamol', type: 'medication', confidence: 0.9 },
        ],
        searchTime: 50,
        totalMatches: 1,
        fromCache: false,
      };
      mockCacheService.get.mockResolvedValueOnce(cachedSuggestions);

      const result = await medicationSearchService.getAutocompleteSuggestions('para');

      expect(result.success).toBe(true);
      expect(result.data!.fromCache).toBe(true);
      expect(result.data!.suggestions).toEqual(cachedSuggestions.suggestions);
    });

    it('should sort suggestions by confidence', async () => {
      const result = await medicationSearchService.getAutocompleteSuggestions('para');

      expect(result.success).toBe(true);
      
      // Check that suggestions are sorted by confidence (descending)
      for (let i = 1; i < result.data!.suggestions.length; i++) {
        expect(result.data!.suggestions[i - 1].confidence).toBeGreaterThanOrEqual(
          result.data!.suggestions[i].confidence
        );
      }
    });
  });

  describe('searchByCondition', () => {
    beforeEach(() => {
      // Mock the search method to return medications
      jest.spyOn(medicationSearchService, 'search').mockImplementation(async (query) => ({
        success: true,
        data: {
          medications: [
            {
              id: `med_${query}`,
              name: `Medication for ${query}`,
              genericName: `Generic ${query}`,
              indicationsMs: query,
              indicationsEn: query,
            },
          ],
          totalCount: 1,
          searchQuery: query,
          filters: {},
          analytics: {
            query,
            resultsCount: 1,
            searchTime: 100,
            filters: {},
            timestamp: Date.now(),
          },
        },
      } as any));
    });

    it('should search by Malaysian condition names', async () => {
      const result = await medicationSearchService.searchByCondition('demam');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(medicationSearchService.search).toHaveBeenCalledWith('demam', expect.any(Object));
      // Should also search for English equivalents
      expect(medicationSearchService.search).toHaveBeenCalledWith('fever', expect.any(Object));
    });

    it('should search by English condition names', async () => {
      const result = await medicationSearchService.searchByCondition('headache');

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(medicationSearchService.search).toHaveBeenCalledWith('headache', expect.any(Object));
      // Should also search for Malay equivalents
      expect(medicationSearchService.search).toHaveBeenCalledWith('sakit kepala', expect.any(Object));
    });

    it('should remove duplicate medications from multiple searches', async () => {
      // Mock to return the same medication from different searches
      jest.spyOn(medicationSearchService, 'search').mockImplementation(async () => ({
        success: true,
        data: {
          medications: [
            {
              id: 'med_001',
              name: 'Common Med',
              genericName: 'Common Generic',
              indicationsMs: 'test',
              indicationsEn: 'test',
            },
          ],
          totalCount: 1,
          searchQuery: 'test',
          filters: {},
          analytics: {
            query: 'test',
            resultsCount: 1,
            searchTime: 100,
            filters: {},
            timestamp: Date.now(),
          },
        },
      } as any));

      const result = await medicationSearchService.searchByCondition('demam');

      expect(result.success).toBe(true);
      expect(result.data!.medications).toHaveLength(1); // Should deduplicate
    });

    it('should generate condition-related suggestions', async () => {
      const result = await medicationSearchService.searchByCondition('demam');

      expect(result.success).toBe(true);
      expect(result.data!.suggestions).toBeDefined();
      expect(result.data!.suggestions!.length).toBeGreaterThan(0);
    });
  });

  describe('getPopularMedications', () => {
    beforeEach(() => {
      // Mock search to return different medications for each popular medication
      jest.spyOn(medicationSearchService, 'search').mockImplementation(async (query) => ({
        success: true,
        data: {
          medications: [
            {
              id: `${query}_1`,
              name: `${query} Brand 1`,
              genericName: query,
            },
            {
              id: `${query}_2`,
              name: `${query} Brand 2`,
              genericName: query,
            },
          ],
          totalCount: 2,
          searchQuery: query,
          filters: {},
          analytics: {
            query,
            resultsCount: 2,
            searchTime: 100,
            filters: {},
            timestamp: Date.now(),
          },
        },
      } as any));
    });

    it('should return popular medications for Malaysian market', async () => {
      const result = await medicationSearchService.getPopularMedications();

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.medications.length).toBeGreaterThan(0);
      
      // Should include common Malaysian medications
      expect(medicationSearchService.search).toHaveBeenCalledWith('Paracetamol', expect.any(Object));
      expect(medicationSearchService.search).toHaveBeenCalledWith('Ibuprofen', expect.any(Object));
    });

    it('should apply cultural filtering to popular medications', async () => {
      await medicationSearchService.getPopularMedications({
        halalOnly: true,
        language: 'ms',
      });

      expect(medicationSearchService.search).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          halalOnly: true,
          language: 'ms',
        })
      );
    });

    it('should limit results to specified count', async () => {
      const result = await medicationSearchService.getPopularMedications({
        limit: 5,
      });

      expect(result.success).toBe(true);
      expect(result.data!.medications.length).toBeLessThanOrEqual(5);
    });
  });

  describe('Query Normalization', () => {
    beforeEach(() => {
      mockDatabaseService.searchMedications.mockResolvedValue({
        success: true,
        data: {
          medications: [],
          totalCount: 0,
          searchQuery: '',
          filters: {},
        },
      } as any);
    });

    it('should normalize Malaysian medication terms', async () => {
      await medicationSearchService.search('ubat pil paracetamol', {
        language: 'ms',
      });

      // Should normalize 'ubat pil' to just 'paracetamol'
      expect(mockDatabaseService.searchMedications).toHaveBeenCalledWith(
        'paracetamol', // Normalized query
        expect.any(Object)
      );
    });

    it('should remove common suffixes and prefixes', async () => {
      await medicationSearchService.search('paracetamol tablet 500mg');

      // Should remove 'tablet' and '500mg' suffixes
      expect(mockDatabaseService.searchMedications).toHaveBeenCalledWith(
        'paracetamol',
        expect.any(Object)
      );
    });

    it('should handle mixed language queries', async () => {
      await medicationSearchService.search('ubat headache');

      expect(mockDatabaseService.searchMedications).toHaveBeenCalledWith(
        'medication headache', // 'ubat' translated to 'medication'
        expect.any(Object)
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle database service errors', async () => {
      mockDatabaseService.searchMedications.mockResolvedValue({
        success: false,
        error: 'Database error',
      });

      const result = await medicationSearchService.search('paracetamol');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });

    it('should handle cache service errors gracefully', async () => {
      mockCacheService.get.mockRejectedValue(new Error('Cache error'));
      mockDatabaseService.searchMedications.mockResolvedValue({
        success: true,
        data: {
          medications: [],
          totalCount: 0,
          searchQuery: 'test',
          filters: {},
        },
      } as any);

      const result = await medicationSearchService.search('paracetamol');

      expect(result.success).toBe(true); // Should work without cache
    });

    it('should handle network errors in autocomplete', async () => {
      mockCacheService.get.mockRejectedValue(new Error('Network error'));

      const result = await medicationSearchService.getAutocompleteSuggestions('para');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Autocomplete failed due to network error');
    });
  });

  describe('Performance', () => {
    it('should complete search within reasonable time', async () => {
      const startTime = Date.now();
      
      await medicationSearchService.search('paracetamol');
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should complete autocomplete within reasonable time', async () => {
      const startTime = Date.now();
      
      await medicationSearchService.getAutocompleteSuggestions('para');
      
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(500); // Should complete within 500ms
    });
  });
});