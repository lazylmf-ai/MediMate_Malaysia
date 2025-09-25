/**
 * Family Controller
 * REST API endpoints for family circle management
 */

import { Request, Response, NextFunction } from 'express';
import { FamilyManagementService } from '../services/family/FamilyManagementService';
import { logger } from '../utils/logger';

export class FamilyController {

  /**
   * Create a new family circle
   */
  static async createFamily(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const familyResponse = await FamilyManagementService.createFamily(userId, req.body);

      res.status(201).json({
        success: true,
        message: 'Family circle created successfully',
        data: familyResponse
      });
    } catch (error: any) {
      logger.error('Failed to create family circle', { error: error.message, userId: req.user?.id });
      next(error);
    }
  }

  /**
   * Get family details
   */
  static async getFamilyDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      const familyId = req.params.familyId;

      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const familyResponse = await FamilyManagementService.getFamilyDetails(familyId, userId);

      if (!familyResponse) {
        res.status(404).json({ error: 'Family not found or access denied' });
        return;
      }

      res.json({
        success: true,
        data: familyResponse
      });
    } catch (error: any) {
      logger.error('Failed to get family details', { error: error.message, familyId: req.params.familyId, userId: req.user?.id });
      next(error);
    }
  }

  /**
   * Get user's family memberships
   */
  static async getUserFamilies(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const families = await FamilyManagementService.getUserFamilies(userId);

      res.json({
        success: true,
        data: families
      });
    } catch (error: any) {
      logger.error('Failed to get user families', { error: error.message, userId: req.user?.id });
      next(error);
    }
  }

  /**
   * Update family settings
   */
  static async updateFamily(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      const familyId = req.params.familyId;

      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const updatedFamily = await FamilyManagementService.updateFamily(familyId, userId, req.body);

      if (!updatedFamily) {
        res.status(404).json({ error: 'Family not found or insufficient permissions' });
        return;
      }

      res.json({
        success: true,
        message: 'Family updated successfully',
        data: updatedFamily
      });
    } catch (error: any) {
      logger.error('Failed to update family', { error: error.message, familyId: req.params.familyId, userId: req.user?.id });
      next(error);
    }
  }

  /**
   * Archive family circle
   */
  static async archiveFamily(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      const familyId = req.params.familyId;
      const { reason } = req.body;

      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const result = await FamilyManagementService.archiveFamily(familyId, userId, reason);

      if (!result) {
        res.status(404).json({ error: 'Family not found or insufficient permissions' });
        return;
      }

      res.json({
        success: true,
        message: 'Family archived successfully'
      });
    } catch (error: any) {
      logger.error('Failed to archive family', { error: error.message, familyId: req.params.familyId, userId: req.user?.id });
      next(error);
    }
  }

  /**
   * Invite member to family
   */
  static async inviteMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      const familyId = req.params.familyId;

      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const result = await FamilyManagementService.inviteMember(familyId, userId, req.body);

      res.status(201).json({
        success: true,
        message: 'Family member invited successfully',
        data: result
      });
    } catch (error: any) {
      logger.error('Failed to invite family member', { error: error.message, familyId: req.params.familyId, userId: req.user?.id });
      next(error);
    }
  }

  /**
   * Accept family invitation
   */
  static async acceptInvitation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      const inviteCode = req.params.inviteCode;

      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const result = await FamilyManagementService.acceptInvitation(inviteCode, userId, req.body);

      res.json({
        success: true,
        message: 'Family invitation accepted successfully',
        data: result
      });
    } catch (error: any) {
      logger.error('Failed to accept family invitation', { error: error.message, inviteCode, userId: req.user?.id });
      next(error);
    }
  }

  /**
   * Update family member
   */
  static async updateMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      const familyId = req.params.familyId;
      const targetUserId = req.params.memberId;

      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const updatedMember = await FamilyManagementService.updateMember(familyId, targetUserId, req.body, userId);

      if (!updatedMember) {
        res.status(404).json({ error: 'Member not found or insufficient permissions' });
        return;
      }

      res.json({
        success: true,
        message: 'Family member updated successfully',
        data: updatedMember
      });
    } catch (error: any) {
      logger.error('Failed to update family member', {
        error: error.message,
        familyId: req.params.familyId,
        memberId: req.params.memberId,
        userId: req.user?.id
      });
      next(error);
    }
  }

  /**
   * Update member role
   */
  static async updateMemberRole(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      const familyId = req.params.familyId;
      const targetUserId = req.params.memberId;
      const { role } = req.body;

      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      if (!role) {
        res.status(400).json({ error: 'Role is required' });
        return;
      }

      const updatedMember = await FamilyManagementService.updateMemberRole(familyId, targetUserId, role, userId);

      if (!updatedMember) {
        res.status(404).json({ error: 'Member not found or insufficient permissions' });
        return;
      }

      res.json({
        success: true,
        message: 'Member role updated successfully',
        data: updatedMember
      });
    } catch (error: any) {
      logger.error('Failed to update member role', {
        error: error.message,
        familyId: req.params.familyId,
        memberId: req.params.memberId,
        userId: req.user?.id
      });
      next(error);
    }
  }

  /**
   * Remove family member
   */
  static async removeMember(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      const familyId = req.params.familyId;
      const targetUserId = req.params.memberId;
      const { reason } = req.body;

      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const result = await FamilyManagementService.removeMember(familyId, targetUserId, userId, reason);

      if (!result) {
        res.status(404).json({ error: 'Member not found or insufficient permissions' });
        return;
      }

      res.json({
        success: true,
        message: 'Family member removed successfully'
      });
    } catch (error: any) {
      logger.error('Failed to remove family member', {
        error: error.message,
        familyId: req.params.familyId,
        memberId: req.params.memberId,
        userId: req.user?.id
      });
      next(error);
    }
  }

  /**
   * Revoke family invitation
   */
  static async revokeInvitation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      const invitationId = req.params.invitationId;
      const { reason } = req.body;

      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const result = await FamilyManagementService.revokeInvitation(invitationId, userId, reason);

      if (!result) {
        res.status(404).json({ error: 'Invitation not found or insufficient permissions' });
        return;
      }

      res.json({
        success: true,
        message: 'Family invitation revoked successfully'
      });
    } catch (error: any) {
      logger.error('Failed to revoke family invitation', {
        error: error.message,
        invitationId: req.params.invitationId,
        userId: req.user?.id
      });
      next(error);
    }
  }

  /**
   * Get family dashboard
   */
  static async getFamilyDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      const familyId = req.params.familyId;

      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const dashboardData = await FamilyManagementService.getFamilyDashboard(familyId, userId);

      if (!dashboardData) {
        res.status(404).json({ error: 'Family not found or access denied' });
        return;
      }

      res.json({
        success: true,
        data: dashboardData
      });
    } catch (error: any) {
      logger.error('Failed to get family dashboard', { error: error.message, familyId: req.params.familyId, userId: req.user?.id });
      next(error);
    }
  }

  /**
   * Check family permission
   */
  static async checkPermission(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      const familyId = req.params.familyId;
      const { permission } = req.query;

      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      if (!permission) {
        res.status(400).json({ error: 'Permission parameter is required' });
        return;
      }

      const hasPermission = await FamilyManagementService.checkPermission(userId, familyId, permission as string);

      res.json({
        success: true,
        data: { hasPermission }
      });
    } catch (error: any) {
      logger.error('Failed to check family permission', {
        error: error.message,
        familyId: req.params.familyId,
        permission: req.query.permission,
        userId: req.user?.id
      });
      next(error);
    }
  }

  /**
   * Get family statistics
   */
  static async getFamilyStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      const familyId = req.params.familyId;

      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const stats = await FamilyManagementService.getFamilyStats(familyId, userId);

      res.json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      logger.error('Failed to get family stats', { error: error.message, familyId: req.params.familyId, userId: req.user?.id });
      next(error);
    }
  }
}