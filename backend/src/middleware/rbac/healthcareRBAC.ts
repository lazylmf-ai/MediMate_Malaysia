/**
 * Healthcare RBAC Middleware
 * 
 * Role-based access control middleware for Malaysian healthcare system
 * with emergency access protocols and cultural considerations.
 */

import { Request, Response, NextFunction } from 'express';
import { PermissionService } from '../../services/rbac/permissionService';
import { AuditService } from '../../services/audit/auditService';

// Extend Express Request interface for healthcare context
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                email: string;
                role: string;
                healthcareRole?: string;
                emergencyAccess?: boolean;
                culturalProfile?: any;
            };
            healthcare?: {
                permissions: string[];
                emergencyCode?: string;
                patientId?: string;
                requiresConsent: boolean;
                dataSensitivity: number;
            };
        }
    }
}

export interface RBACOptions {
    permissions: string | string[];
    requireAll?: boolean; // Require all permissions vs any permission
    allowEmergencyAccess?: boolean;
    requirePatientConsent?: boolean;
    dataSensitivity?: number; // 1-5 scale
    customCheck?: (req: Request) => Promise<boolean>;
    culturalOverrides?: {
        prayerTimeBypass?: boolean;
        ramadanConsiderations?: boolean;
    };
}

export class HealthcareRBACMiddleware {
    private permissionService: PermissionService;
    private auditService: AuditService;

    constructor() {
        this.permissionService = PermissionService.getInstance();
        this.auditService = AuditService.getInstance();
    }

    /**
     * Create RBAC middleware with specified options
     */
    requirePermissions(options: RBACOptions) {
        return async (req: Request, res: Response, next: NextFunction) => {
            try {
                // Check if user is authenticated
                if (!req.user) {
                    return res.status(401).json({
                        success: false,
                        error: 'Authentication required',
                        code: 'AUTH_REQUIRED'
                    });
                }

                const permissions = Array.isArray(options.permissions) 
                    ? options.permissions 
                    : [options.permissions];

                // Check permissions
                const permissionResults = await this.permissionService.hasPermissions(
                    req.user.id,
                    permissions,
                    req.params.patientId || req.body.patientId,
                    {
                        emergency: req.headers['x-emergency-access'] === 'true' || req.user.emergencyAccess,
                        culturalProfile: req.user.culturalProfile,
                        ipAddress: req.ip,
                        userAgent: req.get('User-Agent')
                    }
                );

                // Evaluate permission results
                const evaluationResult = this.evaluatePermissions(permissionResults, options);
                
                if (!evaluationResult.allowed) {
                    // Audit failed access attempt
                    await this.auditService.logEvent({
                        eventType: 'access_denied',
                        userId: req.user.id,
                        description: `Access denied: ${evaluationResult.reason}`,
                        metadata: {
                            requiredPermissions: permissions,
                            route: req.path,
                            method: req.method,
                            reason: evaluationResult.reason
                        },
                        ipAddress: req.ip,
                        userAgent: req.get('User-Agent')
                    });

                    return res.status(evaluationResult.statusCode || 403).json({
                        success: false,
                        error: evaluationResult.reason || 'Insufficient permissions',
                        code: evaluationResult.errorCode || 'INSUFFICIENT_PERMISSIONS',
                        requiredPermissions: permissions,
                        missingPermissions: evaluationResult.missingPermissions
                    });
                }

                // Set healthcare context
                req.healthcare = {
                    permissions: permissions.filter(p => permissionResults[p]?.hasPermission),
                    emergencyCode: req.headers['x-emergency-code'] as string,
                    patientId: req.params.patientId || req.body.patientId,
                    requiresConsent: evaluationResult.requiresConsent || false,
                    dataSensitivity: options.dataSensitivity || 1
                };

                // Custom validation check
                if (options.customCheck) {
                    const customResult = await options.customCheck(req);
                    if (!customResult) {
                        return res.status(403).json({
                            success: false,
                            error: 'Custom validation failed',
                            code: 'CUSTOM_VALIDATION_FAILED'
                        });
                    }
                }

                // Cultural considerations
                if (options.culturalOverrides && req.user.culturalProfile) {
                    const culturalCheck = await this.checkCulturalConstraints(req, options.culturalOverrides);
                    if (!culturalCheck.allowed) {
                        return res.status(202).json({
                            success: false,
                            error: culturalCheck.message,
                            code: 'CULTURAL_CONSTRAINT',
                            suggestedTime: culturalCheck.suggestedTime
                        });
                    }
                }

                // Audit successful access
                await this.auditService.logEvent({
                    eventType: 'permission_granted',
                    userId: req.user.id,
                    description: `Access granted to ${req.path}`,
                    metadata: {
                        permissions,
                        route: req.path,
                        method: req.method,
                        emergencyAccess: evaluationResult.emergencyAccess,
                        hierarchyOverride: evaluationResult.hierarchyOverride
                    },
                    ipAddress: req.ip,
                    userAgent: req.get('User-Agent')
                });

                next();

            } catch (error) {
                console.error('RBAC middleware error:', error);
                
                await this.auditService.logEvent({
                    eventType: 'rbac_error',
                    userId: req.user?.id,
                    description: 'RBAC middleware error',
                    metadata: { error: error instanceof Error ? error.message : 'Unknown error' },
                    ipAddress: req.ip,
                    userAgent: req.get('User-Agent')
                });

                return res.status(500).json({
                    success: false,
                    error: 'Permission check failed',
                    code: 'RBAC_ERROR'
                });
            }
        };
    }

