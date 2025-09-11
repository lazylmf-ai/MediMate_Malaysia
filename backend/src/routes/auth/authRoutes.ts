/**
 * Authentication Routes
 * 
 * Routes for authentication, registration, MFA, and session management
 * with Malaysian healthcare compliance and cultural considerations.
 */

import express from 'express';
import { body, header } from 'express-validator';
import authController from '../../controllers/auth/authController';
import { authenticateUser, optionalAuth } from '../../middleware/auth';
import { validateRequest } from '../../middleware/validation';

const router = express.Router();

/**
 * Registration routes
 */
router.post('/register',
    [
        body('email')
            .isEmail()
            .normalizeEmail()
            .withMessage('Valid email required'),
        
        body('password')
            .isLength({ min: 8 })
            .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
            .withMessage('Password must be at least 8 characters with uppercase, lowercase, number, and special character'),
        
        body('fullName')
            .isLength({ min: 2 })
            .withMessage('Full name required'),
        
        body('icNumber')
            .optional()
            .matches(/^\d{12}$/)
            .withMessage('Invalid Malaysian IC format'),
        
        body('phoneNumber')
            .optional()
            .matches(/^(\+?6?01[0-46-9]-*[0-9]{7,8})$/)
            .withMessage('Invalid Malaysian phone number'),
        
        body('healthcareRole')
            .optional()
            .isIn(['patient', 'doctor', 'nurse', 'pharmacist', 'admin'])
            .withMessage('Invalid healthcare role'),
        
        body('culturalPreferences.language')
            .optional()
            .isIn(['ms', 'en', 'zh', 'ta'])
            .withMessage('Invalid language preference')
    ],
    validateRequest,
    authController.register
);

/**
 * Login routes
 */
router.post('/login',
    [
        body('email')
            .isEmail()
            .normalizeEmail()
            .withMessage('Valid email required'),
        
        body('password')
            .notEmpty()
            .withMessage('Password required'),
        
        body('mfaCode')
            .optional()
            .isLength({ min: 6, max: 6 })
            .isNumeric()
            .withMessage('Invalid MFA code format'),
        
        body('challengeId')
            .optional()
            .isUUID()
            .withMessage('Invalid challenge ID')
    ],
    validateRequest,
    authController.login
);

/**
 * Logout routes
 */
router.post('/logout',
    authenticateUser,
    authController.logout
);

/**
 * Token refresh
 */
router.post('/refresh-token',
    [
        body('refreshToken')
            .notEmpty()
            .withMessage('Refresh token required'),
        
        header('x-session-id')
            .isUUID()
            .withMessage('Session ID required')
    ],
    validateRequest,
    authController.refreshToken
);

/**
 * Profile and settings routes
 */
router.get('/profile',
    authenticateUser,
    async (req, res) => {
        // Get user profile with cultural preferences
        // Implementation would go here
        res.json({
            success: true,
            user: req.user,
            message: 'Profile endpoint - implementation pending'
        });
    }
);

/**
 * Health check for auth service
 */
router.get('/health',
    optionalAuth,
    (req, res) => {
        res.json({
            success: true,
            service: 'authentication',
            status: 'healthy',
            timestamp: new Date().toISOString(),
            user: req.user ? { id: req.user.id, role: req.user.role } : null
        });
    }
);

export default router;