/**
 * Background Sync Service
 *
 * Handles background synchronization of offline operations for the Education Hub.
 * Queues operations (progress, quiz submissions, achievements) and syncs them
 * when connectivity is restored using React Native Background Fetch.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import BackgroundFetch from 'react-native-background-fetch';
import NetInfo from '@react-native-community/netinfo';
import { EducationSyncOperation } from '@/types/offline';
import { educationService } from './educationService';

// AsyncStorage key for sync queue
const SYNC_QUEUE_KEY = '@education_sync_queue';

// Maximum retry attempts
const MAX_RETRIES = 3;

// Background fetch interval (15 minutes in minutes)
const BACKGROUND_FETCH_INTERVAL = 15;

/**
 * Background Sync Service
 * Singleton service for managing offline operation queue and background sync
 */
class BackgroundSyncService {
  private static instance: BackgroundSyncService;
  private isInitialized = false;
  private isSyncing = false;
  private networkUnsubscribe: (() => void) | null = null;

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): BackgroundSyncService {
    if (!BackgroundSyncService.instance) {
      BackgroundSyncService.instance = new BackgroundSyncService();
    }
    return BackgroundSyncService.instance;
  }

  /**
   * Initialize background sync service
   * Sets up background fetch and network connectivity listeners
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) {
      console.log('[BackgroundSync] Already initialized');
      return;
    }

    try {
      // Configure background fetch
      await BackgroundFetch.configure(
        {
          minimumFetchInterval: BACKGROUND_FETCH_INTERVAL,
          stopOnTerminate: false,
          startOnBoot: true,
          enableHeadless: true,
          requiredNetworkType: BackgroundFetch.NETWORK_TYPE_ANY,
          requiresCharging: false,
          requiresDeviceIdle: false,
          requiresBatteryNotLow: false,
        },
        async (taskId) => {
          console.log('[BackgroundSync] Background task started:', taskId);
          try {
            await this.performSync();
          } catch (error) {
            console.error('[BackgroundSync] Background task error:', error);
          } finally {
            BackgroundFetch.finish(taskId);
          }
        },
        (taskId) => {
          console.log('[BackgroundSync] Background task timeout:', taskId);
          BackgroundFetch.finish(taskId);
        }
      );

      // Start background fetch
      const status = await BackgroundFetch.start();
      console.log('[BackgroundSync] Background fetch status:', status);

      // Set up network connectivity listener for opportunistic sync
      this.networkUnsubscribe = NetInfo.addEventListener((state) => {
        if (state.isConnected && !this.isSyncing) {
          console.log('[BackgroundSync] Network connected, performing opportunistic sync');
          this.performSync().catch((error) => {
            console.error('[BackgroundSync] Opportunistic sync failed:', error);
          });
        }
      });

      this.isInitialized = true;
      console.log('[BackgroundSync] Initialization complete');
    } catch (error) {
      console.error('[BackgroundSync] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Cleanup and stop background sync
   */
  async cleanup(): Promise<void> {
    if (this.networkUnsubscribe) {
      this.networkUnsubscribe();
      this.networkUnsubscribe = null;
    }

    await BackgroundFetch.stop();
    this.isInitialized = false;
    console.log('[BackgroundSync] Cleanup complete');
  }

  /**
   * Queue an operation for background sync
   * @param type - Operation type (progress, quiz, achievement)
   * @param payload - Operation payload data
   */
  async queueOperation(
    type: 'progress' | 'quiz' | 'achievement',
    payload: any
  ): Promise<void> {
    const operation: EducationSyncOperation = {
      id: `${type}_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      type,
      timestamp: new Date().toISOString(),
      payload,
      retries: 0,
    };

    console.log('[BackgroundSync] Queueing operation:', operation.id, 'Type:', type);

    try {
      const queue = await this.getSyncQueue();
      queue.push(operation);
      await this.saveSyncQueue(queue);

      console.log('[BackgroundSync] Operation queued successfully. Queue size:', queue.length);

      // Try immediate sync if online
      const netInfo = await NetInfo.fetch();
      if (netInfo.isConnected && !this.isSyncing) {
        console.log('[BackgroundSync] Online, attempting immediate sync');
        await this.performSync();
      }
    } catch (error) {
      console.error('[BackgroundSync] Failed to queue operation:', error);
      throw error;
    }
  }

  /**
   * Perform background sync of all queued operations
   */
  async performSync(): Promise<void> {
    if (this.isSyncing) {
      console.log('[BackgroundSync] Sync already in progress, skipping');
      return;
    }

    // Check network connectivity
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      console.log('[BackgroundSync] No connectivity, skipping sync');
      return;
    }

    this.isSyncing = true;

    try {
      const queue = await this.getSyncQueue();

      if (queue.length === 0) {
        console.log('[BackgroundSync] Queue empty, nothing to sync');
        return;
      }

      console.log(`[BackgroundSync] Starting sync: ${queue.length} operations in queue`);

      const successfulOperations: string[] = [];
      const failedOperations: EducationSyncOperation[] = [];

      // Process each operation in the queue
      for (const operation of queue) {
        try {
          console.log(`[BackgroundSync] Processing operation: ${operation.id} (${operation.type})`);
          await this.syncOperation(operation);
          successfulOperations.push(operation.id);
          console.log(`[BackgroundSync] Operation ${operation.id} synced successfully`);
        } catch (error) {
          console.error(`[BackgroundSync] Operation ${operation.id} failed:`, error);

          // Increment retry count
          operation.retries += 1;

          // Check if max retries reached
          if (operation.retries >= MAX_RETRIES) {
            console.log(
              `[BackgroundSync] Max retries (${MAX_RETRIES}) reached for operation ${operation.id}, removing from queue`
            );
            successfulOperations.push(operation.id);
          } else {
            console.log(
              `[BackgroundSync] Operation ${operation.id} will be retried (${operation.retries}/${MAX_RETRIES})`
            );
            failedOperations.push(operation);
          }
        }
      }

      // Update queue with failed operations (for retry)
      await this.saveSyncQueue(failedOperations);

      console.log(
        `[BackgroundSync] Sync complete: ${successfulOperations.length} succeeded, ${failedOperations.length} remaining`
      );
    } catch (error) {
      console.error('[BackgroundSync] Sync failed:', error);
      throw error;
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Sync a single operation to the backend
   * @param operation - The operation to sync
   */
  private async syncOperation(operation: EducationSyncOperation): Promise<void> {
    switch (operation.type) {
      case 'progress':
        await this.syncProgress(operation.payload);
        break;

      case 'quiz':
        await this.syncQuizSubmission(operation.payload);
        break;

      case 'achievement':
        await this.syncAchievement(operation.payload);
        break;

      default:
        throw new Error(`Unknown operation type: ${(operation as any).type}`);
    }
  }

  /**
   * Sync progress tracking
   */
  private async syncProgress(payload: {
    contentId: string;
    timeSpent: number;
    completed?: boolean;
  }): Promise<void> {
    const { contentId, timeSpent, completed } = payload;

    if (completed) {
      const response = await educationService.trackCompletion(contentId, timeSpent);
      if (!response.success) {
        throw new Error(response.error || 'Failed to sync progress completion');
      }
    } else {
      const response = await educationService.trackView(contentId, timeSpent);
      if (!response.success) {
        throw new Error(response.error || 'Failed to sync progress view');
      }
    }
  }

  /**
   * Sync quiz submission
   */
  private async syncQuizSubmission(payload: {
    quizId: string;
    answers: Record<string, any>;
  }): Promise<void> {
    const { quizId, answers } = payload;

    const response = await educationService.submitQuiz(quizId, answers);
    if (!response.success) {
      throw new Error(response.error || 'Failed to sync quiz submission');
    }
  }

  /**
   * Sync achievement award
   */
  private async syncAchievement(payload: { userId: string; badgeId: string }): Promise<void> {
    const { userId, badgeId } = payload;

    const response = await educationService.awardAchievement(userId, badgeId);
    if (!response.success) {
      throw new Error(response.error || 'Failed to sync achievement');
    }
  }

  /**
   * Get current sync queue from storage
   */
  async getSyncQueue(): Promise<EducationSyncOperation[]> {
    try {
      const json = await AsyncStorage.getItem(SYNC_QUEUE_KEY);
      return json ? JSON.parse(json) : [];
    } catch (error) {
      console.error('[BackgroundSync] Failed to get sync queue:', error);
      return [];
    }
  }

  /**
   * Save sync queue to storage
   */
  private async saveSyncQueue(queue: EducationSyncOperation[]): Promise<void> {
    try {
      await AsyncStorage.setItem(SYNC_QUEUE_KEY, JSON.stringify(queue));
    } catch (error) {
      console.error('[BackgroundSync] Failed to save sync queue:', error);
      throw error;
    }
  }

  /**
   * Clear all queued operations
   */
  async clearQueue(): Promise<void> {
    try {
      await AsyncStorage.removeItem(SYNC_QUEUE_KEY);
      console.log('[BackgroundSync] Queue cleared');
    } catch (error) {
      console.error('[BackgroundSync] Failed to clear queue:', error);
      throw error;
    }
  }

  /**
   * Get sync queue status
   */
  async getQueueStatus(): Promise<{
    total: number;
    byType: Record<string, number>;
    oldestOperation?: string;
  }> {
    const queue = await this.getSyncQueue();

    const byType: Record<string, number> = {
      progress: 0,
      quiz: 0,
      achievement: 0,
    };

    queue.forEach((op) => {
      byType[op.type] = (byType[op.type] || 0) + 1;
    });

    const oldestOperation =
      queue.length > 0
        ? queue.reduce((oldest, current) =>
            new Date(current.timestamp) < new Date(oldest.timestamp) ? current : oldest
          ).timestamp
        : undefined;

    return {
      total: queue.length,
      byType,
      oldestOperation,
    };
  }

  /**
   * Check if currently syncing
   */
  isSyncInProgress(): boolean {
    return this.isSyncing;
  }
}

// Export singleton instance
export const backgroundSyncService = BackgroundSyncService.getInstance();
