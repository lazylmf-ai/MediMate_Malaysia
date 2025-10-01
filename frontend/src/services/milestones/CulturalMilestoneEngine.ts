/**
 * Cultural Milestone Engine
 *
 * Core engine for detecting, tracking, and celebrating medication adherence milestones
 * with deep Malaysian cultural intelligence. Integrates traditional celebrations,
 * festival themes, and family-oriented achievements.
 */

import {
  AdherenceRecord,
  AdherenceMilestone,
  StreakData,
  MilestoneType,
  CulturalTheme,
  CulturalInsight,
  ProgressMetrics
} from '../../types/adherence';
import { FestivalEvent, festivalCalendarService } from '../festivals/FestivalCalendarService';

export interface MilestoneDetection {
  milestone: AdherenceMilestone;
  isNewAchievement: boolean;
  triggerCelebration: boolean;
  contextualMessage: string;
  festivalTheme?: FestivalEvent;
}

export interface CulturalMilestoneConfig {
  enableFestivalThemes: boolean;
  enableFamilySharing: boolean;
  culturalCelebrationLevel: 'minimal' | 'moderate' | 'enhanced';
  preferredLanguage: 'en' | 'ms' | 'zh' | 'ta';
  festivalAwareness: boolean;
  traditionalMotifs: boolean;
}

interface MalaysianCulturalThemes {
  [key: string]: {
    name: string;
    nameMs: string;
    nameZh?: string;
    nameTa?: string;
    primaryColor: string;
    secondaryColor: string;
    icon: string;
    pattern: string;
    symbolism: string;
    festivalAssociation?: string;
    messages: {
      en: string;
      ms: string;
      zh?: string;
      ta?: string;
    };
  };
}

const MALAYSIAN_THEMES: MalaysianCulturalThemes = {
  // Traditional Malaysian Motifs
  batik_harmony: {
    name: 'Batik Harmony',
    nameMs: 'Keharmonian Batik',
    nameZh: '峇迪和谐',
    nameTa: 'பாடிக் நல்லிணக்கம்',
    primaryColor: '#B8860B',
    secondaryColor: '#F4A460',
    icon: '🎨',
    pattern: 'batik-waves',
    symbolism: 'Traditional artistry representing patience and dedication',
    messages: {
      en: 'Your dedication flows like beautiful batik patterns!',
      ms: 'Dedikasi anda mengalir seperti corak batik yang indah!',
      zh: '您的坚持如美丽的峇迪图案般流动！',
      ta: 'உங்கள் அர்ப்பணிப்பு அழகான பாடிக் வடிவங்களைப் போல பாய்கிறது!'
    }
  },

  hibiscus_bloom: {
    name: 'Hibiscus Bloom',
    nameMs: 'Kembang Bunga Raya',
    nameZh: '大红花绽放',
    nameTa: 'செம்பருத்தி மலர்ச்சி',
    primaryColor: '#DC143C',
    secondaryColor: '#FFB6C1',
    icon: '🌺',
    pattern: 'floral-mandala',
    symbolism: 'National flower representing strength and beauty',
    messages: {
      en: 'Blooming with health like our national flower!',
      ms: 'Berkembang dengan sihat seperti bunga kebangsaan kita!',
      zh: '像我们的国花一样健康绽放！',
      ta: 'நமது தேசிய மலரைப் போல ஆரோக்கியத்துடன் மலர்கிறீர்கள்!'
    }
  },

  wau_soaring: {
    name: 'Wau Soaring',
    nameMs: 'Wau Terbang Tinggi',
    nameZh: '风筝高飞',
    nameTa: 'காத்தாடி உயர்வு',
    primaryColor: '#4169E1',
    secondaryColor: '#87CEEB',
    icon: '🪁',
    pattern: 'geometric-kite',
    symbolism: 'Traditional kite representing freedom and aspirations',
    messages: {
      en: 'Soaring high like a traditional wau kite!',
      ms: 'Terbang tinggi seperti wau tradisional!',
      zh: '像传统的风筝一样高飞！',
      ta: 'பாரம்பரிய காத்தாடியைப் போல உயரே பறக்கிறீர்கள்!'
    }
  },

  songket_gold: {
    name: 'Songket Gold',
    nameMs: 'Emas Songket',
    nameZh: '松吉金线',
    nameTa: 'சொங்கெட் தங்கம்',
    primaryColor: '#FFD700',
    secondaryColor: '#FFA500',
    icon: '👑',
    pattern: 'golden-threads',
    symbolism: 'Royal textile representing luxury and achievement',
    messages: {
      en: 'Woven with golden threads of success!',
      ms: 'Ditenun dengan benang emas kejayaan!',
      zh: '用成功的金线编织！',
      ta: 'வெற்றியின் பொன் நூல்களால் நெய்யப்பட்டது!'
    }
  },

  peranakan_heritage: {
    name: 'Peranakan Heritage',
    nameMs: 'Warisan Peranakan',
    nameZh: '土生华人传统',
    nameTa: 'பேரனகன் பாரம்பரியம்',
    primaryColor: '#E91E63',
    secondaryColor: '#00BCD4',
    icon: '🏮',
    pattern: 'nyonya-tiles',
    symbolism: 'Multicultural heritage representing harmony',
    messages: {
      en: 'Harmonizing cultures like Peranakan heritage!',
      ms: 'Menyelaraskan budaya seperti warisan Peranakan!',
      zh: '像土生华人传统一样融合文化！',
      ta: 'பேரனகன் பாரம்பரியம் போல கலாச்சாரங்களை இணைத்தல்!'
    }
  },

  // Festival-Specific Themes
  raya_celebration: {
    name: 'Raya Celebration',
    nameMs: 'Perayaan Raya',
    primaryColor: '#228B22',
    secondaryColor: '#FFD700',
    icon: '🌙',
    pattern: 'crescents-and-stars',
    symbolism: 'Islamic celebration of faith and community',
    festivalAssociation: 'eid_fitr',
    messages: {
      en: 'Celebrating success like Hari Raya joy!',
      ms: 'Merayakan kejayaan seperti kegembiraan Hari Raya!',
      zh: '像开斋节一样庆祝成功！',
      ta: 'ஹரி ராய சந்தோஷம் போல வெற்றியைக் கொண்டாடுகிறோம்!'
    }
  },

  cny_prosperity: {
    name: 'CNY Prosperity',
    nameMs: 'Kemakmuran Tahun Baru Cina',
    nameZh: '新年繁荣',
    primaryColor: '#FF0000',
    secondaryColor: '#FFD700',
    icon: '🧧',
    pattern: 'dragon-scales',
    symbolism: 'Chinese New Year prosperity and good fortune',
    festivalAssociation: 'chinese_new_year',
    messages: {
      en: 'Prospering in health like Chinese New Year blessings!',
      ms: 'Makmur dalam kesihatan seperti berkat Tahun Baru Cina!',
      zh: '像新年祝福一样健康繁荣！',
      ta: 'சீன புத்தாண்டு ஆசீர்வாதங்களைப் போல ஆரோக்கியத்தில் வளர்ச்சி!'
    }
  },

  deepavali_light: {
    name: 'Deepavali Light',
    nameMs: 'Cahaya Deepavali',
    nameTa: 'தீபாவளி ஒளி',
    primaryColor: '#FF4500',
    secondaryColor: '#FFD700',
    icon: '🪔',
    pattern: 'oil-lamps',
    symbolism: 'Festival of lights representing triumph over darkness',
    festivalAssociation: 'deepavali',
    messages: {
      en: 'Shining bright like Deepavali lights!',
      ms: 'Bersinar terang seperti lampu Deepavali!',
      zh: '像屠妖节灯光一样闪亮！',
      ta: 'தீபாவளி விளக்குகளைப் போல பிரகாசமாக ஒளிர்கிறீர்கள்!'
    }
  }
};

