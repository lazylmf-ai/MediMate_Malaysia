/**
 * Cultural Adaptation Screen
 *
 * Screen for configuring Malaysian cultural practice adaptations including
 * traditional medicine integration, family care patterns, and cultural preferences.
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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useCulturalProfile, useCulturalAdaptation } from '../../hooks/cultural';
import { useTranslation, useCulturalFormatting } from '../../i18n';
import { LanguageSwitcher } from '../../components/cultural/language';
import type { CulturalProfile, MalaysianState } from '../../types/cultural';

interface CulturalAdaptationSettings {
  traditionalMedicineIntegration: boolean;
  familyStructureConsideration: boolean;
  elderlyCarePractices: boolean;
  communityHealthApproach: boolean;
  spiritualWellnessSupport: boolean;
  culturalDietaryPreferences: boolean;
  festivalMedicationAdjustments: boolean;
  languagePreferences: Array<'ms' | 'en' | 'zh' | 'ta'>;
  locationBasedDefaults: boolean;
  familyNotificationStructure: 'hierarchical' | 'inclusive' | 'primary_only';
  traditionMedicinePhilosophy: 'complementary' | 'integrated' | 'separate' | 'none';
}

interface TraditionalPractice {
  id: string;
  name: string;
  nameMs: string;
  category: 'herbal' | 'dietary' | 'spiritual' | 'physical' | 'social';
  description: string;
  culturalBackground: 'malay' | 'chinese' | 'indian' | 'mixed';
  medicationInteractions: 'none' | 'mild' | 'moderate' | 'significant';
  commonUse: string[];
  integrationNotes: string;
}

export const CulturalAdaptationScreen: React.FC = () => {
  const navigation = useNavigation();
  const { culturalProfile, updateProfile, isLoading: profileLoading } = useCulturalProfile();
  const {
    adaptationSettings,
    traditionalPractices,
    locationDefaults,
    familyPatterns,
    isLoading,
    error,
    updateSettings,
    loadTraditionalPractices,
    checkMedicationInteractions
  } = useCulturalAdaptation();

  const { t, tCultural } = useTranslation();
  const { currentLanguage } = useCulturalFormatting();

  const [settings, setSettings] = useState<CulturalAdaptationSettings>({
    traditionalMedicineIntegration: false,
    familyStructureConsideration: true,
    elderlyCarePractices: true,
    communityHealthApproach: false,
    spiritualWellnessSupport: false,
    culturalDietaryPreferences: true,
    festivalMedicationAdjustments: true,
    languagePreferences: ['ms', 'en'],
    locationBasedDefaults: true,
    familyNotificationStructure: 'inclusive',
    traditionMedicinePhilosophy: 'complementary'
  });

  const [selectedPractices, setSelectedPractices] = useState<string[]>([]);
  const [showTraditionalMedicine, setShowTraditionalMedicine] = useState(false);

  useEffect(() => {
    if (adaptationSettings) {
      setSettings(adaptationSettings);
    }
  }, [adaptationSettings]);

  useEffect(() => {
    loadTraditionalPractices();
  }, [loadTraditionalPractices]);

  /**
   * Handle setting changes
   */
  const handleSettingChange = useCallback(<K extends keyof CulturalAdaptationSettings>(
    key: K,
    value: CulturalAdaptationSettings[K]
  ) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);
    updateSettings(newSettings);
  }, [settings, updateSettings]);

  /**
   * Handle traditional practice selection
   */
  const handlePracticeToggle = useCallback((practiceId: string) => {
    const practice = traditionalPractices.find(p => p.id === practiceId);
    if (!practice) return;

    if (practice.medicationInteractions === 'significant') {
      Alert.alert(
        t('cultural.interaction_warning'),
        t('cultural.significant_interaction_message', { practice: practice.name }),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.continue'),
            style: 'destructive',
            onPress: () => togglePractice(practiceId)
          }
        ]
      );
    } else {
      togglePractice(practiceId);
    }
  }, [traditionalPractices, t]);

  const togglePractice = useCallback((practiceId: string) => {
    setSelectedPractices(prev =>
      prev.includes(practiceId)
        ? prev.filter(id => id !== practiceId)
        : [...prev, practiceId]
    );
  }, []);

  /**
   * Save settings
   */
  const handleSave = useCallback(async () => {
    try {
      await updateSettings({
        ...settings,
        selectedTraditionalPractices: selectedPractices
      });

      // Update cultural profile
      if (culturalProfile) {
        await updateProfile({
          ...culturalProfile,
          adaptationSettings: settings
        });
      }

      Alert.alert(
        t('cultural.settings_saved'),
        t('cultural.settings_saved_message')
      );
    } catch (err) {
      Alert.alert(t('common.error'), t('cultural.save_error'));
    }
  }, [settings, selectedPractices, updateSettings, culturalProfile, updateProfile, t]);

  /**
   * Render traditional practice item
   */
  const renderPracticeItem = useCallback((practice: TraditionalPractice) => {
    const isSelected = selectedPractices.includes(practice.id);
    const interactionColor = getInteractionColor(practice.medicationInteractions);

    return (
      <TouchableOpacity
        key={practice.id}
        style={[styles.practiceItem, isSelected && styles.selectedPracticeItem]}
        onPress={() => handlePracticeToggle(practice.id)}
      >
        <View style={styles.practiceContent}>
          <View style={styles.practiceHeader}>
            <Text style={styles.practiceName}>
              {currentLanguage === 'ms' ? practice.nameMs : practice.name}
            </Text>
            <View style={[styles.interactionBadge, { backgroundColor: interactionColor }]}>
              <Text style={styles.interactionText}>
                {t(`cultural.interaction_${practice.medicationInteractions}`)}
              </Text>
            </View>
          </View>

          <Text style={styles.practiceDescription}>
            {practice.description}
          </Text>

          <View style={styles.practiceDetails}>
            <Text style={styles.practiceCategory}>
              {tCultural(`practice_category.${practice.category}`)} •
              {tCultural(`culture.${practice.culturalBackground}`)}
            </Text>
          </View>

          <Text style={styles.practiceUsage}>
            {t('cultural.common_use')}: {practice.commonUse.join(', ')}
          </Text>

          {practice.integrationNotes && (
            <Text style={styles.integrationNotes}>
              💡 {practice.integrationNotes}
            </Text>
          )}
        </View>

        <View style={styles.practiceSelection}>
          <Ionicons
            name={isSelected ? 'checkmark-circle' : 'ellipse-outline'}
            size={24}
            color={isSelected ? '#28A745' : '#8E8E93'}
          />
        </View>
      </TouchableOpacity>
    );
  }, [selectedPractices, currentLanguage, handlePracticeToggle, t, tCultural]);

  if (isLoading || profileLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007BFF" />
          <Text style={styles.loadingText}>{t('cultural.loading_adaptations')}</Text>
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
        <Text style={styles.headerTitle}>{t('cultural.adaptation_settings')}</Text>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
        >
          <Text style={styles.saveButtonText}>{t('common.save')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Language Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('cultural.language_preferences')}</Text>
          <LanguageSwitcher compact={false} onLanguageChange={() => {}} />
        </View>

        {/* Core Cultural Adaptations */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('cultural.core_adaptations')}</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>{t('cultural.family_structure_consideration')}</Text>
              <Text style={styles.settingDescription}>
                {t('cultural.family_structure_description')}
              </Text>
            </View>
            <Switch
              value={settings.familyStructureConsideration}
              onValueChange={(value) => handleSettingChange('familyStructureConsideration', value)}
              trackColor={{ false: '#767577', true: '#007BFF' }}
              thumbColor={settings.familyStructureConsideration ? '#FFFFFF' : '#f4f3f4'}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>{t('cultural.elderly_care_practices')}</Text>
              <Text style={styles.settingDescription}>
                {t('cultural.elderly_care_description')}
              </Text>
            </View>
            <Switch
              value={settings.elderlyCarePractices}
              onValueChange={(value) => handleSettingChange('elderlyCarePractices', value)}
              trackColor={{ false: '#767577', true: '#007BFF' }}
              thumbColor={settings.elderlyCarePractices ? '#FFFFFF' : '#f4f3f4'}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>{t('cultural.cultural_dietary_preferences')}</Text>
              <Text style={styles.settingDescription}>
                {t('cultural.dietary_preferences_description')}
              </Text>
            </View>
            <Switch
              value={settings.culturalDietaryPreferences}
              onValueChange={(value) => handleSettingChange('culturalDietaryPreferences', value)}
              trackColor={{ false: '#767577', true: '#007BFF' }}
              thumbColor={settings.culturalDietaryPreferences ? '#FFFFFF' : '#f4f3f4'}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>{t('cultural.festival_medication_adjustments')}</Text>
              <Text style={styles.settingDescription}>
                {t('cultural.festival_adjustments_description')}
              </Text>
            </View>
            <Switch
              value={settings.festivalMedicationAdjustments}
              onValueChange={(value) => handleSettingChange('festivalMedicationAdjustments', value)}
              trackColor={{ false: '#767577', true: '#007BFF' }}
              thumbColor={settings.festivalMedicationAdjustments ? '#FFFFFF' : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Advanced Cultural Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('cultural.advanced_settings')}</Text>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>{t('cultural.community_health_approach')}</Text>
              <Text style={styles.settingDescription}>
                {t('cultural.community_health_description')}
              </Text>
            </View>
            <Switch
              value={settings.communityHealthApproach}
              onValueChange={(value) => handleSettingChange('communityHealthApproach', value)}
              trackColor={{ false: '#767577', true: '#007BFF' }}
              thumbColor={settings.communityHealthApproach ? '#FFFFFF' : '#f4f3f4'}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>{t('cultural.spiritual_wellness_support')}</Text>
              <Text style={styles.settingDescription}>
                {t('cultural.spiritual_wellness_description')}
              </Text>
            </View>
            <Switch
              value={settings.spiritualWellnessSupport}
              onValueChange={(value) => handleSettingChange('spiritualWellnessSupport', value)}
              trackColor={{ false: '#767577', true: '#007BFF' }}
              thumbColor={settings.spiritualWellnessSupport ? '#FFFFFF' : '#f4f3f4'}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingInfo}>
              <Text style={styles.settingLabel}>{t('cultural.location_based_defaults')}</Text>
              <Text style={styles.settingDescription}>
                {t('cultural.location_defaults_description')}
              </Text>
            </View>
            <Switch
              value={settings.locationBasedDefaults}
              onValueChange={(value) => handleSettingChange('locationBasedDefaults', value)}
              trackColor={{ false: '#767577', true: '#007BFF' }}
              thumbColor={settings.locationBasedDefaults ? '#FFFFFF' : '#f4f3f4'}
            />
          </View>
        </View>

        {/* Traditional Medicine Integration */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{t('cultural.traditional_medicine')}</Text>
            <Switch
              value={settings.traditionalMedicineIntegration}
              onValueChange={(value) => {
                handleSettingChange('traditionalMedicineIntegration', value);
                setShowTraditionalMedicine(value);
              }}
              trackColor={{ false: '#767577', true: '#007BFF' }}
              thumbColor={settings.traditionalMedicineIntegration ? '#FFFFFF' : '#f4f3f4'}
            />
          </View>

          {settings.traditionalMedicineIntegration && (
            <View style={styles.traditionalMedicineContent}>
              <Text style={styles.subsectionDescription}>
                {t('cultural.traditional_medicine_description')}
              </Text>

              {/* Philosophy Selection */}
              <Text style={styles.subsectionTitle}>{t('cultural.integration_philosophy')}</Text>
              <View style={styles.philosophyOptions}>
                {(['complementary', 'integrated', 'separate', 'none'] as const).map((philosophy) => (
                  <TouchableOpacity
                    key={philosophy}
                    style={[
                      styles.philosophyOption,
                      settings.traditionMedicinePhilosophy === philosophy && styles.selectedPhilosophy
                    ]}
                    onPress={() => handleSettingChange('traditionMedicinePhilosophy', philosophy)}
                  >
                    <Text style={[
                      styles.philosophyText,
                      settings.traditionMedicinePhilosophy === philosophy && styles.selectedPhilosophyText
                    ]}>
                      {t(`cultural.philosophy_${philosophy}`)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Traditional Practices */}
              {traditionalPractices.length > 0 && (
                <>
                  <Text style={styles.subsectionTitle}>
                    {t('cultural.traditional_practices')} ({selectedPractices.length} {t('common.selected')})
                  </Text>

                  <View style={styles.interactionLegend}>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendColor, { backgroundColor: '#28A745' }]} />
                      <Text style={styles.legendText}>{t('cultural.interaction_none')}</Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendColor, { backgroundColor: '#FFC107' }]} />
                      <Text style={styles.legendText}>{t('cultural.interaction_mild')}</Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendColor, { backgroundColor: '#FD7E14' }]} />
                      <Text style={styles.legendText}>{t('cultural.interaction_moderate')}</Text>
                    </View>
                    <View style={styles.legendItem}>
                      <View style={[styles.legendColor, { backgroundColor: '#DC3545' }]} />
                      <Text style={styles.legendText}>{t('cultural.interaction_significant')}</Text>
                    </View>
                  </View>

                  <View style={styles.practicesList}>
                    {traditionalPractices.map(renderPracticeItem)}
                  </View>
                </>
              )}
            </View>
          )}
        </View>

        {/* Family Notification Structure */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('cultural.family_notification_structure')}</Text>
          <Text style={styles.sectionDescription}>
            {t('cultural.family_notification_description')}
          </Text>

          <View style={styles.notificationOptions}>
            {(['hierarchical', 'inclusive', 'primary_only'] as const).map((structure) => (
              <TouchableOpacity
                key={structure}
                style={[
                  styles.notificationOption,
                  settings.familyNotificationStructure === structure && styles.selectedNotification
                ]}
                onPress={() => handleSettingChange('familyNotificationStructure', structure)}
              >
                <View style={styles.notificationContent}>
                  <Text style={[
                    styles.notificationTitle,
                    settings.familyNotificationStructure === structure && styles.selectedNotificationText
                  ]}>
                    {t(`cultural.notification_${structure}`)}
                  </Text>
                  <Text style={styles.notificationDescription}>
                    {t(`cultural.notification_${structure}_description`)}
                  </Text>
                </View>
                <Ionicons
                  name={settings.familyNotificationStructure === structure ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={settings.familyNotificationStructure === structure ? '#007BFF' : '#8E8E93'}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Error Display */}
        {error && (
          <View style={styles.errorContainer}>
            <Ionicons name="warning" size={16} color="#DC3545" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Bottom Spacing */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
};

/**
 * Get color for medication interaction level
 */
const getInteractionColor = (level: string): string => {
  switch (level) {
    case 'none': return '#28A745';
    case 'mild': return '#FFC107';
    case 'moderate': return '#FD7E14';
    case 'significant': return '#DC3545';
    default: return '#8E8E93';
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
  content: {
    flex: 1,
  },
  section: {
    backgroundColor: '#FFFFFF',
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2C2C2E',
    marginBottom: 16,
  },
  sectionDescription: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2C2C2E',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 18,
  },
  traditionalMedicineContent: {
    marginTop: 16,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C2C2E',
    marginTop: 20,
    marginBottom: 12,
  },
  subsectionDescription: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 20,
    marginBottom: 16,
  },
  philosophyOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 16,
  },
  philosophyOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F2F2F7',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  selectedPhilosophy: {
    backgroundColor: '#007BFF',
    borderColor: '#007BFF',
  },
  philosophyText: {
    fontSize: 14,
    color: '#2C2C2E',
  },
  selectedPhilosophyText: {
    color: '#FFFFFF',
  },
  interactionLegend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    marginBottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendColor: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: '#6C757D',
  },
  practicesList: {
    gap: 12,
  },
  practiceItem: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  selectedPracticeItem: {
    backgroundColor: '#E3F2FD',
    borderColor: '#007BFF',
  },
  practiceContent: {
    flex: 1,
    marginRight: 12,
  },
  practiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  practiceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C2C2E',
    flex: 1,
    marginRight: 12,
  },
  interactionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  interactionText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  practiceDescription: {
    fontSize: 14,
    color: '#2C2C2E',
    lineHeight: 20,
    marginBottom: 8,
  },
  practiceDetails: {
    marginBottom: 8,
  },
  practiceCategory: {
    fontSize: 12,
    color: '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  practiceUsage: {
    fontSize: 13,
    color: '#6C757D',
    marginBottom: 8,
  },
  integrationNotes: {
    fontSize: 12,
    color: '#007BFF',
    fontStyle: 'italic',
  },
  practiceSelection: {
    justifyContent: 'center',
  },
  notificationOptions: {
    gap: 12,
  },
  notificationOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  selectedNotification: {
    backgroundColor: '#E3F2FD',
    borderColor: '#007BFF',
  },
  notificationContent: {
    flex: 1,
    marginRight: 12,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2C2C2E',
    marginBottom: 4,
  },
  selectedNotificationText: {
    color: '#007BFF',
  },
  notificationDescription: {
    fontSize: 14,
    color: '#8E8E93',
    lineHeight: 18,
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

export default CulturalAdaptationScreen;