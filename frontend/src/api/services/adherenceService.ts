/**
 * Adherence Data Service
 *
 * Integrates with existing backend infrastructure for comprehensive
 * adherence tracking, progress metrics, and cultural intelligence.
 */

import { apiClient } from '../client';
import { API_ENDPOINTS } from '../endpoints';
import type { ApiResponse } from '../types';
import type {
  AdherenceRecord,
  ProgressMetrics,
  AdherencePattern,
  AdherencePrediction,
  AdherenceMilestone,
  AdherenceReport,
  StreakData,
  CulturalInsight,
  AdherenceState,
  AdherenceBatchUpdate
} from '../../types/adherence';

export interface AdherenceQueryParams {
  patientId: string;
  startDate?: Date;
  endDate?: Date;
  medicationIds?: string[];
  includePatterns?: boolean;
  includePredictions?: boolean;
  culturalContext?: boolean;
}

export interface AdherenceUpdateParams {
  medicationId: string;
  scheduledTime: Date;
  takenTime?: Date;
  status: string;
  method?: string;
  notes?: string;
  culturalContext?: any;
}

export interface MilestoneCheckParams {
  patientId: string;
  medicationId?: string;
  checkTypes?: string[];
}

export class AdherenceService {
  /**
   * Record medication adherence event
   */
  async recordAdherence(
    patientId: string,
    adherenceData: AdherenceUpdateParams
  ): Promise<ApiResponse<AdherenceRecord>> {
    const endpoint = API_ENDPOINTS.ADHERENCE.RECORD(patientId);

    const payload = {
      ...adherenceData,
      patientId,
      recordedAt: new Date().toISOString(),
    };

    return apiClient.request<AdherenceRecord>(endpoint, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Get comprehensive progress metrics
   */
  async getProgressMetrics(
    patientId: string,
    period: string = 'monthly',
    options: {
      includeCultural?: boolean;
      includePatterns?: boolean;
      includePredictions?: boolean;
    } = {}
  ): Promise<ApiResponse<ProgressMetrics>> {
    const params = new URLSearchParams({
      period,
      includeCultural: String(options.includeCultural ?? true),
      includePatterns: String(options.includePatterns ?? true),
      includePredictions: String(options.includePredictions ?? true),
    });

    const endpoint = `${API_ENDPOINTS.ADHERENCE.PROGRESS(patientId)}?${params}`;

    return apiClient.request<ProgressMetrics>(endpoint, {
      cacheKey: `adherence_progress_${patientId}_${period}`,
      cacheTTL: 300000, // 5 minutes
    });
  }

  /**
   * Get adherence analytics with pattern recognition
   */
  async getAdherenceAnalytics(
    params: AdherenceQueryParams
  ): Promise<ApiResponse<{
    metrics: ProgressMetrics;
    patterns: AdherencePattern[];
    predictions: AdherencePrediction[];
    insights: CulturalInsight[];
  }>> {
    const queryParams = new URLSearchParams({
      startDate: params.startDate?.toISOString() || '',
      endDate: params.endDate?.toISOString() || '',
      includePatterns: String(params.includePatterns ?? true),
      includePredictions: String(params.includePredictions ?? true),
      culturalContext: String(params.culturalContext ?? true),
    });

    if (params.medicationIds?.length) {
      queryParams.append('medicationIds', params.medicationIds.join(','));
    }

    const endpoint = `${API_ENDPOINTS.ADHERENCE.ANALYTICS(params.patientId)}?${queryParams}`;

    return apiClient.request(endpoint, {
      cacheKey: `adherence_analytics_${params.patientId}_${params.startDate}_${params.endDate}`,
      cacheTTL: 600000, // 10 minutes
    });
  }

  /**
   * Get adherence records for a time period
   */
  async getAdherenceRecords(
    patientId: string,
    startDate: Date,
    endDate: Date,
    medicationId?: string
  ): Promise<ApiResponse<AdherenceRecord[]>> {
    const params = new URLSearchParams({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });

    if (medicationId) {
      params.append('medicationId', medicationId);
    }

    const endpoint = `${API_ENDPOINTS.ADHERENCE.RECORDS(patientId)}?${params}`;

    return apiClient.request<AdherenceRecord[]>(endpoint, {
      cacheKey: `adherence_records_${patientId}_${startDate.getTime()}_${endDate.getTime()}_${medicationId || 'all'}`,
      cacheTTL: 300000, // 5 minutes
    });
  }

  /**
   * Calculate and update streaks
   */
  async calculateStreaks(patientId: string): Promise<ApiResponse<StreakData>> {
    const endpoint = API_ENDPOINTS.ADHERENCE.STREAKS(patientId);

    return apiClient.request<StreakData>(endpoint, {
      method: 'POST',
      cacheKey: `adherence_streaks_${patientId}`,
      cacheTTL: 300000, // 5 minutes
    });
  }

  /**
   * Check for new milestones
   */
  async checkMilestones(params: MilestoneCheckParams): Promise<ApiResponse<{
    newMilestones: AdherenceMilestone[];
    updatedMilestones: AdherenceMilestone[];
    totalMilestones: number;
  }>> {
    const queryParams = new URLSearchParams();

    if (params.medicationId) {
      queryParams.append('medicationId', params.medicationId);
    }

    if (params.checkTypes?.length) {
      queryParams.append('checkTypes', params.checkTypes.join(','));
    }

    const endpoint = `${API_ENDPOINTS.ADHERENCE.MILESTONES(params.patientId)}?${queryParams}`;

    return apiClient.request(endpoint, {
      method: 'POST',
    });
  }

  /**
   * Get patient milestones
   */
  async getMilestones(patientId: string): Promise<ApiResponse<AdherenceMilestone[]>> {
    const endpoint = API_ENDPOINTS.ADHERENCE.MILESTONES(patientId);

    return apiClient.request<AdherenceMilestone[]>(endpoint, {
      cacheKey: `adherence_milestones_${patientId}`,
      cacheTTL: 600000, // 10 minutes
    });
  }

  /**
   * Mark milestone celebration as shown
   */
  async markMilestoneCelebrated(
    patientId: string,
    milestoneId: string
  ): Promise<ApiResponse<AdherenceMilestone>> {
    const endpoint = `${API_ENDPOINTS.ADHERENCE.MILESTONES(patientId)}/${milestoneId}/celebrated`;

    return apiClient.request<AdherenceMilestone>(endpoint, {
      method: 'PATCH',
    });
  }

  /**
   * Generate adherence report for provider
   */
  async generateReport(
    patientId: string,
    periodStart: Date,
    periodEnd: Date,
    includeRecommendations: boolean = true
  ): Promise<ApiResponse<AdherenceReport>> {
    const endpoint = API_ENDPOINTS.ADHERENCE.REPORTS(patientId);

    const payload = {
      periodStart: periodStart.toISOString(),
      periodEnd: periodEnd.toISOString(),
      includeRecommendations,
      includeCulturalContext: true,
    };

    return apiClient.request<AdherenceReport>(endpoint, {
      method: 'POST',
      body: JSON.stringify(payload),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Get existing reports
   */
  async getReports(
    patientId: string,
    limit: number = 10
  ): Promise<ApiResponse<AdherenceReport[]>> {
    const params = new URLSearchParams({
      limit: String(limit),
    });

    const endpoint = `${API_ENDPOINTS.ADHERENCE.REPORTS(patientId)}?${params}`;

    return apiClient.request<AdherenceReport[]>(endpoint, {
      cacheKey: `adherence_reports_${patientId}_${limit}`,
      cacheTTL: 600000, // 10 minutes
    });
  }

  /**
   * Batch update adherence records (for sync)
   */
  async batchUpdateRecords(
    patientId: string,
    updates: AdherenceBatchUpdate
  ): Promise<ApiResponse<{
    updated: number;
    created: number;
    errors: any[];
  }>> {
    const endpoint = `${API_ENDPOINTS.ADHERENCE.BATCH_UPDATE(patientId)}`;

    return apiClient.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(updates),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Get cultural insights for adherence
   */
  async getCulturalInsights(
    patientId: string,
    timeframe: string = 'monthly'
  ): Promise<ApiResponse<{
    insights: CulturalInsight[];
    recommendations: string[];
    culturalScore: number;
  }>> {
    const params = new URLSearchParams({
      timeframe,
    });

    const endpoint = `${API_ENDPOINTS.ADHERENCE.CULTURAL_INSIGHTS(patientId)}?${params}`;

    return apiClient.request(endpoint, {
      cacheKey: `adherence_cultural_${patientId}_${timeframe}`,
      cacheTTL: 3600000, // 1 hour
    });
  }

  /**
   * Get adherence predictions
   */
  async getAdherencePredictions(
    patientId: string,
    medicationId?: string,
    timeframe: string = 'next_week'
  ): Promise<ApiResponse<AdherencePrediction[]>> {
    const params = new URLSearchParams({
      timeframe,
    });

    if (medicationId) {
      params.append('medicationId', medicationId);
    }

    const endpoint = `${API_ENDPOINTS.ADHERENCE.PREDICTIONS(patientId)}?${params}`;

    return apiClient.request<AdherencePrediction[]>(endpoint, {
      cacheKey: `adherence_predictions_${patientId}_${medicationId || 'all'}_${timeframe}`,
      cacheTTL: 1800000, // 30 minutes
    });
  }

  /**
   * Get family adherence metrics
   */
  async getFamilyMetrics(familyId: string): Promise<ApiResponse<{
    overallAdherence: number;
    memberMetrics: Array<{
      patientId: string;
      name: string;
      adherenceRate: number;
      currentStreak: number;
      riskLevel: string;
    }>;
    familyPatterns: AdherencePattern[];
    supportOpportunities: string[];
  }>> {
    const endpoint = API_ENDPOINTS.ADHERENCE.FAMILY_METRICS(familyId);

    return apiClient.request(endpoint, {
      cacheKey: `adherence_family_${familyId}`,
      cacheTTL: 600000, // 10 minutes
    });
  }

  /**
   * Export adherence data
   */
  async exportAdherenceData(
    patientId: string,
    format: 'pdf' | 'csv' | 'json',
    startDate: Date,
    endDate: Date
  ): Promise<ApiResponse<{
    downloadUrl: string;
    filename: string;
    expiresAt: Date;
  }>> {
    const params = new URLSearchParams({
      format,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });

    const endpoint = `${API_ENDPOINTS.ADHERENCE.EXPORT(patientId)}?${params}`;

    return apiClient.request(endpoint, {
      method: 'POST',
    });
  }

  /**
   * Real-time adherence status
   */
  async getRealtimeStatus(patientId: string): Promise<ApiResponse<{
    currentStatus: string;
    upcomingDoses: Array<{
      medicationId: string;
      medicationName: string;
      scheduledTime: Date;
      timeUntilDue: number;
      priority: string;
    }>;
    todaysProgress: {
      completed: number;
      total: number;
      adherenceRate: number;
    };
    alerts: Array<{
      type: string;
      message: string;
      severity: string;
      actionRequired: boolean;
    }>;
  }>> {
    const endpoint = API_ENDPOINTS.ADHERENCE.REALTIME(patientId);

    return apiClient.request(endpoint, {
      // Short cache for real-time data
      cacheKey: `adherence_realtime_${patientId}`,
      cacheTTL: 60000, // 1 minute
    });
  }

  /**
   * Update adherence preferences
   */
  async updatePreferences(
    patientId: string,
    preferences: {
      enableCulturalAnalysis?: boolean;
      enableFamilySharing?: boolean;
      enablePredictiveAlerts?: boolean;
      culturalSensitivityLevel?: 'high' | 'medium' | 'low';
      notificationPreferences?: {
        milestones: boolean;
        weeklyReports: boolean;
        riskAlerts: boolean;
      };
    }
  ): Promise<ApiResponse<any>> {
    const endpoint = API_ENDPOINTS.ADHERENCE.PREFERENCES(patientId);

    return apiClient.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(preferences),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Get comprehensive adherence state for patient
   */
  async getAdherenceState(patientId: string): Promise<ApiResponse<AdherenceState>> {
    const endpoint = API_ENDPOINTS.ADHERENCE.STATE(patientId);

    return apiClient.request<AdherenceState>(endpoint, {
      cacheKey: `adherence_state_${patientId}`,
      cacheTTL: 300000, // 5 minutes
    });
  }

  /**
   * Sync adherence data from offline storage
   */
  async syncOfflineData(
    patientId: string,
    offlineRecords: Partial<AdherenceRecord>[]
  ): Promise<ApiResponse<{
    synced: number;
    conflicts: any[];
    errors: any[];
  }>> {
    const endpoint = API_ENDPOINTS.ADHERENCE.SYNC(patientId);

    return apiClient.request(endpoint, {
      method: 'POST',
      body: JSON.stringify({
        records: offlineRecords,
        syncTimestamp: new Date().toISOString(),
        source: 'mobile_app',
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }
}

export const adherenceService = new AdherenceService();