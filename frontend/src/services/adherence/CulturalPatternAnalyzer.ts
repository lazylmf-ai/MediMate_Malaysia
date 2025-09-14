/**
 * CulturalPatternAnalyzer.ts
 * Advanced cultural pattern analysis engine for Malaysian healthcare context
 * Analyzes adherence patterns in relation to cultural and religious practices
 */

import {
  AdherenceRecord,
  CulturalPattern,
  CulturalTheme,
  AdherenceImprovement,
  FamilyInvolvement
} from '../../types/adherence';
import { getPrayerTimes } from '../prayer-scheduling/PrayerTimeService';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Prayer time configuration for Malaysia
 */
interface PrayerTimeConfig {
  name: 'fajr' | 'zuhr' | 'asr' | 'maghrib' | 'isya';
  timeRange: { before: number; after: number }; // Minutes before/after prayer time
}

/**
 * Malaysian festival dates (dynamic based on year)
 */
interface FestivalDate {
  name: CulturalTheme;
  date: Date;
  duration: number; // Days
  culturalGroup: 'malay' | 'chinese' | 'indian' | 'national';
}

/**
 * Cultural adherence pattern
 */
interface PatternInsight {
  pattern: string;
  frequency: number;
  confidence: number;
  impact: 'positive' | 'negative' | 'neutral';
  recommendation?: string;
}

export class CulturalPatternAnalyzer {
  private static instance: CulturalPatternAnalyzer;
  private cacheKey = '@MediMate:CulturalPatterns';
  private prayerTimeConfigs: PrayerTimeConfig[];
  private festivals: Map<string, FestivalDate[]> = new Map();
  private patterns: Map<string, PatternInsight[]> = new Map();

  private constructor() {
    this.prayerTimeConfigs = [
      { name: 'fajr', timeRange: { before: 30, after: 60 } },
      { name: 'zuhr', timeRange: { before: 30, after: 45 } },
      { name: 'asr', timeRange: { before: 30, after: 45 } },
      { name: 'maghrib', timeRange: { before: 15, after: 30 } },
      { name: 'isya', timeRange: { before: 30, after: 60 } }
    ];

    this.initializeFestivals();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): CulturalPatternAnalyzer {
    if (!CulturalPatternAnalyzer.instance) {
      CulturalPatternAnalyzer.instance = new CulturalPatternAnalyzer();
    }
    return CulturalPatternAnalyzer.instance;
  }

  /**
   * Initialize Malaysian festival dates for current year
   */
  private initializeFestivals(): void {
    const currentYear = new Date().getFullYear();

    // Note: These dates would typically come from a cultural calendar API
    // Using approximate dates for demonstration
    this.festivals.set(currentYear.toString(), [
      {
        name: 'chinese_new_year',
        date: new Date(currentYear, 1, 10), // February
        duration: 15,
        culturalGroup: 'chinese'
      },
      {
        name: 'hari_raya',
        date: new Date(currentYear, 3, 10), // April (varies based on lunar calendar)
        duration: 30,
        culturalGroup: 'malay'
      },
      {
        name: 'deepavali',
        date: new Date(currentYear, 10, 1), // November
        duration: 5,
        culturalGroup: 'indian'
      },
      {
        name: 'merdeka',
        date: new Date(currentYear, 7, 31), // August 31
        duration: 1,
        culturalGroup: 'national'
      },
      {
        name: 'malaysia_day',
        date: new Date(currentYear, 8, 16), // September 16
        duration: 1,
        culturalGroup: 'national'
      }
    ]);
  }

  /**
   * Analyze cultural patterns in adherence data
   */
  public async analyzeCulturalPatterns(
    records: AdherenceRecord[],
    patientId: string,
    familyInvolvement?: FamilyInvolvement[]
  ): Promise<CulturalPattern> {
    // Calculate prayer time adherence
    const prayerTimeAdherence = await this.analyzePrayerTimeAdherence(records);

    // Calculate festival period adherence
    const festivalAdherence = await this.analyzeFestivalAdherence(records);

    // Calculate fasting period adherence
    const fastingAdherence = this.analyzeFastingAdherence(records);

    // Calculate family influence
    const familyInfluence = this.analyzeFamilyInfluence(records, familyInvolvement);

    // Identify patterns
    const patterns = await this.identifyPatterns(records);

    // Generate recommendations
    const recommendations = this.generateCulturalRecommendations(
      prayerTimeAdherence,
      festivalAdherence,
      fastingAdherence,
      familyInfluence,
      patterns
    );

    // Generate cultural considerations
    const culturalConsiderations = this.generateCulturalConsiderations(patterns);

    // Calculate overall confidence
    const confidence = this.calculateConfidence(records.length, patterns.length);

    const culturalPattern: CulturalPattern = {
      patientId,
      pattern: this.summarizePattern(patterns),
      confidence,
      observations: {
        prayerTimeAdherence,
        festivalAdherence,
        fastingPeriodAdherence: fastingAdherence,
        familyInfluence
      },
      recommendations,
      culturalConsiderations
    };

    // Cache the pattern
    await this.cachePattern(patientId, culturalPattern);

    return culturalPattern;
  }

