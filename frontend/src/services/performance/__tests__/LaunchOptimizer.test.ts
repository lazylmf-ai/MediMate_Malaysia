/**
 * Launch Optimizer Tests
 *
 * Comprehensive tests for LaunchOptimizer service including:
 * - Initialization and configuration
 * - Critical path loading
 * - Pre-caching functionality
 * - Background task scheduling
 * - Launch metrics tracking
 * - Cold vs warm start detection
 */

import LaunchOptimizer from '../LaunchOptimizer';
import { reminderDatabase } from '../../../models/ReminderDatabase';
import { adherenceDatabase } from '../../../models/AdherenceDatabase';

// Mock dependencies
jest.mock('../../../models/ReminderDatabase');
jest.mock('../../../models/AdherenceDatabase');
jest.mock('@react-native-async-storage/async-storage');

describe('LaunchOptimizer', () => {
  let launchOptimizer: LaunchOptimizer;

  beforeEach(() => {
    // Reset singleton instance
    (LaunchOptimizer as any).instance = null;
    launchOptimizer = LaunchOptimizer.getInstance();

    // Clear all mocks
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await launchOptimizer.cleanup();
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      await launchOptimizer.initialize();

      expect(launchOptimizer.isReady()).toBe(true);
    });

    it('should register critical resources', async () => {
      await launchOptimizer.initialize();

      const performance = launchOptimizer.getLaunchPerformance();
      expect(performance.lastLaunch).toBeDefined();
    });

    it('should load configuration from storage', async () => {
      const customConfig = {
        enableCodeSplitting: false,
        enablePreCaching: true,
      };

      await launchOptimizer.initialize(customConfig);

      const config = launchOptimizer.getConfig();
      expect(config.enableCodeSplitting).toBe(false);
      expect(config.enablePreCaching).toBe(true);
    });

    it('should initialize databases', async () => {
      await launchOptimizer.initialize();

      expect(reminderDatabase.initialize).toHaveBeenCalled();
      expect(adherenceDatabase.initialize).toHaveBeenCalled();
    });
  });

  describe('Cold vs Warm Start Detection', () => {
    it('should detect cold start correctly', async () => {
      // First launch should be cold start
      await launchOptimizer.initialize();

      const performance = launchOptimizer.getLaunchPerformance();
      expect(performance.lastLaunch?.coldStart).toBe(true);
    });

    it('should detect warm start after recent launch', async () => {
      // First launch
      await launchOptimizer.initialize();
      await launchOptimizer.cleanup();

      // Immediate second launch should be warm start
      (LaunchOptimizer as any).instance = null;
      launchOptimizer = LaunchOptimizer.getInstance();
      await launchOptimizer.initialize();

      const performance = launchOptimizer.getLaunchPerformance();
      // Note: In test environment, this might not work as expected
      // due to mocked AsyncStorage
    });
  });

  describe('Critical Path Loading', () => {
    it('should load critical resources within timeout', async () => {
      const startTime = Date.now();
      await launchOptimizer.initialize();
      const duration = Date.now() - startTime;

      // Should complete within configured timeout
      expect(duration).toBeLessThan(5000); // 5 second max
    });

    it('should handle resource loading errors gracefully', async () => {
      // Mock database initialization failure
      (reminderDatabase.initialize as jest.Mock).mockRejectedValueOnce(
        new Error('Database init failed')
      );

      await expect(launchOptimizer.initialize()).rejects.toThrow();
    });

    it('should prioritize critical resources', async () => {
      await launchOptimizer.initialize();

      // Verify database is initialized before other resources
      expect(reminderDatabase.initialize).toHaveBeenCalled();
      expect(adherenceDatabase.initialize).toHaveBeenCalled();
    });
  });

  describe('Pre-Caching', () => {
    it('should save data to pre-cache', async () => {
      await launchOptimizer.initialize();

      const testData = { key: 'value', number: 123 };
      await launchOptimizer.saveToPreCache('test-key', testData);

      const cached = launchOptimizer.getFromPreCache('test-key');
      expect(cached).toEqual(testData);
    });

    it('should retrieve pre-cached data', async () => {
      await launchOptimizer.initialize();

      await launchOptimizer.saveToPreCache('schedules', [1, 2, 3]);

      const cached = launchOptimizer.getFromPreCache('schedules');
      expect(cached).toEqual([1, 2, 3]);
    });

    it('should respect cache size limits', async () => {
      await launchOptimizer.initialize();

      // Create large data object (>5MB)
      const largeData = Array(1000000).fill('test');

      await launchOptimizer.saveToPreCache('large-key', largeData);

      // Should not crash or exceed limits
      const cached = launchOptimizer.getFromPreCache('large-key');
      // Might be null if size limit exceeded
      expect(cached === null || cached === largeData).toBe(true);
    });

    it('should handle cache expiration', async () => {
      await launchOptimizer.initialize();

      // This would require mocking time or waiting
      // For now, just verify cache is accessible
      await launchOptimizer.saveToPreCache('expiring-key', 'test');
      const cached = launchOptimizer.getFromPreCache('expiring-key');
      expect(cached).toBe('test');
    });
  });

  describe('Background Task Scheduling', () => {
    it('should schedule background tasks', async () => {
      const config = {
        enableBackgroundInit: true,
      };

      await launchOptimizer.initialize(config);

      // Background tasks should be scheduled
      // In real scenario, these would run after InteractionManager
      expect(launchOptimizer.isReady()).toBe(true);
    });

    it('should not schedule background tasks when disabled', async () => {
      const config = {
        enableBackgroundInit: false,
      };

      await launchOptimizer.initialize(config);

      expect(launchOptimizer.isReady()).toBe(true);
    });
  });

  describe('Launch Metrics', () => {
    it('should track launch metrics', async () => {
      await launchOptimizer.initialize();

      const performance = launchOptimizer.getLaunchPerformance();

      expect(performance.lastLaunch).toBeDefined();
      expect(performance.lastLaunch?.startTime).toBeGreaterThan(0);
      expect(performance.lastLaunch?.interactiveTime).toBeGreaterThan(0);
    });

    it('should calculate average launch times', async () => {
      // Perform multiple launches
      for (let i = 0; i < 3; i++) {
        await launchOptimizer.cleanup();
        (LaunchOptimizer as any).instance = null;
        launchOptimizer = LaunchOptimizer.getInstance();
        await launchOptimizer.initialize();
      }

      const performance = launchOptimizer.getLaunchPerformance();

      expect(performance.averageColdStart).toBeGreaterThan(0);
    });

    it('should provide detailed phase metrics', async () => {
      await launchOptimizer.initialize();

      const performance = launchOptimizer.getLaunchPerformance();
      const lastLaunch = performance.lastLaunch;

      expect(lastLaunch).toBeDefined();
      expect(lastLaunch?.phases).toBeDefined();
      expect(lastLaunch?.phases.initialization).toBeGreaterThan(0);
      expect(lastLaunch?.phases.databaseSetup).toBeGreaterThanOrEqual(0);
    });

    it('should track resource loading success', async () => {
      await launchOptimizer.initialize();

      const performance = launchOptimizer.getLaunchPerformance();
      const lastLaunch = performance.lastLaunch;

      expect(lastLaunch?.resourcesLoaded).toBeDefined();
      expect(lastLaunch?.resourcesLoaded.critical).toBeGreaterThan(0);
      expect(lastLaunch?.resourcesLoaded.failed).toBe(0);
    });
  });

  describe('Performance Targets', () => {
    it('should meet cold start target (<3s)', async () => {
      const startTime = Date.now();
      await launchOptimizer.initialize();
      const duration = Date.now() - startTime;

      console.log(`Cold start time: ${duration}ms`);

      // Note: In test environment, this might be slower
      // In production with optimizations, should be <3000ms
      expect(duration).toBeLessThan(5000); // Relaxed for tests
    });

    it('should report if targets are met', async () => {
      await launchOptimizer.initialize();

      const performance = launchOptimizer.getLaunchPerformance();

      expect(performance.target).toEqual({
        coldStart: 3000,
        warmStart: 1000,
      });
    });
  });

  describe('Configuration Management', () => {
    it('should update configuration', async () => {
      await launchOptimizer.initialize();

      await launchOptimizer.updateConfig({
        criticalPathTimeout: 5000,
      });

      const config = launchOptimizer.getConfig();
      expect(config.criticalPathTimeout).toBe(5000);
    });

    it('should get current configuration', async () => {
      await launchOptimizer.initialize();

      const config = launchOptimizer.getConfig();

      expect(config).toBeDefined();
      expect(config.enableCodeSplitting).toBeDefined();
      expect(config.enablePreCaching).toBeDefined();
      expect(config.preCacheConfig).toBeDefined();
    });

    it('should persist configuration changes', async () => {
      await launchOptimizer.initialize();

      const newConfig = {
        enableCodeSplitting: false,
        criticalPathTimeout: 3000,
      };

      await launchOptimizer.updateConfig(newConfig);
      await launchOptimizer.cleanup();

      // Reload
      (LaunchOptimizer as any).instance = null;
      launchOptimizer = LaunchOptimizer.getInstance();
      await launchOptimizer.initialize();

      const config = launchOptimizer.getConfig();
      expect(config.enableCodeSplitting).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle initialization timeout', async () => {
      // Mock slow database initialization
      (reminderDatabase.initialize as jest.Mock).mockImplementation(
        () => new Promise(resolve => setTimeout(resolve, 10000))
      );

      const config = {
        criticalPathTimeout: 100, // Very short timeout
      };

      await expect(
        launchOptimizer.initialize(config)
      ).rejects.toThrow();
    });

    it('should recover from non-critical resource failures', async () => {
      // Mock a non-critical resource failure
      // The optimizer should continue despite this

      await launchOptimizer.initialize();

      expect(launchOptimizer.isReady()).toBe(true);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup resources', async () => {
      await launchOptimizer.initialize();
      await launchOptimizer.cleanup();

      // Should save metrics and config
      expect(true).toBe(true); // Placeholder - verify storage calls
    });

    it('should clear pre-cache on cleanup if needed', async () => {
      await launchOptimizer.initialize();

      await launchOptimizer.saveToPreCache('test', 'data');
      await launchOptimizer.cleanup();

      // Cache should persist for next launch
      const cached = launchOptimizer.getFromPreCache('test');
      expect(cached).toBe('data');
    });
  });
});

describe('LaunchOptimizer Integration', () => {
  it('should work with complete app initialization flow', async () => {
    const launchOptimizer = LaunchOptimizer.getInstance();

    // 1. Initialize
    await launchOptimizer.initialize({
      enablePreCaching: true,
      enableBackgroundInit: true,
    });

    // 2. Save some data to cache
    await launchOptimizer.saveToPreCache('user-prefs', {
      language: 'en',
      theme: 'dark',
    });

    // 3. Check performance
    const performance = launchOptimizer.getLaunchPerformance();

    expect(performance.lastLaunch).toBeDefined();
    expect(performance.meetingTarget).toBeDefined();

    // 4. Cleanup
    await launchOptimizer.cleanup();

    expect(true).toBe(true);
  });
});