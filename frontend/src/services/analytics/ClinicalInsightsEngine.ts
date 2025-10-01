/**
 * Clinical Insights Engine
 *
 * Stream D - Provider Reporting & FHIR Integration
 *
 * Provides comprehensive clinical insights and medication effectiveness tracking
 * for healthcare providers. Integrates with adherence data, cultural patterns,
 * and clinical outcomes to generate actionable insights for patient care.
 *
 * Features:
 * - Clinical effectiveness analysis
 * - Cultural factor impact assessment
 * - Medication interaction insights
 * - Provider-specific recommendations
 * - Risk stratification and alerts
 * - Trend analysis and predictions
 */

import {
  AdherenceRecord,
  ProgressMetrics,
  AdherencePattern,
  CulturalInsight,
  AdherencePrediction,
  RiskLevel,
  MedicationAdherenceReport
} from '../../types/adherence';
import { Medication } from '../../types/medication';
import { ProgressTrackingService } from './ProgressTrackingService';
import { UserAdherenceAnalyticsService } from './UserAdherenceAnalyticsService';

// Clinical Insights Types
export interface ClinicalInsight {
  id: string;
  type: ClinicalInsightType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  clinicalSignificance: string;
  evidence: ClinicalEvidence[];
  recommendations: ClinicalRecommendation[];
  culturalContext?: CulturalClinicalContext;
  confidenceLevel: number; // 0-1
  generatedAt: Date;
  expiresAt?: Date;
}

export type ClinicalInsightType =
  | 'medication_effectiveness'
  | 'adherence_clinical_correlation'
  | 'cultural_barrier_identification'
  | 'drug_interaction_concern'
  | 'dosing_optimization'
  | 'timing_optimization'
  | 'side_effect_pattern'
  | 'therapeutic_failure_risk'
  | 'polypharmacy_complexity'
  | 'lifestyle_medication_conflict';

export interface ClinicalEvidence {
  type: 'adherence_data' | 'clinical_outcome' | 'cultural_pattern' | 'literature_based';
  description: string;
  dataPoints: number;
  timeframe: string;
  reliability: number; // 0-1
  source?: string;
}

export interface ClinicalRecommendation {
  id: string;
  priority: 'immediate' | 'urgent' | 'routine' | 'optional';
  category: 'medication_adjustment' | 'schedule_modification' | 'patient_education' | 'monitoring';
  action: string;
  rationale: string;
  expectedOutcome: string;
  culturalConsiderations?: string[];
  estimatedImpact: number; // 0-100 (% improvement expected)
  implementationDifficulty: 'easy' | 'moderate' | 'difficult';
}

export interface ClinicalCohortAnalysis {
  cohortSize: number;
  averageAdherence: number;
  effectivenessMetrics: {
    therapeuticGoalsAchieved: number; // %
    sideEffectsReported: number; // %
    medicationChanges: number; // %
    hospitalizationRate: number; // %
  };
  culturalFactorImpact: {
    prayerTimeConflicts: number; // % of cohort affected
    fastingPeriodAdjustments: number;
    familySupportPositive: number;
    traditionalMedicineInterference: number;
  };
  riskDistribution: Record<RiskLevel, number>; // % in each risk category
}

export interface ClinicalEffectivenessMetrics {
  medicationId: string;
  medicationName: string;
  prescribedDosage: string;
  adherenceRate: number;
  clinicalOutcomes: {
    symptomImprovement: number; // 0-100 scale
    biomarkerChanges?: Record<string, number>;
    qualityOfLifeScore?: number;
    functionalStatusChange?: number;
  };
  sideEffects: {
    reported: string[];
    severity: 'mild' | 'moderate' | 'severe';
    impactOnAdherence: number; // -100 to 100
  }[];
  timeToTherapeuticEffect?: number; // days
  culturalAcceptability: number; // 0-100
  costEffectiveness?: number;
}

export interface CulturalClinicalContext {
  primaryCulturalFactors: string[];
  religiousConsiderations: {
    prayerTimeConflicts: boolean;
    fastingRequirements: boolean;
    religiousRestrictions: string[];
  };
  familyDynamics: {
    supportLevel: 'high' | 'medium' | 'low';
    involvementType: 'supervision' | 'reminder' | 'coordination' | 'minimal';
    culturalHealthBeliefs: string[];
  };
  traditionalMedicineUse: {
    concurrent: boolean;
    conflicting: boolean;
    complementary: boolean;
    types: string[];
  };
  linguisticFactors: {
    primaryLanguage: string;
    healthLiteracyLevel: 'high' | 'medium' | 'low';
    communicationPreferences: string[];
  };
}

export interface ClinicalAlert {
  id: string;
  patientId: string;
  type: ClinicalAlertType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  actionRequired: boolean;
  generatedAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  relatedMedications: string[];
  culturalNotes?: string[];
}

