/**
 * Member Learning Detail Screen
 *
 * Displays detailed learning progress for a specific family member.
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { COLORS, TYPOGRAPHY } from '@/constants/config';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<any, 'MemberLearningDetail'>;

export const MemberLearningDetailScreen: React.FC<Props> = ({ route }) => {
  const { memberId } = route.params as { memberId: string };
  const [loading, setLoading] = useState(true);
  const [memberData, setMemberData] = useState<any>(null);

  useEffect(() => {
    loadMemberDetail();
  }, [memberId]);

  const loadMemberDetail = async () => {
    try {
      setLoading(true);

      // Mock data - in production this would fetch from API
      const data = {
        id: memberId,
        name: 'Family Member',
        recentContent: [
          { id: '1', title: 'Diabetes Management', date: '2025-10-01', completed: true },
          { id: '2', title: 'Blood Pressure Control', date: '2025-09-28', completed: false },
        ],
        achievements: [
          { id: '1', name: 'First Steps', icon: '🎯', date: '2025-09-15' },
          { id: '2', name: 'Week Warrior', icon: '🔥', date: '2025-09-22' },
        ],
      };

      setMemberData(data);
    } catch (error) {
      console.error('Error loading member detail:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Learning Progress</Text>
        <Text style={styles.subtitle}>Detailed view for {memberData?.name}</Text>

        {/* Recent Content */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Content</Text>
          {memberData?.recentContent.map((item: any) => (
            <View key={item.id} style={styles.contentItem}>
              <Text style={styles.contentTitle}>{item.title}</Text>
              <Text style={styles.contentDate}>{item.date}</Text>
            </View>
          ))}
        </View>

        {/* Achievements */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Achievements</Text>
          {memberData?.achievements.map((achievement: any) => (
            <View key={achievement.id} style={styles.achievementItem}>
              <Text style={styles.achievementIcon}>{achievement.icon}</Text>
              <View>
                <Text style={styles.achievementName}>{achievement.name}</Text>
                <Text style={styles.achievementDate}>{achievement.date}</Text>
              </View>
            </View>
          ))}
        </View>
      </View>
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
  },
  content: {
    padding: 16,
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
    marginBottom: 24,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.fontSizes.lg,
    fontWeight: TYPOGRAPHY.fontWeights.semibold,
    color: COLORS.gray[900],
    marginBottom: 12,
  },
  contentItem: {
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  contentTitle: {
    fontSize: TYPOGRAPHY.fontSizes.base,
    fontWeight: TYPOGRAPHY.fontWeights.medium,
    color: COLORS.gray[900],
  },
  contentDate: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    color: COLORS.gray[600],
    marginTop: 4,
  },
  achievementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  achievementIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  achievementName: {
    fontSize: TYPOGRAPHY.fontSizes.base,
    fontWeight: TYPOGRAPHY.fontWeights.medium,
    color: COLORS.gray[900],
  },
  achievementDate: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    color: COLORS.gray[600],
    marginTop: 2,
  },
});

export default MemberLearningDetailScreen;
