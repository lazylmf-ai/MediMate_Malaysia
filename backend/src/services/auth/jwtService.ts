/**
 * JWT Service
 * 
 * JWT token management with Malaysian healthcare compliance
 * and cultural intelligence integration.
 */

import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { 
    JWT_CONFIG, 
    TokenClaims, 
    DEFAULT_ROLE_PERMISSIONS,
    CULTURAL_TOKEN_SETTINGS,
    EMERGENCY_ACCESS_CONFIG
} from '../../config/auth/jwtConfig';
import { DatabaseService } from '../database/databaseService';
import { AuditService } from '../audit/auditService';

export interface TokenPair {
    accessToken: string;
    refreshToken: string;
    tokenId: string;
    expiresAt: Date;
    refreshExpiresAt: Date;
}

export interface TokenValidationResult {
    valid: boolean;
    decoded?: TokenClaims;
    error?: string;
    requiresRefresh?: boolean;
    userId?: string;
    sessionId?: string;
}

export interface EmergencyAccessToken extends TokenClaims {
    emergencyType: string;
    emergencyReason: string;
    emergencyCode: string;
    emergencyExpiry: number;
    breakGlass: boolean;
}

export class JWTService {
    private static instance: JWTService;
    private dbService: DatabaseService;
    private auditService: AuditService;

    constructor() {
        this.dbService = DatabaseService.getInstance();
        this.auditService = AuditService.getInstance();
    }

    public static getInstance(): JWTService {
        if (!JWTService.instance) {
            JWTService.instance = new JWTService();
        }
        return JWTService.instance;
    }

    /**
     * Generate JWT token pair for authenticated user
     */
    async generateTokenPair(
        userId: string,
        sessionId: string,
        userRole: string,
        additionalClaims: Partial<TokenClaims> = {}
    ): Promise<TokenPair> {
        const db = this.dbService.getConnection();

        // Get user's permissions and cultural profile
        const userInfo = await db.oneOrNone(`
            SELECT 
                u.preferred_language, u.cultural_profile, u.location,
                ua.healthcare_role_id, hr.role_name, hr.role_code,
                ua.medical_license_number, ua.mmc_registration_number
            FROM users u
            JOIN user_authentication ua ON u.id = ua.user_id
            LEFT JOIN healthcare_roles hr ON ua.healthcare_role_id = hr.id
            WHERE u.id = $1
        `, [userId]);

        const permissions = DEFAULT_ROLE_PERMISSIONS[userRole] || [];
        const tokenId = crypto.randomUUID();

        // Build token claims
        const now = Math.floor(Date.now() / 1000);
        const accessExpiry = now + this.parseExpiryToSeconds(JWT_CONFIG.accessTokenExpiry);
        const refreshExpiry = now + this.parseExpiryToSeconds(JWT_CONFIG.refreshTokenExpiry);

        const claims: TokenClaims = {
            userId,
            sessionId,
            role: userRole,
            permissions,
            healthcareRole: userInfo?.role_name,
            licenseNumber: userInfo?.medical_license_number || userInfo?.mmc_registration_number,
            
            // Cultural preferences
            language: userInfo?.preferred_language || 'ms',
            timezone: userInfo?.location?.timezone || 'Asia/Kuala_Lumpur',
            culturalProfile: {
                prayerTimes: userInfo?.cultural_profile?.prayer_times_enabled || false,
                fasting: false, // Will be dynamically set during Ramadan
                culturalHolidays: userInfo?.cultural_profile?.cultural_holidays || []
            },
            
            // Standard JWT claims
            iss: JWT_CONFIG.issuer,
            aud: JWT_CONFIG.audience,
            sub: userId,
            iat: now,
            exp: accessExpiry,
            jti: tokenId,
            
            ...additionalClaims
        };

        // Generate tokens
        const accessToken = jwt.sign(claims, JWT_CONFIG.secret, {
            algorithm: JWT_CONFIG.algorithmn as any,
            issuer: JWT_CONFIG.issuer,
            audience: JWT_CONFIG.audience
        });

        const refreshClaims = {
            userId,
            sessionId,
            type: 'refresh',
            iss: JWT_CONFIG.issuer,
            aud: JWT_CONFIG.audience,
            sub: userId,
            iat: now,
            exp: refreshExpiry,
            jti: tokenId + '_refresh'
        };

        const refreshToken = jwt.sign(refreshClaims, JWT_CONFIG.refreshSecret, {
            algorithm: JWT_CONFIG.algorithmn as any,
            issuer: JWT_CONFIG.issuer,
            audience: JWT_CONFIG.audience
        });

        // Store token metadata in database
        await this.storeTokenMetadata(tokenId, userId, sessionId, accessExpiry, refreshExpiry);

        // Audit log
        await this.auditService.logEvent({
            eventType: 'jwt_token_generated',
            userId,
            description: 'JWT token pair generated',
            metadata: {
                tokenId,
                sessionId,
                role: userRole,
                permissions: permissions.length,
                culturalSettings: claims.culturalProfile
            }
        });

        return {
            accessToken,
            refreshToken,
            tokenId,
            expiresAt: new Date(accessExpiry * 1000),
            refreshExpiresAt: new Date(refreshExpiry * 1000)
        };
    }

