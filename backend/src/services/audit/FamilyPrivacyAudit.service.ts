/**
 * Family Privacy Audit Service
 * Comprehensive audit trail management for PDPA compliance
 * Tracks all family data access, modifications, and consent changes
 */

import { Service, Inject } from 'typedi';
import { Logger } from 'winston';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import { DatabaseService } from '../database/database.service';
import { EncryptionService } from '../security/encryption.service';

export interface AuditEntry {
  id: string;
  familyId: string;
  userId: string;
  userRole?: string;
  action: AuditAction;
  resourceType?: string;
  resourceId?: string;
  dataCategory?: string;
  previousValue?: any;
  newValue?: any;
  accessorId?: string;
  accessorRelationship?: string;
  ipAddress?: string;
  userAgent?: string;
  location?: GeographicLocation;
  sessionId?: string;
  requestId?: string;
  timestamp: Date;
  pdpaCompliant: boolean;
  culturalContext?: CulturalAuditContext;
  privacyImpact?: PrivacyImpact;
  signature?: string; // Digital signature for integrity
}

export type AuditAction =
  // Data Access
  | 'data_viewed'
  | 'data_exported'
  | 'data_shared'
  | 'data_downloaded'
  // Data Modification
  | 'data_created'
  | 'data_updated'
  | 'data_deleted'
  | 'data_archived'
  // Privacy Settings
  | 'privacy_settings_updated'
  | 'visibility_changed'
  | 'permission_granted'
  | 'permission_revoked'
  // Consent Management
  | 'consent_given'
  | 'consent_withdrawn'
  | 'consent_updated'
  | 'consent_expired'
  // FHIR Integration
  | 'fhir_sync_initiated'
  | 'fhir_data_sent'
  | 'fhir_data_received'
  | 'provider_access'
  // Emergency Access
  | 'emergency_override'
  | 'emergency_access_granted'
  | 'break_glass_activated'
  // Authentication
  | 'login_family_context'
  | 'logout_family_context'
  | 'session_expired'
  // Reports
  | 'audit_report_generated'
  | 'privacy_report_exported'
  | 'compliance_check_performed';

export interface GeographicLocation {
  country?: string;
  state?: string;
  city?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

export interface CulturalAuditContext {
  language: string;
  culturalRole?: string;
  familyHierarchyLevel?: number;
  religiousConsiderations?: string[];
  culturalRestrictions?: string[];
}

export interface PrivacyImpact {
  level: 'low' | 'medium' | 'high' | 'critical';
  affectedUsers: string[];
  dataSensitivity: 'public' | 'internal' | 'confidential' | 'restricted';
  complianceImplications?: string[];
}

export interface AuditSearchCriteria {
  familyId?: string;
  userId?: string;
  action?: AuditAction | AuditAction[];
  startDate?: Date;
  endDate?: Date;
  resourceType?: string;
  dataCategory?: string;
  pdpaCompliant?: boolean;
  privacyImpactLevel?: string;
  limit?: number;
  offset?: number;
}

export interface AuditReport {
  reportId: string;
  familyId: string;
  period: {
    start: Date;
    end: Date;
  };
  statistics: AuditStatistics;
  entries: AuditEntry[];
  compliance: ComplianceMetrics;
  recommendations: string[];
  generatedAt: Date;
  generatedBy: string;
  signature?: string;
}

export interface AuditStatistics {
  totalEntries: number;
  uniqueUsers: number;
  dataAccessCount: number;
  dataModificationCount: number;
  consentChanges: number;
  emergencyAccess: number;
  privacyViolations: number;
  mostAccessedCategories: CategoryAccess[];
  peakAccessTimes: TimeDistribution[];
  accessByRelationship: RelationshipAccess[];
}

export interface CategoryAccess {
  category: string;
  count: number;
  percentage: number;
}

export interface TimeDistribution {
  hour: number;
  count: number;
}

export interface RelationshipAccess {
  relationship: string;
  count: number;
  categories: string[];
}

export interface ComplianceMetrics {
  pdpaCompliance: number; // Percentage
  dataMinimization: boolean;
  purposeLimitation: boolean;
  consentValidity: boolean;
  dataRetentionCompliance: boolean;
  accessControlEffectiveness: number;
  auditCompleteness: number;
  violations: ComplianceViolation[];
}

export interface ComplianceViolation {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  timestamp: Date;
  remediation?: string;
}

@Service()
export class FamilyPrivacyAuditService extends EventEmitter {
  private readonly AUDIT_RETENTION_DAYS = 2555; // 7 years for PDPA
  private readonly AUDIT_GENERATION_TIMEOUT = 100; // 100ms performance target
  private readonly BATCH_SIZE = 1000;
  private auditQueue: AuditEntry[] = [];
  private processingInterval: NodeJS.Timeout | null = null;

