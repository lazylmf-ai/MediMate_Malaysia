/**
 * OAuth 2.0 Service
 * 
 * Handles OAuth authentication flows with Google, Microsoft, and local providers.
 * Integrates with Malaysian healthcare requirements and PDPA compliance.
 */

import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import { 
    getOAuthProvider, 
    getHealthcareScopes, 
    MALAYSIAN_OAUTH_SETTINGS,
    OAuthProviderConfig
} from '../../config/oauth/providers';
import { validateMalaysianIC, extractDemographics } from '../../utils/ic-validation';
import { DatabaseService } from '../database/databaseService';
import { AuditService } from '../audit/auditService';

export interface OAuthState {
    state: string;
    provider: string;
    redirectUri: string;
    codeVerifier?: string; // For PKCE
    userRole?: string;
    culturalPreferences?: {
        language: string;
        timezone: string;
        prayerTimes: boolean;
    };
    createdAt: Date;
    expiresAt: Date;
}

export interface OAuthTokenResponse {
    access_token: string;
    token_type: string;
    expires_in: number;
    refresh_token?: string;
    scope: string;
    id_token?: string;
}

export interface OAuthUserInfo {
    id: string;
    email: string;
    email_verified: boolean;
    name: string;
    given_name?: string;
    family_name?: string;
    picture?: string;
    locale?: string;
    provider: string;
    raw: any; // Provider-specific raw data
}

export interface OAuthAuthenticationResult {
    success: boolean;
    user?: {
        id: string;
        email: string;
        name: string;
        isNewUser: boolean;
        requiresAdditionalInfo: boolean;
        requiresICVerification: boolean;
        healthcareRole?: string;
    };
    tokens?: {
        accessToken: string;
        refreshToken: string;
        idToken?: string;
        expiresAt: Date;
    };
    error?: string;
    errorCode?: string;
}

export class OAuthService {
    private static instance: OAuthService;
    private stateStore: Map<string, OAuthState> = new Map();
    private dbService: DatabaseService;
    private auditService: AuditService;

    constructor() {
        this.dbService = DatabaseService.getInstance();
        this.auditService = AuditService.getInstance();
        
        // Cleanup expired states every 10 minutes
        setInterval(() => this.cleanupExpiredStates(), 10 * 60 * 1000);
    }

    public static getInstance(): OAuthService {
        if (!OAuthService.instance) {
            OAuthService.instance = new OAuthService();
        }
        return OAuthService.instance;
    }

    /**
     * Generate OAuth authorization URL
     */
    async generateAuthorizationUrl(
        provider: string, 
        redirectUri: string,
        userRole?: string,
        culturalPreferences?: any
    ): Promise<{ url: string; state: string }> {
        const config = getOAuthProvider(provider);
        if (!config) {
            throw new Error(`Unsupported OAuth provider: ${provider}`);
        }

        // Generate state for CSRF protection
        const state = crypto.randomBytes(32).toString('base64url');
        
        // Generate PKCE parameters if required
        let codeVerifier: string | undefined;
        let codeChallenge: string | undefined;
        let codeChallengeMethod: string | undefined;

        if (config.pkceRequired) {
            codeVerifier = crypto.randomBytes(32).toString('base64url');
            codeChallenge = crypto
                .createHash('sha256')
                .update(codeVerifier)
                .digest('base64url');
            codeChallengeMethod = 'S256';
        }

        // Store state information
        const oauthState: OAuthState = {
            state,
            provider,
            redirectUri,
            codeVerifier,
            userRole,
            culturalPreferences: culturalPreferences || {
                language: 'ms',
                timezone: 'Asia/Kuala_Lumpur',
                prayerTimes: false
            },
            createdAt: new Date(),
            expiresAt: new Date(Date.now() + 10 * 60 * 1000) // 10 minutes
        };

        this.stateStore.set(state, oauthState);

        // Get scopes
        const scopes = getHealthcareScopes(provider, userRole || 'patient');

        // Build authorization URL
        const params = new URLSearchParams({
            client_id: config.clientId,
            redirect_uri: redirectUri,
            response_type: 'code',
            scope: scopes.join(' '),
            state,
            access_type: 'offline' // For refresh tokens
        });

        // Add PKCE parameters if required
        if (config.pkceRequired && codeChallenge) {
            params.append('code_challenge', codeChallenge);
            params.append('code_challenge_method', codeChallengeMethod!);
        }

        // Provider-specific parameters
        if (provider === 'google') {
            params.append('prompt', 'consent select_account');
            params.append('include_granted_scopes', 'true');
        } else if (provider === 'microsoft') {
            params.append('prompt', 'consent');
            params.append('response_mode', 'query');
        }

        const authUrl = `${config.authorizationEndpoint}?${params.toString()}`;

        // Audit log
        await this.auditService.logEvent({
            eventType: 'oauth_authorization_initiated',
            description: `OAuth authorization initiated for provider: ${provider}`,
            metadata: {
                provider,
                userRole,
                scopes,
                culturalPreferences
            }
        });

        return { url: authUrl, state };
    }

