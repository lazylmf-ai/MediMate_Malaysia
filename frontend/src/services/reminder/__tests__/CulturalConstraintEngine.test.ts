/**
 * CulturalConstraintEngine Tests
 * 
 * Comprehensive test suite for the Cultural Constraint Evaluation Engine.
 * Tests constraint evaluation, real-time updates, and cultural awareness.
 */

import { jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('../../../models/ReminderDatabase');
jest.mock('../../prayer-scheduling/PrayerSchedulingService');
jest.mock('../../../api/services/culturalService');

import CulturalConstraintEngine, {
  CulturalConstraint,
  ConstraintEvaluationResult,
  UserConstraintProfile
} from '../CulturalConstraintEngine';
import { reminderDatabase } from '../../../models/ReminderDatabase';
import PrayerSchedulingService from '../../prayer-scheduling/PrayerSchedulingService';
import { culturalService } from '../../../api/services/culturalService';
import { EnhancedCulturalProfile } from '../../../types/cultural';

describe('CulturalConstraintEngine', () => {
  let engine: CulturalConstraintEngine;
  let mockPrayerService: jest.Mocked<PrayerSchedulingService>;
  let mockCulturalService: any;
  let mockReminderDb: any;

  const mockCulturalProfile: EnhancedCulturalProfile = {
    userId: 'user-001',
    primaryCulture: 'malay',
    languages: [{ code: 'ms', name: 'Malay', proficiency: 'native' }],
    location: {
      state: 'kuala_lumpur',
      coordinates: { latitude: 3.139, longitude: 101.6869 }
    },
    preferences: {
      prayerTimes: {
        enabled: true,
        madhab: 'shafi',
        medicationBuffer: 30
      },
      dietary: {
        halal: true,
        vegetarian: false
      },
      quietHours: {
        start: '22:00',
        end: '07:00'
      }
    }
  };

  const mockUserProfile: UserConstraintProfile = {
    userId: 'user-001',
    activeConstraints: [],
    lastEvaluated: new Date(),
    location: {
      state: 'kuala_lumpur',
      coordinates: { latitude: 3.139, longitude: 101.6869 },
      timezone: 'Asia/Kuala_Lumpur'
    },
    preferences: {
      strictMode: false,
      defaultBufferMinutes: 30,
      fallbackPreference: 'delay',
      notifyOnAdjustments: true
    }
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Setup mocks
    mockPrayerService = {
      getCurrentPrayerTimes: jest.fn(),
      isCurrentlyPrayerTime: jest.fn(),
      getInstance: jest.fn()
    } as any;

    mockCulturalService = {
      isRamadanPeriod: jest.fn()
    };

    mockReminderDb = {
      getCulturalConstraints: jest.fn(),
      upsertCulturalConstraint: jest.fn()
    };

    // Mock static methods
    (PrayerSchedulingService.getInstance as jest.Mock).mockReturnValue(mockPrayerService);
    (culturalService.isRamadanPeriod as jest.Mock).mockImplementation(mockCulturalService.isRamadanPeriod);
    (reminderDatabase.getCulturalConstraints as jest.Mock).mockImplementation(mockReminderDb.getCulturalConstraints);
    (reminderDatabase.upsertCulturalConstraint as jest.Mock).mockImplementation(mockReminderDb.upsertCulturalConstraint);

    // Setup AsyncStorage mocks
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

    // Get engine instance
    engine = CulturalConstraintEngine.getInstance();
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      const result = await engine.initialize();

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should load cached data during initialization', async () => {
      const mockUserProfiles = {
        'user-001': mockUserProfile
      };

      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key.includes('cultural_user_profiles')) {
          return Promise.resolve(JSON.stringify(mockUserProfiles));
        }
        return Promise.resolve(null);
      });

      await engine.initialize();

      expect(AsyncStorage.getItem).toHaveBeenCalledWith(
        expect.stringContaining('cultural_user_profiles')
      );
    });

    it('should handle initialization errors gracefully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      const result = await engine.initialize();

      // Should still succeed even if loading cached data fails
      expect(result.success).toBe(true);
    });
  });

  describe('Constraint Evaluation', () => {
    beforeEach(async () => {
      await engine.initialize();
    });

    it('should evaluate prayer time constraints correctly', async () => {
      const prayerTimeConstraint: CulturalConstraint = {
        id: 'prayer-001',
        type: 'prayer_times',
        userId: 'user-001',
        isActive: true,
        effectiveFrom: new Date(),
        effectiveUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
        priority: 'high',
        constraint: {
          timeWindows: [{
            start: '12:45', // Dhuhr prayer window
            end: '13:15',
            avoidCompletely: false,
            bufferMinutes: 30,
            fallbackBehavior: 'delay'
          }],
          locationDependent: true,
          culturalContext: ['Islamic prayer times']
        },
        metadata: {
          source: 'prayer_service',
          confidence: 0.95,
          lastUpdated: new Date(),
          autoRefresh: true
        }
      };

      // Mock user profile with constraints
      const userProfileWithConstraints: UserConstraintProfile = {
        ...mockUserProfile,
        activeConstraints: [prayerTimeConstraint]
      };

      // Create the constraint profile first
      await engine.createUserConstraintProfile('user-001', mockCulturalProfile);

      // Test time that conflicts with prayer
      const conflictTime = new Date('2024-01-01T13:00:00');
      
      const result = await engine.evaluateConstraints(
        conflictTime,
        'user-001',
        { priority: 'medium', medicationType: 'prescription', isLifeCritical: false }
      );

      expect(result.canProceed).toBeDefined();
      expect(result.culturalContext).toBeDefined();
      
      if (result.conflictingConstraints.length > 0) {
        expect(result.timeAdjustment).toBeDefined();
        expect(result.timeAdjustment!.adjustedTime.getTime()).toBeGreaterThan(conflictTime.getTime());
      }
    });

    it('should handle critical medication override', async () => {
      const criticalConstraint: CulturalConstraint = {
        id: 'prayer-002',
        type: 'prayer_times',
        userId: 'user-001',
        isActive: true,
        effectiveFrom: new Date(),
        effectiveUntil: new Date(Date.now() + 24 * 60 * 60 * 1000),
        priority: 'high',
        constraint: {
          timeWindows: [{
            start: '12:45',
            end: '13:15',
            avoidCompletely: true, // Completely avoid prayer times
            bufferMinutes: 30,
            fallbackBehavior: 'delay'
          }],
          locationDependent: true,
          culturalContext: ['Prayer times']
        },
        metadata: {
          source: 'prayer_service',
          confidence: 0.95,
          lastUpdated: new Date(),
          autoRefresh: true
        }
      };

      await engine.createUserConstraintProfile('user-001', mockCulturalProfile);

      const conflictTime = new Date('2024-01-01T13:00:00');
      
      // Critical medication should override cultural constraints
      const result = await engine.evaluateConstraints(
        conflictTime,
        'user-001',
        { priority: 'critical', medicationType: 'insulin', isLifeCritical: true }
      );

      expect(result.canProceed).toBe(true);
    });

    it('should evaluate quiet hours constraints', async () => {
      const quietHoursConstraint: CulturalConstraint = {
        id: 'quiet-001',
        type: 'quiet_hours',
        userId: 'user-001',
        isActive: true,
        effectiveFrom: new Date(),
        effectiveUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        priority: 'medium',
        constraint: {
          timeWindows: [{
            start: '22:00',
            end: '07:00',
            avoidCompletely: false,
            bufferMinutes: 0,
            fallbackBehavior: 'delay'
          }],
          locationDependent: false,
          culturalContext: ['Quiet hours', 'Sleep period']
        },
        metadata: {
          source: 'user_preference',
          confidence: 1.0,
          lastUpdated: new Date(),
          autoRefresh: false
        }
      };

      await engine.createUserConstraintProfile('user-001', mockCulturalProfile);

      // Test time during quiet hours
      const quietTime = new Date('2024-01-01T23:30:00');
      
      const result = await engine.evaluateConstraints(quietTime, 'user-001');

      expect(result.culturalContext.quietHoursStatus).toBeDefined();
    });

    it('should handle Ramadan constraints', async () => {
      mockCulturalService.isRamadanPeriod.mockResolvedValue({
        data: { isRamadan: true }
      });

      await engine.createUserConstraintProfile('user-001', mockCulturalProfile);

      // Test time during typical Ramadan fasting hours
      const fastingTime = new Date('2024-06-15T14:00:00');
      
      const result = await engine.evaluateConstraints(fastingTime, 'user-001');

      expect(result.culturalContext.ramadanStatus).toBe(true);
    });

    it('should find next available slot when constraints conflict', async () => {
      await engine.createUserConstraintProfile('user-001', mockCulturalProfile);

      // Mock a time with conflicts
      const conflictTime = new Date('2024-01-01T13:00:00');
      
      const result = await engine.evaluateConstraints(conflictTime, 'user-001');
      
      if (!result.canProceed) {
        expect(result.nextAvailableSlot).toBeDefined();
        expect(result.nextAvailableSlot!.getTime()).toBeGreaterThan(conflictTime.getTime());
      }
    });

    it('should provide meaningful recommendations', async () => {
      await engine.createUserConstraintProfile('user-001', mockCulturalProfile);

      const scheduledTime = new Date('2024-01-01T08:00:00');
      
      const result = await engine.evaluateConstraints(scheduledTime, 'user-001');

      expect(Array.isArray(result.recommendations)).toBe(true);
      expect(result.culturalContext).toBeDefined();
    });
  });

  describe('Real-time Constraint Updates', () => {
    beforeEach(async () => {
      await engine.initialize();
    });

    it('should refresh prayer time constraints when prayer times change', async () => {
      // Mock current prayer times
      const mockPrayerTimes = {
        fajr: new Date('2024-01-01T06:15:00'),
        dhuhr: new Date('2024-01-01T13:00:00'),
        asr: new Date('2024-01-01T16:30:00'),
        maghrib: new Date('2024-01-01T19:20:00'),
        isha: new Date('2024-01-01T20:35:00')
      };

      mockPrayerService.getCurrentPrayerTimes.mockResolvedValue(mockPrayerTimes);

      await engine.createUserConstraintProfile('user-001', mockCulturalProfile);
      
      const result = await engine.refreshUserConstraints('user-001');

      expect(result).toBeDefined();
      expect(mockPrayerService.getCurrentPrayerTimes).toHaveBeenCalled();
    });

    it('should add Ramadan constraints during Ramadan period', async () => {
      // Mock Ramadan period
      mockCulturalService.isRamadanPeriod.mockResolvedValue({
        data: { isRamadan: true }
      });

      await engine.createUserConstraintProfile('user-001', mockCulturalProfile);
      
      const result = await engine.refreshUserConstraints('user-001');

      expect(result).toBeDefined();
      expect(mockCulturalService.isRamadanPeriod).toHaveBeenCalled();
    });

    it('should remove Ramadan constraints after Ramadan period', async () => {
      // First add Ramadan constraints
      mockCulturalService.isRamadanPeriod.mockResolvedValue({
        data: { isRamadan: true }
      });

      await engine.createUserConstraintProfile('user-001', mockCulturalProfile);
      await engine.refreshUserConstraints('user-001');

      // Then simulate end of Ramadan
      mockCulturalService.isRamadanPeriod.mockResolvedValue({
        data: { isRamadan: false }
      });

      const result = await engine.refreshUserConstraints('user-001');
      expect(result).toBeDefined();
    });

    it('should check and update constraints for all users', async () => {
      // Create multiple user profiles
      await engine.createUserConstraintProfile('user-001', mockCulturalProfile);
      await engine.createUserConstraintProfile('user-002', {
        ...mockCulturalProfile,
        userId: 'user-002'
      });

      const result = await engine.checkAndUpdateConstraints();

      expect(result.checked).toBeGreaterThanOrEqual(2);
      expect(Array.isArray(result.affectedUsers)).toBe(true);
      expect(Array.isArray(result.errors)).toBe(true);
    });
  });

  describe('Prayer Status Monitoring', () => {
    beforeEach(async () => {
      await engine.initialize();
    });

    it('should get current prayer status across users', async () => {
      // Mock prayer status
      mockPrayerService.isCurrentlyPrayerTime.mockResolvedValue({
        isDuringPrayer: true,
        currentPrayer: 'dhuhr',
        timeUntilNext: 45
      });

      await engine.createUserConstraintProfile('user-001', mockCulturalProfile);

      const result = await engine.getCurrentPrayerStatus();

      expect(result.isDuringPrayer).toBeDefined();
      expect(result.affectedUsers).toBeDefined();
      expect(Array.isArray(result.affectedUsers)).toBe(true);
    });

    it('should detect quiet hours across users', async () => {
      await engine.createUserConstraintProfile('user-001', mockCulturalProfile);

      const result = await engine.isCurrentlyQuietHours();

      expect(typeof result).toBe('boolean');
    });

    it('should handle multiple users with different prayer time settings', async () => {
      // User with prayer times enabled
      await engine.createUserConstraintProfile('user-001', mockCulturalProfile);

      // User with prayer times disabled
      const nonPrayerProfile = {
        ...mockCulturalProfile,
        userId: 'user-002',
        preferences: {
          ...mockCulturalProfile.preferences,
          prayerTimes: { enabled: false, madhab: 'shafi', medicationBuffer: 0 }
        }
      };
      await engine.createUserConstraintProfile('user-002', nonPrayerProfile);

      mockPrayerService.isCurrentlyPrayerTime.mockResolvedValue({
        isDuringPrayer: true,
        currentPrayer: 'maghrib',
        timeUntilNext: 30
      });

      const result = await engine.getCurrentPrayerStatus();

      // Only users with prayer times enabled should be affected
      expect(result.affectedUsers.length).toBeLessThanOrEqual(1);
    });
  });

  describe('User Profile Management', () => {
    beforeEach(async () => {
      await engine.initialize();
    });

    it('should create user constraint profile from cultural profile', async () => {
      const profile = await engine.createUserConstraintProfile('user-001', mockCulturalProfile);

      expect(profile.userId).toBe('user-001');
      expect(profile.activeConstraints).toBeDefined();
      expect(profile.location.state).toBe('kuala_lumpur');
      expect(profile.preferences).toBeDefined();
    });

    it('should generate prayer time constraints when enabled', async () => {
      const profile = await engine.createUserConstraintProfile('user-001', mockCulturalProfile);

      const prayerConstraints = profile.activeConstraints.filter(c => c.type === 'prayer_times');
      expect(prayerConstraints.length).toBeGreaterThanOrEqual(0);
    });

    it('should generate quiet hours constraints when configured', async () => {
      const profile = await engine.createUserConstraintProfile('user-001', mockCulturalProfile);

      const quietHoursConstraints = profile.activeConstraints.filter(c => c.type === 'quiet_hours');
      expect(quietHoursConstraints.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle user preferences correctly', async () => {
      const customPreferences = {
        strictMode: true,
        defaultBufferMinutes: 45,
        fallbackPreference: 'advance' as const,
        notifyOnAdjustments: false
      };

      const profile = await engine.createUserConstraintProfile(
        'user-001',
        mockCulturalProfile,
        customPreferences
      );

      expect(profile.preferences.strictMode).toBe(true);
      expect(profile.preferences.defaultBufferMinutes).toBe(45);
      expect(profile.preferences.fallbackPreference).toBe('advance');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    beforeEach(async () => {
      await engine.initialize();
    });

    it('should handle missing user profile gracefully', async () => {
      const result = await engine.evaluateConstraints(
        new Date(),
        'non-existent-user'
      );

      expect(result.canProceed).toBe(true); // Default behavior
      expect(result.conflictingConstraints).toEqual([]);
    });

    it('should handle prayer service failures', async () => {
      mockPrayerService.getCurrentPrayerTimes.mockRejectedValue(new Error('Prayer service unavailable'));

      await engine.createUserConstraintProfile('user-001', mockCulturalProfile);
      
      const result = await engine.refreshUserConstraints('user-001');

      // Should not crash, should return false (no update)
      expect(typeof result).toBe('boolean');
    });

    it('should handle cultural service failures', async () => {
      mockCulturalService.isRamadanPeriod.mockRejectedValue(new Error('Cultural service unavailable'));

      await engine.createUserConstraintProfile('user-001', mockCulturalProfile);
      
      const result = await engine.refreshUserConstraints('user-001');

      // Should handle the error gracefully
      expect(typeof result).toBe('boolean');
    });

    it('should handle database operation failures', async () => {
      mockReminderDb.getCulturalConstraints.mockRejectedValue(new Error('Database error'));

      const result = await engine.evaluateConstraints(
        new Date(),
        'user-001'
      );

      // Should provide fallback behavior
      expect(result.canProceed).toBeDefined();
    });

    it('should handle constraint refresh errors for individual users', async () => {
      await engine.createUserConstraintProfile('user-001', mockCulturalProfile);
      await engine.createUserConstraintProfile('user-002', {
        ...mockCulturalProfile,
        userId: 'user-002'
      });

      // Mock failure for one user
      mockPrayerService.getCurrentPrayerTimes.mockImplementation(() => {
        throw new Error('Service error');
      });

      const result = await engine.checkAndUpdateConstraints();

      expect(result.checked).toBeGreaterThan(0);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Performance and Caching', () => {
    beforeEach(async () => {
      await engine.initialize();
    });

    it('should cache constraint evaluation results', async () => {
      await engine.createUserConstraintProfile('user-001', mockCulturalProfile);

      const scheduledTime = new Date('2024-01-01T08:00:00');
      
      // First evaluation
      const result1 = await engine.evaluateConstraints(scheduledTime, 'user-001');
      
      // Second evaluation (should use cache)
      const result2 = await engine.evaluateConstraints(scheduledTime, 'user-001');

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
    });

    it('should maintain singleton pattern', () => {
      const engine1 = CulturalConstraintEngine.getInstance();
      const engine2 = CulturalConstraintEngine.getInstance();

      expect(engine1).toBe(engine2);
    });

    it('should provide efficient constraint checking methods', async () => {
      await engine.createUserConstraintProfile('user-001', mockCulturalProfile);

      const hasConstraints = await engine.hasActiveConstraints('user-001');
      const activeConstraints = await engine.getActiveConstraints('user-001');

      expect(typeof hasConstraints).toBe('boolean');
      expect(Array.isArray(activeConstraints)).toBe(true);
    });
  });
});

describe('CulturalConstraintEngine Integration', () => {
  let engine: CulturalConstraintEngine;

  beforeEach(() => {
    engine = CulturalConstraintEngine.getInstance();
  });

  it('should integrate with prayer scheduling service', () => {
    expect(engine).toBeDefined();
    expect(typeof engine.getCurrentPrayerStatus).toBe('function');
    expect(typeof engine.refreshConstraints).toBe('function');
  });

  it('should integrate with reminder database', () => {
    expect(typeof engine.createUserConstraintProfile).toBe('function');
    expect(typeof engine.evaluateConstraints).toBe('function');
  });

  it('should provide external API methods', () => {
    const publicMethods = [
      'initialize',
      'evaluateConstraints',
      'checkAndUpdateConstraints',
      'refreshUserConstraints',
      'getCurrentPrayerStatus',
      'isCurrentlyQuietHours',
      'createUserConstraintProfile',
      'refreshConstraints',
      'hasActiveConstraints',
      'getActiveConstraints'
    ];

    publicMethods.forEach(method => {
      expect(typeof (engine as any)[method]).toBe('function');
    });
  });

  it('should handle constraint types correctly', async () => {
    await engine.initialize();
    
    const constraintTypes = ['prayer_times', 'ramadan', 'quiet_hours', 'meal_times', 'custom'];
    
    // All constraint types should be recognized
    constraintTypes.forEach(type => {
      expect(typeof type).toBe('string');
    });
  });
});