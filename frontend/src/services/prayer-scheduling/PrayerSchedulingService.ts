/**
 * Prayer Scheduling Service
 * 
 * Service for integrating prayer times with medication scheduling.
 * Provides conflict detection, schedule optimization, and cultural
 * adjustments for Malaysian Muslim users.
 */

import PrayerTimeService, { 
  PrayerTimes, 
  MedicationSchedulingWindow, 
  PrayerConflict 
} from './PrayerTimeService';
import { MalaysianState, MALAYSIAN_STATES_DATA } from '../../types/cultural';
import { MedicationSchedule, CulturalAdjustments } from '../../types/medication';

export interface PrayerSchedulingConfig {
  enabled: boolean;
  bufferMinutes: number;
  avoidPrayerTimes: boolean;
  adjustForRamadan: boolean;
  madhab: 'shafi' | 'hanafi';
  location: {
    state: MalaysianState;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  };
}

export interface ScheduleOptimizationResult {
  optimizedTimes: Date[];
  conflicts: PrayerConflict[];
  warnings: string[];
  culturalNotes: string[];
  alternativeSuggestions: Date[];
  ramadanAdjustments?: {
    preRamadanTimes: Date[];
    ramadanTimes: Date[];
    postRamadanTimes: Date[];
  };
}

export interface PrayerTimeAvoidanceSettings {
  fajr: { avoid: boolean; bufferMinutes: number };
  dhuhr: { avoid: boolean; bufferMinutes: number };
  asr: { avoid: boolean; bufferMinutes: number };
  maghrib: { avoid: boolean; bufferMinutes: number };
  isha: { avoid: boolean; bufferMinutes: number };
}

export interface RamadanScheduleAdjustment {
  originalSchedule: Date[];
  adjustedSchedule: Date[];
  adjustmentReason: string[];
  suhoorWindow: { start: Date; end: Date };
  iftarWindow: { start: Date; end: Date };
  nightWindow: { start: Date; end: Date };
}

class PrayerSchedulingService {
  private static instance: PrayerSchedulingService;
  private prayerTimeService: PrayerTimeService;
  private defaultConfig: PrayerSchedulingConfig;

  private constructor() {
    this.prayerTimeService = PrayerTimeService.getInstance();
    this.defaultConfig = {
      enabled: true,
      bufferMinutes: 30,
      avoidPrayerTimes: true,
      adjustForRamadan: true,
      madhab: 'shafi',
      location: {
        state: 'kuala_lumpur',
        coordinates: {
          latitude: 3.139,
          longitude: 101.6869
        }
      }
    };
  }

  static getInstance(): PrayerSchedulingService {
    if (!PrayerSchedulingService.instance) {
      PrayerSchedulingService.instance = new PrayerSchedulingService();
    }
    return PrayerSchedulingService.instance;
  }

  /**
   * Optimize medication schedule to avoid prayer time conflicts
   */
  async optimizeMedicationSchedule(
    medicationTimes: Date[],
    config: Partial<PrayerSchedulingConfig> = {}
  ): Promise<ScheduleOptimizationResult> {
    const fullConfig = { ...this.defaultConfig, ...config };
    
    if (!fullConfig.enabled || !fullConfig.avoidPrayerTimes) {
      return {
        optimizedTimes: medicationTimes,
        conflicts: [],
        warnings: ['Prayer time integration is disabled'],
        culturalNotes: [],
        alternativeSuggestions: []
      };
    }

    try {
      // Get prayer times for the current date
      const date = new Date();
      const prayerTimes = await this.prayerTimeService.calculatePrayerTimes({
        latitude: fullConfig.location.coordinates.latitude,
        longitude: fullConfig.location.coordinates.longitude,
        date,
        madhab: fullConfig.madhab,
        method: 'jakim'
      });

      // Check for conflicts
      const conflicts = this.prayerTimeService.checkMedicationConflicts(
        medicationTimes,
        prayerTimes,
        fullConfig.bufferMinutes
      );

      // Generate optimized times
      const optimizedTimes = await this.generateOptimizedTimes(
        medicationTimes,
        prayerTimes,
        fullConfig
      );

      // Generate cultural notes and warnings
      const culturalNotes = this.generateCulturalNotes(conflicts, fullConfig);
      const warnings = this.generateWarnings(conflicts);
      const alternativeSuggestions = this.generateAlternativeSuggestions(
        conflicts,
        prayerTimes,
        fullConfig
      );

      // Handle Ramadan adjustments if enabled
      let ramadanAdjustments;
      if (fullConfig.adjustForRamadan) {
        ramadanAdjustments = await this.generateRamadanAdjustments(
          optimizedTimes,
          prayerTimes,
          fullConfig
        );
      }

      return {
        optimizedTimes,
        conflicts,
        warnings,
        culturalNotes,
        alternativeSuggestions,
        ramadanAdjustments
      };

    } catch (error) {
      console.error('Failed to optimize medication schedule:', error);
      
      return {
        optimizedTimes: medicationTimes,
        conflicts: [],
        warnings: ['Failed to calculate prayer times. Using original schedule.'],
        culturalNotes: [],
        alternativeSuggestions: []
      };
    }
  }