    /**
     * Handle OAuth callback and exchange code for tokens
     */
    async handleCallback(
        code: string,
        state: string,
        ipAddress: string,
        userAgent: string
    ): Promise<OAuthAuthenticationResult> {
        try {
            // Validate state
            const oauthState = this.stateStore.get(state);
            if (!oauthState) {
                return {
                    success: false,
                    error: 'Invalid or expired state parameter',
                    errorCode: 'INVALID_STATE'
                };
            }

            // Check if state is expired
            if (new Date() > oauthState.expiresAt) {
                this.stateStore.delete(state);
                return {
                    success: false,
                    error: 'Authorization session expired',
                    errorCode: 'EXPIRED_STATE'
                };
            }

            const config = getOAuthProvider(oauthState.provider);
            if (!config) {
                return {
                    success: false,
                    error: 'Invalid OAuth provider',
                    errorCode: 'INVALID_PROVIDER'
                };
            }

            // Exchange code for tokens
            const tokenResponse = await this.exchangeCodeForTokens(
                config,
                code,
                oauthState.redirectUri,
                oauthState.codeVerifier
            );

            // Get user information
            const userInfo = await this.getUserInfo(config, tokenResponse.access_token);

            // Process authentication
            const authResult = await this.processAuthentication(
                userInfo,
                tokenResponse,
                oauthState,
                ipAddress,
                userAgent
            );

            // Cleanup state
            this.stateStore.delete(state);

            return authResult;

        } catch (error) {
            console.error('OAuth callback error:', error);
            
            // Audit log error
            await this.auditService.logEvent({
                eventType: 'oauth_callback_error',
                description: 'OAuth callback processing failed',
                metadata: { error: error instanceof Error ? error.message : 'Unknown error' },
                ipAddress,
                userAgent
            });

            return {
                success: false,
                error: 'Authentication failed',
                errorCode: 'CALLBACK_ERROR'
            };
        }
    }

