/**
 * Malaysian Cultural Intelligence Routes
 * Provides cultural context and intelligence for healthcare applications
 */

import { Router, Request, Response } from 'express';
import { body, query, validationResult } from 'express-validator';

const router = Router();

/**
 * Get Malaysian cultural context based on location and preferences
 */
router.get('/context', [
  query('state').optional().isIn([
    'JHR', 'KDH', 'KTN', 'MLK', 'NSN', 'PHG', 'PRK', 'PLS',
    'PNG', 'SBH', 'SWK', 'SGR', 'TRG', 'KUL', 'LBN', 'PJY'
  ]).withMessage('Invalid Malaysian state code'),
  query('language').optional().isIn(['ms', 'en', 'zh', 'ta'])
    .withMessage('Supported languages: ms, en, zh, ta')
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Invalid cultural context parameters',
      details: errors.array()
    });
  }

  const { state, language = 'ms' } = req.query;
  
  const culturalContext = {
    location: {
      state: state || 'SGR',
      timezone: 'Asia/Kuala_Lumpur',
      coordinates: getCityCoordinates(state as string)
    },
    language: {
      primary: language,
      supported: ['ms', 'en', 'zh', 'ta'],
      rtl_support: false
    },
    religious_considerations: {
      prayer_times_relevant: true,
      halal_requirements: true,
      friday_considerations: true,
      ramadan_awareness: true
    },
    cultural_preferences: {
      family_involvement: 'high',
      elderly_respect: 'very_high',
      gender_sensitivity: 'moderate',
      traditional_medicine_acceptance: 'moderate'
    },
    healthcare_context: {
      government_facilities: true,
      private_healthcare: true,
      traditional_medicine: true,
      pharmacy_network: 'extensive'
    }
  };

  res.json({
    success: true,
    data: culturalContext,
    timestamp: new Date().toISOString()
  });
});

/**
 * Get Malaysian public holidays and cultural events
 */
