/**
 * Enhanced API Client for MediMate Malaysia
 * 
 * Provides robust HTTP client with:
 * - Automatic token refresh
 * - Retry mechanisms with exponential backoff
 * - Offline support and caching
 * - Performance monitoring
 * - Cultural context handling
 * - PDPA compliance logging
 */

import { storageService } from '@/services/storage';
import { APP_SETTINGS, CONFIG } from '@/constants/config';
import type { ApiResponse, ApiError } from './types';

export interface RequestConfig extends RequestInit {
  retries?: number;
  timeout?: number;
  skipAuth?: boolean;
  culturalContext?: {
    language?: string;
    stateCode?: string;
    timezone?: string;
  };
  offlineSupport?: boolean;
  cacheKey?: string;
  cacheTTL?: number; // Time to live in milliseconds
}

export interface RequestMetrics {
  url: string;
  method: string;
  duration: number;
  status: number;
  cached: boolean;
  retryCount: number;
  timestamp: number;
}

class ApiClient {
  private baseURL: string;
  private requestQueue: Array<() => Promise<any>> = [];
  private isProcessingQueue = false;
  private cache = new Map<string, { data: any; expiry: number }>();
  private metrics: RequestMetrics[] = [];

  constructor() {
    this.baseURL = CONFIG.apiUrl;
    this.setupPerformanceMonitoring();
  }

  /**
   * Enhanced HTTP request with retry, caching, and offline support
   */
  async request<T>(
    endpoint: string,
    config: RequestConfig = {}
  ): Promise<ApiResponse<T>> {
    const {
      retries = APP_SETTINGS.MAX_RETRY_ATTEMPTS,
      timeout = APP_SETTINGS.REQUEST_TIMEOUT,
      skipAuth = false,
      culturalContext,
      offlineSupport = false,
      cacheKey,
      cacheTTL = 300000, // 5 minutes default
      ...requestConfig
    } = config;

    const url = endpoint.startsWith('http') ? endpoint : `${this.baseURL}${endpoint}`;
    const startTime = performance.now();

    // Check cache first if cache key is provided
    if (cacheKey && requestConfig.method !== 'POST' && requestConfig.method !== 'PUT' && requestConfig.method !== 'DELETE') {
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        this.recordMetrics(url, requestConfig.method || 'GET', performance.now() - startTime, 200, true, 0);
        return { success: true, data: cached };
      }
    }

    // Check offline support
    if (offlineSupport && !navigator.onLine) {
      return this.handleOfflineRequest<T>(url, requestConfig);
    }

    let lastError: Error | null = null;
    let retryCount = 0;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const response = await this.makeHttpRequest<T>(url, {
          ...requestConfig,
          timeout,
          skipAuth,
          culturalContext,
        });

        // Cache successful GET requests
        if (cacheKey && response.success && (requestConfig.method || 'GET') === 'GET') {
          this.setCache(cacheKey, response.data, cacheTTL);
        }

