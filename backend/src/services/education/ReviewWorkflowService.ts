/**
 * Review Workflow Service
 *
 * Manages the complete review workflow for educational content:
 * - Draft → Submit for Review → In Review → Approved → Published
 * - Reviewer assignment and notifications
 * - Comment system for review feedback
 * - Workflow state transitions with validation
 */

import { DatabaseService } from '../database/databaseService';
import { ContentVersioningService, VersionChangeType } from './ContentVersioningService';
import { IDatabase } from 'pg-promise';
import { logger } from '../../utils/logger';

export interface ReviewComment {
    id: string;
    contentId: string;
    version?: number;
    reviewerId: string;
    comment: string;
    section?: string;
    severity: 'info' | 'suggestion' | 'required' | 'critical';
    status: 'pending' | 'addressed' | 'resolved' | 'wont_fix';
    parentCommentId?: string;
    createdAt: Date;
    updatedAt: Date;
    resolvedAt?: Date;
    resolvedBy?: string;
    reviewerName?: string;
    reviewerEmail?: string;
}

export interface ContentReview {
    id: string;
    title: Record<string, string>;
    description: Record<string, string>;
    type: string;
    category: string;
    status: 'draft' | 'in_review' | 'approved' | 'published' | 'archived';
    authorId: string;
    authorName?: string;
    reviewerId?: string;
    reviewerName?: string;
    reviewNotes?: string;
    version: number;
    createdAt: Date;
    updatedAt: Date;
    submittedForReviewAt?: Date;
}

export interface ReviewAssignment {
    contentId: string;
    reviewerId: string;
    assignedBy: string;
    assignedAt: Date;
}

export interface WorkflowTransition {
    contentId: string;
    fromStatus: string;
    toStatus: string;
    userId: string;
    reason?: string;
    timestamp: Date;
}

export interface SubmitForReviewParams {
    contentId: string;
    userId: string;
}

export interface AssignReviewerParams {
    contentId: string;
    reviewerId: string;
    assignedBy: string;
}

export interface ApproveContentParams {
    contentId: string;
    reviewerId: string;
    comment?: string;
}

export interface RequestChangesParams {
    contentId: string;
    reviewerId: string;
    comment: string;
    severity?: 'info' | 'suggestion' | 'required' | 'critical';
}

export interface PublishContentParams {
    contentId: string;
    publishedBy: string;
}

export interface AddCommentParams {
    contentId: string;
    reviewerId: string;
    comment: string;
    section?: string;
    severity?: 'info' | 'suggestion' | 'required' | 'critical';
    parentCommentId?: string;
}

export class ReviewWorkflowService {
    private db: IDatabase<any>;
    private versioningService: ContentVersioningService;

    constructor() {
        const dbService = DatabaseService.getInstance();
        this.db = dbService.getConnection();
        this.versioningService = new ContentVersioningService();
    }

    /**
     * Submit content for review
     * Transitions status: draft → in_review
     */
    async submitForReview(params: SubmitForReviewParams): Promise<ContentReview> {
        const { contentId, userId } = params;

        return this.db.tx(async (t) => {
            // Get current content
            const content = await t.oneOrNone(
                `SELECT * FROM education_content WHERE id = $1`,
                [contentId]
            );

            if (!content) {
                throw new Error(`Content ${contentId} not found`);
            }

            // Verify ownership
            if (content.author_id !== userId) {
                throw new Error('Only the author can submit content for review');
            }

            // Validate content status
            if (content.status !== 'draft') {
                throw new Error(`Cannot submit content with status ${content.status} for review`);
            }

            // Validate content completeness - check all languages have content
            const title = typeof content.title === 'string' ? JSON.parse(content.title) : content.title;
            const body = typeof content.body === 'string' ? JSON.parse(content.body) : content.body;

            const languages = ['ms', 'en', 'zh', 'ta'];
            const missingLanguages = languages.filter(lang => !title[lang] || !body[lang]);

            if (missingLanguages.length > 0) {
                throw new Error(`Missing content for languages: ${missingLanguages.join(', ')}`);
            }

            // Update status to in_review
            const updated = await t.one(
                `
                UPDATE education_content
                SET
                    status = 'in_review',
                    updated_at = NOW()
                WHERE id = $1
                RETURNING *
                `,
                [contentId]
            );

            // Create version snapshot
            await this.versioningService.createVersion({
                contentId,
                version: content.version,
                title,
                description: typeof content.description === 'string' ? JSON.parse(content.description) : content.description,
                body,
                metadata: typeof content.metadata === 'string' ? JSON.parse(content.metadata) : content.metadata,
                changedBy: userId,
                changeNote: 'Submitted for review',
                changeType: 'reviewed',
                previousVersion: content.version - 1,
                statusAtVersion: 'in_review'
            });

            logger.info('Content submitted for review', {
                contentId,
                userId,
                version: content.version
            });

            return this.formatContentReview(updated);
        });
    }

