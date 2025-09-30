/**
 * User Engagement Analytics Service
 *
 * Specialized analytics for user engagement, retention, and behavior patterns
 * specific to medication adherence and healthcare engagement.
 */

export interface UserEngagement {
  userId: string;
  lastActiveDate: Date;
  totalSessions: number;
  totalScreenTime: number;
  medicationAdherence: number;
  reminderInteractionRate: number;
  culturalFeatureUsage: number;
  familyCircleEngagement: number;
}

export interface EngagementCohort {
  cohortName: string;
  startDate: Date;
  userCount: number;
  retentionDay1: number;
  retentionDay7: number;
  retentionDay30: number;
  averageAdherence: number;
}

export interface UserJourney {
  userId: string;
  sessionId: string;
  steps: JourneyStep[];
  completed: boolean;
  abandonedAt?: string;
  duration: number;
}

export interface JourneyStep {
  screen: string;
  action: string;
  timestamp: Date;
  duration: number;
}

export class UserEngagementAnalytics {
  private static instance: UserEngagementAnalytics;
  private engagements: Map<string, UserEngagement> = new Map();
  private cohorts: EngagementCohort[] = [];
  private journeys: UserJourney[] = [];

  private constructor() {}

  public static getInstance(): UserEngagementAnalytics {
    if (!UserEngagementAnalytics.instance) {
      UserEngagementAnalytics.instance = new UserEngagementAnalytics();
    }
    return UserEngagementAnalytics.instance;
  }

  /**
   * Track user engagement
   */
  public trackEngagement(
    userId: string,
    sessionDuration: number,
    screenViews: number,
    interactions: number
  ): void {
    let engagement = this.engagements.get(userId);

    if (!engagement) {
      engagement = {
        userId,
        lastActiveDate: new Date(),
        totalSessions: 0,
        totalScreenTime: 0,
        medicationAdherence: 0,
        reminderInteractionRate: 0,
        culturalFeatureUsage: 0,
        familyCircleEngagement: 0,
      };
    }

    engagement.lastActiveDate = new Date();
    engagement.totalSessions++;
    engagement.totalScreenTime += sessionDuration;

    this.engagements.set(userId, engagement);
  }

  /**
   * Track medication adherence engagement
   */
  public trackAdherenceEngagement(
    userId: string,
    taken: number,
    scheduled: number
  ): void {
    const engagement = this.getOrCreateEngagement(userId);
    engagement.medicationAdherence = scheduled > 0 ? (taken / scheduled) * 100 : 0;
    this.engagements.set(userId, engagement);
  }

  /**
   * Track reminder interaction
   */
  public trackReminderInteraction(
    userId: string,
    interacted: boolean,
    reminderType: string
  ): void {
    const engagement = this.getOrCreateEngagement(userId);

    // Update reminder interaction rate
    // This would be calculated based on historical data
    if (interacted) {
      engagement.reminderInteractionRate = Math.min(
        100,
        engagement.reminderInteractionRate + 1
      );
    }

    this.engagements.set(userId, engagement);
  }

  /**
   * Track cultural feature usage
   */
  public trackCulturalFeatureUsage(
    userId: string,
    feature: string,
    duration?: number
  ): void {
    const engagement = this.getOrCreateEngagement(userId);
    engagement.culturalFeatureUsage++;
    this.engagements.set(userId, engagement);
  }

  /**
   * Track family circle engagement
   */
  public trackFamilyCircleEngagement(
    userId: string,
    action: 'view' | 'share' | 'notify' | 'respond'
  ): void {
    const engagement = this.getOrCreateEngagement(userId);
    engagement.familyCircleEngagement++;
    this.engagements.set(userId, engagement);
  }

  /**
   * Start tracking user journey
   */
  public startJourney(userId: string, sessionId: string): void {
    const journey: UserJourney = {
      userId,
      sessionId,
      steps: [],
      completed: false,
      duration: 0,
    };

    this.journeys.push(journey);

    // Keep last 1000 journeys
    if (this.journeys.length > 1000) {
      this.journeys = this.journeys.slice(-1000);
    }
  }

  /**
   * Add step to user journey
   */
  public addJourneyStep(
    sessionId: string,
    screen: string,
    action: string,
    duration: number
  ): void {
    const journey = this.journeys.find(j => j.sessionId === sessionId);
    if (!journey) return;

    const step: JourneyStep = {
      screen,
      action,
      timestamp: new Date(),
      duration,
    };

    journey.steps.push(step);
    journey.duration += duration;
  }

