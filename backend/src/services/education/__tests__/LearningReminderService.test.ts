/**
 * Learning Reminder Service Tests
 * Tests prayer time conflict detection and reminder adjustment
 */

import { LearningReminderService } from '../LearningReminderService';
import { PrayerTimeService, PrayerTimes } from '../../cultural/prayerTimeService';
import { CulturalPreferenceService } from '../../cultural/culturalPreferenceService';

describe('LearningReminderService', () => {
  let service: LearningReminderService;
  let mockPrayerService: jest.Mocked<PrayerTimeService>;
  let mockCulturalService: jest.Mocked<CulturalPreferenceService>;

  const mockPrayerTimes: PrayerTimes = {
    fajr: '05:45',
    syuruk: '07:05',
    dhuhr: '13:15',
    asr: '16:30',
    maghrib: '19:20',
    isha: '20:35'
  };

  beforeEach(() => {
    // Create mock services
    mockPrayerService = {
      getPrayerTimes: jest.fn().mockResolvedValue({
        date: '2025-10-03',
        hijri_date: '1447-04-01',
        location: 'Kuala Lumpur',
        state_code: 'KUL',
        zone: 'WLY01',
        prayer_times: mockPrayerTimes,
        qibla_direction: '292.5°',
        next_prayer: {
          name: 'dhuhr',
          time: '13:15',
          minutes_until: 120
        },
        source: 'calculated'
      }),
      getCurrentPrayerStatus: jest.fn(),
      isPrayerTime: jest.fn(),
      getRamadanAdjustments: jest.fn()
    } as any;

    mockCulturalService = {
      createCulturalProfile: jest.fn().mockResolvedValue({
        user_id: 'test_user',
        religion: 'Islam',
        ethnicity: 'Malay',
        primary_language: 'ms',
        secondary_languages: ['en'],
        state_code: 'KUL',
        region: 'Kuala Lumpur',
        religious_observance_level: 'moderate',
        prayer_time_notifications: true,
        cultural_calendar_integration: true,
        halal_requirements: true,
        vegetarian_preference: false,
        dietary_restrictions: [],
        ramadan_fasting: true,
        cultural_interpreter_needed: false,
        family_involvement_level: 'moderate',
        traditional_medicine_interest: false,
        cultural_greetings: true,
        religious_considerations_in_communication: true,
        cultural_sensitivity_required: true,
        cultural_flexibility_in_emergencies: true,
        religious_exemptions_for_medical_care: true,
        created_at: new Date(),
        updated_at: new Date()
      }),
      isInitialized: jest.fn().mockReturnValue(true),
      initialize: jest.fn().mockResolvedValue(undefined)
    } as any;

    service = new LearningReminderService(mockCulturalService, mockPrayerService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Prayer Time Conflict Detection', () => {
    it('should detect conflict when reminder is within 30 minutes before prayer', () => {
      const reminderTime = '13:00'; // 15 minutes before Dhuhr (13:15)
      const conflict = service.checkPrayerTimeConflict(reminderTime, mockPrayerTimes);

      expect(conflict).not.toBeNull();
      expect(conflict?.conflicts).toBe(true);
      expect(conflict?.prayer_name).toBe('Dhuhr');
      expect(conflict?.prayer_time).toBe('13:15');
    });

    it('should detect conflict when reminder is within 30 minutes after prayer', () => {
      const reminderTime = '13:40'; // 25 minutes after Dhuhr (13:15)
      const conflict = service.checkPrayerTimeConflict(reminderTime, mockPrayerTimes);

      expect(conflict).not.toBeNull();
      expect(conflict?.conflicts).toBe(true);
      expect(conflict?.prayer_name).toBe('Dhuhr');
    });

    it('should not detect conflict when reminder is more than 30 minutes from prayer', () => {
      const reminderTime = '14:00'; // 45 minutes after Dhuhr (13:15)
      const conflict = service.checkPrayerTimeConflict(reminderTime, mockPrayerTimes);

      expect(conflict).toBeNull();
    });

    it('should detect conflict for Fajr prayer', () => {
      const reminderTime = '05:30'; // 15 minutes before Fajr (05:45)
      const conflict = service.checkPrayerTimeConflict(reminderTime, mockPrayerTimes);

      expect(conflict).not.toBeNull();
      expect(conflict?.prayer_name).toBe('Fajr');
    });

    it('should detect conflict for Maghrib prayer', () => {
      const reminderTime = '19:35'; // 15 minutes after Maghrib (19:20)
      const conflict = service.checkPrayerTimeConflict(reminderTime, mockPrayerTimes);

      expect(conflict).not.toBeNull();
      expect(conflict?.prayer_name).toBe('Maghrib');
    });

    it('should detect conflict for Isha prayer', () => {
      const reminderTime = '20:50'; // 15 minutes after Isha (20:35)
      const conflict = service.checkPrayerTimeConflict(reminderTime, mockPrayerTimes);

      expect(conflict).not.toBeNull();
      expect(conflict?.prayer_name).toBe('Isha');
    });
  });

  describe('Reminder Time Adjustment', () => {
    it('should adjust reminder to 30 minutes after prayer when conflicting', () => {
      const preferredTime = '13:00'; // Before Dhuhr (13:15)
      const adjustedTime = service.adjustForPrayerTime(
        preferredTime,
        mockPrayerTimes,
        'Dhuhr'
      );

      expect(adjustedTime).toBe('13:45'); // 13:15 + 30 minutes
    });

    it('should adjust reminder for Fajr prayer', () => {
      const preferredTime = '05:30'; // Before Fajr (05:45)
      const adjustedTime = service.adjustForPrayerTime(
        preferredTime,
        mockPrayerTimes,
        'Fajr'
      );

      expect(adjustedTime).toBe('06:15'); // 05:45 + 30 minutes
    });

    it('should adjust reminder for Maghrib prayer', () => {
      const preferredTime = '19:10'; // Before Maghrib (19:20)
      const adjustedTime = service.adjustForPrayerTime(
        preferredTime,
        mockPrayerTimes,
        'Maghrib'
      );

      expect(adjustedTime).toBe('19:50'); // 19:20 + 30 minutes
    });

    it('should handle reminder after prayer but within buffer', () => {
      const preferredTime = '13:40'; // After Dhuhr (13:15) but within buffer
      const adjustedTime = service.adjustForPrayerTime(
        preferredTime,
        mockPrayerTimes,
        'Dhuhr'
      );

      expect(adjustedTime).toBe('13:45'); // Should still push to 30 minutes after prayer
    });
  });

  describe('Schedule Learning Reminder', () => {
    it('should schedule reminder without adjustment when no prayer conflict', async () => {
      const response = await service.scheduleLearningReminder({
        user_id: 'test_user',
        preferred_time: '14:00' // No conflict with any prayer
      });

      expect(response.was_adjusted).toBe(false);
      expect(response.reminder.preferred_time).toBe('14:00');
      expect(response.reminder.actual_time).toBe('14:00');
      expect(response.reminder.adjusted_for_prayer).toBe(false);
      expect(response.adjustment_details).toBeUndefined();
    });

    it('should schedule reminder with adjustment when prayer conflict exists', async () => {
      const response = await service.scheduleLearningReminder({
        user_id: 'test_user',
        preferred_time: '13:00' // Conflicts with Dhuhr (13:15)
      });

      expect(response.was_adjusted).toBe(true);
      expect(response.reminder.preferred_time).toBe('13:00');
      expect(response.reminder.actual_time).toBe('13:45'); // Adjusted to after prayer
      expect(response.reminder.adjusted_for_prayer).toBe(true);
      expect(response.adjustment_details).toBeDefined();
      expect(response.adjustment_details?.original_time).toBe('13:00');
      expect(response.adjustment_details?.adjusted_time).toBe('13:45');
      expect(response.adjustment_details?.conflicting_prayer).toBe('Dhuhr');
    });

    it('should include adjustment reason in reminder', async () => {
      const response = await service.scheduleLearningReminder({
        user_id: 'test_user',
        preferred_time: '05:30' // Conflicts with Fajr (05:45)
      });

      expect(response.reminder.adjustment_reason).toContain('Fajr');
      expect(response.reminder.adjustment_reason).toContain('05:45');
    });

    it('should use custom title and body when provided', async () => {
      const response = await service.scheduleLearningReminder({
        user_id: 'test_user',
        preferred_time: '14:00',
        title: 'Custom Learning Reminder',
        body: 'Learn about your medications'
      });

      expect(response.reminder.title).toBe('Custom Learning Reminder');
      expect(response.reminder.body).toBe('Learn about your medications');
    });

    it('should use default title and body when not provided', async () => {
      const response = await service.scheduleLearningReminder({
        user_id: 'test_user',
        preferred_time: '14:00'
      });

      expect(response.reminder.title).toBe('Time to Learn');
      expect(response.reminder.body).toBe('Continue your health education journey');
    });

    it('should schedule for specific date when provided', async () => {
      const targetDate = new Date('2025-10-04T00:00:00Z');

      const response = await service.scheduleLearningReminder({
        user_id: 'test_user',
        preferred_time: '14:00',
        date: targetDate
      });

      expect(response.reminder.scheduled_for.getFullYear()).toBe(2025);
      expect(response.reminder.scheduled_for.getMonth()).toBe(9); // October (0-indexed)
      expect(response.reminder.scheduled_for.getDate()).toBe(4);
    });
  });

  describe('Reminder Management', () => {
    it('should retrieve user reminders', async () => {
      await service.scheduleLearningReminder({
        user_id: 'test_user',
        preferred_time: '14:00'
      });

      await service.scheduleLearningReminder({
        user_id: 'test_user',
        preferred_time: '10:00'
      });

      const reminders = await service.getUserReminders('test_user');

      expect(reminders).toHaveLength(2);
      expect(reminders[0].user_id).toBe('test_user');
    });

    it('should filter reminders by user', async () => {
      await service.scheduleLearningReminder({
        user_id: 'user1',
        preferred_time: '14:00'
      });

      await service.scheduleLearningReminder({
        user_id: 'user2',
        preferred_time: '10:00'
      });

      const user1Reminders = await service.getUserReminders('user1');
      const user2Reminders = await service.getUserReminders('user2');

      expect(user1Reminders).toHaveLength(1);
      expect(user2Reminders).toHaveLength(1);
      expect(user1Reminders[0].user_id).toBe('user1');
      expect(user2Reminders[0].user_id).toBe('user2');
    });

    it('should get reminder by ID', async () => {
      const response = await service.scheduleLearningReminder({
        user_id: 'test_user',
        preferred_time: '14:00'
      });

      const reminder = await service.getReminder(response.reminder.id);

      expect(reminder).not.toBeNull();
      expect(reminder?.id).toBe(response.reminder.id);
    });

    it('should cancel reminder', async () => {
      const response = await service.scheduleLearningReminder({
        user_id: 'test_user',
        preferred_time: '14:00'
      });

      const cancelled = await service.cancelReminder(response.reminder.id);

      expect(cancelled).toBe(true);

      const reminder = await service.getReminder(response.reminder.id);
      expect(reminder).toBeNull();
    });

    it('should get upcoming reminders', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      await service.scheduleLearningReminder({
        user_id: 'test_user',
        preferred_time: '14:00',
        date: tomorrow
      });

      const upcomingReminders = await service.getUpcomingReminders('test_user', 5);

      expect(upcomingReminders.length).toBeGreaterThan(0);
      expect(upcomingReminders[0].scheduled_for.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe('Service Statistics', () => {
    it('should track total reminders', async () => {
      await service.scheduleLearningReminder({
        user_id: 'test_user',
        preferred_time: '14:00'
      });

      await service.scheduleLearningReminder({
        user_id: 'test_user',
        preferred_time: '10:00'
      });

      const stats = service.getStats();
      expect(stats.total_reminders).toBe(2);
    });

    it('should track adjusted reminders', async () => {
      await service.scheduleLearningReminder({
        user_id: 'test_user',
        preferred_time: '13:00' // Will be adjusted
      });

      await service.scheduleLearningReminder({
        user_id: 'test_user',
        preferred_time: '14:00' // Won't be adjusted
      });

      const stats = service.getStats();
      expect(stats.adjusted_reminders).toBe(1);
    });

    it('should track active reminders', async () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      await service.scheduleLearningReminder({
        user_id: 'test_user',
        preferred_time: '14:00',
        date: tomorrow
      });

      const stats = service.getStats();
      expect(stats.active_reminders).toBe(1);
    });
  });

  describe('Non-Muslim Users', () => {
    beforeEach(() => {
      // Mock cultural service to return non-Muslim user
      mockCulturalService.createCulturalProfile = jest.fn().mockResolvedValue({
        user_id: 'test_user',
        religion: 'Buddhism',
        ethnicity: 'Chinese',
        primary_language: 'zh',
        secondary_languages: ['en'],
        state_code: 'KUL',
        region: 'Kuala Lumpur',
        religious_observance_level: 'moderate',
        prayer_time_notifications: false,
        cultural_calendar_integration: true,
        halal_requirements: false,
        vegetarian_preference: true,
        dietary_restrictions: [],
        ramadan_fasting: false,
        cultural_interpreter_needed: false,
        family_involvement_level: 'moderate',
        traditional_medicine_interest: true,
        cultural_greetings: true,
        religious_considerations_in_communication: true,
        cultural_sensitivity_required: true,
        cultural_flexibility_in_emergencies: true,
        religious_exemptions_for_medical_care: false,
        created_at: new Date(),
        updated_at: new Date()
      });
    });

    it('should not adjust reminders for non-Muslim users', async () => {
      const response = await service.scheduleLearningReminder({
        user_id: 'test_user',
        preferred_time: '13:00' // Would conflict with Dhuhr if Muslim
      });

      expect(response.was_adjusted).toBe(false);
      expect(response.reminder.preferred_time).toBe('13:00');
      expect(response.reminder.actual_time).toBe('13:00');
      expect(response.reminder.adjusted_for_prayer).toBe(false);
    });

    it('should not check prayer times for non-Muslim users', async () => {
      await service.scheduleLearningReminder({
        user_id: 'test_user',
        preferred_time: '13:00'
      });

      // Prayer service should not be called
      expect(mockPrayerService.getPrayerTimes).not.toHaveBeenCalled();
    });
  });
});
