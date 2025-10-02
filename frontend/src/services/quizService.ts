/**
 * Quiz Service
 *
 * Service layer for quiz operations including submission, scoring, and history.
 * Uses educationService for API calls and provides quiz-specific business logic.
 */

import { educationService } from './educationService';
import type {
  Quiz,
  QuizSubmission,
  QuizResult,
  QuizStats,
  EducationContent,
  ApiResponse,
} from '@/types/education';

class QuizService {
  /**
   * Submit quiz answers for scoring
   */
  async submitQuiz(
    quizId: string,
    answers: Record<string, any>
  ): Promise<ApiResponse<QuizResult>> {
    try {
      return await educationService.submitQuiz(quizId, answers);
    } catch (error) {
      console.error('Error submitting quiz:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to submit quiz',
      };
    }
  }

  /**
   * Get quiz data by ID
   * Quiz content is embedded in EducationContent with type='quiz'
   */
  async getQuizById(quizId: string): Promise<ApiResponse<Quiz>> {
    try {
      // Get the education content that contains this quiz
      const contentResponse = await educationService.getContentById(quizId);

      if (!contentResponse.success || !contentResponse.data) {
        return {
          success: false,
          error: contentResponse.error || 'Quiz not found',
        };
      }

      const content = contentResponse.data;

      // Verify it's a quiz type
      if (content.type !== 'quiz') {
        return {
          success: false,
          error: 'Content is not a quiz',
        };
      }

      // Parse the quiz data from content
      // Assuming the quiz structure is stored in content.content field as JSON
      try {
        const quizData = this.parseQuizFromContent(content);
        return {
          success: true,
          data: quizData,
        };
      } catch (parseError) {
        return {
          success: false,
          error: 'Failed to parse quiz data',
        };
      }
    } catch (error) {
      console.error('Error getting quiz:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get quiz',
      };
    }
  }

  /**
   * Parse Quiz object from EducationContent
   * This assumes the quiz questions are stored in the content field
   */
  private parseQuizFromContent(content: EducationContent): Quiz {
    // The quiz structure is expected to be in the content field
    // For now, we'll create a basic structure - this should be updated based on actual backend format
    const quiz: Quiz = {
      id: content.id,
      contentId: content.id,
      questions: [],
      passingScore: 70, // Default passing score
    };

    // If content has a structured quiz format, parse it
    // This is a placeholder - adjust based on actual backend structure
    try {
      if (typeof content.content === 'object') {
        // @ts-ignore - content might have quiz-specific fields
        if (content.content.questions) {
          // @ts-ignore
          quiz.questions = content.content.questions;
        }
        // @ts-ignore
        if (content.content.passingScore !== undefined) {
          // @ts-ignore
          quiz.passingScore = content.content.passingScore;
        }
        // @ts-ignore
        if (content.content.timeLimit !== undefined) {
          // @ts-ignore
          quiz.timeLimit = content.content.timeLimit;
        }
      }
    } catch (error) {
      console.error('Error parsing quiz content:', error);
    }

    return quiz;
  }

  /**
   * Get user's quiz submission history
   */
  async getUserQuizSubmissions(quizId: string, limit = 10): Promise<ApiResponse<QuizSubmission[]>> {
    try {
      return await educationService.getUserQuizSubmissions(quizId, limit);
    } catch (error) {
      console.error('Error getting quiz submissions:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get quiz submissions',
      };
    }
  }

  /**
   * Get user's best score for a specific quiz
   */
  async getBestScore(quizId: string): Promise<ApiResponse<{ bestScore: number }>> {
    try {
      return await educationService.getBestScore(quizId);
    } catch (error) {
      console.error('Error getting best score:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get best score',
      };
    }
  }

  /**
   * Check if user has passed a quiz
   */
  async hasUserPassedQuiz(quizId: string): Promise<ApiResponse<{ passed: boolean }>> {
    try {
      return await educationService.hasUserPassedQuiz(quizId);
    } catch (error) {
      console.error('Error checking quiz pass status:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to check quiz status',
      };
    }
  }

  /**
   * Get user's overall quiz statistics
   */
  async getUserQuizStats(): Promise<ApiResponse<QuizStats>> {
    try {
      return await educationService.getUserQuizStats();
    } catch (error) {
      console.error('Error getting quiz stats:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get quiz stats',
      };
    }
  }

  /**
   * Reset quiz state for retry
   * This doesn't delete previous submissions, just allows a new attempt
   */
  async retryQuiz(quizId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Verify quiz exists
      const quizResponse = await this.getQuizById(quizId);
      if (!quizResponse.success) {
        return {
          success: false,
          error: quizResponse.error,
        };
      }

      // Quiz state is managed client-side
      // Previous submissions are preserved in the backend
      return {
        success: true,
      };
    } catch (error) {
      console.error('Error retrying quiz:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retry quiz',
      };
    }
  }

  /**
   * Calculate quiz score locally (for immediate feedback before API response)
   */
  calculateScore(quiz: Quiz, answers: Record<string, any>): number {
    if (!quiz.questions || quiz.questions.length === 0) {
      return 0;
    }

    let totalPoints = 0;
    let earnedPoints = 0;

    quiz.questions.forEach((question) => {
      totalPoints += question.points;
      const userAnswer = answers[question.id];
      const correctOption = question.options.find((opt) => opt.isCorrect);

      if (correctOption && userAnswer === correctOption.id) {
        earnedPoints += question.points;
      }
    });

    return totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
  }

  /**
   * Get correct answers for a quiz
   */
  getCorrectAnswers(quiz: Quiz): Record<string, string> {
    const correctAnswers: Record<string, string> = {};

    quiz.questions.forEach((question) => {
      const correctOption = question.options.find((opt) => opt.isCorrect);
      if (correctOption) {
        correctAnswers[question.id] = correctOption.id;
      }
    });

    return correctAnswers;
  }

  /**
   * Validate quiz answers (check if all questions are answered)
   */
  validateAnswers(quiz: Quiz, answers: Record<string, any>): { valid: boolean; missingQuestions: string[] } {
    const missingQuestions: string[] = [];

    quiz.questions.forEach((question) => {
      if (!answers[question.id]) {
        missingQuestions.push(question.id);
      }
    });

    return {
      valid: missingQuestions.length === 0,
      missingQuestions,
    };
  }

  /**
   * Get quiz submission by ID
   */
  async getQuizSubmission(submissionId: string): Promise<ApiResponse<QuizSubmission>> {
    try {
      return await educationService.getQuizSubmission(submissionId);
    } catch (error) {
      console.error('Error getting quiz submission:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get quiz submission',
      };
    }
  }

  /**
   * Get all quiz submissions for the current user
   */
  async getAllUserQuizSubmissions(limit = 20): Promise<ApiResponse<QuizSubmission[]>> {
    try {
      return await educationService.getAllUserQuizSubmissions(limit);
    } catch (error) {
      console.error('Error getting all quiz submissions:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get quiz submissions',
      };
    }
  }
}

export const quizService = new QuizService();
