/**
 * Achievement Modal Component
 *
 * Celebration modal that appears when a user earns a new achievement.
 * Features celebration animation, badge display, and sharing options.
 * Designed with accessibility and elderly-friendly interactions.
 */

import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import type { Badge } from '@/types/education';
import { useAppSelector } from '@/store/hooks';
import { COLORS, TYPOGRAPHY } from '@/constants/config';

interface AchievementModalProps {
  badge: Badge | null;
  visible: boolean;
  onClose: () => void;
  onShare?: (badge: Badge) => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const AchievementModal: React.FC<AchievementModalProps> = ({
  badge,
  visible,
  onClose,
  onShare,
}) => {
  const { profile } = useAppSelector((state) => state.cultural);
  const language = profile?.language || 'en';

  // Animation values
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const confettiAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && badge) {
      // Reset animations
      scaleAnim.setValue(0);
      opacityAnim.setValue(0);
      confettiAnim.setValue(0);

      // Start celebration animations
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(confettiAnim, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, badge]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const handleShare = () => {
    if (badge && onShare) {
      onShare(badge);
    }
  };

  if (!badge) {
    return null;
  }

  // Confetti elements
  const confettiElements = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    left: Math.random() * SCREEN_WIDTH,
    delay: Math.random() * 500,
    color: [COLORS.primary, COLORS.secondary, COLORS.accent, COLORS.success][
      Math.floor(Math.random() * 4)
    ],
  }));

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={handleClose}>
      <View style={styles.overlay}>
        {/* Confetti Animation */}
        {confettiElements.map((item) => (
          <Animated.View
            key={item.id}
            style={[
              styles.confetti,
              {
                left: item.left,
                backgroundColor: item.color,
                transform: [
                  {
                    translateY: confettiAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [-50, 800],
                    }),
                  },
                  {
                    rotate: confettiAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0deg', '720deg'],
                    }),
                  },
                ],
                opacity: confettiAnim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [1, 1, 0],
                }),
              },
            ]}
          />
        ))}

        {/* Modal Content */}
        <Animated.View
          style={[
            styles.modal,
            {
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          {/* Celebration Title */}
          <Text style={styles.celebrationTitle}>
            {language === 'ms' && '🎉 Tahniah! 🎉'}
            {language === 'en' && '🎉 Congratulations! 🎉'}
            {language === 'zh' && '🎉 恭喜您! 🎉'}
            {language === 'ta' && '🎉 வாழ்த்துக்கள்! 🎉'}
          </Text>

          {/* Badge Icon */}
          <View style={styles.badgeIconContainer}>
            <Text style={styles.badgeIcon}>{badge.icon}</Text>
          </View>

          {/* Badge Name */}
          <Text style={styles.badgeName}>{badge.name[language]}</Text>

          {/* Badge Description */}
          <Text style={styles.badgeDescription}>{badge.description[language]}</Text>

          {/* Achievement Message */}
          <Text style={styles.achievementMessage}>
            {language === 'ms' && 'Anda telah membuka pencapaian baru!'}
            {language === 'en' && 'You have unlocked a new achievement!'}
            {language === 'zh' && '您已解锁新成就！'}
            {language === 'ta' && 'நீங்கள் புதிய சாதனையைத் திறந்துள்ளீர்கள்!'}
          </Text>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            {/* Share Button (placeholder for Task 35) */}
            {onShare && (
              <TouchableOpacity
                style={[styles.button, styles.shareButton]}
                onPress={handleShare}
                accessibilityLabel={
                  language === 'ms'
                    ? 'Kongsi dengan Keluarga'
                    : language === 'en'
                    ? 'Share with Family'
                    : language === 'zh'
                    ? '与家人分享'
                    : 'குடும்பத்துடன் பகிரவும்'
                }
              >
                <Text style={styles.shareButtonText}>
                  {language === 'ms' && '👨‍👩‍👧‍👦 Kongsi dengan Keluarga'}
                  {language === 'en' && '👨‍👩‍👧‍👦 Share with Family'}
                  {language === 'zh' && '👨‍👩‍👧‍👦 与家人分享'}
                  {language === 'ta' && '👨‍👩‍👧‍👦 குடும்பத்துடன் பகிரவும்'}
                </Text>
              </TouchableOpacity>
            )}

            {/* Continue Learning Button */}
            <TouchableOpacity
              style={[styles.button, styles.continueButton]}
              onPress={handleClose}
              accessibilityLabel={
                language === 'ms'
                  ? 'Teruskan Pembelajaran'
                  : language === 'en'
                  ? 'Continue Learning'
                  : language === 'zh'
                  ? '继续学习'
                  : 'தொடர்ந்து கற்கவும்'
              }
            >
              <Text style={styles.continueButtonText}>
                {language === 'ms' && 'Teruskan Pembelajaran'}
                {language === 'en' && 'Continue Learning'}
                {language === 'zh' && '继续学习'}
                {language === 'ta' && 'தொடர்ந்து கற்கவும்'}
              </Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  confetti: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  modal: {
    backgroundColor: COLORS.white,
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  celebrationTitle: {
    fontSize: TYPOGRAPHY.fontSizes['2xl'],
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: COLORS.primary,
    marginBottom: 24,
    textAlign: 'center',
  },
  badgeIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  badgeIcon: {
    fontSize: 64,
  },
  badgeName: {
    fontSize: TYPOGRAPHY.fontSizes['2xl'],
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: COLORS.gray[900],
    marginBottom: 12,
    textAlign: 'center',
  },
  badgeDescription: {
    fontSize: TYPOGRAPHY.fontSizes.base,
    color: COLORS.gray[600],
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 16,
  },
  achievementMessage: {
    fontSize: TYPOGRAPHY.fontSizes.base,
    color: COLORS.primary,
    textAlign: 'center',
    fontWeight: TYPOGRAPHY.fontWeights.medium,
    marginBottom: 32,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  button: {
    width: '100%',
    minHeight: 56, // Large touch target for elderly users
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  shareButton: {
    backgroundColor: COLORS.secondary,
  },
  shareButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSizes.lg,
    fontWeight: TYPOGRAPHY.fontWeights.semibold,
  },
  continueButton: {
    backgroundColor: COLORS.primary,
  },
  continueButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSizes.lg,
    fontWeight: TYPOGRAPHY.fontWeights.semibold,
  },
});
