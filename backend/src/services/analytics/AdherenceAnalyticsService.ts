/**
 * Adherence Analytics Service
 *
 * Core analytics engine for medication adherence tracking with Malaysian cultural intelligence.
 * Provides comprehensive adherence calculations, cultural scoring, and predictive analytics.
 */

import { DatabaseService } from '../database/databaseService';
import { CacheService } from '../cache/redisService';
import { CulturalCalendarService } from '../cultural/culturalCalendarService';
import { PrayerTimeService } from '../cultural/prayerTimeService';
import {
  AdherenceRecord,
  ProgressMetrics,
  AdherenceAnalytics,
  AdherencePrediction,
  FamilyAdherenceMetrics,
  CulturalFactor,
  AdherenceStatistics,
  CulturalAdjustmentMetrics,
  AdherenceInsight,
  AdherencePattern,
  CulturalObservation,
  TimePeriod
} from '../../types/adherence/adherence.types';
import { v4 as uuidv4 } from 'uuid';

export class AdherenceAnalyticsService {
  private static instance: AdherenceAnalyticsService;
  private db: DatabaseService;
  private cache: CacheService;
  private culturalCalendar: CulturalCalendarService;
  private prayerTimeService: PrayerTimeService;

  constructor() {
    this.db = DatabaseService.getInstance();
    this.cache = CacheService.getInstance();
    this.culturalCalendar = new CulturalCalendarService();
    this.prayerTimeService = new PrayerTimeService();
  }

  public static getInstance(): AdherenceAnalyticsService {
    if (!AdherenceAnalyticsService.instance) {
      AdherenceAnalyticsService.instance = new AdherenceAnalyticsService();
    }
    return AdherenceAnalyticsService.instance;
  }

  /**
   * Calculate comprehensive progress metrics with cultural considerations
   */
  async calculateProgressMetrics(
    patientId: string,
    period: TimePeriod,
    medicationId?: string
  ): Promise<ProgressMetrics> {
    const cacheKey = `progress_metrics:${patientId}:${period}:${medicationId || 'all'}`;
    const cached = await this.cache.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const { startDate, endDate } = this.getPeriodDates(period);

    // Get adherence records for the period
    const adherenceRecords = await this.getAdherenceRecords(
      patientId,
      startDate,
      endDate,
      medicationId
    );

    // Calculate basic metrics
    const totalDoses = adherenceRecords.length;
    const takenDoses = adherenceRecords.filter(r => r.status === 'taken').length;
    const lateDoses = adherenceRecords.filter(r => r.status === 'late').length;
    const missedDoses = adherenceRecords.filter(r => r.status === 'missed').length;
    const skippedDoses = adherenceRecords.filter(r => r.status === 'skipped').length;

    // Calculate adherence rate with cultural adjustments
    const baseAdherenceRate = totalDoses > 0 ? (takenDoses + lateDoses) / totalDoses : 0;
    const culturalAdjustments = await this.calculateCulturalAdjustments(
      adherenceRecords,
      startDate,
      endDate
    );

    // Apply cultural scoring bonus for proper accommodations
    const culturalBonus = this.calculateCulturalBonus(culturalAdjustments);
    const adherenceRate = Math.min(1, baseAdherenceRate + culturalBonus);

    // Calculate streak data
    const streakData = await this.calculateStreakMetrics(patientId, medicationId);

    const metrics: ProgressMetrics = {
      patientId,
      period,
      adherenceRate: Math.round(adherenceRate * 1000) / 10, // Convert to percentage with 1 decimal
      streakCount: streakData.currentStreak,
      longestStreak: streakData.longestStreak,
      totalDoses,
      takenDoses,
      missedDoses,
      lateDoses,
      skippedDoses,
      culturalAdjustments,
      calculatedAt: new Date()
    };

    // Cache for 5 minutes
    await this.cache.set(cacheKey, JSON.stringify(metrics), 300);

    return metrics;
  }