export class CulturalMilestoneEngine {
  private config: CulturalMilestoneConfig;
  private achievedMilestones: Map<string, AdherenceMilestone> = new Map();
  private festivalCache: Map<string, FestivalEvent[]> = new Map();

  constructor(config?: Partial<CulturalMilestoneConfig>) {
    this.config = {
      enableFestivalThemes: true,
      enableFamilySharing: true,
      culturalCelebrationLevel: 'enhanced',
      preferredLanguage: 'en',
      festivalAwareness: true,
      traditionalMotifs: true,
      ...config
    };
  }

  /**
   * Detect and process milestones from progress metrics
   */
  async detectMilestones(
    progressMetrics: ProgressMetrics,
    patientId: string
  ): Promise<MilestoneDetection[]> {
    const detections: MilestoneDetection[] = [];

    // Get current festival context for themed celebrations
    const currentFestival = await this.getCurrentFestivalContext();

    // Detect streak milestones
    const streakDetections = await this.detectStreakMilestones(
      progressMetrics.streaks,
      patientId,
      currentFestival
    );
    detections.push(...streakDetections);

    // Detect adherence rate milestones
    const adherenceDetections = await this.detectAdherenceMilestones(
      progressMetrics.overallAdherence,
      patientId,
      currentFestival
    );
    detections.push(...adherenceDetections);

    // Detect consistency milestones
    const consistencyDetections = await this.detectConsistencyMilestones(
      progressMetrics,
      patientId,
      currentFestival
    );
    detections.push(...consistencyDetections);

    // Detect cultural pattern milestones
    const culturalDetections = await this.detectCulturalMilestones(
      progressMetrics.culturalInsights,
      patientId,
      currentFestival
    );
    detections.push(...culturalDetections);

    // Detect improvement milestones
    const improvementDetections = await this.detectImprovementMilestones(
      progressMetrics,
      patientId,
      currentFestival
    );
    detections.push(...improvementDetections);

    return detections;
  }

