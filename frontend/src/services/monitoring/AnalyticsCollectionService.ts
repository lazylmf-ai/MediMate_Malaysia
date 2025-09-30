/**
 * Analytics Collection Service
 *
 * User behavior tracking, feature usage analytics, and engagement metrics
 * for understanding app usage patterns and improving user experience.
 */

export interface UserEvent {
  eventName: string;
  category: 'navigation' | 'interaction' | 'feature' | 'error' | 'performance';
  timestamp: Date;
  userId?: string;
  sessionId: string;
  properties?: Record<string, any>;
}

export interface FeatureUsage {
  featureName: string;
  usageCount: number;
  lastUsed: Date;
  averageSessionTime: number;
  userCount: number;
}

export interface UserSession {
  sessionId: string;
  userId?: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  screenViews: number;
  interactions: number;
  features: string[];
}

export interface EngagementMetrics {
  dailyActiveUsers: number;
  weeklyActiveUsers: number;
  monthlyActiveUsers: number;
  averageSessionDuration: number;
  sessionsPerUser: number;
  retentionRate: {
    day1: number;
    day7: number;
    day30: number;
  };
}

export class AnalyticsCollectionService {
  private static instance: AnalyticsCollectionService;
  private events: UserEvent[] = [];
  private sessions: Map<string, UserSession> = new Map();
  private featureUsage: Map<string, FeatureUsage> = new Map();
  private currentSessionId: string;

  private constructor() {
    this.currentSessionId = this.generateSessionId();
    this.startSession();
  }

  public static getInstance(): AnalyticsCollectionService {
    if (!AnalyticsCollectionService.instance) {
      AnalyticsCollectionService.instance = new AnalyticsCollectionService();
    }
    return AnalyticsCollectionService.instance;
  }

  /**
   * Track a user event
   */
  public trackEvent(
    eventName: string,
    category: UserEvent['category'],
    properties?: Record<string, any>
  ): void {
    const event: UserEvent = {
      eventName,
      category,
      timestamp: new Date(),
      sessionId: this.currentSessionId,
      properties,
    };

    this.events.push(event);

    // Update session interaction count
    const session = this.sessions.get(this.currentSessionId);
    if (session) {
      session.interactions++;
    }

    // Keep last 10,000 events in memory
    if (this.events.length > 10000) {
      this.events = this.events.slice(-10000);
    }

    // Send to backend analytics
    this.sendEventToBackend(event);
  }

  /**
   * Track screen view
   */
  public trackScreenView(screenName: string, properties?: Record<string, any>): void {
    this.trackEvent(`screen_view_${screenName}`, 'navigation', {
      screenName,
      ...properties,
    });

    // Update session screen views
    const session = this.sessions.get(this.currentSessionId);
    if (session) {
      session.screenViews++;
    }
  }

  /**
   * Track feature usage
   */
  public trackFeatureUsage(featureName: string, sessionTime?: number): void {
    this.trackEvent(`feature_${featureName}`, 'feature', { featureName, sessionTime });

    // Update feature usage statistics
    const usage = this.featureUsage.get(featureName) || {
      featureName,
      usageCount: 0,
      lastUsed: new Date(),
      averageSessionTime: 0,
      userCount: 0,
    };

    usage.usageCount++;
    usage.lastUsed = new Date();

    if (sessionTime) {
      usage.averageSessionTime =
        (usage.averageSessionTime * (usage.usageCount - 1) + sessionTime) / usage.usageCount;
    }

    this.featureUsage.set(featureName, usage);

    // Update session features
    const session = this.sessions.get(this.currentSessionId);
    if (session && !session.features.includes(featureName)) {
      session.features.push(featureName);
    }
  }

  /**
   * Track medication management events
   */
  public trackMedicationEvent(
    action: 'add' | 'edit' | 'delete' | 'photo' | 'schedule' | 'taken' | 'missed',
    properties?: Record<string, any>
  ): void {
    this.trackEvent(`medication_${action}`, 'interaction', {
      action,
      ...properties,
    });
  }

  /**
   * Track cultural feature usage
   */
  public trackCulturalFeature(
    feature: 'prayer_time' | 'festival' | 'language_switch' | 'ramadan_mode',
    properties?: Record<string, any>
  ): void {
    this.trackEvent(`cultural_${feature}`, 'feature', {
      feature,
      ...properties,
    });
    this.trackFeatureUsage(`cultural_${feature}`);
  }

  /**
   * Track family circle interactions
   */
  public trackFamilyCircle(
    action: 'add_member' | 'remove_member' | 'view_dashboard' | 'share_data' | 'send_notification',
    properties?: Record<string, any>
  ): void {
    this.trackEvent(`family_${action}`, 'interaction', {
      action,
      ...properties,
    });
  }

  /**
   * Track adherence events
   */
  public trackAdherence(
    action: 'view_progress' | 'mark_taken' | 'mark_missed' | 'set_goal' | 'view_report',
    properties?: Record<string, any>
  ): void {
    this.trackEvent(`adherence_${action}`, 'interaction', {
      action,
      ...properties,
    });
  }

