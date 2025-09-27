/**
 * Progress Tracking Controller
 *
 * RESTful API endpoints for adherence analytics and progress tracking.
 * Provides comprehensive adherence metrics with Malaysian cultural intelligence.
 */

import { Request, Response } from 'express';
import { AdherenceAnalyticsService } from '../../services/analytics/AdherenceAnalyticsService';
import { TimePeriod } from '../../types/adherence/adherence.types';

export class ProgressTrackingController {
  private adherenceAnalytics: AdherenceAnalyticsService;

  constructor() {
    this.adherenceAnalytics = AdherenceAnalyticsService.getInstance();
  }

  /**
   * GET /api/analytics/progress/:patientId
   * Get comprehensive progress metrics for a patient
   */
  public async getProgressMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { patientId } = req.params;
      const { period = 'monthly', medicationId } = req.query;

      // Validate patient access
      if (!this.validatePatientAccess(req, patientId)) {
        res.status(403).json({
          success: false,
          message: 'Unauthorized access to patient data'
        });
        return;
      }

      // Validate period parameter
      const validPeriods: TimePeriod[] = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'];
      if (!validPeriods.includes(period as TimePeriod)) {
        res.status(400).json({
          success: false,
          message: 'Invalid period. Must be one of: daily, weekly, monthly, quarterly, yearly'
        });
        return;
      }

      const metrics = await this.adherenceAnalytics.calculateProgressMetrics(
        patientId,
        period as TimePeriod,
        medicationId as string
      );

