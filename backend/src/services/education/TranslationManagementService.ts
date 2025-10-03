/**
 * Translation Management Service
 * 
 * Manages translation status tracking for educational content across
 * all supported languages (Malay, English, Chinese, Tamil).
 * Provides progress indicators and workflow management.
 */

import { DatabaseService } from '../database/databaseService';
import { IDatabase } from 'pg-promise';

export type Language = 'ms' | 'en' | 'zh' | 'ta';
export type TranslationStatus = 'missing' | 'draft' | 'review' | 'approved';

export interface TranslationStatusRecord {
    id: string;
    contentId: string;
    language: Language;
    status: TranslationStatus;
    translatorId?: string;
    reviewerId?: string;
    translationNotes?: string;
    wordCount: number;
    startedAt?: Date;
    draftCompletedAt?: Date;
    submittedForReviewAt?: Date;
    approvedAt?: Date;
    lastUpdated: Date;
    qualityScore?: number;
    reviewComments?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface TranslationProgress {
    contentId: string;
    title: string;
    status: string;
    totalLanguages: number;
    approvedCount: number;
    reviewCount: number;
    draftCount: number;
    missingCount: number;
    completionPercentage: number;
}

export interface LanguageProgress {
    language: Language;
    status: TranslationStatus;
    translatorId?: string;
    reviewerId?: string;
    lastUpdated: Date;
    wordCount: number;
    qualityScore?: number;
}

export interface UpdateTranslationStatusParams {
    contentId: string;
    language: Language;
    status: TranslationStatus;
    translatorId?: string;
    reviewerId?: string;
    translationNotes?: string;
    wordCount?: number;
    qualityScore?: number;
    reviewComments?: string;
}

export class TranslationManagementService {
    private db: IDatabase<any>;
    private readonly supportedLanguages: Language[] = ['ms', 'en', 'zh', 'ta'];

    constructor() {
        const dbService = DatabaseService.getInstance();
        this.db = dbService.getConnection();
    }

    /**
     * Initialize translation status records for new content
     */
    async initializeTranslationStatus(
        contentId: string,
        primaryLanguage: Language = 'en'
    ): Promise<TranslationStatusRecord[]> {
        const records: TranslationStatusRecord[] = [];

        for (const language of this.supportedLanguages) {
            const status: TranslationStatus = language === primaryLanguage ? 'draft' : 'missing';
            
            const record = await this.db.one<TranslationStatusRecord>(
                `
                INSERT INTO education_translation_status (
                    content_id, language, status, word_count
                )
                VALUES ($1, $2, $3, 0)
                ON CONFLICT (content_id, language) 
                DO UPDATE SET last_updated = NOW()
                RETURNING 
                    id, content_id as "contentId", language, status,
                    translator_id as "translatorId", reviewer_id as "reviewerId",
                    translation_notes as "translationNotes", word_count as "wordCount",
                    started_at as "startedAt", draft_completed_at as "draftCompletedAt",
                    submitted_for_review_at as "submittedForReviewAt", approved_at as "approvedAt",
                    last_updated as "lastUpdated", quality_score as "qualityScore",
                    review_comments as "reviewComments", created_at as "createdAt",
                    updated_at as "updatedAt"
                `,
                [contentId, language, status]
            );

            records.push(record);
        }

        return records;
    }

    /**
     * Get translation status for specific content and language
     */
    async getTranslationStatus(
        contentId: string,
        language: Language
    ): Promise<TranslationStatusRecord | null> {
        const record = await this.db.oneOrNone<TranslationStatusRecord>(
            `
            SELECT 
                id, content_id as "contentId", language, status,
                translator_id as "translatorId", reviewer_id as "reviewerId",
                translation_notes as "translationNotes", word_count as "wordCount",
                started_at as "startedAt", draft_completed_at as "draftCompletedAt",
                submitted_for_review_at as "submittedForReviewAt", approved_at as "approvedAt",
                last_updated as "lastUpdated", quality_score as "qualityScore",
                review_comments as "reviewComments", created_at as "createdAt",
                updated_at as "updatedAt"
            FROM education_translation_status
            WHERE content_id = $1 AND language = $2
            `,
            [contentId, language]
        );

        return record;
    }

    /**
     * Get all translation statuses for content
     */
    async getAllTranslationStatuses(
        contentId: string
    ): Promise<Record<Language, TranslationStatusRecord>> {
        const records = await this.db.manyOrNone<TranslationStatusRecord>(
            `
            SELECT 
                id, content_id as "contentId", language, status,
                translator_id as "translatorId", reviewer_id as "reviewerId",
                translation_notes as "translationNotes", word_count as "wordCount",
                started_at as "startedAt", draft_completed_at as "draftCompletedAt",
                submitted_for_review_at as "submittedForReviewAt", approved_at as "approvedAt",
                last_updated as "lastUpdated", quality_score as "qualityScore",
                review_comments as "reviewComments", created_at as "createdAt",
                updated_at as "updatedAt"
            FROM education_translation_status
            WHERE content_id = $1
            ORDER BY language
            `,
            [contentId]
        );

        const statusMap: Partial<Record<Language, TranslationStatusRecord>> = {};
        records?.forEach(record => {
            statusMap[record.language] = record;
        });

        return statusMap as Record<Language, TranslationStatusRecord>;
    }

