/**
 * Adherence Tracking Types and Interfaces
 * Comprehensive medication adherence tracking with cultural intelligence
 */

import { Medication } from './medication';

/**
 * Adherence status for medication intake
 */
export type AdherenceStatus = 'taken' | 'missed' | 'late' | 'skipped' | 'pending';

/**
 * Time period for adherence calculations
 */
export type AdherencePeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

/**
 * Milestone types for achievement tracking
 */
export type MilestoneType = 'streak' | 'adherence' | 'consistency' | 'improvement' | 'perfect_timing';

/**
 * Cultural themes for Malaysian context
 */
export type CulturalTheme =
  | 'hari_raya'
  | 'chinese_new_year'
  | 'deepavali'
  | 'merdeka'
  | 'malaysia_day'
  | 'traditional'
  | 'modern'
  | 'islamic'
  | 'buddhist'
  | 'hindu';

/**
 * Individual adherence record for a medication dose
 */
export interface AdherenceRecord {
  id: string;
  medicationId: string;
  patientId: string;
  scheduledTime: Date;
  takenTime?: Date;
  status: AdherenceStatus;
  adherenceScore: number; // 0-100 score based on timing accuracy
  notes?: string;
  reminderSent: boolean;
  reminderResponseTime?: number; // milliseconds from reminder to action
  location?: {
    latitude: number;
    longitude: number;
  };
  culturalContext?: {
    isDuringPrayer: boolean;
    isDuringFasting: boolean;
    festival?: CulturalTheme;
  };
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Progress metrics for adherence tracking
 */
export interface ProgressMetrics {
  patientId: string;
  period: AdherencePeriod;
  startDate: Date;
  endDate: Date;
  adherenceRate: number; // 0-100 percentage
  streakCount: number;
  longestStreak: number;
  totalDoses: number;
  takenDoses: number;
  missedDoses: number;
  lateDoses: number;
  skippedDoses: number;
  averageTimingAccuracy: number; // minutes deviation from scheduled time
  consistency: {
    morning?: number;
    afternoon?: number;
    evening?: number;
    night?: number;
  };
  medicationBreakdown: {
    [medicationId: string]: {
      name: string;
      adherenceRate: number;
      totalDoses: number;
      takenDoses: number;
    };
  };
}

/**
 * Streak information for gamification
 */
export interface StreakInfo {
  patientId: string;
  currentStreak: number;
  longestStreak: number;
  streakStartDate?: Date;
  lastMissedDate?: Date;
  streakHistory: {
    startDate: Date;
    endDate: Date;
    length: number;
    endReason?: 'missed' | 'skipped' | 'late' | 'ongoing';
  }[];
  recoveryEligible: boolean; // Can recover streak with next dose
  recoveryDeadline?: Date;
}

/**
 * Milestone achievement for cultural celebrations
 */
export interface Milestone {
  id: string;
  patientId: string;
  type: MilestoneType;
  threshold: number;
  culturalTheme: CulturalTheme;
  achievedDate?: Date;
  celebrationShown: boolean;
  title: string;
  description: string;
  badgeUrl?: string;
  shareableCardUrl?: string;
  familyNotified: boolean;
  metadata?: Record<string, any>;
}

/**
 * Cultural pattern analysis for adherence
 */
export interface CulturalPattern {
  patientId: string;
  pattern: string;
  confidence: number; // 0-1 confidence score
  observations: {
    prayerTimeAdherence: {
      fajr: number;
      zuhr: number;
      asr: number;
      maghrib: number;
      isya: number;
    };
    festivalAdherence: {
      [festival: string]: number;
    };
    fastingPeriodAdherence: number;
    familyInfluence: number; // Adherence when family members are involved
  };
  recommendations: string[];
  culturalConsiderations: string[];
}

/**
 * Predictive adherence model output
 */
export interface AdherencePrediction {
  patientId: string;
  medicationId?: string;
  predictionDate: Date;
  predictedAdherence: number; // 0-100 predicted adherence rate
  confidence: number; // 0-1 confidence score
  riskFactors: {
    factor: string;
    impact: number; // -100 to 100 (negative = risk, positive = protective)
    description: string;
  }[];
  recommendations: {
    action: string;
    priority: 'high' | 'medium' | 'low';
    expectedImprovement: number; // percentage improvement expected
  }[];
  basedOnDays: number; // Number of days of historical data used
}

/**
 * Adherence improvement suggestion
 */
export interface AdherenceImprovement {
  id: string;
  patientId: string;
  medicationId?: string;
  suggestion: string;
  category: 'timing' | 'reminder' | 'cultural' | 'family' | 'routine';
  priority: 'high' | 'medium' | 'low';
  expectedImprovement: number; // percentage
  culturallyRelevant: boolean;
  implementation: {
    automatic: boolean;
    requiresConsent: boolean;
    steps: string[];
  };
  createdAt: Date;
  appliedAt?: Date;
  effectiveness?: number; // measured improvement after application
}

/**
 * Provider report data structure
 */
export interface AdherenceReport {
  id: string;
  patientId: string;
  providerId: string;
  reportType: 'weekly' | 'monthly' | 'quarterly' | 'custom';
  startDate: Date;
  endDate: Date;
  overallAdherence: number;
  medications: {
    medication: Medication;
    adherence: number;
    doses: {
      total: number;
      taken: number;
      missed: number;
      late: number;
    };
    patterns: string[];
    concerns: string[];
  }[];
  trends: {
    improving: boolean;
    weekOverWeek: number; // percentage change
    monthOverMonth: number;
  };
  culturalFactors: string[];
  recommendations: string[];
  generatedAt: Date;
  sentAt?: Date;
  viewedAt?: Date;
}

/**
 * Family involvement tracking
 */
export interface FamilyInvolvement {
  patientId: string;
  familyMemberId: string;
  relationshipType: 'spouse' | 'parent' | 'child' | 'sibling' | 'caregiver' | 'other';
  involvementLevel: 'view_only' | 'remind' | 'manage' | 'emergency';
  notificationPreferences: {
    achievements: boolean;
    missedDoses: boolean;
    reports: boolean;
    emergencies: boolean;
  };
  lastActiveDate: Date;
  supportActions: {
    date: Date;
    action: 'reminded' | 'helped' | 'celebrated' | 'reported';
    medicationId?: string;
    notes?: string;
  }[];
}

/**
 * Adherence analytics event for tracking
 */
export interface AdherenceAnalyticsEvent {
  eventType: 'dose_taken' | 'dose_missed' | 'streak_achieved' | 'milestone_reached' |
             'improvement_applied' | 'report_generated' | 'family_action';
  patientId: string;
  medicationId?: string;
  timestamp: Date;
  metadata: Record<string, any>;
  culturalContext?: {
    isDuringPrayer: boolean;
    isDuringFasting: boolean;
    festival?: CulturalTheme;
  };
  deviceInfo?: {
    platform: string;
    version: string;
    timezone: string;
  };
}

/**
 * Configuration for adherence tracking
 */
export interface AdherenceConfig {
  patientId: string;
  enableStreaks: boolean;
  enableMilestones: boolean;
  enablePredictions: boolean;
  enableFamilySharing: boolean;
  culturalPreferences: {
    celebrationThemes: CulturalTheme[];
    languagePreference: 'en' | 'ms' | 'zh' | 'ta';
    respectPrayerTimes: boolean;
    respectFasting: boolean;
  };
  privacySettings: {
    shareWithProvider: boolean;
    shareWithFamily: boolean;
    anonymizeReports: boolean;
  };
  gamificationLevel: 'none' | 'basic' | 'full';
  reminderIntegration: boolean;
}

/**
 * Batch adherence update for offline sync
 */
export interface AdherenceBatchUpdate {
  id: string;
  patientId: string;
  records: AdherenceRecord[];
  events: AdherenceAnalyticsEvent[];
  syncedAt?: Date;
  offlineDuration: number; // milliseconds
  conflicts: {
    recordId: string;
    conflictType: 'duplicate' | 'timing' | 'status';
    resolution: 'local' | 'remote' | 'merged';
  }[];
}

/**
 * Adherence cache entry for offline support
 */
export interface AdherenceCacheEntry {
  key: string;
  type: 'record' | 'metrics' | 'streak' | 'milestone' | 'prediction';
  data: any;
  timestamp: Date;
  expiresAt: Date;
  syncStatus: 'synced' | 'pending' | 'conflict';
}