/**
 * Malaysian Meal Patterns Service
 * 
 * Comprehensive service for Malaysian meal timing patterns across different cultures,
 * festivals, and special occasions. Supports medication scheduling integration
 * with cultural awareness for Malay, Chinese, Indian, and mixed communities.
 */

import { CulturalCalendarEvent, EnhancedCulturalProfile, MalaysianState } from '../../types/cultural';

export interface MealTimingPattern {
  name: string;
  culture: 'malay' | 'chinese' | 'indian' | 'mixed' | 'general';
  pattern: {
    breakfast: { start: string; end: string; peak: string };
    morningSnack?: { start: string; end: string; peak: string };
    lunch: { start: string; end: string; peak: string };
    afternoonSnack?: { start: string; end: string; peak: string };
    dinner: { start: string; end: string; peak: string };
    eveningSnack?: { start: string; end: string; peak: string };
    supper?: { start: string; end: string; peak: string };
  };
  culturalNotes: string[];
  medicationConsiderations: {
    beforeMeals: { optimal: string[]; acceptable: string[] };
    withMeals: { optimal: string[]; acceptable: string[] };
    afterMeals: { optimal: string[]; acceptable: string[] };
    independent: { optimal: string[]; acceptable: string[] };
  };
}

export interface SpecialMealPattern {
  occasion: string;
  type: 'ramadan' | 'festival' | 'holiday' | 'cultural_event';
  culture: string;
  duration: { start: Date; end: Date };
  modifiedPattern: MealTimingPattern['pattern'];
  medicationAdjustments: {
    schedule: 'modified' | 'suspended' | 'alternative';
    recommendations: string[];
    alternatives: Array<{
      originalTime: string;
      newTime: string;
      reason: string;
    }>;
  };
}

export interface FamilyMealCoordination {
  householdSize: number;
  ageGroups: Array<{
    group: 'infant' | 'child' | 'teen' | 'adult' | 'elderly';
    count: number;
    specialNeeds: string[];
  }>;
  workSchedules: Array<{
    member: string;
    schedule: Array<{ day: string; start: string; end: string }>;
  }>;
  schoolSchedules: Array<{
    member: string;
    schedule: Array<{ day: string; start: string; end: string }>;
  }>;
  coordinatedMealTimes: {
    breakfast: string;
    lunch: string;
    dinner: string;
    flexibility: 'strict' | 'moderate' | 'flexible';
  };
}

class MalaysianMealPatterns {
  private static instance: MalaysianMealPatterns;

