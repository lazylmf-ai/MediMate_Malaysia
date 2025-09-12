/**
 * Reminder Database Schema and Service
 * 
 * SQLite database schema extensions for Issue #24 Stream A offline reminder queue
 * with 7-day capability, cultural constraint storage, and efficient querying.
 * 
 * Features:
 * - Offline-first architecture with 7-day reminder queue
 * - Cultural constraint storage and indexing
 * - Efficient background task querying
 * - Data synchronization tracking
 * - Battery optimization through smart indexing
 */

import * as SQLite from 'expo-sqlite';
import { Asset } from 'expo-asset';
import * as FileSystem from 'expo-file-system';

export interface ReminderScheduleRecord {
  id: string;
  medication_id: string;
  user_id: string;
  scheduled_time: string; // ISO string
  actual_delivery_time?: string; // ISO string
  delivery_methods: string; // JSON array
  cultural_constraints: string; // JSON object
  status: 'pending' | 'delivered' | 'missed' | 'cancelled';
  retry_count: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  created_at: string; // ISO string
  updated_at: string; // ISO string
  version: number;
}

export interface ReminderPreferenceRecord {
  user_id: string;
  avoid_prayer_times: boolean;
  prayer_buffer_minutes: number;
  preferred_delivery_methods: string; // JSON array
  quiet_hours_start?: string; // HH:MM
  quiet_hours_end?: string; // HH:MM
  escalation_enabled: boolean;
  escalation_delay_minutes: number;
  batching_enabled: boolean;
  max_batch_size: number;
  cultural_profile: string; // JSON object
  created_at: string; // ISO string
  updated_at: string; // ISO string
}

export interface OfflineReminderQueueRecord {
  id: string;
  reminder_schedule_id: string;
  payload: string; // JSON reminder data
  scheduled_delivery: string; // ISO string
  attempts: number;
  last_attempt?: string; // ISO string
  queue_priority: 'low' | 'medium' | 'high' | 'critical';
  cultural_context: string; // JSON object
  delivery_methods: string; // JSON array
  created_at: string; // ISO string
  expires_at: string; // ISO string (created_at + 7 days)
}

export interface ReminderDeliveryHistoryRecord {
  id: string;
  reminder_id: string;
  user_id: string;
  medication_id: string;
  scheduled_time: string; // ISO string
  delivered_at?: string; // ISO string
  delivery_method: string;
  status: 'delivered' | 'failed' | 'missed' | 'cancelled';
  failure_reason?: string;
  cultural_adjustments?: string; // JSON array
  battery_impact: number; // Estimated battery usage percentage
  created_at: string; // ISO string
}

export interface CulturalConstraintCacheRecord {
  id: string;
  user_id: string;
  constraint_type: 'prayer_times' | 'ramadan' | 'quiet_hours' | 'meal_times' | 'custom';
  constraint_data: string; // JSON object
  effective_date: string; // ISO string
  expires_at: string; // ISO string
  location_context?: string; // JSON object (latitude, longitude, timezone)
  created_at: string; // ISO string
  updated_at: string; // ISO string
}

export interface BatchedReminderRecord {
  batch_id: string;
  reminder_ids: string; // JSON array of reminder IDs
  scheduled_time: string; // ISO string
  cultural_context: string; // JSON object
  estimated_battery_impact: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  created_at: string; // ISO string
  processed_at?: string; // ISO string
}

class ReminderDatabase {
  private static instance: ReminderDatabase;
  private db: SQLite.Database | null = null;
  private readonly DB_NAME = 'medimate_reminders.db';
  private readonly DB_VERSION = 1;

  private constructor() {}

  static getInstance(): ReminderDatabase {
    if (!ReminderDatabase.instance) {
      ReminderDatabase.instance = new ReminderDatabase();
    }
    return ReminderDatabase.instance;
  }

