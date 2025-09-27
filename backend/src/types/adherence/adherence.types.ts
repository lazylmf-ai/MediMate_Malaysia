/**
 * Adherence Tracking Types
 * Malaysian-specific adherence analytics with cultural considerations
 */

export interface AdherenceRecord {
  id: string;
  medicationId: string;
  patientId: string;
  scheduledTime: Date;
  takenTime?: Date;
  status: AdherenceStatus;
  adherenceScore: number;
  notes?: string;
  culturalContext: AdherenceCulturalContext;
  createdAt: Date;
  updatedAt: Date;
}

export type AdherenceStatus = 'taken' | 'missed' | 'late' | 'skipped' | 'pending';

export interface AdherenceCulturalContext {
  prayerTimeConflict: boolean;
  fastingPeriod: boolean;
  festivalPeriod?: string;
  familySupport: boolean;
  traditionalMedicineUsed: boolean;
  reasonCode?: CulturalReasonCode;
}

export type CulturalReasonCode =
  | 'prayer_time_delay'
  | 'fasting_exemption'
  | 'festival_celebration'
  | 'family_gathering'
  | 'traditional_medicine_preference'
  | 'work_schedule_conflict'
  | 'travel_disruption';

export interface ProgressMetrics {
  patientId: string;
  period: TimePeriod;
  adherenceRate: number;
  streakCount: number;
  longestStreak: number;
  totalDoses: number;
  takenDoses: number;
  missedDoses: number;
  lateDoses: number;
  skippedDoses: number;
  culturalAdjustments: CulturalAdjustmentMetrics;
  calculatedAt: Date;
}

export type TimePeriod = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';

export interface CulturalAdjustmentMetrics {
  ramadanAdjustments: number;
  prayerTimeDelays: number;
  festivalExemptions: number;
  familyCoordinationImpact: number;
  traditionalMedicineInteractions: number;
}

export interface Milestone {
  id: string;
  patientId: string;
  type: MilestoneType;
  threshold: number;
  culturalTheme: MalaysianCulturalTheme;
  achievedDate?: Date;
  celebrationShown: boolean;
  familyNotified: boolean;
  metadata: MilestoneMetadata;
}

export type MilestoneType = 'streak' | 'adherence_rate' | 'consistency' | 'cultural_adaptation' | 'family_coordination';

export type MalaysianCulturalTheme =
  | 'hibiscus_excellence' // National flower
  | 'wau_dedication' // Traditional kite representing perseverance
  | 'ketupat_consistency' // Ramadan symbol of completion
  | 'batik_pattern' // Representing cultural heritage
  | 'orangutan_strength' // Malaysian wildlife symbol
  | 'towers_achievement' // Petronas Towers representing Malaysian pride
  | 'hornbill_wisdom' // Sarawak state bird
  | 'moon_crescent' // Islamic symbol
  | 'unity_1malaysia' // National unity theme
  | 'kampong_spirit'; // Community togetherness

export interface MilestoneMetadata {
  description: string;
  descriptionMs: string;
  celebrationMessage: string;
  celebrationMessageMs: string;
  badgeIcon: string;
  culturalSignificance: string;
  shareableContent: ShareableContent;
}

export interface ShareableContent {
  image: string;
  text: string;
  textMs: string;
  hashtags: string[];
}

export interface StreakData {
  patientId: string;
  medicationId?: string; // Optional for overall streak
  currentStreak: number;
  longestStreak: number;
  streakType: StreakType;
  startDate: Date;
  lastDoseDate?: Date;
  culturalBonus: number; // Extra points for cultural compliance
  streakStatus: StreakStatus;
}

export type StreakType = 'daily' | 'weekly' | 'monthly' | 'cultural_period';
export type StreakStatus = 'active' | 'broken' | 'recovering' | 'paused';

