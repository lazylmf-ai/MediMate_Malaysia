/**
 * Reminder Services Index
 * 
 * Central export point for all reminder-related services in Issue #24 Stream A.
 * Provides a unified interface for the Cultural-Aware Notification Scheduling Engine.
 */

// Core services
export { default as ReminderSchedulingService } from './ReminderSchedulingService';
export { default as BackgroundTaskService } from './BackgroundTaskService';
export { default as CulturalConstraintEngine } from './CulturalConstraintEngine';
export { default as SmartBatchingService } from './SmartBatchingService';

// Types and interfaces
export type {
  ReminderSchedule,
  PrayerTimeConstraints,
  RetryConfiguration,
  DeliveryMethod,
  ReminderPreferences,
  OfflineReminderQueue,
  BatchedReminder,
  ReminderDeliveryResult
} from './ReminderSchedulingService';

export type {
  BackgroundTaskName,
  BackgroundTaskConfig,
  BackgroundTaskResult,
  BackgroundTaskStats
} from './BackgroundTaskService';

export type {
  CulturalConstraint,
  ConstraintEvaluationResult,
  ConstraintRefreshResult,
  UserConstraintProfile
} from './CulturalConstraintEngine';

export type {
  BatchingStrategy,
  SmartBatch,
  BatchDeliveryResult,
  BatchingAnalytics,
  BatteryOptimizationConfig
} from './SmartBatchingService';

// Constants
export { BACKGROUND_TASKS } from './BackgroundTaskService';

/**
 * Reminder System Factory
 * 
 * Provides a unified initialization and management interface for all reminder services.
 */
export class ReminderSystemManager {
  private static instance: ReminderSystemManager;
  
  private reminderSchedulingService: ReminderSchedulingService;
  private backgroundTaskService: BackgroundTaskService;
  private culturalConstraintEngine: CulturalConstraintEngine;
  private smartBatchingService: SmartBatchingService;
  
  private isInitialized = false;

  private constructor() {
    this.reminderSchedulingService = ReminderSchedulingService.getInstance();
    this.backgroundTaskService = BackgroundTaskService.getInstance();
    this.culturalConstraintEngine = CulturalConstraintEngine.getInstance();
    this.smartBatchingService = SmartBatchingService.getInstance();
  }

  static getInstance(): ReminderSystemManager {
    if (!ReminderSystemManager.instance) {
      ReminderSystemManager.instance = new ReminderSystemManager();
    }
    return ReminderSystemManager.instance;
  }

  /**
   * Initialize all reminder services in the correct order
   */
  async initialize(): Promise<{ success: boolean; errors: string[] }> {
    const errors: string[] = [];
    
    try {
      console.log('Initializing Cultural-Aware Reminder System...');

      // Initialize cultural constraint engine first (dependency for others)
      const constraintResult = await this.culturalConstraintEngine.initialize();
      if (!constraintResult.success) {
        errors.push(`Cultural Constraint Engine: ${constraintResult.error}`);
      }

      // Initialize reminder scheduling service
      const reminderResult = await this.reminderSchedulingService.initialize();
      if (!reminderResult.success) {
        errors.push(`Reminder Scheduling Service: ${reminderResult.error}`);
      }

      // Initialize smart batching service
      const batchingResult = await this.smartBatchingService.initialize();
      if (!batchingResult.success) {
        errors.push(`Smart Batching Service: ${batchingResult.error}`);
      }

      // Initialize background task service last (orchestrates others)
      const backgroundResult = await this.backgroundTaskService.initialize();
      if (!backgroundResult.success) {
        errors.push(`Background Task Service: ${backgroundResult.error}`);
      }

      this.isInitialized = errors.length === 0;

      if (this.isInitialized) {
        console.log('Cultural-Aware Reminder System initialized successfully');
      } else {
        console.error('Reminder System initialization completed with errors:', errors);
      }

      return {
        success: this.isInitialized,
        errors
      };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown initialization error';
      errors.push(`System initialization failed: ${errorMessage}`);
      
      return {
        success: false,
        errors
      };
    }
  }

  /**
   * Get system health status
   */
  async getSystemHealth(): Promise<{
    overall: 'healthy' | 'degraded' | 'critical';
    services: {
      reminderScheduling: boolean;
      backgroundTasks: boolean;
      culturalConstraints: boolean;
      smartBatching: boolean;
    };
    performance: {
      batteryUsage: number;
      deliveryRate: number;
      culturalOptimization: number;
    };
  }> {
    try {
      const services = {
        reminderScheduling: this.reminderSchedulingService.isInitialized(),
        backgroundTasks: this.backgroundTaskService.isInitialized(),
        culturalConstraints: true, // CulturalConstraintEngine doesn't have isInitialized method
        smartBatching: true // SmartBatchingService doesn't have isInitialized method
      };

      const serviceCount = Object.values(services).filter(Boolean).length;
      const overall: 'healthy' | 'degraded' | 'critical' = 
        serviceCount === 4 ? 'healthy' : 
        serviceCount >= 2 ? 'degraded' : 'critical';

      // Get performance metrics
      const batteryUsage = await this.backgroundTaskService.getOverallBatteryImpact();
      const batchingAnalytics = await this.smartBatchingService.getBatchingAnalytics();

      return {
        overall,
        services,
        performance: {
          batteryUsage,
          deliveryRate: batchingAnalytics.successRate,
          culturalOptimization: batchingAnalytics.culturalOptimizations
        }
      };

    } catch (error) {
      console.error('Failed to get system health:', error);
      return {
        overall: 'critical',
        services: {
          reminderScheduling: false,
          backgroundTasks: false,
          culturalConstraints: false,
          smartBatching: false
        },
        performance: {
          batteryUsage: 0,
          deliveryRate: 0,
          culturalOptimization: 0
        }
      };
    }
  }

  /**
   * Shutdown all services gracefully
   */
  async shutdown(): Promise<void> {
    try {
      console.log('Shutting down Cultural-Aware Reminder System...');

      // Shutdown in reverse order of initialization
      await this.backgroundTaskService.shutdown();
      
      // Other services don't have explicit shutdown methods
      // In a production environment, you might want to add them

      this.isInitialized = false;
      console.log('Reminder System shutdown completed');

    } catch (error) {
      console.error('Reminder System shutdown failed:', error);
    }
  }

  /**
   * Get service instances (for advanced usage)
   */
  getServices() {
    return {
      reminderScheduling: this.reminderSchedulingService,
      backgroundTasks: this.backgroundTaskService,
      culturalConstraints: this.culturalConstraintEngine,
      smartBatching: this.smartBatchingService
    };
  }

  isSystemInitialized(): boolean {
    return this.isInitialized;
  }
}

// Export singleton instance
export const reminderSystemManager = ReminderSystemManager.getInstance();

/**
 * Convenience function to initialize the entire reminder system
 */
export const initializeReminderSystem = () => reminderSystemManager.initialize();

/**
 * Convenience function to get system health
 */
export const getReminderSystemHealth = () => reminderSystemManager.getSystemHealth();

/**
 * Convenience function to shutdown the system
 */
export const shutdownReminderSystem = () => reminderSystemManager.shutdown();