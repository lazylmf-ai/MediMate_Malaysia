/**
 * Real User Monitoring (RUM) Configuration for MediMate Education Hub
 *
 * This configuration sets up comprehensive Real User Monitoring using:
 * - AWS CloudWatch RUM for web performance
 * - Firebase Analytics for mobile app tracking
 * - Custom metrics for Education Hub specific tracking
 *
 * Key Metrics Tracked:
 * - Page load times and Core Web Vitals
 * - User interactions and engagement
 * - Error tracking and crash reporting
 * - Custom business metrics
 */

// AWS CloudWatch RUM Configuration (for web)
const awsRumConfig = {
  sessionSampleRate: 1.0, // 100% sampling for initial launch, adjust based on volume
  guestRoleArn: process.env.AWS_RUM_GUEST_ROLE_ARN,
  identityPoolId: process.env.AWS_RUM_IDENTITY_POOL_ID,
  endpoint: 'https://dataplane.rum.ap-southeast-1.amazonaws.com',
  telemetries: [
    'performance',
    'errors',
    'http',
    'interaction'
  ],
  allowCookies: true,
  enableXRay: true,

  // Custom configuration for Education Hub
  applicationId: process.env.AWS_RUM_APPLICATION_ID || 'medimate-education-hub',
  applicationVersion: process.env.APP_VERSION || '1.0.0',

  // Page load performance tracking
  pageIdFormat: 'PATH_AND_HASH',

  // Error tracking configuration
  errorMonitoring: {
    sampleRate: 1.0, // Track all errors
    includeStackTrace: true,
    maxErrorsPerSession: 100
  },

  // HTTP request tracking
  httpRequestTracking: {
    enabled: true,
    recordAllRequests: true,
    addXRayTraceIdHeader: true,
    urlsToInclude: [
      /\/api\/education\/.*/,
      /\/api\/content\/.*/,
      /\/api\/quiz\/.*/,
      /\/api\/progress\/.*/
    ],
    urlsToExclude: [
      /\/api\/health/,
      /\/api\/ping/
    ]
  },

  // User interaction tracking
  interactionTracking: {
    enabled: true,
    events: [
      'click',
      'scroll',
      'input',
      'change'
    ]
  },

  // Session configuration
  sessionAttributes: {
    userId: true,
    language: true,
    deviceType: true,
    appVersion: true
  }
};

// Firebase Analytics Configuration (for mobile apps)
const firebaseAnalyticsConfig = {
  // iOS Configuration
  ios: {
    googleAppId: process.env.FIREBASE_IOS_APP_ID,
    gcmSenderId: process.env.FIREBASE_GCM_SENDER_ID,
    apiKey: process.env.FIREBASE_IOS_API_KEY,
    projectId: 'medimate-malaysia',
    storageBucket: 'medimate-malaysia.appspot.com',

    // Analytics settings
    analyticsCollectionEnabled: true,
    crashlyticsCollectionEnabled: true,
    performanceMonitoringEnabled: true,

    // Session timeout (30 minutes)
    sessionTimeoutDuration: 1800000,

    // Minimum session duration to track (10 seconds)
    minimumSessionDuration: 10000
  },

  // Android Configuration
  android: {
    googleAppId: process.env.FIREBASE_ANDROID_APP_ID,
    gcmSenderId: process.env.FIREBASE_GCM_SENDER_ID,
    apiKey: process.env.FIREBASE_ANDROID_API_KEY,
    projectId: 'medimate-malaysia',
    storageBucket: 'medimate-malaysia.appspot.com',

    // Analytics settings
    analyticsCollectionEnabled: true,
    crashlyticsCollectionEnabled: true,
    performanceMonitoringEnabled: true,

    // Session timeout (30 minutes)
    sessionTimeoutDuration: 1800000,

    // Minimum session duration to track (10 seconds)
    minimumSessionDuration: 10000
  },

  // User properties to track
  userProperties: {
    preferredLanguage: true,
    ageGroup: true,
    chronicConditions: true,
    userType: true, // patient, caregiver
    subscriptionTier: true
  },

  // Automatic event tracking
  automaticEventTracking: {
    screenView: true,
    sessionStart: true,
    appOpen: true,
    appUpdate: true,
    firstOpen: true,
    userEngagement: true
  }
};

