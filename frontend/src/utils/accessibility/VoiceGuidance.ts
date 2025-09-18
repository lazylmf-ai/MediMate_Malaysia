/**
 * Voice Guidance System for Elderly Users
 * Provides text-to-speech functionality with Malaysian language support
 */

import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import { Platform } from 'react-native';
import { accessibilityManager } from './AccessibilityConfig';

export interface VoiceGuidanceConfig {
  language: 'en-MY' | 'ms-MY' | 'zh-CN' | 'ta-IN';
  rate: number; // 0.1 to 2.0
  pitch: number; // 0.5 to 2.0
  volume: number; // 0.0 to 1.0
  autoSpeak: boolean;
  emergencyPriority: boolean;
}

export interface SpeechOptions {
  text: string;
  priority: 'low' | 'normal' | 'high' | 'emergency';
  interrupt: boolean;
  language?: string;
  rate?: number;
  pitch?: number;
}

export class VoiceGuidanceService {
  private static instance: VoiceGuidanceService;
  private config: VoiceGuidanceConfig;
  private isInitialized: boolean = false;
  private currentlySpeaking: boolean = false;
  private speechQueue: SpeechOptions[] = [];
  private isMuted: boolean = false;

  private constructor() {
    this.config = {
      language: 'en-MY',
      rate: 0.7, // Slightly slower for elderly users
      pitch: 1.0,
      volume: 0.8,
      autoSpeak: true,
      emergencyPriority: true,
    };
  }

  public static getInstance(): VoiceGuidanceService {
    if (!VoiceGuidanceService.instance) {
      VoiceGuidanceService.instance = new VoiceGuidanceService();
    }
    return VoiceGuidanceService.instance;
  }

  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Request audio permissions
      if (Platform.OS === 'ios') {
        const { status } = await Audio.requestPermissionsAsync();
        if (status !== 'granted') {
          console.warn('Audio permissions not granted');
          return;
        }
      }

