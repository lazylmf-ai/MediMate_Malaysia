/**
 * Cultural Pattern Analyzer
 *
 * Malaysian healthcare-specific pattern analysis engine that identifies
 * cultural adherence patterns and provides culturally-appropriate insights
 * for medication management.
 */

import {
  AdherenceRecord,
  CulturalInsight,
  CulturalInsightType,
  CulturalAdherenceContext,
  AdherencePattern,
  PatternType
} from '../../types/adherence';
import { Medication } from '../../types/medication';

interface PrayerTimeWindow {
  name: string;
  startHour: number;
  endHour: number;
  culturalImportance: 'high' | 'medium' | 'low';
}

interface FestivalPeriod {
  name: string;
  startDate: Date;
  endDate: Date;
  culturalGroup: string[];
  expectedImpact: 'positive' | 'negative' | 'neutral';
  recommendations: string[];
}

interface CulturalPattern {
  type: string;
  frequency: number;
  impact: number;
  lastOccurrence: Date;
  affectedMedications: string[];
}

export class CulturalPatternAnalyzer {
  private readonly prayerTimes: PrayerTimeWindow[] = [
    { name: 'Subuh', startHour: 5, endHour: 7, culturalImportance: 'high' },
    { name: 'Zohor', startHour: 12, endHour: 14, culturalImportance: 'medium' },
    { name: 'Asar', startHour: 15, endHour: 17, culturalImportance: 'medium' },
    { name: 'Maghrib', startHour: 18, endHour: 20, culturalImportance: 'high' },
    { name: 'Isyak', startHour: 20, endHour: 22, culturalImportance: 'medium' }
  ];

  private readonly malaysianFestivals: FestivalPeriod[] = [
    {
      name: 'Hari Raya Aidilfitri',
      startDate: new Date('2025-03-29'),
      endDate: new Date('2025-04-01'),
      culturalGroup: ['Malay', 'Muslim'],
      expectedImpact: 'negative',
      recommendations: [
        'Prepare medication supplies before festival',
        'Set family reminders for medication during celebrations',
        'Consider pre-festival medication review'
      ]
    },
    {
      name: 'Chinese New Year',
      startDate: new Date('2025-01-29'),
      endDate: new Date('2025-02-12'),
      culturalGroup: ['Chinese'],
      expectedImpact: 'negative',
      recommendations: [
        'Maintain medication routine during reunion dinners',
        'Use red packet reminders for medication',
        'Involve family in medication reminders'
      ]
    },
    {
      name: 'Deepavali',
      startDate: new Date('2025-10-20'),
      endDate: new Date('2025-10-21'),
      culturalGroup: ['Indian', 'Hindu'],
      expectedImpact: 'neutral',
      recommendations: [
        'Coordinate medication with festival preparations',
        'Use festival lights as medication reminders'
      ]
    }
  ];

  /**
   * Analyze cultural patterns in adherence records
   */
  analyzeCulturalPatterns(
    records: AdherenceRecord[],
    medications: Medication[]
  ): CulturalInsight[] {
    const insights: CulturalInsight[] = [];

    // Prayer time analysis
    const prayerInsight = this.analyzePrayerTimeImpact(records);
    if (prayerInsight) insights.push(prayerInsight);

    // Ramadan/fasting analysis
    const ramadanInsight = this.analyzeRamadanImpact(records);
    if (ramadanInsight) insights.push(ramadanInsight);

    // Festival period analysis
    const festivalInsights = this.analyzeFestivalImpact(records);
    insights.push(...festivalInsights);

    // Family involvement analysis
    const familyInsight = this.analyzeFamilyInvolvement(records);
    if (familyInsight) insights.push(familyInsight);

    // Traditional medicine interaction
    const traditionalInsight = this.analyzeTraditionalMedicineInteraction(records, medications);
    if (traditionalInsight) insights.push(traditionalInsight);

    // Meal timing preferences
    const mealInsight = this.analyzeMealTimingPreferences(records);
    if (mealInsight) insights.push(mealInsight);

    // Cultural celebration impact
    const celebrationInsight = this.analyzeCelebrationImpact(records);
    if (celebrationInsight) insights.push(celebrationInsight);

    return insights;
  }

