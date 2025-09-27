/**
 * Medication Management Routes for MediMate Malaysia
 * Provides comprehensive medication management with Malaysian drug registry and cultural considerations
 */

import { Router, Request, Response } from 'express';
import { body, query, param, validationResult } from 'express-validator';
import { authenticateUser, requireRole } from '../middleware/auth';
import { classifyHealthcareData, HealthcareDataClass } from '../middleware/security';
import { MedicationController } from '../controllers/medication/MedicationController';
import { MedicationSearchService } from '../services/medication/MedicationSearchService';
import { OfflineSyncService } from '../services/medication/OfflineSyncService';

const router = Router();
const medicationController = new MedicationController();
const searchService = MedicationSearchService.getInstance();
const offlineSyncService = OfflineSyncService.getInstance();

/**
 * Get user's current medications
 */
router.get('/', [
  authenticateUser,
  query('status').optional().isIn(['active', 'inactive', 'completed', 'discontinued'])
    .withMessage('Status must be active, inactive, completed, or discontinued'),
  query('category').optional().isString(),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
], classifyHealthcareData(HealthcareDataClass.RESTRICTED), medicationController.getUserMedications.bind(medicationController));

/**
 * Get specific medication details
 */
router.get('/:medicationId', [
  authenticateUser,
  param('medicationId').isUUID().withMessage('Invalid medication ID format')
], classifyHealthcareData(HealthcareDataClass.RESTRICTED), medicationController.getMedicationById.bind(medicationController));

/**
 * Add new medication
 */
router.post('/', [
  authenticateUser,
  requireRole(['patient', 'doctor', 'pharmacist']),
  body('name').isString().isLength({ min: 2, max: 200 })
    .withMessage('Medication name must be between 2 and 200 characters'),
  body('genericName').optional().isString().isLength({ max: 200 }),
  body('dosage').isObject().withMessage('Dosage information is required'),
  body('dosage.amount').isNumeric().withMessage('Dosage amount must be numeric'),
  body('dosage.unit').isIn(['mg', 'ml', 'tablet', 'capsule', 'drop', 'gram', 'mcg'])
    .withMessage('Invalid dosage unit'),
  body('dosage.form').isIn(['tablet', 'liquid', 'injection', 'topical', 'inhaler', 'suppository'])
    .withMessage('Invalid dosage form'),
  body('schedule').isObject().withMessage('Schedule information is required'),
  body('schedule.frequency').isIn(['daily', 'twice_daily', 'three_times', 'four_times', 'weekly', 'monthly', 'as_needed'])
    .withMessage('Invalid frequency'),
  body('schedule.times').isArray().withMessage('Schedule times must be an array'),
  body('cultural_preferences').optional().isObject()
], classifyHealthcareData(HealthcareDataClass.RESTRICTED), medicationController.createMedication.bind(medicationController));

/**
 * Update medication
 */
router.put('/:medicationId', [
  authenticateUser,
  param('medicationId').isUUID(),
  body('name').optional().isString().isLength({ min: 2, max: 200 }),
  body('dosage').optional().isObject(),
  body('schedule').optional().isObject(),
  body('status').optional().isIn(['active', 'inactive', 'completed', 'discontinued', 'paused']),
  body('cultural_preferences').optional().isObject()
], classifyHealthcareData(HealthcareDataClass.RESTRICTED), medicationController.updateMedication.bind(medicationController));

/**
 * Delete medication
 */
router.delete('/:medicationId', [
  authenticateUser,
  param('medicationId').isUUID().withMessage('Invalid medication ID format')
], classifyHealthcareData(HealthcareDataClass.RESTRICTED), medicationController.deleteMedication.bind(medicationController));

/**
 * Process OCR results to extract medication information
 */
router.post('/ocr/process', [
  authenticateUser,
  body('ocr_result').isObject().withMessage('OCR result data is required'),
  body('ocr_result.extractedText').isString().withMessage('Extracted text is required'),
  body('ocr_result.confidence').isNumeric().withMessage('Confidence score is required'),
  body('cultural_preferences').optional().isObject()
], classifyHealthcareData(HealthcareDataClass.RESTRICTED), medicationController.processOCRResults.bind(medicationController));

/**
 * Validate medication against Malaysian drug database
 */
