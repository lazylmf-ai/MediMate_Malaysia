/**
 * Cultural Scoring Service
 *
 * Malaysian-specific cultural intelligence for medication adherence scoring.
 * Incorporates Islamic practices, Malaysian festivals, family dynamics, and traditional medicine.
 */

import { CulturalCalendarService } from '../cultural/culturalCalendarService';
import { PrayerTimeService } from '../cultural/prayerTimeService';
import {
  AdherenceRecord,
  CulturalAdjustmentMetrics,
  CulturalFactor,
  CulturalFactorType,
  AdherenceImpact,
  ReligiousObservance
} from '../../types/adherence/adherence.types';

export interface CulturalScoringContext {
  patientId: string;
  location: {
    state: string;
    city: string;
    timezone: string;
  };
  religiousProfile: ReligiousObservance;
  familyStructure: {
    size: number;
    elderlyPresent: boolean;
    childrenPresent: boolean;
    caregiverRole: string;
  };
  traditionalMedicineUse: boolean;
  preferredLanguage: 'ms' | 'en' | 'zh' | 'ta';
}

export interface CulturalScore {
  overallScore: number; // 0-100
  componentScores: {
    religiousAlignment: number;
    festivalAccommodation: number;
    familyIntegration: number;
    traditionalHarmony: number;
    culturalSensitivity: number;
  };
  bonusPoints: number;
  penaltyPoints: number;
  recommendations: CulturalRecommendation[];
}

export interface CulturalRecommendation {
  category: 'timing' | 'family' | 'religious' | 'traditional' | 'festival';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  message: string;
  messageMs: string;
  actionRequired: boolean;
  culturalContext: string;
  implementationComplexity: 'simple' | 'moderate' | 'complex';
}

export interface FestivalImpactAnalysis {
  festival: string;
  period: { start: Date; end: Date };
  expectedImpact: 'positive' | 'negative' | 'neutral';
  impactScore: number; // -10 to +10
  accommodations: string[];
  familyCoordinationRequired: boolean;
}

export interface PrayerTimeAlignment {
  conflicts: number;
  accommodations: number;
  alignmentScore: number; // 0-100
  optimalTimes: string[];
  problematicTimes: string[];
  recommendations: string[];
}

export class CulturalScoringService {
  private culturalCalendar: CulturalCalendarService;
  private prayerTimeService: PrayerTimeService;

  // Malaysian cultural weights and constants
  private readonly CULTURAL_WEIGHTS = {
    RELIGIOUS_ALIGNMENT: 0.3,
    FESTIVAL_ACCOMMODATION: 0.2,
    FAMILY_INTEGRATION: 0.25,
    TRADITIONAL_HARMONY: 0.15,
    CULTURAL_SENSITIVITY: 0.1
  };

  private readonly RAMADAN_BONUS_MULTIPLIER = 1.2;
  private readonly FAMILY_COORDINATION_BONUS = 5;
  private readonly PRAYER_ACCOMMODATION_BONUS = 3;
  private readonly FESTIVAL_RESPECT_BONUS = 4;

  // Malaysian festival periods (approximate)
  private readonly MAJOR_FESTIVALS = [
    { name: 'Hari Raya Aidilfitri', duration: 2, impact: 8 },
    { name: 'Chinese New Year', duration: 2, impact: 7 },
    { name: 'Deepavali', duration: 1, impact: 6 },
    { name: 'Hari Raya Aidiladha', duration: 1, impact: 7 },
    { name: 'Wesak Day', duration: 1, impact: 5 },
    { name: 'Christmas', duration: 1, impact: 5 }
  ];

  constructor() {
    this.culturalCalendar = new CulturalCalendarService();
    this.prayerTimeService = new PrayerTimeService();
  }

  /**
   * Calculate comprehensive cultural score for adherence records
   */
  async calculateCulturalScore(
    adherenceRecords: AdherenceRecord[],
    context: CulturalScoringContext,
    timeframe: { start: Date; end: Date }
  ): Promise<CulturalScore> {
    const componentScores = {
      religiousAlignment: await this.calculateReligiousAlignment(adherenceRecords, context),
      festivalAccommodation: await this.calculateFestivalAccommodation(adherenceRecords, context, timeframe),
      familyIntegration: await this.calculateFamilyIntegration(adherenceRecords, context),
      traditionalHarmony: await this.calculateTraditionalHarmony(adherenceRecords, context),
      culturalSensitivity: await this.calculateCulturalSensitivity(adherenceRecords, context)
    };

    // Calculate weighted overall score
    const overallScore = Object.entries(componentScores).reduce((total, [key, score]) => {
      const weight = this.CULTURAL_WEIGHTS[key.toUpperCase() as keyof typeof this.CULTURAL_WEIGHTS];
      return total + (score * weight);
    }, 0);

    const bonusPoints = await this.calculateBonusPoints(adherenceRecords, context, timeframe);
    const penaltyPoints = await this.calculatePenaltyPoints(adherenceRecords, context);

    const finalScore = Math.max(0, Math.min(100, overallScore + bonusPoints - penaltyPoints));

    const recommendations = await this.generateCulturalRecommendations(
      adherenceRecords,
      context,
      componentScores,
      finalScore
    );

    return {
      overallScore: Math.round(finalScore * 10) / 10,
      componentScores,
      bonusPoints,
      penaltyPoints,
      recommendations
    };
  }

