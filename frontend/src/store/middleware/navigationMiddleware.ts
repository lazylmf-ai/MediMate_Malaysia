/**
 * Navigation Middleware
 * 
 * Tracks navigation events, screen views, and navigation timing
 * with cultural context awareness for analytics and optimization.
 */

import { Middleware, MiddlewareAPI, Dispatch, AnyAction } from '@reduxjs/toolkit';
import type { RootState } from '../index';

interface NavigationConfig {
  trackScreenViews: boolean;
  trackNavigationTiming: boolean;
}

interface NavigationEvent {
  type: 'screen_view' | 'navigation_start' | 'navigation_complete' | 'navigation_error';
  screen?: string;
  previousScreen?: string;
  duration?: number;
  culturalContext?: any;
  timestamp: number;
}

/**
 * Navigation Analytics Store
 */
export class NavigationAnalytics {
  private static events: NavigationEvent[] = [];
  private static navigationStartTimes: Map<string, number> = new Map();
  private static currentScreen: string | null = null;
  private static screenViewTimes: Map<string, number> = new Map();

  static trackScreenView(screen: string, culturalContext?: any) {
    const event: NavigationEvent = {
      type: 'screen_view',
      screen,
      previousScreen: this.currentScreen || undefined,
      culturalContext,
      timestamp: Date.now(),
    };

    this.events.push(event);
    
    // Track time spent on previous screen
    if (this.currentScreen && this.screenViewTimes.has(this.currentScreen)) {
      const timeSpent = Date.now() - this.screenViewTimes.get(this.currentScreen)!;
      console.log(`Screen view time: ${this.currentScreen} - ${timeSpent}ms`);
    }

    this.currentScreen = screen;
    this.screenViewTimes.set(screen, Date.now());

    // Limit events array size
    if (this.events.length > 100) {
      this.events.shift();
    }
  }

  static startNavigationTiming(navigationKey: string) {
    this.navigationStartTimes.set(navigationKey, Date.now());
  }

  static endNavigationTiming(navigationKey: string, screen?: string, culturalContext?: any) {
    const startTime = this.navigationStartTimes.get(navigationKey);
    if (startTime) {
      const duration = Date.now() - startTime;
      
      const event: NavigationEvent = {
        type: 'navigation_complete',
        screen,
        duration,
        culturalContext,
        timestamp: Date.now(),
      };

      this.events.push(event);
      this.navigationStartTimes.delete(navigationKey);

      // Log slow navigations
      if (duration > 1000) {
        console.warn(`Slow navigation to ${screen}: ${duration}ms`);
      }
    }
  }

  static trackNavigationError(screen?: string, error?: any, culturalContext?: any) {
    const event: NavigationEvent = {
      type: 'navigation_error',
      screen,
      culturalContext,
      timestamp: Date.now(),
    };

    this.events.push(event);
    console.error('Navigation error:', { screen, error, culturalContext });
  }

  static getEvents(): NavigationEvent[] {
    return [...this.events];
  }

  static getCurrentScreen(): string | null {
    return this.currentScreen;
  }

  static getScreenViewDuration(screen: string): number | null {
    const startTime = this.screenViewTimes.get(screen);
    return startTime ? Date.now() - startTime : null;
  }

  static getNavigationMetrics() {
    const metrics = {
      totalNavigations: 0,
      averageNavigationTime: 0,
      screenViews: new Map<string, number>(),
      errorCount: 0,
      slowNavigations: 0,
    };

    let totalNavigationTime = 0;
    let navigationCount = 0;

    for (const event of this.events) {
      switch (event.type) {
        case 'screen_view':
          if (event.screen) {
            const count = metrics.screenViews.get(event.screen) || 0;
            metrics.screenViews.set(event.screen, count + 1);
          }
          break;
        
        case 'navigation_complete':
          if (event.duration) {
            totalNavigationTime += event.duration;
            navigationCount++;
            metrics.totalNavigations++;
            
            if (event.duration > 1000) {
              metrics.slowNavigations++;
            }
          }
          break;
        
        case 'navigation_error':
          metrics.errorCount++;
          break;
      }
    }

    if (navigationCount > 0) {
      metrics.averageNavigationTime = totalNavigationTime / navigationCount;
    }

    return metrics;
  }

  static clearEvents() {
    this.events = [];
    this.navigationStartTimes.clear();
    this.screenViewTimes.clear();
    this.currentScreen = null;
  }
}

/**
 * Cultural Navigation Patterns
 */