    /**
     * Update translation status
     */
    async updateTranslationStatus(
        params: UpdateTranslationStatusParams
    ): Promise<TranslationStatusRecord> {
        const currentStatus = await this.getTranslationStatus(
            params.contentId,
            params.language
        );

        if (!currentStatus) {
            throw new Error(
                `Translation status not found for content ${params.contentId} language ${params.language}`
            );
        }

        // Determine timestamp updates based on status transitions
        const timestampUpdates: any = {};
        
        if (params.status === 'draft' && currentStatus.status === 'missing') {
            timestampUpdates.startedAt = 'NOW()';
        }
        
        if (params.status === 'review' && currentStatus.status === 'draft') {
            timestampUpdates.draftCompletedAt = 'NOW()';
            timestampUpdates.submittedForReviewAt = 'NOW()';
        }
        
        if (params.status === 'approved' && currentStatus.status === 'review') {
            timestampUpdates.approvedAt = 'NOW()';
        }

        const timestampFields = Object.keys(timestampUpdates).map(key => 
            `${this.camelToSnake(key)} = ${timestampUpdates[key]}`
        ).join(', ');

        const baseUpdate = `
            UPDATE education_translation_status
            SET 
                status = $1,
                translator_id = COALESCE($2, translator_id),
                reviewer_id = COALESCE($3, reviewer_id),
                translation_notes = COALESCE($4, translation_notes),
                word_count = COALESCE($5, word_count),
                quality_score = COALESCE($6, quality_score),
                review_comments = COALESCE($7, review_comments),
                last_updated = NOW()
                ${timestampFields ? ', ' + timestampFields : ''}
            WHERE content_id = $8 AND language = $9
            RETURNING 
                id, content_id as "contentId", language, status,
                translator_id as "translatorId", reviewer_id as "reviewerId",
                translation_notes as "translationNotes", word_count as "wordCount",
                started_at as "startedAt", draft_completed_at as "draftCompletedAt",
                submitted_for_review_at as "submittedForReviewAt", approved_at as "approvedAt",
                last_updated as "lastUpdated", quality_score as "qualityScore",
                review_comments as "reviewComments", created_at as "createdAt",
                updated_at as "updatedAt"
        `;

        const record = await this.db.one<TranslationStatusRecord>(
            baseUpdate,
            [
                params.status,
                params.translatorId,
                params.reviewerId,
                params.translationNotes,
                params.wordCount,
                params.qualityScore,
                params.reviewComments,
                params.contentId,
                params.language
            ]
        );

        return record;
    }

    /**
     * Get translation progress for content
     */
    async getTranslationProgress(contentId: string): Promise<LanguageProgress[]> {
        const records = await this.db.manyOrNone<LanguageProgress>(
            `
            SELECT 
                language,
                status,
                translator_id as "translatorId",
                reviewer_id as "reviewerId",
                last_updated as "lastUpdated",
                word_count as "wordCount",
                quality_score as "qualityScore"
            FROM education_translation_status
            WHERE content_id = $1
            ORDER BY 
                CASE language
                    WHEN 'en' THEN 1
                    WHEN 'ms' THEN 2
                    WHEN 'zh' THEN 3
                    WHEN 'ta' THEN 4
                END
            `,
            [contentId]
        );

        return records || [];
    }

    /**
     * Get overall translation progress across all content
     */
    async getOverallProgress(): Promise<TranslationProgress[]> {
        const progress = await this.db.manyOrNone<TranslationProgress>(
            `
            SELECT 
                ec.id AS "contentId",
                ec.title->>'en' AS title,
                ec.status,
                COUNT(ets.id) AS "totalLanguages",
                SUM(CASE WHEN ets.status = 'approved' THEN 1 ELSE 0 END) AS "approvedCount",
                SUM(CASE WHEN ets.status = 'review' THEN 1 ELSE 0 END) AS "reviewCount",
                SUM(CASE WHEN ets.status = 'draft' THEN 1 ELSE 0 END) AS "draftCount",
                SUM(CASE WHEN ets.status = 'missing' THEN 1 ELSE 0 END) AS "missingCount",
                ROUND(
                    (SUM(CASE WHEN ets.status = 'approved' THEN 1 ELSE 0 END)::DECIMAL / 
                     COUNT(ets.id)) * 100, 
                    2
                ) AS "completionPercentage"
            FROM education_content ec
            LEFT JOIN education_translation_status ets ON ec.id = ets.content_id
            GROUP BY ec.id, ec.title, ec.status
            ORDER BY ec.created_at DESC
            `
        );

        return progress || [];
    }

    /**
     * Get content by translation status
     */
    async getContentByTranslationStatus(
        language: Language,
        status: TranslationStatus
    ): Promise<Array<{ contentId: string; title: string; lastUpdated: Date }>> {
        const content = await this.db.manyOrNone(
            `
            SELECT 
                ec.id AS "contentId",
                ec.title->>'en' AS title,
                ets.last_updated AS "lastUpdated"
            FROM education_translation_status ets
            JOIN education_content ec ON ets.content_id = ec.id
            WHERE ets.language = $1 AND ets.status = $2
            ORDER BY ets.last_updated DESC
            `,
            [language, status]
        );

        return content || [];
    }

