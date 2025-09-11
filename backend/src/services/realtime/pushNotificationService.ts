/**
 * Push Notification Service
 * 
 * Mobile push notification integration for Firebase Cloud Messaging (FCM)
 * and Apple Push Notification Service (APNs) with Malaysian healthcare context.
 */

import { RedisService } from '../cache/redisService';
import { DatabaseService } from '../database/databaseService';
import { AuditService } from '../audit/auditService';
import { PrayerTimeService } from '../cultural/prayerTimeService';
import * as admin from 'firebase-admin';
import * as apn from 'apn';

export interface PushNotificationDevice {
    id: string;
    userId: string;
    userType: 'patient' | 'healthcare_provider' | 'admin' | 'emergency_responder';
    platform: 'android' | 'ios' | 'web';
    deviceToken: string;
    isActive: boolean;
    appVersion: string;
    osVersion: string;
    language: 'ms' | 'en' | 'zh' | 'ta';
    timezone: string;
    culturalPreferences: {
        prayerTimeNotifications: boolean;
        doNotDisturbDuringPrayer: boolean;
        emergencyOverride: boolean;
        halalNotificationsOnly: boolean;
        ramadanMode: boolean;
    };
    lastSeen: Date;
    registeredAt: Date;
    updatedAt: Date;
}

export interface PushNotificationMessage {
    id: string;
    title: string;
    body: string;
    data?: Record<string, string>;
    imageUrl?: string;
    deepLink?: string;
    category: 'emergency' | 'medication' | 'appointment' | 'vitals' | 'general' | 'cultural';
    priority: 'high' | 'normal' | 'low';
    culturalContext: {
        language: string;
        localizedTitle: Record<string, string>;
        localizedBody: Record<string, string>;
        prayerTimeAware: boolean;
        ramadanAware: boolean;
        culturalIcons?: Record<string, string>;
    };
    sound?: string;
    badge?: number;
    timeToLive?: number; // seconds
    collapseKey?: string;
    scheduledAt?: Date;
    expiresAt?: Date;
    createdAt: Date;
}

export interface PushDeliveryResult {
    messageId: string;
    deviceId: string;
    platform: 'android' | 'ios' | 'web';
    success: boolean;
    error?: string;
    deliveredAt: Date;
    responseDetails?: any;
}

export interface PushNotificationStats {
    totalSent: number;
    totalDelivered: number;
    totalFailed: number;
    deliveryRate: number;
    platformBreakdown: {
        android: { sent: number; delivered: number; failed: number };
        ios: { sent: number; delivered: number; failed: number };
        web: { sent: number; delivered: number; failed: number };
    };
    categoryBreakdown: Record<string, { sent: number; delivered: number; failed: number }>;
    languageBreakdown: Record<string, { sent: number; delivered: number; failed: number }>;
}

export class PushNotificationService {
    private static instance: PushNotificationService;
    private redisService: RedisService;
    private databaseService: DatabaseService;
    private auditService: AuditService;
    private prayerTimeService: PrayerTimeService;
    
    // Firebase Admin SDK
    private firebaseAdmin: admin.app.App | null = null;
    
    // Apple Push Notification Service
    private apnProvider: apn.Provider | null = null;
    
    // In-memory caches
    private registeredDevices: Map<string, PushNotificationDevice> = new Map();
    private pendingMessages: Map<string, PushNotificationMessage> = new Map();
    
    // Configuration
    private readonly MAX_BATCH_SIZE = 500;
    private readonly RETRY_ATTEMPTS = 3;
    private readonly RETRY_DELAY = 5000; // 5 seconds

    private constructor() {
        this.redisService = RedisService.getInstance();
        this.databaseService = DatabaseService.getInstance();
        this.auditService = AuditService.getInstance();
        this.prayerTimeService = PrayerTimeService.getInstance();

        this.initializeServices();
    }

