/**
 * Category Progress Chart Component
 *
 * Visual progress chart showing completion percentage for each category.
 * Uses progress bars with color-coding by category.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, TYPOGRAPHY } from '@/constants/config';

interface CategoryProgress {
  category: string;
  completed: number;
  total: number;
}

interface CategoryProgressChartProps {
  categories: CategoryProgress[];
  language?: 'ms' | 'en' | 'zh' | 'ta';
}

const getCategoryColor = (category: string): string => {
  const colors: Record<string, string> = {
    diabetes: '#2196F3',
    medication: '#9C27B0',
    condition: '#FF9800',
    general: '#4CAF50',
  };
  return colors[category.toLowerCase()] || COLORS.primary;
};

export const CategoryProgressChart: React.FC<CategoryProgressChartProps> = ({
  categories,
  language = 'en',
}) => {
  const getTitle = () => {
    switch (language) {
      case 'ms':
        return 'Kemajuan mengikut Kategori';
      case 'zh':
        return '按类别的进度';
      case 'ta':
        return 'வகை வாரியான முன்னேற்றம்';
      default:
        return 'Progress by Category';
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{getTitle()}</Text>

      {categories.map((cat) => {
        const percentage = cat.total > 0 ? Math.round((cat.completed / cat.total) * 100) : 0;
        const color = getCategoryColor(cat.category);

        return (
          <View key={cat.category} style={styles.categoryRow}>
            <View style={styles.categoryHeader}>
              <Text style={styles.categoryName}>{cat.category}</Text>
              <Text style={styles.categoryStats}>
                {cat.completed}/{cat.total} ({percentage}%)
              </Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View
                style={[
                  styles.progressBar,
                  { width: `${percentage}%`, backgroundColor: color },
                ]}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSizes.lg,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: COLORS.gray[900],
    marginBottom: 16,
  },
  categoryRow: {
    marginBottom: 16,
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryName: {
    fontSize: TYPOGRAPHY.fontSizes.base,
    fontWeight: TYPOGRAPHY.fontWeights.semibold,
    color: COLORS.gray[700],
    textTransform: 'capitalize',
  },
  categoryStats: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    color: COLORS.gray[600],
  },
  progressBarContainer: {
    height: 12,
    backgroundColor: COLORS.gray[200],
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 6,
  },
});