        this.recordMetrics(url, requestConfig.method || 'GET', performance.now() - startTime, 200, false, retryCount);
        return response;
      } catch (error) {
        lastError = error as Error;
        retryCount = attempt;

        // Don't retry certain errors
        if (this.shouldNotRetry(error as Error)) {
          break;
        }

        // Exponential backoff delay
        if (attempt < retries) {
          await this.delay(APP_SETTINGS.RETRY_DELAY * Math.pow(2, attempt));
        }
      }
    }

    // Record failed request metrics
    this.recordMetrics(url, requestConfig.method || 'GET', performance.now() - startTime, 0, false, retryCount);

    return {
      success: false,
      error: lastError?.message || 'Request failed after retries',
    };
  }

  /**
   * Make HTTP request with authentication and cultural context
   */
  private async makeHttpRequest<T>(
    url: string,
    config: RequestConfig
  ): Promise<ApiResponse<T>> {
    const { skipAuth, culturalContext, timeout, ...requestInit } = config;

    // Build headers
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...requestInit.headers,
    };

    // Add cultural context headers
    if (culturalContext) {
      if (culturalContext.language) {
        headers['Accept-Language'] = culturalContext.language;
      }
      if (culturalContext.stateCode) {
        headers['X-Malaysian-State'] = culturalContext.stateCode;
      }
      if (culturalContext.timezone) {
        headers['X-Timezone'] = culturalContext.timezone;
      }
    }

    // Add authentication
    if (!skipAuth) {
      const accessToken = await storageService.getAccessToken();
      if (accessToken) {
        headers.Authorization = `Bearer ${accessToken}`;
      }
    }

    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...requestInit,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle token expiration
      if (response.status === 401 && !skipAuth) {
        const refreshed = await this.refreshToken();
        if (refreshed) {
          // Retry request with new token
          const newToken = await storageService.getAccessToken();
          if (newToken) {
            headers.Authorization = `Bearer ${newToken}`;
            const retryResponse = await fetch(url, {
              ...requestInit,
              headers,
            });
            return this.handleResponse<T>(retryResponse);
          }
        }
        // If refresh failed, clear stored data and require re-login
        await storageService.clearAllData();
        throw new Error('Authentication required');
      }

      return this.handleResponse<T>(response);
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      throw error;
    }
  }

  /**
   * Handle HTTP response and parse JSON
   */
  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    try {
      const contentType = response.headers.get('content-type');
      let data: any;

      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else if (contentType?.includes('application/fhir+json')) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (!response.ok) {
        return {
          success: false,
          error: data.message || `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      return {
        success: true,
        data: data.data || data,
        message: data.message,
        meta: data.meta,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to parse response',
      };
    }
  }

  /**
   * Refresh authentication token
   */
  private async refreshToken(): Promise<boolean> {
    const refreshToken = await storageService.getRefreshToken();
    if (!refreshToken) return false;

    try {
      const response = await fetch(`${this.baseURL}/auth/refresh-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.tokens) {
          await storageService.storeTokens(data.tokens);
          return true;
        }
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
    }

    return false;
  }

  /**
   * Handle offline requests with caching
   */
  private handleOfflineRequest<T>(url: string, config: RequestInit): ApiResponse<T> {
    // For offline support, we could implement:
    // 1. Queue write operations for later sync
    // 2. Return cached data for read operations
    // 3. Show appropriate offline messages

    if (config.method === 'GET') {
      // Try to return cached data
      const cacheKey = `offline_${url}`;
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return { success: true, data: cached };
      }
    } else {
      // Queue non-GET requests for later execution
      this.queueRequest(() => this.request(url, config));
    }

    return {
      success: false,
      error: 'Offline - request queued for when connection is restored',
    };
  }

  /**
   * Queue requests for offline handling
   */
  private queueRequest(requestFn: () => Promise<any>) {
    this.requestQueue.push(requestFn);
    if (!this.isProcessingQueue && navigator.onLine) {
      this.processQueue();
    }
  }

  /**
   * Process queued requests when online
   */
  private async processQueue() {
    this.isProcessingQueue = true;
    while (this.requestQueue.length > 0 && navigator.onLine) {
      const request = this.requestQueue.shift();
      if (request) {
        try {
          await request();
        } catch (error) {
          console.error('Queued request failed:', error);
        }
      }
    }
    this.isProcessingQueue = false;
  }

  /**
   * Cache management
   */
  private setCache(key: string, data: any, ttl: number) {
    const expiry = Date.now() + ttl;
    this.cache.set(key, { data, expiry });
  }

  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }
    if (cached) {
      this.cache.delete(key);
    }
    return null;
  }

  /**
   * Clear cache
   */
  public clearCache(prefix?: string) {
    if (prefix) {
      for (const [key] of this.cache) {
        if (key.startsWith(prefix)) {
          this.cache.delete(key);
        }
      }
    } else {
      this.cache.clear();
    }
  }

  /**
   * Performance monitoring
   */
  private setupPerformanceMonitoring() {
    // Listen for online/offline events
    window.addEventListener('online', () => this.processQueue());
    window.addEventListener('offline', () => {
      console.log('App is offline - requests will be queued');
    });
  }

  private recordMetrics(url: string, method: string, duration: number, status: number, cached: boolean, retryCount: number) {
    this.metrics.push({
      url,
      method,
      duration,
      status,
      cached,
      retryCount,
      timestamp: Date.now(),
    });

    // Keep only last 100 metrics
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }
  }

  /**
   * Get performance metrics
   */
  public getMetrics(): RequestMetrics[] {
    return [...this.metrics];
  }

  /**
   * Get performance summary
   */
  public getPerformanceSummary() {
    const recent = this.metrics.slice(-20); // Last 20 requests
    const avgDuration = recent.reduce((sum, m) => sum + m.duration, 0) / recent.length;
    const successRate = recent.filter(m => m.status >= 200 && m.status < 300).length / recent.length;
    const cacheHitRate = recent.filter(m => m.cached).length / recent.length;

    return {
      averageResponseTime: Math.round(avgDuration),
      successRate: Math.round(successRate * 100),
      cacheHitRate: Math.round(cacheHitRate * 100),
      totalRequests: this.metrics.length,
      queuedRequests: this.requestQueue.length,
    };
  }

  /**
   * Utility methods
   */
  private shouldNotRetry(error: Error): boolean {
    // Don't retry auth errors, client errors, etc.
    return error.message.includes('Authentication required') ||
           error.message.includes('400') ||
           error.message.includes('401') ||
           error.message.includes('403') ||
           error.message.includes('404');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const apiClient = new ApiClient();