/**
 * Learning Reminder Service
 * Schedules learning reminders while respecting cultural preferences
 * Integrates with prayer times to avoid scheduling conflicts
 */

import { PrayerTimeService, PrayerTimes } from '../cultural/prayerTimeService';
import { CulturalPreferenceService, CulturalPreferences } from '../cultural/culturalPreferenceService';

export interface LearningReminder {
  id: string;
  user_id: string;
  preferred_time: string; // HH:mm format
  actual_time: string; // HH:mm format (may differ from preferred if adjusted)
  title: string;
  body: string;
  scheduled_for: Date;
  adjusted_for_prayer: boolean;
  adjustment_reason?: string;
  created_at: Date;
  updated_at: Date;
}

export interface ScheduleReminderRequest {
  user_id: string;
  preferred_time: string; // HH:mm format
  title?: string;
  body?: string;
  date?: Date; // Defaults to today
}

export interface ScheduleReminderResponse {
  reminder: LearningReminder;
  was_adjusted: boolean;
  adjustment_details?: {
    original_time: string;
    adjusted_time: string;
    reason: string;
    conflicting_prayer?: string;
  };
}

export class LearningReminderService {
  private culturalService: CulturalPreferenceService;
  private prayerService: PrayerTimeService;
  private readonly PRAYER_BUFFER_MINUTES = 30;
  private reminders: Map<string, LearningReminder> = new Map();

