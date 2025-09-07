/**
 * Malaysian Holiday Calendar Generator
 * Generates comprehensive holiday calendar including federal, state-specific, and cultural observances
 * Supports healthcare appointment scheduling and medication reminders
 */

const { DateTime } = require('luxon');

class MalaysianHolidayGenerator {
  constructor() {
    // Malaysian states and territories
    this.states = {
      'JHR': 'Johor',
      'KDH': 'Kedah',
      'KTN': 'Kelantan',
      'MLK': 'Melaka',
      'NSN': 'Negeri Sembilan',
      'PHG': 'Pahang',
      'PRK': 'Perak',
      'PLS': 'Perlis',
      'PNG': 'Penang',
      'SBH': 'Sabah',
      'SWK': 'Sarawak',
      'SGR': 'Selangor',
      'TRG': 'Terengganu',
      'KUL': 'Kuala Lumpur',
      'LBN': 'Labuan',
      'PJY': 'Putrajaya'
    };

    // Holiday types for healthcare impact assessment
    this.holidayTypes = {
      FEDERAL: 'federal',
      STATE: 'state',
      RELIGIOUS_MUSLIM: 'religious_muslim',
      RELIGIOUS_CHINESE: 'religious_chinese',
      RELIGIOUS_HINDU: 'religious_hindu',
      RELIGIOUS_CHRISTIAN: 'religious_christian',
      CULTURAL: 'cultural',
      HARVEST: 'harvest'
    };

    // Healthcare impact levels
    this.healthcareImpact = {
      HIGH: 'high',      // Most services closed
      MEDIUM: 'medium',  // Some services available
      LOW: 'low'         // Minimal impact
    };
  }

