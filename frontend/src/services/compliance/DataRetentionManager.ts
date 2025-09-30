/**
 * Data Retention Manager
 *
 * Implements data retention policies for PDPA compliance.
 * Auto-cleanup of obsolete data, purge on user request, audit trail for deletions.
 */

export interface RetentionPolicy {
  category: string;
  retentionDays: number;
  autoDelete: boolean;
  requiresUserConsent: boolean;
}

export interface DataDeletionRequest {
  id: string;
  userId: string;
  dataCategory: string;
  requestedAt: Date;
  processedAt?: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  reason: string;
  deletedRecords?: number;
}

export interface RetentionReport {
  totalRecords: number;
  recordsByCategory: Record<string, number>;
  oldestRecord: Date;
  newestRecord: Date;
  recordsNearExpiration: number;
  upcomingDeletions: Array<{
    category: string;
    count: number;
    expirationDate: Date;
  }>;
}

export class DataRetentionManager {
  private static instance: DataRetentionManager;

  private readonly defaultPolicies: RetentionPolicy[] = [
    {
      category: 'offline_medications',
      retentionDays: 7, // 7-day offline capability
      autoDelete: true,
      requiresUserConsent: false,
    },
    {
      category: 'offline_adherence',
      retentionDays: 7,
      autoDelete: true,
      requiresUserConsent: false,
    },
    {
      category: 'offline_cache',
      retentionDays: 1,
      autoDelete: true,
      requiresUserConsent: false,
    },
    {
      category: 'sync_operations',
      retentionDays: 30,
      autoDelete: true,
      requiresUserConsent: false,
    },
    {
      category: 'sync_errors',
      retentionDays: 30,
      autoDelete: true,
      requiresUserConsent: false,
    },
    {
      category: 'compliance_events',
      retentionDays: 365, // 1 year for audit trail
      autoDelete: true,
      requiresUserConsent: false,
    },
    {
      category: 'user_data',
      retentionDays: 0, // Keep until user requests deletion
      autoDelete: false,
      requiresUserConsent: true,
    },
  ];

