/**
 * Comprehensive tests for MedicationService
 * Tests Malaysian drug database integration, cultural considerations, and OCR processing
 */

import { MedicationService } from '../MedicationService';
import { DatabaseService } from '../../database/databaseService';
import { CacheService } from '../../cache/redisService';
import {
  Medication,
  MedicationStatus,
  MedicationCategory,
  OCRResult,
  MedicationSearchParams
} from '../../../types/medication/medication.types';

// Mock dependencies
jest.mock('../../database/databaseService');
jest.mock('../../cache/redisService');

describe('MedicationService', () => {
  let medicationService: MedicationService;
  let mockDb: jest.Mocked<DatabaseService>;
  let mockCache: jest.Mocked<CacheService>;

  const mockUserId = 'user-123';
  const mockMedicationId = 'med-456';

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock database
    mockDb = {
      query: jest.fn(),
      one: jest.fn(),
      oneOrNone: jest.fn(),
      any: jest.fn(),
      none: jest.fn(),
      tx: jest.fn()
    } as any;

    // Setup mock cache
    mockCache = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn()
    } as any;

    // Mock getInstance methods
    (DatabaseService.getInstance as jest.Mock).mockReturnValue(mockDb);
    (CacheService.getInstance as jest.Mock).mockReturnValue(mockCache);

    medicationService = MedicationService.getInstance();
  });

  describe('getUserMedications', () => {
    const mockMedicationRows = [
      {
        id: 'med-1',
        user_id: mockUserId,
        name: 'Paracetamol',
        generic_name: 'Acetaminophen',
        brand_name: 'Panadol',
        dosage_amount: 500,
        dosage_unit: 'mg',
        dosage_form: 'tablet',
        dosage_strength: '500mg',
        dosage_instructions: 'Take with water',
        schedule_frequency: 'twice_daily',
        schedule_times: '["08:00", "20:00"]',
        schedule_duration: null,
        cultural_take_with_food: true,
        cultural_avoid_fasting: false,
        cultural_prayer_considerations: '["avoid_prayer_times"]',
        status: 'active',
        category: 'otc',
        prescription_info: null,
        ocr_data: null,
        images: '[]',
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
        moh_registration: 'MAL12345678',
        dca_registration: null,
        local_manufacturer: 'Local Pharma Sdn Bhd',
        availability: 'widely_available',
        halal_certified: true,
        pricing_info: null,
        local_alternatives: ['Fevadol', 'Acetaminophen Generic']
      }
    ];

    it('should retrieve user medications successfully', async () => {
      mockDb.query.mockResolvedValue(mockMedicationRows);
      mockDb.one.mockResolvedValue({ total: '1' });

      const result = await medicationService.getUserMedications(mockUserId, {
        status: 'active',
        page: 1,
        limit: 20
      });

      expect(result.medications).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.medications[0].name).toBe('Paracetamol');
      expect(result.medications[0].malaysianInfo.mohRegistration).toBe('MAL12345678');
      expect(result.medications[0].cultural.takeWithFood).toBe(true);
    });

    it('should handle pagination correctly', async () => {
      mockDb.query.mockResolvedValue(mockMedicationRows);
      mockDb.one.mockResolvedValue({ total: '25' });

      const result = await medicationService.getUserMedications(mockUserId, {
        page: 2,
        limit: 10
      });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $2 OFFSET $3'),
        expect.arrayContaining([mockUserId, 10, 10])
      );
    });

    it('should filter by status correctly', async () => {
      mockDb.query.mockResolvedValue([]);
      mockDb.one.mockResolvedValue({ total: '0' });

      await medicationService.getUserMedications(mockUserId, {
        status: 'inactive'
      });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('AND m.status = $2'),
        expect.arrayContaining([mockUserId, 'inactive'])
      );
    });

    it('should handle database errors gracefully', async () => {
      mockDb.query.mockRejectedValue(new Error('Database connection error'));

      await expect(
        medicationService.getUserMedications(mockUserId)
      ).rejects.toThrow('Failed to retrieve user medications: Database connection error');
    });
  });

  describe('getMedicationById', () => {
    it('should return cached medication if available', async () => {
      const cachedMedication = { id: mockMedicationId, name: 'Cached Med' };
      mockCache.get.mockResolvedValue(JSON.stringify(cachedMedication));

      const result = await medicationService.getMedicationById(mockMedicationId, mockUserId);

      expect(result).toEqual(cachedMedication);
      expect(mockDb.oneOrNone).not.toHaveBeenCalled();
    });

    it('should fetch from database and cache if not in cache', async () => {
      mockCache.get.mockResolvedValue(null);
      mockDb.oneOrNone.mockResolvedValue(mockMedicationRows[0]);

      const result = await medicationService.getMedicationById(mockMedicationId, mockUserId);

      expect(result).toBeTruthy();
      expect(result?.name).toBe('Paracetamol');
      expect(mockCache.set).toHaveBeenCalledWith(
        `medication:${mockMedicationId}:${mockUserId}`,
        expect.any(String),
        300
      );
    });

    it('should return null if medication not found', async () => {
      mockCache.get.mockResolvedValue(null);
      mockDb.oneOrNone.mockResolvedValue(null);

      const result = await medicationService.getMedicationById(mockMedicationId, mockUserId);

      expect(result).toBeNull();
    });
  });

  describe('createMedication', () => {
    const mockMedicationData = {
      userId: mockUserId,
      name: 'New Medication',
      genericName: 'Generic Name',
      brandName: 'Brand Name',
      dosage: {
        amount: 250,
        unit: 'mg' as const,
        form: 'tablet' as const,
        strength: '250mg',
        instructions: 'Take as directed'
      },
      schedule: {
        frequency: 'daily' as const,
        times: ['08:00'],
        culturalAdjustments: {
          prayerTimeBuffer: 15,
          takeWithFood: false,
          avoidDuringFasting: false,
          prayerTimeConsiderations: []
        }
      },
      cultural: {
        takeWithFood: false,
        avoidDuringFasting: false,
        prayerTimeConsiderations: [],
        halalStatus: {
          isHalal: true,
          concerns: []
        },
        languagePreference: 'ms' as const
      },
      images: [],
      status: 'active' as MedicationStatus,
      category: 'prescription' as MedicationCategory,
      malaysianInfo: {
        availability: 'widely_available' as const,
        halalCertified: true,
        localAlternatives: []
      }
    };

    it('should create medication successfully with validation', async () => {
      // Mock database transaction
      const mockTx = {
        one: jest.fn().mockResolvedValue({ id: mockMedicationId, ...mockMedicationData }),
        none: jest.fn().mockResolvedValue(undefined)
      };
      mockDb.tx.mockImplementation((callback) => callback(mockTx));

      // Mock validation
      jest.spyOn(medicationService, 'validateAgainstMalaysianDatabase').mockResolvedValue({
        isValid: true,
        confidence: 0.95,
        matchedMedication: {
          id: 'db-med-1',
          name: 'Matched Medication',
          genericName: 'Generic Name',
          brandNames: ['Brand Name'],
          manufacturer: 'Test Pharma',
          mohRegistration: 'MAL12345678',
          halalCertified: true,
          availability: 'widely_available',
          dosageForms: ['tablet'],
          strengths: ['250mg'],
          interactions: [],
          sideEffects: [],
          contraindications: [],
          instructions: { ms: 'Ambil seperti yang diarahkan', en: 'Take as directed' },
          culturalInfo: {
            takeWithFood: false,
            ramadanCompliant: true,
            prayerTimeConsiderations: [],
            traditionalAlternatives: []
          }
        },
        suggestions: [],
        warnings: [],
        culturalConsiderations: []
      });

      const result = await medicationService.createMedication(mockMedicationData);

      expect(result).toBeTruthy();
      expect(result.name).toBe('New Medication');
      expect(mockCache.del).toHaveBeenCalledWith(`user_medications:${mockUserId}`);
    });

    it('should handle validation failures gracefully', async () => {
      jest.spyOn(medicationService, 'validateAgainstMalaysianDatabase').mockResolvedValue({
        isValid: false,
        confidence: 0.1,
        suggestions: [],
        warnings: ['Medication not found in database'],
        culturalConsiderations: []
      });

      // Mock transaction to still succeed even with validation warnings
      const mockTx = {
        one: jest.fn().mockResolvedValue({ id: mockMedicationId, ...mockMedicationData }),
        none: jest.fn().mockResolvedValue(undefined)
      };
      mockDb.tx.mockImplementation((callback) => callback(mockTx));

      const result = await medicationService.createMedication(mockMedicationData);

      expect(result).toBeTruthy();
    });

    it('should handle database transaction failures', async () => {
      mockDb.tx.mockRejectedValue(new Error('Transaction failed'));

      await expect(
        medicationService.createMedication(mockMedicationData)
      ).rejects.toThrow('Failed to create medication: Transaction failed');
    });
  });

  describe('searchMalaysianDrugDatabase', () => {
    const mockSearchParams: MedicationSearchParams = {
      query: 'paracetamol',
      halalOnly: true,
      type: 'generic'
    };

    const mockSearchResults = [
      {
        id: 'drug-1',
        name: 'Paracetamol',
        generic_name: 'Acetaminophen',
        manufacturer: 'Local Pharma',
        moh_registration: 'MAL12345678',
        halal_certified: true,
        availability: 'widely_available',
        brand_names: ['Panadol', 'Fevadol'],
        dosage_forms: ['tablet', 'liquid'],
        strengths: ['500mg', '250mg'],
        interactions: '[]',
        side_effects: '["nausea", "dizziness"]',
        contraindications: '[]',
        instructions: '{"ms": "Ambil dengan air", "en": "Take with water"}',
        pricing_info: null,
        take_with_food: false,
        ramadan_compliant: true,
        prayer_considerations: '[]',
        traditional_alternatives: '[]'
      }
    ];

    it('should return cached search results if available', async () => {
      const cacheKey = `drug_search:${JSON.stringify(mockSearchParams)}`;
      mockCache.get.mockResolvedValue(JSON.stringify(mockSearchResults));

      const results = await medicationService.searchMalaysianDrugDatabase(mockSearchParams);

      expect(results).toHaveLength(1);
      expect(results[0].name).toBe('Paracetamol');
      expect(mockDb.any).not.toHaveBeenCalled();
    });

    it('should search database and cache results', async () => {
      mockCache.get.mockResolvedValue(null);
      mockDb.any.mockResolvedValue(mockSearchResults);

      const results = await medicationService.searchMalaysianDrugDatabase(mockSearchParams);

      expect(results).toHaveLength(1);
      expect(results[0].halalCertified).toBe(true);
      expect(mockCache.set).toHaveBeenCalled();
    });

    it('should handle halal-only filtering', async () => {
      mockCache.get.mockResolvedValue(null);
      mockDb.any.mockResolvedValue(mockSearchResults);

      await medicationService.searchMalaysianDrugDatabase({
        ...mockSearchParams,
        halalOnly: true
      });

      expect(mockDb.any).toHaveBeenCalledWith(
        expect.stringContaining('AND mdd.halal_certified = true'),
        expect.any(Array)
      );
    });

    it('should handle generic type filtering', async () => {
      mockCache.get.mockResolvedValue(null);
      mockDb.any.mockResolvedValue(mockSearchResults);

      await medicationService.searchMalaysianDrugDatabase({
        ...mockSearchParams,
        type: 'generic'
      });

      expect(mockDb.any).toHaveBeenCalledWith(
        expect.stringContaining('AND mdd.generic_name IS NOT NULL'),
        expect.any(Array)
      );
    });

    it('should handle search errors gracefully', async () => {
      mockCache.get.mockResolvedValue(null);
      mockDb.any.mockRejectedValue(new Error('Search failed'));

      await expect(
        medicationService.searchMalaysianDrugDatabase(mockSearchParams)
      ).rejects.toThrow('Failed to search Malaysian drug database: Search failed');
    });
  });

  describe('createMedicationFromOCR', () => {
    const mockOCRResult: OCRResult = {
      confidence: 0.85,
      extractedText: 'PARACETAMOL 500mg\nTake twice daily with food',
      medicationName: 'Paracetamol',
      dosageInfo: '500mg',
      instructions: 'Take twice daily with food',
      language: 'en',
      boundingBoxes: [],
      culturalPatterns: {
        halalIndicators: ['JAKIM Halal'],
        manufacturerInfo: 'Local Pharma Sdn Bhd',
        registrationNumbers: ['MAL12345678']
      }
    };

    it('should create medication from OCR results successfully', async () => {
      // Mock findGenericName
      jest.spyOn(medicationService as any, 'findGenericName').mockResolvedValue('Acetaminophen');

      // Mock createMedication
      const mockCreatedMedication = {
        id: mockMedicationId,
        userId: mockUserId,
        name: 'Paracetamol',
        genericName: 'Acetaminophen',
        ocrData: mockOCRResult,
        dosage: {
          amount: 500,
          unit: 'mg',
          form: 'tablet',
          instructions: 'Take twice daily with food'
        }
      };

      jest.spyOn(medicationService, 'createMedication').mockResolvedValue(mockCreatedMedication as any);

      const result = await medicationService.createMedicationFromOCR(mockOCRResult, mockUserId);

      expect(result).toBeTruthy();
      expect(result.name).toBe('Paracetamol');
      expect(result.ocrData).toEqual(mockOCRResult);
      expect(result.cultural.halalStatus.isHalal).toBe(true); // Because halal indicators found
    });

    it('should extract dosage information correctly from OCR', async () => {
      const ocrWithComplexDosage: OCRResult = {
        ...mockOCRResult,
        extractedText: 'MEDICATION XYZ\nDos: 250mg tablet\nAmbil 2 kali sehari',
        dosageInfo: '250mg tablet'
      };

      jest.spyOn(medicationService as any, 'findGenericName').mockResolvedValue(undefined);
      jest.spyOn(medicationService, 'createMedication').mockResolvedValue({
        id: mockMedicationId,
        dosage: { amount: 250, unit: 'mg', form: 'tablet' }
      } as any);

      const result = await medicationService.createMedicationFromOCR(ocrWithComplexDosage, mockUserId);

      expect(medicationService.createMedication).toHaveBeenCalledWith(
        expect.objectContaining({
          dosage: expect.objectContaining({
            amount: 250,
            unit: 'mg',
            form: 'tablet'
          })
        })
      );
    });

    it('should handle OCR with mixed languages', async () => {
      const mixedLanguageOCR: OCRResult = {
        ...mockOCRResult,
        extractedText: 'PARACETAMOL 500mg\nAmbil dengan makanan\nTake with food',
        language: 'mixed'
      };

      jest.spyOn(medicationService as any, 'findGenericName').mockResolvedValue('Acetaminophen');
      jest.spyOn(medicationService, 'createMedication').mockResolvedValue({
        id: mockMedicationId,
        cultural: { languagePreference: 'ms' }
      } as any);

      await medicationService.createMedicationFromOCR(mixedLanguageOCR, mockUserId);

      expect(medicationService.createMedication).toHaveBeenCalledWith(
        expect.objectContaining({
          cultural: expect.objectContaining({
            languagePreference: 'ms' // Should default to Malay for mixed content
          })
        })
      );
    });
  });

  describe('validateAgainstMalaysianDatabase', () => {
    const mockMedication: Medication = {
      id: mockMedicationId,
      userId: mockUserId,
      name: 'Paracetamol',
      genericName: 'Acetaminophen',
      dosage: {
        amount: 500,
        unit: 'mg',
        form: 'tablet',
        instructions: 'Take as directed'
      },
      schedule: {
        frequency: 'daily',
        times: ['08:00'],
        culturalAdjustments: {
          prayerTimeBuffer: 15,
          takeWithFood: false,
          avoidDuringFasting: false,
          prayerTimeConsiderations: []
        }
      },
      cultural: {
        takeWithFood: false,
        avoidDuringFasting: false,
        prayerTimeConsiderations: [],
        halalStatus: { isHalal: true, concerns: [] },
        languagePreference: 'ms'
      },
      images: [],
      status: 'active',
      category: 'otc',
      malaysianInfo: {
        availability: 'widely_available',
        halalCertified: true,
        localAlternatives: []
      },
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z'
    };

    it('should validate exact matches successfully', async () => {
      const mockSearchResults = [
        {
          id: 'drug-1',
          name: 'Paracetamol',
          genericName: 'Acetaminophen',
          brandNames: ['Panadol'],
          manufacturer: 'Test Pharma',
          mohRegistration: 'MAL12345678',
          halalCertified: true,
          availability: 'widely_available',
          dosageForms: ['tablet'],
          strengths: ['500mg'],
          interactions: [],
          sideEffects: [],
          contraindications: [],
          instructions: { ms: 'Test', en: 'Test' },
          culturalInfo: {
            takeWithFood: false,
            ramadanCompliant: true,
            prayerTimeConsiderations: [],
            traditionalAlternatives: []
          }
        }
      ];

      jest.spyOn(medicationService, 'searchMalaysianDrugDatabase').mockResolvedValue(mockSearchResults);

      const result = await medicationService.validateAgainstMalaysianDatabase(mockMedication);

      expect(result.isValid).toBe(true);
      expect(result.confidence).toBeGreaterThan(0.9);
      expect(result.matchedMedication).toEqual(mockSearchResults[0]);
    });

    it('should handle no matches found', async () => {
      jest.spyOn(medicationService, 'searchMalaysianDrugDatabase').mockResolvedValue([]);

      const result = await medicationService.validateAgainstMalaysianDatabase(mockMedication);

      expect(result.isValid).toBe(false);
      expect(result.confidence).toBe(0);
      expect(result.warnings).toContain('Medication not found in Malaysian drug database');
    });

    it('should handle partial matches with suggestions', async () => {
      const partialMatches = [
        {
          id: 'drug-1',
          name: 'Paracetamol Extra',
          genericName: 'Acetaminophen',
          brandNames: [],
          manufacturer: 'Test Pharma',
          mohRegistration: 'MAL12345678',
          halalCertified: false,
          availability: 'limited',
          dosageForms: [],
          strengths: [],
          interactions: [],
          sideEffects: [],
          contraindications: [],
          instructions: { ms: '', en: '' },
          culturalInfo: {
            takeWithFood: false,
            ramadanCompliant: true,
            prayerTimeConsiderations: [],
            traditionalAlternatives: []
          }
        }
      ];

      jest.spyOn(medicationService, 'searchMalaysianDrugDatabase').mockResolvedValue(partialMatches);

      const result = await medicationService.validateAgainstMalaysianDatabase(mockMedication);

      expect(result.isValid).toBe(false);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.suggestions).toEqual(partialMatches.slice(0, 5));
      expect(result.warnings).toContain('Exact match not found, similar medications available');
    });

    it('should handle validation errors gracefully', async () => {
      jest.spyOn(medicationService, 'searchMalaysianDrugDatabase').mockRejectedValue(
        new Error('Database search failed')
      );

      await expect(
        medicationService.validateAgainstMalaysianDatabase(mockMedication)
      ).rejects.toThrow('Failed to validate medication: Database search failed');
    });
  });

  describe('updateMedication', () => {
    const updates = {
      name: 'Updated Medication Name',
      status: 'inactive' as MedicationStatus,
      dosage: {
        amount: 250,
        unit: 'mg' as const,
        form: 'tablet' as const,
        instructions: 'Updated instructions'
      }
    };

    it('should update medication successfully', async () => {
      const updatedRow = {
        ...mockMedicationRows[0],
        name: updates.name,
        status: updates.status,
        updated_at: new Date().toISOString()
      };

      mockDb.oneOrNone.mockResolvedValue(updatedRow);

      const result = await medicationService.updateMedication(mockMedicationId, mockUserId, updates);

      expect(result).toBeTruthy();
      expect(result.name).toBe(updates.name);
      expect(result.status).toBe(updates.status);
      expect(mockCache.del).toHaveBeenCalledWith(`medication:${mockMedicationId}:${mockUserId}`);
      expect(mockCache.del).toHaveBeenCalledWith(`user_medications:${mockUserId}`);
    });

    it('should throw error if medication not found', async () => {
      mockDb.oneOrNone.mockResolvedValue(null);

      await expect(
        medicationService.updateMedication(mockMedicationId, mockUserId, updates)
      ).rejects.toThrow('Failed to update medication: Medication not found or unauthorized');
    });

    it('should throw error if no valid fields to update', async () => {
      await expect(
        medicationService.updateMedication(mockMedicationId, mockUserId, {})
      ).rejects.toThrow('No valid fields to update');
    });
  });

  describe('deleteMedication', () => {
    it('should delete medication successfully', async () => {
      mockDb.oneOrNone.mockResolvedValue({ id: mockMedicationId });

      const result = await medicationService.deleteMedication(mockMedicationId, mockUserId);

      expect(result).toBe(true);
      expect(mockCache.del).toHaveBeenCalledWith(`medication:${mockMedicationId}:${mockUserId}`);
      expect(mockCache.del).toHaveBeenCalledWith(`user_medications:${mockUserId}`);
    });

    it('should return false if medication not found', async () => {
      mockDb.oneOrNone.mockResolvedValue(null);

      const result = await medicationService.deleteMedication(mockMedicationId, mockUserId);

      expect(result).toBe(false);
    });

    it('should handle database errors', async () => {
      mockDb.oneOrNone.mockRejectedValue(new Error('Database error'));

      await expect(
        medicationService.deleteMedication(mockMedicationId, mockUserId)
      ).rejects.toThrow('Failed to delete medication: Database error');
    });
  });

  describe('Cultural and Malaysian specific features', () => {
    it('should properly transform Malaysian medication info', async () => {
      const rowWithMalaysianInfo = {
        ...mockMedicationRows[0],
        moh_registration: 'MAL12345678',
        dca_registration: 'DCA87654321',
        local_manufacturer: 'Malaysian Pharma Sdn Bhd',
        halal_certified: true,
        local_alternatives: ['Alternative 1', 'Alternative 2']
      };

      mockCache.get.mockResolvedValue(null);
      mockDb.oneOrNone.mockResolvedValue(rowWithMalaysianInfo);

      const result = await medicationService.getMedicationById(mockMedicationId, mockUserId);

      expect(result?.malaysianInfo.mohRegistration).toBe('MAL12345678');
      expect(result?.malaysianInfo.dcaRegistration).toBe('DCA87654321');
      expect(result?.malaysianInfo.halalCertified).toBe(true);
      expect(result?.malaysianInfo.localManufacturer).toBe('Malaysian Pharma Sdn Bhd');
      expect(result?.malaysianInfo.localAlternatives).toEqual(['Alternative 1', 'Alternative 2']);
    });

    it('should handle cultural considerations properly', async () => {
      const culturalMedication = {
        ...mockMedicationRows[0],
        cultural_take_with_food: true,
        cultural_avoid_fasting: true,
        cultural_prayer_considerations: '["avoid_prayer_buffer", "ramadan_timing"]'
      };

      mockCache.get.mockResolvedValue(null);
      mockDb.oneOrNone.mockResolvedValue(culturalMedication);

      const result = await medicationService.getMedicationById(mockMedicationId, mockUserId);

      expect(result?.cultural.takeWithFood).toBe(true);
      expect(result?.cultural.avoidDuringFasting).toBe(true);
      expect(result?.cultural.prayerTimeConsiderations).toEqual(['avoid_prayer_buffer', 'ramadan_timing']);
    });

    it('should handle halal status correctly', async () => {
      const halalMedication = {
        ...mockMedicationRows[0],
        halal_certified: true
      };

      mockCache.get.mockResolvedValue(null);
      mockDb.oneOrNone.mockResolvedValue(halalMedication);

      const result = await medicationService.getMedicationById(mockMedicationId, mockUserId);

      expect(result?.cultural.halalStatus.isHalal).toBe(true);
      expect(result?.malaysianInfo.halalCertified).toBe(true);
    });
  });

  describe('Error handling and edge cases', () => {
    it('should handle invalid JSON data gracefully', async () => {
      const invalidJsonRow = {
        ...mockMedicationRows[0],
        schedule_times: 'invalid json',
        cultural_prayer_considerations: 'invalid json'
      };

      mockCache.get.mockResolvedValue(null);
      mockDb.oneOrNone.mockResolvedValue(invalidJsonRow);

      // Should not throw, but handle gracefully
      const result = await medicationService.getMedicationById(mockMedicationId, mockUserId);

      expect(result?.schedule.times).toEqual([]); // Default fallback
    });

    it('should handle cache failures gracefully', async () => {
      mockCache.get.mockRejectedValue(new Error('Cache connection failed'));
      mockDb.oneOrNone.mockResolvedValue(mockMedicationRows[0]);

      // Should still work without cache
      const result = await medicationService.getMedicationById(mockMedicationId, mockUserId);

      expect(result).toBeTruthy();
      expect(result?.name).toBe('Paracetamol');
    });

    it('should handle empty search queries', async () => {
      await expect(
        medicationService.searchMalaysianDrugDatabase({ query: '' })
      ).rejects.toThrow(); // Validation should catch this
    });
  });
});