  /**
   * Get cultural theme for milestone type and achievement level
   */
  getCulturalTheme(
    milestoneType: MilestoneType,
    threshold: number,
    festivalContext?: FestivalEvent
  ): CulturalTheme {
    let themeKey: string;

    // Select theme based on festival context if available
    if (festivalContext && this.config.enableFestivalThemes) {
      themeKey = this.getFestivalThemeKey(festivalContext.type);
    } else {
      // Select theme based on milestone type and level
      themeKey = this.getTraditionalThemeKey(milestoneType, threshold);
    }

    const theme = MALAYSIAN_THEMES[themeKey] || MALAYSIAN_THEMES.batik_harmony;

    return {
      name: this.getLocalizedThemeName(theme),
      primaryColor: theme.primaryColor,
      secondaryColor: theme.secondaryColor,
      icon: theme.icon,
      animation: `celebrate_${themeKey}`,
      soundEffect: `sound_${themeKey}`,
      message: {
        en: theme.messages.en,
        ms: theme.messages.ms,
        zh: theme.messages.zh || theme.messages.en,
        ta: theme.messages.ta || theme.messages.en
      }
    };
  }

  /**
   * Create shareable achievement card data
   */
  createShareableAchievement(milestone: AdherenceMilestone): {
    title: string;
    description: string;
    culturalMessage: string;
    visualAssets: {
      background: string;
      pattern: string;
      colors: string[];
    };
    socialText: string;
  } {
    const theme = milestone.culturalTheme;
    const lang = this.config.preferredLanguage;

    return {
      title: milestone.name,
      description: milestone.description,
      culturalMessage: theme.message[lang] || theme.message.en,
      visualAssets: {
        background: theme.primaryColor,
        pattern: theme.animation || 'celebrate_default',
        colors: [theme.primaryColor, theme.secondaryColor]
      },
      socialText: this.generateSocialText(milestone, lang)
    };
  }

  /**
   * Check if milestone is worthy of family notification
   */
  shouldNotifyFamily(milestone: AdherenceMilestone): boolean {
    if (!this.config.enableFamilySharing) return false;

    // Family notification worthy milestones
    const familyWorthyTypes: MilestoneType[] = [
      'streak_days',
      'perfect_week',
      'perfect_month',
      'improvement'
    ];

    return familyWorthyTypes.includes(milestone.type) &&
           milestone.threshold >= this.getFamilyNotificationThreshold(milestone.type);
  }

  /**
   * Get contextual celebration message based on current events
   */
  async getContextualMessage(
    milestone: AdherenceMilestone,
    patientId: string
  ): Promise<string> {
    const lang = this.config.preferredLanguage;
    const baseMessage = milestone.culturalTheme.message[lang] || milestone.culturalTheme.message.en;

    // Check for special contexts
    const isRamadan = await this.isCurrentlyRamadan();
    if (isRamadan && milestone.type === 'streak_days') {
      return this.getRamadanMessage(milestone, lang);
    }

    const currentFestival = await this.getCurrentFestivalContext();
    if (currentFestival) {
      return this.getFestivalMessage(milestone, currentFestival, lang);
    }

    // Check for seasonal context
    const seasonalContext = this.getSeasonalContext();
    if (seasonalContext) {
      return this.getSeasonalMessage(milestone, seasonalContext, lang);
    }

    return baseMessage;
  }

  // Private helper methods

  private async detectStreakMilestones(
    streakData: StreakData,
    patientId: string,
    festivalContext?: FestivalEvent
  ): Promise<MilestoneDetection[]> {
    const detections: MilestoneDetection[] = [];
    const streakThresholds = [3, 7, 14, 21, 30, 60, 90, 180, 365];

    for (const threshold of streakThresholds) {
      if (streakData.currentStreak >= threshold) {
        const milestoneId = `streak_${threshold}_${patientId}`;

        if (!this.achievedMilestones.has(milestoneId)) {
          const milestone = this.createStreakMilestone(threshold, festivalContext);

          const detection: MilestoneDetection = {
            milestone,
            isNewAchievement: true,
            triggerCelebration: true,
            contextualMessage: await this.getContextualMessage(milestone, patientId),
            festivalTheme: festivalContext
          };

          this.achievedMilestones.set(milestoneId, milestone);
          detections.push(detection);
        }
      }
    }

    return detections;
  }

  private async detectAdherenceMilestones(
    adherenceRate: number,
    patientId: string,
    festivalContext?: FestivalEvent
  ): Promise<MilestoneDetection[]> {
    const detections: MilestoneDetection[] = [];
    const adherenceThresholds = [50, 70, 80, 85, 90, 95, 98];

    for (const threshold of adherenceThresholds) {
      if (adherenceRate >= threshold) {
        const milestoneId = `adherence_${threshold}_${patientId}`;

        if (!this.achievedMilestones.has(milestoneId)) {
          const milestone = this.createAdherenceMilestone(threshold, festivalContext);

          const detection: MilestoneDetection = {
            milestone,
            isNewAchievement: true,
            triggerCelebration: threshold >= 80, // Celebrate significant achievements
            contextualMessage: await this.getContextualMessage(milestone, patientId),
            festivalTheme: festivalContext
          };

          this.achievedMilestones.set(milestoneId, milestone);
          detections.push(detection);
        }
      }
    }

    return detections;
  }

