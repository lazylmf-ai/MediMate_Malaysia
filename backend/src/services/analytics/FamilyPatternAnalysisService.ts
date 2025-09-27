/**
 * Family Pattern Analysis Service
 *
 * Analyzes family-wide medication adherence patterns with Malaysian cultural dynamics.
 * Provides insights into family coordination, support systems, and cultural harmony.
 */

import { DatabaseService } from '../database/databaseService';
import { CacheService } from '../cache/redisService';
import { CulturalScoringService, CulturalScoringContext } from './CulturalScoringService';
import {
  FamilyAdherenceMetrics,
  AdherenceRecord,
  FamilyRole,
  AdherencePattern,
  AdherenceInsight,
  CulturalObservation,
  ProgressMetrics
} from '../../types/adherence/adherence.types';

export interface FamilyMemberProfile {
  memberId: string;
  role: FamilyRole;
  age: number;
  medications: number;
  culturalProfile: CulturalScoringContext;
  adherenceHistory: AdherenceRecord[];
  supportActivity: FamilySupportActivity;
}

export interface FamilySupportActivity {
  remindersGiven: number;
  remindersReceived: number;
  coordinationEvents: number;
  medicationPickups: number;
  appointmentAccompaniment: number;
  culturalAccommodations: number;
}

export interface FamilyDynamicsAnalysis {
  coordinationPatterns: CoordinationPattern[];
  supportNetworks: SupportNetwork[];
  culturalInfluences: CulturalInfluence[];
  communicationEffectiveness: number; // 0-100
  hierarchyRespect: number; // 0-100
  collectiveBehaviors: CollectiveBehavior[];
}

export interface CoordinationPattern {
  pattern: 'centralized' | 'distributed' | 'hierarchical' | 'peer_to_peer';
  effectiveness: number;
  participants: string[];
  culturalAlignment: number;
  commonTimes: string[];
  challenges: string[];
  recommendations: string[];
}

export interface SupportNetwork {
  supporter: string;
  supportee: string;
  supportType: 'reminder' | 'coordination' | 'emotional' | 'physical' | 'cultural';
  frequency: number;
  effectiveness: number;
  culturalContext: string;
}

export interface CulturalInfluence {
  influencer: string;
  influence: 'positive' | 'negative' | 'neutral';
  domain: 'timing' | 'family_involvement' | 'traditional_medicine' | 'religious_practice';
  strength: number; // 0-100
  culturalBasis: string;
  impact: string;
}

export interface CollectiveBehavior {
  behavior: string;
  frequency: number;
  participants: string[];
  culturalSignificance: string;
  adherenceImpact: number; // -10 to +10
  sustainability: 'low' | 'medium' | 'high';
}

export interface FamilyAdherenceInsight {
  category: 'coordination' | 'support' | 'cultural' | 'generational' | 'role_based';
  insight: string;
  insightMs: string;
  familyMembers: string[];
  culturalRelevance: number;
  actionPriority: 'low' | 'medium' | 'high' | 'urgent';
  implementation: {
    steps: string[];
    stepsMs: string[];
    timeframe: string;
    resources: string[];
  };
}

export interface GenerationalPattern {
  generation: 'elderly' | 'adult' | 'young_adult' | 'child';
  adherenceRate: number;
  commonChallenges: string[];
  supportNeeds: string[];
  culturalFactors: string[];
  familyRole: string;
  influenceOnOthers: number;
}

export class FamilyPatternAnalysisService {
  private db: DatabaseService;
  private cache: CacheService;
  private culturalScoring: CulturalScoringService;

  // Malaysian family dynamics constants
  private readonly FAMILY_ROLE_WEIGHTS = {
    head: 1.3,
    spouse: 1.2,
    parent: 1.1,
    elderly: 1.4,
    caregiver: 1.3,
    child: 0.8
  };

