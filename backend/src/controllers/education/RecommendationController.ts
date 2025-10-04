/**
 * Recommendation Controller
 * REST API endpoints for personalized content recommendations
 */

import { Request, Response, NextFunction } from 'express';
import { RecommendationService, UserContext } from '../../services/education/RecommendationService';
import { AdherenceInterventionService } from '../../services/education/AdherenceInterventionService';

export class RecommendationController {
  private static recommendationService = RecommendationService.getInstance();
  private static interventionService = AdherenceInterventionService.getInstance();

  /**
   * Generate personalized recommendations
   * POST /api/education/recommendations/generate
   */
  static async generateRecommendations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { medications, conditions, adherenceRate, language } = req.body;
      const limit = req.body.limit ? parseInt(req.body.limit) : 10;

      const context: UserContext = {
        userId,
        medications,
        conditions,
        adherenceRate,
        language,
      };

      const recommendations = await RecommendationController.recommendationService.generateRecommendations(
        context,
        limit
      );

      res.json({
        success: true,
        message: 'Recommendations generated successfully',
        data: recommendations,
      });
    } catch (error: any) {
      console.error('Failed to generate recommendations:', error.message);
      next(error);
    }
  }

  /**
   * Get cached recommendations
   * GET /api/education/recommendations
   */
  static async getCachedRecommendations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

      const recommendations = await RecommendationController.recommendationService.getCachedRecommendations(
        userId,
        limit
      );

      res.json({
        success: true,
        data: recommendations,
      });
    } catch (error: any) {
      console.error('Failed to get cached recommendations:', error.message);
      next(error);
    }
  }

  /**
   * Get content for specific medication
   * GET /api/education/recommendations/medication/:medicationId
   */
  static async getContentForMedication(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { medicationId } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;

      const content = await RecommendationController.recommendationService.getContentForMedication(
        medicationId,
        limit
      );

      res.json({
        success: true,
        data: content,
      });
    } catch (error: any) {
      console.error('Failed to get medication content:', error.message);
      next(error);
    }
  }

  /**
   * Get content for specific condition
   * GET /api/education/recommendations/condition/:conditionCode
   */
  static async getContentForCondition(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { conditionCode } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 5;

      const content = await RecommendationController.recommendationService.getContentForCondition(
        conditionCode,
        limit
      );

      res.json({
        success: true,
        data: content,
      });
    } catch (error: any) {
      console.error('Failed to get condition content:', error.message);
      next(error);
    }
  }

  /**
   * Get adherence intervention content
   * POST /api/education/recommendations/adherence-intervention
   */
  static async getAdherenceInterventionContent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { adherenceRate } = req.body;

      if (adherenceRate === undefined || adherenceRate === null) {
        res.status(400).json({ error: 'adherenceRate is required' });
        return;
      }

      const content = await RecommendationController.recommendationService.getAdherenceInterventionContent(
        userId,
        adherenceRate
      );

      res.json({
        success: true,
        data: content,
      });
    } catch (error: any) {
      console.error('Failed to get adherence intervention content:', error.message);
      next(error);
    }
  }

  /**
   * Get adherence intervention banner for Education Hub
   * GET /api/education/recommendations/adherence-intervention/banner
   */
  static async getAdherenceInterventionBanner(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const banner = await RecommendationController.interventionService.getInterventionBanner(userId);

      res.json({
        success: true,
        data: banner,
      });
    } catch (error: any) {
      console.error('Failed to get adherence intervention banner:', error.message);
      next(error);
    }
  }
}
