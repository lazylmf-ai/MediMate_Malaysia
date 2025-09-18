/**
 * Family Management Service
 * Core business logic for family circles, members, and relationships
 */

import {
  FamilyCircleModel,
  FamilyMemberModel,
  FamilyInvitationModel,
  FamilyCircle,
  FamilyMemberDetails,
  ActiveFamilyInvitation,
  CreateFamilyRequest,
  UpdateFamilyRequest,
  InviteFamilyMemberRequest,
  AcceptFamilyInvitationRequest,
  UpdateFamilyMemberRequest,
  FamilyResponse,
  FamilyDashboardResponse,
  FamilyMembershipSummary,
  FamilyRole,
  FAMILY_CONSTANTS
} from '../../models/family';
import { logger } from '../../utils/logger';

export class FamilyManagementService {

  /**
   * Create a new family circle
   */
  static async createFamily(
    userId: string,
    familyData: CreateFamilyRequest
  ): Promise<FamilyResponse> {
    try {
      logger.info('Creating family circle', { userId, familyName: familyData.name });

      // Validate family name
      if (!familyData.name || familyData.name.trim().length < 2) {
        throw new Error('Family name must be at least 2 characters long');
      }

      // Create family circle
      const family = await FamilyCircleModel.create(userId, familyData);

      // Get created family with members
      const members = await FamilyMemberModel.findByFamilyId(family.id);
      const invitations = await FamilyInvitationModel.findByFamilyId(family.id);
      const emergencyContacts = await FamilyMemberModel.getEmergencyContacts(family.id);

      logger.info('Family circle created successfully', {
        familyId: family.id,
        createdBy: userId,
        memberCount: members.length
      });

      return {
        family,
        members,
        invitations,
        emergencyContacts,
        memberCount: members.length
      };
    } catch (error) {
      logger.error('Failed to create family circle', { userId, error: error.message });
      throw error;
    }
  }

  /**
   * Get family details with all members and invitations
   */
  static async getFamilyDetails(
    familyId: string,
    userId: string
  ): Promise<FamilyResponse | null> {
    try {
      // Get family circle (with membership check)
      const family = await FamilyCircleModel.findById(familyId, userId);
      if (!family) {
        return null;
      }

      // Get all related data
      const [members, invitations, emergencyContacts] = await Promise.all([
        FamilyMemberModel.findByFamilyId(familyId),
        FamilyInvitationModel.findByFamilyId(familyId),
        FamilyMemberModel.getEmergencyContacts(familyId)
      ]);

      return {
        family,
        members,
        invitations,
        emergencyContacts,
        memberCount: members.length
      };
    } catch (error) {
      logger.error('Failed to get family details', { familyId, userId, error: error.message });
      throw error;
    }
  }

  /**
   * Get user's family memberships
   */
  static async getUserFamilies(userId: string): Promise<FamilyMembershipSummary[]> {
    try {
      return await FamilyCircleModel.findByUserId(userId);
    } catch (error) {
      logger.error('Failed to get user families', { userId, error: error.message });
      throw error;
    }
  }

  /**
   * Update family circle settings
   */
  static async updateFamily(
    familyId: string,
    userId: string,
    updateData: UpdateFamilyRequest
  ): Promise<FamilyCircle | null> {
    try {
      logger.info('Updating family circle', { familyId, userId, updates: Object.keys(updateData) });

      const updatedFamily = await FamilyCircleModel.update(familyId, userId, updateData);

      if (updatedFamily) {
        logger.info('Family circle updated successfully', { familyId, userId });
      }

      return updatedFamily;
    } catch (error) {
      logger.error('Failed to update family circle', { familyId, userId, error: error.message });
      throw error;
    }
  }

  /**
   * Archive family circle
   */
  static async archiveFamily(
    familyId: string,
    userId: string,
    reason?: string
  ): Promise<boolean> {
    try {
      logger.info('Archiving family circle', { familyId, userId, reason });

      const result = await FamilyCircleModel.archive(familyId, userId, reason);

      if (result) {
        logger.info('Family circle archived successfully', { familyId, userId });
      }

      return result;
    } catch (error) {
      logger.error('Failed to archive family circle', { familyId, userId, error: error.message });
      throw error;
    }
  }

