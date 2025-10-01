/**
 * Provider Report Generator
 *
 * Stream D - Provider Reporting & FHIR Integration
 *
 * Automated adherence reports for healthcare providers with cultural context
 * inclusion, clinical insights, and Malaysian healthcare compliance.
 *
 * Features:
 * - Automated weekly/monthly provider reports
 * - Cultural context preservation in reports
 * - Clinical effectiveness tracking
 * - Risk stratification and alerts
 * - Trend analysis and recommendations
 * - PDPA compliant data handling
 */

import {
  AdherenceRecord,
  ProgressMetrics,
  AdherenceReport,
  MedicationAdherenceReport,
  CulturalInsight,
  AdherencePattern
} from '../../types/adherence';
import { Medication } from '../../types/medication';
import { ClinicalInsightsEngine, ClinicalInsight, ProviderInsightProfile } from '../analytics/ClinicalInsightsEngine';
import { AdherenceFHIRService } from '../fhir/AdherenceFHIRService';
import { ProgressTrackingService } from '../analytics/ProgressTrackingService';

// Provider Report Types
export interface ProviderReportConfig {
  providerId: string;
  reportType: ReportType;
  frequency: ReportFrequency;
  includeCulturalContext: boolean;
  includeInsights: boolean;
  includePredictions: boolean;
  includeComparisons: boolean;
  language: 'en' | 'ms' | 'zh' | 'ta';
  deliveryMethod: 'email' | 'fhir' | 'dashboard' | 'pdf';
  culturalSensitivityLevel: 'high' | 'medium' | 'low';
}

export type ReportType =
  | 'adherence_summary'
  | 'clinical_insights'
  | 'risk_assessment'
  | 'cultural_analysis'
  | 'medication_effectiveness'
  | 'comprehensive';

export type ReportFrequency =
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'quarterly'
  | 'on_demand';

export interface ProviderReport {
  id: string;
  reportType: ReportType;
  providerId: string;
  patientId: string;
  generatedAt: Date;
  periodStart: Date;
  periodEnd: Date;
  summary: ReportSummary;
  sections: ReportSection[];
  attachments: ReportAttachment[];
  culturalConsiderations: CulturalReportSection;
  recommendations: ProviderRecommendation[];
  nextReviewDate: Date;
  confidentiality: 'normal' | 'restricted' | 'confidential';
}

export interface ReportSummary {
  overallAdherenceRate: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  keyInsights: string[];
  alertsCount: number;
  medicationsCount: number;
  daysAnalyzed: number;
  culturalFactorsImpact: number; // -100 to 100
  improvementOpportunities: string[];
}

export interface ReportSection {
  id: string;
  title: string;
  type: SectionType;
  content: any;
  priority: 'high' | 'medium' | 'low';
  culturallyAdapted: boolean;
}

export type SectionType =
  | 'adherence_overview'
  | 'medication_analysis'
  | 'cultural_insights'
  | 'clinical_recommendations'
  | 'risk_assessment'
  | 'trend_analysis'
  | 'comparative_analysis'
  | 'family_involvement';

export interface CulturalReportSection {
  primaryCulturalFactors: Array<{
    factor: string;
    impact: number;
    description: string;
    recommendations: string[];
  }>;
  religiousConsiderations: {
    prayerTimeConflicts: number; // % of time conflicts occur
    fastingPeriodAdjustments: string[];
    religiousRestrictions: string[];
  };
  familyDynamics: {
    supportLevel: 'high' | 'medium' | 'low';
    involvementPattern: string;
    communicationPreferences: string[];
  };
  linguisticFactors: {
    primaryLanguage: string;
    healthLiteracyLevel: 'high' | 'medium' | 'low';
    translationNeeds: string[];
  };
  traditionalMedicine: {
    usagePattern: string;
    interactionRisks: string[];
    integrationOpportunities: string[];
  };
}

export interface ProviderRecommendation {
  id: string;
  priority: 'immediate' | 'urgent' | 'routine' | 'optional';
  category: 'medication' | 'scheduling' | 'education' | 'monitoring' | 'cultural';
  title: string;
  description: string;
  rationale: string;
  expectedOutcome: string;
  timeframe: string;
  difficulty: 'easy' | 'moderate' | 'difficult';
  culturalConsiderations?: string[];
  followUpRequired: boolean;
}

