/**
 * Incremental Sync Engine
 *
 * Implements efficient incremental synchronization with timestamp-based delta sync
 * and entity-level tracking.
 * Part of Issue #27 Stream B - Intelligent Synchronization & Conflict Resolution
 *
 * Features:
 * - Timestamp-based delta synchronization
 * - Entity-level change tracking
 * - Efficient data transfer minimization
 * - Checksum validation
 * - Sync state persistence
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SyncEntity {
  id: string;
  type: 'medication' | 'schedule' | 'adherence' | 'preference' | 'family_member';
  data: any;
  timestamp: Date;
  checksum: string;
  version: number;
}

export interface SyncState {
  lastSyncTimestamp: Date;
  entityTimestamps: Map<string, Date>;
  entityChecksums: Map<string, string>;
  pendingChanges: SyncEntity[];
  failedSyncs: Array<{ entity: SyncEntity; error: string; attempts: number }>;
}

export interface DeltaSyncResult {
  uploaded: SyncEntity[];
  downloaded: SyncEntity[];
  unchanged: string[];
  conflicts: string[];
  bytesTransferred: number;
  syncDuration: number;
}

export interface IncrementalSyncConfig {
  enabled: boolean;
  checksumValidation: boolean;
  compressionEnabled: boolean;
  batchSize: number;
  maxRetryAttempts: number;
  conflictDetectionEnabled: boolean;
}

class IncrementalSyncEngine {
  private static instance: IncrementalSyncEngine;
  private config: IncrementalSyncConfig;
  private syncState: SyncState;

  private readonly STORAGE_KEYS = {
    SYNC_STATE: 'incremental_sync_state',
    ENTITY_TIMESTAMPS: 'entity_timestamps',
    ENTITY_CHECKSUMS: 'entity_checksums',
    PENDING_CHANGES: 'pending_sync_changes'
  };

  private constructor() {
    this.config = this.getDefaultConfig();
    this.syncState = this.getDefaultSyncState();
  }

  static getInstance(): IncrementalSyncEngine {
    if (!IncrementalSyncEngine.instance) {
      IncrementalSyncEngine.instance = new IncrementalSyncEngine();
    }
    return IncrementalSyncEngine.instance;
  }

  /**
   * Initialize the incremental sync engine
   */
  async initialize(config?: Partial<IncrementalSyncConfig>): Promise<void> {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    await this.loadSyncState();

    console.log('IncrementalSyncEngine initialized');
  }

  /**
   * Track a local entity change
   */
  async trackEntityChange(
    entityId: string,
    entityType: SyncEntity['type'],
    data: any
  ): Promise<void> {
    const timestamp = new Date();
    const checksum = this.calculateChecksum(data);

    const entity: SyncEntity = {
      id: entityId,
      type: entityType,
      data,
      timestamp,
      checksum,
      version: this.getEntityVersion(entityId) + 1
    };

    // Update sync state
    this.syncState.entityTimestamps.set(entityId, timestamp);
    this.syncState.entityChecksums.set(entityId, checksum);

    // Add to pending changes if different from last known state
    const existingIndex = this.syncState.pendingChanges.findIndex(e => e.id === entityId);
    if (existingIndex >= 0) {
      this.syncState.pendingChanges[existingIndex] = entity;
    } else {
      this.syncState.pendingChanges.push(entity);
    }

    await this.saveSyncState();
  }

  /**
   * Get entities modified since last sync
   */
  getModifiedEntities(sinceTimestamp?: Date): SyncEntity[] {
    const since = sinceTimestamp || this.syncState.lastSyncTimestamp;

    return this.syncState.pendingChanges.filter(
      entity => entity.timestamp > since
    );
  }

  /**
   * Perform incremental sync
   */
  async performIncrementalSync(
    uploadFn: (entities: SyncEntity[]) => Promise<SyncEntity[]>,
    downloadFn: (since: Date) => Promise<SyncEntity[]>
  ): Promise<DeltaSyncResult> {
    const startTime = Date.now();
    const result: DeltaSyncResult = {
      uploaded: [],
      downloaded: [],
      unchanged: [],
      conflicts: [],
      bytesTransferred: 0,
      syncDuration: 0
    };

    try {
      console.log('Starting incremental sync...');

      // Get entities to upload (modified since last sync)
      const toUpload = this.getModifiedEntities();

      if (toUpload.length > 0) {
        console.log(`Uploading ${toUpload.length} modified entities`);

        // Upload in batches
        const batches = this.createBatches(toUpload, this.config.batchSize);

        for (const batch of batches) {
          try {
            const uploaded = await uploadFn(batch);
            result.uploaded.push(...uploaded);

            // Calculate bytes transferred (approximate)
            const batchSize = JSON.stringify(batch).length;
            result.bytesTransferred += batchSize;

            // Remove uploaded entities from pending changes
            this.syncState.pendingChanges = this.syncState.pendingChanges.filter(
              entity => !uploaded.some(u => u.id === entity.id)
            );

          } catch (uploadError) {
            console.error('Batch upload failed:', uploadError);
            // Track failed syncs
            for (const entity of batch) {
              this.trackFailedSync(entity, uploadError instanceof Error ? uploadError.message : 'Upload failed');
            }
          }
        }
      }

      // Download entities modified on server since last sync
      console.log(`Downloading changes since ${this.syncState.lastSyncTimestamp.toISOString()}`);
      const downloaded = await downloadFn(this.syncState.lastSyncTimestamp);

      if (downloaded.length > 0) {
        console.log(`Downloaded ${downloaded.length} modified entities from server`);

        for (const serverEntity of downloaded) {
          // Check for conflicts
          const localEntity = this.syncState.pendingChanges.find(e => e.id === serverEntity.id);

          if (localEntity) {
            // Conflict detected - both local and server modified
            if (this.config.conflictDetectionEnabled) {
              result.conflicts.push(serverEntity.id);
              console.log(`Conflict detected for entity ${serverEntity.id}`);
              continue; // Skip applying server version, let conflict resolver handle it
            }
          }

          // Check if entity actually changed using checksum
          const localChecksum = this.syncState.entityChecksums.get(serverEntity.id);

          if (this.config.checksumValidation && localChecksum === serverEntity.checksum) {
            result.unchanged.push(serverEntity.id);
            continue; // No actual change, skip
          }

          // Apply server entity
          await this.applyServerEntity(serverEntity);
          result.downloaded.push(serverEntity);
        }

        // Calculate bytes transferred (approximate)
        const downloadSize = JSON.stringify(downloaded).length;
        result.bytesTransferred += downloadSize;
      }

      // Update last sync timestamp
      this.syncState.lastSyncTimestamp = new Date();
      await this.saveSyncState();

      result.syncDuration = Date.now() - startTime;

      console.log(`Incremental sync completed: ${result.uploaded.length} uploaded, ${result.downloaded.length} downloaded, ${result.unchanged.length} unchanged, ${result.conflicts.length} conflicts in ${result.syncDuration}ms`);

      return result;

    } catch (error) {
      console.error('Incremental sync failed:', error);
      result.syncDuration = Date.now() - startTime;
      throw error;
    }
  }

  /**
   * Check if entity has local changes
   */
  hasLocalChanges(entityId: string): boolean {
    return this.syncState.pendingChanges.some(e => e.id === entityId);
  }

  /**
   * Get entity sync status
   */
  getEntitySyncStatus(entityId: string): {
    lastSynced?: Date;
    hasPendingChanges: boolean;
    checksum?: string;
    version: number;
  } {
    return {
      lastSynced: this.syncState.entityTimestamps.get(entityId),
      hasPendingChanges: this.hasLocalChanges(entityId),
      checksum: this.syncState.entityChecksums.get(entityId),
      version: this.getEntityVersion(entityId)
    };
  }

  /**
   * Get pending changes count
   */
  getPendingChangesCount(): number {
    return this.syncState.pendingChanges.length;
  }

  /**
   * Get failed syncs
   */
  getFailedSyncs(): Array<{ entity: SyncEntity; error: string; attempts: number }> {
    return [...this.syncState.failedSyncs];
  }

  /**
   * Retry failed syncs
   */
  retryFailedSyncs(): void {
    // Move failed syncs back to pending if under retry limit
    const toRetry = this.syncState.failedSyncs.filter(
      fs => fs.attempts < this.config.maxRetryAttempts
    );

    for (const failed of toRetry) {
      // Add back to pending
      if (!this.syncState.pendingChanges.some(e => e.id === failed.entity.id)) {
        this.syncState.pendingChanges.push(failed.entity);
      }
    }

    // Remove retried items from failed syncs
    this.syncState.failedSyncs = this.syncState.failedSyncs.filter(
      fs => fs.attempts >= this.config.maxRetryAttempts
    );

    this.saveSyncState();
  }

  /**
   * Clear sync state (useful for full resync)
   */
  async clearSyncState(): Promise<void> {
    this.syncState = this.getDefaultSyncState();
    await this.saveSyncState();
  }

  /**
   * Private helper methods
   */

  private calculateChecksum(data: any): string {
    // Simple hash function for checksums
    // In production, could use expo-crypto's digestStringAsync for true SHA256
    const dataString = JSON.stringify(data);
    return dataString.split('').reduce((hash, char) => {
      return ((hash << 5) - hash) + char.charCodeAt(0);
    }, 0).toString(36);
  }

  private getEntityVersion(entityId: string): number {
    // Find latest version from pending changes
    const entity = this.syncState.pendingChanges.find(e => e.id === entityId);
    return entity?.version || 0;
  }

  private async applyServerEntity(entity: SyncEntity): Promise<void> {
    // Update local sync state with server entity
    this.syncState.entityTimestamps.set(entity.id, entity.timestamp);
    this.syncState.entityChecksums.set(entity.id, entity.checksum);

    // Remove from pending changes if present
    this.syncState.pendingChanges = this.syncState.pendingChanges.filter(
      e => e.id !== entity.id
    );

    // In a real implementation, this would update the local database
    // For now, we just track the sync state
    console.log(`Applied server entity: ${entity.type}/${entity.id}`);
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];

    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }

    return batches;
  }

  private trackFailedSync(entity: SyncEntity, error: string): void {
    const existing = this.syncState.failedSyncs.find(fs => fs.entity.id === entity.id);

    if (existing) {
      existing.attempts++;
      existing.error = error;
    } else {
      this.syncState.failedSyncs.push({
        entity,
        error,
        attempts: 1
      });
    }

    this.saveSyncState();
  }

  /**
   * Storage methods
   */

  private async loadSyncState(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEYS.SYNC_STATE);
      if (stored) {
        const state = JSON.parse(stored);

        this.syncState = {
          lastSyncTimestamp: new Date(state.lastSyncTimestamp),
          entityTimestamps: new Map(state.entityTimestamps),
          entityChecksums: new Map(state.entityChecksums),
          pendingChanges: state.pendingChanges.map((e: any) => ({
            ...e,
            timestamp: new Date(e.timestamp)
          })),
          failedSyncs: state.failedSyncs.map((fs: any) => ({
            ...fs,
            entity: {
              ...fs.entity,
              timestamp: new Date(fs.entity.timestamp)
            }
          }))
        };
      }
    } catch (error) {
      console.error('Failed to load sync state:', error);
    }
  }

  private async saveSyncState(): Promise<void> {
    try {
      const state = {
        lastSyncTimestamp: this.syncState.lastSyncTimestamp.toISOString(),
        entityTimestamps: Array.from(this.syncState.entityTimestamps.entries()),
        entityChecksums: Array.from(this.syncState.entityChecksums.entries()),
        pendingChanges: this.syncState.pendingChanges,
        failedSyncs: this.syncState.failedSyncs
      };

      await AsyncStorage.setItem(this.STORAGE_KEYS.SYNC_STATE, JSON.stringify(state));
    } catch (error) {
      console.error('Failed to save sync state:', error);
    }
  }

  private getDefaultConfig(): IncrementalSyncConfig {
    return {
      enabled: true,
      checksumValidation: true,
      compressionEnabled: true,
      batchSize: 50,
      maxRetryAttempts: 3,
      conflictDetectionEnabled: true
    };
  }

  private getDefaultSyncState(): SyncState {
    return {
      lastSyncTimestamp: new Date(0), // Epoch - will sync everything on first run
      entityTimestamps: new Map(),
      entityChecksums: new Map(),
      pendingChanges: [],
      failedSyncs: []
    };
  }

  /**
   * Cleanup
   */
  async cleanup(): Promise<void> {
    await this.saveSyncState();
  }
}

export default IncrementalSyncEngine;