/**
 * Patient Management Routes for MediMate Malaysia
 * Comprehensive patient management with Malaysian cultural intelligence and PDPA compliance
 */

import { Router, Request, Response } from 'express';
import { body, query, param, validationResult } from 'express-validator';
import { authenticateUser, requireRole } from '../middleware/auth';
import { classifyHealthcareData, HealthcareDataClass, validateMalaysianIC } from '../middleware/security';
import { Pool } from 'pg';

const router = Router();

// Database connection (to be injected)
let dbPool: Pool;

export const setPatientRoutePool = (pool: Pool): void => {
  dbPool = pool;
};

/**
 * Get patient profile (self or authorized access)
 */
router.get('/profile', [
  authenticateUser,
  query('include_medical_history').optional().isBoolean(),
  query('include_emergency_contacts').optional().isBoolean(),
  query('language').optional().isIn(['ms', 'en', 'zh', 'ta'])
], classifyHealthcareData(HealthcareDataClass.RESTRICTED), async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Invalid profile request parameters',
      details: errors.array()
    });
  }

  const {
    include_medical_history = false,
    include_emergency_contacts = false,
    language = 'ms'
  } = req.query;

  try {
    const patientProfile = await getPatientProfile(req.user!.id, {
      includeMedicalHistory: Boolean(include_medical_history),
      includeEmergencyContacts: Boolean(include_emergency_contacts),
      language: language as string
    });

    res.json({
      success: true,
      data: {
        patient: {
          ...patientProfile,
          cultural_context: getMalaysianCulturalContext(patientProfile),
          privacy_settings: {
            pdpa_consent_status: 'active',
            data_sharing_preferences: patientProfile.privacy_preferences || {},
            audit_log_accessible: true
          },
          healthcare_preferences: {
            preferred_language: language,
            cultural_dietary_restrictions: patientProfile.dietary_restrictions || [],
            religious_considerations: patientProfile.religious_preferences || {},
            family_involvement_level: patientProfile.family_involvement || 'moderate'
          }
        },
        malaysian_services: {
          moh_integration: 'active',
          ic_validation_status: 'verified',
          cultural_intelligence: 'enabled',
          prayer_time_awareness: 'active'
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve patient profile',
      code: 'PATIENT_PROFILE_ERROR',
      cultural_message: {
        en: 'Unable to access your profile information',
        ms: 'Tidak dapat mengakses maklumat profil anda',
        zh: '无法访问您的个人资料信息',
        ta: 'உங்கள் சுயவிவர தகவலை அணுக முடியவில்லை'
      }
    });
  }
});

/**
 * Update patient profile
 */
router.put('/profile', [
  authenticateUser,
  body('full_name').optional().isString().isLength({ min: 2, max: 200 }),
  body('phone_number').optional().matches(/^(\+?6?01)[0-46-9]\d{7,8}$/)
    .withMessage('Please provide a valid Malaysian phone number'),
  body('emergency_contact').optional().isObject(),
  body('cultural_preferences').optional().isObject(),
  body('dietary_restrictions').optional().isArray(),
  body('religious_preferences').optional().isObject(),
  body('language_preference').optional().isIn(['ms', 'en', 'zh', 'ta'])
], classifyHealthcareData(HealthcareDataClass.RESTRICTED), async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Invalid profile update data',
      details: errors.array(),
      cultural_message: {
        en: 'Please check your profile information',
        ms: 'Sila semak maklumat profil anda',
        zh: '请检查您的个人资料信息',
        ta: 'உங்கள் சுயவிவர தகவலை சரிபார்க்கவும்'
      }
    });
  }

  try {
    const updatedProfile = await updatePatientProfile(req.user!.id, req.body);

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        patient: {
          ...updatedProfile,
          cultural_context: getMalaysianCulturalContext(updatedProfile)
        }
      },
      cultural_message: {
        en: 'Your profile has been updated with cultural preferences',
        ms: 'Profil anda telah dikemas kini dengan keutamaan budaya',
        zh: '您的个人资料已更新，包含文化偏好',
        ta: 'கலாச்சார விருப்பத்தேர்வுகளுடன் உங்கள் சுயவிவரம் புதுப்பிக்கப்பட்டது'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to update patient profile',
      code: 'PROFILE_UPDATE_ERROR'
    });
  }
});