  private async detectConsistencyMilestones(
    progressMetrics: ProgressMetrics,
    patientId: string,
    festivalContext?: FestivalEvent
  ): Promise<MilestoneDetection[]> {
    const detections: MilestoneDetection[] = [];

    // Perfect week detection
    const perfectWeek = this.isPerfectWeek(progressMetrics);
    if (perfectWeek) {
      const milestoneId = `perfect_week_${this.getWeekKey()}_${patientId}`;

      if (!this.achievedMilestones.has(milestoneId)) {
        const milestone = this.createPerfectWeekMilestone(festivalContext);

        const detection: MilestoneDetection = {
          milestone,
          isNewAchievement: true,
          triggerCelebration: true,
          contextualMessage: await this.getContextualMessage(milestone, patientId),
          festivalTheme: festivalContext
        };

        this.achievedMilestones.set(milestoneId, milestone);
        detections.push(detection);
      }
    }

    // Perfect month detection
    const perfectMonth = this.isPerfectMonth(progressMetrics);
    if (perfectMonth) {
      const milestoneId = `perfect_month_${this.getMonthKey()}_${patientId}`;

      if (!this.achievedMilestones.has(milestoneId)) {
        const milestone = this.createPerfectMonthMilestone(festivalContext);

        const detection: MilestoneDetection = {
          milestone,
          isNewAchievement: true,
          triggerCelebration: true,
          contextualMessage: await this.getContextualMessage(milestone, patientId),
          festivalTheme: festivalContext
        };

        this.achievedMilestones.set(milestoneId, milestone);
        detections.push(detection);
      }
    }

    return detections;
  }

  private async detectCulturalMilestones(
    culturalInsights: CulturalInsight[],
    patientId: string,
    festivalContext?: FestivalEvent
  ): Promise<MilestoneDetection[]> {
    const detections: MilestoneDetection[] = [];

    // Ramadan completion milestone
    const ramadanInsight = culturalInsights.find(
      insight => insight.type === 'ramadan_adjustment' && insight.adherenceImpact > 80
    );

    if (ramadanInsight) {
      const milestoneId = `ramadan_success_${this.getCurrentYear()}_${patientId}`;

      if (!this.achievedMilestones.has(milestoneId)) {
        const milestone = this.createRamadanMilestone(festivalContext);

        const detection: MilestoneDetection = {
          milestone,
          isNewAchievement: true,
          triggerCelebration: true,
          contextualMessage: await this.getContextualMessage(milestone, patientId),
          festivalTheme: festivalContext
        };

        this.achievedMilestones.set(milestoneId, milestone);
        detections.push(detection);
      }
    }

    // Family support milestone
    const familyInsight = culturalInsights.find(
      insight => insight.type === 'family_support_benefit' && insight.adherenceImpact > 50
    );

    if (familyInsight && familyInsight.occurrences >= 10) {
      const milestoneId = `family_support_${patientId}`;

      if (!this.achievedMilestones.has(milestoneId)) {
        const milestone = this.createFamilySupportMilestone(festivalContext);

        const detection: MilestoneDetection = {
          milestone,
          isNewAchievement: true,
          triggerCelebration: true,
          contextualMessage: await this.getContextualMessage(milestone, patientId),
          festivalTheme: festivalContext
        };

        this.achievedMilestones.set(milestoneId, milestone);
        detections.push(detection);
      }
    }

    return detections;
  }

  private async detectImprovementMilestones(
    progressMetrics: ProgressMetrics,
    patientId: string,
    festivalContext?: FestivalEvent
  ): Promise<MilestoneDetection[]> {
    const detections: MilestoneDetection[] = [];

    // Check for significant improvement patterns
    const improvementPattern = progressMetrics.patterns.find(
      pattern => pattern.type === 'improvement_trend' && pattern.confidence > 0.7
    );

    if (improvementPattern) {
      const milestoneId = `improvement_${this.getMonthKey()}_${patientId}`;

      if (!this.achievedMilestones.has(milestoneId)) {
        const milestone = this.createImprovementMilestone(festivalContext);

        const detection: MilestoneDetection = {
          milestone,
          isNewAchievement: true,
          triggerCelebration: true,
          contextualMessage: await this.getContextualMessage(milestone, patientId),
          festivalTheme: festivalContext
        };

        this.achievedMilestones.set(milestoneId, milestone);
        detections.push(detection);
      }
    }

    return detections;
  }