  /**
   * Analyze prayer time impact on adherence
   */
  private analyzePrayerTimeImpact(records: AdherenceRecord[]): CulturalInsight | null {
    const prayerTimeConflicts = records.filter(record => {
      const hour = new Date(record.scheduledTime).getHours();
      return this.prayerTimes.some(prayer =>
        hour >= prayer.startHour && hour <= prayer.endHour
      );
    });

    if (prayerTimeConflicts.length < 10) return null;

    const missedDuringPrayer = prayerTimeConflicts.filter(r => r.status === 'missed').length;
    const adjustedForPrayer = prayerTimeConflicts.filter(r => r.status === 'adjusted').length;
    const totalPrayerTime = prayerTimeConflicts.length;

    const impactPercentage = ((missedDuringPrayer + adjustedForPrayer) / totalPrayerTime) * 100;

    if (impactPercentage > 20) {
      return {
        type: 'prayer_time_optimization',
        description: `Prayer times affect ${Math.round(impactPercentage)}% of medication doses`,
        adherenceImpact: -Math.round(impactPercentage),
        occurrences: prayerTimeConflicts.length,
        recommendations: [
          'Schedule medications 30 minutes after prayer times',
          'Use prayer mat or prayer room as medication reminder location',
          'Set post-prayer alarms for medication',
          'Consider linking medication to wudu (ablution) routine'
        ],
        culturalSensitivity: 'high'
      };
    }

    return null;
  }

  /**
   * Analyze Ramadan fasting impact
   */
  private analyzeRamadanImpact(records: AdherenceRecord[]): CulturalInsight | null {
    const ramadanRecords = records.filter(record => {
      const context = record.culturalContext;
      return context?.fastingPeriod === true;
    });

    if (ramadanRecords.length < 20) return null;

    const adherenceRate = this.calculateAdherenceRate(ramadanRecords);
    const normalRecords = records.filter(r => !r.culturalContext?.fastingPeriod);
    const normalAdherence = this.calculateAdherenceRate(normalRecords);

    const adherenceDifference = normalAdherence - adherenceRate;

    if (Math.abs(adherenceDifference) > 10) {
      return {
        type: 'ramadan_adjustment',
        description: `Ramadan fasting ${adherenceDifference > 0 ? 'decreases' : 'improves'} adherence by ${Math.abs(Math.round(adherenceDifference))}%`,
        adherenceImpact: -adherenceDifference,
        occurrences: ramadanRecords.length,
        recommendations: [
          'Take medications during Sahur (pre-dawn meal) at 4:30-5:00 AM',
          'Schedule second dose immediately after Iftar (breaking fast)',
          'Use Ramadan calendar apps with medication reminders',
          'Consult healthcare provider for Ramadan-specific dosing',
          'Consider extended-release formulations during fasting'
        ],
        culturalSensitivity: 'high'
      };
    }

    return null;
  }

  /**
   * Analyze festival period impact
   */
  private analyzeFestivalImpact(records: AdherenceRecord[]): CulturalInsight[] {
    const insights: CulturalInsight[] = [];

    this.malaysianFestivals.forEach(festival => {
      const festivalRecords = records.filter(record => {
        const recordDate = new Date(record.scheduledTime);
        return recordDate >= festival.startDate && recordDate <= festival.endDate;
      });

      if (festivalRecords.length < 5) return;

      const festivalAdherence = this.calculateAdherenceRate(festivalRecords);
      const normalAdherence = this.calculateOverallAdherence(records);
      const impact = festivalAdherence - normalAdherence;

      if (Math.abs(impact) > 15) {
        insights.push({
          type: 'festival_period_pattern',
          description: `${festival.name} affects medication adherence by ${Math.round(impact)}%`,
          adherenceImpact: impact,
          occurrences: festivalRecords.length,
          recommendations: [
            ...festival.recommendations,
            'Set festival-themed medication reminders',
            'Prepare medication supplies before festival',
            'Involve family in medication support during celebrations'
          ],
          culturalSensitivity: 'high'
        });
      }
    });

    return insights;
  }