  // Standard Malaysian meal patterns by culture
  private readonly MEAL_PATTERNS: MealTimingPattern[] = [
    {
      name: 'Malaysian Malay Traditional',
      culture: 'malay',
      pattern: {
        breakfast: { start: '07:00', end: '09:00', peak: '07:30' },
        morningSnack: { start: '10:00', end: '11:00', peak: '10:30' },
        lunch: { start: '12:00', end: '14:00', peak: '12:30' },
        afternoonSnack: { start: '15:00', end: '16:30', peak: '15:30' },
        dinner: { start: '19:00', end: '21:00', peak: '19:30' },
        eveningSnack: { start: '21:30', end: '22:30', peak: '22:00' }
      },
      culturalNotes: [
        'Prayer times significantly influence meal timing',
        'Breakfast after Subuh prayer (around 6:30 AM)',
        'Lunch timing flexible around Zohor prayer',
        'Dinner after Maghrib prayer',
        'Evening snacks before Isyak prayer'
      ],
      medicationConsiderations: {
        beforeMeals: {
          optimal: ['06:45', '11:45', '18:45'],
          acceptable: ['06:30-07:00', '11:30-12:00', '18:30-19:00']
        },
        withMeals: {
          optimal: ['07:30', '12:30', '19:30'],
          acceptable: ['07:00-09:00', '12:00-14:00', '19:00-21:00']
        },
        afterMeals: {
          optimal: ['08:15', '13:15', '20:15'],
          acceptable: ['08:00-09:30', '13:00-14:30', '20:00-21:30']
        },
        independent: {
          optimal: ['10:00', '15:00', '22:00'],
          acceptable: ['09:00-11:00', '14:00-16:00', '21:00-23:00']
        }
      }
    },
    {
      name: 'Malaysian Chinese Traditional',
      culture: 'chinese',
      pattern: {
        breakfast: { start: '07:30', end: '09:30', peak: '08:00' },
        morningSnack: { start: '10:00', end: '11:00', peak: '10:30' },
        lunch: { start: '12:00', end: '14:00', peak: '12:30' },
        afternoonSnack: { start: '15:00', end: '16:00', peak: '15:30' },
        dinner: { start: '18:30', end: '20:30', peak: '19:00' },
        supper: { start: '21:30', end: '23:00', peak: '22:00' }
      },
      culturalNotes: [
        'Emphasis on hot meals and warm beverages',
        'Traditional Chinese medicine timing principles may apply',
        'Family-style meals common, especially dinner',
        'Tea culture affects timing between meals',
        'Lunar calendar festivals modify patterns significantly'
      ],
      medicationConsiderations: {
        beforeMeals: {
          optimal: ['07:15', '11:45', '18:15'],
          acceptable: ['07:00-07:30', '11:30-12:00', '18:00-18:30']
        },
        withMeals: {
          optimal: ['08:00', '12:30', '19:00'],
          acceptable: ['07:30-09:30', '12:00-14:00', '18:30-20:30']
        },
        afterMeals: {
          optimal: ['08:45', '13:15', '19:45'],
          acceptable: ['08:30-10:00', '13:00-14:30', '19:30-21:00']
        },
        independent: {
          optimal: ['10:30', '15:30', '22:00'],
          acceptable: ['10:00-11:00', '15:00-16:00', '21:30-23:00']
        }
      }
    },
    {
      name: 'Malaysian Indian Traditional',
      culture: 'indian',
      pattern: {
        breakfast: { start: '07:00', end: '09:00', peak: '07:30' },
        morningSnack: { start: '10:30', end: '11:30', peak: '11:00' },
        lunch: { start: '12:30', end: '14:30', peak: '13:00' },
        afternoonSnack: { start: '16:00', end: '17:00', peak: '16:30' },
        dinner: { start: '19:30', end: '21:30', peak: '20:00' },
        eveningSnack: { start: '22:00', end: '23:00', peak: '22:30' }
      },
      culturalNotes: [
        'Vegetarian considerations common',
        'Spiced meals may affect medication absorption',
        'Hindu prayer times influence meal scheduling',
        'Festival periods significantly modify eating patterns',
        'Traditional Ayurvedic timing principles may apply'
      ],
      medicationConsiderations: {
        beforeMeals: {
          optimal: ['06:45', '12:15', '19:15'],
          acceptable: ['06:30-07:00', '12:00-12:30', '19:00-19:30']
        },
        withMeals: {
          optimal: ['07:30', '13:00', '20:00'],
          acceptable: ['07:00-09:00', '12:30-14:30', '19:30-21:30']
        },
        afterMeals: {
          optimal: ['08:15', '13:45', '20:45'],
          acceptable: ['08:00-09:30', '13:30-15:00', '20:30-22:00']
        },
        independent: {
          optimal: ['11:00', '16:30', '22:30'],
          acceptable: ['10:30-11:30', '16:00-17:00', '22:00-23:00']
        }
      }
    },
    {
      name: 'Malaysian Mixed Household',
      culture: 'mixed',
      pattern: {
        breakfast: { start: '07:15', end: '09:15', peak: '08:00' },
        morningSnack: { start: '10:15', end: '11:15', peak: '10:45' },
        lunch: { start: '12:15', end: '14:15', peak: '13:00' },
        afternoonSnack: { start: '15:30', end: '16:30', peak: '16:00' },
        dinner: { start: '19:15', end: '21:15', peak: '20:00' },
        eveningSnack: { start: '21:45', end: '22:45', peak: '22:15' }
      },
      culturalNotes: [
        'Accommodates multiple cultural practices',
        'Flexible timing to respect various religious observances',
        'May require coordination across different dietary requirements',
        'Festival periods from multiple cultures affect scheduling'
      ],
      medicationConsiderations: {
        beforeMeals: {
          optimal: ['07:00', '12:00', '19:00'],
          acceptable: ['06:45-07:15', '11:45-12:15', '18:45-19:15']
        },
        withMeals: {
          optimal: ['08:00', '13:00', '20:00'],
          acceptable: ['07:15-09:15', '12:15-14:15', '19:15-21:15']
        },
        afterMeals: {
          optimal: ['08:30', '13:30', '20:30'],
          acceptable: ['08:15-09:45', '13:15-14:45', '20:15-21:45']
        },
        independent: {
          optimal: ['10:45', '16:00', '22:15'],
          acceptable: ['10:15-11:15', '15:30-16:30', '21:45-22:45']
        }
      }
    }
  ];