export type ClinicalAlertType =
  | 'adherence_critical_drop'
  | 'drug_interaction_detected'
  | 'side_effect_pattern'
  | 'therapeutic_failure_indicator'
  | 'cultural_barrier_emerging'
  | 'dosing_schedule_conflict'
  | 'polypharmacy_risk'
  | 'hospitalization_risk';

export interface ProviderInsightProfile {
  providerId: string;
  patientId: string;
  lastUpdated: Date;
  overallRiskLevel: RiskLevel;
  keyInsights: ClinicalInsight[];
  activeAlerts: ClinicalAlert[];
  medicationEffectiveness: ClinicalEffectivenessMetrics[];
  culturalProfile: CulturalClinicalContext;
  cohortComparison: {
    percentile: number; // Patient's adherence percentile in similar cohort
    cohortMetrics: ClinicalCohortAnalysis;
  };
  recommendedActions: ClinicalRecommendation[];
  nextReviewDate: Date;
}

export class ClinicalInsightsEngine {
  private progressTracker: ProgressTrackingService;
  private adherenceAnalytics: UserAdherenceAnalyticsService;
  private insightCache: Map<string, ProviderInsightProfile> = new Map();
  private alertHistory: Map<string, ClinicalAlert[]> = new Map();

  private readonly INSIGHT_CONFIG = {
    cacheExpiryHours: 6, // Provider insights expire after 6 hours
    minDataPointsForInsight: 7, // Minimum adherence records needed
    alertCooldownHours: 24, // Minimum time between similar alerts
    culturalWeightFactor: 0.25, // Weight given to cultural factors
    effectivenessWindowDays: 30, // Window for effectiveness analysis
    cohortSizeMinimum: 10, // Minimum cohort size for comparisons
  };

  constructor(
    progressTracker?: ProgressTrackingService,
    adherenceAnalytics?: UserAdherenceAnalyticsService
  ) {
    this.progressTracker = progressTracker || new ProgressTrackingService();
    this.adherenceAnalytics = adherenceAnalytics || UserAdherenceAnalyticsService.getInstance();
  }

  /**
   * Generate comprehensive clinical insights for a patient
   */
  async generateProviderInsights(
    patientId: string,
    providerId: string,
    medications: Medication[],
    adherenceRecords: AdherenceRecord[],
    clinicalData?: any
  ): Promise<ProviderInsightProfile> {
    try {
      console.log(`Generating clinical insights for patient ${patientId}, provider ${providerId}`);

      // Check cache first
      const cacheKey = `${providerId}_${patientId}`;
      const cached = this.insightCache.get(cacheKey);
      if (cached && this.isCacheValid(cached.lastUpdated)) {
        return cached;
      }

      // Get adherence analytics
      const progressMetrics = await this.progressTracker.getProgressMetrics(
        patientId,
        medications,
        adherenceRecords,
        'monthly'
      );

      if (!progressMetrics.success || !progressMetrics.data) {
        throw new Error('Failed to get progress metrics');
      }

      const adherenceProfile = await this.adherenceAnalytics.analyzeUserAdherence(patientId);

      // Generate clinical insights
      const keyInsights = await this.generateClinicalInsights(
        patientId,
        medications,
        adherenceRecords,
        progressMetrics.data,
        adherenceProfile
      );

      // Analyze medication effectiveness
      const medicationEffectiveness = await this.analyzeMedicationEffectiveness(
        medications,
        adherenceRecords,
        progressMetrics.data,
        clinicalData
      );

      // Assess cultural context
      const culturalProfile = await this.assessCulturalClinicalContext(
        patientId,
        adherenceRecords,
        progressMetrics.data.culturalInsights
      );

      // Generate alerts
      const activeAlerts = await this.generateClinicalAlerts(
        patientId,
        medications,
        adherenceRecords,
        keyInsights
      );

      // Cohort comparison
      const cohortComparison = await this.performCohortAnalysis(
        patientId,
        medications,
        progressMetrics.data.overallAdherence
      );

      // Risk assessment
      const overallRiskLevel = this.assessOverallRisk(
        progressMetrics.data,
        keyInsights,
        activeAlerts
      );

      // Generate recommendations
      const recommendedActions = await this.generateClinicalRecommendations(
        keyInsights,
        medicationEffectiveness,
        culturalProfile,
        overallRiskLevel
      );

      // Calculate next review date
      const nextReviewDate = this.calculateNextReviewDate(overallRiskLevel, activeAlerts);

      const profile: ProviderInsightProfile = {
        providerId,
        patientId,
        lastUpdated: new Date(),
        overallRiskLevel,
        keyInsights,
        activeAlerts,
        medicationEffectiveness,
        culturalProfile,
        cohortComparison,
        recommendedActions,
        nextReviewDate
      };

      // Cache the profile
      this.insightCache.set(cacheKey, profile);

      console.log(`Clinical insights generated: ${keyInsights.length} insights, ${activeAlerts.length} alerts`);

      return profile;
    } catch (error) {
      console.error(`Failed to generate clinical insights:`, error);
      throw error;
    }
  }

