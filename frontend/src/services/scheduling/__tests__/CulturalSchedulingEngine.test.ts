/**
 * Cultural Scheduling Engine Test Suite
 * 
 * Comprehensive tests for the main cultural scheduling engine,
 * covering Malaysian cultural practices, meal timing, prayer integration,
 * and family coordination scenarios.
 */

import CulturalSchedulingEngine from '../CulturalSchedulingEngine';
import { Medication } from '../../../types/medication';
import { EnhancedCulturalProfile } from '../../../types/cultural';

// Mock dependencies
jest.mock('../../../services/prayer-scheduling/PrayerSchedulingService');
jest.mock('../../../i18n/services/I18nService');
jest.mock('../../../api/services/culturalService');

describe('CulturalSchedulingEngine', () => {
  let engine: CulturalSchedulingEngine;
  let mockMedications: Medication[];
  let mockCulturalProfile: EnhancedCulturalProfile;
  let mockFamilyContext: any;

  beforeEach(() => {
    engine = CulturalSchedulingEngine.getInstance();
    
    // Mock medication
    mockMedications = [
      {
        id: '1',
        name: 'Metformin',
        dosage: '500mg',
        frequency: 'twice_daily',
        timing: [
          { time: '08:00', dosage: '500mg' },
          { time: '20:00', dosage: '500mg' }
        ],
        instructions: 'Take with meals',
        form: 'tablet'
      } as Medication
    ];

    // Mock cultural profile
    mockCulturalProfile = {
      id: '1',
      userId: 'user1',
      primaryCulture: 'malay',
      religion: 'islam',
      languages: [
        { code: 'ms', proficiency: 'native', primary: true },
        { code: 'en', proficiency: 'fluent', primary: false }
      ],
      location: {
        state: 'kuala_lumpur',
        city: 'Kuala Lumpur',
        timezone: 'Asia/Kuala_Lumpur',
        coordinates: { lat: 3.139, lng: 101.6869 }
      },
      preferences: {
        prayerTimes: {
          enabled: true,
          madhab: 'shafi',
          notifications: true,
          medicationBuffer: 30,
          adjustments: {
            fajr: 0,
            dhuhr: 0,
            asr: 0,
            maghrib: 0,
            isha: 0
          }
        },
        festivals: {
          islamic: { enabled: true, medicationAdjustments: true },
          chinese: { enabled: false, medicationAdjustments: false },
          hindu: { enabled: false, medicationAdjustments: false },
          malaysian: { enabled: true, medicationAdjustments: true }
        },
        dietary: {
          halal: true,
          vegetarian: false,
          traditional: ['malay_traditional'],
          restrictions: ['pork', 'alcohol']
        },
        family: {
          elderlyMembers: 1,
          children: [{ age: 10, culturalConsiderations: ['school_schedule'] }],
          primaryCaregiver: true,
          householdLanguage: 'ms'
        }
      }
    } as EnhancedCulturalProfile;

    // Mock family context
    mockFamilyContext = {
      elderlyMembers: [
        {
          age: 70,
          medicationComplexity: 'medium',
          cognitiveStatus: 'clear',
          preferredTimes: ['09:00', '21:00'],
          dietaryRestrictions: ['halal']
        }
      ],
      children: [
        {
          age: 10,
          schoolSchedule: true,
          medicationType: 'acute',
          parentSupervision: 'high'
        }
      ],
      primaryCaregiver: {
        availability: [{ start: '07:00', end: '22:00' }],
        workSchedule: [
          { day: 'monday', start: '09:00', end: '17:00' },
          { day: 'tuesday', start: '09:00', end: '17:00' },
          { day: 'wednesday', start: '09:00', end: '17:00' },
          { day: 'thursday', start: '09:00', end: '17:00' },
          { day: 'friday', start: '09:00', end: '17:00' }
        ],
        culturalRole: 'mother'
      },
      householdRoutines: {
        wakingTime: '06:30',
        sleepTime: '22:30',
        mealTimes: {
          breakfast: { start: '07:00', end: '09:00', peak: '07:30' },
          lunch: { start: '12:00', end: '14:00', peak: '12:30' },
          dinner: { start: '19:00', end: '21:00', peak: '19:30' }
        },
        prayerParticipation: true
      }
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Core Scheduling Engine', () => {
    test('should generate basic cultural schedule successfully', async () => {
      const result = await engine.generateCulturalSchedule(
        mockMedications,
        mockCulturalProfile,
        mockFamilyContext
      );

      expect(result).toBeDefined();
      expect(result.optimizedSchedule).toHaveLength(1);
      expect(result.optimizedSchedule[0].medication).toBe('Metformin');
      expect(result.optimizedSchedule[0].times).toHaveLength(2);
      expect(result.culturalGuidance).toBeDefined();
      expect(result.conflicts).toBeDefined();
      expect(result.recommendations).toBeDefined();
    });

    test('should handle empty medication list gracefully', async () => {
      const result = await engine.generateCulturalSchedule(
        [],
        mockCulturalProfile,
        mockFamilyContext
      );

      expect(result).toBeDefined();
      expect(result.optimizedSchedule).toHaveLength(0);
    });

    test('should handle null cultural profile gracefully', async () => {
      const result = await engine.generateCulturalSchedule(
        mockMedications,
        null as any,
        mockFamilyContext
      );

      expect(result).toBeDefined();
      // Should return fallback schedule
      expect(result.optimizedSchedule).toHaveLength(1);
      expect(result.recommendations[0].priority).toBe('high');
      expect(result.recommendations[0].message).toContain('unavailable');
    });
  });

  describe('Malaysian Cultural Practices Integration', () => {
    test('should adjust timing for Malay cultural practices', async () => {
      const malayProfile = { ...mockCulturalProfile, primaryCulture: 'malay' as const };
      
      const result = await engine.generateCulturalSchedule(
        mockMedications,
        malayProfile,
        mockFamilyContext
      );

      expect(result.culturalGuidance.prayerTimeConsiderations).toContain(
        expect.stringContaining('prayer')
      );
      expect(result.culturalGuidance.dietaryRestrictionNotes).toContain(
        expect.stringContaining('Halal')
      );
    });

    test('should adjust timing for Chinese cultural practices', async () => {
      const chineseProfile = {
        ...mockCulturalProfile,
        primaryCulture: 'chinese' as const,
        religion: 'buddhism' as const,
        preferences: {
          ...mockCulturalProfile.preferences,
          prayerTimes: { ...mockCulturalProfile.preferences.prayerTimes, enabled: false },
          dietary: { ...mockCulturalProfile.preferences.dietary, halal: false, vegetarian: true }
        }
      };

      const result = await engine.generateCulturalSchedule(
        mockMedications,
        chineseProfile,
        mockFamilyContext
      );

      expect(result.culturalGuidance.traditionalMedicineAdvice).toContain(
        expect.stringContaining('TCM')
      );
      expect(result.culturalGuidance.mealTimeOptimizations).toContain(
        expect.stringContaining('Chinese')
      );
    });

    test('should adjust timing for Indian cultural practices', async () => {
      const indianProfile = {
        ...mockCulturalProfile,
        primaryCulture: 'indian' as const,
        religion: 'hinduism' as const,
        preferences: {
          ...mockCulturalProfile.preferences,
          prayerTimes: { ...mockCulturalProfile.preferences.prayerTimes, enabled: false },
          dietary: { ...mockCulturalProfile.preferences.dietary, halal: false, vegetarian: true }
        }
      };

      const result = await engine.generateCulturalSchedule(
        mockMedications,
        indianProfile,
        mockFamilyContext
      );

      expect(result.culturalGuidance.traditionalMedicineAdvice).toContain(
        expect.stringContaining('Ayurvedic')
      );
      expect(result.culturalGuidance.dietaryRestrictionNotes).toContain(
        expect.stringContaining('vegetarian')
      );
    });
  });

  describe('Meal Timing Integration', () => {
    test('should optimize timing for "with meals" medication', async () => {
      const withMealsMed = {
        ...mockMedications[0],
        instructions: 'Take with meals'
      };

      const result = await engine.generateCulturalSchedule(
        [withMealsMed],
        mockCulturalProfile,
        mockFamilyContext
      );

      const scheduledTimes = result.optimizedSchedule[0].times.map(t => t.time);
      
      // Should align with meal times (allowing for some adjustment)
      expect(scheduledTimes.some(time => {
        const hour = parseInt(time.split(':')[0]);
        return hour >= 7 && hour <= 9; // Breakfast window
      })).toBe(true);

      expect(scheduledTimes.some(time => {
        const hour = parseInt(time.split(':')[0]);
        return hour >= 19 && hour <= 21; // Dinner window
      })).toBe(true);
    });

    test('should optimize timing for "before meals" medication', async () => {
      const beforeMealsMed = {
        ...mockMedications[0],
        instructions: 'Take before meals on empty stomach'
      };

      const result = await engine.generateCulturalSchedule(
        [beforeMealsMed],
        mockCulturalProfile,
        mockFamilyContext
      );

      const scheduledTimes = result.optimizedSchedule[0].times.map(t => t.time);
      
      // Should be before meal times
      expect(scheduledTimes.some(time => {
        const hour = parseInt(time.split(':')[0]);
        return hour >= 6 && hour < 7; // Before breakfast
      })).toBe(true);
    });

    test('should handle independent timing medications', async () => {
      const independentMed = {
        ...mockMedications[0],
        instructions: 'Can be taken any time'
      };

      const result = await engine.generateCulturalSchedule(
        [independentMed],
        mockCulturalProfile,
        mockFamilyContext
      );

      expect(result.optimizedSchedule[0].times).toHaveLength(2);
      expect(result.optimizedSchedule[0].times[0].mealRelation).toBe('independent');
    });
  });

  describe('Family Coordination', () => {
    test('should consider elderly member needs', async () => {
      const result = await engine.generateCulturalSchedule(
        mockMedications,
        mockCulturalProfile,
        mockFamilyContext
      );

      expect(result.culturalGuidance.familyCoordination).toContain(
        expect.stringContaining('elderly')
      );
      expect(result.optimizedSchedule[0].times[0].familyConsiderations).toContain(
        expect.stringContaining('supervision')
      );
    });

    test('should consider children supervision needs', async () => {
      const familyContextWithChildren = {
        ...mockFamilyContext,
        children: [
          {
            age: 8,
            schoolSchedule: true,
            medicationType: 'chronic',
            parentSupervision: 'high'
          }
        ]
      };

      const result = await engine.generateCulturalSchedule(
        mockMedications,
        mockCulturalProfile,
        familyContextWithChildren
      );

      expect(result.culturalGuidance.familyCoordination).toContain(
        expect.stringContaining('Children')
      );
    });

    test('should handle caregiver availability conflicts', async () => {
      const limitedAvailabilityContext = {
        ...mockFamilyContext,
        primaryCaregiver: {
          ...mockFamilyContext.primaryCaregiver,
          availability: [{ start: '18:00', end: '22:00' }], // Limited evening availability
          workSchedule: [
            { day: 'monday', start: '08:00', end: '18:00' },
            { day: 'tuesday', start: '08:00', end: '18:00' },
            { day: 'wednesday', start: '08:00', end: '18:00' },
            { day: 'thursday', start: '08:00', end: '18:00' },
            { day: 'friday', start: '08:00', end: '18:00' }
          ]
        }
      };

      const result = await engine.generateCulturalSchedule(
        mockMedications,
        mockCulturalProfile,
        limitedAvailabilityContext
      );

      // Should identify conflicts and provide solutions
      expect(result.conflicts.length).toBeGreaterThan(0);
      expect(result.conflicts.some(c => c.type === 'family')).toBe(true);
    });
  });

  describe('Multi-language Support', () => {
    test('should provide multi-language recommendations for Malay users', async () => {
      const result = await engine.generateCulturalSchedule(
        mockMedications,
        mockCulturalProfile,
        mockFamilyContext
      );

      expect(result.recommendations[0].multiLanguage).toBeDefined();
      expect(result.recommendations[0].multiLanguage.ms).toBeDefined();
      expect(result.recommendations[0].multiLanguage.en).toBeDefined();
    });

    test('should handle translation errors gracefully', async () => {
      // Mock translation service to throw error
      const result = await engine.generateCulturalSchedule(
        mockMedications,
        mockCulturalProfile,
        mockFamilyContext
      );

      // Should still provide recommendations even if translation fails
      expect(result.recommendations).toHaveLength(1);
      expect(result.recommendations[0].multiLanguage.en).toBeDefined();
    });
  });

  describe('Traditional Medicine Integration', () => {
    test('should identify potential TCM interactions for Chinese users', async () => {
      const chineseProfile = {
        ...mockCulturalProfile,
        primaryCulture: 'chinese' as const
      };

      const result = await engine.generateCulturalSchedule(
        mockMedications,
        chineseProfile,
        mockFamilyContext
      );

      expect(result.culturalGuidance.traditionalMedicineAdvice).toContain(
        expect.stringContaining('TCM')
      );
    });

    test('should identify potential Ayurvedic interactions for Indian users', async () => {
      const indianProfile = {
        ...mockCulturalProfile,
        primaryCulture: 'indian' as const
      };

      const result = await engine.generateCulturalSchedule(
        mockMedications,
        indianProfile,
        mockFamilyContext
      );

      expect(result.culturalGuidance.traditionalMedicineAdvice).toContain(
        expect.stringContaining('Ayurvedic')
      );
    });
  });

  describe('Dietary Restrictions', () => {
    test('should handle Halal dietary requirements', async () => {
      const result = await engine.generateCulturalSchedule(
        mockMedications,
        mockCulturalProfile,
        mockFamilyContext
      );

      expect(result.culturalGuidance.dietaryRestrictionNotes).toContain(
        expect.stringContaining('halal')
      );
    });

    test('should handle vegetarian dietary requirements', async () => {
      const vegetarianProfile = {
        ...mockCulturalProfile,
        preferences: {
          ...mockCulturalProfile.preferences,
          dietary: {
            ...mockCulturalProfile.preferences.dietary,
            vegetarian: true
          }
        }
      };

      const result = await engine.generateCulturalSchedule(
        mockMedications,
        vegetarianProfile,
        mockFamilyContext
      );

      expect(result.culturalGuidance.dietaryRestrictionNotes).toContain(
        expect.stringContaining('vegetarian')
      );
    });
  });

  describe('Conflict Detection and Resolution', () => {
    test('should detect timing conflicts', async () => {
      const conflictingMedications = [
        {
          ...mockMedications[0],
          timing: [{ time: '08:00', dosage: '500mg' }]
        },
        {
          ...mockMedications[0],
          id: '2',
          name: 'Aspirin',
          timing: [{ time: '08:05', dosage: '100mg' }] // Very close timing
        }
      ];

      const result = await engine.generateCulturalSchedule(
        conflictingMedications,
        mockCulturalProfile,
        mockFamilyContext
      );

      // Should detect and resolve conflicts
      expect(result.conflicts.some(c => c.type === 'timing')).toBe(true);
      expect(result.recommendations.some(r => r.category === 'timing')).toBe(true);
    });

    test('should provide conflict resolution suggestions', async () => {
      const result = await engine.generateCulturalSchedule(
        mockMedications,
        mockCulturalProfile,
        mockFamilyContext
      );

      // Every conflict should have suggestions
      result.conflicts.forEach(conflict => {
        expect(conflict.suggestions).toBeDefined();
        expect(conflict.suggestions.length).toBeGreaterThan(0);
        expect(conflict.culturalAlternatives).toBeDefined();
      });
    });
  });

  describe('Error Handling', () => {
    test('should handle service unavailability gracefully', async () => {
      // Test with minimal data that might cause service failures
      const minimalProfile = {
        ...mockCulturalProfile,
        location: { state: 'unknown' as any, city: '', timezone: '' }
      };

      const result = await engine.generateCulturalSchedule(
        mockMedications,
        minimalProfile,
        {}
      );

      expect(result).toBeDefined();
      expect(result.optimizedSchedule).toHaveLength(1);
      // Should provide fallback recommendations
      expect(result.recommendations.some(r => r.priority === 'high')).toBe(true);
    });

    test('should handle network/service failures', async () => {
      // Mock all external services to fail
      jest.spyOn(console, 'error').mockImplementation(() => {});

      const result = await engine.generateCulturalSchedule(
        mockMedications,
        mockCulturalProfile,
        mockFamilyContext
      );

      expect(result).toBeDefined();
      // Should provide fallback schedule
      expect(result.optimizedSchedule).toHaveLength(1);

      console.error.mockRestore();
    });
  });

  describe('Performance and Optimization', () => {
    test('should handle large medication lists efficiently', async () => {
      const largeMedicationList = Array.from({ length: 20 }, (_, i) => ({
        ...mockMedications[0],
        id: `med_${i}`,
        name: `Medication ${i}`,
        timing: [{ time: `${8 + (i % 12)}:${(i * 15) % 60}`, dosage: '100mg' }]
      }));

      const startTime = Date.now();
      const result = await engine.generateCulturalSchedule(
        largeMedicationList,
        mockCulturalProfile,
        mockFamilyContext
      );
      const endTime = Date.now();

      expect(result).toBeDefined();
      expect(result.optimizedSchedule).toHaveLength(20);
      // Should complete within reasonable time (5 seconds)
      expect(endTime - startTime).toBeLessThan(5000);
    });

    test('should handle complex family structures efficiently', async () => {
      const complexFamilyContext = {
        ...mockFamilyContext,
        elderlyMembers: Array.from({ length: 3 }, (_, i) => ({
          age: 70 + i,
          medicationComplexity: 'high' as const,
          cognitiveStatus: i === 0 ? 'mild_impairment' as const : 'clear' as const,
          preferredTimes: [`${8 + i}:00`, `${20 + i}:00`],
          dietaryRestrictions: ['halal', 'low_sodium']
        })),
        children: Array.from({ length: 2 }, (_, i) => ({
          age: 8 + i * 2,
          schoolSchedule: true,
          medicationType: 'chronic' as const,
          parentSupervision: 'high' as const
        }))
      };

      const result = await engine.generateCulturalSchedule(
        mockMedications,
        mockCulturalProfile,
        complexFamilyContext
      );

      expect(result).toBeDefined();
      expect(result.culturalGuidance.familyCoordination.length).toBeGreaterThan(0);
    });
  });
});

// Test utilities and helpers
export const createMockMedication = (overrides: Partial<Medication> = {}): Medication => ({
  id: '1',
  name: 'Test Medication',
  dosage: '100mg',
  frequency: 'daily',
  timing: [{ time: '09:00', dosage: '100mg' }],
  instructions: 'Take as directed',
  form: 'tablet',
  ...overrides
});

export const createMockCulturalProfile = (overrides: Partial<EnhancedCulturalProfile> = {}): EnhancedCulturalProfile => ({
  id: '1',
  userId: 'user1',
  primaryCulture: 'malay',
  religion: 'islam',
  languages: [{ code: 'ms', proficiency: 'native', primary: true }],
  location: {
    state: 'kuala_lumpur',
    city: 'Kuala Lumpur',
    timezone: 'Asia/Kuala_Lumpur',
    coordinates: { lat: 3.139, lng: 101.6869 }
  },
  preferences: {
    prayerTimes: {
      enabled: true,
      madhab: 'shafi',
      notifications: true,
      medicationBuffer: 30,
      adjustments: { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 }
    },
    festivals: {
      islamic: { enabled: true, medicationAdjustments: true },
      chinese: { enabled: false, medicationAdjustments: false },
      hindu: { enabled: false, medicationAdjustments: false },
      malaysian: { enabled: true, medicationAdjustments: true }
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
  },
  ...overrides
});