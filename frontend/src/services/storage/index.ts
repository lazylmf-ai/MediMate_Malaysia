/**
 * Storage Management Exports
 * Issue #27 Stream D - Battery & Storage Optimization
 */

export { default as StorageManager } from './StorageManager';
export type {
  StorageMetrics,
  StorageQuota,
  DataRetentionPolicy,
  CleanupResult,
  CompressionResult,
  StorageAlert,
  DatabaseMaintenanceResult,
} from './StorageManager';