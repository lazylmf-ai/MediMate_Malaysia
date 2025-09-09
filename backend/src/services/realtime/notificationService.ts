/**
 * Notification Service
 * 
 * Centralized notification management for healthcare communications
 * with Malaysian cultural context and multi-channel delivery.
 */

import { RedisService } from '../cache/redisService';
import { DatabaseService } from '../database/databaseService';
import { AuditService } from '../audit/auditService';
import { CulturalCalendarService } from '../cultural/culturalCalendarService';
import { PrayerTimeService } from '../cultural/prayerTimeService';
import * as cron from 'node-cron';
import { Twilio } from 'twilio';
import nodemailer from 'nodemailer';

export interface NotificationChannel {
    type: 'websocket' | 'sms' | 'email' | 'push' | 'webhook';
    enabled: boolean;
    config?: any;
}

export interface NotificationRecipient {
    userId: string;
    patientId?: string;
    providerId?: string;
    userType: 'patient' | 'healthcare_provider' | 'admin' | 'emergency_responder';
    channels: NotificationChannel[];
    culturalPreferences: {
        language: 'ms' | 'en' | 'zh' | 'ta';
        state: string;
        timezone: string;
        prayerTimeNotifications: boolean;
        halalMedicationOnly: boolean;
        preferredContactTime: {
            startHour: number;
            endHour: number;
        };
        doNotDisturbDuringPrayer: boolean;
    };
}

export interface HealthcareNotification {
    id: string;
    type: 'vital_alert' | 'appointment_reminder' | 'medication_reminder' | 'emergency_alert' | 'provider_message' | 'cultural_reminder';
    priority: 'low' | 'medium' | 'high' | 'critical' | 'emergency';
    recipient: NotificationRecipient;
    title: string;
    message: string;
    culturalContext?: {
        prayerTimeAware: boolean;
        ramadanAware: boolean;
        localizedContent: Record<string, string>;
        culturalInstructions?: string;
    };
    scheduledFor?: Date;
    expiresAt?: Date;
    metadata?: any;
    deliveryStatus: Record<string, 'pending' | 'sent' | 'delivered' | 'failed' | 'expired'>;
    createdAt: Date;
    updatedAt: Date;
}

export class NotificationService {
    private static instance: NotificationService;
    private redisService: RedisService;
    private databaseService: DatabaseService;
    private auditService: AuditService;
    private culturalCalendarService: CulturalCalendarService;
    private prayerTimeService: PrayerTimeService;
    private twilioClient: Twilio | null = null;
    private emailTransporter: nodemailer.Transporter | null = null;

    private constructor() {
        this.redisService = RedisService.getInstance();
        this.databaseService = DatabaseService.getInstance();
        this.auditService = AuditService.getInstance();
        this.culturalCalendarService = CulturalCalendarService.getInstance();
        this.prayerTimeService = PrayerTimeService.getInstance();

        this.initializeServices();
        this.setupScheduledJobs();
    }

    public static getInstance(): NotificationService {
        if (!NotificationService.instance) {
            NotificationService.instance = new NotificationService();
        }
        return NotificationService.instance;
    }

    private initializeServices(): void {
        // Initialize Twilio for SMS
        if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
            this.twilioClient = new Twilio(
                process.env.TWILIO_ACCOUNT_SID,
                process.env.TWILIO_AUTH_TOKEN
            );
        }

