/**
 * Cultural Milestone Card Component
 *
 * Displays achievement milestones with Malaysian cultural themes,
 * celebrations, and shareable achievement cards. Includes traditional
 * motifs, festival themes, and culturally-appropriate animations.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
  Dimensions,
  Image,
} from 'react-native';
import { useCulturalTheme, useCulturalStyles } from '@/components/language/ui/CulturalThemeProvider';
import { useTranslation } from '@/i18n/hooks/useTranslation';
import {
  StreakData,
  CulturalInsight,
  AdherenceMilestone,
  CulturalTheme,
  MilestoneType,
} from '@/types/adherence';

const { width: screenWidth } = Dimensions.get('window');

interface CulturalMilestoneCardProps {
  streakData: StreakData;
  adherenceRate: number;
  culturalInsights?: CulturalInsight[];
  onMilestoneAchieved?: (milestone: AdherenceMilestone) => void;
  onShareMilestone?: (milestone: AdherenceMilestone) => void;
  showCelebration?: boolean;
}

interface MalaysianCulturalTheme {
  name: string;
  primaryColor: string;
  secondaryColor: string;
  icon: string;
  pattern: string;
  festival?: string;
  symbolism: string;
  messages: {
    en: string;
    ms: string;
    zh?: string;
    ta?: string;
  };
}

const MALAYSIAN_CULTURAL_THEMES: Record<string, MalaysianCulturalTheme> = {
  batik: {
    name: 'Batik Harmony',
    primaryColor: '#B8860B',
    secondaryColor: '#F4A460',
    icon: '🎨',
    pattern: 'batik-waves',
    symbolism: 'Artistic expression and cultural heritage',
    messages: {
      en: 'Your dedication flows like beautiful batik patterns!',
      ms: 'Dedikasi anda mengalir seperti corak batik yang indah!',
      zh: '您的坚持如美丽的峇迪图案般流动！',
      ta: 'உங்கள் அர்ப்பணிப்பு அழகான பாடிக் வடிவங்களைப் போல பாய்கிறது!'
    }
  },
  hibiscus: {
    name: 'Hibiscus Bloom',
    primaryColor: '#DC143C',
    secondaryColor: '#FFB6C1',
    icon: '🌺',
    pattern: 'floral-mandala',
    symbolism: 'National flower representing delicate beauty and strength',
    messages: {
      en: 'Blooming with health like our national flower!',
      ms: 'Berkembang dengan sihat seperti bunga kebangsaan kita!',
      zh: '像我们的国花一样健康绽放！',
      ta: 'நமது தேசிய மலரைப் போல ஆரோக்கியத்துடன் மலர்கிறீர்கள்!'
    }
  },
  wau: {
    name: 'Wau Soaring',
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
  songket: {
    name: 'Songket Gold',
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
  peranakan: {
    name: 'Peranakan Heritage',
    primaryColor: '#E91E63',
    secondaryColor: '#00BCD4',
    icon: '🏮',
    pattern: 'nyonya-tiles',
    symbolism: 'Multicultural heritage and harmony',
    messages: {
      en: 'Harmonizing cultures like Peranakan heritage!',
      ms: 'Menyelaraskan budaya seperti warisan Peranakan!',
      zh: '像土生华人传统一样融合文化！',
      ta: 'பேரனகன் பாரம்பரியம் போல கலாச்சாரங்களை இணைத்தல்!'
    }
  }
};

export const CulturalMilestoneCard: React.FC<CulturalMilestoneCardProps> = ({
  streakData,
  adherenceRate,
  culturalInsights = [],
  onMilestoneAchieved,
  onShareMilestone,
  showCelebration = true,
}) => {
  const { theme, isElderlyMode } = useCulturalTheme();
  const { getCardStyle, getTextStyle, getButtonStyle } = useCulturalStyles();
  const { t, currentLanguage } = useTranslation();

  const [celebrationAnimation] = useState(new Animated.Value(0));
  const [achievedMilestones, setAchievedMilestones] = useState<AdherenceMilestone[]>([]);
  const [showingCelebration, setShowingCelebration] = useState(false);

  // Generate milestones based on current progress
  const availableMilestones = useMemo(() => {
    const milestones: AdherenceMilestone[] = [];

    // Streak milestones
    const streakThresholds = [3, 7, 14, 30, 60, 90];
    streakThresholds.forEach(threshold => {
      if (streakData.currentStreak >= threshold && !achievedMilestones.find(m => m.type === 'streak_days' && m.threshold === threshold)) {
        const culturalThemeKey = getCulturalThemeForMilestone('streak_days', threshold);
        milestones.push({
          id: `streak_${threshold}`,
          type: 'streak_days',
          threshold,
          name: getMilestoneName('streak_days', threshold),
          description: getMilestoneDescription('streak_days', threshold),
          culturalTheme: createCulturalThemeFromMalaysian(culturalThemeKey),
          achievedDate: new Date(),
          celebrationShown: false,
          shareable: true,
          rewardPoints: threshold * 10,
        });
      }
    });

    // Adherence rate milestones
    const adherenceThresholds = [50, 70, 80, 90, 95];
    adherenceThresholds.forEach(threshold => {
      if (adherenceRate >= threshold && !achievedMilestones.find(m => m.type === 'adherence_rate' && m.threshold === threshold)) {
        const culturalThemeKey = getCulturalThemeForMilestone('adherence_rate', threshold);
        milestones.push({
          id: `adherence_${threshold}`,
          type: 'adherence_rate',
          threshold,
          name: getMilestoneName('adherence_rate', threshold),
          description: getMilestoneDescription('adherence_rate', threshold),
          culturalTheme: createCulturalThemeFromMalaysian(culturalThemeKey),
          achievedDate: new Date(),
          celebrationShown: false,
          shareable: true,
          rewardPoints: threshold * 2,
        });
      }
    });

    // Perfect week milestone
    if (isCurrentWeekPerfect(streakData) && !achievedMilestones.find(m => m.type === 'perfect_week')) {
      milestones.push({
        id: 'perfect_week',
        type: 'perfect_week',
        threshold: 1,
        name: getMilestoneName('perfect_week', 1),
        description: getMilestoneDescription('perfect_week', 1),
        culturalTheme: createCulturalThemeFromMalaysian('songket'),
        achievedDate: new Date(),
        celebrationShown: false,
        shareable: true,
        rewardPoints: 100,
      });
    }

    return milestones;
  }, [streakData, adherenceRate, achievedMilestones]);

  // Check for new achievements
  useEffect(() => {
    const newMilestones = availableMilestones.filter(
      milestone => !achievedMilestones.find(achieved => achieved.id === milestone.id)
    );

    if (newMilestones.length > 0) {
      setAchievedMilestones(prev => [...prev, ...newMilestones]);

      // Trigger celebration for the first new milestone
      if (showCelebration && !showingCelebration) {
        triggerCelebration(newMilestones[0]);
      }

      // Notify parent component
      newMilestones.forEach(milestone => {
        onMilestoneAchieved?.(milestone);
      });
    }
  }, [availableMilestones, achievedMilestones, showCelebration, showingCelebration, onMilestoneAchieved]);

  const getCulturalThemeForMilestone = (type: MilestoneType, threshold: number): string => {
    switch (type) {
      case 'streak_days':
        if (threshold >= 90) return 'songket'; // Gold for exceptional achievements
        if (threshold >= 30) return 'hibiscus'; // National flower for significant achievements
        if (threshold >= 7) return 'batik'; // Traditional art for consistent effort
        return 'wau'; // Traditional kite for beginning achievements
      case 'adherence_rate':
        if (threshold >= 90) return 'songket';
        if (threshold >= 80) return 'peranakan';
        return 'hibiscus';
      case 'perfect_week':
        return 'songket';
      default:
        return 'batik';
    }
  };

  const createCulturalThemeFromMalaysian = (themeKey: string): CulturalTheme => {
    const malaysianTheme = MALAYSIAN_CULTURAL_THEMES[themeKey] || MALAYSIAN_CULTURAL_THEMES.batik;

    return {
      name: malaysianTheme.name,
      primaryColor: malaysianTheme.primaryColor,
      secondaryColor: malaysianTheme.secondaryColor,
      icon: malaysianTheme.icon,
      animation: `celebrate_${themeKey}`,
      soundEffect: `sound_${themeKey}`,
      message: {
        en: malaysianTheme.messages.en,
        ms: malaysianTheme.messages.ms,
        zh: malaysianTheme.messages.zh || malaysianTheme.messages.en,
        ta: malaysianTheme.messages.ta || malaysianTheme.messages.en,
      }
    };
  };

  const getMilestoneName = (type: MilestoneType, threshold: number): string => {
    switch (type) {
      case 'streak_days':
        if (threshold >= 90) return t('milestones.streak.legendary');
        if (threshold >= 30) return t('milestones.streak.champion');
        if (threshold >= 7) return t('milestones.streak.warrior');
        return t('milestones.streak.starter');
      case 'adherence_rate':
        if (threshold >= 90) return t('milestones.adherence.perfect');
        if (threshold >= 80) return t('milestones.adherence.excellent');
        return t('milestones.adherence.good');
      case 'perfect_week':
        return t('milestones.perfectWeek.title');
      default:
        return t('milestones.default.title');
    }
  };

  const getMilestoneDescription = (type: MilestoneType, threshold: number): string => {
    switch (type) {
      case 'streak_days':
        return t('milestones.streak.description', { days: threshold });
      case 'adherence_rate':
        return t('milestones.adherence.description', { rate: threshold });
      case 'perfect_week':
        return t('milestones.perfectWeek.description');
      default:
        return t('milestones.default.description');
    }
  };

  const isCurrentWeekPerfect = (streakData: StreakData): boolean => {
    // Simplified check - in real implementation, this would check actual weekly data
    return streakData.currentStreak >= 7 && adherenceRate >= 95;
  };

  const triggerCelebration = useCallback((milestone: AdherenceMilestone) => {
    setShowingCelebration(true);

    // Animate celebration
    Animated.sequence([
      Animated.timing(celebrationAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.delay(2000),
      Animated.timing(celebrationAnimation, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setShowingCelebration(false);
      // Mark celebration as shown
      setAchievedMilestones(prev =>
        prev.map(m => m.id === milestone.id ? { ...m, celebrationShown: true } : m)
      );
    });

    // Show celebration alert
    Alert.alert(
      `🎉 ${milestone.name}`,
      milestone.culturalTheme.message[currentLanguage] || milestone.culturalTheme.message.en,
      [
        { text: t('common.great'), style: 'default' },
        {
          text: t('milestones.share'),
          onPress: () => handleShareMilestone(milestone),
        },
      ]
    );
  }, [celebrationAnimation, currentLanguage, t]);

  const handleShareMilestone = useCallback((milestone: AdherenceMilestone) => {
    if (onShareMilestone) {
      onShareMilestone(milestone);
    } else {
      Alert.alert(
        t('milestones.share'),
        t('milestones.shareDescription'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('milestones.shareConfirm'),
            onPress: () => console.log('Share milestone:', milestone.name),
          },
        ]
      );
    }
  }, [onShareMilestone, t]);

  const renderMilestoneCard = (milestone: AdherenceMilestone) => {
    const malaysianTheme = Object.values(MALAYSIAN_CULTURAL_THEMES).find(
      theme => theme.primaryColor === milestone.culturalTheme.primaryColor
    );

    return (
      <View
        key={milestone.id}
        style={[
          styles.milestoneCard,
          getCardStyle(),
          {
            borderLeftWidth: 4,
            borderLeftColor: milestone.culturalTheme.primaryColor,
            backgroundColor: `${milestone.culturalTheme.primaryColor}08`, // Very light tint
          },
        ]}
      >
        <View style={styles.milestoneHeader}>
          <View style={styles.milestoneIcon}>
            <Text style={styles.iconText}>{milestone.culturalTheme.icon}</Text>
          </View>
          <View style={styles.milestoneInfo}>
            <Text style={[styles.milestoneName, getTextStyle('heading')]}>
              {milestone.name}
            </Text>
            <Text style={[styles.milestoneDescription, getTextStyle('body')]}>
              {milestone.description}
            </Text>
            {malaysianTheme && (
              <Text style={[styles.culturalSymbolism, getTextStyle('caption')]}>
                {malaysianTheme.symbolism}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.milestoneFooter}>
          <View style={styles.rewardPoints}>
            <Text style={[styles.pointsLabel, getTextStyle('caption')]}>
              {t('milestones.points')}
            </Text>
            <Text style={[styles.pointsValue, getTextStyle('body'), { color: milestone.culturalTheme.primaryColor }]}>
              +{milestone.rewardPoints}
            </Text>
          </View>

          {milestone.shareable && (
            <TouchableOpacity
              style={[
                styles.shareButton,
                getButtonStyle('tertiary'),
                { borderColor: milestone.culturalTheme.primaryColor },
              ]}
              onPress={() => handleShareMilestone(milestone)}
              accessibilityRole="button"
              accessibilityLabel={t('milestones.shareButton')}
            >
              <Text
                style={[
                  styles.shareButtonText,
                  getTextStyle('caption'),
                  { color: milestone.culturalTheme.primaryColor },
                ]}
              >
                {t('milestones.share')}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {milestone.achievedDate && (
          <Text style={[styles.achievedDate, getTextStyle('caption')]}>
            {t('milestones.achievedOn')}: {milestone.achievedDate.toLocaleDateString()}
          </Text>
        )}
      </View>
    );
  };

  const renderProgressToNextMilestone = () => {
    const nextStreakMilestone = [7, 14, 30, 60, 90].find(threshold => threshold > streakData.currentStreak);
    const nextAdherenceMilestone = [70, 80, 90, 95].find(threshold => threshold > adherenceRate);

    return (
      <View style={[styles.progressSection, getCardStyle()]}>
        <Text style={[styles.progressTitle, getTextStyle('heading')]}>
          {t('milestones.nextGoals')}
        </Text>

        {nextStreakMilestone && (
          <View style={styles.progressItem}>
            <Text style={[styles.progressLabel, getTextStyle('body')]}>
              {t('milestones.nextStreak', { days: nextStreakMilestone })}
            </Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${(streakData.currentStreak / nextStreakMilestone) * 100}%`,
                    backgroundColor: theme.colors.primary,
                  },
                ]}
              />
            </View>
            <Text style={[styles.progressText, getTextStyle('caption')]}>
              {streakData.currentStreak} / {nextStreakMilestone} {t('common.days')}
            </Text>
          </View>
        )}

        {nextAdherenceMilestone && (
          <View style={styles.progressItem}>
            <Text style={[styles.progressLabel, getTextStyle('body')]}>
              {t('milestones.nextAdherence', { rate: nextAdherenceMilestone })}
            </Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${(adherenceRate / nextAdherenceMilestone) * 100}%`,
                    backgroundColor: theme.colors.success,
                  },
                ]}
              />
            </View>
            <Text style={[styles.progressText, getTextStyle('caption')]}>
              {Math.round(adherenceRate)}% / {nextAdherenceMilestone}%
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderCelebrationOverlay = () => {
    if (!showingCelebration) return null;

    return (
      <Animated.View
        style={[
          styles.celebrationOverlay,
          {
            opacity: celebrationAnimation,
            transform: [
              {
                scale: celebrationAnimation.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.5, 1],
                }),
              },
            ],
          },
        ]}
      >
        <Text style={styles.celebrationText}>🎉</Text>
        <Text style={[styles.celebrationMessage, getTextStyle('heading')]}>
          {t('milestones.congratulations')}
        </Text>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      {achievedMilestones.length > 0 && (
        <View style={styles.achievedSection}>
          <Text style={[styles.sectionTitle, getTextStyle('heading')]}>
            {t('milestones.achieved')}
          </Text>
          {achievedMilestones.slice(-3).map(renderMilestoneCard)}
        </View>
      )}

      {renderProgressToNextMilestone()}

      {renderCelebrationOverlay()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  achievedSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    marginBottom: 12,
  },
  milestoneCard: {
    marginBottom: 12,
    padding: 16,
  },
  milestoneHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  milestoneIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: '#F5F5F5',
  },
  iconText: {
    fontSize: 24,
  },
  milestoneInfo: {
    flex: 1,
  },
  milestoneName: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  milestoneDescription: {
    marginBottom: 4,
  },
  culturalSymbolism: {
    fontStyle: 'italic',
    opacity: 0.7,
  },
  milestoneFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  rewardPoints: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pointsLabel: {
    marginRight: 4,
  },
  pointsValue: {
    fontWeight: 'bold',
  },
  shareButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  shareButtonText: {
    fontWeight: '600',
  },
  achievedDate: {
    textAlign: 'right',
    opacity: 0.6,
  },
  progressSection: {
    padding: 16,
  },
  progressTitle: {
    marginBottom: 16,
  },
  progressItem: {
    marginBottom: 16,
  },
  progressLabel: {
    marginBottom: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginBottom: 4,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    textAlign: 'right',
  },
  celebrationOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    zIndex: 1000,
  },
  celebrationText: {
    fontSize: 80,
    marginBottom: 20,
  },
  celebrationMessage: {
    color: '#FFFFFF',
    textAlign: 'center',
    fontSize: 24,
  },
});

export default CulturalMilestoneCard;