/**
 * Enhanced Sync Manager
 *
 * Extends the base SyncManager with intelligent conflict resolution, incremental sync,
 * and advanced queue management.
 * Part of Issue #27 Stream B - Intelligent Synchronization & Conflict Resolution
 *
 * Features:
 * - Intelligent conflict resolution with multiple strategies
 * - Incremental delta synchronization
 * - Priority-based queue processing
 * - Connection-aware sync triggering
 * - Comprehensive sync analytics
 * - Automatic retry with exponential backoff
 */

import SyncManager, { SyncResult, SyncConfig, SyncStatus } from './SyncManager';
import ConflictResolver, { ConflictData, ConflictResolution } from '../conflict/ConflictResolver';
import IncrementalSyncEngine, { SyncEntity, DeltaSyncResult } from './IncrementalSyncEngine';
import SyncQueueManager, { SyncOperation, QueueBatch } from './SyncQueueManager';
import ConnectionStateManager, { ConnectionState } from './ConnectionStateManager';

export interface EnhancedSyncResult extends SyncResult {
  incrementalSyncEnabled: boolean;
  deltaSyncStats?: DeltaSyncResult;
  conflictResolutions: ConflictResolution[];
  queueStats: {
    operationsProcessed: number;
    operationsFailed: number;
    operationsPending: number;
  };
  connectionQuality: string;
  bytesTransferred: number;
}

export interface EnhancedSyncConfig extends SyncConfig {
  incrementalSync: {
    enabled: boolean;
    checksumValidation: boolean;
    batchSize: number;
  };
  conflictResolution: {
    strategy: 'last_write_wins' | 'three_way_merge' | 'user_review';
    medicationSafetyPriority: boolean;
    userReviewThreshold: number;
  };
  queueManagement: {
    enabled: boolean;
    maxQueueSize: number;
    batchingEnabled: boolean;
    maxRetryAttempts: number;
  };
  connectionManagement: {
    syncOnStableConnectionOnly: boolean;
    minimumConnectionQuality: 'poor' | 'good' | 'excellent';
    avoidMeteredConnections: boolean;
  };
}

class EnhancedSyncManager {
  private static instance: EnhancedSyncManager;
  private baseSyncManager: SyncManager;
  private conflictResolver: ConflictResolver;
  private incrementalSyncEngine: IncrementalSyncEngine;
  private syncQueueManager: SyncQueueManager;
  private connectionStateManager: ConnectionStateManager;
  private config: EnhancedSyncConfig;
  private isInitialized = false;
  private syncInProgress = false;
  private autoSyncEnabled = true;
  private connectionStateUnsubscribe?: () => void;

  private constructor() {
    this.baseSyncManager = SyncManager.getInstance();
    this.conflictResolver = ConflictResolver.getInstance();
    this.incrementalSyncEngine = IncrementalSyncEngine.getInstance();
    this.syncQueueManager = SyncQueueManager.getInstance();
    this.connectionStateManager = ConnectionStateManager.getInstance();
    this.config = this.getDefaultConfig();
  }

  static getInstance(): EnhancedSyncManager {
    if (!EnhancedSyncManager.instance) {
      EnhancedSyncManager.instance = new EnhancedSyncManager();
    }
    return EnhancedSyncManager.instance;
  }

  /**
   * Initialize the enhanced sync manager
   */
  async initialize(config?: Partial<EnhancedSyncConfig>): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('Initializing Enhanced Sync Manager...');

      // Merge configuration
      if (config) {
        this.config = { ...this.config, ...config };
      }

      // Initialize base sync manager
      const baseResult = await this.baseSyncManager.initialize(this.config);
      if (!baseResult.success) {
        throw new Error(`Base sync manager initialization failed: ${baseResult.error}`);
      }

      // Initialize conflict resolver
      await this.conflictResolver.initialize({
        defaultStrategy: this.config.conflictResolution.strategy === 'last_write_wins' ? 'last_write_wins' : 'three_way_merge',
        medicationSafetyPriority: this.config.conflictResolution.medicationSafetyPriority,
        userReviewThreshold: this.config.conflictResolution.userReviewThreshold
      });

