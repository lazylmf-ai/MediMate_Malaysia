/**
 * Content Search Screen
 *
 * Search educational content with:
 * - Search bar with debouncing (300ms)
 * - Content filters (type, language, category)
 * - Search results display
 * - Empty state when no results
 * - Loading skeleton during search
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TextInput,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import {
  searchContent,
  setSearchQuery,
  setSearchFilters,
  clearSearchResults,
} from '@/store/slices/educationSlice';
import { ContentCard, ContentFilters } from '@/components/education';
import { COLORS, TYPOGRAPHY } from '@/constants/config';
import type { EducationStackScreenProps } from '@/types/navigation';
import type { SearchFilters } from '@/types/education';

type Props = EducationStackScreenProps<'ContentSearch'>;

const DEBOUNCE_DELAY = 300;

export default function ContentSearchScreen({ navigation }: Props) {
  const dispatch = useAppDispatch();
  const { searchResults, searchQuery, searchFilters, searchLoading } = useAppSelector(
    state => state.education
  );

  const [localQuery, setLocalQuery] = useState(searchQuery);
  const [showFilters, setShowFilters] = useState(false);
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      dispatch(clearSearchResults());
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [dispatch, debounceTimer]);

  const performSearch = useCallback(
    (query: string, filters: SearchFilters) => {
      if (query.trim().length > 0) {
        dispatch(searchContent({ query, filters }));
      }
    },
    [dispatch]
  );

  const handleQueryChange = (text: string) => {
    setLocalQuery(text);

    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    const timer = setTimeout(() => {
      dispatch(setSearchQuery(text));
      performSearch(text, searchFilters);
    }, DEBOUNCE_DELAY);

    setDebounceTimer(timer);
  };

  const handleApplyFilters = (filters: SearchFilters) => {
    dispatch(setSearchFilters(filters));
    setShowFilters(false);
    if (localQuery.trim().length > 0) {
      performSearch(localQuery, filters);
    }
  };

  const handleClearFilters = () => {
    dispatch(setSearchFilters({}));
    if (localQuery.trim().length > 0) {
      performSearch(localQuery, {});
    }
  };

  const handleContentPress = (contentId: string) => {
    navigation.navigate('ContentDetail', { id: contentId });
  };

  const renderEmptyState = () => {
    if (searchLoading) {
      return null;
    }

    if (localQuery.trim().length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateTitle}>Search Educational Content</Text>
          <Text style={styles.emptyStateText}>
            Enter keywords to find articles, videos, and other educational resources
            about your health and medications.
          </Text>
        </View>
      );
    }

    if (!searchResults || searchResults.content.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateTitle}>No Results Found</Text>
          <Text style={styles.emptyStateText}>
            Try different keywords or adjust your filters to find relevant content.
          </Text>
        </View>
      );
    }

    return null;
  };

  const renderLoadingState = () => {
    if (!searchLoading) return null;

    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Searching...</Text>
      </View>
    );
  };

  const hasActiveFilters =
    searchFilters.type || searchFilters.category || searchFilters.difficulty;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      <View style={styles.searchHeader}>
        <View style={styles.searchInputContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search content..."
            placeholderTextColor={COLORS.gray[400]}
            value={localQuery}
            onChangeText={handleQueryChange}
            autoCorrect={false}
            returnKeyType="search"
          />
        </View>

        <TouchableOpacity
          style={[styles.filterButton, hasActiveFilters && styles.filterButtonActive]}
          onPress={() => setShowFilters(!showFilters)}
        >
          <Text
            style={[
              styles.filterButtonText,
              hasActiveFilters && styles.filterButtonTextActive,
            ]}
          >
            Filters {hasActiveFilters && '(Active)'}
          </Text>
        </TouchableOpacity>
      </View>

      {showFilters && (
        <View style={styles.filtersContainer}>
          <ContentFilters
            onApplyFilters={handleApplyFilters}
            onClearFilters={handleClearFilters}
            initialFilters={searchFilters}
          />
        </View>
      )}

      {renderLoadingState()}

      {!searchLoading && (
        <FlatList
          data={searchResults?.content || []}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={styles.resultItem}>
              <ContentCard content={item} onPress={() => handleContentPress(item.id)} />
            </View>
          )}
          contentContainerStyle={styles.resultsContainer}
          ListEmptyComponent={renderEmptyState()}
          showsVerticalScrollIndicator={false}
        />
      )}

      {searchResults && searchResults.content.length > 0 && !searchLoading && (
        <View style={styles.resultsFooter}>
          <Text style={styles.resultsCount}>
            Showing {searchResults.content.length} of {searchResults.total} results
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray[50],
  },
  searchHeader: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
    gap: 12,
  },
  searchInputContainer: {
    flex: 1,
  },
  searchInput: {
    backgroundColor: COLORS.gray[100],
    borderRadius: 8,
    padding: 12,
    fontSize: TYPOGRAPHY.fontSizes.base,
    color: COLORS.gray[900],
    height: 44,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    backgroundColor: COLORS.white,
    justifyContent: 'center',
  },
  filterButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  filterButtonText: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    color: COLORS.gray[700],
    fontWeight: TYPOGRAPHY.fontWeights.medium,
  },
  filterButtonTextActive: {
    color: COLORS.white,
  },
  filtersContainer: {
    padding: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: TYPOGRAPHY.fontSizes.base,
    color: COLORS.gray[600],
  },
  resultsContainer: {
    padding: 16,
  },
  resultItem: {
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
  resultsFooter: {
    padding: 16,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
    alignItems: 'center',
  },
  resultsCount: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    color: COLORS.gray[600],
  },
});
