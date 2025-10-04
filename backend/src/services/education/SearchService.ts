/**
 * Search Service
 *
 * Full-text search for educational content with multi-language support (MS, EN, ZH, TA).
 * Uses PostgreSQL's full-text search with tsvector for efficient querying.
 */

import { DatabaseService } from '../database/databaseService';
import { EducationContent } from '../../types/education/education.types';

export interface SearchFilters {
  type?: 'article' | 'video' | 'infographic' | 'quiz';
  category?: string;
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  tags?: string[];
  limit?: number;
  offset?: number;
}

export interface SearchResult {
  content: EducationContent[];
  total: number;
  query: string;
}

export class SearchService {
  private static instance: SearchService;
  private db: DatabaseService;

  constructor() {
    this.db = DatabaseService.getInstance();
  }

  public static getInstance(): SearchService {
    if (!SearchService.instance) {
      SearchService.instance = new SearchService();
    }
    return SearchService.instance;
  }

  /**
   * Search educational content using full-text search
   * Supports multi-language queries (MS, EN, ZH, TA)
   */
  async searchContent(query: string, filters: SearchFilters = {}): Promise<SearchResult> {
    if (!query || query.trim().length === 0) {
      throw new Error('Search query cannot be empty');
    }

    // Prepare the search query - use plainto_tsquery for user-friendly queries
    const tsQuery = query.trim();

    let sql = `
      SELECT *,
        ts_rank(search_vector, plainto_tsquery('simple', $1)) AS rank
      FROM education_content
      WHERE search_vector @@ plainto_tsquery('simple', $1)
        AND is_published = true
    `;

    const params: any[] = [tsQuery];
    let paramCount = 1;

    // Apply filters
    if (filters.type) {
      paramCount++;
      sql += ` AND type = $${paramCount}`;
      params.push(filters.type);
    }

    if (filters.category) {
      paramCount++;
      sql += ` AND category = $${paramCount}`;
      params.push(filters.category);
    }

    if (filters.difficulty) {
      paramCount++;
      sql += ` AND difficulty = $${paramCount}`;
      params.push(filters.difficulty);
    }

    if (filters.tags && filters.tags.length > 0) {
      paramCount++;
      sql += ` AND tags && $${paramCount}`;
      params.push(filters.tags);
    }

    // Get total count
    const countSql = sql.replace(
      'SELECT *,\n        ts_rank(search_vector, plainto_tsquery(\'simple\', $1)) AS rank',
      'SELECT COUNT(*) as total'
    );

    // Order by relevance (rank) and recency
    sql += ` ORDER BY rank DESC, published_at DESC`;

    // Apply pagination
    if (filters.limit) {
      paramCount++;
      sql += ` LIMIT $${paramCount}`;
      params.push(filters.limit);
    } else {
      sql += ` LIMIT 20`; // Default limit
    }

    if (filters.offset) {
      paramCount++;
      sql += ` OFFSET $${paramCount}`;
      params.push(filters.offset);
    }

    try {
      const conn = this.db.getConnection();
      const [results, countResult] = await Promise.all([
        conn.query(sql, params),
        conn.one(countSql, params.slice(0, params.length - 2)), // Remove LIMIT and OFFSET for count
      ]);

      return {
        content: results.map((row: any) => this.transformContent(row)),
        total: parseInt(countResult.total),
        query,
      };
    } catch (error: any) {
      throw new Error(`Search failed: ${error.message}`);
    }
  }

  /**
   * Search content by specific language
   * This allows more targeted searches when user specifies a language
   */
  async searchByLanguage(
    query: string,
    language: 'ms' | 'en' | 'zh' | 'ta',
    filters: SearchFilters = {}
  ): Promise<SearchResult> {
    if (!query || query.trim().length === 0) {
      throw new Error('Search query cannot be empty');
    }

    const tsQuery = query.trim();
    const languageFields = {
      ms: 'ms',
      en: 'en',
      zh: 'zh',
      ta: 'ta',
    };

    const langField = languageFields[language];

    let sql = `
      SELECT *,
        ts_rank(search_vector, plainto_tsquery('simple', $1)) AS rank
      FROM education_content
      WHERE (
        title->>'${langField}' ILIKE '%' || $1 || '%'
        OR description->>'${langField}' ILIKE '%' || $1 || '%'
      )
      AND is_published = true
    `;

    const params: any[] = [tsQuery];
    let paramCount = 1;

    // Apply filters (same as above)
    if (filters.type) {
      paramCount++;
      sql += ` AND type = $${paramCount}`;
      params.push(filters.type);
    }

    if (filters.category) {
      paramCount++;
      sql += ` AND category = $${paramCount}`;
      params.push(filters.category);
    }

    if (filters.difficulty) {
      paramCount++;
      sql += ` AND difficulty = $${paramCount}`;
      params.push(filters.difficulty);
    }

    if (filters.tags && filters.tags.length > 0) {
      paramCount++;
      sql += ` AND tags && $${paramCount}`;
      params.push(filters.tags);
    }

    const countSql = sql.replace(
      'SELECT *,\n        ts_rank(search_vector, plainto_tsquery(\'simple\', $1)) AS rank',
      'SELECT COUNT(*) as total'
    );

    sql += ` ORDER BY rank DESC, published_at DESC`;

    if (filters.limit) {
      paramCount++;
      sql += ` LIMIT $${paramCount}`;
      params.push(filters.limit);
    } else {
      sql += ` LIMIT 20`;
    }

    if (filters.offset) {
      paramCount++;
      sql += ` OFFSET $${paramCount}`;
      params.push(filters.offset);
    }

    try {
      const conn = this.db.getConnection();
      const [results, countResult] = await Promise.all([
        conn.query(sql, params),
        conn.one(countSql, params.slice(0, params.length - 2)),
      ]);

      return {
        content: results.map((row: any) => this.transformContent(row)),
        total: parseInt(countResult.total),
        query,
      };
    } catch (error: any) {
      throw new Error(`Language-specific search failed: ${error.message}`);
    }
  }

