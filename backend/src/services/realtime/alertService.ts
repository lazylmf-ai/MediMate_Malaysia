/**
 * Alert Service
 * 
 * Emergency and critical health alert broadcasting system
 * with Malaysian healthcare context and multi-channel delivery.
 */

import { RedisService } from '../cache/redisService';
import { DatabaseService } from '../database/databaseService';
import { NotificationService } from './notificationService';
import { AuditService } from '../audit/auditService';
import { PrayerTimeService } from '../cultural/prayerTimeService';
import * as cron from 'node-cron';

export interface HealthcareAlert {
    id: string;
    type: 'emergency' | 'critical_vital' | 'medication_critical' | 'system_failure' | 'security_breach' | 'natural_disaster';
    severity: 'low' | 'medium' | 'high' | 'critical' | 'emergency';
    title: string;
    message: string;
    patientId?: string;
    providerId?: string;
    facilityId?: string;
    location?: {
        latitude: number;
        longitude: number;
        address?: string;
        floor?: string;
        room?: string;
    };
    affectedArea?: {
        radius: number; // in kilometers
        states: string[];
        facilities: string[];
    };
    culturalContext: {
        overridesPrayerTime: boolean;
        multiLanguage: boolean;
        localizedMessages: Record<string, string>;
        urgencyLevel: 'immediate' | 'urgent' | 'scheduled';
    };
    escalationLevel: number; // 1-5, higher = more escalation
    expiresAt?: Date;
    resolvedAt?: Date;
    resolvedBy?: string;
    metadata: {
        source: string;
        category: string;
        tags: string[];
        relatedAlerts?: string[];
        automaticEscalation: boolean;
    };
    deliveryStatus: {
        totalRecipients: number;
        successfulDeliveries: number;
        failedDeliveries: number;
        pendingDeliveries: number;
        lastDeliveryAttempt?: Date;
    };
    createdAt: Date;
    updatedAt: Date;
}

export interface AlertRecipient {
    id: string;
    alertId: string;
    userId: string;
    userType: 'patient' | 'healthcare_provider' | 'admin' | 'emergency_responder' | 'security_personnel';
    patientId?: string;
    providerId?: string;
    location?: {
        state: string;
        facility?: string;
    };
    deliveryChannels: Array<{
        type: 'websocket' | 'sms' | 'email' | 'push' | 'pa_system' | 'emergency_beacon';
        priority: number;
        config: any;
    }>;
    culturalPreferences: {
        language: 'ms' | 'en' | 'zh' | 'ta';
        timezone: string;
        respectPrayerTime: boolean;
        emergencyOverride: boolean;
    };
    alertPreferences: {
        minimumSeverity: 'low' | 'medium' | 'high' | 'critical' | 'emergency';
        alertTypes: string[];
        locationBasedFiltering: boolean;
        maximumRadius: number; // km
    };
    acknowledgment?: {
        acknowledgedAt: Date;
        responseTime: number; // seconds
        status: 'received' | 'acknowledged' | 'responding' | 'resolved';
    };
    deliveryAttempts: Array<{
        channel: string;
        attemptedAt: Date;
        success: boolean;
        error?: string;
        responseTime?: number;
    }>;
}

export interface AlertEscalation {
    alertId: string;
    level: number;
    triggeredAt: Date;
    reason: 'timeout' | 'no_acknowledgment' | 'manual' | 'system_failure';
    escalatedTo: string[];
    originalRecipients: string[];
    additionalActions: Array<{
        type: 'call_emergency_services' | 'activate_pa_system' | 'notify_management' | 'lock_facility';
        executed: boolean;
        executedAt?: Date;
        result?: string;
    }>;
}

export class AlertService {
    private static instance: AlertService;
    private redisService: RedisService;
    private databaseService: DatabaseService;
    private notificationService: NotificationService;
    private auditService: AuditService;
    private prayerTimeService: PrayerTimeService;
    
    // In-memory caches
    private activeAlerts: Map<string, HealthcareAlert> = new Map();
    private alertRecipients: Map<string, AlertRecipient[]> = new Map();
    private escalationRules: Map<string, AlertEscalation[]> = new Map();
    