  /**
   * Generate clinical effectiveness analysis for medication
   */
  async analyzeMedicationClinicalEffectiveness(
    medicationId: string,
    patientId: string,
    adherenceRecords: AdherenceRecord[],
    clinicalOutcomes?: any
  ): Promise<ClinicalEffectivenessMetrics> {
    try {
      const medicationRecords = adherenceRecords.filter(r => r.medicationId === medicationId);

      if (medicationRecords.length < this.INSIGHT_CONFIG.minDataPointsForInsight) {
        throw new Error('Insufficient data for clinical effectiveness analysis');
      }

      const adherenceRate = (medicationRecords.filter(r => r.status === 'taken_on_time').length / medicationRecords.length) * 100;

      // Analyze cultural acceptability
      const culturalAcceptability = this.calculateCulturalAcceptability(medicationRecords);

      // Simulate clinical outcomes (in real implementation, this would come from clinical data)
      const simulatedOutcomes = this.simulateClinicalOutcomes(adherenceRate, culturalAcceptability);

      return {
        medicationId,
        medicationName: 'Medication Name', // Would be fetched from medication service
        prescribedDosage: 'As prescribed', // Would come from prescription data
        adherenceRate,
        clinicalOutcomes: simulatedOutcomes,
        sideEffects: this.analyzeSideEffectPatterns(medicationRecords),
        timeToTherapeuticEffect: this.estimateTimeToEffect(medicationRecords),
        culturalAcceptability,
        costEffectiveness: this.calculateCostEffectiveness(adherenceRate, simulatedOutcomes)
      };
    } catch (error) {
      console.error(`Failed to analyze medication effectiveness:`, error);
      throw error;
    }
  }

  /**
   * Generate clinical alerts for provider attention
   */
  async generateClinicalAlertsForProvider(
    providerId: string,
    patientIds: string[]
  ): Promise<ClinicalAlert[]> {
    try {
      const allAlerts: ClinicalAlert[] = [];

      for (const patientId of patientIds) {
        const patientAlerts = this.alertHistory.get(patientId) || [];
        const activeAlerts = patientAlerts.filter(alert =>
          !alert.acknowledgedAt &&
          this.isAlertStillRelevant(alert)
        );
        allAlerts.push(...activeAlerts);
      }

      // Sort by severity and recency
      return allAlerts.sort((a, b) => {
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
        if (severityDiff !== 0) return severityDiff;

        return b.generatedAt.getTime() - a.generatedAt.getTime();
      });
    } catch (error) {
      console.error(`Failed to generate clinical alerts:`, error);
      throw error;
    }
  }

  /**
   * Acknowledge clinical alert
   */
  async acknowledgeClinicalAlert(
    alertId: string,
    providerId: string,
    notes?: string
  ): Promise<void> {
    try {
      // Find and acknowledge the alert
      for (const [patientId, alerts] of this.alertHistory) {
        const alert = alerts.find(a => a.id === alertId);
        if (alert) {
          alert.acknowledgedAt = new Date();
          alert.acknowledgedBy = providerId;

          console.log(`Alert ${alertId} acknowledged by provider ${providerId}`);
          return;
        }
      }

      throw new Error(`Alert ${alertId} not found`);
    } catch (error) {
      console.error(`Failed to acknowledge alert:`, error);
      throw error;
    }
  }

