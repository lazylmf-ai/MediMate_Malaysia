/**
 * Smart Batching Service for Battery Optimization
 * 
 * Advanced batching system for Issue #24 Stream A that intelligently groups reminders
 * to minimize battery usage while respecting cultural constraints and delivery priorities.
 * 
 * Features:
 * - Intelligent reminder grouping based on time windows
 * - Battery-aware scheduling with adaptive intervals
 * - Cultural constraint preservation in batches
 * - Priority-based batch ordering
 * - Performance analytics and optimization
 * - Fallback strategies for batch delivery failures
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Battery from 'expo-battery';

import { 
  ReminderSchedule, 
  OfflineReminderQueue,
  BatchedReminder
} from './ReminderSchedulingService';
import CulturalConstraintEngine from './CulturalConstraintEngine';
import { reminderDatabase } from '../../models/ReminderDatabase';

export interface BatchingStrategy {
  name: string;
  maxBatchSize: number;
  timeWindowMinutes: number;
  batteryThreshold: number; // Minimum battery level to use this strategy
  culturalAware: boolean;
  priorityGrouping: boolean;
  adaptiveScheduling: boolean;
}

export interface SmartBatch {
  id: string;
  reminders: OfflineReminderQueue[];
  scheduledTime: Date;
  estimatedBatteryImpact: number;
  culturalOptimized: boolean;
  priority: 'low' | 'medium' | 'high' | 'critical';
  strategy: BatchingStrategy;
  retryPolicy: {
    maxRetries: number;
    currentRetries: number;
    backoffMultiplier: number;
  };
  metadata: {
    createdAt: Date;
    lastModified: Date;
    deliveryAttempts: number;
    totalReminders: number;
    successfulDeliveries: number;
    failedDeliveries: number;
  };
}

export interface BatchDeliveryResult {
  batchId: string;
  success: boolean;
  deliveredCount: number;
  failedCount: number;
  batteryUsed: number;
  culturalAdjustments: string[];
  executionTime: number;
  nextRetryTime?: Date;
}

export interface BatchingAnalytics {
  totalBatches: number;
  successRate: number;
  averageBatchSize: number;
  averageBatteryImpact: number;
  culturalOptimizations: number;
  batteryEfficiency: number; // Reminders delivered per % battery
  bestStrategy: BatchingStrategy;
  recommendations: string[];
}

export interface BatteryOptimizationConfig {
  enableSmartBatching: boolean;
  maxBatteryUsagePercent: number;
  lowBatteryThreshold: number;
  adaptiveIntervals: boolean;
  culturalConstraintPriority: 'low' | 'medium' | 'high';
  performanceMonitoring: boolean;
}

class SmartBatchingService {
  private static instance: SmartBatchingService;
  private culturalConstraintEngine: CulturalConstraintEngine;
  private activeBatches: Map<string, SmartBatch> = new Map();
  private batchingStrategies: Map<string, BatchingStrategy> = new Map();
  private performanceMetrics: Map<string, any> = new Map();
  
  private readonly STORAGE_KEYS = {
    BATCHING_CONFIG: 'smart_batching_config',
    PERFORMANCE_METRICS: 'batching_performance_metrics',
    STRATEGY_ANALYTICS: 'batching_strategy_analytics',
  };

  private readonly DEFAULT_STRATEGIES: BatchingStrategy[] = [
    {
      name: 'high_battery_aggressive',
      maxBatchSize: 10,
      timeWindowMinutes: 30,
      batteryThreshold: 50,
      culturalAware: true,
      priorityGrouping: true,
      adaptiveScheduling: true
    },
    {
      name: 'medium_battery_balanced',
      maxBatchSize: 6,
      timeWindowMinutes: 45,
      batteryThreshold: 25,
      culturalAware: true,
      priorityGrouping: true,
      adaptiveScheduling: true
    },
    {
      name: 'low_battery_conservative',
      maxBatchSize: 3,
      timeWindowMinutes: 60,
      batteryThreshold: 0,
      culturalAware: false, // Prioritize battery over cultural optimization when low
      priorityGrouping: true,
      adaptiveScheduling: false
    },
    {
      name: 'cultural_priority',
      maxBatchSize: 8,
      timeWindowMinutes: 15,
      batteryThreshold: 30,
      culturalAware: true,
      priorityGrouping: false,
      adaptiveScheduling: true
    }
  ];

  private config: BatteryOptimizationConfig = {
    enableSmartBatching: true,
    maxBatteryUsagePercent: 5.0,
    lowBatteryThreshold: 20,
    adaptiveIntervals: true,
    culturalConstraintPriority: 'high',
    performanceMonitoring: true
  };

  private constructor() {
    this.culturalConstraintEngine = CulturalConstraintEngine.getInstance();
    this.initializeStrategies();
  }

  static getInstance(): SmartBatchingService {
    if (!SmartBatchingService.instance) {
      SmartBatchingService.instance = new SmartBatchingService();
    }
    return SmartBatchingService.instance;
  }

  /**
   * Initialize the smart batching service
   */
  async initialize(): Promise<{ success: boolean; error?: string }> {
    try {
      // Load configuration
      await this.loadConfiguration();
      
      // Load performance metrics
      await this.loadPerformanceMetrics();
      
      // Start periodic batch optimization
      this.startBatchOptimization();
      
      return { success: true };
    } catch (error) {
      console.error('Smart batching service initialization failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Initialization failed'
      };
    }
  }

  /**
   * Create smart batches from pending reminders
   */
  async createSmartBatches(
    pendingReminders: OfflineReminderQueue[]
  ): Promise<SmartBatch[]> {
    try {
      if (!this.config.enableSmartBatching || pendingReminders.length === 0) {
        return [];
      }

      // Get current battery level and select strategy
      const batteryLevel = await this.getCurrentBatteryLevel();
      const strategy = this.selectOptimalStrategy(batteryLevel, pendingReminders);
      
      console.log(`Creating batches with strategy: ${strategy.name}, Battery: ${batteryLevel}%`);

      // Group reminders by priority if strategy requires it
      const reminderGroups = strategy.priorityGrouping ? 
        this.groupRemindersByPriority(pendingReminders) : 
        { all: pendingReminders };

      const batches: SmartBatch[] = [];

      // Create batches for each group
      for (const [groupName, reminders] of Object.entries(reminderGroups)) {
        const groupBatches = await this.createBatchesForGroup(reminders, strategy, groupName);
        batches.push(...groupBatches);
      }

      // Apply cultural optimization if enabled
      if (strategy.culturalAware) {
        await this.applyCulturalOptimization(batches);
      }

      // Store batches for tracking
      for (const batch of batches) {
        this.activeBatches.set(batch.id, batch);
        await reminderDatabase.insertBatchedReminder({
          batch_id: batch.id,
          reminder_ids: JSON.stringify(batch.reminders.map(r => r.id)),
          scheduled_time: batch.scheduledTime.toISOString(),
          cultural_context: JSON.stringify(batch.culturalOptimized),
          estimated_battery_impact: batch.estimatedBatteryImpact,
          status: 'pending'
        });
      }

      // Update performance metrics
      await this.updateBatchCreationMetrics(batches, strategy);

      return batches;

    } catch (error) {
      console.error('Failed to create smart batches:', error);
      return [];
    }
  }

  /**
   * Process and deliver a batch of reminders
   */
  async processBatch(batch: SmartBatch): Promise<BatchDeliveryResult> {
    const startTime = Date.now();
    let deliveredCount = 0;
    let failedCount = 0;
    let batteryUsed = 0;
    const culturalAdjustments: string[] = [];

    try {
      console.log(`Processing batch ${batch.id} with ${batch.reminders.length} reminders`);

      // Check battery level before processing
      const currentBattery = await this.getCurrentBatteryLevel();
      if (currentBattery < this.config.lowBatteryThreshold) {
        // Use conservative strategy
        console.log(`Battery low (${currentBattery}%), using conservative processing`);
      }

      // Check cultural constraints before batch delivery
      if (batch.culturalOptimized) {
        const constraintResult = await this.checkBatchCulturalConstraints(batch);
        if (!constraintResult.canProceed) {
          culturalAdjustments.push(...constraintResult.adjustments);
          
          // Reschedule batch if needed
          if (constraintResult.suggestedTime) {
            batch.scheduledTime = constraintResult.suggestedTime;
            await this.updateBatchSchedule(batch);
            
            return {
              batchId: batch.id,
              success: false,
              deliveredCount: 0,
              failedCount: 0,
              batteryUsed: 0,
              culturalAdjustments,
              executionTime: Date.now() - startTime,
              nextRetryTime: constraintResult.suggestedTime
            };
          }
        }
      }

      // Process reminders in batch
      for (const reminder of batch.reminders) {
        try {
          const deliveryResult = await this.deliverSingleReminder(reminder, batch);
          
          if (deliveryResult.success) {
            deliveredCount++;
            batteryUsed += deliveryResult.batteryImpact;
            
            // Remove delivered reminder from offline queue
            await reminderDatabase.removeFromOfflineQueue(reminder.id);
          } else {
            failedCount++;
            
            // Update retry count
            await reminderDatabase.updateOfflineReminderAttempt(reminder.id);
          }

        } catch (reminderError) {
          console.error(`Failed to deliver reminder ${reminder.id}:`, reminderError);
          failedCount++;
        }
      }

      // Update batch metadata
      batch.metadata.deliveryAttempts++;
      batch.metadata.successfulDeliveries += deliveredCount;
      batch.metadata.failedDeliveries += failedCount;
      batch.metadata.lastModified = new Date();

      const success = deliveredCount > 0;
      const executionTime = Date.now() - startTime;

      // Handle retry logic for failed deliveries
      let nextRetryTime: Date | undefined;
      if (failedCount > 0 && batch.retryPolicy.currentRetries < batch.retryPolicy.maxRetries) {
        batch.retryPolicy.currentRetries++;
        nextRetryTime = new Date(
          Date.now() + 
          Math.pow(batch.retryPolicy.backoffMultiplier, batch.retryPolicy.currentRetries) * 60 * 1000
        );
      } else if (failedCount > 0) {
        // Max retries reached, remove batch
        await this.handleBatchFailure(batch);
      }

      // Update performance metrics
      await this.updateBatchDeliveryMetrics(batch, deliveredCount, failedCount, batteryUsed, executionTime);

      // Update database
      await reminderDatabase.updateBatchStatus(
        batch.id, 
        success ? 'completed' : (nextRetryTime ? 'pending' : 'failed')
      );

      const result: BatchDeliveryResult = {
        batchId: batch.id,
        success,
        deliveredCount,
        failedCount,
        batteryUsed,
        culturalAdjustments,
        executionTime,
        nextRetryTime
      };

      console.log(`Batch ${batch.id} processed: ${deliveredCount} delivered, ${failedCount} failed, ${batteryUsed.toFixed(2)}% battery used`);

      return result;

    } catch (error) {
      console.error(`Batch processing failed for ${batch.id}:`, error);
      
      // Handle critical failure
      await this.handleBatchFailure(batch);
      
      return {
        batchId: batch.id,
        success: false,
        deliveredCount: 0,
        failedCount: batch.reminders.length,
        batteryUsed: 0,
        culturalAdjustments,
        executionTime: Date.now() - startTime
      };
    }
  }

  /**
   * Analyze batching performance and optimize strategies
   */
  async analyzeBatchingPerformance(): Promise<BatchingAnalytics> {
    try {
      const metrics = await this.getStoredMetrics();
      
      let totalBatches = 0;
      let successfulBatches = 0;
      let totalReminders = 0;
      let totalBatteryUsed = 0;
      let culturalOptimizations = 0;
      
      const strategyPerformance = new Map<string, {
        batches: number;
        success: number;
        batteryEfficiency: number;
      }>();

      // Analyze metrics
      for (const [strategyName, strategyMetrics] of metrics.entries()) {
        totalBatches += strategyMetrics.batchCount || 0;
        successfulBatches += strategyMetrics.successfulBatches || 0;
        totalReminders += strategyMetrics.totalReminders || 0;
        totalBatteryUsed += strategyMetrics.totalBatteryUsed || 0;
        culturalOptimizations += strategyMetrics.culturalOptimizations || 0;
        
        strategyPerformance.set(strategyName, {
          batches: strategyMetrics.batchCount || 0,
          success: strategyMetrics.successfulBatches || 0,
          batteryEfficiency: strategyMetrics.batteryEfficiency || 0
        });
      }

      // Find best performing strategy
      let bestStrategy = this.DEFAULT_STRATEGIES[0];
      let bestEfficiency = 0;
      
      for (const [strategyName, performance] of strategyPerformance.entries()) {
        if (performance.batteryEfficiency > bestEfficiency) {
          bestEfficiency = performance.batteryEfficiency;
          const strategy = this.batchingStrategies.get(strategyName);
          if (strategy) bestStrategy = strategy;
        }
      }

      // Generate recommendations
      const recommendations = await this.generateOptimizationRecommendations(metrics);

      return {
        totalBatches,
        successRate: totalBatches > 0 ? successfulBatches / totalBatches : 0,
        averageBatchSize: totalBatches > 0 ? totalReminders / totalBatches : 0,
        averageBatteryImpact: totalBatches > 0 ? totalBatteryUsed / totalBatches : 0,
        culturalOptimizations,
        batteryEfficiency: totalBatteryUsed > 0 ? totalReminders / totalBatteryUsed : 0,
        bestStrategy,
        recommendations
      };

    } catch (error) {
      console.error('Failed to analyze batching performance:', error);
      return {
        totalBatches: 0,
        successRate: 0,
        averageBatchSize: 0,
        averageBatteryImpact: 0,
        culturalOptimizations: 0,
        batteryEfficiency: 0,
        bestStrategy: this.DEFAULT_STRATEGIES[0],
        recommendations: ['Unable to analyze performance due to error']
      };
    }
  }

  /**
   * Private helper methods
   */

  private initializeStrategies(): void {
    for (const strategy of this.DEFAULT_STRATEGIES) {
      this.batchingStrategies.set(strategy.name, strategy);
    }
  }

  private async getCurrentBatteryLevel(): Promise<number> {
    try {
      const batteryLevel = await Battery.getBatteryLevelAsync();
      return Math.round(batteryLevel * 100);
    } catch (error) {
      console.error('Failed to get battery level:', error);
      return 50; // Default assumption
    }
  }

  private selectOptimalStrategy(
    batteryLevel: number, 
    pendingReminders: OfflineReminderQueue[]
  ): BatchingStrategy {
    // Filter strategies by battery threshold
    const eligibleStrategies = Array.from(this.batchingStrategies.values())
      .filter(strategy => batteryLevel >= strategy.batteryThreshold)
      .sort((a, b) => b.batteryThreshold - a.batteryThreshold);

    if (eligibleStrategies.length === 0) {
      // Use most conservative strategy
      return this.batchingStrategies.get('low_battery_conservative')!;
    }

    // Check for cultural constraints requirement
    const hasCulturalConstraints = pendingReminders.some(
      reminder => reminder.cultural_context && Object.keys(JSON.parse(reminder.cultural_context)).length > 0
    );

    if (hasCulturalConstraints && this.config.culturalConstraintPriority === 'high') {
      const culturalStrategy = eligibleStrategies.find(s => s.culturalAware);
      if (culturalStrategy) return culturalStrategy;
    }

    // Check for critical priority reminders
    const hasCriticalReminders = pendingReminders.some(r => r.queue_priority === 'critical');
    if (hasCriticalReminders) {
      const priorityStrategy = eligibleStrategies.find(s => s.priorityGrouping);
      if (priorityStrategy) return priorityStrategy;
    }

    // Use the best eligible strategy (highest battery threshold = most aggressive)
    return eligibleStrategies[0];
  }

  private groupRemindersByPriority(
    reminders: OfflineReminderQueue[]
  ): Record<string, OfflineReminderQueue[]> {
    const groups: Record<string, OfflineReminderQueue[]> = {
      critical: [],
      high: [],
      medium: [],
      low: []
    };

    for (const reminder of reminders) {
      groups[reminder.queue_priority].push(reminder);
    }

    return groups;
  }

  private async createBatchesForGroup(
    reminders: OfflineReminderQueue[],
    strategy: BatchingStrategy,
    groupName: string
  ): Promise<SmartBatch[]> {
    if (reminders.length === 0) return [];

    const batches: SmartBatch[] = [];
    
    // Sort reminders by scheduled time
    const sortedReminders = [...reminders].sort(
      (a, b) => new Date(a.scheduled_delivery).getTime() - new Date(b.scheduled_delivery).getTime()
    );

    let currentBatch: OfflineReminderQueue[] = [];
    let batchStartTime: Date = new Date(sortedReminders[0].scheduled_delivery);

    for (const reminder of sortedReminders) {
      const reminderTime = new Date(reminder.scheduled_delivery);
      
      // Check if reminder fits in current batch
      const timeDiff = reminderTime.getTime() - batchStartTime.getTime();
      const fitsTimeWindow = timeDiff <= strategy.timeWindowMinutes * 60 * 1000;
      const fitsSize = currentBatch.length < strategy.maxBatchSize;

      if (fitsTimeWindow && fitsSize && currentBatch.length > 0) {
        currentBatch.push(reminder);
      } else {
        // Create batch from current reminders
        if (currentBatch.length > 0) {
          const batch = await this.createBatchFromReminders(currentBatch, strategy, groupName);
          batches.push(batch);
        }
        
        // Start new batch
        currentBatch = [reminder];
        batchStartTime = reminderTime;
      }
    }

    // Create final batch
    if (currentBatch.length > 0) {
      const batch = await this.createBatchFromReminders(currentBatch, strategy, groupName);
      batches.push(batch);
    }

    return batches;
  }

  private async createBatchFromReminders(
    reminders: OfflineReminderQueue[],
    strategy: BatchingStrategy,
    groupName: string
  ): Promise<SmartBatch> {
    // Calculate optimal batch time (median of all reminder times)
    const times = reminders.map(r => new Date(r.scheduled_delivery).getTime()).sort();
    const medianTime = times[Math.floor(times.length / 2)];
    
    // Determine batch priority (highest priority of all reminders)
    const priorities = ['low', 'medium', 'high', 'critical'];
    let batchPriority: SmartBatch['priority'] = 'low';
    
    for (const reminder of reminders) {
      const reminderPriorityIndex = priorities.indexOf(reminder.queue_priority);
      const currentPriorityIndex = priorities.indexOf(batchPriority);
      
      if (reminderPriorityIndex > currentPriorityIndex) {
        batchPriority = reminder.queue_priority;
      }
    }

    // Estimate battery impact
    const baseBatteryImpact = this.calculateBaseBatteryImpact(reminders.length);
    const strategyMultiplier = this.getStrategyBatteryMultiplier(strategy);
    const estimatedBatteryImpact = baseBatteryImpact * strategyMultiplier;

    const batch: SmartBatch = {
      id: `batch_${groupName}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      reminders,
      scheduledTime: new Date(medianTime),
      estimatedBatteryImpact,
      culturalOptimized: strategy.culturalAware,
      priority: batchPriority,
      strategy,
      retryPolicy: {
        maxRetries: batchPriority === 'critical' ? 5 : 3,
        currentRetries: 0,
        backoffMultiplier: 2
      },
      metadata: {
        createdAt: new Date(),
        lastModified: new Date(),
        deliveryAttempts: 0,
        totalReminders: reminders.length,
        successfulDeliveries: 0,
        failedDeliveries: 0
      }
    };

    return batch;
  }

  private calculateBaseBatteryImpact(reminderCount: number): number {
    // Base calculation: 0.05% per reminder + overhead
    const baseImpactPerReminder = 0.05;
    const batchOverhead = 0.02;
    
    return (reminderCount * baseImpactPerReminder) + batchOverhead;
  }

  private getStrategyBatteryMultiplier(strategy: BatchingStrategy): number {
    // Cultural awareness adds overhead but improves user experience
    let multiplier = 1.0;
    
    if (strategy.culturalAware) multiplier += 0.2;
    if (strategy.adaptiveScheduling) multiplier += 0.1;
    if (strategy.priorityGrouping) multiplier += 0.05;
    
    return multiplier;
  }

  private async applyCulturalOptimization(batches: SmartBatch[]): Promise<void> {
    for (const batch of batches) {
      if (!batch.culturalOptimized) continue;

      try {
        // Get a representative user ID from the batch reminders
        const userIds = [...new Set(batch.reminders.map(r => 
          JSON.parse(r.cultural_context || '{}').userId
        ))].filter(Boolean);

        if (userIds.length > 0) {
          // Check cultural constraints for the batch time
          const constraintResult = await this.culturalConstraintEngine.evaluateConstraints(
            batch.scheduledTime,
            userIds[0] // Use first user ID as representative
          );

          if (constraintResult.timeAdjustment) {
            batch.scheduledTime = constraintResult.timeAdjustment.adjustedTime;
            console.log(`Batch ${batch.id} time adjusted for cultural constraints: ${constraintResult.timeAdjustment.adjustmentReason}`);
          }
        }
      } catch (error) {
        console.error(`Failed to apply cultural optimization to batch ${batch.id}:`, error);
      }
    }
  }

  private async checkBatchCulturalConstraints(batch: SmartBatch): Promise<{
    canProceed: boolean;
    adjustments: string[];
    suggestedTime?: Date;
  }> {
    try {
      // Check if any reminders in the batch have cultural constraints
      const culturalReminders = batch.reminders.filter(
        r => r.cultural_context && Object.keys(JSON.parse(r.cultural_context)).length > 0
      );

      if (culturalReminders.length === 0) {
        return { canProceed: true, adjustments: [] };
      }

      // Use the first cultural reminder to check constraints
      const culturalContext = JSON.parse(culturalReminders[0].cultural_context);
      const userId = culturalContext.userId;

      if (!userId) {
        return { canProceed: true, adjustments: [] };
      }

      const constraintResult = await this.culturalConstraintEngine.evaluateConstraints(
        batch.scheduledTime,
        userId
      );

      return {
        canProceed: constraintResult.canProceed,
        adjustments: constraintResult.recommendations,
        suggestedTime: constraintResult.nextAvailableSlot
      };

    } catch (error) {
      console.error('Failed to check batch cultural constraints:', error);
      return { canProceed: true, adjustments: ['Error checking cultural constraints'] };
    }
  }

  private async deliverSingleReminder(
    reminder: OfflineReminderQueue,
    batch: SmartBatch
  ): Promise<{ success: boolean; batteryImpact: number }> {
    try {
      // Simulate reminder delivery
      // In a real implementation, this would integrate with notification services
      
      const deliveryMethods = JSON.parse(reminder.delivery_methods);
      let success = false;
      let batteryImpact = 0.02; // Base impact

      // Try delivery methods in priority order
      for (const method of deliveryMethods.sort((a: any, b: any) => b.priority - a.priority)) {
        try {
          // Simulate method-specific delivery
          switch (method.type) {
            case 'push_notification':
              success = Math.random() > 0.1; // 90% success rate
              batteryImpact += 0.03;
              break;
            case 'sms':
              success = Math.random() > 0.05; // 95% success rate
              batteryImpact += 0.08; // SMS uses more battery
              break;
            default:
              success = Math.random() > 0.15; // 85% success rate
              batteryImpact += 0.05;
          }

          if (success) break; // Stop trying other methods
        } catch (methodError) {
          console.error(`Delivery method ${method.type} failed:`, methodError);
          continue;
        }
      }

      return { success, batteryImpact };

    } catch (error) {
      console.error('Single reminder delivery failed:', error);
      return { success: false, batteryImpact: 0.02 };
    }
  }

  private async updateBatchSchedule(batch: SmartBatch): Promise<void> {
    try {
      batch.metadata.lastModified = new Date();
      this.activeBatches.set(batch.id, batch);
      
      await reminderDatabase.updateBatchStatus(batch.id, 'pending');
    } catch (error) {
      console.error('Failed to update batch schedule:', error);
    }
  }

  private async handleBatchFailure(batch: SmartBatch): Promise<void> {
    try {
      console.log(`Handling failure for batch ${batch.id}`);
      
      // Move failed reminders back to individual processing
      for (const reminder of batch.reminders) {
        if (reminder.attempts < 3) {
          // Reset attempts for individual retry
          reminder.attempts = 0;
          reminder.scheduled_delivery = new Date(Date.now() + 15 * 60 * 1000).toISOString();
          
          await reminderDatabase.updateOfflineReminderAttempt(reminder.id);
        }
      }
      
      // Remove batch from active batches
      this.activeBatches.delete(batch.id);
      
      // Update database
      await reminderDatabase.updateBatchStatus(batch.id, 'failed');
      
    } catch (error) {
      console.error('Failed to handle batch failure:', error);
    }
  }

  private startBatchOptimization(): void {
    // Run optimization every hour
    setInterval(async () => {
      try {
        await this.optimizeBatchingStrategies();
      } catch (error) {
        console.error('Batch optimization failed:', error);
      }
    }, 60 * 60 * 1000);
  }

  private async optimizeBatchingStrategies(): Promise<void> {
    try {
      const analytics = await this.analyzeBatchingPerformance();
      
      // Update strategy parameters based on performance
      if (analytics.batteryEfficiency < 10) { // Less than 10 reminders per % battery
        // Increase batch sizes to improve efficiency
        for (const strategy of this.batchingStrategies.values()) {
          if (strategy.maxBatchSize < 15) {
            strategy.maxBatchSize = Math.min(strategy.maxBatchSize + 2, 15);
          }
        }
        console.log('Increased batch sizes to improve battery efficiency');
      }
      
      if (analytics.successRate < 0.8) { // Less than 80% success rate
        // Use more conservative strategies
        for (const strategy of this.batchingStrategies.values()) {
          strategy.maxBatchSize = Math.max(strategy.maxBatchSize - 1, 2);
          strategy.timeWindowMinutes = Math.min(strategy.timeWindowMinutes + 15, 90);
        }
        console.log('Applied conservative adjustments due to low success rate');
      }
      
      // Save optimized strategies
      await this.saveConfiguration();
      
    } catch (error) {
      console.error('Strategy optimization failed:', error);
    }
  }

  private async updateBatchCreationMetrics(
    batches: SmartBatch[],
    strategy: BatchingStrategy
  ): Promise<void> {
    try {
      const metrics = this.performanceMetrics.get(strategy.name) || {
        batchCount: 0,
        totalReminders: 0,
        averageBatchSize: 0,
        creationTime: 0
      };
      
      metrics.batchCount += batches.length;
      metrics.totalReminders += batches.reduce((sum, batch) => sum + batch.reminders.length, 0);
      metrics.averageBatchSize = metrics.totalReminders / metrics.batchCount;
      
      this.performanceMetrics.set(strategy.name, metrics);
      
      // Periodically save metrics
      if (metrics.batchCount % 10 === 0) {
        await this.savePerformanceMetrics();
      }
      
    } catch (error) {
      console.error('Failed to update batch creation metrics:', error);
    }
  }

  private async updateBatchDeliveryMetrics(
    batch: SmartBatch,
    delivered: number,
    failed: number,
    batteryUsed: number,
    executionTime: number
  ): Promise<void> {
    try {
      const metrics = this.performanceMetrics.get(batch.strategy.name) || {};
      
      metrics.successfulBatches = (metrics.successfulBatches || 0) + (delivered > failed ? 1 : 0);
      metrics.totalBatteryUsed = (metrics.totalBatteryUsed || 0) + batteryUsed;
      metrics.averageExecutionTime = metrics.averageExecutionTime ? 
        (metrics.averageExecutionTime + executionTime) / 2 : executionTime;
      metrics.batteryEfficiency = (metrics.totalReminders || 0) / (metrics.totalBatteryUsed || 1);
      
      if (batch.culturalOptimized) {
        metrics.culturalOptimizations = (metrics.culturalOptimizations || 0) + 1;
      }
      
      this.performanceMetrics.set(batch.strategy.name, metrics);
      
    } catch (error) {
      console.error('Failed to update batch delivery metrics:', error);
    }
  }

  private async generateOptimizationRecommendations(
    metrics: Map<string, any>
  ): Promise<string[]> {
    const recommendations: string[] = [];
    
    // Analyze overall performance
    let totalBatches = 0;
    let totalSuccess = 0;
    let avgBatteryUsage = 0;
    
    for (const metric of metrics.values()) {
      totalBatches += metric.batchCount || 0;
      totalSuccess += metric.successfulBatches || 0;
      avgBatteryUsage += metric.totalBatteryUsed || 0;
    }
    
    const successRate = totalBatches > 0 ? totalSuccess / totalBatches : 0;
    avgBatteryUsage = totalBatches > 0 ? avgBatteryUsage / totalBatches : 0;
    
    // Generate specific recommendations
    if (successRate < 0.8) {
      recommendations.push('Consider reducing batch sizes or increasing time windows for better reliability');
    }
    
    if (avgBatteryUsage > 0.5) {
      recommendations.push('Battery usage is high - enable more aggressive optimization strategies');
    }
    
    if (successRate > 0.95 && avgBatteryUsage < 0.2) {
      recommendations.push('Performance is excellent - consider increasing batch sizes for even better efficiency');
    }
    
    return recommendations;
  }

  // Configuration and metrics persistence

  private async loadConfiguration(): Promise<void> {
    try {
      const configData = await AsyncStorage.getItem(this.STORAGE_KEYS.BATCHING_CONFIG);
      if (configData) {
        const savedConfig = JSON.parse(configData);
        this.config = { ...this.config, ...savedConfig };
      }
    } catch (error) {
      console.error('Failed to load batching configuration:', error);
    }
  }

  private async saveConfiguration(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEYS.BATCHING_CONFIG, JSON.stringify(this.config));
    } catch (error) {
      console.error('Failed to save batching configuration:', error);
    }
  }

  private async loadPerformanceMetrics(): Promise<void> {
    try {
      const metricsData = await AsyncStorage.getItem(this.STORAGE_KEYS.PERFORMANCE_METRICS);
      if (metricsData) {
        const metrics = JSON.parse(metricsData);
        for (const [key, value] of Object.entries(metrics)) {
          this.performanceMetrics.set(key, value);
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

  private async getStoredMetrics(): Promise<Map<string, any>> {
    return new Map(this.performanceMetrics);
  }

  /**
   * Public API methods
   */

  async updateConfiguration(updates: Partial<BatteryOptimizationConfig>): Promise<void> {
    this.config = { ...this.config, ...updates };
    await this.saveConfiguration();
  }

  getConfiguration(): BatteryOptimizationConfig {
    return { ...this.config };
  }

  async getBatchingAnalytics(): Promise<BatchingAnalytics> {
    return await this.analyzeBatchingPerformance();
  }

  getActiveBatches(): SmartBatch[] {
    return Array.from(this.activeBatches.values());
  }

  async getBatchById(batchId: string): Promise<SmartBatch | undefined> {
    return this.activeBatches.get(batchId);
  }

  getAllStrategies(): BatchingStrategy[] {
    return Array.from(this.batchingStrategies.values());
  }

  async updateStrategy(strategyName: string, updates: Partial<BatchingStrategy>): Promise<void> {
    const strategy = this.batchingStrategies.get(strategyName);
    if (strategy) {
      Object.assign(strategy, updates);
      await this.saveConfiguration();
    }
  }

  async clearMetrics(): Promise<void> {
    this.performanceMetrics.clear();
    await AsyncStorage.removeItem(this.STORAGE_KEYS.PERFORMANCE_METRICS);
  }
}

export default SmartBatchingService;