  /**
   * Generate comprehensive adherence analytics with cultural insights
   */
  async generateAdherenceAnalytics(
    patientId: string,
    timeframe: { start: Date; end: Date },
    analysisType: 'individual' | 'family' | 'medication' | 'cultural' | 'predictive' = 'individual'
  ): Promise<AdherenceAnalytics> {
    const adherenceRecords = await this.getAdherenceRecords(
      patientId,
      timeframe.start,
      timeframe.end
    );

    const insights = await this.generateAdherenceInsights(adherenceRecords, timeframe);
    const patterns = await this.identifyAdherencePatterns(adherenceRecords);
    const culturalObservations = await this.generateCulturalObservations(
      patientId,
      adherenceRecords,
      timeframe
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
  }

  /**
   * Generate adherence predictions with cultural factor analysis
   */
  async generateAdherencePrediction(
    patientId: string,
    medicationId: string,
    forecastDays: number = 7
  ): Promise<AdherencePrediction> {
    // Get historical adherence data
    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000); // Last 30 days

    const adherenceRecords = await this.getAdherenceRecords(
      patientId,
      startDate,
      endDate,
      medicationId
    );

    // Get upcoming cultural factors
    const forecastEndDate = new Date(endDate.getTime() + forecastDays * 24 * 60 * 60 * 1000);
    const culturalFactors = await this.getUpcomingCulturalFactors(
      patientId,
      endDate,
      forecastEndDate
    );

    // Calculate base adherence probability from historical data
    const recentAdherenceRate = adherenceRecords.length > 0
      ? adherenceRecords.filter(r => r.status === 'taken' || r.status === 'late').length / adherenceRecords.length
      : 0.5;

    // Adjust for cultural factors
    let culturalAdjustment = 0;
    culturalFactors.forEach(factor => {
      culturalAdjustment += factor.impact;
    });

    const adherenceProbability = Math.max(0, Math.min(1, recentAdherenceRate + culturalAdjustment));

    // Generate risk factors
    const riskFactors = await this.identifyRiskFactors(patientId, adherenceRecords);

    // Generate recommendations
    const recommendations = await this.generateAdherenceRecommendations(
      patientId,
      adherenceRecords,
      culturalFactors,
      riskFactors
    );

    return {
      patientId,
      medicationId,
      nextDoseTime: new Date(), // This would be calculated from medication schedule
      adherenceProbability: Math.round(adherenceProbability * 1000) / 10,
      riskFactors,
      culturalFactors,
      recommendations,
      confidence: this.calculatePredictionConfidence(adherenceRecords, culturalFactors),
      modelVersion: '1.0.0',
      predictedAt: new Date()
    };
  }

  /**
   * Calculate family-wide adherence metrics with cultural coordination analysis
   */
  async calculateFamilyAdherenceMetrics(familyId: string): Promise<FamilyAdherenceMetrics> {
    const cacheKey = `family_adherence:${familyId}`;
    const cached = await this.cache.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    // Get family members
    const familyMembers = await this.getFamilyMembers(familyId);

    const memberMetrics = [];
    let totalAdherence = 0;
    let totalCoordination = 0;
    let totalCulturalHarmony = 0;

    for (const member of familyMembers) {
      const memberProgress = await this.calculateProgressMetrics(member.id, 'monthly');
      const supportMetrics = await this.calculateSupportMetrics(member.id, familyId);

      memberMetrics.push({
        memberId: member.id,
        role: member.role,
        adherenceRate: memberProgress.adherenceRate,
        supportProvided: supportMetrics.provided,
        supportReceived: supportMetrics.received
      });

      totalAdherence += memberProgress.adherenceRate;
      totalCoordination += supportMetrics.coordinationScore;
      totalCulturalHarmony += supportMetrics.culturalHarmony;
    }

    const familyMetrics: FamilyAdherenceMetrics = {
      familyId,
      headOfFamily: familyMembers.find(m => m.role === 'head')?.id || familyMembers[0].id,
      memberMetrics,
      familyAdherenceRate: familyMembers.length > 0 ? totalAdherence / familyMembers.length : 0,
      coordinationScore: familyMembers.length > 0 ? totalCoordination / familyMembers.length : 0,
      culturalHarmony: familyMembers.length > 0 ? totalCulturalHarmony / familyMembers.length : 0,
      lastUpdated: new Date()
    };

    // Cache for 15 minutes
    await this.cache.set(cacheKey, JSON.stringify(familyMetrics), 900);

    return familyMetrics;
  }

