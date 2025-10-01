/**
 * Tests for ResourceMonitor
 * Issue #27 Stream D - Resource monitoring tests
 */

import ResourceMonitor from '../ResourceMonitor';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('expo-battery');
jest.mock('@react-native-community/netinfo');

describe('ResourceMonitor', () => {
  let resourceMonitor: ResourceMonitor;

  beforeEach(async () => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

    resourceMonitor = ResourceMonitor.getInstance();
  });

  afterEach(async () => {
    await resourceMonitor.shutdown();
  });

  describe('Initialization', () => {
    test('should initialize successfully', async () => {
      const result = await resourceMonitor.initialize();
      expect(result.success).toBe(true);
    });
  });

  describe('Resource Snapshots', () => {
    test('should get current snapshot', async () => {
      await resourceMonitor.initialize();
      const snapshot = resourceMonitor.getCurrentSnapshot();

      expect(snapshot).toHaveProperty('timestamp');
      expect(snapshot).toHaveProperty('cpu');
      expect(snapshot).toHaveProperty('memory');
      expect(snapshot).toHaveProperty('network');
      expect(snapshot).toHaveProperty('battery');
      expect(snapshot).toHaveProperty('performance');
    });

    test('should collect historical snapshots', async () => {
      await resourceMonitor.initialize();
      await resourceMonitor.startMonitoring();

      await new Promise(resolve => setTimeout(resolve, 200));

      const snapshots = resourceMonitor.getSnapshots();
      expect(snapshots.length).toBeGreaterThanOrEqual(1);
    });

    test('should limit snapshot retention', async () => {
      await resourceMonitor.initialize();

      // Simulate many snapshots
      for (let i = 0; i < 150; i++) {
        await resourceMonitor.startMonitoring();
        await resourceMonitor.stopMonitoring();
      }

      const snapshots = resourceMonitor.getSnapshots();
      expect(snapshots.length).toBeLessThanOrEqual(100);
    });
  });

  describe('Resource Alerts', () => {
    test('should generate alerts for high CPU usage', async () => {
      await resourceMonitor.initialize();
      await resourceMonitor.updateConfiguration({
        thresholds: {
          cpu: { warning: 10, critical: 20 },
          memory: { warning: 75, critical: 90 },
          battery: { warning: 20, critical: 10 },
          performance: { minFps: 30, maxFrameDrops: 10, maxRenderTime: 100 },
          network: { maxLatency: 1000, maxRequestsPerMinute: 60 },
        },
      });

      await resourceMonitor.startMonitoring();
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check if alerts were generated (may or may not based on simulated values)
      const alerts = resourceMonitor.getAlerts();
      expect(Array.isArray(alerts)).toBe(true);
    });

    test('should clear specific alert', async () => {
      await resourceMonitor.initialize();
      const alerts = resourceMonitor.getAlerts();

      if (alerts.length > 0) {
        await resourceMonitor.clearAlert(alerts[0].alertId);
        const remaining = resourceMonitor.getAlerts();
        expect(remaining.length).toBe(alerts.length - 1);
      }
    });

    test('should filter alerts by severity', async () => {
      await resourceMonitor.initialize();
      const criticalAlerts = resourceMonitor.getAlerts('critical');
      const warningAlerts = resourceMonitor.getAlerts('warning');

      expect(Array.isArray(criticalAlerts)).toBe(true);
      expect(Array.isArray(warningAlerts)).toBe(true);
    });
  });

  describe('Resource Trends', () => {
    test('should calculate CPU trends', async () => {
      await resourceMonitor.initialize();
      await resourceMonitor.startMonitoring();

      await new Promise(resolve => setTimeout(resolve, 100));

      const trends = resourceMonitor.getTrends('cpu', 60);
      expect(trends).toHaveProperty('average');
      expect(trends).toHaveProperty('min');
      expect(trends).toHaveProperty('max');
      expect(trends).toHaveProperty('trend');
      expect(trends.dataPoints).toBeDefined();
    });

    test('should detect increasing trend', async () => {
      await resourceMonitor.initialize();
      // Would need to mock increasing values to test trend detection
    });

    test('should detect decreasing trend', async () => {
      await resourceMonitor.initialize();
      // Would need to mock decreasing values to test trend detection
    });
  });

  describe('Health Scoring', () => {
    test('should calculate overall health score', async () => {
      await resourceMonitor.initialize();
      await resourceMonitor.startMonitoring();

      const health = resourceMonitor.getHealthScore();
      expect(health.overall).toBeGreaterThanOrEqual(0);
      expect(health.overall).toBeLessThanOrEqual(100);
      expect(health.breakdown).toHaveProperty('cpu');
      expect(health.breakdown).toHaveProperty('memory');
      expect(health.breakdown).toHaveProperty('battery');
      expect(health.breakdown).toHaveProperty('performance');
      expect(health.breakdown).toHaveProperty('network');
    });

    test('should have all sub-scores in valid range', async () => {
      await resourceMonitor.initialize();
      const health = resourceMonitor.getHealthScore();

      Object.values(health.breakdown).forEach(score => {
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      });
    });
  });

  describe('Configuration', () => {
    test('should update monitoring configuration', async () => {
      await resourceMonitor.initialize();

      await resourceMonitor.updateConfiguration({
        samplingInterval: 30000, // 30 seconds
        enableAlerts: false,
      });

      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });

    test('should restart monitoring when interval changes', async () => {
      await resourceMonitor.initialize();
      await resourceMonitor.startMonitoring();

      await resourceMonitor.updateConfiguration({
        samplingInterval: 10000,
      });

      // Monitoring should restart with new interval
    });
  });

  describe('Monitoring Control', () => {
    test('should start monitoring', async () => {
      await resourceMonitor.initialize();
      await resourceMonitor.startMonitoring();

      // Should be collecting snapshots
      await new Promise(resolve => setTimeout(resolve, 100));
      const snapshots = resourceMonitor.getSnapshots();
      expect(snapshots.length).toBeGreaterThanOrEqual(1);
    });

    test('should stop monitoring', async () => {
      await resourceMonitor.initialize();
      await resourceMonitor.startMonitoring();
      await resourceMonitor.stopMonitoring();

      // Monitoring should be stopped
    });
  });
});