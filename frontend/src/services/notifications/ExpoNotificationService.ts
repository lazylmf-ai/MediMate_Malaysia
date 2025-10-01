/**
 * Enhanced Expo Notification Service
 * Provides mobile-optimized push notifications with Malaysian cultural context
 * and accessibility features for elderly users
 */

import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import * as BackgroundFetch from 'expo-background-fetch';
import * as TaskManager from 'expo-task-manager';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { hapticFeedback } from '../../utils/accessibility/HapticFeedback';
import { voiceGuidance } from '../../utils/accessibility/VoiceGuidance';
import { accessibilityManager } from '../../utils/accessibility/AccessibilityConfig';

const NOTIFICATION_STORAGE_KEY = 'medimate_notifications';
const BACKGROUND_NOTIFICATION_TASK = 'medimate-background-notifications';

export interface EnhancedNotificationConfig {
  culturalAdaptations: {
    language: 'en-MY' | 'ms-MY' | 'zh-CN' | 'ta-IN';
    timezone: string;
    prayerTimeAvoidance: boolean;
    festivalAdjustments: boolean;
    ramadanMode: boolean;
  };
  accessibilitySettings: {
    elderlyMode: boolean;
    voiceAnnouncements: boolean;
    hapticFeedback: boolean;
    highContrast: boolean;
    largeText: boolean;
    persistentNotifications: boolean;
  };
  deliverySettings: {
    multiModal: boolean;
    urgencyEscalation: boolean;
    familyNotifications: boolean;
    emergencyBypass: boolean;
    offlineQueueing: boolean;
  };
  performanceSettings: {
    batteryOptimization: boolean;
    backgroundSync: boolean;
    intelligentScheduling: boolean;
    adaptiveFrequency: boolean;
  };
}

export interface NotificationPayload {
  id: string;
  type: 'medication' | 'prayer' | 'emergency' | 'family' | 'appointment' | 'cultural';
  title: string;
  body: string;
  data?: Record<string, any>;
  priority: 'low' | 'normal' | 'high' | 'emergency';
  scheduledTime?: Date;
  culturalContext?: string;
  deepLink?: string;
  multiModalDelivery?: boolean;
}

export interface NotificationResponse {
  success: boolean;
  notificationId?: string;
  error?: string;
  deliveryReport?: {
    delivered: boolean;
    deliveryTime: Date;
    deliveryMethod: 'push' | 'sms' | 'voice' | 'emergency';
  };
}

export class ExpoNotificationService {
  private static instance: ExpoNotificationService;
  private config: EnhancedNotificationConfig;
  private isInitialized: boolean = false;
  private pushToken: string | null = null;
  private notificationQueue: NotificationPayload[] = [];
  private listeners: Set<(notification: NotificationPayload) => void> = new Set();

  private constructor() {
    this.config = this.getDefaultConfig();
    this.setupNotificationHandler();
  }

  public static getInstance(): ExpoNotificationService {
    if (!ExpoNotificationService.instance) {
      ExpoNotificationService.instance = new ExpoNotificationService();
    }
    return ExpoNotificationService.instance;
  }

  private getDefaultConfig(): EnhancedNotificationConfig {
    return {
      culturalAdaptations: {
        language: 'en-MY',
        timezone: 'Asia/Kuala_Lumpur',
        prayerTimeAvoidance: true,
        festivalAdjustments: true,
        ramadanMode: false,
      },
      accessibilitySettings: {
        elderlyMode: true,
        voiceAnnouncements: true,
        hapticFeedback: true,
        highContrast: false,
        largeText: true,
        persistentNotifications: true,
      },
      deliverySettings: {
        multiModal: true,
        urgencyEscalation: true,
        familyNotifications: true,
        emergencyBypass: true,
        offlineQueueing: true,
      },
      performanceSettings: {
        batteryOptimization: true,
        backgroundSync: true,
        intelligentScheduling: true,
        adaptiveFrequency: true,
      },
    };
  }

