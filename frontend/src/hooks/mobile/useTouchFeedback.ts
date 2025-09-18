/**
 * Touch Feedback Hook
 * Provides enhanced touch feedback for elderly users with customizable haptic responses
 */

import { useCallback, useRef, useState } from 'react';
import { hapticFeedback } from '../../utils/accessibility/HapticFeedback';
import { useAccessibility } from '../../utils/accessibility/useAccessibility';

export interface TouchFeedbackConfig {
  enabled: boolean;
  intensity: 'light' | 'medium' | 'heavy';
  delay: number;
  repeatOnLongPress: boolean;
  longPressThreshold: number;
  doubleTapThreshold: number;
  elderlyMode: boolean;
}

export interface TouchFeedbackHandlers {
  onPress: () => Promise<void>;
  onLongPress: () => Promise<void>;
  onDoublePress: () => Promise<void>;
  onPressIn: () => Promise<void>;
  onPressOut: () => Promise<void>;
}

export interface TouchFeedback {
  config: TouchFeedbackConfig;
  updateConfig: (updates: Partial<TouchFeedbackConfig>) => void;
  handlers: TouchFeedbackHandlers;
  createTouchHandlers: (
    onAction?: () => void,
    feedbackType?: 'button' | 'medication' | 'emergency' | 'navigation'
  ) => TouchFeedbackHandlers;
  isPressed: boolean;
  lastTapTime: number;
  tapCount: number;
}

export function useTouchFeedback(
  initialConfig?: Partial<TouchFeedbackConfig>
): TouchFeedback {
  const { isHapticFeedbackEnabled, config: accessibilityConfig } = useAccessibility();

  const [config, setConfig] = useState<TouchFeedbackConfig>({
    enabled: true,
    intensity: 'medium',
    delay: 0,
    repeatOnLongPress: false,
    longPressThreshold: accessibilityConfig.slowAnimations ? 800 : 500,
    doubleTapThreshold: 300,
    elderlyMode: accessibilityConfig.simpleNavigation,
    ...initialConfig,
  });

  const [isPressed, setIsPressed] = useState(false);
  const [lastTapTime, setLastTapTime] = useState(0);
  const [tapCount, setTapCount] = useState(0);

  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const doubleTapTimer = useRef<NodeJS.Timeout | null>(null);
  const pressStartTime = useRef<number>(0);

  const updateConfig = useCallback((updates: Partial<TouchFeedbackConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);

  const triggerHaptic = useCallback(async (type: 'button' | 'medication' | 'emergency' | 'navigation' = 'button') => {
    if (!config.enabled || !isHapticFeedbackEnabled) return;

    try {
      if (config.delay > 0) {
        await new Promise(resolve => setTimeout(resolve, config.delay));
      }

      switch (type) {
        case 'medication':
          await hapticFeedback.medicationTaken();
          break;
        case 'emergency':
          await hapticFeedback.emergencyAlert();
          break;
        case 'navigation':
          await hapticFeedback.navigationFeedback();
          break;
        default:
          await hapticFeedback.trigger({
            type: 'button',
            intensity: config.intensity,
          });
      }
    } catch (error) {
      console.warn('Touch feedback error:', error);
    }
  }, [config.enabled, config.intensity, config.delay, isHapticFeedbackEnabled]);

  const onPressIn = useCallback(async () => {
    setIsPressed(true);
    pressStartTime.current = Date.now();

    // Immediate feedback on press
    await triggerHaptic();

    // Set up long press detection
    if (config.repeatOnLongPress) {
      longPressTimer.current = setTimeout(async () => {
        if (isPressed) {
          await triggerHaptic();
          // Continue repeating if still pressed
          const repeatInterval = setInterval(async () => {
            if (isPressed) {
              await triggerHaptic();
            } else {
              clearInterval(repeatInterval);
            }
          }, config.longPressThreshold);
        }
      }, config.longPressThreshold);
    }
  }, [config.repeatOnLongPress, config.longPressThreshold, isPressed, triggerHaptic]);

  const onPressOut = useCallback(async () => {
    setIsPressed(false);

    // Clear long press timer
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }

    // Light feedback on release
    if (config.elderlyMode) {
      await hapticFeedback.trigger({
        type: 'button',
        intensity: 'light',
      });
    }
  }, [config.elderlyMode]);

  const onPress = useCallback(async () => {
    const now = Date.now();
    const timeSinceLastTap = now - lastTapTime;

    if (timeSinceLastTap < config.doubleTapThreshold) {
      // This is a double tap
      setTapCount(2);
      if (doubleTapTimer.current) {
        clearTimeout(doubleTapTimer.current);
        doubleTapTimer.current = null;
      }
    } else {
      // Single tap - wait to see if there's a second tap
      setTapCount(1);
      doubleTapTimer.current = setTimeout(() => {
        setTapCount(0);
      }, config.doubleTapThreshold);
    }

    setLastTapTime(now);
    await triggerHaptic();
  }, [lastTapTime, config.doubleTapThreshold, triggerHaptic]);

  const onLongPress = useCallback(async () => {
    const pressDuration = Date.now() - pressStartTime.current;

    if (pressDuration >= config.longPressThreshold) {
      await hapticFeedback.trigger({
        type: 'button',
        intensity: 'heavy',
        repeat: 2,
        delay: 100,
      });
    }
  }, [config.longPressThreshold]);

  const onDoublePress = useCallback(async () => {
    await hapticFeedback.trigger({
      type: 'button',
      intensity: config.intensity,
      repeat: 2,
      delay: 50,
    });
  }, [config.intensity]);

  const createTouchHandlers = useCallback((
    onAction?: () => void,
    feedbackType: 'button' | 'medication' | 'emergency' | 'navigation' = 'button'
  ): TouchFeedbackHandlers => {
    return {
      onPress: async () => {
        await triggerHaptic(feedbackType);
        onAction?.();
      },
      onLongPress: async () => {
        await hapticFeedback.trigger({
          type: feedbackType,
          intensity: 'heavy',
        });
        // Could trigger a different action for long press
      },
      onDoublePress: async () => {
        await hapticFeedback.trigger({
          type: feedbackType,
          intensity: config.intensity,
          repeat: 2,
          delay: 50,
        });
        // Could trigger a different action for double press
      },
      onPressIn: async () => {
        setIsPressed(true);
        pressStartTime.current = Date.now();
        await triggerHaptic(feedbackType);
      },
      onPressOut: async () => {
        setIsPressed(false);
        if (config.elderlyMode) {
          await hapticFeedback.trigger({
            type: feedbackType,
            intensity: 'light',
          });
        }
      },
    };
  }, [triggerHaptic, config.intensity, config.elderlyMode]);

  const handlers: TouchFeedbackHandlers = {
    onPress,
    onLongPress,
    onDoublePress,
    onPressIn,
    onPressOut,
  };

  return {
    config,
    updateConfig,
    handlers,
    createTouchHandlers,
    isPressed,
    lastTapTime,
    tapCount,
  };
}

