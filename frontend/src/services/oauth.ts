/**
 * OAuth Service
 * 
 * Handles OAuth 2.0 authentication flow using Expo AuthSession
 * with the existing MediMate backend authentication system.
 */

import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import { OAUTH_CONFIG } from '@/constants/config';
import { apiService } from './api';
import { storageService } from './storage';
import type { AuthTokens, User } from '@/types/auth';

// Complete web browser authentication flows
WebBrowser.maybeCompleteAuthSession();

interface OAuthResult {
  success: boolean;
  user?: User;
  tokens?: AuthTokens;
  error?: string;
}

class OAuthService {
  private redirectUri: string;

  constructor() {
    this.redirectUri = AuthSession.makeRedirectUri({
      scheme: OAUTH_CONFIG.redirectUriScheme,
    });
  }

  /**
   * Get OAuth discovery configuration
   */
  private getDiscovery(): AuthSession.DiscoveryDocument {
    return {
      authorizationEndpoint: OAUTH_CONFIG.authorizationEndpoint,
      tokenEndpoint: OAUTH_CONFIG.tokenEndpoint,
      revocationEndpoint: OAUTH_CONFIG.revocationEndpoint,
    };
  }

  /**
   * Create OAuth request configuration
   */
  private createRequest(): AuthSession.AuthRequestConfig {
    return {
      clientId: 'medimate-mobile', // This should be configured in backend
      scopes: OAUTH_CONFIG.scopes,
      redirectUri: this.redirectUri,
      responseType: AuthSession.ResponseType.Code,
      additionalParameters: OAUTH_CONFIG.additionalParameters,
      prompt: AuthSession.Prompt.Login,
    };
  }

  /**
   * Initiate OAuth login flow
   */
  async login(): Promise<OAuthResult> {
    try {
      const discovery = this.getDiscovery();
      const request = AuthSession.createAuthRequest(this.createRequest());
      
      // Start the OAuth flow
      const result = await AuthSession.promptAsync(request, discovery);

      if (result.type === 'success') {
        // Exchange authorization code for tokens
        const tokenResult = await this.exchangeCodeForTokens(
          result.params.code,
          request
        );
        
        if (tokenResult.success) {
          return tokenResult;
        }
      }

      return {
        success: false,
        error: result.type === 'cancel' 
          ? 'Login cancelled' 
          : 'OAuth authentication failed',
      };
    } catch (error) {
      console.error('OAuth login error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'OAuth login failed',
      };
    }
  }

  /**
   * Exchange authorization code for access tokens
   */
  private async exchangeCodeForTokens(
    code: string,
    request: AuthSession.AuthRequest
  ): Promise<OAuthResult> {
    try {
      const tokenResult = await AuthSession.exchangeCodeAsync(
        {
          clientId: request.clientId!,
          code,
          redirectUri: this.redirectUri,
          extraParams: {
            code_verifier: request.codeChallenge,
          },
        },
        this.getDiscovery()
      );

      if (tokenResult.accessToken) {
        const tokens: AuthTokens = {
          accessToken: tokenResult.accessToken,
          refreshToken: tokenResult.refreshToken || '',
          expiresAt: new Date(
            Date.now() + (tokenResult.expiresIn || 3600) * 1000
          ).toISOString(),
        };

        // Store tokens securely
        await storageService.storeTokens(tokens);

        // Fetch user profile
        const profileResponse = await apiService.getProfile();
        if (profileResponse.success && profileResponse.data) {
          await storageService.storeUserData(profileResponse.data);
          
          // Fetch cultural profile if available
          const culturalResponse = await apiService.getCulturalSettings();
          if (culturalResponse.success && culturalResponse.data) {
            await storageService.storeCulturalProfile(culturalResponse.data);
          }

          return {
            success: true,
            user: profileResponse.data,
            tokens,
          };
        }

        return {
          success: false,
          error: 'Failed to fetch user profile',
        };
      }

      return {
        success: false,
        error: 'Failed to obtain access token',
      };
    } catch (error) {
      console.error('Token exchange error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Token exchange failed',
      };
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshTokens(): Promise<boolean> {
    try {
      const refreshToken = await storageService.getRefreshToken();
      if (!refreshToken) return false;

      const result = await AuthSession.refreshAsync(
        { refreshToken },
        this.getDiscovery()
      );

      if (result.accessToken) {
        const tokens: AuthTokens = {
          accessToken: result.accessToken,
          refreshToken: result.refreshToken || refreshToken,
          expiresAt: new Date(
            Date.now() + (result.expiresIn || 3600) * 1000
          ).toISOString(),
        };

        await storageService.storeTokens(tokens);
        return true;
      }

      return false;
    } catch (error) {
      console.error('Token refresh error:', error);
      return false;
    }
  }

  /**
   * Revoke tokens and logout
   */
  async logout(): Promise<void> {
    try {
      const accessToken = await storageService.getAccessToken();
      
      if (accessToken) {
        // Revoke token on server
        await AuthSession.revokeAsync(
          { token: accessToken },
          this.getDiscovery()
        );
      }
    } catch (error) {
      console.error('Token revocation error:', error);
    } finally {
      // Clear local storage regardless of revocation success
      await storageService.clearAllData();
    }
  }

  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    try {
      const accessToken = await storageService.getAccessToken();
      if (!accessToken) return false;

      // Check token validity
      const isValid = await storageService.isTokenValid();
      if (!isValid) {
        // Try to refresh token
        const refreshed = await this.refreshTokens();
        return refreshed;
      }

      return true;
    } catch (error) {
      console.error('Authentication check error:', error);
      return false;
    }
  }
}

export const oauthService = new OAuthService();