    /**
     * Middleware for healthcare role requirements
     */
    requireRole(roles: string | string[]) {
        const roleArray = Array.isArray(roles) ? roles : [roles];
        
        return (req: Request, res: Response, next: NextFunction) => {
            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
            }

            if (!req.user.healthcareRole || !roleArray.includes(req.user.healthcareRole)) {
                return res.status(403).json({
                    success: false,
                    error: 'Insufficient role privileges',
                    code: 'INSUFFICIENT_ROLE',
                    requiredRoles: roleArray,
                    currentRole: req.user.healthcareRole
                });
            }

            next();
        };
    }

    /**
     * Middleware for emergency access validation
     */
    requireEmergencyAccess(emergencyTypes: string[] = []) {
        return async (req: Request, res: Response, next: NextFunction) => {
            try {
                if (!req.user) {
                    return res.status(401).json({
                        success: false,
                        error: 'Authentication required'
                    });
                }

                const emergencyCode = req.headers['x-emergency-code'] as string;
                if (!emergencyCode) {
                    return res.status(400).json({
                        success: false,
                        error: 'Emergency access code required',
                        code: 'EMERGENCY_CODE_REQUIRED'
                    });
                }

                // Validate emergency access
                const isValid = await this.permissionService.validateEmergencyAccess(
                    req.user.id,
                    emergencyCode,
                    'emergency_access'
                );

                if (!isValid) {
                    return res.status(403).json({
                        success: false,
                        error: 'Invalid or expired emergency access',
                        code: 'INVALID_EMERGENCY_ACCESS'
                    });
                }

                // Set emergency context
                req.user.emergencyAccess = true;
                req.healthcare = {
                    ...req.healthcare,
                    emergencyCode,
                    permissions: ['emergency_access'],
                    requiresConsent: false,
                    dataSensitivity: 5
                };

                next();

            } catch (error) {
                console.error('Emergency access validation error:', error);
                return res.status(500).json({
                    success: false,
                    error: 'Emergency access validation failed'
                });
            }
        };
    }

    /**
     * Middleware for patient consent checking
     */
    requirePatientConsent(consentTypes: string[] = ['data_access']) {
        return async (req: Request, res: Response, next: NextFunction) => {
            try {
                if (!req.user) {
                    return res.status(401).json({
                        success: false,
                        error: 'Authentication required'
                    });
                }

                const patientId = req.params.patientId || req.body.patientId;
                if (!patientId) {
                    return res.status(400).json({
                        success: false,
                        error: 'Patient ID required',
                        code: 'PATIENT_ID_REQUIRED'
                    });
                }

                // Skip consent check for emergency access
                if (req.user.emergencyAccess) {
                    next();
                    return;
                }

                // Check patient consent
                const hasConsent = await this.permissionService.checkPatientConsent(
                    patientId,
                    req.user.id,
                    'view_patient_records'
                );

                if (!hasConsent) {
                    return res.status(403).json({
                        success: false,
                        error: 'Patient consent required',
                        code: 'CONSENT_REQUIRED',
                        patientId,
                        requiredConsentTypes: consentTypes
                    });
                }

                next();

            } catch (error) {
                console.error('Consent check error:', error);
                return res.status(500).json({
                    success: false,
                    error: 'Consent validation failed'
                });
            }
        };
    }

    /**
     * Private helper methods
     */
    private evaluatePermissions(
        permissionResults: { [key: string]: any },
        options: RBACOptions
    ): {
        allowed: boolean;
        reason?: string;
        errorCode?: string;
        statusCode?: number;
        missingPermissions?: string[];
        requiresConsent?: boolean;
        emergencyAccess?: boolean;
        hierarchyOverride?: boolean;
    } {
        const permissions = Object.keys(permissionResults);
        const hasAnyPermission = permissions.some(p => permissionResults[p].hasPermission);
        const hasAllPermissions = permissions.every(p => permissionResults[p].hasPermission);
        const missingPermissions = permissions.filter(p => !permissionResults[p].hasPermission);

        // Check if any permission was granted via emergency or hierarchy
        const emergencyAccess = permissions.some(p => permissionResults[p].emergencyOverride);
        const hierarchyOverride = permissions.some(p => permissionResults[p].hierarchyOverride);
        const requiresConsent = permissions.some(p => permissionResults[p].requiresConsent);

        // Evaluate based on requirements
        if (options.requireAll && !hasAllPermissions && !emergencyAccess) {
            return {
                allowed: false,
                reason: 'Missing required permissions',
                errorCode: 'MISSING_PERMISSIONS',
                statusCode: 403,
                missingPermissions
            };
        }

        if (!options.requireAll && !hasAnyPermission && !emergencyAccess) {
            return {
                allowed: false,
                reason: 'No sufficient permissions',
                errorCode: 'NO_PERMISSIONS',
                statusCode: 403,
                missingPermissions
            };
        }

        return {
            allowed: true,
            requiresConsent,
            emergencyAccess,
            hierarchyOverride
        };
    }

    private async checkCulturalConstraints(
        req: Request,
        culturalOverrides: NonNullable<RBACOptions['culturalOverrides']>
    ): Promise<{ allowed: boolean; message?: string; suggestedTime?: Date }> {
        const culturalProfile = req.user?.culturalProfile;
        if (!culturalProfile) {
            return { allowed: true };
        }

        // Prayer time considerations
        if (culturalProfile.prayer_times_enabled && !culturalOverrides.prayerTimeBypass) {
            const now = new Date();
            const currentHour = now.getHours();
            
            // Basic prayer time check (simplified)
            const prayerTimes = [5, 13, 15, 19, 20]; // Approximate prayer hours
            const isPrayerTime = prayerTimes.some(hour => Math.abs(currentHour - hour) < 0.5);
            
            if (isPrayerTime) {
                const suggestedTime = new Date();
                suggestedTime.setHours(currentHour + 1);
                
                return {
                    allowed: false,
                    message: 'System access restricted during prayer time',
                    suggestedTime
                };
            }
        }

        // Ramadan considerations
        if (culturalOverrides.ramadanConsiderations && this.isRamadanPeriod()) {
            const now = new Date();
            const currentHour = now.getHours();
            
            // Modified working hours during Ramadan
            if (currentHour > 14 && currentHour < 16) {
                return {
                    allowed: false,
                    message: 'System access limited during Ramadan afternoon hours'
                };
            }
        }

        return { allowed: true };
    }

    private isRamadanPeriod(): boolean {
        // This would integrate with Islamic calendar API
        // For now, return false as placeholder
        return false;
    }
}

// Export singleton instance
export const rbacMiddleware = new HealthcareRBACMiddleware();

/**
 * Helper functions for common RBAC patterns
 */
export const requirePermission = (permission: string, options: Partial<RBACOptions> = {}) => {
    return rbacMiddleware.requirePermissions({
        permissions: permission,
        ...options
    });
};

export const requireAnyPermission = (permissions: string[], options: Partial<RBACOptions> = {}) => {
    return rbacMiddleware.requirePermissions({
        permissions,
        requireAll: false,
        ...options
    });
};

export const requireAllPermissions = (permissions: string[], options: Partial<RBACOptions> = {}) => {
    return rbacMiddleware.requirePermissions({
        permissions,
        requireAll: true,
        ...options
    });
};

export const requireHealthcareRole = (roles: string | string[]) => {
    return rbacMiddleware.requireRole(roles);
};

export const requireEmergencyAccess = (emergencyTypes?: string[]) => {
    return rbacMiddleware.requireEmergencyAccess(emergencyTypes);
};

export const requirePatientConsent = (consentTypes?: string[]) => {
    return rbacMiddleware.requirePatientConsent(consentTypes);
};

export default rbacMiddleware;