    /**
     * Assign translator to content/language
     */
    async assignTranslator(
        contentId: string,
        language: Language,
        translatorId: string
    ): Promise<TranslationStatusRecord> {
        return this.updateTranslationStatus({
            contentId,
            language,
            status: 'draft',
            translatorId
        });
    }

    /**
     * Assign reviewer to translation
     */
    async assignReviewer(
        contentId: string,
        language: Language,
        reviewerId: string
    ): Promise<TranslationStatusRecord> {
        const current = await this.getTranslationStatus(contentId, language);
        
        if (!current) {
            throw new Error('Translation status not found');
        }

        return this.updateTranslationStatus({
            contentId,
            language,
            status: current.status,
            reviewerId
        });
    }

    /**
     * Submit translation for review
     */
    async submitForReview(
        contentId: string,
        language: Language,
        wordCount: number,
        translationNotes?: string
    ): Promise<TranslationStatusRecord> {
        return this.updateTranslationStatus({
            contentId,
            language,
            status: 'review',
            wordCount,
            translationNotes
        });
    }

    /**
     * Approve translation
     */
    async approveTranslation(
        contentId: string,
        language: Language,
        reviewerId: string,
        qualityScore: number,
        reviewComments?: string
    ): Promise<TranslationStatusRecord> {
        if (qualityScore < 0 || qualityScore > 5) {
            throw new Error('Quality score must be between 0 and 5');
        }

        return this.updateTranslationStatus({
            contentId,
            language,
            status: 'approved',
            reviewerId,
            qualityScore,
            reviewComments
        });
    }

    /**
     * Request translation changes
     */
    async requestChanges(
        contentId: string,
        language: Language,
        reviewerId: string,
        reviewComments: string
    ): Promise<TranslationStatusRecord> {
        return this.updateTranslationStatus({
            contentId,
            language,
            status: 'draft',
            reviewerId,
            reviewComments
        });
    }

    /**
     * Get translator workload
     */
    async getTranslatorWorkload(translatorId: string): Promise<{
        totalAssigned: number;
        inProgress: number;
        completed: number;
        byLanguage: Record<Language, number>;
    }> {
        const stats = await this.db.one(
            `
            SELECT 
                COUNT(*) AS total_assigned,
                SUM(CASE WHEN status IN ('draft', 'review') THEN 1 ELSE 0 END) AS in_progress,
                SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) AS completed
            FROM education_translation_status
            WHERE translator_id = $1
            `,
            [translatorId]
        );

        const byLanguage = await this.db.manyOrNone<{ language: Language; count: number }>(
            `
            SELECT 
                language,
                COUNT(*) AS count
            FROM education_translation_status
            WHERE translator_id = $1
            GROUP BY language
            `,
            [translatorId]
        );

        const byLanguageMap: Partial<Record<Language, number>> = {};
        byLanguage?.forEach(item => {
            byLanguageMap[item.language] = item.count;
        });

        return {
            totalAssigned: parseInt(stats.total_assigned),
            inProgress: parseInt(stats.in_progress),
            completed: parseInt(stats.completed),
            byLanguage: byLanguageMap as Record<Language, number>
        };
    }

    /**
     * Get average quality scores by translator
     */
    async getTranslatorQualityMetrics(translatorId: string): Promise<{
        averageScore: number;
        totalReviewed: number;
        scoresByLanguage: Record<Language, number>;
    }> {
        const stats = await this.db.oneOrNone(
            `
            SELECT 
                AVG(quality_score) AS average_score,
                COUNT(*) AS total_reviewed
            FROM education_translation_status
            WHERE translator_id = $1 AND quality_score IS NOT NULL
            `,
            [translatorId]
        );

        const byLanguage = await this.db.manyOrNone<{ language: Language; avgScore: number }>(
            `
            SELECT 
                language,
                AVG(quality_score) AS "avgScore"
            FROM education_translation_status
            WHERE translator_id = $1 AND quality_score IS NOT NULL
            GROUP BY language
            `,
            [translatorId]
        );

        const scoresByLanguageMap: Partial<Record<Language, number>> = {};
        byLanguage?.forEach(item => {
            scoresByLanguageMap[item.language] = parseFloat(item.avgScore.toString());
        });

        return {
            averageScore: stats ? parseFloat(stats.average_score) : 0,
            totalReviewed: stats ? parseInt(stats.total_reviewed) : 0,
            scoresByLanguage: scoresByLanguageMap as Record<Language, number>
        };
    }

    /**
     * Delete translation status records for content
     */
    async deleteTranslationStatus(contentId: string): Promise<void> {
        await this.db.none(
            `DELETE FROM education_translation_status WHERE content_id = $1`,
            [contentId]
        );
    }

    /**
     * Helper: Convert camelCase to snake_case
     */
    private camelToSnake(str: string): string {
        return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
    }
}

export default TranslationManagementService;