    // Alert timing configurations
    private readonly ACKNOWLEDGMENT_TIMEOUT = {
        'emergency': 2 * 60,      // 2 minutes
        'critical': 5 * 60,       // 5 minutes
        'high': 15 * 60,          // 15 minutes
        'medium': 30 * 60,        // 30 minutes
        'low': 60 * 60            // 1 hour
    };
    
    private readonly ESCALATION_LEVELS = {
        1: 'immediate_team',
        2: 'department_head',
        3: 'facility_management',
        4: 'emergency_services',
        5: 'health_ministry'
    };

    private constructor() {
        this.redisService = RedisService.getInstance();
        this.databaseService = DatabaseService.getInstance();
        this.notificationService = NotificationService.getInstance();
        this.auditService = AuditService.getInstance();
        this.prayerTimeService = PrayerTimeService.getInstance();

        this.initializeService();
    }

    public static getInstance(): AlertService {
        if (!AlertService.instance) {
            AlertService.instance = new AlertService();
        }
        return AlertService.instance;
    }

    private async initializeService(): Promise<void> {
        await this.loadActiveAlerts();
        this.setupScheduledJobs();
        this.setupRedisSubscriptions();
    }

    private async loadActiveAlerts(): Promise<void> {
        try {
            const db = this.databaseService.getConnection();
            const alerts = await db.manyOrNone(`
                SELECT * FROM healthcare_alerts 
                WHERE resolved_at IS NULL
                AND (expires_at IS NULL OR expires_at > NOW())
                ORDER BY created_at DESC
            `);

            this.activeAlerts.clear();
            for (const alert of alerts || []) {
                const deserializedAlert = this.deserializeAlert(alert);
                this.activeAlerts.set(alert.id, deserializedAlert);
                
                // Load recipients for each alert
                const recipients = await this.loadAlertRecipients(alert.id);
                this.alertRecipients.set(alert.id, recipients);
            }

            console.log(`✅ Loaded ${this.activeAlerts.size} active healthcare alerts`);
        } catch (error) {
            console.error('❌ Failed to load active alerts:', error);
        }
    }

    private setupScheduledJobs(): void {
        // Check for acknowledgment timeouts every minute
        cron.schedule('* * * * *', () => {
            this.checkAcknowledmentTimeouts();
        });

        // Process alert escalations every 2 minutes
        cron.schedule('*/2 * * * *', () => {
            this.processAlertEscalations();
        });

        // Clean up resolved alerts daily
        cron.schedule('0 2 * * *', () => {
            this.cleanupResolvedAlerts();
        });

        // Monitor system health every 5 minutes
        cron.schedule('*/5 * * * *', () => {
            this.monitorSystemHealth();
        });
    }

    private async setupRedisSubscriptions(): Promise<void> {
        try {
            await this.redisService.connect();

            // Subscribe to critical healthcare events that trigger alerts
            const alertTriggerChannels = [
                'healthcare:vitals_critical',
                'healthcare:medication_critical',
                'healthcare:system_failure',
                'healthcare:security_breach',
                'healthcare:emergency_reported'
            ];

            for (const channel of alertTriggerChannels) {
                await this.redisService.subscribeToHealthcareEvents(channel, (message) => {
                    this.handleAlertTrigger(channel, message);
                });
            }

            console.log('✅ Alert service Redis subscriptions established');
        } catch (error) {
            console.error('❌ Failed to setup alert Redis subscriptions:', error);
        }
    }

