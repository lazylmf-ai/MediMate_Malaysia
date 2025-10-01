/**
 * FamilyCircle Model - Database interactions for family circles
 * Handles CRUD operations and business logic for family management
 */

import { DatabaseService } from '../../services/database/databaseService';
import {
  FamilyCircle,
  FamilySettings,
  CulturalPreferences,
  EmergencyContact,
  CreateFamilyRequest,
  UpdateFamilyRequest,
  FamilyMembershipSummary,
  FAMILY_CONSTANTS
} from '../../types/family/family.types';

export class FamilyCircleModel {

  /**
   * Create a new family circle
   */
  static async create(
    createdBy: string,
    familyData: CreateFamilyRequest
  ): Promise<FamilyCircle> {
    const db = DatabaseService.getInstance().getConnection();
    try {
      await db.none('BEGIN');

      // Default settings
      const defaultSettings: FamilySettings = {
        maxMembers: FAMILY_CONSTANTS.MAX_MEMBERS_DEFAULT,
        emergencyNotificationDelay: FAMILY_CONSTANTS.EMERGENCY_NOTIFICATION_DELAY_DEFAULT,
        defaultPrivacyLevel: 'family',
        culturalSettings: {
          language: 'ms',
          prayerTimeAware: true,
          festivalNotifications: true
        },
        ...familyData.settings
      };

      const defaultCulturalPreferences: CulturalPreferences = {
        primaryLanguage: 'ms',
        religiousObservance: 'islamic',
        familyHierarchy: 'traditional',
        decisionMaking: 'collective',
        ...familyData.culturalPreferences
      };

      // Create family circle
      const result = await db.one(`
        INSERT INTO family_circles (
          name, created_by, settings, emergency_contacts, cultural_preferences
        ) VALUES ($1, $2, $3, $4, $5)
        RETURNING *
      `, [
        familyData.name,
        createdBy,
        JSON.stringify(defaultSettings),
        JSON.stringify(familyData.emergencyContacts || []),
        JSON.stringify(defaultCulturalPreferences)
      ]);

      const familyCircle = result.rows[0];

      // Add creator as admin member
      await db.one(`
        INSERT INTO family_members (
          family_id, user_id, role, relationship, status, joined_at,
          permissions, privacy_settings, cultural_context
        ) VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7, $8)
      `, [
        familyCircle.id,
        createdBy,
        FAMILY_CONSTANTS.ROLES.ADMIN,
        'self',
        'active',
        JSON.stringify({
          viewMedications: true,
          viewAdherence: true,
          receiveEmergencyAlerts: true,
          manageSettings: true,
          inviteMembers: true,
          viewHealthData: true
        }),
        JSON.stringify({
          shareMedications: true,
          shareAdherence: true,
          shareHealthMetrics: false,
          shareLocation: false,
          emergencyOverride: true
        }),
        JSON.stringify({
          respectLevel: 'standard',
          communicationPreference: 'direct',
          emergencyContactPriority: 1
        })
      ]);

      await db.one('COMMIT');

      return this.mapDatabaseRowToFamilyCircle(familyCircle);
    } catch (error) {
      await db.one('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get family circle by ID with membership check
   */
  static async findById(
    familyId: string,
    userId?: string
  ): Promise<FamilyCircle | null> {
    const db = DatabaseService.getInstance().getConnection();
    try {
      let query = `
        SELECT fc.* FROM family_circles fc
        WHERE fc.id = $1 AND fc.active = TRUE
      `;
      const params = [familyId];

      // If userId provided, ensure they are a member
      if (userId) {
        query += `
          AND EXISTS (
            SELECT 1 FROM family_members fm
            WHERE fm.family_id = fc.id
              AND fm.user_id = $2
              AND fm.status = 'active'
          )
        `;
        params.push(userId);
      }

      const result = await db.one(query, params);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapDatabaseRowToFamilyCircle(result.rows[0]);
    } finally {
      client.release();
    }
  }

  /**
   * Get all families for a user
   */
  static async findByUserId(userId: string): Promise<FamilyMembershipSummary[]> {
    const db = DatabaseService.getInstance().getConnection();
    try {
      const result = await db.one(`
        SELECT
          fc.id as family_id,
          fc.name as family_name,
          fm.role,
          fm.joined_at,
          fc.updated_at as last_active,
          (
            SELECT COUNT(*)
            FROM family_members fm2
            WHERE fm2.family_id = fc.id AND fm2.status = 'active'
          ) as member_count
        FROM family_circles fc
        JOIN family_members fm ON fc.id = fm.family_id
        WHERE fm.user_id = $1
          AND fm.status = 'active'
          AND fc.active = TRUE
        ORDER BY fm.joined_at DESC
      `, [userId]);

      return result.rows.map(row => ({
        familyId: row.family_id,
        familyName: row.family_name,
        role: row.role,
        memberCount: parseInt(row.member_count),
        joinedAt: row.joined_at,
        lastActive: row.last_active
      }));
    } finally {
      client.release();
    }
  }

  /**
   * Update family circle
   */
  static async update(
    familyId: string,
    userId: string,
    updateData: UpdateFamilyRequest
  ): Promise<FamilyCircle | null> {
    // First check if user has permission to update
    const hasPermission = await this.userHasManagePermission(familyId, userId);
    if (!hasPermission) {
      throw new Error('Insufficient permissions to update family');
    }

    const db = DatabaseService.getInstance().getConnection();
    try {
      const updates = [];
      const values = [];
      let paramIndex = 1;

      if (updateData.name) {
        updates.push(`name = $${paramIndex++}`);
        values.push(updateData.name);
      }

      if (updateData.settings) {
        // Merge with existing settings
        const existing = await this.findById(familyId);
        if (!existing) throw new Error('Family not found');

        const mergedSettings = { ...existing.settings, ...updateData.settings };
        updates.push(`settings = $${paramIndex++}`);
        values.push(JSON.stringify(mergedSettings));
      }

      if (updateData.culturalPreferences) {
        updates.push(`cultural_preferences = $${paramIndex++}`);
        values.push(JSON.stringify(updateData.culturalPreferences));
      }

      if (updateData.emergencyContacts) {
        updates.push(`emergency_contacts = $${paramIndex++}`);
        values.push(JSON.stringify(updateData.emergencyContacts));
      }

      if (updates.length === 0) {
        return await this.findById(familyId, userId);
      }

      updates.push(`updated_at = NOW()`);
      values.push(familyId);

      const result = await db.one(`
        UPDATE family_circles
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex} AND active = TRUE
        RETURNING *
      `, values);

      if (result.rows.length === 0) {
        return null;
      }

      return this.mapDatabaseRowToFamilyCircle(result.rows[0]);
    } finally {
      client.release();
    }
  }

  /**
   * Archive family circle (soft delete)
   */
  static async archive(
    familyId: string,
    userId: string,
    reason?: string
  ): Promise<boolean> {
    // Check if user is admin
    const isAdmin = await this.userIsAdmin(familyId, userId);
    if (!isAdmin) {
      throw new Error('Only family admin can archive family');
    }

    const db = DatabaseService.getInstance().getConnection();
    try {
      await db.none('BEGIN');

      // Archive the family
      const result = await db.one(`
        UPDATE family_circles
        SET active = FALSE, archived_reason = $1, updated_at = NOW()
        WHERE id = $2 AND active = TRUE
      `, [reason, familyId]);

      // Set all active members to left status
      await db.one(`
        UPDATE family_members
        SET status = 'left', updated_at = NOW()
        WHERE family_id = $1 AND status = 'active'
      `, [familyId]);

      // Revoke all pending invitations
      await db.one(`
        UPDATE family_invitations
        SET status = 'revoked', revoked_at = NOW(), revoked_by = $1,
            revoke_reason = 'Family archived'
        WHERE family_id = $2 AND status = 'pending'
      `, [userId, familyId]);

      await db.one('COMMIT');
      return result.rowCount > 0;
    } catch (error) {
      await db.one('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Get family statistics
   */
  static async getStats(familyId: string, userId: string): Promise<{
    memberCount: number;
    activeInvitations: number;
    recentActivity: number;
    emergencyRules: number;
  }> {
    const db = DatabaseService.getInstance().getConnection();
    try {
      const result = await db.one(`
        SELECT
          (
            SELECT COUNT(*)
            FROM family_members
            WHERE family_id = $1 AND status = 'active'
          ) as member_count,
          (
            SELECT COUNT(*)
            FROM family_invitations
            WHERE family_id = $1 AND status = 'pending' AND expires_at > NOW()
          ) as active_invitations,
          (
            SELECT COUNT(*)
            FROM family_activity_log
            WHERE family_id = $1 AND created_at > NOW() - INTERVAL '24 hours'
          ) as recent_activity,
          (
            SELECT COUNT(*)
            FROM family_emergency_rules
            WHERE family_id = $1 AND active = TRUE
          ) as emergency_rules
      `, [familyId]);

      const row = result.rows[0];
      return {
        memberCount: parseInt(row.member_count),
        activeInvitations: parseInt(row.active_invitations),
        recentActivity: parseInt(row.recent_activity),
        emergencyRules: parseInt(row.emergency_rules)
      };
    } finally {
      client.release();
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private static mapDatabaseRowToFamilyCircle(row: any): FamilyCircle {
    return {
      id: row.id,
      name: row.name,
      createdBy: row.created_by,
      settings: typeof row.settings === 'string' ? JSON.parse(row.settings) : row.settings,
      emergencyContacts: typeof row.emergency_contacts === 'string'
        ? JSON.parse(row.emergency_contacts) : row.emergency_contacts,
      culturalPreferences: typeof row.cultural_preferences === 'string'
        ? JSON.parse(row.cultural_preferences) : row.cultural_preferences,
      active: row.active,
      archivedReason: row.archived_reason,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  private static async userHasManagePermission(
    familyId: string,
    userId: string
  ): Promise<boolean> {
    const db = DatabaseService.getInstance().getConnection();
    try {
      const result = await db.one(`
        SELECT user_has_family_permission($1, $2, 'manageSettings') as has_permission
      `, [userId, familyId]);

      return result.rows[0]?.has_permission || false;
    } finally {
      client.release();
    }
  }

  private static async userIsAdmin(
    familyId: string,
    userId: string
  ): Promise<boolean> {
    const db = DatabaseService.getInstance().getConnection();
    try {
      const result = await db.one(`
        SELECT COUNT(*) > 0 as is_admin
        FROM family_members
        WHERE family_id = $1 AND user_id = $2 AND role = 'admin' AND status = 'active'
      `, [familyId, userId]);

      return result.rows[0]?.is_admin || false;
    } finally {
      client.release();
    }
  }
}