/**
 * FamilyInvitation Model - Database interactions for family invitations
 * Handles invitation creation, validation, and acceptance
 */

import { pool } from '../../config/database';
import {
  FamilyInvitation,
  ActiveFamilyInvitation,
  InviteFamilyMemberRequest,
  AcceptFamilyInvitationRequest,
  FamilyRole,
  InvitationStatus,
  CulturalGreeting,
  FAMILY_CONSTANTS
} from '../../types/family/family.types';

export class FamilyInvitationModel {

  /**
   * Create a new family invitation
   */
  static async create(
    familyId: string,
    invitedBy: string,
    invitationData: InviteFamilyMemberRequest
  ): Promise<FamilyInvitation> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Check if family is full
      const memberCount = await this.getFamilyMemberCount(familyId);
      const familySettings = await this.getFamilySettings(familyId);
      const maxMembers = familySettings?.maxMembers || FAMILY_CONSTANTS.MAX_MEMBERS_DEFAULT;

      if (memberCount >= maxMembers) {
        throw new Error('Family has reached maximum member limit');
      }

      // Check if user is already a member or has pending invitation
      const existingMember = await client.query(`
        SELECT COUNT(*) as count FROM family_members
        WHERE family_id = $1
          AND user_id = (SELECT id FROM users WHERE email = $2)
          AND status IN ('active', 'invited')
      `, [familyId, invitationData.email]);

      if (parseInt(existingMember.rows[0].count) > 0) {
        throw new Error('User is already a family member or has pending invitation');
      }

      const existingInvite = await client.query(`
        SELECT COUNT(*) as count FROM family_invitations
        WHERE family_id = $1 AND invited_email = $2 AND status = 'pending'
      `, [familyId, invitationData.email]);

      if (parseInt(existingInvite.rows[0].count) > 0) {
        throw new Error('Pending invitation already exists for this email');
      }

      // Default cultural greeting
      const defaultGreeting: CulturalGreeting = {
        language: 'ms',
        formality: 'standard',
        religiousGreeting: false,
        ...invitationData.culturalGreeting
      };

      // Create invitation
      const result = await client.query(`
        INSERT INTO family_invitations (
          family_id, invited_by, invited_email, invited_phone,
          role, relationship, personal_message, cultural_greeting
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `, [
        familyId,
        invitedBy,
        invitationData.email,
        invitationData.phone,
        invitationData.role,
        invitationData.relationship,
        invitationData.personalMessage,
        JSON.stringify(defaultGreeting)
      ]);

      const invitation = this.mapDatabaseRowToInvitation(result.rows[0]);

      // Generate QR code data
      const qrCodeData = await this.generateQRCodeData(invitation);
      await client.query(`
        UPDATE family_invitations SET qr_code_data = $1 WHERE id = $2
      `, [qrCodeData, invitation.id]);

      invitation.qrCodeData = qrCodeData;

