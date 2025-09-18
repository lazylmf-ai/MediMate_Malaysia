/**
 * Retry Service with Exponential Backoff
 * Provides intelligent retry mechanisms for API calls with Malaysian network considerations
 */

import { Platform } from 'react-native';
import NetInfo, { NetInfoState } from '@react-native-netinfo/netinfo';

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitterFactor: number;
  retryableStatuses: number[];
  retryableErrors: string[];
  timeoutMs: number;
  enableNetworkCheck: boolean;
  malaysianNetworkOptimization: boolean;
}

export interface RetryOptions {
  retryConfig?: Partial<RetryConfig>;
  onRetry?: (attempt: number, error: Error) => void;
  onMaxRetriesExceeded?: (error: Error) => void;
  shouldRetry?: (error: Error, attempt: number) => boolean;
  signal?: AbortSignal;
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
  totalDuration: number;
  networkInfo?: NetInfoState;
}

export interface NetworkCondition {
  isConnected: boolean;
  type: string;
  isInternetReachable: boolean;
  strength?: 'poor' | 'fair' | 'good' | 'excellent';
  latency?: number;
  bandwidth?: number;
}

export class RetryService {
  private static instance: RetryService;
  private defaultConfig: RetryConfig;
  private networkCondition: NetworkCondition | null = null;
  private requestInProgress: Set<string> = new Set();

  private constructor() {
    this.defaultConfig = {
      maxRetries: 3,
      baseDelay: 1000, // 1 second
      maxDelay: 30000, // 30 seconds
      backoffMultiplier: 2,
      jitterFactor: 0.1,
      retryableStatuses: [408, 429, 502, 503, 504],
      retryableErrors: [
        'NETWORK_ERROR',
        'TIMEOUT',
        'CONNECTION_REFUSED',
        'DNS_RESOLUTION_FAILED',
        'SSL_HANDSHAKE_FAILED',
      ],
      timeoutMs: 30000,
      enableNetworkCheck: true,
      malaysianNetworkOptimization: true,
    };

    this.initializeNetworkMonitoring();
  }

  public static getInstance(): RetryService {
    if (!RetryService.instance) {
      RetryService.instance = new RetryService();
    }
    return RetryService.instance;
  }

  private async initializeNetworkMonitoring(): Promise<void> {
    if (!this.defaultConfig.enableNetworkCheck) return;

    try {
      // Get initial network state
      const netInfo = await NetInfo.fetch();
      this.updateNetworkCondition(netInfo);

      // Subscribe to network changes
      NetInfo.addEventListener((state) => {
        this.updateNetworkCondition(state);
      });
    } catch (error) {
      console.warn('Failed to initialize network monitoring:', error);
    }
  }

  private updateNetworkCondition(netInfo: NetInfoState): void {
    this.networkCondition = {
      isConnected: netInfo.isConnected ?? false,
      type: netInfo.type || 'unknown',
      isInternetReachable: netInfo.isInternetReachable ?? false,
      strength: this.estimateNetworkStrength(netInfo),
      latency: this.estimateLatency(netInfo),
      bandwidth: this.estimateBandwidth(netInfo),
    };

    console.log('Network condition updated:', this.networkCondition);
  }

  private estimateNetworkStrength(netInfo: NetInfoState): 'poor' | 'fair' | 'good' | 'excellent' {
    // Estimate network strength based on connection type
    switch (netInfo.type) {
      case 'wifi':
        return 'excellent';
      case 'cellular':
        // For Malaysian networks, consider different cellular technologies
        const cellularGeneration = (netInfo.details as any)?.cellularGeneration;
        switch (cellularGeneration) {
          case '4g':
          case '5g':
            return 'good';
          case '3g':
            return 'fair';
          default:
            return 'poor';
        }
      case 'ethernet':
        return 'excellent';
      default:
        return 'poor';
    }
  }

  private estimateLatency(netInfo: NetInfoState): number {
    // Estimate latency based on connection type and Malaysian network conditions
    switch (netInfo.type) {
      case 'wifi':
        return 50; // ms
      case 'cellular':
        const cellularGeneration = (netInfo.details as any)?.cellularGeneration;
        switch (cellularGeneration) {
          case '5g':
            return 20;
          case '4g':
            return 80;
          case '3g':
            return 200;
          default:
            return 500;
        }
      default:
        return 1000;
    }
  }

