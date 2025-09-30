/**
 * Performance Services Index
 *
 * Exports all performance optimization services for Stream C:
 * - LaunchOptimizer: App launch time optimization
 * - PerformanceMonitor: Real-time performance tracking
 * - MemoryManager: Memory leak detection and cache management
 */

export { default as LaunchOptimizer } from './LaunchOptimizer';
export type {
  LaunchMetrics,
  PreCacheConfig,
  LaunchOptimizationConfig,
} from './LaunchOptimizer';

export { default as PerformanceMonitor } from './PerformanceMonitor';
export type {
  PerformanceEntry,
  UIPerformanceMetrics,
  MemoryMetrics,
  AppPerformanceReport,
} from './PerformanceMonitor';

export { default as MemoryManager } from './MemoryManager';
export type {
  MemorySnapshot,
  MemoryLeak,
  CacheEntry,
  CacheStats,
  MemoryPressure,
} from './MemoryManager';