/**
 * Content Card Component (PLACEHOLDER for Stream B)
 *
 * Displays educational content preview with title, description, and metadata.
 * This is a temporary placeholder until Stream B implements the full component.
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { EducationContent } from '@/types/education';
import { useAppSelector } from '@/store/hooks';
import { COLORS, TYPOGRAPHY } from '@/constants/config';

interface ContentCardProps {
  content: EducationContent;
  onPress: () => void;
  showProgress?: boolean;
}

export const ContentCard: React.FC<ContentCardProps> = ({
  content,
  onPress,
  showProgress = false,
}) => {
  const { profile } = useAppSelector(state => state.cultural);
  const language = profile?.language || 'en';
  const title = content.title[language];
  const description = content.description[language];

  return (
    <TouchableOpacity onPress={onPress} style={styles.card}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{content.type.toUpperCase()}</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>

        <Text style={styles.description} numberOfLines={3}>
          {description}
        </Text>

        <View style={styles.metadata}>
          <Text style={styles.metadataText}>{content.estimatedReadTime} min</Text>
          <Text style={styles.metadataText}>·</Text>
          <Text style={styles.metadataText}>{content.category}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
    minHeight: 120,
  },
  badge: {
    position: 'absolute',
    top: 12,
    right: 12,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    zIndex: 1,
  },
  badgeText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSizes.xs,
    fontWeight: TYPOGRAPHY.fontWeights.semibold,
  },
  content: {
    padding: 16,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSizes.lg,
    fontWeight: TYPOGRAPHY.fontWeights.semibold,
    color: COLORS.gray[900],
    marginBottom: 8,
  },
  description: {
    fontSize: TYPOGRAPHY.fontSizes.base,
    color: COLORS.gray[600],
    lineHeight: 22,
    marginBottom: 12,
  },
  metadata: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metadataText: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    color: COLORS.gray[500],
  },
});
