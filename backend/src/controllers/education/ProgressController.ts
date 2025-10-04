/**
 * Progress Controller
 * REST API endpoints for user progress tracking and achievements
 */

import { Request, Response, NextFunction } from 'express';
import { ProgressTrackingService } from '../../services/education/ProgressTrackingService';

export class ProgressController {
  private static progressService = ProgressTrackingService.getInstance();

  /**
   * Track content view
   * POST /api/education/progress/view
   */
  static async trackView(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { contentId, timeSpent } = req.body;

      if (!contentId) {
        res.status(400).json({ error: 'contentId is required' });
        return;
      }

      const progress = await ProgressController.progressService.trackView(
        userId,
        contentId,
        timeSpent || 0
      );

      res.status(201).json({
        success: true,
        message: 'View tracked successfully',
        data: progress,
      });
    } catch (error: any) {
      console.error('Failed to track view:', error.message);
      next(error);
    }
  }

  /**
   * Track content completion
   * POST /api/education/progress/complete
   */
  static async trackCompletion(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { contentId, timeSpent } = req.body;

      if (!contentId) {
        res.status(400).json({ error: 'contentId is required' });
        return;
      }

      const progress = await ProgressController.progressService.trackCompletion(
        userId,
        contentId,
        timeSpent || 0
      );

      res.status(201).json({
        success: true,
        message: 'Completion tracked successfully',
        data: progress,
      });
    } catch (error: any) {
      console.error('Failed to track completion:', error.message);
      next(error);
    }
  }

  /**
   * Get user progress for specific content
   * GET /api/education/progress/:contentId
   */
  static async getUserProgress(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { contentId } = req.params;

      const progress = await ProgressController.progressService.getUserProgress(userId, contentId);

      if (!progress) {
        res.status(404).json({ error: 'Progress not found' });
        return;
      }

      res.json({
        success: true,
        data: progress,
      });
    } catch (error: any) {
      console.error('Failed to get user progress:', error.message);
      next(error);
    }
  }

  /**
   * Get all user progress
   * GET /api/education/progress
   */
  static async getUserProgressList(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const completed = req.query.completed === 'true' ? true : req.query.completed === 'false' ? false : undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

      const result = await ProgressController.progressService.getUserProgressList(
        userId,
        completed,
        limit,
        offset
      );

      res.json({
        success: true,
        data: result.progress,
        pagination: {
          total: result.total,
          limit,
          offset,
        },
      });
    } catch (error: any) {
      console.error('Failed to get user progress list:', error.message);
      next(error);
    }
  }

  /**
   * Get user statistics
   * GET /api/education/progress/stats
   */
  static async getUserStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const stats = await ProgressController.progressService.getUserStats(userId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      console.error('Failed to get user stats:', error.message);
      next(error);
    }
  }

  /**
   * Get user achievements
   * GET /api/education/achievements
   */
  static async getUserAchievements(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;

      const achievements = await ProgressController.progressService.getUserAchievements(userId, limit);

      res.json({
        success: true,
        data: achievements,
      });
    } catch (error: any) {
      console.error('Failed to get user achievements:', error.message);
      next(error);
    }
  }

  /**
   * Award achievement to user (admin only)
   * POST /api/education/achievements
   */
  static async awardAchievement(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.user?.id;
      if (!adminId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      // TODO: Add admin role check
      // if (!req.user?.isAdmin) {
      //   res.status(403).json({ error: 'Admin access required' });
      //   return;
      // }

      const { userId, badgeId } = req.body;

      if (!userId || !badgeId) {
        res.status(400).json({ error: 'userId and badgeId are required' });
        return;
      }

      const achievement = await ProgressController.progressService.awardAchievement(userId, badgeId);

      res.status(201).json({
        success: true,
        message: 'Achievement awarded successfully',
        data: achievement,
      });
    } catch (error: any) {
      console.error('Failed to award achievement:', error.message);
      next(error);
    }
  }

  /**
   * Check and award streak achievements
   * POST /api/education/achievements/check-streaks
   */
  static async checkStreakAchievements(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      await ProgressController.progressService.checkStreakAchievements(userId);

      res.json({
        success: true,
        message: 'Streak achievements checked successfully',
      });
    } catch (error: any) {
      console.error('Failed to check streak achievements:', error.message);
      next(error);
    }
  }

  /**
   * Get content analytics (admin only)
   * GET /api/education/analytics/content/:contentId
   */
  static async getContentAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const adminId = req.user?.id;
      if (!adminId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      // TODO: Add admin role check

      const { contentId } = req.params;

      const analytics = await ProgressController.progressService.getContentAnalytics(contentId);

      res.json({
        success: true,
        data: analytics,
      });
    } catch (error: any) {
      console.error('Failed to get content analytics:', error.message);
      next(error);
    }
  }
}
