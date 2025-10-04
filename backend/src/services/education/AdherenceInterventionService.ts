/**
 * Adherence Intervention Service
 *
 * Monitors medication adherence rates and triggers educational interventions
 * when adherence falls below threshold (60%) over the last 30 days.
 */

import { AdherenceAnalyticsService } from '../analytics/AdherenceAnalyticsService';
import { ContentService } from './ContentService';
import { NotificationService, NotificationRecipient } from '../realtime/notificationService';
import { DatabaseService } from '../database/databaseService';
import { CacheService } from '../cache/redisService';
import { AuditService } from '../audit/auditService';
import { EducationContent } from '../../types/education/education.types';

export interface InterventionBanner {
  type: 'warning' | 'info' | 'success';
  title: string;
  message: string;
  action: {
    label: string;
    screen: string;
    params: Record<string, any>;
  };
}

export interface AdherenceInterventionLog {
  id: string;
  userId: string;
  adherenceRate: number;
  interventionType: 'educational_content' | 'notification' | 'banner';
  contentId?: string;
  notificationId?: string;
  createdAt: Date;
}

export class AdherenceInterventionService {
  private static instance: AdherenceInterventionService;
  private adherenceService: AdherenceAnalyticsService;
  private contentService: ContentService;
  private notificationService: NotificationService;
  private db: DatabaseService;
  private cache: CacheService;
  private auditService: AuditService;

  private readonly ADHERENCE_THRESHOLD = 0.6; // 60%
  private readonly ADHERENCE_PERIOD_DAYS = 30;

  constructor() {
    this.adherenceService = AdherenceAnalyticsService.getInstance();
    this.contentService = ContentService.getInstance();
    this.notificationService = NotificationService.getInstance();
    this.db = DatabaseService.getInstance();
    this.cache = CacheService.getInstance();
    this.auditService = AuditService.getInstance();
  }

  public static getInstance(): AdherenceInterventionService {
    if (!AdherenceInterventionService.instance) {
      AdherenceInterventionService.instance = new AdherenceInterventionService();
    }
    return AdherenceInterventionService.instance;
  }

  /**
   * Check adherence and trigger educational interventions if below threshold
   * Called daily or after adherence events
   */
  async checkAndIntervent(userId: string): Promise<void> {
    try {
      // Get adherence rate for last 30 days
      const progressMetrics = await this.adherenceService.calculateProgressMetrics(
        userId,
        'monthly'
      );

      const adherenceRate = progressMetrics.adherenceRate / 100; // Convert percentage to decimal

      console.log(`[AdherenceIntervention] User ${userId} adherence rate: ${(adherenceRate * 100).toFixed(1)}%`);

      // Check if intervention is needed
      if (adherenceRate < this.ADHERENCE_THRESHOLD) {
        await this.triggerIntervention(userId, adherenceRate);
      }
    } catch (error) {
      console.error('[AdherenceIntervention] Error checking adherence:', error);
      throw error;
    }
  }

  /**
   * Trigger educational intervention for low adherence
   */
  private async triggerIntervention(userId: string, adherenceRate: number): Promise<void> {
    console.log(`[AdherenceIntervention] Low adherence detected: ${(adherenceRate * 100).toFixed(1)}%`);

    // Check if intervention was recently sent (within last 7 days)
    const recentIntervention = await this.getRecentIntervention(userId);
    if (recentIntervention) {
      console.log('[AdherenceIntervention] Recent intervention found, skipping');
      return;
    }

    // Get personalized intervention content
    const interventionContent = await this.getAdherenceInterventionContent(userId, adherenceRate);

    if (!interventionContent) {
      console.error('[AdherenceIntervention] No suitable content found');
      return;
    }

    // Send notification with content recommendation
    const notificationId = await this.sendInterventionNotification(
      userId,
      interventionContent,
      adherenceRate
    );

    // Log intervention
    await this.logIntervention(userId, adherenceRate, interventionContent.id, notificationId);

    // Audit log
    await this.auditService.logHealthcareEvent({
      eventType: 'adherence_intervention_triggered',
      userId,
      userType: 'patient',
      success: true,
      metadata: {
        adherenceRate: (adherenceRate * 100).toFixed(1),
        contentId: interventionContent.id,
        notificationId
      }
    });
  }

  /**
   * Get personalized intervention content based on user's medications
   */
  private async getAdherenceInterventionContent(
    userId: string,
    adherenceRate: number
  ): Promise<EducationContent | null> {
    try {
      // Get user's medications to personalize content
      const medications = await this.getUserMedications(userId);
      const language = await this.getUserLanguage(userId);

      // Find content about medication importance, adherence strategies
      const content = await this.contentService.searchContent({
        tags: ['adherence', 'medication-importance', 'medication-adherence'],
        isPublished: true,
        limit: 1
      }, language);

      if (content.length === 0) {
        // Fallback to general adherence content
        const fallbackContent = await this.contentService.searchContent({
          category: 'adherence',
          isPublished: true,
          limit: 1
        }, language);

        return fallbackContent[0] || null;
      }

      return content[0];
    } catch (error) {
      console.error('[AdherenceIntervention] Error getting intervention content:', error);
      return null;
    }
  }

