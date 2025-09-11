/**
 * Performance Middleware
 * 
 * Monitors Redux performance, tracks render times, memory usage,
 * and battery impact with cultural context optimization.
 */

import { Middleware, MiddlewareAPI, Dispatch, AnyAction } from '@reduxjs/toolkit';
import type { RootState } from '../index';

interface PerformanceConfig {
  trackRenderTime: boolean;
  trackMemoryUsage: boolean;
  trackBatteryImpact: boolean;
}

interface PerformanceMetric {
  timestamp: number;
  actionType: string;
  executionTime: number;
  memoryUsage?: number;
  culturalContext?: any;
  stateSize?: number;
  renderTime?: number;
}

/**
 * Performance Monitor
 */
export class PerformanceMonitor {
  private static metrics: PerformanceMetric[] = [];
  private static actionStartTimes: Map<string, number> = new Map();
  private static memoryBaseline: number = 0;
  private static renderStartTimes: Map<string, number> = new Map();

  static startActionTiming(actionType: string): string {
    const timingId = `${actionType}-${Date.now()}-${Math.random()}`;
    this.actionStartTimes.set(timingId, performance.now());
    return timingId;
  }

  static endActionTiming(timingId: string, actionType: string, culturalContext?: any) {
    const startTime = this.actionStartTimes.get(timingId);
    if (startTime) {
      const executionTime = performance.now() - startTime;
      
      const metric: PerformanceMetric = {
        timestamp: Date.now(),
        actionType,
        executionTime,
        culturalContext,
        memoryUsage: this.getCurrentMemoryUsage(),
        stateSize: this.estimateStateSize(),
      };

      this.metrics.push(metric);
      this.actionStartTimes.delete(timingId);

      // Warn about slow actions
      if (executionTime > 16.67) { // More than one frame at 60fps
        console.warn(`Slow Redux action: ${actionType} took ${executionTime.toFixed(2)}ms`);
      }

      // Limit metrics array size
      if (this.metrics.length > 1000) {
        this.metrics.shift();
      }
    }
  }

  static startRenderTiming(componentName: string): string {
    const timingId = `render-${componentName}-${Date.now()}`;
    this.renderStartTimes.set(timingId, performance.now());
    return timingId;
  }

  static endRenderTiming(timingId: string, componentName: string) {
    const startTime = this.renderStartTimes.get(timingId);
    if (startTime) {
      const renderTime = performance.now() - startTime;
      
      // Find the most recent metric to attach render time
      if (this.metrics.length > 0) {
        this.metrics[this.metrics.length - 1].renderTime = renderTime;
      }

      this.renderStartTimes.delete(timingId);

      // Warn about slow renders
      if (renderTime > 16.67) {
        console.warn(`Slow render: ${componentName} took ${renderTime.toFixed(2)}ms`);
      }
    }
  }

  private static getCurrentMemoryUsage(): number {
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  }

  private static estimateStateSize(): number {
    // This is a rough estimation
    try {
      const stateString = JSON.stringify(global.reduxState || {});
      return stateString.length;
    } catch {
      return 0;
    }
  }

  static getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  static getAverageExecutionTime(actionType?: string): number {
    const filteredMetrics = actionType 
      ? this.metrics.filter(m => m.actionType === actionType)
      : this.metrics;

    if (filteredMetrics.length === 0) return 0;

    const total = filteredMetrics.reduce((sum, metric) => sum + metric.executionTime, 0);
    return total / filteredMetrics.length;
  }

  static getSlowActions(threshold: number = 16.67): PerformanceMetric[] {
    return this.metrics.filter(metric => metric.executionTime > threshold);
  }

  static getMemoryTrend(): { timestamp: number; usage: number }[] {
    return this.metrics
      .filter(m => m.memoryUsage !== undefined)
      .map(m => ({ timestamp: m.timestamp, usage: m.memoryUsage! }));
  }

  static clearMetrics() {
    this.metrics = [];
    this.actionStartTimes.clear();
    this.renderStartTimes.clear();
  }

  static setMemoryBaseline() {
    this.memoryBaseline = this.getCurrentMemoryUsage();
  }

  static getMemoryIncrease(): number {
    return this.getCurrentMemoryUsage() - this.memoryBaseline;
  }
}

/**
 * Battery Impact Monitor
 */
export class BatteryImpactMonitor {
  private static batteryLevel: number = 1;
  private static batteryCharging: boolean = false;
  private static highImpactActions: Set<string> = new Set();
  private static actionExecutionCounts: Map<string, number> = new Map();

