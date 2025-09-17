/**
 * CulturalPatternAnalyzer Test Suite
 *
 * Tests for Malaysian healthcare-specific pattern analysis
 * and culturally-appropriate adherence insights.
 */

import { CulturalPatternAnalyzer } from '../../services/adherence/CulturalPatternAnalyzer';
import {
  AdherenceRecord,
  CulturalInsight,
  AdherencePattern,
  AdherenceStatus,
  CulturalAdherenceContext
} from '../../types/adherence';
import { Medication } from '../../types/medication';

describe('CulturalPatternAnalyzer', () => {
  let analyzer: CulturalPatternAnalyzer;
  let mockMedications: Medication[];
  let mockRecords: AdherenceRecord[];

  beforeEach(() => {
    analyzer = new CulturalPatternAnalyzer();

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
            prayerTimeConsiderations: [],
            prayerTimeBuffer: 15,
          },
          reminders: true
        },
        cultural: {
          takeWithFood: true,
          avoidDuringFasting: false,
          prayerTimeConsiderations: [],
          traditionalAlternatives: [],
        },
        images: [],
        category: 'prescription',
        status: 'active',
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z'
      },
      {
        id: 'med2',
        userId: 'user1',
        name: 'Traditional Herbal Medicine',
        dosage: {
          amount: 1,
          unit: 'tablet',
          form: 'tablet'
        },
        schedule: {
          frequency: 'daily',
          times: ['09:00'],
          culturalAdjustments: {
            takeWithFood: false,
            avoidDuringFasting: true,
            prayerTimeConsiderations: ['avoid_during_prayer'],
            prayerTimeBuffer: 30,
          },
          reminders: true
        },
        cultural: {
          takeWithFood: false,
          avoidDuringFasting: true,
          prayerTimeConsiderations: ['avoid_during_prayer'],
          traditionalAlternatives: ['Jamu', 'Tongkat Ali'],
        },
        images: [],
        category: 'traditional',
        status: 'active',
        createdAt: '2025-01-01T00:00:00Z',
        updatedAt: '2025-01-01T00:00:00Z'
      }
    ];

    mockRecords = [];
  });

  describe('analyzeCulturalPatterns', () => {
    it('should identify prayer time impact on adherence', () => {
      // Create records during prayer times with misses
      mockRecords = createPrayerTimeRecords();

      const insights = analyzer.analyzeCulturalPatterns(mockRecords, mockMedications);
      const prayerInsight = insights.find(i => i.type === 'prayer_time_optimization');

      expect(prayerInsight).toBeDefined();
      expect(prayerInsight?.adherenceImpact).toBeLessThan(0);
      expect(prayerInsight?.culturalSensitivity).toBe('high');
      expect(prayerInsight?.recommendations).toContain('Schedule medications 30 minutes after prayer times');
    });

    it('should detect Ramadan fasting impact', () => {
      // Create records during fasting period
      mockRecords = createRamadanRecords();

      const insights = analyzer.analyzeCulturalPatterns(mockRecords, mockMedications);
      const ramadanInsight = insights.find(i => i.type === 'ramadan_adjustment');

      expect(ramadanInsight).toBeDefined();
      expect(ramadanInsight?.recommendations).toContain('Take medications during Sahur (pre-dawn meal) at 4:30-5:00 AM');
      expect(ramadanInsight?.culturalSensitivity).toBe('high');
    });

    it('should analyze festival period impact', () => {
      // Create records during Hari Raya
      const festivalDate = new Date('2025-03-30'); // Hari Raya period
      mockRecords = createFestivalRecords(festivalDate);

      const insights = analyzer.analyzeCulturalPatterns(mockRecords, mockMedications);
      const festivalInsight = insights.find(i => i.type === 'festival_period_pattern');

      expect(festivalInsight).toBeDefined();
      expect(festivalInsight?.description).toContain('Hari Raya');
      expect(festivalInsight?.recommendations).toContain('Set festival-themed medication reminders');
    });

    it('should identify family involvement benefits', () => {
      // Create records with family reporting
      mockRecords = createFamilyInvolvementRecords();

      const insights = analyzer.analyzeCulturalPatterns(mockRecords, mockMedications);
      const familyInsight = insights.find(i => i.type === 'family_support_benefit');

      expect(familyInsight).toBeDefined();
      expect(familyInsight?.adherenceImpact).toBeGreaterThan(0);
      expect(familyInsight?.recommendations).toContain('Use family WhatsApp groups for medication reminders');
    });

    it('should detect traditional medicine interactions', () => {
      // Create records with traditional medicine
      mockRecords = createTraditionalMedicineRecords();

      const insights = analyzer.analyzeCulturalPatterns(mockRecords, mockMedications);
      const traditionalInsight = insights.find(i => i.type === 'traditional_medicine_conflict');

      expect(traditionalInsight).toBeDefined();
      expect(traditionalInsight?.recommendations).toContain('Discuss traditional remedies with healthcare provider');
      expect(traditionalInsight?.culturalSensitivity).toBe('high');
    });

    it('should analyze meal timing preferences', () => {
      // Create records with meal timing data
      mockRecords = createMealTimingRecords();

      const insights = analyzer.analyzeCulturalPatterns(mockRecords, mockMedications);
      const mealInsight = insights.find(i => i.type === 'meal_timing_preference');

      expect(mealInsight).toBeDefined();
      expect(mealInsight?.description).toContain('Best adherence when medication taken');
      expect(mealInsight?.recommendations).toContain('Use Malaysian meal times');
    });

    it('should detect cultural celebration impact', () => {
      // Create records near celebrations
      mockRecords = createCelebrationRecords();

      const insights = analyzer.analyzeCulturalPatterns(mockRecords, mockMedications);
      const celebrationInsight = insights.find(i => i.type === 'cultural_celebration_impact');

      expect(celebrationInsight).toBeDefined();
      expect(celebrationInsight?.recommendations).toContain('Create celebration-specific medication schedules');
    });
  });

  describe('generateCulturalRecommendations', () => {
    it('should generate prayer time recommendations', () => {
      const patterns: AdherencePattern[] = [
        {
          id: 'p1',
          type: 'prayer_time_conflict',
          confidence: 0.8,
          description: 'Prayer time conflicts',
          occurrences: 20,
          lastOccurred: new Date(),
          affectedMedications: ['med1'],
          recommendations: []
        }
      ];

      const recommendations = analyzer.generateCulturalRecommendations(patterns, mockMedications);

      expect(recommendations).toContain('Consider using Islamic prayer apps with medication reminder features');
      expect(recommendations).toContain('Place medications near prayer mat for post-prayer dosing');
    });

    it('should generate fasting-specific recommendations', () => {
      const patterns: AdherencePattern[] = [
        {
          id: 'p2',
          type: 'fasting_adjustment',
          confidence: 0.9,
          description: 'Fasting period adjustments',
          occurrences: 30,
          lastOccurred: new Date(),
          affectedMedications: ['med1'],
          recommendations: []
        }
      ];

      const recommendations = analyzer.generateCulturalRecommendations(patterns, mockMedications);

      expect(recommendations).toContain('Consult with Islamic medical ethics advisor for fasting guidelines');
      expect(recommendations).toContain('Use Ramadan-specific medication timing apps');
    });

    it('should generate weekend pattern recommendations', () => {
      const patterns: AdherencePattern[] = [
        {
          id: 'p3',
          type: 'weekend_decline',
          confidence: 0.7,
          description: 'Weekend adherence decline',
          occurrences: 15,
          lastOccurred: new Date(),
          affectedMedications: ['med1'],
          recommendations: []
        }
      ];

      const recommendations = analyzer.generateCulturalRecommendations(patterns, mockMedications);

      expect(recommendations).toContain('Set family activity reminders (e.g., before pasar malam visits)');
      expect(recommendations).toContain('Link medication to weekend family meals');
    });

    it('should include traditional medicine considerations', () => {
      const patterns: AdherencePattern[] = [];
      const recommendations = analyzer.generateCulturalRecommendations(patterns, mockMedications);

      expect(recommendations).toContain('Maintain separation between traditional and modern medicine timings');
      expect(recommendations).toContain('Document all traditional remedies for healthcare provider review');
    });
  });

  describe('identifyOptimizationOpportunities', () => {
    it('should identify prayer time optimization opportunities', () => {
      mockRecords = createPrayerTimeRecords();
      const currentAdherence = 75;

      const opportunities = analyzer.identifyOptimizationOpportunities(mockRecords, currentAdherence);
      const prayerOptimization = opportunities.find(o =>
        o.opportunity.includes('prayer schedules')
      );

      expect(prayerOptimization).toBeDefined();
      expect(prayerOptimization?.potentialImprovement).toBeGreaterThan(0);
      expect(prayerOptimization?.implementation).toContain('Reschedule doses to 30 minutes after prayer times');
    });

    it('should identify family involvement opportunities', () => {
      mockRecords = createLowFamilyInvolvementRecords();
      const currentAdherence = 65;

      const opportunities = analyzer.identifyOptimizationOpportunities(mockRecords, currentAdherence);
      const familyOpportunity = opportunities.find(o =>
        o.opportunity.includes('family involvement')
      );

      expect(familyOpportunity).toBeDefined();
      expect(familyOpportunity?.potentialImprovement).toBe(10);
      expect(familyOpportunity?.implementation).toContain('Designate family medication champion');
    });

    it('should identify meal timing alignment opportunities', () => {
      mockRecords = createPoorMealTimingRecords();
      const currentAdherence = 70;

      const opportunities = analyzer.identifyOptimizationOpportunities(mockRecords, currentAdherence);
      const mealOpportunity = opportunities.find(o =>
        o.opportunity.includes('Malaysian meal times')
      );

      expect(mealOpportunity).toBeDefined();
      expect(mealOpportunity?.potentialImprovement).toBe(12);
      expect(mealOpportunity?.implementation).toContain('Link morning dose to breakfast (7-8 AM)');
    });
  });

  describe('analyzeMedicationCulturalFactors', () => {
    it('should identify fasting conflicts', () => {
      const medication = mockMedications[1]; // Traditional medicine with fasting avoidance
      mockRecords = createMedicationSpecificRecords(medication.id);

      const factors = analyzer.analyzeMedicationCulturalFactors(medication, mockRecords);

      expect(factors.culturalChallenges).toContain('Medication should be avoided during fasting');
      expect(factors.adaptations).toContain('Schedule all doses during non-fasting hours');
    });

    it('should identify food requirement opportunities', () => {
      const medication = mockMedications[0]; // Metformin with food requirement
      mockRecords = createMedicationSpecificRecords(medication.id);

      const factors = analyzer.analyzeMedicationCulturalFactors(medication, mockRecords);

      expect(factors.culturalOpportunities).toContain('Can align with Malaysian meal times');
      expect(factors.adaptations).toContain('Link to specific meals (nasi lemak breakfast, lunch, dinner)');
    });

    it('should identify prayer time conflicts', () => {
      const medication = mockMedications[0];
      mockRecords = createPrayerConflictRecords(medication.id);

      const factors = analyzer.analyzeMedicationCulturalFactors(medication, mockRecords);

      expect(factors.culturalChallenges).toContain('Frequent conflicts with prayer times');
      expect(factors.adaptations).toContain('Reschedule to post-prayer windows');
    });

    it('should identify traditional alternatives', () => {
      const medication = mockMedications[1];
      mockRecords = createMedicationSpecificRecords(medication.id);

      const factors = analyzer.analyzeMedicationCulturalFactors(medication, mockRecords);

      expect(factors.culturalOpportunities).toContain('Traditional alternatives available for cultural preference');
      expect(factors.adaptations).toContain('Discuss integration of traditional and modern approaches');
    });

    it('should analyze dosing frequency challenges', () => {
      const frequentMedication: Medication = {
        ...mockMedications[0],
        schedule: {
          ...mockMedications[0].schedule,
          frequency: 'four_times',
          times: ['06:00', '12:00', '18:00', '22:00']
        }
      };
      mockRecords = createMedicationSpecificRecords(frequentMedication.id);

      const factors = analyzer.analyzeMedicationCulturalFactors(frequentMedication, mockRecords);

      expect(factors.culturalChallenges).toContain('Frequent dosing may conflict with daily activities');
      expect(factors.adaptations).toContain('Consider extended-release formulations');
    });
  });
});