        // Initialize Email transporter
        if (process.env.EMAIL_SERVICE) {
            this.emailTransporter = nodemailer.createTransport({
                service: process.env.EMAIL_SERVICE,
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASSWORD
                }
            });
        }
    }

    private setupScheduledJobs(): void {
        // Check for medication reminders every minute
        cron.schedule('* * * * *', () => {
            this.processMedicationReminders();
        });

        // Check for appointment reminders every 15 minutes
        cron.schedule('*/15 * * * *', () => {
            this.processAppointmentReminders();
        });

        // Process prayer time notifications (5 times daily)
        cron.schedule('0 */3 * * *', () => {
            this.processPrayerTimeReminders();
        });

        // Clean up expired notifications daily at 2 AM
        cron.schedule('0 2 * * *', () => {
            this.cleanupExpiredNotifications();
        });
    }

    async sendHealthcareNotification(notification: Partial<HealthcareNotification>): Promise<string> {
        try {
            // Generate notification ID
            const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            // Complete notification object
            const completeNotification: HealthcareNotification = {
                id: notificationId,
                type: notification.type!,
                priority: notification.priority!,
                recipient: notification.recipient!,
                title: notification.title!,
                message: notification.message!,
                culturalContext: notification.culturalContext,
                scheduledFor: notification.scheduledFor || new Date(),
                expiresAt: notification.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
                metadata: notification.metadata || {},
                deliveryStatus: {},
                createdAt: new Date(),
                updatedAt: new Date()
            };

            // Check cultural timing constraints
            if (await this.shouldDelayForCulturalReasons(completeNotification)) {
                return await this.scheduleNotification(completeNotification);
            }

            // Immediate delivery
            await this.deliverNotification(completeNotification);

            // Store notification in database
            await this.storeNotification(completeNotification);

            // Audit log
            await this.auditService.logHealthcareEvent({
                eventType: 'notification_sent',
                userId: completeNotification.recipient.userId,
                userType: completeNotification.recipient.userType,
                success: true,
                metadata: {
                    notificationId,
                    notificationType: completeNotification.type,
                    priority: completeNotification.priority,
                    channels: completeNotification.recipient.channels.map(c => c.type)
                }
            });

            return notificationId;

        } catch (error) {
            console.error('Failed to send healthcare notification:', error);
            
            await this.auditService.logHealthcareEvent({
                eventType: 'notification_failed',
                userId: notification.recipient?.userId,
                userType: notification.recipient?.userType,
                success: false,
                errorMessage: error instanceof Error ? error.message : 'Unknown error'
            });

            throw error;
        }
    }

    async sendVitalSignsAlert(patientId: string, vitalData: any, thresholds: any): Promise<void> {
        try {
            // Get patient and their care team
            const recipients = await this.getVitalAlertsRecipients(patientId);
            
            for (const recipient of recipients) {
                const notification: Partial<HealthcareNotification> = {
                    type: 'vital_alert',
                    priority: this.calculateVitalAlertPriority(vitalData, thresholds),
                    recipient,
                    title: this.getLocalizedTitle('vital_alert', recipient.culturalPreferences.language),
                    message: this.generateVitalAlertMessage(vitalData, thresholds, recipient.culturalPreferences.language),
                    culturalContext: {
                        prayerTimeAware: recipient.culturalPreferences.prayerTimeNotifications,
                        ramadanAware: true,
                        localizedContent: {
                            [recipient.culturalPreferences.language]: this.generateVitalAlertMessage(
                                vitalData, 
                                thresholds, 
                                recipient.culturalPreferences.language
                            )
                        }
                    },
                    metadata: {
                        patientId,
                        vitalData,
                        thresholds
                    }
                };

                await this.sendHealthcareNotification(notification);
            }

        } catch (error) {
            console.error('Failed to send vital signs alert:', error);
        }
    }

    async sendEmergencyAlert(alertData: any, location?: { latitude: number; longitude: number }): Promise<void> {
        try {
            // Get all emergency responders in the area
            const emergencyRecipients = await this.getEmergencyRecipients(location);
            
            for (const recipient of emergencyRecipients) {
                const notification: Partial<HealthcareNotification> = {
                    type: 'emergency_alert',
                    priority: 'emergency',
                    recipient,
                    title: this.getLocalizedTitle('emergency_alert', recipient.culturalPreferences.language),
                    message: this.generateEmergencyMessage(alertData, recipient.culturalPreferences.language),
                    culturalContext: {
                        prayerTimeAware: false, // Emergency overrides prayer time
                        ramadanAware: false,
                        localizedContent: {
                            [recipient.culturalPreferences.language]: this.generateEmergencyMessage(
                                alertData, 
                                recipient.culturalPreferences.language
                            )
                        }
                    },
                    expiresAt: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours for emergency
                    metadata: {
                        alertType: alertData.type,
                        location,
                        severity: alertData.severity
                    }
                };

                // Emergency notifications bypass cultural timing constraints
                await this.deliverNotification(notification as HealthcareNotification);
            }

        } catch (error) {
            console.error('Failed to send emergency alert:', error);
        }
    }

    private async shouldDelayForCulturalReasons(notification: HealthcareNotification): Promise<boolean> {
        // Emergency notifications are never delayed
        if (notification.priority === 'emergency' || notification.type === 'emergency_alert') {
            return false;
        }

        const recipient = notification.recipient;
        
        // Check if it's during prayer time and user has prayer time sensitivity
        if (recipient.culturalPreferences.doNotDisturbDuringPrayer) {
            const currentPrayerTime = await this.prayerTimeService.getCurrentPrayerTime(
                recipient.culturalPreferences.state
            );
            
            if (currentPrayerTime && this.isWithinPrayerWindow(currentPrayerTime)) {
                return true;
            }
        }

        // Check if it's outside preferred contact hours
        const now = new Date();
        const currentHour = now.getHours();
        const preferences = recipient.culturalPreferences.preferredContactTime;
        
        if (currentHour < preferences.startHour || currentHour > preferences.endHour) {
            return true;
        }

        return false;
    }

    private isWithinPrayerWindow(prayerTime: any): boolean {
        const now = new Date();
        const prayerStart = new Date(prayerTime.time);
        const prayerEnd = new Date(prayerStart.getTime() + 30 * 60000); // 30 minutes window
        
        return now >= prayerStart && now <= prayerEnd;
    }

    private async scheduleNotification(notification: HealthcareNotification): Promise<string> {
        // Calculate next appropriate time
        const nextDeliveryTime = await this.calculateNextDeliveryTime(notification);
        notification.scheduledFor = nextDeliveryTime;

        // Store in Redis for scheduled delivery
        await this.redisService.getClient().setEx(
            `scheduled_notification:${notification.id}`,
            Math.floor((nextDeliveryTime.getTime() - Date.now()) / 1000),
            JSON.stringify(notification)
        );

        console.log(`📅 Notification ${notification.id} scheduled for ${nextDeliveryTime.toISOString()}`);
        return notification.id;
    }

    private async calculateNextDeliveryTime(notification: HealthcareNotification): Promise<Date> {
        const recipient = notification.recipient;
        const now = new Date();
        let nextTime = new Date(now);

        // If outside preferred hours, schedule for next preferred start time
        const currentHour = now.getHours();
        const preferences = recipient.culturalPreferences.preferredContactTime;

        if (currentHour < preferences.startHour) {
            nextTime.setHours(preferences.startHour, 0, 0, 0);
        } else if (currentHour >= preferences.endHour) {
            nextTime.setDate(nextTime.getDate() + 1);
            nextTime.setHours(preferences.startHour, 0, 0, 0);
        }

        // Check for prayer time conflicts
        if (recipient.culturalPreferences.doNotDisturbDuringPrayer) {
            const prayerTimes = await this.prayerTimeService.getPrayerTimesForDate(
                nextTime,
                recipient.culturalPreferences.state
            );

            // Find next safe time after prayer
            for (const prayer of prayerTimes) {
                const prayerStart = new Date(prayer.time);
                const prayerEnd = new Date(prayerStart.getTime() + 30 * 60000);
                
                if (nextTime >= prayerStart && nextTime <= prayerEnd) {
                    nextTime = new Date(prayerEnd.getTime() + 5 * 60000); // 5 minutes after
                }
            }
        }

        return nextTime;
    }

    private async deliverNotification(notification: HealthcareNotification): Promise<void> {
        const deliveryPromises: Promise<void>[] = [];

        // Deliver through enabled channels
        for (const channel of notification.recipient.channels) {
            if (!channel.enabled) continue;

            switch (channel.type) {
                case 'websocket':
                    deliveryPromises.push(this.deliverWebSocketNotification(notification));
                    break;
                case 'sms':
                    deliveryPromises.push(this.deliverSMSNotification(notification, channel.config));
                    break;
                case 'email':
                    deliveryPromises.push(this.deliverEmailNotification(notification, channel.config));
                    break;
                case 'push':
                    deliveryPromises.push(this.deliverPushNotification(notification, channel.config));
                    break;
                case 'webhook':
                    deliveryPromises.push(this.deliverWebhookNotification(notification, channel.config));
                    break;
            }
        }

        // Wait for all deliveries
        const results = await Promise.allSettled(deliveryPromises);
        
        // Update delivery status
        notification.recipient.channels.forEach((channel, index) => {
            const result = results[index];
            notification.deliveryStatus[channel.type] = result.status === 'fulfilled' ? 'delivered' : 'failed';
        });

        notification.updatedAt = new Date();
    }

    private async deliverWebSocketNotification(notification: HealthcareNotification): Promise<void> {
        // Publish to Redis for WebSocket distribution
        await this.redisService.publishHealthcareEvent(`healthcare:notifications`, {
            type: 'notification',
            recipient: notification.recipient,
            notification: {
                id: notification.id,
                type: notification.type,
                priority: notification.priority,
                title: notification.title,
                message: notification.message,
                culturalContext: notification.culturalContext,
                createdAt: notification.createdAt
            }
        });
    }

    private async deliverSMSNotification(notification: HealthcareNotification, config: any): Promise<void> {
        if (!this.twilioClient || !config.phoneNumber) {
            throw new Error('SMS delivery not configured');
        }

        const language = notification.recipient.culturalPreferences.language;
        const message = notification.culturalContext?.localizedContent[language] || notification.message;

        await this.twilioClient.messages.create({
            body: `[MediMate] ${notification.title}: ${message}`,
            from: process.env.TWILIO_PHONE_NUMBER,
            to: config.phoneNumber
        });
    }

    private async deliverEmailNotification(notification: HealthcareNotification, config: any): Promise<void> {
        if (!this.emailTransporter || !config.email) {
            throw new Error('Email delivery not configured');
        }

        const language = notification.recipient.culturalPreferences.language;
        const message = notification.culturalContext?.localizedContent[language] || notification.message;

        await this.emailTransporter.sendMail({
            from: process.env.EMAIL_FROM || 'noreply@medimate.my',
            to: config.email,
            subject: `[MediMate Malaysia] ${notification.title}`,
            text: message,
            html: this.generateEmailHTML(notification, language)
        });
    }

    private async deliverPushNotification(notification: HealthcareNotification, config: any): Promise<void> {
        // Push notification implementation would go here
        // This would integrate with FCM for Android and APNs for iOS
        console.log('Push notification delivery not yet implemented');
    }

    private async deliverWebhookNotification(notification: HealthcareNotification, config: any): Promise<void> {
        if (!config.url) {
            throw new Error('Webhook URL not configured');
        }

        const axios = require('axios');
        await axios.post(config.url, {
            notification: {
                id: notification.id,
                type: notification.type,
                priority: notification.priority,
                title: notification.title,
                message: notification.message,
                recipient: notification.recipient,
                culturalContext: notification.culturalContext,
                createdAt: notification.createdAt
            }
        }, {
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'MediMate-Malaysia-Webhook/1.0'
            },
            timeout: 10000
        });
    }

    // Scheduled job methods
    private async processMedicationReminders(): Promise<void> {
        // Implementation for medication reminder processing
        console.log('Processing medication reminders...');
    }

    private async processAppointmentReminders(): Promise<void> {
        // Implementation for appointment reminder processing
        console.log('Processing appointment reminders...');
    }

    private async processPrayerTimeReminders(): Promise<void> {
        // Implementation for prayer time reminder processing
        console.log('Processing prayer time reminders...');
    }

    private async cleanupExpiredNotifications(): Promise<void> {
        // Implementation for cleaning up expired notifications
        console.log('Cleaning up expired notifications...');
    }

    // Utility methods continue...
    private async storeNotification(notification: HealthcareNotification): Promise<void> {
        // Store notification in database for audit trail
        // Implementation would depend on database schema
    }

    private async getVitalAlertsRecipients(patientId: string): Promise<NotificationRecipient[]> {
        // Get patient's care team and family members who should receive vital alerts
        return [];
    }

    private async getEmergencyRecipients(location?: any): Promise<NotificationRecipient[]> {
        // Get emergency responders in the area
        return [];
    }

    private getLocalizedTitle(titleKey: string, language: string): string {
        const titles: Record<string, Record<string, string>> = {
            vital_alert: {
                'ms': 'Amaran Tanda Vital',
                'en': 'Vital Signs Alert',
                'zh': '生命体征警报',
                'ta': 'முக்கிய அறிகுறிகள் எச்சரிக்கை'
            },
            emergency_alert: {
                'ms': 'Amaran Kecemasan',
                'en': 'Emergency Alert',
                'zh': '紧急警报',
                'ta': 'அவசர எச்சரிக்கை'
            }
        };

        return titles[titleKey]?.[language] || titles[titleKey]?.['en'] || titleKey;
    }

    private generateVitalAlertMessage(vitalData: any, thresholds: any, language: string): string {
        // Generate culturally appropriate vital signs alert message
        return `Vital signs reading outside normal range. Please review patient status.`;
    }

    private generateEmergencyMessage(alertData: any, language: string): string {
        // Generate culturally appropriate emergency alert message
        return `Emergency situation detected. Immediate response required.`;
    }

    private calculateVitalAlertPriority(vitalData: any, thresholds: any): 'low' | 'medium' | 'high' | 'critical' | 'emergency' {
        // Calculate priority based on how far outside normal ranges the vitals are
        return 'high';
    }

    private generateEmailHTML(notification: HealthcareNotification, language: string): string {
        return `
            <html>
                <body>
                    <h2>${notification.title}</h2>
                    <p>${notification.message}</p>
                    <p><em>MediMate Malaysia Healthcare System</em></p>
                </body>
            </html>
        `;
    }
}

export default NotificationService;