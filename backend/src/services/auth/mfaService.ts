/**
 * Multi-Factor Authentication Service
 * 
 * MFA service optimized for Malaysian healthcare with SMS integration
 * for Malaysian mobile networks and cultural time considerations.
 */

import crypto from 'crypto';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import twilio from 'twilio';
import nodemailer from 'nodemailer';
import { DatabaseService } from '../database/databaseService';
import { AuditService } from '../audit/auditService';

export interface MFAMethod {
    id: string;
    userId: string;
    methodType: 'sms' | 'email' | 'totp' | 'backup_codes' | 'hardware_token';
    methodName: string;
    phoneNumber?: string;
    emailAddress?: string;
    totpSecret?: string;
    backupCodes?: string[];
    smsCarrier?: string;
    verified: boolean;
    primaryMethod: boolean;
    lastUsed?: Date;
    failureCount: number;
    lockedUntil?: Date;
}

export interface MFAChallenge {
    challengeId: string;
    userId: string;
    methodType: string;
    methodId: string;
    code: string;
    expiresAt: Date;
    attempts: number;
    maxAttempts: number;
    verified: boolean;
}

export interface MFASetupResult {
    success: boolean;
    methodId?: string;
    secret?: string;
    qrCodeUrl?: string;
    backupCodes?: string[];
    error?: string;
}

export interface MFAVerificationResult {
    success: boolean;
    method?: string;
    remainingAttempts?: number;
    error?: string;
    lockoutDuration?: number;
}

export class MFAService {
    private static instance: MFAService;
    private dbService: DatabaseService;
    private auditService: AuditService;
    private twilioClient: any;
    private emailTransporter: nodemailer.Transporter;
    private challenges: Map<string, MFAChallenge> = new Map();

    // Malaysian mobile carrier configurations
    private readonly MALAYSIAN_CARRIERS = {
        'maxis': { shortCode: '28882', priority: 1 },
        'celcom': { shortCode: '13888', priority: 2 },
        'digi': { shortCode: '32323', priority: 3 },
        'umobile': { shortCode: '28112', priority: 4 },
        'tune_talk': { shortCode: '22222', priority: 5 },
        'hotlink': { shortCode: '28882', priority: 1 }, // Same as Maxis
        'xpax': { shortCode: '13888', priority: 2 } // Same as Celcom
    };

    constructor() {
        this.dbService = DatabaseService.getInstance();
        this.auditService = AuditService.getInstance();
        
        // Initialize Twilio for SMS
        if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
            this.twilioClient = twilio(
                process.env.TWILIO_ACCOUNT_SID,
                process.env.TWILIO_AUTH_TOKEN
            );
        }

