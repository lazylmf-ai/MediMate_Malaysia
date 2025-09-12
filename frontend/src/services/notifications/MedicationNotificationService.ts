/**
 * Medication Notification Service
 * 
 * Service for managing medication reminder notifications with:
 * - Integration with existing push notification infrastructure
 * - Cultural-aware notification scheduling
 * - Quiet hours and prayer time avoidance
 * - Multilingual notification content
 * - Elderly-friendly notification patterns
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Medication, AdherenceRecord } from '../../types/medication';

// Notification configuration
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

interface NotificationSettings {
  enabled: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  quietHoursEnabled: boolean;
  quietHoursStart: string; // HH:MM format
  quietHoursEnd: string;   // HH:MM format
  culturalConsiderations: {
    avoidPrayerTimes: boolean;
    prayerTimeBuffer: number; // minutes
    ramadanAdjustments: boolean;
  };
  elderlyOptimizations: {
    loudVolume: boolean;
    persistentNotifications: boolean;
    simpleLanguage: boolean;
    largeText: boolean;
  };
}

interface ScheduledNotification {
  id: string;
  medicationId: string;
  identifier: string; // Expo notification identifier
  scheduledFor: Date;
  medication: Medication;
  reminderType: 'medication' | 'adherence_check' | 'refill_reminder';
  culturalContext?: {
    language: 'ms' | 'en' | 'zh' | 'ta';
    avoidedPrayerTimes?: string[];
    adjustedForRamadan?: boolean;
  };
}

class MedicationNotificationService {
  private static instance: MedicationNotificationService;
  private notificationSettings: NotificationSettings;
  private scheduledNotifications: Map<string, ScheduledNotification> = new Map();
  private initialized = false;

  private constructor() {
    this.notificationSettings = this.getDefaultSettings();
  }

  static getInstance(): MedicationNotificationService {
    if (!MedicationNotificationService.instance) {
      MedicationNotificationService.instance = new MedicationNotificationService();
    }
    return MedicationNotificationService.instance;
  }

  // Initialize notification service
  async initialize(): Promise<{ success: boolean; error?: string }> {
    try {
      // Register for push notifications
      const { status } = await Notifications.requestPermissionsAsync();
      
      if (status !== 'granted') {
        return { success: false, error: 'Notification permissions not granted' };
      }

      // Set notification categories for actions
      await this.setupNotificationCategories();

      // Load saved settings
      await this.loadSettings();

      // Set up notification listeners
      this.setupNotificationListeners();

      this.initialized = true;
      return { success: true };
    } catch (error) {
      console.error('Failed to initialize notification service:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Initialization failed' 
      };
    }
  }

  // Set up notification categories with actions
  private async setupNotificationCategories(): Promise<void> {
    await Notifications.setNotificationCategoryAsync('MEDICATION_REMINDER', [
      {
        identifier: 'TAKE_MEDICATION',
        buttonTitle: 'Mark as Taken',
        options: { opensAppToForeground: true },
      },
      {
        identifier: 'SNOOZE_REMINDER',
        buttonTitle: 'Snooze 10 min',
        options: { opensAppToForeground: false },
      },
      {
        identifier: 'SKIP_DOSE',
        buttonTitle: 'Skip this dose',
        options: { opensAppToForeground: false },
      },
    ]);

    await Notifications.setNotificationCategoryAsync('ADHERENCE_CHECK', [
      {
        identifier: 'CONFIRM_ADHERENCE',
        buttonTitle: 'Yes, taken',
        options: { opensAppToForeground: false },
      },
      {
        identifier: 'REPORT_MISSED',
        buttonTitle: 'Missed dose',
        options: { opensAppToForeground: true },
      },
    ]);
  }

  // Set up notification listeners
  private setupNotificationListeners(): void {
    // Handle notification received while app is in foreground
    Notifications.addNotificationReceivedListener((notification) => {
      console.log('Notification received:', notification);
    });

    // Handle notification response (user interaction)
    Notifications.addNotificationResponseReceivedListener(async (response) => {
      await this.handleNotificationResponse(response);
    });
  }

  // Handle user interaction with notification
  private async handleNotificationResponse(
    response: Notifications.NotificationResponse
  ): Promise<void> {
    const { notification, actionIdentifier } = response;
    const { medicationId, reminderType } = notification.request.content.data as any;

    switch (actionIdentifier) {
      case 'TAKE_MEDICATION':
        await this.recordMedicationTaken(medicationId);
        break;
      
      case 'SNOOZE_REMINDER':
        await this.snoozeReminder(notification.request.identifier, 10);
        break;
      
      case 'SKIP_DOSE':
        await this.recordMedicationSkipped(medicationId);
        break;
      
      case 'CONFIRM_ADHERENCE':
        await this.recordMedicationTaken(medicationId);
        break;
      
      case 'REPORT_MISSED':
        // Open app to report missed dose details
        break;
      
      default:
        // Handle default tap (opens app)
        break;
    }
  }

  // Schedule medication reminders
  async scheduleMedicationReminders(
    medication: Medication,
    language: 'ms' | 'en' | 'zh' | 'ta' = 'en'
  ): Promise<{ success: boolean; error?: string; scheduledCount?: number }> {
    if (!this.initialized) {
      return { success: false, error: 'Service not initialized' };
    }

    try {
      // Clear existing reminders for this medication
      await this.clearMedicationReminders(medication.id);

      const scheduledNotifications: ScheduledNotification[] = [];
      const today = new Date();
      
      // Schedule reminders for the next 30 days
      for (let day = 0; day < 30; day++) {
        for (const time of medication.schedule.times) {
          const scheduledDate = new Date(today);
          scheduledDate.setDate(today.getDate() + day);
          
          const [hours, minutes] = time.split(':').map(Number);
          scheduledDate.setHours(hours, minutes, 0, 0);
          
          // Skip past times for today
          if (day === 0 && scheduledDate <= new Date()) {
            continue;
          }

          // Apply cultural adjustments
          const adjustedDate = await this.applyCulturalAdjustments(
            scheduledDate,
            medication,
            language
          );

          // Create notification content
          const content = this.createNotificationContent(medication, adjustedDate, language);
          
          // Schedule the notification
          const identifier = await Notifications.scheduleNotificationAsync({
            content,
            trigger: { date: adjustedDate },
          });

          const scheduledNotification: ScheduledNotification = {
            id: `${medication.id}_${adjustedDate.toISOString()}`,
            medicationId: medication.id,
            identifier,
            scheduledFor: adjustedDate,
            medication,
            reminderType: 'medication',
            culturalContext: {
              language,
              avoidedPrayerTimes: [],
              adjustedForRamadan: medication.schedule.culturalAdjustments.avoidDuringFasting,
            },
          };

          scheduledNotifications.push(scheduledNotification);
          this.scheduledNotifications.set(scheduledNotification.id, scheduledNotification);
        }
      }

      return { 
        success: true, 
        scheduledCount: scheduledNotifications.length 
      };
    } catch (error) {
      console.error('Failed to schedule medication reminders:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Scheduling failed' 
      };
    }
  }

  // Apply cultural adjustments to notification time
  private async applyCulturalAdjustments(
    scheduledDate: Date,
    medication: Medication,
    language: string
  ): Promise<Date> {
    let adjustedDate = new Date(scheduledDate);

    // Check quiet hours
    if (this.notificationSettings.quietHoursEnabled) {
      adjustedDate = this.adjustForQuietHours(adjustedDate);
    }

    // Apply prayer time buffer
    if (this.notificationSettings.culturalConsiderations.avoidPrayerTimes &&
        medication.schedule.culturalAdjustments.prayerTimeBuffer > 0) {
      adjustedDate = this.adjustForPrayerTimes(
        adjustedDate, 
        medication.schedule.culturalAdjustments.prayerTimeBuffer
      );
    }

    // Ramadan adjustments
    if (this.notificationSettings.culturalConsiderations.ramadanAdjustments &&
        medication.schedule.culturalAdjustments.avoidDuringFasting) {
      adjustedDate = await this.adjustForRamadan(adjustedDate);
    }

    return adjustedDate;
  }

  // Adjust notification time to avoid quiet hours
  private adjustForQuietHours(date: Date): Date {
    const timeString = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    
    if (this.isInQuietHours(timeString)) {
      // Move to end of quiet hours
      const endParts = this.notificationSettings.quietHoursEnd.split(':');
      const adjustedDate = new Date(date);
      adjustedDate.setHours(parseInt(endParts[0]), parseInt(endParts[1]), 0, 0);
      
      // If that's in the past, move to next day
      if (adjustedDate <= new Date()) {
        adjustedDate.setDate(adjustedDate.getDate() + 1);
      }
      
      return adjustedDate;
    }

    return date;
  }

  // Adjust notification time to avoid prayer times
  private adjustForPrayerTimes(date: Date, bufferMinutes: number): Date {
    // Simplified prayer times (in practice, would use accurate calculation)
    const prayerTimes = ['06:00', '13:15', '16:30', '19:20', '20:35'];
    const timeString = `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`;
    
    for (const prayerTime of prayerTimes) {
      const timeDiff = Math.abs(this.timeToMinutes(timeString) - this.timeToMinutes(prayerTime));
      
      if (timeDiff < bufferMinutes) {
        // Move notification after prayer time + buffer
        const adjustedDate = new Date(date);
        const prayerMinutes = this.timeToMinutes(prayerTime);
        adjustedDate.setHours(0, prayerMinutes + bufferMinutes, 0, 0);
        return adjustedDate;
      }
    }

    return date;
  }

  // Adjust for Ramadan fasting schedule
  private async adjustForRamadan(date: Date): Promise<Date> {
    // During Ramadan, avoid daytime hours (approximately 6 AM to 7 PM)
    const hour = date.getHours();
    
    if (hour >= 6 && hour <= 19) {
      // Move to post-iftar time (7:30 PM)
      const adjustedDate = new Date(date);
      adjustedDate.setHours(19, 30, 0, 0);
      return adjustedDate;
    }

    return date;
  }

  // Create notification content based on medication and language
  private createNotificationContent(
    medication: Medication,
    scheduledDate: Date,
    language: 'ms' | 'en' | 'zh' | 'ta'
  ): Notifications.NotificationContent {
    const dosageText = `${medication.dosage.amount}${medication.dosage.unit}`;
    
    let title: string;
    let body: string;
    
    switch (language) {
      case 'ms':
        title = 'Masa untuk ubat';
        body = `Ambil ${dosageText} ${medication.name} sekarang`;
        break;
      default:
        title = 'Medication reminder';
        body = `Time to take ${dosageText} of ${medication.name}`;
        break;
    }

    // Add cultural notes
    const culturalNotes: string[] = [];
    if (medication.cultural.takeWithFood) {
      culturalNotes.push(
        language === 'ms' ? 'Ambil bersama makanan' : 'Take with food'
      );
    }

    if (culturalNotes.length > 0) {
      body += `\n${culturalNotes.join(' • ')}`;
    }

    return {
      title,
      body,
      sound: this.notificationSettings.soundEnabled ? 'default' : false,
      badge: 1,
      categoryIdentifier: 'MEDICATION_REMINDER',
      data: {
        medicationId: medication.id,
        reminderType: 'medication',
        culturalNotes,
      },
    };
  }

  // Clear all reminders for a specific medication
  async clearMedicationReminders(medicationId: string): Promise<void> {
    const toRemove: string[] = [];
    
    for (const [key, notification] of this.scheduledNotifications.entries()) {
      if (notification.medicationId === medicationId) {
        await Notifications.cancelScheduledNotificationAsync(notification.identifier);
        toRemove.push(key);
      }
    }
    
    toRemove.forEach(key => this.scheduledNotifications.delete(key));
  }

  // Snooze a reminder
  async snoozeReminder(notificationId: string, minutes: number): Promise<void> {
    const newDate = new Date(Date.now() + minutes * 60 * 1000);
    
    // Find the original notification
    const originalNotification = Array.from(this.scheduledNotifications.values())
      .find(n => n.identifier === notificationId);
    
    if (!originalNotification) return;

    // Schedule a new notification
    const content = this.createNotificationContent(
      originalNotification.medication,
      newDate,
      originalNotification.culturalContext?.language || 'en'
    );

    const newIdentifier = await Notifications.scheduleNotificationAsync({
      content,
      trigger: { date: newDate },
    });

    // Update the stored notification
    const snoozedNotification: ScheduledNotification = {
      ...originalNotification,
      identifier: newIdentifier,
      scheduledFor: newDate,
    };

    this.scheduledNotifications.set(originalNotification.id, snoozedNotification);
  }

  // Record medication as taken
  private async recordMedicationTaken(medicationId: string): Promise<void> {
    const adherenceRecord: AdherenceRecord = {
      medicationId,
      scheduledTime: new Date().toISOString(),
      actualTime: new Date().toISOString(),
      status: 'taken',
      method: 'reminder_response',
    };

    // Store adherence record (would typically save to database)
    await AsyncStorage.setItem(
      `adherence_${medicationId}_${Date.now()}`,
      JSON.stringify(adherenceRecord)
    );

    // Clear badge count
    await Notifications.setBadgeCountAsync(0);
  }

  // Record medication as skipped
  private async recordMedicationSkipped(medicationId: string): Promise<void> {
    const adherenceRecord: AdherenceRecord = {
      medicationId,
      scheduledTime: new Date().toISOString(),
      status: 'skipped',
      method: 'reminder_response',
    };

    await AsyncStorage.setItem(
      `adherence_${medicationId}_${Date.now()}`,
      JSON.stringify(adherenceRecord)
    );
  }

  // Update notification settings
  async updateSettings(settings: Partial<NotificationSettings>): Promise<void> {
    this.notificationSettings = { ...this.notificationSettings, ...settings };
    await AsyncStorage.setItem('notification_settings', JSON.stringify(this.notificationSettings));
  }

  // Load settings from storage
  private async loadSettings(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('notification_settings');
      if (stored) {
        this.notificationSettings = { ...this.notificationSettings, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Failed to load notification settings:', error);
    }
  }

  // Get default notification settings
  private getDefaultSettings(): NotificationSettings {
    return {
      enabled: true,
      soundEnabled: true,
      vibrationEnabled: true,
      quietHoursEnabled: true,
      quietHoursStart: '22:00',
      quietHoursEnd: '07:00',
      culturalConsiderations: {
        avoidPrayerTimes: true,
        prayerTimeBuffer: 30,
        ramadanAdjustments: true,
      },
      elderlyOptimizations: {
        loudVolume: true,
        persistentNotifications: true,
        simpleLanguage: true,
        largeText: true,
      },
    };
  }

  // Helper functions
  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private isInQuietHours(time: string): boolean {
    const current = this.timeToMinutes(time);
    const start = this.timeToMinutes(this.notificationSettings.quietHoursStart);
    const end = this.timeToMinutes(this.notificationSettings.quietHoursEnd);
    
    if (start <= end) {
      return current >= start && current <= end;
    } else {
      return current >= start || current <= end;
    }
  }

  // Getters
  getSettings(): NotificationSettings {
    return { ...this.notificationSettings };
  }

  getScheduledNotifications(): ScheduledNotification[] {
    return Array.from(this.scheduledNotifications.values());
  }

  isInitialized(): boolean {
    return this.initialized;
  }
}

export default MedicationNotificationService;
export type { NotificationSettings, ScheduledNotification };