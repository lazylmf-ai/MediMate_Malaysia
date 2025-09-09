/**
 * Webhook Service
 * 
 * Manages webhook integrations for third-party healthcare systems,
 * IoT devices, and external services with retry logic and security.
 */

import { RedisService } from '../cache/redisService';
import { DatabaseService } from '../database/databaseService';
import { AuditService } from '../audit/auditService';
import axios, { AxiosResponse, AxiosError } from 'axios';
import crypto from 'crypto';
import * as cron from 'node-cron';

export interface WebhookEndpoint {
    id: string;
    name: string;
    url: string;
    method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
    isActive: boolean;
    secret?: string;
    headers?: Record<string, string>;
    eventTypes: string[];
    retryPolicy: {
        maxRetries: number;
        retryDelayMs: number;
        exponentialBackoff: boolean;
    };
    rateLimiting: {
        maxRequestsPerMinute: number;
        burstLimit: number;
    };
    timeout: number;
    culturalContext: {
        supportedLanguages: string[];
        timezone: string;
        localizePayload: boolean;
    };
    healthcareIntegration: {
        systemType: 'hospital_ims' | 'lab_system' | 'pharmacy' | 'iot_device' | 'insurance' | 'moh_system' | 'telemedicine';
        dataFormat: 'hl7_fhir' | 'json' | 'xml' | 'custom';
        complianceLevel: 'basic' | 'pdpa' | 'hipaa' | 'moh_malaysia';
    };
    createdAt: Date;
    updatedAt: Date;
    lastSuccessfulCall?: Date;
    lastFailedCall?: Date;
    totalCalls: number;
    successfulCalls: number;
    failedCalls: number;
}

export interface WebhookEvent {
    id: string;
    eventType: string;
    patientId?: string;
    providerId?: string;
    data: any;
    culturalContext?: {
        language: string;
        localizedData: Record<string, any>;
        prayerTimeAware: boolean;
        ramadanConsiderations: boolean;
    };
    timestamp: Date;
    source: string;
    priority: 'low' | 'medium' | 'high' | 'critical' | 'emergency';
    retryCount: number;
    maxRetries: number;
    nextRetryAt?: Date;
    completedAt?: Date;
    failedAt?: Date;
    errorMessage?: string;
}

export interface WebhookDeliveryResult {
    success: boolean;
    statusCode?: number;
    responseBody?: string;
    errorMessage?: string;
    deliveryTime: number;
    retryAttempt: number;
}

export class WebhookService {
    private static instance: WebhookService;
    private redisService: RedisService;
    private databaseService: DatabaseService;
    private auditService: AuditService;
    
    // In-memory cache for webhook endpoints
    private webhookEndpoints: Map<string, WebhookEndpoint> = new Map();
    private rateLimitCounters: Map<string, { count: number; resetTime: number }> = new Map();
    
    private readonly WEBHOOK_QUEUE_KEY = 'webhook_delivery_queue';
    private readonly RETRY_QUEUE_KEY = 'webhook_retry_queue';
    private readonly DEFAULT_TIMEOUT = 30000; // 30 seconds

    private constructor() {
        this.redisService = RedisService.getInstance();
        this.databaseService = DatabaseService.getInstance();
        this.auditService = AuditService.getInstance();

        this.initializeService();
    }

    public static getInstance(): WebhookService {
        if (!WebhookService.instance) {
            WebhookService.instance = new WebhookService();
        }
        return WebhookService.instance;
    }

    private async initializeService(): Promise<void> {
        await this.loadWebhookEndpoints();
        this.setupScheduledJobs();
        this.setupRedisSubscriptions();
    }

    private async loadWebhookEndpoints(): Promise<void> {
        try {
            const db = this.databaseService.getConnection();
            const endpoints = await db.manyOrNone(`
                SELECT * FROM webhook_endpoints 
                WHERE is_active = true
                ORDER BY created_at ASC
            `);

            this.webhookEndpoints.clear();
            for (const endpoint of endpoints || []) {
                this.webhookEndpoints.set(endpoint.id, this.deserializeWebhookEndpoint(endpoint));
            }

            console.log(`✅ Loaded ${this.webhookEndpoints.size} webhook endpoints`);
        } catch (error) {
            console.error('❌ Failed to load webhook endpoints:', error);
        }
    }

