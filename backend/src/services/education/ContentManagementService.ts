/**
 * Content Management Service
 *
 * Handles CRUD operations for educational content with multi-language support.
 * Integrates with versioning and translation services.
 */

import { DatabaseService } from '../database/databaseService';
import { IDatabase } from 'pg-promise';
import { ContentVersioningService, CreateVersionParams } from './ContentVersioningService';
import { TranslationManagementService } from './TranslationManagementService';
import {
  EducationContent,
  ContentListItem,
  CreateContentRequest,
  UpdateContentRequest,
  ContentSearchParams,
  ContentListResponse,
  ContentStatus,
  MultiLanguageText,
  Language
} from '../../types/education';

export class ContentManagementService {
  private db: IDatabase<any>;
  private versioningService: ContentVersioningService;
  private translationService: TranslationManagementService;

  constructor() {
    const dbService = DatabaseService.getInstance();
    this.db = dbService.getConnection();
    this.versioningService = new ContentVersioningService();
    this.translationService = new TranslationManagementService();
  }

  /**
   * Create new educational content
   */
  async createContent(
    request: CreateContentRequest,
    authorId: string
  ): Promise<EducationContent> {
    return await this.db.tx(async (t) => {
      // Insert main content record
      const content = await t.one<EducationContent>(
        `
        INSERT INTO education_content (
          type, category, title, description, body, metadata,
          status, author_id, version
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 1)
        RETURNING
          id, type, category, title, description, body, metadata,
          status, author_id, reviewer_id, review_notes, version,
          view_count, completion_count, published_at, archived_at,
          created_at, updated_at
        `,
        [
          request.type,
          request.category,
          JSON.stringify(this.normalizeMultiLanguageText(request.title)),
          JSON.stringify(this.normalizeMultiLanguageText(request.description)),
          JSON.stringify(this.normalizeMultiLanguageText(request.body)),
          JSON.stringify(request.metadata || {}),
          request.status || 'draft',
          authorId
        ]
      );

      // Parse JSON fields
      content.title = this.parseJsonField(content.title);
      content.description = this.parseJsonField(content.description);
      content.body = this.parseJsonField(content.body);
      content.metadata = this.parseJsonField(content.metadata);

      // Create initial version snapshot
      await this.versioningService.createVersion({
        contentId: content.id,
        version: 1,
        title: content.title,
        description: content.description,
        body: content.body,
        metadata: content.metadata,
        changedBy: authorId,
        changeNote: 'Initial content creation',
        changeType: 'created',
        statusAtVersion: content.status
      });

      // Initialize translation status for all languages
      await this.translationService.initializeTranslationStatus(content.id);

      // Update translation status based on provided content
      const languages: Language[] = ['ms', 'en', 'zh', 'ta'];
      for (const lang of languages) {
        if (
          content.title[lang]?.trim() &&
          content.description[lang]?.trim() &&
          content.body[lang]?.trim()
        ) {
          await this.translationService.updateTranslationStatus(
            content.id,
            lang,
            'draft',
            authorId
          );
        }
      }

      return content;
    });
  }

  /**
   * Get content by ID
   */
  async getContentById(contentId: string): Promise<EducationContent | null> {
    try {
      const content = await this.db.oneOrNone<EducationContent>(
        `
        SELECT
          id, type, category, title, description, body, metadata,
          status, author_id, reviewer_id, review_notes, version,
          view_count, completion_count, published_at, archived_at,
          created_at, updated_at
        FROM education_content
        WHERE id = $1
        `,
        [contentId]
      );

      if (!content) {
        return null;
      }

      // Parse JSON fields
      content.title = this.parseJsonField(content.title);
      content.description = this.parseJsonField(content.description);
      content.body = this.parseJsonField(content.body);
      content.metadata = this.parseJsonField(content.metadata);

      return content;
    } catch (error) {
      console.error(`[ContentManagement] Failed to get content ${contentId}:`, error);
      throw error;
    }
  }

