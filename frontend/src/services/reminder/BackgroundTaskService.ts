/**
 * Background Task Service for Cultural-Aware Reminders
 * 
 * Handles background task registration, management, and execution for Issue #24 Stream A.
 * Integrates with Expo TaskManager for reliable background processing while respecting
 * cultural constraints and optimizing battery usage.
 * 
 * Features:
 * - Expo TaskManager integration with proper task lifecycle
 * - Battery-optimized scheduling with smart intervals
 * - Cultural constraint checking in background
 * - Offline queue processing
 * - Error handling and recovery
 * - Performance monitoring and analytics
 */

import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { reminderDatabase } from '../../models/ReminderDatabase';
import ReminderSchedulingService from './ReminderSchedulingService';
import CulturalConstraintEngine from './CulturalConstraintEngine';

// Background task identifiers
export const BACKGROUND_TASKS = {
  REMINDER_PROCESSOR: 'REMINDER_PROCESSOR',
  CULTURAL_CONSTRAINT_CHECKER: 'CULTURAL_CONSTRAINT_CHECKER',
  OFFLINE_QUEUE_SYNC: 'OFFLINE_QUEUE_SYNC',
  BATTERY_OPTIMIZER: 'BATTERY_OPTIMIZER',
  DATABASE_MAINTENANCE: 'DATABASE_MAINTENANCE',
} as const;

export type BackgroundTaskName = typeof BACKGROUND_TASKS[keyof typeof BACKGROUND_TASKS];

export interface BackgroundTaskConfig {
  name: BackgroundTaskName;
  enabled: boolean;
  interval: number; // seconds
  priority: 'low' | 'normal' | 'high';
  batteryOptimized: boolean;
  culturallyAware: boolean;
  metadata: {
    description: string;
    lastRun?: Date;
    runCount: number;
    errorCount: number;
    averageExecutionTime: number; // milliseconds
  };
}

export interface BackgroundTaskResult {
  taskName: string;
  success: boolean;
  executionTime: number; // milliseconds
  result?: any;
  error?: string;
  batteryImpact: number; // estimated percentage
  culturalAdjustments?: string[];
  nextRunTime?: Date;
}

export interface BackgroundTaskStats {
  totalRuns: number;
  successfulRuns: number;
  failedRuns: number;
  averageExecutionTime: number;
  totalBatteryImpact: number;
  lastRunTime?: Date;
  nextScheduledRun?: Date;
}

class BackgroundTaskService {
  private static instance: BackgroundTaskService;
  private reminderService: ReminderSchedulingService;
  private culturalConstraintEngine: CulturalConstraintEngine;
  private taskConfigs: Map<BackgroundTaskName, BackgroundTaskConfig> = new Map();
  private isInitialized = false;
  private performanceMetrics: Map<BackgroundTaskName, BackgroundTaskStats> = new Map();

  private readonly STORAGE_KEYS = {
    TASK_CONFIG: 'background_task_config',
    PERFORMANCE_METRICS: 'background_task_metrics',
    BATTERY_USAGE: 'background_battery_usage',
  };

  private constructor() {
    this.reminderService = ReminderSchedulingService.getInstance();
    this.culturalConstraintEngine = CulturalConstraintEngine.getInstance();
    this.initializeDefaultConfigs();
  }

  static getInstance(): BackgroundTaskService {
    if (!BackgroundTaskService.instance) {
      BackgroundTaskService.instance = new BackgroundTaskService();
    }
    return BackgroundTaskService.instance;
  }

  /**
   * Initialize background task service
   */
  async initialize(): Promise<{ success: boolean; error?: string }> {
    try {
      // Load saved configurations
      await this.loadTaskConfigurations();
      await this.loadPerformanceMetrics();

      // Register all background tasks
      await this.registerAllTasks();

      // Start background fetch if permissions granted
      const { status } = await BackgroundFetch.getStatusAsync();
      if (status === BackgroundFetch.BackgroundFetchStatus.Available) {
        await this.startBackgroundTasks();
      } else {
        console.warn('Background fetch not available:', status);
      }

      this.isInitialized = true;
      return { success: true };

    } catch (error) {
      console.error('Background task service initialization failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Initialization failed'
      };
    }
  }

