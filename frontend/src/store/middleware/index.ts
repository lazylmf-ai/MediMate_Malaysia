/**
 * Redux Middleware Configuration
 * 
 * Advanced middleware stack for navigation analytics, performance monitoring,
 * cultural context persistence, and error reporting.
 */

import { Middleware, MiddlewareAPI, Dispatch, AnyAction } from '@reduxjs/toolkit';
import type { RootState } from '../index';
import { navigationMiddleware } from './navigationMiddleware';
import { performanceMiddleware } from './performanceMiddleware';
import { culturalPersistenceMiddleware } from './culturalPersistenceMiddleware';
import { errorReportingMiddleware } from './errorReportingMiddleware';
import { analyticsMiddleware } from './analyticsMiddleware';
import { offlineMiddleware } from './offlineMiddleware';

/**
 * Middleware Configuration
 */
export interface MiddlewareConfig {
  navigation: {
    enabled: boolean;
    trackScreenViews: boolean;
    trackNavigationTiming: boolean;
  };
  performance: {
    enabled: boolean;
    trackRenderTime: boolean;
    trackMemoryUsage: boolean;
    trackBatteryImpact: boolean;
  };
  culturalPersistence: {
    enabled: boolean;
    autoSave: boolean;
    syncInterval: number;
  };
  errorReporting: {
    enabled: boolean;
    reportToService: boolean;
    localLogging: boolean;
  };
  analytics: {
    enabled: boolean;
    trackUserActions: boolean;
    trackCulturalPreferences: boolean;
  };
  offline: {
    enabled: boolean;
    queueActions: boolean;
    syncOnReconnect: boolean;
  };
}

/**
 * Default Middleware Configuration
 */
export const defaultMiddlewareConfig: MiddlewareConfig = {
  navigation: {
    enabled: true,
    trackScreenViews: true,
    trackNavigationTiming: true,
  },
  performance: {
    enabled: true,
    trackRenderTime: true,
    trackMemoryUsage: __DEV__,
    trackBatteryImpact: !__DEV__,
  },
  culturalPersistence: {
    enabled: true,
    autoSave: true,
    syncInterval: 30000, // 30 seconds
  },
  errorReporting: {
    enabled: true,
    reportToService: !__DEV__,
    localLogging: true,
  },
  analytics: {
    enabled: !__DEV__,
    trackUserActions: true,
    trackCulturalPreferences: true,
  },
  offline: {
    enabled: true,
    queueActions: true,
    syncOnReconnect: true,
  },
};

/**
 * Middleware Factory
 */
export class MiddlewareFactory {
  private static config: MiddlewareConfig = defaultMiddlewareConfig;

  static configure(config: Partial<MiddlewareConfig>) {
    this.config = { ...this.config, ...config };
  }

  static createMiddlewareStack(): Middleware[] {
    const middlewares: Middleware[] = [];

    // Navigation middleware (highest priority for user experience)
    if (this.config.navigation.enabled) {
      middlewares.push(navigationMiddleware(this.config.navigation));
    }

    // Performance middleware (high priority for optimization)
    if (this.config.performance.enabled) {
      middlewares.push(performanceMiddleware(this.config.performance));
    }

    // Cultural persistence middleware (important for cultural features)
    if (this.config.culturalPersistence.enabled) {
      middlewares.push(culturalPersistenceMiddleware(this.config.culturalPersistence));
    }

    // Offline middleware (important for reliability)
    if (this.config.offline.enabled) {
      middlewares.push(offlineMiddleware(this.config.offline));
    }

    // Error reporting middleware (important for debugging)
    if (this.config.errorReporting.enabled) {
      middlewares.push(errorReportingMiddleware(this.config.errorReporting));
    }

    // Analytics middleware (lowest priority)
    if (this.config.analytics.enabled) {
      middlewares.push(analyticsMiddleware(this.config.analytics));
    }

    return middlewares;
  }

  static getConfig(): MiddlewareConfig {
    return this.config;
  }
}

/**
 * Middleware Timing Logger
 */
export const timingMiddleware: Middleware = (store: MiddlewareAPI) => (next: Dispatch) => (action: AnyAction) => {
  if (!__DEV__) return next(action);

  const startTime = performance.now();
  const result = next(action);
  const endTime = performance.now();
  const executionTime = endTime - startTime;

  // Log slow actions
  if (executionTime > 10) {
    console.warn(`Slow Redux action: ${action.type} took ${executionTime.toFixed(2)}ms`);
  }

  return result;
};

/**
 * Action Sanitizer for Sensitive Data
 */
export const sanitizerMiddleware: Middleware = (store: MiddlewareAPI) => (next: Dispatch) => (action: AnyAction) => {
  // Sanitize sensitive data before processing
  const sanitizedAction = sanitizeAction(action);
  return next(sanitizedAction);
};

