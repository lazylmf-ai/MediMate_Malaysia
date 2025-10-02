/**
 * Progress Tracking Service
 *
 * Business logic for tracking user viewing and completion of educational content,
 * including achievement unlocking and progress analytics.
 */

import { UserProgressModel } from '../../models/education/UserProgress.model';
import { AchievementModel } from '../../models/education/Achievement.model';
import { EducationContentModel } from '../../models/education/EducationContent.model';
import { UserProgress, TrackProgressDTO, Achievement } from '../../types/education/education.types';

export class ProgressTrackingService {
  private static instance: ProgressTrackingService;
  private progressModel: UserProgressModel;
  private achievementModel: AchievementModel;
  private contentModel: EducationContentModel;

  constructor() {
    this.progressModel = UserProgressModel.getInstance();
    this.achievementModel = AchievementModel.getInstance();
    this.contentModel = EducationContentModel.getInstance();
  }

  public static getInstance(): ProgressTrackingService {
    if (!ProgressTrackingService.instance) {
      ProgressTrackingService.instance = new ProgressTrackingService();
    }
    return ProgressTrackingService.instance;
  }

  /**
   * Track user viewing content
   */
  async trackView(userId: string, contentId: string, timeSpent: number = 0): Promise<UserProgress> {
    const progress = await this.progressModel.trackProgress({
      userId,
      contentId,
      viewed: true,
      timeSpent,
    });

    // Check for first view achievement
    await this.checkFirstContentAchievement(userId);

    return progress;
  }

  /**
   * Track user completing content
   */
  async trackCompletion(userId: string, contentId: string, timeSpent: number = 0): Promise<UserProgress> {
    const progress = await this.progressModel.trackProgress({
      userId,
      contentId,
      completed: true,
      timeSpent,
    });

    // Increment completion count on content
    await this.contentModel.incrementCompletionCount(contentId);

    // Check for achievements
    await this.checkCompletionAchievements(userId, contentId);

    return progress;
  }

  /**
   * Get user progress for specific content
   */
  async getUserProgress(userId: string, contentId: string): Promise<UserProgress | null> {
    return await this.progressModel.getUserProgress(userId, contentId);
  }

  /**
   * Get all progress for a user
   */
  async getUserProgressList(
    userId: string,
    completed?: boolean,
    limit: number = 20,
    offset: number = 0
  ): Promise<{ progress: UserProgress[]; total: number }> {
    return await this.progressModel.getUserProgressList(userId, {
      completed,
      limit,
      offset,
    });
  }

  /**
   * Get user completion statistics
   */
  async getUserStats(userId: string): Promise<{
    totalViewed: number;
    totalCompleted: number;
    completionRate: number;
    totalTimeSpent: number; // in seconds
  }> {
    const { progress: allProgress } = await this.progressModel.getUserProgressList(userId, undefined, 10000);
    const { progress: completedProgress } = await this.progressModel.getUserProgressList(userId, true, 10000);

    const totalViewed = allProgress.length;
    const totalCompleted = completedProgress.length;
    const completionRate = totalViewed > 0 ? (totalCompleted / totalViewed) * 100 : 0;
    const totalTimeSpent = allProgress.reduce((sum, p) => sum + p.timeSpent, 0);

    return {
      totalViewed,
      totalCompleted,
      completionRate,
      totalTimeSpent,
    };
  }

  /**
   * Get user achievements
   */
  async getUserAchievements(userId: string, limit: number = 50): Promise<Achievement[]> {
    const { achievements } = await this.achievementModel.getUserAchievements(userId, { limit });
    return achievements;
  }

  /**
   * Award achievement to user
   */
  async awardAchievement(userId: string, badgeId: string): Promise<Achievement> {
    return await this.achievementModel.awardAchievement(userId, badgeId);
  }