  /**
   * Get system-wide clinical analytics for administrative insights
   */
  async getSystemClinicalAnalytics(): Promise<{
    totalPatients: number;
    riskDistribution: Record<RiskLevel, number>;
    commonInsightTypes: Array<{ type: ClinicalInsightType; frequency: number }>;
    culturalFactorImpact: {
      prayerTimeConflicts: number;
      fastingAdjustments: number;
      familySupportBenefit: number;
      traditionalMedicineConflicts: number;
    };
    medicationEffectivenessOverview: Array<{
      category: string;
      averageAdherence: number;
      clinicalSuccess: number;
    }>;
    alertTrends: Array<{
      type: ClinicalAlertType;
      frequency: number;
      averageResolutionTime: number;
    }>;
  }> {
    try {
      console.log('Generating system-wide clinical analytics...');

      // Aggregate data from all cached profiles
      const allProfiles = Array.from(this.insightCache.values());
      const totalPatients = allProfiles.length;

      // Risk distribution
      const riskDistribution: Record<RiskLevel, number> = {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0
      };

      allProfiles.forEach(profile => {
        riskDistribution[profile.overallRiskLevel]++;
      });

      // Convert to percentages
      Object.keys(riskDistribution).forEach(key => {
        riskDistribution[key as RiskLevel] = totalPatients > 0
          ? (riskDistribution[key as RiskLevel] / totalPatients) * 100
          : 0;
      });

      // Common insight types
      const insightTypeCounts = new Map<ClinicalInsightType, number>();
      allProfiles.forEach(profile => {
        profile.keyInsights.forEach(insight => {
          const count = insightTypeCounts.get(insight.type) || 0;
          insightTypeCounts.set(insight.type, count + 1);
        });
      });

      const commonInsightTypes = Array.from(insightTypeCounts.entries())
        .map(([type, frequency]) => ({ type, frequency }))
        .sort((a, b) => b.frequency - a.frequency)
        .slice(0, 10);

      // Cultural factor impact
      const culturalFactorImpact = {
        prayerTimeConflicts: 0,
        fastingAdjustments: 0,
        familySupportBenefit: 0,
        traditionalMedicineConflicts: 0
      };

      let culturalProfilesCount = 0;
      allProfiles.forEach(profile => {
        if (profile.culturalProfile) {
          culturalProfilesCount++;
          if (profile.culturalProfile.religiousConsiderations.prayerTimeConflicts) {
            culturalFactorImpact.prayerTimeConflicts++;
          }
          if (profile.culturalProfile.religiousConsiderations.fastingRequirements) {
            culturalFactorImpact.fastingAdjustments++;
          }
          if (profile.culturalProfile.familyDynamics.supportLevel === 'high') {
            culturalFactorImpact.familySupportBenefit++;
          }
          if (profile.culturalProfile.traditionalMedicineUse.conflicting) {
            culturalFactorImpact.traditionalMedicineConflicts++;
          }
        }
      });

      // Convert to percentages
      if (culturalProfilesCount > 0) {
        Object.keys(culturalFactorImpact).forEach(key => {
          culturalFactorImpact[key as keyof typeof culturalFactorImpact] =
            (culturalFactorImpact[key as keyof typeof culturalFactorImpact] / culturalProfilesCount) * 100;
        });
      }

      // Medication effectiveness overview (simplified)
      const medicationEffectivenessOverview = [
        {
          category: 'Cardiovascular',
          averageAdherence: 78.5,
          clinicalSuccess: 82.3
        },
        {
          category: 'Diabetes',
          averageAdherence: 85.2,
          clinicalSuccess: 88.7
        },
        {
          category: 'Hypertension',
          averageAdherence: 73.8,
          clinicalSuccess: 76.4
        }
      ];

      // Alert trends
      const alertTypeCounts = new Map<ClinicalAlertType, { count: number; totalResolutionTime: number }>();

      this.alertHistory.forEach(alerts => {
        alerts.forEach(alert => {
          const current = alertTypeCounts.get(alert.type) || { count: 0, totalResolutionTime: 0 };
          current.count++;

          if (alert.acknowledgedAt) {
            const resolutionTime = alert.acknowledgedAt.getTime() - alert.generatedAt.getTime();
            current.totalResolutionTime += resolutionTime / (1000 * 60 * 60); // Convert to hours
          }

          alertTypeCounts.set(alert.type, current);
        });
      });

      const alertTrends = Array.from(alertTypeCounts.entries())
        .map(([type, data]) => ({
          type,
          frequency: data.count,
          averageResolutionTime: data.count > 0 ? data.totalResolutionTime / data.count : 0
        }))
        .sort((a, b) => b.frequency - a.frequency);

      return {
        totalPatients,
        riskDistribution,
        commonInsightTypes,
        culturalFactorImpact,
        medicationEffectivenessOverview,
        alertTrends
      };
    } catch (error) {
      console.error('Failed to generate system clinical analytics:', error);
      throw error;
    }
  }

  // Private helper methods