  // Special occasion patterns (Ramadan, festivals, etc.)
  private readonly SPECIAL_PATTERNS: Record<string, Partial<SpecialMealPattern>> = {
    ramadan: {
      occasion: 'Ramadan Fasting',
      type: 'ramadan',
      culture: 'malay',
      modifiedPattern: {
        breakfast: { start: '04:30', end: '05:30', peak: '05:00' }, // Sahur
        lunch: undefined, // No lunch during fasting
        dinner: { start: '19:15', end: '20:30', peak: '19:30' }, // Iftar
        eveningSnack: { start: '21:00', end: '22:00', peak: '21:30' },
        supper: { start: '23:00', end: '01:00', peak: '23:30' }
      },
      medicationAdjustments: {
        schedule: 'modified',
        recommendations: [
          'Schedule all medications during non-fasting hours',
          'Pre-sahur and post-iftar timing optimal',
          'Consider long-acting formulations',
          'Coordinate with prayer times'
        ],
        alternatives: [
          { originalTime: '08:00', newTime: '05:00', reason: 'Moved to Sahur time' },
          { originalTime: '13:00', newTime: '19:30', reason: 'Moved to Iftar time' },
          { originalTime: '20:00', newTime: '21:30', reason: 'Post-Iftar timing' }
        ]
      }
    },
    chinese_new_year: {
      occasion: 'Chinese New Year',
      type: 'festival',
      culture: 'chinese',
      modifiedPattern: {
        breakfast: { start: '08:00', end: '10:00', peak: '09:00' },
        lunch: { start: '12:00', end: '15:00', peak: '13:30' }, // Extended lunch
        dinner: { start: '18:00', end: '22:00', peak: '19:30' }, // Extended dinner
        eveningSnack: { start: '22:30', end: '24:00', peak: '23:00' }
      },
      medicationAdjustments: {
        schedule: 'modified',
        recommendations: [
          'Account for extended meal times',
          'Family gatherings may affect timing',
          'Consider travel schedules',
          'Traditional foods may affect absorption'
        ],
        alternatives: []
      }
    },
    deepavali: {
      occasion: 'Deepavali',
      type: 'festival',
      culture: 'indian',
      modifiedPattern: {
        breakfast: { start: '07:00', end: '09:00', peak: '08:00' },
        morningSnack: { start: '10:00', end: '11:00', peak: '10:30' },
        lunch: { start: '12:00', end: '16:00', peak: '14:00' }, // Extended festive lunch
        dinner: { start: '19:00', end: '23:00', peak: '20:30' }, // Extended dinner
      },
      medicationAdjustments: {
        schedule: 'modified',
        recommendations: [
          'Rich, spicy foods may affect medication absorption',
          'Extended celebration periods',
          'Sweet consumption increased',
          'Later meal times common'
        ],
        alternatives: []
      }
    }
  };

  private constructor() {}

  static getInstance(): MalaysianMealPatterns {
    if (!MalaysianMealPatterns.instance) {
      MalaysianMealPatterns.instance = new MalaysianMealPatterns();
    }
    return MalaysianMealPatterns.instance;
  }

  /**
   * Get meal pattern for specific culture
   */
  getMealPattern(
    culture: 'malay' | 'chinese' | 'indian' | 'mixed' | 'general'
  ): MealTimingPattern {
    const pattern = this.MEAL_PATTERNS.find(p => p.culture === culture);
    
    if (!pattern) {
      // Return mixed pattern as default
      return this.MEAL_PATTERNS.find(p => p.culture === 'mixed')!;
    }
    
    return pattern;
  }

  /**
   * Get meal pattern adjusted for cultural profile
   */
  getPersonalizedMealPattern(
    culturalProfile: EnhancedCulturalProfile
  ): MealTimingPattern {
    let basePattern = this.getMealPattern(culturalProfile.primaryCulture);
    
    // Adjust for family preferences
    if (culturalProfile.preferences.family) {
      basePattern = this.adjustForFamilyNeeds(basePattern, culturalProfile.preferences.family);
    }
    
    // Adjust for dietary restrictions
    if (culturalProfile.preferences.dietary) {
      basePattern = this.adjustForDietaryRestrictions(basePattern, culturalProfile.preferences.dietary);
    }
    
    return basePattern;
  }

