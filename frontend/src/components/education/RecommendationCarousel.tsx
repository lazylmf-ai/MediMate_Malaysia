/**
 * Recommendation Carousel Component (PLACEHOLDER for Stream B)
 *
 * Horizontal scrollable carousel showing personalized content recommendations.
 * This is a temporary placeholder until Stream B implements the full component.
 */

import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import type { Recommendation } from '@/types/education';
import { ContentCard } from './ContentCard';
import { COLORS, TYPOGRAPHY } from '@/constants/config';

interface RecommendationCarouselProps {
  recommendations: Recommendation[];
  onPress: (contentId: string) => void;
}

export const RecommendationCarousel: React.FC<RecommendationCarouselProps> = ({
  recommendations,
  onPress,
}) => {
  if (recommendations.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Recommended for You</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {recommendations.map(rec => {
          if (!rec.content) return null;
          return (
            <View key={rec.contentId} style={styles.cardWrapper}>
              <ContentCard
                content={rec.content}
                onPress={() => onPress(rec.contentId)}
              />
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSizes.xl,
    fontWeight: TYPOGRAPHY.fontWeights.semibold,
    color: COLORS.gray[900],
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  scrollContent: {
    paddingHorizontal: 20,
    gap: 12,
  },
  cardWrapper: {
    width: 280,
  },
});
