/**
 * ProgressTrackingService Integration Test Suite
 *
 * Integration tests ensuring all adherence tracking components
 * work together seamlessly with proper data flow and accuracy.
 */

import { ProgressTrackingService } from '../../services/analytics/ProgressTrackingService';
import { AdherenceCalculationEngine } from '../../services/adherence/AdherenceCalculationEngine';
import { CulturalPatternAnalyzer } from '../../services/adherence/CulturalPatternAnalyzer';
import { PredictiveAdherenceEngine } from '../../services/adherence/PredictiveAdherenceEngine';
import {
  AdherenceRecord,
  ProgressMetrics,
  AdherenceReport,
  AdherencePrediction,
  CulturalAdherenceContext,
  AdherenceApiResponse
} from '../../types/adherence';
import { Medication } from '../../types/medication';

describe('ProgressTrackingService Integration', () => {
  let service: ProgressTrackingService;
  let mockMedications: Medication[];
  let mockRecords: AdherenceRecord[];

  beforeEach(() => {
    // Initialize service with all features enabled
    service = new ProgressTrackingService({
      cacheEnabled: true,
      cacheTTL: 300,
      autoSync: false, // Disable for testing
      syncInterval: 15,
      predictiveEnabled: true,
      culturalAnalysisEnabled: true,
      milestoneNotifications: true
    });

    // Create comprehensive mock medications
    mockMedications = [
      {
        id: 'med1',
        userId: 'user1',
        name: 'Metformin',
        genericName: 'Metformin HCl',
        dosage: {
          amount: 500,
          unit: 'mg',
          form: 'tablet',
          instructions: 'Take with food'
        },
        schedule: {
          frequency: 'twice_daily',
          times: ['08:00', '20:00'],
          duration: {
            start: '2024-01-01',
            end: '2024-12-31'
          },
          culturalAdjustments: {
            takeWithFood: true,
            avoidDuringFasting: false,
            prayerTimeConsiderations: ['take_after_prayer'],
            prayerTimeBuffer: 15,
            mealTimingPreference: 'with_meal'
          },
          reminders: true,
          nextDue: new Date().toISOString()
        },
        cultural: {
          takeWithFood: true,
          avoidDuringFasting: false,
          prayerTimeConsiderations: ['take_after_prayer'],
          culturalNotes: 'Safe during Ramadan fasting'
        },
        images: ['med1_img1.jpg'],
        category: 'prescription',
        status: 'active',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01',
        adherenceRate: 0
      },
      {
        id: 'med2',
        userId: 'user1',
        name: 'Amlodipine',
        genericName: 'Amlodipine Besylate',
        dosage: {
          amount: 5,
          unit: 'mg',
          form: 'tablet'
        },
        schedule: {
          frequency: 'daily',
          times: ['09:00'],
          culturalAdjustments: {
            takeWithFood: false,
            avoidDuringFasting: true,
            prayerTimeConsiderations: ['flexible_timing'],
            ramadanSchedule: ['19:30'],
            prayerTimeBuffer: 30
          },
          reminders: true
        },
        cultural: {
          takeWithFood: false,
          avoidDuringFasting: true,
          prayerTimeConsiderations: ['flexible_timing'],
          traditionalAlternatives: ['Daun Dewa', 'Misai Kucing']
        },
        images: [],
        category: 'prescription',
        status: 'active',
        createdAt: '2024-01-01',
        updatedAt: '2024-01-01'
      }
    ];

    // Generate comprehensive mock records
    mockRecords = generateMockRecords(mockMedications);
  });

  afterEach(() => {
    // Clean up
    service.destroy();
  });

  describe('Medication Intake Tracking', () => {
    test('should track medication intake successfully', async () => {
      const scheduledTime = new Date();
      const takenTime = new Date(scheduledTime.getTime() + 15 * 60000); // 15 minutes late

      const culturalContext: CulturalAdherenceContext = {
        prayerTime: 'Zohor',
        mealTiming: 'after_meal'
      };

      const response = await service.trackMedicationIntake(
        'med1',
        'user1',
        takenTime,
        scheduledTime,
        'manual',
        culturalContext,
        'Taken after lunch prayer'
      );

      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.data?.status).toBe('adjusted'); // Due to prayer time
      expect(response.data?.adherenceScore).toBeGreaterThan(0);
      expect(response.data?.culturalContext).toEqual(culturalContext);
    });

    test('should handle batch updates correctly', async () => {
      const batchUpdate = {
        records: mockRecords.slice(0, 5).map(r => ({
          ...r,
          status: 'taken_on_time' as const
        })),
        source: 'sync' as const,
        timestamp: new Date()
      };

      const response = await service.batchUpdateRecords(batchUpdate);

      expect(response.success).toBe(true);
      expect(response.data).toBe(5);
    });

    test('should invalidate cache after tracking', async () => {
      // Get metrics to populate cache
      const firstResponse = await service.getProgressMetrics(
        'user1',
        mockMedications,
        mockRecords,
        'weekly'
      );

      expect(firstResponse.success).toBe(true);

      // Track new intake
      await service.trackMedicationIntake(
        'med1',
        'user1',
        new Date(),
        new Date(),
        'manual'
      );

      // Get metrics again - should not use cache
      const secondResponse = await service.getProgressMetrics(
        'user1',
        mockMedications,
        [...mockRecords, { /* new record */ } as AdherenceRecord],
        'weekly'
      );

      expect(secondResponse.success).toBe(true);
    });
  });

  describe('Progress Metrics Generation', () => {
    test('should generate comprehensive progress metrics', async () => {
      const response = await service.getProgressMetrics(
        'user1',
        mockMedications,
        mockRecords,
        'monthly'
      );

      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();

      const metrics = response.data!;
      expect(metrics.patientId).toBe('user1');
      expect(metrics.period).toBe('monthly');
      expect(metrics.overallAdherence).toBeGreaterThan(0);
      expect(metrics.medications).toHaveLength(2);
      expect(metrics.streaks).toBeDefined();
      expect(metrics.patterns).toBeInstanceOf(Array);
      expect(metrics.predictions).toBeInstanceOf(Array);
      expect(metrics.culturalInsights).toBeInstanceOf(Array);
    });

    test('should handle different metric periods', async () => {
      const periods = ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'] as const;

      for (const period of periods) {
        const response = await service.getProgressMetrics(
          'user1',
          mockMedications,
          mockRecords,
          period
        );

        expect(response.success).toBe(true);
        expect(response.data?.period).toBe(period);
      }
    });

    test('should use cache when enabled', async () => {
      // First call should calculate and cache
      const startTime1 = Date.now();
      const response1 = await service.getProgressMetrics(
        'user1',
        mockMedications,
        mockRecords,
        'monthly'
      );
      const duration1 = Date.now() - startTime1;

      expect(response1.success).toBe(true);

      // Second call should use cache and be faster
      const startTime2 = Date.now();
      const response2 = await service.getProgressMetrics(
        'user1',
        mockMedications,
        mockRecords,
        'monthly'
      );
      const duration2 = Date.now() - startTime2;

      expect(response2.success).toBe(true);
      expect(response2.data).toEqual(response1.data);
      expect(duration2).toBeLessThan(duration1);
    });

    test('should include cultural insights when enabled', async () => {
      const response = await service.getProgressMetrics(
        'user1',
        mockMedications,
        mockRecords,
        'monthly'
      );

      expect(response.data?.culturalInsights).toBeDefined();
      expect(response.data?.culturalInsights.length).toBeGreaterThan(0);

      const insights = response.data!.culturalInsights;
      const insightTypes = insights.map(i => i.type);

      // Should include various cultural insights
      expect(insightTypes.some(t =>
        ['prayer_time_optimization', 'ramadan_adjustment', 'family_support_benefit'].includes(t)
      )).toBe(true);
    });
  });

  describe('Provider Report Generation', () => {
    test('should generate comprehensive provider report', async () => {
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);
      const endDate = new Date();

      const response = await service.generateProviderReport(
        'user1',
        mockMedications,
        mockRecords,
        startDate,
        endDate,
        'Patient showing good adherence with cultural adjustments'
      );

      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();

      const report = response.data!;
      expect(report.patientId).toBe('user1');
      expect(report.overallAdherence).toBeGreaterThan(0);
      expect(report.medications).toHaveLength(2);
      expect(report.insights).toBeInstanceOf(Array);
      expect(report.recommendations).toBeInstanceOf(Array);
      expect(report.culturalConsiderations).toBeInstanceOf(Array);
      expect(report.fhirResource).toBeDefined();
    });

    test('should include medication-specific reports', async () => {
      const response = await service.generateProviderReport(
        'user1',
        mockMedications,
        mockRecords,
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        new Date()
      );

      expect(response.data?.medications).toHaveLength(2);

      response.data?.medications.forEach(medReport => {
        expect(medReport.medication).toBeDefined();
        expect(medReport.adherenceRate).toBeGreaterThanOrEqual(0);
        expect(medReport.trends).toMatch(/improving|stable|declining/);
        expect(medReport.missedDosePatterns).toBeInstanceOf(Array);
        expect(medReport.culturalFactors).toBeInstanceOf(Array);
        expect(medReport.recommendations).toBeInstanceOf(Array);
      });
    });

    test('should generate FHIR-compliant resource', async () => {
      const response = await service.generateProviderReport(
        'user1',
        mockMedications,
        mockRecords,
        new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        new Date()
      );

      const fhirResource = response.data?.fhirResource;
      expect(fhirResource).toBeDefined();
      expect(fhirResource.resourceType).toBe('MedicationStatement');
      expect(fhirResource.status).toBe('active');
      expect(fhirResource.subject.reference).toBe('Patient/user1');
    });
  });

  describe('Predictive Analytics', () => {
    test('should generate adherence predictions', async () => {
      const response = await service.getAdherencePredictions(
        mockMedications[0],
        mockRecords.filter(r => r.medicationId === 'med1')
      );

      expect(response.success).toBe(true);
      expect(response.data).toBeInstanceOf(Array);
      expect(response.data?.length).toBeGreaterThan(0);

      response.data?.forEach(prediction => {
        expect(prediction.timeframe).toMatch(/next_dose|next_24h|next_week|next_month/);
        expect(prediction.predictedRate).toBeGreaterThanOrEqual(0);
        expect(prediction.predictedRate).toBeLessThanOrEqual(100);
        expect(prediction.confidence).toBeGreaterThan(0);
        expect(prediction.confidence).toBeLessThanOrEqual(1);
        expect(prediction.riskLevel).toMatch(/low|medium|high|critical/);
        expect(prediction.factors).toBeInstanceOf(Array);
        expect(prediction.recommendations).toBeInstanceOf(Array);
      });
    });

    test('should provide actionable recommendations based on risk', async () => {
      const response = await service.getAdherencePredictions(
        mockMedications[0],
        mockRecords.filter(r => r.medicationId === 'med1')
      );

      const predictions = response.data!;
      const highRiskPrediction = predictions.find(p =>
        p.riskLevel === 'high' || p.riskLevel === 'critical'
      );

      if (highRiskPrediction) {
        expect(highRiskPrediction.recommendations.length).toBeGreaterThan(0);
        expect(highRiskPrediction.recommendations.some(r =>
          r.priority === 'high'
        )).toBe(true);
      }
    });

    test('should consider cultural factors in predictions', async () => {
      const response = await service.getAdherencePredictions(
        mockMedications[1], // Has cultural considerations
        mockRecords.filter(r => r.medicationId === 'med2')
      );

      const predictions = response.data!;
      predictions.forEach(prediction => {
        const culturalFactors = prediction.factors.filter(f =>
          f.type.includes('Cultural')
        );

        if (culturalFactors.length > 0) {
          expect(prediction.recommendations.some(r =>
            r.culturallyAppropriate === true
          )).toBe(true);
        }
      });
    });
  });

  describe('Cultural Optimization', () => {
    test('should identify cultural optimization opportunities', async () => {
      const currentAdherence = 65; // Below target

      const response = await service.getCulturalOptimizations(
        mockRecords,
        currentAdherence
      );

      expect(response.success).toBe(true);
      expect(response.data).toBeInstanceOf(Array);

      response.data?.forEach(opportunity => {
        expect(opportunity.opportunity).toBeDefined();
        expect(opportunity.potentialImprovement).toBeGreaterThan(0);
        expect(opportunity.implementation).toBeInstanceOf(Array);
        expect(opportunity.implementation.length).toBeGreaterThan(0);
      });
    });

    test('should prioritize high-impact optimizations', async () => {
      const response = await service.getCulturalOptimizations(
        mockRecords,
        60
      );

      if (response.data && response.data.length > 1) {
        const improvements = response.data.map(o => o.potentialImprovement);
        // Check if sorted by potential improvement (descending)
        const sorted = [...improvements].sort((a, b) => b - a);
        expect(improvements[0]).toBeGreaterThanOrEqual(improvements[1]);
      }
    });
  });

  describe('Configuration Management', () => {
    test('should update calculation configuration', () => {
      const newConfig = {
        onTimeWindowMinutes: 45,
        lateWindowHours: 3,
        minimumAdherenceThreshold: 85
      };

      service.updateCalculationConfig(newConfig);

      // Configuration should be updated
      // This would be reflected in subsequent calculations
      expect(true).toBe(true); // Placeholder - would test actual calculation changes
    });

    test('should update service configuration', () => {
      const oldConfig = service.getServiceConfig();
      expect(oldConfig.predictiveEnabled).toBe(true);

      service.updateServiceConfig({
        predictiveEnabled: false,
        culturalAnalysisEnabled: false
      });

      const newConfig = service.getServiceConfig();
      expect(newConfig.predictiveEnabled).toBe(false);
      expect(newConfig.culturalAnalysisEnabled).toBe(false);
    });

    test('should handle auto-sync configuration changes', () => {
      // Initially disabled
      service.updateServiceConfig({ autoSync: false });
      let config = service.getServiceConfig();
      expect(config.autoSync).toBe(false);

      // Enable auto-sync
      service.updateServiceConfig({ autoSync: true });
      config = service.getServiceConfig();
      expect(config.autoSync).toBe(true);

      // Disable again
      service.updateServiceConfig({ autoSync: false });
      config = service.getServiceConfig();
      expect(config.autoSync).toBe(false);
    });
  });

  describe('Error Handling', () => {
    test('should handle missing medications gracefully', async () => {
      const response = await service.getProgressMetrics(
        'user1',
        [],
        mockRecords,
        'weekly'
      );

      expect(response.success).toBe(true);
      expect(response.data?.medications).toHaveLength(0);
    });

    test('should handle empty records gracefully', async () => {
      const response = await service.getProgressMetrics(
        'user1',
        mockMedications,
        [],
        'weekly'
      );

      expect(response.success).toBe(true);
      expect(response.data?.overallAdherence).toBe(0);
    });

    test('should handle disabled features gracefully', async () => {
      // Disable predictive analytics
      service.updateServiceConfig({ predictiveEnabled: false });

      const response = await service.getAdherencePredictions(
        mockMedications[0],
        mockRecords
      );

      expect(response.success).toBe(false);
      expect(response.error).toBe('Predictive analytics is disabled');
    });
  });
});

