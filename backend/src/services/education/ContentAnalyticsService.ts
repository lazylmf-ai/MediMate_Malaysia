/**
 * Content Analytics Service
 *
 * Provides comprehensive analytics for educational content including
 * views, completions, engagement metrics, and performance tracking.
 * Supports language-specific metrics and time-based analysis.
 */

import { DatabaseService } from '../database/databaseService';
import { IDatabase } from 'pg-promise';

export type Language = 'ms' | 'en' | 'zh' | 'ta';

export interface AnalyticsOverview {
    totalContent: number;
    totalViews: number;
    totalCompletions: number;
    averageEngagement: number;
    topContent: TopContentItem[];
    contentByStatus: StatusDistribution[];
    viewsByMonth: MonthlyViews[];
}

export interface ContentAnalytics {
    contentId: string;
    views: number;
    completions: number;
    completionRate: number;
    averageTimeSpent: number;
    averageRating: number;
    shareCount: number;
    viewsByLanguage: LanguageViews[];
    viewsByDate: DailyViews[];
}

export interface TopContentItem {
    id: string;
    title: string;
    views: number;
    completions: number;
    engagementRate: number;
    averageRating: number;
}

export interface StatusDistribution {
    name: string;
    count: number;
    population: number;
    color: string;
    legendFontColor: string;
    legendFontSize: number;
}

export interface MonthlyViews {
    month: string;
    views: number;
    completions: number;
}

export interface LanguageViews {
    language: Language;
    views: number;
    percentage: number;
}

export interface DailyViews {
    date: string;
    views: number;
    completions: number;
}

export interface TrackViewParams {
    contentId: string;
    userId: string;
    language: Language;
    sessionId?: string;
    deviceType?: string;
    platform?: string;
}

export interface TrackCompletionParams {
    contentId: string;
    userId: string;
    timeSpentSeconds: number;
    completionPercentage?: number;
}

export class ContentAnalyticsService {
    private db: IDatabase<any>;

    constructor() {
        const dbService = DatabaseService.getInstance();
        this.db = dbService.getConnection();
    }

    /**
     * Get overview analytics for all content
     */
    async getOverviewAnalytics(): Promise<AnalyticsOverview> {
        const [
            totalContent,
            totalViews,
            totalCompletions,
            averageEngagement,
            topContent,
            contentByStatus,
            viewsByMonth
        ] = await Promise.all([
            this.getTotalContentCount(),
            this.getTotalViews(),
            this.getTotalCompletions(),
            this.getAverageEngagement(),
            this.getTopContent(10),
            this.getContentByStatus(),
            this.getViewsByMonth(12)
        ]);

        return {
            totalContent,
            totalViews,
            totalCompletions,
            averageEngagement,
            topContent,
            contentByStatus,
            viewsByMonth
        };
    }

    /**
     * Get detailed analytics for specific content
     */
    async getContentAnalytics(contentId: string): Promise<ContentAnalytics> {
        const [
            views,
            completions,
            averageTimeSpent,
            userRatings,
            shareCount,
            viewsByLanguage,
            viewsByDate
        ] = await Promise.all([
            this.getContentViews(contentId),
            this.getContentCompletions(contentId),
            this.getAverageTimeSpent(contentId),
            this.getUserRatings(contentId),
            this.getShareCount(contentId),
            this.getViewsByLanguage(contentId),
            this.getViewsByDate(contentId, 30)
        ]);

        return {
            contentId,
            views,
            completions,
            completionRate: views > 0 ? completions / views : 0,
            averageTimeSpent,
            averageRating: this.calculateAverageRating(userRatings),
            shareCount,
            viewsByLanguage,
            viewsByDate
        };
    }