  /**
   * Complete user journey
   */
  public completeJourney(sessionId: string): void {
    const journey = this.journeys.find(j => j.sessionId === sessionId);
    if (journey) {
      journey.completed = true;
    }
  }

  /**
   * Mark journey as abandoned
   */
  public abandonJourney(sessionId: string, screen: string): void {
    const journey = this.journeys.find(j => j.sessionId === sessionId);
    if (journey) {
      journey.completed = false;
      journey.abandonedAt = screen;
    }
  }

  /**
   * Get user engagement metrics
   */
  public getUserEngagement(userId: string): UserEngagement | null {
    return this.engagements.get(userId) || null;
  }

  /**
   * Get engagement statistics
   */
  public getEngagementStatistics(): {
    totalUsers: number;
    activeUsers: number;
    averageSessionTime: number;
    averageAdherence: number;
    topEngagedUsers: Array<{ userId: string; score: number }>;
  } {
    const engagements = Array.from(this.engagements.values());

    // Count active users (last 7 days)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const activeUsers = engagements.filter(
      e => e.lastActiveDate >= oneWeekAgo
    ).length;

    // Calculate averages
    const totalSessionTime = engagements.reduce(
      (sum, e) => sum + e.totalScreenTime,
      0
    );
    const totalAdherence = engagements.reduce(
      (sum, e) => sum + e.medicationAdherence,
      0
    );

    // Calculate engagement scores and get top users
    const userScores = engagements.map(e => ({
      userId: e.userId,
      score: this.calculateEngagementScore(e),
    }));
    const topEngagedUsers = userScores
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    return {
      totalUsers: engagements.length,
      activeUsers,
      averageSessionTime:
        engagements.length > 0
          ? totalSessionTime / engagements.length
          : 0,
      averageAdherence:
        engagements.length > 0
          ? totalAdherence / engagements.length
          : 0,
      topEngagedUsers,
    };
  }

  /**
   * Get journey completion rate
   */
  public getJourneyCompletionRate(): {
    total: number;
    completed: number;
    abandoned: number;
    completionRate: number;
    abandonmentRate: number;
    commonAbandonmentPoints: Array<{ screen: string; count: number }>;
  } {
    const total = this.journeys.length;
    const completed = this.journeys.filter(j => j.completed).length;
    const abandoned = this.journeys.filter(j => !j.completed && j.abandonedAt).length;

    // Find common abandonment points
    const abandonmentPoints: Map<string, number> = new Map();
    this.journeys.forEach(j => {
      if (j.abandonedAt) {
        abandonmentPoints.set(
          j.abandonedAt,
          (abandonmentPoints.get(j.abandonedAt) || 0) + 1
        );
      }
    });

    const commonAbandonmentPoints = Array.from(abandonmentPoints.entries())
      .map(([screen, count]) => ({ screen, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      total,
      completed,
      abandoned,
      completionRate: total > 0 ? (completed / total) * 100 : 0,
      abandonmentRate: total > 0 ? (abandoned / total) * 100 : 0,
      commonAbandonmentPoints,
    };
  }

  /**
   * Calculate engagement score for a user
   */
  private calculateEngagementScore(engagement: UserEngagement): number {
    // Weighted scoring system
    const sessionScore = Math.min(engagement.totalSessions / 30, 1) * 20;
    const adherenceScore = engagement.medicationAdherence * 0.3;
    const reminderScore = engagement.reminderInteractionRate * 0.2;
    const culturalScore = Math.min(engagement.culturalFeatureUsage / 10, 1) * 15;
    const familyScore = Math.min(engagement.familyCircleEngagement / 10, 1) * 15;

    return (
      sessionScore +
      adherenceScore +
      reminderScore +
      culturalScore +
      familyScore
    );
  }

  /**
   * Get or create engagement record
   */
  private getOrCreateEngagement(userId: string): UserEngagement {
    let engagement = this.engagements.get(userId);

    if (!engagement) {
      engagement = {
        userId,
        lastActiveDate: new Date(),
        totalSessions: 0,
        totalScreenTime: 0,
        medicationAdherence: 0,
        reminderInteractionRate: 0,
        culturalFeatureUsage: 0,
        familyCircleEngagement: 0,
      };
      this.engagements.set(userId, engagement);
    }

    return engagement;
  }
}

export default UserEngagementAnalytics.getInstance();