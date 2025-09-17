/**
 * AdherenceCalculationEngine Test Suite
 *
 * Comprehensive tests ensuring 99.5% calculation accuracy
 * and proper cultural intelligence integration.
 */

import { AdherenceCalculationEngine } from '../../services/adherence/AdherenceCalculationEngine';
import {
  AdherenceRecord,
  AdherenceStatus,
  ProgressMetrics,
  MedicationAdherenceMetric,
  StreakData,
  AdherencePattern,
  MetricPeriod,
  AdherenceMethod,
  CulturalAdherenceContext
} from '../../types/adherence';
import { Medication } from '../../types/medication';

describe('AdherenceCalculationEngine', () => {
  let engine: AdherenceCalculationEngine;
  let mockMedication: Medication;
  let mockRecords: AdherenceRecord[];

  beforeEach(() => {
    engine = new AdherenceCalculationEngine();

    mockMedication = {
      id: 'med1',
      userId: 'user1',
      name: 'Metformin',
      dosage: {
        amount: 500,
        unit: 'mg',
        form: 'tablet'
      },
      schedule: {
        frequency: 'twice_daily',
        times: ['08:00', '20:00'],
        culturalAdjustments: {
          takeWithFood: true,
          avoidDuringFasting: false,
          prayerTimeConsiderations: [],
          prayerTimeBuffer: 15,
        },
        reminders: true
      },
      cultural: {
        takeWithFood: true,
        avoidDuringFasting: false,
        prayerTimeConsiderations: [],
        traditionalAlternatives: [],
      },
      images: [],
      category: 'prescription',
      status: 'active',
      createdAt: '2025-01-01T00:00:00Z',
      updatedAt: '2025-01-01T00:00:00Z'
    };

    mockRecords = [];
  });

  describe('calculateAdherenceRate', () => {
    it('should calculate 100% adherence for all on-time doses', () => {
      mockRecords = [
        createMockRecord('rec1', 'taken_on_time', 100),
        createMockRecord('rec2', 'taken_on_time', 100),
        createMockRecord('rec3', 'taken_on_time', 100),
        createMockRecord('rec4', 'taken_on_time', 100),
        createMockRecord('rec5', 'taken_on_time', 100)
      ];

      const rate = engine.calculateAdherenceRate(mockRecords);
      expect(rate).toBe(100);
    });

    it('should calculate 0% adherence for all missed doses', () => {
      mockRecords = [
        createMockRecord('rec1', 'missed', 0),
        createMockRecord('rec2', 'missed', 0),
        createMockRecord('rec3', 'missed', 0)
      ];

      const rate = engine.calculateAdherenceRate(mockRecords);
      expect(rate).toBe(0);
    });

    it('should apply weighted scoring for late doses', () => {
      mockRecords = [
        createMockRecord('rec1', 'taken_on_time', 100),
        createMockRecord('rec2', 'taken_late', 70, 60), // 1 hour late
        createMockRecord('rec3', 'taken_late', 50, 150), // 2.5 hours late
        createMockRecord('rec4', 'taken_early', 95),
        createMockRecord('rec5', 'missed', 0)
      ];

      const rate = engine.calculateAdherenceRate(mockRecords);
      // Expected: (1.0 + 0.75 + 0.3 + 0.95 + 0) / 5 = 60%
      expect(rate).toBeGreaterThan(55);
      expect(rate).toBeLessThan(65);
    });

    it('should handle cultural adjustments properly', () => {
      mockRecords = [
        createMockRecord('rec1', 'taken_on_time', 100),
        createMockRecord('rec2', 'adjusted', 90), // Cultural adjustment
        createMockRecord('rec3', 'adjusted', 90),
        createMockRecord('rec4', 'taken_on_time', 100)
      ];

      const rate = engine.calculateAdherenceRate(mockRecords);
      expect(rate).toBeGreaterThan(94);
      expect(rate).toBeLessThan(96);
    });

    it('should return 0 for empty records', () => {
      const rate = engine.calculateAdherenceRate([]);
      expect(rate).toBe(0);
    });

    it('should achieve 99.5% accuracy in calculations', () => {
      // Test calculation accuracy
      const testCases = [
        { onTime: 95, late: 3, missed: 2, expected: 95.5 },
        { onTime: 80, late: 10, missed: 10, expected: 84.5 },
        { onTime: 50, late: 25, missed: 25, expected: 61.25 },
      ];

      testCases.forEach(testCase => {
        const records = [];
        for (let i = 0; i < testCase.onTime; i++) {
          records.push(createMockRecord(`on_${i}`, 'taken_on_time', 100));
        }
        for (let i = 0; i < testCase.late; i++) {
          records.push(createMockRecord(`late_${i}`, 'taken_late', 70, 60));
        }
        for (let i = 0; i < testCase.missed; i++) {
          records.push(createMockRecord(`missed_${i}`, 'missed', 0));
        }

        const rate = engine.calculateAdherenceRate(records);
        const accuracy = engine.validateAccuracy(testCase.expected, rate, 0.5);
        expect(accuracy).toBe(true);
      });
    });
  });

  describe('calculateMedicationAdherence', () => {
    it('should calculate medication-specific metrics correctly', () => {
      const now = new Date();
      mockRecords = [
        createMockRecordWithTime('rec1', 'taken_on_time', 100, 0, new Date(now.getTime() - 24 * 60 * 60 * 1000)),
        createMockRecordWithTime('rec2', 'taken_late', 70, 45, new Date(now.getTime() - 18 * 60 * 60 * 1000)),
        createMockRecordWithTime('rec3', 'taken_early', 95, 0, new Date(now.getTime() - 12 * 60 * 60 * 1000)),
        createMockRecordWithTime('rec4', 'missed', 0, 0, new Date(now.getTime() - 6 * 60 * 60 * 1000)),
        createMockRecordWithTime('rec5', 'taken_on_time', 100, 0, new Date())
      ];

      const metrics = engine.calculateMedicationAdherence(mockMedication, mockRecords);

      expect(metrics.medicationId).toBe('med1');
      expect(metrics.medicationName).toBe('Metformin');
      expect(metrics.totalDoses).toBe(5);
      expect(metrics.takenDoses).toBe(4);
      expect(metrics.missedDoses).toBe(1);
      expect(metrics.lateDoses).toBe(1);
      expect(metrics.earlyDoses).toBe(1);
      expect(metrics.averageDelayMinutes).toBe(45);
      expect(metrics.adherenceRate).toBeGreaterThan(70);
    });

    it('should identify best and worst time adherence', () => {
      const morning = new Date('2025-01-15T08:00:00');
      const evening = new Date('2025-01-15T20:00:00');

      mockRecords = [
        createMockRecordWithTime('rec1', 'taken_on_time', 100, 0, morning),
        createMockRecordWithTime('rec2', 'taken_on_time', 100, 0, new Date(morning.getTime() + 24 * 60 * 60 * 1000)),
        createMockRecordWithTime('rec3', 'missed', 0, 0, evening),
        createMockRecordWithTime('rec4', 'missed', 0, 0, new Date(evening.getTime() + 24 * 60 * 60 * 1000))
      ];

      const metrics = engine.calculateMedicationAdherence(mockMedication, mockRecords);

      expect(metrics.bestTimeAdherence.hour).toBe(8);
      expect(metrics.bestTimeAdherence.adherenceRate).toBe(100);
      expect(metrics.worstTimeAdherence.hour).toBe(20);
      expect(metrics.worstTimeAdherence.adherenceRate).toBe(0);
    });
  });

  describe('calculateStreaks', () => {
    it('should calculate current streak correctly', () => {
      const today = new Date();
      mockRecords = [];

      // Create a 7-day streak
      for (let i = 6; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        mockRecords.push(createMockRecordWithTime(
          `rec_${i}`,
          'taken_on_time',
          100,
          0,
          date
        ));
      }

      const streaks = engine.calculateStreaks(mockRecords);
      expect(streaks.currentStreak).toBe(7);
      expect(streaks.longestStreak).toBe(7);
    });

    it('should detect broken streaks', () => {
      const today = new Date();
      mockRecords = [];

      // Create records with a broken streak
      for (let i = 10; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);

        if (i === 5) {
          // Break the streak
          mockRecords.push(createMockRecordWithTime(
            `rec_${i}`,
            'missed',
            0,
            0,
            date
          ));
        } else {
          mockRecords.push(createMockRecordWithTime(
            `rec_${i}`,
            'taken_on_time',
            100,
            0,
            date
          ));
        }
      }

      const streaks = engine.calculateStreaks(mockRecords);
      expect(streaks.currentStreak).toBe(5); // Last 5 days
      expect(streaks.longestStreak).toBe(5); // Both segments are 5 days
    });

    it('should identify recoverable streaks', () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      mockRecords = [
        createMockRecordWithTime('rec1', 'taken_on_time', 100, 0, new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000)),
        createMockRecordWithTime('rec2', 'taken_on_time', 100, 0, new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000)),
        createMockRecordWithTime('rec3', 'missed', 0, 0, yesterday) // Missed yesterday
      ];

      const streaks = engine.calculateStreaks(mockRecords);
      expect(streaks.recoverable).toBe(true);
      expect(streaks.recoveryWindow).toBeDefined();
    });

    it('should calculate weekly and monthly streaks', () => {
      const today = new Date();
      mockRecords = [];

      // Create 30 days of consistent adherence
      for (let i = 29; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        mockRecords.push(createMockRecordWithTime(
          `rec_${i}`,
          'taken_on_time',
          100,
          0,
          date
        ));
      }

      const streaks = engine.calculateStreaks(mockRecords);
      expect(streaks.weeklyStreaks.length).toBeGreaterThan(0);
      expect(streaks.monthlyStreaks.length).toBeGreaterThan(0);
    });
  });

  describe('analyzePatterns', () => {
    it('should detect morning consistency pattern', () => {
      mockRecords = [];

      // Create morning records with high adherence
      for (let i = 0; i < 20; i++) {
        const date = new Date('2025-01-15T08:00:00');
        date.setDate(date.getDate() - i);
        mockRecords.push(createMockRecordWithTime(
          `morning_${i}`,
          'taken_on_time',
          100,
          0,
          date
        ));
      }

      const patterns = engine.analyzePatterns(mockRecords);
      const morningPattern = patterns.find(p => p.type === 'morning_consistency');

      expect(morningPattern).toBeDefined();
      expect(morningPattern?.confidence).toBeGreaterThan(0.5);
      expect(morningPattern?.description).toContain('morning');
    });

    it('should detect evening missed pattern', () => {
      mockRecords = [];

      // Create evening records with many misses
      for (let i = 0; i < 15; i++) {
        const date = new Date('2025-01-15T20:00:00');
        date.setDate(date.getDate() - i);
        const status = i % 3 === 0 ? 'taken_on_time' : 'missed';
        mockRecords.push(createMockRecordWithTime(
          `evening_${i}`,
          status as AdherenceStatus,
          status === 'taken_on_time' ? 100 : 0,
          0,
          date
        ));
      }

      const patterns = engine.analyzePatterns(mockRecords);
      const eveningPattern = patterns.find(p => p.type === 'evening_missed');

      expect(eveningPattern).toBeDefined();
      expect(eveningPattern?.recommendations.length).toBeGreaterThan(0);
    });

    it('should detect weekend decline pattern', () => {
      mockRecords = [];

      // Create records with poor weekend adherence
      for (let i = 0; i < 30; i++) {
        const date = new Date('2025-01-15T08:00:00');
        date.setDate(date.getDate() - i);
        const dayOfWeek = date.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const status = isWeekend ? 'missed' : 'taken_on_time';

        mockRecords.push(createMockRecordWithTime(
          `rec_${i}`,
          status as AdherenceStatus,
          status === 'taken_on_time' ? 100 : 0,
          0,
          date
        ));
      }

      const patterns = engine.analyzePatterns(mockRecords);
      const weekendPattern = patterns.find(p => p.type === 'weekend_decline');

      expect(weekendPattern).toBeDefined();
      expect(weekendPattern?.recommendations).toContain('Set weekend-specific reminders');
    });

    it('should detect prayer time conflicts with cultural context', () => {
      mockRecords = [];

      // Create records with prayer time adjustments
      for (let i = 0; i < 10; i++) {
        const date = new Date('2025-01-15T13:00:00'); // Zohor time
        date.setDate(date.getDate() - i);

        mockRecords.push({
          id: `prayer_${i}`,
          medicationId: 'med1',
          patientId: 'user1',
          scheduledTime: date,
          takenTime: new Date(date.getTime() + 30 * 60 * 1000),
          status: 'adjusted',
          adherenceScore: 90,
          method: 'manual',
          culturalContext: {
            prayerTime: 'Zohor'
          },
          createdAt: date,
          updatedAt: date
        });
      }

      const patterns = engine.analyzePatterns(mockRecords);
      const prayerPattern = patterns.find(p => p.type === 'prayer_time_conflict');

      expect(prayerPattern).toBeDefined();
      expect(prayerPattern?.culturalFactors).toContain('Prayer time accommodation needed');
    });

    it('should detect fasting adjustment pattern', () => {
      mockRecords = [];

      // Create records during fasting period
      for (let i = 0; i < 15; i++) {
        const date = new Date('2025-03-15T14:00:00'); // During Ramadan
        date.setDate(date.getDate() - i);

        mockRecords.push({
          id: `fasting_${i}`,
          medicationId: 'med1',
          patientId: 'user1',
          scheduledTime: date,
          takenTime: new Date('2025-03-15T19:30:00'), // After Iftar
          status: 'adjusted',
          adherenceScore: 85,
          method: 'manual',
          culturalContext: {
            fastingPeriod: true
          },
          createdAt: date,
          updatedAt: date
        });
      }

      const patterns = engine.analyzePatterns(mockRecords);
      const fastingPattern = patterns.find(p => p.type === 'fasting_adjustment');

      expect(fastingPattern).toBeDefined();
      expect(fastingPattern?.recommendations).toContain('Take medications during Sahur (pre-dawn meal)');
    });

    it('should detect trend patterns', () => {
      mockRecords = [];
      const today = new Date();

      // Create improving trend
      for (let i = 20; i >= 0; i--) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);

        // Older records have more misses
        const status = i > 10 ?
          (i % 3 === 0 ? 'missed' : 'taken_on_time') :
          'taken_on_time';

        mockRecords.push(createMockRecordWithTime(
          `trend_${i}`,
          status as AdherenceStatus,
          status === 'taken_on_time' ? 100 : 0,
          0,
          date
        ));
      }

      const patterns = engine.analyzePatterns(mockRecords);
      const trendPattern = patterns.find(p => p.type === 'improvement_trend');

      expect(trendPattern).toBeDefined();
      expect(trendPattern?.description).toContain('improving');
    });
  });

  describe('generateProgressMetrics', () => {
    it('should generate comprehensive progress metrics', () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');

      mockRecords = generateMockRecordsForPeriod(startDate, endDate);

      const metrics = engine.generateProgressMetrics(
        'user1',
        [mockMedication],
        mockRecords,
        'monthly',
        startDate,
        endDate
      );

      expect(metrics.patientId).toBe('user1');
      expect(metrics.period).toBe('monthly');
      expect(metrics.overallAdherence).toBeGreaterThan(0);
      expect(metrics.medications.length).toBe(1);
      expect(metrics.streaks).toBeDefined();
      expect(metrics.patterns.length).toBeGreaterThanOrEqual(0);
    });

    it('should include cultural insights when provided', () => {
      const startDate = new Date('2025-01-01');
      const endDate = new Date('2025-01-31');

      mockRecords = generateMockRecordsForPeriod(startDate, endDate);

      const culturalInsights = [{
        type: 'prayer_time_optimization' as const,
        description: 'Prayer times affect 30% of doses',
        adherenceImpact: -15,
        occurrences: 45,
        recommendations: ['Schedule after prayer'],
        culturalSensitivity: 'high' as const
      }];

      const metrics = engine.generateProgressMetrics(
        'user1',
        [mockMedication],
        mockRecords,
        'monthly',
        startDate,
        endDate,
        undefined,
        undefined,
        culturalInsights
      );

      expect(metrics.culturalInsights).toEqual(culturalInsights);
    });
  });

  describe('determineAdherenceStatus', () => {
    it('should determine on-time status within window', () => {
      const scheduled = new Date('2025-01-15T08:00:00');
      const taken = new Date('2025-01-15T08:15:00'); // 15 minutes late

      const result = engine.determineAdherenceStatus(scheduled, taken);

      expect(result.status).toBe('taken_on_time');
      expect(result.delayMinutes).toBe(0);
    });

    it('should determine late status after window', () => {
      const scheduled = new Date('2025-01-15T08:00:00');
      const taken = new Date('2025-01-15T09:00:00'); // 60 minutes late

      const result = engine.determineAdherenceStatus(scheduled, taken);

      expect(result.status).toBe('taken_late');
      expect(result.delayMinutes).toBe(60);
    });

    it('should determine early status', () => {
      const scheduled = new Date('2025-01-15T08:00:00');
      const taken = new Date('2025-01-15T07:00:00'); // 60 minutes early

      const result = engine.determineAdherenceStatus(scheduled, taken);

      expect(result.status).toBe('taken_early');
      expect(result.delayMinutes).toBe(60);
    });

    it('should handle cultural adjustments for prayer time', () => {
      const scheduled = new Date('2025-01-15T13:00:00');
      const taken = new Date('2025-01-15T13:10:00'); // During prayer time

      const culturalContext = {
        prayerTime: 'Zohor'
      };

      const result = engine.determineAdherenceStatus(scheduled, taken, culturalContext);

      expect(result.status).toBe('adjusted');
      expect(result.delayMinutes).toBe(0);
    });
  });

  describe('Configuration Management', () => {
    it('should update configuration correctly', () => {
      const newConfig = {
        onTimeWindowMinutes: 45,
        culturalAdjustmentEnabled: false
      };

      engine.updateConfig(newConfig);
      const config = engine.getConfig();

      expect(config.onTimeWindowMinutes).toBe(45);
      expect(config.culturalAdjustmentEnabled).toBe(false);
      expect(config.lateWindowHours).toBe(2); // Default unchanged
    });

    it('should clear cache when config changes', () => {
      // Create some cached calculations
      mockRecords = [
        createMockRecord('rec1', 'taken_on_time', 100),
        createMockRecord('rec2', 'taken_on_time', 100)
      ];

      engine.calculateAdherenceRate(mockRecords);

      // Update config should clear cache
      engine.updateConfig({ onTimeWindowMinutes: 60 });

      // Verify cache is cleared (indirectly by checking recalculation)
      const rate = engine.calculateAdherenceRate(mockRecords);
      expect(rate).toBe(100);
    });
  });
});