  /**
   * Invite member to family
   */
  static async inviteMember(
    familyId: string,
    invitedBy: string,
    invitationData: InviteFamilyMemberRequest
  ): Promise<{ invitation: ActiveFamilyInvitation; qrCodeUrl?: string }> {
    try {
      logger.info('Inviting family member', { familyId, invitedBy, email: invitationData.email });

      // Check if inviter has permission
      const canInvite = await FamilyMemberModel.hasPermission(invitedBy, familyId, 'inviteMembers');
      if (!canInvite) {
        throw new Error('Insufficient permissions to invite family members');
      }

      // Validate invitation data
      this.validateInvitationData(invitationData);

      // Create invitation
      const invitation = await FamilyInvitationModel.create(familyId, invitedBy, invitationData);

      // Get invitation with family details
      const invitationWithDetails = await FamilyInvitationModel.findByIdWithDetails(invitation.id);

      if (!invitationWithDetails) {
        throw new Error('Failed to retrieve created invitation');
      }

      logger.info('Family member invited successfully', {
        familyId,
        invitationId: invitation.id,
        email: invitationData.email,
        role: invitationData.role
      });

      // TODO: Generate QR code URL for mobile scanning
      const qrCodeUrl = await this.generateQRCodeUrl(invitation.qrCodeData || '');

      return {
        invitation: invitationWithDetails,
        qrCodeUrl
      };
    } catch (error) {
      logger.error('Failed to invite family member', {
        familyId,
        invitedBy,
        email: invitationData.email,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Accept family invitation
   */
  static async acceptInvitation(
    inviteCode: string,
    userId: string,
    acceptanceData: AcceptFamilyInvitationRequest
  ): Promise<{ success: boolean; familyId: string }> {
    try {
      logger.info('Accepting family invitation', { inviteCode, userId });

      const result = await FamilyInvitationModel.accept(inviteCode, userId, acceptanceData);

      if (!result) {
        throw new Error('Failed to accept invitation');
      }

      logger.info('Family invitation accepted successfully', {
        userId,
        familyId: result.familyId,
        memberId: result.memberId
      });

      return {
        success: result.success,
        familyId: result.familyId
      };
    } catch (error) {
      logger.error('Failed to accept family invitation', {
        inviteCode,
        userId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Update family member details
   */
  static async updateMember(
    familyId: string,
    targetUserId: string,
    updateData: UpdateFamilyMemberRequest,
    updatedBy: string
  ): Promise<any> {
    try {
      logger.info('Updating family member', { familyId, targetUserId, updatedBy });

      // Check permissions: user can update their own details, admin can update anyone
      if (targetUserId !== updatedBy) {
        const isAdmin = await this.userIsAdmin(familyId, updatedBy);
        if (!isAdmin) {
          throw new Error('Insufficient permissions to update member details');
        }
      }

      const updatedMember = await FamilyMemberModel.update(
        familyId,
        targetUserId,
        updateData,
        updatedBy
      );

      if (updatedMember) {
        logger.info('Family member updated successfully', { familyId, targetUserId });
      }

      return updatedMember;
    } catch (error) {
      logger.error('Failed to update family member', {
        familyId,
        targetUserId,
        updatedBy,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Update member role (admin only)
   */
  static async updateMemberRole(
    familyId: string,
    targetUserId: string,
    newRole: FamilyRole,
    updatedBy: string
  ): Promise<any> {
    try {
      logger.info('Updating family member role', { familyId, targetUserId, newRole, updatedBy });

      const updatedMember = await FamilyMemberModel.updateRole(
        familyId,
        targetUserId,
        newRole,
        updatedBy
      );

      if (updatedMember) {
        logger.info('Family member role updated successfully', {
          familyId,
          targetUserId,
          newRole
        });
      }

      return updatedMember;
    } catch (error) {
      logger.error('Failed to update family member role', {
        familyId,
        targetUserId,
        newRole,
        updatedBy,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Remove member from family
   */
  static async removeMember(
    familyId: string,
    targetUserId: string,
    removedBy: string,
    reason?: string
  ): Promise<boolean> {
    try {
      logger.info('Removing family member', { familyId, targetUserId, removedBy, reason });

      const result = await FamilyMemberModel.remove(familyId, targetUserId, removedBy, reason);

      if (result) {
        logger.info('Family member removed successfully', { familyId, targetUserId });
      }

      return result;
    } catch (error) {
      logger.error('Failed to remove family member', {
        familyId,
        targetUserId,
        removedBy,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Revoke family invitation
   */
  static async revokeInvitation(
    invitationId: string,
    revokedBy: string,
    reason?: string
  ): Promise<boolean> {
    try {
      logger.info('Revoking family invitation', { invitationId, revokedBy, reason });

      const result = await FamilyInvitationModel.revoke(invitationId, revokedBy, reason);

      if (result) {
        logger.info('Family invitation revoked successfully', { invitationId, revokedBy });
      }

      return result;
    } catch (error) {
      logger.error('Failed to revoke family invitation', {
        invitationId,
        revokedBy,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get family dashboard data
   */
  static async getFamilyDashboard(
    familyId: string,
    userId: string
  ): Promise<FamilyDashboardResponse | null> {
    try {
      // Get family details first
      const familyResponse = await this.getFamilyDetails(familyId, userId);
      if (!familyResponse) {
        return null;
      }

      // TODO: Implement medication summary and activity log queries
      // This would integrate with the medication management system from other streams

      const dashboardData: FamilyDashboardResponse = {
        family: familyResponse.family,
        members: familyResponse.members,
        recentActivity: [], // TODO: Implement
        activeNotifications: [], // TODO: Implement
        medicationSummary: [], // TODO: Implement
        emergencyRules: [] // TODO: Implement
      };

      return dashboardData;
    } catch (error) {
      logger.error('Failed to get family dashboard', { familyId, userId, error: error.message });
      throw error;
    }
  }

  /**
   * Check if user has specific family permission
   */
  static async checkPermission(
    userId: string,
    familyId: string,
    permission: string
  ): Promise<boolean> {
    try {
      return await FamilyMemberModel.hasPermission(userId, familyId, permission as any);
    } catch (error) {
      logger.error('Failed to check family permission', {
        userId,
        familyId,
        permission,
        error: error.message
      });
      return false;
    }
  }

  /**
   * Get family statistics
   */
  static async getFamilyStats(familyId: string, userId: string): Promise<any> {
    try {
      return await FamilyCircleModel.getStats(familyId, userId);
    } catch (error) {
      logger.error('Failed to get family stats', { familyId, userId, error: error.message });
      throw error;
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private static validateInvitationData(data: InviteFamilyMemberRequest): void {
    if (!data.email || !this.isValidEmail(data.email)) {
      throw new Error('Valid email address is required');
    }

    if (!data.role || !Object.values(FAMILY_CONSTANTS.ROLES).includes(data.role as any)) {
      throw new Error('Valid role is required');
    }

    if (!data.relationship || data.relationship.trim().length < 2) {
      throw new Error('Relationship must be specified');
    }

    if (data.phone && !this.isValidMalaysianPhone(data.phone)) {
      throw new Error('Invalid Malaysian phone number format');
    }
  }

  private static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private static isValidMalaysianPhone(phone: string): boolean {
    // Malaysian phone number patterns
    const mobileRegex = /^(\+?6?01[0-46-9])-?([0-9]{7,8})$/;
    const landlineRegex = /^(\+?6?0[3-9])-?([0-9]{7,8})$/;

    return mobileRegex.test(phone) || landlineRegex.test(phone);
  }

  private static async userIsAdmin(familyId: string, userId: string): Promise<boolean> {
    const member = await FamilyMemberModel.findByUserAndFamily(userId, familyId);
    return member?.role === FAMILY_CONSTANTS.ROLES.ADMIN;
  }

  private static async generateQRCodeUrl(qrCodeData: string): Promise<string> {
    // TODO: Implement QR code generation service
    // This would typically use a QR code generation library or service
    // For now, return a placeholder URL
    const baseUrl = process.env.FRONTEND_URL || 'https://medimate.my';
    return `${baseUrl}/qr-placeholder?data=${encodeURIComponent(qrCodeData)}`;
  }
}