    async createEmergencyAlert(
        type: HealthcareAlert['type'],
        title: string,
        message: string,
        options: {
            patientId?: string;
            providerId?: string;
            facilityId?: string;
            location?: HealthcareAlert['location'];
            affectedArea?: HealthcareAlert['affectedArea'];
            escalationLevel?: number;
            metadata?: Partial<HealthcareAlert['metadata']>;
        } = {}
    ): Promise<string> {
        try {
            const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            // Determine severity based on type
            const severity = this.determineSeverityFromType(type);
            
            const alert: HealthcareAlert = {
                id: alertId,
                type,
                severity,
                title,
                message,
                patientId: options.patientId,
                providerId: options.providerId,
                facilityId: options.facilityId,
                location: options.location,
                affectedArea: options.affectedArea,
                culturalContext: {
                    overridesPrayerTime: severity === 'emergency' || severity === 'critical',
                    multiLanguage: true,
                    localizedMessages: await this.generateLocalizedMessages(title, message, type),
                    urgencyLevel: severity === 'emergency' ? 'immediate' : severity === 'critical' ? 'urgent' : 'scheduled'
                },
                escalationLevel: options.escalationLevel || this.getDefaultEscalationLevel(type),
                expiresAt: severity === 'emergency' ? new Date(Date.now() + 6 * 60 * 60 * 1000) : undefined, // 6 hours for emergencies
                metadata: {
                    source: 'alert_service',
                    category: type,
                    tags: this.generateAlertTags(type, severity),
                    automaticEscalation: true,
                    ...options.metadata
                },
                deliveryStatus: {
                    totalRecipients: 0,
                    successfulDeliveries: 0,
                    failedDeliveries: 0,
                    pendingDeliveries: 0
                },
                createdAt: new Date(),
                updatedAt: new Date()
            };

            // Store alert in database
            await this.storeAlert(alert);

            // Add to active alerts cache
            this.activeAlerts.set(alertId, alert);

            // Find and notify recipients
            const recipients = await this.findAlertRecipients(alert);
            this.alertRecipients.set(alertId, recipients);

            // Immediate delivery for emergency and critical alerts
            if (severity === 'emergency' || severity === 'critical') {
                await this.deliverAlertImmediately(alert, recipients);
            } else {
                await this.scheduleAlertDelivery(alert, recipients);
            }

            // Audit log
            await this.auditService.logHealthcareEvent({
                eventType: 'alert_created',
                patientId: options.patientId,
                providerId: options.providerId,
                success: true,
                metadata: {
                    alertId,
                    type,
                    severity,
                    escalationLevel: alert.escalationLevel,
                    recipientCount: recipients.length
                }
            });

            console.log(`🚨 Created ${severity} alert: ${alertId} - ${title}`);
            return alertId;

        } catch (error) {
            console.error('❌ Failed to create emergency alert:', error);
            
            await this.auditService.logHealthcareEvent({
                eventType: 'alert_creation_failed',
                patientId: options.patientId,
                providerId: options.providerId,
                success: false,
                errorMessage: error instanceof Error ? error.message : 'Unknown error'
            });

            throw error;
        }
    }

    async acknowledgeAlert(alertId: string, userId: string, responseStatus: 'received' | 'acknowledged' | 'responding'): Promise<void> {
        try {
            const alert = this.activeAlerts.get(alertId);
            if (!alert) {
                throw new Error(`Alert ${alertId} not found`);
            }

            const recipients = this.alertRecipients.get(alertId) || [];
            const recipient = recipients.find(r => r.userId === userId);
            
            if (!recipient) {
                throw new Error(`User ${userId} is not a recipient of alert ${alertId}`);
            }

            const now = new Date();
            const responseTime = Math.floor((now.getTime() - alert.createdAt.getTime()) / 1000);

            // Update recipient acknowledgment
            recipient.acknowledgment = {
                acknowledgedAt: now,
                responseTime,
                status: responseStatus
            };

            // Update in database
            await this.updateAlertRecipientAcknowledgment(alertId, userId, recipient.acknowledgment);

            // Update alert delivery status
            const acknowledgedCount = recipients.filter(r => r.acknowledgment?.status === 'acknowledged').length;
            const respondingCount = recipients.filter(r => r.acknowledgment?.status === 'responding').length;

            // Check if alert can be considered handled
            if (responseStatus === 'responding' && (alert.severity === 'emergency' || alert.severity === 'critical')) {
                // Cancel escalation for critical/emergency alerts if someone is responding
                await this.cancelScheduledEscalation(alertId);
            }

            // Audit log
            await this.auditService.logHealthcareEvent({
                eventType: 'alert_acknowledged',
                userId,
                patientId: alert.patientId,
                providerId: alert.providerId,
                success: true,
                metadata: {
                    alertId,
                    responseStatus,
                    responseTime,
                    acknowledgedCount,
                    respondingCount
                }
            });

            // Publish acknowledgment update
            await this.redisService.publishHealthcareEvent('healthcare:alert_acknowledgment', {
                alertId,
                userId,
                responseStatus,
                responseTime,
                acknowledgedCount,
                respondingCount
            });

            console.log(`✅ Alert ${alertId} acknowledged by ${userId} with status: ${responseStatus}`);

        } catch (error) {
            console.error(`❌ Failed to acknowledge alert ${alertId}:`, error);
            throw error;
        }
    }