    /**
     * Track content view event
     */
    async trackView(params: TrackViewParams): Promise<void> {
        const { contentId, userId, language, sessionId, deviceType, platform } = params;

        await this.db.none(
            `
            INSERT INTO education_analytics_views (
                content_id, user_id, language, session_id, device_type, platform, viewed_at
            )
            VALUES ($1, $2, $3, $4, $5, $6, NOW())
            `,
            [contentId, userId, language, sessionId, deviceType, platform]
        );

        // Update denormalized view count
        await this.db.none(
            `
            UPDATE education_content
            SET view_count = view_count + 1
            WHERE id = $1
            `,
            [contentId]
        );
    }

    /**
     * Track content completion event
     */
    async trackCompletion(params: TrackCompletionParams): Promise<void> {
        const { contentId, userId, timeSpentSeconds, completionPercentage = 100 } = params;

        await this.db.none(
            `
            INSERT INTO education_analytics_completions (
                content_id, user_id, time_spent_seconds, completion_percentage, completed_at
            )
            VALUES ($1, $2, $3, $4, NOW())
            `,
            [contentId, userId, timeSpentSeconds, completionPercentage]
        );

        // Update denormalized completion count
        await this.db.none(
            `
            UPDATE education_content
            SET completion_count = completion_count + 1
            WHERE id = $1
            `,
            [contentId]
        );
    }

    /**
     * Get total content count by status
     */
    private async getTotalContentCount(): Promise<number> {
        const result = await this.db.one<{ count: string }>(
            `
            SELECT COUNT(*) as count
            FROM education_content
            WHERE status != 'archived'
            `
        );
        return parseInt(result.count);
    }

    /**
     * Get total views across all content
     */
    private async getTotalViews(): Promise<number> {
        const result = await this.db.one<{ total: string }>(
            `
            SELECT COALESCE(SUM(view_count), 0) as total
            FROM education_content
            WHERE status = 'published'
            `
        );
        return parseInt(result.total);
    }

    /**
     * Get total completions across all content
     */
    private async getTotalCompletions(): Promise<number> {
        const result = await this.db.one<{ total: string }>(
            `
            SELECT COALESCE(SUM(completion_count), 0) as total
            FROM education_content
            WHERE status = 'published'
            `
        );
        return parseInt(result.total);
    }

    /**
     * Get average engagement rate across all content
     */
    private async getAverageEngagement(): Promise<number> {
        const result = await this.db.one<{ engagement: string | null }>(
            `
            SELECT COALESCE(
                AVG(
                    CASE
                        WHEN view_count > 0 THEN completion_count::DECIMAL / view_count
                        ELSE 0
                    END
                ),
                0
            ) as engagement
            FROM education_content
            WHERE status = 'published' AND view_count > 0
            `
        );
        return result.engagement ? parseFloat(result.engagement) : 0;
    }

    /**
     * Get top performing content by engagement
     */
    private async getTopContent(limit: number = 10): Promise<TopContentItem[]> {
        const results = await this.db.manyOrNone<{
            id: string;
            title: string;
            view_count: number;
            completion_count: number;
            engagement_rate: number;
            average_rating: number | null;
        }>(
            `
            SELECT
                ec.id,
                ec.title->>'en' as title,
                ec.view_count,
                ec.completion_count,
                CASE
                    WHEN ec.view_count > 0 THEN ec.completion_count::DECIMAL / ec.view_count
                    ELSE 0
                END as engagement_rate,
                (
                    SELECT AVG(rating)
                    FROM education_content_ratings
                    WHERE content_id = ec.id
                ) as average_rating
            FROM education_content ec
            WHERE ec.status = 'published'
            ORDER BY engagement_rate DESC, ec.view_count DESC
            LIMIT $1
            `,
            [limit]
        );

        return results.map(r => ({
            id: r.id,
            title: r.title,
            views: r.view_count,
            completions: r.completion_count,
            engagementRate: parseFloat(r.engagement_rate.toString()),
            averageRating: r.average_rating ? parseFloat(r.average_rating.toString()) : 0
        }));
    }