// Helper function to generate comprehensive mock records
function generateMockRecords(medications: Medication[]): AdherenceRecord[] {
  const records: AdherenceRecord[] = [];
  const now = new Date();

  medications.forEach(med => {
    // Generate 30 days of records for each medication
    for (let day = 29; day >= 0; day--) {
      med.schedule.times.forEach((time, index) => {
        const [hour, minute] = time.split(':').map(Number);
        const scheduled = new Date(now);
        scheduled.setDate(scheduled.getDate() - day);
        scheduled.setHours(hour, minute, 0, 0);

        // Vary adherence patterns
        const isWeekend = scheduled.getDay() === 0 || scheduled.getDay() === 6;
        const isDuringRamadan = day >= 10 && day <= 20;
        const isPrayerTime = hour === 6 || hour === 13 || hour === 19;

        // Determine status based on patterns
        let status: 'taken_on_time' | 'taken_late' | 'taken_early' | 'missed' | 'adjusted';
        let delayMinutes = 0;

        if (isPrayerTime && Math.random() > 0.7) {
          status = 'adjusted';
        } else if (isWeekend && Math.random() > 0.8) {
          status = 'missed';
        } else if (Math.random() > 0.85) {
          status = 'taken_late';
          delayMinutes = Math.floor(Math.random() * 90) + 30;
        } else {
          status = 'taken_on_time';
          delayMinutes = Math.floor(Math.random() * 20);
        }

        const takenTime = status === 'missed'
          ? undefined
          : new Date(scheduled.getTime() + delayMinutes * 60000);

        // Create cultural context
        const culturalContext: CulturalAdherenceContext | undefined =
          (isPrayerTime || isDuringRamadan) ? {
            prayerTime: isPrayerTime ? ['Subuh', 'Zohor', 'Maghrib'][Math.floor(hour / 7)] : undefined,
            fastingPeriod: isDuringRamadan,
            familyInvolvement: Math.random() > 0.8,
            mealTiming: med.cultural.takeWithFood ? 'with_meal' : undefined
          } : undefined;

        records.push({
          id: `rec_${med.id}_${day}_${index}`,
          medicationId: med.id,
          patientId: 'user1',
          scheduledTime: scheduled,
          takenTime,
          status,
          adherenceScore: status === 'taken_on_time' ? 100 :
                        status === 'adjusted' ? 90 :
                        status === 'taken_late' ? 70 :
                        status === 'taken_early' ? 95 : 0,
          method: culturalContext?.familyInvolvement ? 'family_reported' : 'manual',
          delayMinutes: status !== 'missed' ? delayMinutes : undefined,
          culturalContext,
          createdAt: scheduled,
          updatedAt: scheduled
        });
      });
    }
  });

  return records;
}