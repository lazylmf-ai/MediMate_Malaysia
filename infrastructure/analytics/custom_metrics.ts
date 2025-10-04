/**
 * Custom Metrics Definitions for MediMate Education Hub
 *
 * This module defines custom CloudWatch metrics for tracking
 * Education Hub specific KPIs and business metrics.
 */

import { CloudWatch } from 'aws-sdk';

// CloudWatch client configuration
const cloudwatch = new CloudWatch({
  region: process.env.AWS_REGION || 'ap-southeast-1',
  apiVersion: '2010-08-01'
});

const NAMESPACE = 'MediMate/EducationHub';

// Metric dimensions for segmentation
export interface MetricDimensions {
  Environment?: string;
  Language?: 'ms' | 'en' | 'zh' | 'ta';
  ContentType?: 'article' | 'video' | 'infographic' | 'interactive';
  ContentCategory?: string;
  DeviceType?: 'mobile' | 'tablet' | 'desktop';
  UserType?: 'patient' | 'caregiver';
}

// Metric units enum
export enum MetricUnit {
  None = 'None',
  Seconds = 'Seconds',
  Milliseconds = 'Milliseconds',
  Bytes = 'Bytes',
  Kilobytes = 'Kilobytes',
  Megabytes = 'Megabytes',
  Count = 'Count',
  Percent = 'Percent'
}

/**
 * Base class for custom metrics
 */
export class CustomMetric {
  protected namespace: string = NAMESPACE;
  protected cloudwatch: CloudWatch;

  constructor() {
    this.cloudwatch = cloudwatch;
  }

  /**
   * Convert dimensions object to CloudWatch format
   */
  protected formatDimensions(dimensions: MetricDimensions): CloudWatch.Dimension[] {
    return Object.entries(dimensions)
      .filter(([_, value]) => value !== undefined)
      .map(([key, value]) => ({
        Name: key,
        Value: value as string
      }));
  }

  /**
   * Publish metric to CloudWatch
   */
  protected async publishMetric(
    metricName: string,
    value: number,
    unit: MetricUnit,
    dimensions: MetricDimensions = {}
  ): Promise<void> {
    const params: CloudWatch.PutMetricDataInput = {
      Namespace: this.namespace,
      MetricData: [
        {
          MetricName: metricName,
          Value: value,
          Unit: unit,
          Timestamp: new Date(),
          Dimensions: this.formatDimensions(dimensions)
        }
      ]
    };

    try {
      await this.cloudwatch.putMetricData(params).promise();
    } catch (error) {
      console.error('Failed to publish metric:', error);
      // Don't throw - metrics failures shouldn't break the application
    }
  }

  /**
   * Publish multiple metrics in a batch
   */
  protected async publishMetricBatch(
    metrics: Array<{
      name: string;
      value: number;
      unit: MetricUnit;
      dimensions?: MetricDimensions;
    }>
  ): Promise<void> {
    const params: CloudWatch.PutMetricDataInput = {
      Namespace: this.namespace,
      MetricData: metrics.map(metric => ({
        MetricName: metric.name,
        Value: metric.value,
        Unit: metric.unit,
        Timestamp: new Date(),
        Dimensions: this.formatDimensions(metric.dimensions || {})
      }))
    };

    try {
      await this.cloudwatch.putMetricData(params).promise();
    } catch (error) {
      console.error('Failed to publish metric batch:', error);
    }
  }
}

/**
 * User Engagement Metrics
 */
export class UserEngagementMetrics extends CustomMetric {
  async trackDailyActiveUser(userId: string, dimensions: MetricDimensions = {}): Promise<void> {
    await this.publishMetric('DailyActiveUsers', 1, MetricUnit.Count, dimensions);
  }

  async trackWeeklyActiveUser(userId: string, dimensions: MetricDimensions = {}): Promise<void> {
    await this.publishMetric('WeeklyActiveUsers', 1, MetricUnit.Count, dimensions);
  }

