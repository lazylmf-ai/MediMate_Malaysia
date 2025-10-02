/**
 * Content Service
 *
 * Business logic for educational content management including creation,
 * retrieval, updates, and integration with media storage.
 */

import { EducationContentModel } from '../../models/education/EducationContent.model';
import { MediaStorageService } from './MediaStorageService';
import {
  EducationContent,
  CreateContentDTO,
  UpdateContentDTO,
  ContentFilters,
} from '../../types/education/education.types';

export class ContentService {
  private static instance: ContentService;
  private contentModel: EducationContentModel;
  private mediaStorage: MediaStorageService;

  constructor() {
    this.contentModel = EducationContentModel.getInstance();
    this.mediaStorage = MediaStorageService.getInstance();
  }

  public static getInstance(): ContentService {
    if (!ContentService.instance) {
      ContentService.instance = new ContentService();
    }
    return ContentService.instance;
  }

  /**
   * Create new educational content
   */
  async createContent(data: CreateContentDTO): Promise<EducationContent> {
    // Validate required fields
    this.validateContentData(data);

    // Create content
    const content = await this.contentModel.createContent(data);

    return content;
  }

  /**
   * Get content by ID
   */
  async getContentById(id: string, incrementView: boolean = false): Promise<EducationContent | null> {
    const content = await this.contentModel.getContentById(id);

    if (!content) {
      return null;
    }

    // Increment view count if requested
    if (incrementView && content.isPublished) {
      await this.contentModel.incrementViewCount(id);
      content.viewCount += 1;
    }

    return content;
  }

  /**
   * Get multiple content items with filters
   */
  async getContent(filters: ContentFilters = {}): Promise<{ content: EducationContent[]; total: number }> {
    // By default, only show published content to regular users
    if (filters.isPublished === undefined) {
      filters.isPublished = true;
    }

    return await this.contentModel.getContent(filters);
  }

  /**
   * Update content
   */
  async updateContent(id: string, updates: UpdateContentDTO): Promise<EducationContent | null> {
    // Validate updates if provided
    if (updates.title || updates.description || updates.content) {
      this.validateContentData(updates as any);
    }

    return await this.contentModel.updateContent(id, updates);
  }

  /**
   * Delete content
   */
  async deleteContent(id: string): Promise<boolean> {
    return await this.contentModel.deleteContent(id);
  }

  /**
   * Publish content
   */
  async publishContent(id: string): Promise<EducationContent | null> {
    const content = await this.contentModel.getContentById(id);

    if (!content) {
      throw new Error('Content not found');
    }

    // Validate content is ready for publishing
    this.validatePublishReady(content);

    return await this.contentModel.updateContent(id, { isPublished: true });
  }

  /**
   * Unpublish content
   */
  async unpublishContent(id: string): Promise<EducationContent | null> {
    return await this.contentModel.updateContent(id, { isPublished: false });
  }

  /**
   * Mark content as completed for analytics
   */
  async markCompleted(id: string): Promise<void> {
    await this.contentModel.incrementCompletionCount(id);
  }

  /**
   * Upload media file for content
   */
  async uploadMedia(
    file: Buffer,
    contentType: string,
    fileName: string,
    metadata?: Record<string, string>
  ): Promise<{ url: string; key: string }> {
    const result = await this.mediaStorage.uploadFile({
      file,
      contentType,
      fileName,
      metadata,
    });

    return {
      url: result.url,
      key: result.key,
    };
  }

  /**
   * Generate presigned URL for media access
   */
  async getMediaUrl(key: string, expiresIn: number = 3600): Promise<string> {
    return await this.mediaStorage.generatePresignedUrl(key, expiresIn);
  }

  /**
   * Delete media file
   */
  async deleteMedia(key: string): Promise<void> {
    await this.mediaStorage.deleteFile(key);
  }

  /**
   * Get content by category
   */
  async getContentByCategory(category: string, limit: number = 10): Promise<EducationContent[]> {
    const result = await this.contentModel.getContent({
      category,
      isPublished: true,
      limit,
    });

    return result.content;
  }

  /**
   * Get content by tags
   */
  async getContentByTags(tags: string[], limit: number = 10): Promise<EducationContent[]> {
    const result = await this.contentModel.getContent({
      tags,
      isPublished: true,
      limit,
    });

    return result.content;
  }

  /**
   * Get content related to medication
   */
  async getContentByMedication(medicationId: string, limit: number = 10): Promise<EducationContent[]> {
    const result = await this.contentModel.getContent({
      relatedMedication: medicationId,
      isPublished: true,
      limit,
    });

    return result.content;
  }

  /**
   * Get content related to condition
   */
  async getContentByCondition(conditionCode: string, limit: number = 10): Promise<EducationContent[]> {
    const result = await this.contentModel.getContent({
      relatedCondition: conditionCode,
      isPublished: true,
      limit,
    });

    return result.content;
  }

  /**
   * Validate content data
   */
  private validateContentData(data: Partial<CreateContentDTO>): void {
    if (data.title) {
      if (!data.title.ms || !data.title.en || !data.title.zh || !data.title.ta) {
        throw new Error('Title must include all four languages (MS, EN, ZH, TA)');
      }
    }

    if (data.description) {
      if (!data.description.ms || !data.description.en || !data.description.zh || !data.description.ta) {
        throw new Error('Description must include all four languages (MS, EN, ZH, TA)');
      }
    }

    if (data.content) {
      if (!data.content.ms || !data.content.en || !data.content.zh || !data.content.ta) {
        throw new Error('Content must include all four languages (MS, EN, ZH, TA)');
      }
    }
  }

  /**
   * Validate content is ready for publishing
   */
  private validatePublishReady(content: EducationContent): void {
    if (!content.title || !content.description || !content.content) {
      throw new Error('Content must have title, description, and content before publishing');
    }

    if (!content.category) {
      throw new Error('Content must have a category before publishing');
    }

    // Optionally require medical review for certain content types
    if (content.type === 'article' && !content.medicalReviewer) {
      throw new Error('Articles must be medically reviewed before publishing');
    }
  }
}
