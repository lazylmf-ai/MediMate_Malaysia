/**
 * Learning Reminder Service
 * Manages educational content reminders with cultural intelligence
 * Respects prayer times for Muslim users and adjusts scheduling accordingly
 */

import { PrayerTimeService, PrayerTimes } from '../cultural/prayerTimeService';
import { CulturalPreferenceService, CulturalPreferences } from '../cultural/culturalPreferenceService';

export interface LearningReminder {
  id: string;
  user_id: string;
  content_id?: string;
  scheduled_time: Date;
  original_time?: Date;
  adjusted_for_prayer: boolean;
  notification_sent: boolean;
  metadata?: {
    prayer_conflict?: string;
    adjustment_reason?: string;
  };
  created_at: Date;
  updated_at: Date;
}

export interface ReminderScheduleRequest {
  user_id: string;
  preferred_time: Date;
  content_id?: string;
  respect_prayer_times?: boolean;
}

export interface ReminderScheduleResult {
  reminder: LearningReminder;
  adjusted: boolean;
  adjustment_details?: {
    original_time: Date;
    adjusted_time: Date;
    reason: string;
    conflicting_prayer?: string;
  };
}

export class LearningReminderService {
  private prayerTimeService: PrayerTimeService;
  private culturalPreferenceService: CulturalPreferenceService;
  private readonly PRAYER_BUFFER_MINUTES = 30;
  private readonly POST_PRAYER_DELAY_MINUTES = 15;

  constructor() {
    this.prayerTimeService = new PrayerTimeService();
    this.culturalPreferenceService = new CulturalPreferenceService();
  }

  /**
   * Schedule learning reminder respecting cultural preferences
   */
  async scheduleLearningReminder(request: ReminderScheduleRequest): Promise<ReminderScheduleResult> {
    const { user_id, preferred_time, content_id, respect_prayer_times = true } = request;

    // Get user's cultural preferences
    const culturalPrefs = await this.getUserCulturalPreferences(user_id);

    // Create base reminder
    const reminder: LearningReminder = {
      id: this.generateReminderId(),
      user_id,
      content_id,
      scheduled_time: preferred_time,
      adjusted_for_prayer: false,
      notification_sent: false,
      created_at: new Date(),
      updated_at: new Date()
    };

    // If user is Muslim and prayer time respect is enabled
    if (culturalPrefs?.religion === 'Islam' && respect_prayer_times && culturalPrefs.prayer_time_notifications) {
      const adjustmentResult = await this.adjustForPrayerTime(
        preferred_time,
        culturalPrefs.state_code
      );

      if (adjustmentResult.adjusted) {
        reminder.scheduled_time = adjustmentResult.adjusted_time;
        reminder.original_time = preferred_time;
        reminder.adjusted_for_prayer = true;
        reminder.metadata = {
          prayer_conflict: adjustmentResult.conflicting_prayer,
          adjustment_reason: adjustmentResult.reason
        };

        console.log(`[LearningReminder] Adjusted reminder from ${this.formatTime(preferred_time)} to ${this.formatTime(adjustmentResult.adjusted_time)} to respect ${adjustmentResult.conflicting_prayer} prayer time`);

        return {
          reminder,
          adjusted: true,
          adjustment_details: {
            original_time: preferred_time,
            adjusted_time: adjustmentResult.adjusted_time,
            reason: adjustmentResult.reason,
            conflicting_prayer: adjustmentResult.conflicting_prayer
          }
        };
      }
    }

    // No adjustment needed
    return {
      reminder,
      adjusted: false
    };
  }

  /**
   * Check if preferred time conflicts with prayer time
   */
  async checkPrayerTimeConflict(
    time: Date,
    stateCode: string
  ): Promise<{
    has_conflict: boolean;
    conflicting_prayer?: string;
    prayer_time?: string;
    minutes_until_prayer?: number;
  }> {
    try {
      const prayerTimes = await this.prayerTimeService.getPrayerTimes(stateCode, time);
      const conflict = this.findPrayerConflict(time, prayerTimes.prayer_times);

      return conflict;
    } catch (error) {
      console.error('[LearningReminder] Failed to check prayer time conflict:', error);
      return { has_conflict: false };
    }
  }

