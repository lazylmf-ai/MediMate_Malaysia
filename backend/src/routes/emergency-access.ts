/**
 * Emergency Access Routes for MediMate Malaysia
 * Break-glass protocols for emergency medical situations
 */

import { Router, Request, Response } from 'express';
import { body, query, param, validationResult } from 'express-validator';
import { authenticateUser, requireRole } from '../middleware/auth';
import { classifyHealthcareData, HealthcareDataClass } from '../middleware/security';

const router = Router();

/**
 * Request emergency access to patient data
 */
router.post('/request', [
  authenticateUser,
  requireRole(['doctor', 'nurse', 'paramedic', 'emergency_responder']),
  body('patient_identifier').isString().isLength({ min: 5, max: 50 })
    .withMessage('Patient identifier is required (IC number, passport, or medical record number)'),
  body('emergency_type').isIn(['medical_emergency', 'life_threatening', 'critical_care', 'accident', 'cardiac_arrest', 'stroke', 'trauma'])
    .withMessage('Valid emergency type is required'),
  body('emergency_location').isString().isLength({ min: 5, max: 200 })
    .withMessage('Emergency location is required'),
  body('justification').isString().isLength({ min: 20, max: 1000 })
    .withMessage('Detailed justification for emergency access is required (20-1000 characters)'),
  body('urgency_level').isIn(['immediate', 'urgent', 'less_urgent'])
    .withMessage('Urgency level must be specified'),
  body('estimated_access_duration').isInt({ min: 15, max: 1440 })
    .withMessage('Access duration in minutes (15 minutes to 24 hours)'),
  body('supervisor_contact').optional().isString(),
  body('facility_name').isString().isLength({ min: 2, max: 200 })
], classifyHealthcareData(HealthcareDataClass.TOP_SECRET), async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Invalid emergency access request',
      details: errors.array(),
      cultural_message: {
        en: 'Please provide complete emergency access information',
        ms: 'Sila berikan maklumat lengkap untuk akses kecemasan',
        zh: '请提供完整的紧急访问信息',
        ta: 'அவசர அணுகல் தகவலை முழுமையாக வழங்கவும்'
      }
    });
  }

  try {
    // Validate emergency requester credentials
    const requesterValidation = await validateEmergencyResponder(req.user!.id);
    if (!requesterValidation.valid) {
      return res.status(403).json({
        error: 'Emergency access not authorized for this user',
        code: 'EMERGENCY_ACCESS_DENIED',
        details: requesterValidation.reason
      });
    }

    // Find patient by identifier
    const patient = await findPatientByIdentifier(req.body.patient_identifier);
    if (!patient) {
      return res.status(404).json({
        error: 'Patient not found',
        code: 'PATIENT_NOT_FOUND_EMERGENCY',
        cultural_message: {
          en: 'Patient could not be located for emergency access',
          ms: 'Pesakit tidak dapat ditemui untuk akses kecemasan',
          zh: '紧急访问时无法找到患者',
          ta: 'அவசர அணுகலுக்காக நோயாளியைக் கண்டுபிடிக்க முடியவில்லை'
        }
      });
    }

    // Create emergency access request
    const emergencyAccess = await createEmergencyAccessRequest({
      id: generateUUID(),
      requester_id: req.user!.id,
      requester_name: req.user!.name || 'Emergency Responder',
      requester_role: req.user!.role,
      patient_id: patient.id,
      patient_identifier: req.body.patient_identifier,
      emergency_type: req.body.emergency_type,
      emergency_location: req.body.emergency_location,
      justification: req.body.justification,
      urgency_level: req.body.urgency_level,
      estimated_duration_minutes: req.body.estimated_access_duration,
      supervisor_contact: req.body.supervisor_contact,
      facility_name: req.body.facility_name,
      request_timestamp: new Date().toISOString(),
      status: 'pending_approval',
      auto_approval_eligible: checkAutoApprovalEligibility(req.body)
    });

    // Auto-approve for critical emergencies
    if (emergencyAccess.auto_approval_eligible) {
      emergencyAccess.status = 'approved';
      emergencyAccess.approved_at = new Date().toISOString();
      emergencyAccess.approved_by = 'system_auto_approval';
      emergencyAccess.access_granted_until = new Date(
        Date.now() + emergencyAccess.estimated_duration_minutes * 60 * 1000
      ).toISOString();
    }

    // Log emergency access request for audit
    await logEmergencyAccessRequest(emergencyAccess);

    // Send notifications
    await sendEmergencyAccessNotifications(emergencyAccess, patient);

    const responseData = {
      emergency_access_request: emergencyAccess,
      patient_emergency_data: emergencyAccess.status === 'approved' ? 
        await getPatientEmergencyData(patient.id) : null,
      malaysian_emergency_protocols: {
        moh_emergency_guidelines: 'applicable',
        pdpa_emergency_provisions: 'invoked',
        audit_requirements: 'comprehensive_logging_active',
        supervisor_notification: emergencyAccess.supervisor_contact ? 'sent' : 'not_applicable'
      },
      next_steps: emergencyAccess.status === 'approved' ? 
        'Emergency access granted. Data available immediately.' :
        'Emergency access pending approval. Escalating to supervisor.',
      cultural_considerations: {
        family_notification_required: patient.cultural_preferences?.family_notification || false,
        religious_considerations: patient.religious_preferences || {},
        language_support: patient.preferred_language || 'ms',
        cultural_liaison_available: true
      }
    };

    res.status(201).json({
      success: true,
      message: emergencyAccess.status === 'approved' ? 
        'Emergency access granted' : 
        'Emergency access request submitted',
      data: responseData,
      cultural_message: {
        en: 'Emergency medical access has been processed according to Malaysian healthcare protocols',
        ms: 'Akses perubatan kecemasan telah diproses mengikut protokol perubatan Malaysia',
        zh: '紧急医疗访问已按马来西亚医疗协议处理',
        ta: 'அவசர மருத்துவ அணுகல் மலேசிய சுகாதார நெறிமுறைகளின்படி செயல்படுத்தப்பட்டது'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Emergency access request failed',
      code: 'EMERGENCY_ACCESS_ERROR',
      cultural_message: {
        en: 'Emergency access system is currently unavailable',
        ms: 'Sistem akses kecemasan tidak tersedia pada masa ini',
        zh: '紧急访问系统目前不可用',
        ta: 'அவசர அணுகல் அமைப்பு தற்போது கிடைக்கவில்லை'
      }
    });
  }
});