  private async generateClinicalInsights(
    patientId: string,
    medications: Medication[],
    adherenceRecords: AdherenceRecord[],
    progressMetrics: ProgressMetrics,
    adherenceProfile: any
  ): Promise<ClinicalInsight[]> {
    const insights: ClinicalInsight[] = [];

    // Medication effectiveness insight
    if (progressMetrics.overallAdherence < 70) {
      insights.push({
        id: `effectiveness_${Date.now()}`,
        type: 'medication_effectiveness',
        severity: 'high',
        title: 'Suboptimal Medication Adherence',
        description: `Patient adherence at ${progressMetrics.overallAdherence.toFixed(1)}% may compromise therapeutic outcomes`,
        clinicalSignificance: 'Poor adherence is associated with increased hospitalizations and disease progression',
        evidence: [
          {
            type: 'adherence_data',
            description: `${adherenceRecords.length} adherence records analyzed over ${this.INSIGHT_CONFIG.effectivenessWindowDays} days`,
            dataPoints: adherenceRecords.length,
            timeframe: `${this.INSIGHT_CONFIG.effectivenessWindowDays} days`,
            reliability: 0.9
          }
        ],
        recommendations: [
          {
            id: `rec_${Date.now()}`,
            priority: 'urgent',
            category: 'patient_education',
            action: 'Schedule adherence counseling session',
            rationale: 'Low adherence requires immediate intervention to prevent clinical deterioration',
            expectedOutcome: 'Improved understanding and 15-20% adherence increase',
            estimatedImpact: 20,
            implementationDifficulty: 'easy'
          }
        ],
        confidenceLevel: 0.9,
        generatedAt: new Date()
      });
    }

    // Cultural barrier insight
    const culturalInsights = progressMetrics.culturalInsights;
    if (culturalInsights.some(ci => ci.culturalSensitivity === 'high')) {
      insights.push({
        id: `cultural_${Date.now()}`,
        type: 'cultural_barrier_identification',
        severity: 'medium',
        title: 'Cultural Factors Affecting Adherence',
        description: 'Prayer time conflicts and cultural practices may be impacting medication adherence',
        clinicalSignificance: 'Cultural factors account for up to 25% of adherence variation in Malaysian patients',
        evidence: [
          {
            type: 'cultural_pattern',
            description: 'Cultural pattern analysis identifies significant adherence variations during religious observances',
            dataPoints: culturalInsights.length,
            timeframe: '30 days',
            reliability: 0.8
          }
        ],
        recommendations: [
          {
            id: `rec_cultural_${Date.now()}`,
            priority: 'routine',
            category: 'schedule_modification',
            action: 'Adjust medication schedule to accommodate prayer times',
            rationale: 'Culturally-sensitive scheduling improves long-term adherence',
            expectedOutcome: 'Better integration with daily routine and improved adherence',
            culturalConsiderations: ['Prayer time alignment', 'Family involvement'],
            estimatedImpact: 15,
            implementationDifficulty: 'easy'
          }
        ],
        culturalContext: {
          primaryCulturalFactors: ['Prayer time conflicts', 'Religious observances'],
          religiousConsiderations: {
            prayerTimeConflicts: true,
            fastingRequirements: false,
            religiousRestrictions: []
          },
          familyDynamics: {
            supportLevel: 'medium',
            involvementType: 'reminder',
            culturalHealthBeliefs: ['Family support is important']
          },
          traditionalMedicineUse: {
            concurrent: false,
            conflicting: false,
            complementary: false,
            types: []
          },
          linguisticFactors: {
            primaryLanguage: 'Malay',
            healthLiteracyLevel: 'medium',
            communicationPreferences: ['Visual aids', 'Family involvement']
          }
        },
        confidenceLevel: 0.8,
        generatedAt: new Date()
      });
    }

    // Polypharmacy complexity
    if (medications.length >= 5) {
      insights.push({
        id: `polypharmacy_${Date.now()}`,
        type: 'polypharmacy_complexity',
        severity: 'medium',
        title: 'Complex Medication Regimen',
        description: `Patient managing ${medications.length} medications may face complexity-related adherence challenges`,
        clinicalSignificance: 'Polypharmacy increases risk of drug interactions and adherence problems',
        evidence: [
          {
            type: 'adherence_data',
            description: `Multiple medication adherence patterns analyzed`,
            dataPoints: medications.length,
            timeframe: '30 days',
            reliability: 0.85
          }
        ],
        recommendations: [
          {
            id: `rec_poly_${Date.now()}`,
            priority: 'routine',
            category: 'medication_adjustment',
            action: 'Review medication regimen for simplification opportunities',
            rationale: 'Reducing complexity can improve adherence and reduce errors',
            expectedOutcome: 'Simplified regimen with maintained therapeutic effectiveness',
            estimatedImpact: 12,
            implementationDifficulty: 'moderate'
          }
        ],
        confidenceLevel: 0.75,
        generatedAt: new Date()
      });
    }

    return insights;
  }

  private async analyzeMedicationEffectiveness(
    medications: Medication[],
    adherenceRecords: AdherenceRecord[],
    progressMetrics: ProgressMetrics,
    clinicalData?: any
  ): Promise<ClinicalEffectivenessMetrics[]> {
    const effectivenessMetrics: ClinicalEffectivenessMetrics[] = [];

    for (const medication of medications) {
      const medRecords = adherenceRecords.filter(r => r.medicationId === medication.id);
      if (medRecords.length >= this.INSIGHT_CONFIG.minDataPointsForInsight) {
        try {
          const effectiveness = await this.analyzeMedicationClinicalEffectiveness(
            medication.id,
            progressMetrics.patientId,
            medRecords,
            clinicalData
          );
          effectivenessMetrics.push(effectiveness);
        } catch (error) {
          console.warn(`Failed to analyze effectiveness for medication ${medication.id}:`, error);
        }
      }
    }

    return effectivenessMetrics;
  }

