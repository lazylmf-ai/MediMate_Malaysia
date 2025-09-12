/**
 * Malaysian Meal Patterns Test Suite
 * 
 * Tests for Malaysian meal timing patterns across different cultures,
 * special occasions (Ramadan, festivals), and family coordination.
 */

import MalaysianMealPatterns from '../MalaysianMealPatterns';
import { EnhancedCulturalProfile } from '../../../types/cultural';

describe('MalaysianMealPatterns', () => {
  let mealPatterns: MalaysianMealPatterns;
  let mockCulturalProfile: EnhancedCulturalProfile;

  beforeEach(() => {
    mealPatterns = MalaysianMealPatterns.getInstance();
    
    mockCulturalProfile = {
      id: '1',
      userId: 'user1',
      primaryCulture: 'malay',
      religion: 'islam',
      languages: [{ code: 'ms', proficiency: 'native', primary: true }],
      location: {
        state: 'kuala_lumpur',
        city: 'Kuala Lumpur',
        timezone: 'Asia/Kuala_Lumpur'
      },
      preferences: {
        prayerTimes: {
          enabled: true,
          madhab: 'shafi',
          notifications: true,
          medicationBuffer: 30,
          adjustments: { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 }
        },
        dietary: {
          halal: true,
          vegetarian: false,
          traditional: [],
          restrictions: []
        },
        family: {
          elderlyMembers: 0,
          children: [],
          primaryCaregiver: false,
          householdLanguage: 'ms'
        }
      }
    } as EnhancedCulturalProfile;
  });

  describe('Meal Pattern Retrieval', () => {
    test('should return Malay meal pattern correctly', () => {
      const pattern = mealPatterns.getMealPattern('malay');
      
      expect(pattern).toBeDefined();
      expect(pattern.name).toBe('Malaysian Malay Traditional');
      expect(pattern.culture).toBe('malay');
      expect(pattern.pattern.breakfast).toBeDefined();
      expect(pattern.pattern.lunch).toBeDefined();
      expect(pattern.pattern.dinner).toBeDefined();
      expect(pattern.culturalNotes).toContain(
        expect.stringContaining('Prayer times')
      );
    });

    test('should return Chinese meal pattern correctly', () => {
      const pattern = mealPatterns.getMealPattern('chinese');
      
      expect(pattern).toBeDefined();
      expect(pattern.name).toBe('Malaysian Chinese Traditional');
      expect(pattern.culture).toBe('chinese');
      expect(pattern.culturalNotes).toContain(
        expect.stringContaining('hot meals')
      );
    });

    test('should return Indian meal pattern correctly', () => {
      const pattern = mealPatterns.getMealPattern('indian');
      
      expect(pattern).toBeDefined();
      expect(pattern.name).toBe('Malaysian Indian Traditional');
      expect(pattern.culture).toBe('indian');
      expect(pattern.culturalNotes).toContain(
        expect.stringContaining('Vegetarian')
      );
    });

    test('should return mixed pattern as default for unknown culture', () => {
      const pattern = mealPatterns.getMealPattern('unknown' as any);
      
      expect(pattern).toBeDefined();
      expect(pattern.culture).toBe('mixed');
    });
  });

  describe('Personalized Meal Patterns', () => {
    test('should personalize pattern for Malay cultural profile', () => {
      const pattern = mealPatterns.getPersonalizedMealPattern(mockCulturalProfile);
      
      expect(pattern).toBeDefined();
      expect(pattern.culture).toBe('malay');
      expect(pattern.culturalNotes).toContain(
        expect.stringContaining('Prayer times')
      );
    });

    test('should adjust for family needs', () => {
      const profileWithElderly = {
        ...mockCulturalProfile,
        preferences: {
          ...mockCulturalProfile.preferences,
          family: {
            elderlyMembers: 2,
            children: [],
            primaryCaregiver: true,
            householdLanguage: 'ms'
          }
        }
      };

      const pattern = mealPatterns.getPersonalizedMealPattern(profileWithElderly);
      
      expect(pattern).toBeDefined();
      // Should have earlier meal times for elderly
      expect(pattern.pattern.breakfast.start).toBe('06:30');
      expect(pattern.pattern.dinner.start).toBe('18:30');
    });

    test('should adjust for dietary restrictions', () => {
      const vegetarianProfile = {
        ...mockCulturalProfile,
        preferences: {
          ...mockCulturalProfile.preferences,
          dietary: {
            halal: true,
            vegetarian: true,
            traditional: [],
            restrictions: []
          }
        }
      };

      const pattern = mealPatterns.getPersonalizedMealPattern(vegetarianProfile);
      
      expect(pattern).toBeDefined();
      expect(pattern.culturalNotes.some(note => 
        note.toLowerCase().includes('vegetarian')
      )).toBe(true);
    });
  });

  describe('Special Occasion Patterns', () => {
    test('should return Ramadan pattern for Muslim users', () => {
      const ramadanPattern = mealPatterns.getSpecialOccasionPattern('ramadan', 
        mealPatterns.getMealPattern('malay')
      );
      
      expect(ramadanPattern).toBeDefined();
      expect(ramadanPattern!.occasion).toBe('Ramadan Fasting');
      expect(ramadanPattern!.type).toBe('ramadan');
      expect(ramadanPattern!.modifiedPattern.breakfast).toBeDefined(); // Sahur
      expect(ramadanPattern!.modifiedPattern.lunch).toBeUndefined(); // No lunch during fasting
      expect(ramadanPattern!.modifiedPattern.dinner).toBeDefined(); // Iftar
    });

    test('should return Chinese New Year pattern', () => {
      const cnyPattern = mealPatterns.getSpecialOccasionPattern('chinese_new_year',
        mealPatterns.getMealPattern('chinese')
      );
      
      expect(cnyPattern).toBeDefined();
      expect(cnyPattern!.occasion).toBe('Chinese New Year');
      expect(cnyPattern!.type).toBe('festival');
      expect(cnyPattern!.medicationAdjustments.schedule).toBe('modified');
    });

    test('should return null for unknown occasion', () => {
      const unknownPattern = mealPatterns.getSpecialOccasionPattern('unknown_festival',
        mealPatterns.getMealPattern('malay')
      );
      
      expect(unknownPattern).toBeNull();
    });
  });

  describe('Medication Timing Optimization', () => {
    test('should calculate optimal timing for "before meals"', () => {
      const pattern = mealPatterns.getMealPattern('malay');
      const timings = mealPatterns.calculateOptimalMedicationTiming('before', pattern, 2);
      
      expect(timings).toHaveLength(2);
      expect(timings[0].time).toBe('06:45'); // Before breakfast
      expect(timings[1].time).toBe('11:45'); // Before lunch
      expect(timings[0].meal).toBe('breakfast');
    });

    test('should calculate optimal timing for "with meals"', () => {
      const pattern = mealPatterns.getMealPattern('malay');
      const timings = mealPatterns.calculateOptimalMedicationTiming('with', pattern, 3);
      
      expect(timings).toHaveLength(3);
      expect(timings[0].time).toBe('07:30'); // Peak breakfast time
      expect(timings[1].time).toBe('12:30'); // Peak lunch time
      expect(timings[2].time).toBe('19:30'); // Peak dinner time
    });

    test('should calculate optimal timing for "after meals"', () => {
      const pattern = mealPatterns.getMealPattern('malay');
      const timings = mealPatterns.calculateOptimalMedicationTiming('after', pattern, 2);
      
      expect(timings).toHaveLength(2);
      expect(timings[0].time).toBe('08:15'); // After breakfast
      expect(timings[1].time).toBe('13:15'); // After lunch
      expect(timings[0].notes).toContain('Morning timing');
    });

    test('should calculate optimal timing for independent medications', () => {
      const pattern = mealPatterns.getMealPattern('malay');
      const timings = mealPatterns.calculateOptimalMedicationTiming('independent', pattern, 2);
      
      expect(timings).toHaveLength(2);
      expect(timings[0].time).toBe('10:00'); // Between breakfast and lunch
      expect(timings[1].time).toBe('15:00'); // Between lunch and dinner
      expect(timings[0].meal).toBe('independent');
    });
  });

  describe('Family Meal Coordination', () => {
    test('should coordinate family meal schedule', () => {
      const familyContext = {
        totalMembers: 4,
        elderlyMembers: [],
        childrenMembers: [],
        availableCaregivers: [],
        workSchedules: [
          {
            member: 'Parent',
            schedule: [
              { day: 'monday', start: '09:00', end: '17:00' }
            ]
          }
        ],
        schoolSchedules: [
          {
            member: 'Child',
            schedule: [
              { day: 'monday', start: '07:30', end: '13:00' }
            ]
          }
        ],
        ageGroups: [
          { group: 'adult' as const, count: 2, specialNeeds: [] },
          { group: 'child' as const, count: 2, specialNeeds: [] }
        ],
        coordinatedMealTimes: {
          breakfast: '07:00',
          lunch: '12:30',
          dinner: '19:30',
          flexibility: 'moderate' as const
        }
      };

      const result = mealPatterns.coordinateFamilyMealSchedule(familyContext, mockCulturalProfile);
      
      expect(result).toBeDefined();
      expect(result.coordinatedTimes).toBeDefined();
      expect(result.adjustments).toBeDefined();
      expect(result.considerations).toBeDefined();
      expect(result.considerations).toContain(
        expect.stringContaining('school schedule')
      );
    });

    test('should handle elderly-specific adjustments', () => {
      const familyContextWithElderly = {
        totalMembers: 3,
        elderlyMembers: [],
        childrenMembers: [],
        availableCaregivers: [],
        workSchedules: [],
        schoolSchedules: [],
        ageGroups: [
          { group: 'elderly' as const, count: 2, specialNeeds: ['medication_supervision'] }
        ],
        coordinatedMealTimes: {
          breakfast: '07:00',
          lunch: '12:30',
          dinner: '19:30',
          flexibility: 'strict' as const
        }
      };

      const result = mealPatterns.coordinateFamilyMealSchedule(familyContextWithElderly, mockCulturalProfile);
      
      expect(result.adjustments).toContain(
        expect.stringContaining('Earlier meal times')
      );
      expect(result.considerations).toContain(
        expect.stringContaining('Medication supervision')
      );
    });
  });

  describe('Current Meal Period Detection', () => {
    test('should detect breakfast period correctly', () => {
      const breakfastTime = new Date();
      breakfastTime.setHours(8, 0, 0, 0); // 8:00 AM
      
      const currentPeriod = mealPatterns.getCurrentMealPeriod(mockCulturalProfile, breakfastTime);
      
      expect(currentPeriod.period).toBe('breakfast');
      expect(currentPeriod.isOptimalForMedication).toBe(true);
      expect(currentPeriod.nextMealTime).toBeDefined();
    });

    test('should detect lunch period correctly', () => {
      const lunchTime = new Date();
      lunchTime.setHours(13, 0, 0, 0); // 1:00 PM
      
      const currentPeriod = mealPatterns.getCurrentMealPeriod(mockCulturalProfile, lunchTime);
      
      expect(currentPeriod.period).toBe('lunch');
      expect(currentPeriod.isOptimalForMedication).toBe(true);
    });

    test('should detect dinner period correctly', () => {
      const dinnerTime = new Date();
      dinnerTime.setHours(20, 0, 0, 0); // 8:00 PM
      
      const currentPeriod = mealPatterns.getCurrentMealPeriod(mockCulturalProfile, dinnerTime);
      
      expect(currentPeriod.period).toBe('dinner');
      expect(currentPeriod.isOptimalForMedication).toBe(true);
    });

    test('should detect between meals period', () => {
      const betweenMealsTime = new Date();
      betweenMealsTime.setHours(10, 30, 0, 0); // 10:30 AM
      
      const currentPeriod = mealPatterns.getCurrentMealPeriod(mockCulturalProfile, betweenMealsTime);
      
      expect(currentPeriod.period).toBe('between meals');
      expect(currentPeriod.isOptimalForMedication).toBe(true);
      expect(currentPeriod.notes[0]).toContain('Between meal periods');
    });

    test('should handle snack periods for cultures that have them', () => {
      const chineseProfile = {
        ...mockCulturalProfile,
        primaryCulture: 'chinese' as const
      };
      
      const snackTime = new Date();
      snackTime.setHours(10, 30, 0, 0);
      
      const currentPeriod = mealPatterns.getCurrentMealPeriod(chineseProfile, snackTime);
      
      expect(currentPeriod).toBeDefined();
      // Should handle morning snack period for Chinese culture
    });
  });

  describe('Cultural Adaptations', () => {
    test('should adapt meal times for Chinese culture during festivals', () => {
      const chineseProfile = {
        ...mockCulturalProfile,
        primaryCulture: 'chinese' as const,
        religion: 'buddhism' as const
      };

      const pattern = mealPatterns.getPersonalizedMealPattern(chineseProfile);
      
      expect(pattern.culture).toBe('chinese');
      expect(pattern.culturalNotes).toContain(
        expect.stringContaining('hot meals')
      );
      expect(pattern.culturalNotes).toContain(
        expect.stringContaining('Chinese medicine')
      );
    });

    test('should adapt meal times for Indian vegetarian practices', () => {
      const indianProfile = {
        ...mockCulturalProfile,
        primaryCulture: 'indian' as const,
        religion: 'hinduism' as const,
        preferences: {
          ...mockCulturalProfile.preferences,
          dietary: {
            halal: false,
            vegetarian: true,
            traditional: ['ayurveda'],
            restrictions: ['beef', 'pork']
          }
        }
      };

      const pattern = mealPatterns.getPersonalizedMealPattern(indianProfile);
      
      expect(pattern.culture).toBe('indian');
      expect(pattern.culturalNotes).toContain(
        expect.stringContaining('Vegetarian')
      );
    });
  });

  describe('Singleton Pattern', () => {
    test('should return same instance', () => {
      const instance1 = MalaysianMealPatterns.getInstance();
      const instance2 = MalaysianMealPatterns.getInstance();
      
      expect(instance1).toBe(instance2);
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid cultural profile gracefully', () => {
      const invalidProfile = {} as EnhancedCulturalProfile;
      
      const pattern = mealPatterns.getPersonalizedMealPattern(invalidProfile);
      
      expect(pattern).toBeDefined();
      expect(pattern.culture).toBe('mixed'); // Should default to mixed
    });

    test('should handle missing preferences gracefully', () => {
      const profileWithoutPreferences = {
        ...mockCulturalProfile,
        preferences: undefined as any
      };
      
      const pattern = mealPatterns.getPersonalizedMealPattern(profileWithoutPreferences);
      
      expect(pattern).toBeDefined();
      expect(pattern.culture).toBe('malay');
    });

    test('should handle invalid time formats gracefully', () => {
      expect(() => {
        mealPatterns.getCurrentMealPeriod(mockCulturalProfile, new Date('invalid'));
      }).not.toThrow();
    });
  });

  describe('Performance Tests', () => {
    test('should calculate meal patterns efficiently for large families', () => {
      const largeFamilyContext = {
        totalMembers: 15,
        elderlyMembers: [],
        childrenMembers: [],
        availableCaregivers: [],
        workSchedules: Array.from({ length: 8 }, (_, i) => ({
          member: `Member${i}`,
          schedule: [
            { day: 'monday', start: '08:00', end: '17:00' }
          ]
        })),
        schoolSchedules: Array.from({ length: 5 }, (_, i) => ({
          member: `Child${i}`,
          schedule: [
            { day: 'monday', start: '07:30', end: '13:00' }
          ]
        })),
        ageGroups: [
          { group: 'adult' as const, count: 8, specialNeeds: [] },
          { group: 'child' as const, count: 5, specialNeeds: [] },
          { group: 'elderly' as const, count: 2, specialNeeds: [] }
        ],
        coordinatedMealTimes: {
          breakfast: '07:00',
          lunch: '12:30',
          dinner: '19:30',
          flexibility: 'flexible' as const
        }
      };

      const startTime = Date.now();
      const result = mealPatterns.coordinateFamilyMealSchedule(largeFamilyContext, mockCulturalProfile);
      const endTime = Date.now();
      
      expect(result).toBeDefined();
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });
});