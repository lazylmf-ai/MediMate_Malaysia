/**
 * Offline Storage Service
 *
 * Service for downloading and caching educational content (articles and videos)
 * for offline access. Implements singleton pattern with:
 * - Local file storage using React Native FS
 * - Metadata storage using AsyncStorage
 * - 7-day TTL with automatic expiry cleanup
 * - Storage quota management (500MB limit)
 * - Download progress tracking with event emitters
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import RNFS from 'react-native-fs';
import type { CachedContent, DownloadProgress, EducationStorageStats } from '@/types/offline';
import type { EducationContent } from '@/types/education';
import {
  calculateExpiryDate,
  isExpired,
  mbToBytes,
  generateFileName,
} from '@/utils/storageUtils';

// Configuration constants
const STORAGE_KEY = '@education_offline_content';
const CACHE_DIR = `${RNFS.DocumentDirectoryPath}/education_cache`;
const MAX_STORAGE_MB = 500;
const MIN_FREE_STORAGE_MB = 50;
const TTL_DAYS = 7;

// Progress callback type
type ProgressCallback = (progress: DownloadProgress) => void;

// Error types
export class StorageQuotaExceededError extends Error {
  constructor() {
    super('STORAGE_QUOTA_EXCEEDED');
    this.name = 'StorageQuotaExceededError';
  }
}

export class DownloadFailedError extends Error {
  constructor(message?: string) {
    super(message || 'DOWNLOAD_FAILED');
    this.name = 'DownloadFailedError';
  }
}

export class ContentNotCachedError extends Error {
  constructor(contentId: string) {
    super(`CONTENT_NOT_CACHED: ${contentId}`);
    this.name = 'ContentNotCachedError';
  }
}

export class ContentExpiredError extends Error {
  constructor(contentId: string) {
    super(`CONTENT_EXPIRED: ${contentId}`);
    this.name = 'ContentExpiredError';
  }
}

export class FileNotFoundError extends Error {
  constructor(filePath: string) {
    super(`FILE_NOT_FOUND: ${filePath}`);
    this.name = 'FileNotFoundError';
  }
}

class OfflineStorageService {
  private static instance: OfflineStorageService;
  private progressCallbacks: Map<string, Set<ProgressCallback>> = new Map();
  private isInitialized = false;

  private constructor() {
    // Private constructor for singleton
  }

  /**
   * Get singleton instance
   */
  static getInstance(): OfflineStorageService {
    if (!OfflineStorageService.instance) {
      OfflineStorageService.instance = new OfflineStorageService();
    }
    return OfflineStorageService.instance;
  }

  /**
   * Initialize the offline storage service
   * Creates cache directory and cleans expired content
   */
  async initialize(): Promise<void> {
    try {
      // Create cache directory if not exists
      const dirExists = await RNFS.exists(CACHE_DIR);
      if (!dirExists) {
        await RNFS.mkdir(CACHE_DIR);
        console.log('[OfflineStorage] Cache directory created:', CACHE_DIR);
      }

      // Clean expired content
      await this.cleanExpiredContent();

      this.isInitialized = true;
      console.log('[OfflineStorage] Initialized successfully');
    } catch (error) {
      console.error('[OfflineStorage] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Download content for offline access
   * @param contentId - Content identifier
   * @param type - Content type (article or video)
   * @param url - Download URL
   * @param metadata - Content metadata
   */
  async downloadContent(
    contentId: string,
    type: 'article' | 'video',
    url: string,
    metadata: { title: Record<string, string>; size: number; duration?: number }
  ): Promise<void> {
    this.ensureInitialized();

    try {
      // Check storage quota
      const hasSpace = await this.checkStorageQuota(metadata.size);
      if (!hasSpace) {
        throw new StorageQuotaExceededError();
      }

      // Generate file path
      const fileName = generateFileName(contentId, type);
      const filePath = `${CACHE_DIR}/${fileName}`;

      // Download file with progress tracking
      const downloadResult = await RNFS.downloadFile({
        fromUrl: url,
        toFile: filePath,
        background: true,
        progressDivider: 10, // Report every 10%
        progress: (res) => {
          const progress: DownloadProgress = {
            contentId,
            progress: (res.bytesWritten / res.contentLength) * 100,
            bytesWritten: res.bytesWritten,
            totalBytes: res.contentLength,
          };
          this.emitDownloadProgress(contentId, progress);
        },
      }).promise;

      // Verify download success
      if (downloadResult.statusCode !== 200) {
        throw new DownloadFailedError(`HTTP ${downloadResult.statusCode}`);
      }

      // Get actual file size
      const fileStats = await RNFS.stat(filePath);

      // Create cached content entry
      const cachedContent: CachedContent = {
        id: contentId,
        type,
        downloadedAt: new Date().toISOString(),
        expiresAt: calculateExpiryDate(TTL_DAYS),
        filePath,
        metadata: {
          ...metadata,
          size: fileStats.size, // Use actual file size
        },
      };

      // Store metadata
      await this.addToCache(cachedContent);

      console.log('[OfflineStorage] Content downloaded:', contentId);

      // Emit completion (100%)
      this.emitDownloadProgress(contentId, {
        contentId,
        progress: 100,
        bytesWritten: fileStats.size,
        totalBytes: fileStats.size,
      });
    } catch (error) {
      console.error('[OfflineStorage] Download failed:', contentId, error);
      throw error;
    }
  }

  /**
   * Get offline content by ID
   * @param contentId - Content identifier
   * @returns Content data or file path for videos
   */
  async getOfflineContent(contentId: string): Promise<any> {
    this.ensureInitialized();

    const cache = await this.getCache();
    const cached = cache.find((c) => c.id === contentId);

    if (!cached) {
      throw new ContentNotCachedError(contentId);
    }

    // Check expiry
    if (isExpired(cached.expiresAt)) {
      await this.deleteContent(contentId);
      throw new ContentExpiredError(contentId);
    }

    // Verify file exists
    const fileExists = await RNFS.exists(cached.filePath);
    if (!fileExists) {
      await this.removeFromCache(contentId);
      throw new FileNotFoundError(cached.filePath);
    }

    // Read content based on type
    if (cached.type === 'article') {
      const content = await RNFS.readFile(cached.filePath, 'utf8');
      return JSON.parse(content);
    } else {
      // Return local file path for video player
      return { filePath: cached.filePath, metadata: cached.metadata };
    }
  }

  /**
   * Delete cached content
   * @param contentId - Content identifier
   */
  async deleteContent(contentId: string): Promise<void> {
    this.ensureInitialized();

    const cache = await this.getCache();
    const cached = cache.find((c) => c.id === contentId);

    if (!cached) {
      return; // Already deleted
    }

    // Delete file
    const fileExists = await RNFS.exists(cached.filePath);
    if (fileExists) {
      await RNFS.unlink(cached.filePath);
      console.log('[OfflineStorage] File deleted:', cached.filePath);
    }

    // Remove from cache metadata
    await this.removeFromCache(contentId);

    console.log('[OfflineStorage] Content deleted:', contentId);
  }

  /**
   * Check if content is cached
   * @param contentId - Content identifier
   * @returns True if content is cached and not expired
   */
  async isContentCached(contentId: string): Promise<boolean> {
    this.ensureInitialized();

    const cache = await this.getCache();
    const cached = cache.find((c) => c.id === contentId);

    if (!cached) {
      return false;
    }

    // Check expiry
    if (isExpired(cached.expiresAt)) {
      await this.deleteContent(contentId);
      return false;
    }

    // Verify file exists
    const fileExists = await RNFS.exists(cached.filePath);
    if (!fileExists) {
      await this.removeFromCache(contentId);
      return false;
    }

    return true;
  }

  /**
   * Get storage statistics
   * @returns Storage usage information
   */
  async getStorageStats(): Promise<EducationStorageStats> {
    this.ensureInitialized();

    const cache = await this.getCache();
    let usedBytes = 0;

    // Calculate total used space
    for (const item of cache) {
      try {
        const fileExists = await RNFS.exists(item.filePath);
        if (fileExists) {
          const stat = await RNFS.stat(item.filePath);
          usedBytes += stat.size;
        }
      } catch (error) {
        console.error('[OfflineStorage] Failed to stat file:', item.filePath, error);
      }
    }

    const totalBytes = mbToBytes(MAX_STORAGE_MB);

    return {
      used: usedBytes,
      available: totalBytes - usedBytes,
      total: totalBytes,
    };
  }

  /**
   * Get all cached content entries
   * @returns Array of cached content metadata
   */
  async getAllCachedContent(): Promise<CachedContent[]> {
    this.ensureInitialized();
    return this.getCache();
  }

  /**
   * Subscribe to download progress for a specific content
   * @param contentId - Content identifier
   * @param callback - Progress callback function
   * @returns Unsubscribe function
   */
  onDownloadProgress(contentId: string, callback: ProgressCallback): () => void {
    if (!this.progressCallbacks.has(contentId)) {
      this.progressCallbacks.set(contentId, new Set());
    }
    this.progressCallbacks.get(contentId)!.add(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.progressCallbacks.get(contentId);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.progressCallbacks.delete(contentId);
        }
      }
    };
  }

  /**
   * Clear all cached content
   */
  async clearAllCache(): Promise<void> {
    this.ensureInitialized();

    const cache = await this.getCache();

    // Delete all files
    for (const item of cache) {
      try {
        const fileExists = await RNFS.exists(item.filePath);
        if (fileExists) {
          await RNFS.unlink(item.filePath);
        }
      } catch (error) {
        console.error('[OfflineStorage] Failed to delete file:', item.filePath, error);
      }
    }

    // Clear cache metadata
    await AsyncStorage.removeItem(STORAGE_KEY);

    console.log('[OfflineStorage] All cache cleared');
  }

  // Private helper methods

  /**
   * Ensure service is initialized
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new Error('OfflineStorageService not initialized. Call initialize() first.');
    }
  }

  /**
   * Get cache metadata from AsyncStorage
   */
  private async getCache(): Promise<CachedContent[]> {
    try {
      const json = await AsyncStorage.getItem(STORAGE_KEY);
      return json ? JSON.parse(json) : [];
    } catch (error) {
      console.error('[OfflineStorage] Failed to get cache:', error);
      return [];
    }
  }

  /**
   * Save cache metadata to AsyncStorage
   */
  private async saveCache(cache: CachedContent[]): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.error('[OfflineStorage] Failed to save cache:', error);
      throw error;
    }
  }

  /**
   * Add content to cache metadata
   */
  private async addToCache(content: CachedContent): Promise<void> {
    const cache = await this.getCache();

    // Remove existing entry if present
    const filtered = cache.filter((c) => c.id !== content.id);

    // Add new entry
    filtered.push(content);

    await this.saveCache(filtered);
  }

  /**
   * Remove content from cache metadata
   */
  private async removeFromCache(contentId: string): Promise<void> {
    const cache = await this.getCache();
    const filtered = cache.filter((c) => c.id !== contentId);
    await this.saveCache(filtered);
  }

  /**
   * Clean expired content from cache
   */
  private async cleanExpiredContent(): Promise<void> {
    const cache = await this.getCache();
    const now = new Date();

    const expiredIds: string[] = [];

    for (const item of cache) {
      if (new Date(item.expiresAt) < now) {
        expiredIds.push(item.id);
      }
    }

    if (expiredIds.length > 0) {
      console.log('[OfflineStorage] Cleaning expired content:', expiredIds.length);

      for (const id of expiredIds) {
        try {
          await this.deleteContent(id);
        } catch (error) {
          console.error('[OfflineStorage] Failed to delete expired content:', id, error);
        }
      }
    }
  }

  /**
   * Check if storage quota allows download
   * @param requiredBytes - Bytes needed for download
   */
  private async checkStorageQuota(requiredBytes: number): Promise<boolean> {
    const stats = await this.getStorageStats();

    // Check if enough space available (required + min free)
    const minFreeBytes = mbToBytes(MIN_FREE_STORAGE_MB);
    return stats.available >= requiredBytes + minFreeBytes;
  }

  /**
   * Emit download progress to subscribers
   */
  private emitDownloadProgress(contentId: string, progress: DownloadProgress): void {
    const callbacks = this.progressCallbacks.get(contentId);
    if (callbacks) {
      callbacks.forEach((callback) => {
        try {
          callback(progress);
        } catch (error) {
          console.error('[OfflineStorage] Progress callback error:', error);
        }
      });
    }
  }
}

// Export singleton instance
export const offlineStorageService = OfflineStorageService.getInstance();
