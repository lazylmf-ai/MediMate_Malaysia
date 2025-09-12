/**
 * SmartBatchingService Tests
 * 
 * Comprehensive test suite for the Smart Batching Service for battery optimization.
 * Tests batching strategies, battery optimization, and performance analytics.
 */

import { jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Battery from 'expo-battery';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('expo-battery');
jest.mock('../../../models/ReminderDatabase');
jest.mock('../CulturalConstraintEngine');

import SmartBatchingService, {
  BatchingStrategy,
  SmartBatch,
  BatchDeliveryResult,
  BatchingAnalytics,
  BatteryOptimizationConfig
} from '../SmartBatchingService';
import { reminderDatabase } from '../../../models/ReminderDatabase';
import CulturalConstraintEngine from '../CulturalConstraintEngine';
import { OfflineReminderQueue } from '../ReminderSchedulingService';
import { Medication } from '../../../types/medication';

describe('SmartBatchingService', () => {
  let service: SmartBatchingService;
  let mockCulturalEngine: jest.Mocked<CulturalConstraintEngine>;
  let mockReminderDb: any;

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

  const createMockOfflineReminder = (
    id: string,
    scheduledTime: Date,
    priority: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): OfflineReminderQueue => ({
    id,
    reminderScheduleId: `reminder-${id}`,
    payload: {
      medication: mockMedication,
      culturalContext: { userId: 'user-001' },
      deliveryInstructions: [{
        type: 'push_notification',
        priority: 1,
        enabled: true,
        settings: { sound: 'default', vibration: true }
      }]
    },
    scheduledDelivery: scheduledTime,
    attempts: 0,
    queuedAt: new Date(),
    priority
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    // Setup Battery mock
    (Battery.getBatteryLevelAsync as jest.Mock).mockResolvedValue(0.75); // 75%

    // Setup AsyncStorage mocks
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.removeItem as jest.Mock).mockResolvedValue(undefined);

    // Setup service mocks
    mockCulturalEngine = {
      evaluateConstraints: jest.fn(),
      getInstance: jest.fn()
    } as any;

    mockReminderDb = {
      insertBatchedReminder: jest.fn(),
      updateBatchStatus: jest.fn(),
      removeFromOfflineQueue: jest.fn(),
      updateOfflineReminderAttempt: jest.fn(),
      getPendingBatches: jest.fn()
    };

    // Mock static methods
    (CulturalConstraintEngine.getInstance as jest.Mock).mockReturnValue(mockCulturalEngine);
    (reminderDatabase.insertBatchedReminder as jest.Mock).mockImplementation(mockReminderDb.insertBatchedReminder);
    (reminderDatabase.updateBatchStatus as jest.Mock).mockImplementation(mockReminderDb.updateBatchStatus);
    (reminderDatabase.removeFromOfflineQueue as jest.Mock).mockImplementation(mockReminderDb.removeFromOfflineQueue);
    (reminderDatabase.updateOfflineReminderAttempt as jest.Mock).mockImplementation(mockReminderDb.updateOfflineReminderAttempt);
    (reminderDatabase.getPendingBatches as jest.Mock).mockImplementation(mockReminderDb.getPendingBatches);

    // Get service instance
    service = SmartBatchingService.getInstance();
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      const result = await service.initialize();

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should load configuration from storage', async () => {
      const mockConfig = {
        enableSmartBatching: true,
        maxBatteryUsagePercent: 3.0,
        lowBatteryThreshold: 15
      };

      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key.includes('smart_batching_config')) {
          return Promise.resolve(JSON.stringify(mockConfig));
        }
        return Promise.resolve(null);
      });

      await service.initialize();

      expect(AsyncStorage.getItem).toHaveBeenCalledWith(
        expect.stringContaining('smart_batching_config')
      );
    });

    it('should load performance metrics from storage', async () => {
      const mockMetrics = {
        'high_battery_aggressive': {
          batchCount: 10,
          successfulBatches: 8,
          averageExecutionTime: 1500
        }
      };

      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key.includes('batching_performance_metrics')) {
          return Promise.resolve(JSON.stringify(mockMetrics));
        }
        return Promise.resolve(null);
      });

      await service.initialize();

      expect(AsyncStorage.getItem).toHaveBeenCalledWith(
        expect.stringContaining('batching_performance_metrics')
      );
    });
  });

  describe('Batching Strategy Selection', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should select appropriate strategy based on battery level', async () => {
      const reminders = [
        createMockOfflineReminder('1', new Date('2024-01-01T08:00:00')),
        createMockOfflineReminder('2', new Date('2024-01-01T08:15:00'))
      ];

      // High battery level
      (Battery.getBatteryLevelAsync as jest.Mock).mockResolvedValue(0.80);

      const batches = await service.createSmartBatches(reminders);

      expect(batches.length).toBeGreaterThan(0);
      expect(batches[0].strategy.name).toContain('aggressive');
    });

    it('should use conservative strategy for low battery', async () => {
      const reminders = [
        createMockOfflineReminder('1', new Date('2024-01-01T08:00:00')),
        createMockOfflineReminder('2', new Date('2024-01-01T08:15:00'))
      ];

      // Low battery level
      (Battery.getBatteryLevelAsync as jest.Mock).mockResolvedValue(0.15);

      const batches = await service.createSmartBatches(reminders);

      expect(batches.length).toBeGreaterThan(0);
      expect(batches[0].strategy.name).toContain('conservative');
    });

    it('should group reminders by priority when strategy requires', async () => {
      const reminders = [
        createMockOfflineReminder('1', new Date('2024-01-01T08:00:00'), 'high'),
        createMockOfflineReminder('2', new Date('2024-01-01T08:05:00'), 'critical'),
        createMockOfflineReminder('3', new Date('2024-01-01T08:10:00'), 'medium')
      ];

      (Battery.getBatteryLevelAsync as jest.Mock).mockResolvedValue(0.60);

      const batches = await service.createSmartBatches(reminders);

      expect(batches.length).toBeGreaterThan(0);
      
      // Should have separate batches for different priorities or combined based on strategy
      const priorities = batches.map(batch => batch.priority);
      expect(priorities.length).toBeGreaterThan(0);
    });

    it('should respect max batch size limits', async () => {
      const reminders = Array.from({ length: 20 }, (_, i) => 
        createMockOfflineReminder(
          i.toString(),
          new Date(`2024-01-01T08:${i.toString().padStart(2, '0')}:00`)
        )
      );

      (Battery.getBatteryLevelAsync as jest.Mock).mockResolvedValue(0.50);

      const batches = await service.createSmartBatches(reminders);

      expect(batches.length).toBeGreaterThan(1); // Should split into multiple batches
      batches.forEach(batch => {
        expect(batch.reminders.length).toBeLessThanOrEqual(10); // Max batch size
      });
    });
  });

  describe('Cultural Optimization', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should apply cultural optimization when enabled', async () => {
      const reminders = [
        createMockOfflineReminder('1', new Date('2024-01-01T13:00:00')) // During typical prayer time
      ];

      // Mock cultural constraint evaluation
      mockCulturalEngine.evaluateConstraints.mockResolvedValue({
        canProceed: false,
        timeAdjustment: {
          originalTime: new Date('2024-01-01T13:00:00'),
          adjustedTime: new Date('2024-01-01T13:45:00'),
          adjustmentReason: 'Prayer time adjustment',
          fallbackUsed: false
        },
        conflictingConstraints: [],
        recommendations: ['Adjusted for prayer times'],
        culturalContext: {},
        nextAvailableSlot: new Date('2024-01-01T13:45:00')
      });

      const batches = await service.createSmartBatches(reminders);

      expect(batches.length).toBeGreaterThan(0);
      expect(batches[0].culturalOptimized).toBe(true);
      expect(mockCulturalEngine.evaluateConstraints).toHaveBeenCalled();
    });

    it('should skip cultural optimization when disabled by strategy', async () => {
      const reminders = [
        createMockOfflineReminder('1', new Date('2024-01-01T08:00:00'))
      ];

      // Force low battery to use conservative strategy
      (Battery.getBatteryLevelAsync as jest.Mock).mockResolvedValue(0.10);

      const batches = await service.createSmartBatches(reminders);

      expect(batches.length).toBeGreaterThan(0);
      // Conservative strategy might disable cultural awareness for battery saving
      expect(batches[0].strategy.culturalAware).toBe(false);
    });

    it('should handle cultural constraint evaluation errors', async () => {
      const reminders = [
        createMockOfflineReminder('1', new Date('2024-01-01T08:00:00'))
      ];

      mockCulturalEngine.evaluateConstraints.mockRejectedValue(
        new Error('Cultural service unavailable')
      );

      const batches = await service.createSmartBatches(reminders);

      // Should still create batches despite cultural service error
      expect(batches.length).toBeGreaterThan(0);
    });
  });

  describe('Batch Processing and Delivery', () => {
    let mockBatch: SmartBatch;

    beforeEach(async () => {
      await service.initialize();

      mockBatch = {
        id: 'batch-001',
        reminders: [
          createMockOfflineReminder('1', new Date('2024-01-01T08:00:00')),
          createMockOfflineReminder('2', new Date('2024-01-01T08:05:00'))
        ],
        scheduledTime: new Date('2024-01-01T08:00:00'),
        estimatedBatteryImpact: 0.15,
        culturalOptimized: true,
        priority: 'medium',
        strategy: {
          name: 'medium_battery_balanced',
          maxBatchSize: 6,
          timeWindowMinutes: 45,
          batteryThreshold: 25,
          culturalAware: true,
          priorityGrouping: true,
          adaptiveScheduling: true
        },
        retryPolicy: {
          maxRetries: 3,
          currentRetries: 0,
          backoffMultiplier: 2
        },
        metadata: {
          createdAt: new Date(),
          lastModified: new Date(),
          deliveryAttempts: 0,
          totalReminders: 2,
          successfulDeliveries: 0,
          failedDeliveries: 0
        }
      };
    });

    it('should process batch successfully', async () => {
      const result = await service.processBatch(mockBatch);

      expect(result.batchId).toBe('batch-001');
      expect(result.success).toBeDefined();
      expect(result.deliveredCount).toBeGreaterThanOrEqual(0);
      expect(result.failedCount).toBeGreaterThanOrEqual(0);
      expect(result.batteryUsed).toBeGreaterThanOrEqual(0);
      expect(result.executionTime).toBeGreaterThan(0);
    });

    it('should check cultural constraints before processing', async () => {
      // Mock cultural constraint that blocks processing
      mockCulturalEngine.evaluateConstraints.mockResolvedValue({
        canProceed: false,
        conflictingConstraints: [],
        recommendations: ['Currently during prayer time'],
        culturalContext: { currentPrayerStatus: 'dhuhr' },
        nextAvailableSlot: new Date('2024-01-01T14:00:00')
      });

      const result = await service.processBatch(mockBatch);

      expect(result.success).toBe(false);
      expect(result.nextRetryTime).toBeDefined();
      expect(result.culturalAdjustments.length).toBeGreaterThan(0);
    });

    it('should handle individual reminder delivery failures', async () => {
      const result = await service.processBatch(mockBatch);

      // Some reminders might fail, but batch should still process
      expect(result.deliveredCount + result.failedCount).toBe(mockBatch.reminders.length);
    });

    it('should implement retry logic for failed batches', async () => {
      // First attempt
      const result1 = await service.processBatch(mockBatch);
      
      if (!result1.success && result1.nextRetryTime) {
        // Simulate retry after delay
        mockBatch.retryPolicy.currentRetries = 1;
        const result2 = await service.processBatch(mockBatch);
        
        expect(result2).toBeDefined();
      }
    });

    it('should stop retrying after max retries reached', async () => {
      // Set batch to max retries
      mockBatch.retryPolicy.currentRetries = mockBatch.retryPolicy.maxRetries;

      const result = await service.processBatch(mockBatch);

      expect(result.nextRetryTime).toBeUndefined();
    });

    it('should update batch metadata during processing', async () => {
      const originalAttempts = mockBatch.metadata.deliveryAttempts;

      await service.processBatch(mockBatch);

      expect(mockBatch.metadata.deliveryAttempts).toBe(originalAttempts + 1);
      expect(mockBatch.metadata.lastModified.getTime()).toBeGreaterThan(mockBatch.metadata.createdAt.getTime());
    });
  });

  describe('Battery Optimization', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should estimate battery impact for batches', async () => {
      const reminders = [
        createMockOfflineReminder('1', new Date('2024-01-01T08:00:00')),
        createMockOfflineReminder('2', new Date('2024-01-01T08:05:00'))
      ];

      const batches = await service.createSmartBatches(reminders);

      expect(batches.length).toBeGreaterThan(0);
      batches.forEach(batch => {
        expect(batch.estimatedBatteryImpact).toBeGreaterThan(0);
        expect(batch.estimatedBatteryImpact).toBeLessThan(1.0); // Should be less than 1%
      });
    });

    it('should adjust batch sizes based on battery level', async () => {
      const reminders = Array.from({ length: 10 }, (_, i) => 
        createMockOfflineReminder(i.toString(), new Date('2024-01-01T08:00:00'))
      );

      // Low battery should create smaller batches
      (Battery.getBatteryLevelAsync as jest.Mock).mockResolvedValue(0.20);

      const lowBatteryBatches = await service.createSmartBatches(reminders);

      // High battery should create larger batches
      (Battery.getBatteryLevelAsync as jest.Mock).mockResolvedValue(0.80);

      const highBatteryBatches = await service.createSmartBatches(reminders);

      // Compare batch strategies
      const lowBatteryStrategy = lowBatteryBatches[0]?.strategy;
      const highBatteryStrategy = highBatteryBatches[0]?.strategy;

      if (lowBatteryStrategy && highBatteryStrategy) {
        expect(lowBatteryStrategy.maxBatchSize).toBeLessThanOrEqual(highBatteryStrategy.maxBatchSize);
      }
    });

    it('should track battery usage across batches', async () => {
      const batch = {
        ...mockBatch,
        id: 'battery-test-batch'
      };

      const result = await service.processBatch(batch);

      expect(result.batteryUsed).toBeGreaterThanOrEqual(0);
    });

    it('should optimize batch scheduling for battery efficiency', async () => {
      const reminders = Array.from({ length: 8 }, (_, i) => 
        createMockOfflineReminder(
          i.toString(),
          new Date(`2024-01-01T${8 + Math.floor(i / 2)}:${(i % 2) * 30}:00`)
        )
      );

      const batches = await service.createSmartBatches(reminders);

      // Should create fewer, larger batches for better battery efficiency
      expect(batches.length).toBeLessThan(reminders.length);
      
      const totalEstimatedImpact = batches.reduce((sum, batch) => sum + batch.estimatedBatteryImpact, 0);
      expect(totalEstimatedImpact).toBeLessThan(0.5); // Less than 0.5% total
    });
  });

  describe('Performance Analytics', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should analyze batching performance', async () => {
      // Mock some performance metrics
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key.includes('batching_performance_metrics')) {
          return Promise.resolve(JSON.stringify({
            'high_battery_aggressive': {
              batchCount: 15,
              successfulBatches: 12,
              totalReminders: 45,
              totalBatteryUsed: 2.1,
              batteryEfficiency: 21.4,
              culturalOptimizations: 8
            },
            'medium_battery_balanced': {
              batchCount: 10,
              successfulBatches: 9,
              totalReminders: 30,
              totalBatteryUsed: 1.8,
              batteryEfficiency: 16.7,
              culturalOptimizations: 6
            }
          }));
        }
        return Promise.resolve(null);
      });

      const analytics = await service.analyzeBatchingPerformance();

      expect(analytics.totalBatches).toBeGreaterThan(0);
      expect(analytics.successRate).toBeGreaterThanOrEqual(0);
      expect(analytics.successRate).toBeLessThanOrEqual(1);
      expect(analytics.averageBatchSize).toBeGreaterThan(0);
      expect(analytics.batteryEfficiency).toBeGreaterThanOrEqual(0);
      expect(analytics.bestStrategy).toBeDefined();
      expect(Array.isArray(analytics.recommendations)).toBe(true);
    });

    it('should identify best performing strategy', async () => {
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key.includes('batching_performance_metrics')) {
          return Promise.resolve(JSON.stringify({
            'strategy_a': {
              batchCount: 10,
              successfulBatches: 9,
              batteryEfficiency: 25.0
            },
            'strategy_b': {
              batchCount: 10,
              successfulBatches: 8,
              batteryEfficiency: 20.0
            }
          }));
        }
        return Promise.resolve(null);
      });

      const analytics = await service.analyzeBatchingPerformance();

      expect(analytics.bestStrategy).toBeDefined();
    });

    it('should generate optimization recommendations', async () => {
      (AsyncStorage.getItem as jest.Mock).mockImplementation((key) => {
        if (key.includes('batching_performance_metrics')) {
          return Promise.resolve(JSON.stringify({
            'low_performance_strategy': {
              batchCount: 10,
              successfulBatches: 5, // Low success rate
              batteryEfficiency: 8.0 // Low efficiency
            }
          }));
        }
        return Promise.resolve(null);
      });

      const analytics = await service.analyzeBatchingPerformance();

      expect(analytics.recommendations.length).toBeGreaterThan(0);
      expect(analytics.recommendations.some(r => r.includes('reliability') || r.includes('efficiency'))).toBe(true);
    });

    it('should handle empty performance data', async () => {
      const analytics = await service.analyzeBatchingPerformance();

      expect(analytics.totalBatches).toBe(0);
      expect(analytics.successRate).toBe(0);
      expect(analytics.bestStrategy).toBeDefined(); // Should have default
    });
  });

  describe('Configuration Management', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should allow configuration updates', async () => {
      const updates: Partial<BatteryOptimizationConfig> = {
        maxBatteryUsagePercent: 3.5,
        lowBatteryThreshold: 25,
        adaptiveIntervals: false
      };

      await service.updateConfiguration(updates);

      const config = service.getConfiguration();
      expect(config.maxBatteryUsagePercent).toBe(3.5);
      expect(config.lowBatteryThreshold).toBe(25);
      expect(config.adaptiveIntervals).toBe(false);
    });

    it('should persist configuration changes', async () => {
      const updates = { enableSmartBatching: false };

      await service.updateConfiguration(updates);

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        expect.stringContaining('smart_batching_config'),
        expect.any(String)
      );
    });

    it('should allow strategy customization', async () => {
      const strategies = service.getAllStrategies();
      expect(strategies.length).toBeGreaterThan(0);

      const strategyToUpdate = strategies[0];
      await service.updateStrategy(strategyToUpdate.name, {
        maxBatchSize: 8,
        timeWindowMinutes: 60
      });

      // Verify strategy was updated
      const updatedStrategies = service.getAllStrategies();
      const updated = updatedStrategies.find(s => s.name === strategyToUpdate.name);
      expect(updated?.maxBatchSize).toBe(8);
      expect(updated?.timeWindowMinutes).toBe(60);
    });
  });

  describe('Error Handling and Edge Cases', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should handle empty reminder list', async () => {
      const batches = await service.createSmartBatches([]);

      expect(Array.isArray(batches)).toBe(true);
      expect(batches.length).toBe(0);
    });

    it('should handle battery service unavailability', async () => {
      (Battery.getBatteryLevelAsync as jest.Mock).mockRejectedValue(new Error('Battery service unavailable'));

      const reminders = [createMockOfflineReminder('1', new Date('2024-01-01T08:00:00'))];
      const batches = await service.createSmartBatches(reminders);

      // Should use default battery assumption and continue
      expect(batches.length).toBeGreaterThan(0);
    });

    it('should handle database operation failures', async () => {
      mockReminderDb.insertBatchedReminder.mockRejectedValue(new Error('Database error'));

      const reminders = [createMockOfflineReminder('1', new Date('2024-01-01T08:00:00'))];
      const batches = await service.createSmartBatches(reminders);

      // Should still create batches in memory even if database fails
      expect(batches.length).toBeGreaterThan(0);
    });

    it('should handle processing errors gracefully', async () => {
      const corruptBatch = {
        ...mockBatch,
        reminders: [] // Empty reminders array
      };

      const result = await service.processBatch(corruptBatch);

      expect(result.batchId).toBe(corruptBatch.id);
      expect(result.success).toBeDefined();
      expect(result.executionTime).toBeGreaterThan(0);
    });

    it('should handle storage failures during metrics collection', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValue(new Error('Storage error'));

      const analytics = await service.analyzeBatchingPerformance();

      // Should provide default analytics even on storage error
      expect(analytics).toBeDefined();
      expect(analytics.totalBatches).toBe(0);
      expect(analytics.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Memory and Resource Management', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should maintain reasonable memory usage with large batch counts', async () => {
      // Create many batches
      for (let i = 0; i < 10; i++) {
        const reminders = Array.from({ length: 5 }, (_, j) => 
          createMockOfflineReminder(`${i}-${j}`, new Date('2024-01-01T08:00:00'))
        );
        await service.createSmartBatches(reminders);
      }

      const activeBatches = service.getActiveBatches();
      expect(activeBatches.length).toBeGreaterThan(0);
    });

    it('should clean up completed batches', async () => {
      const reminders = [createMockOfflineReminder('1', new Date('2024-01-01T08:00:00'))];
      const batches = await service.createSmartBatches(reminders);

      if (batches.length > 0) {
        const batch = batches[0];
        
        // Process the batch
        await service.processBatch(batch);

        // Verify database operations were called
        expect(mockReminderDb.updateBatchStatus).toHaveBeenCalled();
      }
    });

    it('should handle concurrent batch processing', async () => {
      const reminders1 = [createMockOfflineReminder('1', new Date('2024-01-01T08:00:00'))];
      const reminders2 = [createMockOfflineReminder('2', new Date('2024-01-01T08:15:00'))];

      const [batches1, batches2] = await Promise.all([
        service.createSmartBatches(reminders1),
        service.createSmartBatches(reminders2)
      ]);

      expect(batches1.length).toBeGreaterThan(0);
      expect(batches2.length).toBeGreaterThan(0);
      
      // Batches should have unique IDs
      const ids1 = batches1.map(b => b.id);
      const ids2 = batches2.map(b => b.id);
      const allIds = [...ids1, ...ids2];
      const uniqueIds = [...new Set(allIds)];
      
      expect(uniqueIds.length).toBe(allIds.length);
    });
  });
});

