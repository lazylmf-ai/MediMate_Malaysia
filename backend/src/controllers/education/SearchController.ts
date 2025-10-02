/**
 * Search Controller
 * REST API endpoints for educational content search
 */

import { Request, Response, NextFunction } from 'express';
import { SearchService, SearchFilters } from '../../services/education/SearchService';

export class SearchController {
  private static searchService = SearchService.getInstance();

  /**
   * Search educational content
   * GET /api/education/search
   */
  static async searchContent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = req.query.q as string;

      if (!query || query.trim().length === 0) {
        res.status(400).json({ error: 'Search query (q) is required' });
        return;
      }

      const filters: SearchFilters = {
        type: req.query.type as any,
        category: req.query.category as string,
        difficulty: req.query.difficulty as any,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
      };

      // Parse tags if provided
      if (req.query.tags) {
        filters.tags = Array.isArray(req.query.tags)
          ? (req.query.tags as string[])
          : [req.query.tags as string];
      }

      const result = await SearchController.searchService.searchContent(query, filters);

      res.json({
        success: true,
        data: result.content,
        query: result.query,
        pagination: {
          total: result.total,
          limit: filters.limit,
          offset: filters.offset,
        },
      });
    } catch (error: any) {
      console.error('Search failed:', error.message);
      next(error);
    }
  }

  /**
   * Search by specific language
   * GET /api/education/search/language/:language
   */
  static async searchByLanguage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const query = req.query.q as string;
      const { language } = req.params;

      if (!query || query.trim().length === 0) {
        res.status(400).json({ error: 'Search query (q) is required' });
        return;
      }

      if (!['ms', 'en', 'zh', 'ta'].includes(language)) {
        res.status(400).json({ error: 'Invalid language. Must be one of: ms, en, zh, ta' });
        return;
      }

      const filters: SearchFilters = {
        type: req.query.type as any,
        category: req.query.category as string,
        difficulty: req.query.difficulty as any,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
      };

      if (req.query.tags) {
        filters.tags = Array.isArray(req.query.tags)
          ? (req.query.tags as string[])
          : [req.query.tags as string];
      }

      const result = await SearchController.searchService.searchByLanguage(
        query,
        language as 'ms' | 'en' | 'zh' | 'ta',
        filters
      );

      res.json({
        success: true,
        data: result.content,
        query: result.query,
        language,
        pagination: {
          total: result.total,
          limit: filters.limit,
          offset: filters.offset,
        },
      });
    } catch (error: any) {
      console.error('Language search failed:', error.message);
      next(error);
    }
  }

  /**
   * Search by tags
   * GET /api/education/search/tags
   */
  static async searchByTags(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const tags = req.query.tags;

      if (!tags) {
        res.status(400).json({ error: 'tags parameter is required' });
        return;
      }

      const tagsArray = Array.isArray(tags) ? (tags as string[]) : [tags as string];

      if (tagsArray.length === 0) {
        res.status(400).json({ error: 'At least one tag is required' });
        return;
      }

      const filters: Omit<SearchFilters, 'tags'> = {
        type: req.query.type as any,
        category: req.query.category as string,
        difficulty: req.query.difficulty as any,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 20,
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
      };

      const result = await SearchController.searchService.searchByTags(tagsArray, filters);

      res.json({
        success: true,
        data: result.content,
        query: result.query,
        pagination: {
          total: result.total,
          limit: filters.limit,
          offset: filters.offset,
        },
      });
    } catch (error: any) {
      console.error('Tag search failed:', error.message);
      next(error);
    }
  }

  /**
   * Get popular content
   * GET /api/education/search/popular
   */
  static async getPopularContent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

      const filters: SearchFilters = {
        type: req.query.type as any,
        category: req.query.category as string,
      };

      const content = await SearchController.searchService.getPopularContent(limit, filters);

      res.json({
        success: true,
        data: content,
      });
    } catch (error: any) {
      console.error('Failed to get popular content:', error.message);
      next(error);
    }
  }

  /**
   * Get trending content
   * GET /api/education/search/trending
   */
  static async getTrendingContent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

      const filters: SearchFilters = {
        type: req.query.type as any,
        category: req.query.category as string,
      };

      const content = await SearchController.searchService.getTrendingContent(limit, filters);

      res.json({
        success: true,
        data: content,
      });
    } catch (error: any) {
      console.error('Failed to get trending content:', error.message);
      next(error);
    }
  }
}
