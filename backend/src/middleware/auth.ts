/**
 * Authentication Middleware
 * 
 * Basic authentication middleware for PDPA compliance system
 * In production, this would integrate with proper JWT/OAuth system
 */

import { Request, Response, NextFunction } from 'express';

// Extend Express Request type
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                email: string;
                role: string;
            };
        }
    }
}

/**
 * Authenticate user (placeholder implementation)
 * In production, this would validate JWT tokens and set req.user
 */
export const authenticateUser = (req: Request, res: Response, next: NextFunction): void => {
    // Placeholder authentication
    // In production, this would:
    // 1. Extract JWT token from Authorization header
    // 2. Validate and decode token
    // 3. Set req.user with authenticated user info
    
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
            success: false,
            message: 'Authentication required',
            error: 'Missing or invalid authorization header'
        });
        return;
    }
    
    // Mock user for testing
    // In production, decode and validate the JWT token
    const token = authHeader.substring(7);
    
    if (token === 'test-token') {
        req.user = {
            id: 'test-user-id',
            email: 'test@medimate.my',
            role: 'patient'
        };
        next();
    } else if (token === 'admin-token') {
        req.user = {
            id: 'admin-user-id',
            email: 'admin@medimate.my',
            role: 'admin'
        };
        next();
    } else if (token === 'dpo-token') {
        req.user = {
            id: 'dpo-user-id',
            email: 'dpo@medimate.my',
            role: 'dpo'
        };
        next();
    } else {
        res.status(401).json({
            success: false,
            message: 'Invalid authentication token'
        });
        return;
    }
};

/**
 * Require specific user roles
 */
export const requireRole = (allowedRoles: string[]) => {
    return (req: Request, res: Response, next: NextFunction): void => {
        if (!req.user) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }
        
        if (!allowedRoles.includes(req.user.role)) {
            res.status(403).json({
                success: false,
                message: 'Insufficient permissions',
                required: allowedRoles,
                current: req.user.role
            });
            return;
        }
        
        next();
    };
};

/**
 * Optional authentication (sets user if token is valid, but doesn't require it)
 */
export const optionalAuth = (req: Request, res: Response, next: NextFunction): void => {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        
        // Mock authentication logic
        if (token === 'test-token') {
            req.user = {
                id: 'test-user-id',
                email: 'test@medimate.my',
                role: 'patient'
            };
        } else if (token === 'admin-token') {
            req.user = {
                id: 'admin-user-id',
                email: 'admin@medimate.my',
                role: 'admin'
            };
        } else if (token === 'dpo-token') {
            req.user = {
                id: 'dpo-user-id',
                email: 'dpo@medimate.my',
                role: 'dpo'
            };
        }
    }
    
    next();
};

export default {
    authenticateUser,
    requireRole,
    optionalAuth
};