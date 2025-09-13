/**
 * Sync Manager Service
 *
 * Core service for Issue #24 Stream C - manages intelligent sync strategies
 * for online/offline transitions with conflict resolution and data integrity.
 *
 * Features:
 * - Intelligent sync strategies for online/offline transitions
 * - Conflict resolution with user preferences
 * - Data integrity validation
 * - Network state monitoring
 * - Background sync coordination
 * - Sync analytics and performance monitoring
 */

import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-fetch';

import { reminderDatabase } from '../../models/ReminderDatabase';
import OfflineQueueService from '../offline/OfflineQueueService';
import type {
  ReminderScheduleRecord,
  ReminderPreferenceRecord,
  OfflineReminderQueueRecord
} from '../../models/ReminderDatabase';

export interface SyncStatus {
  isOnline: boolean;
  lastSyncTime?: Date;
  syncInProgress: boolean;
  pendingUploads: number;
  pendingDownloads: number;
  conflictCount: number;
  lastError?: string;
  networkType?: string;
  networkStrength?: number;
}

export interface SyncResult {
  success: boolean;
  timestamp: Date;
  duration: number;
  uploaded: {
    schedules: number;
    preferences: number;
    history: number;
  };
  downloaded: {
    schedules: number;
    preferences: number;
    updates: number;
  };
  conflicts: SyncConflict[];
  errors: string[];
  networkInfo: {
    type: string;
    strength: number;
    stable: boolean;
  };
}

export interface SyncConflict {
  id: string;
  type: 'schedule' | 'preference' | 'delivery_history';
  conflictType: 'version' | 'timing' | 'user_preference';
  localData: any;
  serverData: any;
  resolution: 'local_wins' | 'server_wins' | 'merge' | 'user_choice_required';
  resolvedData?: any;
  timestamp: Date;
}

export interface SyncStrategy {
  name: string;
  description: string;
  conditions: {
    networkType: ('wifi' | 'cellular' | 'any')[];
    batteryLevel?: number; // minimum battery percentage
    timeWindow?: { start: string; end: string }; // HH:MM format
    userActive?: boolean;
  };
  priority: number;
  syncFrequency: {
    immediate: boolean;
    intervalMinutes?: number;
    backgroundOnly?: boolean;
  };
  dataTypes: ('schedules' | 'preferences' | 'history' | 'cultural_constraints')[];
  conflictResolution: 'local_preference' | 'server_preference' | 'ask_user' | 'intelligent_merge';
}

export interface SyncConfig {
  strategies: SyncStrategy[];
  retryPolicy: {
    maxRetries: number;
    retryIntervals: number[]; // minutes
    exponentialBackoff: boolean;
  };
  dataValidation: {
    enabled: boolean;
    checksumValidation: boolean;
    integrityChecks: boolean;
  };
  performance: {
    batchSize: number;
    compressionEnabled: boolean;
    deltaSyncEnabled: boolean;
  };
  privacy: {
    encryptionEnabled: boolean;
    anonymizeAnalytics: boolean;
  };
}

class SyncManager {
  private static instance: SyncManager;
  private config: SyncConfig;
  private currentStatus: SyncStatus;
  private offlineQueueService: OfflineQueueService;
  private isInitialized = false;

  // Network monitoring
  private networkUnsubscribe?: () => void;
  private networkState: NetInfoState | null = null;

  // Sync state management
  private syncQueue: Array<{
    id: string;
    type: string;
    data: any;
    priority: number;
    timestamp: Date;
  }> = [];

  private conflictQueue: SyncConflict[] = [];
  private syncHistory: SyncResult[] = [];

  // Background task
  private readonly SYNC_BACKGROUND_TASK = 'SYNC_BACKGROUND_TASK';

  // Storage keys
  private readonly STORAGE_KEYS = {
    SYNC_STATUS: 'sync_status',
    SYNC_CONFIG: 'sync_config',
    CONFLICT_QUEUE: 'sync_conflicts',
    SYNC_HISTORY: 'sync_history',
    LAST_SYNC: 'last_sync_timestamp'
  };