  constructor(
    @Inject('logger') private logger: Logger,
    @Inject() private db: DatabaseService,
    @Inject() private encryption: EncryptionService
  ) {
    super();
    this.initializeAuditProcessor();
    this.setupEventHandlers();
  }

  /**
   * Initialize audit entry processor
   */
  private initializeAuditProcessor(): void {
    // Process audit queue every 5 seconds
    this.processingInterval = setInterval(() => {
      this.processAuditQueue();
    }, 5000);
  }

  /**
   * Setup event handlers for audit events
   */
  private setupEventHandlers(): void {
    this.on('audit:critical', async (entry) => {
      // Immediately process critical audit entries
      await this.processCriticalAudit(entry);
    });

    this.on('audit:violation', async (entry) => {
      // Handle privacy violations
      await this.handlePrivacyViolation(entry);
    });
  }

  /**
   * Create audit entry for family privacy action
   */
  async createAuditEntry(data: Partial<AuditEntry>): Promise<string> {
    const startTime = Date.now();

    try {
      const auditEntry: AuditEntry = {
        id: uuidv4(),
        familyId: data.familyId!,
        userId: data.userId!,
        action: data.action!,
        timestamp: new Date(),
        pdpaCompliant: data.pdpaCompliant ?? true,
        ...data
      };

      // Calculate privacy impact
      auditEntry.privacyImpact = this.calculatePrivacyImpact(auditEntry);

      // Generate digital signature for integrity
      auditEntry.signature = await this.generateSignature(auditEntry);

      // Add to processing queue
      this.auditQueue.push(auditEntry);

      // Process immediately if critical
      if (auditEntry.privacyImpact.level === 'critical' ||
          auditEntry.action.includes('emergency')) {
        await this.processCriticalAudit(auditEntry);
      }

      const elapsed = Date.now() - startTime;
      if (elapsed > this.AUDIT_GENERATION_TIMEOUT) {
        this.logger.warn(`Audit entry creation took ${elapsed}ms, exceeding target`);
      }

      return auditEntry.id;
    } catch (error) {
      this.logger.error('Failed to create audit entry', error);
      throw error;
    }
  }

  /**
   * Batch create multiple audit entries
   */
  async createBatchAuditEntries(entries: Partial<AuditEntry>[]): Promise<string[]> {
    const ids: string[] = [];

    for (const entry of entries) {
      const id = await this.createAuditEntry(entry);
      ids.push(id);
    }

    return ids;
  }