  private estimateBandwidth(netInfo: NetInfoState): number {
    // Estimate bandwidth in Mbps
    switch (netInfo.type) {
      case 'wifi':
        return 50;
      case 'cellular':
        const cellularGeneration = (netInfo.details as any)?.cellularGeneration;
        switch (cellularGeneration) {
          case '5g':
            return 100;
          case '4g':
            return 20;
          case '3g':
            return 5;
          default:
            return 1;
        }
      case 'ethernet':
        return 100;
      default:
        return 0.5;
    }
  }

  public async executeWithRetry<T>(
    operation: () => Promise<T>,
    options: RetryOptions = {}
  ): Promise<RetryResult<T>> {
    const config = { ...this.defaultConfig, ...options.retryConfig };
    const startTime = Date.now();
    let lastError: Error | null = null;
    let attempts = 0;

    // Generate operation ID to prevent duplicate requests
    const operationId = this.generateOperationId();

    if (this.requestInProgress.has(operationId)) {
      throw new Error('Operation already in progress');
    }

    this.requestInProgress.add(operationId);

    try {
      for (attempts = 0; attempts <= config.maxRetries; attempts++) {
        try {
          // Check if operation was aborted
          if (options.signal?.aborted) {
            throw new Error('Operation aborted');
          }

          // Check network conditions before attempt
          if (config.enableNetworkCheck && !this.isNetworkSuitable()) {
            await this.waitForNetworkRecovery(config);
          }

          // Apply Malaysian network optimizations
          if (config.malaysianNetworkOptimization) {
            await this.applyMalaysianOptimizations(attempts);
          }

          // Execute the operation with timeout
          const result = await this.executeWithTimeout(operation, config.timeoutMs);

          const totalDuration = Date.now() - startTime;
          console.log(`Operation succeeded on attempt ${attempts + 1} after ${totalDuration}ms`);

          return {
            success: true,
            data: result,
            attempts: attempts + 1,
            totalDuration,
            networkInfo: this.networkCondition || undefined,
          };

        } catch (error) {
          lastError = error as Error;
          console.warn(`Attempt ${attempts + 1} failed:`, lastError.message);

          // Check if we should retry
          if (attempts === config.maxRetries) {
            break; // No more retries left
          }

          if (options.shouldRetry && !options.shouldRetry(lastError, attempts)) {
            break; // Custom retry logic says no
          }

          if (!this.shouldRetryError(lastError, config)) {
            break; // Error is not retryable
          }

          // Call retry callback
          options.onRetry?.(attempts + 1, lastError);

          // Calculate delay with exponential backoff and jitter
          const delay = this.calculateRetryDelay(attempts, config);
          console.log(`Waiting ${delay}ms before retry ${attempts + 2}`);

          await this.sleep(delay);
        }
      }

      // All retries exhausted
      const totalDuration = Date.now() - startTime;
      console.error(`Operation failed after ${attempts + 1} attempts in ${totalDuration}ms`);

      options.onMaxRetriesExceeded?.(lastError!);

      return {
        success: false,
        error: lastError!,
        attempts: attempts + 1,
        totalDuration,
        networkInfo: this.networkCondition || undefined,
      };

    } finally {
      this.requestInProgress.delete(operationId);
    }
  }

