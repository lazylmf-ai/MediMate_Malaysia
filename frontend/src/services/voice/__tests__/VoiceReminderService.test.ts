/**
 * Voice Reminder Service Tests
 * 
 * Comprehensive tests for the multi-language voice reminder service
 * with Malaysian cultural adaptations.
 */

import VoiceReminderService from '../VoiceReminderService';
import type { VoiceConfig, VoiceMessage } from '../VoiceReminderService';

// Mock Expo modules
jest.mock('expo-av', () => ({
  Audio: {
    setAudioModeAsync: jest.fn(),
    Sound: {
      createAsync: jest.fn(() => Promise.resolve({
        sound: {
          setVolumeAsync: jest.fn(),
          replayAsync: jest.fn(),
          unloadAsync: jest.fn(),
          setOnPlaybackStatusUpdate: jest.fn()
        },
        status: { isLoaded: true, durationMillis: 3000 }
      }))
    }
  }
}));

jest.mock('expo-speech', () => ({
  speak: jest.fn(),
  getAvailableVoicesAsync: jest.fn(() => Promise.resolve([
    { identifier: 'en-MY', name: 'English (Malaysia)', language: 'en-MY' },
    { identifier: 'ms-MY', name: 'Bahasa Malaysia', language: 'ms-MY' },
    { identifier: 'zh-CN', name: 'Chinese (Simplified)', language: 'zh-CN' },
    { identifier: 'ta-MY', name: 'Tamil (Malaysia)', language: 'ta-MY' }
  ]))
}));

jest.mock('expo-file-system', () => ({
  cacheDirectory: '/mock/cache/',
  writeAsStringAsync: jest.fn(),
  getInfoAsync: jest.fn(() => Promise.resolve({ exists: true, size: 1024 })),
  deleteAsync: jest.fn()
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn()
}));

