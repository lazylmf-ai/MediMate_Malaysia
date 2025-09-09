/**
 * Cultural Intelligence API Routes
 * Comprehensive Malaysian cultural services API endpoints
 */

import { Router, Request, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { CulturalPreferenceService } from '../../services/cultural/culturalPreferenceService';
import { PrayerTimeService } from '../../services/cultural/prayerTimeService';
import { LanguageService } from '../../services/cultural/languageService';
import { HalalValidationService } from '../../services/cultural/halalValidationService';
import { CulturalCalendarService } from '../../services/cultural/culturalCalendarService';
import { DietaryService } from '../../services/cultural/dietaryService';

const router = Router();

// Initialize services
const culturalPreferenceService = new CulturalPreferenceService();
const prayerTimeService = new PrayerTimeService();
const languageService = new LanguageService();
const halalValidationService = new HalalValidationService();
const culturalCalendarService = new CulturalCalendarService();
const dietaryService = new DietaryService();

// Initialize all services on startup
const initializeServices = async () => {
  try {
    await culturalPreferenceService.initialize();
    console.log('✅ Cultural services initialized for API routes');
  } catch (error) {
    console.error('❌ Failed to initialize cultural services:', error);
  }
};

// Call initialization
initializeServices();

// Validation middleware
const handleValidationErrors = (req: Request, res: Response, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request parameters',
        details: errors.array()
      }
    });
  }
  next();
};

// ============================================================================
// PRAYER TIME ENDPOINTS
// ============================================================================

/**
 * GET /api/cultural/prayer-times/:stateCode
 * Get prayer times for a Malaysian state
 */
router.get('/prayer-times/:stateCode',
  [
    param('stateCode').isLength({ min: 3, max: 3 }).withMessage('State code must be 3 characters'),
    query('date').optional().isISO8601().withMessage('Date must be in ISO format')
  ],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { stateCode } = req.params;
      const date = req.query.date ? new Date(req.query.date as string) : undefined;

      const prayerTimes = await prayerTimeService.getPrayerTimes(stateCode, date);

      res.json({
        success: true,
        data: prayerTimes,
        meta: {
          cultural_context: 'Malaysian Islamic prayer times',
          malaysian_state: stateCode
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: 'PRAYER_TIME_ERROR',
          message: error.message,
          cultural_message: {
            en: 'Unable to retrieve prayer times',
            ms: 'Tidak dapat mendapatkan waktu solat',
            zh: '无法获取祈祷时间',
            ta: 'தொழுகை நேரங்களைப் பெற முடியவில்லை'
          }
        }
      });
    }
  }
);

/**
 * GET /api/cultural/prayer-times/:stateCode/current
 * Get current prayer status
 */
router.get('/prayer-times/:stateCode/current',
  [
    param('stateCode').isLength({ min: 3, max: 3 }).withMessage('State code must be 3 characters')
  ],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { stateCode } = req.params;
      const currentStatus = await prayerTimeService.getCurrentPrayerStatus(stateCode);

      res.json({
        success: true,
        data: currentStatus
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: 'PRAYER_STATUS_ERROR',
          message: error.message
        }
      });
    }
  }
);

/**
 * GET /api/cultural/prayer-times/:stateCode/ramadan
 * Get Ramadan adjustments for healthcare scheduling
 */
router.get('/prayer-times/:stateCode/ramadan',
  [
    param('stateCode').isLength({ min: 3, max: 3 }).withMessage('State code must be 3 characters'),
    query('date').optional().isISO8601().withMessage('Date must be in ISO format')
  ],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { stateCode } = req.params;
      const date = req.query.date ? new Date(req.query.date as string) : undefined;

      const ramadanAdjustments = await prayerTimeService.getRamadanAdjustments(stateCode, date);

      res.json({
        success: true,
        data: ramadanAdjustments
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: 'RAMADAN_ADJUSTMENT_ERROR',
          message: error.message
        }
      });
    }
  }
);

// ============================================================================
// LANGUAGE AND TRANSLATION ENDPOINTS
// ============================================================================

/**
 * POST /api/cultural/translate
 * Translate healthcare text with cultural context
 */
router.post('/translate',
  [
    body('text').notEmpty().withMessage('Text to translate is required'),
    body('target_language').isLength({ min: 2, max: 3 }).withMessage('Valid target language required'),
    body('source_language').optional().isLength({ min: 2, max: 3 }).withMessage('Invalid source language'),
    body('context.domain').optional().isIn(['general', 'medical', 'emergency', 'appointment', 'prescription', 'diagnosis']),
    body('context.urgency').optional().isIn(['low', 'medium', 'high', 'critical'])
  ],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { text, target_language, source_language = 'en', context } = req.body;

      const translation = await languageService.translate(text, target_language, source_language, context);

      res.json({
        success: true,
        data: translation
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: 'TRANSLATION_ERROR',
          message: error.message
        }
      });
    }
  }
);

/**
 * GET /api/cultural/languages/supported
 * Get supported languages for healthcare
 */
