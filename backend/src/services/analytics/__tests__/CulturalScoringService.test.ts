/**
 * CulturalScoringService Test Suite
 *
 * Comprehensive tests for Malaysian cultural intelligence in medication adherence scoring.
 * Tests Islamic practices, family dynamics, festivals, and traditional medicine integration.
 */

import { CulturalScoringService, CulturalScoringContext, CulturalScore } from '../CulturalScoringService';
import { CulturalCalendarService } from '../../cultural/culturalCalendarService';
import { PrayerTimeService } from '../../cultural/prayerTimeService';
import {
  AdherenceRecord,
  AdherenceStatus,
  CulturalAdjustmentMetrics,
  AdherenceImpact
} from '../../../types/adherence/adherence.types';

// Mock cultural services
jest.mock('../../cultural/culturalCalendarService');
jest.mock('../../cultural/prayerTimeService');

describe('CulturalScoringService', () => {
  let service: CulturalScoringService;
  let mockCulturalCalendar: jest.Mocked<CulturalCalendarService>;
  let mockPrayerTimeService: jest.Mocked<PrayerTimeService>;

  // Sample cultural context for Malaysian Muslim patient
  const sampleContext: CulturalScoringContext = {
    patientId: 'patient-123',
    location: {
      state: 'Selangor',
      city: 'Kuala Lumpur',
      timezone: 'Asia/Kuala_Lumpur'
    },
    religiousProfile: {
      religion: 'islam',
      observanceLevel: 'moderate',
      prayerTimePreferences: ['fajr', 'maghrib'],
      fastingPeriods: ['ramadan']
    },
    familyStructure: {
      size: 4,
      elderlyPresent: true,
      childrenPresent: true,
      caregiverRole: 'shared'
    },
    traditionalMedicineUse: false,
    preferredLanguage: 'ms'
  };

  // Sample adherence records with cultural context
  const sampleAdherenceRecords: AdherenceRecord[] = [
    {
      id: 'record-1',
      medicationId: 'med-1',
      patientId: 'patient-123',
      scheduledTime: new Date('2025-01-15T08:00:00Z'),
      takenTime: new Date('2025-01-15T08:05:00Z'),
      status: 'taken' as AdherenceStatus,
      adherenceScore: 10,
      notes: 'Taken with family breakfast',
      culturalContext: {
        prayerTimeConflict: false,
        fastingPeriod: true, // During Ramadan
        familySupport: true,
        traditionalMedicineUsed: false,
        reasonCode: undefined
      },
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'record-2',
      medicationId: 'med-1',
      patientId: 'patient-123',
      scheduledTime: new Date('2025-01-15T18:30:00Z'),
      takenTime: new Date('2025-01-15T19:00:00Z'),
      status: 'late' as AdherenceStatus,
      adherenceScore: 8,
      notes: 'Delayed due to Maghrib prayer',
      culturalContext: {
        prayerTimeConflict: true,
        fastingPeriod: true,
        familySupport: false,
        traditionalMedicineUsed: false,
        reasonCode: 'prayer_time_delay'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'record-3',
      medicationId: 'med-1',
      patientId: 'patient-123',
      scheduledTime: new Date('2025-01-16T10:00:00Z'),
      status: 'skipped' as AdherenceStatus,
      adherenceScore: 0,
      notes: 'Skipped during Hari Raya celebration',
      culturalContext: {
        prayerTimeConflict: false,
        fastingPeriod: false,
        festivalPeriod: 'hari_raya_aidilfitri',
        familySupport: true,
        traditionalMedicineUsed: false,
        reasonCode: 'festival_celebration'
      },
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      id: 'record-4',
      medicationId: 'med-1',
      patientId: 'patient-123',
      scheduledTime: new Date('2025-01-17T08:00:00Z'),
      takenTime: new Date('2025-01-17T08:00:00Z'),
      status: 'taken' as AdherenceStatus,
      adherenceScore: 10,
      notes: 'Taken with traditional herbal tea',
      culturalContext: {
        prayerTimeConflict: false,
        fastingPeriod: false,
        familySupport: true,
        traditionalMedicineUsed: true,
        reasonCode: undefined
      },
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mocks
    mockCulturalCalendar = {
      getCulturalEvents: jest.fn(),
      isRamadan: jest.fn(),
      getRamadanInfo: jest.fn(),
      initialize: jest.fn()
    } as any;

    mockPrayerTimeService = {
      getPrayerTimes: jest.fn(),
      getNextPrayerTime: jest.fn(),
      isPrayerTime: jest.fn()
    } as any;

    // Create service instance
    service = new CulturalScoringService();
    (service as any).culturalCalendar = mockCulturalCalendar;
    (service as any).prayerTimeService = mockPrayerTimeService;
  });

  describe('calculateCulturalScore', () => {
    const timeframe = {
      start: new Date('2025-01-01T00:00:00Z'),
      end: new Date('2025-01-31T23:59:59Z')
    };

    beforeEach(() => {
      // Mock Ramadan status
      mockCulturalCalendar.isRamadan.mockResolvedValue({
        is_ramadan: true,
        ramadan_day: 15,
        days_remaining: 15,
        ramadan_info: {
          year: 2025,
          start_date: new Date('2025-01-01T00:00:00Z'),
          end_date: new Date('2025-01-30T23:59:59Z'),
          duration_days: 30,
          fasting_hours: { average: 13.5, longest: 14, shortest: 13 },
          special_dates: { eid_al_fitr: new Date('2025-01-31T00:00:00Z') },
          healthcare_considerations: {
            medication_adjustments_needed: true,
            appointment_preferences: ['early_morning', 'evening'],
            emergency_exceptions: ['life_threatening']
          }
        }
      });

      // Mock cultural events
      mockCulturalCalendar.getCulturalEvents.mockResolvedValue([
        {
          id: 'hari-raya-2025',
          name: 'Hari Raya Aidilfitri',
          name_ms: 'Hari Raya Aidilfitri',
          type: 'islamic',
          date: new Date('2025-01-31T00:00:00Z'),
          duration_days: 2,
          description: 'Islamic celebration',
          healthcare_impact: {
            affects_scheduling: true,
            emergency_services_available: true,
            routine_appointments: 'unavailable',
            special_considerations: ['Family gatherings', 'Cultural celebrations']
          },
          cultural_significance: ['Islamic celebration', 'Family unity'],
          regions_affected: ['ALL'],
          observance_level: 'national'
        }
      ]);
    });

    it('should calculate comprehensive cultural score for Muslim patient', async () => {
      const result = await service.calculateCulturalScore(
        sampleAdherenceRecords,
        sampleContext,
        timeframe
      );

      expect(result).toMatchObject({
        overallScore: expect.any(Number),
        componentScores: {
          religiousAlignment: expect.any(Number),
          festivalAccommodation: expect.any(Number),
          familyIntegration: expect.any(Number),
          traditionalHarmony: expect.any(Number),
          culturalSensitivity: expect.any(Number)
        },
        bonusPoints: expect.any(Number),
        penaltyPoints: expect.any(Number),
        recommendations: expect.any(Array)
      });

      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
    });

    it('should award high religious alignment score for proper prayer accommodations', async () => {
      const prayerAccommodationRecords = sampleAdherenceRecords.map(record => ({
        ...record,
        status: 'late' as AdherenceStatus,
        culturalContext: {
          ...record.culturalContext,
          prayerTimeConflict: true,
          reasonCode: 'prayer_time_delay' as any
        }
      }));

      const result = await service.calculateCulturalScore(
        prayerAccommodationRecords,
        sampleContext,
        timeframe
      );

      expect(result.componentScores.religiousAlignment).toBeGreaterThan(70);
    });

    it('should handle non-religious patients appropriately', async () => {
      const secularContext: CulturalScoringContext = {
        ...sampleContext,
        religiousProfile: {
          religion: 'none',
          observanceLevel: 'flexible',
          prayerTimePreferences: [],
          fastingPeriods: []
        }
      };

      const result = await service.calculateCulturalScore(
        sampleAdherenceRecords,
        secularContext,
        timeframe
      );

      expect(result.componentScores.religiousAlignment).toBe(85); // Neutral base score
    });

    it('should award festival accommodation points for appropriate skipping', async () => {
      const festivalRecords = sampleAdherenceRecords.filter(r =>
        r.culturalContext.festivalPeriod
      );

      expect(festivalRecords.length).toBeGreaterThan(0);

      const result = await service.calculateCulturalScore(
        festivalRecords,
        sampleContext,
        timeframe
      );

      expect(result.componentScores.festivalAccommodation).toBeGreaterThan(80);
    });

    it('should score family integration based on family support patterns', async () => {
      const familySupportRecords = sampleAdherenceRecords.map(record => ({
        ...record,
        culturalContext: {
          ...record.culturalContext,
          familySupport: true
        }
      }));

      const result = await service.calculateCulturalScore(
        familySupportRecords,
        sampleContext,
        timeframe
      );

      expect(result.componentScores.familyIntegration).toBeGreaterThan(70);
    });

    it('should handle traditional medicine integration appropriately', async () => {
      const traditionalMedicineContext: CulturalScoringContext = {
        ...sampleContext,
        traditionalMedicineUse: true
      };

      const traditionalRecords = sampleAdherenceRecords.map(record => ({
        ...record,
        culturalContext: {
          ...record.culturalContext,
          traditionalMedicineUsed: true
        },
        notes: 'Taken with traditional medicine coordination'
      }));

      const result = await service.calculateCulturalScore(
        traditionalRecords,
        traditionalMedicineContext,
        timeframe
      );

      expect(result.componentScores.traditionalHarmony).toBeGreaterThan(70);
    });

    it('should apply Ramadan bonus during fasting period', async () => {
      const ramadanRecords = sampleAdherenceRecords.map(record => ({
        ...record,
        status: 'taken' as AdherenceStatus,
        culturalContext: {
          ...record.culturalContext,
          fastingPeriod: true
        }
      }));

      const result = await service.calculateCulturalScore(
        ramadanRecords,
        sampleContext,
        timeframe
      );

      expect(result.bonusPoints).toBeGreaterThan(0);
    });

    it('should apply penalties for ignoring cultural factors', async () => {
      const culturallyInsensitiveRecords = sampleAdherenceRecords.map(record => ({
        ...record,
        status: 'missed' as AdherenceStatus,
        culturalContext: {
          ...record.culturalContext,
          prayerTimeConflict: true,
          fastingPeriod: true
        }
      }));

      const result = await service.calculateCulturalScore(
        culturallyInsensitiveRecords,
        sampleContext,
        timeframe
      );

      expect(result.penaltyPoints).toBeGreaterThan(0);
    });

    it('should generate appropriate cultural recommendations', async () => {
      const problematicRecords = [
        {
          ...sampleAdherenceRecords[0],
          status: 'missed' as AdherenceStatus,
          culturalContext: {
            prayerTimeConflict: true,
            fastingPeriod: false,
            familySupport: false,
            traditionalMedicineUsed: false,
            reasonCode: undefined
          }
        }
      ];

      const result = await service.calculateCulturalScore(
        problematicRecords,
        sampleContext,
        timeframe
      );

      expect(result.recommendations.length).toBeGreaterThan(0);

      const religiousRecommendations = result.recommendations.filter(
        r => r.category === 'religious'
      );
      expect(religiousRecommendations.length).toBeGreaterThan(0);

      if (religiousRecommendations.length > 0) {
        expect(religiousRecommendations[0]).toMatchObject({
          priority: expect.stringMatching(/^(low|medium|high|urgent)$/),
          message: expect.any(String),
          messageMs: expect.any(String),
          actionRequired: expect.any(Boolean),
          culturalContext: expect.any(String),
          implementationComplexity: expect.stringMatching(/^(simple|moderate|complex)$/)
        });
      }
    });
  });

  describe('analyzeFestivalImpact', () => {
    const timeframe = {
      start: new Date('2025-01-01T00:00:00Z'),
      end: new Date('2025-01-31T23:59:59Z')
    };

    beforeEach(() => {
      mockCulturalCalendar.getCulturalEvents.mockResolvedValue([
        {
          id: 'hari-raya-2025',
          name: 'Hari Raya Aidilfitri',
          name_ms: 'Hari Raya Aidilfitri',
          type: 'islamic',
          date: new Date('2025-01-31T00:00:00Z'),
          duration_days: 2,
          description: 'Islamic celebration',
          healthcare_impact: {
            affects_scheduling: true,
            emergency_services_available: true,
            routine_appointments: 'unavailable',
            special_considerations: ['Family gatherings']
          },
          cultural_significance: ['Islamic celebration'],
          regions_affected: ['ALL'],
          observance_level: 'national'
        },
        {
          id: 'cny-2025',
          name: 'Chinese New Year',
          name_ms: 'Tahun Baru Cina',
          type: 'cultural',
          date: new Date('2025-01-15T00:00:00Z'),
          duration_days: 2,
          description: 'Chinese cultural celebration',
          healthcare_impact: {
            affects_scheduling: true,
            emergency_services_available: true,
            routine_appointments: 'reduced',
            special_considerations: ['Family reunions']
          },
          cultural_significance: ['Chinese tradition'],
          regions_affected: ['ALL'],
          observance_level: 'national'
        }
      ]);
    });

    it('should analyze impact of culturally relevant festivals', async () => {
      const result = await service.analyzeFestivalImpact(
        'patient-123',
        sampleContext,
        timeframe
      );

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBeGreaterThan(0);

      const hariRayaAnalysis = result.find(analysis =>
        analysis.festival.includes('Hari Raya')
      );

      expect(hariRayaAnalysis).toBeDefined();
      if (hariRayaAnalysis) {
        expect(hariRayaAnalysis).toMatchObject({
          festival: expect.stringContaining('Hari Raya'),
          period: {
            start: expect.any(Date),
            end: expect.any(Date)
          },
          expectedImpact: expect.stringMatching(/^(positive|negative|neutral)$/),
          impactScore: expect.any(Number),
          accommodations: expect.any(Array),
          familyCoordinationRequired: expect.any(Boolean)
        });

        expect(hariRayaAnalysis.impactScore).toBeGreaterThanOrEqual(-10);
        expect(hariRayaAnalysis.impactScore).toBeLessThanOrEqual(10);
      }
    });

    it('should filter festivals by cultural relevance', async () => {
      const chineseContext: CulturalScoringContext = {
        ...sampleContext,
        religiousProfile: {
          religion: 'other',
          observanceLevel: 'moderate',
          prayerTimePreferences: [],
          fastingPeriods: []
        },
        preferredLanguage: 'zh'
      };

      const result = await service.analyzeFestivalImpact(
        'patient-123',
        chineseContext,
        timeframe
      );

      const cnyAnalysis = result.find(analysis =>
        analysis.festival.includes('Chinese New Year')
      );

      expect(cnyAnalysis).toBeDefined();
    });

    it('should generate appropriate accommodations for festivals', async () => {
      const result = await service.analyzeFestivalImpact(
        'patient-123',
        sampleContext,
        timeframe
      );

      const festivalWithAccommodations = result.find(analysis =>
        analysis.accommodations.length > 0
      );

      expect(festivalWithAccommodations).toBeDefined();
      if (festivalWithAccommodations) {
        expect(festivalWithAccommodations.accommodations).toContain(
          expect.stringMatching(/^(schedule_flexibility|family_coordination|religious_observance)$/)
        );
      }
    });
  });

  describe('analyzePrayerTimeAlignment', () => {
    it('should analyze prayer time conflicts for Muslim patients', async () => {
      const result = await service.analyzePrayerTimeAlignment(
        sampleAdherenceRecords,
        sampleContext
      );

      expect(result).toMatchObject({
        conflicts: expect.any(Number),
        accommodations: expect.any(Number),
        alignmentScore: expect.any(Number),
        optimalTimes: expect.any(Array),
        problematicTimes: expect.any(Array),
        recommendations: expect.any(Array)
      });

      expect(result.alignmentScore).toBeGreaterThanOrEqual(0);
      expect(result.alignmentScore).toBeLessThanOrEqual(100);
    });

    it('should return high alignment score for non-Muslim patients', async () => {
      const nonMuslimContext: CulturalScoringContext = {
        ...sampleContext,
        religiousProfile: {
          religion: 'christianity',
          observanceLevel: 'moderate',
          prayerTimePreferences: [],
          fastingPeriods: []
        }
      };

      const result = await service.analyzePrayerTimeAlignment(
        sampleAdherenceRecords,
        nonMuslimContext
      );

      expect(result.alignmentScore).toBe(100);
      expect(result.conflicts).toBe(0);
      expect(result.accommodations).toBe(0);
    });

    it('should identify problematic medication times', async () => {
      const prayerConflictRecords = sampleAdherenceRecords.filter(r =>
        r.culturalContext.prayerTimeConflict
      );

      const result = await service.analyzePrayerTimeAlignment(
        prayerConflictRecords,
        sampleContext
      );

      expect(result.conflicts).toBeGreaterThan(0);
      expect(result.problematicTimes.length).toBeGreaterThan(0);
    });

    it('should recognize prayer time accommodations', async () => {
      const accommodatedRecords = sampleAdherenceRecords.map(record => ({
        ...record,
        status: 'late' as AdherenceStatus,
        culturalContext: {
          ...record.culturalContext,
          prayerTimeConflict: true
        },
        takenTime: new Date(record.scheduledTime.getTime() + 20 * 60 * 1000) // 20 minutes late
      }));

      const result = await service.analyzePrayerTimeAlignment(
        accommodatedRecords,
        sampleContext
      );

      expect(result.accommodations).toBeGreaterThan(0);
    });

    it('should provide prayer time recommendations', async () => {
      const problematicRecords = sampleAdherenceRecords.filter(r =>
        r.culturalContext.prayerTimeConflict
      );

      const result = await service.analyzePrayerTimeAlignment(
        problematicRecords,
        sampleContext
      );

      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations[0]).toContain('prayer');
    });
  });

  describe('calculateCulturalAdjustmentImpact', () => {
    it('should calculate positive impact from cultural accommodations', async () => {
      const adjustments: CulturalAdjustmentMetrics = {
        ramadanAdjustments: 5,
        prayerTimeDelays: 3,
        festivalExemptions: 2,
        familyCoordinationImpact: 8,
        traditionalMedicineInteractions: 1
      };

      const result = service.calculateCulturalAdjustmentImpact(adjustments, 20);

      expect(result).toMatchObject({
        adherenceChange: expect.any(Number),
        timingFlexibility: expect.any(Number),
        familyInvolvement: expect.any(Number),
        culturalHarmony: expect.any(Number)
      });

      expect(result.adherenceChange).toBeGreaterThan(0); // Positive impact
      expect(result.familyInvolvement).toBeGreaterThan(0);
      expect(result.culturalHarmony).toBeGreaterThan(0);
    });

    it('should handle zero adjustments gracefully', async () => {
      const noAdjustments: CulturalAdjustmentMetrics = {
        ramadanAdjustments: 0,
        prayerTimeDelays: 0,
        festivalExemptions: 0,
        familyCoordinationImpact: 0,
        traditionalMedicineInteractions: 0
      };

      const result = service.calculateCulturalAdjustmentImpact(noAdjustments, 10);

      expect(result.adherenceChange).toBe(0);
      expect(result.timingFlexibility).toBe(0);
      expect(result.familyInvolvement).toBe(0);
    });

    it('should cap impact values within reasonable bounds', async () => {
      const extremeAdjustments: CulturalAdjustmentMetrics = {
        ramadanAdjustments: 100,
        prayerTimeDelays: 100,
        festivalExemptions: 100,
        familyCoordinationImpact: 100,
        traditionalMedicineInteractions: 100
      };

      const result = service.calculateCulturalAdjustmentImpact(extremeAdjustments, 10);

      expect(result.adherenceChange).toBeGreaterThanOrEqual(-0.1);
      expect(result.adherenceChange).toBeLessThanOrEqual(0.1);
      expect(result.timingFlexibility).toBeLessThanOrEqual(1);
      expect(result.familyInvolvement).toBeLessThanOrEqual(1);
      expect(result.culturalHarmony).toBeLessThanOrEqual(1);
    });
  });

  describe('generateCulturalFactorPredictions', () => {
    const forecastPeriod = {
      start: new Date('2025-02-01T00:00:00Z'),
      end: new Date('2025-02-07T23:59:59Z')
    };

    beforeEach(() => {
      mockCulturalCalendar.isRamadan.mockResolvedValue({
        is_ramadan: false,
        ramadan_day: undefined,
        days_remaining: undefined,
        ramadan_info: undefined
      });

      mockCulturalCalendar.getCulturalEvents.mockResolvedValue([]);
    });

    it('should predict Ramadan impact for Muslim patients', async () => {
      mockCulturalCalendar.isRamadan.mockResolvedValue({
        is_ramadan: true,
        ramadan_day: 5,
        days_remaining: 25,
        ramadan_info: {
          year: 2025,
          start_date: new Date('2025-01-28T00:00:00Z'),
          end_date: new Date('2025-02-27T23:59:59Z'),
          duration_days: 30,
          fasting_hours: { average: 13.5, longest: 14, shortest: 13 },
          special_dates: { eid_al_fitr: new Date('2025-02-28T00:00:00Z') },
          healthcare_considerations: {
            medication_adjustments_needed: true,
            appointment_preferences: ['early_morning', 'evening'],
            emergency_exceptions: ['life_threatening']
          }
        }
      });

      const result = await service.generateCulturalFactorPredictions(
        sampleContext,
        forecastPeriod
      );

      const ramadanFactor = result.find(factor => factor.factor === 'ramadan_fasting');
      expect(ramadanFactor).toBeDefined();
      if (ramadanFactor) {
        expect(ramadanFactor.impact).toBeLessThan(0); // Negative impact during fasting
        expect(ramadanFactor.adjustment).toContain('sahur');
        expect(ramadanFactor.adjustment).toContain('iftar');
      }
    });

    it('should predict festival impact', async () => {
      mockCulturalCalendar.getCulturalEvents.mockResolvedValue([
        {
          id: 'cny-2025',
          name: 'Chinese New Year',
          name_ms: 'Tahun Baru Cina',
          type: 'cultural',
          date: new Date('2025-02-05T00:00:00Z'),
          duration_days: 2,
          description: 'Chinese cultural celebration',
          healthcare_impact: {
            affects_scheduling: true,
            emergency_services_available: true,
            routine_appointments: 'reduced',
            special_considerations: ['Family reunions']
          },
          cultural_significance: ['Chinese tradition'],
          regions_affected: ['ALL'],
          observance_level: 'national'
        }
      ]);

      const result = await service.generateCulturalFactorPredictions(
        sampleContext,
        forecastPeriod
      );

      const festivalFactor = result.find(factor => factor.factor === 'festival_period');
      expect(festivalFactor).toBeDefined();
      if (festivalFactor) {
        expect(festivalFactor.adjustment).toContain('family coordination');
      }
    });

    it('should always include prayer schedule factor for Muslim patients', async () => {
      const result = await service.generateCulturalFactorPredictions(
        sampleContext,
        forecastPeriod
      );

      const prayerFactor = result.find(factor => factor.factor === 'prayer_schedule');
      expect(prayerFactor).toBeDefined();
      if (prayerFactor) {
        expect(prayerFactor.impact).toBeGreaterThan(0); // Positive impact for accommodation
        expect(prayerFactor.adjustment).toContain('prayer times');
      }
    });

    it('should return empty predictions for non-religious patients with no festivals', async () => {
      const secularContext: CulturalScoringContext = {
        ...sampleContext,
        religiousProfile: {
          religion: 'none',
          observanceLevel: 'flexible',
          prayerTimePreferences: [],
          fastingPeriods: []
        }
      };

      const result = await service.generateCulturalFactorPredictions(
        secularContext,
        forecastPeriod
      );

      expect(result.length).toBe(0);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty adherence records', async () => {
      const timeframe = {
        start: new Date('2025-01-01T00:00:00Z'),
        end: new Date('2025-01-31T23:59:59Z')
      };

      const result = await service.calculateCulturalScore(
        [],
        sampleContext,
        timeframe
      );

      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.recommendations).toBeInstanceOf(Array);
    });

    it('should handle cultural calendar service failures', async () => {
      mockCulturalCalendar.isRamadan.mockRejectedValue(new Error('Service unavailable'));

      const timeframe = {
        start: new Date('2025-01-01T00:00:00Z'),
        end: new Date('2025-01-31T23:59:59Z')
      };

      // Should not throw error
      const result = await service.calculateCulturalScore(
        sampleAdherenceRecords,
        sampleContext,
        timeframe
      );

      expect(result).toBeDefined();
    });

    it('should handle invalid cultural context gracefully', async () => {
      const invalidContext: CulturalScoringContext = {
        ...sampleContext,
        familyStructure: {
          size: 0, // Invalid family size
          elderlyPresent: false,
          childrenPresent: false,
          caregiverRole: 'none'
        }
      };

      const timeframe = {
        start: new Date('2025-01-01T00:00:00Z'),
        end: new Date('2025-01-31T23:59:59Z')
      };

      const result = await service.calculateCulturalScore(
        sampleAdherenceRecords,
        invalidContext,
        timeframe
      );

      expect(result.overallScore).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Performance Tests', () => {
    it('should handle large datasets efficiently', async () => {
      const largeRecordSet = Array(1000).fill(null).map((_, index) => ({
        ...sampleAdherenceRecords[0],
        id: `record-${index}`,
        scheduledTime: new Date(Date.now() - index * 60 * 60 * 1000)
      }));

      const timeframe = {
        start: new Date('2025-01-01T00:00:00Z'),
        end: new Date('2025-01-31T23:59:59Z')
      };

      const startTime = Date.now();
      const result = await service.calculateCulturalScore(
        largeRecordSet,
        sampleContext,
        timeframe
      );
      const endTime = Date.now();

      expect(result).toBeDefined();
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});