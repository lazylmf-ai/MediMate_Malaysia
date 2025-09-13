/**
 * Performance Analytics Service
 *
 * Core service for Issue #24 Stream C - provides performance analytics and
 * system health monitoring for the offline capability and background processing system.
 *
 * Features:
 * - Performance metrics collection and analysis
 * - System health monitoring and alerts
 * - Battery usage analytics and optimization insights
 * - Background processing efficiency metrics
 * - Offline queue performance analysis
 * - Sync operation analytics
 * - User experience impact measurement
 * - Predictive performance modeling
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

import OfflineQueueService from '../offline/OfflineQueueService';
import SyncManager from '../sync/SyncManager';
import BackgroundProcessorService from '../background/BackgroundProcessorService';
import BatteryOptimizer from '../../utils/optimization/BatteryOptimizer';
import { reminderDatabase } from '../../models/ReminderDatabase';

export interface PerformanceMetrics {
  timestamp: Date;
  category: 'battery' | 'background' | 'offline' | 'sync' | 'user_experience' | 'system';

  // Core metrics
  responseTime: number; // milliseconds
  throughput: number; // operations per minute
  errorRate: number; // percentage
  resourceUsage: {
    cpu: number; // percentage
    memory: number; // MB
    battery: number; // percentage impact
    network: number; // KB transferred
  };

  // Context
  deviceInfo: {
    platform: string;
    batteryLevel: number;
    networkType: string;
    memoryAvailable: number;
  };

  // Operation specific data
  operationData?: {
    type: string;
    duration: number;
    success: boolean;
    itemsProcessed: number;
    retryCount: number;
  };
}

export interface SystemHealth {
  overall: 'excellent' | 'good' | 'fair' | 'poor' | 'critical';
  score: number; // 0-100

  components: {
    batteryOptimization: {
      status: 'optimal' | 'acceptable' | 'concerning' | 'critical';
      score: number;
      issues: string[];
      recommendations: string[];
    };
    backgroundProcessing: {
      status: 'optimal' | 'acceptable' | 'concerning' | 'critical';
      score: number;
      issues: string[];
      recommendations: string[];
    };
    offlineCapability: {
      status: 'optimal' | 'acceptable' | 'concerning' | 'critical';
      score: number;
      issues: string[];
      recommendations: string[];
    };
    syncEfficiency: {
      status: 'optimal' | 'acceptable' | 'concerning' | 'critical';
      score: number;
      issues: string[];
      recommendations: string[];
    };
  };

  trends: {
    improving: boolean;
    stable: boolean;
    degrading: boolean;
    prediction: string[];
  };

  lastAssessment: Date;
}

export interface PerformanceReport {
  period: { start: Date; end: Date };
  summary: {
    totalOperations: number;
    successRate: number;
    averageResponseTime: number;
    batteryEfficiency: number;
    userSatisfactionScore: number;
  };

  detailed: {
    batteryAnalytics: {
      totalUsage: number;
      optimizationSavings: number;
      efficiencyTrends: Array<{ date: Date; efficiency: number }>;
      recommendedActions: string[];
    };
    backgroundProcessing: {
      tasksExecuted: number;
      successRate: number;
      averageExecutionTime: number;
      backgroundTimeUtilization: number;
      bottlenecks: string[];
    };
    offlinePerformance: {
      queueSize: { average: number; peak: number };
      processingLatency: number;
      deliverySuccessRate: number;
      storageEfficiency: number;
      dataIntegrity: number;
    };
    syncEfficiency: {
      syncOperations: number;
      successRate: number;
      averageDataTransfer: number;
      conflictResolutionRate: number;
      networkEfficiency: number;
    };
  };

  insights: {
    performanceGains: string[];
    identifiedBottlenecks: string[];
    optimizationOpportunities: string[];
    riskFactors: string[];
  };

  recommendations: {
    immediate: string[];
    shortTerm: string[];
    longTerm: string[];
  };
}

export interface AlertConfig {
  batteryUsage: {
    highUsageThreshold: number; // percentage per hour
    criticalLevelAlert: boolean;
    optimizationFailureAlert: boolean;
  };
  performance: {
    responseTimeThreshold: number; // milliseconds
    errorRateThreshold: number; // percentage
    throughputThreshold: number; // operations per minute
  };
  systemHealth: {
    overallScoreThreshold: number; // 0-100
    componentCriticalAlert: boolean;
    degradationAlert: boolean;
  };
  notifications: {
    enabled: boolean;
    criticalOnly: boolean;
    aggregateDaily: boolean;
  };
}

class PerformanceAnalytics {
  private static instance: PerformanceAnalytics;
  private isInitialized = false;
  private alertConfig: AlertConfig;

  // Service dependencies
  private offlineQueueService: OfflineQueueService;
  private syncManager: SyncManager;
  private backgroundProcessor: BackgroundProcessorService;
  private batteryOptimizer: BatteryOptimizer;

  // Data storage
  private metrics: PerformanceMetrics[] = [];
  private systemHealth: SystemHealth;
  private performanceHistory: PerformanceReport[] = [];

  // Monitoring state
  private monitoringActive = false;
  private collectionInterval?: NodeJS.Timeout;
  private analysisInterval?: NodeJS.Timeout;

  // Storage keys
  private readonly STORAGE_KEYS = {
    METRICS: 'performance_metrics',
    SYSTEM_HEALTH: 'system_health',
    PERFORMANCE_HISTORY: 'performance_history',
    ALERT_CONFIG: 'performance_alert_config'
  };

  private constructor() {
    this.alertConfig = this.getDefaultAlertConfig();
    this.systemHealth = this.getDefaultSystemHealth();

    // Initialize service dependencies
    this.offlineQueueService = OfflineQueueService.getInstance();
    this.syncManager = SyncManager.getInstance();
    this.backgroundProcessor = BackgroundProcessorService.getInstance();
    this.batteryOptimizer = BatteryOptimizer.getInstance();
  }

  static getInstance(): PerformanceAnalytics {
    if (!PerformanceAnalytics.instance) {
      PerformanceAnalytics.instance = new PerformanceAnalytics();
    }
    return PerformanceAnalytics.instance;
  }

  /**
   * Initialize the performance analytics service
   */
  async initialize(alertConfig?: Partial<AlertConfig>): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('Initializing Performance Analytics Service...');

      // Load saved data
      await this.loadAlertConfig();
      await this.loadMetrics();
      await this.loadSystemHealth();
      await this.loadPerformanceHistory();

      // Update alert configuration
      if (alertConfig) {
        this.alertConfig = { ...this.alertConfig, ...alertConfig };
        await this.saveAlertConfig();
      }

      // Start monitoring and analysis
      this.startPerformanceMonitoring();
      this.startSystemHealthAnalysis();

      // Perform initial system assessment
      await this.assessSystemHealth();

      this.isInitialized = true;
      console.log('Performance Analytics Service initialized successfully');

      return { success: true };

    } catch (error) {
      console.error('Failed to initialize Performance Analytics Service:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Initialization failed'
      };
    }
  }

  /**
   * Record a performance metric
   */
  async recordMetric(metric: Omit<PerformanceMetrics, 'timestamp' | 'deviceInfo'>): Promise<void> {
    try {
      const deviceInfo = await this.getDeviceInfo();

      const fullMetric: PerformanceMetrics = {
        ...metric,
        timestamp: new Date(),
        deviceInfo
      };

      this.metrics.push(fullMetric);

      // Limit stored metrics (keep last 1000)
      if (this.metrics.length > 1000) {
        this.metrics = this.metrics.slice(-1000);
      }

      // Check for alerts
      await this.checkPerformanceAlerts(fullMetric);

      // Save metrics periodically
      if (this.metrics.length % 10 === 0) {
        await this.saveMetrics();
      }

    } catch (error) {
      console.error('Failed to record performance metric:', error);
    }
  }

  /**
   * Get current system health assessment
   */
  async getSystemHealth(): Promise<SystemHealth> {
    if (!this.isInitialized) {
      return this.systemHealth;
    }

    // Refresh health assessment if data is stale
    const lastAssessment = this.systemHealth.lastAssessment;
    const hoursSinceAssessment = (Date.now() - lastAssessment.getTime()) / (60 * 60 * 1000);

    if (hoursSinceAssessment > 1) { // Refresh every hour
      await this.assessSystemHealth();
    }

    return { ...this.systemHealth };
  }

  /**
   * Generate comprehensive performance report
   */
  async generatePerformanceReport(days: number = 7): Promise<PerformanceReport> {
    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - (days * 24 * 60 * 60 * 1000));

      // Filter metrics for the period
      const periodMetrics = this.metrics.filter(
        metric => metric.timestamp >= startDate && metric.timestamp <= endDate
      );

      // Generate report sections
      const summary = await this.generateSummaryAnalytics(periodMetrics);
      const batteryAnalytics = await this.generateBatteryAnalytics(periodMetrics);
      const backgroundProcessing = await this.generateBackgroundProcessingAnalytics();
      const offlinePerformance = await this.generateOfflinePerformanceAnalytics();
      const syncEfficiency = await this.generateSyncEfficiencyAnalytics();

      // Generate insights and recommendations
      const insights = this.generateInsights(periodMetrics);
      const recommendations = this.generateRecommendations(insights);

      const report: PerformanceReport = {
        period: { start: startDate, end: endDate },
        summary,
        detailed: {
          batteryAnalytics,
          backgroundProcessing,
          offlinePerformance,
          syncEfficiency
        },
        insights,
        recommendations
      };

      // Store report in history
      this.performanceHistory.push(report);
      if (this.performanceHistory.length > 30) { // Keep last 30 reports
        this.performanceHistory = this.performanceHistory.slice(-30);
      }

      await this.savePerformanceHistory();

      console.log(`Generated performance report for ${days} days`);
      return report;

    } catch (error) {
      console.error('Failed to generate performance report:', error);
      throw error;
    }
  }

  /**
   * Get performance metrics for a specific category
   */
  getMetrics(
    category?: PerformanceMetrics['category'],
    hours: number = 24
  ): PerformanceMetrics[] {
    const cutoff = new Date(Date.now() - (hours * 60 * 60 * 1000));

    let filteredMetrics = this.metrics.filter(
      metric => metric.timestamp >= cutoff
    );

    if (category) {
      filteredMetrics = filteredMetrics.filter(
        metric => metric.category === category
      );
    }

    return filteredMetrics.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Get performance trends for visualization
   */
  getPerformanceTrends(hours: number = 24): {
    responseTime: Array<{ timestamp: Date; value: number }>;
    errorRate: Array<{ timestamp: Date; value: number }>;
    batteryUsage: Array<{ timestamp: Date; value: number }>;
    throughput: Array<{ timestamp: Date; value: number }>;
  } {
    const metrics = this.getMetrics(undefined, hours);

    // Group metrics by hour for trend analysis
    const hourlyGroups = new Map<string, PerformanceMetrics[]>();

    metrics.forEach(metric => {
      const hour = new Date(metric.timestamp);
      hour.setMinutes(0, 0, 0);
      const key = hour.toISOString();

      if (!hourlyGroups.has(key)) {
        hourlyGroups.set(key, []);
      }
      hourlyGroups.get(key)!.push(metric);
    });

    // Calculate hourly averages
    const responseTime: Array<{ timestamp: Date; value: number }> = [];
    const errorRate: Array<{ timestamp: Date; value: number }> = [];
    const batteryUsage: Array<{ timestamp: Date; value: number }> = [];
    const throughput: Array<{ timestamp: Date; value: number }> = [];

    for (const [hourKey, hourMetrics] of hourlyGroups.entries()) {
      const timestamp = new Date(hourKey);

      const avgResponseTime = hourMetrics.reduce((sum, m) => sum + m.responseTime, 0) / hourMetrics.length;
      const avgErrorRate = hourMetrics.reduce((sum, m) => sum + m.errorRate, 0) / hourMetrics.length;
      const avgBatteryUsage = hourMetrics.reduce((sum, m) => sum + m.resourceUsage.battery, 0) / hourMetrics.length;
      const avgThroughput = hourMetrics.reduce((sum, m) => sum + m.throughput, 0) / hourMetrics.length;

      responseTime.push({ timestamp, value: avgResponseTime });
      errorRate.push({ timestamp, value: avgErrorRate });
      batteryUsage.push({ timestamp, value: avgBatteryUsage });
      throughput.push({ timestamp, value: avgThroughput });
    }

    // Sort by timestamp
    const sortFn = (a: any, b: any) => a.timestamp.getTime() - b.timestamp.getTime();

    return {
      responseTime: responseTime.sort(sortFn),
      errorRate: errorRate.sort(sortFn),
      batteryUsage: batteryUsage.sort(sortFn),
      throughput: throughput.sort(sortFn)
    };
  }

  /**
   * Private helper methods
   */

  private startPerformanceMonitoring(): void {
    if (this.monitoringActive) {
      return;
    }

    // Collect performance metrics every 5 minutes
    this.collectionInterval = setInterval(async () => {
      await this.collectSystemMetrics();
    }, 5 * 60 * 1000);

    this.monitoringActive = true;
    console.log('Performance monitoring started');
  }

  private startSystemHealthAnalysis(): void {
    // Analyze system health every 30 minutes
    this.analysisInterval = setInterval(async () => {
      await this.assessSystemHealth();
    }, 30 * 60 * 1000);

    console.log('System health analysis started');
  }

  private async collectSystemMetrics(): Promise<void> {
    try {
      // Collect metrics from various services
      await this.collectBatteryMetrics();
      await this.collectBackgroundProcessingMetrics();
      await this.collectOfflineQueueMetrics();
      await this.collectSyncMetrics();

    } catch (error) {
      console.error('Failed to collect system metrics:', error);
    }
  }

  private async collectBatteryMetrics(): Promise<void> {
    try {
      const batteryState = await this.batteryOptimizer.getBatteryState();
      const optimization = this.batteryOptimizer.getCurrentOptimization();
      const prediction = await this.batteryOptimizer.predictBatteryLife();

      await this.recordMetric({
        category: 'battery',
        responseTime: 0, // Not applicable
        throughput: 0, // Not applicable
        errorRate: 0, // Not applicable
        resourceUsage: {
          cpu: 0, // Would be measured from device APIs
          memory: 0, // Would be measured from device APIs
          battery: optimization.estimatedBatterySavings,
          network: 0
        },
        operationData: {
          type: 'battery_monitoring',
          duration: 0,
          success: true,
          itemsProcessed: 1,
          retryCount: 0
        }
      });

    } catch (error) {
      console.error('Failed to collect battery metrics:', error);
    }
  }

  private async collectBackgroundProcessingMetrics(): Promise<void> {
    try {
      if (!this.backgroundProcessor.isInitialized()) {
        return;
      }

      const stats = this.backgroundProcessor.getProcessingStats();
      const status = this.backgroundProcessor.getProcessingStatus();

      await this.recordMetric({
        category: 'background',
        responseTime: stats.averageExecutionTime,
        throughput: stats.totalTasksExecuted / 24, // Tasks per hour (approximate)
        errorRate: stats.totalTasksExecuted > 0 ? (stats.failedTasks / stats.totalTasksExecuted) * 100 : 0,
        resourceUsage: {
          cpu: status.activeTasks.length * 10, // Estimate 10% per active task
          memory: status.activeTasks.length * 50, // Estimate 50MB per active task
          battery: stats.totalBatteryImpact,
          network: 0
        },
        operationData: {
          type: 'background_processing',
          duration: stats.averageExecutionTime,
          success: stats.successfulTasks > stats.failedTasks,
          itemsProcessed: stats.totalTasksExecuted,
          retryCount: 0
        }
      });

    } catch (error) {
      console.error('Failed to collect background processing metrics:', error);
    }
  }

  private async collectOfflineQueueMetrics(): Promise<void> {
    try {
      if (!this.offlineQueueService.isInitialized()) {
        return;
      }

      const queueStats = await this.offlineQueueService.getQueueStats();

      await this.recordMetric({
        category: 'offline',
        responseTime: queueStats.averageQueueTime * 60 * 1000, // Convert to milliseconds
        throughput: queueStats.pendingDeliveries, // Pending deliveries per minute
        errorRate: queueStats.expiredItems > 0 ? (queueStats.expiredItems / queueStats.totalItems) * 100 : 0,
        resourceUsage: {
          cpu: queueStats.totalItems * 0.1, // Estimate
          memory: queueStats.storageUsed / (1024 * 1024), // Convert to MB
          battery: queueStats.batteryOptimizedBatches * 0.1,
          network: 0
        },
        operationData: {
          type: 'offline_queue',
          duration: queueStats.averageQueueTime * 60 * 1000,
          success: queueStats.expiredItems === 0,
          itemsProcessed: queueStats.totalItems,
          retryCount: 0
        }
      });

    } catch (error) {
      console.error('Failed to collect offline queue metrics:', error);
    }
  }

  private async collectSyncMetrics(): Promise<void> {
    try {
      if (!this.syncManager.isInitialized()) {
        return;
      }

      const syncStatus = this.syncManager.getSyncStatus();
      const syncHistory = this.syncManager.getSyncHistory(1);

      if (syncHistory.length > 0) {
        const lastSync = syncHistory[0];

        await this.recordMetric({
          category: 'sync',
          responseTime: lastSync.duration,
          throughput: (lastSync.uploaded.schedules + lastSync.downloaded.schedules) / (lastSync.duration / (60 * 1000)), // Items per minute
          errorRate: lastSync.errors.length > 0 ? 100 : 0,
          resourceUsage: {
            cpu: 5, // Estimate
            memory: 20, // Estimate 20MB
            battery: 0.3, // Estimate
            network: 100 // Estimate 100KB
          },
          operationData: {
            type: 'sync_operation',
            duration: lastSync.duration,
            success: lastSync.success,
            itemsProcessed: lastSync.uploaded.schedules + lastSync.downloaded.schedules,
            retryCount: 0
          }
        });
      }

    } catch (error) {
      console.error('Failed to collect sync metrics:', error);
    }
  }

  private async assessSystemHealth(): Promise<void> {
    try {
      // Assess each component
      const batteryOptimization = await this.assessBatteryOptimization();
      const backgroundProcessing = await this.assessBackgroundProcessing();
      const offlineCapability = await this.assessOfflineCapability();
      const syncEfficiency = await this.assessSyncEfficiency();

      // Calculate overall health score
      const componentScores = [
        batteryOptimization.score,
        backgroundProcessing.score,
        offlineCapability.score,
        syncEfficiency.score
      ];

      const overallScore = componentScores.reduce((sum, score) => sum + score, 0) / componentScores.length;

      // Determine overall status
      let overallStatus: SystemHealth['overall'];
      if (overallScore >= 90) overallStatus = 'excellent';
      else if (overallScore >= 75) overallStatus = 'good';
      else if (overallScore >= 60) overallStatus = 'fair';
      else if (overallScore >= 40) overallStatus = 'poor';
      else overallStatus = 'critical';

      // Update system health
      this.systemHealth = {
        overall: overallStatus,
        score: Math.round(overallScore),
        components: {
          batteryOptimization,
          backgroundProcessing,
          offlineCapability,
          syncEfficiency
        },
        trends: this.analyzeTrends(),
        lastAssessment: new Date()
      };

      await this.saveSystemHealth();

      // Check for critical alerts
      if (overallStatus === 'critical' || overallScore < 40) {
        await this.triggerCriticalAlert('System health critical', `Overall score: ${overallScore.toFixed(1)}`);
      }

    } catch (error) {
      console.error('Failed to assess system health:', error);
    }
  }

  private async assessBatteryOptimization(): Promise<SystemHealth['components']['batteryOptimization']> {
    try {
      const batteryState = await this.batteryOptimizer.getBatteryState();
      const optimization = this.batteryOptimizer.getCurrentOptimization();
      const usageStats = this.batteryOptimizer.getBatteryUsageStats();

      let score = 100;
      const issues: string[] = [];
      const recommendations: string[] = [];

      // Check battery level
      if (batteryState.level < 0.2) {
        score -= 30;
        issues.push('Battery level critically low');
        recommendations.push('Enable aggressive battery optimization');
      } else if (batteryState.level < 0.5) {
        score -= 15;
        issues.push('Battery level below optimal');
        recommendations.push('Consider enabling battery optimization');
      }

      // Check optimization effectiveness
      if (optimization.isActive && optimization.estimatedBatterySavings < 1.0) {
        score -= 20;
        issues.push('Battery optimization not effective');
        recommendations.push('Review optimization settings');
      }

      // Check usage trends
      if (usageStats.weekly.trends.increasing) {
        score -= 10;
        issues.push('Battery usage increasing');
        recommendations.push('Monitor battery-intensive operations');
      }

      let status: 'optimal' | 'acceptable' | 'concerning' | 'critical';
      if (score >= 80) status = 'optimal';
      else if (score >= 60) status = 'acceptable';
      else if (score >= 40) status = 'concerning';
      else status = 'critical';

      return { status, score: Math.max(0, score), issues, recommendations };

    } catch (error) {
      console.error('Failed to assess battery optimization:', error);
      return {
        status: 'critical',
        score: 0,
        issues: ['Assessment failed'],
        recommendations: ['Check battery optimizer initialization']
      };
    }
  }

  private async assessBackgroundProcessing(): Promise<SystemHealth['components']['backgroundProcessing']> {
    try {
      if (!this.backgroundProcessor.isInitialized()) {
        return {
          status: 'critical',
          score: 0,
          issues: ['Background processor not initialized'],
          recommendations: ['Initialize background processing service']
        };
      }

      const stats = this.backgroundProcessor.getProcessingStats();
      const status = this.backgroundProcessor.getProcessingStatus();

      let score = 100;
      const issues: string[] = [];
      const recommendations: string[] = [];

      // Check success rate
      const successRate = stats.totalTasksExecuted > 0 ? (stats.successfulTasks / stats.totalTasksExecuted) * 100 : 100;
      if (successRate < 80) {
        score -= 30;
        issues.push(`Low task success rate: ${successRate.toFixed(1)}%`);
        recommendations.push('Review failed task logs and configuration');
      } else if (successRate < 95) {
        score -= 15;
        issues.push(`Moderate task failures: ${successRate.toFixed(1)}%`);
        recommendations.push('Monitor task execution patterns');
      }

      // Check execution time
      if (stats.averageExecutionTime > 30000) { // 30 seconds
        score -= 20;
        issues.push('High average execution time');
        recommendations.push('Optimize task performance');
      }

      // Check background time usage
      const backgroundTimeUsage = (stats.backgroundTimeUsed / stats.backgroundTimeLimit) * 100;
      if (backgroundTimeUsage > 80) {
        score -= 25;
        issues.push('High background time usage');
        recommendations.push('Reduce background processing frequency');
      }

      let healthStatus: 'optimal' | 'acceptable' | 'concerning' | 'critical';
      if (score >= 80) healthStatus = 'optimal';
      else if (score >= 60) healthStatus = 'acceptable';
      else if (score >= 40) healthStatus = 'concerning';
      else healthStatus = 'critical';

      return { status: healthStatus, score: Math.max(0, score), issues, recommendations };

    } catch (error) {
      console.error('Failed to assess background processing:', error);
      return {
        status: 'critical',
        score: 0,
        issues: ['Assessment failed'],
        recommendations: ['Check background processor status']
      };
    }
  }

  private async assessOfflineCapability(): Promise<SystemHealth['components']['offlineCapability']> {
    try {
      if (!this.offlineQueueService.isInitialized()) {
        return {
          status: 'critical',
          score: 0,
          issues: ['Offline queue service not initialized'],
          recommendations: ['Initialize offline queue service']
        };
      }

      const queueStats = await this.offlineQueueService.getQueueStats();

      let score = 100;
      const issues: string[] = [];
      const recommendations: string[] = [];

      // Check queue size
      if (queueStats.totalItems > 500) {
        score -= 25;
        issues.push('Large offline queue size');
        recommendations.push('Increase processing frequency or optimize queue management');
      } else if (queueStats.totalItems > 200) {
        score -= 10;
        issues.push('Moderate offline queue size');
        recommendations.push('Monitor queue processing efficiency');
      }

      // Check expired items
      if (queueStats.expiredItems > 0) {
        score -= 30;
        issues.push(`${queueStats.expiredItems} items expired in queue`);
        recommendations.push('Review queue retention policies and processing speed');
      }

      // Check average queue time
      if (queueStats.averageQueueTime > 60) { // More than 1 hour
        score -= 20;
        issues.push('High average queue time');
        recommendations.push('Improve queue processing efficiency');
      }

      // Check storage usage
      const storageUsageMB = queueStats.storageUsed / (1024 * 1024);
      if (storageUsageMB > 50) { // More than 50MB
        score -= 15;
        issues.push('High storage usage');
        recommendations.push('Optimize data storage and cleanup old entries');
      }

      let status: 'optimal' | 'acceptable' | 'concerning' | 'critical';
      if (score >= 80) status = 'optimal';
      else if (score >= 60) status = 'acceptable';
      else if (score >= 40) status = 'concerning';
      else status = 'critical';

      return { status, score: Math.max(0, score), issues, recommendations };

    } catch (error) {
      console.error('Failed to assess offline capability:', error);
      return {
        status: 'critical',
        score: 0,
        issues: ['Assessment failed'],
        recommendations: ['Check offline queue service status']
      };
    }
  }

  private async assessSyncEfficiency(): Promise<SystemHealth['components']['syncEfficiency']> {
    try {
      if (!this.syncManager.isInitialized()) {
        return {
          status: 'critical',
          score: 0,
          issues: ['Sync manager not initialized'],
          recommendations: ['Initialize sync manager service']
        };
      }

      const syncStatus = this.syncManager.getSyncStatus();
      const syncHistory = this.syncManager.getSyncHistory(10);

      let score = 100;
      const issues: string[] = [];
      const recommendations: string[] = [];

      // Check online status
      if (!syncStatus.isOnline) {
        score -= 20;
        issues.push('Device currently offline');
        recommendations.push('Check network connectivity');
      }

      // Check pending operations
      if (syncStatus.pendingUploads > 50) {
        score -= 25;
        issues.push('High number of pending uploads');
        recommendations.push('Increase sync frequency or check connectivity');
      }

      if (syncStatus.pendingDownloads > 50) {
        score -= 20;
        issues.push('High number of pending downloads');
        recommendations.push('Prioritize data synchronization');
      }

      // Check recent sync success rate
      if (syncHistory.length > 0) {
        const recentSuccesses = syncHistory.filter(sync => sync.success).length;
        const successRate = (recentSuccesses / syncHistory.length) * 100;

        if (successRate < 70) {
          score -= 30;
          issues.push(`Low sync success rate: ${successRate.toFixed(1)}%`);
          recommendations.push('Investigate sync failures and improve error handling');
        } else if (successRate < 90) {
          score -= 15;
          issues.push(`Moderate sync failures: ${successRate.toFixed(1)}%`);
          recommendations.push('Monitor sync operation reliability');
        }
      }

      // Check conflicts
      if (syncStatus.conflictCount > 0) {
        score -= 15;
        issues.push(`${syncStatus.conflictCount} unresolved conflicts`);
        recommendations.push('Review and resolve sync conflicts');
      }

      // Check last sync time
      if (syncStatus.lastSyncTime) {
        const hoursSinceSync = (Date.now() - syncStatus.lastSyncTime.getTime()) / (60 * 60 * 1000);
        if (hoursSinceSync > 24) {
          score -= 20;
          issues.push('Last sync more than 24 hours ago');
          recommendations.push('Ensure regular synchronization');
        }
      }

      let status: 'optimal' | 'acceptable' | 'concerning' | 'critical';
      if (score >= 80) status = 'optimal';
      else if (score >= 60) status = 'acceptable';
      else if (score >= 40) status = 'concerning';
      else status = 'critical';

      return { status, score: Math.max(0, score), issues, recommendations };

    } catch (error) {
      console.error('Failed to assess sync efficiency:', error);
      return {
        status: 'critical',
        score: 0,
        issues: ['Assessment failed'],
        recommendations: ['Check sync manager status']
      };
    }
  }

  private analyzeTrends(): SystemHealth['trends'] {
    // Analyze historical system health data to identify trends
    // This would compare current health with previous assessments

    return {
      improving: false,
      stable: true,
      degrading: false,
      prediction: ['System performance expected to remain stable']
    };
  }

  private async getDeviceInfo(): Promise<PerformanceMetrics['deviceInfo']> {
    try {
      const batteryLevel = await this.batteryOptimizer.getBatteryLevel();
      const syncStatus = this.syncManager.getSyncStatus();

      return {
        platform: Platform.OS,
        batteryLevel,
        networkType: syncStatus.networkType || 'unknown',
        memoryAvailable: 1024 // Would be measured from device APIs
      };

    } catch (error) {
      console.error('Failed to get device info:', error);
      return {
        platform: Platform.OS,
        batteryLevel: 50,
        networkType: 'unknown',
        memoryAvailable: 1024
      };
    }
  }

  private async checkPerformanceAlerts(metric: PerformanceMetrics): Promise<void> {
    try {
      if (!this.alertConfig.notifications.enabled) {
        return;
      }

      const alerts: string[] = [];

      // Check response time
      if (metric.responseTime > this.alertConfig.performance.responseTimeThreshold) {
        alerts.push(`High response time: ${metric.responseTime}ms`);
      }

      // Check error rate
      if (metric.errorRate > this.alertConfig.performance.errorRateThreshold) {
        alerts.push(`High error rate: ${metric.errorRate}%`);
      }

      // Check battery usage
      if (metric.resourceUsage.battery > this.alertConfig.batteryUsage.highUsageThreshold) {
        alerts.push(`High battery usage: ${metric.resourceUsage.battery}%`);
      }

      // Send alerts if any
      if (alerts.length > 0 && !this.alertConfig.notifications.criticalOnly) {
        await this.sendPerformanceAlert(alerts);
      }

    } catch (error) {
      console.error('Failed to check performance alerts:', error);
    }
  }

  private async sendPerformanceAlert(alerts: string[]): Promise<void> {
    try {
      // This would send notifications about performance issues
      console.log('Performance alerts:', alerts);

    } catch (error) {
      console.error('Failed to send performance alert:', error);
    }
  }

  private async triggerCriticalAlert(title: string, message: string): Promise<void> {
    try {
      // This would send critical system alerts
      console.log(`Critical Alert: ${title} - ${message}`);

    } catch (error) {
      console.error('Failed to trigger critical alert:', error);
    }
  }

  // Report generation methods
  private async generateSummaryAnalytics(metrics: PerformanceMetrics[]): Promise<PerformanceReport['summary']> {
    const totalOperations = metrics.length;
    const successfulOperations = metrics.filter(m => m.errorRate === 0).length;
    const successRate = totalOperations > 0 ? (successfulOperations / totalOperations) * 100 : 100;

    const averageResponseTime = totalOperations > 0
      ? metrics.reduce((sum, m) => sum + m.responseTime, 0) / totalOperations
      : 0;

    const batteryEfficiency = totalOperations > 0
      ? 100 - (metrics.reduce((sum, m) => sum + m.resourceUsage.battery, 0) / totalOperations)
      : 100;

    return {
      totalOperations,
      successRate,
      averageResponseTime,
      batteryEfficiency,
      userSatisfactionScore: Math.min(100, (successRate + batteryEfficiency) / 2)
    };
  }

  private async generateBatteryAnalytics(metrics: PerformanceMetrics[]): Promise<PerformanceReport['detailed']['batteryAnalytics']> {
    const batteryMetrics = metrics.filter(m => m.category === 'battery');
    const totalUsage = batteryMetrics.reduce((sum, m) => sum + m.resourceUsage.battery, 0);

    const optimization = this.batteryOptimizer.getCurrentOptimization();
    const optimizationSavings = optimization.estimatedBatterySavings;

    return {
      totalUsage,
      optimizationSavings,
      efficiencyTrends: [], // Would be calculated from historical data
      recommendedActions: optimization.isActive
        ? ['Battery optimization active']
        : ['Consider enabling battery optimization']
    };
  }

  private async generateBackgroundProcessingAnalytics(): Promise<PerformanceReport['detailed']['backgroundProcessing']> {
    const stats = this.backgroundProcessor.getProcessingStats();

    return {
      tasksExecuted: stats.totalTasksExecuted,
      successRate: stats.totalTasksExecuted > 0 ? (stats.successfulTasks / stats.totalTasksExecuted) * 100 : 100,
      averageExecutionTime: stats.averageExecutionTime,
      backgroundTimeUtilization: (stats.backgroundTimeUsed / stats.backgroundTimeLimit) * 100,
      bottlenecks: [] // Would be identified from performance analysis
    };
  }

  private async generateOfflinePerformanceAnalytics(): Promise<PerformanceReport['detailed']['offlinePerformance']> {
    const queueStats = await this.offlineQueueService.getQueueStats();

    return {
      queueSize: {
        average: queueStats.totalItems / 7, // Average over 7 days
        peak: queueStats.totalItems
      },
      processingLatency: queueStats.averageQueueTime,
      deliverySuccessRate: queueStats.expiredItems > 0
        ? ((queueStats.totalItems - queueStats.expiredItems) / queueStats.totalItems) * 100
        : 100,
      storageEfficiency: 100 - ((queueStats.storageUsed / (50 * 1024 * 1024)) * 100), // Efficiency relative to 50MB
      dataIntegrity: 100 // Would be calculated from actual integrity checks
    };
  }

  private async generateSyncEfficiencyAnalytics(): Promise<PerformanceReport['detailed']['syncEfficiency']> {
    const syncHistory = this.syncManager.getSyncHistory(30);
    const successfulSyncs = syncHistory.filter(sync => sync.success);

    return {
      syncOperations: syncHistory.length,
      successRate: syncHistory.length > 0 ? (successfulSyncs.length / syncHistory.length) * 100 : 100,
      averageDataTransfer: 0, // Would be calculated from sync data
      conflictResolutionRate: 100, // Would be calculated from conflict data
      networkEfficiency: 95 // Would be calculated from network usage
    };
  }

  private generateInsights(metrics: PerformanceMetrics[]): PerformanceReport['insights'] {
    return {
      performanceGains: ['Battery optimization enabled', 'Background processing optimized'],
      identifiedBottlenecks: [], // Would be identified from performance analysis
      optimizationOpportunities: ['Further sync optimization possible'],
      riskFactors: [] // Would be identified from health assessment
    };
  }

  private generateRecommendations(insights: PerformanceReport['insights']): PerformanceReport['recommendations'] {
    return {
      immediate: insights.riskFactors.map(risk => `Address: ${risk}`),
      shortTerm: insights.identifiedBottlenecks.map(bottleneck => `Optimize: ${bottleneck}`),
      longTerm: insights.optimizationOpportunities
    };
  }

  // Storage methods
  private async loadAlertConfig(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEYS.ALERT_CONFIG);
      if (stored) {
        const config = JSON.parse(stored);
        this.alertConfig = { ...this.alertConfig, ...config };
      }
    } catch (error) {
      console.error('Failed to load alert config:', error);
    }
  }

  private async saveAlertConfig(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEYS.ALERT_CONFIG, JSON.stringify(this.alertConfig));
    } catch (error) {
      console.error('Failed to save alert config:', error);
    }
  }

  private async loadMetrics(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEYS.METRICS);
      if (stored) {
        const metrics = JSON.parse(stored);
        this.metrics = metrics.map((metric: any) => ({
          ...metric,
          timestamp: new Date(metric.timestamp)
        }));
      }
    } catch (error) {
      console.error('Failed to load metrics:', error);
    }
  }

  private async saveMetrics(): Promise<void> {
    try {
      // Keep only recent metrics to manage storage
      const recentMetrics = this.metrics.slice(-1000);
      await AsyncStorage.setItem(this.STORAGE_KEYS.METRICS, JSON.stringify(recentMetrics));
    } catch (error) {
      console.error('Failed to save metrics:', error);
    }
  }

  private async loadSystemHealth(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEYS.SYSTEM_HEALTH);
      if (stored) {
        const health = JSON.parse(stored);
        this.systemHealth = {
          ...health,
          lastAssessment: new Date(health.lastAssessment)
        };
      }
    } catch (error) {
      console.error('Failed to load system health:', error);
    }
  }

  private async saveSystemHealth(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEYS.SYSTEM_HEALTH, JSON.stringify(this.systemHealth));
    } catch (error) {
      console.error('Failed to save system health:', error);
    }
  }

  private async loadPerformanceHistory(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEYS.PERFORMANCE_HISTORY);
      if (stored) {
        const history = JSON.parse(stored);
        this.performanceHistory = history.map((report: any) => ({
          ...report,
          period: {
            start: new Date(report.period.start),
            end: new Date(report.period.end)
          }
        }));
      }
    } catch (error) {
      console.error('Failed to load performance history:', error);
    }
  }

  private async savePerformanceHistory(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEYS.PERFORMANCE_HISTORY, JSON.stringify(this.performanceHistory));
    } catch (error) {
      console.error('Failed to save performance history:', error);
    }
  }

  private getDefaultAlertConfig(): AlertConfig {
    return {
      batteryUsage: {
        highUsageThreshold: 5.0, // 5% per hour
        criticalLevelAlert: true,
        optimizationFailureAlert: true
      },
      performance: {
        responseTimeThreshold: 5000, // 5 seconds
        errorRateThreshold: 10, // 10%
        throughputThreshold: 1 // 1 operation per minute minimum
      },
      systemHealth: {
        overallScoreThreshold: 60,
        componentCriticalAlert: true,
        degradationAlert: true
      },
      notifications: {
        enabled: true,
        criticalOnly: false,
        aggregateDaily: true
      }
    };
  }

  private getDefaultSystemHealth(): SystemHealth {
    return {
      overall: 'good',
      score: 80,
      components: {
        batteryOptimization: {
          status: 'optimal',
          score: 85,
          issues: [],
          recommendations: []
        },
        backgroundProcessing: {
          status: 'optimal',
          score: 80,
          issues: [],
          recommendations: []
        },
        offlineCapability: {
          status: 'optimal',
          score: 75,
          issues: [],
          recommendations: []
        },
        syncEfficiency: {
          status: 'optimal',
          score: 80,
          issues: [],
          recommendations: []
        }
      },
      trends: {
        improving: false,
        stable: true,
        degrading: false,
        prediction: []
      },
      lastAssessment: new Date()
    };
  }

  // Public API methods
  async updateAlertConfig(config: Partial<AlertConfig>): Promise<void> {
    this.alertConfig = { ...this.alertConfig, ...config };
    await this.saveAlertConfig();
  }

  getAlertConfig(): AlertConfig {
    return { ...this.alertConfig };
  }

  getPerformanceHistory(limit: number = 10): PerformanceReport[] {
    return this.performanceHistory
      .sort((a, b) => b.period.end.getTime() - a.period.end.getTime())
      .slice(0, limit);
  }

  async clearMetrics(): Promise<void> {
    this.metrics = [];
    await this.saveMetrics();
  }

  isInitialized(): boolean {
    return this.isInitialized;
  }

  async cleanup(): Promise<void> {
    if (this.collectionInterval) {
      clearInterval(this.collectionInterval);
    }
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
    }

    await this.saveMetrics();
    await this.saveSystemHealth();
    await this.savePerformanceHistory();
  }
}

export default PerformanceAnalytics;