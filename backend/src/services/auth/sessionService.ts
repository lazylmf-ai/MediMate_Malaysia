/**
 * Session Management Service
 * 
 * Cultural-aware session management for Malaysian healthcare
 * with prayer time considerations, cultural preferences, and security.
 */

import crypto from 'crypto';
import moment from 'moment-timezone';
import { DatabaseService } from '../database/databaseService';
import { AuditService } from '../audit/auditService';

export interface UserSession {
    id: string;
    userId: string;
    sessionTokenHash: string;
    ipAddress: string;
    userAgent: string;
    deviceFingerprint?: string;
    
    // Location and cultural context
    locationCity?: string;
    locationState?: string;
    timezone: string;
    
    // Cultural session preferences
    activeLanguage: string;
    prayerTimesEnabled: boolean;
    culturalCalendarActive: boolean;
    
    // Session timing
    createdAt: Date;
    lastActivity: Date;
    expiresAt: Date;
    
    // Session status
    active: boolean;
    logoutType?: string;
    logoutReason?: string;
    
    // Security flags
    mfaVerified: boolean;
    highRiskSession: boolean;
    emergencyAccessUsed: boolean;
}

export interface SessionOptions {
    maxDurationHours?: number;
    extendOnActivity?: boolean;
    requireMFA?: boolean;
    culturalAware?: boolean;
    deviceTracking?: boolean;
    concurrentSessionsLimit?: number;
}

export interface CulturalTimeConstraints {
    prayerTimes: {
        fajr: string;
        dhuhr: string;
        asr: string;
        maghrib: string;
        isha: string;
    };
    ramadanActive: boolean;
    culturalHolidays: string[];
    workingHours: {
        start: string;
        end: string;
        breakTimes: Array<{ start: string; end: string; reason: string }>;
    };
}

export class SessionService {
    private static instance: SessionService;
    private dbService: DatabaseService;
    private auditService: AuditService;
    private activeSessions: Map<string, UserSession> = new Map();

    // Malaysian prayer time API cache
    private prayerTimeCache: Map<string, any> = new Map();

    constructor() {
        this.dbService = DatabaseService.getInstance();
        this.auditService = AuditService.getInstance();
        
        // Cleanup expired sessions every 15 minutes
        setInterval(() => this.cleanupExpiredSessions(), 15 * 60 * 1000);
        
        // Refresh prayer times cache daily
        setInterval(() => this.refreshPrayerTimes(), 24 * 60 * 60 * 1000);
    }

    public static getInstance(): SessionService {
        if (!SessionService.instance) {
            SessionService.instance = new SessionService();
        }
        return SessionService.instance;
    }

    /**
     * Create new user session with cultural preferences
     */
    async createSession(
        userId: string,
        ipAddress: string,
        userAgent: string,
        options: SessionOptions = {},
        culturalPreferences?: any
    ): Promise<{ sessionId: string; sessionToken: string; expiresAt: Date }> {
        const db = this.dbService.getConnection();

        try {
            // Get user cultural profile
            const user = await db.oneOrNone(`
                SELECT preferred_language, cultural_profile, location 
                FROM users WHERE id = $1
            `, [userId]);

            if (!user) {
                throw new Error('User not found');
            }

            // Check concurrent session limits
            if (options.concurrentSessionsLimit) {
                await this.enforceConcurrentSessionLimit(userId, options.concurrentSessionsLimit);
            }

            // Generate session token and ID
            const sessionToken = crypto.randomBytes(32).toString('hex');
            const sessionTokenHash = crypto.createHash('sha256').update(sessionToken).digest('hex');
            const sessionId = crypto.randomUUID();

            // Calculate session expiration with cultural considerations
            const expiresAt = await this.calculateSessionExpiry(
                userId,
                options.maxDurationHours || 8,
                user.location?.timezone || 'Asia/Kuala_Lumpur',
                user.cultural_profile
            );

            // Generate device fingerprint
            const deviceFingerprint = this.generateDeviceFingerprint(userAgent, ipAddress);

            // Determine location from IP (simplified)
            const location = await this.getLocationFromIP(ipAddress);

            // Create session record
            const session = await db.one(`
                INSERT INTO user_sessions (
                    id, user_id, session_token_hash, ip_address, user_agent, device_fingerprint,
                    location_city, location_state, timezone,
                    active_language, prayer_times_enabled, cultural_calendar_active,
                    created_at, last_activity, expires_at,
                    active, mfa_verified, high_risk_session, emergency_access_used
                ) VALUES (
                    $1, $2, $3, $4, $5, $6,
                    $7, $8, $9,
                    $10, $11, $12,
                    NOW(), NOW(), $13,
                    TRUE, $14, $15, FALSE
                ) RETURNING *
            `, [
                sessionId,
                userId,
                sessionTokenHash,
                ipAddress,
                userAgent,
                deviceFingerprint,
                location.city,
                location.state,
                user.location?.timezone || 'Asia/Kuala_Lumpur',
                culturalPreferences?.language || user.preferred_language || 'ms',
                culturalPreferences?.prayerTimes || user.cultural_profile?.prayer_times_enabled || false,
                culturalPreferences?.culturalCalendar || false,
                expiresAt,
                options.requireMFA || false,
                this.assessSessionRisk(ipAddress, userAgent, user)
            ]);

            // Cache session in memory
            const userSession: UserSession = this.mapDbSessionToUserSession(session);
            this.activeSessions.set(sessionTokenHash, userSession);

            // Audit log
            await this.auditService.logEvent({
                eventType: 'session_created',
                userId,
                description: 'User session created',
                metadata: {
                    sessionId,
                    ipAddress,
                    location,
                    culturalPreferences,
                    expiresAt,
                    mfaRequired: options.requireMFA
                },
                ipAddress,
                userAgent
            });

            return {
                sessionId,
                sessionToken,
                expiresAt
            };

        } catch (error) {
            console.error('Session creation error:', error);
            throw new Error('Failed to create session');
        }
    }

