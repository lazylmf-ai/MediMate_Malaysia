/**
 * Enhanced Authentication Service
 * 
 * Provides optimized authentication flow with:
 * - Automatic token refresh with retry logic
 * - Enhanced error handling and recovery
 * - Offline authentication state management
 * - Cultural profile integration
 * - PDPA compliance tracking
 */

import { apiClient } from '../client';
import { API_ENDPOINTS } from '../endpoints';
import { storageService } from '@/services/storage';
import { oauthService } from '@/services/oauth';
import type { 
  ApiResponse, 
  LoginRequest, 
  LoginResponse, 
  RegisterRequest, 
  RefreshTokenRequest, 
  User,
  CulturalProfile 
} from '@/types/auth';

export interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  culturalProfile: CulturalProfile | null;
  isLoading: boolean;
  error: string | null;
  tokenExpiry: Date | null;
  lastRefresh: Date | null;
}

export interface AuthMetrics {
  loginAttempts: number;
  successfulLogins: number;
  failedLogins: number;
  tokenRefreshes: number;
  lastActivity: Date;
  sessionDuration: number; // in milliseconds
}

class AuthService {
  private authState: AuthState = {
    isAuthenticated: false,
    user: null,
    culturalProfile: null,
    isLoading: false,
    error: null,
    tokenExpiry: null,
    lastRefresh: null,
  };

  private metrics: AuthMetrics = {
    loginAttempts: 0,
    successfulLogins: 0,
    failedLogins: 0,
    tokenRefreshes: 0,
    lastActivity: new Date(),
    sessionDuration: 0,
  };

  private refreshPromise: Promise<boolean> | null = null;
  private refreshInterval: NodeJS.Timeout | null = null;
  private activityTimeout: NodeJS.Timeout | null = null;

  constructor() {
    this.setupTokenRefreshScheduler();
    this.setupActivityTracking();
  }

  /**
   * Initialize authentication state from stored data
   */
  async initialize(): Promise<AuthState> {
    this.setLoading(true);
    
    try {
      const [accessToken, userData, culturalData] = await Promise.all([
        storageService.getAccessToken(),
        storageService.getUserData(),
        storageService.getCulturalProfile(),
      ]);

      if (accessToken && userData) {
        const isValid = await storageService.isTokenValid();
        
        if (isValid) {
          this.authState = {
            isAuthenticated: true,
            user: userData,
            culturalProfile: culturalData,
            isLoading: false,
            error: null,
            tokenExpiry: new Date(Date.now() + 3600 * 1000), // Estimate 1 hour
            lastRefresh: null,
          };
        } else {
          // Try to refresh token
          const refreshed = await this.refreshToken();
          if (!refreshed) {
            await this.clearAuthState();
          }
        }
      } else {
        await this.clearAuthState();
      }
    } catch (error) {
      console.error('Auth initialization error:', error);
      await this.clearAuthState();
    }

    this.setLoading(false);
    return this.authState;
  }

