/**
 * Learning Progress Screen
 *
 * Main progress dashboard showing:
 * - Stats overview (4 cards)
 * - Streak calendar
 * - Category progress chart
 * - Achievement grid
 * - Recent activity timeline
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAppSelector, useAppDispatch } from '@/store/hooks';
import { fetchUserStats, fetchUserAchievements } from '@/store/slices/educationSlice';
import {
  StatsOverview,
  StreakCalendar,
  CategoryProgressChart,
  AchievementGrid,
  RecentActivityList,
} from '@/components/education';
import { COLORS, TYPOGRAPHY } from '@/constants/config';

export default function LearningProgressScreen() {
  const dispatch = useAppDispatch();
  const { profile } = useAppSelector((state) => state.cultural);
  const language = profile?.language || 'en';
  const { userStats, achievements, loading } = useAppSelector((state) => state.education);

  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      await Promise.all([
        dispatch(fetchUserStats()).unwrap(),
        dispatch(fetchUserAchievements()).unwrap(),
      ]);
    } catch (error) {
      console.error('Error loading progress data:', error);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getTitle = () => {
    switch (language) {
      case 'ms':
        return 'Kemajuan Pembelajaran';
      case 'zh':
        return '学习进度';
      case 'ta':
        return 'கற்றல் முன்னேற்றம்';
      default:
        return 'Learning Progress';
    }
  };

  if (loading && !userStats) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{getTitle()}</Text>
      </View>

      {/* Content */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Stats Overview */}
        {userStats && (
          <StatsOverview
            contentViewed={userStats.contentViewed || 0}
            quizzesPassed={userStats.quizzesPassed || 0}
            currentStreak={userStats.currentStreak || 0}
            totalPoints={userStats.totalPoints || 0}
            language={language}
          />
        )}

        {/* Streak Calendar */}
        {userStats && (
          <StreakCalendar
            currentStreak={userStats.currentStreak || 0}
            longestStreak={userStats.longestStreak || 0}
            language={language}
          />
        )}

        {/* Category Progress */}
        {userStats?.categoryProgress && userStats.categoryProgress.length > 0 && (
          <CategoryProgressChart
            categories={userStats.categoryProgress}
            language={language}
          />
        )}

        {/* Achievements */}
        <AchievementGrid language={language} />

        {/* Recent Activity */}
        {userStats?.recentActivities && (
          <RecentActivityList
            activities={userStats.recentActivities}
            language={language}
            maxItems={10}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.fontSizes['2xl'],
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: COLORS.gray[900],
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
  },
});
