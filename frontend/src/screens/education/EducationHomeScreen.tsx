/**
 * Education Home Screen
 *
 * Main education hub screen with:
 * - Personalized greeting
 * - Recommended content carousel
 * - Continue learning section (in-progress content)
 * - Category browsing grid
 * - Trending topics section
 */

import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  fetchRecommendations,
  fetchTrendingContent,
  fetchUserProgressList,
} from '@/store/slices/educationSlice';
import { RecommendationCarousel, CategoryGrid, ContentCard, OfflineIndicator } from '@/components/education';
import { COLORS, TYPOGRAPHY } from '@/constants/config';
import type { EducationStackScreenProps } from '@/types/navigation';
import type { Category, EducationContent } from '@/types/education';

type Props = EducationStackScreenProps<'EducationHome'>;

export default function EducationHomeScreen({ navigation }: Props) {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector(state => state.auth);
  const { profile } = useAppSelector(state => state.cultural);
  const {
    recommendations,
    recommendationsLoading,
    trendingContent,
    userProgress,
    progressLoading,
  } = useAppSelector(state => state.education);

  const [refreshing, setRefreshing] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  const language = (profile?.language || 'en') as 'ms' | 'en' | 'zh' | 'ta';

  const loadData = useCallback(async () => {
    await Promise.all([
      dispatch(fetchRecommendations(10)),
      dispatch(fetchTrendingContent({ limit: 10 })),
      dispatch(fetchUserProgressList({ completed: false, limit: 5 })),
    ]);
  }, [dispatch]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const getGreeting = () => {
    const hour = new Date().getHours();

    if (hour < 12) {
      switch (language) {
        case 'ms':
          return 'Selamat Pagi';
        case 'zh':
          return '早上好';
        case 'ta':
          return 'காலை வணக்கம்';
        default:
          return 'Good Morning';
      }
    } else if (hour < 18) {
      switch (language) {
        case 'ms':
          return 'Selamat Petang';
        case 'zh':
          return '下午好';
        case 'ta':
          return 'மதிய வணக்கம்';
        default:
          return 'Good Afternoon';
      }
    } else {
      switch (language) {
        case 'ms':
          return 'Selamat Malam';
        case 'zh':
          return '晚上好';
        case 'ta':
          return 'மாலை வணக்கம்';
        default:
          return 'Good Evening';
      }
    }
  };

  const handleContentPress = (contentId: string) => {
    navigation.navigate('ContentDetail', { id: contentId });
  };

  const handleCategoryPress = (category: Category) => {
    navigation.navigate('CategoryBrowse', { category: category.id });
  };

  const handleSearchPress = () => {
    navigation.navigate('ContentSearch');
  };

  const handleDownloadManagerPress = () => {
    navigation.navigate('DownloadManager');
  };

  const getInProgressContent = (): EducationContent[] => {
    return [];
  };

  const isLoading = recommendationsLoading || progressLoading;

  if (isLoading && !refreshing) {
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
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.userName}>{user?.fullName}</Text>
          </View>
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.iconButton}
              onPress={handleDownloadManagerPress}
              accessibilityLabel="Download Manager"
              accessibilityRole="button"
            >
              <Icon name="download" size={24} color={COLORS.gray[700]} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.searchButton}
              onPress={handleSearchPress}
              accessibilityLabel="Search"
              accessibilityRole="button"
            >
              <Icon name="search" size={24} color={COLORS.gray[700]} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Offline Indicator Banner */}
        <View style={styles.offlineIndicatorContainer}>
          <OfflineIndicator language={language} />
        </View>

        <View style={styles.heroSection}>
          <Text style={styles.heroTitle}>Education Hub</Text>
          <Text style={styles.heroSubtitle}>
            Learn about your health, medications, and wellness
          </Text>
        </View>

        {recommendations.length > 0 && (
          <RecommendationCarousel
            recommendations={recommendations}
            onPress={handleContentPress}
          />
        )}

        {getInProgressContent().length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Continue Learning</Text>
            {getInProgressContent().map(content => (
              <ContentCard
                key={content.id}
                content={content}
                onPress={() => handleContentPress(content.id)}
                showProgress
              />
            ))}
          </View>
        )}

        {categories.length > 0 && (
          <View style={styles.section}>
            <CategoryGrid categories={categories} onPress={handleCategoryPress} />
          </View>
        )}

        {trendingContent.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Trending Topics</Text>
            {trendingContent.map(content => (
              <ContentCard
                key={content.id}
                content={content}
                onPress={() => handleContentPress(content.id)}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray[50],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingBottom: 24,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: 20,
    paddingBottom: 16,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  greeting: {
    fontSize: TYPOGRAPHY.fontSizes.base,
    color: COLORS.gray[600],
    marginBottom: 4,
  },
  userName: {
    fontSize: TYPOGRAPHY.fontSizes['2xl'],
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: COLORS.gray[900],
  },
  iconButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
  },
  searchButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
  },
  offlineIndicatorContainer: {
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  heroSection: {
    backgroundColor: COLORS.primary,
    padding: 20,
    marginHorizontal: 20,
    borderRadius: 16,
    marginBottom: 24,
  },
  heroTitle: {
    fontSize: TYPOGRAPHY.fontSizes['3xl'],
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: COLORS.white,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: TYPOGRAPHY.fontSizes.base,
    color: COLORS.white,
    opacity: 0.9,
    lineHeight: 24,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.fontSizes.xl,
    fontWeight: TYPOGRAPHY.fontWeights.semibold,
    color: COLORS.gray[900],
    marginBottom: 16,
  },
});