  /**
   * Enhanced login with cultural profile fetching
   */
  async login(credentials: LoginRequest, options?: {
    fetchCulturalProfile?: boolean;
    rememberMe?: boolean;
    skipBiometric?: boolean;
  }): Promise<ApiResponse<{
    user: User;
    culturalProfile?: CulturalProfile;
    tokens: any;
  }>> {
    this.setLoading(true);
    this.metrics.loginAttempts++;

    try {
      // Attempt API login
      const response = await apiClient.request<LoginResponse>(
        API_ENDPOINTS.AUTH.LOGIN,
        {
          method: 'POST',
          body: JSON.stringify(credentials),
          skipAuth: true,
          retries: 2, // Allow retries for login
        }
      );

      if (response.success && response.data) {
        const { user, tokens } = response.data;
        
        // Store tokens securely
        await storageService.storeTokens(tokens);
        await storageService.storeUserData(user);

        // Fetch cultural profile if requested
        let culturalProfile: CulturalProfile | undefined;
        if (options?.fetchCulturalProfile !== false) {
          const culturalResponse = await this.fetchCulturalProfile();
          if (culturalResponse.success) {
            culturalProfile = culturalResponse.data!;
            await storageService.storeCulturalProfile(culturalProfile);
          }
        }

        // Update auth state
        this.authState = {
          isAuthenticated: true,
          user,
          culturalProfile: culturalProfile || null,
          isLoading: false,
          error: null,
          tokenExpiry: new Date(tokens.expiresAt),
          lastRefresh: new Date(),
        };

        // Update metrics
        this.metrics.successfulLogins++;
        this.metrics.lastActivity = new Date();

        // Start session tracking
        this.startSessionTracking();
        this.scheduleTokenRefresh();

        this.setLoading(false);
        
        return {
          success: true,
          data: {
            user,
            culturalProfile,
            tokens,
          },
        };
      } else {
        this.metrics.failedLogins++;
        this.setLoading(false);
        return response;
      }
    } catch (error) {
      this.metrics.failedLogins++;
      this.setLoading(false);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Login failed',
      };
    }
  }

  /**
   * OAuth login integration
   */
  async loginWithOAuth(options?: {
    fetchCulturalProfile?: boolean;
  }): Promise<ApiResponse<{
    user: User;
    culturalProfile?: CulturalProfile;
    tokens: any;
  }>> {
    this.setLoading(true);
    this.metrics.loginAttempts++;

    try {
      const oauthResult = await oauthService.login();
      
      if (oauthResult.success && oauthResult.user && oauthResult.tokens) {
        // Fetch cultural profile if requested
        let culturalProfile: CulturalProfile | undefined;
        if (options?.fetchCulturalProfile !== false) {
          const culturalResponse = await this.fetchCulturalProfile();
          if (culturalResponse.success) {
            culturalProfile = culturalResponse.data!;
          }
        }

        // Update auth state
        this.authState = {
          isAuthenticated: true,
          user: oauthResult.user,
          culturalProfile: culturalProfile || null,
          isLoading: false,
          error: null,
          tokenExpiry: new Date(oauthResult.tokens.expiresAt),
          lastRefresh: new Date(),
        };

        this.metrics.successfulLogins++;
        this.startSessionTracking();
        this.scheduleTokenRefresh();

        this.setLoading(false);
        
        return {
          success: true,
          data: {
            user: oauthResult.user,
            culturalProfile,
            tokens: oauthResult.tokens,
          },
        };
      } else {
        this.metrics.failedLogins++;
        this.setLoading(false);
        
        return {
          success: false,
          error: oauthResult.error || 'OAuth login failed',
        };
      }
    } catch (error) {
      this.metrics.failedLogins++;
      this.setLoading(false);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'OAuth login failed',
      };
    }
  }

  /**
   * Register new user with cultural profile
   */
  async register(userData: RegisterRequest & {
    culturalPreferences?: Partial<CulturalProfile>;
  }): Promise<ApiResponse<{
    user: User;
    culturalProfile?: CulturalProfile;
  }>> {
    this.setLoading(true);

    try {
      const response = await apiClient.request<{ user: User }>(
        API_ENDPOINTS.AUTH.REGISTER,
        {
          method: 'POST',
          body: JSON.stringify(userData),
          skipAuth: true,
        }
      );

      if (response.success && response.data) {
        const { user } = response.data;
        
        // Auto-login after registration
        const loginResult = await this.login({
          email: userData.email,
          password: userData.password,
        });

        if (loginResult.success) {
          // Create cultural profile if preferences provided
          let culturalProfile: CulturalProfile | undefined;
          if (userData.culturalPreferences) {
            const culturalResponse = await this.updateCulturalProfile(userData.culturalPreferences);
            if (culturalResponse.success) {
              culturalProfile = culturalResponse.data!;
            }
          }

          this.setLoading(false);
          
          return {
            success: true,
            data: {
              user,
              culturalProfile,
            },
          };
        }
      }

      this.setLoading(false);
      return response;
    } catch (error) {
      this.setLoading(false);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Registration failed',
      };
    }
  }

  /**
   * Enhanced token refresh with retry logic
   */
  async refreshToken(retryCount: number = 0): Promise<boolean> {
    const maxRetries = 3;
    const retryDelay = 1000 * Math.pow(2, retryCount); // Exponential backoff

    // Prevent multiple simultaneous refresh attempts
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this._performTokenRefresh(retryCount, maxRetries, retryDelay);
    
    try {
      const result = await this.refreshPromise;
      return result;
    } finally {
      this.refreshPromise = null;
    }
  }

  /**
   * Internal token refresh implementation
   */
  private async _performTokenRefresh(retryCount: number, maxRetries: number, retryDelay: number): Promise<boolean> {
    try {
      const refreshToken = await storageService.getRefreshToken();
      if (!refreshToken) {
        console.warn('No refresh token available');
        await this.clearAuthState();
        return false;
      }

      const response = await apiClient.request<{ tokens: any }>(
        API_ENDPOINTS.AUTH.REFRESH_TOKEN,
        {
          method: 'POST',
          body: JSON.stringify({ refreshToken }),
          skipAuth: true,
          timeout: 10000, // 10 second timeout
        }
      );

      if (response.success && response.data?.tokens) {
        const { tokens } = response.data;
        
        // Store new tokens
        await storageService.storeTokens(tokens);
        
        // Update auth state
        this.authState.tokenExpiry = new Date(tokens.expiresAt);
        this.authState.lastRefresh = new Date();
        this.authState.error = null;

        this.metrics.tokenRefreshes++;
        this.scheduleTokenRefresh();

        console.log('Token refreshed successfully');
        return true;
      } else {
        throw new Error(response.error || 'Token refresh failed');
      }
    } catch (error) {
      console.error(`Token refresh attempt ${retryCount + 1} failed:`, error);
      
      if (retryCount < maxRetries) {
        console.log(`Retrying token refresh in ${retryDelay}ms`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        return this._performTokenRefresh(retryCount + 1, maxRetries, retryDelay * 2);
      } else {
        console.error('All token refresh attempts failed');
        await this.clearAuthState();
        return false;
      }
    }
  }

  /**
   * Logout with cleanup
   */
  async logout(options?: {
    revokeToken?: boolean;
    clearBiometric?: boolean;
  }): Promise<void> {
    try {
      // Revoke token on server if requested
      if (options?.revokeToken !== false) {
        await apiClient.request(API_ENDPOINTS.AUTH.LOGOUT, {
          method: 'POST',
          timeout: 5000, // Don't wait too long for logout
        });
      }
    } catch (error) {
      console.error('Server logout error:', error);
    } finally {
      // Clear local state regardless of server response
      await this.clearAuthState();
      this.clearTimers();
      
      // Clear biometric data if requested
      if (options?.clearBiometric) {
        await storageService.clearBiometricData();
      }
    }
  }

  /**
   * Fetch user's cultural profile
   */
  async fetchCulturalProfile(): Promise<ApiResponse<CulturalProfile>> {
    return apiClient.request<CulturalProfile>('/cultural/settings');
  }

  /**
   * Update cultural profile
   */
  async updateCulturalProfile(
    updates: Partial<CulturalProfile>
  ): Promise<ApiResponse<CulturalProfile>> {
    const response = await apiClient.request<CulturalProfile>(
      '/cultural/settings',
      {
        method: 'PUT',
        body: JSON.stringify(updates),
      }
    );

    if (response.success && response.data) {
      // Update local state
      this.authState.culturalProfile = response.data;
      await storageService.storeCulturalProfile(response.data);
    }

    return response;
  }

  /**
   * Check authentication status
   */
  async checkAuthStatus(): Promise<AuthState> {
    if (!this.authState.isAuthenticated) {
      return this.authState;
    }

    // Check token validity
    const isValid = await storageService.isTokenValid();
    if (!isValid) {
      const refreshed = await this.refreshToken();
      if (!refreshed) {
        await this.clearAuthState();
      }
    }

    this.updateLastActivity();
    return this.authState;
  }

  /**
   * Get current auth state
   */
  getAuthState(): AuthState {
    return { ...this.authState };
  }

  /**
   * Get authentication metrics
   */
  getAuthMetrics(): AuthMetrics {
    return {
      ...this.metrics,
      sessionDuration: this.calculateSessionDuration(),
    };
  }

  /**
   * Private helper methods
   */
  private setLoading(loading: boolean) {
    this.authState.isLoading = loading;
  }

  private async clearAuthState() {
    await storageService.clearAllData();
    this.authState = {
      isAuthenticated: false,
      user: null,
      culturalProfile: null,
      isLoading: false,
      error: null,
      tokenExpiry: null,
      lastRefresh: null,
    };
  }

  private setupTokenRefreshScheduler() {
    // Check token expiry every 5 minutes
    setInterval(async () => {
      if (this.authState.isAuthenticated && this.authState.tokenExpiry) {
        const timeUntilExpiry = this.authState.tokenExpiry.getTime() - Date.now();
        const refreshThreshold = 5 * 60 * 1000; // 5 minutes

        if (timeUntilExpiry <= refreshThreshold) {
          await this.refreshToken();
        }
      }
    }, 5 * 60 * 1000);
  }

  private scheduleTokenRefresh() {
    if (this.refreshInterval) {
      clearTimeout(this.refreshInterval);
    }

    if (this.authState.tokenExpiry) {
      const timeUntilExpiry = this.authState.tokenExpiry.getTime() - Date.now();
      const refreshTime = Math.max(timeUntilExpiry - 5 * 60 * 1000, 1000); // 5 minutes before expiry

      this.refreshInterval = setTimeout(async () => {
        await this.refreshToken();
      }, refreshTime);
    }
  }

  private setupActivityTracking() {
    // Track user activity for session management
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    const updateActivity = () => this.updateLastActivity();
    
    events.forEach(event => {
      if (typeof window !== 'undefined') {
        window.addEventListener(event, updateActivity, true);
      }
    });
  }

  private updateLastActivity() {
    this.metrics.lastActivity = new Date();
    
    // Reset activity timeout
    if (this.activityTimeout) {
      clearTimeout(this.activityTimeout);
    }

    // Auto-logout after 30 minutes of inactivity (configurable)
    this.activityTimeout = setTimeout(async () => {
      console.log('Auto-logout due to inactivity');
      await this.logout();
    }, 30 * 60 * 1000);
  }

  private startSessionTracking() {
    this.metrics.lastActivity = new Date();
  }

  private calculateSessionDuration(): number {
    if (this.metrics.lastActivity) {
      return Date.now() - this.metrics.lastActivity.getTime();
    }
    return 0;
  }

  private clearTimers() {
    if (this.refreshInterval) {
      clearTimeout(this.refreshInterval);
      this.refreshInterval = null;
    }
    
    if (this.activityTimeout) {
      clearTimeout(this.activityTimeout);
      this.activityTimeout = null;
    }
  }

  /**
   * Biometric authentication support
   */
  async enableBiometricAuth(): Promise<ApiResponse<{ enabled: boolean }>> {
    try {
      const available = await storageService.isBiometricAvailable();
      if (!available) {
        return {
          success: false,
          error: 'Biometric authentication not available on this device',
        };
      }

      await storageService.setBiometricEnabled(true);
      
      return {
        success: true,
        data: { enabled: true },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to enable biometric authentication',
      };
    }
  }

  async authenticateWithBiometric(): Promise<ApiResponse<{ authenticated: boolean }>> {
    try {
      const result = await storageService.authenticateWithBiometric('Please authenticate to access your account');
      
      if (result.success) {
        // Check if we have valid stored credentials
        const isAuthenticated = await this.checkAuthStatus();
        return {
          success: true,
          data: { authenticated: isAuthenticated.isAuthenticated },
        };
      }

      return {
        success: false,
        error: result.error || 'Biometric authentication failed',
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Biometric authentication failed',
      };
    }
  }
}

export const authService = new AuthService();