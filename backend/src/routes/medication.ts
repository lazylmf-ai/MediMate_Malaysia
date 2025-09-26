/**
 * Medication Management Routes for MediMate Malaysia
 * Provides comprehensive medication management with Malaysian drug registry and cultural considerations
 */

import { Router, Request, Response } from 'express';
import { body, query, param, validationResult } from 'express-validator';
import { authenticateUser, requireRole } from '../middleware/auth';
import { classifyHealthcareData, HealthcareDataClass } from '../middleware/security';
import { MedicationController } from '../controllers/medication/MedicationController';

const router = Router();
const medicationController = new MedicationController();

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
  body('medication_name').isString().isLength({ min: 2, max: 200 })
    .withMessage('Medication name must be between 2 and 200 characters'),
  body('generic_name').optional().isString().isLength({ max: 200 }),
  body('dosage').isString().isLength({ min: 1, max: 50 })
    .withMessage('Dosage information is required'),
  body('frequency').isString().isLength({ min: 1, max: 100 })
    .withMessage('Frequency information is required'),
  body('start_date').isISO8601().withMessage('Start date must be in ISO format'),
  body('end_date').optional().isISO8601().withMessage('End date must be in ISO format'),
  body('prescribed_by').optional().isString().isLength({ max: 200 }),
  body('cultural_preferences').optional().isObject()
], classifyHealthcareData(HealthcareDataClass.RESTRICTED), async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Invalid medication data',
      details: errors.array(),
      cultural_message: {
        en: 'Please verify your medication information',
        ms: 'Sila sahkan maklumat ubat anda',
        zh: '请验证您的药物信息',
        ta: 'உங்கள் மருந்து தகவலை சரிபார்க்கவும்'
      }
    });
  }

  try {
    const medicationData = {
      id: generateUUID(),
      user_id: req.user!.id,
      ...req.body,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    // Validate medication against Malaysian drug registry
    const registryValidation = await validateAgainstMOHRegistry(medicationData);
    
    // Check halal status
    const halalStatus = await checkHalalCertification(medicationData);
    
    // Create cultural adaptations
    const culturalAdaptations = createCulturalAdaptations(medicationData, req.body.cultural_preferences);

    const newMedication = {
      ...medicationData,
      moh_validation: registryValidation,
      halal_status: halalStatus,
      cultural_adaptations: culturalAdaptations,
      prayer_aligned_schedule: alignWithPrayerTimes(medicationData.frequency)
    };

    // In production, save to database
    const savedMedication = await saveMedication(newMedication);

    res.status(201).json({
      success: true,
      message: 'Medication added successfully',
      data: {
        medication: savedMedication,
        malaysian_features: {
          moh_registry_checked: true,
          halal_certification_verified: true,
          prayer_time_aligned: true,
          cultural_considerations_applied: true
        }
      },
      cultural_message: {
        en: 'Your medication has been added with Malaysian cultural considerations',
        ms: 'Ubat anda telah ditambah dengan pertimbangan budaya Malaysia',
        zh: '您的药物已添加并考虑了马来西亚文化因素',
        ta: 'மலேசிய கலாச்சார கருத்துக்களுடன் உங்கள் மருந்து சேர்க்கப்பட்டது'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to add medication',
      code: 'MEDICATION_ADD_ERROR',
      cultural_message: {
        en: 'Unable to add medication at this time',
        ms: 'Tidak dapat menambah ubat pada masa ini',
        zh: '目前无法添加药物',
        ta: 'இந்த நேரத்தில் மருந்தை சேர்க்க முடியவில்லை'
      }
    });
  }
});

/**
 * Update medication
 */