router.get('/languages/supported', async (req: Request, res: Response) => {
  try {
    const supportedLanguages = languageService.getSupportedLanguages();

    res.json({
      success: true,
      data: supportedLanguages
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'LANGUAGE_LIST_ERROR',
        message: error.message
      }
    });
  }
});

/**
 * GET /api/cultural/languages/:language/medical-terms
 * Get medical terminology in specific language
 */
router.get('/languages/:language/medical-terms',
  [
    param('language').isLength({ min: 2, max: 3 }).withMessage('Invalid language code'),
    query('search').optional().isLength({ min: 1 }).withMessage('Search query too short')
  ],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { language } = req.params;
      const { search } = req.query;

      const terms = search 
        ? languageService.searchMedicalTerms(search as string, language)
        : [];

      res.json({
        success: true,
        data: terms
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: 'MEDICAL_TERMS_ERROR',
          message: error.message
        }
      });
    }
  }
);

/**
 * GET /api/cultural/languages/:language/emergency-phrases
 * Get emergency phrases in specific language
 */
router.get('/languages/:language/emergency-phrases',
  [
    param('language').isLength({ min: 2, max: 3 }).withMessage('Invalid language code')
  ],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { language } = req.params;
      const emergencyPhrases = languageService.getEmergencyPhrases([language]);

      res.json({
        success: true,
        data: emergencyPhrases
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: 'EMERGENCY_PHRASES_ERROR',
          message: error.message
        }
      });
    }
  }
);

// ============================================================================
// HALAL VALIDATION ENDPOINTS
// ============================================================================

/**
 * POST /api/cultural/halal/validate-medication
 * Validate if medication is halal
 */
router.post('/halal/validate-medication',
  [
    body('medication_name').notEmpty().withMessage('Medication name is required'),
    body('manufacturer').optional().isString(),
    body('active_ingredients').optional().isArray()
  ],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { medication_name, manufacturer, active_ingredients } = req.body;

      const validation = await halalValidationService.validateMedication(
        medication_name,
        manufacturer,
        active_ingredients
      );

      res.json({
        success: true,
        data: validation
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: 'HALAL_VALIDATION_ERROR',
          message: error.message
        }
      });
    }
  }
);

/**
 * POST /api/cultural/halal/validate-ingredient
 * Validate individual ingredient
 */
router.post('/halal/validate-ingredient',
  [
    body('ingredient_name').notEmpty().withMessage('Ingredient name is required')
  ],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { ingredient_name } = req.body;

      const validation = await halalValidationService.validateIngredient(ingredient_name);

      res.json({
        success: true,
        data: validation
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INGREDIENT_VALIDATION_ERROR',
          message: error.message
        }
      });
    }
  }
);

/**
 * POST /api/cultural/halal/validate-treatment
 * Validate medical treatment
 */
router.post('/halal/validate-treatment',
  [
    body('treatment_name').notEmpty().withMessage('Treatment name is required'),
    body('treatment_type').isIn(['medication', 'procedure', 'therapy', 'vaccine']).withMessage('Invalid treatment type')
  ],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { treatment_name, treatment_type } = req.body;

      const validation = await halalValidationService.validateTreatment(treatment_name, treatment_type);

      res.json({
        success: true,
        data: validation
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: 'TREATMENT_VALIDATION_ERROR',
          message: error.message
        }
      });
    }
  }
);

/**
 * GET /api/cultural/halal/alternatives/:medication
 * Get halal alternatives for medication
 */
router.get('/halal/alternatives/:medication',
  [
    param('medication').notEmpty().withMessage('Medication name is required')
  ],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { medication } = req.params;

      const alternatives = await halalValidationService.getHalalAlternatives(medication);

      res.json({
        success: true,
        data: alternatives
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: 'ALTERNATIVES_ERROR',
          message: error.message
        }
      });
    }
  }
);

/**
 * POST /api/cultural/halal/ramadan-schedule
 * Validate medication schedule for Ramadan
 */
router.post('/halal/ramadan-schedule',
  [
    body('medications').isArray().withMessage('Medications must be an array'),
    body('dose_times').isArray().withMessage('Dose times must be an array')
  ],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { medications, dose_times } = req.body;

      const validation = await halalValidationService.validateRamadanSchedule(medications, dose_times);

      res.json({
        success: true,
        data: validation
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: 'RAMADAN_SCHEDULE_ERROR',
          message: error.message
        }
      });
    }
  }
);

// ============================================================================
// CULTURAL CALENDAR ENDPOINTS
// ============================================================================

/**
 * GET /api/cultural/calendar/events
 * Get cultural events for date range
 */
router.get('/calendar/events',
  [
    query('start_date').isISO8601().withMessage('Valid start date required'),
    query('end_date').isISO8601().withMessage('Valid end date required'),
    query('event_types').optional().isString(),
    query('regions').optional().isString()
  ],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const startDate = new Date(req.query.start_date as string);
      const endDate = new Date(req.query.end_date as string);
      const eventTypes = req.query.event_types ? (req.query.event_types as string).split(',') : undefined;
      const regions = req.query.regions ? (req.query.regions as string).split(',') : undefined;

      const events = await culturalCalendarService.getCulturalEvents(startDate, endDate, eventTypes as any, regions);

      res.json({
        success: true,
        data: events
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: 'CALENDAR_EVENTS_ERROR',
          message: error.message
        }
      });
    }
  }
);

