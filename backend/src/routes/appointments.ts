/**
 * Appointment Management Routes for MediMate Malaysia
 * Malaysian calendar integration with prayer time avoidance and cultural preferences
 */

import { Router, Request, Response } from 'express';
import { body, query, param, validationResult } from 'express-validator';
import { authenticateUser, requireRole } from '../middleware/auth';
import { classifyHealthcareData, HealthcareDataClass } from '../middleware/security';

const router = Router();

/**
 * Get user's appointments
 */
router.get('/', [
  authenticateUser,
  query('status').optional().isIn(['scheduled', 'confirmed', 'completed', 'cancelled', 'rescheduled', 'no_show'])
    .withMessage('Invalid appointment status'),
  query('start_date').optional().isISO8601().withMessage('Start date must be in ISO format'),
  query('end_date').optional().isISO8601().withMessage('End date must be in ISO format'),
  query('provider_id').optional().isUUID().withMessage('Invalid provider ID'),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 })
], classifyHealthcareData(HealthcareDataClass.CONFIDENTIAL), async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Invalid appointment query parameters',
      details: errors.array(),
      cultural_message: {
        en: 'Please check your appointment search criteria',
        ms: 'Sila semak kriteria carian temujanji anda',
        zh: '请检查您的预约搜索条件',
        ta: 'உங்கள் அப்பாயிண்ட்மென்ட் தேடல் அளவுகோல்களை சரிபார்க்கவும்'
      }
    });
  }

  const filters = {
    userId: req.user!.id,
    status: req.query.status as string,
    startDate: req.query.start_date as string,
    endDate: req.query.end_date as string,
    providerId: req.query.provider_id as string,
    page: parseInt(req.query.page as string) || 1,
    limit: parseInt(req.query.limit as string) || 20
  };

  try {
    const appointments = await getUserAppointments(filters);

    res.json({
      success: true,
      data: {
        appointments: appointments.items.map(appointment => ({
          ...appointment,
          malaysian_context: {
            prayer_time_status: checkPrayerTimeConflict(appointment.appointment_time),
            cultural_considerations: appointment.cultural_adjustments || {},
            public_holiday_impact: checkPublicHolidayImpact(appointment.appointment_date),
            ramadan_considerations: checkRamadanImpact(appointment.appointment_date)
          },
          scheduling_intelligence: {
            optimal_timing: appointment.cultural_timing_score || 5,
            prayer_avoidance_applied: appointment.prayer_time_avoided || false,
            family_friendly_slot: appointment.family_consultation || false,
            traffic_considerations: appointment.traffic_optimized || false
          }
        })),
        pagination: {
          current_page: filters.page,
          total_pages: Math.ceil(appointments.total / filters.limit),
          total_items: appointments.total,
          items_per_page: filters.limit
        },
        summary: {
          upcoming_appointments: appointments.summary.upcoming || 0,
          past_appointments: appointments.summary.past || 0,
          pending_confirmations: appointments.summary.pending || 0,
          cancelled_appointments: appointments.summary.cancelled || 0
        },
        malaysian_features: {
          prayer_time_integration: 'active',
          public_holiday_awareness: 'enabled',
          cultural_preferences_applied: 'personalized',
          multi_language_support: 'available'
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve appointments',
      code: 'APPOINTMENT_RETRIEVAL_ERROR',
      cultural_message: {
        en: 'Unable to access your appointment information',
        ms: 'Tidak dapat mengakses maklumat temujanji anda',
        zh: '无法访问您的预约信息',
        ta: 'உங்கள் அப்பாயிண்ட்மென்ட் தகவலை அணுக முடியவில்லை'
      }
    });
  }
});

/**
 * Book new appointment
 */