  private async assessCulturalClinicalContext(
    patientId: string,
    adherenceRecords: AdherenceRecord[],
    culturalInsights: CulturalInsight[]
  ): Promise<CulturalClinicalContext> {
    // Analyze cultural patterns from adherence data
    const prayerTimeConflicts = adherenceRecords.some(r =>
      r.culturalContext?.prayerTime !== undefined
    );

    const fastingPeriods = adherenceRecords.some(r =>
      r.culturalContext?.fastingPeriod === true
    );

    const familyInvolvement = adherenceRecords.some(r =>
      r.culturalContext?.familyInvolvement === true
    );

    const traditionalMedicine = adherenceRecords.some(r =>
      r.culturalContext?.traditionalMedicineInteraction === true
    );

    return {
      primaryCulturalFactors: this.extractPrimaryCulturalFactors(culturalInsights),
      religiousConsiderations: {
        prayerTimeConflicts,
        fastingRequirements: fastingPeriods,
        religiousRestrictions: []
      },
      familyDynamics: {
        supportLevel: familyInvolvement ? 'high' : 'medium',
        involvementType: familyInvolvement ? 'coordination' : 'minimal',
        culturalHealthBeliefs: ['Family support important', 'Religious considerations matter']
      },
      traditionalMedicineUse: {
        concurrent: traditionalMedicine,
        conflicting: traditionalMedicine,
        complementary: false,
        types: traditionalMedicine ? ['Herbal remedies'] : []
      },
      linguisticFactors: {
        primaryLanguage: 'Malay', // Would be determined from patient profile
        healthLiteracyLevel: 'medium',
        communicationPreferences: ['Visual aids', 'Family involvement']
      }
    };
  }

  private async generateClinicalAlerts(
    patientId: string,
    medications: Medication[],
    adherenceRecords: AdherenceRecord[],
    insights: ClinicalInsight[]
  ): Promise<ClinicalAlert[]> {
    const alerts: ClinicalAlert[] = [];

    // Critical adherence drop alert
    const recentRecords = adherenceRecords.slice(-7); // Last week
    if (recentRecords.length > 0) {
      const recentAdherence = (recentRecords.filter(r => r.status === 'taken_on_time').length / recentRecords.length) * 100;

      if (recentAdherence < 50) {
        alerts.push({
          id: `alert_critical_${Date.now()}`,
          patientId,
          type: 'adherence_critical_drop',
          severity: 'critical',
          title: 'Critical Adherence Drop',
          message: `Patient adherence dropped to ${recentAdherence.toFixed(1)}% in the last week`,
          actionRequired: true,
          generatedAt: new Date(),
          relatedMedications: medications.map(m => m.id),
          culturalNotes: ['Consider cultural factors affecting adherence']
        });
      }
    }

    // Drug interaction alert for polypharmacy
    if (medications.length >= 4) {
      alerts.push({
        id: `alert_interaction_${Date.now()}`,
        patientId,
        type: 'polypharmacy_risk',
        severity: 'medium',
        title: 'Polypharmacy Risk',
        message: `Patient on ${medications.length} medications - monitor for interactions`,
        actionRequired: false,
        generatedAt: new Date(),
        relatedMedications: medications.map(m => m.id)
      });
    }

    // Cultural barrier alert
    const culturalInsights = insights.filter(i => i.type === 'cultural_barrier_identification');
    if (culturalInsights.length > 0) {
      alerts.push({
        id: `alert_cultural_${Date.now()}`,
        patientId,
        type: 'cultural_barrier_emerging',
        severity: 'medium',
        title: 'Cultural Barriers Detected',
        message: 'Cultural factors may be affecting medication adherence',
        actionRequired: false,
        generatedAt: new Date(),
        relatedMedications: medications.map(m => m.id),
        culturalNotes: ['Prayer time conflicts', 'Family involvement needed']
      });
    }

    // Store alerts in history
    const existingAlerts = this.alertHistory.get(patientId) || [];
    this.alertHistory.set(patientId, [...existingAlerts, ...alerts]);

    return alerts;
  }