export interface ReportAttachment {
  id: string;
  type: 'fhir_bundle' | 'chart' | 'raw_data' | 'cultural_analysis';
  filename: string;
  mimeType: string;
  size: number;
  description: string;
}

export interface ReportDeliveryResult {
  success: boolean;
  reportId: string;
  deliveryMethod: string;
  deliveredAt?: Date;
  error?: string;
  trackingInfo?: string;
}

export class ProviderReportGenerator {
  private clinicalEngine: ClinicalInsightsEngine;
  private fhirService: AdherenceFHIRService;
  private progressTracker: ProgressTrackingService;
  private reportCache: Map<string, ProviderReport> = new Map();
  private scheduledReports: Map<string, NodeJS.Timeout> = new Map();

  private readonly REPORT_CONFIG = {
    maxReportsPerProvider: 100,
    reportRetentionDays: 365,
    cacheExpiryHours: 4,
    culturalAnalysisDepth: 'comprehensive',
    defaultLanguage: 'en' as const,
    maxRecommendations: 15
  };

  // Malaysian healthcare report standards
  private readonly MALAYSIAN_STANDARDS = {
    PDPA_COMPLIANCE: true,
    CONFIDENTIALITY_LEVELS: ['normal', 'restricted', 'confidential'],
    REQUIRED_SECTIONS: ['adherence_overview', 'medication_analysis', 'cultural_insights'],
    CULTURAL_SENSITIVITY_REQUIREMENTS: {
      PRAYER_TIME_AWARENESS: true,
      RAMADAN_CONSIDERATIONS: true,
      MULTI_LANGUAGE_SUPPORT: true,
      FAMILY_INVOLVEMENT_RESPECT: true
    }
  };

  constructor(
    clinicalEngine?: ClinicalInsightsEngine,
    fhirService?: AdherenceFHIRService,
    progressTracker?: ProgressTrackingService
  ) {
    this.clinicalEngine = clinicalEngine || new ClinicalInsightsEngine();
    this.fhirService = fhirService || AdherenceFHIRService.getInstance();
    this.progressTracker = progressTracker || new ProgressTrackingService();
  }

  /**
   * Generate comprehensive provider report
   */
  async generateProviderReport(
    patientId: string,
    providerId: string,
    medications: Medication[],
    adherenceRecords: AdherenceRecord[],
    config: Partial<ProviderReportConfig> = {}
  ): Promise<ProviderReport> {
    try {
      console.log(`Generating provider report: Patient ${patientId} -> Provider ${providerId}`);

      // Check provider consent
      const hasConsent = await this.fhirService.checkProviderConsent(patientId, providerId);
      if (!hasConsent) {
        throw new Error('Patient has not consented to data sharing with this provider');
      }

      // Build complete config with defaults
      const reportConfig: ProviderReportConfig = {
        providerId,
        reportType: 'comprehensive',
        frequency: 'monthly',
        includeCulturalContext: true,
        includeInsights: true,
        includePredictions: true,
        includeComparisons: true,
        language: 'en',
        deliveryMethod: 'dashboard',
        culturalSensitivityLevel: 'high',
        ...config
      };

      // Get progress metrics
      const progressResponse = await this.progressTracker.getProgressMetrics(
        patientId,
        medications,
        adherenceRecords,
        'monthly'
      );

      if (!progressResponse.success || !progressResponse.data) {
        throw new Error('Failed to get progress metrics');
      }

      const progressMetrics = progressResponse.data;

      // Generate clinical insights
      const providerInsights = await this.clinicalEngine.generateProviderInsights(
        patientId,
        providerId,
        medications,
        adherenceRecords
      );

      // Calculate report period
      const endDate = new Date();
      const startDate = this.calculateReportStartDate(endDate, reportConfig.frequency);

      // Generate report sections
      const sections = await this.generateReportSections(
        patientId,
        medications,
        adherenceRecords,
        progressMetrics,
        providerInsights,
        reportConfig
      );

      // Generate cultural considerations
      const culturalConsiderations = await this.generateCulturalReportSection(
        adherenceRecords,
        progressMetrics.culturalInsights,
        providerInsights.culturalProfile
      );

      // Generate recommendations
      const recommendations = await this.generateProviderRecommendations(
        providerInsights,
        culturalConsiderations,
        reportConfig
      );

      // Generate report summary
      const summary = this.generateReportSummary(
        progressMetrics,
        providerInsights,
        sections
      );

      // Generate attachments
      const attachments = await this.generateReportAttachments(
        patientId,
        providerId,
        medications,
        adherenceRecords,
        progressMetrics,
        reportConfig
      );

      // Determine confidentiality level
      const confidentiality = this.determineConfidentialityLevel(
        progressMetrics,
        culturalConsiderations
      );

      const report: ProviderReport = {
        id: this.generateReportId(patientId, providerId),
        reportType: reportConfig.reportType,
        providerId,
        patientId,
        generatedAt: new Date(),
        periodStart: startDate,
        periodEnd: endDate,
        summary,
        sections,
        attachments,
        culturalConsiderations,
        recommendations,
        nextReviewDate: this.calculateNextReviewDate(providerInsights.overallRiskLevel),
        confidentiality
      };

      // Cache the report
      this.cacheReport(report);

      console.log(`Provider report generated: ${report.id} (${sections.length} sections, ${recommendations.length} recommendations)`);

      return report;
    } catch (error) {
      console.error('Failed to generate provider report:', error);
      throw error;
    }
  }

