/**
 * React Hook for Accessibility Configuration
 * Provides real-time access to accessibility settings with React integration
 */

import { useState, useEffect, useCallback } from 'react';
import { AccessibilityConfig, accessibilityManager } from './AccessibilityConfig';

export interface UseAccessibilityReturn {
  config: AccessibilityConfig;
  updateConfig: (updates: Partial<AccessibilityConfig>) => void;
  applyElderlyProfile: () => void;
  applyVisualImpairedProfile: () => void;
  applyMotorImpairedProfile: () => void;
  applyEmergencyProfile: () => void;
  resetToDefaults: () => void;
  getTextSize: (variant: 'small' | 'normal' | 'large' | 'title' | 'button' | 'emergency') => number;
  getTouchTargetSize: (variant: 'minimum' | 'recommended' | 'large' | 'emergency') => number;
  getAnimationDuration: (defaultDuration: number) => number;
  isEmergencyMode: boolean;
  isVoiceGuidanceEnabled: boolean;
  isHapticFeedbackEnabled: boolean;
  colors: ReturnType<typeof accessibilityManager.getAccessibilityColors>;
}

/**
 * Hook for managing and subscribing to accessibility configuration changes
 */
export function useAccessibility(): UseAccessibilityReturn {
  const [config, setConfig] = useState<AccessibilityConfig>(accessibilityManager.getConfig());

  useEffect(() => {
    // Subscribe to configuration changes
    const unsubscribe = accessibilityManager.subscribe(setConfig);

    // Get initial config in case it changed before component mounted
    setConfig(accessibilityManager.getConfig());

    return unsubscribe;
  }, []);

  const updateConfig = useCallback((updates: Partial<AccessibilityConfig>) => {
    accessibilityManager.updateConfig(updates);
  }, []);

  const applyElderlyProfile = useCallback(() => {
    accessibilityManager.applyElderlyProfile();
  }, []);

  const applyVisualImpairedProfile = useCallback(() => {
    accessibilityManager.applyVisualImpairedProfile();
  }, []);

  const applyMotorImpairedProfile = useCallback(() => {
    accessibilityManager.applyMotorImpairedProfile();
  }, []);

  const applyEmergencyProfile = useCallback(() => {
    accessibilityManager.applyEmergencyProfile();
  }, []);

  const resetToDefaults = useCallback(() => {
    accessibilityManager.resetToDefaults();
  }, []);

  const getTextSize = useCallback((variant: 'small' | 'normal' | 'large' | 'title' | 'button' | 'emergency') => {
    const textSizes = accessibilityManager.getTextSizeScale();
    return textSizes[variant];
  }, [config.textSize]);

  const getTouchTargetSize = useCallback((variant: 'minimum' | 'recommended' | 'large' | 'emergency') => {
    const touchTargets = accessibilityManager.getTouchTargetSizes();
    return touchTargets[variant];
  }, [config.increasedTouchTargets]);

  const getAnimationDuration = useCallback((defaultDuration: number) => {
    return accessibilityManager.getAnimationDuration(defaultDuration);
  }, [config.reducedMotion, config.slowAnimations]);

  const colors = accessibilityManager.getAccessibilityColors();

  return {
    config,
    updateConfig,
    applyElderlyProfile,
    applyVisualImpairedProfile,
    applyMotorImpairedProfile,
    applyEmergencyProfile,
    resetToDefaults,
    getTextSize,
    getTouchTargetSize,
    getAnimationDuration,
    isEmergencyMode: config.emergencyMode,
    isVoiceGuidanceEnabled: config.voiceGuidance,
    isHapticFeedbackEnabled: config.hapticFeedback,
    colors,
  };
}