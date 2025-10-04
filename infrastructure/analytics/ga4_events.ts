/**
 * Google Analytics 4 Event Tracking for MediMate Education Hub
 *
 * This module provides type-safe event tracking functions for GA4.
 * All events follow GA4 best practices and naming conventions.
 *
 * Event Categories:
 * - Content Discovery (search, browse, recommendations)
 * - Content Consumption (view, read, watch)
 * - Learning Activities (quiz, achievement, progress)
 * - User Engagement (share, feedback, preferences)
 * - Technical Events (errors, performance, offline)
 */

// Event parameter types
interface BaseEventParams {
  user_id?: string;
  session_id?: string;
  language?: 'ms' | 'en' | 'zh' | 'ta';
  device_type?: 'mobile' | 'tablet' | 'desktop';
  app_version?: string;
}

// Content Discovery Events
export interface ContentSearchParams extends BaseEventParams {
  search_term: string;
  search_category?: string;
  search_filters?: string;
  results_count: number;
  search_duration_ms?: number;
}

export interface ContentViewParams extends BaseEventParams {
  content_id: string;
  content_name: string;
  content_type: 'article' | 'video' | 'infographic' | 'interactive';
  content_category: string;
  content_language: 'ms' | 'en' | 'zh' | 'ta';
  is_recommended?: boolean;
  recommendation_position?: number;
  recommendation_type?: 'personalized' | 'popular' | 'related' | 'trending';
  source?: 'search' | 'browse' | 'recommendation' | 'notification' | 'share';
}

export interface ContentCompletionParams extends BaseEventParams {
  content_id: string;
  content_type: 'article' | 'video' | 'infographic';
  time_spent_seconds: number;
  scroll_depth_percent?: number;
  video_completion_percent?: number;
  completed: boolean;
}

// Learning Activity Events
export interface QuizStartParams extends BaseEventParams {
  quiz_id: string;
  quiz_name: string;
  content_id: string;
  difficulty_level: 'easy' | 'medium' | 'hard';
  total_questions: number;
}

export interface QuizAnswerParams extends BaseEventParams {
  quiz_id: string;
  question_id: string;
  question_number: number;
  is_correct: boolean;
  time_taken_seconds: number;
  attempts: number;
}

export interface QuizCompletionParams extends BaseEventParams {
  quiz_id: string;
  quiz_name: string;
  score: number;
  total_questions: number;
  correct_answers: number;
  time_taken_seconds: number;
  passed: boolean;
  pass_threshold: number;
}

export interface AchievementUnlockedParams extends BaseEventParams {
  achievement_id: string;
  achievement_name: string;
  achievement_category: 'learning' | 'engagement' | 'streak' | 'completion';
  achievement_value: number;
}

export interface StreakMilestoneParams extends BaseEventParams {
  streak_days: number;
  milestone_type: '7_days' | '30_days' | '90_days' | '365_days';
  total_content_viewed: number;
}

// Video Playback Events
export interface VideoStartParams extends BaseEventParams {
  video_id: string;
  video_name: string;
  content_id: string;
  video_duration_seconds: number;
  video_quality: '360p' | '480p' | '720p' | '1080p';
  has_subtitles: boolean;
  subtitle_language?: string;
  autoplay: boolean;
}

export interface VideoProgressParams extends BaseEventParams {
  video_id: string;
  progress_percent: number;
  playback_speed: number;
  buffering_count?: number;
  quality_changes?: number;
}

export interface VideoCompletionParams extends BaseEventParams {
  video_id: string;
  watch_duration_seconds: number;
  total_duration_seconds: number;
  completion_percent: number;
  watched_with_subtitles: boolean;
  average_playback_speed: number;
}

export interface VideoErrorParams extends BaseEventParams {
  video_id: string;
  error_code: string;
  error_message: string;
  video_quality: string;
  playback_position_seconds: number;
  network_type?: string;
}

// Engagement Events
export interface RecommendationClickParams extends BaseEventParams {
  content_id: string;
  recommendation_type: 'personalized' | 'popular' | 'related' | 'trending';
  position: number;
  total_recommendations: number;
  context: 'home' | 'content_detail' | 'search_results' | 'category';
  algorithm_version?: string;
}