    async resolveAlert(alertId: string, resolvedBy: string, resolution: string): Promise<void> {
        try {
            const alert = this.activeAlerts.get(alertId);
            if (!alert) {
                throw new Error(`Alert ${alertId} not found`);
            }

            if (alert.resolvedAt) {
                throw new Error(`Alert ${alertId} is already resolved`);
            }

            // Update alert status
            alert.resolvedAt = new Date();
            alert.resolvedBy = resolvedBy;
            alert.updatedAt = new Date();

            // Update in database
            await this.updateAlertResolution(alertId, alert.resolvedAt, resolvedBy, resolution);

            // Remove from active alerts
            this.activeAlerts.delete(alertId);
            this.alertRecipients.delete(alertId);

            // Cancel any pending escalations
            await this.cancelScheduledEscalation(alertId);

            // Notify all recipients of resolution
            await this.notifyAlertResolution(alert, resolution);

            // Audit log
            await this.auditService.logHealthcareEvent({
                eventType: 'alert_resolved',
                userId: resolvedBy,
                patientId: alert.patientId,
                providerId: alert.providerId,
                success: true,
                metadata: {
                    alertId,
                    resolution,
                    durationSeconds: Math.floor((alert.resolvedAt.getTime() - alert.createdAt.getTime()) / 1000)
                }
            });

            console.log(`✅ Alert ${alertId} resolved by ${resolvedBy}`);

        } catch (error) {
            console.error(`❌ Failed to resolve alert ${alertId}:`, error);
            throw error;
        }
    }

    private async deliverAlertImmediately(alert: HealthcareAlert, recipients: AlertRecipient[]): Promise<void> {
        const deliveryPromises: Promise<void>[] = [];

        for (const recipient of recipients) {
            // Filter channels based on alert severity and cultural preferences
            const appropriateChannels = this.filterChannelsForAlert(alert, recipient);

            for (const channel of appropriateChannels) {
                deliveryPromises.push(this.deliverAlertToChannel(alert, recipient, channel));
            }
        }

        // Execute all deliveries in parallel
        const results = await Promise.allSettled(deliveryPromises);
        
        // Update delivery status
        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;

        alert.deliveryStatus = {
            totalRecipients: recipients.length,
            successfulDeliveries: successful,
            failedDeliveries: failed,
            pendingDeliveries: 0,
            lastDeliveryAttempt: new Date()
        };

        await this.updateAlertDeliveryStatus(alert.id, alert.deliveryStatus);

        console.log(`📡 Alert ${alert.id} delivered: ${successful} successful, ${failed} failed`);
    }

    private async deliverAlertToChannel(alert: HealthcareAlert, recipient: AlertRecipient, channel: any): Promise<void> {
        const startTime = Date.now();
        let success = false;
        let error: string | undefined;

        try {
            const localizedMessage = alert.culturalContext.localizedMessages[recipient.culturalPreferences.language] || alert.message;

            switch (channel.type) {
                case 'websocket':
                    await this.deliverWebSocketAlert(alert, recipient, localizedMessage);
                    break;
                case 'sms':
                    await this.deliverSMSAlert(alert, recipient, localizedMessage, channel.config);
                    break;
                case 'email':
                    await this.deliverEmailAlert(alert, recipient, localizedMessage, channel.config);
                    break;
                case 'push':
                    await this.deliverPushAlert(alert, recipient, localizedMessage, channel.config);
                    break;
                case 'pa_system':
                    await this.activatePASystemAlert(alert, recipient, localizedMessage, channel.config);
                    break;
                case 'emergency_beacon':
                    await this.activateEmergencyBeacon(alert, recipient, channel.config);
                    break;
                default:
                    throw new Error(`Unsupported delivery channel: ${channel.type}`);
            }

            success = true;
        } catch (err) {
            error = err instanceof Error ? err.message : 'Unknown error';
            console.error(`❌ Failed to deliver alert ${alert.id} via ${channel.type}:`, error);
        }

        const responseTime = Date.now() - startTime;

        // Record delivery attempt
        recipient.deliveryAttempts.push({
            channel: channel.type,
            attemptedAt: new Date(),
            success,
            error,
            responseTime
        });

        // Update delivery attempt in database
        await this.recordDeliveryAttempt(recipient.id, {
            channel: channel.type,
            attemptedAt: new Date(),
            success,
            error,
            responseTime
        });
    }

