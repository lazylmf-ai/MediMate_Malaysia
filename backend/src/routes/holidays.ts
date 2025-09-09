/**
 * Malaysian Holidays Routes
 * Provides Malaysian public holidays and cultural events for healthcare scheduling
 */

import { Router, Request, Response } from 'express';
import { query, validationResult } from 'express-validator';

const router = Router();

/**
 * Get Malaysian public holidays
 */
router.get('/', [
  query('year').optional().isInt({ min: 2020, max: 2030 })
    .withMessage('Year must be between 2020 and 2030'),
  query('state').optional().isIn([
    'JHR', 'KDH', 'KTN', 'MLK', 'NSN', 'PHG', 'PRK', 'PLS',
    'PNG', 'SBH', 'SWK', 'SGR', 'TRG', 'KUL', 'LBN', 'PJY', 'ALL'
  ]).withMessage('Invalid Malaysian state code')
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Invalid holiday parameters',
      details: errors.array()
    });
  }

  const { 
    year = new Date().getFullYear(),
    state = 'ALL'
  } = req.query;

  const holidays = getMalaysianHolidays(Number(year), state as string);

  res.json({
    success: true,
    data: {
      year: Number(year),
      state: state,
      total_holidays: holidays.length,
      holidays: holidays.map(holiday => ({
        ...holiday,
        healthcare_impact: getHealthcareImpact(holiday)
      }))
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * Get upcoming holidays (next 30 days)
 */
router.get('/upcoming', [
  query('days').optional().isInt({ min: 1, max: 365 })
    .withMessage('Days must be between 1 and 365'),
  query('state').optional().isIn([
    'JHR', 'KDH', 'KTN', 'MLK', 'NSN', 'PHG', 'PRK', 'PLS',
    'PNG', 'SBH', 'SWK', 'SGR', 'TRG', 'KUL', 'LBN', 'PJY', 'ALL'
  ])
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Invalid upcoming holidays parameters',
      details: errors.array()
    });
  }

  const { 
    days = 30,
    state = 'ALL'
  } = req.query;

  const today = new Date();
  const endDate = new Date();
  endDate.setDate(today.getDate() + Number(days));

  const currentYear = today.getFullYear();
  const nextYear = endDate.getFullYear();
  
  let holidays = getMalaysianHolidays(currentYear, state as string);
  if (nextYear > currentYear) {
    holidays = holidays.concat(getMalaysianHolidays(nextYear, state as string));
  }

  const upcomingHolidays = holidays.filter(holiday => {
    const holidayDate = new Date(holiday.date);
    return holidayDate >= today && holidayDate <= endDate;
  });

  res.json({
    success: true,
    data: {
      period: {
        start_date: today.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        days: Number(days)
      },
      state: state,
      upcoming_holidays: upcomingHolidays.map(holiday => ({
        ...holiday,
        days_from_now: Math.ceil((new Date(holiday.date).getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
        healthcare_impact: getHealthcareImpact(holiday),
        scheduling_recommendations: getSchedulingRecommendations(holiday)
      }))
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * Check if a specific date is a holiday
 */
router.get('/check', [
  query('date').isISO8601().withMessage('Date must be in ISO format'),
  query('state').optional().isIn([
    'JHR', 'KDH', 'KTN', 'MLK', 'NSN', 'PHG', 'PRK', 'PLS',
    'PNG', 'SBH', 'SWK', 'SGR', 'TRG', 'KUL', 'LBN', 'PJY', 'ALL'
  ])
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Invalid holiday check parameters',
      details: errors.array()
    });
  }

  const { date, state = 'ALL' } = req.query;
  const checkDate = date as string;
  const year = new Date(checkDate).getFullYear();
  
  const holidays = getMalaysianHolidays(year, state as string);
  const holidayOnDate = holidays.find(holiday => holiday.date === checkDate);

  res.json({
    success: true,
    data: {
      date: checkDate,
      state: state,
      is_holiday: !!holidayOnDate,
      holiday_details: holidayOnDate || null,
      healthcare_recommendations: holidayOnDate ? 
        getSchedulingRecommendations(holidayOnDate) : 
        {
          healthcare_services: 'normal_operations',
          appointment_scheduling: 'available',
          pharmacy_availability: 'normal_hours'
        }
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * Get school holidays (affects family appointments)
 */
router.get('/school-holidays', [
  query('year').optional().isInt({ min: 2020, max: 2030 }),
  query('state').optional().isIn([
    'JHR', 'KDH', 'KTN', 'MLK', 'NSN', 'PHG', 'PRK', 'PLS',
    'PNG', 'SBH', 'SWK', 'SGR', 'TRG', 'KUL', 'LBN', 'PJY', 'ALL'
  ])
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Invalid school holidays parameters',
      details: errors.array()
    });
  }

  const { 
    year = new Date().getFullYear(),
    state = 'ALL'
  } = req.query;

  const schoolHolidays = getMalaysianSchoolHolidays(Number(year), state as string);

  res.json({
    success: true,
    data: {
      year: Number(year),
      state: state,
      school_holidays: schoolHolidays.map(period => ({
        ...period,
        healthcare_considerations: {
          family_appointments: 'increased_demand',
          pediatric_services: 'higher_availability_needed',
          timing_preference: 'morning_appointments_popular',
          parent_availability: 'higher_during_school_breaks'
        }
      }))
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * Get Ramadan schedule (affects Muslim patients)
 */
router.get('/ramadan', [
  query('year').optional().isInt({ min: 2020, max: 2030 })
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Invalid Ramadan parameters',
      details: errors.array()
    });
  }

  const { year = new Date().getFullYear() } = req.query;
  const ramadanInfo = getRamadanSchedule(Number(year));

  res.json({
    success: true,
    data: {
      year: Number(year),
      ramadan_period: ramadanInfo,
      healthcare_considerations: {
        fasting_hours: 'approximately 5:45 AM to 7:20 PM',
        appointment_preferences: [
          'Early morning (7:00-9:00 AM) - after Suhur',
          'Late evening (8:00-10:00 PM) - after Iftar'
        ],
        avoid_periods: [
          'Late afternoon (4:00-7:00 PM) - pre-Iftar fatigue',
          'Midday appointments for non-urgent matters'
        ],
        medication_timing: {
          morning_meds: 'before_fajr_prayer',
          evening_meds: 'after_maghrib_prayer',
          chronic_medications: 'may_need_schedule_adjustment'
        },
        special_services: {
          iftar_meals: 'halal_options_in_hospital_cafeteria',
          prayer_facilities: 'available_in_healthcare_facilities',
          cultural_sensitivity: 'staff_trained_on_ramadan_considerations'
        }
      }
    },
    timestamp: new Date().toISOString()
  });
});

// Helper functions
function getMalaysianHolidays(year: number, state: string): Array<{
  date: string;
  name: string;
  name_ms: string;
  category: string;
  type: string;
  applies_to: string[];
  description: string;
}> {
  const federalHolidays = [
    {
      date: `${year}-01-01`,
      name: 'New Year\'s Day',
      name_ms: 'Hari Tahun Baru',
      category: 'public',
      type: 'fixed',
      applies_to: ['ALL'],
      description: 'Federal public holiday'
    },
    {
      date: `${year}-02-01`,
      name: 'Federal Territory Day',
      name_ms: 'Hari Wilayah Persekutuan',
      category: 'regional',
      type: 'fixed',
      applies_to: ['KUL', 'LBN', 'PJY'],
      description: 'Kuala Lumpur, Labuan, Putrajaya only'
    },
    {
      date: `${year}-05-01`,
      name: 'Labour Day',
      name_ms: 'Hari Pekerja',
      category: 'public',
      type: 'fixed',
      applies_to: ['ALL'],
      description: 'International Workers\' Day'
    },
    {
      date: `${year}-06-07`,
      name: 'Yang di-Pertuan Agong\'s Birthday',
      name_ms: 'Hari Keputeraan Yang di-Pertuan Agong',
      category: 'public',
      type: 'fixed',
      applies_to: ['ALL'],
      description: 'King\'s Birthday'
    },
    {
      date: `${year}-08-31`,
      name: 'National Day',
      name_ms: 'Hari Kebangsaan',
      category: 'public',
      type: 'fixed',
      applies_to: ['ALL'],
      description: 'Independence Day (Merdeka)'
    },
    {
      date: `${year}-09-16`,
      name: 'Malaysia Day',
      name_ms: 'Hari Malaysia',
      category: 'public',
      type: 'fixed',
      applies_to: ['ALL'],
      description: 'Formation of Malaysia'
    },
    {
      date: `${year}-12-25`,
      name: 'Christmas Day',
      name_ms: 'Hari Krismas',
      category: 'public',
      type: 'fixed',
      applies_to: ['ALL'],
      description: 'Christian celebration'
    }
  ];

  // Islamic holidays (approximate dates - vary by lunar calendar)
  const islamicHolidays = [
    {
      date: `${year}-04-13`,
      name: 'Hari Raya Aidilfitri',
      name_ms: 'Hari Raya Aidilfitri',
      category: 'public',
      type: 'lunar',
      applies_to: ['ALL'],
      description: 'End of Ramadan (Eid al-Fitr) - Day 1'
    },
    {
      date: `${year}-04-14`,
      name: 'Hari Raya Aidilfitri (Day 2)',
      name_ms: 'Hari Raya Aidilfitri (Hari Kedua)',
      category: 'public',
      type: 'lunar',
      applies_to: ['ALL'],
      description: 'End of Ramadan (Eid al-Fitr) - Day 2'
    },
    {
      date: `${year}-06-20`,
      name: 'Hari Raya Aidiladha',
      name_ms: 'Hari Raya Aidiladha',
      category: 'public',
      type: 'lunar',
      applies_to: ['ALL'],
      description: 'Festival of Sacrifice (Eid al-Adha)'
    },
    {
      date: `${year}-07-10`,
      name: 'Awal Muharram',
      name_ms: 'Awal Muharram',
      category: 'public',
      type: 'lunar',
      applies_to: ['ALL'],
      description: 'Islamic New Year'
    },
    {
      date: `${year}-09-16`,
      name: 'Maulidur Rasul',
      name_ms: 'Maulidur Rasul',
      category: 'public',
      type: 'lunar',
      applies_to: ['ALL'],
      description: 'Prophet Muhammad\'s Birthday'
    }
  ];

  // Chinese holidays
  const chineseHolidays = [
    {
      date: `${year}-01-22`,
      name: 'Chinese New Year',
      name_ms: 'Tahun Baru Cina',
      category: 'public',
      type: 'lunar',
      applies_to: ['ALL'],
      description: 'Lunar New Year - Day 1'
    },
    {
      date: `${year}-01-23`,
      name: 'Chinese New Year (Day 2)',
      name_ms: 'Tahun Baru Cina (Hari Kedua)',
      category: 'public',
      type: 'lunar',
      applies_to: ['ALL'],
      description: 'Lunar New Year - Day 2'
    }
  ];

  // Hindu and other holidays
  const otherHolidays = [
    {
      date: `${year}-10-24`,
      name: 'Deepavali',
      name_ms: 'Deepavali',
      category: 'public',
      type: 'lunar',
      applies_to: ['ALL'],
      description: 'Festival of Lights (Hindu)'
    },
    {
      date: `${year}-05-26`,
      name: 'Wesak Day',
      name_ms: 'Hari Wesak',
      category: 'public',
      type: 'lunar',
      applies_to: ['ALL'],
      description: 'Buddha\'s Birthday'
    }
  ];

  let allHolidays = [...federalHolidays, ...islamicHolidays, ...chineseHolidays, ...otherHolidays];

  // Filter by state if specified
  if (state !== 'ALL') {
    allHolidays = allHolidays.filter(holiday => 
      holiday.applies_to.includes('ALL') || holiday.applies_to.includes(state)
    );
  }

  return allHolidays.sort((a, b) => a.date.localeCompare(b.date));
}

function getMalaysianSchoolHolidays(year: number, state: string): Array<{
  name: string;
  start_date: string;
  end_date: string;
  duration_weeks: number;
  type: string;
}> {
  // Malaysian school holiday periods (approximate)
  return [
    {
      name: 'Mid-Term Break (March)',
      start_date: `${year}-03-20`,
      end_date: `${year}-03-28`,
      duration_weeks: 1,
      type: 'mid_term'
    },
    {
      name: 'Mid-Year Holidays',
      start_date: `${year}-05-28`,
      end_date: `${year}-06-26`,
      duration_weeks: 4,
      type: 'mid_year'
    },
    {
      name: 'Mid-Term Break (August)',
      start_date: `${year}-08-19`,
      end_date: `${year}-08-27`,
      duration_weeks: 1,
      type: 'mid_term'
    },
    {
      name: 'Year-End Holidays',
      start_date: `${year}-11-18`,
      end_date: `${year}-12-31`,
      duration_weeks: 6,
      type: 'year_end'
    }
  ];
}

function getRamadanSchedule(year: number): any {
  // Approximate Ramadan dates (actual dates follow lunar calendar)
  return {
    start_date: `${year}-03-23`,
    end_date: `${year}-04-21`,
    duration_days: 30,
    eid_al_fitr: `${year}-04-22`,
    note: 'Dates are approximate and follow the Islamic lunar calendar',
    fasting_hours: {
      approximate_start: '05:45',
      approximate_end: '19:20',
      note: 'Times vary slightly throughout the month and by location'
    }
  };
}

function getHealthcareImpact(holiday: any): any {
  const baseImpact = {
    healthcare_services: 'emergency_only',
    pharmacy_availability: 'limited',
    appointment_scheduling: 'avoid',
    laboratory_services: 'emergency_only',
    administrative_services: 'closed'
  };

  // Major holidays have more impact
  if (['Hari Raya Aidilfitri', 'Chinese New Year', 'Christmas Day'].includes(holiday.name)) {
    return {
      ...baseImpact,
      impact_level: 'high',
      duration_days: holiday.name.includes('Raya') ? 2 : 1,
      family_gathering_impact: 'high',
      travel_impact: 'significant'
    };
  }

  return {
    ...baseImpact,
    impact_level: 'medium',
    duration_days: 1
  };
}

function getSchedulingRecommendations(holiday: any): any {
  return {
    pre_holiday_preparation: {
      advance_booking: 'recommended',
      medication_refills: 'ensure_adequate_supply',
      emergency_contacts: 'update_and_verify'
    },
    alternative_arrangements: {
      urgent_care: 'hospital_emergency_departments',
      pharmacy_services: '24hour_pharmacies_in_hospitals',
      appointment_rescheduling: 'book_before_or_after_holiday_period'
    },
    cultural_considerations: {
      family_priorities: holiday.type === 'religious' ? 'high' : 'medium',
      travel_likelihood: holiday.category === 'public' ? 'high' : 'low',
      festive_obligations: holiday.type === 'religious' ? 'significant' : 'moderate'
    }
  };
}

export default router;