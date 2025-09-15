/**
 * Progress Tracking Service
 *
 * Central service that orchestrates all adherence tracking components,
 * integrating calculation engine, cultural analysis, and predictive analytics
 * to provide comprehensive medication progress insights.
 */

import {
  AdherenceRecord,
  ProgressMetrics,
  AdherencePattern,
  CulturalInsight,
  AdherencePrediction,
  AdherenceReport,
  MedicationAdherenceReport,
  MetricPeriod,
  AdherenceStatus,
  AdherenceMethod,
  CulturalAdherenceContext,
  AdherenceMilestone,
  MilestoneType,
  CulturalTheme,
  AdherenceCalculationConfig,
  AdherenceCache,
  AdherenceApiResponse,
  AdherenceBatchUpdate
} from '../../types/adherence';
import { Medication } from '../../types/medication';
import { AdherenceCalculationEngine } from '../adherence/AdherenceCalculationEngine';
import { CulturalPatternAnalyzer } from '../adherence/CulturalPatternAnalyzer';
import { PredictiveAdherenceEngine } from '../adherence/PredictiveAdherenceEngine';

interface TrackingServiceConfig {
  cacheEnabled: boolean;
  cacheTTL: number; // seconds
  autoSync: boolean;
  syncInterval: number; // minutes
  predictiveEnabled: boolean;
  culturalAnalysisEnabled: boolean;
  milestoneNotifications: boolean;
}

export class ProgressTrackingService {
  private calculationEngine: AdherenceCalculationEngine;
  private culturalAnalyzer: CulturalPatternAnalyzer;
  private predictiveEngine: PredictiveAdherenceEngine;
  private config: TrackingServiceConfig;
  private cache: Map<string, AdherenceCache> = new Map();
  private syncTimer: NodeJS.Timeout | null = null;
  private milestones: Map<string, AdherenceMilestone[]> = new Map();

  constructor(config?: Partial<TrackingServiceConfig>) {
    this.config = {
      cacheEnabled: true,
      cacheTTL: 300, // 5 minutes
      autoSync: true,
      syncInterval: 15, // 15 minutes
      predictiveEnabled: true,
      culturalAnalysisEnabled: true,
      milestoneNotifications: true,
      ...config
    };

    // Initialize engines
    this.calculationEngine = new AdherenceCalculationEngine();
    this.culturalAnalyzer = new CulturalPatternAnalyzer();
    this.predictiveEngine = new PredictiveAdherenceEngine();

    // Initialize milestones
    this.initializeMilestones();

    // Start auto-sync if enabled
    if (this.config.autoSync) {
      this.startAutoSync();
    }
  }