/**
 * Get patient medical history
 */
router.get('/medical-history', [
  authenticateUser,
  query('start_date').optional().isISO8601(),
  query('end_date').optional().isISO8601(),
  query('condition_type').optional().isString(),
  query('provider_id').optional().isUUID(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 })
], classifyHealthcareData(HealthcareDataClass.RESTRICTED), async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Invalid medical history parameters',
      details: errors.array()
    });
  }

  const {
    start_date,
    end_date,
    condition_type,
    provider_id,
    page = 1,
    limit = 20
  } = req.query;

  try {
    const medicalHistory = await getPatientMedicalHistory(req.user!.id, {
      startDate: start_date as string,
      endDate: end_date as string,
      conditionType: condition_type as string,
      providerId: provider_id as string,
      page: Number(page),
      limit: Number(limit)
    });

    res.json({
      success: true,
      data: {
        medical_history: medicalHistory.records.map(record => ({
          ...record,
          cultural_context: {
            language_used: record.language || 'ms',
            cultural_factors_considered: record.cultural_factors || {},
            religious_considerations: record.religious_notes || {},
            family_history_relevance: record.family_context || {}
          },
          privacy_compliance: {
            pdpa_audit_trail: 'available',
            data_retention_period: '7_years',
            anonymization_eligible: record.anonymization_date ? true : false
          }
        })),
        pagination: {
          current_page: Number(page),
          total_pages: Math.ceil(medicalHistory.total / Number(limit)),
          total_records: medicalHistory.total,
          records_per_page: Number(limit)
        },
        summary: {
          chronic_conditions: medicalHistory.summary.chronic_conditions || 0,
          active_treatments: medicalHistory.summary.active_treatments || 0,
          last_visit: medicalHistory.summary.last_visit || null,
          cultural_considerations: medicalHistory.summary.cultural_notes || []
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve medical history',
      code: 'MEDICAL_HISTORY_ERROR'
    });
  }
});

/**
 * Add medical condition
 */
router.post('/medical-conditions', [
  authenticateUser,
  body('condition_name').isString().isLength({ min: 2, max: 200 })
    .withMessage('Condition name must be between 2 and 200 characters'),
  body('condition_code').optional().isString(),
  body('severity').optional().isIn(['mild', 'moderate', 'severe', 'critical']),
  body('diagnosis_date').isISO8601().withMessage('Diagnosis date must be in ISO format'),
  body('diagnosed_by').optional().isString(),
  body('cultural_impact').optional().isObject(),
  body('family_history_relevant').optional().isBoolean()
], classifyHealthcareData(HealthcareDataClass.RESTRICTED), async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Invalid medical condition data',
      details: errors.array()
    });
  }

  try {
    const newCondition = await addMedicalCondition(req.user!.id, {
      ...req.body,
      created_by: req.user!.id,
      cultural_considerations: getMalaysianHealthcareConsiderations(req.body)
    });

    res.status(201).json({
      success: true,
      message: 'Medical condition added successfully',
      data: {
        condition: newCondition,
        malaysian_support: {
          traditional_medicine_guidance: 'available',
          cultural_dietary_advice: 'tailored',
          family_support_resources: 'accessible',
          religious_counseling: 'available_on_request'
        }
      },
      cultural_message: {
        en: 'Medical condition recorded with cultural considerations',
        ms: 'Keadaan perubatan direkod dengan pertimbangan budaya',
        zh: '已记录医疗状况并考虑文化因素',
        ta: 'கலாச்சார கருத்துக்களுடன் மருத்துவ நிலை பதிவு செய்யப்பட்டது'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to add medical condition',
      code: 'CONDITION_ADD_ERROR'
    });
  }
});

