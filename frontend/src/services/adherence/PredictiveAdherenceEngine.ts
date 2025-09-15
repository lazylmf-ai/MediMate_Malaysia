/**
 * Predictive Adherence Engine
 *
 * Advanced predictive analytics engine that uses machine learning patterns
 * to forecast medication adherence and provide proactive interventions.
 */

import {
  AdherenceRecord,
  AdherencePrediction,
  PredictionTimeframe,
  RiskLevel,
  PredictionFactor,
  PredictionRecommendation,
  AdherenceTrend,
  AdherencePattern,
  CulturalInsight
} from '../../types/adherence';
import { Medication } from '../../types/medication';

interface FeatureVector {
  historicalAdherence: number;
  recentTrend: number;
  streakLength: number;
  missedDoseFrequency: number;
  delayPattern: number;
  dayOfWeekEffect: number;
  timeOfDayEffect: number;
  medicationComplexity: number;
  culturalFactors: number;
  seasonalEffect: number;
  healthStatus: number;
  socialSupport: number;
}

interface PredictionModel {
  weights: Map<string, number>;
  bias: number;
  threshold: { low: number; medium: number; high: number };
}

export class PredictiveAdherenceEngine {
  private model: PredictionModel;
  private featureCache: Map<string, FeatureVector> = new Map();

  constructor() {
    // Initialize prediction model with optimized weights
    // These weights are based on Malaysian healthcare data patterns
    this.model = {
      weights: new Map([
        ['historicalAdherence', 0.25],
        ['recentTrend', 0.20],
        ['streakLength', 0.15],
        ['missedDoseFrequency', -0.15],
        ['delayPattern', -0.10],
        ['dayOfWeekEffect', 0.05],
        ['timeOfDayEffect', 0.05],
        ['medicationComplexity', -0.08],
        ['culturalFactors', 0.12],
        ['seasonalEffect', 0.05],
        ['healthStatus', 0.10],
        ['socialSupport', 0.08]
      ]),
      bias: 0.70, // Baseline adherence rate
      threshold: {
        low: 0.80,    // >80% predicted adherence
        medium: 0.60, // 60-80% predicted adherence
        high: 0.40    // 40-60% predicted adherence
      }
    };
  }

  /**
   * Generate adherence predictions for multiple timeframes
   */
  generatePredictions(
    medication: Medication,
    records: AdherenceRecord[],
    patterns: AdherencePattern[],
    culturalInsights: CulturalInsight[]
  ): AdherencePrediction[] {
    const predictions: AdherencePrediction[] = [];

    // Generate predictions for different timeframes
    const timeframes: PredictionTimeframe[] = [
      'next_dose',
      'next_24h',
      'next_week',
      'next_month'
    ];

    timeframes.forEach(timeframe => {
      const prediction = this.predictAdherence(
        medication,
        records,
        patterns,
        culturalInsights,
        timeframe
      );
      predictions.push(prediction);
    });

    return predictions;
  }

  /**
   * Predict adherence for a specific timeframe
   */
  private predictAdherence(
    medication: Medication,
    records: AdherenceRecord[],
    patterns: AdherencePattern[],
    culturalInsights: CulturalInsight[],
    timeframe: PredictionTimeframe
  ): AdherencePrediction {
    // Extract features from historical data
    const features = this.extractFeatures(
      medication,
      records,
      patterns,
      culturalInsights
    );

    // Calculate prediction score
    const predictionScore = this.calculatePredictionScore(features);

    // Determine risk level
    const riskLevel = this.determineRiskLevel(predictionScore);

    // Identify contributing factors
    const factors = this.identifyFactors(features, predictionScore);

    // Generate recommendations
    const recommendations = this.generateRecommendations(
      riskLevel,
      factors,
      patterns,
      culturalInsights,
      medication
    );

    // Adjust confidence based on data quality
    const confidence = this.calculateConfidence(records.length, timeframe);

    return {
      medicationId: medication.id,
      timeframe,
      predictedRate: Math.round(predictionScore * 100),
      confidence,
      riskLevel,
      factors,
      recommendations
    };
  }