  private createStreakMilestone(
    threshold: number,
    festivalContext?: FestivalEvent
  ): AdherenceMilestone {
    const theme = this.getCulturalTheme('streak_days', threshold, festivalContext);

    return {
      id: `streak_${threshold}_${Date.now()}`,
      type: 'streak_days',
      threshold,
      name: this.getStreakMilestoneName(threshold),
      description: this.getStreakMilestoneDescription(threshold),
      culturalTheme: theme,
      achievedDate: new Date(),
      celebrationShown: false,
      shareable: threshold >= 7,
      rewardPoints: threshold * 10
    };
  }

  private createAdherenceMilestone(
    threshold: number,
    festivalContext?: FestivalEvent
  ): AdherenceMilestone {
    const theme = this.getCulturalTheme('adherence_rate', threshold, festivalContext);

    return {
      id: `adherence_${threshold}_${Date.now()}`,
      type: 'adherence_rate',
      threshold,
      name: this.getAdherenceMilestoneName(threshold),
      description: this.getAdherenceMilestoneDescription(threshold),
      culturalTheme: theme,
      achievedDate: new Date(),
      celebrationShown: false,
      shareable: threshold >= 80,
      rewardPoints: threshold * 2
    };
  }

  private createPerfectWeekMilestone(festivalContext?: FestivalEvent): AdherenceMilestone {
    const theme = this.getCulturalTheme('perfect_week', 1, festivalContext);

    return {
      id: `perfect_week_${Date.now()}`,
      type: 'perfect_week',
      threshold: 1,
      name: this.getMilestoneNameByLanguage('Perfect Week Champion', {
        ms: 'Juara Minggu Sempurna',
        zh: '完美周冠军',
        ta: 'முழுமையான வார சாம்பியன்'
      }),
      description: this.getMilestoneDescriptionByLanguage(
        'Achieved perfect medication adherence for an entire week',
        {
          ms: 'Mencapai pematuhan ubat yang sempurna untuk seminggu penuh',
          zh: '整周达到完美的药物依从性',
          ta: 'முழு வாரத்திற்கும் முழுமையான மருந்து பின்பற்றல் அடைந்தது'
        }
      ),
      culturalTheme: theme,
      achievedDate: new Date(),
      celebrationShown: false,
      shareable: true,
      rewardPoints: 200
    };
  }

  private createPerfectMonthMilestone(festivalContext?: FestivalEvent): AdherenceMilestone {
    const theme = this.getCulturalTheme('perfect_month', 1, festivalContext);

    return {
      id: `perfect_month_${Date.now()}`,
      type: 'perfect_month',
      threshold: 1,
      name: this.getMilestoneNameByLanguage('Perfect Month Master', {
        ms: 'Sarjana Bulan Sempurna',
        zh: '完美月大师',
        ta: 'முழுமையான மாத நிபுணர்'
      }),
      description: this.getMilestoneDescriptionByLanguage(
        'Achieved perfect medication adherence for an entire month',
        {
          ms: 'Mencapai pematuhan ubat yang sempurna untuk sebulan penuh',
          zh: '整月达到完美的药物依从性',
          ta: 'முழு மாதத்திற்கும் முழுமையான மருந்து பின்பற்றல் அடைந்தது'
        }
      ),
      culturalTheme: theme,
      achievedDate: new Date(),
      celebrationShown: false,
      shareable: true,
      rewardPoints: 1000
    };
  }

  private createRamadanMilestone(festivalContext?: FestivalEvent): AdherenceMilestone {
    const theme = this.getCulturalTheme('consistency', 30, festivalContext);

    return {
      id: `ramadan_${Date.now()}`,
      type: 'consistency',
      threshold: 30,
      name: this.getMilestoneNameByLanguage('Ramadan Resilience', {
        ms: 'Ketahanan Ramadan',
        zh: '斋月坚韧',
        ta: 'ரமலான் தாங்குதல்'
      }),
      description: this.getMilestoneDescriptionByLanguage(
        'Maintained excellent medication adherence throughout Ramadan',
        {
          ms: 'Mengekalkan pematuhan ubat yang cemerlang sepanjang Ramadan',
          zh: '在整个斋月期间保持优秀的药物依从性',
          ta: 'ரமலான் முழுவதும் சிறந்த மருந்து பின்பற்றலைப் பராமரித்தது'
        }
      ),
      culturalTheme: theme,
      achievedDate: new Date(),
      celebrationShown: false,
      shareable: true,
      rewardPoints: 500
    };
  }

  private createFamilySupportMilestone(festivalContext?: FestivalEvent): AdherenceMilestone {
    const theme = this.getCulturalTheme('family_support', 1, festivalContext);

    return {
      id: `family_support_${Date.now()}`,
      type: 'family_support',
      threshold: 1,
      name: this.getMilestoneNameByLanguage('Family Health Guardian', {
        ms: 'Penjaga Kesihatan Keluarga',
        zh: '家庭健康守护者',
        ta: 'குடும்ப ஆரோக்கிய பாதுகாவலர்'
      }),
      description: this.getMilestoneDescriptionByLanguage(
        'Benefited from strong family support in medication management',
        {
          ms: 'Mendapat manfaat daripada sokongan keluarga yang kuat dalam pengurusan ubat',
          zh: '在药物管理方面受益于强大的家庭支持',
          ta: 'மருந்து நிர்வாகத்தில் வலுவான குடும்ப ஆதரவால் பயனடைந்தது'
        }
      ),
      culturalTheme: theme,
      achievedDate: new Date(),
      celebrationShown: false,
      shareable: true,
      rewardPoints: 300
    };
  }

