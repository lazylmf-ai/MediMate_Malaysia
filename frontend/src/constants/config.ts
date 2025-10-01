/**
 * Application Configuration Constants
 * 
 * Central configuration for API endpoints, OAuth settings,
 * and environment-specific variables.
 */

import Constants from 'expo-constants';

// Environment configuration
const ENV = {
  dev: {
    apiUrl: 'http://localhost:3000/api',
    webUrl: 'http://localhost:3000',
  },
  staging: {
    apiUrl: 'https://staging-api.medimate.my/api',
    webUrl: 'https://staging.medimate.my',
  },
  prod: {
    apiUrl: 'https://api.medimate.my/api',
    webUrl: 'https://medimate.my',
  },
};

// Get current environment
const getCurrentEnv = () => {
  if (__DEV__) return ENV.dev;
  if (Constants.expoConfig?.extra?.environment === 'staging') return ENV.staging;
  return ENV.prod;
};

export const CONFIG = getCurrentEnv();

// API Endpoints
export const API_ENDPOINTS = {
  // Authentication
  AUTH: {
    LOGIN: `${CONFIG.apiUrl}/auth/login`,
    REGISTER: `${CONFIG.apiUrl}/auth/register`,
    LOGOUT: `${CONFIG.apiUrl}/auth/logout`,
    REFRESH_TOKEN: `${CONFIG.apiUrl}/auth/refresh-token`,
    PROFILE: `${CONFIG.apiUrl}/auth/profile`,
  },
  // Cultural Intelligence
  CULTURAL: {
    SETTINGS: `${CONFIG.apiUrl}/cultural/settings`,
    PRAYER_TIMES: `${CONFIG.apiUrl}/cultural/prayer-times`,
    FESTIVALS: `${CONFIG.apiUrl}/cultural/festivals`,
  },
  // Medication Management
  MEDICATION: {
    LIST: `${CONFIG.apiUrl}/medications`,
    SCHEDULE: `${CONFIG.apiUrl}/medications/schedule`,
    INTERACTIONS: `${CONFIG.apiUrl}/medications/interactions`,
  },
} as const;

// OAuth Configuration
export const OAUTH_CONFIG = {
  authorizationEndpoint: `${CONFIG.apiUrl}/auth/login`,
  tokenEndpoint: `${CONFIG.apiUrl}/auth/token`,
  revocationEndpoint: `${CONFIG.apiUrl}/auth/logout`,
  scopes: ['read', 'write'],
  additionalParameters: {
    cultural_profile: true,
  },
  redirectUriScheme: 'com.medimate.malaysia',
} as const;

// Secure Storage Keys
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'access_token',
  REFRESH_TOKEN: 'refresh_token',
  USER_DATA: 'user_data',
  CULTURAL_PROFILE: 'cultural_profile',
  BIOMETRIC_ENABLED: 'biometric_enabled',
} as const;

// App Settings
export const APP_SETTINGS = {
  // Timeout settings
  REQUEST_TIMEOUT: 10000, // 10 seconds
  TOKEN_REFRESH_THRESHOLD: 300000, // 5 minutes before expiry
  
  // Retry settings
  MAX_RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000, // 1 second
  
  // Cultural settings
  SUPPORTED_LANGUAGES: ['ms', 'en', 'zh', 'ta'] as const,
  DEFAULT_LANGUAGE: 'en' as const,
  
  // Prayer time settings
  DEFAULT_MADHAB: 'shafi' as const,
  PRAYER_NAMES: ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const,
} as const;

// Theme Colors
export const COLORS = {
  primary: '#00A86B', // Malaysian healthcare green
  secondary: '#1E40AF', // Professional blue
  accent: '#F59E0B', // Attention amber
  error: '#EF4444', // Error red
  warning: '#F59E0B', // Warning amber
  success: '#10B981', // Success green
  
  // Cultural colors
  islamic: '#00A86B', // Green for Islamic elements
  chinese: '#DC2626', // Red for Chinese elements
  hindu: '#F59E0B', // Saffron for Hindu elements
  malaysian: '#1E40AF', // Blue for Malaysian elements
  
  // Neutral colors
  white: '#FFFFFF',
  black: '#000000',
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },
} as const;

// Typography
export const TYPOGRAPHY = {
  fontSizes: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
  },
  fontWeights: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
} as const;