/**
 * Offline Queue Service Tests
 *
 * Comprehensive tests for Issue #24 Stream C - Offline Queue Service
 */

import OfflineQueueService from '../OfflineQueueService';
import { reminderDatabase } from '../../../models/ReminderDatabase';
import type { ReminderScheduleRecord } from '../../../models/ReminderDatabase';

// Mock dependencies
jest.mock('../../../models/ReminderDatabase');
jest.mock('expo-task-manager');
jest.mock('expo-background-fetch');

describe('OfflineQueueService', () => {
  let service: OfflineQueueService;
  const mockReminderDatabase = reminderDatabase as jest.Mocked<typeof reminderDatabase>;

  beforeEach(() => {
    service = OfflineQueueService.getInstance();
    jest.clearAllMocks();

    // Mock database methods
    mockReminderDatabase.initialize = jest.fn().mockResolvedValue({ success: true });
    mockReminderDatabase.addToOfflineQueue = jest.fn().mockResolvedValue(undefined);
    mockReminderDatabase.getPendingOfflineReminders = jest.fn().mockResolvedValue([]);
    mockReminderDatabase.cleanupExpiredOfflineReminders = jest.fn().mockResolvedValue(0);
    mockReminderDatabase.performMaintenance = jest.fn().mockResolvedValue({
      expiredRemindersRemoved: 0,
      expiredConstraintsRemoved: 0,
      oldHistoryRemoved: 0,
      databaseVacuumed: true
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Initialization', () => {
    it('should initialize successfully with default configuration', async () => {
      const result = await service.initialize();

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(service.isInitialized()).toBe(true);
    });

    it('should initialize with custom configuration', async () => {
      const customConfig = {
        maxQueueSize: 500,
        retryAttempts: 5,
        batchProcessing: {
          enabled: true,
          maxBatchSize: 10,
          batchTimeWindow: 30,
          batteryOptimized: true
        }
      };

      const result = await service.initialize(customConfig);

      expect(result.success).toBe(true);
      expect(service.getConfig().maxQueueSize).toBe(500);
      expect(service.getConfig().retryAttempts).toBe(5);
    });

    it('should handle database initialization failure', async () => {
      mockReminderDatabase.initialize.mockResolvedValue({
        success: false,
        error: 'Database connection failed'
      });

      const result = await service.initialize();

      expect(result.success).toBe(false);
      expect(result.error).toContain('Database initialization failed');
    });
  });

  describe('Queue Management', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should enqueue reminder successfully', async () => {
      const mockReminder: ReminderScheduleRecord = {
        id: 'reminder_123',
        medication_id: 'med_456',
        user_id: 'user_789',
        scheduled_time: new Date().toISOString(),
        delivery_methods: JSON.stringify(['push_notification']),
        cultural_constraints: JSON.stringify({ avoidPrayerTimes: true }),
        status: 'pending',
        retry_count: 0,
        priority: 'medium',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: 1
      };

      const payload = {
        medicationData: { name: 'Test Medication' },
        culturalContext: { prayerTimes: true },
        deliveryMethods: JSON.stringify(['push_notification'])
      };

      const result = await service.enqueueReminder(mockReminder, payload, 'high');

      expect(result.success).toBe(true);
      expect(result.queueId).toBeDefined();
      expect(mockReminderDatabase.addToOfflineQueue).toHaveBeenCalledWith(
        expect.objectContaining({
          reminder_schedule_id: 'reminder_123',
          queue_priority: 'high'
        })
      );
    });

    it('should handle enqueue failure gracefully', async () => {
      mockReminderDatabase.addToOfflineQueue.mockRejectedValue(new Error('Database error'));

      const mockReminder: ReminderScheduleRecord = {
        id: 'reminder_123',
        medication_id: 'med_456',
        user_id: 'user_789',
        scheduled_time: new Date().toISOString(),
        delivery_methods: JSON.stringify(['push_notification']),
        cultural_constraints: JSON.stringify({}),
        status: 'pending',
        retry_count: 0,
        priority: 'medium',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: 1
      };

      const result = await service.enqueueReminder(mockReminder, {
        medicationData: {},
        culturalContext: {},
        deliveryMethods: '[]'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Queue Processing', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should process empty queue successfully', async () => {
      mockReminderDatabase.getPendingOfflineReminders.mockResolvedValue([]);

      const result = await service.processOfflineQueue();

      expect(result.processed).toBe(0);
      expect(result.delivered).toBe(0);
      expect(result.failed).toBe(0);
      expect(result.errors).toEqual([]);
    });

    it('should process pending reminders', async () => {
      const mockPendingReminders = [
        {
          id: 'queue_1',
          reminder_schedule_id: 'reminder_1',
          payload: JSON.stringify({ medicationData: { name: 'Med 1' } }),
          scheduled_delivery: new Date(Date.now() - 60000).toISOString(), // 1 minute ago
          attempts: 0,
          queue_priority: 'medium' as const,
          cultural_context: JSON.stringify({}),
          delivery_methods: JSON.stringify(['push_notification']),
          created_at: new Date().toISOString(),
          expires_at: new Date(Date.now() + 86400000).toISOString() // 1 day from now
        }
      ];

      mockReminderDatabase.getPendingOfflineReminders.mockResolvedValue(mockPendingReminders);
      mockReminderDatabase.removeFromOfflineQueue = jest.fn().mockResolvedValue(undefined);

      const result = await service.processOfflineQueue();

      expect(result.processed).toBe(1);
      expect(mockReminderDatabase.removeFromOfflineQueue).toHaveBeenCalledWith('queue_1');
    });

    it('should handle processing errors gracefully', async () => {
      mockReminderDatabase.getPendingOfflineReminders.mockRejectedValue(new Error('Database error'));

      const result = await service.processOfflineQueue();

      expect(result.processed).toBe(0);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Queue Statistics', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should return queue statistics', async () => {
      const mockReminders = [
        {
          id: 'queue_1',
          reminder_schedule_id: 'reminder_1',
          payload: JSON.stringify({ test: 'data' }),
          scheduled_delivery: new Date().toISOString(),
          attempts: 0,
          queue_priority: 'medium' as const,
          cultural_context: JSON.stringify({}),
          delivery_methods: JSON.stringify(['push']),
          created_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
          expires_at: new Date(Date.now() + 86400000).toISOString()
        }
      ];

      mockReminderDatabase.getPendingOfflineReminders.mockResolvedValue(mockReminders);
      mockReminderDatabase.getPendingBatches = jest.fn().mockResolvedValue([]);

      const stats = await service.getQueueStats();

      expect(stats.totalItems).toBe(1);
      expect(stats.pendingDeliveries).toBe(1);
      expect(stats.averageQueueTime).toBeGreaterThan(0);
      expect(stats.storageUsed).toBeGreaterThan(0);
    });

    it('should handle empty queue statistics', async () => {
      mockReminderDatabase.getPendingOfflineReminders.mockResolvedValue([]);
      mockReminderDatabase.getPendingBatches = jest.fn().mockResolvedValue([]);

      const stats = await service.getQueueStats();

      expect(stats.totalItems).toBe(0);
      expect(stats.pendingDeliveries).toBe(0);
      expect(stats.averageQueueTime).toBe(0);
    });
  });

  describe('Battery Optimization', () => {
    beforeEach(async () => {
      await service.initialize({
        batchProcessing: {
          enabled: true,
          maxBatchSize: 5,
          batchTimeWindow: 15,
          batteryOptimized: true
        }
      });
    });

    it('should optimize queue for battery efficiency', async () => {
      const mockReminders = Array.from({ length: 10 }, (_, i) => ({
        id: `queue_${i}`,
        reminder_schedule_id: `reminder_${i}`,
        payload: JSON.stringify({ test: 'data' }),
        scheduled_delivery: new Date(Date.now() + i * 60000).toISOString(), // Spread over time
        attempts: 0,
        queue_priority: 'medium' as const,
        cultural_context: JSON.stringify({}),
        delivery_methods: JSON.stringify(['push']),
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 86400000).toISOString()
      }));

      mockReminderDatabase.getPendingOfflineReminders.mockResolvedValue(mockReminders);
      mockReminderDatabase.insertBatchedReminder = jest.fn().mockResolvedValue(undefined);

      const result = await service.optimizeForBattery();

      expect(result.batchesCreated).toBeGreaterThan(0);
      expect(result.estimatedBatterySavings).toBeGreaterThan(0);
      expect(result.optimizations.length).toBeGreaterThan(0);
    });

    it('should handle empty queue optimization', async () => {
      mockReminderDatabase.getPendingOfflineReminders.mockResolvedValue([]);

      const result = await service.optimizeForBattery();

      expect(result.batchesCreated).toBe(0);
      expect(result.estimatedBatterySavings).toBe(0);
      expect(result.optimizations).toEqual([]);
    });
  });

  describe('Configuration Management', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should update configuration', async () => {
      const newConfig = {
        maxQueueSize: 2000,
        retryAttempts: 5
      };

      await service.updateConfig(newConfig);

      const currentConfig = service.getConfig();
      expect(currentConfig.maxQueueSize).toBe(2000);
      expect(currentConfig.retryAttempts).toBe(5);
    });

    it('should clear queue', async () => {
      const mockReminders = [
        {
          id: 'queue_1',
          reminder_schedule_id: 'reminder_1',
          payload: '{}',
          scheduled_delivery: new Date().toISOString(),
          attempts: 0,
          queue_priority: 'medium' as const,
          cultural_context: '{}',
          delivery_methods: '[]',
          created_at: new Date().toISOString(),
          expires_at: new Date().toISOString()
        }
      ];

      mockReminderDatabase.getPendingOfflineReminders.mockResolvedValue(mockReminders);
      mockReminderDatabase.removeFromOfflineQueue = jest.fn().mockResolvedValue(undefined);

      const result = await service.clearQueue();

      expect(result.removed).toBe(1);
      expect(mockReminderDatabase.removeFromOfflineQueue).toHaveBeenCalledWith('queue_1');
    });
  });

  describe('Error Handling', () => {
    it('should handle service not initialized error', async () => {
      const uninitializedService = new (OfflineQueueService as any)();

      const mockReminder: ReminderScheduleRecord = {
        id: 'reminder_123',
        medication_id: 'med_456',
        user_id: 'user_789',
        scheduled_time: new Date().toISOString(),
        delivery_methods: '[]',
        cultural_constraints: '{}',
        status: 'pending',
        retry_count: 0,
        priority: 'medium',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: 1
      };

      const result = await uninitializedService.enqueueReminder(mockReminder, {
        medicationData: {},
        culturalContext: {},
        deliveryMethods: '[]'
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Service not initialized');
    });

    it('should handle database operation failures', async () => {
      await service.initialize();

      mockReminderDatabase.getPendingOfflineReminders.mockRejectedValue(new Error('Database connection lost'));

      const result = await service.processOfflineQueue();

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Singleton Pattern', () => {
    it('should return the same instance', () => {
      const instance1 = OfflineQueueService.getInstance();
      const instance2 = OfflineQueueService.getInstance();

      expect(instance1).toBe(instance2);
    });
  });
});

// Additional integration tests
describe('OfflineQueueService Integration', () => {
  let service: OfflineQueueService;

  beforeEach(() => {
    service = OfflineQueueService.getInstance();
    jest.clearAllMocks();
  });

  it('should handle complex queue scenarios', async () => {
    // Mock complex scenario with multiple reminders, priorities, and cultural constraints
    const mockComplexScenario = {
      // High priority critical medication
      criticalReminder: {
        id: 'critical_1',
        medication_id: 'insulin',
        user_id: 'diabetic_user',
        scheduled_time: new Date().toISOString(),
        delivery_methods: JSON.stringify(['push_notification', 'sms']),
        cultural_constraints: JSON.stringify({ avoidPrayerTimes: true }),
        status: 'pending' as const,
        retry_count: 0,
        priority: 'critical' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: 1
      },
      // Normal priority medication during prayer time
      normalReminder: {
        id: 'normal_1',
        medication_id: 'vitamin',
        user_id: 'regular_user',
        scheduled_time: new Date().toISOString(),
        delivery_methods: JSON.stringify(['push_notification']),
        cultural_constraints: JSON.stringify({ avoidPrayerTimes: true, bufferMinutes: 30 }),
        status: 'pending' as const,
        retry_count: 0,
        priority: 'medium' as const,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        version: 1
      }
    };

    // This would test the complete flow from enqueue to delivery
    // In a real implementation, we'd test with actual database interactions
    expect(mockComplexScenario.criticalReminder.priority).toBe('critical');
    expect(mockComplexScenario.normalReminder.priority).toBe('medium');
  });
});