    /**
     * Validate and refresh session
     */
    async validateSession(sessionToken: string): Promise<UserSession | null> {
        const sessionTokenHash = crypto.createHash('sha256').update(sessionToken).digest('hex');
        
        // Check memory cache first
        let session = this.activeSessions.get(sessionTokenHash);
        if (session && new Date() > session.expiresAt) {
            this.activeSessions.delete(sessionTokenHash);
            session = null;
        }

        // If not in cache or expired, check database
        if (!session) {
            const db = this.dbService.getConnection();
            const dbSession = await db.oneOrNone(`
                SELECT * FROM user_sessions 
                WHERE session_token_hash = $1 AND active = TRUE AND expires_at > NOW()
            `, [sessionTokenHash]);

            if (!dbSession) {
                return null;
            }

            session = this.mapDbSessionToUserSession(dbSession);
            this.activeSessions.set(sessionTokenHash, session);
        }

        // Check cultural time constraints
        const culturalCheck = await this.checkCulturalTimeConstraints(session);
        if (!culturalCheck.allowed) {
            // Don't invalidate session, just return constraint info
            session.culturalConstraint = culturalCheck;
        }

        // Update last activity
        await this.updateLastActivity(session.id);
        session.lastActivity = new Date();

        return session;
    }

    /**
     * Extend session with cultural considerations
     */
    async extendSession(
        sessionToken: string,
        extensionHours: number = 2
    ): Promise<{ success: boolean; newExpiresAt?: Date; culturalConstraints?: any }> {
        const sessionTokenHash = crypto.createHash('sha256').update(sessionToken).digest('hex');
        const session = this.activeSessions.get(sessionTokenHash);

        if (!session) {
            return { success: false };
        }

        const db = this.dbService.getConnection();

        try {
            // Get cultural constraints for extension
            const constraints = await this.getCulturalTimeConstraints(
                session.userId,
                session.locationCity || 'Kuala Lumpur',
                session.timezone
            );

            // Calculate new expiry considering cultural factors
            const newExpiresAt = await this.calculateCulturalAwareExpiry(
                session.expiresAt,
                extensionHours,
                constraints,
                session.timezone
            );

            // Update database
            await db.none(`
                UPDATE user_sessions 
                SET expires_at = $1, updated_at = NOW()
                WHERE id = $2
            `, [newExpiresAt, session.id]);

            // Update cached session
            session.expiresAt = newExpiresAt;
            this.activeSessions.set(sessionTokenHash, session);

            // Audit log
            await this.auditService.logEvent({
                eventType: 'session_extended',
                userId: session.userId,
                description: `Session extended by ${extensionHours} hours`,
                metadata: {
                    sessionId: session.id,
                    oldExpiresAt: session.expiresAt,
                    newExpiresAt,
                    extensionHours,
                    culturalConstraints: constraints
                }
            });

            return {
                success: true,
                newExpiresAt,
                culturalConstraints: constraints
            };

        } catch (error) {
            console.error('Session extension error:', error);
            return { success: false };
        }
    }

