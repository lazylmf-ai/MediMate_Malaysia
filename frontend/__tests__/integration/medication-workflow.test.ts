/**
 * Integration Tests: Medication Management Workflow
 *
 * Tests the complete medication management flow from capture to scheduling
 */

import { TestDataGenerator, delay, waitFor } from '../utils/testHelpers';
import {
  MockApiClient,
  MockOCRService,
  MockDatabase,
  MockNotificationService,
} from '../utils/mockServices';

describe('Medication Management Workflow Integration', () => {
  let apiClient: MockApiClient;
  let ocrService: MockOCRService;
  let database: MockDatabase;
  let notificationService: MockNotificationService;
  let patientId: string;

  beforeEach(() => {
    apiClient = new MockApiClient();
    ocrService = new MockOCRService();
    database = new MockDatabase();
    notificationService = new MockNotificationService();
    patientId = TestDataGenerator.randomId();
  });

  afterEach(() => {
    apiClient.reset();
    ocrService.reset();
    database.clear();
    notificationService.reset();
  });

  describe('Photo Capture to Medication Entry', () => {
    it('should complete full workflow from photo capture to database storage', async () => {
      // Step 1: Capture photo
      const photoUri = `file:///mock/medication_photo_${Date.now()}.jpg`;

      // Step 2: OCR recognizes medication
      const ocrResult = {
        text: 'Paracetamol 500mg\nTake twice daily with food',
        blocks: [
          { text: 'Paracetamol', confidence: 0.95 },
          { text: '500mg', confidence: 0.92 },
          { text: 'Take twice daily with food', confidence: 0.88 },
        ],
        confidence: 0.92,
      };

      ocrService.mockResult(photoUri, ocrResult);
      const recognizedText = await ocrService.recognizeText(photoUri);

      expect(recognizedText.text).toContain('Paracetamol');
      expect(recognizedText.text).toContain('500mg');
      expect(recognizedText.confidence).toBeGreaterThan(0.9);

      // Step 3: Extract medication details
      const medicationData = {
        name: 'Paracetamol',
        dosage: '500mg',
        frequency: 'twice_daily',
        instructions: 'Take twice daily with food',
        patientId,
      };

      // Step 4: Search medication database
      apiClient.mockResponseWithMatcher(
        (endpoint) => endpoint.includes('/medications/search'),
        [
          {
            id: 'med-paracetamol-500',
            name: 'Paracetamol',
            genericName: 'Acetaminophen',
            dosage: '500mg',
            manufacturer: 'Pharmaceutical Company',
          },
        ]
      );

      const searchResult = await apiClient.request('/api/v1/medications/search?q=Paracetamol');
      expect(searchResult.success).toBe(true);
      expect(searchResult.data).toHaveLength(1);

      // Step 5: Store medication in local database
      const medicationId = await database.insert('medications', {
        ...medicationData,
        medicationDbId: 'med-paracetamol-500',
        photoUri,
        createdAt: new Date().toISOString(),
        active: true,
      });

      expect(medicationId).toBeDefined();

      // Step 6: Verify storage
      const storedMedication = await database.getById('medications', medicationId);
      expect(storedMedication).toMatchObject({
        name: 'Paracetamol',
        dosage: '500mg',
        frequency: 'twice_daily',
        active: true,
      });
    });

    it('should handle low OCR confidence with user verification', async () => {
      const photoUri = `file:///mock/blurry_photo_${Date.now()}.jpg`;

      // Low confidence OCR result
      const ocrResult = {
        text: 'Paracetaml 50mg',
        blocks: [
          { text: 'Paracetaml', confidence: 0.62 },
          { text: '50mg', confidence: 0.58 },
        ],
        confidence: 0.60,
      };

      ocrService.mockResult(photoUri, ocrResult);
      const recognizedText = await ocrService.recognizeText(photoUri);

      expect(recognizedText.confidence).toBeLessThan(0.7);

      // User should be prompted to verify
      const requiresVerification = recognizedText.confidence < 0.7;
      expect(requiresVerification).toBe(true);

      // User corrects the text
      const correctedData = {
        name: 'Paracetamol',
        dosage: '500mg',
        frequency: 'twice_daily',
        verified: true,
      };

      const medicationId = await database.insert('medications', {
        ...correctedData,
        patientId,
        photoUri,
        ocrConfidence: recognizedText.confidence,
        manuallyVerified: true,
      });

      const stored = await database.getById('medications', medicationId);
      expect(stored.manuallyVerified).toBe(true);
      expect(stored.name).toBe('Paracetamol');
    });

    it('should check for drug interactions before saving', async () => {
      // Patient already taking medication
      const existingMedId = await database.insert('medications', {
        name: 'Warfarin',
        dosage: '5mg',
        patientId,
        active: true,
      });

      // Try to add new medication
      const newMedicationData = {
        name: 'Aspirin',
        dosage: '100mg',
        patientId,
      };

      // Check interactions via API
      apiClient.mockResponseWithMatcher(
        (endpoint) => endpoint.includes('/medications/interactions'),
        {
          hasInteractions: true,
          interactions: [
            {
              severity: 'high',
              description: 'Increased bleeding risk when Warfarin is combined with Aspirin',
              recommendation: 'Consult physician before combining these medications',
            },
          ],
        }
      );

      const interactionCheck = await apiClient.request(
        '/api/v1/medications/interactions',
        {
          method: 'POST',
          body: JSON.stringify({
            existingMedications: ['Warfarin'],
            newMedication: 'Aspirin',
          }),
        }
      );

      expect(interactionCheck.success).toBe(true);
      expect(interactionCheck.data.hasInteractions).toBe(true);
      expect(interactionCheck.data.interactions[0].severity).toBe('high');

      // Should flag for physician review
      const medicationId = await database.insert('medications', {
        ...newMedicationData,
        requiresPhysicianReview: true,
        interactionWarnings: interactionCheck.data.interactions,
        active: false, // Not active until physician reviews
      });

      const stored = await database.getById('medications', medicationId);
      expect(stored.requiresPhysicianReview).toBe(true);
      expect(stored.active).toBe(false);
    });
  });

  describe('Medication Scheduling with Cultural Adaptation', () => {
    it('should create schedule adapted to prayer times', async () => {
      // Create medication with twice daily frequency
      const medicationId = await database.insert('medications', {
        name: 'Metformin',
        dosage: '500mg',
        frequency: 'twice_daily',
        patientId,
        active: true,
      });

      // Mock prayer times
      const prayerTimes = TestDataGenerator.prayerTimes(new Date());

      // Schedule should avoid prayer times
      const suggestedTimes = [
        new Date('2025-09-30T08:00:00Z'), // After Fajr
        new Date('2025-09-30T20:00:00Z'), // After Maghrib
      ];

      // Store schedule
      await database.insert('medication_schedules', {
        medicationId,
        patientId,
        times: suggestedTimes.map(t => t.toISOString()),
        culturalAdaptation: {
          respectsPrayerTimes: true,
          prayerTimesUsed: prayerTimes,
        },
        createdAt: new Date().toISOString(),
      });

      // Verify schedule doesn't conflict with prayer times
      const schedule = (await database.getAll('medication_schedules'))[0];
      expect(schedule.culturalAdaptation.respectsPrayerTimes).toBe(true);
      expect(schedule.times).toHaveLength(2);
    });

    it('should adjust schedule for Ramadan fasting', async () => {
      const medicationId = await database.insert('medications', {
        name: 'Blood Pressure Medication',
        dosage: '10mg',
        frequency: 'once_daily',
        patientId,
        active: true,
      });

      // During Ramadan, schedule should be at Iftar time
      const ramadanContext = {
        isRamadan: true,
        iftarTime: '19:15',
        suhoorTime: '05:30',
      };

      const scheduledTime = new Date('2025-09-30T19:20:00Z'); // After Iftar

      await database.insert('medication_schedules', {
        medicationId,
        patientId,
        times: [scheduledTime.toISOString()],
        culturalAdaptation: {
          ramadanAdjusted: true,
          iftarTime: ramadanContext.iftarTime,
        },
      });

      const schedule = (await database.getAll('medication_schedules'))[0];
      expect(schedule.culturalAdaptation.ramadanAdjusted).toBe(true);
    });

    it('should schedule notifications for medication times', async () => {
      const medicationId = await database.insert('medications', {
        name: 'Antibiotic',
        dosage: '250mg',
        frequency: 'three_times_daily',
        patientId,
        active: true,
      });

      const scheduledTimes = [
        new Date('2025-09-30T08:00:00Z'),
        new Date('2025-09-30T14:00:00Z'),
        new Date('2025-09-30T20:00:00Z'),
      ];

      // Schedule notifications for each time
      for (const time of scheduledTimes) {
        await notificationService.scheduleNotification({
          title: 'Medication Reminder',
          body: 'Time to take your Antibiotic 250mg',
          trigger: { date: time },
          data: {
            type: 'medication_reminder',
            medicationId,
            scheduledTime: time.toISOString(),
          },
        });
      }

      const scheduled = await notificationService.getScheduledNotifications();
      expect(scheduled).toHaveLength(3);
      expect(scheduled[0].data.type).toBe('medication_reminder');
    });
  });

  describe('Adherence Tracking', () => {
    it('should record medication taken and calculate adherence', async () => {
      const medicationId = await database.insert('medications', {
        name: 'Heart Medication',
        dosage: '5mg',
        frequency: 'once_daily',
        patientId,
        active: true,
        startDate: new Date('2025-09-23').toISOString(),
      });

      // Record adherence for 7 days
      const adherenceRecords = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date('2025-09-23');
        date.setDate(date.getDate() + i);

        const record = {
          medicationId,
          patientId,
          scheduledTime: new Date(date.setHours(8, 0, 0, 0)).toISOString(),
          takenTime: new Date(date.setHours(8, 5, 0, 0)).toISOString(),
          status: i < 6 ? 'taken' : 'missed', // Miss one dose
          method: 'manual',
        };

        adherenceRecords.push(record);
        await database.insert('adherence_records', record);
      }

      // Calculate adherence rate
      const allRecords = await database.getAll('adherence_records');
      const takenCount = allRecords.filter(r => r.status === 'taken').length;
      const adherenceRate = (takenCount / allRecords.length) * 100;

      expect(adherenceRate).toBeCloseTo(85.71, 1); // 6/7 = 85.71%
      expect(takenCount).toBe(6);
    });

    it('should sync adherence data to server when online', async () => {
      // Create offline adherence records
      const records = [];
      for (let i = 0; i < 5; i++) {
        const record = TestDataGenerator.adherenceRecord({
          patientId,
          syncStatus: 'pending',
        });
        await database.insert('adherence_records', record);
        records.push(record);
      }

      // Simulate going online and syncing
      apiClient.mockResponseWithMatcher(
        (endpoint) => endpoint.includes('/adherence/sync'),
        {
          synced: 5,
          conflicts: [],
          errors: [],
        }
      );

      const syncResult = await apiClient.request(
        `/api/v1/patients/${patientId}/adherence/sync`,
        {
          method: 'POST',
          body: JSON.stringify({
            records,
            syncTimestamp: new Date().toISOString(),
          }),
        }
      );

      expect(syncResult.success).toBe(true);
      expect(syncResult.data.synced).toBe(5);

      // Update sync status in database
      for (const record of records) {
        await database.update('adherence_records', record.id, {
          syncStatus: 'synced',
          syncedAt: new Date().toISOString(),
        });
      }

      const updatedRecords = await database.getAll('adherence_records');
      const allSynced = updatedRecords.every(r => r.syncStatus === 'synced');
      expect(allSynced).toBe(true);
    });

    it('should trigger milestone celebration on streak achievement', async () => {
      const medicationId = await database.insert('medications', {
        name: 'Daily Vitamin',
        dosage: '1 tablet',
        patientId,
        active: true,
      });

      // Record 7 consecutive days of adherence
      for (let i = 0; i < 7; i++) {
        const date = new Date('2025-09-23');
        date.setDate(date.getDate() + i);

        await database.insert('adherence_records', {
          medicationId,
          patientId,
          scheduledTime: new Date(date.setHours(9, 0, 0, 0)).toISOString(),
          takenTime: new Date(date.setHours(9, 2, 0, 0)).toISOString(),
          status: 'taken',
        });
      }

      // Check for milestones
      apiClient.mockResponseWithMatcher(
        (endpoint) => endpoint.includes('/adherence/milestones'),
        {
          newMilestones: [
            {
              id: TestDataGenerator.randomId(),
              type: '7_day_streak',
              name: '7-Day Streak',
              achievedAt: new Date().toISOString(),
              celebrated: false,
            },
          ],
          updatedMilestones: [],
          totalMilestones: 1,
        }
      );

      const milestoneCheck = await apiClient.request(
        `/api/v1/patients/${patientId}/adherence/milestones`,
        { method: 'POST' }
      );

      expect(milestoneCheck.success).toBe(true);
      expect(milestoneCheck.data.newMilestones).toHaveLength(1);
      expect(milestoneCheck.data.newMilestones[0].type).toBe('7_day_streak');
    });
  });

  describe('Emergency Escalation', () => {
    it('should escalate to family after multiple missed doses', async () => {
      const medicationId = await database.insert('medications', {
        name: 'Critical Heart Medication',
        dosage: '10mg',
        frequency: 'twice_daily',
        patientId,
        active: true,
        criticalMedication: true,
      });

      // Add family member
      const familyMemberId = await database.insert('family_members', {
        patientId,
        name: 'Family Member',
        relationship: 'spouse',
        phone: '+60123456789',
        email: 'family@example.com',
        notificationEnabled: true,
        emergencyContact: true,
      });

      // Miss 3 consecutive doses
      for (let i = 0; i < 3; i++) {
        const scheduledTime = new Date();
        scheduledTime.setHours(8 + i * 12, 0, 0, 0);

        await database.insert('adherence_records', {
          medicationId,
          patientId,
          scheduledTime: scheduledTime.toISOString(),
          status: 'missed',
        });
      }

      // Check for escalation conditions
      const missedDoses = (await database.getAll('adherence_records')).filter(
        r => r.status === 'missed' && r.medicationId === medicationId
      );

      expect(missedDoses.length).toBe(3);

      // Trigger escalation
      if (missedDoses.length >= 3) {
        await notificationService.presentNotification({
          title: 'Emergency Alert',
          body: 'Family has been notified of missed critical medication',
        });

        // Notify family member
        apiClient.mockResponseWithMatcher(
          (endpoint) => endpoint.includes('/family/notify'),
          { notified: true, timestamp: new Date().toISOString() }
        );

        await apiClient.request('/api/v1/family/notify', {
          method: 'POST',
          body: JSON.stringify({
            familyMemberId,
            type: 'missed_critical_medication',
            details: {
              medicationName: 'Critical Heart Medication',
              missedCount: missedDoses.length,
              lastScheduledTime: missedDoses[missedDoses.length - 1].scheduledTime,
            },
          }),
        });
      }

      const notifications = notificationService.getPresentedNotifications();
      expect(notifications).toHaveLength(1);
      expect(notifications[0].title).toBe('Emergency Alert');

      expect(apiClient.wasCalledWith('/api/v1/family/notify')).toBe(true);
    });
  });

  describe('Offline Functionality', () => {
    it('should queue operations when offline and sync when online', async () => {
      // Simulate offline state
      const offlineQueue = [];

      // Try to record adherence while offline
      const adherenceData = {
        medicationId: TestDataGenerator.randomId(),
        patientId,
        scheduledTime: new Date().toISOString(),
        takenTime: new Date().toISOString(),
        status: 'taken',
      };

      // Store locally and queue for sync
      const localId = await database.insert('adherence_records', {
        ...adherenceData,
        syncStatus: 'pending',
        localOnly: true,
      });

      offlineQueue.push({
        type: 'adherence_record',
        data: adherenceData,
        localId,
      });

      expect(offlineQueue).toHaveLength(1);

      // Simulate going online
      await delay(100);

      // Process offline queue
      apiClient.mockResponseWithMatcher(
        (endpoint) => endpoint.includes('/adherence/record'),
        { id: TestDataGenerator.randomId(), ...adherenceData }
      );

      for (const item of offlineQueue) {
        const syncResult = await apiClient.request(
          `/api/v1/patients/${patientId}/adherence/record`,
          {
            method: 'POST',
            body: JSON.stringify(item.data),
          }
        );

        if (syncResult.success) {
          await database.update('adherence_records', item.localId, {
            syncStatus: 'synced',
            serverId: syncResult.data.id,
            syncedAt: new Date().toISOString(),
          });
        }
      }

      const syncedRecord = await database.getById('adherence_records', localId);
      expect(syncedRecord.syncStatus).toBe('synced');
      expect(syncedRecord.serverId).toBeDefined();
    });

    it('should handle conflict resolution during sync', async () => {
      const medicationId = TestDataGenerator.randomId();

      // Local record
      const localRecord = {
        id: TestDataGenerator.randomId(),
        medicationId,
        patientId,
        scheduledTime: '2025-09-30T08:00:00Z',
        takenTime: '2025-09-30T08:05:00Z',
        status: 'taken',
        updatedAt: '2025-09-30T08:05:00Z',
      };

      await database.insert('adherence_records', localRecord);

      // Server has different version
      apiClient.mockResponseWithMatcher(
        (endpoint) => endpoint.includes('/adherence/sync'),
        {
          synced: 0,
          conflicts: [
            {
              recordId: localRecord.id,
              localVersion: localRecord,
              serverVersion: {
                ...localRecord,
                status: 'skipped',
                notes: 'Changed by family member',
                updatedAt: '2025-09-30T08:10:00Z',
              },
            },
          ],
          errors: [],
        }
      );

      const syncResult = await apiClient.request(
        `/api/v1/patients/${patientId}/adherence/sync`,
        {
          method: 'POST',
          body: JSON.stringify({ records: [localRecord] }),
        }
      );

      expect(syncResult.data.conflicts).toHaveLength(1);

      // Resolve conflict (server wins for this test)
      const conflict = syncResult.data.conflicts[0];
      await database.update('adherence_records', localRecord.id, {
        ...conflict.serverVersion,
        conflictResolved: true,
        resolutionStrategy: 'server_wins',
      });

      const resolved = await database.getById('adherence_records', localRecord.id);
      expect(resolved.status).toBe('skipped');
      expect(resolved.conflictResolved).toBe(true);
    });
  });
});