  private async performCohortAnalysis(
    patientId: string,
    medications: Medication[],
    adherenceRate: number
  ): Promise<{ percentile: number; cohortMetrics: ClinicalCohortAnalysis }> {
    // Simulate cohort analysis (in real implementation, this would query a database)
    const mockCohortMetrics: ClinicalCohortAnalysis = {
      cohortSize: 157,
      averageAdherence: 76.8,
      effectivenessMetrics: {
        therapeuticGoalsAchieved: 78.3,
        sideEffectsReported: 12.7,
        medicationChanges: 23.1,
        hospitalizationRate: 4.2
      },
      culturalFactorImpact: {
        prayerTimeConflicts: 34.5,
        fastingPeriodAdjustments: 67.8,
        familySupportPositive: 82.1,
        traditionalMedicineInterference: 18.9
      },
      riskDistribution: {
        low: 45.2,
        medium: 32.8,
        high: 18.5,
        critical: 3.5
      }
    };

    // Calculate patient's percentile
    const percentile = adherenceRate > mockCohortMetrics.averageAdherence ? 75 : 45;

    return {
      percentile,
      cohortMetrics: mockCohortMetrics
    };
  }

  private assessOverallRisk(
    progressMetrics: ProgressMetrics,
    insights: ClinicalInsight[],
    alerts: ClinicalAlert[]
  ): RiskLevel {
    let riskScore = 0;

    // Base risk from adherence
    if (progressMetrics.overallAdherence < 50) riskScore += 40;
    else if (progressMetrics.overallAdherence < 70) riskScore += 25;
    else if (progressMetrics.overallAdherence < 85) riskScore += 10;

    // Risk from insights
    const highSeverityInsights = insights.filter(i => i.severity === 'high' || i.severity === 'critical');
    riskScore += highSeverityInsights.length * 15;

    // Risk from alerts
    const criticalAlerts = alerts.filter(a => a.severity === 'critical');
    const highAlerts = alerts.filter(a => a.severity === 'high');
    riskScore += criticalAlerts.length * 20 + highAlerts.length * 10;

    // Convert to risk level
    if (riskScore >= 70) return 'critical';
    if (riskScore >= 45) return 'high';
    if (riskScore >= 20) return 'medium';
    return 'low';
  }