export interface ShareContentParams extends BaseEventParams {
  content_id: string;
  content_type: string;
  share_method: 'family_circle' | 'whatsapp' | 'link' | 'social_media';
  recipient_count?: number;
  share_location: 'content_detail' | 'quiz_completion' | 'achievement';
}

export interface ContentRatingParams extends BaseEventParams {
  content_id: string;
  content_type: string;
  rating: 1 | 2 | 3 | 4 | 5;
  feedback_text?: string;
  rating_context: 'content_completion' | 'quiz_completion' | 'manual';
}

export interface FeedbackSubmitParams extends BaseEventParams {
  feedback_type: 'bug' | 'feature_request' | 'content_feedback' | 'general';
  feedback_category?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  screen_name?: string;
  has_screenshot: boolean;
}

// Offline Events
export interface OfflineDownloadParams extends BaseEventParams {
  content_id: string;
  content_type: 'article' | 'video' | 'infographic';
  file_size_mb: number;
  download_duration_seconds: number;
  network_type: 'wifi' | 'cellular';
  success: boolean;
  error_message?: string;
}

export interface OfflinePlaybackParams extends BaseEventParams {
  content_id: string;
  content_type: string;
  offline_duration_seconds: number;
}

export interface SyncOperationParams extends BaseEventParams {
  sync_type: 'progress' | 'downloads' | 'preferences' | 'all';
  items_synced: number;
  sync_duration_seconds: number;
  conflicts_found: number;
  conflicts_resolved: number;
  success: boolean;
}

// User Preference Events
export interface LanguageChangeParams extends BaseEventParams {
  previous_language: 'ms' | 'en' | 'zh' | 'ta';
  new_language: 'ms' | 'en' | 'zh' | 'ta';
  change_location: 'settings' | 'onboarding' | 'content_view';
}

export interface PreferenceUpdateParams extends BaseEventParams {
  preference_type: 'content_categories' | 'notifications' | 'accessibility' | 'privacy';
  preference_key: string;
  previous_value?: string;
  new_value: string;
}

// Error and Performance Events
export interface ErrorEventParams extends BaseEventParams {
  error_type: 'api' | 'network' | 'validation' | 'authentication' | 'unknown';
  error_code: string;
  error_message: string;
  error_stack?: string;
  endpoint?: string;
  http_status?: number;
  fatal: boolean;
}

export interface PerformanceMetricParams extends BaseEventParams {
  metric_name: string;
  metric_value: number;
  metric_unit: 'ms' | 'seconds' | 'bytes' | 'count';
  screen_name?: string;
  operation_type?: string;
}

// GA4 Event Tracking Class
export class GA4EventTracker {
  private gtag: (...args: any[]) => void;
  private measurementId: string;
  private debugMode: boolean;

  constructor(measurementId: string, debugMode: boolean = false) {
    this.measurementId = measurementId;
    this.debugMode = debugMode;

    // Initialize gtag if not already present
    if (typeof window !== 'undefined') {
      this.gtag = (window as any).gtag || this.createGtagStub();
    } else {
      this.gtag = this.createGtagStub();
    }
  }

  private createGtagStub() {
    return (...args: any[]) => {
      if (this.debugMode) {
        console.log('[GA4 Debug]', args);
      }
    };
  }

  // Content Discovery Events
  trackContentSearch(params: ContentSearchParams): void {
    this.gtag('event', 'search', {
      search_term: params.search_term,
      content_category: params.search_category,
      results_count: params.results_count,
      ...this.getBaseParams(params)
    });
  }

  trackContentView(params: ContentViewParams): void {
    this.gtag('event', 'view_item', {
      item_id: params.content_id,
      item_name: params.content_name,
      item_category: params.content_category,
      content_type: params.content_type,
      is_recommended: params.is_recommended,
      recommendation_position: params.recommendation_position,
      ...this.getBaseParams(params)
    });
  }

  trackContentCompletion(params: ContentCompletionParams): void {
    this.gtag('event', 'content_completion', {
      content_id: params.content_id,
      content_type: params.content_type,
      time_spent_seconds: params.time_spent_seconds,
      scroll_depth_percent: params.scroll_depth_percent,
      video_completion_percent: params.video_completion_percent,
      completed: params.completed,
      ...this.getBaseParams(params)
    });
  }