  /**
   * Register all background tasks with TaskManager
   */
  private async registerAllTasks(): Promise<void> {
    // Register reminder processor task
    TaskManager.defineTask(BACKGROUND_TASKS.REMINDER_PROCESSOR, async () => {
      return await this.executeTask(BACKGROUND_TASKS.REMINDER_PROCESSOR, async () => {
        const result = await this.reminderService.processScheduledReminders();
        
        // Check for cultural adjustments needed
        if (result.culturallyAdjusted > 0) {
          await this.culturalConstraintEngine.refreshConstraints();
        }

        return {
          processed: result.processed,
          delivered: result.delivered,
          failed: result.failed,
          culturallyAdjusted: result.culturallyAdjusted
        };
      });
    });

    // Register cultural constraint checker task
    TaskManager.defineTask(BACKGROUND_TASKS.CULTURAL_CONSTRAINT_CHECKER, async () => {
      return await this.executeTask(BACKGROUND_TASKS.CULTURAL_CONSTRAINT_CHECKER, async () => {
        const constraints = await this.culturalConstraintEngine.checkAndUpdateConstraints();
        
        // Update reminder schedules if constraints changed
        if (constraints.updated) {
          await this.reminderService.reprocessSchedulesWithNewConstraints(constraints.affectedUsers);
        }

        return {
          constraintsChecked: constraints.checked,
          constraintsUpdated: constraints.updated,
          affectedUsers: constraints.affectedUsers.length
        };
      });
    });

    // Register offline queue sync task
    TaskManager.defineTask(BACKGROUND_TASKS.OFFLINE_QUEUE_SYNC, async () => {
      return await this.executeTask(BACKGROUND_TASKS.OFFLINE_QUEUE_SYNC, async () => {
        const syncResult = await this.syncOfflineQueue();
        
        return {
          itemsSynced: syncResult.synced,
          itemsFailed: syncResult.failed,
          queueSize: syncResult.remainingQueueSize
        };
      });
    });

    // Register battery optimizer task
    TaskManager.defineTask(BACKGROUND_TASKS.BATTERY_OPTIMIZER, async () => {
      return await this.executeTask(BACKGROUND_TASKS.BATTERY_OPTIMIZER, async () => {
        const optimizationResult = await this.optimizeBatteryUsage();
        
        return {
          tasksOptimized: optimizationResult.optimized,
          estimatedSavings: optimizationResult.batterySavings,
          nextOptimizationTime: optimizationResult.nextOptimization
        };
      });
    });

    // Register database maintenance task
    TaskManager.defineTask(BACKGROUND_TASKS.DATABASE_MAINTENANCE, async () => {
      return await this.executeTask(BACKGROUND_TASKS.DATABASE_MAINTENANCE, async () => {
        const maintenanceResult = await reminderDatabase.performMaintenance();
        
        return {
          expiredRemindersRemoved: maintenanceResult.expiredRemindersRemoved,
          expiredConstraintsRemoved: maintenanceResult.expiredConstraintsRemoved,
          oldHistoryRemoved: maintenanceResult.oldHistoryRemoved,
          databaseVacuumed: maintenanceResult.databaseVacuumed
        };
      });
    });
  }

  /**
   * Start background tasks with appropriate intervals
   */
  private async startBackgroundTasks(): Promise<void> {
    for (const [taskName, config] of this.taskConfigs.entries()) {
      if (config.enabled) {
        try {
          await BackgroundFetch.registerTaskAsync(taskName, {
            minimumInterval: config.interval,
            stopOnTerminate: false,
            startOnBoot: true,
          });

          console.log(`Background task ${taskName} registered with ${config.interval}s interval`);
        } catch (error) {
          console.error(`Failed to register background task ${taskName}:`, error);
        }
      }
    }
  }

