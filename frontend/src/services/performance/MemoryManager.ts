/**
 * Memory Manager Service
 *
 * Comprehensive memory management with leak detection, cache optimization,
 * and automatic cleanup to maintain <150MB peak memory usage.
 *
 * Features:
 * - Memory leak detection and prevention
 * - LRU cache management
 * - Automatic garbage collection triggering
 * - Memory pressure monitoring
 * - Resource pooling
 * - Memory profiling and analysis
 */

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface MemorySnapshot {
  timestamp: number;
  heapUsed: number; // MB
  heapTotal: number; // MB
  external: number; // MB
  rss?: number; // MB (Resident Set Size)
  percentage: number;
  components: Map<string, number>; // Component memory usage
}

export interface MemoryLeak {
  detected: Date;
  component: string;
  growth: number; // MB
  severity: 'low' | 'medium' | 'high' | 'critical';
  snapshots: MemorySnapshot[];
  recommendations: string[];
}

export interface CacheEntry<T = any> {
  key: string;
  data: T;
  size: number; // bytes
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
  ttl?: number; // milliseconds
}

export interface CacheStats {
  totalSize: number; // bytes
  entryCount: number;
  hitRate: number; // percentage
  evictions: number;
  oldestEntry: number; // timestamp
  newestEntry: number; // timestamp
}

export interface MemoryPressure {
  level: 'normal' | 'moderate' | 'high' | 'critical';
  percentage: number;
  trend: 'stable' | 'increasing' | 'decreasing';
  actionRequired: boolean;
  recommendedActions: string[];
}

class MemoryManager {
  private static instance: MemoryManager;
  private isMonitoring = false;

  // Memory tracking
  private snapshots: MemorySnapshot[] = [];
  private detectedLeaks: MemoryLeak[] = [];
  private componentMemory: Map<string, number[]> = new Map();

  // Cache management
  private cache: Map<string, CacheEntry> = new Map();
  private cacheHits = 0;
  private cacheMisses = 0;
  private cacheEvictions = 0;

  // Configuration
  private readonly MAX_MEMORY = 150; // MB
  private readonly MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50MB
  private readonly LEAK_THRESHOLD = 10; // MB growth
  private readonly SNAPSHOT_INTERVAL = 30000; // 30 seconds
  private readonly LEAK_CHECK_INTERVAL = 60000; // 1 minute

  // Monitoring intervals
  private snapshotInterval?: NodeJS.Timeout;
  private leakCheckInterval?: NodeJS.Timeout;
  private pressureCheckInterval?: NodeJS.Timeout;

  // Object pools
  private objectPools: Map<string, any[]> = new Map();

  // Storage keys
  private readonly STORAGE_KEYS = {
    SNAPSHOTS: 'memory_snapshots',
    LEAKS: 'memory_leaks',
    CACHE_STATS: 'cache_stats',
  };

  private constructor() {
    // Initialize
  }