// Helper functions to create test data

function createPrayerTimeRecords(): AdherenceRecord[] {
  const records: AdherenceRecord[] = [];
  const prayerTimes = [
    { hour: 6, name: 'Subuh' },
    { hour: 13, name: 'Zohor' },
    { hour: 16, name: 'Asar' },
    { hour: 19, name: 'Maghrib' },
    { hour: 20, name: 'Isyak' }
  ];

  prayerTimes.forEach((prayer, index) => {
    for (let day = 0; day < 10; day++) {
      const date = new Date('2025-01-15');
      date.setDate(date.getDate() - day);
      date.setHours(prayer.hour, 0, 0, 0);

      records.push({
        id: `prayer_${index}_${day}`,
        medicationId: 'med1',
        patientId: 'user1',
        scheduledTime: date,
        takenTime: day % 3 === 0 ? undefined : new Date(date.getTime() + 30 * 60 * 1000),
        status: day % 3 === 0 ? 'missed' : 'adjusted',
        adherenceScore: day % 3 === 0 ? 0 : 85,
        method: 'manual',
        culturalContext: {
          prayerTime: prayer.name
        },
        createdAt: date,
        updatedAt: date
      });
    }
  });

  return records;
}

function createRamadanRecords(): AdherenceRecord[] {
  const records: AdherenceRecord[] = [];

  for (let i = 0; i < 30; i++) {
    const date = new Date('2025-03-01'); // Ramadan period
    date.setDate(date.getDate() + i);
    date.setHours(14, 0, 0, 0); // Afternoon during fasting

    // Some adherent, some not
    const isAdherent = i % 4 !== 0;

    records.push({
      id: `ramadan_${i}`,
      medicationId: 'med1',
      patientId: 'user1',
      scheduledTime: date,
      takenTime: isAdherent ? new Date(date.getTime() + 6 * 60 * 60 * 1000) : undefined, // Taken after Iftar
      status: isAdherent ? 'adjusted' : 'missed',
      adherenceScore: isAdherent ? 80 : 0,
      method: 'manual',
      culturalContext: {
        fastingPeriod: true
      },
      createdAt: date,
      updatedAt: date
    });
  }

  return records;
}