    private async deliverWebSocketAlert(alert: HealthcareAlert, recipient: AlertRecipient, message: string): Promise<void> {
        await this.redisService.publishHealthcareEvent('healthcare:emergency', {
            type: 'emergency_alert',
            alertId: alert.id,
            severity: alert.severity,
            title: alert.title,
            message,
            location: alert.location,
            culturalContext: {
                language: recipient.culturalPreferences.language,
                overridesPrayerTime: alert.culturalContext.overridesPrayerTime
            },
            targetUserId: recipient.userId,
            timestamp: new Date().toISOString()
        });
    }

    private async deliverSMSAlert(alert: HealthcareAlert, recipient: AlertRecipient, message: string, config: any): Promise<void> {
        // Use NotificationService for SMS delivery
        await this.notificationService.sendHealthcareNotification({
            type: 'emergency_alert',
            priority: alert.severity,
            recipient: {
                userId: recipient.userId,
                userType: recipient.userType,
                channels: [{ type: 'sms', enabled: true, config }],
                culturalPreferences: {
                    language: recipient.culturalPreferences.language,
                    state: recipient.location?.state || 'KUL',
                    timezone: recipient.culturalPreferences.timezone,
                    prayerTimeNotifications: false, // Emergency overrides
                    halalMedicationOnly: false,
                    preferredContactTime: { startHour: 0, endHour: 24 },
                    doNotDisturbDuringPrayer: false // Emergency overrides
                }
            },
            title: `🚨 ${alert.title}`,
            message: `URGENT: ${message}. Alert ID: ${alert.id}`,
            culturalContext: {
                prayerTimeAware: false, // Emergency overrides
                ramadanAware: false,
                localizedContent: {
                    [recipient.culturalPreferences.language]: message
                }
            }
        });
    }

    private async deliverEmailAlert(alert: HealthcareAlert, recipient: AlertRecipient, message: string, config: any): Promise<void> {
        // Use NotificationService for email delivery
        await this.notificationService.sendHealthcareNotification({
            type: 'emergency_alert',
            priority: alert.severity,
            recipient: {
                userId: recipient.userId,
                userType: recipient.userType,
                channels: [{ type: 'email', enabled: true, config }],
                culturalPreferences: {
                    language: recipient.culturalPreferences.language,
                    state: recipient.location?.state || 'KUL',
                    timezone: recipient.culturalPreferences.timezone,
                    prayerTimeNotifications: false,
                    halalMedicationOnly: false,
                    preferredContactTime: { startHour: 0, endHour: 24 },
                    doNotDisturbDuringPrayer: false
                }
            },
            title: `🚨 Emergency Alert: ${alert.title}`,
            message: `${message}\n\nAlert Details:\n- Type: ${alert.type}\n- Severity: ${alert.severity}\n- Time: ${alert.createdAt.toISOString()}\n- Alert ID: ${alert.id}`,
            culturalContext: {
                prayerTimeAware: false,
                ramadanAware: false,
                localizedContent: {
                    [recipient.culturalPreferences.language]: message
                }
            }
        });
    }

    private async deliverPushAlert(alert: HealthcareAlert, recipient: AlertRecipient, message: string, config: any): Promise<void> {
        // Implementation for mobile push notifications would go here
        // This would integrate with FCM for Android and APNs for iOS
        console.log('Push notification delivery not yet implemented');
        throw new Error('Push notification delivery not implemented');
    }

    private async activatePASystemAlert(alert: HealthcareAlert, recipient: AlertRecipient, message: string, config: any): Promise<void> {
        // Implementation for PA system activation would go here
        // This would integrate with facility PA systems
        console.log('PA system activation not yet implemented');
        throw new Error('PA system activation not implemented');
    }

