/**
 * Lazy Load Manager
 *
 * Manages dynamic imports and route-based code splitting to optimize
 * bundle size and initial load time.
 *
 * Features:
 * - Dynamic component imports
 * - Route-based code splitting
 * - Prefetching and preloading
 * - Import error handling
 * - Loading state management
 * - Bundle size optimization
 */

import React, { ComponentType, LazyExoticComponent, lazy, Suspense } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

export interface LazyLoadConfig {
  enablePrefetch: boolean;
  prefetchDelay: number; // milliseconds
  retryAttempts: number;
  retryDelay: number; // milliseconds
  enablePreload: boolean;
}

export interface LoadableComponent<P = any> {
  component: LazyExoticComponent<ComponentType<P>>;
  preload: () => Promise<void>;
  isLoaded: boolean;
  error?: Error;
}

interface ImportFunction<T = any> {
  (): Promise<{ default: ComponentType<T> }>;
}

interface RouteConfig {
  name: string;
  import: ImportFunction;
  preload?: boolean;
  priority?: number; // 1-10, 1 is highest
}

class LazyLoadManager {
  private static instance: LazyLoadManager;
  private config: LazyLoadConfig;

  // Component registry
  private components: Map<string, LoadableComponent> = new Map();
  private prefetchQueue: Array<{ name: string; priority: number }> = [];
  private preloadedComponents: Set<string> = new Set();

  // Loading state
  private loadingComponents: Set<string> = new Set();
  private failedImports: Map<string, Error> = new Map();

  // Statistics
  private stats = {
    totalImports: 0,
    successfulImports: 0,
    failedImports: 0,
    averageLoadTime: 0,
    prefetchHits: 0,
  };

  private constructor() {
    this.config = this.getDefaultConfig();
  }

  static getInstance(): LazyLoadManager {
    if (!LazyLoadManager.instance) {
      LazyLoadManager.instance = new LazyLoadManager();
    }
    return LazyLoadManager.instance;
  }

  /**
   * Create a lazily loaded component
   */
  createLazyComponent<P = any>(
    name: string,
    importFn: ImportFunction<P>,
    options?: {
      fallback?: React.ReactNode;
      errorFallback?: React.ReactNode;
      preload?: boolean;
    }
  ): ComponentType<P> {
    // Check if component is already registered
    if (this.components.has(name)) {
      const existing = this.components.get(name)!;
      return this.wrapWithSuspense(existing.component, options);
    }

    // Create lazy component with retry logic
    const lazyComponent = lazy(() => this.importWithRetry(name, importFn));

    // Create loadable component
    const loadable: LoadableComponent<P> = {
      component: lazyComponent,
      preload: async () => {
        if (this.preloadedComponents.has(name)) {
          return;
        }

        console.log(`[LazyLoadManager] Preloading component '${name}'...`);
        try {
          await importFn();
          this.preloadedComponents.add(name);
          console.log(`[LazyLoadManager] Component '${name}' preloaded`);
        } catch (error) {
          console.error(`[LazyLoadManager] Failed to preload '${name}':`, error);
        }
      },
      isLoaded: false,
    };

    this.components.set(name, loadable);

    // Preload if requested
    if (options?.preload) {
      this.schedulePreload(name, 1); // High priority
    }

    return this.wrapWithSuspense(lazyComponent, options);
  }

  /**
   * Import with retry logic
   */
  private async importWithRetry<T>(
    name: string,
    importFn: ImportFunction<T>,
    attempt: number = 1
  ): Promise<{ default: ComponentType<T> }> {
    const startTime = Date.now();
    this.loadingComponents.add(name);
    this.stats.totalImports++;

    try {
      // Check if already preloaded
      if (this.preloadedComponents.has(name)) {
        this.stats.prefetchHits++;
        console.log(`[LazyLoadManager] Using preloaded component '${name}'`);
      }

      const module = await importFn();
      const loadTime = Date.now() - startTime;

      this.loadingComponents.delete(name);
      this.stats.successfulImports++;
      this.updateAverageLoadTime(loadTime);

      // Mark as loaded
      const loadable = this.components.get(name);
      if (loadable) {
        loadable.isLoaded = true;
      }

      console.log(`[LazyLoadManager] Loaded component '${name}' in ${loadTime}ms`);

      return module;

    } catch (error) {
      console.error(`[LazyLoadManager] Import failed for '${name}' (attempt ${attempt}):`, error);

      // Retry if attempts remaining
      if (attempt < this.config.retryAttempts) {
        console.log(`[LazyLoadManager] Retrying '${name}' in ${this.config.retryDelay}ms...`);

        await new Promise(resolve => setTimeout(resolve, this.config.retryDelay));
        return this.importWithRetry(name, importFn, attempt + 1);
      }

      // Final failure
      this.loadingComponents.delete(name);
      this.stats.failedImports++;
      this.failedImports.set(name, error as Error);

      throw error;
    }
  }

  /**
   * Wrap component with Suspense boundary
   */
  private wrapWithSuspense<P>(
    Component: LazyExoticComponent<ComponentType<P>>,
    options?: {
      fallback?: React.ReactNode;
      errorFallback?: React.ReactNode;
    }
  ): ComponentType<P> {
    const fallback = options?.fallback || this.getDefaultFallback();

    return (props: P) => (
      <Suspense fallback={fallback}>
        <Component {...props} />
      </Suspense>
    );
  }

  /**
   * Get default loading fallback
   */
  private getDefaultFallback(): React.ReactNode {
    return (
      <View style={styles.fallbackContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.fallbackText}>Loading...</Text>
      </View>
    );
  }