  // Learning Activity Events
  trackQuizStart(params: QuizStartParams): void {
    this.gtag('event', 'quiz_start', {
      quiz_id: params.quiz_id,
      quiz_name: params.quiz_name,
      content_id: params.content_id,
      difficulty_level: params.difficulty_level,
      total_questions: params.total_questions,
      ...this.getBaseParams(params)
    });
  }

  trackQuizAnswer(params: QuizAnswerParams): void {
    this.gtag('event', 'quiz_answer', {
      quiz_id: params.quiz_id,
      question_id: params.question_id,
      question_number: params.question_number,
      is_correct: params.is_correct,
      time_taken_seconds: params.time_taken_seconds,
      attempts: params.attempts,
      ...this.getBaseParams(params)
    });
  }

  trackQuizCompletion(params: QuizCompletionParams): void {
    this.gtag('event', 'quiz_completion', {
      quiz_id: params.quiz_id,
      quiz_name: params.quiz_name,
      score: params.score,
      total_questions: params.total_questions,
      correct_answers: params.correct_answers,
      time_taken_seconds: params.time_taken_seconds,
      passed: params.passed,
      pass_threshold: params.pass_threshold,
      ...this.getBaseParams(params)
    });
  }

  trackAchievementUnlocked(params: AchievementUnlockedParams): void {
    this.gtag('event', 'unlock_achievement', {
      achievement_id: params.achievement_id,
      achievement_name: params.achievement_name,
      achievement_category: params.achievement_category,
      achievement_value: params.achievement_value,
      ...this.getBaseParams(params)
    });
  }

  trackStreakMilestone(params: StreakMilestoneParams): void {
    this.gtag('event', 'streak_milestone', {
      streak_days: params.streak_days,
      milestone_type: params.milestone_type,
      total_content_viewed: params.total_content_viewed,
      ...this.getBaseParams(params)
    });
  }

  // Video Events
  trackVideoStart(params: VideoStartParams): void {
    this.gtag('event', 'video_start', {
      video_id: params.video_id,
      video_name: params.video_name,
      content_id: params.content_id,
      video_duration_seconds: params.video_duration_seconds,
      video_quality: params.video_quality,
      has_subtitles: params.has_subtitles,
      subtitle_language: params.subtitle_language,
      autoplay: params.autoplay,
      ...this.getBaseParams(params)
    });
  }

  trackVideoProgress(params: VideoProgressParams): void {
    this.gtag('event', 'video_progress', {
      video_id: params.video_id,
      progress_percent: params.progress_percent,
      playback_speed: params.playback_speed,
      buffering_count: params.buffering_count,
      quality_changes: params.quality_changes,
      ...this.getBaseParams(params)
    });
  }

  trackVideoCompletion(params: VideoCompletionParams): void {
    this.gtag('event', 'video_complete', {
      video_id: params.video_id,
      watch_duration_seconds: params.watch_duration_seconds,
      total_duration_seconds: params.total_duration_seconds,
      completion_percent: params.completion_percent,
      watched_with_subtitles: params.watched_with_subtitles,
      average_playback_speed: params.average_playback_speed,
      ...this.getBaseParams(params)
    });
  }

  trackVideoError(params: VideoErrorParams): void {
    this.gtag('event', 'video_error', {
      video_id: params.video_id,
      error_code: params.error_code,
      error_message: params.error_message,
      video_quality: params.video_quality,
      playback_position_seconds: params.playback_position_seconds,
      network_type: params.network_type,
      ...this.getBaseParams(params)
    });
  }

  // Engagement Events
  trackRecommendationClick(params: RecommendationClickParams): void {
    this.gtag('event', 'select_promotion', {
      promotion_id: params.content_id,
      promotion_name: params.recommendation_type,
      creative_slot: params.position.toString(),
      location_id: params.context,
      ...this.getBaseParams(params)
    });
  }

  trackShareContent(params: ShareContentParams): void {
    this.gtag('event', 'share', {
      content_type: params.content_type,
      item_id: params.content_id,
      method: params.share_method,
      recipient_count: params.recipient_count,
      share_location: params.share_location,
      ...this.getBaseParams(params)
    });
  }