  /**
   * Start a new session
   */
  public startSession(userId?: string): void {
    const session: UserSession = {
      sessionId: this.currentSessionId,
      userId,
      startTime: new Date(),
      screenViews: 0,
      interactions: 0,
      features: [],
    };

    this.sessions.set(this.currentSessionId, session);

    this.trackEvent('session_start', 'interaction', { userId });
  }

  /**
   * End current session
   */
  public endSession(): void {
    const session = this.sessions.get(this.currentSessionId);
    if (session && !session.endTime) {
      session.endTime = new Date();
      session.duration = session.endTime.getTime() - session.startTime.getTime();

      this.trackEvent('session_end', 'interaction', {
        duration: session.duration,
        screenViews: session.screenViews,
        interactions: session.interactions,
        features: session.features,
      });

      // Send session data to backend
      this.sendSessionToBackend(session);
    }

    // Start new session
    this.currentSessionId = this.generateSessionId();
    this.startSession();
  }

  /**
   * Get feature usage statistics
   */
  public getFeatureUsage(): FeatureUsage[] {
    return Array.from(this.featureUsage.values()).sort(
      (a, b) => b.usageCount - a.usageCount
    );
  }

  /**
   * Get top features by usage
   */
  public getTopFeatures(limit: number = 10): FeatureUsage[] {
    return this.getFeatureUsage().slice(0, limit);
  }

  /**
   * Get events by category
   */
  public getEventsByCategory(
    category: UserEvent['category'],
    startTime?: Date,
    endTime?: Date
  ): UserEvent[] {
    let filtered = this.events.filter(e => e.category === category);

    if (startTime) {
      filtered = filtered.filter(e => e.timestamp >= startTime);
    }

    if (endTime) {
      filtered = filtered.filter(e => e.timestamp <= endTime);
    }

    return filtered;
  }

  /**
   * Get engagement metrics
   */
  public getEngagementMetrics(): EngagementMetrics {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const recentSessions = Array.from(this.sessions.values());

    const dailyActiveSessions = recentSessions.filter(
      s => s.startTime >= oneDayAgo
    );
    const weeklyActiveSessions = recentSessions.filter(
      s => s.startTime >= oneWeekAgo
    );
    const monthlyActiveSessions = recentSessions.filter(
      s => s.startTime >= oneMonthAgo
    );

    const completedSessions = recentSessions.filter(s => s.duration);
    const averageDuration =
      completedSessions.length > 0
        ? completedSessions.reduce((sum, s) => sum + (s.duration || 0), 0) /
          completedSessions.length
        : 0;

    return {
      dailyActiveUsers: this.countUniqueUsers(dailyActiveSessions),
      weeklyActiveUsers: this.countUniqueUsers(weeklyActiveSessions),
      monthlyActiveUsers: this.countUniqueUsers(monthlyActiveSessions),
      averageSessionDuration: averageDuration,
      sessionsPerUser: this.calculateSessionsPerUser(monthlyActiveSessions),
      retentionRate: {
        day1: 0, // Would be calculated with backend data
        day7: 0,
        day30: 0,
      },
    };
  }

  /**
   * Get session statistics
   */
  public getSessionStats(): {
    totalSessions: number;
    averageDuration: number;
    averageScreenViews: number;
    averageInteractions: number;
  } {
    const sessions = Array.from(this.sessions.values());
    const completedSessions = sessions.filter(s => s.duration);

    const totalDuration = completedSessions.reduce(
      (sum, s) => sum + (s.duration || 0),
      0
    );
    const totalScreenViews = sessions.reduce((sum, s) => sum + s.screenViews, 0);
    const totalInteractions = sessions.reduce((sum, s) => sum + s.interactions, 0);

    return {
      totalSessions: sessions.length,
      averageDuration:
        completedSessions.length > 0 ? totalDuration / completedSessions.length : 0,
      averageScreenViews: sessions.length > 0 ? totalScreenViews / sessions.length : 0,
      averageInteractions: sessions.length > 0 ? totalInteractions / sessions.length : 0,
    };
  }

  /**
   * Count unique users in sessions
   */
  private countUniqueUsers(sessions: UserSession[]): number {
    const uniqueUsers = new Set(
      sessions.filter(s => s.userId).map(s => s.userId)
    );
    return uniqueUsers.size;
  }

  /**
   * Calculate sessions per user
   */
  private calculateSessionsPerUser(sessions: UserSession[]): number {
    const uniqueUsers = this.countUniqueUsers(sessions);
    return uniqueUsers > 0 ? sessions.length / uniqueUsers : 0;
  }

  /**
   * Generate session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Send event to backend
   */
  private async sendEventToBackend(event: UserEvent): Promise<void> {
    // Implementation would send to backend analytics API
    // Example: await api.post('/analytics/events', event);
  }

  /**
   * Send session to backend
   */
  private async sendSessionToBackend(session: UserSession): Promise<void> {
    // Implementation would send to backend analytics API
    // Example: await api.post('/analytics/sessions', session);
  }

  /**
   * Clear old data
   */
  public clearOldData(daysToKeep: number = 7): void {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    // Clear old events
    this.events = this.events.filter(e => e.timestamp >= cutoffDate);

    // Clear old sessions
    Array.from(this.sessions.entries()).forEach(([id, session]) => {
      if (session.startTime < cutoffDate) {
        this.sessions.delete(id);
      }
    });
  }
}

export default AnalyticsCollectionService.getInstance();