  /**
   * Register routes for code splitting
   */
  registerRoutes(routes: RouteConfig[]): Map<string, ComponentType> {
    const components = new Map<string, ComponentType>();

    routes.forEach(route => {
      const component = this.createLazyComponent(
        route.name,
        route.import,
        { preload: route.preload }
      );

      components.set(route.name, component);

      // Add to prefetch queue if priority specified
      if (route.priority) {
        this.schedulePreload(route.name, route.priority);
      }
    });

    // Start prefetching
    if (this.config.enablePrefetch) {
      this.startPrefetching();
    }

    return components;
  }

  /**
   * Schedule component preload
   */
  schedulePreload(name: string, priority: number = 5): void {
    if (this.preloadedComponents.has(name)) {
      return; // Already preloaded
    }

    // Add to queue
    this.prefetchQueue.push({ name, priority });

    // Sort by priority
    this.prefetchQueue.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Start prefetching components
   */
  private startPrefetching(): void {
    if (this.prefetchQueue.length === 0) {
      return;
    }

    console.log(`[LazyLoadManager] Starting prefetch of ${this.prefetchQueue.length} components...`);

    // Prefetch components with delay
    setTimeout(() => {
      this.processPrefetchQueue();
    }, this.config.prefetchDelay);
  }

  /**
   * Process prefetch queue
   */
  private async processPrefetchQueue(): Promise<void> {
    while (this.prefetchQueue.length > 0) {
      const { name } = this.prefetchQueue.shift()!;
      const loadable = this.components.get(name);

      if (loadable && !loadable.isLoaded) {
        try {
          await loadable.preload();
          // Small delay between preloads to avoid blocking
          await new Promise(resolve => setTimeout(resolve, 100));
        } catch (error) {
          console.error(`[LazyLoadManager] Prefetch failed for '${name}':`, error);
        }
      }
    }

    console.log('[LazyLoadManager] Prefetch queue processed');
  }

  /**
   * Preload component manually
   */
  async preloadComponent(name: string): Promise<void> {
    const loadable = this.components.get(name);

    if (!loadable) {
      console.warn(`[LazyLoadManager] Component '${name}' not registered`);
      return;
    }

    if (loadable.isLoaded || this.preloadedComponents.has(name)) {
      console.log(`[LazyLoadManager] Component '${name}' already loaded`);
      return;
    }

    await loadable.preload();
  }

  /**
   * Preload multiple components
   */
  async preloadComponents(names: string[]): Promise<void> {
    console.log(`[LazyLoadManager] Preloading ${names.length} components...`);

    await Promise.all(
      names.map(name => this.preloadComponent(name))
    );

    console.log('[LazyLoadManager] All components preloaded');
  }

  /**
   * Check if component is loaded
   */
  isComponentLoaded(name: string): boolean {
    return this.preloadedComponents.has(name);
  }

  /**
   * Check if component is loading
   */
  isComponentLoading(name: string): boolean {
    return this.loadingComponents.has(name);
  }

  /**
   * Get component load error
   */
  getComponentError(name: string): Error | undefined {
    return this.failedImports.get(name);
  }

  /**
   * Get load statistics
   */
  getStats(): {
    totalImports: number;
    successfulImports: number;
    failedImports: number;
    successRate: number;
    averageLoadTime: number;
    prefetchHits: number;
    prefetchHitRate: number;
    componentsRegistered: number;
    componentsPreloaded: number;
  } {
    const successRate = this.stats.totalImports > 0
      ? (this.stats.successfulImports / this.stats.totalImports) * 100
      : 100;

    const prefetchHitRate = this.stats.totalImports > 0
      ? (this.stats.prefetchHits / this.stats.totalImports) * 100
      : 0;

    return {
      ...this.stats,
      successRate,
      prefetchHitRate,
      componentsRegistered: this.components.size,
      componentsPreloaded: this.preloadedComponents.size,
    };
  }

  /**
   * Update average load time
   */
  private updateAverageLoadTime(loadTime: number): void {
    const total = this.stats.averageLoadTime * (this.stats.successfulImports - 1);
    this.stats.averageLoadTime = (total + loadTime) / this.stats.successfulImports;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<LazyLoadConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get configuration
   */
  getConfig(): LazyLoadConfig {
    return { ...this.config };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalImports: 0,
      successfulImports: 0,
      failedImports: 0,
      averageLoadTime: 0,
      prefetchHits: 0,
    };
    this.failedImports.clear();
  }

  /**
   * Clear all preloaded components
   */
  clearPreloadedComponents(): void {
    this.preloadedComponents.clear();
    this.components.forEach(comp => {
      comp.isLoaded = false;
    });
  }

  /**
   * Get default configuration
   */
  private getDefaultConfig(): LazyLoadConfig {
    return {
      enablePrefetch: true,
      prefetchDelay: 2000, // 2 seconds after initial load
      retryAttempts: 3,
      retryDelay: 1000, // 1 second
      enablePreload: true,
    };
  }
}

/**
 * Styles
 */
const styles = StyleSheet.create({
  fallbackContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  fallbackText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
});

/**
 * Utility function to create lazy component
 */
export const createLazyComponent = <P = any>(
  name: string,
  importFn: ImportFunction<P>,
  options?: {
    fallback?: React.ReactNode;
    errorFallback?: React.ReactNode;
    preload?: boolean;
  }
): ComponentType<P> => {
  return LazyLoadManager.getInstance().createLazyComponent(name, importFn, options);
};

/**
 * Utility function to register routes
 */
export const registerLazyRoutes = (routes: RouteConfig[]): Map<string, ComponentType> => {
  return LazyLoadManager.getInstance().registerRoutes(routes);
};

/**
 * Utility function to preload component
 */
export const preloadComponent = async (name: string): Promise<void> => {
  return LazyLoadManager.getInstance().preloadComponent(name);
};

export default LazyLoadManager;