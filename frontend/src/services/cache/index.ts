/**
 * Cache Management Exports
 * Issue #27 Stream D - Battery & Storage Optimization
 */

export { cacheService } from './cacheService';
export { default as EnhancedCacheManager } from './EnhancedCacheManager';
export type {
  CacheEntry,
  CacheStats,
} from './cacheService';
export type {
  CacheTier,
  EnhancedCacheEntry,
  CacheStatistics,
  PrefetchStrategy,
  CacheConfig,
  EvictionCandidate,
} from './EnhancedCacheManager';