  /**
   * Get special occasion meal pattern
   */
  getSpecialOccasionPattern(
    occasion: string,
    basePattern: MealTimingPattern
  ): SpecialMealPattern | null {
    const specialPatternTemplate = this.SPECIAL_PATTERNS[occasion.toLowerCase()];
    
    if (!specialPatternTemplate) {
      return null;
    }
    
    // Create full special pattern with dates
    const currentYear = new Date().getFullYear();
    let startDate = new Date();
    let endDate = new Date();
    
    // Set dates based on occasion (simplified - in real implementation, use proper calendar calculations)
    if (occasion === 'ramadan') {
      // Approximate Ramadan dates (in real implementation, use Islamic calendar)
      startDate = new Date(currentYear, 3, 10); // April 10
      endDate = new Date(currentYear, 4, 9); // May 9
    } else if (occasion === 'chinese_new_year') {
      startDate = new Date(currentYear, 1, 10); // February 10
      endDate = new Date(currentYear, 1, 17); // February 17
    }
    
    return {
      ...specialPatternTemplate,
      duration: { start: startDate, end: endDate }
    } as SpecialMealPattern;
  }

  /**
   * Calculate optimal medication timing for meal relationship
   */
  calculateOptimalMedicationTiming(
    mealRelation: 'before' | 'with' | 'after' | 'independent',
    mealPattern: MealTimingPattern,
    frequency: number = 1
  ): Array<{ time: string; meal: string; notes: string[] }> {
    const timings: Array<{ time: string; meal: string; notes: string[] }> = [];
    const considerations = mealPattern.medicationConsiderations[mealRelation];
    
    // Select optimal times based on frequency
    const optimalTimes = considerations.optimal.slice(0, frequency);
    
    optimalTimes.forEach((time, index) => {
      let meal = '';
      let notes: string[] = [];
      
      const hour = parseInt(time.split(':')[0]);
      
      if (hour >= 6 && hour <= 10) {
        meal = 'breakfast';
        notes.push('Morning timing aligned with Malaysian breakfast patterns');
      } else if (hour >= 11 && hour <= 15) {
        meal = 'lunch';
        notes.push('Midday timing following Malaysian lunch customs');
      } else if (hour >= 16 && hour <= 17) {
        meal = 'afternoon snack';
        notes.push('Afternoon tea time in Malaysian culture');
      } else if (hour >= 18 && hour <= 22) {
        meal = 'dinner';
        notes.push('Evening timing aligned with Malaysian dinner patterns');
      } else {
        meal = 'independent';
        notes.push('Independent timing outside main meal periods');
      }
      
      // Add cultural notes
      notes.push(...mealPattern.culturalNotes.filter(note => 
        note.toLowerCase().includes(meal.toLowerCase())
      ));
      
      timings.push({
        time,
        meal,
        notes
      });
    });
    
    return timings;
  }

  /**
   * Coordinate family meal schedules
   */
  coordinateFamilyMealSchedule(
    familyContext: FamilyMealCoordination,
    culturalProfile: EnhancedCulturalProfile
  ): {
    coordinatedTimes: MealTimingPattern['pattern'];
    adjustments: string[];
    considerations: string[];
  } {
    const basePattern = this.getPersonalizedMealPattern(culturalProfile);
    const adjustments: string[] = [];
    const considerations: string[] = [];
    
    // Adjust for work schedules
    familyContext.workSchedules.forEach(schedule => {
      schedule.schedule.forEach(workDay => {
        const workStart = this.parseTime(workDay.start);
        const workEnd = this.parseTime(workDay.end);
        
        // Check if breakfast needs adjustment
        const breakfastTime = this.parseTime(basePattern.pattern.breakfast.peak);
        if (breakfastTime >= workStart && breakfastTime <= workEnd) {
          adjustments.push(`Breakfast moved earlier due to ${schedule.member}'s work schedule`);
        }
        
        // Check if lunch needs adjustment
        const lunchTime = this.parseTime(basePattern.pattern.lunch.peak);
        if (lunchTime >= workStart && lunchTime <= workEnd) {
          considerations.push(`Lunch timing may be challenging for ${schedule.member} during work`);
        }
      });
    });
    
    // Adjust for school schedules
    familyContext.schoolSchedules.forEach(schedule => {
      schedule.schedule.forEach(schoolDay => {
        const schoolStart = this.parseTime(schoolDay.start);
        const schoolEnd = this.parseTime(schoolDay.end);
        
        considerations.push(`Consider ${schedule.member}'s school schedule (${schoolDay.start}-${schoolDay.end})`);
      });
    });
    
    // Adjust for age groups
    familyContext.ageGroups.forEach(ageGroup => {
      if (ageGroup.group === 'elderly') {
        adjustments.push('Earlier meal times preferred for elderly family members');
        considerations.push('Medication supervision may be needed during meals');
      } else if (ageGroup.group === 'child') {
        considerations.push('Children require consistent meal timing for medication compliance');
      }
    });
    
    return {
      coordinatedTimes: basePattern.pattern,
      adjustments,
      considerations
    };
  }

