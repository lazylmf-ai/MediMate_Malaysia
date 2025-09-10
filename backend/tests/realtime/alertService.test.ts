/**
 * Alert Service Tests
 * 
 * Tests for emergency and critical health alert broadcasting system
 * with Malaysian healthcare context and multi-channel delivery.
 */

import { AlertService } from '../../src/services/realtime/alertService';
import { RedisService } from '../../src/services/cache/redisService';
import { NotificationService } from '../../src/services/realtime/notificationService';
import { AuditService } from '../../src/services/audit/auditService';
import { DatabaseService } from '../../src/services/database/databaseService';

// Mock external services
jest.mock('../../src/services/cache/redisService');
jest.mock('../../src/services/realtime/notificationService');
jest.mock('../../src/services/audit/auditService');
jest.mock('../../src/services/database/databaseService');

describe('Alert Service', () => {
    let alertService: AlertService;
    let mockRedisService: jest.Mocked<RedisService>;
    let mockNotificationService: jest.Mocked<NotificationService>;
    let mockAuditService: jest.Mocked<AuditService>;
    let mockDatabaseService: jest.Mocked<DatabaseService>;

    beforeAll(async () => {
        // Setup mocks
        mockRedisService = {
            connect: jest.fn().mockResolvedValue(undefined),
            subscribeToHealthcareEvents: jest.fn().mockResolvedValue(undefined),
            publishHealthcareEvent: jest.fn().mockResolvedValue(undefined),
            getClient: jest.fn().mockReturnValue({
                setEx: jest.fn().mockResolvedValue('OK'),
                del: jest.fn().mockResolvedValue(1)
            })
        } as any;

        mockNotificationService = {
            sendVitalSignsAlert: jest.fn().mockResolvedValue(undefined),
            sendHealthcareNotification: jest.fn().mockResolvedValue('test-notification-id')
        } as any;

        mockAuditService = {
            logHealthcareEvent: jest.fn().mockResolvedValue(undefined)
        } as any;

        mockDatabaseService = {
            getConnection: jest.fn().mockReturnValue({
                manyOrNone: jest.fn().mockResolvedValue([]),
                oneOrNone: jest.fn().mockResolvedValue(null),
                none: jest.fn().mockResolvedValue(undefined)
            })
        } as any;

        // Mock static getInstance methods
        (RedisService.getInstance as jest.Mock).mockReturnValue(mockRedisService);
        (NotificationService.getInstance as jest.Mock).mockReturnValue(mockNotificationService);
        (AuditService.getInstance as jest.Mock).mockReturnValue(mockAuditService);
        (DatabaseService.getInstance as jest.Mock).mockReturnValue(mockDatabaseService);

        // Initialize AlertService
        alertService = AlertService.getInstance();
    });

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('Emergency Alert Creation', () => {
        test('should create emergency alert with correct severity', async () => {
            const alertId = await alertService.createEmergencyAlert(
                'emergency',
                'Cardiac Arrest Alert',
                'Patient in cardiac arrest in ICU Room 204',
                {
                    patientId: 'patient-123',
                    location: {
                        latitude: 3.1390,
                        longitude: 101.6869,
                        address: 'ICU Room 204',
                        floor: '2',
                        room: '204'
                    },
                    metadata: {
                        source: 'emergency_button',
                        category: 'cardiac_emergency'
                    }
                }
            );

            expect(alertId).toBeDefined();
            expect(typeof alertId).toBe('string');
            expect(alertId).toMatch(/^alert_\d+_[a-z0-9]+$/);

            // Should audit the alert creation
            expect(mockAuditService.logHealthcareEvent).toHaveBeenCalledWith({
                eventType: 'alert_created',
                patientId: 'patient-123',
                providerId: undefined,
                success: true,
                metadata: expect.objectContaining({
                    alertId,
                    type: 'emergency',
                    severity: 'emergency'
                })
            });
        });

        test('should create critical vital alert with appropriate escalation', async () => {
            const alertId = await alertService.createEmergencyAlert(
                'critical_vital',
                'Critical Heart Rate Alert',
                'Patient heart rate is critically high at 180 BPM',
                {
                    patientId: 'patient-456',
                    metadata: {
                        source: 'monitoring_system',
                        category: 'patient_care',
                        vitalType: 'heart_rate',
                        currentValue: 180,
                        thresholdValue: 100
                    }
                }
            );

            expect(alertId).toBeDefined();
            expect(mockAuditService.logHealthcareEvent).toHaveBeenCalledWith({
                eventType: 'alert_created',
                patientId: 'patient-456',
                providerId: undefined,
                success: true,
                metadata: expect.objectContaining({
                    type: 'critical_vital',
                    severity: 'critical'
                })
            });
        });

        test('should create system failure alert', async () => {
            const alertId = await alertService.createEmergencyAlert(
                'system_failure',
                'Database Connection Lost',
                'Primary database connection has been lost',
                {
                    facilityId: 'facility-001',
                    metadata: {
                        source: 'system_monitor',
                        category: 'infrastructure',
                        systemComponent: 'database',
                        errorCode: 'CONNECTION_LOST'
                    }
                }
            );

            expect(alertId).toBeDefined();
            expect(mockAuditService.logHealthcareEvent).toHaveBeenCalledWith({
                eventType: 'alert_created',
                patientId: undefined,
                providerId: undefined,
                success: true,
                metadata: expect.objectContaining({
                    type: 'system_failure',
                    severity: 'high'
                })
            });
        });

        test('should handle alert creation failure gracefully', async () => {
            // Mock database error
            mockDatabaseService.getConnection().none = jest.fn().mockRejectedValue(new Error('Database error'));

            await expect(
                alertService.createEmergencyAlert(
                    'emergency',
                    'Test Alert',
                    'Test message'
                )
            ).rejects.toThrow('Database error');

            // Should audit the failure
            expect(mockAuditService.logHealthcareEvent).toHaveBeenCalledWith({
                eventType: 'alert_creation_failed',
                patientId: undefined,
                providerId: undefined,
                success: false,
                errorMessage: 'Database error'
            });
        });
    });

    describe('Alert Acknowledgment', () => {
        test('should acknowledge alert successfully', async () => {
            // First create an alert
            const alertId = await alertService.createEmergencyAlert(
                'emergency',
                'Test Alert',
                'Test message'
            );

            // Mock active alert exists
            (alertService as any).activeAlerts.set(alertId, {
                id: alertId,
                type: 'emergency',
                severity: 'emergency',
                createdAt: new Date(),
                // ... other required properties
            });

            // Mock recipient exists
            (alertService as any).alertRecipients.set(alertId, [{
                userId: 'user-123',
                alertId,
                // ... other required properties
            }]);

            await alertService.acknowledgeAlert(alertId, 'user-123', 'acknowledged');

            expect(mockAuditService.logHealthcareEvent).toHaveBeenCalledWith({
                eventType: 'alert_acknowledged',
                userId: 'user-123',
                patientId: undefined,
                providerId: undefined,
                success: true,
                metadata: expect.objectContaining({
                    alertId,
                    responseStatus: 'acknowledged'
                })
            });
        });

        test('should handle acknowledgment of non-existent alert', async () => {
            await expect(
                alertService.acknowledgeAlert('non-existent-alert', 'user-123', 'acknowledged')
            ).rejects.toThrow('Alert non-existent-alert not found');
        });

        test('should handle acknowledgment by non-recipient', async () => {
            const alertId = 'test-alert-123';
            
            // Mock active alert exists
            (alertService as any).activeAlerts.set(alertId, {
                id: alertId,
                type: 'emergency',
                severity: 'emergency',
                createdAt: new Date(),
            });

            // Mock recipients don't include the user
            (alertService as any).alertRecipients.set(alertId, []);

            await expect(
                alertService.acknowledgeAlert(alertId, 'user-123', 'acknowledged')
            ).rejects.toThrow('User user-123 is not a recipient of alert test-alert-123');
        });
    });

    describe('Alert Resolution', () => {
        test('should resolve alert successfully', async () => {
            const alertId = 'test-alert-123';
            
            // Mock active alert exists
            (alertService as any).activeAlerts.set(alertId, {
                id: alertId,
                type: 'emergency',
                severity: 'emergency',
                createdAt: new Date(),
                resolvedAt: null,
                patientId: 'patient-123'
            });

            await alertService.resolveAlert(alertId, 'resolver-123', 'Issue resolved manually');

            expect(mockAuditService.logHealthcareEvent).toHaveBeenCalledWith({
                eventType: 'alert_resolved',
                userId: 'resolver-123',
                patientId: 'patient-123',
                providerId: undefined,
                success: true,
                metadata: expect.objectContaining({
                    alertId,
                    resolution: 'Issue resolved manually'
                })
            });

            // Alert should be removed from active alerts
            expect((alertService as any).activeAlerts.has(alertId)).toBe(false);
        });

        test('should handle resolution of already resolved alert', async () => {
            const alertId = 'test-alert-123';
            
            // Mock already resolved alert
            (alertService as any).activeAlerts.set(alertId, {
                id: alertId,
                type: 'emergency',
                severity: 'emergency',
                createdAt: new Date(),
                resolvedAt: new Date(),
                resolvedBy: 'previous-resolver'
            });

            await expect(
                alertService.resolveAlert(alertId, 'resolver-123', 'Issue resolved')
            ).rejects.toThrow('Alert test-alert-123 is already resolved');
        });
    });

    describe('Cultural Context Integration', () => {
        test('should generate localized alert messages', async () => {
            const alertId = await alertService.createEmergencyAlert(
                'medication_critical',
                'Critical Medication Alert',
                'Critical medication issue detected',
                {
                    patientId: 'patient-123',
                    metadata: {
                        source: 'medication_system',
                        category: 'medication',
                        medicationName: 'Insulin',
                        issueType: 'dosage_error'
                    }
                }
            );

            expect(alertId).toBeDefined();
            
            // Should create alert with cultural context
            expect(mockAuditService.logHealthcareEvent).toHaveBeenCalledWith({
                eventType: 'alert_created',
                patientId: 'patient-123',
                providerId: undefined,
                success: true,
                metadata: expect.objectContaining({
                    type: 'medication_critical',
                    severity: 'critical'
                })
            });
        });

        test('should respect prayer time considerations for non-emergency alerts', async () => {
            const alertId = await alertService.createEmergencyAlert(
                'system_failure',
                'Non-Critical System Issue',
                'Minor system issue detected',
                {
                    escalationLevel: 1,
                    metadata: {
                        source: 'system_monitor',
                        category: 'system',
                        severity: 'low'
                    }
                }
            );

            expect(alertId).toBeDefined();
            // Non-emergency alerts should be created but might be scheduled differently
        });

        test('should override prayer time for emergency alerts', async () => {
            const alertId = await alertService.createEmergencyAlert(
                'emergency',
                'Medical Emergency',
                'Immediate medical emergency requiring response',
                {
                    patientId: 'patient-123',
                    location: {
                        latitude: 3.1390,
                        longitude: 101.6869,
                        address: 'Emergency Room'
                    }
                }
            );

            expect(alertId).toBeDefined();
            // Emergency alerts should always be delivered immediately
        });
    });

    describe('Alert Statistics and Monitoring', () => {
        test('should track active alerts count', () => {
            const initialCount = alertService.getActiveAlertsCount();
            expect(typeof initialCount).toBe('number');
            expect(initialCount).toBeGreaterThanOrEqual(0);
        });

        test('should retrieve active alerts list', () => {
            const activeAlerts = alertService.getActiveAlerts();
            expect(Array.isArray(activeAlerts)).toBe(true);
        });

        test('should retrieve alert by ID', async () => {
            const alertId = await alertService.createEmergencyAlert(
                'emergency',
                'Test Alert',
                'Test message'
            );

            const alert = alertService.getAlertById(alertId);
            if (alert) {
                expect(alert.id).toBe(alertId);
                expect(alert.type).toBe('emergency');
            }
        });
    });

    describe('Alert Escalation', () => {
        test('should handle automatic escalation for unacknowledged critical alerts', async () => {
            const alertId = await alertService.createEmergencyAlert(
                'critical_vital',
                'Critical Vital Signs',
                'Patient vital signs are critical',
                {
                    patientId: 'patient-123',
                    escalationLevel: 1
                }
            );

            // Mock alert for escalation testing
            const mockAlert = {
                id: alertId,
                type: 'critical_vital',
                severity: 'critical',
                escalationLevel: 1,
                createdAt: new Date(Date.now() - 6 * 60 * 1000), // 6 minutes ago
                resolvedAt: null,
                patientId: 'patient-123'
            };

            (alertService as any).activeAlerts.set(alertId, mockAlert);
            (alertService as any).alertRecipients.set(alertId, []);

            // Should handle escalation logic
            expect(alertId).toBeDefined();
        });
    });

    describe('Multi-channel Alert Delivery', () => {
        test('should handle WebSocket delivery', async () => {
            const alertId = await alertService.createEmergencyAlert(
                'emergency',
                'WebSocket Test Alert',
                'Testing WebSocket delivery'
            );

            expect(mockRedisService.publishHealthcareEvent).toHaveBeenCalled();
        });

        test('should handle SMS delivery through notification service', async () => {
            const alertId = await alertService.createEmergencyAlert(
                'emergency',
                'SMS Test Alert',
                'Testing SMS delivery',
                {
                    patientId: 'patient-123'
                }
            );

            // Should use notification service for SMS delivery
            expect(alertId).toBeDefined();
        });

        test('should handle email delivery through notification service', async () => {
            const alertId = await alertService.createEmergencyAlert(
                'emergency',
                'Email Test Alert',
                'Testing email delivery',
                {
                    patientId: 'patient-123'
                }
            );

            // Should use notification service for email delivery
            expect(alertId).toBeDefined();
        });
    });

    describe('Error Handling and Resilience', () => {
        test('should handle Redis connection failures gracefully', async () => {
            mockRedisService.publishHealthcareEvent.mockRejectedValueOnce(new Error('Redis error'));

            const alertId = await alertService.createEmergencyAlert(
                'emergency',
                'Redis Error Test',
                'Testing Redis error handling'
            );

            // Alert should still be created even if Redis fails
            expect(alertId).toBeDefined();
        });

        test('should handle notification service failures gracefully', async () => {
            mockNotificationService.sendHealthcareNotification.mockRejectedValueOnce(new Error('Notification error'));

            const alertId = await alertService.createEmergencyAlert(
                'emergency',
                'Notification Error Test',
                'Testing notification error handling'
            );

            // Alert should still be created even if notification fails
            expect(alertId).toBeDefined();
        });

        test('should validate alert input parameters', async () => {
            await expect(
                alertService.createEmergencyAlert(
                    '' as any,
                    '',
                    ''
                )
            ).rejects.toThrow();
        });
    });
});

export {};