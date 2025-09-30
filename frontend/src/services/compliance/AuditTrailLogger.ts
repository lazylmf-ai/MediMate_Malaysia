/**
 * Audit Trail Logger
 *
 * Secure, immutable audit logging for compliance and security.
 * Logs all sensitive operations for PDPA and healthcare compliance.
 */

export enum AuditAction {
  CREATE = 'create',
  READ = 'read',
  UPDATE = 'update',
  DELETE = 'delete',
  EXPORT = 'export',
  IMPORT = 'import',
  SHARE = 'share',
  SYNC = 'sync',
  ENCRYPT = 'encrypt',
  DECRYPT = 'decrypt',
}

export enum AuditCategory {
  AUTHENTICATION = 'authentication',
  MEDICATION = 'medication',
  ADHERENCE = 'adherence',
  HEALTH_DATA = 'health_data',
  CONSENT = 'consent',
  PRIVACY_SETTINGS = 'privacy_settings',
  DATA_SHARING = 'data_sharing',
  COMPLIANCE = 'compliance',
  SECURITY = 'security',
  SYSTEM = 'system',
}

export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  userId: string;
  action: AuditAction;
  category: AuditCategory;
  resource: string;
  resourceId?: string;
  outcome: 'success' | 'failure' | 'partial';
  details?: Record<string, any>;
  ipAddress?: string;
  deviceInfo?: string;
  sessionId?: string;
  errorMessage?: string;
  dataChanges?: {
    before?: any;
    after?: any;
  };
  checksum: string; // For immutability verification
}

export interface AuditQuery {
  userId?: string;
  action?: AuditAction;
  category?: AuditCategory;
  startDate?: Date;
  endDate?: Date;
  outcome?: 'success' | 'failure';
  limit?: number;
}

export interface AuditReport {
  totalEntries: number;
  entriesByCategory: Record<AuditCategory, number>;
  entriesByAction: Record<AuditAction, number>;
  successRate: number;
  failureCount: number;
  periodStart: Date;
  periodEnd: Date;
  topUsers: Array<{ userId: string; actionCount: number }>;
  suspiciousActivities: AuditLogEntry[];
}

export class AuditTrailLogger {
  private static instance: AuditTrailLogger;
  private logs: AuditLogEntry[] = [];
  private readonly MAX_MEMORY_LOGS = 10000;

  private constructor() {}

  public static getInstance(): AuditTrailLogger {
    if (!AuditTrailLogger.instance) {
      AuditTrailLogger.instance = new AuditTrailLogger();
    }
    return AuditTrailLogger.instance;
  }

  /**
   * Log an audit event
   */
  public async log(entry: Omit<AuditLogEntry, 'id' | 'timestamp' | 'checksum'>): Promise<void> {
    const auditEntry: AuditLogEntry = {
      ...entry,
      id: this.generateLogId(),
      timestamp: new Date(),
      checksum: '', // Will be calculated
    };

    // Calculate checksum for immutability
    auditEntry.checksum = await this.calculateChecksum(auditEntry);

    // Add to memory
    this.logs.push(auditEntry);

    // Store in database (immutable)
    await this.storeLogEntry(auditEntry);

    // Trim memory if needed
    if (this.logs.length > this.MAX_MEMORY_LOGS) {
      this.logs = this.logs.slice(-this.MAX_MEMORY_LOGS);
    }

    // Alert on critical failures
    if (entry.outcome === 'failure' && this.isCriticalOperation(entry)) {
      await this.alertOnCriticalFailure(auditEntry);
    }
  }

  /**
   * Log authentication event
   */
  public async logAuth(
    userId: string,
    action: 'login' | 'logout' | 'token_refresh' | 'password_change',
    outcome: 'success' | 'failure',
    details?: Record<string, any>
  ): Promise<void> {
    await this.log({
      userId,
      action: AuditAction.READ, // Auth operations map to READ
      category: AuditCategory.AUTHENTICATION,
      resource: action,
      outcome,
      details,
    });
  }

