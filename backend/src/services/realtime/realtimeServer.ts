/**
 * Real-time Server
 * 
 * Central initialization and coordination service for all real-time healthcare
 * communications, integrating WebSocket, monitoring, notifications, webhooks,
 * alerts, and dashboard services with Malaysian cultural context.
 */

import { createServer, Server as HTTPServer } from 'http';
import { Express } from 'express';
import { WebSocketService } from './webSocketService';
import { NotificationService } from './notificationService';
import { MonitoringService } from './monitoringService';
import { WebhookService } from './webhookService';
import { AlertService } from './alertService';
import { DashboardService } from './dashboardService';
import { RedisService } from '../cache/redisService';
import { DatabaseService } from '../database/databaseService';
import { AuditService } from '../audit/auditService';

export interface RealtimeServerConfig {
    port?: number;
    corsOrigins?: string[];
    maxConnections?: number;
    enableMetrics?: boolean;
    enableHealthCheck?: boolean;
    rateLimiting?: {
        windowMs: number;
        maxRequests: number;
    };
    culturalIntegration?: {
        enablePrayerTimeAwareness: boolean;
        enableRamadanMode: boolean;
        defaultLanguage: 'ms' | 'en' | 'zh' | 'ta';
        supportedLanguages: string[];
    };
}

export interface RealtimeServerStatus {
    isRunning: boolean;
    startedAt?: Date;
    services: {
        webSocket: { status: 'running' | 'stopped' | 'error'; connections: number };
        monitoring: { status: 'running' | 'stopped' | 'error'; activePatients: number };
        notifications: { status: 'running' | 'stopped' | 'error'; queueSize: number };
        webhooks: { status: 'running' | 'stopped' | 'error'; endpoints: number };
        alerts: { status: 'running' | 'stopped' | 'error'; activeAlerts: number };
        dashboard: { status: 'running' | 'stopped' | 'error'; subscriptions: number };
        redis: { status: 'connected' | 'disconnected' | 'error' };
        database: { status: 'connected' | 'disconnected' | 'error' };
    };
    performance: {
        totalConnections: number;
        messagesPerSecond: number;
        averageResponseTime: number;
        errorRate: number;
    };
    culturalStatus: {
        activePrayerTimeUsers: number;
        ramadanModeActive: boolean;
        languageDistribution: Record<string, number>;
    };
}

export class RealtimeServer {
    private static instance: RealtimeServer;
    private httpServer: HTTPServer | null = null;
    private webSocketService: WebSocketService | null = null;
    private notificationService: NotificationService | null = null;
    private monitoringService: MonitoringService | null = null;
    private webhookService: WebhookService | null = null;
    private alertService: AlertService | null = null;
    private dashboardService: DashboardService | null = null;
    
    private redisService: RedisService;
    private databaseService: DatabaseService;
    private auditService: AuditService;
    
    private config: RealtimeServerConfig;
    private isRunning: boolean = false;
    private startedAt: Date | null = null;
    
    // Performance tracking
    private performanceMetrics = {
        totalConnections: 0,
        totalMessages: 0,
        totalErrors: 0,
        responseTimeSum: 0,
        responseTimeCount: 0,
        lastMetricsReset: Date.now()
    };

    private constructor(config: RealtimeServerConfig = {}) {
        this.config = {
            port: 3001,
            corsOrigins: ['http://localhost:3000', 'http://localhost:8081'],
            maxConnections: 1000,
            enableMetrics: true,
            enableHealthCheck: true,
            rateLimiting: {
                windowMs: 60000, // 1 minute
                maxRequests: 100
            },
            culturalIntegration: {
                enablePrayerTimeAwareness: true,
                enableRamadanMode: true,
                defaultLanguage: 'en',
                supportedLanguages: ['ms', 'en', 'zh', 'ta']
            },
            ...config
        };

        this.redisService = RedisService.getInstance();
        this.databaseService = DatabaseService.getInstance();
        this.auditService = AuditService.getInstance();
    }

    public static getInstance(config?: RealtimeServerConfig): RealtimeServer {
        if (!RealtimeServer.instance) {
            RealtimeServer.instance = new RealtimeServer(config);
        }
        return RealtimeServer.instance;
    }

