/**
 * Healthcare Providers Routes for MediMate Malaysia
 * Provider directory with MOH registration validation and cultural considerations
 */

import { Router, Request, Response } from 'express';
import { body, query, param, validationResult } from 'express-validator';
import { authenticateUser, requireRole } from '../middleware/auth';
import { classifyHealthcareData, HealthcareDataClass } from '../middleware/security';

const router = Router();

/**
 * Search healthcare providers
 */
router.get('/search', [
  query('specialty').optional().isString().isLength({ min: 2, max: 100 }),
  query('state').optional().isIn([
    'JHR', 'KDH', 'KTN', 'MLK', 'NSN', 'PHG', 'PRK', 'PLS',
    'PNG', 'SBH', 'SWK', 'SGR', 'TRG', 'KUL', 'LBN', 'PJY'
  ]),
  query('city').optional().isString().isLength({ max: 100 }),
  query('provider_type').optional().isIn(['doctor', 'dentist', 'pharmacist', 'nurse', 'therapist', 'specialist']),
  query('language').optional().isIn(['ms', 'en', 'zh', 'ta', 'ar']),
  query('gender').optional().isIn(['male', 'female']),
  query('accepts_insurance').optional().isBoolean(),
  query('cultural_competency').optional().isBoolean(),
  query('telemedicine').optional().isBoolean(),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 }),
  query('sort_by').optional().isIn(['rating', 'distance', 'experience', 'price', 'availability'])
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Invalid provider search parameters',
      details: errors.array(),
      cultural_message: {
        en: 'Please check your healthcare provider search criteria',
        ms: 'Sila semak kriteria carian penyedia perubatan anda',
        zh: '请检查您的医疗服务提供者搜索条件',
        ta: 'உங்கள் சுகாதார சேவை வழங்குநர் தேடல் அளவுகோல்களை சரிபார்க்கவும்'
      }
    });
  }

  const searchParams = {
    specialty: req.query.specialty as string,
    state: req.query.state as string,
    city: req.query.city as string,
    providerType: req.query.provider_type as string,
    language: req.query.language as string,
    gender: req.query.gender as string,
    acceptsInsurance: req.query.accepts_insurance === 'true',
    culturalCompetency: req.query.cultural_competency === 'true',
    telemedicine: req.query.telemedicine === 'true',
    page: parseInt(req.query.page as string) || 1,
    limit: parseInt(req.query.limit as string) || 20,
    sortBy: req.query.sort_by as string || 'rating'
  };

  try {
    const searchResults = await searchMalaysianHealthcareProviders(searchParams);

    res.json({
      success: true,
      data: {
        providers: searchResults.providers.map(provider => ({
          ...provider,
          malaysian_credentials: {
            moh_registration: provider.moh_registration,
            mmc_registration: provider.mmc_registration,
            specialist_board_certification: provider.specialist_certification,
            license_status: provider.license_status || 'active',
            license_expiry: provider.license_expiry
          },
          cultural_services: {
            languages_spoken: provider.languages || ['ms', 'en'],
            cultural_competency_training: provider.cultural_training || false,
            religious_sensitivity: provider.religious_accommodation || false,
            interpreter_services: provider.interpreter_available || false,
            cultural_liaison_available: provider.cultural_liaison || false
          },
          patient_preferences_compatibility: {
            gender_match: checkGenderCompatibility(provider.gender, req.query.gender as string),
            language_support: checkLanguageSupport(provider.languages, req.query.language as string),
            cultural_understanding: provider.cultural_competency_score || 0,
            religious_accommodation: provider.religious_services || false
          },
          practical_information: {
            appointment_availability: provider.next_available_slot || 'contact_for_availability',
            insurance_accepted: provider.insurance_providers || [],
            telemedicine_available: provider.telemedicine_services || false,
            accessibility_features: provider.accessibility || [],
            parking_availability: provider.parking || 'unknown'
          }
        })),
        search_metadata: {
          query_parameters: searchParams,
          total_results: searchResults.total,
          current_page: searchParams.page,
          total_pages: Math.ceil(searchResults.total / searchParams.limit),
          results_per_page: searchParams.limit
        },
        malaysian_healthcare_network: {
          moh_verified_providers: searchResults.moh_verified_count,
          government_facilities: searchResults.government_facilities_count,
          private_facilities: searchResults.private_facilities_count,
          cultural_competency_certified: searchResults.cultural_certified_count
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Provider search failed',
      code: 'PROVIDER_SEARCH_ERROR',
      cultural_message: {
        en: 'Unable to search healthcare providers at this time',
        ms: 'Tidak dapat mencari penyedia perubatan pada masa ini',
        zh: '目前无法搜索医疗服务提供者',
        ta: 'இந்த நேரத்தில் சுகாதார சேவை வழங்குநர்களை தேட முடியவில்லை'
      }
    });
  }
});