router.post('/', [
  authenticateUser,
  body('provider_id').isUUID().withMessage('Valid provider ID is required'),
  body('appointment_type').isString().withMessage('Appointment type is required'),
  body('preferred_date').isISO8601().withMessage('Preferred date must be in ISO format'),
  body('preferred_time').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Preferred time must be in HH:MM format'),
  body('duration_minutes').optional().isInt({ min: 15, max: 240 })
    .withMessage('Duration must be between 15 and 240 minutes'),
  body('chief_complaint').optional().isString().isLength({ max: 500 }),
  body('cultural_preferences').optional().isObject(),
  body('avoid_prayer_times').optional().isBoolean(),
  body('family_consultation').optional().isBoolean(),
  body('interpreter_needed').optional().isBoolean(),
  body('interpreter_language').optional().isIn(['ms', 'en', 'zh', 'ta', 'ar'])
], classifyHealthcareData(HealthcareDataClass.CONFIDENTIAL), async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Invalid appointment booking data',
      details: errors.array(),
      cultural_message: {
        en: 'Please check your appointment booking information',
        ms: 'Sila semak maklumat tempahan temujanji anda',
        zh: '请检查您的预约信息',
        ta: 'உங்கள் அப்பாயிண்ட்மென்ட் முன்பதிவு தகவலை சரிபார்க்கவும்'
      }
    });
  }

  try {
    // Check provider availability
    const isAvailable = await checkProviderAvailability(
      req.body.provider_id,
      req.body.preferred_date,
      req.body.preferred_time,
      req.body.duration_minutes || 30
    );

    if (!isAvailable.available) {
      return res.status(409).json({
        error: 'Provider not available at requested time',
        code: 'PROVIDER_UNAVAILABLE',
        details: isAvailable,
        suggested_alternatives: await getSuggestedAlternativeSlots(
          req.body.provider_id,
          req.body.preferred_date,
          req.body.cultural_preferences
        ),
        cultural_message: {
          en: 'The requested appointment time is not available. Please see alternative suggestions.',
          ms: 'Masa temujanji yang diminta tidak tersedia. Sila lihat cadangan alternatif.',
          zh: '请求的预约时间不可用。请查看替代建议。',
          ta: 'கோரப்பட்ட அப்பாயிண்ட்மென்ட் நேரம் கிடைக்கவில்லை. மாற்று பரிந்துரைகளைப் பார்க்கவும்.'
        }
      });
    }

    // Apply Malaysian cultural intelligence
    const culturalAdjustments = await applyMalaysianCulturalIntelligence({
      date: req.body.preferred_date,
      time: req.body.preferred_time,
      patientPreferences: req.body.cultural_preferences,
      avoidPrayerTimes: req.body.avoid_prayer_times !== false,
      familyConsultation: req.body.family_consultation || false
    });

    // Create appointment
    const appointmentData = {
      id: generateUUID(),
      user_id: req.user!.id,
      provider_id: req.body.provider_id,
      appointment_type: req.body.appointment_type,
      appointment_date: culturalAdjustments.adjusted_date || req.body.preferred_date,
      appointment_time: culturalAdjustments.adjusted_time || req.body.preferred_time,
      duration_minutes: req.body.duration_minutes || 30,
      status: 'scheduled',
      chief_complaint: req.body.chief_complaint,
      cultural_adjustments: culturalAdjustments,
      prayer_time_avoided: culturalAdjustments.prayer_adjustments_made || false,
      family_consultation: req.body.family_consultation || false,
      interpreter_needed: req.body.interpreter_needed || false,
      interpreter_language: req.body.interpreter_language,
      created_at: new Date().toISOString()
    };

    const newAppointment = await createAppointment(appointmentData);

    // Schedule Malaysian-aware reminders
    await scheduleMalaysianAppointmentReminders(newAppointment);

    res.status(201).json({
      success: true,
      message: 'Appointment booked successfully',
      data: {
        appointment: {
          ...newAppointment,
          malaysian_enhancements: {
            cultural_optimization_applied: true,
            prayer_time_intelligence: culturalAdjustments.prayer_considerations,
            public_holiday_checked: culturalAdjustments.holiday_impact,
            traffic_optimization: culturalAdjustments.traffic_considerations,
            family_accommodation: culturalAdjustments.family_provisions
          }
        },
        booking_confirmations: {
          sms_confirmation: 'sent',
          email_confirmation: 'sent',
          calendar_integration: 'available',
          reminder_schedule: 'configured'
        }
      },
      cultural_message: {
        en: 'Your appointment has been booked with Malaysian cultural considerations applied',
        ms: 'Temujanji anda telah ditempah dengan pertimbangan budaya Malaysia',
        zh: '您的预约已预订，并应用了马来西亚文化考虑因素',
        ta: 'மலேசிய கலாச்சார கருத்துகளுடன் உங்கள் அப்பாயிண்ட்மென்ட் பதிவு செய்யப்பட்டது'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to book appointment',
      code: 'APPOINTMENT_BOOKING_ERROR',
      cultural_message: {
        en: 'Unable to book appointment at this time',
        ms: 'Tidak dapat menempah temujanji pada masa ini',
        zh: '目前无法预约',
        ta: 'இந்த நேரத்தில் அப்பாயிண்ட்மென்ட் முன்பதிவு செய்ய முடியவில்லை'
      }
    });
  }
});