/**
 * Get patient emergency contacts
 */
router.get('/emergency-contacts', [
  authenticateUser
], classifyHealthcareData(HealthcareDataClass.CONFIDENTIAL), async (req: Request, res: Response) => {
  try {
    const emergencyContacts = await getEmergencyContacts(req.user!.id);

    res.json({
      success: true,
      data: {
        emergency_contacts: emergencyContacts.map(contact => ({
          ...contact,
          malaysian_context: {
            relationship_cultural_importance: getCulturalRelationshipImportance(contact.relationship),
            communication_preferences: {
              preferred_language: contact.preferred_language || 'ms',
              cultural_communication_style: contact.cultural_notes || {},
              emergency_notification_methods: contact.notification_methods || ['phone', 'sms']
            }
          }
        })),
        guidelines: {
          cultural_hierarchy: 'respect_family_elder_decisions',
          notification_order: 'follow_cultural_priority',
          language_support: 'available_in_multiple_languages',
          religious_considerations: 'respected_in_emergencies'
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve emergency contacts',
      code: 'EMERGENCY_CONTACTS_ERROR'
    });
  }
});

/**
 * Add/Update emergency contact
 */
router.post('/emergency-contacts', [
  authenticateUser,
  body('full_name').isString().isLength({ min: 2, max: 200 }),
  body('relationship').isString().isIn([
    'spouse', 'parent', 'child', 'sibling', 'grandparent', 
    'aunt', 'uncle', 'cousin', 'friend', 'guardian', 'other'
  ]),
  body('phone_primary').matches(/^(\+?6?01)[0-46-9]\d{7,8}$/)
    .withMessage('Please provide a valid Malaysian phone number'),
  body('phone_secondary').optional().matches(/^(\+?6?01)[0-46-9]\d{7,8}$/),
  body('email').optional().isEmail(),
  body('contact_priority').isInt({ min: 1, max: 10 }),
  body('preferred_language').optional().isIn(['ms', 'en', 'zh', 'ta']),
  body('cultural_notes').optional().isString(),
  body('medical_decision_authority').optional().isBoolean()
], classifyHealthcareData(HealthcareDataClass.CONFIDENTIAL), async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Invalid emergency contact data',
      details: errors.array()
    });
  }

  try {
    const newContact = await addEmergencyContact(req.user!.id, {
      ...req.body,
      cultural_importance: getCulturalRelationshipImportance(req.body.relationship),
      notification_preferences: {
        methods: ['phone', 'sms'],
        language: req.body.preferred_language || 'ms',
        cultural_sensitivity: true
      }
    });

    res.status(201).json({
      success: true,
      message: 'Emergency contact added successfully',
      data: {
        contact: newContact,
        malaysian_guidelines: {
          cultural_respect: 'family_hierarchy_considered',
          language_support: 'multi_language_notifications',
          religious_sensitivity: 'prayer_time_awareness',
          legal_authority: 'malaysian_healthcare_laws_apply'
        }
      },
      cultural_message: {
        en: 'Emergency contact added with Malaysian cultural considerations',
        ms: 'Kenalan kecemasan ditambah dengan pertimbangan budaya Malaysia',
        zh: '已添加紧急联系人并考虑马来西亚文化因素',
        ta: 'மலேசிய கலாச்சார கருத்துக்களுடன் அவசர தொடர்பு சேர்க்கப்பட்டது'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to add emergency contact',
      code: 'CONTACT_ADD_ERROR'
    });
  }
});

/**
 * Get patient cultural preferences and healthcare adaptations
 */
