/**
 * Performance Monitor Tests
 *
 * Comprehensive tests for PerformanceMonitor service including:
 * - Performance marking and measuring
 * - UI performance tracking
 * - Memory monitoring
 * - Navigation tracking
 * - Performance reporting
 */

import PerformanceMonitor from '../PerformanceMonitor';

// Mock dependencies
jest.mock('@react-native-async-storage/async-storage');

describe('PerformanceMonitor', () => {
  let performanceMonitor: PerformanceMonitor;

  beforeEach(() => {
    // Reset singleton instance
    (PerformanceMonitor as any).instance = null;
    performanceMonitor = PerformanceMonitor.getInstance();

    jest.clearAllMocks();
  });

  afterEach(async () => {
    if (performanceMonitor.isActive()) {
      await performanceMonitor.stopMonitoring();
    }
  });

  describe('Monitoring Lifecycle', () => {
    it('should start monitoring successfully', async () => {
      await performanceMonitor.startMonitoring();

      expect(performanceMonitor.isActive()).toBe(true);
    });

    it('should stop monitoring successfully', async () => {
      await performanceMonitor.startMonitoring();
      await performanceMonitor.stopMonitoring();

      expect(performanceMonitor.isActive()).toBe(false);
    });

    it('should not start monitoring twice', async () => {
      await performanceMonitor.startMonitoring();
      await performanceMonitor.startMonitoring(); // Second call

      expect(performanceMonitor.isActive()).toBe(true);
    });

    it('should handle stop when not monitoring', async () => {
      await expect(
        performanceMonitor.stopMonitoring()
      ).resolves.not.toThrow();
    });
  });

  describe('Performance Marking', () => {
    it('should create performance marks', () => {
      performanceMonitor.mark('test-mark');

      const marks = performanceMonitor.getMarks();
      expect(marks.length).toBeGreaterThan(0);
      expect(marks[marks.length - 1].name).toBe('test-mark');
    });

    it('should create marks with timestamp', () => {
      const beforeTime = Date.now();
      performanceMonitor.mark('timestamped-mark');
      const afterTime = Date.now();

      const marks = performanceMonitor.getMarks();
      const mark = marks.find(m => m.name === 'timestamped-mark');

      expect(mark).toBeDefined();
      expect(mark!.timestamp).toBeGreaterThanOrEqual(beforeTime);
      expect(mark!.timestamp).toBeLessThanOrEqual(afterTime);
    });

    it('should handle multiple marks with same name', () => {
      performanceMonitor.mark('duplicate-mark');
      performanceMonitor.mark('duplicate-mark');

      // Should overwrite previous mark
      const marks = performanceMonitor.getMarks();
      const duplicates = marks.filter(m => m.name === 'duplicate-mark');

      expect(duplicates.length).toBeGreaterThan(0);
    });
  });

  describe('Performance Measuring', () => {
    it('should measure between two marks', () => {
      performanceMonitor.mark('start-mark');

      // Simulate some work
      const delay = 100;
      for (let i = 0; i < 1000000; i++) {} // CPU work

      performanceMonitor.mark('end-mark');

      const duration = performanceMonitor.measure(
        'test-measure',
        'start-mark',
        'end-mark'
      );

      expect(duration).toBeGreaterThan(0);
    });

    it('should measure from mark to now', () => {
      performanceMonitor.mark('start-mark');

      // Small delay
      for (let i = 0; i < 100000; i++) {}

      const duration = performanceMonitor.measure(
        'test-measure',
        'start-mark'
      );

      expect(duration).toBeGreaterThan(0);
    });

    it('should return null for missing start mark', () => {
      const duration = performanceMonitor.measure(
        'test-measure',
        'non-existent-mark'
      );

      expect(duration).toBeNull();
    });

    it('should record measures', () => {
      performanceMonitor.mark('start');
      performanceMonitor.mark('end');

      performanceMonitor.measure('measure-1', 'start', 'end');

      const measures = performanceMonitor.getMeasures();
      expect(measures.length).toBeGreaterThan(0);
      expect(measures[measures.length - 1].name).toBe('measure-1');
    });
  });

  describe('UI Performance Tracking', () => {
    it('should track screen render performance', async () => {
      await performanceMonitor.trackScreenRender(
        'HomeScreen',
        15, // render time
        50  // interaction delay
      );

      const entries = performanceMonitor.getEntries('render');
      expect(entries.length).toBeGreaterThan(0);
    });

    it('should warn on slow renders', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      await performanceMonitor.trackScreenRender(
        'SlowScreen',
        20, // > 16.67ms target
        100
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Slow render detected')
      );

      consoleSpy.mockRestore();
    });

    it('should warn on slow interactions', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      await performanceMonitor.trackScreenRender(
        'TestScreen',
        10,
        150 // > 100ms target
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Slow interaction')
      );

      consoleSpy.mockRestore();
    });

    it('should track scroll performance', () => {
      performanceMonitor.trackScrollPerformance(
        'ListScreen',
        58, // fps
        85, // smoothness
        3   // jank count
      );

      // Should not throw
      expect(true).toBe(true);
    });

    it('should warn on poor scroll performance', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      performanceMonitor.trackScrollPerformance(
        'ListScreen',
        45, // < 55 fps
        60,
        10  // > 5 janks
      );

      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('Navigation Tracking', () => {
    it('should track navigation performance', () => {
      performanceMonitor.trackNavigation(
        'HomeScreen',
        'ProfileScreen',
        250 // duration
      );

      const entries = performanceMonitor.getEntries('navigation');
      expect(entries.length).toBeGreaterThan(0);
    });

    it('should warn on slow navigation', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      performanceMonitor.trackNavigation(
        'HomeScreen',
        'SlowScreen',
        400 // > 300ms
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Slow navigation')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Interaction Tracking', () => {
    it('should track user interactions', () => {
      performanceMonitor.trackInteraction(
        'button_press',
        'submit-button',
        50 // response time
      );

      const entries = performanceMonitor.getEntries('interaction');
      expect(entries.length).toBeGreaterThan(0);
    });

    it('should warn on slow interactions', () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      performanceMonitor.trackInteraction(
        'button_press',
        'slow-button',
        150 // > 100ms
      );

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Slow interaction')
      );

      consoleSpy.mockRestore();
    });
  });

  describe('Performance Snapshot', () => {
    it('should get current performance snapshot', async () => {
      await performanceMonitor.startMonitoring();

      // Add some metrics
      await performanceMonitor.trackScreenRender('TestScreen', 10, 50);
      performanceMonitor.trackInteraction('tap', 'button', 30);

      const snapshot = performanceMonitor.getCurrentPerformance();

      expect(snapshot).toBeDefined();
      expect(snapshot.fps).toBeGreaterThan(0);
      expect(snapshot.memoryUsage).toBeGreaterThan(0);
      expect(snapshot.responseTime).toBeGreaterThanOrEqual(0);
      expect(typeof snapshot.isPerformant).toBe('boolean');
    });

    it('should indicate performant state', async () => {
      await performanceMonitor.startMonitoring();

      // Track good performance
      await performanceMonitor.trackScreenRender('FastScreen', 10, 50);

      const snapshot = performanceMonitor.getCurrentPerformance();

      // With good metrics, should be performant
      expect(snapshot.fps).toBeGreaterThan(50);
    });
  });

  describe('Performance Reporting', () => {
    it('should generate performance report', async () => {
      await performanceMonitor.startMonitoring();

      // Add various metrics
      await performanceMonitor.trackScreenRender('Screen1', 12, 40);
      await performanceMonitor.trackScreenRender('Screen2', 18, 80);
      performanceMonitor.trackNavigation('Screen1', 'Screen2', 200);
      performanceMonitor.trackInteraction('tap', 'button', 60);

      const report = await performanceMonitor.generatePerformanceReport(1);

      expect(report).toBeDefined();
      expect(report.period).toBeDefined();
      expect(report.uiPerformance).toBeDefined();
      expect(report.memory).toBeDefined();
      expect(report.navigation).toBeDefined();
      expect(report.responsiveness).toBeDefined();
      expect(report.recommendations).toBeDefined();
    });

    it('should include UI performance metrics in report', async () => {
      await performanceMonitor.startMonitoring();

      await performanceMonitor.trackScreenRender('TestScreen', 15, 50);

      const report = await performanceMonitor.generatePerformanceReport();

      expect(report.uiPerformance.averageFPS).toBeGreaterThan(0);
      expect(report.uiPerformance.averageRenderTime).toBeGreaterThan(0);
    });

    it('should identify slow screens', async () => {
      await performanceMonitor.startMonitoring();

      await performanceMonitor.trackScreenRender('FastScreen', 10, 30);
      await performanceMonitor.trackScreenRender('SlowScreen', 25, 120);
      await performanceMonitor.trackScreenRender('SlowScreen', 30, 130);

      const report = await performanceMonitor.generatePerformanceReport();

      expect(report.uiPerformance.slowScreens.length).toBeGreaterThan(0);
      expect(report.uiPerformance.slowScreens[0].screen).toBe('SlowScreen');
    });

    it('should provide recommendations', async () => {
      await performanceMonitor.startMonitoring();

      // Create poor performance scenario
      await performanceMonitor.trackScreenRender('SlowScreen', 30, 150);
      performanceMonitor.trackInteraction('tap', 'button', 200);

      const report = await performanceMonitor.generatePerformanceReport();

      expect(report.recommendations.length).toBeGreaterThan(0);
    });

    it('should analyze memory trends', async () => {
      await performanceMonitor.startMonitoring();

      // Wait for memory metrics to be collected
      await new Promise(resolve => setTimeout(resolve, 100));

      const report = await performanceMonitor.generatePerformanceReport();

      expect(report.memory.trend).toBeDefined();
      expect(['stable', 'increasing', 'decreasing']).toContain(
        report.memory.trend
      );
    });
  });

  describe('Performance Entries', () => {
    it('should retrieve all performance entries', () => {
      performanceMonitor.mark('mark-1');
      performanceMonitor.mark('mark-2');
      performanceMonitor.trackInteraction('tap', 'button', 50);

      const entries = performanceMonitor.getEntries();

      expect(entries.length).toBeGreaterThan(0);
    });

    it('should filter entries by type', () => {
      performanceMonitor.mark('test-mark');
      performanceMonitor.trackInteraction('tap', 'button', 50);

      const markEntries = performanceMonitor.getEntries('mark');
      const interactionEntries = performanceMonitor.getEntries('interaction');

      expect(markEntries.length).toBeGreaterThan(0);
      expect(interactionEntries.length).toBeGreaterThan(0);
    });
  });

  describe('Metrics Clearing', () => {
    it('should clear marks', () => {
      performanceMonitor.mark('mark-1');
      performanceMonitor.mark('mark-2');

      performanceMonitor.clearMarks();

      const marks = performanceMonitor.getMarks();
      expect(marks.length).toBe(0);
    });

    it('should clear all metrics', async () => {
      await performanceMonitor.startMonitoring();

      performanceMonitor.mark('test-mark');
      await performanceMonitor.trackScreenRender('TestScreen', 10, 50);

      await performanceMonitor.clearMetrics();

      const entries = performanceMonitor.getEntries();
      expect(entries.length).toBe(0);
    });
  });

  describe('Performance Targets', () => {
    it('should meet 60 FPS target', async () => {
      await performanceMonitor.startMonitoring();

      await performanceMonitor.trackScreenRender('FastScreen', 15, 40);

      const snapshot = performanceMonitor.getCurrentPerformance();

      // Should be close to 60 FPS with good performance
      expect(snapshot.fps).toBeGreaterThan(50);
    });

    it('should meet 100ms response time target', async () => {
      await performanceMonitor.startMonitoring();

      performanceMonitor.trackInteraction('tap', 'button', 50);

      const snapshot = performanceMonitor.getCurrentPerformance();

      expect(snapshot.responseTime).toBeLessThan(100);
    });
  });
});

describe('PerformanceMonitor Integration', () => {
  it('should work with complete monitoring workflow', async () => {
    const monitor = PerformanceMonitor.getInstance();

    // 1. Start monitoring
    await monitor.startMonitoring();

    // 2. Track various performance metrics
    monitor.mark('app-start');

    await monitor.trackScreenRender('HomeScreen', 12, 45);
    monitor.trackNavigation('Splash', 'HomeScreen', 250);
    monitor.trackInteraction('tap', 'login-button', 80);

    monitor.mark('app-interactive');
    const launchTime = monitor.measure('app-launch', 'app-start', 'app-interactive');

    expect(launchTime).toBeGreaterThan(0);

    // 3. Get current snapshot
    const snapshot = monitor.getCurrentPerformance();
    expect(snapshot.isPerformant).toBeDefined();

    // 4. Generate report
    const report = await monitor.generatePerformanceReport();
    expect(report.recommendations).toBeDefined();

    // 5. Stop monitoring
    await monitor.stopMonitoring();

    expect(monitor.isActive()).toBe(false);
  });
});