/**
 * Analytics Middleware
 * 
 * Tracks user actions and cultural preferences for analytics
 * with privacy-compliant data collection.
 */

import { Middleware, MiddlewareAPI, Dispatch, AnyAction } from '@reduxjs/toolkit';
import type { RootState } from '../index';

interface AnalyticsConfig {
  trackUserActions: boolean;
  trackCulturalPreferences: boolean;
}

export function analyticsMiddleware(config: AnalyticsConfig): Middleware {
  return (store: MiddlewareAPI<Dispatch, RootState>) => (next: Dispatch) => (action: AnyAction) => {
    const result = next(action);
    
    if (config.trackUserActions) {
      // Track action (would integrate with analytics service)
      console.log('Analytics:', action.type);
    }

    return result;
  };
}