/**
 * Permission Service
 * 
 * Healthcare Role-Based Access Control (RBAC) service
 * with Malaysian healthcare hierarchy and emergency access protocols.
 */

import { DatabaseService } from '../database/databaseService';
import { AuditService } from '../audit/auditService';

export interface HealthcareRole {
    id: string;
    roleName: string;
    roleCode: string;
    displayName: string;
    hierarchyLevel: number;
    parentRoleId?: string;
    canPrescribe: boolean;
    canDiagnose: boolean;
    canAccessFullRecords: boolean;
    requiresMedicalLicense: boolean;
    requiresMMCRegistration: boolean;
    emergencyAccessLevel: number;
    canOverrideRestrictions: boolean;
}

export interface Permission {
    id: string;
    permissionName: string;
    permissionCode: string;
    category: string;
    description: string;
    dataSensitivity: number;
    requiresAudit: boolean;
    requiresPatientConsent: boolean;
}

export interface PermissionCheck {
    hasPermission: boolean;
    reason?: string;
    requiresConsent?: boolean;
    requiresAudit?: boolean;
    emergencyOverride?: boolean;
    hierarchyOverride?: boolean;
}

export interface EmergencyAccessRequest {
    requestingUserId: string;
    patientUserId: string;
    emergencyType: string;
    justification: string;
    requiredPermissions: string[];
    durationMinutes?: number;
}

export class PermissionService {
    private static instance: PermissionService;
    private dbService: DatabaseService;
    private auditService: AuditService;
    private permissionCache: Map<string, Permission[]> = new Map();
    private roleCache: Map<string, HealthcareRole> = new Map();

    constructor() {
        this.dbService = DatabaseService.getInstance();
        this.auditService = AuditService.getInstance();
        
        // Refresh cache every 30 minutes
        setInterval(() => this.refreshCache(), 30 * 60 * 1000);
    }

    public static getInstance(): PermissionService {
        if (!PermissionService.instance) {
            PermissionService.instance = new PermissionService();
        }
        return PermissionService.instance;
    }

    /**
     * Check if user has specific permission
     */
    async hasPermission(
        userId: string,
        permissionCode: string,
        resourceId?: string,
        context?: any
    ): Promise<PermissionCheck> {
        const db = this.dbService.getConnection();

        try {
            // Get user's role and permissions
            const userRole = await this.getUserRole(userId);
            if (!userRole) {
                return { hasPermission: false, reason: 'User has no assigned role' };
            }

            // Get permission details
            const permission = await this.getPermission(permissionCode);
            if (!permission) {
                return { hasPermission: false, reason: 'Permission not found' };
            }

            // Check direct role permission
            const hasDirectPermission = await this.checkDirectPermission(userRole.id, permission.id);
            if (hasDirectPermission) {
                return {
                    hasPermission: true,
                    requiresConsent: permission.requiresPatientConsent,
                    requiresAudit: permission.requiresAudit
                };
            }

            // Check hierarchy-based permission (higher roles can access lower-level permissions)
            const hierarchyAccess = await this.checkHierarchyPermission(userRole, permission);
            if (hierarchyAccess.hasPermission) {
                return hierarchyAccess;
            }

            // Check emergency override capability
            if (userRole.emergencyAccessLevel >= 2 && context?.emergency) {
                return {
                    hasPermission: true,
                    emergencyOverride: true,
                    requiresAudit: true,
                    reason: 'Emergency access granted'
                };
            }

            return { hasPermission: false, reason: 'Insufficient permissions' };

        } catch (error) {
            console.error('Permission check error:', error);
            return { hasPermission: false, reason: 'Permission check failed' };
        }
    }

    /**
     * Check multiple permissions for user
     */
    async hasPermissions(
        userId: string,
        permissionCodes: string[],
        resourceId?: string,
        context?: any
    ): Promise<{ [key: string]: PermissionCheck }> {
        const results: { [key: string]: PermissionCheck } = {};

        for (const permissionCode of permissionCodes) {
            results[permissionCode] = await this.hasPermission(userId, permissionCode, resourceId, context);
        }

        return results;
    }

    /**
     * Get all permissions for user
     */
    async getUserPermissions(userId: string): Promise<Permission[]> {
        const userRole = await this.getUserRole(userId);
        if (!userRole) {
            return [];
        }

        // Get cached permissions or fetch from database
        const cacheKey = `role_${userRole.id}`;
        if (this.permissionCache.has(cacheKey)) {
            return this.permissionCache.get(cacheKey)!;
        }

        const db = this.dbService.getConnection();
        const permissions = await db.manyOrNone(`
            SELECT hp.* 
            FROM healthcare_permissions hp
            JOIN role_permissions rp ON hp.id = rp.permission_id
            WHERE rp.role_id = $1 AND rp.granted = TRUE AND hp.active = TRUE
        `, [userRole.id]);

        // Add hierarchy-based permissions
        const hierarchyPermissions = await this.getHierarchyPermissions(userRole);
        const allPermissions = [...permissions, ...hierarchyPermissions];

        // Remove duplicates
        const uniquePermissions = allPermissions.filter(
            (permission, index, self) => 
                self.findIndex(p => p.id === permission.id) === index
        );

        // Cache the result
        this.permissionCache.set(cacheKey, uniquePermissions);

        return uniquePermissions;
    }

