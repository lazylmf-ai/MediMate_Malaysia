/**
 * WebSocket Service
 * 
 * Centralized WebSocket connection management with Socket.IO
 * Supporting real-time healthcare communications with Malaysian cultural context.
 */

import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';
import { Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { RedisService } from '../cache/redisService';
import { AuditService } from '../audit/auditService';
import { DatabaseService } from '../database/databaseService';

export interface WebSocketUser {
    userId: string;
    userType: 'patient' | 'healthcare_provider' | 'admin' | 'emergency_responder';
    patientId?: string;
    providerId?: string;
    permissions: string[];
    culturalPreferences: {
        language: 'ms' | 'en' | 'zh' | 'ta';
        state: string;
        timezone: string;
        prayerTimeNotifications: boolean;
        halalMedicationOnly: boolean;
    };
}

export interface HealthcareEvent {
    type: 'vital_signs' | 'appointment_update' | 'medication_reminder' | 'emergency_alert' | 'provider_notification' | 'cultural_event';
    patientId?: string;
    providerId?: string;
    priority: 'low' | 'medium' | 'high' | 'critical';
    data: any;
    culturalContext?: {
        prayerTimeAware: boolean;
        language: string;
        localizedMessage: Record<string, string>;
    };
    timestamp: string;
    eventId: string;
}

export class WebSocketService {
    private static instance: WebSocketService;
    private io: SocketIOServer;
    private redisService: RedisService;
    private auditService: AuditService;
    private databaseService: DatabaseService;
    private activeConnections: Map<string, WebSocketUser> = new Map();
    private connectionRooms: Map<string, Set<string>> = new Map(); // userId -> Set of room names

    private constructor(httpServer: HTTPServer) {
        this.redisService = RedisService.getInstance();
        this.auditService = AuditService.getInstance();
        this.databaseService = DatabaseService.getInstance();

        this.io = new SocketIOServer(httpServer, {
            cors: {
                origin: this.getAllowedOrigins(),
                methods: ['GET', 'POST'],
                credentials: true,
            },
            pingTimeout: 60000,
            pingInterval: 25000,
            transports: ['websocket', 'polling'],
            allowEIO3: true,
        });

        this.setupMiddleware();
        this.setupEventHandlers();
        this.setupRedisSubscriptions();
    }

    public static getInstance(httpServer?: HTTPServer): WebSocketService {
        if (!WebSocketService.instance) {
            if (!httpServer) {
                throw new Error('HTTP server required for WebSocket service initialization');
            }
            WebSocketService.instance = new WebSocketService(httpServer);
        }
        return WebSocketService.instance;
    }

    private getAllowedOrigins(): string[] {
        const baseOrigins = [
            'http://localhost:3000',
            'http://localhost:8081',
            'http://10.0.2.2:3000',
        ];

        if (process.env.NODE_ENV === 'production') {
            return [
                'https://medimate.my',
                'https://api.medimate.my',
                'https://admin.medimate.my',
                ...baseOrigins
            ];
        }

        return [...baseOrigins, 'http://localhost:3001', 'http://localhost:3002'];
    }

    private setupMiddleware(): void {
        // Authentication middleware
        this.io.use(async (socket: Socket, next) => {
            try {
                const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '');
                
                if (!token) {
                    return next(new Error('Authentication token required'));
                }

                const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key') as any;
                
                // Fetch user details and permissions from database
                const userDetails = await this.fetchUserDetails(decoded.userId, decoded.userType);
                
                if (!userDetails) {
                    return next(new Error('Invalid user credentials'));
                }

                socket.data.user = userDetails;
                
                // Audit WebSocket connection
                await this.auditService.logHealthcareEvent({
                    eventType: 'websocket_connection',
                    userId: userDetails.userId,
                    userType: userDetails.userType,
                    ipAddress: socket.handshake.address,
                    userAgent: socket.handshake.headers['user-agent'],
                    success: true,
                    metadata: {
                        socketId: socket.id,
                        culturalPreferences: userDetails.culturalPreferences,
                    }
                });

                next();
            } catch (error) {
                console.error('WebSocket authentication failed:', error);
                
                await this.auditService.logHealthcareEvent({
                    eventType: 'websocket_connection_failed',
                    ipAddress: socket.handshake.address,
                    userAgent: socket.handshake.headers['user-agent'],
                    success: false,
                    errorMessage: error instanceof Error ? error.message : 'Unknown error'
                });

                next(new Error('Authentication failed'));
            }
        });

        // Rate limiting middleware
        this.io.use((socket: Socket, next) => {
            // Simple rate limiting - can be enhanced with Redis-based rate limiting
            socket.data.lastActivity = Date.now();
            socket.data.messageCount = 0;
            next();
        });
    }

    private async fetchUserDetails(userId: string, userType: string): Promise<WebSocketUser | null> {
        try {
            const db = this.databaseService.getConnection();
            
            // Fetch user with cultural preferences
            const userQuery = `
                SELECT 
                    u.id as user_id,
                    u.user_type,
                    p.id as patient_id,
                    hp.id as provider_id,
                    cp.language,
                    cp.state,
                    cp.timezone,
                    cp.prayer_time_notifications,
                    cp.halal_medication_only,
                    array_agg(DISTINCT r.name) as roles,
                    array_agg(DISTINCT perm.permission_name) as permissions
                FROM users u
                LEFT JOIN patients p ON u.id = p.user_id
                LEFT JOIN healthcare_providers hp ON u.id = hp.user_id
                LEFT JOIN cultural_preferences cp ON u.id = cp.user_id
                LEFT JOIN user_roles ur ON u.id = ur.user_id
                LEFT JOIN roles r ON ur.role_id = r.id
                LEFT JOIN role_permissions rp ON r.id = rp.role_id
                LEFT JOIN permissions perm ON rp.permission_id = perm.id
                WHERE u.id = $1 AND u.user_type = $2
                GROUP BY u.id, u.user_type, p.id, hp.id, cp.language, cp.state, cp.timezone, cp.prayer_time_notifications, cp.halal_medication_only
            `;

            const result = await db.oneOrNone(userQuery, [userId, userType]);

            if (!result) {
                return null;
            }

            return {
                userId: result.user_id,
                userType: result.user_type,
                patientId: result.patient_id,
                providerId: result.provider_id,
                permissions: result.permissions || [],
                culturalPreferences: {
                    language: result.language || 'en',
                    state: result.state || 'KUL',
                    timezone: result.timezone || 'Asia/Kuala_Lumpur',
                    prayerTimeNotifications: result.prayer_time_notifications || false,
                    halalMedicationOnly: result.halal_medication_only || false,
                }
            };
        } catch (error) {
            console.error('Failed to fetch user details:', error);
            return null;
        }
    }

    private setupEventHandlers(): void {
        this.io.on('connection', async (socket: Socket) => {
            const user: WebSocketUser = socket.data.user;
            
            console.log(`✅ Healthcare WebSocket connected: ${user.userId} (${user.userType})`);
            
            // Store active connection
            this.activeConnections.set(socket.id, user);
            await this.redisService.trackActiveConnection(socket.id, {
                userId: user.userId,
                userType: user.userType,
                patientId: user.patientId,
                providerId: user.providerId,
                connectedAt: new Date().toISOString(),
                language: user.culturalPreferences.language
            });

            // Join user-specific rooms
            await this.joinUserRooms(socket, user);

            // Handle real-time subscriptions
            socket.on('subscribe_vitals', (data) => this.handleVitalSignsSubscription(socket, data));
            socket.on('subscribe_appointments', (data) => this.handleAppointmentSubscription(socket, data));
            socket.on('subscribe_medications', (data) => this.handleMedicationSubscription(socket, data));
            socket.on('subscribe_emergency_alerts', () => this.handleEmergencyAlertSubscription(socket));
            socket.on('send_provider_message', (data) => this.handleProviderMessage(socket, data));
            socket.on('update_cultural_preferences', (data) => this.handleCulturalPreferencesUpdate(socket, data));

            // Handle disconnection
            socket.on('disconnect', async (reason) => {
                console.log(`❌ Healthcare WebSocket disconnected: ${user.userId} - ${reason}`);
                
                this.activeConnections.delete(socket.id);
                await this.redisService.removeActiveConnection(socket.id);
                
                await this.auditService.logHealthcareEvent({
                    eventType: 'websocket_disconnection',
                    userId: user.userId,
                    userType: user.userType,
                    success: true,
                    metadata: { reason, socketId: socket.id }
                });
            });

            // Handle errors
            socket.on('error', async (error) => {
                console.error(`❌ WebSocket error for user ${user.userId}:`, error);
                
                await this.auditService.logHealthcareEvent({
                    eventType: 'websocket_error',
                    userId: user.userId,
                    userType: user.userType,
                    success: false,
                    errorMessage: error.message,
                    metadata: { socketId: socket.id }
                });
            });

            // Send welcome message with cultural context
            socket.emit('connection_established', {
                message: 'Connected to MediMate Malaysia Healthcare System',
                culturalGreeting: this.getCulturalGreeting(user.culturalPreferences.language),
                userType: user.userType,
                permissions: user.permissions,
                serverTime: new Date().toISOString()
            });
        });
    }

    private async joinUserRooms(socket: Socket, user: WebSocketUser): Promise<void> {
        const rooms: string[] = [];

        // Join general user room
        rooms.push(`user:${user.userId}`);

        // Join type-specific rooms
        if (user.userType === 'patient' && user.patientId) {
            rooms.push(`patient:${user.patientId}`);
        } else if (user.userType === 'healthcare_provider' && user.providerId) {
            rooms.push(`provider:${user.providerId}`);
        }

        // Join cultural context rooms
        rooms.push(`language:${user.culturalPreferences.language}`);
        rooms.push(`state:${user.culturalPreferences.state}`);

        // Join emergency rooms if appropriate permissions
        if (user.permissions.includes('emergency_alerts')) {
            rooms.push('emergency_alerts');
        }

        // Join the rooms
        for (const room of rooms) {
            await socket.join(room);
        }

        // Track rooms for this connection
        this.connectionRooms.set(socket.id, new Set(rooms));

        console.log(`📍 User ${user.userId} joined rooms:`, rooms);
    }

    private getCulturalGreeting(language: string): string {
        const greetings: Record<string, string> = {
            'ms': 'Selamat datang ke Sistem Kesihatan MediMate Malaysia',
            'en': 'Welcome to MediMate Malaysia Healthcare System',
            'zh': '欢迎使用马来西亚MediMate医疗保健系统',
            'ta': 'மலேசியா மெடிமேட் சுகாதார அமைப்பில் வரவேற்கிறோம்'
        };
        return greetings[language] || greetings['en'];
    }

    private async setupRedisSubscriptions(): Promise<void> {
        try {
            await this.redisService.connect();

            // Subscribe to healthcare event channels
            const channels = [
                'healthcare:vitals',
                'healthcare:appointments',
                'healthcare:medications',
                'healthcare:emergency',
                'healthcare:provider_notifications',
                'healthcare:cultural_events'
            ];

            for (const channel of channels) {
                await this.redisService.subscribeToHealthcareEvents(channel, (message) => {
                    this.handleRedisMessage(channel, message);
                });
            }

            console.log('✅ Redis subscriptions established for healthcare events');
        } catch (error) {
            console.error('❌ Failed to setup Redis subscriptions:', error);
        }
    }

    private handleRedisMessage(channel: string, message: string): void {
        try {
            const event: HealthcareEvent = JSON.parse(message);
            this.distributeHealthcareEvent(event);
        } catch (error) {
            console.error('Failed to parse Redis message:', error);
        }
    }

    // Event distribution methods
    private async distributeHealthcareEvent(event: HealthcareEvent): Promise<void> {
        try {
            // Determine target rooms based on event type and context
            const targetRooms = this.determineTargetRooms(event);
            
            // Distribute event to appropriate rooms
            for (const room of targetRooms) {
                const eventPayload = this.prepareEventPayload(event, room);
                this.io.to(room).emit('healthcare_event', eventPayload);
            }

            console.log(`📡 Distributed healthcare event ${event.eventId} to ${targetRooms.length} rooms`);

        } catch (error) {
            console.error('❌ Failed to distribute healthcare event:', error);
        }
    }

    private determineTargetRooms(event: HealthcareEvent): string[] {
        const rooms: string[] = [];

        switch (event.type) {
            case 'vital_signs':
                if (event.patientId) {
                    rooms.push(`patient:${event.patientId}`);
                    rooms.push(`vitals:${event.patientId}`);
                }
                if (event.providerId) {
                    rooms.push(`provider:${event.providerId}`);
                }
                break;

            case 'appointment_update':
                if (event.patientId) {
                    rooms.push(`patient:${event.patientId}`);
                    rooms.push(`appointments:patient:${event.patientId}`);
                }
                if (event.providerId) {
                    rooms.push(`provider:${event.providerId}`);
                    rooms.push(`appointments:provider:${event.providerId}`);
                }
                break;

            case 'medication_reminder':
                if (event.patientId) {
                    rooms.push(`patient:${event.patientId}`);
                    rooms.push(`medications:${event.patientId}`);
                }
                break;

            case 'emergency_alert':
                rooms.push('emergency_alerts');
                // Add state-specific emergency rooms if location context is available
                if (event.culturalContext) {
                    rooms.push('emergency_alerts:all_states');
                }
                break;

            case 'provider_notification':
                if (event.providerId) {
                    rooms.push(`provider:${event.providerId}`);
                }
                if (event.patientId) {
                    rooms.push(`patient:${event.patientId}`);
                }
                break;

            case 'cultural_event':
                // Distribute to language and state-specific rooms
                if (event.culturalContext) {
                    rooms.push(`language:${event.culturalContext.language || 'en'}`);
                    // Would add state-specific rooms based on event data
                }
                break;
        }

        return rooms;
    }

    private prepareEventPayload(event: HealthcareEvent, targetRoom: string): any {
        const basePayload = {
            eventId: event.eventId,
            type: event.type,
            priority: event.priority,
            timestamp: event.timestamp,
            data: event.data
        };

        // Add cultural context if available
        if (event.culturalContext) {
            basePayload.culturalContext = event.culturalContext;
        }

        // Add patient/provider context if relevant to the room
        if (targetRoom.startsWith('patient:') && event.patientId) {
            basePayload.patientId = event.patientId;
        }

        if (targetRoom.startsWith('provider:') && event.providerId) {
            basePayload.providerId = event.providerId;
        }

        return basePayload;
    }

    // Handler methods for the WebSocket service itself
    private async handleVitalSignsSubscription(socket: Socket, data: { patientId: string }): Promise<void> {
        const handlers = new (await import('./webSocketHandlers')).default();
        await handlers.handleVitalSignsSubscription(socket, data);
    }

    private async handleAppointmentSubscription(socket: Socket, data: { patientId?: string; providerId?: string }): Promise<void> {
        const handlers = new (await import('./webSocketHandlers')).default();
        await handlers.handleAppointmentSubscription(socket, data);
    }

    private async handleMedicationSubscription(socket: Socket, data: { patientId: string }): Promise<void> {
        const handlers = new (await import('./webSocketHandlers')).default();
        await handlers.handleMedicationSubscription(socket, data);
    }

    private async handleEmergencyAlertSubscription(socket: Socket): Promise<void> {
        const handlers = new (await import('./webSocketHandlers')).default();
        await handlers.handleEmergencyAlertSubscription(socket);
    }

    private async handleProviderMessage(socket: Socket, data: { recipientId: string; message: string; priority: 'low' | 'medium' | 'high' | 'critical' }): Promise<void> {
        const handlers = new (await import('./webSocketHandlers')).default();
        await handlers.handleProviderMessage(socket, data);
    }

    private async handleCulturalPreferencesUpdate(socket: Socket, data: any): Promise<void> {
        const handlers = new (await import('./webSocketHandlers')).default();
        await handlers.handleCulturalPreferencesUpdate(socket, data);
    }
    
    public getActiveConnectionsCount(): number {
        return this.activeConnections.size;
    }

    public getActiveUserTypes(): Record<string, number> {
        const counts: Record<string, number> = {};
        for (const user of this.activeConnections.values()) {
            counts[user.userType] = (counts[user.userType] || 0) + 1;
        }
        return counts;
    }

    public async broadcastToAllConnections(message: any): Promise<void> {
        this.io.emit('broadcast', message);
    }

    public async broadcastToUserType(userType: string, message: any): Promise<void> {
        for (const [socketId, user] of this.activeConnections.entries()) {
            if (user.userType === userType) {
                this.io.to(socketId).emit('broadcast', message);
            }
        }
    }

    public async sendToUser(userId: string, message: any): Promise<void> {
        this.io.to(`user:${userId}`).emit('direct_message', message);
    }

    public async sendToPatient(patientId: string, message: any): Promise<void> {
        this.io.to(`patient:${patientId}`).emit('patient_message', message);
    }

    public async sendToProvider(providerId: string, message: any): Promise<void> {
        this.io.to(`provider:${providerId}`).emit('provider_message', message);
    }
}

export default WebSocketService;