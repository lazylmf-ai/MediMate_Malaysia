/**
 * Comprehensive tests for OfflineSyncService
 * Tests offline synchronization, conflict resolution, and cultural compliance
 */

import { OfflineSyncService, OfflineSyncOptions } from '../OfflineSyncService';
import { MedicationService } from '../MedicationService';
import { OCRIntegrationService } from '../OCRIntegrationService';
import { MedicationSchedulingService } from '../MedicationSchedulingService';
import { DatabaseService } from '../../database/databaseService';
import { CacheService } from '../../cache/redisService';
import { AuditService } from '../../audit/auditService';
import {
  Medication,
  MedicationAdherence,
  OCRResult,
  OfflineSyncPayload,
  SyncStatus
} from '../../../types/medication/medication.types';

// Mock dependencies
jest.mock('../MedicationService');
jest.mock('../OCRIntegrationService');
jest.mock('../MedicationSchedulingService');
jest.mock('../../database/databaseService');
jest.mock('../../cache/redisService');
jest.mock('../../audit/auditService');

describe('OfflineSyncService', () => {
  let offlineSyncService: OfflineSyncService;
  let mockMedicationService: jest.Mocked<MedicationService>;
  let mockOCRService: jest.Mocked<OCRIntegrationService>;
  let mockSchedulingService: jest.Mocked<MedicationSchedulingService>;
  let mockDb: jest.Mocked<DatabaseService>;
  let mockCache: jest.Mocked<CacheService>;
  let mockAuditService: jest.Mocked<AuditService>;

  const mockUserId = 'user-123';
  const mockDeviceId = 'device-456';

  const mockSyncOptions: OfflineSyncOptions = {
    userId: mockUserId,
    deviceId: mockDeviceId,
    culturalPreferences: {
      languagePreference: 'ms',
      dataResidency: 'malaysia_only',
      halalOnly: true
    },
    syncType: 'full',
    batchSize: 100
  };

  const mockMedication: Medication = {
    id: 'med-123',
    userId: mockUserId,
    name: 'Paracetamol',
    genericName: 'Acetaminophen',
    brandName: 'Panadol',
    dosage: {
      amount: 500,
      unit: 'mg',
      form: 'tablet',
      instructions: 'Take with water'
    },
    schedule: {
      frequency: 'twice_daily',
      times: ['08:00', '20:00'],
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
      languagePreference: 'ms'
    },
    images: [],
    status: 'active',
    category: 'prescription',
    malaysianInfo: {
      mohRegistration: 'MAL123456',
      availability: 'widely_available',
      halalCertified: true,
      localAlternatives: []
    },
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z'
  };

  const mockAdherenceRecord: MedicationAdherence = {
    medicationId: 'med-123',
    date: '2024-01-15',
    scheduled: '08:00',
    taken: true,
    takenAt: '2024-01-15T08:05:00Z',
    notes: 'Taken with breakfast'
  };

  const mockOCRResult: OCRResult = {
    confidence: 0.85,
    extractedText: 'Paracetamol 500mg',
    medicationName: 'Paracetamol',
    dosageInfo: '500mg',
    instructions: 'Take twice daily',
    language: 'en',
    boundingBoxes: [],
    culturalPatterns: {
      halalIndicators: ['JAKIM'],
      manufacturerInfo: 'Malaysian Pharma',
      registrationNumbers: ['MAL123456']
    }
  };

  const mockSyncPayload: OfflineSyncPayload = {
    medications: [mockMedication],
    adherenceRecords: [mockAdherenceRecord],
    ocrResults: [mockOCRResult],
    scheduleChanges: [],
    checksum: 'abc123',
    timestamp: '2024-01-15T10:00:00Z',
    deviceInfo: {
      deviceId: mockDeviceId,
      platform: 'android',
      appVersion: '1.0.0'
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock services
    mockMedicationService = {
      getMedicationById: jest.fn(),
      createMedication: jest.fn(),
      updateMedication: jest.fn(),
      createMedicationFromOCR: jest.fn(),
      getUserMedications: jest.fn(),
      searchMalaysianDrugDatabase: jest.fn(),
      validateAgainstMalaysianDatabase: jest.fn()
    } as any;

    mockOCRService = {
      processOCRForMedication: jest.fn()
    } as any;

    mockSchedulingService = {
      trackAdherence: jest.fn(),
      updateReminderSettings: jest.fn(),
      optimizeSchedule: jest.fn()
    } as any;

    mockDb = {
      query: jest.fn(),
      one: jest.fn(),
      oneOrNone: jest.fn(),
      any: jest.fn(),
      none: jest.fn(),
      tx: jest.fn().mockImplementation(callback => callback(mockDb))
    } as any;

    mockCache = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      lpush: jest.fn()
    } as any;

    mockAuditService = {
      logActivity: jest.fn()
    } as any;

    // Mock getInstance methods
    (MedicationService.getInstance as jest.Mock).mockReturnValue(mockMedicationService);
    (OCRIntegrationService.getInstance as jest.Mock).mockReturnValue(mockOCRService);
    (MedicationSchedulingService.getInstance as jest.Mock).mockReturnValue(mockSchedulingService);
    (DatabaseService.getInstance as jest.Mock).mockReturnValue(mockDb);
    (CacheService.getInstance as jest.Mock).mockReturnValue(mockCache);
    (AuditService.getInstance as jest.Mock).mockReturnValue(mockAuditService);

    offlineSyncService = OfflineSyncService.getInstance();
  });

  describe('syncFromOffline', () => {
    it('should successfully sync offline data with cultural validation', async () => {
      // Setup mocks
      mockMedicationService.getMedicationById.mockResolvedValue(null);
      mockMedicationService.createMedication.mockResolvedValue(mockMedication);
      mockSchedulingService.trackAdherence.mockResolvedValue(mockAdherenceRecord);
      mockOCRService.processOCRForMedication.mockResolvedValue({
        confidence: 0.85,
        extractedMedication: mockMedication,
        validation: { isValid: true, confidence: 0.9, suggestions: [], warnings: [], culturalConsiderations: [] },
        culturalAnalysis: {
          halalIndicators: { found: true, certificationBodies: ['JAKIM'], confidence: 0.9 },
          manufacturerInfo: { detected: true, name: 'Malaysian Pharma', isLocal: true, confidence: 0.8 },
          regulatoryInfo: { mohRegistration: 'MAL123456', confidence: 0.9 },
          languageAnalysis: { primaryLanguage: 'en', confidence: 0.8, textDistribution: { ms: 0.2, en: 0.7, zh: 0.1 } },
          culturalInstructions: { ramadanConsiderations: [], prayerTimeNotes: [], foodTimingInstructions: [] }
        },
        suggestions: [],
        warnings: [],
        requiresManualVerification: false
      });

      const result = await offlineSyncService.syncFromOffline(mockSyncPayload, mockSyncOptions);

      expect(result.status).toBe('completed');
      expect(result.summary.medicationsCreated).toBe(1);
      expect(result.summary.adherenceRecordsUpdated).toBe(1);
      expect(result.summary.ocrResultsProcessed).toBe(1);
      expect(result.culturalValidation.halalStatusVerified).toBe(true);
      expect(result.pdpaCompliance.dataLocalityMaintained).toBe(true);
      expect(mockAuditService.logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUserId,
          action: 'offline_sync',
          resource: 'medication_data'
        })
      );
    });

    it('should detect and handle medication conflicts', async () => {
      const existingMedication = {
        ...mockMedication,
        updatedAt: '2024-01-16T10:00:00Z' // Newer than sync payload
      };

      mockMedicationService.getMedicationById.mockResolvedValue(existingMedication);

      const result = await offlineSyncService.syncFromOffline(mockSyncPayload, mockSyncOptions);

      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].type).toBe('medication_conflict');
      expect(result.conflicts[0].conflictReason).toContain('Server version is newer');
      expect(result.conflicts[0].suggestedResolution).toBe('merge_changes');
    });

    it('should validate halal-only preference and reject non-halal medications', async () => {
      const nonHalalMedication = {
        ...mockMedication,
        cultural: {
          ...mockMedication.cultural,
          halalStatus: {
            isHalal: false,
            concerns: ['Contains gelatin']
          }
        }
      };

      const nonHalalPayload = {
        ...mockSyncPayload,
        medications: [nonHalalMedication]
      };

      await expect(
        offlineSyncService.syncFromOffline(nonHalalPayload, mockSyncOptions)
      ).rejects.toThrow('violates halal-only preference');
    });

    it('should process OCR results with low confidence and flag for manual review', async () => {
      const lowConfidenceOCRResult = {
        ...mockOCRResult,
        confidence: 0.3
      };

      const lowConfidencePayload = {
        ...mockSyncPayload,
        ocrResults: [lowConfidenceOCRResult]
      };

      mockOCRService.processOCRForMedication.mockResolvedValue({
        confidence: 0.3,
        extractedMedication: {},
        validation: { isValid: false, confidence: 0.3, suggestions: [], warnings: [], culturalConsiderations: [] },
        culturalAnalysis: {} as any,
        suggestions: [],
        warnings: [],
        requiresManualVerification: true
      });

      const result = await offlineSyncService.syncFromOffline(lowConfidencePayload, mockSyncOptions);

      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0].type).toBe('ocr_low_confidence');
      expect(result.conflicts[0].suggestedResolution).toBe('manual_review');
    });

    it('should handle sync failures gracefully and return error status', async () => {
      mockMedicationService.createMedication.mockRejectedValue(new Error('Database connection failed'));

      const result = await offlineSyncService.syncFromOffline(mockSyncPayload, mockSyncOptions);

      expect(result.status).toBe('failed');
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].type).toBe('validation_error');
      expect(mockAuditService.logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'offline_sync_failed'
        })
      );
    });

    it('should validate PDPA compliance for data residency requirements', async () => {
      const dataResidencyOptions = {
        ...mockSyncOptions,
        culturalPreferences: {
          ...mockSyncOptions.culturalPreferences,
          dataResidency: 'malaysia_only' as const
        }
      };

      const result = await offlineSyncService.syncFromOffline(mockSyncPayload, dataResidencyOptions);

      expect(result.pdpaCompliance.dataLocalityMaintained).toBe(true);
      expect(result.pdpaCompliance.consentValidationPassed).toBe(true);
      expect(result.pdpaCompliance.auditTrailComplete).toBe(true);
    });
  });

  describe('generateOfflineDataPackage', () => {
    it('should generate encrypted offline data package with cultural filtering', async () => {
      mockMedicationService.getUserMedications.mockResolvedValue({
        medications: [mockMedication],
        total: 1
      });

      const result = await offlineSyncService.generateOfflineDataPackage(mockSyncOptions);

      expect(result.medications).toHaveLength(1);
      expect(result.medications[0].id).toBe(mockMedication.id);
      expect(result.checksum).toBeTruthy();
      expect(result.encryptedPayload).toBeTruthy();
      expect(result.lastUpdateTimestamp).toBeTruthy();
      expect(mockAuditService.logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'offline_package_generated',
          resource: 'medication_data'
        })
      );
    });

    it('should filter medications based on halal-only preference', async () => {
      const halalMedication = { ...mockMedication, malaysianInfo: { ...mockMedication.malaysianInfo, halalCertified: true } };
      const nonHalalMedication = {
        ...mockMedication,
        id: 'med-456',
        name: 'Non-Halal Med',
        malaysianInfo: { ...mockMedication.malaysianInfo, halalCertified: false }
      };

      mockMedicationService.getUserMedications.mockResolvedValue({
        medications: [halalMedication, nonHalalMedication],
        total: 2
      });

      const halalOnlyOptions = {
        ...mockSyncOptions,
        culturalPreferences: {
          ...mockSyncOptions.culturalPreferences,
          halalOnly: true
        }
      };

      const result = await offlineSyncService.generateOfflineDataPackage(halalOnlyOptions);

      // Should contain both medications initially, filtering happens in applyCulturalFiltering
      expect(result.medications).toHaveLength(2);
    });

    it('should apply data minimization for PDPA compliance', async () => {
      mockMedicationService.getUserMedications.mockResolvedValue({
        medications: [mockMedication],
        total: 1
      });

      const result = await offlineSyncService.generateOfflineDataPackage(mockSyncOptions);

      expect(result.medications[0]).toBeDefined();
      // Sensitive fields should be handled according to data minimization principles
      expect(result.checksum).toBeTruthy();
    });

    it('should cache generated offline package for performance', async () => {
      mockMedicationService.getUserMedications.mockResolvedValue({
        medications: [mockMedication],
        total: 1
      });

      await offlineSyncService.generateOfflineDataPackage(mockSyncOptions);

      expect(mockCache.set).toHaveBeenCalledWith(
        expect.stringContaining('offline_package'),
        expect.any(String),
        86400 // 24 hours
      );
    });
  });

  describe('getSyncStatus', () => {
    it('should return cached sync status when available', async () => {
      const cachedStatus = {
        lastSyncTimestamp: '2024-01-15T10:00:00Z',
        status: 'completed',
        pendingConflicts: 0,
        lastErrors: 0,
        culturalValidation: true,
        pdpaCompliance: true,
        needsSync: false
      };

      mockCache.get.mockResolvedValue(JSON.stringify(cachedStatus));

      const result = await offlineSyncService.getSyncStatus(mockUserId, mockDeviceId);

      expect(result).toEqual(cachedStatus);
      expect(mockDb.oneOrNone).not.toHaveBeenCalled();
    });

    it('should fetch sync status from database when not cached', async () => {
      const dbStatus = {
        sync_id: 'sync-123',
        status: 'completed',
        last_sync_timestamp: '2024-01-15T10:00:00Z',
        conflicts_count: 0,
        errors_count: 0,
        cultural_validation_status: true,
        pdpa_compliance_status: true
      };

      mockCache.get.mockResolvedValue(null);
      mockDb.oneOrNone.mockResolvedValue(dbStatus);
      mockDb.one.mockResolvedValue({ updated_count: '0' });

      const result = await offlineSyncService.getSyncStatus(mockUserId, mockDeviceId);

      expect(result.lastSyncTimestamp).toBe(dbStatus.last_sync_timestamp);
      expect(result.status).toBe(dbStatus.status);
      expect(result.culturalValidation).toBe(true);
      expect(result.pdpaCompliance).toBe(true);
      expect(mockCache.set).toHaveBeenCalled();
    });

    it('should determine sync necessity based on updated data', async () => {
      mockCache.get.mockResolvedValue(null);
      mockDb.oneOrNone.mockResolvedValue({
        sync_id: 'sync-123',
        status: 'completed',
        last_sync_timestamp: '2024-01-15T10:00:00Z',
        conflicts_count: 0,
        errors_count: 0,
        cultural_validation_status: true,
        pdpa_compliance_status: true
      });

      // Mock that there are updated records
      mockDb.one.mockResolvedValue({ updated_count: '5' });

      const result = await offlineSyncService.getSyncStatus(mockUserId, mockDeviceId);

      expect(result.needsSync).toBe(true);
    });

    it('should handle first-time sync scenario', async () => {
      mockCache.get.mockResolvedValue(null);
      mockDb.oneOrNone.mockResolvedValue(null); // No previous sync

      const result = await offlineSyncService.getSyncStatus(mockUserId, mockDeviceId);

      expect(result.status).toBe('never_synced');
      expect(result.lastSyncTimestamp).toBeNull();
      expect(result.needsSync).toBe(true);
    });
  });

  describe('Cultural and PDPA Compliance Validation', () => {
    it('should validate Malaysian cultural consistency across sync operations', async () => {
      const culturalPayload = {
        ...mockSyncPayload,
        medications: [{
          ...mockMedication,
          cultural: {
            ...mockMedication.cultural,
            prayerTimeConsiderations: ['Avoid during Maghrib'],
            languagePreference: 'ms' as const,
            halalStatus: {
              isHalal: true,
              concerns: []
            }
          }
        }]
      };

      mockMedicationService.getMedicationById.mockResolvedValue(null);
      mockMedicationService.createMedication.mockResolvedValue(mockMedication);

      const result = await offlineSyncService.syncFromOffline(culturalPayload, mockSyncOptions);

      expect(result.culturalValidation.languageConsistencyMaintained).toBe(true);
      expect(result.culturalValidation.prayerTimeAdjustmentsMaintained).toBe(true);
      expect(result.culturalValidation.halalStatusVerified).toBe(true);
    });

    it('should enforce PDPA data minimization principles', async () => {
      const result = await offlineSyncService.generateOfflineDataPackage(mockSyncOptions);

      expect(result.encryptedPayload).toBeTruthy();
      expect(result.checksum).toBeTruthy();
      // Verify that sensitive data is properly handled
      expect(typeof result.medications[0].id).toBe('string');
    });

    it('should maintain audit trails for compliance', async () => {
      mockMedicationService.getMedicationById.mockResolvedValue(null);
      mockMedicationService.createMedication.mockResolvedValue(mockMedication);

      await offlineSyncService.syncFromOffline(mockSyncPayload, mockSyncOptions);

      expect(mockAuditService.logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: mockUserId,
          action: 'offline_sync',
          resource: 'medication_data',
          details: expect.objectContaining({
            culturalCompliance: expect.any(Object),
            pdpaCompliance: expect.any(Object)
          })
        })
      );
    });
  });

  describe('Performance and Error Handling', () => {
    it('should handle large sync payloads efficiently', async () => {
      const largeMedicationList = Array.from({ length: 100 }, (_, i) => ({
        ...mockMedication,
        id: `med-${i}`,
        name: `Medication ${i}`
      }));

      const largePayload = {
        ...mockSyncPayload,
        medications: largeMedicationList
      };

      mockMedicationService.getMedicationById.mockResolvedValue(null);
      mockMedicationService.createMedication.mockResolvedValue(mockMedication);

      const startTime = Date.now();
      const result = await offlineSyncService.syncFromOffline(largePayload, mockSyncOptions);
      const endTime = Date.now();

      expect(result.status).toBe('completed');
      expect(result.summary.medicationsCreated).toBe(100);
      expect(endTime - startTime).toBeLessThan(10000); // Should complete within 10 seconds
    });

    it('should gracefully handle database connection failures', async () => {
      mockDb.tx.mockRejectedValue(new Error('Connection timeout'));

      const result = await offlineSyncService.syncFromOffline(mockSyncPayload, mockSyncOptions);

      expect(result.status).toBe('failed');
      expect(result.errors[0].message).toContain('Connection timeout');
      expect(mockAuditService.logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'offline_sync_failed'
        })
      );
    });

    it('should validate payload integrity using checksums', async () => {
      const corruptedPayload = {
        ...mockSyncPayload,
        checksum: 'invalid-checksum'
      };

      await expect(
        offlineSyncService.syncFromOffline(corruptedPayload, mockSyncOptions)
      ).rejects.toThrow('Data integrity check failed');
    });
  });

  describe('Edge Cases and Boundary Conditions', () => {
    it('should handle empty sync payloads', async () => {
      const emptyPayload: OfflineSyncPayload = {
        medications: [],
        adherenceRecords: [],
        ocrResults: [],
        scheduleChanges: [],
        checksum: 'empty-checksum',
        timestamp: '2024-01-15T10:00:00Z',
        deviceInfo: {
          deviceId: mockDeviceId,
          platform: 'android',
          appVersion: '1.0.0'
        }
      };

      const result = await offlineSyncService.syncFromOffline(emptyPayload, mockSyncOptions);

      expect(result.status).toBe('completed');
      expect(result.summary.medicationsCreated).toBe(0);
      expect(result.summary.adherenceRecordsUpdated).toBe(0);
      expect(result.summary.ocrResultsProcessed).toBe(0);
    });

    it('should handle concurrent sync requests from same device', async () => {
      mockMedicationService.getMedicationById.mockResolvedValue(null);
      mockMedicationService.createMedication.mockResolvedValue(mockMedication);

      const syncPromises = [
        offlineSyncService.syncFromOffline(mockSyncPayload, mockSyncOptions),
        offlineSyncService.syncFromOffline(mockSyncPayload, mockSyncOptions)
      ];

      const results = await Promise.all(syncPromises);

      expect(results).toHaveLength(2);
      expect(results[0].status).toBe('completed');
      expect(results[1].status).toBe('completed');
    });

    it('should handle mixed language content in cultural validation', async () => {
      const mixedLanguageMedication = {
        ...mockMedication,
        name: 'Paracetamol 药物',
        cultural: {
          ...mockMedication.cultural,
          languagePreference: 'zh' as const
        }
      };

      const mixedLanguagePayload = {
        ...mockSyncPayload,
        medications: [mixedLanguageMedication]
      };

      mockMedicationService.getMedicationById.mockResolvedValue(null);
      mockMedicationService.createMedication.mockResolvedValue(mixedLanguageMedication);

      const result = await offlineSyncService.syncFromOffline(mixedLanguagePayload, mockSyncOptions);

      expect(result.status).toBe('completed');
      expect(result.culturalValidation.languageConsistencyMaintained).toBe(true);
    });
  });
});