  async trackMonthlyActiveUser(userId: string, dimensions: MetricDimensions = {}): Promise<void> {
    await this.publishMetric('MonthlyActiveUsers', 1, MetricUnit.Count, dimensions);
  }

  async trackSessionDuration(durationSeconds: number, dimensions: MetricDimensions = {}): Promise<void> {
    await this.publishMetric('SessionDuration', durationSeconds, MetricUnit.Seconds, dimensions);
  }

  async trackContentViewsPerSession(viewCount: number, dimensions: MetricDimensions = {}): Promise<void> {
    await this.publishMetric('ContentViewsPerSession', viewCount, MetricUnit.Count, dimensions);
  }

  async trackReturnUser(dimensions: MetricDimensions = {}): Promise<void> {
    await this.publishMetric('ReturnUsers', 1, MetricUnit.Count, dimensions);
  }
}

/**
 * Content Performance Metrics
 */
export class ContentPerformanceMetrics extends CustomMetric {
  async trackContentView(contentId: string, dimensions: MetricDimensions = {}): Promise<void> {
    await this.publishMetric('ContentViews', 1, MetricUnit.Count, dimensions);
  }

  async trackContentCompletion(contentId: string, dimensions: MetricDimensions = {}): Promise<void> {
    await this.publishMetric('ContentCompletions', 1, MetricUnit.Count, dimensions);
  }

  async trackReadTime(timeSeconds: number, dimensions: MetricDimensions = {}): Promise<void> {
    await this.publishMetric('ReadTime', timeSeconds, MetricUnit.Seconds, dimensions);
  }

  async trackScrollDepth(depthPercent: number, dimensions: MetricDimensions = {}): Promise<void> {
    await this.publishMetric('ScrollDepth', depthPercent, MetricUnit.Percent, dimensions);
  }

  async trackContentRating(rating: number, dimensions: MetricDimensions = {}): Promise<void> {
    await this.publishMetric('ContentRating', rating, MetricUnit.Count, dimensions);
  }

  async trackContentShare(dimensions: MetricDimensions = {}): Promise<void> {
    await this.publishMetric('ContentShares', 1, MetricUnit.Count, dimensions);
  }
}

/**
 * Learning Activity Metrics
 */
export class LearningActivityMetrics extends CustomMetric {
  async trackQuizAttempt(quizId: string, dimensions: MetricDimensions = {}): Promise<void> {
    await this.publishMetric('QuizAttempts', 1, MetricUnit.Count, dimensions);
  }

  async trackQuizCompletion(quizId: string, dimensions: MetricDimensions = {}): Promise<void> {
    await this.publishMetric('QuizCompletions', 1, MetricUnit.Count, dimensions);
  }

  async trackQuizScore(score: number, dimensions: MetricDimensions = {}): Promise<void> {
    await this.publishMetric('QuizScore', score, MetricUnit.Percent, dimensions);
  }

  async trackQuizPass(dimensions: MetricDimensions = {}): Promise<void> {
    await this.publishMetric('QuizPasses', 1, MetricUnit.Count, dimensions);
  }

  async trackQuizDuration(durationSeconds: number, dimensions: MetricDimensions = {}): Promise<void> {
    await this.publishMetric('QuizDuration', durationSeconds, MetricUnit.Seconds, dimensions);
  }

  async trackAchievementUnlocked(achievementId: string, dimensions: MetricDimensions = {}): Promise<void> {
    await this.publishMetric('AchievementsUnlocked', 1, MetricUnit.Count, dimensions);
  }

  async trackStreak(streakDays: number, dimensions: MetricDimensions = {}): Promise<void> {
    await this.publishMetric('StreakDays', streakDays, MetricUnit.Count, dimensions);
  }
}

/**
 * Video Performance Metrics
 */
export class VideoPerformanceMetrics extends CustomMetric {
  async trackVideoStart(videoId: string, dimensions: MetricDimensions = {}): Promise<void> {
    await this.publishMetric('VideoPlaybackStarts', 1, MetricUnit.Count, dimensions);
  }

