/**
 * Authentication Controller
 * 
 * Main authentication controller handling login, registration, 
 * password management, and Malaysian IC verification.
 */

import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { validateMalaysianIC, extractDemographics } from '../../utils/ic-validation';
import { DatabaseService } from '../../services/database/databaseService';
import { AuditService } from '../../services/audit/auditService';
import { JWTService } from '../../services/auth/jwtService';
import { SessionService } from '../../services/auth/sessionService';
import { MFAService } from '../../services/auth/mfaService';
import { PermissionService } from '../../services/rbac/permissionService';

export class AuthController {
    private dbService: DatabaseService;
    private auditService: AuditService;
    private jwtService: JWTService;
    private sessionService: SessionService;
    private mfaService: MFAService;
    private permissionService: PermissionService;

    constructor() {
        this.dbService = DatabaseService.getInstance();
        this.auditService = AuditService.getInstance();
        this.jwtService = JWTService.getInstance();
        this.sessionService = SessionService.getInstance();
        this.mfaService = MFAService.getInstance();
        this.permissionService = PermissionService.getInstance();
    }

    /**
     * User registration with Malaysian IC validation
     */
    register = async (req: Request, res: Response): Promise<void> => {
        try {
            const {
                email,
                password,
                fullName,
                icNumber,
                phoneNumber,
                healthcareRole = 'patient',
                culturalPreferences = {}
            } = req.body;

            const db = this.dbService.getConnection();

            // Validate Malaysian IC
            if (icNumber) {
                const icValidation = validateMalaysianIC(icNumber);
                if (!icValidation.isValid) {
                    res.status(400).json({
                        success: false,
                        error: 'Invalid Malaysian IC number',
                        errors: icValidation.errors
                    });
                    return;
                }
            }

            // Check if user already exists
            const existingUser = await db.oneOrNone(
                'SELECT id FROM users WHERE email = $1',
                [email]
            );

            if (existingUser) {
                res.status(409).json({
                    success: false,
                    error: 'User already exists'
                });
                return;
            }

            // Hash password
            const passwordHash = await bcrypt.hash(password, 12);

            // Extract demographics from IC
            const demographics = icNumber ? extractDemographics(icNumber) : null;

            // Create user
            const user = await db.one(`
                INSERT INTO users (
                    email, full_name, preferred_name, phone_number,
                    date_of_birth, gender, preferred_language,
                    cultural_profile, location, email_verified
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, FALSE)
                RETURNING id
            `, [
                email,
                fullName,
                fullName.split(' ')[0],
                phoneNumber,
                demographics?.birthDate,
                demographics?.gender,
                culturalPreferences.language || 'ms',
                JSON.stringify({
                    ...culturalPreferences,
                    demographics: demographics ? {
                        age: demographics.age,
                        state: demographics.state,
                        estimatedEthnicity: demographics.estimatedEthnicity
                    } : null
                }),
                JSON.stringify({
                    timezone: 'Asia/Kuala_Lumpur',
                    state: demographics?.state
                })
            ]);

            // Get healthcare role ID
            const roleRecord = await db.oneOrNone(
                'SELECT id FROM healthcare_roles WHERE role_name = $1',
                [healthcareRole]
            );

            // Create authentication record
            await db.none(`
                INSERT INTO user_authentication (
                    user_id, healthcare_role_id, password_hash, 
                    ic_number_encrypted, ic_verification_status,
                    ic_birth_date, ic_gender, ic_citizenship_status,
                    created_at, updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
            `, [
                user.id,
                roleRecord?.id,
                passwordHash,
                icNumber ? this.encryptData(icNumber) : null,
                icNumber ? 'verified' : 'unverified',
                demographics?.birthDate,
                demographics?.gender,
                demographics?.citizenshipStatus || 'citizen'
            ]);

            // Audit log
            await this.auditService.logEvent({
                eventType: 'user_registered',
                userId: user.id,
                description: 'User registration completed',
                metadata: {
                    email,
                    healthcareRole,
                    hasIC: !!icNumber,
                    icVerified: !!icNumber
                },
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            });

            res.status(201).json({
                success: true,
                message: 'User registered successfully',
                userId: user.id,
                requiresEmailVerification: true
            });

        } catch (error) {
            console.error('Registration error:', error);
            res.status(500).json({
                success: false,
                error: 'Registration failed'
            });
        }
    };