    /**
     * Get content distribution by status (for pie chart)
     */
    private async getContentByStatus(): Promise<StatusDistribution[]> {
        const results = await this.db.manyOrNone<{
            status: string;
            count: string;
        }>(
            `
            SELECT
                status,
                COUNT(*) as count
            FROM education_content
            WHERE status != 'archived'
            GROUP BY status
            ORDER BY count DESC
            `
        );

        const statusColors: Record<string, string> = {
            published: '#4CAF50',
            approved: '#2196F3',
            in_review: '#FF9800',
            draft: '#9E9E9E'
        };

        return results.map(r => ({
            name: this.formatStatusName(r.status),
            count: parseInt(r.count),
            population: parseInt(r.count),
            color: statusColors[r.status] || '#757575',
            legendFontColor: '#7F7F7F',
            legendFontSize: 12
        }));
    }

    /**
     * Get views by month for trend chart
     */
    private async getViewsByMonth(months: number = 12): Promise<MonthlyViews[]> {
        const results = await this.db.manyOrNone<{
            month: string;
            views: string;
            completions: string;
        }>(
            `
            SELECT
                TO_CHAR(viewed_at, 'YYYY-MM') as month,
                COUNT(*) as views,
                (
                    SELECT COUNT(*)
                    FROM education_analytics_completions
                    WHERE TO_CHAR(completed_at, 'YYYY-MM') = TO_CHAR(v.viewed_at, 'YYYY-MM')
                ) as completions
            FROM education_analytics_views v
            WHERE viewed_at >= NOW() - INTERVAL '${months} months'
            GROUP BY month
            ORDER BY month ASC
            `
        );

        return results.map(r => ({
            month: this.formatMonthLabel(r.month),
            views: parseInt(r.views),
            completions: parseInt(r.completions)
        }));
    }

    /**
     * Get view count for specific content
     */
    private async getContentViews(contentId: string): Promise<number> {
        const result = await this.db.one<{ count: string }>(
            `
            SELECT COUNT(*) as count
            FROM education_analytics_views
            WHERE content_id = $1
            `,
            [contentId]
        );
        return parseInt(result.count);
    }

    /**
     * Get completion count for specific content
     */
    private async getContentCompletions(contentId: string): Promise<number> {
        const result = await this.db.one<{ count: string }>(
            `
            SELECT COUNT(*) as count
            FROM education_analytics_completions
            WHERE content_id = $1
            `,
            [contentId]
        );
        return parseInt(result.count);
    }

    /**
     * Get average time spent on content
     */
    private async getAverageTimeSpent(contentId: string): Promise<number> {
        const result = await this.db.one<{ average: string | null }>(
            `
            SELECT COALESCE(AVG(time_spent_seconds), 0) as average
            FROM education_analytics_completions
            WHERE content_id = $1
            `,
            [contentId]
        );
        return result.average ? parseFloat(result.average) : 0;
    }

    /**
     * Get user ratings for content
     */
    private async getUserRatings(contentId: string): Promise<number[]> {
        const results = await this.db.manyOrNone<{ rating: number }>(
            `
            SELECT rating
            FROM education_content_ratings
            WHERE content_id = $1
            `,
            [contentId]
        );
        return results.map(r => r.rating);
    }

    /**
     * Get share count for content (stub - to be implemented with share tracking)
     */
    private async getShareCount(contentId: string): Promise<number> {
        // TODO: Implement share tracking table and query
        return 0;
    }

    /**
     * Get views by language for content
     */
    private async getViewsByLanguage(contentId: string): Promise<LanguageViews[]> {
        const results = await this.db.manyOrNone<{
            language: Language;
            count: string;
        }>(
            `
            SELECT
                language,
                COUNT(*) as count
            FROM education_analytics_views
            WHERE content_id = $1
            GROUP BY language
            ORDER BY count DESC
            `,
            [contentId]
        );

        const totalViews = results.reduce((sum, r) => sum + parseInt(r.count), 0);

        return results.map(r => {
            const views = parseInt(r.count);
            return {
                language: r.language,
                views,
                percentage: totalViews > 0 ? (views / totalViews) * 100 : 0
            };
        });
    }

