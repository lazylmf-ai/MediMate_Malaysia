/**
 * Mobile Hooks Index
 * Central export for all mobile-specific React hooks
 */

// Gesture navigation
export {
  useGestureNavigation,
  createMedicationGestureActions,
  createCulturalGestureActions,
  type GestureConfig,
  type GestureNavigation,
  type SwipeAction,
} from './useGestureNavigation';

// Mobile optimization
export {
  useMobileOptimization,
  useComponentOptimization,
  type PerformanceMetrics,
  type OptimizationConfig,
  type MobileOptimization,
} from './useMobileOptimization';

// Touch and haptic feedback
export { useTouchFeedback } from './useTouchFeedback';

// Battery and power management
export { useBatteryOptimization } from './useBatteryOptimization';

// Network and connectivity
export { useNetworkOptimization } from './useNetworkOptimization';