router.post('/validate', [
  authenticateUser,
  body('medication_name').isString().isLength({ min: 2 }).withMessage('Medication name is required'),
  body('generic_name').optional().isString(),
  body('manufacturer').optional().isString(),
  body('dosage_form').optional().isString()
], classifyHealthcareData(HealthcareDataClass.RESTRICTED), async (req: Request, res: Response) => {
  try {
    const validation = await medicationController.medicationService.validateAgainstMalaysianDatabase(req.body);

    res.json({
      success: true,
      data: validation,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Medication validation failed',
      code: 'VALIDATION_ERROR',
      message: error.message
    });
  }
});

/**
 * Search Malaysian drug registry
 */
router.get('/registry/search', [
  query('q').isString().isLength({ min: 2 }).withMessage('Search query must be at least 2 characters'),
  query('type').optional().isIn(['brand', 'generic', 'ingredient'])
    .withMessage('Type must be brand, generic, or ingredient'),
  query('halal_only').optional().isBoolean().withMessage('Halal filter must be true or false')
], medicationController.searchMalaysianDrugRegistry.bind(medicationController));

/**
 * Get medication reminders with prayer time integration
 */
router.get('/:medicationId/reminders', [
  authenticateUser,
  param('medicationId').isUUID(),
  query('date').optional().isISO8601()
], medicationController.getMedicationReminders.bind(medicationController));

/**
 * Record medication adherence
 */
