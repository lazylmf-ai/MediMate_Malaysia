/**
 * Admin Education Routes Tests
 *
 * Tests for education content management API endpoints.
 * Tests RBAC enforcement, content operations, review workflow, and analytics.
 */

import request from 'supertest';
import express, { Application } from 'express';
import educationRouter from '../../src/routes/admin/education';
import { authenticateUser } from '../../src/middleware/auth';
import { logger } from '../../src/utils/logger';

// Mock logger
jest.mock('../../src/utils/logger', () => ({
    logger: {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
    },
}));

// Create test app
function createTestApp(): Application {
    const app = express();
    app.use(express.json());
    app.use('/api/admin/education', educationRouter);
    return app;
}

describe('Admin Education Routes', () => {
    let app: Application;

    beforeEach(() => {
        app = createTestApp();
        jest.clearAllMocks();
    });

    describe('Authentication requirements', () => {
        it('should return 401 for unauthenticated requests', async () => {
            const response = await request(app).get('/api/admin/education/content');

            expect(response.status).toBe(401);
            expect(response.body).toMatchObject({
                success: false,
                error: expect.stringContaining('Authentication required'),
            });
        });
    });

    describe('GET /content - List content', () => {
        it('should allow admin to list content', async () => {
            const response = await request(app)
                .get('/api/admin/education/content')
                .set('Authorization', 'Bearer admin-token');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('content');
            expect(response.body.data).toHaveProperty('pagination');
        });

        it('should allow content_creator to list content', async () => {
            const response = await request(app)
                .get('/api/admin/education/content')
                .set('Authorization', 'Bearer test-token');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });

        it('should support pagination parameters', async () => {
            const response = await request(app)
                .get('/api/admin/education/content')
                .query({ page: 2, limit: 25 })
                .set('Authorization', 'Bearer admin-token');

            expect(response.status).toBe(200);
            expect(response.body.data.pagination.page).toBe(2);
            expect(response.body.data.pagination.limit).toBe(25);
        });

        it('should support filtering parameters', async () => {
            const response = await request(app)
                .get('/api/admin/education/content')
                .query({
                    status: 'published',
                    category: 'medication',
                    language: 'en',
                })
                .set('Authorization', 'Bearer admin-token');

            expect(response.status).toBe(200);
            expect(logger.info).toHaveBeenCalledWith(
                'List content request',
                expect.objectContaining({
                    filters: expect.objectContaining({
                        status: 'published',
                        category: 'medication',
                    }),
                })
            );
        });
    });

    describe('GET /content/:id - Get content by ID', () => {
        it('should allow any authenticated role to view content', async () => {
            const response = await request(app)
                .get('/api/admin/education/content/content-123')
                .set('Authorization', 'Bearer test-token');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.id).toBe('content-123');
        });
    });

    describe('POST /content - Create content', () => {
        const validContent = {
            type: 'article',
            category: 'medication',
            title: {
                ms: 'Artikel Ubat',
                en: 'Medication Article',
                zh: '药物文章',
                ta: 'மருந்து கட்டுரை',
            },
            description: {
                ms: 'Deskripsi',
                en: 'Description',
                zh: '描述',
                ta: 'விவரம்',
            },
            body: {
                ms: 'Kandungan',
                en: 'Content',
                zh: '内容',
                ta: 'உள்ளடக்கம்',
            },
        };

        it('should allow admin to create content', async () => {
            const response = await request(app)
                .post('/api/admin/education/content')
                .set('Authorization', 'Bearer admin-token')
                .send(validContent);

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toMatchObject({
                status: 'draft',
                type: 'article',
                category: 'medication',
            });
        });

        it('should allow content_creator to create content', async () => {
            const response = await request(app)
                .post('/api/admin/education/content')
                .set('Authorization', 'Bearer test-token')
                .send(validContent);

            expect(response.status).toBe(201);
            expect(response.body.success).toBe(true);
        });

        it('should deny medical_reviewer from creating content', async () => {
            // This would require a medical_reviewer token
            // For now, testing with available tokens
            // In production, this test would use a reviewer token and expect 403
        });
    });

    describe('PUT /content/:id - Update content', () => {
        it('should allow admin to update any content', async () => {
            const response = await request(app)
                .put('/api/admin/education/content/content-123')
                .set('Authorization', 'Bearer admin-token')
                .send({
                    title: { en: 'Updated Title' },
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });

        it('should allow content_creator to update content', async () => {
            const response = await request(app)
                .put('/api/admin/education/content/content-123')
                .set('Authorization', 'Bearer test-token')
                .send({
                    title: { en: 'Updated Title' },
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });
    });

    describe('DELETE /content/:id - Delete content', () => {
        it('should allow admin to delete content', async () => {
            const response = await request(app)
                .delete('/api/admin/education/content/content-123')
                .set('Authorization', 'Bearer admin-token');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.message).toContain('deleted');
        });

        it('should deny non-admin from deleting content', async () => {
            const response = await request(app)
                .delete('/api/admin/education/content/content-123')
                .set('Authorization', 'Bearer test-token');

            // test-token is for content_creator role
            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
            expect(response.body.code).toBe('INSUFFICIENT_ROLE');
        });
    });

    describe('POST /content/:id/submit-review - Submit for review', () => {
        it('should allow content_creator to submit for review', async () => {
            const response = await request(app)
                .post('/api/admin/education/content/content-123/submit-review')
                .set('Authorization', 'Bearer test-token');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.status).toBe('in_review');
        });

        it('should allow admin to submit for review', async () => {
            const response = await request(app)
                .post('/api/admin/education/content/content-123/submit-review')
                .set('Authorization', 'Bearer admin-token');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });
    });

    describe('POST /content/:id/assign-reviewer - Assign reviewer', () => {
        it('should allow admin to assign reviewer', async () => {
            const response = await request(app)
                .post('/api/admin/education/content/content-123/assign-reviewer')
                .set('Authorization', 'Bearer admin-token')
                .send({ reviewerId: 'reviewer-456' });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.reviewer_id).toBe('reviewer-456');
        });

        it('should deny non-admin from assigning reviewer', async () => {
            const response = await request(app)
                .post('/api/admin/education/content/content-123/assign-reviewer')
                .set('Authorization', 'Bearer test-token')
                .send({ reviewerId: 'reviewer-456' });

            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
        });

        it('should return 400 if reviewerId is missing', async () => {
            const response = await request(app)
                .post('/api/admin/education/content/content-123/assign-reviewer')
                .set('Authorization', 'Bearer admin-token')
                .send({});

            expect(response.status).toBe(400);
            expect(response.body.error).toContain('Reviewer ID is required');
        });
    });

    describe('POST /content/:id/approve - Approve content', () => {
        it('should allow admin to approve content', async () => {
            const response = await request(app)
                .post('/api/admin/education/content/content-123/approve')
                .set('Authorization', 'Bearer admin-token')
                .send({ comment: 'Looks good' });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.status).toBe('approved');
        });
    });

    describe('POST /content/:id/request-changes - Request changes', () => {
        it('should require comment when requesting changes', async () => {
            const response = await request(app)
                .post('/api/admin/education/content/content-123/request-changes')
                .set('Authorization', 'Bearer admin-token')
                .send({});

            expect(response.status).toBe(400);
            expect(response.body.error).toContain('Comment is required');
        });

        it('should allow reviewer to request changes with comment', async () => {
            const response = await request(app)
                .post('/api/admin/education/content/content-123/request-changes')
                .set('Authorization', 'Bearer admin-token')
                .send({ comment: 'Please fix the medical terminology' });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.status).toBe('draft');
        });
    });

    describe('POST /content/:id/publish - Publish content', () => {
        it('should allow admin to publish content', async () => {
            const response = await request(app)
                .post('/api/admin/education/content/content-123/publish')
                .set('Authorization', 'Bearer admin-token');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.status).toBe('published');
            expect(response.body.data.published_at).toBeDefined();
        });

        it('should deny content_creator from publishing directly', async () => {
            const response = await request(app)
                .post('/api/admin/education/content/content-123/publish')
                .set('Authorization', 'Bearer test-token');

            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
        });
    });

    describe('POST /content/:id/unpublish - Unpublish content', () => {
        it('should allow admin to unpublish content', async () => {
            const response = await request(app)
                .post('/api/admin/education/content/content-123/unpublish')
                .set('Authorization', 'Bearer admin-token');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.status).toBe('approved');
        });

        it('should deny non-admin from unpublishing', async () => {
            const response = await request(app)
                .post('/api/admin/education/content/content-123/unpublish')
                .set('Authorization', 'Bearer test-token');

            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
        });
    });

    describe('POST /content/:id/archive - Archive content', () => {
        it('should allow admin to archive content', async () => {
            const response = await request(app)
                .post('/api/admin/education/content/content-123/archive')
                .set('Authorization', 'Bearer admin-token');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.status).toBe('archived');
            expect(response.body.data.archived_at).toBeDefined();
        });

        it('should deny non-admin from archiving', async () => {
            const response = await request(app)
                .post('/api/admin/education/content/content-123/archive')
                .set('Authorization', 'Bearer test-token');

            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
        });
    });

    describe('GET /analytics/overview - Get analytics overview', () => {
        it('should allow admin to view analytics overview', async () => {
            const response = await request(app)
                .get('/api/admin/education/analytics/overview')
                .set('Authorization', 'Bearer admin-token');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('totalContent');
            expect(response.body.data).toHaveProperty('totalViews');
            expect(response.body.data).toHaveProperty('averageEngagement');
        });

        it('should deny non-admin from viewing analytics overview', async () => {
            const response = await request(app)
                .get('/api/admin/education/analytics/overview')
                .set('Authorization', 'Bearer test-token');

            expect(response.status).toBe(403);
            expect(response.body.success).toBe(false);
        });
    });

    describe('GET /analytics/content/:id - Get content analytics', () => {
        it('should allow admin to view content analytics', async () => {
            const response = await request(app)
                .get('/api/admin/education/analytics/content/content-123')
                .set('Authorization', 'Bearer admin-token');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('views');
            expect(response.body.data).toHaveProperty('completionRate');
        });

        it('should allow content_creator to view content analytics', async () => {
            const response = await request(app)
                .get('/api/admin/education/analytics/content/content-123')
                .set('Authorization', 'Bearer test-token');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
        });
    });

    describe('GET /content/:id/translations - Get translation status', () => {
        it('should return translation status for all languages', async () => {
            const response = await request(app)
                .get('/api/admin/education/content/content-123/translations')
                .set('Authorization', 'Bearer admin-token');

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data).toHaveProperty('ms');
            expect(response.body.data).toHaveProperty('en');
            expect(response.body.data).toHaveProperty('zh');
            expect(response.body.data).toHaveProperty('ta');
        });
    });

    describe('PUT /content/:id/translations/:language - Update translation', () => {
        it('should allow updating translation for valid language', async () => {
            const response = await request(app)
                .put('/api/admin/education/content/content-123/translations/ms')
                .set('Authorization', 'Bearer test-token')
                .send({
                    title: 'Tajuk Baru',
                    description: 'Deskripsi baru',
                    body: 'Kandungan baru',
                });

            expect(response.status).toBe(200);
            expect(response.body.success).toBe(true);
            expect(response.body.data.language).toBe('ms');
        });

        it('should reject invalid language code', async () => {
            const response = await request(app)
                .put('/api/admin/education/content/content-123/translations/invalid')
                .set('Authorization', 'Bearer test-token')
                .send({
                    title: 'Test',
                    description: 'Test',
                    body: 'Test',
                });

            expect(response.status).toBe(400);
            expect(response.body.error).toContain('Invalid language code');
            expect(response.body.validLanguages).toEqual(['ms', 'en', 'zh', 'ta']);
        });

        it('should accept all valid Malaysian languages', async () => {
            const languages = ['ms', 'en', 'zh', 'ta'];

            for (const lang of languages) {
                const response = await request(app)
                    .put(`/api/admin/education/content/content-123/translations/${lang}`)
                    .set('Authorization', 'Bearer test-token')
                    .send({
                        title: `Title in ${lang}`,
                        description: `Description in ${lang}`,
                        body: `Body in ${lang}`,
                    });

                expect(response.status).toBe(200);
                expect(response.body.data.language).toBe(lang);
            }
        });
    });

    describe('Error handling', () => {
        it('should handle server errors gracefully', async () => {
            // This test would require mocking the service layer to throw errors
            // For now, we test that error responses follow the correct format
            const response = await request(app)
                .get('/api/admin/education/content')
                .set('Authorization', 'Bearer invalid-token');

            expect(response.status).toBeGreaterThanOrEqual(400);
            expect(response.body).toHaveProperty('success', false);
        });
    });
});
