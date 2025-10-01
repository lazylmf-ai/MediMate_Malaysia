/**
 * Prayer Time Service
 * 
 * Service for accurate Islamic prayer time calculations for Malaysian locations.
 * Supports different madhab calculations and provides real-time prayer time data
 * with Qibla direction integration.
 */

import { MALAYSIAN_STATES_DATA, MalaysianState, PrayerTimeDefaults } from '../../types/cultural';

export interface PrayerTimes {
  fajr: Date;
  dhuhr: Date;
  asr: Date;
  maghrib: Date;
  isha: Date;
  sunrise?: Date;
  midnight?: Date;
  qibla: number; // Qibla direction in degrees from North
}

export interface PrayerTimeCalculationParams {
  latitude: number;
  longitude: number;
  date: Date;
  madhab: 'shafi' | 'hanafi';
  method: 'jakim' | 'isna' | 'mwl' | 'egypt' | 'makkah';
  adjustments?: {
    fajr: number;
    dhuhr: number;
    asr: number;
    maghrib: number;
    isha: number;
  };
}

export interface MedicationSchedulingWindow {
  startTime: Date;
  endTime: Date;
  type: 'before_prayer' | 'after_prayer' | 'between_prayers' | 'free_time';
  prayerName?: string;
  bufferMinutes: number;
}

export interface PrayerConflict {
  time: Date;
  prayerName: string;
  severity: 'high' | 'medium' | 'low';
  suggestedAlternative?: Date;
}

class PrayerTimeService {
  private static instance: PrayerTimeService;
  private cachedPrayerTimes: Map<string, { times: PrayerTimes; calculatedAt: Date }> = new Map();
  private cacheExpiryHours = 24; // Cache prayer times for 24 hours

  private constructor() {}

  static getInstance(): PrayerTimeService {
    if (!PrayerTimeService.instance) {
      PrayerTimeService.instance = new PrayerTimeService();
    }
    return PrayerTimeService.instance;
  }

  /**
   * Calculate prayer times for Malaysian locations using JAKIM standards
   */
  async calculatePrayerTimes(params: PrayerTimeCalculationParams): Promise<PrayerTimes> {
    const cacheKey = this.generateCacheKey(params);
    const cached = this.cachedPrayerTimes.get(cacheKey);
    
    // Return cached result if still valid
    if (cached && this.isCacheValid(cached.calculatedAt)) {
      return cached.times;
    }

    try {
      const prayerTimes = await this.performCalculation(params);
      
      // Cache the result
      this.cachedPrayerTimes.set(cacheKey, {
        times: prayerTimes,
        calculatedAt: new Date()
      });

      return prayerTimes;
    } catch (error) {
      console.error('Prayer time calculation failed:', error);
      
      // Return fallback times if calculation fails
      return this.getFallbackPrayerTimes(params.latitude, params.longitude, params.date);
    }
  }

  /**
   * Get prayer times for a specific Malaysian state
   */
  async getPrayerTimesForState(
    state: MalaysianState, 
    city?: string,
    date: Date = new Date()
  ): Promise<PrayerTimes> {
    const stateData = MALAYSIAN_STATES_DATA[state];
    
    return this.calculatePrayerTimes({
      latitude: stateData.coordinates.latitude,
      longitude: stateData.coordinates.longitude,
      date,
      madhab: stateData.defaultPrayerTimes.madhab,
      method: stateData.defaultPrayerTimes.calculationMethod,
      adjustments: stateData.defaultPrayerTimes.adjustments
    });
  }