    /**
     * Grant emergency access
     */
    async grantEmergencyAccess(
        request: EmergencyAccessRequest,
        approvingUserId?: string
    ): Promise<{ success: boolean; emergencyToken?: string; error?: string }> {
        const db = this.dbService.getConnection();

        try {
            // Validate requesting user has emergency access capability
            const requestingRole = await this.getUserRole(request.requestingUserId);
            if (!requestingRole || requestingRole.emergencyAccessLevel < 2) {
                return {
                    success: false,
                    error: 'Insufficient emergency access privileges'
                };
            }

            // Log emergency access request
            const emergencyLogId = await db.one(`
                INSERT INTO emergency_access_log (
                    accessing_user_id, patient_user_id, emergency_type,
                    emergency_description, justification, legal_basis,
                    duration_minutes, created_at
                ) VALUES ($1, $2, $3, $4, $5, 'vital_interest', $6, NOW())
                RETURNING id
            `, [
                request.requestingUserId,
                request.patientUserId,
                request.emergencyType,
                request.justification,
                request.justification,
                request.durationMinutes || 240 // Default 4 hours
            ]);

            // Generate emergency access code
            const emergencyCode = this.generateEmergencyCode();

            // Update emergency log with code
            await db.none(`
                UPDATE emergency_access_log 
                SET authorization_code = $1
                WHERE id = $2
            `, [emergencyCode, emergencyLogId.id]);

            // Audit log
            await this.auditService.logEvent({
                eventType: 'emergency_access_granted',
                userId: request.requestingUserId,
                description: `Emergency access granted: ${request.emergencyType}`,
                metadata: {
                    patientUserId: request.patientUserId,
                    emergencyType: request.emergencyType,
                    justification: request.justification,
                    permissions: request.requiredPermissions,
                    emergencyCode,
                    approvingUserId
                }
            });

            return {
                success: true,
                emergencyToken: emergencyCode
            };

        } catch (error) {
            console.error('Emergency access grant error:', error);
            return {
                success: false,
                error: 'Failed to grant emergency access'
            };
        }
    }

    /**
     * Validate emergency access token
     */
    async validateEmergencyAccess(
        userId: string,
        emergencyCode: string,
        permissionCode: string
    ): Promise<boolean> {
        const db = this.dbService.getConnection();

        try {
            const emergencyAccess = await db.oneOrNone(`
                SELECT * FROM emergency_access_log
                WHERE accessing_user_id = $1 
                  AND authorization_code = $2
                  AND created_at + (duration_minutes || ' minutes')::INTERVAL > NOW()
                  AND followup_completed IS NOT TRUE
            `, [userId, emergencyCode]);

            return emergencyAccess !== null;

        } catch (error) {
            console.error('Emergency access validation error:', error);
            return false;
        }
    }

    /**
     * Check patient consent for permission
     */
    async checkPatientConsent(
        patientUserId: string,
        accessingUserId: string,
        permissionCode: string
    ): Promise<boolean> {
        const db = this.dbService.getConnection();

        try {
            // Check if consent is required for this permission
            const permission = await this.getPermission(permissionCode);
            if (!permission || !permission.requiresPatientConsent) {
                return true; // No consent required
            }

            // Check for existing consent
            const consent = await db.oneOrNone(`
                SELECT * FROM consent_records
                WHERE user_id = $1 
                  AND consent_granted = TRUE
                  AND withdrawn = FALSE
                  AND data_categories && ARRAY[$2]
                  AND (expiry_date IS NULL OR expiry_date > NOW())
            `, [patientUserId, permission.category]);

            return consent !== null;

        } catch (error) {
            console.error('Consent check error:', error);
            return false;
        }
    }

    /**
     * Get role hierarchy (including parent roles)
     */
    async getRoleHierarchy(roleId: string): Promise<HealthcareRole[]> {
        const hierarchy: HealthcareRole[] = [];
        let currentRole = await this.getRole(roleId);

        while (currentRole) {
            hierarchy.push(currentRole);
            
            if (currentRole.parentRoleId) {
                currentRole = await this.getRole(currentRole.parentRoleId);
            } else {
                break;
            }
        }

        return hierarchy;
    }