  private readonly CULTURAL_COORDINATION_PATTERNS = {
    RAMADAN_COLLECTIVE: 'Family synchronizes medication with iftar/sahur',
    PRAYER_ACCOMMODATION: 'Coordinated prayer-time medication adjustments',
    FESTIVAL_PLANNING: 'Family medication planning for celebrations',
    ELDERLY_RESPECT: 'Medication decisions defer to elderly family members',
    TRADITIONAL_INTEGRATION: 'Family coordinates traditional and modern medicine'
  };

  constructor() {
    this.db = DatabaseService.getInstance();
    this.cache = CacheService.getInstance();
    this.culturalScoring = new CulturalScoringService();
  }

  /**
   * Analyze comprehensive family adherence patterns
   */
  async analyzeFamilyPatterns(familyId: string): Promise<FamilyDynamicsAnalysis> {
    const cacheKey = `family_patterns:${familyId}`;
    const cached = await this.cache.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    // Get family member profiles
    const familyProfiles = await this.getFamilyMemberProfiles(familyId);

    // Analyze coordination patterns
    const coordinationPatterns = await this.analyzeCoordinationPatterns(familyProfiles);

    // Analyze support networks
    const supportNetworks = await this.analyzeSupportNetworks(familyProfiles);

    // Analyze cultural influences
    const culturalInfluences = await this.analyzeCulturalInfluences(familyProfiles);

    // Calculate communication effectiveness
    const communicationEffectiveness = await this.calculateCommunicationEffectiveness(familyProfiles);

    // Calculate hierarchy respect
    const hierarchyRespect = await this.calculateHierarchyRespect(familyProfiles);

    // Identify collective behaviors
    const collectiveBehaviors = await this.identifyCollectiveBehaviors(familyProfiles);

    const analysis: FamilyDynamicsAnalysis = {
      coordinationPatterns,
      supportNetworks,
      culturalInfluences,
      communicationEffectiveness,
      hierarchyRespect,
      collectiveBehaviors
    };

    // Cache for 30 minutes
    await this.cache.set(cacheKey, JSON.stringify(analysis), 1800);

    return analysis;
  }

  /**
   * Generate family-specific adherence insights
   */
  async generateFamilyInsights(familyId: string): Promise<FamilyAdherenceInsight[]> {
    const familyProfiles = await this.getFamilyMemberProfiles(familyId);
    const familyDynamics = await this.analyzeFamilyPatterns(familyId);

    const insights: FamilyAdherenceInsight[] = [];

    // Coordination insights
    insights.push(...await this.generateCoordinationInsights(familyProfiles, familyDynamics));

    // Support system insights
    insights.push(...await this.generateSupportInsights(familyProfiles, familyDynamics));

    // Cultural insights
    insights.push(...await this.generateCulturalInsights(familyProfiles, familyDynamics));

    // Generational insights
    insights.push(...await this.generateGenerationalInsights(familyProfiles));

    // Role-based insights
    insights.push(...await this.generateRoleBasedInsights(familyProfiles));

    return insights.sort((a, b) => {
      const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
      return priorityOrder[b.actionPriority] - priorityOrder[a.actionPriority];
    });
  }

  /**
   * Analyze generational adherence patterns
   */
  async analyzeGenerationalPatterns(familyId: string): Promise<GenerationalPattern[]> {
    const familyProfiles = await this.getFamilyMemberProfiles(familyId);

    const generationMap = new Map<string, FamilyMemberProfile[]>();

    // Group by generation
    familyProfiles.forEach(profile => {
      const generation = this.determineGeneration(profile.age, profile.role);
      if (!generationMap.has(generation)) {
        generationMap.set(generation, []);
      }
      generationMap.get(generation)!.push(profile);
    });

    const patterns: GenerationalPattern[] = [];

    for (const [generation, members] of generationMap) {
      const adherenceRates = members.map(m => this.calculateMemberAdherenceRate(m));
      const averageAdherence = adherenceRates.reduce((sum, rate) => sum + rate, 0) / adherenceRates.length;

      const commonChallenges = await this.identifyGenerationalChallenges(generation, members);
      const supportNeeds = await this.identifyGenerationalSupportNeeds(generation, members);
      const culturalFactors = await this.identifyGenerationalCulturalFactors(generation, members);
      const familyRole = this.determineGenerationalRole(generation, members);
      const influenceOnOthers = await this.calculateGenerationalInfluence(generation, members, familyProfiles);

      patterns.push({
        generation: generation as any,
        adherenceRate: Math.round(averageAdherence * 10) / 10,
        commonChallenges,
        supportNeeds,
        culturalFactors,
        familyRole,
        influenceOnOthers
      });
    }

    return patterns;
  }