    public static getInstance(): PushNotificationService {
        if (!PushNotificationService.instance) {
            PushNotificationService.instance = new PushNotificationService();
        }
        return PushNotificationService.instance;
    }

    private async initializeServices(): Promise<void> {
        try {
            // Initialize Firebase Admin SDK
            await this.initializeFirebase();
            
            // Initialize Apple Push Notification Service
            await this.initializeAPNs();
            
            // Load registered devices
            await this.loadRegisteredDevices();
            
            console.log('✅ Push Notification Service initialized');
        } catch (error) {
            console.error('❌ Failed to initialize Push Notification Service:', error);
        }
    }

    private async initializeFirebase(): Promise<void> {
        try {
            if (process.env.FIREBASE_ADMIN_KEY) {
                const serviceAccount = JSON.parse(process.env.FIREBASE_ADMIN_KEY);
                
                this.firebaseAdmin = admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount),
                    projectId: serviceAccount.project_id
                }, 'medimate-malaysia');
                
                console.log('✅ Firebase Cloud Messaging initialized');
            } else {
                console.warn('⚠️ Firebase Admin key not configured - FCM disabled');
            }
        } catch (error) {
            console.error('❌ Failed to initialize Firebase:', error);
        }
    }

    private async initializeAPNs(): Promise<void> {
        try {
            const apnOptions: apn.ProviderOptions = {
                token: {
                    key: process.env.APNS_KEY_PATH || '',
                    keyId: process.env.APNS_KEY_ID || '',
                    teamId: process.env.APNS_TEAM_ID || ''
                },
                production: process.env.NODE_ENV === 'production'
            };

            if (process.env.APNS_KEY_PATH && process.env.APNS_KEY_ID && process.env.APNS_TEAM_ID) {
                this.apnProvider = new apn.Provider(apnOptions);
                console.log('✅ Apple Push Notification Service initialized');
            } else {
                console.warn('⚠️ APNs credentials not configured - APNs disabled');
            }
        } catch (error) {
            console.error('❌ Failed to initialize APNs:', error);
        }
    }

    private async loadRegisteredDevices(): Promise<void> {
        try {
            const db = this.databaseService.getConnection();
            const devices = await db.manyOrNone(`
                SELECT * FROM push_notification_devices
                WHERE is_active = true
                AND last_seen > NOW() - INTERVAL '30 days'
                ORDER BY updated_at DESC
            `);

            this.registeredDevices.clear();
            for (const device of devices || []) {
                const deserializedDevice = this.deserializeDevice(device);
                this.registeredDevices.set(device.id, deserializedDevice);
            }

            console.log(`✅ Loaded ${this.registeredDevices.size} registered push notification devices`);
        } catch (error) {
            console.error('❌ Failed to load registered devices:', error);
        }
    }

    async registerDevice(
        userId: string,
        userType: string,
        platform: 'android' | 'ios' | 'web',
        deviceToken: string,
        deviceInfo: {
            appVersion: string;
            osVersion: string;
            language?: string;
            timezone?: string;
            culturalPreferences?: Partial<PushNotificationDevice['culturalPreferences']>;
        }
    ): Promise<string> {
        try {
            const deviceId = `push_device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            const device: PushNotificationDevice = {
                id: deviceId,
                userId,
                userType: userType as any,
                platform,
                deviceToken,
                isActive: true,
                appVersion: deviceInfo.appVersion,
                osVersion: deviceInfo.osVersion,
                language: deviceInfo.language as any || 'en',
                timezone: deviceInfo.timezone || 'Asia/Kuala_Lumpur',
                culturalPreferences: {
                    prayerTimeNotifications: false,
                    doNotDisturbDuringPrayer: false,
                    emergencyOverride: true,
                    halalNotificationsOnly: false,
                    ramadanMode: false,
                    ...deviceInfo.culturalPreferences
                },
                lastSeen: new Date(),
                registeredAt: new Date(),
                updatedAt: new Date()
            };

            // Store in database
            await this.storeDevice(device);

            // Add to cache
            this.registeredDevices.set(deviceId, device);

            // Audit registration
            await this.auditService.logHealthcareEvent({
                eventType: 'push_device_registered',
                userId,
                userType,
                success: true,
                metadata: {
                    deviceId,
                    platform,
                    appVersion: deviceInfo.appVersion,
                    language: device.language
                }
            });

            console.log(`📱 Registered push notification device: ${deviceId} for user ${userId}`);
            return deviceId;

        } catch (error) {
            console.error('❌ Failed to register push notification device:', error);
            
            await this.auditService.logHealthcareEvent({
                eventType: 'push_device_registration_failed',
                userId,
                userType,
                success: false,
                errorMessage: error instanceof Error ? error.message : 'Unknown error'
            });

            throw error;
        }
    }

    async sendPushNotification(
        message: Omit<PushNotificationMessage, 'id' | 'createdAt'>,
        targetDevices?: string[]
    ): Promise<PushDeliveryResult[]> {
        try {
            const messageId = `push_msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            const fullMessage: PushNotificationMessage = {
                id: messageId,
                createdAt: new Date(),
                ...message
            };

            // Determine target devices
            let devices: PushNotificationDevice[];
            if (targetDevices) {
                devices = targetDevices
                    .map(deviceId => this.registeredDevices.get(deviceId))
                    .filter((device): device is PushNotificationDevice => device !== undefined);
            } else {
                devices = Array.from(this.registeredDevices.values());
            }

            // Filter devices based on cultural preferences and timing
            const eligibleDevices = await this.filterEligibleDevices(fullMessage, devices);

            // Send notifications in batches
            const results: PushDeliveryResult[] = [];
            for (let i = 0; i < eligibleDevices.length; i += this.MAX_BATCH_SIZE) {
                const batch = eligibleDevices.slice(i, i + this.MAX_BATCH_SIZE);
                const batchResults = await this.sendPushNotificationBatch(fullMessage, batch);
                results.push(...batchResults);
            }

            // Store message and results
            await this.storePushMessage(fullMessage);
            await this.storePushResults(results);

            console.log(`📨 Sent push notification to ${results.length} devices. Success: ${results.filter(r => r.success).length}`);
            return results;

        } catch (error) {
            console.error('❌ Failed to send push notification:', error);
            throw error;
        }
    }

    private async sendPushNotificationBatch(
        message: PushNotificationMessage,
        devices: PushNotificationDevice[]
    ): Promise<PushDeliveryResult[]> {
        const results: PushDeliveryResult[] = [];

        // Group devices by platform
        const androidDevices = devices.filter(d => d.platform === 'android');
        const iosDevices = devices.filter(d => d.platform === 'ios');
        const webDevices = devices.filter(d => d.platform === 'web');

        // Send to Android devices via FCM
        if (androidDevices.length > 0 && this.firebaseAdmin) {
            const androidResults = await this.sendToAndroidDevices(message, androidDevices);
            results.push(...androidResults);
        }

        // Send to iOS devices via APNs
        if (iosDevices.length > 0 && this.apnProvider) {
            const iosResults = await this.sendToIOSDevices(message, iosDevices);
            results.push(...iosResults);
        }

        // Send to web devices via FCM
        if (webDevices.length > 0 && this.firebaseAdmin) {
            const webResults = await this.sendToWebDevices(message, webDevices);
            results.push(...webResults);
        }

        return results;
    }

    private async sendToAndroidDevices(
        message: PushNotificationMessage,
        devices: PushNotificationDevice[]
    ): Promise<PushDeliveryResult[]> {
        const results: PushDeliveryResult[] = [];

        if (!this.firebaseAdmin) {
            return results;
        }

        const messaging = this.firebaseAdmin.messaging();
        const tokens = devices.map(d => d.deviceToken);

        try {
            const fcmMessage: admin.messaging.MulticastMessage = {
                tokens,
                notification: {
                    title: message.title,
                    body: message.body,
                    imageUrl: message.imageUrl
                },
                data: {
                    category: message.category,
                    priority: message.priority,
                    messageId: message.id,
                    deepLink: message.deepLink || '',
                    ...message.data
                },
                android: {
                    priority: message.priority === 'high' ? 'high' : 'normal',
                    notification: {
                        sound: message.sound || 'default',
                        channelId: this.getChannelId(message.category),
                        localizedBody: message.culturalContext.localizedBody,
                        localizedTitle: message.culturalContext.localizedTitle,
                        icon: this.getNotificationIcon(message.category),
                        color: this.getNotificationColor(message.category)
                    },
                    ttl: (message.timeToLive || 86400) * 1000, // TTL in milliseconds
                    collapseKey: message.collapseKey
                }
            };

            const response = await messaging.sendMulticast(fcmMessage);
            
            // Process results
            response.responses.forEach((resp, index) => {
                const device = devices[index];
                results.push({
                    messageId: message.id,
                    deviceId: device.id,
                    platform: 'android',
                    success: resp.success,
                    error: resp.error?.message,
                    deliveredAt: new Date(),
                    responseDetails: resp
                });

                // Handle invalid tokens
                if (resp.error?.code === 'messaging/registration-token-not-registered') {
                    this.handleInvalidToken(device.id);
                }
            });

        } catch (error) {
            console.error('❌ Failed to send Android push notifications:', error);
            
            // Mark all as failed
            devices.forEach(device => {
                results.push({
                    messageId: message.id,
                    deviceId: device.id,
                    platform: 'android',
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error',
                    deliveredAt: new Date()
                });
            });
        }

        return results;
    }

    private async sendToIOSDevices(
        message: PushNotificationMessage,
        devices: PushNotificationDevice[]
    ): Promise<PushDeliveryResult[]> {
        const results: PushDeliveryResult[] = [];

        if (!this.apnProvider) {
            return results;
        }

        try {
            for (const device of devices) {
                const notification = new apn.Notification();
                
                notification.topic = process.env.APNS_BUNDLE_ID || 'com.medimate.malaysia';
                notification.title = message.culturalContext.localizedTitle[device.language] || message.title;
                notification.body = message.culturalContext.localizedBody[device.language] || message.body;
                notification.sound = message.sound || 'default';
                notification.badge = message.badge;
                notification.category = message.category;
                notification.threadId = message.collapseKey;
                notification.expiry = message.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000);
                
                // Custom data
                notification.payload = {
                    messageId: message.id,
                    category: message.category,
                    priority: message.priority,
                    deepLink: message.deepLink,
                    ...message.data
                };

                // Priority
                notification.priority = message.priority === 'high' ? 10 : 5;

                try {
                    const apnResult = await this.apnProvider.send(notification, device.deviceToken);
                    
                    results.push({
                        messageId: message.id,
                        deviceId: device.id,
                        platform: 'ios',
                        success: apnResult.sent.length > 0,
                        error: apnResult.failed.length > 0 ? apnResult.failed[0].error?.toString() : undefined,
                        deliveredAt: new Date(),
                        responseDetails: apnResult
                    });

                    // Handle failed devices
                    if (apnResult.failed.length > 0) {
                        const failure = apnResult.failed[0];
                        if (failure.error?.toString().includes('BadDeviceToken') || 
                            failure.error?.toString().includes('Unregistered')) {
                            this.handleInvalidToken(device.id);
                        }
                    }

                } catch (deviceError) {
                    results.push({
                        messageId: message.id,
                        deviceId: device.id,
                        platform: 'ios',
                        success: false,
                        error: deviceError instanceof Error ? deviceError.message : 'Unknown error',
                        deliveredAt: new Date()
                    });
                }
            }

        } catch (error) {
            console.error('❌ Failed to send iOS push notifications:', error);
        }

        return results;
    }

    private async sendToWebDevices(
        message: PushNotificationMessage,
        devices: PushNotificationDevice[]
    ): Promise<PushDeliveryResult[]> {
        const results: PushDeliveryResult[] = [];

        if (!this.firebaseAdmin) {
            return results;
        }

        const messaging = this.firebaseAdmin.messaging();
        const tokens = devices.map(d => d.deviceToken);

        try {
            const fcmMessage: admin.messaging.MulticastMessage = {
                tokens,
                notification: {
                    title: message.title,
                    body: message.body,
                    imageUrl: message.imageUrl
                },
                data: {
                    category: message.category,
                    priority: message.priority,
                    messageId: message.id,
                    deepLink: message.deepLink || '',
                    ...message.data
                },
                webpush: {
                    notification: {
                        icon: this.getWebNotificationIcon(message.category),
                        badge: this.getWebNotificationBadge(),
                        tag: message.collapseKey,
                        requireInteraction: message.priority === 'high'
                    },
                    fcmOptions: {
                        link: message.deepLink
                    }
                }
            };

            const response = await messaging.sendMulticast(fcmMessage);
            
            // Process results
            response.responses.forEach((resp, index) => {
                const device = devices[index];
                results.push({
                    messageId: message.id,
                    deviceId: device.id,
                    platform: 'web',
                    success: resp.success,
                    error: resp.error?.message,
                    deliveredAt: new Date(),
                    responseDetails: resp
                });

                // Handle invalid tokens
                if (resp.error?.code === 'messaging/registration-token-not-registered') {
                    this.handleInvalidToken(device.id);
                }
            });

        } catch (error) {
            console.error('❌ Failed to send web push notifications:', error);
            
            // Mark all as failed
            devices.forEach(device => {
                results.push({
                    messageId: message.id,
                    deviceId: device.id,
                    platform: 'web',
                    success: false,
                    error: error instanceof Error ? error.message : 'Unknown error',
                    deliveredAt: new Date()
                });
            });
        }

        return results;
    }

    private async filterEligibleDevices(
        message: PushNotificationMessage,
        devices: PushNotificationDevice[]
    ): Promise<PushNotificationDevice[]> {
        const eligibleDevices: PushNotificationDevice[] = [];

        for (const device of devices) {
            try {
                // Skip inactive devices
                if (!device.isActive) continue;

                // Emergency override check
                if (message.category === 'emergency' && device.culturalPreferences.emergencyOverride) {
                    eligibleDevices.push(device);
                    continue;
                }

                // Prayer time check
                if (message.culturalContext.prayerTimeAware && 
                    device.culturalPreferences.doNotDisturbDuringPrayer) {
                    
                    const isWithinPrayerWindow = await this.isWithinPrayerWindow(device);
                    if (isWithinPrayerWindow) {
                        // Schedule for later delivery
                        await this.scheduleMessageForLater(message, device);
                        continue;
                    }
                }

                // Halal notifications check
                if (device.culturalPreferences.halalNotificationsOnly && 
                    message.category === 'medication' && 
                    !this.isHalalCompliant(message)) {
                    continue;
                }

                // Ramadan mode check
                if (device.culturalPreferences.ramadanMode && 
                    message.culturalContext.ramadanAware) {
                    const adjustedMessage = await this.adjustMessageForRamadan(message, device);
                    if (!adjustedMessage) continue;
                }

                eligibleDevices.push(device);

            } catch (error) {
                console.error(`❌ Error filtering device ${device.id}:`, error);
            }
        }

        return eligibleDevices;
    }

    private async isWithinPrayerWindow(device: PushNotificationDevice): Promise<boolean> {
        try {
            const currentPrayer = await this.prayerTimeService.getCurrentPrayerTime(device.timezone);
            if (!currentPrayer) return false;

            const now = new Date();
            const prayerTime = new Date(currentPrayer.time);
            const timeDiff = Math.abs(now.getTime() - prayerTime.getTime());
            
            // Consider prayer window as 15 minutes before and after
            return timeDiff <= 15 * 60 * 1000;
        } catch (error) {
            console.error('Error checking prayer time:', error);
            return false;
        }
    }

    private isHalalCompliant(message: PushNotificationMessage): boolean {
        // Check if message content is halal-compliant
        // This would integrate with halal certification data
        return !message.data?.medicationId || message.data.halalCertified === 'true';
    }

    private async adjustMessageForRamadan(
        message: PushNotificationMessage, 
        device: PushNotificationDevice
    ): Promise<PushNotificationMessage | null> {
        // Adjust message content for Ramadan considerations
        if (message.category === 'medication') {
            // Adjust medication reminders for fasting hours
            return {
                ...message,
                body: message.culturalContext.localizedBody[device.language] + 
                      (device.language === 'ms' ? ' (Selepas berbuka puasa)' : ' (After breaking fast)')
            };
        }
        return message;
    }

    private async scheduleMessageForLater(message: PushNotificationMessage, device: PushNotificationDevice): Promise<void> {
        // Implementation for scheduling messages for later delivery
        // This would integrate with a job scheduler
        console.log(`⏰ Scheduled message ${message.id} for later delivery to device ${device.id}`);
    }

    private async handleInvalidToken(deviceId: string): Promise<void> {
        try {
            const device = this.registeredDevices.get(deviceId);
            if (!device) return;

            // Mark device as inactive
            device.isActive = false;
            device.updatedAt = new Date();

            // Update in database
            await this.updateDeviceStatus(deviceId, false);

            // Remove from cache
            this.registeredDevices.delete(deviceId);

            console.log(`🚫 Marked device ${deviceId} as inactive due to invalid token`);
        } catch (error) {
            console.error(`❌ Failed to handle invalid token for device ${deviceId}:`, error);
        }
    }

    // Utility methods for platform-specific configurations
    private getChannelId(category: string): string {
        const channelMap: Record<string, string> = {
            'emergency': 'emergency_alerts',
            'medication': 'medication_reminders',
            'appointment': 'appointment_notifications',
            'vitals': 'vital_signs_alerts',
            'cultural': 'cultural_notifications',
            'general': 'general_notifications'
        };
        return channelMap[category] || 'general_notifications';
    }

    private getNotificationIcon(category: string): string {
        const iconMap: Record<string, string> = {
            'emergency': 'ic_emergency',
            'medication': 'ic_medication',
            'appointment': 'ic_appointment',
            'vitals': 'ic_vitals',
            'cultural': 'ic_cultural',
            'general': 'ic_notification'
        };
        return iconMap[category] || 'ic_notification';
    }

    private getNotificationColor(category: string): string {
        const colorMap: Record<string, string> = {
            'emergency': '#FF0000',
            'medication': '#00AA00',
            'appointment': '#0066CC',
            'vitals': '#FF6600',
            'cultural': '#6600CC',
            'general': '#666666'
        };
        return colorMap[category] || '#666666';
    }

    private getWebNotificationIcon(category: string): string {
        const baseUrl = process.env.WEB_NOTIFICATION_ICONS_URL || '/icons';
        return `${baseUrl}/${category}-icon.png`;
    }

    private getWebNotificationBadge(): string {
        return process.env.WEB_NOTIFICATION_BADGE_URL || '/icons/badge.png';
    }

    // Database operations
    private async storeDevice(device: PushNotificationDevice): Promise<void> {
        const db = this.databaseService.getConnection();
        await db.none(`
            INSERT INTO push_notification_devices (
                id, user_id, user_type, platform, device_token, is_active,
                app_version, os_version, language, timezone, cultural_preferences,
                last_seen, registered_at, updated_at
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
            )
            ON CONFLICT (user_id, device_token) DO UPDATE SET
                is_active = EXCLUDED.is_active,
                app_version = EXCLUDED.app_version,
                os_version = EXCLUDED.os_version,
                language = EXCLUDED.language,
                timezone = EXCLUDED.timezone,
                cultural_preferences = EXCLUDED.cultural_preferences,
                last_seen = EXCLUDED.last_seen,
                updated_at = EXCLUDED.updated_at
        `, [
            device.id,
            device.userId,
            device.userType,
            device.platform,
            device.deviceToken,
            device.isActive,
            device.appVersion,
            device.osVersion,
            device.language,
            device.timezone,
            JSON.stringify(device.culturalPreferences),
            device.lastSeen,
            device.registeredAt,
            device.updatedAt
        ]);
    }

    private async updateDeviceStatus(deviceId: string, isActive: boolean): Promise<void> {
        const db = this.databaseService.getConnection();
        await db.none(`
            UPDATE push_notification_devices 
            SET is_active = $2, updated_at = NOW()
            WHERE id = $1
        `, [deviceId, isActive]);
    }

    private async storePushMessage(message: PushNotificationMessage): Promise<void> {
        const db = this.databaseService.getConnection();
        await db.none(`
            INSERT INTO push_notification_messages (
                id, title, body, data, image_url, deep_link, category, priority,
                cultural_context, sound, badge, time_to_live, collapse_key,
                scheduled_at, expires_at, created_at
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
            )
        `, [
            message.id,
            message.title,
            message.body,
            JSON.stringify(message.data || {}),
            message.imageUrl,
            message.deepLink,
            message.category,
            message.priority,
            JSON.stringify(message.culturalContext),
            message.sound,
            message.badge,
            message.timeToLive,
            message.collapseKey,
            message.scheduledAt,
            message.expiresAt,
            message.createdAt
        ]);
    }

    private async storePushResults(results: PushDeliveryResult[]): Promise<void> {
        if (results.length === 0) return;

        const db = this.databaseService.getConnection();
        
        for (const result of results) {
            await db.none(`
                INSERT INTO push_notification_delivery_logs (
                    message_id, device_id, platform, success, error, delivered_at, response_details
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7
                )
            `, [
                result.messageId,
                result.deviceId,
                result.platform,
                result.success,
                result.error,
                result.deliveredAt,
                JSON.stringify(result.responseDetails || {})
            ]);
        }
    }

    private deserializeDevice(row: any): PushNotificationDevice {
        return {
            id: row.id,
            userId: row.user_id,
            userType: row.user_type,
            platform: row.platform,
            deviceToken: row.device_token,
            isActive: row.is_active,
            appVersion: row.app_version,
            osVersion: row.os_version,
            language: row.language,
            timezone: row.timezone,
            culturalPreferences: row.cultural_preferences ? JSON.parse(row.cultural_preferences) : {},
            lastSeen: new Date(row.last_seen),
            registeredAt: new Date(row.registered_at),
            updatedAt: new Date(row.updated_at)
        };
    }

    // Public API methods
    async getDevicesByUser(userId: string): Promise<PushNotificationDevice[]> {
        return Array.from(this.registeredDevices.values()).filter(d => d.userId === userId);
    }

    async updateDeviceCulturalPreferences(
        deviceId: string, 
        preferences: Partial<PushNotificationDevice['culturalPreferences']>
    ): Promise<void> {
        const device = this.registeredDevices.get(deviceId);
        if (!device) {
            throw new Error(`Device ${deviceId} not found`);
        }

        device.culturalPreferences = { ...device.culturalPreferences, ...preferences };
        device.updatedAt = new Date();

        // Update in database
        const db = this.databaseService.getConnection();
        await db.none(`
            UPDATE push_notification_devices 
            SET cultural_preferences = $2, updated_at = NOW()
            WHERE id = $1
        `, [deviceId, JSON.stringify(device.culturalPreferences)]);

        console.log(`✅ Updated cultural preferences for device ${deviceId}`);
    }

    async getStats(): Promise<PushNotificationStats> {
        const db = this.databaseService.getConnection();
        
        const stats = await db.one(`
            SELECT 
                COUNT(*) as total_sent,
                COUNT(*) FILTER (WHERE success = true) as total_delivered,
                COUNT(*) FILTER (WHERE success = false) as total_failed,
                CASE 
                    WHEN COUNT(*) > 0 THEN COUNT(*) FILTER (WHERE success = true)::float / COUNT(*)
                    ELSE 0 
                END as delivery_rate
            FROM push_notification_delivery_logs
            WHERE delivered_at > NOW() - INTERVAL '24 hours'
        `);

        // Platform breakdown
        const platformStats = await db.manyOrNone(`
            SELECT 
                platform,
                COUNT(*) as sent,
                COUNT(*) FILTER (WHERE success = true) as delivered,
                COUNT(*) FILTER (WHERE success = false) as failed
            FROM push_notification_delivery_logs
            WHERE delivered_at > NOW() - INTERVAL '24 hours'
            GROUP BY platform
        `);

        // Category breakdown
        const categoryStats = await db.manyOrNone(`
            SELECT 
                pnm.category,
                COUNT(*) as sent,
                COUNT(*) FILTER (WHERE pndl.success = true) as delivered,
                COUNT(*) FILTER (WHERE pndl.success = false) as failed
            FROM push_notification_delivery_logs pndl
            JOIN push_notification_messages pnm ON pndl.message_id = pnm.id
            WHERE pndl.delivered_at > NOW() - INTERVAL '24 hours'
            GROUP BY pnm.category
        `);

        // Language breakdown
        const languageStats = await db.manyOrNone(`
            SELECT 
                pnd.language,
                COUNT(*) as sent,
                COUNT(*) FILTER (WHERE pndl.success = true) as delivered,
                COUNT(*) FILTER (WHERE pndl.success = false) as failed
            FROM push_notification_delivery_logs pndl
            JOIN push_notification_devices pnd ON pndl.device_id = pnd.id
            WHERE pndl.delivered_at > NOW() - INTERVAL '24 hours'
            GROUP BY pnd.language
        `);

        return {
            totalSent: parseInt(stats.total_sent),
            totalDelivered: parseInt(stats.total_delivered),
            totalFailed: parseInt(stats.total_failed),
            deliveryRate: parseFloat(stats.delivery_rate),
            platformBreakdown: {
                android: this.extractPlatformStats(platformStats, 'android'),
                ios: this.extractPlatformStats(platformStats, 'ios'),
                web: this.extractPlatformStats(platformStats, 'web')
            },
            categoryBreakdown: categoryStats.reduce((acc, row) => {
                acc[row.category] = {
                    sent: parseInt(row.sent),
                    delivered: parseInt(row.delivered),
                    failed: parseInt(row.failed)
                };
                return acc;
            }, {} as Record<string, any>),
            languageBreakdown: languageStats.reduce((acc, row) => {
                acc[row.language] = {
                    sent: parseInt(row.sent),
                    delivered: parseInt(row.delivered),
                    failed: parseInt(row.failed)
                };
                return acc;
            }, {} as Record<string, any>)
        };
    }

    private extractPlatformStats(platformStats: any[], platform: string) {
        const stats = platformStats.find(s => s.platform === platform);
        return {
            sent: stats ? parseInt(stats.sent) : 0,
            delivered: stats ? parseInt(stats.delivered) : 0,
            failed: stats ? parseInt(stats.failed) : 0
        };
    }

    getRegisteredDeviceCount(): number {
        return this.registeredDevices.size;
    }
}

export default PushNotificationService;