  /**
   * Search audit trail with criteria
   */
  async searchAuditTrail(criteria: AuditSearchCriteria): Promise<AuditEntry[]> {
    try {
      let query = 'SELECT * FROM family_privacy_audit WHERE 1=1';
      const params: any[] = [];

      if (criteria.familyId) {
        query += ' AND family_id = ?';
        params.push(criteria.familyId);
      }

      if (criteria.userId) {
        query += ' AND user_id = ?';
        params.push(criteria.userId);
      }

      if (criteria.action) {
        if (Array.isArray(criteria.action)) {
          query += ` AND action IN (${criteria.action.map(() => '?').join(',')})`;
          params.push(...criteria.action);
        } else {
          query += ' AND action = ?';
          params.push(criteria.action);
        }
      }

      if (criteria.startDate) {
        query += ' AND timestamp >= ?';
        params.push(criteria.startDate);
      }

      if (criteria.endDate) {
        query += ' AND timestamp <= ?';
        params.push(criteria.endDate);
      }

      if (criteria.resourceType) {
        query += ' AND resource_type = ?';
        params.push(criteria.resourceType);
      }

      if (criteria.dataCategory) {
        query += ' AND data_category = ?';
        params.push(criteria.dataCategory);
      }

      if (criteria.pdpaCompliant !== undefined) {
        query += ' AND pdpa_compliant = ?';
        params.push(criteria.pdpaCompliant);
      }

      query += ' ORDER BY timestamp DESC';

      if (criteria.limit) {
        query += ' LIMIT ?';
        params.push(criteria.limit);

        if (criteria.offset) {
          query += ' OFFSET ?';
          params.push(criteria.offset);
        }
      }

      const results = await this.db.query(query, params);

      return results.map((row: any) => this.parseAuditEntry(row));
    } catch (error) {
      this.logger.error('Failed to search audit trail', error);
      throw error;
    }
  }

  /**
   * Generate comprehensive audit report
   */
  async generateAuditReport(
    familyId: string,
    startDate: Date,
    endDate: Date,
    requestedBy: string
  ): Promise<AuditReport> {
    try {
      // Get all audit entries for the period
      const entries = await this.searchAuditTrail({
        familyId,
        startDate,
        endDate
      });

      // Calculate statistics
      const statistics = this.calculateAuditStatistics(entries);

      // Evaluate compliance
      const compliance = await this.evaluateCompliance(entries, familyId);

      // Generate recommendations
      const recommendations = this.generateRecommendations(statistics, compliance);

      const report: AuditReport = {
        reportId: uuidv4(),
        familyId,
        period: {
          start: startDate,
          end: endDate
        },
        statistics,
        entries: entries.slice(0, 1000), // Limit entries in report
        compliance,
        recommendations,
        generatedAt: new Date(),
        generatedBy: requestedBy
      };

      // Sign the report
      report.signature = await this.generateSignature(report);

      // Store report
      await this.storeAuditReport(report);

      // Audit the report generation itself
      await this.createAuditEntry({
        familyId,
        userId: requestedBy,
        action: 'audit_report_generated',
        resourceId: report.reportId,
        timestamp: new Date(),
        pdpaCompliant: true
      });

      return report;
    } catch (error) {
      this.logger.error('Failed to generate audit report', error);
      throw error;
    }
  }

  /**
   * Calculate privacy impact of an action
   */
  private calculatePrivacyImpact(entry: AuditEntry): PrivacyImpact {
    let level: PrivacyImpact['level'] = 'low';
    let dataSensitivity: PrivacyImpact['dataSensitivity'] = 'internal';
    const affectedUsers: string[] = [entry.userId];
    const complianceImplications: string[] = [];

    // Determine impact level based on action
    if (entry.action.includes('emergency') || entry.action.includes('override')) {
      level = 'critical';
      complianceImplications.push('Emergency access requires review');
    } else if (entry.action.includes('consent') || entry.action.includes('privacy')) {
      level = 'high';
      complianceImplications.push('Privacy settings change');
    } else if (entry.action.includes('shared') || entry.action.includes('exported')) {
      level = 'medium';
      complianceImplications.push('Data sharing activity');
    }

    // Determine data sensitivity
    if (entry.dataCategory) {
      const sensitiveCat = ['medical_conditions', 'health_metrics', 'insurance_details'];
      if (sensitiveCat.includes(entry.dataCategory)) {
        dataSensitivity = 'restricted';
        level = level === 'low' ? 'medium' : level;
      }
    }

    // Add affected users
    if (entry.accessorId) {
      affectedUsers.push(entry.accessorId);
    }

    return {
      level,
      affectedUsers,
      dataSensitivity,
      complianceImplications
    };
  }