router.post('/:medicationId/adherence', [
  authenticateUser,
  param('medicationId').isUUID(),
  body('date').isISO8601().withMessage('Date is required in ISO format'),
  body('scheduled').isString().withMessage('Scheduled time is required (HH:mm format)'),
  body('taken').isBoolean().withMessage('Taken status is required'),
  body('takenAt').optional().isISO8601().withMessage('Taken at must be in ISO format'),
  body('notes').optional().isString(),
  body('skippedReason').optional().isIn(['forgot', 'side_effects', 'unavailable', 'prayer_time', 'fasting', 'other'])
], classifyHealthcareData(HealthcareDataClass.RESTRICTED), async (req: Request, res: Response) => {
  try {
    const adherenceRecord = await medicationController.medicationService.recordAdherence(
      req.params.medicationId,
      req.user!.id,
      req.body
    );

    res.status(201).json({
      success: true,
      data: adherenceRecord,
      cultural_message: {
        en: 'Medication adherence recorded successfully',
        ms: 'Pematuhan ubat telah direkodkan berjaya',
        zh: '药物依从性记录成功',
        ta: 'மருந்து பின்பற்றுதல் வெற்றிகரமாக பதிவு செய்யப்பட்டது'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to record adherence',
      code: 'ADHERENCE_RECORD_ERROR',
      message: error.message
    });
  }
});

/**
 * Get medication adherence history
 */
router.get('/:medicationId/adherence', [
  authenticateUser,
  param('medicationId').isUUID(),
  query('start_date').optional().isISO8601(),
  query('end_date').optional().isISO8601(),
  query('limit').optional().isInt({ min: 1, max: 100 })
], classifyHealthcareData(HealthcareDataClass.RESTRICTED), async (req: Request, res: Response) => {
  try {
    const adherenceHistory = await medicationController.medicationService.getAdherenceHistory(
      req.params.medicationId,
      req.user!.id,
      {
        startDate: req.query.start_date as string,
        endDate: req.query.end_date as string,
        limit: parseInt(req.query.limit as string) || 30
      }
    );

    res.json({
      success: true,
      data: adherenceHistory,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get adherence history',
      code: 'ADHERENCE_HISTORY_ERROR',
      message: error.message
    });
  }
});

/**
 * Share medication with family member
 */
router.post('/:medicationId/share', [
  authenticateUser,
  param('medicationId').isUUID(),
  body('family_member_id').isUUID().withMessage('Family member ID is required'),
  body('permissions').isArray().withMessage('Permissions array is required'),
  body('permissions.*').isIn(['view', 'edit', 'schedule', 'adherence']).withMessage('Invalid permission'),
  body('cultural_preferences').optional().isObject()
], classifyHealthcareData(HealthcareDataClass.RESTRICTED), async (req: Request, res: Response) => {
  try {
    const sharedMedication = await medicationController.medicationService.shareMedicationWithFamily(
      req.params.medicationId,
      req.user!.id,
      req.body.family_member_id,
      {
        permissions: req.body.permissions,
        culturalPreferences: req.body.cultural_preferences
      }
    );

    res.status(201).json({
      success: true,
      data: sharedMedication,
      cultural_message: {
        en: 'Medication shared with family member successfully',
        ms: 'Ubat telah dikongsi dengan ahli keluarga berjaya',
        zh: '药物已成功与家庭成员共享',
        ta: 'குடும்ப உறுப்பினருடன் மருந்து வெற்றிகரமாக பகிரப்பட்டது'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to share medication',
      code: 'MEDICATION_SHARE_ERROR',
      message: error.message
    });
  }
});

/**
 * Get shared medications from family
 */
router.get('/family/shared', [
  authenticateUser,
  query('family_member_id').optional().isUUID(),
  query('permission_type').optional().isIn(['view', 'edit', 'schedule', 'adherence'])
], classifyHealthcareData(HealthcareDataClass.RESTRICTED), async (req: Request, res: Response) => {
  try {
    const sharedMedications = await medicationController.medicationService.getSharedFamilyMedications(
      req.user!.id,
      {
        familyMemberId: req.query.family_member_id as string,
        permissionType: req.query.permission_type as string
      }
    );

    res.json({
      success: true,
      data: sharedMedications,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get shared medications',
      code: 'SHARED_MEDICATIONS_ERROR',
      message: error.message
    });
  }
});

/**
 * Enhanced medication search with cultural intelligence
 */
router.get('/search/enhanced', [
  authenticateUser,
  query('q').isString().isLength({ min: 1 }).withMessage('Search query is required'),
  query('fuzzy_matching').optional().isBoolean().withMessage('Fuzzy matching must be true or false'),
  query('halal_only').optional().isBoolean().withMessage('Halal filter must be true or false'),
  query('local_manufacturers').optional().isBoolean().withMessage('Local manufacturers filter must be true or false'),
  query('max_results').optional().isInt({ min: 1, max: 100 }).withMessage('Max results must be between 1 and 100'),
  query('sort_by').optional().isIn(['relevance', 'popularity', 'price', 'availability'])
    .withMessage('Sort by must be relevance, popularity, price, or availability')
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Invalid search parameters',
      details: errors.array(),
      cultural_message: {
        en: 'Please check your search criteria',
        ms: 'Sila semak kriteria carian anda',
        zh: '请检查您的搜索条件',
        ta: 'உங்கள் தேடல் அளவுகோலை சரிபார்க்கவும்'
      }
    });
  }

  try {
    const searchParams = {
      query: req.query.q as string,
      fuzzyMatching: req.query.fuzzy_matching === 'true',
      halalOnly: req.query.halal_only === 'true',
      culturalContext: {
        halalPreferred: req.query.halal_only === 'true',
        localManufacturers: req.query.local_manufacturers === 'true',
        traditionalEquivalents: true
      },
      searchOptimization: {
        useIndex: true,
        cacheResults: true,
        maxResults: parseInt(req.query.max_results as string) || 50,
        sortBy: (req.query.sort_by as any) || 'relevance'
      }
    };

    const searchResult = await searchService.searchMedications(searchParams);

    res.json({
      success: true,
      data: searchResult,
      cultural_message: {
        en: 'Search results optimized for Malaysian context',
        ms: 'Hasil carian dioptimumkan untuk konteks Malaysia',
        zh: '搜索结果针对马来西亚语境进行了优化',
        ta: 'மலேசிய சூழலுக்கு ஏற்றவாறு தேடல் முடிவுகள் மேம்படுத்தப்பட்டுள்ளன'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Enhanced search failed',
      code: 'ENHANCED_SEARCH_ERROR',
      message: error.message,
      cultural_message: {
        en: 'Search service is temporarily unavailable',
        ms: 'Perkhidmatan carian tidak tersedia buat sementara',
        zh: '搜索服务暂时不可用',
        ta: 'தேடல் சேவை தற்காலிகமாக கிடைக்கவில்லை'
      }
    });
  }
});

/**
 * Medication autocomplete for enhanced search
 */
router.get('/autocomplete', [
  authenticateUser,
  query('q').isString().isLength({ min: 2 }).withMessage('Query must be at least 2 characters'),
  query('limit').optional().isInt({ min: 1, max: 20 }).withMessage('Limit must be between 1 and 20'),
  query('include_brands').optional().isBoolean(),
  query('include_manufacturers').optional().isBoolean()
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Invalid autocomplete parameters',
      details: errors.array()
    });
  }

  try {
    const autocompleteResult = await searchService.getAutocompletesuggestions(
      req.query.q as string,
      {
        limit: parseInt(req.query.limit as string) || 10,
        includeBrands: req.query.include_brands === 'true',
        includeManufacturers: req.query.include_manufacturers === 'true'
      }
    );

    res.json({
      success: true,
      data: autocompleteResult,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Autocomplete failed',
      code: 'AUTOCOMPLETE_ERROR',
      message: error.message
    });
  }
});