export class CulturalNavigationPatterns {
  private static patterns: Map<string, { screens: string[]; frequency: number }> = new Map();

  static trackPattern(culturalContext: any, screens: string[]) {
    const patternKey = this.generatePatternKey(culturalContext);
    const existing = this.patterns.get(patternKey) || { screens: [], frequency: 0 };
    
    this.patterns.set(patternKey, {
      screens: [...existing.screens, ...screens],
      frequency: existing.frequency + 1,
    });
  }

  private static generatePatternKey(culturalContext: any): string {
    if (!culturalContext) return 'default';
    
    const { language, timezone, prayerTimes, festivals } = culturalContext;
    return `${language}-${timezone}-${prayerTimes?.enabled ? 'prayer' : 'no-prayer'}-${Object.keys(festivals || {}).join(',')}`;
  }

  static getPatterns(): Map<string, { screens: string[]; frequency: number }> {
    return new Map(this.patterns);
  }

  static getMostCommonPattern(culturalContext: any): string[] {
    const patternKey = this.generatePatternKey(culturalContext);
    const pattern = this.patterns.get(patternKey);
    return pattern ? pattern.screens : [];
  }

  static clearPatterns() {
    this.patterns.clear();
  }
}

/**
 * Navigation Middleware Factory
 */
export function navigationMiddleware(config: NavigationConfig): Middleware {
  return (store: MiddlewareAPI<Dispatch, RootState>) => (next: Dispatch) => (action: AnyAction) => {
    const state = store.getState();
    const culturalContext = state.cultural.profile ? {
      language: state.cultural.profile.language,
      timezone: state.cultural.profile.timezone,
      prayerTimes: state.cultural.profile.prayerTimes,
      festivals: state.cultural.profile.festivals,
    } : undefined;

    // Track navigation-related actions
    if (isNavigationAction(action)) {
      handleNavigationAction(action, culturalContext, config);
    }

    // Track screen-related actions
    if (isScreenAction(action)) {
      handleScreenAction(action, culturalContext, config);
    }

    // Track authentication navigation
    if (isAuthNavigationAction(action)) {
      handleAuthNavigationAction(action, culturalContext, config);
    }

    // Track cultural navigation
    if (isCulturalNavigationAction(action)) {
      handleCulturalNavigationAction(action, culturalContext, config);
    }

    return next(action);
  };
}

/**
 * Navigation Action Handlers
 */
function handleNavigationAction(action: AnyAction, culturalContext?: any, config?: NavigationConfig) {
  switch (action.type) {
    case '@@router/LOCATION_CHANGE':
    case '@react-navigation/NAVIGATE':
      if (config?.trackNavigationTiming) {
        const navigationKey = action.payload?.name || action.payload?.routeName || 'unknown';
        NavigationAnalytics.startNavigationTiming(navigationKey);
      }
      break;

    case '@react-navigation/SET_PARAMS':
    case '@react-navigation/RESET':
      if (config?.trackNavigationTiming) {
        const screen = action.payload?.name || action.payload?.routeName;
        NavigationAnalytics.endNavigationTiming('navigation', screen, culturalContext);
      }
      break;

    case 'NAVIGATION_ERROR':
      NavigationAnalytics.trackNavigationError(
        action.payload?.screen,
        action.payload?.error,
        culturalContext
      );
      break;
  }
}

function handleScreenAction(action: AnyAction, culturalContext?: any, config?: NavigationConfig) {
  if (config?.trackScreenViews && action.type === 'SCREEN_VIEW') {
    const screen = action.payload?.screen || action.payload?.routeName;
    if (screen) {
      NavigationAnalytics.trackScreenView(screen, culturalContext);
      
      // Track cultural navigation patterns
      const previousScreen = NavigationAnalytics.getCurrentScreen();
      if (previousScreen && culturalContext) {
        CulturalNavigationPatterns.trackPattern(culturalContext, [previousScreen, screen]);
      }
    }
  }
}

function handleAuthNavigationAction(action: AnyAction, culturalContext?: any, config?: NavigationConfig) {
  switch (action.type) {
    case 'auth/loginSuccess':
      NavigationAnalytics.trackScreenView('post-login', culturalContext);
      break;

    case 'auth/logout':
      NavigationAnalytics.trackScreenView('post-logout', culturalContext);
      break;

    case 'auth/sessionExpired':
      NavigationAnalytics.trackNavigationError('session-expired', 'Session expired', culturalContext);
      break;
  }
}