  private deletionRequests: DataDeletionRequest[] = [];
  private cleanupInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.startAutomaticCleanup();
  }

  public static getInstance(): DataRetentionManager {
    if (!DataRetentionManager.instance) {
      DataRetentionManager.instance = new DataRetentionManager();
    }
    return DataRetentionManager.instance;
  }

  /**
   * Start automatic cleanup process
   */
  private startAutomaticCleanup(): void {
    // Run cleanup every hour
    this.cleanupInterval = setInterval(() => {
      this.performAutomaticCleanup();
    }, 60 * 60 * 1000);
  }

  /**
   * Perform automatic cleanup based on retention policies
   */
  public async performAutomaticCleanup(): Promise<{
    categoriesCleaned: number;
    recordsDeleted: number;
  }> {
    let categoriesCleaned = 0;
    let recordsDeleted = 0;

    for (const policy of this.defaultPolicies) {
      if (policy.autoDelete) {
        const deleted = await this.cleanupCategory(policy);
        if (deleted > 0) {
          categoriesCleaned++;
          recordsDeleted += deleted;
        }
      }
    }

    return { categoriesCleaned, recordsDeleted };
  }

  /**
   * Cleanup a specific category based on retention policy
   */
  private async cleanupCategory(policy: RetentionPolicy): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - policy.retentionDays);

    // Query database for expired records
    const expiredRecords = await this.getExpiredRecords(policy.category, cutoffDate);

    if (expiredRecords.length === 0) {
      return 0;
    }

    // Delete expired records
    await this.deleteRecords(policy.category, expiredRecords);

    // Log deletion for audit trail
    await this.logDeletion({
      category: policy.category,
      count: expiredRecords.length,
      reason: 'retention_policy',
      cutoffDate,
    });

    return expiredRecords.length;
  }

  /**
   * Request data deletion (PDPA right to erasure)
   */
  public async requestDataDeletion(
    userId: string,
    dataCategory: string,
    reason: string
  ): Promise<DataDeletionRequest> {
    const request: DataDeletionRequest = {
      id: this.generateRequestId(),
      userId,
      dataCategory,
      requestedAt: new Date(),
      status: 'pending',
      reason,
    };

    this.deletionRequests.push(request);

    // Process immediately for user requests
    await this.processDeletionRequest(request.id);

    return request;
  }

  /**
   * Process a deletion request
   */
  private async processDeletionRequest(requestId: string): Promise<void> {
    const request = this.deletionRequests.find(r => r.id === requestId);
    if (!request) {
      throw new Error(`Deletion request ${requestId} not found`);
    }

    request.status = 'processing';

    try {
      // Delete all records for user in this category
      const deletedCount = await this.deleteUserData(
        request.userId,
        request.dataCategory
      );

      request.status = 'completed';
      request.processedAt = new Date();
      request.deletedRecords = deletedCount;

      // Log deletion for audit trail
      await this.logDeletion({
        category: request.dataCategory,
        count: deletedCount,
        reason: request.reason,
        userId: request.userId,
      });
    } catch (error) {
      request.status = 'failed';
      console.error('Data deletion failed:', error);
    }
  }

  /**
   * Purge all user data (complete account deletion)
   */
  public async purgeUserData(userId: string, reason: string): Promise<{
    categoriesPurged: number;
    recordsDeleted: number;
  }> {
    let categoriesPurged = 0;
    let recordsDeleted = 0;

    const categories = [
      'offline_medications',
      'offline_adherence',
      'offline_cache',
      'sync_operations',
      'compliance_events',
      'user_data',
    ];

    for (const category of categories) {
      const deleted = await this.deleteUserData(userId, category);
      if (deleted > 0) {
        categoriesPurged++;
        recordsDeleted += deleted;
      }
    }

    // Log complete deletion
    await this.logDeletion({
      category: 'all_user_data',
      count: recordsDeleted,
      reason,
      userId,
    });

    return { categoriesPurged, recordsDeleted };
  }

  /**
   * Get retention report
   */
  public async getRetentionReport(userId?: string): Promise<RetentionReport> {
    const allRecords = await this.getAllRecords(userId);
    const recordsByCategory: Record<string, number> = {};

    for (const policy of this.defaultPolicies) {
      recordsByCategory[policy.category] = await this.countRecords(
        policy.category,
        userId
      );
    }

    const upcomingDeletions = await this.getUpcomingDeletions(userId);

    return {
      totalRecords: allRecords.length,
      recordsByCategory,
      oldestRecord: this.getOldestRecordDate(allRecords),
      newestRecord: this.getNewestRecordDate(allRecords),
      recordsNearExpiration: upcomingDeletions.reduce(
        (sum, d) => sum + d.count,
        0
      ),
      upcomingDeletions,
    };
  }

  /**
   * Get records that will be deleted soon
   */
  private async getUpcomingDeletions(
    userId?: string
  ): Promise<Array<{ category: string; count: number; expirationDate: Date }>> {
    const upcomingDeletions: Array<{
      category: string;
      count: number;
      expirationDate: Date;
    }> = [];

    for (const policy of this.defaultPolicies) {
      if (!policy.autoDelete) continue;

      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() - policy.retentionDays + 7);

      const count = await this.countRecordsNearExpiration(
        policy.category,
        expirationDate,
        userId
      );

      if (count > 0) {
        upcomingDeletions.push({
          category: policy.category,
          count,
          expirationDate,
        });
      }
    }

    return upcomingDeletions;
  }

  /**
   * Database operations (placeholders - would use OfflineDatabase)
   */
  private async getExpiredRecords(category: string, cutoffDate: Date): Promise<any[]> {
    // Query OfflineDatabase for expired records
    return [];
  }

  private async deleteRecords(category: string, records: any[]): Promise<void> {
    // Delete from OfflineDatabase
  }

  private async deleteUserData(userId: string, category: string): Promise<number> {
    // Delete all user data in category from OfflineDatabase
    return 0;
  }

  private async getAllRecords(userId?: string): Promise<any[]> {
    // Get all records from OfflineDatabase
    return [];
  }

  private async countRecords(category: string, userId?: string): Promise<number> {
    // Count records in category
    return 0;
  }

  private async countRecordsNearExpiration(
    category: string,
    expirationDate: Date,
    userId?: string
  ): Promise<number> {
    // Count records near expiration
    return 0;
  }

  /**
   * Audit trail logging
   */
  private async logDeletion(info: {
    category: string;
    count: number;
    reason: string;
    userId?: string;
    cutoffDate?: Date;
  }): Promise<void> {
    // Log to ComplianceMonitoringService
    console.log('Data deletion:', info);
  }

  /**
   * Utility functions
   */
  private generateRequestId(): string {
    return `dr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getOldestRecordDate(records: any[]): Date {
    if (records.length === 0) return new Date();
    return new Date(Math.min(...records.map(r => r.timestamp?.getTime() || 0)));
  }

  private getNewestRecordDate(records: any[]): Date {
    if (records.length === 0) return new Date();
    return new Date(Math.max(...records.map(r => r.timestamp?.getTime() || 0)));
  }

  /**
   * Stop automatic cleanup (for testing)
   */
  public stopAutomaticCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
  }
}

export default DataRetentionManager.getInstance();