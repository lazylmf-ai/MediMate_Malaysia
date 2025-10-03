/**
 * Authorization Middleware for Education Content Management
 *
 * Role-based access control for education admin panel.
 * Supports three roles: admin, content_creator, and medical_reviewer.
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

// Role definitions for education content management
export type EducationRole = 'admin' | 'content_creator' | 'medical_reviewer';

// Extend Express Request interface
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                email: string;
                role: string;
                educationRole?: EducationRole;
            };
        }
    }
}

/**
 * Permission matrix for education roles
 */
const PERMISSION_MATRIX: Record<EducationRole, string[]> = {
    admin: [
        'content:create',
        'content:read',
        'content:update',
        'content:delete',
        'content:publish',
        'content:unpublish',
        'content:archive',
        'review:assign',
        'review:view',
        'analytics:view',
        'analytics:export',
        'translation:manage'
    ],
    content_creator: [
        'content:create',
        'content:read',
        'content:update:own',
        'content:submit_review',
        'analytics:view:own',
        'translation:update'
    ],
    medical_reviewer: [
        'content:read',
        'review:view',
        'review:comment',
        'review:approve',
        'review:request_changes',
        'content:publish'
    ]
};

/**
 * Middleware to require specific education roles
 *
 * @param allowedRoles - Array of roles that are allowed to access the route
 * @returns Express middleware function
 */
export const requireRole = (allowedRoles: EducationRole[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        // Check if user is authenticated
        if (!req.user) {
            logger.warn('Authorization failed: User not authenticated', {
                path: req.path,
                method: req.method
            });

            res.status(401).json({
                success: false,
                error: 'Authentication required',
                code: 'AUTH_REQUIRED'
            });
            return;
        }

        // Get user's education role (defaults to checking main role if educationRole not set)
        const userRole = req.user.educationRole || req.user.role as EducationRole;

        // Check if user has an allowed role
        if (!allowedRoles.includes(userRole)) {
            logger.warn('Authorization failed: Insufficient role', {
                userId: req.user.id,
                userRole,
                requiredRoles: allowedRoles,
                path: req.path,
                method: req.method
            });

            res.status(403).json({
                success: false,
                error: 'Insufficient permissions',
                code: 'INSUFFICIENT_ROLE',
                requiredRoles: allowedRoles,
                currentRole: userRole
            });
            return;
        }

        // Log successful authorization
        logger.info('Authorization granted', {
            userId: req.user.id,
            userRole,
            path: req.path,
            method: req.method
        });

        next();
    };
};

/**
 * Middleware to require specific permissions
 *
 * @param requiredPermissions - Array of permissions that are required
 * @param requireAll - If true, all permissions must be present. If false, any permission is sufficient.
 * @returns Express middleware function
 */
export const requirePermission = (
    requiredPermissions: string[],
    requireAll: boolean = false
) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        // Check if user is authenticated
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: 'Authentication required',
                code: 'AUTH_REQUIRED'
            });
            return;
        }

        // Get user's education role
        const userRole = req.user.educationRole || req.user.role as EducationRole;

        // Get permissions for user's role
        const userPermissions = PERMISSION_MATRIX[userRole] || [];

        // Check permissions
        const hasPermissions = requireAll
            ? requiredPermissions.every(perm => userPermissions.includes(perm))
            : requiredPermissions.some(perm => userPermissions.includes(perm));

        if (!hasPermissions) {
            const missingPermissions = requiredPermissions.filter(
                perm => !userPermissions.includes(perm)
            );

            logger.warn('Authorization failed: Missing permissions', {
                userId: req.user.id,
                userRole,
                requiredPermissions,
                missingPermissions,
                path: req.path,
                method: req.method
            });

            res.status(403).json({
                success: false,
                error: 'Insufficient permissions',
                code: 'INSUFFICIENT_PERMISSIONS',
                requiredPermissions,
                missingPermissions,
                currentRole: userRole
            });
            return;
        }

        next();
    };
};

/**
 * Middleware to check ownership of content
 * Used for operations that should only be performed on user's own content
 *
 * @param getAuthorId - Function to extract author ID from request
 * @returns Express middleware function
 */
export const requireOwnership = (
    getAuthorId: (req: Request) => Promise<string | null>
) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        // Check if user is authenticated
        if (!req.user) {
            res.status(401).json({
                success: false,
                error: 'Authentication required',
                code: 'AUTH_REQUIRED'
            });
            return;
        }

        // Admin can access all content
        const userRole = req.user.educationRole || req.user.role as EducationRole;
        if (userRole === 'admin') {
            next();
            return;
        }

        try {
            // Get author ID from the content
            const authorId = await getAuthorId(req);

            if (!authorId) {
                res.status(404).json({
                    success: false,
                    error: 'Content not found',
                    code: 'NOT_FOUND'
                });
                return;
            }

            // Check if user is the author
            if (authorId !== req.user.id) {
                logger.warn('Authorization failed: Not content owner', {
                    userId: req.user.id,
                    authorId,
                    contentId: req.params.id,
                    path: req.path
                });

                res.status(403).json({
                    success: false,
                    error: 'You can only modify your own content',
                    code: 'NOT_OWNER'
                });
                return;
            }

            next();
        } catch (error) {
            logger.error('Ownership check failed', {
                error: error instanceof Error ? error.message : 'Unknown error',
                userId: req.user.id,
                path: req.path
            });

            res.status(500).json({
                success: false,
                error: 'Ownership verification failed',
                code: 'OWNERSHIP_CHECK_FAILED'
            });
        }
    };
};

/**
 * Helper function to check if user has a specific permission
 *
 * @param role - User's education role
 * @param permission - Permission to check
 * @returns True if user has the permission
 */
export const hasPermission = (role: EducationRole, permission: string): boolean => {
    const permissions = PERMISSION_MATRIX[role] || [];
    return permissions.includes(permission);
};

/**
 * Helper function to get all permissions for a role
 *
 * @param role - Education role
 * @returns Array of permissions
 */
export const getRolePermissions = (role: EducationRole): string[] => {
    return PERMISSION_MATRIX[role] || [];
};

/**
 * Export permission matrix for testing and documentation
 */
export { PERMISSION_MATRIX };
