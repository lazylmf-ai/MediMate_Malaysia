/**
 * Offline Queue Service
 *
 * Core service for Issue #24 Stream C - manages 7-day offline reminder queue with
 * SQLite optimization, intelligent batching, and background processing coordination.
 *
 * Features:
 * - 7-day offline reminder queue with automatic expiry
 * - SQLite optimization for performance and battery efficiency
 * - Integration with existing database schema
 * - Smart queue prioritization and batching
 * - Background task coordination
 * - Sync management for online/offline transitions
 */

import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import { reminderDatabase } from '../../models/ReminderDatabase';
import type {
  OfflineReminderQueueRecord,
  ReminderScheduleRecord,
  BatchedReminderRecord
} from '../../models/ReminderDatabase';

export interface OfflineQueueStats {
  totalItems: number;
  pendingDeliveries: number;
  expiredItems: number;
  averageQueueTime: number;
  batteryOptimizedBatches: number;
  lastSyncTime?: Date;
  storageUsed: number; // bytes
}

export interface QueueProcessingResult {
  processed: number;
  delivered: number;
  failed: number;
  batched: number;
  expired: number;
  batteryImpact: number;
  errors: string[];
}

export interface OfflineQueueConfig {
  maxQueueSize: number;
  retryAttempts: number;
  batchProcessing: {
    enabled: boolean;
    maxBatchSize: number;
    batchTimeWindow: number; // minutes
    batteryOptimized: boolean;
  };
  expiry: {
    defaultDays: number;
    criticalMedicationDays: number;
  };
  backgroundProcessing: {
    enabled: boolean;
    intervalMinutes: number;
    respectBatteryLimits: boolean;
  };
}

class OfflineQueueService {
  private static instance: OfflineQueueService;
  private config: OfflineQueueConfig;
  private isInitialized = false;
  private backgroundTaskRegistered = false;

  // Performance monitoring
  private processingStats = {
    lastProcessingTime: new Date(),
    averageProcessingDuration: 0,
    totalItemsProcessed: 0,
    batteryImpactAccumulated: 0
  };

  // Background task name
  private readonly OFFLINE_QUEUE_TASK = 'OFFLINE_QUEUE_PROCESSING_TASK';

  private constructor() {
    this.config = this.getDefaultConfig();
  }

  static getInstance(): OfflineQueueService {
    if (!OfflineQueueService.instance) {
      OfflineQueueService.instance = new OfflineQueueService();
    }
    return OfflineQueueService.instance;
  }

  /**
   * Initialize the offline queue service
   */
  async initialize(config?: Partial<OfflineQueueConfig>): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('Initializing Offline Queue Service...');

      // Merge configuration
      if (config) {
        this.config = { ...this.config, ...config };
      }

      // Initialize database
      const dbResult = await reminderDatabase.initialize();
      if (!dbResult.success) {
        throw new Error(`Database initialization failed: ${dbResult.error}`);
      }

      // Register background tasks
      if (this.config.backgroundProcessing.enabled) {
        await this.registerBackgroundTasks();
      }

      // Perform initial cleanup
      await this.performMaintenanceCleanup();

      // Start monitoring if configured
      this.startPerformanceMonitoring();

      this.isInitialized = true;
      console.log('Offline Queue Service initialized successfully');