  /**
   * Adjust reminder time if it conflicts with prayer time
   */
  private async adjustForPrayerTime(
    time: Date,
    stateCode: string
  ): Promise<{
    adjusted: boolean;
    adjusted_time: Date;
    conflicting_prayer?: string;
    reason: string;
  }> {
    const conflict = await this.checkPrayerTimeConflict(time, stateCode);

    if (!conflict.has_conflict) {
      return {
        adjusted: false,
        adjusted_time: time,
        reason: 'No prayer time conflict detected'
      };
    }

    // Adjust to after prayer time with buffer
    const prayerTimes = await this.prayerTimeService.getPrayerTimes(stateCode, time);
    const adjustedTime = this.calculateAdjustedTime(time, prayerTimes.prayer_times, conflict.conflicting_prayer!);

    return {
      adjusted: true,
      adjusted_time: adjustedTime,
      conflicting_prayer: conflict.conflicting_prayer,
      reason: `Reminder conflicts with ${conflict.conflicting_prayer} prayer time (±${this.PRAYER_BUFFER_MINUTES} min buffer). Adjusted to ${this.POST_PRAYER_DELAY_MINUTES} minutes after prayer.`
    };
  }

  /**
   * Find if time conflicts with any prayer time
   */
  private findPrayerConflict(
    time: Date,
    prayerTimes: PrayerTimes
  ): {
    has_conflict: boolean;
    conflicting_prayer?: string;
    prayer_time?: string;
    minutes_until_prayer?: number;
  } {
    const timeMinutes = time.getHours() * 60 + time.getMinutes();

    const prayers: Array<{ name: string; time: string }> = [
      { name: 'Fajr', time: prayerTimes.fajr },
      { name: 'Dhuhr', time: prayerTimes.dhuhr },
      { name: 'Asr', time: prayerTimes.asr },
      { name: 'Maghrib', time: prayerTimes.maghrib },
      { name: 'Isha', time: prayerTimes.isha }
    ];

    for (const prayer of prayers) {
      const [prayerHour, prayerMinute] = prayer.time.split(':').map(Number);
      const prayerMinutes = prayerHour * 60 + prayerMinute;
      const diffMinutes = Math.abs(timeMinutes - prayerMinutes);

      if (diffMinutes <= this.PRAYER_BUFFER_MINUTES) {
        return {
          has_conflict: true,
          conflicting_prayer: prayer.name,
          prayer_time: prayer.time,
          minutes_until_prayer: prayerMinutes - timeMinutes
        };
      }
    }

    return { has_conflict: false };
  }

  /**
   * Calculate adjusted time after prayer
   */
  private calculateAdjustedTime(
    originalTime: Date,
    prayerTimes: PrayerTimes,
    conflictingPrayer: string
  ): Date {
    const prayerTimeMap: Record<string, string> = {
      'Fajr': prayerTimes.fajr,
      'Dhuhr': prayerTimes.dhuhr,
      'Asr': prayerTimes.asr,
      'Maghrib': prayerTimes.maghrib,
      'Isha': prayerTimes.isha
    };

    const prayerTimeStr = prayerTimeMap[conflictingPrayer];
    if (!prayerTimeStr) {
      return originalTime;
    }

    const [prayerHour, prayerMinute] = prayerTimeStr.split(':').map(Number);

    // Create new date with same day but adjusted time
    const adjustedTime = new Date(originalTime);
    adjustedTime.setHours(prayerHour, prayerMinute, 0, 0);

    // Add post-prayer delay
    adjustedTime.setMinutes(adjustedTime.getMinutes() + this.POST_PRAYER_DELAY_MINUTES);

    return adjustedTime;
  }

