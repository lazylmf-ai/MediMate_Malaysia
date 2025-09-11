/**
 * Developer Portal Service
 * 
 * Provides API key management, sandbox environment, and developer tools
 * for Malaysian healthcare integration
 */

import { apiClient } from '../client';
import { API_ENDPOINTS } from '../endpoints';
import type { 
  ApiResponse, 
  ApiKeyRequest, 
  ApiKeyResponse, 
  SandboxDataRequest, 
  SandboxDataResponse 
} from '../types';

export class DeveloperService {
  /**
   * Get list of API keys for the authenticated developer
   */
  async getApiKeys(): Promise<ApiResponse<ApiKeyResponse[]>> {
    return apiClient.request<ApiKeyResponse[]>(
      API_ENDPOINTS.DEVELOPER.API_KEYS_LIST,
      {
        cacheKey: 'developer_api_keys',
        cacheTTL: 300000, // 5 minutes cache
      }
    );
  }

  /**
   * Get specific API key details
   */
  async getApiKeyById(keyId: string): Promise<ApiResponse<ApiKeyResponse>> {
    return apiClient.request<ApiKeyResponse>(
      API_ENDPOINTS.DEVELOPER.API_KEY_GET(keyId),
      {
        cacheKey: `api_key_${keyId}`,
        cacheTTL: 300000, // 5 minutes cache
      }
    );
  }

  /**
   * Create new API key with Malaysian cultural features
   */
  async createApiKey(keyData: ApiKeyRequest): Promise<ApiResponse<ApiKeyResponse>> {
    // Validate API key request
    const validation = this.validateApiKeyRequest(keyData);
    if (!validation.isValid) {
      return {
        success: false,
        error: validation.errors.join(', '),
      };
    }

    return apiClient.request<ApiKeyResponse>(
      API_ENDPOINTS.DEVELOPER.API_KEYS_CREATE,
      {
        method: 'POST',
        body: JSON.stringify(keyData),
      }
    );
  }

  /**
   * Delete API key
   */
  async deleteApiKey(keyId: string): Promise<ApiResponse<{ message: string }>> {
    // Clear cache after deletion
    apiClient.clearCache(`api_key_${keyId}`);
    apiClient.clearCache('developer_api_keys');
    
    return apiClient.request<{ message: string }>(
      API_ENDPOINTS.DEVELOPER.API_KEY_DELETE(keyId),
      {
        method: 'DELETE',
      }
    );
  }

  /**
   * Generate sandbox test data for Malaysian healthcare scenarios
   */
  async generateSandboxData(request: SandboxDataRequest): Promise<ApiResponse<SandboxDataResponse>> {
    // Validate sandbox data request
    if (request.count < 1 || request.count > 100) {
      return {
        success: false,
        error: 'Count must be between 1 and 100',
      };
    }

    return apiClient.request<SandboxDataResponse>(
      API_ENDPOINTS.DEVELOPER.SANDBOX_GENERATE_DATA,
      {
        method: 'POST',
        body: JSON.stringify(request),
      }
    );
  }

  /**
   * Generate Malaysian patient test data
   */
  async generateMalaysianPatients(
    count: number = 10,
    options?: {
      includeRaces?: string[];
      includeReligions?: string[];
      states?: string[];
      languages?: string[];
    }
  ): Promise<ApiResponse<SandboxDataResponse>> {
    const request: SandboxDataRequest = {
      data_type: 'patients',
      count,
      malaysian_profiles: {
        include_races: options?.includeRaces || ['Malay', 'Chinese', 'Indian', 'Other'],
        include_religions: options?.includeReligions || ['Islam', 'Buddhism', 'Christianity', 'Hinduism'],
        states: options?.states || ['KUL', 'SGR', 'JHR', 'PNG', 'PRK'],
        languages: options?.languages || ['ms', 'en', 'zh', 'ta'],
      },
      cultural_considerations: {
        include_prayer_times: true,
        include_halal_preferences: true,
        include_cultural_events: true,
      },
    };

    return this.generateSandboxData(request);
  }

  /**
   * Generate appointment test data with cultural considerations
   */
  async generateCulturalAppointments(
    count: number = 20,
    options?: {
      includeRamadanConsiderations?: boolean;
      includePrayerTimeAvoidance?: boolean;
      multiLanguagePreferences?: boolean;
    }
  ): Promise<ApiResponse<SandboxDataResponse>> {
    const request: SandboxDataRequest = {
      data_type: 'appointments',
      count,
      cultural_considerations: {
        include_prayer_times: options?.includePrayerTimeAvoidance || true,
        include_halal_preferences: false, // Not relevant for appointments
        include_cultural_events: options?.includeRamadanConsiderations || true,
      },
    };

    return this.generateSandboxData(request);
  }