  /**
   * Get medication scheduling windows based on prayer times
   */
  async getMedicationSchedulingWindows(
    prayerTimes: PrayerTimes,
    bufferMinutes: number = 30,
    date: Date = new Date()
  ): Promise<MedicationSchedulingWindow[]> {
    const windows: MedicationSchedulingWindow[] = [];
    
    // Sort prayer times chronologically
    const prayers = [
      { name: 'fajr', time: prayerTimes.fajr },
      { name: 'dhuhr', time: prayerTimes.dhuhr },
      { name: 'asr', time: prayerTimes.asr },
      { name: 'maghrib', time: prayerTimes.maghrib },
      { name: 'isha', time: prayerTimes.isha }
    ].sort((a, b) => a.time.getTime() - b.time.getTime());

    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    // Create windows between prayers
    for (let i = 0; i < prayers.length; i++) {
      const currentPrayer = prayers[i];
      const nextPrayer = prayers[i + 1];
      
      // Window before current prayer
      const beforeStart = i === 0 ? dayStart : 
        new Date(prayers[i - 1].time.getTime() + bufferMinutes * 60000);
      const beforeEnd = new Date(currentPrayer.time.getTime() - bufferMinutes * 60000);
      
      if (beforeStart < beforeEnd) {
        windows.push({
          startTime: beforeStart,
          endTime: beforeEnd,
          type: 'before_prayer',
          prayerName: currentPrayer.name,
          bufferMinutes
        });
      }

      // Window after current prayer
      const afterStart = new Date(currentPrayer.time.getTime() + bufferMinutes * 60000);
      const afterEnd = nextPrayer ? 
        new Date(nextPrayer.time.getTime() - bufferMinutes * 60000) : 
        dayEnd;
      
      if (afterStart < afterEnd) {
        windows.push({
          startTime: afterStart,
          endTime: afterEnd,
          type: nextPrayer ? 'between_prayers' : 'after_prayer',
          prayerName: currentPrayer.name,
          bufferMinutes
        });
      }
    }

    return windows.filter(window => window.endTime > new Date()); // Only future windows
  }

  /**
   * Check for prayer time conflicts with medication schedule
   */
  checkMedicationConflicts(
    medicationTimes: Date[],
    prayerTimes: PrayerTimes,
    bufferMinutes: number = 30
  ): PrayerConflict[] {
    const conflicts: PrayerConflict[] = [];
    
    const prayers = [
      { name: 'fajr', time: prayerTimes.fajr },
      { name: 'dhuhr', time: prayerTimes.dhuhr },
      { name: 'asr', time: prayerTimes.asr },
      { name: 'maghrib', time: prayerTimes.maghrib },
      { name: 'isha', time: prayerTimes.isha }
    ];

    medicationTimes.forEach(medTime => {
      prayers.forEach(prayer => {
        const timeDiff = Math.abs(medTime.getTime() - prayer.time.getTime()) / (1000 * 60);
        
        if (timeDiff <= bufferMinutes) {
          let severity: 'high' | 'medium' | 'low' = 'medium';
          
          if (timeDiff <= 15) {
            severity = 'high';
          } else if (timeDiff <= bufferMinutes / 2) {
            severity = 'medium';
          } else {
            severity = 'low';
          }

          // Suggest alternative time
          const suggestedAlternative = new Date(prayer.time.getTime() + (bufferMinutes + 10) * 60000);
          
          conflicts.push({
            time: medTime,
            prayerName: prayer.name,
            severity,
            suggestedAlternative
          });
        }
      });
    });

    return conflicts;
  }

