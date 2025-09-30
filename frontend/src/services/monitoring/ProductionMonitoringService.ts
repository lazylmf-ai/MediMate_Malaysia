/**
 * Production Monitoring Service
 *
 * Real-time performance metrics, error tracking, and system health monitoring
 * for production environment.
 */

export interface PerformanceMetric {
  metric: string;
  value: number;
  unit: string;
  timestamp: Date;
  context?: Record<string, any>;
}

export interface SystemHealthStatus {
  overall: 'healthy' | 'degraded' | 'critical';
  components: {
    api: ComponentHealth;
    database: ComponentHealth;
    sync: ComponentHealth;
    notifications: ComponentHealth;
    offline: ComponentHealth;
  };
  lastCheck: Date;
}

export interface ComponentHealth {
  status: 'healthy' | 'degraded' | 'critical';
  latency?: number;
  errorRate?: number;
  lastError?: string;
  uptime?: number;
}

export interface Alert {
  id: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  type: string;
  message: string;
  timestamp: Date;
  resolved: boolean;
  context?: Record<string, any>;
}

export class ProductionMonitoringService {
  private static instance: ProductionMonitoringService;
  private metrics: PerformanceMetric[] = [];
  private alerts: Alert[] = [];
  private healthStatus: SystemHealthStatus;
  private monitoringInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.healthStatus = this.initializeHealthStatus();
    this.startMonitoring();
  }

  public static getInstance(): ProductionMonitoringService {
    if (!ProductionMonitoringService.instance) {
      ProductionMonitoringService.instance = new ProductionMonitoringService();
    }
    return ProductionMonitoringService.instance;
  }

  /**
   * Record a performance metric
   */
  public recordMetric(
    metric: string,
    value: number,
    unit: string,
    context?: Record<string, any>
  ): void {
    const performanceMetric: PerformanceMetric = {
      metric,
      value,
      unit,
      timestamp: new Date(),
      context,
    };

    this.metrics.push(performanceMetric);

    // Keep last 1000 metrics in memory
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }

    // Check for threshold violations
    this.checkMetricThresholds(performanceMetric);

    // Send to backend analytics
    this.sendMetricToBackend(performanceMetric);
  }

  /**
   * Record app launch time
   */
  public recordLaunchTime(launchTime: number, type: 'cold' | 'warm'): void {
    this.recordMetric(`app_launch_${type}`, launchTime, 'ms', { type });

    // Alert if launch time exceeds threshold
    const threshold = type === 'cold' ? 3000 : 1000;
    if (launchTime > threshold) {
      this.createAlert({
        severity: 'warning',
        type: 'performance',
        message: `${type} launch time exceeded threshold: ${launchTime}ms > ${threshold}ms`,
        context: { launchTime, threshold, type },
      });
    }
  }

  /**
   * Record API response time
   */
  public recordApiLatency(endpoint: string, latency: number, success: boolean): void {
    this.recordMetric('api_latency', latency, 'ms', { endpoint, success });

    // Update component health
    if (success) {
      this.updateComponentHealth('api', {
        status: latency < 1000 ? 'healthy' : 'degraded',
        latency,
      });
    } else {
      this.updateComponentHealth('api', {
        status: 'degraded',
        latency,
      });
    }
  }

  /**
   * Record database query performance
   */
  public recordDatabaseQuery(query: string, duration: number): void {
    this.recordMetric('database_query', duration, 'ms', { query });

    // Alert if query is slow
    if (duration > 200) {
      this.createAlert({
        severity: 'warning',
        type: 'performance',
        message: `Slow database query: ${duration}ms`,
        context: { query, duration },
      });
    }

    this.updateComponentHealth('database', {
      status: duration < 200 ? 'healthy' : 'degraded',
      latency: duration,
    });
  }

  /**
   * Record sync operation performance
   */
  public recordSyncOperation(duration: number, success: boolean, recordCount: number): void {
    this.recordMetric('sync_operation', duration, 'ms', { success, recordCount });

    this.updateComponentHealth('sync', {
      status: success && duration < 30000 ? 'healthy' : 'degraded',
      latency: duration,
    });
  }

  /**
   * Record memory usage
   */
  public recordMemoryUsage(usage: number): void {
    this.recordMetric('memory_usage', usage, 'MB');

    // Alert if memory exceeds threshold
    if (usage > 150) {
      this.createAlert({
        severity: 'warning',
        type: 'resource',
        message: `High memory usage: ${usage}MB`,
        context: { usage },
      });
    }
  }

  /**
   * Record battery usage
   */
  public recordBatteryImpact(percentage: number, period: string): void {
    this.recordMetric('battery_usage', percentage, '%', { period });

    // Alert if daily battery usage exceeds 5%
    if (period === 'daily' && percentage > 5) {
      this.createAlert({
        severity: 'warning',
        type: 'resource',
        message: `High battery usage: ${percentage}%`,
        context: { percentage, period },
      });
    }
  }

  /**
   * Create an alert
   */
  public createAlert(alert: Omit<Alert, 'id' | 'timestamp' | 'resolved'>): void {
    const newAlert: Alert = {
      ...alert,
      id: this.generateAlertId(),
      timestamp: new Date(),
      resolved: false,
    };

    this.alerts.push(newAlert);

    // Send critical alerts immediately
    if (alert.severity === 'critical') {
      this.sendAlertToBackend(newAlert);
      this.notifyTeam(newAlert);
    }

    // Keep last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }
  }

  /**
   * Resolve an alert
   */
  public resolveAlert(alertId: string): void {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
    }
  }

  /**
   * Get system health status
   */
  public getHealthStatus(): SystemHealthStatus {
    return { ...this.healthStatus };
  }

  /**
   * Get active alerts
   */
  public getActiveAlerts(): Alert[] {
    return this.alerts.filter(a => !a.resolved);
  }

  /**
   * Get performance metrics for time period
   */
  public getMetrics(
    metricName?: string,
    startTime?: Date,
    endTime?: Date
  ): PerformanceMetric[] {
    let filtered = [...this.metrics];

    if (metricName) {
      filtered = filtered.filter(m => m.metric === metricName);
    }

    if (startTime) {
      filtered = filtered.filter(m => m.timestamp >= startTime);
    }

    if (endTime) {
      filtered = filtered.filter(m => m.timestamp <= endTime);
    }

    return filtered;
  }

  /**
   * Get metric statistics
   */
  public getMetricStats(metricName: string): {
    count: number;
    average: number;
    min: number;
    max: number;
    p50: number;
    p95: number;
    p99: number;
  } {
    const metrics = this.metrics.filter(m => m.metric === metricName);

    if (metrics.length === 0) {
      return {
        count: 0,
        average: 0,
        min: 0,
        max: 0,
        p50: 0,
        p95: 0,
        p99: 0,
      };
    }

    const values = metrics.map(m => m.value).sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);

    return {
      count: values.length,
      average: sum / values.length,
      min: values[0],
      max: values[values.length - 1],
      p50: this.percentile(values, 50),
      p95: this.percentile(values, 95),
      p99: this.percentile(values, 99),
    };
  }

  /**
   * Start continuous monitoring
   */
  private startMonitoring(): void {
    // Check system health every minute
    this.monitoringInterval = setInterval(() => {
      this.checkSystemHealth();
    }, 60000);
  }

  /**
   * Check overall system health
   */
  private checkSystemHealth(): void {
    const components = this.healthStatus.components;

    // Determine overall health based on component status
    const criticalComponents = Object.values(components).filter(
      c => c.status === 'critical'
    );
    const degradedComponents = Object.values(components).filter(
      c => c.status === 'degraded'
    );

    if (criticalComponents.length > 0) {
      this.healthStatus.overall = 'critical';
    } else if (degradedComponents.length > 1) {
      this.healthStatus.overall = 'degraded';
    } else {
      this.healthStatus.overall = 'healthy';
    }

    this.healthStatus.lastCheck = new Date();

    // Alert if system is critical
    if (this.healthStatus.overall === 'critical') {
      this.createAlert({
        severity: 'critical',
        type: 'system',
        message: 'System health is critical',
        context: { components: criticalComponents },
      });
    }
  }

  /**
   * Update component health status
   */
  private updateComponentHealth(
    component: keyof SystemHealthStatus['components'],
    update: Partial<ComponentHealth>
  ): void {
    this.healthStatus.components[component] = {
      ...this.healthStatus.components[component],
      ...update,
    };
  }

  /**
   * Check metric thresholds
   */
  private checkMetricThresholds(metric: PerformanceMetric): void {
    const thresholds: Record<string, { warning: number; critical: number }> = {
      app_launch_cold: { warning: 3000, critical: 5000 },
      app_launch_warm: { warning: 1000, critical: 2000 },
      api_latency: { warning: 1000, critical: 3000 },
      database_query: { warning: 200, critical: 500 },
      sync_operation: { warning: 30000, critical: 60000 },
      memory_usage: { warning: 150, critical: 200 },
    };

    const threshold = thresholds[metric.metric];
    if (!threshold) return;

    if (metric.value >= threshold.critical) {
      this.createAlert({
        severity: 'critical',
        type: 'performance',
        message: `${metric.metric} critical threshold exceeded`,
        context: { metric: metric.metric, value: metric.value, threshold: threshold.critical },
      });
    } else if (metric.value >= threshold.warning) {
      this.createAlert({
        severity: 'warning',
        type: 'performance',
        message: `${metric.metric} warning threshold exceeded`,
        context: { metric: metric.metric, value: metric.value, threshold: threshold.warning },
      });
    }
  }

  /**
   * Initialize health status
   */
  private initializeHealthStatus(): SystemHealthStatus {
    return {
      overall: 'healthy',
      components: {
        api: { status: 'healthy' },
        database: { status: 'healthy' },
        sync: { status: 'healthy' },
        notifications: { status: 'healthy' },
        offline: { status: 'healthy' },
      },
      lastCheck: new Date(),
    };
  }

  /**
   * Calculate percentile
   */
  private percentile(values: number[], p: number): number {
    const index = Math.ceil((p / 100) * values.length) - 1;
    return values[index];
  }

  /**
   * Send metric to backend
   */
  private async sendMetricToBackend(metric: PerformanceMetric): Promise<void> {
    // Implementation would send to backend analytics API
  }

  /**
   * Send alert to backend
   */
  private async sendAlertToBackend(alert: Alert): Promise<void> {
    // Implementation would send to backend monitoring API
  }

  /**
   * Notify team of critical alert
   */
  private async notifyTeam(alert: Alert): Promise<void> {
    // Implementation would send to Slack/PagerDuty/etc.
    console.error('Critical alert:', alert);
  }

  /**
   * Generate alert ID
   */
  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Stop monitoring
   */
  public stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
  }
}

export default ProductionMonitoringService.getInstance();