  /**
   * Get user's cultural preferences (mock implementation)
   * In production, this would fetch from database
   */
  private async getUserCulturalPreferences(userId: string): Promise<CulturalPreferences | null> {
    try {
      // Mock implementation - in production, fetch from database
      // For now, return null to indicate no preferences found
      // The actual implementation would use the culturalPreferenceService
      return null;
    } catch (error) {
      console.error('[LearningReminder] Failed to get cultural preferences:', error);
      return null;
    }
  }

  /**
   * Batch schedule multiple reminders
   */
  async batchScheduleReminders(
    requests: ReminderScheduleRequest[]
  ): Promise<ReminderScheduleResult[]> {
    const results: ReminderScheduleResult[] = [];

    for (const request of requests) {
      try {
        const result = await this.scheduleLearningReminder(request);
        results.push(result);
      } catch (error) {
        console.error('[LearningReminder] Failed to schedule reminder:', error);
        // Continue with other reminders even if one fails
      }
    }

    return results;
  }

  /**
   * Get optimal learning times for a user
   * Returns time slots that avoid prayer times
   */
  async getOptimalLearningTimes(
    userId: string,
    date: Date,
    stateCode: string
  ): Promise<Array<{ start: string; end: string; label: string }>> {
    try {
      const prayerTimes = await this.prayerTimeService.getPrayerTimes(stateCode, date);
      const optimalTimes: Array<{ start: string; end: string; label: string }> = [];

      // Morning slot (after Fajr, before Dhuhr)
      const fajrHour = parseInt(prayerTimes.prayer_times.fajr.split(':')[0]);
      const dhuhrHour = parseInt(prayerTimes.prayer_times.dhuhr.split(':')[0]);

      if (fajrHour + 1 < dhuhrHour - 1) {
        optimalTimes.push({
          start: `${String(fajrHour + 1).padStart(2, '0')}:00`,
          end: `${String(dhuhrHour - 1).padStart(2, '0')}:00`,
          label: 'Morning Learning Window'
        });
      }

      // Afternoon slot (after Dhuhr, before Asr)
      const asrHour = parseInt(prayerTimes.prayer_times.asr.split(':')[0]);

      if (dhuhrHour + 1 < asrHour - 1) {
        optimalTimes.push({
          start: `${String(dhuhrHour + 1).padStart(2, '0')}:00`,
          end: `${String(asrHour - 1).padStart(2, '0')}:00`,
          label: 'Afternoon Learning Window'
        });
      }

      // Evening slot (after Maghrib, before Isha)
      const maghribHour = parseInt(prayerTimes.prayer_times.maghrib.split(':')[0]);
      const ishaHour = parseInt(prayerTimes.prayer_times.isha.split(':')[0]);

      if (maghribHour + 1 < ishaHour) {
        optimalTimes.push({
          start: `${String(maghribHour + 1).padStart(2, '0')}:00`,
          end: `${String(ishaHour).padStart(2, '0')}:00`,
          label: 'Evening Learning Window'
        });
      }

      return optimalTimes;
    } catch (error) {
      console.error('[LearningReminder] Failed to get optimal learning times:', error);
      return [];
    }
  }

  /**
   * Cancel a scheduled reminder
   */
  async cancelReminder(reminderId: string): Promise<boolean> {
    try {
      // In production, this would update database
      console.log(`[LearningReminder] Cancelled reminder ${reminderId}`);
      return true;
    } catch (error) {
      console.error('[LearningReminder] Failed to cancel reminder:', error);
      return false;
    }
  }

  /**
   * Reschedule an existing reminder
   */
  async rescheduleReminder(
    reminderId: string,
    newTime: Date
  ): Promise<ReminderScheduleResult | null> {
    try {
      // In production, fetch existing reminder from database
      // For now, create new schedule request
      console.log(`[LearningReminder] Rescheduling reminder ${reminderId} to ${this.formatTime(newTime)}`);

      // This would need the userId from the existing reminder
      // Simplified for now
      return null;
    } catch (error) {
      console.error('[LearningReminder] Failed to reschedule reminder:', error);
      return null;
    }
  }

  // Helper methods

  private generateReminderId(): string {
    return `reminder_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  private formatTime(date: Date): string {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  }
}

export default LearningReminderService;
