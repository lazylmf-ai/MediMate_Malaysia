/**
 * Launch Optimizer Service
 *
 * Optimizes app launch time through code splitting, pre-caching, and
 * strategic resource loading to achieve <3s cold start and <1s warm start.
 *
 * Features:
 * - Critical path identification and prioritization
 * - Progressive asset loading
 * - Code splitting with dynamic imports
 * - Pre-caching of essential data
 * - Background initialization of non-critical services
 * - Launch time measurement and reporting
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, InteractionManager } from 'react-native';
import { reminderDatabase } from '../../models/ReminderDatabase';
import { adherenceDatabase } from '../../models/AdherenceDatabase';

export interface LaunchMetrics {
  coldStart: boolean;
  startTime: number;
  criticalPathComplete: number;
  interactiveTime: number;
  fullyLoadedTime: number;

  phases: {
    initialization: number;
    criticalResources: number;
    databaseSetup: number;
    essentialData: number;
    uiRender: number;
    backgroundTasks: number;
  };

  resourcesLoaded: {
    critical: number;
    deferred: number;
    failed: number;
  };
}

export interface PreCacheConfig {
  essentialData: {
    todaySchedules: boolean;
    recentMedications: boolean;
    prayerTimes: boolean;
    activeReminders: boolean;
  };

  criticalAssets: {
    icons: boolean;
    splashImages: boolean;
    languageFiles: boolean;
  };

  limits: {
    maxCacheSize: number; // bytes
    maxCacheDuration: number; // milliseconds
  };
}

export interface LaunchOptimizationConfig {
  enableCodeSplitting: boolean;
  enablePreCaching: boolean;
  enableBackgroundInit: boolean;
  criticalPathTimeout: number; // milliseconds
  preCacheConfig: PreCacheConfig;
}

interface CriticalResource {
  id: string;
  type: 'service' | 'data' | 'asset';
  priority: number; // 1-10, 1 is highest
  loader: () => Promise<void>;
  loaded: boolean;
  error?: Error;
  loadTime?: number;
}

interface DeferredTask {
  id: string;
  task: () => Promise<void>;
  priority: number;
  executed: boolean;
  error?: Error;
}

class LaunchOptimizer {
  private static instance: LaunchOptimizer;
  private isInitialized = false;
  private config: LaunchOptimizationConfig;

  // Launch tracking
  private launchStartTime: number = 0;
  private criticalPathCompleteTime: number = 0;
  private interactiveTime: number = 0;
  private fullyLoadedTime: number = 0;
  private isColdStart: boolean = true;

  // Resource management
  private criticalResources: CriticalResource[] = [];
  private deferredTasks: DeferredTask[] = [];
  private preCache: Map<string, any> = new Map();

  // Performance tracking
  private launchMetrics: LaunchMetrics[] = [];

  // Storage keys
  private readonly STORAGE_KEYS = {
    LAUNCH_METRICS: 'launch_metrics',
    PRE_CACHE: 'launch_pre_cache',
    LAST_LAUNCH: 'last_launch_time',
    CONFIG: 'launch_optimizer_config'
  };

  private constructor() {
    this.config = this.getDefaultConfig();
    this.launchStartTime = Date.now();
  }

  static getInstance(): LaunchOptimizer {
    if (!LaunchOptimizer.instance) {
      LaunchOptimizer.instance = new LaunchOptimizer();
    }
    return LaunchOptimizer.instance;
  }

  /**
   * Initialize launch optimizer and start critical path
   */
  async initialize(config?: Partial<LaunchOptimizationConfig>): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    console.log('[LaunchOptimizer] Starting app launch optimization...');

    try {
      // Update configuration
      if (config) {
        this.config = { ...this.config, ...config };
        await this.saveConfig();
      } else {
        await this.loadConfig();
      }

      // Determine if this is a cold start
      await this.detectColdStart();

      // Register critical resources
      this.registerCriticalResources();

      // Load critical path resources
      await this.loadCriticalPath();

      // Mark as interactive
      this.markInteractive();

      // Schedule background initialization
      if (this.config.enableBackgroundInit) {
        this.scheduleBackgroundInit();
      }

      this.isInitialized = true;
      console.log('[LaunchOptimizer] Initialization complete');

    } catch (error) {
      console.error('[LaunchOptimizer] Initialization failed:', error);
      throw error;
    }
  }

  /**
   * Load critical path resources synchronously
   */
  private async loadCriticalPath(): Promise<void> {
    const startTime = Date.now();
    console.log('[LaunchOptimizer] Loading critical path...');

    try {
      // Sort critical resources by priority
      const sortedResources = [...this.criticalResources]
        .sort((a, b) => a.priority - b.priority);

      // Load critical resources with timeout
      const timeout = this.config.criticalPathTimeout;
      const loadPromises = sortedResources.map(resource =>
        this.loadResourceWithTimeout(resource, timeout)
      );

      await Promise.allSettled(loadPromises);

      this.criticalPathCompleteTime = Date.now();
      const duration = this.criticalPathCompleteTime - startTime;

      console.log(`[LaunchOptimizer] Critical path loaded in ${duration}ms`);

      // Check if we met our target
      if (duration > 2000) {
        console.warn(`[LaunchOptimizer] Critical path exceeded target (2000ms): ${duration}ms`);
      }

    } catch (error) {
      console.error('[LaunchOptimizer] Critical path loading failed:', error);
      throw error;
    }
  }

  /**
   * Load a resource with timeout protection
   */
  private async loadResourceWithTimeout(
    resource: CriticalResource,
    timeout: number
  ): Promise<void> {
    const startTime = Date.now();

    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error(`Resource ${resource.id} timed out`)), timeout)
      );

      await Promise.race([resource.loader(), timeoutPromise]);

      resource.loaded = true;
      resource.loadTime = Date.now() - startTime;

      console.log(`[LaunchOptimizer] Loaded ${resource.type} '${resource.id}' in ${resource.loadTime}ms`);

    } catch (error) {
      resource.error = error as Error;
      console.error(`[LaunchOptimizer] Failed to load ${resource.type} '${resource.id}':`, error);

      // Don't throw for non-critical failures
      if (resource.priority <= 3) {
        throw error;
      }
    }
  }

  /**
   * Register all critical resources for the app
   */
  private registerCriticalResources(): void {
    console.log('[LaunchOptimizer] Registering critical resources...');

    // Priority 1: Essential services
    this.criticalResources.push({
      id: 'database_init',
      type: 'service',
      priority: 1,
      loader: async () => {
        await reminderDatabase.initialize();
        await adherenceDatabase.initialize();
      },
      loaded: false
    });

    // Priority 2: Pre-cached data
    if (this.config.enablePreCaching) {
      this.criticalResources.push({
        id: 'pre_cache_load',
        type: 'data',
        priority: 2,
        loader: async () => {
          await this.loadPreCache();
        },
        loaded: false
      });
    }

    // Priority 3: Today's schedules
    if (this.config.preCacheConfig.essentialData.todaySchedules) {
      this.criticalResources.push({
        id: 'today_schedules',
        type: 'data',
        priority: 3,
        loader: async () => {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const tomorrow = new Date(today);
          tomorrow.setDate(tomorrow.getDate() + 1);

          // Pre-load today's schedules
          await reminderDatabase.getSchedulesBetween(today, tomorrow);
        },
        loaded: false
      });
    }

    // Priority 4: Active reminders
    if (this.config.preCacheConfig.essentialData.activeReminders) {
      this.criticalResources.push({
        id: 'active_reminders',
        type: 'data',
        priority: 4,
        loader: async () => {
          await reminderDatabase.getPendingReminders();
        },
        loaded: false
      });
    }

    // Priority 5: Recent medications
    if (this.config.preCacheConfig.essentialData.recentMedications) {
      this.criticalResources.push({
        id: 'recent_medications',
        type: 'data',
        priority: 5,
        loader: async () => {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

          await adherenceDatabase.getAdherenceRecords(sevenDaysAgo, new Date());
        },
        loaded: false
      });
    }

    console.log(`[LaunchOptimizer] Registered ${this.criticalResources.length} critical resources`);
  }

  /**
   * Schedule background initialization of non-critical services
   */
  private scheduleBackgroundInit(): void {
    console.log('[LaunchOptimizer] Scheduling background initialization...');

    // Register deferred tasks
    this.deferredTasks = [
      {
        id: 'sync_check',
        priority: 1,
        task: async () => {
          // Check for pending sync operations
          const { SyncManager } = await import('../sync/SyncManager');
          const syncManager = SyncManager.getInstance();
          if (syncManager.isInitialized()) {
            await syncManager.checkAndSync();
          }
        },
        executed: false
      },
      {
        id: 'notification_setup',
        priority: 2,
        task: async () => {
          // Setup notification handlers
          const { ExpoNotificationService } = await import('../notifications/ExpoNotificationService');
          const notificationService = ExpoNotificationService.getInstance();
          await notificationService.initialize();
        },
        executed: false
      },
      {
        id: 'analytics_init',
        priority: 3,
        task: async () => {
          // Initialize analytics service
          const { default: PerformanceAnalytics } = await import('../analytics/PerformanceAnalytics');
          const analytics = PerformanceAnalytics.getInstance();
          await analytics.initialize();
        },
        executed: false
      },
      {
        id: 'background_processor',
        priority: 4,
        task: async () => {
          // Initialize background processor
          const { default: BackgroundProcessorService } = await import('../background/BackgroundProcessorService');
          const processor = BackgroundProcessorService.getInstance();
          await processor.initialize();
        },
        executed: false
      },
      {
        id: 'cache_cleanup',
        priority: 5,
        task: async () => {
          // Clean up old cache entries
          await this.cleanupPreCache();
        },
        executed: false
      }
    ];

    // Execute deferred tasks after interactions complete
    InteractionManager.runAfterInteractions(() => {
      this.executeBackgroundTasks();
    });
  }

  /**
   * Execute background tasks in priority order
   */
  private async executeBackgroundTasks(): Promise<void> {
    console.log('[LaunchOptimizer] Executing background tasks...');

    const sortedTasks = [...this.deferredTasks]
      .sort((a, b) => a.priority - b.priority);

    for (const task of sortedTasks) {
      try {
        await task.task();
        task.executed = true;
        console.log(`[LaunchOptimizer] Background task '${task.id}' completed`);
      } catch (error) {
        task.error = error as Error;
        console.error(`[LaunchOptimizer] Background task '${task.id}' failed:`, error);
      }
    }

    this.fullyLoadedTime = Date.now();
    console.log('[LaunchOptimizer] All background tasks completed');

    // Record launch metrics
    await this.recordLaunchMetrics();
  }

  /**
   * Mark app as interactive
   */
  private markInteractive(): void {
    this.interactiveTime = Date.now();
    const timeToInteractive = this.interactiveTime - this.launchStartTime;

    console.log(`[LaunchOptimizer] App interactive in ${timeToInteractive}ms`);

    // Check if we met our target
    const target = this.isColdStart ? 3000 : 1000;
    if (timeToInteractive > target) {
      console.warn(`[LaunchOptimizer] Time to interactive exceeded target (${target}ms): ${timeToInteractive}ms`);
    } else {
      console.log(`[LaunchOptimizer] Met time to interactive target! (${target}ms)`);
    }
  }

  /**
   * Detect if this is a cold start
   */
  private async detectColdStart(): Promise<void> {
    try {
      const lastLaunchStr = await AsyncStorage.getItem(this.STORAGE_KEYS.LAST_LAUNCH);

      if (lastLaunchStr) {
        const lastLaunch = parseInt(lastLaunchStr, 10);
        const timeSinceLastLaunch = Date.now() - lastLaunch;

        // Consider it a cold start if more than 5 minutes since last launch
        this.isColdStart = timeSinceLastLaunch > (5 * 60 * 1000);
      }

      await AsyncStorage.setItem(this.STORAGE_KEYS.LAST_LAUNCH, Date.now().toString());

      console.log(`[LaunchOptimizer] ${this.isColdStart ? 'Cold' : 'Warm'} start detected`);

    } catch (error) {
      console.error('[LaunchOptimizer] Failed to detect cold start:', error);
      this.isColdStart = true; // Default to cold start
    }
  }

  /**
   * Load pre-cached data
   */
  private async loadPreCache(): Promise<void> {
    try {
      const cacheStr = await AsyncStorage.getItem(this.STORAGE_KEYS.PRE_CACHE);

      if (cacheStr) {
        const cache = JSON.parse(cacheStr);

        // Validate cache age
        const cacheAge = Date.now() - cache.timestamp;
        const maxAge = this.config.preCacheConfig.limits.maxCacheDuration;

        if (cacheAge < maxAge) {
          Object.entries(cache.data).forEach(([key, value]) => {
            this.preCache.set(key, value);
          });

          console.log(`[LaunchOptimizer] Loaded ${this.preCache.size} pre-cached items`);
        } else {
          console.log('[LaunchOptimizer] Pre-cache expired, will refresh');
        }
      }
    } catch (error) {
      console.error('[LaunchOptimizer] Failed to load pre-cache:', error);
    }
  }

  /**
   * Save data to pre-cache for next launch
   */
  async saveToPreCache(key: string, data: any): Promise<void> {
    try {
      this.preCache.set(key, data);

      // Calculate cache size
      const cacheData = Object.fromEntries(this.preCache);
      const cacheStr = JSON.stringify(cacheData);
      const cacheSize = new Blob([cacheStr]).size;

      // Check size limit
      if (cacheSize > this.config.preCacheConfig.limits.maxCacheSize) {
        console.warn('[LaunchOptimizer] Pre-cache size limit exceeded, will not persist');
        return;
      }

      // Save to storage
      await AsyncStorage.setItem(
        this.STORAGE_KEYS.PRE_CACHE,
        JSON.stringify({
          timestamp: Date.now(),
          data: cacheData
        })
      );

    } catch (error) {
      console.error('[LaunchOptimizer] Failed to save to pre-cache:', error);
    }
  }

  /**
   * Get data from pre-cache
   */
  getFromPreCache(key: string): any | null {
    return this.preCache.get(key) || null;
  }

  /**
   * Clean up old pre-cache entries
   */
  private async cleanupPreCache(): Promise<void> {
    try {
      // Remove items older than configured duration
      const maxAge = this.config.preCacheConfig.limits.maxCacheDuration;
      const cacheStr = await AsyncStorage.getItem(this.STORAGE_KEYS.PRE_CACHE);

      if (cacheStr) {
        const cache = JSON.parse(cacheStr);
        const cacheAge = Date.now() - cache.timestamp;

        if (cacheAge > maxAge) {
          await AsyncStorage.removeItem(this.STORAGE_KEYS.PRE_CACHE);
          this.preCache.clear();
          console.log('[LaunchOptimizer] Pre-cache cleaned up');
        }
      }
    } catch (error) {
      console.error('[LaunchOptimizer] Failed to cleanup pre-cache:', error);
    }
  }

  /**
   * Record launch metrics for analysis
   */
  private async recordLaunchMetrics(): Promise<void> {
    try {
      const metrics: LaunchMetrics = {
        coldStart: this.isColdStart,
        startTime: this.launchStartTime,
        criticalPathComplete: this.criticalPathCompleteTime - this.launchStartTime,
        interactiveTime: this.interactiveTime - this.launchStartTime,
        fullyLoadedTime: this.fullyLoadedTime - this.launchStartTime,

        phases: {
          initialization: this.criticalPathCompleteTime - this.launchStartTime,
          criticalResources: this.criticalResources
            .filter(r => r.loadTime)
            .reduce((sum, r) => sum + (r.loadTime || 0), 0),
          databaseSetup: this.criticalResources
            .find(r => r.id === 'database_init')?.loadTime || 0,
          essentialData: this.criticalResources
            .filter(r => r.type === 'data')
            .reduce((sum, r) => sum + (r.loadTime || 0), 0),
          uiRender: this.interactiveTime - this.criticalPathCompleteTime,
          backgroundTasks: this.fullyLoadedTime - this.interactiveTime
        },

        resourcesLoaded: {
          critical: this.criticalResources.filter(r => r.loaded).length,
          deferred: this.deferredTasks.filter(t => t.executed).length,
          failed: this.criticalResources.filter(r => r.error).length +
                  this.deferredTasks.filter(t => t.error).length
        }
      };

      this.launchMetrics.push(metrics);

      // Keep only last 50 launches
      if (this.launchMetrics.length > 50) {
        this.launchMetrics = this.launchMetrics.slice(-50);
      }

      await this.saveMetrics();

      console.log('[LaunchOptimizer] Launch metrics recorded:', {
        timeToInteractive: metrics.interactiveTime,
        coldStart: metrics.coldStart,
        resourcesLoaded: metrics.resourcesLoaded
      });

    } catch (error) {
      console.error('[LaunchOptimizer] Failed to record launch metrics:', error);
    }
  }

  /**
   * Get launch performance summary
   */
  getLaunchPerformance(): {
    averageColdStart: number;
    averageWarmStart: number;
    lastLaunch: LaunchMetrics | null;
    target: { coldStart: number; warmStart: number };
    meetingTarget: boolean;
  } {
    const coldStarts = this.launchMetrics.filter(m => m.coldStart);
    const warmStarts = this.launchMetrics.filter(m => !m.coldStart);

    const avgCold = coldStarts.length > 0
      ? coldStarts.reduce((sum, m) => sum + m.interactiveTime, 0) / coldStarts.length
      : 0;

    const avgWarm = warmStarts.length > 0
      ? warmStarts.reduce((sum, m) => sum + m.interactiveTime, 0) / warmStarts.length
      : 0;

    const lastLaunch = this.launchMetrics.length > 0
      ? this.launchMetrics[this.launchMetrics.length - 1]
      : null;

    const target = { coldStart: 3000, warmStart: 1000 };
    const meetingTarget = avgCold <= target.coldStart && avgWarm <= target.warmStart;

    return {
      averageColdStart: avgCold,
      averageWarmStart: avgWarm,
      lastLaunch,
      target,
      meetingTarget
    };
  }

  /**
   * Get detailed launch metrics
   */
  getLaunchMetrics(): LaunchMetrics[] {
    return [...this.launchMetrics];
  }

  /**
   * Storage methods
   */
  private async loadConfig(): Promise<void> {
    try {
      const configStr = await AsyncStorage.getItem(this.STORAGE_KEYS.CONFIG);
      if (configStr) {
        this.config = JSON.parse(configStr);
      }
    } catch (error) {
      console.error('[LaunchOptimizer] Failed to load config:', error);
    }
  }

  private async saveConfig(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEYS.CONFIG, JSON.stringify(this.config));
    } catch (error) {
      console.error('[LaunchOptimizer] Failed to save config:', error);
    }
  }

  private async saveMetrics(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        this.STORAGE_KEYS.LAUNCH_METRICS,
        JSON.stringify(this.launchMetrics)
      );
    } catch (error) {
      console.error('[LaunchOptimizer] Failed to save metrics:', error);
    }
  }

  private async loadMetrics(): Promise<void> {
    try {
      const metricsStr = await AsyncStorage.getItem(this.STORAGE_KEYS.LAUNCH_METRICS);
      if (metricsStr) {
        this.launchMetrics = JSON.parse(metricsStr);
      }
    } catch (error) {
      console.error('[LaunchOptimizer] Failed to load metrics:', error);
    }
  }

  /**
   * Get default configuration
   */
  private getDefaultConfig(): LaunchOptimizationConfig {
    return {
      enableCodeSplitting: true,
      enablePreCaching: true,
      enableBackgroundInit: true,
      criticalPathTimeout: 2000,
      preCacheConfig: {
        essentialData: {
          todaySchedules: true,
          recentMedications: true,
          prayerTimes: true,
          activeReminders: true
        },
        criticalAssets: {
          icons: true,
          splashImages: true,
          languageFiles: true
        },
        limits: {
          maxCacheSize: 5 * 1024 * 1024, // 5MB
          maxCacheDuration: 24 * 60 * 60 * 1000 // 24 hours
        }
      }
    };
  }

  /**
   * Update configuration
   */
  async updateConfig(config: Partial<LaunchOptimizationConfig>): Promise<void> {
    this.config = { ...this.config, ...config };
    await this.saveConfig();
  }

  /**
   * Get current configuration
   */
  getConfig(): LaunchOptimizationConfig {
    return { ...this.config };
  }

  /**
   * Check if optimizer is initialized
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Clean up resources
   */
  async cleanup(): Promise<void> {
    await this.saveMetrics();
    await this.saveConfig();
    this.preCache.clear();
  }
}

export default LaunchOptimizer;