      // Set audio mode for speech
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        staysActiveInBackground: true,
        interruptionModeIOS: Audio.INTERRUPTION_MODE_IOS_DO_NOT_MIX,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        interruptionModeAndroid: Audio.INTERRUPTION_MODE_ANDROID_DO_NOT_MIX,
        playThroughEarpieceAndroid: false,
      });

      // Check if speech synthesis is available
      const isAvailable = await Speech.isSpeakingAsync();
      console.log('Speech synthesis available:', !isAvailable);

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize voice guidance:', error);
    }
  }

  public updateConfig(updates: Partial<VoiceGuidanceConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  public getConfig(): VoiceGuidanceConfig {
    return { ...this.config };
  }

  public async speak(options: SpeechOptions): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!accessibilityManager.isVoiceGuidanceEnabled() || this.isMuted) {
      return;
    }

    // Handle priority and interruption
    if (options.priority === 'emergency' || options.interrupt) {
      await this.stopSpeaking();
      this.speechQueue = []; // Clear queue for emergency
    }

    // Add to queue if not immediate priority
    if (this.currentlySpeaking && options.priority !== 'emergency') {
      this.speechQueue.push(options);
      return;
    }

    await this.performSpeech(options);
  }

  private async performSpeech(options: SpeechOptions): Promise<void> {
    if (this.currentlySpeaking) {
      return;
    }

    this.currentlySpeaking = true;

    try {
      const speechOptions: Speech.SpeechOptions = {
        language: options.language || this.config.language,
        pitch: options.pitch || this.config.pitch,
        rate: options.rate || this.config.rate,
        volume: this.config.volume,
        onStart: () => {
          console.log('Voice guidance started');
        },
        onDone: () => {
          this.currentlySpeaking = false;
          this.processQueue();
        },
        onStopped: () => {
          this.currentlySpeaking = false;
        },
        onError: (error) => {
          console.error('Voice guidance error:', error);
          this.currentlySpeaking = false;
          this.processQueue();
        },
      };

      await Speech.speak(options.text, speechOptions);
    } catch (error) {
      console.error('Speech synthesis error:', error);
      this.currentlySpeaking = false;
    }
  }

  private async processQueue(): Promise<void> {
    if (this.speechQueue.length === 0 || this.currentlySpeaking) {
      return;
    }

    // Process highest priority first
    const priorityOrder = ['emergency', 'high', 'normal', 'low'];
    let nextSpeech: SpeechOptions | null = null;
    let nextIndex = -1;

    for (const priority of priorityOrder) {
      const index = this.speechQueue.findIndex(item => item.priority === priority);
      if (index !== -1) {
        nextSpeech = this.speechQueue[index];
        nextIndex = index;
        break;
      }
    }

    if (nextSpeech && nextIndex !== -1) {
      this.speechQueue.splice(nextIndex, 1);
      await this.performSpeech(nextSpeech);
    }
  }

  public async stopSpeaking(): Promise<void> {
    try {
      await Speech.stop();
      this.currentlySpeaking = false;
    } catch (error) {
      console.error('Error stopping speech:', error);
    }
  }

  public clearQueue(): void {
    this.speechQueue = [];
  }

  public async isSpeaking(): Promise<boolean> {
    try {
      return await Speech.isSpeakingAsync();
    } catch (error) {
      console.error('Error checking speech status:', error);
      return false;
    }
  }

  public mute(): void {
    this.isMuted = true;
    this.stopSpeaking();
  }

  public unmute(): void {
    this.isMuted = false;
  }

  public isMutedState(): boolean {
    return this.isMuted;
  }

  // Predefined messages for Malaysian healthcare context
  public async speakMedicationReminder(medicationName: string, time: string): Promise<void> {
    const messages = {
      'en-MY': `Time to take your ${medicationName} at ${time}`,
      'ms-MY': `Masa untuk mengambil ubat ${medicationName} pada ${time}`,
      'zh-CN': `该服用${medicationName}了，时间是${time}`,
      'ta-IN': `${time} நேரத்தில் ${medicationName} மருந்து எடுக்க வேண்டும்`,
    };

    await this.speak({
      text: messages[this.config.language] || messages['en-MY'],
      priority: 'high',
      interrupt: false,
    });
  }

  public async speakEmergencyAlert(message: string): Promise<void> {
    const emergencyPrefix = {
      'en-MY': 'Emergency Alert: ',
      'ms-MY': 'Amaran Kecemasan: ',
      'zh-CN': '紧急警报：',
      'ta-IN': 'அவசர எச்சரிக்கை: ',
    };

    await this.speak({
      text: emergencyPrefix[this.config.language] + message,
      priority: 'emergency',
      interrupt: true,
    });
  }

  public async speakNavigationGuide(instruction: string): Promise<void> {
    await this.speak({
      text: instruction,
      priority: 'normal',
      interrupt: false,
    });
  }

  public async speakPrayerTimeAlert(prayerName: string, time: string): Promise<void> {
    const messages = {
      'en-MY': `${prayerName} prayer time at ${time}`,
      'ms-MY': `Waktu solat ${prayerName} pada ${time}`,
      'zh-CN': `${prayerName}祈祷时间：${time}`,
      'ta-IN': `${time} நேரத்தில் ${prayerName} தொழுகை`,
    };

    await this.speak({
      text: messages[this.config.language] || messages['en-MY'],
      priority: 'normal',
      interrupt: false,
    });
  }

  public async speakSuccessMessage(action: string): Promise<void> {
    const messages = {
      'en-MY': `Successfully completed: ${action}`,
      'ms-MY': `Berjaya diselesaikan: ${action}`,
      'zh-CN': `成功完成：${action}`,
      'ta-IN': `வெற்றிகரமாக முடிந்தது: ${action}`,
    };

    await this.speak({
      text: messages[this.config.language] || messages['en-MY'],
      priority: 'normal',
      interrupt: false,
    });
  }

  public async speakErrorMessage(error: string): Promise<void> {
    const messages = {
      'en-MY': `Error: ${error}`,
      'ms-MY': `Ralat: ${error}`,
      'zh-CN': `错误：${error}`,
      'ta-IN': `பிழை: ${error}`,
    };

    await this.speak({
      text: messages[this.config.language] || messages['en-MY'],
      priority: 'high',
      interrupt: false,
    });
  }

  // Adaptive rate adjustment based on user age or preferences
  public adjustRateForElderly(): void {
    this.updateConfig({
      rate: Math.max(0.5, this.config.rate * 0.8), // Slower for elderly
      pitch: 1.0, // Standard pitch
    });
  }

  public adjustRateForEmergency(): void {
    this.updateConfig({
      rate: Math.min(1.2, this.config.rate * 1.3), // Faster for emergencies
      pitch: 1.1, // Slightly higher pitch for urgency
    });
  }
}

// Singleton instance
export const voiceGuidance = VoiceGuidanceService.getInstance();