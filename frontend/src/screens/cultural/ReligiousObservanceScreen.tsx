/**
 * Religious Observance Settings Screen
 *
 * Screen for configuring religious observance settings including prayer times,
 * fasting periods, religious calendar integration, and spiritual wellness features.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Switch,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { usePrayerTimeIntegration } from '../../hooks/cultural';
import { useTranslation, useCulturalFormatting } from '../../i18n';
import { PrayerTimeIntegration } from '../../components/cultural/prayer';
import { FestivalCalendar } from '../../components/cultural/calendar';
import type { MalaysianState } from '../../types/cultural';

interface ReligiousObservanceSettings {
  enablePrayerIntegration: boolean;
  enableFastingSupport: boolean;
  enableReligiousCalendar: boolean;
  enableSpiritualWellness: boolean;
  religion: 'islam' | 'buddhism' | 'hinduism' | 'christianity' | 'none' | 'other';
  madhab: 'shafi' | 'hanafi';
  calculationMethod: 'jakim' | 'isna' | 'mwl' | 'egypt' | 'makkah';
  prayerNotifications: boolean;
  qiblaDirection: boolean;
  fastingNotifications: boolean;
  ramadanMode: boolean;
  festivalReminders: boolean;
  spiritualQuotes: boolean;
  dhikrReminders: boolean;
  locationBasedTiming: boolean;
  bufferMinutes: number;
  prayerAdjustments: {
    fajr: number;
    dhuhr: number;
    asr: number;
    maghrib: number;
    isha: number;
  };
}

interface FastingPeriod {
  id: string;
  name: string;
  type: 'ramadan' | 'voluntary' | 'cultural' | 'personal';
  startDate: Date;
  endDate: Date;
  description: string;
  medicationGuidance: string[];
  isActive: boolean;
}

interface SpiritualFeature {
  id: string;
  name: string;
  description: string;
  type: 'quotes' | 'dhikr' | 'calendar' | 'guidance' | 'community';
  enabled: boolean;
  frequency?: 'daily' | 'weekly' | 'events_only';
}

export const ReligiousObservanceScreen: React.FC = () => {
  const navigation = useNavigation();
  const { t, tCultural } = useTranslation();
  const { formatTime } = useCulturalFormatting();

  const [settings, setSettings] = useState<ReligiousObservanceSettings>({
    enablePrayerIntegration: false,
    enableFastingSupport: false,
    enableReligiousCalendar: false,
    enableSpiritualWellness: false,
    religion: 'none',
    madhab: 'shafi',
    calculationMethod: 'jakim',
    prayerNotifications: true,
    qiblaDirection: true,
    fastingNotifications: true,
    ramadanMode: false,
    festivalReminders: true,
    spiritualQuotes: false,
    dhikrReminders: false,
    locationBasedTiming: true,
    bufferMinutes: 30,
    prayerAdjustments: {
      fajr: 0,
      dhuhr: 0,
      asr: 0,
      maghrib: 0,
      isha: 0
    }
  });

  const [selectedTab, setSelectedTab] = useState<'overview' | 'prayer' | 'fasting' | 'calendar' | 'spiritual'>('overview');
  const [fastingPeriods, setFastingPeriods] = useState<FastingPeriod[]>([]);
  const [spiritualFeatures, setSpiritualFeatures] = useState<SpiritualFeature[]>([]);
  const [showLocationSettings, setShowLocationSettings] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  /**
   * Load initial data
   */
  const loadInitialData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Load existing settings
      // This would typically come from a service

      // Mock fasting periods
      const mockFastingPeriods: FastingPeriod[] = [
        {
          id: 'ramadan_2024',
          name: 'Ramadan 1445H',
          type: 'ramadan',
          startDate: new Date(2024, 2, 10), // March 10, 2024
          endDate: new Date(2024, 3, 9), // April 9, 2024
          description: 'Holy month of fasting from dawn to sunset',
          medicationGuidance: [
            'Take medications during Suhoor (pre-dawn) and Iftar (sunset)',
            'Consider extended-release medications if available',
            'Stay hydrated during non-fasting hours'
          ],
          isActive: false
        }
      ];

      // Mock spiritual features
      const mockSpiritualFeatures: SpiritualFeature[] = [
        {
          id: 'daily_quotes',
          name: 'Daily Spiritual Quotes',
          description: 'Receive inspirational quotes from religious texts',
          type: 'quotes',
          enabled: false,
          frequency: 'daily'
        },
        {
          id: 'dhikr_reminders',
          name: 'Dhikr Reminders',
          description: 'Regular reminders for remembrance of Allah',
          type: 'dhikr',
          enabled: false,
          frequency: 'daily'
        },
        {
          id: 'islamic_calendar',
          name: 'Islamic Calendar Events',
          description: 'Important dates in the Islamic calendar',
          type: 'calendar',
          enabled: false,
          frequency: 'events_only'
        }
      ];

      setFastingPeriods(mockFastingPeriods);
      setSpiritualFeatures(mockSpiritualFeatures);
    } catch (err) {
      setError(t('religious.load_error'));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  /**
   * Handle setting changes
   */
  const handleSettingChange = useCallback(<K extends keyof ReligiousObservanceSettings>(
    key: K,
    value: ReligiousObservanceSettings[K]
  ) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  /**
   * Handle religion selection
   */
  const handleReligionChange = useCallback((religion: ReligiousObservanceSettings['religion']) => {
    setSettings(prev => ({ ...prev, religion }));

    // Auto-enable relevant features based on religion
    if (religion === 'islam') {
      setSettings(prev => ({
        ...prev,
        enablePrayerIntegration: true,
        enableFastingSupport: true,
        enableReligiousCalendar: true,
        madhab: 'shafi', // Default for Malaysia
        calculationMethod: 'jakim'
      }));
    } else if (religion === 'none') {
      setSettings(prev => ({
        ...prev,
        enablePrayerIntegration: false,
        enableFastingSupport: false,
        enableReligiousCalendar: false,
        enableSpiritualWellness: false
      }));
    }
  }, []);

  /**
   * Handle spiritual feature toggle
   */
  const handleSpiritualFeatureToggle = useCallback((featureId: string) => {
    setSpiritualFeatures(prev =>
      prev.map(feature =>
        feature.id === featureId
          ? { ...feature, enabled: !feature.enabled }
          : feature
      )
    );
  }, []);

  /**
   * Save settings
   */
  const handleSave = useCallback(async () => {
    setIsLoading(true);
    try {
      // Save settings to backend
      // This would typically involve API calls

      Alert.alert(
        t('religious.settings_saved'),
        t('religious.settings_saved_message')
      );
    } catch (err) {
      Alert.alert(t('common.error'), t('religious.save_error'));
    } finally {
      setIsLoading(false);
    }
  }, [settings, t]);

  /**
   * Render religion selection
   */
  const renderReligionSelection = useCallback(() => {
    const religions: ReligiousObservanceSettings['religion'][] = [
      'islam', 'buddhism', 'hinduism', 'christianity', 'other', 'none'
    ];

    return (
      <View style={styles.religionSelection}>
        <Text style={styles.subsectionTitle}>{t('religious.select_religion')}</Text>
        <View style={styles.religionOptions}>
          {religions.map((religion) => (
            <TouchableOpacity
              key={religion}
              style={[
                styles.religionOption,
                settings.religion === religion && styles.selectedReligion
              ]}
              onPress={() => handleReligionChange(religion)}
            >
              <Text style={[
                styles.religionText,
                settings.religion === religion && styles.selectedReligionText
              ]}>
                {t(`religious.religion_${religion}`)}
              </Text>
              <Ionicons
                name={settings.religion === religion ? 'checkmark-circle' : 'ellipse-outline'}
                size={20}
                color={settings.religion === religion ? '#28A745' : '#8E8E93'}
              />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  }, [settings.religion, handleReligionChange, t]);

  /**
   * Render tab content
   */
  const renderTabContent = useCallback(() => {
    switch (selectedTab) {
      case 'overview':
        return (
          <View style={styles.tabContent}>
            {renderReligionSelection()}

            {/* Quick Settings */}
            <View style={styles.quickSettings}>
              <Text style={styles.subsectionTitle}>{t('religious.quick_settings')}</Text>

              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>{t('religious.enable_prayer_integration')}</Text>
                <Switch
                  value={settings.enablePrayerIntegration}
                  onValueChange={(value) => handleSettingChange('enablePrayerIntegration', value)}
                  trackColor={{ false: '#767577', true: '#28A745' }}
                  thumbColor={settings.enablePrayerIntegration ? '#FFFFFF' : '#f4f3f4'}
                />
              </View>

              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>{t('religious.enable_fasting_support')}</Text>
                <Switch
                  value={settings.enableFastingSupport}
                  onValueChange={(value) => handleSettingChange('enableFastingSupport', value)}
                  trackColor={{ false: '#767577', true: '#28A745' }}
                  thumbColor={settings.enableFastingSupport ? '#FFFFFF' : '#f4f3f4'}
                />
              </View>

              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>{t('religious.enable_religious_calendar')}</Text>
                <Switch
                  value={settings.enableReligiousCalendar}
                  onValueChange={(value) => handleSettingChange('enableReligiousCalendar', value)}
                  trackColor={{ false: '#767577', true: '#28A745' }}
                  thumbColor={settings.enableReligiousCalendar ? '#FFFFFF' : '#f4f3f4'}
                />
              </View>

              <View style={styles.settingRow}>
                <Text style={styles.settingLabel}>{t('religious.enable_spiritual_wellness')}</Text>
                <Switch
                  value={settings.enableSpiritualWellness}
                  onValueChange={(value) => handleSettingChange('enableSpiritualWellness', value)}
                  trackColor={{ false: '#767577', true: '#28A745' }}
                  thumbColor={settings.enableSpiritualWellness ? '#FFFFFF' : '#f4f3f4'}
                />
              </View>
            </View>
          </View>
        );

      case 'prayer':
        return (
          <View style={styles.tabContent}>
            {settings.enablePrayerIntegration ? (
              <PrayerTimeIntegration
                showQiblaDirection={settings.qiblaDirection}
                onPrayerSettingsChange={(prayerSettings) => {
                  handleSettingChange('bufferMinutes', prayerSettings.bufferMinutes);
                  handleSettingChange('madhab', prayerSettings.madhab);
                  handleSettingChange('prayerNotifications', prayerSettings.notifications);
                }}
              />
            ) : (
              <View style={styles.disabledContent}>
                <Ionicons name="moon-outline" size={48} color="#8E8E93" />
                <Text style={styles.disabledText}>{t('religious.prayer_disabled')}</Text>
                <TouchableOpacity
                  style={styles.enableButton}
                  onPress={() => handleSettingChange('enablePrayerIntegration', true)}
                >
                  <Text style={styles.enableButtonText}>{t('religious.enable_prayer_integration')}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        );

      case 'fasting':
        return (
          <View style={styles.tabContent}>
            {settings.enableFastingSupport ? (
              <>
                <Text style={styles.subsectionTitle}>{t('religious.fasting_periods')}</Text>
                {fastingPeriods.map((period) => (
                  <View key={period.id} style={styles.fastingPeriodItem}>
                    <View style={styles.fastingHeader}>
                      <Text style={styles.fastingName}>{period.name}</Text>
                      <View style={[styles.fastingTypeBadge, { backgroundColor: getFastingTypeColor(period.type) }]}>
                        <Text style={styles.fastingTypeText}>{t(`religious.fasting_${period.type}`)}</Text>
                      </View>
                    </View>
                    <Text style={styles.fastingDescription}>{period.description}</Text>
                    <Text style={styles.fastingDate}>
                      {period.startDate.toLocaleDateString('en-MY')} - {period.endDate.toLocaleDateString('en-MY')}
                    </Text>
                    {period.medicationGuidance.length > 0 && (
                      <View style={styles.guidanceContainer}>
                        <Text style={styles.guidanceTitle}>{t('religious.medication_guidance')}</Text>
                        {period.medicationGuidance.map((guidance, index) => (
                          <Text key={index} style={styles.guidanceText}>• {guidance}</Text>
                        ))}
                      </View>
                    )}
                  </View>
                ))}
              </>
            ) : (
              <View style={styles.disabledContent}>
                <Ionicons name="sunny-outline" size={48} color="#8E8E93" />
                <Text style={styles.disabledText}>{t('religious.fasting_disabled')}</Text>
                <TouchableOpacity
                  style={styles.enableButton}
                  onPress={() => handleSettingChange('enableFastingSupport', true)}
                >
                  <Text style={styles.enableButtonText}>{t('religious.enable_fasting_support')}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        );

      case 'calendar':
        return (
          <View style={styles.tabContent}>
            {settings.enableReligiousCalendar ? (
              <FestivalCalendar
                culturalFilter={getCulturalFilter(settings.religion)}
                showMedicationImpact={true}
                onFestivalSelect={(festival) => {
                  Alert.alert(
                    festival.name,
                    t('religious.festival_medication_guidance'),
                    [
                      { text: t('common.close'), style: 'cancel' },
                      { text: t('religious.view_guidance'), onPress: () => {} }
                    ]
                  );
                }}
              />
            ) : (
              <View style={styles.disabledContent}>
                <Ionicons name="calendar-outline" size={48} color="#8E8E93" />
                <Text style={styles.disabledText}>{t('religious.calendar_disabled')}</Text>
                <TouchableOpacity
                  style={styles.enableButton}
                  onPress={() => handleSettingChange('enableReligiousCalendar', true)}
                >
                  <Text style={styles.enableButtonText}>{t('religious.enable_religious_calendar')}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        );

      case 'spiritual':
        return (
          <View style={styles.tabContent}>
            {settings.enableSpiritualWellness ? (
              <>
                <Text style={styles.subsectionTitle}>{t('religious.spiritual_features')}</Text>
                {spiritualFeatures.map((feature) => (
                  <View key={feature.id} style={styles.spiritualFeatureItem}>
                    <View style={styles.spiritualFeatureContent}>
                      <Text style={styles.featureName}>{feature.name}</Text>
                      <Text style={styles.featureDescription}>{feature.description}</Text>
                      {feature.frequency && (
                        <Text style={styles.featureFrequency}>
                          {t(`religious.frequency_${feature.frequency}`)}
                        </Text>
                      )}
                    </View>
                    <Switch
                      value={feature.enabled}
                      onValueChange={() => handleSpiritualFeatureToggle(feature.id)}
                      trackColor={{ false: '#767577', true: '#28A745' }}
                      thumbColor={feature.enabled ? '#FFFFFF' : '#f4f3f4'}
                    />
                  </View>
                ))}
              </>
            ) : (
              <View style={styles.disabledContent}>
                <Ionicons name="heart-outline" size={48} color="#8E8E93" />
                <Text style={styles.disabledText}>{t('religious.spiritual_disabled')}</Text>
                <TouchableOpacity
                  style={styles.enableButton}
                  onPress={() => handleSettingChange('enableSpiritualWellness', true)}
                >
                  <Text style={styles.enableButtonText}>{t('religious.enable_spiritual_wellness')}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        );

      default:
        return null;
    }
  }, [selectedTab, settings, fastingPeriods, spiritualFeatures, renderReligionSelection, handleSettingChange, handleSpiritualFeatureToggle, t]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#28A745" />
          <Text style={styles.loadingText}>{t('religious.loading_settings')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#007BFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('religious.observance_settings')}</Text>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={isLoading}
        >
          <Text style={[styles.saveButtonText, isLoading && styles.disabledText]}>
            {t('common.save')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabNavigation}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabScrollContent}>
          {(['overview', 'prayer', 'fasting', 'calendar', 'spiritual'] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[styles.tabButton, selectedTab === tab && styles.activeTabButton]}
              onPress={() => setSelectedTab(tab)}
            >
              <Ionicons
                name={getTabIcon(tab)}
                size={16}
                color={selectedTab === tab ? '#28A745' : '#8E8E93'}
              />
              <Text style={[styles.tabText, selectedTab === tab && styles.activeTabText]}>
                {t(`religious.tab_${tab}`)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Tab Content */}
      <ScrollView style={styles.content}>
        {renderTabContent()}

        {/* Error Display */}
        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="warning" size={16} color="#DC3545" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
};

/**
 * Get tab icon
 */
const getTabIcon = (tab: string): string => {
  switch (tab) {
    case 'overview': return 'home-outline';
    case 'prayer': return 'moon-outline';
    case 'fasting': return 'sunny-outline';
    case 'calendar': return 'calendar-outline';
    case 'spiritual': return 'heart-outline';
    default: return 'settings-outline';
  }
};

/**
 * Get fasting type color
 */
const getFastingTypeColor = (type: string): string => {
  switch (type) {
    case 'ramadan': return '#28A745';
    case 'voluntary': return '#007BFF';
    case 'cultural': return '#FD7E14';
    case 'personal': return '#6C757D';
    default: return '#8E8E93';
  }
};

/**
 * Get cultural filter based on religion
 */
const getCulturalFilter = (religion: string): Array<'islamic' | 'chinese' | 'hindu' | 'malaysian' | 'public_holiday'> => {
  switch (religion) {
    case 'islam':
      return ['islamic', 'malaysian', 'public_holiday'];
    case 'buddhism':
      return ['chinese', 'malaysian', 'public_holiday'];
    case 'hinduism':
      return ['hindu', 'malaysian', 'public_holiday'];
    default:
      return ['malaysian', 'public_holiday'];
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#2C2C2E',
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C2C2E',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007BFF',
  },
  disabledText: {
    opacity: 0.5,
  },
  tabNavigation: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  tabScrollContent: {
    paddingHorizontal: 16,
  },
  tabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 8,
    borderRadius: 20,
  },
  activeTabButton: {
    backgroundColor: '#E8F5E8',
  },
  tabText: {
    fontSize: 14,
    color: '#8E8E93',
    marginLeft: 8,
    fontWeight: '500',
  },
  activeTabText: {
    color: '#28A745',
  },
  content: {
    flex: 1,
  },
  tabContent: {
    padding: 16,
  },
  subsectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C2C2E',
    marginBottom: 16,
  },
  religionSelection: {
    marginBottom: 32,
  },
  religionOptions: {
    gap: 12,
  },
  religionOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  selectedReligion: {
    backgroundColor: '#E8F5E8',
    borderColor: '#28A745',
  },
  religionText: {
    fontSize: 16,
    color: '#2C2C2E',
  },
  selectedReligionText: {
    color: '#28A745',
    fontWeight: '600',
  },
  quickSettings: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  settingLabel: {
    fontSize: 16,
    color: '#2C2C2E',
    flex: 1,
    marginRight: 16,
  },
  disabledContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  enableButton: {
    backgroundColor: '#28A745',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  enableButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  fastingPeriodItem: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  fastingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  fastingName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2C2C2E',
    flex: 1,
  },
  fastingTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  fastingTypeText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  fastingDescription: {
    fontSize: 14,
    color: '#2C2C2E',
    marginBottom: 8,
  },
  fastingDate: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 12,
  },
  guidanceContainer: {
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
  },
  guidanceTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C2C2E',
    marginBottom: 8,
  },
  guidanceText: {
    fontSize: 13,
    color: '#6C757D',
    lineHeight: 18,
    marginBottom: 4,
  },
  spiritualFeatureItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  spiritualFeatureContent: {
    flex: 1,
    marginRight: 16,
  },
  featureName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C2C2E',
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 4,
  },
  featureFrequency: {
    fontSize: 12,
    color: '#28A745',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    margin: 16,
    padding: 12,
    borderRadius: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#DC3545',
    marginLeft: 8,
    flex: 1,
  },
  bottomSpacing: {
    height: 32,
  },
});

export default ReligiousObservanceScreen;