/**
 * Sync Queue Manager
 *
 * Manages persistent queue for offline sync operations with priority handling
 * and batch processing.
 * Part of Issue #27 Stream B - Intelligent Synchronization & Conflict Resolution
 *
 * Features:
 * - Persistent queue with SQLite backend
 * - Priority-based processing
 * - Batch operations for efficiency
 * - Automatic retry with exponential backoff
 * - Queue analytics and monitoring
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SyncOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  entityType: 'medication' | 'schedule' | 'adherence' | 'preference' | 'family_member';
  entityId: string;
  data: any;
  priority: number; // 1-10, higher = more important
  timestamp: Date;
  retryCount: number;
  lastAttempt?: Date;
  error?: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
}

export interface QueueBatch {
  id: string;
  operations: SyncOperation[];
  createdAt: Date;
  estimatedSize: number; // bytes
  priority: number;
}

export interface QueueStats {
  totalOperations: number;
  pendingOperations: number;
  processingOperations: number;
  failedOperations: number;
  completedToday: number;
  averageProcessingTime: number;
  queueSize: number; // bytes
  oldestOperation?: Date;
}

export interface SyncQueueManagerConfig {
  maxQueueSize: number;
  maxRetryAttempts: number;
  batchSize: number;
  batchingEnabled: boolean;
  priorityThreshold: number; // Operations above this are never batched
  exponentialBackoffBase: number; // milliseconds
  persistenceEnabled: boolean;
}

class SyncQueueManager {
  private static instance: SyncQueueManager;
  private config: SyncQueueManagerConfig;
  private queue: SyncOperation[] = [];
  private completedOperations: SyncOperation[] = [];
  private processingStats = {
    totalProcessed: 0,
    totalFailed: 0,
    averageProcessingTime: 0,
    completedToday: 0,
    lastResetDate: new Date().toDateString()
  };

  private readonly STORAGE_KEYS = {
    QUEUE: 'sync_queue_operations',
    COMPLETED: 'sync_completed_operations',
    STATS: 'sync_queue_stats'
  };

  private constructor() {
    this.config = this.getDefaultConfig();
  }

  static getInstance(): SyncQueueManager {
    if (!SyncQueueManager.instance) {
      SyncQueueManager.instance = new SyncQueueManager();
    }
    return SyncQueueManager.instance;
  }

  /**
   * Initialize the sync queue manager
   */
  async initialize(config?: Partial<SyncQueueManagerConfig>): Promise<void> {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    if (this.config.persistenceEnabled) {
      await this.loadQueue();
      await this.loadStats();
    }

    console.log('SyncQueueManager initialized');
  }

  /**
   * Add operation to sync queue
   */
  async enqueue(operation: Omit<SyncOperation, 'id' | 'timestamp' | 'retryCount' | 'status'>): Promise<string> {
    const id = `sync_op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const syncOp: SyncOperation = {
      ...operation,
      id,
      timestamp: new Date(),
      retryCount: 0,
      status: 'pending'
    };

    // Check queue size limit
    if (this.queue.length >= this.config.maxQueueSize) {
      // Remove oldest low-priority completed operations
      await this.pruneQueue();
    }

    this.queue.push(syncOp);
    this.sortQueueByPriority();

    if (this.config.persistenceEnabled) {
      await this.saveQueue();
    }

    console.log(`Enqueued ${operation.type} operation for ${operation.entityType}/${operation.entityId} with priority ${operation.priority}`);

    return id;
  }

  /**
   * Get next batch of operations to process
   */
  async getNextBatch(): Promise<QueueBatch | null> {
    const pendingOps = this.queue.filter(op => op.status === 'pending');

    if (pendingOps.length === 0) {
      return null;
    }

    let operations: SyncOperation[];

    if (this.config.batchingEnabled) {
      // Get high-priority operations that should not be batched
      const highPriority = pendingOps.filter(op => op.priority >= this.config.priorityThreshold);

      if (highPriority.length > 0) {
        // Process high-priority operations individually or in small batches
        operations = highPriority.slice(0, Math.min(5, highPriority.length));
      } else {
        // Batch normal priority operations
        operations = pendingOps.slice(0, this.config.batchSize);
      }
    } else {
      // No batching - process one at a time
      operations = [pendingOps[0]];
    }

    const batchId = `batch_${Date.now()}`;
    const estimatedSize = JSON.stringify(operations.map(op => op.data)).length;
    const avgPriority = operations.reduce((sum, op) => sum + op.priority, 0) / operations.length;

    return {
      id: batchId,
      operations,
      createdAt: new Date(),
      estimatedSize,
      priority: avgPriority
    };
  }

  /**
   * Mark operations in batch as processing
   */
  async markBatchProcessing(batch: QueueBatch): Promise<void> {
    for (const op of batch.operations) {
      const queueOp = this.queue.find(o => o.id === op.id);
      if (queueOp) {
        queueOp.status = 'processing';
        queueOp.lastAttempt = new Date();
      }
    }

    if (this.config.persistenceEnabled) {
      await this.saveQueue();
    }
  }

  /**
   * Mark batch operations as completed
   */
  async markBatchCompleted(batch: QueueBatch): Promise<void> {
    for (const op of batch.operations) {
      await this.markOperationCompleted(op.id);
    }
  }

  /**
   * Mark single operation as completed
   */
  async markOperationCompleted(operationId: string): Promise<void> {
    const index = this.queue.findIndex(op => op.id === operationId);

    if (index >= 0) {
      const operation = this.queue[index];
      operation.status = 'completed';

      // Move to completed operations
      this.completedOperations.push(operation);
      this.queue.splice(index, 1);

      // Update stats
      this.processingStats.totalProcessed++;
      this.processingStats.completedToday++;

      if (this.config.persistenceEnabled) {
        await this.saveQueue();
        await this.saveStats();
      }

      console.log(`Completed operation ${operationId}`);
    }
  }

  /**
   * Mark operation as failed and handle retry logic
   */
  async markOperationFailed(operationId: string, error: string): Promise<boolean> {
    const operation = this.queue.find(op => op.id === operationId);

    if (!operation) {
      return false;
    }

    operation.retryCount++;
    operation.error = error;
    operation.lastAttempt = new Date();

    if (operation.retryCount >= this.config.maxRetryAttempts) {
      // Max retries reached - mark as permanently failed
      operation.status = 'failed';
      this.processingStats.totalFailed++;

      console.log(`Operation ${operationId} permanently failed after ${operation.retryCount} attempts`);

      if (this.config.persistenceEnabled) {
        await this.saveQueue();
        await this.saveStats();
      }

      return false; // Will not retry
    } else {
      // Reset to pending for retry with exponential backoff
      operation.status = 'pending';

      console.log(`Operation ${operationId} failed (attempt ${operation.retryCount}/${this.config.maxRetryAttempts}), will retry`);

      if (this.config.persistenceEnabled) {
        await this.saveQueue();
      }

      return true; // Will retry
    }
  }

  /**
   * Calculate backoff delay for retry
   */
  getRetryDelay(operation: SyncOperation): number {
    const baseDelay = this.config.exponentialBackoffBase;
    const exponentialDelay = baseDelay * Math.pow(2, operation.retryCount - 1);

    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 1000;

    return exponentialDelay + jitter;
  }

  /**
   * Get queue statistics
   */
  getStats(): QueueStats {
    const now = new Date();
    const currentDate = now.toDateString();

    // Reset daily stats if new day
    if (currentDate !== this.processingStats.lastResetDate) {
      this.processingStats.completedToday = 0;
      this.processingStats.lastResetDate = currentDate;
    }

    const pendingOps = this.queue.filter(op => op.status === 'pending');
    const processingOps = this.queue.filter(op => op.status === 'processing');
    const failedOps = this.queue.filter(op => op.status === 'failed');

    const queueSize = JSON.stringify(this.queue).length;

    const oldestOp = this.queue.length > 0
      ? this.queue.reduce((oldest, op) => op.timestamp < oldest.timestamp ? op : oldest).timestamp
      : undefined;

    return {
      totalOperations: this.queue.length,
      pendingOperations: pendingOps.length,
      processingOperations: processingOps.length,
      failedOperations: failedOps.length,
      completedToday: this.processingStats.completedToday,
      averageProcessingTime: this.processingStats.averageProcessingTime,
      queueSize,
      oldestOperation: oldestOp
    };
  }

  /**
   * Get operations by status
   */
  getOperationsByStatus(status: SyncOperation['status']): SyncOperation[] {
    return this.queue.filter(op => op.status === status).map(op => ({ ...op }));
  }

  /**
   * Get operation by ID
   */
  getOperation(operationId: string): SyncOperation | null {
    const operation = this.queue.find(op => op.id === operationId);
    return operation ? { ...operation } : null;
  }

  /**
   * Remove operation from queue
   */
  async removeOperation(operationId: string): Promise<boolean> {
    const index = this.queue.findIndex(op => op.id === operationId);

    if (index >= 0) {
      this.queue.splice(index, 1);

      if (this.config.persistenceEnabled) {
        await this.saveQueue();
      }

      return true;
    }

    return false;
  }

  /**
   * Clear all completed operations
   */
  async clearCompleted(): Promise<number> {
    const count = this.completedOperations.length;
    this.completedOperations = [];

    if (this.config.persistenceEnabled) {
      await AsyncStorage.removeItem(this.STORAGE_KEYS.COMPLETED);
    }

    return count;
  }

  /**
   * Clear entire queue (use with caution)
   */
  async clearQueue(): Promise<number> {
    const count = this.queue.length;
    this.queue = [];
    this.completedOperations = [];

    if (this.config.persistenceEnabled) {
      await this.saveQueue();
    }

    return count;
  }

  /**
   * Private helper methods
   */

  private sortQueueByPriority(): void {
    this.queue.sort((a, b) => {
      // Sort by priority (higher first), then by timestamp (older first)
      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }
      return a.timestamp.getTime() - b.timestamp.getTime();
    });
  }

  private async pruneQueue(): Promise<void> {
    // Remove old completed operations
    const completedOps = this.queue.filter(op => op.status === 'completed');

    if (completedOps.length > 0) {
      // Keep only recent 50 completed operations
      completedOps.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
      const toRemove = completedOps.slice(50);

      this.queue = this.queue.filter(op => !toRemove.includes(op));

      console.log(`Pruned ${toRemove.length} old completed operations from queue`);
    }

    // If still too large, remove old low-priority failed operations
    if (this.queue.length >= this.config.maxQueueSize) {
      const failedOps = this.queue.filter(op => op.status === 'failed' && op.priority < 5);

      if (failedOps.length > 0) {
        failedOps.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
        const toRemove = failedOps.slice(0, Math.min(10, failedOps.length));

        this.queue = this.queue.filter(op => !toRemove.includes(op));

        console.log(`Pruned ${toRemove.length} old failed operations from queue`);
      }
    }

    if (this.config.persistenceEnabled) {
      await this.saveQueue();
    }
  }

  /**
   * Storage methods
   */

  private async loadQueue(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEYS.QUEUE);
      if (stored) {
        const operations = JSON.parse(stored);
        this.queue = operations.map((op: any) => ({
          ...op,
          timestamp: new Date(op.timestamp),
          lastAttempt: op.lastAttempt ? new Date(op.lastAttempt) : undefined
        }));

        console.log(`Loaded ${this.queue.length} operations from persistent queue`);
      }
    } catch (error) {
      console.error('Failed to load queue:', error);
    }
  }

  private async saveQueue(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEYS.QUEUE, JSON.stringify(this.queue));
    } catch (error) {
      console.error('Failed to save queue:', error);
    }
  }

  private async loadStats(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEYS.STATS);
      if (stored) {
        this.processingStats = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  }

  private async saveStats(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEYS.STATS, JSON.stringify(this.processingStats));
    } catch (error) {
      console.error('Failed to save stats:', error);
    }
  }

  private getDefaultConfig(): SyncQueueManagerConfig {
    return {
      maxQueueSize: 1000,
      maxRetryAttempts: 3,
      batchSize: 50,
      batchingEnabled: true,
      priorityThreshold: 8, // Operations with priority >= 8 are not batched
      exponentialBackoffBase: 1000, // 1 second base delay
      persistenceEnabled: true
    };
  }

  /**
   * Cleanup
   */
  async cleanup(): Promise<void> {
    if (this.config.persistenceEnabled) {
      await this.saveQueue();
      await this.saveStats();
    }
  }
}

export default SyncQueueManager;