export interface FamilyAdherenceMetrics {
  familyId: string;
  headOfFamily: string;
  memberMetrics: Array<{
    memberId: string;
    role: FamilyRole;
    adherenceRate: number;
    supportProvided: number;
    supportReceived: number;
  }>;
  familyAdherenceRate: number;
  coordinationScore: number;
  culturalHarmony: number;
  lastUpdated: Date;
}

export type FamilyRole = 'head' | 'spouse' | 'parent' | 'child' | 'elderly' | 'caregiver';

export interface AdherencePrediction {
  patientId: string;
  medicationId: string;
  nextDoseTime: Date;
  adherenceProbability: number;
  riskFactors: RiskFactor[];
  culturalFactors: CulturalFactor[];
  recommendations: AdherenceRecommendation[];
  confidence: number;
  modelVersion: string;
  predictedAt: Date;
}

export interface RiskFactor {
  factor: string;
  impact: number; // -1 to 1
  confidence: number;
  mitigation?: string;
}

export interface CulturalFactor {
  factor: CulturalFactorType;
  impact: number;
  timeWindow: { start: Date; end: Date };
  adjustment: string;
}

export type CulturalFactorType =
  | 'ramadan_fasting'
  | 'prayer_schedule'
  | 'festival_period'
  | 'family_gathering'
  | 'traditional_healing'
  | 'work_schedule'
  | 'travel_period';

export interface AdherenceRecommendation {
  type: RecommendationType;
  message: string;
  messageMs: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  actionRequired: boolean;
  culturalSensitive: boolean;
}

export type RecommendationType =
  | 'timing_adjustment'
  | 'family_support'
  | 'cultural_accommodation'
  | 'reminder_enhancement'
  | 'medical_consultation'
  | 'traditional_integration';

export interface AdherenceAnalytics {
  patientId: string;
  analysisType: AnalysisType;
  timeframe: { start: Date; end: Date };
  insights: AdherenceInsight[];
  patterns: AdherencePattern[];
  culturalObservations: CulturalObservation[];
  generatedAt: Date;
}

export type AnalysisType = 'individual' | 'family' | 'medication' | 'cultural' | 'predictive';

export interface AdherenceInsight {
  category: InsightCategory;
  insight: string;
  insightMs: string;
  impact: 'positive' | 'negative' | 'neutral';
  actionable: boolean;
  culturalRelevance: number;
}

export type InsightCategory =
  | 'timing_patterns'
  | 'cultural_impact'
  | 'family_dynamics'
  | 'seasonal_variations'
  | 'medication_specific'
  | 'behavioral_trends';

export interface AdherencePattern {
  pattern: string;
  frequency: number;
  strength: number;
  timeContext: string[];
  culturalContext: string[];
  recommendations: string[];
}

export interface CulturalObservation {
  observation: string;
  observationMs: string;
  culturalSignificance: number;
  impact: AdherenceImpact;
  suggestion: string;
  suggestionMs: string;
}

export interface AdherenceImpact {
  adherenceChange: number;
  timingFlexibility: number;
  familyInvolvement: number;
  culturalHarmony: number;
}

export interface AdherenceConfiguration {
  patientId: string;
  culturalPreferences: CulturalPreferences;
  familySettings: FamilySettings;
  notificationSettings: NotificationSettings;
  analyticsSettings: AnalyticsSettings;
}

export interface CulturalPreferences {
  primaryLanguage: 'ms' | 'en' | 'zh' | 'ta';
  religiousObservance: ReligiousObservance;
  festivalPriorities: string[];
  traditionMedicineIntegration: boolean;
  familyInvolvementLevel: 'minimal' | 'moderate' | 'high';
}

export interface ReligiousObservance {
  religion: 'islam' | 'christianity' | 'buddhism' | 'hinduism' | 'other' | 'none';
  observanceLevel: 'strict' | 'moderate' | 'flexible';
  prayerTimePreferences: string[];
  fastingPeriods: string[];
}

