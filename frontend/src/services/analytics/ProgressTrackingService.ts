/**
 * ProgressTrackingService.ts
 * Comprehensive analytics and progress tracking service
 * Integrates with medication and reminder systems for actionable insights
 */

import {
  AdherenceRecord,
  ProgressMetrics,
  StreakInfo,
  Milestone,
  AdherencePrediction,
  CulturalPattern,
  AdherenceAnalyticsEvent,
  AdherenceReport,
  AdherenceImprovement,
  AdherencePeriod,
  MilestoneType,
  CulturalTheme
} from '../../types/adherence';
import { Medication } from '../../types/medication';
import { AdherenceCalculationEngine } from '../adherence/AdherenceCalculationEngine';
import { CulturalPatternAnalyzer } from '../adherence/CulturalPatternAnalyzer';
import { PredictiveAdherenceEngine } from '../adherence/PredictiveAdherenceEngine';
import { MedicationService } from '../medication';
import { ReminderSchedulingService } from '../reminder/ReminderSchedulingService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

/**
 * Analytics dashboard data
 */
interface AnalyticsDashboard {
  patientId: string;
  lastUpdated: Date;
  metrics: {
    current: ProgressMetrics;
    previous: ProgressMetrics;
    change: {
      adherenceRate: number;
      streakCount: number;
      missedDoses: number;
    };
  };
  streaks: StreakInfo;
  predictions: AdherencePrediction;
  culturalInsights: CulturalPattern;
  milestones: {
    recent: Milestone[];
    upcoming: Milestone[];
  };
  improvements: AdherenceImprovement[];
  trends: {
    daily: { date: Date; adherence: number }[];
    weekly: { week: string; adherence: number }[];
    monthly: { month: string; adherence: number }[];
  };
}

/**
 * Analytics configuration
 */
interface AnalyticsConfig {
  autoSync: boolean;
  syncInterval: number; // minutes
  offlineCapacityDays: number;
  reportGenerationSchedule: 'daily' | 'weekly' | 'monthly';
  milestoneNotifications: boolean;
  improvementSuggestions: boolean;
}

export class ProgressTrackingService {
  private static instance: ProgressTrackingService;
  private calculationEngine: AdherenceCalculationEngine;
  private culturalAnalyzer: CulturalPatternAnalyzer;
  private predictiveEngine: PredictiveAdherenceEngine;
  private medicationService: MedicationService;
  private reminderService: ReminderSchedulingService;
  private cacheKey = '@MediMate:ProgressTracking';
  private config: AnalyticsConfig;
  private syncTimer?: NodeJS.Timeout;
  private analyticsQueue: AdherenceAnalyticsEvent[] = [];

  private constructor() {
    this.calculationEngine = AdherenceCalculationEngine.getInstance();
    this.culturalAnalyzer = CulturalPatternAnalyzer.getInstance();
    this.predictiveEngine = PredictiveAdherenceEngine.getInstance();
    this.medicationService = MedicationService.getInstance();
    this.reminderService = ReminderSchedulingService.getInstance();

    this.config = {
      autoSync: true,
      syncInterval: 30, // 30 minutes
      offlineCapacityDays: 7,
      reportGenerationSchedule: 'weekly',
      milestoneNotifications: true,
      improvementSuggestions: true
    };

    this.initializeService();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): ProgressTrackingService {
    if (!ProgressTrackingService.instance) {
      ProgressTrackingService.instance = new ProgressTrackingService();
    }
    return ProgressTrackingService.instance;
  }

  /**
   * Initialize the service
   */
  private async initializeService(): Promise<void> {
    // Load cached data
    await this.loadCachedData();

    // Set up auto-sync if enabled
    if (this.config.autoSync) {
      this.startAutoSync();
    }

    // Load calculation engine cache
    await this.calculationEngine.loadCache();

    // Monitor network connectivity
    NetInfo.addEventListener(state => {
      if (state.isConnected && this.analyticsQueue.length > 0) {
        this.flushAnalyticsQueue();
      }
    });
  }