    private setupScheduledJobs(): void {
        // Process webhook delivery queue every 30 seconds
        cron.schedule('*/30 * * * * *', () => {
            this.processWebhookQueue();
        });

        // Process retry queue every 5 minutes
        cron.schedule('*/5 * * * *', () => {
            this.processRetryQueue();
        });

        // Reset rate limiting counters every minute
        cron.schedule('* * * * *', () => {
            this.resetRateLimitCounters();
        });

        // Clean up old webhook events daily
        cron.schedule('0 2 * * *', () => {
            this.cleanupOldWebhookEvents();
        });

        // Health check for webhook endpoints every hour
        cron.schedule('0 * * * *', () => {
            this.performWebhookHealthChecks();
        });
    }

    private async setupRedisSubscriptions(): Promise<void> {
        try {
            await this.redisService.connect();

            // Subscribe to healthcare events for webhook delivery
            const eventTypes = [
                'healthcare:patient_updated',
                'healthcare:appointment_created',
                'healthcare:medication_prescribed',
                'healthcare:vitals_alert',
                'healthcare:lab_result',
                'healthcare:emergency_alert',
                'healthcare:provider_notification'
            ];

            for (const eventType of eventTypes) {
                await this.redisService.subscribeToHealthcareEvents(eventType, (message) => {
                    this.handleHealthcareEvent(eventType, message);
                });
            }

            console.log('✅ Webhook service Redis subscriptions established');
        } catch (error) {
            console.error('❌ Failed to setup webhook Redis subscriptions:', error);
        }
    }

