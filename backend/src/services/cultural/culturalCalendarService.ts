/**
 * Malaysian Cultural Calendar Service
 * Provides Islamic calendar integration and cultural event management
 * Supports Ramadan scheduling, Malaysian holidays, and religious observances
 */

export interface IslamicDate {
  hijri_year: number;
  hijri_month: number;
  hijri_day: number;
  month_name: string;
  gregorian_date: Date;
  is_leap_year: boolean;
}

export interface CulturalEvent {
  id: string;
  name: string;
  name_ms: string;
  name_ar?: string;
  type: 'islamic' | 'federal' | 'state' | 'cultural' | 'medical';
  date: Date;
  duration_days: number;
  hijri_date?: IslamicDate;
  description: string;
  healthcare_impact: {
    affects_scheduling: boolean;
    emergency_services_available: boolean;
    routine_appointments: 'normal' | 'reduced' | 'unavailable';
    special_considerations: string[];
  };
  cultural_significance: string[];
  regions_affected: string[]; // Malaysian states
  observance_level: 'national' | 'state' | 'community' | 'optional';
}

export interface RamadanInfo {
  year: number;
  start_date: Date;
  end_date: Date;
  duration_days: number;
  fasting_hours: {
    average: number;
    longest: number;
    shortest: number;
  };
  special_dates: {
    laylat_al_qadr?: Date; // Night of Power (estimated)
    eid_al_fitr: Date;
  };
  healthcare_considerations: {
    medication_adjustments_needed: boolean;
    appointment_preferences: string[];
    emergency_exceptions: string[];
  };
}

export interface HolidaySchedulingImpact {
  date: Date;
  events: CulturalEvent[];
  scheduling_recommendations: {
    routine_appointments: 'schedule_normally' | 'avoid' | 'limited_slots';
    emergency_services: 'normal' | 'reduced' | 'emergency_only';
    elective_procedures: 'available' | 'reschedule' | 'urgent_only';
    staff_availability: 'full' | 'reduced' | 'minimum';
  };
  patient_considerations: string[];
  alternative_dates: Date[];
}

export class CulturalCalendarService {
  private events: Map<string, CulturalEvent> = new Map();
  private ramadanCache: Map<number, RamadanInfo> = new Map();
  private initialized = false;

  // Islamic months
  private readonly ISLAMIC_MONTHS = [
    'Muharram', 'Safar', 'Rabi\' al-awwal', 'Rabi\' al-thani',
    'Jumada al-awwal', 'Jumada al-thani', 'Rajab', 'Sha\'ban',
    'Ramadan', 'Shawwal', 'Dhu al-Qi\'dah', 'Dhu al-Hijjah'
  ];

  // Major Islamic events (approximate dates - should use proper lunar calendar in production)
  private readonly ANNUAL_ISLAMIC_EVENTS = [
    {
      name: 'Ramadan',
      name_ms: 'Bulan Ramadan',
      month: 9, // Ramadan
      duration: 30,
      type: 'fasting_month'
    },
    {
      name: 'Eid al-Fitr',
      name_ms: 'Hari Raya Aidilfitri',
      month: 10, // Shawwal
      day: 1,
      duration: 2,
      type: 'celebration'
    },
    {
      name: 'Eid al-Adha',
      name_ms: 'Hari Raya Aidiladha',
      month: 12, // Dhu al-Hijjah
      day: 10,
      duration: 1,
      type: 'celebration'
    },
    {
      name: 'Maulidur Rasul',
      name_ms: 'Maulidur Rasul',
      month: 3, // Rabi\' al-awwal
      day: 12,
      duration: 1,
      type: 'religious'
    },
    {
      name: 'Israk and Mikraj',
      name_ms: 'Israk dan Mikraj',
      month: 7, // Rajab
      day: 27,
      duration: 1,
      type: 'religious'
    }
  ];