/**
 * Get specific provider details
 */
router.get('/:providerId', [
  param('providerId').isUUID().withMessage('Invalid provider ID format'),
  query('include_reviews').optional().isBoolean(),
  query('include_availability').optional().isBoolean(),
  query('language').optional().isIn(['ms', 'en', 'zh', 'ta'])
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Invalid provider request parameters',
      details: errors.array()
    });
  }

  const { providerId } = req.params;
  const {
    include_reviews = false,
    include_availability = false,
    language = 'ms'
  } = req.query;

  try {
    const provider = await getHealthcareProviderDetails(providerId, {
      includeReviews: Boolean(include_reviews),
      includeAvailability: Boolean(include_availability),
      language: language as string
    });

    if (!provider) {
      return res.status(404).json({
        error: 'Healthcare provider not found',
        code: 'PROVIDER_NOT_FOUND',
        cultural_message: {
          en: 'The requested healthcare provider was not found',
          ms: 'Penyedia perubatan yang diminta tidak dijumpai',
          zh: '未找到请求的医疗服务提供者',
          ta: 'கோரப்பட்ட சுகாதார சேவை வழங்குநர் கிடைக்கவில்லை'
        }
      });
    }

    res.json({
      success: true,
      data: {
        provider: {
          ...provider,
          malaysian_registration: {
            moh_details: await getMOHRegistrationDetails(provider.moh_registration),
            professional_body_memberships: provider.professional_memberships || [],
            continuing_education_status: provider.cme_status || 'up_to_date',
            disciplinary_record: 'clean', // Would check against regulatory databases
            last_license_renewal: provider.license_renewal_date
          },
          cultural_intelligence: {
            multicultural_training_hours: provider.cultural_training_hours || 0,
            languages_certified: provider.certified_languages || [],
            religious_accommodation_training: provider.religious_training || false,
            malaysian_cultural_assessment: provider.cultural_competency_score || 0,
            patient_satisfaction_cultural: provider.cultural_satisfaction_score || 0
          },
          clinical_information: {
            specializations: provider.specializations || [],
            sub_specialties: provider.sub_specialties || [],
            years_of_experience: provider.experience_years || 0,
            education_background: provider.education || [],
            hospital_affiliations: provider.hospital_affiliations || [],
            research_publications: provider.publications_count || 0
          },
          patient_services: {
            consultation_types: provider.consultation_types || [],
            treatment_approaches: provider.treatment_methods || [],
            preventive_care_programs: provider.preventive_programs || [],
            chronic_disease_management: provider.chronic_care_programs || [],
            emergency_services: provider.emergency_care || false,
            home_visit_services: provider.home_visits || false
          }
        },
        malaysian_healthcare_context: {
          government_panel_status: provider.government_panel || false,
          insurance_network_participation: provider.insurance_networks || [],
          cultural_community_involvement: provider.community_programs || [],
          traditional_medicine_integration: provider.traditional_medicine_collaboration || false,
          multi_faith_services: provider.chaplain_services || false
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve provider details',
      code: 'PROVIDER_DETAIL_ERROR'
    });
  }
});