    /**
     * Get daily views for content over specified days
     */
    private async getViewsByDate(contentId: string, days: number = 30): Promise<DailyViews[]> {
        const results = await this.db.manyOrNone<{
            date: string;
            views: string;
            completions: string;
        }>(
            `
            SELECT
                TO_CHAR(viewed_at, 'YYYY-MM-DD') as date,
                COUNT(*) as views,
                (
                    SELECT COUNT(*)
                    FROM education_analytics_completions
                    WHERE content_id = $1
                    AND TO_CHAR(completed_at, 'YYYY-MM-DD') = TO_CHAR(v.viewed_at, 'YYYY-MM-DD')
                ) as completions
            FROM education_analytics_views v
            WHERE content_id = $1
            AND viewed_at >= NOW() - INTERVAL '${days} days'
            GROUP BY date
            ORDER BY date ASC
            `,
            [contentId]
        );

        return results.map(r => ({
            date: r.date,
            views: parseInt(r.views),
            completions: parseInt(r.completions)
        }));
    }

    /**
     * Calculate average rating from array of ratings
     */
    private calculateAverageRating(ratings: number[]): number {
        if (ratings.length === 0) return 0;
        const sum = ratings.reduce((acc, rating) => acc + rating, 0);
        return sum / ratings.length;
    }

    /**
     * Format status name for display
     */
    private formatStatusName(status: string): string {
        const statusMap: Record<string, string> = {
            draft: 'Draft',
            in_review: 'In Review',
            approved: 'Approved',
            published: 'Published'
        };
        return statusMap[status] || status;
    }

    /**
     * Format month label for charts
     */
    private formatMonthLabel(monthStr: string): string {
        const [year, month] = monthStr.split('-');
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                           'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return `${monthNames[parseInt(month) - 1]} ${year.slice(2)}`;
    }

    /**
     * Get analytics summary for multiple content items (for bulk operations)
     */
    async getBulkAnalytics(contentIds: string[]): Promise<Map<string, ContentAnalytics>> {
        const analyticsMap = new Map<string, ContentAnalytics>();

        await Promise.all(
            contentIds.map(async (id) => {
                const analytics = await this.getContentAnalytics(id);
                analyticsMap.set(id, analytics);
            })
        );

        return analyticsMap;
    }

    /**
     * Get engagement metrics for reporting
     */
    async getEngagementMetrics(
        startDate: Date,
        endDate: Date
    ): Promise<{
        totalViews: number;
        totalCompletions: number;
        averageCompletionRate: number;
        averageTimeSpent: number;
        activeUsers: number;
    }> {
        const result = await this.db.one(
            `
            WITH view_stats AS (
                SELECT COUNT(*) as total_views, COUNT(DISTINCT user_id) as active_users
                FROM education_analytics_views
                WHERE viewed_at BETWEEN $1 AND $2
            ),
            completion_stats AS (
                SELECT
                    COUNT(*) as total_completions,
                    AVG(time_spent_seconds) as avg_time_spent
                FROM education_analytics_completions
                WHERE completed_at BETWEEN $1 AND $2
            )
            SELECT
                v.total_views,
                v.active_users,
                COALESCE(c.total_completions, 0) as total_completions,
                CASE
                    WHEN v.total_views > 0
                    THEN COALESCE(c.total_completions::DECIMAL / v.total_views, 0)
                    ELSE 0
                END as avg_completion_rate,
                COALESCE(c.avg_time_spent, 0) as avg_time_spent
            FROM view_stats v
            CROSS JOIN completion_stats c
            `,
            [startDate, endDate]
        );

        return {
            totalViews: parseInt(result.total_views),
            totalCompletions: parseInt(result.total_completions),
            averageCompletionRate: parseFloat(result.avg_completion_rate),
            averageTimeSpent: parseFloat(result.avg_time_spent),
            activeUsers: parseInt(result.active_users)
        };
    }
}
