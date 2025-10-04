/**
 * useOfflineContent Hook
 *
 * Custom React hook for managing offline content state for a specific content item.
 * Provides download, delete, and offline content retrieval functionality with
 * real-time progress tracking and cached status monitoring.
 *
 * Features:
 * - Check if content is cached on mount
 * - Subscribe to download progress events
 * - Handle download/delete operations
 * - Manage loading states and errors
 * - Auto-refresh cached status
 * - Cleanup subscriptions on unmount
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { offlineStorageService } from '@/services/offlineStorageService';
import type { DownloadProgress } from '@/types/offline';

interface UseOfflineContentResult {
  isDownloaded: boolean;
  isDownloading: boolean;
  downloadProgress: number;
  downloadContent: () => Promise<void>;
  deleteContent: () => Promise<void>;
  getOfflineContent: () => Promise<any>;
  error: string | null;
}

/**
 * Hook for managing offline content state
 *
 * @param contentId - Content identifier
 * @param contentType - Content type (article or video)
 * @param downloadUrl - Optional download URL (required for downloading)
 * @param metadata - Optional content metadata (required for downloading)
 * @returns Offline content state and operations
 */
export function useOfflineContent(
  contentId: string,
  contentType: 'article' | 'video',
  downloadUrl?: string,
  metadata?: {
    title: Record<string, string>;
    size: number;
    duration?: number;
  }
): UseOfflineContentResult {
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Use ref to track if component is mounted
  const isMountedRef = useRef(true);

  // Check if content is cached
  const checkCachedStatus = useCallback(async () => {
    try {
      const cached = await offlineStorageService.isContentCached(contentId);
      if (isMountedRef.current) {
        setIsDownloaded(cached);
      }
    } catch (err) {
      console.error('[useOfflineContent] Failed to check cached status:', err);
      if (isMountedRef.current) {
        setIsDownloaded(false);
      }
    }
  }, [contentId]);

  // Check cached status on mount and when contentId changes
  useEffect(() => {
    checkCachedStatus();
  }, [checkCachedStatus]);

  // Download content
  const downloadContent = useCallback(async () => {
    if (!downloadUrl || !metadata) {
      const errorMsg = 'Download URL and metadata are required to download content';
      setError(errorMsg);
      throw new Error(errorMsg);
    }

    if (isDownloading) {
      console.log('[useOfflineContent] Download already in progress');
      return;
    }

    setIsDownloading(true);
    setDownloadProgress(0);
    setError(null);

    // Subscribe to download progress
    const unsubscribe = offlineStorageService.onDownloadProgress(
      contentId,
      (progress: DownloadProgress) => {
        if (isMountedRef.current) {
          setDownloadProgress(Math.round(progress.progress));
        }
      }
    );

    try {
      await offlineStorageService.downloadContent(
        contentId,
        contentType,
        downloadUrl,
        metadata
      );

      if (isMountedRef.current) {
        setIsDownloaded(true);
        setDownloadProgress(100);
        setError(null);
      }

      console.log('[useOfflineContent] Download completed:', contentId);
    } catch (err: any) {
      console.error('[useOfflineContent] Download failed:', err);

      if (isMountedRef.current) {
        const errorMessage = err.message || 'Failed to download content';
        setError(errorMessage);
        setDownloadProgress(0);
      }

      throw err;
    } finally {
      if (isMountedRef.current) {
        setIsDownloading(false);
      }
      unsubscribe();
    }
  }, [contentId, contentType, downloadUrl, metadata, isDownloading]);

  // Delete content
  const deleteContent = useCallback(async () => {
    setError(null);

    try {
      await offlineStorageService.deleteContent(contentId);

      if (isMountedRef.current) {
        setIsDownloaded(false);
        setDownloadProgress(0);
        setError(null);
      }

      console.log('[useOfflineContent] Content deleted:', contentId);
    } catch (err: any) {
      console.error('[useOfflineContent] Delete failed:', err);

      if (isMountedRef.current) {
        const errorMessage = err.message || 'Failed to delete content';
        setError(errorMessage);
      }

      throw err;
    }
  }, [contentId]);

  // Get offline content
  const getOfflineContent = useCallback(async () => {
    setError(null);

    try {
      const content = await offlineStorageService.getOfflineContent(contentId);
      return content;
    } catch (err: any) {
      console.error('[useOfflineContent] Failed to get offline content:', err);

      if (isMountedRef.current) {
        const errorMessage = err.message || 'Failed to get offline content';
        setError(errorMessage);
      }

      throw err;
    }
  }, [contentId]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  return {
    isDownloaded,
    isDownloading,
    downloadProgress,
    downloadContent,
    deleteContent,
    getOfflineContent,
    error,
  };
}
