/**
 * PredictiveAdherenceEngine.ts
 * Advanced predictive analytics engine for medication adherence
 * Uses machine learning patterns to predict future adherence and identify risks
 */

import {
  AdherenceRecord,
  AdherencePrediction,
  ProgressMetrics,
  CulturalPattern,
  AdherenceImprovement,
  AdherenceAnalyticsEvent
} from '../../types/adherence';
import { CulturalPatternAnalyzer } from './CulturalPatternAnalyzer';
import { AdherenceCalculationEngine } from './AdherenceCalculationEngine';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Risk factor for adherence prediction
 */
interface RiskFactor {
  name: string;
  weight: number;
  value: number;
  category: 'behavioral' | 'environmental' | 'medical' | 'cultural' | 'technical';
}

/**
 * Prediction model features
 */
interface PredictionFeatures {
  // Historical features
  historicalAdherence: number;
  recentAdherence: number; // Last 7 days
  adherenceTrend: number; // Positive or negative trend
  streakStability: number;

  // Timing features
  timingConsistency: number;
  averageDelay: number;
  missedDosePattern: number;

  // Cultural features
  prayerTimeAlignment: number;
  festivalImpact: number;
  fastingAdherence: number;

  // Environmental features
  weekdayVsWeekend: number;
  morningVsEvening: number;
  reminderResponseRate: number;

  // Medical features
  medicationComplexity: number;
  sideEffectReports: number;
  doseFrequency: number;

  // Social features
  familySupport: number;
  communityEngagement: number;
}

/**
 * Time series data point for trend analysis
 */
interface TimeSeriesPoint {
  date: Date;
  adherence: number;
  eventCount: number;
}

export class PredictiveAdherenceEngine {
  private static instance: PredictiveAdherenceEngine;
  private cacheKey = '@MediMate:Predictions';
  private culturalAnalyzer: CulturalPatternAnalyzer;
  private calculationEngine: AdherenceCalculationEngine;
  private modelWeights: Map<string, number> = new Map();

  private constructor() {
    this.culturalAnalyzer = CulturalPatternAnalyzer.getInstance();
    this.calculationEngine = AdherenceCalculationEngine.getInstance();
    this.initializeModelWeights();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): PredictiveAdherenceEngine {
    if (!PredictiveAdherenceEngine.instance) {
      PredictiveAdherenceEngine.instance = new PredictiveAdherenceEngine();
    }
    return PredictiveAdherenceEngine.instance;
  }

  /**
   * Initialize model weights for prediction
   */
  private initializeModelWeights(): void {
    // Feature weights based on research and Malaysian healthcare patterns
    this.modelWeights.set('historicalAdherence', 0.25);
    this.modelWeights.set('recentAdherence', 0.20);
    this.modelWeights.set('adherenceTrend', 0.15);
    this.modelWeights.set('culturalFactors', 0.15);
    this.modelWeights.set('timingConsistency', 0.10);
    this.modelWeights.set('familySupport', 0.08);
    this.modelWeights.set('reminderResponse', 0.07);
  }

  /**
   * Predict future adherence for a patient
   */
  public async predictAdherence(
    patientId: string,
    records: AdherenceRecord[],
    medicationId?: string,
    daysAhead: number = 30
  ): Promise<AdherencePrediction> {
    // Filter records by medication if specified
    const relevantRecords = medicationId
      ? records.filter(r => r.medicationId === medicationId)
      : records;

    // Check cache first
    const cached = await this.getCachedPrediction(patientId, medicationId);
    if (cached && this.isCacheValid(cached)) {
      return cached;
    }

    // Extract features from historical data
    const features = await this.extractFeatures(relevantRecords, patientId);

    // Calculate base prediction
    const basePrediction = this.calculateBasePrediction(features);

    // Identify risk factors
    const riskFactors = await this.identifyRiskFactors(features, relevantRecords);

    // Adjust prediction based on risk factors
    const adjustedPrediction = this.adjustPrediction(basePrediction, riskFactors);

    // Generate recommendations
    const recommendations = await this.generateRecommendations(
      features,
      riskFactors,
      adjustedPrediction
    );

    // Calculate confidence
    const confidence = this.calculateConfidence(relevantRecords.length, features);

    const prediction: AdherencePrediction = {
      patientId,
      medicationId,
      predictionDate: new Date(),
      predictedAdherence: Math.round(adjustedPrediction * 100) / 100,
      confidence,
      riskFactors: riskFactors.map(rf => ({
        factor: rf.name,
        impact: rf.weight * rf.value * 100,
        description: this.getRiskFactorDescription(rf)
      })),
      recommendations,
      basedOnDays: this.calculateDataDays(relevantRecords)
    };

    // Cache the prediction
    await this.cachePrediction(prediction);

    return prediction;
  }

