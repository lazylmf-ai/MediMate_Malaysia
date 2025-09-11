/**
 * Secure Storage Service
 * 
 * Wrapper for Expo SecureStore to handle token storage,
 * user data persistence, and secure credential management.
 */

import * as SecureStore from 'expo-secure-store';
import { STORAGE_KEYS } from '@/constants/config';
import type { AuthTokens, User, CulturalProfile } from '@/types/auth';

class StorageService {
  /**
   * Store data securely using Expo SecureStore
   */
  private async setSecureItem(key: string, value: string): Promise<void> {
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (error) {
      console.error(`Failed to store ${key}:`, error);
      throw new Error(`Storage operation failed: ${key}`);
    }
  }

  /**
   * Retrieve data securely from Expo SecureStore
   */
  private async getSecureItem(key: string): Promise<string | null> {
    try {
      return await SecureStore.getItemAsync(key);
    } catch (error) {
      console.error(`Failed to retrieve ${key}:`, error);
      return null;
    }
  }

  /**
   * Delete data from secure storage
   */
  private async deleteSecureItem(key: string): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (error) {
      console.error(`Failed to delete ${key}:`, error);
    }
  }

  // Token Management
  async storeTokens(tokens: AuthTokens): Promise<void> {
    await Promise.all([
      this.setSecureItem(STORAGE_KEYS.ACCESS_TOKEN, tokens.accessToken),
      this.setSecureItem(STORAGE_KEYS.REFRESH_TOKEN, tokens.refreshToken),
    ]);
  }

  async getAccessToken(): Promise<string | null> {
    return this.getSecureItem(STORAGE_KEYS.ACCESS_TOKEN);
  }

  async getRefreshToken(): Promise<string | null> {
    return this.getSecureItem(STORAGE_KEYS.REFRESH_TOKEN);
  }

  async clearTokens(): Promise<void> {
    await Promise.all([
      this.deleteSecureItem(STORAGE_KEYS.ACCESS_TOKEN),
      this.deleteSecureItem(STORAGE_KEYS.REFRESH_TOKEN),
    ]);
  }

  // User Data Management
  async storeUserData(user: User): Promise<void> {
    await this.setSecureItem(STORAGE_KEYS.USER_DATA, JSON.stringify(user));
  }

  async getUserData(): Promise<User | null> {
    const userData = await this.getSecureItem(STORAGE_KEYS.USER_DATA);
    if (!userData) return null;
    
    try {
      return JSON.parse(userData) as User;
    } catch (error) {
      console.error('Failed to parse user data:', error);
      return null;
    }
  }

  async clearUserData(): Promise<void> {
    await this.deleteSecureItem(STORAGE_KEYS.USER_DATA);
  }

  // Cultural Profile Management
  async storeCulturalProfile(profile: CulturalProfile): Promise<void> {
    await this.setSecureItem(STORAGE_KEYS.CULTURAL_PROFILE, JSON.stringify(profile));
  }

  async getCulturalProfile(): Promise<CulturalProfile | null> {
    const profileData = await this.getSecureItem(STORAGE_KEYS.CULTURAL_PROFILE);
    if (!profileData) return null;
    
    try {
      return JSON.parse(profileData) as CulturalProfile;
    } catch (error) {
      console.error('Failed to parse cultural profile:', error);
      return null;
    }
  }

  async clearCulturalProfile(): Promise<void> {
    await this.deleteSecureItem(STORAGE_KEYS.CULTURAL_PROFILE);
  }

  // Biometric Settings
  async setBiometricEnabled(enabled: boolean): Promise<void> {
    await this.setSecureItem(STORAGE_KEYS.BIOMETRIC_ENABLED, enabled.toString());
  }

  async getBiometricEnabled(): Promise<boolean> {
    const enabled = await this.getSecureItem(STORAGE_KEYS.BIOMETRIC_ENABLED);
    return enabled === 'true';
  }

  // Complete Data Clearing (for logout)
  async clearAllData(): Promise<void> {
    await Promise.all([
      this.clearTokens(),
      this.clearUserData(),
      this.clearCulturalProfile(),
      this.deleteSecureItem(STORAGE_KEYS.BIOMETRIC_ENABLED),
    ]);
  }

  // Token Validation
  async isTokenValid(): Promise<boolean> {
    const accessToken = await this.getAccessToken();
    if (!accessToken) return false;

    try {
      // Basic JWT structure validation (header.payload.signature)
      const parts = accessToken.split('.');
      if (parts.length !== 3) return false;

      // Decode payload to check expiration
      const payload = JSON.parse(atob(parts[1]));
      const currentTime = Math.floor(Date.now() / 1000);
      
      return payload.exp > currentTime;
    } catch (error) {
      console.error('Token validation error:', error);
      return false;
    }
  }

  // Check if user has completed initial setup
  async hasCompletedSetup(): Promise<boolean> {
    const user = await this.getUserData();
    const culturalProfile = await this.getCulturalProfile();
    
    return !!(user && culturalProfile);
  }
}

export const storageService = new StorageService();