  /**
   * Get optimal medication scheduling windows for a given day
   */
  async getOptimalSchedulingWindows(
    date: Date,
    config: Partial<PrayerSchedulingConfig> = {}
  ): Promise<MedicationSchedulingWindow[]> {
    const fullConfig = { ...this.defaultConfig, ...config };
    
    const prayerTimes = await this.prayerTimeService.calculatePrayerTimes({
      latitude: fullConfig.location.coordinates.latitude,
      longitude: fullConfig.location.coordinates.longitude,
      date,
      madhab: fullConfig.madhab,
      method: 'jakim'
    });

    return this.prayerTimeService.getMedicationSchedulingWindows(
      prayerTimes,
      fullConfig.bufferMinutes,
      date
    );
  }

  /**
   * Generate culturally appropriate medication schedule
   */
  async generateCulturalSchedule(
    frequency: MedicationSchedule['frequency'],
    culturalAdjustments: CulturalAdjustments,
    config: Partial<PrayerSchedulingConfig> = {}
  ): Promise<{ schedule: Date[]; culturalNotes: string[] }> {
    const fullConfig = { ...this.defaultConfig, ...config };
    const date = new Date();
    
    // Get base schedule times based on frequency
    let baseTimes = this.getBaseScheduleTimes(frequency);
    
    if (fullConfig.enabled && culturalAdjustments.prayerTimeBuffer > 0) {
      // Get prayer times
      const prayerTimes = await this.prayerTimeService.calculatePrayerTimes({
        latitude: fullConfig.location.coordinates.latitude,
        longitude: fullConfig.location.coordinates.longitude,
        date,
        madhab: fullConfig.madhab,
        method: 'jakim'
      });

      // Adjust times to avoid prayer conflicts
      const scheduleResult = await this.optimizeMedicationSchedule(
        baseTimes.map(time => this.createDateFromTime(time, date)),
        { ...fullConfig, bufferMinutes: culturalAdjustments.prayerTimeBuffer }
      );

      return {
        schedule: scheduleResult.optimizedTimes,
        culturalNotes: [
          ...scheduleResult.culturalNotes,
          `Schedule optimized for ${fullConfig.madhab} madhab`,
          `Prayer time buffer: ${culturalAdjustments.prayerTimeBuffer} minutes`
        ]
      };
    }

    return {
      schedule: baseTimes.map(time => this.createDateFromTime(time, date)),
      culturalNotes: ['Standard schedule without prayer time adjustments']
    };
  }

  /**
   * Check if current time is during a prayer time
   */
  async isCurrentlyPrayerTime(
    config: Partial<PrayerSchedulingConfig> = {}
  ): Promise<{ isDuringPrayer: boolean; currentPrayer?: string; timeUntilNext?: number }> {
    const fullConfig = { ...this.defaultConfig, ...config };
    const now = new Date();
    
    const prayerTimes = await this.prayerTimeService.calculatePrayerTimes({
      latitude: fullConfig.location.coordinates.latitude,
      longitude: fullConfig.location.coordinates.longitude,
      date: now,
      madhab: fullConfig.madhab,
      method: 'jakim'
    });

    const prayers = [
      { name: 'fajr', time: prayerTimes.fajr },
      { name: 'dhuhr', time: prayerTimes.dhuhr },
      { name: 'asr', time: prayerTimes.asr },
      { name: 'maghrib', time: prayerTimes.maghrib },
      { name: 'isha', time: prayerTimes.isha }
    ];

    // Check if within buffer time of any prayer
    for (const prayer of prayers) {
      const timeDiff = Math.abs(now.getTime() - prayer.time.getTime()) / (1000 * 60);
      
      if (timeDiff <= fullConfig.bufferMinutes / 2) {
        const nextPrayer = this.prayerTimeService.getNextPrayer(prayerTimes, now);
        
        return {
          isDuringPrayer: true,
          currentPrayer: prayer.name,
          timeUntilNext: nextPrayer ? 
            Math.round((nextPrayer.time.getTime() - now.getTime()) / (1000 * 60)) : 
            undefined
        };
      }
    }

    const nextPrayer = this.prayerTimeService.getNextPrayer(prayerTimes, now);
    
    return {
      isDuringPrayer: false,
      timeUntilNext: nextPrayer ? 
        Math.round((nextPrayer.time.getTime() - now.getTime()) / (1000 * 60)) : 
        undefined
    };
  }