  /**
   * Execute a background task with error handling and performance tracking
   */
  private async executeTask(
    taskName: BackgroundTaskName,
    taskFunction: () => Promise<any>
  ): Promise<BackgroundFetch.BackgroundFetchResult> {
    const startTime = Date.now();
    let result: BackgroundTaskResult;

    try {
      // Check if task should run based on cultural constraints
      const config = this.taskConfigs.get(taskName);
      if (config?.culturallyAware) {
        const canRun = await this.checkCulturalConstraintsForTask(taskName);
        if (!canRun.allowed) {
          console.log(`Task ${taskName} skipped due to cultural constraints:`, canRun.reason);
          return BackgroundFetch.BackgroundFetchResult.NoData;
        }
      }

      // Execute the task
      const taskResult = await taskFunction();
      const executionTime = Date.now() - startTime;

      result = {
        taskName,
        success: true,
        executionTime,
        result: taskResult,
        batteryImpact: this.estimateBatteryImpact(taskName, executionTime),
        nextRunTime: this.calculateNextRunTime(taskName)
      };

      // Update performance metrics
      await this.updatePerformanceMetrics(taskName, result);

      console.log(`Background task ${taskName} completed successfully in ${executionTime}ms`);
      return BackgroundFetch.BackgroundFetchResult.NewData;

    } catch (error) {
      const executionTime = Date.now() - startTime;
      
      result = {
        taskName,
        success: false,
        executionTime,
        error: error instanceof Error ? error.message : 'Unknown error',
        batteryImpact: this.estimateBatteryImpact(taskName, executionTime)
      };

      // Update performance metrics for failed task
      await this.updatePerformanceMetrics(taskName, result);

      console.error(`Background task ${taskName} failed:`, error);
      return BackgroundFetch.BackgroundFetchResult.Failed;
    }
  }

  /**
   * Check if task can run based on cultural constraints
   */
  private async checkCulturalConstraintsForTask(taskName: BackgroundTaskName): Promise<{
    allowed: boolean;
    reason?: string;
  }> {
    try {
      // Check if it's currently prayer time for any users
      const prayerStatus = await this.culturalConstraintEngine.getCurrentPrayerStatus();
      
      if (prayerStatus.isDuringPrayer && this.isTaskCulturallyIntrusive(taskName)) {
        return {
          allowed: false,
          reason: `Currently during ${prayerStatus.currentPrayer} prayer time`
        };
      }

      // Check quiet hours
      const isQuietTime = await this.culturalConstraintEngine.isCurrentlyQuietHours();
      if (isQuietTime && this.isTaskNoisy(taskName)) {
        return {
          allowed: false,
          reason: 'Currently during quiet hours'
        };
      }

      return { allowed: true };

    } catch (error) {
      console.error('Error checking cultural constraints for task:', error);
      return { allowed: true }; // Default to allowing task on error
    }
  }

  /**
   * Check if a task is culturally intrusive (should be avoided during prayers)
   */
  private isTaskCulturallyIntrusive(taskName: BackgroundTaskName): boolean {
    const intrusiveTasks = [
      BACKGROUND_TASKS.REMINDER_PROCESSOR, // Sends notifications
    ];
    return intrusiveTasks.includes(taskName);
  }

  /**
   * Check if a task is noisy (should be avoided during quiet hours)
   */
  private isTaskNoisy(taskName: BackgroundTaskName): boolean {
    const noisyTasks = [
      BACKGROUND_TASKS.REMINDER_PROCESSOR, // Sends notifications with sounds
    ];
    return noisyTasks.includes(taskName);
  }

  /**
   * Sync offline queue with server
   */
  private async syncOfflineQueue(): Promise<{
    synced: number;
    failed: number;
    remainingQueueSize: number;
  }> {
    try {
      // Get pending items from offline queue
      const pendingItems = await reminderDatabase.getPendingOfflineReminders(50);
      
      let synced = 0;
      let failed = 0;

      // Process each pending item
      for (const item of pendingItems) {
        try {
          // In a real implementation, this would sync with the server
          // For now, we'll simulate successful sync
          await reminderDatabase.removeFromOfflineQueue(item.id);
          synced++;
        } catch (error) {
          console.error(`Failed to sync item ${item.id}:`, error);
          failed++;
        }
      }

      // Get remaining queue size
      const remainingItems = await reminderDatabase.getPendingOfflineReminders();
      
      return {
        synced,
        failed,
        remainingQueueSize: remainingItems.length
      };

    } catch (error) {
      console.error('Offline queue sync failed:', error);
      return { synced: 0, failed: 0, remainingQueueSize: 0 };
    }
  }

