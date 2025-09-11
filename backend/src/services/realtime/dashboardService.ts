/**
 * Dashboard Service
 * 
 * Real-time healthcare dashboard data streaming service
 * providing aggregated metrics, analytics, and monitoring data.
 */

import { RedisService } from '../cache/redisService';
import { DatabaseService } from '../database/databaseService';
import { AuditService } from '../audit/auditService';
import * as cron from 'node-cron';

export interface DashboardMetrics {
    id: string;
    category: 'patient_metrics' | 'provider_metrics' | 'system_metrics' | 'cultural_metrics' | 'compliance_metrics';
    subcategory: string;
    value: number | string | boolean;
    trend: 'up' | 'down' | 'stable' | 'unknown';
    trendPercentage?: number;
    unit?: string;
    timestamp: Date;
    metadata?: Record<string, any>;
}

export interface DashboardWidget {
    id: string;
    name: string;
    type: 'chart' | 'counter' | 'gauge' | 'table' | 'map' | 'alert_list' | 'cultural_calendar';
    category: DashboardMetrics['category'];
    config: {
        refreshIntervalSeconds: number;
        dataPoints: number;
        filters?: Record<string, any>;
        culturalContext?: {
            language: string;
            localizedLabels: Record<string, string>;
            culturalEvents: boolean;
        };
    };
    permissions: string[];
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface DashboardSubscription {
    id: string;
    userId: string;
    userType: 'patient' | 'healthcare_provider' | 'admin' | 'emergency_responder';
    widgets: string[];
    culturalPreferences: {
        language: 'ms' | 'en' | 'zh' | 'ta';
        timezone: string;
        numberFormat: 'decimal' | 'comma';
        dateFormat: string;
    };
    permissions: string[];
    lastActivity: Date;
    isActive: boolean;
}

export interface RealTimeDashboardUpdate {
    subscriptionId: string;
    widgetId: string;
    widgetType: string;
    data: any;
    culturalContext: {
        language: string;
        localizedData: Record<string, any>;
        formatters: {
            number: string;
            date: string;
            currency: string;
        };
    };
    timestamp: Date;
}

export class DashboardService {
    private static instance: DashboardService;
    private redisService: RedisService;
    private databaseService: DatabaseService;
    private auditService: AuditService;
    
    // In-memory caches
    private activeSubscriptions: Map<string, DashboardSubscription> = new Map();
    private dashboardWidgets: Map<string, DashboardWidget> = new Map();
    private metricsCache: Map<string, DashboardMetrics[]> = new Map();
    
    // Aggregation intervals
    private readonly REAL_TIME_INTERVAL = 30; // seconds
    private readonly SHORT_TERM_INTERVAL = 300; // 5 minutes
    private readonly MEDIUM_TERM_INTERVAL = 1800; // 30 minutes
    private readonly LONG_TERM_INTERVAL = 3600; // 1 hour

    private constructor() {
        this.redisService = RedisService.getInstance();
        this.databaseService = DatabaseService.getInstance();
        this.auditService = AuditService.getInstance();

        this.initializeService();
    }

    public static getInstance(): DashboardService {
        if (!DashboardService.instance) {
            DashboardService.instance = new DashboardService();
        }
        return DashboardService.instance;
    }

    private async initializeService(): Promise<void> {
        await this.loadDashboardWidgets();
        await this.loadActiveSubscriptions();
        this.setupScheduledJobs();
        this.setupRedisSubscriptions();
    }

    private async loadDashboardWidgets(): Promise<void> {
        try {
            const db = this.databaseService.getConnection();
            const widgets = await db.manyOrNone(`
                SELECT * FROM dashboard_widgets 
                WHERE is_active = true
                ORDER BY created_at ASC
            `);

            this.dashboardWidgets.clear();
            for (const widget of widgets || []) {
                this.dashboardWidgets.set(widget.id, this.deserializeDashboardWidget(widget));
            }

            console.log(`✅ Loaded ${this.dashboardWidgets.size} dashboard widgets`);
        } catch (error) {
            console.error('❌ Failed to load dashboard widgets:', error);
        }
    }

