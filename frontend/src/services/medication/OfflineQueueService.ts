/**
 * Offline Queue Service for Medication Data
 *
 * Manages offline storage and synchronization of medication data,
 * including captured images and OCR results, with automatic retry
 * and conflict resolution for Malaysian healthcare context.
 */

import * as SecureStore from 'expo-secure-store';
import * as NetInfo from '@react-native-netinfo/netinfo';
import { CapturedImage, OCRResult, Medication } from '../../types/medication';
import { ImageStorageService } from '../camera/ImageStorageService';

export interface QueuedMedicationEntry {
  id: string;
  tempId: string; // Temporary ID used offline
  medication: Partial<Medication>;
  images: string[]; // Local file paths
  ocrResults: OCRResult[];
  source: 'camera' | 'manual' | 'import';
  createdAt: string;
  lastModified: string;
  syncAttempts: number;
  syncStatus: 'pending' | 'syncing' | 'synced' | 'failed';
  syncError?: string;
  priority: 'high' | 'medium' | 'low';
}

export interface QueueSyncResult {
  successful: number;
  failed: number;
  skipped: number;
  errors: Array<{
    entryId: string;
    error: string;
  }>;
}

export interface OfflineQueueStats {
  totalEntries: number;
  pendingSync: number;
  syncedEntries: number;
  failedEntries: number;
  oldestPendingDate: string | null;
  queueSizeBytes: number;
}

export class OfflineQueueService {
  private static instance: OfflineQueueService;
  private readonly queueKey = 'medication-offline-queue';
  private readonly configKey = 'offline-queue-config';
  private readonly maxRetries = 3;
  private readonly retryDelayMs = 30000; // 30 seconds
  private readonly maxQueueSize = 100;

  private isOnline = false;
  private syncInProgress = false;
  private imageStorage = ImageStorageService.getInstance();

  private constructor() {
    this.initializeNetworkListener();
  }

  public static getInstance(): OfflineQueueService {
    if (!OfflineQueueService.instance) {
      OfflineQueueService.instance = new OfflineQueueService();
    }
    return OfflineQueueService.instance;
  }

  /**
   * Initialize network status monitoring
   */
  private async initializeNetworkListener(): Promise<void> {
    try {
      // Get initial network state
      const networkState = await NetInfo.fetch();
      this.isOnline = networkState.isConnected ?? false;

      // Listen for network changes
      NetInfo.addEventListener(state => {
        const wasOffline = !this.isOnline;
        this.isOnline = state.isConnected ?? false;

        // If we just came back online, attempt to sync
        if (wasOffline && this.isOnline) {
          console.log('Network restored, attempting to sync offline queue');
          this.syncQueue();
        }
      });
    } catch (error) {
      console.error('Error initializing network listener:', error);
    }
  }

  /**
   * Add medication entry to offline queue
   */
  public async queueMedicationEntry(
    medication: Partial<Medication>,
    images: CapturedImage[],
    ocrResults: OCRResult[],
    source: 'camera' | 'manual' | 'import' = 'camera'
  ): Promise<string> {
    try {
      const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Store images locally first
      const storedImagePaths: string[] = [];
      for (const image of images) {
        const storedPath = await this.imageStorage.storeImage(image, tempId);
        storedImagePaths.push(storedPath);
      }

      const queueEntry: QueuedMedicationEntry = {
        id: '', // Will be set when synced with server
        tempId,
        medication,
        images: storedImagePaths,
        ocrResults,
        source,
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        syncAttempts: 0,
        syncStatus: 'pending',
        priority: this.determinePriority(medication, source)
      };

      await this.addToQueue(queueEntry);

      // Attempt immediate sync if online
      if (this.isOnline && !this.syncInProgress) {
        this.syncQueue();
      }

      return tempId;
    } catch (error) {
      console.error('Error queuing medication entry:', error);
      throw new Error('Failed to queue medication entry for offline sync');
    }
  }

  /**
   * Update existing queued medication entry
   */
  public async updateQueuedEntry(
    tempId: string,
    updates: Partial<Medication>
  ): Promise<boolean> {
    try {
      const queue = await this.getQueue();
      const entryIndex = queue.findIndex(entry => entry.tempId === tempId);

      if (entryIndex === -1) {
        return false;
      }

      // Merge updates with existing medication data
      queue[entryIndex].medication = {
        ...queue[entryIndex].medication,
        ...updates
      };
      queue[entryIndex].lastModified = new Date().toISOString();
      queue[entryIndex].syncStatus = 'pending'; // Reset sync status

      await this.saveQueue(queue);
      return true;
    } catch (error) {
      console.error('Error updating queued entry:', error);
      return false;
    }
  }

  /**
   * Remove entry from queue
   */
  public async removeQueuedEntry(tempId: string): Promise<boolean> {
    try {
      const queue = await this.getQueue();
      const entryIndex = queue.findIndex(entry => entry.tempId === tempId);

      if (entryIndex === -1) {
        return false;
      }

      const entry = queue[entryIndex];

      // Clean up stored images
      for (const imagePath of entry.images) {
        try {
          const filename = imagePath.split('/').pop();
          if (filename) {
            await this.imageStorage.deleteImage(filename);
          }
        } catch (imageError) {
          console.warn('Error deleting image:', imageError);
        }
      }

      // Remove from queue
      queue.splice(entryIndex, 1);
      await this.saveQueue(queue);

      return true;
    } catch (error) {
      console.error('Error removing queued entry:', error);
      return false;
    }
  }