  /**
   * Extract features from historical records
   */
  private async extractFeatures(
    records: AdherenceRecord[],
    patientId: string
  ): Promise<PredictionFeatures> {
    // Sort records by date
    const sortedRecords = [...records].sort(
      (a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime()
    );

    // Calculate historical adherence
    const totalRecords = sortedRecords.length;
    const takenRecords = sortedRecords.filter(
      r => r.status === 'taken' || r.status === 'late'
    ).length;
    const historicalAdherence = totalRecords > 0 ? takenRecords / totalRecords : 0;

    // Calculate recent adherence (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentRecords = sortedRecords.filter(
      r => r.scheduledTime >= sevenDaysAgo
    );
    const recentTaken = recentRecords.filter(
      r => r.status === 'taken' || r.status === 'late'
    ).length;
    const recentAdherence = recentRecords.length > 0
      ? recentTaken / recentRecords.length
      : historicalAdherence;

    // Calculate adherence trend
    const adherenceTrend = this.calculateTrend(sortedRecords);

    // Calculate streak stability
    const streakInfo = await this.calculationEngine.calculateStreaks(sortedRecords, patientId);
    const streakStability = this.calculateStreakStability(streakInfo);

    // Calculate timing consistency
    const timingConsistency = this.calculateTimingConsistency(sortedRecords);

    // Calculate average delay
    const averageDelay = this.calculateAverageDelay(sortedRecords);

    // Calculate missed dose pattern
    const missedDosePattern = this.analyzeMissedDosePattern(sortedRecords);

    // Get cultural features
    const culturalPattern = await this.culturalAnalyzer.loadCachedPattern(patientId) ||
      await this.culturalAnalyzer.analyzeCulturalPatterns(sortedRecords, patientId);

    const prayerTimeAlignment = Object.values(culturalPattern.observations.prayerTimeAdherence)
      .reduce((a, b) => a + b, 0) / 500; // Normalized to 0-1

    const festivalAdherences = Object.values(culturalPattern.observations.festivalAdherence);
    const festivalImpact = festivalAdherences.length > 0
      ? festivalAdherences.reduce((a, b) => a + b, 0) / (festivalAdherences.length * 100)
      : 1;

    const fastingAdherence = culturalPattern.observations.fastingPeriodAdherence / 100;

    // Calculate environmental features
    const { weekdayVsWeekend, morningVsEvening } = this.calculateEnvironmentalFeatures(sortedRecords);

    // Calculate reminder response rate
    const reminderResponseRate = this.calculateReminderResponseRate(sortedRecords);

    // Calculate medical features
    const medicationComplexity = this.calculateMedicationComplexity(sortedRecords);
    const doseFrequency = this.calculateDoseFrequency(sortedRecords);

    // Calculate social features
    const familySupport = culturalPattern.observations.familyInfluence / 100;

    return {
      historicalAdherence,
      recentAdherence,
      adherenceTrend,
      streakStability,
      timingConsistency,
      averageDelay,
      missedDosePattern,
      prayerTimeAlignment,
      festivalImpact,
      fastingAdherence,
      weekdayVsWeekend,
      morningVsEvening,
      reminderResponseRate,
      medicationComplexity,
      sideEffectReports: 0, // Would come from side effect tracking system
      doseFrequency,
      familySupport,
      communityEngagement: 0.5 // Default value, would come from community features
    };
  }

