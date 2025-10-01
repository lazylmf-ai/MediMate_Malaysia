/**
 * Performance Monitoring and Analytics Utilities
 * 
 * Provides comprehensive performance monitoring including:
 * - API response time tracking
 * - UI render performance
 * - Memory usage monitoring
 * - Network connectivity analysis
 * - Battery usage optimization
 * - Cultural feature performance metrics
 */

import { logger, performanceLogger } from './logger';

export interface PerformanceMetrics {
  timestamp: number;
  category: 'api' | 'render' | 'navigation' | 'memory' | 'network' | 'cultural';
  operation: string;
  duration: number;
  success: boolean;
  metadata?: Record<string, any>;
}

export interface NetworkQuality {
  type: 'slow-2g' | '2g' | '3g' | '4g' | 'wifi' | 'unknown';
  effectiveType: string;
  downlink: number;
  rtt: number;
  saveData: boolean;
}

export interface MemoryInfo {
  used: number;
  total: number;
  percentage: number;
  jsHeapSizeLimit?: number;
  totalJSHeapSize?: number;
  usedJSHeapSize?: number;
}

export interface BatteryInfo {
  charging: boolean;
  level: number;
  chargingTime: number;
  dischargingTime: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private observers: Map<string, PerformanceObserver> = new Map();
  private isMonitoring = false;
  private culturalPerformanceThresholds = {
    prayerTimeQuery: 500, // 500ms max for prayer time queries
    halalValidation: 1000, // 1s max for halal validation
    translation: 2000, // 2s max for translation
    patientLookup: 800, // 800ms max for patient lookup
  };

  /**
   * Start performance monitoring
   */
  start(): void {
    if (this.isMonitoring) {
      return;
    }

    this.isMonitoring = true;
    this.setupPerformanceObservers();
    this.startMemoryMonitoring();
    this.startNetworkMonitoring();
    
    performanceLogger.info('Performance monitoring started');
  }

  /**
   * Stop performance monitoring
   */
  stop(): void {
    if (!this.isMonitoring) {
      return;
    }

    this.isMonitoring = false;
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
    
    performanceLogger.info('Performance monitoring stopped');
  }

  /**
   * Record API performance metric
   */
  recordAPIMetric(
    operation: string,
    duration: number,
    success: boolean,
    metadata?: {
      endpoint?: string;
      method?: string;
      statusCode?: number;
      responseSize?: number;
      cached?: boolean;
      cultural?: {
        language?: string;
        stateCode?: string;
        prayerTimeContext?: boolean;
      };
    }
  ): void {
    const metric: PerformanceMetrics = {
      timestamp: Date.now(),
      category: 'api',
      operation,
      duration,
      success,
      metadata,
    };

    this.metrics.push(metric);
    this.checkPerformanceThresholds(metric);
    
    performanceLogger.performanceLog(
      `API ${operation}`,
      duration,
      {
        success,
        ...metadata,
      }
    );
  }

  /**
   * Record UI render performance
   */
  recordRenderMetric(
    component: string,
    renderTime: number,
    reRenderCount?: number,
    props?: any
  ): void {
    const metric: PerformanceMetrics = {
      timestamp: Date.now(),
      category: 'render',
      operation: `render_${component}`,
      duration: renderTime,
      success: renderTime < 16, // 60fps target
      metadata: {
        component,
        reRenderCount,
        propsCount: props ? Object.keys(props).length : 0,
      },
    };

    this.metrics.push(metric);
    
    if (renderTime > 16) {
      performanceLogger.warn(
        `Slow render detected: ${component}`,
        {
          renderTime,
          reRenderCount,
          target: '16ms (60fps)',
        },
        'performance'
      );
    }
  }

  /**
   * Record navigation performance
   */
  recordNavigationMetric(
    from: string,
    to: string,
    duration: number,
    animated: boolean = true
  ): void {
    const metric: PerformanceMetrics = {
      timestamp: Date.now(),
      category: 'navigation',
      operation: `navigate_${from}_to_${to}`,
      duration,
      success: duration < (animated ? 300 : 100), // Animation tolerance
      metadata: {
        from,
        to,
        animated,
      },
    };

    this.metrics.push(metric);
    
    performanceLogger.performanceLog(
      `Navigation ${from} -> ${to}`,
      duration,
      { animated }
    );
  }