  /**
   * Get all queued entries
   */
  public async getQueuedEntries(
    status?: 'pending' | 'syncing' | 'synced' | 'failed'
  ): Promise<QueuedMedicationEntry[]> {
    try {
      const queue = await this.getQueue();

      if (status) {
        return queue.filter(entry => entry.syncStatus === status);
      }

      return queue;
    } catch (error) {
      console.error('Error getting queued entries:', error);
      return [];
    }
  }

  /**
   * Sync all pending entries with server
   */
  public async syncQueue(): Promise<QueueSyncResult> {
    if (this.syncInProgress || !this.isOnline) {
      return { successful: 0, failed: 0, skipped: 0, errors: [] };
    }

    this.syncInProgress = true;
    const result: QueueSyncResult = {
      successful: 0,
      failed: 0,
      skipped: 0,
      errors: []
    };

    try {
      const queue = await this.getQueue();
      const pendingEntries = queue
        .filter(entry => entry.syncStatus === 'pending' || entry.syncStatus === 'failed')
        .sort((a, b) => {
          // Sort by priority and creation date
          const priorityOrder = { high: 3, medium: 2, low: 1 };
          if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
            return priorityOrder[b.priority] - priorityOrder[a.priority];
          }
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        });

      console.log(`Starting sync of ${pendingEntries.length} pending entries`);

      for (const entry of pendingEntries) {
        try {
          // Skip if too many retry attempts
          if (entry.syncAttempts >= this.maxRetries) {
            result.skipped++;
            continue;
          }

          // Mark as syncing
          entry.syncStatus = 'syncing';
          entry.syncAttempts++;
          await this.updateEntryInQueue(entry);

          // Attempt to sync with server
          const syncSuccess = await this.syncSingleEntry(entry);

          if (syncSuccess) {
            entry.syncStatus = 'synced';
            entry.syncError = undefined;
            result.successful++;
          } else {
            entry.syncStatus = 'failed';
            entry.syncError = 'Server sync failed';
            result.failed++;
            result.errors.push({
              entryId: entry.tempId,
              error: entry.syncError
            });
          }

          await this.updateEntryInQueue(entry);

        } catch (syncError) {
          console.error(`Error syncing entry ${entry.tempId}:`, syncError);

          // Update entry with error status
          entry.syncStatus = 'failed';
          entry.syncError = syncError instanceof Error ? syncError.message : 'Unknown sync error';
          await this.updateEntryInQueue(entry);

          result.failed++;
          result.errors.push({
            entryId: entry.tempId,
            error: entry.syncError
          });
        }

        // Add delay between sync attempts to avoid overwhelming server
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Clean up old synced entries (older than 30 days)
      await this.cleanupOldEntries();

      console.log('Queue sync completed:', result);
      return result;

    } catch (error) {
      console.error('Error during queue sync:', error);
      return result;
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Get queue statistics
   */
  public async getQueueStats(): Promise<OfflineQueueStats> {
    try {
      const queue = await this.getQueue();

      let queueSizeBytes = 0;
      let oldestPendingDate: string | null = null;

      const pendingEntries = queue.filter(entry => entry.syncStatus === 'pending');
      const syncedEntries = queue.filter(entry => entry.syncStatus === 'synced');
      const failedEntries = queue.filter(entry => entry.syncStatus === 'failed');

      // Calculate queue size and find oldest pending entry
      for (const entry of queue) {
        // Estimate entry size (rough calculation)
        const entrySize = JSON.stringify(entry).length * 2; // Rough UTF-16 estimation
        queueSizeBytes += entrySize;

        if (entry.syncStatus === 'pending') {
          if (!oldestPendingDate || entry.createdAt < oldestPendingDate) {
            oldestPendingDate = entry.createdAt;
          }
        }
      }

      return {
        totalEntries: queue.length,
        pendingSync: pendingEntries.length,
        syncedEntries: syncedEntries.length,
        failedEntries: failedEntries.length,
        oldestPendingDate,
        queueSizeBytes
      };
    } catch (error) {
      console.error('Error getting queue stats:', error);
      return {
        totalEntries: 0,
        pendingSync: 0,
        syncedEntries: 0,
        failedEntries: 0,
        oldestPendingDate: null,
        queueSizeBytes: 0
      };
    }
  }

  /**
   * Retry failed entries
   */
  public async retryFailedEntries(): Promise<QueueSyncResult> {
    try {
      const queue = await this.getQueue();

      // Reset failed entries to pending status
      for (const entry of queue) {
        if (entry.syncStatus === 'failed' && entry.syncAttempts < this.maxRetries) {
          entry.syncStatus = 'pending';
          entry.syncError = undefined;
        }
      }

      await this.saveQueue(queue);

      // Attempt sync if online
      if (this.isOnline) {
        return await this.syncQueue();
      }

      return { successful: 0, failed: 0, skipped: 0, errors: [] };
    } catch (error) {
      console.error('Error retrying failed entries:', error);
      return { successful: 0, failed: 0, skipped: 0, errors: [] };
    }
  }

  /**
   * Clear all synced entries from queue
   */
  public async clearSyncedEntries(): Promise<number> {
    try {
      const queue = await this.getQueue();
      const syncedEntries = queue.filter(entry => entry.syncStatus === 'synced');
      const remainingEntries = queue.filter(entry => entry.syncStatus !== 'synced');

      // Clean up images for synced entries
      for (const entry of syncedEntries) {
        for (const imagePath of entry.images) {
          try {
            const filename = imagePath.split('/').pop();
            if (filename) {
              await this.imageStorage.deleteImage(filename);
            }
          } catch (imageError) {
            console.warn('Error deleting image:', imageError);
          }
        }
      }

      await this.saveQueue(remainingEntries);
      return syncedEntries.length;
    } catch (error) {
      console.error('Error clearing synced entries:', error);
      return 0;
    }
  }

  // Private helper methods

  private async getQueue(): Promise<QueuedMedicationEntry[]> {
    try {
      const queueData = await SecureStore.getItemAsync(this.queueKey);
      return queueData ? JSON.parse(queueData) : [];
    } catch (error) {
      console.error('Error getting queue from storage:', error);
      return [];
    }
  }

  private async saveQueue(queue: QueuedMedicationEntry[]): Promise<void> {
    try {
      // Enforce max queue size
      if (queue.length > this.maxQueueSize) {
        // Remove oldest synced entries first
        const syncedEntries = queue.filter(e => e.syncStatus === 'synced');
        const otherEntries = queue.filter(e => e.syncStatus !== 'synced');

        syncedEntries.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        const entriesToRemove = syncedEntries.slice(0, queue.length - this.maxQueueSize);

        for (const entry of entriesToRemove) {
          await this.cleanupEntryImages(entry);
        }

        queue = [...otherEntries, ...syncedEntries.slice(entriesToRemove.length)];
      }

      await SecureStore.setItemAsync(this.queueKey, JSON.stringify(queue));
    } catch (error) {
      console.error('Error saving queue to storage:', error);
      throw error;
    }
  }

  private async addToQueue(entry: QueuedMedicationEntry): Promise<void> {
    const queue = await this.getQueue();
    queue.push(entry);
    await this.saveQueue(queue);
  }

  private async updateEntryInQueue(updatedEntry: QueuedMedicationEntry): Promise<void> {
    const queue = await this.getQueue();
    const index = queue.findIndex(entry => entry.tempId === updatedEntry.tempId);

    if (index !== -1) {
      queue[index] = updatedEntry;
      await this.saveQueue(queue);
    }
  }

  private determinePriority(
    medication: Partial<Medication>,
    source: 'camera' | 'manual' | 'import'
  ): 'high' | 'medium' | 'low' {
    // High priority for prescription medications
    if (medication.category === 'prescription' || medication.category === 'emergency') {
      return 'high';
    }

    // Medium priority for camera captures (user actively adding)
    if (source === 'camera') {
      return 'medium';
    }

    // Lower priority for imported or manually entered data
    return 'low';
  }

  private async syncSingleEntry(entry: QueuedMedicationEntry): Promise<boolean> {
    try {
      // This is a placeholder for actual server sync
      // In a real implementation, you would:
      // 1. Upload images to cloud storage
      // 2. Send medication data to server API
      // 3. Handle server response and conflicts
      // 4. Update entry with server-assigned ID

      console.log(`Syncing entry ${entry.tempId} with server`);

      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Simulate success (90% success rate)
      const success = Math.random() < 0.9;

      if (success) {
        // In real implementation, set actual server ID
        entry.id = `med_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }

      return success;
    } catch (error) {
      console.error('Error syncing single entry:', error);
      return false;
    }
  }

  private async cleanupOldEntries(): Promise<void> {
    try {
      const queue = await this.getQueue();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const oldSyncedEntries = queue.filter(entry =>
        entry.syncStatus === 'synced' &&
        new Date(entry.createdAt) < thirtyDaysAgo
      );

      for (const entry of oldSyncedEntries) {
        await this.cleanupEntryImages(entry);
      }

      const remainingEntries = queue.filter(entry =>
        entry.syncStatus !== 'synced' ||
        new Date(entry.createdAt) >= thirtyDaysAgo
      );

      if (remainingEntries.length !== queue.length) {
        await this.saveQueue(remainingEntries);
        console.log(`Cleaned up ${oldSyncedEntries.length} old entries`);
      }
    } catch (error) {
      console.error('Error cleaning up old entries:', error);
    }
  }

  private async cleanupEntryImages(entry: QueuedMedicationEntry): Promise<void> {
    for (const imagePath of entry.images) {
      try {
        const filename = imagePath.split('/').pop();
        if (filename) {
          await this.imageStorage.deleteImage(filename);
        }
      } catch (error) {
        console.warn('Error deleting image:', error);
      }
    }
  }
}