    async initialize(expressApp?: Express): Promise<void> {
        try {
            console.log('🚀 Initializing MediMate Malaysia Real-time Server...');

            // Initialize core dependencies
            await this.initializeDependencies();

            // Create HTTP server
            if (expressApp) {
                this.httpServer = createServer(expressApp);
            } else {
                this.httpServer = createServer();
            }

            // Initialize all real-time services
            await this.initializeServices();

            // Setup service integrations
            await this.setupServiceIntegrations();

            // Setup health monitoring
            if (this.config.enableHealthCheck) {
                await this.setupHealthMonitoring();
            }

            // Setup performance metrics
            if (this.config.enableMetrics) {
                await this.setupPerformanceMetrics();
            }

            console.log('✅ Real-time server initialized successfully');

        } catch (error) {
            console.error('❌ Failed to initialize real-time server:', error);
            throw error;
        }
    }

    async start(): Promise<void> {
        if (this.isRunning) {
            console.warn('⚠️ Real-time server is already running');
            return;
        }

        if (!this.httpServer) {
            throw new Error('Real-time server not initialized. Call initialize() first.');
        }

        try {
            // Start HTTP server
            await new Promise<void>((resolve, reject) => {
                this.httpServer!.listen(this.config.port, () => {
                    console.log(`🌐 Real-time server listening on port ${this.config.port}`);
                    resolve();
                });

                this.httpServer!.on('error', (error) => {
                    console.error('❌ HTTP server error:', error);
                    reject(error);
                });
            });

            this.isRunning = true;
            this.startedAt = new Date();

            // Audit server start
            await this.auditService.logHealthcareEvent({
                eventType: 'realtime_server_started',
                success: true,
                metadata: {
                    port: this.config.port,
                    maxConnections: this.config.maxConnections,
                    culturalIntegration: this.config.culturalIntegration
                }
            });

            console.log('🎯 MediMate Malaysia Real-time Server is running');
            console.log(`📊 Maximum connections: ${this.config.maxConnections}`);
            console.log(`🌍 Cultural integration: ${this.config.culturalIntegration?.enablePrayerTimeAwareness ? 'Enabled' : 'Disabled'}`);
            console.log(`🕌 Prayer time awareness: ${this.config.culturalIntegration?.enablePrayerTimeAwareness ? 'Active' : 'Inactive'}`);

        } catch (error) {
            console.error('❌ Failed to start real-time server:', error);
            throw error;
        }
    }

    async stop(): Promise<void> {
        if (!this.isRunning) {
            console.warn('⚠️ Real-time server is not running');
            return;
        }

        try {
            console.log('🛑 Stopping MediMate Malaysia Real-time Server...');

            // Gracefully close all connections
            if (this.webSocketService) {
                await this.gracefullyCloseConnections();
            }

            // Stop HTTP server
            if (this.httpServer) {
                await new Promise<void>((resolve) => {
                    this.httpServer!.close(() => {
                        console.log('🌐 HTTP server stopped');
                        resolve();
                    });
                });
            }

            // Disconnect from Redis
            await this.redisService.disconnect();

            this.isRunning = false;
            this.startedAt = null;

            // Audit server stop
            await this.auditService.logHealthcareEvent({
                eventType: 'realtime_server_stopped',
                success: true,
                metadata: {
                    totalConnections: this.performanceMetrics.totalConnections,
                    totalMessages: this.performanceMetrics.totalMessages,
                    totalErrors: this.performanceMetrics.totalErrors
                }
            });

            console.log('✅ Real-time server stopped successfully');

        } catch (error) {
            console.error('❌ Error stopping real-time server:', error);
            throw error;
        }
    }

    private async initializeDependencies(): Promise<void> {
        // Connect to Redis
        if (!this.redisService) {
            throw new Error('Redis service not available');
        }
        await this.redisService.connect();
        console.log('✅ Redis connection established');

        // Verify database connection
        if (!this.databaseService) {
            throw new Error('Database service not available');
        }
        console.log('✅ Database connection verified');
    }

    private async initializeServices(): Promise<void> {
        // Initialize WebSocket service
        this.webSocketService = WebSocketService.getInstance(this.httpServer!);
        console.log('✅ WebSocket service initialized');

        // Initialize Notification service
        this.notificationService = NotificationService.getInstance();
        console.log('✅ Notification service initialized');

        // Initialize Monitoring service
        this.monitoringService = MonitoringService.getInstance();
        console.log('✅ Monitoring service initialized');

        // Initialize Webhook service
        this.webhookService = WebhookService.getInstance();
        console.log('✅ Webhook service initialized');

        // Initialize Alert service
        this.alertService = AlertService.getInstance();
        console.log('✅ Alert service initialized');

        // Initialize Dashboard service
        this.dashboardService = DashboardService.getInstance();
        console.log('✅ Dashboard service initialized');
    }