  /**
   * Record medication intake
   */
  public async recordIntake(
    medicationId: string,
    patientId: string,
    scheduledTime: Date,
    takenTime: Date,
    notes?: string
  ): Promise<AdherenceRecord> {
    const record: AdherenceRecord = {
      id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      medicationId,
      patientId,
      scheduledTime,
      takenTime,
      status: this.determineStatus(scheduledTime, takenTime),
      adherenceScore: 0,
      reminderSent: false,
      notes,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Calculate adherence score
    record.adherenceScore = this.calculationEngine.calculateDoseAdherenceScore(record);

    // Store record
    await this.storeRecord(record);

    // Track analytics event
    await this.trackEvent({
      eventType: 'dose_taken',
      patientId,
      medicationId,
      timestamp: new Date(),
      metadata: {
        scheduledTime: scheduledTime.toISOString(),
        takenTime: takenTime.toISOString(),
        adherenceScore: record.adherenceScore
      }
    });

    // Check for milestone achievements
    await this.checkMilestones(patientId);

    return record;
  }

  /**
   * Record missed dose
   */
  public async recordMissed(
    medicationId: string,
    patientId: string,
    scheduledTime: Date,
    reason?: string
  ): Promise<AdherenceRecord> {
    const record: AdherenceRecord = {
      id: `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      medicationId,
      patientId,
      scheduledTime,
      status: 'missed',
      adherenceScore: 0,
      reminderSent: true,
      notes: reason,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Store record
    await this.storeRecord(record);

    // Track analytics event
    await this.trackEvent({
      eventType: 'dose_missed',
      patientId,
      medicationId,
      timestamp: new Date(),
      metadata: {
        scheduledTime: scheduledTime.toISOString(),
        reason
      }
    });

    // Generate improvement suggestions
    if (this.config.improvementSuggestions) {
      await this.generateImprovementSuggestions(patientId);
    }

    return record;
  }

  /**
   * Get analytics dashboard
   */
  public async getAnalyticsDashboard(
    patientId: string,
    period: AdherencePeriod = 'monthly'
  ): Promise<AnalyticsDashboard> {
    // Get adherence records
    const records = await this.getRecords(patientId);

    // Calculate date ranges
    const endDate = new Date();
    const startDate = this.getStartDate(endDate, period);
    const previousStartDate = this.getStartDate(startDate, period);

    // Calculate current metrics
    const currentMetrics = await this.calculationEngine.calculateAdherenceRate(
      records.filter(r => r.scheduledTime >= startDate && r.scheduledTime <= endDate),
      period,
      startDate,
      endDate
    );

    // Calculate previous period metrics
    const previousMetrics = await this.calculationEngine.calculateAdherenceRate(
      records.filter(r => r.scheduledTime >= previousStartDate && r.scheduledTime < startDate),
      period,
      previousStartDate,
      startDate
    );

    // Calculate changes
    const change = {
      adherenceRate: currentMetrics.adherenceRate - previousMetrics.adherenceRate,
      streakCount: currentMetrics.streakCount - previousMetrics.streakCount,
      missedDoses: currentMetrics.missedDoses - previousMetrics.missedDoses
    };

    // Get streak information
    const streaks = await this.calculationEngine.calculateStreaks(records, patientId);

    // Get predictions
    const predictions = await this.predictiveEngine.predictAdherence(patientId, records);

    // Get cultural insights
    const culturalInsights = await this.culturalAnalyzer.analyzeCulturalPatterns(
      records,
      patientId
    );

    // Get milestones
    const milestones = await this.getMilestones(patientId);

    // Get improvement suggestions
    const improvements = await this.getImprovementSuggestions(patientId);

    // Calculate trends
    const trends = await this.calculateTrends(records);

    return {
      patientId,
      lastUpdated: new Date(),
      metrics: {
        current: currentMetrics,
        previous: previousMetrics,
        change
      },
      streaks,
      predictions,
      culturalInsights,
      milestones,
      improvements,
      trends
    };
  }

  /**
   * Generate provider report
   */
  public async generateProviderReport(
    patientId: string,
    providerId: string,
    reportType: 'weekly' | 'monthly' | 'quarterly' | 'custom',
    startDate?: Date,
    endDate?: Date
  ): Promise<AdherenceReport> {
    // Determine date range
    if (!endDate) endDate = new Date();
    if (!startDate) {
      startDate = this.getStartDate(endDate,
        reportType === 'weekly' ? 'weekly' :
        reportType === 'monthly' ? 'monthly' : 'quarterly'
      );
    }

    // Get records for period
    const records = await this.getRecords(patientId);
    const periodRecords = records.filter(
      r => r.scheduledTime >= startDate! && r.scheduledTime <= endDate!
    );

    // Calculate overall adherence
    const metrics = await this.calculationEngine.calculateAdherenceRate(
      periodRecords,
      'daily',
      startDate,
      endDate
    );

    // Get medications
    const medications = await this.getMedicationDetails(periodRecords);

    // Calculate medication-specific metrics
    const medicationMetrics = await this.calculateMedicationMetrics(
      periodRecords,
      medications
    );

    // Calculate trends
    const trends = this.calculateReportTrends(records, startDate, endDate);

    // Get cultural factors
    const culturalPattern = await this.culturalAnalyzer.analyzeCulturalPatterns(
      periodRecords,
      patientId
    );

    // Generate recommendations
    const recommendations = await this.generateReportRecommendations(
      metrics,
      culturalPattern,
      medicationMetrics
    );

    const report: AdherenceReport = {
      id: `report_${Date.now()}`,
      patientId,
      providerId,
      reportType,
      startDate,
      endDate,
      overallAdherence: metrics.adherenceRate,
      medications: medicationMetrics,
      trends,
      culturalFactors: culturalPattern.culturalConsiderations,
      recommendations,
      generatedAt: new Date()
    };

    // Store report
    await this.storeReport(report);

    return report;
  }

  /**
   * Check and award milestones
   */
  private async checkMilestones(patientId: string): Promise<void> {
    const records = await this.getRecords(patientId);
    const streaks = await this.calculationEngine.calculateStreaks(records, patientId);
    const existingMilestones = await this.getMilestones(patientId);

    // Check streak milestones
    const streakMilestones = [
      { threshold: 7, theme: 'traditional' as CulturalTheme, title: 'Week Warrior' },
      { threshold: 30, theme: 'modern' as CulturalTheme, title: 'Monthly Master' },
      { threshold: 90, theme: 'merdeka' as CulturalTheme, title: 'Quarter Champion' },
      { threshold: 365, theme: 'malaysia_day' as CulturalTheme, title: 'Year Legend' }
    ];

    for (const milestone of streakMilestones) {
      if (streaks.currentStreak >= milestone.threshold) {
        const existing = existingMilestones.recent.find(
          m => m.type === 'streak' && m.threshold === milestone.threshold
        );

        if (!existing) {
          await this.awardMilestone({
            id: `milestone_${Date.now()}`,
            patientId,
            type: 'streak',
            threshold: milestone.threshold,
            culturalTheme: milestone.theme,
            achievedDate: new Date(),
            celebrationShown: false,
            title: milestone.title,
            description: `Achieved ${milestone.threshold}-day streak!`,
            familyNotified: false
          });
        }
      }
    }

    // Check adherence milestones
    const last30Days = new Date();
    last30Days.setDate(last30Days.getDate() - 30);

    const recentMetrics = await this.calculationEngine.calculateAdherenceRate(
      records.filter(r => r.scheduledTime >= last30Days),
      'monthly',
      last30Days,
      new Date()
    );

    if (recentMetrics.adherenceRate >= 90) {
      const existing = existingMilestones.recent.find(
        m => m.type === 'adherence' && m.threshold === 90
      );

      if (!existing) {
        await this.awardMilestone({
          id: `milestone_${Date.now()}`,
          patientId,
          type: 'adherence',
          threshold: 90,
          culturalTheme: 'hari_raya',
          achievedDate: new Date(),
          celebrationShown: false,
          title: 'Excellence Achieved',
          description: '90% adherence for 30 days!',
          familyNotified: false
        });
      }
    }
  }

  /**
   * Award a milestone
   */
  private async awardMilestone(milestone: Milestone): Promise<void> {
    // Store milestone
    await this.storeMilestone(milestone);

    // Track event
    await this.trackEvent({
      eventType: 'milestone_reached',
      patientId: milestone.patientId,
      timestamp: new Date(),
      metadata: {
        milestoneType: milestone.type,
        threshold: milestone.threshold,
        title: milestone.title
      }
    });

    // Send notification if enabled
    if (this.config.milestoneNotifications) {
      // This would trigger a notification through the notification service
      console.log(`Milestone achieved: ${milestone.title}`);
    }
  }

  /**
   * Generate improvement suggestions
   */
  private async generateImprovementSuggestions(patientId: string): Promise<void> {
    const records = await this.getRecords(patientId);
    const culturalPattern = await this.culturalAnalyzer.analyzeCulturalPatterns(
      records,
      patientId
    );

    const currentMetrics = await this.calculationEngine.calculateAdherenceRate(
      records,
      'monthly',
      this.getStartDate(new Date(), 'monthly'),
      new Date()
    );

    const improvements = await this.culturalAnalyzer.generateImprovements(
      culturalPattern,
      currentMetrics.adherenceRate
    );

    // Store improvements
    for (const improvement of improvements) {
      await this.storeImprovement(improvement);
    }
  }

  /**
   * Calculate trends
   */
  private async calculateTrends(records: AdherenceRecord[]): Promise<AnalyticsDashboard['trends']> {
    const daily: { date: Date; adherence: number }[] = [];
    const weekly: { week: string; adherence: number }[] = [];
    const monthly: { month: string; adherence: number }[] = [];

    // Daily trends (last 30 days)
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);

      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const dayRecords = records.filter(
        r => r.scheduledTime >= date && r.scheduledTime < nextDate
      );

      if (dayRecords.length > 0) {
        const taken = dayRecords.filter(
          r => r.status === 'taken' || r.status === 'late'
        ).length;

        daily.push({
          date,
          adherence: Math.round((taken / dayRecords.length) * 100)
        });
      }
    }

    // Weekly trends (last 12 weeks)
    for (let i = 11; i >= 0; i--) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - (i * 7 + weekStart.getDay()));
      weekStart.setHours(0, 0, 0, 0);

      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const weekRecords = records.filter(
        r => r.scheduledTime >= weekStart && r.scheduledTime < weekEnd
      );

      if (weekRecords.length > 0) {
        const taken = weekRecords.filter(
          r => r.status === 'taken' || r.status === 'late'
        ).length;

        weekly.push({
          week: `Week ${12 - i}`,
          adherence: Math.round((taken / weekRecords.length) * 100)
        });
      }
    }

    // Monthly trends (last 6 months)
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date();
      monthStart.setMonth(monthStart.getMonth() - i);
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1);

      const monthRecords = records.filter(
        r => r.scheduledTime >= monthStart && r.scheduledTime < monthEnd
      );

      if (monthRecords.length > 0) {
        const taken = monthRecords.filter(
          r => r.status === 'taken' || r.status === 'late'
        ).length;

        const monthName = monthStart.toLocaleDateString('en-US', { month: 'short' });
        monthly.push({
          month: monthName,
          adherence: Math.round((taken / monthRecords.length) * 100)
        });
      }
    }

    return { daily, weekly, monthly };
  }

  /**
   * Calculate medication-specific metrics
   */
  private async calculateMedicationMetrics(
    records: AdherenceRecord[],
    medications: Map<string, Medication>
  ): Promise<AdherenceReport['medications']> {
    const metrics: AdherenceReport['medications'] = [];

    for (const [medicationId, medication] of medications) {
      const medRecords = records.filter(r => r.medicationId === medicationId);

      if (medRecords.length > 0) {
        const taken = medRecords.filter(
          r => r.status === 'taken' || r.status === 'late'
        ).length;
        const missed = medRecords.filter(r => r.status === 'missed').length;
        const late = medRecords.filter(r => r.status === 'late').length;

        // Identify patterns
        const patterns: string[] = [];
        const morningRecords = medRecords.filter(r => r.scheduledTime.getHours() < 12);
        const eveningRecords = medRecords.filter(r => r.scheduledTime.getHours() >= 17);

        if (morningRecords.length > 0 && eveningRecords.length > 0) {
          const morningAdherence = morningRecords.filter(
            r => r.status === 'taken' || r.status === 'late'
          ).length / morningRecords.length;

          const eveningAdherence = eveningRecords.filter(
            r => r.status === 'taken' || r.status === 'late'
          ).length / eveningRecords.length;

          if (Math.abs(morningAdherence - eveningAdherence) > 0.2) {
            patterns.push(
              morningAdherence > eveningAdherence
                ? 'Better morning adherence'
                : 'Better evening adherence'
            );
          }
        }

        // Identify concerns
        const concerns: string[] = [];
        const adherenceRate = (taken / medRecords.length) * 100;

        if (adherenceRate < 80) {
          concerns.push('Below target adherence');
        }
        if (late > taken * 0.3) {
          concerns.push('Frequent late doses');
        }
        if (missed > 2) {
          concerns.push(`${missed} missed doses`);
        }

        metrics.push({
          medication,
          adherence: Math.round(adherenceRate),
          doses: {
            total: medRecords.length,
            taken,
            missed,
            late
          },
          patterns,
          concerns
        });
      }
    }

    return metrics;
  }

  /**
   * Calculate report trends
   */
  private calculateReportTrends(
    records: AdherenceRecord[],
    startDate: Date,
    endDate: Date
  ): AdherenceReport['trends'] {
    // Current period
    const currentRecords = records.filter(
      r => r.scheduledTime >= startDate && r.scheduledTime <= endDate
    );
    const currentAdherence = currentRecords.length > 0
      ? currentRecords.filter(r => r.status === 'taken' || r.status === 'late').length / currentRecords.length
      : 0;

    // Previous period
    const periodLength = endDate.getTime() - startDate.getTime();
    const previousStart = new Date(startDate.getTime() - periodLength);
    const previousEnd = startDate;

    const previousRecords = records.filter(
      r => r.scheduledTime >= previousStart && r.scheduledTime < previousEnd
    );
    const previousAdherence = previousRecords.length > 0
      ? previousRecords.filter(r => r.status === 'taken' || r.status === 'late').length / previousRecords.length
      : 0;

    // Week over week (last 4 weeks)
    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const firstTwoWeeks = records.filter(
      r => r.scheduledTime >= fourWeeksAgo && r.scheduledTime < twoWeeksAgo
    );
    const lastTwoWeeks = records.filter(
      r => r.scheduledTime >= twoWeeksAgo
    );

    const firstAdherence = firstTwoWeeks.length > 0
      ? firstTwoWeeks.filter(r => r.status === 'taken' || r.status === 'late').length / firstTwoWeeks.length
      : 0;
    const lastAdherence = lastTwoWeeks.length > 0
      ? lastTwoWeeks.filter(r => r.status === 'taken' || r.status === 'late').length / lastTwoWeeks.length
      : 0;

    const weekOverWeek = firstAdherence > 0
      ? ((lastAdherence - firstAdherence) / firstAdherence) * 100
      : 0;

    // Month over month
    const monthOverMonth = previousAdherence > 0
      ? ((currentAdherence - previousAdherence) / previousAdherence) * 100
      : 0;

    return {
      improving: currentAdherence > previousAdherence,
      weekOverWeek: Math.round(weekOverWeek),
      monthOverMonth: Math.round(monthOverMonth)
    };
  }

  /**
   * Generate report recommendations
   */
  private async generateReportRecommendations(
    metrics: ProgressMetrics,
    culturalPattern: CulturalPattern,
    medicationMetrics: AdherenceReport['medications']
  ): Promise<string[]> {
    const recommendations: string[] = [];

    // Adherence-based recommendations
    if (metrics.adherenceRate < 80) {
      recommendations.push('Consider medication therapy management consultation');
      recommendations.push('Review and simplify medication schedule if possible');
    }

    // Timing-based recommendations
    if (metrics.averageTimingAccuracy > 60) {
      recommendations.push('Patient frequently takes medications late - consider reminder optimization');
    }

    // Cultural recommendations
    if (culturalPattern.recommendations.length > 0) {
      recommendations.push(...culturalPattern.recommendations.slice(0, 2));
    }

    // Medication-specific recommendations
    for (const med of medicationMetrics) {
      if (med.adherence < 70) {
        recommendations.push(`Review ${med.medication.name} - adherence below 70%`);
      }
    }

    // Streak recommendations
    if (metrics.longestStreak < 7) {
      recommendations.push('Focus on building consistent medication habits');
    }

    return recommendations;
  }

  /**
   * Helper methods
   */

  private determineStatus(scheduledTime: Date, takenTime: Date): AdherenceRecord['status'] {
    const diffMinutes = Math.abs((takenTime.getTime() - scheduledTime.getTime()) / 60000);
    const config = this.calculationEngine.getConfig();

    if (diffMinutes <= config.lateThresholdMinutes) {
      return diffMinutes <= 30 ? 'taken' : 'late';
    }
    return 'missed';
  }

  private getStartDate(endDate: Date, period: AdherencePeriod): Date {
    const startDate = new Date(endDate);

    switch (period) {
      case 'daily':
        startDate.setDate(startDate.getDate() - 1);
        break;
      case 'weekly':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case 'monthly':
        startDate.setMonth(startDate.getMonth() - 1);
        break;
      case 'quarterly':
        startDate.setMonth(startDate.getMonth() - 3);
        break;
      case 'yearly':
        startDate.setFullYear(startDate.getFullYear() - 1);
        break;
    }

    return startDate;
  }

  private async getMedicationDetails(
    records: AdherenceRecord[]
  ): Promise<Map<string, Medication>> {
    const medications = new Map<string, Medication>();
    const medicationIds = [...new Set(records.map(r => r.medicationId))];

    for (const id of medicationIds) {
      // This would fetch from medication service
      // For now, creating placeholder
      medications.set(id, {
        id,
        name: `Medication ${id}`,
        dosage: '10mg',
        frequency: 'twice daily',
        instructions: '',
        sideEffects: [],
        interactions: [],
        imageUrl: ''
      } as Medication);
    }

    return medications;
  }

  /**
   * Storage methods
   */

  private async storeRecord(record: AdherenceRecord): Promise<void> {
    try {
      const key = `${this.cacheKey}:records:${record.patientId}`;
      const existing = await AsyncStorage.getItem(key);
      const records = existing ? JSON.parse(existing) : [];
      records.push(record);

      // Keep only last N days of records for offline capacity
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - this.config.offlineCapacityDays);
      const filteredRecords = records.filter(
        (r: AdherenceRecord) => new Date(r.scheduledTime) >= cutoffDate
      );

      await AsyncStorage.setItem(key, JSON.stringify(filteredRecords));
    } catch (error) {
      console.error('Error storing adherence record:', error);
    }
  }

  private async getRecords(patientId: string): Promise<AdherenceRecord[]> {
    try {
      const key = `${this.cacheKey}:records:${patientId}`;
      const data = await AsyncStorage.getItem(key);
      if (data) {
        return JSON.parse(data).map((r: any) => ({
          ...r,
          scheduledTime: new Date(r.scheduledTime),
          takenTime: r.takenTime ? new Date(r.takenTime) : undefined,
          createdAt: new Date(r.createdAt),
          updatedAt: new Date(r.updatedAt)
        }));
      }
    } catch (error) {
      console.error('Error getting records:', error);
    }
    return [];
  }

  private async storeMilestone(milestone: Milestone): Promise<void> {
    try {
      const key = `${this.cacheKey}:milestones:${milestone.patientId}`;
      const existing = await AsyncStorage.getItem(key);
      const milestones = existing ? JSON.parse(existing) : [];
      milestones.push(milestone);
      await AsyncStorage.setItem(key, JSON.stringify(milestones));
    } catch (error) {
      console.error('Error storing milestone:', error);
    }
  }

  private async getMilestones(patientId: string): Promise<{
    recent: Milestone[];
    upcoming: Milestone[];
  }> {
    try {
      const key = `${this.cacheKey}:milestones:${patientId}`;
      const data = await AsyncStorage.getItem(key);
      if (data) {
        const milestones = JSON.parse(data);
        const achieved = milestones.filter((m: Milestone) => m.achievedDate);
        const upcoming = milestones.filter((m: Milestone) => !m.achievedDate);

        return {
          recent: achieved.slice(-5), // Last 5 achieved
          upcoming: upcoming.slice(0, 3) // Next 3 upcoming
        };
      }
    } catch (error) {
      console.error('Error getting milestones:', error);
    }

    return { recent: [], upcoming: [] };
  }

  private async storeImprovement(improvement: AdherenceImprovement): Promise<void> {
    try {
      const key = `${this.cacheKey}:improvements:${improvement.patientId}`;
      const existing = await AsyncStorage.getItem(key);
      const improvements = existing ? JSON.parse(existing) : [];

      // Check if similar improvement already exists
      const existingIndex = improvements.findIndex(
        (i: AdherenceImprovement) => i.suggestion === improvement.suggestion
      );

      if (existingIndex === -1) {
        improvements.push(improvement);
      } else {
        improvements[existingIndex] = improvement;
      }

      await AsyncStorage.setItem(key, JSON.stringify(improvements));
    } catch (error) {
      console.error('Error storing improvement:', error);
    }
  }

  private async getImprovementSuggestions(patientId: string): Promise<AdherenceImprovement[]> {
    try {
      const key = `${this.cacheKey}:improvements:${patientId}`;
      const data = await AsyncStorage.getItem(key);
      if (data) {
        const improvements = JSON.parse(data);
        // Return only unapplied improvements
        return improvements
          .filter((i: AdherenceImprovement) => !i.appliedAt)
          .sort((a: AdherenceImprovement, b: AdherenceImprovement) => {
            const priorityOrder = { high: 0, medium: 1, low: 2 };
            return priorityOrder[a.priority] - priorityOrder[b.priority];
          })
          .slice(0, 5); // Top 5 suggestions
      }
    } catch (error) {
      console.error('Error getting improvements:', error);
    }
    return [];
  }

  private async storeReport(report: AdherenceReport): Promise<void> {
    try {
      const key = `${this.cacheKey}:reports:${report.patientId}`;
      const existing = await AsyncStorage.getItem(key);
      const reports = existing ? JSON.parse(existing) : [];
      reports.push(report);

      // Keep only last 10 reports
      const sortedReports = reports.sort(
        (a: AdherenceReport, b: AdherenceReport) =>
          new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()
      );

      await AsyncStorage.setItem(key, JSON.stringify(sortedReports.slice(0, 10)));
    } catch (error) {
      console.error('Error storing report:', error);
    }
  }

  /**
   * Analytics event tracking
   */

  private async trackEvent(event: AdherenceAnalyticsEvent): Promise<void> {
    this.analyticsQueue.push(event);

    // Check if we should flush the queue
    if (this.analyticsQueue.length >= 10) {
      await this.flushAnalyticsQueue();
    }
  }

  private async flushAnalyticsQueue(): Promise<void> {
    if (this.analyticsQueue.length === 0) return;

    const events = [...this.analyticsQueue];
    this.analyticsQueue = [];

    try {
      // Check network connectivity
      const netInfo = await NetInfo.fetch();

      if (netInfo.isConnected) {
        // Send to analytics backend
        // For now, just store locally
        const key = `${this.cacheKey}:analytics`;
        const existing = await AsyncStorage.getItem(key);
        const allEvents = existing ? JSON.parse(existing) : [];
        allEvents.push(...events);

        // Keep only last 1000 events
        const trimmedEvents = allEvents.slice(-1000);
        await AsyncStorage.setItem(key, JSON.stringify(trimmedEvents));
      } else {
        // Re-queue events for later
        this.analyticsQueue.push(...events);
      }
    } catch (error) {
      console.error('Error flushing analytics queue:', error);
      // Re-queue events
      this.analyticsQueue.push(...events);
    }
  }

  /**
   * Auto-sync functionality
   */

  private startAutoSync(): void {
    this.syncTimer = setInterval(
      () => this.syncData(),
      this.config.syncInterval * 60 * 1000
    );
  }

  private stopAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = undefined;
    }
  }

  private async syncData(): Promise<void> {
    try {
      const netInfo = await NetInfo.fetch();

      if (netInfo.isConnected) {
        // Flush analytics queue
        await this.flushAnalyticsQueue();

        // Sync other data as needed
        // This would sync with backend API
        console.log('Progress data synced successfully');
      }
    } catch (error) {
      console.error('Error syncing progress data:', error);
    }
  }

  private async loadCachedData(): Promise<void> {
    try {
      // Load configuration
      const configKey = `${this.cacheKey}:config`;
      const configData = await AsyncStorage.getItem(configKey);
      if (configData) {
        this.config = JSON.parse(configData);
      }
    } catch (error) {
      console.error('Error loading cached data:', error);
    }
  }

  /**
   * Public configuration methods
   */

  public updateConfig(config: Partial<AnalyticsConfig>): void {
    this.config = { ...this.config, ...config };

    // Update auto-sync if changed
    if (config.autoSync !== undefined || config.syncInterval !== undefined) {
      this.stopAutoSync();
      if (this.config.autoSync) {
        this.startAutoSync();
      }
    }

    // Save configuration
    AsyncStorage.setItem(
      `${this.cacheKey}:config`,
      JSON.stringify(this.config)
    );
  }

  public async clearAllData(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const progressKeys = keys.filter(key => key.startsWith(this.cacheKey));
      await AsyncStorage.multiRemove(progressKeys);

      // Clear engine caches
      await this.calculationEngine.clearCache();
      await this.culturalAnalyzer.clearCache();
      await this.predictiveEngine.clearCache();

      // Clear analytics queue
      this.analyticsQueue = [];
    } catch (error) {
      console.error('Error clearing progress data:', error);
    }
  }
}