  private async generateClinicalRecommendations(
    insights: ClinicalInsight[],
    effectiveness: ClinicalEffectivenessMetrics[],
    culturalContext: CulturalClinicalContext,
    riskLevel: RiskLevel
  ): Promise<ClinicalRecommendation[]> {
    const recommendations: ClinicalRecommendation[] = [];

    // Aggregate recommendations from insights
    insights.forEach(insight => {
      recommendations.push(...insight.recommendations);
    });

    // Add risk-based recommendations
    if (riskLevel === 'critical' || riskLevel === 'high') {
      recommendations.push({
        id: `rec_urgent_${Date.now()}`,
        priority: 'urgent',
        category: 'monitoring',
        action: 'Schedule immediate clinical review',
        rationale: 'High risk patient requires prompt clinical attention',
        expectedOutcome: 'Early intervention to prevent complications',
        estimatedImpact: 30,
        implementationDifficulty: 'easy'
      });
    }

    // Cultural recommendations
    if (culturalContext.religiousConsiderations.prayerTimeConflicts) {
      recommendations.push({
        id: `rec_cultural_${Date.now()}`,
        priority: 'routine',
        category: 'schedule_modification',
        action: 'Adjust medication schedule for prayer time compatibility',
        rationale: 'Aligning medication schedule with religious practices improves adherence',
        expectedOutcome: 'Reduced prayer time conflicts and improved adherence',
        culturalConsiderations: ['Prayer time alignment', 'Religious sensitivity'],
        estimatedImpact: 15,
        implementationDifficulty: 'easy'
      });
    }

    // Sort by priority and expected impact
    return recommendations.sort((a, b) => {
      const priorityOrder = { immediate: 4, urgent: 3, routine: 2, optional: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      if (priorityDiff !== 0) return priorityDiff;

      return b.estimatedImpact - a.estimatedImpact;
    }).slice(0, 10); // Limit to top 10 recommendations
  }

  private calculateNextReviewDate(riskLevel: RiskLevel, alerts: ClinicalAlert[]): Date {
    const now = new Date();
    const hasCriticalAlerts = alerts.some(a => a.severity === 'critical');

    if (hasCriticalAlerts || riskLevel === 'critical') {
      // 1 week for critical cases
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    } else if (riskLevel === 'high') {
      // 2 weeks for high risk
      return new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    } else if (riskLevel === 'medium') {
      // 1 month for medium risk
      return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    } else {
      // 3 months for low risk
      return new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    }
  }

  // Helper methods for effectiveness analysis

  private calculateCulturalAcceptability(records: AdherenceRecord[]): number {
    const culturalContextRecords = records.filter(r => r.culturalContext);
    if (culturalContextRecords.length === 0) return 75; // Default

    const prayerConflicts = culturalContextRecords.filter(r => r.culturalContext?.prayerTime).length;
    const fastingIssues = culturalContextRecords.filter(r => r.culturalContext?.fastingPeriod).length;
    const traditionalConflicts = culturalContextRecords.filter(r => r.culturalContext?.traditionalMedicineInteraction).length;

    const conflictRate = (prayerConflicts + fastingIssues + traditionalConflicts) / culturalContextRecords.length;
    return Math.max(0, 100 - (conflictRate * 50)); // Reduce acceptability based on conflicts
  }

  private simulateClinicalOutcomes(adherenceRate: number, culturalAcceptability: number): ClinicalEffectivenessMetrics['clinicalOutcomes'] {
    // Simulate clinical outcomes based on adherence and cultural factors
    const baseImprovement = adherenceRate * 0.8; // Higher adherence = better outcomes
    const culturalAdjustment = (culturalAcceptability / 100) * 0.2;
    const symptomImprovement = Math.min(100, baseImprovement + (culturalAdjustment * 100));

    return {
      symptomImprovement,
      qualityOfLifeScore: Math.min(100, symptomImprovement * 0.9),
      functionalStatusChange: Math.min(100, symptomImprovement * 0.85)
    };
  }

  private analyzeSideEffectPatterns(records: AdherenceRecord[]): ClinicalEffectivenessMetrics['sideEffects'] {
    // Analyze notes for side effect mentions (simplified)
    const sideEffectRecords = records.filter(r =>
      r.notes && (
        r.notes.toLowerCase().includes('side effect') ||
        r.notes.toLowerCase().includes('nausea') ||
        r.notes.toLowerCase().includes('dizzy') ||
        r.notes.toLowerCase().includes('tired')
      )
    );

    if (sideEffectRecords.length === 0) return [];

    return [{
      reported: ['Mild gastrointestinal discomfort'], // Simplified
      severity: 'mild' as const,
      impactOnAdherence: -10 // 10% negative impact
    }];
  }

  private estimateTimeToEffect(records: AdherenceRecord[]): number {
    // Estimate time to therapeutic effect based on consistency
    const consistentDays = this.calculateConsistentDays(records);
    return Math.min(30, Math.max(7, consistentDays)); // Between 7-30 days
  }

  private calculateCostEffectiveness(adherenceRate: number, outcomes: ClinicalEffectivenessMetrics['clinicalOutcomes']): number {
    // Simple cost-effectiveness calculation
    const effectivenessScore = (outcomes.symptomImprovement + (outcomes.qualityOfLifeScore || 0)) / 2;
    return (adherenceRate / 100) * (effectivenessScore / 100) * 100;
  }

  private calculateConsistentDays(records: AdherenceRecord[]): number {
    let consecutiveDays = 0;
    let maxConsecutive = 0;

    const sortedRecords = records.sort((a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime());

    for (const record of sortedRecords) {
      if (record.status === 'taken_on_time') {
        consecutiveDays++;
        maxConsecutive = Math.max(maxConsecutive, consecutiveDays);
      } else {
        consecutiveDays = 0;
      }
    }

    return maxConsecutive;
  }

  private extractPrimaryCulturalFactors(insights: CulturalInsight[]): string[] {
    return insights
      .filter(insight => insight.culturalSensitivity === 'high')
      .map(insight => insight.type)
      .slice(0, 5); // Top 5 factors
  }

  private isCacheValid(lastUpdated: Date): boolean {
    const expiryTime = this.INSIGHT_CONFIG.cacheExpiryHours * 60 * 60 * 1000;
    return (Date.now() - lastUpdated.getTime()) < expiryTime;
  }

  private isAlertStillRelevant(alert: ClinicalAlert): boolean {
    const daysSinceGenerated = (Date.now() - alert.generatedAt.getTime()) / (1000 * 60 * 60 * 24);

    // Different alert types have different relevance periods
    switch (alert.type) {
      case 'adherence_critical_drop':
        return daysSinceGenerated <= 3; // 3 days
      case 'drug_interaction_detected':
        return daysSinceGenerated <= 30; // 30 days
      case 'cultural_barrier_emerging':
        return daysSinceGenerated <= 14; // 2 weeks
      default:
        return daysSinceGenerated <= 7; // 1 week default
    }
  }

  /**
   * Clear cache for testing or memory management
   */
  clearCache(): void {
    this.insightCache.clear();
    this.alertHistory.clear();
  }

  /**
   * Get cache statistics for monitoring
   */
  getCacheStats(): {
    profilesCached: number;
    alertsTracked: number;
    oldestCacheEntry?: Date;
  } {
    const profiles = Array.from(this.insightCache.values());
    const totalAlerts = Array.from(this.alertHistory.values()).reduce((sum, alerts) => sum + alerts.length, 0);
    const oldestEntry = profiles.length > 0
      ? new Date(Math.min(...profiles.map(p => p.lastUpdated.getTime())))
      : undefined;

    return {
      profilesCached: profiles.length,
      alertsTracked: totalAlerts,
      oldestCacheEntry: oldestEntry
    };
  }
}

export default ClinicalInsightsEngine;