  /**
   * Send notification with educational content recommendation
   */
  private async sendInterventionNotification(
    userId: string,
    content: EducationContent,
    adherenceRate: number
  ): Promise<string> {
    const language = await this.getUserLanguage(userId);
    const recipient = await this.buildNotificationRecipient(userId, language);

    const title = this.getLocalizedNotificationTitle(language);
    const message = this.getLocalizedNotificationMessage(language, adherenceRate);

    const notification = {
      type: 'cultural_reminder' as const,
      priority: 'medium' as const,
      recipient,
      title,
      message,
      culturalContext: {
        prayerTimeAware: recipient.culturalPreferences.prayerTimeNotifications,
        ramadanAware: true,
        localizedContent: {
          [language]: message
        }
      },
      metadata: {
        interventionType: 'adherence',
        contentId: content.id,
        adherenceRate: (adherenceRate * 100).toFixed(1),
        screen: 'Education',
        screenParams: {
          screen: 'ContentDetail',
          params: { id: content.id }
        }
      }
    };

    return await this.notificationService.sendHealthcareNotification(notification);
  }

  /**
   * Get adherence intervention banner for Education Hub display
   */
  async getInterventionBanner(userId: string): Promise<InterventionBanner | null> {
    try {
      const cacheKey = `intervention_banner:${userId}`;
      const cached = await this.cache.get(cacheKey);

      if (cached) {
        return JSON.parse(cached);
      }

      // Get adherence rate
      const progressMetrics = await this.adherenceService.calculateProgressMetrics(
        userId,
        'monthly'
      );

      const adherenceRate = progressMetrics.adherenceRate / 100;

      if (adherenceRate < this.ADHERENCE_THRESHOLD) {
        const contentId = await this.getAdherenceContentId(userId);
        const language = await this.getUserLanguage(userId);

        const banner: InterventionBanner = {
          type: 'warning',
          title: this.getLocalizedBannerTitle(language),
          message: this.getLocalizedBannerMessage(language, adherenceRate),
          action: {
            label: this.getLocalizedActionLabel(language),
            screen: 'ContentDetail',
            params: { id: contentId }
          }
        };

        // Cache for 1 hour
        await this.cache.set(cacheKey, JSON.stringify(banner), 3600);

        return banner;
      }

      return null;
    } catch (error) {
      console.error('[AdherenceIntervention] Error getting intervention banner:', error);
      return null;
    }
  }

  /**
   * Get adherence content ID for the user
   */
  private async getAdherenceContentId(userId: string): Promise<string> {
    const language = await this.getUserLanguage(userId);
    const adherenceRate = await this.getAdherenceRate(userId);

    const content = await this.getAdherenceInterventionContent(userId, adherenceRate);
    return content?.id || 'default-adherence-content';
  }

  /**
   * Log intervention for analytics
   */
  private async logIntervention(
    userId: string,
    adherenceRate: number,
    contentId: string,
    notificationId: string
  ): Promise<void> {
    try {
      const connection = this.db.getConnection();
      await connection.none(`
        INSERT INTO adherence_intervention_logs (
          id, user_id, adherence_rate, intervention_type,
          content_id, notification_id, created_at
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4, $5, NOW()
        )
      `, [userId, adherenceRate, 'educational_content', contentId, notificationId]);

      console.log(`[AdherenceIntervention] Logged intervention for user ${userId}`);
    } catch (error) {
      console.error('[AdherenceIntervention] Error logging intervention:', error);
    }
  }

  /**
   * Check if user has received intervention recently (within last 7 days)
   */
  private async getRecentIntervention(userId: string): Promise<AdherenceInterventionLog | null> {
    try {
      const connection = this.db.getConnection();
      const result = await connection.oneOrNone(`
        SELECT id, user_id, adherence_rate, intervention_type,
               content_id, notification_id, created_at
        FROM adherence_intervention_logs
        WHERE user_id = $1
          AND created_at > NOW() - INTERVAL '7 days'
        ORDER BY created_at DESC
        LIMIT 1
      `, [userId]);

      if (result) {
        return {
          id: result.id,
          userId: result.user_id,
          adherenceRate: parseFloat(result.adherence_rate),
          interventionType: result.intervention_type,
          contentId: result.content_id,
          notificationId: result.notification_id,
          createdAt: new Date(result.created_at)
        };
      }

      return null;
    } catch (error) {
      console.error('[AdherenceIntervention] Error checking recent intervention:', error);
      return null;
    }
  }

  /**
   * Get user's medications
   */
  private async getUserMedications(userId: string): Promise<any[]> {
    try {
      const connection = this.db.getConnection();
      const medications = await connection.manyOrNone(`
        SELECT m.id, m.name, m.generic_name
        FROM medications m
        JOIN patients p ON p.id = m.patient_id
        WHERE p.user_id = $1 AND m.status = 'active'
      `, [userId]);

      return medications || [];
    } catch (error) {
      console.error('[AdherenceIntervention] Error getting user medications:', error);
      return [];
    }
  }

