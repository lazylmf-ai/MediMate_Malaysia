/**
 * Stat Card Component
 *
 * Individual stat card displaying icon, value, and label.
 * Designed for elderly users with large fonts and high contrast.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, TYPOGRAPHY } from '@/constants/config';

interface StatCardProps {
  icon: string;
  value: number;
  label: string;
  backgroundColor?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  icon,
  value,
  label,
  backgroundColor = COLORS.white,
}) => {
  return (
    <View style={[styles.card, { backgroundColor }]}>
      {/* Icon */}
      <Text style={styles.icon}>{icon}</Text>

      {/* Value */}
      <Text style={styles.value}>{value}</Text>

      {/* Label */}
      <Text style={styles.label}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 150,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginHorizontal: 8,
    marginVertical: 8,
    minHeight: 140, // Large touch target for elderly users
  },
  icon: {
    fontSize: 40,
    marginBottom: 12,
  },
  value: {
    fontSize: TYPOGRAPHY.fontSizes['4xl'],
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: COLORS.gray[900],
    marginBottom: 8,
  },
  label: {
    fontSize: TYPOGRAPHY.fontSizes.base,
    fontWeight: TYPOGRAPHY.fontWeights.medium,
    color: COLORS.gray[600],
    textAlign: 'center',
  },
});