    /**
     * Terminate session
     */
    async terminateSession(
        sessionToken: string,
        logoutType: 'manual' | 'timeout' | 'force' | 'security' = 'manual',
        reason?: string
    ): Promise<boolean> {
        const sessionTokenHash = crypto.createHash('sha256').update(sessionToken).digest('hex');
        const session = this.activeSessions.get(sessionTokenHash);

        const db = this.dbService.getConnection();

        try {
            // Update database
            await db.none(`
                UPDATE user_sessions 
                SET active = FALSE, logout_type = $1, logout_reason = $2, updated_at = NOW()
                WHERE session_token_hash = $3
            `, [logoutType, reason || `Logout: ${logoutType}`, sessionTokenHash]);

            // Remove from cache
            this.activeSessions.delete(sessionTokenHash);

            // Audit log
            if (session) {
                await this.auditService.logEvent({
                    eventType: 'session_terminated',
                    userId: session.userId,
                    description: `Session terminated: ${logoutType}`,
                    metadata: {
                        sessionId: session.id,
                        logoutType,
                        reason,
                        duration: Date.now() - session.createdAt.getTime()
                    }
                });
            }

            return true;

        } catch (error) {
            console.error('Session termination error:', error);
            return false;
        }
    }

    /**
     * Get all active sessions for user
     */
    async getUserSessions(userId: string): Promise<UserSession[]> {
        const db = this.dbService.getConnection();

        const sessions = await db.manyOrNone(`
            SELECT * FROM user_sessions 
            WHERE user_id = $1 AND active = TRUE AND expires_at > NOW()
            ORDER BY last_activity DESC
        `, [userId]);

        return sessions.map(session => this.mapDbSessionToUserSession(session));
    }

    /**
     * Terminate all sessions for user
     */
    async terminateAllUserSessions(
        userId: string,
        excludeSessionToken?: string,
        reason: string = 'Security: All sessions terminated'
    ): Promise<number> {
        const db = this.dbService.getConnection();

        try {
            let query = `
                UPDATE user_sessions 
                SET active = FALSE, logout_type = 'security', logout_reason = $2, updated_at = NOW()
                WHERE user_id = $1 AND active = TRUE
            `;
            const params = [userId, reason];

            if (excludeSessionToken) {
                const excludeHash = crypto.createHash('sha256').update(excludeSessionToken).digest('hex');
                query += ' AND session_token_hash != $3';
                params.push(excludeHash);
            }

            const result = await db.result(query, params);

            // Clear memory cache for this user
            for (const [hash, session] of this.activeSessions.entries()) {
                if (session.userId === userId) {
                    if (!excludeSessionToken || hash !== crypto.createHash('sha256').update(excludeSessionToken).digest('hex')) {
                        this.activeSessions.delete(hash);
                    }
                }
            }

            // Audit log
            await this.auditService.logEvent({
                eventType: 'all_sessions_terminated',
                userId,
                description: `All sessions terminated for user`,
                metadata: {
                    reason,
                    sessionsTerminated: result.rowCount,
                    excludedSession: !!excludeSessionToken
                }
            });

            return result.rowCount;

        } catch (error) {
            console.error('Terminate all sessions error:', error);
            return 0;
        }
    }

    /**
     * Private helper methods
     */
    private async calculateSessionExpiry(
        userId: string,
        maxDurationHours: number,
        timezone: string,
        culturalProfile: any
    ): Promise<Date> {
        const now = moment().tz(timezone);
        let expiryTime = now.clone().add(maxDurationHours, 'hours');

        // Adjust for prayer times if enabled
        if (culturalProfile?.prayer_times_enabled) {
            const prayerTimes = await this.getPrayerTimes('Kuala Lumpur', now.format('YYYY-MM-DD'));
            if (prayerTimes) {
                // Check if expiry falls during prayer time, extend slightly
                const maghribTime = moment.tz(`${now.format('YYYY-MM-DD')} ${prayerTimes.maghrib}`, timezone);
                const ishaTime = moment.tz(`${now.format('YYYY-MM-DD')} ${prayerTimes.isha}`, timezone);

                if (expiryTime.isBetween(maghribTime, ishaTime)) {
                    expiryTime = ishaTime.add(15, 'minutes'); // 15 minutes after Isha
                }
            }
        }

        // Adjust for Ramadan during iftar time
        if (this.isRamadanPeriod() && culturalProfile?.fasting_periods?.includes('ramadan')) {
            const ramadanBreakTime = moment.tz(now.format('YYYY-MM-DD') + ' 19:30', timezone);
            if (expiryTime.isBetween(ramadanBreakTime.subtract(30, 'minutes'), ramadanBreakTime.add(60, 'minutes'))) {
                expiryTime = ramadanBreakTime.add(90, 'minutes'); // Extend past iftar
            }
        }

        return expiryTime.toDate();
    }

