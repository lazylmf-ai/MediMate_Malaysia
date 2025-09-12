/**
 * Scheduling Utilities Test Suite
 * 
 * Tests for utility functions used across the cultural scheduling system
 * including time parsing, conflict detection, and schedule optimization.
 */

import { schedulingUtilities } from '../index';

describe('Scheduling Utilities', () => {
  describe('Time Parsing and Conversion', () => {
    test('should parse time to minutes correctly', () => {
      expect(schedulingUtilities.parseTimeToMinutes('08:00')).toBe(480);
      expect(schedulingUtilities.parseTimeToMinutes('12:30')).toBe(750);
      expect(schedulingUtilities.parseTimeToMinutes('00:00')).toBe(0);
      expect(schedulingUtilities.parseTimeToMinutes('23:59')).toBe(1439);
    });

    test('should convert minutes to time string correctly', () => {
      expect(schedulingUtilities.minutesToTimeString(480)).toBe('08:00');
      expect(schedulingUtilities.minutesToTimeString(750)).toBe('12:30');
      expect(schedulingUtilities.minutesToTimeString(0)).toBe('00:00');
      expect(schedulingUtilities.minutesToTimeString(1439)).toBe('23:59');
    });

    test('should handle minutes overflow correctly', () => {
      expect(schedulingUtilities.minutesToTimeString(1440)).toBe('00:00'); // Next day
      expect(schedulingUtilities.minutesToTimeString(1500)).toBe('01:00'); // Next day + 1 hour
    });
  });

  describe('Time Difference Calculation', () => {
    test('should calculate time differences correctly', () => {
      expect(schedulingUtilities.getTimeDifference('08:00', '09:00')).toBe(60);
      expect(schedulingUtilities.getTimeDifference('12:00', '12:30')).toBe(30);
      expect(schedulingUtilities.getTimeDifference('09:00', '08:00')).toBe(60); // Absolute difference
      expect(schedulingUtilities.getTimeDifference('23:30', '00:30')).toBe(1380); // Cross-day
    });

    test('should handle same time correctly', () => {
      expect(schedulingUtilities.getTimeDifference('12:00', '12:00')).toBe(0);
    });
  });

  describe('Time Range Checking', () => {
    test('should check if time is in range correctly', () => {
      expect(schedulingUtilities.isTimeInRange('09:00', '08:00', '10:00')).toBe(true);
      expect(schedulingUtilities.isTimeInRange('07:00', '08:00', '10:00')).toBe(false);
      expect(schedulingUtilities.isTimeInRange('11:00', '08:00', '10:00')).toBe(false);
      expect(schedulingUtilities.isTimeInRange('08:00', '08:00', '10:00')).toBe(true); // Inclusive start
      expect(schedulingUtilities.isTimeInRange('10:00', '08:00', '10:00')).toBe(true); // Inclusive end
    });

    test('should handle overnight ranges correctly', () => {
      expect(schedulingUtilities.isTimeInRange('23:30', '22:00', '02:00')).toBe(true);
      expect(schedulingUtilities.isTimeInRange('01:30', '22:00', '02:00')).toBe(true);
      expect(schedulingUtilities.isTimeInRange('12:00', '22:00', '02:00')).toBe(false);
    });
  });

  describe('Time Buffer Operations', () => {
    test('should add time buffer correctly', () => {
      expect(schedulingUtilities.addTimeBuffer('08:00', 30)).toBe('08:30');
      expect(schedulingUtilities.addTimeBuffer('12:45', 30)).toBe('13:15');
      expect(schedulingUtilities.addTimeBuffer('23:30', 60)).toBe('00:30'); // Next day
    });

    test('should subtract time buffer correctly', () => {
      expect(schedulingUtilities.subtractTimeBuffer('09:00', 30)).toBe('08:30');
      expect(schedulingUtilities.subtractTimeBuffer('13:15', 30)).toBe('12:45');
      expect(schedulingUtilities.subtractTimeBuffer('00:30', 60)).toBe('00:00'); // Clamps to 0
    });

    test('should handle negative results in subtract buffer', () => {
      expect(schedulingUtilities.subtractTimeBuffer('00:15', 30)).toBe('00:00');
      expect(schedulingUtilities.subtractTimeBuffer('00:00', 30)).toBe('00:00');
    });
  });

  describe('Optimal Spacing Calculation', () => {
    test('should maintain existing spacing when adequate', () => {
      const times = ['08:00', '12:00', '18:00'];
      const result = schedulingUtilities.calculateOptimalSpacing(times, 60);
      
      expect(result).toHaveLength(3);
      expect(result[0]).toBe('08:00');
      expect(result[1]).toBe('12:00');
      expect(result[2]).toBe('18:00');
    });

    test('should adjust spacing when too close', () => {
      const times = ['08:00', '08:30', '09:00']; // 30-minute gaps, need 60
      const result = schedulingUtilities.calculateOptimalSpacing(times, 60);
      
      expect(result).toHaveLength(3);
      expect(result[0]).toBe('08:00');
      expect(result[1]).toBe('09:00'); // Adjusted to maintain 60-minute gap
      expect(result[2]).toBe('10:00'); // Further adjusted
    });

    test('should handle single medication time', () => {
      const times = ['08:00'];
      const result = schedulingUtilities.calculateOptimalSpacing(times, 60);
      
      expect(result).toEqual(['08:00']);
    });

    test('should handle empty array', () => {
      const times: string[] = [];
      const result = schedulingUtilities.calculateOptimalSpacing(times, 60);
      
      expect(result).toEqual([]);
    });

    test('should sort times before processing', () => {
      const times = ['18:00', '08:00', '12:00']; // Unsorted
      const result = schedulingUtilities.calculateOptimalSpacing(times, 60);
      
      expect(result[0]).toBe('08:00'); // Should be sorted
      expect(result[1]).toBe('12:00');
      expect(result[2]).toBe('18:00');
    });
  });

  describe('Conflict Detection', () => {
    test('should detect no conflicts when times are well spaced', () => {
      const schedules = [
        { name: 'Medication A', times: ['08:00', '20:00'] },
        { name: 'Medication B', times: ['12:00', '18:00'] }
      ];
      
      const conflicts = schedulingUtilities.detectTimeConflicts(schedules, 30);
      
      expect(conflicts).toHaveLength(0);
    });

    test('should detect conflicts when medications are too close', () => {
      const schedules = [
        { name: 'Medication A', times: ['08:00'] },
        { name: 'Medication B', times: ['08:15'] } // 15 minutes apart, threshold 30
      ];
      
      const conflicts = schedulingUtilities.detectTimeConflicts(schedules, 30);
      
      expect(conflicts).toHaveLength(1);
      expect(conflicts[0].medications).toContain('Medication A');
      expect(conflicts[0].medications).toContain('Medication B');
      expect(conflicts[0].suggestedAdjustment).toContain('45 minutes');
    });

    test('should detect multiple conflicts', () => {
      const schedules = [
        { name: 'Med A', times: ['08:00'] },
        { name: 'Med B', times: ['08:10'] },
        { name: 'Med C', times: ['08:20'] }
      ];
      
      const conflicts = schedulingUtilities.detectTimeConflicts(schedules, 30);
      
      expect(conflicts.length).toBeGreaterThan(0);
      // Should detect A-B, A-C, and B-C conflicts
    });

    test('should handle different conflict thresholds', () => {
      const schedules = [
        { name: 'Med A', times: ['08:00'] },
        { name: 'Med B', times: ['08:45'] }
      ];
      
      const conflicts15 = schedulingUtilities.detectTimeConflicts(schedules, 15);
      const conflicts60 = schedulingUtilities.detectTimeConflicts(schedules, 60);
      
      expect(conflicts15).toHaveLength(0); // 45 minutes > 15
      expect(conflicts60).toHaveLength(1); // 45 minutes < 60
    });
  });

  describe('Meal-Based Timing Generation', () => {
    const mealTimes = {
      breakfast: '07:30',
      lunch: '12:30',
      dinner: '19:30'
    };

    test('should generate before meal timings', () => {
      const timings = schedulingUtilities.generateMealBasedTiming('before', mealTimes, 30);
      
      expect(timings).toHaveLength(3);
      expect(timings[0]).toBe('07:00'); // 30 min before breakfast
      expect(timings[1]).toBe('12:00'); // 30 min before lunch
      expect(timings[2]).toBe('19:00'); // 30 min before dinner
    });

    test('should generate with meal timings', () => {
      const timings = schedulingUtilities.generateMealBasedTiming('with', mealTimes, 30);
      
      expect(timings).toHaveLength(3);
      expect(timings[0]).toBe('07:30'); // Exact meal time
      expect(timings[1]).toBe('12:30');
      expect(timings[2]).toBe('19:30');
    });

    test('should generate after meal timings', () => {
      const timings = schedulingUtilities.generateMealBasedTiming('after', mealTimes, 30);
      
      expect(timings).toHaveLength(3);
      expect(timings[0]).toBe('08:00'); // 30 min after breakfast
      expect(timings[1]).toBe('13:00'); // 30 min after lunch
      expect(timings[2]).toBe('20:00'); // 30 min after dinner
    });

    test('should generate independent timings', () => {
      const timings = schedulingUtilities.generateMealBasedTiming('independent', mealTimes, 30);
      
      expect(timings).toHaveLength(3);
      expect(timings).toContain('10:00');
      expect(timings).toContain('15:00');
      expect(timings).toContain('22:00');
    });
  });

  describe('Adherence Window Calculation', () => {
    test('should calculate strict adherence windows', () => {
      const window = schedulingUtilities.calculateAdherenceWindows('12:00', 'strict');
      
      expect(window.optimal).toBe('12:00');
      expect(window.earliest).toBe('11:45'); // -15 minutes
      expect(window.latest).toBe('12:15');   // +15 minutes
      expect(window.windowMinutes).toBe(30); // Total window
    });

    test('should calculate moderate adherence windows', () => {
      const window = schedulingUtilities.calculateAdherenceWindows('12:00', 'moderate');
      
      expect(window.optimal).toBe('12:00');
      expect(window.earliest).toBe('11:30'); // -30 minutes
      expect(window.latest).toBe('12:30');   // +30 minutes
      expect(window.windowMinutes).toBe(60); // Total window
    });

    test('should calculate flexible adherence windows', () => {
      const window = schedulingUtilities.calculateAdherenceWindows('12:00', 'flexible');
      
      expect(window.optimal).toBe('12:00');
      expect(window.earliest).toBe('11:00'); // -60 minutes
      expect(window.latest).toBe('13:00');   // +60 minutes
      expect(window.windowMinutes).toBe(120); // Total window
    });

    test('should default to moderate flexibility', () => {
      const window = schedulingUtilities.calculateAdherenceWindows('12:00');
      
      expect(window.windowMinutes).toBe(60); // Moderate = 60 minutes total
    });
  });

  describe('Cultural Timing Optimization', () => {
    test('should optimize schedule avoiding cultural conflict times', () => {
      const medicationTimes = ['12:15', '18:30'];
      const culturalAvoidTimes = [
        { start: '12:00', end: '14:00', reason: 'Prayer time' },
        { start: '18:00', end: '19:00', reason: 'Evening prayer' }
      ];
      const preferredTimes = ['10:00', '16:00', '21:00'];

      const result = schedulingUtilities.optimizeForCulturalTiming(
        medicationTimes,
        culturalAvoidTimes,
        preferredTimes
      );

      expect(result.adjustments).toHaveLength(2);
      expect(result.optimizedTimes).not.toContain('12:15'); // Should be adjusted
      expect(result.optimizedTimes).not.toContain('18:30'); // Should be adjusted
      expect(result.adjustments[0].reason).toBe('Prayer time');
    });

    test('should handle no conflicts gracefully', () => {
      const medicationTimes = ['08:00', '20:00'];
      const culturalAvoidTimes = [
        { start: '12:00', end: '14:00', reason: 'Prayer time' }
      ];

      const result = schedulingUtilities.optimizeForCulturalTiming(
        medicationTimes,
        culturalAvoidTimes
      );

      expect(result.adjustments).toHaveLength(0);
      expect(result.optimizedTimes).toEqual(['08:00', '20:00']);
    });

    test('should fallback to safe times when no preferred times available', () => {
      const medicationTimes = ['12:30'];
      const culturalAvoidTimes = [
        { start: '12:00', end: '14:00', reason: 'Prayer time' }
      ];

      const result = schedulingUtilities.optimizeForCulturalTiming(
        medicationTimes,
        culturalAvoidTimes,
        [] // No preferred times
      );

      expect(result.adjustments).toHaveLength(1);
      expect(result.optimizedTimes[0]).toBe('14:30'); // 30 min after avoid period
    });
  });

  describe('Reminder Schedule Generation', () => {
    test('should generate default reminder schedule', () => {
      const reminder = schedulingUtilities.generateReminderSchedule('12:00');
      
      expect(reminder.advance).toBe('11:45'); // 15 min before
      expect(reminder.medication).toBe('12:00');
      expect(reminder.followup).toBe('12:30'); // 30 min after
      expect(reminder.snoozeOptions).toHaveLength(3);
      expect(reminder.snoozeOptions[0]).toBe('12:10'); // 10 min snooze
    });

    test('should generate custom reminder schedule', () => {
      const customSettings = {
        advance: 30,
        followup: 60,
        snooze: 15
      };

      const reminder = schedulingUtilities.generateReminderSchedule('12:00', customSettings);
      
      expect(reminder.advance).toBe('11:30'); // 30 min before
      expect(reminder.followup).toBe('13:00'); // 60 min after
      expect(reminder.snoozeOptions[0]).toBe('12:15'); // 15 min snooze
      expect(reminder.snoozeOptions[1]).toBe('12:30'); // 30 min snooze
      expect(reminder.snoozeOptions[2]).toBe('12:45'); // 45 min snooze
    });

    test('should handle edge cases in timing', () => {
      const reminder = schedulingUtilities.generateReminderSchedule('00:10', {
        advance: 20,
        followup: 10,
        snooze: 5
      });
      
      expect(reminder.advance).toBe('00:00'); // Can't go before 00:00
      expect(reminder.medication).toBe('00:10');
      expect(reminder.followup).toBe('00:20');
    });
  });

  describe('Edge Cases and Error Handling', () => {
    test('should handle invalid time formats gracefully', () => {
      expect(() => schedulingUtilities.parseTimeToMinutes('invalid')).toThrow();
      expect(() => schedulingUtilities.parseTimeToMinutes('25:00')).not.toThrow(); // Should handle gracefully
    });

    test('should handle empty arrays in conflict detection', () => {
      const conflicts = schedulingUtilities.detectTimeConflicts([], 30);
      expect(conflicts).toHaveLength(0);
    });

    test('should handle medications with no times', () => {
      const schedules = [
        { name: 'Med A', times: [] },
        { name: 'Med B', times: ['08:00'] }
      ];
      
      const conflicts = schedulingUtilities.detectTimeConflicts(schedules, 30);
      expect(conflicts).toHaveLength(0);
    });
  });

  describe('Performance Tests', () => {
    test('should handle large number of medications efficiently', () => {
      const largeMedicationList = Array.from({ length: 100 }, (_, i) => ({
        name: `Med ${i}`,
        times: [`${8 + (i % 12)}:${(i * 5) % 60}`]
      }));

      const startTime = Date.now();
      const conflicts = schedulingUtilities.detectTimeConflicts(largeMedicationList, 30);
      const endTime = Date.now();

      expect(conflicts).toBeDefined();
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });

    test('should handle large time arrays in spacing calculation', () => {
      const largeTimes = Array.from({ length: 50 }, (_, i) => 
        schedulingUtilities.minutesToTimeString(i * 30)
      );

      const startTime = Date.now();
      const result = schedulingUtilities.calculateOptimalSpacing(largeTimes, 60);
      const endTime = Date.now();

      expect(result).toHaveLength(50);
      expect(endTime - startTime).toBeLessThan(500); // Should complete within 500ms
    });
  });
});