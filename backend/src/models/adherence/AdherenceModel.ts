/**
 * Adherence Model
 *
 * Database operations for medication adherence tracking with Malaysian cultural context.
 * Handles CRUD operations for adherence records, progress metrics, and cultural analytics.
 */

import { DatabaseService } from '../../services/database/databaseService';
import {
  AdherenceRecord,
  ProgressMetrics,
  Milestone,
  StreakData,
  FamilyAdherenceMetrics,
  AdherenceConfiguration,
  ProviderAdherenceReport,
  AdherenceStatistics,
  TimePeriod,
  AdherenceStatus,
  MilestoneType,
  MalaysianCulturalTheme
} from '../../types/adherence/adherence.types';
import { v4 as uuidv4 } from 'uuid';

export class AdherenceModel {
  private static instance: AdherenceModel;
  private db: DatabaseService;

  constructor() {
    this.db = DatabaseService.getInstance();
  }

  public static getInstance(): AdherenceModel {
    if (!AdherenceModel.instance) {
      AdherenceModel.instance = new AdherenceModel();
    }
    return AdherenceModel.instance;
  }

  /**
   * Create a new adherence record with cultural context
   */
  async createAdherenceRecord(record: Omit<AdherenceRecord, 'id' | 'createdAt' | 'updatedAt'>): Promise<AdherenceRecord> {
    const id = uuidv4();
    const now = new Date();

    const query = `
      INSERT INTO adherence_records (
        id, medication_id, patient_id, scheduled_time, taken_time, status,
        adherence_score, notes, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const culturalContextQuery = `
      INSERT INTO adherence_cultural_context (
        adherence_record_id, prayer_time_conflict, fasting_period, festival_period,
        family_support, traditional_medicine_used, reason_code
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;

    try {
      return await this.db.tx(async (t) => {
        // Insert main adherence record
        const result = await t.one(query, [
          id,
          record.medicationId,
          record.patientId,
          record.scheduledTime.toISOString(),
          record.takenTime?.toISOString() || null,
          record.status,
          record.adherenceScore,
          record.notes || null,
          now.toISOString(),
          now.toISOString()
        ]);

        // Insert cultural context
        await t.none(culturalContextQuery, [
          id,
          record.culturalContext.prayerTimeConflict,
          record.culturalContext.fastingPeriod,
          record.culturalContext.festivalPeriod || null,
          record.culturalContext.familySupport,
          record.culturalContext.traditionalMedicineUsed,
          record.culturalContext.reasonCode || null
        ]);

        return this.transformAdherenceRecord({ ...result, ...record.culturalContext });
      });
    } catch (error) {
      throw new Error(`Failed to create adherence record: ${error.message}`);
    }
  }

  /**
   * Get adherence records with optional filtering
   */
  async getAdherenceRecords(
    patientId: string,
    options: {
      medicationId?: string;
      startDate?: Date;
      endDate?: Date;
      status?: AdherenceStatus;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ records: AdherenceRecord[]; total: number }> {
    let query = `
      SELECT ar.*,
             acc.prayer_time_conflict, acc.fasting_period, acc.festival_period,
             acc.family_support, acc.traditional_medicine_used, acc.reason_code
      FROM adherence_records ar
      LEFT JOIN adherence_cultural_context acc ON ar.id = acc.adherence_record_id
      WHERE ar.patient_id = $1
    `;

    const params: any[] = [patientId];
    let paramCount = 1;

    if (options.medicationId) {
      paramCount++;
      query += ` AND ar.medication_id = $${paramCount}`;
      params.push(options.medicationId);
    }

    if (options.startDate) {
      paramCount++;
      query += ` AND ar.scheduled_time >= $${paramCount}`;
      params.push(options.startDate.toISOString());
    }

    if (options.endDate) {
      paramCount++;
      query += ` AND ar.scheduled_time <= $${paramCount}`;
      params.push(options.endDate.toISOString());
    }

    if (options.status) {
      paramCount++;
      query += ` AND ar.status = $${paramCount}`;
      params.push(options.status);
    }

    // Get total count
    const countQuery = query.replace(
      'SELECT ar.*, acc.prayer_time_conflict, acc.fasting_period, acc.festival_period, acc.family_support, acc.traditional_medicine_used, acc.reason_code',
      'SELECT COUNT(*) as total'
    );

    query += ` ORDER BY ar.scheduled_time DESC`;

    if (options.limit) {
      paramCount++;
      query += ` LIMIT $${paramCount}`;
      params.push(options.limit);
    }

    if (options.offset) {
      paramCount++;
      query += ` OFFSET $${paramCount}`;
      params.push(options.offset);
    }

    try {
      const [records, countResult] = await Promise.all([
        this.db.query(query, params),
        this.db.one(countQuery, params.slice(0, -2)) // Remove LIMIT and OFFSET for count
      ]);

      return {
        records: records.map(this.transformAdherenceRecord),
        total: parseInt(countResult.total)
      };
    } catch (error) {
      throw new Error(`Failed to get adherence records: ${error.message}`);
    }
  }

  /**
   * Update adherence record
   */
  async updateAdherenceRecord(
    id: string,
    patientId: string,
    updates: Partial<AdherenceRecord>
  ): Promise<AdherenceRecord | null> {
    const setFields: string[] = [];
    const params: any[] = [];
    let paramCount = 0;

    if (updates.takenTime !== undefined) {
      paramCount++;
      setFields.push(`taken_time = $${paramCount}`);
      params.push(updates.takenTime?.toISOString() || null);
    }

    if (updates.status !== undefined) {
      paramCount++;
      setFields.push(`status = $${paramCount}`);
      params.push(updates.status);
    }

    if (updates.adherenceScore !== undefined) {
      paramCount++;
      setFields.push(`adherence_score = $${paramCount}`);
      params.push(updates.adherenceScore);
    }

    if (updates.notes !== undefined) {
      paramCount++;
      setFields.push(`notes = $${paramCount}`);
      params.push(updates.notes);
    }

    if (setFields.length === 0) {
      throw new Error('No fields to update');
    }

    paramCount++;
    setFields.push(`updated_at = $${paramCount}`);
    params.push(new Date().toISOString());

    params.push(id, patientId);

    const query = `
      UPDATE adherence_records
      SET ${setFields.join(', ')}
      WHERE id = $${paramCount + 1} AND patient_id = $${paramCount + 2}
      RETURNING *
    `;

    try {
      const result = await this.db.oneOrNone(query, params);
      return result ? this.transformAdherenceRecord(result) : null;
    } catch (error) {
      throw new Error(`Failed to update adherence record: ${error.message}`);
    }
  }

  /**
   * Store progress metrics
   */
  async storeProgressMetrics(metrics: ProgressMetrics): Promise<void> {
    const query = `
      INSERT INTO progress_metrics (
        patient_id, period, adherence_rate, streak_count, longest_streak,
        total_doses, taken_doses, missed_doses, late_doses, skipped_doses,
        cultural_adjustments, calculated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (patient_id, period, date_trunc('day', calculated_at))
      DO UPDATE SET
        adherence_rate = EXCLUDED.adherence_rate,
        streak_count = EXCLUDED.streak_count,
        longest_streak = EXCLUDED.longest_streak,
        total_doses = EXCLUDED.total_doses,
        taken_doses = EXCLUDED.taken_doses,
        missed_doses = EXCLUDED.missed_doses,
        late_doses = EXCLUDED.late_doses,
        skipped_doses = EXCLUDED.skipped_doses,
        cultural_adjustments = EXCLUDED.cultural_adjustments,
        calculated_at = EXCLUDED.calculated_at
    `;

    try {
      await this.db.none(query, [
        metrics.patientId,
        metrics.period,
        metrics.adherenceRate,
        metrics.streakCount,
        metrics.longestStreak,
        metrics.totalDoses,
        metrics.takenDoses,
        metrics.missedDoses,
        metrics.lateDoses,
        metrics.skippedDoses,
        JSON.stringify(metrics.culturalAdjustments),
        metrics.calculatedAt.toISOString()
      ]);
    } catch (error) {
      throw new Error(`Failed to store progress metrics: ${error.message}`);
    }
  }

  /**
   * Get latest progress metrics
   */
  async getLatestProgressMetrics(
    patientId: string,
    period: TimePeriod
  ): Promise<ProgressMetrics | null> {
    const query = `
      SELECT * FROM progress_metrics
      WHERE patient_id = $1 AND period = $2
      ORDER BY calculated_at DESC
      LIMIT 1
    `;

    try {
      const result = await this.db.oneOrNone(query, [patientId, period]);
      return result ? this.transformProgressMetrics(result) : null;
    } catch (error) {
      throw new Error(`Failed to get progress metrics: ${error.message}`);
    }
  }

  /**
   * Create or update milestone
   */
  async upsertMilestone(milestone: Omit<Milestone, 'id'>): Promise<Milestone> {
    const id = uuidv4();

    const query = `
      INSERT INTO milestones (
        id, patient_id, type, threshold, cultural_theme, achieved_date,
        celebration_shown, family_notified, metadata
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (patient_id, type, threshold)
      DO UPDATE SET
        achieved_date = EXCLUDED.achieved_date,
        celebration_shown = EXCLUDED.celebration_shown,
        family_notified = EXCLUDED.family_notified,
        metadata = EXCLUDED.metadata
      RETURNING *
    `;

    try {
      const result = await this.db.one(query, [
        id,
        milestone.patientId,
        milestone.type,
        milestone.threshold,
        milestone.culturalTheme,
        milestone.achievedDate?.toISOString() || null,
        milestone.celebrationShown,
        milestone.familyNotified,
        JSON.stringify(milestone.metadata)
      ]);

      return this.transformMilestone(result);
    } catch (error) {
      throw new Error(`Failed to upsert milestone: ${error.message}`);
    }
  }

  /**
   * Get patient milestones
   */
  async getPatientMilestones(
    patientId: string,
    options: {
      type?: MilestoneType;
      achieved?: boolean;
      limit?: number;
    } = {}
  ): Promise<Milestone[]> {
    let query = `
      SELECT * FROM milestones
      WHERE patient_id = $1
    `;

    const params: any[] = [patientId];
    let paramCount = 1;

    if (options.type) {
      paramCount++;
      query += ` AND type = $${paramCount}`;
      params.push(options.type);
    }

    if (options.achieved !== undefined) {
      paramCount++;
      query += options.achieved
        ? ` AND achieved_date IS NOT NULL`
        : ` AND achieved_date IS NULL`;
    }

    query += ` ORDER BY achieved_date DESC NULLS LAST`;

    if (options.limit) {
      paramCount++;
      query += ` LIMIT $${paramCount}`;
      params.push(options.limit);
    }

    try {
      const results = await this.db.query(query, params);
      return results.map(this.transformMilestone);
    } catch (error) {
      throw new Error(`Failed to get patient milestones: ${error.message}`);
    }
  }

  /**
   * Store streak data
   */
  async storeStreakData(streakData: StreakData): Promise<void> {
    const query = `
      INSERT INTO streak_data (
        patient_id, medication_id, current_streak, longest_streak, streak_type,
        start_date, last_dose_date, cultural_bonus, streak_status, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      ON CONFLICT (patient_id, medication_id, streak_type)
      DO UPDATE SET
        current_streak = EXCLUDED.current_streak,
        longest_streak = EXCLUDED.longest_streak,
        start_date = EXCLUDED.start_date,
        last_dose_date = EXCLUDED.last_dose_date,
        cultural_bonus = EXCLUDED.cultural_bonus,
        streak_status = EXCLUDED.streak_status,
        updated_at = EXCLUDED.updated_at
    `;

    try {
      await this.db.none(query, [
        streakData.patientId,
        streakData.medicationId || null,
        streakData.currentStreak,
        streakData.longestStreak,
        streakData.streakType,
        streakData.startDate.toISOString(),
        streakData.lastDoseDate?.toISOString() || null,
        streakData.culturalBonus,
        streakData.streakStatus,
        new Date().toISOString()
      ]);
    } catch (error) {
      throw new Error(`Failed to store streak data: ${error.message}`);
    }
  }

  /**
   * Get streak data
   */
  async getStreakData(
    patientId: string,
    medicationId?: string,
    streakType?: string
  ): Promise<StreakData[]> {
    let query = `
      SELECT * FROM streak_data
      WHERE patient_id = $1
    `;

    const params: any[] = [patientId];
    let paramCount = 1;

    if (medicationId) {
      paramCount++;
      query += ` AND (medication_id = $${paramCount} OR medication_id IS NULL)`;
      params.push(medicationId);
    }

    if (streakType) {
      paramCount++;
      query += ` AND streak_type = $${paramCount}`;
      params.push(streakType);
    }

    query += ` ORDER BY updated_at DESC`;

    try {
      const results = await this.db.query(query, params);
      return results.map(this.transformStreakData);
    } catch (error) {
      throw new Error(`Failed to get streak data: ${error.message}`);
    }
  }

  /**
   * Store adherence configuration
   */
  async storeAdherenceConfiguration(config: AdherenceConfiguration): Promise<void> {
    const query = `
      INSERT INTO adherence_configurations (
        patient_id, cultural_preferences, family_settings,
        notification_settings, analytics_settings, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (patient_id)
      DO UPDATE SET
        cultural_preferences = EXCLUDED.cultural_preferences,
        family_settings = EXCLUDED.family_settings,
        notification_settings = EXCLUDED.notification_settings,
        analytics_settings = EXCLUDED.analytics_settings,
        updated_at = EXCLUDED.updated_at
    `;

    try {
      await this.db.none(query, [
        config.patientId,
        JSON.stringify(config.culturalPreferences),
        JSON.stringify(config.familySettings),
        JSON.stringify(config.notificationSettings),
        JSON.stringify(config.analyticsSettings),
        new Date().toISOString()
      ]);
    } catch (error) {
      throw new Error(`Failed to store adherence configuration: ${error.message}`);
    }
  }

  /**
   * Get adherence configuration
   */
  async getAdherenceConfiguration(patientId: string): Promise<AdherenceConfiguration | null> {
    const query = `
      SELECT * FROM adherence_configurations
      WHERE patient_id = $1
    `;

    try {
      const result = await this.db.oneOrNone(query, [patientId]);
      return result ? this.transformAdherenceConfiguration(result) : null;
    } catch (error) {
      throw new Error(`Failed to get adherence configuration: ${error.message}`);
    }
  }

  /**
   * Store provider adherence report
   */
  async storeProviderReport(report: ProviderAdherenceReport): Promise<void> {
    const query = `
      INSERT INTO provider_adherence_reports (
        report_id, patient_id, provider_id, report_type, period_start, period_end,
        summary, details, cultural_considerations, recommendations,
        generated_at, fhir_compliant
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `;

    try {
      await this.db.none(query, [
        report.reportId,
        report.patientId,
        report.providerId,
        report.reportType,
        report.period.start.toISOString(),
        report.period.end.toISOString(),
        JSON.stringify(report.summary),
        JSON.stringify(report.details),
        JSON.stringify(report.culturalConsiderations),
        JSON.stringify(report.recommendations),
        report.generatedAt.toISOString(),
        report.fhirCompliant
      ]);
    } catch (error) {
      throw new Error(`Failed to store provider report: ${error.message}`);
    }
  }

  /**
   * Get provider reports
   */
  async getProviderReports(
    patientId?: string,
    providerId?: string,
    options: {
      startDate?: Date;
      endDate?: Date;
      reportType?: string;
      limit?: number;
    } = {}
  ): Promise<ProviderAdherenceReport[]> {
    let query = `
      SELECT * FROM provider_adherence_reports
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramCount = 0;

    if (patientId) {
      paramCount++;
      query += ` AND patient_id = $${paramCount}`;
      params.push(patientId);
    }

    if (providerId) {
      paramCount++;
      query += ` AND provider_id = $${paramCount}`;
      params.push(providerId);
    }

    if (options.startDate) {
      paramCount++;
      query += ` AND period_start >= $${paramCount}`;
      params.push(options.startDate.toISOString());
    }

    if (options.endDate) {
      paramCount++;
      query += ` AND period_end <= $${paramCount}`;
      params.push(options.endDate.toISOString());
    }

    if (options.reportType) {
      paramCount++;
      query += ` AND report_type = $${paramCount}`;
      params.push(options.reportType);
    }

    query += ` ORDER BY generated_at DESC`;

    if (options.limit) {
      paramCount++;
      query += ` LIMIT $${paramCount}`;
      params.push(options.limit);
    }

    try {
      const results = await this.db.query(query, params);
      return results.map(this.transformProviderReport);
    } catch (error) {
      throw new Error(`Failed to get provider reports: ${error.message}`);
    }
  }

  // Transform methods

  private transformAdherenceRecord(row: any): AdherenceRecord {
    return {
      id: row.id,
      medicationId: row.medication_id,
      patientId: row.patient_id,
      scheduledTime: new Date(row.scheduled_time),
      takenTime: row.taken_time ? new Date(row.taken_time) : undefined,
      status: row.status,
      adherenceScore: row.adherence_score,
      notes: row.notes,
      culturalContext: {
        prayerTimeConflict: row.prayer_time_conflict || false,
        fastingPeriod: row.fasting_period || false,
        festivalPeriod: row.festival_period,
        familySupport: row.family_support || false,
        traditionalMedicineUsed: row.traditional_medicine_used || false,
        reasonCode: row.reason_code
      },
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  private transformProgressMetrics(row: any): ProgressMetrics {
    return {
      patientId: row.patient_id,
      period: row.period,
      adherenceRate: row.adherence_rate,
      streakCount: row.streak_count,
      longestStreak: row.longest_streak,
      totalDoses: row.total_doses,
      takenDoses: row.taken_doses,
      missedDoses: row.missed_doses,
      lateDoses: row.late_doses,
      skippedDoses: row.skipped_doses,
      culturalAdjustments: JSON.parse(row.cultural_adjustments),
      calculatedAt: new Date(row.calculated_at)
    };
  }

  private transformMilestone(row: any): Milestone {
    return {
      id: row.id,
      patientId: row.patient_id,
      type: row.type,
      threshold: row.threshold,
      culturalTheme: row.cultural_theme,
      achievedDate: row.achieved_date ? new Date(row.achieved_date) : undefined,
      celebrationShown: row.celebration_shown,
      familyNotified: row.family_notified,
      metadata: JSON.parse(row.metadata)
    };
  }

  private transformStreakData(row: any): StreakData {
    return {
      patientId: row.patient_id,
      medicationId: row.medication_id,
      currentStreak: row.current_streak,
      longestStreak: row.longest_streak,
      streakType: row.streak_type,
      startDate: new Date(row.start_date),
      lastDoseDate: row.last_dose_date ? new Date(row.last_dose_date) : undefined,
      culturalBonus: row.cultural_bonus,
      streakStatus: row.streak_status
    };
  }

  private transformAdherenceConfiguration(row: any): AdherenceConfiguration {
    return {
      patientId: row.patient_id,
      culturalPreferences: JSON.parse(row.cultural_preferences),
      familySettings: JSON.parse(row.family_settings),
      notificationSettings: JSON.parse(row.notification_settings),
      analyticsSettings: JSON.parse(row.analytics_settings)
    };
  }

  private transformProviderReport(row: any): ProviderAdherenceReport {
    return {
      reportId: row.report_id,
      patientId: row.patient_id,
      providerId: row.provider_id,
      reportType: row.report_type,
      period: {
        start: new Date(row.period_start),
        end: new Date(row.period_end)
      },
      summary: JSON.parse(row.summary),
      details: JSON.parse(row.details),
      culturalConsiderations: JSON.parse(row.cultural_considerations),
      recommendations: JSON.parse(row.recommendations),
      generatedAt: new Date(row.generated_at),
      fhirCompliant: row.fhir_compliant
    };
  }
}