    /**
     * Exchange authorization code for access tokens
     */
    private async exchangeCodeForTokens(
        config: OAuthProviderConfig,
        code: string,
        redirectUri: string,
        codeVerifier?: string
    ): Promise<OAuthTokenResponse> {
        const tokenParams: any = {
            client_id: config.clientId,
            client_secret: config.clientSecret,
            code,
            grant_type: 'authorization_code',
            redirect_uri: redirectUri
        };

        // Add PKCE verifier if required
        if (config.pkceRequired && codeVerifier) {
            tokenParams.code_verifier = codeVerifier;
        }

        const response = await axios.post(config.tokenEndpoint, tokenParams, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json'
            }
        });

        if (response.status !== 200) {
            throw new Error(`Token exchange failed: ${response.status}`);
        }

        return response.data;
    }

    /**
     * Get user information from OAuth provider
     */
    private async getUserInfo(config: OAuthProviderConfig, accessToken: string): Promise<OAuthUserInfo> {
        const response = await axios.get(config.userInfoEndpoint, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Accept': 'application/json'
            }
        });

        if (response.status !== 200) {
            throw new Error(`User info request failed: ${response.status}`);
        }

        const userData = response.data;

        // Normalize user data across providers
        let normalizedUser: OAuthUserInfo;

        switch (config.name) {
            case 'google':
                normalizedUser = {
                    id: userData.id,
                    email: userData.email,
                    email_verified: userData.verified_email,
                    name: userData.name,
                    given_name: userData.given_name,
                    family_name: userData.family_name,
                    picture: userData.picture,
                    locale: userData.locale,
                    provider: 'google',
                    raw: userData
                };
                break;

            case 'microsoft':
                normalizedUser = {
                    id: userData.id,
                    email: userData.mail || userData.userPrincipalName,
                    email_verified: true, // Microsoft emails are verified
                    name: userData.displayName,
                    given_name: userData.givenName,
                    family_name: userData.surname,
                    locale: userData.preferredLanguage,
                    provider: 'microsoft',
                    raw: userData
                };
                break;

            default:
                normalizedUser = {
                    id: userData.id || userData.sub,
                    email: userData.email,
                    email_verified: userData.email_verified || false,
                    name: userData.name,
                    given_name: userData.given_name,
                    family_name: userData.family_name,
                    picture: userData.picture,
                    locale: userData.locale,
                    provider: config.name,
                    raw: userData
                };
        }

        return normalizedUser;
    }

    /**
     * Process authentication and create/update user
     */
    private async processAuthentication(
        userInfo: OAuthUserInfo,
        tokenResponse: OAuthTokenResponse,
        oauthState: OAuthState,
        ipAddress: string,
        userAgent: string
    ): Promise<OAuthAuthenticationResult> {
        const db = this.dbService.getConnection();

        try {
            // Check if OAuth account already exists
            const existingOAuthAccount = await db.oneOrNone(`
                SELECT oa.*, u.id as user_id, u.full_name, u.email as user_email
                FROM oauth_accounts oa
                JOIN users u ON oa.user_id = u.id
                WHERE oa.provider_user_id = $1 AND oa.provider_id = (
                    SELECT id FROM oauth_providers WHERE provider_name = $2
                )
            `, [userInfo.id, userInfo.provider]);

            let userId: string;
            let isNewUser = false;
            let requiresAdditionalInfo = false;
            let requiresICVerification = false;

            if (existingOAuthAccount) {
                // Existing OAuth account
                userId = existingOAuthAccount.user_id;

                // Update OAuth account data
                await db.none(`
                    UPDATE oauth_accounts 
                    SET email = $1, account_data = $2, updated_at = NOW()
                    WHERE provider_user_id = $3 AND provider_id = (
                        SELECT id FROM oauth_providers WHERE provider_name = $4
                    )
                `, [
                    userInfo.email,
                    JSON.stringify(userInfo.raw),
                    userInfo.id,
                    userInfo.provider
                ]);

            } else {
                // Check if user exists by email
                const existingUser = await db.oneOrNone(
                    'SELECT id, full_name FROM users WHERE email = $1',
                    [userInfo.email]
                );

                if (existingUser) {
                    // Link OAuth account to existing user
                    userId = existingUser.id;
                    await this.linkOAuthAccount(userId, userInfo, tokenResponse);

                } else {
                    // Create new user
                    isNewUser = true;
                    requiresAdditionalInfo = true;
                    requiresICVerification = oauthState.userRole !== 'patient';

                    userId = await this.createNewUser(userInfo, oauthState);
                    await this.linkOAuthAccount(userId, userInfo, tokenResponse);
                }
            }

            // Get user authentication data
            const userAuth = await db.oneOrNone(`
                SELECT ua.*, hr.role_name, hr.role_code
                FROM user_authentication ua
                LEFT JOIN healthcare_roles hr ON ua.healthcare_role_id = hr.id
                WHERE ua.user_id = $1
            `, [userId]);

            // Create session tokens
            const tokens = await this.createSessionTokens(userId, oauthState);

            // Log authentication event
            await this.auditService.logEvent({
                eventType: 'oauth_authentication_success',
                userId,
                description: `OAuth authentication successful via ${userInfo.provider}`,
                metadata: {
                    provider: userInfo.provider,
                    isNewUser,
                    userRole: oauthState.userRole,
                    email: userInfo.email
                },
                ipAddress,
                userAgent
            });

            return {
                success: true,
                user: {
                    id: userId,
                    email: userInfo.email,
                    name: userInfo.name,
                    isNewUser,
                    requiresAdditionalInfo,
                    requiresICVerification,
                    healthcareRole: userAuth?.role_name
                },
                tokens
            };

        } catch (error) {
            console.error('Authentication processing error:', error);
            
            await this.auditService.logEvent({
                eventType: 'oauth_authentication_error',
                description: 'OAuth authentication processing failed',
                metadata: {
                    error: error instanceof Error ? error.message : 'Unknown error',
                    provider: userInfo.provider,
                    email: userInfo.email
                },
                ipAddress,
                userAgent
            });

            return {
                success: false,
                error: 'Authentication processing failed',
                errorCode: 'PROCESSING_ERROR'
            };
        }
    }

    /**
     * Create new user from OAuth information
     */
    private async createNewUser(userInfo: OAuthUserInfo, oauthState: OAuthState): Promise<string> {
        const db = this.dbService.getConnection();

        // Create user record
        const user = await db.one(`
            INSERT INTO users (
                email, full_name, preferred_name, 
                preferred_language, email_verified,
                cultural_profile, location
            ) VALUES (
                $1, $2, $3, $4, $5,
                $6::jsonb, $7::jsonb
            ) RETURNING id
        `, [
            userInfo.email,
            userInfo.name,
            userInfo.given_name || userInfo.name,
            oauthState.culturalPreferences?.language || 'ms',
            userInfo.email_verified,
            JSON.stringify({
                religion: null,
                prayer_times_enabled: oauthState.culturalPreferences?.prayerTimes || false,
                fasting_periods: [],
                dietary_restrictions: [],
                cultural_holidays: [],
                meal_times: {
                    breakfast: "07:00",
                    lunch: "13:00", 
                    dinner: "19:30"
                }
            }),
            JSON.stringify({
                city: null,
                state: null,
                timezone: oauthState.culturalPreferences?.timezone || 'Asia/Kuala_Lumpur'
            })
        ]);

        // Get default healthcare role
        const defaultRole = await db.oneOrNone(
            'SELECT id FROM healthcare_roles WHERE role_name = $1',
            [oauthState.userRole || 'patient']
        );

        // Create authentication record
        await db.none(`
            INSERT INTO user_authentication (
                user_id, healthcare_role_id, mfa_enabled,
                created_at, updated_at
            ) VALUES ($1, $2, $3, NOW(), NOW())
        `, [
            user.id,
            defaultRole?.id || null,
            false
        ]);

        return user.id;
    }

    /**
     * Link OAuth account to user
     */
    private async linkOAuthAccount(
        userId: string,
        userInfo: OAuthUserInfo,
        tokenResponse: OAuthTokenResponse
    ): Promise<void> {
        const db = this.dbService.getConnection();

        // Hash tokens for storage
        const accessTokenHash = crypto.createHash('sha256').update(tokenResponse.access_token).digest('hex');
        const refreshTokenHash = tokenResponse.refresh_token 
            ? crypto.createHash('sha256').update(tokenResponse.refresh_token).digest('hex') 
            : null;

        await db.none(`
            INSERT INTO oauth_accounts (
                user_id, provider_id, provider_user_id, email, verified,
                account_data, scope_granted, access_token_hash, refresh_token_hash,
                token_expires_at, created_at, updated_at
            ) VALUES (
                $1, 
                (SELECT id FROM oauth_providers WHERE provider_name = $2),
                $3, $4, $5, $6::jsonb, $7, $8, $9, $10, NOW(), NOW()
            ) ON CONFLICT (user_id, provider_id) 
            DO UPDATE SET
                email = $4,
                verified = $5,
                account_data = $6::jsonb,
                access_token_hash = $8,
                refresh_token_hash = $9,
                token_expires_at = $10,
                updated_at = NOW()
        `, [
            userId,
            userInfo.provider,
            userInfo.id,
            userInfo.email,
            userInfo.email_verified,
            JSON.stringify(userInfo.raw),
            tokenResponse.scope.split(' '),
            accessTokenHash,
            refreshTokenHash,
            new Date(Date.now() + tokenResponse.expires_in * 1000)
        ]);
    }

    /**
     * Create session tokens for authenticated user
     */
    private async createSessionTokens(userId: string, oauthState: OAuthState): Promise<{
        accessToken: string;
        refreshToken: string;
        idToken?: string;
        expiresAt: Date;
    }> {
        const db = this.dbService.getConnection();

        // Generate session token
        const sessionToken = crypto.randomBytes(32).toString('hex');
        const sessionTokenHash = crypto.createHash('sha256').update(sessionToken).digest('hex');

        // Set expiration (8 hours for healthcare applications)
        const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000);

        // Create session record
        await db.none(`
            INSERT INTO user_sessions (
                user_id, session_token_hash, ip_address, user_agent,
                timezone, active_language, prayer_times_enabled,
                cultural_calendar_active, expires_at, created_at, last_activity
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
        `, [
            userId,
            sessionTokenHash,
            '127.0.0.1', // Will be updated by the actual IP
            'OAuth Service',
            oauthState.culturalPreferences?.timezone || 'Asia/Kuala_Lumpur',
            oauthState.culturalPreferences?.language || 'ms',
            oauthState.culturalPreferences?.prayerTimes || false,
            false,
            expiresAt
        ]);

        // Generate JWT tokens
        const jwtSecret = process.env.JWT_SECRET || 'default-secret';
        
        const accessToken = jwt.sign(
            {
                userId,
                sessionToken: sessionTokenHash,
                type: 'access',
                iat: Math.floor(Date.now() / 1000)
            },
            jwtSecret,
            { expiresIn: '8h', issuer: 'medimate-malaysia' }
        );

        const refreshToken = jwt.sign(
            {
                userId,
                sessionToken: sessionTokenHash,
                type: 'refresh',
                iat: Math.floor(Date.now() / 1000)
            },
            jwtSecret,
            { expiresIn: '7d', issuer: 'medimate-malaysia' }
        );

        return {
            accessToken,
            refreshToken,
            expiresAt
        };
    }

    /**
     * Cleanup expired OAuth states
     */
    private cleanupExpiredStates(): void {
        const now = new Date();
        for (const [state, oauthState] of this.stateStore.entries()) {
            if (now > oauthState.expiresAt) {
                this.stateStore.delete(state);
            }
        }
    }

    /**
     * Refresh OAuth tokens
     */
    async refreshTokens(refreshToken: string): Promise<OAuthTokenResponse | null> {
        // Implementation for refreshing OAuth tokens
        // This would be called when access tokens expire
        return null; // Placeholder
    }

    /**
     * Revoke OAuth tokens
     */
    async revokeTokens(userId: string, provider: string): Promise<boolean> {
        const db = this.dbService.getConnection();

        try {
            await db.none(`
                UPDATE oauth_accounts 
                SET access_token_hash = NULL, refresh_token_hash = NULL, updated_at = NOW()
                WHERE user_id = $1 AND provider_id = (
                    SELECT id FROM oauth_providers WHERE provider_name = $2
                )
            `, [userId, provider]);

            await this.auditService.logEvent({
                eventType: 'oauth_tokens_revoked',
                userId,
                description: `OAuth tokens revoked for provider: ${provider}`,
                metadata: { provider }
            });

            return true;
        } catch (error) {
            console.error('Token revocation error:', error);
            return false;
        }
    }
}

export default OAuthService;