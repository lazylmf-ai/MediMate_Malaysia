/**
 * Offline Database Model
 *
 * SQLite database implementation for offline data storage in MediMate.
 * Provides schema management, migrations, and query operations.
 */

import * as SQLite from 'expo-sqlite';
import {
  OFFLINE_DB_NAME,
  OFFLINE_DB_VERSION,
  DatabaseMigration,
  OfflineQueryOptions,
} from '../types/offline';

export class OfflineDatabase {
  private static instance: OfflineDatabase;
  private db: SQLite.SQLiteDatabase | null = null;
  private isInitialized = false;
  private migrations: DatabaseMigration[] = [];

  private constructor() {
    this.defineMigrations();
  }

  public static getInstance(): OfflineDatabase {
    if (!OfflineDatabase.instance) {
      OfflineDatabase.instance = new OfflineDatabase();
    }
    return OfflineDatabase.instance;
  }

  /**
   * Initialize database and run migrations
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      this.db = await SQLite.openDatabaseAsync(OFFLINE_DB_NAME);
      await this.runMigrations();
      await this.createIndexes();
      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize offline database:', error);
      throw new Error('Offline database initialization failed');
    }
  }

  /**
   * Define database migrations
   */
  private defineMigrations(): void {
    this.migrations = [
      {
        version: 1,
        name: 'initial_schema',
        up: `
          -- Medications table
          CREATE TABLE IF NOT EXISTS offline_medications (
            offline_id TEXT PRIMARY KEY,
            id TEXT,
            user_id TEXT NOT NULL,
            name TEXT NOT NULL,
            dosage_amount REAL,
            dosage_unit TEXT,
            schedule_data TEXT,
            encrypted_data TEXT,
            sync_status TEXT DEFAULT 'local_only',
            last_synced INTEGER,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            deleted_at INTEGER
          );

          -- Adherence records table
          CREATE TABLE IF NOT EXISTS offline_adherence (
            offline_id TEXT PRIMARY KEY,
            id TEXT,
            medication_id TEXT NOT NULL,
            patient_id TEXT NOT NULL,
            scheduled_time INTEGER NOT NULL,
            taken_time INTEGER,
            status TEXT NOT NULL,
            adherence_score REAL,
            sync_status TEXT DEFAULT 'local_only',
            last_synced INTEGER,
            created_at INTEGER NOT NULL,
            updated_at INTEGER NOT NULL,
            deleted_at INTEGER
          );

          -- Offline metadata table
          CREATE TABLE IF NOT EXISTS offline_metadata (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at INTEGER NOT NULL,
            sync_status TEXT DEFAULT 'synced'
          );

          -- Sync operations table
          CREATE TABLE IF NOT EXISTS sync_operations (
            id TEXT PRIMARY KEY,
            type TEXT NOT NULL,
            entity TEXT NOT NULL,
            started_at INTEGER NOT NULL,
            completed_at INTEGER,
            status TEXT NOT NULL,
            items_processed INTEGER DEFAULT 0,
            items_total INTEGER DEFAULT 0,
            error_count INTEGER DEFAULT 0,
            created_at INTEGER NOT NULL
          );

          -- Sync errors table
          CREATE TABLE IF NOT EXISTS sync_errors (
            id TEXT PRIMARY KEY,
            operation_id TEXT NOT NULL,
            timestamp INTEGER NOT NULL,
            message TEXT NOT NULL,
            stack TEXT,
            data TEXT,
            retryable INTEGER DEFAULT 1,
            FOREIGN KEY (operation_id) REFERENCES sync_operations(id)
          );

          -- Offline transactions table
          CREATE TABLE IF NOT EXISTS offline_transactions (
            id TEXT PRIMARY KEY,
            type TEXT NOT NULL,
            table_name TEXT NOT NULL,
            data TEXT NOT NULL,
            timestamp INTEGER NOT NULL,
            status TEXT DEFAULT 'pending',
            retry_count INTEGER DEFAULT 0
          );

          -- Cache table
          CREATE TABLE IF NOT EXISTS offline_cache (
            key TEXT PRIMARY KEY,
            data TEXT NOT NULL,
            timestamp INTEGER NOT NULL,
            expires_at INTEGER,
            size INTEGER NOT NULL,
            access_count INTEGER DEFAULT 0,
            last_accessed INTEGER NOT NULL
          );

          -- Insert initial metadata
          INSERT OR IGNORE INTO offline_metadata (key, value, updated_at, sync_status)
          VALUES
            ('db_version', '1', strftime('%s', 'now') * 1000, 'synced'),
            ('last_vacuum', strftime('%s', 'now') * 1000, 'synced'),
            ('initialization_date', strftime('%s', 'now') * 1000, 'synced');
        `,
        down: `
          DROP TABLE IF EXISTS offline_medications;
          DROP TABLE IF EXISTS offline_adherence;
          DROP TABLE IF EXISTS offline_metadata;
          DROP TABLE IF EXISTS sync_operations;
          DROP TABLE IF EXISTS sync_errors;
          DROP TABLE IF EXISTS offline_transactions;
          DROP TABLE IF EXISTS offline_cache;
        `,
      },
    ];
  }

