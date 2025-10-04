/**
 * Education Content Model
 *
 * Database operations for educational content with multi-language support.
 * Handles CRUD operations for articles, videos, infographics, and quizzes.
 */

import { DatabaseService } from '../../services/database/databaseService';
import {
  EducationContent,
  CreateContentDTO,
  UpdateContentDTO,
  ContentFilters,
} from '../../types/education/education.types';
import { v4 as uuidv4 } from 'uuid';

export class EducationContentModel {
  private static instance: EducationContentModel;
  private db: DatabaseService;

  constructor() {
    this.db = DatabaseService.getInstance();
  }

  public static getInstance(): EducationContentModel {
    if (!EducationContentModel.instance) {
      EducationContentModel.instance = new EducationContentModel();
    }
    return EducationContentModel.instance;
  }

  /**
   * Create new educational content
   */
  async createContent(data: CreateContentDTO): Promise<EducationContent> {
    const id = uuidv4();
    const now = new Date();

    const query = `
      INSERT INTO education_content (
        id, type, category, title, description, content,
        tags, related_medications, related_conditions,
        difficulty, estimated_read_time, medical_reviewer, review_date,
        published_at, updated_at, is_published,
        view_count, completion_count
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *
    `;

    try {
      const conn = this.db.getConnection();
      const result = await conn.one(query, [
        id,
        data.type,
        data.category,
        JSON.stringify(data.title),
        JSON.stringify(data.description),
        JSON.stringify(data.content),
        data.tags || [],
        data.relatedMedications || [],
        data.relatedConditions || [],
        data.difficulty || null,
        data.estimatedReadTime || null,
        data.medicalReviewer || null,
        data.reviewDate?.toISOString() || null,
        null, // published_at - null for draft
        now.toISOString(),
        false, // is_published - false by default
        0, // view_count
        0, // completion_count
      ]);

      return this.transformContent(result);
    } catch (error: any) {
      throw new Error(`Failed to create educational content: ${error.message}`);
    }
  }

  /**
   * Get content by ID
   */
  async getContentById(id: string): Promise<EducationContent | null> {
    const query = `
      SELECT * FROM education_content
      WHERE id = $1
    `;

    try {
      const conn = this.db.getConnection();
      const result = await conn.oneOrNone(query, [id]);
      return result ? this.transformContent(result) : null;
    } catch (error: any) {
      throw new Error(`Failed to get content by ID: ${error.message}`);
    }
  }

