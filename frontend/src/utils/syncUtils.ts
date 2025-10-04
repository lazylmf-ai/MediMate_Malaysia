/**
 * Sync Utilities
 *
 * Utility functions for background sync operations including:
 * - Operation ID generation
 * - Retry logic helpers
 * - Network connectivity checks
 * - Backoff delay calculations
 * - Sync status formatting
 */

import NetInfo from '@react-native-community/netinfo';
import { EducationSyncOperation } from '@/types/offline';

/**
 * Generate unique operation ID
 * Format: {type}_{timestamp}_{random}
 *
 * @param type - Operation type (progress, quiz, achievement)
 * @returns Unique operation ID
 */
export function generateOperationId(type: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  return `${type}_${timestamp}_${random}`;
}

/**
 * Check if operation should be retried
 *
 * @param operation - The sync operation to check
 * @param maxRetries - Maximum number of retries allowed
 * @returns True if operation should be retried
 */
export function shouldRetry(operation: EducationSyncOperation, maxRetries: number): boolean {
  return operation.retries < maxRetries;
}

/**
 * Check network connectivity status
 *
 * @returns Promise resolving to true if online, false otherwise
 */
export async function isOnline(): Promise<boolean> {
  try {
    const state = await NetInfo.fetch();
    return state.isConnected ?? false;
  } catch (error) {
    console.error('[SyncUtils] Failed to check network status:', error);
    return false;
  }
}

/**
 * Calculate exponential backoff delay
 * Formula: baseDelay * (2 ^ retries) with jitter
 *
 * @param retries - Number of retry attempts
 * @param baseDelay - Base delay in milliseconds (default: 1000ms)
 * @param maxDelay - Maximum delay in milliseconds (default: 60000ms / 1 minute)
 * @returns Delay in milliseconds
 */
export function calculateBackoffDelay(
  retries: number,
  baseDelay = 1000,
  maxDelay = 60000
): number {
  // Exponential backoff: baseDelay * 2^retries
  const exponentialDelay = baseDelay * Math.pow(2, retries);

  // Add jitter (random value between 0 and 0.3 * delay)
  const jitter = Math.random() * 0.3 * exponentialDelay;

  // Cap at max delay
  const delay = Math.min(exponentialDelay + jitter, maxDelay);

  return Math.floor(delay);
}

/**
 * Format sync queue status for logging
 *
 * @param queue - Array of sync operations
 * @returns Formatted status string
 */
export function formatSyncStatus(queue: EducationSyncOperation[]): string {
  if (queue.length === 0) {
    return 'Sync queue is empty';
  }

  const byType: Record<string, number> = {
    progress: 0,
    quiz: 0,
    achievement: 0,
  };

  let totalRetries = 0;

  queue.forEach((operation) => {
    byType[operation.type] = (byType[operation.type] || 0) + 1;
    totalRetries += operation.retries;
  });

  const typeBreakdown = Object.entries(byType)
    .filter(([_, count]) => count > 0)
    .map(([type, count]) => `${count} ${type}`)
    .join(', ');

  const avgRetries = queue.length > 0 ? (totalRetries / queue.length).toFixed(1) : '0';

  return `Sync queue: ${queue.length} operations (${typeBreakdown}), avg retries: ${avgRetries}`;
}

/**
 * Get oldest operation in queue
 *
 * @param queue - Array of sync operations
 * @returns Oldest operation or undefined if queue is empty
 */
export function getOldestOperation(
  queue: EducationSyncOperation[]
): EducationSyncOperation | undefined {
  if (queue.length === 0) {
    return undefined;
  }

  return queue.reduce((oldest, current) =>
    new Date(current.timestamp) < new Date(oldest.timestamp) ? current : oldest
  );
}

/**
 * Get newest operation in queue
 *
 * @param queue - Array of sync operations
 * @returns Newest operation or undefined if queue is empty
 */
export function getNewestOperation(
  queue: EducationSyncOperation[]
): EducationSyncOperation | undefined {
  if (queue.length === 0) {
    return undefined;
  }

  return queue.reduce((newest, current) =>
    new Date(current.timestamp) > new Date(newest.timestamp) ? current : newest
  );
}

/**
 * Calculate queue age in milliseconds
 *
 * @param queue - Array of sync operations
 * @returns Age of oldest operation in milliseconds, or 0 if queue is empty
 */
