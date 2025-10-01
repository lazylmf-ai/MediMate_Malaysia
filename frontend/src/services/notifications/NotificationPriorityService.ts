/**
 * Notification Priority Service
 * 
 * Manages notification priorities and emergency escalation with:
 * - Priority-based delivery scheduling
 * - Emergency escalation workflows
 * - Multi-modal delivery coordination
 * - Family notification systems
 * - Cultural sensitivity in escalation
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import SMSService from '../sms/SMSService';
import VoiceReminderService from '../voice/VoiceReminderService';
import CulturalNotificationService from './CulturalNotificationService';
import type { SupportedLanguage } from '@/i18n/translations';

export interface NotificationPriority {
  level: 'low' | 'medium' | 'high' | 'critical';
  weight: number; // 1-10, higher = more urgent
  deliveryMethods: DeliveryMethod[];
  retryPolicy: RetryPolicy;
  escalationRules: EscalationRule[];
  culturalAdaptations: CulturalAdaptation[];
}

export interface DeliveryMethod {
  type: 'push' | 'sms' | 'voice' | 'visual' | 'email';
  enabled: boolean;
  delay: number; // milliseconds
  maxRetries: number;
  failoverTo?: DeliveryMethod['type'][];
  culturalPreferences?: Record<SupportedLanguage, {
    enabled: boolean;
    customization?: any;
  }>;
}

export interface RetryPolicy {
  maxAttempts: number;
  baseDelay: number; // milliseconds
  backoffMultiplier: number;
  maxDelay: number; // milliseconds
  escalateAfter: number; // failed attempts before escalation
}

export interface EscalationRule {
  id: string;
  triggerCondition: EscalationTrigger;
  actions: EscalationAction[];
  culturalConsiderations: {
    respectPrayerTimes?: boolean;
    notifyFamilyFirst?: boolean;
    useRespectfulLanguage?: boolean;
    adaptForElderly?: boolean;
  };
  enabled: boolean;
}

export interface EscalationTrigger {
  type: 'missed_doses' | 'failed_deliveries' | 'no_response' | 'time_based' | 'manual';
  threshold: number;
  timeWindow: number; // milliseconds
  conditions?: {
    medicationType?: string[];
    priorityLevel?: NotificationPriority['level'][];
    patientProfile?: 'elderly' | 'chronic' | 'critical' | 'family_dependent';
  };
}

export interface EscalationAction {
  id: string;
  type: 'notify_family' | 'notify_doctor' | 'emergency_services' | 'increase_priority' | 'change_delivery_method';
  delay: number; // milliseconds before execution
  recipients?: EmergencyContact[];
  deliveryMethods?: DeliveryMethod['type'][];
  message?: EscalationMessage;
  culturalAdaptations?: CulturalAdaptation[];
}

export interface EmergencyContact {
  id: string;
  name: string;
  relationship: 'spouse' | 'child' | 'parent' | 'sibling' | 'caregiver' | 'doctor' | 'emergency';
  phoneNumber: string;
  email?: string;
  language: SupportedLanguage;
  culturalPreferences: {
    preferredContactTime?: 'morning' | 'afternoon' | 'evening';
    respectPrayerTimes?: boolean;
    useHonorifics?: boolean;
    includePatientDetails?: boolean;
  };
  priority: number; // 1-10, higher = contact first
  enabled: boolean;
}

export interface EscalationMessage {
  templates: Record<SupportedLanguage, {
    title: string;
    body: string;
    urgencyLevel: string;
  }>;
  includePatientInfo: boolean;
  includeMedicationDetails: boolean;
  includeLocationInfo: boolean;
  includeTimelineInfo: boolean;
}

export interface CulturalAdaptation {
  language: SupportedLanguage;
  adaptations: {
    messageStyle?: 'formal' | 'respectful' | 'urgent' | 'caring';
    includeHonorifics?: boolean;
    includeBlessings?: boolean;
    useFamilyContext?: boolean;
    respectReligiousPractices?: boolean;
  };
}

export interface PriorityEscalationRecord {
  id: string;
  originalNotificationId: string;
  patientId: string;
  medicationId: string;
  triggerType: EscalationTrigger['type'];
  triggerTime: Date;
  escalationLevel: number;
  actionsExecuted: {
    action: EscalationAction;
    executedAt: Date;
    result: 'success' | 'failed' | 'pending';
    deliveryResults?: any[];
  }[];
  currentStatus: 'active' | 'resolved' | 'cancelled';
  resolvedAt?: Date;
  resolvedBy?: 'patient' | 'family' | 'doctor' | 'system';
}

export interface PrioritySystemConfig {
  priorities: Record<NotificationPriority['level'], NotificationPriority>;
  defaultEscalationRules: EscalationRule[];
  emergencyContacts: EmergencyContact[];
  globalSettings: {
    enableEscalation: boolean;
    respectCulturalConstraints: boolean;
    maxEscalationLevel: number;
    escalationCooldownPeriod: number; // milliseconds
  };
}

class NotificationPriorityService {
  private static instance: NotificationPriorityService;
  private config: PrioritySystemConfig;
  private activeEscalations: Map<string, PriorityEscalationRecord> = new Map();
  private smsService: SMSService;
  private voiceService: VoiceReminderService;
  private culturalService: CulturalNotificationService;
  private isInitialized = false;

  private constructor() {
    this.config = this.getDefaultConfig();
    this.smsService = SMSService.getInstance();
    this.voiceService = VoiceReminderService.getInstance();
    this.culturalService = CulturalNotificationService.getInstance();
  }

  static getInstance(): NotificationPriorityService {
    if (!NotificationPriorityService.instance) {
      NotificationPriorityService.instance = new NotificationPriorityService();
    }
    return NotificationPriorityService.instance;
  }

  /**
   * Initialize priority service
   */
  async initialize(config?: Partial<PrioritySystemConfig>): Promise<{ success: boolean; error?: string }> {
    try {
      // Load saved configuration
      const savedConfig = await this.loadConfiguration();
      this.config = { ...this.config, ...savedConfig, ...config };

      // Load active escalations
      await this.loadActiveEscalations();

      // Initialize dependent services
      await this.smsService.initialize();
      await this.voiceService.initialize();
      await this.culturalService.initialize();

      // Start escalation monitor
      this.startEscalationMonitor();

      this.isInitialized = true;
      console.log('Notification Priority Service initialized successfully');
      return { success: true };

    } catch (error) {
      console.error('Failed to initialize priority service:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Initialization failed' 
      };
    }
  }

  /**
   * Process notification with priority-based delivery
   */
  async processNotification(
    notificationId: string,
    medicationId: string,
    patientId: string,
    priority: NotificationPriority['level'],
    content: {
      title: string;
      body: string;
      language: SupportedLanguage;
    },
    metadata?: Record<string, any>
  ): Promise<{ success: boolean; deliveryResults?: any[]; error?: string }> {
    try {
      if (!this.isInitialized) {
        throw new Error('Priority service not initialized');
      }

      const priorityConfig = this.config.priorities[priority];
      const deliveryResults: any[] = [];

      console.log(`Processing ${priority} priority notification for medication ${medicationId}`);

      // Execute delivery methods in priority order
      for (const deliveryMethod of priorityConfig.deliveryMethods) {
        if (!deliveryMethod.enabled) continue;

        // Wait for delivery delay
        if (deliveryMethod.delay > 0) {
          await this.delay(deliveryMethod.delay);
        }

        try {
          let result: any;

          switch (deliveryMethod.type) {
            case 'push':
              result = await this.deliverPushNotification(notificationId, content, priority, metadata);
              break;
            case 'sms':
              result = await this.deliverSMSNotification(notificationId, content, patientId, metadata);
              break;
            case 'voice':
              result = await this.deliverVoiceNotification(notificationId, content, metadata);
              break;
            case 'visual':
              result = await this.deliverVisualNotification(notificationId, content, priority, metadata);
              break;
            default:
              console.warn(`Unsupported delivery method: ${deliveryMethod.type}`);
              continue;
          }

          deliveryResults.push({
            method: deliveryMethod.type,
            result,
            timestamp: new Date()
          });

          // Track delivery for escalation monitoring
          await this.trackDeliveryAttempt(notificationId, medicationId, patientId, deliveryMethod.type, result);

        } catch (error) {
          console.error(`Failed to deliver via ${deliveryMethod.type}:`, error);
          
          deliveryResults.push({
            method: deliveryMethod.type,
            result: { success: false, error: error instanceof Error ? error.message : 'Delivery failed' },
            timestamp: new Date()
          });

          // Attempt failover if configured
          if (deliveryMethod.failoverTo) {
            for (const failoverMethod of deliveryMethod.failoverTo) {
              try {
                const failoverResult = await this.executeFailoverDelivery(
                  notificationId, content, failoverMethod, metadata
                );
                deliveryResults.push({
                  method: `${deliveryMethod.type}_failover_${failoverMethod}`,
                  result: failoverResult,
                  timestamp: new Date()
                });
                break; // Stop after first successful failover
              } catch (failoverError) {
                console.error(`Failover to ${failoverMethod} also failed:`, failoverError);
              }
            }
          }
        }
      }

      // Check if escalation should be triggered
      await this.evaluateEscalationTriggers(notificationId, medicationId, patientId, deliveryResults);

      const hasSuccess = deliveryResults.some(r => r.result.success);
      return {
        success: hasSuccess,
        deliveryResults,
        error: hasSuccess ? undefined : 'All delivery methods failed'
      };

    } catch (error) {
      console.error('Failed to process priority notification:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Processing failed'
      };
    }
  }

  /**
   * Trigger emergency escalation
   */
  async triggerEmergencyEscalation(
    patientId: string,
    medicationId: string,
    triggerType: EscalationTrigger['type'],
    context: {
      patientName: string;
      medicationName: string;
      language: SupportedLanguage;
      missedDoses?: number;
      lastTaken?: Date;
      additionalInfo?: string;
    }
  ): Promise<{ success: boolean; escalationId?: string; error?: string }> {
    try {
      // Find applicable escalation rules
      const applicableRules = this.config.defaultEscalationRules.filter(rule => 
        rule.enabled && rule.triggerCondition.type === triggerType
      );

      if (applicableRules.length === 0) {
        return { success: false, error: 'No applicable escalation rules found' };
      }

      const escalationId = `esc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const escalationRecord: PriorityEscalationRecord = {
        id: escalationId,
        originalNotificationId: `med_${medicationId}_${Date.now()}`,
        patientId,
        medicationId,
        triggerType,
        triggerTime: new Date(),
        escalationLevel: 1,
        actionsExecuted: [],
        currentStatus: 'active'
      };

      // Execute escalation actions for each applicable rule
      for (const rule of applicableRules) {
        for (const action of rule.actions) {
          try {
            // Wait for action delay
            if (action.delay > 0) {
              await this.delay(action.delay);
            }

            const actionResult = await this.executeEscalationAction(
              action,
              context,
              rule.culturalConsiderations
            );

            escalationRecord.actionsExecuted.push({
              action,
              executedAt: new Date(),
              result: actionResult.success ? 'success' : 'failed',
              deliveryResults: actionResult.deliveryResults
            });

          } catch (error) {
            console.error(`Failed to execute escalation action ${action.id}:`, error);
            escalationRecord.actionsExecuted.push({
              action,
              executedAt: new Date(),
              result: 'failed'
            });
          }
        }
      }

      // Store escalation record
      this.activeEscalations.set(escalationId, escalationRecord);
      await this.saveActiveEscalations();

      console.log(`Emergency escalation ${escalationId} triggered for patient ${patientId}`);
      return { success: true, escalationId };

    } catch (error) {
      console.error('Failed to trigger emergency escalation:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Escalation failed'
      };
    }
  }

  /**
   * Execute specific escalation action
   */
  private async executeEscalationAction(
    action: EscalationAction,
    context: any,
    culturalConsiderations: EscalationRule['culturalConsiderations']
  ): Promise<{ success: boolean; deliveryResults?: any[] }> {
    switch (action.type) {
      case 'notify_family':
        return await this.notifyFamilyMembers(action, context, culturalConsiderations);
      
      case 'notify_doctor':
        return await this.notifyHealthcareProvider(action, context, culturalConsiderations);
      
      case 'emergency_services':
        return await this.notifyEmergencyServices(action, context, culturalConsiderations);
      
      case 'increase_priority':
        return await this.increasePriority(action, context);
      
      case 'change_delivery_method':
        return await this.changeDeliveryMethod(action, context);
      
      default:
        console.warn(`Unknown escalation action type: ${action.type}`);
        return { success: false };
    }
  }

  /**
   * Notify family members
   */
  private async notifyFamilyMembers(
    action: EscalationAction,
    context: any,
    culturalConsiderations: EscalationRule['culturalConsiderations']
  ): Promise<{ success: boolean; deliveryResults?: any[] }> {
    const familyContacts = this.config.emergencyContacts
      .filter(contact => 
        contact.enabled && 
        ['spouse', 'child', 'parent', 'sibling', 'caregiver'].includes(contact.relationship)
      )
      .sort((a, b) => b.priority - a.priority);

    const deliveryResults: any[] = [];
    let hasSuccess = false;

    for (const contact of familyContacts) {
      try {
        // Create culturally appropriate message
        const message = this.createEscalationMessage(
          contact.language,
          context,
          'family',
          culturalConsiderations,
          contact.culturalPreferences
        );

        // Use preferred delivery methods
        const deliveryMethods = action.deliveryMethods || ['sms', 'push'];
        
        for (const method of deliveryMethods) {
          try {
            let result: any;

            switch (method) {
              case 'sms':
                result = await this.smsService.sendEmergencyEscalation(
                  contact.phoneNumber,
                  context.patientName,
                  context.medicationName,
                  contact.language,
                  []
                );
                break;
              
              case 'voice':
                result = await this.voiceService.generateEmergencyAlert(
                  context.patientName,
                  context.medicationName,
                  contact.language,
                  true
                );
                break;
              
              case 'push':
                result = await this.culturalService.sendEmergencyAlert(
                  context.patientName,
                  context.medicationName,
                  contact.language,
                  true
                );
                break;
              
              default:
                continue;
            }

            deliveryResults.push({
              contact: contact.name,
              method,
              result,
              timestamp: new Date()
            });

            if (result.success) {
              hasSuccess = true;
            }

          } catch (error) {
            console.error(`Failed to notify ${contact.name} via ${method}:`, error);
            deliveryResults.push({
              contact: contact.name,
              method,
              result: { success: false, error: error instanceof Error ? error.message : 'Failed' },
              timestamp: new Date()
            });
          }
        }

      } catch (error) {
        console.error(`Failed to notify family member ${contact.name}:`, error);
      }
    }

    return { success: hasSuccess, deliveryResults };
  }

  /**
   * Notify healthcare provider
   */
  private async notifyHealthcareProvider(
    action: EscalationAction,
    context: any,
    culturalConsiderations: EscalationRule['culturalConsiderations']
  ): Promise<{ success: boolean; deliveryResults?: any[] }> {
    const doctorContacts = this.config.emergencyContacts.filter(contact => 
      contact.enabled && contact.relationship === 'doctor'
    );

    const deliveryResults: any[] = [];
    let hasSuccess = false;

    for (const doctor of doctorContacts) {
      try {
        // Create professional medical alert message
        const message = this.createMedicalAlert(doctor.language, context, culturalConsiderations);

        // Prefer SMS and email for medical professionals
        const result = await this.smsService.sendEmergencyEscalation(
          doctor.phoneNumber,
          context.patientName,
          context.medicationName,
          doctor.language,
          []
        );

        deliveryResults.push({
          contact: doctor.name,
          method: 'sms',
          result,
          timestamp: new Date()
        });

        if (result.success) {
          hasSuccess = true;
        }

      } catch (error) {
        console.error(`Failed to notify doctor ${doctor.name}:`, error);
        deliveryResults.push({
          contact: doctor.name,
          method: 'sms',
          result: { success: false, error: error instanceof Error ? error.message : 'Failed' },
          timestamp: new Date()
        });
      }
    }

    return { success: hasSuccess, deliveryResults };
  }

  /**
   * Notify emergency services
   */
  private async notifyEmergencyServices(
    action: EscalationAction,
    context: any,
    culturalConsiderations: EscalationRule['culturalConsiderations']
  ): Promise<{ success: boolean; deliveryResults?: any[] }> {
    // This would integrate with actual emergency services
    // For demo purposes, we'll simulate the notification
    console.log('EMERGENCY: Notifying emergency services for critical medication non-compliance');
    
    return {
      success: true,
      deliveryResults: [{
        service: 'emergency_services',
        method: 'system',
        result: { success: true, messageId: 'emergency_999_' + Date.now() },
        timestamp: new Date()
      }]
    };
  }

  /**
   * Increase notification priority
   */
  private async increasePriority(
    action: EscalationAction,
    context: any
  ): Promise<{ success: boolean }> {
    // This would update the notification priority in the system
    console.log(`Increasing priority for medication ${context.medicationName}`);
    return { success: true };
  }

  /**
   * Change delivery method
   */
  private async changeDeliveryMethod(
    action: EscalationAction,
    context: any
  ): Promise<{ success: boolean }> {
    // This would update delivery method preferences
    console.log(`Changing delivery method for enhanced notifications`);
    return { success: true };
  }

  /**
   * Create culturally appropriate escalation message
   */
  private createEscalationMessage(
    language: SupportedLanguage,
    context: any,
    recipientType: 'family' | 'doctor' | 'emergency',
    culturalConsiderations: EscalationRule['culturalConsiderations'],
    contactPreferences?: EmergencyContact['culturalPreferences']
  ): { title: string; body: string } {
    const templates = {
      family: {
        en: {
          title: 'URGENT: Family Alert',
          body: `${context.patientName} has missed multiple doses of ${context.medicationName}. Please check on them immediately.`
        },
        ms: {
          title: 'PENTING: Amaran Keluarga', 
          body: `${context.patientName} telah terlepas beberapa dos ${context.medicationName}. Sila periksa keadaan mereka segera.`
        },
        zh: {
          title: '紧急：家庭警报',
          body: `${context.patientName} 已错过多次 ${context.medicationName} 服药。请立即检查他们的情况。`
        },
        ta: {
          title: 'அவசரம்: குடும்ப எச்சரிக்கை',
          body: `${context.patientName} ${context.medicationName} மருந்தின் பல அளவுகளை தவறவிட்டார். உடனே அவர்களை சரிபார்க்கவும்.`
        }
      }
    };

    const template = templates[recipientType]?.[language] || templates[recipientType]?.en;
    
    if (!template) {
      return {
        title: 'Medical Alert',
        body: `Patient ${context.patientName} requires immediate attention regarding ${context.medicationName}.`
      };
    }

    let title = template.title;
    let body = template.body;

    // Add cultural adaptations
    if (culturalConsiderations.useRespectfulLanguage && contactPreferences?.useHonorifics) {
      const honorifics = {
        en: 'Dear Family Member, ',
        ms: 'Yang Dihormati Ahli Keluarga, ',
        zh: '尊敬的家人，',
        ta: 'மதிப்பிற்குரிய குடும்ப உறுப்பினரே, '
      };
      body = (honorifics[language] || '') + body;
    }

    return { title, body };
  }

  /**
   * Create medical alert for healthcare providers
   */
  private createMedicalAlert(
    language: SupportedLanguage,
    context: any,
    culturalConsiderations: EscalationRule['culturalConsiderations']
  ): { title: string; body: string } {
    const templates = {
      en: {
        title: 'MEDICAL ALERT: Medication Non-Compliance',
        body: `Patient: ${context.patientName}\nMedication: ${context.medicationName}\nMissed doses: ${context.missedDoses || 'Multiple'}\nLast taken: ${context.lastTaken ? context.lastTaken.toLocaleString() : 'Unknown'}\n\nImmediate medical attention may be required.`
      },
      ms: {
        title: 'AMARAN PERUBATAN: Ketidakpatuhan Ubat',
        body: `Pesakit: ${context.patientName}\nUbat: ${context.medicationName}\nDos terlepas: ${context.missedDoses || 'Beberapa'}\nTerakhir diambil: ${context.lastTaken ? context.lastTaken.toLocaleString() : 'Tidak diketahui'}\n\nPerhatian perubatan segera mungkin diperlukan.`
      }
    };

    return templates[language] || templates.en;
  }

  /**
   * Deliver push notification
   */
  private async deliverPushNotification(
    notificationId: string,
    content: any,
    priority: NotificationPriority['level'],
    metadata?: any
  ): Promise<any> {
    return await this.culturalService.sendMedicationReminder(
      metadata?.medicationName || 'Medication',
      metadata?.dosage || '1 dose',
      content.language,
      { adaptForElderly: metadata?.elderlyMode }
    );
  }

  /**
   * Deliver SMS notification
   */
  private async deliverSMSNotification(
    notificationId: string,
    content: any,
    patientId: string,
    metadata?: any
  ): Promise<any> {
    // This would get patient phone number from database
    const phoneNumber = metadata?.phoneNumber || '+60123456789';
    
    return await this.smsService.sendMedicationReminder(
      phoneNumber,
      metadata?.medicationName || 'Medication',
      metadata?.dosage || '1 dose',
      content.language
    );
  }

  /**
   * Deliver voice notification
   */
  private async deliverVoiceNotification(
    notificationId: string,
    content: any,
    metadata?: any
  ): Promise<any> {
    return await this.voiceService.generateMedicationReminder(
      metadata?.medicationName || 'Medication',
      metadata?.dosage || '1 dose',
      content.language,
      { adaptForElderly: metadata?.elderlyMode }
    );
  }

  /**
   * Deliver visual notification
   */
  private async deliverVisualNotification(
    notificationId: string,
    content: any,
    priority: NotificationPriority['level'],
    metadata?: any
  ): Promise<any> {
    // This would update in-app notification center
    return { success: true, messageId: `visual_${notificationId}` };
  }

  /**
   * Execute failover delivery
   */
  private async executeFailoverDelivery(
    notificationId: string,
    content: any,
    failoverMethod: string,
    metadata?: any
  ): Promise<any> {
    console.log(`Executing failover delivery via ${failoverMethod} for notification ${notificationId}`);
    
    switch (failoverMethod) {
      case 'sms':
        return await this.deliverSMSNotification(notificationId, content, metadata?.patientId, metadata);
      case 'voice':
        return await this.deliverVoiceNotification(notificationId, content, metadata);
      case 'push':
        return await this.deliverPushNotification(notificationId, content, 'high', metadata);
      default:
        return { success: false, error: `Unknown failover method: ${failoverMethod}` };
    }
  }

  /**
   * Track delivery attempt for escalation monitoring
   */
  private async trackDeliveryAttempt(
    notificationId: string,
    medicationId: string,
    patientId: string,
    deliveryMethod: string,
    result: any
  ): Promise<void> {
    try {
      const trackingData = {
        notificationId,
        medicationId,
        patientId,
        deliveryMethod,
        result,
        timestamp: new Date()
      };

      // Store in AsyncStorage for persistence
      await AsyncStorage.setItem(
        `delivery_tracking_${notificationId}_${deliveryMethod}`,
        JSON.stringify(trackingData)
      );

    } catch (error) {
      console.error('Failed to track delivery attempt:', error);
    }
  }

  /**
   * Evaluate escalation triggers
   */
  private async evaluateEscalationTriggers(
    notificationId: string,
    medicationId: string,
    patientId: string,
    deliveryResults: any[]
  ): Promise<void> {
    try {
      const failedDeliveries = deliveryResults.filter(r => !r.result.success).length;
      const totalDeliveries = deliveryResults.length;
      
      // Check for failed delivery trigger
      if (failedDeliveries === totalDeliveries && totalDeliveries > 0) {
        console.log(`All delivery methods failed for notification ${notificationId}, evaluating escalation...`);
        
        // This would trigger escalation based on configured rules
        // For now, we'll log the evaluation
        console.log('Escalation evaluation completed');
      }

    } catch (error) {
      console.error('Failed to evaluate escalation triggers:', error);
    }
  }

  /**
   * Start escalation monitor
   */
  private startEscalationMonitor(): void {
    setInterval(async () => {
      await this.processActiveEscalations();
    }, 60000); // Check every minute
  }

  /**
   * Process active escalations
   */
  private async processActiveEscalations(): Promise<void> {
    for (const [escalationId, escalation] of this.activeEscalations.entries()) {
      if (escalation.currentStatus === 'active') {
        // Check if escalation should be resolved or updated
        // This would include logic to check patient responses, family confirmations, etc.
        
        const timeSinceEscalation = Date.now() - escalation.triggerTime.getTime();
        const cooldownPeriod = this.config.globalSettings.escalationCooldownPeriod;
        
        if (timeSinceEscalation > cooldownPeriod) {
          // Auto-resolve old escalations if no update
          escalation.currentStatus = 'resolved';
          escalation.resolvedAt = new Date();
          escalation.resolvedBy = 'system';
        }
      }
    }

    await this.saveActiveEscalations();
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Load configuration from storage
   */
  private async loadConfiguration(): Promise<Partial<PrioritySystemConfig>> {
    try {
      const stored = await AsyncStorage.getItem('priority_system_config');
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Failed to load priority system configuration:', error);
      return {};
    }
  }

  /**
   * Save configuration to storage
   */
  async saveConfiguration(config: Partial<PrioritySystemConfig>): Promise<void> {
    try {
      this.config = { ...this.config, ...config };
      await AsyncStorage.setItem('priority_system_config', JSON.stringify(this.config));
    } catch (error) {
      console.error('Failed to save priority system configuration:', error);
      throw error;
    }
  }

  /**
   * Load active escalations from storage
   */
  private async loadActiveEscalations(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('active_escalations');
      if (stored) {
        const escalationsData = JSON.parse(stored);
        this.activeEscalations = new Map(Object.entries(escalationsData).map(([key, value]: [string, any]) => [
          key,
          {
            ...value,
            triggerTime: new Date(value.triggerTime),
            resolvedAt: value.resolvedAt ? new Date(value.resolvedAt) : undefined,
            actionsExecuted: value.actionsExecuted.map((action: any) => ({
              ...action,
              executedAt: new Date(action.executedAt)
            }))
          }
        ]));
      }
    } catch (error) {
      console.error('Failed to load active escalations:', error);
    }
  }

  /**
   * Save active escalations to storage
   */
  private async saveActiveEscalations(): Promise<void> {
    try {
      const escalationsData = Object.fromEntries(this.activeEscalations.entries());
      await AsyncStorage.setItem('active_escalations', JSON.stringify(escalationsData));
    } catch (error) {
      console.error('Failed to save active escalations:', error);
    }
  }

  /**
   * Get default configuration
   */
  private getDefaultConfig(): PrioritySystemConfig {
    return {
      priorities: {
        low: {
          level: 'low',
          weight: 2,
          deliveryMethods: [
            { type: 'push', enabled: true, delay: 0, maxRetries: 2 }
          ],
          retryPolicy: {
            maxAttempts: 3,
            baseDelay: 300000, // 5 minutes
            backoffMultiplier: 2,
            maxDelay: 1800000, // 30 minutes
            escalateAfter: 2
          },
          escalationRules: [],
          culturalAdaptations: []
        },
        medium: {
          level: 'medium',
          weight: 5,
          deliveryMethods: [
            { type: 'push', enabled: true, delay: 0, maxRetries: 3 },
            { type: 'sms', enabled: true, delay: 300000, maxRetries: 2 } // 5 minute delay
          ],
          retryPolicy: {
            maxAttempts: 5,
            baseDelay: 180000, // 3 minutes
            backoffMultiplier: 1.5,
            maxDelay: 900000, // 15 minutes
            escalateAfter: 3
          },
          escalationRules: [],
          culturalAdaptations: []
        },
        high: {
          level: 'high',
          weight: 8,
          deliveryMethods: [
            { type: 'push', enabled: true, delay: 0, maxRetries: 3 },
            { type: 'sms', enabled: true, delay: 60000, maxRetries: 3 }, // 1 minute delay
            { type: 'voice', enabled: true, delay: 300000, maxRetries: 2 } // 5 minute delay
          ],
          retryPolicy: {
            maxAttempts: 7,
            baseDelay: 60000, // 1 minute
            backoffMultiplier: 1.3,
            maxDelay: 600000, // 10 minutes
            escalateAfter: 2
          },
          escalationRules: [],
          culturalAdaptations: []
        },
        critical: {
          level: 'critical',
          weight: 10,
          deliveryMethods: [
            { type: 'push', enabled: true, delay: 0, maxRetries: 5 },
            { type: 'sms', enabled: true, delay: 0, maxRetries: 5 },
            { type: 'voice', enabled: true, delay: 30000, maxRetries: 3 }, // 30 second delay
            { type: 'visual', enabled: true, delay: 0, maxRetries: 3 }
          ],
          retryPolicy: {
            maxAttempts: 10,
            baseDelay: 30000, // 30 seconds
            backoffMultiplier: 1.2,
            maxDelay: 300000, // 5 minutes
            escalateAfter: 1
          },
          escalationRules: [],
          culturalAdaptations: []
        }
      },
      defaultEscalationRules: [
        {
          id: 'missed_critical_medication',
          triggerCondition: {
            type: 'missed_doses',
            threshold: 2,
            timeWindow: 3600000, // 1 hour
            conditions: { priorityLevel: ['critical'] }
          },
          actions: [
            {
              id: 'notify_family_critical',
              type: 'notify_family',
              delay: 0,
              deliveryMethods: ['sms', 'voice']
            }
          ],
          culturalConsiderations: {
            respectPrayerTimes: true,
            notifyFamilyFirst: true,
            useRespectfulLanguage: true,
            adaptForElderly: true
          },
          enabled: true
        }
      ],
      emergencyContacts: [],
      globalSettings: {
        enableEscalation: true,
        respectCulturalConstraints: true,
        maxEscalationLevel: 5,
        escalationCooldownPeriod: 3600000 // 1 hour
      }
    };
  }

  // Public methods
  getConfiguration(): PrioritySystemConfig {
    return { ...this.config };
  }

  getActiveEscalations(): PriorityEscalationRecord[] {
    return Array.from(this.activeEscalations.values());
  }

  async resolveEscalation(escalationId: string, resolvedBy: string): Promise<boolean> {
    const escalation = this.activeEscalations.get(escalationId);
    if (escalation && escalation.currentStatus === 'active') {
      escalation.currentStatus = 'resolved';
      escalation.resolvedAt = new Date();
      escalation.resolvedBy = resolvedBy as any;
      await this.saveActiveEscalations();
      return true;
    }
    return false;
  }

  isServiceInitialized(): boolean {
    return this.isInitialized;
  }
}

export default NotificationPriorityService;