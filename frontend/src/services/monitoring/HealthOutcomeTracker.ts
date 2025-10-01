/**
 * Health Outcome Tracker Service
 *
 * Track medication adherence outcomes, health metrics improvements,
 * and clinical effectiveness of the medication management system.
 */

export interface HealthOutcome {
  userId: string;
  date: Date;
  adherenceRate: number;
  medicationCount: number;
  missedDoses: number;
  takenOnTime: number;
  takenLate: number;
  healthScore?: number;
}

export interface AdherencePattern {
  userId: string;
  period: 'daily' | 'weekly' | 'monthly';
  averageAdherence: number;
  consistency: number;
  improvementTrend: 'improving' | 'stable' | 'declining';
  riskLevel: 'low' | 'medium' | 'high';
}

export interface MedicationEffectiveness {
  medicationId: string;
  medicationName: string;
  adherenceRate: number;
  userCount: number;
  averageHealthScore?: number;
  commonIssues: string[];
}

export interface ClinicalInsight {
  type: 'adherence' | 'effectiveness' | 'risk' | 'improvement';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  userId: string;
  timestamp: Date;
  data?: Record<string, any>;
}

export class HealthOutcomeTracker {
  private static instance: HealthOutcomeTracker;
  private outcomes: Map<string, HealthOutcome[]> = new Map();
  private patterns: Map<string, AdherencePattern> = new Map();
  private effectiveness: Map<string, MedicationEffectiveness> = new Map();
  private insights: ClinicalInsight[] = [];

  private constructor() {}

  public static getInstance(): HealthOutcomeTracker {
    if (!HealthOutcomeTracker.instance) {
      HealthOutcomeTracker.instance = new HealthOutcomeTracker();
    }
    return HealthOutcomeTracker.instance;
  }

  /**
   * Track daily health outcome
   */
  public trackDailyOutcome(
    userId: string,
    adherenceRate: number,
    medicationCount: number,
    missedDoses: number,
    takenOnTime: number,
    takenLate: number
  ): void {
    const outcome: HealthOutcome = {
      userId,
      date: new Date(),
      adherenceRate,
      medicationCount,
      missedDoses,
      takenOnTime,
      takenLate,
    };

    let userOutcomes = this.outcomes.get(userId) || [];
    userOutcomes.push(outcome);

    // Keep last 90 days
    if (userOutcomes.length > 90) {
      userOutcomes = userOutcomes.slice(-90);
    }

    this.outcomes.set(userId, userOutcomes);

    // Update adherence pattern
    this.updateAdherencePattern(userId);

    // Check for concerning patterns
    this.checkForClinicalInsights(userId, outcome);
  }

  /**
   * Track medication effectiveness
   */
  public trackMedicationEffectiveness(
    medicationId: string,
    medicationName: string,
    userId: string,
    adherenceRate: number,
    healthScore?: number
  ): void {
    let effectiveness = this.effectiveness.get(medicationId);

    if (!effectiveness) {
      effectiveness = {
        medicationId,
        medicationName,
        adherenceRate: 0,
        userCount: 0,
        commonIssues: [],
      };
    }

    // Update running average
    const totalAdherence = effectiveness.adherenceRate * effectiveness.userCount;
    effectiveness.userCount++;
    effectiveness.adherenceRate =
      (totalAdherence + adherenceRate) / effectiveness.userCount;

    if (healthScore !== undefined) {
      const totalHealth = (effectiveness.averageHealthScore || 0) * (effectiveness.userCount - 1);
      effectiveness.averageHealthScore = (totalHealth + healthScore) / effectiveness.userCount;
    }

    this.effectiveness.set(medicationId, effectiveness);
  }

  /**
   * Get user adherence pattern
   */
  public getAdherencePattern(
    userId: string,
    period: 'daily' | 'weekly' | 'monthly' = 'weekly'
  ): AdherencePattern | null {
    return this.patterns.get(`${userId}_${period}`) || null;
  }

  /**
   * Get health outcomes for user
   */
  public getUserOutcomes(
    userId: string,
    days: number = 30
  ): HealthOutcome[] {
    const outcomes = this.outcomes.get(userId) || [];
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    return outcomes.filter(o => o.date >= cutoffDate);
  }