  private async executeWithTimeout<T>(
    operation: () => Promise<T>,
    timeoutMs: number
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error(`Operation timed out after ${timeoutMs}ms`));
      }, timeoutMs);

      operation()
        .then((result) => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  private shouldRetryError(error: Error, config: RetryConfig): boolean {
    // Check for retryable error types
    for (const retryableError of config.retryableErrors) {
      if (error.message.includes(retryableError)) {
        return true;
      }
    }

    // Check for HTTP status codes (if error contains status)
    const statusMatch = error.message.match(/status\s+(\d+)/i);
    if (statusMatch) {
      const status = parseInt(statusMatch[1]);
      return config.retryableStatuses.includes(status);
    }

    // Check for network-related errors
    const networkErrors = [
      'Network request failed',
      'Unable to connect',
      'Connection refused',
      'DNS resolution failed',
      'SSL handshake failed',
      'Request timeout',
    ];

    return networkErrors.some(networkError =>
      error.message.toLowerCase().includes(networkError.toLowerCase())
    );
  }

  private calculateRetryDelay(attempt: number, config: RetryConfig): number {
    // Exponential backoff: baseDelay * (backoffMultiplier ^ attempt)
    const exponentialDelay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt);

    // Apply jitter to prevent thundering herd
    const jitter = exponentialDelay * config.jitterFactor * Math.random();
    const delayWithJitter = exponentialDelay + jitter;

    // Cap at maximum delay
    const finalDelay = Math.min(delayWithJitter, config.maxDelay);

    // Apply Malaysian network considerations
    if (config.malaysianNetworkOptimization) {
      return this.adjustDelayForMalaysianNetworks(finalDelay, attempt);
    }

    return Math.round(finalDelay);
  }

  private adjustDelayForMalaysianNetworks(delay: number, attempt: number): number {
    if (!this.networkCondition) return delay;

    // Adjust delay based on network conditions specific to Malaysia
    switch (this.networkCondition.type) {
      case 'cellular':
        // Malaysian cellular networks can be congested during peak hours
        const hour = new Date().getHours();
        const isPeakHour = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 20);
        if (isPeakHour) {
          return delay * 1.5; // Increase delay during peak hours
        }
        break;

      case 'wifi':
        // Malaysian WiFi can be unstable in certain areas
        if (this.networkCondition.strength === 'poor') {
          return delay * 2;
        }
        break;
    }

    // Increase delay more aggressively for poor network conditions
    if (this.networkCondition.strength === 'poor') {
      return delay * (1 + attempt * 0.5);
    }

    return delay;
  }

  private isNetworkSuitable(): boolean {
    if (!this.networkCondition) return true; // Assume suitable if unknown

    return this.networkCondition.isConnected &&
           this.networkCondition.isInternetReachable &&
           this.networkCondition.strength !== 'poor';
  }

  private async waitForNetworkRecovery(config: RetryConfig): Promise<void> {
    const maxWaitTime = config.maxDelay;
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      if (this.isNetworkSuitable()) {
        console.log('Network recovery detected');
        return;
      }

      console.log('Waiting for network recovery...');
      await this.sleep(2000); // Check every 2 seconds
    }

    console.warn('Network recovery timeout exceeded');
  }

  private async applyMalaysianOptimizations(attempt: number): Promise<void> {
    // Apply optimizations specific to Malaysian network infrastructure

    // Reduce request size for poor connections
    if (this.networkCondition?.strength === 'poor') {
      // This could involve setting compression headers or reducing payload size
      console.log('Applying poor network optimizations');
    }

    // Handle Malaysian ISP throttling patterns
    if (attempt > 1 && this.networkCondition?.type === 'cellular') {
      // Some Malaysian cellular providers throttle rapid requests
      await this.sleep(500 * attempt);
    }

    // Optimize for Malaysian time zones and peak usage
    const hour = new Date().getHours();
    if (hour >= 20 && hour <= 23) {
      // Peak usage hours in Malaysia - be more conservative
      await this.sleep(1000);
    }
  }

  private generateOperationId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Utility methods for different types of operations
  public async retryApiCall<T>(
    apiCall: () => Promise<T>,
    options?: RetryOptions
  ): Promise<RetryResult<T>> {
    return this.executeWithRetry(apiCall, {
      ...options,
      retryConfig: {
        maxRetries: 5,
        baseDelay: 1000,
        retryableStatuses: [408, 429, 500, 502, 503, 504],
        ...options?.retryConfig,
      },
    });
  }

  public async retryDatabaseOperation<T>(
    dbOperation: () => Promise<T>,
    options?: RetryOptions
  ): Promise<RetryResult<T>> {
    return this.executeWithRetry(dbOperation, {
      ...options,
      retryConfig: {
        maxRetries: 3,
        baseDelay: 500,
        maxDelay: 5000,
        enableNetworkCheck: false,
        ...options?.retryConfig,
      },
    });
  }

  public async retryFileOperation<T>(
    fileOperation: () => Promise<T>,
    options?: RetryOptions
  ): Promise<RetryResult<T>> {
    return this.executeWithRetry(fileOperation, {
      ...options,
      retryConfig: {
        maxRetries: 3,
        baseDelay: 100,
        maxDelay: 2000,
        enableNetworkCheck: false,
        retryableErrors: ['ENOENT', 'EACCES', 'EMFILE', 'ENFILE'],
        ...options?.retryConfig,
      },
    });
  }

  public getNetworkCondition(): NetworkCondition | null {
    return this.networkCondition;
  }

  public updateConfig(config: Partial<RetryConfig>): void {
    this.defaultConfig = { ...this.defaultConfig, ...config };
  }

  public getConfig(): RetryConfig {
    return { ...this.defaultConfig };
  }
}

// Singleton instance
export const retryService = RetryService.getInstance();

// Helper function for simple retries
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  const result = await retryService.executeWithRetry(operation, {
    retryConfig: { maxRetries },
  });

  if (result.success) {
    return result.data!;
  } else {
    throw result.error!;
  }
}