  /**
   * Analyze adherence around prayer times
   */
  private async analyzePrayerTimeAdherence(
    records: AdherenceRecord[]
  ): Promise<CulturalPattern['observations']['prayerTimeAdherence']> {
    const prayerAdherence = {
      fajr: 0,
      zuhr: 0,
      asr: 0,
      maghrib: 0,
      isya: 0
    };

    const prayerCounts = {
      fajr: 0,
      zuhr: 0,
      asr: 0,
      maghrib: 0,
      isya: 0
    };

    for (const record of records) {
      if (!record.scheduledTime) continue;

      try {
        // Get prayer times for the record date
        const prayerTimes = await getPrayerTimes(
          record.scheduledTime,
          record.location?.latitude || 3.139,
          record.location?.longitude || 101.6869
        );

        // Check each prayer time
        for (const config of this.prayerTimeConfigs) {
          const prayerTime = prayerTimes[config.name];
          if (!prayerTime) continue;

          const prayerDate = new Date(record.scheduledTime);
          const [hours, minutes] = prayerTime.split(':').map(Number);
          prayerDate.setHours(hours, minutes, 0, 0);

          const timeDiff = Math.abs(
            (record.scheduledTime.getTime() - prayerDate.getTime()) / 60000
          );

          // Check if dose was scheduled near prayer time
          if (timeDiff <= config.timeRange.before + config.timeRange.after) {
            prayerCounts[config.name]++;

            // Check if dose was taken
            if (record.status === 'taken' || record.status === 'late') {
              prayerAdherence[config.name]++;
            }
          }
        }
      } catch (error) {
        console.error('Error analyzing prayer time adherence:', error);
      }
    }

    // Calculate percentages
    for (const prayer of Object.keys(prayerAdherence) as Array<keyof typeof prayerAdherence>) {
      if (prayerCounts[prayer] > 0) {
        prayerAdherence[prayer] = Math.round(
          (prayerAdherence[prayer] / prayerCounts[prayer]) * 100
        );
      } else {
        prayerAdherence[prayer] = 100; // No doses scheduled during prayer times
      }
    }

    return prayerAdherence;
  }

  /**
   * Analyze adherence during festival periods
   */
  private async analyzeFestivalAdherence(
    records: AdherenceRecord[]
  ): Promise<{ [festival: string]: number }> {
    const festivalAdherence: { [festival: string]: number } = {};
    const year = new Date().getFullYear().toString();
    const festivals = this.festivals.get(year) || [];

    for (const festival of festivals) {
      const festivalRecords = records.filter(r => {
        const recordDate = new Date(r.scheduledTime);
        const festivalEnd = new Date(festival.date);
        festivalEnd.setDate(festivalEnd.getDate() + festival.duration);

        return recordDate >= festival.date && recordDate <= festivalEnd;
      });

      if (festivalRecords.length > 0) {
        const taken = festivalRecords.filter(
          r => r.status === 'taken' || r.status === 'late'
        ).length;

        festivalAdherence[festival.name] = Math.round(
          (taken / festivalRecords.length) * 100
        );
      }
    }

    return festivalAdherence;
  }

  /**
   * Analyze adherence during fasting periods
   */
  private analyzeFastingAdherence(records: AdherenceRecord[]): number {
    const fastingRecords = records.filter(
      r => r.culturalContext?.isDuringFasting === true
    );

    if (fastingRecords.length === 0) return 100;

    const taken = fastingRecords.filter(
      r => r.status === 'taken' || r.status === 'late'
    ).length;

    return Math.round((taken / fastingRecords.length) * 100);
  }