  /**
   * Check for first content achievement
   */
  private async checkFirstContentAchievement(userId: string): Promise<void> {
    const hasAchievement = await this.achievementModel.hasAchievement(userId, 'first_content');

    if (!hasAchievement) {
      await this.achievementModel.awardAchievement(userId, 'first_content');
    }
  }

  /**
   * Check for completion-based achievements
   */
  private async checkCompletionAchievements(userId: string, contentId: string): Promise<void> {
    const content = await this.contentModel.getContentById(contentId);

    if (!content) {
      return;
    }

    // Count completed content by type
    const { progress: completedProgress } = await this.progressModel.getUserProgressList(userId, true, 10000);

    // Get all completed content details
    const completedContentIds = completedProgress.map((p) => p.contentId);
    const completedContents = await Promise.all(
      completedContentIds.map((id) => this.contentModel.getContentById(id))
    );

    // Count by type
    const articleCount = completedContents.filter((c) => c?.type === 'article').length;
    const videoCount = completedContents.filter((c) => c?.type === 'video').length;

    // Award type-specific achievements
    if (articleCount >= 10) {
      await this.achievementModel.awardAchievement(userId, '10_articles');
    }

    if (videoCount >= 5) {
      await this.achievementModel.awardAchievement(userId, '5_videos');
    }

    // Check for medication expert (completed 3+ medication-related content)
    const medicationContent = completedContents.filter(
      (c) => c && c.relatedMedications && c.relatedMedications.length > 0
    );
    if (medicationContent.length >= 3) {
      await this.achievementModel.awardAchievement(userId, 'medication_expert');
    }

    // Check for condition expert (completed 3+ condition-related content)
    const conditionContent = completedContents.filter(
      (c) => c && c.relatedConditions && c.relatedConditions.length > 0
    );
    if (conditionContent.length >= 3) {
      await this.achievementModel.awardAchievement(userId, 'condition_expert');
    }
  }

  /**
   * Check for streak achievements
   */
  async checkStreakAchievements(userId: string): Promise<void> {
    // Get user progress sorted by completion date
    const { progress } = await this.progressModel.getUserProgressList(userId, true, 365);

    if (progress.length < 7) {
      return;
    }

    // Check for 7-day streak
    const completionDates = progress
      .filter((p) => p.completedAt)
      .map((p) => p.completedAt!)
      .sort((a, b) => b.getTime() - a.getTime());

    let streak = 1;
    for (let i = 0; i < completionDates.length - 1; i++) {
      const currentDate = new Date(completionDates[i]);
      const nextDate = new Date(completionDates[i + 1]);

      // Reset time to midnight for date comparison
      currentDate.setHours(0, 0, 0, 0);
      nextDate.setHours(0, 0, 0, 0);

      const dayDiff = (currentDate.getTime() - nextDate.getTime()) / (1000 * 60 * 60 * 24);

      if (dayDiff === 1) {
        streak++;
        if (streak >= 7) {
          await this.achievementModel.awardAchievement(userId, '7_day_streak');
          break;
        }
      } else if (dayDiff > 1) {
        streak = 1;
      }
    }
  }

  /**
   * Get content engagement analytics
   */
  async getContentAnalytics(
    contentId: string
  ): Promise<{
    totalViews: number;
    totalCompletions: number;
    completionRate: number;
    averageTimeSpent: number;
  }> {
    const { progress: allProgress } = await this.progressModel.getContentProgress(contentId, undefined, 10000);
    const { progress: completedProgress } = await this.progressModel.getContentProgress(contentId, true, 10000);

    const totalViews = allProgress.length;
    const totalCompletions = completedProgress.length;
    const completionRate = totalViews > 0 ? (totalCompletions / totalViews) * 100 : 0;
    const averageTimeSpent = totalViews > 0 ? allProgress.reduce((sum, p) => sum + p.timeSpent, 0) / totalViews : 0;

    return {
      totalViews,
      totalCompletions,
      completionRate,
      averageTimeSpent,
    };
  }
}
