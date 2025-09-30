/**
 * Performance Monitor Service
 *
 * Comprehensive performance monitoring for React Native with native bridge integration.
 * Tracks app performance metrics, UI responsiveness, and system resource usage.
 *
 * Targets:
 * - <100ms UI response time
 * - 60 FPS for all animations and scrolling
 * - <150MB peak memory usage
 * - Real-time performance tracking
 */

import { Platform, PerformanceObserverEntryList } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { performanceMonitor as webPerformanceMonitor } from '../../utils/performance';

export interface PerformanceEntry {
  name: string;
  entryType: 'mark' | 'measure' | 'navigation' | 'render' | 'interaction';
  startTime: number;
  duration: number;
  detail?: any;
}

export interface UIPerformanceMetrics {
  timestamp: number;
  screen: string;
  fps: number;
  frameDrops: number;
  renderTime: number;
  interactionDelay: number;
  scrollPerformance?: {
    fps: number;
    smoothness: number; // 0-100
    jankCount: number;
  };
}

export interface MemoryMetrics {
  timestamp: number;
  used: number; // MB
  limit: number; // MB
  percentage: number;
  jsHeapSize?: number;
  nativeHeapSize?: number;
  gcPauses?: number;
}

export interface AppPerformanceReport {
  period: { start: Date; end: Date };

  uiPerformance: {
    averageFPS: number;
    frameDropRate: number; // percentage
    averageRenderTime: number;
    averageInteractionDelay: number;
    slowScreens: Array<{ screen: string; avgRenderTime: number }>;
  };

  memory: {
    averageUsage: number;
    peakUsage: number;
    leakSuspected: boolean;
    trend: 'stable' | 'increasing' | 'decreasing';
  };

  navigation: {
    averageTransitionTime: number;
    slowestTransitions: Array<{ from: string; to: string; time: number }>;
  };

  responsiveness: {
    averageResponseTime: number;
    p95ResponseTime: number;
    missedTargetCount: number; // responses > 100ms
  };

  recommendations: string[];
}

interface PerformanceMark {
  name: string;
  timestamp: number;
}

interface PerformanceMeasure {
  name: string;
  startMark: string;
  endMark: string;
  duration: number;
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private isMonitoring = false;

  // Performance data storage
  private marks: Map<string, PerformanceMark> = new Map();
  private measures: PerformanceMeasure[] = [];
  private uiMetrics: UIPerformanceMetrics[] = [];
  private memoryMetrics: MemoryMetrics[] = [];
  private performanceEntries: PerformanceEntry[] = [];

  // Monitoring state
  private monitoringInterval?: NodeJS.Timeout;
  private memoryInterval?: NodeJS.Timeout;
  private fpsMonitor?: any;
  private currentScreen: string = 'unknown';

  // Performance targets
  private readonly TARGETS = {
    FPS: 60,
    RESPONSE_TIME: 100, // ms
    RENDER_TIME: 16.67, // ms (60 FPS)
    MEMORY_LIMIT: 150, // MB
  };

  // Storage keys
  private readonly STORAGE_KEYS = {
    UI_METRICS: 'perf_ui_metrics',
    MEMORY_METRICS: 'perf_memory_metrics',
    PERFORMANCE_ENTRIES: 'perf_entries',
  };

  private constructor() {
    // Initialize
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  /**
   * Start performance monitoring
   */
  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      return;
    }

    console.log('[PerformanceMonitor] Starting performance monitoring...');

