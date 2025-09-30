/**
 * Cultural Celebration Component
 *
 * Malaysian festival-themed celebrations with animated badge displays,
 * cultural motifs, colors, and multi-language congratulations.
 * Supports Hari Raya, CNY, Deepavali, and other Malaysian cultural celebrations.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  TouchableOpacity,
  Share,
} from 'react-native';
import * as Animatable from 'react-native-animatable';
import Modal from 'react-native-modal';
import { useCulturalTheme, useCulturalStyles } from '@/components/language/ui/CulturalThemeProvider';
import { useTranslation } from '@/i18n/hooks/useTranslation';
import { AdherenceMilestone, CulturalInsight } from '@/types/adherence';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface CulturalCelebrationProps {
  milestone: AdherenceMilestone;
  culturalContext?: {
    festival?: string;
    ethnicity?: string;
    region?: string;
    language?: string;
  };
  onCelebrationComplete?: () => void;
  onShare?: (content: string) => void;
  visible: boolean;
}

interface MalaysianFestival {
  id: string;
  name: {
    ms: string;
    en: string;
    zh?: string;
    ta?: string;
  };
  colors: {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
  };
  patterns: string[];
  symbols: string[];
  greetings: {
    ms: string;
    en: string;
    zh?: string;
    ta?: string;
  };
  culturalElements: {
    motifs: string[];
    traditions: string[];
    foods: string[];
    activities: string[];
  };
  animationType: string;
  musicUrl?: string;
}

interface CelebrationAnimation {
  entrance: string;
  badge: string;
  background: string;
  exit: string;
  duration: number;
}

export const CulturalCelebration: React.FC<CulturalCelebrationProps> = ({
  milestone,
  culturalContext,
  onCelebrationComplete,
  onShare,
  visible,
}) => {
  const { theme, culturalContext: themeContext } = useCulturalTheme();
  const { getCardStyle, getTextStyle, getButtonStyle } = useCulturalStyles();
  const { t, language } = useTranslation();

  const [currentFestival, setCurrentFestival] = useState<MalaysianFestival | null>(null);
  const [celebrationStage, setCelebrationStage] = useState<'entrance' | 'main' | 'exit'>('entrance');
  const [showShareOptions, setShowShareOptions] = useState(false);

  // Animation refs
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const sparkleAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const bounceAnim = useRef(new Animated.Value(0)).current;

  // Malaysian festivals and cultural themes
  const malaysianFestivals: MalaysianFestival[] = [
    {
      id: 'hari_raya',
      name: {
        ms: 'Hari Raya Aidilfitri',
        en: 'Eid al-Fitr',
      },
      colors: {
        primary: '#2E8B57', // Islamic green
        secondary: '#FFD700', // Gold
        accent: '#FFFFFF',
        background: 'linear-gradient(135deg, #2E8B57, #90EE90)',
      },
      patterns: ['geometric', 'islamic', 'crescent'],
      symbols: ['🌙', '⭐', '🕌', '🎆', '💫'],
      greetings: {
        ms: 'Selamat Hari Raya Aidilfitri! Maaf zahir dan batin!',
        en: 'Happy Eid al-Fitr! May this blessed day bring you joy!',
      },
      culturalElements: {
        motifs: ['ketupat', 'pelita', 'crescent_moon', 'geometric_patterns'],
        traditions: ['open_house', 'salam', 'ketupat_weaving', 'duit_raya'],
        foods: ['ketupat', 'rendang', 'lemang', 'dodol'],
        activities: ['visiting', 'forgiveness', 'charity', 'family_gathering'],
      },
      animationType: 'islamic_celebration',
    },
    {
      id: 'chinese_new_year',
      name: {
        ms: 'Tahun Baru Cina',
        en: 'Chinese New Year',
        zh: '农历新年',
      },
      colors: {
        primary: '#DC143C', // Chinese red
        secondary: '#FFD700', // Gold
        accent: '#8B0000',
        background: 'linear-gradient(135deg, #DC143C, #FFB6C1)',
      },
      patterns: ['dragon', 'phoenix', 'clouds', 'waves'],
      symbols: ['🐉', '🧨', '🏮', '🎊', '💰'],
      greetings: {
        ms: 'Gong Xi Fa Cai! Semoga tahun baru membawa kemakmuran!',
        en: 'Happy Chinese New Year! May prosperity come your way!',
        zh: '恭喜发财！新年快乐！',
      },
      culturalElements: {
        motifs: ['dragon_dance', 'lanterns', 'fireworks', 'gold_ingots'],
        traditions: ['lion_dance', 'ang_pao', 'reunion_dinner', 'temple_prayers'],
        foods: ['yee_sang', 'nian_gao', 'dumplings', 'mandarin_oranges'],
        activities: ['family_reunion', 'temple_visits', 'lion_dance', 'fireworks'],
      },
      animationType: 'chinese_dragon',
    },
    {
      id: 'deepavali',
      name: {
        ms: 'Deepavali',
        en: 'Diwali',
        ta: 'தீபாவளி',
      },
      colors: {
        primary: '#FF8C00', // Saffron
        secondary: '#FFD700', // Gold
        accent: '#8B0000', // Maroon
        background: 'linear-gradient(135deg, #FF8C00, #FFE4B5)',
      },
      patterns: ['kolam', 'paisley', 'mandala', 'lotus'],
      symbols: ['🪔', '🎆', '🌸', '🕉️', '💎'],
      greetings: {
        ms: 'Selamat Deepavali! Semoga cahaya menang ke atas kegelapan!',
        en: 'Happy Deepavali! May light triumph over darkness!',
        ta: 'தீபாவளி வாழ்த்துக்கள்! ஒளி இருளை வென்றிட வேண்டும்!',
      },
      culturalElements: {
        motifs: ['oil_lamps', 'kolam_patterns', 'lotus_flowers', 'rangoli'],
        traditions: ['oil_lamp_lighting', 'kolam_drawing', 'prayers', 'sweets_sharing'],
        foods: ['muruku', 'laddu', 'payasam', 'halwa'],
        activities: ['prayers', 'lamp_lighting', 'family_gathering', 'sweet_distribution'],
      },
      animationType: 'diya_lighting',
    },
    {
      id: 'christmas',
      name: {
        ms: 'Krismas',
        en: 'Christmas',
      },
      colors: {
        primary: '#DC143C', // Christmas red
        secondary: '#228B22', // Christmas green
        accent: '#FFD700', // Gold
        background: 'linear-gradient(135deg, #DC143C, #228B22)',
      },
      patterns: ['stars', 'snowflakes', 'holly', 'bells'],
      symbols: ['🎄', '⭐', '🔔', '🎁', '❄️'],
      greetings: {
        ms: 'Selamat Hari Krismas! Semoga kegembiraan bersama keluarga!',
        en: 'Merry Christmas! May joy be with your family!',
      },
      culturalElements: {
        motifs: ['christmas_tree', 'stars', 'bells', 'holly'],
        traditions: ['midnight_mass', 'family_dinner', 'gift_giving', 'caroling'],
        foods: ['fruit_cake', 'cookies', 'roast_turkey', 'christmas_pudding'],
        activities: ['church_service', 'family_gathering', 'gift_exchange', 'carol_singing'],
      },
      animationType: 'christmas_sparkle',
    },
    {
      id: 'wesak',
      name: {
        ms: 'Hari Wesak',
        en: 'Wesak Day',
      },
      colors: {
        primary: '#FF8C00', // Saffron
        secondary: '#9370DB', // Purple
        accent: '#FFD700', // Gold
        background: 'linear-gradient(135deg, #FF8C00, #DDA0DD)',
      },
      patterns: ['lotus', 'wheel', 'stupas', 'buddhist'],
      symbols: ['🪷', '☸️', '🕉️', '🙏', '🕯️'],
      greetings: {
        ms: 'Selamat Hari Wesak! Semoga pencerahan dan kedamaian!',
        en: 'Happy Wesak Day! May you find enlightenment and peace!',
      },
      culturalElements: {
        motifs: ['lotus_petals', 'dharma_wheel', 'stupas', 'prayer_flags'],
        traditions: ['temple_prayers', 'meditation', 'dana_giving', 'bathing_buddha'],
        foods: ['vegetarian_meals', 'lotus_seeds', 'herbal_tea', 'sweet_offerings'],
        activities: ['temple_visits', 'meditation', 'charity', 'lantern_release'],
      },
      animationType: 'lotus_bloom',
    },
    {
      id: 'independence_day',
      name: {
        ms: 'Hari Kemerdekaan',
        en: 'Independence Day',
      },
      colors: {
        primary: '#DC143C', // Malaysian red
        secondary: '#000080', // Malaysian blue
        accent: '#FFD700', // Yellow
        background: 'linear-gradient(135deg, #DC143C, #000080, #FFD700)',
      },
      patterns: ['stripes', 'star', 'crescent', 'fourteen_points'],
      symbols: ['🇲🇾', '⭐', '🌙', '🎊', '🎆'],
      greetings: {
        ms: 'Selamat Hari Kemerdekaan! Merdeka! Malaysia Boleh!',
        en: 'Happy Independence Day! Freedom! Malaysia Boleh!',
      },
      culturalElements: {
        motifs: ['jalur_gemilang', 'federal_star', 'crescent_moon', 'fourteen_stripes'],
        traditions: ['flag_raising', 'parade', 'patriotic_songs', 'unity_celebration'],
        foods: ['nasi_lemak', 'satay', 'cendol', 'traditional_kuih'],
        activities: ['parade_watching', 'flag_waving', 'patriotic_singing', 'unity_activities'],
      },
      animationType: 'patriotic_wave',
    },
  ];

  useEffect(() => {
    if (visible) {
      determineFestival();
      startEntranceAnimation();
    }
  }, [visible]);

  const determineFestival = () => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentDay = currentDate.getDate();

    // Determine current or upcoming festival based on date
    let festival: MalaysianFestival;

    if (culturalContext?.festival) {
      festival = malaysianFestivals.find(f => f.id === culturalContext.festival) || malaysianFestivals[0];
    } else {
      // Auto-detect based on current date (simplified logic)
      if (currentMonth === 5 || currentMonth === 6) {
        festival = malaysianFestivals.find(f => f.id === 'hari_raya') || malaysianFestivals[0];
      } else if (currentMonth === 1 || currentMonth === 2) {
        festival = malaysianFestivals.find(f => f.id === 'chinese_new_year') || malaysianFestivals[1];
      } else if (currentMonth === 10 || currentMonth === 11) {
        festival = malaysianFestivals.find(f => f.id === 'deepavali') || malaysianFestivals[2];
      } else if (currentMonth === 12) {
        festival = malaysianFestivals.find(f => f.id === 'christmas') || malaysianFestivals[3];
      } else if (currentMonth === 8) {
        festival = malaysianFestivals.find(f => f.id === 'independence_day') || malaysianFestivals[5];
      } else {
        // Default to a generic celebration or most recent festival
        festival = malaysianFestivals[0];
      }
    }

    setCurrentFestival(festival);
  };

  const startEntranceAnimation = () => {
    setCelebrationStage('entrance');

    // Parallel entrance animations
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 2000,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setCelebrationStage('main');
      startMainAnimation();
    });
  };

  const startMainAnimation = () => {
    // Continuous sparkle and bounce animations
    Animated.loop(
      Animated.sequence([
        Animated.timing(sparkleAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(sparkleAnim, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(bounceAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(bounceAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  const startExitAnimation = () => {
    setCelebrationStage('exit');

    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onCelebrationComplete?.();
    });
  };

  const handleShare = async () => {
    if (!currentFestival) return;

    const greeting = currentFestival.greetings[language as keyof typeof currentFestival.greetings] ||
                    currentFestival.greetings.en;

    const shareContent = `🎉 ${greeting}\n\n` +
                        `${t('celebration.achievement')}: ${milestone.name}\n` +
                        `${milestone.description}\n\n` +
                        `#MediMateMY #${currentFestival.id} #HealthGoals`;

    try {
      await Share.share({
        message: shareContent,
        title: currentFestival.name[language as keyof typeof currentFestival.name] || currentFestival.name.en,
      });

      onShare?.(shareContent);
    } catch (error) {
      console.error('Error sharing celebration:', error);
    }
  };

  const renderCulturalPatterns = () => {
    if (!currentFestival) return null;

    return (
      <View style={styles.patternsContainer}>
        {currentFestival.patterns.map((pattern, index) => (
          <Animated.View
            key={pattern}
            style={[
              styles.patternElement,
              {
                transform: [
                  {
                    rotate: rotateAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', `${(index + 1) * 45}deg`],
                    }),
                  },
                  {
                    scale: sparkleAnim.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [0.8, 1.2, 0.8],
                    }),
                  },
                ],
                opacity: sparkleAnim,
              },
            ]}
          >
            <View style={[
              styles.pattern,
              { backgroundColor: index % 2 === 0 ? currentFestival.colors.primary : currentFestival.colors.secondary },
            ]} />
          </Animated.View>
        ))}
      </View>
    );
  };

  const renderCulturalSymbols = () => {
    if (!currentFestival) return null;

    return (
      <View style={styles.symbolsContainer}>
        {currentFestival.symbols.map((symbol, index) => (
          <Animated.Text
            key={index}
            style={[
              styles.culturalSymbol,
              {
                transform: [
                  {
                    translateY: bounceAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0, -10],
                    }),
                  },
                  {
                    scale: sparkleAnim.interpolate({
                      inputRange: [0, 0.5, 1],
                      outputRange: [1, 1.3, 1],
                    }),
                  },
                ],
                opacity: fadeAnim,
              },
            ]}
          >
            {symbol}
          </Animated.Text>
        ))}
      </View>
    );
  };

  const renderMilestoneBadge = () => (
    <Animated.View
      style={[
        styles.badgeContainer,
        {
          transform: [
            { scale: scaleAnim },
            {
              rotateY: rotateAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0deg', '360deg'],
              }),
            },
          ],
          backgroundColor: currentFestival?.colors.primary || theme.colors.primary,
          borderColor: currentFestival?.colors.secondary || theme.colors.secondary,
          shadowColor: currentFestival?.colors.accent || theme.colors.accent,
        },
      ]}
    >
      <Text style={[
        styles.badgeIcon,
        { color: currentFestival?.colors.accent || theme.colors.surface },
      ]}>
        {milestone.culturalTheme?.icon || '🏆'}
      </Text>

      <Animated.View
        style={[
          styles.sparkleOverlay,
          {
            opacity: sparkleAnim,
            transform: [
              {
                rotate: sparkleAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ['0deg', '180deg'],
                }),
              },
            ],
          },
        ]}
      >
        <Text style={styles.sparkle}>✨</Text>
        <Text style={styles.sparkle}>💫</Text>
        <Text style={styles.sparkle}>⭐</Text>
      </Animated.View>
    </Animated.View>
  );

  const renderCelebrationText = () => {
    if (!currentFestival) return null;

    const greeting = currentFestival.greetings[language as keyof typeof currentFestival.greetings] ||
                    currentFestival.greetings.en;

    return (
      <Animatable.View
        animation="fadeInUp"
        duration={1000}
        delay={500}
        style={styles.textContainer}
      >
        <Text style={[
          styles.festivalGreeting,
          getTextStyle('heading'),
          { color: currentFestival.colors.primary },
        ]}>
          {greeting}
        </Text>

        <Text style={[
          styles.achievementText,
          getTextStyle('display'),
          { color: currentFestival.colors.secondary },
        ]}>
          {t('celebration.congratulations')}
        </Text>

        <Text style={[
          styles.milestoneName,
          getTextStyle('heading'),
          { color: currentFestival.colors.primary },
        ]}>
          {milestone.name}
        </Text>

        <Text style={[
          styles.milestoneDescription,
          getTextStyle('body'),
        ]}>
          {milestone.description}
        </Text>

        <View style={styles.culturalMessage}>
          <Text style={[
            styles.culturalNote,
            getTextStyle('caption'),
            { color: currentFestival.colors.primary },
          ]}>
            {t('celebration.culturalSignificance')}
          </Text>
          <Text style={[
            styles.culturalText,
            getTextStyle('caption'),
          ]}>
            {getCulturalMessage(currentFestival.id)}
          </Text>
        </View>
      </Animatable.View>
    );
  };

  const getCulturalMessage = (festivalId: string): string => {
    const messages: Record<string, Record<string, string>> = {
      hari_raya: {
        ms: 'Seperti ketupat yang dianyam dengan sabar, konsistensi anda dalam mengambil ubat menunjukkan kedisiplinan yang murni.',
        en: 'Like the ketupat woven with patience, your consistency in medication shows pure discipline.',
      },
      chinese_new_year: {
        ms: 'Seperti naga yang membawa kemakmuran, pencapaian anda membawa kesihatan yang berkelanjutan.',
        en: 'Like the dragon bringing prosperity, your achievement brings sustainable health.',
        zh: '像带来繁荣的龙一样，您的成就带来了可持续的健康。',
      },
      deepavali: {
        ms: 'Seperti pelita yang menerangi kegelapan, kedisiplinan anda menyinari jalan ke kesihatan.',
        en: 'Like the diya illuminating darkness, your discipline lights the path to wellness.',
        ta: 'இருளை ஒளிர்விக்கும் தீபம் போல், உங்கள் ஒழுங்குமுறை நல்வாழ்வுக்கான பாதையை ஒளிர்விக்கிறது.',
      },
      christmas: {
        ms: 'Seperti bintang yang membimbing, komitmen anda membimbing ke arah kesihatan yang lebih baik.',
        en: 'Like the guiding star, your commitment guides toward better health.',
      },
      wesak: {
        ms: 'Seperti teratai yang mekar dalam lumpur, kesihatan anda berkembang melalui kedisiplinan.',
        en: 'Like the lotus blooming in mud, your health flourishes through discipline.',
      },
      independence_day: {
        ms: 'Seperti Malaysia yang merdeka, anda telah memerdekakan diri dari masalah kesihatan dengan kedisiplinan.',
        en: 'Like Malaysia gaining independence, you have freed yourself from health issues through discipline.',
      },
    };

    const festivalMessages = messages[festivalId];
    if (!festivalMessages) return '';

    return festivalMessages[language] || festivalMessages.en || '';
  };

  const renderActionButtons = () => (
    <Animatable.View
      animation="fadeInUp"
      duration={1000}
      delay={1000}
      style={styles.actionsContainer}
    >
      <TouchableOpacity
        style={[
          styles.actionButton,
          styles.shareButton,
          getButtonStyle('primary'),
          { backgroundColor: currentFestival?.colors.secondary || theme.colors.secondary },
        ]}
        onPress={handleShare}
        accessibilityRole="button"
        accessibilityLabel={t('celebration.share')}
      >
        <Text style={[
          styles.actionButtonText,
          getTextStyle('body'),
          { color: currentFestival?.colors.primary || theme.colors.surface },
        ]}>
          {t('celebration.share')} 📤
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.actionButton,
          styles.continueButton,
          getButtonStyle('tertiary'),
          { borderColor: currentFestival?.colors.primary || theme.colors.primary },
        ]}
        onPress={startExitAnimation}
        accessibilityRole="button"
        accessibilityLabel={t('celebration.continue')}
      >
        <Text style={[
          styles.actionButtonText,
          getTextStyle('body'),
          { color: currentFestival?.colors.primary || theme.colors.primary },
        ]}>
          {t('celebration.continue')}
        </Text>
      </TouchableOpacity>
    </Animatable.View>
  );

  if (!visible || !currentFestival) return null;

  return (
    <Modal
      isVisible={visible}
      onBackdropPress={startExitAnimation}
      style={styles.modal}
      animationIn="zoomIn"
      animationOut="zoomOut"
      backdropOpacity={0.9}
      backdropColor={currentFestival.colors.background}
    >
      <Animated.View
        style={[
          styles.celebrationContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
            backgroundColor: currentFestival.colors.background,
            borderColor: currentFestival.colors.primary,
          },
        ]}
      >
        {renderCulturalPatterns()}
        {renderCulturalSymbols()}
        {renderMilestoneBadge()}
        {renderCelebrationText()}
        {renderActionButtons()}

        {/* Cultural motifs overlay */}
        <View style={styles.motifsOverlay}>
          {currentFestival.culturalElements.motifs.slice(0, 3).map((motif, index) => (
            <Animated.View
              key={motif}
              style={[
                styles.motifElement,
                {
                  opacity: sparkleAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.3, 0.7],
                  }),
                  transform: [
                    {
                      translateX: bounceAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, index % 2 === 0 ? 5 : -5],
                      }),
                    },
                  ],
                },
              ]}
            >
              <View style={[
                styles.motif,
                {
                  backgroundColor: index % 2 === 0
                    ? currentFestival.colors.secondary
                    : currentFestival.colors.accent,
                },
              ]} />
            </Animated.View>
          ))}
        </View>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modal: {
    justifyContent: 'center',
    alignItems: 'center',
    margin: 0,
  },
  celebrationContainer: {
    width: screenWidth - 40,
    maxHeight: screenHeight - 100,
    borderRadius: 20,
    borderWidth: 3,
    padding: 30,
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  patternsContainer: {
    position: 'absolute',
    top: -50,
    left: -50,
    right: -50,
    bottom: -50,
    justifyContent: 'space-around',
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  patternElement: {
    position: 'absolute',
  },
  pattern: {
    width: 20,
    height: 20,
    borderRadius: 10,
    opacity: 0.3,
  },
  symbolsContainer: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    zIndex: 1,
  },
  culturalSymbol: {
    fontSize: 24,
    opacity: 0.7,
  },
  badgeContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    position: 'relative',
    zIndex: 2,
  },
  badgeIcon: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  sparkleOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-around',
    alignItems: 'center',
    borderRadius: 60,
  },
  sparkle: {
    fontSize: 16,
    position: 'absolute',
  },
  textContainer: {
    alignItems: 'center',
    zIndex: 2,
    marginBottom: 20,
  },
  festivalGreeting: {
    textAlign: 'center',
    fontWeight: 'bold',
    marginBottom: 12,
  },
  achievementText: {
    textAlign: 'center',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  milestoneName: {
    textAlign: 'center',
    fontWeight: 'bold',
    marginBottom: 8,
  },
  milestoneDescription: {
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  culturalMessage: {
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 10,
  },
  culturalNote: {
    fontWeight: '600',
    marginBottom: 4,
  },
  culturalText: {
    textAlign: 'center',
    fontStyle: 'italic',
    lineHeight: 18,
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 16,
    zIndex: 2,
  },
  actionButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    minWidth: 100,
    alignItems: 'center',
  },
  shareButton: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  continueButton: {
    borderWidth: 2,
    backgroundColor: 'transparent',
  },
  actionButtonText: {
    fontWeight: 'bold',
  },
  motifsOverlay: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    zIndex: 1,
  },
  motifElement: {
    opacity: 0.4,
  },
  motif: {
    width: 15,
    height: 15,
    borderRadius: 8,
  },
});

export default CulturalCelebration;