    private async calculateCulturalAwareExpiry(
        currentExpiry: Date,
        extensionHours: number,
        constraints: CulturalTimeConstraints,
        timezone: string
    ): Promise<Date> {
        const currentExpiryMoment = moment(currentExpiry).tz(timezone);
        let newExpiry = currentExpiryMoment.add(extensionHours, 'hours');

        // Avoid extending into prayer times
        if (constraints.prayerTimes) {
            const maghribTime = moment.tz(newExpiry.format('YYYY-MM-DD') + ' ' + constraints.prayerTimes.maghrib, timezone);
            const ishaTime = moment.tz(newExpiry.format('YYYY-MM-DD') + ' ' + constraints.prayerTimes.isha, timezone);

            if (newExpiry.isBetween(maghribTime, ishaTime)) {
                newExpiry = ishaTime.add(15, 'minutes');
            }
        }

        return newExpiry.toDate();
    }

    private async checkCulturalTimeConstraints(session: UserSession): Promise<{
        allowed: boolean;
        reason?: string;
        suggestedTime?: Date;
        constraints?: CulturalTimeConstraints;
    }> {
        if (!session.prayerTimesEnabled) {
            return { allowed: true };
        }

        const now = moment().tz(session.timezone);
        const constraints = await this.getCulturalTimeConstraints(
            session.userId,
            session.locationCity || 'Kuala Lumpur',
            session.timezone
        );

        // Check prayer times
        if (constraints.prayerTimes) {
            const currentTime = now.format('HH:mm');
            
            // Check if current time falls within prayer time windows (±15 minutes)
            for (const [prayer, time] of Object.entries(constraints.prayerTimes)) {
                const prayerMoment = moment.tz(now.format('YYYY-MM-DD') + ' ' + time, session.timezone);
                const prayerStart = prayerMoment.subtract(10, 'minutes');
                const prayerEnd = prayerMoment.add(20, 'minutes');

                if (now.isBetween(prayerStart, prayerEnd)) {
                    return {
                        allowed: false,
                        reason: `System access limited during ${prayer} prayer time`,
                        suggestedTime: prayerEnd.toDate(),
                        constraints
                    };
                }
            }
        }

        // Check Ramadan iftar time
        if (constraints.ramadanActive) {
            const iftarTime = moment.tz(now.format('YYYY-MM-DD') + ' 19:30', session.timezone);
            const iftarStart = iftarTime.subtract(15, 'minutes');
            const iftarEnd = iftarTime.add(45, 'minutes');

            if (now.isBetween(iftarStart, iftarEnd)) {
                return {
                    allowed: false,
                    reason: 'System access limited during iftar time',
                    suggestedTime: iftarEnd.toDate(),
                    constraints
                };
            }
        }

        return { allowed: true, constraints };
    }

    private async getCulturalTimeConstraints(
        userId: string,
        city: string,
        timezone: string
    ): Promise<CulturalTimeConstraints> {
        // Get prayer times (cached)
        const today = moment().tz(timezone).format('YYYY-MM-DD');
        const prayerTimes = await this.getPrayerTimes(city, today);

        return {
            prayerTimes: prayerTimes || {
                fajr: '05:30',
                dhuhr: '13:15',
                asr: '16:30',
                maghrib: '19:15',
                isha: '20:30'
            },
            ramadanActive: this.isRamadanPeriod(),
            culturalHolidays: [],
            workingHours: {
                start: '08:00',
                end: '17:00',
                breakTimes: [
                    { start: '12:00', end: '13:00', reason: 'Lunch break' },
                    { start: '13:15', end: '13:30', reason: 'Dhuhr prayer' },
                    { start: '16:30', end: '16:45', reason: 'Asr prayer' }
                ]
            }
        };
    }

