/**
 * Malaysian Prayer Times Routes
 * Provides Islamic prayer time data for healthcare scheduling integration
 */

import { Router, Request, Response } from 'express';
import { query, validationResult } from 'express-validator';

const router = Router();

/**
 * Get prayer times for a specific Malaysian location
 */
router.get('/', [
  query('state').optional().isIn([
    'JHR', 'KDH', 'KTN', 'MLK', 'NSN', 'PHG', 'PRK', 'PLS',
    'PNG', 'SBH', 'SWK', 'SGR', 'TRG', 'KUL', 'LBN', 'PJY'
  ]).withMessage('Invalid Malaysian state code'),
  query('city').optional().isString().isLength({ min: 2, max: 50 }),
  query('date').optional().isISO8601().withMessage('Date must be in ISO format')
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Invalid prayer time parameters',
      details: errors.array()
    });
  }

  const { 
    state = 'KUL',
    city = 'Kuala Lumpur',
    date = new Date().toISOString().split('T')[0]
  } = req.query;

  const prayerTimes = calculatePrayerTimes(state as string, city as string, date as string);

  res.json({
    success: true,
    data: {
      location: {
        state: state,
        city: city,
        coordinates: getLocationCoordinates(state as string, city as string)
      },
      date: date,
      prayer_times: prayerTimes,
      healthcare_considerations: {
        appointment_scheduling: {
          avoid_during_prayers: true,
          buffer_before_prayers: 15, // minutes
          buffer_after_prayers: 15   // minutes
        },
        friday_special: date && new Date(date as string).getDay() === 5 ? {
          jumuah_prayer: '12:30-14:00',
          extended_avoid_period: true,
          recommendation: 'Schedule appointments before 12:00 or after 14:30'
        } : null
      }
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * Get prayer times for multiple days (weekly schedule)
 */
router.get('/weekly', [
  query('state').optional().isIn([
    'JHR', 'KDH', 'KTN', 'MLK', 'NSN', 'PHG', 'PRK', 'PLS',
    'PNG', 'SBH', 'SWK', 'SGR', 'TRG', 'KUL', 'LBN', 'PJY'
  ]),
  query('start_date').optional().isISO8601()
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Invalid weekly prayer time parameters',
      details: errors.array()
    });
  }

  const { state = 'KUL', start_date } = req.query;
  const startDate = start_date ? new Date(start_date as string) : new Date();

  const weeklyPrayerTimes = [];
  for (let i = 0; i < 7; i++) {
    const currentDate = new Date(startDate);
    currentDate.setDate(startDate.getDate() + i);
    const dateString = currentDate.toISOString().split('T')[0];
    
    weeklyPrayerTimes.push({
      date: dateString,
      day_of_week: currentDate.toLocaleDateString('en-US', { weekday: 'long' }),
      is_friday: currentDate.getDay() === 5,
      prayer_times: calculatePrayerTimes(state as string, 'Default', dateString),
      healthcare_recommendations: getHealthcareRecommendations(currentDate)
    });
  }

  res.json({
    success: true,
    data: {
      location: { state },
      period: {
        start_date: startDate.toISOString().split('T')[0],
        end_date: weeklyPrayerTimes[6].date
      },
      weekly_schedule: weeklyPrayerTimes,
      general_guidelines: {
        appointment_buffer: '15 minutes before and after prayer times',
        friday_considerations: 'Extended break for Jumuah prayers (12:30-14:00)',
        emergency_services: 'Available 24/7 regardless of prayer times'
      }
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * Get next upcoming prayer time
 */
router.get('/next', [
  query('state').optional().isIn([
    'JHR', 'KDH', 'KTN', 'MLK', 'NSN', 'PHG', 'PRK', 'PLS',
    'PNG', 'SBH', 'SWK', 'SGR', 'TRG', 'KUL', 'LBN', 'PJY'
  ])
], async (req: Request, res: Response) => {
  const { state = 'KUL' } = req.query;
  const now = new Date();
  const currentTime = now.toTimeString().slice(0, 5);
  const currentDate = now.toISOString().split('T')[0];

  const todayPrayerTimes = calculatePrayerTimes(state as string, 'Default', currentDate);
  const nextPrayer = findNextPrayer(currentTime, todayPrayerTimes);

  res.json({
    success: true,
    data: {
      current_time: currentTime,
      current_date: currentDate,
      location: { state },
      next_prayer: nextPrayer,
      all_today_prayers: todayPrayerTimes,
      healthcare_advice: nextPrayer ? {
        avoid_period_start: subtractMinutes(nextPrayer.time, 15),
        avoid_period_end: addMinutes(nextPrayer.time, 15),
        duration_minutes: 30,
        recommendation: `Avoid scheduling appointments between ${subtractMinutes(nextPrayer.time, 15)} and ${addMinutes(nextPrayer.time, 15)}`
      } : null
    },
    timestamp: new Date().toISOString()
  });
});

/**
 * Check if a specific time conflicts with prayer times
 */
router.post('/check-conflict', [
  query('state').optional().isIn([
    'JHR', 'KDH', 'KTN', 'MLK', 'NSN', 'PHG', 'PRK', 'PLS',
    'PNG', 'SBH', 'SWK', 'SGR', 'TRG', 'KUL', 'LBN', 'PJY'
  ]),
  query('date').isISO8601().withMessage('Date required in ISO format'),
  query('time').matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Time must be in HH:MM format'),
  query('duration').optional().isInt({ min: 5, max: 480 }).withMessage('Duration in minutes (5-480)')
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Invalid conflict check parameters',
      details: errors.array()
    });
  }

  const { 
    state = 'KUL',
    date,
    time,
    duration = 30
  } = req.query;

  const appointmentDate = new Date(date as string);
  const prayerTimes = calculatePrayerTimes(state as string, 'Default', date as string);
  
  const appointmentStart = time as string;
  const appointmentEnd = addMinutes(appointmentStart, Number(duration));
  
  const conflicts = checkPrayerConflicts(appointmentStart, appointmentEnd, prayerTimes, appointmentDate.getDay() === 5);

  res.json({
    success: true,
    data: {
      appointment_details: {
        date: date,
        start_time: appointmentStart,
        end_time: appointmentEnd,
        duration_minutes: Number(duration)
      },
      location: { state },
      conflict_analysis: conflicts,
      recommendations: conflicts.has_conflict ? 
        getAlternativeTimeSlots(appointmentStart, Number(duration), prayerTimes) : 
        { message: 'No conflicts detected', status: 'approved' }
    },
    timestamp: new Date().toISOString()
  });
});

// Helper functions
function calculatePrayerTimes(state: string, city: string, date: string): Record<string, string> {
  // In production, this would call JAKIM API or similar service
  // For now, returning approximate prayer times for Malaysian timezone
  const baseDate = new Date(date + 'T00:00:00+08:00');
  
  // Approximate prayer times (would vary by location and season)
  const prayerTimes = {
    fajr: '05:45',
    syuruk: '07:05',  // Sunrise
    dhuhr: '13:15',   // Noon
    asr: '16:30',     // Afternoon
    maghrib: '19:20', // Sunset
    isha: '20:35'     // Night
  };

  // Adjust times slightly based on state (simplified for demo)
  const stateAdjustments: Record<string, number> = {
    'KTN': -10,  // Kelantan (eastern, earlier)
    'SBH': 30,   // Sabah (eastern timezone)
    'SWK': 30,   // Sarawak
    'PNG': -5,   // Penang (northern)
    'JHR': 5     // Johor (southern)
  };

  const adjustment = stateAdjustments[state] || 0;
  const adjustedTimes: Record<string, string> = {};

  Object.entries(prayerTimes).forEach(([prayer, time]) => {
    adjustedTimes[prayer] = addMinutes(time, adjustment);
  });

  return adjustedTimes;
}

function getLocationCoordinates(state: string, city: string): { lat: number; lng: number } {
  const stateCoordinates: Record<string, { lat: number; lng: number }> = {
    'KUL': { lat: 3.1390, lng: 101.6869 },
    'SGR': { lat: 3.0738, lng: 101.5183 },
    'JHR': { lat: 1.4927, lng: 103.7414 },
    'PNG': { lat: 5.4164, lng: 100.3327 },
    'KDH': { lat: 6.1184, lng: 100.3685 },
    'KTN': { lat: 6.1254, lng: 102.2381 },
    'TRG': { lat: 5.3117, lng: 103.1324 },
    'PHG': { lat: 3.8126, lng: 103.3256 },
    'PRK': { lat: 4.5975, lng: 101.0901 },
    'PLS': { lat: 6.4414, lng: 100.1986 },
    'MLK': { lat: 2.1896, lng: 102.2501 },
    'NSN': { lat: 2.7297, lng: 101.9381 },
    'SBH': { lat: 5.9788, lng: 116.0753 },
    'SWK': { lat: 1.5533, lng: 110.3592 },
    'LBN': { lat: 5.2831, lng: 115.2308 },
    'PJY': { lat: 2.9264, lng: 101.6964 }
  };
  
  return stateCoordinates[state] || stateCoordinates['KUL'];
}

function findNextPrayer(currentTime: string, prayerTimes: Record<string, string>): { name: string; time: string } | null {
  const prayers = [
    { name: 'Fajr', time: prayerTimes.fajr },
    { name: 'Dhuhr', time: prayerTimes.dhuhr },
    { name: 'Asr', time: prayerTimes.asr },
    { name: 'Maghrib', time: prayerTimes.maghrib },
    { name: 'Isha', time: prayerTimes.isha }
  ];

  for (const prayer of prayers) {
    if (prayer.time > currentTime) {
      return prayer;
    }
  }

  // If past Isha, next prayer is tomorrow's Fajr
  return { name: 'Fajr (tomorrow)', time: prayerTimes.fajr };
}

function checkPrayerConflicts(startTime: string, endTime: string, prayerTimes: Record<string, string>, isFriday: boolean): any {
  const conflicts = [];
  const buffer = 15; // minutes

  Object.entries(prayerTimes).forEach(([prayer, time]) => {
    const prayerStart = subtractMinutes(time, buffer);
    const prayerEnd = addMinutes(time, buffer);

    if (timeOverlaps(startTime, endTime, prayerStart, prayerEnd)) {
      conflicts.push({
        prayer_name: prayer,
        prayer_time: time,
        avoid_period: `${prayerStart}-${prayerEnd}`,
        severity: prayer === 'dhuhr' && isFriday ? 'high' : 'medium'
      });
    }
  });

  // Special Friday prayer consideration
  if (isFriday && timeOverlaps(startTime, endTime, '12:00', '14:30')) {
    conflicts.push({
      prayer_name: 'jumuah',
      prayer_time: '13:00',
      avoid_period: '12:00-14:30',
      severity: 'high',
      note: 'Extended period for Friday congregational prayers'
    });
  }

  return {
    has_conflict: conflicts.length > 0,
    conflicts: conflicts,
    severity: conflicts.some(c => c.severity === 'high') ? 'high' : 
              conflicts.length > 0 ? 'medium' : 'none'
  };
}

function getHealthcareRecommendations(date: Date): any {
  const dayOfWeek = date.getDay();
  
  return {
    optimal_appointment_slots: [
      '08:00-11:30',
      '14:30-16:00',
      '17:00-18:30'
    ],
    avoid_slots: [
      '05:30-06:00', // Fajr
      '13:00-13:45', // Dhuhr
      '16:15-16:45', // Asr
      '19:05-19:35', // Maghrib
      '20:20-20:50'  // Isha
    ],
    special_considerations: dayOfWeek === 5 ? 
      'Friday: Extended break 12:00-14:30 for Jumuah prayers' : 
      'Standard prayer time avoidance applies',
    emergency_services: 'Available 24/7 regardless of prayer schedules'
  };
}

function getAlternativeTimeSlots(originalTime: string, duration: number, prayerTimes: Record<string, string>): any {
  // Simple algorithm to suggest alternative times
  const alternatives = [];
  const slots = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '14:30', '15:00', '15:30', '16:00', '17:00', '17:30', '18:00', '18:30'
  ];

  for (const slot of slots) {
    const endTime = addMinutes(slot, duration);
    const conflicts = checkPrayerConflicts(slot, endTime, prayerTimes, false);
    
    if (!conflicts.has_conflict) {
      alternatives.push({
        start_time: slot,
        end_time: endTime,
        duration_minutes: duration,
        status: 'recommended'
      });
    }
    
    if (alternatives.length >= 3) break;
  }

  return {
    alternatives: alternatives,
    recommendation: 'Consider these alternative time slots to avoid prayer time conflicts'
  };
}

// Utility functions
function addMinutes(time: string, minutes: number): string {
  const [hours, mins] = time.split(':').map(Number);
  const totalMinutes = hours * 60 + mins + minutes;
  const newHours = Math.floor(totalMinutes / 60) % 24;
  const newMins = totalMinutes % 60;
  return `${newHours.toString().padStart(2, '0')}:${newMins.toString().padStart(2, '0')}`;
}

function subtractMinutes(time: string, minutes: number): string {
  return addMinutes(time, -minutes);
}

function timeOverlaps(start1: string, end1: string, start2: string, end2: string): boolean {
  return start1 < end2 && end1 > start2;
}

export default router;