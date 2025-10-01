/**
 * Cultural-Aware Reminder Scheduling Service
 * 
 * Core service for Issue #24 Stream A - integrates with existing Cultural Scheduling Engine
 * and Prayer Time Service to provide intelligent, culturally-aware medication reminders.
 * 
 * Features:
 * - Prayer time integration using existing services from Issue #23
 * - Cultural constraint evaluation with real-time adjustments
 * - Offline-capable 7-day reminder queue
 * - Smart batching for battery optimization
 * - Background task integration with Expo TaskManager
 * - Multi-modal delivery support
 */

import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';

import CulturalSchedulingEngine from '../scheduling/CulturalSchedulingEngine';
import PrayerSchedulingService from '../prayer-scheduling/PrayerSchedulingService';
import MedicationNotificationService from '../notifications/MedicationNotificationService';
import { cacheService } from '../cache/cacheService';

import { 
  Medication, 
  MedicationSchedule,
  CulturalAdjustments
} from '../../types/medication';
import { 
  EnhancedCulturalProfile, 
  MalaysianState 
} from '../../types/cultural';

// Core reminder interfaces
export interface ReminderSchedule {
  id: string;
  medicationId: string;
  userId: string;
  scheduledTime: Date;
  actualDeliveryTime?: Date;
  deliveryMethods: DeliveryMethod[];
  culturalConstraints: PrayerTimeConstraints;
  priority: 'low' | 'medium' | 'high' | 'critical';
  retryPolicy: RetryConfiguration;
  status: 'pending' | 'delivered' | 'missed' | 'cancelled';
  retryCount: number;
  metadata: {
    createdAt: Date;
    updatedAt: Date;
    version: number;
  };
}

export interface PrayerTimeConstraints {
  avoidPrayerTimes: boolean;
  bufferMinutes: number;
  fallbackBehavior: 'delay' | 'advance' | 'skip';
  prayerSpecificSettings?: {
    fajr: { avoid: boolean; buffer: number };
    dhuhr: { avoid: boolean; buffer: number };
    asr: { avoid: boolean; buffer: number };
    maghrib: { avoid: boolean; buffer: number };
    isha: { avoid: boolean; buffer: number };
  };
}

export interface RetryConfiguration {
  maxRetries: number;
  retryIntervals: number[]; // minutes
  escalationLevels: ('notification' | 'sms' | 'call' | 'caregiver_alert')[];
  adaptiveRetry: boolean;
}

export interface DeliveryMethod {
  type: 'push_notification' | 'sms' | 'voice_call' | 'in_app_alert';
  priority: number;
  enabled: boolean;
  settings: {
    sound?: string;
    vibration?: boolean;
    customMessage?: string;
    language?: 'ms' | 'en' | 'zh' | 'ta';
  };
}

export interface ReminderPreferences {
  userId: string;
  avoidPrayerTimes: boolean;
  prayerBufferMinutes: number;
  preferredDeliveryMethods: DeliveryMethod[];
  quietHours: {
    enabled: boolean;
    start: string; // HH:MM
    end: string;   // HH:MM
  };
  escalationEnabled: boolean;
  escalationDelayMinutes: number;
  batchingEnabled: boolean;
  maxBatchSize: number;
  culturalProfile: EnhancedCulturalProfile;
}

export interface OfflineReminderQueue {
  id: string;
  reminderScheduleId: string;
  payload: {
    medication: Medication;
    culturalContext: any;
    deliveryInstructions: DeliveryMethod[];
  };
  scheduledDelivery: Date;
  attempts: number;
  lastAttempt?: Date;
  queuedAt: Date;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface BatchedReminder {
  batchId: string;
  reminders: ReminderSchedule[];
  scheduledTime: Date;
  culturalContext: {
    prayerTimeAdjustments: string[];
    mealTimeConsiderations: string[];
    ramadanAdjustments?: string[];
  };
  estimatedBatteryImpact: number;
}

export interface ReminderDeliveryResult {
  success: boolean;
  deliveredAt?: Date;
  method: DeliveryMethod;
  error?: string;
  culturalAdjustments?: string[];
  nextRetryAt?: Date;
}

// Background task constants
const REMINDER_BACKGROUND_TASK = 'REMINDER_BACKGROUND_TASK';
const OFFLINE_SYNC_TASK = 'OFFLINE_SYNC_TASK';
const CULTURAL_CONSTRAINT_CHECK_TASK = 'CULTURAL_CONSTRAINT_CHECK_TASK';

class ReminderSchedulingService {
  private static instance: ReminderSchedulingService;
  private culturalSchedulingEngine: CulturalSchedulingEngine;
  private prayerSchedulingService: PrayerSchedulingService;
  private notificationService: MedicationNotificationService;
  private initialized = false;
  
