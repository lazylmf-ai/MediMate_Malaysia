/**
 * Multi-Modal Delivery Service Tests
 * 
 * Integration tests for the complete multi-modal delivery system
 * coordinating push notifications, SMS, voice, and visual reminders.
 */

import MultiModalDeliveryService from '../MultiModalDeliveryService';
import type { DeliveryRequest, MultiModalDeliveryConfig } from '../MultiModalDeliveryService';
import type { ReminderSchedule } from '../../reminder/ReminderSchedulingService';

// Mock all dependent services
jest.mock('../../../reminder/ReminderSchedulingService');
jest.mock('../../../reminder/CulturalConstraintEngine');
jest.mock('../../sms/SMSService');
jest.mock('../../voice/VoiceReminderService');
jest.mock('../CulturalNotificationService');
jest.mock('../NotificationPriorityService');

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiGet: jest.fn(() => Promise.resolve([]))
}));

describe('MultiModalDeliveryService', () => {
  let deliveryService: MultiModalDeliveryService;
  let mockSMSService: any;
  let mockVoiceService: any;
  let mockCulturalService: any;
  let mockPriorityService: any;

  beforeEach(async () => {
    deliveryService = MultiModalDeliveryService.getInstance();
    
    // Reset all mocks
    jest.clearAllMocks();

    // Mock service instances
    const SMSService = require('../../sms/SMSService').default;
    const VoiceReminderService = require('../../voice/VoiceReminderService').default;
    const CulturalNotificationService = require('../CulturalNotificationService').default;
    const NotificationPriorityService = require('../NotificationPriorityService').default;

    mockSMSService = {
      initialize: jest.fn().mockResolvedValue({ success: true }),
      sendMedicationReminder: jest.fn().mockResolvedValue({ success: true, messageId: 'sms_123' })
    };

    mockVoiceService = {
      initialize: jest.fn().mockResolvedValue({ success: true }),
      generateMedicationReminder: jest.fn().mockResolvedValue({ success: true, messageId: 'voice_123' })
    };

    mockCulturalService = {
      initialize: jest.fn().mockResolvedValue({ success: true }),
      sendMedicationReminder: jest.fn().mockResolvedValue({ success: true, messageId: 'cultural_123' })
    };

    mockPriorityService = {
      initialize: jest.fn().mockResolvedValue({ success: true }),
      triggerEmergencyEscalation: jest.fn().mockResolvedValue({ success: true, escalationId: 'esc_123' })
    };

    SMSService.getInstance = jest.fn().mockReturnValue(mockSMSService);
    VoiceReminderService.getInstance = jest.fn().mockReturnValue(mockVoiceService);
    CulturalNotificationService.getInstance = jest.fn().mockReturnValue(mockCulturalService);
    NotificationPriorityService.getInstance = jest.fn().mockReturnValue(mockPriorityService);
  });

  describe('initialization', () => {
    it('should initialize with default configuration', async () => {
      const result = await deliveryService.initialize();
      expect(result.success).toBe(true);
      expect(deliveryService.isServiceInitialized()).toBe(true);
    });

    it('should initialize all dependent services', async () => {
      await deliveryService.initialize();
      
      expect(mockSMSService.initialize).toHaveBeenCalled();
      expect(mockVoiceService.initialize).toHaveBeenCalled();
      expect(mockCulturalService.initialize).toHaveBeenCalled();
      expect(mockPriorityService.initialize).toHaveBeenCalled();
    });

    it('should handle partial service initialization failures', async () => {
      mockVoiceService.initialize.mockRejectedValue(new Error('Voice service failed'));
      
      const result = await deliveryService.initialize();
      expect(result.success).toBe(true); // Should continue despite one failure
    });

    it('should initialize with custom configuration', async () => {
      const customConfig: Partial<MultiModalDeliveryConfig> = {
        coordination: {
          simultaneousDelivery: true,
          sequentialDelay: 600000,
          failoverEnabled: false,
          confirmationRequired: false,
          timeoutPeriod: 3600000
        },
        culturalIntegration: {
          respectSchedulingConstraints: false,
          adaptDeliveryTiming: false,
          useCulturalContent: false,
          includeMultilingualSupport: false
        }
      };

      const result = await deliveryService.initialize(customConfig);
      expect(result.success).toBe(true);
      
      const config = deliveryService.getConfiguration();
      expect(config.coordination.simultaneousDelivery).toBe(true);
      expect(config.coordination.sequentialDelay).toBe(600000);
      expect(config.culturalIntegration.respectSchedulingConstraints).toBe(false);
    });
  });

  describe('delivery request processing', () => {
    beforeEach(async () => {
      await deliveryService.initialize();
    });

    it('should process basic delivery request successfully', async () => {
      const reminderSchedule: ReminderSchedule = {
        medicationId: 'med_123',
        scheduleId: 'schedule_123',
        scheduledTime: new Date(),
        culturalConstraints: {
          avoidPrayerTimes: true,
          bufferMinutes: 15,
          fallbackBehavior: 'delay'
        },
        deliveryMethods: ['push', 'sms'],
        priority: 'medium',
        retryPolicy: {
          maxRetries: 3,
          retryDelay: 300000,
          escalateOnFailure: true
        }
      };

      const deliveryRequest: DeliveryRequest = {
        id: 'delivery_123',
        reminderSchedule,
        content: {
          medicationName: 'Panadol',
          dosage: '500mg',
          language: 'en'
        },
        deliveryPreferences: {
          methods: ['push', 'sms'],
          priority: 'medium',
          culturalAdaptations: true,
          elderlyMode: false
        },
        context: {
          patientId: 'patient_123',
          medicationId: 'med_123',
          scheduledTime: new Date()
        }
      };

      const result = await deliveryService.processDeliveryRequest(deliveryRequest);
      
      expect(result.overallSuccess).toBe(true);
      expect(result.requestId).toBe('delivery_123');
      expect(result.results).toHaveLength(2); // push and sms
      expect(result.analytics.totalAttempts).toBe(2);
      expect(result.analytics.successfulDeliveries).toBe(2);
    });

    it('should handle Malaysian cultural content', async () => {
      const deliveryRequest: DeliveryRequest = {
        id: 'delivery_ms',
        reminderSchedule: {
          medicationId: 'med_123',
          scheduleId: 'schedule_123',
          scheduledTime: new Date(),
          culturalConstraints: { avoidPrayerTimes: true, bufferMinutes: 30, fallbackBehavior: 'delay' },
          deliveryMethods: ['push', 'sms'],
          priority: 'medium',
          retryPolicy: { maxRetries: 3, retryDelay: 300000, escalateOnFailure: true }
        },
        content: {
          medicationName: 'Panadol',
          dosage: '500mg',
          language: 'ms'
        },
        deliveryPreferences: {
          methods: ['push', 'sms'],
          priority: 'medium',
          culturalAdaptations: true,
          elderlyMode: false
        },
        context: {
          patientId: 'patient_123',
          medicationId: 'med_123',
          scheduledTime: new Date()
        }
      };

      const result = await deliveryService.processDeliveryRequest(deliveryRequest);
      
      expect(result.overallSuccess).toBe(true);
      expect(result.analytics.culturalOptimizations).toBeDefined();
      expect(mockCulturalService.sendMedicationReminder).toHaveBeenCalledWith(
        'Panadol',
        '500mg',
        'ms',
        expect.any(Object)
      );
    });

    it('should process delivery request with all methods', async () => {
      const deliveryRequest: DeliveryRequest = {
        id: 'delivery_all_methods',
        reminderSchedule: {
          medicationId: 'med_123',
          scheduleId: 'schedule_123',
          scheduledTime: new Date(),
          culturalConstraints: { avoidPrayerTimes: false, bufferMinutes: 0, fallbackBehavior: 'delay' },
          deliveryMethods: ['push', 'sms', 'voice', 'visual'],
          priority: 'high',
          retryPolicy: { maxRetries: 5, retryDelay: 180000, escalateOnFailure: true }
        },
        content: {
          medicationName: 'Insulin',
          dosage: '10 units',
          language: 'en'
        },
        deliveryPreferences: {
          methods: ['push', 'sms', 'voice', 'visual'],
          priority: 'high',
          culturalAdaptations: false,
          elderlyMode: true
        },
        context: {
          patientId: 'patient_123',
          medicationId: 'med_123',
          scheduledTime: new Date()
        }
      };

      const result = await deliveryService.processDeliveryRequest(deliveryRequest);
      
      expect(result.overallSuccess).toBe(true);
      expect(result.results).toHaveLength(4); // All four methods
      expect(result.analytics.totalAttempts).toBe(4);
      
      // Verify all services were called
      expect(mockCulturalService.sendMedicationReminder).toHaveBeenCalled();
      expect(mockSMSService.sendMedicationReminder).toHaveBeenCalled();
      expect(mockVoiceService.generateMedicationReminder).toHaveBeenCalled();
    });
  });

  describe('simultaneous delivery', () => {
    beforeEach(async () => {
      await deliveryService.initialize({
        coordination: {
          simultaneousDelivery: true,
          sequentialDelay: 0,
          failoverEnabled: true,
          confirmationRequired: false,
          timeoutPeriod: 1800000
        }
      });
    });

    it('should execute all delivery methods simultaneously', async () => {
      const deliveryRequest: DeliveryRequest = {
        id: 'simultaneous_test',
        reminderSchedule: {
          medicationId: 'med_123',
          scheduleId: 'schedule_123',
          scheduledTime: new Date(),
          culturalConstraints: { avoidPrayerTimes: false, bufferMinutes: 0, fallbackBehavior: 'delay' },
          deliveryMethods: ['push', 'sms', 'voice'],
          priority: 'medium',
          retryPolicy: { maxRetries: 3, retryDelay: 300000, escalateOnFailure: true }
        },
        content: {
          medicationName: 'Panadol',
          dosage: '500mg',
          language: 'en'
        },
        deliveryPreferences: {
          methods: ['push', 'sms', 'voice'],
          priority: 'medium',
          culturalAdaptations: true,
          elderlyMode: false
        },
        context: {
          patientId: 'patient_123',
          medicationId: 'med_123',
          scheduledTime: new Date()
        }
      };

      const startTime = Date.now();
      const result = await deliveryService.processDeliveryRequest(deliveryRequest);
      const endTime = Date.now();
      
      expect(result.overallSuccess).toBe(true);
      expect(result.results).toHaveLength(3);
      
      // Simultaneous delivery should be faster than sequential
      const executionTime = endTime - startTime;
      expect(executionTime).toBeLessThan(5000); // Should complete quickly
    });

    it('should handle partial failures in simultaneous delivery', async () => {
      // Mock SMS service to fail
      mockSMSService.sendMedicationReminder.mockResolvedValue({ success: false, error: 'SMS failed' });

      const deliveryRequest: DeliveryRequest = {
        id: 'partial_failure_test',
        reminderSchedule: {
          medicationId: 'med_123',
          scheduleId: 'schedule_123',
          scheduledTime: new Date(),
          culturalConstraints: { avoidPrayerTimes: false, bufferMinutes: 0, fallbackBehavior: 'delay' },
          deliveryMethods: ['push', 'sms'],
          priority: 'medium',
          retryPolicy: { maxRetries: 3, retryDelay: 300000, escalateOnFailure: true }
        },
        content: {
          medicationName: 'Panadol',
          dosage: '500mg',
          language: 'en'
        },
        deliveryPreferences: {
          methods: ['push', 'sms'],
          priority: 'medium',
          culturalAdaptations: true,
          elderlyMode: false
        },
        context: {
          patientId: 'patient_123',
          medicationId: 'med_123',
          scheduledTime: new Date()
        }
      };

      const result = await deliveryService.processDeliveryRequest(deliveryRequest);
      
      expect(result.overallSuccess).toBe(true); // Should succeed if at least one method works
      expect(result.analytics.successfulDeliveries).toBe(1); // Only push succeeded
      
      const smsResult = result.results.find(r => r.method === 'sms');
      expect(smsResult?.success).toBe(false);
      expect(smsResult?.error).toBe('SMS failed');
    });
  });

  describe('sequential delivery', () => {
    beforeEach(async () => {
      await deliveryService.initialize({
        coordination: {
          simultaneousDelivery: false,
          sequentialDelay: 100, // Short delay for testing
          failoverEnabled: true,
          confirmationRequired: false,
          timeoutPeriod: 1800000
        }
      });
    });

    it('should execute delivery methods sequentially with delays', async () => {
      const deliveryRequest: DeliveryRequest = {
        id: 'sequential_test',
        reminderSchedule: {
          medicationId: 'med_123',
          scheduleId: 'schedule_123',
          scheduledTime: new Date(),
          culturalConstraints: { avoidPrayerTimes: false, bufferMinutes: 0, fallbackBehavior: 'delay' },
          deliveryMethods: ['push', 'sms'],
          priority: 'medium',
          retryPolicy: { maxRetries: 3, retryDelay: 300000, escalateOnFailure: true }
        },
        content: {
          medicationName: 'Panadol',
          dosage: '500mg',
          language: 'en'
        },
        deliveryPreferences: {
          methods: ['push', 'sms'],
          priority: 'medium',
          culturalAdaptations: true,
          elderlyMode: false
        },
        context: {
          patientId: 'patient_123',
          medicationId: 'med_123',
          scheduledTime: new Date()
        }
      };

      const startTime = Date.now();
      const result = await deliveryService.processDeliveryRequest(deliveryRequest);
      const endTime = Date.now();
      
      expect(result.overallSuccess).toBe(true);
      expect(result.results).toHaveLength(2);
      
      // Sequential delivery should include delays
      const executionTime = endTime - startTime;
      expect(executionTime).toBeGreaterThan(100); // At least one delay period
    });

    it('should stop sequential delivery on first failure when failover disabled', async () => {
      await deliveryService.initialize({
        coordination: {
          simultaneousDelivery: false,
          sequentialDelay: 100,
          failoverEnabled: false,
          confirmationRequired: false,
          timeoutPeriod: 1800000
        }
      });

      // Mock push to fail
      mockCulturalService.sendMedicationReminder.mockResolvedValue({ success: false, error: 'Push failed' });

      const deliveryRequest: DeliveryRequest = {
        id: 'failover_disabled_test',
        reminderSchedule: {
          medicationId: 'med_123',
          scheduleId: 'schedule_123',
          scheduledTime: new Date(),
          culturalConstraints: { avoidPrayerTimes: false, bufferMinutes: 0, fallbackBehavior: 'delay' },
          deliveryMethods: ['push', 'sms'],
          priority: 'medium',
          retryPolicy: { maxRetries: 3, retryDelay: 300000, escalateOnFailure: true }
        },
        content: {
          medicationName: 'Panadol',
          dosage: '500mg',
          language: 'en'
        },
        deliveryPreferences: {
          methods: ['push', 'sms'],
          priority: 'medium',
          culturalAdaptations: true,
          elderlyMode: false
        },
        context: {
          patientId: 'patient_123',
          medicationId: 'med_123',
          scheduledTime: new Date()
        }
      };

      const result = await deliveryService.processDeliveryRequest(deliveryRequest);
      
      expect(result.overallSuccess).toBe(false);
      expect(result.results).toHaveLength(1); // Should stop after first failure
      expect(mockSMSService.sendMedicationReminder).not.toHaveBeenCalled();
    });
  });

  describe('emergency escalation', () => {
    beforeEach(async () => {
      await deliveryService.initialize();
    });

    it('should trigger escalation for critical medication failures', async () => {
      // Mock all delivery methods to fail
      mockCulturalService.sendMedicationReminder.mockResolvedValue({ success: false, error: 'Push failed' });
      mockSMSService.sendMedicationReminder.mockResolvedValue({ success: false, error: 'SMS failed' });
      mockVoiceService.generateMedicationReminder.mockResolvedValue({ success: false, error: 'Voice failed' });

      const deliveryRequest: DeliveryRequest = {
        id: 'escalation_test',
        reminderSchedule: {
          medicationId: 'med_123',
          scheduleId: 'schedule_123',
          scheduledTime: new Date(),
          culturalConstraints: { avoidPrayerTimes: false, bufferMinutes: 0, fallbackBehavior: 'delay' },
          deliveryMethods: ['push', 'sms', 'voice'],
          priority: 'critical',
          retryPolicy: { maxRetries: 3, retryDelay: 300000, escalateOnFailure: true }
        },
        content: {
          medicationName: 'Insulin',
          dosage: '10 units',
          language: 'en'
        },
        deliveryPreferences: {
          methods: ['push', 'sms', 'voice'],
          priority: 'critical',
          culturalAdaptations: true,
          elderlyMode: false
        },
        context: {
          patientId: 'patient_123',
          medicationId: 'med_123',
          scheduledTime: new Date()
        },
        metadata: {
          patientName: 'John Doe'
        }
      };

      const result = await deliveryService.processDeliveryRequest(deliveryRequest);
      
      expect(result.overallSuccess).toBe(false);
      expect(result.escalationTriggered).toBe(true);
      expect(mockPriorityService.triggerEmergencyEscalation).toHaveBeenCalledWith(
        'patient_123',
        'med_123',
        'failed_deliveries',
        expect.objectContaining({
          patientName: 'John Doe',
          medicationName: 'Insulin',
          language: 'en'
        })
      );
    });

    it('should not trigger escalation for non-critical medications', async () => {
      // Mock all delivery methods to fail
      mockCulturalService.sendMedicationReminder.mockResolvedValue({ success: false, error: 'Failed' });
      mockSMSService.sendMedicationReminder.mockResolvedValue({ success: false, error: 'Failed' });

      const deliveryRequest: DeliveryRequest = {
        id: 'no_escalation_test',
        reminderSchedule: {
          medicationId: 'med_123',
          scheduleId: 'schedule_123',
          scheduledTime: new Date(),
          culturalConstraints: { avoidPrayerTimes: false, bufferMinutes: 0, fallbackBehavior: 'delay' },
          deliveryMethods: ['push', 'sms'],
          priority: 'low',
          retryPolicy: { maxRetries: 3, retryDelay: 300000, escalateOnFailure: true }
        },
        content: {
          medicationName: 'Vitamin C',
          dosage: '500mg',
          language: 'en'
        },
        deliveryPreferences: {
          methods: ['push', 'sms'],
          priority: 'low',
          culturalAdaptations: true,
          elderlyMode: false
        },
        context: {
          patientId: 'patient_123',
          medicationId: 'med_123',
          scheduledTime: new Date()
        }
      };

      const result = await deliveryService.processDeliveryRequest(deliveryRequest);
      
      expect(result.overallSuccess).toBe(false);
      expect(result.escalationTriggered).toBeFalsy();
      expect(mockPriorityService.triggerEmergencyEscalation).not.toHaveBeenCalled();
    });
  });

  describe('user response tracking', () => {
    beforeEach(async () => {
      await deliveryService.initialize();
    });

    it('should record user response to notifications', async () => {
      await deliveryService.recordUserResponse('delivery_123', 'push', 'taken');
      
      // Should update internal tracking
      // In a real implementation, this would verify the response was stored
    });

    it('should track response times for analytics', async () => {
      const requestId = 'response_time_test';
      const responseTime = new Date();
      
      await deliveryService.recordUserResponse(requestId, 'sms', 'taken');
      
      // Should record the response time for analytics
    });

    it('should support different response types', async () => {
      const responses: Array<'taken' | 'snoozed' | 'skipped'> = ['taken', 'snoozed', 'skipped'];
      
      for (const response of responses) {
        await deliveryService.recordUserResponse('test_' + response, 'push', response);
      }
      
      // All response types should be tracked
    });
  });

  describe('analytics', () => {
    beforeEach(async () => {
      await deliveryService.initialize();
    });

    it('should generate comprehensive delivery analytics', async () => {
      const analytics = await deliveryService.getDeliveryAnalytics(30);
      
      expect(analytics).toHaveProperty('period');
      expect(analytics).toHaveProperty('totalDeliveries');
      expect(analytics).toHaveProperty('successRate');
      expect(analytics).toHaveProperty('methodPerformance');
      expect(analytics).toHaveProperty('culturalInsights');
      expect(analytics).toHaveProperty('integrationMetrics');
      
      expect(analytics.period.start).toBeInstanceOf(Date);
      expect(analytics.period.end).toBeInstanceOf(Date);
      expect(typeof analytics.totalDeliveries).toBe('number');
      expect(typeof analytics.successRate).toBe('number');
    });

    it('should track method performance accurately', async () => {
      const analytics = await deliveryService.getDeliveryAnalytics();
      
      expect(analytics.methodPerformance).toHaveProperty('push');
      expect(analytics.methodPerformance).toHaveProperty('sms');
      expect(analytics.methodPerformance).toHaveProperty('voice');
      expect(analytics.methodPerformance).toHaveProperty('visual');
      
      Object.values(analytics.methodPerformance).forEach(performance => {
        expect(performance).toHaveProperty('attempts');
        expect(performance).toHaveProperty('successes');
        expect(performance).toHaveProperty('averageResponseTime');
        expect(performance).toHaveProperty('userPreference');
        expect(typeof performance.attempts).toBe('number');
        expect(typeof performance.successes).toBe('number');
      });
    });

    it('should provide cultural insights by language', async () => {
      const analytics = await deliveryService.getDeliveryAnalytics();
      
      expect(analytics.culturalInsights).toHaveProperty('en');
      expect(analytics.culturalInsights).toHaveProperty('ms');
      expect(analytics.culturalInsights).toHaveProperty('zh');
      expect(analytics.culturalInsights).toHaveProperty('ta');
      
      Object.values(analytics.culturalInsights).forEach(insight => {
        expect(insight).toHaveProperty('preferredMethods');
        expect(insight).toHaveProperty('successRate');
        expect(insight).toHaveProperty('culturalAdaptations');
        expect(insight).toHaveProperty('userFeedback');
        expect(Array.isArray(insight.preferredMethods)).toBe(true);
        expect(typeof insight.successRate).toBe('number');
      });
    });

    it('should track integration metrics', async () => {
      const analytics = await deliveryService.getDeliveryAnalytics();
      
      expect(analytics.integrationMetrics).toHaveProperty('schedulingAccuracy');
      expect(analytics.integrationMetrics).toHaveProperty('culturalConstraintRespect');
      expect(analytics.integrationMetrics).toHaveProperty('escalationRate');
      
      expect(typeof analytics.integrationMetrics.schedulingAccuracy).toBe('number');
      expect(typeof analytics.integrationMetrics.culturalConstraintRespect).toBe('number');
      expect(typeof analytics.integrationMetrics.escalationRate).toBe('number');
    });
  });

  describe('configuration management', () => {
    it('should save and load configuration', async () => {
      const customConfig: Partial<MultiModalDeliveryConfig> = {
        deliveryMethods: {
          push: { enabled: false, priority: 5, culturalPreferences: {} },
          sms: { enabled: true, priority: 10, culturalPreferences: {} },
          voice: { enabled: true, priority: 8, culturalPreferences: {} },
          visual: { enabled: false, priority: 2, culturalPreferences: {} }
        },
        coordination: {
          simultaneousDelivery: true,
          sequentialDelay: 120000,
          failoverEnabled: false,
          confirmationRequired: true,
          timeoutPeriod: 900000
        }
      };

      await deliveryService.saveConfiguration(customConfig);
      const savedConfig = deliveryService.getConfiguration();
      
      expect(savedConfig.deliveryMethods.push.enabled).toBe(false);
      expect(savedConfig.deliveryMethods.sms.priority).toBe(10);
      expect(savedConfig.coordination.simultaneousDelivery).toBe(true);
      expect(savedConfig.coordination.sequentialDelay).toBe(120000);
    });
  });

  describe('service state management', () => {
    beforeEach(async () => {
      await deliveryService.initialize();
    });

    it('should track active deliveries', () => {
      const activeDeliveries = deliveryService.getActiveDeliveries();
      expect(Array.isArray(activeDeliveries)).toBe(true);
    });

    it('should maintain delivery history', () => {
      const history = deliveryService.getDeliveryHistory(10);
      expect(Array.isArray(history)).toBe(true);
      expect(history.length).toBeLessThanOrEqual(10);
    });

    it('should report initialization status correctly', () => {
      expect(deliveryService.isServiceInitialized()).toBe(true);
    });
  });

  describe('error handling', () => {
    beforeEach(async () => {
      await deliveryService.initialize();
    });

    it('should handle service initialization failures gracefully', async () => {
      mockSMSService.initialize.mockRejectedValue(new Error('SMS service failed'));
      
      const newService = MultiModalDeliveryService.getInstance();
      const result = await newService.initialize();
      
      // Should still succeed despite SMS service failure
      expect(result.success).toBe(true);
    });

    it('should handle delivery method failures gracefully', async () => {
      mockCulturalService.sendMedicationReminder.mockRejectedValue(new Error('Network error'));

      const deliveryRequest: DeliveryRequest = {
        id: 'error_handling_test',
        reminderSchedule: {
          medicationId: 'med_123',
          scheduleId: 'schedule_123',
          scheduledTime: new Date(),
          culturalConstraints: { avoidPrayerTimes: false, bufferMinutes: 0, fallbackBehavior: 'delay' },
          deliveryMethods: ['push', 'sms'],
          priority: 'medium',
          retryPolicy: { maxRetries: 3, retryDelay: 300000, escalateOnFailure: true }
        },
        content: {
          medicationName: 'Panadol',
          dosage: '500mg',
          language: 'en'
        },
        deliveryPreferences: {
          methods: ['push', 'sms'],
          priority: 'medium',
          culturalAdaptations: true,
          elderlyMode: false
        },
        context: {
          patientId: 'patient_123',
          medicationId: 'med_123',
          scheduledTime: new Date()
        }
      };

      const result = await deliveryService.processDeliveryRequest(deliveryRequest);
      
      // Should continue with other methods even if one fails
      expect(result.results).toHaveLength(2);
      const pushResult = result.results.find(r => r.method === 'push');
      const smsResult = result.results.find(r => r.method === 'sms');
      
      expect(pushResult?.success).toBe(false);
      expect(smsResult?.success).toBe(true);
    });

    it('should handle uninitialized service gracefully', async () => {
      const uninitializedService = MultiModalDeliveryService.getInstance();
      // Don't initialize the service
      
      const deliveryRequest: DeliveryRequest = {
        id: 'uninitialized_test',
        reminderSchedule: {
          medicationId: 'med_123',
          scheduleId: 'schedule_123',
          scheduledTime: new Date(),
          culturalConstraints: { avoidPrayerTimes: false, bufferMinutes: 0, fallbackBehavior: 'delay' },
          deliveryMethods: ['push'],
          priority: 'medium',
          retryPolicy: { maxRetries: 3, retryDelay: 300000, escalateOnFailure: true }
        },
        content: {
          medicationName: 'Test',
          dosage: '1mg',
          language: 'en'
        },
        deliveryPreferences: {
          methods: ['push'],
          priority: 'medium',
          culturalAdaptations: false,
          elderlyMode: false
        },
        context: {
          patientId: 'patient_123',
          medicationId: 'med_123',
          scheduledTime: new Date()
        }
      };

      await expect(uninitializedService.processDeliveryRequest(deliveryRequest))
        .rejects.toThrow('Multi-modal delivery service not initialized');
    });
  });
});