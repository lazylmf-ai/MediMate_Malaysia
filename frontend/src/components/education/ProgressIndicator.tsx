/**
 * Progress Indicator Component
 *
 * Visual progress bar showing current question number and completion percentage.
 * Designed with large text for elderly users and clear visual feedback.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, TYPOGRAPHY } from '@/constants/config';
import { useAppSelector } from '@/store/hooks';

interface ProgressIndicatorProps {
  current: number;
  total: number;
  showPercentage?: boolean;
}

export const ProgressIndicator: React.FC<ProgressIndicatorProps> = ({
  current,
  total,
  showPercentage = true,
}) => {
  const { profile } = useAppSelector((state) => state.cultural);
  const language = profile?.language || 'en';

  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  const getQuestionText = () => {
    switch (language) {
      case 'ms':
        return 'Soalan';
      case 'zh':
        return '问题';
      case 'ta':
        return 'கேள்வி';
      default:
        return 'Question';
    }
  };

  const getOfText = () => {
    switch (language) {
      case 'ms':
        return 'daripada';
      case 'zh':
        return '的';
      case 'ta':
        return 'இல்';
      default:
        return 'of';
    }
  };

  return (
    <View style={styles.container}>
      {/* Question Counter */}
      <View style={styles.counterContainer}>
        <Text style={styles.counterText}>
          {getQuestionText()} {current} {getOfText()} {total}
        </Text>
        {showPercentage && (
          <Text style={styles.percentageText}>{percentage}%</Text>
        )}
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBarContainer}>
        <View
          style={[
            styles.progressBarFill,
            { width: `${percentage}%` },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  counterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  counterText: {
    fontSize: TYPOGRAPHY.fontSizes.lg,
    fontWeight: TYPOGRAPHY.fontWeights.semibold,
    color: COLORS.gray[700],
  },
  percentageText: {
    fontSize: TYPOGRAPHY.fontSizes.lg,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: COLORS.primary,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: COLORS.gray[200],
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: 4,
  },
});
