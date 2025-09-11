/**
 * Database Service
 * 
 * Centralized database connection management for PostgreSQL
 * with connection pooling and Malaysian healthcare optimizations.
 */

import pgPromise from 'pg-promise';
import { IDatabase } from 'pg-promise';

export interface DatabaseConfig {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    ssl?: boolean;
    max?: number; // Max connections in pool
    idleTimeoutMillis?: number;
    connectionTimeoutMillis?: number;
}

export class DatabaseService {
    private static instance: DatabaseService;
    private db: IDatabase<any>;
    private pgp: pgPromise.IMain;

    constructor() {
        this.pgp = pgPromise({
            // Global configuration
            capSQL: true, // Capitalize SQL keywords
        });

        const config: DatabaseConfig = {
            host: process.env.POSTGRES_HOST || 'localhost',
            port: parseInt(process.env.POSTGRES_PORT || '5432'),
            database: process.env.POSTGRES_DB || 'medimate_dev',
            user: process.env.POSTGRES_USER || 'postgres',
            password: process.env.POSTGRES_PASSWORD || 'password',
            ssl: process.env.NODE_ENV === 'production',
            max: 20, // Maximum number of connections
            idleTimeoutMillis: 30000, // 30 seconds
            connectionTimeoutMillis: 2000, // 2 seconds
        };

        this.db = this.pgp(config);
        this.initializeConnection();
    }

    public static getInstance(): DatabaseService {
        if (!DatabaseService.instance) {
            DatabaseService.instance = new DatabaseService();
        }
        return DatabaseService.instance;
    }

    public getConnection(): IDatabase<any> {
        return this.db;
    }

    private async initializeConnection(): Promise<void> {
        try {
            await this.db.connect();
            console.log('Database connected successfully');
        } catch (error) {
            console.error('Database connection failed:', error);
            throw error;
        }
    }

    async testConnection(): Promise<boolean> {
        try {
            await this.db.one('SELECT NOW() as current_time');
            return true;
        } catch (error) {
            console.error('Database connection test failed:', error);
            return false;
        }
    }

    async closeConnection(): Promise<void> {
        if (this.db) {
            this.pgp.end();
        }
    }
}

export default DatabaseService;