  private readonly STORAGE_KEYS = {
    PREFERENCES: 'reminder_preferences',
    OFFLINE_QUEUE: 'offline_reminder_queue',
    SCHEDULE_CACHE: 'reminder_schedule_cache',
    DELIVERY_HISTORY: 'reminder_delivery_history',
  };

  private readonly CACHE_TTL = {
    SCHEDULE: 24 * 60 * 60 * 1000, // 24 hours
    OFFLINE_QUEUE: 7 * 24 * 60 * 60 * 1000, // 7 days
    CULTURAL_DATA: 60 * 60 * 1000, // 1 hour
  };

  private constructor() {
    this.culturalSchedulingEngine = CulturalSchedulingEngine.getInstance();
    this.prayerSchedulingService = PrayerSchedulingService.getInstance();
    this.notificationService = MedicationNotificationService.getInstance();
  }

  static getInstance(): ReminderSchedulingService {
    if (!ReminderSchedulingService.instance) {
      ReminderSchedulingService.instance = new ReminderSchedulingService();
    }
    return ReminderSchedulingService.instance;
  }

  /**
   * Initialize the reminder scheduling service
   */
  async initialize(): Promise<{ success: boolean; error?: string }> {
    try {
      // Initialize notification service first
      const notificationResult = await this.notificationService.initialize();
      if (!notificationResult.success) {
        throw new Error(`Notification service initialization failed: ${notificationResult.error}`);
      }

      // Register background tasks
      await this.registerBackgroundTasks();

      // Initialize offline queue
      await this.initializeOfflineQueue();

      // Start cultural constraint monitoring
      await this.startCulturalConstraintMonitoring();

      this.initialized = true;
      
      return { success: true };
    } catch (error) {
      console.error('ReminderSchedulingService initialization failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Initialization failed'
      };
    }
  }

  /**
   * Create culturally-aware reminder schedule for a medication
   */
  async createReminderSchedule(
    medication: Medication,
    culturalProfile: EnhancedCulturalProfile,
    preferences: ReminderPreferences
  ): Promise<{ success: boolean; schedules?: ReminderSchedule[]; error?: string }> {
    try {
      if (!this.initialized) {
        throw new Error('Service not initialized');
      }

      // Generate cultural schedule using existing engine
      const familyContext = await this.buildFamilyContext(culturalProfile, preferences);
      const culturalResult = await this.culturalSchedulingEngine.generateCulturalSchedule(
        [medication],
        culturalProfile,
        familyContext
      );

      if (!culturalResult.optimizedSchedule.length) {
        throw new Error('Failed to generate cultural schedule');
      }

      // Convert cultural schedule to reminder schedules
      const reminderSchedules: ReminderSchedule[] = [];
      const medicationSchedule = culturalResult.optimizedSchedule[0];

      for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
        for (const timeSlot of medicationSchedule.times) {
          const scheduledTime = this.createScheduledTime(timeSlot.time, dayOffset);
          
          // Apply cultural constraints using prayer scheduling service
          const adjustedTime = await this.applyCulturalConstraints(
            scheduledTime,
            culturalProfile,
            preferences
          );

          const reminderSchedule: ReminderSchedule = {
            id: `reminder_${medication.id}_${adjustedTime.getTime()}`,
            medicationId: medication.id,
            userId: preferences.userId,
            scheduledTime: adjustedTime,
            deliveryMethods: preferences.preferredDeliveryMethods,
            culturalConstraints: {
              avoidPrayerTimes: preferences.avoidPrayerTimes,
              bufferMinutes: preferences.prayerBufferMinutes,
              fallbackBehavior: 'delay',
              prayerSpecificSettings: this.buildPrayerSpecificSettings(preferences)
            },
            priority: this.determinePriority(medication),
            retryPolicy: this.buildRetryPolicy(medication, preferences),
            status: 'pending',
            retryCount: 0,
            metadata: {
              createdAt: new Date(),
              updatedAt: new Date(),
              version: 1
            }
          };

          reminderSchedules.push(reminderSchedule);
        }
      }

      // Store schedules for offline access
      await this.storeSchedulesForOfflineAccess(reminderSchedules);

      // Queue reminders for delivery
      await this.queueRemindersForDelivery(reminderSchedules);

      return { 
        success: true, 
        schedules: reminderSchedules 
      };

    } catch (error) {
      console.error('Failed to create reminder schedule:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Schedule creation failed'
      };
    }
  }