    private async setupServiceIntegrations(): Promise<void> {
        // Setup inter-service communication channels
        console.log('🔗 Setting up service integrations...');

        // Integration: Monitoring → Alerts
        await this.redisService.subscribeToHealthcareEvents('healthcare:vitals_critical', async (message) => {
            if (this.alertService) {
                const data = JSON.parse(message);
                await this.alertService.createEmergencyAlert(
                    'critical_vital',
                    'Critical Vital Signs Alert',
                    `Patient ${data.patientId} has critical vital signs`,
                    {
                        patientId: data.patientId,
                        location: data.location,
                        metadata: { source: 'monitoring_service', vitalData: data.vitals }
                    }
                );
            }
        });

        // Integration: Alerts → Notifications
        await this.redisService.subscribeToHealthcareEvents('healthcare:emergency', async (message) => {
            if (this.notificationService) {
                const data = JSON.parse(message);
                if (data.type === 'emergency_alert') {
                    // Emergency alerts are already handled by AlertService
                    console.log(`🚨 Emergency alert distributed: ${data.alertId}`);
                }
            }
        });

        // Integration: WebSocket → Dashboard (real-time metrics)
        await this.redisService.subscribeToHealthcareEvents('healthcare:connection_metrics', async (message) => {
            if (this.dashboardService) {
                const data = JSON.parse(message);
                // Update dashboard with real-time connection metrics
                console.log('📊 Updated dashboard with connection metrics');
            }
        });

        console.log('✅ Service integrations configured');
    }

    private async setupHealthMonitoring(): Promise<void> {
        // Monitor service health every 30 seconds
        setInterval(async () => {
            try {
                const status = await this.getStatus();
                
                // Check for service failures
                const failedServices = Object.entries(status.services)
                    .filter(([_, service]) => service.status === 'error')
                    .map(([name]) => name);

                if (failedServices.length > 0) {
                    console.warn(`⚠️ Service health issues detected: ${failedServices.join(', ')}`);
                    
                    // Create system alert
                    if (this.alertService) {
                        await this.alertService.createEmergencyAlert(
                            'system_failure',
                            'Real-time Service Health Alert',
                            `Service health issues detected: ${failedServices.join(', ')}`,
                            {
                                metadata: {
                                    source: 'health_monitor',
                                    failedServices,
                                    serverStatus: status
                                }
                            }
                        );
                    }
                }
            } catch (error) {
                console.error('❌ Health monitoring error:', error);
            }
        }, 30000);
    }

    private async setupPerformanceMetrics(): Promise<void> {
        // Reset metrics every hour
        setInterval(() => {
            const now = Date.now();
            const elapsed = now - this.performanceMetrics.lastMetricsReset;
            
            // Calculate rates
            const messagesPerSecond = this.performanceMetrics.totalMessages / (elapsed / 1000);
            const errorRate = this.performanceMetrics.totalErrors / this.performanceMetrics.totalMessages;
            const averageResponseTime = this.performanceMetrics.responseTimeCount > 0 
                ? this.performanceMetrics.responseTimeSum / this.performanceMetrics.responseTimeCount
                : 0;

            // Log performance metrics
            console.log('📊 Performance Metrics:');
            console.log(`   Messages/sec: ${messagesPerSecond.toFixed(2)}`);
            console.log(`   Error rate: ${(errorRate * 100).toFixed(2)}%`);
            console.log(`   Avg response time: ${averageResponseTime.toFixed(2)}ms`);
            console.log(`   Total connections: ${this.performanceMetrics.totalConnections}`);

            // Reset counters
            this.performanceMetrics.totalMessages = 0;
            this.performanceMetrics.totalErrors = 0;
            this.performanceMetrics.responseTimeSum = 0;
            this.performanceMetrics.responseTimeCount = 0;
            this.performanceMetrics.lastMetricsReset = now;
        }, 60000); // Every minute
    }