    private async loadActiveSubscriptions(): Promise<void> {
        try {
            const db = this.databaseService.getConnection();
            const subscriptions = await db.manyOrNone(`
                SELECT ds.*, u.user_type, cp.language, cp.timezone
                FROM dashboard_subscriptions ds
                JOIN users u ON ds.user_id = u.id
                LEFT JOIN cultural_preferences cp ON u.id = cp.user_id
                WHERE ds.is_active = true
                AND u.last_login > NOW() - INTERVAL '7 days'
            `);

            this.activeSubscriptions.clear();
            for (const sub of subscriptions || []) {
                this.activeSubscriptions.set(sub.id, this.deserializeDashboardSubscription(sub));
            }

            console.log(`✅ Loaded ${this.activeSubscriptions.size} active dashboard subscriptions`);
        } catch (error) {
            console.error('❌ Failed to load dashboard subscriptions:', error);
        }
    }

    private setupScheduledJobs(): void {
        // Real-time metrics aggregation every 30 seconds
        cron.schedule(`*/${this.REAL_TIME_INTERVAL} * * * * *`, () => {
            this.aggregateRealTimeMetrics();
        });

        // Short-term metrics aggregation every 5 minutes
        cron.schedule(`*/${this.SHORT_TERM_INTERVAL / 60} * * * *`, () => {
            this.aggregateShortTermMetrics();
        });

        // Medium-term metrics aggregation every 30 minutes
        cron.schedule(`*/${this.MEDIUM_TERM_INTERVAL / 60} * * * *`, () => {
            this.aggregateMediumTermMetrics();
        });

        // Long-term metrics aggregation every hour
        cron.schedule(`0 * * * *`, () => {
            this.aggregateLongTermMetrics();
        });

        // Clean up old metrics cache every hour
        cron.schedule('0 * * * *', () => {
            this.cleanupMetricsCache();
        });

        // Refresh dashboard subscriptions every 15 minutes
        cron.schedule('*/15 * * * *', () => {
            this.refreshDashboardSubscriptions();
        });
    }

    private async setupRedisSubscriptions(): Promise<void> {
        try {
            await this.redisService.connect();

            // Subscribe to various healthcare events for metrics
            const eventChannels = [
                'healthcare:patient_vitals',
                'healthcare:appointments',
                'healthcare:medications',
                'healthcare:emergency_alerts',
                'healthcare:provider_activities',
                'healthcare:system_events',
                'healthcare:cultural_events',
                'healthcare:compliance_events'
            ];

            for (const channel of eventChannels) {
                await this.redisService.subscribeToHealthcareEvents(channel, (message) => {
                    this.handleHealthcareEventForMetrics(channel, message);
                });
            }

            console.log('✅ Dashboard service Redis subscriptions established');
        } catch (error) {
            console.error('❌ Failed to setup dashboard Redis subscriptions:', error);
        }
    }