      await client.query('COMMIT');
      return invitation;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Find invitation by invite code
   */
  static async findByInviteCode(inviteCode: string): Promise<FamilyInvitation | null> {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT * FROM family_invitations
        WHERE invite_code = $1 AND status = 'pending' AND expires_at > NOW()
      `, [inviteCode]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapDatabaseRowToInvitation(result.rows[0]);
    } finally {
      client.release();
    }
  }

  /**
   * Find invitation by ID with family details
   */
  static async findByIdWithDetails(invitationId: string): Promise<ActiveFamilyInvitation | null> {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT * FROM active_family_invitations WHERE invitation_id = $1
      `, [invitationId]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapDatabaseRowToActiveInvitation(result.rows[0]);
    } finally {
      client.release();
    }
  }

  /**
   * Get all pending invitations for a family
   */
  static async findByFamilyId(familyId: string): Promise<ActiveFamilyInvitation[]> {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT * FROM active_family_invitations
        WHERE family_id = $1
        ORDER BY created_at DESC
      `, [familyId]);

      return result.rows.map(row => this.mapDatabaseRowToActiveInvitation(row));
    } finally {
      client.release();
    }
  }

  /**
   * Accept family invitation
   */
  static async accept(
    inviteCode: string,
    userId: string,
    acceptanceData: AcceptFamilyInvitationRequest
  ): Promise<{ success: boolean; familyId: string; memberId: string } | null> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Get and validate invitation
      const invitation = await this.findByInviteCode(inviteCode);
      if (!invitation) {
        throw new Error('Invalid or expired invitation code');
      }

      // Check if user is already a member of this family
      const existingMember = await client.query(`
        SELECT COUNT(*) as count FROM family_members
        WHERE family_id = $1 AND user_id = $2 AND status IN ('active', 'invited')
      `, [invitation.familyId, userId]);

      if (parseInt(existingMember.rows[0].count) > 0) {
        throw new Error('User is already a member of this family');
      }

      // Get user's email to verify it matches invitation
      const userResult = await client.query(`
        SELECT email FROM users WHERE id = $1
      `, [userId]);

      if (userResult.rows.length === 0 || userResult.rows[0].email !== invitation.invitedEmail) {
        throw new Error('Email mismatch - invitation not for this user');
      }

      // Mark invitation as accepted
      await client.query(`
        UPDATE family_invitations
        SET status = 'accepted', used_at = NOW()
        WHERE id = $1
      `, [invitation.id]);

      // Create family member
      const memberResult = await client.query(`
        INSERT INTO family_members (
          family_id, user_id, role, display_name, relationship,
          status, joined_at, invited_by, permissions, privacy_settings, cultural_context
        ) VALUES ($1, $2, $3, $4, $5, 'active', NOW(), $6, $7, $8, $9)
        RETURNING id
      `, [
        invitation.familyId,
        userId,
        invitation.role,
        acceptanceData.displayName,
        invitation.relationship,
        invitation.invitedBy,
        JSON.stringify(this.getDefaultPermissionsForRole(invitation.role)),
        JSON.stringify(acceptanceData.privacySettings || this.getDefaultPrivacySettings()),
        JSON.stringify(acceptanceData.culturalContext || this.getDefaultCulturalContext())
      ]);

      await client.query('COMMIT');

      return {
        success: true,
        familyId: invitation.familyId,
        memberId: memberResult.rows[0].id
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Revoke invitation
   */
  static async revoke(
    invitationId: string,
    revokedBy: string,
    reason?: string
  ): Promise<boolean> {
    const client = await pool.connect();
    try {
      // First check if user has permission to revoke
      const invitation = await client.query(`
        SELECT fi.*, fm.role
        FROM family_invitations fi
        LEFT JOIN family_members fm ON fi.family_id = fm.family_id AND fm.user_id = $2
        WHERE fi.id = $1 AND fi.status = 'pending'
      `, [invitationId, revokedBy]);

      if (invitation.rows.length === 0) {
        throw new Error('Invitation not found or already processed');
      }

      const inv = invitation.rows[0];
      const userRole = inv.role;

      // Check permissions: admin can revoke any, members can revoke their own invitations
      if (userRole !== 'admin' && inv.invited_by !== revokedBy) {
        throw new Error('Insufficient permissions to revoke invitation');
      }

      const result = await client.query(`
        UPDATE family_invitations
        SET status = 'revoked', revoked_at = NOW(), revoked_by = $1, revoke_reason = $2
        WHERE id = $3 AND status = 'pending'
      `, [revokedBy, reason, invitationId]);

      return result.rowCount > 0;
    } finally {
      client.release();
    }
  }

  /**
   * Track invitation view
   */
  static async trackView(
    inviteCode: string,
    ipAddress?: string
  ): Promise<boolean> {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        UPDATE family_invitations
        SET view_count = view_count + 1, last_viewed_at = NOW()
        WHERE invite_code = $1 AND status = 'pending'
      `, [inviteCode]);

      return result.rowCount > 0;
    } finally {
      client.release();
    }
  }

  /**
   * Clean up expired invitations
   */
  static async cleanupExpired(): Promise<number> {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        UPDATE family_invitations
        SET status = 'expired'
        WHERE status = 'pending' AND expires_at <= NOW()
      `);

      return result.rowCount;
    } finally {
      client.release();
    }
  }

  /**
   * Resend invitation (create new code)
   */
  static async resend(
    invitationId: string,
    resentBy: string
  ): Promise<FamilyInvitation | null> {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Check permissions and get invitation
      const invitation = await client.query(`
        SELECT fi.*, fm.role
        FROM family_invitations fi
        LEFT JOIN family_members fm ON fi.family_id = fm.family_id AND fm.user_id = $2
        WHERE fi.id = $1 AND fi.status IN ('pending', 'expired')
      `, [invitationId, resentBy]);

      if (invitation.rows.length === 0) {
        throw new Error('Invitation not found');
      }

      const inv = invitation.rows[0];
      const userRole = inv.role;

      // Check permissions
      if (userRole !== 'admin' && inv.invited_by !== resentBy) {
        throw new Error('Insufficient permissions to resend invitation');
      }

      // Generate new invite code and extend expiration
      const newInviteCode = await this.generateInviteCode();
      const newExpirationDate = new Date();
      newExpirationDate.setDate(newExpirationDate.getDate() + FAMILY_CONSTANTS.INVITATION_EXPIRY_DAYS);

      const result = await client.query(`
        UPDATE family_invitations
        SET invite_code = $1, expires_at = $2, status = 'pending',
            view_count = 0, accept_attempts = 0
        WHERE id = $3
        RETURNING *
      `, [newInviteCode, newExpirationDate, invitationId]);

      await client.query('COMMIT');

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapDatabaseRowToInvitation(result.rows[0]);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private static mapDatabaseRowToInvitation(row: any): FamilyInvitation {
    return {
      id: row.id,
      familyId: row.family_id,
      invitedBy: row.invited_by,
      invitedEmail: row.invited_email,
      invitedPhone: row.invited_phone,
      role: row.role,
      relationship: row.relationship,
      personalMessage: row.personal_message,
      inviteCode: row.invite_code,
      qrCodeData: row.qr_code_data,
      expiresAt: row.expires_at,
      usedAt: row.used_at,
      revokedAt: row.revoked_at,
      revokedBy: row.revoked_by,
      revokeReason: row.revoke_reason,
      status: row.status,
      viewCount: row.view_count || 0,
      lastViewedAt: row.last_viewed_at,
      acceptAttempts: row.accept_attempts || 0,
      lastAttemptAt: row.last_attempt_at,
      lastAttemptIp: row.last_attempt_ip,
      culturalGreeting: typeof row.cultural_greeting === 'string'
        ? JSON.parse(row.cultural_greeting) : row.cultural_greeting,
      createdAt: row.created_at
    };
  }

  private static mapDatabaseRowToActiveInvitation(row: any): ActiveFamilyInvitation {
    return {
      ...this.mapDatabaseRowToInvitation(row),
      familyName: row.family_name,
      invitedByName: row.invited_by_name
    };
  }

  private static async getFamilyMemberCount(familyId: string): Promise<number> {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT COUNT(*) as count FROM family_members
        WHERE family_id = $1 AND status = 'active'
      `, [familyId]);

      return parseInt(result.rows[0].count);
    } finally {
      client.release();
    }
  }

  private static async getFamilySettings(familyId: string): Promise<any> {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT settings FROM family_circles WHERE id = $1
      `, [familyId]);

      if (result.rows.length === 0) return null;

      return typeof result.rows[0].settings === 'string'
        ? JSON.parse(result.rows[0].settings) : result.rows[0].settings;
    } finally {
      client.release();
    }
  }

  private static async generateQRCodeData(invitation: FamilyInvitation): Promise<string> {
    // Generate QR code data containing invitation details
    const qrData = {
      type: 'family_invitation',
      code: invitation.inviteCode,
      familyId: invitation.familyId,
      role: invitation.role,
      expiresAt: invitation.expiresAt.toISOString()
    };

    return JSON.stringify(qrData);
  }

  private static async generateInviteCode(): Promise<string> {
    // This would use the database function, but for TypeScript we'll implement it here
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // No confusing characters
    let code = '';
    for (let i = 0; i < FAMILY_CONSTANTS.INVITE_CODE_LENGTH; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  private static getDefaultPermissionsForRole(role: FamilyRole) {
    const defaultPermissions = {
      admin: {
        viewMedications: true,
        viewAdherence: true,
        receiveEmergencyAlerts: true,
        manageSettings: true,
        inviteMembers: true,
        viewHealthData: true
      },
      caregiver: {
        viewMedications: true,
        viewAdherence: true,
        receiveEmergencyAlerts: true,
        manageSettings: false,
        inviteMembers: true,
        viewHealthData: false
      },
      viewer: {
        viewMedications: true,
        viewAdherence: true,
        receiveEmergencyAlerts: false,
        manageSettings: false,
        inviteMembers: false,
        viewHealthData: false
      },
      emergency: {
        viewMedications: false,
        viewAdherence: false,
        receiveEmergencyAlerts: true,
        manageSettings: false,
        inviteMembers: false,
        viewHealthData: false
      }
    };

    return defaultPermissions[role];
  }

  private static getDefaultPrivacySettings() {
    return {
      shareMedications: true,
      shareAdherence: true,
      shareHealthMetrics: false,
      shareLocation: false,
      emergencyOverride: true
    };
  }

  private static getDefaultCulturalContext() {
    return {
      respectLevel: 'standard',
      communicationPreference: 'direct',
      emergencyContactPriority: 1
    };
  }
}