  /**
   * Optimize battery usage by adjusting task intervals
   */
  private async optimizeBatteryUsage(): Promise<{
    optimized: number;
    batterySavings: number;
    nextOptimization: Date;
  }> {
    try {
      let optimized = 0;
      let totalSavings = 0;

      // Get current battery usage data
      const batteryUsage = await this.getBatteryUsageData();
      
      for (const [taskName, config] of this.taskConfigs.entries()) {
        if (!config.batteryOptimized) continue;

        const metrics = this.performanceMetrics.get(taskName);
        if (!metrics) continue;

        // Calculate if task interval should be adjusted
        const currentImpact = metrics.totalBatteryImpact;
        const averageExecution = metrics.averageExecutionTime;

        // If battery impact is high and execution time is consistent, increase interval
        if (currentImpact > 1.0 && averageExecution > 0) { // More than 1% battery impact
          const newInterval = Math.min(config.interval * 1.5, 3600); // Max 1 hour
          
          if (newInterval !== config.interval) {
            config.interval = newInterval;
            config.metadata.lastRun = new Date();
            
            // Re-register task with new interval
            await BackgroundFetch.unregisterTaskAsync(taskName);
            await BackgroundFetch.registerTaskAsync(taskName, {
              minimumInterval: newInterval,
              stopOnTerminate: false,
              startOnBoot: true,
            });

            const estimatedSavings = (currentImpact * 0.3); // Estimated 30% savings
            totalSavings += estimatedSavings;
            optimized++;

            console.log(`Optimized ${taskName}: interval ${config.interval}s -> ${newInterval}s`);
          }
        }
      }

      // Save updated configurations
      await this.saveTaskConfigurations();

      const nextOptimization = new Date();
      nextOptimization.setHours(nextOptimization.getHours() + 6); // Next optimization in 6 hours

      return {
        optimized,
        batterySavings: totalSavings,
        nextOptimization
      };

    } catch (error) {
      console.error('Battery optimization failed:', error);
      return { optimized: 0, batterySavings: 0, nextOptimization: new Date() };
    }
  }

  /**
   * Estimate battery impact of a task
   */
  private estimateBatteryImpact(taskName: BackgroundTaskName, executionTime: number): number {
    // Base impact calculation (simplified)
    let baseImpact = 0.01; // 0.01% base cost

    // Task-specific impact
    switch (taskName) {
      case BACKGROUND_TASKS.REMINDER_PROCESSOR:
        baseImpact = 0.05; // Notifications have higher impact
        break;
      case BACKGROUND_TASKS.CULTURAL_CONSTRAINT_CHECKER:
        baseImpact = 0.02; // Location and time calculations
        break;
      case BACKGROUND_TASKS.OFFLINE_QUEUE_SYNC:
        baseImpact = 0.08; // Network operations
        break;
      case BACKGROUND_TASKS.DATABASE_MAINTENANCE:
        baseImpact = 0.03; // Database operations
        break;
    }

    // Scale by execution time (longer execution = more battery usage)
    const timeMultiplier = Math.max(1, executionTime / 1000); // Per second
    
    return baseImpact * timeMultiplier;
  }

  /**
   * Calculate next run time for a task
   */
  private calculateNextRunTime(taskName: BackgroundTaskName): Date {
    const config = this.taskConfigs.get(taskName);
    if (!config) return new Date();

    const nextRun = new Date();
    nextRun.setSeconds(nextRun.getSeconds() + config.interval);
    
    return nextRun;
  }

