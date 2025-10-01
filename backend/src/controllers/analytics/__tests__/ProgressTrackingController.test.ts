/**
 * ProgressTrackingController Test Suite
 *
 * Comprehensive tests for adherence analytics API endpoints.
 * Tests authentication, validation, cultural intelligence, and response formatting.
 */

import { Request, Response } from 'express';
import { ProgressTrackingController } from '../ProgressTrackingController';
import { AdherenceAnalyticsService } from '../../services/analytics/AdherenceAnalyticsService';
import {
  ProgressMetrics,
  AdherenceAnalytics,
  AdherencePrediction,
  FamilyAdherenceMetrics,
  AdherenceStatistics,
  TimePeriod
} from '../../types/adherence/adherence.types';

// Mock the analytics service
jest.mock('../../services/analytics/AdherenceAnalyticsService');

describe('ProgressTrackingController', () => {
  let controller: ProgressTrackingController;
  let mockAnalyticsService: jest.Mocked<AdherenceAnalyticsService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  const mockPatientId = 'patient-123';
  const mockMedicationId = 'medication-456';
  const mockFamilyId = 'family-789';

  // Sample response data
  const sampleProgressMetrics: ProgressMetrics = {
    patientId: mockPatientId,
    period: 'monthly',
    adherenceRate: 85.5,
    streakCount: 12,
    longestStreak: 25,
    totalDoses: 60,
    takenDoses: 51,
    missedDoses: 6,
    lateDoses: 3,
    skippedDoses: 0,
    culturalAdjustments: {
      ramadanAdjustments: 8,
      prayerTimeDelays: 5,
      festivalExemptions: 2,
      familyCoordinationImpact: 15,
      traditionalMedicineInteractions: 1
    },
    calculatedAt: new Date('2025-01-15T10:00:00Z')
  };

  const sampleAdherenceAnalytics: AdherenceAnalytics = {
    patientId: mockPatientId,
    analysisType: 'individual',
    timeframe: {
      start: new Date('2025-01-01T00:00:00Z'),
      end: new Date('2025-01-31T23:59:59Z')
    },
    insights: [
      {
        category: 'timing_patterns',
        insight: 'Most consistent medication times: 08:00, 20:00',
        insightMs: 'Masa ubat yang paling konsisten: 08:00, 20:00',
        impact: 'positive',
        actionable: true,
        culturalRelevance: 0.7
      },
      {
        category: 'cultural_impact',
        insight: 'Cultural accommodation success rate: 90%',
        insightMs: 'Kadar kejayaan penyesuaian budaya: 90%',
        impact: 'positive',
        actionable: true,
        culturalRelevance: 0.9
      }
    ],
    patterns: [
      {
        pattern: 'Weekly adherence variation',
        frequency: 7,
        strength: 0.3,
        timeContext: ['weekly'],
        culturalContext: ['work_schedule', 'religious_observance'],
        recommendations: ['Adjust weekend reminders', 'Consider cultural day preferences']
      }
    ],
    culturalObservations: [
      {
        observation: 'Prayer time conflicts detected in medication schedule',
        observationMs: 'Konflik waktu solat dikesan dalam jadual ubat',
        culturalSignificance: 0.8,
        impact: {
          adherenceChange: -0.1,
          timingFlexibility: 0.3,
          familyInvolvement: 0.2,
          culturalHarmony: -0.2
        },
        suggestion: 'Consider adjusting medication times to accommodate prayer schedule',
        suggestionMs: 'Pertimbangkan untuk menyesuaikan waktu ubat mengikut jadual solat'
      }
    ],
    generatedAt: new Date('2025-01-15T10:00:00Z')
  };

  const sampleAdherencePrediction: AdherencePrediction = {
    patientId: mockPatientId,
    medicationId: mockMedicationId,
    nextDoseTime: new Date('2025-01-16T08:00:00Z'),
    adherenceProbability: 87.5,
    riskFactors: [
      {
        factor: 'Weekend disruption',
        impact: -0.05,
        confidence: 0.8,
        mitigation: 'Set weekend-specific reminders'
      }
    ],
    culturalFactors: [
      {
        factor: 'ramadan_fasting',
        impact: -0.1,
        timeWindow: {
          start: new Date('2025-01-10T00:00:00Z'),
          end: new Date('2025-02-08T23:59:59Z')
        },
        adjustment: 'Adjust medication timing for sahur and iftar'
      }
    ],
    recommendations: [
      {
        type: 'timing_adjustment',
        message: 'Consider adjusting morning dose to align with sahur',
        messageMs: 'Pertimbangkan untuk menyesuaikan dos pagi dengan waktu sahur',
        priority: 'medium',
        actionRequired: true,
        culturalSensitive: true
      }
    ],
    confidence: 0.85,
    modelVersion: '1.0.0',
    predictedAt: new Date('2025-01-15T10:00:00Z')
  };

  const sampleFamilyMetrics: FamilyAdherenceMetrics = {
    familyId: mockFamilyId,
    headOfFamily: 'user-head-123',
    memberMetrics: [
      {
        memberId: 'user-head-123',
        role: 'head',
        adherenceRate: 88.5,
        supportProvided: 8.5,
        supportReceived: 3.2
      },
      {
        memberId: 'user-spouse-456',
        role: 'spouse',
        adherenceRate: 92.1,
        supportProvided: 7.8,
        supportReceived: 6.1
      }
    ],
    familyAdherenceRate: 90.3,
    coordinationScore: 8.2,
    culturalHarmony: 8.7,
    lastUpdated: new Date('2025-01-15T10:00:00Z')
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock analytics service
    mockAnalyticsService = {
      calculateProgressMetrics: jest.fn(),
      generateAdherenceAnalytics: jest.fn(),
      generateAdherencePrediction: jest.fn(),
      calculateFamilyAdherenceMetrics: jest.fn(),
      generateAdherenceStatistics: jest.fn(),
      getInstance: jest.fn()
    } as any;

    (AdherenceAnalyticsService.getInstance as jest.Mock).mockReturnValue(mockAnalyticsService);

    // Create controller instance
    controller = new ProgressTrackingController();

    // Mock Express request and response
    mockRequest = {
      params: {},
      query: {},
      body: {},
      headers: {},
      user: { id: 'user-123', role: 'patient' } // Mock authenticated user
    };

    mockResponse = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
      send: jest.fn()
    };
  });

  describe('getProgressMetrics', () => {
    beforeEach(() => {
      mockRequest.params = { patientId: mockPatientId };
      mockRequest.query = { period: 'monthly' };
      mockAnalyticsService.calculateProgressMetrics.mockResolvedValue(sampleProgressMetrics);
    });

    it('should return progress metrics for authenticated patient', async () => {
      await controller.getProgressMetrics(mockRequest as Request, mockResponse as Response);

      expect(mockAnalyticsService.calculateProgressMetrics).toHaveBeenCalledWith(
        mockPatientId,
        'monthly',
        undefined
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          progress: sampleProgressMetrics,
          culturalInsights: {
            ramadanImpact: true,
            prayerTimeAccommodation: 5,
            familySupport: true,
            traditionalMedicineUse: true
          },
          recommendations: expect.any(Array)
        },
        meta: {
          timestamp: expect.any(String),
          period: 'monthly',
          culturallyAdjusted: true
        }
      });
    });

    it('should handle medication-specific metrics', async () => {
      mockRequest.query = { period: 'weekly', medicationId: mockMedicationId };

      await controller.getProgressMetrics(mockRequest as Request, mockResponse as Response);

      expect(mockAnalyticsService.calculateProgressMetrics).toHaveBeenCalledWith(
        mockPatientId,
        'weekly',
        mockMedicationId
      );
    });

    it('should validate period parameter', async () => {
      mockRequest.query = { period: 'invalid-period' };

      await controller.getProgressMetrics(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid period. Must be one of: daily, weekly, monthly, quarterly, yearly'
      });
    });

    it('should handle authentication failure', async () => {
      // Mock failed authentication
      jest.spyOn(controller as any, 'validatePatientAccess').mockReturnValue(false);

      await controller.getProgressMetrics(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Unauthorized access to patient data'
      });
    });

    it('should handle service errors gracefully', async () => {
      mockAnalyticsService.calculateProgressMetrics.mockRejectedValue(
        new Error('Database connection failed')
      );

      await controller.getProgressMetrics(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to retrieve progress metrics',
        error: expect.any(String)
      });
    });

    it('should default to monthly period when not specified', async () => {
      mockRequest.query = {};

      await controller.getProgressMetrics(mockRequest as Request, mockResponse as Response);

      expect(mockAnalyticsService.calculateProgressMetrics).toHaveBeenCalledWith(
        mockPatientId,
        'monthly',
        undefined
      );
    });
  });

  describe('getAdherenceAnalytics', () => {
    beforeEach(() => {
      mockRequest.params = { patientId: mockPatientId };
      mockRequest.query = {
        startDate: '2025-01-01',
        endDate: '2025-01-31',
        analysisType: 'individual'
      };
      mockAnalyticsService.generateAdherenceAnalytics.mockResolvedValue(sampleAdherenceAnalytics);
    });

    it('should return comprehensive adherence analytics', async () => {
      await controller.getAdherenceAnalytics(mockRequest as Request, mockResponse as Response);

      expect(mockAnalyticsService.generateAdherenceAnalytics).toHaveBeenCalledWith(
        mockPatientId,
        {
          start: new Date('2025-01-01'),
          end: new Date('2025-01-31')
        },
        'individual'
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          analytics: sampleAdherenceAnalytics,
          summary: {
            totalInsights: 2,
            culturalObservations: 1,
            patterns: 1,
            culturallyRelevantInsights: 2
          }
        },
        meta: {
          timestamp: expect.any(String),
          timeframe: {
            start: new Date('2025-01-01'),
            end: new Date('2025-01-31')
          },
          analysisType: 'individual',
          culturalContext: 'malaysian'
        }
      });
    });

    it('should handle missing date parameters with defaults', async () => {
      mockRequest.query = { analysisType: 'cultural' };

      await controller.getAdherenceAnalytics(mockRequest as Request, mockResponse as Response);

      expect(mockAnalyticsService.generateAdherenceAnalytics).toHaveBeenCalledWith(
        mockPatientId,
        expect.objectContaining({
          start: expect.any(Date),
          end: expect.any(Date)
        }),
        'cultural'
      );
    });

    it('should validate date format', async () => {
      mockRequest.query = {
        startDate: 'invalid-date',
        endDate: '2025-01-31'
      };

      await controller.getAdherenceAnalytics(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid date format. Use ISO 8601 format (YYYY-MM-DD)'
      });
    });

    it('should handle cultural analysis type', async () => {
      mockRequest.query = { analysisType: 'cultural' };

      await controller.getAdherenceAnalytics(mockRequest as Request, mockResponse as Response);

      expect(mockAnalyticsService.generateAdherenceAnalytics).toHaveBeenCalledWith(
        mockPatientId,
        expect.any(Object),
        'cultural'
      );
    });
  });

  describe('getAdherencePrediction', () => {
    beforeEach(() => {
      mockRequest.params = { patientId: mockPatientId, medicationId: mockMedicationId };
      mockRequest.query = { forecastDays: '7' };
      mockAnalyticsService.generateAdherencePrediction.mockResolvedValue(sampleAdherencePrediction);
    });

    it('should return adherence prediction with cultural factors', async () => {
      await controller.getAdherencePrediction(mockRequest as Request, mockResponse as Response);

      expect(mockAnalyticsService.generateAdherencePrediction).toHaveBeenCalledWith(
        mockPatientId,
        mockMedicationId,
        7
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          prediction: sampleAdherencePrediction,
          interpretation: {
            riskLevel: 'low',
            culturalFactorsCount: 1,
            primaryRiskFactors: expect.any(Array),
            actionableRecommendations: expect.any(Array)
          }
        },
        meta: {
          timestamp: expect.any(String),
          forecastDays: 7,
          confidence: 0.85,
          modelVersion: '1.0.0'
        }
      });
    });

    it('should validate forecast days parameter', async () => {
      mockRequest.query = { forecastDays: '35' }; // Invalid: > 30

      await controller.getAdherencePrediction(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Invalid forecast days. Must be between 1 and 30'
      });
    });

    it('should default to 7 days when forecastDays not provided', async () => {
      mockRequest.query = {};

      await controller.getAdherencePrediction(mockRequest as Request, mockResponse as Response);

      expect(mockAnalyticsService.generateAdherencePrediction).toHaveBeenCalledWith(
        mockPatientId,
        mockMedicationId,
        7
      );
    });

    it('should interpret risk levels correctly', async () => {
      // Test different adherence probabilities
      const highRiskPrediction = {
        ...sampleAdherencePrediction,
        adherenceProbability: 55.0
      };

      mockAnalyticsService.generateAdherencePrediction.mockResolvedValue(highRiskPrediction);

      await controller.getAdherencePrediction(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            interpretation: expect.objectContaining({
              riskLevel: 'critical'
            })
          })
        })
      );
    });
  });

  describe('getFamilyAdherenceMetrics', () => {
    beforeEach(() => {
      mockRequest.params = { familyId: mockFamilyId };
      mockAnalyticsService.calculateFamilyAdherenceMetrics.mockResolvedValue(sampleFamilyMetrics);
    });

    it('should return family adherence metrics with insights', async () => {
      await controller.getFamilyAdherenceMetrics(mockRequest as Request, mockResponse as Response);

      expect(mockAnalyticsService.calculateFamilyAdherenceMetrics).toHaveBeenCalledWith(mockFamilyId);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          familyMetrics: sampleFamilyMetrics,
          insights: {
            topPerformer: expect.objectContaining({
              memberId: 'user-spouse-456',
              adherenceRate: 92.1
            }),
            coordinationLevel: 'excellent',
            culturalHarmonyLevel: 'high',
            improvementOpportunities: expect.any(Array)
          }
        },
        meta: {
          timestamp: expect.any(String),
          memberCount: 2,
          culturallyOptimized: true
        }
      });
    });

    it('should handle family access validation', async () => {
      jest.spyOn(controller as any, 'validateFamilyAccess').mockReturnValue(false);

      await controller.getFamilyAdherenceMetrics(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Unauthorized access to family data'
      });
    });

    it('should assess coordination levels correctly', async () => {
      const lowCoordinationMetrics = {
        ...sampleFamilyMetrics,
        coordinationScore: 3.5
      };

      mockAnalyticsService.calculateFamilyAdherenceMetrics.mockResolvedValue(lowCoordinationMetrics);

      await controller.getFamilyAdherenceMetrics(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            insights: expect.objectContaining({
              coordinationLevel: 'needs_improvement'
            })
          })
        })
      );
    });
  });

  describe('getAdherenceStatistics', () => {
    const sampleStatistics: AdherenceStatistics = {
      population: {
        totalPatients: 1000,
        averageAdherence: 82.5,
        adherenceDistribution: {
          excellent: 250,
          good: 400,
          moderate: 250,
          poor: 100
        },
        culturalGroupBreakdown: [
          {
            ethnicity: 'Malay',
            religion: 'Islam',
            averageAdherence: 85.2,
            uniquePatterns: ['Ramadan adjustments', 'Prayer time flexibility'],
            commonChallenges: ['Festival scheduling'],
            successFactors: ['Family support', 'Religious accommodation']
          }
        ],
        riskStratification: {
          lowRisk: 650,
          moderateRisk: 250,
          highRisk: 80,
          criticalRisk: 20
        }
      },
      individual: {} as any,
      cultural: {} as any,
      temporal: {} as any,
      comparative: {} as any
    };

    beforeEach(() => {
      mockAnalyticsService.generateAdherenceStatistics.mockResolvedValue(sampleStatistics);
    });

    it('should return population statistics for admin users', async () => {
      mockRequest.query = { culturalGroup: 'malay-muslim' };

      await controller.getAdherenceStatistics(mockRequest as Request, mockResponse as Response);

      expect(mockAnalyticsService.generateAdherenceStatistics).toHaveBeenCalledWith({
        culturalGroup: 'malay-muslim'
      });

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          statistics: sampleStatistics,
          insights: {
            populationSize: 1000,
            culturalDiversityIndex: 0.75,
            overallTrends: expect.any(Object),
            culturalHighlights: expect.any(Array)
          }
        },
        meta: {
          timestamp: expect.any(String),
          filters: { culturalGroup: 'malay-muslim' },
          culturallySegmented: true
        }
      });
    });

    it('should validate admin access for statistics', async () => {
      jest.spyOn(controller as any, 'validateAdminAccess').mockReturnValue(false);

      await controller.getAdherenceStatistics(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Administrative access required for population statistics'
      });
    });

    it('should handle patient ID filtering', async () => {
      mockRequest.query = { patientIds: 'patient1,patient2,patient3' };

      await controller.getAdherenceStatistics(mockRequest as Request, mockResponse as Response);

      expect(mockAnalyticsService.generateAdherenceStatistics).toHaveBeenCalledWith({
        patientIds: ['patient1', 'patient2', 'patient3']
      });
    });

    it('should handle date range filtering', async () => {
      mockRequest.query = {
        startDate: '2025-01-01',
        endDate: '2025-01-31'
      };

      await controller.getAdherenceStatistics(mockRequest as Request, mockResponse as Response);

      expect(mockAnalyticsService.generateAdherenceStatistics).toHaveBeenCalledWith({
        timeframe: {
          start: new Date('2025-01-01'),
          end: new Date('2025-01-31')
        }
      });
    });
  });

  describe('recordAdherence', () => {
    const sampleAdherenceData = {
      medicationId: mockMedicationId,
      scheduledTime: '2025-01-15T08:00:00Z',
      takenTime: '2025-01-15T08:05:00Z',
      status: 'taken',
      notes: 'Taken with breakfast',
      culturalContext: {
        prayerTimeConflict: false,
        fastingPeriod: true,
        familySupport: true,
        traditionalMedicineUsed: false
      }
    };

    beforeEach(() => {
      mockRequest.params = { patientId: mockPatientId };
      mockRequest.body = sampleAdherenceData;
    });

    it('should record adherence with cultural context', async () => {
      await controller.recordAdherence(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: true,
        data: {
          adherenceRecord: expect.objectContaining({
            patientId: mockPatientId,
            medicationId: mockMedicationId,
            status: 'taken',
            adherenceScore: expect.any(Number)
          }),
          culturalAnalysis: {
            culturallyAppropriate: true,
            accommodationsUsed: expect.any(Array),
            culturalScore: expect.any(Number)
          }
        },
        meta: {
          timestamp: expect.any(String),
          adherenceScore: expect.any(Number),
          culturallyAdjusted: true
        }
      });
    });

    it('should validate required fields', async () => {
      mockRequest.body = {
        // Missing required fields
        notes: 'Test note'
      };

      await controller.recordAdherence(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Missing required fields: medicationId, scheduledTime, status'
      });
    });

    it('should calculate adherence score with cultural adjustments', async () => {
      const culturalAdherenceData = {
        ...sampleAdherenceData,
        status: 'late',
        culturalContext: {
          prayerTimeConflict: true,
          fastingPeriod: true,
          familySupport: true,
          traditionalMedicineUsed: false
        }
      };

      mockRequest.body = culturalAdherenceData;

      await controller.recordAdherence(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            adherenceRecord: expect.objectContaining({
              adherenceScore: expect.any(Number)
            }),
            culturalAnalysis: expect.objectContaining({
              accommodationsUsed: expect.arrayContaining(['prayer_time_adjustment'])
            })
          })
        })
      );
    });

    it('should handle festival period accommodations', async () => {
      const festivalAdherenceData = {
        ...sampleAdherenceData,
        status: 'skipped',
        culturalContext: {
          festivalPeriod: 'hari_raya_aidilfitri',
          familySupport: true
        }
      };

      mockRequest.body = festivalAdherenceData;

      await controller.recordAdherence(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            adherenceRecord: expect.objectContaining({
              adherenceScore: 8 // Cultural accommodation for festival
            })
          })
        })
      );
    });
  });

  describe('Helper Methods', () => {
    describe('interpretRiskLevel', () => {
      it('should correctly interpret risk levels', () => {
        const interpretRiskLevel = (controller as any).interpretRiskLevel;

        expect(interpretRiskLevel(95)).toBe('low');
        expect(interpretRiskLevel(85)).toBe('moderate');
        expect(interpretRiskLevel(70)).toBe('high');
        expect(interpretRiskLevel(50)).toBe('critical');
      });
    });

    describe('calculateAdherenceScore', () => {
      it('should calculate score for taken medication', () => {
        const calculateAdherenceScore = (controller as any).calculateAdherenceScore;

        const score = calculateAdherenceScore(
          '2025-01-15T08:00:00Z',
          '2025-01-15T08:05:00Z',
          'taken',
          { familySupport: true }
        );

        expect(score).toBe(10); // Perfect score for on-time taking
      });

      it('should penalize lateness appropriately', () => {
        const calculateAdherenceScore = (controller as any).calculateAdherenceScore;

        const score = calculateAdherenceScore(
          '2025-01-15T08:00:00Z',
          '2025-01-15T08:45:00Z', // 45 minutes late
          'taken',
          {}
        );

        expect(score).toBe(6); // Reduced score for lateness
      });

      it('should award cultural accommodation bonuses', () => {
        const calculateAdherenceScore = (controller as any).calculateAdherenceScore;

        const score = calculateAdherenceScore(
          '2025-01-15T08:00:00Z',
          '2025-01-15T08:20:00Z',
          'late',
          {
            prayerTimeConflict: true,
            familySupport: true
          }
        );

        expect(score).toBeGreaterThan(6); // Base late score + cultural bonuses
      });
    });

    describe('assessCulturalAppropriateness', () => {
      it('should identify culturally appropriate adherence', () => {
        const assessCulturalAppropriateness = (controller as any).assessCulturalAppropriateness;

        const appropriate = assessCulturalAppropriateness({
          prayerTimeConflict: true,
          fastingPeriod: true,
          familySupport: true
        });

        expect(appropriate).toBe(true);
      });

      it('should identify lack of cultural context', () => {
        const assessCulturalAppropriateness = (controller as any).assessCulturalAppropriateness;

        const appropriate = assessCulturalAppropriateness({});

        expect(appropriate).toBe(false);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle service unavailability gracefully', async () => {
      mockRequest.params = { patientId: mockPatientId };
      mockAnalyticsService.calculateProgressMetrics.mockRejectedValue(
        new Error('Service temporarily unavailable')
      );

      await controller.getProgressMetrics(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.status).toHaveBeenCalledWith(500);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to retrieve progress metrics',
        error: expect.any(String)
      });
    });

    it('should not expose internal errors in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';

      mockRequest.params = { patientId: mockPatientId };
      mockAnalyticsService.calculateProgressMetrics.mockRejectedValue(
        new Error('Internal database error')
      );

      await controller.getProgressMetrics(mockRequest as Request, mockResponse as Response);

      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        message: 'Failed to retrieve progress metrics'
        // No error property in production
      });

      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Performance', () => {
    it('should handle concurrent requests efficiently', async () => {
      mockRequest.params = { patientId: mockPatientId };
      mockAnalyticsService.calculateProgressMetrics.mockResolvedValue(sampleProgressMetrics);

      // Simulate concurrent requests
      const requests = Array(10).fill(null).map(() =>
        controller.getProgressMetrics(mockRequest as Request, mockResponse as Response)
      );

      const startTime = Date.now();
      await Promise.all(requests);
      const endTime = Date.now();

      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
      expect(mockAnalyticsService.calculateProgressMetrics).toHaveBeenCalledTimes(10);
    });
  });
});