  /**
   * Initialize database with schema creation and migrations
   */
  async initialize(): Promise<{ success: boolean; error?: string }> {
    try {
      this.db = await SQLite.openDatabaseAsync(this.DB_NAME);
      
      // Enable foreign key constraints and performance optimizations
      await this.db.execAsync(`
        PRAGMA foreign_keys = ON;
        PRAGMA journal_mode = WAL;
        PRAGMA synchronous = NORMAL;
        PRAGMA cache_size = -2000;
        PRAGMA temp_store = memory;
      `);

      await this.createTables();
      await this.createIndexes();
      await this.insertDefaultData();

      return { success: true };
    } catch (error) {
      console.error('Database initialization failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Database initialization failed'
      };
    }
  }

  /**
   * Create database tables with comprehensive schema
   */
  private async createTables(): Promise<void> {
    const createTablesSQL = `
      -- Reminder schedules table
      CREATE TABLE IF NOT EXISTS reminder_schedules (
        id TEXT PRIMARY KEY,
        medication_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        scheduled_time DATETIME NOT NULL,
        actual_delivery_time DATETIME,
        delivery_methods TEXT NOT NULL, -- JSON array
        cultural_constraints TEXT NOT NULL, -- JSON object
        status TEXT NOT NULL CHECK (status IN ('pending', 'delivered', 'missed', 'cancelled')) DEFAULT 'pending',
        retry_count INTEGER NOT NULL DEFAULT 0,
        priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        version INTEGER NOT NULL DEFAULT 1
      );

      -- Reminder preferences table
      CREATE TABLE IF NOT EXISTS reminder_preferences (
        user_id TEXT PRIMARY KEY,
        avoid_prayer_times BOOLEAN NOT NULL DEFAULT 1,
        prayer_buffer_minutes INTEGER NOT NULL DEFAULT 30,
        preferred_delivery_methods TEXT NOT NULL, -- JSON array
        quiet_hours_start TEXT, -- HH:MM format
        quiet_hours_end TEXT,   -- HH:MM format
        escalation_enabled BOOLEAN NOT NULL DEFAULT 1,
        escalation_delay_minutes INTEGER NOT NULL DEFAULT 15,
        batching_enabled BOOLEAN NOT NULL DEFAULT 1,
        max_batch_size INTEGER NOT NULL DEFAULT 5,
        cultural_profile TEXT NOT NULL, -- JSON object
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      -- Offline reminder queue table (7-day capability)
      CREATE TABLE IF NOT EXISTS offline_reminder_queue (
        id TEXT PRIMARY KEY,
        reminder_schedule_id TEXT NOT NULL,
        payload TEXT NOT NULL, -- JSON reminder data
        scheduled_delivery DATETIME NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        last_attempt DATETIME,
        queue_priority TEXT NOT NULL CHECK (queue_priority IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
        cultural_context TEXT NOT NULL, -- JSON object
        delivery_methods TEXT NOT NULL, -- JSON array
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME NOT NULL,
        FOREIGN KEY (reminder_schedule_id) REFERENCES reminder_schedules(id) ON DELETE CASCADE
      );

      -- Reminder delivery history table
      CREATE TABLE IF NOT EXISTS reminder_delivery_history (
        id TEXT PRIMARY KEY,
        reminder_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        medication_id TEXT NOT NULL,
        scheduled_time DATETIME NOT NULL,
        delivered_at DATETIME,
        delivery_method TEXT NOT NULL,
        status TEXT NOT NULL CHECK (status IN ('delivered', 'failed', 'missed', 'cancelled')),
        failure_reason TEXT,
        cultural_adjustments TEXT, -- JSON array
        battery_impact REAL NOT NULL DEFAULT 0.0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      -- Cultural constraint cache table
      CREATE TABLE IF NOT EXISTS cultural_constraint_cache (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        constraint_type TEXT NOT NULL CHECK (constraint_type IN ('prayer_times', 'ramadan', 'quiet_hours', 'meal_times', 'custom')),
        constraint_data TEXT NOT NULL, -- JSON object
        effective_date DATETIME NOT NULL,
        expires_at DATETIME NOT NULL,
        location_context TEXT, -- JSON object
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );

      -- Batched reminders table
      CREATE TABLE IF NOT EXISTS batched_reminders (
        batch_id TEXT PRIMARY KEY,
        reminder_ids TEXT NOT NULL, -- JSON array
        scheduled_time DATETIME NOT NULL,
        cultural_context TEXT NOT NULL, -- JSON object
        estimated_battery_impact REAL NOT NULL DEFAULT 0.0,
        status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        processed_at DATETIME
      );

      -- Sync status table
      CREATE TABLE IF NOT EXISTS reminder_sync_status (
        user_id TEXT PRIMARY KEY,
        last_sync_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        pending_uploads INTEGER NOT NULL DEFAULT 0,
        pending_downloads INTEGER NOT NULL DEFAULT 0,
        sync_errors TEXT, -- JSON array of error messages
        last_error_at DATETIME,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await this.db!.execAsync(createTablesSQL);
  }

  /**
   * Create database indexes for performance optimization
   */
  private async createIndexes(): Promise<void> {
    const createIndexesSQL = `
      -- Performance indexes
      CREATE INDEX IF NOT EXISTS idx_reminder_schedules_user_time 
        ON reminder_schedules(user_id, scheduled_time);
      
      CREATE INDEX IF NOT EXISTS idx_reminder_schedules_status_priority 
        ON reminder_schedules(status, priority);
      
      CREATE INDEX IF NOT EXISTS idx_reminder_schedules_medication 
        ON reminder_schedules(medication_id);

      CREATE INDEX IF NOT EXISTS idx_offline_queue_delivery_time 
        ON offline_reminder_queue(scheduled_delivery);
      
      CREATE INDEX IF NOT EXISTS idx_offline_queue_priority_attempts 
        ON offline_reminder_queue(queue_priority, attempts);
      
      CREATE INDEX IF NOT EXISTS idx_offline_queue_expires 
        ON offline_reminder_queue(expires_at);

      CREATE INDEX IF NOT EXISTS idx_delivery_history_user_time 
        ON reminder_delivery_history(user_id, created_at);
      
      CREATE INDEX IF NOT EXISTS idx_delivery_history_status 
        ON reminder_delivery_history(status);

      CREATE INDEX IF NOT EXISTS idx_cultural_cache_user_type 
        ON cultural_constraint_cache(user_id, constraint_type);
      
      CREATE INDEX IF NOT EXISTS idx_cultural_cache_expires 
        ON cultural_constraint_cache(expires_at);

      CREATE INDEX IF NOT EXISTS idx_batched_reminders_time_status 
        ON batched_reminders(scheduled_time, status);
    `;

    await this.db!.execAsync(createIndexesSQL);
  }

  /**
   * Insert default data and configuration
   */
  private async insertDefaultData(): Promise<void> {
    // Default reminder preferences for new users would be inserted here
    // This is handled by the application layer when users sign up
  }

  /**
   * Reminder Schedule Operations
   */

  async insertReminderSchedule(schedule: Omit<ReminderScheduleRecord, 'created_at' | 'updated_at'>): Promise<void> {
    const sql = `
      INSERT INTO reminder_schedules (
        id, medication_id, user_id, scheduled_time, actual_delivery_time,
        delivery_methods, cultural_constraints, status, retry_count, priority, version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await this.db!.runAsync(sql, [
      schedule.id,
      schedule.medication_id,
      schedule.user_id,
      schedule.scheduled_time,
      schedule.actual_delivery_time || null,
      schedule.delivery_methods,
      schedule.cultural_constraints,
      schedule.status,
      schedule.retry_count,
      schedule.priority,
      schedule.version
    ]);
  }

  async getReminderSchedulesByUser(userId: string, limit?: number): Promise<ReminderScheduleRecord[]> {
    const sql = `
      SELECT * FROM reminder_schedules 
      WHERE user_id = ? 
      ORDER BY scheduled_time ASC
      ${limit ? 'LIMIT ?' : ''}
    `;
    
    const params = limit ? [userId, limit] : [userId];
    const result = await this.db!.getAllAsync(sql, params);
    return result as ReminderScheduleRecord[];
  }

  async updateReminderScheduleStatus(
    scheduleId: string, 
    status: ReminderScheduleRecord['status'],
    actualDeliveryTime?: string
  ): Promise<void> {
    const sql = `
      UPDATE reminder_schedules 
      SET status = ?, actual_delivery_time = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await this.db!.runAsync(sql, [status, actualDeliveryTime || null, scheduleId]);
  }

  /**
   * Offline Queue Operations
   */

  async addToOfflineQueue(queueItem: Omit<OfflineReminderQueueRecord, 'created_at' | 'expires_at'>): Promise<void> {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7-day expiry

    const sql = `
      INSERT INTO offline_reminder_queue (
        id, reminder_schedule_id, payload, scheduled_delivery, attempts,
        last_attempt, queue_priority, cultural_context, delivery_methods, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await this.db!.runAsync(sql, [
      queueItem.id,
      queueItem.reminder_schedule_id,
      queueItem.payload,
      queueItem.scheduled_delivery,
      queueItem.attempts,
      queueItem.last_attempt || null,
      queueItem.queue_priority,
      queueItem.cultural_context,
      queueItem.delivery_methods,
      expiresAt.toISOString()
    ]);
  }

  async getPendingOfflineReminders(limit?: number): Promise<OfflineReminderQueueRecord[]> {
    const sql = `
      SELECT * FROM offline_reminder_queue 
      WHERE scheduled_delivery <= CURRENT_TIMESTAMP 
        AND attempts < 3 
        AND expires_at > CURRENT_TIMESTAMP
      ORDER BY queue_priority DESC, scheduled_delivery ASC
      ${limit ? 'LIMIT ?' : ''}
    `;
    
    const params = limit ? [limit] : [];
    const result = await this.db!.getAllAsync(sql, params);
    return result as OfflineReminderQueueRecord[];
  }

  async updateOfflineReminderAttempt(reminderId: string): Promise<void> {
    const sql = `
      UPDATE offline_reminder_queue 
      SET attempts = attempts + 1, last_attempt = CURRENT_TIMESTAMP
      WHERE id = ?
    `;

    await this.db!.runAsync(sql, [reminderId]);
  }

  async removeFromOfflineQueue(reminderId: string): Promise<void> {
    const sql = `DELETE FROM offline_reminder_queue WHERE id = ?`;
    await this.db!.runAsync(sql, [reminderId]);
  }

  async cleanupExpiredOfflineReminders(): Promise<number> {
    const sql = `DELETE FROM offline_reminder_queue WHERE expires_at <= CURRENT_TIMESTAMP`;
    const result = await this.db!.runAsync(sql);
    return result.changes;
  }

  /**
   * Cultural Constraint Cache Operations
   */

  async upsertCulturalConstraint(constraint: Omit<CulturalConstraintCacheRecord, 'created_at' | 'updated_at'>): Promise<void> {
    const sql = `
      INSERT OR REPLACE INTO cultural_constraint_cache (
        id, user_id, constraint_type, constraint_data, effective_date,
        expires_at, location_context
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    await this.db!.runAsync(sql, [
      constraint.id,
      constraint.user_id,
      constraint.constraint_type,
      constraint.constraint_data,
      constraint.effective_date,
      constraint.expires_at,
      constraint.location_context || null
    ]);
  }

  async getCulturalConstraints(
    userId: string, 
    constraintType?: CulturalConstraintCacheRecord['constraint_type']
  ): Promise<CulturalConstraintCacheRecord[]> {
    const sql = `
      SELECT * FROM cultural_constraint_cache 
      WHERE user_id = ? 
        ${constraintType ? 'AND constraint_type = ?' : ''}
        AND expires_at > CURRENT_TIMESTAMP
      ORDER BY effective_date DESC
    `;
    
    const params = constraintType ? [userId, constraintType] : [userId];
    const result = await this.db!.getAllAsync(sql, params);
    return result as CulturalConstraintCacheRecord[];
  }

  async cleanupExpiredCulturalConstraints(): Promise<number> {
    const sql = `DELETE FROM cultural_constraint_cache WHERE expires_at <= CURRENT_TIMESTAMP`;
    const result = await this.db!.runAsync(sql);
    return result.changes;
  }

  /**
   * Batched Reminders Operations
   */

  async insertBatchedReminder(batch: Omit<BatchedReminderRecord, 'created_at'>): Promise<void> {
    const sql = `
      INSERT INTO batched_reminders (
        batch_id, reminder_ids, scheduled_time, cultural_context,
        estimated_battery_impact, status, processed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    await this.db!.runAsync(sql, [
      batch.batch_id,
      batch.reminder_ids,
      batch.scheduled_time,
      batch.cultural_context,
      batch.estimated_battery_impact,
      batch.status,
      batch.processed_at || null
    ]);
  }

  async getPendingBatches(limit?: number): Promise<BatchedReminderRecord[]> {
    const sql = `
      SELECT * FROM batched_reminders 
      WHERE status = 'pending' AND scheduled_time <= CURRENT_TIMESTAMP
      ORDER BY scheduled_time ASC
      ${limit ? 'LIMIT ?' : ''}
    `;
    
    const params = limit ? [limit] : [];
    const result = await this.db!.getAllAsync(sql, params);
    return result as BatchedReminderRecord[];
  }

  async updateBatchStatus(batchId: string, status: BatchedReminderRecord['status']): Promise<void> {
    const sql = `
      UPDATE batched_reminders 
      SET status = ?, processed_at = CURRENT_TIMESTAMP
      WHERE batch_id = ?
    `;

    await this.db!.runAsync(sql, [status, batchId]);
  }

  /**
   * Delivery History Operations
   */

  async insertDeliveryHistory(history: Omit<ReminderDeliveryHistoryRecord, 'created_at'>): Promise<void> {
    const sql = `
      INSERT INTO reminder_delivery_history (
        id, reminder_id, user_id, medication_id, scheduled_time, delivered_at,
        delivery_method, status, failure_reason, cultural_adjustments, battery_impact
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await this.db!.runAsync(sql, [
      history.id,
      history.reminder_id,
      history.user_id,
      history.medication_id,
      history.scheduled_time,
      history.delivered_at || null,
      history.delivery_method,
      history.status,
      history.failure_reason || null,
      history.cultural_adjustments || null,
      history.battery_impact
    ]);
  }

  async getDeliveryHistory(
    userId: string,
    limit: number = 100,
    status?: ReminderDeliveryHistoryRecord['status']
  ): Promise<ReminderDeliveryHistoryRecord[]> {
    const sql = `
      SELECT * FROM reminder_delivery_history 
      WHERE user_id = ? 
        ${status ? 'AND status = ?' : ''}
      ORDER BY created_at DESC 
      LIMIT ?
    `;
    
    const params = status ? [userId, status, limit] : [userId, limit];
    const result = await this.db!.getAllAsync(sql, params);
    return result as ReminderDeliveryHistoryRecord[];
  }

  /**
   * Preferences Operations
   */

  async upsertReminderPreferences(preferences: Omit<ReminderPreferenceRecord, 'created_at' | 'updated_at'>): Promise<void> {
    const sql = `
      INSERT OR REPLACE INTO reminder_preferences (
        user_id, avoid_prayer_times, prayer_buffer_minutes, preferred_delivery_methods,
        quiet_hours_start, quiet_hours_end, escalation_enabled, escalation_delay_minutes,
        batching_enabled, max_batch_size, cultural_profile
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    await this.db!.runAsync(sql, [
      preferences.user_id,
      preferences.avoid_prayer_times,
      preferences.prayer_buffer_minutes,
      preferences.preferred_delivery_methods,
      preferences.quiet_hours_start || null,
      preferences.quiet_hours_end || null,
      preferences.escalation_enabled,
      preferences.escalation_delay_minutes,
      preferences.batching_enabled,
      preferences.max_batch_size,
      preferences.cultural_profile
    ]);
  }

  async getReminderPreferences(userId: string): Promise<ReminderPreferenceRecord | null> {
    const sql = `SELECT * FROM reminder_preferences WHERE user_id = ?`;
    const result = await this.db!.getFirstAsync(sql, [userId]);
    return result as ReminderPreferenceRecord | null;
  }

  /**
   * Analytics and Statistics
   */

  async getReminderStatistics(userId: string, days: number = 30): Promise<{
    totalScheduled: number;
    delivered: number;
    missed: number;
    averageDeliveryDelay: number;
    batteryImpact: number;
    culturalAdjustments: number;
  }> {
    const sinceDate = new Date();
    sinceDate.setDate(sinceDate.getDate() - days);

    const sql = `
      SELECT 
        COUNT(*) as total_scheduled,
        SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered,
        SUM(CASE WHEN status = 'missed' THEN 1 ELSE 0 END) as missed,
        AVG(CASE 
          WHEN delivered_at IS NOT NULL AND scheduled_time IS NOT NULL 
          THEN (julianday(delivered_at) - julianday(scheduled_time)) * 24 * 60 
          ELSE NULL 
        END) as avg_delay_minutes,
        SUM(battery_impact) as total_battery_impact,
        SUM(CASE WHEN cultural_adjustments IS NOT NULL THEN 1 ELSE 0 END) as cultural_adjustments
      FROM reminder_delivery_history 
      WHERE user_id = ? AND created_at >= ?
    `;

    const result = await this.db!.getFirstAsync(sql, [userId, sinceDate.toISOString()]) as any;

    return {
      totalScheduled: result.total_scheduled || 0,
      delivered: result.delivered || 0,
      missed: result.missed || 0,
      averageDeliveryDelay: result.avg_delay_minutes || 0,
      batteryImpact: result.total_battery_impact || 0,
      culturalAdjustments: result.cultural_adjustments || 0
    };
  }

  /**
   * Database Maintenance
   */

  async performMaintenance(): Promise<{
    expiredRemindersRemoved: number;
    expiredConstraintsRemoved: number;
    oldHistoryRemoved: number;
    databaseVacuumed: boolean;
  }> {
    try {
      // Clean up expired reminders
      const expiredRemindersRemoved = await this.cleanupExpiredOfflineReminders();

      // Clean up expired cultural constraints
      const expiredConstraintsRemoved = await this.cleanupExpiredCulturalConstraints();

      // Remove old delivery history (keep only last 1000 records per user)
      const oldHistorySQL = `
        DELETE FROM reminder_delivery_history 
        WHERE rowid NOT IN (
          SELECT rowid FROM reminder_delivery_history 
          ORDER BY created_at DESC 
          LIMIT 1000
        )
      `;
      const historyResult = await this.db!.runAsync(oldHistorySQL);
      const oldHistoryRemoved = historyResult.changes;

      // Vacuum database to reclaim space
      await this.db!.execAsync('VACUUM;');

      return {
        expiredRemindersRemoved,
        expiredConstraintsRemoved,
        oldHistoryRemoved,
        databaseVacuumed: true
      };

    } catch (error) {
      console.error('Database maintenance failed:', error);
      return {
        expiredRemindersRemoved: 0,
        expiredConstraintsRemoved: 0,
        oldHistoryRemoved: 0,
        databaseVacuumed: false
      };
    }
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    if (this.db) {
      await this.db.closeAsync();
      this.db = null;
    }
  }

  /**
   * Get database instance for advanced queries
   */
  getDatabase(): SQLite.Database | null {
    return this.db;
  }
}

export const reminderDatabase = ReminderDatabase.getInstance();
export default ReminderDatabase;