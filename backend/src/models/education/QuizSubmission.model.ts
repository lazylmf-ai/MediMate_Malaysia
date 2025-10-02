/**
 * Quiz Submission Model
 *
 * Database operations for quiz attempts, answers, and scoring.
 */

import { DatabaseService } from '../../services/database/databaseService';
import { QuizSubmission, SubmitQuizDTO } from '../../types/education/education.types';
import { v4 as uuidv4 } from 'uuid';

export class QuizSubmissionModel {
  private static instance: QuizSubmissionModel;
  private db: DatabaseService;

  constructor() {
    this.db = DatabaseService.getInstance();
  }

  public static getInstance(): QuizSubmissionModel {
    if (!QuizSubmissionModel.instance) {
      QuizSubmissionModel.instance = new QuizSubmissionModel();
    }
    return QuizSubmissionModel.instance;
  }

  /**
   * Create quiz submission
   */
  async createSubmission(data: SubmitQuizDTO, score: number, passed: boolean): Promise<QuizSubmission> {
    const id = uuidv4();
    const now = new Date();

    const query = `
      INSERT INTO education_quiz_submissions (
        id, user_id, quiz_id, answers, score, passed, submitted_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    try {
      const conn = this.db.getConnection();
      const result = await conn.one(query, [
        id,
        data.userId,
        data.quizId,
        JSON.stringify(data.answers),
        score,
        passed,
        now.toISOString(),
      ]);

      return this.transformSubmission(result);
    } catch (error: any) {
      throw new Error(`Failed to create quiz submission: ${error.message}`);
    }
  }

  /**
   * Get submission by ID
   */
  async getSubmissionById(id: string): Promise<QuizSubmission | null> {
    const query = `
      SELECT * FROM education_quiz_submissions
      WHERE id = $1
    `;

    try {
      const conn = this.db.getConnection();
      const result = await conn.oneOrNone(query, [id]);
      return result ? this.transformSubmission(result) : null;
    } catch (error: any) {
      throw new Error(`Failed to get quiz submission: ${error.message}`);
    }
  }

  /**
   * Get user submissions for a quiz
   */
  async getUserQuizSubmissions(
    userId: string,
    quizId: string,
    options: {
      passed?: boolean;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ submissions: QuizSubmission[]; total: number }> {
    let query = `
      SELECT * FROM education_quiz_submissions
      WHERE user_id = $1 AND quiz_id = $2
    `;

    const params: any[] = [userId, quizId];
    let paramCount = 2;

    if (options.passed !== undefined) {
      paramCount++;
      query += ` AND passed = $${paramCount}`;
      params.push(options.passed);
    }

    // Get total count
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');

    query += ` ORDER BY submitted_at DESC`;

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
      const [submissions, countResult] = await Promise.all([
        conn.query(query, params),
        conn.one(countQuery, params.slice(0, -2)), // Remove LIMIT and OFFSET for count
      ]);

      return {
        submissions: submissions.map((row: any) => this.transformSubmission(row)),
        total: parseInt(countResult.total),
      };
    } catch (error: any) {
      throw new Error(`Failed to get user quiz submissions: ${error.message}`);
    }
  }

  /**
   * Get all submissions for a user
   */
  async getAllUserSubmissions(
    userId: string,
    options: {
      passed?: boolean;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ submissions: QuizSubmission[]; total: number }> {
    let query = `
      SELECT * FROM education_quiz_submissions
      WHERE user_id = $1
    `;

    const params: any[] = [userId];
    let paramCount = 1;

    if (options.passed !== undefined) {
      paramCount++;
      query += ` AND passed = $${paramCount}`;
      params.push(options.passed);
    }

    // Get total count
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');

    query += ` ORDER BY submitted_at DESC`;

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
      const [submissions, countResult] = await Promise.all([
        conn.query(query, params),
        conn.one(countQuery, params.slice(0, -2)), // Remove LIMIT and OFFSET for count
      ]);

      return {
        submissions: submissions.map((row: any) => this.transformSubmission(row)),
        total: parseInt(countResult.total),
      };
    } catch (error: any) {
      throw new Error(`Failed to get all user submissions: ${error.message}`);
    }
  }

  /**
   * Get all submissions for a quiz (for analytics)
   */
  async getQuizSubmissions(
    quizId: string,
    options: {
      passed?: boolean;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ submissions: QuizSubmission[]; total: number }> {
    let query = `
      SELECT * FROM education_quiz_submissions
      WHERE quiz_id = $1
    `;

    const params: any[] = [quizId];
    let paramCount = 1;

    if (options.passed !== undefined) {
      paramCount++;
      query += ` AND passed = $${paramCount}`;
      params.push(options.passed);
    }

    // Get total count
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');

    query += ` ORDER BY submitted_at DESC`;

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
      const [submissions, countResult] = await Promise.all([
        conn.query(query, params),
        conn.one(countQuery, params.slice(0, -2)), // Remove LIMIT and OFFSET for count
      ]);

      return {
        submissions: submissions.map((row: any) => this.transformSubmission(row)),
        total: parseInt(countResult.total),
      };
    } catch (error: any) {
      throw new Error(`Failed to get quiz submissions: ${error.message}`);
    }
  }

  /**
   * Get best submission score for user on a quiz
   */
  async getBestScore(userId: string, quizId: string): Promise<number | null> {
    const query = `
      SELECT MAX(score) as best_score
      FROM education_quiz_submissions
      WHERE user_id = $1 AND quiz_id = $2
    `;

    try {
      const conn = this.db.getConnection();
      const result = await conn.oneOrNone(query, [userId, quizId]);
      return result?.best_score ?? null;
    } catch (error: any) {
      throw new Error(`Failed to get best score: ${error.message}`);
    }
  }

  /**
   * Check if user has passed quiz
   */
  async hasUserPassedQuiz(userId: string, quizId: string): Promise<boolean> {
    const query = `
      SELECT EXISTS(
        SELECT 1 FROM education_quiz_submissions
        WHERE user_id = $1 AND quiz_id = $2 AND passed = true
      ) as has_passed
    `;

    try {
      const conn = this.db.getConnection();
      const result = await conn.one(query, [userId, quizId]);
      return result.has_passed;
    } catch (error: any) {
      throw new Error(`Failed to check if user passed quiz: ${error.message}`);
    }
  }

  /**
   * Transform database row to QuizSubmission type
   */
  private transformSubmission(row: any): QuizSubmission {
    return {
      id: row.id,
      userId: row.user_id,
      quizId: row.quiz_id,
      answers: JSON.parse(row.answers),
      score: row.score,
      passed: row.passed,
      submittedAt: new Date(row.submitted_at),
    };
  }
}