  static initialize() {
    if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
      (navigator as any).getBattery().then((battery: any) => {
        this.batteryLevel = battery.level;
        this.batteryCharging = battery.charging;

        battery.addEventListener('levelchange', () => {
          this.batteryLevel = battery.level;
        });

        battery.addEventListener('chargingchange', () => {
          this.batteryCharging = battery.charging;
        });
      });
    }
  }

  static trackActionImpact(actionType: string, executionTime: number, culturalContext?: any) {
    // Count action executions
    const count = this.actionExecutionCounts.get(actionType) || 0;
    this.actionExecutionCounts.set(actionType, count + 1);

    // Classify high impact actions
    if (executionTime > 50 || this.isHighImpactAction(actionType)) {
      this.highImpactActions.add(actionType);
      
      // Log battery impact concerns
      if (this.batteryLevel < 0.2 && !this.batteryCharging) {
        console.warn(`High impact action on low battery: ${actionType}`);
      }
    }
  }

  private static isHighImpactAction(actionType: string): boolean {
    const highImpactTypes = [
      'sync/',
      'upload/',
      'download/',
      'analytics/',
      'notification/',
    ];

    return highImpactTypes.some(prefix => actionType.startsWith(prefix));
  }

  static shouldThrottleAction(actionType: string): boolean {
    // Throttle high impact actions when battery is low
    return this.batteryLevel < 0.15 && 
           !this.batteryCharging && 
           this.highImpactActions.has(actionType);
  }

  static getBatteryStatus() {
    return {
      level: this.batteryLevel,
      charging: this.batteryCharging,
      highImpactActions: Array.from(this.highImpactActions),
    };
  }

  static getActionExecutionCounts(): Map<string, number> {
    return new Map(this.actionExecutionCounts);
  }
}

/**
 * Cultural Performance Optimizer
 */
export class CulturalPerformanceOptimizer {
  private static culturalMetrics: Map<string, PerformanceMetric[]> = new Map();

  static trackCulturalPerformance(metric: PerformanceMetric) {
    if (!metric.culturalContext) return;

    const culturalKey = this.generateCulturalKey(metric.culturalContext);
    const existing = this.culturalMetrics.get(culturalKey) || [];
    existing.push(metric);

    this.culturalMetrics.set(culturalKey, existing);

    // Limit size per cultural context
    if (existing.length > 100) {
      existing.shift();
    }
  }

  private static generateCulturalKey(context: any): string {
    return `${context.language}-${context.timezone}-${context.prayerTimes?.enabled ? 'prayer' : 'no-prayer'}`;
  }

  static getCulturalPerformanceAnalysis() {
    const analysis: Record<string, {
      averageExecutionTime: number;
      slowActions: string[];
      actionCount: number;
    }> = {};

    for (const [culturalKey, metrics] of this.culturalMetrics.entries()) {
      const avgTime = metrics.reduce((sum, m) => sum + m.executionTime, 0) / metrics.length;
      const slowActions = metrics
        .filter(m => m.executionTime > 16.67)
        .map(m => m.actionType);

      analysis[culturalKey] = {
        averageExecutionTime: avgTime,
        slowActions: [...new Set(slowActions)],
        actionCount: metrics.length,
      };
    }

    return analysis;
  }

  static getOptimizationRecommendations() {
    const analysis = this.getCulturalPerformanceAnalysis();
    const recommendations = [];

    for (const [culturalKey, data] of Object.entries(analysis)) {
      if (data.averageExecutionTime > 10) {
        recommendations.push({
          culturalContext: culturalKey,
          issue: 'slow_performance',
          recommendation: 'Consider optimizing actions for this cultural context',
          details: `Average execution time: ${data.averageExecutionTime.toFixed(2)}ms`,
        });
      }

      if (data.slowActions.length > 5) {
        recommendations.push({
          culturalContext: culturalKey,
          issue: 'multiple_slow_actions',
          recommendation: 'Multiple slow actions detected',
          details: `Slow actions: ${data.slowActions.join(', ')}`,
        });
      }
    }

    return recommendations;
  }
}

/**
 * Performance Middleware Factory
 */