  /**
   * Update performance metrics for a task
   */
  private async updatePerformanceMetrics(taskName: BackgroundTaskName, result: BackgroundTaskResult): Promise<void> {
    try {
      let metrics = this.performanceMetrics.get(taskName);
      
      if (!metrics) {
        metrics = {
          totalRuns: 0,
          successfulRuns: 0,
          failedRuns: 0,
          averageExecutionTime: 0,
          totalBatteryImpact: 0,
        };
      }

      // Update metrics
      metrics.totalRuns++;
      
      if (result.success) {
        metrics.successfulRuns++;
      } else {
        metrics.failedRuns++;
      }

      // Update average execution time
      metrics.averageExecutionTime = 
        (metrics.averageExecutionTime * (metrics.totalRuns - 1) + result.executionTime) / metrics.totalRuns;

      // Update battery impact
      metrics.totalBatteryImpact += result.batteryImpact;
      metrics.lastRunTime = new Date();
      metrics.nextScheduledRun = result.nextRunTime;

      // Update task config metadata
      const config = this.taskConfigs.get(taskName);
      if (config) {
        config.metadata.lastRun = new Date();
        config.metadata.runCount++;
        
        if (!result.success) {
          config.metadata.errorCount++;
        }
        
        config.metadata.averageExecutionTime = metrics.averageExecutionTime;
      }

      this.performanceMetrics.set(taskName, metrics);

      // Save metrics periodically (every 10 runs)
      if (metrics.totalRuns % 10 === 0) {
        await this.savePerformanceMetrics();
      }

    } catch (error) {
      console.error('Failed to update performance metrics:', error);
    }
  }

  /**
   * Initialize default task configurations
   */
  private initializeDefaultConfigs(): void {
    this.taskConfigs.set(BACKGROUND_TASKS.REMINDER_PROCESSOR, {
      name: BACKGROUND_TASKS.REMINDER_PROCESSOR,
      enabled: true,
      interval: 60, // 1 minute
      priority: 'high',
      batteryOptimized: true,
      culturallyAware: true,
      metadata: {
        description: 'Processes scheduled reminders and sends notifications',
        runCount: 0,
        errorCount: 0,
        averageExecutionTime: 0
      }
    });

    this.taskConfigs.set(BACKGROUND_TASKS.CULTURAL_CONSTRAINT_CHECKER, {
      name: BACKGROUND_TASKS.CULTURAL_CONSTRAINT_CHECKER,
      enabled: true,
      interval: 300, // 5 minutes
      priority: 'normal',
      batteryOptimized: true,
      culturallyAware: false, // This task updates constraints, doesn't need to check them
      metadata: {
        description: 'Checks and updates cultural constraints like prayer times',
        runCount: 0,
        errorCount: 0,
        averageExecutionTime: 0
      }
    });

    this.taskConfigs.set(BACKGROUND_TASKS.OFFLINE_QUEUE_SYNC, {
      name: BACKGROUND_TASKS.OFFLINE_QUEUE_SYNC,
      enabled: true,
      interval: 600, // 10 minutes
      priority: 'normal',
      batteryOptimized: true,
      culturallyAware: false,
      metadata: {
        description: 'Syncs offline reminder queue with server',
        runCount: 0,
        errorCount: 0,
        averageExecutionTime: 0
      }
    });

    this.taskConfigs.set(BACKGROUND_TASKS.BATTERY_OPTIMIZER, {
      name: BACKGROUND_TASKS.BATTERY_OPTIMIZER,
      enabled: true,
      interval: 3600, // 1 hour
      priority: 'low',
      batteryOptimized: false, // This task optimizes others
      culturallyAware: false,
      metadata: {
        description: 'Optimizes battery usage by adjusting task intervals',
        runCount: 0,
        errorCount: 0,
        averageExecutionTime: 0
      }
    });

    this.taskConfigs.set(BACKGROUND_TASKS.DATABASE_MAINTENANCE, {
      name: BACKGROUND_TASKS.DATABASE_MAINTENANCE,
      enabled: true,
      interval: 86400, // 24 hours
      priority: 'low',
      batteryOptimized: false,
      culturallyAware: false,
      metadata: {
        description: 'Performs database cleanup and maintenance',
        runCount: 0,
        errorCount: 0,
        averageExecutionTime: 0
      }
    });
  }

  /**
   * Configuration and metrics persistence
   */

  private async loadTaskConfigurations(): Promise<void> {
    try {
      const configData = await AsyncStorage.getItem(this.STORAGE_KEYS.TASK_CONFIG);
      if (configData) {
        const configs = JSON.parse(configData);
        
        for (const [taskName, config] of Object.entries(configs)) {
          this.taskConfigs.set(taskName as BackgroundTaskName, config as BackgroundTaskConfig);
        }
      }
    } catch (error) {
      console.error('Failed to load task configurations:', error);
    }
  }

