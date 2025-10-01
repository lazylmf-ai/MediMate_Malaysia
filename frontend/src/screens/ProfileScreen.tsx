/**
 * Profile Screen
 * 
 * User profile management with cultural settings.
 * Provides access to cultural preferences and account settings.
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useAppSelector } from '@/store/hooks';
import { COLORS, TYPOGRAPHY } from '@/constants/config';
import type { MainTabScreenProps } from '@/types/navigation';

type Props = MainTabScreenProps<'Profile'>;

export default function ProfileScreen({ navigation }: Props) {
  const { user } = useAppSelector((state) => state.auth);
  const { profile } = useAppSelector((state) => state.cultural);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-MY', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getLanguageName = (code: string) => {
    switch (code) {
      case 'ms': return 'Bahasa Malaysia';
      case 'en': return 'English';
      case 'zh': return '中文 (Chinese)';
      case 'ta': return 'தமிழ் (Tamil)';
      default: return code.toUpperCase();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Profile & Settings</Text>
        </View>

        {/* User Information Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Account Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Name:</Text>
            <Text style={styles.infoValue}>{user?.fullName}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email:</Text>
            <Text style={styles.infoValue}>{user?.email}</Text>
          </View>
          {user?.phoneNumber && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Phone:</Text>
              <Text style={styles.infoValue}>{user.phoneNumber}</Text>
            </View>
          )}
          {user?.icNumber && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>IC Number:</Text>
              <Text style={styles.infoValue}>{user.icNumber}</Text>
            </View>
          )}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Role:</Text>
            <Text style={styles.infoValue}>{user?.healthcareRole || 'Patient'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Joined:</Text>
            <Text style={styles.infoValue}>
              {user?.createdAt ? formatDate(user.createdAt) : 'N/A'}
            </Text>
          </View>
        </View>

        {/* Cultural Preferences Card */}
        {profile && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Cultural Preferences</Text>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Language:</Text>
              <Text style={styles.infoValue}>{getLanguageName(profile.language)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Prayer Times:</Text>
              <Text style={styles.infoValue}>
                {profile.prayerTimes.enabled ? 'Enabled' : 'Disabled'}
              </Text>
            </View>
            {profile.prayerTimes.enabled && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Madhab:</Text>
                <Text style={styles.infoValue}>{profile.prayerTimes.madhab}</Text>
              </View>
            )}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Primary Caregiver:</Text>
              <Text style={styles.infoValue}>
                {profile.familyStructure.primaryCaregiver ? 'Yes' : 'No'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Elderly Members:</Text>
              <Text style={styles.infoValue}>{profile.familyStructure.elderlyMembers}</Text>
            </View>
          </View>
        )}

        {/* Settings Options */}
        <View style={styles.settingsContainer}>
          <Text style={styles.sectionTitle}>Settings</Text>
          
          <TouchableOpacity
            style={styles.settingButton}
            onPress={() => {
              // TODO: Navigate to cultural settings in future tasks
              console.log('Navigate to cultural settings');
            }}
          >
            <Text style={styles.settingButtonText}>Cultural Settings</Text>
            <Text style={styles.settingButtonSubtext}>
              Language, prayer times, festivals
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingButton}
            onPress={() => {
              // TODO: Navigate to language preferences in future tasks
              console.log('Navigate to language preferences');
            }}
          >
            <Text style={styles.settingButtonText}>Language Preferences</Text>
            <Text style={styles.settingButtonSubtext}>
              Change app language and regional settings
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.settingButton}
            onPress={() => {
              // TODO: Navigate to family structure in future tasks
              console.log('Navigate to family structure');
            }}
          >
            <Text style={styles.settingButtonText}>Family Structure</Text>
            <Text style={styles.settingButtonSubtext}>
              Manage family members and caregiving roles
            </Text>
          </TouchableOpacity>
        </View>

        {/* Security Status */}
        <View style={styles.statusCard}>
          <Text style={styles.statusTitle}>Security Status</Text>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>Account Verified</Text>
            <View style={[
              styles.statusBadge, 
              { backgroundColor: user?.isVerified ? COLORS.success : COLORS.warning }
            ]}>
              <Text style={styles.statusBadgeText}>
                {user?.isVerified ? 'Verified' : 'Unverified'}
              </Text>
            </View>
          </View>
          <View style={styles.statusRow}>
            <Text style={styles.statusLabel}>MFA Enabled</Text>
            <View style={[
              styles.statusBadge, 
              { backgroundColor: user?.mfaEnabled ? COLORS.success : COLORS.error }
            ]}>
              <Text style={styles.statusBadgeText}>
                {user?.mfaEnabled ? 'Enabled' : 'Disabled'}
              </Text>
            </View>
          </View>
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
    marginBottom: 24,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSizes['2xl'],
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: COLORS.gray[900],
  },
  card: {
    backgroundColor: COLORS.white,
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
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
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  infoLabel: {
    fontSize: TYPOGRAPHY.fontSizes.base,
    color: COLORS.gray[600],
    fontWeight: TYPOGRAPHY.fontWeights.medium,
  },
  infoValue: {
    fontSize: TYPOGRAPHY.fontSizes.base,
    color: COLORS.gray[900],
    flex: 1,
    textAlign: 'right',
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.fontSizes.lg,
    fontWeight: TYPOGRAPHY.fontWeights.semibold,
    color: COLORS.gray[900],
    marginBottom: 16,
  },
  settingsContainer: {
    marginVertical: 16,
  },
  settingButton: {
    backgroundColor: COLORS.white,
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  settingButtonText: {
    fontSize: TYPOGRAPHY.fontSizes.base,
    fontWeight: TYPOGRAPHY.fontWeights.medium,
    color: COLORS.gray[900],
    marginBottom: 4,
  },
  settingButtonSubtext: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    color: COLORS.gray[600],
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
    marginBottom: 16,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusLabel: {
    fontSize: TYPOGRAPHY.fontSizes.base,
    color: COLORS.gray[700],
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  statusBadgeText: {
    fontSize: TYPOGRAPHY.fontSizes.xs,
    fontWeight: TYPOGRAPHY.fontWeights.semibold,
    color: COLORS.white,
  },
});