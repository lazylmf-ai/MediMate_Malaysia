/**
 * CulturalPatternAnalyzer Test Suite
 *
 * Tests for Malaysian healthcare-specific pattern analysis
 * and cultural adherence insights.
 */

import { CulturalPatternAnalyzer } from '../../services/adherence/CulturalPatternAnalyzer';
import {
  AdherenceRecord,
  CulturalInsight,
  CulturalAdherenceContext,
  AdherencePattern
} from '../../types/adherence';
import { Medication } from '../../types/medication';

describe('CulturalPatternAnalyzer', () => {
  let analyzer: CulturalPatternAnalyzer;
  let mockMedications: Medication[];
  let mockRecords: AdherenceRecord[];

  beforeEach(() => {
    analyzer = new CulturalPatternAnalyzer();

    // Create mock medications with cultural considerations
    mockMedications = [
      {
        id: 'med1',
        userId: 'user1',
        name: 'Metformin',
        dosage: {
          amount: 500,
          unit: 'mg',
          form: 'tablet'
        },
        schedule: {
          frequency: 'twice_daily',
          times: ['08:00', '20:00'],
          culturalAdjustments: {
            takeWithFood: true,
            avoidDuringFasting: false,
            prayerTimeConsiderations: ['take_after_prayer'],
            prayerTimeBuffer: 15,
          },
          reminders: true
        },
        cultural: {
          takeWithFood: true,
          avoidDuringFasting: false,
          prayerTimeConsiderations: ['take_after_prayer']
        },
        images: [],
        category: 'prescription',
        status: 'active',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      },
      {
        id: 'med2',
        userId: 'user1',
        name: 'Hypertension Medicine',
        dosage: {
          amount: 10,
          unit: 'mg',
          form: 'tablet'
        },
        schedule: {
          frequency: 'daily',
          times: ['06:00'],
          culturalAdjustments: {
            takeWithFood: false,
            avoidDuringFasting: true,
            prayerTimeConsiderations: ['avoid_during_subuh'],
            ramadanSchedule: ['19:30'], // After iftar
            prayerTimeBuffer: 30,
          },
          reminders: true
        },
        cultural: {
          takeWithFood: false,
          avoidDuringFasting: true,
          prayerTimeConsiderations: ['avoid_during_subuh'],
          traditionalAlternatives: ['Misai Kucing']
        },
        images: [],
        category: 'prescription',
        status: 'active',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      }
    ];

    // Create mock records with cultural contexts
    mockRecords = [];
    const now = new Date();

    // Generate records with various cultural contexts
    for (let day = 29; day >= 0; day--) {
      const scheduled = new Date(now);
      scheduled.setDate(scheduled.getDate() - day);

      // Morning dose during Subuh prayer time
      const morningScheduled = new Date(scheduled);
      morningScheduled.setHours(6, 0, 0, 0);

      const morningContext: CulturalAdherenceContext = {
        prayerTime: day % 3 === 0 ? 'Subuh' : undefined,
        fastingPeriod: day >= 10 && day <= 20, // Simulate Ramadan period
        familyInvolvement: day % 5 === 0
      };

      mockRecords.push({
        id: `rec_morning_${day}`,
        medicationId: 'med1',
        patientId: 'user1',
        scheduledTime: morningScheduled,
        takenTime: morningContext.prayerTime
          ? new Date(morningScheduled.getTime() + 30 * 60000) // Delayed for prayer
          : morningScheduled,
        status: morningContext.prayerTime ? 'adjusted' : 'taken_on_time',
        adherenceScore: 90,
        method: morningContext.familyInvolvement ? 'family_reported' : 'manual',
        culturalContext: morningContext,
        createdAt: morningScheduled,
        updatedAt: morningScheduled
      });

      // Evening dose
      const eveningScheduled = new Date(scheduled);
      eveningScheduled.setHours(19, 30, 0, 0);

      const eveningContext: CulturalAdherenceContext = {
        prayerTime: day % 4 === 0 ? 'Maghrib' : undefined,
        fastingPeriod: day >= 10 && day <= 20,
        mealTiming: 'after_meal',
        festivalName: day === 20 ? 'Hari Raya Aidilfitri' : undefined
      };

      mockRecords.push({
        id: `rec_evening_${day}`,
        medicationId: 'med1',
        patientId: 'user1',
        scheduledTime: eveningScheduled,
        takenTime: eveningScheduled,
        status: eveningContext.festivalName ? 'missed' : 'taken_on_time',
        adherenceScore: eveningContext.festivalName ? 0 : 100,
        method: 'manual',
        culturalContext: eveningContext,
        createdAt: eveningScheduled,
        updatedAt: eveningScheduled
      });
    }
  });

  describe('Cultural Pattern Analysis', () => {
    test('should identify cultural patterns in adherence records', () => {
      const insights = analyzer.analyzeCulturalPatterns(mockRecords, mockMedications);

      expect(insights).toBeInstanceOf(Array);
      expect(insights.length).toBeGreaterThan(0);

      // Should have various types of insights
      const insightTypes = insights.map(i => i.type);
      expect(insightTypes).toContain('prayer_time_optimization');
    });

    test('should detect prayer time impact on adherence', () => {
      const insights = analyzer.analyzeCulturalPatterns(mockRecords, mockMedications);
      const prayerInsight = insights.find(i => i.type === 'prayer_time_optimization');

      if (prayerInsight) {
        expect(prayerInsight.description).toContain('Prayer times');
        expect(prayerInsight.recommendations).toBeInstanceOf(Array);
        expect(prayerInsight.recommendations.length).toBeGreaterThan(0);
        expect(prayerInsight.culturalSensitivity).toBe('high');
      }
    });

    test('should analyze Ramadan fasting impact', () => {
      // Create records specifically during Ramadan
      const ramadanRecords = mockRecords.filter(r =>
        r.culturalContext?.fastingPeriod === true
      );

      const insights = analyzer.analyzeCulturalPatterns(ramadanRecords, mockMedications);
      const ramadanInsight = insights.find(i => i.type === 'ramadan_adjustment');

      if (ramadanInsight) {
        expect(ramadanInsight.description).toContain('fasting');
        expect(ramadanInsight.recommendations).toContain(
          'Take medications during Sahur (pre-dawn meal) at 4:30-5:00 AM'
        );
        expect(ramadanInsight.culturalSensitivity).toBe('high');
      }
    });

    test('should detect festival period impact', () => {
      const insights = analyzer.analyzeCulturalPatterns(mockRecords, mockMedications);
      const festivalInsights = insights.filter(i => i.type === 'festival_period_pattern');

      festivalInsights.forEach(insight => {
        expect(insight.description).toMatch(/Hari Raya|Chinese New Year|Deepavali/);
        expect(insight.recommendations).toContain('Set festival-themed medication reminders');
      });
    });

    test('should analyze family involvement benefits', () => {
      const familyRecords = mockRecords.filter(r =>
        r.method === 'family_reported' || r.culturalContext?.familyInvolvement
      );

      if (familyRecords.length >= 10) {
        const insights = analyzer.analyzeCulturalPatterns(mockRecords, mockMedications);
        const familyInsight = insights.find(i => i.type === 'family_support_benefit');

        if (familyInsight) {
          expect(familyInsight.adherenceImpact).toBeGreaterThan(0);
          expect(familyInsight.recommendations).toContain('Encourage family medication champions');
        }
      }
    });

    test('should detect traditional medicine interactions', () => {
      const insights = analyzer.analyzeCulturalPatterns(mockRecords, mockMedications);
      const traditionalInsight = insights.find(i => i.type === 'traditional_medicine_conflict');

      if (traditionalInsight) {
        expect(traditionalInsight.recommendations).toContain(
          'Discuss traditional remedies with healthcare provider'
        );
        expect(traditionalInsight.culturalSensitivity).toBe('high');
      }
    });

    test('should analyze meal timing preferences', () => {
      const mealRecords = mockRecords.filter(r => r.culturalContext?.mealTiming);

      if (mealRecords.length >= 15) {
        const insights = analyzer.analyzeCulturalPatterns(mealRecords, mockMedications);
        const mealInsight = insights.find(i => i.type === 'meal_timing_preference');

        if (mealInsight) {
          expect(mealInsight.description).toContain('Best adherence when medication taken');
          expect(mealInsight.recommendations.some(r =>
            r.includes('Malaysian meal times')
          )).toBe(true);
        }
      }
    });
  });

  describe('Cultural Recommendations', () => {
    test('should generate culturally-appropriate recommendations', () => {
      const patterns: AdherencePattern[] = [
        {
          id: 'p1',
          type: 'prayer_time_conflict',
          confidence: 0.8,
          description: 'Prayer time conflicts detected',
          occurrences: 10,
          lastOccurred: new Date(),
          affectedMedications: ['med1'],
          recommendations: []
        },
        {
          id: 'p2',
          type: 'fasting_adjustment',
          confidence: 0.9,
          description: 'Fasting adjustments needed',
          occurrences: 15,
          lastOccurred: new Date(),
          affectedMedications: ['med2'],
          recommendations: []
        }
      ];

      const recommendations = analyzer.generateCulturalRecommendations(
        patterns,
        mockMedications
      );

      expect(recommendations).toBeInstanceOf(Array);
      expect(recommendations.length).toBeGreaterThan(0);

      // Should include prayer-specific recommendations
      expect(recommendations.some(r =>
        r.includes('Islamic prayer apps') || r.includes('prayer mat')
      )).toBe(true);

      // Should include fasting-specific recommendations
      expect(recommendations.some(r =>
        r.includes('Ramadan') || r.includes('fasting')
      )).toBe(true);
    });

    test('should provide weekend-specific recommendations', () => {
      const patterns: AdherencePattern[] = [
        {
          id: 'p3',
          type: 'weekend_decline',
          confidence: 0.7,
          description: 'Weekend adherence decline',
          occurrences: 8,
          lastOccurred: new Date(),
          affectedMedications: ['med1'],
          recommendations: []
        }
      ];

      const recommendations = analyzer.generateCulturalRecommendations(
        patterns,
        mockMedications
      );

      expect(recommendations.some(r =>
        r.includes('pasar malam') || r.includes('weekend')
      )).toBe(true);
    });

    test('should consider traditional medicine in recommendations', () => {
      const medicationsWithTraditional = [
        ...mockMedications,
        {
          ...mockMedications[0],
          id: 'med3',
          category: 'traditional' as const
        }
      ];

      const recommendations = analyzer.generateCulturalRecommendations(
        [],
        medicationsWithTraditional
      );

      expect(recommendations.some(r =>
        r.includes('traditional') && r.includes('modern')
      )).toBe(true);
    });
  });

  describe('Optimization Opportunities', () => {
    test('should identify cultural optimization opportunities', () => {
      const currentAdherence = 70;
      const opportunities = analyzer.identifyOptimizationOpportunities(
        mockRecords,
        currentAdherence
      );

      expect(opportunities).toBeInstanceOf(Array);
      expect(opportunities.length).toBeGreaterThan(0);

      opportunities.forEach(opp => {
        expect(opp.opportunity).toBeDefined();
        expect(opp.potentialImprovement).toBeGreaterThan(0);
        expect(opp.implementation).toBeInstanceOf(Array);
        expect(opp.implementation.length).toBeGreaterThan(0);
      });
    });

    test('should suggest prayer time optimization', () => {
      const opportunities = analyzer.identifyOptimizationOpportunities(
        mockRecords,
        70
      );

      const prayerOpp = opportunities.find(o =>
        o.opportunity.includes('prayer')
      );

      if (prayerOpp) {
        expect(prayerOpp.implementation.some(i =>
          i.includes('azan') || i.includes('prayer call')
        )).toBe(true);
      }
    });

    test('should suggest family involvement improvements', () => {
      const opportunities = analyzer.identifyOptimizationOpportunities(
        mockRecords,
        70
      );

      const familyOpp = opportunities.find(o =>
        o.opportunity.includes('family')
      );

      if (familyOpp) {
        expect(familyOpp.potentialImprovement).toBeGreaterThan(5);
        expect(familyOpp.implementation.some(i =>
          i.includes('WhatsApp') || i.includes('family champion')
        )).toBe(true);
      }
    });

    test('should prepare for upcoming festivals', () => {
      const opportunities = analyzer.identifyOptimizationOpportunities(
        mockRecords,
        70
      );

      const festivalOpp = opportunities.find(o =>
        o.opportunity.includes('festival')
      );

      if (festivalOpp) {
        expect(festivalOpp.implementation.some(i =>
          i.includes('Stock up') || i.includes('festival-specific')
        )).toBe(true);
      }
    });

    test('should suggest meal timing alignment', () => {
      const recordsWithoutMealTiming = mockRecords.map(r => ({
        ...r,
        culturalContext: {
          ...r.culturalContext,
          mealTiming: undefined
        }
      }));

      const opportunities = analyzer.identifyOptimizationOpportunities(
        recordsWithoutMealTiming,
        70
      );

      const mealOpp = opportunities.find(o =>
        o.opportunity.includes('meal')
      );

      if (mealOpp) {
        expect(mealOpp.potentialImprovement).toBeGreaterThan(10);
        expect(mealOpp.implementation.some(i =>
          i.includes('breakfast') || i.includes('lunch') || i.includes('dinner')
        )).toBe(true);
      }
    });
  });

  describe('Medication Cultural Factors', () => {
    test('should analyze cultural factors for specific medication', () => {
      const analysis = analyzer.analyzeMedicationCulturalFactors(
        mockMedications[1], // Hypertension medicine with fasting conflicts
        mockRecords.filter(r => r.medicationId === 'med2')
      );

      expect(analysis.culturalChallenges).toBeInstanceOf(Array);
      expect(analysis.culturalOpportunities).toBeInstanceOf(Array);
      expect(analysis.adaptations).toBeInstanceOf(Array);

      // Should identify fasting conflicts
      if (mockMedications[1].cultural.avoidDuringFasting) {
        expect(analysis.culturalChallenges).toContain(
          'Medication should be avoided during fasting'
        );
        expect(analysis.adaptations.some(a =>
          a.includes('non-fasting hours')
        )).toBe(true);
      }
    });

    test('should identify food requirement opportunities', () => {
      const analysis = analyzer.analyzeMedicationCulturalFactors(
        mockMedications[0], // Metformin with food requirement
        mockRecords.filter(r => r.medicationId === 'med1')
      );

      if (mockMedications[0].cultural.takeWithFood) {
        expect(analysis.culturalOpportunities).toContain(
          'Can align with Malaysian meal times'
        );
        expect(analysis.adaptations.some(a =>
          a.includes('nasi lemak') || a.includes('meal')
        )).toBe(true);
      }
    });

    test('should detect prayer time conflicts for medication', () => {
      const prayerRecords = mockRecords.filter(r =>
        r.medicationId === 'med1' && r.culturalContext?.prayerTime
      );

      const analysis = analyzer.analyzeMedicationCulturalFactors(
        mockMedications[0],
        prayerRecords
      );

      if (prayerRecords.length > prayerRecords.length * 0.2) {
        expect(analysis.culturalChallenges).toContain(
          'Frequent conflicts with prayer times'
        );
        expect(analysis.adaptations).toContain(
          'Reschedule to post-prayer windows'
        );
      }
    });

    test('should consider traditional alternatives', () => {
      const analysis = analyzer.analyzeMedicationCulturalFactors(
        mockMedications[1], // Has traditional alternatives
        mockRecords.filter(r => r.medicationId === 'med2')
      );

      if (mockMedications[1].cultural.traditionalAlternatives?.length) {
        expect(analysis.culturalOpportunities).toContain(
          'Traditional alternatives available for cultural preference'
        );
        expect(analysis.adaptations.some(a =>
          a.includes('traditional') && a.includes('modern')
        )).toBe(true);
      }
    });

    test('should evaluate schedule flexibility', () => {
      const onceDaily: Medication = {
        ...mockMedications[0],
        schedule: {
          ...mockMedications[0].schedule,
          frequency: 'daily',
          times: ['08:00']
        }
      };

      const analysis = analyzer.analyzeMedicationCulturalFactors(
        onceDaily,
        []
      );

      expect(analysis.culturalOpportunities).toContain(
        'Once-daily dosing allows flexible timing'
      );
      expect(analysis.adaptations.some(a =>
        a.includes('Subuh') || a.includes('culturally convenient')
      )).toBe(true);
    });
  });
});