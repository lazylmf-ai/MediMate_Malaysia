/**
 * Haptic Feedback System for Mobile Accessibility
 * Provides tactile feedback for elderly users and accessibility enhancement
 */

import { Haptics } from 'expo-haptics';
import { Platform, Vibration } from 'react-native';
import { accessibilityManager } from './AccessibilityConfig';

export interface HapticPattern {
  type: 'success' | 'warning' | 'error' | 'emergency' | 'medication' | 'navigation' | 'button' | 'notification';
  intensity: 'light' | 'medium' | 'heavy';
  duration?: number;
  repeat?: number;
  delay?: number;
}

export interface CustomHapticPattern {
  vibrationPattern: number[];
  repeat?: boolean;
}

export class HapticFeedbackService {
  private static instance: HapticFeedbackService;
  private isEnabled: boolean = true;
  private intensityMultiplier: number = 1.0;

  private constructor() {
    // Initialize with accessibility manager settings
    this.isEnabled = accessibilityManager.isHapticFeedbackEnabled();
  }

  public static getInstance(): HapticFeedbackService {
    if (!HapticFeedbackService.instance) {
      HapticFeedbackService.instance = new HapticFeedbackService();
    }
    return HapticFeedbackService.instance;
  }

  public setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  public setIntensityMultiplier(multiplier: number): void {
    this.intensityMultiplier = Math.max(0.1, Math.min(2.0, multiplier));
  }

  public async trigger(pattern: HapticPattern): Promise<void> {
    if (!this.isEnabled || !accessibilityManager.isHapticFeedbackEnabled()) {
      return;
    }

    try {
      if (Platform.OS === 'ios') {
        await this.triggerIOSHaptic(pattern);
      } else {
        await this.triggerAndroidVibration(pattern);
      }
    } catch (error) {
      console.warn('Haptic feedback error:', error);
    }
  }

