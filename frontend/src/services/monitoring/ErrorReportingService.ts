/**
 * Error Reporting Service
 *
 * Centralized error tracking, crash reporting, and issue management
 * with Sentry integration for production error monitoring.
 */

export interface ErrorReport {
  id: string;
  message: string;
  stack?: string;
  level: 'info' | 'warning' | 'error' | 'fatal';
  timestamp: Date;
  context?: ErrorContext;
  user?: UserContext;
  device?: DeviceContext;
  tags?: Record<string, string>;
  fingerprint?: string[];
}

export interface ErrorContext {
  component?: string;
  action?: string;
  route?: string;
  apiEndpoint?: string;
  networkStatus?: string;
  additionalData?: Record<string, any>;
}

export interface UserContext {
  userId?: string;
  sessionId: string;
  userType?: 'patient' | 'caregiver' | 'provider';
  language?: string;
}

export interface DeviceContext {
  platform: 'ios' | 'android';
  osVersion: string;
  appVersion: string;
  deviceModel: string;
  screenSize: string;
  isEmulator: boolean;
  networkType?: string;
}

export interface ErrorStatistics {
  totalErrors: number;
  errorsByLevel: Record<string, number>;
  errorsByComponent: Record<string, number>;
  topErrors: Array<{ message: string; count: number }>;
  errorRate: number;
}

export class ErrorReportingService {
  private static instance: ErrorReportingService;
  private errors: ErrorReport[] = [];
  private errorCounts: Map<string, number> = new Map();
  private sentryEnabled: boolean = false;
  private deviceContext?: DeviceContext;
  private userContext?: UserContext;

  private constructor() {
    this.initializeSentry();
    this.setupGlobalErrorHandlers();
  }

  public static getInstance(): ErrorReportingService {
    if (!ErrorReportingService.instance) {
      ErrorReportingService.instance = new ErrorReportingService();
    }
    return ErrorReportingService.instance;
  }

  /**
   * Report an error
   */
  public reportError(
    error: Error | string,
    level: ErrorReport['level'] = 'error',
    context?: ErrorContext
  ): void {
    const errorReport = this.createErrorReport(error, level, context);

    this.errors.push(errorReport);

    // Track error frequency
    const fingerprint = this.generateFingerprint(errorReport);
    const count = this.errorCounts.get(fingerprint) || 0;
    this.errorCounts.set(fingerprint, count + 1);

    // Keep last 1000 errors
    if (this.errors.length > 1000) {
      this.errors = this.errors.slice(-1000);
    }

    // Send to Sentry
    if (this.sentryEnabled) {
      this.sendToSentry(errorReport);
    }

    // Send to backend
    this.sendToBackend(errorReport);

    // Log critical errors
    if (level === 'fatal') {
      console.error('FATAL ERROR:', errorReport);
    }
  }

  /**
   * Report API error
   */
  public reportApiError(
    endpoint: string,
    statusCode: number,
    message: string,
    context?: Record<string, any>
  ): void {
    this.reportError(
      new Error(`API Error: ${statusCode} - ${message}`),
      statusCode >= 500 ? 'error' : 'warning',
      {
        apiEndpoint: endpoint,
        additionalData: {
          statusCode,
          ...context,
        },
      }
    );
  }

  /**
   * Report network error
   */
  public reportNetworkError(
    endpoint: string,
    error: Error,
    networkStatus: string
  ): void {
    this.reportError(error, 'error', {
      apiEndpoint: endpoint,
      networkStatus,
      additionalData: {
        type: 'network_error',
      },
    });
  }

  /**
   * Report component error
   */
  public reportComponentError(
    component: string,
    error: Error,
    action?: string
  ): void {
    this.reportError(error, 'error', {
      component,
      action,
      additionalData: {
        type: 'component_error',
      },
    });
  }

  /**
   * Report validation error
   */
  public reportValidationError(
    field: string,
    message: string,
    value?: any
  ): void {
    this.reportError(
      new Error(`Validation Error: ${field} - ${message}`),
      'warning',
      {
        additionalData: {
          type: 'validation_error',
          field,
          value,
        },
      }
    );
  }

  /**
   * Report permission error
   */
  public reportPermissionError(
    permission: string,
    reason?: string
  ): void {
    this.reportError(
      new Error(`Permission Denied: ${permission}`),
      'warning',
      {
        additionalData: {
          type: 'permission_error',
          permission,
          reason,
        },
      }
    );
  }

  /**
   * Set user context
   */
  public setUserContext(context: UserContext): void {
    this.userContext = context;

    if (this.sentryEnabled) {
      // Set Sentry user context
      // Sentry.setUser({ id: context.userId, sessionId: context.sessionId });
    }
  }

  /**
   * Set device context
   */
  public setDeviceContext(context: DeviceContext): void {
    this.deviceContext = context;

    if (this.sentryEnabled) {
      // Set Sentry device context
      // Sentry.setContext('device', context);
    }
  }

