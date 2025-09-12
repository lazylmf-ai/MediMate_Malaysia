/**
 * Malaysian Festival Calendar Service
 * 
 * Comprehensive festival and cultural calendar service supporting:
 * - Islamic calendar (Ramadan, Eid, religious observances)  
 * - Chinese calendar (Chinese New Year, Mid-Autumn Festival)
 * - Hindu calendar (Deepavali, Thaipusam)
 * - Malaysian public holidays and cultural events
 * - Medication scheduling integration for fasting periods
 */

import { CulturalCalendarEvent, MalaysianState } from '../../types/cultural';

export interface FestivalEvent {
  id: string;
  name: string;
  nameMs: string;
  nameZh?: string;
  nameTa?: string;
  type: 'islamic' | 'chinese' | 'hindu' | 'malaysian' | 'public_holiday';
  date: Date;
  isLunar: boolean;
  duration: number; // days
  description: string;
  descriptionMs: string;
  medicationImpact: {
    fasting: boolean;
    fastingType?: 'daylight' | 'full_day' | 'partial';
    fastingHours?: { start: string; end: string };
    timingAdjustments: boolean;
    specialConsiderations: string[];
    recommendedScheduling: string[];
  };
  culturalGuidance: {
    preparation: string[];
    observance: string[];
    postFestival: string[];
  };
  stateSpecific?: {
    [key in MalaysianState]?: {
      isObserved: boolean;
      localVariations: string[];
    };
  };
}

export interface RamadanSchedule {
  year: number;
  startDate: Date;
  endDate: Date;
  suhoorTime: string; // Pre-dawn meal
  iftarTime: string; // Breaking fast
  medicationWindows: {
    preSuhoor: { start: string; end: string; description: string };
    postIftar: { start: string; end: string; description: string };
    night: { start: string; end: string; description: string };
  };
  specialDays: {
    date: Date;
    name: string;
    significance: string;
    medicationConsiderations: string[];
  }[];
}

export interface FestivalMedicationGuidance {
  festivalId: string;
  medicationType: 'before_meals' | 'after_meals' | 'with_food' | 'empty_stomach' | 'as_needed';
  adjustedTiming: string[];
  warnings: string[];
  alternatives: string[];
  culturalContext: string;
}

export class FestivalCalendarService {
  private readonly CURRENT_YEAR = new Date().getFullYear();
  private festivalCache = new Map<string, FestivalEvent[]>();
  private ramadanCache = new Map<number, RamadanSchedule>();

  /**
   * Get all festivals for the current year with Malaysian cultural context
   */
  async getFestivalCalendar(year: number = this.CURRENT_YEAR): Promise<FestivalEvent[]> {
    const cacheKey = `festivals_${year}`;
    
    if (this.festivalCache.has(cacheKey)) {
      return this.festivalCache.get(cacheKey)!;
    }

    const festivals = await this.calculateFestivals(year);
    this.festivalCache.set(cacheKey, festivals);
    
    return festivals;
  }

  /**
   * Get festivals for specific cultural types
   */
  async getFestivalsByType(
    type: 'islamic' | 'chinese' | 'hindu' | 'malaysian' | 'public_holiday',
    year: number = this.CURRENT_YEAR
  ): Promise<FestivalEvent[]> {
    const allFestivals = await this.getFestivalCalendar(year);
    return allFestivals.filter(festival => festival.type === type);
  }