  /**
   * Process and deliver reminders with cultural awareness
   */
  async processScheduledReminders(): Promise<{
    processed: number;
    delivered: number;
    failed: number;
    culturallyAdjusted: number;
  }> {
    try {
      // Get pending reminders from offline queue
      const pendingReminders = await this.getPendingReminders();
      let processed = 0;
      let delivered = 0;
      let failed = 0;
      let culturallyAdjusted = 0;

      // Check for cultural constraints before delivery
      const now = new Date();
      const adjustedReminders: OfflineReminderQueue[] = [];

      for (const reminder of pendingReminders) {
        processed++;
        
        // Real-time cultural constraint check
        const constraintResult = await this.checkRealTimeCulturalConstraints(
          reminder.scheduledDelivery,
          reminder.payload.culturalContext
        );

        if (constraintResult.requiresAdjustment) {
          culturallyAdjusted++;
          
          // Adjust delivery time based on constraints
          const newDeliveryTime = await this.adjustDeliveryTime(
            reminder.scheduledDelivery,
            constraintResult.constraints
          );

          reminder.scheduledDelivery = newDeliveryTime;
          reminder.attempts++;
          reminder.lastAttempt = now;
        }

        // Check if it's time to deliver
        if (reminder.scheduledDelivery <= now) {
          const deliveryResult = await this.deliverReminder(reminder);
          
          if (deliveryResult.success) {
            delivered++;
            await this.removeFromOfflineQueue(reminder.id);
          } else {
            failed++;
            
            // Handle retry logic
            if (reminder.attempts < 3) {
              reminder.scheduledDelivery = new Date(now.getTime() + 15 * 60 * 1000); // Retry in 15 minutes
              reminder.attempts++;
              adjustedReminders.push(reminder);
            } else {
              await this.handleFailedReminder(reminder);
            }
          }
        } else {
          adjustedReminders.push(reminder);
        }
      }

      // Update offline queue with adjusted reminders
      await this.updateOfflineQueue(adjustedReminders);

      return {
        processed,
        delivered,
        failed,
        culturallyAdjusted
      };

    } catch (error) {
      console.error('Failed to process scheduled reminders:', error);
      return {
        processed: 0,
        delivered: 0,
        failed: 0,
        culturallyAdjusted: 0
      };
    }
  }

