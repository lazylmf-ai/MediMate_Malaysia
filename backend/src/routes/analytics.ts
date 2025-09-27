/**
 * Analytics Routes
 *
 * RESTful API routes for medication adherence analytics with Malaysian cultural intelligence.
 * Provides comprehensive progress tracking, cultural insights, and family coordination analytics.
 */

import { Router } from 'express';
import { ProgressTrackingController } from '../controllers/analytics/ProgressTrackingController';
import { auth } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { culturalValidation } from '../middleware/cultural';
import { rbac } from '../middleware/rbac/healthcareRBAC';
import { pdpaCompliance } from '../middleware/pdpa';
import { body, param, query } from 'express-validator';

const router = Router();
const progressController = new ProgressTrackingController();

// Apply authentication and PDPA compliance to all routes
router.use(auth);
router.use(pdpaCompliance);

/**
 * @swagger
 * /api/analytics/progress/{patientId}:
 *   get:
 *     summary: Get patient progress metrics with cultural insights
 *     description: Retrieve comprehensive adherence progress metrics with Malaysian cultural adjustments
 *     tags: [Analytics]
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: string
 *         description: Patient identifier
 *       - in: query
 *         name: period
 *         schema:
 *           type: string
 *           enum: [daily, weekly, monthly, quarterly, yearly]
 *           default: monthly
 *         description: Time period for metrics calculation
 *       - in: query
 *         name: medicationId
 *         schema:
 *           type: string
 *         description: Filter by specific medication
 *     responses:
 *       200:
 *         description: Progress metrics with cultural insights
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     progress:
 *                       $ref: '#/components/schemas/ProgressMetrics'
 *                     culturalInsights:
 *                       type: object
 *                     recommendations:
 *                       type: array
 *                       items:
 *                         type: string
 *       403:
 *         description: Unauthorized access to patient data
 *       404:
 *         description: Patient not found
 */
router.get(
  '/progress/:patientId',
  [
    param('patientId').isUUID().withMessage('Valid patient ID required'),
    query('period').optional().isIn(['daily', 'weekly', 'monthly', 'quarterly', 'yearly'])
      .withMessage('Invalid period. Must be daily, weekly, monthly, quarterly, or yearly'),
    query('medicationId').optional().isUUID().withMessage('Valid medication ID required'),
    validate
  ],
  rbac(['patient:read', 'family:read', 'provider:read']),
  culturalValidation,
  progressController.getProgressMetrics.bind(progressController)
);

/**
 * @swagger
 * /api/analytics/adherence/{patientId}:
 *   get:
 *     summary: Get detailed adherence analytics with cultural observations
 *     description: Generate comprehensive adherence analytics including cultural factors and patterns
 *     tags: [Analytics]
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: string
 *         description: Patient identifier
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Analysis start date (ISO 8601 format)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Analysis end date (ISO 8601 format)
 *       - in: query
 *         name: analysisType
 *         schema:
 *           type: string
 *           enum: [individual, family, medication, cultural, predictive]
 *           default: individual
 *         description: Type of analysis to perform
 *     responses:
 *       200:
 *         description: Comprehensive adherence analytics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     analytics:
 *                       $ref: '#/components/schemas/AdherenceAnalytics'
 *                     summary:
 *                       type: object
 */
router.get(
  '/adherence/:patientId',
  [
    param('patientId').isUUID().withMessage('Valid patient ID required'),
    query('startDate').optional().isISO8601().withMessage('Valid start date required (ISO 8601)'),
    query('endDate').optional().isISO8601().withMessage('Valid end date required (ISO 8601)'),
    query('analysisType').optional().isIn(['individual', 'family', 'medication', 'cultural', 'predictive'])
      .withMessage('Invalid analysis type'),
    validate
  ],
  rbac(['patient:read', 'family:read', 'provider:read']),
  culturalValidation,
  progressController.getAdherenceAnalytics.bind(progressController)
);

/**
 * @swagger
 * /api/analytics/prediction/{patientId}/{medicationId}:
 *   get:
 *     summary: Get adherence predictions with cultural factor analysis
 *     description: Generate predictive analytics for medication adherence including cultural factors
 *     tags: [Analytics]
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: string
 *         description: Patient identifier
 *       - in: path
 *         name: medicationId
 *         required: true
 *         schema:
 *           type: string
 *         description: Medication identifier
 *       - in: query
 *         name: forecastDays
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 30
 *           default: 7
 *         description: Number of days to forecast
 *     responses:
 *       200:
 *         description: Adherence prediction with cultural factors
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     prediction:
 *                       $ref: '#/components/schemas/AdherencePrediction'
 *                     interpretation:
 *                       type: object
 */