  /**
   * Analyze family involvement impact
   */
  private analyzeFamilyInvolvement(records: AdherenceRecord[]): CulturalInsight | null {
    const familyReportedRecords = records.filter(r =>
      r.method === 'family_reported' || r.culturalContext?.familyInvolvement
    );

    if (familyReportedRecords.length < 10) return null;

    const familyAdherence = this.calculateAdherenceRate(familyReportedRecords);
    const selfReportedRecords = records.filter(r =>
      r.method === 'manual' && !r.culturalContext?.familyInvolvement
    );
    const selfAdherence = this.calculateAdherenceRate(selfReportedRecords);

    const improvement = familyAdherence - selfAdherence;

    if (improvement > 10) {
      return {
        type: 'family_support_benefit',
        description: `Family involvement improves adherence by ${Math.round(improvement)}%`,
        adherenceImpact: improvement,
        occurrences: familyReportedRecords.length,
        recommendations: [
          'Encourage family medication champions',
          'Use family WhatsApp groups for medication reminders',
          'Create family medication calendars',
          'Involve elderly parents in grandchildren medication routines',
          'Use family meals as medication reminder times'
        ],
        culturalSensitivity: 'medium'
      };
    }

    return null;
  }

  /**
   * Analyze traditional medicine interaction
   */
  private analyzeTraditionalMedicineInteraction(
    records: AdherenceRecord[],
    medications: Medication[]
  ): CulturalInsight | null {
    const traditionalMedications = medications.filter(m =>
      m.category === 'traditional' || m.cultural.traditionalAlternatives?.length
    );

    if (traditionalMedications.length === 0) return null;

    const traditionalRecords = records.filter(r =>
      traditionalMedications.some(m => m.id === r.medicationId)
    );

    if (traditionalRecords.length < 10) return null;

    const traditionalAdherence = this.calculateAdherenceRate(traditionalRecords);
    const modernMedRecords = records.filter(r =>
      !traditionalMedications.some(m => m.id === r.medicationId)
    );
    const modernAdherence = this.calculateAdherenceRate(modernMedRecords);

    const difference = Math.abs(traditionalAdherence - modernAdherence);

    if (difference > 15) {
      return {
        type: 'traditional_medicine_conflict',
        description: `Traditional medicine usage shows ${Math.round(difference)}% adherence difference`,
        adherenceImpact: traditionalAdherence > modernAdherence ? difference : -difference,
        occurrences: traditionalRecords.length,
        recommendations: [
          'Discuss traditional remedies with healthcare provider',
          'Create integrated medication schedule for both types',
          'Monitor for interactions between traditional and modern medicines',
          'Respect cultural preferences while ensuring safety',
          'Document traditional medicine usage in health records'
        ],
        culturalSensitivity: 'high'
      };
    }

    return null;
  }

  /**
   * Analyze meal timing preferences
   */
  private analyzeMealTimingPreferences(records: AdherenceRecord[]): CulturalInsight | null {
    const mealTimingRecords = records.filter(r => r.culturalContext?.mealTiming);

    if (mealTimingRecords.length < 15) return null;

    const mealTimingGroups = new Map<string, { adherence: number[]; count: number }>();

    mealTimingRecords.forEach(record => {
      const timing = record.culturalContext!.mealTiming!;
      if (!mealTimingGroups.has(timing)) {
        mealTimingGroups.set(timing, { adherence: [], count: 0 });
      }

      const group = mealTimingGroups.get(timing)!;
      group.adherence.push(record.adherenceScore);
      group.count++;
    });

    let bestTiming = '';
    let bestAdherence = 0;

    mealTimingGroups.forEach((group, timing) => {
      const avgAdherence = group.adherence.reduce((a, b) => a + b, 0) / group.adherence.length;
      if (avgAdherence > bestAdherence) {
        bestAdherence = avgAdherence;
        bestTiming = timing;
      }
    });

    if (bestTiming) {
      return {
        type: 'meal_timing_preference',
        description: `Best adherence when medication taken ${bestTiming.replace('_', ' ')}`,
        adherenceImpact: Math.round(bestAdherence - 70), // Assuming 70% as baseline
        occurrences: mealTimingRecords.length,
        recommendations: [
          `Schedule medications ${bestTiming.replace('_', ' ')} consistently`,
          'Use Malaysian meal times (breakfast 7-8AM, lunch 12-1PM, dinner 7-8PM)',
          'Consider teh tarik or roti canai breakfast as medication reminder',
          'Link medication to regular meal routines',
          'Adjust for late dinners during Ramadan'
        ],
        culturalSensitivity: 'medium'
      };
    }

    return null;
  }

