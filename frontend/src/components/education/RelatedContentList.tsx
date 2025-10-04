/**
 * RelatedContentList Component
 *
 * Vertical list of related content suggestions.
 * Displays ContentCard components with a "See More" button at the end.
 * Includes empty state when no related content is available.
 */

import React from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  TextStyle,
  ListRenderItem,
} from 'react-native';
import { useAppSelector } from '@/store/hooks';
import { useCulturalTheme } from '@/components/language/ui/CulturalThemeProvider';
import ContentCard from './ContentCard';
import type { EducationContent } from '@/types/education';

interface RelatedContentListProps {
  relatedContent: EducationContent[];
  onContentPress: (contentId: string) => void;
  onSeeMorePress?: () => void;
  maxItems?: number;
  title?: string;
}

export const RelatedContentList: React.FC<RelatedContentListProps> = ({
  relatedContent,
  onContentPress,
  onSeeMorePress,
  maxItems = 5,
  title,
}) => {
  const { theme } = useCulturalTheme();
  const language = useAppSelector(state => state.cultural.profile?.language ?? 'en');

  const getTitleText = (): string => {
    if (title) return title;

    const defaultTitles = {
      en: 'Related Content',
      ms: 'Kandungan Berkaitan',
      zh: '相关内容',
      ta: 'தொடர்புடைய உள்ளடக்கம்',
    };
    return defaultTitles[language] || defaultTitles.en;
  };

  const getEmptyStateText = (): string => {
    const emptyTexts = {
      en: 'No related content available',
      ms: 'Tiada kandungan berkaitan tersedia',
      zh: '暂无相关内容',
      ta: 'தொடர்புடைய உள்ளடக்கம் இல்லை',
    };
    return emptyTexts[language] || emptyTexts.en;
  };

  const getSeeMoreText = (): string => {
    const seeMoreTexts = {
      en: 'See More',
      ms: 'Lihat Lagi',
      zh: '查看更多',
      ta: 'மேலும் பார்க்க',
    };
    return seeMoreTexts[language] || seeMoreTexts.en;
  };

  // Limit the number of items displayed
  const displayedContent = relatedContent.slice(0, maxItems);
  const hasMoreContent = relatedContent.length > maxItems;

  const renderItem: ListRenderItem<EducationContent> = ({ item }) => (
    <ContentCard
      content={item}
      onPress={() => onContentPress(item.id)}
      compact={true}
      style={styles.card}
    />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>{getEmptyStateText()}</Text>
    </View>
  );

  const renderSeeMoreButton = () => {
    if (!hasMoreContent || !onSeeMorePress) return null;

    return (
      <TouchableOpacity
        style={styles.seeMoreButton}
        onPress={onSeeMorePress}
        accessibilityRole="button"
        accessibilityLabel={getSeeMoreText()}
        accessibilityHint={`View ${relatedContent.length - maxItems} more related items`}
      >
        <Text style={styles.seeMoreText}>{getSeeMoreText()}</Text>
        <Text style={styles.seeMoreIcon}>→</Text>
      </TouchableOpacity>
    );
  };

  const keyExtractor = (item: EducationContent) => item.id;

  const styles = StyleSheet.create({
    container: {
      marginVertical: theme.spacing.md,
    } as ViewStyle,
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      marginBottom: theme.spacing.sm,
    } as ViewStyle,
    title: {
      fontSize: 20 * theme.accessibility.textScaling,
      fontWeight: '700',
      color: theme.colors.text,
      fontFamily: theme.fonts.display,
    } as TextStyle,
    card: {
      marginHorizontal: theme.spacing.md,
      marginBottom: theme.spacing.sm,
    } as ViewStyle,
    emptyContainer: {
      paddingVertical: theme.spacing.xl,
      paddingHorizontal: theme.spacing.md,
      alignItems: 'center',
      justifyContent: 'center',
    } as ViewStyle,
    emptyText: {
      fontSize: 16 * theme.accessibility.textScaling,
      color: theme.colors.textSecondary,
      textAlign: 'center',
    } as TextStyle,
    seeMoreButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      marginHorizontal: theme.spacing.md,
      marginTop: theme.spacing.sm,
      marginBottom: theme.spacing.md,
      backgroundColor: theme.colors.card,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      minHeight: theme.accessibility.minimumTouchTarget,
      gap: theme.spacing.sm,
    } as ViewStyle,
    seeMoreText: {
      fontSize: 16 * theme.accessibility.textScaling,
      fontWeight: '600',
      color: theme.colors.primary,
    } as TextStyle,
    seeMoreIcon: {
      fontSize: 18,
      color: theme.colors.primary,
      fontWeight: '700',
    } as TextStyle,
  });

  if (!relatedContent || relatedContent.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>{getTitleText()}</Text>
        </View>
        {renderEmptyState()}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{getTitleText()}</Text>
      </View>
      <FlatList
        data={displayedContent}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        scrollEnabled={false}
        accessibilityRole="list"
        accessibilityLabel={getTitleText()}
      />
      {renderSeeMoreButton()}
    </View>
  );
};

export default RelatedContentList;
