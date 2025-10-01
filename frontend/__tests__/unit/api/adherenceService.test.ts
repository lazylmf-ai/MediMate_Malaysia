/**
 * Unit Tests: AdherenceService
 *
 * Comprehensive tests for adherence tracking API service
 */

import { AdherenceService } from '../../../src/api/services/adherenceService';
import { MockApiClient } from '../../utils/mockServices';
import { TestDataGenerator } from '../../utils/testHelpers';

describe('AdherenceService', () => {
  let adherenceService: AdherenceService;
  let mockApiClient: MockApiClient;
  let patientId: string;

  beforeEach(() => {
    mockApiClient = new MockApiClient();
    adherenceService = new AdherenceService();
    // Inject mock client
    (adherenceService as any).apiClient = mockApiClient;
    patientId = TestDataGenerator.randomId();
  });

  afterEach(() => {
    mockApiClient.reset();
  });

  describe('recordAdherence', () => {
    it('should record medication adherence successfully', async () => {
      const medicationId = TestDataGenerator.randomId();
      const adherenceData = {
        medicationId,
        scheduledTime: new Date('2025-09-30T10:00:00Z'),
        takenTime: new Date('2025-09-30T10:05:00Z'),
        status: 'taken',
        method: 'manual',
      };

      const mockResponse = TestDataGenerator.adherenceRecord({
        ...adherenceData,
        patientId,
      });

      mockApiClient.mockResponseWithMatcher(
        (endpoint) => endpoint.includes('/adherence/record'),
        mockResponse
      );

      const result = await adherenceService.recordAdherence(patientId, adherenceData);

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject({
        patientId,
        medicationId,
        status: 'taken',
      });
      expect(mockApiClient.getCallCount()).toBe(1);
    });

    it('should include cultural context when provided', async () => {
      const adherenceData = {
        medicationId: TestDataGenerator.randomId(),
        scheduledTime: new Date(),
        status: 'taken',
        culturalContext: {
          prayerTimeConflict: false,
          festivalPeriod: false,
        },
      };

      mockApiClient.mockResponseWithMatcher(
        (endpoint) => endpoint.includes('/adherence/record'),
        TestDataGenerator.adherenceRecord()
      );

      await adherenceService.recordAdherence(patientId, adherenceData);

      const callHistory = mockApiClient.getCallHistory();
      expect(callHistory[0].options.body).toContain('culturalContext');
    });

    it('should handle API errors gracefully', async () => {
      const adherenceData = {
        medicationId: TestDataGenerator.randomId(),
        scheduledTime: new Date(),
        status: 'taken',
      };

      mockApiClient.mockResponseWithMatcher(
        (endpoint) => endpoint.includes('/adherence/record'),
        new Error('Network error')
      );

      const result = await adherenceService.recordAdherence(patientId, adherenceData);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error?.message).toBe('Network error');
    });
  });

  describe('getProgressMetrics', () => {
    it('should fetch progress metrics with default options', async () => {
      const mockMetrics = {
        overallAdherence: 0.85,
        medicationMetrics: [],
        streaks: { current: 7, longest: 14 },
        trends: [],
      };

      mockApiClient.mockResponseWithMatcher(
        (endpoint) => endpoint.includes('/adherence/progress'),
        mockMetrics
      );

      const result = await adherenceService.getProgressMetrics(patientId);

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject(mockMetrics);
      expect(mockApiClient.getCallCount()).toBe(1);
    });

    it('should respect custom period parameter', async () => {
      mockApiClient.mockResponseWithMatcher(
        (endpoint) => endpoint.includes('/adherence/progress'),
        { overallAdherence: 0.9 }
      );

      await adherenceService.getProgressMetrics(patientId, 'weekly');

      const callHistory = mockApiClient.getCallHistory();
      expect(callHistory[0].endpoint).toContain('period=weekly');
    });

    it('should include cultural analysis when requested', async () => {
      mockApiClient.mockResponseWithMatcher(
        (endpoint) => endpoint.includes('/adherence/progress'),
        { overallAdherence: 0.85, culturalInsights: [] }
      );

      await adherenceService.getProgressMetrics(patientId, 'monthly', {
        includeCultural: true,
      });

      const callHistory = mockApiClient.getCallHistory();
      expect(callHistory[0].endpoint).toContain('includeCultural=true');
    });

    it('should cache results appropriately', async () => {
      mockApiClient.mockResponseWithMatcher(
        (endpoint) => endpoint.includes('/adherence/progress'),
        { overallAdherence: 0.85 }
      );

      await adherenceService.getProgressMetrics(patientId);

      const callHistory = mockApiClient.getCallHistory();
      expect(callHistory[0].options.cacheKey).toContain('adherence_progress');
      expect(callHistory[0].options.cacheTTL).toBe(300000); // 5 minutes
    });
  });

  describe('getAdherenceAnalytics', () => {
    it('should fetch comprehensive analytics', async () => {
      const startDate = new Date('2025-09-01');
      const endDate = new Date('2025-09-30');

      const mockAnalytics = {
        metrics: { overallAdherence: 0.85 },
        patterns: [],
        predictions: [],
        insights: [],
      };

      mockApiClient.mockResponseWithMatcher(
        (endpoint) => endpoint.includes('/adherence/analytics'),
        mockAnalytics
      );

      const result = await adherenceService.getAdherenceAnalytics({
        patientId,
        startDate,
        endDate,
        includePatterns: true,
        includePredictions: true,
      });

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject(mockAnalytics);
    });

    it('should filter by medication IDs when provided', async () => {
      const medicationIds = [TestDataGenerator.randomId(), TestDataGenerator.randomId()];

      mockApiClient.mockResponseWithMatcher(
        (endpoint) => endpoint.includes('/adherence/analytics'),
        { metrics: {}, patterns: [], predictions: [], insights: [] }
      );

      await adherenceService.getAdherenceAnalytics({
        patientId,
        medicationIds,
      });

      const callHistory = mockApiClient.getCallHistory();
      expect(callHistory[0].endpoint).toContain('medicationIds=');
    });

    it('should handle date range queries', async () => {
      const startDate = new Date('2025-09-01T00:00:00Z');
      const endDate = new Date('2025-09-30T23:59:59Z');

      mockApiClient.mockResponseWithMatcher(
        (endpoint) => endpoint.includes('/adherence/analytics'),
        { metrics: {}, patterns: [], predictions: [], insights: [] }
      );

      await adherenceService.getAdherenceAnalytics({
        patientId,
        startDate,
        endDate,
      });

      const callHistory = mockApiClient.getCallHistory();
      expect(callHistory[0].endpoint).toContain('startDate=');
      expect(callHistory[0].endpoint).toContain('endDate=');
    });
  });

  describe('calculateStreaks', () => {
    it('should calculate and return streak data', async () => {
      const mockStreakData = {
        current: 7,
        longest: 14,
        history: [],
      };

      mockApiClient.mockResponseWithMatcher(
        (endpoint) => endpoint.includes('/adherence/streaks'),
        mockStreakData
      );

      const result = await adherenceService.calculateStreaks(patientId);

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject(mockStreakData);
      expect(result.data?.current).toBe(7);
      expect(result.data?.longest).toBe(14);
    });

    it('should use POST method for streak calculation', async () => {
      mockApiClient.mockResponseWithMatcher(
        (endpoint) => endpoint.includes('/adherence/streaks'),
        { current: 5, longest: 10, history: [] }
      );

      await adherenceService.calculateStreaks(patientId);

      const callHistory = mockApiClient.getCallHistory();
      expect(callHistory[0].options.method).toBe('POST');
    });
  });

  describe('checkMilestones', () => {
    it('should check for new milestones', async () => {
      const mockMilestoneResponse = {
        newMilestones: [
          {
            id: TestDataGenerator.randomId(),
            type: '7_day_streak',
            achievedAt: new Date().toISOString(),
          },
        ],
        updatedMilestones: [],
        totalMilestones: 1,
      };

      mockApiClient.mockResponseWithMatcher(
        (endpoint) => endpoint.includes('/adherence/milestones'),
        mockMilestoneResponse
      );

      const result = await adherenceService.checkMilestones({ patientId });

      expect(result.success).toBe(true);
      expect(result.data?.newMilestones).toHaveLength(1);
      expect(result.data?.totalMilestones).toBe(1);
    });

    it('should filter by medication ID when provided', async () => {
      const medicationId = TestDataGenerator.randomId();

      mockApiClient.mockResponseWithMatcher(
        (endpoint) => endpoint.includes('/adherence/milestones'),
        { newMilestones: [], updatedMilestones: [], totalMilestones: 0 }
      );

      await adherenceService.checkMilestones({ patientId, medicationId });

      const callHistory = mockApiClient.getCallHistory();
      expect(callHistory[0].endpoint).toContain(`medicationId=${medicationId}`);
    });

    it('should support milestone type filtering', async () => {
      mockApiClient.mockResponseWithMatcher(
        (endpoint) => endpoint.includes('/adherence/milestones'),
        { newMilestones: [], updatedMilestones: [], totalMilestones: 0 }
      );

      await adherenceService.checkMilestones({
        patientId,
        checkTypes: ['streak', 'consistency'],
      });

      const callHistory = mockApiClient.getCallHistory();
      expect(callHistory[0].endpoint).toContain('checkTypes=');
    });
  });

  describe('generateReport', () => {
    it('should generate adherence report', async () => {
      const periodStart = new Date('2025-09-01');
      const periodEnd = new Date('2025-09-30');

      const mockReport = {
        id: TestDataGenerator.randomId(),
        patientId,
        periodStart: periodStart.toISOString(),
        periodEnd: periodEnd.toISOString(),
        summary: { overallAdherence: 0.85 },
        recommendations: ['Maintain consistency'],
      };

      mockApiClient.mockResponseWithMatcher(
        (endpoint) => endpoint.includes('/adherence/reports'),
        mockReport
      );

      const result = await adherenceService.generateReport(
        patientId,
        periodStart,
        periodEnd,
        true
      );

      expect(result.success).toBe(true);
      expect(result.data).toMatchObject(mockReport);
    });

    it('should include recommendations when requested', async () => {
      const periodStart = new Date('2025-09-01');
      const periodEnd = new Date('2025-09-30');

      mockApiClient.mockResponseWithMatcher(
        (endpoint) => endpoint.includes('/adherence/reports'),
        { id: TestDataGenerator.randomId() }
      );

      await adherenceService.generateReport(patientId, periodStart, periodEnd, true);

      const callHistory = mockApiClient.getCallHistory();
      const body = JSON.parse(callHistory[0].options.body);
      expect(body.includeRecommendations).toBe(true);
      expect(body.includeCulturalContext).toBe(true);
    });
  });

  describe('batchUpdateRecords', () => {
    it('should batch update multiple adherence records', async () => {
      const updates = {
        records: [
          TestDataGenerator.adherenceRecord(),
          TestDataGenerator.adherenceRecord(),
          TestDataGenerator.adherenceRecord(),
        ],
      };

      const mockResponse = {
        updated: 2,
        created: 1,
        errors: [],
      };

      mockApiClient.mockResponseWithMatcher(
        (endpoint) => endpoint.includes('/adherence/batch'),
        mockResponse
      );

      const result = await adherenceService.batchUpdateRecords(patientId, updates);

      expect(result.success).toBe(true);
      expect(result.data?.updated).toBe(2);
      expect(result.data?.created).toBe(1);
      expect(result.data?.errors).toHaveLength(0);
    });

    it('should report errors for invalid records', async () => {
      const updates = {
        records: [TestDataGenerator.adherenceRecord()],
      };

      const mockResponse = {
        updated: 0,
        created: 0,
        errors: [{ recordId: 'invalid', error: 'Validation failed' }],
      };

      mockApiClient.mockResponseWithMatcher(
        (endpoint) => endpoint.includes('/adherence/batch'),
        mockResponse
      );

      const result = await adherenceService.batchUpdateRecords(patientId, updates);

      expect(result.success).toBe(true);
      expect(result.data?.errors).toHaveLength(1);
    });
  });

  describe('getCulturalInsights', () => {
    it('should fetch cultural insights for adherence', async () => {
      const mockInsights = {
        insights: [
          {
            type: 'prayer_time_adaptation',
            description: 'Successfully adapted to prayer times',
            impact: 'positive',
          },
        ],
        recommendations: ['Continue current schedule'],
        culturalScore: 0.92,
      };

      mockApiClient.mockResponseWithMatcher(
        (endpoint) => endpoint.includes('/adherence/cultural-insights'),
        mockInsights
      );

      const result = await adherenceService.getCulturalInsights(patientId, 'monthly');

      expect(result.success).toBe(true);
      expect(result.data?.insights).toHaveLength(1);
      expect(result.data?.culturalScore).toBe(0.92);
    });

    it('should cache cultural insights for 1 hour', async () => {
      mockApiClient.mockResponseWithMatcher(
        (endpoint) => endpoint.includes('/adherence/cultural-insights'),
        { insights: [], recommendations: [], culturalScore: 0.9 }
      );

      await adherenceService.getCulturalInsights(patientId);

      const callHistory = mockApiClient.getCallHistory();
      expect(callHistory[0].options.cacheTTL).toBe(3600000); // 1 hour
    });
  });

  describe('getAdherencePredictions', () => {
    it('should fetch adherence predictions', async () => {
      const mockPredictions = [
        {
          date: new Date('2025-10-01').toISOString(),
          predictedAdherence: 0.88,
          confidence: 0.85,
          factors: ['consistent_history', 'no_cultural_conflicts'],
        },
      ];

      mockApiClient.mockResponseWithMatcher(
        (endpoint) => endpoint.includes('/adherence/predictions'),
        mockPredictions
      );

      const result = await adherenceService.getAdherencePredictions(patientId);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0].predictedAdherence).toBe(0.88);
    });

    it('should filter predictions by medication', async () => {
      const medicationId = TestDataGenerator.randomId();

      mockApiClient.mockResponseWithMatcher(
        (endpoint) => endpoint.includes('/adherence/predictions'),
        []
      );

      await adherenceService.getAdherencePredictions(patientId, medicationId);

      const callHistory = mockApiClient.getCallHistory();
      expect(callHistory[0].endpoint).toContain(`medicationId=${medicationId}`);
    });

    it('should support different prediction timeframes', async () => {
      mockApiClient.mockResponseWithMatcher(
        (endpoint) => endpoint.includes('/adherence/predictions'),
        []
      );

      await adherenceService.getAdherencePredictions(
        patientId,
        undefined,
        'next_month'
      );

      const callHistory = mockApiClient.getCallHistory();
      expect(callHistory[0].endpoint).toContain('timeframe=next_month');
    });
  });

  describe('getFamilyMetrics', () => {
    it('should fetch family-level adherence metrics', async () => {
      const familyId = TestDataGenerator.randomId();

      const mockFamilyMetrics = {
        overallAdherence: 0.87,
        memberMetrics: [
          {
            patientId: TestDataGenerator.randomId(),
            name: 'Family Member 1',
            adherenceRate: 0.9,
            currentStreak: 10,
            riskLevel: 'low',
          },
          {
            patientId: TestDataGenerator.randomId(),
            name: 'Family Member 2',
            adherenceRate: 0.84,
            currentStreak: 5,
            riskLevel: 'medium',
          },
        ],
        familyPatterns: [],
        supportOpportunities: ['Member 2 may need additional support'],
      };

      mockApiClient.mockResponseWithMatcher(
        (endpoint) => endpoint.includes('/adherence/family'),
        mockFamilyMetrics
      );

      const result = await adherenceService.getFamilyMetrics(familyId);

      expect(result.success).toBe(true);
      expect(result.data?.overallAdherence).toBe(0.87);
      expect(result.data?.memberMetrics).toHaveLength(2);
      expect(result.data?.supportOpportunities).toHaveLength(1);
    });
  });

  describe('syncOfflineData', () => {
    it('should sync offline adherence records', async () => {
      const offlineRecords = [
        TestDataGenerator.adherenceRecord({ id: undefined }),
        TestDataGenerator.adherenceRecord({ id: undefined }),
      ];

      const mockSyncResponse = {
        synced: 2,
        conflicts: [],
        errors: [],
      };

      mockApiClient.mockResponseWithMatcher(
        (endpoint) => endpoint.includes('/adherence/sync'),
        mockSyncResponse
      );

      const result = await adherenceService.syncOfflineData(patientId, offlineRecords);

      expect(result.success).toBe(true);
      expect(result.data?.synced).toBe(2);
      expect(result.data?.conflicts).toHaveLength(0);
      expect(result.data?.errors).toHaveLength(0);
    });

    it('should handle sync conflicts', async () => {
      const offlineRecords = [TestDataGenerator.adherenceRecord()];

      const mockSyncResponse = {
        synced: 0,
        conflicts: [
          {
            recordId: offlineRecords[0].id,
            reason: 'Server has newer version',
            serverVersion: {},
          },
        ],
        errors: [],
      };

      mockApiClient.mockResponseWithMatcher(
        (endpoint) => endpoint.includes('/adherence/sync'),
        mockSyncResponse
      );

      const result = await adherenceService.syncOfflineData(patientId, offlineRecords);

      expect(result.success).toBe(true);
      expect(result.data?.conflicts).toHaveLength(1);
    });

    it('should include sync metadata in request', async () => {
      const offlineRecords = [TestDataGenerator.adherenceRecord()];

      mockApiClient.mockResponseWithMatcher(
        (endpoint) => endpoint.includes('/adherence/sync'),
        { synced: 1, conflicts: [], errors: [] }
      );

      await adherenceService.syncOfflineData(patientId, offlineRecords);

      const callHistory = mockApiClient.getCallHistory();
      const body = JSON.parse(callHistory[0].options.body);
      expect(body.syncTimestamp).toBeDefined();
      expect(body.source).toBe('mobile_app');
      expect(body.records).toHaveLength(1);
    });
  });

  describe('getRealtimeStatus', () => {
    it('should fetch real-time adherence status', async () => {
      const mockStatus = {
        currentStatus: 'on_track',
        upcomingDoses: [
          {
            medicationId: TestDataGenerator.randomId(),
            medicationName: 'Medication A',
            scheduledTime: new Date('2025-09-30T14:00:00Z'),
            timeUntilDue: 3600000, // 1 hour
            priority: 'high',
          },
        ],
        todaysProgress: {
          completed: 2,
          total: 3,
          adherenceRate: 0.67,
        },
        alerts: [],
      };

      mockApiClient.mockResponseWithMatcher(
        (endpoint) => endpoint.includes('/adherence/realtime'),
        mockStatus
      );

      const result = await adherenceService.getRealtimeStatus(patientId);

      expect(result.success).toBe(true);
      expect(result.data?.currentStatus).toBe('on_track');
      expect(result.data?.upcomingDoses).toHaveLength(1);
      expect(result.data?.todaysProgress.completed).toBe(2);
    });

    it('should cache realtime status for 1 minute', async () => {
      mockApiClient.mockResponseWithMatcher(
        (endpoint) => endpoint.includes('/adherence/realtime'),
        { currentStatus: 'on_track', upcomingDoses: [], todaysProgress: {}, alerts: [] }
      );

      await adherenceService.getRealtimeStatus(patientId);

      const callHistory = mockApiClient.getCallHistory();
      expect(callHistory[0].options.cacheTTL).toBe(60000); // 1 minute
    });

    it('should include alerts when present', async () => {
      const mockStatus = {
        currentStatus: 'at_risk',
        upcomingDoses: [],
        todaysProgress: { completed: 0, total: 3, adherenceRate: 0 },
        alerts: [
          {
            type: 'missed_dose',
            message: 'Missed morning medication',
            severity: 'high',
            actionRequired: true,
          },
        ],
      };

      mockApiClient.mockResponseWithMatcher(
        (endpoint) => endpoint.includes('/adherence/realtime'),
        mockStatus
      );

      const result = await adherenceService.getRealtimeStatus(patientId);

      expect(result.success).toBe(true);
      expect(result.data?.alerts).toHaveLength(1);
      expect(result.data?.alerts?.[0].severity).toBe('high');
    });
  });
});