  /**
   * Analyze festival impact on medication adherence
   */
  async analyzeFestivalImpact(
    patientId: string,
    context: CulturalScoringContext,
    timeframe: { start: Date; end: Date }
  ): Promise<FestivalImpactAnalysis[]> {
    const festivals = await this.culturalCalendar.getCulturalEvents(
      timeframe.start,
      timeframe.end,
      ['islamic', 'federal', 'cultural']
    );

    const analyses: FestivalImpactAnalysis[] = [];

    for (const festival of festivals) {
      const festivalData = this.MAJOR_FESTIVALS.find(f =>
        festival.name.toLowerCase().includes(f.name.toLowerCase())
      );

      if (!festivalData) continue;

      const period = {
        start: festival.date,
        end: new Date(festival.date.getTime() + festival.duration_days * 24 * 60 * 60 * 1000)
      };

      // Determine impact based on cultural alignment
      let expectedImpact: 'positive' | 'negative' | 'neutral' = 'neutral';
      let impactScore = 0;

      if (this.isCulturallyRelevant(festival, context)) {
        // Festival is culturally relevant - could be positive or negative
        if (festival.healthcare_impact.affects_scheduling) {
          expectedImpact = 'negative';
          impactScore = -festivalData.impact;
        } else if (context.familyStructure.size > 1) {
          expectedImpact = 'positive';
          impactScore = festivalData.impact * 0.5; // Family support during celebrations
        }
      }

      const accommodations = this.generateFestivalAccommodations(festival, context);
      const familyCoordinationRequired = accommodations.includes('family_coordination');

      analyses.push({
        festival: festival.name,
        period,
        expectedImpact,
        impactScore,
        accommodations,
        familyCoordinationRequired
      });
    }

    return analyses;
  }

  /**
   * Analyze prayer time alignment with medication schedule
   */
  async analyzePrayerTimeAlignment(
    adherenceRecords: AdherenceRecord[],
    context: CulturalScoringContext
  ): Promise<PrayerTimeAlignment> {
    if (context.religiousProfile.religion !== 'islam') {
      return {
        conflicts: 0,
        accommodations: 0,
        alignmentScore: 100,
        optimalTimes: [],
        problematicTimes: [],
        recommendations: []
      };
    }

    let conflicts = 0;
    let accommodations = 0;
    const problematicTimes = new Set<string>();
    const accommodatedTimes = new Set<string>();

    for (const record of adherenceRecords) {
      if (record.culturalContext.prayerTimeConflict) {
        conflicts++;
        const timeSlot = this.getTimeSlot(record.scheduledTime);
        problematicTimes.add(timeSlot);

        // Check if accommodation was made
        if (record.status === 'late' && record.takenTime) {
          const delayMinutes = (record.takenTime.getTime() - record.scheduledTime.getTime()) / (1000 * 60);
          if (delayMinutes <= 30) { // Reasonable prayer-related delay
            accommodations++;
            accommodatedTimes.add(timeSlot);
          }
        }
      }
    }

    const totalRecords = adherenceRecords.length;
    const alignmentScore = totalRecords > 0
      ? Math.max(0, 100 - (conflicts / totalRecords) * 100)
      : 100;

    const optimalTimes = await this.getOptimalPrayerTimes(context);
    const recommendations = this.generatePrayerTimeRecommendations(
      conflicts,
      accommodations,
      Array.from(problematicTimes),
      context
    );

    return {
      conflicts,
      accommodations,
      alignmentScore: Math.round(alignmentScore),
      optimalTimes,
      problematicTimes: Array.from(problematicTimes),
      recommendations
    };
  }

