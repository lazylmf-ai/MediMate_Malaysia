/**
 * Cache Service for Offline Medication Database
 * 
 * Provides intelligent caching with:
 * - Multi-tier caching (memory + storage)
 * - TTL-based expiration
 * - Automatic cleanup
 * - Cultural data prioritization
 * - 7-day offline capability
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
  accessed: number; // Last accessed timestamp
  priority: 'high' | 'medium' | 'low';
}

export interface CacheStats {
  totalEntries: number;
  memoryEntries: number;
  storageEntries: number;
  totalSize: number; // Estimated size in bytes
  hitRate: number;
  missRate: number;
  lastCleanup: number;
}

class CacheService {
  private memoryCache = new Map<string, CacheEntry>();
  private readonly MEMORY_CACHE_LIMIT = 100; // Max entries in memory
  private readonly STORAGE_PREFIX = 'medimate_cache_';
  private readonly STATS_KEY = 'cache_stats';
  
  // Statistics tracking
  private stats = {
    hits: 0,
    misses: 0,
    lastCleanup: Date.now(),
  };

  /**
   * Get cached data with automatic memory/storage fallback
   */
  async get<T = any>(key: string): Promise<T | null> {
    try {
      // Check memory cache first (fastest)
      const memoryEntry = this.memoryCache.get(key);
      if (memoryEntry && this.isEntryValid(memoryEntry)) {
        memoryEntry.accessed = Date.now();
        this.stats.hits++;
        return memoryEntry.data as T;
      }

      // Check persistent storage
      const storageKey = this.getStorageKey(key);
      const storageData = await AsyncStorage.getItem(storageKey);
      
      if (storageData) {
        const entry: CacheEntry = JSON.parse(storageData);
        
        if (this.isEntryValid(entry)) {
          // Update access time and promote to memory if high priority
          entry.accessed = Date.now();
          
          if (entry.priority === 'high' || entry.priority === 'medium') {
            this.promoteToMemory(key, entry);
          }
          
          // Update storage with new access time
          await AsyncStorage.setItem(storageKey, JSON.stringify(entry));
          
          this.stats.hits++;
          return entry.data as T;
        } else {
          // Entry expired, remove it
          await AsyncStorage.removeItem(storageKey);
        }
      }

      this.stats.misses++;
      return null;
    } catch (error) {
      console.error('Cache get error:', error);
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Set cached data with intelligent storage tier selection
   */
  async set<T = any>(
    key: string, 
    data: T, 
    ttl: number = 1000 * 60 * 60, // 1 hour default
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): Promise<void> {
    try {
      const entry: CacheEntry<T> = {
        data,
        timestamp: Date.now(),
        ttl,
        accessed: Date.now(),
        priority,
      };

      // Always store in persistent storage
      const storageKey = this.getStorageKey(key);
      await AsyncStorage.setItem(storageKey, JSON.stringify(entry));

      // Store in memory based on priority and availability
      if (priority === 'high' || this.memoryCache.size < this.MEMORY_CACHE_LIMIT) {
        this.memoryCache.set(key, entry);
      } else if (priority === 'medium' && this.memoryCache.size >= this.MEMORY_CACHE_LIMIT) {
        // Remove least recently used low priority item
        this.evictFromMemory();
        this.memoryCache.set(key, entry);
      }

      // Periodic cleanup
      if (Date.now() - this.stats.lastCleanup > 1000 * 60 * 60) { // Every hour
        await this.cleanup();
      }
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  /**
   * Remove specific cache entry
   */
  async remove(key: string): Promise<void> {
    try {
      // Remove from memory
      this.memoryCache.delete(key);

      // Remove from storage
      const storageKey = this.getStorageKey(key);
      await AsyncStorage.removeItem(storageKey);
    } catch (error) {
      console.error('Cache remove error:', error);
    }
  }

  /**
   * Clear all cache data
   */
  async clear(): Promise<void> {
    try {
      // Clear memory cache
      this.memoryCache.clear();

      // Clear storage cache
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(key => key.startsWith(this.STORAGE_PREFIX));
      await AsyncStorage.multiRemove(cacheKeys);

      // Reset stats
      this.stats = {
        hits: 0,
        misses: 0,
        lastCleanup: Date.now(),
      };
    } catch (error) {
      console.error('Cache clear error:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    try {
      const storageKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = storageKeys.filter(key => key.startsWith(this.STORAGE_PREFIX));
      
      // Estimate storage size (rough calculation)
      let totalSize = 0;
      for (const key of this.memoryCache.keys()) {
        const entry = this.memoryCache.get(key);
        if (entry) {
          totalSize += JSON.stringify(entry.data).length * 2; // Rough estimate
        }
      }

      const hitRate = this.stats.hits + this.stats.misses > 0 
        ? (this.stats.hits / (this.stats.hits + this.stats.misses)) * 100 
        : 0;

      return {
        totalEntries: this.memoryCache.size + cacheKeys.length,
        memoryEntries: this.memoryCache.size,
        storageEntries: cacheKeys.length,
        totalSize,
        hitRate: Math.round(hitRate * 100) / 100,
        missRate: Math.round((100 - hitRate) * 100) / 100,
        lastCleanup: this.stats.lastCleanup,
      };
    } catch (error) {
      console.error('Get cache stats error:', error);
      return {
        totalEntries: 0,
        memoryEntries: 0,
        storageEntries: 0,
        totalSize: 0,
        hitRate: 0,
        missRate: 0,
        lastCleanup: this.stats.lastCleanup,
      };
    }
  }

  /**
   * Cleanup expired entries
   */
  async cleanup(): Promise<void> {
    try {
      const now = Date.now();

      // Cleanup memory cache
      for (const [key, entry] of this.memoryCache.entries()) {
        if (!this.isEntryValid(entry)) {
          this.memoryCache.delete(key);
        }
      }

      // Cleanup storage cache
      const storageKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = storageKeys.filter(key => key.startsWith(this.STORAGE_PREFIX));
      
      for (const storageKey of cacheKeys) {
        try {
          const data = await AsyncStorage.getItem(storageKey);
          if (data) {
            const entry: CacheEntry = JSON.parse(data);
            if (!this.isEntryValid(entry)) {
              await AsyncStorage.removeItem(storageKey);
            }
          }
        } catch (error) {
          // Invalid entry, remove it
          await AsyncStorage.removeItem(storageKey);
        }
      }

      this.stats.lastCleanup = now;
    } catch (error) {
      console.error('Cache cleanup error:', error);
    }
  }

  /**
   * Preload critical data into cache
   */
  async preloadCriticalData(
    dataLoader: () => Promise<Record<string, any>>,
    ttl: number = 7 * 24 * 60 * 60 * 1000 // 7 days
  ): Promise<void> {
    try {
      const criticalData = await dataLoader();
      
      for (const [key, data] of Object.entries(criticalData)) {
        await this.set(key, data, ttl, 'high');
      }
    } catch (error) {
      console.error('Preload critical data error:', error);
    }
  }

  /**
   * Check if cache has valid data for a key
   */
  async has(key: string): Promise<boolean> {
    const data = await this.get(key);
    return data !== null;
  }

  /**
   * Get multiple cache entries
   */
  async getMultiple<T = any>(keys: string[]): Promise<Record<string, T | null>> {
    const result: Record<string, T | null> = {};
    
    for (const key of keys) {
      result[key] = await this.get<T>(key);
    }
    
    return result;
  }

  /**
   * Set multiple cache entries
   */
  async setMultiple<T = any>(
    entries: Record<string, T>,
    ttl: number = 1000 * 60 * 60,
    priority: 'high' | 'medium' | 'low' = 'medium'
  ): Promise<void> {
    const promises = Object.entries(entries).map(([key, data]) =>
      this.set(key, data, ttl, priority)
    );
    
    await Promise.all(promises);
  }

  /**
   * Private helper methods
   */

  private getStorageKey(key: string): string {
    return `${this.STORAGE_PREFIX}${key}`;
  }

  private isEntryValid(entry: CacheEntry): boolean {
    const now = Date.now();
    return (now - entry.timestamp) < entry.ttl;
  }

  private promoteToMemory(key: string, entry: CacheEntry): void {
    if (this.memoryCache.size >= this.MEMORY_CACHE_LIMIT) {
      this.evictFromMemory();
    }
    this.memoryCache.set(key, entry);
  }

  private evictFromMemory(): void {
    let oldestKey = '';
    let oldestTime = Date.now();
    let lowestPriority = 'high';

    // Find least recently used item with lowest priority
    for (const [key, entry] of this.memoryCache.entries()) {
      if (
        (entry.priority === 'low' && lowestPriority !== 'low') ||
        (entry.priority === lowestPriority && entry.accessed < oldestTime)
      ) {
        oldestKey = key;
        oldestTime = entry.accessed;
        lowestPriority = entry.priority;
      }
    }

    if (oldestKey) {
      this.memoryCache.delete(oldestKey);
    }
  }
}

export const cacheService = new CacheService();