  // Malaysian federal holidays
  private readonly FEDERAL_HOLIDAYS = [
    {
      name: 'New Year\'s Day',
      name_ms: 'Hari Tahun Baru',
      date: { month: 1, day: 1 },
      duration: 1
    },
    {
      name: 'Chinese New Year',
      name_ms: 'Tahun Baru Cina',
      date: { month: 2, day: 10 }, // Varies annually
      duration: 2
    },
    {
      name: 'Labour Day',
      name_ms: 'Hari Buruh',
      date: { month: 5, day: 1 },
      duration: 1
    },
    {
      name: 'Wesak Day',
      name_ms: 'Hari Wesak',
      date: { month: 5, day: 15 }, // Varies based on lunar calendar
      duration: 1
    },
    {
      name: 'Yang di-Pertuan Agong\'s Birthday',
      name_ms: 'Hari Keputeraan Yang di-Pertuan Agong',
      date: { month: 6, day: 6 }, // First Saturday of June
      duration: 1
    },
    {
      name: 'National Day',
      name_ms: 'Hari Kebangsaan',
      date: { month: 8, day: 31 },
      duration: 1
    },
    {
      name: 'Malaysia Day',
      name_ms: 'Hari Malaysia',
      date: { month: 9, day: 16 },
      duration: 1
    },
    {
      name: 'Deepavali',
      name_ms: 'Deepavali',
      date: { month: 10, day: 24 }, // Varies annually
      duration: 1
    },
    {
      name: 'Christmas Day',
      name_ms: 'Hari Krismas',
      date: { month: 12, day: 25 },
      duration: 1
    }
  ];

  /**
   * Initialize the cultural calendar service
   */
  async initialize(): Promise<void> {
    console.log('📅 Initializing Malaysian Cultural Calendar Service...');
    
    try {
      await this.loadAnnualEvents();
      await this.calculateRamadanDates();
      await this.loadStateHolidays();
      
      this.initialized = true;
      console.log(`✅ Cultural Calendar initialized with ${this.events.size} events`);
    } catch (error) {
      console.error('❌ Failed to initialize Cultural Calendar Service:', error);
      throw error;
    }
  }

  /**
   * Get Ramadan information for a specific year
   */
  async getRamadanInfo(year: number): Promise<RamadanInfo> {
    if (!this.initialized) {
      throw new Error('Cultural Calendar Service not initialized');
    }

    // Check cache first
    let ramadanInfo = this.ramadanCache.get(year);
    if (!ramadanInfo) {
      ramadanInfo = await this.calculateRamadanForYear(year);
      this.ramadanCache.set(year, ramadanInfo);
    }

    return ramadanInfo;
  }

  /**
   * Check if a date falls during Ramadan
   */
  async isRamadan(date: Date): Promise<{
    is_ramadan: boolean;
    ramadan_day?: number;
    days_remaining?: number;
    ramadan_info?: RamadanInfo;
  }> {
    const year = date.getFullYear();
    const ramadanInfo = await this.getRamadanInfo(year);

    if (date >= ramadanInfo.start_date && date <= ramadanInfo.end_date) {
      const ramadanDay = Math.floor(
        (date.getTime() - ramadanInfo.start_date.getTime()) / (1000 * 60 * 60 * 24)
      ) + 1;
      
      const daysRemaining = Math.floor(
        (ramadanInfo.end_date.getTime() - date.getTime()) / (1000 * 60 * 60 * 24)
      );

      return {
        is_ramadan: true,
        ramadan_day: ramadanDay,
        days_remaining: daysRemaining,
        ramadan_info: ramadanInfo
      };
    }

    return { is_ramadan: false };
  }