  /**
   * Generate medication test data with halal validation
   */
  async generateHalalMedications(
    count: number = 50,
    options?: {
      halalOnly?: boolean;
      includeAlternatives?: boolean;
      categories?: string[];
    }
  ): Promise<ApiResponse<SandboxDataResponse>> {
    const request: SandboxDataRequest = {
      data_type: 'medications',
      count,
      cultural_considerations: {
        include_prayer_times: false,
        include_halal_preferences: true,
        include_cultural_events: false,
      },
    };

    return this.generateSandboxData(request);
  }

  /**
   * Validate API key request
   */
  private validateApiKeyRequest(keyData: ApiKeyRequest): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate required fields
    if (!keyData.name || keyData.name.trim().length === 0) {
      errors.push('API key name is required');
    }

    if (!keyData.permissions || keyData.permissions.length === 0) {
      errors.push('At least one permission is required');
    }

    if (!keyData.environment) {
      errors.push('Environment is required');
    }

    // Validate environment
    const validEnvironments = ['development', 'staging', 'production'];
    if (keyData.environment && !validEnvironments.includes(keyData.environment)) {
      errors.push('Invalid environment. Must be: development, staging, or production');
    }

    // Validate permissions
    const validPermissions = [
      'read_patients', 'write_patients',
      'read_appointments', 'write_appointments',
      'read_medications', 'write_medications',
      'cultural_services', 'prayer_times', 'halal_validation',
      'translation_access', 'fhir_access'
    ];

    keyData.permissions?.forEach(permission => {
      if (!validPermissions.includes(permission)) {
        warnings.push(`Unknown permission: ${permission}`);
      }
    });

    // Validate cultural features
    if (keyData.cultural_features) {
      if (keyData.cultural_features.prayer_time_access && 
          !keyData.permissions?.includes('prayer_times')) {
        warnings.push('Prayer time access enabled but prayer_times permission not requested');
      }

      if (keyData.cultural_features.halal_validation_access && 
          !keyData.permissions?.includes('halal_validation')) {
        warnings.push('Halal validation access enabled but halal_validation permission not requested');
      }

      if (keyData.cultural_features.translation_access && 
          !keyData.permissions?.includes('translation_access')) {
        warnings.push('Translation access enabled but translation_access permission not requested');
      }
    }

