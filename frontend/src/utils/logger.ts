/**
 * Enhanced Logging and Debugging Utilities
 * 
 * Provides comprehensive logging with:
 * - Structured logging with levels
 * - Performance monitoring
 * - Error tracking and reporting
 * - Cultural context awareness
 * - PDPA compliance for sensitive data
 */

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: string;
  message: string;
  data?: any;
  userId?: string;
  sessionId?: string;
  culturalContext?: {
    language: string;
    stateCode?: string;
    timezone?: string;
  };
  performance?: {
    duration?: number;
    memory?: number;
    networkLatency?: number;
  };
  stack?: string;
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'critical';

type LogCategory = 
  | 'auth'
  | 'api'
  | 'cultural'
  | 'performance' 
  | 'error'
  | 'user'
  | 'navigation'
  | 'offline'
  | 'security';

interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableStorage: boolean;
  enableRemote: boolean;
  maxStoredLogs: number;
  culturalContext?: {
    language: string;
    stateCode?: string;
    timezone?: string;
  };
  sensitiveDataFields: string[];
  remoteEndpoint?: string;
}

class Logger {
  private config: LoggerConfig;
  private logBuffer: LogEntry[] = [];
  private sessionId: string;
  private performanceMarks = new Map<string, number>();

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: 'info',
      enableConsole: __DEV__,
      enableStorage: true,
      enableRemote: !__DEV__,
      maxStoredLogs: 1000,
      sensitiveDataFields: [
        'password',
        'token',
        'accessToken',
        'refreshToken',
        'mykad_number',
        'phone',
        'email',
        'address',
        'api_key',
      ],
      ...config,
    };

    this.sessionId = this.generateSessionId();
    this.setupGlobalErrorHandler();
  }

  /**
   * Log debug information
   */
  debug(message: string, data?: any, category: LogCategory = 'debug'): void {
    this.log('debug', category, message, data);
  }

  /**
   * Log general information
   */
  info(message: string, data?: any, category: LogCategory = 'info'): void {
    this.log('info', category, message, data);
  }

  /**
   * Log warnings
   */
  warn(message: string, data?: any, category: LogCategory = 'error'): void {
    this.log('warn', category, message, data);
  }

  /**
   * Log errors
   */
  error(message: string, error?: Error | any, category: LogCategory = 'error'): void {
    const errorData = error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
    } : error;

    this.log('error', category, message, errorData, error?.stack);
  }

  /**
   * Log critical issues
   */
  critical(message: string, error?: Error | any, category: LogCategory = 'error'): void {
    const errorData = error instanceof Error ? {
      name: error.name,
      message: error.message,
      stack: error.stack,
    } : error;

    this.log('critical', category, message, errorData, error?.stack);
    
    // Send critical errors immediately
    this.flushLogs();
  }

  /**
   * Log API requests and responses
   */
  apiLog(
    method: string,
    url: string,
    status: number,
    duration: number,
    requestData?: any,
    responseData?: any
  ): void {
    const sanitizedRequest = this.sanitizeSensitiveData(requestData);
    const sanitizedResponse = this.sanitizeSensitiveData(responseData);

    this.log('info', 'api', `${method} ${url} - ${status}`, {
      method,
      url,
      status,
      request: sanitizedRequest,
      response: sanitizedResponse,
    }, undefined, { duration });
  }

  /**
   * Log authentication events
   */
  authLog(event: string, success: boolean, data?: any): void {
    const sanitizedData = this.sanitizeSensitiveData(data);
    
    this.log(
      success ? 'info' : 'warn',
      'auth',
      `Auth: ${event} ${success ? 'succeeded' : 'failed'}`,
      sanitizedData
    );
  }

  /**
   * Log cultural intelligence events
   */
  culturalLog(event: string, data?: any): void {
    this.log('info', 'cultural', `Cultural: ${event}`, data);
  }

  /**
   * Log performance metrics
   */
  performanceLog(operation: string, duration: number, additionalData?: any): void {
    this.log('info', 'performance', `Performance: ${operation}`, {
      operation,
      duration,
      ...additionalData,
    }, undefined, { duration });
  }

  /**
   * Start performance timing
   */
  startTiming(label: string): void {
    this.performanceMarks.set(label, performance.now());
  }

  /**
   * End performance timing and log result
   */
  endTiming(label: string, additionalData?: any): number {
    const startTime = this.performanceMarks.get(label);
    if (!startTime) {
      this.warn(`Performance timing not found for label: ${label}`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.performanceMarks.delete(label);
    
    this.performanceLog(label, duration, additionalData);
    return duration;
  }

  /**
   * Log user interactions
   */
  userLog(action: string, screen?: string, data?: any): void {
    const sanitizedData = this.sanitizeSensitiveData(data);
    
    this.log('info', 'user', `User: ${action}${screen ? ` on ${screen}` : ''}`, {
      action,
      screen,
      ...sanitizedData,
    });
  }

  /**
   * Log navigation events
   */
  navigationLog(from: string, to: string, data?: any): void {
    this.log('info', 'navigation', `Navigation: ${from} -> ${to}`, data);
  }

  /**
   * Log offline events
   */
  offlineLog(event: string, data?: any): void {
    this.log('info', 'offline', `Offline: ${event}`, data);
  }

  /**
   * Log security events
   */
  securityLog(event: string, severity: 'low' | 'medium' | 'high', data?: any): void {
    const level: LogLevel = severity === 'high' ? 'critical' : severity === 'medium' ? 'warn' : 'info';
    
    this.log(level, 'security', `Security: ${event}`, {
      severity,
      ...this.sanitizeSensitiveData(data),
    });
  }

  /**
   * Set cultural context for all future logs
   */
  setCulturalContext(context: {
    language: string;
    stateCode?: string;
    timezone?: string;
  }): void {
    this.config.culturalContext = context;
  }

  /**
   * Core logging method
   */
  private log(
    level: LogLevel,
    category: string,
    message: string,
    data?: any,
    stack?: string,
    performance?: { duration?: number; memory?: number; networkLatency?: number }
  ): void {
    // Check if log level is enabled
    if (!this.shouldLog(level)) {
      return;
    }

    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data: this.sanitizeSensitiveData(data),
      sessionId: this.sessionId,
      culturalContext: this.config.culturalContext,
      performance,
      stack,
    };

    // Add to buffer
    this.logBuffer.push(logEntry);

    // Maintain buffer size
    if (this.logBuffer.length > this.config.maxStoredLogs) {
      this.logBuffer.shift();
    }

    // Console output
    if (this.config.enableConsole) {
      this.outputToConsole(logEntry);
    }

    // Storage (for offline access)
    if (this.config.enableStorage) {
      this.storeLog(logEntry);
    }

    // Remote logging (for production monitoring)
    if (this.config.enableRemote && (level === 'error' || level === 'critical')) {
      this.sendToRemote(logEntry);
    }
  }

  /**
   * Check if log level should be logged
   */
  private shouldLog(level: LogLevel): boolean {
    const levels: LogLevel[] = ['debug', 'info', 'warn', 'error', 'critical'];
    const currentLevelIndex = levels.indexOf(this.config.level);
    const logLevelIndex = levels.indexOf(level);
    
    return logLevelIndex >= currentLevelIndex;
  }

  /**
   * Sanitize sensitive data from logs
   */
  private sanitizeSensitiveData(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    if (Array.isArray(data)) {
      return data.map(item => this.sanitizeSensitiveData(item));
    }

    const sanitized = { ...data };
    
    for (const field of this.config.sensitiveDataFields) {
      if (sanitized[field]) {
        sanitized[field] = this.maskSensitiveValue(sanitized[field], field);
      }
    }

    // Recursively sanitize nested objects
    for (const key in sanitized) {
      if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = this.sanitizeSensitiveData(sanitized[key]);
      }
    }

    return sanitized;
  }

  /**
   * Mask sensitive values appropriately
   */
  private maskSensitiveValue(value: any, field: string): string {
    if (typeof value !== 'string') {
      return '[REDACTED]';
    }

    switch (field) {
      case 'mykad_number':
        return value.replace(/\d/g, '*').substring(0, 14); // Keep format but mask digits
      case 'phone':
        return value.replace(/\d(?=\d{4})/g, '*'); // Show last 4 digits
      case 'email':
        const [local, domain] = value.split('@');
        return `${local.charAt(0)}***@${domain}`;
      default:
        return '[REDACTED]';
    }
  }

  /**
   * Output to console with formatting
   */
  private outputToConsole(entry: LogEntry): void {
    const colors = {
      debug: '#6B7280',
      info: '#3B82F6',
      warn: '#F59E0B',
      error: '#EF4444',
      critical: '#DC2626',
    };

    const style = `color: ${colors[entry.level]}; font-weight: bold;`;
    const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}] [${entry.category}]`;

    switch (entry.level) {
      case 'debug':
        console.debug(`%c${prefix}`, style, entry.message, entry.data);
        break;
      case 'info':
        console.info(`%c${prefix}`, style, entry.message, entry.data);
        break;
      case 'warn':
        console.warn(`%c${prefix}`, style, entry.message, entry.data);
        break;
      case 'error':
      case 'critical':
        console.error(`%c${prefix}`, style, entry.message, entry.data);
        if (entry.stack) {
          console.error(entry.stack);
        }
        break;
    }
  }

  /**
   * Store log in local storage
   */
  private async storeLog(entry: LogEntry): Promise<void> {
    try {
      // In a real implementation, this would use a more robust storage mechanism
      const stored = localStorage.getItem('medimate_logs');
      const logs = stored ? JSON.parse(stored) : [];
      logs.push(entry);
      
      // Keep only recent logs
      if (logs.length > this.config.maxStoredLogs) {
        logs.splice(0, logs.length - this.config.maxStoredLogs);
      }
      
      localStorage.setItem('medimate_logs', JSON.stringify(logs));
    } catch (error) {
      console.error('Failed to store log:', error);
    }
  }

  /**
   * Send critical logs to remote endpoint
   */
  private async sendToRemote(entry: LogEntry): Promise<void> {
    if (!this.config.remoteEndpoint) {
      return;
    }

    try {
      await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...entry,
          appVersion: '1.0.0', // This should come from app config
          platform: 'mobile',
        }),
      });
    } catch (error) {
      console.error('Failed to send log to remote endpoint:', error);
    }
  }

  /**
   * Flush all logs to remote endpoint
   */
  async flushLogs(): Promise<void> {
    if (!this.config.enableRemote || !this.config.remoteEndpoint) {
      return;
    }

    const logsToFlush = [...this.logBuffer];
    this.logBuffer = [];

    try {
      await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          logs: logsToFlush,
          sessionId: this.sessionId,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.error('Failed to flush logs:', error);
      // Restore logs to buffer if sending failed
      this.logBuffer.unshift(...logsToFlush);
    }
  }

  /**
   * Get stored logs
   */
  getStoredLogs(): LogEntry[] {
    try {
      const stored = localStorage.getItem('medimate_logs');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to retrieve stored logs:', error);
      return [];
    }
  }

  /**
   * Clear stored logs
   */
  clearStoredLogs(): void {
    try {
      localStorage.removeItem('medimate_logs');
      this.logBuffer = [];
    } catch (error) {
      console.error('Failed to clear stored logs:', error);
    }
  }

  /**
   * Get log statistics
   */
  getLogStatistics(): {
    totalLogs: number;
    logsByLevel: Record<LogLevel, number>;
    logsByCategory: Record<string, number>;
    oldestLog?: string;
    newestLog?: string;
  } {
    const logs = this.getStoredLogs();
    const stats = {
      totalLogs: logs.length,
      logsByLevel: {} as Record<LogLevel, number>,
      logsByCategory: {} as Record<string, number>,
      oldestLog: logs[0]?.timestamp,
      newestLog: logs[logs.length - 1]?.timestamp,
    };

    logs.forEach(log => {
      stats.logsByLevel[log.level] = (stats.logsByLevel[log.level] || 0) + 1;
      stats.logsByCategory[log.category] = (stats.logsByCategory[log.category] || 0) + 1;
    });

    return stats;
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Setup global error handler
   */
  private setupGlobalErrorHandler(): void {
    if (typeof window !== 'undefined') {
      window.addEventListener('error', (event) => {
        this.error('Uncaught error', event.error, 'error');
      });

      window.addEventListener('unhandledrejection', (event) => {
        this.error('Unhandled promise rejection', event.reason, 'error');
      });
    }
  }

  /**
   * Create child logger with specific context
   */
  createChildLogger(category: LogCategory, additionalContext?: any): Logger {
    const childLogger = new Logger({
      ...this.config,
      culturalContext: {
        ...this.config.culturalContext,
        ...additionalContext,
      },
    });

    // Override log method to include category
    const originalLog = childLogger.log.bind(childLogger);
    childLogger.log = (level: LogLevel, cat: string, message: string, data?: any, stack?: string, performance?: any) => {
      originalLog(level, category, message, data, stack, performance);
    };

    return childLogger;
  }
}

// Create default logger instance
export const logger = new Logger({
  level: __DEV__ ? 'debug' : 'info',
  remoteEndpoint: __DEV__ ? undefined : 'https://api.medimate.my/v1/logs',
});

// Create specialized loggers for different modules
export const apiLogger = logger.createChildLogger('api');
export const authLogger = logger.createChildLogger('auth');
export const culturalLogger = logger.createChildLogger('cultural');
export const performanceLogger = logger.createChildLogger('performance');
export const securityLogger = logger.createChildLogger('security');

export default logger;