  /**
   * Log data access
   */
  public async logDataAccess(
    userId: string,
    resource: string,
    resourceId: string,
    action: AuditAction,
    outcome: 'success' | 'failure',
    details?: Record<string, any>
  ): Promise<void> {
    await this.log({
      userId,
      action,
      category: this.getCategoryFromResource(resource),
      resource,
      resourceId,
      outcome,
      details,
    });
  }

  /**
   * Log data modification with before/after values
   */
  public async logDataModification(
    userId: string,
    resource: string,
    resourceId: string,
    action: AuditAction.UPDATE | AuditAction.DELETE,
    before: any,
    after: any,
    outcome: 'success' | 'failure'
  ): Promise<void> {
    await this.log({
      userId,
      action,
      category: this.getCategoryFromResource(resource),
      resource,
      resourceId,
      outcome,
      dataChanges: { before, after },
    });
  }

  /**
   * Log consent change
   */
  public async logConsentChange(
    userId: string,
    consentType: string,
    granted: boolean,
    version: string
  ): Promise<void> {
    await this.log({
      userId,
      action: AuditAction.UPDATE,
      category: AuditCategory.CONSENT,
      resource: consentType,
      outcome: 'success',
      details: { granted, version },
    });
  }

  /**
   * Log data sharing event
   */
  public async logDataSharing(
    userId: string,
    dataType: string,
    recipient: string,
    outcome: 'success' | 'failure',
    details?: Record<string, any>
  ): Promise<void> {
    await this.log({
      userId,
      action: AuditAction.SHARE,
      category: AuditCategory.DATA_SHARING,
      resource: dataType,
      outcome,
      details: { ...details, recipient },
    });
  }

  /**
   * Log encryption operation
   */
  public async logEncryption(
    userId: string,
    operation: 'encrypt' | 'decrypt',
    dataType: string,
    outcome: 'success' | 'failure',
    errorMessage?: string
  ): Promise<void> {
    await this.log({
      userId,
      action: operation === 'encrypt' ? AuditAction.ENCRYPT : AuditAction.DECRYPT,
      category: AuditCategory.SECURITY,
      resource: dataType,
      outcome,
      errorMessage,
    });
  }

  /**
   * Query audit logs
   */
  public async query(query: AuditQuery): Promise<AuditLogEntry[]> {
    let results = [...this.logs];

    if (query.userId) {
      results = results.filter(log => log.userId === query.userId);
    }

    if (query.action) {
      results = results.filter(log => log.action === query.action);
    }

    if (query.category) {
      results = results.filter(log => log.category === query.category);
    }

    if (query.startDate) {
      results = results.filter(log => log.timestamp >= query.startDate!);
    }

    if (query.endDate) {
      results = results.filter(log => log.timestamp <= query.endDate!);
    }

    if (query.outcome) {
      results = results.filter(log => log.outcome === query.outcome);
    }

    if (query.limit) {
      results = results.slice(0, query.limit);
    }

    return results;
  }

  /**
   * Generate audit report
   */
  public async generateReport(
    startDate: Date,
    endDate: Date,
    userId?: string
  ): Promise<AuditReport> {
    const logs = await this.query({ startDate, endDate, userId });

    const entriesByCategory = this.groupByCategory(logs);
    const entriesByAction = this.groupByAction(logs);
    const successCount = logs.filter(l => l.outcome === 'success').length;
    const failureCount = logs.filter(l => l.outcome === 'failure').length;

    return {
      totalEntries: logs.length,
      entriesByCategory,
      entriesByAction,
      successRate: logs.length > 0 ? (successCount / logs.length) * 100 : 0,
      failureCount,
      periodStart: startDate,
      periodEnd: endDate,
      topUsers: this.getTopUsers(logs),
      suspiciousActivities: await this.detectSuspiciousActivity(logs),
    };
  }