  async trackVideoCompletion(videoId: string, dimensions: MetricDimensions = {}): Promise<void> {
    await this.publishMetric('VideoPlaybackCompletions', 1, MetricUnit.Count, dimensions);
  }

  async trackVideoError(videoId: string, dimensions: MetricDimensions = {}): Promise<void> {
    await this.publishMetric('VideoPlaybackErrors', 1, MetricUnit.Count, dimensions);
  }

  async trackVideoBuffering(bufferingCount: number, dimensions: MetricDimensions = {}): Promise<void> {
    await this.publishMetric('VideoBufferingEvents', bufferingCount, MetricUnit.Count, dimensions);
  }

  async trackVideoWatchTime(watchTimeSeconds: number, dimensions: MetricDimensions = {}): Promise<void> {
    await this.publishMetric('VideoWatchTime', watchTimeSeconds, MetricUnit.Seconds, dimensions);
  }

  async trackVideoCompletionRate(completionPercent: number, dimensions: MetricDimensions = {}): Promise<void> {
    await this.publishMetric('VideoCompletionRate', completionPercent, MetricUnit.Percent, dimensions);
  }
}

/**
 * Search Performance Metrics
 */
export class SearchPerformanceMetrics extends CustomMetric {
  async trackSearchQuery(dimensions: MetricDimensions = {}): Promise<void> {
    await this.publishMetric('SearchQueries', 1, MetricUnit.Count, dimensions);
  }

  async trackSearchDuration(durationMs: number, dimensions: MetricDimensions = {}): Promise<void> {
    await this.publishMetric('SearchDuration', durationMs, MetricUnit.Milliseconds, dimensions);
  }

  async trackSearchResults(resultCount: number, dimensions: MetricDimensions = {}): Promise<void> {
    await this.publishMetric('SearchResultsReturned', resultCount, MetricUnit.Count, dimensions);
  }

  async trackSearchClickThrough(dimensions: MetricDimensions = {}): Promise<void> {
    await this.publishMetric('SearchClickThroughs', 1, MetricUnit.Count, dimensions);
  }

  async trackZeroResults(dimensions: MetricDimensions = {}): Promise<void> {
    await this.publishMetric('SearchZeroResults', 1, MetricUnit.Count, dimensions);
  }
}

/**
 * Recommendation Engine Metrics
 */
export class RecommendationMetrics extends CustomMetric {
  async trackRecommendationRequest(dimensions: MetricDimensions = {}): Promise<void> {
    await this.publishMetric('RecommendationRequests', 1, MetricUnit.Count, dimensions);
  }

  async trackRecommendationDuration(durationMs: number, dimensions: MetricDimensions = {}): Promise<void> {
    await this.publishMetric('RecommendationDuration', durationMs, MetricUnit.Milliseconds, dimensions);
  }

  async trackRecommendationClick(position: number, dimensions: MetricDimensions = {}): Promise<void> {
    await this.publishMetricBatch([
      { name: 'RecommendationClicks', value: 1, unit: MetricUnit.Count, dimensions },
      { name: 'RecommendationClickPosition', value: position, unit: MetricUnit.Count, dimensions }
    ]);
  }

  async trackRecommendationRelevance(score: number, dimensions: MetricDimensions = {}): Promise<void> {
    await this.publishMetric('RecommendationRelevanceScore', score, MetricUnit.Count, dimensions);
  }
}

/**
 * Offline Usage Metrics
 */
export class OfflineUsageMetrics extends CustomMetric {
  async trackOfflineDownload(dimensions: MetricDimensions = {}): Promise<void> {
    await this.publishMetric('OfflineDownloads', 1, MetricUnit.Count, dimensions);
  }

  async trackOfflineDownloadSize(sizeBytes: number, dimensions: MetricDimensions = {}): Promise<void> {
    await this.publishMetric('OfflineDownloadSize', sizeBytes, MetricUnit.Bytes, dimensions);
  }