    private async activateEmergencyBeacon(alert: HealthcareAlert, recipient: AlertRecipient, config: any): Promise<void> {
        // Implementation for emergency beacon activation would go here
        // This would integrate with emergency beacon systems
        console.log('Emergency beacon activation not yet implemented');
        throw new Error('Emergency beacon activation not implemented');
    }

    // Utility methods
    private determineSeverityFromType(type: HealthcareAlert['type']): HealthcareAlert['severity'] {
        const severityMap: Record<HealthcareAlert['type'], HealthcareAlert['severity']> = {
            'emergency': 'emergency',
            'critical_vital': 'critical',
            'medication_critical': 'critical',
            'system_failure': 'high',
            'security_breach': 'high',
            'natural_disaster': 'emergency'
        };

        return severityMap[type] || 'medium';
    }

    private getDefaultEscalationLevel(type: HealthcareAlert['type']): number {
        const escalationMap: Record<HealthcareAlert['type'], number> = {
            'emergency': 3,
            'critical_vital': 2,
            'medication_critical': 2,
            'system_failure': 1,
            'security_breach': 2,
            'natural_disaster': 4
        };

        return escalationMap[type] || 1;
    }

    private generateAlertTags(type: HealthcareAlert['type'], severity: HealthcareAlert['severity']): string[] {
        const tags = [type, severity];
        
        if (type.includes('vital')) tags.push('patient_care');
        if (type.includes('medication')) tags.push('medication');
        if (type.includes('system')) tags.push('infrastructure');
        if (type.includes('security')) tags.push('security');
        if (severity === 'emergency' || severity === 'critical') tags.push('immediate_response');

        return tags;
    }

    private async generateLocalizedMessages(title: string, message: string, type: HealthcareAlert['type']): Promise<Record<string, string>> {
        // Implementation would integrate with language service for translations
        return {
            'en': message,
            'ms': message, // Would be translated
            'zh': message, // Would be translated  
            'ta': message  // Would be translated
        };
    }

    private filterChannelsForAlert(alert: HealthcareAlert, recipient: AlertRecipient): any[] {
        let channels = recipient.deliveryChannels.filter(channel => {
            // Filter based on minimum severity
            if (alert.severity === 'low' && recipient.alertPreferences.minimumSeverity !== 'low') return false;
            if (alert.severity === 'medium' && ['high', 'critical', 'emergency'].includes(recipient.alertPreferences.minimumSeverity)) return false;
            if (alert.severity === 'high' && ['critical', 'emergency'].includes(recipient.alertPreferences.minimumSeverity)) return false;

            // Filter based on alert types
            if (!recipient.alertPreferences.alertTypes.includes(alert.type)) return false;

            return true;
        });

        // Sort by priority (higher priority first)
        channels.sort((a, b) => b.priority - a.priority);

        // For emergency/critical, use all available channels
        if (alert.severity === 'emergency' || alert.severity === 'critical') {
            return channels;
        }

        // For other severities, use top priority channels
        return channels.slice(0, 2);
    }

    // Scheduled job implementations
    private async checkAcknowledmentTimeouts(): Promise<void> {
        const now = Date.now();

        for (const [alertId, alert] of this.activeAlerts.entries()) {
            if (alert.resolvedAt) continue;

            const timeoutSeconds = this.ACKNOWLEDGMENT_TIMEOUT[alert.severity];
            const timeoutMs = timeoutSeconds * 1000;
            const alertAgeMs = now - alert.createdAt.getTime();

            if (alertAgeMs > timeoutMs) {
                const recipients = this.alertRecipients.get(alertId) || [];
                const hasResponder = recipients.some(r => r.acknowledgment?.status === 'responding');

                if (!hasResponder) {
                    // Trigger escalation
                    await this.escalateAlert(alertId, 'timeout');
                }
            }
        }
    }

    private async processAlertEscalations(): Promise<void> {
        // Process any pending escalations
        for (const [alertId, escalations] of this.escalationRules.entries()) {
            for (const escalation of escalations) {
                // Implementation for processing escalations
            }
        }
    }

