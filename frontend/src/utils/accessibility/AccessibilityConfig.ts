/**
 * Accessibility Configuration for Elderly Users
 * Provides comprehensive accessibility settings and utilities
 * optimized for Malaysian elderly users in healthcare contexts
 */

import { Dimensions, AccessibilityInfo } from 'react-native';

export interface AccessibilityConfig {
  textSize: 'normal' | 'large' | 'extra-large' | 'maximum';
  highContrast: boolean;
  hapticFeedback: boolean;
  voiceGuidance: boolean;
  simpleNavigation: boolean;
  emergencyMode: boolean;
  reducedMotion: boolean;
  increasedTouchTargets: boolean;
  audioAlerts: boolean;
  visualIndicators: boolean;
  autoFocus: boolean;
  slowAnimations: boolean;
}

export interface TextSizeScale {
  small: number;
  normal: number;
  large: number;
  title: number;
  button: number;
  emergency: number;
}

export interface TouchTargetSizes {
  minimum: number;
  recommended: number;
  large: number;
  emergency: number;
}

export interface AccessibilityColors {
  background: string;
  foreground: string;
  primary: string;
  secondary: string;
  error: string;
  warning: string;
  success: string;
  emergency: string;
  border: string;
  shadow: string;
}

export class AccessibilityManager {
  private static instance: AccessibilityManager;
  private config: AccessibilityConfig;
  private listeners: Set<(config: AccessibilityConfig) => void> = new Set();

  private constructor() {
    this.config = {
      textSize: 'normal',
      highContrast: false,
      hapticFeedback: true,
      voiceGuidance: false,
      simpleNavigation: false,
      emergencyMode: false,
      reducedMotion: false,
      increasedTouchTargets: false,
      audioAlerts: true,
      visualIndicators: true,
      autoFocus: true,
      slowAnimations: false,
    };
    this.initializeSystemDefaults();
  }

  public static getInstance(): AccessibilityManager {
    if (!AccessibilityManager.instance) {
      AccessibilityManager.instance = new AccessibilityManager();
    }
    return AccessibilityManager.instance;
  }

  private async initializeSystemDefaults(): Promise<void> {
    try {
      // Check system accessibility settings
      const isScreenReaderEnabled = await AccessibilityInfo.isScreenReaderEnabled();
      const isReduceMotionEnabled = await AccessibilityInfo.isReduceMotionEnabled();
      const isReduceTransparencyEnabled = await AccessibilityInfo.isReduceTransparencyEnabled();

      // Update config based on system settings
      if (isScreenReaderEnabled) {
        this.updateConfig({
          voiceGuidance: true,
          audioAlerts: true,
          autoFocus: true,
          simpleNavigation: true,
        });
      }

      if (isReduceMotionEnabled) {
        this.updateConfig({
          reducedMotion: true,
          slowAnimations: true,
        });
      }

      if (isReduceTransparencyEnabled) {
        this.updateConfig({
          highContrast: true,
        });
      }

      // Set up listeners for system changes
      AccessibilityInfo.addEventListener('screenReaderChanged', (isEnabled) => {
        this.updateConfig({ voiceGuidance: isEnabled });
      });

      AccessibilityInfo.addEventListener('reduceMotionChanged', (isEnabled) => {
        this.updateConfig({ reducedMotion: isEnabled, slowAnimations: isEnabled });
      });

      AccessibilityInfo.addEventListener('reduceTransparencyChanged', (isEnabled) => {
        this.updateConfig({ highContrast: isEnabled });
      });

    } catch (error) {
      console.warn('Failed to initialize accessibility system defaults:', error);
    }
  }

  public getConfig(): AccessibilityConfig {
    return { ...this.config };
  }

  public updateConfig(updates: Partial<AccessibilityConfig>): void {
    this.config = { ...this.config, ...updates };
    this.notifyListeners();
  }

