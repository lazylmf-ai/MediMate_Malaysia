/**
 * Quiz Service
 *
 * Business logic for quiz management, submission, scoring, and achievement unlocking.
 */

import { QuizSubmissionModel } from '../../models/education/QuizSubmission.model';
import { EducationContentModel } from '../../models/education/EducationContent.model';
import { AchievementModel } from '../../models/education/Achievement.model';
import { SubmitQuizDTO, QuizSubmission, QuizResult, EducationContent } from '../../types/education/education.types';

export interface QuizQuestion {
  id: string;
  question: string;
  type: 'multiple_choice' | 'true_false' | 'multi_select';
  options?: string[];
  correctAnswer: string | string[];
  explanation?: string;
  points?: number;
}

export interface QuizData {
  questions: QuizQuestion[];
  passingScore: number; // Percentage (e.g., 70 for 70%)
  timeLimit?: number; // In minutes
}

export class QuizService {
  private static instance: QuizService;
  private submissionModel: QuizSubmissionModel;
  private contentModel: EducationContentModel;
  private achievementModel: AchievementModel;

  constructor() {
    this.submissionModel = QuizSubmissionModel.getInstance();
    this.contentModel = EducationContentModel.getInstance();
    this.achievementModel = AchievementModel.getInstance();
  }

  public static getInstance(): QuizService {
    if (!QuizService.instance) {
      QuizService.instance = new QuizService();
    }
    return QuizService.instance;
  }

  /**
   * Submit quiz and calculate score
   */
  async submitQuiz(data: SubmitQuizDTO): Promise<QuizResult> {
    // Get quiz content
    const quizContent = await this.contentModel.getContentById(data.quizId);

    if (!quizContent || quizContent.type !== 'quiz') {
      throw new Error('Quiz not found or invalid content type');
    }

    // Extract quiz data from content
    const quizData = this.extractQuizData(quizContent);

    // Calculate score
    const { score, correctAnswers, explanations } = this.calculateScore(data.answers, quizData);

    // Determine if passed
    const passed = score >= quizData.passingScore;

    // Create submission record
    const submission = await this.submissionModel.createSubmission(data, score, passed);

    // Check for achievements
    if (passed) {
      await this.checkQuizAchievements(data.userId, score);
    }

    return {
      submission,
      correctAnswers,
      explanations,
    };
  }

  /**
   * Get quiz submission by ID
   */
  async getSubmissionById(id: string): Promise<QuizSubmission | null> {
    return await this.submissionModel.getSubmissionById(id);
  }

  /**
   * Get user submissions for a quiz
   */
  async getUserQuizSubmissions(
    userId: string,
    quizId: string,
    limit: number = 10
  ): Promise<QuizSubmission[]> {
    const { submissions } = await this.submissionModel.getUserQuizSubmissions(userId, quizId, { limit });
    return submissions;
  }

  /**
   * Get all quiz submissions for a user
   */
  async getAllUserSubmissions(userId: string, limit: number = 20): Promise<QuizSubmission[]> {
    const { submissions } = await this.submissionModel.getAllUserSubmissions(userId, { limit });
    return submissions;
  }

  /**
   * Get best score for user on a quiz
   */
  async getBestScore(userId: string, quizId: string): Promise<number | null> {
    return await this.submissionModel.getBestScore(userId, quizId);
  }

  /**
   * Check if user has passed quiz
   */
  async hasUserPassedQuiz(userId: string, quizId: string): Promise<boolean> {
    return await this.submissionModel.hasUserPassedQuiz(userId, quizId);
  }

  /**
   * Get user quiz statistics
   */
  async getUserQuizStats(userId: string): Promise<{
    totalAttempts: number;
    totalPassed: number;
    passRate: number;
    averageScore: number;
  }> {
    const { submissions: allSubmissions } = await this.submissionModel.getAllUserSubmissions(userId, { limit: 10000 });
    const { submissions: passedSubmissions } = await this.submissionModel.getAllUserSubmissions(userId, {
      passed: true,
      limit: 10000,
    });

    const totalAttempts = allSubmissions.length;
    const totalPassed = passedSubmissions.length;
    const passRate = totalAttempts > 0 ? (totalPassed / totalAttempts) * 100 : 0;
    const averageScore =
      totalAttempts > 0 ? allSubmissions.reduce((sum, s) => sum + s.score, 0) / totalAttempts : 0;

    return {
      totalAttempts,
      totalPassed,
      passRate,
      averageScore,
    };
  }