    private async escalateAlert(alertId: string, reason: AlertEscalation['reason']): Promise<void> {
        const alert = this.activeAlerts.get(alertId);
        if (!alert || alert.resolvedAt) return;

        const currentLevel = alert.escalationLevel;
        const nextLevel = Math.min(currentLevel + 1, 5);

        if (nextLevel > currentLevel) {
            alert.escalationLevel = nextLevel;
            
            // Find escalation recipients
            const escalationRecipients = await this.getEscalationRecipients(nextLevel, alert);
            
            // Create escalation record
            const escalation: AlertEscalation = {
                alertId,
                level: nextLevel,
                triggeredAt: new Date(),
                reason,
                escalatedTo: escalationRecipients.map(r => r.userId),
                originalRecipients: (this.alertRecipients.get(alertId) || []).map(r => r.userId),
                additionalActions: []
            };

            // Store escalation
            await this.storeAlertEscalation(escalation);

            // Notify escalation recipients
            await this.deliverAlertImmediately(alert, escalationRecipients);

            console.log(`⬆️ Alert ${alertId} escalated to level ${nextLevel} due to ${reason}`);
        }
    }

    private async getEscalationRecipients(level: number, alert: HealthcareAlert): Promise<AlertRecipient[]> {
        // Implementation would fetch appropriate recipients based on escalation level
        return [];
    }

    private async cleanupResolvedAlerts(): Promise<void> {
        // Clean up old resolved alerts from memory and database
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        
        try {
            const db = this.databaseService.getConnection();
            await db.none(`
                DELETE FROM healthcare_alerts 
                WHERE resolved_at IS NOT NULL 
                AND resolved_at < $1
            `, [thirtyDaysAgo]);

            console.log('✅ Cleaned up old resolved alerts');
        } catch (error) {
            console.error('❌ Failed to cleanup resolved alerts:', error);
        }
    }

    private async monitorSystemHealth(): Promise<void> {
        // Monitor system health and create alerts for issues
        try {
            // Check Redis connectivity
            const redisHealth = await this.redisService.testConnection();
            if (!redisHealth) {
                await this.createEmergencyAlert(
                    'system_failure',
                    'Redis Connection Failure',
                    'Real-time communication system is experiencing connectivity issues',
                    { 
                        metadata: { 
                            source: 'system_monitor',
                            category: 'infrastructure'
                        }
                    }
                );
            }

            // Additional health checks would go here
        } catch (error) {
            console.error('❌ System health monitoring failed:', error);
        }
    }

    private handleAlertTrigger(channel: string, message: string): void {
        try {
            const eventData = JSON.parse(message);
            
            // Process different types of alert triggers
            switch (channel) {
                case 'healthcare:vitals_critical':
                    this.handleCriticalVitalsAlert(eventData);
                    break;
                case 'healthcare:medication_critical':
                    this.handleCriticalMedicationAlert(eventData);
                    break;
                case 'healthcare:system_failure':
                    this.handleSystemFailureAlert(eventData);
                    break;
                case 'healthcare:security_breach':
                    this.handleSecurityBreachAlert(eventData);
                    break;
                case 'healthcare:emergency_reported':
                    this.handleEmergencyReportAlert(eventData);
                    break;
            }
        } catch (error) {
            console.error(`❌ Failed to handle alert trigger from ${channel}:`, error);
        }
    }

    private async handleCriticalVitalsAlert(eventData: any): Promise<void> {
        await this.createEmergencyAlert(
            'critical_vital',
            'Critical Vital Signs Alert',
            `Patient ${eventData.patientId} has critical vital signs requiring immediate attention`,
            {
                patientId: eventData.patientId,
                location: eventData.location,
                metadata: {
                    source: 'vitals_monitor',
                    category: 'patient_care',
                    vitalData: eventData.vitals
                }
            }
        );
    }

    private async handleCriticalMedicationAlert(eventData: any): Promise<void> {
        await this.createEmergencyAlert(
            'medication_critical',
            'Critical Medication Alert',
            `Critical medication issue for patient ${eventData.patientId}`,
            {
                patientId: eventData.patientId,
                metadata: {
                    source: 'medication_system',
                    category: 'medication',
                    medicationData: eventData.medication
                }
            }
        );
    }

    private async handleSystemFailureAlert(eventData: any): Promise<void> {
        await this.createEmergencyAlert(
            'system_failure',
            'System Failure Alert',
            `Critical system failure detected: ${eventData.system}`,
            {
                facilityId: eventData.facilityId,
                metadata: {
                    source: 'system_monitor',
                    category: 'infrastructure',
                    failureDetails: eventData.details
                }
            }
        );
    }