// Custom Event Definitions for Education Hub
const customEvents = {
  // Content Discovery Events
  CONTENT_SEARCH: {
    name: 'content_search',
    parameters: {
      search_query: 'string',
      search_filters: 'string',
      results_count: 'number',
      language: 'string'
    }
  },

  CONTENT_VIEW: {
    name: 'content_view',
    parameters: {
      content_id: 'string',
      content_type: 'string', // article, video, infographic
      content_category: 'string',
      content_language: 'string',
      is_recommended: 'boolean',
      recommendation_position: 'number'
    }
  },

  CONTENT_COMPLETION: {
    name: 'content_completion',
    parameters: {
      content_id: 'string',
      content_type: 'string',
      time_spent: 'number', // seconds
      scroll_depth: 'number', // percentage
      video_completion_rate: 'number' // percentage
    }
  },

  // Learning Events
  QUIZ_START: {
    name: 'quiz_start',
    parameters: {
      quiz_id: 'string',
      content_id: 'string',
      difficulty_level: 'string'
    }
  },

  QUIZ_ANSWER: {
    name: 'quiz_answer',
    parameters: {
      quiz_id: 'string',
      question_id: 'string',
      is_correct: 'boolean',
      time_taken: 'number' // seconds
    }
  },

  QUIZ_COMPLETION: {
    name: 'quiz_completion',
    parameters: {
      quiz_id: 'string',
      score: 'number',
      total_questions: 'number',
      correct_answers: 'number',
      time_taken: 'number', // seconds
      passed: 'boolean'
    }
  },

  // Video Events
  VIDEO_START: {
    name: 'video_start',
    parameters: {
      video_id: 'string',
      content_id: 'string',
      video_quality: 'string',
      has_subtitles: 'boolean'
    }
  },

  VIDEO_PROGRESS: {
    name: 'video_progress',
    parameters: {
      video_id: 'string',
      progress_percentage: 'number',
      playback_speed: 'number'
    }
  },

  VIDEO_COMPLETION: {
    name: 'video_completion',
    parameters: {
      video_id: 'string',
      watch_duration: 'number', // seconds
      total_duration: 'number', // seconds
      completion_rate: 'number' // percentage
    }
  },

  VIDEO_ERROR: {
    name: 'video_error',
    parameters: {
      video_id: 'string',
      error_code: 'string',
      error_message: 'string',
      video_quality: 'string'
    }
  },

  // Engagement Events
  RECOMMENDATION_CLICK: {
    name: 'recommendation_click',
    parameters: {
      content_id: 'string',
      recommendation_type: 'string', // personalized, popular, related
      position: 'number',
      context: 'string' // home, content_detail, search
    }
  },

  SHARE_CONTENT: {
    name: 'share_content',
    parameters: {
      content_id: 'string',
      share_method: 'string', // family_circle, social, link
      recipient_count: 'number'
    }
  },

  ACHIEVEMENT_UNLOCKED: {
    name: 'achievement_unlocked',
    parameters: {
      achievement_id: 'string',
      achievement_name: 'string',
      achievement_category: 'string'
    }
  },

  STREAK_MILESTONE: {
    name: 'streak_milestone',
    parameters: {
      streak_days: 'number',
      milestone_type: 'string' // 7_days, 30_days, 90_days
    }
  },

  // Offline Events
  OFFLINE_DOWNLOAD: {
    name: 'offline_download',
    parameters: {
      content_id: 'string',
      content_type: 'string',
      file_size: 'number', // bytes
      download_duration: 'number' // seconds
    }
  },

  OFFLINE_PLAYBACK: {
    name: 'offline_playback',
    parameters: {
      content_id: 'string',
      content_type: 'string'
    }
  },

  SYNC_OPERATION: {
    name: 'sync_operation',
    parameters: {
      sync_type: 'string', // progress, downloads, preferences
      items_synced: 'number',
      sync_duration: 'number', // seconds
      conflicts_found: 'number'
    }
  },

  // User Settings Events
  LANGUAGE_CHANGE: {
    name: 'language_change',
    parameters: {
      previous_language: 'string',
      new_language: 'string'
    }
  },

  PREFERENCE_UPDATE: {
    name: 'preference_update',
    parameters: {
      preference_type: 'string', // content_categories, notification_settings
      preference_value: 'string'
    }
  },

  // Feedback Events
  CONTENT_RATING: {
    name: 'content_rating',
    parameters: {
      content_id: 'string',
      rating: 'number', // 1-5
      feedback_text: 'string'
    }
  },

  BUG_REPORT: {
    name: 'bug_report',
    parameters: {
      bug_category: 'string',
      severity: 'string',
      screen_name: 'string'
    }
  }
};