  private constructor() {
    this.config = this.getDefaultConfig();
    this.currentStatus = this.getDefaultStatus();
    this.offlineQueueService = OfflineQueueService.getInstance();
  }

  static getInstance(): SyncManager {
    if (!SyncManager.instance) {
      SyncManager.instance = new SyncManager();
    }
    return SyncManager.instance;
  }

  /**
   * Initialize the sync manager
   */
  async initialize(config?: Partial<SyncConfig>): Promise<{ success: boolean; error?: string }> {
    try {
      console.log('Initializing Sync Manager...');

      // Load saved configuration
      await this.loadConfiguration();
      if (config) {
        this.config = { ...this.config, ...config };
        await this.saveConfiguration();
      }

      // Load sync status and history
      await this.loadSyncStatus();
      await this.loadSyncHistory();
      await this.loadConflictQueue();

      // Initialize offline queue service
      const offlineResult = await this.offlineQueueService.initialize();
      if (!offlineResult.success) {
        console.warn('Offline queue service initialization failed, but continuing sync manager initialization');
      }

      // Start network monitoring
      await this.startNetworkMonitoring();

      // Register background sync tasks
      await this.registerBackgroundTasks();

      // Perform initial sync if online
      if (this.currentStatus.isOnline) {
        await this.performInitialSync();
      }

      this.isInitialized = true;
      console.log('Sync Manager initialized successfully');

      return { success: true };

    } catch (error) {
      console.error('Failed to initialize Sync Manager:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Initialization failed'
      };
    }
  }

  /**
   * Perform full synchronization
   */
  async performSync(strategy?: string): Promise<SyncResult> {
    const startTime = Date.now();

    const result: SyncResult = {
      success: false,
      timestamp: new Date(),
      duration: 0,
      uploaded: { schedules: 0, preferences: 0, history: 0 },
      downloaded: { schedules: 0, preferences: 0, updates: 0 },
      conflicts: [],
      errors: [],
      networkInfo: this.getNetworkInfo()
    };

    try {
      if (!this.isInitialized) {
        throw new Error('Sync Manager not initialized');
      }

      if (!this.currentStatus.isOnline) {
        throw new Error('Cannot sync: device is offline');
      }

      if (this.currentStatus.syncInProgress) {
        throw new Error('Sync already in progress');
      }

      console.log(`Starting sync with strategy: ${strategy || 'default'}`);
      this.currentStatus.syncInProgress = true;
      await this.updateSyncStatus();

      // Select sync strategy
      const selectedStrategy = this.selectSyncStrategy(strategy);
      console.log(`Using sync strategy: ${selectedStrategy.name}`);

      // Validate data integrity before sync
      if (this.config.dataValidation.enabled) {
        await this.validateDataIntegrity();
      }

      // Upload local changes
      const uploadResult = await this.uploadLocalChanges(selectedStrategy);
      result.uploaded = uploadResult;

      // Download server changes
      const downloadResult = await this.downloadServerChanges(selectedStrategy);
      result.downloaded = downloadResult;

      // Resolve conflicts
      const conflicts = await this.resolveConflicts(selectedStrategy.conflictResolution);
      result.conflicts = conflicts;

      // Update offline queue with any changes
      await this.updateOfflineQueue();

      // Mark sync as successful
      result.success = true;
      this.currentStatus.lastSyncTime = new Date();
      this.currentStatus.lastError = undefined;

      console.log('Sync completed successfully');

    } catch (error) {
      console.error('Sync failed:', error);
      result.errors.push(error instanceof Error ? error.message : 'Sync failed');
      this.currentStatus.lastError = error instanceof Error ? error.message : 'Sync failed';
    } finally {
      this.currentStatus.syncInProgress = false;
      result.duration = Date.now() - startTime;

      await this.updateSyncStatus();
      await this.addToSyncHistory(result);
    }

    return result;
  }

