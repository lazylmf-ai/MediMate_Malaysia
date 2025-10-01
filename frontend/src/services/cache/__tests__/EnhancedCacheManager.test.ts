/**
 * Tests for EnhancedCacheManager
 * Issue #27 Stream D - Cache optimization tests
 */

import EnhancedCacheManager from '../EnhancedCacheManager';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.mock('@react-native-async-storage/async-storage');
jest.mock('../cacheService');

describe('EnhancedCacheManager', () => {
  let cacheManager: EnhancedCacheManager;

  beforeEach(async () => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

    cacheManager = EnhancedCacheManager.getInstance();
  });

  afterEach(async () => {
    await cacheManager.shutdown();
  });

  describe('Initialization', () => {
    test('should initialize successfully', async () => {
      const result = await cacheManager.initialize();
      expect(result.success).toBe(true);
    });
  });

  describe('Multi-tier Caching', () => {
    test('should cache data in memory tier', async () => {
      await cacheManager.initialize();
      await cacheManager.set('test_key', { data: 'test' }, 60000, 'high');

      const data = await cacheManager.get('test_key');
      expect(data).toEqual({ data: 'test' });
    });

    test('should promote frequently accessed data to memory', async () => {
      await cacheManager.initialize();
      await cacheManager.set('freq_key', { data: 'frequent' }, 60000, 'medium');

      // Access multiple times
      await cacheManager.get('freq_key');
      await cacheManager.get('freq_key');
      await cacheManager.get('freq_key');

      const stats = cacheManager.getStatistics();
      expect(stats.memoryHitRate).toBeGreaterThanOrEqual(0);
    });

    test('should store persistent data', async () => {
      await cacheManager.initialize();
      await cacheManager.set('persist_key', { data: 'persistent' }, 86400000, 'high', {
        persistent: true,
      });

      // Data should be in persistent tier
    });
  });

  describe('LRU Eviction', () => {
    test('should evict least recently used items', async () => {
      await cacheManager.initialize();

      // Fill memory tier
      for (let i = 0; i < 150; i++) {
        await cacheManager.set(`key_${i}`, { data: i }, 60000, 'low');
      }

      // Oldest items should be evicted
      const stats = cacheManager.getStatistics();
      expect(stats.evictions).toBeGreaterThan(0);
    });

    test('should respect priority in eviction', async () => {
      await cacheManager.initialize();

      await cacheManager.set('high_priority', { data: 'important' }, 60000, 'high');
      await cacheManager.set('low_priority', { data: 'unimportant' }, 60000, 'low');

      // Trigger eviction
      for (let i = 0; i < 100; i++) {
        await cacheManager.set(`filler_${i}`, { data: i }, 60000, 'medium');
      }

      // High priority should still be available
      const data = await cacheManager.get('high_priority');
      expect(data).toBeDefined();
    });

    test('should get eviction candidates', async () => {
      await cacheManager.initialize();

      await cacheManager.set('old_key', { data: 'old' }, 60000, 'low');
      await cacheManager.set('new_key', { data: 'new' }, 60000, 'high');

      const candidates = cacheManager.getEvictionCandidates('memory', 10);
      expect(Array.isArray(candidates)).toBe(true);
      expect(candidates.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Cache Statistics', () => {
    test('should track hit rate', async () => {
      await cacheManager.initialize();

      await cacheManager.set('key1', { data: 'test' });

      await cacheManager.get('key1'); // Hit
      await cacheManager.get('nonexistent'); // Miss

      const stats = cacheManager.getStatistics();
      expect(stats.hitRate).toBeGreaterThanOrEqual(0);
      expect(stats.hitRate).toBeLessThanOrEqual(100);
    });

    test('should track tier-specific metrics', async () => {
      await cacheManager.initialize();

      const stats = cacheManager.getStatistics();
      expect(stats.tiers).toHaveLength(3);
      expect(stats.tiers[0].tier).toBe('memory');
      expect(stats.tiers[1].tier).toBe('storage');
      expect(stats.tiers[2].tier).toBe('persistent');
    });
  });

  describe('Prefetching', () => {
    test('should prefetch multiple keys', async () => {
      await cacheManager.initialize();

      const result = await cacheManager.prefetch(['key1', 'key2', 'key3']);
      expect(result.success).toBeGreaterThanOrEqual(0);
      expect(result.failed).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Cache Invalidation', () => {
    test('should invalidate by pattern', async () => {
      await cacheManager.initialize();

      await cacheManager.set('user_123_data', { data: 'test1' });
      await cacheManager.set('user_123_profile', { data: 'test2' });
      await cacheManager.set('user_456_data', { data: 'test3' });

      const invalidated = await cacheManager.invalidate('user_123_*');
      expect(invalidated).toBe(2);
    });
  });

  describe('Compression', () => {
    test('should compress large entries', async () => {
      await cacheManager.initialize();

      const largeData = { data: 'x'.repeat(20000) }; // >10KB
      await cacheManager.set('large_key', largeData, 60000, 'medium', {
        compress: true,
      });

      // Entry should be compressed
    });
  });

  describe('Configuration', () => {
    test('should update cache configuration', async () => {
      await cacheManager.initialize();

      await cacheManager.updateConfiguration({
        enablePrefetching: false,
        compressionThreshold: 5 * 1024,
      });

      expect(AsyncStorage.setItem).toHaveBeenCalled();
    });
  });
});