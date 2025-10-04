/**
 * Education Integration Service
 * Coordinates education hub with other MediMate modules
 * Handles medication, family circle, and cultural intelligence integration
 */

import { LearningReminderService, ReminderScheduleRequest } from './LearningReminderService';
import { CulturalPreferenceService } from '../cultural/culturalPreferenceService';

export interface EducationContent {
  id: string;
  title: string;
  description: string;
  category: string;
  language: string;
  content_type: 'article' | 'video' | 'quiz' | 'interactive';
  duration_minutes?: number;
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  created_at: Date;
  updated_at: Date;
}

export interface ContentRecommendation {
  content: EducationContent;
  relevance_score: number;
  reason: string;
  source: 'medication' | 'adherence' | 'profile' | 'popular';
}

export interface UserEducationPreferences {
  user_id: string;
  preferred_language: 'ms' | 'en' | 'zh' | 'ta';
  content_types: string[];
  difficulty_preference: 'beginner' | 'intermediate' | 'advanced';
  daily_reminder_enabled: boolean;
  reminder_time?: string;
  topics_of_interest: string[];
}

export class EducationIntegrationService {
  private learningReminderService: LearningReminderService;
  private culturalPreferenceService: CulturalPreferenceService;

  constructor() {
    this.learningReminderService = new LearningReminderService();
    this.culturalPreferenceService = new CulturalPreferenceService();
  }

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    console.log('[EducationIntegration] Initializing service...');
    await this.culturalPreferenceService.initialize();
    console.log('[EducationIntegration] Service initialized successfully');
  }

  /**
   * Called when user adds/updates medications
   * Triggers recommendation refresh and notifications
   */
  async onMedicationChange(userId: string, medicationIds: string[]): Promise<void> {
    try {
      console.log(`[EducationIntegration] Processing medication change for user ${userId}`);

      // In production, this would:
      // 1. Fetch new educational content related to medications
      // 2. Update personalized recommendations
      // 3. Send notification if new relevant content available

      // Get user's language preference
      const preferences = await this.getUserPreferences(userId);
      const language = preferences?.preferred_language || 'en';

      // Mock: Check if new educational content available
      const newContent = await this.getNewContentForMedications(medicationIds, language);

      if (newContent.length > 0) {
        console.log(`[EducationIntegration] Found ${newContent.length} new content items for medications`);

        // In production, send notification via NotificationService
        // await this.sendNewContentNotification(userId, newContent);
      }
    } catch (error) {
      console.error('[EducationIntegration] Failed to process medication change:', error);
    }
  }

  /**
   * Get educational content by medication ID or generic name
   */
  async getContentByMedication(medicationId: string, language?: string): Promise<EducationContent[]> {
    try {
      // In production, this would query database for content tagged with medication
      console.log(`[EducationIntegration] Fetching content for medication ${medicationId}`);

      // Mock implementation
      return [];
    } catch (error) {
      console.error('[EducationIntegration] Failed to get content by medication:', error);
      return [];
    }
  }

  /**
   * Get new content for specific medications
   */
  private async getNewContentForMedications(
    medicationIds: string[],
    language: string
  ): Promise<EducationContent[]> {
    try {
      // Mock implementation
      // In production, query database for content published recently
      // that's tagged with any of the medication IDs
      return [];
    } catch (error) {
      console.error('[EducationIntegration] Failed to get new content:', error);
      return [];
    }
  }

  /**
   * Setup daily learning reminders respecting cultural preferences
   */
  async setupDailyReminders(
    userId: string,
    preferredTime: string,
    stateCode: string
  ): Promise<void> {
    try {
      console.log(`[EducationIntegration] Setting up daily reminders for user ${userId}`);

      // Parse preferred time (e.g., "09:00")
      const [hours, minutes] = preferredTime.split(':').map(Number);
      const reminderTime = new Date();
      reminderTime.setHours(hours, minutes, 0, 0);

      // Schedule reminder with prayer time respect
      const request: ReminderScheduleRequest = {
        user_id: userId,
        preferred_time: reminderTime,
        respect_prayer_times: true
      };

      const result = await this.learningReminderService.scheduleLearningReminder(request);

      if (result.adjusted) {
        console.log(`[EducationIntegration] Reminder adjusted for prayer time: ${result.adjustment_details?.reason}`);
      }
    } catch (error) {
      console.error('[EducationIntegration] Failed to setup daily reminders:', error);
    }
  }

  /**
   * Get personalized content recommendations
   */
  async getPersonalizedRecommendations(
    userId: string,
    limit: number = 10
  ): Promise<ContentRecommendation[]> {
    try {
      const preferences = await this.getUserPreferences(userId);
      const language = preferences?.preferred_language || 'en';

      console.log(`[EducationIntegration] Fetching recommendations for user ${userId} in ${language}`);

      // In production, this would:
      // 1. Analyze user's medications
      // 2. Check adherence patterns
      // 3. Review past learning history
      // 4. Match with available content in preferred language
      // 5. Score and rank recommendations

      // Mock implementation
      return [];
    } catch (error) {
      console.error('[EducationIntegration] Failed to get recommendations:', error);
      return [];
    }
  }

  /**
   * Share educational content with family circle members
   */
  async shareContentWithFamily(
    contentId: string,
    senderId: string,
    recipientIds: string[]
  ): Promise<{ success: boolean; shared_count: number }> {
    try {
      console.log(`[EducationIntegration] Sharing content ${contentId} with ${recipientIds.length} family members`);

      // In production, this would:
      // 1. Validate family circle relationships
      // 2. Create share records in database
      // 3. Send notifications to recipients

      return {
        success: true,
        shared_count: recipientIds.length
      };
    } catch (error) {
      console.error('[EducationIntegration] Failed to share content:', error);
      return {
        success: false,
        shared_count: 0
      };
    }
  }

  /**
   * Get user's learning progress
   */
  async getUserProgress(userId: string): Promise<{
    content_viewed: number;
    quizzes_passed: number;
    current_streak: number;
    total_learning_minutes: number;
    achievements: string[];
  }> {
    try {
      console.log(`[EducationIntegration] Fetching learning progress for user ${userId}`);

      // In production, query database for user's learning statistics
      // Mock implementation
      return {
        content_viewed: 0,
        quizzes_passed: 0,
        current_streak: 0,
        total_learning_minutes: 0,
        achievements: []
      };
    } catch (error) {
      console.error('[EducationIntegration] Failed to get user progress:', error);
      return {
        content_viewed: 0,
        quizzes_passed: 0,
        current_streak: 0,
        total_learning_minutes: 0,
        achievements: []
      };
    }
  }

  /**
   * Get optimal learning times for user
   */
  async getOptimalLearningTimes(
    userId: string,
    stateCode: string,
    date?: Date
  ): Promise<Array<{ start: string; end: string; label: string }>> {
    try {
      const targetDate = date || new Date();
      return await this.learningReminderService.getOptimalLearningTimes(
        userId,
        targetDate,
        stateCode
      );
    } catch (error) {
      console.error('[EducationIntegration] Failed to get optimal learning times:', error);
      return [];
    }
  }

  /**
   * Get user education preferences with cultural context
   */
  async getUserPreferences(userId: string): Promise<UserEducationPreferences | null> {
    try {
      // In production, fetch from database
      // For now, return null
      return null;
    } catch (error) {
      console.error('[EducationIntegration] Failed to get user preferences:', error);
      return null;
    }
  }

  /**
   * Update user education preferences
   */
  async updateUserPreferences(
    userId: string,
    preferences: Partial<UserEducationPreferences>
  ): Promise<boolean> {
    try {
      console.log(`[EducationIntegration] Updating preferences for user ${userId}`);

      // In production, update database
      // If reminder time changed, reschedule reminders
      if (preferences.reminder_time && preferences.daily_reminder_enabled) {
        // Reschedule daily reminders
        // await this.setupDailyReminders(userId, preferences.reminder_time, stateCode);
      }

      return true;
    } catch (error) {
      console.error('[EducationIntegration] Failed to update preferences:', error);
      return false;
    }
  }

  /**
   * Track content view for analytics
   */
  async trackContentView(
    userId: string,
    contentId: string,
    durationSeconds: number
  ): Promise<void> {
    try {
      console.log(`[EducationIntegration] User ${userId} viewed content ${contentId} for ${durationSeconds}s`);

      // In production, store in analytics database
      // Update user's learning streak
      // Check for achievement unlocks
    } catch (error) {
      console.error('[EducationIntegration] Failed to track content view:', error);
    }
  }

  /**
   * Get content in user's preferred language
   */
  async getContentInPreferredLanguage(
    contentId: string,
    userId: string
  ): Promise<EducationContent | null> {
    try {
      const preferences = await this.getUserPreferences(userId);
      const language = preferences?.preferred_language || 'en';

      console.log(`[EducationIntegration] Fetching content ${contentId} in language ${language}`);

      // In production, query database for content in specified language
      // If not available, return English version with translation notice
      return null;
    } catch (error) {
      console.error('[EducationIntegration] Failed to get content in preferred language:', error);
      return null;
    }
  }

  /**
   * Get categories in user's preferred language
   */
  async getCategoriesInLanguage(language: 'ms' | 'en' | 'zh' | 'ta'): Promise<Array<{
    id: string;
    name: string;
    description: string;
    icon: string;
    content_count: number;
  }>> {
    try {
      console.log(`[EducationIntegration] Fetching categories in ${language}`);

      // In production, query database for categories with translations
      return [];
    } catch (error) {
      console.error('[EducationIntegration] Failed to get categories:', error);
      return [];
    }
  }
}

export default EducationIntegrationService;