/**
 * GET /api/cultural/calendar/ramadan/:year
 * Get Ramadan information for specific year
 */
router.get('/calendar/ramadan/:year',
  [
    param('year').isInt({ min: 2020, max: 2030 }).withMessage('Valid year required (2020-2030)')
  ],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const year = parseInt(req.params.year);

      const ramadanInfo = await culturalCalendarService.getRamadanInfo(year);

      res.json({
        success: true,
        data: ramadanInfo
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: 'RAMADAN_INFO_ERROR',
          message: error.message
        }
      });
    }
  }
);

/**
 * GET /api/cultural/calendar/scheduling-impact
 * Get scheduling impact for specific date
 */
router.get('/calendar/scheduling-impact',
  [
    query('date').isISO8601().withMessage('Valid date required'),
    query('region').optional().isString()
  ],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const date = new Date(req.query.date as string);
      const region = req.query.region as string;

      const impact = await culturalCalendarService.getSchedulingImpact(date, region);

      res.json({
        success: true,
        data: impact
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: 'SCHEDULING_IMPACT_ERROR',
          message: error.message
        }
      });
    }
  }
);

/**
 * GET /api/cultural/calendar/ramadan-friendly-times
 * Get optimal appointment times during Ramadan
 */
router.get('/calendar/ramadan-friendly-times',
  [
    query('date').isISO8601().withMessage('Valid date required'),
    query('state_code').isLength({ min: 3, max: 3 }).withMessage('Valid state code required')
  ],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const date = new Date(req.query.date as string);
      const stateCode = req.query.state_code as string;

      const friendlyTimes = await culturalCalendarService.getRamadanFriendlyTimes(date, stateCode);

      res.json({
        success: true,
        data: friendlyTimes
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: 'RAMADAN_TIMES_ERROR',
          message: error.message
        }
      });
    }
  }
);

// ============================================================================
// COMPREHENSIVE CULTURAL PREFERENCE ENDPOINTS
// ============================================================================

/**
 * POST /api/cultural/preferences
 * Create or update cultural preferences
 */
router.post('/preferences',
  [
    body('user_id').notEmpty().withMessage('User ID is required'),
    body('religion').optional().isIn(['Islam', 'Buddhism', 'Hinduism', 'Christianity', 'Other']),
    body('primary_language').isLength({ min: 2, max: 3 }).withMessage('Valid primary language required'),
    body('state_code').isLength({ min: 3, max: 3 }).withMessage('Valid state code required')
  ],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const preferences = await culturalPreferenceService.createCulturalProfile(req.body);

      res.json({
        success: true,
        data: preferences
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: 'PREFERENCES_CREATE_ERROR',
          message: error.message
        }
      });
    }
  }
);

/**
 * POST /api/cultural/integrated-guidance
 * Get integrated cultural guidance for healthcare
 */
router.post('/integrated-guidance',
  [
    body('preferences').isObject().withMessage('Preferences object required'),
    body('context').optional().isObject()
  ],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { preferences, context } = req.body;

      const guidance = await culturalPreferenceService.getIntegratedCulturalGuidance(preferences, context);

      res.json({
        success: true,
        data: guidance
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTEGRATED_GUIDANCE_ERROR',
          message: error.message
        }
      });
    }
  }
);

/**
 * POST /api/cultural/assessment
 * Perform cultural assessment
 */
router.post('/assessment',
  [
    body('preferences').isObject().withMessage('Preferences object required'),
    body('healthcare_context').optional().isObject()
  ],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { preferences, healthcare_context } = req.body;

      const assessment = await culturalPreferenceService.performCulturalAssessment(preferences, healthcare_context);

      res.json({
        success: true,
        data: assessment
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: 'CULTURAL_ASSESSMENT_ERROR',
          message: error.message
        }
      });
    }
  }
);

/**
 * POST /api/cultural/validate-healthcare-plan
 * Validate healthcare plan against cultural preferences
 */
router.post('/validate-healthcare-plan',
  [
    body('preferences').isObject().withMessage('Preferences object required'),
    body('healthcare_plan').isObject().withMessage('Healthcare plan object required')
  ],
  handleValidationErrors,
  async (req: Request, res: Response) => {
    try {
      const { preferences, healthcare_plan } = req.body;

      const validation = await culturalPreferenceService.validateHealthcarePlan(preferences, healthcare_plan);

      res.json({
        success: true,
        data: validation
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: {
          code: 'HEALTHCARE_PLAN_VALIDATION_ERROR',
          message: error.message
        }
      });
    }
  }
);

// ============================================================================
// SERVICE STATUS ENDPOINTS
// ============================================================================

/**
 * GET /api/cultural/status
 * Get cultural services health status
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const status = culturalPreferenceService.getServiceStatus();

    res.json({
      success: true,
      data: status,
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: {
        code: 'STATUS_CHECK_ERROR',
        message: error.message
      }
    });
  }
});

export default router;