describe('SmartBatchingService Integration', () => {
  let service: SmartBatchingService;

  beforeEach(() => {
    service = SmartBatchingService.getInstance();
  });

  it('should maintain singleton pattern', () => {
    const service2 = SmartBatchingService.getInstance();
    expect(service).toBe(service2);
  });

  it('should integrate with all required services', () => {
    expect(service).toBeDefined();
    expect(typeof service.initialize).toBe('function');
    expect(typeof service.createSmartBatches).toBe('function');
    expect(typeof service.processBatch).toBe('function');
    expect(typeof service.analyzeBatchingPerformance).toBe('function');
  });

  it('should provide comprehensive API', () => {
    const publicMethods = [
      'initialize',
      'createSmartBatches',
      'processBatch',
      'analyzeBatchingPerformance',
      'updateConfiguration',
      'getConfiguration',
      'getBatchingAnalytics',
      'getActiveBatches',
      'getBatchById',
      'getAllStrategies',
      'updateStrategy',
      'clearMetrics'
    ];

    publicMethods.forEach(method => {
      expect(typeof (service as any)[method]).toBe('function');
    });
  });

  it('should handle service lifecycle correctly', async () => {
    const result = await service.initialize();
    expect(result.success).toBeDefined();

    const config = service.getConfiguration();
    expect(config).toBeDefined();
    expect(typeof config.enableSmartBatching).toBe('boolean');
  });
});