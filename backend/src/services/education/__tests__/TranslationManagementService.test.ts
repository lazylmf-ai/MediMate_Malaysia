/**
 * Comprehensive tests for TranslationManagementService
 * Tests translation workflow, status tracking, and quality management
 */

import {
    TranslationManagementService,
    Language,
    TranslationStatus
} from '../TranslationManagementService';
import { DatabaseService } from '../../database/databaseService';

// Mock dependencies
jest.mock('../../database/databaseService');

describe('TranslationManagementService', () => {
    let service: TranslationManagementService;
    let mockDb: any;

    const mockContentId = 'content-123';
    const mockTranslatorId = 'translator-456';
    const mockReviewerId = 'reviewer-789';

    beforeEach(() => {
        jest.clearAllMocks();

        // Setup mock database
        mockDb = {
            one: jest.fn(),
            oneOrNone: jest.fn(),
            manyOrNone: jest.fn(),
            none: jest.fn(),
        };

        (DatabaseService.getInstance as jest.Mock) = jest.fn().mockReturnValue({
            getConnection: () => mockDb
        });

        service = new TranslationManagementService();
    });

    describe('initializeTranslationStatus', () => {
        it('should create status records for all 4 languages', async () => {
            const mockRecord = {
                id: 'status-1',
                contentId: mockContentId,
                language: 'en',
                status: 'draft',
                wordCount: 0,
                lastUpdated: new Date(),
                createdAt: new Date(),
                updatedAt: new Date()
            };

            mockDb.one.mockResolvedValue(mockRecord);

            const result = await service.initializeTranslationStatus(mockContentId, 'en');

            expect(result).toHaveLength(4);
            expect(mockDb.one).toHaveBeenCalledTimes(4);

            // Verify primary language is 'draft', others are 'missing'
            expect(mockDb.one).toHaveBeenCalledWith(
                expect.stringContaining('INSERT INTO education_translation_status'),
                expect.arrayContaining([mockContentId, 'en', 'draft'])
            );
        });

        it('should default to English as primary language', async () => {
            mockDb.one.mockResolvedValue({});

            await service.initializeTranslationStatus(mockContentId);

            const englishCall = mockDb.one.mock.calls.find(call =>
                call[1][1] === 'en'
            );

            expect(englishCall[1][2]).toBe('draft');
        });

        it('should handle conflicts with ON CONFLICT clause', async () => {
            mockDb.one.mockResolvedValue({});

            await service.initializeTranslationStatus(mockContentId);

            expect(mockDb.one).toHaveBeenCalledWith(
                expect.stringContaining('ON CONFLICT (content_id, language)'),
                expect.any(Array)
            );
        });
    });

    describe('getTranslationStatus', () => {
        it('should retrieve status for specific language', async () => {
            const mockStatus = {
                id: 'status-1',
                contentId: mockContentId,
                language: 'ms' as Language,
                status: 'draft' as TranslationStatus,
                translatorId: mockTranslatorId,
                wordCount: 500,
                lastUpdated: new Date()
            };

            mockDb.oneOrNone.mockResolvedValue(mockStatus);

            const result = await service.getTranslationStatus(mockContentId, 'ms');

            expect(result).toEqual(mockStatus);
            expect(mockDb.oneOrNone).toHaveBeenCalledWith(
                expect.stringContaining('WHERE content_id = $1 AND language = $2'),
                [mockContentId, 'ms']
            );
        });

        it('should return null if status not found', async () => {
            mockDb.oneOrNone.mockResolvedValue(null);

            const result = await service.getTranslationStatus(mockContentId, 'ta');

            expect(result).toBeNull();
        });
    });

    describe('getAllTranslationStatuses', () => {
        it('should retrieve statuses for all languages', async () => {
            const mockStatuses = [
                { language: 'ms', status: 'approved' },
                { language: 'en', status: 'approved' },
                { language: 'zh', status: 'draft' },
                { language: 'ta', status: 'missing' }
            ];

            mockDb.manyOrNone.mockResolvedValue(mockStatuses);

            const result = await service.getAllTranslationStatuses(mockContentId);

            expect(result.ms.status).toBe('approved');
            expect(result.en.status).toBe('approved');
            expect(result.zh.status).toBe('draft');
            expect(result.ta.status).toBe('missing');
        });
    });

    describe('updateTranslationStatus', () => {
        it('should update status from missing to draft', async () => {
            const currentStatus = {
                status: 'missing' as TranslationStatus
            };

            const updatedStatus = {
                id: 'status-1',
                contentId: mockContentId,
                language: 'ms' as Language,
                status: 'draft' as TranslationStatus,
                translatorId: mockTranslatorId,
                startedAt: new Date()
            };

            mockDb.oneOrNone.mockResolvedValue(currentStatus);
            mockDb.one.mockResolvedValue(updatedStatus);

            const result = await service.updateTranslationStatus({
                contentId: mockContentId,
                language: 'ms',
                status: 'draft',
                translatorId: mockTranslatorId
            });

            expect(result.status).toBe('draft');
            expect(mockDb.one).toHaveBeenCalledWith(
                expect.stringContaining('UPDATE education_translation_status'),
                expect.any(Array)
            );
        });

        it('should set draftCompletedAt when transitioning to review', async () => {
            const currentStatus = {
                status: 'draft' as TranslationStatus
            };

            mockDb.oneOrNone.mockResolvedValue(currentStatus);
            mockDb.one.mockResolvedValue({
                status: 'review',
                draftCompletedAt: new Date(),
                submittedForReviewAt: new Date()
            });

            await service.updateTranslationStatus({
                contentId: mockContentId,
                language: 'en',
                status: 'review',
                wordCount: 1000
            });

            const updateQuery = mockDb.one.mock.calls[0][0];
            expect(updateQuery).toContain('draft_completed_at = NOW()');
            expect(updateQuery).toContain('submitted_for_review_at = NOW()');
        });

        it('should set approvedAt when transitioning to approved', async () => {
            const currentStatus = {
                status: 'review' as TranslationStatus
            };

            mockDb.oneOrNone.mockResolvedValue(currentStatus);
            mockDb.one.mockResolvedValue({
                status: 'approved',
                approvedAt: new Date()
            });

            await service.updateTranslationStatus({
                contentId: mockContentId,
                language: 'zh',
                status: 'approved',
                reviewerId: mockReviewerId,
                qualityScore: 4.5
            });

            const updateQuery = mockDb.one.mock.calls[0][0];
            expect(updateQuery).toContain('approved_at = NOW()');
        });

        it('should throw error if status not found', async () => {
            mockDb.oneOrNone.mockResolvedValue(null);

            await expect(
                service.updateTranslationStatus({
                    contentId: mockContentId,
                    language: 'ms',
                    status: 'draft'
                })
            ).rejects.toThrow('Translation status not found');
        });
    });

    describe('getTranslationProgress', () => {
        it('should return progress ordered by language priority', async () => {
            const mockProgress = [
                { language: 'en', status: 'approved', wordCount: 1000 },
                { language: 'ms', status: 'approved', wordCount: 950 },
                { language: 'zh', status: 'review', wordCount: 980 },
                { language: 'ta', status: 'missing', wordCount: 0 }
            ];

            mockDb.manyOrNone.mockResolvedValue(mockProgress);

            const result = await service.getTranslationProgress(mockContentId);

            expect(result[0].language).toBe('en'); // English first
            expect(result).toHaveLength(4);
        });
    });

    describe('getOverallProgress', () => {
        it('should calculate completion percentages', async () => {
            const mockOverallProgress = [
                {
                    contentId: 'content-1',
                    title: 'Health Article 1',
                    status: 'published',
                    totalLanguages: 4,
                    approvedCount: 4,
                    reviewCount: 0,
                    draftCount: 0,
                    missingCount: 0,
                    completionPercentage: 100
                },
                {
                    contentId: 'content-2',
                    title: 'Health Article 2',
                    status: 'in_review',
                    totalLanguages: 4,
                    approvedCount: 2,
                    reviewCount: 1,
                    draftCount: 1,
                    missingCount: 0,
                    completionPercentage: 50
                }
            ];

            mockDb.manyOrNone.mockResolvedValue(mockOverallProgress);

            const result = await service.getOverallProgress();

            expect(result).toHaveLength(2);
            expect(result[0].completionPercentage).toBe(100);
            expect(result[1].completionPercentage).toBe(50);
        });
    });

    describe('assignTranslator', () => {
        it('should assign translator and set status to draft', async () => {
            mockDb.oneOrNone.mockResolvedValue({ status: 'missing' });
            mockDb.one.mockResolvedValue({
                status: 'draft',
                translatorId: mockTranslatorId
            });

            const result = await service.assignTranslator(
                mockContentId,
                'ms',
                mockTranslatorId
            );

            expect(result.status).toBe('draft');
            expect(result.translatorId).toBe(mockTranslatorId);
        });
    });

    describe('submitForReview', () => {
        it('should update status to review and set word count', async () => {
            mockDb.oneOrNone.mockResolvedValue({ status: 'draft' });
            mockDb.one.mockResolvedValue({
                status: 'review',
                wordCount: 1200,
                submittedForReviewAt: new Date()
            });

            const result = await service.submitForReview(
                mockContentId,
                'en',
                1200,
                'Ready for review'
            );

            expect(result.status).toBe('review');
            expect(result.wordCount).toBe(1200);
        });
    });

    describe('approveTranslation', () => {
        it('should approve translation with quality score', async () => {
            mockDb.oneOrNone.mockResolvedValue({ status: 'review' });
            mockDb.one.mockResolvedValue({
                status: 'approved',
                reviewerId: mockReviewerId,
                qualityScore: 4.5,
                approvedAt: new Date()
            });

            const result = await service.approveTranslation(
                mockContentId,
                'zh',
                mockReviewerId,
                4.5,
                'Excellent translation'
            );

            expect(result.status).toBe('approved');
            expect(result.qualityScore).toBe(4.5);
        });

        it('should validate quality score range', async () => {
            await expect(
                service.approveTranslation(
                    mockContentId,
                    'ta',
                    mockReviewerId,
                    6.0 // Invalid: > 5
                )
            ).rejects.toThrow('Quality score must be between 0 and 5');
        });

        it('should reject negative quality scores', async () => {
            await expect(
                service.approveTranslation(
                    mockContentId,
                    'ms',
                    mockReviewerId,
                    -1.0
                )
            ).rejects.toThrow('Quality score must be between 0 and 5');
        });
    });

    describe('requestChanges', () => {
        it('should revert status to draft with reviewer comments', async () => {
            mockDb.oneOrNone.mockResolvedValue({ status: 'review' });
            mockDb.one.mockResolvedValue({
                status: 'draft',
                reviewerId: mockReviewerId,
                reviewComments: 'Please fix medical terminology'
            });

            const result = await service.requestChanges(
                mockContentId,
                'en',
                mockReviewerId,
                'Please fix medical terminology'
            );

            expect(result.status).toBe('draft');
            expect(result.reviewComments).toBe('Please fix medical terminology');
        });
    });

    describe('getTranslatorWorkload', () => {
        it('should calculate translator workload statistics', async () => {
            mockDb.one.mockResolvedValue({
                total_assigned: '10',
                in_progress: '5',
                completed: '5'
            });

            mockDb.manyOrNone.mockResolvedValue([
                { language: 'ms', count: 4 },
                { language: 'en', count: 3 },
                { language: 'zh', count: 2 },
                { language: 'ta', count: 1 }
            ]);

            const result = await service.getTranslatorWorkload(mockTranslatorId);

            expect(result.totalAssigned).toBe(10);
            expect(result.inProgress).toBe(5);
            expect(result.completed).toBe(5);
            expect(result.byLanguage.ms).toBe(4);
        });
    });

    describe('getTranslatorQualityMetrics', () => {
        it('should calculate average quality scores', async () => {
            mockDb.oneOrNone.mockResolvedValue({
                average_score: '4.3',
                total_reviewed: '20'
            });

            mockDb.manyOrNone.mockResolvedValue([
                { language: 'ms', avgScore: 4.5 },
                { language: 'en', avgScore: 4.2 },
                { language: 'zh', avgScore: 4.3 },
                { language: 'ta', avgScore: 4.0 }
            ]);

            const result = await service.getTranslatorQualityMetrics(mockTranslatorId);

            expect(result.averageScore).toBe(4.3);
            expect(result.totalReviewed).toBe(20);
            expect(result.scoresByLanguage.ms).toBe(4.5);
        });

        it('should handle translator with no reviews', async () => {
            mockDb.oneOrNone.mockResolvedValue(null);
            mockDb.manyOrNone.mockResolvedValue([]);

            const result = await service.getTranslatorQualityMetrics('new-translator');

            expect(result.averageScore).toBe(0);
            expect(result.totalReviewed).toBe(0);
        });
    });

    describe('getContentByTranslationStatus', () => {
        it('should filter content by language and status', async () => {
            const mockContent = [
                {
                    contentId: 'content-1',
                    title: 'Article 1',
                    lastUpdated: new Date()
                },
                {
                    contentId: 'content-2',
                    title: 'Article 2',
                    lastUpdated: new Date()
                }
            ];

            mockDb.manyOrNone.mockResolvedValue(mockContent);

            const result = await service.getContentByTranslationStatus('ms', 'draft');

            expect(result).toHaveLength(2);
            expect(mockDb.manyOrNone).toHaveBeenCalledWith(
                expect.stringContaining('WHERE ets.language = $1 AND ets.status = $2'),
                ['ms', 'draft']
            );
        });
    });

    describe('Workflow Integration', () => {
        it('should support full translation workflow', async () => {
            // 1. Initialize
            mockDb.one.mockResolvedValue({
                status: 'missing',
                language: 'ms'
            });

            await service.initializeTranslationStatus(mockContentId);

            // 2. Assign translator
            mockDb.oneOrNone.mockResolvedValue({ status: 'missing' });
            mockDb.one.mockResolvedValue({
                status: 'draft',
                translatorId: mockTranslatorId
            });

            await service.assignTranslator(mockContentId, 'ms', mockTranslatorId);

            // 3. Submit for review
            mockDb.oneOrNone.mockResolvedValue({ status: 'draft' });
            mockDb.one.mockResolvedValue({
                status: 'review',
                wordCount: 1000
            });

            await service.submitForReview(mockContentId, 'ms', 1000);

            // 4. Approve
            mockDb.oneOrNone.mockResolvedValue({ status: 'review' });
            mockDb.one.mockResolvedValue({
                status: 'approved',
                qualityScore: 4.5
            });

            const final = await service.approveTranslation(
                mockContentId,
                'ms',
                mockReviewerId,
                4.5
            );

            expect(final.status).toBe('approved');
        });
    });
});