/**
 * Advanced medication search with multiple criteria
 */
router.post('/search/advanced', [
  authenticateUser,
  body('medications').optional().isArray(),
  body('conditions').optional().isArray(),
  body('culturalRequirements').optional().isObject(),
  body('demographics').optional().isObject()
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Invalid advanced search parameters',
      details: errors.array()
    });
  }

  try {
    const searchResult = await searchService.advancedSearch(req.body);

    res.json({
      success: true,
      data: searchResult,
      cultural_message: {
        en: 'Advanced search completed with cultural considerations',
        ms: 'Carian lanjutan selesai dengan pertimbangan budaya',
        zh: '高级搜索已完成，并考虑了文化因素',
        ta: 'கலாச்சார கருத்துக்களுடன் மேம்பட்ட தேடல் முடிந்தது'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Advanced search failed',
      code: 'ADVANCED_SEARCH_ERROR',
      message: error.message
    });
  }
});

/**
 * Offline sync - Upload offline data
 */
router.post('/sync/upload', [
  authenticateUser,
  body('payload').isObject().withMessage('Sync payload is required'),
  body('payload.checksum').isString().withMessage('Payload checksum is required'),
  body('payload.timestamp').isISO8601().withMessage('Valid timestamp is required'),
  body('payload.deviceInfo').isObject().withMessage('Device info is required'),
  body('options').isObject().withMessage('Sync options are required'),
  body('options.deviceId').isString().withMessage('Device ID is required'),
  body('options.syncType').isIn(['full', 'incremental', 'medications_only', 'adherence_only'])
    .withMessage('Invalid sync type')
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Invalid sync payload',
      details: errors.array(),
      cultural_message: {
        en: 'Please check your offline data format',
        ms: 'Sila semak format data luar talian anda',
        zh: '请检查您的离线数据格式',
        ta: 'உங்கள் ஆஃப்லைன் தரவு வடிவத்தைச் சரிபார்க்கவும்'
      }
    });
  }

  try {
    const syncOptions = {
      ...req.body.options,
      userId: req.user!.id,
      culturalPreferences: {
        languagePreference: req.user!.preferences?.language || 'ms',
        dataResidency: req.user!.preferences?.dataResidency || 'malaysia_only',
        halalOnly: req.user!.preferences?.halalOnly || false
      }
    };

    const syncResult = await offlineSyncService.syncFromOffline(
      req.body.payload,
      syncOptions
    );

    res.json({
      success: true,
      data: syncResult,
      cultural_message: {
        en: 'Offline data synchronized successfully',
        ms: 'Data luar talian berjaya diselaraskan',
        zh: '离线数据同步成功',
        ta: 'ஆஃப்லைன் தரவு வெற்றிகரமாக ஒத்திசைக்கப்பட்டது'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Offline sync failed',
      code: 'OFFLINE_SYNC_ERROR',
      message: error.message,
      cultural_message: {
        en: 'Unable to synchronize offline data at this time',
        ms: 'Tidak dapat menyegerakkan data luar talian pada masa ini',
        zh: '目前无法同步离线数据',
        ta: 'இந்த நேரத்தில் ஆஃப்லைன் தரவை ஒத்திசைக்க முடியவில்லை'
      }
    });
  }
});

/**
 * Offline sync - Download data package for mobile
 */
router.get('/sync/download', [
  authenticateUser,
  query('device_id').isString().withMessage('Device ID is required'),
  query('sync_type').optional().isIn(['full', 'incremental', 'medications_only', 'adherence_only']),
  query('last_sync').optional().isISO8601().withMessage('Last sync must be valid ISO date')
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Invalid download parameters',
      details: errors.array()
    });
  }

  try {
    const syncOptions = {
      userId: req.user!.id,
      deviceId: req.query.device_id as string,
      syncType: (req.query.sync_type as any) || 'full',
      lastSyncTimestamp: req.query.last_sync as string,
      culturalPreferences: {
        languagePreference: req.user!.preferences?.language || 'ms',
        dataResidency: req.user!.preferences?.dataResidency || 'malaysia_only',
        halalOnly: req.user!.preferences?.halalOnly || false
      }
    };

    const offlinePackage = await offlineSyncService.generateOfflineDataPackage(syncOptions);

    res.json({
      success: true,
      data: offlinePackage,
      cultural_message: {
        en: 'Offline data package prepared with cultural preferences',
        ms: 'Pakej data luar talian disediakan dengan keutamaan budaya',
        zh: '离线数据包已准备好，包含文化偏好',
        ta: 'கலாச்சார விருப்பத்தேர்வுகளுடன் ஆஃப்லைன் தரவு தொகுப்பு தயாரிக்கப்பட்டது'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Offline package generation failed',
      code: 'OFFLINE_PACKAGE_ERROR',
      message: error.message
    });
  }
});