  /**
   * Calculate adherence trend over time
   */
  private calculateTrend(records: AdherenceRecord[]): number {
    if (records.length < 14) return 0; // Need at least 2 weeks of data

    // Create weekly buckets
    const weeklyAdherence: number[] = [];
    const sortedRecords = [...records].sort(
      (a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime()
    );

    const firstDate = sortedRecords[0].scheduledTime;
    const lastDate = sortedRecords[sortedRecords.length - 1].scheduledTime;
    const weeks = Math.ceil((lastDate.getTime() - firstDate.getTime()) / (7 * 24 * 60 * 60 * 1000));

    for (let week = 0; week < weeks; week++) {
      const weekStart = new Date(firstDate);
      weekStart.setDate(weekStart.getDate() + week * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 7);

      const weekRecords = sortedRecords.filter(
        r => r.scheduledTime >= weekStart && r.scheduledTime < weekEnd
      );

      if (weekRecords.length > 0) {
        const taken = weekRecords.filter(
          r => r.status === 'taken' || r.status === 'late'
        ).length;
        weeklyAdherence.push(taken / weekRecords.length);
      }
    }

    // Calculate linear regression slope
    if (weeklyAdherence.length < 2) return 0;

    const n = weeklyAdherence.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = weeklyAdherence.reduce((a, b) => a + b, 0);
    const sumXY = weeklyAdherence.reduce((sum, y, x) => sum + x * y, 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);

    return Math.max(-1, Math.min(1, slope)); // Normalize to -1 to 1
  }

  /**
   * Calculate streak stability
   */
  private calculateStreakStability(streakInfo: any): number {
    if (streakInfo.streakHistory.length === 0) return 0;

    const streakLengths = streakInfo.streakHistory.map((s: any) => s.length);
    const avgStreak = streakLengths.reduce((a, b) => a + b, 0) / streakLengths.length;

    // Calculate variance
    const variance = streakLengths.reduce((sum, length) => {
      return sum + Math.pow(length - avgStreak, 2);
    }, 0) / streakLengths.length;

    // Lower variance = higher stability
    const stability = 1 / (1 + Math.sqrt(variance));

    return stability;
  }

  /**
   * Calculate timing consistency
   */
  private calculateTimingConsistency(records: AdherenceRecord[]): number {
    const takenRecords = records.filter(r => r.takenTime && r.scheduledTime);

    if (takenRecords.length === 0) return 0;

    const delays = takenRecords.map(r => {
      const diff = Math.abs(r.takenTime!.getTime() - r.scheduledTime.getTime());
      return diff / (1000 * 60); // Convert to minutes
    });

    // Calculate standard deviation
    const mean = delays.reduce((a, b) => a + b, 0) / delays.length;
    const variance = delays.reduce((sum, delay) => {
      return sum + Math.pow(delay - mean, 2);
    }, 0) / delays.length;

    const stdDev = Math.sqrt(variance);

    // Convert to consistency score (lower std dev = higher consistency)
    const consistency = Math.exp(-stdDev / 60); // Exponential decay with 60-minute scale

    return consistency;
  }

  /**
   * Calculate average delay in minutes
   */
  private calculateAverageDelay(records: AdherenceRecord[]): number {
    const takenRecords = records.filter(r => r.takenTime && r.scheduledTime);

    if (takenRecords.length === 0) return 0;

    const totalDelay = takenRecords.reduce((sum, r) => {
      const delay = (r.takenTime!.getTime() - r.scheduledTime.getTime()) / (1000 * 60);
      return sum + Math.max(0, delay); // Only count positive delays
    }, 0);

    return totalDelay / takenRecords.length;
  }

  /**
   * Analyze missed dose patterns
   */
  private analyzeMissedDosePattern(records: AdherenceRecord[]): number {
    const missedRecords = records.filter(r => r.status === 'missed');

    if (missedRecords.length === 0) return 1; // Perfect score if no misses

    // Check for consecutive misses
    let consecutiveMisses = 0;
    let maxConsecutive = 0;
    let lastDate: Date | null = null;

    missedRecords.forEach(r => {
      if (lastDate) {
        const daysDiff = (r.scheduledTime.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
        if (daysDiff <= 1.5) {
          consecutiveMisses++;
          maxConsecutive = Math.max(maxConsecutive, consecutiveMisses);
        } else {
          consecutiveMisses = 0;
        }
      }
      lastDate = r.scheduledTime;
    });

    // Pattern score decreases with consecutive misses
    return Math.exp(-maxConsecutive / 3); // Exponential decay
  }

  /**
   * Calculate environmental features
   */
  private calculateEnvironmentalFeatures(records: AdherenceRecord[]): {
    weekdayVsWeekend: number;
    morningVsEvening: number;
  } {
    // Weekday vs Weekend
    const weekdayRecords = records.filter(r => {
      const day = r.scheduledTime.getDay();
      return day >= 1 && day <= 5;
    });

    const weekendRecords = records.filter(r => {
      const day = r.scheduledTime.getDay();
      return day === 0 || day === 6;
    });

    let weekdayVsWeekend = 0.5; // Neutral default

    if (weekdayRecords.length > 0 && weekendRecords.length > 0) {
      const weekdayAdherence = weekdayRecords.filter(
        r => r.status === 'taken' || r.status === 'late'
      ).length / weekdayRecords.length;

      const weekendAdherence = weekendRecords.filter(
        r => r.status === 'taken' || r.status === 'late'
      ).length / weekendRecords.length;

      weekdayVsWeekend = (weekdayAdherence + 1) / (weekdayAdherence + weekendAdherence + 2);
    }

    // Morning vs Evening
    const morningRecords = records.filter(r => {
      const hour = r.scheduledTime.getHours();
      return hour >= 5 && hour < 12;
    });

    const eveningRecords = records.filter(r => {
      const hour = r.scheduledTime.getHours();
      return hour >= 17 && hour < 22;
    });

    let morningVsEvening = 0.5; // Neutral default

    if (morningRecords.length > 0 && eveningRecords.length > 0) {
      const morningAdherence = morningRecords.filter(
        r => r.status === 'taken' || r.status === 'late'
      ).length / morningRecords.length;

      const eveningAdherence = eveningRecords.filter(
        r => r.status === 'taken' || r.status === 'late'
      ).length / eveningRecords.length;

      morningVsEvening = (morningAdherence + 1) / (morningAdherence + eveningAdherence + 2);
    }

    return { weekdayVsWeekend, morningVsEvening };
  }

  /**
   * Calculate reminder response rate
   */
  private calculateReminderResponseRate(records: AdherenceRecord[]): number {
    const recordsWithReminder = records.filter(r => r.reminderSent);

    if (recordsWithReminder.length === 0) return 0.5; // Neutral if no reminders

    const respondedQuickly = recordsWithReminder.filter(r => {
      return r.reminderResponseTime && r.reminderResponseTime < 30 * 60 * 1000; // 30 minutes
    }).length;

    return respondedQuickly / recordsWithReminder.length;
  }

  /**
   * Calculate medication complexity
   */
  private calculateMedicationComplexity(records: AdherenceRecord[]): number {
    // Count unique medications
    const uniqueMedications = new Set(records.map(r => r.medicationId)).size;

    // Count daily doses
    const datesWithDoses = new Map<string, number>();
    records.forEach(r => {
      const dateKey = r.scheduledTime.toDateString();
      datesWithDoses.set(dateKey, (datesWithDoses.get(dateKey) || 0) + 1);
    });

    const avgDailyDoses = Array.from(datesWithDoses.values()).reduce((a, b) => a + b, 0) /
      datesWithDoses.size;

    // Complexity increases with more medications and doses
    const complexity = 1 - Math.exp(-(uniqueMedications * avgDailyDoses) / 10);

    return complexity;
  }

  /**
   * Calculate dose frequency
   */
  private calculateDoseFrequency(records: AdherenceRecord[]): number {
    if (records.length < 2) return 0;

    const sortedRecords = [...records].sort(
      (a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime()
    );

    const intervals: number[] = [];
    for (let i = 1; i < sortedRecords.length; i++) {
      const interval = sortedRecords[i].scheduledTime.getTime() -
        sortedRecords[i - 1].scheduledTime.getTime();
      intervals.push(interval / (1000 * 60 * 60)); // Convert to hours
    }

    const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;

    // Normalize to 0-1 (more frequent = higher value)
    return 1 / (1 + avgInterval / 24);
  }

  /**
   * Calculate base prediction from features
   */
  private calculateBasePrediction(features: PredictionFeatures): number {
    // Weighted combination of features
    let prediction = 0;

    prediction += features.historicalAdherence * (this.modelWeights.get('historicalAdherence') || 0.25);
    prediction += features.recentAdherence * (this.modelWeights.get('recentAdherence') || 0.20);
    prediction += (features.adherenceTrend + 1) / 2 * (this.modelWeights.get('adherenceTrend') || 0.15);

    // Cultural factors
    const culturalScore = (features.prayerTimeAlignment + features.festivalImpact + features.fastingAdherence) / 3;
    prediction += culturalScore * (this.modelWeights.get('culturalFactors') || 0.15);

    prediction += features.timingConsistency * (this.modelWeights.get('timingConsistency') || 0.10);
    prediction += features.familySupport * (this.modelWeights.get('familySupport') || 0.08);
    prediction += features.reminderResponseRate * (this.modelWeights.get('reminderResponse') || 0.07);

    return Math.max(0, Math.min(1, prediction)) * 100; // Convert to percentage
  }

  /**
   * Identify risk factors
   */
  private async identifyRiskFactors(
    features: PredictionFeatures,
    records: AdherenceRecord[]
  ): Promise<RiskFactor[]> {
    const riskFactors: RiskFactor[] = [];

    // Historical adherence risk
    if (features.historicalAdherence < 0.7) {
      riskFactors.push({
        name: 'Low historical adherence',
        weight: 0.3,
        value: 1 - features.historicalAdherence,
        category: 'behavioral'
      });
    }

    // Declining trend risk
    if (features.adherenceTrend < -0.1) {
      riskFactors.push({
        name: 'Declining adherence trend',
        weight: 0.25,
        value: Math.abs(features.adherenceTrend),
        category: 'behavioral'
      });
    }

    // Timing inconsistency risk
    if (features.timingConsistency < 0.5) {
      riskFactors.push({
        name: 'Inconsistent dosing times',
        weight: 0.2,
        value: 1 - features.timingConsistency,
        category: 'behavioral'
      });
    }

    // High average delay
    if (features.averageDelay > 60) {
      riskFactors.push({
        name: 'Frequent late doses',
        weight: 0.15,
        value: Math.min(1, features.averageDelay / 180),
        category: 'behavioral'
      });
    }

    // Poor reminder response
    if (features.reminderResponseRate < 0.3) {
      riskFactors.push({
        name: 'Low reminder effectiveness',
        weight: 0.1,
        value: 1 - features.reminderResponseRate,
        category: 'technical'
      });
    }

    // Weekend adherence drop
    if (features.weekdayVsWeekend > 0.65) {
      riskFactors.push({
        name: 'Weekend adherence drop',
        weight: 0.15,
        value: features.weekdayVsWeekend - 0.5,
        category: 'environmental'
      });
    }

    // Complex medication regimen
    if (features.medicationComplexity > 0.7) {
      riskFactors.push({
        name: 'Complex medication schedule',
        weight: 0.2,
        value: features.medicationComplexity,
        category: 'medical'
      });
    }

    // Prayer time conflicts
    if (features.prayerTimeAlignment < 0.7) {
      riskFactors.push({
        name: 'Prayer time scheduling conflicts',
        weight: 0.15,
        value: 1 - features.prayerTimeAlignment,
        category: 'cultural'
      });
    }

    // Festival period challenges
    if (features.festivalImpact < 0.6) {
      riskFactors.push({
        name: 'Festival period disruption',
        weight: 0.1,
        value: 1 - features.festivalImpact,
        category: 'cultural'
      });
    }

    // Low family support
    if (features.familySupport < 0.2) {
      riskFactors.push({
        name: 'Limited family support',
        weight: 0.15,
        value: 1 - features.familySupport,
        category: 'cultural'
      });
    }

    return riskFactors;
  }

  /**
   * Adjust prediction based on risk factors
   */
  private adjustPrediction(basePrediction: number, riskFactors: RiskFactor[]): number {
    let adjustment = 0;

    for (const risk of riskFactors) {
      adjustment -= risk.weight * risk.value * 20; // Each risk can reduce up to 20%
    }

    return Math.max(0, Math.min(100, basePrediction + adjustment));
  }

  /**
   * Generate recommendations based on prediction
   */
  private async generateRecommendations(
    features: PredictionFeatures,
    riskFactors: RiskFactor[],
    predictedAdherence: number
  ): Promise<AdherencePrediction['recommendations']> {
    const recommendations: AdherencePrediction['recommendations'] = [];

    // Sort risk factors by impact
    const sortedRisks = [...riskFactors].sort((a, b) =>
      (b.weight * b.value) - (a.weight * a.value)
    );

    // Generate recommendations for top risks
    for (const risk of sortedRisks.slice(0, 3)) {
      const recommendation = this.getRiskRecommendation(risk, features);
      if (recommendation) {
        recommendations.push(recommendation);
      }
    }

    // Add general recommendations if adherence is predicted to be low
    if (predictedAdherence < 70) {
      if (features.familySupport < 0.3) {
        recommendations.push({
          action: 'Invite family members to support your medication journey',
          priority: 'high',
          expectedImprovement: 10
        });
      }

      if (features.reminderResponseRate < 0.5) {
        recommendations.push({
          action: 'Enable smart reminder optimization for better timing',
          priority: 'medium',
          expectedImprovement: 8
        });
      }
    }

    return recommendations;
  }

  /**
   * Get recommendation for specific risk factor
   */
  private getRiskRecommendation(
    risk: RiskFactor,
    features: PredictionFeatures
  ): AdherencePrediction['recommendations'][0] | null {
    switch (risk.name) {
      case 'Low historical adherence':
        return {
          action: 'Set up a medication routine with consistent daily reminders',
          priority: 'high',
          expectedImprovement: 15
        };

      case 'Declining adherence trend':
        return {
          action: 'Review medication schedule and identify barriers to adherence',
          priority: 'high',
          expectedImprovement: 12
        };

      case 'Inconsistent dosing times':
        return {
          action: 'Enable smart scheduling to find optimal dosing times',
          priority: 'medium',
          expectedImprovement: 10
        };

      case 'Weekend adherence drop':
        return {
          action: 'Set stronger weekend reminders and establish weekend routine',
          priority: 'medium',
          expectedImprovement: 8
        };

      case 'Prayer time scheduling conflicts':
        return {
          action: 'Enable prayer-time aware scheduling for better alignment',
          priority: 'high',
          expectedImprovement: 12
        };

      case 'Complex medication schedule':
        return {
          action: 'Simplify schedule by grouping compatible medications',
          priority: 'medium',
          expectedImprovement: 10
        };

      case 'Limited family support':
        return {
          action: 'Activate family circle feature for medication support',
          priority: 'medium',
          expectedImprovement: 8
        };

      case 'Festival period disruption':
        return {
          action: 'Enable festival-aware reminders to maintain routine',
          priority: 'low',
          expectedImprovement: 5
        };

      default:
        return null;
    }
  }

  /**
   * Get risk factor description
   */
  private getRiskFactorDescription(risk: RiskFactor): string {
    const impactLevel = Math.abs(risk.weight * risk.value * 100);
    const impactText = impactLevel > 10 ? 'significantly' :
                       impactLevel > 5 ? 'moderately' : 'slightly';

    return `${risk.name} is ${impactText} affecting predicted adherence`;
  }

  /**
   * Calculate prediction confidence
   */
  private calculateConfidence(recordCount: number, features: PredictionFeatures): number {
    let confidence = 0.5; // Base confidence

    // Increase confidence with more data
    if (recordCount > 100) confidence += 0.2;
    else if (recordCount > 50) confidence += 0.15;
    else if (recordCount > 20) confidence += 0.1;
    else if (recordCount > 10) confidence += 0.05;

    // Increase confidence with consistent patterns
    if (features.timingConsistency > 0.7) confidence += 0.1;
    if (Math.abs(features.adherenceTrend) < 0.1) confidence += 0.05; // Stable trend

    // Decrease confidence with high variability
    if (features.streakStability < 0.3) confidence -= 0.1;

    return Math.max(0.1, Math.min(0.95, confidence));
  }

  /**
   * Calculate number of days of data
   */
  private calculateDataDays(records: AdherenceRecord[]): number {
    if (records.length === 0) return 0;

    const sortedRecords = [...records].sort(
      (a, b) => a.scheduledTime.getTime() - b.scheduledTime.getTime()
    );

    const firstDate = sortedRecords[0].scheduledTime;
    const lastDate = sortedRecords[sortedRecords.length - 1].scheduledTime;

    return Math.ceil((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
  }

  /**
   * Check if cached prediction is valid
   */
  private isCacheValid(prediction: AdherencePrediction): boolean {
    const ageInHours = (Date.now() - prediction.predictionDate.getTime()) / (1000 * 60 * 60);
    return ageInHours < 24; // Cache valid for 24 hours
  }

  /**
   * Get cached prediction
   */
  private async getCachedPrediction(
    patientId: string,
    medicationId?: string
  ): Promise<AdherencePrediction | null> {
    try {
      const key = `${this.cacheKey}:${patientId}:${medicationId || 'all'}`;
      const cached = await AsyncStorage.getItem(key);

      if (cached) {
        const prediction = JSON.parse(cached);
        prediction.predictionDate = new Date(prediction.predictionDate);
        return prediction;
      }
    } catch (error) {
      console.error('Error getting cached prediction:', error);
    }

    return null;
  }

  /**
   * Cache prediction
   */
  private async cachePrediction(prediction: AdherencePrediction): Promise<void> {
    try {
      const key = `${this.cacheKey}:${prediction.patientId}:${prediction.medicationId || 'all'}`;
      await AsyncStorage.setItem(key, JSON.stringify(prediction));
    } catch (error) {
      console.error('Error caching prediction:', error);
    }
  }

  /**
   * Generate time series forecast
   */
  public async generateForecast(
    patientId: string,
    records: AdherenceRecord[],
    daysAhead: number = 30
  ): Promise<TimeSeriesPoint[]> {
    const prediction = await this.predictAdherence(patientId, records, undefined, daysAhead);
    const forecast: TimeSeriesPoint[] = [];

    // Generate daily forecast points
    const today = new Date();
    const baseAdherence = prediction.predictedAdherence;

    for (let day = 0; day < daysAhead; day++) {
      const date = new Date(today);
      date.setDate(date.getDate() + day);

      // Add some variability based on patterns
      const dayOfWeek = date.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      let adherence = baseAdherence;

      // Apply weekend effect if identified
      const weekendRisk = prediction.riskFactors.find(r =>
        r.factor === 'Weekend adherence drop'
      );
      if (isWeekend && weekendRisk) {
        adherence -= weekendRisk.impact * 0.5;
      }

      // Add some random variation
      const variation = (Math.random() - 0.5) * 10;
      adherence = Math.max(0, Math.min(100, adherence + variation));

      forecast.push({
        date,
        adherence,
        eventCount: Math.round(Math.random() * 3) // Simulated event count
      });
    }

    return forecast;
  }

  /**
   * Clear prediction cache
   */
  public async clearCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const predictionKeys = keys.filter(key => key.startsWith(this.cacheKey));
      await AsyncStorage.multiRemove(predictionKeys);
    } catch (error) {
      console.error('Error clearing prediction cache:', error);
    }
  }
}