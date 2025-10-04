/**
 * Education Routes
 * RESTful API routes for educational content management
 */

import { Router } from 'express';
import { ContentController } from '../controllers/education/ContentController';
import { ProgressController } from '../controllers/education/ProgressController';
import { SearchController } from '../controllers/education/SearchController';
import { RecommendationController } from '../controllers/education/RecommendationController';
import { QuizController } from '../controllers/education/QuizController';
import { authenticateToken } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { body, param, query } from 'express-validator';

const router = Router();

// Authentication required for all education routes
router.use(authenticateToken);

// ============================================================================
// CONTENT ROUTES
// ============================================================================

const createContentValidation = [
  body('type').isIn(['article', 'video', 'infographic', 'quiz']).withMessage('Invalid content type'),
  body('category').isLength({ min: 2, max: 50 }).withMessage('Category must be 2-50 characters'),
  body('title').isObject().withMessage('Title must be a multi-language object'),
  body('title.ms').notEmpty().withMessage('Malay title is required'),
  body('title.en').notEmpty().withMessage('English title is required'),
  body('title.zh').notEmpty().withMessage('Chinese title is required'),
  body('title.ta').notEmpty().withMessage('Tamil title is required'),
  body('description').isObject().withMessage('Description must be a multi-language object'),
  body('description.ms').notEmpty().withMessage('Malay description is required'),
  body('description.en').notEmpty().withMessage('English description is required'),
  body('description.zh').notEmpty().withMessage('Chinese description is required'),
  body('description.ta').notEmpty().withMessage('Tamil description is required'),
  body('content').isObject().withMessage('Content must be a multi-language object'),
  body('content.ms').notEmpty().withMessage('Malay content is required'),
  body('content.en').notEmpty().withMessage('English content is required'),
  body('content.zh').notEmpty().withMessage('Chinese content is required'),
  body('content.ta').notEmpty().withMessage('Tamil content is required'),
  body('tags').optional().isArray().withMessage('Tags must be an array'),
  body('difficulty').optional().isIn(['beginner', 'intermediate', 'advanced']).withMessage('Invalid difficulty level'),
  validateRequest,
];

const updateContentValidation = [
  param('id').isUUID().withMessage('Invalid content ID'),
  body('type').optional().isIn(['article', 'video', 'infographic', 'quiz']).withMessage('Invalid content type'),
  body('category').optional().isLength({ min: 2, max: 50 }).withMessage('Category must be 2-50 characters'),
  body('difficulty').optional().isIn(['beginner', 'intermediate', 'advanced']).withMessage('Invalid difficulty level'),
  validateRequest,
];

const contentIdValidation = [
  param('id').isUUID().withMessage('Invalid content ID'),
  validateRequest,
];

// Content CRUD
router.post('/content', createContentValidation, ContentController.createContent);
router.get('/content', ContentController.getContent);
router.get('/content/:id', contentIdValidation, ContentController.getContentById);
router.put('/content/:id', updateContentValidation, ContentController.updateContent);
router.delete('/content/:id', contentIdValidation, ContentController.deleteContent);

// Content publishing
router.post('/content/:id/publish', contentIdValidation, ContentController.publishContent);
router.post('/content/:id/unpublish', contentIdValidation, ContentController.unpublishContent);

// Media management
router.post('/content/media', ContentController.uploadMedia);
router.get('/content/media/:key', ContentController.getMediaUrl);

// Content helpers
router.get('/content/category/:category', ContentController.getContentByCategory);
router.get('/content/medication/:medicationId', ContentController.getContentByMedication);
router.get('/content/condition/:conditionCode', ContentController.getContentByCondition);

// ============================================================================
// PROGRESS ROUTES
// ============================================================================

const trackProgressValidation = [
  body('contentId').isUUID().withMessage('Invalid content ID'),
  body('timeSpent').optional().isInt({ min: 0 }).withMessage('Time spent must be a positive integer'),
  validateRequest,
];

router.post('/progress/view', trackProgressValidation, ProgressController.trackView);
router.post('/progress/complete', trackProgressValidation, ProgressController.trackCompletion);
router.get('/progress/:contentId', ProgressController.getUserProgress);
router.get('/progress', ProgressController.getUserProgressList);
router.get('/progress/stats', ProgressController.getUserStats);