    /**
     * Validate JWT token
     */
    async validateToken(token: string): Promise<TokenValidationResult> {
        try {
            // Verify and decode token
            const decoded = jwt.verify(token, JWT_CONFIG.secret, {
                algorithms: [JWT_CONFIG.algorithmn as any],
                issuer: JWT_CONFIG.issuer,
                audience: JWT_CONFIG.audience,
                clockTolerance: JWT_CONFIG.clockTolerance
            }) as TokenClaims;

            // Check if token is in database and not revoked
            const tokenValid = await this.isTokenValid(decoded.jti, decoded.userId, decoded.sessionId);
            if (!tokenValid) {
                return {
                    valid: false,
                    error: 'Token has been revoked',
                    userId: decoded.userId,
                    sessionId: decoded.sessionId
                };
            }

            // Check if token is close to expiry (within 30 minutes)
            const now = Math.floor(Date.now() / 1000);
            const requiresRefresh = decoded.exp - now < 1800; // 30 minutes

            return {
                valid: true,
                decoded,
                requiresRefresh,
                userId: decoded.userId,
                sessionId: decoded.sessionId
            };

        } catch (error) {
            let errorMessage = 'Invalid token';
            
            if (error instanceof jwt.JsonWebTokenError) {
                errorMessage = error.message;
            } else if (error instanceof jwt.TokenExpiredError) {
                errorMessage = 'Token has expired';
            } else if (error instanceof jwt.NotBeforeError) {
                errorMessage = 'Token not active yet';
            }

            return {
                valid: false,
                error: errorMessage
            };
        }
    }

    /**
     * Refresh token pair using refresh token
     */
    async refreshTokenPair(refreshToken: string, sessionId: string): Promise<TokenPair | null> {
        try {
            // Verify refresh token
            const decoded = jwt.verify(refreshToken, JWT_CONFIG.refreshSecret, {
                algorithms: [JWT_CONFIG.algorithmn as any],
                issuer: JWT_CONFIG.issuer,
                audience: JWT_CONFIG.audience
            }) as any;

            if (decoded.type !== 'refresh') {
                throw new Error('Invalid refresh token type');
            }

            // Check if refresh token is valid
            const tokenId = decoded.jti.replace('_refresh', '');
            const tokenValid = await this.isTokenValid(tokenId, decoded.userId, sessionId);
            if (!tokenValid) {
                return null;
            }

            // Get current user role
            const db = this.dbService.getConnection();
            const userAuth = await db.oneOrNone(`
                SELECT hr.role_name
                FROM user_authentication ua
                JOIN healthcare_roles hr ON ua.healthcare_role_id = hr.id
                WHERE ua.user_id = $1
            `, [decoded.userId]);

            // Revoke old token
            await this.revokeToken(tokenId);

            // Generate new token pair
            const newTokenPair = await this.generateTokenPair(
                decoded.userId,
                sessionId,
                userAuth?.role_name || 'patient'
            );

            // Audit log
            await this.auditService.logEvent({
                eventType: 'jwt_token_refreshed',
                userId: decoded.userId,
                description: 'JWT token pair refreshed',
                metadata: {
                    oldTokenId: tokenId,
                    newTokenId: newTokenPair.tokenId,
                    sessionId
                }
            });

            return newTokenPair;

        } catch (error) {
            console.error('Token refresh error:', error);
            return null;
        }
    }