    /**
     * Check if user can delegate permission to another user
     */
    async canDelegatePermission(
        delegatingUserId: string,
        targetUserId: string,
        permissionCode: string
    ): Promise<boolean> {
        // Get both users' roles
        const delegatingRole = await this.getUserRole(delegatingUserId);
        const targetRole = await this.getUserRole(targetUserId);

        if (!delegatingRole || !targetRole) {
            return false;
        }

        // Check if delegating user has higher hierarchy level
        if (delegatingRole.hierarchyLevel <= targetRole.hierarchyLevel) {
            return false;
        }

        // Check if delegating user has the permission
        const hasPermission = await this.hasPermission(delegatingUserId, permissionCode);
        if (!hasPermission.hasPermission) {
            return false;
        }

        // Check delegation rules (could be expanded)
        return delegatingRole.canOverrideRestrictions;
    }

    /**
     * Private helper methods
     */
    private async getUserRole(userId: string): Promise<HealthcareRole | null> {
        const cacheKey = `user_role_${userId}`;
        if (this.roleCache.has(cacheKey)) {
            return this.roleCache.get(cacheKey)!;
        }

        const db = this.dbService.getConnection();
        const role = await db.oneOrNone(`
            SELECT hr.*
            FROM healthcare_roles hr
            JOIN user_authentication ua ON hr.id = ua.healthcare_role_id
            WHERE ua.user_id = $1 AND hr.active = TRUE
        `, [userId]);

        if (role) {
            const healthcareRole: HealthcareRole = {
                id: role.id,
                roleName: role.role_name,
                roleCode: role.role_code,
                displayName: role.display_name,
                hierarchyLevel: role.hierarchy_level,
                parentRoleId: role.parent_role_id,
                canPrescribe: role.can_prescribe,
                canDiagnose: role.can_diagnose,
                canAccessFullRecords: role.can_access_full_records,
                requiresMedicalLicense: role.requires_medical_license,
                requiresMMCRegistration: role.requires_mmc_registration,
                emergencyAccessLevel: role.emergency_access_level,
                canOverrideRestrictions: role.can_override_restrictions
            };

            this.roleCache.set(cacheKey, healthcareRole);
            return healthcareRole;
        }

        return null;
    }

    private async getRole(roleId: string): Promise<HealthcareRole | null> {
        const db = this.dbService.getConnection();
        const role = await db.oneOrNone('SELECT * FROM healthcare_roles WHERE id = $1', [roleId]);
        
        if (role) {
            return {
                id: role.id,
                roleName: role.role_name,
                roleCode: role.role_code,
                displayName: role.display_name,
                hierarchyLevel: role.hierarchy_level,
                parentRoleId: role.parent_role_id,
                canPrescribe: role.can_prescribe,
                canDiagnose: role.can_diagnose,
                canAccessFullRecords: role.can_access_full_records,
                requiresMedicalLicense: role.requires_medical_license,
                requiresMMCRegistration: role.requires_mmc_registration,
                emergencyAccessLevel: role.emergency_access_level,
                canOverrideRestrictions: role.can_override_restrictions
            };
        }

        return null;
    }

    private async getPermission(permissionCode: string): Promise<Permission | null> {
        const db = this.dbService.getConnection();
        const permission = await db.oneOrNone(
            'SELECT * FROM healthcare_permissions WHERE permission_code = $1 AND active = TRUE',
            [permissionCode]
        );

        if (permission) {
            return {
                id: permission.id,
                permissionName: permission.permission_name,
                permissionCode: permission.permission_code,
                category: permission.category,
                description: permission.description,
                dataSensitivity: permission.data_sensitivity,
                requiresAudit: permission.requires_audit,
                requiresPatientConsent: permission.requires_patient_consent
            };
        }

        return null;
    }

    private async checkDirectPermission(roleId: string, permissionId: string): Promise<boolean> {
        const db = this.dbService.getConnection();
        const result = await db.oneOrNone(`
            SELECT 1 FROM role_permissions 
            WHERE role_id = $1 AND permission_id = $2 AND granted = TRUE
        `, [roleId, permissionId]);

        return result !== null;
    }

    private async checkHierarchyPermission(role: HealthcareRole, permission: Permission): Promise<PermissionCheck> {
        // Higher hierarchy levels can access lower-sensitivity permissions
        if (role.hierarchyLevel >= 8 && permission.dataSensitivity <= 3) {
            return {
                hasPermission: true,
                hierarchyOverride: true,
                requiresAudit: true,
                reason: 'Hierarchy-based access'
            };
        }

        // Doctors can access most medical permissions
        if ((role.roleName === 'doctor' || role.roleName === 'specialist_doctor') && 
            permission.category === 'medical_records') {
            return {
                hasPermission: true,
                hierarchyOverride: true,
                requiresAudit: permission.requiresAudit
            };
        }

        return { hasPermission: false };
    }

    private async getHierarchyPermissions(role: HealthcareRole): Promise<Permission[]> {
        // This could be expanded to include permissions inherited from hierarchy
        return [];
    }

    private generateEmergencyCode(): string {
        return 'EMG' + Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    private async refreshCache(): Promise<void> {
        this.permissionCache.clear();
        this.roleCache.clear();
    }
}

export default PermissionService;