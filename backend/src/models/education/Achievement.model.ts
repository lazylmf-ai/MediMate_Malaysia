/**
 * Achievement Model
 *
 * Database operations for user badges and gamification.
 */

import { DatabaseService } from '../../services/database/databaseService';
import { Achievement } from '../../types/education/education.types';
import { v4 as uuidv4 } from 'uuid';

export class AchievementModel {
  private static instance: AchievementModel;
  private db: DatabaseService;

  constructor() {
    this.db = DatabaseService.getInstance();
  }

  public static getInstance(): AchievementModel {
    if (!AchievementModel.instance) {
      AchievementModel.instance = new AchievementModel();
    }
    return AchievementModel.instance;
  }

  /**
   * Award achievement to user
   */
  async awardAchievement(userId: string, badgeId: string): Promise<Achievement> {
    const id = uuidv4();
    const now = new Date();

    const query = `
      INSERT INTO education_achievements (
        id, user_id, badge_id, earned_at
      ) VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id, badge_id)
      DO NOTHING
      RETURNING *
    `;

    try {
      const conn = this.db.getConnection();
      const result = await conn.oneOrNone(query, [id, userId, badgeId, now.toISOString()]);

      if (!result) {
        // Achievement already exists, fetch it
        return await this.getAchievement(userId, badgeId) as Achievement;
      }

      return this.transformAchievement(result);
    } catch (error: any) {
      throw new Error(`Failed to award achievement: ${error.message}`);
    }
  }

  /**
   * Get specific achievement
   */
  async getAchievement(userId: string, badgeId: string): Promise<Achievement | null> {
    const query = `
      SELECT * FROM education_achievements
      WHERE user_id = $1 AND badge_id = $2
    `;

    try {
      const conn = this.db.getConnection();
      const result = await conn.oneOrNone(query, [userId, badgeId]);
      return result ? this.transformAchievement(result) : null;
    } catch (error: any) {
      throw new Error(`Failed to get achievement: ${error.message}`);
    }
  }

  /**
   * Get all achievements for a user
   */
  async getUserAchievements(
    userId: string,
    options: {
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ achievements: Achievement[]; total: number }> {
    let query = `
      SELECT * FROM education_achievements
      WHERE user_id = $1
    `;

    const params: any[] = [userId];
    let paramCount = 1;

    // Get total count
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');

    query += ` ORDER BY earned_at DESC`;

    if (options.limit) {
      paramCount++;
      query += ` LIMIT $${paramCount}`;
      params.push(options.limit);
    }

    if (options.offset) {
      paramCount++;
      query += ` OFFSET $${paramCount}`;
      params.push(options.offset);
    }

    try {
      const conn = this.db.getConnection();
      const [achievements, countResult] = await Promise.all([
        conn.query(query, params),
        conn.one(countQuery, [userId]),
      ]);

      return {
        achievements: achievements.map((row: any) => this.transformAchievement(row)),
        total: parseInt(countResult.total),
      };
    } catch (error: any) {
      throw new Error(`Failed to get user achievements: ${error.message}`);
    }
  }

  /**
   * Get users who earned a specific badge
   */
  async getBadgeRecipients(
    badgeId: string,
    options: {
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ achievements: Achievement[]; total: number }> {
    let query = `
      SELECT * FROM education_achievements
      WHERE badge_id = $1
    `;

    const params: any[] = [badgeId];
    let paramCount = 1;

    // Get total count
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');

    query += ` ORDER BY earned_at DESC`;

    if (options.limit) {
      paramCount++;
      query += ` LIMIT $${paramCount}`;
      params.push(options.limit);
    }

    if (options.offset) {
      paramCount++;
      query += ` OFFSET $${paramCount}`;
      params.push(options.offset);
    }

    try {
      const conn = this.db.getConnection();
      const [achievements, countResult] = await Promise.all([
        conn.query(query, params),
        conn.one(countQuery, [badgeId]),
      ]);

      return {
        achievements: achievements.map((row: any) => this.transformAchievement(row)),
        total: parseInt(countResult.total),
      };
    } catch (error: any) {
      throw new Error(`Failed to get badge recipients: ${error.message}`);
    }
  }

  /**
   * Check if user has achievement
   */
  async hasAchievement(userId: string, badgeId: string): Promise<boolean> {
    const query = `
      SELECT EXISTS(
        SELECT 1 FROM education_achievements
        WHERE user_id = $1 AND badge_id = $2
      ) as has_achievement
    `;

    try {
      const conn = this.db.getConnection();
      const result = await conn.one(query, [userId, badgeId]);
      return result.has_achievement;
    } catch (error: any) {
      throw new Error(`Failed to check achievement: ${error.message}`);
    }
  }

  /**
   * Get achievement count for user
   */
  async getUserAchievementCount(userId: string): Promise<number> {
    const query = `
      SELECT COUNT(*) as count
      FROM education_achievements
      WHERE user_id = $1
    `;

    try {
      const conn = this.db.getConnection();
      const result = await conn.one(query, [userId]);
      return parseInt(result.count);
    } catch (error: any) {
      throw new Error(`Failed to get achievement count: ${error.message}`);
    }
  }

  /**
   * Delete achievement
   */
  async deleteAchievement(userId: string, badgeId: string): Promise<boolean> {
    const query = `
      DELETE FROM education_achievements
      WHERE user_id = $1 AND badge_id = $2
      RETURNING id
    `;

    try {
      const conn = this.db.getConnection();
      const result = await conn.oneOrNone(query, [userId, badgeId]);
      return result !== null;
    } catch (error: any) {
      throw new Error(`Failed to delete achievement: ${error.message}`);
    }
  }

  /**
   * Transform database row to Achievement type
   */
  private transformAchievement(row: any): Achievement {
    return {
      id: row.id,
      userId: row.user_id,
      badgeId: row.badge_id,
      earnedAt: new Date(row.earned_at),
    };
  }
}