  /**
   * Get cultural events for a specific date range
   */
  async getCulturalEvents(
    startDate: Date,
    endDate: Date,
    eventTypes?: CulturalEvent['type'][],
    regions?: string[]
  ): Promise<CulturalEvent[]> {
    if (!this.initialized) {
      throw new Error('Cultural Calendar Service not initialized');
    }

    const events: CulturalEvent[] = [];

    for (const event of this.events.values()) {
      // Check date range
      if (event.date >= startDate && event.date <= endDate) {
        // Filter by type if specified
        if (eventTypes && !eventTypes.includes(event.type)) {
          continue;
        }

        // Filter by region if specified
        if (regions && !regions.some(region => event.regions_affected.includes(region))) {
          continue;
        }

        events.push(event);
      }
    }

    return events.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  /**
   * Get scheduling impact for a specific date
   */
  async getSchedulingImpact(date: Date, region?: string): Promise<HolidaySchedulingImpact> {
    const dayEvents = await this.getCulturalEvents(
      date,
      new Date(date.getTime() + 24 * 60 * 60 * 1000),
      undefined,
      region ? [region] : undefined
    );

    let routineAppointments: HolidaySchedulingImpact['scheduling_recommendations']['routine_appointments'] = 'schedule_normally';
    let emergencyServices: HolidaySchedulingImpact['scheduling_recommendations']['emergency_services'] = 'normal';
    let electiveProcedures: HolidaySchedulingImpact['scheduling_recommendations']['elective_procedures'] = 'available';
    let staffAvailability: HolidaySchedulingImpact['scheduling_recommendations']['staff_availability'] = 'full';

    const patientConsiderations: string[] = [];
    const alternativeDates: Date[] = [];

    // Check for major holidays
    const majorHolidays = dayEvents.filter(e => 
      e.observance_level === 'national' || e.type === 'islamic'
    );

    if (majorHolidays.length > 0) {
      routineAppointments = 'avoid';
      emergencyServices = 'emergency_only';
      electiveProcedures = 'urgent_only';
      staffAvailability = 'minimum';
      
      patientConsiderations.push(
        'Major religious/national holiday - limited services available',
        'Emergency services remain operational',
        'Consider rescheduling non-urgent appointments'
      );

      // Suggest alternative dates (next 7 days excluding weekends and holidays)
      for (let i = 1; i <= 7; i++) {
        const altDate = new Date(date.getTime() + i * 24 * 60 * 60 * 1000);
        const altEvents = await this.getCulturalEvents(altDate, altDate, undefined, region ? [region] : undefined);
        const altMajorHolidays = altEvents.filter(e => 
          e.observance_level === 'national' || e.type === 'islamic'
        );
        
        if (altMajorHolidays.length === 0 && altDate.getDay() !== 0 && altDate.getDay() !== 6) {
          alternativeDates.push(altDate);
          if (alternativeDates.length >= 3) break;
        }
      }
    }

    // Check for Ramadan considerations
    const ramadanStatus = await this.isRamadan(date);
    if (ramadanStatus.is_ramadan) {
      patientConsiderations.push(
        'During Ramadan - consider fasting schedule for appointments',
        'Prefer early morning or evening appointments',
        'Medication timing may need adjustment'
      );

      if (routineAppointments === 'schedule_normally') {
        routineAppointments = 'limited_slots';
      }
    }

    return {
      date,
      events: dayEvents,
      scheduling_recommendations: {
        routine_appointments: routineAppointments,
        emergency_services: emergencyServices,
        elective_procedures: electiveProcedures,
        staff_availability: staffAvailability
      },
      patient_considerations: patientConsiderations,
      alternative_dates: alternativeDates
    };
  }

  /**
   * Get Islamic (Hijri) date for a Gregorian date
   */
  getHijriDate(gregorianDate: Date): IslamicDate {
    // Simplified Hijri calculation - use proper Islamic calendar library in production
    const HIJRI_EPOCH = new Date('622-07-16'); // Approximate
    const daysSinceEpoch = Math.floor(
      (gregorianDate.getTime() - HIJRI_EPOCH.getTime()) / (1000 * 60 * 60 * 24)
    );

    // Approximate conversion (actual Islamic calendar is lunar and more complex)
    const hijriYear = Math.floor(daysSinceEpoch / 354) + 1; // Islamic year is ~354 days
    const dayOfYear = daysSinceEpoch % 354;
    const hijriMonth = Math.floor(dayOfYear / 29.5) + 1; // Islamic month is ~29.5 days
    const hijriDay = Math.floor(dayOfYear % 29.5) + 1;

    return {
      hijri_year: hijriYear,
      hijri_month: Math.min(hijriMonth, 12),
      hijri_day: Math.min(hijriDay, 30),
      month_name: this.ISLAMIC_MONTHS[Math.min(hijriMonth - 1, 11)],
      gregorian_date: gregorianDate,
      is_leap_year: hijriYear % 30 < 11 // Approximate leap year calculation
    };
  }

  /**
   * Get optimal appointment times during Ramadan
   */
  async getRamadanFriendlyTimes(date: Date, stateCode: string): Promise<{
    recommended_times: string[];
    avoid_times: string[];
    considerations: string[];
  }> {
    const ramadanStatus = await this.isRamadan(date);
    
    if (!ramadanStatus.is_ramadan) {
      return {
        recommended_times: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'],
        avoid_times: [],
        considerations: ['Normal scheduling - not during Ramadan']
      };
    }

    // Approximate prayer and iftar times for Malaysia
    const fastingPeriod = {
      start: '05:45', // Around Fajr
      end: '19:20'     // Maghrib (iftar)
    };

    return {
      recommended_times: [
        '05:00', '05:30', // Before fasting starts
        '08:00', '09:00', '10:00', '11:00', // Mid-morning
        '20:00', '20:30', '21:00' // After iftar
      ],
      avoid_times: [
        '12:00', '13:00', '14:00', // Lunch time during fasting
        '17:00', '18:00', '19:00', '19:15' // Close to iftar
      ],
      considerations: [
        'Patient may be fasting from dawn to sunset',
        'Energy levels may be lower during afternoon',
        'Prefer morning or evening appointments',
        'Allow extra time for appointments during Ramadan',
        'Consider medication timing adjustments'
      ]
    };
  }

  /**
   * Check if a date has any cultural significance
   */
  async getCulturalSignificance(date: Date): Promise<{
    has_significance: boolean;
    events: CulturalEvent[];
    islamic_date: IslamicDate;
    recommendations: string[];
  }> {
    const events = await this.getCulturalEvents(date, date);
    const islamicDate = this.getHijriDate(date);
    const recommendations: string[] = [];

    if (events.length > 0) {
      recommendations.push(
        ...events.map(e => `${e.name}: ${e.cultural_significance.join(', ')}`)
      );
    }

    // Check for Islamic calendar significance
    if (islamicDate.hijri_month === 9) { // Ramadan
      recommendations.push('Holy month of Ramadan - consider fasting schedule');
    } else if (islamicDate.hijri_month === 12 && islamicDate.hijri_day >= 8 && islamicDate.hijri_day <= 13) {
      recommendations.push('Hajj period - significant for Muslim patients');
    }

    return {
      has_significance: events.length > 0 || recommendations.length > 0,
      events,
      islamic_date: islamicDate,
      recommendations
    };
  }

  // Private methods

  private async loadAnnualEvents(): Promise<void> {
    const currentYear = new Date().getFullYear();
    
    // Load Islamic events
    for (const islamicEvent of this.ANNUAL_ISLAMIC_EVENTS) {
      const eventId = `${islamicEvent.name}_${currentYear}`;
      
      // Calculate approximate date (in production, use proper lunar calendar)
      const approximateDate = this.calculateIslamicEventDate(islamicEvent, currentYear);
      
      const event: CulturalEvent = {
        id: eventId,
        name: islamicEvent.name,
        name_ms: islamicEvent.name_ms,
        type: 'islamic',
        date: approximateDate,
        duration_days: islamicEvent.duration,
        description: `Islamic observance: ${islamicEvent.name}`,
        healthcare_impact: {
          affects_scheduling: true,
          emergency_services_available: true,
          routine_appointments: islamicEvent.type === 'fasting_month' ? 'reduced' : 'unavailable',
          special_considerations: [
            'Consider patient religious obligations',
            'Adjust medication timing if needed',
            'Respect cultural practices'
          ]
        },
        cultural_significance: [
          `Islamic ${islamicEvent.type}`,
          'Observed by Muslim population'
        ],
        regions_affected: ['ALL'], // All Malaysian states
        observance_level: 'national'
      };

      this.events.set(eventId, event);
    }

    // Load federal holidays
    for (const holiday of this.FEDERAL_HOLIDAYS) {
      const eventId = `${holiday.name.replace(/\s+/g, '_')}_${currentYear}`;
      const holidayDate = new Date(currentYear, holiday.date.month - 1, holiday.date.day);
      
      const event: CulturalEvent = {
        id: eventId,
        name: holiday.name,
        name_ms: holiday.name_ms,
        type: 'federal',
        date: holidayDate,
        duration_days: holiday.duration,
        description: `Malaysian federal holiday: ${holiday.name}`,
        healthcare_impact: {
          affects_scheduling: true,
          emergency_services_available: true,
          routine_appointments: 'unavailable',
          special_considerations: [
            'Public holiday - limited services',
            'Emergency services remain available'
          ]
        },
        cultural_significance: [
          'Malaysian federal holiday',
          'Observed nationwide'
        ],
        regions_affected: ['ALL'],
        observance_level: 'national'
      };

      this.events.set(eventId, event);
    }

    console.log(`📅 Loaded ${this.events.size} cultural events`);
  }

  private calculateIslamicEventDate(islamicEvent: any, year: number): Date {
    // Simplified Islamic date calculation
    // In production, use proper lunar calendar libraries like Hijri-Date or similar
    
    const baseDate = new Date(year, 0, 1); // Start of Gregorian year
    const approximateDays = (islamicEvent.month - 1) * 29.5 + (islamicEvent.day || 1);
    
    // Adjust for Islamic year being ~11 days shorter
    const adjustment = Math.floor(year * 11 / 365) * -1;
    
    return new Date(baseDate.getTime() + (approximateDays + adjustment) * 24 * 60 * 60 * 1000);
  }

  private async calculateRamadanDates(): Promise<void> {
    const currentYear = new Date().getFullYear();
    
    // Calculate for current and next year
    for (let year = currentYear; year <= currentYear + 1; year++) {
      const ramadanInfo = await this.calculateRamadanForYear(year);
      this.ramadanCache.set(year, ramadanInfo);
    }
  }

  private async calculateRamadanForYear(year: number): Promise<RamadanInfo> {
    // Simplified Ramadan calculation - use proper Islamic calendar in production
    // Ramadan dates vary each year and move ~11 days earlier annually
    
    const ramadanStart = this.calculateIslamicEventDate({
      name: 'Ramadan',
      month: 9,
      day: 1
    }, year);

    const ramadanEnd = new Date(ramadanStart.getTime() + 29 * 24 * 60 * 60 * 1000);
    const eidAlFitr = new Date(ramadanEnd.getTime() + 24 * 60 * 60 * 1000);

    // Calculate Laylat al-Qadr (Night of Power) - typically on odd nights in last 10 days
    const laylatAlQadr = new Date(ramadanEnd.getTime() - 3 * 24 * 60 * 60 * 1000); // 27th night (approximate)

    return {
      year,
      start_date: ramadanStart,
      end_date: ramadanEnd,
      duration_days: 30,
      fasting_hours: {
        average: 13.5, // Average for Malaysia
        longest: 14.0,
        shortest: 13.0
      },
      special_dates: {
        laylat_al_qadr: laylatAlQadr,
        eid_al_fitr: eidAlFitr
      },
      healthcare_considerations: {
        medication_adjustments_needed: true,
        appointment_preferences: [
          'Early morning before sunrise',
          'Evening after sunset',
          'Avoid mid-day appointments'
        ],
        emergency_exceptions: [
          'Life-threatening conditions',
          'Chronic disease management',
          'Pregnancy-related care',
          'Elderly and children exemptions'
        ]
      }
    };
  }

  private async loadStateHolidays(): Promise<void> {
    // Mock state-specific holidays
    const stateHolidays = [
      {
        name: 'Federal Territory Day',
        name_ms: 'Hari Wilayah Persekutuan',
        date: { month: 2, day: 1 },
        states: ['KUL', 'LBN', 'PJY']
      },
      {
        name: 'Sabah Day',
        name_ms: 'Hari Sabah',
        date: { month: 5, day: 30 },
        states: ['SBH']
      },
      {
        name: 'Sarawak Day',
        name_ms: 'Hari Sarawak',
        date: { month: 7, day: 22 },
        states: ['SWK']
      }
    ];

    const currentYear = new Date().getFullYear();
    
    for (const stateHoliday of stateHolidays) {
      const eventId = `${stateHoliday.name.replace(/\s+/g, '_')}_${currentYear}`;
      const holidayDate = new Date(currentYear, stateHoliday.date.month - 1, stateHoliday.date.day);
      
      const event: CulturalEvent = {
        id: eventId,
        name: stateHoliday.name,
        name_ms: stateHoliday.name_ms,
        type: 'state',
        date: holidayDate,
        duration_days: 1,
        description: `State holiday: ${stateHoliday.name}`,
        healthcare_impact: {
          affects_scheduling: true,
          emergency_services_available: true,
          routine_appointments: 'reduced',
          special_considerations: [
            'State holiday - reduced services in affected regions'
          ]
        },
        cultural_significance: [
          'State-level celebration',
          'Regional significance'
        ],
        regions_affected: stateHoliday.states,
        observance_level: 'state'
      };

      this.events.set(eventId, event);
    }
  }
}