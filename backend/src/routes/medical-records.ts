/**
 * Medical Records Routes for MediMate Malaysia
 * Comprehensive medical record management with PDPA compliance and multi-language support
 */

import { Router, Request, Response } from 'express';
import { body, query, param, validationResult } from 'express-validator';
import { authenticateUser, requireRole } from '../middleware/auth';
import { classifyHealthcareData, HealthcareDataClass } from '../middleware/security';

const router = Router();

/**
 * Get user's medical records
 */
router.get('/', [
  authenticateUser,
  query('start_date').optional().isISO8601(),
  query('end_date').optional().isISO8601(),
  query('record_type').optional().isIn(['consultation', 'diagnosis', 'procedure', 'lab_result', 'imaging', 'prescription']),
  query('provider_id').optional().isUUID(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 })
], classifyHealthcareData(HealthcareDataClass.RESTRICTED), async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Invalid medical records parameters',
      details: errors.array(),
      cultural_message: {
        en: 'Please check your medical records search criteria',
        ms: 'Sila semak kriteria carian rekod perubatan anda',
        zh: '请检查您的医疗记录搜索条件',
        ta: 'உங்கள் மருத்துவ பதிவு தேடல் அளவுகோல்களை சரிபார்க்கவும்'
      }
    });
  }

  const filters = {
    userId: req.user!.id,
    startDate: req.query.start_date as string,
    endDate: req.query.end_date as string,
    recordType: req.query.record_type as string,
    providerId: req.query.provider_id as string,
    page: parseInt(req.query.page as string) || 1,
    limit: parseInt(req.query.limit as string) || 20
  };

  try {
    const medicalRecords = await getMedicalRecords(filters);

    res.json({
      success: true,
      data: {
        medical_records: medicalRecords.records.map(record => ({
          ...record,
          malaysian_context: {
            cultural_factors: record.cultural_factors || {},
            language_used: record.language_used || 'ms',
            religious_considerations: record.religious_considerations || {},
            family_involvement: record.family_involvement || false
          },
          pdpa_compliance: {
            consent_status: 'active',
            data_retention_period: '7_years',
            audit_trail_available: true,
            data_subject_rights_applicable: true
          },
          clinical_summary: {
            primary_diagnosis: record.primary_diagnosis,
            treatment_provided: record.treatment_provided,
            follow_up_required: record.follow_up_required,
            medications_prescribed: record.medications_prescribed || []
          }
        })),
        pagination: {
          current_page: filters.page,
          total_pages: Math.ceil(medicalRecords.total / filters.limit),
          total_records: medicalRecords.total,
          records_per_page: filters.limit
        },
        summary: {
          total_consultations: medicalRecords.summary.consultations || 0,
          recent_diagnoses: medicalRecords.summary.recent_diagnoses || [],
          active_treatments: medicalRecords.summary.active_treatments || 0,
          last_visit_date: medicalRecords.summary.last_visit || null
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve medical records',
      code: 'MEDICAL_RECORDS_ERROR',
      cultural_message: {
        en: 'Unable to access your medical records at this time',
        ms: 'Tidak dapat mengakses rekod perubatan anda pada masa ini',
        zh: '目前无法访问您的医疗记录',
        ta: 'இந்த நேரத்தில் உங்கள் மருத்துவ பதிவுகளை அணுக முடியவில்லை'
      }
    });
  }
});

/**
 * Get specific medical record details
 */
router.get('/:recordId', [
  authenticateUser,
  param('recordId').isUUID().withMessage('Invalid medical record ID'),
  query('include_documents').optional().isBoolean(),
  query('language').optional().isIn(['ms', 'en', 'zh', 'ta'])
], classifyHealthcareData(HealthcareDataClass.RESTRICTED), async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Invalid medical record request',
      details: errors.array()
    });
  }

  const { recordId } = req.params;
  const {
    include_documents = false,
    language = 'ms'
  } = req.query;

  try {
    const medicalRecord = await getMedicalRecordById(recordId, req.user!.id, {
      includeDocuments: Boolean(include_documents),
      language: language as string
    });

    if (!medicalRecord) {
      return res.status(404).json({
        error: 'Medical record not found',
        code: 'RECORD_NOT_FOUND',
        cultural_message: {
          en: 'The requested medical record was not found',
          ms: 'Rekod perubatan yang diminta tidak dijumpai',
          zh: '未找到请求的医疗记录',
          ta: 'கோரப்பட்ட மருத்துவ பதிவு கிடைக்கவில்லை'
        }
      });
    }

    res.json({
      success: true,
      data: {
        medical_record: {
          ...medicalRecord,
          malaysian_enhancements: {
            cultural_interpretation: getMedicalRecordCulturalContext(medicalRecord),
            language_translations: getTranslatedMedicalTerms(medicalRecord, language as string),
            family_sharing_permissions: medicalRecord.family_sharing_allowed || false,
            religious_dietary_considerations: medicalRecord.dietary_recommendations || []
          },
          clinical_details: {
            detailed_diagnosis: medicalRecord.detailed_diagnosis,
            treatment_plan: medicalRecord.treatment_plan,
            medication_instructions: medicalRecord.medication_instructions,
            lifestyle_recommendations: medicalRecord.lifestyle_recommendations,
            follow_up_schedule: medicalRecord.follow_up_schedule
          },
          provider_information: {
            primary_physician: medicalRecord.primary_physician,
            healthcare_facility: medicalRecord.healthcare_facility,
            specialist_consultations: medicalRecord.specialist_consultations || [],
            emergency_contact_informed: medicalRecord.emergency_contact_notified || false
          }
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve medical record details',
      code: 'RECORD_DETAIL_ERROR'
    });
  }
});

