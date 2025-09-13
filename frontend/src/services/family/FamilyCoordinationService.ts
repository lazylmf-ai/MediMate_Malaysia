/**
 * Family Coordination Service
 *
 * Manages family member notifications, coordination, and communication
 * for medication adherence monitoring and emergency situations.
 * Integrates with existing notification and escalation services.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NotificationPriorityService, { EmergencyContact } from '../notifications/NotificationPriorityService';
import SMSService from '../sms/SMSService';
import VoiceReminderService from '../voice/VoiceReminderService';
import CulturalNotificationService from '../notifications/CulturalNotificationService';
import type { SupportedLanguage } from '@/i18n/translations';

export interface FamilyMember {
  id: string;
  name: string;
  relationship: 'spouse' | 'child' | 'parent' | 'sibling' | 'caregiver' | 'guardian';
  phoneNumber: string;
  email?: string;
  language: SupportedLanguage;

  // Notification preferences
  notificationPreferences: {
    medicationReminders: boolean;
    missedDoses: boolean;
    emergencyAlerts: boolean;
    dailySummary: boolean;
    weeklyReports: boolean;
  };

  // Cultural preferences
  culturalPreferences: {
    preferredContactTime?: 'morning' | 'afternoon' | 'evening';
    respectPrayerTimes: boolean;
    useHonorifics: boolean;
    includePatientDetails: boolean;
    formalCommunication: boolean;
  };

  // Access and permissions
  permissions: {
    canViewMedications: boolean;
    canReceiveAlerts: boolean;
    canMarkTaken: boolean;
    canUpdateSchedule: boolean;
    isPrimaryCaregiver: boolean;
  };

  // Metadata
  priority: number; // 1-10, higher = contact first
  timeZone: string;
  isEnabled: boolean;
  lastContactedAt?: Date;
  registeredAt: Date;

  // Malaysian-specific
  icNumber?: string; // For identity verification if needed
  emergencyContactFor?: string[]; // Patient IDs they are emergency contact for
}

export interface PatientFamilyCircle {
  patientId: string;
  patientName: string;
  familyMembers: FamilyMember[];
  primaryCaregiver?: string; // Family member ID
  emergencyContacts: string[]; // Family member IDs for emergency
  coordinationSettings: {
    autoNotifyFamily: boolean;
    escalationDelay: number; // minutes before family notification
    includeMedicationDetails: boolean;
    respectCulturalConstraints: boolean;
    emergencyNotificationMethod: 'sms' | 'voice' | 'both';
  };
  lastUpdated: Date;
}

export interface FamilyNotification {
  id: string;
  patientId: string;
  familyMemberId: string;
  type: 'missed_dose' | 'emergency_alert' | 'daily_summary' | 'weekly_report' | 'medication_taken' | 'general_update';
  priority: 'low' | 'medium' | 'high' | 'urgent';

  content: {
    title: string;
    body: string;
    medicationName?: string;
    dosage?: string;
    timeWindow?: string;
    additionalInfo?: Record<string, any>;
  };

  delivery: {
    methods: ('push' | 'sms' | 'voice' | 'email')[];
    scheduledAt: Date;
    deliveredAt?: Date;
    status: 'pending' | 'delivered' | 'failed' | 'cancelled';
    attempts: number;
    lastAttemptAt?: Date;
  };

  culturalAdaptations: {
    language: SupportedLanguage;
    useHonorifics: boolean;
    includePatientDetails: boolean;
    respectPrayerTimes: boolean;
    formalTone: boolean;
  };

  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface CoordinationAnalytics {
  period: { start: Date; end: Date };

  familyEngagement: {
    totalFamilyMembers: number;
    activeMembers: number;
    averageResponseTime: number; // minutes
    notificationDeliveryRate: number; // percentage
  };

  communicationStats: {
    totalNotifications: number;
    byType: Record<FamilyNotification['type'], number>;
    byPriority: Record<FamilyNotification['priority'], number>;
    deliverySuccess: number; // percentage
    preferredMethods: Record<string, number>;
  };

  emergencyResponse: {
    totalEmergencies: number;
    averageResponseTime: number; // minutes
    familyContactSuccess: number; // percentage
    escalationRate: number; // percentage of emergencies that escalated
  };

  culturalAdaptations: {
    languageDistribution: Record<SupportedLanguage, number>;
    culturalPreferenceUsage: {
      honorifics: number;
      prayerTimeRespect: number;
      formalCommunication: number;
    };
  };
}

class FamilyCoordinationService {
  private static instance: FamilyCoordinationService;

  // Service dependencies
  private priorityService: NotificationPriorityService;
  private smsService: SMSService;
  private voiceService: VoiceReminderService;
  private culturalService: CulturalNotificationService;

  // Data storage
  private familyCircles: Map<string, PatientFamilyCircle> = new Map();
  private notificationQueue: Map<string, FamilyNotification> = new Map();
  private notificationHistory: Map<string, FamilyNotification> = new Map();

  // Configuration
  private config = {
    maxNotificationRetries: 3,
    retryDelay: 5 * 60 * 1000, // 5 minutes
    emergencyResponseTimeout: 30 * 60 * 1000, // 30 minutes
    dailySummaryTime: '18:00', // 6 PM
    weeklyReportDay: 0, // Sunday
  };

  private isInitialized = false;

  private constructor() {
    this.priorityService = NotificationPriorityService.getInstance();
    this.smsService = SMSService.getInstance();
    this.voiceService = VoiceReminderService.getInstance();
    this.culturalService = CulturalNotificationService.getInstance();
  }

  static getInstance(): FamilyCoordinationService {
    if (!FamilyCoordinationService.instance) {
      FamilyCoordinationService.instance = new FamilyCoordinationService();
    }
    return FamilyCoordinationService.instance;
  }

  /**
   * Initialize family coordination service
   */
  async initialize(): Promise<{ success: boolean; error?: string }> {
    try {
      // Load family circles and notification history
      await this.loadFamilyCircles();
      await this.loadNotificationHistory();

      // Initialize dependent services
      await this.priorityService.initialize();
      await this.smsService.initialize();
      await this.voiceService.initialize();
      await this.culturalService.initialize();

      // Start background processors
      this.startNotificationProcessor();
      this.startDailySummaryScheduler();
      this.startWeeklyReportScheduler();

      this.isInitialized = true;
      console.log('Family Coordination Service initialized successfully');
      return { success: true };

    } catch (error) {
      console.error('Failed to initialize family coordination service:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Initialization failed'
      };
    }
  }

  /**
   * Register family member for a patient
   */
  async registerFamilyMember(
    patientId: string,
    familyMember: Omit<FamilyMember, 'id' | 'registeredAt'>
  ): Promise<{ success: boolean; familyMemberId?: string; error?: string }> {
    try {
      const familyMemberId = `fm_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const newFamilyMember: FamilyMember = {
        ...familyMember,
        id: familyMemberId,
        registeredAt: new Date()
      };

      // Get or create family circle
      let familyCircle = this.familyCircles.get(patientId);
      if (!familyCircle) {
        familyCircle = {
          patientId,
          patientName: patientId, // This should be populated from patient data
          familyMembers: [],
          emergencyContacts: [],
          coordinationSettings: this.getDefaultCoordinationSettings(),
          lastUpdated: new Date()
        };
      }

      // Add family member
      familyCircle.familyMembers.push(newFamilyMember);

      // Set as primary caregiver if first family member or has permission
      if (!familyCircle.primaryCaregiver && newFamilyMember.permissions.isPrimaryCaregiver) {
        familyCircle.primaryCaregiver = familyMemberId;
      }

      // Add to emergency contacts if has permission
      if (newFamilyMember.permissions.canReceiveAlerts) {
        familyCircle.emergencyContacts.push(familyMemberId);
      }

      familyCircle.lastUpdated = new Date();
      this.familyCircles.set(patientId, familyCircle);

      // Save to storage
      await this.saveFamilyCircles();

      // Send welcome notification
      await this.sendWelcomeNotification(patientId, newFamilyMember);

      console.log(`Family member ${familyMember.name} registered for patient ${patientId}`);
      return { success: true, familyMemberId };

    } catch (error) {
      console.error('Failed to register family member:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed'
      };
    }
  }

  /**
   * Send family notification for missed dose
   */
  async notifyFamilyMissedDose(
    patientId: string,
    medicationName: string,
    dosage: string,
    missedTime: Date,
    additionalInfo?: Record<string, any>
  ): Promise<{ success: boolean; notificationIds?: string[]; error?: string }> {
    try {
      const familyCircle = this.familyCircles.get(patientId);
      if (!familyCircle) {
        return { success: false, error: 'No family circle found for patient' };
      }

      const notificationIds: string[] = [];

      // Get eligible family members (those who want missed dose alerts)
      const eligibleMembers = familyCircle.familyMembers.filter(member =>
        member.isEnabled &&
        member.notificationPreferences.missedDoses &&
        member.permissions.canReceiveAlerts
      );

      if (eligibleMembers.length === 0) {
        return { success: false, error: 'No family members enabled for missed dose notifications' };
      }

      // Create notifications for each eligible family member
      for (const member of eligibleMembers) {
        const notificationId = await this.createFamilyNotification({
          patientId,
          familyMemberId: member.id,
          type: 'missed_dose',
          priority: 'high',
          content: {
            title: this.getMissedDoseTitle(member.language, medicationName),
            body: this.getMissedDoseBody(member.language, familyCircle.patientName, medicationName, dosage, missedTime),
            medicationName,
            dosage,
            timeWindow: this.formatTimeWindow(missedTime, member.language),
            additionalInfo
          },
          culturalAdaptations: {
            language: member.language,
            useHonorifics: member.culturalPreferences.useHonorifics,
            includePatientDetails: member.culturalPreferences.includePatientDetails,
            respectPrayerTimes: member.culturalPreferences.respectPrayerTimes,
            formalTone: member.culturalPreferences.formalCommunication
          }
        });

        if (notificationId) {
          notificationIds.push(notificationId);
        }
      }

      console.log(`Created ${notificationIds.length} family notifications for missed dose: ${medicationName}`);
      return { success: true, notificationIds };

    } catch (error) {
      console.error('Failed to notify family of missed dose:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Notification failed'
      };
    }
  }

  /**
   * Send emergency alert to family members
   */
  async sendEmergencyAlert(
    patientId: string,
    emergencyType: 'missed_critical_medication' | 'no_response' | 'medical_emergency',
    context: {
      medicationName?: string;
      missedDoses?: number;
      lastResponse?: Date;
      additionalInfo?: string;
    }
  ): Promise<{ success: boolean; notificationIds?: string[]; error?: string }> {
    try {
      const familyCircle = this.familyCircles.get(patientId);
      if (!familyCircle) {
        return { success: false, error: 'No family circle found for patient' };
      }

      const notificationIds: string[] = [];

      // Get emergency contacts
      const emergencyMembers = familyCircle.familyMembers.filter(member =>
        member.isEnabled &&
        member.notificationPreferences.emergencyAlerts &&
        familyCircle.emergencyContacts.includes(member.id)
      ).sort((a, b) => b.priority - a.priority); // Sort by priority

      if (emergencyMembers.length === 0) {
        return { success: false, error: 'No emergency contacts available' };
      }

      // Create urgent notifications for emergency contacts
      for (const member of emergencyMembers) {
        const notificationId = await this.createFamilyNotification({
          patientId,
          familyMemberId: member.id,
          type: 'emergency_alert',
          priority: 'urgent',
          content: {
            title: this.getEmergencyTitle(member.language, emergencyType),
            body: this.getEmergencyBody(member.language, familyCircle.patientName, emergencyType, context),
            medicationName: context.medicationName,
            additionalInfo: context
          },
          culturalAdaptations: {
            language: member.language,
            useHonorifics: member.culturalPreferences.useHonorifics,
            includePatientDetails: member.culturalPreferences.includePatientDetails,
            respectPrayerTimes: false, // Emergency overrides prayer time respect
            formalTone: member.culturalPreferences.formalCommunication
          },
          // Emergency notifications use multiple delivery methods
          deliveryMethods: familyCircle.coordinationSettings.emergencyNotificationMethod === 'both'
            ? ['sms', 'voice', 'push']
            : familyCircle.coordinationSettings.emergencyNotificationMethod === 'voice'
            ? ['voice', 'sms']
            : ['sms', 'push']
        });

        if (notificationId) {
          notificationIds.push(notificationId);
        }
      }

      console.log(`Created ${notificationIds.length} emergency notifications for ${emergencyType}`);
      return { success: true, notificationIds };

    } catch (error) {
      console.error('Failed to send emergency alert:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Emergency alert failed'
      };
    }
  }

  /**
   * Send daily summary to family members
   */
  async sendDailySummary(patientId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const familyCircle = this.familyCircles.get(patientId);
      if (!familyCircle) {
        return { success: false, error: 'No family circle found' };
      }

      // Get family members who want daily summaries
      const summaryRecipients = familyCircle.familyMembers.filter(member =>
        member.isEnabled &&
        member.notificationPreferences.dailySummary
      );

      if (summaryRecipients.length === 0) {
        return { success: true }; // No recipients, but not an error
      }

      // Generate summary data (this would integrate with medication tracking)
      const summaryData = await this.generateDailySummary(patientId);

      // Send summary to each recipient
      for (const member of summaryRecipients) {
        await this.createFamilyNotification({
          patientId,
          familyMemberId: member.id,
          type: 'daily_summary',
          priority: 'low',
          content: {
            title: this.getDailySummaryTitle(member.language),
            body: this.getDailySummaryBody(member.language, familyCircle.patientName, summaryData),
            additionalInfo: summaryData
          },
          culturalAdaptations: {
            language: member.language,
            useHonorifics: member.culturalPreferences.useHonorifics,
            includePatientDetails: member.culturalPreferences.includePatientDetails,
            respectPrayerTimes: member.culturalPreferences.respectPrayerTimes,
            formalTone: member.culturalPreferences.formalCommunication
          }
        });
      }

      return { success: true };

    } catch (error) {
      console.error('Failed to send daily summary:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Daily summary failed'
      };
    }
  }

  /**
   * Get family circle for patient
   */
  getFamilyCircle(patientId: string): PatientFamilyCircle | null {
    return this.familyCircles.get(patientId) || null;
  }

  /**
   * Get family member by ID
   */
  getFamilyMember(patientId: string, familyMemberId: string): FamilyMember | null {
    const familyCircle = this.familyCircles.get(patientId);
    return familyCircle?.familyMembers.find(member => member.id === familyMemberId) || null;
  }

  /**
   * Update family member preferences
   */
  async updateFamilyMemberPreferences(
    patientId: string,
    familyMemberId: string,
    updates: Partial<Pick<FamilyMember, 'notificationPreferences' | 'culturalPreferences' | 'permissions'>>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const familyCircle = this.familyCircles.get(patientId);
      if (!familyCircle) {
        return { success: false, error: 'Family circle not found' };
      }

      const memberIndex = familyCircle.familyMembers.findIndex(member => member.id === familyMemberId);
      if (memberIndex === -1) {
        return { success: false, error: 'Family member not found' };
      }

      // Update member preferences
      const member = familyCircle.familyMembers[memberIndex];
      if (updates.notificationPreferences) {
        member.notificationPreferences = { ...member.notificationPreferences, ...updates.notificationPreferences };
      }
      if (updates.culturalPreferences) {
        member.culturalPreferences = { ...member.culturalPreferences, ...updates.culturalPreferences };
      }
      if (updates.permissions) {
        member.permissions = { ...member.permissions, ...updates.permissions };
      }

      familyCircle.lastUpdated = new Date();
      await this.saveFamilyCircles();

      return { success: true };

    } catch (error) {
      console.error('Failed to update family member preferences:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Update failed'
      };
    }
  }

  /**
   * Get coordination analytics
   */
  async getCoordinationAnalytics(patientId?: string, days = 30): Promise<CoordinationAnalytics> {
    try {
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      let notifications = Array.from(this.notificationHistory.values())
        .filter(n => n.createdAt >= cutoff);

      if (patientId) {
        notifications = notifications.filter(n => n.patientId === patientId);
      }

      // Calculate analytics from notifications
      const analytics: CoordinationAnalytics = {
        period: { start: cutoff, end: new Date() },
        familyEngagement: {
          totalFamilyMembers: 0,
          activeMembers: 0,
          averageResponseTime: 0,
          notificationDeliveryRate: 0
        },
        communicationStats: {
          totalNotifications: notifications.length,
          byType: {
            missed_dose: 0,
            emergency_alert: 0,
            daily_summary: 0,
            weekly_report: 0,
            medication_taken: 0,
            general_update: 0
          },
          byPriority: {
            low: 0,
            medium: 0,
            high: 0,
            urgent: 0
          },
          deliverySuccess: 0,
          preferredMethods: {}
        },
        emergencyResponse: {
          totalEmergencies: 0,
          averageResponseTime: 0,
          familyContactSuccess: 0,
          escalationRate: 0
        },
        culturalAdaptations: {
          languageDistribution: { en: 0, ms: 0, zh: 0, ta: 0 },
          culturalPreferenceUsage: {
            honorifics: 0,
            prayerTimeRespect: 0,
            formalCommunication: 0
          }
        }
      };

      // Calculate stats from notifications
      let successfulDeliveries = 0;
      let emergencyCount = 0;

      notifications.forEach(notification => {
        // Type counts
        analytics.communicationStats.byType[notification.type]++;
        analytics.communicationStats.byPriority[notification.priority]++;

        // Delivery success
        if (notification.delivery.status === 'delivered') {
          successfulDeliveries++;
        }

        // Emergency count
        if (notification.type === 'emergency_alert') {
          emergencyCount++;
        }

        // Language distribution
        analytics.culturalAdaptations.languageDistribution[notification.culturalAdaptations.language]++;

        // Cultural preferences
        if (notification.culturalAdaptations.useHonorifics) {
          analytics.culturalAdaptations.culturalPreferenceUsage.honorifics++;
        }
        if (notification.culturalAdaptations.respectPrayerTimes) {
          analytics.culturalAdaptations.culturalPreferenceUsage.prayerTimeRespect++;
        }
        if (notification.culturalAdaptations.formalTone) {
          analytics.culturalAdaptations.culturalPreferenceUsage.formalCommunication++;
        }
      });

      analytics.communicationStats.deliverySuccess = notifications.length > 0
        ? (successfulDeliveries / notifications.length) * 100
        : 100;

      analytics.emergencyResponse.totalEmergencies = emergencyCount;

      // Count total family members
      const allFamilyCircles = patientId
        ? [this.familyCircles.get(patientId)].filter(Boolean)
        : Array.from(this.familyCircles.values());

      analytics.familyEngagement.totalFamilyMembers = allFamilyCircles
        .reduce((total, circle) => total + (circle?.familyMembers.length || 0), 0);

      return analytics;

    } catch (error) {
      console.error('Failed to generate coordination analytics:', error);
      // Return empty analytics
      return {
        period: { start: new Date(), end: new Date() },
        familyEngagement: {
          totalFamilyMembers: 0,
          activeMembers: 0,
          averageResponseTime: 0,
          notificationDeliveryRate: 0
        },
        communicationStats: {
          totalNotifications: 0,
          byType: {
            missed_dose: 0,
            emergency_alert: 0,
            daily_summary: 0,
            weekly_report: 0,
            medication_taken: 0,
            general_update: 0
          },
          byPriority: { low: 0, medium: 0, high: 0, urgent: 0 },
          deliverySuccess: 0,
          preferredMethods: {}
        },
        emergencyResponse: {
          totalEmergencies: 0,
          averageResponseTime: 0,
          familyContactSuccess: 0,
          escalationRate: 0
        },
        culturalAdaptations: {
          languageDistribution: { en: 0, ms: 0, zh: 0, ta: 0 },
          culturalPreferenceUsage: {
            honorifics: 0,
            prayerTimeRespect: 0,
            formalCommunication: 0
          }
        }
      };
    }
  }

  /**
   * Create family notification
   */
  private async createFamilyNotification(
    notificationData: Omit<FamilyNotification, 'id' | 'delivery' | 'createdAt'> & {
      deliveryMethods?: ('push' | 'sms' | 'voice' | 'email')[];
    }
  ): Promise<string | null> {
    try {
      const notificationId = `fn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      const familyMember = this.getFamilyMember(notificationData.patientId, notificationData.familyMemberId);
      if (!familyMember) {
        throw new Error('Family member not found');
      }

      // Determine delivery methods based on priority and preferences
      const deliveryMethods = notificationData.deliveryMethods || this.getDeliveryMethods(
        notificationData.priority,
        familyMember
      );

      const notification: FamilyNotification = {
        ...notificationData,
        id: notificationId,
        delivery: {
          methods: deliveryMethods,
          scheduledAt: new Date(),
          status: 'pending',
          attempts: 0
        },
        createdAt: new Date()
      };

      // Add to queue for processing
      this.notificationQueue.set(notificationId, notification);

      // Process immediately for urgent notifications
      if (notificationData.priority === 'urgent') {
        await this.processNotification(notification);
      }

      return notificationId;

    } catch (error) {
      console.error('Failed to create family notification:', error);
      return null;
    }
  }

  /**
   * Process notification delivery
   */
  private async processNotification(notification: FamilyNotification): Promise<void> {
    try {
      const familyMember = this.getFamilyMember(notification.patientId, notification.familyMemberId);
      if (!familyMember) {
        throw new Error('Family member not found');
      }

      notification.delivery.attempts++;
      notification.delivery.lastAttemptAt = new Date();

      let deliverySuccess = false;

      // Try each delivery method
      for (const method of notification.delivery.methods) {
        try {
          let result: any;

          switch (method) {
            case 'sms':
              result = await this.smsService.sendFamilyNotification(
                familyMember.phoneNumber,
                notification.content.title,
                notification.content.body,
                notification.culturalAdaptations.language
              );
              break;

            case 'voice':
              result = await this.voiceService.generateFamilyAlert(
                notification.content.title,
                notification.content.body,
                notification.culturalAdaptations.language,
                notification.priority === 'urgent'
              );
              break;

            case 'push':
              result = await this.culturalService.sendFamilyNotification(
                notification.content.title,
                notification.content.body,
                notification.culturalAdaptations.language,
                notification.culturalAdaptations.useHonorifics
              );
              break;

            default:
              continue;
          }

          if (result.success) {
            deliverySuccess = true;
            break; // Stop after first successful delivery
          }

        } catch (error) {
          console.error(`Failed to deliver via ${method}:`, error);
        }
      }

      // Update notification status
      notification.delivery.status = deliverySuccess ? 'delivered' : 'failed';
      if (deliverySuccess) {
        notification.delivery.deliveredAt = new Date();
      }

      // Move to history and remove from queue
      this.notificationHistory.set(notification.id, notification);
      this.notificationQueue.delete(notification.id);

      // Save updates
      await this.saveNotificationHistory();

    } catch (error) {
      console.error('Failed to process notification:', error);
      notification.delivery.status = 'failed';
      this.notificationHistory.set(notification.id, notification);
      this.notificationQueue.delete(notification.id);
    }
  }

  /**
   * Get delivery methods for notification
   */
  private getDeliveryMethods(
    priority: FamilyNotification['priority'],
    familyMember: FamilyMember
  ): ('push' | 'sms' | 'voice' | 'email')[] {
    switch (priority) {
      case 'urgent':
        return ['sms', 'voice', 'push'];
      case 'high':
        return ['sms', 'push'];
      case 'medium':
        return ['push', 'sms'];
      case 'low':
      default:
        return ['push'];
    }
  }

  /**
   * Generate localized titles and bodies for different notification types
   */
  private getMissedDoseTitle(language: SupportedLanguage, medicationName: string): string {
    const titles = {
      en: `Missed Dose Alert: ${medicationName}`,
      ms: `Amaran Dos Terlepas: ${medicationName}`,
      zh: `错过剂量警报：${medicationName}`,
      ta: `தவறவிட்ட அளவு எச்சரிக்கை: ${medicationName}`
    };
    return titles[language] || titles.en;
  }

  private getMissedDoseBody(
    language: SupportedLanguage,
    patientName: string,
    medicationName: string,
    dosage: string,
    missedTime: Date
  ): string {
    const bodies = {
      en: `${patientName} has missed their ${dosage} dose of ${medicationName} scheduled for ${missedTime.toLocaleTimeString()}. Please check on them.`,
      ms: `${patientName} telah terlepas dos ${dosage} ${medicationName} yang dijadualkan pada ${missedTime.toLocaleTimeString()}. Sila periksa keadaan mereka.`,
      zh: `${patientName} 错过了预定在 ${missedTime.toLocaleTimeString()} 的 ${medicationName} ${dosage} 剂量。请检查他们的情况。`,
      ta: `${patientName} ${missedTime.toLocaleTimeString()} க்கு திட்டமிடப்பட்ட ${medicationName} இன் ${dosage} அளவை தவறவிட்டார். அவர்களை சரிபார்க்கவும்.`
    };
    return bodies[language] || bodies.en;
  }

  private getEmergencyTitle(language: SupportedLanguage, emergencyType: string): string {
    const titles = {
      en: {
        missed_critical_medication: 'URGENT: Critical Medication Missed',
        no_response: 'URGENT: Patient Not Responding',
        medical_emergency: 'EMERGENCY: Medical Attention Required'
      },
      ms: {
        missed_critical_medication: 'PENTING: Ubat Kritikal Terlepas',
        no_response: 'PENTING: Pesakit Tidak Bertindak Balas',
        medical_emergency: 'KECEMASAN: Perhatian Perubatan Diperlukan'
      },
      zh: {
        missed_critical_medication: '紧急：错过关键药物',
        no_response: '紧急：患者无响应',
        medical_emergency: '紧急：需要医疗护理'
      },
      ta: {
        missed_critical_medication: 'அவசரம்: முக்கியமான மருந்து தவறவிட்டது',
        no_response: 'அவசரம்: நோயாளி பதிலளிக்கவில்லை',
        medical_emergency: 'அவசரம்: மருத்துவ கவனம் தேவை'
      }
    };

    return titles[language]?.[emergencyType as keyof typeof titles.en] || titles.en[emergencyType as keyof typeof titles.en] || 'Emergency Alert';
  }

  private getEmergencyBody(
    language: SupportedLanguage,
    patientName: string,
    emergencyType: string,
    context: any
  ): string {
    // Implementation would generate appropriate emergency message based on type and language
    const defaultMessage = `${patientName} requires immediate attention. Please contact them or emergency services if needed.`;
    return defaultMessage; // Simplified for now
  }

  private getDailySummaryTitle(language: SupportedLanguage): string {
    const titles = {
      en: 'Daily Medication Summary',
      ms: 'Ringkasan Ubat Harian',
      zh: '每日药物摘要',
      ta: 'தினசரி மருந்து சுருக்கம்'
    };
    return titles[language] || titles.en;
  }

  private getDailySummaryBody(language: SupportedLanguage, patientName: string, summaryData: any): string {
    // Implementation would generate daily summary based on data and language
    const defaultSummary = `Daily medication summary for ${patientName}`;
    return defaultSummary; // Simplified for now
  }

  private formatTimeWindow(time: Date, language: SupportedLanguage): string {
    return time.toLocaleString(language === 'ms' ? 'ms-MY' : language === 'zh' ? 'zh-CN' : 'en-US');
  }

  private async generateDailySummary(patientId: string): Promise<any> {
    // This would integrate with medication tracking service to generate actual summary
    return {
      medicationsTaken: 3,
      medicationsMissed: 1,
      onTimePercentage: 75,
      nextDose: new Date(Date.now() + 4 * 60 * 60 * 1000) // 4 hours from now
    };
  }

  private async sendWelcomeNotification(patientId: string, familyMember: FamilyMember): Promise<void> {
    await this.createFamilyNotification({
      patientId,
      familyMemberId: familyMember.id,
      type: 'general_update',
      priority: 'low',
      content: {
        title: 'Welcome to MediMate Family Circle',
        body: `You've been added as a family member for medication monitoring. You'll receive updates based on your preferences.`
      },
      culturalAdaptations: {
        language: familyMember.language,
        useHonorifics: familyMember.culturalPreferences.useHonorifics,
        includePatientDetails: familyMember.culturalPreferences.includePatientDetails,
        respectPrayerTimes: familyMember.culturalPreferences.respectPrayerTimes,
        formalTone: familyMember.culturalPreferences.formalCommunication
      }
    });
  }

  private getDefaultCoordinationSettings(): PatientFamilyCircle['coordinationSettings'] {
    return {
      autoNotifyFamily: true,
      escalationDelay: 15, // 15 minutes
      includeMedicationDetails: true,
      respectCulturalConstraints: true,
      emergencyNotificationMethod: 'both'
    };
  }

  /**
   * Background processors
   */
  private startNotificationProcessor(): void {
    setInterval(async () => {
      const pendingNotifications = Array.from(this.notificationQueue.values())
        .filter(n => n.delivery.status === 'pending');

      for (const notification of pendingNotifications) {
        if (notification.delivery.attempts < this.config.maxNotificationRetries) {
          await this.processNotification(notification);
        } else {
          // Mark as failed after max retries
          notification.delivery.status = 'failed';
          this.notificationHistory.set(notification.id, notification);
          this.notificationQueue.delete(notification.id);
        }
      }
    }, 60000); // Check every minute
  }

  private startDailySummaryScheduler(): void {
    setInterval(async () => {
      const now = new Date();
      const currentTime = now.toTimeString().substr(0, 5); // HH:MM format

      if (currentTime === this.config.dailySummaryTime) {
        // Send daily summaries to all patients
        for (const patientId of this.familyCircles.keys()) {
          await this.sendDailySummary(patientId);
        }
      }
    }, 60000); // Check every minute
  }

  private startWeeklyReportScheduler(): void {
    setInterval(async () => {
      const now = new Date();

      if (now.getDay() === this.config.weeklyReportDay && now.getHours() === 9) {
        // Send weekly reports on Sunday at 9 AM
        for (const patientId of this.familyCircles.keys()) {
          // Implementation would send weekly reports
          console.log(`Sending weekly report for patient ${patientId}`);
        }
      }
    }, 3600000); // Check every hour
  }

  /**
   * Storage methods
   */
  private async loadFamilyCircles(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('family_circles');
      if (stored) {
        const circlesData = JSON.parse(stored);
        this.familyCircles = new Map(Object.entries(circlesData).map(([key, value]: [string, any]) => [
          key,
          {
            ...value,
            lastUpdated: new Date(value.lastUpdated),
            familyMembers: value.familyMembers.map((member: any) => ({
              ...member,
              registeredAt: new Date(member.registeredAt),
              lastContactedAt: member.lastContactedAt ? new Date(member.lastContactedAt) : undefined
            }))
          }
        ]));
      }
    } catch (error) {
      console.error('Failed to load family circles:', error);
    }
  }

  private async saveFamilyCircles(): Promise<void> {
    try {
      const circlesData = Object.fromEntries(this.familyCircles.entries());
      await AsyncStorage.setItem('family_circles', JSON.stringify(circlesData));
    } catch (error) {
      console.error('Failed to save family circles:', error);
    }
  }

  private async loadNotificationHistory(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('family_notification_history');
      if (stored) {
        const historyData = JSON.parse(stored);
        this.notificationHistory = new Map(Object.entries(historyData).map(([key, value]: [string, any]) => [
          key,
          {
            ...value,
            createdAt: new Date(value.createdAt),
            delivery: {
              ...value.delivery,
              scheduledAt: new Date(value.delivery.scheduledAt),
              deliveredAt: value.delivery.deliveredAt ? new Date(value.delivery.deliveredAt) : undefined,
              lastAttemptAt: value.delivery.lastAttemptAt ? new Date(value.delivery.lastAttemptAt) : undefined
            }
          }
        ]));
      }
    } catch (error) {
      console.error('Failed to load notification history:', error);
    }
  }

  private async saveNotificationHistory(): Promise<void> {
    try {
      const historyData = Object.fromEntries(this.notificationHistory.entries());
      await AsyncStorage.setItem('family_notification_history', JSON.stringify(historyData));
    } catch (error) {
      console.error('Failed to save notification history:', error);
    }
  }

  // Public methods
  isServiceInitialized(): boolean {
    return this.isInitialized;
  }

  getAllFamilyCircles(): PatientFamilyCircle[] {
    return Array.from(this.familyCircles.values());
  }

  getNotificationHistory(patientId?: string, limit = 100): FamilyNotification[] {
    let notifications = Array.from(this.notificationHistory.values());

    if (patientId) {
      notifications = notifications.filter(n => n.patientId === patientId);
    }

    return notifications
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }
}

export default FamilyCoordinationService;