      // Initialize incremental sync engine
      if (this.config.incrementalSync.enabled) {
        await this.incrementalSyncEngine.initialize({
          enabled: true,
          checksumValidation: this.config.incrementalSync.checksumValidation,
          batchSize: this.config.incrementalSync.batchSize
        });
      }

      // Initialize sync queue manager
      if (this.config.queueManagement.enabled) {
        await this.syncQueueManager.initialize({
          maxQueueSize: this.config.queueManagement.maxQueueSize,
          batchingEnabled: this.config.queueManagement.batchingEnabled,
          maxRetryAttempts: this.config.queueManagement.maxRetryAttempts
        });
      }

      // Initialize connection state manager
      await this.connectionStateManager.initialize();

      // Subscribe to connection state changes
      this.connectionStateUnsubscribe = this.connectionStateManager.onStateChange(state => {
        this.handleConnectionStateChange(state);
      });

      this.isInitialized = true;
      console.log('Enhanced Sync Manager initialized successfully');

      return { success: true };

    } catch (error) {
      console.error('Failed to initialize Enhanced Sync Manager:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Initialization failed'
      };
    }
  }

  /**
   * Perform enhanced synchronization
   */
  async performSync(): Promise<EnhancedSyncResult> {
    if (!this.isInitialized) {
      throw new Error('Enhanced Sync Manager not initialized');
    }

    if (this.syncInProgress) {
      throw new Error('Sync already in progress');
    }

    const startTime = Date.now();
    this.syncInProgress = true;

    const result: EnhancedSyncResult = {
      success: false,
      timestamp: new Date(),
      duration: 0,
      uploaded: { schedules: 0, preferences: 0, history: 0 },
      downloaded: { schedules: 0, preferences: 0, updates: 0 },
      conflicts: [],
      errors: [],
      networkInfo: this.getNetworkInfo(),
      incrementalSyncEnabled: this.config.incrementalSync.enabled,
      conflictResolutions: [],
      queueStats: {
        operationsProcessed: 0,
        operationsFailed: 0,
        operationsPending: 0
      },
      connectionQuality: this.connectionStateManager.getConnectionState().connectionQuality,
      bytesTransferred: 0
    };

    try {
      console.log('Starting enhanced synchronization...');

      // Check connection state
      if (!this.shouldSync()) {
        throw new Error('Connection not suitable for sync');
      }

      // Process sync queue
      if (this.config.queueManagement.enabled) {
        const queueResult = await this.processQueuedOperations();
        result.queueStats = queueResult;
      }

      // Perform incremental sync if enabled
      if (this.config.incrementalSync.enabled) {
        const deltaSyncResult = await this.performIncrementalSync();
        result.deltaSyncStats = deltaSyncResult;
        result.bytesTransferred = deltaSyncResult.bytesTransferred;

        // Handle conflicts detected during incremental sync
        if (deltaSyncResult.conflicts.length > 0) {
          const conflictResolutions = await this.resolveIncrementalConflicts(deltaSyncResult.conflicts);
          result.conflictResolutions = conflictResolutions;
        }
      } else {
        // Fall back to base sync manager
        const baseResult = await this.baseSyncManager.performSync();
        result.uploaded = baseResult.uploaded;
        result.downloaded = baseResult.downloaded;
        result.conflicts = baseResult.conflicts;
        result.errors = baseResult.errors;
      }

      result.success = result.errors.length === 0;
      console.log('Enhanced synchronization completed successfully');

    } catch (error) {
      console.error('Enhanced synchronization failed:', error);
      result.errors.push(error instanceof Error ? error.message : 'Sync failed');
    } finally {
      this.syncInProgress = false;
      result.duration = Date.now() - startTime;
    }

    return result;
  }

  /**
   * Queue a data change for synchronization
   */
  async queueDataChange(
    entityType: SyncOperation['entityType'],
    operationType: SyncOperation['type'],
    entityId: string,
    data: any,
    priority: number = 5
  ): Promise<string> {
    if (!this.config.queueManagement.enabled) {
      throw new Error('Queue management not enabled');
    }

    // Track change in incremental sync engine
    if (this.config.incrementalSync.enabled && operationType !== 'delete') {
      await this.incrementalSyncEngine.trackEntityChange(entityId, entityType, data);
    }

    // Add to queue
    const operationId = await this.syncQueueManager.enqueue({
      type: operationType,
      entityType,
      entityId,
      data,
      priority
    });

    // Trigger sync if online and auto-sync enabled
    if (this.autoSyncEnabled && this.shouldSync()) {
      // Trigger async sync (don't await)
      this.performSync().catch(error => {
        console.error('Auto-sync failed:', error);
      });
    }

    return operationId;
  }

  /**
   * Get sync status with enhanced information
   */
  getEnhancedSyncStatus(): SyncStatus & {
    incrementalSyncEnabled: boolean;
    pendingChanges: number;
    connectionQuality: string;
    syncRecommended: boolean;
    queueStats: any;
  } {
    const baseStatus = this.baseSyncManager.getSyncStatus();
    const queueStats = this.config.queueManagement.enabled
      ? this.syncQueueManager.getStats()
      : null;
    const pendingChanges = this.config.incrementalSync.enabled
      ? this.incrementalSyncEngine.getPendingChangesCount()
      : 0;

    return {
      ...baseStatus,
      incrementalSyncEnabled: this.config.incrementalSync.enabled,
      pendingChanges,
      connectionQuality: this.connectionStateManager.getConnectionState().connectionQuality,
      syncRecommended: this.shouldSync(),
      queueStats
    };
  }

  /**
   * Get pending conflicts requiring user review
   */
  getPendingConflicts(): ConflictData[] {
    return this.conflictResolver.getPendingConflicts();
  }

  /**
   * Resolve conflict with user choice
   */
  async resolveConflictWithUserChoice(
    conflictId: string,
    chosenData: any,
    reasoning: string
  ): Promise<{ success: boolean; error?: string }> {
    return this.conflictResolver.resolveWithUserChoice(conflictId, chosenData, reasoning);
  }

  /**
   * Enable/disable automatic synchronization
   */
  setAutoSync(enabled: boolean): void {
    this.autoSyncEnabled = enabled;
    console.log(`Auto-sync ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Private helper methods
   */

  private async handleConnectionStateChange(state: ConnectionState): Promise<void> {
    console.log(`Connection state changed: ${state.connectionQuality} (${state.connectionType})`);

    // Trigger sync if just came online with stable connection
    if (state.stableConnection && this.autoSyncEnabled) {
      if (this.shouldSyncWithConnectionState(state)) {
        console.log('Connection restored - triggering sync');

        // Delay sync slightly to allow connection to fully stabilize
        setTimeout(() => {
          this.performSync().catch(error => {
            console.error('Connection restore sync failed:', error);
          });
        }, 2000);
      }
    }
  }

  private shouldSync(): boolean {
    const connectionState = this.connectionStateManager.getConnectionState();
    return this.shouldSyncWithConnectionState(connectionState);
  }

  private shouldSyncWithConnectionState(state: ConnectionState): boolean {
    if (!state.isConnected) {
      return false;
    }

    if (this.config.connectionManagement.syncOnStableConnectionOnly && !state.stableConnection) {
      return false;
    }

    // Check minimum connection quality
    const qualityOrder = ['poor', 'good', 'excellent'];
    const minQualityIndex = qualityOrder.indexOf(this.config.connectionManagement.minimumConnectionQuality);
    const currentQualityIndex = qualityOrder.indexOf(state.connectionQuality);

    if (currentQualityIndex < minQualityIndex) {
      return false;
    }

    // Check metered connection setting
    if (this.config.connectionManagement.avoidMeteredConnections && state.isMetered) {
      return false;
    }

    return true;
  }

  private async processQueuedOperations(): Promise<{
    operationsProcessed: number;
    operationsFailed: number;
    operationsPending: number;
  }> {
    const stats = {
      operationsProcessed: 0,
      operationsFailed: 0,
      operationsPending: 0
    };

    try {
      // Get next batch to process
      const batch = await this.syncQueueManager.getNextBatch();

      if (!batch) {
        return stats;
      }

      console.log(`Processing queue batch with ${batch.operations.length} operations`);

      // Mark as processing
      await this.syncQueueManager.markBatchProcessing(batch);

      // Process each operation
      for (const operation of batch.operations) {
        try {
          // In a real implementation, this would make API calls to sync the data
          // For now, we simulate success
          await this.syncOperation(operation);

          await this.syncQueueManager.markOperationCompleted(operation.id);
          stats.operationsProcessed++;

        } catch (error) {
          console.error(`Operation ${operation.id} failed:`, error);
          const willRetry = await this.syncQueueManager.markOperationFailed(
            operation.id,
            error instanceof Error ? error.message : 'Operation failed'
          );

          if (!willRetry) {
            stats.operationsFailed++;
          }
        }
      }

      // Get pending count
      stats.operationsPending = this.syncQueueManager.getStats().pendingOperations;

    } catch (error) {
      console.error('Queue processing failed:', error);
    }

    return stats;
  }

  private async syncOperation(operation: SyncOperation): Promise<void> {
    // Placeholder for actual sync operation
    // In a real implementation, this would call appropriate API endpoints
    console.log(`Syncing ${operation.type} for ${operation.entityType}/${operation.entityId}`);

    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Simulate 95% success rate
    if (Math.random() < 0.05) {
      throw new Error('Simulated sync failure');
    }
  }

  private async performIncrementalSync(): Promise<DeltaSyncResult> {
    return this.incrementalSyncEngine.performIncrementalSync(
      async (entities: SyncEntity[]) => {
        // Upload function - would call API to upload entities
        console.log(`Uploading ${entities.length} entities`);
        // Simulate upload
        return entities;
      },
      async (since: Date) => {
        // Download function - would call API to get changes since timestamp
        console.log(`Downloading changes since ${since.toISOString()}`);
        // Simulate download
        return [];
      }
    );
  }

  private async resolveIncrementalConflicts(conflictEntityIds: string[]): Promise<ConflictResolution[]> {
    const resolutions: ConflictResolution[] = [];

    for (const entityId of conflictEntityIds) {
      // Get entity details to create conflict data
      // In a real implementation, this would fetch the actual entity data
      const conflictData: ConflictData = {
        entityId,
        entityType: 'medication', // Would be determined from actual entity
        localVersion: {}, // Would contain actual local data
        serverVersion: {}, // Would contain actual server data
        localTimestamp: new Date(),
        serverTimestamp: new Date(),
        conflictType: 'update_update'
      };

      const resolution = await this.conflictResolver.resolveConflict(conflictData);
      resolutions.push(resolution);
    }

    return resolutions;
  }

  private getNetworkInfo() {
    const state = this.connectionStateManager.getConnectionState();
    return {
      type: state.connectionType,
      strength: state.signalStrength,
      stable: state.stableConnection
    };
  }

  private getDefaultConfig(): EnhancedSyncConfig {
    return {
      ...this.baseSyncManager.getConfig(),
      incrementalSync: {
        enabled: true,
        checksumValidation: true,
        batchSize: 50
      },
      conflictResolution: {
        strategy: 'three_way_merge',
        medicationSafetyPriority: true,
        userReviewThreshold: 0.7
      },
      queueManagement: {
        enabled: true,
        maxQueueSize: 1000,
        batchingEnabled: true,
        maxRetryAttempts: 3
      },
      connectionManagement: {
        syncOnStableConnectionOnly: true,
        minimumConnectionQuality: 'good',
        avoidMeteredConnections: false
      }
    };
  }

  /**
   * Cleanup
   */
  async cleanup(): Promise<void> {
    if (this.connectionStateUnsubscribe) {
      this.connectionStateUnsubscribe();
    }

    await this.baseSyncManager.cleanup();
    await this.conflictResolver.cleanup();
    await this.incrementalSyncEngine.cleanup();
    await this.syncQueueManager.cleanup();
    await this.connectionStateManager.cleanup();
  }
}

export default EnhancedSyncManager;