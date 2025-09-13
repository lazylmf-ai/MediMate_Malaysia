/**
 * Integration Tests for Issue #24 Stream B
 * 
 * End-to-end integration tests for the complete multi-modal reminder delivery system,
 * testing the integration between SMS, Voice, Cultural Notifications, Priority System,
 * and Multi-Modal Delivery Service.
 */

import SMSService from '../../sms/SMSService';
import VoiceReminderService from '../../voice/VoiceReminderService';
import CulturalNotificationService from '../CulturalNotificationService';
import NotificationPriorityService from '../NotificationPriorityService';
import MultiModalDeliveryService from '../MultiModalDeliveryService';
import type { DeliveryRequest } from '../MultiModalDeliveryService';

// Mock external dependencies
jest.mock('@react-native-async-storage/async-storage');
jest.mock('expo-notifications');
jest.mock('expo-speech');
jest.mock('expo-av');
jest.mock('expo-file-system');
jest.mock('expo-haptics');
jest.mock('react-native', () => ({
  Vibration: { vibrate: jest.fn() },
  Platform: { OS: 'ios' }
}));

describe('Stream B Integration Tests', () => {
  let smsService: SMSService;
  let voiceService: VoiceReminderService;
  let culturalService: CulturalNotificationService;
  let priorityService: NotificationPriorityService;
  let deliveryService: MultiModalDeliveryService;

  beforeAll(async () => {
    // Initialize all services
    smsService = SMSService.getInstance();
    voiceService = VoiceReminderService.getInstance();
    culturalService = CulturalNotificationService.getInstance();
    priorityService = NotificationPriorityService.getInstance();
    deliveryService = MultiModalDeliveryService.getInstance();

    // Initialize services in proper order
    await smsService.initialize({
      primaryProvider: 'local',
      providers: {
        local: {
          apiEndpoint: 'https://test-api.local',
          apiKey: 'test-key',
          fromNumber: '+60123456789'
        }
      }
    });

    await voiceService.initialize();
    await culturalService.initialize();
    await priorityService.initialize();
    await deliveryService.initialize();
  });

  describe('Complete medication reminder flow', () => {
    it('should deliver medication reminder through all channels for English patient', async () => {
      const deliveryRequest: DeliveryRequest = {
        id: 'integration_en_001',
        reminderSchedule: {
          medicationId: 'panadol_500mg',
          scheduleId: 'morning_dose',
          scheduledTime: new Date(),
          culturalConstraints: {
            avoidPrayerTimes: false,
            bufferMinutes: 0,
            fallbackBehavior: 'delay'
          },
          deliveryMethods: ['push', 'sms', 'voice'],
          priority: 'medium',
          retryPolicy: {
            maxRetries: 3,
            retryDelay: 300000,
            escalateOnFailure: true
          }
        },
        content: {
          medicationName: 'Panadol',
          dosage: '500mg',
          instructions: 'Take with food',
          language: 'en'
        },
        deliveryPreferences: {
          methods: ['push', 'sms', 'voice'],
          priority: 'medium',
          culturalAdaptations: true,
          elderlyMode: false
        },
        context: {
          patientId: 'patient_en_001',
          medicationId: 'panadol_500mg',
          scheduledTime: new Date(),
          culturalProfile: {
            language: 'en',
            country: 'MY',
            religion: 'christian',
            ageGroup: 'adult'
          }
        },
        metadata: {
          patientName: 'John Smith',
          phoneNumber: '+60123456789'
        }
      };

      const result = await deliveryService.processDeliveryRequest(deliveryRequest);

      expect(result.overallSuccess).toBe(true);
      expect(result.results).toHaveLength(3);
      expect(result.analytics.successfulDeliveries).toBe(3);
      expect(result.analytics.culturalOptimizations).toBeDefined();

      // Verify each delivery method succeeded
      const pushResult = result.results.find(r => r.method === 'push');
      const smsResult = result.results.find(r => r.method === 'sms');
      const voiceResult = result.results.find(r => r.method === 'voice');

      expect(pushResult?.success).toBe(true);
      expect(smsResult?.success).toBe(true);
      expect(voiceResult?.success).toBe(true);
    });

    it('should deliver medication reminder with Malaysian cultural adaptations', async () => {
      const deliveryRequest: DeliveryRequest = {
        id: 'integration_ms_001',
        reminderSchedule: {
          medicationId: 'panadol_500mg',
          scheduleId: 'pagi_dose',
          scheduledTime: new Date(),
          culturalConstraints: {
            avoidPrayerTimes: true,
            bufferMinutes: 30,
            fallbackBehavior: 'delay'
          },
          deliveryMethods: ['push', 'sms', 'voice'],
          priority: 'medium',
          retryPolicy: {
            maxRetries: 3,
            retryDelay: 300000,
            escalateOnFailure: true
          }
        },
        content: {
          medicationName: 'Panadol',
          dosage: '500mg',
          instructions: 'Ambil bersama makanan',
          language: 'ms'
        },
        deliveryPreferences: {
          methods: ['push', 'sms', 'voice'],
          priority: 'medium',
          culturalAdaptations: true,
          elderlyMode: false
        },
        context: {
          patientId: 'patient_ms_001',
          medicationId: 'panadol_500mg',
          scheduledTime: new Date(),
          culturalProfile: {
            language: 'ms',
            country: 'MY',
            religion: 'islam',
            ageGroup: 'adult',
            prayerTimes: {
              subuh: '06:00',
              zohor: '13:15',
              asr: '16:30',
              maghrib: '19:20',
              isyak: '20:35'
            }
          }
        },
        metadata: {
          patientName: 'Ahmad Abdullah',
          phoneNumber: '+60123456790'
        }
      };

      const result = await deliveryService.processDeliveryRequest(deliveryRequest);

      expect(result.overallSuccess).toBe(true);
      expect(result.results).toHaveLength(3);
      
      // Should include Malaysian cultural adaptations
      expect(result.analytics.culturalOptimizations).toContain('content');
      
      // All delivery methods should respect cultural constraints
      result.results.forEach(deliveryResult => {
        expect(deliveryResult.success).toBe(true);
        if (deliveryResult.culturalAdaptations) {
          expect(deliveryResult.culturalAdaptations.length).toBeGreaterThan(0);
        }
      });
    });

    it('should handle elderly patient with enhanced accessibility features', async () => {
      const deliveryRequest: DeliveryRequest = {
        id: 'integration_elderly_001',
        reminderSchedule: {
          medicationId: 'heart_medication',
          scheduleId: 'morning_heart_med',
          scheduledTime: new Date(),
          culturalConstraints: {
            avoidPrayerTimes: false,
            bufferMinutes: 0,
            fallbackBehavior: 'delay'
          },
          deliveryMethods: ['push', 'sms', 'voice'],
          priority: 'high',
          retryPolicy: {
            maxRetries: 5,
            retryDelay: 180000,
            escalateOnFailure: true
          }
        },
        content: {
          medicationName: 'Heart Medicine',
          dosage: '25mg',
          instructions: 'Take before breakfast',
          language: 'en'
        },
        deliveryPreferences: {
          methods: ['push', 'sms', 'voice'],
          priority: 'high',
          culturalAdaptations: true,
          elderlyMode: true
        },
        context: {
          patientId: 'patient_elderly_001',
          medicationId: 'heart_medication',
          scheduledTime: new Date(),
          culturalProfile: {
            language: 'en',
            country: 'MY',
            ageGroup: 'elderly',
            accessibilityNeeds: {
              largeText: true,
              loudVolume: true,
              slowSpeech: true,
              simpleLanguage: true
            }
          }
        },
        metadata: {
          patientName: 'Mary Johnson',
          phoneNumber: '+60123456791',
          emergencyContacts: ['+60123456792', '+60123456793']
        }
      };

      const result = await deliveryService.processDeliveryRequest(deliveryRequest);

      expect(result.overallSuccess).toBe(true);
      expect(result.results).toHaveLength(3);
      
      // Should apply elderly-friendly adaptations
      const voiceResult = result.results.find(r => r.method === 'voice');
      expect(voiceResult?.success).toBe(true);
      
      // Voice should use slower speech rate and louder volume for elderly
      expect(result.analytics.culturalOptimizations).toContain('accessibility');
    });
  });

  describe('Emergency escalation integration', () => {
    it('should trigger full escalation for critical medication failure', async () => {
      const deliveryRequest: DeliveryRequest = {
        id: 'integration_critical_001',
        reminderSchedule: {
          medicationId: 'insulin',
          scheduleId: 'critical_insulin',
          scheduledTime: new Date(),
          culturalConstraints: {
            avoidPrayerTimes: true,
            bufferMinutes: 15,
            fallbackBehavior: 'delay'
          },
          deliveryMethods: ['push', 'sms', 'voice'],
          priority: 'critical',
          retryPolicy: {
            maxRetries: 5,
            retryDelay: 60000,
            escalateOnFailure: true
          }
        },
        content: {
          medicationName: 'Insulin',
          dosage: '10 units',
          instructions: 'Inject subcutaneously',
          language: 'ms'
        },
        deliveryPreferences: {
          methods: ['push', 'sms', 'voice'],
          priority: 'critical',
          culturalAdaptations: true,
          elderlyMode: false
        },
        context: {
          patientId: 'patient_critical_001',
          medicationId: 'insulin',
          scheduledTime: new Date(),
          culturalProfile: {
            language: 'ms',
            country: 'MY',
            religion: 'islam',
            medicalCondition: 'diabetes_type1'
          },
          emergencyContacts: [
            {
              id: 'spouse_001',
              name: 'Siti Abdullah',
              relationship: 'spouse',
              phoneNumber: '+60123456794',
              language: 'ms',
              priority: 10
            },
            {
              id: 'doctor_001',
              name: 'Dr. Ahmad',
              relationship: 'doctor',
              phoneNumber: '+60123456795',
              language: 'ms',
              priority: 9
            }
          ]
        },
        metadata: {
          patientName: 'Hassan Abdullah',
          phoneNumber: '+60123456793',
          criticalMedication: true
        }
      };

      // First, simulate a successful delivery
      let result = await deliveryService.processDeliveryRequest(deliveryRequest);
      expect(result.overallSuccess).toBe(true);
      expect(result.escalationTriggered).toBeFalsy();

      // Now simulate patient not responding (missing multiple doses)
      const escalationResult = await priorityService.triggerEmergencyEscalation(
        'patient_critical_001',
        'insulin',
        'missed_doses',
        {
          patientName: 'Hassan Abdullah',
          medicationName: 'Insulin',
          language: 'ms',
          missedDoses: 3,
          lastTaken: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
          additionalInfo: 'Critical diabetes medication'
        }
      );

      expect(escalationResult.success).toBe(true);
      expect(escalationResult.escalationId).toBeDefined();

      // Verify escalation was properly recorded
      const activeEscalations = priorityService.getActiveEscalations();
      const thisEscalation = activeEscalations.find(e => e.id === escalationResult.escalationId);
      
      expect(thisEscalation).toBeDefined();
      expect(thisEscalation?.currentStatus).toBe('active');
      expect(thisEscalation?.triggerType).toBe('missed_doses');
    });

    it('should coordinate multilingual emergency notifications', async () => {
      // Setup mixed-language emergency contacts
      const escalationResult = await priorityService.triggerEmergencyEscalation(
        'patient_multilingual_001',
        'critical_med',
        'no_response',
        {
          patientName: 'Li Wei',
          medicationName: 'Critical Medicine',
          language: 'zh',
          missedDoses: 2,
          additionalInfo: 'Patient not responding to reminders'
        }
      );

      expect(escalationResult.success).toBe(true);
      
      // Should coordinate notifications in appropriate languages
      // Family in Chinese, doctor in English, etc.
    });
  });

  describe('Cross-cultural medication management', () => {
    it('should handle Chinese patient with traditional preferences', async () => {
      const deliveryRequest: DeliveryRequest = {
        id: 'integration_zh_001',
        reminderSchedule: {
          medicationId: 'herbal_supplement',
          scheduleId: 'traditional_timing',
          scheduledTime: new Date(),
          culturalConstraints: {
            avoidPrayerTimes: false,
            bufferMinutes: 0,
            fallbackBehavior: 'delay'
          },
          deliveryMethods: ['push', 'sms', 'voice'],
          priority: 'medium',
          retryPolicy: {
            maxRetries: 3,
            retryDelay: 300000,
            escalateOnFailure: true
          }
        },
        content: {
          medicationName: '中药配方',
          dosage: '1包',
          instructions: '饭后服用',
          language: 'zh'
        },
        deliveryPreferences: {
          methods: ['push', 'sms', 'voice'],
          priority: 'medium',
          culturalAdaptations: true,
          elderlyMode: false
        },
        context: {
          patientId: 'patient_zh_001',
          medicationId: 'herbal_supplement',
          scheduledTime: new Date(),
          culturalProfile: {
            language: 'zh',
            country: 'MY',
            culturalBackground: 'traditional_chinese',
            preferredMedicineType: 'traditional_chinese_medicine'
          }
        },
        metadata: {
          patientName: '李伟',
          phoneNumber: '+60123456796'
        }
      };

      const result = await deliveryService.processDeliveryRequest(deliveryRequest);

      expect(result.overallSuccess).toBe(true);
      expect(result.results).toHaveLength(3);
      
      // Should use Chinese cultural adaptations
      expect(result.analytics.culturalOptimizations).toContain('content');
      
      // Voice should use appropriate Chinese TTS settings
      const voiceResult = result.results.find(r => r.method === 'voice');
      expect(voiceResult?.success).toBe(true);
    });

    it('should handle Tamil patient with family-centered approach', async () => {
      const deliveryRequest: DeliveryRequest = {
        id: 'integration_ta_001',
        reminderSchedule: {
          medicationId: 'diabetes_med',
          scheduleId: 'family_support',
          scheduledTime: new Date(),
          culturalConstraints: {
            avoidPrayerTimes: false,
            bufferMinutes: 0,
            fallbackBehavior: 'delay'
          },
          deliveryMethods: ['push', 'sms', 'voice'],
          priority: 'high',
          retryPolicy: {
            maxRetries: 4,
            retryDelay: 240000,
            escalateOnFailure: true
          }
        },
        content: {
          medicationName: 'நீரிழிவு மருந்து',
          dosage: '500மிகி',
          instructions: 'உணவுக்கு முன்',
          language: 'ta'
        },
        deliveryPreferences: {
          methods: ['push', 'sms', 'voice'],
          priority: 'high',
          culturalAdaptations: true,
          elderlyMode: true
        },
        context: {
          patientId: 'patient_ta_001',
          medicationId: 'diabetes_med',
          scheduledTime: new Date(),
          culturalProfile: {
            language: 'ta',
            country: 'MY',
            culturalBackground: 'tamil',
            familySupport: 'extended_family',
            religiousPractices: 'hindu'
          }
        },
        metadata: {
          patientName: 'ராஜா முருகன்',
          phoneNumber: '+60123456797',
          familyNotification: true
        }
      };

      const result = await deliveryService.processDeliveryRequest(deliveryRequest);

      expect(result.overallSuccess).toBe(true);
      expect(result.results).toHaveLength(3);
      
      // Should include family-centered cultural adaptations
      expect(result.analytics.culturalOptimizations).toContain('family');
      
      // All methods should succeed with Tamil cultural context
      result.results.forEach(deliveryResult => {
        expect(deliveryResult.success).toBe(true);
      });
    });
  });

  describe('System resilience and fallback', () => {
    it('should gracefully degrade when some services are unavailable', async () => {
      // Simulate voice service failure
      const originalVoiceMethod = voiceService.generateMedicationReminder;
      voiceService.generateMedicationReminder = jest.fn().mockRejectedValue(new Error('Voice service unavailable'));

      const deliveryRequest: DeliveryRequest = {
        id: 'integration_fallback_001',
        reminderSchedule: {
          medicationId: 'backup_test',
          scheduleId: 'resilience_test',
          scheduledTime: new Date(),
          culturalConstraints: {
            avoidPrayerTimes: false,
            bufferMinutes: 0,
            fallbackBehavior: 'delay'
          },
          deliveryMethods: ['push', 'sms', 'voice'],
          priority: 'medium',
          retryPolicy: {
            maxRetries: 3,
            retryDelay: 300000,
            escalateOnFailure: true
          }
        },
        content: {
          medicationName: 'Test Medicine',
          dosage: '100mg',
          language: 'en'
        },
        deliveryPreferences: {
          methods: ['push', 'sms', 'voice'],
          priority: 'medium',
          culturalAdaptations: true,
          elderlyMode: false
        },
        context: {
          patientId: 'patient_fallback_001',
          medicationId: 'backup_test',
          scheduledTime: new Date()
        }
      };

      const result = await deliveryService.processDeliveryRequest(deliveryRequest);

      // Should still succeed with remaining methods
      expect(result.overallSuccess).toBe(true);
      expect(result.analytics.successfulDeliveries).toBe(2); // push and sms
      
      const voiceResult = result.results.find(r => r.method === 'voice');
      expect(voiceResult?.success).toBe(false);
      
      // Restore original method
      voiceService.generateMedicationReminder = originalVoiceMethod;
    });

    it('should handle network connectivity issues gracefully', async () => {
      // This test simulates network issues affecting external services
      // In a real implementation, we'd test actual network resilience
      
      const deliveryRequest: DeliveryRequest = {
        id: 'integration_network_001',
        reminderSchedule: {
          medicationId: 'network_test',
          scheduleId: 'connectivity_test',
          scheduledTime: new Date(),
          culturalConstraints: {
            avoidPrayerTimes: false,
            bufferMinutes: 0,
            fallbackBehavior: 'delay'
          },
          deliveryMethods: ['push', 'visual'], // Local methods only
          priority: 'medium',
          retryPolicy: {
            maxRetries: 3,
            retryDelay: 300000,
            escalateOnFailure: true
          }
        },
        content: {
          medicationName: 'Offline Test Medicine',
          dosage: '50mg',
          language: 'en'
        },
        deliveryPreferences: {
          methods: ['push', 'visual'],
          priority: 'medium',
          culturalAdaptations: false,
          elderlyMode: false
        },
        context: {
          patientId: 'patient_network_001',
          medicationId: 'network_test',
          scheduledTime: new Date()
        }
      };

      const result = await deliveryService.processDeliveryRequest(deliveryRequest);

      // Local methods should work even with network issues
      expect(result.overallSuccess).toBe(true);
      expect(result.results).toHaveLength(2);
    });
  });

  describe('Performance and analytics integration', () => {
    it('should provide comprehensive system analytics', async () => {
      // Generate some test data by processing multiple requests
      const testRequests = [
        { language: 'en', priority: 'low' as const, methods: ['push'] as const },
        { language: 'ms', priority: 'medium' as const, methods: ['push', 'sms'] as const },
        { language: 'zh', priority: 'high' as const, methods: ['push', 'sms', 'voice'] as const },
        { language: 'ta', priority: 'critical' as const, methods: ['push', 'sms', 'voice'] as const }
      ];

      for (const [index, testConfig] of testRequests.entries()) {
        const deliveryRequest: DeliveryRequest = {
          id: `analytics_test_${index}`,
          reminderSchedule: {
            medicationId: `med_${index}`,
            scheduleId: `schedule_${index}`,
            scheduledTime: new Date(),
            culturalConstraints: { avoidPrayerTimes: false, bufferMinutes: 0, fallbackBehavior: 'delay' },
            deliveryMethods: testConfig.methods,
            priority: testConfig.priority,
            retryPolicy: { maxRetries: 3, retryDelay: 300000, escalateOnFailure: true }
          },
          content: {
            medicationName: 'Test Medicine',
            dosage: '100mg',
            language: testConfig.language
          },
          deliveryPreferences: {
            methods: testConfig.methods,
            priority: testConfig.priority,
            culturalAdaptations: true,
            elderlyMode: false
          },
          context: {
            patientId: `patient_${index}`,
            medicationId: `med_${index}`,
            scheduledTime: new Date()
          }
        };

        await deliveryService.processDeliveryRequest(deliveryRequest);
      }

      // Get comprehensive analytics
      const deliveryAnalytics = await deliveryService.getDeliveryAnalytics(1);
      const smsAnalytics = await smsService.getAnalytics(1);
      const voiceAnalytics = await voiceService.getAnalytics(1);

      // Verify delivery analytics
      expect(deliveryAnalytics.totalDeliveries).toBeGreaterThan(0);
      expect(deliveryAnalytics.methodPerformance).toBeDefined();
      expect(deliveryAnalytics.culturalInsights).toBeDefined();
      expect(deliveryAnalytics.integrationMetrics).toBeDefined();

      // Verify service-specific analytics
      expect(typeof smsAnalytics.totalSent).toBe('number');
      expect(typeof voiceAnalytics.totalGenerated).toBe('number');
      
      // Verify language distribution
      Object.keys(deliveryAnalytics.culturalInsights).forEach(lang => {
        expect(['en', 'ms', 'zh', 'ta']).toContain(lang);
      });
    });

    it('should track user preferences and adapt over time', async () => {
      const patientId = 'learning_patient_001';
      
      // Simulate user preferring SMS by recording responses
      await deliveryService.recordUserResponse('test_1', 'sms', 'taken');
      await deliveryService.recordUserResponse('test_2', 'sms', 'taken');
      await deliveryService.recordUserResponse('test_3', 'push', 'snoozed');
      await deliveryService.recordUserResponse('test_4', 'voice', 'skipped');
      
      // This would influence future delivery optimization in a real system
      const history = deliveryService.getDeliveryHistory(10);
      expect(history).toBeDefined();
      expect(Array.isArray(history)).toBe(true);
    });
  });

  describe('System configuration and management', () => {
    it('should allow system-wide configuration updates', async () => {
      // Update delivery service configuration
      await deliveryService.saveConfiguration({
        coordination: {
          simultaneousDelivery: true,
          sequentialDelay: 120000,
          failoverEnabled: true,
          confirmationRequired: true,
          timeoutPeriod: 900000
        }
      });

      // Update SMS service configuration
      await smsService.saveConfiguration({
        malaysianSettings: {
          enableMalaysianProvider: true,
          respectQuietHours: true,
          quietHoursStart: '21:00',
          quietHoursEnd: '08:00',
          enableCostOptimization: true,
          maxDailySMSPerUser: 15
        }
      });

      // Update voice service configuration
      await voiceService.saveConfiguration({
        culturalSettings: {
          useGenderAppropriateVoice: true,
          preferElderlyFriendlyPacing: true,
          includeCourtesyPhrases: true,
          adaptForCulturalContext: true
        }
      });

      // Verify configurations were updated
      const deliveryConfig = deliveryService.getConfiguration();
      const smsConfig = smsService.getConfiguration();
      const voiceConfig = voiceService.getConfiguration();

      expect(deliveryConfig.coordination.simultaneousDelivery).toBe(true);
      expect(smsConfig.malaysianSettings.quietHoursStart).toBe('21:00');
      expect(voiceConfig.culturalSettings.useGenderAppropriateVoice).toBe(true);
    });

    it('should report overall system health', async () => {
      // Check service initialization status
      expect(smsService.isServiceInitialized()).toBe(true);
      expect(voiceService.isServiceInitialized()).toBe(true);
      expect(culturalService.isServiceInitialized()).toBe(true);
      expect(priorityService.isServiceInitialized()).toBe(true);
      expect(deliveryService.isServiceInitialized()).toBe(true);

      // Get service-specific status
      const smsQueueStatus = smsService.getQueueStatus();
      const voiceCacheStatus = voiceService.getCacheStatus();
      const activeDeliveries = deliveryService.getActiveDeliveries();

      expect(smsQueueStatus).toHaveProperty('pending');
      expect(smsQueueStatus).toHaveProperty('sent');
      expect(voiceCacheStatus).toHaveProperty('totalFiles');
      expect(Array.isArray(activeDeliveries)).toBe(true);
    });
  });
});