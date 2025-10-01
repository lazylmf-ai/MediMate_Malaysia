/**
 * Gesture Navigation Hook
 * Provides gesture-based navigation optimized for elderly users and accessibility
 */

import { useCallback, useRef, useState, useEffect } from 'react';
import {
  PanGestureHandler,
  State,
  GestureHandlerStateChangeEvent,
  PanGestureHandlerEventPayload,
} from 'react-native-gesture-handler';
import { useNavigation } from '@react-navigation/native';
import { Dimensions, Platform } from 'react-native';
import { hapticFeedback } from '../../utils/accessibility/HapticFeedback';
import { voiceGuidance } from '../../utils/accessibility/VoiceGuidance';
import { useAccessibility } from '../../utils/accessibility/useAccessibility';

export interface GestureConfig {
  swipeThreshold: number;
  velocityThreshold: number;
  enableBackGesture: boolean;
  enableTabSwitching: boolean;
  enableAccessibilityAnnouncements: boolean;
  elderlyMode: boolean;
  debugMode: boolean;
}

export interface GestureNavigation {
  onGestureEvent: (event: GestureHandlerStateChangeEvent<PanGestureHandlerEventPayload>) => void;
  onHandlerStateChange: (event: GestureHandlerStateChangeEvent<PanGestureHandlerEventPayload>) => void;
  gestureRef: React.RefObject<PanGestureHandler>;
  config: GestureConfig;
  updateConfig: (updates: Partial<GestureConfig>) => void;
  isGestureActive: boolean;
  currentDirection: 'none' | 'left' | 'right' | 'up' | 'down';
}

export interface SwipeAction {
  direction: 'left' | 'right' | 'up' | 'down';
  action: () => void;
  description: string;
  requiresConfirmation?: boolean;
  hapticPattern?: 'light' | 'medium' | 'heavy';
}