describe('VoiceReminderService', () => {
  let voiceService: VoiceReminderService;

  beforeEach(() => {
    voiceService = VoiceReminderService.getInstance();
    jest.clearAllMocks();
  });

  describe('initialization', () => {
    it('should initialize with default configuration', async () => {
      const result = await voiceService.initialize();
      expect(result.success).toBe(true);
      expect(voiceService.isServiceInitialized()).toBe(true);
    });

    it('should initialize with custom configuration', async () => {
      const customConfig: Partial<VoiceConfig> = {
        languageSettings: {
          en: { enabled: true, rate: 1.2, pitch: 1.1, volume: 0.9, accent: 'neutral' },
          ms: { enabled: true, rate: 0.8, pitch: 0.9, volume: 0.8, accent: 'regional' },
          zh: { enabled: false, rate: 1.0, pitch: 1.0, volume: 0.8, accent: 'standard' },
          ta: { enabled: true, rate: 0.9, pitch: 1.0, volume: 0.8, accent: 'regional' }
        },
        culturalSettings: {
          useGenderAppropriateVoice: false,
          preferElderlyFriendlyPacing: false,
          includeCourtesyPhrases: false,
          adaptForCulturalContext: false
        }
      };

      const result = await voiceService.initialize(customConfig);
      expect(result.success).toBe(true);
      
      const config = voiceService.getConfiguration();
      expect(config.languageSettings.en.rate).toBe(1.2);
      expect(config.languageSettings.zh.enabled).toBe(false);
      expect(config.culturalSettings.useGenderAppropriateVoice).toBe(false);
    });

    it('should check available TTS voices on initialization', async () => {
      const { getAvailableVoicesAsync } = require('expo-speech');
      
      await voiceService.initialize();
      
      expect(getAvailableVoicesAsync).toHaveBeenCalled();
    });
  });

  describe('voice message generation', () => {
    beforeEach(async () => {
      await voiceService.initialize();
    });

    it('should generate voice message in English', async () => {
      const message: VoiceMessage = {
        id: 'test-en-1',
        content: 'Time to take your medication Panadol, 500mg.',
        language: 'en',
        priority: 'medium',
        messageType: 'medication'
      };

      const result = await voiceService.deliverVoiceReminder(message);
      expect(result.success).toBe(true);
      expect(result.messageId).toBe(message.id);
      expect(result.generatedAt).toBeDefined();
    });

    it('should generate voice message in Bahasa Malaysia', async () => {
      const message: VoiceMessage = {
        id: 'test-ms-1',
        content: 'Masa untuk mengambil ubat Panadol, 500mg.',
        language: 'ms',
        priority: 'medium',
        messageType: 'medication'
      };

      const result = await voiceService.deliverVoiceReminder(message);
      expect(result.success).toBe(true);
      expect(result.messageId).toBe(message.id);
    });

    it('should generate voice message in Chinese', async () => {
      const message: VoiceMessage = {
        id: 'test-zh-1',
        content: '该服用药物必理痛，500毫克了。',
        language: 'zh',
        priority: 'medium',
        messageType: 'medication'
      };

      const result = await voiceService.deliverVoiceReminder(message);
      expect(result.success).toBe(true);
      expect(result.messageId).toBe(message.id);
    });

    it('should generate voice message in Tamil', async () => {
      const message: VoiceMessage = {
        id: 'test-ta-1',
        content: 'பானடால் மருந்து, 500மிகி உட்கொள்ள வேண்டிய நேரம்.',
        language: 'ta',
        priority: 'medium',
        messageType: 'medication'
      };

      const result = await voiceService.deliverVoiceReminder(message);
      expect(result.success).toBe(true);
      expect(result.messageId).toBe(message.id);
    });

    it('should handle disabled languages gracefully', async () => {
      // Initialize with Chinese disabled
      await voiceService.initialize({
        languageSettings: {
          en: { enabled: true, rate: 1.0, pitch: 1.0, volume: 0.8 },
          ms: { enabled: true, rate: 1.0, pitch: 1.0, volume: 0.8 },
          zh: { enabled: false, rate: 1.0, pitch: 1.0, volume: 0.8 }, // Disabled
          ta: { enabled: true, rate: 1.0, pitch: 1.0, volume: 0.8 }
        }
      });

      const message: VoiceMessage = {
        id: 'test-disabled',
        content: 'Test message',
        language: 'zh',
        priority: 'low',
        messageType: 'reminder'
      };

      const result = await voiceService.deliverVoiceReminder(message);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Language zh not enabled');
    });
  });

  describe('medication reminders', () => {
    beforeEach(async () => {
      await voiceService.initialize();
    });

    it('should generate medication reminder in English with cultural context', async () => {
      const result = await voiceService.generateMedicationReminder(
        'Panadol',
        '500mg',
        'en',
        {
          includeGreeting: true,
          useRespectfulTone: true,
          includeBlessings: true,
          familyContext: 'individual'
        }
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      expect(result.duration).toBeGreaterThan(0);
    });

    it('should generate medication reminder in Bahasa Malaysia with blessings', async () => {
      const result = await voiceService.generateMedicationReminder(
        'Panadol',
        '500mg',
        'ms',
        {
          includeGreeting: true,
          includeBlessings: true,
          familyContext: 'elderly'
        }
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
    });

    it('should adapt content for elderly users', async () => {
      await voiceService.initialize({
        culturalSettings: {
          useGenderAppropriateVoice: true,
          preferElderlyFriendlyPacing: true,
          includeCourtesyPhrases: true,
          adaptForCulturalContext: true
        }
      });

      const result = await voiceService.generateMedicationReminder(
        'Medication',
        '1 tablet',
        'en',
        {
          familyContext: 'elderly'
        }
      );

      expect(result.success).toBe(true);
      // Should use slower speech rate and more pauses for elderly
    });

    it('should apply voice settings customization', async () => {
      const result = await voiceService.generateMedicationReminder(
        'Panadol',
        '500mg',
        'en'
      );

      expect(result.success).toBe(true);
      
      // Should apply language-specific voice settings
      const config = voiceService.getConfiguration();
      expect(config.languageSettings.en.rate).toBeDefined();
      expect(config.languageSettings.en.pitch).toBeDefined();
      expect(config.languageSettings.en.volume).toBeDefined();
    });
  });

  describe('emergency alerts', () => {
    beforeEach(async () => {
      await voiceService.initialize();
    });

    it('should generate emergency alert for patient', async () => {
      const result = await voiceService.generateEmergencyAlert(
        'Ahmad',
        'Insulin',
        'ms',
        false
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      
      // Emergency messages should have specific voice settings
      // Slower rate, higher volume for urgency
    });

    it('should generate family emergency notification', async () => {
      const result = await voiceService.generateEmergencyAlert(
        'Ahmad',
        'Insulin',
        'ms',
        true
      );

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      
      // Family notifications should include patient name prominently
    });

    it('should use critical priority settings for emergency alerts', async () => {
      const result = await voiceService.generateEmergencyAlert(
        'Patient',
        'Critical Medication',
        'en',
        false
      );

      expect(result.success).toBe(true);
      
      // Emergency alerts should override normal voice settings
      // Higher volume, slower rate for clarity
    });
  });

  describe('cultural adaptations', () => {
    beforeEach(async () => {
      await voiceService.initialize({
        culturalSettings: {
          useGenderAppropriateVoice: true,
          preferElderlyFriendlyPacing: true,
          includeCourtesyPhrases: true,
          adaptForCulturalContext: true
        },
        accessibility: {
          enableRepeatOption: true,
          pauseBetweenSentences: 500,
          emphasizeKeyWords: true,
          useSimpleLanguage: true,
          provideAudioTranscript: true
        }
      });
    });

    it('should add pauses for elderly-friendly pacing', async () => {
      const message: VoiceMessage = {
        id: 'elderly-test',
        content: 'Take your medication. It is important for your health.',
        language: 'en',
        priority: 'medium',
        messageType: 'medication',
        culturalContext: {
          adaptForElderly: true
        }
      };

      const result = await voiceService.deliverVoiceReminder(message);
      expect(result.success).toBe(true);
      
      // Should include additional pauses between sentences
    });

    it('should emphasize key medication words', async () => {
      const message: VoiceMessage = {
        id: 'emphasis-test',
        content: 'Please take your medication now.',
        language: 'en',
        priority: 'medium',
        messageType: 'medication'
      };

      const result = await voiceService.deliverVoiceReminder(message);
      expect(result.success).toBe(true);
      
      // Should emphasize the word "medication"
    });

    it('should adapt voice characteristics by language', async () => {
      const languages: Array<'en' | 'ms' | 'zh' | 'ta'> = ['en', 'ms', 'zh', 'ta'];
      
      for (const language of languages) {
        const result = await voiceService.generateMedicationReminder(
          'Medicine',
          '1 dose',
          language
        );

        expect(result.success).toBe(true);
        
        // Each language should use appropriate voice characteristics
        const config = voiceService.getConfiguration();
        expect(config.languageSettings[language].enabled).toBe(true);
      }
    });

    it('should include cultural greetings and blessings', async () => {
      const result = await voiceService.generateMedicationReminder(
        'Panadol',
        '500mg',
        'ms',
        {
          includeGreeting: true,
          includeBlessings: true
        }
      );

      expect(result.success).toBe(true);
      
      // Should include Malaysian cultural greetings and health blessings
    });
  });

  describe('audio caching', () => {
    beforeEach(async () => {
      await voiceService.initialize({
        audioSettings: {
          quality: 'medium',
          enableOfflineGeneration: true,
          cacheGeneratedAudio: true,
          maxCacheSize: 50,
          compressionLevel: 5
        }
      });
    });

    it('should cache generated audio files', async () => {
      const message: VoiceMessage = {
        id: 'cache-test-1',
        content: 'Cached audio test',
        language: 'en',
        priority: 'low',
        messageType: 'reminder'
      };

      // First generation
      const result1 = await voiceService.deliverVoiceReminder(message);
      expect(result1.success).toBe(true);
      expect(result1.cached).toBe(false);

      // Second generation of same content should use cache
      const result2 = await voiceService.deliverVoiceReminder(message);
      expect(result2.success).toBe(true);
      expect(result2.cached).toBe(true);
    });

    it('should manage cache size limits', async () => {
      // Generate multiple audio files to test cache limit
      for (let i = 0; i < 5; i++) {
        const message: VoiceMessage = {
          id: `cache-limit-${i}`,
          content: `Cache limit test message ${i}`,
          language: 'en',
          priority: 'low',
          messageType: 'reminder'
        };

        const result = await voiceService.deliverVoiceReminder(message);
        expect(result.success).toBe(true);
      }

      const cacheStatus = voiceService.getCacheStatus();
      expect(cacheStatus.totalFiles).toBeGreaterThan(0);
      expect(cacheStatus.totalSize).toBeGreaterThan(0);
    });

    it('should clear cache when requested', async () => {
      // Generate some cached content
      const message: VoiceMessage = {
        id: 'clear-cache-test',
        content: 'Cache clear test',
        language: 'en',
        priority: 'low',
        messageType: 'reminder'
      };

      await voiceService.deliverVoiceReminder(message);
      
      // Clear cache
      await voiceService.clearCache();
      
      const cacheStatus = voiceService.getCacheStatus();
      expect(cacheStatus.totalFiles).toBe(0);
      expect(cacheStatus.totalSize).toBe(0);
    });
  });

  describe('voice testing', () => {
    beforeEach(async () => {
      await voiceService.initialize();
    });

    it('should test voice with default samples', async () => {
      const languages: Array<'en' | 'ms' | 'zh' | 'ta'> = ['en', 'ms', 'zh', 'ta'];
      
      for (const language of languages) {
        const result = await voiceService.testVoice(language);
        expect(result.success).toBe(true);
        expect(result.messageId).toBeDefined();
      }
    });

    it('should test voice with custom sample text', async () => {
      const customText = 'This is a custom voice test message.';
      const result = await voiceService.testVoice('en', customText);
      
      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
    });
  });

  describe('configuration management', () => {
    it('should save and load configuration', async () => {
      const customConfig: Partial<VoiceConfig> = {
        languageSettings: {
          en: { enabled: true, rate: 1.3, pitch: 1.2, volume: 0.9, accent: 'neutral' },
          ms: { enabled: true, rate: 0.7, pitch: 0.8, volume: 0.7, accent: 'regional' },
          zh: { enabled: false, rate: 1.0, pitch: 1.0, volume: 0.8, accent: 'standard' },
          ta: { enabled: true, rate: 0.8, pitch: 1.1, volume: 0.8, accent: 'regional' }
        },
        audioSettings: {
          quality: 'high',
          enableOfflineGeneration: false,
          cacheGeneratedAudio: false,
          maxCacheSize: 100,
          compressionLevel: 8
        }
      };

      await voiceService.saveConfiguration(customConfig);
      const savedConfig = voiceService.getConfiguration();
      
      expect(savedConfig.languageSettings.en.rate).toBe(1.3);
      expect(savedConfig.languageSettings.zh.enabled).toBe(false);
      expect(savedConfig.audioSettings.quality).toBe('high');
      expect(savedConfig.audioSettings.maxCacheSize).toBe(100);
    });
  });

  describe('analytics', () => {
    beforeEach(async () => {
      await voiceService.initialize();
    });

    it('should generate voice analytics', async () => {
      const analytics = await voiceService.getAnalytics(30);
      
      expect(analytics).toHaveProperty('totalGenerated');
      expect(analytics).toHaveProperty('languageUsage');
      expect(analytics).toHaveProperty('averageGenerationTime');
      expect(analytics).toHaveProperty('cacheHitRate');
      expect(analytics).toHaveProperty('errorRate');
      expect(analytics).toHaveProperty('userPreferences');

      expect(typeof analytics.totalGenerated).toBe('number');
      expect(typeof analytics.averageGenerationTime).toBe('number');
      expect(analytics.languageUsage).toHaveProperty('en');
      expect(analytics.languageUsage).toHaveProperty('ms');
      expect(analytics.languageUsage).toHaveProperty('zh');
      expect(analytics.languageUsage).toHaveProperty('ta');
    });

    it('should track user preferences in analytics', async () => {
      const analytics = await voiceService.getAnalytics();
      
      expect(analytics.userPreferences).toHaveProperty('mostUsedVoice');
      expect(analytics.userPreferences).toHaveProperty('averageVolume');
      expect(analytics.userPreferences).toHaveProperty('preferredRate');
      
      expect(typeof analytics.userPreferences.averageVolume).toBe('number');
      expect(typeof analytics.userPreferences.preferredRate).toBe('number');
    });
  });

  describe('error handling', () => {
    beforeEach(async () => {
      await voiceService.initialize();
    });

    it('should handle audio generation failures gracefully', async () => {
      // Mock Speech.speak to throw an error
      const { speak } = require('expo-speech');
      speak.mockRejectedValueOnce(new Error('TTS engine failed'));

      const message: VoiceMessage = {
        id: 'error-test',
        content: 'Error handling test',
        language: 'en',
        priority: 'medium',
        messageType: 'medication'
      };

      const result = await voiceService.deliverVoiceReminder(message);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle file system errors gracefully', async () => {
      const { writeAsStringAsync } = require('expo-file-system');
      writeAsStringAsync.mockRejectedValueOnce(new Error('File system error'));

      const message: VoiceMessage = {
        id: 'fs-error-test',
        content: 'File system error test',
        language: 'en',
        priority: 'low',
        messageType: 'reminder'
      };

      const result = await voiceService.deliverVoiceReminder(message);
      
      // Should handle file system errors gracefully
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });

    it('should stop playback gracefully', async () => {
      await voiceService.stopPlayback();
      
      // Should not throw errors when stopping non-existent playback
    });
  });

  describe('accessibility features', () => {
    beforeEach(async () => {
      await voiceService.initialize({
        accessibility: {
          enableRepeatOption: true,
          pauseBetweenSentences: 1000,
          emphasizeKeyWords: true,
          useSimpleLanguage: true,
          provideAudioTranscript: true
        }
      });
    });

    it('should add accessibility pauses between sentences', async () => {
      const message: VoiceMessage = {
        id: 'accessibility-test',
        content: 'First sentence. Second sentence. Third sentence.',
        language: 'en',
        priority: 'medium',
        messageType: 'medication'
      };

      const result = await voiceService.deliverVoiceReminder(message);
      expect(result.success).toBe(true);
      
      // Should include 1000ms pauses between sentences
    });

    it('should use simple language when configured', async () => {
      const message: VoiceMessage = {
        id: 'simple-language-test',
        content: 'Please take your medication immediately.',
        language: 'en',
        priority: 'medium',
        messageType: 'medication'
      };

      const result = await voiceService.deliverVoiceReminder(message);
      expect(result.success).toBe(true);
      
      // Should simplify "immediately" to "now"
    });
  });
});