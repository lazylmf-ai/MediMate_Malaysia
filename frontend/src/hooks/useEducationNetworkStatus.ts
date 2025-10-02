/**
 * useEducationNetworkStatus Hook
 *
 * Education-specific network status hook that extends the base network status
 * with sync queue monitoring for offline education content synchronization.
 *
 * Features:
 * - All features from useNetworkStatus
 * - Poll sync queue status from backgroundSyncService
 * - Track sync in progress state
 * - Auto-update when network state changes
 * - Poll queue every 10 seconds
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useNetworkStatus as useBaseNetworkStatus } from './common/useNetworkStatus';
import { backgroundSyncService } from '@/services/backgroundSyncService';

interface UseEducationNetworkStatusResult {
  // Base network status
  isOnline: boolean;
  isConnected: boolean;
  connectionType: string;

  // Education-specific
  syncQueueCount: number;
  syncInProgress: boolean;
  refreshStatus: () => Promise<void>;
}

/**
 * Hook for monitoring network connectivity and education sync queue status
 *
 * @returns Network status and sync queue information
 */
export function useEducationNetworkStatus(): UseEducationNetworkStatusResult {
  const baseNetworkStatus = useBaseNetworkStatus();
  const [syncQueueCount, setSyncQueueCount] = useState(0);
  const [syncInProgress, setSyncInProgress] = useState(false);

  // Use ref to track if component is mounted
  const isMountedRef = useRef(true);

  // Use ref to store interval ID
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch sync queue status
  const fetchQueueStatus = useCallback(async () => {
    try {
      const queueStatus = await backgroundSyncService.getQueueStatus();
      const inProgress = backgroundSyncService.isSyncInProgress();

      if (isMountedRef.current) {
        setSyncQueueCount(queueStatus.total);
        setSyncInProgress(inProgress);
      }
    } catch (error) {
      console.error('[useEducationNetworkStatus] Failed to fetch queue status:', error);

      if (isMountedRef.current) {
        setSyncQueueCount(0);
        setSyncInProgress(false);
      }
    }
  }, []);

  // Refresh status manually
  const refreshStatus = useCallback(async () => {
    await fetchQueueStatus();
  }, [fetchQueueStatus]);

  // Set up polling for sync queue
  useEffect(() => {
    // Fetch initial queue status
    fetchQueueStatus();

    // Set up polling interval (every 10 seconds)
    pollIntervalRef.current = setInterval(() => {
      fetchQueueStatus();
    }, 10000);

    // Cleanup function
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    };
  }, [fetchQueueStatus]);

  // Fetch queue status when network state changes
  useEffect(() => {
    if (baseNetworkStatus.isConnected) {
      fetchQueueStatus();
    }
  }, [baseNetworkStatus.isConnected, fetchQueueStatus]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    // Base network status (simplified for education use)
    isOnline: baseNetworkStatus.isConnected && baseNetworkStatus.isInternetReachable !== false,
    isConnected: baseNetworkStatus.isConnected,
    connectionType: baseNetworkStatus.connectionType,

    // Education-specific
    syncQueueCount,
    syncInProgress,
    refreshStatus,
  };
}