router.get(
  '/prediction/:patientId/:medicationId',
  [
    param('patientId').isUUID().withMessage('Valid patient ID required'),
    param('medicationId').isUUID().withMessage('Valid medication ID required'),
    query('forecastDays').optional().isInt({ min: 1, max: 30 })
      .withMessage('Forecast days must be between 1 and 30'),
    validate
  ],
  rbac(['patient:read', 'family:read', 'provider:read']),
  culturalValidation,
  progressController.getAdherencePrediction.bind(progressController)
);

/**
 * @swagger
 * /api/analytics/family/{familyId}:
 *   get:
 *     summary: Get family-wide adherence metrics with cultural coordination analysis
 *     description: Analyze family adherence patterns and coordination effectiveness
 *     tags: [Analytics, Family]
 *     parameters:
 *       - in: path
 *         name: familyId
 *         required: true
 *         schema:
 *           type: string
 *         description: Family identifier
 *     responses:
 *       200:
 *         description: Family adherence metrics and insights
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     familyMetrics:
 *                       $ref: '#/components/schemas/FamilyAdherenceMetrics'
 *                     insights:
 *                       type: object
 */
router.get(
  '/family/:familyId',
  [
    param('familyId').isUUID().withMessage('Valid family ID required'),
    validate
  ],
  rbac(['family:read', 'family:admin']),
  culturalValidation,
  progressController.getFamilyAdherenceMetrics.bind(progressController)
);

/**
 * @swagger
 * /api/analytics/statistics:
 *   get:
 *     summary: Get population-level adherence statistics
 *     description: Generate comprehensive adherence statistics for population analysis (Admin only)
 *     tags: [Analytics, Admin]
 *     parameters:
 *       - in: query
 *         name: patientIds
 *         schema:
 *           type: string
 *         description: Comma-separated list of patient IDs
 *       - in: query
 *         name: culturalGroup
 *         schema:
 *           type: string
 *         description: Filter by cultural group
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Analysis start date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: Analysis end date
 *     responses:
 *       200:
 *         description: Population adherence statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     statistics:
 *                       $ref: '#/components/schemas/AdherenceStatistics'
 *                     insights:
 *                       type: object
 *       403:
 *         description: Administrative access required
 */
router.get(
  '/statistics',
  [
    query('patientIds').optional().custom((value) => {
      if (value) {
        const ids = value.split(',');
        return ids.every((id: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id.trim()));
      }
      return true;
    }).withMessage('Invalid patient IDs format'),
    query('culturalGroup').optional().isAlpha().withMessage('Valid cultural group required'),
    query('startDate').optional().isISO8601().withMessage('Valid start date required'),
    query('endDate').optional().isISO8601().withMessage('Valid end date required'),
    validate
  ],
  rbac(['admin:read', 'provider:statistics']),
  progressController.getAdherenceStatistics.bind(progressController)
);

/**
 * @swagger
 * /api/analytics/adherence/{patientId}/record:
 *   post:
 *     summary: Record medication adherence with cultural context
 *     description: Record a medication adherence event with cultural and family context
 *     tags: [Analytics]
 *     parameters:
 *       - in: path
 *         name: patientId
 *         required: true
 *         schema:
 *           type: string
 *         description: Patient identifier
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - medicationId
 *               - scheduledTime
 *               - status
 *             properties:
 *               medicationId:
 *                 type: string
 *                 format: uuid
 *               scheduledTime:
 *                 type: string
 *                 format: date-time
 *               takenTime:
 *                 type: string
 *                 format: date-time
 *               status:
 *                 type: string
 *                 enum: [taken, missed, late, skipped, pending]
 *               notes:
 *                 type: string
 *               culturalContext:
 *                 type: object
 *                 properties:
 *                   prayerTimeConflict:
 *                     type: boolean
 *                   fastingPeriod:
 *                     type: boolean
 *                   festivalPeriod:
 *                     type: string
 *                   familySupport:
 *                     type: boolean
 *                   traditionalMedicineUsed:
 *                     type: boolean
 *                   reasonCode:
 *                     type: string
 *     responses:
 *       201:
 *         description: Adherence record created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     adherenceRecord:
 *                       $ref: '#/components/schemas/AdherenceRecord'
 *                     culturalAnalysis:
 *                       type: object
 */