  /**
   * Record cultural feature performance
   */
  recordCulturalMetric(
    feature: 'prayerTime' | 'halalValidation' | 'translation' | 'culturalCalendar',
    operation: string,
    duration: number,
    success: boolean,
    metadata?: {
      language?: string;
      stateCode?: string;
      cacheHit?: boolean;
      itemsProcessed?: number;
    }
  ): void {
    const metric: PerformanceMetrics = {
      timestamp: Date.now(),
      category: 'cultural',
      operation: `${feature}_${operation}`,
      duration,
      success,
      metadata,
    };

    this.metrics.push(metric);
    
    // Check cultural-specific thresholds
    const threshold = this.culturalPerformanceThresholds[feature];
    if (threshold && duration > threshold) {
      performanceLogger.warn(
        `Slow cultural operation: ${feature} ${operation}`,
        {
          duration,
          threshold,
          ...metadata,
        },
        'performance'
      );
    }

    performanceLogger.performanceLog(
      `Cultural ${feature} ${operation}`,
      duration,
      metadata
    );
  }

  /**
   * Get current memory information
   */
  getMemoryInfo(): MemoryInfo {
    const memory: any = (performance as any).memory;
    const nav: any = navigator;

    if (memory) {
      return {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        percentage: (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100,
        jsHeapSizeLimit: memory.jsHeapSizeLimit,
        totalJSHeapSize: memory.totalJSHeapSize,
        usedJSHeapSize: memory.usedJSHeapSize,
      };
    } else if (nav.deviceMemory) {
      // Fallback for devices that support Device Memory API
      return {
        used: 0,
        total: nav.deviceMemory * 1024 * 1024 * 1024, // GB to bytes
        percentage: 0,
      };
    } else {
      return {
        used: 0,
        total: 0,
        percentage: 0,
      };
    }
  }

  /**
   * Get network quality information
   */
  getNetworkQuality(): NetworkQuality | null {
    const nav: any = navigator;
    const connection = nav.connection || nav.mozConnection || nav.webkitConnection;

    if (connection) {
      return {
        type: connection.type || 'unknown',
        effectiveType: connection.effectiveType || 'unknown',
        downlink: connection.downlink || 0,
        rtt: connection.rtt || 0,
        saveData: connection.saveData || false,
      };
    }

    return null;
  }

  /**
   * Get battery information (if available)
   */
  async getBatteryInfo(): Promise<BatteryInfo | null> {
    try {
      const nav: any = navigator;
      if (nav.getBattery) {
        const battery = await nav.getBattery();
        return {
          charging: battery.charging,
          level: battery.level,
          chargingTime: battery.chargingTime,
          dischargingTime: battery.dischargingTime,
        };
      }
    } catch (error) {
      performanceLogger.debug('Battery API not available', error);
    }

    return null;
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(timeRange?: { start: number; end: number }): {
    totalMetrics: number;
    averageAPIResponseTime: number;
    averageRenderTime: number;
    averageNavigationTime: number;
    culturalFeaturePerformance: Record<string, {
      averageTime: number;
      successRate: number;
      totalCalls: number;
    }>;
    slowestOperations: Array<{
      operation: string;
      duration: number;
      category: string;
    }>;
    errorRate: number;
    memoryUsage?: MemoryInfo;
    networkQuality?: NetworkQuality | null;
    batteryStatus?: BatteryInfo | null;
  } {
    const filteredMetrics = timeRange
      ? this.metrics.filter(m => m.timestamp >= timeRange.start && m.timestamp <= timeRange.end)
      : this.metrics;

    const apiMetrics = filteredMetrics.filter(m => m.category === 'api');
    const renderMetrics = filteredMetrics.filter(m => m.category === 'render');
    const navigationMetrics = filteredMetrics.filter(m => m.category === 'navigation');
    const culturalMetrics = filteredMetrics.filter(m => m.category === 'cultural');

    // Calculate averages
    const averageAPIResponseTime = apiMetrics.length > 0
      ? apiMetrics.reduce((sum, m) => sum + m.duration, 0) / apiMetrics.length
      : 0;

    const averageRenderTime = renderMetrics.length > 0
      ? renderMetrics.reduce((sum, m) => sum + m.duration, 0) / renderMetrics.length
      : 0;

    const averageNavigationTime = navigationMetrics.length > 0
      ? navigationMetrics.reduce((sum, m) => sum + m.duration, 0) / navigationMetrics.length
      : 0;

    // Cultural feature performance
    const culturalFeaturePerformance: Record<string, {
      averageTime: number;
      successRate: number;
      totalCalls: number;
    }> = {};

    const culturalGroups = new Map<string, PerformanceMetrics[]>();
    culturalMetrics.forEach(metric => {
      const feature = metric.operation.split('_')[0];
      if (!culturalGroups.has(feature)) {
        culturalGroups.set(feature, []);
      }
      culturalGroups.get(feature)!.push(metric);
    });

    culturalGroups.forEach((metrics, feature) => {
      culturalFeaturePerformance[feature] = {
        averageTime: metrics.reduce((sum, m) => sum + m.duration, 0) / metrics.length,
        successRate: (metrics.filter(m => m.success).length / metrics.length) * 100,
        totalCalls: metrics.length,
      };
    });

    // Slowest operations
    const slowestOperations = filteredMetrics
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10)
      .map(m => ({
        operation: m.operation,
        duration: m.duration,
        category: m.category,
      }));

    // Error rate
    const errorRate = filteredMetrics.length > 0
      ? (filteredMetrics.filter(m => !m.success).length / filteredMetrics.length) * 100
      : 0;

    return {
      totalMetrics: filteredMetrics.length,
      averageAPIResponseTime,
      averageRenderTime,
      averageNavigationTime,
      culturalFeaturePerformance,
      slowestOperations,
      errorRate,
      memoryUsage: this.getMemoryInfo(),
      networkQuality: this.getNetworkQuality(),
    };
  }

  /**
   * Generate performance report
   */
  async generatePerformanceReport(): Promise<{
    summary: ReturnType<PerformanceMonitor['getPerformanceSummary']>;
    recommendations: string[];
    culturalOptimizations: string[];
  }> {
    const summary = this.getPerformanceSummary();
    const recommendations: string[] = [];
    const culturalOptimizations: string[] = [];

    // API performance recommendations
    if (summary.averageAPIResponseTime > 1000) {
      recommendations.push('Consider implementing response caching for frequently accessed endpoints');
      recommendations.push('Review API payload sizes and implement data pagination');
    }

    if (summary.averageAPIResponseTime > 2000) {
      recommendations.push('Implement request batching to reduce network round trips');
      recommendations.push('Consider using GraphQL for more efficient data fetching');
    }

    // Render performance recommendations
    if (summary.averageRenderTime > 16) {
      recommendations.push('Optimize component re-renders using React.memo or useMemo');
      recommendations.push('Consider virtualizing long lists to improve scroll performance');
    }

    // Cultural feature optimizations
    Object.entries(summary.culturalFeaturePerformance).forEach(([feature, metrics]) => {
      if (metrics.averageTime > 500) {
        culturalOptimizations.push(`Optimize ${feature} feature performance (current: ${metrics.averageTime}ms)`);
      }

      if (metrics.successRate < 95) {
        culturalOptimizations.push(`Improve ${feature} reliability (current success rate: ${metrics.successRate}%)`);
      }

      // Specific cultural optimizations
      switch (feature) {
        case 'prayerTime':
          culturalOptimizations.push('Cache prayer times locally for current day to avoid repeated API calls');
          break;
        case 'halalValidation':
          culturalOptimizations.push('Implement halal medication database caching for offline access');
          break;
        case 'translation':
          culturalOptimizations.push('Pre-cache common medical translations for faster response');
          break;
      }
    });

    // Memory recommendations
    if (summary.memoryUsage && summary.memoryUsage.percentage > 80) {
      recommendations.push('Memory usage is high - consider implementing memory cleanup routines');
      recommendations.push('Review image caching strategies and implement proper cleanup');
    }

    // Network quality recommendations
    if (summary.networkQuality) {
      if (summary.networkQuality.effectiveType === 'slow-2g' || summary.networkQuality.effectiveType === '2g') {
        recommendations.push('Optimize for slow network connections with data compression');
        recommendations.push('Implement progressive loading for better perceived performance');
      }

      if (summary.networkQuality.saveData) {
        recommendations.push('Respect user data saving preferences by reducing non-essential requests');
      }
    }

    // Battery optimization recommendations
    const batteryInfo = await this.getBatteryInfo();
    if (batteryInfo && !batteryInfo.charging && batteryInfo.level < 0.2) {
      recommendations.push('Implement battery-saving mode with reduced background activity');
      recommendations.push('Defer non-critical operations when battery is low');
    }

    return {
      summary,
      recommendations,
      culturalOptimizations,
    };
  }

  /**
   * Private methods
   */
  private setupPerformanceObservers(): void {
    // Observe navigation performance
    if ('PerformanceObserver' in window) {
      try {
        const navigationObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            if (entry.entryType === 'navigation') {
              const navEntry = entry as PerformanceNavigationTiming;
              this.recordNavigationMetric(
                'app_start',
                'initial_load',
                navEntry.loadEventEnd - navEntry.fetchStart,
                false
              );
            }
          });
        });