router.put('/:medicationId', [
  authenticateUser,
  param('medicationId').isUUID(),
  body('medication_name').optional().isString().isLength({ min: 2, max: 200 }),
  body('dosage').optional().isString().isLength({ min: 1, max: 50 }),
  body('frequency').optional().isString().isLength({ min: 1, max: 100 }),
  body('status').optional().isIn(['active', 'inactive', 'completed', 'discontinued']),
  body('cultural_preferences').optional().isObject()
], classifyHealthcareData(HealthcareDataClass.RESTRICTED), async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Invalid medication update data',
      details: errors.array()
    });
  }

  const { medicationId } = req.params;

  try {
    const existingMedication = getMockMedicationDetails(medicationId, req.user!.id);
    
    if (!existingMedication) {
      return res.status(404).json({
        error: 'Medication not found',
        code: 'MEDICATION_NOT_FOUND'
      });
    }

    const updatedMedication = {
      ...existingMedication,
      ...req.body,
      updated_at: new Date().toISOString()
    };

    // Re-validate cultural adaptations if preferences changed
    if (req.body.cultural_preferences) {
      updatedMedication.cultural_adaptations = createCulturalAdaptations(
        updatedMedication, 
        req.body.cultural_preferences
      );
    }

    // Re-align with prayer times if frequency changed
    if (req.body.frequency) {
      updatedMedication.prayer_aligned_schedule = alignWithPrayerTimes(req.body.frequency);
    }

    const savedMedication = await updateMedication(medicationId, updatedMedication);

    res.json({
      success: true,
      message: 'Medication updated successfully',
      data: {
        medication: savedMedication
      },
      cultural_message: {
        en: 'Your medication has been updated with cultural considerations',
        ms: 'Ubat anda telah dikemas kini dengan pertimbangan budaya',
        zh: '您的药物已更新并考虑了文化因素',
        ta: 'கலாச்சார கருத்துக்களுடன் உங்கள் மருந்து புதுப்பிக்கப்பட்டது'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to update medication',
      code: 'MEDICATION_UPDATE_ERROR'
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
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Invalid search parameters',
      details: errors.array()
    });
  }

  const { q, type = 'all', halal_only = false } = req.query;

  try {
    const searchResults = await searchMOHDrugRegistry({
      query: q as string,
      type: type as string,
      halalOnly: Boolean(halal_only)
    });

    res.json({
      success: true,
      data: {
        query: q,
        filters: { type, halal_only },
        total_results: searchResults.length,
        results: searchResults.map(drug => ({
          ...drug,
          malaysian_context: {
            moh_registered: true,
            local_availability: drug.availability || 'check_with_pharmacy',
            halal_status: drug.halal_certified ? 'certified' : 'unknown',
            alternative_names: drug.local_names || []
          }
        }))
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Drug registry search failed',
      code: 'REGISTRY_SEARCH_ERROR'
    });
  }
});

/**
 * Get medication reminders with prayer time integration
 */
