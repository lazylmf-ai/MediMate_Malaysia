/**
 * Streak Calendar Component
 *
 * Visual calendar showing last 30 days of learning activity.
 * Highlights active days, current streak, and shows streak count prominently.
 * Multi-language day labels for elderly Malaysian users.
 */

import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { COLORS, TYPOGRAPHY } from '@/constants/config';
import type { MultiLanguageText } from '@/types/education';

interface StreakCalendarProps {
  currentStreak: number;
  activityDates?: string[]; // ISO date strings of days with activity
  language?: 'ms' | 'en' | 'zh' | 'ta';
}

const labels: Record<string, MultiLanguageText> = {
  title: {
    ms: 'Kalendar Pembelajaran',
    en: 'Learning Streak',
    zh: '学习连续记录',
    ta: 'கற்றல் தொடர்ச்சி',
  },
  currentStreak: {
    ms: 'Hari Berturut-turut',
    en: 'Day Streak',
    zh: '连续天数',
    ta: 'தொடர் நாட்கள்',
  },
  legend: {
    ms: 'Legenda',
    en: 'Legend',
    zh: '图例',
    ta: 'விளக்கம்',
  },
  active: {
    ms: 'Aktif',
    en: 'Active',
    zh: '活跃',
    ta: 'செயலில்',
  },
  inactive: {
    ms: 'Tidak Aktif',
    en: 'Inactive',
    zh: '未活跃',
    ta: 'செயலற்ற',
  },
  today: {
    ms: 'Hari Ini',
    en: 'Today',
    zh: '今天',
    ta: 'இன்று',
  },
};

const dayLabels: Record<string, MultiLanguageText[]> = {
  short: [
    { ms: 'Ah', en: 'Su', zh: '日', ta: 'ஞா' },
    { ms: 'Is', en: 'Mo', zh: '一', ta: 'தி' },
    { ms: 'Se', en: 'Tu', zh: '二', ta: 'செ' },
    { ms: 'Ra', en: 'We', zh: '三', ta: 'பு' },
    { ms: 'Kh', en: 'Th', zh: '四', ta: 'வி' },
    { ms: 'Ju', en: 'Fr', zh: '五', ta: 'வெ' },
    { ms: 'Sa', en: 'Sa', zh: '六', ta: 'ச' },
  ],
};

export const StreakCalendar: React.FC<StreakCalendarProps> = ({
  currentStreak,
  activityDates = [],
  language = 'en',
}) => {
  // Generate last 30 days
  const today = new Date();
  const last30Days: Date[] = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    last30Days.push(date);
  }

  // Convert activityDates to Set for O(1) lookup
  const activitySet = new Set(
    activityDates.map((dateStr) => {
      const date = new Date(dateStr);
      return date.toISOString().split('T')[0];
    })
  );

  // Check if a date is active
  const isActive = (date: Date): boolean => {
    const dateStr = date.toISOString().split('T')[0];
    return activitySet.has(dateStr);
  };

  // Check if a date is today
  const isToday = (date: Date): boolean => {
    const dateStr = date.toISOString().split('T')[0];
    const todayStr = today.toISOString().split('T')[0];
    return dateStr === todayStr;
  };

  return (
    <View style={styles.container}>
      {/* Title and Streak Count */}
      <View style={styles.header}>
        <Text style={styles.title}>{labels.title[language]}</Text>
        <View style={styles.streakBadge}>
          <Text style={styles.streakIcon}>🔥</Text>
          <Text style={styles.streakCount}>{currentStreak}</Text>
          <Text style={styles.streakLabel}>{labels.currentStreak[language]}</Text>
        </View>
      </View>

      {/* Day Labels */}
      <View style={styles.dayLabelsRow}>
        {dayLabels.short.map((day, index) => (
          <Text key={index} style={styles.dayLabel}>
            {day[language]}
          </Text>
        ))}
      </View>

      {/* Calendar Grid */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollView}>
        <View style={styles.calendarGrid}>
          {last30Days.map((date, index) => {
            const active = isActive(date);
            const todayDate = isToday(date);

            return (
              <View
                key={index}
                style={[
                  styles.dayCell,
                  active && styles.activeDayCell,
                  todayDate && styles.todayDayCell,
                ]}
              >
                <Text
                  style={[
                    styles.dayCellText,
                    active && styles.activeDayCellText,
                    todayDate && styles.todayDayCellText,
                  ]}
                >
                  {date.getDate()}
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Legend */}
      <View style={styles.legend}>
        <Text style={styles.legendTitle}>{labels.legend[language]}:</Text>
        <View style={styles.legendItems}>
          <View style={styles.legendItem}>
            <View style={[styles.legendBox, styles.activeDayCell]} />
            <Text style={styles.legendText}>{labels.active[language]}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendBox, styles.todayDayCell]} />
            <Text style={styles.legendText}>{labels.today[language]}</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendBox, styles.dayCell]} />
            <Text style={styles.legendText}>{labels.inactive[language]}</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 12,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSizes.xl,
    fontWeight: TYPOGRAPHY.fontWeights.semibold,
    color: COLORS.gray[900],
  },
  streakBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  streakIcon: {
    fontSize: 24,
    marginRight: 8,
  },
  streakCount: {
    fontSize: TYPOGRAPHY.fontSizes['2xl'],
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: COLORS.white,
    marginRight: 4,
  },
  streakLabel: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    color: COLORS.white,
  },
  dayLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  dayLabel: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    fontWeight: TYPOGRAPHY.fontWeights.medium,
    color: COLORS.gray[600],
    width: 40,
    textAlign: 'center',
  },
  scrollView: {
    marginBottom: 16,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    width: '100%',
  },
  dayCell: {
    width: 40,
    height: 40,
    margin: 4,
    borderRadius: 8,
    backgroundColor: COLORS.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.gray[200],
  },
  activeDayCell: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  todayDayCell: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    borderWidth: 2,
  },
  dayCellText: {
    fontSize: TYPOGRAPHY.fontSizes.base,
    fontWeight: TYPOGRAPHY.fontWeights.medium,
    color: COLORS.gray[600],
  },
  activeDayCellText: {
    color: COLORS.white,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
  },
  todayDayCellText: {
    color: COLORS.white,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
  },
  legend: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
  },
  legendTitle: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    fontWeight: TYPOGRAPHY.fontWeights.medium,
    color: COLORS.gray[700],
    marginBottom: 8,
  },
  legendItems: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    marginBottom: 4,
  },
  legendBox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    color: COLORS.gray[600],
  },
});