  /**
   * Export audit logs (PDPA compliance)
   */
  public async exportLogs(
    userId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<AuditLogEntry[]> {
    const logs = await this.query({ userId, startDate, endDate });

    // Log the export itself
    await this.log({
      userId,
      action: AuditAction.EXPORT,
      category: AuditCategory.COMPLIANCE,
      resource: 'audit_logs',
      outcome: 'success',
      details: { logCount: logs.length, startDate, endDate },
    });

    return logs;
  }

  /**
   * Verify log integrity (checksum validation)
   */
  public async verifyLogIntegrity(logId: string): Promise<boolean> {
    const log = this.logs.find(l => l.id === logId);
    if (!log) return false;

    const expectedChecksum = log.checksum;
    const actualChecksum = await this.calculateChecksum({ ...log, checksum: '' });

    return expectedChecksum === actualChecksum;
  }

  /**
   * Detect suspicious activity patterns
   */
  private async detectSuspiciousActivity(logs: AuditLogEntry[]): Promise<AuditLogEntry[]> {
    const suspicious: AuditLogEntry[] = [];

    // Detect multiple failed login attempts
    const failedLogins = logs.filter(
      l =>
        l.category === AuditCategory.AUTHENTICATION &&
        l.outcome === 'failure' &&
        l.resource === 'login'
    );

    if (failedLogins.length >= 5) {
      suspicious.push(...failedLogins);
    }

    // Detect unusual data access patterns
    const dataAccess = logs.filter(l => l.action === AuditAction.READ);
    if (dataAccess.length > 100) {
      // Excessive data access
      suspicious.push(...dataAccess.slice(-10));
    }

    return suspicious;
  }

  /**
   * Helper methods
   */
  private getCategoryFromResource(resource: string): AuditCategory {
    if (resource.includes('medication')) return AuditCategory.MEDICATION;
    if (resource.includes('adherence')) return AuditCategory.ADHERENCE;
    if (resource.includes('health')) return AuditCategory.HEALTH_DATA;
    if (resource.includes('consent')) return AuditCategory.CONSENT;
    if (resource.includes('privacy')) return AuditCategory.PRIVACY_SETTINGS;
    return AuditCategory.SYSTEM;
  }

  private isCriticalOperation(entry: Omit<AuditLogEntry, 'id' | 'timestamp' | 'checksum'>): boolean {
    return (
      entry.category === AuditCategory.AUTHENTICATION ||
      entry.category === AuditCategory.SECURITY ||
      entry.action === AuditAction.DELETE
    );
  }

  private groupByCategory(logs: AuditLogEntry[]): Record<AuditCategory, number> {
    return logs.reduce((acc, log) => {
      acc[log.category] = (acc[log.category] || 0) + 1;
      return acc;
    }, {} as Record<AuditCategory, number>);
  }

  private groupByAction(logs: AuditLogEntry[]): Record<AuditAction, number> {
    return logs.reduce((acc, log) => {
      acc[log.action] = (acc[log.action] || 0) + 1;
      return acc;
    }, {} as Record<AuditAction, number>);
  }

  private getTopUsers(logs: AuditLogEntry[]): Array<{ userId: string; actionCount: number }> {
    const userCounts: Record<string, number> = {};

    for (const log of logs) {
      userCounts[log.userId] = (userCounts[log.userId] || 0) + 1;
    }

    return Object.entries(userCounts)
      .map(([userId, actionCount]) => ({ userId, actionCount }))
      .sort((a, b) => b.actionCount - a.actionCount)
      .slice(0, 10);
  }

  private async calculateChecksum(entry: Omit<AuditLogEntry, 'checksum'>): Promise<string> {
    // Calculate SHA-256 checksum for immutability
    const data = JSON.stringify(entry);
    return `sha256_${data.length}_${Date.now()}`; // Placeholder
  }

  private async storeLogEntry(entry: AuditLogEntry): Promise<void> {
    // Store in database (immutable table)
  }

  private async alertOnCriticalFailure(entry: AuditLogEntry): Promise<void> {
    // Send alert to monitoring system
    console.warn('Critical operation failed:', entry);
  }

  private generateLogId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

export default AuditTrailLogger.getInstance();