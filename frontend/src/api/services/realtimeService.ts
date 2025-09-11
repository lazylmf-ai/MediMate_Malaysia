/**
 * Real-time Services
 * 
 * Provides real-time communication capabilities including:
 * - Push notification subscriptions
 * - WebSocket connections for live updates
 * - Cultural-aware notification preferences
 * - Family coordination alerts
 */

import { apiClient } from '../client';
import { API_ENDPOINTS } from '../endpoints';
import type { 
  ApiResponse, 
  NotificationSubscriptionRequest, 
  SubscriptionResponse 
} from '../types';

export interface WebSocketConfig {
  onConnect?: () => void;
  onDisconnect?: () => void;
  onMessage?: (message: any) => void;
  onError?: (error: Error) => void;
  culturalContext?: {
    language: string;
    stateCode: string;
    prayerTimeNotifications: boolean;
  };
}

export interface NotificationPreferences {
  appointment_reminder: boolean;
  medication_reminder: boolean;
  prayer_time: boolean;
  emergency_alert: boolean;
  family_update: boolean;
  cultural_event: boolean;
  language: 'ms' | 'en' | 'zh' | 'ta';
  quiet_hours?: {
    start: string; // HH:MM format
    end: string; // HH:MM format
  };
  ramadan_adjustments: boolean;
}

export class RealtimeService {
  private websocket: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 1000;

  /**
   * Subscribe to push notifications
   */
  async subscribeToNotifications(
    subscriptionData: NotificationSubscriptionRequest
  ): Promise<ApiResponse<SubscriptionResponse>> {
    return apiClient.request<SubscriptionResponse>(
      API_ENDPOINTS.REALTIME.NOTIFICATIONS_SUBSCRIBE,
      {
        method: 'POST',
        body: JSON.stringify(subscriptionData),
        culturalContext: {
          language: subscriptionData.cultural_preferences.language,
        },
      }
    );
  }

  /**
   * Subscribe with enhanced cultural preferences
   */
  async subscribeWithCulturalPreferences(
    deviceToken: string,
    platform: 'ios' | 'android' | 'web',
    preferences: NotificationPreferences
  ): Promise<ApiResponse<SubscriptionResponse>> {
    const subscriptionRequest: NotificationSubscriptionRequest = {
      device_token: deviceToken,
      platform,
      notification_types: Object.keys(preferences).filter(
        key => key !== 'language' && key !== 'quiet_hours' && key !== 'ramadan_adjustments' && 
               (preferences as any)[key] === true
      ) as any[],
      cultural_preferences: {
        language: preferences.language,
        prayer_time_notifications: preferences.prayer_time,
        ramadan_adjustments: preferences.ramadan_adjustments,
      },
    };

    return this.subscribeToNotifications(subscriptionRequest);
  }

  /**
   * Connect to dashboard WebSocket
   */
  async connectToDashboard(config: WebSocketConfig): Promise<{
    success: boolean;
    connection?: WebSocket;
    error?: string;
  }> {
    try {
      // Get WebSocket URL from dashboard connect endpoint
      const wsUrl = API_ENDPOINTS.REALTIME.WEBSOCKET_CONNECT.replace('http', 'ws');
      
      this.websocket = new WebSocket(wsUrl);
      
      this.websocket.onopen = () => {
        this.reconnectAttempts = 0;
        console.log('WebSocket connected to dashboard');
        
        // Send cultural context
        if (config.culturalContext) {
          this.sendMessage({
            type: 'cultural_context',
            data: config.culturalContext,
          });
        }
        
        config.onConnect?.();
      };

      this.websocket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleIncomingMessage(message, config);
          config.onMessage?.(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.websocket.onclose = () => {
        console.log('WebSocket connection closed');
        config.onDisconnect?.();
        this.attemptReconnect(config);
      };

      this.websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        config.onError?.(new Error('WebSocket connection failed'));
      };

      return {
        success: true,
        connection: this.websocket,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to connect to WebSocket',
      };
    }
  }