    /**
     * Generate emergency access token
     */
    async generateEmergencyToken(
        requestingUserId: string,
        patientUserId: string,
        emergencyType: string,
        emergencyReason: string,
        breakGlass: boolean = false
    ): Promise<string> {
        const db = this.dbService.getConnection();

        // Get requesting user info
        const requester = await db.oneOrNone(`
            SELECT 
                u.full_name, u.email,
                ua.healthcare_role_id, hr.role_name, hr.emergency_access_level
            FROM users u
            JOIN user_authentication ua ON u.id = ua.user_id
            JOIN healthcare_roles hr ON ua.healthcare_role_id = hr.id
            WHERE u.id = $1
        `, [requestingUserId]);

        if (!requester || requester.emergency_access_level < 2) {
            throw new Error('Insufficient permissions for emergency access');
        }

        // Generate emergency code
        const emergencyCode = crypto.randomBytes(8).toString('hex').toUpperCase();

        const now = Math.floor(Date.now() / 1000);
        const emergencyExpiry = now + this.parseExpiryToSeconds(EMERGENCY_ACCESS_CONFIG.emergencyTokenExpiry);

        const emergencyClaims: EmergencyAccessToken = {
            userId: requestingUserId,
            sessionId: `emergency_${crypto.randomUUID()}`,
            role: requester.role_name,
            permissions: ['emergency_access', 'view_full_records', 'create_medical_records'],
            
            emergencyType,
            emergencyReason,
            emergencyCode,
            emergencyExpiry,
            breakGlass,
            
            // Standard claims
            language: 'en', // Emergency tokens use English for consistency
            timezone: 'Asia/Kuala_Lumpur',
            iss: JWT_CONFIG.issuer,
            aud: JWT_CONFIG.audience,
            sub: requestingUserId,
            iat: now,
            exp: emergencyExpiry,
            jti: `emergency_${crypto.randomUUID()}`
        };

        const emergencyToken = jwt.sign(emergencyClaims, JWT_CONFIG.secret, {
            algorithm: JWT_CONFIG.algorithmn as any,
            issuer: JWT_CONFIG.issuer,
            audience: JWT_CONFIG.audience
        });

        // Log emergency access
        await db.none(`
            INSERT INTO emergency_access_log (
                accessing_user_id, patient_user_id, emergency_type,
                emergency_description, justification, authorization_code,
                legal_basis, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, 'vital_interest', NOW())
        `, [
            requestingUserId, 
            patientUserId, 
            emergencyType,
            emergencyReason,
            emergencyReason,
            emergencyCode
        ]);

        // Audit log
        await this.auditService.logEvent({
            eventType: 'emergency_token_generated',
            userId: requestingUserId,
            description: `Emergency access token generated: ${emergencyType}`,
            metadata: {
                patientUserId,
                emergencyType,
                emergencyCode,
                breakGlass,
                requesterRole: requester.role_name
            }
        });

        return emergencyToken;
    }