    async createDashboardSubscription(
        userId: string,
        userType: string,
        widgetIds: string[],
        culturalPreferences: any,
        permissions: string[]
    ): Promise<string> {
        try {
            const subscriptionId = `dashboard_sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            // Validate widgets and permissions
            const authorizedWidgets = await this.validateWidgetAccess(widgetIds, permissions);
            
            const subscription: DashboardSubscription = {
                id: subscriptionId,
                userId,
                userType: userType as any,
                widgets: authorizedWidgets,
                culturalPreferences: {
                    language: culturalPreferences.language || 'en',
                    timezone: culturalPreferences.timezone || 'Asia/Kuala_Lumpur',
                    numberFormat: culturalPreferences.numberFormat || 'decimal',
                    dateFormat: culturalPreferences.dateFormat || 'DD/MM/YYYY'
                },
                permissions,
                lastActivity: new Date(),
                isActive: true
            };

            // Store in database
            await this.storeDashboardSubscription(subscription);

            // Add to active subscriptions cache
            this.activeSubscriptions.set(subscriptionId, subscription);

            // Send initial dashboard data
            await this.sendInitialDashboardData(subscriptionId);

            // Audit log
            await this.auditService.logHealthcareEvent({
                eventType: 'dashboard_subscription_created',
                userId,
                userType,
                success: true,
                metadata: {
                    subscriptionId,
                    widgetCount: authorizedWidgets.length,
                    language: subscription.culturalPreferences.language
                }
            });

            console.log(`✅ Created dashboard subscription: ${subscriptionId} for user ${userId}`);
            return subscriptionId;

        } catch (error) {
            console.error(`❌ Failed to create dashboard subscription for user ${userId}:`, error);
            throw error;
        }
    }

    async updateDashboardSubscription(subscriptionId: string, updates: Partial<DashboardSubscription>): Promise<void> {
        try {
            const subscription = this.activeSubscriptions.get(subscriptionId);
            if (!subscription) {
                throw new Error(`Dashboard subscription ${subscriptionId} not found`);
            }

            // Apply updates
            const updatedSubscription = { ...subscription, ...updates };
            
            // Validate widget access if widgets are being updated
            if (updates.widgets) {
                updatedSubscription.widgets = await this.validateWidgetAccess(updates.widgets, subscription.permissions);
            }

            // Update in database
            await this.updateDashboardSubscriptionInDB(updatedSubscription);

            // Update cache
            this.activeSubscriptions.set(subscriptionId, updatedSubscription);

            console.log(`✅ Updated dashboard subscription: ${subscriptionId}`);

        } catch (error) {
            console.error(`❌ Failed to update dashboard subscription ${subscriptionId}:`, error);
            throw error;
        }
    }

    async deleteDashboardSubscription(subscriptionId: string): Promise<void> {
        try {
            const subscription = this.activeSubscriptions.get(subscriptionId);
            if (!subscription) {
                throw new Error(`Dashboard subscription ${subscriptionId} not found`);
            }

            // Soft delete in database
            await this.softDeleteDashboardSubscription(subscriptionId);

            // Remove from cache
            this.activeSubscriptions.delete(subscriptionId);

            // Audit log
            await this.auditService.logHealthcareEvent({
                eventType: 'dashboard_subscription_deleted',
                userId: subscription.userId,
                userType: subscription.userType,
                success: true,
                metadata: { subscriptionId }
            });

            console.log(`✅ Deleted dashboard subscription: ${subscriptionId}`);

        } catch (error) {
            console.error(`❌ Failed to delete dashboard subscription ${subscriptionId}:`, error);
            throw error;
        }
    }

    private async sendInitialDashboardData(subscriptionId: string): Promise<void> {
        const subscription = this.activeSubscriptions.get(subscriptionId);
        if (!subscription) return;

        for (const widgetId of subscription.widgets) {
            const widget = this.dashboardWidgets.get(widgetId);
            if (!widget) continue;

            const data = await this.getWidgetData(widget, subscription);
            const update: RealTimeDashboardUpdate = {
                subscriptionId,
                widgetId,
                widgetType: widget.type,
                data,
                culturalContext: this.prepareCulturalContext(data, subscription.culturalPreferences),
                timestamp: new Date()
            };

            await this.publishDashboardUpdate(update);
        }
    }

    private async getWidgetData(widget: DashboardWidget, subscription: DashboardSubscription): Promise<any> {
        const db = this.databaseService.getConnection();
        
        switch (widget.category) {
            case 'patient_metrics':
                return await this.getPatientMetrics(widget, subscription);
            case 'provider_metrics':
                return await this.getProviderMetrics(widget, subscription);
            case 'system_metrics':
                return await this.getSystemMetrics(widget, subscription);
            case 'cultural_metrics':
                return await this.getCulturalMetrics(widget, subscription);
            case 'compliance_metrics':
                return await this.getComplianceMetrics(widget, subscription);
            default:
                return {};
        }
    }

    private async getPatientMetrics(widget: DashboardWidget, subscription: DashboardSubscription): Promise<any> {
        const db = this.databaseService.getConnection();
        
        switch (widget.subcategory) {
            case 'total_patients':
                return await this.getTotalPatientsMetric();
            case 'active_monitoring':
                return await this.getActiveMonitoringMetric();
            case 'vital_alerts':
                return await this.getVitalAlertsMetric();
            case 'appointment_stats':
                return await this.getAppointmentStatsMetric();
            case 'medication_adherence':
                return await this.getMedicationAdherenceMetric();
            default:
                return { error: 'Unknown patient metric subcategory' };
        }
    }

    private async getProviderMetrics(widget: DashboardWidget, subscription: DashboardSubscription): Promise<any> {
        switch (widget.subcategory) {
            case 'active_providers':
                return await this.getActiveProvidersMetric();
            case 'provider_workload':
                return await this.getProviderWorkloadMetric();
            case 'response_times':
                return await this.getResponseTimesMetric();
            case 'consultation_stats':
                return await this.getConsultationStatsMetric();
            default:
                return { error: 'Unknown provider metric subcategory' };
        }
    }

    private async getSystemMetrics(widget: DashboardWidget, subscription: DashboardSubscription): Promise<any> {
        switch (widget.subcategory) {
            case 'api_performance':
                return await this.getAPIPerformanceMetric();
            case 'database_health':
                return await this.getDatabaseHealthMetric();
            case 'websocket_connections':
                return await this.getWebSocketConnectionsMetric();
            case 'system_alerts':
                return await this.getSystemAlertsMetric();
            case 'webhook_statistics':
                return await this.getWebhookStatisticsMetric();
            default:
                return { error: 'Unknown system metric subcategory' };
        }
    }

    private async getCulturalMetrics(widget: DashboardWidget, subscription: DashboardSubscription): Promise<any> {
        switch (widget.subcategory) {
            case 'prayer_time_awareness':
                return await this.getPrayerTimeAwarenessMetric();
            case 'language_distribution':
                return await this.getLanguageDistributionMetric();
            case 'cultural_events':
                return await this.getCulturalEventsMetric();
            case 'halal_medication_requests':
                return await this.getHalalMedicationRequestsMetric();
            case 'ramadan_adaptations':
                return await this.getRamadanAdaptationsMetric();
            default:
                return { error: 'Unknown cultural metric subcategory' };
        }
    }

    private async getComplianceMetrics(widget: DashboardWidget, subscription: DashboardSubscription): Promise<any> {
        switch (widget.subcategory) {
            case 'pdpa_compliance_rate':
                return await this.getPDPAComplianceRateMetric();
            case 'audit_trail_completeness':
                return await this.getAuditTrailCompletenessMetric();
            case 'data_anonymization_stats':
                return await this.getDataAnonymizationStatsMetric();
            case 'security_incidents':
                return await this.getSecurityIncidentsMetric();
            case 'consent_management':
                return await this.getConsentManagementMetric();
            default:
                return { error: 'Unknown compliance metric subcategory' };
        }
    }

    // Specific metric implementations
    private async getTotalPatientsMetric(): Promise<any> {
        const db = this.databaseService.getConnection();
        const result = await db.one(`
            SELECT 
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '30 days') as new_this_month,
                COUNT(*) FILTER (WHERE last_login > NOW() - INTERVAL '7 days') as active_this_week
            FROM patients
            WHERE deleted_at IS NULL
        `);

        return {
            value: result.total,
            trend: result.new_this_month > 0 ? 'up' : 'stable',
            metadata: {
                newThisMonth: result.new_this_month,
                activeThisWeek: result.active_this_week
            }
        };
    }

    private async getActiveMonitoringMetric(): Promise<any> {
        // This would integrate with MonitoringService
        return {
            value: 0, // Would get from MonitoringService.getInstance().getActiveMonitoringCount()
            trend: 'stable',
            metadata: {}
        };
    }

    private async getVitalAlertsMetric(): Promise<any> {
        const db = this.databaseService.getConnection();
        const result = await db.one(`
            SELECT 
                COUNT(*) as total_alerts,
                COUNT(*) FILTER (WHERE severity = 'critical') as critical_alerts,
                COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '1 hour') as recent_alerts
            FROM monitoring_alerts
            WHERE created_at > NOW() - INTERVAL '24 hours'
        `);

        return {
            value: result.total_alerts,
            trend: result.recent_alerts > 0 ? 'up' : 'stable',
            metadata: {
                criticalAlerts: result.critical_alerts,
                recentAlerts: result.recent_alerts
            }
        };
    }

    private async getWebSocketConnectionsMetric(): Promise<any> {
        // This would integrate with WebSocketService
        return {
            value: 0, // Would get from WebSocketService.getInstance().getActiveConnectionsCount()
            trend: 'stable',
            metadata: {
                byUserType: {} // Would get from WebSocketService.getInstance().getActiveUserTypes()
            }
        };
    }

    private async getPrayerTimeAwarenessMetric(): Promise<any> {
        const db = this.databaseService.getConnection();
        const result = await db.one(`
            SELECT 
                COUNT(*) FILTER (WHERE prayer_time_notifications = true) as prayer_aware_users,
                COUNT(*) as total_users
            FROM cultural_preferences cp
            JOIN users u ON cp.user_id = u.id
            WHERE u.deleted_at IS NULL
        `);

        const percentage = result.total_users > 0 ? (result.prayer_aware_users / result.total_users * 100) : 0;

        return {
            value: percentage,
            unit: '%',
            trend: 'stable',
            metadata: {
                prayerAwareUsers: result.prayer_aware_users,
                totalUsers: result.total_users
            }
        };
    }

    private prepareCulturalContext(data: any, preferences: DashboardSubscription['culturalPreferences']): any {
        const localizedData: Record<string, any> = {};

        // Localize based on language
        if (preferences.language !== 'en') {
            // Implementation for data localization would go here
            localizedData[preferences.language] = this.localizeData(data, preferences.language);
        }

        return {
            language: preferences.language,
            localizedData,
            formatters: {
                number: preferences.numberFormat === 'comma' ? '1,000.00' : '1000.00',
                date: preferences.dateFormat,
                currency: 'RM'
            }
        };
    }

    private localizeData(data: any, language: string): any {
        // Implementation for localizing metric data
        return data; // Placeholder
    }

    private async publishDashboardUpdate(update: RealTimeDashboardUpdate): Promise<void> {
        // Publish to WebSocket for real-time dashboard updates
        await this.redisService.publishHealthcareEvent('healthcare:dashboard', {
            type: 'dashboard_update',
            subscriptionId: update.subscriptionId,
            widgetId: update.widgetId,
            widgetType: update.widgetType,
            data: update.data,
            culturalContext: update.culturalContext,
            timestamp: update.timestamp
        });
    }

    private handleHealthcareEventForMetrics(channel: string, message: string): void {
        try {
            const eventData = JSON.parse(message);
            // Update relevant metrics based on the event
            this.updateMetricsFromEvent(channel, eventData);
        } catch (error) {
            console.error(`Failed to handle healthcare event for metrics from ${channel}:`, error);
        }
    }

    private updateMetricsFromEvent(channel: string, eventData: any): void {
        // Implementation for updating metrics based on events
        // This would update the metricsCache and potentially trigger dashboard updates
    }

    // Aggregation methods
    private async aggregateRealTimeMetrics(): Promise<void> {
        // Aggregate real-time metrics for immediate dashboard updates
        await this.processActiveSubscriptionsUpdates();
    }

    private async processActiveSubscriptionsUpdates(): Promise<void> {
        for (const [subscriptionId, subscription] of this.activeSubscriptions.entries()) {
            // Check if subscription needs updates based on widget refresh intervals
            for (const widgetId of subscription.widgets) {
                const widget = this.dashboardWidgets.get(widgetId);
                if (!widget) continue;

                // Check if widget needs refresh based on its refresh interval
                if (this.shouldRefreshWidget(widget)) {
                    const data = await this.getWidgetData(widget, subscription);
                    const update: RealTimeDashboardUpdate = {
                        subscriptionId,
                        widgetId,
                        widgetType: widget.type,
                        data,
                        culturalContext: this.prepareCulturalContext(data, subscription.culturalPreferences),
                        timestamp: new Date()
                    };

                    await this.publishDashboardUpdate(update);
                }
            }
        }
    }

    private shouldRefreshWidget(widget: DashboardWidget): boolean {
        // Simple time-based refresh logic - could be enhanced with smart refresh
        const now = Date.now();
        const refreshInterval = widget.config.refreshIntervalSeconds * 1000;
        
        // For this implementation, we'll refresh widgets that have intervals <= current interval
        return widget.config.refreshIntervalSeconds <= this.REAL_TIME_INTERVAL;
    }

    private async aggregateShortTermMetrics(): Promise<void> {
        // Implementation for short-term metrics aggregation
    }

    private async aggregateMediumTermMetrics(): Promise<void> {
        // Implementation for medium-term metrics aggregation
    }

    private async aggregateLongTermMetrics(): Promise<void> {
        // Implementation for long-term metrics aggregation
    }

    private cleanupMetricsCache(): void {
        // Clean up old cached metrics
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        
        for (const [key, metrics] of this.metricsCache.entries()) {
            const filteredMetrics = metrics.filter(m => m.timestamp > oneHourAgo);
            if (filteredMetrics.length === 0) {
                this.metricsCache.delete(key);
            } else {
                this.metricsCache.set(key, filteredMetrics);
            }
        }
    }

    private async refreshDashboardSubscriptions(): Promise<void> {
        // Reload active subscriptions to pick up any new ones
        await this.loadActiveSubscriptions();
    }

    // Utility methods
    private async validateWidgetAccess(widgetIds: string[], permissions: string[]): Promise<string[]> {
        const authorizedWidgets: string[] = [];
        
        for (const widgetId of widgetIds) {
            const widget = this.dashboardWidgets.get(widgetId);
            if (!widget || !widget.isActive) continue;

            // Check if user has required permissions for the widget
            const hasPermission = widget.permissions.some(required => permissions.includes(required));
            if (hasPermission) {
                authorizedWidgets.push(widgetId);
            }
        }

        return authorizedWidgets;
    }

    private deserializeDashboardWidget(row: any): DashboardWidget {
        return {
            id: row.id,
            name: row.name,
            type: row.type,
            category: row.category,
            config: row.config ? JSON.parse(row.config) : {},
            permissions: row.permissions ? JSON.parse(row.permissions) : [],
            isActive: row.is_active,
            createdAt: new Date(row.created_at),
            updatedAt: new Date(row.updated_at)
        };
    }

    private deserializeDashboardSubscription(row: any): DashboardSubscription {
        return {
            id: row.id,
            userId: row.user_id,
            userType: row.user_type,
            widgets: row.widgets ? JSON.parse(row.widgets) : [],
            culturalPreferences: {
                language: row.language || 'en',
                timezone: row.timezone || 'Asia/Kuala_Lumpur',
                numberFormat: row.number_format || 'decimal',
                dateFormat: row.date_format || 'DD/MM/YYYY'
            },
            permissions: row.permissions ? JSON.parse(row.permissions) : [],
            lastActivity: new Date(row.last_activity),
            isActive: row.is_active
        };
    }

    // Database operations
    private async storeDashboardSubscription(subscription: DashboardSubscription): Promise<void> {
        // Implementation for storing subscription in database
    }

    private async updateDashboardSubscriptionInDB(subscription: DashboardSubscription): Promise<void> {
        // Implementation for updating subscription in database
    }

    private async softDeleteDashboardSubscription(subscriptionId: string): Promise<void> {
        // Implementation for soft deleting subscription
    }

    // Public methods for external access
    getActiveDashboardCount(): number {
        return this.activeSubscriptions.size;
    }

    getDashboardWidgets(): DashboardWidget[] {
        return Array.from(this.dashboardWidgets.values());
    }

    getDashboardSubscriptions(): DashboardSubscription[] {
        return Array.from(this.activeSubscriptions.values());
    }
}

export default DashboardService;