  /**
   * Get upcoming festivals within specified days
   */
  async getUpcomingFestivals(daysAhead: number = 30): Promise<FestivalEvent[]> {
    const festivals = await this.getFestivalCalendar();
    const now = new Date();
    const futureDate = new Date(now.getTime() + (daysAhead * 24 * 60 * 60 * 1000));
    
    return festivals
      .filter(festival => festival.date >= now && festival.date <= futureDate)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  /**
   * Check if a date falls during any festival period
   */
  async checkFestivalConflict(date: Date): Promise<{
    hasFestival: boolean;
    festivals: FestivalEvent[];
    medicationImpact: boolean;
    recommendations: string[];
  }> {
    const festivals = await this.getFestivalCalendar(date.getFullYear());
    const conflictingFestivals = festivals.filter(festival => {
      const festivalEnd = new Date(festival.date.getTime() + (festival.duration * 24 * 60 * 60 * 1000));
      return date >= festival.date && date <= festivalEnd;
    });

    const hasMedicationImpact = conflictingFestivals.some(f => 
      f.medicationImpact.fasting || f.medicationImpact.timingAdjustments
    );

    const recommendations = conflictingFestivals.flatMap(f => 
      f.medicationImpact.recommendedScheduling
    );

    return {
      hasFestival: conflictingFestivals.length > 0,
      festivals: conflictingFestivals,
      medicationImpact: hasMedicationImpact,
      recommendations: [...new Set(recommendations)]
    };
  }

  /**
   * Get Ramadan-specific scheduling information
   */
  async getRamadanSchedule(year: number = this.CURRENT_YEAR): Promise<RamadanSchedule> {
    if (this.ramadanCache.has(year)) {
      return this.ramadanCache.get(year)!;
    }

    const schedule = await this.calculateRamadanSchedule(year);
    this.ramadanCache.set(year, schedule);
    
    return schedule;
  }

  /**
   * Check if current date is during Ramadan
   */
  async isCurrentlyRamadan(): Promise<{
    isRamadan: boolean;
    daysRemaining?: number;
    currentPhase?: 'beginning' | 'middle' | 'end';
    medicationGuidance: string[];
  }> {
    const now = new Date();
    const ramadanSchedule = await this.getRamadanSchedule(now.getFullYear());
    
    const isRamadan = now >= ramadanSchedule.startDate && now <= ramadanSchedule.endDate;
    
    if (!isRamadan) {
      return {
        isRamadan: false,
        medicationGuidance: []
      };
    }

    const daysRemaining = Math.ceil(
      (ramadanSchedule.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    const totalDays = Math.ceil(
      (ramadanSchedule.endDate.getTime() - ramadanSchedule.startDate.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    const daysElapsed = totalDays - daysRemaining;
    const currentPhase = daysElapsed < 10 ? 'beginning' : 
                        daysElapsed > totalDays - 10 ? 'end' : 'middle';

    const medicationGuidance = [
      'Schedule medications for Suhoor (pre-dawn) or after Iftar (evening)',
      'Consider extended-release medications if available',
      'Stay hydrated during non-fasting hours',
      'Monitor blood sugar if diabetic',
      'Consult healthcare provider for critical medications'
    ];

    return {
      isRamadan,
      daysRemaining,
      currentPhase,
      medicationGuidance
    };
  }

  /**
   * Get medication guidance for specific festivals
   */
  async getFestivalMedicationGuidance(
    festivalId: string,
    medicationType: string
  ): Promise<FestivalMedicationGuidance | null> {
    const festivals = await this.getFestivalCalendar();
    const festival = festivals.find(f => f.id === festivalId);
    
    if (!festival) return null;

    // Default guidance based on festival type and medication type
    const guidance: FestivalMedicationGuidance = {
      festivalId,
      medicationType: medicationType as any,
      adjustedTiming: [],
      warnings: [],
      alternatives: [],
      culturalContext: ''
    };

    if (festival.type === 'islamic' && festival.medicationImpact.fasting) {
      guidance.adjustedTiming = ['Before Suhoor (pre-dawn)', 'After Iftar (sunset)'];
      guidance.warnings = ['Avoid medications during daylight hours if fasting'];
      guidance.alternatives = ['Consider once-daily formulations', 'Extended-release options'];
      guidance.culturalContext = 'Ramadan fasting requires medication timing adjustments';
    }

    if (festival.type === 'chinese' && festival.name.includes('New Year')) {
      guidance.adjustedTiming = ['Morning with family breakfast', 'Before reunion dinner'];
      guidance.warnings = ['Maintain routine during celebrations', 'Monitor elderly family members'];
      guidance.culturalContext = 'Chinese New Year emphasizes family health and longevity';
    }

    if (festival.type === 'hindu' && festival.medicationImpact.fasting) {
      guidance.adjustedTiming = ['Before fasting begins', 'After prayer rituals complete'];
      guidance.warnings = ['Some may fast partially or fully'];
      guidance.culturalContext = 'Hindu festivals may involve varying fasting practices';
    }

    return guidance;
  }

  /**
   * Calculate festivals for a given year
   */
  private async calculateFestivals(year: number): Promise<FestivalEvent[]> {
    const festivals: FestivalEvent[] = [];

    // Islamic festivals (lunar calendar)
    festivals.push(...await this.getIslamicFestivals(year));
    
    // Chinese festivals (lunisolar calendar)  
    festivals.push(...await this.getChineseFestivals(year));
    
    // Hindu festivals (lunar calendar)
    festivals.push(...await this.getHinduFestivals(year));
    
    // Malaysian public holidays
    festivals.push(...await this.getMalaysianPublicHolidays(year));

    return festivals.sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  /**
   * Get Islamic festivals for the year
   */
  private async getIslamicFestivals(year: number): Promise<FestivalEvent[]> {
    // This would integrate with hijri-converter library in real implementation
    // For now, using approximate dates
    
    const ramadanStart = this.calculateRamadanStart(year);
    const eidFitr = new Date(ramadanStart.getTime() + (30 * 24 * 60 * 60 * 1000));
    const eidAdha = new Date(eidFitr.getTime() + (70 * 24 * 60 * 60 * 1000));

    return [
      {
        id: `ramadan_${year}`,
        name: 'Ramadan',
        nameMs: 'Bulan Ramadan',
        type: 'islamic',
        date: ramadanStart,
        isLunar: true,
        duration: 30,
        description: 'Holy month of fasting from dawn to sunset',
        descriptionMs: 'Bulan suci berpuasa dari subuh hingga maghrib',
        medicationImpact: {
          fasting: true,
          fastingType: 'daylight',
          fastingHours: { start: '05:30', end: '19:30' },
          timingAdjustments: true,
          specialConsiderations: [
            'Medication timing must accommodate fasting hours',
            'Consider once-daily or extended-release formulations',
            'Monitor hydration and blood glucose',
            'Elderly and sick may be exempt from fasting'
          ],
          recommendedScheduling: [
            'Suhoor time (pre-dawn meal)',
            'Iftar time (breaking fast)',
            'Late evening before sleep'
          ]
        },
        culturalGuidance: {
          preparation: [
            'Consult healthcare provider about medication adjustments',
            'Stock up on necessary medications',
            'Plan meal times around medication schedules'
          ],
          observance: [
            'Take medications with Suhoor and Iftar meals',
            'Stay hydrated during non-fasting hours',
            'Monitor health condition closely'
          ],
          postFestival: [
            'Gradually return to normal medication schedule',
            'Continue healthy habits developed during Ramadan'
          ]
        }
      },
      {
        id: `eid_fitr_${year}`,
        name: 'Eid al-Fitr',
        nameMs: 'Hari Raya Aidilfitri',
        type: 'islamic',
        date: eidFitr,
        isLunar: true,
        duration: 2,
        description: 'Festival of breaking the fast, celebrating end of Ramadan',
        descriptionMs: 'Perayaan mengakhiri puasa Ramadan',
        medicationImpact: {
          fasting: false,
          timingAdjustments: true,
          specialConsiderations: [
            'Return to normal eating schedule',
            'Resume regular medication timing',
            'Monitor for dietary changes during celebrations'
          ],
          recommendedScheduling: [
            'With celebratory meals',
            'Normal daily schedule'
          ]
        },
        culturalGuidance: {
          preparation: ['Prepare for dietary changes', 'Ensure medication supplies'],
          observance: ['Maintain medication routine during celebrations'],
          postFestival: ['Resume normal health routines']
        }
      },
      {
        id: `eid_adha_${year}`,
        name: 'Eid al-Adha',
        nameMs: 'Hari Raya Haji',
        type: 'islamic',
        date: eidAdha,
        isLunar: true,
        duration: 2,
        description: 'Festival of Sacrifice commemorating Ibrahim\'s willingness to sacrifice',
        descriptionMs: 'Perayaan korban memperingati pengorbanan Ibrahim',
        medicationImpact: {
          fasting: false,
          timingAdjustments: false,
          specialConsiderations: [
            'Some may fast on the Day of Arafat (day before)',
            'Large festive meals may affect medication absorption'
          ],
          recommendedScheduling: ['Normal schedule', 'With meals if required']
        },
        culturalGuidance: {
          preparation: ['Normal preparation'],
          observance: ['Maintain routine during celebrations'],
          postFestival: ['Continue normal schedule']
        }
      }
    ];
  }

  /**
   * Get Chinese festivals for the year
   */
  private async getChineseFestivals(year: number): Promise<FestivalEvent[]> {
    // Using lunisolar calendar calculations (simplified)
    const chineseNewYear = this.calculateChineseNewYear(year);
    const midAutumn = this.calculateMidAutumnFestival(year);

    return [
      {
        id: `chinese_new_year_${year}`,
        name: 'Chinese New Year',
        nameMs: 'Tahun Baru Cina',
        nameZh: '春节',
        type: 'chinese',
        date: chineseNewYear,
        isLunar: true,
        duration: 15,
        description: 'Lunar New Year celebrating spring and family reunion',
        descriptionMs: 'Tahun Baru Lunar merayakan musim bunga dan reunions keluarga',
        medicationImpact: {
          fasting: false,
          timingAdjustments: true,
          specialConsiderations: [
            'Family gathering may affect meal times',
            'Rich festive foods may impact medication absorption',
            'Elderly relatives may need medication reminders'
          ],
          recommendedScheduling: [
            'Before family breakfast',
            'Before reunion dinner',
            'Normal bedtime routine'
          ]
        },
        culturalGuidance: {
          preparation: [
            'Prepare medication organizers for family gatherings',
            'Brief family members on elderly medication needs'
          ],
          observance: [
            'Maintain medication schedules during celebrations',
            'Monitor elderly family members'
          ],
          postFestival: ['Return to normal routine']
        }
      },
      {
        id: `mid_autumn_${year}`,
        name: 'Mid-Autumn Festival',
        nameMs: 'Pesta Tanglung',
        nameZh: '中秋节',
        type: 'chinese',
        date: midAutumn,
        isLunar: true,
        duration: 1,
        description: 'Harvest festival celebrating family unity and moon appreciation',
        descriptionMs: 'Festival menuai merayakan perpaduan keluarga',
        medicationImpact: {
          fasting: false,
          timingAdjustments: false,
          specialConsiderations: [
            'Mooncakes are high in sugar and calories',
            'May affect diabetic medication schedules'
          ],
          recommendedScheduling: ['Normal schedule with dietary considerations']
        },
        culturalGuidance: {
          preparation: ['Consider dietary restrictions with mooncakes'],
          observance: ['Moderate consumption of festive foods'],
          postFestival: ['Resume normal diet']
        }
      }
    ];
  }

  /**
   * Get Hindu festivals for the year
   */
  private async getHinduFestivals(year: number): Promise<FestivalEvent[]> {
    // Simplified lunar calendar calculations
    const deepavali = this.calculateDeepavali(year);
    const thaipusam = this.calculateThaipusam(year);

    return [
      {
        id: `deepavali_${year}`,
        name: 'Deepavali',
        nameMs: 'Deepavali',
        nameTa: 'தீபாவளி',
        type: 'hindu',
        date: deepavali,
        isLunar: true,
        duration: 1,
        description: 'Festival of Lights celebrating victory of light over darkness',
        descriptionMs: 'Festival Cahaya merayakan kemenangan cahaya atas kegelapan',
        medicationImpact: {
          fasting: false,
          timingAdjustments: true,
          specialConsiderations: [
            'Sweet foods may affect blood sugar',
            'Late night celebrations may affect sleep medications'
          ],
          recommendedScheduling: [
            'Normal morning schedule',
            'Before evening prayers',
            'Consider earlier evening dose if celebrating late'
          ]
        },
        culturalGuidance: {
          preparation: ['Plan for dietary changes', 'Consider sleep schedule'],
          observance: ['Moderate sweet consumption', 'Maintain medication routine'],
          postFestival: ['Resume normal diet and sleep']
        }
      },
      {
        id: `thaipusam_${year}`,
        name: 'Thaipusam',
        nameMs: 'Thaipusam',
        nameTa: 'தைப்பூசம்',
        type: 'hindu',
        date: thaipusam,
        isLunar: true,
        duration: 1,
        description: 'Festival honoring Lord Murugan with devotional practices',
        descriptionMs: 'Festival menghormati Lord Murugan dengan amalan keagamaan',
        medicationImpact: {
          fasting: true,
          fastingType: 'partial',
          timingAdjustments: true,
          specialConsiderations: [
            'Some devotees may fast completely',
            'Physical exertion during temple visits',
            'Long walking distances to temples'
          ],
          recommendedScheduling: [
            'Early morning before temple visit',
            'After temple rituals if not fasting',
            'Evening after return home'
          ]
        },
        culturalGuidance: {
          preparation: [
            'Consult about fasting and medications',
            'Plan for physical activity'
          ],
          observance: [
            'Stay hydrated',
            'Take medications as prescribed',
            'Monitor for fatigue'
          ],
          postFestival: ['Resume normal routine', 'Rest if needed']
        }
      }
    ];
  }

  /**
   * Get Malaysian public holidays
   */
  private async getMalaysianPublicHolidays(year: number): Promise<FestivalEvent[]> {
    return [
      {
        id: `merdeka_${year}`,
        name: 'Merdeka Day',
        nameMs: 'Hari Kemerdekaan',
        type: 'malaysian',
        date: new Date(year, 7, 31), // August 31
        isLunar: false,
        duration: 1,
        description: 'Malaysian Independence Day',
        descriptionMs: 'Hari Kemerdekaan Malaysia',
        medicationImpact: {
          fasting: false,
          timingAdjustments: false,
          specialConsiderations: ['Normal day with possible celebrations'],
          recommendedScheduling: ['Normal schedule']
        },
        culturalGuidance: {
          preparation: [],
          observance: ['Maintain normal health routines'],
          postFestival: []
        }
      },
      {
        id: `malaysia_day_${year}`,
        name: 'Malaysia Day',
        nameMs: 'Hari Malaysia',
        type: 'malaysian',
        date: new Date(year, 8, 16), // September 16
        isLunar: false,
        duration: 1,
        description: 'Formation of Malaysia',
        descriptionMs: 'Hari Pembentukan Malaysia',
        medicationImpact: {
          fasting: false,
          timingAdjustments: false,
          specialConsiderations: ['Normal day with possible celebrations'],
          recommendedScheduling: ['Normal schedule']
        },
        culturalGuidance: {
          preparation: [],
          observance: ['Maintain normal health routines'],
          postFestival: []
        }
      }
    ];
  }

  /**
   * Calculate Ramadan start date (simplified approximation)
   */
  private calculateRamadanStart(year: number): Date {
    // This is a simplified calculation. Real implementation would use hijri-converter
    const baseDate = new Date(2023, 2, 22); // March 22, 2023 (known Ramadan start)
    const yearsDiff = year - 2023;
    const daysDiff = yearsDiff * -11; // Islamic year is ~11 days shorter
    
    return new Date(baseDate.getTime() + (daysDiff * 24 * 60 * 60 * 1000));
  }

  /**
   * Calculate Chinese New Year date (simplified)
   */
  private calculateChineseNewYear(year: number): Date {
    // Simplified calculation - real implementation would use lunar calendar library
    const knownDates: { [year: number]: [number, number] } = {
      2024: [1, 10], // February 10, 2024
      2025: [0, 29], // January 29, 2025
      2026: [1, 17], // February 17, 2026
    };
    
    const [month, day] = knownDates[year] || [1, 1];
    return new Date(year, month, day);
  }

  /**
   * Calculate Mid-Autumn Festival date (simplified)
   */
  private calculateMidAutumnFestival(year: number): Date {
    // Usually falls in September/October - simplified calculation
    return new Date(year, 8, 15 + Math.floor(Math.random() * 10)); // Sep 15-25 range
  }

  /**
   * Calculate Deepavali date (simplified)
   */
  private calculateDeepavali(year: number): Date {
    // Usually falls in October/November - simplified calculation
    return new Date(year, 9, 15 + Math.floor(Math.random() * 15)); // Oct 15-30 range
  }

  /**
   * Calculate Thaipusam date (simplified)
   */
  private calculateThaipusam(year: number): Date {
    // Usually falls in January/February - simplified calculation
    return new Date(year, 0, 20 + Math.floor(Math.random() * 10)); // Jan 20-30 range
  }

  /**
   * Calculate Ramadan schedule with medication windows
   */
  private async calculateRamadanSchedule(year: number): Promise<RamadanSchedule> {
    const startDate = this.calculateRamadanStart(year);
    const endDate = new Date(startDate.getTime() + (30 * 24 * 60 * 60 * 1000));

    return {
      year,
      startDate,
      endDate,
      suhoorTime: '04:30',
      iftarTime: '19:30',
      medicationWindows: {
        preSuhoor: {
          start: '03:30',
          end: '04:30',
          description: 'Before pre-dawn meal'
        },
        postIftar: {
          start: '19:30',
          end: '21:00',
          description: 'After breaking fast'
        },
        night: {
          start: '22:00',
          end: '03:00',
          description: 'Late night hours'
        }
      },
      specialDays: [
        {
          date: new Date(startDate.getTime() + (10 * 24 * 60 * 60 * 1000)),
          name: 'First 10 days',
          significance: 'Period of mercy',
          medicationConsiderations: ['Establish routine', 'Monitor for adjustment']
        },
        {
          date: new Date(startDate.getTime() + (20 * 24 * 60 * 60 * 1000)),
          name: 'Middle 10 days',
          significance: 'Period of forgiveness',
          medicationConsiderations: ['Routine should be established']
        },
        {
          date: new Date(startDate.getTime() + (27 * 24 * 60 * 60 * 1000)),
          name: 'Laylat al-Qadr',
          significance: 'Night of Power',
          medicationConsiderations: ['Maintain schedule', 'May stay up late for prayers']
        }
      ]
    };
  }
}

export const festivalCalendarService = new FestivalCalendarService();