  /**
   * Extract features from historical data
   */
  private extractFeatures(
    medication: Medication,
    records: AdherenceRecord[],
    patterns: AdherencePattern[],
    culturalInsights: CulturalInsight[]
  ): FeatureVector {
    const cacheKey = `${medication.id}_${records.length}`;

    // Check cache first
    if (this.featureCache.has(cacheKey)) {
      return this.featureCache.get(cacheKey)!;
    }

    const medicationRecords = records.filter(r => r.medicationId === medication.id);

    // Historical adherence rate
    const historicalAdherence = this.calculateHistoricalAdherence(medicationRecords);

    // Recent trend analysis (last 7 days vs previous 7 days)
    const recentTrend = this.calculateRecentTrend(medicationRecords);

    // Current streak analysis
    const streakLength = this.calculateStreakFeature(medicationRecords);

    // Missed dose frequency
    const missedDoseFrequency = this.calculateMissedDoseFrequency(medicationRecords);

    // Delay pattern analysis
    const delayPattern = this.calculateDelayPattern(medicationRecords);

    // Day of week effect
    const dayOfWeekEffect = this.calculateDayOfWeekEffect(medicationRecords);

    // Time of day effect
    const timeOfDayEffect = this.calculateTimeOfDayEffect(medicationRecords);

    // Medication complexity score
    const medicationComplexity = this.calculateMedicationComplexity(medication);

    // Cultural factors impact
    const culturalFactors = this.calculateCulturalFactors(culturalInsights);

    // Seasonal effect (festival periods, Ramadan, etc.)
    const seasonalEffect = this.calculateSeasonalEffect(new Date());

    // Health status indicator (based on adherence stability)
    const healthStatus = this.calculateHealthStatus(medicationRecords);

    // Social support indicator
    const socialSupport = this.calculateSocialSupport(medicationRecords);

    const features: FeatureVector = {
      historicalAdherence,
      recentTrend,
      streakLength,
      missedDoseFrequency,
      delayPattern,
      dayOfWeekEffect,
      timeOfDayEffect,
      medicationComplexity,
      culturalFactors,
      seasonalEffect,
      healthStatus,
      socialSupport
    };

    // Cache the features
    this.featureCache.set(cacheKey, features);

    return features;
  }

  /**
   * Calculate prediction score using weighted features
   */
  private calculatePredictionScore(features: FeatureVector): number {
    let score = this.model.bias;

    // Apply weights to each feature
    Object.entries(features).forEach(([feature, value]) => {
      const weight = this.model.weights.get(feature) || 0;
      score += weight * value;
    });

    // Normalize score to 0-1 range
    return Math.max(0, Math.min(1, score));
  }

  /**
   * Determine risk level based on prediction score
   */
  private determineRiskLevel(score: number): RiskLevel {
    if (score >= this.model.threshold.low) {
      return 'low';
    } else if (score >= this.model.threshold.medium) {
      return 'medium';
    } else if (score >= this.model.threshold.high) {
      return 'high';
    } else {
      return 'critical';
    }
  }

  /**
   * Identify contributing factors to the prediction
   */
  private identifyFactors(
    features: FeatureVector,
    predictionScore: number
  ): PredictionFactor[] {
    const factors: PredictionFactor[] = [];

    // Sort features by their impact on the prediction
    const featureImpacts: Array<{ name: string; impact: number; value: number }> = [];

    Object.entries(features).forEach(([feature, value]) => {
      const weight = this.model.weights.get(feature) || 0;
      const impact = weight * value;
      featureImpacts.push({ name: feature, impact, value });
    });

    // Sort by absolute impact
    featureImpacts.sort((a, b) => Math.abs(b.impact) - Math.abs(a.impact));

    // Take top 5 factors
    featureImpacts.slice(0, 5).forEach(({ name, impact, value }) => {
      factors.push({
        type: this.getFeatureName(name),
        impact: impact / predictionScore, // Normalize to -1 to 1
        description: this.getFeatureDescription(name, value, impact)
      });
    });

    return factors;
  }

