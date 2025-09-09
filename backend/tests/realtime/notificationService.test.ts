/**
 * Notification Service Tests
 * 
 * Tests for healthcare notification delivery with cultural context,
 * multi-channel support, and Malaysian healthcare compliance.
 */

import { NotificationService } from '../../src/services/realtime/notificationService';
import { RedisService } from '../../src/services/cache/redisService';
import { AuditService } from '../../src/services/audit/auditService';
import { DatabaseService } from '../../src/services/database/databaseService';

// Mock external services
jest.mock('twilio');
jest.mock('nodemailer');

describe('Notification Service', () => {
    let notificationService: NotificationService;
    let redisService: RedisService;
    let mockTwilioClient: any;
    let mockEmailTransporter: any;

    // Test notification recipient
    const testRecipient = {
        userId: 'user-123',
        patientId: 'patient-123',
        userType: 'patient' as const,
        channels: [
            {
                type: 'websocket' as const,
                enabled: true
            },
            {
                type: 'sms' as const,
                enabled: true,
                config: { phoneNumber: '+60123456789' }
            },
            {
                type: 'email' as const,
                enabled: true,
                config: { email: 'test@example.com' }
            }
        ],
        culturalPreferences: {
            language: 'ms' as const,
            state: 'KUL',
            timezone: 'Asia/Kuala_Lumpur',
            prayerTimeNotifications: true,
            halalMedicationOnly: true,
            preferredContactTime: {
                startHour: 8,
                endHour: 22
            },
            doNotDisturbDuringPrayer: true
        }
    };

    beforeAll(async () => {
        // Setup mock services
        process.env.TWILIO_ACCOUNT_SID = 'test_sid';
        process.env.TWILIO_AUTH_TOKEN = 'test_token';
        process.env.TWILIO_PHONE_NUMBER = '+1234567890';
        process.env.EMAIL_SERVICE = 'gmail';
        process.env.EMAIL_USER = 'test@example.com';
        process.env.EMAIL_PASSWORD = 'test_password';

        // Mock Twilio
        mockTwilioClient = {
            messages: {
                create: jest.fn().mockResolvedValue({ sid: 'test_message_id' })
            }
        };

        // Mock nodemailer
        mockEmailTransporter = {
            sendMail: jest.fn().mockResolvedValue({ messageId: 'test_email_id' })
        };

        // Initialize services
        redisService = RedisService.getInstance();
        await redisService.connect();
        
        notificationService = NotificationService.getInstance();
        
        // Inject mocks
        (notificationService as any).twilioClient = mockTwilioClient;
        (notificationService as any).emailTransporter = mockEmailTransporter;
    });

    afterAll(async () => {
        await redisService.disconnect();
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Notification Creation and Delivery', () => {
        test('should create and send a basic healthcare notification', async () => {
            const notification = {
                type: 'medication_reminder' as const,
                priority: 'medium' as const,
                recipient: testRecipient,
                title: 'Medication Reminder',
                message: 'Time to take your prescribed medication',
                culturalContext: {
                    prayerTimeAware: true,
                    ramadanAware: false,
                    localizedContent: {
                        'ms': 'Masa untuk mengambil ubat yang ditetapkan',
                        'en': 'Time to take your prescribed medication'
                    }
                }
            };

            const notificationId = await notificationService.sendHealthcareNotification(notification);

            expect(notificationId).toBeDefined();
            expect(typeof notificationId).toBe('string');
            expect(notificationId).toMatch(/^notif_\d+_[a-z0-9]+$/);
        });

        test('should deliver notification through multiple channels', async () => {
            const notification = {
                type: 'vital_alert' as const,
                priority: 'high' as const,
                recipient: testRecipient,
                title: 'Vital Signs Alert',
                message: 'Your heart rate reading is outside normal range',
                culturalContext: {
                    prayerTimeAware: false, // Vital alerts override prayer time
                    ramadanAware: false,
                    localizedContent: {
                        'ms': 'Bacaan kadar degupan jantung anda di luar julat normal'
                    }
                }
            };

            await notificationService.sendHealthcareNotification(notification);

            // Should call SMS delivery
            expect(mockTwilioClient.messages.create).toHaveBeenCalledWith({
                body: expect.stringContaining('[MediMate] Vital Signs Alert'),
                from: process.env.TWILIO_PHONE_NUMBER,
                to: '+60123456789'
            });

            // Should call email delivery
            expect(mockEmailTransporter.sendMail).toHaveBeenCalledWith({
                from: expect.any(String),
                to: 'test@example.com',
                subject: expect.stringContaining('[MediMate Malaysia] Vital Signs Alert'),
                text: expect.any(String),
                html: expect.any(String)
            });
        });

        test('should use culturally localized content based on user language', async () => {
            const notification = {
                type: 'appointment_reminder' as const,
                priority: 'medium' as const,
                recipient: testRecipient,
                title: 'Appointment Reminder',
                message: 'You have an appointment tomorrow',
                culturalContext: {
                    prayerTimeAware: true,
                    ramadanAware: false,
                    localizedContent: {
                        'ms': 'Anda ada temujanji esok',
                        'en': 'You have an appointment tomorrow'
                    }
                }
            };

            await notificationService.sendHealthcareNotification(notification);

            // Should use Malay content for SMS
            expect(mockTwilioClient.messages.create).toHaveBeenCalledWith({
                body: expect.stringContaining('Anda ada temujanji esok'),
                from: process.env.TWILIO_PHONE_NUMBER,
                to: '+60123456789'
            });
        });

        test('should handle notification delivery failures gracefully', async () => {
            // Mock SMS failure
            mockTwilioClient.messages.create.mockRejectedValueOnce(new Error('SMS delivery failed'));
            
            // Mock email success
            mockEmailTransporter.sendMail.mockResolvedValueOnce({ messageId: 'email_success' });

            const notification = {
                type: 'provider_message' as const,
                priority: 'low' as const,
                recipient: testRecipient,
                title: 'Message from Provider',
                message: 'Please schedule your follow-up appointment'
            };

            // Should not throw error despite SMS failure
            const notificationId = await notificationService.sendHealthcareNotification(notification);
            expect(notificationId).toBeDefined();

            // Email should still be attempted and succeed
            expect(mockEmailTransporter.sendMail).toHaveBeenCalled();
        });
    });

    describe('Vital Signs Alert Notifications', () => {
        test('should send vital signs alert to care team', async () => {
            const vitalData = {
                heartRate: 120, // High heart rate
                bloodPressure: '160/100', // High blood pressure
                temperature: 39.2, // High fever
                timestamp: new Date()
            };

            const thresholds = {
                heartRateMax: 100,
                systolicMax: 140,
                temperatureMax: 38.0
            };

            // Mock database response for care team
            jest.spyOn(notificationService as any, 'getVitalAlertsRecipients')
                .mockResolvedValue([testRecipient]);

            await notificationService.sendVitalSignsAlert('patient-123', vitalData, thresholds);

            expect(mockTwilioClient.messages.create).toHaveBeenCalled();
            expect(mockEmailTransporter.sendMail).toHaveBeenCalled();
        });

        test('should calculate appropriate priority for vital signs alerts', async () => {
            const criticalVitals = {
                heartRate: 180, // Critical high
                oxygenSaturation: 85, // Dangerously low
            };

            const thresholds = {
                heartRateMax: 100,
                oxygenSaturationMin: 95
            };

            jest.spyOn(notificationService as any, 'getVitalAlertsRecipients')
                .mockResolvedValue([testRecipient]);

            // Mock calculateVitalAlertPriority to return 'critical'
            jest.spyOn(notificationService as any, 'calculateVitalAlertPriority')
                .mockReturnValue('critical');

            await notificationService.sendVitalSignsAlert('patient-123', criticalVitals, thresholds);

            // Should send immediate notification regardless of cultural timing
            expect(mockTwilioClient.messages.create).toHaveBeenCalled();
        });
    });

    describe('Emergency Alert Broadcasting', () => {
        test('should broadcast emergency alerts immediately', async () => {
            const emergencyAlert = {
                type: 'cardiac_arrest',
                severity: 'critical',
                location: 'Emergency Ward A',
                patientId: 'patient-123'
            };

            const location = {
                latitude: 3.1390,
                longitude: 101.6869 // Kuala Lumpur coordinates
            };

            // Mock emergency recipients
            const emergencyRecipients = [
                {
                    ...testRecipient,
                    userType: 'emergency_responder' as const,
                    channels: [
                        { type: 'websocket' as const, enabled: true },
                        { type: 'sms' as const, enabled: true, config: { phoneNumber: '+60123456789' } }
                    ]
                }
            ];

            jest.spyOn(notificationService as any, 'getEmergencyRecipients')
                .mockResolvedValue(emergencyRecipients);

            await notificationService.sendEmergencyAlert(emergencyAlert, location);

            // Emergency alerts should bypass cultural timing constraints
            expect(mockTwilioClient.messages.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    body: expect.stringContaining('Emergency'),
                })
            );
        });

        test('should include location information in emergency alerts', async () => {
            const emergencyAlert = {
                type: 'fire_alarm',
                severity: 'high',
                location: 'Building A, Floor 3'
            };

            const location = {
                latitude: 3.1390,
                longitude: 101.6869
            };

            jest.spyOn(notificationService as any, 'getEmergencyRecipients')
                .mockResolvedValue([testRecipient]);

            await notificationService.sendEmergencyAlert(emergencyAlert, location);

            // Should include location context in the alert
            const smsCall = mockTwilioClient.messages.create.mock.calls[0][0];
            expect(smsCall.body).toContain('Emergency');
        });
    });

    describe('Cultural Timing and Prayer Time Awareness', () => {
        test('should delay non-critical notifications during prayer time', async () => {
            // Mock current time to be during prayer time
            const mockPrayerTime = {
                time: new Date().toISOString(),
                name: 'Zuhr'
            };

            jest.spyOn(notificationService as any, 'prayerTimeService', 'get')
                .mockReturnValue({
                    getCurrentPrayerTime: jest.fn().mockResolvedValue(mockPrayerTime)
                });

            jest.spyOn(notificationService as any, 'isWithinPrayerWindow')
                .mockReturnValue(true);

            const notification = {
                type: 'medication_reminder' as const,
                priority: 'medium' as const,
                recipient: testRecipient, // Has doNotDisturbDuringPrayer: true
                title: 'Medication Reminder',
                message: 'Time for your medication'
            };

            const notificationId = await notificationService.sendHealthcareNotification(notification);

            // Should schedule for later delivery instead of immediate
            expect(notificationId).toBeDefined();

            // Should not immediately send SMS/Email during prayer
            expect(mockTwilioClient.messages.create).not.toHaveBeenCalled();
        });

        test('should respect preferred contact hours', async () => {
            // Create recipient with restricted hours (only 9 AM - 6 PM)
            const restrictedRecipient = {
                ...testRecipient,
                culturalPreferences: {
                    ...testRecipient.culturalPreferences,
                    preferredContactTime: {
                        startHour: 9,
                        endHour: 18
                    }
                }
            };

            // Mock current time to be outside preferred hours (e.g., 23:00)
            jest.spyOn(Date.prototype, 'getHours').mockReturnValue(23);

            const notification = {
                type: 'appointment_reminder' as const,
                priority: 'low' as const,
                recipient: restrictedRecipient,
                title: 'Appointment Reminder',
                message: 'Reminder for tomorrow appointment'
            };

            const notificationId = await notificationService.sendHealthcareNotification(notification);

            // Should be scheduled rather than sent immediately
            expect(notificationId).toBeDefined();
            
            // Should not send immediately
            expect(mockTwilioClient.messages.create).not.toHaveBeenCalled();
        });

        test('should override cultural timing for emergency notifications', async () => {
            // Even during prayer time and outside contact hours
            jest.spyOn(notificationService as any, 'isWithinPrayerWindow')
                .mockReturnValue(true);
            jest.spyOn(Date.prototype, 'getHours').mockReturnValue(2); // 2 AM

            const emergencyAlert = {
                type: 'emergency_alert',
                severity: 'critical',
                location: 'ICU'
            };

            jest.spyOn(notificationService as any, 'getEmergencyRecipients')
                .mockResolvedValue([testRecipient]);

            await notificationService.sendEmergencyAlert(emergencyAlert);

            // Emergency should still be sent immediately
            expect(mockTwilioClient.messages.create).toHaveBeenCalled();
        });
    });

    describe('Ramadan and Islamic Considerations', () => {
        test('should adjust medication reminders during Ramadan fasting', async () => {
            // Mock Ramadan period
            jest.spyOn(notificationService as any, 'culturalCalendarService', 'get')
                .mockReturnValue({
                    isRamadan: jest.fn().mockReturnValue(true),
                    getFastingHours: jest.fn().mockResolvedValue({
                        suhur: '05:30',
                        iftar: '19:15'
                    })
                });

            const medicationReminder = {
                type: 'medication_reminder' as const,
                priority: 'medium' as const,
                recipient: testRecipient,
                title: 'Medication Reminder',
                message: 'Time for your medication',
                culturalContext: {
                    prayerTimeAware: true,
                    ramadanAware: true,
                    localizedContent: {
                        'ms': 'Masa untuk ubat selepas berbuka puasa'
                    }
                }
            };

            await notificationService.sendHealthcareNotification(medicationReminder);

            const smsCall = mockTwilioClient.messages.create.mock.calls[0][0];
            expect(smsCall.body).toContain('berbuka puasa'); // "after breaking fast" in Malay
        });

        test('should provide halal medication reminders for Muslim patients', async () => {
            const halalMedicationReminder = {
                type: 'medication_reminder' as const,
                priority: 'medium' as const,
                recipient: testRecipient, // Has halalMedicationOnly: true
                title: 'Halal Medication Reminder',
                message: 'Your halal-certified medication is ready',
                culturalContext: {
                    prayerTimeAware: true,
                    ramadanAware: false,
                    localizedContent: {
                        'ms': 'Ubat yang disahkan halal anda sudah sedia'
                    }
                }
            };

            await notificationService.sendHealthcareNotification(halalMedicationReminder);

            expect(mockTwilioClient.messages.create).toHaveBeenCalledWith({
                body: expect.stringContaining('disahkan halal'),
                from: process.env.TWILIO_PHONE_NUMBER,
                to: testRecipient.channels[1].config?.phoneNumber
            });
        });
    });

    describe('Multi-language Support', () => {
        test('should send notifications in Chinese for Chinese-speaking patients', async () => {
            const chineseRecipient = {
                ...testRecipient,
                culturalPreferences: {
                    ...testRecipient.culturalPreferences,
                    language: 'zh' as const
                }
            };

            const notification = {
                type: 'appointment_reminder' as const,
                priority: 'medium' as const,
                recipient: chineseRecipient,
                title: 'Appointment Reminder',
                message: 'You have an appointment',
                culturalContext: {
                    prayerTimeAware: false,
                    ramadanAware: false,
                    localizedContent: {
                        'zh': '您有一个预约',
                        'en': 'You have an appointment'
                    }
                }
            };

            await notificationService.sendHealthcareNotification(notification);

            const smsCall = mockTwilioClient.messages.create.mock.calls[0][0];
            expect(smsCall.body).toContain('您有一个预约');
        });

        test('should send notifications in Tamil for Tamil-speaking patients', async () => {
            const tamilRecipient = {
                ...testRecipient,
                culturalPreferences: {
                    ...testRecipient.culturalPreferences,
                    language: 'ta' as const
                }
            };

            const notification = {
                type: 'vital_alert' as const,
                priority: 'high' as const,
                recipient: tamilRecipient,
                title: 'Vital Alert',
                message: 'Please check your vital signs',
                culturalContext: {
                    prayerTimeAware: false,
                    ramadanAware: false,
                    localizedContent: {
                        'ta': 'உங்கள் முக்கிய அறிகுறிகளை சரிபார்க்கவும்',
                        'en': 'Please check your vital signs'
                    }
                }
            };

            await notificationService.sendHealthcareNotification(notification);

            const smsCall = mockTwilioClient.messages.create.mock.calls[0][0];
            expect(smsCall.body).toContain('முக்கிய அறிகுறிகளை சரிபார்க்கவும்');
        });

        test('should fallback to English when localized content is not available', async () => {
            const notification = {
                type: 'provider_message' as const,
                priority: 'low' as const,
                recipient: testRecipient,
                title: 'Provider Message',
                message: 'Message from your healthcare provider',
                culturalContext: {
                    prayerTimeAware: false,
                    ramadanAware: false,
                    localizedContent: {
                        'en': 'Message from your healthcare provider'
                        // No Malay translation provided
                    }
                }
            };

            await notificationService.sendHealthcareNotification(notification);

            const smsCall = mockTwilioClient.messages.create.mock.calls[0][0];
            expect(smsCall.body).toContain('Message from your healthcare provider');
        });
    });

    describe('Channel-specific Delivery', () => {
        test('should skip disabled channels', async () => {
            const recipientWithDisabledSMS = {
                ...testRecipient,
                channels: [
                    { type: 'websocket' as const, enabled: true },
                    { type: 'sms' as const, enabled: false, config: { phoneNumber: '+60123456789' } },
                    { type: 'email' as const, enabled: true, config: { email: 'test@example.com' } }
                ]
            };

            const notification = {
                type: 'medication_reminder' as const,
                priority: 'medium' as const,
                recipient: recipientWithDisabledSMS,
                title: 'Medication Reminder',
                message: 'Time for medication'
            };

            await notificationService.sendHealthcareNotification(notification);

            // SMS should not be sent
            expect(mockTwilioClient.messages.create).not.toHaveBeenCalled();
            
            // Email should still be sent
            expect(mockEmailTransporter.sendMail).toHaveBeenCalled();
        });

        test('should generate appropriate HTML email content', async () => {
            const notification = {
                type: 'appointment_reminder' as const,
                priority: 'medium' as const,
                recipient: testRecipient,
                title: 'Appointment Reminder',
                message: 'Your appointment is scheduled for tomorrow at 2 PM'
            };

            await notificationService.sendHealthcareNotification(notification);

            const emailCall = mockEmailTransporter.sendMail.mock.calls[0][0];
            expect(emailCall.html).toContain('<h2>');
            expect(emailCall.html).toContain('MediMate Malaysia Healthcare System');
            expect(emailCall.html).toContain('Your appointment is scheduled');
        });
    });

    describe('Error Handling and Reliability', () => {
        test('should continue processing other channels when one fails', async () => {
            // Mock SMS failure but email success
            mockTwilioClient.messages.create.mockRejectedValueOnce(new Error('SMS service down'));
            mockEmailTransporter.sendMail.mockResolvedValueOnce({ messageId: 'email_success' });

            const notification = {
                type: 'vital_alert' as const,
                priority: 'high' as const,
                recipient: testRecipient,
                title: 'Important Alert',
                message: 'Please check your vital signs'
            };

            await expect(
                notificationService.sendHealthcareNotification(notification)
            ).resolves.toBeDefined();

            expect(mockEmailTransporter.sendMail).toHaveBeenCalled();
        });

        test('should handle malformed notification data gracefully', async () => {
            const malformedNotification = {
                type: 'invalid_type' as any,
                priority: 'invalid_priority' as any,
                recipient: {
                    ...testRecipient,
                    channels: null // Invalid channels
                },
                title: '',
                message: null
            };

            await expect(
                notificationService.sendHealthcareNotification(malformedNotification)
            ).rejects.toThrow();
        });

        test('should retry failed deliveries', async () => {
            // First call fails, second succeeds
            mockTwilioClient.messages.create
                .mockRejectedValueOnce(new Error('Temporary failure'))
                .mockResolvedValueOnce({ sid: 'retry_success' });

            const notification = {
                type: 'medication_reminder' as const,
                priority: 'medium' as const,
                recipient: {
                    ...testRecipient,
                    channels: [
                        { type: 'sms' as const, enabled: true, config: { phoneNumber: '+60123456789' } }
                    ]
                },
                title: 'Medication Reminder',
                message: 'Time for medication'
            };

            const notificationId = await notificationService.sendHealthcareNotification(notification);
            expect(notificationId).toBeDefined();
        });
    });
});

export {};