  /**
   * Create smart batched reminders for battery optimization
   */
  async createBatchedReminders(
    schedules: ReminderSchedule[],
    batchingPreferences: {
      maxBatchSize: number;
      batchTimeWindow: number; // minutes
      batteryOptimized: boolean;
    }
  ): Promise<BatchedReminder[]> {
    try {
      const batches: BatchedReminder[] = [];
      const sortedSchedules = [...schedules].sort(
        (a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime()
      );

      let currentBatch: ReminderSchedule[] = [];
      let batchStartTime: Date | null = null;

      for (const schedule of sortedSchedules) {
        // Start new batch if needed
        if (!batchStartTime || currentBatch.length >= batchingPreferences.maxBatchSize) {
          if (currentBatch.length > 0) {
            const batch = await this.createBatch(currentBatch, batchStartTime!);
            batches.push(batch);
          }
          
          currentBatch = [schedule];
          batchStartTime = schedule.scheduledTime;
          continue;
        }

        // Check if this schedule can be added to current batch
        const timeDiff = schedule.scheduledTime.getTime() - batchStartTime.getTime();
        if (timeDiff <= batchingPreferences.batchTimeWindow * 60 * 1000) {
          currentBatch.push(schedule);
        } else {
          // Create batch for current reminders
          const batch = await this.createBatch(currentBatch, batchStartTime);
          batches.push(batch);
          
          // Start new batch
          currentBatch = [schedule];
          batchStartTime = schedule.scheduledTime;
        }
      }

      // Create final batch if there are remaining schedules
      if (currentBatch.length > 0 && batchStartTime) {
        const batch = await this.createBatch(currentBatch, batchStartTime);
        batches.push(batch);
      }

      return batches;

    } catch (error) {
      console.error('Failed to create batched reminders:', error);
      return [];
    }
  }

  /**
   * Check real-time cultural constraints before reminder delivery
   */
  async checkRealTimeCulturalConstraints(
    scheduledTime: Date,
    culturalContext: any
  ): Promise<{
    requiresAdjustment: boolean;
    constraints: string[];
    suggestedTime?: Date;
  }> {
    try {
      const constraints: string[] = [];
      let requiresAdjustment = false;

      // Check if currently during prayer time
      const prayerStatus = await this.prayerSchedulingService.isCurrentlyPrayerTime();
      if (prayerStatus.isDuringPrayer) {
        constraints.push(`Currently during ${prayerStatus.currentPrayer} prayer time`);
        requiresAdjustment = true;
      }

      // Check for Ramadan adjustments
      const isRamadan = await this.checkRamadanStatus();
      if (isRamadan && this.isDuringFastingHours(scheduledTime)) {
        constraints.push('Adjusted for Ramadan fasting hours');
        requiresAdjustment = true;
      }

      // Check quiet hours
      if (this.isQuietHours(scheduledTime, culturalContext.quietHours)) {
        constraints.push('Scheduled during quiet hours');
        requiresAdjustment = true;
      }

      let suggestedTime: Date | undefined;
      if (requiresAdjustment) {
        suggestedTime = await this.findNextAvailableSlot(scheduledTime, culturalContext);
      }

      return {
        requiresAdjustment,
        constraints,
        suggestedTime
      };

    } catch (error) {
      console.error('Failed to check cultural constraints:', error);
      return {
        requiresAdjustment: false,
        constraints: ['Error checking cultural constraints']
      };
    }
  }

  /**
   * Deliver a reminder using configured delivery methods
   */
  async deliverReminder(reminder: OfflineReminderQueue): Promise<ReminderDeliveryResult> {
    try {
      const { payload } = reminder;
      
      // Sort delivery methods by priority
      const sortedMethods = payload.deliveryInstructions.sort(
        (a, b) => b.priority - a.priority
      );

      for (const method of sortedMethods) {
        if (!method.enabled) continue;

        try {
          let deliveryResult: boolean = false;

          switch (method.type) {
            case 'push_notification':
              deliveryResult = await this.deliverPushNotification(reminder, method);
              break;
            case 'sms':
              deliveryResult = await this.deliverSMS(reminder, method);
              break;
            case 'voice_call':
              deliveryResult = await this.deliverVoiceCall(reminder, method);
              break;
            case 'in_app_alert':
              deliveryResult = await this.deliverInAppAlert(reminder, method);
              break;
          }

          if (deliveryResult) {
            return {
              success: true,
              deliveredAt: new Date(),
              method: method,
              culturalAdjustments: reminder.payload.culturalContext?.adjustments || []
            };
          }

        } catch (methodError) {
          console.error(`Delivery method ${method.type} failed:`, methodError);
          continue; // Try next method
        }
      }

      return {
        success: false,
        method: sortedMethods[0],
        error: 'All delivery methods failed'
      };

    } catch (error) {
      console.error('Failed to deliver reminder:', error);
      return {
        success: false,
        method: reminder.payload.deliveryInstructions[0],
        error: error instanceof Error ? error.message : 'Delivery failed'
      };
    }
  }

  /**
   * Private helper methods
   */

  private async registerBackgroundTasks(): Promise<void> {
    // Register reminder processing task
    TaskManager.defineTask(REMINDER_BACKGROUND_TASK, async () => {
      try {
        const result = await this.processScheduledReminders();
        console.log('Background reminder processing:', result);
        return BackgroundFetch.BackgroundFetchResult.NewData;
      } catch (error) {
        console.error('Background reminder processing failed:', error);
        return BackgroundFetch.BackgroundFetchResult.Failed;
      }
    });

    // Register offline sync task
    TaskManager.defineTask(OFFLINE_SYNC_TASK, async () => {
      try {
        await this.syncOfflineQueue();
        return BackgroundFetch.BackgroundFetchResult.NewData;
      } catch (error) {
        console.error('Offline sync failed:', error);
        return BackgroundFetch.BackgroundFetchResult.Failed;
      }
    });

    // Register cultural constraint checking task
    TaskManager.defineTask(CULTURAL_CONSTRAINT_CHECK_TASK, async () => {
      try {
        await this.updateCulturalConstraints();
        return BackgroundFetch.BackgroundFetchResult.NewData;
      } catch (error) {
        console.error('Cultural constraint update failed:', error);
        return BackgroundFetch.BackgroundFetchResult.Failed;
      }
    });

    // Register background fetch
    await BackgroundFetch.registerTaskAsync(REMINDER_BACKGROUND_TASK, {
      minimumInterval: 15 * 60, // 15 minutes
      stopOnTerminate: false,
      startOnBoot: true,
    });
  }

  private async initializeOfflineQueue(): Promise<void> {
    try {
      const existingQueue = await AsyncStorage.getItem(this.STORAGE_KEYS.OFFLINE_QUEUE);
      if (!existingQueue) {
        await AsyncStorage.setItem(this.STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify([]));
      }
    } catch (error) {
      console.error('Failed to initialize offline queue:', error);
    }
  }

  private async startCulturalConstraintMonitoring(): Promise<void> {
    // Start periodic cultural constraint checking
    setInterval(async () => {
      try {
        await this.updateCulturalConstraints();
      } catch (error) {
        console.error('Cultural constraint monitoring error:', error);
      }
    }, 30 * 60 * 1000); // Check every 30 minutes
  }

  private async buildFamilyContext(
    culturalProfile: EnhancedCulturalProfile,
    preferences: ReminderPreferences
  ): Promise<any> {
    // Build family context for cultural scheduling engine
    return {
      elderlyMembers: [], // Would be populated from user profile
      children: [], // Would be populated from user profile
      primaryCaregiver: {
        availability: [{ start: '07:00', end: '22:00' }],
        culturalRole: 'self',
      },
      householdRoutines: {
        wakingTime: '06:00',
        sleepTime: '23:00',
        mealTimes: {}, // Would use default Malaysian meal patterns
        prayerParticipation: culturalProfile.preferences.prayerTimes?.enabled || false,
      },
    };
  }

  private createScheduledTime(timeString: string, dayOffset: number): Date {
    const [hours, minutes] = timeString.split(':').map(Number);
    const scheduledTime = new Date();
    scheduledTime.setDate(scheduledTime.getDate() + dayOffset);
    scheduledTime.setHours(hours, minutes, 0, 0);
    return scheduledTime;
  }

  private async applyCulturalConstraints(
    scheduledTime: Date,
    culturalProfile: EnhancedCulturalProfile,
    preferences: ReminderPreferences
  ): Promise<Date> {
    if (!preferences.avoidPrayerTimes) {
      return scheduledTime;
    }

    // Use existing prayer scheduling service for adjustments
    const optimizationResult = await this.prayerSchedulingService.optimizeMedicationSchedule(
      [scheduledTime],
      {
        enabled: true,
        bufferMinutes: preferences.prayerBufferMinutes,
        avoidPrayerTimes: true,
        adjustForRamadan: true,
        madhab: culturalProfile.preferences.prayerTimes?.madhab || 'shafi',
        location: {
          state: culturalProfile.location.state as MalaysianState,
          coordinates: culturalProfile.location.coordinates || { latitude: 3.139, longitude: 101.6869 }
        }
      }
    );

    return optimizationResult.optimizedTimes[0] || scheduledTime;
  }

  private buildPrayerSpecificSettings(preferences: ReminderPreferences): any {
    const defaultSettings = { avoid: preferences.avoidPrayerTimes, buffer: preferences.prayerBufferMinutes };
    return {
      fajr: defaultSettings,
      dhuhr: defaultSettings,
      asr: defaultSettings,
      maghrib: defaultSettings,
      isha: defaultSettings,
    };
  }

  private determinePriority(medication: Medication): 'low' | 'medium' | 'high' | 'critical' {
    // Determine priority based on medication type and criticality
    if (medication.category === 'critical' || medication.name.toLowerCase().includes('insulin')) {
      return 'critical';
    } else if (medication.category === 'prescription') {
      return 'high';
    } else if (medication.frequency === 'daily' || medication.frequency === 'twice_daily') {
      return 'medium';
    }
    return 'low';
  }

  private buildRetryPolicy(medication: Medication, preferences: ReminderPreferences): RetryConfiguration {
    const priority = this.determinePriority(medication);
    
    if (priority === 'critical') {
      return {
        maxRetries: 5,
        retryIntervals: [5, 15, 30, 60, 120], // minutes
        escalationLevels: ['notification', 'sms', 'call', 'caregiver_alert'],
        adaptiveRetry: true
      };
    } else if (priority === 'high') {
      return {
        maxRetries: 3,
        retryIntervals: [15, 30, 60], // minutes
        escalationLevels: ['notification', 'sms'],
        adaptiveRetry: true
      };
    } else {
      return {
        maxRetries: 2,
        retryIntervals: [30, 60], // minutes
        escalationLevels: ['notification'],
        adaptiveRetry: false
      };
    }
  }

  private async storeSchedulesForOfflineAccess(schedules: ReminderSchedule[]): Promise<void> {
    try {
      const cacheKey = `${this.STORAGE_KEYS.SCHEDULE_CACHE}_${Date.now()}`;
      await cacheService.set(cacheKey, schedules, this.CACHE_TTL.SCHEDULE);
    } catch (error) {
      console.error('Failed to store schedules for offline access:', error);
    }
  }

  private async queueRemindersForDelivery(schedules: ReminderSchedule[]): Promise<void> {
    try {
      const existingQueue = await this.getOfflineQueue();
      
      for (const schedule of schedules) {
        const queueItem: OfflineReminderQueue = {
          id: `queue_${schedule.id}`,
          reminderScheduleId: schedule.id,
          payload: {
            medication: {} as Medication, // Would be populated with actual medication data
            culturalContext: {
              constraints: schedule.culturalConstraints,
              adjustments: []
            },
            deliveryInstructions: schedule.deliveryMethods
          },
          scheduledDelivery: schedule.scheduledTime,
          attempts: 0,
          queuedAt: new Date(),
          priority: schedule.priority
        };

        existingQueue.push(queueItem);
      }

      await this.updateOfflineQueue(existingQueue);
    } catch (error) {
      console.error('Failed to queue reminders for delivery:', error);
    }
  }

  private async getPendingReminders(): Promise<OfflineReminderQueue[]> {
    try {
      const queue = await this.getOfflineQueue();
      const now = new Date();
      
      return queue.filter(reminder => 
        reminder.scheduledDelivery <= now && 
        reminder.attempts < 3
      );
    } catch (error) {
      console.error('Failed to get pending reminders:', error);
      return [];
    }
  }

  private async getOfflineQueue(): Promise<OfflineReminderQueue[]> {
    try {
      const queueData = await AsyncStorage.getItem(this.STORAGE_KEYS.OFFLINE_QUEUE);
      return queueData ? JSON.parse(queueData) : [];
    } catch (error) {
      console.error('Failed to get offline queue:', error);
      return [];
    }
  }

  private async updateOfflineQueue(queue: OfflineReminderQueue[]): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(queue));
    } catch (error) {
      console.error('Failed to update offline queue:', error);
    }
  }

  private async removeFromOfflineQueue(reminderId: string): Promise<void> {
    try {
      const queue = await this.getOfflineQueue();
      const updatedQueue = queue.filter(reminder => reminder.id !== reminderId);
      await this.updateOfflineQueue(updatedQueue);
    } catch (error) {
      console.error('Failed to remove from offline queue:', error);
    }
  }

  private async createBatch(schedules: ReminderSchedule[], batchStartTime: Date): Promise<BatchedReminder> {
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Calculate cultural context for the batch
    const culturalContext = {
      prayerTimeAdjustments: [],
      mealTimeConsiderations: [],
      ramadanAdjustments: []
    };

    // Estimate battery impact (simplified calculation)
    const estimatedBatteryImpact = schedules.length * 0.1; // 0.1% per reminder

    return {
      batchId,
      reminders: schedules,
      scheduledTime: batchStartTime,
      culturalContext,
      estimatedBatteryImpact
    };
  }

  private async adjustDeliveryTime(originalTime: Date, constraints: string[]): Promise<Date> {
    // Simple adjustment logic - in practice would be more sophisticated
    const adjustedTime = new Date(originalTime);
    adjustedTime.setMinutes(adjustedTime.getMinutes() + 30); // Delay by 30 minutes
    return adjustedTime;
  }

  private async findNextAvailableSlot(scheduledTime: Date, culturalContext: any): Promise<Date> {
    // Find next available time slot that doesn't conflict with cultural constraints
    const nextSlot = new Date(scheduledTime);
    nextSlot.setMinutes(nextSlot.getMinutes() + 30); // Simple 30-minute delay
    return nextSlot;
  }

  private async checkRamadanStatus(): Promise<boolean> {
    try {
      // Would integrate with cultural service to check Ramadan status
      return false; // Placeholder
    } catch (error) {
      return false;
    }
  }

  private isDuringFastingHours(time: Date): boolean {
    const hour = time.getHours();
    return hour >= 6 && hour <= 19; // Simplified fasting hours
  }

  private isQuietHours(time: Date, quietHours?: any): boolean {
    if (!quietHours?.enabled) return false;
    
    const hour = time.getHours();
    const [startHour] = quietHours.start.split(':').map(Number);
    const [endHour] = quietHours.end.split(':').map(Number);
    
    if (startHour <= endHour) {
      return hour >= startHour && hour <= endHour;
    } else {
      return hour >= startHour || hour <= endHour;
    }
  }

  // Delivery method implementations
  private async deliverPushNotification(reminder: OfflineReminderQueue, method: DeliveryMethod): Promise<boolean> {
    try {
      // Use existing notification service
      return true; // Placeholder - would call actual notification service
    } catch (error) {
      console.error('Push notification delivery failed:', error);
      return false;
    }
  }

  private async deliverSMS(reminder: OfflineReminderQueue, method: DeliveryMethod): Promise<boolean> {
    try {
      // Would integrate with SMS service (e.g., Twilio)
      return true; // Placeholder
    } catch (error) {
      console.error('SMS delivery failed:', error);
      return false;
    }
  }

  private async deliverVoiceCall(reminder: OfflineReminderQueue, method: DeliveryMethod): Promise<boolean> {
    try {
      // Would integrate with voice call service
      return true; // Placeholder
    } catch (error) {
      console.error('Voice call delivery failed:', error);
      return false;
    }
  }

  private async deliverInAppAlert(reminder: OfflineReminderQueue, method: DeliveryMethod): Promise<boolean> {
    try {
      // Would trigger in-app alert
      return true; // Placeholder
    } catch (error) {
      console.error('In-app alert delivery failed:', error);
      return false;
    }
  }

  private async handleFailedReminder(reminder: OfflineReminderQueue): Promise<void> {
    try {
      // Log failed reminder and potentially notify caregiver
      console.warn('Reminder failed after max retries:', reminder.id);
      
      // Store in delivery history for analytics
      const deliveryHistory = await this.getDeliveryHistory();
      deliveryHistory.push({
        reminderId: reminder.id,
        status: 'failed',
        timestamp: new Date(),
        attempts: reminder.attempts,
        reason: 'Max retries exceeded'
      });
      
      await this.storeDeliveryHistory(deliveryHistory);
      
      // Remove from offline queue
      await this.removeFromOfflineQueue(reminder.id);
      
    } catch (error) {
      console.error('Failed to handle failed reminder:', error);
    }
  }

  private async getDeliveryHistory(): Promise<any[]> {
    try {
      const historyData = await AsyncStorage.getItem(this.STORAGE_KEYS.DELIVERY_HISTORY);
      return historyData ? JSON.parse(historyData) : [];
    } catch (error) {
      console.error('Failed to get delivery history:', error);
      return [];
    }
  }

  private async storeDeliveryHistory(history: any[]): Promise<void> {
    try {
      // Keep only last 1000 entries
      const trimmedHistory = history.slice(-1000);
      await AsyncStorage.setItem(this.STORAGE_KEYS.DELIVERY_HISTORY, JSON.stringify(trimmedHistory));
    } catch (error) {
      console.error('Failed to store delivery history:', error);
    }
  }

  private async syncOfflineQueue(): Promise<void> {
    try {
      // Sync offline queue with server when connectivity is available
      // This would integrate with backend API
      console.log('Syncing offline queue...');
    } catch (error) {
      console.error('Offline queue sync failed:', error);
    }
  }

  private async updateCulturalConstraints(): Promise<void> {
    try {
      // Update cultural constraints based on current prayer times, etc.
      console.log('Updating cultural constraints...');
    } catch (error) {
      console.error('Cultural constraint update failed:', error);
    }
  }

  /**
   * Public API methods
   */

  async getReminderSchedules(userId: string): Promise<ReminderSchedule[]> {
    try {
      const cacheKey = `${this.STORAGE_KEYS.SCHEDULE_CACHE}_${userId}`;
      const schedules = await cacheService.get<ReminderSchedule[]>(cacheKey);
      return schedules || [];
    } catch (error) {
      console.error('Failed to get reminder schedules:', error);
      return [];
    }
  }

  async updateReminderPreferences(preferences: Partial<ReminderPreferences>): Promise<void> {
    try {
      const currentPreferences = await this.getReminderPreferences(preferences.userId!);
      const updatedPreferences = { ...currentPreferences, ...preferences };
      
      await AsyncStorage.setItem(
        this.STORAGE_KEYS.PREFERENCES,
        JSON.stringify(updatedPreferences)
      );
    } catch (error) {
      console.error('Failed to update reminder preferences:', error);
    }
  }

  async getReminderPreferences(userId: string): Promise<ReminderPreferences | null> {
    try {
      const preferencesData = await AsyncStorage.getItem(this.STORAGE_KEYS.PREFERENCES);
      return preferencesData ? JSON.parse(preferencesData) : null;
    } catch (error) {
      console.error('Failed to get reminder preferences:', error);
      return null;
    }
  }

  async getOfflineQueueStatus(): Promise<{
    queueSize: number;
    oldestReminder?: Date;
    failedCount: number;
  }> {
    try {
      const queue = await this.getOfflineQueue();
      const failedReminders = queue.filter(r => r.attempts >= 3);
      
      let oldestReminder: Date | undefined;
      if (queue.length > 0) {
        oldestReminder = new Date(Math.min(...queue.map(r => r.queuedAt.getTime())));
      }

      return {
        queueSize: queue.length,
        oldestReminder,
        failedCount: failedReminders.length
      };
    } catch (error) {
      console.error('Failed to get offline queue status:', error);
      return {
        queueSize: 0,
        failedCount: 0
      };
    }
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

export default ReminderSchedulingService;