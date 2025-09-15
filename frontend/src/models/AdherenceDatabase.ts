/**
 * AdherenceDatabase.ts
 * SQLite database model for offline-first adherence tracking
 * Provides robust local storage with sync capabilities
 */

import SQLite from 'react-native-sqlite-storage';
import {
  AdherenceRecord,
  ProgressMetrics,
  AdherenceMilestone,
  AdherenceReport,
  AdherenceCache,
  AdherenceBatchUpdate,
  StreakData,
  MedicationAdherenceMetric,
  MetricPeriod,
  AdherenceStatus,
  AdherenceMethod,
  CulturalAdherenceContext
} from '../types/adherence';

// Enable promise-based API
SQLite.enablePromise(true);

/**
 * Database schema version
 */
const SCHEMA_VERSION = 1;

/**
 * Table definitions
 */
const TABLES = {
  adherence_records: `
    CREATE TABLE IF NOT EXISTS adherence_records (
      id TEXT PRIMARY KEY,
      medication_id TEXT NOT NULL,
      patient_id TEXT NOT NULL,
      scheduled_time INTEGER NOT NULL,
      taken_time INTEGER,
      status TEXT NOT NULL,
      adherence_score INTEGER DEFAULT 0,
      notes TEXT,
      reminder_sent INTEGER DEFAULT 0,
      reminder_response_time INTEGER,
      location_lat REAL,
      location_lng REAL,
      cultural_prayer_time TEXT,
      cultural_fasting_period INTEGER DEFAULT 0,
      cultural_festival_name TEXT,
      cultural_family_involvement INTEGER DEFAULT 0,
      cultural_meal_timing TEXT,
      cultural_traditional_interaction INTEGER DEFAULT 0,
      method TEXT DEFAULT 'manual',
      delay_minutes INTEGER,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL,
      sync_status TEXT DEFAULT 'pending',
      sync_timestamp INTEGER
    )
  `,

  progress_metrics: `
    CREATE TABLE IF NOT EXISTS progress_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id TEXT NOT NULL,
      period TEXT NOT NULL,
      start_date INTEGER NOT NULL,
      end_date INTEGER NOT NULL,
      adherence_rate REAL,
      streak_count INTEGER DEFAULT 0,
      longest_streak INTEGER DEFAULT 0,
      total_doses INTEGER DEFAULT 0,
      taken_doses INTEGER DEFAULT 0,
      missed_doses INTEGER DEFAULT 0,
      late_doses INTEGER DEFAULT 0,
      skipped_doses INTEGER DEFAULT 0,
      average_timing_accuracy INTEGER,
      consistency_morning INTEGER,
      consistency_afternoon INTEGER,
      consistency_evening INTEGER,
      consistency_night INTEGER,
      medication_breakdown TEXT,
      created_at INTEGER NOT NULL,
      UNIQUE(patient_id, period, start_date, end_date)
    )
  `,

  milestones: `
    CREATE TABLE IF NOT EXISTS milestones (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      type TEXT NOT NULL,
      threshold INTEGER NOT NULL,
      cultural_theme TEXT,
      achieved_date INTEGER,
      celebration_shown INTEGER DEFAULT 0,
      title TEXT NOT NULL,
      description TEXT,
      badge_url TEXT,
      shareable_card_url TEXT,
      family_notified INTEGER DEFAULT 0,
      metadata TEXT,
      created_at INTEGER NOT NULL
    )
  `,

  improvements: `
    CREATE TABLE IF NOT EXISTS improvements (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      medication_id TEXT,
      suggestion TEXT NOT NULL,
      category TEXT NOT NULL,
      priority TEXT NOT NULL,
      expected_improvement INTEGER,
      culturally_relevant INTEGER DEFAULT 0,
      implementation_automatic INTEGER DEFAULT 0,
      implementation_requires_consent INTEGER DEFAULT 0,
      implementation_steps TEXT,
      created_at INTEGER NOT NULL,
      applied_at INTEGER,
      effectiveness INTEGER
    )
  `,

  reports: `
    CREATE TABLE IF NOT EXISTS reports (
      id TEXT PRIMARY KEY,
      patient_id TEXT NOT NULL,
      provider_id TEXT NOT NULL,
      report_type TEXT NOT NULL,
      start_date INTEGER NOT NULL,
      end_date INTEGER NOT NULL,
      overall_adherence REAL,
      medications TEXT,
      trends TEXT,
      cultural_factors TEXT,
      recommendations TEXT,
      generated_at INTEGER NOT NULL,
      sent_at INTEGER,
      viewed_at INTEGER
    )
  `,

  family_involvement: `
    CREATE TABLE IF NOT EXISTS family_involvement (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_id TEXT NOT NULL,
      family_member_id TEXT NOT NULL,
      relationship_type TEXT NOT NULL,
      involvement_level TEXT NOT NULL,
      notification_achievements INTEGER DEFAULT 1,
      notification_missed_doses INTEGER DEFAULT 1,
      notification_reports INTEGER DEFAULT 0,
      notification_emergencies INTEGER DEFAULT 1,
      last_active_date INTEGER,
      support_actions TEXT,
      created_at INTEGER NOT NULL,
      UNIQUE(patient_id, family_member_id)
    )
  `,

  analytics_events: `
    CREATE TABLE IF NOT EXISTS analytics_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_type TEXT NOT NULL,
      patient_id TEXT NOT NULL,
      medication_id TEXT,
      timestamp INTEGER NOT NULL,
      metadata TEXT,
      cultural_prayer_time TEXT,
      cultural_fasting_period INTEGER DEFAULT 0,
      cultural_festival_name TEXT,
      device_platform TEXT,
      device_version TEXT,
      device_timezone TEXT,
      sync_status TEXT DEFAULT 'pending',
      sync_timestamp INTEGER
    )
  `,

  cache_entries: `
    CREATE TABLE IF NOT EXISTS cache_entries (
      key TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      data TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      sync_status TEXT DEFAULT 'synced'
    )
  `
};

