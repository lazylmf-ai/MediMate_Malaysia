/**
 * Analytics Service for Adherence Components
 *
 * Shared service layer for analytics data processing, API integration,
 * and cultural intelligence for Malaysian healthcare context.
 */

import { ProgressMetrics, AdherenceRecord, CulturalInsight, AdherencePattern } from '@/types/adherence';
import { Medication } from '@/types/medication';

export interface AnalyticsApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
}

export interface CulturalAnalyticsConfig {
  enablePrayerTimeAnalysis: boolean;
  enableFestivalTracking: boolean;
  enableFamilyPatterns: boolean;
  culturalSensitivityLevel: 'high' | 'medium' | 'low';
}

export class AdherenceAnalyticsService {
  private readonly baseUrl: string;
  private readonly culturalConfig: CulturalAnalyticsConfig;

  constructor(baseUrl: string = '/api/analytics', culturalConfig?: Partial<CulturalAnalyticsConfig>) {
    this.baseUrl = baseUrl;
    this.culturalConfig = {
      enablePrayerTimeAnalysis: true,
      enableFestivalTracking: true,
      enableFamilyPatterns: true,
      culturalSensitivityLevel: 'high',
      ...culturalConfig,
    };
  }

  /**
   * Fetch comprehensive progress metrics with cultural insights
   */
  async getProgressMetrics(
    patientId: string,
    period: string = 'monthly',
    includeCultural: boolean = true
  ): Promise<AnalyticsApiResponse<ProgressMetrics>> {
    try {
      const params = new URLSearchParams({
        period,
        includeCultural: includeCultural.toString(),
      });

      const response = await fetch(`${this.baseUrl}/progress/${patientId}?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch progress metrics');
      }

      // Process cultural insights if enabled
      if (includeCultural && this.culturalConfig.enablePrayerTimeAnalysis) {
        result.data = await this.enrichWithCulturalInsights(result.data);
      }

      return {
        success: true,
        data: result.data,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('Error fetching progress metrics:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Fetch adherence analytics with pattern recognition
   */
  async getAdherenceAnalytics(
    patientId: string,
    startDate: Date,
    endDate: Date,
    analysisType: string = 'comprehensive'
  ): Promise<AnalyticsApiResponse<any>> {
    try {
      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        analysisType,
      });

      const response = await fetch(`${this.baseUrl}/adherence/${patientId}?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch adherence analytics');
      }

      return {
        success: true,
        data: result.data,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('Error fetching adherence analytics:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Record adherence event with cultural context
   */
  async recordAdherence(
    patientId: string,
    adherenceRecord: Partial<AdherenceRecord>,
    culturalContext?: any
  ): Promise<AnalyticsApiResponse<AdherenceRecord>> {
    try {
      const payload = {
        ...adherenceRecord,
        culturalContext: this.culturalConfig.enablePrayerTimeAnalysis ? {
          ...culturalContext,
          prayerTimeAnalysis: await this.analyzePrayerTimeContext(adherenceRecord.scheduledTime),
        } : culturalContext,
      };

      const response = await fetch(`${this.baseUrl}/adherence/${patientId}/record`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to record adherence');
      }

      return {
        success: true,
        data: result.data,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('Error recording adherence:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Get family adherence metrics
   */
  async getFamilyMetrics(familyId: string): Promise<AnalyticsApiResponse<any>> {
    try {
      const response = await fetch(`${this.baseUrl}/family/${familyId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to fetch family metrics');
      }

      return {
        success: true,
        data: result.data,
        timestamp: new Date(),
      };
    } catch (error) {
      console.error('Error fetching family metrics:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date(),
      };
    }
  }

  /**
   * Enrich progress data with cultural insights
   */
  private async enrichWithCulturalInsights(progressMetrics: ProgressMetrics): Promise<ProgressMetrics> {
    const culturalInsights: CulturalInsight[] = [];

    if (this.culturalConfig.enablePrayerTimeAnalysis) {
      const prayerInsights = await this.analyzePrayerTimePatterns(progressMetrics);
      culturalInsights.push(...prayerInsights);
    }

    if (this.culturalConfig.enableFestivalTracking) {
      const festivalInsights = await this.analyzeFestivalImpact(progressMetrics);
      culturalInsights.push(...festivalInsights);
    }

    if (this.culturalConfig.enableFamilyPatterns) {
      const familyInsights = await this.analyzeFamilyPatterns(progressMetrics);
      culturalInsights.push(...familyInsights);
    }

    return {
      ...progressMetrics,
      culturalInsights: [...(progressMetrics.culturalInsights || []), ...culturalInsights],
    };
  }

  /**
   * Analyze prayer time patterns for medication adherence
   */
  private async analyzePrayerTimePatterns(progressMetrics: ProgressMetrics): Promise<CulturalInsight[]> {
    const insights: CulturalInsight[] = [];

    // Prayer times in Malaysia (approximate)
    const prayerTimes = [
      { name: 'Fajr', start: 5, end: 7 },
      { name: 'Dhuhr', start: 12, end: 14 },
      { name: 'Asr', start: 15, end: 17 },
      { name: 'Maghrib', start: 18, end: 20 },
      { name: 'Isha', start: 20, end: 22 },
    ];

    progressMetrics.medications.forEach(medication => {
      medication.trends.forEach(trend => {
        const hour = trend.date.getHours();
        const conflictingPrayer = prayerTimes.find(prayer =>
          hour >= prayer.start && hour <= prayer.end
        );

        if (conflictingPrayer && trend.adherenceRate < 80) {
          insights.push({
            type: 'prayer_time_optimization',
            description: `Medication timing conflicts with ${conflictingPrayer.name} prayer time`,
            adherenceImpact: -10,
            occurrences: 1,
            recommendations: [
              `Consider adjusting medication time to avoid ${conflictingPrayer.name} prayer`,
              'Use 30-minute buffer around prayer times',
              'Coordinate with religious schedule',
            ],
            culturalSensitivity: 'high',
          });
        }
      });
    });

    return insights;
  }

  /**
   * Analyze festival impact on medication adherence
   */
  private async analyzeFestivalImpact(progressMetrics: ProgressMetrics): Promise<CulturalInsight[]> {
    const insights: CulturalInsight[] = [];
    const currentDate = new Date();

    // Malaysian festivals (simplified calendar)
    const festivals = [
      { name: 'Hari Raya', months: [5, 6], impact: 'positive' },
      { name: 'Chinese New Year', months: [1, 2], impact: 'mixed' },
      { name: 'Deepavali', months: [10, 11], impact: 'positive' },
      { name: 'Christmas', months: [12], impact: 'mixed' },
    ];

    const currentMonth = currentDate.getMonth() + 1;
    const currentFestival = festivals.find(festival =>
      festival.months.includes(currentMonth)
    );

    if (currentFestival) {
      const festivalAdherence = this.calculateFestivalAdherence(progressMetrics, currentMonth);

      insights.push({
        type: 'festival_period_pattern',
        description: `${currentFestival.name} period affecting medication routine`,
        adherenceImpact: currentFestival.impact === 'positive' ? 5 : -5,
        occurrences: 1,
        recommendations: [
          `Plan medication routine around ${currentFestival.name} activities`,
          'Involve family in festival medication reminders',
          'Prepare medication schedule in advance',
        ],
        culturalSensitivity: 'high',
      });
    }

    return insights;
  }

  /**
   * Analyze family support patterns
   */
  private async analyzeFamilyPatterns(progressMetrics: ProgressMetrics): Promise<CulturalInsight[]> {
    const insights: CulturalInsight[] = [];

    // Analyze weekend vs weekday patterns (family time impact)
    const weekendAdherence = this.calculateWeekendAdherence(progressMetrics);
    const weekdayAdherence = this.calculateWeekdayAdherence(progressMetrics);

    if (weekendAdherence > weekdayAdherence) {
      insights.push({
        type: 'family_support_benefit',
        description: 'Family presence during weekends improves medication adherence',
        adherenceImpact: weekendAdherence - weekdayAdherence,
        occurrences: 1,
        recommendations: [
          'Leverage family support for weekday reminders',
          'Create family medication routine',
          'Involve family members in daily medication schedule',
        ],
        culturalSensitivity: 'high',
      });
    }

    return insights;
  }

  /**
   * Analyze prayer time context for a specific medication time
   */
  private async analyzePrayerTimeContext(scheduledTime?: Date): Promise<any> {
    if (!scheduledTime) return null;

    const hour = scheduledTime.getHours();
    const prayerTimes = [
      { name: 'Fajr', start: 5, end: 7 },
      { name: 'Dhuhr', start: 12, end: 14 },
      { name: 'Asr', start: 15, end: 17 },
      { name: 'Maghrib', start: 18, end: 20 },
      { name: 'Isha', start: 20, end: 22 },
    ];

    const nearPrayer = prayerTimes.find(prayer =>
      Math.abs(hour - (prayer.start + prayer.end) / 2) < 1
    );

    return {
      nearPrayerTime: !!nearPrayer,
      prayerName: nearPrayer?.name,
      suggestedAdjustment: nearPrayer ? `Consider taking medication 30 minutes before or after ${nearPrayer.name}` : null,
    };
  }

  /**
   * Calculate adherence during festival periods
   */
  private calculateFestivalAdherence(progressMetrics: ProgressMetrics, month: number): number {
    const festivalTrends = progressMetrics.medications.flatMap(med =>
      med.trends.filter(trend => trend.date.getMonth() + 1 === month)
    );

    if (festivalTrends.length === 0) return 0;

    return festivalTrends.reduce((sum, trend) => sum + trend.adherenceRate, 0) / festivalTrends.length;
  }

  /**
   * Calculate weekend adherence rates
   */
  private calculateWeekendAdherence(progressMetrics: ProgressMetrics): number {
    const weekendTrends = progressMetrics.medications.flatMap(med =>
      med.trends.filter(trend => {
        const dayOfWeek = trend.date.getDay();
        return dayOfWeek === 0 || dayOfWeek === 6; // Sunday or Saturday
      })
    );

    if (weekendTrends.length === 0) return 0;

    return weekendTrends.reduce((sum, trend) => sum + trend.adherenceRate, 0) / weekendTrends.length;
  }

  /**
   * Calculate weekday adherence rates
   */
  private calculateWeekdayAdherence(progressMetrics: ProgressMetrics): number {
    const weekdayTrends = progressMetrics.medications.flatMap(med =>
      med.trends.filter(trend => {
        const dayOfWeek = trend.date.getDay();
        return dayOfWeek >= 1 && dayOfWeek <= 5; // Monday to Friday
      })
    );

    if (weekdayTrends.length === 0) return 0;

    return weekdayTrends.reduce((sum, trend) => sum + trend.adherenceRate, 0) / weekdayTrends.length;
  }

  /**
   * Generate cultural recommendations based on patterns
   */
  generateCulturalRecommendations(patterns: AdherencePattern[]): string[] {
    const recommendations: string[] = [];

    patterns.forEach(pattern => {
      switch (pattern.type) {
        case 'prayer_time_conflict':
          recommendations.push('Adjust medication timing to avoid prayer periods');
          recommendations.push('Use medication reminder apps with prayer time integration');
          break;

        case 'weekend_decline':
          recommendations.push('Set family reminders for weekend medication');
          recommendations.push('Create weekend medication routine with family support');
          break;

        case 'festival_period_change':
          recommendations.push('Plan medication schedule around festival activities');
          recommendations.push('Involve extended family in medication reminders during festivals');
          break;

        default:
          recommendations.push('Maintain consistent medication routine');
      }
    });

    return [...new Set(recommendations)]; // Remove duplicates
  }

  /**
   * Check if current time conflicts with Malaysian prayer schedule
   */
  isCurrentTimePrayerConflict(): boolean {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const totalMinutes = hour * 60 + minute;

    // Approximate Malaysian prayer times in minutes from midnight
    const prayerRanges = [
      { start: 5 * 60, end: 7 * 60 }, // Fajr
      { start: 12 * 60, end: 14 * 60 }, // Dhuhr
      { start: 15 * 60, end: 17 * 60 }, // Asr
      { start: 18 * 60, end: 20 * 60 }, // Maghrib
      { start: 20 * 60, end: 22 * 60 }, // Isha
    ];

    return prayerRanges.some(range =>
      totalMinutes >= range.start && totalMinutes <= range.end
    );
  }

  /**
   * Get next available non-prayer time slot
   */
  getNextAvailableTimeSlot(fromTime: Date = new Date()): Date {
    const nextSlot = new Date(fromTime);

    while (this.isTimePrayerConflict(nextSlot)) {
      nextSlot.setMinutes(nextSlot.getMinutes() + 15);
    }

    return nextSlot;
  }

  private isTimePrayerConflict(time: Date): boolean {
    const hour = time.getHours();
    const minute = time.getMinutes();
    const totalMinutes = hour * 60 + minute;

    const prayerRanges = [
      { start: 5 * 60, end: 7 * 60 },
      { start: 12 * 60, end: 14 * 60 },
      { start: 15 * 60, end: 17 * 60 },
      { start: 18 * 60, end: 20 * 60 },
      { start: 20 * 60, end: 22 * 60 },
    ];

    return prayerRanges.some(range =>
      totalMinutes >= range.start && totalMinutes <= range.end
    );
  }
}

export default AdherenceAnalyticsService;