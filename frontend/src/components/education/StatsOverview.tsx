/**
 * Stats Overview Component
 *
 * 4-card stats summary displaying content viewed, quizzes passed, streak, and total points.
 * Responsive layout (2x2 grid on mobile, row on tablet).
 */

import React from 'react';
import { View, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { StatCard } from './StatCard';
import { COLORS, TYPOGRAPHY } from '@/constants/config';
import type { MultiLanguageText } from '@/types/education';

interface StatsOverviewProps {
  contentViewed: number;
  quizzesPassed: number;
  currentStreak: number;
  totalPoints: number;
  language?: 'ms' | 'en' | 'zh' | 'ta';
}

const labels: Record<string, MultiLanguageText> = {
  contentViewed: {
    ms: 'Kandungan Dilihat',
    en: 'Content Viewed',
    zh: '查看内容',
    ta: 'உள்ளடக்கம் பார்த்தது',
  },
  quizzesPassed: {
    ms: 'Kuiz Lulus',
    en: 'Quizzes Passed',
    zh: '通过测验',
    ta: 'தேர்ச்சி பெற்ற வினாடி வினா',
  },
  currentStreak: {
    ms: 'Hari Berturut-turut',
    en: 'Day Streak',
    zh: '连续天数',
    ta: 'தொடர் நாட்கள்',
  },
  totalPoints: {
    ms: 'Jumlah Mata',
    en: 'Total Points',
    zh: '总积分',
    ta: 'மொத்த புள்ளிகள்',
  },
};

export const StatsOverview: React.FC<StatsOverviewProps> = ({
  contentViewed,
  quizzesPassed,
  currentStreak,
  totalPoints,
  language = 'en',
}) => {
  const { width } = useWindowDimensions();

  // Use row layout on tablets (width > 768), grid on mobile
  const isTablet = width > 768;

  return (
    <View style={styles.container}>
      <View style={isTablet ? styles.rowLayout : styles.gridLayout}>
        <StatCard
          icon="📖"
          value={contentViewed}
          label={labels.contentViewed[language]}
          backgroundColor={COLORS.white}
        />
        <StatCard
          icon="🎓"
          value={quizzesPassed}
          label={labels.quizzesPassed[language]}
          backgroundColor={COLORS.white}
        />
      </View>
      <View style={isTablet ? styles.rowLayout : styles.gridLayout}>
        <StatCard
          icon="🔥"
          value={currentStreak}
          label={labels.currentStreak[language]}
          backgroundColor={COLORS.white}
        />
        <StatCard
          icon="⭐"
          value={totalPoints}
          label={labels.totalPoints[language]}
          backgroundColor={COLORS.white}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: COLORS.gray[50],
  },
  rowLayout: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  gridLayout: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
});
