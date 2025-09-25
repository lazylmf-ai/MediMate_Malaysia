/**
 * Permission Middleware
 * Family-level permission checking for API endpoints
 */

import { Request, Response, NextFunction } from 'express';
import { FamilyManagementService } from '../services/family/FamilyManagementService';
import { logger } from '../utils/logger';

/**
 * Middleware to check family-level permissions
 */
export const familyPermissionCheck = (requiredPermission: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user?.id;
      const familyId = req.params.familyId;

      if (!userId) {
        return res.status(401).json({
          error: 'Authentication required',
          code: 'AUTHENTICATION_REQUIRED'
        });
      }

      if (!familyId) {
        return res.status(400).json({
          error: 'Family ID required',
          code: 'FAMILY_ID_REQUIRED'
        });
      }

      // Check if user has the required permission in the family
      const hasPermission = await FamilyManagementService.checkPermission(
        userId,
        familyId,
        requiredPermission
      );

      if (!hasPermission) {
        logger.warn('Family permission denied', {
          userId,
          familyId,
          requiredPermission,
          endpoint: req.path
        });

        return res.status(403).json({
          error: 'Insufficient family permissions',
          code: 'INSUFFICIENT_FAMILY_PERMISSIONS',
          required_permission: requiredPermission
        });
      }

      // Permission granted, continue to next middleware/handler
      next();
    } catch (error: any) {
      logger.error('Family permission check failed', {
        error: error.message,
        userId: req.user?.id,
        familyId: req.params.familyId,
        requiredPermission
      });

      return res.status(500).json({
        error: 'Permission check failed',
        code: 'PERMISSION_CHECK_FAILED'
      });
    }
  };
};