  /**
   * Generate complete holiday calendar for a given year
   * @param {number} year - Target year
   * @returns {Array} Array of holiday objects
   */
  generateHolidayCalendar(year) {
    const holidays = [];

    // Federal holidays (fixed dates)
    holidays.push(...this.generateFederalFixedHolidays(year));
    
    // Federal holidays (variable dates)
    holidays.push(...this.generateFederalVariableHolidays(year));
    
    // State-specific holidays
    holidays.push(...this.generateStateHolidays(year));
    
    // Religious observances
    holidays.push(...this.generateReligiousObservances(year));
    
    // Cultural festivals
    holidays.push(...this.generateCulturalFestivals(year));

    // Sort by date and return
    return holidays.sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  /**
   * Generate federal holidays with fixed dates
   */
  generateFederalFixedHolidays(year) {
    return [
      {
        id: `new-year-${year}`,
        name: 'New Year\'s Day',
        name_bm: 'Hari Tahun Baru',
        name_zh: '元旦',
        name_ta: 'புத்தாண்டு நாள்',
        date: `${year}-01-01`,
        type: this.holidayTypes.FEDERAL,
        is_federal: true,
        states: Object.keys(this.states),
        healthcare_impact: this.healthcareImpact.HIGH,
        description: 'International New Year celebration',
        cultural_significance: 'Global celebration marking the beginning of the Gregorian calendar year',
        healthcare_notes: 'All non-emergency services closed, limited pharmacy hours'
      },
      {
        id: `national-day-${year}`,
        name: 'National Day',
        name_bm: 'Hari Kebangsaan',
        name_zh: '国庆日',
        name_ta: 'தேசிய நாள்',
        date: `${year}-08-31`,
        type: this.holidayTypes.FEDERAL,
        is_federal: true,
        states: Object.keys(this.states),
        healthcare_impact: this.healthcareImpact.HIGH,
        description: 'Malaysia\'s Independence Day',
        cultural_significance: 'Celebrates Malaysia\'s independence from British colonial rule in 1957',
        healthcare_notes: 'National holiday, all government healthcare services closed'
      },
      {
        id: `malaysia-day-${year}`,
        name: 'Malaysia Day',
        name_bm: 'Hari Malaysia',
        name_zh: '马来西亚日',
        name_ta: 'மலேசிய தினம்',
        date: `${year}-09-16`,
        type: this.holidayTypes.FEDERAL,
        is_federal: true,
        states: Object.keys(this.states),
        healthcare_impact: this.healthcareImpact.HIGH,
        description: 'Formation of Malaysia',
        cultural_significance: 'Commemorates the formation of Malaysia in 1963',
        healthcare_notes: 'Federal holiday, government healthcare services closed'
      },
      {
        id: `christmas-${year}`,
        name: 'Christmas Day',
        name_bm: 'Hari Krismas',
        name_zh: '圣诞节',
        name_ta: 'கிறிஸ்துமஸ்',
        date: `${year}-12-25`,
        type: this.holidayTypes.RELIGIOUS_CHRISTIAN,
        is_federal: true,
        states: Object.keys(this.states),
        healthcare_impact: this.healthcareImpact.MEDIUM,
        description: 'Christian celebration of the birth of Jesus Christ',
        cultural_significance: 'Celebrated by Malaysian Christian community',
        healthcare_notes: 'Private hospitals may operate with reduced hours'
      }
    ];
  }

  /**
   * Generate federal holidays with variable dates (requires calculation)
   */
  generateFederalVariableHolidays(year) {
    const holidays = [];

    // Chinese New Year (1st and 2nd day)
    const chineseNewYear = this.calculateChineseNewYear(year);
    if (chineseNewYear) {
      holidays.push({
        id: `cny-day1-${year}`,
        name: 'Chinese New Year',
        name_bm: 'Tahun Baru Cina',
        name_zh: '农历新年',
        name_ta: 'சீன புத்தாண்டு',
        date: chineseNewYear.toISODate(),
        type: this.holidayTypes.RELIGIOUS_CHINESE,
        is_federal: true,
        states: Object.keys(this.states),
        healthcare_impact: this.healthcareImpact.HIGH,
        description: 'First day of Chinese Lunar New Year',
        cultural_significance: 'Most important celebration for Malaysian Chinese community',
        healthcare_notes: 'Many private services closed, stock up medications'
      });

      holidays.push({
        id: `cny-day2-${year}`,
        name: 'Chinese New Year (2nd Day)',
        name_bm: 'Tahun Baru Cina (Hari Kedua)',
        name_zh: '农历新年 (第二天)',
        name_ta: 'சீன புத்தாண்டு (இரண்டாம் நாள்)',
        date: chineseNewYear.plus({ days: 1 }).toISODate(),
        type: this.holidayTypes.RELIGIOUS_CHINESE,
        is_federal: true,
        states: Object.keys(this.states),
        healthcare_impact: this.healthcareImpact.HIGH,
        description: 'Second day of Chinese Lunar New Year',
        cultural_significance: 'Family reunion and ancestral worship day',
        healthcare_notes: 'Limited emergency services only'
      });
    }

    // Vesak Day (Buddha's birthday)
    const vesakDay = this.calculateVesakDay(year);
    if (vesakDay) {
      holidays.push({
        id: `vesak-${year}`,
        name: 'Vesak Day',
        name_bm: 'Hari Wesak',
        name_zh: '卫塞节',
        name_ta: 'வேசாக் தினம்',
        date: vesakDay.toISODate(),
        type: this.holidayTypes.RELIGIOUS_HINDU,
        is_federal: true,
        states: Object.keys(this.states),
        healthcare_impact: this.healthcareImpact.MEDIUM,
        description: 'Buddha\'s birthday, enlightenment and death',
        cultural_significance: 'Important Buddhist observance',
        healthcare_notes: 'Some services may be reduced'
      });
    }

    // Deepavali (Festival of Lights)
    const deepavali = this.calculateDeepavali(year);
    if (deepavali) {
      holidays.push({
        id: `deepavali-${year}`,
        name: 'Deepavali',
        name_bm: 'Hari Deepavali',
        name_zh: '屠妖节',
        name_ta: 'தீபாவளி',
        date: deepavali.toISODate(),
        type: this.holidayTypes.RELIGIOUS_HINDU,
        is_federal: true,
        states: Object.keys(this.states),
        healthcare_impact: this.healthcareImpact.MEDIUM,
        description: 'Hindu Festival of Lights',
        cultural_significance: 'Victory of light over darkness, celebrated by Malaysian Hindu community',
        healthcare_notes: 'Some private clinics may close early'
      });
    }

    return holidays;
  }

  /**
   * Generate state-specific holidays
   */
  generateStateHolidays(year) {
    const holidays = [];

    // Sultan's birthdays (examples - actual dates vary by year and state)
    const sultanBirthdays = {
      'JHR': { date: `${year}-03-23`, name: 'Sultan of Johor\'s Birthday' },
      'KDH': { date: `${year}-06-19`, name: 'Sultan of Kedah\'s Birthday' },
      'KTN': { date: `${year}-11-11`, name: 'Sultan of Kelantan\'s Birthday' },
      'MLK': { date: `${year}-08-24`, name: 'Governor of Melaka\'s Birthday' },
      'NSN': { date: `${year}-01-14`, name: 'Sultan of Negeri Sembilan\'s Birthday' },
      'PHG': { date: `${year}-10-24`, name: 'Sultan of Pahang\'s Birthday' },
      'PRK': { date: `${year}-11-02`, name: 'Sultan of Perak\'s Birthday' },
      'PLS': { date: `${year}-07-17`, name: 'Raja of Perlis\'s Birthday' },
      'PNG': { date: `${year}-07-07`, name: 'Governor of Penang\'s Birthday' },
      'SBH': { date: `${year}-10-07`, name: 'Governor of Sabah\'s Birthday' },
      'SWK': { date: `${year}-10-07`, name: 'Governor of Sarawak\'s Birthday' },
      'SGR': { date: `${year}-12-11`, name: 'Sultan of Selangor\'s Birthday' },
      'TRG': { date: `${year}-03-04`, name: 'Sultan of Terengganu\'s Birthday' }
    };

    Object.entries(sultanBirthdays).forEach(([state, info]) => {
      holidays.push({
        id: `sultan-birthday-${state.toLowerCase()}-${year}`,
        name: info.name,
        name_bm: info.name, // Could be localized
        date: info.date,
        type: this.holidayTypes.STATE,
        is_federal: false,
        states: [state],
        healthcare_impact: this.healthcareImpact.MEDIUM,
        description: `Birthday celebration of the state ruler`,
        cultural_significance: 'Honors the constitutional monarch of the state',
        healthcare_notes: 'State government services closed, private services may operate'
      });
    });

    // Harvest festivals
    holidays.push({
      id: `gawai-${year}`,
      name: 'Gawai Dayak',
      name_bm: 'Gawai Dayak',
      date: `${year}-06-01`, // Fixed date
      type: this.holidayTypes.HARVEST,
      is_federal: false,
      states: ['SWK'],
      healthcare_impact: this.healthcareImpact.LOW,
      description: 'Harvest festival celebrated by Dayak people',
      cultural_significance: 'Traditional harvest celebration in Sarawak',
      healthcare_notes: 'Minimal impact on healthcare services'
    });

    holidays.push({
      id: `kaamatan-${year}`,
      name: 'Kaamatan (Harvest Festival)',
      name_bm: 'Pesta Kaamatan',
      date: `${year}-05-30`, // Usually May 30-31
      type: this.holidayTypes.HARVEST,
      is_federal: false,
      states: ['SBH'],
      healthcare_impact: this.healthcareImpact.LOW,
      description: 'Harvest festival celebrated by Kadazan-Dusun people',
      cultural_significance: 'Traditional rice harvest celebration in Sabah',
      healthcare_notes: 'Local celebrations, minimal healthcare impact'
    });

    return holidays;
  }

  /**
   * Generate Islamic religious observances (requires Islamic calendar calculation)
   * Note: These dates are estimated and should be verified with official Islamic calendar
   */
  generateReligiousObservances(year) {
    const holidays = [];

    // Estimated Islamic holidays (would need proper Hijri calendar calculation)
    const islamicHolidays = this.estimateIslamicHolidays(year);

    islamicHolidays.forEach(holiday => {
      holidays.push({
        ...holiday,
        type: this.holidayTypes.RELIGIOUS_MUSLIM,
        is_federal: holiday.is_federal || false,
        states: Object.keys(this.states),
        healthcare_impact: this.healthcareImpact.HIGH,
        cultural_significance: holiday.cultural_significance,
        healthcare_notes: holiday.healthcare_notes || 'Check local Islamic calendar for exact dates'
      });
    });

    return holidays;
  }

  /**
   * Generate cultural festivals and observances
   */
  generateCulturalFestivals(year) {
    return [
      {
        id: `thaipusam-${year}`,
        name: 'Thaipusam',
        name_bm: 'Hari Thaipusam',
        name_zh: '大宝森节',
        name_ta: 'தைப்பூசம்',
        date: this.calculateThaipusam(year),
        type: this.holidayTypes.RELIGIOUS_HINDU,
        is_federal: false,
        states: ['JHR', 'PNG', 'PRK', 'SGR', 'NSN', 'KUL'],
        healthcare_impact: this.healthcareImpact.MEDIUM,
        description: 'Hindu festival honoring Lord Murugan',
        cultural_significance: 'Important Tamil Hindu festival involving pilgrimage and devotion',
        healthcare_notes: 'Increased medical support needed at temple locations'
      },
      {
        id: `dragon-boat-${year}`,
        name: 'Dragon Boat Festival',
        name_bm: 'Festival Perahu Naga',
        name_zh: '端午节',
        name_ta: 'டிராகன் படகு திருவிழா',
        date: this.calculateDragonBoatFestival(year),
        type: this.holidayTypes.CULTURAL,
        is_federal: false,
        states: [], // Observed but not official holiday
        healthcare_impact: this.healthcareImpact.LOW,
        description: 'Traditional Chinese festival',
        cultural_significance: 'Commemorates Qu Yuan, involves dragon boat races',
        healthcare_notes: 'Cultural observance, minimal healthcare impact'
      }
    ];
  }

  /**
   * Calculate Chinese New Year date (simplified estimation)
   * In production, use proper lunar calendar library
   */
  calculateChineseNewYear(year) {
    // Simplified calculation - in production use proper lunar calendar
    const cnyDates = {
      2024: '2024-02-10',
      2025: '2025-01-29',
      2026: '2026-02-17',
      2027: '2027-02-06',
      2028: '2028-01-26'
    };
    
    return cnyDates[year] ? DateTime.fromISO(cnyDates[year]) : null;
  }

  /**
   * Calculate Vesak Day (simplified - actual calculation more complex)
   */
  calculateVesakDay(year) {
    const vesakDates = {
      2024: '2024-05-22',
      2025: '2025-05-12',
      2026: '2026-05-31',
      2027: '2027-05-20',
      2028: '2028-05-08'
    };
    
    return vesakDates[year] ? DateTime.fromISO(vesakDates[year]) : null;
  }

  /**
   * Calculate Deepavali date (simplified estimation)
   */
  calculateDeepavali(year) {
    const deepavaliDates = {
      2024: '2024-10-31',
      2025: '2025-10-20',
      2026: '2026-11-08',
      2027: '2027-10-29',
      2028: '2028-10-17'
    };
    
    return deepavaliDates[year] ? DateTime.fromISO(deepavaliDates[year]) : null;
  }

  /**
   * Calculate Thaipusam date
   */
  calculateThaipusam(year) {
    const thaipusamDates = {
      2024: '2024-01-25',
      2025: '2025-02-11',
      2026: '2026-02-01',
      2027: '2027-01-21',
      2028: '2028-02-09'
    };
    
    return thaipusamDates[year] || `${year}-01-25`; // Fallback estimate
  }

  /**
   * Calculate Dragon Boat Festival date
   */
  calculateDragonBoatFestival(year) {
    const dragonBoatDates = {
      2024: '2024-06-10',
      2025: '2025-05-31',
      2026: '2026-06-19',
      2027: '2027-06-09',
      2028: '2028-05-28'
    };
    
    return dragonBoatDates[year] || `${year}-06-10`; // Fallback estimate
  }

  /**
   * Estimate Islamic holidays (simplified - requires proper Hijri calculation)
   */
  estimateIslamicHolidays(year) {
    // Note: These are estimates. Production system should use proper Islamic calendar
    const islamicHolidays = [
      {
        id: `eid-fitr-${year}`,
        name: 'Hari Raya Puasa (Eid al-Fitr)',
        name_bm: 'Hari Raya Puasa',
        name_zh: '开斋节',
        name_ta: 'ஈதுல் ஃபித்ர்',
        date: this.estimateEidFitr(year),
        is_federal: true,
        cultural_significance: 'End of Ramadan fasting month',
        healthcare_notes: 'Major celebration, most services closed'
      },
      {
        id: `eid-adha-${year}`,
        name: 'Hari Raya Haji (Eid al-Adha)',
        name_bm: 'Hari Raya Haji',
        name_zh: '哈芝节',
        name_ta: 'ஈதுல் அள்ஹா',
        date: this.estimateEidAdha(year),
        is_federal: true,
        cultural_significance: 'Festival of Sacrifice during Hajj period',
        healthcare_notes: 'Major Islamic celebration, government services closed'
      }
    ];

    return islamicHolidays;
  }

  estimateEidFitr(year) {
    const eidFitrDates = {
      2024: '2024-04-10',
      2025: '2025-03-30',
      2026: '2026-03-20',
      2027: '2027-03-09',
      2028: '2028-02-26'
    };
    
    return eidFitrDates[year] || `${year}-04-10`;
  }

  estimateEidAdha(year) {
    const eidAdhaDates = {
      2024: '2024-06-17',
      2025: '2025-06-07',
      2026: '2026-05-27',
      2027: '2027-05-16',
      2028: '2028-05-05'
    };
    
    return eidAdhaDates[year] || `${year}-06-17`;
  }

  /**
   * Get healthcare recommendations for specific holidays
   * @param {Object} holiday - Holiday object
   * @returns {Object} Healthcare recommendations
   */
  getHealthcareRecommendations(holiday) {
    const recommendations = {
      holiday_name: holiday.name,
      impact_level: holiday.healthcare_impact,
      recommendations: []
    };

    switch (holiday.healthcare_impact) {
      case this.healthcareImpact.HIGH:
        recommendations.recommendations = [
          'Stock up on essential medications before the holiday',
          'Confirm emergency contact numbers',
          'Check 24-hour pharmacy locations',
          'Reschedule non-urgent appointments',
          'Prepare emergency medication kit'
        ];
        break;

      case this.healthcareImpact.MEDIUM:
        recommendations.recommendations = [
          'Check clinic operating hours',
          'Refill prescriptions if due soon',
          'Keep emergency contacts handy',
          'Plan for possible service delays'
        ];
        break;

      case this.healthcareImpact.LOW:
        recommendations.recommendations = [
          'Normal healthcare services expected',
          'Monitor for any announced changes',
          'Maintain regular medication schedule'
        ];
        break;
    }

    return recommendations;
  }

  /**
   * Filter holidays by state
   * @param {Array} holidays - Array of all holidays
   * @param {string} stateCode - State code (e.g., 'KUL', 'SGR')
   * @returns {Array} Filtered holidays applicable to the state
   */
  getHolidaysForState(holidays, stateCode) {
    return holidays.filter(holiday => 
      holiday.is_federal || holiday.states.includes(stateCode)
    );
  }

  /**
   * Get next upcoming holiday from today
   * @param {Array} holidays - Array of holidays
   * @returns {Object|null} Next holiday or null if none found
   */
  getNextHoliday(holidays) {
    const today = DateTime.now().toISODate();
    const upcomingHolidays = holidays
      .filter(holiday => holiday.date >= today)
      .sort((a, b) => new Date(a.date) - new Date(b.date));
    
    return upcomingHolidays[0] || null;
  }
}

module.exports = MalaysianHolidayGenerator;