  /**
   * Track medication intake
   */
  async trackMedicationIntake(
    medicationId: string,
    patientId: string,
    takenTime: Date,
    scheduledTime: Date,
    method: AdherenceMethod = 'manual',
    culturalContext?: CulturalAdherenceContext,
    notes?: string
  ): Promise<AdherenceApiResponse<AdherenceRecord>> {
    try {
      // Determine adherence status
      const { status, delayMinutes } = this.calculationEngine.determineAdherenceStatus(
        scheduledTime,
        takenTime,
        culturalContext
      );

      // Calculate adherence score for this dose
      const adherenceScore = this.calculateDoseAdherenceScore(status, delayMinutes);

      // Create adherence record
      const record: AdherenceRecord = {
        id: this.generateRecordId(),
        medicationId,
        patientId,
        scheduledTime,
        takenTime,
        status,
        adherenceScore,
        method,
        delayMinutes: delayMinutes > 0 ? delayMinutes : undefined,
        culturalContext,
        notes,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Invalidate cache for this patient
      this.invalidateCache(patientId);

      // Check for milestone achievements
      await this.checkMilestones(patientId, [record]);

      return {
        success: true,
        data: record,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
        timestamp: new Date()
      };
    }
  }

  /**
   * Get comprehensive progress metrics
   */
  async getProgressMetrics(
    patientId: string,
    medications: Medication[],
    records: AdherenceRecord[],
    period: MetricPeriod = 'monthly',
    startDate?: Date,
    endDate?: Date
  ): Promise<AdherenceApiResponse<ProgressMetrics>> {
    try {
      // Check cache first
      const cacheKey = this.getCacheKey(patientId, period);
      if (this.config.cacheEnabled && this.cache.has(cacheKey)) {
        const cached = this.cache.get(cacheKey)!;
        if (this.isCacheValid(cached)) {
          return {
            success: true,
            data: cached.metrics,
            timestamp: new Date()
          };
        }
      }

      // Calculate date range
      const { start, end } = this.calculateDateRange(period, startDate, endDate);

      // Analyze patterns
      const patterns = this.calculationEngine.analyzePatterns(records);

      // Analyze cultural factors if enabled
      let culturalInsights: CulturalInsight[] = [];
      if (this.config.culturalAnalysisEnabled) {
        culturalInsights = this.culturalAnalyzer.analyzeCulturalPatterns(records, medications);
      }

      // Generate predictions if enabled
      let predictions: AdherencePrediction[] = [];
      if (this.config.predictiveEnabled && medications.length > 0) {
        // Generate predictions for each medication
        medications.forEach(medication => {
          const medPredictions = this.predictiveEngine.generatePredictions(
            medication,
            records,
            patterns,
            culturalInsights
          );
          predictions.push(...medPredictions);
        });
      }

      // Generate comprehensive metrics
      const metrics = this.calculationEngine.generateProgressMetrics(
        patientId,
        medications,
        records,
        period,
        start,
        end,
        patterns,
        predictions,
        culturalInsights
      );

      // Cache the results
      if (this.config.cacheEnabled) {
        this.cacheMetrics(patientId, period, metrics);
      }

      return {
        success: true,
        data: metrics,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
        timestamp: new Date()
      };
    }
  }

  /**
   * Generate adherence report for healthcare provider
   */
  async generateProviderReport(
    patientId: string,
    medications: Medication[],
    records: AdherenceRecord[],
    periodStart: Date,
    periodEnd: Date,
    providerNotes?: string
  ): Promise<AdherenceApiResponse<AdherenceReport>> {
    try {
      // Get comprehensive metrics
      const metricsResponse = await this.getProgressMetrics(
        patientId,
        medications,
        records,
        'custom',
        periodStart,
        periodEnd
      );

      if (!metricsResponse.success || !metricsResponse.data) {
        throw new Error('Failed to generate metrics');
      }

      const metrics = metricsResponse.data;

      // Generate medication-specific reports
      const medicationReports: MedicationAdherenceReport[] = medications.map(medication => {
        const medMetric = metrics.medications.find(m => m.medicationId === medication.id);
        const medRecords = records.filter(r => r.medicationId === medication.id);

        // Analyze trends
        const trends = this.analyzeTrends(medMetric?.trends || []);

        // Identify patterns
        const missedPatterns = this.identifyMissedDosePatterns(medRecords);

        // Get cultural factors
        const culturalFactors = this.culturalAnalyzer.analyzeMedicationCulturalFactors(
          medication,
          medRecords
        );

        return {
          medication,
          adherenceRate: medMetric?.adherenceRate || 0,
          trends,
          missedDosePatterns: missedPatterns,
          culturalFactors: culturalFactors.culturalChallenges,
          recommendations: culturalFactors.adaptations
        };
      });

      // Generate insights
      const insights = this.generateReportInsights(metrics, medicationReports);

      // Generate recommendations
      const recommendations = this.generateReportRecommendations(
        metrics,
        medicationReports
      );

      // Extract cultural considerations
      const culturalConsiderations = metrics.culturalInsights.map(i => i.description);

      // Create report
      const report: AdherenceReport = {
        id: this.generateReportId(),
        patientId,
        generatedAt: new Date(),
        periodStart,
        periodEnd,
        overallAdherence: metrics.overallAdherence,
        medications: medicationReports,
        insights,
        recommendations,
        culturalConsiderations,
        providerNotes,
        fhirResource: this.generateFHIRResource(patientId, medicationReports)
      };

      return {
        success: true,
        data: report,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
        timestamp: new Date()
      };
    }
  }

  /**
   * Get adherence predictions
   */
  async getAdherencePredictions(
    medication: Medication,
    records: AdherenceRecord[]
  ): Promise<AdherenceApiResponse<AdherencePrediction[]>> {
    try {
      if (!this.config.predictiveEnabled) {
        return {
          success: false,
          error: 'Predictive analytics is disabled',
          timestamp: new Date()
        };
      }

      // Analyze patterns
      const patterns = this.calculationEngine.analyzePatterns(records);

      // Get cultural insights
      const culturalInsights = this.config.culturalAnalysisEnabled
        ? this.culturalAnalyzer.analyzeCulturalPatterns(records, [medication])
        : [];

      // Generate predictions
      const predictions = this.predictiveEngine.generatePredictions(
        medication,
        records,
        patterns,
        culturalInsights
      );

      return {
        success: true,
        data: predictions,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
        timestamp: new Date()
      };
    }
  }

  /**
   * Get cultural optimization opportunities
   */
  async getCulturalOptimizations(
    records: AdherenceRecord[],
    currentAdherence: number
  ): Promise<AdherenceApiResponse<any>> {
    try {
      if (!this.config.culturalAnalysisEnabled) {
        return {
          success: false,
          error: 'Cultural analysis is disabled',
          timestamp: new Date()
        };
      }

      const opportunities = this.culturalAnalyzer.identifyOptimizationOpportunities(
        records,
        currentAdherence
      );

      return {
        success: true,
        data: opportunities,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
        timestamp: new Date()
      };
    }
  }

  /**
   * Batch update adherence records
   */
  async batchUpdateRecords(
    update: AdherenceBatchUpdate
  ): Promise<AdherenceApiResponse<number>> {
    try {
      let updatedCount = 0;

      for (const record of update.records) {
        // Validate and process each record
        if (record.medicationId && record.patientId && record.scheduledTime) {
          // Update record processing logic here
          updatedCount++;

          // Invalidate cache for affected patient
          if (record.patientId) {
            this.invalidateCache(record.patientId);
          }
        }
      }

      return {
        success: true,
        data: updatedCount,
        timestamp: new Date()
      };
    } catch (error) {
      return {
        success: false,
        error: (error as Error).message,
        timestamp: new Date()
      };
    }
  }

  /**
   * Update calculation configuration
   */
  updateCalculationConfig(config: Partial<AdherenceCalculationConfig>): void {
    this.calculationEngine.updateConfig(config);
    this.clearAllCache();
  }

  /**
   * Get service configuration
   */
  getServiceConfig(): TrackingServiceConfig {
    return { ...this.config };
  }

  /**
   * Update service configuration
   */
  updateServiceConfig(config: Partial<TrackingServiceConfig>): void {
    const oldAutoSync = this.config.autoSync;
    this.config = { ...this.config, ...config };

    // Handle auto-sync changes
    if (oldAutoSync && !this.config.autoSync) {
      this.stopAutoSync();
    } else if (!oldAutoSync && this.config.autoSync) {
      this.startAutoSync();
    }

    // Clear cache if caching is disabled
    if (!this.config.cacheEnabled) {
      this.clearAllCache();
    }
  }

  // Private helper methods

  private initializeMilestones(): void {
    // Define standard milestones with Malaysian cultural themes
    const standardMilestones: AdherenceMilestone[] = [
      {
        id: 'streak_7',
        type: 'streak_days',
        threshold: 7,
        name: 'Week Warrior',
        description: 'Maintained medication streak for 7 days',
        culturalTheme: this.createCulturalTheme('batik', '#4A90E2', '#FFD700'),
        celebrationShown: false,
        shareable: true,
        rewardPoints: 50
      },
      {
        id: 'streak_30',
        type: 'streak_days',
        threshold: 30,
        name: 'Monthly Master',
        description: 'Maintained medication streak for 30 days',
        culturalTheme: this.createCulturalTheme('wau', '#28A745', '#FFA500'),
        celebrationShown: false,
        shareable: true,
        rewardPoints: 200
      },
      {
        id: 'adherence_80',
        type: 'adherence_rate',
        threshold: 80,
        name: 'Adherence Champion',
        description: 'Achieved 80% medication adherence',
        culturalTheme: this.createCulturalTheme('hibiscus', '#DC3545', '#FFB6C1'),
        celebrationShown: false,
        shareable: true,
        rewardPoints: 100
      },
      {
        id: 'perfect_week',
        type: 'perfect_week',
        threshold: 1,
        name: 'Perfect Week',
        description: 'Took all medications on time for a week',
        culturalTheme: this.createCulturalTheme('songket', '#6C757D', '#C0C0C0'),
        celebrationShown: false,
        shareable: true,
        rewardPoints: 75
      }
    ];

    this.milestones.set('standard', standardMilestones);
  }

  private createCulturalTheme(
    name: string,
    primaryColor: string,
    secondaryColor: string
  ): CulturalTheme {
    return {
      name,
      primaryColor,
      secondaryColor,
      icon: `icon_${name}`,
      animation: `celebrate_${name}`,
      soundEffect: `sound_${name}`,
      message: {
        en: 'Congratulations on your achievement!',
        ms: 'Tahniah atas pencapaian anda!',
        zh: '恭喜您的成就！',
        ta: 'உங்கள் சாதனைக்கு வாழ்த்துக்கள்!'
      }
    };
  }

  private async checkMilestones(
    patientId: string,
    newRecords: AdherenceRecord[]
  ): Promise<void> {
    if (!this.config.milestoneNotifications) return;

    // Get patient milestones
    const patientMilestones = this.milestones.get(patientId) || this.milestones.get('standard')!;

    // Check each milestone
    for (const milestone of patientMilestones) {
      if (!milestone.achievedDate) {
        // Check if milestone is now achieved
        const achieved = await this.isMilestoneAchieved(
          milestone,
          patientId,
          newRecords
        );

        if (achieved) {
          milestone.achievedDate = new Date();
          // Trigger milestone celebration (would emit event in real implementation)
          console.log(`Milestone achieved: ${milestone.name} for patient ${patientId}`);
        }
      }
    }
  }

  private async isMilestoneAchieved(
    milestone: AdherenceMilestone,
    patientId: string,
    records: AdherenceRecord[]
  ): Promise<boolean> {
    switch (milestone.type) {
      case 'streak_days':
        const streakData = this.calculationEngine.calculateStreaks(records);
        return streakData.currentStreak >= milestone.threshold;

      case 'adherence_rate':
        const adherenceRate = this.calculationEngine.calculateAdherenceRate(records);
        return adherenceRate >= milestone.threshold;

      case 'perfect_week':
        // Check for perfect week (all doses taken on time)
        const weekRecords = records.filter(r => {
          const daysAgo = (Date.now() - new Date(r.scheduledTime).getTime()) / (1000 * 60 * 60 * 24);
          return daysAgo <= 7;
        });
        return weekRecords.length > 0 && weekRecords.every(r => r.status === 'taken_on_time');

      default:
        return false;
    }
  }

  private calculateDoseAdherenceScore(status: AdherenceStatus, delayMinutes: number): number {
    switch (status) {
      case 'taken_on_time':
        return 100;
      case 'taken_early':
        return 95;
      case 'taken_late':
        // Progressive penalty based on delay
        const delayHours = delayMinutes / 60;
        if (delayHours <= 1) return 85;
        if (delayHours <= 2) return 70;
        return 50;
      case 'adjusted':
        return 90;
      case 'missed':
        return 0;
      default:
        return 0;
    }
  }

  private calculateDateRange(
    period: MetricPeriod,
    startDate?: Date,
    endDate?: Date
  ): { start: Date; end: Date } {
    const now = new Date();

    if (period === 'custom' && startDate && endDate) {
      return { start: startDate, end: endDate };
    }

    let start: Date;
    const end = endDate || now;

    switch (period) {
      case 'daily':
        start = new Date(end);
        start.setDate(start.getDate() - 1);
        break;
      case 'weekly':
        start = new Date(end);
        start.setDate(start.getDate() - 7);
        break;
      case 'monthly':
        start = new Date(end);
        start.setMonth(start.getMonth() - 1);
        break;
      case 'quarterly':
        start = new Date(end);
        start.setMonth(start.getMonth() - 3);
        break;
      case 'yearly':
        start = new Date(end);
        start.setFullYear(start.getFullYear() - 1);
        break;
      default:
        start = startDate || new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    return { start, end };
  }

  private analyzeTrends(trends: any[]): 'improving' | 'stable' | 'declining' {
    if (trends.length < 7) return 'stable';

    const recentTrends = trends.slice(-7);
    const olderTrends = trends.slice(-14, -7);

    if (olderTrends.length === 0) return 'stable';

    const recentAvg = recentTrends.reduce((sum, t) => sum + t.adherenceRate, 0) / recentTrends.length;
    const olderAvg = olderTrends.reduce((sum, t) => sum + t.adherenceRate, 0) / olderTrends.length;

    const difference = recentAvg - olderAvg;

    if (difference > 5) return 'improving';
    if (difference < -5) return 'declining';
    return 'stable';
  }

  private identifyMissedDosePatterns(records: AdherenceRecord[]): string[] {
    const patterns: string[] = [];
    const missedRecords = records.filter(r => r.status === 'missed');

    if (missedRecords.length === 0) return patterns;

    // Time-based patterns
    const hourCounts = new Map<number, number>();
    missedRecords.forEach(r => {
      const hour = new Date(r.scheduledTime).getHours();
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    });

    // Find most common missed times
    const sortedHours = Array.from(hourCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    sortedHours.forEach(([hour, count]) => {
      if (count >= 3) {
        patterns.push(`Frequently missed at ${hour}:00`);
      }
    });

    // Day-based patterns
    const dayCounts = new Map<number, number>();
    missedRecords.forEach(r => {
      const day = new Date(r.scheduledTime).getDay();
      dayCounts.set(day, (dayCounts.get(day) || 0) + 1);
    });

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    dayCounts.forEach((count, day) => {
      if (count >= missedRecords.length * 0.3) {
        patterns.push(`Higher miss rate on ${dayNames[day]}s`);
      }
    });

    return patterns;
  }

  private generateReportInsights(
    metrics: ProgressMetrics,
    medicationReports: MedicationAdherenceReport[]
  ): string[] {
    const insights: string[] = [];

    // Overall adherence insight
    if (metrics.overallAdherence >= 80) {
      insights.push('Excellent overall medication adherence above target threshold');
    } else if (metrics.overallAdherence >= 60) {
      insights.push('Moderate adherence with room for improvement');
    } else {
      insights.push('Low adherence requiring immediate intervention');
    }

    // Streak insights
    if (metrics.streaks.currentStreak > 7) {
      insights.push(`Currently on ${metrics.streaks.currentStreak}-day adherence streak`);
    }

    // Pattern insights
    metrics.patterns.forEach(pattern => {
      if (pattern.confidence > 0.7) {
        insights.push(pattern.description);
      }
    });

    // Medication-specific insights
    medicationReports.forEach(report => {
      if (report.adherenceRate < 50) {
        insights.push(`Critical adherence issues with ${report.medication.name}`);
      }
    });

    return insights;
  }

  private generateReportRecommendations(
    metrics: ProgressMetrics,
    medicationReports: MedicationAdherenceReport[]
  ): string[] {
    const recommendations: string[] = [];

    // Add pattern-based recommendations
    metrics.patterns.forEach(pattern => {
      recommendations.push(...pattern.recommendations.slice(0, 2));
    });

    // Add prediction-based recommendations
    const highRiskPredictions = metrics.predictions.filter(p =>
      p.riskLevel === 'high' || p.riskLevel === 'critical'
    );

    highRiskPredictions.forEach(prediction => {
      prediction.recommendations.slice(0, 2).forEach(rec => {
        if (!recommendations.includes(rec.action)) {
          recommendations.push(rec.action);
        }
      });
    });

    // Add cultural insights recommendations
    metrics.culturalInsights.forEach(insight => {
      if (insight.culturalSensitivity === 'high') {
        recommendations.push(...insight.recommendations.slice(0, 1));
      }
    });

    // Limit to top 10 recommendations
    return recommendations.slice(0, 10);
  }

  private generateFHIRResource(
    patientId: string,
    medicationReports: MedicationAdherenceReport[]
  ): any {
    // Generate FHIR MedicationStatement resource
    // This is a simplified version - real implementation would be more comprehensive
    return {
      resourceType: 'MedicationStatement',
      status: 'active',
      subject: {
        reference: `Patient/${patientId}`
      },
      effectivePeriod: {
        start: new Date().toISOString()
      },
      medicationCodeableConcept: {
        text: medicationReports.map(r => r.medication.name).join(', ')
      },
      adherence: {
        code: {
          text: `Overall adherence: ${medicationReports.reduce((sum, r) => sum + r.adherenceRate, 0) / medicationReports.length}%`
        }
      }
    };
  }

  private getCacheKey(patientId: string, period: MetricPeriod): string {
    return `${patientId}_${period}`;
  }

  private cacheMetrics(patientId: string, period: MetricPeriod, metrics: ProgressMetrics): void {
    const cacheKey = this.getCacheKey(patientId, period);
    const cache: AdherenceCache = {
      patientId,
      lastCalculated: new Date(),
      metrics,
      ttl: this.config.cacheTTL,
      invalidateOn: ['medication_taken', 'record_updated', 'config_changed']
    };
    this.cache.set(cacheKey, cache);
  }

  private isCacheValid(cache: AdherenceCache): boolean {
    const age = (Date.now() - cache.lastCalculated.getTime()) / 1000;
    return age < cache.ttl;
  }

  private invalidateCache(patientId: string): void {
    // Remove all cache entries for this patient
    const keysToDelete: string[] = [];
    this.cache.forEach((_, key) => {
      if (key.startsWith(patientId)) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => this.cache.delete(key));
  }

  private clearAllCache(): void {
    this.cache.clear();
  }

  private startAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }

    this.syncTimer = setInterval(() => {
      // Auto-sync logic would go here
      console.log('Auto-syncing adherence data...');
    }, this.config.syncInterval * 60 * 1000);
  }

  private stopAutoSync(): void {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }

  private generateRecordId(): string {
    return `rec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateReportId(): string {
    return `rpt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopAutoSync();
    this.clearAllCache();
  }
}