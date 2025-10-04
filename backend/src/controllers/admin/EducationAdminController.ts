/**
 * Education Admin Controller
 *
 * Handles HTTP requests for educational content management.
 * Implements CRUD operations, workflow management, and integrates with
 * content management, versioning, and translation services.
 */

import { Request, Response } from 'express';
import { ContentManagementService } from '../../services/education/ContentManagementService';
import { ReviewWorkflowService } from '../../services/education/ReviewWorkflowService';
import { ContentAnalyticsService } from '../../services/education/ContentAnalyticsService';
import { TranslationManagementService } from '../../services/education/TranslationManagementService';
import {
  CreateContentRequest,
  UpdateContentRequest,
  ContentSearchParams,
  ContentStatus,
  Language
} from '../../types/education';

export class EducationAdminController {
  private contentService: ContentManagementService;
  private reviewService: ReviewWorkflowService;
  private analyticsService: ContentAnalyticsService;
  private translationService: TranslationManagementService;

  constructor() {
    this.contentService = new ContentManagementService();
    this.reviewService = new ReviewWorkflowService();
    this.analyticsService = new ContentAnalyticsService();
    this.translationService = new TranslationManagementService();
  }

  /**
   * List content with search and filters
   * GET /api/admin/education/content
   */
  async listContent(req: Request, res: Response): Promise<void> {
    try {
      const params: ContentSearchParams = {
        search: req.query.search as string,
        status: req.query.status as ContentStatus,
        category: req.query.category as string,
        type: req.query.type as any,
        author_id: req.query.author_id as string,
        reviewer_id: req.query.reviewer_id as string,
        language: req.query.language as Language,
        tags: req.query.tags ? (req.query.tags as string).split(',') : undefined,
        sortBy: (req.query.sortBy as any) || 'updated_at',
        sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'desc',
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 50
      };

      const result = await this.contentService.listContent(params);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      console.error('[EducationAdminController] List content failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve content list',
        code: 'CONTENT_LIST_FAILED'
      });
    }
  }

  /**
   * Get content by ID
   * GET /api/admin/education/content/:id
   */
  async getContent(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const content = await this.contentService.getContentById(id);

      if (!content) {
        res.status(404).json({
          success: false,
          error: 'Content not found',
          code: 'CONTENT_NOT_FOUND'
        });
        return;
      }

      res.json({
        success: true,
        data: content
      });
    } catch (error) {
      console.error('[EducationAdminController] Get content failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve content',
        code: 'CONTENT_GET_FAILED'
      });
    }
  }

  /**
   * Create new content
   * POST /api/admin/education/content
   */
  async createContent(req: Request, res: Response): Promise<void> {
    try {
      const authorId = req.user?.id;
      if (!authorId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'UNAUTHORIZED'
        });
        return;
      }

      const request: CreateContentRequest = req.body;

      // Validate required fields
      if (!request.type || !request.category) {
        res.status(400).json({
          success: false,
          error: 'Type and category are required',
          code: 'VALIDATION_ERROR'
        });
        return;
      }

      const content = await this.contentService.createContent(request, authorId);

      res.status(201).json({
        success: true,
        data: content,
        message: 'Content created successfully'
      });
    } catch (error) {
      console.error('[EducationAdminController] Create content failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create content',
        code: 'CONTENT_CREATE_FAILED'
      });
    }
  }

  /**
   * Update existing content
   * PUT /api/admin/education/content/:id
   */
  async updateContent(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'UNAUTHORIZED'
        });
        return;
      }

      const updates: UpdateContentRequest = req.body;

      const content = await this.contentService.updateContent(id, updates, userId);

      res.json({
        success: true,
        data: content,
        message: 'Content updated successfully'
      });
    } catch (error) {
      console.error('[EducationAdminController] Update content failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update content',
        code: 'CONTENT_UPDATE_FAILED'
      });
    }
  }

  /**
   * Delete content (soft delete by archiving)
   * DELETE /api/admin/education/content/:id
   */
  async deleteContent(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'UNAUTHORIZED'
        });
        return;
      }

      const success = await this.contentService.deleteContent(id, userId);

      if (success) {
        res.json({
          success: true,
          message: 'Content deleted successfully'
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to delete content',
          code: 'CONTENT_DELETE_FAILED'
        });
      }
    } catch (error) {
      console.error('[EducationAdminController] Delete content failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete content',
        code: 'CONTENT_DELETE_FAILED'
      });
    }
  }

  /**
   * Submit content for review
   * POST /api/admin/education/content/:id/submit-review
   */
  async submitForReview(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'UNAUTHORIZED'
        });
        return;
      }

      const content = await this.reviewService.submitForReview(id, userId);

      res.json({
        success: true,
        data: content,
        message: 'Content submitted for review successfully'
      });
    } catch (error) {
      console.error('[EducationAdminController] Submit for review failed:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to submit for review',
        code: 'SUBMIT_REVIEW_FAILED'
      });
    }
  }

  /**
   * Assign reviewer to content
   * POST /api/admin/education/content/:id/assign-reviewer
   */
  async assignReviewer(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { reviewerId } = req.body;
      const assignedBy = req.user?.id;

      if (!assignedBy) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'UNAUTHORIZED'
        });
        return;
      }

      if (!reviewerId) {
        res.status(400).json({
          success: false,
          error: 'Reviewer ID is required',
          code: 'VALIDATION_ERROR'
        });
        return;
      }

      const content = await this.reviewService.assignReviewer(id, reviewerId, assignedBy);

      res.json({
        success: true,
        data: content,
        message: 'Reviewer assigned successfully'
      });
    } catch (error) {
      console.error('[EducationAdminController] Assign reviewer failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to assign reviewer',
        code: 'ASSIGN_REVIEWER_FAILED'
      });
    }
  }

  /**
   * Approve content
   * POST /api/admin/education/content/:id/approve
   */
  async approveContent(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { comment } = req.body;
      const reviewerId = req.user?.id;

      if (!reviewerId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'UNAUTHORIZED'
        });
        return;
      }

      const content = await this.reviewService.approveContent(id, reviewerId, comment);

      res.json({
        success: true,
        data: content,
        message: 'Content approved successfully'
      });
    } catch (error) {
      console.error('[EducationAdminController] Approve content failed:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to approve content',
        code: 'APPROVE_FAILED'
      });
    }
  }

  /**
   * Request changes to content
   * POST /api/admin/education/content/:id/request-changes
   */
  async requestChanges(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { comment } = req.body;
      const reviewerId = req.user?.id;

      if (!reviewerId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'UNAUTHORIZED'
        });
        return;
      }

      if (!comment || !comment.trim()) {
        res.status(400).json({
          success: false,
          error: 'Comment is required when requesting changes',
          code: 'VALIDATION_ERROR'
        });
        return;
      }

      const content = await this.reviewService.requestChanges(id, reviewerId, comment);

      res.json({
        success: true,
        data: content,
        message: 'Change request submitted successfully'
      });
    } catch (error) {
      console.error('[EducationAdminController] Request changes failed:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to request changes',
        code: 'REQUEST_CHANGES_FAILED'
      });
    }
  }

  /**
   * Publish content
   * POST /api/admin/education/content/:id/publish
   */
  async publishContent(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'UNAUTHORIZED'
        });
        return;
      }

      const content = await this.reviewService.publishContent(id, userId);

      res.json({
        success: true,
        data: content,
        message: 'Content published successfully'
      });
    } catch (error) {
      console.error('[EducationAdminController] Publish content failed:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to publish content',
        code: 'PUBLISH_FAILED'
      });
    }
  }

  /**
   * Unpublish content
   * POST /api/admin/education/content/:id/unpublish
   */
  async unpublishContent(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'UNAUTHORIZED'
        });
        return;
      }

      const content = await this.contentService.changeStatus(id, 'approved', userId, 'Content unpublished');

      res.json({
        success: true,
        data: content,
        message: 'Content unpublished successfully'
      });
    } catch (error) {
      console.error('[EducationAdminController] Unpublish content failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to unpublish content',
        code: 'UNPUBLISH_FAILED'
      });
    }
  }

  /**
   * Archive content
   * POST /api/admin/education/content/:id/archive
   */
  async archiveContent(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'UNAUTHORIZED'
        });
        return;
      }

      const content = await this.contentService.changeStatus(id, 'archived', userId, 'Content archived');

      res.json({
        success: true,
        data: content,
        message: 'Content archived successfully'
      });
    } catch (error) {
      console.error('[EducationAdminController] Archive content failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to archive content',
        code: 'ARCHIVE_FAILED'
      });
    }
  }

  /**
   * Get translation status for content
   * GET /api/admin/education/content/:id/translations
   */
  async getTranslationStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const statuses = await this.translationService.getAllTranslationStatus(id);

      // Transform to map format
      const statusMap = {
        ms: statuses.find(s => s.language === 'ms')?.status || 'missing',
        en: statuses.find(s => s.language === 'en')?.status || 'missing',
        zh: statuses.find(s => s.language === 'zh')?.status || 'missing',
        ta: statuses.find(s => s.language === 'ta')?.status || 'missing'
      };

      res.json({
        success: true,
        data: statusMap
      });
    } catch (error) {
      console.error('[EducationAdminController] Get translation status failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get translation status',
        code: 'TRANSLATION_STATUS_FAILED'
      });
    }
  }

  /**
   * Update translation for specific language
   * PUT /api/admin/education/content/:id/translations/:language
   */
  async updateTranslation(req: Request, res: Response): Promise<void> {
    try {
      const { id, language } = req.params;
      const { title, description, body } = req.body;
      const userId = req.user?.id;

      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'UNAUTHORIZED'
        });
        return;
      }

      // Validate language
      const validLanguages: Language[] = ['ms', 'en', 'zh', 'ta'];
      if (!validLanguages.includes(language as Language)) {
        res.status(400).json({
          success: false,
          error: 'Invalid language',
          code: 'INVALID_LANGUAGE'
        });
        return;
      }

      // Update content with translation
      const content = await this.contentService.updateContent(
        id,
        {
          title: { [language]: title },
          description: { [language]: description },
          body: { [language]: body },
          change_note: `Updated ${language.toUpperCase()} translation`
        },
        userId
      );

      // Update translation status
      await this.translationService.updateTranslationStatus(
        id,
        language as Language,
        'draft',
        userId
      );

      res.json({
        success: true,
        data: content,
        message: 'Translation updated successfully'
      });
    } catch (error) {
      console.error('[EducationAdminController] Update translation failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update translation',
        code: 'TRANSLATION_UPDATE_FAILED'
      });
    }
  }

  /**
   * Get analytics overview
   * GET /api/admin/education/analytics/overview
   */
  async getAnalyticsOverview(req: Request, res: Response): Promise<void> {
    try {
      const overview = await this.analyticsService.getOverviewAnalytics();

      res.json({
        success: true,
        data: overview
      });
    } catch (error) {
      console.error('[EducationAdminController] Get analytics overview failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get analytics overview',
        code: 'ANALYTICS_OVERVIEW_FAILED'
      });
    }
  }

  /**
   * Get content-specific analytics
   * GET /api/admin/education/analytics/content/:id
   */
  async getContentAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const analytics = await this.analyticsService.getContentAnalytics(id);

      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      console.error('[EducationAdminController] Get content analytics failed:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get content analytics',
        code: 'CONTENT_ANALYTICS_FAILED'
      });
    }
  }
}

// Export singleton instance
export const educationAdminController = new EducationAdminController();
