/**
 * AdherenceModel Test Suite
 *
 * Comprehensive tests for adherence data model operations.
 * Tests CRUD operations, cultural context handling, and database integrity.
 */

import { AdherenceModel } from '../AdherenceModel';
import { DatabaseService } from '../../services/database/databaseService';
import {
  AdherenceRecord,
  ProgressMetrics,
  Milestone,
  StreakData,
  AdherenceConfiguration,
  ProviderAdherenceReport,
  AdherenceStatus,
  TimePeriod,
  MilestoneType,
  MalaysianCulturalTheme
} from '../../types/adherence/adherence.types';

// Mock database service
jest.mock('../../services/database/databaseService');

describe('AdherenceModel', () => {
  let model: AdherenceModel;
  let mockDb: jest.Mocked<DatabaseService>;

  const mockPatientId = 'patient-123';
  const mockMedicationId = 'medication-456';
  const mockFamilyId = 'family-789';

  // Sample adherence record data
  const sampleAdherenceRecord: Omit<AdherenceRecord, 'id' | 'createdAt' | 'updatedAt'> = {
    medicationId: mockMedicationId,
    patientId: mockPatientId,
    scheduledTime: new Date('2025-01-15T08:00:00Z'),
    takenTime: new Date('2025-01-15T08:05:00Z'),
    status: 'taken' as AdherenceStatus,
    adherenceScore: 10,
    notes: 'Taken with breakfast',
    culturalContext: {
      prayerTimeConflict: false,
      fastingPeriod: true,
      familySupport: true,
      traditionalMedicineUsed: false,
      reasonCode: undefined
    }
  };

  const sampleProgressMetrics: ProgressMetrics = {
    patientId: mockPatientId,
    period: 'monthly' as TimePeriod,
    adherenceRate: 85.5,
    streakCount: 12,
    longestStreak: 25,
    totalDoses: 60,
    takenDoses: 51,
    missedDoses: 6,
    lateDoses: 3,
    skippedDoses: 0,
    culturalAdjustments: {
      ramadanAdjustments: 8,
      prayerTimeDelays: 5,
      festivalExemptions: 2,
      familyCoordinationImpact: 15,
      traditionalMedicineInteractions: 1
    },
    calculatedAt: new Date('2025-01-15T10:00:00Z')
  };

  const sampleMilestone: Omit<Milestone, 'id'> = {
    patientId: mockPatientId,
    type: 'streak' as MilestoneType,
    threshold: 30,
    culturalTheme: 'hibiscus_excellence' as MalaysianCulturalTheme,
    achievedDate: new Date('2025-01-15T10:00:00Z'),
    celebrationShown: false,
    familyNotified: false,
    metadata: {
      description: '30-day medication streak achievement',
      descriptionMs: 'Pencapaian streik 30 hari ubat',
      celebrationMessage: 'Congratulations on your commitment!',
      celebrationMessageMs: 'Tahniah atas komitmen anda!',
      badgeIcon: 'hibiscus-gold',
      culturalSignificance: 'Symbol of Malaysian excellence and dedication',
      shareableContent: {
        image: 'hibiscus-achievement.png',
        text: 'Achieved 30-day medication streak!',
        textMs: 'Mencapai streik 30 hari ubat!',
        hashtags: ['#MediMateAchievement', '#HealthyMalaysia']
      }
    }
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock database service
    mockDb = {
      query: jest.fn(),
      one: jest.fn(),
      oneOrNone: jest.fn(),
      none: jest.fn(),
      tx: jest.fn(),
      getInstance: jest.fn()
    } as any;

    (DatabaseService.getInstance as jest.Mock).mockReturnValue(mockDb);

    // Create model instance
    model = AdherenceModel.getInstance();
  });

  describe('createAdherenceRecord', () => {
    beforeEach(() => {
      // Mock successful transaction
      mockDb.tx.mockImplementation(async (callback) => {
        const mockTransaction = {
          one: jest.fn().mockResolvedValue({
            id: 'record-123',
            medication_id: mockMedicationId,
            patient_id: mockPatientId,
            scheduled_time: sampleAdherenceRecord.scheduledTime.toISOString(),
            taken_time: sampleAdherenceRecord.takenTime?.toISOString(),
            status: sampleAdherenceRecord.status,
            adherence_score: sampleAdherenceRecord.adherenceScore,
            notes: sampleAdherenceRecord.notes,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }),
          none: jest.fn().mockResolvedValue(undefined)
        };
        return await callback(mockTransaction);
      });
    });

    it('should create adherence record with cultural context', async () => {
      const result = await model.createAdherenceRecord(sampleAdherenceRecord);

      expect(result).toMatchObject({
        id: expect.any(String),
        medicationId: mockMedicationId,
        patientId: mockPatientId,
        status: 'taken',
        adherenceScore: 10,
        culturalContext: expect.objectContaining({
          prayerTimeConflict: false,
          fastingPeriod: true,
          familySupport: true,
          traditionalMedicineUsed: false
        }),
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date)
      });

      expect(mockDb.tx).toHaveBeenCalledTimes(1);
    });

    it('should handle missing taken time for missed doses', async () => {
      const missedRecord = {
        ...sampleAdherenceRecord,
        takenTime: undefined,
        status: 'missed' as AdherenceStatus,
        adherenceScore: 0
      };

      const result = await model.createAdherenceRecord(missedRecord);

      expect(result.takenTime).toBeUndefined();
      expect(result.status).toBe('missed');
      expect(result.adherenceScore).toBe(0);
    });

    it('should handle cultural context with reason codes', async () => {
      const culturalRecord = {
        ...sampleAdherenceRecord,
        status: 'late' as AdherenceStatus,
        culturalContext: {
          ...sampleAdherenceRecord.culturalContext,
          prayerTimeConflict: true,
          reasonCode: 'prayer_time_delay' as any
        }
      };

      const result = await model.createAdherenceRecord(culturalRecord);

      expect(result.culturalContext.prayerTimeConflict).toBe(true);
      expect(result.culturalContext.reasonCode).toBe('prayer_time_delay');
    });

    it('should handle database transaction failures', async () => {
      mockDb.tx.mockRejectedValue(new Error('Transaction failed'));

      await expect(
        model.createAdherenceRecord(sampleAdherenceRecord)
      ).rejects.toThrow('Failed to create adherence record: Transaction failed');
    });
  });

  describe('getAdherenceRecords', () => {
    const mockDbRecords = [
      {
        id: 'record-1',
        medication_id: mockMedicationId,
        patient_id: mockPatientId,
        scheduled_time: '2025-01-15T08:00:00Z',
        taken_time: '2025-01-15T08:05:00Z',
        status: 'taken',
        adherence_score: 10,
        notes: 'Taken with breakfast',
        prayer_time_conflict: false,
        fasting_period: true,
        festival_period: null,
        family_support: true,
        traditional_medicine_used: false,
        reason_code: null,
        created_at: '2025-01-15T08:05:00Z',
        updated_at: '2025-01-15T08:05:00Z'
      },
      {
        id: 'record-2',
        medication_id: mockMedicationId,
        patient_id: mockPatientId,
        scheduled_time: '2025-01-15T20:00:00Z',
        taken_time: '2025-01-15T20:20:00Z',
        status: 'late',
        adherence_score: 8,
        notes: 'Late due to prayer',
        prayer_time_conflict: true,
        fasting_period: true,
        festival_period: null,
        family_support: false,
        traditional_medicine_used: false,
        reason_code: 'prayer_time_delay',
        created_at: '2025-01-15T20:20:00Z',
        updated_at: '2025-01-15T20:20:00Z'
      }
    ];

    beforeEach(() => {
      mockDb.query.mockResolvedValue(mockDbRecords);
      mockDb.one.mockResolvedValue({ total: '2' });
    });

    it('should retrieve adherence records with cultural context', async () => {
      const result = await model.getAdherenceRecords(mockPatientId);

      expect(result.records).toHaveLength(2);
      expect(result.total).toBe(2);

      expect(result.records[0]).toMatchObject({
        id: 'record-1',
        medicationId: mockMedicationId,
        patientId: mockPatientId,
        status: 'taken',
        culturalContext: {
          prayerTimeConflict: false,
          fastingPeriod: true,
          familySupport: true,
          traditionalMedicineUsed: false
        }
      });

      expect(result.records[1]).toMatchObject({
        id: 'record-2',
        status: 'late',
        culturalContext: {
          prayerTimeConflict: true,
          reasonCode: 'prayer_time_delay'
        }
      });
    });

    it('should filter by medication ID', async () => {
      await model.getAdherenceRecords(mockPatientId, {
        medicationId: mockMedicationId
      });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('AND ar.medication_id = $2'),
        expect.arrayContaining([mockPatientId, mockMedicationId])
      );
    });

    it('should filter by date range', async () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');

      await model.getAdherenceRecords(mockPatientId, {
        startDate,
        endDate
      });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('AND ar.scheduled_time >= $2'),
        expect.arrayContaining([mockPatientId, startDate.toISOString()])
      );

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('AND ar.scheduled_time <= $3'),
        expect.arrayContaining([mockPatientId, startDate.toISOString(), endDate.toISOString()])
      );
    });

    it('should filter by status', async () => {
      await model.getAdherenceRecords(mockPatientId, {
        status: 'taken' as AdherenceStatus
      });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('AND ar.status = $2'),
        expect.arrayContaining([mockPatientId, 'taken'])
      );
    });

    it('should handle pagination', async () => {
      await model.getAdherenceRecords(mockPatientId, {
        limit: 10,
        offset: 20
      });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $2 OFFSET $3'),
        expect.arrayContaining([mockPatientId, 10, 20])
      );
    });

    it('should handle empty results', async () => {
      mockDb.query.mockResolvedValue([]);
      mockDb.one.mockResolvedValue({ total: '0' });

      const result = await model.getAdherenceRecords(mockPatientId);

      expect(result.records).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('updateAdherenceRecord', () => {
    beforeEach(() => {
      mockDb.oneOrNone.mockResolvedValue({
        id: 'record-123',
        medication_id: mockMedicationId,
        patient_id: mockPatientId,
        scheduled_time: '2025-01-15T08:00:00Z',
        taken_time: '2025-01-15T08:10:00Z',
        status: 'late',
        adherence_score: 8,
        notes: 'Updated notes',
        created_at: '2025-01-15T08:05:00Z',
        updated_at: new Date().toISOString()
      });
    });

    it('should update adherence record fields', async () => {
      const updates = {
        takenTime: new Date('2025-01-15T08:10:00Z'),
        status: 'late' as AdherenceStatus,
        adherenceScore: 8,
        notes: 'Updated notes'
      };

      const result = await model.updateAdherenceRecord(
        'record-123',
        mockPatientId,
        updates
      );

      expect(result).toMatchObject({
        id: 'record-123',
        status: 'late',
        adherenceScore: 8,
        notes: 'Updated notes'
      });

      expect(mockDb.oneOrNone).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE adherence_records'),
        expect.arrayContaining(['2025-01-15T08:10:00Z', 'late', 8, 'Updated notes'])
      );
    });

    it('should handle null taken time', async () => {
      const updates = {
        takenTime: undefined,
        status: 'missed' as AdherenceStatus
      };

      await model.updateAdherenceRecord('record-123', mockPatientId, updates);

      expect(mockDb.oneOrNone).toHaveBeenCalledWith(
        expect.stringContaining('taken_time = $1'),
        expect.arrayContaining([null])
      );
    });

    it('should return null for non-existent record', async () => {
      mockDb.oneOrNone.mockResolvedValue(null);

      const result = await model.updateAdherenceRecord(
        'non-existent',
        mockPatientId,
        { status: 'taken' as AdherenceStatus }
      );

      expect(result).toBeNull();
    });

    it('should throw error for no fields to update', async () => {
      await expect(
        model.updateAdherenceRecord('record-123', mockPatientId, {})
      ).rejects.toThrow('No fields to update');
    });
  });

  describe('storeProgressMetrics', () => {
    beforeEach(() => {
      mockDb.none.mockResolvedValue(undefined);
    });

    it('should store progress metrics with upsert', async () => {
      await model.storeProgressMetrics(sampleProgressMetrics);

      expect(mockDb.none).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO progress_metrics'),
        expect.arrayContaining([
          mockPatientId,
          'monthly',
          85.5,
          12,
          25,
          60,
          51,
          6,
          3,
          0,
          JSON.stringify(sampleProgressMetrics.culturalAdjustments),
          sampleProgressMetrics.calculatedAt.toISOString()
        ])
      );
    });

    it('should handle database errors gracefully', async () => {
      mockDb.none.mockRejectedValue(new Error('Constraint violation'));

      await expect(
        model.storeProgressMetrics(sampleProgressMetrics)
      ).rejects.toThrow('Failed to store progress metrics: Constraint violation');
    });
  });

  describe('getLatestProgressMetrics', () => {
    beforeEach(() => {
      mockDb.oneOrNone.mockResolvedValue({
        patient_id: mockPatientId,
        period: 'monthly',
        adherence_rate: 85.5,
        streak_count: 12,
        longest_streak: 25,
        total_doses: 60,
        taken_doses: 51,
        missed_doses: 6,
        late_doses: 3,
        skipped_doses: 0,
        cultural_adjustments: JSON.stringify(sampleProgressMetrics.culturalAdjustments),
        calculated_at: '2025-01-15T10:00:00Z'
      });
    });

    it('should retrieve latest progress metrics', async () => {
      const result = await model.getLatestProgressMetrics(mockPatientId, 'monthly');

      expect(result).toMatchObject({
        patientId: mockPatientId,
        period: 'monthly',
        adherenceRate: 85.5,
        streakCount: 12,
        longestStreak: 25,
        culturalAdjustments: sampleProgressMetrics.culturalAdjustments
      });

      expect(mockDb.oneOrNone).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY calculated_at DESC LIMIT 1'),
        [mockPatientId, 'monthly']
      );
    });

    it('should return null when no metrics found', async () => {
      mockDb.oneOrNone.mockResolvedValue(null);

      const result = await model.getLatestProgressMetrics(mockPatientId, 'weekly');

      expect(result).toBeNull();
    });
  });

  describe('upsertMilestone', () => {
    beforeEach(() => {
      mockDb.one.mockResolvedValue({
        id: 'milestone-123',
        patient_id: mockPatientId,
        type: 'streak',
        threshold: 30,
        cultural_theme: 'hibiscus_excellence',
        achieved_date: '2025-01-15T10:00:00Z',
        celebration_shown: false,
        family_notified: false,
        metadata: JSON.stringify(sampleMilestone.metadata)
      });
    });

    it('should create or update milestone', async () => {
      const result = await model.upsertMilestone(sampleMilestone);

      expect(result).toMatchObject({
        id: 'milestone-123',
        patientId: mockPatientId,
        type: 'streak',
        threshold: 30,
        culturalTheme: 'hibiscus_excellence',
        achievedDate: expect.any(Date),
        celebrationShown: false,
        familyNotified: false,
        metadata: sampleMilestone.metadata
      });

      expect(mockDb.one).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO milestones'),
        expect.arrayContaining([
          expect.any(String), // ID
          mockPatientId,
          'streak',
          30,
          'hibiscus_excellence',
          sampleMilestone.achievedDate?.toISOString(),
          false,
          false,
          JSON.stringify(sampleMilestone.metadata)
        ])
      );
    });

    it('should handle milestone without achieved date', async () => {
      const pendingMilestone = {
        ...sampleMilestone,
        achievedDate: undefined
      };

      await model.upsertMilestone(pendingMilestone);

      expect(mockDb.one).toHaveBeenCalledWith(
        expect.anything(),
        expect.arrayContaining([null]) // achievedDate should be null
      );
    });
  });

  describe('getPatientMilestones', () => {
    const mockMilestones = [
      {
        id: 'milestone-1',
        patient_id: mockPatientId,
        type: 'streak',
        threshold: 30,
        cultural_theme: 'hibiscus_excellence',
        achieved_date: '2025-01-15T10:00:00Z',
        celebration_shown: true,
        family_notified: true,
        metadata: JSON.stringify(sampleMilestone.metadata)
      },
      {
        id: 'milestone-2',
        patient_id: mockPatientId,
        type: 'adherence_rate',
        threshold: 90,
        cultural_theme: 'wau_dedication',
        achieved_date: null,
        celebration_shown: false,
        family_notified: false,
        metadata: JSON.stringify({
          description: 'Achieve 90% adherence rate',
          descriptionMs: 'Capai kadar kepatuhan 90%'
        })
      }
    ];

    beforeEach(() => {
      mockDb.query.mockResolvedValue(mockMilestones);
    });

    it('should retrieve patient milestones', async () => {
      const result = await model.getPatientMilestones(mockPatientId);

      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        id: 'milestone-1',
        type: 'streak',
        achievedDate: expect.any(Date),
        celebrationShown: true
      });
      expect(result[1]).toMatchObject({
        id: 'milestone-2',
        type: 'adherence_rate',
        achievedDate: undefined,
        celebrationShown: false
      });
    });

    it('should filter by milestone type', async () => {
      await model.getPatientMilestones(mockPatientId, {
        type: 'streak' as MilestoneType
      });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('AND type = $2'),
        [mockPatientId, 'streak']
      );
    });

    it('should filter by achieved status', async () => {
      await model.getPatientMilestones(mockPatientId, {
        achieved: true
      });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('AND achieved_date IS NOT NULL'),
        [mockPatientId]
      );
    });

    it('should limit results', async () => {
      await model.getPatientMilestones(mockPatientId, {
        limit: 5
      });

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $2'),
        [mockPatientId, 5]
      );
    });
  });

  describe('storeStreakData', () => {
    const sampleStreakData: StreakData = {
      patientId: mockPatientId,
      medicationId: mockMedicationId,
      currentStreak: 15,
      longestStreak: 30,
      streakType: 'daily',
      startDate: new Date('2025-01-01T00:00:00Z'),
      lastDoseDate: new Date('2025-01-15T08:00:00Z'),
      culturalBonus: 2,
      streakStatus: 'active'
    };

    beforeEach(() => {
      mockDb.none.mockResolvedValue(undefined);
    });

    it('should store streak data with upsert', async () => {
      await model.storeStreakData(sampleStreakData);

      expect(mockDb.none).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO streak_data'),
        expect.arrayContaining([
          mockPatientId,
          mockMedicationId,
          15,
          30,
          'daily',
          sampleStreakData.startDate.toISOString(),
          sampleStreakData.lastDoseDate?.toISOString(),
          2,
          'active',
          expect.any(String) // updated_at
        ])
      );
    });

    it('should handle null medication ID for overall streaks', async () => {
      const overallStreak = {
        ...sampleStreakData,
        medicationId: undefined
      };

      await model.storeStreakData(overallStreak);

      expect(mockDb.none).toHaveBeenCalledWith(
        expect.anything(),
        expect.arrayContaining([
          mockPatientId,
          null, // medication_id
          15,
          30,
          'daily'
        ])
      );
    });
  });

  describe('getStreakData', () => {
    const mockStreakRecords = [
      {
        patient_id: mockPatientId,
        medication_id: mockMedicationId,
        current_streak: 15,
        longest_streak: 30,
        streak_type: 'daily',
        start_date: '2025-01-01T00:00:00Z',
        last_dose_date: '2025-01-15T08:00:00Z',
        cultural_bonus: 2,
        streak_status: 'active'
      }
    ];

    beforeEach(() => {
      mockDb.query.mockResolvedValue(mockStreakRecords);
    });

    it('should retrieve streak data', async () => {
      const result = await model.getStreakData(mockPatientId);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        patientId: mockPatientId,
        medicationId: mockMedicationId,
        currentStreak: 15,
        longestStreak: 30,
        streakType: 'daily',
        culturalBonus: 2,
        streakStatus: 'active'
      });
    });

    it('should filter by medication ID', async () => {
      await model.getStreakData(mockPatientId, mockMedicationId);

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('AND (medication_id = $2 OR medication_id IS NULL)'),
        [mockPatientId, mockMedicationId]
      );
    });

    it('should filter by streak type', async () => {
      await model.getStreakData(mockPatientId, undefined, 'weekly');

      expect(mockDb.query).toHaveBeenCalledWith(
        expect.stringContaining('AND streak_type = $2'),
        [mockPatientId, 'weekly']
      );
    });
  });

  describe('storeAdherenceConfiguration', () => {
    const sampleConfig: AdherenceConfiguration = {
      patientId: mockPatientId,
      culturalPreferences: {
        primaryLanguage: 'ms',
        religiousObservance: {
          religion: 'islam',
          observanceLevel: 'moderate',
          prayerTimePreferences: ['fajr', 'maghrib'],
          fastingPeriods: ['ramadan']
        },
        festivalPriorities: ['hari_raya_aidilfitri', 'hari_raya_aidiladha'],
        traditionMedicineIntegration: false,
        familyInvolvementLevel: 'moderate'
      },
      familySettings: {
        allowFamilyTracking: true,
        shareProgressWithFamily: true,
        familyNotifications: true,
        coordinationLevel: 'coordinated'
      },
      notificationSettings: {
        adherenceReminders: true,
        progressCelebrations: true,
        familyUpdates: true,
        culturalAdaptations: true,
        preferredTiming: ['08:00', '20:00']
      },
      analyticsSettings: {
        enablePredictiveAnalytics: true,
        culturalFactorAnalysis: true,
        familyAnalytics: true,
        shareWithProviders: true,
        dataRetentionPeriod: 365
      }
    };

    beforeEach(() => {
      mockDb.none.mockResolvedValue(undefined);
    });

    it('should store adherence configuration', async () => {
      await model.storeAdherenceConfiguration(sampleConfig);

      expect(mockDb.none).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO adherence_configurations'),
        expect.arrayContaining([
          mockPatientId,
          JSON.stringify(sampleConfig.culturalPreferences),
          JSON.stringify(sampleConfig.familySettings),
          JSON.stringify(sampleConfig.notificationSettings),
          JSON.stringify(sampleConfig.analyticsSettings),
          expect.any(String) // updated_at
        ])
      );
    });
  });

  describe('getAdherenceConfiguration', () => {
    const mockConfigRecord = {
      patient_id: mockPatientId,
      cultural_preferences: JSON.stringify({
        primaryLanguage: 'ms',
        religiousObservance: {
          religion: 'islam',
          observanceLevel: 'moderate',
          prayerTimePreferences: ['fajr', 'maghrib'],
          fastingPeriods: ['ramadan']
        }
      }),
      family_settings: JSON.stringify({
        allowFamilyTracking: true,
        shareProgressWithFamily: true
      }),
      notification_settings: JSON.stringify({
        adherenceReminders: true,
        progressCelebrations: true
      }),
      analytics_settings: JSON.stringify({
        enablePredictiveAnalytics: true,
        culturalFactorAnalysis: true
      })
    };

    beforeEach(() => {
      mockDb.oneOrNone.mockResolvedValue(mockConfigRecord);
    });

    it('should retrieve adherence configuration', async () => {
      const result = await model.getAdherenceConfiguration(mockPatientId);

      expect(result).toMatchObject({
        patientId: mockPatientId,
        culturalPreferences: expect.objectContaining({
          primaryLanguage: 'ms',
          religiousObservance: expect.objectContaining({
            religion: 'islam'
          })
        }),
        familySettings: expect.objectContaining({
          allowFamilyTracking: true
        }),
        notificationSettings: expect.objectContaining({
          adherenceReminders: true
        }),
        analyticsSettings: expect.objectContaining({
          enablePredictiveAnalytics: true
        })
      });
    });

    it('should return null when configuration not found', async () => {
      mockDb.oneOrNone.mockResolvedValue(null);

      const result = await model.getAdherenceConfiguration(mockPatientId);

      expect(result).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection failures', async () => {
      mockDb.query.mockRejectedValue(new Error('Connection timeout'));

      await expect(
        model.getAdherenceRecords(mockPatientId)
      ).rejects.toThrow('Failed to get adherence records: Connection timeout');
    });

    it('should handle invalid JSON in database', async () => {
      mockDb.oneOrNone.mockResolvedValue({
        patient_id: mockPatientId,
        cultural_preferences: 'invalid-json',
        family_settings: '{}',
        notification_settings: '{}',
        analytics_settings: '{}'
      });

      await expect(
        model.getAdherenceConfiguration(mockPatientId)
      ).rejects.toThrow();
    });

    it('should handle constraint violations gracefully', async () => {
      mockDb.tx.mockRejectedValue(new Error('FOREIGN KEY constraint failed'));

      await expect(
        model.createAdherenceRecord(sampleAdherenceRecord)
      ).rejects.toThrow('Failed to create adherence record: FOREIGN KEY constraint failed');
    });
  });

  describe('Performance', () => {
    it('should handle large result sets efficiently', async () => {
      const largeResultSet = Array(1000).fill(null).map((_, index) => ({
        id: `record-${index}`,
        medication_id: mockMedicationId,
        patient_id: mockPatientId,
        scheduled_time: new Date(Date.now() - index * 60 * 60 * 1000).toISOString(),
        taken_time: new Date(Date.now() - index * 60 * 60 * 1000 + 5 * 60 * 1000).toISOString(),
        status: 'taken',
        adherence_score: 10,
        notes: `Note ${index}`,
        prayer_time_conflict: false,
        fasting_period: false,
        festival_period: null,
        family_support: true,
        traditional_medicine_used: false,
        reason_code: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));

      mockDb.query.mockResolvedValue(largeResultSet);
      mockDb.one.mockResolvedValue({ total: '1000' });

      const startTime = Date.now();
      const result = await model.getAdherenceRecords(mockPatientId);
      const endTime = Date.now();

      expect(result.records).toHaveLength(1000);
      expect(endTime - startTime).toBeLessThan(100); // Should process quickly
    });
  });
});