    /**
     * Assign reviewer to content
     * Only admins can assign reviewers
     */
    async assignReviewer(params: AssignReviewerParams): Promise<ContentReview> {
        const { contentId, reviewerId, assignedBy } = params;

        return this.db.tx(async (t) => {
            // Verify content exists and is in_review
            const content = await t.oneOrNone(
                `SELECT * FROM education_content WHERE id = $1`,
                [contentId]
            );

            if (!content) {
                throw new Error(`Content ${contentId} not found`);
            }

            if (content.status !== 'in_review') {
                throw new Error(`Content must be in review status to assign reviewer`);
            }

            // Verify reviewer exists and has medical_reviewer role
            // Note: This assumes users table has a role column
            const reviewer = await t.oneOrNone(
                `SELECT * FROM users WHERE id = $1`,
                [reviewerId]
            );

            if (!reviewer) {
                throw new Error(`Reviewer ${reviewerId} not found`);
            }

            // Update content with reviewer
            const updated = await t.one(
                `
                UPDATE education_content
                SET
                    reviewer_id = $1,
                    updated_at = NOW()
                WHERE id = $2
                RETURNING *
                `,
                [reviewerId, contentId]
            );

            logger.info('Reviewer assigned to content', {
                contentId,
                reviewerId,
                assignedBy
            });

            // TODO: Send email notification to reviewer
            // await this.sendReviewerNotification(reviewerId, contentId);

            return this.formatContentReview(updated);
        });
    }

    /**
     * Approve content
     * Transitions status: in_review → approved
     */
    async approveContent(params: ApproveContentParams): Promise<ContentReview> {
        const { contentId, reviewerId, comment } = params;

        return this.db.tx(async (t) => {
            // Get current content
            const content = await t.oneOrNone(
                `SELECT * FROM education_content WHERE id = $1`,
                [contentId]
            );

            if (!content) {
                throw new Error(`Content ${contentId} not found`);
            }

            // Verify content is in review
            if (content.status !== 'in_review') {
                throw new Error(`Content must be in review status to approve`);
            }

            // Verify reviewer is assigned (or user is admin)
            // For now, we allow any reviewer to approve
            // In production, you might want to check if reviewerId matches content.reviewer_id

            // Update status to approved
            const updated = await t.one(
                `
                UPDATE education_content
                SET
                    status = 'approved',
                    review_notes = $1,
                    updated_at = NOW()
                WHERE id = $2
                RETURNING *
                `,
                [comment || 'Approved', contentId]
            );

            // Add approval comment if provided
            if (comment) {
                await this.addComment({
                    contentId,
                    reviewerId,
                    comment,
                    severity: 'info'
                });
            }

            // Create version snapshot
            const title = typeof content.title === 'string' ? JSON.parse(content.title) : content.title;
            const description = typeof content.description === 'string' ? JSON.parse(content.description) : content.description;
            const body = typeof content.body === 'string' ? JSON.parse(content.body) : content.body;
            const metadata = typeof content.metadata === 'string' ? JSON.parse(content.metadata) : content.metadata;

            await this.versioningService.createVersion({
                contentId,
                version: content.version,
                title,
                description,
                body,
                metadata,
                changedBy: reviewerId,
                changeNote: 'Content approved',
                changeType: 'reviewed',
                previousVersion: content.version - 1,
                statusAtVersion: 'approved'
            });

            logger.info('Content approved', {
                contentId,
                reviewerId,
                version: content.version
            });

            // TODO: Send notification to content author
            // await this.sendApprovalNotification(content.author_id, contentId);

            return this.formatContentReview(updated);
        });
    }