export function useGestureNavigation(
  customActions: SwipeAction[] = [],
  initialConfig?: Partial<GestureConfig>
): GestureNavigation {
  const navigation = useNavigation();
  const { isVoiceGuidanceEnabled, config: accessibilityConfig } = useAccessibility();
  const gestureRef = useRef<PanGestureHandler>(null);

  const screenWidth = Dimensions.get('window').width;
  const screenHeight = Dimensions.get('window').height;

  const [config, setConfig] = useState<GestureConfig>({
    swipeThreshold: accessibilityConfig.increasedTouchTargets ? 80 : 50,
    velocityThreshold: accessibilityConfig.slowAnimations ? 200 : 300,
    enableBackGesture: true,
    enableTabSwitching: true,
    enableAccessibilityAnnouncements: true,
    elderlyMode: accessibilityConfig.simpleNavigation,
    debugMode: false,
    ...initialConfig,
  });

  const [isGestureActive, setIsGestureActive] = useState(false);
  const [currentDirection, setCurrentDirection] = useState<'none' | 'left' | 'right' | 'up' | 'down'>('none');
  const [gestureStartPosition, setGestureStartPosition] = useState({ x: 0, y: 0 });

  // Update config based on accessibility changes
  useEffect(() => {
    setConfig(prev => ({
      ...prev,
      swipeThreshold: accessibilityConfig.increasedTouchTargets ? 80 : 50,
      velocityThreshold: accessibilityConfig.slowAnimations ? 200 : 300,
      elderlyMode: accessibilityConfig.simpleNavigation,
    }));
  }, [accessibilityConfig]);

  const updateConfig = useCallback((updates: Partial<GestureConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);

  const determineSwipeDirection = useCallback((
    deltaX: number,
    deltaY: number,
    velocityX: number,
    velocityY: number
  ): 'left' | 'right' | 'up' | 'down' | null => {
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    const absVelocityX = Math.abs(velocityX);
    const absVelocityY = Math.abs(velocityY);

    // Check if the gesture meets the threshold requirements
    const meetsThreshold = absX > config.swipeThreshold || absY > config.swipeThreshold;
    const meetsVelocity = absVelocityX > config.velocityThreshold || absVelocityY > config.velocityThreshold;

    if (!meetsThreshold && !meetsVelocity) {
      return null;
    }

    // Determine primary direction
    if (absX > absY) {
      // Horizontal swipe
      return deltaX > 0 ? 'right' : 'left';
    } else {
      // Vertical swipe
      return deltaY > 0 ? 'down' : 'up';
    }
  }, [config.swipeThreshold, config.velocityThreshold]);

  const handleBackGesture = useCallback(async () => {
    if (!config.enableBackGesture) return;

    try {
      if (navigation.canGoBack()) {
        await hapticFeedback.navigationFeedback();

        if (config.enableAccessibilityAnnouncements && isVoiceGuidanceEnabled) {
          await voiceGuidance.speakNavigationGuide('Going back');
        }

        navigation.goBack();
      } else {
        await hapticFeedback.trigger({
          type: 'warning',
          intensity: 'light',
        });

        if (config.enableAccessibilityAnnouncements && isVoiceGuidanceEnabled) {
          await voiceGuidance.speak({
            text: 'Cannot go back from this screen',
            priority: 'normal',
            interrupt: false,
          });
        }
      }
    } catch (error) {
      console.error('Back gesture error:', error);
    }
  }, [config.enableBackGesture, config.enableAccessibilityAnnouncements, navigation, isVoiceGuidanceEnabled]);

  const handleTabSwitching = useCallback(async (direction: 'left' | 'right') => {
    if (!config.enableTabSwitching) return;

    try {
      const state = navigation.getState();

      if (state.type === 'tab') {
        const currentIndex = state.index;
        const tabCount = state.routes.length;

        let newIndex: number;
        if (direction === 'left') {
          newIndex = currentIndex > 0 ? currentIndex - 1 : tabCount - 1;
        } else {
          newIndex = currentIndex < tabCount - 1 ? currentIndex + 1 : 0;
        }

        await hapticFeedback.navigationFeedback();

        if (config.enableAccessibilityAnnouncements && isVoiceGuidanceEnabled) {
          const routeName = state.routes[newIndex].name;
          await voiceGuidance.speakNavigationGuide(`Switching to ${routeName} tab`);
        }

        navigation.navigate(state.routes[newIndex].name as never);
      }
    } catch (error) {
      console.error('Tab switching error:', error);
    }
  }, [config.enableTabSwitching, config.enableAccessibilityAnnouncements, navigation, isVoiceGuidanceEnabled]);

  const executeCustomAction = useCallback(async (direction: 'left' | 'right' | 'up' | 'down') => {
    const action = customActions.find(a => a.direction === direction);
    if (!action) return false;

    try {
      // Provide haptic feedback
      await hapticFeedback.trigger({
        type: 'navigation',
        intensity: action.hapticPattern || 'medium',
      });

      // Announce action if accessibility is enabled
      if (config.enableAccessibilityAnnouncements && isVoiceGuidanceEnabled) {
        await voiceGuidance.speakNavigationGuide(action.description);
      }

      // Execute action (with confirmation if required)
      if (action.requiresConfirmation && config.elderlyMode) {
        // In elderly mode, announce the action and wait for confirmation
        if (isVoiceGuidanceEnabled) {
          await voiceGuidance.speak({
            text: `${action.description}. Swipe again to confirm.`,
            priority: 'high',
            interrupt: true,
          });
        }
        // Return true to indicate action was handled but needs confirmation
        return true;
      }

      action.action();
      return true;
    } catch (error) {
      console.error('Custom action error:', error);
      return false;
    }
  }, [customActions, config.enableAccessibilityAnnouncements, config.elderlyMode, isVoiceGuidanceEnabled]);

  const handleSwipeGesture = useCallback(async (direction: 'left' | 'right' | 'up' | 'down') => {
    if (config.debugMode) {
      console.log(`Gesture detected: ${direction}`);
    }

    // Try custom actions first
    const customActionHandled = await executeCustomAction(direction);
    if (customActionHandled) return;

    // Handle system gestures
    switch (direction) {
      case 'right':
        // Right swipe typically goes back
        await handleBackGesture();
        break;

      case 'left':
        // Left swipe could switch tabs or trigger custom action
        if (config.enableTabSwitching) {
          await handleTabSwitching('left');
        }
        break;

      case 'up':
        // Up swipe for menu or additional options
        if (config.enableAccessibilityAnnouncements && isVoiceGuidanceEnabled) {
          await voiceGuidance.speakNavigationGuide('Scroll up gesture detected');
        }
        break;

      case 'down':
        // Down swipe for closing or scrolling
        if (config.enableAccessibilityAnnouncements && isVoiceGuidanceEnabled) {
          await voiceGuidance.speakNavigationGuide('Scroll down gesture detected');
        }
        break;
    }
  }, [config.debugMode, executeCustomAction, handleBackGesture, handleTabSwitching, config.enableAccessibilityAnnouncements, isVoiceGuidanceEnabled]);

  const onHandlerStateChange = useCallback((event: GestureHandlerStateChangeEvent<PanGestureHandlerEventPayload>) => {
    const { state, translationX, translationY, velocityX, velocityY } = event.nativeEvent;

    switch (state) {
      case State.BEGAN:
        setIsGestureActive(true);
        setGestureStartPosition({ x: translationX, y: translationY });
        setCurrentDirection('none');
        break;

      case State.ACTIVE:
        const direction = determineSwipeDirection(translationX, translationY, velocityX, velocityY);
        if (direction) {
          setCurrentDirection(direction);
        }
        break;

      case State.END:
        const finalDirection = determineSwipeDirection(translationX, translationY, velocityX, velocityY);

        if (finalDirection) {
          handleSwipeGesture(finalDirection);
        }

        setIsGestureActive(false);
        setCurrentDirection('none');
        break;

      case State.CANCELLED:
      case State.FAILED:
        setIsGestureActive(false);
        setCurrentDirection('none');
        break;
    }
  }, [determineSwipeDirection, handleSwipeGesture]);

  const onGestureEvent = useCallback((event: GestureHandlerStateChangeEvent<PanGestureHandlerEventPayload>) => {
    // This can be used for real-time gesture tracking if needed
    if (config.debugMode) {
      const { translationX, translationY } = event.nativeEvent;
      console.log(`Gesture position: x=${translationX}, y=${translationY}`);
    }
  }, [config.debugMode]);

  return {
    onGestureEvent,
    onHandlerStateChange,
    gestureRef,
    config,
    updateConfig,
    isGestureActive,
    currentDirection,
  };
}

// Predefined gesture actions for common scenarios
export const createMedicationGestureActions = (
  onMarkTaken: () => void,
  onMarkMissed: () => void,
  onOpenCalendar: () => void,
  onEmergencyCall: () => void
): SwipeAction[] => [
  {
    direction: 'right',
    action: onMarkTaken,
    description: 'Mark medication as taken',
    hapticPattern: 'medium',
  },
  {
    direction: 'left',
    action: onMarkMissed,
    description: 'Mark medication as missed',
    hapticPattern: 'light',
    requiresConfirmation: true,
  },
  {
    direction: 'up',
    action: onOpenCalendar,
    description: 'Open medication calendar',
    hapticPattern: 'light',
  },
  {
    direction: 'down',
    action: onEmergencyCall,
    description: 'Emergency call',
    hapticPattern: 'heavy',
    requiresConfirmation: true,
  },
];

export const createCulturalGestureActions = (
  onPrayerTimeCheck: () => void,
  onFestivalCalendar: () => void,
  onFamilyCall: () => void
): SwipeAction[] => [
  {
    direction: 'up',
    action: onPrayerTimeCheck,
    description: 'Check prayer times',
    hapticPattern: 'light',
  },
  {
    direction: 'down',
    action: onFestivalCalendar,
    description: 'View festival calendar',
    hapticPattern: 'light',
  },
  {
    direction: 'left',
    action: onFamilyCall,
    description: 'Call family member',
    hapticPattern: 'medium',
  },
];