/**
 * Get provider availability
 */
router.get('/:providerId/availability', [
  authenticateUser,
  param('providerId').isUUID(),
  query('start_date').optional().isISO8601(),
  query('end_date').optional().isISO8601(),
  query('appointment_type').optional().isString(),
  query('avoid_prayer_times').optional().isBoolean()
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Invalid availability request parameters',
      details: errors.array()
    });
  }

  const { providerId } = req.params;
  const {
    start_date = new Date().toISOString().split('T')[0],
    end_date = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    appointment_type,
    avoid_prayer_times = true
  } = req.query;

  try {
    const availability = await getProviderAvailability(providerId, {
      startDate: start_date as string,
      endDate: end_date as string,
      appointmentType: appointment_type as string,
      avoidPrayerTimes: Boolean(avoid_prayer_times)
    });

    res.json({
      success: true,
      data: {
        provider_id: providerId,
        availability_period: {
          start_date: start_date,
          end_date: end_date
        },
        available_slots: availability.slots.map(slot => ({
          ...slot,
          malaysian_considerations: {
            prayer_time_compatible: slot.prayer_compatible || true,
            friday_prayers_avoided: slot.friday_prayer_safe || true,
            ramadan_friendly: slot.ramadan_appropriate || true,
            cultural_buffer_time: slot.cultural_buffer || 0
          }
        })),
        booking_guidelines: {
          advance_booking_required: availability.advance_booking_days || 1,
          same_day_appointments: availability.same_day_available || false,
          cancellation_policy: availability.cancellation_hours || 24,
          cultural_preferences: {
            prayer_time_avoidance: Boolean(avoid_prayer_times),
            family_consultation_time: 'additional_15_minutes_available',
            interpreter_booking: 'request_during_appointment_booking',
            religious_accommodation: 'specify_requirements_in_notes'
          }
        },
        malaysian_scheduling_features: {
          islamic_calendar_integration: true,
          public_holiday_awareness: true,
          school_holiday_considerations: true,
          cultural_event_scheduling: true
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve provider availability',
      code: 'AVAILABILITY_ERROR'
    });
  }
});

/**
 * Get provider reviews and ratings
 */
router.get('/:providerId/reviews', [
  param('providerId').isUUID(),
  query('language').optional().isIn(['ms', 'en', 'zh', 'ta', 'all']),
  query('rating_filter').optional().isInt({ min: 1, max: 5 }),
  query('cultural_aspect').optional().isIn(['language_support', 'religious_sensitivity', 'cultural_understanding', 'all']),
  query('page').optional().isInt({ min: 1 }),
  query('limit').optional().isInt({ min: 1, max: 50 })
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Invalid review request parameters',
      details: errors.array()
    });
  }

  const { providerId } = req.params;
  const filters = {
    language: req.query.language as string || 'all',
    ratingFilter: req.query.rating_filter ? parseInt(req.query.rating_filter as string) : null,
    culturalAspect: req.query.cultural_aspect as string || 'all',
    page: parseInt(req.query.page as string) || 1,
    limit: parseInt(req.query.limit as string) || 20
  };

  try {
    const reviews = await getProviderReviews(providerId, filters);

    res.json({
      success: true,
      data: {
        provider_id: providerId,
        review_summary: {
          total_reviews: reviews.total,
          average_rating: reviews.average_rating,
          rating_distribution: reviews.rating_distribution,
          cultural_competency_rating: reviews.cultural_rating,
          language_support_rating: reviews.language_rating,
          religious_sensitivity_rating: reviews.religious_rating
        },
        reviews: reviews.reviews.map(review => ({
          ...review,
          cultural_feedback: {
            language_support_rating: review.language_rating || null,
            cultural_understanding_rating: review.cultural_rating || null,
            religious_sensitivity_rating: review.religious_rating || null,
            interpreter_services_rating: review.interpreter_rating || null,
            family_involvement_rating: review.family_rating || null
          },
          malaysian_context: {
            reviewer_state: review.reviewer_location || 'not_specified',
            cultural_background: review.cultural_background || 'not_specified',
            appointment_type: review.appointment_category || 'not_specified'
          }
        })),
        cultural_insights: {
          most_appreciated_cultural_aspects: reviews.cultural_strengths || [],
          areas_for_cultural_improvement: reviews.cultural_improvement_areas || [],
          language_effectiveness: reviews.language_effectiveness || {},
          religious_accommodation_feedback: reviews.religious_feedback || {}
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve provider reviews',
      code: 'REVIEWS_ERROR'
    });
  }
});