export function performanceMiddleware(config: PerformanceConfig): Middleware {
  // Initialize battery monitoring
  BatteryImpactMonitor.initialize();
  PerformanceMonitor.setMemoryBaseline();

  return (store: MiddlewareAPI<Dispatch, RootState>) => (next: Dispatch) => (action: AnyAction) => {
    const state = store.getState();
    const culturalContext = state.cultural.profile ? {
      language: state.cultural.profile.language,
      timezone: state.cultural.profile.timezone,
      prayerTimes: state.cultural.profile.prayerTimes,
    } : undefined;

    // Check if action should be throttled for battery optimization
    if (config.trackBatteryImpact && BatteryImpactMonitor.shouldThrottleAction(action.type)) {
      console.log(`Throttling action for battery optimization: ${action.type}`);
      return { type: 'BATTERY_THROTTLED', original: action.type };
    }

    // Start performance timing
    const timingId = PerformanceMonitor.startActionTiming(action.type);

    // Execute action
    const result = next(action);

    // End performance timing
    PerformanceMonitor.endActionTiming(timingId, action.type, culturalContext);

    // Track battery impact
    if (config.trackBatteryImpact) {
      const executionTime = PerformanceMonitor.getAverageExecutionTime(action.type);
      BatteryImpactMonitor.trackActionImpact(action.type, executionTime, culturalContext);
    }

    // Track cultural performance
    const latestMetric = PerformanceMonitor.getMetrics().slice(-1)[0];
    if (latestMetric && culturalContext) {
      CulturalPerformanceOptimizer.trackCulturalPerformance(latestMetric);
    }

    return result;
  };
}

/**
 * Performance Alerts
 */
export class PerformanceAlerts {
  private static alertThresholds = {
    executionTime: 50, // ms
    memoryIncrease: 10 * 1024 * 1024, // 10MB
    batteryLevel: 0.15, // 15%
    renderTime: 32, // ms (2 frames at 60fps)
  };

  static checkPerformanceAlerts() {
    const alerts = [];

    // Check slow actions
    const slowActions = PerformanceMonitor.getSlowActions(this.alertThresholds.executionTime);
    if (slowActions.length > 0) {
      alerts.push({
        type: 'slow_actions',
        message: `${slowActions.length} slow actions detected`,
        details: slowActions.map(a => `${a.actionType}: ${a.executionTime.toFixed(2)}ms`),
      });
    }

    // Check memory increase
    const memoryIncrease = PerformanceMonitor.getMemoryIncrease();
    if (memoryIncrease > this.alertThresholds.memoryIncrease) {
      alerts.push({
        type: 'memory_increase',
        message: 'Significant memory increase detected',
        details: `Increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`,
      });
    }

    // Check battery level
    const batteryStatus = BatteryImpactMonitor.getBatteryStatus();
    if (batteryStatus.level < this.alertThresholds.batteryLevel && !batteryStatus.charging) {
      alerts.push({
        type: 'low_battery',
        message: 'Low battery detected - optimizing performance',
        details: `Battery level: ${(batteryStatus.level * 100).toFixed(0)}%`,
      });
    }

    return alerts;
  }

  static setAlertThresholds(thresholds: Partial<typeof PerformanceAlerts.alertThresholds>) {
    this.alertThresholds = { ...this.alertThresholds, ...thresholds };
  }
}

/**
 * Performance Reporter
 */
export class PerformanceReporter {
  static generatePerformanceReport() {
    const metrics = PerformanceMonitor.getMetrics();
    const batteryStatus = BatteryImpactMonitor.getBatteryStatus();
    const culturalAnalysis = CulturalPerformanceOptimizer.getCulturalPerformanceAnalysis();
    const alerts = PerformanceAlerts.checkPerformanceAlerts();

    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalActions: metrics.length,
        averageExecutionTime: PerformanceMonitor.getAverageExecutionTime(),
        slowActionsCount: PerformanceMonitor.getSlowActions().length,
        memoryIncrease: PerformanceMonitor.getMemoryIncrease(),
      },
      battery: batteryStatus,
      cultural: culturalAnalysis,
      alerts,
      topSlowActions: PerformanceMonitor.getSlowActions()
        .sort((a, b) => b.executionTime - a.executionTime)
        .slice(0, 10)
        .map(m => ({ action: m.actionType, time: m.executionTime })),
      recommendations: CulturalPerformanceOptimizer.getOptimizationRecommendations(),
    };

    return report;
  }

  static logPerformanceReport() {
    const report = this.generatePerformanceReport();
    console.group('Performance Report');
    console.log('Summary:', report.summary);
    console.log('Battery:', report.battery);
    console.log('Alerts:', report.alerts);
    console.log('Top Slow Actions:', report.topSlowActions);
    console.groupEnd();
    return report;
  }
}