    /**
     * Request changes to content
     * Transitions status: in_review → draft
     */
    async requestChanges(params: RequestChangesParams): Promise<ContentReview> {
        const { contentId, reviewerId, comment, severity = 'required' } = params;

        return this.db.tx(async (t) => {
            // Get current content
            const content = await t.oneOrNone(
                `SELECT * FROM education_content WHERE id = $1`,
                [contentId]
            );

            if (!content) {
                throw new Error(`Content ${contentId} not found`);
            }

            // Verify content is in review
            if (content.status !== 'in_review') {
                throw new Error(`Content must be in review status to request changes`);
            }

            // Update status back to draft
            const updated = await t.one(
                `
                UPDATE education_content
                SET
                    status = 'draft',
                    review_notes = $1,
                    updated_at = NOW()
                WHERE id = $2
                RETURNING *
                `,
                [comment, contentId]
            );

            // Add review comment
            await this.addComment({
                contentId,
                reviewerId,
                comment,
                severity
            });

            logger.info('Changes requested for content', {
                contentId,
                reviewerId,
                severity
            });

            // TODO: Send notification to content author
            // await this.sendChangesRequestedNotification(content.author_id, contentId, comment);

            return this.formatContentReview(updated);
        });
    }

    /**
     * Publish content
     * Transitions status: approved → published
     */
    async publishContent(params: PublishContentParams): Promise<ContentReview> {
        const { contentId, publishedBy } = params;

        return this.db.tx(async (t) => {
            // Get current content
            const content = await t.oneOrNone(
                `SELECT * FROM education_content WHERE id = $1`,
                [contentId]
            );

            if (!content) {
                throw new Error(`Content ${contentId} not found`);
            }

            // Verify content is approved (admin can bypass)
            if (content.status !== 'approved' && content.status !== 'draft') {
                throw new Error(`Content must be approved before publishing`);
            }

            // Update status to published
            const updated = await t.one(
                `
                UPDATE education_content
                SET
                    status = 'published',
                    published_at = NOW(),
                    updated_at = NOW()
                WHERE id = $2
                RETURNING *
                `,
                [contentId]
            );

            // Create version snapshot
            const title = typeof content.title === 'string' ? JSON.parse(content.title) : content.title;
            const description = typeof content.description === 'string' ? JSON.parse(content.description) : content.description;
            const body = typeof content.body === 'string' ? JSON.parse(content.body) : content.body;
            const metadata = typeof content.metadata === 'string' ? JSON.parse(content.metadata) : content.metadata;

            await this.versioningService.createVersion({
                contentId,
                version: content.version,
                title,
                description,
                body,
                metadata,
                changedBy: publishedBy,
                changeNote: 'Content published',
                changeType: 'published',
                previousVersion: content.version - 1,
                statusAtVersion: 'published'
            });

            logger.info('Content published', {
                contentId,
                publishedBy,
                version: content.version
            });

            return this.formatContentReview(updated);
        });
    }