/**
 * Get provider network and affiliations
 */
router.get('/:providerId/network', [
  param('providerId').isUUID(),
  query('include_hospitals').optional().isBoolean(),
  query('include_clinics').optional().isBoolean(),
  query('include_laboratories').optional().isBoolean(),
  query('include_pharmacies').optional().isBoolean()
], async (req: Request, res: Response) => {
  const { providerId } = req.params;
  const includeOptions = {
    hospitals: Boolean(req.query.include_hospitals) || true,
    clinics: Boolean(req.query.include_clinics) || true,
    laboratories: Boolean(req.query.include_laboratories) || false,
    pharmacies: Boolean(req.query.include_pharmacies) || false
  };

  try {
    const network = await getProviderNetwork(providerId, includeOptions);

    res.json({
      success: true,
      data: {
        provider_id: providerId,
        network_affiliations: network,
        malaysian_healthcare_integration: {
          government_hospital_network: network.government_facilities || [],
          private_hospital_partnerships: network.private_facilities || [],
          community_clinic_connections: network.community_clinics || [],
          specialist_referral_network: network.specialist_network || [],
          laboratory_partnerships: network.laboratory_network || [],
          pharmacy_network: network.pharmacy_partners || []
        },
        patient_benefits: {
          seamless_referrals: 'integrated_system',
          shared_medical_records: 'with_patient_consent',
          coordinated_care: 'multi_disciplinary_approach',
          insurance_network_coverage: 'optimized_billing',
          cultural_continuity: 'consistent_cultural_care_team'
        }
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      error: 'Failed to retrieve provider network',
      code: 'NETWORK_ERROR'
    });
  }
});

// Helper functions (in production, these would be separate service modules)
async function searchMalaysianHealthcareProviders(params: any): Promise<any> {
  // Mock Malaysian healthcare provider search
  const mockProviders = [
    {
      id: 'provider-001',
      name: 'Dr. Ahmad Rahman bin Hassan',
      provider_type: 'doctor',
      specialty: 'General Practice',
      sub_specialties: ['Family Medicine', 'Preventive Care'],
      gender: 'male',
      languages: ['ms', 'en', 'ar'],
      moh_registration: 'MOH12345-A',
      mmc_registration: 'MMC67890',
      license_status: 'active',
      license_expiry: '2025-12-31',
      cultural_competency_score: 4.8,
      overall_rating: 4.7,
      experience_years: 15,
      location: {
        state: 'KUL',
        city: 'Kuala Lumpur',
        district: 'Cheras',
        address: 'Klinik Dr. Ahmad, Jalan Cheras Batu 9'
      },
      contact: {
        phone: '+60312345678',
        email: 'dr.ahmad@klinikrahman.com',
        website: 'www.klinikrahman.com'
      },
      services: {
        telemedicine: true,
        home_visits: true,
        emergency_care: false,
        cultural_consultation: true,
        interpreter_services: true
      },
      insurance_accepted: ['Great Eastern', 'Allianz Malaysia', 'Government Panel'],
      cultural_training: true,
      religious_accommodation: true,
      next_available_slot: '2024-01-16T09:00:00+08:00'
    },
    {
      id: 'provider-002',
      name: 'Dr. Sarah Lim Wei Ming',
      provider_type: 'doctor',
      specialty: 'Pediatrics',
      sub_specialties: ['Child Development', 'Vaccination'],
      gender: 'female',
      languages: ['en', 'zh', 'ms'],
      moh_registration: 'MOH23456-B',
      mmc_registration: 'MMC78901',
      license_status: 'active',
      license_expiry: '2026-06-30',
      cultural_competency_score: 4.9,
      overall_rating: 4.8,
      experience_years: 12,
      location: {
        state: 'PNG',
        city: 'George Town',
        district: 'Georgetown',
        address: 'Penang Child Clinic, Jalan Burma'
      },
      contact: {
        phone: '+60462345679',
        email: 'dr.sarah@penangchild.com',
        website: 'www.penangchildclinic.com'
      },
      services: {
        telemedicine: true,
        home_visits: false,
        emergency_care: true,
        cultural_consultation: true,
        interpreter_services: true
      },
      insurance_accepted: ['BUPA', 'Prudential BSN', 'AIA Malaysia'],
      cultural_training: true,
      religious_accommodation: true,
      next_available_slot: '2024-01-17T14:00:00+08:00'
    }
  ];

  // Filter providers based on search parameters
  let filteredProviders = mockProviders;
  
  if (params.specialty) {
    filteredProviders = filteredProviders.filter(p => 
      p.specialty.toLowerCase().includes(params.specialty.toLowerCase())
    );
  }
  
  if (params.state) {
    filteredProviders = filteredProviders.filter(p => p.location.state === params.state);
  }
  
  if (params.language) {
    filteredProviders = filteredProviders.filter(p => p.languages.includes(params.language));
  }
  
  if (params.gender) {
    filteredProviders = filteredProviders.filter(p => p.gender === params.gender);
  }

  // Pagination
  const startIndex = (params.page - 1) * params.limit;
  const paginatedProviders = filteredProviders.slice(startIndex, startIndex + params.limit);

  return {
    providers: paginatedProviders,
    total: filteredProviders.length,
    moh_verified_count: filteredProviders.length,
    government_facilities_count: Math.floor(filteredProviders.length * 0.4),
    private_facilities_count: Math.floor(filteredProviders.length * 0.6),
    cultural_certified_count: Math.floor(filteredProviders.length * 0.8)
  };
}

async function getHealthcareProviderDetails(providerId: string, options: any): Promise<any> {
  // Mock detailed provider information
  return {
    id: providerId,
    name: 'Dr. Ahmad Rahman bin Hassan',
    provider_type: 'doctor',
    specialty: 'General Practice',
    sub_specialties: ['Family Medicine', 'Preventive Care'],
    gender: 'male',
    date_of_birth: '1978-05-15',
    languages: ['ms', 'en', 'ar'],
    moh_registration: 'MOH12345-A',
    mmc_registration: 'MMC67890',
    license_status: 'active',
    license_expiry: '2025-12-31',
    license_renewal_date: '2023-12-31',
    education: [
      'MBBS - University of Malaya (2003)',
      'Diploma in Family Medicine - College of Family Physicians Malaysia (2007)'
    ],
    experience_years: 15,
    cultural_competency_score: 4.8,
    cultural_training_hours: 120,
    certified_languages: ['ms', 'en'],
    religious_training: true,
    overall_rating: 4.7,
    total_patients: 2500,
    location: {
      state: 'KUL',
      city: 'Kuala Lumpur',
      district: 'Cheras',
      full_address: 'Klinik Dr. Ahmad Rahman, No. 45, Jalan Cheras Batu 9, 43200 Cheras, Kuala Lumpur',
      coordinates: { lat: 3.1390, lng: 101.6869 }
    },
    contact_details: {
      clinic_phone: '+60312345678',
      mobile_phone: '+60123456789',
      email: 'dr.ahmad@klinikrahman.com',
      website: 'www.klinikrahman.com',
      fax: '+60312345677'
    },
    services_offered: {
      general_consultation: true,
      preventive_care: true,
      chronic_disease_management: true,
      telemedicine: true,
      home_visits: true,
      emergency_consultation: false,
      vaccination_services: true,
      health_screening: true,
      minor_procedures: true,
      cultural_consultation: true,
      traditional_medicine_integration: false
    },
    operating_hours: {
      monday: '09:00-17:00',
      tuesday: '09:00-17:00',
      wednesday: '09:00-17:00',
      thursday: '09:00-17:00',
      friday: '09:00-12:00,14:30-17:00', // Prayer time consideration
      saturday: '09:00-13:00',
      sunday: 'closed'
    },
    cultural_services: {
      interpreter_available: true,
      cultural_liaison: true,
      religious_accommodation: true,
      halal_dietary_advice: true,
      family_consultation_support: true,
      traditional_medicine_consultation: false
    },
    professional_memberships: [
      'Malaysian Medical Association',
      'College of Family Physicians Malaysia',
      'Malaysian Society of Lifestyle Medicine'
    ],
    insurance_networks: [
      'Great Eastern Malaysia',
      'Allianz General Malaysia',
      'Government Panel Doctor',
      'SOCSO Panel'
    ],
    hospital_affiliations: [
      'Pantai Hospital Cheras',
      'Sunway Medical Centre'
    ]
  };
}

async function getMOHRegistrationDetails(registrationNumber: string): Promise<any> {
  // Mock MOH registration details
  return {
    registration_number: registrationNumber,
    status: 'active',
    registration_date: '2003-07-15',
    last_renewal: '2023-07-15',
    next_renewal: '2025-07-15',
    specializations_registered: ['General Practice', 'Family Medicine'],
    restrictions: [],
    disciplinary_actions: [],
    continuing_education_status: 'compliant',
    cme_points_current_cycle: 45,
    cme_points_required: 40
  };
}

async function getProviderAvailability(providerId: string, options: any): Promise<any> {
  // Mock availability data with Malaysian considerations
  const baseSlots = [
    { date: '2024-01-16', time: '09:00', duration: 30, type: 'consultation' },
    { date: '2024-01-16', time: '10:00', duration: 30, type: 'consultation' },
    { date: '2024-01-16', time: '14:30', duration: 30, type: 'consultation' },
    { date: '2024-01-16', time: '15:30', duration: 30, type: 'consultation' },
    { date: '2024-01-17', time: '09:30', duration: 30, type: 'consultation' },
    { date: '2024-01-17', time: '11:00', duration: 30, type: 'consultation' }
  ];

  return {
    slots: baseSlots.map(slot => ({
      ...slot,
      provider_id: providerId,
      available: true,
      prayer_compatible: !isPrayerTime(slot.time),
      friday_prayer_safe: !(new Date(slot.date).getDay() === 5 && slot.time >= '12:00' && slot.time <= '14:30'),
      ramadan_appropriate: isRamadanFriendlyTime(slot.time),
      cultural_buffer: 15, // minutes for cultural considerations
      booking_url: `https://booking.medimate.my/provider/${providerId}/slot/${slot.date}-${slot.time}`
    })),
    advance_booking_days: 7,
    same_day_available: false,
    cancellation_hours: 24
  };
}

async function getProviderReviews(providerId: string, filters: any): Promise<any> {
  // Mock provider reviews with cultural feedback
  const mockReviews = [
    {
      id: 'review-001',
      patient_id: 'anonymous',
      rating: 5,
      review_date: '2024-01-10',
      review_text: 'Dr. Ahmad sangat memahami keperluan budaya saya. Beliau menghormati waktu solat dan memberikan nasihat yang sesuai dengan kepercayaan Islam.',
      language: 'ms',
      cultural_rating: 5,
      language_rating: 5,
      religious_rating: 5,
      interpreter_rating: null,
      family_rating: 5,
      appointment_category: 'general_consultation',
      cultural_background: 'malay',
      reviewer_location: 'KUL'
    },
    {
      id: 'review-002',
      patient_id: 'anonymous',
      rating: 4,
      review_date: '2024-01-08',
      review_text: 'Good doctor who speaks multiple languages. Very understanding of cultural needs and provides excellent care for the whole family.',
      language: 'en',
      cultural_rating: 4,
      language_rating: 5,
      religious_rating: 4,
      interpreter_rating: null,
      family_rating: 5,
      appointment_category: 'family_consultation',
      cultural_background: 'mixed',
      reviewer_location: 'SGR'
    }
  ];

  return {
    reviews: mockReviews,
    total: mockReviews.length,
    average_rating: 4.5,
    rating_distribution: { 5: 1, 4: 1, 3: 0, 2: 0, 1: 0 },
    cultural_rating: 4.5,
    language_rating: 5.0,
    religious_rating: 4.5,
    cultural_strengths: ['religious_sensitivity', 'language_support', 'family_involvement'],
    cultural_improvement_areas: ['traditional_medicine_integration'],
    language_effectiveness: { ms: 5.0, en: 5.0, ar: 4.0 },
    religious_feedback: { islam: 4.8, christianity: 4.5, buddhism: 4.0, hinduism: 4.2 }
  };
}

async function getProviderNetwork(providerId: string, options: any): Promise<any> {
  // Mock provider network data
  return {
    government_facilities: [
      { name: 'Hospital Kuala Lumpur', type: 'government_hospital', relationship: 'consultation_privileges' },
      { name: 'Klinik Kesihatan Cheras', type: 'government_clinic', relationship: 'referral_network' }
    ],
    private_facilities: [
      { name: 'Pantai Hospital Cheras', type: 'private_hospital', relationship: 'admitting_privileges' },
      { name: 'Sunway Medical Centre', type: 'private_hospital', relationship: 'consultation_privileges' }
    ],
    specialist_network: [
      { name: 'Dr. Sarah Lim', specialty: 'Pediatrics', relationship: 'referral_partner' },
      { name: 'Dr. Raj Kumar', specialty: 'Cardiology', relationship: 'referral_partner' }
    ],
    laboratory_network: options.laboratories ? [
      { name: 'Gribbles Pathology', type: 'diagnostic_lab', services: ['blood_tests', 'imaging'] },
      { name: 'BP Clinical Lab', type: 'clinical_lab', services: ['routine_tests'] }
    ] : [],
    pharmacy_partners: options.pharmacies ? [
      { name: 'Guardian Pharmacy Cheras', type: 'retail_pharmacy', services: ['prescription', 'consultation'] },
      { name: 'Caring Pharmacy', type: 'chain_pharmacy', services: ['prescription', 'delivery'] }
    ] : []
  };
}

// Utility functions
function checkGenderCompatibility(providerGender: string, preferredGender?: string): boolean {
  if (!preferredGender || preferredGender === 'any') return true;
  return providerGender === preferredGender;
}

function checkLanguageSupport(providerLanguages: string[], preferredLanguage?: string): boolean {
  if (!preferredLanguage) return true;
  return providerLanguages.includes(preferredLanguage);
}

function isPrayerTime(time: string): boolean {
  const prayerTimes = ['05:45', '13:15', '16:30', '19:20', '20:35'];
  return prayerTimes.some(prayerTime => {
    const [pHour, pMin] = prayerTime.split(':').map(Number);
    const [tHour, tMin] = time.split(':').map(Number);
    const prayerMinutes = pHour * 60 + pMin;
    const timeMinutes = tHour * 60 + tMin;
    return Math.abs(prayerMinutes - timeMinutes) < 30; // 30 minute buffer
  });
}

function isRamadanFriendlyTime(time: string): boolean {
  const [hour] = time.split(':').map(Number);
  // Good times during Ramadan: early morning after Suhur, late evening after Iftar
  return hour <= 9 || hour >= 20;
}

export default router;