router.get('/holidays', [
  query('year').optional().isInt({ min: 2020, max: 2030 })
    .withMessage('Year must be between 2020 and 2030'),
  query('state').optional().isIn([
    'JHR', 'KDH', 'KTN', 'MLK', 'NSN', 'PHG', 'PRK', 'PLS',
    'PNG', 'SBH', 'SWK', 'SGR', 'TRG', 'KUL', 'LBN', 'PJY'
  ])
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Invalid holiday parameters',
      details: errors.array()
    });
  }

  const { year = new Date().getFullYear(), state = 'federal' } = req.query;
  
  const holidays = getMalaysianHolidays(Number(year), state as string);

  res.json({
    success: true,
    data: {
      year: Number(year),
      state: state,
      holidays: holidays,
      healthcare_impact: holidays.map(holiday => ({
        date: holiday.date,
        name: holiday.name,
        healthcare_services: holiday.category === 'public' ? 'emergency_only' : 'normal',
        pharmacy_availability: holiday.category === 'public' ? 'limited' : 'normal',
        appointment_scheduling: holiday.category === 'public' ? 'not_recommended' : 'normal'
      }))
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * Get Malaysian dietary restrictions and preferences
 */
router.get('/dietary', [
  query('religion').optional().isIn(['islam', 'buddhism', 'hinduism', 'christianity', 'others']),
  query('ethnicity').optional().isIn(['malay', 'chinese', 'indian', 'others'])
], async (req: Request, res: Response) => {
  const { religion, ethnicity } = req.query;

  const dietaryGuidelines = {
    general_principles: {
      halal_awareness: true,
      vegetarian_options: true,
      cultural_sensitivity: true,
      religious_accommodation: true
    },
    restrictions_by_religion: {
      islam: {
        forbidden: ['pork', 'alcohol', 'non_halal_meat'],
        certification_required: true,
        fasting_considerations: 'ramadan_aware'
      },
      hinduism: {
        forbidden: ['beef'],
        preferred: ['vegetarian'],
        considerations: 'cow_sanctity'
      },
      buddhism: {
        preferred: ['vegetarian', 'pescatarian'],
        forbidden: ['alcohol_strict_sects'],
        considerations: 'non_violence'
      }
    },
    medication_considerations: {
      gelatin_capsules: 'check_halal_status',
      alcohol_based_medicines: 'religious_consultation',
      animal_derived_ingredients: 'verify_source'
    },
    cultural_foods: {
      malay: ['nasi_lemak', 'rendang', 'satay', 'laksa'],
      chinese: ['dim_sum', 'char_kway_teow', 'hainanese_chicken'],
      indian: ['roti_canai', 'banana_leaf_rice', 'biryani', 'tosai']
    }
  };

  res.json({
    success: true,
    data: dietaryGuidelines,
    filters_applied: { religion, ethnicity },
    timestamp: new Date().toISOString()
  });
});

/**
 * Get Malaysian language translations for medical terms
 */
router.get('/translations', [
  query('terms').isString().withMessage('Terms parameter required'),
  query('target_language').isIn(['ms', 'zh', 'ta']).withMessage('Target language must be ms, zh, or ta')
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Invalid translation parameters',
      details: errors.array()
    });
  }

  const { terms, target_language } = req.query;
  const termList = (terms as string).split(',').map(term => term.trim());

  const translations = translateMedicalTerms(termList, target_language as string);

  res.json({
    success: true,
    data: {
      source_language: 'en',
      target_language,
      translations
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * Get Malaysian cultural considerations for healthcare appointments
 */
router.get('/appointment-considerations', [
  query('date').isISO8601().withMessage('Date must be in ISO format'),
  query('patient_profile').optional().isString()
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Invalid appointment parameters',
      details: errors.array()
    });
  }

  const { date } = req.query;
  const appointmentDate = new Date(date as string);

  const considerations = {
    date_analysis: {
      day_of_week: appointmentDate.toLocaleDateString('en-US', { weekday: 'long' }),
      is_weekend: [0, 6].includes(appointmentDate.getDay()),
      is_friday: appointmentDate.getDay() === 5
    },
    religious_considerations: {
      friday_prayers: appointmentDate.getDay() === 5 ? 'avoid_12pm_to_2pm' : 'none',
      daily_prayers: ['Fajr (5:30-6:30)', 'Dhuhr (12:30-1:30)', 'Asr (4:00-5:00)', 'Maghrib (7:00-7:30)', 'Isha (8:30-9:00)'],
      ramadan_considerations: isRamadanPeriod(appointmentDate) ? 'fasting_hours_sensitive' : 'none'
    },
    cultural_preferences: {
      family_consultation: 'encourage_family_presence',
      gender_preferences: 'ask_about_doctor_gender_preference',
      language_support: 'interpreter_available',
      elderly_respect: 'extra_time_for_elderly_patients'
    },
    scheduling_recommendations: {
      optimal_times: ['9:00-11:00', '2:30-4:30'],
      avoid_times: ['12:00-14:00 (Friday prayers)', '19:00-20:00 (Maghrib prayers)'],
      buffer_time: 'add_15_minutes_cultural_considerations'
    }
  };

  res.json({
    success: true,
    data: considerations,
    appointment_date: date,
    timestamp: new Date().toISOString()
  });
});

// Helper functions
function getCityCoordinates(state: string): { lat: number; lng: number } {
  const coordinates: Record<string, { lat: number; lng: number }> = {
    'KUL': { lat: 3.1390, lng: 101.6869 }, // Kuala Lumpur
    'SGR': { lat: 3.0738, lng: 101.5183 }, // Selangor
    'JHR': { lat: 1.4927, lng: 103.7414 }, // Johor
    'PNG': { lat: 5.4164, lng: 100.3327 }  // Penang
    // Add more states as needed
  };
  
  return coordinates[state] || coordinates['KUL'];
}

function getMalaysianHolidays(year: number, state: string): Array<{ date: string; name: string; category: string; description: string }> {
  // This would typically connect to a Malaysian holidays API or database
  const federalHolidays = [
    { date: `${year}-01-01`, name: 'New Year\'s Day', category: 'public', description: 'Federal public holiday' },
    { date: `${year}-02-01`, name: 'Federal Territory Day', category: 'federal', description: 'KL, Labuan, Putrajaya only' },
    { date: `${year}-05-01`, name: 'Labour Day', category: 'public', description: 'Federal public holiday' },
    { date: `${year}-08-31`, name: 'Independence Day', category: 'public', description: 'Merdeka Day' },
    { date: `${year}-09-16`, name: 'Malaysia Day', category: 'public', description: 'Federal public holiday' },
    { date: `${year}-12-25`, name: 'Christmas Day', category: 'public', description: 'Federal public holiday' }
  ];
  
  // Add Islamic holidays (dates vary by lunar calendar)
  const islamicHolidays = [
    { date: `${year}-04-13`, name: 'Hari Raya Puasa', category: 'public', description: 'Eid al-Fitr (estimated)' },
    { date: `${year}-06-20`, name: 'Hari Raya Haji', category: 'public', description: 'Eid al-Adha (estimated)' }
  ];
  
  return [...federalHolidays, ...islamicHolidays];
}

function translateMedicalTerms(terms: string[], targetLanguage: string): Record<string, string> {
  const translations: Record<string, Record<string, string>> = {
    'ms': {
      'doctor': 'doktor',
      'hospital': 'hospital',
      'medicine': 'ubat',
      'appointment': 'temujanji',
      'prescription': 'preskripsi',
      'pharmacy': 'farmasi',
      'patient': 'pesakit',
      'emergency': 'kecemasan'
    },
    'zh': {
      'doctor': '医生',
      'hospital': '医院',
      'medicine': '药物',
      'appointment': '预约',
      'prescription': '处方',
      'pharmacy': '药房',
      'patient': '病人',
      'emergency': '紧急情况'
    },
    'ta': {
      'doctor': 'மருத்துவர்',
      'hospital': 'மருத்துவமனை',
      'medicine': 'மருந்து',
      'appointment': 'சந்திப்பு',
      'prescription': 'மருந்து பட்டியல்',
      'pharmacy': 'மருந்தகம்',
      'patient': 'நோயாளி',
      'emergency': 'அவசரநிலை'
    }
  };
  
  const result: Record<string, string> = {};
  const langTranslations = translations[targetLanguage] || {};
  
  terms.forEach(term => {
    result[term] = langTranslations[term.toLowerCase()] || term;
  });
  
  return result;
}

function isRamadanPeriod(date: Date): boolean {
  // This would typically check against Islamic calendar
  // For demo purposes, assuming approximate dates
  const year = date.getFullYear();
  const ramadanStart = new Date(year, 2, 23); // Approximate start (varies yearly)
  const ramadanEnd = new Date(year, 3, 21);   // Approximate end
  
  return date >= ramadanStart && date <= ramadanEnd;
}

export default router;