        navigationObserver.observe({ entryTypes: ['navigation'] });
        this.observers.set('navigation', navigationObserver);
      } catch (error) {
        performanceLogger.debug('Navigation observer not supported', error);
      }

      // Observe paint performance
      try {
        const paintObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach(entry => {
            if (entry.name === 'first-contentful-paint') {
              performanceLogger.performanceLog('First Contentful Paint', entry.startTime);
            }
          });
        });

        paintObserver.observe({ entryTypes: ['paint'] });
        this.observers.set('paint', paintObserver);
      } catch (error) {
        performanceLogger.debug('Paint observer not supported', error);
      }
    }
  }

  private startMemoryMonitoring(): void {
    // Monitor memory usage every minute
    const memoryInterval = setInterval(() => {
      const memoryInfo = this.getMemoryInfo();
      
      if (memoryInfo.percentage > 90) {
        performanceLogger.warn('High memory usage detected', memoryInfo, 'performance');
      }
      
      this.recordMetric({
        timestamp: Date.now(),
        category: 'memory',
        operation: 'memory_usage',
        duration: memoryInfo.percentage,
        success: memoryInfo.percentage < 80,
        metadata: memoryInfo,
      });
    }, 60000); // Every minute

    // Clean up interval when monitoring stops
    const originalStop = this.stop.bind(this);
    this.stop = () => {
      clearInterval(memoryInterval);
      originalStop();
    };
  }

  private startNetworkMonitoring(): void {
    const nav: any = navigator;
    const connection = nav.connection || nav.mozConnection || nav.webkitConnection;

    if (connection) {
      const handleNetworkChange = () => {
        const networkQuality = this.getNetworkQuality();
        if (networkQuality) {
          performanceLogger.info('Network quality changed', networkQuality, 'network');
          
          // Adjust performance thresholds based on network quality
          this.adjustThresholdsForNetwork(networkQuality);
        }
      };

      connection.addEventListener('change', handleNetworkChange);
    }
  }

  private adjustThresholdsForNetwork(network: NetworkQuality): void {
    const multiplier = network.effectiveType === 'slow-2g' ? 4 :
                     network.effectiveType === '2g' ? 3 :
                     network.effectiveType === '3g' ? 2 : 1;

    // Adjust cultural performance thresholds based on network speed
    Object.keys(this.culturalPerformanceThresholds).forEach(key => {
      const originalThreshold = this.culturalPerformanceThresholds[key as keyof typeof this.culturalPerformanceThresholds];
      this.culturalPerformanceThresholds[key as keyof typeof this.culturalPerformanceThresholds] = originalThreshold * multiplier;
    });

    performanceLogger.info(
      `Performance thresholds adjusted for ${network.effectiveType} network`,
      { multiplier, thresholds: this.culturalPerformanceThresholds }
    );
  }

  private checkPerformanceThresholds(metric: PerformanceMetrics): void {
    if (metric.category === 'cultural') {
      const feature = metric.operation.split('_')[0] as keyof typeof this.culturalPerformanceThresholds;
      const threshold = this.culturalPerformanceThresholds[feature];
      
      if (threshold && metric.duration > threshold) {
        performanceLogger.warn(
          `Performance threshold exceeded: ${metric.operation}`,
          {
            duration: metric.duration,
            threshold,
            exceedBy: metric.duration - threshold,
          },
          'performance'
        );
      }
    }
  }

  private recordMetric(metric: PerformanceMetrics): void {
    this.metrics.push(metric);
    
    // Keep only last 1000 metrics in memory
    if (this.metrics.length > 1000) {
      this.metrics.shift();
    }
  }

  /**
   * Clear all performance data
   */
  clearMetrics(): void {
    this.metrics = [];
    performanceLogger.info('Performance metrics cleared');
  }

  /**
   * Export metrics for external analysis
   */
  exportMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }
}