/**
 * Database indexes for performance
 */
const INDEXES = [
  'CREATE INDEX IF NOT EXISTS idx_adherence_patient ON adherence_records(patient_id)',
  'CREATE INDEX IF NOT EXISTS idx_adherence_medication ON adherence_records(medication_id)',
  'CREATE INDEX IF NOT EXISTS idx_adherence_scheduled ON adherence_records(scheduled_time)',
  'CREATE INDEX IF NOT EXISTS idx_adherence_sync ON adherence_records(sync_status)',
  'CREATE INDEX IF NOT EXISTS idx_metrics_patient ON progress_metrics(patient_id)',
  'CREATE INDEX IF NOT EXISTS idx_milestones_patient ON milestones(patient_id)',
  'CREATE INDEX IF NOT EXISTS idx_improvements_patient ON improvements(patient_id)',
  'CREATE INDEX IF NOT EXISTS idx_reports_patient ON reports(patient_id)',
  'CREATE INDEX IF NOT EXISTS idx_events_patient ON analytics_events(patient_id)',
  'CREATE INDEX IF NOT EXISTS idx_events_sync ON analytics_events(sync_status)',
  'CREATE INDEX IF NOT EXISTS idx_cache_expires ON cache_entries(expires_at)'
];

export class AdherenceDatabase {
  private static instance: AdherenceDatabase;
  private db: SQLite.SQLiteDatabase | null = null;
  private readonly dbName = 'medimate_adherence.db';
  private readonly dbLocation = 'default';

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): AdherenceDatabase {
    if (!AdherenceDatabase.instance) {
      AdherenceDatabase.instance = new AdherenceDatabase();
    }
    return AdherenceDatabase.instance;
  }

  /**
   * Initialize database
   */
  public async initialize(): Promise<void> {
    try {
      // Open database
      this.db = await SQLite.openDatabase({
        name: this.dbName,
        location: this.dbLocation
      });

      // Create tables
      await this.createTables();

      // Create indexes
      await this.createIndexes();

      // Check and run migrations if needed
      await this.checkMigrations();

      console.log('Adherence database initialized successfully');
    } catch (error) {
      console.error('Error initializing adherence database:', error);
      throw error;
    }
  }

  /**
   * Create database tables
   */
  private async createTables(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    for (const [tableName, schema] of Object.entries(TABLES)) {
      try {
        await this.db.executeSql(schema);
        console.log(`Table ${tableName} created/verified`);
      } catch (error) {
        console.error(`Error creating table ${tableName}:`, error);
        throw error;
      }
    }

    // Create metadata table for schema version
    await this.db.executeSql(`
      CREATE TABLE IF NOT EXISTS metadata (
        key TEXT PRIMARY KEY,
        value TEXT
      )
    `);
  }

  /**
   * Create database indexes
   */
  private async createIndexes(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    for (const index of INDEXES) {
      try {
        await this.db.executeSql(index);
      } catch (error) {
        console.error('Error creating index:', error);
      }
    }
  }

  /**
   * Check and run migrations
   */
  private async checkMigrations(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      const [result] = await this.db.executeSql(
        'SELECT value FROM metadata WHERE key = ?',
        ['schema_version']
      );

      const currentVersion = result.rows.length > 0
        ? parseInt(result.rows.item(0).value)
        : 0;

      if (currentVersion < SCHEMA_VERSION) {
        await this.runMigrations(currentVersion, SCHEMA_VERSION);
      }

      // Update schema version
      await this.db.executeSql(
        'INSERT OR REPLACE INTO metadata (key, value) VALUES (?, ?)',
        ['schema_version', SCHEMA_VERSION.toString()]
      );
    } catch (error) {
      console.error('Error checking migrations:', error);
    }
  }

  /**
   * Run migrations
   */
  private async runMigrations(fromVersion: number, toVersion: number): Promise<void> {
    // Add migration logic here as schema evolves
    console.log(`Migrating from version ${fromVersion} to ${toVersion}`);
  }

  /**
   * Save adherence record
   */
  public async saveAdherenceRecord(record: AdherenceRecord): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const sql = `
      INSERT OR REPLACE INTO adherence_records (
        id, medication_id, patient_id, scheduled_time, taken_time,
        status, adherence_score, notes, reminder_sent, reminder_response_time,
        location_lat, location_lng, cultural_prayer_time, cultural_fasting_period,
        cultural_festival_name, cultural_family_involvement, cultural_meal_timing,
        cultural_traditional_interaction, method, delay_minutes, created_at, updated_at, sync_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      record.id,
      record.medicationId,
      record.patientId,
      record.scheduledTime.getTime(),
      record.takenTime?.getTime() || null,
      record.status,
      record.adherenceScore,
      record.notes || null,
      0, // reminder_sent placeholder
      null, // reminder_response_time placeholder
      null, // location_lat placeholder
      null, // location_lng placeholder
      record.culturalContext?.prayerTime || null,
      record.culturalContext?.fastingPeriod ? 1 : 0,
      record.culturalContext?.festivalName || null,
      record.culturalContext?.familyInvolvement ? 1 : 0,
      record.culturalContext?.mealTiming || null,
      record.culturalContext?.traditionalMedicineInteraction ? 1 : 0,
      record.method || 'manual',
      record.delayMinutes || null,
      record.createdAt.getTime(),
      record.updatedAt.getTime(),
      'pending'
    ];

    await this.db.executeSql(sql, params);
  }

  /**
   * Get adherence records
   */
  public async getAdherenceRecords(
    patientId: string,
    startDate?: Date,
    endDate?: Date,
    medicationId?: string
  ): Promise<AdherenceRecord[]> {
    if (!this.db) throw new Error('Database not initialized');

    let sql = 'SELECT * FROM adherence_records WHERE patient_id = ?';
    const params: any[] = [patientId];

    if (startDate) {
      sql += ' AND scheduled_time >= ?';
      params.push(startDate.getTime());
    }

    if (endDate) {
      sql += ' AND scheduled_time <= ?';
      params.push(endDate.getTime());
    }

    if (medicationId) {
      sql += ' AND medication_id = ?';
      params.push(medicationId);
    }

    sql += ' ORDER BY scheduled_time DESC';

    const [result] = await this.db.executeSql(sql, params);
    const records: AdherenceRecord[] = [];

    for (let i = 0; i < result.rows.length; i++) {
      const row = result.rows.item(i);
      records.push(this.rowToAdherenceRecord(row));
    }

    return records;
  }

  /**
   * Save progress metrics
   */
  public async saveProgressMetrics(metrics: ProgressMetrics): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const sql = `
      INSERT OR REPLACE INTO progress_metrics (
        patient_id, period, start_date, end_date, adherence_rate,
        streak_count, longest_streak, total_doses, taken_doses,
        missed_doses, late_doses, skipped_doses, average_timing_accuracy,
        consistency_morning, consistency_afternoon, consistency_evening,
        consistency_night, medication_breakdown, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    // Calculate aggregated metrics from the medications array
    const totalDoses = metrics.medications.reduce((sum, m) => sum + m.totalDoses, 0);
    const takenDoses = metrics.medications.reduce((sum, m) => sum + m.takenDoses, 0);
    const missedDoses = metrics.medications.reduce((sum, m) => sum + m.missedDoses, 0);
    const lateDoses = metrics.medications.reduce((sum, m) => sum + m.lateDoses, 0);
    const averageDelay = metrics.medications.reduce((sum, m) => sum + m.averageDelayMinutes, 0) / metrics.medications.length || 0;

    const params = [
      metrics.patientId,
      metrics.period,
      metrics.startDate.getTime(),
      metrics.endDate.getTime(),
      metrics.overallAdherence,
      metrics.streaks.currentStreak,
      metrics.streaks.longestStreak,
      totalDoses,
      takenDoses,
      missedDoses,
      lateDoses,
      0, // skipped doses placeholder
      averageDelay,
      null, // consistency morning
      null, // consistency afternoon
      null, // consistency evening
      null, // consistency night
      JSON.stringify(metrics.medications),
      Date.now()
    ];

    await this.db.executeSql(sql, params);
  }

  /**
   * Get progress metrics
   */
  public async getProgressMetrics(
    patientId: string,
    period?: string,
    limit: number = 10
  ): Promise<ProgressMetrics[]> {
    if (!this.db) throw new Error('Database not initialized');

    let sql = 'SELECT * FROM progress_metrics WHERE patient_id = ?';
    const params: any[] = [patientId];

    if (period) {
      sql += ' AND period = ?';
      params.push(period);
    }

    sql += ' ORDER BY end_date DESC LIMIT ?';
    params.push(limit);

    const [result] = await this.db.executeSql(sql, params);
    const metrics: ProgressMetrics[] = [];

    for (let i = 0; i < result.rows.length; i++) {
      const row = result.rows.item(i);
      metrics.push(this.rowToProgressMetrics(row));
    }

    return metrics;
  }

  /**
   * Save milestone
   */
  public async saveMilestone(milestone: AdherenceMilestone): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const sql = `
      INSERT OR REPLACE INTO milestones (
        id, patient_id, type, threshold, cultural_theme,
        achieved_date, celebration_shown, title, description,
        badge_url, shareable_card_url, family_notified,
        metadata, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      milestone.id,
      '', // patient_id placeholder - should be provided
      milestone.type,
      milestone.threshold,
      JSON.stringify(milestone.culturalTheme),
      milestone.achievedDate?.getTime() || null,
      milestone.celebrationShown ? 1 : 0,
      milestone.name,
      milestone.description,
      null, // badge_url placeholder
      null, // shareable_card_url placeholder
      0, // family_notified placeholder
      JSON.stringify({ rewardPoints: milestone.rewardPoints }),
      Date.now()
    ];

    await this.db.executeSql(sql, params);
  }

  /**
   * Get milestones
   */
  public async getMilestones(
    patientId: string,
    achieved?: boolean
  ): Promise<AdherenceMilestone[]> {
    if (!this.db) throw new Error('Database not initialized');

    let sql = 'SELECT * FROM milestones WHERE patient_id = ?';
    const params: any[] = [patientId];

    if (achieved !== undefined) {
      sql += achieved ? ' AND achieved_date IS NOT NULL' : ' AND achieved_date IS NULL';
    }

    sql += ' ORDER BY created_at DESC';

    const [result] = await this.db.executeSql(sql, params);
    const milestones: AdherenceMilestone[] = [];

    for (let i = 0; i < result.rows.length; i++) {
      const row = result.rows.item(i);
      milestones.push(this.rowToMilestone(row));
    }

    return milestones;
  }

  /**
   * Save analytics event
   */
  public async saveAnalyticsEvent(event: any): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const sql = `
      INSERT INTO analytics_events (
        event_type, patient_id, medication_id, timestamp, metadata,
        cultural_during_prayer, cultural_during_fasting, cultural_festival,
        device_platform, device_version, device_timezone, sync_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      event.eventType,
      event.patientId,
      event.medicationId || null,
      event.timestamp.getTime(),
      JSON.stringify(event.metadata),
      event.culturalContext?.prayerTime || null,
      event.culturalContext?.fastingPeriod ? 1 : 0,
      event.culturalContext?.festivalName || null,
      event.deviceInfo?.platform || null,
      event.deviceInfo?.version || null,
      event.deviceInfo?.timezone || null,
      'pending'
    ];

    await this.db.executeSql(sql, params);
  }

  /**
   * Get unsynced analytics events
   */
  public async getUnsyncedAnalyticsEvents(limit: number = 100): Promise<any[]> {
    if (!this.db) throw new Error('Database not initialized');

    const sql = `
      SELECT * FROM analytics_events
      WHERE sync_status = 'pending'
      ORDER BY timestamp ASC
      LIMIT ?
    `;

    const [result] = await this.db.executeSql(sql, [limit]);
    const events: any[] = [];

    for (let i = 0; i < result.rows.length; i++) {
      const row = result.rows.item(i);
      events.push(this.rowToAnalyticsEvent(row));
    }

    return events;
  }

  /**
   * Mark analytics events as synced
   */
  public async markAnalyticsEventsSynced(eventIds: number[]): Promise<void> {
    if (!this.db || eventIds.length === 0) return;

    const placeholders = eventIds.map(() => '?').join(',');
    const sql = `
      UPDATE analytics_events
      SET sync_status = 'synced', sync_timestamp = ?
      WHERE id IN (${placeholders})
    `;

    await this.db.executeSql(sql, [Date.now(), ...eventIds]);
  }

  /**
   * Save cache entry
   */
  public async saveCacheEntry(entry: AdherenceCache): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const sql = `
      INSERT OR REPLACE INTO cache_entries (
        key, type, data, timestamp, expires_at, sync_status
      ) VALUES (?, ?, ?, ?, ?, ?)
    `;

    const key = `${entry.patientId}_cache`;
    const expiresAt = Date.now() + (entry.ttl * 1000);

    const params = [
      key,
      'metrics',
      JSON.stringify(entry.metrics),
      entry.lastCalculated.getTime(),
      expiresAt,
      'synced'
    ];

    await this.db.executeSql(sql, params);
  }

  /**
   * Get cache entry
   */
  public async getCacheEntry(key: string): Promise<AdherenceCache | null> {
    if (!this.db) throw new Error('Database not initialized');

    const sql = 'SELECT * FROM cache_entries WHERE key = ? AND expires_at > ?';
    const [result] = await this.db.executeSql(sql, [key, Date.now()]);

    if (result.rows.length > 0) {
      const row = result.rows.item(0);
      return {
        patientId: '', // Will need to be parsed from key or stored separately
        lastCalculated: new Date(row.timestamp),
        metrics: JSON.parse(row.data),
        ttl: Math.floor((new Date(row.expires_at).getTime() - Date.now()) / 1000),
        invalidateOn: ['medication_taken', 'record_updated', 'config_changed']
      };
    }

    return null;
  }

  /**
   * Clean expired cache entries
   */
  public async cleanExpiredCache(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const sql = 'DELETE FROM cache_entries WHERE expires_at < ?';
    await this.db.executeSql(sql, [Date.now()]);
  }

  /**
   * Get database statistics
   */
  public async getDatabaseStats(): Promise<{
    recordCount: number;
    metricsCount: number;
    milestonesCount: number;
    eventsCount: number;
    cacheSize: number;
    unsyncedCount: number;
  }> {
    if (!this.db) throw new Error('Database not initialized');

    const stats = {
      recordCount: 0,
      metricsCount: 0,
      milestonesCount: 0,
      eventsCount: 0,
      cacheSize: 0,
      unsyncedCount: 0
    };

    // Count records
    const [recordResult] = await this.db.executeSql('SELECT COUNT(*) as count FROM adherence_records');
    stats.recordCount = recordResult.rows.item(0).count;

    // Count metrics
    const [metricsResult] = await this.db.executeSql('SELECT COUNT(*) as count FROM progress_metrics');
    stats.metricsCount = metricsResult.rows.item(0).count;

    // Count milestones
    const [milestonesResult] = await this.db.executeSql('SELECT COUNT(*) as count FROM milestones');
    stats.milestonesCount = milestonesResult.rows.item(0).count;

    // Count events
    const [eventsResult] = await this.db.executeSql('SELECT COUNT(*) as count FROM analytics_events');
    stats.eventsCount = eventsResult.rows.item(0).count;

    // Count cache entries
    const [cacheResult] = await this.db.executeSql('SELECT COUNT(*) as count FROM cache_entries');
    stats.cacheSize = cacheResult.rows.item(0).count;

    // Count unsynced records
    const [unsyncedResult] = await this.db.executeSql(
      'SELECT COUNT(*) as count FROM adherence_records WHERE sync_status = ?',
      ['pending']
    );
    stats.unsyncedCount = unsyncedResult.rows.item(0).count;

    return stats;
  }

  /**
   * Clear all data (for testing or reset)
   */
  public async clearAllData(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const tables = [
      'adherence_records',
      'progress_metrics',
      'milestones',
      'improvements',
      'reports',
      'family_involvement',
      'analytics_events',
      'cache_entries'
    ];

    for (const table of tables) {
      await this.db.executeSql(`DELETE FROM ${table}`);
    }
  }

  /**
   * Close database connection
   */
  public async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
      this.db = null;
    }
  }

  /**
   * Helper methods to convert database rows to types
   */

  private rowToAdherenceRecord(row: any): AdherenceRecord {
    return {
      id: row.id,
      medicationId: row.medication_id,
      patientId: row.patient_id,
      scheduledTime: new Date(row.scheduled_time),
      takenTime: row.taken_time ? new Date(row.taken_time) : undefined,
      status: row.status as AdherenceStatus,
      adherenceScore: row.adherence_score,
      method: row.method as AdherenceMethod || 'manual',
      delayMinutes: row.delay_minutes,
      culturalContext: {
        prayerTime: row.cultural_prayer_time,
        fastingPeriod: row.cultural_fasting_period === 1,
        festivalName: row.cultural_festival_name,
        familyInvolvement: row.cultural_family_involvement === 1,
        mealTiming: row.cultural_meal_timing as any,
        traditionalMedicineInteraction: row.cultural_traditional_interaction === 1
      },
      notes: row.notes,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  private rowToProgressMetrics(row: any): ProgressMetrics {
    const medicationBreakdown = JSON.parse(row.medication_breakdown || '[]');
    return {
      patientId: row.patient_id,
      period: row.period as MetricPeriod,
      startDate: new Date(row.start_date),
      endDate: new Date(row.end_date),
      overallAdherence: row.adherence_rate,
      medications: medicationBreakdown,
      streaks: {
        currentStreak: row.streak_count,
        longestStreak: row.longest_streak,
        weeklyStreaks: [],
        monthlyStreaks: [],
        recoverable: false
      },
      patterns: [],
      predictions: [],
      culturalInsights: []
    };
  }

  private rowToMilestone(row: any): AdherenceMilestone {
    return {
      id: row.id,
      type: row.type,
      threshold: row.threshold,
      name: row.title,
      description: row.description,
      culturalTheme: row.cultural_theme ? JSON.parse(row.cultural_theme) : {
        name: 'default',
        primaryColor: '#4A90E2',
        secondaryColor: '#FFD700',
        icon: 'star',
        message: { en: 'Congratulations!', ms: 'Tahniah!' }
      },
      achievedDate: row.achieved_date ? new Date(row.achieved_date) : undefined,
      celebrationShown: row.celebration_shown === 1,
      shareable: true,
      rewardPoints: 0
    };
  }

  private rowToAnalyticsEvent(row: any): any {
    return {
      eventType: row.event_type,
      patientId: row.patient_id,
      medicationId: row.medication_id,
      timestamp: new Date(row.timestamp),
      metadata: JSON.parse(row.metadata || '{}'),
      culturalContext: {
        prayerTime: row.cultural_prayer_time,
        fastingPeriod: row.cultural_fasting_period === 1,
        festivalName: row.cultural_festival_name
      },
      deviceInfo: row.device_platform ? {
        platform: row.device_platform,
        version: row.device_version,
        timezone: row.device_timezone
      } : undefined
    };
  }
}