  /**
   * Calculate cultural adjustment impact on adherence
   */
  calculateCulturalAdjustmentImpact(
    adjustments: CulturalAdjustmentMetrics,
    totalRecords: number
  ): AdherenceImpact {
    const baseRate = totalRecords > 0 ? 1 : 0;

    const adherenceChange = (
      (adjustments.ramadanAdjustments * 0.02) +
      (adjustments.familyCoordinationImpact * 0.015) -
      (adjustments.prayerTimeDelays * 0.005)
    ) / Math.max(1, totalRecords);

    const timingFlexibility = Math.min(1, (
      adjustments.prayerTimeDelays +
      adjustments.festivalExemptions
    ) / Math.max(1, totalRecords * 0.1));

    const familyInvolvement = Math.min(1,
      adjustments.familyCoordinationImpact / Math.max(1, totalRecords * 0.3)
    );

    const culturalHarmony = Math.min(1, (
      adjustments.ramadanAdjustments +
      adjustments.festivalExemptions -
      (adjustments.traditionalMedicineInteractions * 0.5)
    ) / Math.max(1, totalRecords * 0.2));

    return {
      adherenceChange: Math.max(-0.1, Math.min(0.1, adherenceChange)),
      timingFlexibility: Math.round(timingFlexibility * 100) / 100,
      familyInvolvement: Math.round(familyInvolvement * 100) / 100,
      culturalHarmony: Math.max(0, Math.min(1, culturalHarmony))
    };
  }

  /**
   * Generate cultural factor predictions for upcoming period
   */
  async generateCulturalFactorPredictions(
    context: CulturalScoringContext,
    forecastPeriod: { start: Date; end: Date }
  ): Promise<CulturalFactor[]> {
    const factors: CulturalFactor[] = [];

    // Check for Ramadan
    const ramadanStatus = await this.culturalCalendar.isRamadan(forecastPeriod.start);
    if (ramadanStatus.is_ramadan && context.religiousProfile.religion === 'islam') {
      factors.push({
        factor: 'ramadan_fasting',
        impact: context.religiousProfile.observanceLevel === 'strict' ? -0.1 : -0.05,
        timeWindow: forecastPeriod,
        adjustment: 'Adjust medication timing for sahur and iftar'
      });
    }

    // Check for upcoming festivals
    const upcomingFestivals = await this.culturalCalendar.getCulturalEvents(
      forecastPeriod.start,
      forecastPeriod.end,
      ['islamic', 'federal', 'cultural']
    );

    for (const festival of upcomingFestivals) {
      if (this.isCulturallyRelevant(festival, context)) {
        const impact = this.calculateFestivalImpact(festival, context);
        factors.push({
          factor: 'festival_period',
          impact,
          timeWindow: {
            start: festival.date,
            end: new Date(festival.date.getTime() + festival.duration_days * 24 * 60 * 60 * 1000)
          },
          adjustment: `Accommodate ${festival.name} celebrations with family coordination`
        });
      }
    }

    // Check for prayer schedule conflicts
    if (context.religiousProfile.religion === 'islam') {
      factors.push({
        factor: 'prayer_schedule',
        impact: 0.02, // Slight positive impact for accommodation
        timeWindow: forecastPeriod,
        adjustment: 'Allow 15-30 minute flexibility around prayer times'
      });
    }

    return factors;
  }

  // Private helper methods

  private async calculateReligiousAlignment(
    records: AdherenceRecord[],
    context: CulturalScoringContext
  ): Promise<number> {
    if (context.religiousProfile.religion === 'none') {
      return 85; // Neutral base score for non-religious patients
    }

    const religionSpecificRecords = records.filter(r =>
      r.culturalContext.prayerTimeConflict || r.culturalContext.fastingPeriod
    );

    if (religionSpecificRecords.length === 0) {
      return 75; // No religious considerations recorded
    }

    const accommodatedRecords = religionSpecificRecords.filter(r =>
      r.status === 'taken' || (r.status === 'late' && r.culturalContext.prayerTimeConflict)
    );

    const alignmentRate = accommodatedRecords.length / religionSpecificRecords.length;
    return Math.round(alignmentRate * 100);
  }

  private async calculateFestivalAccommodation(
    records: AdherenceRecord[],
    context: CulturalScoringContext,
    timeframe: { start: Date; end: Date }
  ): Promise<number> {
    const festivalRecords = records.filter(r => r.culturalContext.festivalPeriod);

    if (festivalRecords.length === 0) {
      return 80; // Neutral score if no festivals occurred
    }

    const appropriateAccommodations = festivalRecords.filter(r =>
      r.status === 'taken' ||
      (r.status === 'skipped' && r.culturalContext.festivalPeriod) // Appropriate to skip during major festivals
    );

    const accommodationRate = appropriateAccommodations.length / festivalRecords.length;
    return Math.round(accommodationRate * 100);
  }