  /**
   * Analyze family influence on adherence
   */
  private analyzeFamilyInfluence(
    records: AdherenceRecord[],
    familyInvolvement?: FamilyInvolvement[]
  ): number {
    if (!familyInvolvement || familyInvolvement.length === 0) return 0;

    // Find records where family was involved
    const familyActionDates = new Set<string>();

    for (const involvement of familyInvolvement) {
      for (const action of involvement.supportActions) {
        familyActionDates.add(action.date.toDateString());
      }
    }

    const familyInfluencedRecords = records.filter(r =>
      familyActionDates.has(new Date(r.scheduledTime).toDateString())
    );

    if (familyInfluencedRecords.length === 0) return 0;

    const taken = familyInfluencedRecords.filter(
      r => r.status === 'taken' || r.status === 'late'
    ).length;

    // Compare with overall adherence
    const overallAdherence = records.filter(
      r => r.status === 'taken' || r.status === 'late'
    ).length / records.length;

    const familyAdherence = taken / familyInfluencedRecords.length;

    // Return the improvement percentage
    return Math.round((familyAdherence - overallAdherence) * 100);
  }

  /**
   * Identify patterns in adherence data
   */
  private async identifyPatterns(records: AdherenceRecord[]): Promise<PatternInsight[]> {
    const patterns: PatternInsight[] = [];

    // Pattern 1: Morning vs Evening adherence
    const morningRecords = records.filter(r => {
      const hour = new Date(r.scheduledTime).getHours();
      return hour >= 5 && hour < 12;
    });

    const eveningRecords = records.filter(r => {
      const hour = new Date(r.scheduledTime).getHours();
      return hour >= 17 && hour < 22;
    });

    if (morningRecords.length > 10 && eveningRecords.length > 10) {
      const morningAdherence = morningRecords.filter(
        r => r.status === 'taken' || r.status === 'late'
      ).length / morningRecords.length;

      const eveningAdherence = eveningRecords.filter(
        r => r.status === 'taken' || r.status === 'late'
      ).length / eveningRecords.length;

      if (Math.abs(morningAdherence - eveningAdherence) > 0.2) {
        patterns.push({
          pattern: morningAdherence > eveningAdherence
            ? 'Better adherence in morning'
            : 'Better adherence in evening',
          frequency: Math.abs(morningAdherence - eveningAdherence),
          confidence: 0.8,
          impact: 'positive',
          recommendation: morningAdherence > eveningAdherence
            ? 'Schedule critical medications in the morning'
            : 'Schedule critical medications in the evening'
        });
      }
    }

    // Pattern 2: Weekend vs Weekday
    const weekdayRecords = records.filter(r => {
      const day = new Date(r.scheduledTime).getDay();
      return day >= 1 && day <= 5;
    });

    const weekendRecords = records.filter(r => {
      const day = new Date(r.scheduledTime).getDay();
      return day === 0 || day === 6;
    });

    if (weekdayRecords.length > 10 && weekendRecords.length > 5) {
      const weekdayAdherence = weekdayRecords.filter(
        r => r.status === 'taken' || r.status === 'late'
      ).length / weekdayRecords.length;

      const weekendAdherence = weekendRecords.filter(
        r => r.status === 'taken' || r.status === 'late'
      ).length / weekendRecords.length;

      if (Math.abs(weekdayAdherence - weekendAdherence) > 0.15) {
        patterns.push({
          pattern: weekdayAdherence > weekendAdherence
            ? 'Better adherence on weekdays'
            : 'Better adherence on weekends',
          frequency: Math.abs(weekdayAdherence - weekendAdherence),
          confidence: 0.75,
          impact: weekdayAdherence > weekendAdherence ? 'negative' : 'positive',
          recommendation: weekdayAdherence > weekendAdherence
            ? 'Set stronger reminders for weekends'
            : 'Maintain weekend routine during weekdays'
        });
      }
    }

    // Pattern 3: Post-prayer adherence
    const postPrayerRecords = records.filter(
      r => r.culturalContext?.isDuringPrayer === true
    );

    if (postPrayerRecords.length > 10) {
      const postPrayerAdherence = postPrayerRecords.filter(
        r => r.status === 'taken' || r.status === 'late'
      ).length / postPrayerRecords.length;

      const overallAdherence = records.filter(
        r => r.status === 'taken' || r.status === 'late'
      ).length / records.length;

      if (postPrayerAdherence > overallAdherence + 0.1) {
        patterns.push({
          pattern: 'Higher adherence after prayer times',
          frequency: postPrayerAdherence - overallAdherence,
          confidence: 0.85,
          impact: 'positive',
          recommendation: 'Continue scheduling doses after prayer times'
        });
      }
    }

    // Pattern 4: Festival impact
    const year = new Date().getFullYear().toString();
    const festivals = this.festivals.get(year) || [];

    for (const festival of festivals) {
      const festivalRecords = records.filter(r => {
        const recordDate = new Date(r.scheduledTime);
        const festivalEnd = new Date(festival.date);
        festivalEnd.setDate(festivalEnd.getDate() + festival.duration);

        return recordDate >= festival.date && recordDate <= festivalEnd;
      });

      if (festivalRecords.length > 5) {
        const festivalAdherence = festivalRecords.filter(
          r => r.status === 'taken' || r.status === 'late'
        ).length / festivalRecords.length;

        const overallAdherence = records.filter(
          r => r.status === 'taken' || r.status === 'late'
        ).length / records.length;

        if (Math.abs(festivalAdherence - overallAdherence) > 0.15) {
          patterns.push({
            pattern: `${festival.name} affects adherence`,
            frequency: Math.abs(festivalAdherence - overallAdherence),
            confidence: 0.7,
            impact: festivalAdherence > overallAdherence ? 'positive' : 'negative',
            recommendation: festivalAdherence < overallAdherence
              ? `Set special reminders during ${festival.name}`
              : `Maintain festival routine year-round`
          });
        }
      }
    }

    return patterns;
  }