// ============================================================================
// ACHIEVEMENT ROUTES
// ============================================================================

const awardAchievementValidation = [
  body('userId').isUUID().withMessage('Invalid user ID'),
  body('badgeId').isLength({ min: 2, max: 50 }).withMessage('Badge ID must be 2-50 characters'),
  validateRequest,
];

router.get('/achievements', ProgressController.getUserAchievements);
router.post('/achievements', awardAchievementValidation, ProgressController.awardAchievement);
router.post('/achievements/check-streaks', ProgressController.checkStreakAchievements);

// ============================================================================
// ANALYTICS ROUTES
// ============================================================================

const contentAnalyticsValidation = [
  param('contentId').isUUID().withMessage('Invalid content ID'),
  validateRequest,
];

router.get('/analytics/content/:contentId', contentAnalyticsValidation, ProgressController.getContentAnalytics);

// ============================================================================
// SEARCH ROUTES
// ============================================================================

const searchValidation = [
  query('q').notEmpty().withMessage('Search query (q) is required'),
  validateRequest,
];

const languageValidation = [
  param('language').isIn(['ms', 'en', 'zh', 'ta']).withMessage('Invalid language code'),
  query('q').notEmpty().withMessage('Search query (q) is required'),
  validateRequest,
];

router.get('/search', searchValidation, SearchController.searchContent);
router.get('/search/language/:language', languageValidation, SearchController.searchByLanguage);
router.get('/search/tags', SearchController.searchByTags);
router.get('/search/popular', SearchController.getPopularContent);
router.get('/search/trending', SearchController.getTrendingContent);

// ============================================================================
// RECOMMENDATION ROUTES
// ============================================================================

const generateRecommendationsValidation = [
  body('medications').optional().isArray().withMessage('Medications must be an array'),
  body('conditions').optional().isArray().withMessage('Conditions must be an array'),
  body('adherenceRate').optional().isInt({ min: 0, max: 100 }).withMessage('Adherence rate must be 0-100'),
  body('language').optional().isIn(['ms', 'en', 'zh', 'ta']).withMessage('Invalid language code'),
  validateRequest,
];

const adherenceInterventionValidation = [
  body('adherenceRate').isInt({ min: 0, max: 100 }).withMessage('Adherence rate is required (0-100)'),
  validateRequest,
];

router.post('/recommendations/generate', generateRecommendationsValidation, RecommendationController.generateRecommendations);
router.get('/recommendations', RecommendationController.getCachedRecommendations);
router.get('/recommendations/medication/:medicationId', RecommendationController.getContentForMedication);
router.get('/recommendations/condition/:conditionCode', RecommendationController.getContentForCondition);
router.post('/recommendations/adherence-intervention', adherenceInterventionValidation, RecommendationController.getAdherenceInterventionContent);
router.get('/recommendations/adherence-intervention/banner', RecommendationController.getAdherenceInterventionBanner);

// ============================================================================
// QUIZ ROUTES
// ============================================================================

const submitQuizValidation = [
  body('quizId').isUUID().withMessage('Invalid quiz ID'),
  body('answers').isObject().withMessage('Answers must be an object'),
  validateRequest,
];

const quizIdValidation = [
  param('quizId').isUUID().withMessage('Invalid quiz ID'),
  validateRequest,
];

const submissionIdValidation = [
  param('id').isUUID().withMessage('Invalid submission ID'),
  validateRequest,
];

router.post('/quiz/submit', submitQuizValidation, QuizController.submitQuiz);
router.get('/quiz/submission/:id', submissionIdValidation, QuizController.getSubmissionById);
router.get('/quiz/:quizId/submissions', quizIdValidation, QuizController.getUserQuizSubmissions);
router.get('/quiz/submissions', QuizController.getAllUserSubmissions);
router.get('/quiz/:quizId/best-score', quizIdValidation, QuizController.getBestScore);
router.get('/quiz/:quizId/passed', quizIdValidation, QuizController.hasUserPassedQuiz);
router.get('/quiz/stats', QuizController.getUserQuizStats);
router.get('/quiz/:quizId/analytics', quizIdValidation, QuizController.getQuizAnalytics);

export default router;