function createFestivalRecords(festivalDate: Date): AdherenceRecord[] {
  const records: AdherenceRecord[] = [];

  for (let i = -2; i <= 2; i++) {
    const date = new Date(festivalDate);
    date.setDate(date.getDate() + i);

    // Morning dose
    const morningTime = new Date(date);
    morningTime.setHours(8, 0, 0, 0);

    records.push({
      id: `festival_morning_${i}`,
      medicationId: 'med1',
      patientId: 'user1',
      scheduledTime: morningTime,
      takenTime: i === 0 ? undefined : morningTime, // Missed on festival day
      status: i === 0 ? 'missed' : 'taken_on_time',
      adherenceScore: i === 0 ? 0 : 100,
      method: 'manual',
      culturalContext: {
        festivalName: 'Hari Raya Aidilfitri'
      },
      createdAt: morningTime,
      updatedAt: morningTime
    });

    // Evening dose
    const eveningTime = new Date(date);
    eveningTime.setHours(20, 0, 0, 0);

    records.push({
      id: `festival_evening_${i}`,
      medicationId: 'med1',
      patientId: 'user1',
      scheduledTime: eveningTime,
      takenTime: Math.abs(i) <= 1 ? undefined : eveningTime, // Missed around festival
      status: Math.abs(i) <= 1 ? 'missed' : 'taken_on_time',
      adherenceScore: Math.abs(i) <= 1 ? 0 : 100,
      method: 'manual',
      culturalContext: {
        festivalName: 'Hari Raya Aidilfitri'
      },
      createdAt: eveningTime,
      updatedAt: eveningTime
    });
  }

  return records;
}