  /**
   * Handle incoming WebSocket messages with cultural awareness
   */
  private handleIncomingMessage(message: any, config: WebSocketConfig) {
    const { type, data } = message;

    switch (type) {
      case 'prayer_time_notification':
        if (config.culturalContext?.prayerTimeNotifications) {
          this.handlePrayerTimeNotification(data);
        }
        break;
      
      case 'medication_reminder':
        this.handleMedicationReminder(data, config.culturalContext?.language);
        break;
      
      case 'appointment_reminder':
        this.handleAppointmentReminder(data, config.culturalContext?.language);
        break;
      
      case 'emergency_alert':
        this.handleEmergencyAlert(data, config.culturalContext?.language);
        break;
      
      case 'family_update':
        this.handleFamilyUpdate(data);
        break;
      
      case 'cultural_event':
        this.handleCulturalEvent(data, config.culturalContext?.language);
        break;
      
      default:
        console.log('Unhandled WebSocket message type:', type);
    }
  }

  /**
   * Handle prayer time notifications
   */
  private handlePrayerTimeNotification(data: {
    prayer_name: string;
    prayer_time: string;
    state_code: string;
  }) {
    console.log(`Prayer time notification: ${data.prayer_name} at ${data.prayer_time}`);
    
    // Show culturally appropriate notification
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`Prayer Time: ${data.prayer_name}`, {
        body: `It's time for ${data.prayer_name} prayer (${data.prayer_time})`,
        icon: '/assets/icons/prayer-icon.png',
        tag: 'prayer_time',
      });
    }
  }

  /**
   * Handle medication reminders with cultural context
   */
  private handleMedicationReminder(
    data: {
      medication_name: string;
      dosage: string;
      time: string;
      cultural_notes?: string[];
    },
    language?: string
  ) {
    console.log(`Medication reminder: ${data.medication_name} at ${data.time}`);
    
    // Show notification in appropriate language
    const title = this.getLocalizedText('medication_reminder_title', language);
    const body = `${data.medication_name} - ${data.dosage}`;
    
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body: body,
        icon: '/assets/icons/medication-icon.png',
        tag: 'medication_reminder',
      });
    }

    // Show cultural notes if available
    if (data.cultural_notes && data.cultural_notes.length > 0) {
      console.log('Cultural considerations:', data.cultural_notes);
    }
  }

  /**
   * Handle appointment reminders
   */
  private handleAppointmentReminder(
    data: {
      appointment_id: string;
      provider_name: string;
      appointment_time: string;
      cultural_considerations?: any;
    },
    language?: string
  ) {
    console.log(`Appointment reminder: ${data.provider_name} at ${data.appointment_time}`);
    
    const title = this.getLocalizedText('appointment_reminder_title', language);
    const body = `Appointment with ${data.provider_name} at ${data.appointment_time}`;
    
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body: body,
        icon: '/assets/icons/appointment-icon.png',
        tag: 'appointment_reminder',
      });
    }
  }

  /**
   * Handle emergency alerts
   */
  private handleEmergencyAlert(
    data: {
      alert_id: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      message: string;
      action_required?: string;
    },
    language?: string
  ) {
    console.log(`Emergency alert (${data.severity}): ${data.message}`);
    
    const title = this.getLocalizedText('emergency_alert_title', language);
    
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body: data.message,
        icon: '/assets/icons/emergency-icon.png',
        tag: 'emergency_alert',
        requireInteraction: data.severity === 'critical',
      });
    }

    // Play alert sound for critical alerts
    if (data.severity === 'critical') {
      this.playAlertSound();
    }
  }

  /**
   * Handle family updates
   */
  private handleFamilyUpdate(data: {
    family_member: string;
    update_type: 'medication_taken' | 'appointment_completed' | 'emergency';
    message: string;
    timestamp: string;
  }) {
    console.log(`Family update from ${data.family_member}: ${data.message}`);
    
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`Family Update: ${data.family_member}`, {
        body: data.message,
        icon: '/assets/icons/family-icon.png',
        tag: 'family_update',
      });
    }
  }

  /**
   * Handle cultural event notifications
   */
  private handleCulturalEvent(
    data: {
      event_name: string;
      event_type: 'ramadan' | 'eid' | 'chinese_new_year' | 'deepavali' | 'other';
      description: string;
      healthcare_considerations?: string[];
    },
    language?: string
  ) {
    console.log(`Cultural event: ${data.event_name} - ${data.description}`);
    
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(`Cultural Event: ${data.event_name}`, {
        body: data.description,
        icon: '/assets/icons/cultural-icon.png',
        tag: 'cultural_event',
      });
    }

    // Log healthcare considerations
    if (data.healthcare_considerations) {
      console.log('Healthcare considerations:', data.healthcare_considerations);
    }
  }

  /**
   * Send message through WebSocket
   */
  sendMessage(message: any): boolean {
    if (this.websocket && this.websocket.readyState === WebSocket.OPEN) {
      this.websocket.send(JSON.stringify(message));
      return true;
    }
    console.warn('WebSocket is not connected');
    return false;
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect() {
    if (this.websocket) {
      this.websocket.close();
      this.websocket = null;
    }
  }

  /**
   * Attempt to reconnect WebSocket
   */
  private attemptReconnect(config: WebSocketConfig) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`Attempting to reconnect WebSocket (${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
      
      setTimeout(() => {
        this.connectToDashboard(config);
      }, this.reconnectInterval * this.reconnectAttempts);
    } else {
      console.error('Max reconnection attempts reached');
    }
  }

  /**
   * Update notification preferences
   */
  async updateNotificationPreferences(
    subscriptionId: string,
    preferences: Partial<NotificationPreferences>
  ): Promise<ApiResponse<SubscriptionResponse>> {
    // In a real implementation, this would call a PUT endpoint
    return {
      success: true,
      data: {
        subscription_id: subscriptionId,
        device_token: 'updated',
        platform: 'web',
        notification_types: Object.keys(preferences).filter(key => (preferences as any)[key] === true),
        status: 'active',
        created_at: new Date().toISOString(),
      },
    };
  }

  /**
   * Get current notification preferences
   */
  async getNotificationPreferences(subscriptionId: string): Promise<ApiResponse<NotificationPreferences>> {
    // In a real implementation, this would fetch from backend
    return {
      success: true,
      data: {
        appointment_reminder: true,
        medication_reminder: true,
        prayer_time: true,
        emergency_alert: true,
        family_update: true,
        cultural_event: true,
        language: 'en',
        quiet_hours: {
          start: '22:00',
          end: '07:00',
        },
        ramadan_adjustments: true,
      },
    };
  }

  /**
   * Check notification permissions and request if needed
   */
  async requestNotificationPermission(): Promise<{
    granted: boolean;
    permission: NotificationPermission;
  }> {
    if (!('Notification' in window)) {
      return { granted: false, permission: 'denied' };
    }

    let permission = Notification.permission;
    
    if (permission === 'default') {
      permission = await Notification.requestPermission();
    }

    return {
      granted: permission === 'granted',
      permission,
    };
  }

  /**
   * Utility methods
   */
  private getLocalizedText(key: string, language?: string): string {
    const translations: Record<string, Record<string, string>> = {
      medication_reminder_title: {
        en: 'Medication Reminder',
        ms: 'Peringatan Ubat',
        zh: '药物提醒',
        ta: 'மருந்து நினைவூட்டல்',
      },
      appointment_reminder_title: {
        en: 'Appointment Reminder',
        ms: 'Peringatan Temujanji',
        zh: '预约提醒',
        ta: 'சந்திப்பு நினைவூட்டல்',
      },
      emergency_alert_title: {
        en: 'Emergency Alert',
        ms: 'Amaran Kecemasan',
        zh: '紧急警报',
        ta: 'அவசர எச்சரிக்கை',
      },
    };

    return translations[key]?.[language || 'en'] || translations[key]?.['en'] || key;
  }

  private playAlertSound() {
    try {
      const audio = new Audio('/assets/sounds/alert.mp3');
      audio.play().catch(error => {
        console.warn('Could not play alert sound:', error);
      });
    } catch (error) {
      console.warn('Alert sound not available:', error);
    }
  }

  /**
   * Get WebSocket connection status
   */
  getConnectionStatus(): {
    connected: boolean;
    readyState?: number;
    reconnectAttempts: number;
  } {
    return {
      connected: this.websocket?.readyState === WebSocket.OPEN,
      readyState: this.websocket?.readyState,
      reconnectAttempts: this.reconnectAttempts,
    };
  }

  /**
   * Send heartbeat to keep connection alive
   */
  sendHeartbeat() {
    this.sendMessage({
      type: 'heartbeat',
      timestamp: Date.now(),
    });
  }

  /**
   * Start heartbeat interval
   */
  startHeartbeat(intervalMs: number = 30000) {
    setInterval(() => {
      this.sendHeartbeat();
    }, intervalMs);
  }
}

export const realtimeService = new RealtimeService();