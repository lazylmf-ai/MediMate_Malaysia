/**
 * User Progress Model
 *
 * Database operations for tracking user viewing and completion of educational content.
 */

import { DatabaseService } from '../../services/database/databaseService';
import { UserProgress, TrackProgressDTO } from '../../types/education/education.types';
import { v4 as uuidv4 } from 'uuid';

export class UserProgressModel {
  private static instance: UserProgressModel;
  private db: DatabaseService;

  constructor() {
    this.db = DatabaseService.getInstance();
  }

  public static getInstance(): UserProgressModel {
    if (!UserProgressModel.instance) {
      UserProgressModel.instance = new UserProgressModel();
    }
    return UserProgressModel.instance;
  }

  /**
   * Track user progress (view or completion)
   */
  async trackProgress(data: TrackProgressDTO): Promise<UserProgress> {
    const id = uuidv4();
    const now = new Date();

    const query = `
      INSERT INTO education_user_progress (
        id, user_id, content_id, viewed_at, completed_at, time_spent
      ) VALUES ($1, $2, $3, $4, $5, $6)
      ON CONFLICT (user_id, content_id)
      DO UPDATE SET
        viewed_at = COALESCE(education_user_progress.viewed_at, EXCLUDED.viewed_at),
        completed_at = COALESCE(EXCLUDED.completed_at, education_user_progress.completed_at),
        time_spent = education_user_progress.time_spent + EXCLUDED.time_spent
      RETURNING *
    `;

    try {
      const conn = this.db.getConnection();
      const result = await conn.one(query, [
        id,
        data.userId,
        data.contentId,
        data.viewed ? now.toISOString() : null,
        data.completed ? now.toISOString() : null,
        data.timeSpent || 0,
      ]);

      return this.transformProgress(result);
    } catch (error: any) {
      throw new Error(`Failed to track progress: ${error.message}`);
    }
  }

  /**
   * Get user progress for specific content
   */
  async getUserProgress(userId: string, contentId: string): Promise<UserProgress | null> {
    const query = `
      SELECT * FROM education_user_progress
      WHERE user_id = $1 AND content_id = $2
    `;

    try {
      const conn = this.db.getConnection();
      const result = await conn.oneOrNone(query, [userId, contentId]);
      return result ? this.transformProgress(result) : null;
    } catch (error: any) {
      throw new Error(`Failed to get user progress: ${error.message}`);
    }
  }

  /**
   * Get all progress for a user
   */
  async getUserProgressList(
    userId: string,
    options: {
      completed?: boolean;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ progress: UserProgress[]; total: number }> {
    let query = `
      SELECT * FROM education_user_progress
      WHERE user_id = $1
    `;

    const params: any[] = [userId];
    let paramCount = 1;

    if (options.completed !== undefined) {
      if (options.completed) {
        query += ` AND completed_at IS NOT NULL`;
      } else {
        query += ` AND completed_at IS NULL`;
      }
    }

    // Get total count
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');

    query += ` ORDER BY viewed_at DESC`;

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
      const [progress, countResult] = await Promise.all([
        conn.query(query, params),
        conn.one(countQuery, [userId]),
      ]);

      return {
        progress: progress.map((row: any) => this.transformProgress(row)),
        total: parseInt(countResult.total),
      };
    } catch (error: any) {
      throw new Error(`Failed to get user progress list: ${error.message}`);
    }
  }

  /**
   * Get content progress for all users (for analytics)
   */
  async getContentProgress(
    contentId: string,
    options: {
      completed?: boolean;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ progress: UserProgress[]; total: number }> {
    let query = `
      SELECT * FROM education_user_progress
      WHERE content_id = $1
    `;

    const params: any[] = [contentId];
    let paramCount = 1;

    if (options.completed !== undefined) {
      if (options.completed) {
        query += ` AND completed_at IS NOT NULL`;
      } else {
        query += ` AND completed_at IS NULL`;
      }
    }

    // Get total count
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');

    query += ` ORDER BY viewed_at DESC`;

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
      const [progress, countResult] = await Promise.all([
        conn.query(query, params),
        conn.one(countQuery, [contentId]),
      ]);

      return {
        progress: progress.map((row: any) => this.transformProgress(row)),
        total: parseInt(countResult.total),
      };
    } catch (error: any) {
      throw new Error(`Failed to get content progress: ${error.message}`);
    }
  }

  /**
   * Delete user progress record
   */
  async deleteProgress(userId: string, contentId: string): Promise<boolean> {
    const query = `
      DELETE FROM education_user_progress
      WHERE user_id = $1 AND content_id = $2
      RETURNING id
    `;

    try {
      const conn = this.db.getConnection();
      const result = await conn.oneOrNone(query, [userId, contentId]);
      return result !== null;
    } catch (error: any) {
      throw new Error(`Failed to delete progress: ${error.message}`);
    }
  }

  /**
   * Transform database row to UserProgress type
   */
  private transformProgress(row: any): UserProgress {
    return {
      id: row.id,
      userId: row.user_id,
      contentId: row.content_id,
      viewedAt: row.viewed_at ? new Date(row.viewed_at) : undefined,
      completedAt: row.completed_at ? new Date(row.completed_at) : undefined,
      timeSpent: row.time_spent,
    };
  }
}
