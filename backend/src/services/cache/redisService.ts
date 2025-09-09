/**
 * Redis Service
 * 
 * Centralized Redis connection management for caching, session storage,
 * and real-time message brokering for WebSocket communications.
 */

import { createClient, RedisClientType } from 'redis';

export interface RedisConfig {
    host: string;
    port: number;
    password?: string;
    database?: number;
    retryDelayOnFailover?: number;
    enableOfflineQueue?: boolean;
    lazyConnect?: boolean;
}

export class RedisService {
    private static instance: RedisService;
    private client: RedisClientType;
    private subscriber: RedisClientType;
    private publisher: RedisClientType;
    private isConnected: boolean = false;

    private constructor() {
        const config: RedisConfig = {
            host: process.env.REDIS_HOST || 'localhost',
            port: parseInt(process.env.REDIS_PORT || '6379'),
            password: process.env.REDIS_PASSWORD,
            database: parseInt(process.env.REDIS_DATABASE || '0'),
            retryDelayOnFailover: 100,
            enableOfflineQueue: false,
            lazyConnect: true,
        };

        // Main Redis client for general operations
        this.client = createClient({
            socket: {
                host: config.host,
                port: config.port,
            },
            password: config.password,
            database: config.database,
        });

        // Dedicated subscriber client for pub/sub
        this.subscriber = createClient({
            socket: {
                host: config.host,
                port: config.port,
            },
            password: config.password,
            database: config.database,
        });

        // Dedicated publisher client for pub/sub
        this.publisher = createClient({
            socket: {
                host: config.host,
                port: config.port,
            },
            password: config.password,
            database: config.database,
        });

        this.setupErrorHandlers();
    }

    public static getInstance(): RedisService {
        if (!RedisService.instance) {
            RedisService.instance = new RedisService();
        }
        return RedisService.instance;
    }

    private setupErrorHandlers(): void {
        this.client.on('error', (err) => {
            console.error('Redis client error:', err);
        });

        this.subscriber.on('error', (err) => {
            console.error('Redis subscriber error:', err);
        });

        this.publisher.on('error', (err) => {
            console.error('Redis publisher error:', err);
        });

        this.client.on('connect', () => {
            console.log('✅ Redis client connected');
        });

        this.subscriber.on('connect', () => {
            console.log('✅ Redis subscriber connected');
        });

        this.publisher.on('connect', () => {
            console.log('✅ Redis publisher connected');
        });
    }

    async connect(): Promise<void> {
        try {
            await Promise.all([
                this.client.connect(),
                this.subscriber.connect(),
                this.publisher.connect(),
            ]);
            this.isConnected = true;
            console.log('✅ All Redis connections established');
        } catch (error) {
            console.error('❌ Redis connection failed:', error);
            throw error;
        }
    }

    async disconnect(): Promise<void> {
        if (this.isConnected) {
            await Promise.all([
                this.client.disconnect(),
                this.subscriber.disconnect(),
                this.publisher.disconnect(),
            ]);
            this.isConnected = false;
            console.log('✅ Redis connections closed');
        }
    }

    getClient(): RedisClientType {
        if (!this.isConnected) {
            throw new Error('Redis not connected. Call connect() first.');
        }
        return this.client;
    }

    getSubscriber(): RedisClientType {
        if (!this.isConnected) {
            throw new Error('Redis not connected. Call connect() first.');
        }
        return this.subscriber;
    }

    getPublisher(): RedisClientType {
        if (!this.isConnected) {
            throw new Error('Redis not connected. Call connect() first.');
        }
        return this.publisher;
    }

    async testConnection(): Promise<boolean> {
        try {
            const pong = await this.client.ping();
            return pong === 'PONG';
        } catch (error) {
            console.error('Redis connection test failed:', error);
            return false;
        }
    }

    // Healthcare-specific caching methods
    async cachePatientSession(patientId: string, sessionData: any, expirationSeconds: number = 3600): Promise<void> {
        const key = `patient_session:${patientId}`;
        await this.client.setEx(key, expirationSeconds, JSON.stringify(sessionData));
    }

    async getCachedPatientSession(patientId: string): Promise<any> {
        const key = `patient_session:${patientId}`;
        const cached = await this.client.get(key);
        return cached ? JSON.parse(cached) : null;
    }

    async invalidatePatientSession(patientId: string): Promise<void> {
        const key = `patient_session:${patientId}`;
        await this.client.del(key);
    }

    // Real-time messaging methods
    async publishHealthcareEvent(channel: string, eventData: any): Promise<void> {
        const message = {
            timestamp: new Date().toISOString(),
            eventId: `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            ...eventData
        };
        await this.publisher.publish(channel, JSON.stringify(message));
    }

    async subscribeToHealthcareEvents(channel: string, callback: (message: string) => void): Promise<void> {
        await this.subscriber.subscribe(channel, callback);
    }

    async unsubscribeFromHealthcareEvents(channel: string): Promise<void> {
        await this.subscriber.unsubscribe(channel);
    }

    // Connection management for WebSockets
    async trackActiveConnection(connectionId: string, connectionData: any): Promise<void> {
        const key = `ws_connection:${connectionId}`;
        await this.client.hSet(key, connectionData);
        await this.client.expire(key, 86400); // 24 hours
    }

    async removeActiveConnection(connectionId: string): Promise<void> {
        const key = `ws_connection:${connectionId}`;
        await this.client.del(key);
    }

    async getActiveConnections(pattern: string = 'ws_connection:*'): Promise<string[]> {
        return await this.client.keys(pattern);
    }
}

export default RedisService;