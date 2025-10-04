/**
 * Adherence Intervention Job
 *
 * Scheduled job that runs daily to check medication adherence rates
 * and trigger educational interventions for users with low adherence (<60%).
 */

import * as cron from 'node-cron';
import { AdherenceInterventionService } from '../services/education/AdherenceInterventionService';
import { DatabaseService } from '../services/database/databaseService';
import { AuditService } from '../services/audit/auditService';

export class AdherenceInterventionJob {
  private static instance: AdherenceInterventionJob;
  private interventionService: AdherenceInterventionService;
  private db: DatabaseService;
  private auditService: AuditService;
  private cronJob: cron.ScheduledTask | null = null;

  constructor() {
    this.interventionService = AdherenceInterventionService.getInstance();
    this.db = DatabaseService.getInstance();
    this.auditService = AuditService.getInstance();
  }

  public static getInstance(): AdherenceInterventionJob {
    if (!AdherenceInterventionJob.instance) {
      AdherenceInterventionJob.instance = new AdherenceInterventionJob();
    }
    return AdherenceInterventionJob.instance;
  }

  /**
   * Start the scheduled job
   * Runs daily at 9:00 AM to check adherence and trigger interventions
   */
  public start(): void {
    if (this.cronJob) {
      console.log('[AdherenceInterventionJob] Job already running');
      return;
    }

    // Run daily at 9:00 AM
    this.cronJob = cron.schedule('0 9 * * *', async () => {
      await this.processAdherenceInterventions();
    });

    console.log('[AdherenceInterventionJob] Started - runs daily at 9:00 AM');
  }

  /**
   * Stop the scheduled job
   */
  public stop(): void {
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      console.log('[AdherenceInterventionJob] Stopped');
    }
  }

  /**
   * Manually trigger adherence intervention processing
   */
  public async runNow(): Promise<void> {
    console.log('[AdherenceInterventionJob] Manual trigger initiated');
    await this.processAdherenceInterventions();
  }

  /**
   * Process adherence interventions for all active users
   */
  private async processAdherenceInterventions(): Promise<void> {
    const startTime = Date.now();
    console.log('[AdherenceInterventionJob] Starting adherence intervention processing...');

    try {
      // Get all active users with medications
      const users = await this.getActiveUsersWithMedications();
      console.log(`[AdherenceInterventionJob] Found ${users.length} users to check`);

      let successCount = 0;
      let failureCount = 0;
      let interventionCount = 0;

      for (const user of users) {
        try {
          // Check adherence and trigger intervention if needed
          const hadIntervention = await this.checkUserAdherence(user.userId);

          if (hadIntervention) {
            interventionCount++;
          }

          successCount++;
        } catch (error) {
          console.error(`[AdherenceInterventionJob] Error processing user ${user.userId}:`, error);
          failureCount++;
        }
      }

      const duration = Date.now() - startTime;

      // Log job completion
      await this.auditService.logHealthcareEvent({
        eventType: 'adherence_intervention_job_completed',
        userId: 'system',
        userType: 'admin',
        success: true,
        metadata: {
          totalUsers: users.length,
          successCount,
          failureCount,
          interventionCount,
          durationMs: duration
        }
      });

      console.log(`[AdherenceInterventionJob] Completed in ${duration}ms`);
      console.log(`[AdherenceInterventionJob] Results: ${successCount} successful, ${failureCount} failed, ${interventionCount} interventions triggered`);

    } catch (error) {
      console.error('[AdherenceInterventionJob] Fatal error during processing:', error);

      await this.auditService.logHealthcareEvent({
        eventType: 'adherence_intervention_job_failed',
        userId: 'system',
        userType: 'admin',
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error'
      });

      throw error;
    }
  }

  /**
   * Get all active users with medications
   */
  private async getActiveUsersWithMedications(): Promise<Array<{ userId: string; patientId: string }>> {
    try {
      const connection = this.db.getConnection();
      const users = await connection.manyOrNone(`
        SELECT DISTINCT p.user_id, p.id as patient_id
        FROM patients p
        JOIN medications m ON p.id = m.patient_id
        JOIN users u ON p.user_id = u.id
        WHERE m.status = 'active'
          AND u.status = 'active'
          AND u.deleted_at IS NULL
        ORDER BY p.user_id
      `);

      return users.map(u => ({
        userId: u.user_id,
        patientId: u.patient_id
      }));
    } catch (error) {
      console.error('[AdherenceInterventionJob] Error getting active users:', error);
      return [];
    }
  }

  /**
   * Check user adherence and trigger intervention if needed
   * Returns true if intervention was triggered
   */
  private async checkUserAdherence(userId: string): Promise<boolean> {
    try {
      // Get the intervention service to check and potentially trigger intervention
      await this.interventionService.checkAndIntervent(userId);

      // Check if intervention was actually triggered by looking at recent logs
      const connection = this.db.getConnection();
      const recentIntervention = await connection.oneOrNone(`
        SELECT id FROM adherence_intervention_logs
        WHERE user_id = $1
          AND created_at > NOW() - INTERVAL '1 minute'
        LIMIT 1
      `, [userId]);

      return !!recentIntervention;
    } catch (error) {
      console.error(`[AdherenceInterventionJob] Error checking adherence for user ${userId}:`, error);
      throw error;
    }
  }
}

export default AdherenceInterventionJob;
