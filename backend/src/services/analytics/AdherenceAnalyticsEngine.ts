/**
 * Adherence Analytics Engine
 * Core calculation engine for medication adherence with Malaysian cultural context
 */

import {
  AdherenceRecord,
  ProgressMetrics,
  AdherenceStatus,
  TimePeriod,
  CulturalAdjustmentMetrics,
  AdherencePrediction,
  AdherenceAnalytics,
  RiskFactor,
  CulturalFactor,
  AdherenceConfiguration,
  AdherenceStatistics,
  CulturalFactorType
} from '../../types/adherence/adherence.types';
import { DatabaseService } from '../database/databaseService';
import { CacheService } from '../cache/redisService';
import { CulturalCalendarService } from '../cultural/culturalCalendarService';
import { PrayerTimeService } from '../cultural/prayerTimeService';
import { v4 as uuidv4 } from 'uuid';

export class AdherenceAnalyticsEngine {
  private static instance: AdherenceAnalyticsEngine;
  private db: DatabaseService;
  private cache: CacheService;
  private culturalCalendar: CulturalCalendarService;
  private prayerTime: PrayerTimeService;

  // Cultural adjustment weights for Malaysian context
  private readonly CULTURAL_WEIGHTS = {
    RAMADAN_FASTING: 0.15, // 15% impact during Ramadan
    PRAYER_TIME_BUFFER: 0.10, // 10% impact for prayer timing
    FESTIVAL_PERIOD: 0.12, // 12% impact during major festivals
    FAMILY_SUPPORT: 0.08, // 8% impact for family involvement
    TRADITIONAL_MEDICINE: 0.06, // 6% impact for traditional integration
    WORK_SCHEDULE: 0.09 // 9% impact for work-related delays
  };

  // Adherence scoring thresholds
  private readonly ADHERENCE_THRESHOLDS = {
    EXCELLENT: 0.90,
    GOOD: 0.80,
    MODERATE: 0.60,
    POOR: 0.40
  };

  private readonly CACHE_TTL = {
    DAILY_METRICS: 3600, // 1 hour
    WEEKLY_METRICS: 7200, // 2 hours
    MONTHLY_METRICS: 14400, // 4 hours
    PREDICTIONS: 1800 // 30 minutes
  };

  constructor() {
    this.db = DatabaseService.getInstance();
    this.cache = CacheService.getInstance();
    this.culturalCalendar = new CulturalCalendarService();
    this.prayerTime = new PrayerTimeService();
  }

  public static getInstance(): AdherenceAnalyticsEngine {
    if (!AdherenceAnalyticsEngine.instance) {
      AdherenceAnalyticsEngine.instance = new AdherenceAnalyticsEngine();
    }
    return AdherenceAnalyticsEngine.instance;
  }

  /**
   * Calculate real-time adherence rate with cultural adjustments
   */
  async calculateAdherenceRate(
    patientId: string,
    medicationId?: string,
    period: TimePeriod = 'monthly'
  ): Promise<number> {
    try {
      const cacheKey = `adherence_rate:${patientId}:${medicationId || 'all'}:${period}`;
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const adherenceRecords = await this.getAdherenceRecords(patientId, medicationId, period);
      const configuration = await this.getPatientConfiguration(patientId);

      if (adherenceRecords.length === 0) {
        return 0;
      }

      const baseAdherence = this.calculateBaseAdherence(adherenceRecords);
      const culturalAdjustment = await this.calculateCulturalAdjustment(
        adherenceRecords,
        configuration
      );

      const adjustedAdherence = Math.min(1.0, baseAdherence + culturalAdjustment);

      await this.cache.setex(
        cacheKey,
        this.getCacheTTL(period),
        JSON.stringify(adjustedAdherence)
      );

      return adjustedAdherence;
    } catch (error) {
      console.error('Error calculating adherence rate:', error);
      throw new Error('Failed to calculate adherence rate');
    }
  }

