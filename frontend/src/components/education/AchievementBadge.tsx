/**
 * Achievement Badge Component
 *
 * Displays an individual achievement badge with icon, name, description, and earned status.
 * Provides visual distinction between earned (colored) and locked (grayscale) badges.
 * Designed with large touch targets for elderly users.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { Badge } from '@/types/education';
import { useAppSelector } from '@/store/hooks';
import { COLORS, TYPOGRAPHY } from '@/constants/config';

interface AchievementBadgeProps {
  badge: Badge;
  showDate?: boolean;
}

/**
 * Format date for display
 */
const formatDate = (dateString: string, language: 'ms' | 'en' | 'zh' | 'ta'): string => {
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  };

  const locales = {
    ms: 'ms-MY',
    en: 'en-US',
    zh: 'zh-CN',
    ta: 'ta-IN',
  };

  return date.toLocaleDateString(locales[language], options);
};

export const AchievementBadge: React.FC<AchievementBadgeProps> = ({
  badge,
  showDate = true,
}) => {
  const { profile } = useAppSelector((state) => state.cultural);
  const language = profile?.language || 'en';
  const isEarned = !!badge.earnedAt;

  return (
    <View
      style={[styles.container, isEarned ? styles.earnedContainer : styles.lockedContainer]}
      accessibilityLabel={`${badge.name[language]}. ${badge.description[language]}. ${
        isEarned ? `Earned on ${formatDate(badge.earnedAt!, language)}` : 'Not yet earned'
      }`}
      accessibilityRole="button"
    >
      {/* Badge Icon */}
      <View style={[styles.iconContainer, !isEarned && styles.lockedIcon]}>
        <Text style={styles.icon}>{badge.icon}</Text>
      </View>

      {/* Badge Info */}
      <View style={styles.infoContainer}>
        <Text style={[styles.name, !isEarned && styles.lockedText]} numberOfLines={1}>
          {badge.name[language]}
        </Text>

        <Text style={[styles.description, !isEarned && styles.lockedText]} numberOfLines={2}>
          {badge.description[language]}
        </Text>

        {/* Date Earned */}
        {isEarned && showDate && badge.earnedAt && (
          <Text style={styles.date}>{formatDate(badge.earnedAt, language)}</Text>
        )}

        {/* Locked Status */}
        {!isEarned && (
          <View style={styles.lockedBadge}>
            <Text style={styles.lockedBadgeText}>
              {language === 'ms' && 'Belum Dicapai'}
              {language === 'en' && 'Locked'}
              {language === 'zh' && '未解锁'}
              {language === 'ta' && 'பூட்டப்பட்டது'}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    minHeight: 100,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  earnedContainer: {
    backgroundColor: COLORS.white,
  },
  lockedContainer: {
    backgroundColor: COLORS.gray[100],
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: COLORS.primary + '20', // 20% opacity
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  lockedIcon: {
    backgroundColor: COLORS.gray[300],
    opacity: 0.5,
  },
  icon: {
    fontSize: 36,
  },
  infoContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  name: {
    fontSize: TYPOGRAPHY.fontSizes.lg,
    fontWeight: TYPOGRAPHY.fontWeights.semibold,
    color: COLORS.gray[900],
    marginBottom: 4,
  },
  description: {
    fontSize: TYPOGRAPHY.fontSizes.base,
    color: COLORS.gray[600],
    lineHeight: 22,
    marginBottom: 6,
  },
  lockedText: {
    color: COLORS.gray[400],
  },
  date: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    color: COLORS.gray[500],
    marginTop: 4,
  },
  lockedBadge: {
    alignSelf: 'flex-start',
    backgroundColor: COLORS.gray[200],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    marginTop: 4,
  },
  lockedBadgeText: {
    fontSize: TYPOGRAPHY.fontSizes.xs,
    color: COLORS.gray[600],
    fontWeight: TYPOGRAPHY.fontWeights.medium,
  },
});