  trackContentRating(params: ContentRatingParams): void {
    this.gtag('event', 'content_rating', {
      content_id: params.content_id,
      content_type: params.content_type,
      rating: params.rating,
      has_feedback: !!params.feedback_text,
      rating_context: params.rating_context,
      ...this.getBaseParams(params)
    });
  }

  trackFeedbackSubmit(params: FeedbackSubmitParams): void {
    this.gtag('event', 'feedback_submit', {
      feedback_type: params.feedback_type,
      feedback_category: params.feedback_category,
      severity: params.severity,
      screen_name: params.screen_name,
      has_screenshot: params.has_screenshot,
      ...this.getBaseParams(params)
    });
  }

  // Offline Events
  trackOfflineDownload(params: OfflineDownloadParams): void {
    this.gtag('event', 'offline_download', {
      content_id: params.content_id,
      content_type: params.content_type,
      file_size_mb: params.file_size_mb,
      download_duration_seconds: params.download_duration_seconds,
      network_type: params.network_type,
      success: params.success,
      error_message: params.error_message,
      ...this.getBaseParams(params)
    });
  }

  trackOfflinePlayback(params: OfflinePlaybackParams): void {
    this.gtag('event', 'offline_playback', {
      content_id: params.content_id,
      content_type: params.content_type,
      offline_duration_seconds: params.offline_duration_seconds,
      ...this.getBaseParams(params)
    });
  }

  trackSyncOperation(params: SyncOperationParams): void {
    this.gtag('event', 'sync_operation', {
      sync_type: params.sync_type,
      items_synced: params.items_synced,
      sync_duration_seconds: params.sync_duration_seconds,
      conflicts_found: params.conflicts_found,
      conflicts_resolved: params.conflicts_resolved,
      success: params.success,
      ...this.getBaseParams(params)
    });
  }

  // User Preference Events
  trackLanguageChange(params: LanguageChangeParams): void {
    this.gtag('event', 'language_change', {
      previous_language: params.previous_language,
      new_language: params.new_language,
      change_location: params.change_location,
      ...this.getBaseParams(params)
    });
  }

  trackPreferenceUpdate(params: PreferenceUpdateParams): void {
    this.gtag('event', 'preference_update', {
      preference_type: params.preference_type,
      preference_key: params.preference_key,
      previous_value: params.previous_value,
      new_value: params.new_value,
      ...this.getBaseParams(params)
    });
  }

  // Error Events
  trackError(params: ErrorEventParams): void {
    this.gtag('event', 'exception', {
      description: params.error_message,
      error_type: params.error_type,
      error_code: params.error_code,
      endpoint: params.endpoint,
      http_status: params.http_status,
      fatal: params.fatal,
      ...this.getBaseParams(params)
    });
  }

  // Performance Events
  trackPerformanceMetric(params: PerformanceMetricParams): void {
    this.gtag('event', 'timing_complete', {
      name: params.metric_name,
      value: params.metric_value,
      event_category: 'performance',
      metric_unit: params.metric_unit,
      screen_name: params.screen_name,
      operation_type: params.operation_type,
      ...this.getBaseParams(params)
    });
  }

  // Helper method to extract base parameters
  private getBaseParams(params: BaseEventParams): object {
    return {
      user_id: params.user_id,
      session_id: params.session_id,
      language: params.language,
      device_type: params.device_type,
      app_version: params.app_version
    };
  }

  // Set user properties
  setUserProperties(properties: { [key: string]: any }): void {
    this.gtag('set', 'user_properties', properties);
  }

  // Set user ID
  setUserId(userId: string): void {
    this.gtag('set', { user_id: userId });
  }

  // Page view tracking
  trackPageView(pagePath: string, pageTitle: string): void {
    this.gtag('config', this.measurementId, {
      page_path: pagePath,
      page_title: pageTitle
    });
  }
}

// Singleton instance
let trackerInstance: GA4EventTracker | null = null;

export function initializeGA4Tracker(measurementId: string, debugMode: boolean = false): GA4EventTracker {
  if (!trackerInstance) {
    trackerInstance = new GA4EventTracker(measurementId, debugMode);
  }
  return trackerInstance;
}

export function getGA4Tracker(): GA4EventTracker {
  if (!trackerInstance) {
    throw new Error('GA4 tracker not initialized. Call initializeGA4Tracker first.');
  }
  return trackerInstance;
}