    private async getPrayerTimes(city: string, date: string): Promise<any> {
        const cacheKey = `${city}_${date}`;
        if (this.prayerTimeCache.has(cacheKey)) {
            return this.prayerTimeCache.get(cacheKey);
        }

        // In a real implementation, this would call Malaysian prayer time API
        // For now, return default times
        const defaultTimes = {
            fajr: '05:30',
            dhuhr: '13:15',
            asr: '16:30',
            maghrib: '19:15',
            isha: '20:30'
        };

        this.prayerTimeCache.set(cacheKey, defaultTimes);
        return defaultTimes;
    }

    private isRamadanPeriod(): boolean {
        // This would integrate with Islamic calendar API
        // For now, return false as placeholder
        return false;
    }

    private async enforceConcurrentSessionLimit(userId: string, limit: number): Promise<void> {
        const db = this.dbService.getConnection();

        const activeSessions = await db.manyOrNone(`
            SELECT id FROM user_sessions 
            WHERE user_id = $1 AND active = TRUE AND expires_at > NOW()
            ORDER BY last_activity ASC
        `, [userId]);

        if (activeSessions.length >= limit) {
            // Terminate oldest sessions
            const sessionsToTerminate = activeSessions.slice(0, activeSessions.length - limit + 1);
            
            for (const session of sessionsToTerminate) {
                await db.none(`
                    UPDATE user_sessions 
                    SET active = FALSE, logout_type = 'force', logout_reason = 'Concurrent session limit exceeded'
                    WHERE id = $1
                `, [session.id]);
            }
        }
    }

    private generateDeviceFingerprint(userAgent: string, ipAddress: string): string {
        return crypto.createHash('md5')
            .update(userAgent + ipAddress)
            .digest('hex');
    }

    private async getLocationFromIP(ipAddress: string): Promise<{ city: string; state: string }> {
        // Simplified location detection
        // In production, use IP geolocation service
        return {
            city: 'Kuala Lumpur',
            state: 'Federal Territory of Kuala Lumpur'
        };
    }

    private assessSessionRisk(ipAddress: string, userAgent: string, user: any): boolean {
        // Simple risk assessment
        // In production, implement comprehensive risk scoring
        
        // Check for suspicious patterns
        if (userAgent.includes('bot') || userAgent.includes('crawler')) {
            return true;
        }

        // Check IP patterns
        if (ipAddress.startsWith('10.') || ipAddress.startsWith('192.168.')) {
            return false; // Internal network, lower risk
        }

        return false;
    }

    private mapDbSessionToUserSession(dbSession: any): UserSession {
        return {
            id: dbSession.id,
            userId: dbSession.user_id,
            sessionTokenHash: dbSession.session_token_hash,
            ipAddress: dbSession.ip_address,
            userAgent: dbSession.user_agent,
            deviceFingerprint: dbSession.device_fingerprint,
            locationCity: dbSession.location_city,
            locationState: dbSession.location_state,
            timezone: dbSession.timezone,
            activeLanguage: dbSession.active_language,
            prayerTimesEnabled: dbSession.prayer_times_enabled,
            culturalCalendarActive: dbSession.cultural_calendar_active,
            createdAt: new Date(dbSession.created_at),
            lastActivity: new Date(dbSession.last_activity),
            expiresAt: new Date(dbSession.expires_at),
            active: dbSession.active,
            logoutType: dbSession.logout_type,
            logoutReason: dbSession.logout_reason,
            mfaVerified: dbSession.mfa_verified,
            highRiskSession: dbSession.high_risk_session,
            emergencyAccessUsed: dbSession.emergency_access_used
        };
    }

    private async updateLastActivity(sessionId: string): Promise<void> {
        const db = this.dbService.getConnection();
        await db.none(`
            UPDATE user_sessions 
            SET last_activity = NOW()
            WHERE id = $1
        `, [sessionId]);
    }

    private async cleanupExpiredSessions(): Promise<void> {
        const db = this.dbService.getConnection();
        
        try {
            // Update expired sessions in database
            await db.none(`
                UPDATE user_sessions 
                SET active = FALSE, logout_type = 'timeout', logout_reason = 'Session expired'
                WHERE active = TRUE AND expires_at <= NOW()
            `);

            // Clean up memory cache
            const now = new Date();
            for (const [hash, session] of this.activeSessions.entries()) {
                if (now > session.expiresAt) {
                    this.activeSessions.delete(hash);
                }
            }

        } catch (error) {
            console.error('Session cleanup error:', error);
        }
    }

    private async refreshPrayerTimes(): Promise<void> {
        this.prayerTimeCache.clear();
        // Would refresh from API in production
    }
}

export default SessionService;