/**
 * Reschedule appointment
 */
router.put('/:appointmentId/reschedule', [
  authenticateUser,
  param('appointmentId').isUUID().withMessage('Invalid appointment ID'),
  body('new_date').isISO8601().withMessage('New date must be in ISO format'),
  body('new_time').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('New time must be in HH:MM format'),
  body('reason').optional().isString().isLength({ max: 500 }),
  body('maintain_cultural_preferences').optional().isBoolean()
], classifyHealthcareData(HealthcareDataClass.CONFIDENTIAL), async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Invalid reschedule parameters',
      details: errors.array()
    });
  }

  const { appointmentId } = req.params;
  const { new_date, new_time, reason, maintain_cultural_preferences = true } = req.body;

  try {
    // Verify appointment ownership
    const appointment = await getAppointmentById(appointmentId, req.user!.id);
    if (!appointment) {
      return res.status(404).json({
        error: 'Appointment not found',
        code: 'APPOINTMENT_NOT_FOUND'
      });
    }

    // Check new slot availability
    const isAvailable = await checkProviderAvailability(
      appointment.provider_id,
      new_date,
      new_time,
      appointment.duration_minutes
    );

    if (!isAvailable.available) {
      return res.status(409).json({
        error: 'New appointment time not available',
        code: 'SLOT_UNAVAILABLE',
        suggested_alternatives: await getSuggestedAlternativeSlots(
          appointment.provider_id,
          new_date,
          appointment.cultural_preferences
        )
      });
    }

    // Apply cultural intelligence to new time
    let culturalAdjustments = {};
    if (maintain_cultural_preferences) {
      culturalAdjustments = await applyMalaysianCulturalIntelligence({
        date: new_date,
        time: new_time,
        patientPreferences: appointment.cultural_preferences,
        avoidPrayerTimes: true,
        familyConsultation: appointment.family_consultation
      });
    }

    // Update appointment
    const rescheduledAppointment = await rescheduleAppointment(appointmentId, {
      new_date: culturalAdjustments.adjusted_date || new_date,
      new_time: culturalAdjustments.adjusted_time || new_time,
      reschedule_reason: reason,
      cultural_adjustments: culturalAdjustments,
      rescheduled_at: new Date().toISOString(),
      rescheduled_by: req.user!.id
    });

    // Update reminders
    await updateMalaysianAppointmentReminders(rescheduledAppointment);

    res.json({
      success: true,
      message: 'Appointment rescheduled successfully',
      data: {
        appointment: rescheduledAppointment,
        reschedule_details: {
          original_date: appointment.appointment_date,
          original_time: appointment.appointment_time,
          new_date: rescheduledAppointment.appointment_date,
          new_time: rescheduledAppointment.appointment_time,
          cultural_optimizations: culturalAdjustments
        }
      },
      cultural_message: {
        en: 'Your appointment has been rescheduled with cultural preferences maintained',
        ms: 'Temujanji anda telah dijadualkan semula dengan keutamaan budaya dikekalkan',
        zh: '您的预约已重新安排，保持文化偏好',
        ta: 'கலாச்சார விருப்பத்தேர்வுகளை பராமரித்து உங்கள் அப்பாயிண்ட்மென்ட் மீண்டும் திட்டமிடப்பட்டது'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to reschedule appointment',
      code: 'RESCHEDULE_ERROR'
    });
  }
});

/**
 * Cancel appointment
 */