  /**
   * Analyze celebration impact on adherence
   */
  private analyzeCelebrationImpact(records: AdherenceRecord[]): CulturalInsight | null {
    const celebrationRecords = records.filter(r =>
      r.culturalContext?.festivalName || this.isNearCelebration(new Date(r.scheduledTime))
    );

    if (celebrationRecords.length < 20) return null;

    const celebrationAdherence = this.calculateAdherenceRate(celebrationRecords);
    const normalAdherence = this.calculateOverallAdherence(records);
    const impact = celebrationAdherence - normalAdherence;

    if (Math.abs(impact) > 10) {
      return {
        type: 'cultural_celebration_impact',
        description: `Cultural celebrations ${impact < 0 ? 'decrease' : 'increase'} adherence by ${Math.abs(Math.round(impact))}%`,
        adherenceImpact: impact,
        occurrences: celebrationRecords.length,
        recommendations: [
          'Create celebration-specific medication schedules',
          'Use cultural symbols as medication reminders',
          'Prepare extra medication supplies before celebrations',
          'Set family group reminders during festivities',
          'Link medication to celebration routines (e.g., before visiting relatives)'
        ],
        culturalSensitivity: 'medium'
      };
    }

    return null;
  }

  /**
   * Generate culturally-appropriate recommendations
   */
  generateCulturalRecommendations(
    patterns: AdherencePattern[],
    medications: Medication[]
  ): string[] {
    const recommendations: string[] = [];

    // Prayer time recommendations
    if (patterns.some(p => p.type === 'prayer_time_conflict')) {
      recommendations.push(
        'Consider using Islamic prayer apps with medication reminder features',
        'Place medications near prayer mat for post-prayer dosing',
        'Align medication schedule with five daily prayers for consistency'
      );
    }

    // Fasting recommendations
    if (patterns.some(p => p.type === 'fasting_adjustment')) {
      recommendations.push(
        'Consult with Islamic medical ethics advisor for fasting guidelines',
        'Use Ramadan-specific medication timing apps',
        'Consider modified-release formulations for once-daily dosing'
      );
    }

    // Weekend pattern recommendations
    if (patterns.some(p => p.type === 'weekend_decline')) {
      recommendations.push(
        'Set family activity reminders (e.g., before pasar malam visits)',
        'Use weekend prayer times as medication anchors',
        'Link medication to weekend family meals'
      );
    }

    // Traditional medicine considerations
    if (medications.some(m => m.category === 'traditional')) {
      recommendations.push(
        'Maintain separation between traditional and modern medicine timings',
        'Document all traditional remedies for healthcare provider review',
        'Consider cultural beliefs while ensuring medical safety'
      );
    }

    return recommendations;
  }

  /**
   * Identify cultural optimization opportunities
   */
  identifyOptimizationOpportunities(
    records: AdherenceRecord[],
    currentAdherence: number
  ): Array<{
    opportunity: string;
    potentialImprovement: number;
    implementation: string[];
  }> {
    const opportunities = [];

    // Prayer time optimization
    const prayerTimeRecords = records.filter(r => {
      const hour = new Date(r.scheduledTime).getHours();
      return this.prayerTimes.some(p => hour >= p.startHour && hour <= p.endHour);
    });

    if (prayerTimeRecords.length > 0) {
      const prayerAdherence = this.calculateAdherenceRate(prayerTimeRecords);
      if (prayerAdherence < currentAdherence) {
        opportunities.push({
          opportunity: 'Optimize medication timing around prayer schedules',
          potentialImprovement: Math.min(15, currentAdherence - prayerAdherence),
          implementation: [
            'Reschedule doses to 30 minutes after prayer times',
            'Use azan (prayer call) apps with medication reminders',
            'Create prayer-medication routine cards'
          ]
        });
      }
    }

    // Family involvement opportunity
    const familyInvolvedRecords = records.filter(r => r.method === 'family_reported');
    if (familyInvolvedRecords.length < records.length * 0.1) {
      opportunities.push({
        opportunity: 'Increase family involvement in medication management',
        potentialImprovement: 10,
        implementation: [
          'Designate family medication champion',
          'Create shared family medication calendar',
          'Use family WhatsApp group for reminders',
          'Implement buddy system for elderly patients'
        ]
      });
    }

    // Festival preparation opportunity
    const upcomingFestival = this.getUpcomingFestival();
    if (upcomingFestival) {
      opportunities.push({
        opportunity: `Prepare for ${upcomingFestival.name} festival period`,
        potentialImprovement: 8,
        implementation: [
          'Stock up on medications before festival',
          'Set festival-specific reminder schedule',
          'Brief family on medication importance during celebrations',
          'Create portable medication kit for visits'
        ]
      });
    }

    // Meal timing alignment
    const mealAlignedRecords = records.filter(r => r.culturalContext?.mealTiming);
    if (mealAlignedRecords.length < records.length * 0.3) {
      opportunities.push({
        opportunity: 'Align medication schedule with Malaysian meal times',
        potentialImprovement: 12,
        implementation: [
          'Link morning dose to breakfast (7-8 AM)',
          'Connect afternoon dose to lunch (12-1 PM)',
          'Associate evening dose with dinner (7-8 PM)',
          'Use popular meal locations as reminder triggers'
        ]
      });
    }

    return opportunities;
  }

