/**
 * Achievement Badge Component
 *
 * Displays Malaysian culturally-themed achievement badges with traditional motifs,
 * festival themes, and progressive visual indicators. Supports multiple languages
 * and accessible design for all age groups.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Image,
} from 'react-native';
import { AdherenceMilestone, CulturalTheme } from '../../types/adherence';
import { useCulturalTheme, useCulturalStyles } from '@/components/language/ui/CulturalThemeProvider';
import { useTranslation } from '@/i18n/hooks/useTranslation';

const { width: screenWidth } = Dimensions.get('window');

interface AchievementBadgeProps {
  milestone: AdherenceMilestone;
  size?: 'small' | 'medium' | 'large';
  showProgress?: boolean;
  onPress?: (milestone: AdherenceMilestone) => void;
  animated?: boolean;
  showDetails?: boolean;
  variant?: 'default' | 'compact' | 'detailed';
}

interface BadgeStyle {
  containerSize: number;
  iconSize: number;
  fontSize: number;
  threshold: number;
}

interface CulturalPattern {
  name: string;
  component: React.ReactNode;
  colors: string[];
}

const AchievementBadge: React.FC<AchievementBadgeProps> = ({
  milestone,
  size = 'medium',
  showProgress = true,
  onPress,
  animated = true,
  showDetails = false,
  variant = 'default',
}) => {
  const { theme, isElderlyMode } = useCulturalTheme();
  const { getCardStyle, getTextStyle, getButtonStyle } = useCulturalStyles();
  const { t, currentLanguage } = useTranslation();

  // Animation values
  const [scaleValue] = useState(new Animated.Value(animated ? 0 : 1));
  const [pulseValue] = useState(new Animated.Value(1));
  const [glowOpacity] = useState(new Animated.Value(0));

  // Badge configuration based on size
  const badgeConfig: BadgeStyle = useMemo(() => {
    const configs = {
      small: { containerSize: 60, iconSize: 24, fontSize: 10, threshold: 0.7 },
      medium: { containerSize: 90, iconSize: 36, fontSize: 14, threshold: 0.8 },
      large: { containerSize: 120, iconSize: 48, fontSize: 18, threshold: 0.9 },
    };
    return configs[size];
  }, [size]);

  // Start entry animation
  useEffect(() => {
    if (animated) {
      Animated.sequence([
        Animated.spring(scaleValue, {
          toValue: 1,
          tension: 150,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(glowOpacity, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [animated, scaleValue, glowOpacity]);

  // Pulse animation for special achievements
  useEffect(() => {
    if (milestone.type === 'perfect_week' || milestone.type === 'perfect_month') {
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseValue, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseValue, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulseAnimation.start();

      return () => pulseAnimation.stop();
    }
  }, [milestone.type, pulseValue]);

  const culturalTheme = milestone.culturalTheme;

  const getBadgeElevation = (): number => {
    if (milestone.type === 'perfect_month') return 8;
    if (milestone.type === 'perfect_week') return 6;
    if (milestone.threshold >= 90) return 5;
    if (milestone.threshold >= 30) return 3;
    return 2;
  };

  const getBadgeGradient = (): string[] => {
    const primary = culturalTheme.primaryColor;
    const secondary = culturalTheme.secondaryColor;

    // Create gradient based on achievement level
    if (milestone.threshold >= 90 || milestone.type === 'perfect_month') {
      return [primary, secondary, '#FFD700']; // Gold highlight for top achievements
    }
    if (milestone.threshold >= 60 || milestone.type === 'perfect_week') {
      return [primary, secondary]; // Standard gradient
    }
    return [secondary, primary]; // Reversed for early achievements
  };

  const getCulturalPattern = (): CulturalPattern => {
    const colors = getBadgeGradient();

    const patterns: Record<string, CulturalPattern> = {
      'Batik Harmony': {
        name: 'batik',
        component: <BatikPattern colors={colors} />,
        colors,
      },
      'Hibiscus Bloom': {
        name: 'hibiscus',
        component: <HibiscusPattern colors={colors} />,
        colors,
      },
      'Wau Soaring': {
        name: 'wau',
        component: <WauPattern colors={colors} />,
        colors,
      },
      'Songket Gold': {
        name: 'songket',
        component: <SongketPattern colors={colors} />,
        colors,
      },
      'Peranakan Heritage': {
        name: 'peranakan',
        component: <PeranakanPattern colors={colors} />,
        colors,
      },
      'Raya Celebration': {
        name: 'raya',
        component: <RayaPattern colors={colors} />,
        colors,
      },
      'CNY Prosperity': {
        name: 'cny',
        component: <CNYPattern colors={colors} />,
        colors,
      },
      'Deepavali Light': {
        name: 'deepavali',
        component: <DeepavaliPattern colors={colors} />,
        colors,
      },
    };

    return patterns[culturalTheme.name] || patterns['Batik Harmony'];
  };

  const getMilestoneRarity = (): 'common' | 'rare' | 'epic' | 'legendary' => {
    if (milestone.type === 'perfect_month' || milestone.threshold >= 365) return 'legendary';
    if (milestone.type === 'perfect_week' || milestone.threshold >= 90) return 'epic';
    if (milestone.threshold >= 30) return 'rare';
    return 'common';
  };

  const getRarityIndicator = (): React.ReactNode => {
    const rarity = getMilestoneRarity();
    const indicators = {
      common: '⭐',
      rare: '⭐⭐',
      epic: '⭐⭐⭐',
      legendary: '🏆',
    };

    return (
      <Text style={[styles.rarityIndicator, { fontSize: badgeConfig.fontSize }]}>
        {indicators[rarity]}
      </Text>
    );
  };

  const handlePress = () => {
    if (onPress) {
      // Add press animation
      Animated.sequence([
        Animated.timing(scaleValue, {
          toValue: 0.95,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.spring(scaleValue, {
          toValue: 1,
          tension: 150,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();

      onPress(milestone);
    }
  };

  const renderCompactBadge = () => (
    <View style={[styles.compactContainer, { width: badgeConfig.containerSize }]}>
      <View
        style={[
          styles.compactBadge,
          {
            backgroundColor: culturalTheme.primaryColor,
            width: badgeConfig.containerSize,
            height: badgeConfig.containerSize,
          },
        ]}
      >
        <Text style={[styles.compactIcon, { fontSize: badgeConfig.iconSize }]}>
          {culturalTheme.icon}
        </Text>
        <Text style={[styles.compactThreshold, { fontSize: badgeConfig.fontSize - 2 }]}>
          {milestone.threshold}
        </Text>
      </View>
    </View>
  );

  const renderDetailedBadge = () => (
    <View style={[styles.detailedContainer, getCardStyle()]}>
      <View style={styles.detailedHeader}>
        <View
          style={[
            styles.detailedBadge,
            {
              backgroundColor: culturalTheme.primaryColor,
              width: badgeConfig.containerSize,
              height: badgeConfig.containerSize,
            },
          ]}
        >
          <Text style={[styles.detailedIcon, { fontSize: badgeConfig.iconSize }]}>
            {culturalTheme.icon}
          </Text>
        </View>
        {getRarityIndicator()}
      </View>

      <View style={styles.detailedContent}>
        <Text style={[styles.detailedTitle, getTextStyle('heading')]}>
          {milestone.name}
        </Text>
        <Text style={[styles.detailedDescription, getTextStyle('body')]}>
          {milestone.description}
        </Text>

        {milestone.achievedDate && (
          <Text style={[styles.achievedDate, getTextStyle('caption')]}>
            {t('milestones.achievedOn')}: {milestone.achievedDate.toLocaleDateString()}
          </Text>
        )}

        {milestone.rewardPoints && (
          <View style={[styles.rewardBadge, { backgroundColor: `${culturalTheme.primaryColor}20` }]}>
            <Text style={[styles.rewardText, { color: culturalTheme.primaryColor }]}>
              +{milestone.rewardPoints} {t('milestones.points')}
            </Text>
          </View>
        )}
      </View>
    </View>
  );

  const renderDefaultBadge = () => {
    const pattern = getCulturalPattern();

    return (
      <View style={styles.defaultContainer}>
        {/* Glow effect for special achievements */}
        <Animated.View
          style={[
            styles.glowEffect,
            {
              width: badgeConfig.containerSize + 20,
              height: badgeConfig.containerSize + 20,
              borderRadius: (badgeConfig.containerSize + 20) / 2,
              backgroundColor: culturalTheme.primaryColor,
              opacity: glowOpacity.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.3],
              }),
            },
          ]}
        />

        {/* Cultural pattern background */}
        <View
          style={[
            styles.patternBackground,
            {
              width: badgeConfig.containerSize,
              height: badgeConfig.containerSize,
              borderRadius: badgeConfig.containerSize / 2,
            },
          ]}
        >
          {pattern.component}
        </View>

        {/* Main badge */}
        <Animated.View
          style={[
            styles.badge,
            {
              width: badgeConfig.containerSize,
              height: badgeConfig.containerSize,
              borderRadius: badgeConfig.containerSize / 2,
              backgroundColor: culturalTheme.primaryColor,
              borderColor: culturalTheme.secondaryColor,
              transform: [
                { scale: scaleValue },
                { scale: pulseValue },
              ],
              elevation: getBadgeElevation(),
            },
          ]}
        >
          {/* Cultural icon */}
          <Text style={[styles.icon, { fontSize: badgeConfig.iconSize }]}>
            {culturalTheme.icon}
          </Text>

          {/* Threshold number */}
          <Text style={[styles.threshold, { fontSize: badgeConfig.fontSize }]}>
            {milestone.threshold}
          </Text>

          {/* Type indicator */}
          <Text style={[styles.typeIndicator, { fontSize: badgeConfig.fontSize - 4 }]}>
            {milestone.type.split('_')[0].toUpperCase()}
          </Text>
        </Animated.View>

        {/* Rarity indicator */}
        <View style={styles.rarityContainer}>
          {getRarityIndicator()}
        </View>

        {/* Progress indicator for current achievements */}
        {showProgress && milestone.threshold < 100 && (
          <View style={styles.progressContainer}>
            <View
              style={[
                styles.progressBar,
                { backgroundColor: `${culturalTheme.primaryColor}30` },
              ]}
            >
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(100, (milestone.threshold / 100) * 100)}%`,
                    backgroundColor: culturalTheme.primaryColor,
                  },
                ]}
              />
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderBadge = () => {
    switch (variant) {
      case 'compact':
        return renderCompactBadge();
      case 'detailed':
        return renderDetailedBadge();
      default:
        return renderDefaultBadge();
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={!onPress}
      style={styles.container}
      accessibilityRole="button"
      accessibilityLabel={`${milestone.name}, ${milestone.description}`}
      accessibilityHint={onPress ? t('milestones.tapForDetails') : undefined}
    >
      {renderBadge()}
    </TouchableOpacity>
  );
};

// Cultural Pattern Components
const BatikPattern: React.FC<{ colors: string[] }> = ({ colors }) => (
  <View style={[styles.pattern, { backgroundColor: colors[0] }]}>
    <View style={[styles.batikWave, { borderColor: colors[1] }]} />
    <View style={[styles.batikWave, styles.batikWaveSecond, { borderColor: colors[2] || colors[1] }]} />
  </View>
);

const HibiscusPattern: React.FC<{ colors: string[] }> = ({ colors }) => (
  <View style={[styles.pattern, { backgroundColor: colors[0] }]}>
    {Array.from({ length: 5 }, (_, i) => (
      <View
        key={i}
        style={[
          styles.hibiscusPetal,
          {
            backgroundColor: colors[1],
            transform: [{ rotate: `${i * 72}deg` }],
          },
        ]}
      />
    ))}
  </View>
);

const WauPattern: React.FC<{ colors: string[] }> = ({ colors }) => (
  <View style={[styles.pattern, { backgroundColor: colors[0] }]}>
    <View style={[styles.wauTriangle, { borderBottomColor: colors[1] }]} />
    <View style={[styles.wauTriangle, styles.wauTriangleInverted, { borderTopColor: colors[1] }]} />
  </View>
);

const SongketPattern: React.FC<{ colors: string[] }> = ({ colors }) => (
  <View style={[styles.pattern, { backgroundColor: colors[0] }]}>
    {Array.from({ length: 3 }, (_, i) => (
      <View
        key={i}
        style={[
          styles.songketThread,
          {
            backgroundColor: colors[1],
            top: `${20 + i * 25}%`,
          },
        ]}
      />
    ))}
  </View>
);

const PeranakanPattern: React.FC<{ colors: string[] }> = ({ colors }) => (
  <View style={[styles.pattern, { backgroundColor: colors[0] }]}>
    <View style={[styles.peranakanTile, { backgroundColor: colors[1] }]} />
    <View style={[styles.peranakanTileSmall, { backgroundColor: colors[0] }]} />
  </View>
);

const RayaPattern: React.FC<{ colors: string[] }> = ({ colors }) => (
  <View style={[styles.pattern, { backgroundColor: colors[0] }]}>
    <View style={[styles.rayaCrescent, { borderColor: colors[1] }]} />
    <View style={[styles.rayaStar, { backgroundColor: colors[1] }]} />
  </View>
);

const CNYPattern: React.FC<{ colors: string[] }> = ({ colors }) => (
  <View style={[styles.pattern, { backgroundColor: colors[0] }]}>
    <View style={[styles.cnyDragon, { backgroundColor: colors[1] }]} />
    <View style={[styles.cnyScale, { borderColor: colors[1] }]} />
  </View>
);

const DeepavaliPattern: React.FC<{ colors: string[] }> = ({ colors }) => (
  <View style={[styles.pattern, { backgroundColor: colors[0] }]}>
    <View style={[styles.deepavaliLamp, { backgroundColor: colors[1] }]} />
    <View style={[styles.deepavaliFlame, { backgroundColor: colors[2] || '#FFD700' }]} />
  </View>
);

const styles = StyleSheet.create({
  container: {
    margin: 5,
  },
  defaultContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  glowEffect: {
    position: 'absolute',
  },
  patternBackground: {
    position: 'absolute',
    overflow: 'hidden',
  },
  badge: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  icon: {
    marginBottom: 2,
  },
  threshold: {
    fontWeight: 'bold',
    color: 'white',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  typeIndicator: {
    color: 'white',
    fontWeight: '600',
    opacity: 0.8,
  },
  rarityContainer: {
    position: 'absolute',
    top: -10,
    right: -10,
  },
  rarityIndicator: {
    backgroundColor: 'white',
    borderRadius: 10,
    paddingHorizontal: 4,
    paddingVertical: 2,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  progressContainer: {
    position: 'absolute',
    bottom: -15,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  progressBar: {
    width: '80%',
    height: 4,
    borderRadius: 2,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  compactContainer: {
    alignItems: 'center',
  },
  compactBadge: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 50,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  compactIcon: {
    color: 'white',
  },
  compactThreshold: {
    color: 'white',
    fontWeight: 'bold',
    marginTop: -5,
  },
  detailedContainer: {
    width: screenWidth * 0.8,
    padding: 15,
    margin: 10,
  },
  detailedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  detailedBadge: {
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 50,
    marginRight: 15,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  detailedIcon: {
    color: 'white',
  },
  detailedContent: {
    flex: 1,
  },
  detailedTitle: {
    marginBottom: 8,
    fontWeight: 'bold',
  },
  detailedDescription: {
    marginBottom: 12,
    opacity: 0.8,
  },
  achievedDate: {
    marginBottom: 10,
    opacity: 0.6,
  },
  rewardBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  rewardText: {
    fontSize: 12,
    fontWeight: 'bold',
  },

  // Pattern styles
  pattern: {
    width: '100%',
    height: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  batikWave: {
    position: 'absolute',
    width: '80%',
    height: 2,
    top: '30%',
    left: '10%',
    borderTopWidth: 1,
    borderStyle: 'solid',
  },
  batikWaveSecond: {
    top: '60%',
    transform: [{ scaleX: -1 }],
  },
  hibiscusPetal: {
    position: 'absolute',
    width: 8,
    height: 20,
    borderRadius: 4,
    top: '20%',
    left: '45%',
    transformOrigin: 'bottom',
  },
  wauTriangle: {
    width: 0,
    height: 0,
    backgroundColor: 'transparent',
    borderStyle: 'solid',
    borderLeftWidth: 15,
    borderRightWidth: 15,
    borderBottomWidth: 20,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    position: 'absolute',
    top: '20%',
    left: '25%',
  },
  wauTriangleInverted: {
    borderBottomWidth: 0,
    borderTopWidth: 20,
    borderTopColor: 'red',
    top: '50%',
    left: '25%',
  },
  songketThread: {
    position: 'absolute',
    width: '90%',
    height: 1,
    left: '5%',
  },
  peranakanTile: {
    position: 'absolute',
    width: '60%',
    height: '60%',
    top: '20%',
    left: '20%',
    borderRadius: 4,
  },
  peranakanTileSmall: {
    position: 'absolute',
    width: '30%',
    height: '30%',
    top: '35%',
    left: '35%',
    borderRadius: 2,
  },
  rayaCrescent: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'white',
    top: '25%',
    left: '35%',
  },
  rayaStar: {
    position: 'absolute',
    width: 6,
    height: 6,
    top: '55%',
    left: '55%',
    transform: [{ rotate: '45deg' }],
  },
  cnyDragon: {
    position: 'absolute',
    width: '70%',
    height: 4,
    top: '40%',
    left: '15%',
    borderRadius: 2,
  },
  cnyScale: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1,
    top: '30%',
    left: '40%',
  },
  deepavaliLamp: {
    position: 'absolute',
    width: 12,
    height: 16,
    borderRadius: 6,
    top: '40%',
    left: '40%',
  },
  deepavaliFlame: {
    position: 'absolute',
    width: 6,
    height: 8,
    borderRadius: 3,
    top: '25%',
    left: '43%',
  },
});

export default AchievementBadge;