      res.json({
        success: true,
        data: {
          progress: metrics,
          culturalInsights: {
            ramadanImpact: metrics.culturalAdjustments.ramadanAdjustments > 0,
            prayerTimeAccommodation: metrics.culturalAdjustments.prayerTimeDelays,
            familySupport: metrics.culturalAdjustments.familyCoordinationImpact > 0,
            traditionalMedicineUse: metrics.culturalAdjustments.traditionalMedicineInteractions > 0
          },
          recommendations: await this.generateProgressRecommendations(metrics)
        },
        meta: {
          timestamp: new Date().toISOString(),
          period,
          culturallyAdjusted: true
        }
      });
    } catch (error) {
      console.error('Error fetching progress metrics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve progress metrics',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * GET /api/analytics/adherence/:patientId
   * Get detailed adherence analytics with cultural insights
   */
  public async getAdherenceAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { patientId } = req.params;
      const {
        startDate,
        endDate,
        analysisType = 'individual'
      } = req.query;

      if (!this.validatePatientAccess(req, patientId)) {
        res.status(403).json({
          success: false,
          message: 'Unauthorized access to patient data'
        });
        return;
      }

      // Parse and validate date range
      let timeframe: { start: Date; end: Date };
      try {
        timeframe = {
          start: startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          end: endDate ? new Date(endDate as string) : new Date()
        };
      } catch (error) {
        res.status(400).json({
          success: false,
          message: 'Invalid date format. Use ISO 8601 format (YYYY-MM-DD)'
        });
        return;
      }

      const analytics = await this.adherenceAnalytics.generateAdherenceAnalytics(
        patientId,
        timeframe,
        analysisType as any
      );

      res.json({
        success: true,
        data: {
          analytics,
          summary: {
            totalInsights: analytics.insights.length,
            culturalObservations: analytics.culturalObservations.length,
            patterns: analytics.patterns.length,
            culturallyRelevantInsights: analytics.insights.filter(i => i.culturalRelevance > 0.5).length
          }
        },
        meta: {
          timestamp: new Date().toISOString(),
          timeframe,
          analysisType,
          culturalContext: 'malaysian'
        }
      });
    } catch (error) {
      console.error('Error generating adherence analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate adherence analytics',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * GET /api/analytics/prediction/:patientId/:medicationId
   * Get adherence predictions with cultural factor analysis
   */
  public async getAdherencePrediction(req: Request, res: Response): Promise<void> {
    try {
      const { patientId, medicationId } = req.params;
      const { forecastDays = '7' } = req.query;

      if (!this.validatePatientAccess(req, patientId)) {
        res.status(403).json({
          success: false,
          message: 'Unauthorized access to patient data'
        });
        return;
      }

      const forecastDaysNum = parseInt(forecastDays as string);
      if (isNaN(forecastDaysNum) || forecastDaysNum < 1 || forecastDaysNum > 30) {
        res.status(400).json({
          success: false,
          message: 'Invalid forecast days. Must be between 1 and 30'
        });
        return;
      }

      const prediction = await this.adherenceAnalytics.generateAdherencePrediction(
        patientId,
        medicationId,
        forecastDaysNum
      );

      res.json({
        success: true,
        data: {
          prediction,
          interpretation: {
            riskLevel: this.interpretRiskLevel(prediction.adherenceProbability),
            culturalFactorsCount: prediction.culturalFactors.length,
            primaryRiskFactors: prediction.riskFactors.slice(0, 3),
            actionableRecommendations: prediction.recommendations.filter(r => r.actionRequired)
          }
        },
        meta: {
          timestamp: new Date().toISOString(),
          forecastDays: forecastDaysNum,
          confidence: prediction.confidence,
          modelVersion: prediction.modelVersion
        }
      });
    } catch (error) {
      console.error('Error generating adherence prediction:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate adherence prediction',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * GET /api/analytics/family/:familyId
   * Get family-wide adherence metrics with cultural coordination analysis
   */
  public async getFamilyAdherenceMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { familyId } = req.params;

      if (!this.validateFamilyAccess(req, familyId)) {
        res.status(403).json({
          success: false,
          message: 'Unauthorized access to family data'
        });
        return;
      }

      const familyMetrics = await this.adherenceAnalytics.calculateFamilyAdherenceMetrics(familyId);

      res.json({
        success: true,
        data: {
          familyMetrics,
          insights: {
            topPerformer: this.findTopPerformer(familyMetrics.memberMetrics),
            coordinationLevel: this.assessCoordinationLevel(familyMetrics.coordinationScore),
            culturalHarmonyLevel: this.assessCulturalHarmony(familyMetrics.culturalHarmony),
            improvementOpportunities: await this.identifyFamilyImprovements(familyMetrics)
          }
        },
        meta: {
          timestamp: new Date().toISOString(),
          memberCount: familyMetrics.memberMetrics.length,
          culturallyOptimized: true
        }
      });
    } catch (error) {
      console.error('Error fetching family adherence metrics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve family adherence metrics',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * GET /api/analytics/statistics
   * Get population-level adherence statistics with cultural breakdowns
   */
  public async getAdherenceStatistics(req: Request, res: Response): Promise<void> {
    try {
      const {
        patientIds,
        culturalGroup,
        startDate,
        endDate
      } = req.query;

      // Validate administrative access for population statistics
      if (!this.validateAdminAccess(req)) {
        res.status(403).json({
          success: false,
          message: 'Administrative access required for population statistics'
        });
        return;
      }

      const filters: any = {};

      if (patientIds) {
        filters.patientIds = (patientIds as string).split(',');
      }

      if (culturalGroup) {
        filters.culturalGroup = culturalGroup;
      }

      if (startDate && endDate) {
        try {
          filters.timeframe = {
            start: new Date(startDate as string),
            end: new Date(endDate as string)
          };
        } catch (error) {
          res.status(400).json({
            success: false,
            message: 'Invalid date format'
          });
          return;
        }
      }

      const statistics = await this.adherenceAnalytics.generateAdherenceStatistics(filters);

      res.json({
        success: true,
        data: {
          statistics,
          insights: {
            populationSize: statistics.population.totalPatients,
            culturalDiversityIndex: this.calculateCulturalDiversityIndex(statistics),
            overallTrends: this.extractOverallTrends(statistics),
            culturalHighlights: this.extractCulturalHighlights(statistics)
          }
        },
        meta: {
          timestamp: new Date().toISOString(),
          filters,
          culturallySegmented: true
        }
      });
    } catch (error) {
      console.error('Error generating adherence statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to generate adherence statistics',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  /**
   * POST /api/analytics/adherence/:patientId/record
   * Record medication adherence with cultural context
   */
  public async recordAdherence(req: Request, res: Response): Promise<void> {
    try {
      const { patientId } = req.params;
      const {
        medicationId,
        scheduledTime,
        takenTime,
        status,
        notes,
        culturalContext
      } = req.body;

      if (!this.validatePatientAccess(req, patientId)) {
        res.status(403).json({
          success: false,
          message: 'Unauthorized access to patient data'
        });
        return;
      }

      // Validate required fields
      if (!medicationId || !scheduledTime || !status) {
        res.status(400).json({
          success: false,
          message: 'Missing required fields: medicationId, scheduledTime, status'
        });
        return;
      }

      // Calculate adherence score based on timing and cultural factors
      const adherenceScore = this.calculateAdherenceScore(
        scheduledTime,
        takenTime,
        status,
        culturalContext
      );

      const adherenceRecord = {
        patientId,
        medicationId,
        scheduledTime: new Date(scheduledTime),
        takenTime: takenTime ? new Date(takenTime) : undefined,
        status,
        adherenceScore,
        notes,
        culturalContext: culturalContext || {}
      };

      // This would save to the database - placeholder for now
      const savedRecord = await this.saveAdherenceRecord(adherenceRecord);

      res.status(201).json({
        success: true,
        data: {
          adherenceRecord: savedRecord,
          culturalAnalysis: {
            culturallyAppropriate: this.assessCulturalAppropriateness(culturalContext),
            accommodationsUsed: this.identifyAccommodations(culturalContext),
            culturalScore: this.calculateCulturalScore(culturalContext)
          }
        },
        meta: {
          timestamp: new Date().toISOString(),
          adherenceScore,
          culturallyAdjusted: true
        }
      });
    } catch (error) {
      console.error('Error recording adherence:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to record adherence',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }

  // Private helper methods

  private validatePatientAccess(req: Request, patientId: string): boolean {
    // This would validate that the requesting user has access to this patient's data
    // Implementation would check JWT claims, family relationships, provider access, etc.
    return true; // Placeholder
  }

  private validateFamilyAccess(req: Request, familyId: string): boolean {
    // This would validate family access permissions
    return true; // Placeholder
  }

  private validateAdminAccess(req: Request): boolean {
    // This would validate administrative access for population statistics
    return true; // Placeholder
  }

  private async generateProgressRecommendations(metrics: any): Promise<string[]> {
    const recommendations: string[] = [];

    if (metrics.adherenceRate < 80) {
      recommendations.push('Consider adjusting medication schedule for better adherence');
    }

    if (metrics.culturalAdjustments.prayerTimeDelays > 5) {
      recommendations.push('Optimize medication timing to align with prayer schedule');
    }

    if (metrics.culturalAdjustments.familyCoordinationImpact === 0) {
      recommendations.push('Involve family members for better medication support');
    }

    return recommendations;
  }

  private interpretRiskLevel(adherenceProbability: number): string {
    if (adherenceProbability >= 90) return 'low';
    if (adherenceProbability >= 75) return 'moderate';
    if (adherenceProbability >= 60) return 'high';
    return 'critical';
  }

  private findTopPerformer(memberMetrics: any[]): any {
    return memberMetrics.reduce((top, member) =>
      member.adherenceRate > (top?.adherenceRate || 0) ? member : top
    );
  }

  private assessCoordinationLevel(score: number): string {
    if (score >= 8) return 'excellent';
    if (score >= 6) return 'good';
    if (score >= 4) return 'moderate';
    return 'needs_improvement';
  }

  private assessCulturalHarmony(score: number): string {
    if (score >= 8) return 'high';
    if (score >= 6) return 'moderate';
    return 'low';
  }

  private async identifyFamilyImprovements(familyMetrics: any): Promise<string[]> {
    const improvements: string[] = [];

    if (familyMetrics.coordinationScore < 6) {
      improvements.push('Improve family communication about medication schedules');
    }

    if (familyMetrics.culturalHarmony < 6) {
      improvements.push('Better align medication schedules with cultural practices');
    }

    return improvements;
  }

  private calculateCulturalDiversityIndex(statistics: any): number {
    // Placeholder calculation
    return 0.75;
  }

  private extractOverallTrends(statistics: any): any {
    // Placeholder trends
    return {
      improving: true,
      culturalAccommodation: 'increasing',
      familyInvolvement: 'stable'
    };
  }

  private extractCulturalHighlights(statistics: any): string[] {
    return [
      'High adherence during Ramadan with proper accommodations',
      'Prayer time adjustments improve overall compliance',
      'Family coordination shows positive correlation with adherence'
    ];
  }

  private calculateAdherenceScore(
    scheduledTime: string,
    takenTime?: string,
    status?: string,
    culturalContext?: any
  ): number {
    let score = 0;

    if (status === 'taken') {
      score = 10;

      if (takenTime) {
        const scheduled = new Date(scheduledTime);
        const taken = new Date(takenTime);
        const diffMinutes = Math.abs(taken.getTime() - scheduled.getTime()) / (1000 * 60);

        // Deduct points for lateness
        if (diffMinutes <= 15) score = 10;
        else if (diffMinutes <= 30) score = 8;
        else if (diffMinutes <= 60) score = 6;
        else score = 4;
      }
    } else if (status === 'late') {
      score = 6;
    } else if (status === 'skipped' && culturalContext?.festivalPeriod) {
      score = 8; // Cultural accommodation
    } else {
      score = 0;
    }

    // Cultural adjustments
    if (culturalContext?.prayerTimeConflict && status === 'late') {
      score += 2; // Bonus for prayer time accommodation
    }

    if (culturalContext?.familySupport) {
      score += 1; // Bonus for family involvement
    }

    return Math.min(10, score);
  }

  private assessCulturalAppropriateness(culturalContext: any): boolean {
    return culturalContext && (
      culturalContext.prayerTimeConflict ||
      culturalContext.fastingPeriod ||
      culturalContext.festivalPeriod ||
      culturalContext.familySupport
    );
  }

  private identifyAccommodations(culturalContext: any): string[] {
    const accommodations: string[] = [];

    if (culturalContext?.prayerTimeConflict) {
      accommodations.push('prayer_time_adjustment');
    }

    if (culturalContext?.fastingPeriod) {
      accommodations.push('ramadan_timing');
    }

    if (culturalContext?.familySupport) {
      accommodations.push('family_coordination');
    }

    return accommodations;
  }

  private calculateCulturalScore(culturalContext: any): number {
    let score = 0;

    if (culturalContext?.prayerTimeConflict) score += 0.3;
    if (culturalContext?.fastingPeriod) score += 0.2;
    if (culturalContext?.festivalPeriod) score += 0.2;
    if (culturalContext?.familySupport) score += 0.3;

    return Math.min(1, score);
  }

  private async saveAdherenceRecord(record: any): Promise<any> {
    // Placeholder for database save operation
    return {
      ...record,
      id: 'placeholder-id',
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }
}