    // Production environment validations
    if (keyData.environment === 'production') {
      if (!keyData.malaysian_compliance?.pdpa_compliant) {
        errors.push('PDPA compliance is required for production environment');
      }

      if (!keyData.malaysian_compliance?.audit_trail) {
        warnings.push('Audit trail is recommended for production environment');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get API key usage statistics
   */
  async getApiKeyUsageStats(keyId: string, period?: {
    start: string;
    end: string;
  }): Promise<ApiResponse<{
    keyId: string;
    period: { start: string; end: string };
    totalRequests: number;
    requestsByEndpoint: Record<string, number>;
    requestsByDay: Array<{ date: string; count: number }>;
    errorRate: number;
    averageResponseTime: number;
    culturalFeatureUsage: {
      prayerTimeRequests: number;
      halalValidationRequests: number;
      translationRequests: number;
    };
    quotaUsage: {
      used: number;
      limit: number;
      percentage: number;
    };
  }>> {
    // In a real implementation, this would call a usage statistics endpoint
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    return {
      success: true,
      data: {
        keyId,
        period: {
          start: period?.start || thirtyDaysAgo.toISOString(),
          end: period?.end || now.toISOString(),
        },
        totalRequests: 1250,
        requestsByEndpoint: {
          '/patients': 450,
          '/appointments': 320,
          '/cultural/prayer-times': 180,
          '/cultural/halal/validate-medication': 150,
          '/medications': 150,
        },
        requestsByDay: Array.from({ length: 7 }, (_, i) => {
          const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
          return {
            date: date.toISOString().split('T')[0],
            count: Math.floor(Math.random() * 200) + 50,
          };
        }).reverse(),
        errorRate: 2.1, // percentage
        averageResponseTime: 245, // milliseconds
        culturalFeatureUsage: {
          prayerTimeRequests: 180,
          halalValidationRequests: 150,
          translationRequests: 75,
        },
        quotaUsage: {
          used: 1250,
          limit: 10000,
          percentage: 12.5,
        },
      },
    };
  }

  /**
   * Create API key for hospital integration
   */
  async createHospitalApiKey(
    hospitalName: string,
    environment: 'development' | 'staging' | 'production' = 'development'
  ): Promise<ApiResponse<ApiKeyResponse>> {
    const keyRequest: ApiKeyRequest = {
      name: `${hospitalName} Integration`,
      description: `API key for ${hospitalName} hospital system integration`,
      permissions: [
        'read_patients', 'write_patients',
        'read_appointments', 'write_appointments',
        'read_medications',
        'cultural_services', 'prayer_times', 'halal_validation',
        'fhir_access'
      ],
      environment,
      cultural_features: {
        prayer_time_access: true,
        halal_validation_access: true,
        translation_access: true,
        cultural_calendar_access: true,
      },
      malaysian_compliance: {
        pdpa_compliant: true,
        audit_trail: true,
      },
    };

    return this.createApiKey(keyRequest);
  }

  /**
   * Create API key for mobile app
   */
  async createMobileAppApiKey(
    appName: string,
    environment: 'development' | 'staging' | 'production' = 'development'
  ): Promise<ApiResponse<ApiKeyResponse>> {
    const keyRequest: ApiKeyRequest = {
      name: `${appName} Mobile App`,
      description: `API key for ${appName} mobile application`,
      permissions: [
        'read_patients', 'write_patients',
        'read_appointments', 'write_appointments',
        'read_medications',
        'cultural_services', 'prayer_times', 'halal_validation',
        'translation_access'
      ],
      environment,
      cultural_features: {
        prayer_time_access: true,
        halal_validation_access: true,
        translation_access: true,
        cultural_calendar_access: true,
      },
      malaysian_compliance: {
        pdpa_compliant: true,
        audit_trail: true,
      },
    };

    return this.createApiKey(keyRequest);
  }

  /**
   * Get developer portal dashboard data
   */
  async getDashboardData(): Promise<ApiResponse<{
    totalApiKeys: number;
    activeApiKeys: number;
    totalRequests: number;
    requestsThisMonth: number;
    topEndpoints: Array<{ endpoint: string; requests: number }>;
    culturalFeatureAdoption: {
      prayerTimeIntegration: number;
      halalValidation: number;
      multiLanguageSupport: number;
    };
    environments: {
      development: number;
      staging: number;
      production: number;
    };
  }>> {
    const apiKeysResponse = await this.getApiKeys();
    
    if (!apiKeysResponse.success) {
      return apiKeysResponse;
    }

    const apiKeys = apiKeysResponse.data!;
    
    // Calculate dashboard metrics
    const totalApiKeys = apiKeys.length;
    const activeApiKeys = apiKeys.filter(key => key.status === 'active').length;
    
    const totalRequests = apiKeys.reduce((sum, key) => 
      sum + (key.usage_stats?.total_requests || 0), 0);
    
    const requestsThisMonth = apiKeys.reduce((sum, key) => 
      sum + (key.usage_stats?.last_30_days || 0), 0);

    // Count by environment
    const environments = {
      development: apiKeys.filter(key => key.environment === 'development').length,
      staging: apiKeys.filter(key => key.environment === 'staging').length,
      production: apiKeys.filter(key => key.environment === 'production').length,
    };

    // Count cultural feature adoption
    const culturalFeatureAdoption = {
      prayerTimeIntegration: apiKeys.filter(key => 
        key.cultural_features?.prayer_time_access).length,
      halalValidation: apiKeys.filter(key => 
        key.cultural_features?.halal_validation_access).length,
      multiLanguageSupport: apiKeys.filter(key => 
        key.cultural_features?.translation_access).length,
    };

    return {
      success: true,
      data: {
        totalApiKeys,
        activeApiKeys,
        totalRequests,
        requestsThisMonth,
        topEndpoints: [
          { endpoint: '/patients', requests: 2450 },
          { endpoint: '/appointments', requests: 1820 },
          { endpoint: '/cultural/prayer-times', requests: 980 },
          { endpoint: '/medications', requests: 750 },
          { endpoint: '/cultural/halal/validate-medication', requests: 420 },
        ],
        culturalFeatureAdoption,
        environments,
      },
    };
  }
}

export const developerService = new DeveloperService();