  /**
   * Generate recommendations based on predictions
   */
  private generateRecommendations(
    riskLevel: RiskLevel,
    factors: PredictionFactor[],
    patterns: AdherencePattern[],
    culturalInsights: CulturalInsight[],
    medication: Medication
  ): PredictionRecommendation[] {
    const recommendations: PredictionRecommendation[] = [];

    // High-risk recommendations
    if (riskLevel === 'critical' || riskLevel === 'high') {
      recommendations.push({
        priority: 'high',
        action: 'Schedule immediate consultation with healthcare provider',
        expectedImprovement: 25,
        culturallyAppropriate: true
      });

      recommendations.push({
        priority: 'high',
        action: 'Enable family support notifications',
        expectedImprovement: 20,
        culturallyAppropriate: true
      });

      // Check for specific pattern-based recommendations
      if (patterns.some(p => p.type === 'evening_missed')) {
        recommendations.push({
          priority: 'high',
          action: 'Set multiple evening reminders with escalation',
          expectedImprovement: 15,
          culturallyAppropriate: true
        });
      }
    }

    // Medium-risk recommendations
    if (riskLevel === 'medium' || riskLevel === 'high') {
      // Cultural-specific recommendations
      if (culturalInsights.some(i => i.type === 'prayer_time_optimization')) {
        recommendations.push({
          priority: 'medium',
          action: 'Adjust medication schedule to align with prayer times',
          expectedImprovement: 10,
          culturallyAppropriate: true
        });
      }

      if (factors.some(f => f.type === 'Medication Complexity')) {
        recommendations.push({
          priority: 'medium',
          action: 'Simplify medication regimen with healthcare provider',
          expectedImprovement: 12,
          culturallyAppropriate: true
        });
      }

      recommendations.push({
        priority: 'medium',
        action: 'Use visual medication organizers with day labels',
        expectedImprovement: 8,
        culturallyAppropriate: true
      });
    }

    // Low-risk maintenance recommendations
    if (riskLevel === 'low') {
      recommendations.push({
        priority: 'low',
        action: 'Continue current adherence strategies',
        expectedImprovement: 5,
        culturallyAppropriate: true
      });

      recommendations.push({
        priority: 'low',
        action: 'Share success with family for positive reinforcement',
        expectedImprovement: 3,
        culturallyAppropriate: true
      });
    }

    // Add medication-specific recommendations
    if (medication.schedule.frequency === 'four_times') {
      recommendations.push({
        priority: 'medium',
        action: 'Consider extended-release formulation to reduce dosing frequency',
        expectedImprovement: 15,
        culturallyAppropriate: true
      });
    }

    // Sort by priority and expected improvement
    recommendations.sort((a, b) => {
      if (a.priority !== b.priority) {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      }
      return b.expectedImprovement - a.expectedImprovement;
    });

    return recommendations.slice(0, 5); // Return top 5 recommendations
  }

  // Feature calculation methods

  private calculateHistoricalAdherence(records: AdherenceRecord[]): number {
    if (records.length === 0) return 0.5; // Neutral if no history

    const takenCount = records.filter(r =>
      ['taken_on_time', 'taken_late', 'taken_early', 'adjusted'].includes(r.status)
    ).length;

    return takenCount / records.length;
  }

  private calculateRecentTrend(records: AdherenceRecord[]): number {
    if (records.length < 14) return 0; // Not enough data for trend

    const sortedRecords = [...records].sort((a, b) =>
      new Date(a.scheduledTime).getTime() - new Date(b.scheduledTime).getTime()
    );

    const midPoint = sortedRecords.length - 7;
    const recentRecords = sortedRecords.slice(midPoint);
    const olderRecords = sortedRecords.slice(midPoint - 7, midPoint);

    const recentAdherence = this.calculateHistoricalAdherence(recentRecords);
    const olderAdherence = this.calculateHistoricalAdherence(olderRecords);

    return (recentAdherence - olderAdherence) / 2 + 0.5; // Normalize to 0-1
  }

  private calculateStreakFeature(records: AdherenceRecord[]): number {
    const sortedRecords = [...records].sort((a, b) =>
      new Date(b.scheduledTime).getTime() - new Date(a.scheduledTime).getTime()
    );

    let currentStreak = 0;
    for (const record of sortedRecords) {
      if (['taken_on_time', 'taken_late', 'taken_early', 'adjusted'].includes(record.status)) {
        currentStreak++;
      } else {
        break;
      }
    }

    // Normalize streak (0-1, capped at 30 days)
    return Math.min(currentStreak / 30, 1);
  }

  private calculateMissedDoseFrequency(records: AdherenceRecord[]): number {
    if (records.length === 0) return 0;

    const missedCount = records.filter(r => r.status === 'missed').length;
    return missedCount / records.length;
  }

  private calculateDelayPattern(records: AdherenceRecord[]): number {
    const delayedRecords = records.filter(r => r.delayMinutes && r.delayMinutes > 0);

    if (delayedRecords.length === 0) return 0;

    const avgDelay = delayedRecords.reduce((sum, r) => sum + (r.delayMinutes || 0), 0) / delayedRecords.length;

    // Normalize delay (0-1, where 120 minutes = 1)
    return Math.min(avgDelay / 120, 1);
  }

