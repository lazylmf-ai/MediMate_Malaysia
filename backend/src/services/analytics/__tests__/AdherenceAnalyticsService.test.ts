/**
 * AdherenceAnalyticsService Test Suite
 *
 * Comprehensive tests for adherence analytics with Malaysian cultural context.
 * Tests progress calculation, cultural scoring, and predictive analytics.
 */

import { AdherenceAnalyticsService } from '../AdherenceAnalyticsService';
import { DatabaseService } from '../../database/databaseService';
import { CacheService } from '../../cache/redisService';
import {
  AdherenceRecord,
  ProgressMetrics,
  TimePeriod,
  AdherenceStatus,
  CulturalAdjustmentMetrics
} from '../../../types/adherence/adherence.types';

// Mock dependencies
jest.mock('../../database/databaseService');
jest.mock('../../cache/redisService');
jest.mock('../../cultural/culturalCalendarService');
jest.mock('../../cultural/prayerTimeService');

describe('AdherenceAnalyticsService', () => {
  let service: AdherenceAnalyticsService;
  let mockDb: jest.Mocked<DatabaseService>;
  let mockCache: jest.Mocked<CacheService>;

  const mockPatientId = 'test-patient-123';
  const mockMedicationId = 'test-medication-456';

  // Sample test data
  const sampleAdherenceRecords: AdherenceRecord[] = [
    {
      id: 'record-1',
      medicationId: mockMedicationId,
      patientId: mockPatientId,
      scheduledTime: new Date('2025-01-01T08:00:00Z'),
      takenTime: new Date('2025-01-01T08:05:00Z'),
      status: 'taken' as AdherenceStatus,
      adherenceScore: 10,
      notes: 'Taken on time',
      culturalContext: {
        prayerTimeConflict: false,
        fastingPeriod: false,
        familySupport: true,
        traditionalMedicineUsed: false,
        reasonCode: undefined
      },
      createdAt: new Date('2025-01-01T08:05:00Z'),
      updatedAt: new Date('2025-01-01T08:05:00Z')
    },
    {
      id: 'record-2',
      medicationId: mockMedicationId,
      patientId: mockPatientId,
      scheduledTime: new Date('2025-01-01T20:00:00Z'),
      takenTime: new Date('2025-01-01T20:20:00Z'),
      status: 'late' as AdherenceStatus,
      adherenceScore: 8,
      notes: 'Late due to prayer time',
      culturalContext: {
        prayerTimeConflict: true,
        fastingPeriod: false,
        familySupport: false,
        traditionalMedicineUsed: false,
        reasonCode: 'prayer_time_delay'
      },
      createdAt: new Date('2025-01-01T20:20:00Z'),
      updatedAt: new Date('2025-01-01T20:20:00Z')
    },
    {
      id: 'record-3',
      medicationId: mockMedicationId,
      patientId: mockPatientId,
      scheduledTime: new Date('2025-01-02T08:00:00Z'),
      status: 'missed' as AdherenceStatus,
      adherenceScore: 0,
      notes: 'Missed dose',
      culturalContext: {
        prayerTimeConflict: false,
        fastingPeriod: true,
        familySupport: false,
        traditionalMedicineUsed: false,
        reasonCode: 'fasting_exemption'
      },
      createdAt: new Date('2025-01-02T09:00:00Z'),
      updatedAt: new Date('2025-01-02T09:00:00Z')
    },
    {
      id: 'record-4',
      medicationId: mockMedicationId,
      patientId: mockPatientId,
      scheduledTime: new Date('2025-01-02T20:00:00Z'),
      takenTime: new Date('2025-01-02T19:55:00Z'),
      status: 'taken' as AdherenceStatus,
      adherenceScore: 10,
      notes: 'Taken with family support during Ramadan',
      culturalContext: {
        prayerTimeConflict: false,
        fastingPeriod: true,
        familySupport: true,
        traditionalMedicineUsed: false,
        reasonCode: undefined
      },
      createdAt: new Date('2025-01-02T19:55:00Z'),
      updatedAt: new Date('2025-01-02T19:55:00Z')
    }
  ];

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();

    // Setup mock instances
    mockDb = {
      query: jest.fn(),
      one: jest.fn(),
      oneOrNone: jest.fn(),
      none: jest.fn(),
      tx: jest.fn(),
      getInstance: jest.fn()
    } as any;

    mockCache = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
      getInstance: jest.fn()
    } as any;

    // Mock static getInstance methods
    (DatabaseService.getInstance as jest.Mock).mockReturnValue(mockDb);
    (CacheService.getInstance as jest.Mock).mockReturnValue(mockCache);

    // Create service instance
    service = AdherenceAnalyticsService.getInstance();
  });

  describe('calculateProgressMetrics', () => {
    beforeEach(() => {
      // Mock cache miss
      mockCache.get.mockResolvedValue(null);
      mockCache.set.mockResolvedValue(undefined);

      // Mock database response for adherence records
      mockDb.query.mockResolvedValue(sampleAdherenceRecords.map(record => ({
        id: record.id,
        medication_id: record.medicationId,
        patient_id: record.patientId,
        scheduled_time: record.scheduledTime.toISOString(),
        taken_time: record.takenTime?.toISOString() || null,
        status: record.status,
        adherence_score: record.adherenceScore,
        notes: record.notes,
        prayer_time_conflict: record.culturalContext.prayerTimeConflict,
        fasting_period: record.culturalContext.fastingPeriod,
        festival_period: record.culturalContext.festivalPeriod || null,
        family_support: record.culturalContext.familySupport,
        traditional_medicine_used: record.culturalContext.traditionalMedicineUsed,
        reason_code: record.culturalContext.reasonCode || null,
        created_at: record.createdAt.toISOString(),
        updated_at: record.updatedAt.toISOString()
      })));

      // Mock streak calculation
      mockDb.query.mockImplementation((query: string) => {
        if (query.includes('ORDER BY scheduled_time DESC LIMIT 100')) {
          return Promise.resolve([
            { status: 'taken', scheduled_time: '2025-01-02T20:00:00Z' },
            { status: 'missed', scheduled_time: '2025-01-02T08:00:00Z' },
            { status: 'late', scheduled_time: '2025-01-01T20:00:00Z' },
            { status: 'taken', scheduled_time: '2025-01-01T08:00:00Z' }
          ]);
        }
        return Promise.resolve([]);
      });
    });

    it('should calculate accurate progress metrics for monthly period', async () => {
      const period: TimePeriod = 'monthly';
      const result = await service.calculateProgressMetrics(mockPatientId, period, mockMedicationId);

      expect(result).toMatchObject({
        patientId: mockPatientId,
        period: 'monthly',
        totalDoses: 4,
        takenDoses: 2,
        missedDoses: 1,
        lateDoses: 1,
        skippedDoses: 0
      });

      // Verify adherence rate calculation
      expect(result.adherenceRate).toBeCloseTo(75.0, 1); // (2 taken + 1 late) / 4 total = 75%

      // Verify cultural adjustments
      expect(result.culturalAdjustments).toMatchObject({
        ramadanAdjustments: 1, // One record taken during fasting period
        prayerTimeDelays: 1, // One late due to prayer time
        festivalExemptions: 0,
        familyCoordinationImpact: 2, // Two records with family support
        traditionalMedicineInteractions: 0
      });

      expect(result.calculatedAt).toBeInstanceOf(Date);
    });

    it('should handle empty adherence records gracefully', async () => {
      mockDb.query.mockResolvedValueOnce([]); // No adherence records

      const result = await service.calculateProgressMetrics(mockPatientId, 'weekly');

      expect(result).toMatchObject({
        patientId: mockPatientId,
        period: 'weekly',
        adherenceRate: 0,
        totalDoses: 0,
        takenDoses: 0,
        missedDoses: 0,
        lateDoses: 0,
        skippedDoses: 0
      });
    });

    it('should apply cultural bonus for Ramadan compliance', async () => {
      // Mock records with Ramadan adjustments
      const ramadanRecords = sampleAdherenceRecords.map(record => ({
        ...record,
        culturalContext: {
          ...record.culturalContext,
          fastingPeriod: true
        }
      }));

      mockDb.query.mockResolvedValueOnce(ramadanRecords.map(record => ({
        id: record.id,
        medication_id: record.medicationId,
        patient_id: record.patientId,
        scheduled_time: record.scheduledTime.toISOString(),
        taken_time: record.takenTime?.toISOString() || null,
        status: record.status,
        adherence_score: record.adherenceScore,
        notes: record.notes,
        prayer_time_conflict: record.culturalContext.prayerTimeConflict,
        fasting_period: true,
        festival_period: record.culturalContext.festivalPeriod || null,
        family_support: record.culturalContext.familySupport,
        traditional_medicine_used: record.culturalContext.traditionalMedicineUsed,
        reason_code: record.culturalContext.reasonCode || null,
        created_at: record.createdAt.toISOString(),
        updated_at: record.updatedAt.toISOString()
      })));

      const result = await service.calculateProgressMetrics(mockPatientId, 'monthly');

      // Should have higher adherence rate due to Ramadan bonus
      expect(result.adherenceRate).toBeGreaterThan(75.0);
      expect(result.culturalAdjustments.ramadanAdjustments).toBeGreaterThan(0);
    });

    it('should use cached results when available', async () => {
      const cachedMetrics: ProgressMetrics = {
        patientId: mockPatientId,
        period: 'monthly',
        adherenceRate: 85.5,
        streakCount: 5,
        longestStreak: 10,
        totalDoses: 20,
        takenDoses: 17,
        missedDoses: 2,
        lateDoses: 1,
        skippedDoses: 0,
        culturalAdjustments: {
          ramadanAdjustments: 3,
          prayerTimeDelays: 2,
          festivalExemptions: 1,
          familyCoordinationImpact: 8,
          traditionalMedicineInteractions: 0
        },
        calculatedAt: new Date()
      };

      mockCache.get.mockResolvedValue(JSON.stringify(cachedMetrics));

      const result = await service.calculateProgressMetrics(mockPatientId, 'monthly');

      expect(result).toEqual(cachedMetrics);
      expect(mockDb.query).not.toHaveBeenCalled();
    });

    it('should handle database errors gracefully', async () => {
      mockDb.query.mockRejectedValue(new Error('Database connection failed'));

      await expect(
        service.calculateProgressMetrics(mockPatientId, 'monthly')
      ).rejects.toThrow('Database connection failed');
    });
  });

  describe('generateAdherenceAnalytics', () => {
    beforeEach(() => {
      mockDb.query.mockResolvedValue(sampleAdherenceRecords.map(record => ({
        id: record.id,
        medication_id: record.medicationId,
        patient_id: record.patientId,
        scheduled_time: record.scheduledTime.toISOString(),
        taken_time: record.takenTime?.toISOString() || null,
        status: record.status,
        adherence_score: record.adherenceScore,
        notes: record.notes,
        prayer_time_conflict: record.culturalContext.prayerTimeConflict,
        fasting_period: record.culturalContext.fastingPeriod,
        festival_period: record.culturalContext.festivalPeriod || null,
        family_support: record.culturalContext.familySupport,
        traditional_medicine_used: record.culturalContext.traditionalMedicineUsed,
        reason_code: record.culturalContext.reasonCode || null,
        created_at: record.createdAt.toISOString(),
        updated_at: record.updatedAt.toISOString()
      })));
    });

    it('should generate comprehensive adherence analytics', async () => {
      const timeframe = {
        start: new Date('2025-01-01T00:00:00Z'),
        end: new Date('2025-01-31T23:59:59Z')
      };

      const result = await service.generateAdherenceAnalytics(
        mockPatientId,
        timeframe,
        'individual'
      );

      expect(result).toMatchObject({
        patientId: mockPatientId,
        analysisType: 'individual',
        timeframe
      });

      expect(result.insights).toBeInstanceOf(Array);
      expect(result.patterns).toBeInstanceOf(Array);
      expect(result.culturalObservations).toBeInstanceOf(Array);
      expect(result.generatedAt).toBeInstanceOf(Date);
    });

    it('should identify timing patterns in adherence data', async () => {
      const timeframe = {
        start: new Date('2025-01-01T00:00:00Z'),
        end: new Date('2025-01-31T23:59:59Z')
      };

      const result = await service.generateAdherenceAnalytics(
        mockPatientId,
        timeframe,
        'individual'
      );

      // Should identify common timing patterns
      const timingInsights = result.insights.filter(
        insight => insight.category === 'timing_patterns'
      );

      expect(timingInsights.length).toBeGreaterThan(0);
      if (timingInsights.length > 0) {
        expect(timingInsights[0]).toMatchObject({
          category: 'timing_patterns',
          impact: 'positive',
          actionable: true
        });
      }
    });

    it('should identify cultural impact on adherence', async () => {
      const timeframe = {
        start: new Date('2025-01-01T00:00:00Z'),
        end: new Date('2025-01-31T23:59:59Z')
      };

      const result = await service.generateAdherenceAnalytics(
        mockPatientId,
        timeframe,
        'cultural'
      );

      // Should identify cultural factors
      const culturalInsights = result.insights.filter(
        insight => insight.category === 'cultural_impact'
      );

      expect(culturalInsights.length).toBeGreaterThan(0);
      if (culturalInsights.length > 0) {
        expect(culturalInsights[0]).toMatchObject({
          category: 'cultural_impact',
          culturalRelevance: expect.any(Number)
        });
        expect(culturalInsights[0].culturalRelevance).toBeGreaterThanOrEqual(0.5);
      }
    });

    it('should generate cultural observations for prayer time conflicts', async () => {
      const timeframe = {
        start: new Date('2025-01-01T00:00:00Z'),
        end: new Date('2025-01-31T23:59:59Z')
      };

      const result = await service.generateAdherenceAnalytics(
        mockPatientId,
        timeframe,
        'individual'
      );

      // Should identify prayer time conflicts
      const prayerObservations = result.culturalObservations.filter(
        obs => obs.observation.includes('prayer time')
      );

      expect(prayerObservations.length).toBeGreaterThan(0);
      if (prayerObservations.length > 0) {
        expect(prayerObservations[0]).toMatchObject({
          culturalSignificance: expect.any(Number),
          suggestion: expect.stringContaining('prayer'),
          suggestionMs: expect.stringContaining('solat')
        });
      }
    });
  });

  describe('generateAdherencePrediction', () => {
    beforeEach(() => {
      // Mock historical adherence data
      mockDb.query.mockResolvedValue(sampleAdherenceRecords.map(record => ({
        id: record.id,
        medication_id: record.medicationId,
        patient_id: record.patientId,
        scheduled_time: record.scheduledTime.toISOString(),
        taken_time: record.takenTime?.toISOString() || null,
        status: record.status,
        adherence_score: record.adherenceScore,
        notes: record.notes,
        prayer_time_conflict: record.culturalContext.prayerTimeConflict,
        fasting_period: record.culturalContext.fastingPeriod,
        festival_period: record.culturalContext.festivalPeriod || null,
        family_support: record.culturalContext.familySupport,
        traditional_medicine_used: record.culturalContext.traditionalMedicineUsed,
        reason_code: record.culturalContext.reasonCode || null,
        created_at: record.createdAt.toISOString(),
        updated_at: record.updatedAt.toISOString()
      })));
    });

    it('should generate adherence prediction with cultural factors', async () => {
      const result = await service.generateAdherencePrediction(
        mockPatientId,
        mockMedicationId,
        7
      );

      expect(result).toMatchObject({
        patientId: mockPatientId,
        medicationId: mockMedicationId,
        adherenceProbability: expect.any(Number),
        confidence: expect.any(Number),
        modelVersion: '1.0.0'
      });

      expect(result.adherenceProbability).toBeGreaterThanOrEqual(0);
      expect(result.adherenceProbability).toBeLessThanOrEqual(100);
      expect(result.confidence).toBeGreaterThanOrEqual(0.3);
      expect(result.confidence).toBeLessThanOrEqual(0.95);

      expect(result.riskFactors).toBeInstanceOf(Array);
      expect(result.culturalFactors).toBeInstanceOf(Array);
      expect(result.recommendations).toBeInstanceOf(Array);
      expect(result.predictedAt).toBeInstanceOf(Date);
    });

    it('should adjust prediction confidence based on data volume', async () => {
      // Test with limited data
      mockDb.query.mockResolvedValueOnce([sampleAdherenceRecords[0]]);

      const resultLimitedData = await service.generateAdherencePrediction(
        mockPatientId,
        mockMedicationId,
        7
      );

      // Test with more data
      const extendedRecords = Array(35).fill(null).map((_, index) => ({
        ...sampleAdherenceRecords[0],
        id: `record-${index}`,
        scheduled_time: new Date(Date.now() - index * 24 * 60 * 60 * 1000).toISOString()
      }));

      mockDb.query.mockResolvedValueOnce(extendedRecords);

      const resultMoreData = await service.generateAdherencePrediction(
        mockPatientId,
        mockMedicationId,
        7
      );

      // More data should result in higher confidence
      expect(resultMoreData.confidence).toBeGreaterThan(resultLimitedData.confidence);
    });

    it('should handle patients with no adherence history', async () => {
      mockDb.query.mockResolvedValue([]);

      const result = await service.generateAdherencePrediction(
        mockPatientId,
        mockMedicationId,
        7
      );

      expect(result.adherenceProbability).toBe(50.0); // Default probability for new patients
      expect(result.confidence).toBeGreaterThanOrEqual(0.3); // Minimum confidence
    });
  });

  describe('calculateFamilyAdherenceMetrics', () => {
    const mockFamilyId = 'family-123';

    beforeEach(() => {
      mockCache.get.mockResolvedValue(null);
      mockCache.set.mockResolvedValue(undefined);

      // Mock family members query
      mockDb.query.mockImplementation((query: string) => {
        if (query.includes('family_members')) {
          return Promise.resolve([
            { id: 'member-1', user_id: 'user-1', role: 'head', age: 45, medication_count: 2 },
            { id: 'member-2', user_id: 'user-2', role: 'spouse', age: 42, medication_count: 1 },
            { id: 'member-3', user_id: 'user-3', role: 'elderly', age: 70, medication_count: 3 }
          ]);
        }
        return Promise.resolve([]);
      });
    });

    it('should calculate family-wide adherence metrics', async () => {
      const result = await service.calculateFamilyAdherenceMetrics(mockFamilyId);

      expect(result).toMatchObject({
        familyId: mockFamilyId,
        headOfFamily: expect.any(String),
        memberMetrics: expect.any(Array),
        familyAdherenceRate: expect.any(Number),
        coordinationScore: expect.any(Number),
        culturalHarmony: expect.any(Number),
        lastUpdated: expect.any(Date)
      });

      expect(result.memberMetrics.length).toBeGreaterThan(0);
      expect(result.familyAdherenceRate).toBeGreaterThanOrEqual(0);
      expect(result.familyAdherenceRate).toBeLessThanOrEqual(100);
    });

    it('should use cached family metrics when available', async () => {
      const cachedMetrics = {
        familyId: mockFamilyId,
        headOfFamily: 'user-1',
        memberMetrics: [],
        familyAdherenceRate: 82.5,
        coordinationScore: 78.0,
        culturalHarmony: 85.0,
        lastUpdated: new Date()
      };

      mockCache.get.mockResolvedValue(JSON.stringify(cachedMetrics));

      const result = await service.calculateFamilyAdherenceMetrics(mockFamilyId);

      expect(result).toEqual(cachedMetrics);
      expect(mockDb.query).not.toHaveBeenCalled();
    });
  });

  describe('generateAdherenceStatistics', () => {
    beforeEach(() => {
      mockCache.get.mockResolvedValue(null);
      mockCache.set.mockResolvedValue(undefined);
    });

    it('should generate population-level adherence statistics', async () => {
      const filters = {
        timeframe: {
          start: new Date('2025-01-01T00:00:00Z'),
          end: new Date('2025-01-31T23:59:59Z')
        }
      };

      const result = await service.generateAdherenceStatistics(filters);

      expect(result).toMatchObject({
        population: expect.any(Object),
        individual: expect.any(Object),
        cultural: expect.any(Object),
        temporal: expect.any(Object),
        comparative: expect.any(Object)
      });
    });

    it('should handle cultural group filtering', async () => {
      const filters = {
        culturalGroup: 'malay-muslim',
        timeframe: {
          start: new Date('2025-01-01T00:00:00Z'),
          end: new Date('2025-01-31T23:59:59Z')
        }
      };

      const result = await service.generateAdherenceStatistics(filters);

      expect(result).toBeDefined();
      // Verify that cultural filtering is applied
      expect(result.cultural).toBeDefined();
    });

    it('should use cached statistics when available', async () => {
      const cachedStats = {
        population: {},
        individual: {},
        cultural: {},
        temporal: {},
        comparative: {}
      };

      mockCache.get.mockResolvedValue(JSON.stringify(cachedStats));

      const result = await service.generateAdherenceStatistics();

      expect(result).toEqual(cachedStats);
    });
  });

  describe('Error Handling', () => {
    it('should handle database connection failures gracefully', async () => {
      mockDb.query.mockRejectedValue(new Error('Connection timeout'));

      await expect(
        service.calculateProgressMetrics(mockPatientId, 'monthly')
      ).rejects.toThrow('Connection timeout');
    });

    it('should handle cache failures gracefully', async () => {
      mockCache.get.mockRejectedValue(new Error('Cache unavailable'));
      mockDb.query.mockResolvedValue(sampleAdherenceRecords);

      // Should still work when cache fails
      const result = await service.calculateProgressMetrics(mockPatientId, 'monthly');
      expect(result).toBeDefined();
    });

    it('should validate input parameters', async () => {
      await expect(
        service.calculateProgressMetrics('', 'monthly')
      ).rejects.toThrow();

      await expect(
        service.generateAdherencePrediction('', mockMedicationId, 7)
      ).rejects.toThrow();
    });
  });

  describe('Performance', () => {
    it('should complete progress calculation within reasonable time', async () => {
      mockDb.query.mockResolvedValue(sampleAdherenceRecords);

      const startTime = Date.now();
      await service.calculateProgressMetrics(mockPatientId, 'monthly');
      const endTime = Date.now();

      // Should complete within 500ms
      expect(endTime - startTime).toBeLessThan(500);
    });

    it('should handle large datasets efficiently', async () => {
      // Create large dataset
      const largeDataset = Array(1000).fill(null).map((_, index) => ({
        ...sampleAdherenceRecords[0],
        id: `record-${index}`,
        scheduled_time: new Date(Date.now() - index * 60 * 60 * 1000).toISOString()
      }));

      mockDb.query.mockResolvedValue(largeDataset);

      const startTime = Date.now();
      await service.calculateProgressMetrics(mockPatientId, 'monthly');
      const endTime = Date.now();

      // Should still complete within reasonable time for large datasets
      expect(endTime - startTime).toBeLessThan(1000);
    });
  });

  describe('Cultural Adjustments', () => {
    it('should correctly calculate Ramadan adjustments', async () => {
      const ramadanRecords = sampleAdherenceRecords.map(record => ({
        ...record,
        culturalContext: {
          ...record.culturalContext,
          fastingPeriod: true
        }
      }));

      mockDb.query.mockResolvedValue(ramadanRecords);

      const result = await service.calculateProgressMetrics(mockPatientId, 'monthly');

      expect(result.culturalAdjustments.ramadanAdjustments).toBeGreaterThan(0);
    });

    it('should correctly calculate prayer time delays', async () => {
      const prayerRecords = sampleAdherenceRecords.map(record => ({
        ...record,
        status: 'late',
        culturalContext: {
          ...record.culturalContext,
          prayerTimeConflict: true
        }
      }));

      mockDb.query.mockResolvedValue(prayerRecords);

      const result = await service.calculateProgressMetrics(mockPatientId, 'monthly');

      expect(result.culturalAdjustments.prayerTimeDelays).toBeGreaterThan(0);
    });

    it('should correctly calculate family coordination impact', async () => {
      const familyRecords = sampleAdherenceRecords.map(record => ({
        ...record,
        culturalContext: {
          ...record.culturalContext,
          familySupport: true
        }
      }));

      mockDb.query.mockResolvedValue(familyRecords);

      const result = await service.calculateProgressMetrics(mockPatientId, 'monthly');

      expect(result.culturalAdjustments.familyCoordinationImpact).toBeGreaterThan(0);
    });
  });
});