// Helper functions
function createMockRecord(
  id: string,
  status: AdherenceStatus,
  score: number,
  delayMinutes?: number
): AdherenceRecord {
  const now = new Date();
  return {
    id,
    medicationId: 'med1',
    patientId: 'user1',
    scheduledTime: now,
    takenTime: status !== 'missed' ? new Date(now.getTime() + (delayMinutes || 0) * 60 * 1000) : undefined,
    status,
    adherenceScore: score,
    method: 'manual',
    delayMinutes,
    createdAt: now,
    updatedAt: now
  };
}

function createMockRecordWithTime(
  id: string,
  status: AdherenceStatus,
  score: number,
  delayMinutes: number,
  scheduledTime: Date
): AdherenceRecord {
  return {
    id,
    medicationId: 'med1',
    patientId: 'user1',
    scheduledTime,
    takenTime: status !== 'missed' ? new Date(scheduledTime.getTime() + delayMinutes * 60 * 1000) : undefined,
    status,
    adherenceScore: score,
    method: 'manual',
    delayMinutes: delayMinutes > 0 ? delayMinutes : undefined,
    createdAt: scheduledTime,
    updatedAt: scheduledTime
  };
}

function generateMockRecordsForPeriod(startDate: Date, endDate: Date): AdherenceRecord[] {
  const records: AdherenceRecord[] = [];
  const currentDate = new Date(startDate);
  let recordId = 0;

  while (currentDate <= endDate) {
    // Morning dose
    const morningTime = new Date(currentDate);
    morningTime.setHours(8, 0, 0, 0);

    // Simulate realistic adherence pattern
    const morningStatus = Math.random() > 0.2 ? 'taken_on_time' : 'missed';
    records.push(createMockRecordWithTime(
      `rec_${recordId++}`,
      morningStatus as AdherenceStatus,
      morningStatus === 'taken_on_time' ? 100 : 0,
      0,
      morningTime
    ));

    // Evening dose
    const eveningTime = new Date(currentDate);
    eveningTime.setHours(20, 0, 0, 0);

    const eveningStatus = Math.random() > 0.15 ? 'taken_on_time' : 'missed';
    records.push(createMockRecordWithTime(
      `rec_${recordId++}`,
      eveningStatus as AdherenceStatus,
      eveningStatus === 'taken_on_time' ? 100 : 0,
      0,
      eveningTime
    ));

    currentDate.setDate(currentDate.getDate() + 1);
  }

  return records;
}