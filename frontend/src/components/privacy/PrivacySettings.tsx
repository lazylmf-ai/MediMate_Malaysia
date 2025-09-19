/**
 * Privacy Settings Component
 * Manages granular family privacy controls with Malaysian cultural awareness
 * Supports PDPA compliance and FHIR healthcare provider integration
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
  TextInput
} from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import {
  privacyManager,
  PrivacySettings as PrivacySettingsType,
  DataCategory,
  DataCategoryPermission,
  FamilyMemberPermission,
  VisibilityLevel,
  MalaysianFamilyRelationship,
  PDPAConsent,
  FHIRSharingSettings,
  ThirdPartyConsent
} from '../../services/family/PrivacyManager';
import {
  culturalFamilyPatterns,
  MalaysianFamilyStructure
} from '../../services/family/CulturalFamilyPatterns';
import { fhirFamilyIntegration } from '../../services/fhir/FamilyIntegration';

interface Props {
  familyId: string;
  onSettingsUpdated?: () => void;
}

interface DataCategoryConfig {
  category: DataCategory;
  icon: string;
  title: string;
  titleMalay: string;
  description: string;
  sensitive: boolean;
}

const DATA_CATEGORIES: DataCategoryConfig[] = [
  {
    category: 'medications',
    icon: 'pill',
    title: 'Medications',
    titleMalay: 'Ubat-ubatan',
    description: 'Current medications and prescriptions',
    sensitive: false
  },
  {
    category: 'adherence_history',
    icon: 'chart-line',
    title: 'Adherence History',
    titleMalay: 'Sejarah Kepatuhan',
    description: 'Medication taking history and patterns',
    sensitive: false
  },
  {
    category: 'health_metrics',
    icon: 'heart-pulse',
    title: 'Health Metrics',
    titleMalay: 'Metrik Kesihatan',
    description: 'Vital signs and health measurements',
    sensitive: true
  },
  {
    category: 'medical_conditions',
    icon: 'medical-bag',
    title: 'Medical Conditions',
    titleMalay: 'Keadaan Perubatan',
    description: 'Diagnoses and health conditions',
    sensitive: true
  },
  {
    category: 'allergies',
    icon: 'alert-circle',
    title: 'Allergies',
    titleMalay: 'Alahan',
    description: 'Drug and food allergies',
    sensitive: false
  },
  {
    category: 'appointments',
    icon: 'calendar-clock',
    title: 'Appointments',
    titleMalay: 'Temujanji',
    description: 'Medical appointments and schedules',
    sensitive: false
  },
  {
    category: 'emergency_contacts',
    icon: 'phone-alert',
    title: 'Emergency Contacts',
    titleMalay: 'Kenalan Kecemasan',
    description: 'Emergency contact information',
    sensitive: false
  },
  {
    category: 'insurance_details',
    icon: 'shield-check',
    title: 'Insurance',
    titleMalay: 'Insurans',
    description: 'Insurance and coverage information',
    sensitive: true
  },
  {
    category: 'cultural_preferences',
    icon: 'account-group',
    title: 'Cultural Preferences',
    titleMalay: 'Keutamaan Budaya',
    description: 'Cultural and religious preferences',
    sensitive: false
  },
  {
    category: 'prayer_schedule',
    icon: 'clock-outline',
    title: 'Prayer Schedule',
    titleMalay: 'Jadual Solat',
    description: 'Prayer times and religious observances',
    sensitive: false
  },
  {
    category: 'dietary_restrictions',
    icon: 'food-halal',
    title: 'Dietary Restrictions',
    titleMalay: 'Sekatan Pemakanan',
    description: 'Halal and dietary requirements',
    sensitive: false
  }
];

const VISIBILITY_LEVELS: { level: VisibilityLevel; label: string; labelMalay: string; icon: string }[] = [
  { level: 'private', label: 'Private', labelMalay: 'Peribadi', icon: 'lock' },
  { level: 'family_only', label: 'Family Only', labelMalay: 'Keluarga Sahaja', icon: 'home-account' },
  { level: 'caregivers_only', label: 'Caregivers Only', labelMalay: 'Penjaga Sahaja', icon: 'account-heart' },
  { level: 'healthcare_providers', label: 'Healthcare Providers', labelMalay: 'Pembekal Kesihatan', icon: 'hospital' },
  { level: 'emergency_only', label: 'Emergency Only', labelMalay: 'Kecemasan Sahaja', icon: 'alert' },
  { level: 'custom', label: 'Custom', labelMalay: 'Tersuai', icon: 'tune' }
];

export const PrivacySettings: React.FC<Props> = ({ familyId, onSettingsUpdated }) => {
  const { t, i18n } = useTranslation();
  const { theme } = useTheme();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [privacySettings, setPrivacySettings] = useState<PrivacySettingsType | null>(null);
  const [familyStructure, setFamilyStructure] = useState<MalaysianFamilyStructure | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<DataCategory | null>(null);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showPDPAModal, setShowPDPAModal] = useState(false);
  const [showFHIRModal, setShowFHIRModal] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState<Set<DataCategory>>(new Set());

  const isRTL = i18n.language === 'ar';
  const currentLanguage = i18n.language as 'ms' | 'en' | 'zh' | 'ta';

  useEffect(() => {
    loadPrivacySettings();
  }, [familyId, user?.id]);

  const loadPrivacySettings = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      const settings = await privacyManager.getPrivacySettings(user.id, familyId);

      if (settings) {
        setPrivacySettings(settings);

        // Load family structure for cultural validation
        // This would normally fetch from family service
        const familyMembers = settings.familyMemberPermissions.map(p => ({
          id: p.memberId,
          name: p.memberName,
          relationship: p.relationship,
          gender: 'male' as 'male' | 'female', // Would be fetched
          ageGroup: 'adult' as any,
          languagePreference: currentLanguage
        }));

        const structure = culturalFamilyPatterns.analyzeFamilyStructure(familyMembers);
        setFamilyStructure(structure);
      }
    } catch (error) {
      console.error('Failed to load privacy settings:', error);
      Alert.alert(
        t('privacy.error'),
        t('privacy.loadError'),
        [{ text: t('common.ok') }]
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCategoryVisibilityChange = useCallback(async (
    category: DataCategory,
    visibility: VisibilityLevel
  ) => {
    if (!privacySettings || !user?.id) return;

    const categoryIndex = privacySettings.dataCategories.findIndex(c => c.category === category);
    if (categoryIndex === -1) return;

    const updatedCategories = [...privacySettings.dataCategories];
    updatedCategories[categoryIndex] = {
      ...updatedCategories[categoryIndex],
      visibility
    };

    const updatedSettings = {
      ...privacySettings,
      dataCategories: updatedCategories
    };

    setPrivacySettings(updatedSettings);

    // Save to backend
    setSaving(true);
    try {
      await privacyManager.updatePrivacySettings({
        userId: user.id,
        familyId,
        updates: { dataCategories: updatedCategories },
        reason: `Updated visibility for ${category}`
      });

      onSettingsUpdated?.();
    } catch (error) {
      console.error('Failed to update privacy settings:', error);
      Alert.alert(
        t('privacy.error'),
        t('privacy.updateError'),
        [{ text: t('common.ok') }]
      );
    } finally {
      setSaving(false);
    }
  }, [privacySettings, user?.id, familyId, onSettingsUpdated, t]);

  const handleProviderSharingToggle = useCallback(async (
    category: DataCategory,
    enabled: boolean
  ) => {
    if (!privacySettings || !user?.id) return;

    const categoryIndex = privacySettings.dataCategories.findIndex(c => c.category === category);
    if (categoryIndex === -1) return;

    const updatedCategories = [...privacySettings.dataCategories];
    updatedCategories[categoryIndex] = {
      ...updatedCategories[categoryIndex],
      shareWithHealthcareProviders: enabled
    };

    const updatedSettings = {
      ...privacySettings,
      dataCategories: updatedCategories
    };

    setPrivacySettings(updatedSettings);

    setSaving(true);
    try {
      await privacyManager.updatePrivacySettings({
        userId: user.id,
        familyId,
        updates: { dataCategories: updatedCategories },
        reason: `${enabled ? 'Enabled' : 'Disabled'} provider sharing for ${category}`
      });

      onSettingsUpdated?.();
    } catch (error) {
      console.error('Failed to update provider sharing:', error);
      Alert.alert(
        t('privacy.error'),
        t('privacy.updateError'),
        [{ text: t('common.ok') }]
      );
    } finally {
      setSaving(false);
    }
  }, [privacySettings, user?.id, familyId, onSettingsUpdated, t]);

  const handleEmergencyOverrideToggle = useCallback(async (
    category: DataCategory,
    enabled: boolean
  ) => {
    if (!privacySettings || !user?.id) return;

    const categoryIndex = privacySettings.dataCategories.findIndex(c => c.category === category);
    if (categoryIndex === -1) return;

    const updatedCategories = [...privacySettings.dataCategories];
    updatedCategories[categoryIndex] = {
      ...updatedCategories[categoryIndex],
      emergencyOverride: enabled
    };

    const updatedSettings = {
      ...privacySettings,
      dataCategories: updatedCategories
    };

    setPrivacySettings(updatedSettings);

    setSaving(true);
    try {
      await privacyManager.updatePrivacySettings({
        userId: user.id,
        familyId,
        updates: { dataCategories: updatedCategories },
        reason: `${enabled ? 'Enabled' : 'Disabled'} emergency override for ${category}`
      });

      onSettingsUpdated?.();
    } catch (error) {
      console.error('Failed to update emergency override:', error);
      Alert.alert(
        t('privacy.error'),
        t('privacy.updateError'),
        [{ text: t('common.ok') }]
      );
    } finally {
      setSaving(false);
    }
  }, [privacySettings, user?.id, familyId, onSettingsUpdated, t]);

  const toggleCategoryExpanded = (category: DataCategory) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const renderCategoryItem = (config: DataCategoryConfig) => {
    const categorySettings = privacySettings?.dataCategories.find(c => c.category === config.category);
    const isExpanded = expandedCategories.has(config.category);
    const visibilityLevel = VISIBILITY_LEVELS.find(v => v.level === categorySettings?.visibility);

    return (
      <TouchableOpacity
        key={config.category}
        style={[styles.categoryCard, { backgroundColor: theme.card }]}
        onPress={() => toggleCategoryExpanded(config.category)}
        activeOpacity={0.7}
      >
        <View style={styles.categoryHeader}>
          <View style={styles.categoryInfo}>
            <Icon
              name={config.icon}
              size={24}
              color={config.sensitive ? theme.error : theme.primary}
              style={styles.categoryIcon}
            />
            <View style={styles.categoryText}>
              <Text style={[styles.categoryTitle, { color: theme.text }]}>
                {currentLanguage === 'ms' ? config.titleMalay : config.title}
              </Text>
              <Text style={[styles.categoryDescription, { color: theme.textSecondary }]}>
                {config.description}
              </Text>
            </View>
          </View>
          <Icon
            name={isExpanded ? 'chevron-up' : 'chevron-down'}
            size={20}
            color={theme.textSecondary}
          />
        </View>

        {categorySettings && (
          <View style={styles.categoryStatus}>
            <View style={[styles.statusBadge, { backgroundColor: theme.primaryLight }]}>
              <Icon name={visibilityLevel?.icon || 'eye'} size={14} color={theme.primary} />
              <Text style={[styles.statusText, { color: theme.primary }]}>
                {currentLanguage === 'ms' ? visibilityLevel?.labelMalay : visibilityLevel?.label}
              </Text>
            </View>
            {categorySettings.shareWithHealthcareProviders && (
              <View style={[styles.statusBadge, { backgroundColor: theme.successLight }]}>
                <Icon name="hospital" size={14} color={theme.success} />
                <Text style={[styles.statusText, { color: theme.success }]}>
                  {t('privacy.providerSharing')}
                </Text>
              </View>
            )}
            {categorySettings.emergencyOverride && (
              <View style={[styles.statusBadge, { backgroundColor: theme.errorLight }]}>
                <Icon name="alert" size={14} color={theme.error} />
                <Text style={[styles.statusText, { color: theme.error }]}>
                  {t('privacy.emergencyAccess')}
                </Text>
              </View>
            )}
          </View>
        )}

        {isExpanded && categorySettings && (
          <View style={styles.categoryDetails}>
            <View style={styles.detailSection}>
              <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
                {t('privacy.visibilityLevel')}
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.visibilityOptions}>
                  {VISIBILITY_LEVELS.map(level => (
                    <TouchableOpacity
                      key={level.level}
                      style={[
                        styles.visibilityOption,
                        {
                          backgroundColor: categorySettings.visibility === level.level
                            ? theme.primary
                            : theme.inputBackground,
                          borderColor: categorySettings.visibility === level.level
                            ? theme.primary
                            : theme.border
                        }
                      ]}
                      onPress={() => handleCategoryVisibilityChange(config.category, level.level)}
                    >
                      <Icon
                        name={level.icon}
                        size={16}
                        color={categorySettings.visibility === level.level ? '#FFF' : theme.textSecondary}
                      />
                      <Text
                        style={[
                          styles.visibilityOptionText,
                          {
                            color: categorySettings.visibility === level.level ? '#FFF' : theme.text
                          }
                        ]}
                      >
                        {currentLanguage === 'ms' ? level.labelMalay : level.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ScrollView>
            </View>

            <View style={styles.toggleSection}>
              <View style={styles.toggleRow}>
                <View style={styles.toggleInfo}>
                  <Icon name="hospital" size={20} color={theme.textSecondary} />
                  <Text style={[styles.toggleLabel, { color: theme.text }]}>
                    {t('privacy.shareWithProviders')}
                  </Text>
                </View>
                <Switch
                  value={categorySettings.shareWithHealthcareProviders}
                  onValueChange={(value) => handleProviderSharingToggle(config.category, value)}
                  trackColor={{ false: theme.border, true: theme.primaryLight }}
                  thumbColor={categorySettings.shareWithHealthcareProviders ? theme.primary : '#f4f3f4'}
                />
              </View>

              <View style={styles.toggleRow}>
                <View style={styles.toggleInfo}>
                  <Icon name="alert-circle" size={20} color={theme.error} />
                  <Text style={[styles.toggleLabel, { color: theme.text }]}>
                    {t('privacy.emergencyOverride')}
                  </Text>
                </View>
                <Switch
                  value={categorySettings.emergencyOverride}
                  onValueChange={(value) => handleEmergencyOverrideToggle(config.category, value)}
                  trackColor={{ false: theme.border, true: theme.errorLight }}
                  thumbColor={categorySettings.emergencyOverride ? theme.error : '#f4f3f4'}
                />
              </View>
            </View>

            {categorySettings.visibility === 'custom' && (
              <TouchableOpacity
                style={[styles.customButton, { backgroundColor: theme.primary }]}
                onPress={() => {
                  setSelectedCategory(config.category);
                  setShowMemberModal(true);
                }}
              >
                <Icon name="account-multiple" size={20} color="#FFF" />
                <Text style={styles.customButtonText}>
                  {t('privacy.manageFamilyAccess')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderCulturalPreferences = () => {
    if (!privacySettings?.culturalPreferences) return null;

    const prefs = privacySettings.culturalPreferences;

    return (
      <View style={[styles.section, { backgroundColor: theme.card }]}>
        <View style={styles.sectionHeader}>
          <Icon name="account-group" size={24} color={theme.primary} />
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            {t('privacy.culturalPreferences')}
          </Text>
        </View>

        <View style={styles.culturalOptions}>
          <View style={styles.toggleRow}>
            <Text style={[styles.toggleLabel, { color: theme.text }]}>
              {t('privacy.respectElderHierarchy')}
            </Text>
            <Switch
              value={prefs.respectElderHierarchy}
              onValueChange={async (value) => {
                if (!user?.id) return;
                await privacyManager.updatePrivacySettings({
                  userId: user.id,
                  familyId,
                  updates: {
                    culturalPreferences: {
                      ...prefs,
                      respectElderHierarchy: value
                    }
                  },
                  reason: 'Updated elder hierarchy preference'
                });
              }}
              trackColor={{ false: theme.border, true: theme.primaryLight }}
              thumbColor={prefs.respectElderHierarchy ? theme.primary : '#f4f3f4'}
            />
          </View>

          <View style={styles.toggleRow}>
            <Text style={[styles.toggleLabel, { color: theme.text }]}>
              {t('privacy.collectiveDecisionMaking')}
            </Text>
            <Switch
              value={prefs.collectiveDecisionMaking}
              onValueChange={async (value) => {
                if (!user?.id) return;
                await privacyManager.updatePrivacySettings({
                  userId: user.id,
                  familyId,
                  updates: {
                    culturalPreferences: {
                      ...prefs,
                      collectiveDecisionMaking: value
                    }
                  },
                  reason: 'Updated collective decision preference'
                });
              }}
              trackColor={{ false: theme.border, true: theme.primaryLight }}
              thumbColor={prefs.collectiveDecisionMaking ? theme.primary : '#f4f3f4'}
            />
          </View>

          <View style={styles.toggleRow}>
            <Text style={[styles.toggleLabel, { color: theme.text }]}>
              {t('privacy.prayerTimePrivacy')}
            </Text>
            <Switch
              value={prefs.prayerTimePrivacy}
              onValueChange={async (value) => {
                if (!user?.id) return;
                await privacyManager.updatePrivacySettings({
                  userId: user.id,
                  familyId,
                  updates: {
                    culturalPreferences: {
                      ...prefs,
                      prayerTimePrivacy: value
                    }
                  },
                  reason: 'Updated prayer time privacy preference'
                });
              }}
              trackColor={{ false: theme.border, true: theme.primaryLight }}
              thumbColor={prefs.prayerTimePrivacy ? theme.primary : '#f4f3f4'}
            />
          </View>
        </View>
      </View>
    );
  };

  const renderComplianceSection = () => {
    return (
      <View style={[styles.section, { backgroundColor: theme.card }]}>
        <View style={styles.sectionHeader}>
          <Icon name="shield-check" size={24} color={theme.success} />
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            {t('privacy.complianceAndIntegration')}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.complianceButton, { borderColor: theme.border }]}
          onPress={() => setShowPDPAModal(true)}
        >
          <View style={styles.complianceInfo}>
            <Icon name="file-document-outline" size={20} color={theme.primary} />
            <Text style={[styles.complianceText, { color: theme.text }]}>
              {t('privacy.pdpaConsent')}
            </Text>
          </View>
          <Icon name="chevron-right" size={20} color={theme.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.complianceButton, { borderColor: theme.border }]}
          onPress={() => setShowFHIRModal(true)}
        >
          <View style={styles.complianceInfo}>
            <Icon name="hospital-building" size={20} color={theme.primary} />
            <Text style={[styles.complianceText, { color: theme.text }]}>
              {t('privacy.healthcareProviderIntegration')}
            </Text>
          </View>
          <Icon name="chevron-right" size={20} color={theme.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.complianceButton, { borderColor: theme.border }]}
          onPress={async () => {
            if (!user?.id) return;
            const auditTrail = await privacyManager.getAuditTrail(user.id);
            Alert.alert(
              t('privacy.auditTrail'),
              t('privacy.auditTrailInfo', { count: auditTrail.length }),
              [{ text: t('common.ok') }]
            );
          }}
        >
          <View style={styles.complianceInfo}>
            <Icon name="history" size={20} color={theme.primary} />
            <Text style={[styles.complianceText, { color: theme.text }]}>
              {t('privacy.viewAuditTrail')}
            </Text>
          </View>
          <Icon name="chevron-right" size={20} color={theme.textSecondary} />
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
          {t('privacy.loading')}
        </Text>
      </View>
    );
  }

  if (!privacySettings) {
    return (
      <View style={[styles.errorContainer, { backgroundColor: theme.background }]}>
        <Icon name="alert-circle" size={48} color={theme.error} />
        <Text style={[styles.errorText, { color: theme.text }]}>
          {t('privacy.noSettings')}
        </Text>
        <TouchableOpacity
          style={[styles.retryButton, { backgroundColor: theme.primary }]}
          onPress={loadPrivacySettings}
        >
          <Text style={styles.retryButtonText}>{t('common.retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.background }]}>
      {saving && (
        <View style={[styles.savingBanner, { backgroundColor: theme.primaryLight }]}>
          <ActivityIndicator size="small" color={theme.primary} />
          <Text style={[styles.savingText, { color: theme.primary }]}>
            {t('privacy.saving')}
          </Text>
        </View>
      )}

      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          {t('privacy.title')}
        </Text>
        <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
          {t('privacy.subtitle')}
        </Text>
      </View>

      <View style={styles.categories}>
        {DATA_CATEGORIES.map(renderCategoryItem)}
      </View>

      {renderCulturalPreferences()}
      {renderComplianceSection()}

      <View style={styles.footer}>
        <Text style={[styles.footerText, { color: theme.textSecondary }]}>
          {t('privacy.lastUpdated', {
            date: privacySettings.lastUpdated
              ? new Date(privacySettings.lastUpdated).toLocaleDateString()
              : 'N/A'
          })}
        </Text>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center'
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginVertical: 16
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600'
  },
  savingBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8
  },
  savingText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500'
  },
  header: {
    padding: 20
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8
  },
  headerSubtitle: {
    fontSize: 14
  },
  categories: {
    paddingHorizontal: 16
  },
  categoryCard: {
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2
  },
  categoryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start'
  },
  categoryInfo: {
    flexDirection: 'row',
    flex: 1
  },
  categoryIcon: {
    marginRight: 12
  },
  categoryText: {
    flex: 1
  },
  categoryTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4
  },
  categoryDescription: {
    fontSize: 12
  },
  categoryStatus: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginTop: 4
  },
  statusText: {
    fontSize: 11,
    fontWeight: '500',
    marginLeft: 4
  },
  categoryDetails: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.1)'
  },
  detailSection: {
    marginBottom: 16
  },
  detailLabel: {
    fontSize: 12,
    marginBottom: 8,
    fontWeight: '500'
  },
  visibilityOptions: {
    flexDirection: 'row',
    paddingVertical: 4
  },
  visibilityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1
  },
  visibilityOptionText: {
    fontSize: 12,
    marginLeft: 6,
    fontWeight: '500'
  },
  toggleSection: {
    marginTop: 12
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8
  },
  toggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  toggleLabel: {
    fontSize: 14,
    marginLeft: 8
  },
  customButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 12
  },
  customButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8
  },
  section: {
    margin: 16,
    padding: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 12
  },
  culturalOptions: {
    marginTop: 8
  },
  complianceButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    marginBottom: 8
  },
  complianceInfo: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  complianceText: {
    fontSize: 14,
    marginLeft: 12
  },
  footer: {
    padding: 20,
    alignItems: 'center'
  },
  footerText: {
    fontSize: 12
  }
});

export default PrivacySettings;