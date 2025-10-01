/**
 * Resource Monitor
 *
 * Issue #27 Stream D - Battery & Storage Optimization
 *
 * Comprehensive resource monitoring system:
 * - CPU usage tracking
 * - Memory usage monitoring
 * - Network activity tracking
 * - Battery consumption analysis
 * - Performance metrics collection
 * - Resource usage alerts
 *
 * Provides real-time insights for optimization decisions
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Battery from 'expo-battery';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

export interface CPUMetrics {
  usage: number; // percentage (0-100)
  temperature?: number; // celsius
  throttled: boolean;
  coresActive: number;
  frequency?: number; // MHz
  lastUpdated: Date;
}

export interface MemoryMetrics {
  total: number; // bytes
  used: number; // bytes
  available: number; // bytes
  usagePercent: number;
  peak: number; // bytes
  leakDetected: boolean;
  gcFrequency: number; // per hour
  lastUpdated: Date;
}

export interface NetworkMetrics {
  type: 'wifi' | 'cellular' | 'none' | 'unknown';
  isConnected: boolean;
  isInternetReachable: boolean;
  signalStrength?: number; // percentage
  dataUsage: {
    sent: number; // bytes
    received: number; // bytes
    total: number; // bytes
  };
  requestsPerMinute: number;
  averageLatency: number; // milliseconds
  lastUpdated: Date;
}

export interface BatteryMetrics {
  level: number; // percentage (0-100)
  state: 'charging' | 'discharging' | 'full' | 'unknown';
  health?: 'good' | 'overheat' | 'dead' | 'unknown';
  temperature?: number; // celsius
  voltage?: number; // volts
  estimatedTimeRemaining?: number; // minutes
  chargingRate?: number; // percentage per hour
  drainRate?: number; // percentage per hour
  lastUpdated: Date;
}

export interface PerformanceMetrics {
  fps: number;
  frameDrops: number;
  renderTime: number; // milliseconds
  jsThreadLoad: number; // percentage
  uiThreadLoad: number; // percentage
  bridgeUtilization: number; // percentage
  lastUpdated: Date;
}

export interface ResourceSnapshot {
  timestamp: Date;
  cpu: CPUMetrics;
  memory: MemoryMetrics;
  network: NetworkMetrics;
  battery: BatteryMetrics;
  performance: PerformanceMetrics;
}

export interface ResourceAlert {
  alertId: string;
  severity: 'info' | 'warning' | 'critical';
  category: 'cpu' | 'memory' | 'network' | 'battery' | 'performance';
  message: string;
  metric: string;
  currentValue: number;
  threshold: number;
  recommendations: string[];
  timestamp: Date;
}

export interface ResourceThresholds {
  cpu: {
    warning: number; // percentage
    critical: number;
  };
  memory: {
    warning: number; // percentage
    critical: number;
  };
  battery: {
    warning: number; // percentage
    critical: number;
  };
  performance: {
    minFps: number;
    maxFrameDrops: number;
    maxRenderTime: number; // milliseconds
  };
  network: {
    maxLatency: number; // milliseconds
    maxRequestsPerMinute: number;
  };
}

export interface MonitoringConfig {
  enabled: boolean;
  samplingInterval: number; // milliseconds
  snapshotRetention: number; // snapshots to keep
  enableAlerts: boolean;
  enableTrending: boolean;
  thresholds: ResourceThresholds;
}

class ResourceMonitor {
  private static instance: ResourceMonitor;

  private snapshots: ResourceSnapshot[] = [];
  private alerts: ResourceAlert[] = [];
  private config: MonitoringConfig;

  private monitoringInterval?: NodeJS.Timeout;
  private batterySubscription?: any;
  private networkSubscription?: any;

  private currentMetrics: {
    cpu: CPUMetrics;
    memory: MemoryMetrics;
    network: NetworkMetrics;
    battery: BatteryMetrics;
    performance: PerformanceMetrics;
  };

  private readonly STORAGE_KEYS = {
    MONITORING_CONFIG: 'resource_monitoring_config',
    SNAPSHOTS: 'resource_snapshots',
    ALERTS: 'resource_alerts',
  };

  private readonly MAX_SNAPSHOTS = 100;

  private constructor() {
    this.config = {
      enabled: true,
      samplingInterval: 60000, // 1 minute
      snapshotRetention: 100,
      enableAlerts: true,
      enableTrending: true,
      thresholds: {
        cpu: {
          warning: 70,
          critical: 90,
        },
        memory: {
          warning: 75,
          critical: 90,
        },
        battery: {
          warning: 20,
          critical: 10,
        },
        performance: {
          minFps: 30,
          maxFrameDrops: 10,
          maxRenderTime: 100,
        },
        network: {
          maxLatency: 1000,
          maxRequestsPerMinute: 60,
        },
      },
    };

    this.currentMetrics = {
      cpu: this.getDefaultCPUMetrics(),
      memory: this.getDefaultMemoryMetrics(),
      network: this.getDefaultNetworkMetrics(),
      battery: this.getDefaultBatteryMetrics(),
      performance: this.getDefaultPerformanceMetrics(),
    };
  }

  static getInstance(): ResourceMonitor {
    if (!ResourceMonitor.instance) {
      ResourceMonitor.instance = new ResourceMonitor();
    }
    return ResourceMonitor.instance;
  }

  /**
   * Initialize Resource Monitor
   */
  async initialize(): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('Initializing Resource Monitor...');

      // Load configuration
      await this.loadConfiguration();
      await this.loadSnapshots();
      await this.loadAlerts();

      // Start monitoring if enabled
      if (this.config.enabled) {
        await this.startMonitoring();
      }

      console.log('Resource Monitor initialized successfully');
      return { success: true };
    } catch (error) {
      console.error('Resource Monitor initialization failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Initialization failed',
      };
    }
  }

  /**
   * Start resource monitoring
   */
  async startMonitoring(): Promise<void> {
    try {
      console.log('Starting resource monitoring...');

      // Subscribe to battery changes
      this.batterySubscription = Battery.addBatteryLevelListener(({ batteryLevel }) => {
        this.currentMetrics.battery.level = batteryLevel * 100;
        this.currentMetrics.battery.lastUpdated = new Date();
      });

      Battery.addBatteryStateListener(({ batteryState }) => {
        this.currentMetrics.battery.state = this.mapBatteryState(batteryState);
      });

      // Subscribe to network changes
      this.networkSubscription = NetInfo.addEventListener((state: NetInfoState) => {
        this.updateNetworkMetrics(state);
      });

      // Start periodic sampling
      this.monitoringInterval = setInterval(async () => {
        await this.collectSnapshot();
      }, this.config.samplingInterval);

      // Initial snapshot
      await this.collectSnapshot();

      console.log('Resource monitoring started');
    } catch (error) {
      console.error('Failed to start monitoring:', error);
      throw error;
    }
  }

  /**
   * Stop resource monitoring
   */
  async stopMonitoring(): Promise<void> {
    try {
      if (this.monitoringInterval) {
        clearInterval(this.monitoringInterval);
        this.monitoringInterval = undefined;
      }

      if (this.batterySubscription) {
        this.batterySubscription.remove();
        this.batterySubscription = undefined;
      }

      if (this.networkSubscription) {
        this.networkSubscription();
        this.networkSubscription = undefined;
      }

      console.log('Resource monitoring stopped');
    } catch (error) {
      console.error('Error stopping monitoring:', error);
    }
  }

  /**
   * Get current resource snapshot
   */
  getCurrentSnapshot(): ResourceSnapshot {
    return {
      timestamp: new Date(),
      cpu: { ...this.currentMetrics.cpu },
      memory: { ...this.currentMetrics.memory },
      network: { ...this.currentMetrics.network },
      battery: { ...this.currentMetrics.battery },
      performance: { ...this.currentMetrics.performance },
    };
  }

  /**
   * Get historical snapshots
   */
  getSnapshots(limit?: number): ResourceSnapshot[] {
    if (limit) {
      return this.snapshots.slice(-limit);
    }
    return [...this.snapshots];
  }

  /**
   * Get resource alerts
   */
  getAlerts(severity?: ResourceAlert['severity']): ResourceAlert[] {
    if (severity) {
      return this.alerts.filter(alert => alert.severity === severity);
    }
    return [...this.alerts];
  }

  /**
   * Clear resource alert
   */
  async clearAlert(alertId: string): Promise<void> {
    this.alerts = this.alerts.filter(alert => alert.alertId !== alertId);
    await this.saveAlerts();
  }

  /**
   * Get resource trends
   */
  getTrends(
    metric: 'cpu' | 'memory' | 'battery' | 'network',
    period: number = 60 // minutes
  ): {
    average: number;
    min: number;
    max: number;
    trend: 'increasing' | 'decreasing' | 'stable';
    dataPoints: Array<{ timestamp: Date; value: number }>;
  } {
    const cutoffTime = Date.now() - period * 60 * 1000;
    const relevantSnapshots = this.snapshots.filter(
      s => s.timestamp.getTime() >= cutoffTime
    );

    if (relevantSnapshots.length === 0) {
      return {
        average: 0,
        min: 0,
        max: 0,
        trend: 'stable',
        dataPoints: [],
      };
    }

    const dataPoints = relevantSnapshots.map(s => {
      let value = 0;
      switch (metric) {
        case 'cpu':
          value = s.cpu.usage;
          break;
        case 'memory':
          value = s.memory.usagePercent;
          break;
        case 'battery':
          value = s.battery.level;
          break;
        case 'network':
          value = s.network.requestsPerMinute;
          break;
      }
      return { timestamp: s.timestamp, value };
    });

    const values = dataPoints.map(dp => dp.value);
    const average = values.reduce((sum, v) => sum + v, 0) / values.length;
    const min = Math.min(...values);
    const max = Math.max(...values);

    // Simple trend detection
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    const firstAvg = firstHalf.reduce((sum, v) => sum + v, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, v) => sum + v, 0) / secondHalf.length;

    let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
    if (secondAvg > firstAvg * 1.1) {
      trend = 'increasing';
    } else if (secondAvg < firstAvg * 0.9) {
      trend = 'decreasing';
    }

    return {
      average: Math.round(average * 100) / 100,
      min: Math.round(min * 100) / 100,
      max: Math.round(max * 100) / 100,
      trend,
      dataPoints,
    };
  }

  /**
   * Get resource health score (0-100)
   */
  getHealthScore(): {
    overall: number;
    breakdown: {
      cpu: number;
      memory: number;
      battery: number;
      performance: number;
      network: number;
    };
  } {
    const cpu = this.calculateCPUHealth();
    const memory = this.calculateMemoryHealth();
    const battery = this.calculateBatteryHealth();
    const performance = this.calculatePerformanceHealth();
    const network = this.calculateNetworkHealth();

    const overall = (cpu + memory + battery + performance + network) / 5;

    return {
      overall: Math.round(overall),
      breakdown: {
        cpu: Math.round(cpu),
        memory: Math.round(memory),
        battery: Math.round(battery),
        performance: Math.round(performance),
        network: Math.round(network),
      },
    };
  }

  /**
   * Update configuration
   */
  async updateConfiguration(config: Partial<MonitoringConfig>): Promise<void> {
    this.config = { ...this.config, ...config };
    await AsyncStorage.setItem(
      this.STORAGE_KEYS.MONITORING_CONFIG,
      JSON.stringify(this.config)
    );

    // Restart monitoring if interval changed
    if (config.samplingInterval !== undefined && this.config.enabled) {
      await this.stopMonitoring();
      await this.startMonitoring();
    }
  }

  /**
   * Shutdown and cleanup
   */
  async shutdown(): Promise<void> {
    try {
      await this.stopMonitoring();
      await this.saveSnapshots();
      await this.saveAlerts();
      console.log('Resource Monitor shutdown complete');
    } catch (error) {
      console.error('Error during shutdown:', error);
    }
  }

  /**
   * Private helper methods
   */

  private async collectSnapshot(): Promise<void> {
    try {
      // Update metrics
      await this.updateCPUMetrics();
      await this.updateMemoryMetrics();
      await this.updateBatteryMetrics();
      await this.updatePerformanceMetrics();

      // Create snapshot
      const snapshot = this.getCurrentSnapshot();
      this.snapshots.push(snapshot);

      // Maintain retention limit
      if (this.snapshots.length > this.config.snapshotRetention) {
        this.snapshots.shift();
      }

      // Check thresholds and create alerts
      if (this.config.enableAlerts) {
        this.checkThresholds(snapshot);
      }

      // Periodically save snapshots
      if (this.snapshots.length % 10 === 0) {
        await this.saveSnapshots();
      }
    } catch (error) {
      console.error('Failed to collect snapshot:', error);
    }
  }

  private async updateCPUMetrics(): Promise<void> {
    // Simplified CPU metrics (real implementation would use native modules)
    this.currentMetrics.cpu = {
      usage: Math.random() * 30 + 10, // 10-40% simulated
      throttled: false,
      coresActive: 4,
      lastUpdated: new Date(),
    };
  }

  private async updateMemoryMetrics(): Promise<void> {
    // Simplified memory metrics (real implementation would use performance API)
    const total = 4 * 1024 * 1024 * 1024; // 4GB
    const used = total * (0.3 + Math.random() * 0.2); // 30-50%
    const available = total - used;

    this.currentMetrics.memory = {
      total,
      used,
      available,
      usagePercent: (used / total) * 100,
      peak: Math.max(this.currentMetrics.memory.peak, used),
      leakDetected: false,
      gcFrequency: 5,
      lastUpdated: new Date(),
    };
  }

  private async updateBatteryMetrics(): Promise<void> {
    try {
      const batteryLevel = await Battery.getBatteryLevelAsync();
      const batteryState = await Battery.getBatteryStateAsync();

      this.currentMetrics.battery = {
        level: batteryLevel * 100,
        state: this.mapBatteryState(batteryState),
        lastUpdated: new Date(),
      };

      // Calculate drain rate if discharging
      if (this.currentMetrics.battery.state === 'discharging') {
        this.calculateBatteryDrainRate();
      }
    } catch (error) {
      console.error('Failed to update battery metrics:', error);
    }
  }

  private async updatePerformanceMetrics(): Promise<void> {
    // Simplified performance metrics
    this.currentMetrics.performance = {
      fps: 58 + Math.random() * 4, // 58-62 fps simulated
      frameDrops: Math.floor(Math.random() * 3),
      renderTime: 10 + Math.random() * 10, // 10-20ms
      jsThreadLoad: Math.random() * 40,
      uiThreadLoad: Math.random() * 30,
      bridgeUtilization: Math.random() * 20,
      lastUpdated: new Date(),
    };
  }

  private updateNetworkMetrics(state: NetInfoState): void {
    this.currentMetrics.network = {
      type: (state.type as any) || 'unknown',
      isConnected: state.isConnected || false,
      isInternetReachable: state.isInternetReachable || false,
      dataUsage: {
        sent: this.currentMetrics.network.dataUsage.sent,
        received: this.currentMetrics.network.dataUsage.received,
        total: this.currentMetrics.network.dataUsage.total,
      },
      requestsPerMinute: this.currentMetrics.network.requestsPerMinute,
      averageLatency: this.currentMetrics.network.averageLatency,
      lastUpdated: new Date(),
    };
  }

  private checkThresholds(snapshot: ResourceSnapshot): void {
    // Check CPU thresholds
    if (snapshot.cpu.usage >= this.config.thresholds.cpu.critical) {
      this.addAlert({
        severity: 'critical',
        category: 'cpu',
        message: `CPU usage critically high (${snapshot.cpu.usage.toFixed(1)}%)`,
        metric: 'cpu.usage',
        currentValue: snapshot.cpu.usage,
        threshold: this.config.thresholds.cpu.critical,
        recommendations: [
          'Close unused applications',
          'Reduce background processing',
          'Check for CPU-intensive tasks',
        ],
      });
    } else if (snapshot.cpu.usage >= this.config.thresholds.cpu.warning) {
      this.addAlert({
        severity: 'warning',
        category: 'cpu',
        message: `CPU usage high (${snapshot.cpu.usage.toFixed(1)}%)`,
        metric: 'cpu.usage',
        currentValue: snapshot.cpu.usage,
        threshold: this.config.thresholds.cpu.warning,
        recommendations: ['Monitor CPU-intensive operations', 'Consider optimization'],
      });
    }

    // Check memory thresholds
    if (snapshot.memory.usagePercent >= this.config.thresholds.memory.critical) {
      this.addAlert({
        severity: 'critical',
        category: 'memory',
        message: `Memory usage critically high (${snapshot.memory.usagePercent.toFixed(1)}%)`,
        metric: 'memory.usagePercent',
        currentValue: snapshot.memory.usagePercent,
        threshold: this.config.thresholds.memory.critical,
        recommendations: [
          'Clear cache immediately',
          'Close unused features',
          'Check for memory leaks',
        ],
      });
    }

    // Check battery thresholds
    if (snapshot.battery.level <= this.config.thresholds.battery.critical) {
      this.addAlert({
        severity: 'critical',
        category: 'battery',
        message: `Battery critically low (${snapshot.battery.level.toFixed(1)}%)`,
        metric: 'battery.level',
        currentValue: snapshot.battery.level,
        threshold: this.config.thresholds.battery.critical,
        recommendations: [
          'Enable ultra battery saver mode',
          'Charge device immediately',
          'Disable non-essential features',
        ],
      });
    }
  }

  private addAlert(alertData: Omit<ResourceAlert, 'alertId' | 'timestamp'>): void {
    // Avoid duplicate alerts
    const exists = this.alerts.some(
      a =>
        a.category === alertData.category &&
        a.severity === alertData.severity &&
        a.metric === alertData.metric
    );

    if (!exists) {
      const alert: ResourceAlert = {
        alertId: `alert_${Date.now()}`,
        ...alertData,
        timestamp: new Date(),
      };
      this.alerts.push(alert);
      this.saveAlerts();
      console.log(`Resource alert: ${alert.message}`);
    }
  }

  private calculateBatteryDrainRate(): void {
    if (this.snapshots.length < 2) return;

    const recentSnapshots = this.snapshots.slice(-10);
    const timeSpan =
      recentSnapshots[recentSnapshots.length - 1].timestamp.getTime() -
      recentSnapshots[0].timestamp.getTime();
    const levelChange =
      recentSnapshots[0].battery.level -
      recentSnapshots[recentSnapshots.length - 1].battery.level;

    if (timeSpan > 0 && levelChange > 0) {
      const drainRatePerHour = (levelChange / timeSpan) * (1000 * 60 * 60);
      this.currentMetrics.battery.drainRate = drainRatePerHour;

      // Estimate time remaining
      const timeRemainingHours = this.currentMetrics.battery.level / drainRatePerHour;
      this.currentMetrics.battery.estimatedTimeRemaining = timeRemainingHours * 60;
    }
  }

  private calculateCPUHealth(): number {
    const usage = this.currentMetrics.cpu.usage;
    if (usage < 30) return 100;
    if (usage < 50) return 85;
    if (usage < 70) return 70;
    if (usage < 90) return 50;
    return 30;
  }

  private calculateMemoryHealth(): number {
    const usage = this.currentMetrics.memory.usagePercent;
    if (usage < 50) return 100;
    if (usage < 70) return 85;
    if (usage < 80) return 70;
    if (usage < 90) return 50;
    return 30;
  }

  private calculateBatteryHealth(): number {
    const level = this.currentMetrics.battery.level;
    if (level > 50) return 100;
    if (level > 30) return 80;
    if (level > 20) return 60;
    if (level > 10) return 40;
    return 20;
  }

  private calculatePerformanceHealth(): number {
    const fps = this.currentMetrics.performance.fps;
    const frameDrops = this.currentMetrics.performance.frameDrops;

    let health = 100;
    if (fps < 60) health -= (60 - fps) * 2;
    if (frameDrops > 0) health -= frameDrops * 5;

    return Math.max(0, health);
  }

  private calculateNetworkHealth(): number {
    if (!this.currentMetrics.network.isConnected) return 0;
    if (!this.currentMetrics.network.isInternetReachable) return 30;

    const latency = this.currentMetrics.network.averageLatency;
    if (latency < 100) return 100;
    if (latency < 300) return 85;
    if (latency < 500) return 70;
    if (latency < 1000) return 50;
    return 30;
  }

  private mapBatteryState(state: Battery.BatteryState): BatteryMetrics['state'] {
    switch (state) {
      case Battery.BatteryState.CHARGING:
        return 'charging';
      case Battery.BatteryState.FULL:
        return 'full';
      case Battery.BatteryState.UNPLUGGED:
        return 'discharging';
      default:
        return 'unknown';
    }
  }

  private getDefaultCPUMetrics(): CPUMetrics {
    return {
      usage: 0,
      throttled: false,
      coresActive: 0,
      lastUpdated: new Date(),
    };
  }

  private getDefaultMemoryMetrics(): MemoryMetrics {
    return {
      total: 0,
      used: 0,
      available: 0,
      usagePercent: 0,
      peak: 0,
      leakDetected: false,
      gcFrequency: 0,
      lastUpdated: new Date(),
    };
  }

  private getDefaultNetworkMetrics(): NetworkMetrics {
    return {
      type: 'unknown',
      isConnected: false,
      isInternetReachable: false,
      dataUsage: {
        sent: 0,
        received: 0,
        total: 0,
      },
      requestsPerMinute: 0,
      averageLatency: 0,
      lastUpdated: new Date(),
    };
  }

  private getDefaultBatteryMetrics(): BatteryMetrics {
    return {
      level: 0,
      state: 'unknown',
      lastUpdated: new Date(),
    };
  }

  private getDefaultPerformanceMetrics(): PerformanceMetrics {
    return {
      fps: 60,
      frameDrops: 0,
      renderTime: 16,
      jsThreadLoad: 0,
      uiThreadLoad: 0,
      bridgeUtilization: 0,
      lastUpdated: new Date(),
    };
  }

  private async loadConfiguration(): Promise<void> {
    try {
      const configData = await AsyncStorage.getItem(this.STORAGE_KEYS.MONITORING_CONFIG);
      if (configData) {
        this.config = { ...this.config, ...JSON.parse(configData) };
      }
    } catch (error) {
      console.error('Failed to load monitoring configuration:', error);
    }
  }

  private async loadSnapshots(): Promise<void> {
    try {
      const snapshotsData = await AsyncStorage.getItem(this.STORAGE_KEYS.SNAPSHOTS);
      if (snapshotsData) {
        this.snapshots = JSON.parse(snapshotsData);
      }
    } catch (error) {
      console.error('Failed to load snapshots:', error);
    }
  }

  private async loadAlerts(): Promise<void> {
    try {
      const alertsData = await AsyncStorage.getItem(this.STORAGE_KEYS.ALERTS);
      if (alertsData) {
        this.alerts = JSON.parse(alertsData);
      }
    } catch (error) {
      console.error('Failed to load alerts:', error);
    }
  }

  private async saveSnapshots(): Promise<void> {
    try {
      // Only save recent snapshots
      const recentSnapshots = this.snapshots.slice(-this.MAX_SNAPSHOTS);
      await AsyncStorage.setItem(
        this.STORAGE_KEYS.SNAPSHOTS,
        JSON.stringify(recentSnapshots)
      );
    } catch (error) {
      console.error('Failed to save snapshots:', error);
    }
  }

  private async saveAlerts(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        this.STORAGE_KEYS.ALERTS,
        JSON.stringify(this.alerts)
      );
    } catch (error) {
      console.error('Failed to save alerts:', error);
    }
  }
}

export default ResourceMonitor;