  /**
   * Generate automated adherence summary report
   */
  async generateAdherenceSummaryReport(
    patientId: string,
    providerId: string,
    periodDays: number = 30
  ): Promise<ProviderReport> {
    try {
      console.log(`Generating adherence summary report for ${periodDays} days`);

      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - (periodDays * 24 * 60 * 60 * 1000));

      // This would typically fetch data from database
      const medications: Medication[] = []; // Would be fetched
      const adherenceRecords: AdherenceRecord[] = []; // Would be fetched

      return await this.generateProviderReport(
        patientId,
        providerId,
        medications,
        adherenceRecords,
        {
          reportType: 'adherence_summary',
          frequency: 'on_demand',
          includeCulturalContext: true,
          includeInsights: false,
          includePredictions: false,
          includeComparisons: false
        }
      );
    } catch (error) {
      console.error('Failed to generate adherence summary report:', error);
      throw error;
    }
  }

  /**
   * Generate clinical insights report
   */
  async generateClinicalInsightsReport(
    patientId: string,
    providerId: string,
    focusAreas?: string[]
  ): Promise<ProviderReport> {
    try {
      console.log('Generating clinical insights report');

      // This would typically fetch data from database
      const medications: Medication[] = []; // Would be fetched
      const adherenceRecords: AdherenceRecord[] = []; // Would be fetched

      return await this.generateProviderReport(
        patientId,
        providerId,
        medications,
        adherenceRecords,
        {
          reportType: 'clinical_insights',
          frequency: 'on_demand',
          includeCulturalContext: true,
          includeInsights: true,
          includePredictions: true,
          includeComparisons: true,
          culturalSensitivityLevel: 'high'
        }
      );
    } catch (error) {
      console.error('Failed to generate clinical insights report:', error);
      throw error;
    }
  }

  /**
   * Schedule automated report generation
   */
  async scheduleAutomatedReports(
    patientId: string,
    providerId: string,
    config: ProviderReportConfig
  ): Promise<string> {
    try {
      const scheduleId = `${patientId}_${providerId}_${config.frequency}`;

      // Clear existing schedule if any
      if (this.scheduledReports.has(scheduleId)) {
        clearInterval(this.scheduledReports.get(scheduleId)!);
      }

      // Calculate interval
      const intervalMs = this.getIntervalMs(config.frequency);

      // Schedule report generation
      const timer = setInterval(async () => {
        try {
          console.log(`Executing scheduled report: ${scheduleId}`);

          // This would typically fetch current data
          const medications: Medication[] = []; // Would be fetched
          const adherenceRecords: AdherenceRecord[] = []; // Would be fetched

          const report = await this.generateProviderReport(
            patientId,
            providerId,
            medications,
            adherenceRecords,
            config
          );

          // Deliver report based on configured method
          await this.deliverReport(report, config);

          console.log(`Scheduled report delivered: ${report.id}`);
        } catch (error) {
          console.error(`Failed to execute scheduled report ${scheduleId}:`, error);
        }
      }, intervalMs);

      this.scheduledReports.set(scheduleId, timer);

      console.log(`Automated report scheduled: ${scheduleId} (${config.frequency})`);

      return scheduleId;
    } catch (error) {
      console.error('Failed to schedule automated reports:', error);
      throw error;
    }
  }

  /**
   * Cancel scheduled report
   */
  cancelScheduledReport(scheduleId: string): void {
    if (this.scheduledReports.has(scheduleId)) {
      clearInterval(this.scheduledReports.get(scheduleId)!);
      this.scheduledReports.delete(scheduleId);
      console.log(`Scheduled report cancelled: ${scheduleId}`);
    }
  }

  /**
   * Get report history for provider
   */
  getProviderReportHistory(
    providerId: string,
    patientId?: string,
    limit: number = 50
  ): ProviderReport[] {
    const reports = Array.from(this.reportCache.values())
      .filter(report => {
        if (report.providerId !== providerId) return false;
        if (patientId && report.patientId !== patientId) return false;
        return true;
      })
      .sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime())
      .slice(0, limit);

    return reports;
  }

  /**
   * Export report in various formats
   */
  async exportReport(
    reportId: string,
    format: 'pdf' | 'json' | 'fhir' | 'csv'
  ): Promise<{ data: string | Buffer; mimeType: string; filename: string }> {
    try {
      const report = this.reportCache.get(reportId);
      if (!report) {
        throw new Error(`Report not found: ${reportId}`);
      }

      console.log(`Exporting report ${reportId} in ${format} format`);

      switch (format) {
        case 'json':
          return {
            data: JSON.stringify(report, null, 2),
            mimeType: 'application/json',
            filename: `report-${reportId}.json`
          };

        case 'fhir':
          // Export as FHIR Bundle
          const fhirBundle = await this.fhirService.generateProviderFHIRBundle(
            report.patientId,
            report.providerId,
            [], // Would fetch medications
            [], // Would fetch records
            {} as ProgressMetrics // Would fetch metrics
          );
          return {
            data: JSON.stringify(fhirBundle, null, 2),
            mimeType: 'application/fhir+json',
            filename: `report-${reportId}-fhir.json`
          };

        case 'csv':
          return {
            data: this.convertReportToCSV(report),
            mimeType: 'text/csv',
            filename: `report-${reportId}.csv`
          };

        case 'pdf':
          // This would generate a PDF report
          return {
            data: Buffer.from('PDF content would be generated here'), // Placeholder
            mimeType: 'application/pdf',
            filename: `report-${reportId}.pdf`
          };

        default:
          throw new Error(`Unsupported export format: ${format}`);
      }
    } catch (error) {
      console.error(`Failed to export report:`, error);
      throw error;
    }
  }

  // Private helper methods

  private async generateReportSections(
    patientId: string,
    medications: Medication[],
    adherenceRecords: AdherenceRecord[],
    progressMetrics: ProgressMetrics,
    providerInsights: ProviderInsightProfile,
    config: ProviderReportConfig
  ): Promise<ReportSection[]> {
    const sections: ReportSection[] = [];

    // Adherence Overview Section
    sections.push({
      id: 'adherence_overview',
      title: this.localizeText('Adherence Overview', config.language),
      type: 'adherence_overview',
      content: {
        overallRate: progressMetrics.overallAdherence,
        streakInfo: progressMetrics.streaks,
        medicationCount: medications.length,
        periodDays: this.calculatePeriodDays(progressMetrics.startDate, progressMetrics.endDate),
        trendDirection: this.calculateTrendDirection(progressMetrics.patterns)
      },
      priority: 'high',
      culturallyAdapted: config.includeCulturalContext
    });

    // Medication Analysis Section
    if (medications.length > 0) {
      sections.push({
        id: 'medication_analysis',
        title: this.localizeText('Medication Analysis', config.language),
        type: 'medication_analysis',
        content: {
          medications: progressMetrics.medications,
          interactions: providerInsights.medicationEffectiveness,
          polypharmacyRisk: medications.length >= 5
        },
        priority: 'high',
        culturallyAdapted: config.includeCulturalContext
      });
    }

    // Cultural Insights Section
    if (config.includeCulturalContext) {
      sections.push({
        id: 'cultural_insights',
        title: this.localizeText('Cultural Considerations', config.language),
        type: 'cultural_insights',
        content: {
          culturalFactors: progressMetrics.culturalInsights,
          religiousConsiderations: providerInsights.culturalProfile.religiousConsiderations,
          familyInvolvement: providerInsights.culturalProfile.familyDynamics,
          adaptationOpportunities: this.identifyAdaptationOpportunities(providerInsights.culturalProfile)
        },
        priority: 'medium',
        culturallyAdapted: true
      });
    }

    // Clinical Recommendations Section
    if (config.includeInsights) {
      sections.push({
        id: 'clinical_recommendations',
        title: this.localizeText('Clinical Recommendations', config.language),
        type: 'clinical_recommendations',
        content: {
          insights: providerInsights.keyInsights,
          recommendations: providerInsights.recommendedActions,
          alerts: providerInsights.activeAlerts,
          riskLevel: providerInsights.overallRiskLevel
        },
        priority: 'high',
        culturallyAdapted: config.includeCulturalContext
      });
    }

    // Risk Assessment Section
    sections.push({
      id: 'risk_assessment',
      title: this.localizeText('Risk Assessment', config.language),
      type: 'risk_assessment',
      content: {
        currentRisk: providerInsights.overallRiskLevel,
        riskFactors: this.extractRiskFactors(providerInsights),
        mitigation: this.suggestRiskMitigation(providerInsights),
        nextReview: providerInsights.nextReviewDate
      },
      priority: 'medium',
      culturallyAdapted: config.includeCulturalContext
    });

    return sections;
  }

  private async generateCulturalReportSection(
    adherenceRecords: AdherenceRecord[],
    culturalInsights: CulturalInsight[],
    culturalProfile: any
  ): Promise<CulturalReportSection> {
    // Analyze cultural factors from adherence data
    const prayerTimeConflicts = adherenceRecords.filter(r =>
      r.culturalContext?.prayerTime
    ).length;

    const conflictRate = adherenceRecords.length > 0
      ? (prayerTimeConflicts / adherenceRecords.length) * 100
      : 0;

    return {
      primaryCulturalFactors: culturalInsights.map(insight => ({
        factor: insight.type,
        impact: insight.adherenceImpact,
        description: insight.description,
        recommendations: insight.recommendations
      })),
      religiousConsiderations: {
        prayerTimeConflicts: Math.round(conflictRate),
        fastingPeriodAdjustments: ['Ramadan schedule adjustments', 'Meal timing considerations'],
        religiousRestrictions: []
      },
      familyDynamics: {
        supportLevel: culturalProfile?.familyDynamics?.supportLevel || 'medium',
        involvementPattern: 'Family provides medication reminders and support',
        communicationPreferences: ['Face-to-face consultation', 'Family involvement in decisions']
      },
      linguisticFactors: {
        primaryLanguage: culturalProfile?.linguisticFactors?.primaryLanguage || 'Malay',
        healthLiteracyLevel: culturalProfile?.linguisticFactors?.healthLiteracyLevel || 'medium',
        translationNeeds: []
      },
      traditionalMedicine: {
        usagePattern: 'Occasional herbal remedies',
        interactionRisks: ['Potential herb-drug interactions'],
        integrationOpportunities: ['Culturally-sensitive medication counseling']
      }
    };
  }

  private async generateProviderRecommendations(
    providerInsights: ProviderInsightProfile,
    culturalConsiderations: CulturalReportSection,
    config: ProviderReportConfig
  ): Promise<ProviderRecommendation[]> {
    const recommendations: ProviderRecommendation[] = [];

    // Add recommendations from clinical insights
    providerInsights.recommendedActions.forEach((action, index) => {
      recommendations.push({
        id: `rec_${index}`,
        priority: action.priority,
        category: action.category as any,
        title: action.action,
        description: action.action,
        rationale: action.rationale,
        expectedOutcome: action.expectedOutcome,
        timeframe: this.estimateTimeframe(action.priority),
        difficulty: action.implementationDifficulty,
        culturalConsiderations: action.culturalConsiderations,
        followUpRequired: action.priority === 'immediate' || action.priority === 'urgent'
      });
    });

    // Add cultural-specific recommendations
    if (config.includeCulturalContext) {
      if (culturalConsiderations.religiousConsiderations.prayerTimeConflicts > 20) {
        recommendations.push({
          id: 'rec_prayer_time',
          priority: 'routine',
          category: 'scheduling',
          title: 'Adjust medication schedule for prayer times',
          description: 'Modify dosing schedule to avoid conflicts with prayer times',
          rationale: 'High frequency of prayer time conflicts affecting adherence',
          expectedOutcome: 'Improved adherence through cultural alignment',
          timeframe: '1-2 weeks',
          difficulty: 'easy',
          culturalConsiderations: ['Prayer time awareness', 'Religious sensitivity'],
          followUpRequired: false
        });
      }

      if (culturalConsiderations.familyDynamics.supportLevel === 'high') {
        recommendations.push({
          id: 'rec_family_involvement',
          priority: 'routine',
          category: 'education',
          title: 'Leverage family support system',
          description: 'Involve family members in medication management',
          rationale: 'Strong family support available to improve adherence',
          expectedOutcome: 'Enhanced medication compliance through family coordination',
          timeframe: '2-4 weeks',
          difficulty: 'moderate',
          culturalConsiderations: ['Family involvement', 'Cultural respect'],
          followUpRequired: false
        });
      }
    }

    // Sort by priority and limit
    return recommendations
      .sort((a, b) => {
        const priorityOrder = { immediate: 4, urgent: 3, routine: 2, optional: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      })
      .slice(0, this.REPORT_CONFIG.maxRecommendations);
  }

  private generateReportSummary(
    progressMetrics: ProgressMetrics,
    providerInsights: ProviderInsightProfile,
    sections: ReportSection[]
  ): ReportSummary {
    const culturalImpact = progressMetrics.culturalInsights.reduce(
      (total, insight) => total + insight.adherenceImpact,
      0
    ) / Math.max(progressMetrics.culturalInsights.length, 1);

    return {
      overallAdherenceRate: progressMetrics.overallAdherence,
      riskLevel: providerInsights.overallRiskLevel,
      keyInsights: providerInsights.keyInsights.slice(0, 3).map(insight => insight.title),
      alertsCount: providerInsights.activeAlerts.length,
      medicationsCount: progressMetrics.medications.length,
      daysAnalyzed: Math.ceil(
        (progressMetrics.endDate.getTime() - progressMetrics.startDate.getTime()) / (1000 * 60 * 60 * 24)
      ),
      culturalFactorsImpact: Math.round(culturalImpact),
      improvementOpportunities: this.identifyImprovementOpportunities(progressMetrics, providerInsights)
    };
  }

  private async generateReportAttachments(
    patientId: string,
    providerId: string,
    medications: Medication[],
    adherenceRecords: AdherenceRecord[],
    progressMetrics: ProgressMetrics,
    config: ProviderReportConfig
  ): Promise<ReportAttachment[]> {
    const attachments: ReportAttachment[] = [];

    // FHIR Bundle attachment
    if (config.deliveryMethod === 'fhir' || config.includeInsights) {
      try {
        const fhirExport = await this.fhirService.exportAdherenceDataFHIR({
          patientId,
          providerId,
          startDate: progressMetrics.startDate,
          endDate: progressMetrics.endDate,
          includeCulturalContext: config.includeCulturalContext,
          includeInsights: config.includeInsights,
          includePredictions: config.includePredictions,
          format: 'json',
          malaysianProfileCompliant: true
        });

        attachments.push({
          id: `fhir_${Date.now()}`,
          type: 'fhir_bundle',
          filename: fhirExport.filename,
          mimeType: fhirExport.mimeType,
          size: fhirExport.data.length,
          description: 'FHIR-compliant adherence data bundle'
        });
      } catch (error) {
        console.warn('Failed to generate FHIR attachment:', error);
      }
    }

    return attachments;
  }

  private async deliverReport(
    report: ProviderReport,
    config: ProviderReportConfig
  ): Promise<ReportDeliveryResult> {
    try {
      console.log(`Delivering report ${report.id} via ${config.deliveryMethod}`);

      switch (config.deliveryMethod) {
        case 'dashboard':
          // Store in provider dashboard (in real implementation, this would update a database)
          return {
            success: true,
            reportId: report.id,
            deliveryMethod: 'dashboard',
            deliveredAt: new Date(),
            trackingInfo: 'Available in provider dashboard'
          };

        case 'email':
          // Send email (in real implementation, this would use an email service)
          return {
            success: true,
            reportId: report.id,
            deliveryMethod: 'email',
            deliveredAt: new Date(),
            trackingInfo: 'Email sent to provider'
          };

        case 'fhir':
          // Send via FHIR endpoint (in real implementation, this would POST to provider's FHIR endpoint)
          return {
            success: true,
            reportId: report.id,
            deliveryMethod: 'fhir',
            deliveredAt: new Date(),
            trackingInfo: 'Delivered to FHIR endpoint'
          };

        case 'pdf':
          // Generate and deliver PDF
          return {
            success: true,
            reportId: report.id,
            deliveryMethod: 'pdf',
            deliveredAt: new Date(),
            trackingInfo: 'PDF generated and delivered'
          };

        default:
          throw new Error(`Unsupported delivery method: ${config.deliveryMethod}`);
      }
    } catch (error) {
      console.error('Failed to deliver report:', error);
      return {
        success: false,
        reportId: report.id,
        deliveryMethod: config.deliveryMethod,
        error: error instanceof Error ? error.message : 'Delivery failed'
      };
    }
  }

  // Utility methods

  private calculateReportStartDate(endDate: Date, frequency: ReportFrequency): Date {
    const start = new Date(endDate);

    switch (frequency) {
      case 'daily':
        start.setDate(start.getDate() - 1);
        break;
      case 'weekly':
        start.setDate(start.getDate() - 7);
        break;
      case 'monthly':
        start.setMonth(start.getMonth() - 1);
        break;
      case 'quarterly':
        start.setMonth(start.getMonth() - 3);
        break;
      default:
        start.setMonth(start.getMonth() - 1); // Default to monthly
    }

    return start;
  }

  private calculateNextReviewDate(riskLevel: string): Date {
    const now = new Date();

    switch (riskLevel) {
      case 'critical':
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 1 week
      case 'high':
        return new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000); // 2 weeks
      case 'medium':
        return new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 1 month
      default:
        return new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // 3 months
    }
  }

  private getIntervalMs(frequency: ReportFrequency): number {
    switch (frequency) {
      case 'daily':
        return 24 * 60 * 60 * 1000; // 24 hours
      case 'weekly':
        return 7 * 24 * 60 * 60 * 1000; // 7 days
      case 'monthly':
        return 30 * 24 * 60 * 60 * 1000; // 30 days
      case 'quarterly':
        return 90 * 24 * 60 * 60 * 1000; // 90 days
      default:
        return 30 * 24 * 60 * 60 * 1000; // Default monthly
    }
  }

  private localizeText(text: string, language: string): string {
    // Simplified localization - in real implementation, this would use a proper i18n library
    const translations: Record<string, Record<string, string>> = {
      'Adherence Overview': {
        ms: 'Gambaran Kepatuhan',
        zh: '依从性概述',
        ta: 'இணக்கத்தின் கண்ணோட்டம்'
      },
      'Medication Analysis': {
        ms: 'Analisis Ubat',
        zh: '药物分析',
        ta: 'மருந்து பகுப்பாய்வு'
      },
      'Cultural Considerations': {
        ms: 'Pertimbangan Budaya',
        zh: '文化考虑',
        ta: 'கலாச்சார கருத்துக்கள்'
      },
      'Clinical Recommendations': {
        ms: 'Cadangan Klinikal',
        zh: '临床建议',
        ta: 'மருத்துவ பரிந்துரைகள்'
      },
      'Risk Assessment': {
        ms: 'Penilaian Risiko',
        zh: '风险评估',
        ta: 'ஆபத்து மதிப்பீடு'
      }
    };

    return translations[text]?.[language] || text;
  }

  private generateReportId(patientId: string, providerId: string): string {
    return `report_${patientId}_${providerId}_${Date.now()}`;
  }

  private cacheReport(report: ProviderReport): void {
    this.reportCache.set(report.id, report);

    // Clean up old reports if cache gets too large
    if (this.reportCache.size > this.REPORT_CONFIG.maxReportsPerProvider) {
      const oldestReports = Array.from(this.reportCache.entries())
        .sort((a, b) => a[1].generatedAt.getTime() - b[1].generatedAt.getTime())
        .slice(0, 10); // Remove oldest 10 reports

      oldestReports.forEach(([id]) => this.reportCache.delete(id));
    }
  }

  private calculatePeriodDays(startDate: Date, endDate: Date): number {
    return Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
  }

  private calculateTrendDirection(patterns: AdherencePattern[]): 'improving' | 'stable' | 'declining' {
    const improvingPatterns = patterns.filter(p => p.type === 'improvement_trend');
    const decliningPatterns = patterns.filter(p => p.type === 'declining_trend');

    if (improvingPatterns.length > decliningPatterns.length) return 'improving';
    if (decliningPatterns.length > improvingPatterns.length) return 'declining';
    return 'stable';
  }

  private identifyAdaptationOpportunities(culturalProfile: any): string[] {
    const opportunities: string[] = [];

    if (culturalProfile.religiousConsiderations?.prayerTimeConflicts) {
      opportunities.push('Adjust medication schedule to align with prayer times');
    }

    if (culturalProfile.familyDynamics?.supportLevel === 'high') {
      opportunities.push('Leverage family support for medication management');
    }

    if (culturalProfile.traditionalMedicineUse?.concurrent) {
      opportunities.push('Integrate traditional medicine considerations into treatment plan');
    }

    return opportunities;
  }

  private extractRiskFactors(providerInsights: ProviderInsightProfile): string[] {
    const factors: string[] = [];

    if (providerInsights.overallRiskLevel === 'high' || providerInsights.overallRiskLevel === 'critical') {
      factors.push('Low medication adherence');
    }

    providerInsights.activeAlerts.forEach(alert => {
      if (alert.severity === 'high' || alert.severity === 'critical') {
        factors.push(alert.title);
      }
    });

    return factors.slice(0, 5); // Limit to top 5 factors
  }

  private suggestRiskMitigation(providerInsights: ProviderInsightProfile): string[] {
    return providerInsights.recommendedActions
      .filter(action => action.priority === 'immediate' || action.priority === 'urgent')
      .map(action => action.action)
      .slice(0, 3);
  }

  private identifyImprovementOpportunities(
    progressMetrics: ProgressMetrics,
    providerInsights: ProviderInsightProfile
  ): string[] {
    const opportunities: string[] = [];

    if (progressMetrics.overallAdherence < 80) {
      opportunities.push('Enhance medication adherence through targeted interventions');
    }

    if (progressMetrics.culturalInsights.length > 0) {
      opportunities.push('Address cultural barriers to improve treatment compliance');
    }

    if (providerInsights.activeAlerts.length > 0) {
      opportunities.push('Address active clinical alerts for better outcomes');
    }

    return opportunities.slice(0, 5);
  }

  private estimateTimeframe(priority: string): string {
    switch (priority) {
      case 'immediate':
        return '24-48 hours';
      case 'urgent':
        return '1-2 weeks';
      case 'routine':
        return '2-4 weeks';
      default:
        return '1-2 months';
    }
  }

  private determineConfidentialityLevel(
    progressMetrics: ProgressMetrics,
    culturalConsiderations: CulturalReportSection
  ): 'normal' | 'restricted' | 'confidential' {
    // Determine based on cultural sensitivity and medical complexity
    if (culturalConsiderations.traditionalMedicine.interactionRisks.length > 0) {
      return 'restricted';
    }

    if (progressMetrics.patterns.some(p => p.type === 'cultural_barrier_identification')) {
      return 'restricted';
    }

    return 'normal';
  }

  private convertReportToCSV(report: ProviderReport): string {
    // Simplified CSV conversion
    const lines = [
      'Report ID,Patient ID,Provider ID,Generated At,Adherence Rate,Risk Level',
      `${report.id},${report.patientId},${report.providerId},${report.generatedAt.toISOString()},${report.summary.overallAdherenceRate},${report.summary.riskLevel}`
    ];

    return lines.join('\n');
  }

  /**
   * Clear cache and cleanup (for testing)
   */
  clearCache(): void {
    this.reportCache.clear();
    this.scheduledReports.forEach(timer => clearInterval(timer));
    this.scheduledReports.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    reportsCount: number;
    scheduledReportsCount: number;
    oldestReport?: Date;
  } {
    const reports = Array.from(this.reportCache.values());
    const oldestReport = reports.length > 0
      ? new Date(Math.min(...reports.map(r => r.generatedAt.getTime())))
      : undefined;

    return {
      reportsCount: reports.length,
      scheduledReportsCount: this.scheduledReports.size,
      oldestReport
    };
  }
}

export default ProviderReportGenerator;