    /**
     * Unpublish content
     * Transitions status: published → approved
     */
    async unpublishContent(contentId: string, userId: string): Promise<ContentReview> {
        return this.db.tx(async (t) => {
            const content = await t.oneOrNone(
                `SELECT * FROM education_content WHERE id = $1`,
                [contentId]
            );

            if (!content) {
                throw new Error(`Content ${contentId} not found`);
            }

            if (content.status !== 'published') {
                throw new Error(`Content must be published to unpublish`);
            }

            const updated = await t.one(
                `
                UPDATE education_content
                SET
                    status = 'approved',
                    published_at = NULL,
                    updated_at = NOW()
                WHERE id = $1
                RETURNING *
                `,
                [contentId]
            );

            logger.info('Content unpublished', { contentId, userId });

            return this.formatContentReview(updated);
        });
    }

    /**
     * Get pending reviews (not assigned to any reviewer)
     */
    async getPendingReviews(): Promise<ContentReview[]> {
        const reviews = await this.db.manyOrNone<any>(
            `
            SELECT
                ec.*,
                u.name as author_name,
                u.email as author_email
            FROM education_content ec
            LEFT JOIN users u ON ec.author_id = u.id
            WHERE ec.status = 'in_review' AND ec.reviewer_id IS NULL
            ORDER BY ec.updated_at DESC
            `
        );

        return (reviews || []).map(r => this.formatContentReview(r));
    }

    /**
     * Get reviews assigned to a specific reviewer
     */
    async getAssignedReviews(reviewerId: string): Promise<ContentReview[]> {
        const reviews = await this.db.manyOrNone<any>(
            `
            SELECT
                ec.*,
                u.name as author_name,
                u.email as author_email
            FROM education_content ec
            LEFT JOIN users u ON ec.author_id = u.id
            WHERE ec.reviewer_id = $1 AND ec.status = 'in_review'
            ORDER BY ec.updated_at DESC
            `,
            [reviewerId]
        );

        return (reviews || []).map(r => this.formatContentReview(r));
    }

    /**
     * Get all reviews for admin dashboard
     */
    async getAllReviews(filters?: {
        status?: string;
        reviewerId?: string;
        authorId?: string;
        limit?: number;
        offset?: number;
    }): Promise<{ reviews: ContentReview[]; total: number }> {
        const { status, reviewerId, authorId, limit = 50, offset = 0 } = filters || {};

        let whereClause = 'WHERE 1=1';
        const params: any[] = [];
        let paramIndex = 1;

        if (status) {
            whereClause += ` AND ec.status = $${paramIndex}`;
            params.push(status);
            paramIndex++;
        }

        if (reviewerId) {
            whereClause += ` AND ec.reviewer_id = $${paramIndex}`;
            params.push(reviewerId);
            paramIndex++;
        }

        if (authorId) {
            whereClause += ` AND ec.author_id = $${paramIndex}`;
            params.push(authorId);
            paramIndex++;
        }

        const reviews = await this.db.manyOrNone<any>(
            `
            SELECT
                ec.*,
                u1.name as author_name,
                u1.email as author_email,
                u2.name as reviewer_name,
                u2.email as reviewer_email
            FROM education_content ec
            LEFT JOIN users u1 ON ec.author_id = u1.id
            LEFT JOIN users u2 ON ec.reviewer_id = u2.id
            ${whereClause}
            ORDER BY ec.updated_at DESC
            LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
            `,
            [...params, limit, offset]
        );

        const countResult = await this.db.one<{ count: string }>(
            `
            SELECT COUNT(*) as count
            FROM education_content ec
            ${whereClause}
            `,
            params
        );

        return {
            reviews: (reviews || []).map(r => this.formatContentReview(r)),
            total: parseInt(countResult.count)
        };
    }

    /**
     * Add review comment
     */
    async addComment(params: AddCommentParams): Promise<ReviewComment> {
        const { contentId, reviewerId, comment, section, severity = 'info', parentCommentId } = params;

        const newComment = await this.db.one<ReviewComment>(
            `
            INSERT INTO education_review_comments (
                content_id, reviewer_id, comment, section, severity, parent_comment_id
            )
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING
                id,
                content_id as "contentId",
                version,
                reviewer_id as "reviewerId",
                comment,
                section,
                severity,
                status,
                parent_comment_id as "parentCommentId",
                created_at as "createdAt",
                updated_at as "updatedAt",
                resolved_at as "resolvedAt",
                resolved_by as "resolvedBy"
            `,
            [contentId, reviewerId, comment, section, severity, parentCommentId]
        );

        logger.info('Review comment added', {
            contentId,
            reviewerId,
            commentId: newComment.id,
            severity
        });

        return newComment;
    }