  /**
   * Generate digital signature for audit integrity
   */
  private async generateSignature(data: any): Promise<string> {
    const jsonString = JSON.stringify(data, Object.keys(data).sort());
    const hash = crypto.createHash('sha256').update(jsonString).digest('hex');
    return this.encryption.sign(hash);
  }

  /**
   * Process audit queue in batches
   */
  private async processAuditQueue(): Promise<void> {
    if (this.auditQueue.length === 0) return;

    const batch = this.auditQueue.splice(0, this.BATCH_SIZE);

    try {
      await this.db.transaction(async (trx) => {
        for (const entry of batch) {
          await trx.query(
            `INSERT INTO family_privacy_audit (
              id, family_id, user_id, user_role, action, resource_type,
              resource_id, data_category, previous_value, new_value,
              accessor_id, accessor_relationship, ip_address, user_agent,
              location, session_id, request_id, timestamp, pdpa_compliant,
              cultural_context, privacy_impact, signature
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              entry.id,
              entry.familyId,
              entry.userId,
              entry.userRole,
              entry.action,
              entry.resourceType,
              entry.resourceId,
              entry.dataCategory,
              JSON.stringify(entry.previousValue),
              JSON.stringify(entry.newValue),
              entry.accessorId,
              entry.accessorRelationship,
              entry.ipAddress,
              entry.userAgent,
              JSON.stringify(entry.location),
              entry.sessionId,
              entry.requestId,
              entry.timestamp,
              entry.pdpaCompliant,
              JSON.stringify(entry.culturalContext),
              JSON.stringify(entry.privacyImpact),
              entry.signature
            ]
          );
        }
      });

      this.logger.info(`Processed ${batch.length} audit entries`);
    } catch (error) {
      this.logger.error('Failed to process audit queue', error);
      // Re-add failed entries to queue for retry
      this.auditQueue.unshift(...batch);
    }
  }

  /**
   * Process critical audit entries immediately
   */
  private async processCriticalAudit(entry: AuditEntry): Promise<void> {
    try {
      await this.db.query(
        `INSERT INTO family_privacy_audit (
          id, family_id, user_id, action, resource_type, timestamp,
          pdpa_compliant, privacy_impact, signature
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          entry.id,
          entry.familyId,
          entry.userId,
          entry.action,
          entry.resourceType,
          entry.timestamp,
          entry.pdpaCompliant,
          JSON.stringify(entry.privacyImpact),
          entry.signature
        ]
      );

      // Emit critical audit event for real-time monitoring
      this.emit('audit:critical_processed', entry);

      // Check if violation detection is needed
      if (!entry.pdpaCompliant || entry.privacyImpact?.level === 'critical') {
        await this.handlePrivacyViolation(entry);
      }
    } catch (error) {
      this.logger.error('Failed to process critical audit', error);
      throw error;
    }
  }

  /**
   * Handle privacy violations
   */
  private async handlePrivacyViolation(entry: AuditEntry): Promise<void> {
    try {
      // Create violation record
      await this.db.query(
        `INSERT INTO privacy_violations (
          id, audit_entry_id, family_id, user_id, violation_type,
          severity, description, timestamp, remediation_status
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          uuidv4(),
          entry.id,
          entry.familyId,
          entry.userId,
          entry.action,
          entry.privacyImpact?.level || 'medium',
          `Privacy violation detected: ${entry.action}`,
          new Date(),
          'pending'
        ]
      );

      // Notify administrators
      this.emit('privacy:violation_detected', {
        auditEntry: entry,
        severity: entry.privacyImpact?.level,
        timestamp: new Date()
      });

      this.logger.warn('Privacy violation detected and recorded', {
        entryId: entry.id,
        action: entry.action,
        userId: entry.userId
      });
    } catch (error) {
      this.logger.error('Failed to handle privacy violation', error);
    }
  }

  /**
   * Calculate audit statistics
   */
  private calculateAuditStatistics(entries: AuditEntry[]): AuditStatistics {
    const statistics: AuditStatistics = {
      totalEntries: entries.length,
      uniqueUsers: new Set(entries.map(e => e.userId)).size,
      dataAccessCount: entries.filter(e =>
        e.action.includes('viewed') || e.action.includes('exported')
      ).length,
      dataModificationCount: entries.filter(e =>
        e.action.includes('updated') || e.action.includes('created')
      ).length,
      consentChanges: entries.filter(e => e.action.includes('consent')).length,
      emergencyAccess: entries.filter(e => e.action.includes('emergency')).length,
      privacyViolations: entries.filter(e => !e.pdpaCompliant).length,
      mostAccessedCategories: this.calculateCategoryAccess(entries),
      peakAccessTimes: this.calculateTimeDistribution(entries),
      accessByRelationship: this.calculateRelationshipAccess(entries)
    };

    return statistics;
  }

  /**
   * Calculate category access statistics
   */
  private calculateCategoryAccess(entries: AuditEntry[]): CategoryAccess[] {
    const categoryCount = new Map<string, number>();

    entries.forEach(entry => {
      if (entry.dataCategory) {
        categoryCount.set(
          entry.dataCategory,
          (categoryCount.get(entry.dataCategory) || 0) + 1
        );
      }
    });

    const total = entries.length;
    const categoryAccess: CategoryAccess[] = [];

    categoryCount.forEach((count, category) => {
      categoryAccess.push({
        category,
        count,
        percentage: (count / total) * 100
      });
    });

    return categoryAccess.sort((a, b) => b.count - a.count);
  }

  /**
   * Calculate time distribution of access
   */
  private calculateTimeDistribution(entries: AuditEntry[]): TimeDistribution[] {
    const hourCount = new Array(24).fill(0);

    entries.forEach(entry => {
      const hour = new Date(entry.timestamp).getHours();
      hourCount[hour]++;
    });

    return hourCount.map((count, hour) => ({ hour, count }));
  }

  /**
   * Calculate access by relationship
   */
  private calculateRelationshipAccess(entries: AuditEntry[]): RelationshipAccess[] {
    const relationshipMap = new Map<string, {
      count: number;
      categories: Set<string>;
    }>();

    entries.forEach(entry => {
      if (entry.accessorRelationship) {
        const existing = relationshipMap.get(entry.accessorRelationship) || {
          count: 0,
          categories: new Set<string>()
        };

        existing.count++;
        if (entry.dataCategory) {
          existing.categories.add(entry.dataCategory);
        }

        relationshipMap.set(entry.accessorRelationship, existing);
      }
    });

    const relationshipAccess: RelationshipAccess[] = [];

    relationshipMap.forEach((data, relationship) => {
      relationshipAccess.push({
        relationship,
        count: data.count,
        categories: Array.from(data.categories)
      });
    });

    return relationshipAccess;
  }

  /**
   * Evaluate PDPA compliance
   */
  private async evaluateCompliance(
    entries: AuditEntry[],
    familyId: string
  ): Promise<ComplianceMetrics> {
    const violations: ComplianceViolation[] = [];

    // Check PDPA compliance rate
    const compliantEntries = entries.filter(e => e.pdpaCompliant).length;
    const pdpaCompliance = (compliantEntries / entries.length) * 100;

    // Check data minimization
    const excessiveAccess = entries.filter(e =>
      e.privacyImpact?.level === 'high' || e.privacyImpact?.level === 'critical'
    );
    const dataMinimization = excessiveAccess.length < entries.length * 0.1;

    // Check purpose limitation
    const purposeViolations = entries.filter(e =>
      !e.resourceType && e.action.includes('data')
    );
    const purposeLimitation = purposeViolations.length === 0;

    // Check consent validity
    const consentIssues = entries.filter(e =>
      e.action === 'consent_expired' || e.action === 'consent_withdrawn'
    );
    const consentValidity = consentIssues.length === 0;

    // Check data retention
    const oldEntries = entries.filter(e =>
      new Date(e.timestamp) < new Date(Date.now() - this.AUDIT_RETENTION_DAYS * 24 * 60 * 60 * 1000)
    );
    const dataRetentionCompliance = oldEntries.length === 0;

    // Calculate access control effectiveness
    const unauthorizedAccess = entries.filter(e =>
      e.action.includes('override') || !e.accessorRelationship
    );
    const accessControlEffectiveness = 100 - (unauthorizedAccess.length / entries.length * 100);

    // Calculate audit completeness
    const completeEntries = entries.filter(e =>
      e.userId && e.action && e.timestamp && e.signature
    );
    const auditCompleteness = (completeEntries.length / entries.length) * 100;

    // Identify violations
    if (pdpaCompliance < 80) {
      violations.push({
        type: 'pdpa_compliance',
        severity: 'high',
        description: `PDPA compliance rate below threshold: ${pdpaCompliance.toFixed(1)}%`,
        timestamp: new Date(),
        remediation: 'Review and update privacy policies'
      });
    }

    if (!dataMinimization) {
      violations.push({
        type: 'data_minimization',
        severity: 'medium',
        description: 'Excessive data access detected',
        timestamp: new Date(),
        remediation: 'Implement stricter access controls'
      });
    }

    if (!purposeLimitation) {
      violations.push({
        type: 'purpose_limitation',
        severity: 'medium',
        description: 'Data accessed without clear purpose',
        timestamp: new Date(),
        remediation: 'Enforce purpose specification for data access'
      });
    }

    return {
      pdpaCompliance,
      dataMinimization,
      purposeLimitation,
      consentValidity,
      dataRetentionCompliance,
      accessControlEffectiveness,
      auditCompleteness,
      violations
    };
  }

  /**
   * Generate compliance recommendations
   */
  private generateRecommendations(
    statistics: AuditStatistics,
    compliance: ComplianceMetrics
  ): string[] {
    const recommendations: string[] = [];

    if (compliance.pdpaCompliance < 90) {
      recommendations.push('Improve PDPA compliance through regular training and policy updates');
    }

    if (statistics.emergencyAccess > 5) {
      recommendations.push('Review emergency access procedures - high usage detected');
    }

    if (statistics.privacyViolations > 0) {
      recommendations.push(`Address ${statistics.privacyViolations} privacy violations immediately`);
    }

    if (!compliance.dataMinimization) {
      recommendations.push('Implement data minimization practices to reduce unnecessary access');
    }

    if (!compliance.purposeLimitation) {
      recommendations.push('Enforce purpose specification for all data access requests');
    }

    if (compliance.accessControlEffectiveness < 95) {
      recommendations.push('Strengthen access control mechanisms');
    }

    if (compliance.auditCompleteness < 100) {
      recommendations.push('Ensure all audit entries contain complete information');
    }

    // Cultural recommendations
    const peakHour = statistics.peakAccessTimes.reduce((max, current) =>
      current.count > max.count ? current : max
    );

    if (peakHour.hour >= 12 && peakHour.hour <= 14) {
      recommendations.push('Consider prayer time restrictions for non-urgent access');
    }

    return recommendations;
  }

  /**
   * Store audit report
   */
  private async storeAuditReport(report: AuditReport): Promise<void> {
    await this.db.query(
      `INSERT INTO audit_reports (
        id, family_id, period_start, period_end, statistics,
        compliance, recommendations, generated_at, generated_by, signature
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        report.reportId,
        report.familyId,
        report.period.start,
        report.period.end,
        JSON.stringify(report.statistics),
        JSON.stringify(report.compliance),
        JSON.stringify(report.recommendations),
        report.generatedAt,
        report.generatedBy,
        report.signature
      ]
    );
  }

  /**
   * Parse audit entry from database row
   */
  private parseAuditEntry(row: any): AuditEntry {
    return {
      id: row.id,
      familyId: row.family_id,
      userId: row.user_id,
      userRole: row.user_role,
      action: row.action,
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      dataCategory: row.data_category,
      previousValue: row.previous_value ? JSON.parse(row.previous_value) : undefined,
      newValue: row.new_value ? JSON.parse(row.new_value) : undefined,
      accessorId: row.accessor_id,
      accessorRelationship: row.accessor_relationship,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      location: row.location ? JSON.parse(row.location) : undefined,
      sessionId: row.session_id,
      requestId: row.request_id,
      timestamp: new Date(row.timestamp),
      pdpaCompliant: row.pdpa_compliant,
      culturalContext: row.cultural_context ? JSON.parse(row.cultural_context) : undefined,
      privacyImpact: row.privacy_impact ? JSON.parse(row.privacy_impact) : undefined,
      signature: row.signature
    };
  }

  /**
   * Cleanup old audit entries beyond retention period
   */
  async cleanupOldAuditEntries(): Promise<number> {
    const cutoffDate = new Date(
      Date.now() - (this.AUDIT_RETENTION_DAYS * 24 * 60 * 60 * 1000)
    );

    const result = await this.db.query(
      'DELETE FROM family_privacy_audit WHERE timestamp < ?',
      [cutoffDate]
    );

    this.logger.info(`Cleaned up ${result.affectedRows} old audit entries`);
    return result.affectedRows;
  }

  /**
   * Export audit trail for external review
   */
  async exportAuditTrail(
    familyId: string,
    format: 'json' | 'csv' | 'pdf' = 'json'
  ): Promise<Buffer> {
    const entries = await this.searchAuditTrail({ familyId });

    switch (format) {
      case 'json':
        return Buffer.from(JSON.stringify(entries, null, 2));

      case 'csv':
        // Convert to CSV format
        const csvHeaders = Object.keys(entries[0] || {}).join(',');
        const csvRows = entries.map(entry =>
          Object.values(entry).map(v =>
            typeof v === 'object' ? JSON.stringify(v) : v
          ).join(',')
        );
        return Buffer.from([csvHeaders, ...csvRows].join('\n'));

      case 'pdf':
        // Would integrate with PDF generation service
        throw new Error('PDF export not yet implemented');

      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Verify audit trail integrity
   */
  async verifyAuditIntegrity(
    familyId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<{ valid: boolean; invalidEntries: string[] }> {
    const entries = await this.searchAuditTrail({
      familyId,
      startDate,
      endDate
    });

    const invalidEntries: string[] = [];

    for (const entry of entries) {
      if (!entry.signature) {
        invalidEntries.push(entry.id);
        continue;
      }

      // Verify signature
      const entryWithoutSig = { ...entry };
      delete entryWithoutSig.signature;

      const expectedSig = await this.generateSignature(entryWithoutSig);
      if (entry.signature !== expectedSig) {
        invalidEntries.push(entry.id);
      }
    }

    return {
      valid: invalidEntries.length === 0,
      invalidEntries
    };
  }

  /**
   * Cleanup on service shutdown
   */
  async shutdown(): Promise<void> {
    if (this.processingInterval) {
      clearInterval(this.processingInterval);
    }

    // Process remaining audit queue
    if (this.auditQueue.length > 0) {
      await this.processAuditQueue();
    }
  }
}

export default FamilyPrivacyAuditService;