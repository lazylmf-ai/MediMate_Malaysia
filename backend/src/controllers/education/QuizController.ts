/**
 * Quiz Controller
 * REST API endpoints for quiz management and submissions
 */

import { Request, Response, NextFunction } from 'express';
import { QuizService } from '../../services/education/QuizService';
import { SubmitQuizDTO } from '../../types/education/education.types';

export class QuizController {
  private static quizService = QuizService.getInstance();

  /**
   * Submit quiz
   * POST /api/education/quiz/submit
   */
  static async submitQuiz(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { quizId, answers } = req.body;

      if (!quizId || !answers) {
        res.status(400).json({ error: 'quizId and answers are required' });
        return;
      }

      const submitData: SubmitQuizDTO = {
        userId,
        quizId,
        answers,
      };

      const result = await QuizController.quizService.submitQuiz(submitData);

      res.status(201).json({
        success: true,
        message: result.submission.passed ? 'Quiz passed!' : 'Quiz completed',
        data: {
          submission: result.submission,
          correctAnswers: result.correctAnswers,
          explanations: result.explanations,
        },
      });
    } catch (error: any) {
      console.error('Failed to submit quiz:', error.message);
      next(error);
    }
  }

  /**
   * Get quiz submission by ID
   * GET /api/education/quiz/submission/:id
   */
  static async getSubmissionById(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { id } = req.params;

      const submission = await QuizController.quizService.getSubmissionById(id);

      if (!submission) {
        res.status(404).json({ error: 'Submission not found' });
        return;
      }

      // Verify user owns this submission
      if (submission.userId !== userId) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      res.json({
        success: true,
        data: submission,
      });
    } catch (error: any) {
      console.error('Failed to get submission:', error.message);
      next(error);
    }
  }

  /**
   * Get user submissions for a quiz
   * GET /api/education/quiz/:quizId/submissions
   */
  static async getUserQuizSubmissions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { quizId } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 10;

      const submissions = await QuizController.quizService.getUserQuizSubmissions(
        userId,
        quizId,
        limit
      );

      res.json({
        success: true,
        data: submissions,
      });
    } catch (error: any) {
      console.error('Failed to get quiz submissions:', error.message);
      next(error);
    }
  }

  /**
   * Get all quiz submissions for user
   * GET /api/education/quiz/submissions
   */
  static async getAllUserSubmissions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;

      const submissions = await QuizController.quizService.getAllUserSubmissions(userId, limit);

      res.json({
        success: true,
        data: submissions,
      });
    } catch (error: any) {
      console.error('Failed to get all user submissions:', error.message);
      next(error);
    }
  }

  /**
   * Get best score for user on a quiz
   * GET /api/education/quiz/:quizId/best-score
   */
  static async getBestScore(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { quizId } = req.params;

      const bestScore = await QuizController.quizService.getBestScore(userId, quizId);

      res.json({
        success: true,
        data: { bestScore },
      });
    } catch (error: any) {
      console.error('Failed to get best score:', error.message);
      next(error);
    }
  }

  /**
   * Check if user passed quiz
   * GET /api/education/quiz/:quizId/passed
   */
  static async hasUserPassedQuiz(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { quizId } = req.params;

      const passed = await QuizController.quizService.hasUserPassedQuiz(userId, quizId);

      res.json({
        success: true,
        data: { passed },
      });
    } catch (error: any) {
      console.error('Failed to check if user passed quiz:', error.message);
      next(error);
    }
  }

  /**
   * Get user quiz statistics
   * GET /api/education/quiz/stats
   */
  static async getUserQuizStats(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const stats = await QuizController.quizService.getUserQuizStats(userId);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      console.error('Failed to get user quiz stats:', error.message);
      next(error);
    }
  }

  /**
   * Get quiz analytics (admin only)
   * GET /api/education/quiz/:quizId/analytics
   */
  static async getQuizAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
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

      const { quizId } = req.params;

      const analytics = await QuizController.quizService.getQuizAnalytics(quizId);

      res.json({
        success: true,
        data: analytics,
      });
    } catch (error: any) {
      console.error('Failed to get quiz analytics:', error.message);
      next(error);
    }
  }
}