  /**
   * Search by tags
   */
  async searchByTags(tags: string[], filters: Omit<SearchFilters, 'tags'> = {}): Promise<SearchResult> {
    if (!tags || tags.length === 0) {
      throw new Error('Tags cannot be empty');
    }

    let sql = `
      SELECT * FROM education_content
      WHERE tags && $1
        AND is_published = true
    `;

    const params: any[] = [tags];
    let paramCount = 1;

    if (filters.type) {
      paramCount++;
      sql += ` AND type = $${paramCount}`;
      params.push(filters.type);
    }

    if (filters.category) {
      paramCount++;
      sql += ` AND category = $${paramCount}`;
      params.push(filters.category);
    }

    if (filters.difficulty) {
      paramCount++;
      sql += ` AND difficulty = $${paramCount}`;
      params.push(filters.difficulty);
    }

    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total');

    sql += ` ORDER BY published_at DESC`;

    if (filters.limit) {
      paramCount++;
      sql += ` LIMIT $${paramCount}`;
      params.push(filters.limit);
    } else {
      sql += ` LIMIT 20`;
    }

    if (filters.offset) {
      paramCount++;
      sql += ` OFFSET $${paramCount}`;
      params.push(filters.offset);
    }

    try {
      const conn = this.db.getConnection();
      const [results, countResult] = await Promise.all([
        conn.query(sql, params),
        conn.one(countSql, params.slice(0, params.length - 2)),
      ]);

      return {
        content: results.map((row: any) => this.transformContent(row)),
        total: parseInt(countResult.total),
        query: `Tags: ${tags.join(', ')}`,
      };
    } catch (error: any) {
      throw new Error(`Tag search failed: ${error.message}`);
    }
  }

  /**
   * Get popular content (by view count)
   */
  async getPopularContent(limit: number = 10, filters: SearchFilters = {}): Promise<EducationContent[]> {
    let sql = `
      SELECT * FROM education_content
      WHERE is_published = true
    `;

    const params: any[] = [];
    let paramCount = 0;

    if (filters.type) {
      paramCount++;
      sql += ` AND type = $${paramCount}`;
      params.push(filters.type);
    }

    if (filters.category) {
      paramCount++;
      sql += ` AND category = $${paramCount}`;
      params.push(filters.category);
    }

    sql += ` ORDER BY view_count DESC, published_at DESC`;

    paramCount++;
    sql += ` LIMIT $${paramCount}`;
    params.push(limit);

    try {
      const conn = this.db.getConnection();
      const results = await conn.query(sql, params);
      return results.map((row: any) => this.transformContent(row));
    } catch (error: any) {
      throw new Error(`Failed to get popular content: ${error.message}`);
    }
  }

  /**
   * Get trending content (high completion rate + recent views)
   */
  async getTrendingContent(limit: number = 10, filters: SearchFilters = {}): Promise<EducationContent[]> {
    let sql = `
      SELECT * FROM education_content
      WHERE is_published = true
        AND view_count > 0
    `;

    const params: any[] = [];
    let paramCount = 0;

    if (filters.type) {
      paramCount++;
      sql += ` AND type = $${paramCount}`;
      params.push(filters.type);
    }

    if (filters.category) {
      paramCount++;
      sql += ` AND category = $${paramCount}`;
      params.push(filters.category);
    }

    // Sort by completion rate and recency
    sql += ` ORDER BY (completion_count::float / NULLIF(view_count, 0)) DESC, published_at DESC`;

    paramCount++;
    sql += ` LIMIT $${paramCount}`;
    params.push(limit);

    try {
      const conn = this.db.getConnection();
      const results = await conn.query(sql, params);
      return results.map((row: any) => this.transformContent(row));
    } catch (error: any) {
      throw new Error(`Failed to get trending content: ${error.message}`);
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