  /**
   * Get multiple content items with filters
   */
  async getContent(filters: ContentFilters = {}): Promise<{ content: EducationContent[]; total: number }> {
    let query = `
      SELECT * FROM education_content
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramCount = 0;

    if (filters.type) {
      paramCount++;
      query += ` AND type = $${paramCount}`;
      params.push(filters.type);
    }

    if (filters.category) {
      paramCount++;
      query += ` AND category = $${paramCount}`;
      params.push(filters.category);
    }

    if (filters.difficulty) {
      paramCount++;
      query += ` AND difficulty = $${paramCount}`;
      params.push(filters.difficulty);
    }

    if (filters.isPublished !== undefined) {
      paramCount++;
      query += ` AND is_published = $${paramCount}`;
      params.push(filters.isPublished);
    }

    if (filters.tags && filters.tags.length > 0) {
      paramCount++;
      query += ` AND tags && $${paramCount}`;
      params.push(filters.tags);
    }

    if (filters.relatedMedication) {
      paramCount++;
      query += ` AND $${paramCount} = ANY(related_medications)`;
      params.push(filters.relatedMedication);
    }

    if (filters.relatedCondition) {
      paramCount++;
      query += ` AND $${paramCount} = ANY(related_conditions)`;
      params.push(filters.relatedCondition);
    }

    // Get total count
    const countQuery = query.replace('SELECT *', 'SELECT COUNT(*) as total');

    query += ` ORDER BY published_at DESC NULLS LAST, updated_at DESC`;

    if (filters.limit) {
      paramCount++;
      query += ` LIMIT $${paramCount}`;
      params.push(filters.limit);
    }

    if (filters.offset) {
      paramCount++;
      query += ` OFFSET $${paramCount}`;
      params.push(filters.offset);
    }

    try {
      const conn = this.db.getConnection();
      const [content, countResult] = await Promise.all([
        conn.query(query, params),
        conn.one(countQuery, params.slice(0, -2)), // Remove LIMIT and OFFSET for count
      ]);

      return {
        content: content.map((row: any) => this.transformContent(row)),
        total: parseInt(countResult.total),
      };
    } catch (error: any) {
      throw new Error(`Failed to get content: ${error.message}`);
    }
  }

  /**
   * Update content
   */
  async updateContent(id: string, updates: UpdateContentDTO): Promise<EducationContent | null> {
    const setFields: string[] = [];
    const params: any[] = [];
    let paramCount = 0;

    if (updates.type !== undefined) {
      paramCount++;
      setFields.push(`type = $${paramCount}`);
      params.push(updates.type);
    }

    if (updates.category !== undefined) {
      paramCount++;
      setFields.push(`category = $${paramCount}`);
      params.push(updates.category);
    }

    if (updates.title !== undefined) {
      paramCount++;
      setFields.push(`title = $${paramCount}`);
      params.push(JSON.stringify(updates.title));
    }

    if (updates.description !== undefined) {
      paramCount++;
      setFields.push(`description = $${paramCount}`);
      params.push(JSON.stringify(updates.description));
    }

    if (updates.content !== undefined) {
      paramCount++;
      setFields.push(`content = $${paramCount}`);
      params.push(JSON.stringify(updates.content));
    }

    if (updates.tags !== undefined) {
      paramCount++;
      setFields.push(`tags = $${paramCount}`);
      params.push(updates.tags);
    }

    if (updates.relatedMedications !== undefined) {
      paramCount++;
      setFields.push(`related_medications = $${paramCount}`);
      params.push(updates.relatedMedications);
    }

    if (updates.relatedConditions !== undefined) {
      paramCount++;
      setFields.push(`related_conditions = $${paramCount}`);
      params.push(updates.relatedConditions);
    }

    if (updates.difficulty !== undefined) {
      paramCount++;
      setFields.push(`difficulty = $${paramCount}`);
      params.push(updates.difficulty);
    }

    if (updates.estimatedReadTime !== undefined) {
      paramCount++;
      setFields.push(`estimated_read_time = $${paramCount}`);
      params.push(updates.estimatedReadTime);
    }

    if (updates.medicalReviewer !== undefined) {
      paramCount++;
      setFields.push(`medical_reviewer = $${paramCount}`);
      params.push(updates.medicalReviewer);
    }

    if (updates.reviewDate !== undefined) {
      paramCount++;
      setFields.push(`review_date = $${paramCount}`);
      params.push(updates.reviewDate?.toISOString() || null);
    }

    if (updates.isPublished !== undefined) {
      paramCount++;
      setFields.push(`is_published = $${paramCount}`);
      params.push(updates.isPublished);

      // Set published_at when publishing
      if (updates.isPublished) {
        paramCount++;
        setFields.push(`published_at = $${paramCount}`);
        params.push(new Date().toISOString());
      }
    }

    if (setFields.length === 0) {
      throw new Error('No fields to update');
    }

    // updated_at is automatically handled by trigger
    params.push(id);

    const query = `
      UPDATE education_content
      SET ${setFields.join(', ')}
      WHERE id = $${paramCount + 1}
      RETURNING *
    `;

    try {
      const conn = this.db.getConnection();
      const result = await conn.oneOrNone(query, params);
      return result ? this.transformContent(result) : null;
    } catch (error: any) {
      throw new Error(`Failed to update content: ${error.message}`);
    }
  }

  /**
   * Delete content
   */
  async deleteContent(id: string): Promise<boolean> {
    const query = `
      DELETE FROM education_content
      WHERE id = $1
      RETURNING id
    `;

    try {
      const conn = this.db.getConnection();
      const result = await conn.oneOrNone(query, [id]);
      return result !== null;
    } catch (error: any) {
      throw new Error(`Failed to delete content: ${error.message}`);
    }
  }

  /**
   * Increment view count
   */
  async incrementViewCount(id: string): Promise<void> {
    const query = `
      UPDATE education_content
      SET view_count = view_count + 1
      WHERE id = $1
    `;

    try {
      const conn = this.db.getConnection();
      await conn.none(query, [id]);
    } catch (error: any) {
      throw new Error(`Failed to increment view count: ${error.message}`);
    }
  }

  /**
   * Increment completion count
   */
  async incrementCompletionCount(id: string): Promise<void> {
    const query = `
      UPDATE education_content
      SET completion_count = completion_count + 1
      WHERE id = $1
    `;

    try {
      const conn = this.db.getConnection();
      await conn.none(query, [id]);
    } catch (error: any) {
      throw new Error(`Failed to increment completion count: ${error.message}`);
    }
  }

  /**
   * Update average rating
   */
  async updateAverageRating(id: string, rating: number): Promise<void> {
    const query = `
      UPDATE education_content
      SET average_rating = $2
      WHERE id = $1
    `;

    try {
      const conn = this.db.getConnection();
      await conn.none(query, [id, rating]);
    } catch (error: any) {
      throw new Error(`Failed to update average rating: ${error.message}`);
    }
  }

  /**
   * Transform database row to EducationContent type
   */
  private transformContent(row: any): EducationContent {
    return {
      id: row.id,
      type: row.type,
      category: row.category,
      title: JSON.parse(row.title),
      description: JSON.parse(row.description),
      content: JSON.parse(row.content),
      tags: row.tags || [],
      relatedMedications: row.related_medications || [],
      relatedConditions: row.related_conditions || [],
      difficulty: row.difficulty,
      estimatedReadTime: row.estimated_read_time,
      medicalReviewer: row.medical_reviewer,
      reviewDate: row.review_date ? new Date(row.review_date) : undefined,
      publishedAt: row.published_at ? new Date(row.published_at) : undefined,
      updatedAt: new Date(row.updated_at),
      isPublished: row.is_published,
      viewCount: row.view_count,
      completionCount: row.completion_count,
      averageRating: row.average_rating,
    };
  }
}