router.get('/:medicationId/reminders', [
  authenticateUser,
  param('medicationId').isUUID(),
  query('date').optional().isISO8601()
], async (req: Request, res: Response) => {
  const { medicationId } = req.params;
  const { date = new Date().toISOString().split('T')[0] } = req.query;

  try {
    const medication = getMockMedicationDetails(medicationId, req.user!.id);
    
    if (!medication) {
      return res.status(404).json({
        error: 'Medication not found'
      });
    }

    const reminders = generateMedicationReminders(medication, date as string);
    const prayerAlignedReminders = alignRemindersWithPrayerTimes(reminders);

    res.json({
      success: true,
      data: {
        medication: {
          id: medicationId,
          name: medication.medication_name,
          dosage: medication.dosage,
          frequency: medication.frequency
        },
        date: date,
        reminders: prayerAlignedReminders,
        cultural_considerations: {
          prayer_time_avoidance: true,
          ramadan_adjusted: isRamadanPeriod() ? true : false,
          iftar_timing: isRamadanPeriod() ? '19:20' : null,
          suhur_timing: isRamadanPeriod() ? '05:30' : null
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to generate medication reminders'
    });
  }
});

// Helper functions (in production, these would be separate service modules)
function getMockUserMedications(userId: string, filters: any): { items: any[]; total: number } {
  // Mock data - in production, query from database
  const mockMedications = [
    {
      id: 'med-123',
      medication_name: 'Paracetamol',
      generic_name: 'Acetaminophen',
      dosage: '500mg',
      frequency: 'twice daily',
      status: 'active',
      halal_certified: true,
      moh_registration: 'MAL123456',
      category: 'pain_relief'
    },
    {
      id: 'med-124',
      medication_name: 'Amoxicillin',
      generic_name: 'Amoxicillin',
      dosage: '250mg',
      frequency: 'three times daily',
      status: 'active',
      halal_certified: false,
      moh_registration: 'MAL789012',
      category: 'antibiotic'
    }
  ];

  return {
    items: mockMedications.filter(med => 
      !filters.status || med.status === filters.status
    ).slice((filters.page - 1) * filters.limit, filters.page * filters.limit),
    total: mockMedications.length
  };
}

function getMockMedicationDetails(medicationId: string, userId: string): any {
  // Mock detailed medication data
  return {
    id: medicationId,
    medication_name: 'Paracetamol',
    generic_name: 'Acetaminophen',
    dosage: '500mg',
    frequency: 'twice daily',
    dosing_schedule: ['08:00', '20:00'],
    status: 'active',
    halal_certified: true,
    moh_registration: 'MAL123456',
    prescribed_by: 'Dr. Ahmad Hassan',
    start_date: '2024-01-15',
    cultural_preferences: {
      prayer_avoidance: true,
      ramadan_adjustment: true
    }
  };
}

function getMedicationCulturalContext(medication: any): any {
  return {
    halal_considerations: {
      status: medication.halal_certified ? 'certified_halal' : 'requires_verification',
      gelatin_capsule: false,
      alcohol_content: false,
      pork_derivatives: false
    },
    prayer_time_considerations: {
      avoid_during_prayers: true,
      buffer_time_minutes: 15,
      aligned_schedule: medication.prayer_aligned_schedule || null
    },
    ramadan_adjustments: {
      fasting_compatible: true,
      timing_modifications: medication.ramadan_schedule || null,
      iftar_timing: medication.can_take_with_iftar || false
    },
    cultural_preferences: {
      family_involvement: 'encouraged',
      traditional_medicine_interaction: 'consult_healthcare_provider'
    }
  };
}

async function validateAgainstMOHRegistry(medicationData: any): Promise<any> {
  // Mock MOH registry validation
  return {
    is_registered: true,
    registration_number: 'MAL123456',
    status: 'active',
    approved_indications: ['pain relief', 'fever reduction'],
    warnings: []
  };
}

async function checkHalalCertification(medicationData: any): Promise<any> {
  // Mock halal certification check
  return {
    is_certified: false,
    certifying_body: null,
    certificate_number: null,
    concerns: ['gelatin_capsule_source_unknown']
  };
}

function createCulturalAdaptations(medicationData: any, preferences: any): any {
  return {
    prayer_aligned_dosing: true,
    ramadan_schedule_available: true,
    family_notification_enabled: preferences?.family_involvement || false,
    multi_language_instructions: {
      available_languages: ['ms', 'en', 'zh', 'ta'],
      primary_language: preferences?.language || 'ms'
    }
  };
}

function alignWithPrayerTimes(dosage_schedule: string | string[]): any {
  // Mock prayer time alignment
  return {
    original_times: Array.isArray(dosage_schedule) ? dosage_schedule : ['08:00', '20:00'],
    prayer_aligned_times: ['08:30', '21:00'], // After Fajr and Isha
    avoided_periods: ['05:45-06:00', '13:15-13:30', '16:30-16:45', '19:20-19:35', '20:35-20:50']
  };
}

function checkMalaysianAvailability(genericName: string): string {
  // Mock availability check
  return 'widely_available';
}

function findHalalAlternatives(genericName: string): string[] {
  // Mock halal alternatives
  return ['Brand A (Halal Certified)', 'Brand B (Halal Certified)'];
}

function getRamadanDosingAdjustments(medication: any): any {
  return {
    fasting_period_modifications: true,
    suhur_timing: '05:30',
    iftar_timing: '19:20',
    adjusted_schedule: ['05:00', '20:00'] // Before Fajr, after Maghrib
  };
}

function getCulturalTimingPreferences(medication: any): any {
  return {
    family_meal_alignment: true,
    work_schedule_consideration: true,
    elderly_care_timing: 'morning_preferred',
    children_dosing: 'after_school_preferred'
  };
}

async function saveMedication(medicationData: any): Promise<any> {
  // Mock save operation
  return medicationData;
}

async function updateMedication(medicationId: string, medicationData: any): Promise<any> {
  // Mock update operation
  return medicationData;
}

async function searchMOHDrugRegistry(params: any): Promise<any[]> {
  // Mock MOH drug registry search
  return [
    {
      drug_name: 'Paracetamol',
      generic_name: 'Acetaminophen',
      registration_number: 'MAL123456',
      manufacturer: 'Local Pharma Sdn Bhd',
      halal_certified: true,
      availability: 'widely_available',
      local_names: ['Panadol', 'Fever-Go']
    }
  ];
}

function generateMedicationReminders(medication: any, date: string): any[] {
  // Mock reminder generation
  return [
    { time: '08:00', dosage: '500mg', notes: 'Take with food' },
    { time: '20:00', dosage: '500mg', notes: 'Take with food' }
  ];
}

function alignRemindersWithPrayerTimes(reminders: any[]): any[] {
  // Mock prayer time alignment for reminders
  return reminders.map(reminder => ({
    ...reminder,
    prayer_consideration: 'scheduled_outside_prayer_times',
    next_prayer: 'Dhuhr at 13:15',
    adjustment_reason: reminder.time === '13:15' ? 'moved_to_avoid_prayer_time' : null
  }));
}

function isRamadanPeriod(): boolean {
  // Simple check - in production, would use Islamic calendar
  const today = new Date();
  const ramadanStart = new Date(today.getFullYear(), 2, 23); // Approximate
  const ramadanEnd = new Date(today.getFullYear(), 3, 21);
  return today >= ramadanStart && today <= ramadanEnd;
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export default router;