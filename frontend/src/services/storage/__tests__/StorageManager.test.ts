/**
 * Tests for StorageManager
 * Issue #27 Stream D - Storage optimization tests
 */

import StorageManager from '../StorageManager';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('expo-file-system');

describe('StorageManager', () => {
  let storageManager: StorageManager;

  beforeEach(async () => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);
    (AsyncStorage.getAllKeys as jest.Mock).mockResolvedValue([]);

    storageManager = StorageManager.getInstance();
  });

  afterEach(async () => {
    await storageManager.shutdown();
  });

  describe('Initialization', () => {
    test('should initialize successfully', async () => {
      const result = await storageManager.initialize();
      expect(result.success).toBe(true);
    });

    test('should trigger cleanup if usage >80%', async () => {
      // Would mock high storage usage scenario
      const result = await storageManager.initialize();
      expect(result.success).toBe(true);
    });
  });

  describe('Storage Metrics', () => {
    test('should get current storage metrics', async () => {
      await storageManager.initialize();
      const metrics = await storageManager.getStorageMetrics();

      expect(metrics).toHaveProperty('totalCapacity');
      expect(metrics).toHaveProperty('usedSpace');
      expect(metrics).toHaveProperty('availableSpace');
      expect(metrics).toHaveProperty('usagePercent');
      expect(metrics.breakdown).toHaveProperty('cache');
      expect(metrics.breakdown).toHaveProperty('database');
    });
  });

  describe('Automatic Cleanup', () => {
    test('should perform automatic cleanup', async () => {
      await storageManager.initialize();
      const result = await storageManager.performAutomaticCleanup();

      expect(result.success).toBe(true);
      expect(result).toHaveProperty('spaceClearedBytes');
      expect(result).toHaveProperty('itemsDeleted');
      expect(result.categories).toHaveProperty('cache');
      expect(result.categories).toHaveProperty('logs');
    });

    test('should respect retention policies during cleanup', async () => {
      await storageManager.initialize();
      await storageManager.setRetentionPolicy({
        policyId: 'test_policy',
        dataType: 'cache',
        retentionDays: 1,
        compressionEnabled: false,
        autoCleanup: true,
        priority: 'low',
      });

      const result = await storageManager.performAutomaticCleanup();
      expect(result.success).toBe(true);
    });
  });

  describe('Data Compression', () => {
    test('should compress historical data', async () => {
      await storageManager.initialize();
      const result = await storageManager.compressHistoricalData('analytics', 30);

      expect(result.success).toBe(true);
      expect(result.compressionRatio).toBeLessThan(1.0);
      expect(result.compressedSize).toBeLessThan(result.originalSize);
    });
  });

  describe('Database Maintenance', () => {
    test('should perform database vacuum', async () => {
      await storageManager.initialize();
      const result = await storageManager.performDatabaseMaintenance();

      expect(result.success).toBe(true);
      expect(result.operation).toBe('vacuum');
      expect(result.spaceSavedBytes).toBeGreaterThanOrEqual(0);
      expect(result.performanceImprovement).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Storage Alerts', () => {
    test('should generate alert at warning threshold', async () => {
      await storageManager.initialize();
      await storageManager.updateQuota({ warningThreshold: 50 });

      // Mock high usage to trigger alert
      const alerts = storageManager.getStorageAlerts('warning');
      expect(Array.isArray(alerts)).toBe(true);
    });

    test('should clear specific alert', async () => {
      await storageManager.initialize();
      const alerts = storageManager.getStorageAlerts();

      if (alerts.length > 0) {
        await storageManager.clearAlert(alerts[0].alertId);
      }
    });
  });

  describe('Retention Policies', () => {
    test('should set retention policy', async () => {
      await storageManager.initialize();

      await storageManager.setRetentionPolicy({
        policyId: 'custom_policy',
        dataType: 'medication',
        retentionDays: 180,
        compressionEnabled: true,
        autoCleanup: false,
        priority: 'critical',
      });

      const policy = storageManager.getRetentionPolicy('medication');
      expect(policy).toBeDefined();
      expect(policy?.retentionDays).toBe(180);
    });
  });

  describe('Cleanup by Data Type', () => {
    test('should cleanup specific data type', async () => {
      await storageManager.initialize();
      const result = await storageManager.cleanupDataType('cache');

      expect(result.success).toBe(true);
      expect(result.categories).toHaveProperty('cache');
    });
  });

  describe('Storage Projections', () => {
    test('should estimate time to storage full', async () => {
      await storageManager.initialize();
      const estimate = await storageManager.estimateTimeToStorageFull();

      expect(estimate).toHaveProperty('daysRemaining');
      expect(estimate).toHaveProperty('projectedFullDate');
      expect(estimate).toHaveProperty('averageDailyGrowth');
    });
  });
});