  // Helper methods

  private calculateAdherenceRate(records: AdherenceRecord[]): number {
    if (records.length === 0) return 0;

    const takenRecords = records.filter(r =>
      ['taken_on_time', 'taken_late', 'taken_early', 'adjusted'].includes(r.status)
    );

    return (takenRecords.length / records.length) * 100;
  }

  private calculateOverallAdherence(records: AdherenceRecord[]): number {
    return this.calculateAdherenceRate(records);
  }

  private isNearCelebration(date: Date): boolean {
    return this.malaysianFestivals.some(festival => {
      const daysBefore = 7;
      const daysAfter = 3;
      const festivalStart = new Date(festival.startDate);
      festivalStart.setDate(festivalStart.getDate() - daysBefore);
      const festivalEnd = new Date(festival.endDate);
      festivalEnd.setDate(festivalEnd.getDate() + daysAfter);

      return date >= festivalStart && date <= festivalEnd;
    });
  }

  private getUpcomingFestival(): FestivalPeriod | null {
    const today = new Date();
    const upcoming = this.malaysianFestivals
      .filter(f => f.startDate > today)
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime());

    if (upcoming.length > 0) {
      const daysUntil = Math.floor(
        (upcoming[0].startDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      if (daysUntil <= 30) {
        return upcoming[0];
      }
    }

    return null;
  }

  /**
   * Analyze cultural factors for specific medication
   */
  analyzeMedicationCulturalFactors(
    medication: Medication,
    records: AdherenceRecord[]
  ): {
    culturalChallenges: string[];
    culturalOpportunities: string[];
    adaptations: string[];
  } {
    const medicationRecords = records.filter(r => r.medicationId === medication.id);
    const challenges: string[] = [];
    const opportunities: string[] = [];
    const adaptations: string[] = [];

    // Check for fasting conflicts
    if (medication.cultural.avoidDuringFasting) {
      challenges.push('Medication should be avoided during fasting');
      adaptations.push('Schedule all doses during non-fasting hours');
      adaptations.push('Consider alternative formulations suitable for fasting');
    }

    // Check for food requirements
    if (medication.cultural.takeWithFood) {
      opportunities.push('Can align with Malaysian meal times');
      adaptations.push('Link to specific meals (nasi lemak breakfast, lunch, dinner)');
    }

    // Check for prayer time conflicts
    const prayerConflicts = medicationRecords.filter(r => {
      const hour = new Date(r.scheduledTime).getHours();
      return this.prayerTimes.some(p =>
        hour >= p.startHour && hour <= p.endHour
      );
    });

    if (prayerConflicts.length > medicationRecords.length * 0.2) {
      challenges.push('Frequent conflicts with prayer times');
      adaptations.push('Reschedule to post-prayer windows');
      adaptations.push('Use prayer completion as dosing trigger');
    }

    // Check for traditional alternatives
    if (medication.cultural.traditionalAlternatives?.length) {
      opportunities.push('Traditional alternatives available for cultural preference');
      adaptations.push('Discuss integration of traditional and modern approaches');
      adaptations.push('Respect cultural preferences while ensuring efficacy');
    }

    // Check schedule flexibility
    if (medication.schedule.times.length === 1) {
      opportunities.push('Once-daily dosing allows flexible timing');
      adaptations.push('Choose culturally convenient time (e.g., after Subuh prayer)');
    } else if (medication.schedule.times.length > 3) {
      challenges.push('Frequent dosing may conflict with daily activities');
      adaptations.push('Consider extended-release formulations');
      adaptations.push('Use technology for multiple daily reminders');
    }

    return {
      culturalChallenges: challenges,
      culturalOpportunities: opportunities,
      adaptations
    };
  }
}