  /**
   * Update content
   */
  async updateContent(
    contentId: string,
    updates: UpdateContentRequest,
    userId: string
  ): Promise<EducationContent> {
    return await this.db.tx(async (t) => {
      // Get current content for version comparison
      const current = await this.getContentById(contentId);
      if (!current) {
        throw new Error('Content not found');
      }

      // Build update query dynamically based on provided fields
      const updateFields: string[] = [];
      const updateValues: any[] = [];
      let paramIndex = 1;

      if (updates.title) {
        const mergedTitle = {
          ...current.title,
          ...updates.title
        };
        updateFields.push(`title = $${paramIndex++}`);
        updateValues.push(JSON.stringify(mergedTitle));
      }

      if (updates.description) {
        const mergedDescription = {
          ...current.description,
          ...updates.description
        };
        updateFields.push(`description = $${paramIndex++}`);
        updateValues.push(JSON.stringify(mergedDescription));
      }

      if (updates.body) {
        const mergedBody = {
          ...current.body,
          ...updates.body
        };
        updateFields.push(`body = $${paramIndex++}`);
        updateValues.push(JSON.stringify(mergedBody));
      }

      if (updates.metadata) {
        const mergedMetadata = {
          ...current.metadata,
          ...updates.metadata
        };
        updateFields.push(`metadata = $${paramIndex++}`);
        updateValues.push(JSON.stringify(mergedMetadata));
      }

      if (updates.category) {
        updateFields.push(`category = $${paramIndex++}`);
        updateValues.push(updates.category);
      }

      if (updates.status) {
        updateFields.push(`status = $${paramIndex++}`);
        updateValues.push(updates.status);

        // Set published_at if status is published
        if (updates.status === 'published' && !current.published_at) {
          updateFields.push(`published_at = NOW()`);
        }

        // Set archived_at if status is archived
        if (updates.status === 'archived' && !current.archived_at) {
          updateFields.push(`archived_at = NOW()`);
        }
      }

      // Always update the updated_at timestamp
      updateFields.push(`updated_at = NOW()`);

      // Add content ID as last parameter
      updateValues.push(contentId);

      const query = `
        UPDATE education_content
        SET ${updateFields.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING
          id, type, category, title, description, body, metadata,
          status, author_id, reviewer_id, review_notes, version,
          view_count, completion_count, published_at, archived_at,
          created_at, updated_at
      `;

      const updated = await t.one<EducationContent>(query, updateValues);

      // Parse JSON fields
      updated.title = this.parseJsonField(updated.title);
      updated.description = this.parseJsonField(updated.description);
      updated.body = this.parseJsonField(updated.body);
      updated.metadata = this.parseJsonField(updated.metadata);

      // Create version snapshot
      await this.versioningService.createVersion({
        contentId: updated.id,
        version: updated.version,
        title: updated.title,
        description: updated.description,
        body: updated.body,
        metadata: updated.metadata,
        changedBy: userId,
        changeNote: updates.change_note,
        changeType: this.determineChangeType(current, updated),
        previousVersion: current.version,
        statusAtVersion: updated.status
      });

      // Update translation status if content changed
      if (updates.title || updates.description || updates.body) {
        const languages: Language[] = ['ms', 'en', 'zh', 'ta'];
        for (const lang of languages) {
          const hasContent =
            updated.title[lang]?.trim() &&
            updated.description[lang]?.trim() &&
            updated.body[lang]?.trim();

          if (hasContent) {
            const currentStatus = await this.translationService.getTranslationStatus(
              contentId,
              lang
            );
            // Only update if it was missing before
            if (currentStatus?.status === 'missing') {
              await this.translationService.updateTranslationStatus(
                contentId,
                lang,
                'draft',
                userId
              );
            }
          }
        }
      }

      return updated;
    });
  }

  /**
   * Delete content (soft delete by archiving)
   */
  async deleteContent(contentId: string, userId: string): Promise<boolean> {
    try {
      await this.updateContent(
        contentId,
        {
          status: 'archived',
          change_note: 'Content archived (deleted)'
        },
        userId
      );
      return true;
    } catch (error) {
      console.error(`[ContentManagement] Failed to delete content ${contentId}:`, error);
      return false;
    }
  }