export interface FamilySettings {
  allowFamilyTracking: boolean;
  shareProgressWithFamily: boolean;
  familyNotifications: boolean;
  coordinationLevel: 'independent' | 'coordinated' | 'dependent';
}

export interface NotificationSettings {
  adherenceReminders: boolean;
  progressCelebrations: boolean;
  familyUpdates: boolean;
  culturalAdaptations: boolean;
  preferredTiming: string[];
}

export interface AnalyticsSettings {
  enablePredictiveAnalytics: boolean;
  culturalFactorAnalysis: boolean;
  familyAnalytics: boolean;
  shareWithProviders: boolean;
  dataRetentionPeriod: number; // days
}

// Provider reporting interfaces
export interface ProviderAdherenceReport {
  reportId: string;
  patientId: string;
  providerId: string;
  reportType: ProviderReportType;
  period: { start: Date; end: Date };
  summary: AdherenceSummary;
  details: AdherenceDetails;
  culturalConsiderations: CulturalConsiderations;
  recommendations: ProviderRecommendation[];
  generatedAt: Date;
  fhirCompliant: boolean;
}

export type ProviderReportType = 'weekly' | 'monthly' | 'quarterly' | 'annual' | 'custom';

export interface AdherenceSummary {
  overallAdherenceRate: number;
  medicationSpecificRates: Array<{
    medicationId: string;
    medicationName: string;
    adherenceRate: number;
  }>;
  trends: TrendIndicator[];
  riskLevel: 'low' | 'moderate' | 'high' | 'critical';
}

export interface TrendIndicator {
  metric: string;
  trend: 'improving' | 'stable' | 'declining';
  changePercentage: number;
  timeframe: string;
}

export interface AdherenceDetails {
  dailyPatterns: DailyPattern[];
  missedDoseAnalysis: MissedDoseAnalysis;
  culturalImpactAnalysis: CulturalImpactAnalysis;
  familyInvolvementMetrics: FamilyInvolvementMetrics;
}

export interface DailyPattern {
  timeSlot: string;
  adherenceRate: number;
  commonIssues: string[];
  culturalFactors: string[];
}

export interface MissedDoseAnalysis {
  totalMissedDoses: number;
  commonReasons: Array<{
    reason: string;
    frequency: number;
    culturallyRelated: boolean;
  }>;
  timePatterns: string[];
  recommendations: string[];
}

export interface CulturalImpactAnalysis {
  overallCulturalAdherence: number;
  festivalPeriodImpact: number;
  prayerTimeAccommodation: number;
  familyInfluence: number;
  traditionalMedicineIntegration: number;
  observations: string[];
}

export interface FamilyInvolvementMetrics {
  familyParticipation: number;
  supportReceived: number;
  supportProvided: number;
  coordinationEffectiveness: number;
  culturalHarmony: number;
}

export interface CulturalConsiderations {
  activeObservances: string[];
  upcomingEvents: Array<{
    event: string;
    date: Date;
    expectedImpact: string;
  }>;
  accommodationsNeeded: string[];
  culturalStrengths: string[];
}

export interface ProviderRecommendation {
  category: ProviderRecommendationCategory;
  recommendation: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  culturalSensitive: boolean;
  actionRequired: boolean;
  timeframe: string;
}

export type ProviderRecommendationCategory =
  | 'medication_adjustment'
  | 'timing_modification'
  | 'cultural_accommodation'
  | 'family_involvement'
  | 'behavioral_intervention'
  | 'monitoring_increase';

// Statistical analysis interfaces
export interface AdherenceStatistics {
  population: PopulationMetrics;
  individual: IndividualMetrics;
  cultural: CulturalMetrics;
  temporal: TemporalMetrics;
  comparative: ComparativeMetrics;
}

export interface PopulationMetrics {
  totalPatients: number;
  averageAdherence: number;
  adherenceDistribution: AdherenceDistribution;
  culturalGroupBreakdown: CulturalGroupMetrics[];
  riskStratification: RiskStratification;
}

