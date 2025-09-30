/**
 * Performance Tracking Service
 *
 * Advanced performance monitoring, profiling, and optimization tracking
 * for app responsiveness, render performance, and resource usage.
 */

export interface PerformanceTrace {
  id: string;
  name: string;
  startTime: number;
  endTime?: number;
  duration?: number;
  metrics?: Record<string, number>;
  attributes?: Record<string, string>;
}

export interface RenderMetrics {
  componentName: string;
  renderTime: number;
  updateCount: number;
  propsChanges: number;
  stateChanges: number;
  timestamp: Date;
}

export interface NetworkMetrics {
  url: string;
  method: string;
  requestSize: number;
  responseSize: number;
  duration: number;
  statusCode: number;
  success: boolean;
  timestamp: Date;
}

export interface ResourceUsage {
  timestamp: Date;
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  battery: {
    level: number;
    charging: boolean;
  };
  network: {
    type: string;
    effectiveType?: string;
  };
}

export class PerformanceTrackingService {
  private static instance: PerformanceTrackingService;
  private traces: Map<string, PerformanceTrace> = new Map();
  private completedTraces: PerformanceTrace[] = [];
  private renderMetrics: RenderMetrics[] = [];
  private networkMetrics: NetworkMetrics[] = [];
  private resourceUsage: ResourceUsage[] = [];

  private constructor() {
    this.startResourceMonitoring();
  }

  public static getInstance(): PerformanceTrackingService {
    if (!PerformanceTrackingService.instance) {
      PerformanceTrackingService.instance = new PerformanceTrackingService();
    }
    return PerformanceTrackingService.instance;
  }

  /**
   * Start a performance trace
   */
  public startTrace(name: string, attributes?: Record<string, string>): string {
    const traceId = this.generateTraceId();
    const trace: PerformanceTrace = {
      id: traceId,
      name,
      startTime: performance.now(),
      attributes,
      metrics: {},
    };

    this.traces.set(traceId, trace);
    return traceId;
  }

  /**
   * Stop a performance trace
   */
  public stopTrace(traceId: string, metrics?: Record<string, number>): void {
    const trace = this.traces.get(traceId);
    if (!trace) return;

    trace.endTime = performance.now();
    trace.duration = trace.endTime - trace.startTime;
    trace.metrics = { ...trace.metrics, ...metrics };

    this.completedTraces.push(trace);
    this.traces.delete(traceId);

    // Keep last 1000 traces
    if (this.completedTraces.length > 1000) {
      this.completedTraces = this.completedTraces.slice(-1000);
    }

    // Send to backend
    this.sendTraceToBackend(trace);
  }

  /**
   * Add metric to active trace
   */
  public putMetric(traceId: string, metricName: string, value: number): void {
    const trace = this.traces.get(traceId);
    if (trace && trace.metrics) {
      trace.metrics[metricName] = value;
    }
  }

  /**
   * Set trace attribute
   */
  public setAttribute(
    traceId: string,
    attributeName: string,
    value: string
  ): void {
    const trace = this.traces.get(traceId);
    if (trace) {
      if (!trace.attributes) {
        trace.attributes = {};
      }
      trace.attributes[attributeName] = value;
    }
  }

  /**
   * Track component render performance
   */
  public trackRender(
    componentName: string,
    renderTime: number,
    updateCount: number,
    propsChanges: number = 0,
    stateChanges: number = 0
  ): void {
    const metric: RenderMetrics = {
      componentName,
      renderTime,
      updateCount,
      propsChanges,
      stateChanges,
      timestamp: new Date(),
    };

    this.renderMetrics.push(metric);

    // Keep last 500 render metrics
    if (this.renderMetrics.length > 500) {
      this.renderMetrics = this.renderMetrics.slice(-500);
    }

    // Alert on slow renders
    if (renderTime > 100) {
      console.warn(
        `Slow render detected: ${componentName} took ${renderTime}ms`
      );
    }
  }

  /**
   * Track network request performance
   */
  public trackNetworkRequest(
    url: string,
    method: string,
    duration: number,
    requestSize: number,
    responseSize: number,
    statusCode: number
  ): void {
    const metric: NetworkMetrics = {
      url,
      method,
      requestSize,
      responseSize,
      duration,
      statusCode,
      success: statusCode >= 200 && statusCode < 300,
      timestamp: new Date(),
    };

    this.networkMetrics.push(metric);

    // Keep last 500 network metrics
    if (this.networkMetrics.length > 500) {
      this.networkMetrics = this.networkMetrics.slice(-500);
    }

    // Alert on slow requests
    if (duration > 3000) {
      console.warn(`Slow API request: ${url} took ${duration}ms`);
    }
  }

  /**
   * Get trace statistics
   */
  public getTraceStats(traceName?: string): {
    count: number;
    averageDuration: number;
    minDuration: number;
    maxDuration: number;
    p50: number;
    p95: number;
    p99: number;
  } {
    let traces = this.completedTraces;

    if (traceName) {
      traces = traces.filter(t => t.name === traceName);
    }

    if (traces.length === 0) {
      return {
        count: 0,
        averageDuration: 0,
        minDuration: 0,
        maxDuration: 0,
        p50: 0,
        p95: 0,
        p99: 0,
      };
    }

    const durations = traces
      .map(t => t.duration || 0)
      .sort((a, b) => a - b);
    const sum = durations.reduce((a, b) => a + b, 0);

    return {
      count: traces.length,
      averageDuration: sum / traces.length,
      minDuration: durations[0],
      maxDuration: durations[durations.length - 1],
      p50: this.percentile(durations, 50),
      p95: this.percentile(durations, 95),
      p99: this.percentile(durations, 99),
    };
  }

