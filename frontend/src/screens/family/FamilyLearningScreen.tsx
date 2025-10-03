/**
 * Family Learning Screen
 *
 * Displays learning progress for all family circle members.
 * Shows content viewed, quizzes passed, streaks, and achievements.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { COLORS, TYPOGRAPHY } from '@/constants/config';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

// Types
interface FamilyMember {
  id: string;
  name: string;
  relationship: string;
  avatar?: string;
}

interface MemberProgress {
  contentViewed: number;
  quizzesPassed: number;
  currentStreak: number;
  achievements: number;
}

type Props = NativeStackScreenProps<any, 'FamilyLearning'>;

export const FamilyLearningScreen: React.FC<Props> = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [familyMembers] = useState<FamilyMember[]>([
    // Mock data - in production this would come from family circle API
    { id: '1', name: 'Ahmad', relationship: 'Self' },
    { id: '2', name: 'Siti', relationship: 'Spouse' },
    { id: '3', name: 'Fatimah', relationship: 'Mother' },
  ]);
  const [learningProgress, setLearningProgress] = useState<Record<string, MemberProgress>>({});

  useEffect(() => {
    loadProgress();
  }, []);

  const loadProgress = async () => {
    try {
      setLoading(true);

      // Mock data - in production this would fetch from API
      const progress: Record<string, MemberProgress> = {
        '1': { contentViewed: 12, quizzesPassed: 8, currentStreak: 5, achievements: 3 },
        '2': { contentViewed: 8, quizzesPassed: 5, currentStreak: 3, achievements: 2 },
        '3': { contentViewed: 15, quizzesPassed: 10, currentStreak: 7, achievements: 4 },
      };

      setLearningProgress(progress);
    } catch (error) {
      console.error('Error loading family progress:', error);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProgress();
    setRefreshing(false);
  };

  const handleMemberPress = (memberId: string) => {
    navigation.navigate('MemberLearningDetail', { memberId });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading family progress...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Family Learning Progress</Text>
        <Text style={styles.subtitle}>
          Track your family's health education journey together
        </Text>
      </View>

      {familyMembers.map((member) => (
        <TouchableOpacity
          key={member.id}
          style={styles.memberCard}
          onPress={() => handleMemberPress(member.id)}
        >
          {/* Member Header */}
          <View style={styles.memberHeader}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{member.name.charAt(0)}</Text>
            </View>
            <View style={styles.memberInfo}>
              <Text style={styles.memberName}>{member.name}</Text>
              <Text style={styles.memberRelationship}>{member.relationship}</Text>
            </View>
          </View>

          {/* Progress Stats */}
          {learningProgress[member.id] && (
            <View style={styles.progressStats}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{learningProgress[member.id].contentViewed}</Text>
                <Text style={styles.statLabel}>Content Viewed</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{learningProgress[member.id].quizzesPassed}</Text>
                <Text style={styles.statLabel}>Quizzes Passed</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{learningProgress[member.id].currentStreak}</Text>
                <Text style={styles.statLabel}>Day Streak</Text>
              </View>
            </View>
          )}

          {/* View Details Button */}
          <View style={styles.viewButtonContainer}>
            <Text style={styles.viewButtonText}>View Details →</Text>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray[50],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.white,
  },
  loadingText: {
    marginTop: 12,
    fontSize: TYPOGRAPHY.fontSizes.base,
    color: COLORS.gray[600],
  },
  header: {
    padding: 20,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  title: {
    fontSize: TYPOGRAPHY.fontSizes['2xl'],
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: COLORS.gray[900],
    marginBottom: 4,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    color: COLORS.gray[600],
  },
  memberCard: {
    backgroundColor: COLORS.white,
    margin: 16,
    marginTop: 8,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  memberHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: TYPOGRAPHY.fontSizes.xl,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: COLORS.white,
  },
  memberInfo: {
    marginLeft: 12,
    flex: 1,
  },
  memberName: {
    fontSize: TYPOGRAPHY.fontSizes.lg,
    fontWeight: TYPOGRAPHY.fontWeights.semibold,
    color: COLORS.gray[900],
  },
  memberRelationship: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    color: COLORS.gray[600],
    marginTop: 2,
  },
  progressStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: TYPOGRAPHY.fontSizes['2xl'],
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: COLORS.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: TYPOGRAPHY.fontSizes.xs,
    color: COLORS.gray[600],
    textAlign: 'center',
  },
  viewButtonContainer: {
    marginTop: 12,
    alignItems: 'center',
  },
  viewButtonText: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    fontWeight: TYPOGRAPHY.fontWeights.medium,
    color: COLORS.primary,
  },
});

export default FamilyLearningScreen;
