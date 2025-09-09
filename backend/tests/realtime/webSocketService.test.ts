/**
 * WebSocket Service Tests
 * 
 * Comprehensive tests for WebSocket service functionality including
 * authentication, connection management, event distribution, and cultural context.
 */

import { createServer } from 'http';
import { Server } from 'socket.io';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { WebSocketService } from '../../src/services/realtime/webSocketService';
import { RedisService } from '../../src/services/cache/redisService';
import { AuditService } from '../../src/services/audit/auditService';
import jwt from 'jsonwebtoken';

describe('WebSocket Service', () => {
    let httpServer: any;
    let webSocketService: WebSocketService;
    let redisService: RedisService;
    let clientSocket: ClientSocket;
    let serverPort: number;

    // Test user data
    const testUser = {
        userId: 'test-user-123',
        userType: 'patient',
        patientId: 'patient-123',
        permissions: ['patient_data_access'],
        culturalPreferences: {
            language: 'ms',
            state: 'KUL',
            timezone: 'Asia/Kuala_Lumpur',
            prayerTimeNotifications: true,
            halalMedicationOnly: true
        }
    };

    const testToken = jwt.sign(testUser, process.env.JWT_SECRET || 'test-secret');

    beforeAll(async () => {
        // Create HTTP server
        httpServer = createServer();
        serverPort = 3001; // Use different port for testing
        
        // Initialize Redis service
        redisService = RedisService.getInstance();
        await redisService.connect();
        
        // Initialize WebSocket service
        webSocketService = WebSocketService.getInstance(httpServer);
        
        // Start server
        await new Promise<void>((resolve) => {
            httpServer.listen(serverPort, resolve);
        });
    });

    afterAll(async () => {
        if (clientSocket) {
            clientSocket.close();
        }
        if (httpServer) {
            httpServer.close();
        }
        await redisService.disconnect();
    });

    beforeEach(() => {
        // Create client socket connection
        clientSocket = Client(`http://localhost:${serverPort}`, {
            auth: {
                token: testToken
            }
        });
    });

    afterEach(() => {
        if (clientSocket.connected) {
            clientSocket.disconnect();
        }
    });

    describe('Connection Management', () => {
        test('should authenticate valid user successfully', (done) => {
            clientSocket.on('connect', () => {
                expect(clientSocket.connected).toBe(true);
                expect(webSocketService.getActiveConnectionsCount()).toBe(1);
                done();
            });

            clientSocket.on('connect_error', (error) => {
                done(new Error(`Connection failed: ${error.message}`));
            });
        });

        test('should reject connection without authentication token', (done) => {
            const unauthenticatedClient = Client(`http://localhost:${serverPort}`);
            
            unauthenticatedClient.on('connect_error', (error) => {
                expect(error.message).toContain('Authentication');
                unauthenticatedClient.close();
                done();
            });

            unauthenticatedClient.on('connect', () => {
                unauthenticatedClient.close();
                done(new Error('Should not connect without authentication'));
            });
        });

        test('should send connection established message with cultural greeting', (done) => {
            clientSocket.on('connection_established', (data) => {
                expect(data).toHaveProperty('message');
                expect(data).toHaveProperty('culturalGreeting');
                expect(data).toHaveProperty('userType', 'patient');
                expect(data).toHaveProperty('permissions');
                expect(data.culturalGreeting).toContain('Selamat datang'); // Malay greeting
                done();
            });
        });

        test('should track active connections by user type', (done) => {
            clientSocket.on('connect', () => {
                const userTypes = webSocketService.getActiveUserTypes();
                expect(userTypes).toHaveProperty('patient', 1);
                done();
            });
        });
    });

    describe('Event Subscriptions', () => {
        beforeEach((done) => {
            clientSocket.on('connect', () => done());
        });

        test('should subscribe to vital signs monitoring', (done) => {
            const subscriptionData = { patientId: testUser.patientId };
            
            clientSocket.emit('subscribe_vitals', subscriptionData);
            
            clientSocket.on('subscription_confirmed', (data) => {
                expect(data.type).toBe('vital_signs');
                expect(data.patientId).toBe(testUser.patientId);
                expect(data).toHaveProperty('culturalMessage');
                done();
            });

            clientSocket.on('error', (error) => {
                done(new Error(`Subscription failed: ${error.message}`));
            });
        });

        test('should subscribe to appointment updates', (done) => {
            const subscriptionData = { patientId: testUser.patientId };
            
            clientSocket.emit('subscribe_appointments', subscriptionData);
            
            clientSocket.on('appointments_data', (data) => {
                expect(data).toHaveProperty('appointments');
                expect(data).toHaveProperty('culturalContext');
                expect(data.culturalContext).toHaveProperty('prayerTimeConsiderations');
                done();
            });
        });

        test('should subscribe to medication reminders', (done) => {
            const subscriptionData = { patientId: testUser.patientId };
            
            clientSocket.emit('subscribe_medications', subscriptionData);
            
            clientSocket.on('medication_schedule', (data) => {
                expect(data).toHaveProperty('patientId', testUser.patientId);
                expect(data).toHaveProperty('medications');
                expect(data).toHaveProperty('culturalContext');
                expect(data.culturalContext.halalFilterApplied).toBe(true); // Based on user preferences
                done();
            });
        });

        test('should reject unauthorized subscription attempts', (done) => {
            // Try to subscribe to another patient's vitals
            const unauthorizedData = { patientId: 'different-patient-123' };
            
            clientSocket.emit('subscribe_vitals', unauthorizedData);
            
            clientSocket.on('error', (error) => {
                expect(error.code).toBe('INSUFFICIENT_PERMISSIONS');
                expect(error).toHaveProperty('culturalMessage');
                done();
            });
        });
    });

    describe('Real-time Event Distribution', () => {
        beforeEach((done) => {
            clientSocket.on('connect', () => {
                // Subscribe to vitals first
                clientSocket.emit('subscribe_vitals', { patientId: testUser.patientId });
                setTimeout(done, 100); // Wait for subscription to complete
            });
        });

        test('should receive vital signs updates', (done) => {
            const vitalSigns = {
                heartRate: 85,
                bloodPressure: '120/80',
                temperature: 36.8,
                timestamp: new Date().toISOString()
            };

            clientSocket.on('healthcare_event', (event) => {
                if (event.type === 'vital_signs') {
                    expect(event.patientId).toBe(testUser.patientId);
                    expect(event.data).toMatchObject(vitalSigns);
                    done();
                }
            });

            // Simulate vital signs update via Redis
            setTimeout(() => {
                redisService.publishHealthcareEvent('healthcare:vitals', {
                    type: 'vital_signs',
                    patientId: testUser.patientId,
                    data: vitalSigns
                });
            }, 100);
        });

        test('should receive culturally-aware medication reminders', (done) => {
            const medicationReminder = {
                medicationName: 'Paracetamol',
                scheduledTime: '14:30',
                isHalalCertified: true,
                culturalInstructions: 'Take after Zuhr prayer if fasting'
            };

            clientSocket.on('healthcare_event', (event) => {
                if (event.type === 'medication_reminder') {
                    expect(event.culturalContext).toBeDefined();
                    expect(event.culturalContext.prayerTimeAware).toBe(true);
                    expect(event.data.isHalalCertified).toBe(true);
                    done();
                }
            });

            setTimeout(() => {
                redisService.publishHealthcareEvent('healthcare:medications', {
                    type: 'medication_reminder',
                    patientId: testUser.patientId,
                    data: medicationReminder,
                    culturalContext: {
                        prayerTimeAware: true,
                        language: testUser.culturalPreferences.language,
                        localizedMessage: {
                            'ms': 'Masa untuk mengambil ubat'
                        }
                    }
                });
            }, 100);
        });
    });

    describe('Cultural Preferences Management', () => {
        beforeEach((done) => {
            clientSocket.on('connect', () => done());
        });

        test('should update cultural preferences', (done) => {
            const newPreferences = {
                language: 'en',
                prayerTimeNotifications: false,
                halalMedicationOnly: false
            };

            clientSocket.emit('update_cultural_preferences', newPreferences);

            clientSocket.on('cultural_preferences_updated', (response) => {
                expect(response.success).toBe(true);
                expect(response.preferences.language).toBe('en');
                expect(response.preferences.prayerTimeNotifications).toBe(false);
                expect(response).toHaveProperty('message');
                done();
            });

            clientSocket.on('error', (error) => {
                done(new Error(`Failed to update preferences: ${error.message}`));
            });
        });

        test('should receive localized messages in preferred language', (done) => {
            // First, update to English
            clientSocket.emit('update_cultural_preferences', { language: 'en' });

            clientSocket.on('cultural_preferences_updated', (response) => {
                // Check that the message is now in English
                expect(response.message).toContain('preferences updated');
                expect(response.message).not.toContain('keutamaan'); // Not in Malay
                done();
            });
        });
    });

    describe('Provider Communications', () => {
        let providerSocket: ClientSocket;
        const providerUser = {
            userId: 'provider-123',
            userType: 'healthcare_provider',
            providerId: 'provider-123',
            permissions: ['provider_messaging', 'patient_data_access']
        };
        const providerToken = jwt.sign(providerUser, process.env.JWT_SECRET || 'test-secret');

        beforeEach((done) => {
            providerSocket = Client(`http://localhost:${serverPort}`, {
                auth: { token: providerToken }
            });

            let connections = 0;
            const checkConnections = () => {
                connections++;
                if (connections === 2) done(); // Both client and provider connected
            };

            clientSocket.on('connect', checkConnections);
            providerSocket.on('connect', checkConnections);
        });

        afterEach(() => {
            if (providerSocket && providerSocket.connected) {
                providerSocket.disconnect();
            }
        });

        test('should allow provider to send messages to patients', (done) => {
            const message = {
                recipientId: testUser.userId,
                message: 'Please remember to take your medication',
                priority: 'medium'
            };

            providerSocket.emit('send_provider_message', message);

            providerSocket.on('message_sent', (response) => {
                expect(response).toHaveProperty('messageId');
                expect(response).toHaveProperty('timestamp');
                expect(response.status).toBe('delivered');
                done();
            });

            providerSocket.on('error', (error) => {
                done(new Error(`Failed to send provider message: ${error.message}`));
            });
        });

        test('should prevent non-providers from sending provider messages', (done) => {
            const message = {
                recipientId: providerUser.userId,
                message: 'This should fail',
                priority: 'low'
            };

            clientSocket.emit('send_provider_message', message);

            clientSocket.on('error', (error) => {
                expect(error.code).toBe('UNAUTHORIZED');
                done();
            });
        });
    });

    describe('Emergency Alert Subscriptions', () => {
        let emergencyResponderSocket: ClientSocket;
        const emergencyUser = {
            userId: 'emergency-123',
            userType: 'emergency_responder',
            permissions: ['emergency_alerts', 'emergency_response']
        };
        const emergencyToken = jwt.sign(emergencyUser, process.env.JWT_SECRET || 'test-secret');

        beforeEach((done) => {
            emergencyResponderSocket = Client(`http://localhost:${serverPort}`, {
                auth: { token: emergencyToken }
            });
            emergencyResponderSocket.on('connect', () => done());
        });

        afterEach(() => {
            if (emergencyResponderSocket && emergencyResponderSocket.connected) {
                emergencyResponderSocket.disconnect();
            }
        });

        test('should allow emergency responders to subscribe to alerts', (done) => {
            emergencyResponderSocket.emit('subscribe_emergency_alerts');

            emergencyResponderSocket.on('subscription_confirmed', (response) => {
                expect(response.type).toBe('emergency_alerts');
                expect(response).toHaveProperty('coverage');
                done();
            });
        });

        test('should reject emergency subscription from unauthorized users', (done) => {
            clientSocket.emit('subscribe_emergency_alerts');

            clientSocket.on('error', (error) => {
                expect(error.code).toBe('INSUFFICIENT_PERMISSIONS');
                done();
            });
        });

        test('should receive emergency alerts', (done) => {
            emergencyResponderSocket.emit('subscribe_emergency_alerts');

            emergencyResponderSocket.on('healthcare_event', (event) => {
                if (event.type === 'emergency_alert') {
                    expect(event.priority).toBe('emergency');
                    expect(event.data).toHaveProperty('alertType');
                    done();
                }
            });

            // Wait for subscription, then publish emergency
            setTimeout(() => {
                redisService.publishHealthcareEvent('healthcare:emergency', {
                    type: 'emergency_alert',
                    priority: 'emergency',
                    data: {
                        alertType: 'cardiac_arrest',
                        location: { latitude: 3.1390, longitude: 101.6869 }, // Kuala Lumpur
                        severity: 'critical'
                    }
                });
            }, 200);
        });
    });

    describe('Connection Cleanup', () => {
        test('should clean up connection on disconnect', (done) => {
            clientSocket.on('connect', () => {
                expect(webSocketService.getActiveConnectionsCount()).toBeGreaterThan(0);
                
                clientSocket.disconnect();
                
                // Wait for cleanup
                setTimeout(() => {
                    const connections = webSocketService.getActiveConnectionsCount();
                    expect(connections).toBeLessThan(webSocketService.getActiveConnectionsCount());
                    done();
                }, 100);
            });
        });

        test('should handle connection errors gracefully', (done) => {
            const invalidToken = jwt.sign({ invalid: 'user' }, 'wrong-secret');
            const badClient = Client(`http://localhost:${serverPort}`, {
                auth: { token: invalidToken }
            });

            badClient.on('connect_error', (error) => {
                expect(error.message).toContain('Authentication failed');
                badClient.close();
                done();
            });

            badClient.on('connect', () => {
                badClient.close();
                done(new Error('Should not connect with invalid token'));
            });
        });
    });

    describe('Performance and Scalability', () => {
        test('should handle multiple concurrent connections', async () => {
            const connections: ClientSocket[] = [];
            const connectionCount = 10;

            // Create multiple connections
            for (let i = 0; i < connectionCount; i++) {
                const client = Client(`http://localhost:${serverPort}`, {
                    auth: { token: testToken }
                });
                connections.push(client);
            }

            // Wait for all to connect
            await new Promise<void>((resolve) => {
                let connectedCount = 0;
                connections.forEach((client) => {
                    client.on('connect', () => {
                        connectedCount++;
                        if (connectedCount === connectionCount) {
                            resolve();
                        }
                    });
                });
            });

            // Verify connection count
            expect(webSocketService.getActiveConnectionsCount()).toBeGreaterThanOrEqual(connectionCount);

            // Cleanup
            connections.forEach(client => client.disconnect());
        });

        test('should efficiently distribute events to multiple subscribers', (done) => {
            const subscriberCount = 5;
            const subscribers: ClientSocket[] = [];
            let receivedCount = 0;

            // Create multiple subscribers
            for (let i = 0; i < subscriberCount; i++) {
                const client = Client(`http://localhost:${serverPort}`, {
                    auth: { token: testToken }
                });
                subscribers.push(client);
                
                client.on('connect', () => {
                    client.emit('subscribe_vitals', { patientId: testUser.patientId });
                });

                client.on('healthcare_event', (event) => {
                    if (event.type === 'vital_signs') {
                        receivedCount++;
                        if (receivedCount === subscriberCount) {
                            // All subscribers received the event
                            subscribers.forEach(s => s.disconnect());
                            done();
                        }
                    }
                });
            }

            // Wait for all to connect and subscribe, then publish event
            setTimeout(() => {
                redisService.publishHealthcareEvent('healthcare:vitals', {
                    type: 'vital_signs',
                    patientId: testUser.patientId,
                    data: { heartRate: 75 }
                });
            }, 500);
        });
    });

    describe('Cultural Context Integration', () => {
        test('should respect prayer time preferences in event delivery', (done) => {
            // This would be a more complex test involving mock prayer time services
            // For now, we'll test that cultural context is preserved
            
            clientSocket.on('connect', () => {
                clientSocket.emit('subscribe_medications', { patientId: testUser.patientId });
            });

            clientSocket.on('medication_schedule', (data) => {
                expect(data.culturalContext).toBeDefined();
                expect(data.culturalContext.prayerTimeAwareness).toBe(true);
                expect(data.culturalContext.halalFilterApplied).toBe(true);
                done();
            });
        });

        test('should provide localized error messages', (done) => {
            clientSocket.on('connect', () => {
                // Try to access unauthorized data
                clientSocket.emit('subscribe_vitals', { patientId: 'unauthorized-patient' });
            });

            clientSocket.on('error', (error) => {
                expect(error).toHaveProperty('culturalMessage');
                expect(error.culturalMessage).toHaveProperty('ms'); // Malay message
                expect(error.culturalMessage).toHaveProperty('en'); // English message
                done();
            });
        });
    });
});

export {};