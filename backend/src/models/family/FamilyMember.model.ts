/**
 * FamilyMember Model - Database interactions for family members
 * Handles member management, permissions, and relationships
 */

import { pool } from '../../config/database';
import {
  FamilyMember,
  FamilyMemberDetails,
  FamilyRole,
  FamilyPermissions,
  PrivacySettings,
  CulturalContext,
  UpdateFamilyMemberRequest,
  FAMILY_CONSTANTS
} from '../../types/family/family.types';

export class FamilyMemberModel {

  /**
   * Get family member by user ID and family ID
   */
  static async findByUserAndFamily(
    userId: string,
    familyId: string
  ): Promise<FamilyMember | null> {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT * FROM family_members
        WHERE user_id = $1 AND family_id = $2 AND status = 'active'
      `, [userId, familyId]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapDatabaseRowToFamilyMember(result.rows[0]);
    } finally {
      client.release();
    }
  }

  /**
   * Get all active family members for a family
   */
  static async findByFamilyId(familyId: string): Promise<FamilyMemberDetails[]> {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT * FROM family_members_details
        WHERE family_id = $1
        ORDER BY
          CASE role
            WHEN 'admin' THEN 1
            WHEN 'caregiver' THEN 2
            WHEN 'viewer' THEN 3
            WHEN 'emergency' THEN 4
          END,
          joined_at ASC
      `, [familyId]);

