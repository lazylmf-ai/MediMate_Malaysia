/**
 * Offline Data Types
 *
 * Type definitions for offline data storage, synchronization,
 * and replication in MediMate Malaysia.
 */

import { Medication } from './medication';
import { AdherenceRecord } from './adherence';

// Offline Database Schema Version
export const OFFLINE_DB_VERSION = 1;
export const OFFLINE_DB_NAME = 'medimate_offline.db';

// Offline Medication Data
export interface OfflineMedication extends Medication {
  offlineId: string;
  lastSynced?: Date;
  syncStatus: SyncStatus;
  encryptedData?: string;
}

// Offline Adherence Record
export interface OfflineAdherenceRecord extends AdherenceRecord {
  offlineId: string;
  lastSynced?: Date;
  syncStatus: SyncStatus;
}

// Sync Status
export type SyncStatus =
  | 'synced'          // Fully synchronized with server
  | 'pending'         // Waiting to be synced
  | 'conflict'        // Conflict detected
  | 'error'           // Sync error occurred
  | 'local_only';     // Only exists locally

// Offline Storage Metadata
export interface OfflineMetadata {
  key: string;
  value: string;
  updatedAt: Date;
  syncStatus: SyncStatus;
}

// Data Replication Config
export interface ReplicationConfig {
  enabled: boolean;
  autoSync: boolean;
  syncInterval: number; // milliseconds
  maxRetries: number;
  batchSize: number;
  compressionEnabled: boolean;
}

// Storage Statistics
export interface StorageStats {
  totalSize: number;
  usedSize: number;
  availableSize: number;
  itemCount: number;
  oldestItem: Date;
  newestItem: Date;
  syncedCount: number;
  pendingCount: number;
  errorCount: number;
}

// Offline Query Options
export interface OfflineQueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
  includeDeleted?: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

// Offline Transaction
export interface OfflineTransaction {
  id: string;
  type: 'insert' | 'update' | 'delete';
  tableName: string;
  data: any;
  timestamp: Date;
  status: 'pending' | 'committed' | 'rolled_back';
  retryCount: number;
}

// Database Optimization Config
export interface DatabaseOptimizationConfig {
  vacuumEnabled: boolean;
  vacuumInterval: number; // hours
  indexOptimization: boolean;
  autoMaintenance: boolean;
  compressionLevel: 0 | 1 | 2 | 3; // 0 = none, 3 = maximum
}

// Encryption Config
export interface EncryptionConfig {
  enabled: boolean;
  algorithm: 'AES-256-GCM';
  keyDerivation: 'PBKDF2';
  iterations: number;
  saltLength: number;
}

// Offline Cache Entry
export interface OfflineCacheEntry<T = any> {
  key: string;
  data: T;
  timestamp: Date;
  expiresAt?: Date;
  size: number;
  accessCount: number;
  lastAccessed: Date;
}

// Database Migration
export interface DatabaseMigration {
  version: number;
  name: string;
  up: string; // SQL for upgrade
  down: string; // SQL for downgrade
  appliedAt?: Date;
}

// Offline Sync Operation
export interface SyncOperation {
  id: string;
  type: 'push' | 'pull';
  entity: 'medication' | 'adherence' | 'schedule' | 'cultural';
  startedAt: Date;
  completedAt?: Date;
  status: 'running' | 'completed' | 'failed';
  itemsProcessed: number;
  itemsTotal: number;
  errors: SyncError[];
}

// Sync Error
export interface SyncError {
  id: string;
  operationId: string;
  timestamp: Date;
  message: string;
  stack?: string;
  data?: any;
  retryable: boolean;
}

// Offline Configuration
export interface OfflineConfig {
  maxStorageSize: number; // bytes (default: 100MB)
  maxAge: number; // days (default: 7)
  encryption: EncryptionConfig;
  replication: ReplicationConfig;
  optimization: DatabaseOptimizationConfig;
  autoCleanup: boolean;
  debugMode: boolean;
}

// Default Offline Configuration
export const DEFAULT_OFFLINE_CONFIG: OfflineConfig = {
  maxStorageSize: 100 * 1024 * 1024, // 100MB
  maxAge: 7, // 7 days
  encryption: {
    enabled: true,
    algorithm: 'AES-256-GCM',
    keyDerivation: 'PBKDF2',
    iterations: 100000,
    saltLength: 32,
  },
  replication: {
    enabled: true,
    autoSync: true,
    syncInterval: 5 * 60 * 1000, // 5 minutes
    maxRetries: 3,
    batchSize: 50,
    compressionEnabled: true,
  },
  optimization: {
    vacuumEnabled: true,
    vacuumInterval: 24, // hours
    indexOptimization: true,
    autoMaintenance: true,
    compressionLevel: 2,
  },
  autoCleanup: true,
  debugMode: false,
};

// Offline Data State
export interface OfflineDataState {
  isInitialized: boolean;
  isOnline: boolean;
  lastSync?: Date;
  syncInProgress: boolean;
  pendingOperations: number;
  storageStats: StorageStats;
  errors: SyncError[];
}