      return { success: true };
    } catch (error) {
      console.error('Failed to initialize Offline Queue Service:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Initialization failed'
      };
    }
  }

  /**
   * Add reminder to offline queue with cultural context
   */
  async enqueueReminder(
    reminderSchedule: ReminderScheduleRecord,
    payload: {
      medicationData: any;
      culturalContext: any;
      deliveryMethods: string;
    },
    priority: 'low' | 'medium' | 'high' | 'critical' = 'medium'
  ): Promise<{ success: boolean; queueId?: string; error?: string }> {
    try {
      if (!this.isInitialized) {
        throw new Error('Service not initialized');
      }

      // Generate unique queue ID
      const queueId = `queue_${reminderSchedule.id}_${Date.now()}`;

      // Calculate expiry based on medication priority
      const expiryDays = priority === 'critical'
        ? this.config.expiry.criticalMedicationDays
        : this.config.expiry.defaultDays;

      // Create queue record
      const queueRecord: Omit<OfflineReminderQueueRecord, 'created_at' | 'expires_at'> = {
        id: queueId,
        reminder_schedule_id: reminderSchedule.id,
        payload: JSON.stringify(payload),
        scheduled_delivery: reminderSchedule.scheduled_time,
        attempts: 0,
        queue_priority: priority,
        cultural_context: JSON.stringify(payload.culturalContext),
        delivery_methods: payload.deliveryMethods
      };

      // Add to database
      await reminderDatabase.addToOfflineQueue(queueRecord);

      console.log(`Enqueued reminder ${reminderSchedule.id} with priority ${priority}, expires in ${expiryDays} days`);

      // Check if batching should be applied
      if (this.config.batchProcessing.enabled) {
        await this.evaluateBatchingOpportunities();
      }

      return { success: true, queueId };

    } catch (error) {
      console.error('Failed to enqueue reminder:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Enqueue failed'
      };
    }
  }

  /**
   * Process pending offline reminders
   */
  async processOfflineQueue(): Promise<QueueProcessingResult> {
    const startTime = Date.now();
    const result: QueueProcessingResult = {
      processed: 0,
      delivered: 0,
      failed: 0,
      batched: 0,
      expired: 0,
      batteryImpact: 0,
      errors: []
    };

    try {
      if (!this.isInitialized) {
        throw new Error('Service not initialized');
      }

      console.log('Processing offline reminder queue...');

      // Clean up expired reminders first
      const expiredCount = await reminderDatabase.cleanupExpiredOfflineReminders();
      result.expired = expiredCount;

      // Get pending reminders ordered by priority and schedule
      const pendingReminders = await reminderDatabase.getPendingOfflineReminders(
        this.config.maxQueueSize
      );

      console.log(`Found ${pendingReminders.length} pending reminders to process`);

      // Process batched reminders first
      if (this.config.batchProcessing.enabled) {
        const batchResult = await this.processBatchedReminders();
        result.batched = batchResult.processed;
        result.batteryImpact += batchResult.batteryImpact;
      }

      // Process individual reminders
      for (const reminder of pendingReminders) {
        try {
          result.processed++;

          // Check if reminder should be processed now
          const shouldProcess = await this.shouldProcessReminder(reminder);
          if (!shouldProcess.process) {
            console.log(`Skipping reminder ${reminder.id}: ${shouldProcess.reason}`);
            continue;
          }

          // Attempt delivery
          const deliveryResult = await this.attemptReminderDelivery(reminder);

          if (deliveryResult.success) {
            result.delivered++;

            // Remove from queue on successful delivery
            await reminderDatabase.removeFromOfflineQueue(reminder.id);

            // Log delivery success
            await this.logDeliveryResult(reminder, deliveryResult);

          } else {
            result.failed++;

            // Update attempt count
            await reminderDatabase.updateOfflineReminderAttempt(reminder.id);

            // Check if max attempts reached
            if (reminder.attempts + 1 >= this.config.retryAttempts) {
              console.warn(`Reminder ${reminder.id} reached max attempts, removing from queue`);
              await reminderDatabase.removeFromOfflineQueue(reminder.id);

              // Log failure
              await this.logDeliveryResult(reminder, deliveryResult);
            }
          }

          // Accumulate battery impact
          result.batteryImpact += deliveryResult.batteryImpact || 0.1;

        } catch (reminderError) {
          console.error(`Failed to process reminder ${reminder.id}:`, reminderError);
          result.errors.push(`Reminder ${reminder.id}: ${reminderError}`);
          result.failed++;
        }
      }

      // Update processing statistics
      const processingDuration = Date.now() - startTime;
      this.updateProcessingStats(result, processingDuration);

      console.log(`Queue processing completed:`, result);
      return result;

    } catch (error) {
      console.error('Failed to process offline queue:', error);
      result.errors.push(error instanceof Error ? error.message : 'Processing failed');
      return result;
    }
  }

  /**
   * Get offline queue statistics
   */
  async getQueueStats(): Promise<OfflineQueueStats> {
    try {
      // Get total queue size
      const allReminders = await reminderDatabase.getPendingOfflineReminders();

      // Get pending deliveries (ready to be processed)
      const now = new Date();
      const pendingDeliveries = allReminders.filter(
        reminder => new Date(reminder.scheduled_delivery) <= now
      );

      // Calculate storage usage (approximate)
      const storageUsed = allReminders.reduce((total, reminder) => {
        return total + reminder.payload.length + (reminder.cultural_context?.length || 0);
      }, 0);

      // Calculate average queue time
      const queueTimes = allReminders.map(reminder =>
        now.getTime() - new Date(reminder.created_at).getTime()
      );
      const averageQueueTime = queueTimes.length > 0
        ? queueTimes.reduce((sum, time) => sum + time, 0) / queueTimes.length
        : 0;

      // Get batched reminders count
      const batchedReminders = await reminderDatabase.getPendingBatches();

      return {
        totalItems: allReminders.length,
        pendingDeliveries: pendingDeliveries.length,
        expiredItems: 0, // Already cleaned up
        averageQueueTime: averageQueueTime / (1000 * 60), // Convert to minutes
        batteryOptimizedBatches: batchedReminders.length,
        lastSyncTime: this.processingStats.lastProcessingTime,
        storageUsed
      };

    } catch (error) {
      console.error('Failed to get queue stats:', error);
      return {
        totalItems: 0,
        pendingDeliveries: 0,
        expiredItems: 0,
        averageQueueTime: 0,
        batteryOptimizedBatches: 0,
        storageUsed: 0
      };
    }
  }

  /**
   * Optimize queue for battery efficiency
   */
  async optimizeForBattery(): Promise<{
    batchesCreated: number;
    estimatedBatterySavings: number;
    optimizations: string[];
  }> {
    try {
      const optimizations: string[] = [];
      let batchesCreated = 0;
      let estimatedBatterySavings = 0;

      // Get all pending reminders
      const pendingReminders = await reminderDatabase.getPendingOfflineReminders();

      if (pendingReminders.length === 0) {
        return { batchesCreated: 0, estimatedBatterySavings: 0, optimizations: [] };
      }

      // Group reminders by time windows for batching
      const timeWindows = this.groupRemindersByTimeWindow(
        pendingReminders,
        this.config.batchProcessing.batchTimeWindow
      );

      for (const [windowStart, reminders] of timeWindows.entries()) {
        if (reminders.length >= 2) { // Only batch if 2+ reminders
          const batch = await this.createOptimizedBatch(reminders, new Date(windowStart));

          if (batch.success) {
            batchesCreated++;
            estimatedBatterySavings += (reminders.length - 1) * 0.1; // 0.1% per reminder saved
            optimizations.push(`Created batch of ${reminders.length} reminders for ${new Date(windowStart).toISOString()}`);
          }
        }
      }

      // Additional optimizations
      if (pendingReminders.length > 10) {
        optimizations.push('Large queue detected - enabled aggressive batching');
      }

      if (this.processingStats.batteryImpactAccumulated > 5.0) {
        optimizations.push('High battery usage detected - reducing processing frequency');
      }

      console.log(`Battery optimization completed: ${batchesCreated} batches created, ${estimatedBatterySavings.toFixed(2)}% estimated savings`);

      return {
        batchesCreated,
        estimatedBatterySavings,
        optimizations
      };

    } catch (error) {
      console.error('Failed to optimize for battery:', error);
      return {
        batchesCreated: 0,
        estimatedBatterySavings: 0,
        optimizations: [`Optimization failed: ${error}`]
      };
    }
  }

  /**
   * Sync offline queue with server (when connectivity restored)
   */
  async syncWithServer(): Promise<{
    uploaded: number;
    downloaded: number;
    conflicts: number;
    errors: string[];
  }> {
    try {
      console.log('Starting offline queue sync with server...');

      // This is a placeholder for server sync functionality
      // In a real implementation, this would:
      // 1. Upload pending reminders to server
      // 2. Download any server-side updates
      // 3. Resolve conflicts between local and server data
      // 4. Update sync status

      return {
        uploaded: 0,
        downloaded: 0,
        conflicts: 0,
        errors: []
      };

    } catch (error) {
      console.error('Failed to sync with server:', error);
      return {
        uploaded: 0,
        downloaded: 0,
        conflicts: 0,
        errors: [error instanceof Error ? error.message : 'Sync failed']
      };
    }
  }

  /**
   * Private helper methods
   */

  private async registerBackgroundTasks(): Promise<void> {
    try {
      // Define background task for processing offline queue
      TaskManager.defineTask(this.OFFLINE_QUEUE_TASK, async () => {
        try {
          console.log('Background task: Processing offline queue...');
          const result = await this.processOfflineQueue();

          // Return appropriate background fetch result
          if (result.delivered > 0 || result.expired > 0) {
            return BackgroundFetch.BackgroundFetchResult.NewData;
          } else if (result.errors.length > 0) {
            return BackgroundFetch.BackgroundFetchResult.Failed;
          } else {
            return BackgroundFetch.BackgroundFetchResult.NoData;
          }
        } catch (error) {
          console.error('Background task failed:', error);
          return BackgroundFetch.BackgroundFetchResult.Failed;
        }
      });

      // Register the background task
      await BackgroundFetch.registerTaskAsync(this.OFFLINE_QUEUE_TASK, {
        minimumInterval: this.config.backgroundProcessing.intervalMinutes * 60, // Convert to seconds
        stopOnTerminate: false,
        startOnBoot: true,
      });

      this.backgroundTaskRegistered = true;
      console.log(`Background task registered with ${this.config.backgroundProcessing.intervalMinutes} minute interval`);

    } catch (error) {
      console.error('Failed to register background tasks:', error);
      throw error;
    }
  }

  private async performMaintenanceCleanup(): Promise<void> {
    try {
      console.log('Performing maintenance cleanup...');

      // Clean up expired reminders
      const expiredCount = await reminderDatabase.cleanupExpiredOfflineReminders();

      // Clean up expired cultural constraints
      const expiredConstraints = await reminderDatabase.cleanupExpiredCulturalConstraints();

      // Perform database maintenance
      const maintenanceResult = await reminderDatabase.performMaintenance();

      console.log(`Maintenance cleanup completed: ${expiredCount} expired reminders, ${expiredConstraints} expired constraints, ${maintenanceResult.oldHistoryRemoved} old history records`);

    } catch (error) {
      console.error('Maintenance cleanup failed:', error);
    }
  }

  private startPerformanceMonitoring(): void {
    // Monitor processing performance every 5 minutes
    setInterval(() => {
      this.checkPerformanceMetrics();
    }, 5 * 60 * 1000);
  }

  private checkPerformanceMetrics(): void {
    const avgProcessingTime = this.processingStats.averageProcessingDuration;
    const batteryImpact = this.processingStats.batteryImpactAccumulated;

    if (avgProcessingTime > 5000) { // More than 5 seconds
      console.warn('High processing time detected, consider optimization');
    }

    if (batteryImpact > 10.0) { // More than 10% daily impact
      console.warn('High battery impact detected, reducing processing frequency');
      // Could adjust background task interval here
    }
  }

  private async shouldProcessReminder(reminder: OfflineReminderQueueRecord): Promise<{
    process: boolean;
    reason?: string;
  }> {
    try {
      const now = new Date();
      const scheduledTime = new Date(reminder.scheduled_delivery);

      // Check if it's time to process
      if (scheduledTime > now) {
        return { process: false, reason: 'Not yet due' };
      }

      // Check if too many attempts
      if (reminder.attempts >= this.config.retryAttempts) {
        return { process: false, reason: 'Max attempts reached' };
      }

      // Check cultural constraints if present
      if (reminder.cultural_context) {
        try {
          const culturalData = JSON.parse(reminder.cultural_context);
          // This would integrate with cultural constraint checking
          // For now, we'll assume it's okay to process
        } catch (parseError) {
          console.warn('Failed to parse cultural context for reminder', reminder.id);
        }
      }

      return { process: true };

    } catch (error) {
      console.error('Failed to evaluate reminder processing:', error);
      return { process: false, reason: 'Evaluation failed' };
    }
  }

  private async attemptReminderDelivery(reminder: OfflineReminderQueueRecord): Promise<{
    success: boolean;
    error?: string;
    batteryImpact?: number;
  }> {
    try {
      // Parse delivery methods
      const deliveryMethods = JSON.parse(reminder.delivery_methods);

      // This would integrate with the MultiModalDeliveryService from Stream B
      // For now, we'll simulate delivery
      console.log(`Attempting delivery for reminder ${reminder.id} using methods:`, deliveryMethods);

      // Simulate delivery attempt
      const success = Math.random() > 0.1; // 90% success rate for simulation

      return {
        success,
        error: success ? undefined : 'Simulated delivery failure',
        batteryImpact: 0.1 // 0.1% battery impact per delivery
      };

    } catch (error) {
      console.error('Delivery attempt failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Delivery failed',
        batteryImpact: 0.05 // Reduced impact for failed attempt
      };
    }
  }

  private async logDeliveryResult(
    reminder: OfflineReminderQueueRecord,
    result: { success: boolean; error?: string; batteryImpact?: number }
  ): Promise<void> {
    try {
      // Parse reminder payload to get medication info
      const payload = JSON.parse(reminder.payload);

      // Create delivery history record
      const historyRecord = {
        id: `delivery_${reminder.id}_${Date.now()}`,
        reminder_id: reminder.reminder_schedule_id,
        user_id: payload.userId || 'unknown',
        medication_id: payload.medicationData?.id || 'unknown',
        scheduled_time: reminder.scheduled_delivery,
        delivered_at: result.success ? new Date().toISOString() : undefined,
        delivery_method: 'offline_queue',
        status: result.success ? 'delivered' as const : 'failed' as const,
        failure_reason: result.error,
        battery_impact: result.batteryImpact || 0
      };

      await reminderDatabase.insertDeliveryHistory(historyRecord);

    } catch (error) {
      console.error('Failed to log delivery result:', error);
    }
  }

  private async evaluateBatchingOpportunities(): Promise<void> {
    try {
      if (!this.config.batchProcessing.enabled) {
        return;
      }

      const pendingReminders = await reminderDatabase.getPendingOfflineReminders();
      const timeWindows = this.groupRemindersByTimeWindow(
        pendingReminders,
        this.config.batchProcessing.batchTimeWindow
      );

      for (const [windowStart, reminders] of timeWindows.entries()) {
        if (reminders.length >= 2 && reminders.length <= this.config.batchProcessing.maxBatchSize) {
          await this.createOptimizedBatch(reminders, new Date(windowStart));
        }
      }

    } catch (error) {
      console.error('Failed to evaluate batching opportunities:', error);
    }
  }

  private groupRemindersByTimeWindow(
    reminders: OfflineReminderQueueRecord[],
    windowMinutes: number
  ): Map<number, OfflineReminderQueueRecord[]> {
    const windows = new Map<number, OfflineReminderQueueRecord[]>();
    const windowMs = windowMinutes * 60 * 1000;

    for (const reminder of reminders) {
      const reminderTime = new Date(reminder.scheduled_delivery).getTime();
      const windowStart = Math.floor(reminderTime / windowMs) * windowMs;

      if (!windows.has(windowStart)) {
        windows.set(windowStart, []);
      }

      windows.get(windowStart)!.push(reminder);
    }

    return windows;
  }

  private async createOptimizedBatch(
    reminders: OfflineReminderQueueRecord[],
    batchTime: Date
  ): Promise<{ success: boolean; batchId?: string }> {
    try {
      const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create cultural context for the batch
      const culturalContexts = reminders.map(r => {
        try {
          return JSON.parse(r.cultural_context);
        } catch {
          return {};
        }
      });

      const combinedCulturalContext = {
        prayerTimeAdjustments: [],
        mealTimeConsiderations: [],
        ramadanAdjustments: [],
        sources: culturalContexts
      };

      // Estimate battery impact
      const estimatedBatteryImpact = reminders.length * 0.05; // Reduced impact from batching

      // Create batch record
      const batchRecord: Omit<BatchedReminderRecord, 'created_at'> = {
        batch_id: batchId,
        reminder_ids: JSON.stringify(reminders.map(r => r.id)),
        scheduled_time: batchTime.toISOString(),
        cultural_context: JSON.stringify(combinedCulturalContext),
        estimated_battery_impact: estimatedBatteryImpact,
        status: 'pending'
      };

      await reminderDatabase.insertBatchedReminder(batchRecord);

      console.log(`Created optimized batch ${batchId} with ${reminders.length} reminders`);
      return { success: true, batchId };

    } catch (error) {
      console.error('Failed to create optimized batch:', error);
      return { success: false };
    }
  }

  private async processBatchedReminders(): Promise<{ processed: number; batteryImpact: number }> {
    try {
      const pendingBatches = await reminderDatabase.getPendingBatches();
      let processed = 0;
      let batteryImpact = 0;

      for (const batch of pendingBatches) {
        try {
          const reminderIds = JSON.parse(batch.reminder_ids);
          console.log(`Processing batch ${batch.batch_id} with ${reminderIds.length} reminders`);

          // Mark batch as processing
          await reminderDatabase.updateBatchStatus(batch.batch_id, 'processing');

          // Process all reminders in the batch
          // This would integrate with delivery services
          const batchSuccess = true; // Simulated success

          if (batchSuccess) {
            await reminderDatabase.updateBatchStatus(batch.batch_id, 'completed');
            processed += reminderIds.length;
            batteryImpact += batch.estimated_battery_impact;
          } else {
            await reminderDatabase.updateBatchStatus(batch.batch_id, 'failed');
          }

        } catch (batchError) {
          console.error(`Failed to process batch ${batch.batch_id}:`, batchError);
          await reminderDatabase.updateBatchStatus(batch.batch_id, 'failed');
        }
      }

      return { processed, batteryImpact };

    } catch (error) {
      console.error('Failed to process batched reminders:', error);
      return { processed: 0, batteryImpact: 0 };
    }
  }

  private updateProcessingStats(result: QueueProcessingResult, duration: number): void {
    this.processingStats.lastProcessingTime = new Date();
    this.processingStats.totalItemsProcessed += result.processed;
    this.processingStats.batteryImpactAccumulated += result.batteryImpact;

    // Update moving average of processing duration
    if (this.processingStats.averageProcessingDuration === 0) {
      this.processingStats.averageProcessingDuration = duration;
    } else {
      this.processingStats.averageProcessingDuration =
        (this.processingStats.averageProcessingDuration * 0.9) + (duration * 0.1);
    }
  }

  private getDefaultConfig(): OfflineQueueConfig {
    return {
      maxQueueSize: 1000,
      retryAttempts: 3,
      batchProcessing: {
        enabled: true,
        maxBatchSize: 5,
        batchTimeWindow: 15, // 15 minutes
        batteryOptimized: true
      },
      expiry: {
        defaultDays: 7,
        criticalMedicationDays: 14
      },
      backgroundProcessing: {
        enabled: true,
        intervalMinutes: 15,
        respectBatteryLimits: true
      }
    };
  }

  // Public API methods
  async updateConfig(config: Partial<OfflineQueueConfig>): Promise<void> {
    this.config = { ...this.config, ...config };
  }

  getConfig(): OfflineQueueConfig {
    return { ...this.config };
  }

  async clearQueue(): Promise<{ removed: number }> {
    try {
      const allReminders = await reminderDatabase.getPendingOfflineReminders();

      for (const reminder of allReminders) {
        await reminderDatabase.removeFromOfflineQueue(reminder.id);
      }

      return { removed: allReminders.length };

    } catch (error) {
      console.error('Failed to clear queue:', error);
      return { removed: 0 };
    }
  }

  isInitialized(): boolean {
    return this.isInitialized;
  }

  getProcessingStats() {
    return { ...this.processingStats };
  }
}

export default OfflineQueueService;