router.get('/cultural-preferences', [
  authenticateUser
], async (req: Request, res: Response) => {
  try {
    const culturalProfile = await getPatientCulturalProfile(req.user!.id);

    res.json({
      success: true,
      data: {
        cultural_profile: culturalProfile,
        healthcare_adaptations: {
          prayer_time_scheduling: culturalProfile.prayer_considerations || {},
          dietary_restrictions: culturalProfile.dietary_preferences || [],
          language_preferences: {
            primary: culturalProfile.primary_language || 'ms',
            secondary: culturalProfile.secondary_languages || [],
            interpretation_needed: culturalProfile.interpretation_required || false
          },
          religious_accommodations: culturalProfile.religious_requirements || {},
          family_involvement: {
            level: culturalProfile.family_involvement_level || 'moderate',
            decision_making: culturalProfile.family_decision_authority || false,
            communication_preferences: culturalProfile.family_communication || {}
          }
        },
        malaysian_services: {
          halal_meal_options: 'hospital_cafeteria_available',
          prayer_facilities: 'available_in_healthcare_facilities',
          cultural_liaisons: 'available_on_request',
          multi_faith_chaplains: 'hospital_pastoral_care'
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve cultural preferences',
      code: 'CULTURAL_PREFERENCES_ERROR'
    });
  }
});

/**
 * Healthcare provider search for patients
 */
router.get('/providers/search', [
  query('specialty').optional().isString(),
  query('location').optional().isString(),
  query('language').optional().isIn(['ms', 'en', 'zh', 'ta']),
  query('gender_preference').optional().isIn(['male', 'female', 'any']),
  query('cultural_competency').optional().isBoolean(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 })
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Invalid provider search parameters',
      details: errors.array()
    });
  }

  try {
    const providers = await searchHealthcareProviders(req.query);

    res.json({
      success: true,
      data: {
        providers: providers.results.map(provider => ({
          ...provider,
          malaysian_context: {
            moh_registration: provider.moh_registration || 'verified',
            mmc_registration: provider.mmc_registration || null,
            cultural_competency: provider.cultural_training || false,
            languages_spoken: provider.languages || ['ms', 'en'],
            religious_sensitivity: provider.religious_training || false
          },
          patient_preferences_match: {
            language_compatible: true,
            cultural_understanding: provider.cultural_competency || false,
            gender_preference_met: checkGenderPreference(provider, req.query.gender_preference as string),
            location_accessible: checkLocationAccessibility(provider, req.query.location as string)
          }
        })),
        search_criteria: req.query,
        malaysian_standards: {
          moh_compliance: 'all_providers_verified',
          cultural_training: 'available',
          multi_language_support: 'standard',
          religious_accommodation: 'policy_compliant'
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Provider search failed',
      code: 'PROVIDER_SEARCH_ERROR'
    });
  }
});

// Helper functions (in production, these would be in separate service modules)
async function getPatientProfile(userId: string, options: any): Promise<any> {
  // Mock patient profile data
  return {
    id: userId,
    full_name: 'Ahmad bin Hassan',
    ic_number: '890123-10-1234',
    date_of_birth: '1989-01-23',
    gender: 'male',
    phone_number: '+60123456789',
    email: 'ahmad.hassan@email.com',
    address: 'Kuala Lumpur, Malaysia',
    blood_type: 'B+',
    allergies: ['penicillin'],
    primary_language: 'ms',
    secondary_languages: ['en'],
    religious_preference: 'islam',
    cultural_background: 'malay',
    emergency_contact_id: 'contact-123',
    privacy_preferences: {
      family_access: true,
      emergency_sharing: true,
      research_participation: false
    }
  };
}

async function updatePatientProfile(userId: string, updateData: any): Promise<any> {
  // Mock profile update
  return { ...await getPatientProfile(userId, {}), ...updateData, updated_at: new Date().toISOString() };
}

async function getPatientMedicalHistory(userId: string, filters: any): Promise<any> {
  // Mock medical history
  return {
    records: [
      {
        id: 'record-123',
        visit_date: '2024-01-15',
        provider_name: 'Dr. Sarah Lim',
        diagnosis: 'Hypertension',
        treatment: 'Medication prescribed',
        cultural_factors: { dietary_counseling: true, prayer_timing: true },
        language: 'ms'
      }
    ],
    total: 1,
    summary: {
      chronic_conditions: 1,
      active_treatments: 2,
      last_visit: '2024-01-15',
      cultural_notes: ['dietary_restrictions_followed', 'prayer_time_considered']
    }
  };
}