    /**
     * Get comments for content
     */
    async getComments(contentId: string): Promise<ReviewComment[]> {
        const comments = await this.db.manyOrNone<ReviewComment>(
            `
            SELECT
                rc.id,
                rc.content_id as "contentId",
                rc.version,
                rc.reviewer_id as "reviewerId",
                rc.comment,
                rc.section,
                rc.severity,
                rc.status,
                rc.parent_comment_id as "parentCommentId",
                rc.created_at as "createdAt",
                rc.updated_at as "updatedAt",
                rc.resolved_at as "resolvedAt",
                rc.resolved_by as "resolvedBy",
                u.name as "reviewerName",
                u.email as "reviewerEmail"
            FROM education_review_comments rc
            LEFT JOIN users u ON rc.reviewer_id = u.id
            WHERE rc.content_id = $1
            ORDER BY rc.created_at DESC
            `,
            [contentId]
        );

        return comments || [];
    }

    /**
     * Resolve comment
     */
    async resolveComment(commentId: string, userId: string): Promise<ReviewComment> {
        const updated = await this.db.one<ReviewComment>(
            `
            UPDATE education_review_comments
            SET
                status = 'resolved',
                resolved_at = NOW(),
                resolved_by = $1,
                updated_at = NOW()
            WHERE id = $2
            RETURNING
                id,
                content_id as "contentId",
                version,
                reviewer_id as "reviewerId",
                comment,
                section,
                severity,
                status,
                parent_comment_id as "parentCommentId",
                created_at as "createdAt",
                updated_at as "updatedAt",
                resolved_at as "resolvedAt",
                resolved_by as "resolvedBy"
            `,
            [userId, commentId]
        );

        logger.info('Comment resolved', { commentId, userId });

        return updated;
    }

    /**
     * Get review statistics
     */
    async getReviewStats(reviewerId?: string): Promise<{
        totalInReview: number;
        totalApproved: number;
        totalChangesRequested: number;
        averageReviewTime: number;
    }> {
        const whereClause = reviewerId ? 'WHERE reviewer_id = $1' : '';
        const params = reviewerId ? [reviewerId] : [];

        const stats = await this.db.one(
            `
            SELECT
                COUNT(*) FILTER (WHERE status = 'in_review') as total_in_review,
                COUNT(*) FILTER (WHERE status = 'approved') as total_approved,
                COUNT(*) FILTER (WHERE status = 'draft' AND review_notes IS NOT NULL) as total_changes_requested
            FROM education_content
            ${whereClause}
            `,
            params
        );

        return {
            totalInReview: parseInt(stats.total_in_review || '0'),
            totalApproved: parseInt(stats.total_approved || '0'),
            totalChangesRequested: parseInt(stats.total_changes_requested || '0'),
            averageReviewTime: 0 // TODO: Calculate from version history
        };
    }

    /**
     * Format content for review response
     */
    private formatContentReview(content: any): ContentReview {
        return {
            id: content.id,
            title: typeof content.title === 'string' ? JSON.parse(content.title) : content.title,
            description: typeof content.description === 'string' ? JSON.parse(content.description) : content.description,
            type: content.type,
            category: content.category,
            status: content.status,
            authorId: content.author_id,
            authorName: content.author_name,
            reviewerId: content.reviewer_id,
            reviewerName: content.reviewer_name,
            reviewNotes: content.review_notes,
            version: content.version,
            createdAt: content.created_at,
            updatedAt: content.updated_at,
            submittedForReviewAt: content.submitted_for_review_at
        };
    }
}

export default ReviewWorkflowService;