  /**
   * Generate prayer time avoidance settings based on user preferences
   */
  generateAvoidanceSettings(
    prayerPreferences: {
      avoidAllPrayers?: boolean;
      individualSettings?: Partial<PrayerTimeAvoidanceSettings>;
    },
    defaultBufferMinutes: number = 30
  ): PrayerTimeAvoidanceSettings {
    const defaultSetting = {
      avoid: prayerPreferences.avoidAllPrayers ?? true,
      bufferMinutes: defaultBufferMinutes
    };

    return {
      fajr: prayerPreferences.individualSettings?.fajr ?? defaultSetting,
      dhuhr: prayerPreferences.individualSettings?.dhuhr ?? defaultSetting,
      asr: prayerPreferences.individualSettings?.asr ?? defaultSetting,
      maghrib: prayerPreferences.individualSettings?.maghrib ?? defaultSetting,
      isha: prayerPreferences.individualSettings?.isha ?? defaultSetting
    };
  }

  /**
   * Private helper methods
   */
  private async generateOptimizedTimes(
    medicationTimes: Date[],
    prayerTimes: PrayerTimes,
    config: PrayerSchedulingConfig
  ): Promise<Date[]> {
    const optimizedTimes: Date[] = [];
    
    for (const medTime of medicationTimes) {
      const conflicts = this.prayerTimeService.checkMedicationConflicts(
        [medTime],
        prayerTimes,
        config.bufferMinutes
      );

      if (conflicts.length === 0) {
        optimizedTimes.push(medTime);
      } else {
        // Find the best alternative time
        const alternative = this.findBestAlternativeTime(
          medTime,
          prayerTimes,
          config.bufferMinutes
        );
        optimizedTimes.push(alternative);
      }
    }

    return optimizedTimes;
  }

  private findBestAlternativeTime(
    originalTime: Date,
    prayerTimes: PrayerTimes,
    bufferMinutes: number
  ): Date {
    const prayers = [
      prayerTimes.fajr,
      prayerTimes.dhuhr,
      prayerTimes.asr,
      prayerTimes.maghrib,
      prayerTimes.isha
    ].sort((a, b) => a.getTime() - b.getTime());

    // Try moving the time after the conflicting prayer
    for (const prayerTime of prayers) {
      const timeDiff = Math.abs(originalTime.getTime() - prayerTime.getTime()) / (1000 * 60);
      
      if (timeDiff <= bufferMinutes) {
        // Move to after prayer + buffer
        return new Date(prayerTime.getTime() + (bufferMinutes + 15) * 60 * 1000);
      }
    }

    // If no conflicts found (shouldn't happen), return original time
    return originalTime;
  }

  private generateCulturalNotes(
    conflicts: PrayerConflict[],
    config: PrayerSchedulingConfig
  ): string[] {
    const notes: string[] = [];
    
    if (conflicts.length === 0) {
      notes.push('Medication schedule is optimized to avoid prayer times');
    } else {
      notes.push(`${conflicts.length} prayer time conflicts resolved`);
    }

    notes.push(`Using ${config.madhab} madhab calculation method`);
    notes.push(`Prayer time buffer: ${config.bufferMinutes} minutes`);
    
    if (config.adjustForRamadan) {
      notes.push('Schedule will be adjusted during Ramadan fasting period');
    }

    return notes;
  }

  private generateWarnings(conflicts: PrayerConflict[]): string[] {
    const warnings: string[] = [];
    
    const highSeverityConflicts = conflicts.filter(c => c.severity === 'high');
    if (highSeverityConflicts.length > 0) {
      warnings.push(`${highSeverityConflicts.length} high-priority prayer time conflicts detected`);
    }

    const mediumSeverityConflicts = conflicts.filter(c => c.severity === 'medium');
    if (mediumSeverityConflicts.length > 0) {
      warnings.push(`${mediumSeverityConflicts.length} medium-priority prayer time conflicts adjusted`);
    }

    return warnings;
  }