function handleCulturalNavigationAction(action: AnyAction, culturalContext?: any, config?: NavigationConfig) {
  switch (action.type) {
    case 'cultural/profileCompleted':
      NavigationAnalytics.trackScreenView('cultural-profile-complete', culturalContext);
      break;

    case 'cultural/languageChanged':
      NavigationAnalytics.trackScreenView('language-changed', {
        ...culturalContext,
        newLanguage: action.payload?.language,
      });
      break;

    case 'cultural/prayerTimesEnabled':
      NavigationAnalytics.trackScreenView('prayer-times-enabled', culturalContext);
      break;
  }
}

/**
 * Action Type Checkers
 */
function isNavigationAction(action: AnyAction): boolean {
  const navigationActionTypes = [
    '@@router/',
    '@react-navigation/',
    'NAVIGATION_',
    'NAVIGATE_',
  ];

  return navigationActionTypes.some(prefix => action.type.startsWith(prefix));
}

function isScreenAction(action: AnyAction): boolean {
  const screenActionTypes = [
    'SCREEN_VIEW',
    'SCREEN_FOCUS',
    'SCREEN_BLUR',
    'TAB_PRESS',
  ];

  return screenActionTypes.includes(action.type);
}

function isAuthNavigationAction(action: AnyAction): boolean {
  const authNavigationTypes = [
    'auth/loginSuccess',
    'auth/logout',
    'auth/sessionExpired',
    'auth/tokenRefreshFailed',
  ];

  return authNavigationTypes.includes(action.type);
}

function isCulturalNavigationAction(action: AnyAction): boolean {
  const culturalNavigationTypes = [
    'cultural/profileCompleted',
    'cultural/languageChanged',
    'cultural/prayerTimesEnabled',
    'cultural/festivalPreferencesUpdated',
    'cultural/familyStructureUpdated',
  ];

  return culturalNavigationTypes.includes(action.type);
}

/**
 * Navigation Performance Optimizer
 */
export class NavigationPerformanceOptimizer {
  private static slowScreens: Set<string> = new Set();
  private static optimizationRules: Map<string, OptimizationRule> = new Map();

  static reportSlowScreen(screen: string, duration: number) {
    if (duration > 1000) {
      this.slowScreens.add(screen);
      console.warn(`Slow screen detected: ${screen} - ${duration}ms`);
      
      // Apply optimization rules
      this.applyOptimization(screen);
    }
  }

  static addOptimizationRule(screen: string, rule: OptimizationRule) {
    this.optimizationRules.set(screen, rule);
  }

  private static applyOptimization(screen: string) {
    const rule = this.optimizationRules.get(screen);
    if (rule) {
      rule.apply(screen);
    }
  }

  static getSlowScreens(): string[] {
    return Array.from(this.slowScreens);
  }

  static isSlowScreen(screen: string): boolean {
    return this.slowScreens.has(screen);
  }

  static clearSlowScreens() {
    this.slowScreens.clear();
  }
}

interface OptimizationRule {
  apply: (screen: string) => void;
}

/**
 * Navigation Middleware Analytics Reporter
 */
export class NavigationMiddlewareReporter {
  static generateDailyReport() {
    const metrics = NavigationAnalytics.getNavigationMetrics();
    const patterns = CulturalNavigationPatterns.getPatterns();
    const slowScreens = NavigationPerformanceOptimizer.getSlowScreens();

    const report = {
      date: new Date().toISOString().split('T')[0],
      metrics,
      culturalPatterns: Array.from(patterns.entries()).map(([key, value]) => ({
        pattern: key,
        frequency: value.frequency,
        commonScreens: value.screens.slice(-10), // Last 10 screens
      })),
      performance: {
        slowScreens,
        slowNavigationPercentage: metrics.totalNavigations > 0 
          ? (metrics.slowNavigations / metrics.totalNavigations) * 100 
          : 0,
      },
      recommendations: this.generateRecommendations(metrics, slowScreens),
    };

    return report;
  }

  private static generateRecommendations(metrics: any, slowScreens: string[]) {
    const recommendations = [];

    if (metrics.averageNavigationTime > 500) {
      recommendations.push('Consider optimizing navigation performance - average time is high');
    }

    if (metrics.errorCount > metrics.totalNavigations * 0.05) {
      recommendations.push('High navigation error rate detected - review navigation guards');
    }

    if (slowScreens.length > 0) {
      recommendations.push(`Optimize slow screens: ${slowScreens.join(', ')}`);
    }

    return recommendations;
  }
}