  private setupNotificationHandler(): void {
    Notifications.setNotificationHandler({
      handleNotification: async (notification) => {
        const payload = notification.request.content.data as NotificationPayload;

        // Handle accessibility features
        if (this.config.accessibilitySettings.hapticFeedback) {
          await this.triggerHapticForNotification(payload);
        }

        if (this.config.accessibilitySettings.voiceAnnouncements) {
          await this.announceNotification(payload);
        }

        return {
          shouldShowAlert: true,
          shouldPlaySound: !accessibilityManager.getConfig().emergencyMode,
          shouldSetBadge: true,
          priority: this.mapPriorityToSystem(payload.priority),
        };
      },
    });
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Request permissions
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        throw new Error('Notification permissions not granted');
      }

      // Get push token
      if (Device.isDevice) {
        this.pushToken = (await Notifications.getExpoPushTokenAsync()).data;
        console.log('Push token:', this.pushToken);
      } else {
        console.warn('Push notifications require a physical device');
      }

      // Set up background tasks
      await this.setupBackgroundTasks();

      // Set up notification listeners
      this.setupNotificationListeners();

      // Load persisted notifications
      await this.loadPersistedNotifications();

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize notification service:', error);
      throw error;
    }
  }

  private async setupBackgroundTasks(): Promise<void> {
    if (!this.config.performanceSettings.backgroundSync) return;

    try {
      // Define background task
      TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, async () => {
        try {
          await this.processNotificationQueue();
          return BackgroundFetch.BackgroundFetchResult.NewData;
        } catch (error) {
          console.error('Background notification task error:', error);
          return BackgroundFetch.BackgroundFetchResult.Failed;
        }
      });

      // Register background fetch
      await BackgroundFetch.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK, {
        minimumInterval: 15 * 60 * 1000, // 15 minutes
        stopOnTerminate: false,
        startOnBoot: true,
      });
    } catch (error) {
      console.warn('Background task setup failed:', error);
    }
  }

  private setupNotificationListeners(): void {
    // Handle notification received while app is running
    Notifications.addNotificationReceivedListener((notification) => {
      const payload = notification.request.content.data as NotificationPayload;
      this.notifyListeners(payload);
    });

    // Handle notification response (user interaction)
    Notifications.addNotificationResponseReceivedListener((response) => {
      const payload = response.notification.request.content.data as NotificationPayload;
      this.handleNotificationResponse(payload, response);
    });
  }

  public updateConfig(updates: Partial<EnhancedNotificationConfig>): void {
    this.config = { ...this.config, ...updates };
    this.persistConfig();
  }

  public async scheduleNotification(payload: NotificationPayload): Promise<NotificationResponse> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      // Apply cultural and accessibility adaptations
      const adaptedPayload = await this.adaptNotificationForCulture(payload);
      const finalPayload = await this.adaptNotificationForAccessibility(adaptedPayload);

      // Check if scheduling conflicts with cultural constraints
      if (await this.hasSchedulingConflict(finalPayload)) {
        return {
          success: false,
          error: 'Scheduling conflicts with cultural constraints',
        };
      }

      // Schedule the notification
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: {
          title: finalPayload.title,
          body: finalPayload.body,
          data: finalPayload,
          sound: this.getNotificationSound(finalPayload),
          badge: 1,
        },
        trigger: finalPayload.scheduledTime ? {
          date: finalPayload.scheduledTime,
        } : null,
      });

      // Store for persistence
      await this.persistNotification(finalPayload, notificationId);

      return {
        success: true,
        notificationId,
        deliveryReport: {
          delivered: true,
          deliveryTime: new Date(),
          deliveryMethod: 'push',
        },
      };
    } catch (error) {
      console.error('Failed to schedule notification:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  public async sendImmediateNotification(payload: NotificationPayload): Promise<NotificationResponse> {
    const immediatePayload = { ...payload, scheduledTime: undefined };
    return this.scheduleNotification(immediatePayload);
  }

  public async cancelNotification(notificationId: string): Promise<boolean> {
    try {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      await this.removePersistedNotification(notificationId);
      return true;
    } catch (error) {
      console.error('Failed to cancel notification:', error);
      return false;
    }
  }

  public async cancelAllNotifications(): Promise<boolean> {
    try {
      await Notifications.cancelAllScheduledNotificationsAsync();
      await AsyncStorage.removeItem(NOTIFICATION_STORAGE_KEY);
      return true;
    } catch (error) {
      console.error('Failed to cancel all notifications:', error);
      return false;
    }
  }

  private async adaptNotificationForCulture(payload: NotificationPayload): Promise<NotificationPayload> {
    const { culturalAdaptations } = this.config;

    // Translate content based on language
    const translatedContent = await this.translateNotificationContent(
      payload,
      culturalAdaptations.language
    );

    // Adjust scheduling for cultural events
    let adjustedTime = payload.scheduledTime;
    if (adjustedTime && culturalAdaptations.festivalAdjustments) {
      adjustedTime = await this.adjustForCulturalEvents(adjustedTime);
    }

    return {
      ...payload,
      ...translatedContent,
      scheduledTime: adjustedTime,
      culturalContext: culturalAdaptations.language,
    };
  }

  private async adaptNotificationForAccessibility(payload: NotificationPayload): Promise<NotificationPayload> {
    const { accessibilitySettings } = this.config;

    let adaptedPayload = { ...payload };

    if (accessibilitySettings.elderlyMode) {
      // Simplify language for elderly users
      adaptedPayload.title = this.simplifyText(adaptedPayload.title);
      adaptedPayload.body = this.simplifyText(adaptedPayload.body);
    }

    if (accessibilitySettings.largeText) {
      // Add formatting hints for large text display
      adaptedPayload.data = {
        ...adaptedPayload.data,
        largeText: true,
      };
    }

    return adaptedPayload;
  }

  private async translateNotificationContent(
    payload: NotificationPayload,
    language: string
  ): Promise<{ title: string; body: string }> {
    // In a real implementation, this would use a translation service
    const translations: Record<string, Record<string, string>> = {
      'medication_reminder': {
        'en-MY': 'Time to take your medication',
        'ms-MY': 'Masa untuk mengambil ubat',
        'zh-CN': '该吃药了',
        'ta-IN': 'மருந்து எடுக்க வேண்டிய நேரம்',
      },
      'prayer_time': {
        'en-MY': 'Prayer time reminder',
        'ms-MY': 'Peringatan waktu solat',
        'zh-CN': '祈祷时间提醒',
        'ta-IN': 'தொழுகை நேர நினைவூட்டல்',
      },
    };

    const translatedTitle = translations[payload.type]?.[language] || payload.title;

    return {
      title: translatedTitle,
      body: payload.body, // Body would also be translated in real implementation
    };
  }

  private async hasSchedulingConflict(payload: NotificationPayload): Promise<boolean> {
    const { culturalAdaptations } = this.config;

    if (!payload.scheduledTime || !culturalAdaptations.prayerTimeAvoidance) {
      return false;
    }

    // Check for prayer time conflicts (simplified implementation)
    const hour = payload.scheduledTime.getHours();
    const prayerTimes = [5, 12, 15, 18, 20]; // Simplified prayer times

    for (const prayerHour of prayerTimes) {
      if (Math.abs(hour - prayerHour) < 1) {
        return true;
      }
    }

    return false;
  }

  private async adjustForCulturalEvents(scheduledTime: Date): Promise<Date> {
    // In a real implementation, this would check against a cultural calendar
    // For now, just return the original time
    return scheduledTime;
  }

  private simplifyText(text: string): string {
    // Simplify text for elderly users
    return text
      .replace(/(\w+)ing\b/g, '$1') // Remove -ing endings where possible
      .replace(/\b(very|really|extremely)\s+/gi, '') // Remove intensifiers
      .replace(/\b(please|kindly)\s+/gi, ''); // Remove politeness words
  }

  private async triggerHapticForNotification(payload: NotificationPayload): Promise<void> {
    try {
      switch (payload.type) {
        case 'emergency':
          await hapticFeedback.emergencyAlert();
          break;
        case 'medication':
          await hapticFeedback.medicationTaken();
          break;
        default:
          await hapticFeedback.buttonPress();
      }
    } catch (error) {
      console.warn('Haptic feedback error:', error);
    }
  }

  private async announceNotification(payload: NotificationPayload): Promise<void> {
    if (!accessibilityManager.isVoiceGuidanceEnabled()) return;

    try {
      const announcement = `${payload.title}. ${payload.body}`;
      await voiceGuidance.speak({
        text: announcement,
        priority: payload.priority === 'emergency' ? 'emergency' : 'normal',
        interrupt: payload.priority === 'emergency',
      });
    } catch (error) {
      console.warn('Voice announcement error:', error);
    }
  }

  private mapPriorityToSystem(priority: string): number {
    switch (priority) {
      case 'emergency': return 2;
      case 'high': return 1;
      case 'normal': return 0;
      case 'low': return -1;
      default: return 0;
    }
  }

  private getNotificationSound(payload: NotificationPayload): string | undefined {
    if (payload.type === 'emergency') {
      return 'default'; // Could be a custom emergency sound
    }
    return 'default';
  }

  private async persistNotification(payload: NotificationPayload, notificationId: string): Promise<void> {
    try {
      const stored = await this.getStoredNotifications();
      stored[notificationId] = payload;
      await AsyncStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(stored));
    } catch (error) {
      console.warn('Failed to persist notification:', error);
    }
  }

  private async removePersistedNotification(notificationId: string): Promise<void> {
    try {
      const stored = await this.getStoredNotifications();
      delete stored[notificationId];
      await AsyncStorage.setItem(NOTIFICATION_STORAGE_KEY, JSON.stringify(stored));
    } catch (error) {
      console.warn('Failed to remove persisted notification:', error);
    }
  }

  private async getStoredNotifications(): Promise<Record<string, NotificationPayload>> {
    try {
      const stored = await AsyncStorage.getItem(NOTIFICATION_STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.warn('Failed to get stored notifications:', error);
      return {};
    }
  }

  private async loadPersistedNotifications(): Promise<void> {
    try {
      const stored = await this.getStoredNotifications();
      // Reschedule any missed notifications or handle them appropriately
      Object.entries(stored).forEach(([id, payload]) => {
        if (payload.scheduledTime && new Date(payload.scheduledTime) > new Date()) {
          // Notification is still valid, could reschedule it
          console.log(`Found persisted notification ${id} for future delivery`);
        }
      });
    } catch (error) {
      console.warn('Failed to load persisted notifications:', error);
    }
  }

  private async processNotificationQueue(): Promise<void> {
    while (this.notificationQueue.length > 0) {
      const payload = this.notificationQueue.shift();
      if (payload) {
        await this.scheduleNotification(payload);
      }
    }
  }

  private async persistConfig(): Promise<void> {
    try {
      await AsyncStorage.setItem('notification_config', JSON.stringify(this.config));
    } catch (error) {
      console.warn('Failed to persist notification config:', error);
    }
  }

  private handleNotificationResponse(payload: NotificationPayload, response: any): void {
    // Handle deep linking
    if (payload.deepLink) {
      // Navigation would be handled here
      console.log(`Deep link: ${payload.deepLink}`);
    }

    // Handle type-specific responses
    switch (payload.type) {
      case 'medication':
        this.handleMedicationNotificationResponse(payload, response);
        break;
      case 'emergency':
        this.handleEmergencyNotificationResponse(payload, response);
        break;
    }
  }

  private handleMedicationNotificationResponse(payload: NotificationPayload, response: any): void {
    // Handle medication-specific notification responses
    console.log('Medication notification responded to:', payload.id);
  }

  private handleEmergencyNotificationResponse(payload: NotificationPayload, response: any): void {
    // Handle emergency-specific notification responses
    console.log('Emergency notification responded to:', payload.id);
  }

  public subscribe(listener: (notification: NotificationPayload) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(notification: NotificationPayload): void {
    this.listeners.forEach(listener => {
      try {
        listener(notification);
      } catch (error) {
        console.warn('Notification listener error:', error);
      }
    });
  }

  public getPushToken(): string | null {
    return this.pushToken;
  }

  public getConfig(): EnhancedNotificationConfig {
    return { ...this.config };
  }
}

// Singleton instance
export const expoNotificationService = ExpoNotificationService.getInstance();