router.post(
  '/adherence/:patientId/record',
  [
    param('patientId').isUUID().withMessage('Valid patient ID required'),
    body('medicationId').isUUID().withMessage('Valid medication ID required'),
    body('scheduledTime').isISO8601().withMessage('Valid scheduled time required'),
    body('takenTime').optional().isISO8601().withMessage('Valid taken time required'),
    body('status').isIn(['taken', 'missed', 'late', 'skipped', 'pending'])
      .withMessage('Invalid status'),
    body('notes').optional().isString().isLength({ max: 500 })
      .withMessage('Notes must be a string with maximum 500 characters'),
    body('culturalContext').optional().isObject()
      .withMessage('Cultural context must be an object'),
    body('culturalContext.prayerTimeConflict').optional().isBoolean(),
    body('culturalContext.fastingPeriod').optional().isBoolean(),
    body('culturalContext.festivalPeriod').optional().isString(),
    body('culturalContext.familySupport').optional().isBoolean(),
    body('culturalContext.traditionalMedicineUsed').optional().isBoolean(),
    body('culturalContext.reasonCode').optional().isString(),
    validate
  ],
  rbac(['patient:write', 'family:write']),
  culturalValidation,
  progressController.recordAdherence.bind(progressController)
);

/**
 * @swagger
 * /api/analytics/cultural/score:
 *   post:
 *     summary: Calculate cultural adherence score
 *     description: Calculate comprehensive cultural scoring for adherence records
 *     tags: [Analytics, Cultural]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - patientId
 *               - timeframe
 *             properties:
 *               patientId:
 *                 type: string
 *                 format: uuid
 *               timeframe:
 *                 type: object
 *                 properties:
 *                   start:
 *                     type: string
 *                     format: date-time
 *                   end:
 *                     type: string
 *                     format: date-time
 *               culturalContext:
 *                 type: object
 *     responses:
 *       200:
 *         description: Cultural adherence score
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     culturalScore:
 *                       type: object
 */
router.post(
  '/cultural/score',
  [
    body('patientId').isUUID().withMessage('Valid patient ID required'),
    body('timeframe.start').isISO8601().withMessage('Valid start time required'),
    body('timeframe.end').isISO8601().withMessage('Valid end time required'),
    body('culturalContext').optional().isObject(),
    validate
  ],
  rbac(['patient:read', 'provider:read']),
  culturalValidation,
  async (req, res) => {
    // This would integrate with CulturalScoringService
    res.status(501).json({
      success: false,
      message: 'Cultural scoring endpoint not yet implemented'
    });
  }
);

/**
 * @swagger
 * /api/analytics/family/{familyId}/patterns:
 *   get:
 *     summary: Analyze family adherence patterns
 *     description: Generate detailed analysis of family coordination and cultural patterns
 *     tags: [Analytics, Family]
 *     parameters:
 *       - in: path
 *         name: familyId
 *         required: true
 *         schema:
 *           type: string
 *         description: Family identifier
 *     responses:
 *       200:
 *         description: Family pattern analysis
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     patterns:
 *                       type: object
 */
router.get(
  '/family/:familyId/patterns',
  [
    param('familyId').isUUID().withMessage('Valid family ID required'),
    validate
  ],
  rbac(['family:read', 'family:admin']),
  culturalValidation,
  async (req, res) => {
    // This would integrate with FamilyPatternAnalysisService
    res.status(501).json({
      success: false,
      message: 'Family pattern analysis endpoint not yet implemented'
    });
  }
);

// Health check endpoint for analytics service
router.get('/health', (req, res) => {
  res.json({
    success: true,
    service: 'adherence-analytics',
    status: 'healthy',
    version: '1.0.0',
    features: {
      progressTracking: true,
      culturalIntelligence: true,
      familyAnalytics: true,
      predictiveAnalytics: true,
      malaysianLocalization: true
    },
    timestamp: new Date().toISOString()
  });
});

export default router;