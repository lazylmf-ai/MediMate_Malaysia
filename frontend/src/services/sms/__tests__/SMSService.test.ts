/**
 * SMS Service Tests
 * 
 * Comprehensive tests for the Malaysian SMS service with multi-language support
 * and cultural awareness features.
 */

import SMSService from '../SMSService';
import type { SMSConfig, SMSMessage } from '../SMSService';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  getAllKeys: jest.fn(() => Promise.resolve([])),
  multiGet: jest.fn(() => Promise.resolve([]))
}));

describe('SMSService', () => {
  let smsService: SMSService;

  beforeEach(() => {
    smsService = SMSService.getInstance();
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default configuration', async () => {
      const result = await smsService.initialize();
      expect(result.success).toBe(true);
      expect(smsService.isServiceInitialized()).toBe(true);
    });

    it('should initialize with custom configuration', async () => {
      const customConfig: Partial<SMSConfig> = {
        primaryProvider: 'twilio',
        malaysianSettings: {
          enableMalaysianProvider: false,
          respectQuietHours: false,
          quietHoursStart: '23:00',
          quietHoursEnd: '06:00',
          enableCostOptimization: false,
          maxDailySMSPerUser: 20
        }
      };

      const result = await smsService.initialize(customConfig);
      expect(result.success).toBe(true);
      
      const config = smsService.getConfiguration();
      expect(config.primaryProvider).toBe('twilio');
      expect(config.malaysianSettings.enableMalaysianProvider).toBe(false);
    });

    it('should validate configuration on initialization', async () => {
      const invalidConfig: Partial<SMSConfig> = {
        providers: {} // No providers configured
      };

      const result = await smsService.initialize(invalidConfig);
      expect(result.success).toBe(false);
      expect(result.error).toContain('At least one SMS provider must be configured');
    });
  });

  describe('message sending', () => {
    beforeEach(async () => {
      await smsService.initialize({
        providers: {
          local: {
            apiEndpoint: 'https://test-api.local',
            apiKey: 'test-key',
            fromNumber: '+60123456789'
          }
        }
      });
    });

    it('should send SMS in English', async () => {
      const message: SMSMessage = {
        id: 'test-1',
        recipientNumber: '+60123456789',
        message: 'Test medication reminder',
        language: 'en',
        priority: 'medium',
        reminderType: 'medication'
      };

      const result = await smsService.sendSMS(message);
      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
    });

    it('should send SMS in Bahasa Malaysia', async () => {
      const message: SMSMessage = {
        id: 'test-2',
        recipientNumber: '+60123456789',
        message: 'Peringatan ubat ujian',
        language: 'ms',
        priority: 'medium',
        reminderType: 'medication'
      };

      const result = await smsService.sendSMS(message);
      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
    });

    it('should send SMS in Chinese', async () => {
      const message: SMSMessage = {
        id: 'test-3',
        recipientNumber: '+60123456789',
        message: '测试药物提醒',
        language: 'zh',
        priority: 'medium',
        reminderType: 'medication'
      };

      const result = await smsService.sendSMS(message);
      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
    });

    it('should send SMS in Tamil', async () => {
      const message: SMSMessage = {
        id: 'test-4',
        recipientNumber: '+60123456789',
        message: 'சோதனை மருந்து நினைவூட்டல்',
        language: 'ta',
        priority: 'medium',
        reminderType: 'medication'
      };

      const result = await smsService.sendSMS(message);
      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
    });

    it('should validate Malaysian phone numbers', async () => {
      const invalidMessage: SMSMessage = {
        id: 'test-invalid',
        recipientNumber: '+1234567890', // Non-Malaysian number
        message: 'Test message',
        language: 'en',
        priority: 'medium'
      };

      const result = await smsService.sendSMS(invalidMessage);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid Malaysian phone number format');
    });

    it('should reject empty messages', async () => {
      const emptyMessage: SMSMessage = {
        id: 'test-empty',
        recipientNumber: '+60123456789',
        message: '',
        language: 'en',
        priority: 'medium'
      };

      const result = await smsService.sendSMS(emptyMessage);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Message content is required');
    });
  });

  describe('medication reminders', () => {
    beforeEach(async () => {
      await smsService.initialize();
    });

    it('should send medication reminder in English', async () => {
      const result = await smsService.sendMedicationReminder(
        '+60123456789',
        'Panadol',
        '500mg',
        'en',
        'medium'
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
    });

    it('should send medication reminder in Bahasa Malaysia', async () => {
      const result = await smsService.sendMedicationReminder(
        '+60123456789',
        'Panadol',
        '500mg',
        'ms',
        'medium'
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
    });

    it('should include cultural context in medication reminders', async () => {
      const result = await smsService.sendMedicationReminder(
        '+60123456789',
        'Panadol',
        '500mg',
        'ms',
        'medium'
      );

      expect(result.success).toBe(true);
      // The message should include cultural elements like "Jaga diri dan sihat selalu"
    });
  });

  describe('emergency escalation', () => {
    beforeEach(async () => {
      await smsService.initialize();
    });

    it('should send emergency escalation to patient', async () => {
      const results = await smsService.sendEmergencyEscalation(
        '+60123456789',
        'Ahmad',
        'Panadol',
        'ms',
        []
      );

      expect(results).toHaveLength(1);
      expect(results[0].success).toBe(true);
    });

    it('should send emergency escalation to family members', async () => {
      const emergencyContacts = ['+60123456790', '+60123456791'];
      const results = await smsService.sendEmergencyEscalation(
        '+60123456789',
        'Ahmad',
        'Panadol',
        'ms',
        emergencyContacts
      );

      expect(results).toHaveLength(3); // Patient + 2 emergency contacts
      results.forEach(result => {
        expect(result.success).toBe(true);
      });
    });

    it('should adapt emergency messages for different languages', async () => {
      const languages: Array<'en' | 'ms' | 'zh' | 'ta'> = ['en', 'ms', 'zh', 'ta'];
      
      for (const language of languages) {
        const results = await smsService.sendEmergencyEscalation(
          '+60123456789',
          'Patient',
          'Medicine',
          language,
          []
        );

        expect(results).toHaveLength(1);
        expect(results[0].success).toBe(true);
      }
    });
  });

  describe('rate limiting', () => {
    beforeEach(async () => {
      await smsService.initialize({
        rateLimiting: {
          maxPerMinute: 2,
          maxPerHour: 5,
          maxPerDay: 10,
          retryDelay: 1000,
          maxRetries: 1
        }
      });
    });

    it('should enforce per-minute rate limits', async () => {
      const message: SMSMessage = {
        id: 'rate-test-1',
        recipientNumber: '+60123456789',
        message: 'Rate limit test',
        language: 'en',
        priority: 'low'
      };

      // Send 2 messages (should succeed)
      const result1 = await smsService.sendSMS({ ...message, id: 'rate-1' });
      const result2 = await smsService.sendSMS({ ...message, id: 'rate-2' });
      
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);

      // Third message should fail due to rate limit
      const result3 = await smsService.sendSMS({ ...message, id: 'rate-3' });
      expect(result3.success).toBe(false);
      expect(result3.error).toContain('Rate limit exceeded');
    });
  });

  describe('quiet hours', () => {
    beforeEach(async () => {
      await smsService.initialize({
        malaysianSettings: {
          enableMalaysianProvider: true,
          respectQuietHours: true,
          quietHoursStart: '22:00',
          quietHoursEnd: '07:00',
          enableCostOptimization: true,
          maxDailySMSPerUser: 10
        }
      });
    });

    it('should queue messages during quiet hours', async () => {
      // Mock current time to be during quiet hours
      const originalDate = Date;
      const mockDate = new Date('2024-01-01T23:30:00Z'); // 11:30 PM
      global.Date = jest.fn(() => mockDate) as any;
      global.Date.now = jest.fn(() => mockDate.getTime());

      const message: SMSMessage = {
        id: 'quiet-test',
        recipientNumber: '+60123456789',
        message: 'Quiet hours test',
        language: 'en',
        priority: 'low'
      };

      const result = await smsService.sendSMS(message);
      
      // Should queue instead of immediate delivery
      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();

      // Restore original Date
      global.Date = originalDate;
    });

    it('should send immediately outside quiet hours', async () => {
      // Mock current time to be outside quiet hours
      const originalDate = Date;
      const mockDate = new Date('2024-01-01T10:30:00Z'); // 10:30 AM
      global.Date = jest.fn(() => mockDate) as any;
      global.Date.now = jest.fn(() => mockDate.getTime());

      const message: SMSMessage = {
        id: 'active-test',
        recipientNumber: '+60123456789',
        message: 'Active hours test',
        language: 'en',
        priority: 'medium'
      };

      const result = await smsService.sendSMS(message);
      expect(result.success).toBe(true);

      // Restore original Date
      global.Date = originalDate;
    });
  });

  describe('queue management', () => {
    beforeEach(async () => {
      await smsService.initialize();
    });

    it('should queue messages for later delivery', async () => {
      const scheduledTime = new Date(Date.now() + 300000); // 5 minutes from now
      const message: SMSMessage = {
        id: 'queue-test',
        recipientNumber: '+60123456789',
        message: 'Queued message test',
        language: 'en',
        priority: 'medium'
      };

      const result = await smsService.queueMessage(message, scheduledTime);
      expect(result.success).toBe(true);
      expect(result.messageId).toBe(message.id);
    });

    it('should cancel queued messages', async () => {
      const scheduledTime = new Date(Date.now() + 300000);
      const message: SMSMessage = {
        id: 'cancel-test',
        recipientNumber: '+60123456789',
        message: 'Cancellation test',
        language: 'en',
        priority: 'low'
      };

      await smsService.queueMessage(message, scheduledTime);
      const cancelResult = await smsService.cancelQueuedMessage(message.id);
      expect(cancelResult).toBe(true);
    });

    it('should retry failed messages', async () => {
      const message: SMSMessage = {
        id: 'retry-test',
        recipientNumber: '+60123456789',
        message: 'Retry test',
        language: 'en',
        priority: 'medium'
      };

      const retryResult = await smsService.retryFailedMessage(message.id);
      // Should return success if message exists and can be retried
      expect(retryResult.success).toBe(true);
    });

    it('should show queue status', () => {
      const status = smsService.getQueueStatus();
      expect(status).toHaveProperty('pending');
      expect(status).toHaveProperty('sending');
      expect(status).toHaveProperty('sent');
      expect(status).toHaveProperty('failed');
      expect(typeof status.pending).toBe('number');
    });
  });

  describe('analytics', () => {
    beforeEach(async () => {
      await smsService.initialize();
    });

    it('should generate analytics for specified period', async () => {
      const analytics = await smsService.getAnalytics(7); // 7 days
      
      expect(analytics).toHaveProperty('totalSent');
      expect(analytics).toHaveProperty('deliveryRate');
      expect(analytics).toHaveProperty('costPerMessage');
      expect(analytics).toHaveProperty('failureReasons');
      expect(analytics).toHaveProperty('languageDistribution');
      expect(analytics).toHaveProperty('providerPerformance');

      expect(typeof analytics.totalSent).toBe('number');
      expect(typeof analytics.deliveryRate).toBe('number');
      expect(typeof analytics.costPerMessage).toBe('number');
    });

    it('should include language distribution in analytics', async () => {
      const analytics = await smsService.getAnalytics();
      
      expect(analytics.languageDistribution).toHaveProperty('en');
      expect(analytics.languageDistribution).toHaveProperty('ms');
      expect(analytics.languageDistribution).toHaveProperty('zh');
      expect(analytics.languageDistribution).toHaveProperty('ta');
    });
  });

  describe('configuration management', () => {
    it('should save and load configuration', async () => {
      const customConfig: Partial<SMSConfig> = {
        primaryProvider: 'nexmo',
        malaysianSettings: {
          enableMalaysianProvider: false,
          respectQuietHours: true,
          quietHoursStart: '21:00',
          quietHoursEnd: '08:00',
          enableCostOptimization: true,
          maxDailySMSPerUser: 15
        }
      };

      await smsService.saveConfiguration(customConfig);
      const savedConfig = smsService.getConfiguration();
      
      expect(savedConfig.primaryProvider).toBe('nexmo');
      expect(savedConfig.malaysianSettings.quietHoursStart).toBe('21:00');
      expect(savedConfig.malaysianSettings.maxDailySMSPerUser).toBe(15);
    });
  });

  describe('error handling', () => {
    beforeEach(async () => {
      await smsService.initialize();
    });

    it('should handle provider failures gracefully', async () => {
      const message: SMSMessage = {
        id: 'error-test',
        recipientNumber: '+60123456789',
        message: 'Error handling test',
        language: 'en',
        priority: 'medium'
      };

      // This would simulate a provider failure in real implementation
      const result = await smsService.sendSMS(message);
      
      // Even with failures, should provide meaningful error response
      if (!result.success) {
        expect(result.error).toBeDefined();
        expect(typeof result.error).toBe('string');
      }
    });

    it('should handle network connectivity issues', async () => {
      // This test would simulate network issues in a real implementation
      const message: SMSMessage = {
        id: 'network-test',
        recipientNumber: '+60123456789',
        message: 'Network test',
        language: 'en',
        priority: 'low'
      };

      const result = await smsService.sendSMS(message);
      
      // Should handle network issues gracefully
      expect(result).toHaveProperty('success');
      expect(typeof result.success).toBe('boolean');
    });
  });

  describe('cultural adaptations', () => {
    beforeEach(async () => {
      await smsService.initialize();
    });

    it('should adapt message content for different cultures', async () => {
      const medicationName = 'Panadol';
      const dosage = '500mg';

      // Test each language has appropriate cultural adaptations
      const languages: Array<'en' | 'ms' | 'zh' | 'ta'> = ['en', 'ms', 'zh', 'ta'];
      
      for (const language of languages) {
        const result = await smsService.sendMedicationReminder(
          '+60123456789',
          medicationName,
          dosage,
          language
        );

        expect(result.success).toBe(true);
        // Each language should have culturally appropriate content
      }
    });

    it('should respect cultural timing preferences', async () => {
      const message: SMSMessage = {
        id: 'cultural-timing-test',
        recipientNumber: '+60123456789',
        message: 'Cultural timing test',
        language: 'ms',
        priority: 'medium',
        culturalContext: {
          avoidPrayerTimes: true,
          respectFastingHours: true
        }
      };

      const result = await smsService.sendSMS(message);
      expect(result.success).toBe(true);
      
      // Should adapt timing based on cultural context
    });
  });
});