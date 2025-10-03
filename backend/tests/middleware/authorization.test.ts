/**
 * Authorization Middleware Tests
 *
 * Tests for education content management RBAC middleware.
 * Tests role-based access control, permissions, and ownership checks.
 */

import { Request, Response, NextFunction } from 'express';
import {
    requireRole,
    requirePermission,
    requireOwnership,
    hasPermission,
    getRolePermissions,
    PERMISSION_MATRIX,
    EducationRole,
} from '../../src/middleware/authorization';
import { logger } from '../../src/utils/logger';

// Mock logger
jest.mock('../../src/utils/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

describe('Authorization Middleware', () => {
    let mockRequest: Partial<Request>;
    let mockResponse: Partial<Response>;
    let mockNext: NextFunction;

    beforeEach(() => {
        mockRequest = {
            user: undefined,
            path: '/test/path',
            method: 'GET',
            params: {},
        };

        mockResponse = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };

        mockNext = jest.fn();

        jest.clearAllMocks();
    });

    describe('requireRole middleware', () => {
        it('should return 401 if user is not authenticated', () => {
            const middleware = requireRole(['admin']);

            middleware(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                error: 'Authentication required',
                code: 'AUTH_REQUIRED',
            });
            expect(mockNext).not.toHaveBeenCalled();
            expect(logger.warn).toHaveBeenCalled();
        });

        it('should allow access when user has required role', () => {
            mockRequest.user = {
                id: 'user-123',
                email: 'admin@test.com',
                role: 'admin',
            };

            const middleware = requireRole(['admin']);

            middleware(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockNext).toHaveBeenCalled();
            expect(mockResponse.status).not.toHaveBeenCalled();
            expect(logger.info).toHaveBeenCalledWith(
                'Authorization granted',
                expect.objectContaining({
                    userId: 'user-123',
                    userRole: 'admin',
                })
            );
        });

        it('should allow access when user has one of multiple allowed roles', () => {
            mockRequest.user = {
                id: 'user-123',
                email: 'creator@test.com',
                role: 'content_creator',
            };

            const middleware = requireRole(['admin', 'content_creator']);

            middleware(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockNext).toHaveBeenCalled();
            expect(mockResponse.status).not.toHaveBeenCalled();
        });

        it('should deny access when user does not have required role', () => {
            mockRequest.user = {
                id: 'user-123',
                email: 'creator@test.com',
                role: 'content_creator',
            };

            const middleware = requireRole(['admin']);

            middleware(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockResponse.status).toHaveBeenCalledWith(403);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                error: 'Insufficient permissions',
                code: 'INSUFFICIENT_ROLE',
                requiredRoles: ['admin'],
                currentRole: 'content_creator',
            });
            expect(mockNext).not.toHaveBeenCalled();
            expect(logger.warn).toHaveBeenCalled();
        });

        it('should use educationRole if available', () => {
            mockRequest.user = {
                id: 'user-123',
                email: 'reviewer@test.com',
                role: 'patient',
                educationRole: 'medical_reviewer',
            };

            const middleware = requireRole(['medical_reviewer']);

            middleware(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockNext).toHaveBeenCalled();
            expect(mockResponse.status).not.toHaveBeenCalled();
        });
    });

    describe('requirePermission middleware', () => {
        it('should return 401 if user is not authenticated', () => {
            const middleware = requirePermission(['content:create']);

            middleware(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                error: 'Authentication required',
                code: 'AUTH_REQUIRED',
            });
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should allow access when user has required permission (admin)', () => {
            mockRequest.user = {
                id: 'user-123',
                email: 'admin@test.com',
                role: 'admin',
            };

            const middleware = requirePermission(['content:create']);

            middleware(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockNext).toHaveBeenCalled();
            expect(mockResponse.status).not.toHaveBeenCalled();
        });

        it('should allow access when user has required permission (content_creator)', () => {
            mockRequest.user = {
                id: 'user-123',
                email: 'creator@test.com',
                role: 'content_creator',
            };

            const middleware = requirePermission(['content:create']);

            middleware(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockNext).toHaveBeenCalled();
            expect(mockResponse.status).not.toHaveBeenCalled();
        });

        it('should deny access when user does not have required permission', () => {
            mockRequest.user = {
                id: 'user-123',
                email: 'reviewer@test.com',
                role: 'medical_reviewer',
            };

            const middleware = requirePermission(['content:create']);

            middleware(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockResponse.status).toHaveBeenCalledWith(403);
            expect(mockResponse.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    success: false,
                    error: 'Insufficient permissions',
                    code: 'INSUFFICIENT_PERMISSIONS',
                    requiredPermissions: ['content:create'],
                })
            );
            expect(mockNext).not.toHaveBeenCalled();
            expect(logger.warn).toHaveBeenCalled();
        });

        it('should allow access when user has ANY of the required permissions', () => {
            mockRequest.user = {
                id: 'user-123',
                email: 'reviewer@test.com',
                role: 'medical_reviewer',
            };

            const middleware = requirePermission(
                ['content:create', 'review:view'],
                false // requireAll = false (default)
            );

            middleware(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockNext).toHaveBeenCalled();
            expect(mockResponse.status).not.toHaveBeenCalled();
        });

        it('should require ALL permissions when requireAll is true', () => {
            mockRequest.user = {
                id: 'user-123',
                email: 'creator@test.com',
                role: 'content_creator',
            };

            const middleware = requirePermission(
                ['content:create', 'content:delete'],
                true // requireAll = true
            );

            middleware(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            // content_creator has content:create but not content:delete
            expect(mockResponse.status).toHaveBeenCalledWith(403);
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should allow access when user has ALL required permissions', () => {
            mockRequest.user = {
                id: 'user-123',
                email: 'admin@test.com',
                role: 'admin',
            };

            const middleware = requirePermission(
                ['content:create', 'content:delete'],
                true // requireAll = true
            );

            middleware(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            // admin has all permissions
            expect(mockNext).toHaveBeenCalled();
            expect(mockResponse.status).not.toHaveBeenCalled();
        });
    });

    describe('requireOwnership middleware', () => {
        it('should return 401 if user is not authenticated', async () => {
            const getAuthorId = jest.fn().mockResolvedValue('author-456');
            const middleware = requireOwnership(getAuthorId);

            await middleware(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockResponse.status).toHaveBeenCalledWith(401);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                error: 'Authentication required',
                code: 'AUTH_REQUIRED',
            });
            expect(mockNext).not.toHaveBeenCalled();
            expect(getAuthorId).not.toHaveBeenCalled();
        });

        it('should allow admin to access any content', async () => {
            mockRequest.user = {
                id: 'user-123',
                email: 'admin@test.com',
                role: 'admin',
            };

            const getAuthorId = jest.fn().mockResolvedValue('author-456');
            const middleware = requireOwnership(getAuthorId);

            await middleware(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockNext).toHaveBeenCalled();
            expect(mockResponse.status).not.toHaveBeenCalled();
            expect(getAuthorId).not.toHaveBeenCalled();
        });

        it('should allow content owner to access their content', async () => {
            mockRequest.user = {
                id: 'user-123',
                email: 'creator@test.com',
                role: 'content_creator',
            };

            const getAuthorId = jest.fn().mockResolvedValue('user-123');
            const middleware = requireOwnership(getAuthorId);

            await middleware(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(getAuthorId).toHaveBeenCalledWith(mockRequest);
            expect(mockNext).toHaveBeenCalled();
            expect(mockResponse.status).not.toHaveBeenCalled();
        });

        it('should deny access when user is not the content owner', async () => {
            mockRequest.user = {
                id: 'user-123',
                email: 'creator@test.com',
                role: 'content_creator',
            };
            mockRequest.params = { id: 'content-789' };

            const getAuthorId = jest.fn().mockResolvedValue('author-456');
            const middleware = requireOwnership(getAuthorId);

            await middleware(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(getAuthorId).toHaveBeenCalledWith(mockRequest);
            expect(mockResponse.status).toHaveBeenCalledWith(403);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                error: 'You can only modify your own content',
                code: 'NOT_OWNER',
            });
            expect(mockNext).not.toHaveBeenCalled();
            expect(logger.warn).toHaveBeenCalled();
        });

        it('should return 404 when content is not found', async () => {
            mockRequest.user = {
                id: 'user-123',
                email: 'creator@test.com',
                role: 'content_creator',
            };

            const getAuthorId = jest.fn().mockResolvedValue(null);
            const middleware = requireOwnership(getAuthorId);

            await middleware(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockResponse.status).toHaveBeenCalledWith(404);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                error: 'Content not found',
                code: 'NOT_FOUND',
            });
            expect(mockNext).not.toHaveBeenCalled();
        });

        it('should handle errors gracefully', async () => {
            mockRequest.user = {
                id: 'user-123',
                email: 'creator@test.com',
                role: 'content_creator',
            };

            const getAuthorId = jest
                .fn()
                .mockRejectedValue(new Error('Database error'));
            const middleware = requireOwnership(getAuthorId);

            await middleware(
                mockRequest as Request,
                mockResponse as Response,
                mockNext
            );

            expect(mockResponse.status).toHaveBeenCalledWith(500);
            expect(mockResponse.json).toHaveBeenCalledWith({
                success: false,
                error: 'Ownership verification failed',
                code: 'OWNERSHIP_CHECK_FAILED',
            });
            expect(mockNext).not.toHaveBeenCalled();
            expect(logger.error).toHaveBeenCalled();
        });
    });

    describe('Helper functions', () => {
        describe('hasPermission', () => {
            it('should return true when admin has any permission', () => {
                expect(hasPermission('admin', 'content:create')).toBe(true);
                expect(hasPermission('admin', 'content:delete')).toBe(true);
                expect(hasPermission('admin', 'analytics:view')).toBe(true);
            });

            it('should return true when content_creator has allowed permission', () => {
                expect(hasPermission('content_creator', 'content:create')).toBe(true);
                expect(hasPermission('content_creator', 'content:read')).toBe(true);
            });

            it('should return false when content_creator lacks permission', () => {
                expect(hasPermission('content_creator', 'content:delete')).toBe(false);
                expect(hasPermission('content_creator', 'review:assign')).toBe(false);
            });

            it('should return true when medical_reviewer has allowed permission', () => {
                expect(hasPermission('medical_reviewer', 'review:view')).toBe(true);
                expect(hasPermission('medical_reviewer', 'review:approve')).toBe(true);
                expect(hasPermission('medical_reviewer', 'content:publish')).toBe(true);
            });

            it('should return false when medical_reviewer lacks permission', () => {
                expect(hasPermission('medical_reviewer', 'content:create')).toBe(false);
                expect(hasPermission('medical_reviewer', 'content:delete')).toBe(false);
            });
        });

        describe('getRolePermissions', () => {
            it('should return all permissions for admin', () => {
                const permissions = getRolePermissions('admin');
                expect(permissions).toContain('content:create');
                expect(permissions).toContain('content:delete');
                expect(permissions).toContain('content:publish');
                expect(permissions).toContain('analytics:view');
                expect(permissions.length).toBeGreaterThan(0);
            });

            it('should return correct permissions for content_creator', () => {
                const permissions = getRolePermissions('content_creator');
                expect(permissions).toContain('content:create');
                expect(permissions).toContain('content:read');
                expect(permissions).not.toContain('content:delete');
                expect(permissions).not.toContain('review:assign');
            });

            it('should return correct permissions for medical_reviewer', () => {
                const permissions = getRolePermissions('medical_reviewer');
                expect(permissions).toContain('review:view');
                expect(permissions).toContain('review:approve');
                expect(permissions).toContain('content:read');
                expect(permissions).not.toContain('content:create');
                expect(permissions).not.toContain('content:delete');
            });
        });

        describe('PERMISSION_MATRIX', () => {
            it('should have all three roles defined', () => {
                expect(PERMISSION_MATRIX).toHaveProperty('admin');
                expect(PERMISSION_MATRIX).toHaveProperty('content_creator');
                expect(PERMISSION_MATRIX).toHaveProperty('medical_reviewer');
            });

            it('should have admin with most permissions', () => {
                const adminPerms = PERMISSION_MATRIX.admin;
                const creatorPerms = PERMISSION_MATRIX.content_creator;
                const reviewerPerms = PERMISSION_MATRIX.medical_reviewer;

                expect(adminPerms.length).toBeGreaterThan(creatorPerms.length);
                expect(adminPerms.length).toBeGreaterThan(reviewerPerms.length);
            });

            it('should define proper role separation', () => {
                // Content creators can create but not delete
                expect(PERMISSION_MATRIX.content_creator).toContain('content:create');
                expect(PERMISSION_MATRIX.content_creator).not.toContain('content:delete');

                // Medical reviewers can review but not create
                expect(PERMISSION_MATRIX.medical_reviewer).toContain('review:approve');
                expect(PERMISSION_MATRIX.medical_reviewer).not.toContain('content:create');

                // Only admin can assign reviewers
                expect(PERMISSION_MATRIX.admin).toContain('review:assign');
                expect(PERMISSION_MATRIX.content_creator).not.toContain('review:assign');
                expect(PERMISSION_MATRIX.medical_reviewer).not.toContain('review:assign');
            });
        });
    });
});