function createFamilyInvolvementRecords(): AdherenceRecord[] {
  const records: AdherenceRecord[] = [];

  for (let i = 0; i < 30; i++) {
    const date = new Date('2025-01-15');
    date.setDate(date.getDate() - i);
    date.setHours(8, 0, 0, 0);

    const isFamilyReported = i < 15; // First 15 days family reported
    const adherenceRate = isFamilyReported ? 0.95 : 0.7;
    const isAdherent = Math.random() < adherenceRate;

    records.push({
      id: `family_${i}`,
      medicationId: 'med1',
      patientId: 'user1',
      scheduledTime: date,
      takenTime: isAdherent ? date : undefined,
      status: isAdherent ? 'taken_on_time' : 'missed',
      adherenceScore: isAdherent ? 100 : 0,
      method: isFamilyReported ? 'family_reported' : 'manual',
      culturalContext: isFamilyReported ? {
        familyInvolvement: true
      } : undefined,
      createdAt: date,
      updatedAt: date
    });
  }

  return records;
}

function createTraditionalMedicineRecords(): AdherenceRecord[] {
  const records: AdherenceRecord[] = [];

  // Traditional medicine records
  for (let i = 0; i < 15; i++) {
    const date = new Date('2025-01-15');
    date.setDate(date.getDate() - i);
    date.setHours(9, 0, 0, 0);

    records.push({
      id: `traditional_${i}`,
      medicationId: 'med2',
      patientId: 'user1',
      scheduledTime: date,
      takenTime: date,
      status: 'taken_on_time',
      adherenceScore: 100,
      method: 'manual',
      culturalContext: {
        traditionalMedicineInteraction: true
      },
      createdAt: date,
      updatedAt: date
    });
  }

  // Modern medicine records
  for (let i = 0; i < 15; i++) {
    const date = new Date('2025-01-15');
    date.setDate(date.getDate() - i);
    date.setHours(8, 0, 0, 0);

    const isAdherent = Math.random() < 0.6; // Lower adherence for modern medicine

    records.push({
      id: `modern_${i}`,
      medicationId: 'med1',
      patientId: 'user1',
      scheduledTime: date,
      takenTime: isAdherent ? date : undefined,
      status: isAdherent ? 'taken_on_time' : 'missed',
      adherenceScore: isAdherent ? 100 : 0,
      method: 'manual',
      createdAt: date,
      updatedAt: date
    });
  }

  return records;
}

