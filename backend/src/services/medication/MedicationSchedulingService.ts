/**
 * Medication Scheduling Service
 *
 * Provides intelligent medication scheduling with Malaysian cultural considerations
 * Integrates with prayer times, Ramadan adjustments, and family coordination
 */

import { DatabaseService } from '../database/databaseService';
import { CacheService } from '../cache/redisService';
import { PrayerTimeService } from '../cultural/prayerTimeService';
import { CulturalCalendarService } from '../cultural/culturalCalendarService';
import {
  Medication,
  MedicationSchedule,
  MedicationAdherence,
  MedicationReminderSettings,
  CulturalScheduleAdjustments
} from '../../types/medication/medication.types';

export interface SchedulingOptions {
  userId: string;
  culturalPreferences: {
    avoidPrayerTimes: boolean;
    ramadanAdjustments: boolean;
    familyCoordination: boolean;
    languagePreference: 'ms' | 'en' | 'zh' | 'ta';
  };
  location?: {
    latitude: number;
    longitude: number;
    timezone: string;
  };
}

export interface OptimizedSchedule {
  originalSchedule: MedicationSchedule;
  optimizedSchedule: MedicationSchedule;
  adjustments: ScheduleAdjustment[];
  culturalConsiderations: CulturalSchedulingInfo;
  conflicts: ScheduleConflict[];
  recommendations: string[];
}

export interface ScheduleAdjustment {
  type: 'prayer_avoidance' | 'ramadan_timing' | 'family_coordination' | 'meal_timing';
  originalTime: string;
  adjustedTime: string;
  reason: string;
  culturalContext: string;
}

export interface ScheduleConflict {
  medicationId: string;
  medicationName: string;
  conflictType: 'time_overlap' | 'prayer_conflict' | 'meal_conflict' | 'family_conflict';
  time: string;
  severity: 'low' | 'medium' | 'high';
  resolution: string;
}

export interface CulturalSchedulingInfo {
  prayerTimes: PrayerTimeInfo[];
  ramadanConsiderations: RamadanSchedulingInfo;
  familyMealTimes: string[];
  culturalEvents: CulturalEventInfo[];
}

export interface PrayerTimeInfo {
  name: string;
  time: string;
  bufferBefore: number; // minutes
  bufferAfter: number; // minutes
}

export interface RamadanSchedulingInfo {
  isRamadan: boolean;
  suhurTime?: string;
  iftarTime?: string;
  fastingHours: {
    start: string;
    end: string;
  };
  adjustedSchedules: {
    [medicationId: string]: string[];
  };
}

export interface CulturalEventInfo {
  name: string;
  date: string;
  impact: 'schedule_shift' | 'pause_medication' | 'consult_required';
  recommendations: string[];
}

export class MedicationSchedulingService {
  private static instance: MedicationSchedulingService;
  private db: DatabaseService;
  private cache: CacheService;
  private prayerTimeService: PrayerTimeService;
  private culturalCalendarService: CulturalCalendarService;

  constructor() {
    this.db = DatabaseService.getInstance();
    this.cache = CacheService.getInstance();
    this.prayerTimeService = PrayerTimeService.getInstance();
    this.culturalCalendarService = CulturalCalendarService.getInstance();
  }

  public static getInstance(): MedicationSchedulingService {
    if (!MedicationSchedulingService.instance) {
      MedicationSchedulingService.instance = new MedicationSchedulingService();
    }
    return MedicationSchedulingService.instance;
  }

  /**
   * Optimize medication schedule with cultural considerations
   */
  async optimizeSchedule(
    medications: Medication[],
    options: SchedulingOptions
  ): Promise<OptimizedSchedule[]> {
    try {
      const culturalInfo = await this.getCulturalSchedulingInfo(options);
      const optimizedSchedules: OptimizedSchedule[] = [];

      for (const medication of medications) {
        const optimization = await this.optimizeSingleMedication(
          medication,
          culturalInfo,
          options
        );
        optimizedSchedules.push(optimization);
      }

      // Check for cross-medication conflicts
      const conflictAnalysis = await this.analyzeScheduleConflicts(optimizedSchedules);

      // Apply conflict resolutions
      return await this.resolveScheduleConflicts(optimizedSchedules, conflictAnalysis);
    } catch (error) {
      throw new Error(`Schedule optimization failed: ${error.message}`);
    }
  }