export interface AdherenceDistribution {
  excellent: number; // >90%
  good: number; // 80-90%
  moderate: number; // 60-80%
  poor: number; // <60%
}

export interface CulturalGroupMetrics {
  ethnicity: string;
  religion: string;
  averageAdherence: number;
  uniquePatterns: string[];
  commonChallenges: string[];
  successFactors: string[];
}

export interface RiskStratification {
  lowRisk: number;
  moderateRisk: number;
  highRisk: number;
  criticalRisk: number;
}

export interface IndividualMetrics {
  patientId: string;
  adherenceTrend: TrendData[];
  personalizedInsights: PersonalizedInsight[];
  culturalAlignment: number;
  familyImpact: number;
  predictiveRisk: number;
}

export interface TrendData {
  period: string;
  adherenceRate: number;
  culturalEvents: string[];
  familySupport: number;
  notes: string[];
}

export interface PersonalizedInsight {
  insight: string;
  insightMs: string;
  confidence: number;
  actionable: boolean;
  culturalRelevance: number;
  implementationComplexity: 'low' | 'medium' | 'high';
}

export interface CulturalMetrics {
  festivalImpact: FestivalImpactMetrics;
  prayerTimeAlignment: PrayerTimeMetrics;
  traditionalMedicineIntegration: TraditionalMedicineMetrics;
  familyDynamics: FamilyDynamicsMetrics;
}

export interface FestivalImpactMetrics {
  festival: string;
  adherenceChange: number;
  durationDays: number;
  accommodationSuccessRate: number;
  commonAdjustments: string[];
}

export interface PrayerTimeMetrics {
  alignmentRate: number;
  averageDelay: number; // minutes
  accommodationMethods: string[];
  effectivenessScore: number;
}

export interface TraditionalMedicineMetrics {
  integrationRate: number;
  conflictFrequency: number;
  resolutionMethods: string[];
  patientSatisfaction: number;
}

export interface FamilyDynamicsMetrics {
  involvementLevel: number;
  supportEffectiveness: number;
  coordinationSuccess: number;
  culturalHarmonyScore: number;
}

export interface TemporalMetrics {
  seasonalVariations: SeasonalVariation[];
  weeklyPatterns: WeeklyPattern[];
  dailyOptimalTimes: string[];
  culturalEventCorrelations: EventCorrelation[];
}

export interface SeasonalVariation {
  season: string;
  adherenceChange: number;
  culturalFactors: string[];
  recommendations: string[];
}

export interface WeeklyPattern {
  dayOfWeek: string;
  adherenceRate: number;
  commonChallenges: string[];
  successStrategies: string[];
}

export interface EventCorrelation {
  event: string;
  adherenceImpact: number;
  duration: string;
  mitigation: string[];
}

export interface ComparativeMetrics {
  peerComparison: PeerComparison;
  culturalComparison: CulturalComparison;
  medicationComparison: MedicationComparison;
  progressiveComparison: ProgressiveComparison;
}

export interface PeerComparison {
  similarPatients: SimilarPatient[];
  relativePeformance: number;
  improvementOpportunities: string[];
  successFactors: string[];
}

export interface SimilarPatient {
  demographicMatch: number;
  culturalMatch: number;
  adherenceRate: number;
  successStrategies: string[];
}

export interface CulturalComparison {
  withinCulturalGroup: number;
  crossCulturalAverage: number;
  culturalAdvantages: string[];
  adaptationSuggestions: string[];
}

export interface MedicationComparison {
  medicationId: string;
  relativeAdherence: number;
  culturalAcceptance: number;
  optimizationSuggestions: string[];
}

export interface ProgressiveComparison {
  monthOverMonth: number;
  quarterOverQuarter: number;
  yearOverYear: number;
  trendDirection: 'improving' | 'stable' | 'declining';
  accelerationFactor: number;
}