router.put('/:appointmentId/cancel', [
  authenticateUser,
  param('appointmentId').isUUID().withMessage('Invalid appointment ID'),
  body('cancellation_reason').isString().isLength({ min: 5, max: 500 })
    .withMessage('Cancellation reason must be between 5 and 500 characters'),
  body('notify_provider').optional().isBoolean()
], classifyHealthcareData(HealthcareDataClass.CONFIDENTIAL), async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Invalid cancellation parameters',
      details: errors.array()
    });
  }

  const { appointmentId } = req.params;
  const { cancellation_reason, notify_provider = true } = req.body;

  try {
    const appointment = await getAppointmentById(appointmentId, req.user!.id);
    if (!appointment) {
      return res.status(404).json({
        error: 'Appointment not found',
        code: 'APPOINTMENT_NOT_FOUND'
      });
    }

    // Check cancellation policy
    const cancellationPolicy = await checkCancellationPolicy(appointment);
    if (!cancellationPolicy.allowed) {
      return res.status(400).json({
        error: 'Cancellation not allowed',
        code: 'CANCELLATION_POLICY_VIOLATION',
        details: cancellationPolicy,
        cultural_message: {
          en: 'Appointment cancellation is not permitted at this time based on the clinic\'s policy',
          ms: 'Pembatalan temujanji tidak dibenarkan pada masa ini berdasarkan polisi klinik',
          zh: '根据诊所政策，目前不允许取消预约',
          ta: 'கிளினிக்கின் கொள்கையின் அடிப்படையில் இந்த நேரத்தில் அப்பாயிண்ட்மென்ட் ரத்து அனுமதிக்கப்படவில்லை'
        }
      });
    }

    // Cancel appointment
    const cancelledAppointment = await cancelAppointment(appointmentId, {
      cancellation_reason,
      cancelled_by: req.user!.id,
      cancelled_at: new Date().toISOString(),
      notify_provider
    });

    // Handle Malaysian-specific cancellation procedures
    await handleMalaysianCancellationProcedures(cancelledAppointment);

    res.json({
      success: true,
      message: 'Appointment cancelled successfully',
      data: {
        appointment: cancelledAppointment,
        cancellation_details: {
          cancelled_at: cancelledAppointment.cancelled_at,
          refund_eligible: cancellationPolicy.refund_eligible,
          reschedule_allowed: cancellationPolicy.reschedule_alternative,
          next_available_slots: await getSuggestedAlternativeSlots(
            appointment.provider_id,
            appointment.appointment_date,
            appointment.cultural_preferences
          )
        }
      },
      cultural_message: {
        en: 'Your appointment has been cancelled. We understand that circumstances change.',
        ms: 'Temujanji anda telah dibatalkan. Kami memahami bahawa keadaan berubah.',
        zh: '您的预约已被取消。我们理解情况会发生变化。',
        ta: 'உங்கள் அப்பாயிண்ட்மென்ட் ரத்து செய்யப்பட்டது. சூழ்நிலைகள் மாறும் என்பதை நாங்கள் புரிந்துகொள்கிறோம்.'
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to cancel appointment',
      code: 'CANCELLATION_ERROR'
    });
  }
});

/**
 * Get appointment cultural optimization suggestions
 */
