/**
 * Error Reporting Middleware
 * 
 * Captures and reports Redux action errors with cultural context
 * for debugging and analytics purposes.
 */

import { Middleware, MiddlewareAPI, Dispatch, AnyAction } from '@reduxjs/toolkit';
import type { RootState } from '../index';

interface ErrorReportingConfig {
  reportToService: boolean;
  localLogging: boolean;
}

interface ErrorReport {
  id: string;
  timestamp: number;
  actionType: string;
  error: any;
  culturalContext?: any;
  userAgent?: string;
  stackTrace?: string;
  stateSnapshot?: any;
}

export class ErrorReportingService {
  private static errors: ErrorReport[] = [];

  static reportError(report: ErrorReport) {
    this.errors.push(report);

    // Limit error storage
    if (this.errors.length > 100) {
      this.errors.shift();
    }

    console.error('Redux Error:', report);
  }

  static getErrors(): ErrorReport[] {
    return [...this.errors];
  }

  static clearErrors() {
    this.errors = [];
  }
}

export function errorReportingMiddleware(config: ErrorReportingConfig): Middleware {
  return (store: MiddlewareAPI<Dispatch, RootState>) => (next: Dispatch) => (action: AnyAction) => {
    try {
      return next(action);
    } catch (error) {
      const state = store.getState();
      
      const report: ErrorReport = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: Date.now(),
        actionType: action.type,
        error: error instanceof Error ? error.message : String(error),
        culturalContext: state.cultural.profile,
        stackTrace: error instanceof Error ? error.stack : undefined,
        stateSnapshot: __DEV__ ? state : undefined,
      };

      ErrorReportingService.reportError(report);
      
      // Re-throw error to maintain normal error handling
      throw error;
    }
  };
}