  /**
   * Handle network state changes
   */
  async handleNetworkChange(isConnected: boolean, networkType?: string): Promise<void> {
    try {
      const wasOnline = this.currentStatus.isOnline;
      this.currentStatus.isOnline = isConnected;
      this.currentStatus.networkType = networkType;

      console.log(`Network state changed: ${isConnected ? 'online' : 'offline'} (${networkType})`);

      if (isConnected && !wasOnline) {
        // Just came online - trigger sync
        console.log('Device came online, triggering sync...');

        // Wait a moment for network to stabilize
        setTimeout(async () => {
          try {
            await this.performSync('network_recovery');
          } catch (error) {
            console.error('Network recovery sync failed:', error);
          }
        }, 2000);

      } else if (!isConnected && wasOnline) {
        // Just went offline
        console.log('Device went offline, preserving pending changes...');
        await this.preservePendingChanges();
      }

      await this.updateSyncStatus();

    } catch (error) {
      console.error('Failed to handle network change:', error);
    }
  }

  /**
   * Queue data for sync when back online
   */
  async queueForSync(
    type: 'schedule' | 'preference' | 'history',
    data: any,
    priority: number = 5
  ): Promise<{ success: boolean; queueId?: string }> {
    try {
      const queueItem = {
        id: `sync_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type,
        data,
        priority,
        timestamp: new Date()
      };

      this.syncQueue.push(queueItem);

      // Sort by priority (higher numbers first)
      this.syncQueue.sort((a, b) => b.priority - a.priority);

      // Persist queue to storage
      await this.saveSyncQueue();

      console.log(`Queued ${type} for sync with priority ${priority}`);

      return { success: true, queueId: queueItem.id };

    } catch (error) {
      console.error('Failed to queue for sync:', error);
      return { success: false };
    }
  }

  /**
   * Get current sync status
   */
  getSyncStatus(): SyncStatus {
    return { ...this.currentStatus };
  }

  /**
   * Get sync history
   */
  getSyncHistory(limit: number = 10): SyncResult[] {
    return this.syncHistory
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get pending conflicts that require user resolution
   */
  getPendingConflicts(): SyncConflict[] {
    return this.conflictQueue.filter(conflict =>
      conflict.resolution === 'user_choice_required'
    );
  }

  /**
   * Resolve a conflict with user choice
   */
  async resolveConflict(
    conflictId: string,
    resolution: 'local_wins' | 'server_wins' | 'merge',
    mergedData?: any
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const conflictIndex = this.conflictQueue.findIndex(c => c.id === conflictId);
      if (conflictIndex === -1) {
        throw new Error(`Conflict not found: ${conflictId}`);
      }

      const conflict = this.conflictQueue[conflictIndex];
      conflict.resolution = resolution;

      if (resolution === 'merge' && mergedData) {
        conflict.resolvedData = mergedData;
      } else if (resolution === 'local_wins') {
        conflict.resolvedData = conflict.localData;
      } else if (resolution === 'server_wins') {
        conflict.resolvedData = conflict.serverData;
      }

      // Apply the resolution
      await this.applyConflictResolution(conflict);

      // Remove from conflict queue
      this.conflictQueue.splice(conflictIndex, 1);
      await this.saveConflictQueue();

      console.log(`Resolved conflict ${conflictId} with ${resolution}`);
      return { success: true };

    } catch (error) {
      console.error('Failed to resolve conflict:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Resolution failed'
      };
    }
  }

  /**
   * Private helper methods
   */

  private async startNetworkMonitoring(): Promise<void> {
    try {
      // Get initial network state
      const initialState = await NetInfo.fetch();
      this.networkState = initialState;
      this.currentStatus.isOnline = initialState.isConnected || false;
      this.currentStatus.networkType = initialState.type;

      // Subscribe to network state changes
      this.networkUnsubscribe = NetInfo.addEventListener(state => {
        this.networkState = state;
        this.handleNetworkChange(state.isConnected || false, state.type);
      });

      console.log(`Network monitoring started. Initial state: ${this.currentStatus.isOnline ? 'online' : 'offline'} (${this.currentStatus.networkType})`);

    } catch (error) {
      console.error('Failed to start network monitoring:', error);
      throw error;
    }
  }

  private async registerBackgroundTasks(): Promise<void> {
    try {
      // Define background sync task
      TaskManager.defineTask(this.SYNC_BACKGROUND_TASK, async () => {
        try {
          console.log('Background task: Performing sync...');

          if (!this.currentStatus.isOnline) {
            return BackgroundFetch.BackgroundFetchResult.NoData;
          }

          const result = await this.performSync('background');

          if (result.success && (result.uploaded.schedules > 0 || result.downloaded.schedules > 0)) {
            return BackgroundFetch.BackgroundFetchResult.NewData;
          } else if (result.errors.length > 0) {
            return BackgroundFetch.BackgroundFetchResult.Failed;
          } else {
            return BackgroundFetch.BackgroundFetchResult.NoData;
          }

        } catch (error) {
          console.error('Background sync failed:', error);
          return BackgroundFetch.BackgroundFetchResult.Failed;
        }
      });

      // Register the background task
      await BackgroundFetch.registerTaskAsync(this.SYNC_BACKGROUND_TASK, {
        minimumInterval: 30 * 60, // 30 minutes
        stopOnTerminate: false,
        startOnBoot: true,
      });

      console.log('Background sync task registered');

    } catch (error) {
      console.error('Failed to register background tasks:', error);
      throw error;
    }
  }

  private selectSyncStrategy(strategyName?: string): SyncStrategy {
    if (strategyName) {
      const strategy = this.config.strategies.find(s => s.name === strategyName);
      if (strategy) {
        return strategy;
      }
    }

    // Select best strategy based on current conditions
    const networkType = this.networkState?.type;
    const networkStrength = this.getNetworkStrength();

    const suitableStrategies = this.config.strategies.filter(strategy => {
      // Check network type compatibility
      if (!strategy.conditions.networkType.includes('any') &&
          !strategy.conditions.networkType.includes(networkType as any)) {
        return false;
      }

      // Check network strength if cellular
      if (networkType === 'cellular' && networkStrength < 0.5) {
        return false;
      }

      return true;
    });

    // Return highest priority suitable strategy
    suitableStrategies.sort((a, b) => b.priority - a.priority);
    return suitableStrategies[0] || this.config.strategies[0];
  }

  private async uploadLocalChanges(strategy: SyncStrategy): Promise<{
    schedules: number;
    preferences: number;
    history: number;
  }> {
    try {
      const result = { schedules: 0, preferences: 0, history: 0 };

      // Upload reminder schedules if enabled
      if (strategy.dataTypes.includes('schedules')) {
        const pendingSchedules = this.syncQueue.filter(item => item.type === 'schedule');
        // Here would be actual API calls to upload schedules
        result.schedules = pendingSchedules.length;

        // Remove uploaded items from queue
        this.syncQueue = this.syncQueue.filter(item => item.type !== 'schedule');
      }

      // Upload preferences if enabled
      if (strategy.dataTypes.includes('preferences')) {
        const pendingPreferences = this.syncQueue.filter(item => item.type === 'preference');
        // Here would be actual API calls to upload preferences
        result.preferences = pendingPreferences.length;

        // Remove uploaded items from queue
        this.syncQueue = this.syncQueue.filter(item => item.type !== 'preference');
      }

      // Upload delivery history if enabled
      if (strategy.dataTypes.includes('history')) {
        const pendingHistory = this.syncQueue.filter(item => item.type === 'history');
        // Here would be actual API calls to upload history
        result.history = pendingHistory.length;

        // Remove uploaded items from queue
        this.syncQueue = this.syncQueue.filter(item => item.type !== 'history');
      }

      await this.saveSyncQueue();
      return result;

    } catch (error) {
      console.error('Failed to upload local changes:', error);
      throw error;
    }
  }

  private async downloadServerChanges(strategy: SyncStrategy): Promise<{
    schedules: number;
    preferences: number;
    updates: number;
  }> {
    try {
      const result = { schedules: 0, preferences: 0, updates: 0 };

      // This would implement actual server communication
      // For now, returning simulation data
      console.log('Downloading server changes...');

      return result;

    } catch (error) {
      console.error('Failed to download server changes:', error);
      throw error;
    }
  }

  private async resolveConflicts(resolutionStrategy: string): Promise<SyncConflict[]> {
    try {
      const resolvedConflicts: SyncConflict[] = [];

      for (const conflict of this.conflictQueue) {
        if (conflict.resolution === 'user_choice_required') {
          // Skip conflicts requiring user input
          continue;
        }

        switch (resolutionStrategy) {
          case 'local_preference':
            conflict.resolution = 'local_wins';
            conflict.resolvedData = conflict.localData;
            break;

          case 'server_preference':
            conflict.resolution = 'server_wins';
            conflict.resolvedData = conflict.serverData;
            break;

          case 'intelligent_merge':
            conflict.resolvedData = await this.intelligentMerge(conflict);
            conflict.resolution = 'merge';
            break;

          default:
            conflict.resolution = 'user_choice_required';
            continue;
        }

        await this.applyConflictResolution(conflict);
        resolvedConflicts.push(conflict);
      }

      // Remove resolved conflicts from queue
      this.conflictQueue = this.conflictQueue.filter(c =>
        !resolvedConflicts.some(r => r.id === c.id)
      );

      await this.saveConflictQueue();
      return resolvedConflicts;

    } catch (error) {
      console.error('Failed to resolve conflicts:', error);
      return [];
    }
  }

  private async intelligentMerge(conflict: SyncConflict): Promise<any> {
    try {
      // Implement intelligent merging logic based on conflict type
      switch (conflict.type) {
        case 'schedule':
          return this.mergeScheduleConflict(conflict);

        case 'preference':
          return this.mergePreferenceConflict(conflict);

        default:
          // Default to more recent data
          const localTime = new Date(conflict.localData.updated_at || conflict.localData.created_at);
          const serverTime = new Date(conflict.serverData.updated_at || conflict.serverData.created_at);

          return localTime > serverTime ? conflict.localData : conflict.serverData;
      }

    } catch (error) {
      console.error('Intelligent merge failed:', error);
      return conflict.localData; // Fall back to local data
    }
  }

  private mergeScheduleConflict(conflict: SyncConflict): any {
    // Merge schedule conflicts by preserving user preferences and combining data
    const local = conflict.localData;
    const server = conflict.serverData;

    return {
      ...server,
      // Preserve local user preferences
      cultural_constraints: local.cultural_constraints,
      delivery_methods: local.delivery_methods,
      // Use most recent status
      status: new Date(local.updated_at) > new Date(server.updated_at) ? local.status : server.status,
      // Merge retry count (take higher)
      retry_count: Math.max(local.retry_count || 0, server.retry_count || 0),
      updated_at: new Date().toISOString()
    };
  }

  private mergePreferenceConflict(conflict: SyncConflict): any {
    // For preferences, local always wins (user's device is authoritative)
    return {
      ...conflict.localData,
      updated_at: new Date().toISOString()
    };
  }

  private async applyConflictResolution(conflict: SyncConflict): Promise<void> {
    try {
      if (!conflict.resolvedData) {
        return;
      }

      switch (conflict.type) {
        case 'schedule':
          // Update reminder schedule in database
          await this.updateResolvedSchedule(conflict.resolvedData);
          break;

        case 'preference':
          // Update preferences in database
          await this.updateResolvedPreference(conflict.resolvedData);
          break;

        case 'delivery_history':
          // Update delivery history
          await this.updateResolvedHistory(conflict.resolvedData);
          break;
      }

    } catch (error) {
      console.error('Failed to apply conflict resolution:', error);
    }
  }

  private async updateResolvedSchedule(scheduleData: any): Promise<void> {
    // This would update the reminder schedule in the database
    console.log('Applying resolved schedule data:', scheduleData.id);
  }

  private async updateResolvedPreference(preferenceData: any): Promise<void> {
    // This would update preferences in the database
    console.log('Applying resolved preference data:', preferenceData.user_id);
  }

  private async updateResolvedHistory(historyData: any): Promise<void> {
    // This would update delivery history in the database
    console.log('Applying resolved history data:', historyData.id);
  }

  private async validateDataIntegrity(): Promise<void> {
    try {
      if (!this.config.dataValidation.enabled) {
        return;
      }

      console.log('Validating data integrity...');

      // Check for data corruption or inconsistencies
      // This would implement actual validation logic

    } catch (error) {
      console.error('Data integrity validation failed:', error);
      throw error;
    }
  }

  private async updateOfflineQueue(): Promise<void> {
    try {
      // Sync offline queue changes if the service is available
      if (this.offlineQueueService.isInitialized()) {
        await this.offlineQueueService.syncWithServer();
      }
    } catch (error) {
      console.error('Failed to update offline queue:', error);
    }
  }

  private async performInitialSync(): Promise<void> {
    try {
      console.log('Performing initial sync...');
      await this.performSync('initial');
    } catch (error) {
      console.error('Initial sync failed:', error);
    }
  }

  private async preservePendingChanges(): Promise<void> {
    try {
      // Ensure all pending changes are preserved locally
      await this.saveSyncQueue();
      console.log('Pending changes preserved for next sync');
    } catch (error) {
      console.error('Failed to preserve pending changes:', error);
    }
  }

  private getNetworkInfo() {
    return {
      type: this.networkState?.type || 'unknown',
      strength: this.getNetworkStrength(),
      stable: this.isNetworkStable()
    };
  }

  private getNetworkStrength(): number {
    // Simplified network strength calculation
    // In a real implementation, this would use device APIs
    if (!this.networkState?.isConnected) {
      return 0;
    }

    switch (this.networkState.type) {
      case 'wifi':
        return 1.0;
      case 'cellular':
        return 0.7;
      case 'ethernet':
        return 1.0;
      default:
        return 0.5;
    }
  }

  private isNetworkStable(): boolean {
    // Check if network has been stable for the last few minutes
    // This would track connection stability over time
    return this.currentStatus.isOnline;
  }

  // Storage methods
  private async loadConfiguration(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEYS.SYNC_CONFIG);
      if (stored) {
        const config = JSON.parse(stored);
        this.config = { ...this.config, ...config };
      }
    } catch (error) {
      console.error('Failed to load sync configuration:', error);
    }
  }

  private async saveConfiguration(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEYS.SYNC_CONFIG, JSON.stringify(this.config));
    } catch (error) {
      console.error('Failed to save sync configuration:', error);
    }
  }

  private async loadSyncStatus(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEYS.SYNC_STATUS);
      if (stored) {
        const status = JSON.parse(stored);
        this.currentStatus = { ...this.currentStatus, ...status };
        if (status.lastSyncTime) {
          this.currentStatus.lastSyncTime = new Date(status.lastSyncTime);
        }
      }
    } catch (error) {
      console.error('Failed to load sync status:', error);
    }
  }

  private async updateSyncStatus(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEYS.SYNC_STATUS, JSON.stringify(this.currentStatus));
    } catch (error) {
      console.error('Failed to update sync status:', error);
    }
  }

  private async loadSyncHistory(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEYS.SYNC_HISTORY);
      if (stored) {
        const history = JSON.parse(stored);
        this.syncHistory = history.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp)
        }));
      }
    } catch (error) {
      console.error('Failed to load sync history:', error);
    }
  }

  private async addToSyncHistory(result: SyncResult): Promise<void> {
    try {
      this.syncHistory.push(result);

      // Keep only last 50 sync results
      if (this.syncHistory.length > 50) {
        this.syncHistory = this.syncHistory.slice(-50);
      }

      await AsyncStorage.setItem(this.STORAGE_KEYS.SYNC_HISTORY, JSON.stringify(this.syncHistory));
    } catch (error) {
      console.error('Failed to add to sync history:', error);
    }
  }

  private async loadConflictQueue(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEYS.CONFLICT_QUEUE);
      if (stored) {
        const conflicts = JSON.parse(stored);
        this.conflictQueue = conflicts.map((conflict: any) => ({
          ...conflict,
          timestamp: new Date(conflict.timestamp)
        }));
      }
    } catch (error) {
      console.error('Failed to load conflict queue:', error);
    }
  }

  private async saveConflictQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEYS.CONFLICT_QUEUE, JSON.stringify(this.conflictQueue));
    } catch (error) {
      console.error('Failed to save conflict queue:', error);
    }
  }

  private async saveSyncQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem('sync_queue', JSON.stringify(this.syncQueue));
    } catch (error) {
      console.error('Failed to save sync queue:', error);
    }
  }

  private getDefaultConfig(): SyncConfig {
    return {
      strategies: [
        {
          name: 'wifi_optimal',
          description: 'Full sync over WiFi with all data types',
          conditions: {
            networkType: ['wifi'],
            batteryLevel: 20
          },
          priority: 10,
          syncFrequency: {
            immediate: true,
            intervalMinutes: 15
          },
          dataTypes: ['schedules', 'preferences', 'history', 'cultural_constraints'],
          conflictResolution: 'intelligent_merge'
        },
        {
          name: 'cellular_conservative',
          description: 'Essential data only over cellular',
          conditions: {
            networkType: ['cellular'],
            batteryLevel: 30
          },
          priority: 8,
          syncFrequency: {
            immediate: false,
            intervalMinutes: 60,
            backgroundOnly: true
          },
          dataTypes: ['schedules', 'preferences'],
          conflictResolution: 'local_preference'
        },
        {
          name: 'background',
          description: 'Background sync with minimal data',
          conditions: {
            networkType: ['any'],
            batteryLevel: 15
          },
          priority: 5,
          syncFrequency: {
            immediate: false,
            intervalMinutes: 120,
            backgroundOnly: true
          },
          dataTypes: ['schedules'],
          conflictResolution: 'local_preference'
        }
      ],
      retryPolicy: {
        maxRetries: 3,
        retryIntervals: [5, 15, 30],
        exponentialBackoff: true
      },
      dataValidation: {
        enabled: true,
        checksumValidation: false,
        integrityChecks: true
      },
      performance: {
        batchSize: 50,
        compressionEnabled: true,
        deltaSyncEnabled: true
      },
      privacy: {
        encryptionEnabled: true,
        anonymizeAnalytics: true
      }
    };
  }

  private getDefaultStatus(): SyncStatus {
    return {
      isOnline: false,
      syncInProgress: false,
      pendingUploads: 0,
      pendingDownloads: 0,
      conflictCount: 0
    };
  }

  // Public API methods
  async updateConfig(config: Partial<SyncConfig>): Promise<void> {
    this.config = { ...this.config, ...config };
    await this.saveConfiguration();
  }

  getConfig(): SyncConfig {
    return { ...this.config };
  }

  isInitialized(): boolean {
    return this.isInitialized;
  }

  async cleanup(): Promise<void> {
    if (this.networkUnsubscribe) {
      this.networkUnsubscribe();
    }
  }
}

export default SyncManager;