  /**
   * Generate comprehensive progress metrics
   */
  async generateProgressMetrics(
    patientId: string,
    period: TimePeriod
  ): Promise<ProgressMetrics> {
    try {
      const adherenceRecords = await this.getAdherenceRecords(patientId, undefined, period);
      const configuration = await this.getPatientConfiguration(patientId);

      const totalDoses = adherenceRecords.length;
      const takenDoses = adherenceRecords.filter(r => r.status === 'taken').length;
      const missedDoses = adherenceRecords.filter(r => r.status === 'missed').length;
      const lateDoses = adherenceRecords.filter(r => r.status === 'late').length;
      const skippedDoses = adherenceRecords.filter(r => r.status === 'skipped').length;

      const adherenceRate = await this.calculateAdherenceRate(patientId, undefined, period);
      const streakData = await this.calculateCurrentStreak(patientId);
      const longestStreak = await this.calculateLongestStreak(patientId);
      const culturalAdjustments = await this.calculateCulturalAdjustmentMetrics(
        adherenceRecords,
        configuration
      );

      return {
        patientId,
        period,
        adherenceRate,
        streakCount: streakData.currentStreak,
        longestStreak,
        totalDoses,
        takenDoses,
        missedDoses,
        lateDoses,
        skippedDoses,
        culturalAdjustments,
        calculatedAt: new Date()
      };
    } catch (error) {
      console.error('Error generating progress metrics:', error);
      throw new Error('Failed to generate progress metrics');
    }
  }