    /**
     * User login with MFA support
     */
    login = async (req: Request, res: Response): Promise<void> => {
        try {
            const { email, password, mfaCode, challengeId } = req.body;
            const db = this.dbService.getConnection();

            // Get user and authentication data
            const user = await db.oneOrNone(`
                SELECT 
                    u.id, u.email, u.full_name, u.preferred_language, u.cultural_profile,
                    ua.password_hash, ua.healthcare_role_id, ua.mfa_enabled,
                    ua.failed_login_attempts, ua.account_locked_until,
                    hr.role_name
                FROM users u
                JOIN user_authentication ua ON u.id = ua.user_id
                LEFT JOIN healthcare_roles hr ON ua.healthcare_role_id = hr.id
                WHERE u.email = $1
            `, [email]);

            if (!user) {
                res.status(401).json({
                    success: false,
                    error: 'Invalid credentials'
                });
                return;
            }

            // Check account lockout
            if (user.account_locked_until && new Date() < new Date(user.account_locked_until)) {
                res.status(423).json({
                    success: false,
                    error: 'Account temporarily locked',
                    lockedUntil: user.account_locked_until
                });
                return;
            }

            // Verify password
            const passwordValid = await bcrypt.compare(password, user.password_hash);
            if (!passwordValid) {
                // Increment failed attempts
                await this.incrementFailedAttempts(user.id);
                
                res.status(401).json({
                    success: false,
                    error: 'Invalid credentials'
                });
                return;
            }

            // Check if MFA is required
            if (user.mfa_enabled) {
                if (!mfaCode || !challengeId) {
                    // Initiate MFA challenge
                    const mfaMethods = await this.mfaService.getUserMFAMethods(user.id);
                    const primaryMethod = mfaMethods.find(m => m.primaryMethod) || mfaMethods[0];
                    
                    if (primaryMethod) {
                        const challenge = await this.mfaService.initiateChallenge(
                            user.id,
                            primaryMethod.id,
                            { loginAttempt: true }
                        );

                        res.status(200).json({
                            success: false,
                            requiresMFA: true,
                            challengeId: challenge.challengeId,
                            method: challenge.method
                        });
                        return;
                    }
                } else {
                    // Verify MFA
                    const mfaResult = await this.mfaService.verifyChallenge(
                        challengeId,
                        mfaCode,
                        user.id
                    );

                    if (!mfaResult.success) {
                        res.status(401).json({
                            success: false,
                            error: 'Invalid MFA code',
                            remainingAttempts: mfaResult.remainingAttempts
                        });
                        return;
                    }
                }
            }

            // Reset failed attempts on successful login
            await db.none(`
                UPDATE user_authentication 
                SET failed_login_attempts = 0, account_locked_until = NULL
                WHERE user_id = $1
            `, [user.id]);

            // Create session
            const sessionResult = await this.sessionService.createSession(
                user.id,
                req.ip,
                req.get('User-Agent') || '',
                {
                    maxDurationHours: 8,
                    requireMFA: user.mfa_enabled,
                    culturalAware: true
                },
                {
                    language: user.preferred_language,
                    ...user.cultural_profile
                }
            );

            // Generate JWT tokens
            const tokenPair = await this.jwtService.generateTokenPair(
                user.id,
                sessionResult.sessionId,
                user.role_name || 'patient'
            );

            // Audit log
            await this.auditService.logEvent({
                eventType: 'user_login_success',
                userId: user.id,
                description: 'User login successful',
                metadata: {
                    email,
                    role: user.role_name,
                    mfaUsed: user.mfa_enabled,
                    sessionId: sessionResult.sessionId
                },
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            });

            res.status(200).json({
                success: true,
                message: 'Login successful',
                user: {
                    id: user.id,
                    email: user.email,
                    name: user.full_name,
                    role: user.role_name,
                    language: user.preferred_language
                },
                tokens: {
                    accessToken: tokenPair.accessToken,
                    refreshToken: tokenPair.refreshToken,
                    expiresAt: tokenPair.expiresAt
                },
                session: {
                    sessionId: sessionResult.sessionId,
                    expiresAt: sessionResult.expiresAt
                }
            });

        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({
                success: false,
                error: 'Login failed'
            });
        }
    };

    /**
     * Logout
     */
    logout = async (req: Request, res: Response): Promise<void> => {
        try {
            const sessionToken = req.headers.authorization?.replace('Bearer ', '');
            
            if (sessionToken) {
                await this.sessionService.terminateSession(sessionToken, 'manual', 'User logout');
            }

            await this.auditService.logEvent({
                eventType: 'user_logout',
                userId: req.user?.id,
                description: 'User logout',
                ipAddress: req.ip,
                userAgent: req.get('User-Agent')
            });

            res.status(200).json({
                success: true,
                message: 'Logged out successfully'
            });

        } catch (error) {
            console.error('Logout error:', error);
            res.status(500).json({
                success: false,
                error: 'Logout failed'
            });
        }
    };

    /**
     * Refresh JWT token
     */
    refreshToken = async (req: Request, res: Response): Promise<void> => {
        try {
            const { refreshToken } = req.body;
            const sessionId = req.headers['x-session-id'] as string;

            if (!refreshToken || !sessionId) {
                res.status(400).json({
                    success: false,
                    error: 'Refresh token and session ID required'
                });
                return;
            }

            const newTokenPair = await this.jwtService.refreshTokenPair(refreshToken, sessionId);
            if (!newTokenPair) {
                res.status(401).json({
                    success: false,
                    error: 'Invalid refresh token'
                });
                return;
            }

            res.status(200).json({
                success: true,
                tokens: {
                    accessToken: newTokenPair.accessToken,
                    refreshToken: newTokenPair.refreshToken,
                    expiresAt: newTokenPair.expiresAt
                }
            });

        } catch (error) {
            console.error('Token refresh error:', error);
            res.status(500).json({
                success: false,
                error: 'Token refresh failed'
            });
        }
    };

    /**
     * Private helper methods
     */
    private async incrementFailedAttempts(userId: string): Promise<void> {
        const db = this.dbService.getConnection();
        
        const result = await db.one(`
            UPDATE user_authentication 
            SET failed_login_attempts = failed_login_attempts + 1
            WHERE user_id = $1
            RETURNING failed_login_attempts
        `, [userId]);

        // Lock account after 5 failed attempts
        if (result.failed_login_attempts >= 5) {
            const lockUntil = new Date();
            lockUntil.setMinutes(lockUntil.getMinutes() + 30); // 30-minute lockout

            await db.none(`
                UPDATE user_authentication 
                SET account_locked_until = $1
                WHERE user_id = $2
            `, [lockUntil, userId]);
        }
    }

    private encryptData(data: string): string {
        // Simple encryption - in production use proper encryption
        return Buffer.from(data).toString('base64');
    }
}

export default new AuthController();