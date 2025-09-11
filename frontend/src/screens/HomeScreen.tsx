/**
 * Home Screen
 * 
 * Main dashboard for authenticated users showing medication overview,
 * prayer times, and quick actions.
 */

import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { logoutUser } from '@/store/slices/authSlice';
import { loadCulturalProfile } from '@/store/slices/culturalSlice';
import { COLORS, TYPOGRAPHY } from '@/constants/config';
import type { MainTabScreenProps } from '@/types/navigation';

type Props = MainTabScreenProps<'Home'>;

export default function HomeScreen({ navigation }: Props) {
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { profile } = useAppSelector((state) => state.cultural);

  useEffect(() => {
    // Load cultural profile on screen mount
    dispatch(loadCulturalProfile());
  }, []);

  const handleLogout = async () => {
    await dispatch(logoutUser());
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    const language = profile?.language || 'en';
    
    if (hour < 12) {
      switch (language) {
        case 'ms': return 'Selamat Pagi';
        case 'zh': return '早上好';
        case 'ta': return 'காலை வணக்கம்';
        default: return 'Good Morning';
      }
    } else if (hour < 18) {
      switch (language) {
        case 'ms': return 'Selamat Petang';
        case 'zh': return '下午好';
        case 'ta': return 'மதிய வணக்கம்';
        default: return 'Good Afternoon';
      }
    } else {
      switch (language) {
        case 'ms': return 'Selamat Malam';
        case 'zh': return '晚上好';
        case 'ta': return 'மாலை வணக்கம்';
        default: return 'Good Evening';
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.userName}>{user?.fullName}</Text>
          </View>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={handleLogout}
          >
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Welcome Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Welcome to MediMate Malaysia</Text>
          <Text style={styles.cardText}>
            Your culturally-intelligent medication management companion is ready to help.
          </Text>
          
          {profile && (
            <View style={styles.profileInfo}>
              <Text style={styles.profileText}>
                Language: {profile.language.toUpperCase()}
              </Text>
              {profile.prayerTimes.enabled && (
                <Text style={styles.profileText}>
                  Prayer time reminders enabled
                </Text>
              )}
            </View>
          )}
        </View>

        {/* Quick Actions */}
        <View style={styles.actionsContainer}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: COLORS.primary }]}
            onPress={() => navigation.navigate('Medications')}
          >
            <Text style={styles.actionButtonText}>Manage Medications</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: COLORS.secondary }]}
            onPress={() => navigation.navigate('Family')}
          >
            <Text style={styles.actionButtonText}>Family Circle</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: COLORS.accent }]}
            onPress={() => navigation.navigate('Profile')}
          >
            <Text style={styles.actionButtonText}>Cultural Settings</Text>
          </TouchableOpacity>
        </View>

        {/* Status Info */}
        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>Account Status</Text>
          <Text style={styles.statusText}>
            Role: {user?.healthcareRole || 'patient'}
          </Text>
          <Text style={styles.statusText}>
            Account verified: {user?.isVerified ? 'Yes' : 'No'}
          </Text>
          <Text style={styles.statusText}>
            MFA enabled: {user?.mfaEnabled ? 'Yes' : 'No'}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray[50],
  },
  scrollContent: {
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  greeting: {
    fontSize: TYPOGRAPHY.fontSizes.lg,
    color: COLORS.gray[600],
    marginBottom: 4,
  },
  userName: {
    fontSize: TYPOGRAPHY.fontSizes['2xl'],
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: COLORS.gray[900],
  },
  logoutButton: {
    backgroundColor: COLORS.error,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  logoutText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSizes.sm,
    fontWeight: TYPOGRAPHY.fontWeights.medium,
  },
  card: {
    backgroundColor: COLORS.white,
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: TYPOGRAPHY.fontSizes.lg,
    fontWeight: TYPOGRAPHY.fontWeights.semibold,
    color: COLORS.gray[900],
    marginBottom: 8,
  },
  cardText: {
    fontSize: TYPOGRAPHY.fontSizes.base,
    color: COLORS.gray[600],
    lineHeight: 24,
    marginBottom: 16,
  },
  profileInfo: {
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
    paddingTop: 16,
  },
  profileText: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    color: COLORS.gray[700],
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.fontSizes.lg,
    fontWeight: TYPOGRAPHY.fontWeights.semibold,
    color: COLORS.gray[900],
    marginBottom: 16,
  },
  actionsContainer: {
    marginBottom: 24,
  },
  actionButton: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    alignItems: 'center',
  },
  actionButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSizes.base,
    fontWeight: TYPOGRAPHY.fontWeights.semibold,
  },
  statusCard: {
    backgroundColor: COLORS.white,
    padding: 20,
    borderRadius: 12,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusTitle: {
    fontSize: TYPOGRAPHY.fontSizes.lg,
    fontWeight: TYPOGRAPHY.fontWeights.semibold,
    color: COLORS.gray[900],
    marginBottom: 12,
  },
  statusText: {
    fontSize: TYPOGRAPHY.fontSizes.base,
    color: COLORS.gray[600],
    marginBottom: 8,
  },
});