    async createWebhookEndpoint(endpoint: Omit<WebhookEndpoint, 'id' | 'createdAt' | 'updatedAt' | 'totalCalls' | 'successfulCalls' | 'failedCalls'>): Promise<string> {
        try {
            const webhookId = `webhook_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            const completeEndpoint: WebhookEndpoint = {
                ...endpoint,
                id: webhookId,
                createdAt: new Date(),
                updatedAt: new Date(),
                totalCalls: 0,
                successfulCalls: 0,
                failedCalls: 0
            };

            // Validate endpoint
            await this.validateWebhookEndpoint(completeEndpoint);

            // Store in database
            await this.storeWebhookEndpoint(completeEndpoint);

            // Add to memory cache
            this.webhookEndpoints.set(webhookId, completeEndpoint);

            // Audit log
            await this.auditService.logHealthcareEvent({
                eventType: 'webhook_endpoint_created',
                success: true,
                metadata: {
                    webhookId,
                    name: endpoint.name,
                    url: endpoint.url,
                    eventTypes: endpoint.eventTypes,
                    systemType: endpoint.healthcareIntegration.systemType
                }
            });

            console.log(`✅ Created webhook endpoint: ${endpoint.name} (${webhookId})`);
            return webhookId;

        } catch (error) {
            console.error('❌ Failed to create webhook endpoint:', error);
            
            await this.auditService.logHealthcareEvent({
                eventType: 'webhook_endpoint_creation_failed',
                success: false,
                errorMessage: error instanceof Error ? error.message : 'Unknown error',
                metadata: { endpointName: endpoint.name }
            });

            throw error;
        }
    }

    async updateWebhookEndpoint(webhookId: string, updates: Partial<WebhookEndpoint>): Promise<void> {
        try {
            const existingEndpoint = this.webhookEndpoints.get(webhookId);
            if (!existingEndpoint) {
                throw new Error(`Webhook endpoint ${webhookId} not found`);
            }

            const updatedEndpoint = {
                ...existingEndpoint,
                ...updates,
                id: webhookId, // Ensure ID cannot be changed
                updatedAt: new Date()
            };

            // Validate updated endpoint
            await this.validateWebhookEndpoint(updatedEndpoint);

            // Update in database
            await this.updateWebhookEndpointInDB(updatedEndpoint);

            // Update memory cache
            this.webhookEndpoints.set(webhookId, updatedEndpoint);

            console.log(`✅ Updated webhook endpoint: ${webhookId}`);

        } catch (error) {
            console.error(`❌ Failed to update webhook endpoint ${webhookId}:`, error);
            throw error;
        }
    }

    async deleteWebhookEndpoint(webhookId: string): Promise<void> {
        try {
            const endpoint = this.webhookEndpoints.get(webhookId);
            if (!endpoint) {
                throw new Error(`Webhook endpoint ${webhookId} not found`);
            }

            // Soft delete in database
            await this.softDeleteWebhookEndpoint(webhookId);

            // Remove from memory cache
            this.webhookEndpoints.delete(webhookId);

            // Audit log
            await this.auditService.logHealthcareEvent({
                eventType: 'webhook_endpoint_deleted',
                success: true,
                metadata: { webhookId, name: endpoint.name }
            });

            console.log(`✅ Deleted webhook endpoint: ${webhookId}`);

        } catch (error) {
            console.error(`❌ Failed to delete webhook endpoint ${webhookId}:`, error);
            throw error;
        }
    }

    async triggerWebhook(eventType: string, data: any, options?: { patientId?: string; providerId?: string; priority?: string; culturalContext?: any }): Promise<void> {
        try {
            const webhookEvent: WebhookEvent = {
                id: `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                eventType,
                patientId: options?.patientId,
                providerId: options?.providerId,
                data,
                culturalContext: options?.culturalContext,
                timestamp: new Date(),
                source: 'medimate_malaysia',
                priority: (options?.priority as any) || 'medium',
                retryCount: 0,
                maxRetries: 3
            };

            // Find matching webhook endpoints
            const matchingEndpoints = this.getMatchingEndpoints(eventType);
            
            if (matchingEndpoints.length === 0) {
                console.log(`📝 No webhook endpoints found for event type: ${eventType}`);
                return;
            }

            // Queue webhook deliveries
            for (const endpoint of matchingEndpoints) {
                await this.queueWebhookDelivery(webhookEvent, endpoint);
            }

            console.log(`✅ Queued webhook deliveries for event ${webhookEvent.id} to ${matchingEndpoints.length} endpoints`);

        } catch (error) {
            console.error('❌ Failed to trigger webhook:', error);
        }
    }

    private handleHealthcareEvent(eventType: string, message: string): void {
        try {
            const eventData = JSON.parse(message);
            this.triggerWebhook(eventType, eventData, {
                patientId: eventData.patientId,
                providerId: eventData.providerId,
                priority: eventData.priority || 'medium',
                culturalContext: eventData.culturalContext
            });
        } catch (error) {
            console.error(`❌ Failed to handle healthcare event ${eventType}:`, error);
        }
    }

    private getMatchingEndpoints(eventType: string): WebhookEndpoint[] {
        return Array.from(this.webhookEndpoints.values()).filter(endpoint => 
            endpoint.isActive && endpoint.eventTypes.includes(eventType)
        );
    }

    private async queueWebhookDelivery(event: WebhookEvent, endpoint: WebhookEndpoint): Promise<void> {
        const deliveryJob = {
            eventId: event.id,
            webhookId: endpoint.id,
            event,
            endpoint,
            queuedAt: new Date()
        };

        // Add to Redis queue
        await this.redisService.getClient().rPush(
            this.WEBHOOK_QUEUE_KEY,
            JSON.stringify(deliveryJob)
        );
    }

    private async processWebhookQueue(): Promise<void> {
        try {
            const queueLength = await this.redisService.getClient().lLen(this.WEBHOOK_QUEUE_KEY);
            if (queueLength === 0) return;

            // Process up to 10 webhooks at a time
            const batchSize = Math.min(10, queueLength);
            const jobs: string[] = [];

            for (let i = 0; i < batchSize; i++) {
                const job = await this.redisService.getClient().lPop(this.WEBHOOK_QUEUE_KEY);
                if (job) jobs.push(job);
            }

            // Process jobs in parallel
            await Promise.all(jobs.map(job => this.processWebhookJob(JSON.parse(job))));

        } catch (error) {
            console.error('❌ Failed to process webhook queue:', error);
        }
    }

    private async processWebhookJob(job: any): Promise<void> {
        try {
            const { event, endpoint } = job;

            // Check rate limiting
            if (!this.checkRateLimit(endpoint.id, endpoint.rateLimiting)) {
                console.log(`⏳ Rate limit exceeded for webhook ${endpoint.id}, retrying later`);
                await this.queueForRetry(event, endpoint, 'Rate limit exceeded');
                return;
            }

            // Prepare webhook payload
            const payload = this.prepareWebhookPayload(event, endpoint);

            // Make webhook call
            const result = await this.deliverWebhook(endpoint, payload);

            // Update statistics
            await this.updateWebhookStatistics(endpoint.id, result.success);

            // Log result
            await this.logWebhookDelivery(event, endpoint, result);

            if (!result.success && event.retryCount < event.maxRetries) {
                await this.queueForRetry(event, endpoint, result.errorMessage || 'Delivery failed');
            }

        } catch (error) {
            console.error('❌ Failed to process webhook job:', error);
        }
    }

    private async deliverWebhook(endpoint: WebhookEndpoint, payload: any): Promise<WebhookDeliveryResult> {
        const startTime = Date.now();
        
        try {
            // Prepare headers
            const headers: Record<string, string> = {
                'Content-Type': 'application/json',
                'User-Agent': 'MediMate-Malaysia-Webhook/1.0',
                'X-MediMate-Timestamp': new Date().toISOString(),
                'X-MediMate-Event-Type': payload.eventType,
                ...endpoint.headers
            };

            // Add signature if secret is provided
            if (endpoint.secret) {
                const signature = this.generateSignature(JSON.stringify(payload), endpoint.secret);
                headers['X-MediMate-Signature'] = signature;
            }

            // Make HTTP request
            const response: AxiosResponse = await axios({
                method: endpoint.method,
                url: endpoint.url,
                data: payload,
                headers,
                timeout: endpoint.timeout || this.DEFAULT_TIMEOUT,
                validateStatus: (status) => status >= 200 && status < 300
            });

            const deliveryTime = Date.now() - startTime;

            return {
                success: true,
                statusCode: response.status,
                responseBody: JSON.stringify(response.data).substring(0, 1000), // Limit response size
                deliveryTime,
                retryAttempt: 0
            };

        } catch (error: any) {
            const deliveryTime = Date.now() - startTime;
            const axiosError = error as AxiosError;

            return {
                success: false,
                statusCode: axiosError.response?.status,
                errorMessage: axiosError.message || 'Unknown error',
                deliveryTime,
                retryAttempt: 0
            };
        }
    }

    private prepareWebhookPayload(event: WebhookEvent, endpoint: WebhookEndpoint): any {
        let payload: any = {
            eventId: event.id,
            eventType: event.eventType,
            timestamp: event.timestamp.toISOString(),
            source: event.source,
            priority: event.priority,
            data: event.data
        };

        // Add patient/provider context if available
        if (event.patientId) payload.patientId = event.patientId;
        if (event.providerId) payload.providerId = event.providerId;

        // Add cultural context if endpoint supports localization
        if (endpoint.culturalContext.localizePayload && event.culturalContext) {
            payload.culturalContext = event.culturalContext;
            
            // Localize data if language-specific version exists
            const language = event.culturalContext.language;
            if (event.culturalContext.localizedData?.[language]) {
                payload.localizedData = event.culturalContext.localizedData[language];
            }
        }

        // Transform payload based on healthcare integration format
        if (endpoint.healthcareIntegration.dataFormat === 'hl7_fhir') {
            payload = this.transformToHL7FHIR(payload, endpoint);
        } else if (endpoint.healthcareIntegration.dataFormat === 'xml') {
            payload = this.transformToXML(payload);
        }

        return payload;
    }

    private generateSignature(payload: string, secret: string): string {
        return crypto.createHmac('sha256', secret).update(payload).digest('hex');
    }

    private checkRateLimit(webhookId: string, rateLimiting: WebhookEndpoint['rateLimiting']): boolean {
        const now = Date.now();
        const resetTime = Math.floor(now / 60000) * 60000; // Reset every minute
        
        let counter = this.rateLimitCounters.get(webhookId);
        if (!counter || counter.resetTime !== resetTime) {
            counter = { count: 0, resetTime };
            this.rateLimitCounters.set(webhookId, counter);
        }

        if (counter.count >= rateLimiting.maxRequestsPerMinute) {
            return false;
        }

        counter.count++;
        return true;
    }

    private resetRateLimitCounters(): void {
        const now = Math.floor(Date.now() / 60000) * 60000;
        for (const [webhookId, counter] of this.rateLimitCounters.entries()) {
            if (counter.resetTime < now) {
                counter.count = 0;
                counter.resetTime = now;
            }
        }
    }

    private async queueForRetry(event: WebhookEvent, endpoint: WebhookEndpoint, errorMessage: string): Promise<void> {
        const retryEvent = {
            ...event,
            retryCount: event.retryCount + 1,
            errorMessage
        };

        // Calculate retry delay
        const baseDelay = endpoint.retryPolicy.retryDelayMs;
        const delay = endpoint.retryPolicy.exponentialBackoff 
            ? baseDelay * Math.pow(2, retryEvent.retryCount - 1)
            : baseDelay;

        retryEvent.nextRetryAt = new Date(Date.now() + delay);

        // Add to retry queue
        await this.redisService.getClient().rPush(
            this.RETRY_QUEUE_KEY,
            JSON.stringify({ event: retryEvent, endpoint })
        );
    }

    private async processRetryQueue(): Promise<void> {
        try {
            const queueLength = await this.redisService.getClient().lLen(this.RETRY_QUEUE_KEY);
            if (queueLength === 0) return;

            const now = new Date();
            const retryJobs: string[] = [];

            // Get all retry jobs
            for (let i = 0; i < queueLength; i++) {
                const job = await this.redisService.getClient().lPop(this.RETRY_QUEUE_KEY);
                if (job) retryJobs.push(job);
            }

            // Filter jobs ready for retry and requeue others
            for (const jobStr of retryJobs) {
                const job = JSON.parse(jobStr);
                const { event, endpoint } = job;

                if (!event.nextRetryAt || new Date(event.nextRetryAt) <= now) {
                    // Ready for retry
                    await this.queueWebhookDelivery(event, endpoint);
                } else {
                    // Not ready, requeue
                    await this.redisService.getClient().rPush(this.RETRY_QUEUE_KEY, jobStr);
                }
            }

        } catch (error) {
            console.error('❌ Failed to process retry queue:', error);
        }
    }

    // Database operations
    private async validateWebhookEndpoint(endpoint: WebhookEndpoint): Promise<void> {
        // Validate URL
        try {
            new URL(endpoint.url);
        } catch {
            throw new Error('Invalid webhook URL');
        }

        // Validate event types
        if (!endpoint.eventTypes || endpoint.eventTypes.length === 0) {
            throw new Error('At least one event type must be specified');
        }

        // Validate timeout
        if (endpoint.timeout && (endpoint.timeout < 1000 || endpoint.timeout > 300000)) {
            throw new Error('Timeout must be between 1 second and 5 minutes');
        }
    }

    private deserializeWebhookEndpoint(row: any): WebhookEndpoint {
        return {
            id: row.id,
            name: row.name,
            url: row.url,
            method: row.method,
            isActive: row.is_active,
            secret: row.secret,
            headers: row.headers ? JSON.parse(row.headers) : {},
            eventTypes: row.event_types ? JSON.parse(row.event_types) : [],
            retryPolicy: row.retry_policy ? JSON.parse(row.retry_policy) : {
                maxRetries: 3,
                retryDelayMs: 5000,
                exponentialBackoff: true
            },
            rateLimiting: row.rate_limiting ? JSON.parse(row.rate_limiting) : {
                maxRequestsPerMinute: 60,
                burstLimit: 10
            },
            timeout: row.timeout || this.DEFAULT_TIMEOUT,
            culturalContext: row.cultural_context ? JSON.parse(row.cultural_context) : {
                supportedLanguages: ['en'],
                timezone: 'Asia/Kuala_Lumpur',
                localizePayload: false
            },
            healthcareIntegration: row.healthcare_integration ? JSON.parse(row.healthcare_integration) : {
                systemType: 'custom',
                dataFormat: 'json',
                complianceLevel: 'basic'
            },
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at),
            lastSuccessfulCall: row.last_successful_call ? new Date(row.last_successful_call) : undefined,
            lastFailedCall: row.last_failed_call ? new Date(row.last_failed_call) : undefined,
            totalCalls: row.total_calls || 0,
            successfulCalls: row.successful_calls || 0,
            failedCalls: row.failed_calls || 0
        };
    }

    private async storeWebhookEndpoint(endpoint: WebhookEndpoint): Promise<void> {
        // Implementation for storing webhook endpoint in database
        const db = this.databaseService.getConnection();
        // SQL implementation would go here
    }

    private async updateWebhookEndpointInDB(endpoint: WebhookEndpoint): Promise<void> {
        // Implementation for updating webhook endpoint in database
        const db = this.databaseService.getConnection();
        // SQL implementation would go here
    }

    private async softDeleteWebhookEndpoint(webhookId: string): Promise<void> {
        // Implementation for soft deleting webhook endpoint
        const db = this.databaseService.getConnection();
        // SQL implementation would go here
    }

    private async updateWebhookStatistics(webhookId: string, success: boolean): Promise<void> {
        const endpoint = this.webhookEndpoints.get(webhookId);
        if (!endpoint) return;

        endpoint.totalCalls++;
        if (success) {
            endpoint.successfulCalls++;
            endpoint.lastSuccessfulCall = new Date();
        } else {
            endpoint.failedCalls++;
            endpoint.lastFailedCall = new Date();
        }

        endpoint.updatedAt = new Date();
    }

    private async logWebhookDelivery(event: WebhookEvent, endpoint: WebhookEndpoint, result: WebhookDeliveryResult): Promise<void> {
        await this.auditService.logHealthcareEvent({
            eventType: 'webhook_delivery',
            success: result.success,
            metadata: {
                webhookId: endpoint.id,
                eventId: event.id,
                eventType: event.eventType,
                statusCode: result.statusCode,
                deliveryTime: result.deliveryTime,
                retryAttempt: result.retryAttempt,
                errorMessage: result.errorMessage
            }
        });
    }

    private transformToHL7FHIR(payload: any, endpoint: WebhookEndpoint): any {
        // Transform payload to HL7 FHIR format
        // This would be a complex transformation based on the specific healthcare data
        return {
            resourceType: 'Bundle',
            id: payload.eventId,
            timestamp: payload.timestamp,
            entry: [
                {
                    resource: payload.data
                }
            ]
        };
    }

    private transformToXML(payload: any): string {
        // Convert JSON payload to XML format
        // This would use a JSON to XML conversion library
        return `<webhook>${JSON.stringify(payload)}</webhook>`;
    }

    private async cleanupOldWebhookEvents(): Promise<void> {
        // Clean up webhook events older than 30 days
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        // Implementation for cleanup would go here
    }

    private async performWebhookHealthChecks(): Promise<void> {
        // Perform health checks on webhook endpoints
        for (const [webhookId, endpoint] of this.webhookEndpoints.entries()) {
            if (endpoint.isActive) {
                // Implementation for health check would go here
            }
        }
    }

    // Public methods for external access
    getWebhookEndpoints(): WebhookEndpoint[] {
        return Array.from(this.webhookEndpoints.values());
    }

    getWebhookEndpoint(webhookId: string): WebhookEndpoint | undefined {
        return this.webhookEndpoints.get(webhookId);
    }

    async getWebhookStatistics(): Promise<any> {
        const stats = {
            totalEndpoints: this.webhookEndpoints.size,
            activeEndpoints: Array.from(this.webhookEndpoints.values()).filter(e => e.isActive).length,
            totalCalls: 0,
            successfulCalls: 0,
            failedCalls: 0,
            queueSize: await this.redisService.getClient().lLen(this.WEBHOOK_QUEUE_KEY),
            retryQueueSize: await this.redisService.getClient().lLen(this.RETRY_QUEUE_KEY)
        };

        for (const endpoint of this.webhookEndpoints.values()) {
            stats.totalCalls += endpoint.totalCalls;
            stats.successfulCalls += endpoint.successfulCalls;
            stats.failedCalls += endpoint.failedCalls;
        }

        return stats;
    }
}

export default WebhookService;