  /**
   * Generate comprehensive adherence statistics for population analysis
   */
  async generateAdherenceStatistics(
    filters?: {
      patientIds?: string[];
      culturalGroup?: string;
      timeframe?: { start: Date; end: Date };
    }
  ): Promise<AdherenceStatistics> {
    const cacheKey = `adherence_stats:${JSON.stringify(filters)}`;
    const cached = await this.cache.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    // This would contain comprehensive statistical analysis
    // For now, providing a structured response
    const statistics: AdherenceStatistics = {
      population: await this.calculatePopulationMetrics(filters),
      individual: filters?.patientIds?.length === 1
        ? await this.calculateIndividualMetrics(filters.patientIds[0])
        : {} as any,
      cultural: await this.calculateCulturalMetrics(filters),
      temporal: await this.calculateTemporalMetrics(filters),
      comparative: await this.calculateComparativeMetrics(filters)
    };

    // Cache for 30 minutes
    await this.cache.set(cacheKey, JSON.stringify(statistics), 1800);

    return statistics;
  }

  // Private helper methods

  private getPeriodDates(period: TimePeriod): { startDate: Date; endDate: Date } {
    const now = new Date();
    const endDate = now;
    let startDate: Date;

    switch (period) {
      case 'daily':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'weekly':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'monthly':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'quarterly':
        const currentQuarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), currentQuarter * 3, 1);
        break;
      case 'yearly':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    return { startDate, endDate };
  }

  private async getAdherenceRecords(
    patientId: string,
    startDate: Date,
    endDate: Date,
    medicationId?: string
  ): Promise<AdherenceRecord[]> {
    let query = `
      SELECT ar.*, ac.prayer_time_conflict, ac.fasting_period, ac.festival_period,
             ac.family_support, ac.traditional_medicine_used, ac.reason_code
      FROM adherence_records ar
      LEFT JOIN adherence_cultural_context ac ON ar.id = ac.adherence_record_id
      WHERE ar.patient_id = $1 AND ar.scheduled_time BETWEEN $2 AND $3
    `;

    const params = [patientId, startDate.toISOString(), endDate.toISOString()];

    if (medicationId) {
      query += ` AND ar.medication_id = $4`;
      params.push(medicationId);
    }

    query += ` ORDER BY ar.scheduled_time DESC`;

    try {
      const records = await this.db.query(query, params);
      return records.map(this.transformAdherenceRecord);
    } catch (error) {
      console.error('Error fetching adherence records:', error);
      return [];
    }
  }

  private transformAdherenceRecord(row: any): AdherenceRecord {
    return {
      id: row.id,
      medicationId: row.medication_id,
      patientId: row.patient_id,
      scheduledTime: new Date(row.scheduled_time),
      takenTime: row.taken_time ? new Date(row.taken_time) : undefined,
      status: row.status,
      adherenceScore: row.adherence_score,
      notes: row.notes,
      culturalContext: {
        prayerTimeConflict: row.prayer_time_conflict || false,
        fastingPeriod: row.fasting_period || false,
        festivalPeriod: row.festival_period,
        familySupport: row.family_support || false,
        traditionalMedicineUsed: row.traditional_medicine_used || false,
        reasonCode: row.reason_code
      },
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  private async calculateCulturalAdjustments(
    records: AdherenceRecord[],
    startDate: Date,
    endDate: Date
  ): Promise<CulturalAdjustmentMetrics> {
    const ramadanAdjustments = records.filter(r =>
      r.culturalContext.fastingPeriod && r.status === 'taken'
    ).length;

    const prayerTimeDelays = records.filter(r =>
      r.culturalContext.prayerTimeConflict && r.status === 'late'
    ).length;

    const festivalExemptions = records.filter(r =>
      r.culturalContext.festivalPeriod && r.status === 'skipped'
    ).length;

    const familyCoordinationImpact = records.filter(r =>
      r.culturalContext.familySupport && r.status === 'taken'
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

  private calculateCulturalBonus(adjustments: CulturalAdjustmentMetrics): number {
    // Award bonus points for proper cultural accommodations
    let bonus = 0;

    // Bonus for Ramadan compliance
    if (adjustments.ramadanAdjustments > 0) {
      bonus += 0.02; // 2% bonus
    }

    // Bonus for family coordination
    if (adjustments.familyCoordinationImpact > 0) {
      bonus += 0.01; // 1% bonus
    }

    // Small penalty for unmanaged prayer time conflicts
    if (adjustments.prayerTimeDelays > 5) {
      bonus -= 0.01; // 1% penalty
    }

    return Math.max(0, bonus);
  }

  private async calculateStreakMetrics(
    patientId: string,
    medicationId?: string
  ): Promise<{ currentStreak: number; longestStreak: number }> {
    let query = `
      SELECT status, scheduled_time
      FROM adherence_records
      WHERE patient_id = $1
    `;

    const params = [patientId];

    if (medicationId) {
      query += ` AND medication_id = $2`;
      params.push(medicationId);
    }

    query += ` ORDER BY scheduled_time DESC LIMIT 100`;

    try {
      const records = await this.db.query(query, params);

      let currentStreak = 0;
      let longestStreak = 0;
      let tempStreak = 0;

      for (const record of records) {
        if (record.status === 'taken' || record.status === 'late') {
          tempStreak++;
          if (currentStreak === 0) currentStreak = tempStreak;
        } else {
          if (tempStreak > longestStreak) {
            longestStreak = tempStreak;
          }
          tempStreak = 0;
          currentStreak = 0;
        }
      }

      if (tempStreak > longestStreak) {
        longestStreak = tempStreak;
      }

      return { currentStreak, longestStreak };
    } catch (error) {
      console.error('Error calculating streak metrics:', error);
      return { currentStreak: 0, longestStreak: 0 };
    }
  }

  private async generateAdherenceInsights(
    records: AdherenceRecord[],
    timeframe: { start: Date; end: Date }
  ): Promise<AdherenceInsight[]> {
    const insights: AdherenceInsight[] = [];

    // Timing pattern analysis
    const timingPatterns = this.analyzeTimingPatterns(records);
    if (timingPatterns.length > 0) {
      insights.push({
        category: 'timing_patterns',
        insight: `Most consistent medication times: ${timingPatterns.join(', ')}`,
        insightMs: `Masa ubat yang paling konsisten: ${timingPatterns.join(', ')}`,
        impact: 'positive',
        actionable: true,
        culturalRelevance: 0.6
      });
    }

    // Cultural impact analysis
    const culturalImpactRecords = records.filter(r =>
      r.culturalContext.prayerTimeConflict || r.culturalContext.fastingPeriod
    );

    if (culturalImpactRecords.length > 0) {
      const culturalAdherenceRate = culturalImpactRecords.filter(r =>
        r.status === 'taken' || r.status === 'late'
      ).length / culturalImpactRecords.length;

      insights.push({
        category: 'cultural_impact',
        insight: `Cultural accommodation success rate: ${Math.round(culturalAdherenceRate * 100)}%`,
        insightMs: `Kadar kejayaan penyesuaian budaya: ${Math.round(culturalAdherenceRate * 100)}%`,
        impact: culturalAdherenceRate > 0.8 ? 'positive' : 'negative',
        actionable: true,
        culturalRelevance: 0.9
      });
    }

    return insights;
  }

  private async identifyAdherencePatterns(records: AdherenceRecord[]): Promise<AdherencePattern[]> {
    const patterns: AdherencePattern[] = [];

    // Day of week patterns
    const dayPatterns = this.analyzeDayOfWeekPatterns(records);
    if (dayPatterns.variance > 0.1) {
      patterns.push({
        pattern: 'Weekly adherence variation',
        frequency: 7,
        strength: dayPatterns.variance,
        timeContext: ['weekly'],
        culturalContext: ['work_schedule', 'religious_observance'],
        recommendations: ['Adjust weekend reminders', 'Consider cultural day preferences']
      });
    }

    return patterns;
  }

  private async generateCulturalObservations(
    patientId: string,
    records: AdherenceRecord[],
    timeframe: { start: Date; end: Date }
  ): Promise<CulturalObservation[]> {
    const observations: CulturalObservation[] = [];

    // Prayer time analysis
    const prayerConflicts = records.filter(r => r.culturalContext.prayerTimeConflict);
    if (prayerConflicts.length > 0) {
      observations.push({
        observation: 'Prayer time conflicts detected in medication schedule',
        observationMs: 'Konflik waktu solat dikesan dalam jadual ubat',
        culturalSignificance: 0.8,
        impact: {
          adherenceChange: -0.1,
          timingFlexibility: 0.3,
          familyInvolvement: 0.2,
          culturalHarmony: -0.2
        },
        suggestion: 'Consider adjusting medication times to accommodate prayer schedule',
        suggestionMs: 'Pertimbangkan untuk menyesuaikan waktu ubat mengikut jadual solat'
      });
    }

    return observations;
  }

  // Additional helper methods would continue here...
  private analyzeTimingPatterns(records: AdherenceRecord[]): string[] {
    // Simplified timing analysis
    const timeSlots = new Map<string, number>();

    records.forEach(record => {
      if (record.status === 'taken' && record.takenTime) {
        const hour = record.takenTime.getHours();
        const timeSlot = `${hour.toString().padStart(2, '0')}:00`;
        timeSlots.set(timeSlot, (timeSlots.get(timeSlot) || 0) + 1);
      }
    });

    return Array.from(timeSlots.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([time]) => time);
  }

  private analyzeDayOfWeekPatterns(records: AdherenceRecord[]): { variance: number } {
    const dayStats = new Array(7).fill(0);
    const dayCounts = new Array(7).fill(0);

    records.forEach(record => {
      const dayOfWeek = record.scheduledTime.getDay();
      dayCounts[dayOfWeek]++;
      if (record.status === 'taken' || record.status === 'late') {
        dayStats[dayOfWeek]++;
      }
    });

    const adherenceRates = dayStats.map((taken, i) =>
      dayCounts[i] > 0 ? taken / dayCounts[i] : 0
    );

    const average = adherenceRates.reduce((sum, rate) => sum + rate, 0) / 7;
    const variance = adherenceRates.reduce((sum, rate) => sum + Math.pow(rate - average, 2), 0) / 7;

    return { variance: Math.sqrt(variance) };
  }

  // Placeholder implementations for complex methods
  private async getUpcomingCulturalFactors(
    patientId: string,
    startDate: Date,
    endDate: Date
  ): Promise<CulturalFactor[]> {
    // This would analyze upcoming cultural events and their impact
    return [];
  }

  private async identifyRiskFactors(patientId: string, records: AdherenceRecord[]): Promise<any[]> {
    // This would identify adherence risk factors
    return [];
  }

  private async generateAdherenceRecommendations(
    patientId: string,
    records: AdherenceRecord[],
    culturalFactors: CulturalFactor[],
    riskFactors: any[]
  ): Promise<any[]> {
    // This would generate personalized recommendations
    return [];
  }

  private calculatePredictionConfidence(
    records: AdherenceRecord[],
    culturalFactors: CulturalFactor[]
  ): number {
    // Base confidence on data volume and consistency
    const dataPoints = records.length;
    const baseConfidence = Math.min(0.9, dataPoints / 30); // Max confidence with 30+ records

    // Adjust for cultural factor certainty
    const culturalCertainty = culturalFactors.length > 0
      ? culturalFactors.reduce((sum, f) => sum + (f.impact * 0.1), 0)
      : 0;

    return Math.max(0.3, Math.min(0.95, baseConfidence + culturalCertainty));
  }

  private async getFamilyMembers(familyId: string): Promise<any[]> {
    // This would fetch family members from the database
    return [];
  }

  private async calculateSupportMetrics(memberId: string, familyId: string): Promise<any> {
    // This would calculate family support metrics
    return {
      provided: 0,
      received: 0,
      coordinationScore: 0,
      culturalHarmony: 0
    };
  }

  private async calculatePopulationMetrics(filters?: any): Promise<any> {
    // This would calculate population-level metrics
    return {};
  }

  private async calculateIndividualMetrics(patientId: string): Promise<any> {
    // This would calculate individual patient metrics
    return {};
  }

  private async calculateCulturalMetrics(filters?: any): Promise<any> {
    // This would calculate cultural impact metrics
    return {};
  }

  private async calculateTemporalMetrics(filters?: any): Promise<any> {
    // This would calculate temporal patterns
    return {};
  }

  private async calculateComparativeMetrics(filters?: any): Promise<any> {
    // This would calculate comparative analysis
    return {};
  }
}