  /**
   * Run pending migrations
   */
  private async runMigrations(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const currentVersion = await this.getCurrentVersion();

    for (const migration of this.migrations) {
      if (migration.version > currentVersion) {
        try {
          await this.db.execAsync(migration.up);
          await this.setMetadata('db_version', migration.version.toString());
          console.log(`Applied migration: ${migration.name} (v${migration.version})`);
        } catch (error) {
          console.error(`Migration failed: ${migration.name}`, error);
          throw error;
        }
      }
    }
  }

  /**
   * Create database indexes for performance
   */
  private async createIndexes(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_medications_user ON offline_medications(user_id)',
      'CREATE INDEX IF NOT EXISTS idx_medications_sync_status ON offline_medications(sync_status)',
      'CREATE INDEX IF NOT EXISTS idx_medications_updated ON offline_medications(updated_at)',
      'CREATE INDEX IF NOT EXISTS idx_adherence_medication ON offline_adherence(medication_id)',
      'CREATE INDEX IF NOT EXISTS idx_adherence_patient ON offline_adherence(patient_id)',
      'CREATE INDEX IF NOT EXISTS idx_adherence_scheduled ON offline_adherence(scheduled_time)',
      'CREATE INDEX IF NOT EXISTS idx_adherence_sync_status ON offline_adherence(sync_status)',
      'CREATE INDEX IF NOT EXISTS idx_sync_ops_status ON sync_operations(status)',
      'CREATE INDEX IF NOT EXISTS idx_sync_errors_operation ON sync_errors(operation_id)',
      'CREATE INDEX IF NOT EXISTS idx_transactions_status ON offline_transactions(status)',
      'CREATE INDEX IF NOT EXISTS idx_cache_expires ON offline_cache(expires_at)',
    ];

    for (const indexSql of indexes) {
      try {
        await this.db.execAsync(indexSql);
      } catch (error) {
        console.warn('Index creation warning:', error);
      }
    }
  }

  /**
   * Get current database version
   */
  private async getCurrentVersion(): Promise<number> {
    if (!this.db) return 0;

    try {
      const result = await this.db.getFirstAsync<{ value: string }>(
        'SELECT value FROM offline_metadata WHERE key = ?',
        ['db_version']
      );
      return result ? parseInt(result.value, 10) : 0;
    } catch {
      return 0;
    }
  }

  /**
   * Execute SQL query
   */
  public async execute(sql: string, params: any[] = []): Promise<SQLite.SQLiteRunResult> {
    if (!this.db) throw new Error('Database not initialized');
    return this.db.runAsync(sql, params);
  }

  /**
   * Execute SQL query and return all results
   */
  public async query<T = any>(sql: string, params: any[] = []): Promise<T[]> {
    if (!this.db) throw new Error('Database not initialized');
    return this.db.getAllAsync<T>(sql, params);
  }

  /**
   * Execute SQL query and return first result
   */
  public async queryFirst<T = any>(sql: string, params: any[] = []): Promise<T | null> {
    if (!this.db) throw new Error('Database not initialized');
    return this.db.getFirstAsync<T>(sql, params);
  }

  /**
   * Set metadata value
   */
  public async setMetadata(key: string, value: string): Promise<void> {
    const timestamp = Date.now();
    await this.execute(
      `INSERT OR REPLACE INTO offline_metadata (key, value, updated_at, sync_status)
       VALUES (?, ?, ?, 'synced')`,
      [key, value, timestamp]
    );
  }

  /**
   * Get metadata value
   */
  public async getMetadata(key: string): Promise<string | null> {
    const result = await this.queryFirst<{ value: string }>(
      'SELECT value FROM offline_metadata WHERE key = ?',
      [key]
    );
    return result?.value || null;
  }

  /**
   * Execute database vacuum for optimization
   */
  public async vacuum(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    try {
      await this.db.execAsync('VACUUM');
      await this.setMetadata('last_vacuum', Date.now().toString());
      console.log('Database vacuum completed');
    } catch (error) {
      console.error('Vacuum failed:', error);
      throw error;
    }
  }

  /**
   * Get database statistics
   */
  public async getStats(): Promise<{
    pageCount: number;
    pageSize: number;
    totalSize: number;
  }> {
    if (!this.db) throw new Error('Database not initialized');

    const pageCount = await this.queryFirst<{ page_count: number }>(
      'PRAGMA page_count'
    );
    const pageSize = await this.queryFirst<{ page_size: number }>(
      'PRAGMA page_size'
    );

    return {
      pageCount: pageCount?.page_count || 0,
      pageSize: pageSize?.page_size || 0,
      totalSize: (pageCount?.page_count || 0) * (pageSize?.page_size || 0),
    };
  }

  /**
   * Close database connection
   */
  public async close(): Promise<void> {
    if (this.db) {
      await this.db.closeAsync();
      this.db = null;
      this.isInitialized = false;
    }
  }

  /**
   * Clear all data (for testing or reset)
   */
  public async clearAllData(): Promise<void> {
    if (!this.db) throw new Error('Database not initialized');

    const tables = [
      'offline_medications',
      'offline_adherence',
      'sync_operations',
      'sync_errors',
      'offline_transactions',
      'offline_cache',
    ];

    for (const table of tables) {
      await this.execute(`DELETE FROM ${table}`);
    }

    await this.setMetadata('last_clear', Date.now().toString());
  }

  /**
   * Check if database is initialized
   */
  public getIsInitialized(): boolean {
    return this.isInitialized;
  }
}

export default OfflineDatabase.getInstance();