// Specialized hooks for different interaction types
export function useMedicationTouchFeedback() {
  const touchFeedback = useTouchFeedback({
    intensity: 'medium',
    elderlyMode: true,
    longPressThreshold: 800,
  });

  const createMedicationHandlers = useCallback((
    onMarkTaken?: () => void,
    onMarkMissed?: () => void,
    onOpenDetails?: () => void
  ) => {
    return {
      onMarkTaken: touchFeedback.createTouchHandlers(onMarkTaken, 'medication'),
      onMarkMissed: touchFeedback.createTouchHandlers(onMarkMissed, 'button'),
      onOpenDetails: touchFeedback.createTouchHandlers(onOpenDetails, 'navigation'),
    };
  }, [touchFeedback]);

  return {
    ...touchFeedback,
    createMedicationHandlers,
  };
}

export function useEmergencyTouchFeedback() {
  const touchFeedback = useTouchFeedback({
    intensity: 'heavy',
    elderlyMode: true,
    longPressThreshold: 1000, // Longer threshold for emergency actions
    repeatOnLongPress: true,
  });

  const createEmergencyHandlers = useCallback((
    onEmergencyCall?: () => void,
    onMedicalAlert?: () => void
  ) => {
    return {
      onEmergencyCall: touchFeedback.createTouchHandlers(onEmergencyCall, 'emergency'),
      onMedicalAlert: touchFeedback.createTouchHandlers(onMedicalAlert, 'emergency'),
    };
  }, [touchFeedback]);

  return {
    ...touchFeedback,
    createEmergencyHandlers,
  };
}

export function useNavigationTouchFeedback() {
  const touchFeedback = useTouchFeedback({
    intensity: 'light',
    elderlyMode: false,
    longPressThreshold: 500,
  });

  const createNavigationHandlers = useCallback((
    onNavigate?: () => void,
    onBack?: () => void
  ) => {
    return {
      onNavigate: touchFeedback.createTouchHandlers(onNavigate, 'navigation'),
      onBack: touchFeedback.createTouchHandlers(onBack, 'navigation'),
    };
  }, [touchFeedback]);

  return {
    ...touchFeedback,
    createNavigationHandlers,
  };
}