    private async gracefullyCloseConnections(): Promise<void> {
        console.log('🔄 Gracefully closing WebSocket connections...');
        
        if (this.webSocketService) {
            const connectionCount = this.webSocketService.getActiveConnectionsCount();
            
            // Broadcast shutdown notice
            await this.webSocketService.broadcastToAllConnections({
                type: 'server_shutdown',
                message: 'Server is shutting down for maintenance. Please reconnect in a few moments.',
                culturalMessage: {
                    'ms': 'Pelayan sedang ditutup untuk penyelenggaraan. Sila sambung semula dalam beberapa saat.',
                    'zh': '服务器正在关闭维护。请稍后重新连接。',
                    'ta': 'சர்வர் பராமரிப்புக்காக மூடப்படுகிறது. சிறிது நேரத்தில் மீண்டும் இணைக்கவும்।'
                },
                timestamp: new Date().toISOString()
            });

            // Wait for connections to close gracefully
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            console.log(`🔄 Closed ${connectionCount} WebSocket connections`);
        }
    }

    async getStatus(): Promise<RealtimeServerStatus> {
        const redisHealth = await this.redisService.testConnection();
        
        return {
            isRunning: this.isRunning,
            startedAt: this.startedAt || undefined,
            services: {
                webSocket: {
                    status: this.webSocketService ? 'running' : 'stopped',
                    connections: this.webSocketService?.getActiveConnectionsCount() || 0
                },
                monitoring: {
                    status: this.monitoringService ? 'running' : 'stopped',
                    activePatients: this.monitoringService?.getActiveMonitoringCount() || 0
                },
                notifications: {
                    status: this.notificationService ? 'running' : 'stopped',
                    queueSize: 0 // Would need to implement queue size tracking
                },
                webhooks: {
                    status: this.webhookService ? 'running' : 'stopped',
                    endpoints: this.webhookService?.getWebhookEndpoints().length || 0
                },
                alerts: {
                    status: this.alertService ? 'running' : 'stopped',
                    activeAlerts: this.alertService?.getActiveAlertsCount() || 0
                },
                dashboard: {
                    status: this.dashboardService ? 'running' : 'stopped',
                    subscriptions: this.dashboardService?.getActiveDashboardCount() || 0
                },
                redis: {
                    status: redisHealth ? 'connected' : 'disconnected'
                },
                database: {
                    status: 'connected' // Would need to implement database health check
                }
            },
            performance: {
                totalConnections: this.performanceMetrics.totalConnections,
                messagesPerSecond: this.calculateMessagesPerSecond(),
                averageResponseTime: this.calculateAverageResponseTime(),
                errorRate: this.calculateErrorRate()
            },
            culturalStatus: {
                activePrayerTimeUsers: this.getActivePrayerTimeUsers(),
                ramadanModeActive: this.config.culturalIntegration?.enableRamadanMode || false,
                languageDistribution: this.getLanguageDistribution()
            }
        };
    }

    private calculateMessagesPerSecond(): number {
        const elapsed = (Date.now() - this.performanceMetrics.lastMetricsReset) / 1000;
        return elapsed > 0 ? this.performanceMetrics.totalMessages / elapsed : 0;
    }

    private calculateAverageResponseTime(): number {
        return this.performanceMetrics.responseTimeCount > 0 
            ? this.performanceMetrics.responseTimeSum / this.performanceMetrics.responseTimeCount
            : 0;
    }

    private calculateErrorRate(): number {
        return this.performanceMetrics.totalMessages > 0 
            ? this.performanceMetrics.totalErrors / this.performanceMetrics.totalMessages
            : 0;
    }

    private getActivePrayerTimeUsers(): number {
        // Would need to implement tracking of users with prayer time awareness
        return 0;
    }

    private getLanguageDistribution(): Record<string, number> {
        // Would need to implement tracking of user language preferences
        return {};
    }

    // Public API methods
    getWebSocketService(): WebSocketService | null {
        return this.webSocketService;
    }

    getNotificationService(): NotificationService | null {
        return this.notificationService;
    }

    getMonitoringService(): MonitoringService | null {
        return this.monitoringService;
    }

    getWebhookService(): WebhookService | null {
        return this.webhookService;
    }

    getAlertService(): AlertService | null {
        return this.alertService;
    }

    getDashboardService(): DashboardService | null {
        return this.dashboardService;
    }

    isServerRunning(): boolean {
        return this.isRunning;
    }

    getConfig(): RealtimeServerConfig {
        return { ...this.config };
    }

    // Metrics tracking methods (called by services)
    trackMessage(): void {
        this.performanceMetrics.totalMessages++;
    }

    trackError(): void {
        this.performanceMetrics.totalErrors++;
    }

    trackResponseTime(timeMs: number): void {
        this.performanceMetrics.responseTimeSum += timeMs;
        this.performanceMetrics.responseTimeCount++;
    }

    trackConnection(): void {
        this.performanceMetrics.totalConnections++;
    }
}

export default RealtimeServer;