  private calculateDayOfWeekEffect(records: AdherenceRecord[]): number {
    if (records.length < 28) return 0.5; // Need at least 4 weeks of data

    const dayAdherence = new Map<number, { total: number; taken: number }>();

    records.forEach(record => {
      const day = new Date(record.scheduledTime).getDay();

      if (!dayAdherence.has(day)) {
        dayAdherence.set(day, { total: 0, taken: 0 });
      }

      const dayData = dayAdherence.get(day)!;
      dayData.total++;

      if (['taken_on_time', 'taken_late', 'taken_early', 'adjusted'].includes(record.status)) {
        dayData.taken++;
      }
    });

    // Calculate variance in adherence across days
    const adherenceRates: number[] = [];
    dayAdherence.forEach(data => {
      if (data.total > 0) {
        adherenceRates.push(data.taken / data.total);
      }
    });

    if (adherenceRates.length === 0) return 0.5;

    const mean = adherenceRates.reduce((a, b) => a + b, 0) / adherenceRates.length;
    const variance = adherenceRates.reduce((sum, rate) => sum + Math.pow(rate - mean, 2), 0) / adherenceRates.length;

    // Lower variance is better (more consistent)
    return 1 - Math.min(variance * 2, 1);
  }

  private calculateTimeOfDayEffect(records: AdherenceRecord[]): number {
    if (records.length < 30) return 0.5; // Need sufficient data

    const timeSlots = new Map<number, { total: number; taken: number }>();

    records.forEach(record => {
      const hour = Math.floor(new Date(record.scheduledTime).getHours() / 6); // 4 time slots

      if (!timeSlots.has(hour)) {
        timeSlots.set(hour, { total: 0, taken: 0 });
      }

      const slot = timeSlots.get(hour)!;
      slot.total++;

      if (['taken_on_time', 'taken_late', 'taken_early', 'adjusted'].includes(record.status)) {
        slot.taken++;
      }
    });

    // Find best and worst time slots
    let best = 0;
    let worst = 1;

    timeSlots.forEach(data => {
      if (data.total > 0) {
        const rate = data.taken / data.total;
        best = Math.max(best, rate);
        worst = Math.min(worst, rate);
      }
    });

    // Return normalized difference (smaller difference is better)
    return 1 - (best - worst);
  }

  private calculateMedicationComplexity(medication: Medication): number {
    let complexity = 0;

    // Frequency complexity
    const frequencyScore: Record<string, number> = {
      'daily': 0.1,
      'twice_daily': 0.2,
      'three_times': 0.3,
      'four_times': 0.4,
      'weekly': 0.05,
      'as_needed': 0.15,
      'custom': 0.35
    };
    complexity += frequencyScore[medication.schedule.frequency] || 0.25;

    // Food requirement complexity
    if (medication.cultural.takeWithFood) {
      complexity += 0.15;
    }

    // Fasting conflict complexity
    if (medication.cultural.avoidDuringFasting) {
      complexity += 0.2;
    }

    // Prayer time considerations
    if (medication.cultural.prayerTimeConsiderations.length > 0) {
      complexity += 0.1 * medication.cultural.prayerTimeConsiderations.length;
    }

    return Math.min(complexity, 1); // Cap at 1
  }

  private calculateCulturalFactors(insights: CulturalInsight[]): number {
    if (insights.length === 0) return 0.5; // Neutral

    const totalImpact = insights.reduce((sum, insight) => {
      return sum + (insight.adherenceImpact / 100);
    }, 0);

    // Normalize to 0-1 range
    return Math.max(0, Math.min(1, 0.5 + totalImpact / insights.length));
  }

  private calculateSeasonalEffect(date: Date): number {
    const month = date.getMonth();
    const day = date.getDate();

    // Malaysian festival periods (negative effect on adherence)
    const festivals = [
      { month: 0, days: [1, 2, 29, 30, 31] }, // New Year, CNY
      { month: 1, days: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] }, // CNY continued
      { month: 2, days: [29, 30, 31] }, // Hari Raya prep
      { month: 3, days: [1, 2] }, // Hari Raya
      { month: 9, days: [20, 21] }, // Deepavali
      { month: 11, days: [24, 25, 31] } // Christmas, New Year's Eve
    ];

    for (const festival of festivals) {
      if (month === festival.month && festival.days.includes(day)) {
        return 0.3; // Lower adherence expected
      }
    }

    // Ramadan period (varies by year, approximate)
    if (month === 2 || month === 3) {
      return 0.4; // Moderate impact
    }