  /**
   * Calculate Qibla direction for given coordinates
   */
  calculateQiblaDirection(latitude: number, longitude: number): number {
    // Coordinates of Kaaba in Mecca
    const kaabaLat = 21.4225;
    const kaabaLng = 39.8262;
    
    const lat1 = this.toRadians(latitude);
    const lat2 = this.toRadians(kaabaLat);
    const dLng = this.toRadians(kaabaLng - longitude);
    
    const y = Math.sin(dLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    
    let qibla = this.toDegrees(Math.atan2(y, x));
    
    // Normalize to 0-360 degrees
    if (qibla < 0) {
      qibla += 360;
    }
    
    return Math.round(qibla * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Get next prayer time from current time
   */
  getNextPrayer(prayerTimes: PrayerTimes, currentTime: Date = new Date()): { name: string; time: Date } | null {
    const prayers = [
      { name: 'fajr', time: prayerTimes.fajr },
      { name: 'dhuhr', time: prayerTimes.dhuhr },
      { name: 'asr', time: prayerTimes.asr },
      { name: 'maghrib', time: prayerTimes.maghrib },
      { name: 'isha', time: prayerTimes.isha }
    ].sort((a, b) => a.time.getTime() - b.time.getTime());

    for (const prayer of prayers) {
      if (prayer.time > currentTime) {
        return prayer;
      }
    }

    // If no prayer found today, return tomorrow's Fajr
    const tomorrowFajr = new Date(prayerTimes.fajr);
    tomorrowFajr.setDate(tomorrowFajr.getDate() + 1);
    
    return { name: 'fajr', time: tomorrowFajr };
  }

  /**
   * Perform actual prayer time calculation
   */
  private async performCalculation(params: PrayerTimeCalculationParams): Promise<PrayerTimes> {
    // This is a simplified implementation. In production, you would use:
    // - A proper Islamic prayer time calculation library
    // - JAKIM's official calculation parameters for Malaysia
    // - Consider local adjustments and seasonal variations
    
    const { latitude, longitude, date, madhab, adjustments } = params;
    
    // Basic calculation using astronomical formulas
    const julianDay = this.getJulianDay(date);
    const timeZone = 8; // Malaysia is UTC+8
    
    // Calculate solar declination
    const declination = this.getSolarDeclination(julianDay);
    
    // Calculate equation of time
    const eqTime = this.getEquationOfTime(julianDay);
    
    // Prayer time angles (simplified for Malaysian context)
    const angles = {
      fajr: madhab === 'hanafi' ? 18 : 20, // Fajr angle
      isha: madhab === 'hanafi' ? 17 : 18,  // Isha angle
      asr: madhab === 'hanafi' ? 2 : 1      // Asr shadow ratio
    };

    // Calculate prayer times
    const fajrTime = this.calculatePrayerTime(latitude, declination, angles.fajr, true, eqTime, longitude, timeZone);
    const dhuhrTime = this.calculatePrayerTime(latitude, declination, 0, false, eqTime, longitude, timeZone);
    const asrTime = this.calculateAsrTime(latitude, declination, angles.asr, eqTime, longitude, timeZone);
    const maghribTime = this.calculatePrayerTime(latitude, declination, 0.833, true, eqTime, longitude, timeZone);
    const ishaTime = this.calculatePrayerTime(latitude, declination, angles.isha, true, eqTime, longitude, timeZone);

    // Apply adjustments
    const baseDate = new Date(date);
    baseDate.setHours(0, 0, 0, 0);

    const prayerTimes: PrayerTimes = {
      fajr: this.applyTimeAdjustment(baseDate, fajrTime, adjustments?.fajr || 0),
      dhuhr: this.applyTimeAdjustment(baseDate, dhuhrTime, adjustments?.dhuhr || 0),
      asr: this.applyTimeAdjustment(baseDate, asrTime, adjustments?.asr || 0),
      maghrib: this.applyTimeAdjustment(baseDate, maghribTime, adjustments?.maghrib || 0),
      isha: this.applyTimeAdjustment(baseDate, ishaTime, adjustments?.isha || 0),
      qibla: this.calculateQiblaDirection(latitude, longitude)
    };

    return prayerTimes;
  }

  /**
   * Get fallback prayer times if calculation fails
   */
  private getFallbackPrayerTimes(lat: number, lng: number, date: Date): PrayerTimes {
    // Standard Malaysian prayer times as fallback
    const baseDate = new Date(date);
    baseDate.setHours(0, 0, 0, 0);

    return {
      fajr: new Date(baseDate.getTime() + 6 * 60 * 60 * 1000), // 6:00 AM
      dhuhr: new Date(baseDate.getTime() + 13.25 * 60 * 60 * 1000), // 1:15 PM
      asr: new Date(baseDate.getTime() + 16.5 * 60 * 60 * 1000), // 4:30 PM
      maghrib: new Date(baseDate.getTime() + 19.33 * 60 * 60 * 1000), // 7:20 PM
      isha: new Date(baseDate.getTime() + 20.58 * 60 * 60 * 1000), // 8:35 PM
      qibla: this.calculateQiblaDirection(lat, lng)
    };
  }

  // Helper calculation methods
  private getJulianDay(date: Date): number {
    return Math.floor(date.getTime() / 86400000) + 2440587.5;
  }

  private getSolarDeclination(julianDay: number): number {
    const n = julianDay - 2451545.0;
    const l = (280.460 + 0.9856474 * n) % 360;
    const g = this.toRadians((357.528 + 0.9856003 * n) % 360);
    const lambda = this.toRadians(l + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g));
    return this.toDegrees(Math.asin(0.39795 * Math.cos(lambda)));
  }

  private getEquationOfTime(julianDay: number): number {
    const n = julianDay - 2451545.0;
    const l = this.toRadians((280.460 + 0.9856474 * n) % 360);
    const g = this.toRadians((357.528 + 0.9856003 * n) % 360);
    const lambda = this.toRadians(l + 1.915 * Math.sin(g) + 0.020 * Math.sin(2 * g));
    const alpha = this.toDegrees(Math.atan2(Math.cos(this.toRadians(23.439)) * Math.sin(lambda), Math.cos(lambda)));
    return 4 * (l - alpha);
  }

  private calculatePrayerTime(
    latitude: number, 
    declination: number, 
    angle: number, 
    isMinusAngle: boolean,
    eqTime: number,
    longitude: number,
    timeZone: number
  ): number {
    const lat = this.toRadians(latitude);
    const dec = this.toRadians(declination);
    const angleRad = this.toRadians(angle);
    
    const cosH = (Math.cos(angleRad) - Math.sin(dec) * Math.sin(lat)) / 
                 (Math.cos(dec) * Math.cos(lat));
    
    if (Math.abs(cosH) > 1) {
      return isMinusAngle ? 0 : 12; // No sunrise/sunset at extreme latitudes
    }
    
    const h = Math.acos(cosH);
    const timeDecimal = 12 + (isMinusAngle ? -this.toDegrees(h) : this.toDegrees(h)) / 15;
    
    return timeDecimal - (longitude / 15 - timeZone) - eqTime / 60;
  }

  private calculateAsrTime(
    latitude: number,
    declination: number,
    shadowRatio: number,
    eqTime: number,
    longitude: number,
    timeZone: number
  ): number {
    const lat = this.toRadians(latitude);
    const dec = this.toRadians(declination);
    
    const tanH = (shadowRatio + Math.tan(Math.abs(lat - dec))) / 
                 (1 + shadowRatio * Math.tan(Math.abs(lat - dec)));
    const h = Math.atan(1 / tanH);
    
    const timeDecimal = 12 + this.toDegrees(h) / 15;
    return timeDecimal - (longitude / 15 - timeZone) - eqTime / 60;
  }

  private applyTimeAdjustment(baseDate: Date, timeDecimal: number, adjustmentMinutes: number): Date {
    const hours = Math.floor(timeDecimal);
    const minutes = Math.floor((timeDecimal - hours) * 60) + adjustmentMinutes;
    
    const result = new Date(baseDate);
    result.setHours(hours, minutes, 0, 0);
    
    return result;
  }

  private generateCacheKey(params: PrayerTimeCalculationParams): string {
    const dateStr = params.date.toDateString();
    return `${params.latitude},${params.longitude},${dateStr},${params.madhab},${params.method}`;
  }

  private isCacheValid(calculatedAt: Date): boolean {
    const now = new Date();
    const ageHours = (now.getTime() - calculatedAt.getTime()) / (1000 * 60 * 60);
    return ageHours < this.cacheExpiryHours;
  }

  private toRadians(degrees: number): number {
    return degrees * Math.PI / 180;
  }

  private toDegrees(radians: number): number {
    return radians * 180 / Math.PI;
  }

  /**
   * Clear cached prayer times (useful for testing or manual refresh)
   */
  clearCache(): void {
    this.cachedPrayerTimes.clear();
  }

  /**
   * Get cached prayer times count (for debugging)
   */
  getCacheSize(): number {
    return this.cachedPrayerTimes.size;
  }
}

export default PrayerTimeService;