  /**
   * Predict adherence for upcoming doses with cultural factors
   */
  async predictAdherence(
    patientId: string,
    medicationId: string,
    nextDoseTime: Date
  ): Promise<AdherencePrediction> {
    try {
      const cacheKey = `adherence_prediction:${patientId}:${medicationId}:${nextDoseTime.getTime()}`;
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }

      const historicalData = await this.getAdherenceRecords(patientId, medicationId, 'monthly');
      const configuration = await this.getPatientConfiguration(patientId);

      const baseLineProbability = this.calculateBaselineProbability(historicalData);
      const riskFactors = await this.identifyRiskFactors(patientId, medicationId, nextDoseTime);
      const culturalFactors = await this.identifyCulturalFactors(nextDoseTime, configuration);

      const culturalAdjustment = this.calculateCulturalImpact(culturalFactors);
      const riskAdjustment = this.calculateRiskImpact(riskFactors);

      const adherenceProbability = Math.max(0, Math.min(1,
        baseLineProbability + culturalAdjustment - riskAdjustment
      ));

      const recommendations = await this.generateAdherenceRecommendations(
        riskFactors,
        culturalFactors,
        configuration
      );

      const prediction: AdherencePrediction = {
        patientId,
        medicationId,
        nextDoseTime,
        adherenceProbability,
        riskFactors,
        culturalFactors,
        recommendations,
        confidence: this.calculatePredictionConfidence(historicalData.length),
        modelVersion: '1.0.0',
        predictedAt: new Date()
      };

      await this.cache.setex(
        cacheKey,
        this.CACHE_TTL.PREDICTIONS,
        JSON.stringify(prediction)
      );

      return prediction;
    } catch (error) {
      console.error('Error predicting adherence:', error);
      throw new Error('Failed to predict adherence');
    }
  }

  /**
   * Generate comprehensive adherence analytics
   */
  async generateAdherenceAnalytics(
    patientId: string,
    analysisType: 'individual' | 'family' | 'medication' | 'cultural' | 'predictive',
    timeframe: { start: Date; end: Date }
  ): Promise<AdherenceAnalytics> {
    try {
      const adherenceRecords = await this.getAdherenceRecordsInRange(
        patientId,
        timeframe.start,
        timeframe.end
      );

      const insights = await this.generateAdherenceInsights(adherenceRecords, analysisType);
      const patterns = await this.identifyAdherencePatterns(adherenceRecords);
      const culturalObservations = await this.generateCulturalObservations(
        adherenceRecords,
        patientId
      );

      return {
        patientId,
        analysisType,
        timeframe,
        insights,
        patterns,
        culturalObservations,
        generatedAt: new Date()
      };
    } catch (error) {
      console.error('Error generating adherence analytics:', error);
      throw new Error('Failed to generate adherence analytics');
    }
  }

  /**
   * Calculate base adherence without cultural adjustments
   */
  private calculateBaseAdherence(records: AdherenceRecord[]): number {
    if (records.length === 0) return 0;

    const takenCount = records.filter(r =>
      r.status === 'taken' || r.status === 'late'
    ).length;

    return takenCount / records.length;
  }

  /**
   * Calculate cultural adjustment factor
   */
  private async calculateCulturalAdjustment(
    records: AdherenceRecord[],
    configuration: AdherenceConfiguration
  ): Promise<number> {
    let totalAdjustment = 0;
    let adjustmentCount = 0;

    for (const record of records) {
      const context = record.culturalContext;

      // Ramadan fasting accommodation
      if (context.fastingPeriod && configuration.culturalPreferences.religiousObservance.religion === 'islam') {
        totalAdjustment += this.CULTURAL_WEIGHTS.RAMADAN_FASTING;
        adjustmentCount++;
      }

      // Prayer time flexibility
      if (context.prayerTimeConflict) {
        totalAdjustment += this.CULTURAL_WEIGHTS.PRAYER_TIME_BUFFER;
        adjustmentCount++;
      }

      // Festival period understanding
      if (context.festivalPeriod) {
        totalAdjustment += this.CULTURAL_WEIGHTS.FESTIVAL_PERIOD;
        adjustmentCount++;
      }

      // Family support bonus
      if (context.familySupport) {
        totalAdjustment += this.CULTURAL_WEIGHTS.FAMILY_SUPPORT;
        adjustmentCount++;
      }

      // Traditional medicine integration
      if (context.traditionalMedicineUsed) {
        totalAdjustment += this.CULTURAL_WEIGHTS.TRADITIONAL_MEDICINE;
        adjustmentCount++;
      }
    }

    return adjustmentCount > 0 ? totalAdjustment / adjustmentCount : 0;
  }

  /**
   * Calculate cultural adjustment metrics
   */
  private async calculateCulturalAdjustmentMetrics(
    records: AdherenceRecord[],
    configuration: AdherenceConfiguration
  ): Promise<CulturalAdjustmentMetrics> {
    const ramadanAdjustments = records.filter(r =>
      r.culturalContext.fastingPeriod &&
      configuration.culturalPreferences.religiousObservance.religion === 'islam'
    ).length;

    const prayerTimeDelays = records.filter(r =>
      r.culturalContext.prayerTimeConflict
    ).length;

    const festivalExemptions = records.filter(r =>
      r.culturalContext.festivalPeriod
    ).length;

    const familyCoordinationImpact = records.filter(r =>
      r.culturalContext.familySupport
    ).length;

    const traditionalMedicineInteractions = records.filter(r =>
      r.culturalContext.traditionalMedicineUsed
    ).length;

    return {
      ramadanAdjustments,
      prayerTimeDelays,
      festivalExemptions,
      familyCoordinationImpact,
      traditionalMedicineInteractions
    };
  }

  /**
   * Calculate current medication streak
   */
  private async calculateCurrentStreak(patientId: string): Promise<{ currentStreak: number }> {
    try {
      const recentRecords = await this.getAdherenceRecords(patientId, undefined, 'monthly');

      // Sort by scheduled time descending
      const sortedRecords = recentRecords
        .sort((a, b) => b.scheduledTime.getTime() - a.scheduledTime.getTime());

      let currentStreak = 0;
      for (const record of sortedRecords) {
        if (record.status === 'taken' || record.status === 'late') {
          currentStreak++;
        } else if (record.status === 'missed') {
          break;
        }
        // Skip 'skipped' doses as they don't break streaks in cultural context
      }

      return { currentStreak };
    } catch (error) {
      console.error('Error calculating current streak:', error);
      return { currentStreak: 0 };
    }
  }

  /**
   * Calculate longest historical streak
   */
  private async calculateLongestStreak(patientId: string): Promise<number> {
    try {
      const allRecords = await this.getAdherenceRecords(patientId, undefined, 'yearly');

      // Sort by scheduled time ascending
      const sortedRecords = allRecords
        .sort((a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime());

      let longestStreak = 0;
      let currentStreak = 0;

      for (const record of sortedRecords) {
        if (record.status === 'taken' || record.status === 'late') {
          currentStreak++;
          longestStreak = Math.max(longestStreak, currentStreak);
        } else if (record.status === 'missed') {
          currentStreak = 0;
        }
        // Skip 'skipped' doses as they don't break streaks
      }

      return longestStreak;
    } catch (error) {
      console.error('Error calculating longest streak:', error);
      return 0;
    }
  }

  /**
   * Calculate baseline probability from historical data
   */
  private calculateBaselineProbability(records: AdherenceRecord[]): number {
    if (records.length === 0) return 0.5; // Default 50% if no data

    const takenCount = records.filter(r =>
      r.status === 'taken' || r.status === 'late'
    ).length;

    return takenCount / records.length;
  }

  /**
   * Identify risk factors for upcoming dose
   */
  private async identifyRiskFactors(
    patientId: string,
    medicationId: string,
    nextDoseTime: Date
  ): Promise<RiskFactor[]> {
    const riskFactors: RiskFactor[] = [];

    // Time-based risk factors
    const hour = nextDoseTime.getHours();
    if (hour < 6 || hour > 22) {
      riskFactors.push({
        factor: 'unusual_hour',
        impact: -0.15,
        confidence: 0.8,
        mitigation: 'Consider adjusting dose timing to regular hours'
      });
    }

    // Weekend effect
    const dayOfWeek = nextDoseTime.getDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      riskFactors.push({
        factor: 'weekend_schedule',
        impact: -0.10,
        confidence: 0.7,
        mitigation: 'Set weekend-specific reminders'
      });
    }

    // Historical adherence pattern
    const recentAdherence = await this.calculateAdherenceRate(patientId, medicationId, 'weekly');
    if (recentAdherence < this.ADHERENCE_THRESHOLDS.MODERATE) {
      riskFactors.push({
        factor: 'recent_poor_adherence',
        impact: -0.25,
        confidence: 0.9,
        mitigation: 'Increase reminder frequency and family support'
      });
    }

    return riskFactors;
  }

  /**
   * Identify cultural factors affecting upcoming dose
   */
  private async identifyCulturalFactors(
    nextDoseTime: Date,
    configuration: AdherenceConfiguration
  ): Promise<CulturalFactor[]> {
    const culturalFactors: CulturalFactor[] = [];

    // Check for Ramadan fasting
    const isRamadan = await this.culturalCalendar.isRamadanPeriod(nextDoseTime);
    if (isRamadan && configuration.culturalPreferences.religiousObservance.religion === 'islam') {
      culturalFactors.push({
        factor: 'ramadan_fasting',
        impact: 0.10, // Positive impact due to heightened awareness
        timeWindow: {
          start: nextDoseTime,
          end: new Date(nextDoseTime.getTime() + 24 * 60 * 60 * 1000)
        },
        adjustment: 'Adjusted for Sahur/Iftar timing'
      });
    }

    // Check for prayer time conflict
    const prayerTimes = await this.prayerTime.getPrayerTimes(nextDoseTime);
    const isPrayerTime = this.isNearPrayerTime(nextDoseTime, prayerTimes);
    if (isPrayerTime) {
      culturalFactors.push({
        factor: 'prayer_schedule',
        impact: -0.05, // Slight negative impact due to timing conflict
        timeWindow: {
          start: new Date(nextDoseTime.getTime() - 15 * 60 * 1000),
          end: new Date(nextDoseTime.getTime() + 45 * 60 * 1000)
        },
        adjustment: 'Buffer time for prayer completion'
      });
    }

    // Check for festival period
    const festivals = await this.culturalCalendar.getUpcomingEvents(nextDoseTime, 7);
    const nearbyFestival = festivals.find(f =>
      Math.abs(f.date.getTime() - nextDoseTime.getTime()) < 24 * 60 * 60 * 1000
    );
    if (nearbyFestival) {
      culturalFactors.push({
        factor: 'festival_period',
        impact: -0.08, // Negative impact due to disrupted routine
        timeWindow: {
          start: nearbyFestival.date,
          end: new Date(nearbyFestival.date.getTime() + nearbyFestival.duration_days * 24 * 60 * 60 * 1000)
        },
        adjustment: 'Festival period scheduling accommodation'
      });
    }

    return culturalFactors;
  }

  /**
   * Calculate cultural impact on adherence prediction
   */
  private calculateCulturalImpact(culturalFactors: CulturalFactor[]): number {
    return culturalFactors.reduce((total, factor) => total + factor.impact, 0);
  }

  /**
   * Calculate risk impact on adherence prediction
   */
  private calculateRiskImpact(riskFactors: RiskFactor[]): number {
    return riskFactors.reduce((total, factor) => total + Math.abs(factor.impact), 0);
  }

  /**
   * Generate adherence recommendations based on factors
   */
  private async generateAdherenceRecommendations(
    riskFactors: RiskFactor[],
    culturalFactors: CulturalFactor[],
    configuration: AdherenceConfiguration
  ) {
    const recommendations = [];

    // Risk-based recommendations
    for (const risk of riskFactors) {
      if (risk.mitigation) {
        recommendations.push({
          type: 'timing_adjustment' as const,
          message: risk.mitigation,
          messageMs: await this.translateToMalay(risk.mitigation),
          priority: risk.impact < -0.2 ? 'high' as const : 'medium' as const,
          actionRequired: true,
          culturalSensitive: false
        });
      }
    }

    // Cultural recommendations
    for (const cultural of culturalFactors) {
      if (cultural.factor === 'ramadan_fasting') {
        recommendations.push({
          type: 'cultural_accommodation' as const,
          message: 'Consider taking medication during Sahur or after Iftar',
          messageMs: 'Pertimbangkan untuk mengambil ubat semasa Sahur atau selepas Iftar',
          priority: 'medium' as const,
          actionRequired: true,
          culturalSensitive: true
        });
      }
    }

    return recommendations;
  }

  /**
   * Generate adherence insights based on records and analysis type
   */
  private async generateAdherenceInsights(
    records: AdherenceRecord[],
    analysisType: string
  ) {
    const insights = [];

    // Timing pattern insights
    const timingPatterns = this.analyzeTimingPatterns(records);
    if (timingPatterns.morningAdherence > timingPatterns.eveningAdherence) {
      insights.push({
        category: 'timing_patterns' as const,
        insight: 'Better adherence observed in morning doses compared to evening',
        insightMs: 'Kepatuhan yang lebih baik diperhatikan pada dos pagi berbanding petang',
        impact: 'positive' as const,
        actionable: true,
        culturalRelevance: 0.8
      });
    }

    // Cultural impact insights
    const culturalImpact = this.analyzeCulturalImpact(records);
    if (culturalImpact.festivalImpact < -0.1) {
      insights.push({
        category: 'cultural_impact' as const,
        insight: 'Festival periods show decreased adherence - consider additional support',
        insightMs: 'Tempoh perayaan menunjukkan penurunan kepatuhan - pertimbangkan sokongan tambahan',
        impact: 'negative' as const,
        actionable: true,
        culturalRelevance: 1.0
      });
    }

    return insights;
  }

  /**
   * Identify adherence patterns in the data
   */
  private async identifyAdherencePatterns(records: AdherenceRecord[]) {
    const patterns = [];

    // Weekly pattern analysis
    const weeklyPattern = this.analyzeWeeklyPattern(records);
    if (weeklyPattern.hasSignificantVariation) {
      patterns.push({
        pattern: 'weekly_variation',
        frequency: weeklyPattern.frequency,
        strength: weeklyPattern.strength,
        timeContext: weeklyPattern.timeContext,
        culturalContext: weeklyPattern.culturalContext,
        recommendations: weeklyPattern.recommendations
      });
    }

    return patterns;
  }

  /**
   * Generate cultural observations
   */
  private async generateCulturalObservations(
    records: AdherenceRecord[],
    patientId: string
  ) {
    const observations = [];

    const ramadanRecords = records.filter(r => r.culturalContext.fastingPeriod);
    if (ramadanRecords.length > 0) {
      const ramadanAdherence = this.calculateBaseAdherence(ramadanRecords);
      observations.push({
        observation: `Ramadan period adherence: ${(ramadanAdherence * 100).toFixed(1)}%`,
        observationMs: `Kepatuhan tempoh Ramadan: ${(ramadanAdherence * 100).toFixed(1)}%`,
        culturalSignificance: 1.0,
        impact: {
          adherenceChange: ramadanAdherence - 0.8, // Compare to baseline
          timingFlexibility: 0.8,
          familyInvolvement: 0.9,
          culturalHarmony: 0.95
        },
        suggestion: 'Continue supporting flexible timing during religious observances',
        suggestionMs: 'Teruskan menyokong masa yang fleksibel semasa ibadat agama'
      });
    }

    return observations;
  }

  // Helper methods
  private async getAdherenceRecords(
    patientId: string,
    medicationId?: string,
    period: TimePeriod = 'monthly'
  ): Promise<AdherenceRecord[]> {
    const query = `
      SELECT * FROM adherence_records
      WHERE patient_id = ?
      ${medicationId ? 'AND medication_id = ?' : ''}
      AND scheduled_time >= ?
      ORDER BY scheduled_time DESC
    `;

    const periodStart = this.getPeriodStart(period);
    const params = medicationId
      ? [patientId, medicationId, periodStart]
      : [patientId, periodStart];

    const rows = await this.db.query(query, params);
    return rows.map(this.mapRowToAdherenceRecord);
  }

  private async getAdherenceRecordsInRange(
    patientId: string,
    start: Date,
    end: Date
  ): Promise<AdherenceRecord[]> {
    const query = `
      SELECT * FROM adherence_records
      WHERE patient_id = ?
      AND scheduled_time BETWEEN ? AND ?
      ORDER BY scheduled_time ASC
    `;

    const rows = await this.db.query(query, [patientId, start, end]);
    return rows.map(this.mapRowToAdherenceRecord);
  }

  private async getPatientConfiguration(patientId: string): Promise<AdherenceConfiguration> {
    const cacheKey = `patient_config:${patientId}`;
    const cached = await this.cache.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    // Default configuration if not found
    const defaultConfig: AdherenceConfiguration = {
      patientId,
      culturalPreferences: {
        primaryLanguage: 'ms',
        religiousObservance: {
          religion: 'islam',
          observanceLevel: 'moderate',
          prayerTimePreferences: ['dawn', 'noon', 'afternoon', 'sunset', 'night'],
          fastingPeriods: ['ramadan']
        },
        festivalPriorities: ['eid_al_fitr', 'eid_al_adha', 'chinese_new_year', 'deepavali'],
        traditionMedicineIntegration: false,
        familyInvolvementLevel: 'moderate'
      },
      familySettings: {
        allowFamilyTracking: true,
        shareProgressWithFamily: true,
        familyNotifications: true,
        coordinationLevel: 'coordinated'
      },
      notificationSettings: {
        adherenceReminders: true,
        progressCelebrations: true,
        familyUpdates: true,
        culturalAdaptations: true,
        preferredTiming: ['08:00', '13:00', '20:00']
      },
      analyticsSettings: {
        enablePredictiveAnalytics: true,
        culturalFactorAnalysis: true,
        familyAnalytics: true,
        shareWithProviders: true,
        dataRetentionPeriod: 365
      }
    };

    await this.cache.setex(cacheKey, 7200, JSON.stringify(defaultConfig));
    return defaultConfig;
  }

  private getPeriodStart(period: TimePeriod): Date {
    const now = new Date();
    switch (period) {
      case 'daily':
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
      case 'weekly':
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        return weekStart;
      case 'monthly':
        return new Date(now.getFullYear(), now.getMonth(), 1);
      case 'quarterly':
        const quarter = Math.floor(now.getMonth() / 3);
        return new Date(now.getFullYear(), quarter * 3, 1);
      case 'yearly':
        return new Date(now.getFullYear(), 0, 1);
      default:
        return new Date(now.getFullYear(), now.getMonth(), 1);
    }
  }

  private getCacheTTL(period: TimePeriod): number {
    switch (period) {
      case 'daily':
        return this.CACHE_TTL.DAILY_METRICS;
      case 'weekly':
        return this.CACHE_TTL.WEEKLY_METRICS;
      case 'monthly':
      case 'quarterly':
      case 'yearly':
        return this.CACHE_TTL.MONTHLY_METRICS;
      default:
        return this.CACHE_TTL.DAILY_METRICS;
    }
  }

  private calculatePredictionConfidence(historicalDataSize: number): number {
    if (historicalDataSize === 0) return 0.1;
    if (historicalDataSize < 10) return 0.3;
    if (historicalDataSize < 30) return 0.6;
    if (historicalDataSize < 90) return 0.8;
    return 0.95;
  }

  private isNearPrayerTime(dateTime: Date, prayerTimes: any): boolean {
    const bufferMinutes = 30;
    const timeMs = dateTime.getTime();

    for (const prayerTime of Object.values(prayerTimes)) {
      const prayerMs = (prayerTime as Date).getTime();
      if (Math.abs(timeMs - prayerMs) < bufferMinutes * 60 * 1000) {
        return true;
      }
    }
    return false;
  }

  private async translateToMalay(text: string): Promise<string> {
    // Simple translation mapping - in production, use proper translation service
    const translations: { [key: string]: string } = {
      'Consider adjusting dose timing to regular hours': 'Pertimbangkan untuk melaraskan masa dos ke waktu biasa',
      'Set weekend-specific reminders': 'Tetapkan peringatan khusus hujung minggu',
      'Increase reminder frequency and family support': 'Tingkatkan kekerapan peringatan dan sokongan keluarga'
    };

    return translations[text] || text;
  }

  private mapRowToAdherenceRecord(row: any): AdherenceRecord {
    return {
      id: row.id,
      medicationId: row.medication_id,
      patientId: row.patient_id,
      scheduledTime: new Date(row.scheduled_time),
      takenTime: row.taken_time ? new Date(row.taken_time) : undefined,
      status: row.status as AdherenceStatus,
      adherenceScore: row.adherence_score,
      notes: row.notes,
      culturalContext: JSON.parse(row.cultural_context || '{}'),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  // Analysis helper methods
  private analyzeTimingPatterns(records: AdherenceRecord[]) {
    const morningRecords = records.filter(r => {
      const hour = r.scheduledTime.getHours();
      return hour >= 6 && hour < 12;
    });
    const eveningRecords = records.filter(r => {
      const hour = r.scheduledTime.getHours();
      return hour >= 18 && hour < 22;
    });

    const morningAdherence = this.calculateBaseAdherence(morningRecords);
    const eveningAdherence = this.calculateBaseAdherence(eveningRecords);

    return { morningAdherence, eveningAdherence };
  }

  private analyzeCulturalImpact(records: AdherenceRecord[]) {
    const festivalRecords = records.filter(r => r.culturalContext.festivalPeriod);
    const normalRecords = records.filter(r => !r.culturalContext.festivalPeriod);

    const festivalAdherence = this.calculateBaseAdherence(festivalRecords);
    const normalAdherence = this.calculateBaseAdherence(normalRecords);

    return {
      festivalImpact: festivalAdherence - normalAdherence
    };
  }

  private analyzeWeeklyPattern(records: AdherenceRecord[]) {
    const weeklyStats = new Array(7).fill(0).map(() => ({ total: 0, taken: 0 }));

    records.forEach(record => {
      const dayOfWeek = record.scheduledTime.getDay();
      weeklyStats[dayOfWeek].total++;
      if (record.status === 'taken' || record.status === 'late') {
        weeklyStats[dayOfWeek].taken++;
      }
    });

    const adherenceRates = weeklyStats.map(stat =>
      stat.total > 0 ? stat.taken / stat.total : 0
    );

    const maxRate = Math.max(...adherenceRates);
    const minRate = Math.min(...adherenceRates);
    const variation = maxRate - minRate;

    return {
      hasSignificantVariation: variation > 0.2,
      frequency: adherenceRates,
      strength: variation,
      timeContext: ['weekly'],
      culturalContext: ['work_schedule', 'weekend_routine'],
      recommendations: ['Consider weekend-specific strategies']
    };
  }
}