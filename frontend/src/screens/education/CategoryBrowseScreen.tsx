/**
 * Category Browse Screen
 *
 * Browse educational content filtered by category with:
 * - Content filtered by selected category
 * - Sort options (newest, popular, etc.)
 * - Infinite scroll or pagination
 * - Loading states
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchContentByCategory, setSelectedCategory } from '@/store/slices/educationSlice';
import { ContentCard } from '@/components/education';
import { COLORS, TYPOGRAPHY } from '@/constants/config';
import type { EducationStackScreenProps } from '@/types/navigation';

type Props = EducationStackScreenProps<'CategoryBrowse'>;

type SortOption = 'newest' | 'popular' | 'relevant';

export default function CategoryBrowseScreen({ route, navigation }: Props) {
  const { category } = route.params;
  const dispatch = useAppDispatch();
  const { content, contentLoading } = useAppSelector(state => state.education);

  const [sortBy, setSortBy] = useState<SortOption>('relevant');
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    dispatch(setSelectedCategory(category));
    loadContent();

    return () => {
      dispatch(setSelectedCategory(null));
    };
  }, [category, dispatch]);

  const loadContent = useCallback(async () => {
    await dispatch(fetchContentByCategory({ category, limit: 50 }));
  }, [category, dispatch]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadContent();
    setRefreshing(false);
  }, [loadContent]);

  const handleContentPress = (contentId: string) => {
    navigation.navigate('ContentDetail', { id: contentId });
  };

  const getSortedContent = () => {
    if (!content || content.length === 0) return [];

    const sortedContent = [...content];

    switch (sortBy) {
      case 'newest':
        return sortedContent.sort(
          (a, b) => new Date(b.publishedAt || b.updatedAt).getTime() - new Date(a.publishedAt || a.updatedAt).getTime()
        );
      case 'popular':
        return sortedContent.sort((a, b) => b.viewCount - a.viewCount);
      case 'relevant':
      default:
        return sortedContent;
    }
  };

  const sortedContent = getSortedContent();

  const renderSortButton = (option: SortOption, label: string) => (
    <TouchableOpacity
      key={option}
      style={[styles.sortButton, sortBy === option && styles.sortButtonActive]}
      onPress={() => setSortBy(option)}
    >
      <Text
        style={[
          styles.sortButtonText,
          sortBy === option && styles.sortButtonTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );

  const renderEmptyState = () => {
    if (contentLoading) return null;

    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyStateTitle}>No Content Found</Text>
        <Text style={styles.emptyStateText}>
          There are no items in this category yet. Check back later for new content.
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <Text style={styles.categoryTitle}>{category}</Text>
        <Text style={styles.contentCount}>
          {sortedContent.length} {sortedContent.length === 1 ? 'item' : 'items'}
        </Text>
      </View>

      <View style={styles.sortContainer}>
        <Text style={styles.sortLabel}>Sort by:</Text>
        <View style={styles.sortButtons}>
          {renderSortButton('relevant', 'Relevant')}
          {renderSortButton('newest', 'Newest')}
          {renderSortButton('popular', 'Popular')}
        </View>
      </View>

      {contentLoading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      ) : (
        <FlatList
          data={sortedContent}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={styles.contentItem}>
              <ContentCard content={item} onPress={() => handleContentPress(item.id)} />
            </View>
          )}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={renderEmptyState()}
          onRefresh={onRefresh}
          refreshing={refreshing}
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray[50],
  },
  header: {
    padding: 20,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  categoryTitle: {
    fontSize: TYPOGRAPHY.fontSizes['2xl'],
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: COLORS.gray[900],
    marginBottom: 4,
  },
  contentCount: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    color: COLORS.gray[500],
  },
  sortContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  sortLabel: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    color: COLORS.gray[700],
    fontWeight: TYPOGRAPHY.fontWeights.medium,
    marginRight: 12,
  },
  sortButtons: {
    flexDirection: 'row',
    gap: 8,
    flex: 1,
  },
  sortButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    backgroundColor: COLORS.white,
  },
  sortButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  sortButtonText: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    color: COLORS.gray[700],
    fontWeight: TYPOGRAPHY.fontWeights.medium,
  },
  sortButtonTextActive: {
    color: COLORS.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  contentItem: {
    marginBottom: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyStateTitle: {
    fontSize: TYPOGRAPHY.fontSizes.xl,
    fontWeight: TYPOGRAPHY.fontWeights.semibold,
    color: COLORS.gray[900],
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyStateText: {
    fontSize: TYPOGRAPHY.fontSizes.base,
    color: COLORS.gray[600],
    textAlign: 'center',
    lineHeight: 24,
  },
});
