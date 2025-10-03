/**
 * Education Integration Service
 * Integrates Education Hub with other MediMate modules
 * Handles cultural intelligence, medication integration, and family circle features
 */

import { CulturalPreferenceService, CulturalPreferences } from '../cultural/culturalPreferenceService';
import { LearningReminderService } from './LearningReminderService';

export interface EducationContentMetadata {
  id: string;
  title: string;
  description: string;
  category: string;
  language: string;
  duration_minutes?: number;
  difficulty_level?: 'beginner' | 'intermediate' | 'advanced';
  tags?: string[];
}

export interface UserPreferences {
  user_id: string;
  language: string;
  cultural_preferences?: CulturalPreferences;
}

export interface ContentRecommendationContext {
  user_id: string;
  medication_ids?: string[];
  medical_conditions?: string[];
  language_preference?: string;
  recent_content_viewed?: string[];
}

export interface ShareContentRequest {
  content_id: string;
  sender_user_id: string;
  recipient_user_ids: string[];
  message?: string;
}

export interface ShareContentResponse {
  success: boolean;
  shared_with: string[];
  failed: string[];
  notifications_sent: number;
}

export class EducationIntegrationService {
  private culturalService: CulturalPreferenceService;
  private reminderService: LearningReminderService;
  private initialized = false;

  constructor(
    culturalService?: CulturalPreferenceService,
    reminderService?: LearningReminderService
  ) {
    this.culturalService = culturalService || new CulturalPreferenceService();
    this.reminderService = reminderService || new LearningReminderService();
  }

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    console.log('[EducationIntegration] Initializing service...');