  /**
   * Get current meal period
   */
  getCurrentMealPeriod(
    culturalProfile: EnhancedCulturalProfile,
    currentTime: Date = new Date()
  ): {
    period: string;
    isOptimalForMedication: boolean;
    nextMealTime: string;
    notes: string[];
  } {
    const pattern = this.getPersonalizedMealPattern(culturalProfile);
    const currentTimeString = `${currentTime.getHours().toString().padStart(2, '0')}:${currentTime.getMinutes().toString().padStart(2, '0')}`;
    const currentMinutes = this.parseTime(currentTimeString);
    
    // Check each meal period
    const periods = [
      { name: 'breakfast', ...pattern.pattern.breakfast },
      { name: 'lunch', ...pattern.pattern.lunch },
      { name: 'dinner', ...pattern.pattern.dinner }
    ];
    
    // Add optional periods if they exist
    if (pattern.pattern.morningSnack) {
      periods.push({ name: 'morning snack', ...pattern.pattern.morningSnack });
    }
    if (pattern.pattern.afternoonSnack) {
      periods.push({ name: 'afternoon snack', ...pattern.pattern.afternoonSnack });
    }
    if (pattern.pattern.eveningSnack) {
      periods.push({ name: 'evening snack', ...pattern.pattern.eveningSnack });
    }
    
    // Find current period
    for (const period of periods) {
      const startTime = this.parseTime(period.start);
      const endTime = this.parseTime(period.end);
      
      if (currentMinutes >= startTime && currentMinutes <= endTime) {
        return {
          period: period.name,
          isOptimalForMedication: Math.abs(currentMinutes - this.parseTime(period.peak)) <= 30, // Within 30 minutes of peak
          nextMealTime: this.getNextMealTime(periods, currentMinutes),
          notes: [`Currently during ${period.name} time (${period.start}-${period.end})`]
        };
      }
    }
    
    // Between meals
    return {
      period: 'between meals',
      isOptimalForMedication: true, // Independent timing is often good
      nextMealTime: this.getNextMealTime(periods, currentMinutes),
      notes: ['Between meal periods - good for independent medication timing']
    };
  }

  /**
   * Private helper methods
   */
  
  private adjustForFamilyNeeds(
    pattern: MealTimingPattern,
    familyPreferences: any
  ): MealTimingPattern {
    // Adjust meal times based on family needs
    // This is a simplified implementation
    const adjustedPattern = { ...pattern };
    
    if (familyPreferences.elderlyMembers > 0) {
      // Earlier meal times for elderly
      adjustedPattern.pattern.breakfast.start = '06:30';
      adjustedPattern.pattern.breakfast.peak = '07:00';
      adjustedPattern.pattern.dinner.start = '18:30';
      adjustedPattern.pattern.dinner.peak = '19:00';
    }
    
    return adjustedPattern;
  }

  private adjustForDietaryRestrictions(
    pattern: MealTimingPattern,
    dietaryRestrictions: any
  ): MealTimingPattern {
    // Adjust for dietary restrictions
    // This is a simplified implementation
    const adjustedPattern = { ...pattern };
    
    if (dietaryRestrictions.halal) {
      adjustedPattern.culturalNotes.push('Halal dietary requirements considered');
    }
    
    if (dietaryRestrictions.vegetarian) {
      adjustedPattern.culturalNotes.push('Vegetarian meal timing optimized');
    }
    
    return adjustedPattern;
  }

  private parseTime(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes; // Convert to minutes from midnight
  }

  private getNextMealTime(
    periods: Array<{ name: string; start: string; end: string; peak: string }>,
    currentMinutes: number
  ): string {
    // Find the next meal period
    const sortedPeriods = periods
      .map(p => ({ ...p, startMinutes: this.parseTime(p.start) }))
      .sort((a, b) => a.startMinutes - b.startMinutes);
    
    for (const period of sortedPeriods) {
      if (period.startMinutes > currentMinutes) {
        return period.start;
      }
    }
    
    // If no meal found today, return tomorrow's first meal
    return sortedPeriods[0]?.start || '07:00';
  }
}

export default MalaysianMealPatterns;