  /**
   * Get adherence statistics
   */
  public getAdherenceStats(userId: string, days: number = 30): {
    averageAdherence: number;
    totalDoses: number;
    takenDoses: number;
    missedDoses: number;
    onTimePercentage: number;
  } {
    const outcomes = this.getUserOutcomes(userId, days);

    if (outcomes.length === 0) {
      return {
        averageAdherence: 0,
        totalDoses: 0,
        takenDoses: 0,
        missedDoses: 0,
        onTimePercentage: 0,
      };
    }

    const totalAdherence = outcomes.reduce((sum, o) => sum + o.adherenceRate, 0);
    const totalMissed = outcomes.reduce((sum, o) => sum + o.missedDoses, 0);
    const totalOnTime = outcomes.reduce((sum, o) => sum + o.takenOnTime, 0);
    const totalLate = outcomes.reduce((sum, o) => sum + o.takenLate, 0);
    const totalTaken = totalOnTime + totalLate;
    const totalDoses = totalTaken + totalMissed;

    return {
      averageAdherence: totalAdherence / outcomes.length,
      totalDoses,
      takenDoses: totalTaken,
      missedDoses: totalMissed,
      onTimePercentage: totalDoses > 0 ? (totalOnTime / totalDoses) * 100 : 0,
    };
  }

  /**
   * Get clinical insights for user
   */
  public getClinicalInsights(userId: string): ClinicalInsight[] {
    return this.insights.filter(i => i.userId === userId);
  }

  /**
   * Get all medication effectiveness data
   */
  public getMedicationEffectiveness(): MedicationEffectiveness[] {
    return Array.from(this.effectiveness.values()).sort(
      (a, b) => b.adherenceRate - a.adherenceRate
    );
  }

  /**
   * Update adherence pattern for user
   */
  private updateAdherencePattern(userId: string): void {
    const weeklyOutcomes = this.getUserOutcomes(userId, 7);

    if (weeklyOutcomes.length === 0) return;

    const averageAdherence =
      weeklyOutcomes.reduce((sum, o) => sum + o.adherenceRate, 0) /
      weeklyOutcomes.length;

    // Calculate consistency (standard deviation)
    const variance =
      weeklyOutcomes.reduce(
        (sum, o) => sum + Math.pow(o.adherenceRate - averageAdherence, 2),
        0
      ) / weeklyOutcomes.length;
    const consistency = 100 - Math.sqrt(variance);

    // Determine trend
    const recentAdherence =
      weeklyOutcomes.slice(-3).reduce((sum, o) => sum + o.adherenceRate, 0) / 3;
    const olderAdherence =
      weeklyOutcomes.slice(0, 3).reduce((sum, o) => sum + o.adherenceRate, 0) / 3;

    let improvementTrend: AdherencePattern['improvementTrend'];
    if (recentAdherence > olderAdherence + 5) {
      improvementTrend = 'improving';
    } else if (recentAdherence < olderAdherence - 5) {
      improvementTrend = 'declining';
    } else {
      improvementTrend = 'stable';
    }

    // Assess risk level
    let riskLevel: AdherencePattern['riskLevel'];
    if (averageAdherence >= 80) {
      riskLevel = 'low';
    } else if (averageAdherence >= 60) {
      riskLevel = 'medium';
    } else {
      riskLevel = 'high';
    }

    const pattern: AdherencePattern = {
      userId,
      period: 'weekly',
      averageAdherence,
      consistency,
      improvementTrend,
      riskLevel,
    };

    this.patterns.set(`${userId}_weekly`, pattern);
  }

  /**
   * Check for clinical insights
   */
  private checkForClinicalInsights(
    userId: string,
    outcome: HealthOutcome
  ): void {
    // Check for low adherence
    if (outcome.adherenceRate < 60) {
      this.addInsight({
        type: 'risk',
        severity: 'critical',
        message: `Low medication adherence detected: ${outcome.adherenceRate.toFixed(1)}%`,
        userId,
        timestamp: new Date(),
        data: { adherenceRate: outcome.adherenceRate },
      });
    }

    // Check for missed doses
    if (outcome.missedDoses >= 3) {
      this.addInsight({
        type: 'risk',
        severity: 'warning',
        message: `Multiple missed doses: ${outcome.missedDoses} doses missed today`,
        userId,
        timestamp: new Date(),
        data: { missedDoses: outcome.missedDoses },
      });
    }

    // Check for improvement
    const pattern = this.patterns.get(`${userId}_weekly`);
    if (pattern && pattern.improvementTrend === 'improving') {
      this.addInsight({
        type: 'improvement',
        severity: 'info',
        message: 'Adherence improving over past week',
        userId,
        timestamp: new Date(),
        data: { averageAdherence: pattern.averageAdherence },
      });
    }
  }

  /**
   * Add clinical insight
   */
  private addInsight(insight: ClinicalInsight): void {
    this.insights.push(insight);

    // Keep last 100 insights
    if (this.insights.length > 100) {
      this.insights = this.insights.slice(-100);
    }
  }
}

export default HealthOutcomeTracker.getInstance();