/**
 * Adherence Tracking Types
 *
 * Comprehensive adherence tracking system with cultural intelligence
 * for Malaysian healthcare context.
 */

import { Medication } from './medication';

// Core Adherence Types
export interface AdherenceRecord {
  id: string;
  medicationId: string;
  patientId: string;
  scheduledTime: Date;
  takenTime?: Date;
  status: AdherenceStatus;
  adherenceScore: number; // 0-100
  method: AdherenceMethod;
  delayMinutes?: number;
  culturalContext?: CulturalAdherenceContext;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type AdherenceStatus =
  | 'taken_on_time'    // Within 30 min window
  | 'taken_late'       // After 30 min window
  | 'taken_early'      // Before scheduled time
  | 'missed'           // Not taken at all
  | 'skipped'          // Intentionally skipped
  | 'pending'          // Not yet due
  | 'adjusted';        // Cultural/prayer time adjustment

export type AdherenceMethod =
  | 'automatic'        // System detected
  | 'manual'          // User logged
  | 'reminder_response' // Via reminder
  | 'family_reported'  // Family member reported
  | 'voice_confirmed'  // Voice assistant
  | 'nfc_scan';       // NFC tag scan

// Progress Metrics
export interface ProgressMetrics {
  patientId: string;
  period: MetricPeriod;
  startDate: Date;
  endDate: Date;
  overallAdherence: number; // 0-100
  medications: MedicationAdherenceMetric[];
  streaks: StreakData;
  patterns: AdherencePattern[];
  predictions: AdherencePrediction[];
  culturalInsights: CulturalInsight[];
}

export interface MedicationAdherenceMetric {
  medicationId: string;
  medicationName: string;
  adherenceRate: number; // 0-100
  totalDoses: number;
  takenDoses: number;
  missedDoses: number;
  lateDoses: number;
  earlyDoses: number;
  averageDelayMinutes: number;
  bestTimeAdherence: TimeSlot;
  worstTimeAdherence: TimeSlot;
  trends: AdherenceTrend[];
}

export type MetricPeriod =
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'quarterly'
  | 'yearly'
  | 'custom';

// Streak Management
export interface StreakData {
  currentStreak: number;
  longestStreak: number;
  streakStartDate?: Date;
  longestStreakDates?: {
    start: Date;
    end: Date;
  };
  weeklyStreaks: number[];
  monthlyStreaks: number[];
  recoverable: boolean; // Can recover from missed dose
  recoveryWindow?: number; // Hours to recover
}

export interface StreakMilestone {
  id: string;
  type: 'days' | 'weeks' | 'months';
  value: number;
  achievedAt?: Date;
  celebrationShown: boolean;
  culturalTheme?: string;
  rewardType?: 'badge' | 'celebration' | 'achievement';
}

// Adherence Patterns & Analytics
export interface AdherencePattern {
  id: string;
  type: PatternType;
  confidence: number; // 0-1
  description: string;
  occurrences: number;
  lastOccurred: Date;
  affectedMedications: string[];
  recommendations: string[];
  culturalFactors?: string[];
}

export type PatternType =
  | 'morning_consistency'
  | 'evening_missed'
  | 'weekend_decline'
  | 'prayer_time_conflict'
  | 'fasting_adjustment'
  | 'meal_timing_issue'
  | 'work_schedule_conflict'
  | 'travel_disruption'
  | 'festival_period_change'
  | 'improvement_trend'
  | 'declining_trend';

export interface AdherenceTrend {
  date: Date;
  adherenceRate: number;
  dosesScheduled: number;
  dosesTaken: number;
  confidence: number;
  predictedRate?: number;
}

// Predictive Analytics
export interface AdherencePrediction {
  medicationId?: string;
  timeframe: PredictionTimeframe;
  predictedRate: number;
  confidence: number;
  riskLevel: RiskLevel;
  factors: PredictionFactor[];
  recommendations: PredictionRecommendation[];
}

export type PredictionTimeframe =
  | 'next_dose'
  | 'next_24h'
  | 'next_week'
  | 'next_month';

export type RiskLevel =
  | 'low'      // >80% predicted adherence
  | 'medium'   // 60-80% predicted adherence
  | 'high'     // 40-60% predicted adherence
  | 'critical'; // <40% predicted adherence

export interface PredictionFactor {
  type: string;
  impact: number; // -1 to 1
  description: string;
}

export interface PredictionRecommendation {
  priority: 'high' | 'medium' | 'low';
  action: string;
  expectedImprovement: number;
  culturallyAppropriate: boolean;
}

// Cultural Intelligence
export interface CulturalAdherenceContext {
  prayerTime?: string;
  fastingPeriod?: boolean;
  festivalName?: string;
  familyInvolvement?: boolean;
  mealTiming?: 'before_meal' | 'after_meal' | 'with_meal';
  traditionalMedicineInteraction?: boolean;
}

export interface CulturalInsight {
  type: CulturalInsightType;
  description: string;
  adherenceImpact: number; // -100 to 100
  occurrences: number;
  recommendations: string[];
  culturalSensitivity: 'high' | 'medium' | 'low';
}

export type CulturalInsightType =
  | 'prayer_time_optimization'
  | 'ramadan_adjustment'
  | 'festival_period_pattern'
  | 'family_support_benefit'
  | 'traditional_medicine_conflict'
  | 'meal_timing_preference'
  | 'cultural_celebration_impact';

// Time-based Analysis
export interface TimeSlot {
  hour: number; // 0-23
  minute: number; // 0-59
  adherenceRate: number;
  totalDoses: number;
  culturalSignificance?: string;
}

export interface DayOfWeekAnalysis {
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  adherenceRate: number;
  patterns: string[];
  culturalEvents?: string[];
}

// Milestone & Achievement
export interface AdherenceMilestone {
  id: string;
  type: MilestoneType;
  threshold: number;
  name: string;
  description: string;
  culturalTheme: CulturalTheme;
  achievedDate?: Date;
  celebrationShown: boolean;
  shareable: boolean;
  rewardPoints?: number;
}

export type MilestoneType =
  | 'streak_days'
  | 'adherence_rate'
  | 'consistency'
  | 'improvement'
  | 'perfect_week'
  | 'perfect_month'
  | 'recovery'
  | 'family_support';

export interface CulturalTheme {
  name: string;
  primaryColor: string;
  secondaryColor: string;
  icon: string;
  animation?: string;
  soundEffect?: string;
  message: {
    en: string;
    ms: string;
    zh?: string;
    ta?: string;
  };
}

// Provider Reporting
export interface AdherenceReport {
  id: string;
  patientId: string;
  generatedAt: Date;
  periodStart: Date;
  periodEnd: Date;
  overallAdherence: number;
  medications: MedicationAdherenceReport[];
  insights: string[];
  recommendations: string[];
  culturalConsiderations: string[];
  providerNotes?: string;
  fhirResource?: any; // FHIR MedicationStatement
}

export interface MedicationAdherenceReport {
  medication: Medication;
  adherenceRate: number;
  trends: 'improving' | 'stable' | 'declining';
  missedDosePatterns: string[];
  culturalFactors: string[];
  recommendations: string[];
}

// Calculation Configuration
export interface AdherenceCalculationConfig {
  onTimeWindowMinutes: number; // Default: 30
  lateWindowHours: number; // Default: 2
  streakRecoveryHours: number; // Default: 24
  minimumAdherenceThreshold: number; // Default: 80
  culturalAdjustmentEnabled: boolean;
  prayerTimeBufferMinutes: number; // Default: 15
  familyReportingEnabled: boolean;
  predictiveAnalyticsEnabled: boolean;
}

// Cache & Performance
export interface AdherenceCache {
  patientId: string;
  lastCalculated: Date;
  metrics: ProgressMetrics;
  ttl: number; // seconds
  invalidateOn: string[]; // Events that invalidate cache
}

// Export aggregated types for convenience
export interface AdherenceState {
  records: Record<string, AdherenceRecord>;
  metrics: Record<string, ProgressMetrics>;
  streaks: Record<string, StreakData>;
  patterns: AdherencePattern[];
  predictions: AdherencePrediction[];
  milestones: AdherenceMilestone[];
  reports: AdherenceReport[];
  config: AdherenceCalculationConfig;
  cache: Record<string, AdherenceCache>;
}

// Utility types for API responses
export interface AdherenceApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
}

export interface AdherenceBatchUpdate {
  records: Partial<AdherenceRecord>[];
  source: 'sync' | 'manual' | 'import';
  timestamp: Date;
}