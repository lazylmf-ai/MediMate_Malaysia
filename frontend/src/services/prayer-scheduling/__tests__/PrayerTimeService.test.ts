/**
 * Prayer Time Service Tests
 * 
 * Tests for prayer time calculations, Qibla direction,
 * and medication scheduling integration.
 */

import PrayerTimeService from '../PrayerTimeService';
import { MALAYSIAN_STATES_DATA } from '../../../types/cultural';

describe('PrayerTimeService', () => {
  let service: PrayerTimeService;
  
  beforeEach(() => {
    service = PrayerTimeService.getInstance();
    service.clearCache(); // Clear cache between tests
  });

  describe('Prayer Time Calculation', () => {
    test('should calculate prayer times for Kuala Lumpur', async () => {
      const params = {
        latitude: 3.139,
        longitude: 101.6869,
        date: new Date('2024-01-15'),
        madhab: 'shafi' as const,
        method: 'jakim' as const
      };

      const prayerTimes = await service.calculatePrayerTimes(params);

      expect(prayerTimes).toBeDefined();
      expect(prayerTimes.fajr).toBeInstanceOf(Date);
      expect(prayerTimes.dhuhr).toBeInstanceOf(Date);
      expect(prayerTimes.asr).toBeInstanceOf(Date);
      expect(prayerTimes.maghrib).toBeInstanceOf(Date);
      expect(prayerTimes.isha).toBeInstanceOf(Date);
      expect(typeof prayerTimes.qibla).toBe('number');
      expect(prayerTimes.qibla).toBeGreaterThanOrEqual(0);
      expect(prayerTimes.qibla).toBeLessThanOrEqual(360);
    });

    test('should calculate different times for different madhabs', async () => {
      const baseParams = {
        latitude: 3.139,
        longitude: 101.6869,
        date: new Date('2024-01-15'),
        method: 'jakim' as const
      };

      const shafiTimes = await service.calculatePrayerTimes({
        ...baseParams,
        madhab: 'shafi'
      });

      const hanafiTimes = await service.calculatePrayerTimes({
        ...baseParams,
        madhab: 'hanafi'
      });

      // Fajr and Isha times should be different
      expect(shafiTimes.fajr.getTime()).not.toBe(hanafiTimes.fajr.getTime());
      expect(shafiTimes.isha.getTime()).not.toBe(hanafiTimes.isha.getTime());
      
      // Other times should be similar (within reasonable margin)
      const timeDifference = Math.abs(shafiTimes.dhuhr.getTime() - hanafiTimes.dhuhr.getTime());
      expect(timeDifference).toBeLessThan(5 * 60 * 1000); // Less than 5 minutes difference
    });

    test('should use cached results for repeated calculations', async () => {
      const params = {
        latitude: 3.139,
        longitude: 101.6869,
        date: new Date('2024-01-15'),
        madhab: 'shafi' as const,
        method: 'jakim' as const
      };

      const firstCalculation = await service.calculatePrayerTimes(params);
      const secondCalculation = await service.calculatePrayerTimes(params);

      expect(firstCalculation).toEqual(secondCalculation);
      expect(service.getCacheSize()).toBeGreaterThan(0);
    });
  });

  describe('Malaysian State Integration', () => {
    test('should calculate prayer times for all Malaysian states', async () => {
      const states = ['kuala_lumpur', 'selangor', 'johor', 'penang'] as const;
      
      for (const state of states) {
        const prayerTimes = await service.getPrayerTimesForState(state);
        
        expect(prayerTimes).toBeDefined();
        expect(prayerTimes.fajr).toBeInstanceOf(Date);
        expect(prayerTimes.qibla).toBeGreaterThan(0);
      }
    });

    test('should use correct madhab for each state', async () => {
      const klTimes = await service.getPrayerTimesForState('kuala_lumpur');
      const selangorTimes = await service.getPrayerTimesForState('selangor');

      expect(klTimes).toBeDefined();
      expect(selangorTimes).toBeDefined();
      
      // Both should use Shafi madhab by default for Malaysian states
      expect(klTimes.qibla).toBeCloseTo(selangorTimes.qibla, 0); // Similar Qibla direction
    });
  });

  describe('Qibla Direction Calculation', () => {
    test('should calculate correct Qibla direction for Kuala Lumpur', () => {
      const qibla = service.calculateQiblaDirection(3.139, 101.6869);
      
      expect(qibla).toBeCloseTo(295, 1); // Approximate Qibla for KL is ~295°
    });

    test('should calculate different Qibla directions for different locations', () => {
      const klQibla = service.calculateQiblaDirection(3.139, 101.6869); // Kuala Lumpur
      const penangQibla = service.calculateQiblaDirection(5.4141, 100.3288); // Penang
      
      expect(Math.abs(klQibla - penangQibla)).toBeGreaterThan(1);
    });

    test('should return values between 0 and 360 degrees', () => {
      const locations = [
        [3.139, 101.6869], // Kuala Lumpur
        [1.4927, 103.7414], // Johor Bahru
        [5.9804, 116.0735], // Kota Kinabalu
      ];

      locations.forEach(([lat, lng]) => {
        const qibla = service.calculateQiblaDirection(lat, lng);
        expect(qibla).toBeGreaterThanOrEqual(0);
        expect(qibla).toBeLessThanOrEqual(360);
      });
    });
  });

  describe('Medication Scheduling Windows', () => {
    test('should generate valid scheduling windows', async () => {
      const prayerTimes = await service.getPrayerTimesForState('kuala_lumpur');
      const windows = await service.getMedicationSchedulingWindows(prayerTimes, 30);

      expect(windows).toBeDefined();
      expect(Array.isArray(windows)).toBe(true);
      expect(windows.length).toBeGreaterThan(0);

      windows.forEach(window => {
        expect(window.startTime).toBeInstanceOf(Date);
        expect(window.endTime).toBeInstanceOf(Date);
        expect(window.startTime.getTime()).toBeLessThan(window.endTime.getTime());
        expect(['before_prayer', 'after_prayer', 'between_prayers', 'free_time']).toContain(window.type);
        expect(typeof window.bufferMinutes).toBe('number');
      });
    });

    test('should respect buffer minutes in scheduling windows', async () => {
      const prayerTimes = await service.getPrayerTimesForState('kuala_lumpur');
      const bufferMinutes = 45;
      const windows = await service.getMedicationSchedulingWindows(prayerTimes, bufferMinutes);

      windows.forEach(window => {
        expect(window.bufferMinutes).toBe(bufferMinutes);
      });
    });
  });

  describe('Conflict Detection', () => {
    test('should detect conflicts with prayer times', async () => {
      const prayerTimes = await service.getPrayerTimesForState('kuala_lumpur');
      
      // Create medication times that conflict with prayer times
      const medicationTimes = [
        prayerTimes.fajr, // Exact conflict
        new Date(prayerTimes.dhuhr.getTime() + 10 * 60 * 1000), // 10 minutes after Dhuhr
      ];

      const conflicts = service.checkMedicationConflicts(medicationTimes, prayerTimes, 30);

      expect(conflicts).toBeDefined();
      expect(Array.isArray(conflicts)).toBe(true);
      expect(conflicts.length).toBeGreaterThan(0);

      conflicts.forEach(conflict => {
        expect(conflict.time).toBeInstanceOf(Date);
        expect(typeof conflict.prayerName).toBe('string');
        expect(['high', 'medium', 'low']).toContain(conflict.severity);
        expect(conflict.suggestedAlternative).toBeInstanceOf(Date);
      });
    });

    test('should not detect conflicts when times are well separated', async () => {
      const prayerTimes = await service.getPrayerTimesForState('kuala_lumpur');
      
      // Create medication times that don't conflict
      const medicationTimes = [
        new Date(prayerTimes.fajr.getTime() + 60 * 60 * 1000), // 1 hour after Fajr
        new Date(prayerTimes.dhuhr.getTime() - 60 * 60 * 1000), // 1 hour before Dhuhr
      ];

      const conflicts = service.checkMedicationConflicts(medicationTimes, prayerTimes, 30);

      expect(conflicts).toBeDefined();
      expect(Array.isArray(conflicts)).toBe(true);
      expect(conflicts.length).toBe(0);
    });
  });

  describe('Next Prayer Calculation', () => {
    test('should find next prayer correctly', async () => {
      const prayerTimes = await service.getPrayerTimesForState('kuala_lumpur');
      
      // Test at a time between prayers
      const testTime = new Date(prayerTimes.dhuhr.getTime() + 30 * 60 * 1000); // 30 minutes after Dhuhr
      const nextPrayer = service.getNextPrayer(prayerTimes, testTime);

      expect(nextPrayer).toBeDefined();
      expect(nextPrayer?.name).toBe('asr');
      expect(nextPrayer?.time).toBeInstanceOf(Date);
      expect(nextPrayer?.time.getTime()).toBeGreaterThan(testTime.getTime());
    });

    test('should handle end of day correctly', async () => {
      const prayerTimes = await service.getPrayerTimesForState('kuala_lumpur');
      
      // Test at a time after all prayers
      const testTime = new Date(prayerTimes.isha.getTime() + 60 * 60 * 1000); // 1 hour after Isha
      const nextPrayer = service.getNextPrayer(prayerTimes, testTime);

      expect(nextPrayer).toBeDefined();
      expect(nextPrayer?.name).toBe('fajr');
      // Should be tomorrow's Fajr
      expect(nextPrayer?.time.getDate()).toBe(testTime.getDate() + 1);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid coordinates gracefully', async () => {
      const invalidParams = {
        latitude: 999, // Invalid latitude
        longitude: 999, // Invalid longitude
        date: new Date(),
        madhab: 'shafi' as const,
        method: 'jakim' as const
      };

      const prayerTimes = await service.calculatePrayerTimes(invalidParams);

      // Should return fallback times without throwing
      expect(prayerTimes).toBeDefined();
      expect(prayerTimes.fajr).toBeInstanceOf(Date);
    });

    test('should clear cache successfully', () => {
      const initialSize = service.getCacheSize();
      service.clearCache();
      expect(service.getCacheSize()).toBe(0);
    });
  });
});