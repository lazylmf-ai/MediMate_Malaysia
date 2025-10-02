/**
 * Storage Stats Card Component
 *
 * Visual storage usage display with:
 * - Progress bar showing used/total
 * - Used/available/total in MB
 * - Color-coded by usage level (green < 60%, yellow 60-80%, red > 80%)
 * - Multi-language labels
 * - Card with padding and shadow
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, TYPOGRAPHY } from '@/constants/config';
import { formatBytes, calculateStoragePercentage } from '@/utils/storageUtils';
import type { EducationStorageStats } from '@/types/offline';

interface StorageStatsCardProps {
  stats: EducationStorageStats;
  language?: 'ms' | 'en' | 'zh' | 'ta';
}

export const StorageStatsCard: React.FC<StorageStatsCardProps> = ({
  stats,
  language = 'en',
}) => {
  // Calculate percentage
  const percentage = calculateStoragePercentage(stats.used, stats.total);

  // Determine color based on usage level
  const getProgressColor = () => {
    if (percentage < 60) {
      return COLORS.success; // Green
    } else if (percentage < 80) {
      return COLORS.warning; // Amber/Yellow
    } else {
      return COLORS.error; // Red
    }
  };

  // Multi-language text functions
  const getTitleText = () => {
    switch (language) {
      case 'ms':
        return 'Penggunaan Penyimpanan';
      case 'zh':
        return '存储使用情况';
      case 'ta':
        return 'சேமிப்பக பயன்பாடு';
      default:
        return 'Storage Usage';
    }
  };

  const getUsedText = () => {
    switch (language) {
      case 'ms':
        return 'digunakan';
      case 'zh':
        return '已使用';
      case 'ta':
        return 'பயன்படுத்தப்பட்டது';
      default:
        return 'used';
    }
  };

  const getAvailableText = () => {
    switch (language) {
      case 'ms':
        return 'tersedia';
      case 'zh':
        return '可用';
      case 'ta':
        return 'கிடைக்கிறது';
      default:
        return 'available';
    }
  };

  const getOfText = () => {
    switch (language) {
      case 'ms':
        return 'daripada';
      case 'zh':
        return '/';
      case 'ta':
        return '/';
      default:
        return 'of';
    }
  };

  return (
    <View style={styles.card}>
      {/* Title */}
      <Text style={styles.title}>{getTitleText()}</Text>

      {/* Progress Bar */}
      <View style={styles.progressBarContainer}>
        <View
          style={[
            styles.progressBarFill,
            {
              width: `${percentage}%`,
              backgroundColor: getProgressColor(),
            },
          ]}
        />
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        {/* Used / Total */}
        <View style={styles.statItem}>
          <Text style={styles.statValue}>
            {formatBytes(stats.used)} {getOfText()} {formatBytes(stats.total)}
          </Text>
          <Text style={styles.statLabel}>{getUsedText()}</Text>
        </View>

        {/* Available */}
        <View style={[styles.statItem, styles.statItemRight]}>
          <Text style={[styles.statValue, styles.statValueRight]}>
            {formatBytes(stats.available)}
          </Text>
          <Text style={[styles.statLabel, styles.statLabelRight]}>
            {getAvailableText()}
          </Text>
        </View>
      </View>

      {/* Percentage Indicator */}
      <View style={styles.percentageContainer}>
        <View
          style={[
            styles.percentageBadge,
            { backgroundColor: getProgressColor() + '20' },
          ]}
        >
          <Text style={[styles.percentageText, { color: getProgressColor() }]}>
            {percentage.toFixed(0)}%
          </Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSizes.lg,
    fontWeight: TYPOGRAPHY.fontWeights.semibold,
    color: COLORS.gray[900],
    marginBottom: 16,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: COLORS.gray[200],
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 16,
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  statItem: {
    flex: 1,
  },
  statItemRight: {
    alignItems: 'flex-end',
  },
  statValue: {
    fontSize: TYPOGRAPHY.fontSizes.base,
    fontWeight: TYPOGRAPHY.fontWeights.semibold,
    color: COLORS.gray[900],
    marginBottom: 4,
  },
  statValueRight: {
    textAlign: 'right',
  },
  statLabel: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    color: COLORS.gray[600],
  },
  statLabelRight: {
    textAlign: 'right',
  },
  percentageContainer: {
    alignItems: 'center',
    marginTop: 4,
  },
  percentageBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  percentageText: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
  },
});
