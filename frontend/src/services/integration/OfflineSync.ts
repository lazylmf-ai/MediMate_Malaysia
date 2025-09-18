/**
 * Enhanced Offline Synchronization Service
 * Provides robust offline-first capabilities with 14-day offline operation support
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo, { NetInfoState } from '@react-native-netinfo/netinfo';
import { retryService } from './RetryService';
import { expoNotificationService } from '../notifications/ExpoNotificationService';

export interface SyncableEntity {
  id: string;
  type: 'medication' | 'adherence' | 'cultural_profile' | 'emergency_contact' | 'appointment';
  data: Record<string, any>;
  lastModified: Date;
  version: number;
  deviceId: string;
  userId: string;
  syncStatus: 'pending' | 'syncing' | 'synced' | 'conflict' | 'error';
  priority: 'low' | 'normal' | 'high' | 'critical';
  isDeleted?: boolean;
}

export interface SyncConflict {
  entityId: string;
  entityType: string;
  localVersion: SyncableEntity;
  serverVersion: SyncableEntity;
  conflictReason: 'version_mismatch' | 'concurrent_modification' | 'deleted_locally' | 'deleted_remotely';
  resolutionStrategy: 'auto' | 'manual' | 'server_wins' | 'client_wins';
}

export interface SyncResult {
  success: boolean;
  entitiesSynced: number;
  conflicts: SyncConflict[];
  errors: Array<{ entityId: string; error: string }>;
  syncDuration: number;
  networkInfo: any;
}

export interface OfflineSyncConfig {
  enableAutoSync: boolean;
  syncIntervalMinutes: number;
  offlineRetentionDays: number;
  maxLocalStorageMB: number;
  enableConflictResolution: boolean;
  prioritizeCriticalData: boolean;
  enableCompression: boolean;
  enableEncryption: boolean;
  malayanHealthcareCompliance: boolean;
  batchSize: number;
}

export interface OfflineCapabilities {
  daysOfflineRemaining: number;
  localStorageUsed: number;
  pendingSyncItems: number;
  criticalDataIntact: boolean;
  lastSuccessfulSync: Date | null;
  estimatedSyncTime: number;
}

export class OfflineSyncService {
  private static instance: OfflineSyncService;
  private config: OfflineSyncConfig;
  private isOnline: boolean = false;
  private syncInProgress: boolean = false;
  private syncQueue: SyncableEntity[] = [];
  private conflicts: SyncConflict[] = [];
  private deviceId: string;
  private syncListeners: Set<(result: SyncResult) => void> = new Set();
  private lastSyncTime: Date | null = null;

  private readonly STORAGE_KEYS = {
    SYNC_QUEUE: 'medimate_sync_queue',
    LAST_SYNC: 'medimate_last_sync',
    DEVICE_ID: 'medimate_device_id',
    OFFLINE_DATA: 'medimate_offline_data',
    CONFLICTS: 'medimate_conflicts',
    CONFIG: 'medimate_sync_config',
  };

  private constructor() {
    this.config = {
      enableAutoSync: true,
      syncIntervalMinutes: 5,
      offlineRetentionDays: 14,
      maxLocalStorageMB: 100,
      enableConflictResolution: true,
      prioritizeCriticalData: true,
      enableCompression: true,
      enableEncryption: false, // Would require additional implementation
      malayanHealthcareCompliance: true,
      batchSize: 50,
    };

    this.deviceId = this.generateDeviceId();
    this.initializeNetworkMonitoring();
    this.loadPersistedData();
    this.setupAutoSync();
  }

  public static getInstance(): OfflineSyncService {
    if (!OfflineSyncService.instance) {
      OfflineSyncService.instance = new OfflineSyncService();
    }
    return OfflineSyncService.instance;
  }

  private async initializeNetworkMonitoring(): Promise<void> {
    try {
      // Get initial network state
      const netInfo = await NetInfo.fetch();
      this.updateNetworkStatus(netInfo);

      // Subscribe to network changes
      NetInfo.addEventListener((state) => {
        this.updateNetworkStatus(state);
      });
    } catch (error) {
      console.warn('Failed to initialize network monitoring:', error);
    }
  }

  private updateNetworkStatus(netInfo: NetInfoState): void {
    const wasOnline = this.isOnline;
    this.isOnline = netInfo.isConnected && netInfo.isInternetReachable;

    if (!wasOnline && this.isOnline) {
      console.log('Network connection restored, triggering sync');
      this.triggerSync();
    } else if (wasOnline && !this.isOnline) {
      console.log('Network connection lost, entering offline mode');
      this.handleOfflineMode();
    }
  }

  private async handleOfflineMode(): Promise<void> {
    // Notify user about offline mode
    await expoNotificationService.scheduleNotification({
      id: 'offline_mode',
      type: 'cultural',
      title: 'Offline Mode',
      body: 'App is now working offline. Your data will sync when connection is restored.',
      priority: 'normal',
    });

    // Ensure critical data is protected
    await this.protectCriticalData();
  }

  private async protectCriticalData(): Promise<void> {
    try {
      // Prioritize critical medication data
      const criticalEntities = this.syncQueue.filter(entity =>
        entity.priority === 'critical' ||
        (entity.type === 'medication' && entity.data.isEmergencyMedication) ||
        entity.type === 'emergency_contact'
      );

      if (criticalEntities.length > 0) {
        await this.persistData(this.STORAGE_KEYS.OFFLINE_DATA + '_critical', criticalEntities);
      }
    } catch (error) {
      console.error('Failed to protect critical data:', error);
    }
  }

  public async addToSyncQueue(entity: Omit<SyncableEntity, 'deviceId' | 'syncStatus'>): Promise<void> {
    const syncableEntity: SyncableEntity = {
      ...entity,
      deviceId: this.deviceId,
      syncStatus: 'pending',
      lastModified: new Date(),
    };

    this.syncQueue.push(syncableEntity);
    await this.persistSyncQueue();

    // Trigger immediate sync for critical data if online
    if (this.isOnline && (entity.priority === 'critical' || entity.type === 'emergency_contact')) {
      this.triggerSync();
    }

    console.log(`Added entity ${entity.id} to sync queue`);
  }

  public async triggerSync(): Promise<SyncResult> {
    if (this.syncInProgress) {
      console.log('Sync already in progress');
      return this.createEmptySyncResult();
    }

    if (!this.isOnline) {
      console.log('Cannot sync while offline');
      return this.createEmptySyncResult();
    }

    this.syncInProgress = true;
    const startTime = Date.now();

    try {
      console.log(`Starting sync with ${this.syncQueue.length} entities`);

      // Sort by priority and timestamp
      const sortedQueue = this.prioritizeSyncQueue();

      // Process in batches
      const batches = this.createBatches(sortedQueue, this.config.batchSize);
      let totalSynced = 0;
      let allConflicts: SyncConflict[] = [];
      let allErrors: Array<{ entityId: string; error: string }> = [];

      for (const batch of batches) {
        const batchResult = await this.syncBatch(batch);
        totalSynced += batchResult.entitiesSynced;
        allConflicts.push(...batchResult.conflicts);
        allErrors.push(...batchResult.errors);

        // Break if we encounter too many errors
        if (allErrors.length > batch.length * 0.5) {
          console.warn('Too many sync errors, stopping batch processing');
          break;
        }
      }

      // Update last sync time
      this.lastSyncTime = new Date();
      await this.persistLastSyncTime();

      const result: SyncResult = {
        success: allErrors.length === 0,
        entitiesSynced: totalSynced,
        conflicts: allConflicts,
        errors: allErrors,
        syncDuration: Date.now() - startTime,
        networkInfo: retryService.getNetworkCondition(),
      };

      console.log(`Sync completed: ${totalSynced} entities synced, ${allConflicts.length} conflicts, ${allErrors.length} errors`);

      // Notify listeners
      this.notifySyncListeners(result);

      return result;

    } catch (error) {
      console.error('Sync failed:', error);
      const result: SyncResult = {
        success: false,
        entitiesSynced: 0,
        conflicts: [],
        errors: [{ entityId: 'global', error: error.message }],
        syncDuration: Date.now() - startTime,
        networkInfo: retryService.getNetworkCondition(),
      };

      this.notifySyncListeners(result);
      return result;

    } finally {
      this.syncInProgress = false;
    }
  }

  private prioritizeSyncQueue(): SyncableEntity[] {
    return [...this.syncQueue].sort((a, b) => {
      // Priority order: critical > high > normal > low
      const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
      const priorityDiff = priorityOrder[a.priority] - priorityOrder[b.priority];

      if (priorityDiff !== 0) return priorityDiff;

      // Then by timestamp (newer first)
      return b.lastModified.getTime() - a.lastModified.getTime();
    });
  }

  private createBatches<T>(items: T[], batchSize: number): T[][] {
    const batches: T[][] = [];
    for (let i = 0; i < items.length; i += batchSize) {
      batches.push(items.slice(i, i + batchSize));
    }
    return batches;
  }

  private async syncBatch(batch: SyncableEntity[]): Promise<SyncResult> {
    const conflicts: SyncConflict[] = [];
    const errors: Array<{ entityId: string; error: string }> = [];
    let synced = 0;

    for (const entity of batch) {
      try {
        entity.syncStatus = 'syncing';

        const result = await this.syncEntity(entity);

        if (result.success) {
          entity.syncStatus = 'synced';
          synced++;

          // Remove from queue if successfully synced
          this.removeFromSyncQueue(entity.id);
        } else if (result.conflict) {
          entity.syncStatus = 'conflict';
          conflicts.push(result.conflict);
        } else {
          entity.syncStatus = 'error';
          errors.push({ entityId: entity.id, error: result.error || 'Unknown error' });
        }

      } catch (error) {
        entity.syncStatus = 'error';
        errors.push({ entityId: entity.id, error: error.message });
        console.error(`Failed to sync entity ${entity.id}:`, error);
      }
    }

    await this.persistSyncQueue();

    return {
      success: errors.length === 0,
      entitiesSynced: synced,
      conflicts,
      errors,
      syncDuration: 0, // Will be calculated at batch level
      networkInfo: null,
    };
  }

  private async syncEntity(entity: SyncableEntity): Promise<{
    success: boolean;
    conflict?: SyncConflict;
    error?: string;
  }> {
    try {
      // Simulate API call with retry logic
      const apiCall = () => this.callSyncAPI(entity);

      const result = await retryService.retryApiCall(apiCall, {
        retryConfig: {
          maxRetries: 3,
          baseDelay: 1000,
          malaysianNetworkOptimization: true,
        },
      });

      if (result.success && result.data) {
        const serverEntity = result.data;

        // Check for conflicts
        if (serverEntity.version !== entity.version) {
          const conflict = await this.createConflict(entity, serverEntity);
          return { success: false, conflict };
        }

        return { success: true };
      } else {
        return { success: false, error: result.error?.message };
      }

    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  private async callSyncAPI(entity: SyncableEntity): Promise<SyncableEntity> {
    // Simulate API call - in real implementation, this would call the actual API
    await new Promise(resolve => setTimeout(resolve, Math.random() * 1000));

    // Simulate occasional conflicts
    if (Math.random() < 0.1) {
      return {
        ...entity,
        version: entity.version + 1,
        lastModified: new Date(),
      };
    }

    return entity;
  }

  private async createConflict(localEntity: SyncableEntity, serverEntity: SyncableEntity): Promise<SyncConflict> {
    const conflict: SyncConflict = {
      entityId: localEntity.id,
      entityType: localEntity.type,
      localVersion: localEntity,
      serverVersion: serverEntity,
      conflictReason: 'version_mismatch',
      resolutionStrategy: this.config.enableConflictResolution ? 'auto' : 'manual',
    };

    // Add to conflicts list
    this.conflicts.push(conflict);
    await this.persistConflicts();

    // Auto-resolve if configured
    if (this.config.enableConflictResolution) {
      await this.resolveConflict(conflict);
    }

    return conflict;
  }

  public async resolveConflict(conflict: SyncConflict, strategy?: 'server_wins' | 'client_wins' | 'merge'): Promise<void> {
    const resolutionStrategy = strategy || this.determineAutoResolutionStrategy(conflict);

    switch (resolutionStrategy) {
      case 'server_wins':
        await this.applyServerVersion(conflict);
        break;
      case 'client_wins':
        await this.applyClientVersion(conflict);
        break;
      case 'merge':
        await this.mergeVersions(conflict);
        break;
    }

    // Remove from conflicts list
    this.conflicts = this.conflicts.filter(c => c.entityId !== conflict.entityId);
    await this.persistConflicts();
  }

  private determineAutoResolutionStrategy(conflict: SyncConflict): 'server_wins' | 'client_wins' | 'merge' {
    // For Malaysian healthcare context, prioritize data integrity
    if (conflict.entityType === 'medication' || conflict.entityType === 'emergency_contact') {
      return 'server_wins'; // Server data is considered more authoritative
    }

    if (conflict.entityType === 'cultural_profile') {
      return 'client_wins'; // User preferences should be preserved
    }

    return 'merge'; // Try to merge other types
  }

  private async applyServerVersion(conflict: SyncConflict): Promise<void> {
    // Update local entity with server version
    const entityIndex = this.syncQueue.findIndex(e => e.id === conflict.entityId);
    if (entityIndex !== -1) {
      this.syncQueue[entityIndex] = conflict.serverVersion;
      await this.persistSyncQueue();
    }
  }

  private async applyClientVersion(conflict: SyncConflict): Promise<void> {
    // Keep local version and mark for force sync
    const entityIndex = this.syncQueue.findIndex(e => e.id === conflict.entityId);
    if (entityIndex !== -1) {
      this.syncQueue[entityIndex].version = conflict.serverVersion.version + 1;
      this.syncQueue[entityIndex].syncStatus = 'pending';
      await this.persistSyncQueue();
    }
  }

  private async mergeVersions(conflict: SyncConflict): Promise<void> {
    // Simple merge strategy - in real implementation, this would be more sophisticated
    const merged = {
      ...conflict.localVersion,
      data: { ...conflict.serverVersion.data, ...conflict.localVersion.data },
      version: Math.max(conflict.localVersion.version, conflict.serverVersion.version) + 1,
      lastModified: new Date(),
    };

    const entityIndex = this.syncQueue.findIndex(e => e.id === conflict.entityId);
    if (entityIndex !== -1) {
      this.syncQueue[entityIndex] = merged;
      await this.persistSyncQueue();
    }
  }

  public async getOfflineCapabilities(): Promise<OfflineCapabilities> {
    const lastSync = this.lastSyncTime || new Date(0);
    const daysSinceSync = (Date.now() - lastSync.getTime()) / (1000 * 60 * 60 * 24);
    const daysOfflineRemaining = Math.max(0, this.config.offlineRetentionDays - daysSinceSync);

    const storageUsed = await this.calculateStorageUsage();
    const criticalDataIntact = await this.validateCriticalData();
    const estimatedSyncTime = this.estimateSyncTime();

    return {
      daysOfflineRemaining,
      localStorageUsed: storageUsed,
      pendingSyncItems: this.syncQueue.length,
      criticalDataIntact,
      lastSuccessfulSync: this.lastSyncTime,
      estimatedSyncTime,
    };
  }

  private async calculateStorageUsage(): Promise<number> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const mediMateKeys = keys.filter(key => key.startsWith('medimate_'));

      let totalSize = 0;
      for (const key of mediMateKeys) {
        const value = await AsyncStorage.getItem(key);
        if (value) {
          totalSize += new Blob([value]).size;
        }
      }

      return totalSize / (1024 * 1024); // Convert to MB
    } catch (error) {
      console.warn('Failed to calculate storage usage:', error);
      return 0;
    }
  }

  private async validateCriticalData(): Promise<boolean> {
    try {
      const criticalData = await AsyncStorage.getItem(this.STORAGE_KEYS.OFFLINE_DATA + '_critical');
      return criticalData !== null;
    } catch (error) {
      console.warn('Failed to validate critical data:', error);
      return false;
    }
  }

  private estimateSyncTime(): number {
    // Estimate sync time based on queue size and network conditions
    const baseTimePerEntity = 500; // ms
    const networkCondition = retryService.getNetworkCondition();

    let multiplier = 1;
    if (networkCondition?.strength === 'poor') {
      multiplier = 3;
    } else if (networkCondition?.strength === 'fair') {
      multiplier = 2;
    }

    return this.syncQueue.length * baseTimePerEntity * multiplier;
  }

  private removeFromSyncQueue(entityId: string): void {
    this.syncQueue = this.syncQueue.filter(entity => entity.id !== entityId);
  }

  private async setupAutoSync(): Promise<void> {
    if (!this.config.enableAutoSync) return;

    setInterval(() => {
      if (this.isOnline && !this.syncInProgress && this.syncQueue.length > 0) {
        console.log('Auto-sync triggered');
        this.triggerSync();
      }
    }, this.config.syncIntervalMinutes * 60 * 1000);
  }

  private generateDeviceId(): string {
    return `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private createEmptySyncResult(): SyncResult {
    return {
      success: false,
      entitiesSynced: 0,
      conflicts: [],
      errors: [],
      syncDuration: 0,
      networkInfo: null,
    };
  }

  // Persistence methods
  private async persistSyncQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(this.syncQueue));
    } catch (error) {
      console.error('Failed to persist sync queue:', error);
    }
  }

  private async persistConflicts(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEYS.CONFLICTS, JSON.stringify(this.conflicts));
    } catch (error) {
      console.error('Failed to persist conflicts:', error);
    }
  }

  private async persistLastSyncTime(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEYS.LAST_SYNC, this.lastSyncTime?.toISOString() || '');
    } catch (error) {
      console.error('Failed to persist last sync time:', error);
    }
  }

  private async persistData(key: string, data: any): Promise<void> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error(`Failed to persist data for key ${key}:`, error);
    }
  }

  private async loadPersistedData(): Promise<void> {
    try {
      // Load sync queue
      const queueData = await AsyncStorage.getItem(this.STORAGE_KEYS.SYNC_QUEUE);
      if (queueData) {
        this.syncQueue = JSON.parse(queueData);
      }

      // Load conflicts
      const conflictsData = await AsyncStorage.getItem(this.STORAGE_KEYS.CONFLICTS);
      if (conflictsData) {
        this.conflicts = JSON.parse(conflictsData);
      }

      // Load last sync time
      const lastSyncData = await AsyncStorage.getItem(this.STORAGE_KEYS.LAST_SYNC);
      if (lastSyncData) {
        this.lastSyncTime = new Date(lastSyncData);
      }

      console.log(`Loaded persisted data: ${this.syncQueue.length} entities in queue, ${this.conflicts.length} conflicts`);

    } catch (error) {
      console.error('Failed to load persisted data:', error);
    }
  }

  // Public API methods
  public subscribe(listener: (result: SyncResult) => void): () => void {
    this.syncListeners.add(listener);
    return () => {
      this.syncListeners.delete(listener);
    };
  }

  private notifySyncListeners(result: SyncResult): void {
    this.syncListeners.forEach(listener => {
      try {
        listener(result);
      } catch (error) {
        console.warn('Sync listener error:', error);
      }
    });
  }

  public updateConfig(updates: Partial<OfflineSyncConfig>): void {
    this.config = { ...this.config, ...updates };
  }

  public getConfig(): OfflineSyncConfig {
    return { ...this.config };
  }

  public isOnlineStatus(): boolean {
    return this.isOnline;
  }

  public getSyncQueue(): SyncableEntity[] {
    return [...this.syncQueue];
  }

  public getConflicts(): SyncConflict[] {
    return [...this.conflicts];
  }
}

// Singleton instance
export const offlineSyncService = OfflineSyncService.getInstance();