    try {
      await Promise.all([
        this.culturalService.initialize(),
        this.reminderService.initialize()
      ]);

      this.initialized = true;
      console.log('[EducationIntegration] Service initialized successfully');
    } catch (error) {
      console.error('[EducationIntegration] Failed to initialize:', error);
      throw error;
    }
  }

  /**
   * Get educational content filtered by user's language preference
   */
  async getContentByLanguage(
    user_id: string,
    language?: string
  ): Promise<{ preferred_language: string; content_available: boolean }> {
    if (!this.initialized) {
      throw new Error('EducationIntegrationService not initialized');
    }

    // Get user's cultural preferences
    const culturalPrefs = await this.getUserCulturalPreferences(user_id);
    const preferredLanguage = language || culturalPrefs.primary_language;

    // In production, this would query the content database
    // For now, return metadata about content availability
    return {
      preferred_language: preferredLanguage,
      content_available: true
    };
  }

  /**
   * Get content recommendations based on medications
   */
  async getContentByMedication(
    user_id: string,
    medication_id: string
  ): Promise<EducationContentMetadata[]> {
    if (!this.initialized) {
      throw new Error('EducationIntegrationService not initialized');
    }

    // Get user's language preference
    const culturalPrefs = await this.getUserCulturalPreferences(user_id);

    // In production, this would query the content database
    // Mock implementation returns empty array
    console.log(
      `[EducationIntegration] Fetching content for medication ${medication_id} in ${culturalPrefs.primary_language}`
    );

    return [];
  }

  /**
   * Refresh recommendations when medications change
   */
  async onMedicationChange(user_id: string, medication_ids: string[]): Promise<void> {
    if (!this.initialized) {
      throw new Error('EducationIntegrationService not initialized');
    }

    console.log(
      `[EducationIntegration] Medication change detected for user ${user_id}. Refreshing recommendations...`
    );

    // Get user's cultural preferences for language
    const culturalPrefs = await this.getUserCulturalPreferences(user_id);

    // In production, this would:
    // 1. Query new educational content related to medications
    // 2. Update user's recommendation cache
    // 3. Send notification if new content is available

    const newContentCount = medication_ids.length; // Mock count

    if (newContentCount > 0) {
      console.log(
        `[EducationIntegration] Found ${newContentCount} new content items. Language: ${culturalPrefs.primary_language}`
      );

      // In production, send notification via NotificationService
      console.log(
        `[EducationIntegration] Notification would be sent: "New Learning Content Available"`
      );
    }
  }

  /**
   * Share educational content with family members
   */
  async shareContent(request: ShareContentRequest): Promise<ShareContentResponse> {
    if (!this.initialized) {
      throw new Error('EducationIntegrationService not initialized');
    }

    const { content_id, sender_user_id, recipient_user_ids, message } = request;

    console.log(
      `[EducationIntegration] Sharing content ${content_id} from ${sender_user_id} to ${recipient_user_ids.length} recipients`
    );

    const shared_with: string[] = [];
    const failed: string[] = [];
    let notifications_sent = 0;

    // In production, this would:
    // 1. Validate content exists
    // 2. Validate recipients are in sender's family circle
    // 3. Create share records in database
    // 4. Send notifications to recipients

    for (const recipient_id of recipient_user_ids) {
      try {
        // Mock successful share
        shared_with.push(recipient_id);

        // Get recipient's language preference for notification
        const recipientPrefs = await this.getUserCulturalPreferences(recipient_id);

        // In production, send notification via NotificationService
        console.log(
          `[EducationIntegration] Notification to ${recipient_id} (${recipientPrefs.primary_language}): Content shared`
        );

        notifications_sent++;
      } catch (error) {
        console.error(`[EducationIntegration] Failed to share with ${recipient_id}:`, error);
        failed.push(recipient_id);
      }
    }

    return {
      success: failed.length === 0,
      shared_with,
      failed,
      notifications_sent
    };
  }

  /**
   * Get family member learning progress
   */
  async getFamilyLearningProgress(user_id: string, family_member_ids: string[]): Promise<{
    member_id: string;
    progress: {
      content_viewed: number;
      quizzes_passed: number;
      current_streak: number;
      total_time_minutes: number;
    };
  }[]> {
    if (!this.initialized) {
      throw new Error('EducationIntegrationService not initialized');
    }

    console.log(`[EducationIntegration] Fetching learning progress for ${family_member_ids.length} family members`);

    // In production, this would query the progress tracking service
    // Mock implementation returns empty progress
    return family_member_ids.map(member_id => ({
      member_id,
      progress: {
        content_viewed: 0,
        quizzes_passed: 0,
        current_streak: 0,
        total_time_minutes: 0
      }
    }));
  }

  /**
   * Schedule culturally-aware learning reminder
   */
  async scheduleCulturallyAwareReminder(
    user_id: string,
    preferred_time: string,
    date?: Date
  ): Promise<{
    reminder_id: string;
    scheduled_time: string;
    was_adjusted: boolean;
    adjustment_reason?: string;
  }> {
    if (!this.initialized) {
      throw new Error('EducationIntegrationService not initialized');
    }

    // Get user's cultural preferences
    const culturalPrefs = await this.getUserCulturalPreferences(user_id);

    // Get culturally appropriate greeting for notification
    const greeting = this.getCulturalGreeting(culturalPrefs.primary_language);

    // Schedule reminder with prayer time awareness
    const response = await this.reminderService.scheduleLearningReminder({
      user_id,
      preferred_time,
      title: greeting,
      body: 'Continue your health education journey',
      date
    });

    return {
      reminder_id: response.reminder.id,
      scheduled_time: response.reminder.actual_time,
      was_adjusted: response.was_adjusted,
      adjustment_reason: response.adjustment_details?.reason
    };
  }

  /**
   * Get culturally appropriate greeting
   */
  private getCulturalGreeting(language: string): string {
    const greetings: Record<string, string> = {
      ms: 'Masa untuk Belajar',
      en: 'Time to Learn',
      zh: '学习时间',
      ta: 'கற்கும் நேரம்'
    };

    return greetings[language] || greetings.en;
  }

  /**
   * Get user's cultural preferences
   */
  private async getUserCulturalPreferences(user_id: string): Promise<CulturalPreferences> {
    // In production, this would fetch from database
    // For now, create a default profile
    const defaultPrefs = await this.culturalService.createCulturalProfile({
      user_id,
      religion: 'Islam',
      primary_language: 'ms',
      state_code: 'KUL',
      region: 'Kuala Lumpur',
      prayer_time_notifications: true,
      cultural_calendar_integration: true,
      halal_requirements: true
    });

    return defaultPrefs;
  }

  /**
   * Apply language preference to content query
   */
  async applyLanguageFilter(
    content_items: EducationContentMetadata[],
    user_id: string
  ): Promise<EducationContentMetadata[]> {
    const culturalPrefs = await this.getUserCulturalPreferences(user_id);
    const preferredLanguage = culturalPrefs.primary_language;

    // Filter content by language preference
    const filteredContent = content_items.filter(
      item => item.language === preferredLanguage
    );

    // If no content in preferred language, include secondary languages
    if (filteredContent.length === 0 && culturalPrefs.secondary_languages.length > 0) {
      return content_items.filter(
        item => culturalPrefs.secondary_languages.includes(item.language)
      );
    }

    return filteredContent;
  }

  /**
   * Get cultural context for educational content display
   */
  async getCulturalContext(user_id: string): Promise<{
    language: string;
    show_prayer_times: boolean;
    halal_sensitive: boolean;
    greeting: string;
  }> {
    if (!this.initialized) {
      throw new Error('EducationIntegrationService not initialized');
    }

    const culturalPrefs = await this.getUserCulturalPreferences(user_id);

    return {
      language: culturalPrefs.primary_language,
      show_prayer_times: culturalPrefs.prayer_time_notifications && culturalPrefs.religion === 'Islam',
      halal_sensitive: culturalPrefs.halal_requirements,
      greeting: this.getCulturalGreeting(culturalPrefs.primary_language)
    };
  }

  /**
   * Check if service is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get service status
   */
  getServiceStatus(): {
    initialized: boolean;
    cultural_service: boolean;
    reminder_service: boolean;
  } {
    return {
      initialized: this.initialized,
      cultural_service: this.culturalService.isInitialized(),
      reminder_service: true // LearningReminderService doesn't expose isInitialized
    };
  }
}

export default EducationIntegrationService;
