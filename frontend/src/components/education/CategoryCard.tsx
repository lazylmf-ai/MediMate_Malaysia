/**
 * Category Card Component (PLACEHOLDER for Stream B)
 *
 * Displays a category with icon and content count.
 * This is a temporary placeholder until Stream B implements the full component.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { Category } from '@/types/education';
import { useAppSelector } from '@/store/hooks';
import { COLORS, TYPOGRAPHY } from '@/constants/config';

interface CategoryCardProps {
  category: Category;
  onPress: () => void;
}

export const CategoryCard: React.FC<CategoryCardProps> = ({
  category,
  onPress,
}) => {
  const { profile } = useAppSelector(state => state.cultural);
  const language = profile?.language || 'en';
  const name = category.name[language];
  const description = category.description[language];

  return (
    <TouchableOpacity onPress={onPress} style={styles.card}>
      <View style={styles.iconContainer}>
        <Text style={styles.iconPlaceholder}>{name.charAt(0)}</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>
          {name}
        </Text>
        <Text style={styles.count}>{category.contentCount} items</Text>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconPlaceholder: {
    fontSize: TYPOGRAPHY.fontSizes['2xl'],
    color: COLORS.white,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSizes.lg,
    fontWeight: TYPOGRAPHY.fontWeights.semibold,
    color: COLORS.gray[900],
    marginBottom: 4,
  },
  count: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    color: COLORS.gray[500],
  },
});