function createMealTimingRecords(): AdherenceRecord[] {
  const records: AdherenceRecord[] = [];
  const mealTimings = ['before_meal', 'after_meal', 'with_meal'];

  mealTimings.forEach((timing, timingIndex) => {
    for (let i = 0; i < 10; i++) {
      const date = new Date('2025-01-15');
      date.setDate(date.getDate() - (timingIndex * 10 + i));
      date.setHours(8, 0, 0, 0);

      // Best adherence with 'after_meal'
      const adherenceRate = timing === 'after_meal' ? 0.9 : 0.6;
      const isAdherent = Math.random() < adherenceRate;

      records.push({
        id: `meal_${timing}_${i}`,
        medicationId: 'med1',
        patientId: 'user1',
        scheduledTime: date,
        takenTime: isAdherent ? date : undefined,
        status: isAdherent ? 'taken_on_time' : 'missed',
        adherenceScore: isAdherent ? 100 : 0,
        method: 'manual',
        culturalContext: {
          mealTiming: timing as any
        },
        createdAt: date,
        updatedAt: date
      });
    }
  });

  return records;
}

function createCelebrationRecords(): AdherenceRecord[] {
  const records: AdherenceRecord[] = [];
  const celebrations = [
    { name: 'Chinese New Year', date: new Date('2025-01-29') },
    { name: 'Deepavali', date: new Date('2024-10-20') },
    { name: 'Christmas', date: new Date('2024-12-25') }
  ];

  celebrations.forEach(celebration => {
    for (let i = -7; i <= 7; i++) {
      const date = new Date(celebration.date);
      date.setDate(date.getDate() + i);
      date.setHours(8, 0, 0, 0);

      // Lower adherence near celebrations
      const nearCelebration = Math.abs(i) <= 2;
      const isAdherent = nearCelebration ? Math.random() < 0.5 : Math.random() < 0.8;

      records.push({
        id: `celebration_${celebration.name}_${i}`,
        medicationId: 'med1',
        patientId: 'user1',
        scheduledTime: date,
        takenTime: isAdherent ? date : undefined,
        status: isAdherent ? 'taken_on_time' : 'missed',
        adherenceScore: isAdherent ? 100 : 0,
        method: 'manual',
        culturalContext: nearCelebration ? {
          festivalName: celebration.name
        } : undefined,
        createdAt: date,
        updatedAt: date
      });
    }
  });

  return records;
}

