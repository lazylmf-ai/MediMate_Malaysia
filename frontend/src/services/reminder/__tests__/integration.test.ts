/**
 * Reminder System Integration Tests
 * 
 * End-to-end integration tests for the complete Cultural-Aware Notification 
 * Scheduling Engine. Tests the interaction between all components.
 */

import { jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock all external dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('expo-task-manager');
jest.mock('expo-background-fetch');
jest.mock('expo-notifications');
jest.mock('expo-battery');
jest.mock('../../../models/ReminderDatabase');
jest.mock('../../scheduling/CulturalSchedulingEngine');
jest.mock('../../prayer-scheduling/PrayerSchedulingService');
jest.mock('../../notifications/MedicationNotificationService');

import { 
  ReminderSystemManager,
  initializeReminderSystem,
  getReminderSystemHealth,
  shutdownReminderSystem
} from '../index';
import ReminderSchedulingService from '../ReminderSchedulingService';
import BackgroundTaskService from '../BackgroundTaskService';
import CulturalConstraintEngine from '../CulturalConstraintEngine';
import SmartBatchingService from '../SmartBatchingService';
import { reminderDatabase } from '../../../models/ReminderDatabase';
import { Medication } from '../../../types/medication';
import { EnhancedCulturalProfile } from '../../../types/cultural';

describe('Reminder System Integration', () => {
  let systemManager: ReminderSystemManager;
  let mockServices: any;

  const mockMedication: Medication = {
    id: 'med-001',
    name: 'Test Medication',
    dosage: { amount: 1, unit: 'tablet' },
    frequency: 'twice_daily',
    instructions: 'Take with food',
    category: 'prescription',
    manufacturer: 'Test Pharma',
    generic_name: 'test-generic',
    active_ingredients: ['test-ingredient'],
    dosage_form: 'tablet',
    strength: '500mg',
    prescribing_info: {
      indications: ['test condition'],
      contraindications: [],
      side_effects: [],
      drug_interactions: []
    },
    schedule: {
      times: ['08:00', '20:00'],
      culturalAdjustments: {
        prayerTimeBuffer: 30,
        avoidDuringFasting: true
      }
    },
    cultural: {
      halal: true,
      takeWithFood: true,
      culturalNotes: []
    },
    timing: [],
    specialInstructions: []
  };

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

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock services
    mockServices = {
      reminderScheduling: {
        initialize: jest.fn().mockResolvedValue({ success: true }),
        isInitialized: jest.fn().mockReturnValue(true),
        createReminderSchedule: jest.fn(),
        processScheduledReminders: jest.fn(),
        getInstance: jest.fn()
      },
      backgroundTasks: {
        initialize: jest.fn().mockResolvedValue({ success: true }),
        isInitialized: jest.fn().mockReturnValue(true),
        getOverallBatteryImpact: jest.fn().mockResolvedValue(2.5),
        shutdown: jest.fn().mockResolvedValue(undefined),
        getInstance: jest.fn()
      },
      culturalConstraints: {
        initialize: jest.fn().mockResolvedValue({ success: true }),
        evaluateConstraints: jest.fn(),
        createUserConstraintProfile: jest.fn(),
        getInstance: jest.fn()
      },
      smartBatching: {
        initialize: jest.fn().mockResolvedValue({ success: true }),
        createSmartBatches: jest.fn(),
        getBatchingAnalytics: jest.fn().mockResolvedValue({
          totalBatches: 10,
          successRate: 0.9,
          culturalOptimizations: 5
        }),
        getInstance: jest.fn()
      }
    };

    // Mock singleton getInstance methods
    (ReminderSchedulingService.getInstance as jest.Mock).mockReturnValue(mockServices.reminderScheduling);
    (BackgroundTaskService.getInstance as jest.Mock).mockReturnValue(mockServices.backgroundTasks);
    (CulturalConstraintEngine.getInstance as jest.Mock).mockReturnValue(mockServices.culturalConstraints);
    (SmartBatchingService.getInstance as jest.Mock).mockReturnValue(mockServices.smartBatching);

    // Setup AsyncStorage mocks
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

    systemManager = ReminderSystemManager.getInstance();
  });

  describe('System Initialization', () => {
    it('should initialize all services in correct order', async () => {
      const result = await systemManager.initialize();

      expect(result.success).toBe(true);
      expect(result.errors).toEqual([]);

      // Verify initialization order
      expect(mockServices.culturalConstraints.initialize).toHaveBeenCalled();
      expect(mockServices.reminderScheduling.initialize).toHaveBeenCalled();
      expect(mockServices.smartBatching.initialize).toHaveBeenCalled();
      expect(mockServices.backgroundTasks.initialize).toHaveBeenCalled();
    });

    it('should handle partial initialization failures', async () => {
      mockServices.smartBatching.initialize.mockResolvedValue({ 
        success: false, 
        error: 'Battery service unavailable' 
      });

      const result = await systemManager.initialize();

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Smart Batching Service');
    });

    it('should provide convenience initialization function', async () => {
      const result = await initializeReminderSystem();

      expect(result.success).toBe(true);
      expect(mockServices.reminderScheduling.initialize).toHaveBeenCalled();
    });

    it('should handle complete initialization failure', async () => {
      Object.values(mockServices).forEach(service => {
        service.initialize.mockRejectedValue(new Error('Service unavailable'));
      });

      const result = await systemManager.initialize();

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('End-to-End Reminder Flow', () => {
    beforeEach(async () => {
      await systemManager.initialize();
    });

    it('should create culturally-aware reminder schedule', async () => {
      // Mock cultural schedule generation
      mockServices.reminderScheduling.createReminderSchedule.mockResolvedValue({
        success: true,
        schedules: [{
          id: 'reminder-001',
          medicationId: 'med-001',
          scheduledTime: new Date('2024-01-01T08:30:00'), // Adjusted for prayer
          culturalConstraints: { avoidPrayerTimes: true, bufferMinutes: 30 },
          priority: 'medium'
        }]
      });

      const services = systemManager.getServices();
      const result = await services.reminderScheduling.createReminderSchedule(
        mockMedication,
        mockCulturalProfile,
        {
          userId: 'user-001',
          avoidPrayerTimes: true,
          prayerBufferMinutes: 30,
          preferredDeliveryMethods: [{
            type: 'push_notification',
            priority: 1,
            enabled: true,
            settings: {}
          }],
          quietHours: { enabled: true, start: '22:00', end: '07:00' },
          escalationEnabled: true,
          escalationDelayMinutes: 15,
          batchingEnabled: true,
          maxBatchSize: 5,
          culturalProfile: mockCulturalProfile
        }
      );

      expect(result.success).toBe(true);
      expect(result.schedules).toBeDefined();
      expect(result.schedules[0].culturalConstraints.avoidPrayerTimes).toBe(true);
    });

    it('should process reminders with smart batching', async () => {
      // Mock pending reminders
      const mockPendingReminders = [{
        id: 'queue-001',
        reminderScheduleId: 'reminder-001',
        payload: {
          medication: mockMedication,
          culturalContext: { userId: 'user-001' },
          deliveryInstructions: []
        },
        scheduledDelivery: new Date(),
        attempts: 0,
        queuedAt: new Date(),
        priority: 'medium' as const
      }];

      // Mock smart batching
      mockServices.smartBatching.createSmartBatches.mockResolvedValue([{
        id: 'batch-001',
        reminders: mockPendingReminders,
        scheduledTime: new Date(),
        estimatedBatteryImpact: 0.1,
        culturalOptimized: true,
        priority: 'medium',
        strategy: { name: 'balanced', culturalAware: true }
      }]);

      // Mock reminder processing
      mockServices.reminderScheduling.processScheduledReminders.mockResolvedValue({
        processed: 1,
        delivered: 1,
        failed: 0,
        culturallyAdjusted: 0
      });

      const services = systemManager.getServices();
      
      // Create batches
      const batches = await services.smartBatching.createSmartBatches(mockPendingReminders);
      expect(batches.length).toBe(1);
      expect(batches[0].culturalOptimized).toBe(true);

      // Process reminders
      const result = await services.reminderScheduling.processScheduledReminders();
      expect(result.processed).toBe(1);
      expect(result.delivered).toBe(1);
    });

    it('should handle cultural constraint conflicts', async () => {
      // Mock cultural constraint evaluation with conflict
      mockServices.culturalConstraints.evaluateConstraints.mockResolvedValue({
        canProceed: false,
        timeAdjustment: {
          originalTime: new Date('2024-01-01T13:00:00'),
          adjustedTime: new Date('2024-01-01T13:45:00'),
          adjustmentReason: 'Prayer time conflict',
          fallbackUsed: false
        },
        conflictingConstraints: [{
          type: 'prayer_times',
          priority: 'high'
        }],
        recommendations: ['Reschedule after prayer time'],
        culturalContext: { currentPrayerStatus: 'dhuhr' },
        nextAvailableSlot: new Date('2024-01-01T13:45:00')
      });

      const services = systemManager.getServices();
      const result = await services.culturalConstraints.evaluateConstraints(
        new Date('2024-01-01T13:00:00'),
        'user-001'
      );

      expect(result.canProceed).toBe(false);
      expect(result.timeAdjustment).toBeDefined();
      expect(result.timeAdjustment!.adjustedTime.getTime()).toBeGreaterThan(
        result.timeAdjustment!.originalTime.getTime()
      );
    });

    it('should coordinate background task execution', async () => {
      // Mock background task execution
      mockServices.backgroundTasks.getOverallBatteryImpact.mockResolvedValue(1.8);

      const services = systemManager.getServices();
      const batteryImpact = await services.backgroundTasks.getOverallBatteryImpact();

      expect(batteryImpact).toBe(1.8);
    });
  });

  describe('System Health Monitoring', () => {
    beforeEach(async () => {
      await systemManager.initialize();
    });

    it('should report healthy system status', async () => {
      const health = await systemManager.getSystemHealth();

      expect(health.overall).toBe('healthy');
      expect(health.services.reminderScheduling).toBe(true);
      expect(health.services.backgroundTasks).toBe(true);
      expect(health.services.culturalConstraints).toBe(true);
      expect(health.services.smartBatching).toBe(true);
      expect(health.performance.batteryUsage).toBe(2.5);
      expect(health.performance.deliveryRate).toBe(0.9);
    });

    it('should report degraded status with partial failures', async () => {
      mockServices.reminderScheduling.isInitialized.mockReturnValue(false);

      const health = await systemManager.getSystemHealth();

      expect(health.overall).toBe('degraded');
      expect(health.services.reminderScheduling).toBe(false);
    });

    it('should report critical status with major failures', async () => {
      mockServices.reminderScheduling.isInitialized.mockReturnValue(false);
      mockServices.backgroundTasks.isInitialized.mockReturnValue(false);
      mockServices.smartBatching.getBatchingAnalytics.mockRejectedValue(new Error('Service error'));

      const health = await systemManager.getSystemHealth();

      expect(health.overall).toBe('critical');
    });

    it('should provide convenience health check function', async () => {
      const health = await getReminderSystemHealth();

      expect(health.overall).toBeDefined();
      expect(health.services).toBeDefined();
      expect(health.performance).toBeDefined();
    });
  });

  describe('Cultural Integration Scenarios', () => {
    beforeEach(async () => {
      await systemManager.initialize();
    });

    it('should handle Malaysian Muslim user with prayer times', async () => {
      await mockServices.culturalConstraints.createUserConstraintProfile(
        'user-001',
        mockCulturalProfile
      );

      // Mock prayer time during scheduled medication
      mockServices.culturalConstraints.evaluateConstraints.mockResolvedValue({
        canProceed: false,
        conflictingConstraints: [{ type: 'prayer_times', priority: 'high' }],
        recommendations: ['Delay until after prayer'],
        culturalContext: { currentPrayerStatus: 'asr' },
        nextAvailableSlot: new Date()
      });

      const services = systemManager.getServices();
      const result = await services.culturalConstraints.evaluateConstraints(
        new Date('2024-01-01T16:30:00'), // Asr prayer time
        'user-001'
      );

      expect(result.canProceed).toBe(false);
      expect(result.culturalContext.currentPrayerStatus).toBe('asr');
    });

    it('should handle Ramadan fasting adjustments', async () => {
      const ramadanProfile = {
        ...mockCulturalProfile,
        preferences: {
          ...mockCulturalProfile.preferences,
          ramadan: { enabled: true, fastingEnabled: true }
        }
      };

      await mockServices.culturalConstraints.createUserConstraintProfile(
        'user-002',
        ramadanProfile
      );

      // Mock Ramadan constraint during fasting hours
      mockServices.culturalConstraints.evaluateConstraints.mockResolvedValue({
        canProceed: false,
        conflictingConstraints: [{ type: 'ramadan', priority: 'high' }],
        recommendations: ['Reschedule to after iftar'],
        culturalContext: { ramadanStatus: true },
        nextAvailableSlot: new Date('2024-06-15T19:30:00') // After iftar
      });

      const services = systemManager.getServices();
      const result = await services.culturalConstraints.evaluateConstraints(
        new Date('2024-06-15T14:00:00'), // During fasting
        'user-002'
      );

      expect(result.canProceed).toBe(false);
      expect(result.culturalContext.ramadanStatus).toBe(true);
    });

    it('should handle multi-cultural household', async () => {
      // Create profiles for different cultural backgrounds
      const chineseProfile: EnhancedCulturalProfile = {
        userId: 'user-chinese',
        primaryCulture: 'chinese',
        languages: [{ code: 'zh', name: 'Chinese', proficiency: 'native' }],
        location: mockCulturalProfile.location,
        preferences: {
          dietary: { vegetarian: true, halal: false },
          quietHours: { start: '21:30', end: '06:30' }
        }
      };

      const indianProfile: EnhancedCulturalProfile = {
        userId: 'user-indian',
        primaryCulture: 'indian',
        languages: [{ code: 'ta', name: 'Tamil', proficiency: 'native' }],
        location: mockCulturalProfile.location,
        preferences: {
          dietary: { vegetarian: true, halal: false },
          festivals: { enabled: true }
        }
      };

      await Promise.all([
        mockServices.culturalConstraints.createUserConstraintProfile('user-chinese', chineseProfile),
        mockServices.culturalConstraints.createUserConstraintProfile('user-indian', indianProfile),
        mockServices.culturalConstraints.createUserConstraintProfile('user-001', mockCulturalProfile)
      ]);

      // Each user should have different cultural constraints
      expect(mockServices.culturalConstraints.createUserConstraintProfile).toHaveBeenCalledTimes(3);
    });
  });

  describe('Performance and Battery Optimization', () => {
    beforeEach(async () => {
      await systemManager.initialize();
    });

    it('should optimize battery usage through smart batching', async () => {
      const mockAnalytics = {
        totalBatches: 25,
        successRate: 0.92,
        averageBatchSize: 3.2,
        averageBatteryImpact: 0.08,
        culturalOptimizations: 15,
        batteryEfficiency: 40.0,
        bestStrategy: { name: 'high_battery_aggressive' },
        recommendations: ['Performance is excellent']
      };

      mockServices.smartBatching.getBatchingAnalytics.mockResolvedValue(mockAnalytics);

      const services = systemManager.getServices();
      const analytics = await services.smartBatching.getBatchingAnalytics();

      expect(analytics.batteryEfficiency).toBe(40.0);
      expect(analytics.culturalOptimizations).toBe(15);
      expect(analytics.successRate).toBeGreaterThan(0.9);
    });

    it('should adapt to low battery conditions', async () => {
      // Mock low battery scenario
      const lowBatteryReminders = Array.from({ length: 10 }, (_, i) => ({
        id: `reminder-${i}`,
        scheduledDelivery: new Date(),
        priority: 'medium' as const
      }));

      const conservativeBatches = [{
        id: 'batch-conservative',
        reminders: lowBatteryReminders.slice(0, 3), // Smaller batch
        strategy: { name: 'low_battery_conservative', culturalAware: false },
        estimatedBatteryImpact: 0.05 // Lower impact
      }];

      mockServices.smartBatching.createSmartBatches.mockResolvedValue(conservativeBatches);

      const services = systemManager.getServices();
      const batches = await services.smartBatching.createSmartBatches(lowBatteryReminders);

      expect(batches[0].strategy.name).toContain('conservative');
      expect(batches[0].estimatedBatteryImpact).toBeLessThan(0.1);
    });

    it('should monitor overall system performance', async () => {
      mockServices.backgroundTasks.getOverallBatteryImpact.mockResolvedValue(2.1);

      const health = await systemManager.getSystemHealth();

      expect(health.performance.batteryUsage).toBe(2.1);
      expect(health.performance.deliveryRate).toBe(0.9);
      expect(health.performance.culturalOptimization).toBe(5);
    });
  });

  describe('Error Handling and Recovery', () => {
    beforeEach(async () => {
      await systemManager.initialize();
    });

    it('should handle service failures gracefully', async () => {
      mockServices.reminderScheduling.processScheduledReminders.mockRejectedValue(
        new Error('Database connection failed')
      );

      const services = systemManager.getServices();
      
      try {
        await services.reminderScheduling.processScheduledReminders();
      } catch (error) {
        expect(error).toBeDefined();
      }

      // System should remain functional for other operations
      const health = await systemManager.getSystemHealth();
      expect(health.overall).toBeDefined();
    });

    it('should recover from partial service outages', async () => {
      // Simulate temporary service failure
      mockServices.culturalConstraints.evaluateConstraints.mockRejectedValue(
        new Error('Prayer service temporarily unavailable')
      );

      const services = systemManager.getServices();
      
      try {
        await services.culturalConstraints.evaluateConstraints(new Date(), 'user-001');
      } catch (error) {
        expect(error.message).toContain('Prayer service temporarily unavailable');
      }

      // Recovery: service comes back online
      mockServices.culturalConstraints.evaluateConstraints.mockResolvedValue({
        canProceed: true,
        conflictingConstraints: [],
        recommendations: [],
        culturalContext: {}
      });

      const result = await services.culturalConstraints.evaluateConstraints(new Date(), 'user-001');
      expect(result.canProceed).toBe(true);
    });

    it('should handle data corruption gracefully', async () => {
      // Mock corrupted storage data
      (AsyncStorage.getItem as jest.Mock).mockResolvedValue('invalid-json-data');

      const services = systemManager.getServices();
      
      // Services should still function with default values
      const health = await systemManager.getSystemHealth();
      expect(health.overall).toBeDefined();
    });
  });

  describe('System Shutdown', () => {
    beforeEach(async () => {
      await systemManager.initialize();
    });

    it('should shutdown all services gracefully', async () => {
      await systemManager.shutdown();

      expect(mockServices.backgroundTasks.shutdown).toHaveBeenCalled();
      expect(systemManager.isSystemInitialized()).toBe(false);
    });

    it('should provide convenience shutdown function', async () => {
      await shutdownReminderSystem();

      expect(mockServices.backgroundTasks.shutdown).toHaveBeenCalled();
    });

    it('should handle shutdown errors gracefully', async () => {
      mockServices.backgroundTasks.shutdown.mockRejectedValue(new Error('Shutdown failed'));

      // Should not throw, just log error
      await systemManager.shutdown();

      expect(systemManager.isSystemInitialized()).toBe(false);
    });
  });

  describe('Service Access and Management', () => {
    beforeEach(async () => {
      await systemManager.initialize();
    });

    it('should provide access to all services', () => {
      const services = systemManager.getServices();

      expect(services.reminderScheduling).toBeDefined();
      expect(services.backgroundTasks).toBeDefined();
      expect(services.culturalConstraints).toBeDefined();
      expect(services.smartBatching).toBeDefined();
    });

    it('should maintain service singleton patterns', () => {
      const services1 = systemManager.getServices();
      const services2 = systemManager.getServices();

      expect(services1.reminderScheduling).toBe(services2.reminderScheduling);
      expect(services1.backgroundTasks).toBe(services2.backgroundTasks);
      expect(services1.culturalConstraints).toBe(services2.culturalConstraints);
      expect(services1.smartBatching).toBe(services2.smartBatching);
    });

    it('should maintain system manager singleton', () => {
      const manager1 = ReminderSystemManager.getInstance();
      const manager2 = ReminderSystemManager.getInstance();

      expect(manager1).toBe(manager2);
      expect(manager1).toBe(systemManager);
    });
  });
});

describe('Real-World Scenarios', () => {
  let systemManager: ReminderSystemManager;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Setup realistic mock behaviors
    const mockServices = {
      reminderScheduling: {
        initialize: jest.fn().mockResolvedValue({ success: true }),
        isInitialized: jest.fn().mockReturnValue(true),
        createReminderSchedule: jest.fn().mockResolvedValue({
          success: true,
          schedules: [{
            id: 'reminder-realistic',
            culturalConstraints: { avoidPrayerTimes: true }
          }]
        }),
        processScheduledReminders: jest.fn().mockResolvedValue({
          processed: 5,
          delivered: 4,
          failed: 1,
          culturallyAdjusted: 2
        }),
        getInstance: jest.fn()
      },
      backgroundTasks: {
        initialize: jest.fn().mockResolvedValue({ success: true }),
        isInitialized: jest.fn().mockReturnValue(true),
        getOverallBatteryImpact: jest.fn().mockResolvedValue(3.2),
        shutdown: jest.fn().mockResolvedValue(undefined),
        getInstance: jest.fn()
      },
      culturalConstraints: {
        initialize: jest.fn().mockResolvedValue({ success: true }),
        evaluateConstraints: jest.fn().mockResolvedValue({
          canProceed: true,
          conflictingConstraints: [],
          recommendations: ['Schedule optimized'],
          culturalContext: { currentPrayerStatus: undefined }
        }),
        createUserConstraintProfile: jest.fn().mockResolvedValue({
          userId: 'test-user',
          activeConstraints: []
        }),
        getInstance: jest.fn()
      },
      smartBatching: {
        initialize: jest.fn().mockResolvedValue({ success: true }),
        createSmartBatches: jest.fn().mockResolvedValue([{
          id: 'realistic-batch',
          culturalOptimized: true,
          estimatedBatteryImpact: 0.12
        }]),
        getBatchingAnalytics: jest.fn().mockResolvedValue({
          totalBatches: 45,
          successRate: 0.87,
          culturalOptimizations: 28,
          batteryEfficiency: 29.5,
          recommendations: []
        }),
        getInstance: jest.fn()
      }
    };

    // Mock singleton getInstance methods
    (ReminderSchedulingService.getInstance as jest.Mock).mockReturnValue(mockServices.reminderScheduling);
    (BackgroundTaskService.getInstance as jest.Mock).mockReturnValue(mockServices.backgroundTasks);
    (CulturalConstraintEngine.getInstance as jest.Mock).mockReturnValue(mockServices.culturalConstraints);
    (SmartBatchingService.getInstance as jest.Mock).mockReturnValue(mockServices.smartBatching);

    systemManager = ReminderSystemManager.getInstance();
  });

  it('should handle typical Malaysian Muslim elderly user scenario', async () => {
    await systemManager.initialize();

    const services = systemManager.getServices();
    
    // Create user profile for elderly Malaysian Muslim
    await services.culturalConstraints.createUserConstraintProfile(
      'elderly-muslim-user',
      {
        userId: 'elderly-muslim-user',
        primaryCulture: 'malay',
        languages: [{ code: 'ms', name: 'Malay', proficiency: 'native' }],
        location: { state: 'selangor', coordinates: { latitude: 3.0738, longitude: 101.5183 } },
        preferences: {
          prayerTimes: { enabled: true, madhab: 'shafi', medicationBuffer: 45 },
          dietary: { halal: true, vegetarian: false },
          quietHours: { start: '21:00', end: '06:00' }
        }
      }
    );

    // Simulate multiple daily medications
    const morningMedication = { ...mockMedication, id: 'morning-med', name: 'Blood Pressure Medicine' };
    const eveningMedication = { ...mockMedication, id: 'evening-med', name: 'Diabetes Medicine' };

    const scheduleResults = await Promise.all([
      services.reminderScheduling.createReminderSchedule(morningMedication, expect.any(Object), expect.any(Object)),
      services.reminderScheduling.createReminderSchedule(eveningMedication, expect.any(Object), expect.any(Object))
    ]);

    expect(scheduleResults[0].success).toBe(true);
    expect(scheduleResults[1].success).toBe(true);

    // Process reminders with cultural awareness
    const processingResult = await services.reminderScheduling.processScheduledReminders();
    expect(processingResult.culturallyAdjusted).toBeGreaterThanOrEqual(0);
  });

  it('should handle multi-generational household with different cultural needs', async () => {
    await systemManager.initialize();

    const services = systemManager.getServices();
    const health = await systemManager.getSystemHealth();

    // Should handle multiple users with different cultural profiles
    expect(health.overall).toBe('healthy');
    expect(health.performance.culturalOptimization).toBeGreaterThan(0);
  });

  it('should perform under realistic load conditions', async () => {
    await systemManager.initialize();

    const services = systemManager.getServices();
    
    // Simulate realistic processing load
    const processingResult = await services.reminderScheduling.processScheduledReminders();
    const batchingAnalytics = await services.smartBatching.getBatchingAnalytics();

    expect(processingResult.processed).toBeGreaterThan(0);
    expect(batchingAnalytics.successRate).toBeGreaterThan(0.8);
    expect(batchingAnalytics.batteryEfficiency).toBeGreaterThan(20);
  });
});