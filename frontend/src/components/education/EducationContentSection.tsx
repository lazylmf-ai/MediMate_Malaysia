/**
 * Education Content Section Component
 *
 * Displays related educational content for medications.
 * Used in MedicationDetailScreen to show learning materials.
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { COLORS, TYPOGRAPHY } from '@/constants/config';
import { EducationContent } from '@/types/education';
import ContentCard from './ContentCard';
import type { MainTabNavigationProp } from '@/types/navigation';

interface EducationContentSectionProps {
  /** Section title */
  title?: string;
  /** Educational content to display */
  content: EducationContent[];
  /** Loading state */
  loading?: boolean;
  /** Error message */
  error?: string | null;
  /** Message when no content available */
  emptyMessage?: string;
  /** Callback when content is pressed */
  onContentPress?: (content: EducationContent) => void;
  /** Maximum number of items to show */
  maxItems?: number;
  /** Show "See All" button */
  showSeeAll?: boolean;
}

export const EducationContentSection: React.FC<EducationContentSectionProps> = ({
  title = 'Learn About This Medication',
  content,
  loading = false,
  error = null,
  emptyMessage = 'No educational content available for this medication yet.',
  onContentPress,
  maxItems = 3,
  showSeeAll = true,
}) => {
  const navigation = useNavigation<MainTabNavigationProp>();

  const handleContentPress = (item: EducationContent) => {
    if (onContentPress) {
      onContentPress(item);
    } else {
      // Default navigation to Education tab -> ContentDetail
      navigation.navigate('Education', {
        screen: 'ContentDetail',
        params: { id: item.id },
      });
    }
  };

  const handleSeeAll = () => {
    // Navigate to Education Hub with medication filter
    navigation.navigate('Education', {
      screen: 'EducationHome',
    });
  };

  // Show loading state
  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>Loading educational content...</Text>
        </View>
      </View>
    );
  }

  // Show error state
  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.emptyContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      </View>
    );
  }

  // Show empty state
  if (!content || content.length === 0) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{emptyMessage}</Text>
        </View>
      </View>
    );
  }

  // Limit items if maxItems is set
  const displayContent = maxItems > 0 ? content.slice(0, maxItems) : content;
  const hasMore = content.length > displayContent.length;

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {showSeeAll && content.length > 0 && (
          <TouchableOpacity onPress={handleSeeAll} style={styles.seeAllButton}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Content List */}
      <FlatList
        data={displayContent}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.cardContainer}>
            <ContentCard
              content={item}
              onPress={() => handleContentPress(item)}
              showProgress={false}
            />
          </View>
        )}
        scrollEnabled={false} // Disable scroll since we're in a parent ScrollView
        ListFooterComponent={
          hasMore ? (
            <TouchableOpacity onPress={handleSeeAll} style={styles.showMoreButton}>
              <Text style={styles.showMoreText}>
                Show {content.length - displayContent.length} more
              </Text>
            </TouchableOpacity>
          ) : null
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSizes.xl,
    fontWeight: TYPOGRAPHY.fontWeights.semibold,
    color: COLORS.gray[900],
  },
  seeAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  seeAllText: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    fontWeight: TYPOGRAPHY.fontWeights.medium,
    color: COLORS.primary,
  },
  cardContainer: {
    marginBottom: 12,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  loadingText: {
    marginTop: 12,
    fontSize: TYPOGRAPHY.fontSizes.sm,
    color: COLORS.gray[600],
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: TYPOGRAPHY.fontSizes.base,
    color: COLORS.gray[600],
    textAlign: 'center',
    lineHeight: 24,
  },
  errorText: {
    fontSize: TYPOGRAPHY.fontSizes.base,
    color: COLORS.error,
    textAlign: 'center',
    lineHeight: 24,
  },
  showMoreButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: COLORS.gray[100],
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  showMoreText: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    fontWeight: TYPOGRAPHY.fontWeights.medium,
    color: COLORS.primary,
  },
});

export default EducationContentSection;