export function calculateQueueAge(queue: EducationSyncOperation[]): number {
  const oldest = getOldestOperation(queue);
  if (!oldest) {
    return 0;
  }

  return Date.now() - new Date(oldest.timestamp).getTime();
}

/**
 * Format queue age for display
 *
 * @param ageMs - Age in milliseconds
 * @returns Human-readable age string
 */
export function formatQueueAge(ageMs: number): string {
  const seconds = Math.floor(ageMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days}d ${hours % 24}h`;
  }
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
}

/**
 * Filter operations by type
 *
 * @param queue - Array of sync operations
 * @param type - Operation type to filter
 * @returns Filtered array of operations
 */
export function filterOperationsByType(
  queue: EducationSyncOperation[],
  type: 'progress' | 'quiz' | 'achievement'
): EducationSyncOperation[] {
  return queue.filter((operation) => operation.type === type);
}

/**
 * Get operations that need retry
 *
 * @param queue - Array of sync operations
 * @param maxRetries - Maximum number of retries allowed
 * @returns Array of operations that should be retried
 */
export function getRetryableOperations(
  queue: EducationSyncOperation[],
  maxRetries: number
): EducationSyncOperation[] {
  return queue.filter((operation) => shouldRetry(operation, maxRetries));
}

/**
 * Get operations that have exceeded max retries
 *
 * @param queue - Array of sync operations
 * @param maxRetries - Maximum number of retries allowed
 * @returns Array of operations that have exceeded max retries
 */
export function getFailedOperations(
  queue: EducationSyncOperation[],
  maxRetries: number
): EducationSyncOperation[] {
  return queue.filter((operation) => operation.retries >= maxRetries);
}

/**
 * Sort operations by timestamp (oldest first)
 *
 * @param queue - Array of sync operations
 * @returns Sorted array (oldest first)
 */
export function sortByOldest(queue: EducationSyncOperation[]): EducationSyncOperation[] {
  return [...queue].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
}

/**
 * Sort operations by timestamp (newest first)
 *
 * @param queue - Array of sync operations
 * @returns Sorted array (newest first)
 */
export function sortByNewest(queue: EducationSyncOperation[]): EducationSyncOperation[] {
  return [...queue].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
}

/**
 * Sort operations by retry count (highest first)
 *
 * @param queue - Array of sync operations
 * @returns Sorted array (most retries first)
 */
export function sortByRetries(queue: EducationSyncOperation[]): EducationSyncOperation[] {
  return [...queue].sort((a, b) => b.retries - a.retries);
}

/**
 * Get sync statistics
 *
 * @param queue - Array of sync operations
 * @returns Statistics object
 */
export function getSyncStatistics(queue: EducationSyncOperation[]): {
  total: number;
  byType: Record<string, number>;
  totalRetries: number;
  averageRetries: number;
  oldestAge: number;
  newestAge: number;
} {
  const byType: Record<string, number> = {
    progress: 0,
    quiz: 0,
    achievement: 0,
  };

  let totalRetries = 0;

  queue.forEach((operation) => {
    byType[operation.type] = (byType[operation.type] || 0) + 1;
    totalRetries += operation.retries;
  });

  const oldest = getOldestOperation(queue);
  const newest = getNewestOperation(queue);

  return {
    total: queue.length,
    byType,
    totalRetries,
    averageRetries: queue.length > 0 ? totalRetries / queue.length : 0,
    oldestAge: oldest ? Date.now() - new Date(oldest.timestamp).getTime() : 0,
    newestAge: newest ? Date.now() - new Date(newest.timestamp).getTime() : 0,
  };
}

/**
 * Validate sync operation structure
 *
 * @param operation - Operation to validate
 * @returns True if valid, false otherwise
 */
export function isValidSyncOperation(operation: any): operation is EducationSyncOperation {
  return (
    typeof operation === 'object' &&
    operation !== null &&
    typeof operation.id === 'string' &&
    typeof operation.type === 'string' &&
    ['progress', 'quiz', 'achievement'].includes(operation.type) &&
    typeof operation.timestamp === 'string' &&
    typeof operation.payload === 'object' &&
    typeof operation.retries === 'number' &&
    operation.retries >= 0
  );
}

/**
 * Clean invalid operations from queue
 *
 * @param queue - Array of sync operations (possibly with invalid items)
 * @returns Cleaned array with only valid operations
 */
export function cleanInvalidOperations(queue: any[]): EducationSyncOperation[] {
  return queue.filter(isValidSyncOperation);
}
