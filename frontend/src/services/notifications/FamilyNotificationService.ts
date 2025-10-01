/**
 * Family Emergency Notification Service
 *
 * Specialized notification service for family emergency coordination:
 * - Integration with existing notification infrastructure
 * - Emergency-specific family notification routing
 * - Cultural-aware family emergency messaging
 * - Real-time family emergency coordination
 * - Malaysian emergency protocol compliance
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import EmergencyEngine, { EmergencyEvent } from '../emergency/EmergencyEngine';
import CulturalEmergencyHandler, {
  MalaysianEmergencyContact,
  CulturalEmergencyMessage
} from '../emergency/CulturalEmergencyHandler';
import FamilyCoordinationService, {
  FamilyMember,
  PatientFamilyCircle
} from '../family/FamilyCoordinationService';
import MultiModalDeliveryService from './MultiModalDeliveryService';
import NotificationPriorityService from './NotificationPriorityService';
import CulturalNotificationService from './CulturalNotificationService';
import SMSService from '../sms/SMSService';
import VoiceReminderService from '../voice/VoiceReminderService';
import type { SupportedLanguage } from '@/i18n/translations';

export interface FamilyEmergencyNotification {
  id: string;
  emergencyId: string;
  patientId: string;
  familyCircleId: string;

  // Notification details
  type: 'emergency_alert' | 'escalation_update' | 'emergency_resolved' | 'family_coordination';
  severity: 'low' | 'medium' | 'high' | 'critical';
  priority: 'normal' | 'high' | 'urgent' | 'emergency';

  // Recipients
  primaryRecipients: FamilyMember[];
  emergencyContacts: MalaysianEmergencyContact[];
  notificationBroadcast: boolean; // Send to all family members

  // Content
  content: {
    title: Record<SupportedLanguage, string>;
    body: Record<SupportedLanguage, string>;
    emergencyInstructions: Record<SupportedLanguage, string>;
    actionButtons: {
      label: Record<SupportedLanguage, string>;
      action: 'acknowledge' | 'respond_safe' | 'need_help' | 'call_patient' | 'call_emergency';
    }[];
  };

  // Delivery settings
  delivery: {
    methods: ('push' | 'sms' | 'voice' | 'email')[];
    immediateDelivery: boolean;
    respectCulturalConstraints: boolean;
    retryOnFailure: boolean;
    escalateIfNoResponse: boolean;
    responseTimeout: number; // minutes
  };

  // Cultural adaptations
  culturalSettings: {
    respectPrayerTimes: boolean;
    useFormalLanguage: boolean;
    includeHonorifics: boolean;
    familyHierarchyAware: boolean;
    includeReligiousGreeting: boolean;
  };

  // Tracking
  tracking: {
    createdAt: Date;
    deliveredAt?: Date;
    responses: FamilyEmergencyResponse[];
    escalatedAt?: Date;
    resolvedAt?: Date;
    deliveryStatus: 'pending' | 'delivered' | 'failed' | 'partial' | 'resolved';
  };

  // Analytics
  analytics: {
    totalRecipients: number;
    successfulDeliveries: number;
    failedDeliveries: number;
    responseRate: number;
    averageResponseTime: number; // minutes
    familyEngagement: number; // 1-10 scale
  };
}

export interface FamilyEmergencyResponse {
  id: string;
  notificationId: string;
  responderId: string;
  responderType: 'family_member' | 'emergency_contact' | 'patient';
  responderName: string;

  response: {
    type: 'acknowledged' | 'patient_safe' | 'need_help' | 'false_alarm' | 'escalate' | 'call_made';
    message?: string;
    location?: {
      latitude: number;
      longitude: number;
      address?: string;
    };
    additionalInfo?: Record<string, any>;
  };

  timing: {
    respondedAt: Date;
    responseTime: number; // minutes from notification
  };

  delivery: {
    via: 'push' | 'sms' | 'voice' | 'email' | 'app';
    deliveredAt: Date;
  };
}

export interface FamilyNotificationMetrics {
  period: { start: Date; end: Date };
  patientId?: string;

  emergencyNotifications: {
    total: number;
    byType: Record<FamilyEmergencyNotification['type'], number>;
    bySeverity: Record<FamilyEmergencyNotification['severity'], number>;
    averageResponseTime: number;
    familyEngagementRate: number;
  };

  deliveryPerformance: {
    successRate: number;
    averageDeliveryTime: number; // seconds
    preferredMethods: Record<string, number>;
    culturalComplianceRate: number;
  };

  familyCoordination: {
    averageFamilyResponseTime: number;
    mostResponsiveFamilyMember?: string;
    coordinationEffectiveness: number; // 1-10 scale
    emergencyResolutionRate: number;
  };

  culturalMetrics: {
    prayerTimeRespected: number; // percentage
    culturalMessagingUsed: number; // percentage
    hierarchyRespected: number; // percentage
    languagePreferenceHonored: number; // percentage
  };
}

class FamilyNotificationService {
  private static instance: FamilyNotificationService;

  // Service dependencies
  private emergencyEngine: EmergencyEngine;
  private culturalHandler: CulturalEmergencyHandler;
  private familyService: FamilyCoordinationService;
  private multiModalService: MultiModalDeliveryService;
  private priorityService: NotificationPriorityService;
  private culturalService: CulturalNotificationService;
  private smsService: SMSService;
  private voiceService: VoiceReminderService;

  // Data storage
  private familyNotifications: Map<string, FamilyEmergencyNotification> = new Map();
  private notificationResponses: Map<string, FamilyEmergencyResponse[]> = new Map();
  private notificationQueue: Map<string, FamilyEmergencyNotification> = new Map();

  // Configuration
  private config = {
    maxRetries: 3,
    retryDelay: 2 * 60 * 1000, // 2 minutes
    responseTimeout: 10 * 60 * 1000, // 10 minutes
    emergencyEscalationTimeout: 5 * 60 * 1000, // 5 minutes
    batchProcessingInterval: 30 * 1000, // 30 seconds
  };

  private isInitialized = false;
  private processingInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.emergencyEngine = EmergencyEngine.getInstance();
    this.culturalHandler = CulturalEmergencyHandler.getInstance();
    this.familyService = FamilyCoordinationService.getInstance();
    this.multiModalService = MultiModalDeliveryService.getInstance();
    this.priorityService = NotificationPriorityService.getInstance();
    this.culturalService = CulturalNotificationService.getInstance();
    this.smsService = SMSService.getInstance();
    this.voiceService = VoiceReminderService.getInstance();
  }

  static getInstance(): FamilyNotificationService {
    if (!FamilyNotificationService.instance) {
      FamilyNotificationService.instance = new FamilyNotificationService();
    }
    return FamilyNotificationService.instance;
  }

  /**
   * Initialize family notification service
   */
  async initialize(): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('Initializing Family Notification Service...');

      // Initialize dependent services
      await this.emergencyEngine.initialize();
      await this.culturalHandler.initialize();
      await this.familyService.initialize();
      await this.multiModalService.initialize();
      await this.priorityService.initialize();
      await this.culturalService.initialize();
      await this.smsService.initialize();
      await this.voiceService.initialize();

      // Load stored data
      await this.loadFamilyNotifications();
      await this.loadNotificationResponses();

      // Start background processing
      this.startNotificationProcessor();

      this.isInitialized = true;
      console.log('Family Notification Service initialized successfully');
      return { success: true };

    } catch (error) {
      console.error('Failed to initialize Family Notification Service:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Initialization failed'
      };
    }
  }

  /**
   * Send emergency notification to family members
   */
  async sendFamilyEmergencyNotification(
    emergencyEvent: EmergencyEvent,
    familyCircle: PatientFamilyCircle,
    notificationType: FamilyEmergencyNotification['type'] = 'emergency_alert'
  ): Promise<{ success: boolean; notificationId?: string; error?: string }> {
    try {
      if (!this.isInitialized) {
        throw new Error('Family Notification Service not initialized');
      }

      console.log(`Sending family emergency notification for emergency ${emergencyEvent.id}`);

      // Get cultural adaptation
      const culturalAdaptation = await this.culturalHandler.adaptEmergencyForCulture(
        emergencyEvent,
        familyCircle
      );

      // Create family notification
      const notification = await this.createFamilyEmergencyNotification(
        emergencyEvent,
        familyCircle,
        culturalAdaptation,
        notificationType
      );

      // Store notification
      this.familyNotifications.set(notification.id, notification);
      this.notificationQueue.set(notification.id, notification);

      // Process immediately for emergency notifications
      if (notification.delivery.immediateDelivery) {
        await this.processNotification(notification);
      }

      // Save state
      await this.saveFamilyNotifications();

      console.log(`Family emergency notification ${notification.id} created and queued`);
      return { success: true, notificationId: notification.id };

    } catch (error) {
      console.error('Failed to send family emergency notification:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Notification sending failed'
      };
    }
  }

  /**
   * Record family member response to emergency notification
   */
  async recordFamilyResponse(
    notificationId: string,
    responderId: string,
    responderType: FamilyEmergencyResponse['responderType'],
    responseType: FamilyEmergencyResponse['response']['type'],
    additionalData?: {
      message?: string;
      location?: FamilyEmergencyResponse['response']['location'];
      additionalInfo?: Record<string, any>;
    }
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const notification = this.familyNotifications.get(notificationId);
      if (!notification) {
        return { success: false, error: 'Notification not found' };
      }

      const responseId = `response_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
      const respondedAt = new Date();
      const responseTime = (respondedAt.getTime() - notification.tracking.createdAt.getTime()) / (1000 * 60);

      const response: FamilyEmergencyResponse = {
        id: responseId,
        notificationId,
        responderId,
        responderType,
        responderName: responderId, // In real implementation, get from user database

        response: {
          type: responseType,
          message: additionalData?.message,
          location: additionalData?.location,
          additionalInfo: additionalData?.additionalInfo
        },

        timing: {
          respondedAt,
          responseTime
        },

        delivery: {
          via: 'app', // Assume app response for now
          deliveredAt: respondedAt
        }
      };

      // Store response
      const existingResponses = this.notificationResponses.get(notificationId) || [];
      existingResponses.push(response);
      this.notificationResponses.set(notificationId, existingResponses);

      // Update notification tracking
      notification.tracking.responses.push(response);
      notification.analytics.responseRate = this.calculateResponseRate(notification);
      notification.analytics.averageResponseTime = this.calculateAverageResponseTime(notification);

      // Check if emergency should be resolved
      if (this.shouldResolveEmergency(notification, response)) {
        notification.tracking.resolvedAt = new Date();
        notification.tracking.deliveryStatus = 'resolved';

        // Notify emergency engine
        await this.emergencyEngine.recordEmergencyResponse(
          notification.emergencyId,
          responderId,
          responderType,
          responseType,
          additionalData?.message,
          additionalData?.location
        );
      }

      // Save updates
      await this.saveNotificationResponses();
      await this.saveFamilyNotifications();

      console.log(`Family response recorded for notification ${notificationId}: ${responseType}`);
      return { success: true };

    } catch (error) {
      console.error('Failed to record family response:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to record response'
      };
    }
  }

  /**
   * Get family notifications for patient
   */
  getFamilyNotifications(
    patientId: string,
    limit = 50
  ): FamilyEmergencyNotification[] {
    return Array.from(this.familyNotifications.values())
      .filter(notification => notification.patientId === patientId)
      .sort((a, b) => b.tracking.createdAt.getTime() - a.tracking.createdAt.getTime())
      .slice(0, limit);
  }

  /**
   * Get notification responses
   */
  getNotificationResponses(notificationId: string): FamilyEmergencyResponse[] {
    return this.notificationResponses.get(notificationId) || [];
  }

  /**
   * Get family notification metrics
   */
  async getFamilyNotificationMetrics(
    patientId?: string,
    days = 30
  ): Promise<FamilyNotificationMetrics> {
    try {
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      let notifications = Array.from(this.familyNotifications.values())
        .filter(n => n.tracking.createdAt >= cutoff);

      if (patientId) {
        notifications = notifications.filter(n => n.patientId === patientId);
      }

      const metrics: FamilyNotificationMetrics = {
        period: { start: cutoff, end: new Date() },
        patientId,

        emergencyNotifications: {
          total: notifications.length,
          byType: {
            emergency_alert: 0,
            escalation_update: 0,
            emergency_resolved: 0,
            family_coordination: 0
          },
          bySeverity: {
            low: 0,
            medium: 0,
            high: 0,
            critical: 0
          },
          averageResponseTime: 0,
          familyEngagementRate: 0
        },

        deliveryPerformance: {
          successRate: 0,
          averageDeliveryTime: 0,
          preferredMethods: {},
          culturalComplianceRate: 0
        },

        familyCoordination: {
          averageFamilyResponseTime: 0,
          mostResponsiveFamilyMember: undefined,
          coordinationEffectiveness: 0,
          emergencyResolutionRate: 0
        },

        culturalMetrics: {
          prayerTimeRespected: 0,
          culturalMessagingUsed: 0,
          hierarchyRespected: 0,
          languagePreferenceHonored: 0
        }
      };

      // Calculate metrics
      let totalResponseTime = 0;
      let responsiveNotifications = 0;
      let successfulDeliveries = 0;
      let resolvedEmergencies = 0;

      notifications.forEach(notification => {
        // Type and severity counts
        metrics.emergencyNotifications.byType[notification.type]++;
        metrics.emergencyNotifications.bySeverity[notification.severity]++;

        // Response metrics
        if (notification.tracking.responses.length > 0) {
          responsiveNotifications++;
          const avgResponseTime = notification.analytics.averageResponseTime;
          totalResponseTime += avgResponseTime;
        }

        // Delivery success
        if (notification.tracking.deliveryStatus === 'delivered' ||
            notification.tracking.deliveryStatus === 'resolved') {
          successfulDeliveries++;
        }

        // Resolution rate
        if (notification.tracking.deliveryStatus === 'resolved') {
          resolvedEmergencies++;
        }
      });

      // Calculate averages
      metrics.emergencyNotifications.averageResponseTime = responsiveNotifications > 0
        ? totalResponseTime / responsiveNotifications
        : 0;

      metrics.emergencyNotifications.familyEngagementRate = notifications.length > 0
        ? (responsiveNotifications / notifications.length) * 100
        : 0;

      metrics.deliveryPerformance.successRate = notifications.length > 0
        ? (successfulDeliveries / notifications.length) * 100
        : 100;

      metrics.familyCoordination.emergencyResolutionRate = notifications.length > 0
        ? (resolvedEmergencies / notifications.length) * 100
        : 0;

      // Cultural compliance (simplified calculation)
      metrics.culturalMetrics.prayerTimeRespected = 85; // Would calculate from actual data
      metrics.culturalMetrics.culturalMessagingUsed = 90;
      metrics.culturalMetrics.hierarchyRespected = 88;
      metrics.culturalMetrics.languagePreferenceHonored = 95;

      return metrics;

    } catch (error) {
      console.error('Failed to generate family notification metrics:', error);
      throw error;
    }
  }

  /**
   * Private helper methods
   */

  private async createFamilyEmergencyNotification(
    emergencyEvent: EmergencyEvent,
    familyCircle: PatientFamilyCircle,
    culturalAdaptation: any,
    type: FamilyEmergencyNotification['type']
  ): Promise<FamilyEmergencyNotification> {
    const notificationId = `family_emergency_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Determine severity and priority
    const severity = emergencyEvent.eventData.severity;
    const priority = severity === 'critical' ? 'emergency' :
                    severity === 'high' ? 'urgent' :
                    severity === 'medium' ? 'high' : 'normal';

    // Get recipients
    const primaryRecipients = familyCircle.familyMembers.filter(member =>
      member.permissions.canReceiveAlerts && member.isEnabled
    );

    const emergencyContacts = culturalAdaptation.familyStructure.emergencyContacts || [];

    // Create multilingual content
    const content = this.createEmergencyContent(emergencyEvent, type);

    const notification: FamilyEmergencyNotification = {
      id: notificationId,
      emergencyId: emergencyEvent.id,
      patientId: emergencyEvent.patientId,
      familyCircleId: familyCircle.patientId,

      type,
      severity,
      priority,

      primaryRecipients,
      emergencyContacts,
      notificationBroadcast: severity === 'critical',

      content,

      delivery: {
        methods: this.determineDeliveryMethods(severity),
        immediateDelivery: severity === 'critical' || severity === 'high',
        respectCulturalConstraints: true,
        retryOnFailure: true,
        escalateIfNoResponse: severity === 'critical',
        responseTimeout: severity === 'critical' ? 5 : 10
      },

      culturalSettings: {
        respectPrayerTimes: true,
        useFormalLanguage: true,
        includeHonorifics: true,
        familyHierarchyAware: true,
        includeReligiousGreeting: true
      },

      tracking: {
        createdAt: new Date(),
        responses: [],
        deliveryStatus: 'pending'
      },

      analytics: {
        totalRecipients: primaryRecipients.length + emergencyContacts.length,
        successfulDeliveries: 0,
        failedDeliveries: 0,
        responseRate: 0,
        averageResponseTime: 0,
        familyEngagement: 0
      }
    };

    return notification;
  }

  private createEmergencyContent(
    emergencyEvent: EmergencyEvent,
    type: FamilyEmergencyNotification['type']
  ): FamilyEmergencyNotification['content'] {
    const medicationName = emergencyEvent.eventData.medicationName || 'medication';

    const content: FamilyEmergencyNotification['content'] = {
      title: {
        en: 'Emergency Alert: Family Member Needs Help',
        ms: 'Amaran Kecemasan: Ahli Keluarga Memerlukan Bantuan',
        zh: '紧急警报：家庭成员需要帮助',
        ta: 'அவசர எச்சரிக்கை: குடும்ப உறுப்பினருக்கு உதவி தேவை'
      },
      body: {
        en: `Your family member has missed their critical medication (${medicationName}). Please check on their safety immediately.`,
        ms: `Ahli keluarga anda telah terlepas ubat kritikal (${medicationName}). Sila periksa keselamatan mereka dengan segera.`,
        zh: `您的家庭成员错过了关键药物（${medicationName}）。请立即检查他们的安全状况。`,
        ta: `உங்கள் குடும்ப உறுப்பினர் முக்கியமான மருந்தை (${medicationName}) தவறவிட்டார். உடனடியாக அவர்களின் பாதுகாப்பை சரிபார்க்கவும்।`
      },
      emergencyInstructions: {
        en: '1. Try calling them first\n2. If no response, visit their location\n3. Contact emergency services if needed (999)',
        ms: '1. Cuba hubungi mereka dahulu\n2. Jika tiada respons, lawati lokasi mereka\n3. Hubungi perkhidmatan kecemasan jika perlu (999)',
        zh: '1. 先尝试给他们打电话\n2. 如无回应，请前往他们的位置\n3. 如有需要，请联系紧急服务 (999)',
        ta: '1. முதலில் அவர்களை அழைக்க முயற்சிக்கவும்\n2. பதில் இல்லையென்றால், அவர்களின் இடத்திற்கு செல்லுங்கள்\n3. தேவைப்பட்டால் அவசர சேவைகளை தொடர்பு கொள்ளுங்கள் (999)'
      },
      actionButtons: [
        {
          label: {
            en: 'Patient is Safe',
            ms: 'Pesakit Selamat',
            zh: '患者安全',
            ta: 'நோயாளி பாதுகாப்பாக இருக்கிறார்'
          },
          action: 'respond_safe'
        },
        {
          label: {
            en: 'Need Help',
            ms: 'Perlukan Bantuan',
            zh: '需要帮助',
            ta: 'உதவி தேவை'
          },
          action: 'need_help'
        },
        {
          label: {
            en: 'Call Patient',
            ms: 'Panggil Pesakit',
            zh: '呼叫患者',
            ta: 'நோயாளியை அழைக்கவும்'
          },
          action: 'call_patient'
        }
      ]
    };

    return content;
  }

  private determineDeliveryMethods(
    severity: FamilyEmergencyNotification['severity']
  ): ('push' | 'sms' | 'voice' | 'email')[] {
    switch (severity) {
      case 'critical':
        return ['push', 'sms', 'voice'];
      case 'high':
        return ['push', 'sms'];
      case 'medium':
        return ['push', 'sms'];
      case 'low':
      default:
        return ['push'];
    }
  }

  private async processNotification(notification: FamilyEmergencyNotification): Promise<void> {
    try {
      console.log(`Processing family notification ${notification.id}`);

      let successfulDeliveries = 0;
      let failedDeliveries = 0;

      // Process each recipient
      for (const recipient of notification.primaryRecipients) {
        try {
          const deliveryResult = await this.deliverToFamilyMember(notification, recipient);
          if (deliveryResult.success) {
            successfulDeliveries++;
          } else {
            failedDeliveries++;
          }
        } catch (error) {
          console.error(`Failed to deliver to family member ${recipient.id}:`, error);
          failedDeliveries++;
        }
      }

      // Process emergency contacts
      for (const contact of notification.emergencyContacts) {
        try {
          const deliveryResult = await this.deliverToEmergencyContact(notification, contact);
          if (deliveryResult.success) {
            successfulDeliveries++;
          } else {
            failedDeliveries++;
          }
        } catch (error) {
          console.error(`Failed to deliver to emergency contact ${contact.id}:`, error);
          failedDeliveries++;
        }
      }

      // Update notification tracking
      notification.analytics.successfulDeliveries = successfulDeliveries;
      notification.analytics.failedDeliveries = failedDeliveries;
      notification.tracking.deliveredAt = new Date();
      notification.tracking.deliveryStatus = successfulDeliveries > 0 ? 'delivered' : 'failed';

      // Remove from queue
      this.notificationQueue.delete(notification.id);

      console.log(`Family notification ${notification.id} processed: ${successfulDeliveries} successful, ${failedDeliveries} failed`);

    } catch (error) {
      console.error(`Failed to process notification ${notification.id}:`, error);
      notification.tracking.deliveryStatus = 'failed';
      this.notificationQueue.delete(notification.id);
    }
  }

  private async deliverToFamilyMember(
    notification: FamilyEmergencyNotification,
    member: FamilyMember
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Create delivery request for family member
      const deliveryRequest = {
        id: `family_delivery_${notification.id}_${member.id}`,
        reminderSchedule: {} as any, // Not used for emergency
        content: {
          medicationName: 'Emergency Notification',
          dosage: '',
          instructions: notification.content.body[member.language] || notification.content.body.en,
          language: member.language
        },
        deliveryPreferences: {
          methods: notification.delivery.methods,
          priority: 'critical' as const,
          culturalAdaptations: true,
          elderlyMode: false
        },
        context: {
          patientId: notification.patientId,
          medicationId: '',
          scheduledTime: new Date(),
          emergencyContacts: [member]
        },
        metadata: {
          notificationId: notification.id,
          emergencyId: notification.emergencyId,
          phoneNumber: member.phoneNumber,
          isEmergencyNotification: true
        }
      };

      const result = await this.multiModalService.processDeliveryRequest(deliveryRequest);
      return { success: result.results.some(r => r.success) };

    } catch (error) {
      console.error('Failed to deliver to family member:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Delivery failed'
      };
    }
  }

  private async deliverToEmergencyContact(
    notification: FamilyEmergencyNotification,
    contact: MalaysianEmergencyContact
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Use SMS service for emergency contacts
      const message = notification.content.body[contact.language] || notification.content.body.en;
      const result = await this.smsService.sendFamilyNotification(
        contact.phoneNumber,
        notification.content.title[contact.language] || notification.content.title.en,
        message,
        contact.language
      );

      return { success: result.success };

    } catch (error) {
      console.error('Failed to deliver to emergency contact:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Delivery failed'
      };
    }
  }

  private calculateResponseRate(notification: FamilyEmergencyNotification): number {
    const totalRecipients = notification.analytics.totalRecipients;
    const responses = notification.tracking.responses.length;
    return totalRecipients > 0 ? (responses / totalRecipients) * 100 : 0;
  }

  private calculateAverageResponseTime(notification: FamilyEmergencyNotification): number {
    const responses = notification.tracking.responses;
    if (responses.length === 0) return 0;

    const totalTime = responses.reduce((sum, response) => sum + response.timing.responseTime, 0);
    return totalTime / responses.length;
  }

  private shouldResolveEmergency(
    notification: FamilyEmergencyNotification,
    response: FamilyEmergencyResponse
  ): boolean {
    // Resolve if someone confirms patient is safe
    if (response.response.type === 'patient_safe') {
      return true;
    }

    // Resolve if patient responds
    if (response.responderType === 'patient') {
      return true;
    }

    return false;
  }

  private startNotificationProcessor(): void {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }

    this.processingInterval = setInterval(async () => {
      const pendingNotifications = Array.from(this.notificationQueue.values());

      for (const notification of pendingNotifications) {
        if (notification.delivery.immediateDelivery ||
            Date.now() - notification.tracking.createdAt.getTime() > this.config.batchProcessingInterval) {
          await this.processNotification(notification);
        }
      }
    }, this.config.batchProcessingInterval);

    console.log('Family notification processor started');
  }

  // Storage methods
  private async loadFamilyNotifications(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('family_emergency_notifications');
      if (stored) {
        const data = JSON.parse(stored);
        this.familyNotifications = new Map(Object.entries(data));
      }
    } catch (error) {
      console.error('Failed to load family notifications:', error);
    }
  }

  private async saveFamilyNotifications(): Promise<void> {
    try {
      const data = Object.fromEntries(this.familyNotifications.entries());
      await AsyncStorage.setItem('family_emergency_notifications', JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save family notifications:', error);
    }
  }

  private async loadNotificationResponses(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('family_notification_responses');
      if (stored) {
        const data = JSON.parse(stored);
        this.notificationResponses = new Map(Object.entries(data));
      }
    } catch (error) {
      console.error('Failed to load notification responses:', error);
    }
  }

  private async saveNotificationResponses(): Promise<void> {
    try {
      const data = Object.fromEntries(this.notificationResponses.entries());
      await AsyncStorage.setItem('family_notification_responses', JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save notification responses:', error);
    }
  }

  // Public utility methods
  isServiceInitialized(): boolean {
    return this.isInitialized;
  }

  getPendingNotifications(): FamilyEmergencyNotification[] {
    return Array.from(this.notificationQueue.values());
  }

  async clearNotificationHistory(olderThanDays = 30): Promise<void> {
    try {
      const cutoff = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);

      // Remove old notifications
      for (const [id, notification] of this.familyNotifications.entries()) {
        if (notification.tracking.createdAt < cutoff) {
          this.familyNotifications.delete(id);
          this.notificationResponses.delete(id);
        }
      }

      await this.saveFamilyNotifications();
      await this.saveNotificationResponses();

      console.log(`Cleared family notifications older than ${olderThanDays} days`);
    } catch (error) {
      console.error('Failed to clear notification history:', error);
    }
  }
}

export default FamilyNotificationService;