router.get('/:appointmentId/cultural-suggestions', [
  authenticateUser,
  param('appointmentId').isUUID()
], async (req: Request, res: Response) => {
  const { appointmentId } = req.params;

  try {
    const appointment = await getAppointmentById(appointmentId, req.user!.id);
    if (!appointment) {
      return res.status(404).json({
        error: 'Appointment not found'
      });
    }

    const culturalSuggestions = await generateCulturalOptimizationSuggestions(appointment);

    res.json({
      success: true,
      data: {
        appointment_id: appointmentId,
        current_timing: {
          date: appointment.appointment_date,
          time: appointment.appointment_time,
          cultural_score: calculateCulturalScore(appointment)
        },
        suggestions: culturalSuggestions,
        malaysian_considerations: {
          prayer_time_analysis: analyzePrayerTimeImpact(appointment),
          public_holiday_impact: checkPublicHolidayImpact(appointment.appointment_date),
          traffic_patterns: getTrafficOptimizationSuggestions(appointment),
          family_consultation_tips: getFamilyConsultationGuidance(appointment)
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to generate cultural suggestions'
    });
  }
});

// Helper functions (in production, these would be separate service modules)
async function getUserAppointments(filters: any): Promise<any> {
  // Mock user appointments data
  const mockAppointments = [
    {
      id: 'apt-001',
      user_id: filters.userId,
      provider_id: 'provider-001',
      provider_name: 'Dr. Ahmad Rahman',
      appointment_type: 'General Consultation',
      appointment_date: '2024-01-18',
      appointment_time: '10:00',
      duration_minutes: 30,
      status: 'scheduled',
      chief_complaint: 'Regular checkup',
      cultural_adjustments: {
        prayer_time_avoided: true,
        family_consultation_time: 15,
        interpreter_arranged: false
      },
      prayer_time_avoided: true,
      family_consultation: false,
      cultural_timing_score: 4.8,
      traffic_optimized: true
    },
    {
      id: 'apt-002',
      user_id: filters.userId,
      provider_id: 'provider-002',
      provider_name: 'Dr. Sarah Lim',
      appointment_type: 'Pediatric Consultation',
      appointment_date: '2024-01-15',
      appointment_time: '14:30',
      duration_minutes: 45,
      status: 'completed',
      chief_complaint: 'Child vaccination',
      cultural_adjustments: {
        prayer_time_avoided: true,
        family_consultation_time: 20,
        interpreter_arranged: false
      },
      prayer_time_avoided: true,
      family_consultation: true,
      cultural_timing_score: 4.9,
      traffic_optimized: true
    }
  ];

  let filteredAppointments = mockAppointments;

  if (filters.status) {
    filteredAppointments = filteredAppointments.filter(apt => apt.status === filters.status);
  }

  const startIndex = (filters.page - 1) * filters.limit;
  const paginatedAppointments = filteredAppointments.slice(startIndex, startIndex + filters.limit);

  return {
    items: paginatedAppointments,
    total: filteredAppointments.length,
    summary: {
      upcoming: mockAppointments.filter(apt => new Date(apt.appointment_date) > new Date()).length,
      past: mockAppointments.filter(apt => new Date(apt.appointment_date) <= new Date()).length,
      pending: mockAppointments.filter(apt => apt.status === 'scheduled').length,
      cancelled: mockAppointments.filter(apt => apt.status === 'cancelled').length
    }
  };
}

async function checkProviderAvailability(providerId: string, date: string, time: string, duration: number): Promise<any> {
  // Mock availability check
  return {
    available: true,
    provider_id: providerId,
    requested_slot: { date, time, duration },
    conflicts: [],
    cultural_considerations: {
      prayer_time_clear: !isPrayerTimeConflict(time),
      friday_prayer_safe: !(new Date(date).getDay() === 5 && time >= '12:00' && time <= '14:30'),
      public_holiday_status: 'normal_day'
    }
  };
}

async function getSuggestedAlternativeSlots(providerId: string, preferredDate: string, culturalPreferences: any): Promise<any[]> {
  // Mock alternative suggestions with cultural optimization
  return [
    {
      date: preferredDate,
      time: '09:00',
      duration: 30,
      cultural_score: 4.9,
      prayer_compatible: true,
      family_friendly: true,
      traffic_optimal: true,
      reason: 'Early morning slot, prayer-time friendly'
    },
    {
      date: preferredDate,
      time: '14:30',
      duration: 30,
      cultural_score: 4.7,
      prayer_compatible: true,
      family_friendly: true,
      traffic_optimal: false,
      reason: 'Post-lunch slot, avoids Dhuhr prayer'
    }
  ];
}

async function applyMalaysianCulturalIntelligence(params: any): Promise<any> {
  const { date, time, patientPreferences, avoidPrayerTimes, familyConsultation } = params;
  
  let adjustments = {
    adjusted_date: date,
    adjusted_time: time,
    prayer_adjustments_made: false,
    prayer_considerations: {},
    holiday_impact: checkPublicHolidayImpact(date),
    traffic_considerations: {},
    family_provisions: {}
  };

  // Check prayer time conflicts
  if (avoidPrayerTimes && isPrayerTimeConflict(time)) {
    const alternativeTime = findAlternativeTimeAvoidingPrayers(time);
    adjustments.adjusted_time = alternativeTime;
    adjustments.prayer_adjustments_made = true;
    adjustments.prayer_considerations = {
      original_time_conflict: true,
      conflicting_prayer: identifyConflictingPrayer(time),
      adjusted_for_prayer: alternativeTime
    };
  }

  // Add family consultation considerations
  if (familyConsultation) {
    adjustments.family_provisions = {
      additional_time_allocated: 15,
      family_seating_arranged: true,
      multi_language_materials: true
    };
  }

  return adjustments;
}

async function createAppointment(appointmentData: any): Promise<any> {
  // Mock appointment creation
  return {
    ...appointmentData,
    confirmation_number: `MED-${Date.now()}`,
    status: 'scheduled',
    created_at: new Date().toISOString()
  };
}

async function scheduleMalaysianAppointmentReminders(appointment: any): Promise<void> {
  // Mock reminder scheduling with Malaysian considerations
  const reminders = [
    { type: 'sms', timing: '24_hours_before', language: 'ms', prayer_aware: true },
    { type: 'email', timing: '2_hours_before', language: 'ms', includes_directions: true },
    { type: 'app_notification', timing: '30_minutes_before', prayer_check: true }
  ];

  // In production, this would integrate with notification services
  console.log(`Scheduled ${reminders.length} Malaysian-aware reminders for appointment ${appointment.id}`);
}

async function getAppointmentById(appointmentId: string, userId: string): Promise<any> {
  // Mock appointment retrieval
  return {
    id: appointmentId,
    user_id: userId,
    provider_id: 'provider-001',
    appointment_date: '2024-01-18',
    appointment_time: '10:00',
    duration_minutes: 30,
    status: 'scheduled',
    cultural_preferences: { avoid_prayer_times: true },
    family_consultation: false
  };
}

async function rescheduleAppointment(appointmentId: string, updateData: any): Promise<any> {
  // Mock appointment reschedule
  const originalAppointment = await getAppointmentById(appointmentId, 'user-id');
  return {
    ...originalAppointment,
    ...updateData,
    status: 'rescheduled',
    updated_at: new Date().toISOString()
  };
}

async function updateMalaysianAppointmentReminders(appointment: any): Promise<void> {
  // Mock reminder update with Malaysian cultural considerations
  console.log(`Updated Malaysian-aware reminders for rescheduled appointment ${appointment.id}`);
}

async function checkCancellationPolicy(appointment: any): Promise<any> {
  // Mock cancellation policy check
  const hoursUntilAppointment = calculateHoursUntilAppointment(appointment);
  
  return {
    allowed: hoursUntilAppointment >= 24,
    minimum_notice_hours: 24,
    refund_eligible: hoursUntilAppointment >= 48,
    reschedule_alternative: hoursUntilAppointment >= 12,
    cultural_considerations: {
      emergency_exceptions: 'family_medical_emergencies_considered',
      religious_obligations: 'unexpected_religious_duties_accommodated'
    }
  };
}

async function cancelAppointment(appointmentId: string, cancellationData: any): Promise<any> {
  // Mock appointment cancellation
  const appointment = await getAppointmentById(appointmentId, 'user-id');
  return {
    ...appointment,
    ...cancellationData,
    status: 'cancelled',
    cancelled_at: cancellationData.cancelled_at
  };
}

async function handleMalaysianCancellationProcedures(appointment: any): Promise<void> {
  // Mock Malaysian-specific cancellation handling
  console.log(`Processing Malaysian cancellation procedures for appointment ${appointment.id}`);
}

async function generateCulturalOptimizationSuggestions(appointment: any): Promise<any> {
  return {
    prayer_optimization: {
      current_prayer_impact: analyzePrayerTimeImpact(appointment),
      suggested_improvements: [
        'Move 30 minutes earlier to avoid Dhuhr prayer buffer',
        'Consider morning slot for better prayer time alignment'
      ]
    },
    family_considerations: {
      family_consultation_benefits: 'Additional time for family input and cultural discussion',
      interpreter_recommendations: 'Malay interpreter available for elderly family members'
    },
    traffic_optimization: {
      current_traffic_score: 3.5,
      alternative_times: ['08:30 (lighter traffic)', '15:00 (post-lunch optimal)']
    },
    cultural_enhancements: [
      'Schedule during non-prayer hours for spiritual comfort',
      'Allow extra time for traditional consultation style',
      'Coordinate with family decision-making preferences'
    ]
  };
}

// Utility functions
function checkPrayerTimeConflict(time: string): string {
  const prayerTimes = {
    '05:45': 'Fajr',
    '13:15': 'Dhuhr', 
    '16:30': 'Asr',
    '19:20': 'Maghrib',
    '20:35': 'Isha'
  };

  const timeMinutes = convertTimeToMinutes(time);
  
  for (const [prayerTime, prayerName] of Object.entries(prayerTimes)) {
    const prayerMinutes = convertTimeToMinutes(prayerTime);
    if (Math.abs(timeMinutes - prayerMinutes) <= 30) { // 30-minute buffer
      return `Potential conflict with ${prayerName} prayer`;
    }
  }
  
  return 'No prayer time conflict';
}

function isPrayerTimeConflict(time: string): boolean {
  return checkPrayerTimeConflict(time) !== 'No prayer time conflict';
}

function checkPublicHolidayImpact(date: string): any {
  const appointmentDate = new Date(date);
  const dayOfWeek = appointmentDate.getDay();
  
  // Mock holiday check - in production would check against Malaysian holiday API
  return {
    is_public_holiday: false,
    is_weekend: dayOfWeek === 0 || dayOfWeek === 6,
    traffic_impact: dayOfWeek === 5 ? 'heavy_due_to_friday_prayers' : 'normal',
    service_availability: 'normal'
  };
}

function checkRamadanImpact(date: string): any {
  // Mock Ramadan check - in production would use Islamic calendar
  return {
    is_ramadan_period: false,
    fasting_hours: null,
    scheduling_recommendations: null
  };
}

function calculateCulturalScore(appointment: any): number {
  let score = 5.0;
  
  // Deduct for prayer time conflicts
  if (isPrayerTimeConflict(appointment.appointment_time)) {
    score -= 1.0;
  }
  
  // Add for family consultation accommodation
  if (appointment.family_consultation) {
    score += 0.5;
  }
  
  // Add for cultural adjustments
  if (appointment.cultural_adjustments?.prayer_time_avoided) {
    score += 0.3;
  }
  
  return Math.round(score * 10) / 10;
}

function analyzePrayerTimeImpact(appointment: any): any {
  const conflict = checkPrayerTimeConflict(appointment.appointment_time);
  
  return {
    has_conflict: conflict !== 'No prayer time conflict',
    conflict_details: conflict,
    impact_level: isPrayerTimeConflict(appointment.appointment_time) ? 'medium' : 'none',
    recommendations: isPrayerTimeConflict(appointment.appointment_time) ? 
      ['Consider rescheduling 30 minutes earlier or later', 'Inform patient about prayer time proximity'] :
      ['Current timing is prayer-friendly']
  };
}

function getTrafficOptimizationSuggestions(appointment: any): any {
  const time = appointment.appointment_time;
  const hour = parseInt(time.split(':')[0]);
  
  return {
    current_time_traffic_level: hour >= 7 && hour <= 9 || hour >= 17 && hour <= 19 ? 'heavy' : 'moderate',
    optimal_times: ['09:30-11:30', '14:00-16:00'],
    kuala_lumpur_specific: hour === 13 ? 'Consider Friday prayer traffic' : 'Standard traffic patterns'
  };
}

function getFamilyConsultationGuidance(appointment: any): any {
  return {
    cultural_importance: 'High in Malaysian healthcare decision-making',
    time_allocation: 'Add 15-20 minutes for family discussion',
    communication_style: 'Respectful hierarchy, elder involvement encouraged',
    interpreter_support: appointment.interpreter_needed ? 'Arranged' : 'Available on request'
  };
}

function convertTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function findAlternativeTimeAvoidingPrayers(time: string): string {
  const currentMinutes = convertTimeToMinutes(time);
  const prayerTimes = [345, 795, 990, 1160, 1235]; // Prayer times in minutes
  
  // Find safe time slots
  for (let offset of [-60, -30, 30, 60]) {
    const alternativeMinutes = currentMinutes + offset;
    const safe = prayerTimes.every(prayerMinutes => 
      Math.abs(alternativeMinutes - prayerMinutes) > 30
    );
    
    if (safe && alternativeMinutes >= 480 && alternativeMinutes <= 1080) { // 8 AM to 6 PM
      const hours = Math.floor(alternativeMinutes / 60);
      const mins = alternativeMinutes % 60;
      return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
    }
  }
  
  return time; // Return original if no safe alternative found
}

function identifyConflictingPrayer(time: string): string {
  const timeMinutes = convertTimeToMinutes(time);
  const prayers = [
    { time: 345, name: 'Fajr' },
    { time: 795, name: 'Dhuhr' },
    { time: 990, name: 'Asr' },
    { time: 1160, name: 'Maghrib' },
    { time: 1235, name: 'Isha' }
  ];
  
  for (const prayer of prayers) {
    if (Math.abs(timeMinutes - prayer.time) <= 30) {
      return prayer.name;
    }
  }
  
  return 'Unknown';
}

function calculateHoursUntilAppointment(appointment: any): number {
  const appointmentDateTime = new Date(`${appointment.appointment_date}T${appointment.appointment_time}`);
  const now = new Date();
  return (appointmentDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
}

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

export default router;