    return 0.7; // Normal period
  }

  private calculateHealthStatus(records: AdherenceRecord[]): number {
    if (records.length < 7) return 0.5; // Not enough data

    // Use adherence stability as proxy for health status
    const recentRecords = records.slice(-7);
    const adherenceScores = recentRecords.map(r => r.adherenceScore / 100);

    const mean = adherenceScores.reduce((a, b) => a + b, 0) / adherenceScores.length;
    const variance = adherenceScores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / adherenceScores.length;

    // Lower variance indicates more stable health
    return Math.max(0, 1 - variance * 2);
  }

  private calculateSocialSupport(records: AdherenceRecord[]): number {
    const familyReported = records.filter(r => r.method === 'family_reported').length;
    const totalRecords = records.length;

    if (totalRecords === 0) return 0.3; // Low support assumed

    const supportRate = familyReported / totalRecords;

    // Add bonus for any family involvement
    return Math.min(supportRate * 1.5 + 0.3, 1);
  }

  private calculateConfidence(recordCount: number, timeframe: PredictionTimeframe): number {
    // Base confidence on data availability
    let baseConfidence = Math.min(recordCount / 100, 0.8); // Cap at 80%

    // Adjust for timeframe (longer predictions are less confident)
    const timeframeMultiplier: Record<PredictionTimeframe, number> = {
      'next_dose': 1.0,
      'next_24h': 0.9,
      'next_week': 0.7,
      'next_month': 0.5
    };

    return baseConfidence * timeframeMultiplier[timeframe];
  }

  private getFeatureName(feature: string): string {
    const names: Record<string, string> = {
      historicalAdherence: 'Historical Adherence',
      recentTrend: 'Recent Trend',
      streakLength: 'Current Streak',
      missedDoseFrequency: 'Missed Doses',
      delayPattern: 'Delay Pattern',
      dayOfWeekEffect: 'Day Consistency',
      timeOfDayEffect: 'Time Consistency',
      medicationComplexity: 'Medication Complexity',
      culturalFactors: 'Cultural Factors',
      seasonalEffect: 'Seasonal Impact',
      healthStatus: 'Health Stability',
      socialSupport: 'Family Support'
    };
    return names[feature] || feature;
  }

  private getFeatureDescription(feature: string, value: number, impact: number): string {
    const positive = impact > 0;
    const strength = Math.abs(impact) > 0.1 ? 'significantly' : 'slightly';

    const descriptions: Record<string, string> = {
      historicalAdherence: `Past adherence ${strength} ${positive ? 'supports' : 'reduces'} future compliance`,
      recentTrend: `Recent ${positive ? 'improvement' : 'decline'} ${strength} affects prediction`,
      streakLength: `Current streak ${strength} ${positive ? 'increases' : 'decreases'} likelihood`,
      missedDoseFrequency: `Missed dose pattern ${strength} ${positive ? 'improves' : 'worsens'} outlook`,
      delayPattern: `Timing delays ${strength} ${positive ? 'improving' : 'impacting'} adherence`,
      dayOfWeekEffect: `Weekly consistency ${strength} ${positive ? 'supports' : 'challenges'} routine`,
      timeOfDayEffect: `Daily timing ${strength} ${positive ? 'enhances' : 'disrupts'} schedule`,
      medicationComplexity: `Regimen complexity ${strength} ${positive ? 'manageable' : 'challenging'}`,
      culturalFactors: `Cultural alignment ${strength} ${positive ? 'supports' : 'conflicts with'} adherence`,
      seasonalEffect: `Current period ${strength} ${positive ? 'favorable' : 'challenging'} for adherence`,
      healthStatus: `Health stability ${strength} ${positive ? 'supports' : 'affects'} medication routine`,
      socialSupport: `Family involvement ${strength} ${positive ? 'enhances' : 'needed for'} compliance`
    };

    return descriptions[feature] || `${feature} has ${strength} ${positive ? 'positive' : 'negative'} impact`;
  }

  /**
   * Update model weights based on actual outcomes (for continuous learning)
   */
  updateModel(actualOutcome: number, prediction: number, features: FeatureVector): void {
    const error = actualOutcome - prediction;
    const learningRate = 0.01;

    // Simple gradient descent update
    Object.entries(features).forEach(([feature, value]) => {
      const currentWeight = this.model.weights.get(feature) || 0;
      const update = learningRate * error * value;
      this.model.weights.set(feature, currentWeight + update);
    });

    // Update bias
    this.model.bias += learningRate * error;

    // Clear feature cache after model update
    this.featureCache.clear();
  }

  /**
   * Get model performance metrics
   */
  getModelMetrics(): {
    weights: Record<string, number>;
    bias: number;
    cacheSize: number;
  } {
    const weights: Record<string, number> = {};
    this.model.weights.forEach((value, key) => {
      weights[key] = value;
    });

    return {
      weights,
      bias: this.model.bias,
      cacheSize: this.featureCache.size
    };
  }
}