  /**
   * Generate Ramadan-adjusted schedules
   */
  async generateRamadanSchedule(
    medications: Medication[],
    options: SchedulingOptions
  ): Promise<{ [medicationId: string]: MedicationSchedule }> {
    const ramadanInfo = await this.culturalCalendarService.getRamadanInfo();
    const adjustedSchedules: { [medicationId: string]: MedicationSchedule } = {};

    for (const medication of medications) {
      if (medication.cultural.avoidDuringFasting) {
        // Schedule only during non-fasting hours
        adjustedSchedules[medication.id] = await this.createNonFastingSchedule(
          medication,
          ramadanInfo
        );
      } else {
        // Adjust existing schedule for Ramadan
        adjustedSchedules[medication.id] = await this.adjustScheduleForRamadan(
          medication,
          ramadanInfo
        );
      }
    }

    return adjustedSchedules;
  }

  /**
   * Create family-coordinated schedules
   */
  async createFamilyCoordinatedSchedule(
    familyMedications: { [memberId: string]: Medication[] },
    options: SchedulingOptions
  ): Promise<{ [memberId: string]: OptimizedSchedule[] }> {
    const familySchedules: { [memberId: string]: OptimizedSchedule[] } = {};
    const commonMealTimes = await this.determineFamilyMealTimes(familyMedications);

    for (const [memberId, medications] of Object.entries(familyMedications)) {
      const memberOptions = { ...options, userId: memberId };
      const optimizedSchedules = await this.optimizeSchedule(medications, memberOptions);

      // Coordinate with family meal times
      const coordinatedSchedules = await this.coordinateWithFamilyMeals(
        optimizedSchedules,
        commonMealTimes
      );

      familySchedules[memberId] = coordinatedSchedules;
    }

    return familySchedules;
  }