  /**
   * Get quiz analytics
   */
  async getQuizAnalytics(quizId: string): Promise<{
    totalAttempts: number;
    totalPassed: number;
    passRate: number;
    averageScore: number;
  }> {
    const { submissions: allSubmissions } = await this.submissionModel.getQuizSubmissions(quizId, { limit: 10000 });
    const { submissions: passedSubmissions } = await this.submissionModel.getQuizSubmissions(quizId, {
      passed: true,
      limit: 10000,
    });

    const totalAttempts = allSubmissions.length;
    const totalPassed = passedSubmissions.length;
    const passRate = totalAttempts > 0 ? (totalPassed / totalAttempts) * 100 : 0;
    const averageScore =
      totalAttempts > 0 ? allSubmissions.reduce((sum, s) => sum + s.score, 0) / totalAttempts : 0;

    return {
      totalAttempts,
      totalPassed,
      passRate,
      averageScore,
    };
  }

  /**
   * Extract quiz data from content
   */
  private extractQuizData(content: EducationContent): QuizData {
    // In a real implementation, the quiz data would be stored in the content JSONB field
    // For now, we'll parse it from the content field (assuming it's stored in 'en' language)
    const contentData = content.content.en;

    try {
      const quizData = JSON.parse(contentData) as QuizData;

      if (!quizData.questions || quizData.questions.length === 0) {
        throw new Error('Quiz has no questions');
      }

      if (!quizData.passingScore) {
        quizData.passingScore = 70; // Default passing score
      }

      return quizData;
    } catch (error: any) {
      throw new Error(`Invalid quiz data format: ${error.message}`);
    }
  }

  /**
   * Calculate quiz score
   */
  private calculateScore(
    userAnswers: Record<string, any>,
    quizData: QuizData
  ): {
    score: number;
    correctAnswers: Record<string, any>;
    explanations: Record<string, string>;
  } {
    let correctCount = 0;
    const correctAnswers: Record<string, any> = {};
    const explanations: Record<string, string> = {};
    const totalPoints = quizData.questions.reduce((sum, q) => sum + (q.points || 1), 0);
    let earnedPoints = 0;

    for (const question of quizData.questions) {
      const userAnswer = userAnswers[question.id];
      const correctAnswer = question.correctAnswer;

      correctAnswers[question.id] = correctAnswer;

      if (question.explanation) {
        explanations[question.id] = question.explanation;
      }

      // Check answer correctness
      const isCorrect = this.checkAnswer(userAnswer, correctAnswer, question.type);

      if (isCorrect) {
        correctCount++;
        earnedPoints += question.points || 1;
      }
    }

    // Calculate percentage score
    const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;

    return {
      score,
      correctAnswers,
      explanations,
    };
  }

  /**
   * Check if user answer is correct
   */
  private checkAnswer(userAnswer: any, correctAnswer: string | string[], questionType: string): boolean {
    if (questionType === 'multi_select' && Array.isArray(correctAnswer)) {
      if (!Array.isArray(userAnswer)) {
        return false;
      }

      // Check if arrays have same elements (order doesn't matter)
      const sortedUser = [...userAnswer].sort();
      const sortedCorrect = [...correctAnswer].sort();

      return (
        sortedUser.length === sortedCorrect.length &&
        sortedUser.every((val, idx) => val === sortedCorrect[idx])
      );
    }

    // For single answer questions
    return userAnswer === correctAnswer;
  }

  /**
   * Check for quiz-related achievements
   */
  private async checkQuizAchievements(userId: string, score: number): Promise<void> {
    // Check for perfect score achievement
    if (score === 100) {
      await this.achievementModel.awardAchievement(userId, 'perfect_score');
    }

    // Check for quiz master achievement (passed 5+ quizzes)
    const { submissions: passedQuizzes } = await this.submissionModel.getAllUserSubmissions(userId, {
      passed: true,
      limit: 10000,
    });

    if (passedQuizzes.length >= 5) {
      await this.achievementModel.awardAchievement(userId, 'quiz_master');
    }
  }
}