  private generateAlternativeSuggestions(
    conflicts: PrayerConflict[],
    prayerTimes: PrayerTimes,
    config: PrayerSchedulingConfig
  ): Date[] {
    return conflicts
      .map(conflict => conflict.suggestedAlternative)
      .filter(alt => alt !== undefined) as Date[];
  }

  private async generateRamadanAdjustments(
    optimizedTimes: Date[],
    prayerTimes: PrayerTimes,
    config: PrayerSchedulingConfig
  ): Promise<RamadanScheduleAdjustment> {
    // During Ramadan, medications should ideally be taken:
    // - Before suhoor (pre-dawn meal)
    // - After iftar (breaking fast)
    // - During night time (after Isha, before sleep)
    
    const suhoorWindow = {
      start: new Date(prayerTimes.fajr.getTime() - 90 * 60 * 1000), // 1.5 hours before Fajr
      end: new Date(prayerTimes.fajr.getTime() - 30 * 60 * 1000)    // 30 minutes before Fajr
    };
    
    const iftarWindow = {
      start: prayerTimes.maghrib, // Right at Maghrib
      end: new Date(prayerTimes.maghrib.getTime() + 60 * 60 * 1000) // 1 hour after Maghrib
    };
    
    const nightWindow = {
      start: new Date(prayerTimes.isha.getTime() + 60 * 60 * 1000), // 1 hour after Isha
      end: new Date(prayerTimes.fajr.getTime() - 120 * 60 * 1000)   // 2 hours before Fajr
    };

    // Adjust schedule to fit within permissible windows
    const adjustedSchedule: Date[] = [];
    const adjustmentReason: string[] = [];

    optimizedTimes.forEach((time, index) => {
      const hour = time.getHours();
      
      // If time falls during fasting hours (roughly 6 AM to 7 PM)
      if (hour >= 6 && hour <= 19) {
        // Move to post-iftar time
        const adjustedTime = new Date(iftarWindow.start.getTime() + (index * 30 * 60 * 1000));
        adjustedSchedule.push(adjustedTime);
        adjustmentReason.push(`Moved ${time.toLocaleTimeString()} to post-iftar period`);
      } else {
        adjustedSchedule.push(time);
        adjustmentReason.push(`No adjustment needed for ${time.toLocaleTimeString()}`);
      }
    });

    return {
      originalSchedule: optimizedTimes,
      adjustedSchedule,
      adjustmentReason,
      suhoorWindow,
      iftarWindow,
      nightWindow
    };
  }

  private getBaseScheduleTimes(frequency: MedicationSchedule['frequency']): Date[] {
    const baseDate = new Date();
    baseDate.setHours(0, 0, 0, 0);
    
    const patterns: Record<string, number[]> = {
      daily: [9], // 9 AM
      twice_daily: [8, 20], // 8 AM, 8 PM
      three_times: [8, 14, 20], // 8 AM, 2 PM, 8 PM
      four_times: [8, 13, 17, 21], // 8 AM, 1 PM, 5 PM, 9 PM
      weekly: [9], // Same time each week
      as_needed: [], // No fixed schedule
      custom: [] // User-defined
    };

    const hours = patterns[frequency] || [9];
    
    return hours.map(hour => {
      const time = new Date(baseDate);
      time.setHours(hour, 0, 0, 0);
      return time;
    });
  }

  private createDateFromTime(timeString: string, baseDate: Date): Date {
    const [hours, minutes] = timeString.split(':').map(Number);
    const date = new Date(baseDate);
    date.setHours(hours, minutes, 0, 0);
    return date;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<PrayerSchedulingConfig>): void {
    this.defaultConfig = { ...this.defaultConfig, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): PrayerSchedulingConfig {
    return { ...this.defaultConfig };
  }

  /**
   * Get prayer times for current location
   */
  async getCurrentPrayerTimes(): Promise<PrayerTimes> {
    return this.prayerTimeService.calculatePrayerTimes({
      latitude: this.defaultConfig.location.coordinates.latitude,
      longitude: this.defaultConfig.location.coordinates.longitude,
      date: new Date(),
      madhab: this.defaultConfig.madhab,
      method: 'jakim'
    });
  }
}

export default PrayerSchedulingService;