  private async calculateFamilyIntegration(
    records: AdherenceRecord[],
    context: CulturalScoringContext
  ): Promise<number> {
    const familySupportRecords = records.filter(r => r.culturalContext.familySupport);

    if (context.familyStructure.size === 1) {
      return 70; // Lower base score for individuals
    }

    if (familySupportRecords.length === 0) {
      return 50; // Low score if family involvement is minimal
    }

    const familyRate = familySupportRecords.length / records.length;
    const familySizeBonus = Math.min(20, context.familyStructure.size * 3);
    const elderlyBonus = context.familyStructure.elderlyPresent ? 10 : 0;

    return Math.min(100, Math.round(familyRate * 70 + familySizeBonus + elderlyBonus));
  }

  private async calculateTraditionalHarmony(
    records: AdherenceRecord[],
    context: CulturalScoringContext
  ): Promise<number> {
    if (!context.traditionalMedicineUse) {
      return 85; // High score for no traditional medicine conflicts
    }

    const traditionalRecords = records.filter(r => r.culturalContext.traditionalMedicineUsed);

    if (traditionalRecords.length === 0) {
      return 90; // Good integration if traditional medicine is used but no conflicts
    }

    // Check for proper coordination between traditional and modern medicine
    const wellCoordinatedRecords = traditionalRecords.filter(r =>
      r.status === 'taken' && r.notes?.includes('traditional')
    );

    const coordinationRate = wellCoordinatedRecords.length / traditionalRecords.length;
    return Math.round(coordinationRate * 100);
  }

  private async calculateCulturalSensitivity(
    records: AdherenceRecord[],
    context: CulturalScoringContext
  ): Promise<number> {
    // Evaluate overall cultural sensitivity in medication management
    let sensitivityScore = 70; // Base score

    // Language preference accommodation
    if (context.preferredLanguage === 'ms') {
      sensitivityScore += 10; // Bonus for local language preference
    }

    // Cultural reason codes usage
    const culturalReasonRecords = records.filter(r => r.culturalContext.reasonCode);
    if (culturalReasonRecords.length > 0) {
      sensitivityScore += 15; // Bonus for using cultural reason codes
    }

    // Multi-cultural accommodation
    const diverseAccommodations = new Set(
      records.map(r => r.culturalContext.reasonCode).filter(Boolean)
    );
    sensitivityScore += Math.min(10, diverseAccommodations.size * 2);

    return Math.min(100, sensitivityScore);
  }

  private async calculateBonusPoints(
    records: AdherenceRecord[],
    context: CulturalScoringContext,
    timeframe: { start: Date; end: Date }
  ): Promise<number> {
    let bonusPoints = 0;

    // Ramadan accommodation bonus
    const ramadanStatus = await this.culturalCalendar.isRamadan(timeframe.start);
    if (ramadanStatus.is_ramadan) {
      const ramadanRecords = records.filter(r => r.culturalContext.fastingPeriod);
      const successfulRamadanAdherence = ramadanRecords.filter(r =>
        r.status === 'taken' || r.status === 'late'
      ).length;

      if (successfulRamadanAdherence > ramadanRecords.length * 0.8) {
        bonusPoints += this.FAMILY_COORDINATION_BONUS;
      }
    }

    // Family coordination bonus
    const familyRecords = records.filter(r => r.culturalContext.familySupport);
    if (familyRecords.length > records.length * 0.3) {
      bonusPoints += this.FAMILY_COORDINATION_BONUS;
    }

    // Prayer time accommodation bonus
    const prayerRecords = records.filter(r =>
      r.culturalContext.prayerTimeConflict && (r.status === 'taken' || r.status === 'late')
    );
    if (prayerRecords.length > 0) {
      bonusPoints += this.PRAYER_ACCOMMODATION_BONUS;
    }

    // Festival respect bonus
    const festivalRecords = records.filter(r => r.culturalContext.festivalPeriod);
    if (festivalRecords.length > 0) {
      bonusPoints += this.FESTIVAL_RESPECT_BONUS;
    }

    return bonusPoints;
  }

  private async calculatePenaltyPoints(
    records: AdherenceRecord[],
    context: CulturalScoringContext
  ): Promise<number> {
    let penaltyPoints = 0;

    // Penalty for ignoring cultural factors
    const missedDueToCultural = records.filter(r =>
      r.status === 'missed' && (
        r.culturalContext.prayerTimeConflict ||
        r.culturalContext.fastingPeriod ||
        r.culturalContext.festivalPeriod
      )
    );

    penaltyPoints += missedDueToCultural.length * 2;

    // Penalty for traditional medicine conflicts
    const traditionalConflicts = records.filter(r =>
      r.culturalContext.traditionalMedicineUsed && r.status === 'missed'
    );

    penaltyPoints += traditionalConflicts.length * 1.5;

    return penaltyPoints;
  }