  static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager();
    }
    return MemoryManager.instance;
  }

  /**
   * Start memory monitoring
   */
  async startMonitoring(): Promise<void> {
    if (this.isMonitoring) {
      return;
    }

    console.log('[MemoryManager] Starting memory monitoring...');

    try {
      // Load historical data
      await this.loadData();

      // Start snapshot collection
      this.snapshotInterval = setInterval(() => {
        this.captureSnapshot();
      }, this.SNAPSHOT_INTERVAL);

      // Start leak detection
      this.leakCheckInterval = setInterval(() => {
        this.checkForLeaks();
      }, this.LEAK_CHECK_INTERVAL);

      // Start pressure monitoring
      this.pressureCheckInterval = setInterval(() => {
        this.checkMemoryPressure();
      }, 15000); // Every 15 seconds

      // Initial snapshot
      this.captureSnapshot();

      this.isMonitoring = true;
      console.log('[MemoryManager] Memory monitoring started');

    } catch (error) {
      console.error('[MemoryManager] Failed to start monitoring:', error);
      throw error;
    }
  }

  /**
   * Stop memory monitoring
   */
  async stopMonitoring(): Promise<void> {
    if (!this.isMonitoring) {
      return;
    }

    console.log('[MemoryManager] Stopping memory monitoring...');

    // Clear intervals
    if (this.snapshotInterval) clearInterval(this.snapshotInterval);
    if (this.leakCheckInterval) clearInterval(this.leakCheckInterval);
    if (this.pressureCheckInterval) clearInterval(this.pressureCheckInterval);

    // Save data
    await this.saveData();

    this.isMonitoring = false;
    console.log('[MemoryManager] Memory monitoring stopped');
  }

  /**
   * Capture memory snapshot
   */
  private async captureSnapshot(): Promise<void> {
    try {
      const memory = this.getMemoryUsage();

      const snapshot: MemorySnapshot = {
        timestamp: Date.now(),
        heapUsed: memory.heapUsed,
        heapTotal: memory.heapTotal,
        external: memory.external || 0,
        rss: memory.rss,
        percentage: (memory.heapUsed / this.MAX_MEMORY) * 100,
        components: new Map(this.componentMemory)
      };

      this.snapshots.push(snapshot);

      // Keep only last 100 snapshots
      if (this.snapshots.length > 100) {
        this.snapshots = this.snapshots.slice(-100);
      }

      // Log if memory usage is high
      if (snapshot.percentage > 80) {
        console.warn(`[MemoryManager] High memory usage: ${snapshot.heapUsed.toFixed(1)}MB (${snapshot.percentage.toFixed(1)}%)`);
      }

    } catch (error) {
      console.error('[MemoryManager] Failed to capture snapshot:', error);
    }
  }

  /**
   * Get current memory usage
   */
  private getMemoryUsage(): {
    heapUsed: number;
    heapTotal: number;
    external?: number;
    rss?: number;
  } {
    // In React Native, we'd use native modules
    // For now, use estimates or web API
    if (Platform.OS === 'web' && (performance as any).memory) {
      const memory = (performance as any).memory;
      return {
        heapUsed: memory.usedJSHeapSize / (1024 * 1024),
        heapTotal: memory.totalJSHeapSize / (1024 * 1024),
        external: 0,
      };
    }

    // Estimate for native platforms
    return {
      heapUsed: 80, // Estimate
      heapTotal: 150, // Estimate
      external: 10,
    };
  }

  /**
   * Check for memory leaks
   */
  private async checkForLeaks(): Promise<void> {
    if (this.snapshots.length < 10) {
      return; // Need more data
    }

    const recentSnapshots = this.snapshots.slice(-10);

    // Check overall memory growth
    const oldest = recentSnapshots[0];
    const newest = recentSnapshots[recentSnapshots.length - 1];
    const growth = newest.heapUsed - oldest.heapUsed;

    if (growth > this.LEAK_THRESHOLD) {
      // Potential leak detected
      const leak: MemoryLeak = {
        detected: new Date(),
        component: 'overall',
        growth,
        severity: this.determineSeverity(growth),
        snapshots: recentSnapshots,
        recommendations: this.generateLeakRecommendations(growth, 'overall')
      };

      this.detectedLeaks.push(leak);
      console.error('[MemoryManager] Memory leak detected:', leak);
    }

    // Check component-specific growth
    this.componentMemory.forEach((history, component) => {
      if (history.length < 10) return;

      const recentHistory = history.slice(-10);
      const componentGrowth = recentHistory[recentHistory.length - 1] - recentHistory[0];

      if (componentGrowth > 5) { // 5MB threshold for components
        const leak: MemoryLeak = {
          detected: new Date(),
          component,
          growth: componentGrowth,
          severity: this.determineSeverity(componentGrowth),
          snapshots: recentSnapshots,
          recommendations: this.generateLeakRecommendations(componentGrowth, component)
        };

        this.detectedLeaks.push(leak);
        console.error(`[MemoryManager] Memory leak in component '${component}':`, leak);
      }
    });

    // Limit stored leaks
    if (this.detectedLeaks.length > 50) {
      this.detectedLeaks = this.detectedLeaks.slice(-50);
    }
  }

  /**
   * Determine leak severity
   */
  private determineSeverity(growth: number): MemoryLeak['severity'] {
    if (growth > 30) return 'critical';
    if (growth > 20) return 'high';
    if (growth > 10) return 'medium';
    return 'low';
  }

  /**
   * Generate leak recommendations
   */
  private generateLeakRecommendations(growth: number, component: string): string[] {
    const recommendations: string[] = [];

    recommendations.push(`Memory grew by ${growth.toFixed(1)}MB in component '${component}'`);
    recommendations.push('Check for unremoved event listeners');
    recommendations.push('Verify all timers and intervals are cleared');
    recommendations.push('Review component cleanup in useEffect hooks');
    recommendations.push('Check for circular references in closures');

    if (growth > 20) {
      recommendations.push('Consider implementing object pooling');
      recommendations.push('Review image caching and cleanup strategies');
    }

    return recommendations;
  }

  /**
   * Check memory pressure and take action
   */
  private async checkMemoryPressure(): Promise<void> {
    const pressure = this.getMemoryPressure();

    if (pressure.actionRequired) {
      console.warn('[MemoryManager] Memory pressure detected:', pressure);

      // Take automatic actions based on pressure level
      switch (pressure.level) {
        case 'high':
          await this.reduceCacheSize(0.3); // Reduce by 30%
          this.triggerGarbageCollection();
          break;

        case 'critical':
          await this.clearCache();
          this.triggerGarbageCollection();
          console.error('[MemoryManager] Critical memory pressure - cache cleared');
          break;
      }
    }
  }

  /**
   * Get current memory pressure
   */
  getMemoryPressure(): MemoryPressure {
    const current = this.getMemoryUsage();
    const percentage = (current.heapUsed / this.MAX_MEMORY) * 100;

    // Determine trend
    const recent = this.snapshots.slice(-5);
    let trend: MemoryPressure['trend'] = 'stable';

    if (recent.length >= 5) {
      const avgRecent = recent.slice(-3).reduce((sum, s) => sum + s.heapUsed, 0) / 3;
      const avgOlder = recent.slice(0, 2).reduce((sum, s) => sum + s.heapUsed, 0) / 2;

      if (avgRecent > avgOlder + 5) trend = 'increasing';
      else if (avgRecent < avgOlder - 5) trend = 'decreasing';
    }

    // Determine level and actions
    let level: MemoryPressure['level'];
    let actionRequired = false;
    const recommendedActions: string[] = [];

    if (percentage >= 90) {
      level = 'critical';
      actionRequired = true;
      recommendedActions.push('Clear all non-essential caches');
      recommendedActions.push('Force garbage collection');
      recommendedActions.push('Review active components for memory leaks');
    } else if (percentage >= 75) {
      level = 'high';
      actionRequired = true;
      recommendedActions.push('Reduce cache size');
      recommendedActions.push('Trigger garbage collection');
    } else if (percentage >= 60) {
      level = 'moderate';
      recommendedActions.push('Monitor memory usage closely');
      recommendedActions.push('Consider cache cleanup');
    } else {
      level = 'normal';
    }

    return {
      level,
      percentage,
      trend,
      actionRequired,
      recommendedActions
    };
  }

  /**
   * Track component memory usage
   */
  trackComponentMemory(componentName: string, memoryUsage: number): void {
    if (!this.componentMemory.has(componentName)) {
      this.componentMemory.set(componentName, []);
    }

    const history = this.componentMemory.get(componentName)!;
    history.push(memoryUsage);

    // Keep only last 20 measurements
    if (history.length > 20) {
      this.componentMemory.set(componentName, history.slice(-20));
    }
  }

  /**
   * Cache Management Methods
   */

  /**
   * Set cache entry
   */
  setCache<T>(key: string, data: T, ttl?: number): void {
    // Check if adding this would exceed cache size
    const dataSize = this.estimateSize(data);

    if (this.getCacheSize() + dataSize > this.MAX_CACHE_SIZE) {
      // Evict least recently used entries
      this.evictLRU(dataSize);
    }

    const entry: CacheEntry<T> = {
      key,
      data,
      size: dataSize,
      timestamp: Date.now(),
      accessCount: 0,
      lastAccessed: Date.now(),
      ttl
    };

    this.cache.set(key, entry);
  }

  /**
   * Get cache entry
   */
  getCache<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      this.cacheMisses++;
      return null;
    }

    // Check TTL
    if (entry.ttl && Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      this.cacheMisses++;
      return null;
    }

    // Update access info
    entry.accessCount++;
    entry.lastAccessed = Date.now();

    this.cacheHits++;
    return entry.data as T;
  }

  /**
   * Remove cache entry
   */
  removeCache(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear cache
   */
  async clearCache(): Promise<void> {
    const size = this.getCacheSize();
    this.cache.clear();
    console.log(`[MemoryManager] Cache cleared: ${(size / (1024 * 1024)).toFixed(1)}MB freed`);
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): CacheStats {
    const entries = Array.from(this.cache.values());
    const totalSize = entries.reduce((sum, e) => sum + e.size, 0);

    const timestamps = entries.map(e => e.timestamp);
    const oldest = timestamps.length > 0 ? Math.min(...timestamps) : 0;
    const newest = timestamps.length > 0 ? Math.max(...timestamps) : 0;

    const totalRequests = this.cacheHits + this.cacheMisses;
    const hitRate = totalRequests > 0 ? (this.cacheHits / totalRequests) * 100 : 0;

    return {
      totalSize,
      entryCount: this.cache.size,
      hitRate,
      evictions: this.cacheEvictions,
      oldestEntry: oldest,
      newestEntry: newest
    };
  }

  /**
   * Evict least recently used entries
   */
  private evictLRU(spaceNeeded: number): void {
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);

    let freedSpace = 0;

    for (const [key, entry] of entries) {
      if (freedSpace >= spaceNeeded) break;

      this.cache.delete(key);
      freedSpace += entry.size;
      this.cacheEvictions++;
    }

    console.log(`[MemoryManager] Evicted ${this.cacheEvictions} cache entries, freed ${(freedSpace / 1024).toFixed(1)}KB`);
  }

  /**
   * Reduce cache size by percentage
   */
  private async reduceCacheSize(percentage: number): Promise<void> {
    const targetSize = this.getCacheSize() * (1 - percentage);
    const spaceToFree = this.getCacheSize() - targetSize;

    this.evictLRU(spaceToFree);
  }

  /**
   * Get current cache size
   */
  private getCacheSize(): number {
    return Array.from(this.cache.values()).reduce((sum, e) => sum + e.size, 0);
  }

  /**
   * Estimate object size in bytes
   */
  private estimateSize(obj: any): number {
    const str = JSON.stringify(obj);
    return new Blob([str]).size;
  }

  /**
   * Trigger garbage collection (if available)
   */
  private triggerGarbageCollection(): void {
    // In production environments, we can't force GC
    // This would be implemented via native modules
    if (global.gc) {
      global.gc();
      console.log('[MemoryManager] Garbage collection triggered');
    } else {
      console.log('[MemoryManager] Garbage collection not available');
    }
  }

  /**
   * Object Pool Methods
   */

  /**
   * Get object from pool or create new
   */
  getFromPool<T>(poolName: string, factory: () => T): T {
    if (!this.objectPools.has(poolName)) {
      this.objectPools.set(poolName, []);
    }

    const pool = this.objectPools.get(poolName)!;

    if (pool.length > 0) {
      return pool.pop() as T;
    }

    return factory();
  }

  /**
   * Return object to pool
   */
  returnToPool(poolName: string, obj: any): void {
    if (!this.objectPools.has(poolName)) {
      this.objectPools.set(poolName, []);
    }

    const pool = this.objectPools.get(poolName)!;

    // Limit pool size
    if (pool.length < 100) {
      pool.push(obj);
    }
  }

  /**
   * Clear object pool
   */
  clearPool(poolName: string): void {
    if (this.objectPools.has(poolName)) {
      this.objectPools.get(poolName)!.length = 0;
    }
  }

  /**
   * Get memory snapshots
   */
  getSnapshots(count?: number): MemorySnapshot[] {
    if (count) {
      return this.snapshots.slice(-count);
    }
    return [...this.snapshots];
  }

  /**
   * Get detected leaks
   */
  getDetectedLeaks(): MemoryLeak[] {
    return [...this.detectedLeaks];
  }

  /**
   * Get current memory summary
   */
  getMemorySummary(): {
    current: MemorySnapshot;
    pressure: MemoryPressure;
    leaks: number;
    cacheStats: CacheStats;
  } {
    const latest = this.snapshots[this.snapshots.length - 1] || {
      timestamp: Date.now(),
      heapUsed: 0,
      heapTotal: 0,
      external: 0,
      percentage: 0,
      components: new Map()
    };

    return {
      current: latest,
      pressure: this.getMemoryPressure(),
      leaks: this.detectedLeaks.length,
      cacheStats: this.getCacheStats()
    };
  }

  /**
   * Storage methods
   */
  private async saveData(): Promise<void> {
    try {
      // Save only essential data
      const recentSnapshots = this.snapshots.slice(-50);
      const recentLeaks = this.detectedLeaks.slice(-20);
      const cacheStats = this.getCacheStats();

      await Promise.all([
        AsyncStorage.setItem(this.STORAGE_KEYS.SNAPSHOTS, JSON.stringify(recentSnapshots)),
        AsyncStorage.setItem(this.STORAGE_KEYS.LEAKS, JSON.stringify(recentLeaks)),
        AsyncStorage.setItem(this.STORAGE_KEYS.CACHE_STATS, JSON.stringify(cacheStats))
      ]);

    } catch (error) {
      console.error('[MemoryManager] Failed to save data:', error);
    }
  }

  private async loadData(): Promise<void> {
    try {
      const [snapshotsStr, leaksStr] = await Promise.all([
        AsyncStorage.getItem(this.STORAGE_KEYS.SNAPSHOTS),
        AsyncStorage.getItem(this.STORAGE_KEYS.LEAKS)
      ]);

      if (snapshotsStr) {
        this.snapshots = JSON.parse(snapshotsStr);
      }
      if (leaksStr) {
        this.detectedLeaks = JSON.parse(leaksStr);
      }

    } catch (error) {
      console.error('[MemoryManager] Failed to load data:', error);
    }
  }

  /**
   * Check if monitoring is active
   */
  isActive(): boolean {
    return this.isMonitoring;
  }
}

export default MemoryManager;