  async trackOfflineDownloadDuration(durationSeconds: number, dimensions: MetricDimensions = {}): Promise<void> {
    await this.publishMetric('OfflineDownloadDuration', durationSeconds, MetricUnit.Seconds, dimensions);
  }

  async trackOfflinePlayback(dimensions: MetricDimensions = {}): Promise<void> {
    await this.publishMetric('OfflinePlaybacks', 1, MetricUnit.Count, dimensions);
  }

  async trackSyncOperation(dimensions: MetricDimensions = {}): Promise<void> {
    await this.publishMetric('SyncOperations', 1, MetricUnit.Count, dimensions);
  }

  async trackSyncConflict(dimensions: MetricDimensions = {}): Promise<void> {
    await this.publishMetric('SyncConflicts', 1, MetricUnit.Count, dimensions);
  }

  async trackSyncDuration(durationSeconds: number, dimensions: MetricDimensions = {}): Promise<void> {
    await this.publishMetric('SyncDuration', durationSeconds, MetricUnit.Seconds, dimensions);
  }
}

/**
 * API Performance Metrics
 */
export class APIPerformanceMetrics extends CustomMetric {
  async trackAPICall(endpoint: string, durationMs: number, dimensions: MetricDimensions = {}): Promise<void> {
    const endpointDimensions = { ...dimensions, Endpoint: endpoint };
    await this.publishMetric('APICallDuration', durationMs, MetricUnit.Milliseconds, endpointDimensions);
  }

  async trackContentListDuration(durationMs: number, dimensions: MetricDimensions = {}): Promise<void> {
    await this.publishMetric('ContentListDuration', durationMs, MetricUnit.Milliseconds, dimensions);
  }

  async trackContentDetailDuration(durationMs: number, dimensions: MetricDimensions = {}): Promise<void> {
    await this.publishMetric('ContentDetailDuration', durationMs, MetricUnit.Milliseconds, dimensions);
  }

  async trackDatabaseQueryDuration(durationMs: number, dimensions: MetricDimensions = {}): Promise<void> {
    await this.publishMetric('DatabaseQueryDuration', durationMs, MetricUnit.Milliseconds, dimensions);
  }
}

/**
 * Error Tracking Metrics
 */
export class ErrorMetrics extends CustomMetric {
  async trackValidationError(dimensions: MetricDimensions = {}): Promise<void> {
    await this.publishMetric('ValidationErrors', 1, MetricUnit.Count, dimensions);
  }

  async trackAuthenticationError(dimensions: MetricDimensions = {}): Promise<void> {
    await this.publishMetric('AuthenticationErrors', 1, MetricUnit.Count, dimensions);
  }

  async trackDatabaseError(dimensions: MetricDimensions = {}): Promise<void> {
    await this.publishMetric('DatabaseErrors', 1, MetricUnit.Count, dimensions);
  }

  async trackExternalAPIError(dimensions: MetricDimensions = {}): Promise<void> {
    await this.publishMetric('ExternalAPIErrors', 1, MetricUnit.Count, dimensions);
  }

  async trackUnknownError(dimensions: MetricDimensions = {}): Promise<void> {
    await this.publishMetric('UnknownErrors', 1, MetricUnit.Count, dimensions);
  }
}

/**
 * Mobile App Metrics
 */
export class MobileAppMetrics extends CustomMetric {
  async trackMobileSession(dimensions: MetricDimensions = {}): Promise<void> {
    await this.publishMetric('MobileSessions', 1, MetricUnit.Count, dimensions);
  }

  async trackMobileCrash(dimensions: MetricDimensions = {}): Promise<void> {
    await this.publishMetric('MobileCrashes', 1, MetricUnit.Count, dimensions);
  }

  async trackAppLaunchTime(durationMs: number, dimensions: MetricDimensions = {}): Promise<void> {
    await this.publishMetric('AppLaunchTime', durationMs, MetricUnit.Milliseconds, dimensions);
  }

