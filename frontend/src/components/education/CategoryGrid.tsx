/**
 * Category Grid Component (PLACEHOLDER for Stream B)
 *
 * Grid layout for browsing content categories.
 * This is a temporary placeholder until Stream B implements the full component.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { Category } from '@/types/education';
import { CategoryCard } from './CategoryCard';
import { COLORS, TYPOGRAPHY } from '@/constants/config';

interface CategoryGridProps {
  categories: Category[];
  onPress: (category: Category) => void;
}

export const CategoryGrid: React.FC<CategoryGridProps> = ({
  categories,
  onPress,
}) => {
  if (categories.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Browse by Category</Text>
      <View style={styles.grid}>
        {categories.map(category => (
          <CategoryCard
            key={category.id}
            category={category}
            onPress={() => onPress(category)}
          />
        ))}
      </View>
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
  },
  grid: {
    gap: 12,
  },
});