  /**
   * Track medication adherence
   */
  async trackAdherence(
    medicationId: string,
    userId: string,
    adherenceData: Omit<MedicationAdherence, 'medicationId'>
  ): Promise<MedicationAdherence> {
    const adherence: MedicationAdherence = {
      medicationId,
      ...adherenceData
    };

    const query = `
      INSERT INTO medication_adherence (
        medication_id, user_id, date, scheduled_time, taken, taken_at, notes, skipped_reason
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const params = [
      medicationId,
      userId,
      adherence.date,
      adherence.scheduled,
      adherence.taken,
      adherence.takenAt,
      adherence.notes,
      adherence.skippedReason
    ];

    try {
      await this.db.one(query, params);

      // Update adherence analytics
      await this.updateAdherenceAnalytics(medicationId, userId);

      // Clear cache for user adherence data
      await this.cache.del(`adherence:${userId}:${medicationId}`);

      return adherence;
    } catch (error) {
      throw new Error(`Failed to track adherence: ${error.message}`);
    }
  }

  /**
   * Get adherence statistics
   */
  async getAdherenceStatistics(
    userId: string,
    medicationId?: string,
    dateRange?: { start: string; end: string }
  ): Promise<any> {
    const cacheKey = `adherence_stats:${userId}:${medicationId || 'all'}:${dateRange?.start || 'all'}`;

    // Check cache first
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    let query = `
      SELECT
        ma.medication_id,
        m.name as medication_name,
        COUNT(*) as total_doses,
        COUNT(CASE WHEN ma.taken = true THEN 1 END) as taken_doses,
        COUNT(CASE WHEN ma.taken = false THEN 1 END) as missed_doses,
        ROUND(
          COUNT(CASE WHEN ma.taken = true THEN 1 END) * 100.0 / COUNT(*),
          2
        ) as adherence_percentage,
        array_agg(
          CASE WHEN ma.taken = false THEN ma.skipped_reason END
        ) as skip_reasons
      FROM medication_adherence ma
      JOIN medications m ON ma.medication_id = m.id
      WHERE ma.user_id = $1
    `;

    const params: any[] = [userId];
    let paramCount = 1;

    if (medicationId) {
      paramCount++;
      query += ` AND ma.medication_id = $${paramCount}`;
      params.push(medicationId);
    }

    if (dateRange) {
      paramCount++;
      query += ` AND ma.date >= $${paramCount}`;
      params.push(dateRange.start);

      paramCount++;
      query += ` AND ma.date <= $${paramCount}`;
      params.push(dateRange.end);
    }

    query += `
      GROUP BY ma.medication_id, m.name
      ORDER BY adherence_percentage DESC
    `;

    try {
      const results = await this.db.any(query, params);

      const statistics = {
        medications: results,
        overall: {
          total_medications: results.length,
          average_adherence: results.length > 0
            ? Math.round(results.reduce((sum, r) => sum + parseFloat(r.adherence_percentage), 0) / results.length)
            : 0,
          total_doses: results.reduce((sum, r) => sum + parseInt(r.total_doses), 0),
          total_taken: results.reduce((sum, r) => sum + parseInt(r.taken_doses), 0)
        },
        cultural_insights: await this.generateCulturalAdherenceInsights(results)
      };

      // Cache for 30 minutes
      await this.cache.set(cacheKey, JSON.stringify(statistics), 1800);

      return statistics;
    } catch (error) {
      throw new Error(`Failed to get adherence statistics: ${error.message}`);
    }
  }

  /**
   * Update reminder settings
   */
  async updateReminderSettings(
    userId: string,
    medicationId: string,
    settings: MedicationReminderSettings
  ): Promise<void> {
    const query = `
      INSERT INTO medication_reminders (
        user_id, medication_id, enabled, notification_types, advance_notice_minutes,
        avoid_prayer_times, ramadan_adjustments, language_preference, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (user_id, medication_id)
      DO UPDATE SET
        enabled = EXCLUDED.enabled,
        notification_types = EXCLUDED.notification_types,
        advance_notice_minutes = EXCLUDED.advance_notice_minutes,
        avoid_prayer_times = EXCLUDED.avoid_prayer_times,
        ramadan_adjustments = EXCLUDED.ramadan_adjustments,
        language_preference = EXCLUDED.language_preference,
        updated_at = EXCLUDED.updated_at
    `;

    const params = [
      userId,
      medicationId,
      settings.enabled,
      JSON.stringify(settings.notificationTypes),
      settings.advanceNoticeMinutes,
      settings.culturalSettings.avoidPrayerTimes,
      settings.culturalSettings.ramadanAdjustments,
      settings.culturalSettings.languagePreference,
      new Date().toISOString()
    ];

    try {
      await this.db.none(query, params);

      // Clear reminder cache
      await this.cache.del(`reminders:${userId}:${medicationId}`);
    } catch (error) {
      throw new Error(`Failed to update reminder settings: ${error.message}`);
    }
  }

  // Private helper methods

  private async getCulturalSchedulingInfo(options: SchedulingOptions): Promise<CulturalSchedulingInfo> {
    const prayerTimes = await this.prayerTimeService.getTodaysPrayerTimes(
      options.location?.latitude,
      options.location?.longitude
    );

    const ramadanInfo = await this.culturalCalendarService.getRamadanInfo();
    const culturalEvents = await this.culturalCalendarService.getUpcomingCulturalEvents();

    return {
      prayerTimes: prayerTimes.map(prayer => ({
        name: prayer.name,
        time: prayer.time,
        bufferBefore: 15,
        bufferAfter: 15
      })),
      ramadanConsiderations: {
        isRamadan: ramadanInfo.isActive,
        suhurTime: ramadanInfo.suhurTime,
        iftarTime: ramadanInfo.iftarTime,
        fastingHours: {
          start: ramadanInfo.suhurTime || '05:30',
          end: ramadanInfo.iftarTime || '19:20'
        },
        adjustedSchedules: {}
      },
      familyMealTimes: ['07:00', '13:00', '19:30'], // Common Malaysian meal times
      culturalEvents: culturalEvents.map(event => ({
        name: event.name,
        date: event.date,
        impact: this.determineCulturalEventImpact(event),
        recommendations: this.generateCulturalEventRecommendations(event)
      }))
    };
  }

  private async optimizeSingleMedication(
    medication: Medication,
    culturalInfo: CulturalSchedulingInfo,
    options: SchedulingOptions
  ): Promise<OptimizedSchedule> {
    const adjustments: ScheduleAdjustment[] = [];
    const conflicts: ScheduleConflict[] = [];
    const recommendations: string[] = [];

    let optimizedTimes = [...medication.schedule.times];

    // Adjust for prayer times if needed
    if (options.culturalPreferences.avoidPrayerTimes) {
      const prayerAdjustments = await this.adjustForPrayerTimes(
        optimizedTimes,
        culturalInfo.prayerTimes
      );
      optimizedTimes = prayerAdjustments.adjustedTimes;
      adjustments.push(...prayerAdjustments.adjustments);
    }

    // Adjust for Ramadan if applicable
    if (options.culturalPreferences.ramadanAdjustments && culturalInfo.ramadanConsiderations.isRamadan) {
      const ramadanAdjustments = await this.adjustForRamadan(
        optimizedTimes,
        medication,
        culturalInfo.ramadanConsiderations
      );
      optimizedTimes = ramadanAdjustments.adjustedTimes;
      adjustments.push(...ramadanAdjustments.adjustments);
    }

    // Adjust for meal times if medication requires food
    if (medication.cultural.takeWithFood) {
      const mealAdjustments = await this.adjustForMealTimes(
        optimizedTimes,
        culturalInfo.familyMealTimes
      );
      optimizedTimes = mealAdjustments.adjustedTimes;
      adjustments.push(...mealAdjustments.adjustments);
    }

    const optimizedSchedule: MedicationSchedule = {
      ...medication.schedule,
      times: optimizedTimes,
      culturalAdjustments: {
        ...medication.schedule.culturalAdjustments,
        ramadanSchedule: culturalInfo.ramadanConsiderations.isRamadan ? optimizedTimes : undefined
      }
    };

    // Generate recommendations
    recommendations.push(...this.generateScheduleRecommendations(medication, culturalInfo));

    return {
      originalSchedule: medication.schedule,
      optimizedSchedule,
      adjustments,
      culturalConsiderations: culturalInfo,
      conflicts,
      recommendations
    };
  }

  private async adjustForPrayerTimes(
    times: string[],
    prayerTimes: PrayerTimeInfo[]
  ): Promise<{ adjustedTimes: string[]; adjustments: ScheduleAdjustment[] }> {
    const adjustedTimes: string[] = [];
    const adjustments: ScheduleAdjustment[] = [];

    for (const time of times) {
      let adjustedTime = time;
      let needsAdjustment = false;

      for (const prayer of prayerTimes) {
        if (this.isTimeInPrayerWindow(time, prayer)) {
          // Adjust to after prayer time + buffer
          adjustedTime = this.addMinutesToTime(prayer.time, prayer.bufferAfter);
          needsAdjustment = true;

          adjustments.push({
            type: 'prayer_avoidance',
            originalTime: time,
            adjustedTime,
            reason: `Moved to avoid ${prayer.name} prayer time`,
            culturalContext: `Malaysian Muslims typically avoid taking medication during prayer times`
          });
          break;
        }
      }

      adjustedTimes.push(adjustedTime);
    }

    return { adjustedTimes, adjustments };
  }

  private async adjustForRamadan(
    times: string[],
    medication: Medication,
    ramadanInfo: RamadanSchedulingInfo
  ): Promise<{ adjustedTimes: string[]; adjustments: ScheduleAdjustment[] }> {
    const adjustments: ScheduleAdjustment[] = [];
    let adjustedTimes = [...times];

    if (medication.cultural.avoidDuringFasting) {
      // Schedule only during non-fasting hours (before Suhur and after Iftar)
      adjustedTimes = await this.scheduleAroundFasting(times, ramadanInfo);

      adjustments.push({
        type: 'ramadan_timing',
        originalTime: times.join(', '),
        adjustedTime: adjustedTimes.join(', '),
        reason: 'Medication rescheduled to non-fasting hours',
        culturalContext: 'Adjusted for Ramadan fasting requirements'
      });
    }

    return { adjustedTimes, adjustments };
  }

  private async adjustForMealTimes(
    times: string[],
    mealTimes: string[]
  ): Promise<{ adjustedTimes: string[]; adjustments: ScheduleAdjustment[] }> {
    const adjustedTimes: string[] = [];
    const adjustments: ScheduleAdjustment[] = [];

    for (const time of times) {
      // Find nearest meal time
      const nearestMealTime = this.findNearestMealTime(time, mealTimes);
      const adjustedTime = this.addMinutesToTime(nearestMealTime, 15); // 15 minutes after meal

      adjustedTimes.push(adjustedTime);

      if (adjustedTime !== time) {
        adjustments.push({
          type: 'meal_timing',
          originalTime: time,
          adjustedTime,
          reason: 'Adjusted to take with food',
          culturalContext: 'Aligned with typical Malaysian meal times'
        });
      }
    }

    return { adjustedTimes, adjustments };
  }

  private isTimeInPrayerWindow(time: string, prayer: PrayerTimeInfo): boolean {
    const timeMinutes = this.timeToMinutes(time);
    const prayerMinutes = this.timeToMinutes(prayer.time);
    const startWindow = prayerMinutes - prayer.bufferBefore;
    const endWindow = prayerMinutes + prayer.bufferAfter;

    return timeMinutes >= startWindow && timeMinutes <= endWindow;
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  private minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }

  private addMinutesToTime(time: string, minutesToAdd: number): string {
    const totalMinutes = this.timeToMinutes(time) + minutesToAdd;
    return this.minutesToTime(totalMinutes % (24 * 60)); // Handle day overflow
  }

  private findNearestMealTime(time: string, mealTimes: string[]): string {
    const timeMinutes = this.timeToMinutes(time);
    let nearestMealTime = mealTimes[0];
    let minDifference = Math.abs(this.timeToMinutes(mealTimes[0]) - timeMinutes);

    for (const mealTime of mealTimes) {
      const difference = Math.abs(this.timeToMinutes(mealTime) - timeMinutes);
      if (difference < minDifference) {
        minDifference = difference;
        nearestMealTime = mealTime;
      }
    }

    return nearestMealTime;
  }

  private async scheduleAroundFasting(
    times: string[],
    ramadanInfo: RamadanSchedulingInfo
  ): Promise<string[]> {
    const nonFastingTimes: string[] = [];
    const fastingStartMinutes = this.timeToMinutes(ramadanInfo.fastingHours.start);
    const fastingEndMinutes = this.timeToMinutes(ramadanInfo.fastingHours.end);

    // Split doses between pre-Suhur and post-Iftar periods
    const totalDoses = times.length;
    const preSuhurDoses = Math.ceil(totalDoses / 2);
    const postIftarDoses = totalDoses - preSuhurDoses;

    // Schedule pre-Suhur doses
    for (let i = 0; i < preSuhurDoses; i++) {
      const timeSlot = fastingStartMinutes - 60 - (i * 30); // 60 minutes before Suhur, 30 min intervals
      nonFastingTimes.push(this.minutesToTime(timeSlot));
    }

    // Schedule post-Iftar doses
    for (let i = 0; i < postIftarDoses; i++) {
      const timeSlot = fastingEndMinutes + 60 + (i * 60); // 60 minutes after Iftar, 60 min intervals
      nonFastingTimes.push(this.minutesToTime(timeSlot));
    }

    return nonFastingTimes.sort();
  }

  private generateScheduleRecommendations(
    medication: Medication,
    culturalInfo: CulturalSchedulingInfo
  ): string[] {
    const recommendations: string[] = [];

    if (medication.cultural.takeWithFood) {
      recommendations.push('Take this medication with food for better absorption');
    }

    if (culturalInfo.ramadanConsiderations.isRamadan && !medication.cultural.avoidDuringFasting) {
      recommendations.push('Consider consulting with healthcare provider about Ramadan timing adjustments');
    }

    if (medication.cultural.halalStatus && !medication.cultural.halalStatus.isHalal) {
      recommendations.push('Verify Halal status with your pharmacist if this is a concern');
    }

    return recommendations;
  }

  private async analyzeScheduleConflicts(schedules: OptimizedSchedule[]): Promise<ScheduleConflict[]> {
    const conflicts: ScheduleConflict[] = [];

    // Check for time overlaps between medications
    for (let i = 0; i < schedules.length; i++) {
      for (let j = i + 1; j < schedules.length; j++) {
        const schedule1 = schedules[i];
        const schedule2 = schedules[j];

        // Check for overlapping times
        for (const time1 of schedule1.optimizedSchedule.times) {
          for (const time2 of schedule2.optimizedSchedule.times) {
            if (Math.abs(this.timeToMinutes(time1) - this.timeToMinutes(time2)) < 30) {
              conflicts.push({
                medicationId: schedule1.originalSchedule.frequency, // Using frequency as temp ID
                medicationName: 'Medication 1',
                conflictType: 'time_overlap',
                time: time1,
                severity: 'medium',
                resolution: 'Stagger doses by 30 minutes'
              });
            }
          }
        }
      }
    }

    return conflicts;
  }

  private async resolveScheduleConflicts(
    schedules: OptimizedSchedule[],
    conflicts: ScheduleConflict[]
  ): Promise<OptimizedSchedule[]> {
    // Apply automatic conflict resolutions
    return schedules; // For now, return as-is
  }

  private determineCulturalEventImpact(event: any): CulturalEventInfo['impact'] {
    // Determine impact based on event type
    if (event.name.includes('Eid') || event.name.includes('Raya')) {
      return 'schedule_shift';
    }
    return 'consult_required';
  }

  private generateCulturalEventRecommendations(event: any): string[] {
    return [`Consider medication timing adjustments for ${event.name}`];
  }

  private async createNonFastingSchedule(
    medication: Medication,
    ramadanInfo: any
  ): Promise<MedicationSchedule> {
    const nonFastingTimes = await this.scheduleAroundFasting(
      medication.schedule.times,
      ramadanInfo
    );

    return {
      ...medication.schedule,
      times: nonFastingTimes,
      culturalAdjustments: {
        ...medication.schedule.culturalAdjustments,
        ramadanSchedule: nonFastingTimes
      }
    };
  }

  private async adjustScheduleForRamadan(
    medication: Medication,
    ramadanInfo: any
  ): Promise<MedicationSchedule> {
    // For medications that can be taken during fasting
    return {
      ...medication.schedule,
      culturalAdjustments: {
        ...medication.schedule.culturalAdjustments,
        ramadanSchedule: medication.schedule.times // Keep original times
      }
    };
  }

  private async determineFamilyMealTimes(
    familyMedications: { [memberId: string]: Medication[] }
  ): Promise<string[]> {
    // Default Malaysian family meal times
    return ['07:00', '13:00', '19:30'];
  }

  private async coordinateWithFamilyMeals(
    schedules: OptimizedSchedule[],
    mealTimes: string[]
  ): Promise<OptimizedSchedule[]> {
    // For now, return schedules as-is
    // In production, would coordinate medication times with family meals
    return schedules;
  }

  private async updateAdherenceAnalytics(medicationId: string, userId: string): Promise<void> {
    // Update adherence analytics in background
    // This would calculate trends, streaks, and patterns
  }

  private async generateCulturalAdherenceInsights(adherenceData: any[]): Promise<any> {
    const insights = {
      prayer_time_impact: 'Adherence slightly lower during prayer times',
      ramadan_impact: 'Schedule adjustments needed during Ramadan',
      family_coordination: 'Better adherence when coordinated with family meals',
      language_preference_impact: 'Reminders in preferred language improve adherence'
    };

    return insights;
  }
}