/**
 * Create new medical record (for healthcare providers)
 */
router.post('/', [
  authenticateUser,
  requireRole(['doctor', 'nurse', 'pharmacist']),
  body('patient_id').isUUID().withMessage('Valid patient ID is required'),
  body('record_type').isIn(['consultation', 'diagnosis', 'procedure', 'lab_result', 'imaging', 'prescription'])
    .withMessage('Valid record type is required'),
  body('visit_date').isISO8601().withMessage('Valid visit date is required'),
  body('chief_complaint').optional().isString().isLength({ max: 1000 }),
  body('clinical_findings').optional().isString().isLength({ max: 2000 }),
  body('diagnosis').optional().isString().isLength({ max: 1000 }),
  body('treatment_plan').optional().isString().isLength({ max: 2000 }),
  body('medications').optional().isArray(),
  body('follow_up_required').optional().isBoolean(),
  body('cultural_considerations').optional().isObject()
], classifyHealthcareData(HealthcareDataClass.RESTRICTED), async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Invalid medical record data',
      details: errors.array(),
      cultural_message: {
        en: 'Please verify the medical record information',
        ms: 'Sila sahkan maklumat rekod perubatan',
        zh: '请验证医疗记录信息',
        ta: 'மருத்துவ பதிவு தகவலை சரிபார்க்கவும்'
      }
    });
  }

  try {
    // Validate provider has permission to create records for this patient
    const hasPermission = await validateProviderPatientRelationship(
      req.user!.id,
      req.body.patient_id
    );

    if (!hasPermission) {
      return res.status(403).json({
        error: 'Insufficient permissions to create medical record for this patient',
        code: 'PROVIDER_PATIENT_PERMISSION_DENIED'
      });
    }

    const medicalRecordData = {
      id: generateUUID(),
      patient_id: req.body.patient_id,
      provider_id: req.user!.id,
      record_type: req.body.record_type,
      visit_date: req.body.visit_date,
      visit_time: req.body.visit_time || new Date().toTimeString().slice(0, 5),
      chief_complaint: req.body.chief_complaint,
      history_of_present_illness: req.body.clinical_findings,
      clinical_assessment: req.body.diagnosis,
      treatment_plan: req.body.treatment_plan,
      medications_prescribed: req.body.medications || [],
      follow_up_required: req.body.follow_up_required || false,
      cultural_factors: req.body.cultural_considerations || {},
      created_by: req.user!.id,
      created_at: new Date().toISOString()
    };

    // Apply Malaysian healthcare standards
    const enhancedRecord = await applyMalaysianHealthcareStandards(medicalRecordData);

    // Create the medical record
    const newMedicalRecord = await createMedicalRecord(enhancedRecord);

    // Log for PDPA audit trail
    await logMedicalRecordCreation(newMedicalRecord, req.user!.id);

    res.status(201).json({
      success: true,
      message: 'Medical record created successfully',
      data: {
        medical_record: newMedicalRecord,
        malaysian_compliance: {
          pdpa_audit_logged: true,
          moh_standards_applied: true,
          cultural_context_integrated: true,
          data_retention_scheduled: true
        }
      },
      cultural_message: {
        en: 'Medical record has been created with Malaysian healthcare standards',
        ms: 'Rekod perubatan telah dibuat mengikut piawaian perubatan Malaysia',
        zh: '医疗记录已按马来西亚医疗标准创建',
        ta: 'மலேசிய சுகாதார தரங்களுடன் மருத்துவ பதிவு உருவாக்கப்பட்டது'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to create medical record',
      code: 'RECORD_CREATION_ERROR',
      cultural_message: {
        en: 'Unable to create medical record at this time',
        ms: 'Tidak dapat mewujudkan rekod perubatan pada masa ini',
        zh: '目前无法创建医疗记录',
        ta: 'இந்த நேரத்தில் மருத்துவ பதிவு உருவாக்க முடியவில்லை'
      }
    });
  }
});