        // Initialize email transporter
        this.emailTransporter = nodemailer.createTransporter({
            host: process.env.SMTP_HOST || 'localhost',
            port: parseInt(process.env.SMTP_PORT || '587'),
            secure: false,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            }
        });

        // Cleanup expired challenges every 5 minutes
        setInterval(() => this.cleanupExpiredChallenges(), 5 * 60 * 1000);
    }

    public static getInstance(): MFAService {
        if (!MFAService.instance) {
            MFAService.instance = new MFAService();
        }
        return MFAService.instance;
    }

    /**
     * Setup TOTP (Time-based One-Time Password) authentication
     */
    async setupTOTP(userId: string, methodName: string = 'Authenticator App'): Promise<MFASetupResult> {
        try {
            const db = this.dbService.getConnection();

            // Get user info
            const user = await db.oneOrNone('SELECT full_name, email FROM users WHERE id = $1', [userId]);
            if (!user) {
                return { success: false, error: 'User not found' };
            }

            // Generate TOTP secret
            const secret = speakeasy.generateSecret({
                name: `MediMate Malaysia (${user.full_name})`,
                issuer: 'MediMate Malaysia',
                length: 32
            });

            // Generate QR code
            const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);

            // Store TOTP method (encrypted secret)
            const methodId = await db.one(`
                INSERT INTO mfa_methods (
                    user_id, method_type, method_name, totp_secret_encrypted,
                    verified, created_at, updated_at
                ) VALUES ($1, 'totp', $2, $3, FALSE, NOW(), NOW())
                RETURNING id
            `, [
                userId,
                methodName,
                this.encryptSecret(secret.base32)
            ]);

            // Audit log
            await this.auditService.logEvent({
                eventType: 'mfa_totp_setup',
                userId,
                description: 'TOTP MFA method setup initiated',
                metadata: { methodName, methodId: methodId.id }
            });

            return {
                success: true,
                methodId: methodId.id,
                secret: secret.base32,
                qrCodeUrl
            };

        } catch (error) {
            console.error('TOTP setup error:', error);
            return { success: false, error: 'TOTP setup failed' };
        }
    }

    /**
     * Setup SMS authentication with Malaysian carrier optimization
     */
    async setupSMS(userId: string, phoneNumber: string, carrier?: string): Promise<MFASetupResult> {
        try {
            const db = this.dbService.getConnection();

            // Validate Malaysian phone number
            const normalizedNumber = this.normalizeMalaysianNumber(phoneNumber);
            if (!normalizedNumber) {
                return { success: false, error: 'Invalid Malaysian phone number' };
            }

            // Detect carrier if not provided
            const detectedCarrier = carrier || this.detectCarrier(normalizedNumber);

            // Check if number already exists
            const existing = await db.oneOrNone(`
                SELECT id FROM mfa_methods 
                WHERE user_id = $1 AND method_type = 'sms' AND phone_number = $2
            `, [userId, normalizedNumber]);

            if (existing) {
                return { success: false, error: 'Phone number already registered' };
            }

            // Create SMS method
            const methodId = await db.one(`
                INSERT INTO mfa_methods (
                    user_id, method_type, method_name, phone_number, sms_carrier,
                    verified, created_at, updated_at
                ) VALUES ($1, 'sms', $2, $3, $4, FALSE, NOW(), NOW())
                RETURNING id
            `, [
                userId,
                `SMS (${normalizedNumber})`,
                normalizedNumber,
                detectedCarrier
            ]);

            // Send verification SMS
            const verificationCode = this.generateVerificationCode();
            await this.sendSMS(normalizedNumber, `Your MediMate verification code: ${verificationCode}`, detectedCarrier);

            // Store verification challenge
            const challengeId = crypto.randomUUID();
            this.challenges.set(challengeId, {
                challengeId,
                userId,
                methodType: 'sms',
                methodId: methodId.id,
                code: verificationCode,
                expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
                attempts: 0,
                maxAttempts: 3,
                verified: false
            });

            // Audit log
            await this.auditService.logEvent({
                eventType: 'mfa_sms_setup',
                userId,
                description: 'SMS MFA method setup initiated',
                metadata: { 
                    phoneNumber: this.maskPhoneNumber(normalizedNumber),
                    carrier: detectedCarrier,
                    methodId: methodId.id
                }
            });

            return {
                success: true,
                methodId: methodId.id
            };

        } catch (error) {
            console.error('SMS setup error:', error);
            return { success: false, error: 'SMS setup failed' };
        }
    }

    /**
     * Setup email authentication
     */
    async setupEmail(userId: string, emailAddress: string): Promise<MFASetupResult> {
        try {
            const db = this.dbService.getConnection();

            // Validate email
            if (!this.isValidEmail(emailAddress)) {
                return { success: false, error: 'Invalid email address' };
            }

            // Check if email already exists
            const existing = await db.oneOrNone(`
                SELECT id FROM mfa_methods 
                WHERE user_id = $1 AND method_type = 'email' AND email_address = $2
            `, [userId, emailAddress]);

            if (existing) {
                return { success: false, error: 'Email already registered' };
            }

            // Create email method
            const methodId = await db.one(`
                INSERT INTO mfa_methods (
                    user_id, method_type, method_name, email_address,
                    verified, created_at, updated_at
                ) VALUES ($1, 'email', $2, $3, FALSE, NOW(), NOW())
                RETURNING id
            `, [
                userId,
                `Email (${emailAddress})`,
                emailAddress
            ]);

            // Send verification email
            const verificationCode = this.generateVerificationCode();
            await this.sendEmail(
                emailAddress,
                'MediMate MFA Verification',
                `Your verification code is: ${verificationCode}`
            );

            // Store verification challenge
            const challengeId = crypto.randomUUID();
            this.challenges.set(challengeId, {
                challengeId,
                userId,
                methodType: 'email',
                methodId: methodId.id,
                code: verificationCode,
                expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
                attempts: 0,
                maxAttempts: 3,
                verified: false
            });

            return {
                success: true,
                methodId: methodId.id
            };

        } catch (error) {
            console.error('Email setup error:', error);
            return { success: false, error: 'Email setup failed' };
        }
    }

    /**
     * Generate backup codes
     */
    async generateBackupCodes(userId: string): Promise<MFASetupResult> {
        try {
            const db = this.dbService.getConnection();

            // Generate 10 backup codes
            const backupCodes = Array.from({ length: 10 }, () => 
                crypto.randomBytes(4).toString('hex').toUpperCase()
            );

            // Hash backup codes for storage
            const hashedCodes = backupCodes.map(code => 
                crypto.createHash('sha256').update(code).digest('hex')
            );

            // Store backup codes method
            const methodId = await db.one(`
                INSERT INTO mfa_methods (
                    user_id, method_type, method_name, backup_codes_encrypted,
                    verified, created_at, updated_at
                ) VALUES ($1, 'backup_codes', 'Backup Codes', $2, TRUE, NOW(), NOW())
                RETURNING id
            `, [
                userId,
                this.encryptSecret(JSON.stringify(hashedCodes))
            ]);

            // Audit log
            await this.auditService.logEvent({
                eventType: 'mfa_backup_codes_generated',
                userId,
                description: 'MFA backup codes generated',
                metadata: { methodId: methodId.id, codesCount: backupCodes.length }
            });

            return {
                success: true,
                methodId: methodId.id,
                backupCodes
            };

        } catch (error) {
            console.error('Backup codes generation error:', error);
            return { success: false, error: 'Backup codes generation failed' };
        }
    }

    /**
     * Initiate MFA challenge
     */
    async initiateChallenge(userId: string, methodId: string, context?: any): Promise<{
        success: boolean;
        challengeId?: string;
        method?: string;
        error?: string;
    }> {
        try {
            const db = this.dbService.getConnection();

            // Get MFA method
            const method = await db.oneOrNone(`
                SELECT * FROM mfa_methods 
                WHERE id = $1 AND user_id = $2 AND active = TRUE AND verified = TRUE
            `, [methodId, userId]);

            if (!method) {
                return { success: false, error: 'MFA method not found or not verified' };
            }

            const challengeId = crypto.randomUUID();
            let verificationCode = '';

            switch (method.method_type) {
                case 'sms':
                    verificationCode = this.generateVerificationCode();
                    await this.sendSMS(
                        method.phone_number,
                        `MediMate security code: ${verificationCode}`,
                        method.sms_carrier
                    );
                    break;

                case 'email':
                    verificationCode = this.generateVerificationCode();
                    await this.sendEmail(
                        method.email_address,
                        'MediMate Security Code',
                        `Your security code is: ${verificationCode}`
                    );
                    break;

                case 'totp':
                    // For TOTP, we don't send a code, user generates it
                    verificationCode = 'totp_challenge';
                    break;

                case 'backup_codes':
                    verificationCode = 'backup_code_challenge';
                    break;

                default:
                    return { success: false, error: 'Unsupported MFA method' };
            }

            // Store challenge
            this.challenges.set(challengeId, {
                challengeId,
                userId,
                methodType: method.method_type,
                methodId,
                code: verificationCode,
                expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes
                attempts: 0,
                maxAttempts: 3,
                verified: false
            });

            // Audit log
            await this.auditService.logEvent({
                eventType: 'mfa_challenge_initiated',
                userId,
                description: `MFA challenge initiated for method: ${method.method_type}`,
                metadata: { 
                    methodId, 
                    challengeId, 
                    methodType: method.method_type,
                    context 
                }
            });

            return {
                success: true,
                challengeId,
                method: method.method_type
            };

        } catch (error) {
            console.error('MFA challenge initiation error:', error);
            return { success: false, error: 'Failed to initiate MFA challenge' };
        }
    }

    /**
     * Verify MFA challenge
     */
    async verifyChallenge(
        challengeId: string,
        userCode: string,
        userId: string
    ): Promise<MFAVerificationResult> {
        try {
            const challenge = this.challenges.get(challengeId);
            if (!challenge || challenge.userId !== userId) {
                return { success: false, error: 'Invalid challenge' };
            }

            // Check if challenge expired
            if (new Date() > challenge.expiresAt) {
                this.challenges.delete(challengeId);
                return { success: false, error: 'Challenge expired' };
            }

            // Check attempt limit
            if (challenge.attempts >= challenge.maxAttempts) {
                this.challenges.delete(challengeId);
                return { success: false, error: 'Maximum attempts exceeded' };
            }

            // Increment attempt count
            challenge.attempts++;

            let isValid = false;

            switch (challenge.methodType) {
                case 'sms':
                case 'email':
                    isValid = challenge.code === userCode;
                    break;

                case 'totp':
                    isValid = await this.verifyTOTP(challenge.methodId, userCode);
                    break;

                case 'backup_codes':
                    isValid = await this.verifyBackupCode(challenge.methodId, userCode);
                    break;

                default:
                    return { success: false, error: 'Unsupported verification method' };
            }

            if (isValid) {
                // Mark challenge as verified
                challenge.verified = true;
                
                // Update method last used
                const db = this.dbService.getConnection();
                await db.none(`
                    UPDATE mfa_methods 
                    SET last_used_at = NOW(), failure_count = 0
                    WHERE id = $1
                `, [challenge.methodId]);

                // Clean up challenge
                this.challenges.delete(challengeId);

                // Record MFA attempt
                await db.none(`
                    INSERT INTO mfa_attempts (
                        user_id, mfa_method_id, attempt_type, method_used, success, created_at
                    ) VALUES ($1, $2, 'login', $3, TRUE, NOW())
                `, [userId, challenge.methodId, challenge.methodType]);

                // Audit log
                await this.auditService.logEvent({
                    eventType: 'mfa_verification_success',
                    userId,
                    description: `MFA verification successful: ${challenge.methodType}`,
                    metadata: { 
                        challengeId, 
                        methodType: challenge.methodType,
                        attempts: challenge.attempts
                    }
                });

                return { success: true, method: challenge.methodType };

            } else {
                // Update failure count
                const db = this.dbService.getConnection();
                await db.none(`
                    UPDATE mfa_methods 
                    SET failure_count = failure_count + 1
                    WHERE id = $1
                `, [challenge.methodId]);

                // Record failed attempt
                await db.none(`
                    INSERT INTO mfa_attempts (
                        user_id, mfa_method_id, attempt_type, method_used, success, 
                        failure_reason, created_at
                    ) VALUES ($1, $2, 'login', $3, FALSE, 'invalid_code', NOW())
                `, [userId, challenge.methodId, challenge.methodType]);

                const remainingAttempts = challenge.maxAttempts - challenge.attempts;

                // Audit log
                await this.auditService.logEvent({
                    eventType: 'mfa_verification_failed',
                    userId,
                    description: `MFA verification failed: ${challenge.methodType}`,
                    metadata: { 
                        challengeId, 
                        methodType: challenge.methodType,
                        attempts: challenge.attempts,
                        remainingAttempts
                    }
                });

                return { 
                    success: false, 
                    error: 'Invalid code', 
                    remainingAttempts 
                };
            }

        } catch (error) {
            console.error('MFA verification error:', error);
            return { success: false, error: 'Verification failed' };
        }
    }

    /**
     * Get user's MFA methods
     */
    async getUserMFAMethods(userId: string): Promise<MFAMethod[]> {
        const db = this.dbService.getConnection();

        const methods = await db.manyOrNone(`
            SELECT 
                id, user_id, method_type, method_name, phone_number, email_address,
                verified, primary_method, last_used_at, failure_count, locked_until
            FROM mfa_methods 
            WHERE user_id = $1 AND active = TRUE
            ORDER BY primary_method DESC, verified DESC, created_at ASC
        `, [userId]);

        return methods.map(method => ({
            id: method.id,
            userId: method.user_id,
            methodType: method.method_type,
            methodName: method.method_name,
            phoneNumber: method.phone_number ? this.maskPhoneNumber(method.phone_number) : undefined,
            emailAddress: method.email_address ? this.maskEmail(method.email_address) : undefined,
            verified: method.verified,
            primaryMethod: method.primary_method,
            lastUsed: method.last_used_at,
            failureCount: method.failure_count,
            lockedUntil: method.locked_until
        }));
    }

    /**
     * Private helper methods
     */
    private async verifyTOTP(methodId: string, userCode: string): Promise<boolean> {
        const db = this.dbService.getConnection();
        const method = await db.oneOrNone(
            'SELECT totp_secret_encrypted FROM mfa_methods WHERE id = $1',
            [methodId]
        );

        if (!method) return false;

        const secret = this.decryptSecret(method.totp_secret_encrypted);
        return speakeasy.totp.verify({
            secret,
            encoding: 'base32',
            token: userCode,
            window: 1 // Allow 1 step tolerance
        });
    }

    private async verifyBackupCode(methodId: string, userCode: string): Promise<boolean> {
        const db = this.dbService.getConnection();
        const method = await db.oneOrNone(
            'SELECT backup_codes_encrypted FROM mfa_methods WHERE id = $1',
            [methodId]
        );

        if (!method) return false;

        const hashedCodes = JSON.parse(this.decryptSecret(method.backup_codes_encrypted));
        const hashedUserCode = crypto.createHash('sha256').update(userCode).digest('hex');

        const isValid = hashedCodes.includes(hashedUserCode);
        if (isValid) {
            // Remove used backup code
            const updatedCodes = hashedCodes.filter((code: string) => code !== hashedUserCode);
            await db.none(`
                UPDATE mfa_methods 
                SET backup_codes_encrypted = $1
                WHERE id = $2
            `, [this.encryptSecret(JSON.stringify(updatedCodes)), methodId]);
        }

        return isValid;
    }

    private generateVerificationCode(): string {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    private normalizeMalaysianNumber(phoneNumber: string): string | null {
        // Remove all non-digits
        const digits = phoneNumber.replace(/\D/g, '');
        
        // Malaysian mobile numbers start with 01 (domestic) or 601 (international)
        if (digits.match(/^01[0-9]{8,9}$/)) {
            return '+6' + digits;
        } else if (digits.match(/^601[0-9]{8,9}$/)) {
            return '+' + digits;
        }
        
        return null;
    }

    private detectCarrier(phoneNumber: string): string {
        const digits = phoneNumber.replace(/\D/g, '');
        
        // Malaysian carrier prefixes
        if (digits.match(/^6012|^6014|^6018|^6019/)) return 'maxis';
        if (digits.match(/^6013|^6019/)) return 'celcom';
        if (digits.match(/^6016|^6010/)) return 'digi';
        if (digits.match(/^6018/)) return 'umobile';
        if (digits.match(/^6015/)) return 'tune_talk';
        
        return 'unknown';
    }

    private async sendSMS(phoneNumber: string, message: string, carrier?: string): Promise<boolean> {
        if (!this.twilioClient) {
            console.warn('Twilio not configured, SMS not sent');
            return false;
        }

        try {
            await this.twilioClient.messages.create({
                body: message,
                from: process.env.TWILIO_PHONE_NUMBER,
                to: phoneNumber
            });

            return true;
        } catch (error) {
            console.error('SMS sending error:', error);
            return false;
        }
    }

    private async sendEmail(emailAddress: string, subject: string, message: string): Promise<boolean> {
        try {
            await this.emailTransporter.sendMail({
                from: process.env.SMTP_FROM || 'noreply@medimate.my',
                to: emailAddress,
                subject,
                text: message,
                html: `<p>${message}</p>`
            });

            return true;
        } catch (error) {
            console.error('Email sending error:', error);
            return false;
        }
    }

    private encryptSecret(secret: string): string {
        const algorithm = 'aes-256-gcm';
        const key = process.env.ENCRYPTION_KEY || 'default-encryption-key-change-in-production';
        const iv = crypto.randomBytes(12);
        
        const cipher = crypto.createCipher(algorithm, key);
        let encrypted = cipher.update(secret, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        return iv.toString('hex') + ':' + encrypted;
    }

    private decryptSecret(encryptedSecret: string): string {
        const algorithm = 'aes-256-gcm';
        const key = process.env.ENCRYPTION_KEY || 'default-encryption-key-change-in-production';
        const parts = encryptedSecret.split(':');
        const iv = Buffer.from(parts[0], 'hex');
        const encrypted = parts[1];
        
        const decipher = crypto.createDecipher(algorithm, key);
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    }

    private maskPhoneNumber(phoneNumber: string): string {
        if (phoneNumber.length < 8) return phoneNumber;
        return phoneNumber.substring(0, 4) + '****' + phoneNumber.substring(phoneNumber.length - 2);
    }

    private maskEmail(email: string): string {
        const [username, domain] = email.split('@');
        if (username.length <= 2) return email;
        return username.substring(0, 2) + '***@' + domain;
    }

    private isValidEmail(email: string): boolean {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    private cleanupExpiredChallenges(): void {
        const now = new Date();
        for (const [challengeId, challenge] of this.challenges.entries()) {
            if (now > challenge.expiresAt) {
                this.challenges.delete(challengeId);
            }
        }
    }
}

export default MFAService;