  /**
   * Get user's preferred language
   */
  private async getUserLanguage(userId: string): Promise<'ms' | 'en' | 'zh' | 'ta'> {
    try {
      const connection = this.db.getConnection();
      const result = await connection.oneOrNone(`
        SELECT language FROM cultural_preferences WHERE user_id = $1
      `, [userId]);

      return result?.language || 'en';
    } catch (error) {
      console.error('[AdherenceIntervention] Error getting user language:', error);
      return 'en';
    }
  }

  /**
   * Get user's adherence rate
   */
  private async getAdherenceRate(userId: string): Promise<number> {
    const progressMetrics = await this.adherenceService.calculateProgressMetrics(
      userId,
      'monthly'
    );
    return progressMetrics.adherenceRate / 100;
  }

  /**
   * Build notification recipient object
   */
  private async buildNotificationRecipient(
    userId: string,
    language: 'ms' | 'en' | 'zh' | 'ta'
  ): Promise<NotificationRecipient> {
    const connection = this.db.getConnection();
    const prefs = await connection.oneOrNone(`
      SELECT * FROM cultural_preferences WHERE user_id = $1
    `, [userId]);

    return {
      userId,
      userType: 'patient',
      channels: [
        { type: 'websocket', enabled: true },
        { type: 'push', enabled: true, config: {} }
      ],
      culturalPreferences: {
        language: prefs?.language || language,
        state: prefs?.state || 'KUL',
        timezone: prefs?.timezone || 'Asia/Kuala_Lumpur',
        prayerTimeNotifications: prefs?.prayer_time_notifications || false,
        halalMedicationOnly: prefs?.halal_medication_only || false,
        preferredContactTime: {
          startHour: prefs?.preferred_contact_start_hour || 8,
          endHour: prefs?.preferred_contact_end_hour || 22
        },
        doNotDisturbDuringPrayer: prefs?.do_not_disturb_during_prayer || false
      }
    };
  }

  /**
   * Localized notification titles
   */
  private getLocalizedNotificationTitle(language: 'ms' | 'en' | 'zh' | 'ta'): string {
    const titles = {
      ms: 'Mari Tingkatkan Pematuhan Ubat',
      en: "Let's Improve Your Medication Adherence",
      zh: '让我们改善您的用药依从性',
      ta: 'உங்கள் மருந்து பின்பற்றலை மேம்படுத்துவோம்'
    };
    return titles[language] || titles.en;
  }

  /**
   * Localized notification messages
   */
  private getLocalizedNotificationMessage(
    language: 'ms' | 'en' | 'zh' | 'ta',
    adherenceRate: number
  ): string {
    const percentage = (adherenceRate * 100).toFixed(0);
    const messages = {
      ms: `Kadar pematuhan ubat anda adalah ${percentage}%. Ketahui mengapa mengambil ubat seperti yang ditetapkan adalah penting.`,
      en: `Your medication adherence is ${percentage}%. Learn why taking your medications as prescribed is important.`,
      zh: `您的用药依从性为${percentage}%。了解为什么按规定服药很重要。`,
      ta: `உங்கள் மருந்து பின்பற்றல் ${percentage}% ஆகும். பரிந்துரைக்கப்பட்டபடி மருந்துகளை எடுத்துக்கொள்வது ஏன் முக்கியம் என்பதை அறியவும்.`
    };
    return messages[language] || messages.en;
  }

  /**
   * Localized banner titles
   */
  private getLocalizedBannerTitle(language: 'ms' | 'en' | 'zh' | 'ta'): string {
    const titles = {
      ms: 'Pematuhan Ubat Memerlukan Perhatian',
      en: 'Your Medication Adherence Needs Attention',
      zh: '您的用药依从性需要关注',
      ta: 'உங்கள் மருந்து பின்பற்றலுக்கு கவனம் தேவை'
    };
    return titles[language] || titles.en;
  }

  /**
   * Localized banner messages
   */
  private getLocalizedBannerMessage(
    language: 'ms' | 'en' | 'zh' | 'ta',
    adherenceRate: number
  ): string {
    const percentage = (adherenceRate * 100).toFixed(0);
    const messages = {
      ms: `Anda telah mengambil ${percentage}% dos yang ditetapkan dalam 30 hari yang lalu.`,
      en: `You've taken ${percentage}% of your prescribed doses in the last 30 days.`,
      zh: `在过去30天中，您已服用了${percentage}%的处方剂量。`,
      ta: `கடந்த 30 நாட்களில் பரிந்துரைக்கப்பட்ட அளவுகளில் ${percentage}% எடுத்துள்ளீர்கள்.`
    };
    return messages[language] || messages.en;
  }

  /**
   * Localized action labels
   */
  private getLocalizedActionLabel(language: 'ms' | 'en' | 'zh' | 'ta'): string {
    const labels = {
      ms: 'Ketahui Lebih Lanjut',
      en: 'Learn More',
      zh: '了解更多',
      ta: 'மேலும் அறிக'
    };
    return labels[language] || labels.en;
  }
}

export default AdherenceInterventionService;