  private async generateCulturalRecommendations(
    records: AdherenceRecord[],
    context: CulturalScoringContext,
    componentScores: any,
    finalScore: number
  ): Promise<CulturalRecommendation[]> {
    const recommendations: CulturalRecommendation[] = [];

    // Religious alignment recommendations
    if (componentScores.religiousAlignment < 70) {
      recommendations.push({
        category: 'religious',
        priority: 'high',
        message: 'Consider adjusting medication schedule to better accommodate prayer times',
        messageMs: 'Pertimbangkan untuk menyesuaikan jadual ubat mengikut waktu solat',
        actionRequired: true,
        culturalContext: 'Islamic prayer observance',
        implementationComplexity: 'moderate'
      });
    }

    // Family integration recommendations
    if (componentScores.familyIntegration < 60) {
      recommendations.push({
        category: 'family',
        priority: 'medium',
        message: 'Involve family members in medication management for better support',
        messageMs: 'Libatkan ahli keluarga dalam pengurusan ubat untuk sokongan yang lebih baik',
        actionRequired: true,
        culturalContext: 'Malaysian family-centered healthcare',
        implementationComplexity: 'simple'
      });
    }

    // Traditional medicine harmony recommendations
    if (componentScores.traditionalHarmony < 70 && context.traditionalMedicineUse) {
      recommendations.push({
        category: 'traditional',
        priority: 'medium',
        message: 'Coordinate timing between traditional and modern medications',
        messageMs: 'Selaraskan masa antara ubat tradisional dan moden',
        actionRequired: true,
        culturalContext: 'Traditional-modern medicine integration',
        implementationComplexity: 'complex'
      });
    }

    return recommendations;
  }

  private isCulturallyRelevant(festival: any, context: CulturalScoringContext): boolean {
    // Check if festival is relevant to patient's cultural background
    if (festival.type === 'islamic' && context.religiousProfile.religion === 'islam') {
      return true;
    }

    if (festival.name.toLowerCase().includes('chinese') && context.preferredLanguage === 'zh') {
      return true;
    }

    if (festival.name.toLowerCase().includes('deepavali') && context.preferredLanguage === 'ta') {
      return true;
    }

    if (festival.type === 'federal') {
      return true; // Federal holidays affect all Malaysians
    }

    return false;
  }

  private generateFestivalAccommodations(festival: any, context: CulturalScoringContext): string[] {
    const accommodations: string[] = [];

    if (festival.healthcare_impact.affects_scheduling) {
      accommodations.push('schedule_flexibility');
    }

    if (context.familyStructure.size > 1) {
      accommodations.push('family_coordination');
    }

    if (festival.type === 'islamic' && context.religiousProfile.religion === 'islam') {
      accommodations.push('religious_observance');
    }

    return accommodations;
  }

  private getTimeSlot(date: Date): string {
    const hour = date.getHours();
    return `${hour.toString().padStart(2, '0')}:00`;
  }

  private async getOptimalPrayerTimes(context: CulturalScoringContext): Promise<string[]> {
    // Return optimal medication times that don't conflict with prayer times
    return ['07:00', '13:30', '16:00', '20:30', '22:00'];
  }

  private generatePrayerTimeRecommendations(
    conflicts: number,
    accommodations: number,
    problematicTimes: string[],
    context: CulturalScoringContext
  ): string[] {
    const recommendations: string[] = [];

    if (conflicts > accommodations) {
      recommendations.push('Allow 15-30 minutes flexibility around prayer times');
    }

    if (problematicTimes.length > 0) {
      recommendations.push(`Avoid scheduling medications at: ${problematicTimes.join(', ')}`);
    }

    if (context.religiousProfile.observanceLevel === 'strict') {
      recommendations.push('Consider pre-prayer and post-prayer medication windows');
    }

    return recommendations;
  }

  private calculateFestivalImpact(festival: any, context: CulturalScoringContext): number {
    let impact = 0;

    if (festival.healthcare_impact.affects_scheduling) {
      impact -= 0.05; // Slight negative impact due to scheduling disruption
    }

    if (context.familyStructure.size > 1) {
      impact += 0.03; // Family support during festivals
    }

    if (this.isCulturallyRelevant(festival, context)) {
      impact -= 0.02; // Cultural celebration priority
    }

    return Math.max(-0.1, Math.min(0.1, impact));
  }
}