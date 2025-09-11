/**
 * Family Screen
 * 
 * Placeholder screen for family coordination functionality.
 * Will be implemented in subsequent tasks.
 */

import React from 'react';
import { View, Text, StyleSheet, SafeAreaView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { COLORS, TYPOGRAPHY } from '@/constants/config';
import type { MainTabScreenProps } from '@/types/navigation';

type Props = MainTabScreenProps<'Family'>;

export default function FamilyScreen({ navigation }: Props) {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <View style={styles.content}>
        <Text style={styles.title}>Family Circle</Text>
        <Text style={styles.subtitle}>
          Family coordination and remote monitoring features will be implemented in Task #025
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSizes['2xl'],
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: COLORS.secondary,
    marginBottom: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: TYPOGRAPHY.fontSizes.base,
    color: COLORS.gray[600],
    textAlign: 'center',
    lineHeight: 24,
  },
});