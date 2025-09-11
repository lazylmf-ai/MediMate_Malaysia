/**
 * Health & System Information Service
 * 
 * Provides access to system health checks and Malaysian healthcare context
 */

import { apiClient } from '../client';
import { API_ENDPOINTS } from '../endpoints';
import type { ApiResponse, HealthStatus, MalaysianContext } from '../types';

export class HealthService {
  /**
   * Get system health status
   */
  async getHealthStatus(): Promise<ApiResponse<HealthStatus>> {
    return apiClient.request<HealthStatus>(API_ENDPOINTS.HEALTH.CHECK, {
      skipAuth: true,
      cacheKey: 'health_status',
      cacheTTL: 30000, // 30 seconds cache
    });
  }

  /**
   * Get Malaysian healthcare context
   */
  async getMalaysianContext(): Promise<ApiResponse<MalaysianContext>> {
    return apiClient.request<MalaysianContext>(API_ENDPOINTS.HEALTH.CONTEXT, {
      skipAuth: true,
      cacheKey: 'malaysian_context',
      cacheTTL: 3600000, // 1 hour cache
    });
  }

  /**
   * Check if system is healthy
   */
  async isSystemHealthy(): Promise<boolean> {
    try {
      const response = await this.getHealthStatus();
      return response.success && response.data?.status === 'healthy';
    } catch {
      return false;
    }
  }

  /**
   * Get supported Malaysian states
   */
  async getSupportedStates(): Promise<ApiResponse<Array<{ code: string; name: string; name_ms: string }>>> {
    const contextResponse = await this.getMalaysianContext();
    if (contextResponse.success && contextResponse.data?.supported_states) {
      return {
        success: true,
        data: contextResponse.data.supported_states,
      };
    }
    return {
      success: false,
      error: 'Unable to fetch supported states',
    };
  }

  /**
   * Check if cultural features are available
   */
  async getCulturalFeatures(): Promise<ApiResponse<{
    prayer_times: boolean;
    halal_validation: boolean;
    multi_language: boolean;
    cultural_calendar: boolean;
  }>> {
    const contextResponse = await this.getMalaysianContext();
    if (contextResponse.success && contextResponse.data?.cultural_features) {
      return {
        success: true,
        data: contextResponse.data.cultural_features,
      };
    }
    return {
      success: false,
      error: 'Unable to fetch cultural features status',
    };
  }
}

export const healthService = new HealthService();