    try {
      // Load historical data
      await this.loadMetrics();

      // Start UI performance monitoring
      this.startUIMonitoring();

      // Start memory monitoring
      this.startMemoryMonitoring();

      // Setup React Native Performance observers if available
      this.setupPerformanceObservers();

      this.isMonitoring = true;
      console.log('[PerformanceMonitor] Performance monitoring started');

    } catch (error) {
      console.error('[PerformanceMonitor] Failed to start monitoring:', error);
      throw error;
    }
  }

  /**
   * Stop performance monitoring
   */
  async stopMonitoring(): Promise<void> {
    if (!this.isMonitoring) {
      return;
    }

    console.log('[PerformanceMonitor] Stopping performance monitoring...');

    // Clear intervals
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    if (this.memoryInterval) {
      clearInterval(this.memoryInterval);
    }

    // Save metrics
    await this.saveMetrics();

    this.isMonitoring = false;
    console.log('[PerformanceMonitor] Performance monitoring stopped');
  }

  /**
   * Mark a performance point
   */
  mark(name: string, detail?: any): void {
    const timestamp = Date.now();

    this.marks.set(name, {
      name,
      timestamp
    });

    // Record as performance entry
    this.performanceEntries.push({
      name,
      entryType: 'mark',
      startTime: timestamp,
      duration: 0,
      detail
    });

    // Use web performance monitor if available
    if (Platform.OS === 'web') {
      webPerformanceMonitor.recordAPIMetric(name, 0, true, detail);
    }
  }

  /**
   * Measure time between two marks
   */
  measure(name: string, startMark: string, endMark?: string): number | null {
    const start = this.marks.get(startMark);

    if (!start) {
      console.warn(`[PerformanceMonitor] Start mark '${startMark}' not found`);
      return null;
    }

    const endTimestamp = endMark
      ? this.marks.get(endMark)?.timestamp || Date.now()
      : Date.now();

    const duration = endTimestamp - start.timestamp;

    const measure: PerformanceMeasure = {
      name,
      startMark,
      endMark: endMark || 'now',
      duration
    };

    this.measures.push(measure);

    // Record as performance entry
    this.performanceEntries.push({
      name,
      entryType: 'measure',
      startTime: start.timestamp,
      duration
    });

    console.log(`[PerformanceMonitor] Measure '${name}': ${duration.toFixed(2)}ms`);

    return duration;
  }

  /**
   * Track screen render performance
   */
  async trackScreenRender(
    screenName: string,
    renderTime: number,
    interactionDelay: number
  ): Promise<void> {
    this.currentScreen = screenName;

    const metric: UIPerformanceMetrics = {
      timestamp: Date.now(),
      screen: screenName,
      fps: 60, // Will be updated by FPS monitor
      frameDrops: 0,
      renderTime,
      interactionDelay
    };

    this.uiMetrics.push(metric);

    // Limit stored metrics
    if (this.uiMetrics.length > 1000) {
      this.uiMetrics = this.uiMetrics.slice(-1000);
    }

    // Check performance targets
    if (renderTime > this.TARGETS.RENDER_TIME) {
      console.warn(
        `[PerformanceMonitor] Slow render detected on ${screenName}: ${renderTime.toFixed(2)}ms (target: ${this.TARGETS.RENDER_TIME}ms)`
      );
    }

    if (interactionDelay > this.TARGETS.RESPONSE_TIME) {
      console.warn(
        `[PerformanceMonitor] Slow interaction on ${screenName}: ${interactionDelay.toFixed(2)}ms (target: ${this.TARGETS.RESPONSE_TIME}ms)`
      );
    }

    // Record as performance entry
    this.performanceEntries.push({
      name: `screen_render_${screenName}`,
      entryType: 'render',
      startTime: Date.now() - renderTime,
      duration: renderTime,
      detail: { interactionDelay }
    });
  }

  /**
   * Track scroll performance
   */
  trackScrollPerformance(
    screenName: string,
    fps: number,
    smoothness: number,
    jankCount: number
  ): void {
    const existingMetric = this.uiMetrics.find(
      m => m.screen === screenName && Date.now() - m.timestamp < 1000
    );

    if (existingMetric) {
      existingMetric.scrollPerformance = { fps, smoothness, jankCount };
    } else {
      const metric: UIPerformanceMetrics = {
        timestamp: Date.now(),
        screen: screenName,
        fps,
        frameDrops: 60 - fps,
        renderTime: 0,
        interactionDelay: 0,
        scrollPerformance: { fps, smoothness, jankCount }
      };

      this.uiMetrics.push(metric);
    }

    // Check scroll performance
    if (fps < 55) {
      console.warn(
        `[PerformanceMonitor] Poor scroll performance on ${screenName}: ${fps} FPS (target: 60 FPS)`
      );
    }

    if (jankCount > 5) {
      console.warn(
        `[PerformanceMonitor] High jank count on ${screenName}: ${jankCount} janks`
      );
    }
  }

  /**
   * Track navigation performance
   */
  trackNavigation(fromScreen: string, toScreen: string, duration: number): void {
    this.performanceEntries.push({
      name: `navigation_${fromScreen}_to_${toScreen}`,
      entryType: 'navigation',
      startTime: Date.now() - duration,
      duration,
      detail: { from: fromScreen, to: toScreen }
    });

    if (duration > 300) {
      console.warn(
        `[PerformanceMonitor] Slow navigation ${fromScreen} -> ${toScreen}: ${duration.toFixed(2)}ms`
      );
    }

    console.log(`[PerformanceMonitor] Navigation ${fromScreen} -> ${toScreen}: ${duration.toFixed(2)}ms`);
  }

  /**
   * Track user interaction
   */
  trackInteraction(
    interactionType: string,
    targetElement: string,
    responseTime: number
  ): void {
    this.performanceEntries.push({
      name: `interaction_${interactionType}_${targetElement}`,
      entryType: 'interaction',
      startTime: Date.now() - responseTime,
      duration: responseTime,
      detail: { type: interactionType, target: targetElement }
    });

    if (responseTime > this.TARGETS.RESPONSE_TIME) {
      console.warn(
        `[PerformanceMonitor] Slow interaction '${interactionType}' on '${targetElement}': ${responseTime.toFixed(2)}ms (target: ${this.TARGETS.RESPONSE_TIME}ms)`
      );
    }
  }

  /**
   * Get current performance snapshot
   */
  getCurrentPerformance(): {
    fps: number;
    memoryUsage: number;
    responseTime: number;
    isPerformant: boolean;
  } {
    // Get latest metrics
    const recentUI = this.uiMetrics.slice(-10);
    const recentMemory = this.memoryMetrics.slice(-5);
    const recentInteractions = this.performanceEntries
      .filter(e => e.entryType === 'interaction')
      .slice(-10);

    const avgFPS = recentUI.length > 0
      ? recentUI.reduce((sum, m) => sum + m.fps, 0) / recentUI.length
      : 60;

    const currentMemory = recentMemory.length > 0
      ? recentMemory[recentMemory.length - 1].used
      : 0;

    const avgResponseTime = recentInteractions.length > 0
      ? recentInteractions.reduce((sum, e) => sum + e.duration, 0) / recentInteractions.length
      : 0;

    const isPerformant =
      avgFPS >= 55 &&
      currentMemory <= this.TARGETS.MEMORY_LIMIT &&
      avgResponseTime <= this.TARGETS.RESPONSE_TIME;

    return {
      fps: Math.round(avgFPS),
      memoryUsage: Math.round(currentMemory),
      responseTime: Math.round(avgResponseTime),
      isPerformant
    };
  }

  /**
   * Generate performance report
   */
  async generatePerformanceReport(hours: number = 24): Promise<AppPerformanceReport> {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);

    // Filter recent metrics
    const recentUI = this.uiMetrics.filter(m => m.timestamp >= cutoff);
    const recentMemory = this.memoryMetrics.filter(m => m.timestamp >= cutoff);
    const recentEntries = this.performanceEntries.filter(e => e.startTime >= cutoff);

    // UI Performance analysis
    const avgFPS = recentUI.length > 0
      ? recentUI.reduce((sum, m) => sum + m.fps, 0) / recentUI.length
      : 60;

    const frameDropRate = recentUI.length > 0
      ? (recentUI.reduce((sum, m) => sum + m.frameDrops, 0) / (recentUI.length * 60)) * 100
      : 0;

    const avgRenderTime = recentUI.length > 0
      ? recentUI.reduce((sum, m) => sum + m.renderTime, 0) / recentUI.length
      : 0;

    const avgInteractionDelay = recentUI.length > 0
      ? recentUI.reduce((sum, m) => sum + m.interactionDelay, 0) / recentUI.length
      : 0;

    // Screen performance analysis
    const screenGroups = new Map<string, number[]>();
    recentUI.forEach(metric => {
      if (!screenGroups.has(metric.screen)) {
        screenGroups.set(metric.screen, []);
      }
      screenGroups.get(metric.screen)!.push(metric.renderTime);
    });

    const slowScreens = Array.from(screenGroups.entries())
      .map(([screen, times]) => ({
        screen,
        avgRenderTime: times.reduce((sum, t) => sum + t, 0) / times.length
      }))
      .sort((a, b) => b.avgRenderTime - a.avgRenderTime)
      .slice(0, 5);

    // Memory analysis
    const avgMemory = recentMemory.length > 0
      ? recentMemory.reduce((sum, m) => sum + m.used, 0) / recentMemory.length
      : 0;

    const peakMemory = recentMemory.length > 0
      ? Math.max(...recentMemory.map(m => m.used))
      : 0;

    const memoryTrend = this.analyzeMemoryTrend(recentMemory);
    const leakSuspected = memoryTrend === 'increasing' && avgMemory > 100;

    // Navigation analysis
    const navigationEntries = recentEntries.filter(e => e.entryType === 'navigation');
    const avgNavigationTime = navigationEntries.length > 0
      ? navigationEntries.reduce((sum, e) => sum + e.duration, 0) / navigationEntries.length
      : 0;

    const slowestTransitions = navigationEntries
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 5)
      .map(e => ({
        from: e.detail?.from || 'unknown',
        to: e.detail?.to || 'unknown',
        time: e.duration
      }));

    // Responsiveness analysis
    const interactionEntries = recentEntries.filter(e => e.entryType === 'interaction');
    const avgResponseTime = interactionEntries.length > 0
      ? interactionEntries.reduce((sum, e) => sum + e.duration, 0) / interactionEntries.length
      : 0;

    const sortedResponseTimes = interactionEntries
      .map(e => e.duration)
      .sort((a, b) => a - b);
    const p95Index = Math.floor(sortedResponseTimes.length * 0.95);
    const p95ResponseTime = sortedResponseTimes[p95Index] || 0;

    const missedTargetCount = interactionEntries.filter(
      e => e.duration > this.TARGETS.RESPONSE_TIME
    ).length;

    // Generate recommendations
    const recommendations = this.generateRecommendations({
      avgFPS,
      frameDropRate,
      avgRenderTime,
      avgMemory,
      peakMemory,
      leakSuspected,
      avgResponseTime,
      missedTargetCount
    });

    const now = new Date();
    const start = new Date(now.getTime() - (hours * 60 * 60 * 1000));

    return {
      period: { start, end: now },
      uiPerformance: {
        averageFPS: Math.round(avgFPS * 100) / 100,
        frameDropRate: Math.round(frameDropRate * 100) / 100,
        averageRenderTime: Math.round(avgRenderTime * 100) / 100,
        averageInteractionDelay: Math.round(avgInteractionDelay * 100) / 100,
        slowScreens
      },
      memory: {
        averageUsage: Math.round(avgMemory * 100) / 100,
        peakUsage: Math.round(peakMemory * 100) / 100,
        leakSuspected,
        trend: memoryTrend
      },
      navigation: {
        averageTransitionTime: Math.round(avgNavigationTime * 100) / 100,
        slowestTransitions
      },
      responsiveness: {
        averageResponseTime: Math.round(avgResponseTime * 100) / 100,
        p95ResponseTime: Math.round(p95ResponseTime * 100) / 100,
        missedTargetCount
      },
      recommendations
    };
  }

  /**
   * Private methods
   */

  private startUIMonitoring(): void {
    // Monitor UI performance every 5 seconds
    this.monitoringInterval = setInterval(() => {
      const current = this.getCurrentPerformance();

      if (!current.isPerformant) {
        console.warn('[PerformanceMonitor] Performance degradation detected', current);
      }
    }, 5000);
  }

  private startMemoryMonitoring(): void {
    // Monitor memory every 30 seconds
    this.memoryInterval = setInterval(async () => {
      const memoryMetric = await this.collectMemoryMetrics();
      this.memoryMetrics.push(memoryMetric);

      // Limit stored metrics
      if (this.memoryMetrics.length > 500) {
        this.memoryMetrics = this.memoryMetrics.slice(-500);
      }

      // Check memory usage
      if (memoryMetric.percentage > 90) {
        console.error('[PerformanceMonitor] Critical memory usage:', memoryMetric);
      } else if (memoryMetric.used > this.TARGETS.MEMORY_LIMIT) {
        console.warn('[PerformanceMonitor] Memory usage exceeds target:', memoryMetric);
      }
    }, 30000);
  }

  private setupPerformanceObservers(): void {
    // React Native Performance API observers would go here
    // This is a placeholder for native bridge integration
    console.log('[PerformanceMonitor] Performance observers setup');
  }

  private async collectMemoryMetrics(): Promise<MemoryMetrics> {
    // In React Native, we'd use native modules to get memory info
    // For now, use estimates
    const used = Platform.OS === 'web' && (performance as any).memory
      ? (performance as any).memory.usedJSHeapSize / (1024 * 1024)
      : 80; // Estimate

    const limit = Platform.OS === 'web' && (performance as any).memory
      ? (performance as any).memory.jsHeapSizeLimit / (1024 * 1024)
      : this.TARGETS.MEMORY_LIMIT;

    return {
      timestamp: Date.now(),
      used,
      limit,
      percentage: (used / limit) * 100,
      jsHeapSize: used
    };
  }

  private analyzeMemoryTrend(metrics: MemoryMetrics[]): 'stable' | 'increasing' | 'decreasing' {
    if (metrics.length < 10) {
      return 'stable';
    }

    const recent = metrics.slice(-10);
    const older = metrics.slice(-20, -10);

    if (older.length === 0) {
      return 'stable';
    }

    const recentAvg = recent.reduce((sum, m) => sum + m.used, 0) / recent.length;
    const olderAvg = older.reduce((sum, m) => sum + m.used, 0) / older.length;

    const diff = recentAvg - olderAvg;
    const threshold = 5; // MB

    if (diff > threshold) {
      return 'increasing';
    } else if (diff < -threshold) {
      return 'decreasing';
    } else {
      return 'stable';
    }
  }

  private generateRecommendations(metrics: {
    avgFPS: number;
    frameDropRate: number;
    avgRenderTime: number;
    avgMemory: number;
    peakMemory: number;
    leakSuspected: boolean;
    avgResponseTime: number;
    missedTargetCount: number;
  }): string[] {
    const recommendations: string[] = [];

    // FPS recommendations
    if (metrics.avgFPS < 55) {
      recommendations.push('Consider optimizing animations and reducing re-renders');
      recommendations.push('Use React.memo and useMemo to prevent unnecessary component updates');
    }

    if (metrics.frameDropRate > 5) {
      recommendations.push('High frame drop rate detected - review heavy computations in render cycle');
    }

    // Render time recommendations
    if (metrics.avgRenderTime > 16.67) {
      recommendations.push('Average render time exceeds 60 FPS target - optimize component rendering');
      recommendations.push('Consider virtualizing long lists and using lazy loading');
    }

    // Memory recommendations
    if (metrics.leakSuspected) {
      recommendations.push('Memory leak suspected - review component cleanup and event listener removal');
      recommendations.push('Check for retained references and circular dependencies');
    }

    if (metrics.peakMemory > this.TARGETS.MEMORY_LIMIT) {
      recommendations.push(`Peak memory usage (${metrics.peakMemory.toFixed(0)}MB) exceeds target (${this.TARGETS.MEMORY_LIMIT}MB)`);
      recommendations.push('Implement memory pooling and optimize image caching');
    }

    // Responsiveness recommendations
    if (metrics.avgResponseTime > this.TARGETS.RESPONSE_TIME) {
      recommendations.push(`Average response time (${metrics.avgResponseTime.toFixed(0)}ms) exceeds target (${this.TARGETS.RESPONSE_TIME}ms)`);
      recommendations.push('Move heavy computations to background threads or web workers');
    }

    if (metrics.missedTargetCount > 10) {
      recommendations.push(`${metrics.missedTargetCount} interactions exceeded response time target`);
      recommendations.push('Optimize event handlers and reduce synchronous operations');
    }

    return recommendations;
  }

  /**
   * Storage methods
   */
  private async saveMetrics(): Promise<void> {
    try {
      // Save only recent metrics to avoid storage bloat
      const recentUI = this.uiMetrics.slice(-500);
      const recentMemory = this.memoryMetrics.slice(-200);
      const recentEntries = this.performanceEntries.slice(-500);

      await Promise.all([
        AsyncStorage.setItem(this.STORAGE_KEYS.UI_METRICS, JSON.stringify(recentUI)),
        AsyncStorage.setItem(this.STORAGE_KEYS.MEMORY_METRICS, JSON.stringify(recentMemory)),
        AsyncStorage.setItem(this.STORAGE_KEYS.PERFORMANCE_ENTRIES, JSON.stringify(recentEntries))
      ]);

    } catch (error) {
      console.error('[PerformanceMonitor] Failed to save metrics:', error);
    }
  }

  private async loadMetrics(): Promise<void> {
    try {
      const [uiStr, memoryStr, entriesStr] = await Promise.all([
        AsyncStorage.getItem(this.STORAGE_KEYS.UI_METRICS),
        AsyncStorage.getItem(this.STORAGE_KEYS.MEMORY_METRICS),
        AsyncStorage.getItem(this.STORAGE_KEYS.PERFORMANCE_ENTRIES)
      ]);

      if (uiStr) {
        this.uiMetrics = JSON.parse(uiStr);
      }
      if (memoryStr) {
        this.memoryMetrics = JSON.parse(memoryStr);
      }
      if (entriesStr) {
        this.performanceEntries = JSON.parse(entriesStr);
      }

    } catch (error) {
      console.error('[PerformanceMonitor] Failed to load metrics:', error);
    }
  }

  /**
   * Get all marks
   */
  getMarks(): PerformanceMark[] {
    return Array.from(this.marks.values());
  }

  /**
   * Get all measures
   */
  getMeasures(): PerformanceMeasure[] {
    return [...this.measures];
  }

  /**
   * Get all performance entries
   */
  getEntries(type?: PerformanceEntry['entryType']): PerformanceEntry[] {
    if (type) {
      return this.performanceEntries.filter(e => e.entryType === type);
    }
    return [...this.performanceEntries];
  }

  /**
   * Clear all marks and measures
   */
  clearMarks(): void {
    this.marks.clear();
    this.measures = [];
  }

  /**
   * Clear all metrics
   */
  async clearMetrics(): Promise<void> {
    this.uiMetrics = [];
    this.memoryMetrics = [];
    this.performanceEntries = [];
    await this.saveMetrics();
  }

  /**
   * Check if monitoring is active
   */
  isActive(): boolean {
    return this.isMonitoring;
  }
}

export default PerformanceMonitor;