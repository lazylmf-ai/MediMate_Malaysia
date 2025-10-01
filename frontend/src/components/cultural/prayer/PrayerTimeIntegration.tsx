/**
 * Prayer Time Integration Component
 *
 * Mobile interface for integrating prayer times with medication scheduling,
 * showing optimal medication timing windows and prayer time conflicts.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Switch,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePrayerTimeIntegration } from '../../../hooks/cultural';
import { useTranslation } from '../../../i18n';
import type {
  PrayerTimes,
  MedicationSchedulingWindow,
  PrayerConflict
} from '../../../services/prayer-scheduling/PrayerTimeService';

export interface PrayerTimeIntegrationProps {
  medicationTimes?: Date[];
  onMedicationReschedule?: (originalTime: Date, suggestedTime: Date) => void;
  onPrayerSettingsChange?: (settings: PrayerSettings) => void;
  showQiblaDirection?: boolean;
  theme?: 'light' | 'dark';
}

interface PrayerSettings {
  enabled: boolean;
  bufferMinutes: number;
  madhab: 'shafi' | 'hanafi';
  notifications: boolean;
  autoReschedule: boolean;
}

export const PrayerTimeIntegration: React.FC<PrayerTimeIntegrationProps> = ({
  medicationTimes = [],
  onMedicationReschedule,
  onPrayerSettingsChange,
  showQiblaDirection = true,
  theme = 'light'
}) => {
  const {
    prayerTimes,
    schedulingWindows,
    conflicts,
    nextPrayer,
    qiblaDirection,
    isLoading,
    error,
    refreshPrayerTimes,
    checkConflicts,
    getMedicationWindows
  } = usePrayerTimeIntegration();

  const { t, tMedical, tCultural } = useTranslation();

  const [prayerSettings, setPrayerSettings] = useState<PrayerSettings>({
    enabled: true,
    bufferMinutes: 30,
    madhab: 'shafi',
    notifications: true,
    autoReschedule: false
  });

  const [showSettings, setShowSettings] = useState(false);
  const [selectedConflict, setSelectedConflict] = useState<PrayerConflict | null>(null);

  const styles = createStyles(theme);

  useEffect(() => {
    if (medicationTimes.length > 0 && prayerTimes) {
      checkConflicts(medicationTimes, prayerTimes, prayerSettings.bufferMinutes);
    }
  }, [medicationTimes, prayerTimes, prayerSettings.bufferMinutes, checkConflicts]);

  /**
   * Handle prayer settings change
   */
  const handleSettingsChange = useCallback((newSettings: Partial<PrayerSettings>) => {
    const updatedSettings = { ...prayerSettings, ...newSettings };
    setPrayerSettings(updatedSettings);
    onPrayerSettingsChange?.(updatedSettings);
  }, [prayerSettings, onPrayerSettingsChange]);

  /**
   * Handle medication rescheduling
   */
  const handleReschedule = useCallback((conflict: PrayerConflict) => {
    if (!conflict.suggestedAlternative) return;

    Alert.alert(
      t('prayer.reschedule_title'),
      t('prayer.reschedule_message', {
        originalTime: conflict.time.toLocaleTimeString('en-MY', {
          hour: '2-digit',
          minute: '2-digit'
        }),
        prayerName: tCultural(`prayer.${conflict.prayerName}`),
        suggestedTime: conflict.suggestedAlternative.toLocaleTimeString('en-MY', {
          hour: '2-digit',
          minute: '2-digit'
        })
      }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.reschedule'),
          onPress: () => {
            onMedicationReschedule?.(conflict.time, conflict.suggestedAlternative!);
          }
        }
      ]
    );
  }, [t, tCultural, onMedicationReschedule]);

  /**
   * Get time until next prayer
   */
  const getTimeUntilNextPrayer = useCallback((): string => {
    if (!nextPrayer) return '';

    const now = new Date();
    const diffMs = nextPrayer.time.getTime() - now.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return t('prayer.time_until', { hours, minutes });
    }
    return t('prayer.minutes_until', { minutes });
  }, [nextPrayer, t]);

  /**
   * Get prayer time display name
   */
  const getPrayerDisplayName = useCallback((prayerName: string): string => {
    return tCultural(`prayer.${prayerName}`);
  }, [tCultural]);

  /**
   * Get conflict severity color
   */
  const getConflictColor = useCallback((severity: 'high' | 'medium' | 'low'): string => {
    switch (severity) {
      case 'high': return '#DC3545';
      case 'medium': return '#FD7E14';
      case 'low': return '#FFC107';
      default: return '#6C757D';
    }
  }, []);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#28A745" />
        <Text style={styles.loadingText}>{t('prayer.loading')}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#DC3545" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={refreshPrayerTimes}>
          <Text style={styles.retryText}>{t('common.retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!prayerTimes) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{t('prayer.no_data')}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Ionicons name="moon-outline" size={24} color="#28A745" />
          <Text style={styles.title}>{t('prayer.integration_title')}</Text>
        </View>
        <TouchableOpacity
          style={styles.settingsButton}
          onPress={() => setShowSettings(true)}
        >
          <Ionicons name="settings-outline" size={24} color={theme === 'dark' ? '#FFFFFF' : '#2C2C2E'} />
        </TouchableOpacity>
      </View>

      {/* Next Prayer Card */}
      {nextPrayer && (
        <View style={styles.nextPrayerCard}>
          <View style={styles.nextPrayerHeader}>
            <Text style={styles.nextPrayerTitle}>{t('prayer.next_prayer')}</Text>
            <Text style={styles.timeUntil}>{getTimeUntilNextPrayer()}</Text>
          </View>
          <View style={styles.nextPrayerInfo}>
            <Text style={styles.prayerName}>
              {getPrayerDisplayName(nextPrayer.name)}
            </Text>
            <Text style={styles.prayerTime}>
              {nextPrayer.time.toLocaleTimeString('en-MY', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </Text>
          </View>
          {showQiblaDirection && qiblaDirection && (
            <View style={styles.qiblaContainer}>
              <Ionicons name="compass-outline" size={16} color="#8E8E93" />
              <Text style={styles.qiblaText}>
                {t('prayer.qibla_direction', { direction: qiblaDirection })}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Conflicts Alert */}
      {conflicts.length > 0 && (
        <View style={styles.conflictsSection}>
          <View style={styles.conflictsHeader}>
            <Ionicons name="warning-outline" size={20} color="#FD7E14" />
            <Text style={styles.conflictsTitle}>
              {t('prayer.conflicts_found', { count: conflicts.length })}
            </Text>
          </View>
          {conflicts.map((conflict, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.conflictItem, {
                borderLeftColor: getConflictColor(conflict.severity)
              }]}
              onPress={() => setSelectedConflict(conflict)}
            >
              <View style={styles.conflictContent}>
                <Text style={styles.conflictTime}>
                  {conflict.time.toLocaleTimeString('en-MY', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Text>
                <Text style={styles.conflictPrayer}>
                  {t('prayer.conflicts_with', {
                    prayer: getPrayerDisplayName(conflict.prayerName)
                  })}
                </Text>
                <View style={styles.severityContainer}>
                  <View style={[styles.severityDot, {
                    backgroundColor: getConflictColor(conflict.severity)
                  }]} />
                  <Text style={styles.severityText}>
                    {t(`prayer.severity_${conflict.severity}`)}
                  </Text>
                </View>
              </View>
              {conflict.suggestedAlternative && (
                <TouchableOpacity
                  style={styles.rescheduleButton}
                  onPress={() => handleReschedule(conflict)}
                >
                  <Text style={styles.rescheduleText}>{t('prayer.reschedule')}</Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Today's Prayer Times */}
      <View style={styles.prayerTimesSection}>
        <Text style={styles.sectionTitle}>{t('prayer.todays_times')}</Text>
        <View style={styles.prayerTimesGrid}>
          {Object.entries(prayerTimes).map(([name, time]) => {
            if (name === 'qibla' || !time) return null;

            const isNext = nextPrayer?.name === name;
            const hasConflict = conflicts.some(c => c.prayerName === name);

            return (
              <View
                key={name}
                style={[
                  styles.prayerTimeCard,
                  isNext && styles.nextPrayerHighlight,
                  hasConflict && styles.conflictHighlight
                ]}
              >
                <Text style={[
                  styles.prayerCardName,
                  isNext && styles.nextPrayerText
                ]}>
                  {getPrayerDisplayName(name)}
                </Text>
                <Text style={[
                  styles.prayerCardTime,
                  isNext && styles.nextPrayerText
                ]}>
                  {(time as Date).toLocaleTimeString('en-MY', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Text>
                {hasConflict && (
                  <Ionicons name="warning" size={12} color="#FD7E14" style={styles.conflictIcon} />
                )}
              </View>
            );
          })}
        </View>
      </View>

      {/* Optimal Medication Windows */}
      {schedulingWindows.length > 0 && (
        <View style={styles.windowsSection}>
          <Text style={styles.sectionTitle}>{t('prayer.optimal_windows')}</Text>
          {schedulingWindows.slice(0, 3).map((window, index) => {
            const duration = Math.round(
              (window.endTime.getTime() - window.startTime.getTime()) / (1000 * 60)
            );

            return (
              <View key={index} style={styles.windowItem}>
                <View style={styles.windowHeader}>
                  <Text style={styles.windowType}>
                    {t(`prayer.window_${window.type}`)}
                  </Text>
                  <Text style={styles.windowDuration}>
                    {t('prayer.duration_minutes', { minutes: duration })}
                  </Text>
                </View>
                <Text style={styles.windowTime}>
                  {window.startTime.toLocaleTimeString('en-MY', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })} - {window.endTime.toLocaleTimeString('en-MY', {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Text>
                {window.prayerName && (
                  <Text style={styles.windowPrayer}>
                    {t('prayer.relative_to', {
                      prayer: getPrayerDisplayName(window.prayerName)
                    })}
                  </Text>
                )}
              </View>
            );
          })}
        </View>
      )}

      {/* Settings Modal */}
      <Modal
        visible={showSettings}
        animationType="slide"
        presentationStyle="formSheet"
        onRequestClose={() => setShowSettings(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('prayer.settings_title')}</Text>
            <TouchableOpacity onPress={() => setShowSettings(false)}>
              <Ionicons name="close" size={24} color={theme === 'dark' ? '#FFFFFF' : '#2C2C2E'} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Enable Prayer Integration */}
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>{t('prayer.enable_integration')}</Text>
              <Switch
                value={prayerSettings.enabled}
                onValueChange={(enabled) => handleSettingsChange({ enabled })}
                trackColor={{ false: '#767577', true: '#28A745' }}
                thumbColor={prayerSettings.enabled ? '#FFFFFF' : '#f4f3f4'}
              />
            </View>

            {/* Buffer Minutes */}
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>{t('prayer.buffer_minutes')}</Text>
              <View style={styles.bufferControls}>
                <TouchableOpacity
                  style={styles.bufferButton}
                  onPress={() => handleSettingsChange({
                    bufferMinutes: Math.max(15, prayerSettings.bufferMinutes - 15)
                  })}
                >
                  <Ionicons name="remove" size={20} color="#007BFF" />
                </TouchableOpacity>
                <Text style={styles.bufferValue}>{prayerSettings.bufferMinutes}min</Text>
                <TouchableOpacity
                  style={styles.bufferButton}
                  onPress={() => handleSettingsChange({
                    bufferMinutes: Math.min(60, prayerSettings.bufferMinutes + 15)
                  })}
                >
                  <Ionicons name="add" size={20} color="#007BFF" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Madhab Selection */}
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>{t('prayer.madhab')}</Text>
              <View style={styles.madhabSelection}>
                <TouchableOpacity
                  style={[
                    styles.madhabButton,
                    prayerSettings.madhab === 'shafi' && styles.selectedMadhab
                  ]}
                  onPress={() => handleSettingsChange({ madhab: 'shafi' })}
                >
                  <Text style={[
                    styles.madhabText,
                    prayerSettings.madhab === 'shafi' && styles.selectedMadhabText
                  ]}>
                    {t('prayer.shafi')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.madhabButton,
                    prayerSettings.madhab === 'hanafi' && styles.selectedMadhab
                  ]}
                  onPress={() => handleSettingsChange({ madhab: 'hanafi' })}
                >
                  <Text style={[
                    styles.madhabText,
                    prayerSettings.madhab === 'hanafi' && styles.selectedMadhabText
                  ]}>
                    {t('prayer.hanafi')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Notifications */}
            <View style={styles.settingRow}>
              <Text style={styles.settingLabel}>{t('prayer.notifications')}</Text>
              <Switch
                value={prayerSettings.notifications}
                onValueChange={(notifications) => handleSettingsChange({ notifications })}
                trackColor={{ false: '#767577', true: '#28A745' }}
                thumbColor={prayerSettings.notifications ? '#FFFFFF' : '#f4f3f4'}
              />
            </View>

            {/* Auto Reschedule */}
            <View style={styles.settingRow}>
              <View style={styles.settingLabelContainer}>
                <Text style={styles.settingLabel}>{t('prayer.auto_reschedule')}</Text>
                <Text style={styles.settingDescription}>
                  {t('prayer.auto_reschedule_description')}
                </Text>
              </View>
              <Switch
                value={prayerSettings.autoReschedule}
                onValueChange={(autoReschedule) => handleSettingsChange({ autoReschedule })}
                trackColor={{ false: '#767577', true: '#28A745' }}
                thumbColor={prayerSettings.autoReschedule ? '#FFFFFF' : '#f4f3f4'}
              />
            </View>
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
};

const createStyles = (theme: 'light' | 'dark') => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme === 'dark' ? '#1C1C1E' : '#F2F2F7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme === 'dark' ? '#1C1C1E' : '#F2F2F7',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme === 'dark' ? '#FFFFFF' : '#2C2C2E',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme === 'dark' ? '#1C1C1E' : '#F2F2F7',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#DC3545',
    textAlign: 'center',
    marginVertical: 16,
  },
  retryButton: {
    backgroundColor: '#28A745',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: theme === 'dark' ? '#2C2C2E' : '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: theme === 'dark' ? '#3C3C3E' : '#E5E5EA',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme === 'dark' ? '#FFFFFF' : '#2C2C2E',
    marginLeft: 12,
  },
  settingsButton: {
    padding: 8,
  },
  nextPrayerCard: {
    margin: 16,
    padding: 16,
    backgroundColor: '#28A745',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  nextPrayerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  nextPrayerTitle: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.9,
  },
  timeUntil: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.8,
  },
  nextPrayerInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  prayerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  prayerTime: {
    fontSize: 16,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  qiblaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  qiblaText: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.8,
    marginLeft: 4,
  },
  conflictsSection: {
    margin: 16,
    marginTop: 8,
    padding: 16,
    backgroundColor: theme === 'dark' ? '#2C2C2E' : '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  conflictsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  conflictsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FD7E14',
    marginLeft: 8,
  },
  conflictItem: {
    borderLeftWidth: 4,
    paddingLeft: 12,
    paddingVertical: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  conflictContent: {
    flex: 1,
  },
  conflictTime: {
    fontSize: 16,
    fontWeight: '600',
    color: theme === 'dark' ? '#FFFFFF' : '#2C2C2E',
    marginBottom: 4,
  },
  conflictPrayer: {
    fontSize: 14,
    color: theme === 'dark' ? '#8E8E93' : '#8E8E93',
    marginBottom: 4,
  },
  severityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  severityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  severityText: {
    fontSize: 12,
    color: theme === 'dark' ? '#8E8E93' : '#8E8E93',
  },
  rescheduleButton: {
    backgroundColor: '#007BFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  rescheduleText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  prayerTimesSection: {
    margin: 16,
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme === 'dark' ? '#FFFFFF' : '#2C2C2E',
    marginBottom: 12,
  },
  prayerTimesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  prayerTimeCard: {
    flex: 1,
    minWidth: '48%',
    backgroundColor: theme === 'dark' ? '#2C2C2E' : '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    position: 'relative',
  },
  nextPrayerHighlight: {
    backgroundColor: '#E3F2FD',
    borderWidth: 1,
    borderColor: '#007BFF',
  },
  conflictHighlight: {
    backgroundColor: '#FFF3CD',
    borderWidth: 1,
    borderColor: '#FD7E14',
  },
  prayerCardName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme === 'dark' ? '#FFFFFF' : '#2C2C2E',
    marginBottom: 4,
  },
  prayerCardTime: {
    fontSize: 16,
    color: theme === 'dark' ? '#FFFFFF' : '#2C2C2E',
  },
  nextPrayerText: {
    color: '#007BFF',
  },
  conflictIcon: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  windowsSection: {
    margin: 16,
    marginTop: 8,
  },
  windowItem: {
    backgroundColor: theme === 'dark' ? '#2C2C2E' : '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
  },
  windowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  windowType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#28A745',
  },
  windowDuration: {
    fontSize: 12,
    color: theme === 'dark' ? '#8E8E93' : '#8E8E93',
  },
  windowTime: {
    fontSize: 16,
    fontWeight: '600',
    color: theme === 'dark' ? '#FFFFFF' : '#2C2C2E',
    marginBottom: 4,
  },
  windowPrayer: {
    fontSize: 12,
    color: theme === 'dark' ? '#8E8E93' : '#8E8E93',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: theme === 'dark' ? '#1C1C1E' : '#F2F2F7',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: theme === 'dark' ? '#2C2C2E' : '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: theme === 'dark' ? '#3C3C3E' : '#E5E5EA',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme === 'dark' ? '#FFFFFF' : '#2C2C2E',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme === 'dark' ? '#3C3C3E' : '#E5E5EA',
  },
  settingLabelContainer: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    color: theme === 'dark' ? '#FFFFFF' : '#2C2C2E',
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 12,
    color: theme === 'dark' ? '#8E8E93' : '#8E8E93',
  },
  bufferControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bufferButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bufferValue: {
    fontSize: 16,
    fontWeight: '600',
    color: theme === 'dark' ? '#FFFFFF' : '#2C2C2E',
    marginHorizontal: 16,
    minWidth: 40,
    textAlign: 'center',
  },
  madhabSelection: {
    flexDirection: 'row',
    gap: 8,
  },
  madhabButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: theme === 'dark' ? '#3C3C3E' : '#E5E5EA',
  },
  selectedMadhab: {
    backgroundColor: '#28A745',
  },
  madhabText: {
    fontSize: 14,
    color: theme === 'dark' ? '#FFFFFF' : '#2C2C2E',
  },
  selectedMadhabText: {
    color: '#FFFFFF',
  },
});

export default PrayerTimeIntegration;