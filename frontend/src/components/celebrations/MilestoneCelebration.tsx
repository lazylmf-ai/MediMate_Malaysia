/**
 * Milestone Celebration Component
 *
 * React component for displaying culturally-aware milestone celebrations
 * with Malaysian themes, animations, and family sharing capabilities.
 * Integrates with the CelebrationOrchestrator for complete celebration lifecycle.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
  Modal,
  Share,
  Vibration,
  Alert,
  ImageBackground,
} from 'react-native';
import {
  CelebrationSequence,
  CelebrationPhase,
  AnimationStep,
  CelebrationOrchestrator
} from '../../services/celebrations/CelebrationOrchestrator';
import { AdherenceMilestone } from '../../types/adherence';
import { useCulturalTheme, useCulturalStyles } from '@/components/language/ui/CulturalThemeProvider';
import { useTranslation } from '@/i18n/hooks/useTranslation';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface MilestoneCelebrationProps {
  sequence: CelebrationSequence | null;
  onCelebrationComplete: (
    celebrationId: string,
    userEngagement: 'dismissed' | 'watched' | 'shared' | 'saved'
  ) => void;
  celebrationOrchestrator: CelebrationOrchestrator;
  isVisible: boolean;
  enableHaptics?: boolean;
  enableSounds?: boolean;
}

interface ParticleProps {
  colors: string[];
  count: number;
  size: number;
}

const MilestoneCelebration: React.FC<MilestoneCelebrationProps> = ({
  sequence,
  onCelebrationComplete,
  celebrationOrchestrator,
  isVisible,
  enableHaptics = true,
  enableSounds = true,
}) => {
  const { theme, isElderlyMode } = useCulturalTheme();
  const { getCardStyle, getTextStyle, getButtonStyle } = useCulturalStyles();
  const { t } = useTranslation();

  // Animation values
  const [containerOpacity] = useState(new Animated.Value(0));
  const [iconScale] = useState(new Animated.Value(0));
  const [badgeScale] = useState(new Animated.Value(0));
  const [titleSlide] = useState(new Animated.Value(-screenWidth));
  const [messageOpacity] = useState(new Animated.Value(0));
  const [shareSlide] = useState(new Animated.Value(screenHeight));
  const [particleAnimations] = useState(
    Array.from({ length: 30 }, () => ({
      x: new Animated.Value(screenWidth / 2),
      y: new Animated.Value(screenHeight / 2),
      opacity: new Animated.Value(0),
      scale: new Animated.Value(0)
    }))
  );

  // State management
  const [currentPhase, setCurrentPhase] = useState<CelebrationPhase | null>(null);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [celebrationStarted, setCelebrationStarted] = useState(false);

  // Refs
  const phaseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  // Start celebration when sequence is provided
  useEffect(() => {
    if (sequence && isVisible && !celebrationStarted) {
      startCelebration();
    }
  }, [sequence, isVisible, celebrationStarted]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (phaseTimeoutRef.current) {
        clearTimeout(phaseTimeoutRef.current);
      }
    };
  }, []);

  const startCelebration = useCallback(() => {
    if (!sequence) return;

    setCelebrationStarted(true);
    startTimeRef.current = Date.now();
    setPhaseIndex(0);

    // Start with first phase
    executePhase(sequence.phases[0], 0);
  }, [sequence]);

  const executePhase = useCallback((phase: CelebrationPhase, index: number) => {
    setCurrentPhase(phase);

    // Execute all animations in this phase
    phase.animations.forEach(animation => {
      executeAnimation(animation);
    });

    // Play sounds if enabled
    if (enableSounds && phase.sounds) {
      phase.sounds.forEach(sound => {
        setTimeout(() => playSound(sound.name), sound.delay);
      });
    }

    // Trigger haptics if enabled
    if (enableHaptics && phase.haptics) {
      phase.haptics.forEach(haptic => {
        setTimeout(() => triggerHaptic(haptic.pattern), haptic.duration);
      });
    }

    // Handle phase-specific logic
    handlePhaseSpecificLogic(phase);

    // Schedule next phase or completion
    phaseTimeoutRef.current = setTimeout(() => {
      const nextIndex = index + 1;
      if (sequence && nextIndex < sequence.phases.length) {
        executePhase(sequence.phases[nextIndex], nextIndex);
        setPhaseIndex(nextIndex);
      } else {
        completeCelebration('watched');
      }
    }, phase.duration);
  }, [sequence, enableSounds, enableHaptics]);

  const executeAnimation = useCallback((animation: AnimationStep) => {
    const animatedValue = getAnimatedValueForElement(animation.element);
    if (!animatedValue) return;

    const animationConfig = {
      toValue: getAnimationTargetValue(animation),
      duration: animation.duration,
      useNativeDriver: shouldUseNativeDriver(animation.animation),
    };

    setTimeout(() => {
      Animated.timing(animatedValue, animationConfig).start();
    }, animation.delay);
  }, []);

  const getAnimatedValueForElement = (element: string): Animated.Value | null => {
    switch (element) {
      case 'celebration-container':
        return containerOpacity;
      case 'cultural-icon':
        return iconScale;
      case 'milestone-badge':
        return badgeScale;
      case 'achievement-title':
        return titleSlide;
      case 'celebration-message':
        return messageOpacity;
      case 'share-options':
        return shareSlide;
      default:
        return null;
    }
  };

  const getAnimationTargetValue = (animation: AnimationStep): number => {
    switch (animation.animation) {
      case 'fadeIn':
      case 'typeWriter':
        return 1;
      case 'fadeOut':
        return 0;
      case 'bounceIn':
      case 'zoomIn':
        return 1;
      case 'slideInFromLeft':
        return 0;
      case 'slideInFromBottom':
        return 0;
      default:
        return 1;
    }
  };

  const shouldUseNativeDriver = (animationType: string): boolean => {
    // Use native driver for transform and opacity animations
    return ['fadeIn', 'fadeOut', 'bounceIn', 'zoomIn', 'slideInFromLeft', 'slideInFromBottom'].includes(animationType);
  };

  const handlePhaseSpecificLogic = useCallback((phase: CelebrationPhase) => {
    switch (phase.type) {
      case 'intro':
        // Trigger particle explosion for intro
        triggerParticleExplosion();
        break;
      case 'sharing':
        setShowShareOptions(true);
        break;
      case 'outro':
        setShowShareOptions(false);
        break;
    }
  }, []);

  const triggerParticleExplosion = useCallback(() => {
    if (!sequence) return;

    const colors = [
      sequence.milestone.culturalTheme.primaryColor,
      sequence.milestone.culturalTheme.secondaryColor
    ];

    particleAnimations.forEach((particle, index) => {
      const angle = (index / particleAnimations.length) * 2 * Math.PI;
      const distance = 100 + Math.random() * 100;
      const finalX = screenWidth / 2 + Math.cos(angle) * distance;
      const finalY = screenHeight / 2 + Math.sin(angle) * distance;

      Animated.parallel([
        Animated.timing(particle.opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(particle.scale, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(particle.x, {
          toValue: finalX,
          duration: 2000,
          useNativeDriver: true,
        }),
        Animated.timing(particle.y, {
          toValue: finalY,
          duration: 2000,
          useNativeDriver: true,
        }),
      ]).start();

      // Fade out particles
      setTimeout(() => {
        Animated.timing(particle.opacity, {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }).start();
      }, 1500);
    });
  }, [sequence, particleAnimations]);

  const playSound = useCallback((soundName: string) => {
    // In a real implementation, this would play the actual sound
    console.log(`Playing sound: ${soundName}`);
  }, []);

  const triggerHaptic = useCallback((pattern: string) => {
    if (!enableHaptics) return;

    switch (pattern) {
      case 'success':
        Vibration.vibrate([0, 100, 50, 100]);
        break;
      case 'celebration':
        Vibration.vibrate([0, 50, 50, 50, 50, 100]);
        break;
      case 'gentle':
        Vibration.vibrate(100);
        break;
      case 'emphasis':
        Vibration.vibrate([0, 100, 50, 200]);
        break;
    }
  }, [enableHaptics]);

  const completeCelebration = useCallback((engagement: 'dismissed' | 'watched' | 'shared' | 'saved') => {
    if (!sequence) return;

    const duration = Date.now() - startTimeRef.current;
    setCelebrationStarted(false);
    setCurrentPhase(null);
    setPhaseIndex(0);
    setShowShareOptions(false);

    // Reset animations
    containerOpacity.setValue(0);
    iconScale.setValue(0);
    badgeScale.setValue(0);
    titleSlide.setValue(-screenWidth);
    messageOpacity.setValue(0);
    shareSlide.setValue(screenHeight);

    onCelebrationComplete(sequence.id, engagement);
  }, [sequence, onCelebrationComplete, containerOpacity, iconScale, badgeScale, titleSlide, messageOpacity, shareSlide]);

  const handleShare = useCallback(async () => {
    if (!sequence) return;

    try {
      const shareableCard = celebrationOrchestrator.createShareableAchievement(sequence.milestone);

      const shareOptions = {
        title: shareableCard.title,
        message: `${shareableCard.description}\n\n${shareableCard.culturalMessage}\n\n${shareableCard.socialText}`,
        url: '', // Would include app link or achievement image
      };

      await Share.share(shareOptions);
      completeCelebration('shared');
    } catch (error) {
      console.error('Error sharing milestone:', error);
      Alert.alert(t('error.shareFailedTitle'), t('error.shareFailedMessage'));
    }
  }, [sequence, celebrationOrchestrator, completeCelebration, t]);

  const handleSave = useCallback(() => {
    if (!sequence) return;

    // Save to device gallery or user achievements
    Alert.alert(
      t('milestones.saveAchievementTitle'),
      t('milestones.saveAchievementMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.save'),
          onPress: () => {
            // Implementation would save to gallery/achievements
            completeCelebration('saved');
          }
        }
      ]
    );
  }, [sequence, completeCelebration, t]);

  const handleDismiss = useCallback(() => {
    completeCelebration('dismissed');
  }, [completeCelebration]);

  const renderCulturalBackground = () => {
    if (!sequence) return null;

    const theme = sequence.milestone.culturalTheme;

    return (
      <View style={[styles.culturalBackground, { backgroundColor: theme.primaryColor }]}>
        <Animated.View
          style={[
            styles.backgroundPattern,
            {
              opacity: containerOpacity.interpolate({
                inputRange: [0, 1],
                outputRange: [0, 0.3]
              })
            }
          ]}
        >
          {/* Cultural pattern would be rendered here */}
          <Text style={[styles.patternText, { color: theme.secondaryColor }]}>
            {theme.icon.repeat(20)}
          </Text>
        </Animated.View>
      </View>
    );
  };

  const renderMilestoneContent = () => {
    if (!sequence) return null;

    const milestone = sequence.milestone;
    const theme = milestone.culturalTheme;

    return (
      <View style={styles.contentContainer}>
        {/* Cultural Icon */}
        <Animated.View
          style={[
            styles.iconContainer,
            {
              transform: [{ scale: iconScale }],
              backgroundColor: theme.secondaryColor,
            }
          ]}
        >
          <Text style={styles.iconText}>{theme.icon}</Text>
        </Animated.View>

        {/* Milestone Badge */}
        <Animated.View
          style={[
            styles.badgeContainer,
            {
              transform: [{ scale: badgeScale }],
              borderColor: theme.primaryColor,
            }
          ]}
        >
          <Text style={[styles.badgeText, { color: theme.primaryColor }]}>
            {milestone.threshold}
          </Text>
          <Text style={[styles.badgeLabel, getTextStyle('caption')]}>
            {milestone.type.replace('_', ' ').toUpperCase()}
          </Text>
        </Animated.View>

        {/* Achievement Title */}
        <Animated.View
          style={[
            styles.titleContainer,
            {
              transform: [{ translateX: titleSlide }]
            }
          ]}
        >
          <Text style={[styles.achievementTitle, getTextStyle('heading'), { color: theme.primaryColor }]}>
            {milestone.name}
          </Text>
        </Animated.View>

        {/* Celebration Message */}
        <Animated.View
          style={[
            styles.messageContainer,
            { opacity: messageOpacity }
          ]}
        >
          <Text style={[styles.celebrationMessage, getTextStyle('body')]}>
            {theme.message.en} {/* Use appropriate language */}
          </Text>
        </Animated.View>

        {/* Reward Points */}
        {milestone.rewardPoints && (
          <View style={[styles.rewardContainer, { backgroundColor: `${theme.primaryColor}20` }]}>
            <Text style={[styles.rewardText, { color: theme.primaryColor }]}>
              +{milestone.rewardPoints} {t('milestones.points')}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderShareOptions = () => {
    if (!showShareOptions || !sequence) return null;

    return (
      <Animated.View
        style={[
          styles.shareContainer,
          {
            transform: [{ translateY: shareSlide }]
          }
        ]}
      >
        <Text style={[styles.shareTitle, getTextStyle('heading')]}>
          {t('milestones.shareAchievement')}
        </Text>

        <View style={styles.shareButtons}>
          <TouchableOpacity
            style={[styles.shareButton, getButtonStyle('primary')]}
            onPress={handleShare}
            accessibilityRole="button"
            accessibilityLabel={t('milestones.shareButton')}
          >
            <Text style={[styles.shareButtonText, getTextStyle('button')]}>
              📱 {t('common.share')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.shareButton, getButtonStyle('secondary')]}
            onPress={handleSave}
            accessibilityRole="button"
            accessibilityLabel={t('milestones.saveButton')}
          >
            <Text style={[styles.shareButtonText, getTextStyle('button')]}>
              💾 {t('common.save')}
            </Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.skipButton}
          onPress={() => setShowShareOptions(false)}
        >
          <Text style={[styles.skipButtonText, getTextStyle('caption')]}>
            {t('common.skip')}
          </Text>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderParticles = () => {
    if (!sequence) return null;

    const colors = [
      sequence.milestone.culturalTheme.primaryColor,
      sequence.milestone.culturalTheme.secondaryColor
    ];

    return (
      <View style={styles.particleContainer}>
        {particleAnimations.map((particle, index) => (
          <Animated.View
            key={index}
            style={[
              styles.particle,
              {
                transform: [
                  { translateX: particle.x },
                  { translateY: particle.y },
                  { scale: particle.scale }
                ],
                opacity: particle.opacity,
                backgroundColor: colors[index % colors.length]
              }
            ]}
          />
        ))}
      </View>
    );
  };

  const renderDismissButton = () => (
    <TouchableOpacity
      style={styles.dismissButton}
      onPress={handleDismiss}
      accessibilityRole="button"
      accessibilityLabel={t('common.close')}
    >
      <Text style={styles.dismissButtonText}>✕</Text>
    </TouchableOpacity>
  );

  if (!sequence || !isVisible) {
    return null;
  }

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="none"
      onRequestClose={handleDismiss}
    >
      <Animated.View
        style={[
          styles.container,
          { opacity: containerOpacity }
        ]}
      >
        {renderCulturalBackground()}
        {renderParticles()}
        {renderDismissButton()}
        {renderMilestoneContent()}
        {renderShareOptions()}
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  culturalBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  backgroundPattern: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  patternText: {
    fontSize: 30,
    opacity: 0.1,
    textAlign: 'center',
    lineHeight: 40,
  },
  contentContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  iconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  iconText: {
    fontSize: 50,
  },
  badgeContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'white',
    marginBottom: 20,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  badgeText: {
    fontSize: 32,
    fontWeight: 'bold',
  },
  badgeLabel: {
    fontSize: 10,
    fontWeight: '600',
    textAlign: 'center',
  },
  titleContainer: {
    marginBottom: 20,
  },
  achievementTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    color: 'white',
  },
  messageContainer: {
    marginBottom: 30,
    paddingHorizontal: 20,
  },
  celebrationMessage: {
    fontSize: 18,
    textAlign: 'center',
    color: 'white',
    lineHeight: 24,
  },
  rewardContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginBottom: 20,
  },
  rewardText: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  shareContainer: {
    position: 'absolute',
    bottom: 50,
    left: 20,
    right: 20,
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  },
  shareTitle: {
    textAlign: 'center',
    marginBottom: 20,
  },
  shareButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
  },
  shareButton: {
    flex: 1,
    marginHorizontal: 5,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  shareButtonText: {
    fontWeight: '600',
  },
  skipButton: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  skipButtonText: {
    opacity: 0.6,
  },
  particleContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  particle: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dismissButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dismissButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default MilestoneCelebration;