  /**
   * Hard delete content (permanent removal)
   */
  async permanentDeleteContent(contentId: string): Promise<boolean> {
    try {
      await this.db.none(
        'DELETE FROM education_content WHERE id = $1',
        [contentId]
      );
      return true;
    } catch (error) {
      console.error(`[ContentManagement] Failed to permanently delete content ${contentId}:`, error);
      return false;
    }
  }

  /**
   * List content with search and filters
   */
  async listContent(params: ContentSearchParams): Promise<ContentListResponse> {
    const {
      search,
      status,
      category,
      type,
      author_id,
      reviewer_id,
      language,
      tags,
      sortBy = 'updated_at',
      sortOrder = 'desc',
      page = 1,
      limit = 50
    } = params;

    // Build WHERE clause dynamically
    const conditions: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (search) {
      conditions.push(`(
        title::text ILIKE $${paramIndex} OR
        description::text ILIKE $${paramIndex}
      )`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    if (status) {
      if (Array.isArray(status)) {
        conditions.push(`status = ANY($${paramIndex}::text[])`);
        queryParams.push(status);
      } else {
        conditions.push(`status = $${paramIndex}`);
        queryParams.push(status);
      }
      paramIndex++;
    }

    if (category) {
      if (Array.isArray(category)) {
        conditions.push(`category = ANY($${paramIndex}::text[])`);
        queryParams.push(category);
      } else {
        conditions.push(`category = $${paramIndex}`);
        queryParams.push(category);
      }
      paramIndex++;
    }

    if (type) {
      if (Array.isArray(type)) {
        conditions.push(`type = ANY($${paramIndex}::text[])`);
        queryParams.push(type);
      } else {
        conditions.push(`type = $${paramIndex}`);
        queryParams.push(type);
      }
      paramIndex++;
    }

    if (author_id) {
      conditions.push(`author_id = $${paramIndex}`);
      queryParams.push(author_id);
      paramIndex++;
    }

    if (reviewer_id) {
      conditions.push(`reviewer_id = $${paramIndex}`);
      queryParams.push(reviewer_id);
      paramIndex++;
    }

    if (language) {
      conditions.push(`title->>'${language}' IS NOT NULL AND title->>'${language}' != ''`);
    }

    if (tags && tags.length > 0) {
      conditions.push(`metadata->'tags' ?| $${paramIndex}::text[]`);
      queryParams.push(tags);
      paramIndex++;
    }

    const whereClause = conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM education_content
      ${whereClause}
    `;
    const { total } = await this.db.one<{ total: number }>(countQuery, queryParams);

    // Get paginated results
    const offset = (page - 1) * limit;
    const orderColumn = this.mapSortColumn(sortBy);
    const listQuery = `
      SELECT
        id, type, category, title, description,
        status, version, author_id, reviewer_id,
        view_count, completion_count, created_at, updated_at, published_at
      FROM education_content
      ${whereClause}
      ORDER BY ${orderColumn} ${sortOrder.toUpperCase()}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(limit, offset);

    const items = await this.db.any<ContentListItem>(listQuery, queryParams);

    // Parse JSON fields for each item
    items.forEach(item => {
      item.title = this.parseJsonField(item.title);
      item.description = this.parseJsonField(item.description);
    });

    return {
      items,
      total: parseInt(total.toString(), 10),
      page,
      limit,
      totalPages: Math.ceil(parseInt(total.toString(), 10) / limit)
    };
  }

  /**
   * Change content status
   */
  async changeStatus(
    contentId: string,
    newStatus: ContentStatus,
    userId: string,
    notes?: string
  ): Promise<EducationContent> {
    return await this.updateContent(
      contentId,
      {
        status: newStatus,
        change_note: notes || `Status changed to ${newStatus}`
      },
      userId
    );
  }

  /**
   * Assign reviewer to content
   */
  async assignReviewer(
    contentId: string,
    reviewerId: string,
    assignedBy: string
  ): Promise<EducationContent> {
    const updated = await this.db.one<EducationContent>(
      `
      UPDATE education_content
      SET reviewer_id = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING
        id, type, category, title, description, body, metadata,
        status, author_id, reviewer_id, review_notes, version,
        view_count, completion_count, published_at, archived_at,
        created_at, updated_at
      `,
      [reviewerId, contentId]
    );

    // Parse JSON fields
    updated.title = this.parseJsonField(updated.title);
    updated.description = this.parseJsonField(updated.description);
    updated.body = this.parseJsonField(updated.body);
    updated.metadata = this.parseJsonField(updated.metadata);

    return updated;
  }

  /**
   * Get content by author
   */
  async getContentByAuthor(
    authorId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<ContentListResponse> {
    return this.listContent({
      author_id: authorId,
      page,
      limit
    });
  }

  /**
   * Get content assigned to reviewer
   */
  async getContentByReviewer(
    reviewerId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<ContentListResponse> {
    return this.listContent({
      reviewer_id: reviewerId,
      status: 'in_review',
      page,
      limit
    });
  }

  /**
   * Duplicate content for creating variations
   */
  async duplicateContent(
    sourceId: string,
    userId: string,
    newTitle?: Partial<MultiLanguageText>
  ): Promise<EducationContent> {
    const source = await this.getContentById(sourceId);
    if (!source) {
      throw new Error('Source content not found');
    }

    const duplicateRequest: CreateContentRequest = {
      type: source.type,
      category: source.category,
      title: newTitle || this.appendToMultiLanguageText(source.title, ' (Copy)'),
      description: source.description,
      body: source.body,
      metadata: source.metadata,
      status: 'draft'
    };

    return this.createContent(duplicateRequest, userId);
  }

  /**
   * Helper: Normalize partial multi-language text
   */
  private normalizeMultiLanguageText(text: Partial<MultiLanguageText>): MultiLanguageText {
    return {
      ms: text.ms || '',
      en: text.en || '',
      zh: text.zh || '',
      ta: text.ta || ''
    };
  }

  /**
   * Helper: Parse JSON field from database
   */
  private parseJsonField(field: any): any {
    if (typeof field === 'string') {
      try {
        return JSON.parse(field);
      } catch {
        return field;
      }
    }
    return field;
  }

  /**
   * Helper: Determine change type based on what changed
   */
  private determineChangeType(
    before: EducationContent,
    after: EducationContent
  ): CreateVersionParams['changeType'] {
    if (before.status !== after.status) {
      if (after.status === 'published') return 'published';
      if (after.status === 'archived') return 'archived';
      if (before.status === 'archived' && after.status !== 'archived') return 'restored';
    }

    // Check if only translation changed
    const titleChanged = JSON.stringify(before.title) !== JSON.stringify(after.title);
    const descChanged = JSON.stringify(before.description) !== JSON.stringify(after.description);
    const bodyChanged = JSON.stringify(before.body) !== JSON.stringify(after.body);

    if (titleChanged || descChanged || bodyChanged) {
      return 'translated';
    }

    return 'updated';
  }

  /**
   * Helper: Map sort column to actual database column
   */
  private mapSortColumn(sortBy: string): string {
    const columnMap: Record<string, string> = {
      created_at: 'created_at',
      updated_at: 'updated_at',
      published_at: 'published_at',
      view_count: 'view_count',
      title: "title->>'en'"
    };
    return columnMap[sortBy] || 'updated_at';
  }

  /**
   * Helper: Append text to all languages in multi-language text
   */
  private appendToMultiLanguageText(
    text: MultiLanguageText,
    suffix: string
  ): MultiLanguageText {
    return {
      ms: text.ms + suffix,
      en: text.en + suffix,
      zh: text.zh + suffix,
      ta: text.ta + suffix
    };
  }
}
