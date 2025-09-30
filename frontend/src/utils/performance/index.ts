/**
 * Performance Utilities Index
 *
 * Exports all performance-related utilities:
 * - LazyLoadManager: Dynamic imports and code splitting
 * - Performance monitoring utilities
 */

export { default as LazyLoadManager } from './LazyLoadManager';
export type {
  LazyLoadConfig,
  LoadableComponent,
} from './LazyLoadManager';

export {
  createLazyComponent,
  registerLazyRoutes,
  preloadComponent,
} from './LazyLoadManager';

// Re-export existing performance utilities
export { performanceMonitor, measureAsync, measureSync } from '../performance';
export type {
  PerformanceMetrics,
  NetworkQuality,
  MemoryInfo,
  BatteryInfo,
} from '../performance';