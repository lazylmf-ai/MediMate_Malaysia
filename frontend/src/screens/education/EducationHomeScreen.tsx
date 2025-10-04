/**
 * Education Home Screen
 * Main hub for educational content with cultural intelligence integration
 * Displays content in user's preferred language and respects cultural preferences
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { useCulturalPreferences } from '../../hooks/useCulturalPreferences';

interface EducationContent {
  id: string;
  title: string;
  description: string;
  category: string;
  language: string;
  duration_minutes?: number;
  difficulty_level: 'beginner' | 'intermediate' | 'advanced';
}

interface ContentCategory {
  id: string;
  name: string;
  description: string;
  icon: string;
  content_count: number;
}

export const EducationHomeScreen: React.FC = () => {
  const {
    language,
    culturalSettings,
    preferences,
    isLoading: prefsLoading,
    getGreeting,
    getCulturalContext
  } = useCulturalPreferences();

  const [recommendations, setRecommendations] = useState<EducationContent[]>([]);
  const [categories, setCategories] = useState<ContentCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  /**
   * Fetch recommendations in user's preferred language
   */
  const fetchRecommendations = useCallback(async () => {
    try {
      // In production, this would call API with language parameter
      console.log(`[EducationHome] Fetching recommendations in ${language}`);

      // Mock API call
      // const response = await educationService.getRecommendations({ language });
      // setRecommendations(response.data);

      // Mock data for demonstration
      setRecommendations([]);
    } catch (error) {
      console.error('[EducationHome] Failed to fetch recommendations:', error);
    }
  }, [language]);

  /**
   * Fetch categories in user's preferred language
   */
  const fetchCategories = useCallback(async () => {
    try {
      console.log(`[EducationHome] Fetching categories in ${language}`);

      // Mock API call
      // const response = await educationService.getCategories({ language });
      // setCategories(response.data);

      // Mock data for demonstration
      setCategories([]);
    } catch (error) {
      console.error('[EducationHome] Failed to fetch categories:', error);
    }
  }, [language]);

  /**
   * Load all content
   */
  const loadContent = useCallback(async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        fetchRecommendations(),
        fetchCategories()
      ]);
    } catch (error) {
      console.error('[EducationHome] Failed to load content:', error);
    } finally {
      setIsLoading(false);
    }
  }, [fetchRecommendations, fetchCategories]);

  /**
   * Handle pull to refresh
   */
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadContent();
    setRefreshing(false);
  }, [loadContent]);

  /**
   * Reload content when language changes
   */
  useEffect(() => {
    if (!prefsLoading) {
      loadContent();
    }
  }, [language, prefsLoading, loadContent]);

  /**
   * Get translations for UI text based on language
   */
  const getTranslations = () => {
    const translations = {
      ms: {
        title: 'Pusat Pendidikan',
        subtitle: 'Ketahui lebih lanjut tentang kesihatan anda',
        recommended: 'Disyorkan Untuk Anda',
        categories: 'Kategori',
        viewAll: 'Lihat Semua',
        noContent: 'Tiada kandungan tersedia',
        loading: 'Memuatkan...'
      },
      en: {
        title: 'Education Hub',
        subtitle: 'Learn more about your health',
        recommended: 'Recommended For You',
        categories: 'Categories',
        viewAll: 'View All',
        noContent: 'No content available',
        loading: 'Loading...'
      },
      zh: {
        title: '教育中心',
        subtitle: '了解更多关于您的健康',
        recommended: '为您推荐',
        categories: '类别',
        viewAll: '查看全部',
        noContent: '没有可用内容',
        loading: '加载中...'
      },
      ta: {
        title: 'கல்வி மையம்',
        subtitle: 'உங்கள் ஆரோக்கியம் பற்றி மேலும் அறியவும்',
        recommended: 'உங்களுக்கான பரிந்துரைகள்',
        categories: 'வகைகள்',
        viewAll: 'அனைத்தையும் காண்க',
        noContent: 'உள்ளடக்கம் இல்லை',
        loading: 'ஏற்றுகிறது...'
      }
    };

    return translations[language] || translations.en;
  };

  const t = getTranslations();
  const culturalContext = getCulturalContext();

  if (isLoading && !refreshing) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>{t.loading}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Greeting Section */}
      <View style={styles.greetingSection}>
        <Text style={styles.greeting}>{getGreeting()}</Text>
        <Text style={styles.subtitle}>{t.subtitle}</Text>
      </View>

      {/* Cultural Context Indicator (for Muslim users during prayer times) */}
      {culturalContext.respectsPrayerTimes && (
        <View style={styles.culturalNotice}>
          <Text style={styles.culturalNoticeText}>
            {language === 'ms'
              ? 'Pengingat pembelajaran ditetapkan mengikut waktu solat'
              : 'Learning reminders are set according to prayer times'}
          </Text>
        </View>
      )}

      {/* Recommended Content */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t.recommended}</Text>
          <TouchableOpacity>
            <Text style={styles.viewAllText}>{t.viewAll}</Text>
          </TouchableOpacity>
        </View>

        {recommendations.length > 0 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {recommendations.map(content => (
              <TouchableOpacity
                key={content.id}
                style={styles.contentCard}
                onPress={() => console.log('Navigate to content:', content.id)}
              >
                <Text style={styles.contentTitle} numberOfLines={2}>
                  {content.title}
                </Text>
                <Text style={styles.contentDescription} numberOfLines={3}>
                  {content.description}
                </Text>
                <View style={styles.contentMeta}>
                  <Text style={styles.contentDuration}>
                    {content.duration_minutes} {language === 'ms' ? 'min' : 'min'}
                  </Text>
                  <Text style={styles.contentLevel}>
                    {content.difficulty_level}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>{t.noContent}</Text>
          </View>
        )}
      </View>

      {/* Categories */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t.categories}</Text>
        </View>

        {categories.length > 0 ? (
          <View style={styles.categoriesGrid}>
            {categories.map(category => (
              <TouchableOpacity
                key={category.id}
                style={styles.categoryCard}
                onPress={() => console.log('Navigate to category:', category.id)}
              >
                <Text style={styles.categoryIcon}>{category.icon}</Text>
                <Text style={styles.categoryName} numberOfLines={2}>
                  {category.name}
                </Text>
                <Text style={styles.categoryCount}>
                  {category.content_count} {language === 'ms' ? 'item' : 'items'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>{t.noContent}</Text>
          </View>
        )}
      </View>

      {/* Language indicator (for debugging/development) */}
      {__DEV__ && (
        <View style={styles.debugInfo}>
          <Text style={styles.debugText}>Current Language: {language}</Text>
          <Text style={styles.debugText}>
            Prayer Times Respected: {culturalContext.respectsPrayerTimes ? 'Yes' : 'No'}
          </Text>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5'
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5'
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666'
  },
  greetingSection: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0'
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 8
  },
  subtitle: {
    fontSize: 16,
    color: '#666'
  },
  culturalNotice: {
    backgroundColor: '#E3F2FD',
    padding: 12,
    margin: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#2196F3'
  },
  culturalNoticeText: {
    fontSize: 14,
    color: '#1976D2'
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 20
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#212121'
  },
  viewAllText: {
    fontSize: 14,
    color: '#2196F3',
    fontWeight: '600'
  },
  contentCard: {
    width: 280,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  contentTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#212121',
    marginBottom: 8
  },
  contentDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    lineHeight: 20
  },
  contentMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  contentDuration: {
    fontSize: 12,
    color: '#999'
  },
  contentLevel: {
    fontSize: 12,
    color: '#2196F3',
    fontWeight: '600',
    textTransform: 'capitalize'
  },
  categoriesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  categoryCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  categoryIcon: {
    fontSize: 32,
    marginBottom: 8
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#212121',
    textAlign: 'center',
    marginBottom: 4
  },
  categoryCount: {
    fontSize: 12,
    color: '#999'
  },
  emptyState: {
    padding: 40,
    alignItems: 'center'
  },
  emptyStateText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center'
  },
  debugInfo: {
    margin: 20,
    padding: 16,
    backgroundColor: '#FFF3E0',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFB74D'
  },
  debugText: {
    fontSize: 12,
    color: '#E65100',
    marginBottom: 4
  }
});

export default EducationHomeScreen;
