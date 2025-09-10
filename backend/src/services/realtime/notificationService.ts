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
        try {
            const db = this.databaseService.getConnection();
            
            // Get medication schedules that are due for reminders
            const dueReminders = await db.manyOrNone(`
                SELECT 
                    ms.id as schedule_id,
                    ms.patient_id,
                    ms.medication_id,
                    ms.scheduled_time,
                    ms.dosage,
                    ms.instructions,
                    m.name as medication_name,
                    m.halal_certified,
                    m.cultural_considerations,
                    p.user_id,
                    u.user_type,
                    cp.language,
                    cp.state,
                    cp.timezone,
                    cp.prayer_time_notifications,
                    cp.halal_medication_only,
                    cp.preferred_contact_start_hour,
                    cp.preferred_contact_end_hour,
                    cp.do_not_disturb_during_prayer
                FROM medication_schedules ms
                JOIN medications m ON ms.medication_id = m.id
                JOIN patients p ON ms.patient_id = p.id
                JOIN users u ON p.user_id = u.id
                LEFT JOIN cultural_preferences cp ON u.id = cp.user_id
                WHERE ms.status = 'active'
                AND ms.scheduled_time <= NOW() + INTERVAL '15 minutes'
                AND ms.scheduled_time > NOW() - INTERVAL '15 minutes'
                AND (ms.last_reminder_sent IS NULL OR ms.last_reminder_sent < ms.scheduled_time - INTERVAL '1 hour')
            `);

            for (const reminder of dueReminders) {
                // Skip if halal medication only and medication is not halal certified
                if (reminder.halal_medication_only && !reminder.halal_certified) {
                    continue;
                }

                const recipient = {
                    userId: reminder.user_id,
                    patientId: reminder.patient_id,
                    userType: reminder.user_type,
                    channels: await this.getPatientNotificationChannels(reminder.patient_id),
                    culturalPreferences: {
                        language: reminder.language || 'en',
                        state: reminder.state || 'KUL',
                        timezone: reminder.timezone || 'Asia/Kuala_Lumpur',
                        prayerTimeNotifications: reminder.prayer_time_notifications || false,
                        halalMedicationOnly: reminder.halal_medication_only || false,
                        preferredContactTime: {
                            startHour: reminder.preferred_contact_start_hour || 8,
                            endHour: reminder.preferred_contact_end_hour || 22
                        },
                        doNotDisturbDuringPrayer: reminder.do_not_disturb_during_prayer || false
                    }
                };

                const notification = {
                    type: 'medication_reminder' as const,
                    priority: 'medium' as const,
                    recipient,
                    title: this.getLocalizedTitle('medication_reminder', recipient.culturalPreferences.language),
                    message: this.generateMedicationReminderMessage(reminder, recipient.culturalPreferences.language),
                    culturalContext: {
                        prayerTimeAware: recipient.culturalPreferences.prayerTimeNotifications,
                        ramadanAware: true,
                        localizedContent: {
                            [recipient.culturalPreferences.language]: this.generateMedicationReminderMessage(
                                reminder, 
                                recipient.culturalPreferences.language
                            )
                        },
                        culturalInstructions: reminder.cultural_considerations
                    },
                    metadata: {
                        scheduleId: reminder.schedule_id,
                        medicationId: reminder.medication_id,
                        medicationName: reminder.medication_name,
                        dosage: reminder.dosage,
                        scheduledTime: reminder.scheduled_time,
                        halalCertified: reminder.halal_certified
                    }
                };

                await this.sendHealthcareNotification(notification);

                // Update last reminder sent
                await db.none(`
                    UPDATE medication_schedules 
                    SET last_reminder_sent = NOW()
                    WHERE id = $1
                `, [reminder.schedule_id]);
            }

            if (dueReminders.length > 0) {
                console.log(`✅ Processed ${dueReminders.length} medication reminders`);
            }
        } catch (error) {
            console.error('❌ Failed to process medication reminders:', error);
        }
    }

    private async processAppointmentReminders(): Promise<void> {
        try {
            const db = this.databaseService.getConnection();
            
            // Get appointments that need reminders (24 hours and 2 hours before)
            const dueReminders = await db.manyOrNone(`
                SELECT DISTINCT
                    a.id as appointment_id,
                    a.patient_id,
                    a.provider_id,
                    a.scheduled_datetime,
                    a.appointment_type,
                    a.location,
                    a.notes,
                    a.status,
                    p.user_id as patient_user_id,
                    pu.user_type as patient_user_type,
                    hp.user_id as provider_user_id,
                    hu.user_type as provider_user_type,
                    cp.language as patient_language,
                    cp.state as patient_state,
                    cp.timezone as patient_timezone,
                    cp.prayer_time_notifications as patient_prayer_notifications,
                    cp.preferred_contact_start_hour as patient_contact_start,
                    cp.preferred_contact_end_hour as patient_contact_end,
                    cp.do_not_disturb_during_prayer as patient_prayer_dnd,
                    hcp.language as provider_language,
                    hcp.state as provider_state,
                    hcp.timezone as provider_timezone,
                    hp.name as provider_name,
                    '24_hour' as reminder_type
                FROM appointments a
                JOIN patients p ON a.patient_id = p.id
                JOIN users pu ON p.user_id = pu.id
                JOIN healthcare_providers hp ON a.provider_id = hp.id
                JOIN users hu ON hp.user_id = hu.id
                LEFT JOIN cultural_preferences cp ON pu.id = cp.user_id
                LEFT JOIN cultural_preferences hcp ON hu.id = hcp.user_id
                WHERE a.status IN ('scheduled', 'confirmed')
                AND a.scheduled_datetime > NOW()
                AND a.scheduled_datetime <= NOW() + INTERVAL '24 hours 15 minutes'
                AND a.scheduled_datetime > NOW() + INTERVAL '23 hours 45 minutes'
                AND (a.reminder_24h_sent IS NULL OR a.reminder_24h_sent = false)
                
                UNION ALL
                
                SELECT DISTINCT
                    a.id as appointment_id,
                    a.patient_id,
                    a.provider_id,
                    a.scheduled_datetime,
                    a.appointment_type,
                    a.location,
                    a.notes,
                    a.status,
                    p.user_id as patient_user_id,
                    pu.user_type as patient_user_type,
                    hp.user_id as provider_user_id,
                    hu.user_type as provider_user_type,
                    cp.language as patient_language,
                    cp.state as patient_state,
                    cp.timezone as patient_timezone,
                    cp.prayer_time_notifications as patient_prayer_notifications,
                    cp.preferred_contact_start_hour as patient_contact_start,
                    cp.preferred_contact_end_hour as patient_contact_end,
                    cp.do_not_disturb_during_prayer as patient_prayer_dnd,
                    hcp.language as provider_language,
                    hcp.state as provider_state,
                    hcp.timezone as provider_timezone,
                    hp.name as provider_name,
                    '2_hour' as reminder_type
                FROM appointments a
                JOIN patients p ON a.patient_id = p.id
                JOIN users pu ON p.user_id = pu.id
                JOIN healthcare_providers hp ON a.provider_id = hp.id
                JOIN users hu ON hp.user_id = hu.id
                LEFT JOIN cultural_preferences cp ON pu.id = cp.user_id
                LEFT JOIN cultural_preferences hcp ON hu.id = hcp.user_id
                WHERE a.status IN ('scheduled', 'confirmed')
                AND a.scheduled_datetime > NOW()
                AND a.scheduled_datetime <= NOW() + INTERVAL '2 hours 15 minutes'
                AND a.scheduled_datetime > NOW() + INTERVAL '1 hour 45 minutes'
                AND (a.reminder_2h_sent IS NULL OR a.reminder_2h_sent = false)
            `);

            for (const reminder of dueReminders) {
                // Send reminder to patient
                const patientRecipient = {
                    userId: reminder.patient_user_id,
                    patientId: reminder.patient_id,
                    userType: reminder.patient_user_type,
                    channels: await this.getPatientNotificationChannels(reminder.patient_id),
                    culturalPreferences: {
                        language: reminder.patient_language || 'en',
                        state: reminder.patient_state || 'KUL',
                        timezone: reminder.patient_timezone || 'Asia/Kuala_Lumpur',
                        prayerTimeNotifications: reminder.patient_prayer_notifications || false,
                        halalMedicationOnly: false,
                        preferredContactTime: {
                            startHour: reminder.patient_contact_start || 8,
                            endHour: reminder.patient_contact_end || 22
                        },
                        doNotDisturbDuringPrayer: reminder.patient_prayer_dnd || false
                    }
                };

                const timeUntilAppointment = reminder.reminder_type === '24_hour' ? '24 hours' : '2 hours';
                const patientNotification = {
                    type: 'appointment_reminder' as const,
                    priority: reminder.reminder_type === '2_hour' ? 'high' as const : 'medium' as const,
                    recipient: patientRecipient,
                    title: this.getLocalizedTitle('appointment_reminder', patientRecipient.culturalPreferences.language),
                    message: this.generateAppointmentReminderMessage(reminder, timeUntilAppointment, 'patient', patientRecipient.culturalPreferences.language),
                    culturalContext: {
                        prayerTimeAware: patientRecipient.culturalPreferences.prayerTimeNotifications,
                        ramadanAware: true,
                        localizedContent: {
                            [patientRecipient.culturalPreferences.language]: this.generateAppointmentReminderMessage(
                                reminder, 
                                timeUntilAppointment, 
                                'patient',
                                patientRecipient.culturalPreferences.language
                            )
                        }
                    },
                    metadata: {
                        appointmentId: reminder.appointment_id,
                        providerId: reminder.provider_id,
                        providerName: reminder.provider_name,
                        scheduledDateTime: reminder.scheduled_datetime,
                        appointmentType: reminder.appointment_type,
                        location: reminder.location,
                        reminderType: reminder.reminder_type
                    }
                };

                await this.sendHealthcareNotification(patientNotification);

                // Send reminder to provider (only for 2-hour reminders)
                if (reminder.reminder_type === '2_hour') {
                    const providerRecipient = {
                        userId: reminder.provider_user_id,
                        providerId: reminder.provider_id,
                        userType: reminder.provider_user_type,
                        channels: await this.getProviderNotificationChannels(reminder.provider_id),
                        culturalPreferences: {
                            language: reminder.provider_language || 'en',
                            state: reminder.provider_state || 'KUL',
                            timezone: reminder.provider_timezone || 'Asia/Kuala_Lumpur',
                            prayerTimeNotifications: false,
                            halalMedicationOnly: false,
                            preferredContactTime: { startHour: 0, endHour: 24 },
                            doNotDisturbDuringPrayer: false
                        }
                    };

                    const providerNotification = {
                        type: 'provider_notification' as const,
                        priority: 'medium' as const,
                        recipient: providerRecipient,
                        title: this.getLocalizedTitle('appointment_reminder_provider', providerRecipient.culturalPreferences.language),
                        message: this.generateAppointmentReminderMessage(reminder, timeUntilAppointment, 'provider', providerRecipient.culturalPreferences.language),
                        culturalContext: {
                            prayerTimeAware: false,
                            ramadanAware: false,
                            localizedContent: {
                                [providerRecipient.culturalPreferences.language]: this.generateAppointmentReminderMessage(
                                    reminder, 
                                    timeUntilAppointment, 
                                    'provider',
                                    providerRecipient.culturalPreferences.language
                                )
                            }
                        },
                        metadata: {
                            appointmentId: reminder.appointment_id,
                            patientId: reminder.patient_id,
                            scheduledDateTime: reminder.scheduled_datetime,
                            appointmentType: reminder.appointment_type,
                            location: reminder.location,
                            reminderType: reminder.reminder_type
                        }
                    };

                    await this.sendHealthcareNotification(providerNotification);
                }

                // Update reminder status
                const reminderField = reminder.reminder_type === '24_hour' ? 'reminder_24h_sent' : 'reminder_2h_sent';
                await db.none(`
                    UPDATE appointments 
                    SET ${reminderField} = true, updated_at = NOW()
                    WHERE id = $1
                `, [reminder.appointment_id]);
            }

            if (dueReminders.length > 0) {
                console.log(`✅ Processed ${dueReminders.length} appointment reminders`);
            }
        } catch (error) {
            console.error('❌ Failed to process appointment reminders:', error);
        }
    }

    private async processPrayerTimeReminders(): Promise<void> {
        // Implementation for prayer time reminder processing
        console.log('Processing prayer time reminders...');
    }

    private async cleanupExpiredNotifications(): Promise<void> {
        // Implementation for cleaning up expired notifications
        console.log('Cleaning up expired notifications...');
    }

    private generateMedicationReminderMessage(reminder: any, language: string): string {
        const messages: Record<string, string> = {
            'ms': `Masa untuk mengambil ubat ${reminder.medication_name}. Dos: ${reminder.dosage}. ${reminder.instructions || ''}`,
            'en': `Time to take your ${reminder.medication_name} medication. Dosage: ${reminder.dosage}. ${reminder.instructions || ''}`,
            'zh': `该服用您的${reminder.medication_name}药物了。剂量：${reminder.dosage}。${reminder.instructions || ''}`,
            'ta': `உங்கள் ${reminder.medication_name} மருந்தை எடுக்கும் நேரம். அளவு: ${reminder.dosage}। ${reminder.instructions || ''}`
        };
        return messages[language] || messages['en'];
    }

    private generateAppointmentReminderMessage(reminder: any, timeUntil: string, recipientType: 'patient' | 'provider', language: string): string {
        const appointmentTime = new Date(reminder.scheduled_datetime).toLocaleString('en-US', {
            timeZone: 'Asia/Kuala_Lumpur',
            dateStyle: 'medium',
            timeStyle: 'short'
        });

        if (recipientType === 'patient') {
            const messages: Record<string, string> = {
                'ms': `Peringatan: Anda ada temujanji dengan Dr. ${reminder.provider_name} dalam ${timeUntil} pada ${appointmentTime}. Lokasi: ${reminder.location || 'TBA'}`,
                'en': `Reminder: You have an appointment with Dr. ${reminder.provider_name} in ${timeUntil} at ${appointmentTime}. Location: ${reminder.location || 'TBA'}`,
                'zh': `提醒：您与${reminder.provider_name}医生的预约将在${timeUntil}后（${appointmentTime}）进行。地点：${reminder.location || '待定'}`,
                'ta': `நினைவூட்டல்: ${timeUntil} இல் ${appointmentTime} அன்று டாக்டர் ${reminder.provider_name} உடன் உங்களுக்கு சந்திப்பு உள்ளது। இடம்: ${reminder.location || 'TBA'}`
            };
            return messages[language] || messages['en'];
        } else {
            const messages: Record<string, string> = {
                'ms': `Peringatan: Anda ada temujanji dengan pesakit dalam ${timeUntil} pada ${appointmentTime}. Lokasi: ${reminder.location || 'TBA'}`,
                'en': `Reminder: You have an appointment with a patient in ${timeUntil} at ${appointmentTime}. Location: ${reminder.location || 'TBA'}`,
                'zh': `提醒：您与患者的预约将在${timeUntil}后（${appointmentTime}）进行。地点：${reminder.location || '待定'}`,
                'ta': `நினைவூட்டல்: ${timeUntil} இல் ${appointmentTime} அன்று நோயாளியுடன் உங்களுக்கு சந்திப்பு உள்ளது। இடம்: ${reminder.location || 'TBA'}`
            };
            return messages[language] || messages['en'];
        }
    }

    private async getPatientNotificationChannels(patientId: string): Promise<any[]> {
        try {
            const db = this.databaseService.getConnection();
            const channels = await db.manyOrNone(`
                SELECT channel_type, enabled, config 
                FROM patient_notification_channels 
                WHERE patient_id = $1 AND enabled = true
            `, [patientId]);

            return channels.map(ch => ({
                type: ch.channel_type,
                enabled: ch.enabled,
                config: ch.config ? JSON.parse(ch.config) : {}
            }));
        } catch (error) {
            // Default channels if database lookup fails
            return [
                { type: 'websocket', enabled: true },
                { type: 'email', enabled: true, config: {} }
            ];
        }
    }

    private async getProviderNotificationChannels(providerId: string): Promise<any[]> {
        try {
            const db = this.databaseService.getConnection();
            const channels = await db.manyOrNone(`
                SELECT channel_type, enabled, config 
                FROM provider_notification_channels 
                WHERE provider_id = $1 AND enabled = true
            `, [providerId]);

            return channels.map(ch => ({
                type: ch.channel_type,
                enabled: ch.enabled,
                config: ch.config ? JSON.parse(ch.config) : {}
            }));
        } catch (error) {
            // Default channels if database lookup fails
            return [
                { type: 'websocket', enabled: true },
                { type: 'email', enabled: true, config: {} }
            ];
        }
    }

    // Utility methods continue...
    private async storeNotification(notification: HealthcareNotification): Promise<void> {
        try {
            const db = this.databaseService.getConnection();
            await db.none(`
                INSERT INTO notification_logs (
                    id, type, priority, recipient_user_id, recipient_type,
                    title, message, cultural_context, scheduled_for, expires_at,
                    delivery_status, metadata, created_at, updated_at
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
                )
            `, [
                notification.id,
                notification.type,
                notification.priority,
                notification.recipient.userId,
                notification.recipient.userType,
                notification.title,
                notification.message,
                JSON.stringify(notification.culturalContext || {}),
                notification.scheduledFor,
                notification.expiresAt,
                JSON.stringify(notification.deliveryStatus),
                JSON.stringify(notification.metadata || {}),
                notification.createdAt,
                notification.updatedAt
            ]);
        } catch (error) {
            console.error('Failed to store notification in database:', error);
        }
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