    private async handleSecurityBreachAlert(eventData: any): Promise<void> {
        await this.createEmergencyAlert(
            'security_breach',
            'Security Breach Alert',
            `Security breach detected: ${eventData.description}`,
            {
                facilityId: eventData.facilityId,
                location: eventData.location,
                metadata: {
                    source: 'security_system',
                    category: 'security',
                    breachDetails: eventData.details
                }
            }
        );
    }

    private async handleEmergencyReportAlert(eventData: any): Promise<void> {
        await this.createEmergencyAlert(
            'emergency',
            'Emergency Reported',
            eventData.description,
            {
                patientId: eventData.patientId,
                providerId: eventData.reportedBy,
                location: eventData.location,
                metadata: {
                    source: 'manual_report',
                    category: 'emergency',
                    reportDetails: eventData.details
                }
            }
        );
    }

    // Database operations (implementations would be added)
    private deserializeAlert(row: any): HealthcareAlert {
        // Implementation for deserializing alert from database row
        return row as HealthcareAlert;
    }

    private async loadAlertRecipients(alertId: string): Promise<AlertRecipient[]> {
        // Implementation for loading alert recipients from database
        return [];
    }

    private async storeAlert(alert: HealthcareAlert): Promise<void> {
        // Implementation for storing alert in database
    }

    private async updateAlertDeliveryStatus(alertId: string, status: HealthcareAlert['deliveryStatus']): Promise<void> {
        // Implementation for updating alert delivery status
    }

    private async updateAlertRecipientAcknowledgment(alertId: string, userId: string, acknowledgment: AlertRecipient['acknowledgment']): Promise<void> {
        // Implementation for updating recipient acknowledgment
    }

    private async updateAlertResolution(alertId: string, resolvedAt: Date, resolvedBy: string, resolution: string): Promise<void> {
        // Implementation for updating alert resolution
    }

    private async recordDeliveryAttempt(recipientId: string, attempt: AlertRecipient['deliveryAttempts'][0]): Promise<void> {
        // Implementation for recording delivery attempt
    }

    private async storeAlertEscalation(escalation: AlertEscalation): Promise<void> {
        // Implementation for storing alert escalation
    }

    private async scheduleAlertDelivery(alert: HealthcareAlert, recipients: AlertRecipient[]): Promise<void> {
        // Implementation for scheduling alert delivery
    }

    private async cancelScheduledEscalation(alertId: string): Promise<void> {
        // Implementation for canceling scheduled escalation
    }

    private async notifyAlertResolution(alert: HealthcareAlert, resolution: string): Promise<void> {
        // Implementation for notifying alert resolution
    }

    private async findAlertRecipients(alert: HealthcareAlert): Promise<AlertRecipient[]> {
        // Implementation for finding appropriate alert recipients
        return [];
    }

    // Public methods for external access
    getActiveAlertsCount(): number {
        return this.activeAlerts.size;
    }

    getActiveAlerts(): HealthcareAlert[] {
        return Array.from(this.activeAlerts.values());
    }

    getAlertById(alertId: string): HealthcareAlert | undefined {
        return this.activeAlerts.get(alertId);
    }

    async getAlertHistory(patientId?: string, providerId?: string, facilityId?: string): Promise<HealthcareAlert[]> {
        const db = this.databaseService.getConnection();
        let query = 'SELECT * FROM healthcare_alerts WHERE 1=1';
        const params: any[] = [];
        let paramCounter = 1;

        if (patientId) {
            query += ` AND patient_id = $${paramCounter}`;
            params.push(patientId);
            paramCounter++;
        }

        if (providerId) {
            query += ` AND provider_id = $${paramCounter}`;
            params.push(providerId);
            paramCounter++;
        }

        if (facilityId) {
            query += ` AND facility_id = $${paramCounter}`;
            params.push(facilityId);
            paramCounter++;
        }

        query += ' ORDER BY created_at DESC LIMIT 100';

        const rows = await db.manyOrNone(query, params);
        return rows.map(row => this.deserializeAlert(row));
    }
}

export default AlertService;