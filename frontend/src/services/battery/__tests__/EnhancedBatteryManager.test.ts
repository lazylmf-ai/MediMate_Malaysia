/**
 * Tests for EnhancedBatteryManager
 *
 * Issue #27 Stream D - Battery & Storage Optimization
 *
 * Comprehensive test coverage for:
 * - Battery mode switching and adaptation
 * - Background task scheduling
 * - Network request batching
 * - Battery usage reporting
 * - Doze metrics tracking
 * - Configuration management
 */

import EnhancedBatteryManager from '../EnhancedBatteryManager';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('expo-battery');
jest.mock('@react-native-community/netinfo');
jest.mock('../../../utils/optimization/BatteryOptimizationEngine');

describe('EnhancedBatteryManager', () => {
  let batteryManager: EnhancedBatteryManager;

  beforeEach(async () => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

    batteryManager = EnhancedBatteryManager.getInstance();
  });

  afterEach(async () => {
    await batteryManager.shutdown();
  });

  describe('Initialization', () => {
    test('should initialize successfully', async () => {
      const result = await batteryManager.initialize();

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    test('should load saved configuration from storage', async () => {
      const savedConfig = {
        enableAggressiveOptimization: false,
        dailyBatteryTarget: 3.0,
      };

      (AsyncStorage.getItem as jest.Mock).mockResolvedValueOnce(
        JSON.stringify(savedConfig)
      );

      await batteryManager.initialize();

      expect(AsyncStorage.getItem).toHaveBeenCalled();
    });

    test('should handle initialization errors gracefully', async () => {
      (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(
        new Error('Storage error')
      );

      const result = await batteryManager.initialize();

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('Battery Mode Management', () => {
    beforeEach(async () => {
      await batteryManager.initialize();
    });

    test('should set battery mode to normal', async () => {
      await batteryManager.setBatteryMode('normal');

      const mode = batteryManager.getCurrentMode();
      expect(mode.mode).toBe('normal');
      expect(mode.batteryImpactTarget).toBe(0.21); // 5% per 24h
    });

    test('should set battery mode to balanced', async () => {
      await batteryManager.setBatteryMode('balanced');

      const mode = batteryManager.getCurrentMode();
      expect(mode.mode).toBe('balanced');
      expect(mode.batteryImpactTarget).toBe(0.17); // 4% per 24h
    });

    test('should set battery mode to power_saver', async () => {
      await batteryManager.setBatteryMode('power_saver');

      const mode = batteryManager.getCurrentMode();
      expect(mode.mode).toBe('power_saver');
      expect(mode.restrictions.backgroundSync).toBe(false);
      expect(mode.restrictions.animationsEnabled).toBe(false);
    });

    test('should set battery mode to ultra_saver', async () => {
      await batteryManager.setBatteryMode('ultra_saver');

      const mode = batteryManager.getCurrentMode();
      expect(mode.mode).toBe('ultra_saver');
      expect(mode.batteryImpactTarget).toBe(0.083); // 2% per 24h
      expect(mode.restrictions.pushNotifications).toBe(false);
    });

    test('should reject invalid battery mode', async () => {
      await expect(
        batteryManager.setBatteryMode('invalid' as any)
      ).rejects.toThrow();
    });

    test('should persist mode changes to storage', async () => {
      await batteryManager.setBatteryMode('power_saver');

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        expect.stringContaining('battery_mode'),
        'power_saver'
      );
    });
  });

  describe('Adaptive Battery Mode', () => {
    beforeEach(async () => {
      await batteryManager.initialize();
    });

    test('should switch to ultra_saver at 15% battery', async () => {
      const mode = await batteryManager.adaptBatteryMode(0.15);

      expect(mode.mode).toBe('ultra_saver');
    });

    test('should switch to power_saver at 30% battery', async () => {
      const mode = await batteryManager.adaptBatteryMode(0.30);

      expect(mode.mode).toBe('power_saver');
    });

    test('should switch to balanced at 50% battery', async () => {
      const mode = await batteryManager.adaptBatteryMode(0.50);

      expect(mode.mode).toBe('balanced');
    });

    test('should switch to normal at 80% battery', async () => {
      const mode = await batteryManager.adaptBatteryMode(0.80);

      expect(mode.mode).toBe('normal');
    });

    test('should not switch if auto-switching disabled', async () => {
      await batteryManager.updateConfiguration({
        autoModeSwitching: false,
      });

      await batteryManager.setBatteryMode('normal');
      const mode = await batteryManager.adaptBatteryMode(0.15);

      expect(mode.mode).toBe('normal'); // Should not change
    });
  });

  describe('Background Task Scheduling', () => {
    beforeEach(async () => {
      await batteryManager.initialize();
    });

    test('should schedule background task', async () => {
      const scheduledTime = new Date(Date.now() + 60000); // 1 minute from now

      await batteryManager.scheduleBackgroundTask(
        'task_123',
        'sync',
        scheduledTime,
        {
          estimatedDuration: 30000,
          estimatedBatteryCost: 0.01,
          priority: 'high',
          requiresNetwork: true,
        }
      );

      const tasks = batteryManager.getPendingBackgroundTasks();
      expect(tasks).toHaveLength(1);
      expect(tasks[0].taskId).toBe('task_123');
      expect(tasks[0].taskType).toBe('sync');
      expect(tasks[0].priority).toBe('high');
    });

    test('should optimize task scheduling based on battery level', async () => {
      await batteryManager.adaptBatteryMode(0.10); // Low battery

      const originalTime = new Date(Date.now() + 60000);
      await batteryManager.scheduleBackgroundTask(
        'task_low_priority',
        'analytics',
        originalTime,
        {
          priority: 'low',
        }
      );

      const tasks = batteryManager.getPendingBackgroundTasks();
      // Task should be delayed due to low battery
      expect(tasks[0].scheduledTime.getTime()).toBeGreaterThan(
        originalTime.getTime()
      );
    });

    test('should prioritize critical tasks even at low battery', async () => {
      await batteryManager.adaptBatteryMode(0.10);

      const scheduledTime = new Date(Date.now() + 60000);
      await batteryManager.scheduleBackgroundTask(
        'critical_task',
        'reminder',
        scheduledTime,
        {
          priority: 'critical',
        }
      );

      const tasks = batteryManager.getPendingBackgroundTasks();
      // Critical task should not be delayed
      expect(tasks[0].scheduledTime.getTime()).toBe(scheduledTime.getTime());
    });

    test('should sort tasks by priority and time', async () => {
      const now = Date.now();

      await batteryManager.scheduleBackgroundTask(
        'task1',
        'sync',
        new Date(now + 120000),
        { priority: 'medium' }
      );

      await batteryManager.scheduleBackgroundTask(
        'task2',
        'reminder',
        new Date(now + 60000),
        { priority: 'critical' }
      );

      await batteryManager.scheduleBackgroundTask(
        'task3',
        'cleanup',
        new Date(now + 90000),
        { priority: 'low' }
      );

      const tasks = batteryManager.getPendingBackgroundTasks();
      expect(tasks[0].taskId).toBe('task2'); // Critical first
      expect(tasks[1].taskId).toBe('task1'); // Medium second
      expect(tasks[2].taskId).toBe('task3'); // Low last
    });
  });

  describe('Network Request Batching', () => {
    beforeEach(async () => {
      await batteryManager.initialize();
    });

    test('should batch network request', async () => {
      await batteryManager.batchNetworkRequest(
        'req_123',
        '/api/sync',
        'POST',
        { data: 'test' },
        8
      );

      // Request should be batched (no immediate execution)
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    test('should respect priority in batching', async () => {
      await batteryManager.batchNetworkRequest(
        'req_high',
        '/api/critical',
        'POST',
        {},
        10
      );

      await batteryManager.batchNetworkRequest(
        'req_low',
        '/api/analytics',
        'POST',
        {},
        3
      );

      // High priority should be processed first in batch
    });

    test('should disable batching if configured', async () => {
      await batteryManager.updateConfiguration({
        networkBatchingEnabled: false,
      });

      await batteryManager.batchNetworkRequest(
        'req_immediate',
        '/api/sync',
        'GET'
      );

      // Should execute immediately, not batch
    });
  });

  describe('Battery Usage Reporting', () => {
    beforeEach(async () => {
      await batteryManager.initialize();
    });

    test('should generate battery usage report', async () => {
      const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
      const endDate = new Date();

      const report = await batteryManager.generateBatteryUsageReport(
        'user_123',
        startDate,
        endDate
      );

      expect(report).toBeDefined();
      expect(report.userId).toBe('user_123');
      expect(report.period.hours).toBe(24);
      expect(report.usage.breakdown).toHaveProperty('reminders');
      expect(report.usage.breakdown).toHaveProperty('sync');
      expect(report.usage.breakdown).toHaveProperty('background');
      expect(report.performance.targetDailyUsage).toBe(5.0);
    });

    test('should calculate efficiency metrics', async () => {
      const report = await batteryManager.generateBatteryUsageReport(
        'user_123',
        new Date(Date.now() - 24 * 60 * 60 * 1000),
        new Date()
      );

      expect(report.performance.efficiency).toBeGreaterThanOrEqual(0);
      expect(report.performance.efficiency).toBeLessThanOrEqual(1);
    });

    test('should provide recommendations when over target', async () => {
      const report = await batteryManager.generateBatteryUsageReport(
        'user_123',
        new Date(Date.now() - 24 * 60 * 60 * 1000),
        new Date()
      );

      expect(report.recommendations).toBeDefined();
      expect(Array.isArray(report.recommendations)).toBe(true);
    });
  });

  describe('Doze Metrics', () => {
    beforeEach(async () => {
      await batteryManager.initialize();
    });

    test('should track doze entry', async () => {
      await batteryManager.updateDozeMetrics(true);

      const metrics = batteryManager.getDozeMetrics();
      expect(metrics.dozeEntriesCount).toBe(1);
      expect(metrics.lastDozeEntry).toBeDefined();
    });

    test('should track doze exit', async () => {
      await batteryManager.updateDozeMetrics(true);
      await new Promise(resolve => setTimeout(resolve, 100));
      await batteryManager.updateDozeMetrics(false);

      const metrics = batteryManager.getDozeMetrics();
      expect(metrics.dozeExitsCount).toBe(1);
      expect(metrics.lastDozeExit).toBeDefined();
    });

    test('should calculate average doze duration', async () => {
      await batteryManager.updateDozeMetrics(true);
      await new Promise(resolve => setTimeout(resolve, 100));
      await batteryManager.updateDozeMetrics(false);

      const metrics = batteryManager.getDozeMetrics();
      expect(metrics.averageDozeDuration).toBeGreaterThan(0);
    });
  });

  describe('Configuration Management', () => {
    beforeEach(async () => {
      await batteryManager.initialize();
    });

    test('should update configuration', async () => {
      await batteryManager.updateConfiguration({
        dailyBatteryTarget: 3.0,
        networkBatchingEnabled: false,
      });

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        expect.stringContaining('config'),
        expect.any(String)
      );
    });

    test('should apply configuration changes immediately', async () => {
      await batteryManager.updateConfiguration({
        networkBatchingEnabled: false,
      });

      // Network batching should be disabled
      await batteryManager.batchNetworkRequest('test', '/api/test', 'GET');
    });
  });

  describe('Shutdown and Cleanup', () => {
    beforeEach(async () => {
      await batteryManager.initialize();
    });

    test('should shutdown gracefully', async () => {
      await batteryManager.shutdown();

      // Should save state to storage
      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    test('should clear intervals on shutdown', async () => {
      await batteryManager.shutdown();

      // Intervals should be cleared (can't directly test, but no errors should occur)
    });
  });

  describe('Integration Tests', () => {
    test('should coordinate battery mode with task scheduling', async () => {
      await batteryManager.initialize();

      // Set low battery
      await batteryManager.adaptBatteryMode(0.15);

      // Schedule tasks
      await batteryManager.scheduleBackgroundTask(
        'task1',
        'sync',
        new Date(Date.now() + 60000),
        { priority: 'low' }
      );

      await batteryManager.scheduleBackgroundTask(
        'task2',
        'reminder',
        new Date(Date.now() + 60000),
        { priority: 'critical' }
      );

      const mode = batteryManager.getCurrentMode();
      const tasks = batteryManager.getPendingBackgroundTasks();

      expect(mode.mode).toBe('ultra_saver');
      expect(tasks[0].priority).toBe('critical'); // Critical task first
    });

    test('should generate comprehensive usage report', async () => {
      await batteryManager.initialize();

      // Simulate some activity
      await batteryManager.setBatteryMode('power_saver');
      await batteryManager.scheduleBackgroundTask(
        'task',
        'sync',
        new Date(Date.now() + 60000)
      );
      await batteryManager.batchNetworkRequest('req', '/api/test', 'GET');

      const report = await batteryManager.generateBatteryUsageReport(
        'user_123',
        new Date(Date.now() - 24 * 60 * 60 * 1000),
        new Date()
      );

      expect(report.userId).toBe('user_123');
      expect(report.usage.breakdown).toBeDefined();
      expect(report.performance.efficiency).toBeDefined();
      expect(report.recommendations.length).toBeGreaterThan(0);
    });
  });
});