// Core Web Vitals Thresholds
const webVitalsThresholds = {
  // Largest Contentful Paint (LCP) - should be < 2.5s
  lcp: {
    good: 2500,
    needsImprovement: 4000,
    poor: Infinity
  },

  // First Input Delay (FID) - should be < 100ms
  fid: {
    good: 100,
    needsImprovement: 300,
    poor: Infinity
  },

  // Cumulative Layout Shift (CLS) - should be < 0.1
  cls: {
    good: 0.1,
    needsImprovement: 0.25,
    poor: Infinity
  },

  // First Contentful Paint (FCP) - should be < 1.8s
  fcp: {
    good: 1800,
    needsImprovement: 3000,
    poor: Infinity
  },

  // Time to First Byte (TTFB) - should be < 800ms
  ttfb: {
    good: 800,
    needsImprovement: 1800,
    poor: Infinity
  }
};

// Custom Metrics for Education Hub
const customMetrics = {
  // User Engagement
  sessionDuration: {
    name: 'session_duration',
    unit: 'seconds',
    type: 'duration'
  },

  contentViewsPerSession: {
    name: 'content_views_per_session',
    unit: 'count',
    type: 'counter'
  },

  quizCompletionRate: {
    name: 'quiz_completion_rate',
    unit: 'percentage',
    type: 'gauge'
  },

  // Content Performance
  averageReadTime: {
    name: 'average_read_time',
    unit: 'seconds',
    type: 'duration'
  },

  videoCompletionRate: {
    name: 'video_completion_rate',
    unit: 'percentage',
    type: 'gauge'
  },

  recommendationClickThroughRate: {
    name: 'recommendation_ctr',
    unit: 'percentage',
    type: 'gauge'
  },

  // Technical Performance
  apiCallDuration: {
    name: 'api_call_duration',
    unit: 'milliseconds',
    type: 'duration'
  },

  offlineDownloadSpeed: {
    name: 'offline_download_speed',
    unit: 'mbps',
    type: 'gauge'
  },

  syncOperationDuration: {
    name: 'sync_operation_duration',
    unit: 'seconds',
    type: 'duration'
  }
};

// Privacy and Data Collection Settings
const privacySettings = {
  // Anonymize IP addresses
  anonymizeIp: true,

  // Allow users to opt-out of analytics
  allowAnalyticsOptOut: true,

  // Data retention period (14 months, Firebase default)
  dataRetentionMonths: 14,

  // PII fields to exclude from tracking
  excludedFields: [
    'email',
    'phone_number',
    'ic_number',
    'full_name',
    'address'
  ],

  // Consent management
  requireUserConsent: true,
  consentTypes: {
    analytics: 'required',
    performance: 'optional',
    advertising: 'denied'
  }
};

// Export configuration
module.exports = {
  awsRumConfig,
  firebaseAnalyticsConfig,
  customEvents,
  webVitalsThresholds,
  customMetrics,
  privacySettings
};

// Usage Example for Web (React/Next.js)
/*
import { AwsRum } from 'aws-rum-web';

try {
  const awsRum = new AwsRum(
    awsRumConfig.applicationId,
    awsRumConfig.applicationVersion,
    awsRumConfig.endpoint,
    awsRumConfig
  );

  // Track custom event
  awsRum.recordEvent('content_view', {
    content_id: '123',
    content_type: 'article',
    content_category: 'diabetes'
  });

} catch (error) {
  console.error('Failed to initialize AWS RUM:', error);
}
*/

// Usage Example for Mobile (React Native with Firebase)
/*
import analytics from '@react-native-firebase/analytics';

// Track screen view
await analytics().logScreenView({
  screen_name: 'ContentDetail',
  screen_class: 'ContentDetailScreen'
});

// Track custom event
await analytics().logEvent('content_view', {
  content_id: '123',
  content_type: 'article',
  content_category: 'diabetes'
});

// Set user properties
await analytics().setUserProperty('preferred_language', 'ms');
*/