  private createImprovementMilestone(festivalContext?: FestivalEvent): AdherenceMilestone {
    const theme = this.getCulturalTheme('improvement', 1, festivalContext);

    return {
      id: `improvement_${Date.now()}`,
      type: 'improvement',
      threshold: 1,
      name: this.getMilestoneNameByLanguage('Rising Star', {
        ms: 'Bintang Menaik',
        zh: '新星崛起',
        ta: 'உயரும் நட்சத்திரம்'
      }),
      description: this.getMilestoneDescriptionByLanguage(
        'Showed significant improvement in medication adherence',
        {
          ms: 'Menunjukkan peningkatan ketara dalam pematuhan ubat',
          zh: '在药物依从性方面显示出显著改善',
          ta: 'மருந்து பின்பற்றலில் குறிப்பிடத்தக்க முன்னேற்றம் காட்டியது'
        }
      ),
      culturalTheme: theme,
      achievedDate: new Date(),
      celebrationShown: false,
      shareable: true,
      rewardPoints: 250
    };
  }

  // Helper methods for theme selection and localization

  private getFestivalThemeKey(festivalType: string): string {
    switch (festivalType) {
      case 'islamic':
        return 'raya_celebration';
      case 'chinese':
        return 'cny_prosperity';
      case 'hindu':
        return 'deepavali_light';
      default:
        return 'hibiscus_bloom';
    }
  }

  private getTraditionalThemeKey(milestoneType: MilestoneType, threshold: number): string {
    switch (milestoneType) {
      case 'streak_days':
        if (threshold >= 90) return 'songket_gold';
        if (threshold >= 30) return 'hibiscus_bloom';
        if (threshold >= 7) return 'batik_harmony';
        return 'wau_soaring';
      case 'adherence_rate':
        if (threshold >= 95) return 'songket_gold';
        if (threshold >= 85) return 'peranakan_heritage';
        return 'hibiscus_bloom';
      case 'perfect_week':
      case 'perfect_month':
        return 'songket_gold';
      case 'family_support':
        return 'peranakan_heritage';
      default:
        return 'batik_harmony';
    }
  }

  private getLocalizedThemeName(theme: any): string {
    const lang = this.config.preferredLanguage;
    switch (lang) {
      case 'ms':
        return theme.nameMs || theme.name;
      case 'zh':
        return theme.nameZh || theme.name;
      case 'ta':
        return theme.nameTa || theme.name;
      default:
        return theme.name;
    }
  }

  private getMilestoneNameByLanguage(
    englishName: string,
    translations: { ms?: string; zh?: string; ta?: string }
  ): string {
    const lang = this.config.preferredLanguage;
    switch (lang) {
      case 'ms':
        return translations.ms || englishName;
      case 'zh':
        return translations.zh || englishName;
      case 'ta':
        return translations.ta || englishName;
      default:
        return englishName;
    }
  }

  private getMilestoneDescriptionByLanguage(
    englishDescription: string,
    translations: { ms?: string; zh?: string; ta?: string }
  ): string {
    const lang = this.config.preferredLanguage;
    switch (lang) {
      case 'ms':
        return translations.ms || englishDescription;
      case 'zh':
        return translations.zh || englishDescription;
      case 'ta':
        return translations.ta || englishDescription;
      default:
        return englishDescription;
    }
  }

  private getStreakMilestoneName(threshold: number): string {
    if (threshold >= 365) {
      return this.getMilestoneNameByLanguage('Year-Long Legend', {
        ms: 'Legenda Setahun',
        zh: '全年传奇',
        ta: 'ஆண்டு முழுவதும் புராணம்'
      });
    }
    if (threshold >= 180) {
      return this.getMilestoneNameByLanguage('Half-Year Hero', {
        ms: 'Wira Separuh Tahun',
        zh: '半年英雄',
        ta: 'அரை ஆண்டு வீரர்'
      });
    }
    if (threshold >= 90) {
      return this.getMilestoneNameByLanguage('Quarter Champion', {
        ms: 'Juara Suku Tahun',
        zh: '季度冠军',
        ta: 'காலாண்டு சாம்பியன்'
      });
    }
    if (threshold >= 30) {
      return this.getMilestoneNameByLanguage('Monthly Master', {
        ms: 'Sarjana Bulanan',
        zh: '月度大师',
        ta: 'மாதாந்திர நிபுணர்'
      });
    }
    if (threshold >= 14) {
      return this.getMilestoneNameByLanguage('Fortnight Fighter', {
        ms: 'Pejuang Dua Minggu',
        zh: '双周战士',
        ta: 'இரு வார போராளி'
      });
    }
    if (threshold >= 7) {
      return this.getMilestoneNameByLanguage('Weekly Warrior', {
        ms: 'Pendekar Mingguan',
        zh: '周战士',
        ta: 'வாராந்திர போராளி'
      });
    }
    return this.getMilestoneNameByLanguage('Streak Starter', {
      ms: 'Pemula Berturut-turut',
      zh: '连续启动者',
      ta: 'தொடர் தொடக்கக்காரர்'
    });
  }