  /**
   * Calculate family coordination score
   */
  async calculateFamilyCoordinationScore(familyId: string): Promise<{
    overallScore: number;
    componentScores: {
      communication: number;
      timing: number;
      cultural: number;
      support: number;
      hierarchy: number;
    };
    recommendations: string[];
  }> {
    const familyDynamics = await this.analyzeFamilyPatterns(familyId);
    const familyProfiles = await this.getFamilyMemberProfiles(familyId);

    // Calculate component scores
    const communication = familyDynamics.communicationEffectiveness;
    const timing = await this.calculateTimingCoordination(familyProfiles);
    const cultural = await this.calculateCulturalCoordination(familyProfiles);
    const support = await this.calculateSupportCoordination(familyDynamics.supportNetworks);
    const hierarchy = familyDynamics.hierarchyRespect;

    const componentScores = { communication, timing, cultural, support, hierarchy };

    // Calculate weighted overall score
    const weights = { communication: 0.25, timing: 0.2, cultural: 0.25, support: 0.2, hierarchy: 0.1 };
    const overallScore = Object.entries(componentScores).reduce((total, [key, score]) => {
      return total + (score * weights[key as keyof typeof weights]);
    }, 0);

    // Generate recommendations
    const recommendations = await this.generateCoordinationRecommendations(componentScores);

    return {
      overallScore: Math.round(overallScore),
      componentScores,
      recommendations
    };
  }

  /**
   * Identify optimal family medication schedules
   */
  async identifyOptimalFamilySchedules(familyId: string): Promise<{
    familySchedule: FamilyScheduleRecommendation[];
    coordinationOpportunities: CoordinationOpportunity[];
    culturalConsiderations: string[];
  }> {
    const familyProfiles = await this.getFamilyMemberProfiles(familyId);

    // Analyze individual schedules
    const individualSchedules = familyProfiles.map(profile => ({
      memberId: profile.memberId,
      role: profile.role,
      currentTimes: this.extractMedicationTimes(profile.adherenceHistory),
      culturalConstraints: this.extractCulturalConstraints(profile.culturalProfile),
      flexibility: this.calculateScheduleFlexibility(profile.adherenceHistory)
    }));

    // Find coordination opportunities
    const coordinationOpportunities = await this.findCoordinationOpportunities(individualSchedules);

    // Generate family schedule recommendations
    const familySchedule = await this.generateFamilyScheduleRecommendations(
      individualSchedules,
      coordinationOpportunities
    );

    // Identify cultural considerations
    const culturalConsiderations = await this.identifyFamilyCulturalConsiderations(familyProfiles);

    return {
      familySchedule,
      coordinationOpportunities,
      culturalConsiderations
    };
  }

  // Private helper methods

  private async getFamilyMemberProfiles(familyId: string): Promise<FamilyMemberProfile[]> {
    const query = `
      SELECT fm.*, u.age,
             COUNT(DISTINCT m.id) as medication_count
      FROM family_members fm
      JOIN users u ON fm.user_id = u.id
      LEFT JOIN medications m ON m.user_id = u.id AND m.status = 'active'
      WHERE fm.family_id = $1
      GROUP BY fm.id, u.age
    `;

    try {
      const members = await this.db.query(query, [familyId]);
      const profiles: FamilyMemberProfile[] = [];

      for (const member of members) {
        const adherenceHistory = await this.getMemberAdherenceHistory(member.user_id);
        const supportActivity = await this.getMemberSupportActivity(member.user_id, familyId);
        const culturalProfile = await this.getMemberCulturalProfile(member.user_id);

        profiles.push({
          memberId: member.user_id,
          role: member.role,
          age: member.age,
          medications: member.medication_count,
          culturalProfile,
          adherenceHistory,
          supportActivity
        });
      }

      return profiles;
    } catch (error) {
      console.error('Error getting family member profiles:', error);
      return [];
    }
  }

