/**
 * Content Controller
 * REST API endpoints for educational content management
 */

import { Request, Response, NextFunction } from 'express';
import { ContentService } from '../../services/education/ContentService';
import { CreateContentDTO, UpdateContentDTO, ContentFilters } from '../../types/education/education.types';

export class ContentController {
  private static contentService = ContentService.getInstance();

  /**
   * Create new educational content
   * POST /api/education/content
   */
  static async createContent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const contentData: CreateContentDTO = req.body;
      const content = await ContentController.contentService.createContent(contentData);

      res.status(201).json({
        success: true,
        message: 'Content created successfully',
        data: content,
      });
    } catch (error: any) {
      console.error('Failed to create content:', error.message);
      next(error);
    }
  }

  /**
   * Get content by ID
   * GET /api/education/content/:id
   */
  static async getContentById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { id } = req.params;
      const incrementView = req.query.incrementView === 'true';

      const content = await ContentController.contentService.getContentById(id, incrementView);

      if (!content) {
        res.status(404).json({ error: 'Content not found' });
        return;
      }

      res.json({
        success: true,
        data: content,
      });
    } catch (error: any) {
      console.error('Failed to get content:', error.message);
      next(error);
    }
  }

  /**
   * Get multiple content items with filters
   * GET /api/education/content
   */
  static async getContent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters: ContentFilters = {
        type: req.query.type as any,
        category: req.query.category as string,
        difficulty: req.query.difficulty as any,
        isPublished: req.query.isPublished === 'true',
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
      };

      // Parse tags if provided
      if (req.query.tags) {
        filters.tags = Array.isArray(req.query.tags)
          ? (req.query.tags as string[])
          : [req.query.tags as string];
      }

      const result = await ContentController.contentService.getContent(filters);

      res.json({
        success: true,
        data: result.content,
        pagination: {
          total: result.total,
          limit: filters.limit,
          offset: filters.offset,
        },
      });
    } catch (error: any) {
      console.error('Failed to get content:', error.message);
      next(error);
    }
  }

  /**
   * Update content
   * PUT /api/education/content/:id
   */
  static async updateContent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { id } = req.params;
      const updates: UpdateContentDTO = req.body;

      const content = await ContentController.contentService.updateContent(id, updates);

      if (!content) {
        res.status(404).json({ error: 'Content not found' });
        return;
      }

      res.json({
        success: true,
        message: 'Content updated successfully',
        data: content,
      });
    } catch (error: any) {
      console.error('Failed to update content:', error.message);
      next(error);
    }
  }

  /**
   * Delete content
   * DELETE /api/education/content/:id
   */
  static async deleteContent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { id } = req.params;
      const deleted = await ContentController.contentService.deleteContent(id);

      if (!deleted) {
        res.status(404).json({ error: 'Content not found' });
        return;
      }

      res.json({
        success: true,
        message: 'Content deleted successfully',
      });
    } catch (error: any) {
      console.error('Failed to delete content:', error.message);
      next(error);
    }
  }

  /**
   * Publish content
   * POST /api/education/content/:id/publish
   */
  static async publishContent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { id } = req.params;
      const content = await ContentController.contentService.publishContent(id);

      if (!content) {
        res.status(404).json({ error: 'Content not found' });
        return;
      }

      res.json({
        success: true,
        message: 'Content published successfully',
        data: content,
      });
    } catch (error: any) {
      console.error('Failed to publish content:', error.message);
      next(error);
    }
  }

  /**
   * Unpublish content
   * POST /api/education/content/:id/unpublish
   */
  static async unpublishContent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { id } = req.params;
      const content = await ContentController.contentService.unpublishContent(id);

      if (!content) {
        res.status(404).json({ error: 'Content not found' });
        return;
      }

      res.json({
        success: true,
        message: 'Content unpublished successfully',
        data: content,
      });
    } catch (error: any) {
      console.error('Failed to unpublish content:', error.message);
      next(error);
    }
  }

  /**
   * Upload media file
   * POST /api/education/content/media
   */
  static async uploadMedia(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      // In a real implementation, this would use multer or similar for file upload
      // For now, assuming file is in req.file (from multer middleware)
      const file = (req as any).file;

      if (!file) {
        res.status(400).json({ error: 'No file provided' });
        return;
      }

      const result = await ContentController.contentService.uploadMedia(
        file.buffer,
        file.mimetype,
        file.originalname,
        { userId }
      );

      res.status(201).json({
        success: true,
        message: 'Media uploaded successfully',
        data: result,
      });
    } catch (error: any) {
      console.error('Failed to upload media:', error.message);
      next(error);
    }
  }

  /**
   * Get presigned URL for media
   * GET /api/education/content/media/:key
   */
  static async getMediaUrl(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { key } = req.params;
      const expiresIn = req.query.expiresIn ? parseInt(req.query.expiresIn as string) : 3600;

      const url = await ContentController.contentService.getMediaUrl(key, expiresIn);

      res.json({
        success: true,
        data: { url, expiresIn },
      });
    } catch (error: any) {
      console.error('Failed to get media URL:', error.message);
      next(error);
    }
  }

  /**
   * Get content by category
   * GET /api/education/content/category/:category
   */
  static async getContentByCategory(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { category } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

      const content = await ContentController.contentService.getContentByCategory(category, limit);

      res.json({
        success: true,
        data: content,
      });
    } catch (error: any) {
      console.error('Failed to get content by category:', error.message);
      next(error);
    }
  }

  /**
   * Get content by medication
   * GET /api/education/content/medication/:medicationId
   */
  static async getContentByMedication(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { medicationId } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

      const content = await ContentController.contentService.getContentByMedication(medicationId, limit);

      res.json({
        success: true,
        data: content,
      });
    } catch (error: any) {
      console.error('Failed to get content by medication:', error.message);
      next(error);
    }
  }

  /**
   * Get content by condition
   * GET /api/education/content/condition/:conditionCode
   */
  static async getContentByCondition(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { conditionCode } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

      const content = await ContentController.contentService.getContentByCondition(conditionCode, limit);

      res.json({
        success: true,
        data: content,
      });
    } catch (error: any) {
      console.error('Failed to get content by condition:', error.message);
      next(error);
    }
  }
}