// Create global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// Auto-start monitoring in development mode
if (__DEV__) {
  performanceMonitor.start();
}

// Helper functions for common performance measurements
export const measureAsync = async <T>(
  operation: string,
  fn: () => Promise<T>,
  category: 'api' | 'cultural' = 'api'
): Promise<T> => {
  const start = performance.now();
  let success = true;
  let result: T;

  try {
    result = await fn();
    return result;
  } catch (error) {
    success = false;
    throw error;
  } finally {
    const duration = performance.now() - start;
    
    if (category === 'api') {
      performanceMonitor.recordAPIMetric(operation, duration, success);
    } else {
      performanceMonitor.recordCulturalMetric(
        operation.split('_')[0] as any,
        operation.split('_').slice(1).join('_'),
        duration,
        success
      );
    }
  }
};

export const measureSync = <T>(
  operation: string,
  fn: () => T,
  category: 'render' | 'navigation' = 'render'
): T => {
  const start = performance.now();
  let success = true;
  let result: T;

  try {
    result = fn();
    return result;
  } catch (error) {
    success = false;
    throw error;
  } finally {
    const duration = performance.now() - start;
    
    if (category === 'render') {
      performanceMonitor.recordRenderMetric(operation, duration);
    } else {
      performanceMonitor.recordNavigationMetric('unknown', operation, duration);
    }
  }
};

export default performanceMonitor;