  private async saveTaskConfigurations(): Promise<void> {
    try {
      const configs = Object.fromEntries(this.taskConfigs);
      await AsyncStorage.setItem(this.STORAGE_KEYS.TASK_CONFIG, JSON.stringify(configs));
    } catch (error) {
      console.error('Failed to save task configurations:', error);
    }
  }

  private async loadPerformanceMetrics(): Promise<void> {
    try {
      const metricsData = await AsyncStorage.getItem(this.STORAGE_KEYS.PERFORMANCE_METRICS);
      if (metricsData) {
        const metrics = JSON.parse(metricsData);
        
        for (const [taskName, metric] of Object.entries(metrics)) {
          this.performanceMetrics.set(taskName as BackgroundTaskName, metric as BackgroundTaskStats);
        }
      }
    } catch (error) {
      console.error('Failed to load performance metrics:', error);
    }
  }

  private async savePerformanceMetrics(): Promise<void> {
    try {
      const metrics = Object.fromEntries(this.performanceMetrics);
      await AsyncStorage.setItem(this.STORAGE_KEYS.PERFORMANCE_METRICS, JSON.stringify(metrics));
    } catch (error) {
      console.error('Failed to save performance metrics:', error);
    }
  }

  private async getBatteryUsageData(): Promise<any> {
    try {
      const batteryData = await AsyncStorage.getItem(this.STORAGE_KEYS.BATTERY_USAGE);
      return batteryData ? JSON.parse(batteryData) : {};
    } catch (error) {
      console.error('Failed to get battery usage data:', error);
      return {};
    }
  }

  /**
   * Public API methods
   */

  async updateTaskConfig(taskName: BackgroundTaskName, updates: Partial<BackgroundTaskConfig>): Promise<void> {
    const config = this.taskConfigs.get(taskName);
    if (!config) {
      throw new Error(`Task ${taskName} not found`);
    }

    // Update configuration
    Object.assign(config, updates);
    this.taskConfigs.set(taskName, config);

    // Re-register task with new configuration if it's running
    if (config.enabled) {
      await BackgroundFetch.unregisterTaskAsync(taskName);
      await BackgroundFetch.registerTaskAsync(taskName, {
        minimumInterval: config.interval,
        stopOnTerminate: false,
        startOnBoot: true,
      });
    }

    await this.saveTaskConfigurations();
  }

  async enableTask(taskName: BackgroundTaskName): Promise<void> {
    await this.updateTaskConfig(taskName, { enabled: true });
  }

  async disableTask(taskName: BackgroundTaskName): Promise<void> {
    const config = this.taskConfigs.get(taskName);
    if (config?.enabled) {
      await BackgroundFetch.unregisterTaskAsync(taskName);
      await this.updateTaskConfig(taskName, { enabled: false });
    }
  }

  getTaskConfig(taskName: BackgroundTaskName): BackgroundTaskConfig | undefined {
    return this.taskConfigs.get(taskName);
  }

  getAllTaskConfigs(): Map<BackgroundTaskName, BackgroundTaskConfig> {
    return new Map(this.taskConfigs);
  }

  getTaskMetrics(taskName: BackgroundTaskName): BackgroundTaskStats | undefined {
    return this.performanceMetrics.get(taskName);
  }

  getAllTaskMetrics(): Map<BackgroundTaskName, BackgroundTaskStats> {
    return new Map(this.performanceMetrics);
  }

  async getOverallBatteryImpact(): Promise<number> {
    let totalImpact = 0;
    
    for (const metrics of this.performanceMetrics.values()) {
      totalImpact += metrics.totalBatteryImpact;
    }
    
    return totalImpact;
  }

  isInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Cleanup and shutdown
   */
  async shutdown(): Promise<void> {
    try {
      // Unregister all background tasks
      for (const taskName of this.taskConfigs.keys()) {
        await BackgroundFetch.unregisterTaskAsync(taskName);
      }

      // Save final metrics
      await this.saveTaskConfigurations();
      await this.savePerformanceMetrics();

      this.isInitialized = false;
      console.log('Background task service shutdown completed');

    } catch (error) {
      console.error('Background task service shutdown failed:', error);
    }
  }
}

export default BackgroundTaskService;