  private getStreakMilestoneDescription(threshold: number): string {
    return this.getMilestoneDescriptionByLanguage(
      `Achieved ${threshold} consecutive days of medication adherence`,
      {
        ms: `Mencapai ${threshold} hari berturut-turut pematuhan ubat`,
        zh: `达到连续${threshold}天的药物依从性`,
        ta: `${threshold} தொடர் நாட்கள் மருந்து பின்பற்றல் அடைந்தது`
      }
    );
  }

  private getAdherenceMilestoneName(threshold: number): string {
    if (threshold >= 98) {
      return this.getMilestoneNameByLanguage('Near Perfect', {
        ms: 'Hampir Sempurna',
        zh: '近乎完美',
        ta: 'கிட்டத்தட்ட முழுமையான'
      });
    }
    if (threshold >= 95) {
      return this.getMilestoneNameByLanguage('Excellence Achiever', {
        ms: 'Pencapai Kecemerlangan',
        zh: '卓越成就者',
        ta: 'சிறப்பு சாதனையாளர்'
      });
    }
    if (threshold >= 90) {
      return this.getMilestoneNameByLanguage('Consistent Star', {
        ms: 'Bintang Konsisten',
        zh: '一致之星',
        ta: 'நிலையான நட்சத்திரம்'
      });
    }
    if (threshold >= 80) {
      return this.getMilestoneNameByLanguage('Reliable Guardian', {
        ms: 'Penjaga Boleh Dipercayai',
        zh: '可靠守护者',
        ta: 'நம்பகமான பாதுகாவலர்'
      });
    }
    if (threshold >= 70) {
      return this.getMilestoneNameByLanguage('Good Progress', {
        ms: 'Kemajuan Baik',
        zh: '良好进展',
        ta: 'நல்ல முன்னேற்றம்'
      });
    }
    return this.getMilestoneNameByLanguage('Getting Started', {
      ms: 'Bermula',
      zh: '开始',
      ta: 'தொடங்குகிறது'
    });
  }

  private getAdherenceMilestoneDescription(threshold: number): string {
    return this.getMilestoneDescriptionByLanguage(
      `Achieved ${threshold}% medication adherence rate`,
      {
        ms: `Mencapai kadar pematuhan ubat ${threshold}%`,
        zh: `达到${threshold}%的药物依从率`,
        ta: `${threshold}% மருந்து பின்பற்றல் விகிதம் அடைந்தது`
      }
    );
  }

  private generateSocialText(milestone: AdherenceMilestone, lang: string): string {
    const baseTexts = {
      en: `🎉 Just achieved ${milestone.name} in my health journey! Taking care of my health every day. #HealthGoals #MedicationAdherence #Malaysia`,
      ms: `🎉 Baru sahaja mencapai ${milestone.name} dalam perjalanan kesihatan saya! Menjaga kesihatan setiap hari. #MatlamatKesihatan #PematuhanUbat #Malaysia`,
      zh: `🎉 在我的健康之旅中刚刚达到了${milestone.name}！每天照顾我的健康。#健康目标 #药物依从性 #马来西亚`,
      ta: `🎉 எனது ஆரோக்கிய பயணத்தில் ${milestone.name} அடைந்துள்ளேன்! ஒவ்வொரு நாளும் என் ஆரோக்கியத்தைப் பராமரிக்கிறேன். #ஆரோக்கியஇலக்குகள் #மருந்துபின்பற்றல் #மலேசியா`
    };

    return baseTexts[lang as keyof typeof baseTexts] || baseTexts.en;
  }

  private getFamilyNotificationThreshold(milestoneType: MilestoneType): number {
    switch (milestoneType) {
      case 'streak_days':
        return 7;
      case 'adherence_rate':
        return 80;
      case 'perfect_week':
      case 'perfect_month':
        return 1;
      case 'improvement':
        return 1;
      default:
        return 999; // Very high threshold for other types
    }
  }

  // Context and timing helpers

  private async getCurrentFestivalContext(): Promise<FestivalEvent | undefined> {
    try {
      const upcomingFestivals = await festivalCalendarService.getUpcomingFestivals(7);
      return upcomingFestivals[0]; // Return the nearest festival within a week
    } catch (error) {
      console.warn('Failed to get festival context:', error);
      return undefined;
    }
  }