function sanitizeAction(action: AnyAction): AnyAction {
  // Create a copy to avoid mutating the original action
  const sanitized = { ...action };

  // Remove sensitive data
  if (sanitized.payload) {
    if (sanitized.payload.password) {
      sanitized.payload = { ...sanitized.payload, password: '[REDACTED]' };
    }
    if (sanitized.payload.token) {
      sanitized.payload = { ...sanitized.payload, token: '[REDACTED]' };
    }
    if (sanitized.payload.apiKey) {
      sanitized.payload = { ...sanitized.payload, apiKey: '[REDACTED]' };
    }
  }

  return sanitized;
}

/**
 * State Validation Middleware
 */
export const validationMiddleware: Middleware = (store: MiddlewareAPI<Dispatch, RootState>) => (next: Dispatch) => (action: AnyAction) => {
  const prevState = store.getState();
  const result = next(action);
  const nextState = store.getState();

  // Validate state transitions in development
  if (__DEV__) {
    validateStateTransition(prevState, nextState, action);
  }

  return result;
};

function validateStateTransition(prevState: RootState, nextState: RootState, action: AnyAction) {
  // Validate auth state consistency
  if (nextState.auth.isAuthenticated && !nextState.auth.user) {
    console.error('Invalid auth state: authenticated but no user', action.type);
  }

  // Validate cultural state consistency
  if (nextState.auth.isAuthenticated && !nextState.cultural.profile && nextState.auth.user) {
    console.warn('Cultural profile not loaded for authenticated user', action.type);
  }

  // Validate app state consistency
  if (!nextState.app.isInitialized && nextState.auth.isAuthenticated) {
    console.warn('App not initialized but user authenticated', action.type);
  }
}

/**
 * Cultural Context Middleware
 */
export const culturalContextMiddleware: Middleware = (store: MiddlewareAPI<Dispatch, RootState>) => (next: Dispatch) => (action: AnyAction) => {
  const state = store.getState();
  const culturalProfile = state.cultural.profile;

  // Add cultural context to relevant actions
  if (culturalProfile && shouldAddCulturalContext(action.type)) {
    const culturalAction = {
      ...action,
      meta: {
        ...action.meta,
        culturalContext: {
          language: culturalProfile.language,
          timezone: culturalProfile.timezone,
          prayerTimes: culturalProfile.prayerTimes,
          festivals: culturalProfile.festivals,
        },
      },
    };
    return next(culturalAction);
  }

  return next(action);
};

function shouldAddCulturalContext(actionType: string): boolean {
  const culturalActionTypes = [
    'navigation/',
    'cultural/',
    'notification/',
    'medication/',
    'family/',
  ];

  return culturalActionTypes.some(prefix => actionType.startsWith(prefix));
}

/**
 * Battery Optimization Middleware
 */
export const batteryOptimizationMiddleware: Middleware = (store: MiddlewareAPI) => (next: Dispatch) => (action: AnyAction) => {
  // Skip expensive operations when battery is low
  if (isBatteryLow() && isExpensiveAction(action.type)) {
    console.log(`Skipping expensive action due to low battery: ${action.type}`);
    return { type: 'BATTERY_OPTIMIZATION_SKIP', original: action.type };
  }

  return next(action);
};

function isBatteryLow(): boolean {
  // This would be implemented with a battery monitoring service
  // For now, return false
  return false;
}

function isExpensiveAction(actionType: string): boolean {
  const expensiveActions = [
    'analytics/',
    'performance/',
    'sync/',
  ];

  return expensiveActions.some(prefix => actionType.startsWith(prefix));
}

/**
 * Middleware Performance Monitor
 */
export class MiddlewarePerformanceMonitor {
  private static metrics: Map<string, { totalTime: number; callCount: number }> = new Map();

  static startTiming(middlewareName: string): number {
    return performance.now();
  }

  static endTiming(middlewareName: string, startTime: number) {
    const duration = performance.now() - startTime;
    const existing = this.metrics.get(middlewareName) || { totalTime: 0, callCount: 0 };
    
    this.metrics.set(middlewareName, {
      totalTime: existing.totalTime + duration,
      callCount: existing.callCount + 1,
    });
  }

  static getMetrics() {
    const result: Record<string, { avgTime: number; callCount: number }> = {};
    
    for (const [name, metrics] of this.metrics.entries()) {
      result[name] = {
        avgTime: metrics.totalTime / metrics.callCount,
        callCount: metrics.callCount,
      };
    }

    return result;
  }

  static resetMetrics() {
    this.metrics.clear();
  }
}

/**
 * Development Middleware Stack
 */
export const createDevelopmentMiddleware = (): Middleware[] => [
  timingMiddleware,
  validationMiddleware,
  sanitizerMiddleware,
  culturalContextMiddleware,
  ...MiddlewareFactory.createMiddlewareStack(),
];

/**
 * Production Middleware Stack
 */
export const createProductionMiddleware = (): Middleware[] => [
  sanitizerMiddleware,
  culturalContextMiddleware,
  batteryOptimizationMiddleware,
  ...MiddlewareFactory.createMiddlewareStack(),
];

/**
 * Middleware Configuration Hook
 */
export function configureMiddleware(config?: Partial<MiddlewareConfig>): Middleware[] {
  if (config) {
    MiddlewareFactory.configure(config);
  }

  return __DEV__ ? createDevelopmentMiddleware() : createProductionMiddleware();
}