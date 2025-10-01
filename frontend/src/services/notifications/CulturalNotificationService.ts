/**
 * Cultural Notification Service
 * 
 * Enhances Expo Notifications with Malaysian cultural features:
 * - Cultural custom sounds and vibration patterns
 * - Language-appropriate notification styling
 * - Cultural imagery and iconography
 * - Prayer time and festival awareness
 * - Family-friendly notification modes
 */

import * as Notifications from 'expo-notifications';
import * as Haptics from 'expo-haptics';
import { Audio } from 'expo-av';
import { Vibration, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { SupportedLanguage } from '@/i18n/translations';

export interface CulturalNotificationConfig {
  // Sound preferences by culture
  soundSettings: {
    [K in SupportedLanguage]: {
      enabled: boolean;
      soundTheme: 'gentle' | 'traditional' | 'modern' | 'nature';
      volume: number;
      customSoundPath?: string;
    };
  };
  
  // Vibration patterns by culture
  vibrationSettings: {
    [K in SupportedLanguage]: {
      enabled: boolean;
      pattern: 'gentle' | 'rhythmic' | 'urgent' | 'traditional';
      intensity: 'light' | 'medium' | 'strong';
    };
  };
  
  // Cultural visual elements
  visualSettings: {
    useTraditionalColors: boolean;
    includeCulturalSymbols: boolean;
    adaptForElders: boolean;
    respectReligiousSymbols: boolean;
  };
  
  // Contextual awareness
  contextualSettings: {
    avoidDuringPrayer: boolean;
    adaptForFestivals: boolean;
    respectQuietHours: boolean;
    familyModeEnabled: boolean;
  };
}

export interface CulturalNotification {
  id: string;
  title: string;
  body: string;
  language: SupportedLanguage;
  priority: 'low' | 'medium' | 'high' | 'critical';
  
  // Cultural context
  culturalContext: {
    includeTraditionalGreeting?: boolean;
    useRespectfulTone?: boolean;
    includeCulturalEmoji?: boolean;
    adaptForElderly?: boolean;
  };
  
  // Delivery preferences
  deliveryPreferences: {
    preferredSound?: string;
    vibrationPattern?: string;
    visualStyle?: 'minimal' | 'standard' | 'rich';
    repeatCount?: number;
  };
  
  // Metadata
  medicationId?: string;
  reminderType?: 'medication' | 'adherence_check' | 'emergency' | 'family_alert';
  scheduledFor?: Date;
  metadata?: Record<string, any>;
}

export interface NotificationDeliveryResult {
  success: boolean;
  notificationId?: string;
  deliveryMethod: 'push' | 'sound' | 'vibration' | 'visual';
  culturalAdaptations?: string[];
  error?: string;
  deliveredAt?: Date;
}

// Cultural sound themes
const CULTURAL_SOUNDS = {
  en: {
    gentle: require('@/assets/sounds/en/gentle-chime.mp3'),
    traditional: require('@/assets/sounds/en/bell-tone.mp3'),
    modern: require('@/assets/sounds/en/digital-alert.mp3'),
    nature: require('@/assets/sounds/en/bird-chirp.mp3')
  },
  ms: {
    gentle: require('@/assets/sounds/ms/soft-gong.mp3'),
    traditional: require('@/assets/sounds/ms/gamelan-chime.mp3'),
    modern: require('@/assets/sounds/ms/modern-tone.mp3'),
    nature: require('@/assets/sounds/ms/rain-drops.mp3')
  },
  zh: {
    gentle: require('@/assets/sounds/zh/bamboo-chime.mp3'),
    traditional: require('@/assets/sounds/zh/temple-bell.mp3'),
    modern: require('@/assets/sounds/zh/electronic-tone.mp3'),
    nature: require('@/assets/sounds/zh/water-flow.mp3')
  },
  ta: {
    gentle: require('@/assets/sounds/ta/veena-note.mp3'),
    traditional: require('@/assets/sounds/ta/temple-bell.mp3'),
    modern: require('@/assets/sounds/ta/digital-chime.mp3'),
    nature: require('@/assets/sounds/ta/bird-song.mp3')
  }
};

// Cultural vibration patterns (in milliseconds)
const VIBRATION_PATTERNS = {
  gentle: [100, 200, 100],
  rhythmic: [200, 100, 200, 100, 200],
  urgent: [500, 200, 500, 200, 500],
  traditional: [300, 150, 100, 150, 300, 150, 100]
};

// Cultural emojis for each language
const CULTURAL_EMOJIS = {
  en: {
    medication: '💊',
    health: '🏥',
    care: '❤️',
    time: '⏰',
    reminder: '🔔'
  },
  ms: {
    medication: '💊',
    health: '🏥',
    care: '💚',
    time: '🕐',
    reminder: '🔔',
    blessing: '🤲'
  },
  zh: {
    medication: '💊',
    health: '🏥',
    care: '❤️',
    time: '🕐',
    reminder: '🔔',
    fortune: '🧧',
    dragon: '🐉'
  },
  ta: {
    medication: '💊',
    health: '🏥',
    care: '💛',
    time: '🕐',
    reminder: '🔔',
    flower: '🌺',
    lamp: '🪔'
  }
};

class CulturalNotificationService {
  private static instance: CulturalNotificationService;
  private config: CulturalNotificationConfig;
  private loadedSounds: Map<string, Audio.Sound> = new Map();
  private isInitialized = false;

  private constructor() {
    this.config = this.getDefaultConfig();
  }

  static getInstance(): CulturalNotificationService {
    if (!CulturalNotificationService.instance) {
      CulturalNotificationService.instance = new CulturalNotificationService();
    }
    return CulturalNotificationService.instance;
  }

  /**
   * Initialize cultural notification service
   */
  async initialize(config?: Partial<CulturalNotificationConfig>): Promise<{ success: boolean; error?: string }> {
    try {
      // Load saved configuration
      const savedConfig = await this.loadConfiguration();
      this.config = { ...this.config, ...savedConfig, ...config };

      // Initialize audio system
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: false,
        interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_MIX_WITH_OTHERS,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DUCK_OTHERS,
        playThroughEarpieceAndroid: false,
      });

      // Request notification permissions
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Notification permissions not granted');
      }

      // Set up cultural notification handler
      Notifications.setNotificationHandler({
        handleNotification: async (notification) => {
          const culturalAdaptations = await this.applyCulturalAdaptations(notification);
          
          return {
            shouldShowAlert: true,
            shouldPlaySound: true,
            shouldSetBadge: true,
            ...culturalAdaptations
          };
        },
      });

      // Preload common cultural sounds
      await this.preloadCulturalSounds();

      // Set up cultural notification categories
      await this.setupCulturalNotificationCategories();

      this.isInitialized = true;
      console.log('Cultural Notification Service initialized successfully');
      return { success: true };

    } catch (error) {
      console.error('Failed to initialize cultural notification service:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Initialization failed' 
      };
    }
  }

  /**
   * Send cultural notification
   */
  async sendCulturalNotification(notification: CulturalNotification): Promise<NotificationDeliveryResult> {
    if (!this.isInitialized) {
      throw new Error('Cultural notification service not initialized');
    }

    try {
      const culturallyAdaptedContent = await this.adaptNotificationContent(notification);
      
      const notificationRequest: Notifications.NotificationRequestInput = {
        content: culturallyAdaptedContent,
        trigger: notification.scheduledFor ? { date: notification.scheduledFor } : null,
      };

      const notificationId = await Notifications.scheduleNotificationAsync(notificationRequest);

      // Play cultural sound if configured
      await this.playCulturalSound(notification.language, notification.deliveryPreferences.preferredSound);

      // Trigger cultural vibration if configured
      await this.triggerCulturalVibration(notification.language, notification.deliveryPreferences.vibrationPattern);

      return {
        success: true,
        notificationId,
        deliveryMethod: 'push',
        culturalAdaptations: ['content', 'sound', 'vibration'],
        deliveredAt: new Date()
      };

    } catch (error) {
      console.error('Cultural notification delivery failed:', error);
      return {
        success: false,
        deliveryMethod: 'push',
        error: error instanceof Error ? error.message : 'Delivery failed'
      };
    }
  }

  /**
   * Send medication reminder with cultural adaptations
   */
  async sendMedicationReminder(
    medicationName: string,
    dosage: string,
    language: SupportedLanguage,
    culturalPreferences?: CulturalNotification['culturalContext']
  ): Promise<NotificationDeliveryResult> {
    const notification: CulturalNotification = {
      id: `med_cultural_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: this.getMedicationReminderTitle(language),
      body: this.getMedicationReminderBody(medicationName, dosage, language),
      language,
      priority: 'medium',
      culturalContext: {
        includeTraditionalGreeting: true,
        useRespectfulTone: true,
        includeCulturalEmoji: true,
        adaptForElderly: culturalPreferences?.adaptForElderly || false,
        ...culturalPreferences
      },
      deliveryPreferences: {
        preferredSound: this.config.soundSettings[language].soundTheme,
        vibrationPattern: this.config.vibrationSettings[language].pattern,
        visualStyle: 'rich'
      },
      reminderType: 'medication'
    };

    return await this.sendCulturalNotification(notification);
  }

  /**
   * Send emergency alert with maximum cultural sensitivity
   */
  async sendEmergencyAlert(
    patientName: string,
    medicationName: string,
    language: SupportedLanguage,
    isForFamily = false
  ): Promise<NotificationDeliveryResult> {
    const notification: CulturalNotification = {
      id: `emr_cultural_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: this.getEmergencyAlertTitle(language, isForFamily),
      body: this.getEmergencyAlertBody(patientName, medicationName, language, isForFamily),
      language,
      priority: 'critical',
      culturalContext: {
        includeTraditionalGreeting: false,
        useRespectfulTone: true,
        includeCulturalEmoji: false, // Keep emergency alerts clean
        adaptForElderly: true
      },
      deliveryPreferences: {
        preferredSound: 'urgent',
        vibrationPattern: 'urgent',
        visualStyle: 'minimal',
        repeatCount: 3
      },
      reminderType: 'emergency'
    };

    return await this.sendCulturalNotification(notification);
  }

  /**
   * Adapt notification content for culture
   */
  private async adaptNotificationContent(
    notification: CulturalNotification
  ): Promise<Notifications.NotificationContent> {
    const language = notification.language;
    const emojis = CULTURAL_EMOJIS[language];
    
    let adaptedTitle = notification.title;
    let adaptedBody = notification.body;

    // Add cultural emoji if requested
    if (notification.culturalContext.includeCulturalEmoji) {
      if (notification.reminderType === 'medication') {
        adaptedTitle = `${emojis.medication} ${adaptedTitle}`;
      } else if (notification.reminderType === 'emergency') {
        adaptedTitle = `🚨 ${adaptedTitle}`;
      }
    }

    // Add traditional greeting if requested
    if (notification.culturalContext.includeTraditionalGreeting) {
      const greetings = {
        en: 'Good day. ',
        ms: 'Selamat sejahtera. ',
        zh: '您好。',
        ta: 'வணக்கம். '
      };
      adaptedBody = greetings[language] + adaptedBody;
    }

    // Adapt for elderly if needed
    if (notification.culturalContext.adaptForElderly) {
      adaptedBody = this.simplifyLanguageForElderly(adaptedBody, language);
    }

    // Add cultural blessing for certain types
    if (notification.reminderType === 'medication' && language === 'ms') {
      adaptedBody += ' Semoga sihat selalu.'; // "May you always be healthy"
    }

    const content: Notifications.NotificationContent = {
      title: adaptedTitle,
      body: adaptedBody,
      sound: false, // We handle sound separately
      badge: 1,
      categoryIdentifier: this.getCulturalCategoryIdentifier(notification),
      data: {
        culturalNotification: true,
        language: notification.language,
        priority: notification.priority,
        reminderType: notification.reminderType,
        culturalContext: notification.culturalContext,
        ...notification.metadata
      }
    };

    // Add cultural visual elements
    if (this.config.visualSettings.useTraditionalColors) {
      content.color = this.getTraditionalColor(language);
    }

    return content;
  }

  /**
   * Apply cultural adaptations to notification behavior
   */
  private async applyCulturalAdaptations(
    notification: Notifications.Notification
  ): Promise<Partial<Notifications.NotificationBehavior>> {
    const data = notification.request.content.data as any;
    
    if (!data?.culturalNotification) {
      return {}; // Not a cultural notification, use defaults
    }

    const language = data.language as SupportedLanguage;
    const priority = data.priority as CulturalNotification['priority'];
    
    const adaptations: Partial<Notifications.NotificationBehavior> = {};

    // Adapt sound behavior
    const soundConfig = this.config.soundSettings[language];
    if (soundConfig.enabled && soundConfig.volume > 0) {
      adaptations.shouldPlaySound = true;
    }

    // Adapt for priority
    if (priority === 'critical') {
      adaptations.shouldShowAlert = true;
      adaptations.shouldPlaySound = true;
      adaptations.shouldSetBadge = true;
    } else if (priority === 'low') {
      adaptations.shouldShowAlert = false;
      adaptations.shouldPlaySound = soundConfig.enabled;
    }

    // Respect cultural context settings
    if (this.config.contextualSettings.avoidDuringPrayer) {
      const isCurrentlyPrayerTime = await this.isCurrentlyPrayerTime();
      if (isCurrentlyPrayerTime) {
        adaptations.shouldPlaySound = false;
        // Schedule for after prayer time instead
      }
    }

    return adaptations;
  }

  /**
   * Play cultural sound
   */
  private async playCulturalSound(
    language: SupportedLanguage,
    soundType?: string
  ): Promise<void> {
    try {
      const soundConfig = this.config.soundSettings[language];
      if (!soundConfig.enabled) return;

      const selectedSoundType = soundType || soundConfig.soundTheme;
      const soundKey = `${language}_${selectedSoundType}`;
      
      let sound = this.loadedSounds.get(soundKey);
      
      if (!sound) {
        // Load sound if not cached
        const soundResource = CULTURAL_SOUNDS[language]?.[selectedSoundType as keyof typeof CULTURAL_SOUNDS['en']];
        if (soundResource) {
          const { sound: newSound } = await Audio.Sound.createAsync(soundResource);
          sound = newSound;
          this.loadedSounds.set(soundKey, sound);
        }
      }

      if (sound) {
        await sound.setVolumeAsync(soundConfig.volume);
        await sound.replayAsync();
      }

    } catch (error) {
      console.error('Failed to play cultural sound:', error);
    }
  }

  /**
   * Trigger cultural vibration
   */
  private async triggerCulturalVibration(
    language: SupportedLanguage,
    vibrationPattern?: string
  ): Promise<void> {
    try {
      const vibrationConfig = this.config.vibrationSettings[language];
      if (!vibrationConfig.enabled) return;

      const selectedPattern = vibrationPattern || vibrationConfig.pattern;
      const pattern = VIBRATION_PATTERNS[selectedPattern as keyof typeof VIBRATION_PATTERNS];

      if (Platform.OS === 'ios') {
        // Use Haptics for iOS
        switch (vibrationConfig.intensity) {
          case 'light':
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            break;
          case 'medium':
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            break;
          case 'strong':
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            break;
        }
      } else {
        // Use Vibration for Android
        if (pattern) {
          Vibration.vibrate(pattern);
        } else {
          Vibration.vibrate(500);
        }
      }

    } catch (error) {
      console.error('Failed to trigger cultural vibration:', error);
    }
  }

  /**
   * Preload common cultural sounds
   */
  private async preloadCulturalSounds(): Promise<void> {
    try {
      for (const [language, sounds] of Object.entries(CULTURAL_SOUNDS)) {
        const soundConfig = this.config.soundSettings[language as SupportedLanguage];
        
        if (soundConfig.enabled) {
          const primarySound = sounds[soundConfig.soundTheme as keyof typeof sounds];
          if (primarySound) {
            const { sound } = await Audio.Sound.createAsync(primarySound);
            const soundKey = `${language}_${soundConfig.soundTheme}`;
            this.loadedSounds.set(soundKey, sound);
          }
        }
      }
      console.log('Cultural sounds preloaded successfully');
    } catch (error) {
      console.error('Failed to preload cultural sounds:', error);
    }
  }

  /**
   * Setup cultural notification categories
   */
  private async setupCulturalNotificationCategories(): Promise<void> {
    // Medication reminder category with cultural actions
    await Notifications.setNotificationCategoryAsync('CULTURAL_MEDICATION', [
      {
        identifier: 'TAKE_MEDICATION',
        buttonTitle: 'Taken / Diambil / 已服用 / எடுத்தேன்',
        options: { opensAppToForeground: true },
      },
      {
        identifier: 'SNOOZE_REMINDER',
        buttonTitle: 'Snooze / Tunda / 暂停 / தாமதம்',
        options: { opensAppToForeground: false },
      }
    ]);

    // Emergency category with cultural sensitivity
    await Notifications.setNotificationCategoryAsync('CULTURAL_EMERGENCY', [
      {
        identifier: 'CONFIRM_SAFE',
        buttonTitle: 'I\'m Safe / Saya Selamat / 我安全 / நான் பாதுகாப்பானவன்',
        options: { opensAppToForeground: true },
      },
      {
        identifier: 'NEED_HELP',
        buttonTitle: 'Need Help / Perlukan Bantuan / 需要帮助 / உதவி வேண்டும்',
        options: { opensAppToForeground: true },
      }
    ]);

    // Family alert category
    await Notifications.setNotificationCategoryAsync('CULTURAL_FAMILY_ALERT', [
      {
        identifier: 'CHECK_PATIENT',
        buttonTitle: 'Will Check / Akan Periksa / 会检查 / சரிபார்ப்பேன்',
        options: { opensAppToForeground: false },
      },
      {
        identifier: 'CONTACT_DOCTOR',
        buttonTitle: 'Call Doctor / Hubungi Doktor / 联系医生 / மருத்துவரை அழைக்கவும்',
        options: { opensAppToForeground: true },
      }
    ]);
  }

  /**
   * Get medication reminder title by language
   */
  private getMedicationReminderTitle(language: SupportedLanguage): string {
    const titles = {
      en: 'Medication Reminder',
      ms: 'Peringatan Ubat',
      zh: '药物提醒',
      ta: 'மருந்து நினைவூட்டல்'
    };
    return titles[language] || titles.en;
  }

  /**
   * Get medication reminder body by language
   */
  private getMedicationReminderBody(
    medicationName: string,
    dosage: string,
    language: SupportedLanguage
  ): string {
    const templates = {
      en: `Time to take ${medicationName} (${dosage}). Please take with food if required.`,
      ms: `Masa untuk mengambil ${medicationName} (${dosage}). Sila ambil bersama makanan jika diperlukan.`,
      zh: `该服用 ${medicationName} (${dosage}) 了。如需要请与食物一起服用。`,
      ta: `${medicationName} (${dosage}) உட்கொள்ள வேண்டிய நேரம். தேவைப்பட்டால் உணவோடு எடுத்துக் கொள்ளுங்கள்.`
    };
    return templates[language] || templates.en;
  }

  /**
   * Get emergency alert title by language
   */
  private getEmergencyAlertTitle(language: SupportedLanguage, isForFamily: boolean): string {
    if (isForFamily) {
      const titles = {
        en: 'Family Alert - Medication Missed',
        ms: 'Amaran Keluarga - Ubat Terlepas',
        zh: '家庭警报 - 错过服药',
        ta: 'குடும்ப எச்சரிக்கை - மருந்து தவறவிட்டது'
      };
      return titles[language] || titles.en;
    } else {
      const titles = {
        en: 'URGENT - Medication Alert',
        ms: 'PENTING - Amaran Ubat',
        zh: '紧急 - 药物警报',
        ta: 'அவசரம் - மருந்து எச்சரிக்கை'
      };
      return titles[language] || titles.en;
    }
  }

  /**
   * Get emergency alert body by language
   */
  private getEmergencyAlertBody(
    patientName: string,
    medicationName: string,
    language: SupportedLanguage,
    isForFamily: boolean
  ): string {
    if (isForFamily) {
      const templates = {
        en: `${patientName} has missed multiple doses of ${medicationName}. Please check on them immediately.`,
        ms: `${patientName} telah terlepas beberapa dos ${medicationName}. Sila periksa keadaan mereka segera.`,
        zh: `${patientName} 已错过多次 ${medicationName} 服药。请立即检查他们的情况。`,
        ta: `${patientName} ${medicationName} மருந்தின் பல அளவுகளை தவறவிட்டார். உடனே அவர்களை சரிபார்க்கவும்.`
      };
      return templates[language] || templates.en;
    } else {
      const templates = {
        en: `You have missed multiple doses of ${medicationName}. Please take your medication immediately and contact your healthcare provider if you feel unwell.`,
        ms: `Anda telah terlepas beberapa dos ${medicationName}. Sila ambil ubat anda segera dan hubungi penyedia penjagaan kesihatan jika anda berasa tidak sihat.`,
        zh: `您已错过多次 ${medicationName} 服药。请立即服药，如感不适请联系医疗保健提供者。`,
        ta: `நீங்கள் ${medicationName} மருந்தின் பல அளவுகளை தவறவிட்டீர்கள். உடனே மருந்து உட்கொண்டு, உடல்நிலை சரியில்லாமல் இருந்தால் மருத்துவரை தொடர்பு கொள்ளுங்கள்.`
      };
      return templates[language] || templates.en;
    }
  }

  /**
   * Simplify language for elderly users
   */
  private simplifyLanguageForElderly(text: string, language: SupportedLanguage): string {
    // Simplify complex words and sentences for elderly users
    const simplifications: Record<SupportedLanguage, Record<string, string>> = {
      en: {
        'medication': 'medicine',
        'immediately': 'now',
        'healthcare provider': 'doctor'
      },
      ms: {
        'penyedia penjagaan kesihatan': 'doktor',
        'segera': 'sekarang'
      },
      zh: {
        '医疗保健提供者': '医生',
        '立即': '马上'
      },
      ta: {
        'மருத்துவரை': 'டாக்டர்'
      }
    };

    let simplifiedText = text;
    const langSimplifications = simplifications[language];
    
    if (langSimplifications) {
      Object.entries(langSimplifications).forEach(([complex, simple]) => {
        simplifiedText = simplifiedText.replace(new RegExp(complex, 'gi'), simple);
      });
    }

    return simplifiedText;
  }

  /**
   * Get cultural category identifier
   */
  private getCulturalCategoryIdentifier(notification: CulturalNotification): string {
    switch (notification.reminderType) {
      case 'medication':
        return 'CULTURAL_MEDICATION';
      case 'emergency':
        return 'CULTURAL_EMERGENCY';
      case 'family_alert':
        return 'CULTURAL_FAMILY_ALERT';
      default:
        return 'CULTURAL_MEDICATION';
    }
  }

  /**
   * Get traditional color for language
   */
  private getTraditionalColor(language: SupportedLanguage): string {
    const colors = {
      en: '#007AFF', // iOS blue
      ms: '#C41E3A', // Malaysia red
      zh: '#DC143C', // Chinese red
      ta: '#FF6B35'  // Tamil orange
    };
    return colors[language] || colors.en;
  }

  /**
   * Check if currently prayer time (simplified implementation)
   */
  private async isCurrentlyPrayerTime(): Promise<boolean> {
    // In a real implementation, this would integrate with the prayer time service
    // For demo purposes, return false
    return false;
  }

  /**
   * Load configuration from storage
   */
  private async loadConfiguration(): Promise<Partial<CulturalNotificationConfig>> {
    try {
      const stored = await AsyncStorage.getItem('cultural_notification_config');
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Failed to load cultural notification configuration:', error);
      return {};
    }
  }

  /**
   * Save configuration to storage
   */
  async saveConfiguration(config: Partial<CulturalNotificationConfig>): Promise<void> {
    try {
      this.config = { ...this.config, ...config };
      await AsyncStorage.setItem('cultural_notification_config', JSON.stringify(this.config));
    } catch (error) {
      console.error('Failed to save cultural notification configuration:', error);
      throw error;
    }
  }

  /**
   * Get default configuration
   */
  private getDefaultConfig(): CulturalNotificationConfig {
    return {
      soundSettings: {
        en: { enabled: true, soundTheme: 'modern', volume: 0.8 },
        ms: { enabled: true, soundTheme: 'traditional', volume: 0.8 },
        zh: { enabled: true, soundTheme: 'traditional', volume: 0.8 },
        ta: { enabled: true, soundTheme: 'traditional', volume: 0.8 }
      },
      vibrationSettings: {
        en: { enabled: true, pattern: 'gentle', intensity: 'medium' },
        ms: { enabled: true, pattern: 'rhythmic', intensity: 'medium' },
        zh: { enabled: true, pattern: 'traditional', intensity: 'medium' },
        ta: { enabled: true, pattern: 'rhythmic', intensity: 'medium' }
      },
      visualSettings: {
        useTraditionalColors: true,
        includeCulturalSymbols: true,
        adaptForElders: true,
        respectReligiousSymbols: true
      },
      contextualSettings: {
        avoidDuringPrayer: true,
        adaptForFestivals: true,
        respectQuietHours: true,
        familyModeEnabled: true
      }
    };
  }

  // Public methods
  getConfiguration(): CulturalNotificationConfig {
    return { ...this.config };
  }

  isServiceInitialized(): boolean {
    return this.isInitialized;
  }

  /**
   * Test cultural notification
   */
  async testCulturalNotification(language: SupportedLanguage): Promise<NotificationDeliveryResult> {
    const testNotification: CulturalNotification = {
      id: `test_${Date.now()}`,
      title: this.getMedicationReminderTitle(language),
      body: this.getMedicationReminderBody('Test Medicine', '1 tablet', language),
      language,
      priority: 'low',
      culturalContext: {
        includeTraditionalGreeting: true,
        useRespectfulTone: true,
        includeCulturalEmoji: true
      },
      deliveryPreferences: {
        visualStyle: 'rich'
      },
      reminderType: 'medication'
    };

    return await this.sendCulturalNotification(testNotification);
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    try {
      // Unload all cached sounds
      for (const sound of this.loadedSounds.values()) {
        await sound.unloadAsync();
      }
      this.loadedSounds.clear();
    } catch (error) {
      console.error('Failed to cleanup cultural notification service:', error);
    }
  }
}

export default CulturalNotificationService;