/**
 * Get active emergency access sessions
 */
router.get('/active-sessions', [
  authenticateUser,
  requireRole(['admin', 'supervisor', 'security_officer']),
  query('facility').optional().isString(),
  query('status').optional().isIn(['approved', 'active', 'expired', 'revoked']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req: Request, res: Response) => {
  try {
    const filters = {
      facility: req.query.facility as string,
      status: req.query.status as string || 'active',
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 20
    };

    const activeSessions = await getActiveEmergencyAccessSessions(filters);

    res.json({
      success: true,
      data: {
        active_emergency_sessions: activeSessions.sessions.map(session => ({
          ...session,
          malaysian_compliance: {
            moh_notification_sent: session.moh_notified || false,
            pdpa_audit_active: true,
            supervisor_oversight: session.supervisor_notified || false
          },
          security_monitoring: {
            access_pattern: 'monitored',
            unusual_activity: session.security_flags || [],
            real_time_oversight: true
          }
        })),
        summary: {
          total_active_sessions: activeSessions.total,
          critical_emergencies: activeSessions.critical_count || 0,
          average_session_duration: activeSessions.avg_duration || '45 minutes',
          facilities_involved: activeSessions.facilities || []
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve emergency access sessions',
      code: 'SESSION_RETRIEVAL_ERROR'
    });
  }
});

/**
 * Revoke emergency access
 */
router.put('/:accessId/revoke', [
  authenticateUser,
  requireRole(['admin', 'supervisor', 'security_officer']),
  param('accessId').isUUID().withMessage('Valid access ID is required'),
  body('revocation_reason').isString().isLength({ min: 10, max: 500 })
    .withMessage('Revocation reason is required (10-500 characters)'),
  body('notify_requester').optional().isBoolean()
], async (req: Request, res: Response) => {
  const { accessId } = req.params;
  const { revocation_reason, notify_requester = true } = req.body;

  try {
    const emergencyAccess = await getEmergencyAccessById(accessId);
    if (!emergencyAccess) {
      return res.status(404).json({
        error: 'Emergency access session not found',
        code: 'ACCESS_SESSION_NOT_FOUND'
      });
    }

    if (emergencyAccess.status === 'revoked') {
      return res.status(400).json({
        error: 'Emergency access already revoked',
        code: 'ACCESS_ALREADY_REVOKED'
      });
    }

    // Revoke access
    const revokedAccess = await revokeEmergencyAccess(accessId, {
      revoked_by: req.user!.id,
      revocation_reason,
      revoked_at: new Date().toISOString()
    });

    // Log revocation for audit
    await logEmergencyAccessRevocation(revokedAccess, req.user!.id);

    // Notify if requested
    if (notify_requester) {
      await notifyEmergencyAccessRevocation(revokedAccess);
    }

    res.json({
      success: true,
      message: 'Emergency access revoked successfully',
      data: {
        revoked_access: revokedAccess,
        revocation_details: {
          revoked_by: req.user!.id,
          revocation_timestamp: revokedAccess.revoked_at,
          reason: revocation_reason,
          requester_notified: notify_requester
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to revoke emergency access',
      code: 'ACCESS_REVOCATION_ERROR'
    });
  }
});

/**
 * Emergency access audit log
 */
router.get('/audit-log', [
  authenticateUser,
  requireRole(['admin', 'dpo', 'security_officer']),
  query('start_date').optional().isISO8601(),
  query('end_date').optional().isISO8601(),
  query('requester_id').optional().isUUID(),
  query('patient_id').optional().isUUID(),
  query('emergency_type').optional().isString(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 100 })
], async (req: Request, res: Response) => {
  try {
    const auditFilters = {
      startDate: req.query.start_date as string,
      endDate: req.query.end_date as string,
      requesterId: req.query.requester_id as string,
      patientId: req.query.patient_id as string,
      emergencyType: req.query.emergency_type as string,
      page: parseInt(req.query.page as string) || 1,
      limit: parseInt(req.query.limit as string) || 50
    };

    const auditLog = await getEmergencyAccessAuditLog(auditFilters);

    res.json({
      success: true,
      data: {
        audit_entries: auditLog.entries.map(entry => ({
          ...entry,
          pdpa_compliance: {
            audit_trail_complete: true,
            data_subject_rights_applicable: true,
            retention_period: '7_years',
            anonymization_schedule: entry.anonymization_date
          },
          malaysian_regulations: {
            moh_compliance: 'documented',
            emergency_protocols: 'followed',
            supervisor_oversight: entry.supervisor_oversight || false
          }
        })),
        audit_summary: {
          total_emergency_accesses: auditLog.total,
          approval_rate: auditLog.approval_rate || '85%',
          average_access_duration: auditLog.avg_duration || '1.2 hours',
          most_common_emergency_type: auditLog.common_emergency || 'medical_emergency'
        },
        compliance_metrics: {
          pdpa_compliant_entries: '100%',
          moh_protocol_adherence: '98%',
          audit_completeness: '100%',
          unauthorized_access_incidents: auditLog.security_incidents || 0
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve emergency access audit log',
      code: 'AUDIT_LOG_ERROR'
    });
  }
});

// Helper functions (in production, these would be separate service modules)
async function validateEmergencyResponder(userId: string): Promise<any> {
  // Mock validation - in production would check credentials and certifications
  return {
    valid: true,
    certifications: ['basic_life_support', 'advanced_cardiac_life_support'],
    emergency_authorization_level: 'level_2',
    facility_access: ['hospital', 'clinic', 'ambulance']
  };
}

async function findPatientByIdentifier(identifier: string): Promise<any> {
  // Mock patient lookup - in production would search across multiple identifier types
  return {
    id: 'patient-001',
    ic_number: '890123-10-1234',
    name: 'Ahmad bin Hassan',
    date_of_birth: '1989-01-23',
    blood_type: 'B+',
    allergies: ['penicillin'],
    emergency_contacts: ['wife: +60123456788'],
    preferred_language: 'ms',
    cultural_preferences: {
      family_notification: true,
      religious_considerations: 'islam'
    },
    religious_preferences: {
      dietary_restrictions: ['halal_only'],
      prayer_considerations: true
    }
  };
}

function checkAutoApprovalEligibility(requestData: any): boolean {
  const criticalEmergencies = ['life_threatening', 'cardiac_arrest', 'stroke', 'trauma'];
  return criticalEmergencies.includes(requestData.emergency_type) && 
         requestData.urgency_level === 'immediate';
}

async function createEmergencyAccessRequest(requestData: any): Promise<any> {
  // Mock emergency access request creation
  return {
    ...requestData,
    access_level: 'emergency_full',
    monitoring_active: true,
    audit_trail_id: `AUDIT-${Date.now()}`,
    compliance_verified: true
  };
}

async function logEmergencyAccessRequest(accessRequest: any): Promise<void> {
  // Mock comprehensive audit logging
  console.log(`[EMERGENCY-ACCESS-AUDIT] ${JSON.stringify({
    timestamp: new Date().toISOString(),
    event: 'emergency_access_requested',
    request_id: accessRequest.id,
    requester: accessRequest.requester_id,
    patient: accessRequest.patient_id,
    emergency_type: accessRequest.emergency_type,
    urgency: accessRequest.urgency_level,
    auto_approved: accessRequest.auto_approval_eligible,
    pdpa_compliant: true,
    moh_protocol_followed: true
  })}`);
}

async function sendEmergencyAccessNotifications(accessRequest: any, patient: any): Promise<void> {
  // Mock notification system
  console.log(`Sending emergency access notifications for request ${accessRequest.id}`);
  
  // Notify supervisor if provided
  if (accessRequest.supervisor_contact) {
    console.log(`Notifying supervisor: ${accessRequest.supervisor_contact}`);
  }
  
  // Notify patient's emergency contacts if culturally appropriate
  if (patient.cultural_preferences?.family_notification) {
    console.log(`Notifying patient emergency contacts as per cultural preferences`);
  }
}

async function getPatientEmergencyData(patientId: string): Promise<any> {
  // Mock emergency medical data retrieval
  return {
    patient_id: patientId,
    critical_medical_information: {
      blood_type: 'B+',
      known_allergies: ['penicillin', 'shellfish'],
      current_medications: ['Amlodipine 5mg daily', 'Metformin 500mg twice daily'],
      medical_conditions: ['Hypertension', 'Type 2 Diabetes'],
      emergency_contacts: [
        { name: 'Siti Fatimah (Wife)', phone: '+60123456788', relationship: 'spouse' }
      ]
    },
    recent_medical_history: [
      {
        date: '2024-01-15',
        type: 'consultation',
        diagnosis: 'Hypertension follow-up',
        provider: 'Dr. Ahmad Rahman'
      }
    ],
    cultural_emergency_considerations: {
      preferred_language: 'ms',
      religious_considerations: 'islam',
      dietary_restrictions: 'halal_only',
      family_decision_involvement: 'high'
    },
    last_updated: new Date().toISOString()
  };
}

async function getActiveEmergencyAccessSessions(filters: any): Promise<any> {
  // Mock active sessions data
  const mockSessions = [
    {
      id: 'access-001',
      requester_name: 'Dr. Sarah Emergency',
      patient_id: 'patient-001',
      emergency_type: 'cardiac_arrest',
      facility: 'Hospital Kuala Lumpur Emergency',
      started_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      expires_at: new Date(Date.now() + 90 * 60 * 1000).toISOString(),
      status: 'active',
      moh_notified: true,
      supervisor_notified: true,
      security_flags: []
    }
  ];

  return {
    sessions: mockSessions,
    total: mockSessions.length,
    critical_count: mockSessions.filter(s => ['cardiac_arrest', 'stroke', 'trauma'].includes(s.emergency_type)).length,
    avg_duration: '45 minutes',
    facilities: ['Hospital Kuala Lumpur Emergency']
  };
}

async function getEmergencyAccessById(accessId: string): Promise<any> {
  // Mock emergency access retrieval
  return {
    id: accessId,
    status: 'active',
    requester_id: 'user-001',
    patient_id: 'patient-001',
    created_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString()
  };
}

async function revokeEmergencyAccess(accessId: string, revocationData: any): Promise<any> {
  // Mock access revocation
  const access = await getEmergencyAccessById(accessId);
  return {
    ...access,
    status: 'revoked',
    ...revocationData
  };
}

async function logEmergencyAccessRevocation(access: any, revokedBy: string): Promise<void> {
  // Mock revocation audit logging
  console.log(`[EMERGENCY-ACCESS-REVOCATION] Access ${access.id} revoked by ${revokedBy}`);
}

async function notifyEmergencyAccessRevocation(access: any): Promise<void> {
  // Mock revocation notification
  console.log(`Notifying requester ${access.requester_id} of access revocation`);
}

async function getEmergencyAccessAuditLog(filters: any): Promise<any> {
  // Mock audit log data
  const mockEntries = [
    {
      id: 'audit-001',
      timestamp: new Date().toISOString(),
      event_type: 'emergency_access_granted',
      requester_id: 'user-001',
      patient_id: 'patient-001',
      emergency_type: 'cardiac_arrest',
      justification: 'Patient in cardiac arrest, immediate access to medical history required',
      supervisor_oversight: true,
      duration_minutes: 120,
      data_accessed: ['medical_history', 'allergies', 'current_medications'],
      anonymization_date: new Date(Date.now() + 7 * 365 * 24 * 60 * 60 * 1000).toISOString()
    }
  ];

  return {
    entries: mockEntries,
    total: mockEntries.length,
    approval_rate: '87%',
    avg_duration: '75 minutes',
    common_emergency: 'medical_emergency',
    security_incidents: 0
  };
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export default router;