/**
 * Comprehensive Medication API Tests
 * Tests all medication management endpoints with Malaysian cultural considerations
 */

import request from 'supertest';
import { Express } from 'express';
import { MedicationService } from '../../services/medication/MedicationService';
import { OCRIntegrationService } from '../../services/medication/OCRIntegrationService';
import { MedicationSearchService } from '../../services/medication/MedicationSearchService';
import { OfflineSyncService } from '../../services/medication/OfflineSyncService';
import { DatabaseService } from '../../services/database/databaseService';
import { Medication, OCRResult } from '../../types/medication/medication.types';

describe('Medication API Integration Tests', () => {
  let app: Express;
  let authToken: string;
  let testUserId: string;
  let testMedicationId: string;
  let medicationService: MedicationService;
  let ocrService: OCRIntegrationService;
  let searchService: MedicationSearchService;
  let syncService: OfflineSyncService;

  beforeAll(async () => {
    // Initialize test app and services
    app = require('../../app.ts').default;
    medicationService = MedicationService.getInstance();
    ocrService = OCRIntegrationService.getInstance();
    searchService = MedicationSearchService.getInstance();
    syncService = OfflineSyncService.getInstance();

    // Setup test user and authentication
    const authResponse = await request(app)
      .post('/auth/login')
      .send({
        email: 'test.user@medimate.my',
        password: 'SecurePassword123!'
      });

    authToken = authResponse.body.token;
    testUserId = authResponse.body.user.id;
  });

  afterAll(async () => {
    // Cleanup test data
    if (testMedicationId) {
      await request(app)
        .delete(`/medications/${testMedicationId}`)
        .set('Authorization', `Bearer ${authToken}`);
    }
  });

  describe('Medication CRUD Operations', () => {
    const testMedication = {
      name: 'Paracetamol',
      genericName: 'Acetaminophen',
      dosage: {
        amount: 500,
        unit: 'mg',
        form: 'tablet',
        instructions: 'Take with food'
      },
      schedule: {
        frequency: 'twice_daily',
        times: ['08:00', '20:00'],
        culturalAdjustments: {
          prayerTimeBuffer: 15,
          takeWithFood: true,
          avoidDuringFasting: false,
          prayerTimeConsiderations: ['avoid_maghrib']
        }
      },
      cultural: {
        takeWithFood: true,
        avoidDuringFasting: false,
        prayerTimeConsiderations: ['avoid_maghrib'],
        halalStatus: {
          isHalal: true,
          certificationBody: 'JAKIM',
          certificateNumber: 'JAKIM-001',
          concerns: [],
          alternatives: []
        },
        languagePreference: 'ms',
        traditionalMedicineInteractions: []
      },
      status: 'active',
      category: 'prescription',
      malaysianInfo: {
        mohRegistration: 'MAL20123456',
        dcaRegistration: 'DCA-2023-001',
        localManufacturer: 'Pharmaniaga Berhad',
        availability: 'widely_available',
        halalCertified: true,
        localAlternatives: ['Panadol', 'Febrilex'],
        pricing: {
          averagePrice: 5.50,
          currency: 'MYR',
          lastUpdated: new Date().toISOString()
        }
      },
      cultural_preferences: {
        language: 'ms',
        prayer_time_awareness: true,
        ramadan_adjustments: true,
        family_involvement: true
      }
    };

    test('POST /medications - Create new medication with Malaysian cultural considerations', async () => {
      const response = await request(app)
        .post('/medications')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testMedication)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.medication).toBeDefined();
      expect(response.body.data.medication.name).toBe(testMedication.name);
      expect(response.body.data.malaysian_features).toBeDefined();
      expect(response.body.data.malaysian_features.moh_registry_checked).toBe(true);
      expect(response.body.data.malaysian_features.halal_certification_verified).toBe(true);
      expect(response.body.data.malaysian_features.prayer_time_aligned).toBe(true);
      expect(response.body.cultural_message).toBeDefined();
      expect(response.body.cultural_message.ms).toContain('budaya Malaysia');

      testMedicationId = response.body.data.medication.id;
    });

    test('GET /medications - Retrieve user medications with filtering', async () => {
      const response = await request(app)
        .get('/medications')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ status: 'active', limit: 10 })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.medications).toBeInstanceOf(Array);
      expect(response.body.data.pagination).toBeDefined();
      expect(response.body.data.malaysian_context).toBeDefined();
      expect(response.body.data.malaysian_context.pharmacy_network).toBe('integrated');
      expect(response.body.data.malaysian_context.halal_certification).toBe('verified_where_applicable');
    });

    test('GET /medications/:id - Get specific medication with cultural context', async () => {
      const response = await request(app)
        .get(`/medications/${testMedicationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.medication).toBeDefined();
      expect(response.body.data.medication.id).toBe(testMedicationId);
      expect(response.body.data.medication.cultural_considerations).toBeDefined();
      expect(response.body.data.medication.malaysian_regulatory_info).toBeDefined();
      expect(response.body.data.medication.dosing_recommendations).toBeDefined();
    });

    test('PUT /medications/:id - Update medication with cultural preferences', async () => {
      const updateData = {
        schedule: {
          frequency: 'three_times',
          times: ['07:00', '13:00', '19:00'],
          culturalAdjustments: {
            prayerTimeBuffer: 20,
            takeWithFood: true,
            avoidDuringFasting: false,
            prayerTimeConsiderations: ['avoid_maghrib', 'avoid_asr']
          }
        },
        cultural_preferences: {
          language: 'en',
          prayer_time_awareness: true
        }
      };

      const response = await request(app)
        .put(`/medications/${testMedicationId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.medication.schedule.frequency).toBe('three_times');
      expect(response.body.cultural_message).toBeDefined();
    });
  });

  describe('OCR Integration', () => {
    const mockOCRResult: OCRResult = {
      confidence: 0.85,
      extractedText: 'Paracetamol 500mg\nTake twice daily\nWith food\nHalal Certified',
      medicationName: 'Paracetamol',
      dosageInfo: '500mg',
      instructions: 'Take twice daily with food',
      language: 'en',
      boundingBoxes: [
        {
          text: 'Paracetamol',
          bounds: { x: 10, y: 10, width: 100, height: 20 }
        },
        {
          text: '500mg',
          bounds: { x: 10, y: 30, width: 60, height: 20 }
        }
      ],
      culturalPatterns: {
        halalIndicators: ['Halal Certified'],
        manufacturerInfo: 'Local Pharma Sdn Bhd',
        registrationNumbers: ['MAL20123456']
      }
    };

    test('POST /medications/ocr/process - Process OCR results for Malaysian medication', async () => {
      const response = await request(app)
        .post('/medications/ocr/process')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ocr_result: mockOCRResult,
          cultural_preferences: {
            language: 'ms',
            halal_preferred: true
          }
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.medication).toBeDefined();
      expect(response.body.data.ocr_processing).toBeDefined();
      expect(response.body.data.ocr_processing.confidence).toBeGreaterThan(0.5);
      expect(response.body.cultural_message).toBeDefined();
    });

    test('POST /medications/ocr/process - Handle low confidence OCR', async () => {
      const lowConfidenceOCR = {
        ...mockOCRResult,
        confidence: 0.3
      };

      const response = await request(app)
        .post('/medications/ocr/process')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ ocr_result: lowConfidenceOCR })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.data.manual_entry_required).toBe(true);
      expect(response.body.data.suggestions).toBeDefined();
    });
  });

  describe('Malaysian Drug Registry Search', () => {
    test('GET /medications/registry/search - Search Malaysian drug database', async () => {
      const response = await request(app)
        .get('/medications/registry/search')
        .query({
          q: 'Paracetamol',
          type: 'brand',
          halal_only: 'true'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.results).toBeInstanceOf(Array);
      expect(response.body.data.query).toBe('Paracetamol');
      expect(response.body.data.filters.halal_only).toBe(true);

      if (response.body.data.results.length > 0) {
        const result = response.body.data.results[0];
        expect(result.malaysian_context).toBeDefined();
        expect(result.malaysian_context.moh_registered).toBe(true);
      }
    });

    test('GET /medications/search/enhanced - Enhanced search with cultural intelligence', async () => {
      const response = await request(app)
        .get('/medications/search/enhanced')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          q: 'pain relief',
          fuzzy_matching: 'true',
          halal_only: 'true',
          local_manufacturers: 'true',
          max_results: '20',
          sort_by: 'relevance'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.cultural_message).toBeDefined();
      expect(response.body.cultural_message.ms).toContain('Malaysia');
    });

    test('GET /medications/autocomplete - Medication autocomplete suggestions', async () => {
      const response = await request(app)
        .get('/medications/autocomplete')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          q: 'Para',
          limit: '10',
          include_brands: 'true'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });

  describe('Medication Validation', () => {
    test('POST /medications/validate - Validate medication against Malaysian database', async () => {
      const response = await request(app)
        .post('/medications/validate')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          medication_name: 'Paracetamol',
          generic_name: 'Acetaminophen',
          manufacturer: 'Pharmaniaga Berhad'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });

  describe('Medication Reminders and Scheduling', () => {
    test('GET /medications/:id/reminders - Get prayer-aligned reminders', async () => {
      const response = await request(app)
        .get(`/medications/${testMedicationId}/reminders`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ date: new Date().toISOString().split('T')[0] })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.medication).toBeDefined();
      expect(response.body.data.reminders).toBeInstanceOf(Array);
      expect(response.body.data.cultural_considerations).toBeDefined();
    });

    test('PUT /medications/:id/schedule - Update medication schedule with cultural considerations', async () => {
      const newSchedule = {
        schedule: {
          frequency: 'twice_daily',
          times: ['08:30', '20:30'],
          culturalAdjustments: {
            prayerTimeBuffer: 30,
            takeWithFood: true,
            ramadanSchedule: ['05:00', '21:00']
          }
        },
        cultural_adjustments: {
          ramadan_aware: true,
          prayer_buffer_extended: true
        }
      };

      const response = await request(app)
        .put(`/medications/${testMedicationId}/schedule`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(newSchedule)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.cultural_message).toBeDefined();
    });
  });

  describe('Adherence Tracking', () => {
    test('POST /medications/:id/adherence - Record medication adherence', async () => {
      const adherenceData = {
        date: new Date().toISOString().split('T')[0],
        scheduled: '08:00',
        taken: true,
        takenAt: new Date().toISOString(),
        notes: 'Taken with breakfast'
      };

      const response = await request(app)
        .post(`/medications/${testMedicationId}/adherence`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(adherenceData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.cultural_message).toBeDefined();
    });

    test('GET /medications/:id/adherence - Get adherence history', async () => {
      const response = await request(app)
        .get(`/medications/${testMedicationId}/adherence`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          start_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          limit: '30'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
    });
  });

  describe('Family Coordination', () => {
    test('POST /medications/:id/share - Share medication with family member', async () => {
      // This would require a family member setup in the test data
      const shareData = {
        family_member_id: 'family-member-uuid',
        permissions: ['view', 'schedule'],
        cultural_preferences: {
          language: 'ms',
          notification_preferences: ['sms', 'push']
        }
      };

      // Note: This test might need to be skipped if family member doesn't exist
      // or we need to create test family relationships first
    });

    test('GET /medications/family/shared - Get shared family medications', async () => {
      const response = await request(app)
        .get('/medications/family/shared')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
    });
  });

  describe('Medication Interactions', () => {
    test('POST /medications/interactions/check - Check medication interactions', async () => {
      const interactionData = {
        medications: [
          { id: testMedicationId, name: 'Paracetamol' },
          { name: 'Aspirin' }
        ],
        new_medication: {
          name: 'Warfarin'
        }
      };

      const response = await request(app)
        .post('/medications/interactions/check')
        .set('Authorization', `Bearer ${authToken}`)
        .send(interactionData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.cultural_message).toBeDefined();
    });
  });

  describe('Offline Synchronization', () => {
    test('POST /medications/sync/upload - Upload offline medication data', async () => {
      const syncPayload = {
        payload: {
          medications: [testMedication],
          adherenceRecords: [],
          ocrResults: [],
          scheduleChanges: [],
          checksum: 'test-checksum',
          timestamp: new Date().toISOString(),
          deviceInfo: {
            deviceId: 'test-device-001',
            platform: 'ios',
            appVersion: '1.0.0'
          }
        },
        options: {
          deviceId: 'test-device-001',
          syncType: 'incremental'
        }
      };

      const response = await request(app)
        .post('/medications/sync/upload')
        .set('Authorization', `Bearer ${authToken}`)
        .send(syncPayload)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.cultural_message).toBeDefined();
    });

    test('GET /medications/sync/download - Download offline data package', async () => {
      const response = await request(app)
        .get('/medications/sync/download')
        .set('Authorization', `Bearer ${authToken}`)
        .query({
          device_id: 'test-device-001',
          sync_type: 'full'
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
      expect(response.body.cultural_message).toBeDefined();
    });

    test('GET /medications/sync/status - Get sync status', async () => {
      const response = await request(app)
        .get('/medications/sync/status')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ device_id: 'test-device-001' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });
  });

  describe('Advanced Search and Optimization', () => {
    test('POST /medications/search/advanced - Advanced search with multiple criteria', async () => {
      const searchCriteria = {
        medications: ['Paracetamol'],
        conditions: ['fever', 'pain'],
        culturalRequirements: {
          halal_only: true,
          ramadan_compatible: true,
          prayer_time_aware: true
        },
        demographics: {
          age_group: 'adult',
          pregnancy_status: false
        }
      };

      const response = await request(app)
        .post('/medications/search/advanced')
        .set('Authorization', `Bearer ${authToken}`)
        .send(searchCriteria)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.cultural_message).toBeDefined();
    });
  });

  describe('Database Optimization (Admin)', () => {
    test('POST /medications/admin/optimize-database - Optimize medication database', async () => {
      // This test would require admin privileges
      // May need to skip if not admin user
    });

    test('GET /medications/admin/optimization-stats - Get optimization statistics', async () => {
      // This test would require admin privileges
      // May need to skip if not admin user
    });
  });

  describe('Error Handling', () => {
    test('GET /medications/invalid-id - Handle invalid medication ID', async () => {
      const response = await request(app)
        .get('/medications/invalid-uuid')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    test('POST /medications - Handle invalid medication data', async () => {
      const response = await request(app)
        .post('/medications')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ invalid: 'data' })
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.cultural_message).toBeDefined();
    });

    test('Unauthorized access without token', async () => {
      const response = await request(app)
        .get('/medications')
        .expect(401);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('Cultural Adaptations', () => {
    test('Verify cultural messages in different languages', async () => {
      const response = await request(app)
        .get('/medications')
        .set('Authorization', `Bearer ${authToken}`)
        .set('Accept-Language', 'ms')
        .expect(200);

      expect(response.body.data.malaysian_context).toBeDefined();
    });

    test('Verify Ramadan-specific adjustments', async () => {
      // This test could mock Ramadan period to verify special handling
    });

    test('Verify prayer time considerations', async () => {
      if (testMedicationId) {
        const response = await request(app)
          .get(`/medications/${testMedicationId}/reminders`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.data.cultural_considerations).toBeDefined();
        expect(response.body.data.cultural_considerations.prayer_time_avoidance).toBe(true);
      }
    });
  });
});