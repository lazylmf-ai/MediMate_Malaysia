/**
 * Compliance Monitoring Service
 *
 * Extends backend audit services to mobile app for PDPA and healthcare compliance.
 * Tracks compliance events, reports metrics, and enforces data protection policies.
 */

export enum ComplianceEventType {
  DATA_ACCESS = 'data_access',
  CONSENT_CHANGED = 'consent_changed',
  DATA_EXPORTED = 'data_exported',
  DATA_DELETED = 'data_deleted',
  PRIVACY_SETTING_CHANGED = 'privacy_setting_changed',
  THIRD_PARTY_SHARING = 'third_party_sharing',
  OFFLINE_SYNC = 'offline_sync',
  ENCRYPTION_OPERATION = 'encryption_operation',
}

export interface ComplianceEvent {
  id: string;
  type: ComplianceEventType;
  timestamp: Date;
  userId: string;
  dataType: string;
  action: string;
  purpose: string;
  metadata?: Record<string, any>;
  consentVersion?: string;
}

export interface ComplianceMetrics {
  totalEvents: number;
  eventsByType: Record<ComplianceEventType, number>;
  consentViolations: number;
  dataAccessAttempts: number;
  encryptionFailures: number;
  lastAuditDate: Date;
}

export interface ComplianceNotification {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  type: string;
  message: string;
  timestamp: Date;
  actionRequired: boolean;
}

export class ComplianceMonitoringService {
  private static instance: ComplianceMonitoringService;
  private events: ComplianceEvent[] = [];
  private backendSyncEnabled: boolean = true;
  private backendSyncInterval: number = 60000; // 1 minute

  private constructor() {
    this.startBackendSync();
  }

  public static getInstance(): ComplianceMonitoringService {
    if (!ComplianceMonitoringService.instance) {
      ComplianceMonitoringService.instance = new ComplianceMonitoringService();
    }
    return ComplianceMonitoringService.instance;
  }

  /**
   * Track a compliance event
   */
  public async trackEvent(event: Omit<ComplianceEvent, 'id' | 'timestamp'>): Promise<void> {
    const complianceEvent: ComplianceEvent = {
      ...event,
      id: this.generateEventId(),
      timestamp: new Date(),
    };

    this.events.push(complianceEvent);

    // Check for compliance violations
    await this.checkCompliance(complianceEvent);

    // Store locally for audit trail
    await this.storeEventLocally(complianceEvent);

    // Sync to backend if critical
    if (this.isCriticalEvent(complianceEvent)) {
      await this.syncEventToBackend(complianceEvent);
    }
  }

  /**
   * Track data access event (PDPA requirement)
   */
  public async trackDataAccess(
    userId: string,
    dataType: string,
    purpose: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.trackEvent({
      userId,
      type: ComplianceEventType.DATA_ACCESS,
      dataType,
      action: 'read',
      purpose,
      metadata,
    });
  }

  /**
   * Track consent change event
   */
  public async trackConsentChange(
    userId: string,
    consentType: string,
    granted: boolean,
    version: string
  ): Promise<void> {
    await this.trackEvent({
      userId,
      type: ComplianceEventType.CONSENT_CHANGED,
      dataType: consentType,
      action: granted ? 'granted' : 'revoked',
      purpose: 'consent_management',
      consentVersion: version,
      metadata: { granted },
    });
  }

  /**
   * Track data deletion event (PDPA right to erasure)
   */
  public async trackDataDeletion(
    userId: string,
    dataType: string,
    reason: string
  ): Promise<void> {
    await this.trackEvent({
      userId,
      type: ComplianceEventType.DATA_DELETED,
      dataType,
      action: 'delete',
      purpose: reason,
    });
  }

  /**
   * Get compliance metrics for reporting
   */
  public getComplianceMetrics(): ComplianceMetrics {
    const eventsByType = this.events.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {} as Record<ComplianceEventType, number>);

    return {
      totalEvents: this.events.length,
      eventsByType,
      consentViolations: this.countConsentViolations(),
      dataAccessAttempts: eventsByType[ComplianceEventType.DATA_ACCESS] || 0,
      encryptionFailures: this.countEncryptionFailures(),
      lastAuditDate: new Date(),
    };
  }

  /**
   * Export compliance audit trail (PDPA requirement)
   */
  public async exportAuditTrail(
    userId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<ComplianceEvent[]> {
    let events = this.events.filter(e => e.userId === userId);

    if (startDate) {
      events = events.filter(e => e.timestamp >= startDate);
    }
    if (endDate) {
      events = events.filter(e => e.timestamp <= endDate);
    }

    // Track the export itself
    await this.trackEvent({
      userId,
      type: ComplianceEventType.DATA_EXPORTED,
      dataType: 'audit_trail',
      action: 'export',
      purpose: 'user_request',
      metadata: { startDate, endDate, eventCount: events.length },
    });

    return events;
  }

  /**
   * Check compliance violations
   */
  private async checkCompliance(event: ComplianceEvent): Promise<void> {
    // Check if action violates any compliance rules
    // This would integrate with ConsentManagementService and PrivacyControlValidator

    // Example: Check if data access has valid consent
    if (event.type === ComplianceEventType.DATA_ACCESS) {
      // Validation logic here
    }
  }

  /**
   * Determine if event is critical and requires immediate sync
   */
  private isCriticalEvent(event: ComplianceEvent): boolean {
    return [
      ComplianceEventType.CONSENT_CHANGED,
      ComplianceEventType.DATA_DELETED,
      ComplianceEventType.THIRD_PARTY_SHARING,
    ].includes(event.type);
  }

  /**
   * Store event locally for audit trail
   */
  private async storeEventLocally(event: ComplianceEvent): Promise<void> {
    // Store in SQLite for offline audit trail
    // Implementation would use OfflineDatabase
  }

  /**
   * Sync event to backend audit service
   */
  private async syncEventToBackend(event: ComplianceEvent): Promise<void> {
    // Sync to backend compliance API
    // Leverages existing backend audit services
  }

  /**
   * Start periodic sync to backend
   */
  private startBackendSync(): void {
    if (!this.backendSyncEnabled) return;

    setInterval(() => {
      this.syncPendingEvents();
    }, this.backendSyncInterval);
  }

  /**
   * Sync all pending events to backend
   */
  private async syncPendingEvents(): Promise<void> {
    // Batch sync events to backend
    // Implementation would use API client
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `ce_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Count consent violations
   */
  private countConsentViolations(): number {
    // Count events that violated consent requirements
    return 0; // Placeholder
  }

  /**
   * Count encryption failures
   */
  private countEncryptionFailures(): number {
    return this.events.filter(
      e =>
        e.type === ComplianceEventType.ENCRYPTION_OPERATION &&
        e.metadata?.success === false
    ).length;
  }

  /**
   * Clear old events (retention policy)
   */
  public async clearOldEvents(retentionDays: number = 365): Promise<void> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const eventsToKeep = this.events.filter(e => e.timestamp >= cutoffDate);
    const eventsToDelete = this.events.filter(e => e.timestamp < cutoffDate);

    // Track deletion for compliance
    if (eventsToDelete.length > 0) {
      await this.trackEvent({
        userId: 'system',
        type: ComplianceEventType.DATA_DELETED,
        dataType: 'compliance_events',
        action: 'retention_policy_cleanup',
        purpose: 'data_retention_policy',
        metadata: { deletedCount: eventsToDelete.length, retentionDays },
      });
    }

    this.events = eventsToKeep;
  }
}

export default ComplianceMonitoringService.getInstance();