  constructor(
    culturalService?: CulturalPreferenceService,
    prayerService?: PrayerTimeService
  ) {
    this.culturalService = culturalService || new CulturalPreferenceService();
    this.prayerService = prayerService || new PrayerTimeService();
  }

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    if (!this.culturalService.isInitialized()) {
      await this.culturalService.initialize();
    }
  }

  /**
   * Schedule learning reminder respecting cultural preferences
   */
  async scheduleLearningReminder(request: ScheduleReminderRequest): Promise<ScheduleReminderResponse> {
    const { user_id, preferred_time, title, body, date } = request;

    // Get user's cultural preferences
    const culturalPrefs = await this.getUserCulturalPreferences(user_id);

    // Default reminder content
    const reminderTitle = title || 'Time to Learn';
    const reminderBody = body || 'Continue your health education journey';

    // Target date for the reminder
    const targetDate = date || new Date();

    // Check if user is Muslim and respects prayer times
    if (culturalPrefs.religion === 'Islam' && culturalPrefs.prayer_time_notifications) {
      // Get prayer times for the user's state
      const prayerTimes = await this.prayerService.getPrayerTimes(
        culturalPrefs.state_code,
        targetDate
      );

      // Check if preferred time conflicts with prayer time
      const conflict = this.checkPrayerTimeConflict(preferred_time, prayerTimes.prayer_times);

      if (conflict) {
        // Adjust reminder to after prayer time
        const adjustedTime = this.adjustForPrayerTime(
          preferred_time,
          prayerTimes.prayer_times,
          conflict.prayer_name
        );

        const reminder = this.createReminder({
          user_id,
          preferred_time,
          actual_time: adjustedTime,
          title: reminderTitle,
          body: reminderBody,
          scheduled_for: this.combineDateAndTime(targetDate, adjustedTime),
          adjusted_for_prayer: true,
          adjustment_reason: `Adjusted to respect ${conflict.prayer_name} prayer time (${conflict.prayer_time})`
        });

        console.log(
          `[LearningReminder] Adjusted reminder from ${preferred_time} to ${adjustedTime} to respect ${conflict.prayer_name} prayer time`
        );

        this.reminders.set(reminder.id, reminder);

        return {
          reminder,
          was_adjusted: true,
          adjustment_details: {
            original_time: preferred_time,
            adjusted_time: adjustedTime,
            reason: `Reminder adjusted to avoid conflict with ${conflict.prayer_name} prayer time`,
            conflicting_prayer: conflict.prayer_name
          }
        };
      }
    }

    // No conflict, schedule as requested
    const reminder = this.createReminder({
      user_id,
      preferred_time,
      actual_time: preferred_time,
      title: reminderTitle,
      body: reminderBody,
      scheduled_for: this.combineDateAndTime(targetDate, preferred_time),
      adjusted_for_prayer: false
    });

    this.reminders.set(reminder.id, reminder);

    return {
      reminder,
      was_adjusted: false
    };
  }

  /**
   * Check if reminder falls within prayer time buffer
   */
  checkPrayerTimeConflict(
    reminderTime: string,
    prayerTimes: PrayerTimes
  ): { conflicts: boolean; prayer_name: string; prayer_time: string } | null {
    const reminderMinutes = this.timeToMinutes(reminderTime);

    const prayers = [
      { name: 'Fajr', time: prayerTimes.fajr },
      { name: 'Dhuhr', time: prayerTimes.dhuhr },
      { name: 'Asr', time: prayerTimes.asr },
      { name: 'Maghrib', time: prayerTimes.maghrib },
      { name: 'Isha', time: prayerTimes.isha }
    ];

    for (const prayer of prayers) {
      const prayerMinutes = this.timeToMinutes(prayer.time);
      const diffMinutes = Math.abs(reminderMinutes - prayerMinutes);

      if (diffMinutes <= this.PRAYER_BUFFER_MINUTES) {
        return {
          conflicts: true,
          prayer_name: prayer.name,
          prayer_time: prayer.time
        };
      }
    }

    return null;
  }

  /**
   * Adjust reminder time to after prayer time
   */
  adjustForPrayerTime(
    preferredTime: string,
    prayerTimes: PrayerTimes,
    conflictingPrayer: string
  ): string {
    const preferredMinutes = this.timeToMinutes(preferredTime);

    const prayers = [
      { name: 'Fajr', time: prayerTimes.fajr },
      { name: 'Dhuhr', time: prayerTimes.dhuhr },
      { name: 'Asr', time: prayerTimes.asr },
      { name: 'Maghrib', time: prayerTimes.maghrib },
      { name: 'Isha', time: prayerTimes.isha }
    ];

    // Find the conflicting prayer
    const conflictingPrayerObj = prayers.find(p => p.name === conflictingPrayer);
    if (!conflictingPrayerObj) {
      return preferredTime;
    }

    const prayerMinutes = this.timeToMinutes(conflictingPrayerObj.time);

    // If reminder is before or during prayer time, schedule after prayer + buffer
    if (preferredMinutes <= prayerMinutes + this.PRAYER_BUFFER_MINUTES) {
      const adjustedMinutes = prayerMinutes + this.PRAYER_BUFFER_MINUTES;
      return this.minutesToTime(adjustedMinutes);
    }

    // If reminder is after prayer time but within buffer, push it further
    const adjustedMinutes = prayerMinutes + this.PRAYER_BUFFER_MINUTES;
    return this.minutesToTime(adjustedMinutes);
  }

  /**
   * Get user's reminders
   */
  async getUserReminders(user_id: string): Promise<LearningReminder[]> {
    const userReminders: LearningReminder[] = [];

    for (const reminder of this.reminders.values()) {
      if (reminder.user_id === user_id) {
        userReminders.push(reminder);
      }
    }

    return userReminders.sort((a, b) =>
      a.scheduled_for.getTime() - b.scheduled_for.getTime()
    );
  }

  /**
   * Get reminder by ID
   */
  async getReminder(id: string): Promise<LearningReminder | null> {
    return this.reminders.get(id) || null;
  }

  /**
   * Cancel reminder
   */
  async cancelReminder(id: string): Promise<boolean> {
    return this.reminders.delete(id);
  }

  /**
   * Get upcoming reminders for a user
   */
  async getUpcomingReminders(user_id: string, limit: number = 5): Promise<LearningReminder[]> {
    const now = new Date();
    const userReminders = await this.getUserReminders(user_id);

    return userReminders
      .filter(r => r.scheduled_for > now)
      .slice(0, limit);
  }

  // Private helper methods

  private async getUserCulturalPreferences(user_id: string): Promise<CulturalPreferences> {
    // In production, this would fetch from database
    // For now, create a default profile
    const defaultPrefs = await this.culturalService.createCulturalProfile({
      user_id,
      religion: 'Islam',
      primary_language: 'ms',
      state_code: 'KUL',
      region: 'Kuala Lumpur',
      prayer_time_notifications: true
    });

    return defaultPrefs;
  }

  private createReminder(data: {
    user_id: string;
    preferred_time: string;
    actual_time: string;
    title: string;
    body: string;
    scheduled_for: Date;
    adjusted_for_prayer: boolean;
    adjustment_reason?: string;
  }): LearningReminder {
    return {
      id: this.generateId(),
      user_id: data.user_id,
      preferred_time: data.preferred_time,
      actual_time: data.actual_time,
      title: data.title,
      body: data.body,
      scheduled_for: data.scheduled_for,
      adjusted_for_prayer: data.adjusted_for_prayer,
      adjustment_reason: data.adjustment_reason,
      created_at: new Date(),
      updated_at: new Date()
    };
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60) % 24;
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  private combineDateAndTime(date: Date, time: string): Date {
    const [hours, minutes] = time.split(':').map(Number);
    const result = new Date(date);
    result.setHours(hours, minutes, 0, 0);
    return result;
  }

  private generateId(): string {
    return `reminder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get service statistics
   */
  getStats(): {
    total_reminders: number;
    adjusted_reminders: number;
    active_reminders: number;
  } {
    const now = new Date();
    let adjusted = 0;
    let active = 0;

    for (const reminder of this.reminders.values()) {
      if (reminder.adjusted_for_prayer) {
        adjusted++;
      }
      if (reminder.scheduled_for > now) {
        active++;
      }
    }

    return {
      total_reminders: this.reminders.size,
      adjusted_reminders: adjusted,
      active_reminders: active
    };
  }
}

export default LearningReminderService;
