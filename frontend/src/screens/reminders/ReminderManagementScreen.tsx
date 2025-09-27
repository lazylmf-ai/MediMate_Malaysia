/**
 * Reminder Management Screen
 *
 * Main screen for managing medication reminders with:
 * - Upcoming reminders display
 * - Missed reminders management
 * - Reminder settings configuration
 * - Cultural-aware reminder controls
 * - Offline queue status
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Switch,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAppSelector } from '@/store/hooks';
import { useMedicationReminders } from '@/hooks/medication/useMedicationReminders';
import { useNetworkStatus } from '@/hooks/common/useNetworkStatus';
import { COLORS, TYPOGRAPHY } from '@/constants/config';
import { ReminderCard } from '@/components/reminders/ReminderCard';
import { OfflineQueueStatus } from '@/components/reminders/OfflineQueueStatus';
import { CulturalReminderSettings } from '@/components/reminders/CulturalReminderSettings';
import type { MainTabScreenProps } from '@/types/navigation';

type Props = MainTabScreenProps<'Reminders'>;

interface ReminderStats {
  total: number;
  upcoming: number;
  missed: number;
  acknowledged: number;
  snoozed: number;
}

export default function ReminderManagementScreen({ navigation }: Props) {
  const { user } = useAppSelector((state) => state.auth);
  const { profile } = useAppSelector((state) => state.cultural);
  const { isConnected, connectionType } = useNetworkStatus();

  const {
    scheduledReminders,
    settings,
    activeNotifications,
    adherenceRecords,
    isLoading,
    error,
    getUpcomingReminders,
    getMissedReminders,
    acknowledgeReminder,
    snoozeReminder,
    updateReminderSettings,
    clearMedicationReminders,
  } = useMedicationReminders();

  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'upcoming' | 'missed' | 'settings'>('upcoming');
  const [reminderStats, setReminderStats] = useState<ReminderStats>({
    total: 0,
    upcoming: 0,
    missed: 0,
    acknowledged: 0,
    snoozed: 0,
  });

  // Calculate reminder statistics
  const calculateStats = useCallback(() => {
    const stats: ReminderStats = {
      total: scheduledReminders.length,
      upcoming: getUpcomingReminders().length,
      missed: getMissedReminders().length,
      acknowledged: scheduledReminders.filter(r => r.status === 'acknowledged').length,
      snoozed: scheduledReminders.filter(r => r.status === 'snoozed').length,
    };
    setReminderStats(stats);
  }, [scheduledReminders, getUpcomingReminders, getMissedReminders]);

  useEffect(() => {
    calculateStats();
  }, [calculateStats]);

  // Refresh data
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      // In a real implementation, this would sync with the server
      calculateStats();
    } catch (error) {
      console.error('Failed to refresh reminders:', error);
    }
    setRefreshing(false);
  }, [calculateStats]);

  // Handle reminder acknowledgment
  const handleAcknowledgeReminder = useCallback(async (reminderId: string) => {
    try {
      const adherenceRecord = acknowledgeReminder(reminderId);
      Alert.alert(
        getLocalizedText('success', 'Success'),
        getLocalizedText('reminderAcknowledged', 'Reminder acknowledged successfully'),
        [{ text: getLocalizedText('ok', 'OK') }]
      );
    } catch (error) {
      Alert.alert(
        getLocalizedText('error', 'Error'),
        getLocalizedText('reminderAcknowledgeError', 'Failed to acknowledge reminder'),
        [{ text: getLocalizedText('ok', 'OK') }]
      );
    }
  }, [acknowledgeReminder]);

  // Handle reminder snooze
  const handleSnoozeReminder = useCallback(async (reminderId: string) => {
    try {
      const success = snoozeReminder(reminderId);
      if (success) {
        Alert.alert(
          getLocalizedText('snoozed', 'Snoozed'),
          getLocalizedText('reminderSnoozed', `Reminder snoozed for ${settings.snoozeMinutes} minutes`),
          [{ text: getLocalizedText('ok', 'OK') }]
        );
      } else {
        Alert.alert(
          getLocalizedText('error', 'Error'),
          getLocalizedText('maxSnoozeReached', 'Maximum snooze count reached'),
          [{ text: getLocalizedText('ok', 'OK') }]
        );
      }
    } catch (error) {
      Alert.alert(
        getLocalizedText('error', 'Error'),
        getLocalizedText('reminderSnoozeError', 'Failed to snooze reminder'),
        [{ text: getLocalizedText('ok', 'OK') }]
      );
    }
  }, [snoozeReminder, settings.snoozeMinutes]);

  // Get localized text based on user's cultural profile
  const getLocalizedText = useCallback((key: string, defaultText: string): string => {
    const language = profile?.language || 'en';

    const translations: Record<string, Record<string, string>> = {
      en: {
        reminderManagement: 'Reminder Management',
        upcoming: 'Upcoming',
        missed: 'Missed',
        settings: 'Settings',
        offlineMode: 'Offline Mode',
        connected: 'Connected',
        noUpcomingReminders: 'No upcoming reminders',
        noMissedReminders: 'No missed reminders',
        success: 'Success',
        error: 'Error',
        ok: 'OK',
        reminderAcknowledged: 'Reminder acknowledged successfully',
        reminderAcknowledgeError: 'Failed to acknowledge reminder',
        snoozed: 'Snoozed',
        reminderSnoozed: 'Reminder snoozed for',
        reminderSnoozeError: 'Failed to snooze reminder',
        maxSnoozeReached: 'Maximum snooze count reached',
        enableReminders: 'Enable Reminders',
        soundEnabled: 'Sound Enabled',
        vibrationEnabled: 'Vibration Enabled',
        culturalSettings: 'Cultural Settings',
        minutes: 'minutes',
      },
      ms: {
        reminderManagement: 'Pengurusan Peringatan',
        upcoming: 'Akan Datang',
        missed: 'Terlepas',
        settings: 'Tetapan',
        offlineMode: 'Mod Luar Talian',
        connected: 'Bersambung',
        noUpcomingReminders: 'Tiada peringatan akan datang',
        noMissedReminders: 'Tiada peringatan terlepas',
        success: 'Berjaya',
        error: 'Ralat',
        ok: 'OK',
        reminderAcknowledged: 'Peringatan telah diakui',
        reminderAcknowledgeError: 'Gagal mengakui peringatan',
        snoozed: 'Ditunda',
        reminderSnoozed: 'Peringatan ditunda selama',
        reminderSnoozeError: 'Gagal menunda peringatan',
        maxSnoozeReached: 'Had maksimum penangguhan dicapai',
        enableReminders: 'Aktifkan Peringatan',
        soundEnabled: 'Bunyi Diaktifkan',
        vibrationEnabled: 'Getaran Diaktifkan',
        culturalSettings: 'Tetapan Budaya',
        minutes: 'minit',
      },
      zh: {
        reminderManagement: '提醒管理',
        upcoming: '即将到来',
        missed: '错过的',
        settings: '设置',
        offlineMode: '离线模式',
        connected: '已连接',
        noUpcomingReminders: '没有即将到来的提醒',
        noMissedReminders: '没有错过的提醒',
        success: '成功',
        error: '错误',
        ok: '确定',
        reminderAcknowledged: '提醒已确认',
        reminderAcknowledgeError: '确认提醒失败',
        snoozed: '已延迟',
        reminderSnoozed: '提醒已延迟',
        reminderSnoozeError: '延迟提醒失败',
        maxSnoozeReached: '已达到最大延迟次数',
        enableReminders: '启用提醒',
        soundEnabled: '启用声音',
        vibrationEnabled: '启用振动',
        culturalSettings: '文化设置',
        minutes: '分钟',
      },
      ta: {
        reminderManagement: 'நினைவூட்டல் நிர்வாகம்',
        upcoming: 'வரவிருக்கும்',
        missed: 'தவறவிட்ட',
        settings: 'அமைப்புகள்',
        offlineMode: 'ஆஃப்லைன் பயன்முறை',
        connected: 'இணைக்கப்பட்டுள்ளது',
        noUpcomingReminders: 'வரவிருக்கும் நினைவூட்டல்கள் இல்லை',
        noMissedReminders: 'தவறவிட்ட நினைவூட்டல்கள் இல்லை',
        success: 'வெற்றி',
        error: 'பிழை',
        ok: 'சரி',
        reminderAcknowledged: 'நினைவூட்டல் ஒப்புக்கொள்ளப்பட்டது',
        reminderAcknowledgeError: 'நினைவூட்டலை ஒப்புக்கொள்ள முடியவில்லை',
        snoozed: 'ஒத்திவைக்கப்பட்டது',
        reminderSnoozed: 'நினைவூட்டல் ஒத்திவைக்கப்பட்டது',
        reminderSnoozeError: 'நினைவூட்டலை ஒத்திவைக்க முடியவில்லை',
        maxSnoozeReached: 'அதிகபட்ச ஒத்திவைப்பு எண்ணிக்கை அடைந்தது',
        enableReminders: 'நினைவூட்டல்களை இயக்கு',
        soundEnabled: 'ஒலி இயக்கப்பட்டது',
        vibrationEnabled: 'அதிர்வு இயக்கப்பட்டது',
        culturalSettings: 'கலாச்சார அமைப்புகள்',
        minutes: 'நிமிடங்கள்',
      },
    };

    return translations[language]?.[key] || defaultText;
  }, [profile?.language]);

  // Get cultural greeting
  const getCulturalGreeting = useCallback((): string => {
    const language = profile?.language || 'en';
    const hour = new Date().getHours();

    if (hour < 12) {
      switch (language) {
        case 'ms': return 'Selamat Pagi';
        case 'zh': return '早上好';
        case 'ta': return 'காலை வணக்கம்';
        default: return 'Good Morning';
      }
    } else if (hour < 18) {
      switch (language) {
        case 'ms': return 'Selamat Tengahari';
        case 'zh': return '下午好';
        case 'ta': return 'மதிய வணக்கம்';
        default: return 'Good Afternoon';
      }
    } else {
      switch (language) {
        case 'ms': return 'Selamat Petang';
        case 'zh': return '晚上好';
        case 'ta': return 'மாலை வணக்கம்';
        default: return 'Good Evening';
      }
    }
  }, [profile?.language]);

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'upcoming':
        const upcomingReminders = getUpcomingReminders();
        return (
          <View style={styles.tabContent}>
            {upcomingReminders.length > 0 ? (
              upcomingReminders.map((reminder) => (
                <ReminderCard
                  key={reminder.id}
                  reminder={reminder}
                  onAcknowledge={() => handleAcknowledgeReminder(reminder.id)}
                  onSnooze={() => handleSnoozeReminder(reminder.id)}
                  language={profile?.language || 'en'}
                />
              ))
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="checkmark-circle-outline" size={48} color={COLORS.success} />
                <Text style={styles.emptyStateText}>
                  {getLocalizedText('noUpcomingReminders', 'No upcoming reminders')}
                </Text>
              </View>
            )}
          </View>
        );

      case 'missed':
        const missedReminders = getMissedReminders();
        return (
          <View style={styles.tabContent}>
            {missedReminders.length > 0 ? (
              missedReminders.map((reminder) => (
                <ReminderCard
                  key={reminder.id}
                  reminder={reminder}
                  onAcknowledge={() => handleAcknowledgeReminder(reminder.id)}
                  onSnooze={() => handleSnoozeReminder(reminder.id)}
                  language={profile?.language || 'en'}
                  isMissed={true}
                />
              ))
            ) : (
              <View style={styles.emptyState}>
                <Ionicons name="checkmark-circle-outline" size={48} color={COLORS.success} />
                <Text style={styles.emptyStateText}>
                  {getLocalizedText('noMissedReminders', 'No missed reminders')}
                </Text>
              </View>
            )}
          </View>
        );

      case 'settings':
        return (
          <View style={styles.tabContent}>
            <View style={styles.settingsSection}>
              <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>
                  {getLocalizedText('enableReminders', 'Enable Reminders')}
                </Text>
                <Switch
                  value={settings.enabled}
                  onValueChange={(value) => updateReminderSettings({ enabled: value })}
                  trackColor={{ false: COLORS.lightGray, true: COLORS.primary }}
                  thumbColor={settings.enabled ? COLORS.white : COLORS.gray}
                />
              </View>

              <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>
                  {getLocalizedText('soundEnabled', 'Sound Enabled')}
                </Text>
                <Switch
                  value={settings.soundEnabled}
                  onValueChange={(value) => updateReminderSettings({ soundEnabled: value })}
                  trackColor={{ false: COLORS.lightGray, true: COLORS.primary }}
                  thumbColor={settings.soundEnabled ? COLORS.white : COLORS.gray}
                />
              </View>

              <View style={styles.settingItem}>
                <Text style={styles.settingLabel}>
                  {getLocalizedText('vibrationEnabled', 'Vibration Enabled')}
                </Text>
                <Switch
                  value={settings.vibrationEnabled}
                  onValueChange={(value) => updateReminderSettings({ vibrationEnabled: value })}
                  trackColor={{ false: COLORS.lightGray, true: COLORS.primary }}
                  thumbColor={settings.vibrationEnabled ? COLORS.white : COLORS.gray}
                />
              </View>
            </View>

            <CulturalReminderSettings
              settings={settings}
              culturalProfile={profile}
              onUpdateSettings={updateReminderSettings}
              language={profile?.language || 'en'}
            />
          </View>
        );

      default:
        return null;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>
            {getLocalizedText('reminderManagement', 'Reminder Management')}
          </Text>
          <Text style={styles.greeting}>
            {getCulturalGreeting()}, {user?.displayName || 'User'}
          </Text>
        </View>

        <OfflineQueueStatus
          isConnected={isConnected}
          connectionType={connectionType}
          queuedReminders={scheduledReminders.filter(r => r.status === 'pending').length}
          language={profile?.language || 'en'}
        />
      </View>

      {/* Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{reminderStats.upcoming}</Text>
          <Text style={styles.statLabel}>{getLocalizedText('upcoming', 'Upcoming')}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: COLORS.warning }]}>{reminderStats.missed}</Text>
          <Text style={styles.statLabel}>{getLocalizedText('missed', 'Missed')}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={[styles.statNumber, { color: COLORS.success }]}>{reminderStats.acknowledged}</Text>
          <Text style={styles.statLabel}>Taken</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabContainer}>
        {(['upcoming', 'missed', 'settings'] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.activeTab]}
            onPress={() => setActiveTab(tab)}
          >
            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
              {getLocalizedText(tab, tab.charAt(0).toUpperCase() + tab.slice(1))}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        {renderTabContent()}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    backgroundColor: COLORS.white,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  headerContent: {
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  greeting: {
    fontSize: 16,
    color: COLORS.textLight,
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: COLORS.textLight,
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.textLight,
  },
  activeTabText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    padding: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: COLORS.textLight,
    marginTop: 12,
    textAlign: 'center',
  },
  settingsSection: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  settingLabel: {
    fontSize: 16,
    color: COLORS.text,
    flex: 1,
  },
});