      return result.rows.map(row => this.mapDatabaseRowToFamilyMemberDetails(row));
    } finally {
      client.release();
    }
  }

  /**
   * Get all families where user is a member
   */
  static async findFamiliesByUserId(userId: string): Promise<FamilyMemberDetails[]> {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT * FROM family_members_details
        WHERE user_id = $1
        ORDER BY joined_at DESC
      `, [userId]);

      return result.rows.map(row => this.mapDatabaseRowToFamilyMemberDetails(row));
    } finally {
      client.release();
    }
  }

  /**
   * Update family member details
   */
  static async update(
    familyId: string,
    userId: string,
    updateData: UpdateFamilyMemberRequest,
    updatedBy?: string
  ): Promise<FamilyMember | null> {
    const client = await pool.connect();
    try {
      const updates = [];
      const values = [];
      let paramIndex = 1;

      if (updateData.displayName !== undefined) {
        updates.push(`display_name = $${paramIndex++}`);
        values.push(updateData.displayName);
      }

      if (updateData.relationship) {
        updates.push(`relationship = $${paramIndex++}`);
        values.push(updateData.relationship);
      }

      if (updateData.permissions) {
        // Merge with existing permissions
        const existing = await this.findByUserAndFamily(userId, familyId);
        if (!existing) throw new Error('Family member not found');

        const mergedPermissions = { ...existing.permissions, ...updateData.permissions };
        updates.push(`permissions = $${paramIndex++}`);
        values.push(JSON.stringify(mergedPermissions));
      }

      if (updateData.privacySettings) {
        // Merge with existing privacy settings
        const existing = await this.findByUserAndFamily(userId, familyId);
        if (!existing) throw new Error('Family member not found');

        const mergedPrivacy = { ...existing.privacySettings, ...updateData.privacySettings };
        updates.push(`privacy_settings = $${paramIndex++}`);
        values.push(JSON.stringify(mergedPrivacy));
      }

      if (updateData.culturalContext) {
        updates.push(`cultural_context = $${paramIndex++}`);
        values.push(JSON.stringify(updateData.culturalContext));
      }

      if (updates.length === 0) {
        return await this.findByUserAndFamily(userId, familyId);
      }

      updates.push(`updated_at = NOW()`);
      values.push(familyId, userId);

      const result = await client.query(`
        UPDATE family_members
        SET ${updates.join(', ')}
        WHERE family_id = $${paramIndex++} AND user_id = $${paramIndex++} AND status = 'active'
        RETURNING *
      `, values);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapDatabaseRowToFamilyMember(result.rows[0]);
    } finally {
      client.release();
    }
  }

  /**
   * Update member role (admin only)
   */
  static async updateRole(
    familyId: string,
    targetUserId: string,
    newRole: FamilyRole,
    updatedBy: string
  ): Promise<FamilyMember | null> {
    // Check if updater is admin
    const isAdmin = await this.userIsAdmin(familyId, updatedBy);
    if (!isAdmin) {
      throw new Error('Only family admin can change member roles');
    }

    // Prevent demoting the last admin
    if (newRole !== FAMILY_CONSTANTS.ROLES.ADMIN) {
      const adminCount = await this.getAdminCount(familyId);
      const targetIsAdmin = await this.userIsAdmin(familyId, targetUserId);

      if (targetIsAdmin && adminCount <= 1) {
        throw new Error('Cannot remove the last admin from family');
      }
    }

    const client = await pool.connect();
    try {
      // Get default permissions for new role
      const defaultPermissions = this.getDefaultPermissionsForRole(newRole);

      const result = await client.query(`
        UPDATE family_members
        SET role = $1, permissions = $2, updated_at = NOW()
        WHERE family_id = $3 AND user_id = $4 AND status = 'active'
        RETURNING *
      `, [newRole, JSON.stringify(defaultPermissions), familyId, targetUserId]);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapDatabaseRowToFamilyMember(result.rows[0]);
    } finally {
      client.release();
    }
  }

  /**
   * Remove member from family
   */
  static async remove(
    familyId: string,
    targetUserId: string,
    removedBy: string,
    reason?: string
  ): Promise<boolean> {
    // Check permissions
    const canRemove = await this.canRemoveMember(familyId, targetUserId, removedBy);
    if (!canRemove) {
      throw new Error('Insufficient permissions to remove family member');
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update member status
      const result = await client.query(`
        UPDATE family_members
        SET status = 'left', updated_at = NOW()
        WHERE family_id = $1 AND user_id = $2 AND status = 'active'
      `, [familyId, targetUserId]);

      // Log the activity
      await client.query(`
        INSERT INTO family_activity_log (
          family_id, user_id, action_type, resource_type, resource_id,
          action_description, metadata
        ) VALUES ($1, $2, 'member_removed', 'family_member', $3, $4, $5)
      `, [
        familyId,
        removedBy,
        targetUserId,
        'Family member removed',
        JSON.stringify({ removedUserId: targetUserId, reason })
      ]);

      await client.query('COMMIT');
      return result.rowCount > 0;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Check if user has specific family permission
   */
  static async hasPermission(
    userId: string,
    familyId: string,
    permission: keyof FamilyPermissions
  ): Promise<boolean> {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT user_has_family_permission($1, $2, $3) as has_permission
      `, [userId, familyId, permission]);

      return result.rows[0]?.has_permission || false;
    } finally {
      client.release();
    }
  }

  /**
   * Get family emergency contacts
   */
  static async getEmergencyContacts(familyId: string): Promise<any[]> {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT * FROM family_emergency_hierarchy
        WHERE family_id = $1
        ORDER BY contact_priority, joined_at
      `, [familyId]);

      return result.rows;
    } finally {
      client.release();
    }
  }

  /**
   * Get member medication sharing permissions
   */
  static async getMedicationViewers(
    familyId: string,
    medicationOwnerId: string
  ): Promise<any[]> {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT * FROM get_family_medication_viewers($1, $2)
      `, [familyId, medicationOwnerId]);

      return result.rows;
    } finally {
      client.release();
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private static mapDatabaseRowToFamilyMember(row: any): FamilyMember {
    return {
      id: row.id,
      familyId: row.family_id,
      userId: row.user_id,
      role: row.role,
      displayName: row.display_name,
      relationship: row.relationship,
      permissions: typeof row.permissions === 'string'
        ? JSON.parse(row.permissions) : row.permissions,
      privacySettings: typeof row.privacy_settings === 'string'
        ? JSON.parse(row.privacy_settings) : row.privacy_settings,
      status: row.status,
      invitedBy: row.invited_by,
      joinedAt: row.joined_at,
      culturalContext: typeof row.cultural_context === 'string'
        ? JSON.parse(row.cultural_context) : row.cultural_context,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private static mapDatabaseRowToFamilyMemberDetails(row: any): FamilyMemberDetails {
    return {
      ...this.mapDatabaseRowToFamilyMember(row),
      familyName: row.family_name,
      fullName: row.full_name,
      email: row.email,
      phone: row.phone
    };
  }

  private static async userIsAdmin(familyId: string, userId: string): Promise<boolean> {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT COUNT(*) > 0 as is_admin
        FROM family_members
        WHERE family_id = $1 AND user_id = $2 AND role = 'admin' AND status = 'active'
      `, [familyId, userId]);

      return result.rows[0]?.is_admin || false;
    } finally {
      client.release();
    }
  }

  private static async getAdminCount(familyId: string): Promise<number> {
    const client = await pool.connect();
    try {
      const result = await client.query(`
        SELECT COUNT(*) as admin_count
        FROM family_members
        WHERE family_id = $1 AND role = 'admin' AND status = 'active'
      `, [familyId]);

      return parseInt(result.rows[0]?.admin_count || '0');
    } finally {
      client.release();
    }
  }

  private static async canRemoveMember(
    familyId: string,
    targetUserId: string,
    removedBy: string
  ): Promise<boolean> {
    // Self-removal is always allowed
    if (targetUserId === removedBy) {
      return true;
    }

    // Admin can remove anyone (except can't remove last admin)
    const isAdmin = await this.userIsAdmin(familyId, removedBy);
    if (isAdmin) {
      // Check if target is admin and is last admin
      const targetIsAdmin = await this.userIsAdmin(familyId, targetUserId);
      if (targetIsAdmin) {
        const adminCount = await this.getAdminCount(familyId);
        if (adminCount <= 1) {
          return false; // Can't remove last admin
        }
      }
      return true;
    }

    return false;
  }

  private static getDefaultPermissionsForRole(role: FamilyRole): FamilyPermissions {
    const defaultPermissions: Record<FamilyRole, FamilyPermissions> = {
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
}