  private async isCurrentlyRamadan(): Promise<boolean> {
    try {
      const ramadanStatus = await festivalCalendarService.isCurrentlyRamadan();
      return ramadanStatus.isRamadan;
    } catch (error) {
      console.warn('Failed to check Ramadan status:', error);
      return false;
    }
  }

  private getRamadanMessage(milestone: AdherenceMilestone, lang: string): string {
    const ramadanMessages = {
      en: `🌙 Subhanallah! Achieved ${milestone.name} during the blessed month of Ramadan!`,
      ms: `🌙 Subhanallah! Mencapai ${milestone.name} dalam bulan Ramadan yang berkat!`,
      zh: `🌙 赞美真主！在神圣的斋月期间达到了${milestone.name}！`,
      ta: `🌙 சுப்ஹானல்லாஹ்! புனித ரமலான் மாதத்தில் ${milestone.name} அடைந்தது!`
    };

    return ramadanMessages[lang as keyof typeof ramadanMessages] || ramadanMessages.en;
  }

  private getFestivalMessage(
    milestone: AdherenceMilestone,
    festival: FestivalEvent,
    lang: string
  ): string {
    const festivalName = this.getFestivalNameByLanguage(festival, lang);

    const festivalMessages = {
      en: `🎊 Celebrating ${milestone.name} during ${festivalName}! Health and happiness together!`,
      ms: `🎊 Merayakan ${milestone.name} semasa ${festivalName}! Kesihatan dan kebahagiaan bersama!`,
      zh: `🎊 在${festivalName}期间庆祝${milestone.name}！健康与快乐同在！`,
      ta: `🎊 ${festivalName} காலத்தில் ${milestone.name} கொண்டாடுகிறோம்! ஆரோக்கியமும் மகிழ்ச்சியும் ஒன்றாக!`
    };

    return festivalMessages[lang as keyof typeof festivalMessages] || festivalMessages.en;
  }

  private getFestivalNameByLanguage(festival: FestivalEvent, lang: string): string {
    switch (lang) {
      case 'ms':
        return festival.nameMs;
      case 'zh':
        return festival.nameZh || festival.name;
      case 'ta':
        return festival.nameTa || festival.name;
      default:
        return festival.name;
    }
  }

  private getSeasonalContext(): string | null {
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) return 'spring';
    if (month >= 5 && month <= 7) return 'summer';
    if (month >= 8 && month <= 10) return 'autumn';
    if (month === 11 || month === 0 || month === 1) return 'winter';
    return null;
  }

  private getSeasonalMessage(
    milestone: AdherenceMilestone,
    season: string,
    lang: string
  ): string {
    // For Malaysia, adapt to monsoon seasons instead
    const isMonsoonsoon = new Date().getMonth() >= 9 || new Date().getMonth() <= 2;

    if (isMonsoonsoon) {
      const monsoonMessages = {
        en: `🌧️ Like the steady monsoon rains, your consistency in ${milestone.name} brings life and growth!`,
        ms: `🌧️ Seperti hujan monsun yang berterusan, konsistensi anda dalam ${milestone.name} membawa kehidupan dan pertumbuhan!`,
        zh: `🌧️ 就像稳定的季风雨一样，您在${milestone.name}中的坚持带来了生命和成长！`,
        ta: `🌧️ நிலையான பருவமழையைப் போல, ${milestone.name} இல் உங்கள் நிலைத்தன்மை வாழ்க்கையையும் வளர்ச்சியையும் கொண்டுவருகிறது!`
      };

      return monsoonMessages[lang as keyof typeof monsoonMessages] || monsoonMessages.en;
    }

    // Default to general message
    return milestone.culturalTheme.message[lang] || milestone.culturalTheme.message.en;
  }

  // Utility methods

  private isPerfectWeek(progressMetrics: ProgressMetrics): boolean {
    // Check if the last 7 days have perfect adherence
    return progressMetrics.overallAdherence >= 95;
  }

  private isPerfectMonth(progressMetrics: ProgressMetrics): boolean {
    // Check if the last 30 days have perfect adherence
    return progressMetrics.overallAdherence >= 95 &&
           progressMetrics.streaks.currentStreak >= 30;
  }

  private getWeekKey(): string {
    const now = new Date();
    const weekNumber = this.getWeekNumber(now);
    return `${now.getFullYear()}_${weekNumber}`;
  }

  private getMonthKey(): string {
    const now = new Date();
    return `${now.getFullYear()}_${now.getMonth()}`;
  }

  private getCurrentYear(): number {
    return new Date().getFullYear();
  }

  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<CulturalMilestoneConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): CulturalMilestoneConfig {
    return { ...this.config };
  }

  /**
   * Clear achieved milestones (for testing or reset)
   */
  clearAchievements(): void {
    this.achievedMilestones.clear();
  }

  /**
   * Get all achieved milestones
   */
  getAchievedMilestones(): AdherenceMilestone[] {
    return Array.from(this.achievedMilestones.values());
  }
}