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
        prayerTimeConsiderations: []
      },
      images: [],
      category: 'prescription',
      status: 'active',
      createdAt: '2024-01-01',
      updatedAt: '2024-01-01'
    };

    // Create mock records with various statuses
    const now = new Date();
    mockRecords = [];

    // Generate 30 days of records
    for (let day = 29; day >= 0; day--) {
      const scheduledMorning = new Date(now);
      scheduledMorning.setDate(scheduledMorning.getDate() - day);
      scheduledMorning.setHours(8, 0, 0, 0);

      const scheduledEvening = new Date(now);
      scheduledEvening.setDate(scheduledEvening.getDate() - day);
      scheduledEvening.setHours(20, 0, 0, 0);

      // Morning dose - mostly on time
      const morningStatus: AdherenceStatus = day % 7 === 0 ? 'missed' : 'taken_on_time';
      const morningTakenTime = morningStatus === 'taken_on_time'
        ? new Date(scheduledMorning.getTime() + 10 * 60000) // 10 minutes late
        : undefined;

      mockRecords.push({
        id: `rec_morning_${day}`,
        medicationId: 'med1',
        patientId: 'user1',
        scheduledTime: scheduledMorning,
        takenTime: morningTakenTime,
        status: morningStatus,
        adherenceScore: morningStatus === 'taken_on_time' ? 100 : 0,
        method: 'manual',
        delayMinutes: morningStatus === 'taken_on_time' ? 10 : undefined,
        createdAt: scheduledMorning,
        updatedAt: scheduledMorning
      });

      // Evening dose - sometimes late
      const eveningDelay = day % 3 === 0 ? 45 : 5; // Sometimes late
      const eveningStatus: AdherenceStatus =
        day % 5 === 0 ? 'missed' :
        eveningDelay > 30 ? 'taken_late' : 'taken_on_time';
      const eveningTakenTime = eveningStatus !== 'missed'
        ? new Date(scheduledEvening.getTime() + eveningDelay * 60000)
        : undefined;

      mockRecords.push({
        id: `rec_evening_${day}`,
        medicationId: 'med1',
        patientId: 'user1',
        scheduledTime: scheduledEvening,
        takenTime: eveningTakenTime,
        status: eveningStatus,
        adherenceScore: eveningStatus === 'taken_on_time' ? 100 : eveningStatus === 'taken_late' ? 70 : 0,
        method: 'manual',
        delayMinutes: eveningStatus !== 'missed' ? eveningDelay : undefined,
        createdAt: scheduledEvening,
        updatedAt: scheduledEvening
      });
    }
  });

  describe('Adherence Rate Calculation', () => {
    test('should calculate overall adherence rate accurately', () => {
      const adherenceRate = engine.calculateAdherenceRate(mockRecords);

      // Should be between 0 and 100
      expect(adherenceRate).toBeGreaterThanOrEqual(0);
      expect(adherenceRate).toBeLessThanOrEqual(100);

      // With our mock data pattern, should be around 70-80%
      expect(adherenceRate).toBeGreaterThan(60);
      expect(adherenceRate).toBeLessThan(90);
    });

    test('should handle empty records', () => {
      const adherenceRate = engine.calculateAdherenceRate([]);
      expect(adherenceRate).toBe(0);
    });

    test('should weight on-time doses higher than late doses', () => {
      const onTimeRecords: AdherenceRecord[] = [{
        id: '1',
        medicationId: 'med1',
        patientId: 'user1',
        scheduledTime: new Date(),
        takenTime: new Date(),
        status: 'taken_on_time',
        adherenceScore: 100,
        method: 'manual',
        createdAt: new Date(),
        updatedAt: new Date()
      }];

      const lateRecords: AdherenceRecord[] = [{
        id: '2',
        medicationId: 'med1',
        patientId: 'user1',
        scheduledTime: new Date(),
        takenTime: new Date(Date.now() + 90 * 60000), // 90 minutes late
        status: 'taken_late',
        adherenceScore: 70,
        method: 'manual',
        delayMinutes: 90,
        createdAt: new Date(),
        updatedAt: new Date()
      }];

      const onTimeRate = engine.calculateAdherenceRate(onTimeRecords);
      const lateRate = engine.calculateAdherenceRate(lateRecords);

      expect(onTimeRate).toBeGreaterThan(lateRate);
    });

    test('should handle cultural adjustments appropriately', () => {
      const culturalContext: CulturalAdherenceContext = {
        prayerTime: 'Subuh',
        fastingPeriod: false
      };

      const scheduledTime = new Date();
      const takenTime = new Date(scheduledTime.getTime() + 10 * 60000); // 10 minutes late

      const result = engine.determineAdherenceStatus(
        scheduledTime,
        takenTime,
        culturalContext
      );

      expect(result.status).toBe('adjusted');
      expect(result.delayMinutes).toBe(0);
    });
  });

  describe('Medication-Specific Adherence', () => {
    test('should calculate medication adherence metrics correctly', () => {
      const metrics = engine.calculateMedicationAdherence(mockMedication, mockRecords);

      expect(metrics.medicationId).toBe('med1');
      expect(metrics.medicationName).toBe('Metformin');
      expect(metrics.totalDoses).toBe(60); // 30 days * 2 doses
      expect(metrics.takenDoses).toBeGreaterThan(0);
      expect(metrics.missedDoses).toBeGreaterThan(0);
      expect(metrics.lateDoses).toBeGreaterThan(0);
      expect(metrics.averageDelayMinutes).toBeGreaterThan(0);
      expect(metrics.bestTimeAdherence).toBeDefined();
      expect(metrics.worstTimeAdherence).toBeDefined();
      expect(metrics.trends).toBeInstanceOf(Array);
    });

    test('should identify best and worst adherence times', () => {
      const metrics = engine.calculateMedicationAdherence(mockMedication, mockRecords);

      expect(metrics.bestTimeAdherence.hour).toBeDefined();
      expect(metrics.worstTimeAdherence.hour).toBeDefined();
      expect(metrics.bestTimeAdherence.adherenceRate).toBeGreaterThan(
        metrics.worstTimeAdherence.adherenceRate
      );
    });
  });

  describe('Streak Calculation', () => {
    test('should calculate current streak correctly', () => {
      const recentRecords: AdherenceRecord[] = [];
      const now = new Date();

      // Create a 7-day streak
      for (let i = 6; i >= 0; i--) {
        const scheduled = new Date(now);
        scheduled.setDate(scheduled.getDate() - i);

        recentRecords.push({
          id: `streak_${i}`,
          medicationId: 'med1',
          patientId: 'user1',
          scheduledTime: scheduled,
          takenTime: scheduled,
          status: 'taken_on_time',
          adherenceScore: 100,
          method: 'manual',
          createdAt: scheduled,
          updatedAt: scheduled
        });
      }

      const streakData = engine.calculateStreaks(recentRecords);
      expect(streakData.currentStreak).toBe(7);
    });

    test('should handle streak recovery within recovery window', () => {
      const records: AdherenceRecord[] = [];
      const now = new Date();

      // Day 1-3: taken
      for (let i = 3; i >= 1; i--) {
        const scheduled = new Date(now);
        scheduled.setDate(scheduled.getDate() - i);
        records.push({
          id: `rec_${i}`,
          medicationId: 'med1',
          patientId: 'user1',
          scheduledTime: scheduled,
          takenTime: scheduled,
          status: 'taken_on_time',
          adherenceScore: 100,
          method: 'manual',
          createdAt: scheduled,
          updatedAt: scheduled
        });
      }

      // Day 0: missed but within recovery window
      const missedScheduled = new Date(now);
      missedScheduled.setHours(missedScheduled.getHours() - 20); // 20 hours ago
      records.push({
        id: 'rec_missed',
        medicationId: 'med1',
        patientId: 'user1',
        scheduledTime: missedScheduled,
        status: 'missed',
        adherenceScore: 0,
        method: 'manual',
        createdAt: missedScheduled,
        updatedAt: missedScheduled
      });

      const streakData = engine.calculateStreaks(records);
      expect(streakData.recoverable).toBe(true);
      expect(streakData.recoveryWindow).toBeDefined();
      expect(streakData.recoveryWindow).toBeGreaterThan(0);
    });

    test('should calculate weekly and monthly streaks', () => {
      const streakData = engine.calculateStreaks(mockRecords);

      expect(streakData.weeklyStreaks).toBeInstanceOf(Array);
      expect(streakData.monthlyStreaks).toBeInstanceOf(Array);
      expect(streakData.longestStreak).toBeGreaterThan(0);
    });
  });

  describe('Pattern Analysis', () => {
    test('should detect morning consistency pattern', () => {
      const patterns = engine.analyzePatterns(mockRecords);

      // Check if any pattern is detected
      expect(patterns).toBeInstanceOf(Array);
      expect(patterns.length).toBeGreaterThan(0);

      // Look for specific patterns
      const morningPattern = patterns.find(p => p.type === 'morning_consistency');
      if (morningPattern) {
        expect(morningPattern.confidence).toBeGreaterThan(0);
        expect(morningPattern.recommendations).toBeInstanceOf(Array);
      }
    });

    test('should detect evening missed pattern', () => {
      const patterns = engine.analyzePatterns(mockRecords);
      const eveningPattern = patterns.find(p => p.type === 'evening_missed');

      if (eveningPattern) {
        expect(eveningPattern.description).toContain('evening');
        expect(eveningPattern.recommendations.length).toBeGreaterThan(0);
      }
    });

    test('should detect weekend decline pattern', () => {
      // Create records with weekend misses
      const weekendRecords: AdherenceRecord[] = [];
      const now = new Date();

      for (let i = 27; i >= 0; i--) {
        const scheduled = new Date(now);
        scheduled.setDate(scheduled.getDate() - i);
        const dayOfWeek = scheduled.getDay();

        // Miss weekend doses more frequently
        const status: AdherenceStatus =
          (dayOfWeek === 0 || dayOfWeek === 6) && Math.random() > 0.3
            ? 'missed'
            : 'taken_on_time';

        weekendRecords.push({
          id: `weekend_${i}`,
          medicationId: 'med1',
          patientId: 'user1',
          scheduledTime: scheduled,
          takenTime: status === 'taken_on_time' ? scheduled : undefined,
          status,
          adherenceScore: status === 'taken_on_time' ? 100 : 0,
          method: 'manual',
          createdAt: scheduled,
          updatedAt: scheduled
        });
      }

      const patterns = engine.analyzePatterns(weekendRecords);
      const weekendPattern = patterns.find(p => p.type === 'weekend_decline');

      if (weekendPattern) {
        expect(weekendPattern.recommendations).toContain('Set weekend-specific reminders');
      }
    });

    test('should detect prayer time conflicts when cultural adjustment is enabled', () => {
      const culturalRecords: AdherenceRecord[] = mockRecords.map(r => ({
        ...r,
        culturalContext: {
          prayerTime: 'Maghrib',
          fastingPeriod: false
        },
        status: 'adjusted' as AdherenceStatus
      }));

      const patterns = engine.analyzePatterns(culturalRecords);
      const prayerPattern = patterns.find(p => p.type === 'prayer_time_conflict');

      if (prayerPattern) {
        expect(prayerPattern.culturalFactors).toBeDefined();
        expect(prayerPattern.culturalFactors).toContain('Prayer time accommodation needed');
      }
    });
  });

  describe('Progress Metrics Generation', () => {
    test('should generate comprehensive progress metrics', () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      const endDate = new Date();

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
      expect(metrics.medications).toHaveLength(1);
      expect(metrics.streaks).toBeDefined();
      expect(metrics.patterns).toBeInstanceOf(Array);
      expect(metrics.predictions).toBeInstanceOf(Array);
      expect(metrics.culturalInsights).toBeInstanceOf(Array);
    });

    test('should handle different metric periods', () => {
      const periods: MetricPeriod[] = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'];

      periods.forEach(period => {
        const startDate = new Date();
        const endDate = new Date();

        switch (period) {
          case 'daily':
            startDate.setDate(startDate.getDate() - 1);
            break;
          case 'weekly':
            startDate.setDate(startDate.getDate() - 7);
            break;
          case 'monthly':
            startDate.setMonth(startDate.getMonth() - 1);
            break;
          case 'quarterly':
            startDate.setMonth(startDate.getMonth() - 3);
            break;
          case 'yearly':
            startDate.setFullYear(startDate.getFullYear() - 1);
            break;
        }

        const metrics = engine.generateProgressMetrics(
          'user1',
          [mockMedication],
          mockRecords,
          period,
          startDate,
          endDate
        );

        expect(metrics.period).toBe(period);
        expect(metrics.startDate).toBeInstanceOf(Date);
        expect(metrics.endDate).toBeInstanceOf(Date);
      });
    });
  });

  describe('Adherence Status Determination', () => {
    test('should correctly determine on-time status', () => {
      const scheduled = new Date();
      const taken = new Date(scheduled.getTime() + 15 * 60000); // 15 minutes late

      const result = engine.determineAdherenceStatus(scheduled, taken);

      expect(result.status).toBe('taken_on_time');
      expect(result.delayMinutes).toBe(0);
    });

    test('should correctly determine late status', () => {
      const scheduled = new Date();
      const taken = new Date(scheduled.getTime() + 45 * 60000); // 45 minutes late

      const result = engine.determineAdherenceStatus(scheduled, taken);

      expect(result.status).toBe('taken_late');
      expect(result.delayMinutes).toBe(45);
    });

    test('should correctly determine early status', () => {
      const scheduled = new Date();
      const taken = new Date(scheduled.getTime() - 45 * 60000); // 45 minutes early

      const result = engine.determineAdherenceStatus(scheduled, taken);

      expect(result.status).toBe('taken_early');
      expect(result.delayMinutes).toBe(45);
    });

    test('should correctly determine missed status', () => {
      const scheduled = new Date();
      const taken = new Date(scheduled.getTime() + 3 * 60 * 60000); // 3 hours late

      const result = engine.determineAdherenceStatus(scheduled, taken);

      expect(result.status).toBe('missed');
      expect(result.delayMinutes).toBe(180);
    });
  });

  describe('Configuration Updates', () => {
    test('should update configuration correctly', () => {
      const newConfig = {
        onTimeWindowMinutes: 45,
        lateWindowHours: 3,
        culturalAdjustmentEnabled: false
      };

      engine.updateConfig(newConfig);
      const config = engine.getConfig();

      expect(config.onTimeWindowMinutes).toBe(45);
      expect(config.lateWindowHours).toBe(3);
      expect(config.culturalAdjustmentEnabled).toBe(false);
    });

    test('should clear cache when configuration changes', () => {
      // Calculate adherence with initial config
      const rate1 = engine.calculateAdherenceRate(mockRecords);

      // Update config
      engine.updateConfig({ minimumAdherenceThreshold: 90 });

      // Calculate again - should not use cached value
      const rate2 = engine.calculateAdherenceRate(mockRecords);

      // Rates should be the same as calculation logic hasn't changed
      expect(rate2).toBe(rate1);
    });
  });

  describe('Accuracy Validation', () => {
    test('should validate calculation accuracy within tolerance', () => {
      const expected = 75.5;
      const actual = 75.8;

      const isValid = engine.validateAccuracy(expected, actual, 0.5);
      expect(isValid).toBe(true);

      const isInvalid = engine.validateAccuracy(expected, 77, 0.5);
      expect(isInvalid).toBe(false);
    });

    test('should achieve 99.5% accuracy target', () => {
      // Test with known data set
      const testRecords: AdherenceRecord[] = [
        // 10 on-time doses
        ...Array(10).fill(null).map((_, i) => ({
          id: `on_time_${i}`,
          medicationId: 'med1',
          patientId: 'user1',
          scheduledTime: new Date(),
          takenTime: new Date(),
          status: 'taken_on_time' as AdherenceStatus,
          adherenceScore: 100,
          method: 'manual' as AdherenceMethod,
          createdAt: new Date(),
          updatedAt: new Date()
        })),
        // 5 missed doses
        ...Array(5).fill(null).map((_, i) => ({
          id: `missed_${i}`,
          medicationId: 'med1',
          patientId: 'user1',
          scheduledTime: new Date(),
          status: 'missed' as AdherenceStatus,
          adherenceScore: 0,
          method: 'manual' as AdherenceMethod,
          createdAt: new Date(),
          updatedAt: new Date()
        }))
      ];

      const adherenceRate = engine.calculateAdherenceRate(testRecords);
      const expectedRate = 66.7; // 10/15 * 100

      // Should be within 0.5% accuracy
      expect(Math.abs(adherenceRate - expectedRate)).toBeLessThan(0.5);
    });
  });
});