  private async triggerIOSHaptic(pattern: HapticPattern): Promise<void> {
    const { type, intensity, repeat = 1, delay = 0 } = pattern;

    for (let i = 0; i < repeat; i++) {
      if (i > 0 && delay > 0) {
        await this.sleep(delay);
      }

      switch (type) {
        case 'success':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          break;

        case 'warning':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          break;

        case 'error':
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          break;

        case 'emergency':
          // Double pulse for emergency
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          await this.sleep(100);
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          break;

        case 'medication':
          // Triple light pulse for medication reminder
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          await this.sleep(200);
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          await this.sleep(200);
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          break;

        case 'navigation':
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          break;

        case 'button':
          await Haptics.impactAsync(
            intensity === 'light' ? Haptics.ImpactFeedbackStyle.Light :
            intensity === 'heavy' ? Haptics.ImpactFeedbackStyle.Heavy :
            Haptics.ImpactFeedbackStyle.Medium
          );
          break;

        case 'notification':
          await Haptics.selectionAsync();
          break;

        default:
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    }
  }

  private async triggerAndroidVibration(pattern: HapticPattern): Promise<void> {
    const { type, intensity, repeat = 1, delay = 0 } = pattern;

    const patterns = this.getAndroidVibrationPatterns();
    const vibrationPattern = patterns[type] || patterns.button;

    // Adjust pattern intensity
    const adjustedPattern = vibrationPattern.map(duration =>
      duration * this.intensityMultiplier
    );

    for (let i = 0; i < repeat; i++) {
      if (i > 0 && delay > 0) {
        await this.sleep(delay);
      }

      Vibration.vibrate(adjustedPattern);

      // Wait for pattern to complete before next repetition
      const totalDuration = adjustedPattern.reduce((sum, duration) => sum + duration, 0);
      if (i < repeat - 1) {
        await this.sleep(totalDuration);
      }
    }
  }

  private getAndroidVibrationPatterns(): Record<string, number[]> {
    return {
      success: [0, 100, 50, 100],
      warning: [0, 200, 100, 200],
      error: [0, 300, 100, 300],
      emergency: [0, 500, 200, 500, 200, 500],
      medication: [0, 100, 200, 100, 200, 100],
      navigation: [0, 150],
      button: [0, 50],
      notification: [0, 100],
    };
  }

  public async triggerCustomPattern(customPattern: CustomHapticPattern): Promise<void> {
    if (!this.isEnabled || !accessibilityManager.isHapticFeedbackEnabled()) {
      return;
    }

    try {
      const adjustedPattern = customPattern.vibrationPattern.map(duration =>
        duration * this.intensityMultiplier
      );

      if (Platform.OS === 'android') {
        Vibration.vibrate(adjustedPattern, customPattern.repeat);
      } else {
        // iOS fallback to simple haptic
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      }
    } catch (error) {
      console.warn('Custom haptic pattern error:', error);
    }
  }

  // Predefined patterns for common healthcare scenarios
  public async medicationTaken(): Promise<void> {
    await this.trigger({
      type: 'success',
      intensity: 'medium',
    });
  }

  public async medicationMissed(): Promise<void> {
    await this.trigger({
      type: 'warning',
      intensity: 'medium',
      repeat: 2,
      delay: 300,
    });
  }

  public async emergencyAlert(): Promise<void> {
    await this.trigger({
      type: 'emergency',
      intensity: 'heavy',
      repeat: 3,
      delay: 500,
    });
  }

  public async prayerTimeAlert(): Promise<void> {
    await this.trigger({
      type: 'notification',
      intensity: 'light',
      repeat: 2,
      delay: 1000,
    });
  }

  public async buttonPress(): Promise<void> {
    await this.trigger({
      type: 'button',
      intensity: 'light',
    });
  }

  public async navigationFeedback(): Promise<void> {
    await this.trigger({
      type: 'navigation',
      intensity: 'medium',
    });
  }

  public async errorOccurred(): Promise<void> {
    await this.trigger({
      type: 'error',
      intensity: 'heavy',
    });
  }

  public async familyNotification(): Promise<void> {
    await this.trigger({
      type: 'notification',
      intensity: 'medium',
      repeat: 2,
      delay: 200,
    });
  }

  public async appointmentReminder(): Promise<void> {
    await this.trigger({
      type: 'warning',
      intensity: 'medium',
      repeat: 3,
      delay: 1000,
    });
  }

  // Malaysian cultural context patterns
  public async ramadanScheduleAlert(): Promise<void> {
    // Special gentle pattern for Ramadan
    await this.triggerCustomPattern({
      vibrationPattern: [0, 100, 300, 100, 300, 100],
      repeat: false,
    });
  }

  public async festivalGreeting(): Promise<void> {
    // Celebratory pattern for festivals
    await this.triggerCustomPattern({
      vibrationPattern: [0, 50, 100, 50, 100, 50, 100, 50],
      repeat: false,
    });
  }

  // Accessibility-focused patterns
  public async accessibilityModeChanged(): Promise<void> {
    await this.trigger({
      type: 'success',
      intensity: 'light',
      repeat: 3,
      delay: 150,
    });
  }

  public async emergencyContactDialing(): Promise<void> {
    // Urgent but not alarming for emergency contact activation
    await this.trigger({
      type: 'warning',
      intensity: 'heavy',
      repeat: 1,
    });
  }

  public async voiceGuidanceToggled(): Promise<void> {
    await this.trigger({
      type: 'notification',
      intensity: 'medium',
    });
  }

  // Utility methods
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  public async testHaptics(): Promise<void> {
    console.log('Testing haptic feedback...');

    await this.trigger({
      type: 'notification',
      intensity: 'light',
    });

    await this.sleep(1000);

    await this.trigger({
      type: 'button',
      intensity: 'medium',
    });

    await this.sleep(1000);

    await this.trigger({
      type: 'success',
      intensity: 'heavy',
    });
  }

  // For elderly users - simplified feedback patterns
  public async elderlyFriendlySuccess(): Promise<void> {
    await this.trigger({
      type: 'success',
      intensity: 'medium',
      repeat: 1,
    });
  }

  public async elderlyFriendlyWarning(): Promise<void> {
    await this.trigger({
      type: 'warning',
      intensity: 'medium',
      repeat: 2,
      delay: 800, // Longer delay for elderly users
    });
  }

  public stopAllVibrations(): void {
    try {
      Vibration.cancel();
    } catch (error) {
      console.warn('Error stopping vibrations:', error);
    }
  }
}

// Singleton instance
export const hapticFeedback = HapticFeedbackService.getInstance();