  private async getMemberAdherenceHistory(memberId: string): Promise<AdherenceRecord[]> {
    // Get last 30 days of adherence records
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const query = `
      SELECT ar.*, acc.*
      FROM adherence_records ar
      LEFT JOIN adherence_cultural_context acc ON ar.id = acc.adherence_record_id
      WHERE ar.patient_id = $1 AND ar.scheduled_time >= $2
      ORDER BY ar.scheduled_time DESC
    `;

    try {
      const records = await this.db.query(query, [memberId, thirtyDaysAgo.toISOString()]);
      return records.map(this.transformAdherenceRecord);
    } catch (error) {
      console.error('Error getting adherence history:', error);
      return [];
    }
  }

  private transformAdherenceRecord(row: any): AdherenceRecord {
    return {
      id: row.id,
      medicationId: row.medication_id,
      patientId: row.patient_id,
      scheduledTime: new Date(row.scheduled_time),
      takenTime: row.taken_time ? new Date(row.taken_time) : undefined,
      status: row.status,
      adherenceScore: row.adherence_score,
      notes: row.notes,
      culturalContext: {
        prayerTimeConflict: row.prayer_time_conflict || false,
        fastingPeriod: row.fasting_period || false,
        festivalPeriod: row.festival_period,
        familySupport: row.family_support || false,
        traditionalMedicineUsed: row.traditional_medicine_used || false,
        reasonCode: row.reason_code
      },
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  private async getMemberSupportActivity(memberId: string, familyId: string): Promise<FamilySupportActivity> {
    // This would query family support activities - placeholder for now
    return {
      remindersGiven: 0,
      remindersReceived: 0,
      coordinationEvents: 0,
      medicationPickups: 0,
      appointmentAccompaniment: 0,
      culturalAccommodations: 0
    };
  }

  private async getMemberCulturalProfile(memberId: string): Promise<CulturalScoringContext> {
    // This would get the member's cultural profile - placeholder for now
    return {
      patientId: memberId,
      location: { state: 'Selangor', city: 'Kuala Lumpur', timezone: 'Asia/Kuala_Lumpur' },
      religiousProfile: {
        religion: 'islam',
        observanceLevel: 'moderate',
        prayerTimePreferences: [],
        fastingPeriods: []
      },
      familyStructure: { size: 4, elderlyPresent: true, childrenPresent: true, caregiverRole: 'shared' },
      traditionalMedicineUse: false,
      preferredLanguage: 'ms'
    };
  }

  private async analyzeCoordinationPatterns(profiles: FamilyMemberProfile[]): Promise<CoordinationPattern[]> {
    // Analyze how family members coordinate medication activities
    const patterns: CoordinationPattern[] = [];

    // Check for centralized coordination (one person manages all)
    const caregivers = profiles.filter(p => p.role === 'caregiver' || p.role === 'head');
    if (caregivers.length === 1 && caregivers[0].supportActivity.remindersGiven > 5) {
      patterns.push({
        pattern: 'centralized',
        effectiveness: 75,
        participants: [caregivers[0].memberId],
        culturalAlignment: 80,
        commonTimes: ['08:00', '20:00'],
        challenges: ['Caregiver burden', 'Single point of failure'],
        recommendations: ['Distribute coordination responsibilities', 'Create backup systems']
      });
    }

    return patterns;
  }

  private async analyzeSupportNetworks(profiles: FamilyMemberProfile[]): Promise<SupportNetwork[]> {
    // Analyze support relationships between family members
    const networks: SupportNetwork[] = [];

    // This would analyze actual support data
    return networks;
  }

  private async analyzeCulturalInfluences(profiles: FamilyMemberProfile[]): Promise<CulturalInfluence[]> {
    // Analyze cultural influences within the family
    const influences: CulturalInfluence[] = [];

    // Find elderly influence on medication timing
    const elderly = profiles.filter(p => p.role === 'elderly');
    if (elderly.length > 0) {
      influences.push({
        influencer: elderly[0].memberId,
        influence: 'positive',
        domain: 'timing',
        strength: 85,
        culturalBasis: 'Malaysian respect for elderly wisdom',
        impact: 'Family follows elderly member\'s medication schedule preferences'
      });
    }

    return influences;
  }

  private async calculateCommunicationEffectiveness(profiles: FamilyMemberProfile[]): Promise<number> {
    // Calculate how effectively the family communicates about medications
    const totalMembers = profiles.length;
    const activeParticipants = profiles.filter(p =>
      p.supportActivity.remindersGiven > 0 || p.supportActivity.remindersReceived > 0
    ).length;

    return Math.round((activeParticipants / totalMembers) * 100);
  }

  private async calculateHierarchyRespect(profiles: FamilyMemberProfile[]): Promise<number> {
    // Calculate respect for family hierarchy in medication decisions
    let respectScore = 70; // Base score

    const elderly = profiles.filter(p => p.role === 'elderly');
    const head = profiles.filter(p => p.role === 'head');

    if (elderly.length > 0) {
      respectScore += 20; // Bonus for elderly respect
    }

    if (head.length === 1) {
      respectScore += 10; // Bonus for clear leadership
    }

    return Math.min(100, respectScore);
  }

  private async identifyCollectiveBehaviors(profiles: FamilyMemberProfile[]): Promise<CollectiveBehavior[]> {
    // Identify collective family behaviors around medication
    const behaviors: CollectiveBehavior[] = [];

    // Check for collective meal-time medication
    const mealTimeRecords = profiles.flatMap(p =>
      p.adherenceHistory.filter(r =>
        r.culturalContext.familySupport &&
        this.isMealTime(r.scheduledTime)
      )
    );

    if (mealTimeRecords.length > 5) {
      behaviors.push({
        behavior: 'Family meal-time medication coordination',
        frequency: mealTimeRecords.length,
        participants: [...new Set(mealTimeRecords.map(r => r.patientId))],
        culturalSignificance: 'Malaysian family dining traditions',
        adherenceImpact: 8,
        sustainability: 'high'
      });
    }

    return behaviors;
  }

  // Additional helper methods for insights generation
  private async generateCoordinationInsights(
    profiles: FamilyMemberProfile[],
    dynamics: FamilyDynamicsAnalysis
  ): Promise<FamilyAdherenceInsight[]> {
    const insights: FamilyAdherenceInsight[] = [];

    if (dynamics.communicationEffectiveness < 60) {
      insights.push({
        category: 'coordination',
        insight: 'Family medication communication can be improved through regular check-ins',
        insightMs: 'Komunikasi keluarga tentang ubat boleh diperbaiki melalui perbincangan berkala',
        familyMembers: profiles.map(p => p.memberId),
        culturalRelevance: 0.8,
        actionPriority: 'high',
        implementation: {
          steps: [
            'Schedule weekly family medication reviews',
            'Use shared medication calendar',
            'Designate family medication coordinator'
          ],
          stepsMs: [
            'Jadualkan semakan ubat keluarga mingguan',
            'Gunakan kalendar ubat bersama',
            'Lantik penyelaras ubat keluarga'
          ],
          timeframe: '2 weeks',
          resources: ['Family calendar app', 'Weekly meeting time']
        }
      });
    }

    return insights;
  }

  private async generateSupportInsights(
    profiles: FamilyMemberProfile[],
    dynamics: FamilyDynamicsAnalysis
  ): Promise<FamilyAdherenceInsight[]> {
    return []; // Placeholder
  }

  private async generateCulturalInsights(
    profiles: FamilyMemberProfile[],
    dynamics: FamilyDynamicsAnalysis
  ): Promise<FamilyAdherenceInsight[]> {
    return []; // Placeholder
  }

  private async generateGenerationalInsights(profiles: FamilyMemberProfile[]): Promise<FamilyAdherenceInsight[]> {
    return []; // Placeholder
  }

  private async generateRoleBasedInsights(profiles: FamilyMemberProfile[]): Promise<FamilyAdherenceInsight[]> {
    return []; // Placeholder
  }

  // Utility methods
  private determineGeneration(age: number, role: FamilyRole): string {
    if (role === 'elderly' || age >= 65) return 'elderly';
    if (age >= 35) return 'adult';
    if (age >= 18) return 'young_adult';
    return 'child';
  }

  private calculateMemberAdherenceRate(profile: FamilyMemberProfile): number {
    const records = profile.adherenceHistory;
    if (records.length === 0) return 0;

    const successfulRecords = records.filter(r => r.status === 'taken' || r.status === 'late');
    return (successfulRecords.length / records.length) * 100;
  }

  private isMealTime(scheduledTime: Date): boolean {
    const hour = scheduledTime.getHours();
    return hour >= 7 && hour <= 9 || // Breakfast
           hour >= 12 && hour <= 14 || // Lunch
           hour >= 18 && hour <= 20; // Dinner
  }

  // Placeholder methods for complex operations
  private async identifyGenerationalChallenges(generation: string, members: FamilyMemberProfile[]): Promise<string[]> {
    return [];
  }

  private async identifyGenerationalSupportNeeds(generation: string, members: FamilyMemberProfile[]): Promise<string[]> {
    return [];
  }

  private async identifyGenerationalCulturalFactors(generation: string, members: FamilyMemberProfile[]): Promise<string[]> {
    return [];
  }

  private determineGenerationalRole(generation: string, members: FamilyMemberProfile[]): string {
    return 'supporter';
  }

  private async calculateGenerationalInfluence(generation: string, members: FamilyMemberProfile[], allProfiles: FamilyMemberProfile[]): Promise<number> {
    return 50;
  }

  private async calculateTimingCoordination(profiles: FamilyMemberProfile[]): Promise<number> {
    return 75;
  }

  private async calculateCulturalCoordination(profiles: FamilyMemberProfile[]): Promise<number> {
    return 80;
  }

  private async calculateSupportCoordination(networks: SupportNetwork[]): Promise<number> {
    return 70;
  }

  private async generateCoordinationRecommendations(scores: any): Promise<string[]> {
    return ['Improve family communication', 'Coordinate medication times'];
  }

  private extractMedicationTimes(history: AdherenceRecord[]): string[] {
    return [];
  }

  private extractCulturalConstraints(profile: CulturalScoringContext): string[] {
    return [];
  }

  private calculateScheduleFlexibility(history: AdherenceRecord[]): number {
    return 50;
  }

  private async findCoordinationOpportunities(schedules: any[]): Promise<CoordinationOpportunity[]> {
    return [];
  }

  private async generateFamilyScheduleRecommendations(schedules: any[], opportunities: CoordinationOpportunity[]): Promise<FamilyScheduleRecommendation[]> {
    return [];
  }

  private async identifyFamilyCulturalConsiderations(profiles: FamilyMemberProfile[]): Promise<string[]> {
    return [];
  }
}

// Supporting interfaces
interface CoordinationOpportunity {
  type: string;
  members: string[];
  timeWindow: string;
  culturalAlignment: number;
  potentialBenefit: string;
}

interface FamilyScheduleRecommendation {
  memberId: string;
  currentTime: string;
  recommendedTime: string;
  reason: string;
  culturalConsiderations: string[];
}