  /**
   * Generate cultural recommendations
   */
  private generateCulturalRecommendations(
    prayerAdherence: CulturalPattern['observations']['prayerTimeAdherence'],
    festivalAdherence: { [festival: string]: number },
    fastingAdherence: number,
    familyInfluence: number,
    patterns: PatternInsight[]
  ): string[] {
    const recommendations: string[] = [];

    // Prayer time recommendations
    const avgPrayerAdherence = Object.values(prayerAdherence).reduce((a, b) => a + b, 0) / 5;
    if (avgPrayerAdherence < 80) {
      recommendations.push(
        'Consider adjusting medication schedule to avoid prayer times for better adherence'
      );
    } else if (avgPrayerAdherence > 90) {
      recommendations.push(
        'Excellent adherence around prayer times - maintain current scheduling pattern'
      );
    }

    // Festival recommendations
    const festivalValues = Object.values(festivalAdherence);
    if (festivalValues.length > 0) {
      const avgFestivalAdherence = festivalValues.reduce((a, b) => a + b, 0) / festivalValues.length;
      if (avgFestivalAdherence < 70) {
        recommendations.push(
          'Set special reminder patterns during festival periods to maintain adherence'
        );
      }
    }

    // Fasting recommendations
    if (fastingAdherence < 80) {
      recommendations.push(
        'Adjust medication timing for Sahur (pre-dawn) or Iftar (breaking fast) for better adherence during Ramadan'
      );
    }

    // Family influence recommendations
    if (familyInfluence > 10) {
      recommendations.push(
        'Family support significantly improves adherence - encourage continued family involvement'
      );
    } else if (familyInfluence < -5) {
      recommendations.push(
        'Consider involving family members in medication management for better support'
      );
    }

    // Pattern-based recommendations
    patterns.forEach(pattern => {
      if (pattern.recommendation && pattern.confidence > 0.7) {
        recommendations.push(pattern.recommendation);
      }
    });

    return recommendations;
  }

  /**
   * Generate cultural considerations
   */
  private generateCulturalConsiderations(patterns: PatternInsight[]): string[] {
    const considerations: string[] = [];

    // Add base considerations
    considerations.push(
      'Respect for prayer times affects medication scheduling',
      'Festival periods may require adjusted reminder patterns',
      'Family involvement is culturally important in Malaysian healthcare'
    );

    // Add pattern-specific considerations
    patterns.forEach(pattern => {
      if (pattern.impact === 'negative' && pattern.confidence > 0.6) {
        considerations.push(`Note: ${pattern.pattern} may require intervention`);
      }
    });

    return considerations;
  }

  /**
   * Summarize the overall pattern
   */
  private summarizePattern(patterns: PatternInsight[]): string {
    if (patterns.length === 0) {
      return 'Insufficient data for pattern analysis';
    }

    const positivePatterns = patterns.filter(p => p.impact === 'positive');
    const negativePatterns = patterns.filter(p => p.impact === 'negative');

    if (positivePatterns.length > negativePatterns.length) {
      return `Culturally-aligned adherence with ${positivePatterns.length} positive patterns identified`;
    } else if (negativePatterns.length > 0) {
      return `Cultural factors affecting adherence - ${negativePatterns.length} areas for improvement`;
    }

    return 'Stable adherence pattern with cultural considerations';
  }

  /**
   * Calculate confidence score
   */
  private calculateConfidence(recordCount: number, patternCount: number): number {
    // Base confidence on data volume and pattern clarity
    let confidence = 0.5;

    if (recordCount > 100) confidence += 0.2;
    else if (recordCount > 50) confidence += 0.1;
    else if (recordCount > 20) confidence += 0.05;

    if (patternCount > 3) confidence += 0.2;
    else if (patternCount > 1) confidence += 0.1;

    return Math.min(0.95, confidence);
  }

