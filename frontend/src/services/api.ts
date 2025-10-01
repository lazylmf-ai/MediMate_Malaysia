/**
 * API Service
 * 
 * Central service for all HTTP requests to the MediMate backend.
 * Handles authentication, token refresh, and error management.
 */

import { API_ENDPOINTS, APP_SETTINGS } from '@/constants/config';
import { storageService } from './storage';
import type { 
  LoginRequest, 
  LoginResponse, 
  RegisterRequest, 
  RefreshTokenRequest, 
  User,
  CulturalProfile 
} from '@/types/auth';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

class ApiService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_ENDPOINTS.AUTH.LOGIN.replace('/auth/login', '');
  }

  /**
   * Make authenticated HTTP request with automatic token refresh
   */
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseUrl}${endpoint}`;
    
    // Add authentication headers
    const accessToken = await storageService.getAccessToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        timeout: APP_SETTINGS.REQUEST_TIMEOUT,
      });

      // Handle token expiration
      if (response.status === 401 && accessToken) {
        const refreshed = await this.refreshToken();
        if (refreshed) {
          // Retry request with new token
          const newToken = await storageService.getAccessToken();
          if (newToken) {
            headers.Authorization = `Bearer ${newToken}`;
            const retryResponse = await fetch(url, {
              ...options,
              headers,
              timeout: APP_SETTINGS.REQUEST_TIMEOUT,
            });
            return this.handleResponse<T>(retryResponse);
          }
        }
        // If refresh failed, clear stored data and require re-login
        await storageService.clearAllData();
        throw new Error('Authentication required');
      }

      return this.handleResponse<T>(response);
    } catch (error) {
      console.error('API request failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  /**
   * Handle API response and parse JSON
   */
  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    try {
      const data = await response.json();
      
      if (!response.ok) {
        return {
          success: false,
          error: data.message || `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      return {
        success: true,
        data: data.data || data,
        message: data.message,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to parse response',
      };
    }
  }

  // Authentication Methods
  async login(credentials: LoginRequest): Promise<ApiResponse<LoginResponse>> {
    return this.makeRequest<LoginResponse>(API_ENDPOINTS.AUTH.LOGIN, {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async register(userData: RegisterRequest): Promise<ApiResponse<{ user: User }>> {
    return this.makeRequest<{ user: User }>(API_ENDPOINTS.AUTH.REGISTER, {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  }

  async logout(): Promise<ApiResponse<void>> {
    const response = await this.makeRequest<void>(API_ENDPOINTS.AUTH.LOGOUT, {
      method: 'POST',
    });
    
    // Clear local storage regardless of API response
    await storageService.clearAllData();
    return response;
  }

  async refreshToken(): Promise<boolean> {
    const refreshToken = await storageService.getRefreshToken();
    if (!refreshToken) return false;

    try {
      const response = await fetch(API_ENDPOINTS.AUTH.REFRESH_TOKEN, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.tokens) {
          await storageService.storeTokens(data.tokens);
          return true;
        }
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
    }

    return false;
  }

  // User Profile Methods
  async getProfile(): Promise<ApiResponse<User>> {
    return this.makeRequest<User>(API_ENDPOINTS.AUTH.PROFILE);
  }

  async updateProfile(userData: Partial<User>): Promise<ApiResponse<User>> {
    return this.makeRequest<User>(API_ENDPOINTS.AUTH.PROFILE, {
      method: 'PUT',
      body: JSON.stringify(userData),
    });
  }

  // Cultural Profile Methods
  async getCulturalSettings(): Promise<ApiResponse<CulturalProfile>> {
    return this.makeRequest<CulturalProfile>(API_ENDPOINTS.CULTURAL.SETTINGS);
  }

  async updateCulturalSettings(
    settings: Partial<CulturalProfile>
  ): Promise<ApiResponse<CulturalProfile>> {
    return this.makeRequest<CulturalProfile>(API_ENDPOINTS.CULTURAL.SETTINGS, {
      method: 'PUT',
      body: JSON.stringify(settings),
    });
  }

  async getPrayerTimes(latitude: number, longitude: number): Promise<ApiResponse<any>> {
    const url = `${API_ENDPOINTS.CULTURAL.PRAYER_TIMES}?lat=${latitude}&lng=${longitude}`;
    return this.makeRequest<any>(url);
  }

  async getFestivals(): Promise<ApiResponse<any>> {
    return this.makeRequest<any>(API_ENDPOINTS.CULTURAL.FESTIVALS);
  }

  // Health Check
  async healthCheck(): Promise<ApiResponse<{ status: string }>> {
    return this.makeRequest<{ status: string }>('/health');
  }
}

export const apiService = new ApiService();