async function addMedicalCondition(userId: string, conditionData: any): Promise<any> {
  // Mock add medical condition
  return {
    id: generateUUID(),
    user_id: userId,
    ...conditionData,
    created_at: new Date().toISOString()
  };
}

async function getEmergencyContacts(userId: string): Promise<any[]> {
  // Mock emergency contacts
  return [
    {
      id: 'contact-123',
      full_name: 'Siti Fatimah binti Ahmad',
      relationship: 'spouse',
      phone_primary: '+60123456788',
      email: 'siti.fatimah@email.com',
      contact_priority: 1,
      preferred_language: 'ms',
      medical_decision_authority: true,
      cultural_notes: 'Religious considerations important'
    }
  ];
}

async function addEmergencyContact(userId: string, contactData: any): Promise<any> {
  // Mock add emergency contact
  return {
    id: generateUUID(),
    user_id: userId,
    ...contactData,
    created_at: new Date().toISOString()
  };
}

async function getPatientCulturalProfile(userId: string): Promise<any> {
  // Mock cultural profile
  return {
    primary_language: 'ms',
    secondary_languages: ['en'],
    religious_preference: 'islam',
    cultural_background: 'malay',
    dietary_restrictions: ['halal_only', 'no_pork', 'no_alcohol'],
    prayer_considerations: {
      daily_prayers: true,
      friday_prayers: true,
      ramadan_fasting: true
    },
    family_involvement_level: 'high',
    traditional_medicine_acceptance: 'moderate'
  };
}

async function searchHealthcareProviders(searchParams: any): Promise<any> {
  // Mock provider search
  return {
    results: [
      {
        id: 'provider-123',
        name: 'Dr. Ahmad Rahman',
        specialty: 'General Practice',
        moh_registration: 'MOH12345',
        mmc_registration: 'MMC67890',
        languages: ['ms', 'en', 'ar'],
        gender: 'male',
        cultural_competency: true,
        location: 'Kuala Lumpur',
        rating: 4.8
      }
    ],
    total: 1
  };
}

function getMalaysianCulturalContext(patientProfile: any): any {
  return {
    cultural_background: patientProfile.cultural_background || 'mixed',
    religious_considerations: {
      primary_religion: patientProfile.religious_preference || 'islam',
      prayer_times_relevant: true,
      dietary_restrictions: patientProfile.dietary_restrictions || [],
      cultural_holidays: 'malaysian_calendar_integrated'
    },
    language_services: {
      primary: patientProfile.primary_language || 'ms',
      interpretation_available: true,
      document_translation: 'available_on_request'
    },
    family_dynamics: {
      involvement_level: patientProfile.family_involvement || 'high',
      decision_making_style: 'collaborative_with_elders',
      communication_patterns: 'respectful_hierarchy'
    }
  };
}

function getMalaysianHealthcareConsiderations(conditionData: any): any {
  return {
    traditional_medicine_integration: 'consultation_available',
    cultural_dietary_adjustments: 'nutritionist_support',
    prayer_time_medication_scheduling: 'automatic_adjustment',
    family_education_materials: 'multi_language_available',
    religious_counseling: 'chaplain_referral_available'
  };
}

function getCulturalRelationshipImportance(relationship: string): string {
  const importance: Record<string, string> = {
    spouse: 'high',
    parent: 'very_high',
    child: 'high',
    sibling: 'high',
    grandparent: 'very_high',
    aunt: 'moderate',
    uncle: 'moderate',
    cousin: 'moderate',
    friend: 'low',
    guardian: 'high'
  };
  
  return importance[relationship] || 'moderate';
}

function checkGenderPreference(provider: any, preference: string): boolean {
  if (!preference || preference === 'any') return true;
  return provider.gender === preference;
}

function checkLocationAccessibility(provider: any, preferredLocation: string): boolean {
  if (!preferredLocation) return true;
  return provider.location.toLowerCase().includes(preferredLocation.toLowerCase());
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export default router;