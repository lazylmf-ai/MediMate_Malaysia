/**
 * Milestone Tracker Component
 *
 * Achievement tracking system with Malaysian cultural themes, streak counters,
 * celebration animations, and shareable achievement cards.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
  Share,
  Animated,
} from 'react-native';
import * as Animatable from 'react-native-animatable';
import Modal from 'react-native-modal';
import { useCulturalTheme, useCulturalStyles } from '@/components/language/ui/CulturalThemeProvider';
import { useTranslation } from '@/i18n/hooks/useTranslation';
import {
  AdherenceMilestone,
  StreakData,
  CulturalTheme,
  MilestoneType,
  CulturalInsight,
} from '@/types/adherence';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface MilestoneTrackerProps {
  patientId: string;
  streakData: StreakData;
  adherenceRate: number;
  culturalInsights: CulturalInsight[];
  milestones?: AdherenceMilestone[];
  onMilestoneAchieved?: (milestone: AdherenceMilestone) => void;
  onMilestoneShare?: (milestone: AdherenceMilestone) => void;
}

interface MalaysianCulturalMilestone {
  id: string;
  name: string;
  nameMs: string;
  description: string;
  descriptionMs: string;
  threshold: number;
  type: MilestoneType;
  culturalTheme: MalaysianCulturalTheme;
  badge: string;
  celebrationAnimation: string;
  shareText: {
    en: string;
    ms: string;
  };
  rewardPoints: number;
}

interface MalaysianCulturalTheme {
  name: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  pattern: string;
  icon: string;
  symbolism: string;
  animation: string;
}

export const MilestoneTracker: React.FC<MilestoneTrackerProps> = ({
  patientId,
  streakData,
  adherenceRate,
  culturalInsights,
  milestones = [],
  onMilestoneAchieved,
  onMilestoneShare,
}) => {
  const { theme, isElderlyMode, culturalContext } = useCulturalTheme();
  const { getCardStyle, getTextStyle, getButtonStyle } = useCulturalStyles();
  const { t, language } = useTranslation();

  const [activeMilestones, setActiveMilestones] = useState<MalaysianCulturalMilestone[]>([]);
  const [achievedMilestones, setAchievedMilestones] = useState<MalaysianCulturalMilestone[]>([]);
  const [celebrationVisible, setCelebrationVisible] = useState(false);
  const [celebratingMilestone, setCelebratingMilestone] = useState<MalaysianCulturalMilestone | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<'all' | MilestoneType>('all');

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const sparkleAnim = useRef(new Animated.Value(0)).current;

  // Malaysian cultural milestone definitions
  const malaysianMilestones: MalaysianCulturalMilestone[] = [
    {
      id: 'hibiscus_7_days',
      name: 'Hibiscus Excellence',
      nameMs: 'Keunggulan Bunga Raya',
      description: '7-day perfect adherence streak',
      descriptionMs: 'Pencapaian sempurna selama 7 hari berturut-turut',
      threshold: 7,
      type: 'streak_days',
      culturalTheme: {
        name: 'hibiscus',
        primaryColor: '#DC143C',
        secondaryColor: '#FFB6C1',
        accentColor: '#8B0000',
        pattern: 'petals',
        icon: '🌺',
        symbolism: 'National flower representing Malaysia\'s beauty and resilience',
        animation: 'blooming',
      },
      badge: '🌺',
      celebrationAnimation: 'hibiscus_bloom',
      shareText: {
        en: 'I achieved the Hibiscus Excellence milestone! 7 days of perfect medication adherence 🌺 #MediMateMY',
        ms: 'Saya mencapai pencapaian Keunggulan Bunga Raya! 7 hari pengambilan ubat yang sempurna 🌺 #MediMateMY',
      },
      rewardPoints: 100,
    },
    {
      id: 'wau_30_days',
      name: 'Wau Dedication',
      nameMs: 'Dedikasi Wau',
      description: '30-day consistency achievement',
      descriptionMs: 'Pencapaian konsisten selama 30 hari',
      threshold: 30,
      type: 'streak_days',
      culturalTheme: {
        name: 'wau',
        primaryColor: '#4169E1',
        secondaryColor: '#87CEEB',
        accentColor: '#191970',
        pattern: 'diamond',
        icon: '🪁',
        symbolism: 'Traditional Malaysian kite representing perseverance and reaching heights',
        animation: 'soaring',
      },
      badge: '🪁',
      celebrationAnimation: 'kite_soar',
      shareText: {
        en: 'Flying high with Wau Dedication! 30 days of medication consistency 🪁 #MediMateMY #PerseverancePays',
        ms: 'Terbang tinggi dengan Dedikasi Wau! 30 hari konsisten mengambil ubat 🪁 #MediMateMY #KetekunanBerhasil',
      },
      rewardPoints: 300,
    },
    {
      id: 'ketupat_ramadan',
      name: 'Ketupat Completion',
      nameMs: 'Kesempurnaan Ketupat',
      description: 'Perfect adherence during Ramadan',
      descriptionMs: 'Pengambilan ubat sempurna semasa Ramadan',
      threshold: 90,
      type: 'adherence_rate',
      culturalTheme: {
        name: 'ketupat',
        primaryColor: '#228B22',
        secondaryColor: '#90EE90',
        accentColor: '#006400',
        pattern: 'weave',
        icon: '🎍',
        symbolism: 'Symbol of completion and spiritual discipline during Ramadan',
        animation: 'weaving',
      },
      badge: '🎍',
      celebrationAnimation: 'ketupat_weave',
      shareText: {
        en: 'Completed Ketupat milestone! Perfect medication adherence during Ramadan 🎍 #Blessed #MediMateMY',
        ms: 'Mencapai pencapaian Ketupat! Pengambilan ubat sempurna semasa Ramadan 🎍 #Diberkati #MediMateMY',
      },
      rewardPoints: 500,
    },
    {
      id: 'batik_pattern',
      name: 'Batik Pattern Master',
      nameMs: 'Ahli Corak Batik',
      description: 'Consistent daily routine for 90 days',
      descriptionMs: 'Rutin harian yang konsisten selama 90 hari',
      threshold: 90,
      type: 'consistency',
      culturalTheme: {
        name: 'batik',
        primaryColor: '#8B4513',
        secondaryColor: '#DEB887',
        accentColor: '#A0522D',
        pattern: 'intricate',
        icon: '🎨',
        symbolism: 'Representing cultural heritage and intricate patterns of consistency',
        animation: 'pattern_forming',
      },
      badge: '🎨',
      celebrationAnimation: 'batik_pattern',
      shareText: {
        en: 'Mastered the Batik Pattern! 90 days of consistent medication routine 🎨 #CulturalPride #MediMateMY',
        ms: 'Menguasai Corak Batik! 90 hari rutin ubat yang konsisten 🎨 #BanggaBudaya #MediMateMY',
      },
      rewardPoints: 900,
    },
    {
      id: 'orangutan_strength',
      name: 'Orangutan Strength',
      nameMs: 'Kekuatan Orang Utan',
      description: 'Overcome 5 missed dose recoveries',
      descriptionMs: 'Mengatasi 5 kali pemulihan dos yang terlepas',
      threshold: 5,
      type: 'recovery',
      culturalTheme: {
        name: 'orangutan',
        primaryColor: '#FF8C00',
        secondaryColor: '#FFE4B5',
        accentColor: '#FF6347',
        pattern: 'natural',
        icon: '🦧',
        symbolism: 'Malaysian wildlife representing strength and resilience in recovery',
        animation: 'swinging',
      },
      badge: '🦧',
      celebrationAnimation: 'orangutan_swing',
      shareText: {
        en: 'Showed Orangutan Strength! Bouncing back from missed doses 5 times 🦧 #Resilience #MediMateMY',
        ms: 'Menunjukkan Kekuatan Orang Utan! Bangkit semula dari dos terlepas 5 kali 🦧 #Daya #MediMateMY',
      },
      rewardPoints: 250,
    },
    {
      id: 'petronas_towers',
      name: 'Twin Towers Achievement',
      nameMs: 'Pencapaian Menara Berkembar',
      description: 'Reach 95% adherence rate',
      descriptionMs: 'Mencapai kadar kepatuhan 95%',
      threshold: 95,
      type: 'adherence_rate',
      culturalTheme: {
        name: 'towers',
        primaryColor: '#C0C0C0',
        secondaryColor: '#E6E6FA',
        accentColor: '#708090',
        pattern: 'twin_peaks',
        icon: '🏢',
        symbolism: 'Iconic Malaysian landmark representing reaching great heights',
        animation: 'tower_rising',
      },
      badge: '🏢',
      celebrationAnimation: 'towers_rising',
      shareText: {
        en: 'Reached Twin Towers height! 95% medication adherence achieved 🏢 #MalaysianPride #MediMateMY',
        ms: 'Mencapai ketinggian Menara Berkembar! 95% kepatuhan ubat dicapai 🏢 #BanggaMalaysia #MediMateMY',
      },
      rewardPoints: 950,
    },
    {
      id: 'hornbill_wisdom',
      name: 'Hornbill Wisdom',
      nameMs: 'Kebijaksanaan Enggang',
      description: 'Help 3 family members with their medication',
      descriptionMs: 'Membantu 3 ahli keluarga dengan ubat mereka',
      threshold: 3,
      type: 'family_support',
      culturalTheme: {
        name: 'hornbill',
        primaryColor: '#FFD700',
        secondaryColor: '#FFF8DC',
        accentColor: '#DAA520',
        pattern: 'feathers',
        icon: '🦜',
        symbolism: 'Sarawak state bird representing wisdom and family care',
        animation: 'flying_together',
      },
      badge: '🦜',
      celebrationAnimation: 'hornbill_flight',
      shareText: {
        en: 'Gained Hornbill Wisdom! Helped 3 family members with their medication 🦜 #FamilyCare #MediMateMY',
        ms: 'Memperoleh Kebijaksanaan Enggang! Membantu 3 ahli keluarga dengan ubat 🦜 #JagaKeluarga #MediMateMY',
      },
      rewardPoints: 300,
    },
    {
      id: 'crescent_moon',
      name: 'Crescent Moon Blessing',
      nameMs: 'Berkat Bulan Sabit',
      description: 'Perfect prayer time coordination for 14 days',
      descriptionMs: 'Koordinasi masa solat sempurna selama 14 hari',
      threshold: 14,
      type: 'consistency',
      culturalTheme: {
        name: 'crescent',
        primaryColor: '#2E8B57',
        secondaryColor: '#98FB98',
        accentColor: '#006400',
        pattern: 'crescent',
        icon: '🌙',
        symbolism: 'Islamic symbol representing spiritual harmony and balance',
        animation: 'moon_phases',
      },
      badge: '🌙',
      celebrationAnimation: 'crescent_glow',
      shareText: {
        en: 'Blessed with Crescent Moon! 14 days of perfect prayer-medication coordination 🌙 #Blessed #MediMateMY',
        ms: 'Diberkati Bulan Sabit! 14 hari koordinasi solat-ubat yang sempurna 🌙 #Diberkati #MediMateMY',
      },
      rewardPoints: 200,
    },
    {
      id: 'unity_1malaysia',
      name: '1Malaysia Unity',
      nameMs: 'Perpaduan 1Malaysia',
      description: 'Coordinate with family across different cultural practices',
      descriptionMs: 'Bekerjasama dengan keluarga merentasi amalan budaya berbeza',
      threshold: 1,
      type: 'family_support',
      culturalTheme: {
        name: 'unity',
        primaryColor: '#FF0000',
        secondaryColor: '#FFFF00',
        accentColor: '#0000FF',
        pattern: 'united_colors',
        icon: '🤝',
        symbolism: 'National unity representing harmony across diverse cultures',
        animation: 'hands_joining',
      },
      badge: '🤝',
      celebrationAnimation: 'unity_circle',
      shareText: {
        en: 'Achieved 1Malaysia Unity! Bridging cultural practices in medication care 🤝 #Unity #MediMateMY',
        ms: 'Mencapai Perpaduan 1Malaysia! Menghubungkan amalan budaya dalam penjagaan ubat 🤝 #Perpaduan #MediMateMY',
      },
      rewardPoints: 150,
    },
    {
      id: 'kampong_spirit',
      name: 'Kampong Spirit',
      nameMs: 'Semangat Kampung',
      description: 'Community support milestone - help neighbors',
      descriptionMs: 'Pencapaian sokongan komuniti - membantu jiran',
      threshold: 1,
      type: 'family_support',
      culturalTheme: {
        name: 'kampong',
        primaryColor: '#8FBC8F',
        secondaryColor: '#F0FFF0',
        accentColor: '#556B2F',
        pattern: 'community',
        icon: '🏘️',
        symbolism: 'Village spirit representing community togetherness and mutual help',
        animation: 'village_gathering',
      },
      badge: '🏘️',
      celebrationAnimation: 'kampong_celebration',
      shareText: {
        en: 'Embraced Kampong Spirit! Helping the community with medication support 🏘️ #CommunityFirst #MediMateMY',
        ms: 'Menyuburkan Semangat Kampung! Membantu komuniti dengan sokongan ubat 🏘️ #KomunitiDahulu #MediMateMY',
      },
      rewardPoints: 200,
    },
  ];

  useEffect(() => {
    initializeMilestones();
  }, [streakData, adherenceRate, culturalInsights]);

  useEffect(() => {
    checkForNewAchievements();
  }, [streakData, adherenceRate]);

  const initializeMilestones = useCallback(() => {
    const active: MalaysianCulturalMilestone[] = [];
    const achieved: MalaysianCulturalMilestone[] = [];

    malaysianMilestones.forEach(milestone => {
      const isAchieved = checkMilestoneAchievement(milestone);
      if (isAchieved) {
        achieved.push(milestone);
      } else {
        active.push(milestone);
      }
    });

    setActiveMilestones(active);
    setAchievedMilestones(achieved);
  }, [streakData, adherenceRate]);

  const checkMilestoneAchievement = (milestone: MalaysianCulturalMilestone): boolean => {
    switch (milestone.type) {
      case 'streak_days':
        return streakData.currentStreak >= milestone.threshold;
      case 'adherence_rate':
        return adherenceRate >= milestone.threshold;
      case 'consistency':
        return streakData.currentStreak >= milestone.threshold && adherenceRate >= 80;
      case 'recovery':
        // This would need to track recovery events in real implementation
        return false;
      case 'family_support':
        // This would need to track family support events in real implementation
        return false;
      default:
        return false;
    }
  };

  const checkForNewAchievements = useCallback(() => {
    const newAchievements: MalaysianCulturalMilestone[] = [];

    activeMilestones.forEach(milestone => {
      if (checkMilestoneAchievement(milestone)) {
        newAchievements.push(milestone);
      }
    });

    if (newAchievements.length > 0) {
      // Celebrate the first new achievement
      celebrateMilestone(newAchievements[0]);

      // Move achieved milestones to achieved list
      setAchievedMilestones(prev => [...prev, ...newAchievements]);
      setActiveMilestones(prev =>
        prev.filter(m => !newAchievements.some(na => na.id === m.id))
      );

      // Notify parent component
      newAchievements.forEach(milestone => {
        const adherenceMilestone: AdherenceMilestone = {
          id: milestone.id,
          type: milestone.type,
          threshold: milestone.threshold,
          name: milestone.name,
          description: milestone.description,
          culturalTheme: {
            name: milestone.culturalTheme.name,
            primaryColor: milestone.culturalTheme.primaryColor,
            secondaryColor: milestone.culturalTheme.secondaryColor,
            icon: milestone.culturalTheme.icon,
            message: {
              en: milestone.shareText.en,
              ms: milestone.shareText.ms,
            },
          },
          achievedDate: new Date(),
          celebrationShown: false,
          shareable: true,
          rewardPoints: milestone.rewardPoints,
        };
        onMilestoneAchieved?.(adherenceMilestone);
      });
    }
  }, [activeMilestones, streakData, adherenceRate, onMilestoneAchieved]);

  const celebrateMilestone = (milestone: MalaysianCulturalMilestone) => {
    setCelebratingMilestone(milestone);
    setCelebrationVisible(true);
    startCelebrationAnimation();
  };

  const startCelebrationAnimation = () => {
    // Pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.2,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();

    // Sparkle animation
    Animated.loop(
      Animated.timing(sparkleAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      })
    ).start();
  };

  const shareMilestone = async (milestone: MalaysianCulturalMilestone) => {
    try {
      const shareText = language === 'ms' ? milestone.shareText.ms : milestone.shareText.en;

      await Share.share({
        message: shareText,
        title: language === 'ms' ? milestone.nameMs : milestone.name,
      });

      onMilestoneShare?.(convertToAdherenceMilestone(milestone));
    } catch (error) {
      console.error('Error sharing milestone:', error);
      Alert.alert(
        t('milestone.share.error'),
        t('milestone.share.errorMessage')
      );
    }
  };

  const convertToAdherenceMilestone = (milestone: MalaysianCulturalMilestone): AdherenceMilestone => ({
    id: milestone.id,
    type: milestone.type,
    threshold: milestone.threshold,
    name: milestone.name,
    description: milestone.description,
    culturalTheme: {
      name: milestone.culturalTheme.name,
      primaryColor: milestone.culturalTheme.primaryColor,
      secondaryColor: milestone.culturalTheme.secondaryColor,
      icon: milestone.culturalTheme.icon,
      message: {
        en: milestone.shareText.en,
        ms: milestone.shareText.ms,
      },
    },
    achievedDate: new Date(),
    celebrationShown: true,
    shareable: true,
    rewardPoints: milestone.rewardPoints,
  });

  const renderCategorySelector = () => {
    const categories: Array<{ key: 'all' | MilestoneType; label: string }> = [
      { key: 'all', label: t('milestone.categories.all') },
      { key: 'streak_days', label: t('milestone.categories.streaks') },
      { key: 'adherence_rate', label: t('milestone.categories.adherence') },
      { key: 'consistency', label: t('milestone.categories.consistency') },
      { key: 'recovery', label: t('milestone.categories.recovery') },
      { key: 'family_support', label: t('milestone.categories.family') },
    ];

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categorySelector}
      >
        {categories.map(category => (
          <TouchableOpacity
            key={category.key}
            style={[
              styles.categoryButton,
              getButtonStyle(selectedCategory === category.key ? 'primary' : 'tertiary'),
              selectedCategory === category.key && {
                backgroundColor: theme.colors.primary,
              },
            ]}
            onPress={() => setSelectedCategory(category.key)}
            accessibilityRole="button"
            accessibilityLabel={category.label}
          >
            <Text
              style={[
                styles.categoryButtonText,
                getTextStyle('body'),
                {
                  color: selectedCategory === category.key
                    ? theme.colors.surface
                    : theme.colors.text,
                },
              ]}
            >
              {category.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  const renderStreakCounter = () => (
    <Animatable.View
      animation="fadeInDown"
      duration={800}
      style={[styles.streakContainer, getCardStyle()]}
    >
      <View style={styles.streakHeader}>
        <Text style={[styles.streakTitle, getTextStyle('heading')]}>
          {t('milestone.streak.title')}
        </Text>
        <Text style={styles.streakEmoji}>🔥</Text>
      </View>

      <View style={styles.streakMetrics}>
        <View style={styles.streakMetric}>
          <Animated.Text
            style={[
              styles.streakValue,
              getTextStyle('display'),
              {
                transform: [{ scale: pulseAnim }],
                color: theme.colors.primary,
              },
            ]}
          >
            {streakData.currentStreak}
          </Animated.Text>
          <Text style={[styles.streakLabel, getTextStyle('caption')]}>
            {t('milestone.streak.current')}
          </Text>
        </View>

        <View style={styles.streakSeparator} />

        <View style={styles.streakMetric}>
          <Text
            style={[
              styles.streakValue,
              getTextStyle('display'),
              { color: theme.colors.accent },
            ]}
          >
            {streakData.longestStreak}
          </Text>
          <Text style={[styles.streakLabel, getTextStyle('caption')]}>
            {t('milestone.streak.longest')}
          </Text>
        </View>
      </View>

      <View style={styles.streakProgress}>
        <Text style={[styles.progressLabel, getTextStyle('caption')]}>
          {t('milestone.streak.nextMilestone')}
        </Text>
        {renderNextMilestoneProgress()}
      </View>
    </Animatable.View>
  );

  const renderNextMilestoneProgress = () => {
    const nextMilestone = activeMilestones
      .filter(m => m.type === 'streak_days')
      .sort((a, b) => a.threshold - b.threshold)[0];

    if (!nextMilestone) {
      return (
        <Text style={[styles.progressText, getTextStyle('body')]}>
          {t('milestone.streak.allAchieved')}
        </Text>
      );
    }

    const progress = streakData.currentStreak / nextMilestone.threshold;
    const remaining = nextMilestone.threshold - streakData.currentStreak;

    return (
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.min(progress * 100, 100)}%`,
                backgroundColor: nextMilestone.culturalTheme.primaryColor,
              },
            ]}
          />
        </View>
        <Text style={[styles.progressText, getTextStyle('caption')]}>
          {remaining} {t('milestone.streak.daysToGo')} {nextMilestone.culturalTheme.icon}
        </Text>
      </View>
    );
  };

  const renderMilestoneCard = (milestone: MalaysianCulturalMilestone, isAchieved: boolean) => (
    <TouchableOpacity
      key={milestone.id}
      style={[
        styles.milestoneCard,
        getCardStyle(),
        isAchieved && styles.achievedCard,
        { borderLeftColor: milestone.culturalTheme.primaryColor },
      ]}
      onPress={() => isAchieved && shareMilestone(milestone)}
      accessibilityRole="button"
      accessibilityLabel={language === 'ms' ? milestone.nameMs : milestone.name}
    >
      <View style={styles.milestoneHeader}>
        <View style={[
          styles.milestoneBadge,
          { backgroundColor: milestone.culturalTheme.secondaryColor },
          isAchieved && { backgroundColor: milestone.culturalTheme.primaryColor },
        ]}>
          <Text style={styles.badgeEmoji}>{milestone.badge}</Text>
        </View>

        <View style={styles.milestoneInfo}>
          <Text style={[
            styles.milestoneName,
            getTextStyle('subheading'),
            isAchieved && { color: milestone.culturalTheme.primaryColor },
          ]}>
            {language === 'ms' ? milestone.nameMs : milestone.name}
          </Text>
          <Text style={[styles.milestoneDescription, getTextStyle('caption')]}>
            {language === 'ms' ? milestone.descriptionMs : milestone.description}
          </Text>
        </View>

        {isAchieved && (
          <TouchableOpacity
            style={styles.shareButton}
            onPress={() => shareMilestone(milestone)}
            accessibilityRole="button"
            accessibilityLabel={t('milestone.share.button')}
          >
            <Text style={styles.shareIcon}>📤</Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.milestoneDetails}>
        <View style={styles.milestoneThreshold}>
          <Text style={[styles.thresholdLabel, getTextStyle('caption')]}>
            {t('milestone.threshold')}:
          </Text>
          <Text style={[
            styles.thresholdValue,
            getTextStyle('body'),
            { color: milestone.culturalTheme.primaryColor },
          ]}>
            {milestone.threshold}
            {milestone.type === 'adherence_rate' ? '%' :
             milestone.type === 'streak_days' ? ' days' : ''}
          </Text>
        </View>

        <View style={styles.milestoneReward}>
          <Text style={[styles.rewardLabel, getTextStyle('caption')]}>
            {t('milestone.reward')}:
          </Text>
          <Text style={[
            styles.rewardValue,
            getTextStyle('body'),
            { color: theme.colors.accent },
          ]}>
            {milestone.rewardPoints} {t('milestone.points')}
          </Text>
        </View>
      </View>

      <View style={styles.culturalSignificance}>
        <Text style={[styles.significanceLabel, getTextStyle('caption')]}>
          {t('milestone.culturalSignificance')}:
        </Text>
        <Text style={[styles.significanceText, getTextStyle('caption')]}>
          {milestone.culturalTheme.symbolism}
        </Text>
      </View>

      {!isAchieved && renderMilestoneProgress(milestone)}
    </TouchableOpacity>
  );

  const renderMilestoneProgress = (milestone: MalaysianCulturalMilestone) => {
    let current = 0;
    let progress = 0;

    switch (milestone.type) {
      case 'streak_days':
        current = streakData.currentStreak;
        progress = current / milestone.threshold;
        break;
      case 'adherence_rate':
        current = adherenceRate;
        progress = current / milestone.threshold;
        break;
      case 'consistency':
        current = Math.min(streakData.currentStreak, adherenceRate);
        progress = current / milestone.threshold;
        break;
      default:
        return null;
    }

    return (
      <View style={styles.milestoneProgressContainer}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${Math.min(progress * 100, 100)}%`,
                backgroundColor: milestone.culturalTheme.primaryColor,
              },
            ]}
          />
        </View>
        <Text style={[styles.progressValue, getTextStyle('caption')]}>
          {current.toFixed(milestone.type === 'adherence_rate' ? 1 : 0)} / {milestone.threshold}
          {milestone.type === 'adherence_rate' ? '%' : ''}
        </Text>
      </View>
    );
  };

  const renderCelebrationModal = () => {
    if (!celebratingMilestone) return null;

    return (
      <Modal
        isVisible={celebrationVisible}
        onBackdropPress={() => setCelebrationVisible(false)}
        style={styles.celebrationModal}
        animationIn="zoomIn"
        animationOut="zoomOut"
        backdropOpacity={0.8}
      >
        <Animatable.View
          animation="bounceIn"
          duration={1000}
          style={[
            styles.celebrationContainer,
            {
              backgroundColor: celebratingMilestone.culturalTheme.secondaryColor,
              borderColor: celebratingMilestone.culturalTheme.primaryColor,
            },
          ]}
        >
          <Animated.View
            style={[
              styles.celebrationBadge,
              {
                transform: [
                  { scale: pulseAnim },
                  { rotate: sparkleAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: ['0deg', '360deg'],
                  })},
                ],
                backgroundColor: celebratingMilestone.culturalTheme.primaryColor,
              },
            ]}
          >
            <Text style={styles.celebrationEmoji}>
              {celebratingMilestone.badge}
            </Text>
          </Animated.View>

          <Text style={[
            styles.celebrationTitle,
            getTextStyle('heading'),
            { color: celebratingMilestone.culturalTheme.primaryColor },
          ]}>
            {t('milestone.celebration.title')}
          </Text>

          <Text style={[
            styles.celebrationMilestoneName,
            getTextStyle('display'),
            { color: celebratingMilestone.culturalTheme.primaryColor },
          ]}>
            {language === 'ms' ? celebratingMilestone.nameMs : celebratingMilestone.name}
          </Text>

          <Text style={[
            styles.celebrationDescription,
            getTextStyle('body'),
          ]}>
            {language === 'ms' ? celebratingMilestone.descriptionMs : celebratingMilestone.description}
          </Text>

          <View style={styles.celebrationActions}>
            <TouchableOpacity
              style={[
                styles.celebrationButton,
                getButtonStyle('secondary'),
                { backgroundColor: celebratingMilestone.culturalTheme.primaryColor },
              ]}
              onPress={() => {
                setCelebrationVisible(false);
                shareMilestone(celebratingMilestone);
              }}
              accessibilityRole="button"
            >
              <Text style={[
                styles.celebrationButtonText,
                getTextStyle('body'),
                { color: theme.colors.surface },
              ]}>
                {t('milestone.celebration.share')} 📤
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.celebrationButton,
                getButtonStyle('tertiary'),
              ]}
              onPress={() => setCelebrationVisible(false)}
              accessibilityRole="button"
            >
              <Text style={[
                styles.celebrationButtonText,
                getTextStyle('body'),
              ]}>
                {t('milestone.celebration.continue')}
              </Text>
            </TouchableOpacity>
          </View>
        </Animatable.View>
      </Modal>
    );
  };

  const filteredActiveMilestones = selectedCategory === 'all'
    ? activeMilestones
    : activeMilestones.filter(m => m.type === selectedCategory);

  const filteredAchievedMilestones = selectedCategory === 'all'
    ? achievedMilestones
    : achievedMilestones.filter(m => m.type === selectedCategory);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {renderStreakCounter()}
      {renderCategorySelector()}

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Achieved Milestones */}
        {filteredAchievedMilestones.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, getTextStyle('heading')]}>
              {t('milestone.achieved.title')} ({filteredAchievedMilestones.length})
            </Text>
            {filteredAchievedMilestones.map(milestone =>
              renderMilestoneCard(milestone, true)
            )}
          </View>
        )}

        {/* Active Milestones */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, getTextStyle('heading')]}>
            {t('milestone.upcoming.title')} ({filteredActiveMilestones.length})
          </Text>
          {filteredActiveMilestones.map(milestone =>
            renderMilestoneCard(milestone, false)
          )}
        </View>
      </ScrollView>

      {renderCelebrationModal()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  streakContainer: {
    margin: 16,
    padding: 20,
  },
  streakHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  streakTitle: {
    fontWeight: 'bold',
    marginRight: 8,
  },
  streakEmoji: {
    fontSize: 24,
  },
  streakMetrics: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  streakMetric: {
    alignItems: 'center',
    flex: 1,
  },
  streakValue: {
    fontSize: 36,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  streakLabel: {
    textAlign: 'center',
    opacity: 0.7,
  },
  streakSeparator: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 20,
  },
  streakProgress: {
    alignItems: 'center',
  },
  progressLabel: {
    marginBottom: 8,
    fontWeight: '600',
  },
  progressContainer: {
    width: '100%',
    alignItems: 'center',
  },
  progressBar: {
    width: '80%',
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    textAlign: 'center',
  },
  categorySelector: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
  },
  categoryButtonText: {
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 16,
    fontWeight: 'bold',
  },
  milestoneCard: {
    marginBottom: 16,
    padding: 16,
    borderLeftWidth: 4,
  },
  achievedCard: {
    opacity: 0.9,
    transform: [{ scale: 1.02 }],
  },
  milestoneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  milestoneBadge: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  badgeEmoji: {
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
    opacity: 0.8,
  },
  shareButton: {
    padding: 8,
  },
  shareIcon: {
    fontSize: 20,
  },
  milestoneDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  milestoneThreshold: {
    flex: 1,
  },
  thresholdLabel: {
    opacity: 0.6,
  },
  thresholdValue: {
    fontWeight: 'bold',
  },
  milestoneReward: {
    flex: 1,
    alignItems: 'flex-end',
  },
  rewardLabel: {
    opacity: 0.6,
  },
  rewardValue: {
    fontWeight: 'bold',
  },
  culturalSignificance: {
    marginBottom: 12,
  },
  significanceLabel: {
    fontWeight: '600',
    marginBottom: 4,
  },
  significanceText: {
    opacity: 0.7,
    fontStyle: 'italic',
  },
  milestoneProgressContainer: {
    alignItems: 'center',
  },
  progressValue: {
    fontWeight: '600',
  },
  celebrationModal: {
    justifyContent: 'center',
    alignItems: 'center',
    margin: 20,
  },
  celebrationContainer: {
    padding: 32,
    borderRadius: 20,
    borderWidth: 3,
    alignItems: 'center',
    maxWidth: screenWidth - 60,
  },
  celebrationBadge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  celebrationEmoji: {
    fontSize: 40,
  },
  celebrationTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  celebrationMilestoneName: {
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  celebrationDescription: {
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  celebrationActions: {
    flexDirection: 'row',
    gap: 12,
  },
  celebrationButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  celebrationButtonText: {
    fontWeight: 'bold',
  },
});

export default MilestoneTracker;