/**
 * Accessibility Utilities Index
 * Central export for all accessibility-related utilities and services
 */

// Core accessibility configuration
export {
  AccessibilityManager,
  accessibilityManager,
  type AccessibilityConfig,
  type TextSizeScale,
  type TouchTargetSizes,
  type AccessibilityColors,
} from './AccessibilityConfig';

// React hooks
export {
  useAccessibility,
  type UseAccessibilityReturn,
} from './useAccessibility';

// Voice guidance system
export {
  VoiceGuidanceService,
  voiceGuidance,
  type VoiceGuidanceConfig,
  type SpeechOptions,
} from './VoiceGuidance';

// Haptic feedback system
export {
  HapticFeedbackService,
  hapticFeedback,
  type HapticPattern,
  type CustomHapticPattern,
} from './HapticFeedback';

// Accessibility components
export { AccessibilityButton } from './components/AccessibilityButton';
export { LargeTextMode } from './components/LargeTextMode';
export { EmergencyAccessPanel } from './components/EmergencyAccessPanel';
export { VoiceGuidedNavigation } from './components/VoiceGuidedNavigation';