// Helper functions (in production, these would be separate service modules)
async function getMedicalRecords(filters: any): Promise<any> {
  // Mock medical records data
  const mockRecords = [
    {
      id: 'record-001',
      patient_id: filters.userId,
      provider_id: 'provider-001',
      provider_name: 'Dr. Ahmad Rahman',
      record_type: 'consultation',
      visit_date: '2024-01-15',
      visit_time: '14:30',
      chief_complaint: 'Regular health checkup',
      primary_diagnosis: 'Hypertension - well controlled',
      treatment_provided: 'Blood pressure medication adjustment',
      follow_up_required: true,
      follow_up_date: '2024-04-15',
      medications_prescribed: ['Amlodipine 5mg', 'Metformin 500mg'],
      cultural_factors: {
        dietary_advice_given: true,
        prayer_time_medication_discussed: true,
        family_consultation: false
      },
      language_used: 'ms',
      religious_considerations: {
        halal_medication_confirmed: true,
        fasting_considerations_discussed: false
      },
      family_involvement: false
    }
  ];

  return {
    records: mockRecords,
    total: mockRecords.length,
    summary: {
      consultations: mockRecords.filter(r => r.record_type === 'consultation').length,
      recent_diagnoses: ['Hypertension', 'Pre-diabetes'],
      active_treatments: 2,
      last_visit: '2024-01-15'
    }
  };
}

async function getMedicalRecordById(recordId: string, userId: string, options: any): Promise<any> {
  // Mock detailed medical record
  return {
    id: recordId,
    patient_id: userId,
    provider_id: 'provider-001',
    provider_name: 'Dr. Ahmad Rahman',
    healthcare_facility: 'Klinik Kesihatan Cheras',
    record_type: 'consultation',
    visit_date: '2024-01-15',
    visit_time: '14:30',
    chief_complaint: 'Regular health checkup and blood pressure review',
    history_of_present_illness: 'Patient reports feeling well overall. No significant complaints.',
    physical_examination: 'BP: 135/85 mmHg, Pulse: 78 bpm, Weight: 70kg, Height: 165cm',
    clinical_assessment: 'Hypertension - well controlled on current medication',
    detailed_diagnosis: 'Essential Hypertension (ICD-10: I10)',
    treatment_plan: 'Continue current antihypertensive therapy. Dietary modifications advised.',
    medication_instructions: 'Continue Amlodipine 5mg once daily, preferably in the morning after Subuh prayer',
    lifestyle_recommendations: 'Reduce sodium intake, maintain halal diet, regular exercise',
    follow_up_schedule: 'Return in 3 months for blood pressure monitoring',
    primary_physician: 'Dr. Ahmad Rahman (MMC: 12345)',
    specialist_consultations: [],
    emergency_contact_notified: false,
    family_sharing_allowed: true,
    dietary_recommendations: ['low_sodium', 'maintain_halal_diet', 'limit_processed_foods'],
    cultural_factors: {
      dietary_advice_culturally_appropriate: true,
      prayer_time_medication_timing: 'morning_after_subuh',
      family_education_provided: false,
      traditional_medicine_discussed: false
    }
  };
}

async function validateProviderPatientRelationship(providerId: string, patientId: string): Promise<boolean> {
  // Mock validation - in production would check database
  return true;
}

async function applyMalaysianHealthcareStandards(recordData: any): Promise<any> {
  // Apply Malaysian MOH standards and cultural enhancements
  return {
    ...recordData,
    moh_compliance: {
      record_format: 'moh_standard',
      icd10_coding: 'applied',
      cultural_factors_documented: true
    },
    malaysian_enhancements: {
      cultural_sensitivity_applied: true,
      language_support: 'multilingual',
      halal_considerations: 'documented',
      prayer_time_awareness: 'integrated'
    }
  };
}

async function createMedicalRecord(recordData: any): Promise<any> {
  // Mock record creation
  return {
    ...recordData,
    confirmation_number: `MR-${Date.now()}`,
    pdpa_consent_verified: true,
    audit_trail_created: true
  };
}

async function logMedicalRecordCreation(record: any, providerId: string): Promise<void> {
  // Mock PDPA audit logging
  console.log(`[PDPA-AUDIT] Medical record created: ${record.id} by provider: ${providerId}`);
}

function getMedicalRecordCulturalContext(record: any): any {
  return {
    cultural_sensitivity_score: 4.8,
    language_accessibility: record.language_used || 'ms',
    religious_accommodation: record.religious_considerations || {},
    family_involvement_level: record.family_involvement ? 'high' : 'individual',
    dietary_cultural_alignment: 'halal_compliant',
    traditional_medicine_integration: 'consultation_available'
  };
}

function getTranslatedMedicalTerms(record: any, targetLanguage: string): any {
  const translations: Record<string, Record<string, string>> = {
    'ms': {
      'hypertension': 'tekanan darah tinggi',
      'consultation': 'perundingan',
      'follow_up': 'susulan',
      'medication': 'ubat'
    },
    'zh': {
      'hypertension': '高血压',
      'consultation': '咨询',
      'follow_up': '随访',
      'medication': '药物'
    },
    'ta': {
      'hypertension': 'உயர் இரத்த அழுத்தம்',
      'consultation': 'ஆலோசனை',
      'follow_up': 'பின்தொடர்தல்',
      'medication': 'மருந்து'
    }
  };

  return translations[targetLanguage] || {};
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export default router;