/**
 * Get sync status for device
 */
router.get('/sync/status', [
  authenticateUser,
  query('device_id').isString().withMessage('Device ID is required')
], async (req: Request, res: Response) => {
  try {
    const syncStatus = await offlineSyncService.getSyncStatus(
      req.user!.id,
      req.query.device_id as string
    );

    res.json({
      success: true,
      data: syncStatus,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get sync status',
      code: 'SYNC_STATUS_ERROR',
      message: error.message
    });
  }
});

/**
 * Database optimization endpoint (admin only)
 */
router.post('/admin/optimize-database', [
  authenticateUser,
  requireRole(['admin', 'system'])
], async (req: Request, res: Response) => {
  try {
    const optimizationResult = await searchService.optimizeDatabase();

    res.json({
      success: true,
      data: optimizationResult,
      message: 'Database optimization completed',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Database optimization failed',
      code: 'OPTIMIZATION_ERROR',
      message: error.message
    });
  }
});

/**
 * Get database optimization statistics (admin only)
 */
router.get('/admin/optimization-stats', [
  authenticateUser,
  requireRole(['admin', 'system'])
], async (req: Request, res: Response) => {
  try {
    const optimizationStats = await searchService.getDatabaseOptimizationStats();

    res.json({
      success: true,
      data: optimizationStats,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to get optimization stats',
      code: 'OPTIMIZATION_STATS_ERROR',
      message: error.message
    });
  }
});

/**
 * Check medication interactions
 */
router.post('/interactions/check', [
  authenticateUser,
  body('medications').isArray().withMessage('Medications array is required'),
  body('medications.*.id').optional().isUUID(),
  body('medications.*.name').isString().withMessage('Medication name is required'),
  body('new_medication').optional().isObject()
], classifyHealthcareData(HealthcareDataClass.RESTRICTED), async (req: Request, res: Response) => {
  try {
    const interactionCheck = await medicationController.medicationService.checkMedicationInteractions(
      req.user!.id,
      req.body.medications,
      req.body.new_medication
    );

    res.json({
      success: true,
      data: interactionCheck,
      cultural_message: {
        en: 'Medication interaction check completed',
        ms: 'Semakan interaksi ubat selesai',
        zh: '药物相互作用检查完成',
        ta: 'மருந்து இடைவினை சரிபார்ப்பு முடிந்தது'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to check interactions',
      code: 'INTERACTION_CHECK_ERROR',
      message: error.message
    });
  }
});

/**
 * Update medication schedule with cultural considerations
 */
router.put('/:medicationId/schedule', [
  authenticateUser,
  param('medicationId').isUUID(),
  body('schedule').isObject().withMessage('Schedule information is required'),
  body('schedule.frequency').isIn(['daily', 'twice_daily', 'three_times', 'four_times', 'weekly', 'monthly', 'as_needed']),
  body('schedule.times').isArray().withMessage('Schedule times must be an array'),
  body('cultural_adjustments').optional().isObject()
], classifyHealthcareData(HealthcareDataClass.RESTRICTED), async (req: Request, res: Response) => {
  try {
    const updatedSchedule = await medicationController.medicationService.updateMedicationSchedule(
      req.params.medicationId,
      req.user!.id,
      req.body.schedule,
      req.body.cultural_adjustments
    );

    res.json({
      success: true,
      data: updatedSchedule,
      cultural_message: {
        en: 'Medication schedule updated with cultural considerations',
        ms: 'Jadual ubat dikemas kini dengan pertimbangan budaya',
        zh: '药物时间表已更新并考虑文化因素',
        ta: 'கலாச்சார கருத்துகளுடன் மருந்து அட்டவணை புதுப்பிக்கப்பட்டது'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to update schedule',
      code: 'SCHEDULE_UPDATE_ERROR',
      message: error.message
    });
  }
});

// All medication operations are now handled through the MedicationController and services


export default router;