  async trackScreenLoadTime(screenName: string, durationMs: number, dimensions: MetricDimensions = {}): Promise<void> {
    const screenDimensions = { ...dimensions, ScreenName: screenName };
    await this.publishMetric('ScreenLoadTime', durationMs, MetricUnit.Milliseconds, screenDimensions);
  }

  async trackMemoryUsage(memoryMB: number, dimensions: MetricDimensions = {}): Promise<void> {
    await this.publishMetric('MemoryUsage', memoryMB, MetricUnit.Megabytes, dimensions);
  }
}

/**
 * Language Usage Metrics
 */
export class LanguageMetrics extends CustomMetric {
  async trackLanguageUsage(language: 'ms' | 'en' | 'zh' | 'ta', dimensions: MetricDimensions = {}): Promise<void> {
    const metricName = `Language${language.toUpperCase()}`;
    await this.publishMetric(metricName, 1, MetricUnit.Count, dimensions);
  }

  async trackLanguageSwitch(fromLanguage: string, toLanguage: string, dimensions: MetricDimensions = {}): Promise<void> {
    const switchDimensions = { ...dimensions, FromLanguage: fromLanguage, ToLanguage: toLanguage };
    await this.publishMetric('LanguageSwitches', 1, MetricUnit.Count, switchDimensions);
  }
}

/**
 * Authentication Metrics
 */
export class AuthenticationMetrics extends CustomMetric {
  async trackAuthenticationAttempt(dimensions: MetricDimensions = {}): Promise<void> {
    await this.publishMetric('AuthenticationAttempts', 1, MetricUnit.Count, dimensions);
  }

  async trackAuthenticationSuccess(dimensions: MetricDimensions = {}): Promise<void> {
    await this.publishMetric('AuthenticationSuccesses', 1, MetricUnit.Count, dimensions);
  }

  async trackAuthenticationFailure(dimensions: MetricDimensions = {}): Promise<void> {
    await this.publishMetric('AuthenticationFailures', 1, MetricUnit.Count, dimensions);
  }
}

/**
 * Aggregate Metrics Calculator
 * Calculates derived metrics from raw data
 */
export class AggregateMetrics {
  /**
   * Calculate content completion rate
   */
  static calculateCompletionRate(completions: number, views: number): number {
    if (views === 0) return 0;
    return (completions / views) * 100;
  }

  /**
   * Calculate quiz pass rate
   */
  static calculateQuizPassRate(passes: number, attempts: number): number {
    if (attempts === 0) return 0;
    return (passes / attempts) * 100;
  }

  /**
   * Calculate recommendation CTR
   */
  static calculateRecommendationCTR(clicks: number, impressions: number): number {
    if (impressions === 0) return 0;
    return (clicks / impressions) * 100;
  }

  /**
   * Calculate video completion rate
   */
  static calculateVideoCompletionRate(completions: number, starts: number): number {
    if (starts === 0) return 0;
    return (completions / starts) * 100;
  }

  /**
   * Calculate error rate
   */
  static calculateErrorRate(errors: number, requests: number): number {
    if (requests === 0) return 0;
    return (errors / requests) * 100;
  }

  /**
   * Calculate crash rate per 1000 sessions
   */
  static calculateCrashRate(crashes: number, sessions: number): number {
    if (sessions === 0) return 0;
    return (crashes / sessions) * 1000;
  }
}

// Export singleton instances for convenience
export const userEngagementMetrics = new UserEngagementMetrics();
export const contentPerformanceMetrics = new ContentPerformanceMetrics();
export const learningActivityMetrics = new LearningActivityMetrics();
export const videoPerformanceMetrics = new VideoPerformanceMetrics();
export const searchPerformanceMetrics = new SearchPerformanceMetrics();
export const recommendationMetrics = new RecommendationMetrics();
export const offlineUsageMetrics = new OfflineUsageMetrics();
export const apiPerformanceMetrics = new APIPerformanceMetrics();
export const errorMetrics = new ErrorMetrics();
export const mobileAppMetrics = new MobileAppMetrics();
export const languageMetrics = new LanguageMetrics();
export const authenticationMetrics = new AuthenticationMetrics();
