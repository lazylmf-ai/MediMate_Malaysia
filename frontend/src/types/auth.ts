/**
 * Authentication Types
 * 
 * TypeScript interfaces for authentication, user management,
 * and cultural preferences based on the backend API structure.
 */

export interface User {
  id: string;
  email: string;
  fullName: string;
  icNumber?: string;
  phoneNumber?: string;
  healthcareRole?: 'patient' | 'doctor' | 'nurse' | 'pharmacist' | 'admin';
  isVerified: boolean;
  mfaEnabled: boolean;
  culturalPreferences?: CulturalProfile;
  createdAt: string;
  updatedAt: string;
}

export interface CulturalProfile {
  id?: string;
  userId: string;
  language: 'ms' | 'en' | 'zh' | 'ta';
  timezone: string;
  prayerTimes: {
    enabled: boolean;
    madhab: 'shafi' | 'hanafi';
    adjustments: PrayerAdjustments;
  };
  familyStructure: {
    elderlyMembers: number;
    children: Array<{ age: number; specialNeeds?: string }>;
    primaryCaregiver: boolean;
  };
  festivals: {
    islamic: boolean;
    chinese: boolean;
    hindu: boolean;
    malaysian: boolean;
  };
}

export interface PrayerAdjustments {
  fajr: number;
  dhuhr: number;
  asr: number;
  maghrib: number;
  isha: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  mfaCode?: string;
  challengeId?: string;
}

export interface LoginResponse {
  success: boolean;
  user: User;
  tokens: AuthTokens;
  mfaRequired?: boolean;
  challengeId?: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
  icNumber?: string;
  phoneNumber?: string;
  healthcareRole?: 'patient' | 'doctor' | 'nurse' | 'pharmacist' | 'admin';
  culturalPreferences?: Partial<CulturalProfile>;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  error: string | null;
}

export interface OAuthConfig {
  authorizationEndpoint: string;
  tokenEndpoint: string;
  revocationEndpoint: string;
  scopes: string[];
  additionalParameters?: {
    cultural_profile?: boolean;
  };
}