  public subscribe(listener: (config: AccessibilityConfig) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.config);
      } catch (error) {
        console.warn('Accessibility listener error:', error);
      }
    });
  }

  // Predefined accessibility profiles for different user needs
  public applyElderlyProfile(): void {
    this.updateConfig({
      textSize: 'large',
      hapticFeedback: true,
      increasedTouchTargets: true,
      simpleNavigation: true,
      audioAlerts: true,
      visualIndicators: true,
      slowAnimations: true,
    });
  }

  public applyVisualImpairedProfile(): void {
    this.updateConfig({
      textSize: 'extra-large',
      highContrast: true,
      voiceGuidance: true,
      audioAlerts: true,
      autoFocus: true,
      increasedTouchTargets: true,
    });
  }

  public applyMotorImpairedProfile(): void {
    this.updateConfig({
      increasedTouchTargets: true,
      hapticFeedback: true,
      slowAnimations: true,
      reducedMotion: true,
      autoFocus: true,
    });
  }

  public applyEmergencyProfile(): void {
    this.updateConfig({
      emergencyMode: true,
      textSize: 'maximum',
      highContrast: true,
      hapticFeedback: true,
      audioAlerts: true,
      increasedTouchTargets: true,
      simpleNavigation: true,
    });
  }

  // Text scaling utilities
  public getTextSizeScale(): TextSizeScale {
    const baseScale = this.getBaseScale();
    return {
      small: 12 * baseScale,
      normal: 16 * baseScale,
      large: 20 * baseScale,
      title: 24 * baseScale,
      button: 18 * baseScale,
      emergency: 28 * baseScale,
    };
  }

  private getBaseScale(): number {
    switch (this.config.textSize) {
      case 'large':
        return 1.25;
      case 'extra-large':
        return 1.5;
      case 'maximum':
        return 2.0;
      default:
        return 1.0;
    }
  }

  // Touch target utilities
  public getTouchTargetSizes(): TouchTargetSizes {
    const base = this.config.increasedTouchTargets ? 1.5 : 1.0;
    return {
      minimum: 44 * base,
      recommended: 48 * base,
      large: 56 * base,
      emergency: 64 * base,
    };
  }

  // Color utilities for high contrast
  public getAccessibilityColors(): AccessibilityColors {
    if (this.config.highContrast) {
      return {
        background: '#000000',
        foreground: '#FFFFFF',
        primary: '#FFFF00',
        secondary: '#00FFFF',
        error: '#FF0000',
        warning: '#FFA500',
        success: '#00FF00',
        emergency: '#FF1493',
        border: '#FFFFFF',
        shadow: '#808080',
      };
    }

    // Standard Malaysian healthcare colors
    return {
      background: '#FFFFFF',
      foreground: '#1A1A1A',
      primary: '#2E7D9A',
      secondary: '#4A90A4',
      error: '#D32F2F',
      warning: '#FF9800',
      success: '#4CAF50',
      emergency: '#FF1744',
      border: '#E0E0E0',
      shadow: '#00000020',
    };
  }

  // Animation utilities
  public getAnimationDuration(defaultDuration: number): number {
    if (this.config.reducedMotion) {
      return 0;
    }
    if (this.config.slowAnimations) {
      return defaultDuration * 2;
    }
    return defaultDuration;
  }

  // Utility for emergency quick access
  public isEmergencyMode(): boolean {
    return this.config.emergencyMode;
  }

  // Voice guidance support
  public isVoiceGuidanceEnabled(): boolean {
    return this.config.voiceGuidance;
  }

  // Haptic feedback support
  public isHapticFeedbackEnabled(): boolean {
    return this.config.hapticFeedback;
  }

  // Malaysian context-specific accessibility features
  public getMalaysianElderlyDefaults(): Partial<AccessibilityConfig> {
    return {
      textSize: 'large',
      hapticFeedback: true,
      audioAlerts: true,
      increasedTouchTargets: true,
      simpleNavigation: true,
      visualIndicators: true,
    };
  }

  // Screen size adaptation
  public adaptToScreenSize(): void {
    const { width, height } = Dimensions.get('window');
    const isSmallScreen = width < 375 || height < 667;

    if (isSmallScreen) {
      this.updateConfig({
        simpleNavigation: true,
        reducedMotion: true,
      });
    }
  }

  // Reset to defaults
  public resetToDefaults(): void {
    this.config = {
      textSize: 'normal',
      highContrast: false,
      hapticFeedback: true,
      voiceGuidance: false,
      simpleNavigation: false,
      emergencyMode: false,
      reducedMotion: false,
      increasedTouchTargets: false,
      audioAlerts: true,
      visualIndicators: true,
      autoFocus: true,
      slowAnimations: false,
    };
    this.notifyListeners();
  }
}

// Singleton instance
export const accessibilityManager = AccessibilityManager.getInstance();

// React hook for using accessibility config
export { useAccessibility } from './useAccessibility';