    /**
     * Revoke token
     */
    async revokeToken(tokenId: string): Promise<void> {
        const db = this.dbService.getConnection();

        try {
            // Mark token as inactive
            await db.none(`
                UPDATE api_tokens 
                SET active = FALSE, updated_at = NOW()
                WHERE token_prefix = $1 OR id = $1::uuid
            `, [tokenId]);

            // Also invalidate sessions using this token
            await db.none(`
                UPDATE user_sessions
                SET active = FALSE, logout_type = 'revoked', logout_reason = 'Token revoked'
                WHERE id = (
                    SELECT session_id FROM api_tokens WHERE token_prefix = $1 OR id = $1::uuid
                )
            `, [tokenId]);

        } catch (error) {
            console.error('Token revocation error:', error);
        }
    }

    /**
     * Revoke all tokens for user
     */
    async revokeAllUserTokens(userId: string, reason: string = 'security'): Promise<void> {
        const db = this.dbService.getConnection();

        try {
            // Revoke all API tokens
            await db.none(`
                UPDATE api_tokens 
                SET active = FALSE, updated_at = NOW()
                WHERE user_id = $1 AND active = TRUE
            `, [userId]);

            // Invalidate all sessions
            await db.none(`
                UPDATE user_sessions
                SET active = FALSE, logout_type = 'revoked', logout_reason = $2
                WHERE user_id = $1 AND active = TRUE
            `, [userId, `All tokens revoked: ${reason}`]);

            // Audit log
            await this.auditService.logEvent({
                eventType: 'all_tokens_revoked',
                userId,
                description: `All tokens revoked for user: ${reason}`,
                metadata: { reason }
            });

        } catch (error) {
            console.error('All tokens revocation error:', error);
        }
    }

    /**
     * Check if token is culturally appropriate (prayer times, etc.)
     */
    async isCulturallyAppropriate(token: string): Promise<boolean> {
        const validation = await this.validateToken(token);
        if (!validation.valid || !validation.decoded) {
            return false;
        }

        const { culturalProfile, timezone } = validation.decoded;
        
        // If prayer times are enabled, check current time
        if (culturalProfile?.prayerTimes) {
            const now = new Date();
            // Implementation would check against prayer times API
            // For now, return true
        }

        return true;
    }

    /**
     * Private helper methods
     */
    private parseExpiryToSeconds(expiry: string): number {
        const match = expiry.match(/^(\d+)([smhd])$/);
        if (!match) {
            throw new Error('Invalid expiry format');
        }

        const value = parseInt(match[1]);
        const unit = match[2];

        switch (unit) {
            case 's': return value;
            case 'm': return value * 60;
            case 'h': return value * 60 * 60;
            case 'd': return value * 60 * 60 * 24;
            default: throw new Error('Invalid expiry unit');
        }
    }

    private async storeTokenMetadata(
        tokenId: string,
        userId: string,
        sessionId: string,
        accessExpiry: number,
        refreshExpiry: number
    ): Promise<void> {
        const db = this.dbService.getConnection();

        await db.none(`
            INSERT INTO api_tokens (
                id, user_id, token_name, token_hash, token_prefix,
                scopes, expires_at, created_at, active
            ) VALUES (
                $1::uuid, $2::uuid, 'Session Token', $3, $4,
                ARRAY['access'], $5, NOW(), TRUE
            )
        `, [
            tokenId,
            userId,
            crypto.createHash('sha256').update(tokenId).digest('hex'),
            tokenId.substring(0, 8),
            new Date(accessExpiry * 1000)
        ]);
    }

    private async isTokenValid(tokenId: string, userId: string, sessionId: string): Promise<boolean> {
        const db = this.dbService.getConnection();

        const result = await db.oneOrNone(`
            SELECT t.active as token_active, s.active as session_active
            FROM api_tokens t
            LEFT JOIN user_sessions s ON s.user_id = t.user_id
            WHERE (t.id = $1::uuid OR t.token_prefix = $1) 
              AND t.user_id = $2::uuid 
              AND t.expires_at > NOW()
        `, [tokenId, userId]);

        return result && result.token_active && result.session_active;
    }
}

export default JWTService;