  /**
   * Get render performance for component
   */
  public getComponentRenderStats(componentName: string): {
    averageRenderTime: number;
    maxRenderTime: number;
    renderCount: number;
    totalUpdates: number;
  } {
    const metrics = this.renderMetrics.filter(
      m => m.componentName === componentName
    );

    if (metrics.length === 0) {
      return {
        averageRenderTime: 0,
        maxRenderTime: 0,
        renderCount: 0,
        totalUpdates: 0,
      };
    }

    const renderTimes = metrics.map(m => m.renderTime);
    const totalRenderTime = renderTimes.reduce((a, b) => a + b, 0);
    const totalUpdates = metrics.reduce((sum, m) => sum + m.updateCount, 0);

    return {
      averageRenderTime: totalRenderTime / metrics.length,
      maxRenderTime: Math.max(...renderTimes),
      renderCount: metrics.length,
      totalUpdates,
    };
  }

  /**
   * Get network performance statistics
   */
  public getNetworkStats(): {
    totalRequests: number;
    successRate: number;
    averageLatency: number;
    averageRequestSize: number;
    averageResponseSize: number;
    slowRequests: number;
  } {
    if (this.networkMetrics.length === 0) {
      return {
        totalRequests: 0,
        successRate: 0,
        averageLatency: 0,
        averageRequestSize: 0,
        averageResponseSize: 0,
        slowRequests: 0,
      };
    }

    const successfulRequests = this.networkMetrics.filter(m => m.success).length;
    const totalLatency = this.networkMetrics.reduce((sum, m) => sum + m.duration, 0);
    const totalRequestSize = this.networkMetrics.reduce(
      (sum, m) => sum + m.requestSize,
      0
    );
    const totalResponseSize = this.networkMetrics.reduce(
      (sum, m) => sum + m.responseSize,
      0
    );
    const slowRequests = this.networkMetrics.filter(m => m.duration > 3000).length;

    return {
      totalRequests: this.networkMetrics.length,
      successRate: successfulRequests / this.networkMetrics.length,
      averageLatency: totalLatency / this.networkMetrics.length,
      averageRequestSize: totalRequestSize / this.networkMetrics.length,
      averageResponseSize: totalResponseSize / this.networkMetrics.length,
      slowRequests,
    };
  }

  /**
   * Get current resource usage
   */
  public getCurrentResourceUsage(): ResourceUsage | null {
    if (this.resourceUsage.length === 0) return null;
    return this.resourceUsage[this.resourceUsage.length - 1];
  }

  /**
   * Get resource usage history
   */
  public getResourceUsageHistory(minutes: number = 60): ResourceUsage[] {
    const cutoff = new Date();
    cutoff.setMinutes(cutoff.getMinutes() - minutes);

    return this.resourceUsage.filter(u => u.timestamp >= cutoff);
  }

  /**
   * Record resource usage snapshot
   */
  private recordResourceUsage(): void {
    // This would integrate with React Native's APIs or native modules
    // For now, we'll create a placeholder structure
    const usage: ResourceUsage = {
      timestamp: new Date(),
      memory: {
        used: 0, // Would get from native module
        total: 0,
        percentage: 0,
      },
      battery: {
        level: 100, // Would get from native module
        charging: false,
      },
      network: {
        type: 'wifi', // Would get from NetInfo
      },
    };

    this.resourceUsage.push(usage);

    // Keep last 1 hour of data (60 samples at 1 min intervals)
    if (this.resourceUsage.length > 60) {
      this.resourceUsage = this.resourceUsage.slice(-60);
    }
  }

  /**
   * Start resource monitoring
   */
  private startResourceMonitoring(): void {
    // Record resource usage every minute
    setInterval(() => {
      this.recordResourceUsage();
    }, 60000);

    // Record initial snapshot
    this.recordResourceUsage();
  }

  /**
   * Calculate percentile
   */
  private percentile(values: number[], p: number): number {
    const index = Math.ceil((p / 100) * values.length) - 1;
    return values[index];
  }

  /**
   * Generate trace ID
   */
  private generateTraceId(): string {
    return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Send trace to backend
   */
  private async sendTraceToBackend(trace: PerformanceTrace): Promise<void> {
    // Implementation would send to backend analytics API
    // Example: await api.post('/monitoring/traces', trace);
  }

  /**
   * Clear old data
   */
  public clearOldData(): void {
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    this.renderMetrics = this.renderMetrics.filter(
      m => m.timestamp >= oneHourAgo
    );
    this.networkMetrics = this.networkMetrics.filter(
      m => m.timestamp >= oneHourAgo
    );
    this.resourceUsage = this.resourceUsage.filter(
      u => u.timestamp >= oneHourAgo
    );
  }
}

export default PerformanceTrackingService.getInstance();