function createLowFamilyInvolvementRecords(): AdherenceRecord[] {
  const records: AdherenceRecord[] = [];

  for (let i = 0; i < 30; i++) {
    const date = new Date('2025-01-15');
    date.setDate(date.getDate() - i);
    date.setHours(8, 0, 0, 0);

    // Only 5% family reported
    const isFamilyReported = Math.random() < 0.05;

    records.push({
      id: `low_family_${i}`,
      medicationId: 'med1',
      patientId: 'user1',
      scheduledTime: date,
      takenTime: date,
      status: 'taken_on_time',
      adherenceScore: 100,
      method: isFamilyReported ? 'family_reported' : 'manual',
      createdAt: date,
      updatedAt: date
    });
  }

  return records;
}

function createPoorMealTimingRecords(): AdherenceRecord[] {
  const records: AdherenceRecord[] = [];

  for (let i = 0; i < 30; i++) {
    const date = new Date('2025-01-15');
    date.setDate(date.getDate() - i);
    date.setHours(8, 0, 0, 0);

    // Only 20% have meal timing data
    const hasMealTiming = Math.random() < 0.2;

    records.push({
      id: `poor_meal_${i}`,
      medicationId: 'med1',
      patientId: 'user1',
      scheduledTime: date,
      takenTime: date,
      status: 'taken_on_time',
      adherenceScore: 100,
      method: 'manual',
      culturalContext: hasMealTiming ? {
        mealTiming: 'after_meal'
      } : undefined,
      createdAt: date,
      updatedAt: date
    });
  }

  return records;
}

function createMedicationSpecificRecords(medicationId: string): AdherenceRecord[] {
  const records: AdherenceRecord[] = [];

  for (let i = 0; i < 20; i++) {
    const date = new Date('2025-01-15');
    date.setDate(date.getDate() - i);
    date.setHours(8, 0, 0, 0);

    records.push({
      id: `med_specific_${i}`,
      medicationId,
      patientId: 'user1',
      scheduledTime: date,
      takenTime: date,
      status: 'taken_on_time',
      adherenceScore: 100,
      method: 'manual',
      createdAt: date,
      updatedAt: date
    });
  }

  return records;
}

function createPrayerConflictRecords(medicationId: string): AdherenceRecord[] {
  const records: AdherenceRecord[] = [];
  const prayerHours = [6, 13, 16, 19, 20];

  for (let i = 0; i < 30; i++) {
    const date = new Date('2025-01-15');
    date.setDate(date.getDate() - Math.floor(i / 5));
    date.setHours(prayerHours[i % 5], 0, 0, 0);

    records.push({
      id: `prayer_conflict_${i}`,
      medicationId,
      patientId: 'user1',
      scheduledTime: date,
      takenTime: new Date(date.getTime() + 30 * 60 * 1000),
      status: 'adjusted',
      adherenceScore: 85,
      method: 'manual',
      culturalContext: {
        prayerTime: 'Prayer Time'
      },
      createdAt: date,
      updatedAt: date
    });
  }

  return records;
}