  /**
   * Add breadcrumb for debugging
   */
  public addBreadcrumb(
    message: string,
    category: string,
    level: 'info' | 'warning' | 'error' = 'info',
    data?: Record<string, any>
  ): void {
    if (this.sentryEnabled) {
      // Sentry.addBreadcrumb({ message, category, level, data });
    }
  }

  /**
   * Get error statistics
   */
  public getErrorStatistics(
    startTime?: Date,
    endTime?: Date
  ): ErrorStatistics {
    let errors = [...this.errors];

    if (startTime) {
      errors = errors.filter(e => e.timestamp >= startTime);
    }

    if (endTime) {
      errors = errors.filter(e => e.timestamp <= endTime);
    }

    const errorsByLevel: Record<string, number> = {};
    const errorsByComponent: Record<string, number> = {};

    errors.forEach(error => {
      // Count by level
      errorsByLevel[error.level] = (errorsByLevel[error.level] || 0) + 1;

      // Count by component
      if (error.context?.component) {
        errorsByComponent[error.context.component] =
          (errorsByComponent[error.context.component] || 0) + 1;
      }
    });

    // Get top errors
    const errorFrequency: Map<string, number> = new Map();
    errors.forEach(error => {
      const key = error.message;
      errorFrequency.set(key, (errorFrequency.get(key) || 0) + 1);
    });

    const topErrors = Array.from(errorFrequency.entries())
      .map(([message, count]) => ({ message, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalErrors: errors.length,
      errorsByLevel,
      errorsByComponent,
      topErrors,
      errorRate: this.calculateErrorRate(errors),
    };
  }

  /**
   * Get errors by level
   */
  public getErrorsByLevel(level: ErrorReport['level']): ErrorReport[] {
    return this.errors.filter(e => e.level === level);
  }

  /**
   * Get errors by component
   */
  public getErrorsByComponent(component: string): ErrorReport[] {
    return this.errors.filter(e => e.context?.component === component);
  }

  /**
   * Create error report
   */
  private createErrorReport(
    error: Error | string,
    level: ErrorReport['level'],
    context?: ErrorContext
  ): ErrorReport {
    const message = typeof error === 'string' ? error : error.message;
    const stack = typeof error === 'object' ? error.stack : undefined;

    const report: ErrorReport = {
      id: this.generateErrorId(),
      message,
      stack,
      level,
      timestamp: new Date(),
      context,
      user: this.userContext,
      device: this.deviceContext,
    };

    report.fingerprint = [this.generateFingerprint(report)];

    return report;
  }

  /**
   * Generate error fingerprint for grouping
   */
  private generateFingerprint(error: ErrorReport): string {
    const parts = [
      error.message,
      error.context?.component || '',
      error.context?.action || '',
    ];
    return parts.filter(Boolean).join('::');
  }

  /**
   * Calculate error rate (errors per minute)
   */
  private calculateErrorRate(errors: ErrorReport[]): number {
    if (errors.length === 0) return 0;

    const firstError = errors[0];
    const lastError = errors[errors.length - 1];
    const duration =
      (lastError.timestamp.getTime() - firstError.timestamp.getTime()) / (60 * 1000);

    return duration > 0 ? errors.length / duration : 0;
  }

  /**
   * Initialize Sentry
   */
  private initializeSentry(): void {
    // In production, initialize Sentry SDK:
    // Sentry.init({
    //   dsn: 'YOUR_SENTRY_DSN',
    //   environment: __DEV__ ? 'development' : 'production',
    //   tracesSampleRate: 1.0,
    // });
    // this.sentryEnabled = true;
  }

  /**
   * Setup global error handlers
   */
  private setupGlobalErrorHandlers(): void {
    // Catch unhandled promise rejections
    if (typeof window !== 'undefined') {
      window.addEventListener('unhandledrejection', event => {
        this.reportError(
          new Error(`Unhandled Promise Rejection: ${event.reason}`),
          'error',
          { additionalData: { type: 'unhandled_rejection' } }
        );
      });
    }

    // React Native specific error handlers could be added here
    // ErrorUtils.setGlobalHandler((error, isFatal) => {
    //   this.reportError(error, isFatal ? 'fatal' : 'error');
    // });
  }

  /**
   * Send error to Sentry
   */
  private sendToSentry(error: ErrorReport): void {
    // Sentry.captureException(new Error(error.message), {
    //   level: error.level,
    //   contexts: {
    //     error: error.context,
    //     user: error.user,
    //     device: error.device,
    //   },
    //   tags: error.tags,
    //   fingerprint: error.fingerprint,
    // });
  }

  /**
   * Send error to backend
   */
  private async sendToBackend(error: ErrorReport): Promise<void> {
    // Implementation would send to backend error tracking API
    // Example: await api.post('/monitoring/errors', error);
  }

  /**
   * Generate error ID
   */
  private generateErrorId(): string {
    return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Clear old errors
   */
  public clearOldErrors(daysToKeep: number = 7): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    this.errors = this.errors.filter(e => e.timestamp >= cutoffDate);
  }
}

export default ErrorReportingService.getInstance();