  /**
   * Generate improvement suggestions based on cultural patterns
   */
  public async generateImprovements(
    pattern: CulturalPattern,
    currentAdherence: number
  ): Promise<AdherenceImprovement[]> {
    const improvements: AdherenceImprovement[] = [];

    // Prayer time improvements
    const avgPrayerAdherence = Object.values(pattern.observations.prayerTimeAdherence)
      .reduce((a, b) => a + b, 0) / 5;

    if (avgPrayerAdherence < 80) {
      improvements.push({
        id: `imp_${Date.now()}_prayer`,
        patientId: pattern.patientId,
        suggestion: 'Enable prayer-time aware scheduling to automatically adjust medication times',
        category: 'cultural',
        priority: 'high',
        expectedImprovement: 15,
        culturallyRelevant: true,
        implementation: {
          automatic: true,
          requiresConsent: true,
          steps: [
            'Enable prayer time integration',
            'Adjust medication schedule around prayer times',
            'Set pre-prayer reminders'
          ]
        },
        createdAt: new Date()
      });
    }

    // Family involvement improvements
    if (pattern.observations.familyInfluence < 5) {
      improvements.push({
        id: `imp_${Date.now()}_family`,
        patientId: pattern.patientId,
        suggestion: 'Invite family members to support your medication journey',
        category: 'family',
        priority: 'medium',
        expectedImprovement: 10,
        culturallyRelevant: true,
        implementation: {
          automatic: false,
          requiresConsent: true,
          steps: [
            'Send family invitation',
            'Set up family notifications',
            'Enable achievement sharing'
          ]
        },
        createdAt: new Date()
      });
    }

    // Festival period improvements
    const festivalAdherences = Object.values(pattern.observations.festivalAdherence);
    if (festivalAdherences.length > 0) {
      const avgFestivalAdherence = festivalAdherences.reduce((a, b) => a + b, 0) / festivalAdherences.length;

      if (avgFestivalAdherence < 70) {
        improvements.push({
          id: `imp_${Date.now()}_festival`,
          patientId: pattern.patientId,
          suggestion: 'Enable festival-aware reminders to maintain adherence during celebrations',
          category: 'cultural',
          priority: 'medium',
          expectedImprovement: 12,
          culturallyRelevant: true,
          implementation: {
            automatic: true,
            requiresConsent: false,
            steps: [
              'Detect upcoming festivals',
              'Adjust reminder frequency',
              'Add festive celebration messages'
            ]
          },
          createdAt: new Date()
        });
      }
    }

    // Fasting period improvements
    if (pattern.observations.fastingPeriodAdherence < 75) {
      improvements.push({
        id: `imp_${Date.now()}_fasting`,
        patientId: pattern.patientId,
        suggestion: 'Optimize medication schedule for Ramadan fasting',
        category: 'cultural',
        priority: 'high',
        expectedImprovement: 20,
        culturallyRelevant: true,
        implementation: {
          automatic: true,
          requiresConsent: true,
          steps: [
            'Identify fasting periods',
            'Reschedule doses to Sahur and Iftar',
            'Adjust reminder timing'
          ]
        },
        createdAt: new Date()
      });
    }

    return improvements;
  }

  /**
   * Cache cultural pattern
   */
  private async cachePattern(patientId: string, pattern: CulturalPattern): Promise<void> {
    try {
      await AsyncStorage.setItem(
        `${this.cacheKey}:${patientId}`,
        JSON.stringify({
          pattern,
          timestamp: new Date().toISOString()
        })
      );
    } catch (error) {
      console.error('Error caching cultural pattern:', error);
    }
  }

  /**
   * Load cached pattern
   */
  public async loadCachedPattern(patientId: string): Promise<CulturalPattern | null> {
    try {
      const cached = await AsyncStorage.getItem(`${this.cacheKey}:${patientId}`);
      if (cached) {
        const data = JSON.parse(cached);
        // Check if cache is less than 24 hours old
        const cacheAge = Date.now() - new Date(data.timestamp).getTime();
        if (cacheAge < 86400000) {
          return data.pattern;
        }
      }
    } catch (error) {
      console.error('Error loading cached pattern:', error);
    }
    return null;
  }

  /**
   * Clear pattern cache
   */
  public async clearCache(): Promise<void> {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const patternKeys = keys.filter(key => key.startsWith(this.cacheKey));
      await AsyncStorage.multiRemove(patternKeys);
      this.patterns.clear();
    } catch (error) {
      console.error('Error clearing pattern cache:', error);
    }
  }
}