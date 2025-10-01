/**
 * Emergency Configuration Component
 *
 * Provides a comprehensive UI for configuring emergency detection and notification settings:
 * - Emergency trigger condition management
 * - Cultural-aware escalation rules
 * - Family emergency contact configuration
 * - Malaysian emergency service integration
 * - Prayer time and cultural sensitivity settings
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import EmergencyEngine, {
  EmergencyDetectionConfig,
  EmergencyTriggerCondition
} from '@/services/emergency/EmergencyEngine';
import CulturalEmergencyHandler from '@/services/emergency/CulturalEmergencyHandler';
import { COLORS, TYPOGRAPHY } from '@/constants/config';
import { useAppSelector } from '@/store/hooks';
import type { SupportedLanguage } from '@/i18n/translations';

interface EmergencyConfigurationProps {
  patientId: string;
  onConfigSaved?: (config: EmergencyDetectionConfig) => void;
  onError?: (error: string) => void;
}

interface TriggerConditionForm {
  name: string;
  type: EmergencyTriggerCondition['type'];
  severity: 'low' | 'medium' | 'high' | 'critical';
  timeThreshold: number;
  medicationCriticality: 'life_saving' | 'critical' | 'important' | 'routine';
  enabled: boolean;
}

export const EmergencyConfiguration: React.FC<EmergencyConfigurationProps> = ({
  patientId,
  onConfigSaved,
  onError
}) => {
  const [config, setConfig] = useState<EmergencyDetectionConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'detection' | 'triggers' | 'cultural' | 'emergency'>('detection');
  const [newTrigger, setNewTrigger] = useState<TriggerConditionForm>({
    name: '',
    type: 'missed_critical_medication',
    severity: 'high',
    timeThreshold: 15,
    medicationCriticality: 'critical',
    enabled: true
  });

  const { profile } = useAppSelector((state) => state.cultural);
  const language = profile?.language || 'en';

  const emergencyEngine = EmergencyEngine.getInstance();
  const culturalHandler = CulturalEmergencyHandler.getInstance();

  const loadConfiguration = useCallback(async () => {
    try {
      setIsLoading(true);
      const currentConfig = emergencyEngine.getConfiguration();
      setConfig(currentConfig);
    } catch (error) {
      console.error('Failed to load emergency configuration:', error);
      onError?.('Failed to load emergency configuration');
    } finally {
      setIsLoading(false);
    }
  }, [emergencyEngine, onError]);

  useEffect(() => {
    loadConfiguration();
  }, [loadConfiguration]);

  const handleSaveConfiguration = async () => {
    if (!config) return;

    try {
      setIsSaving(true);
      await emergencyEngine.updateConfiguration(config);
      onConfigSaved?.(config);

      const successMessages = {
        en: 'Emergency configuration saved successfully',
        ms: 'Konfigurasi kecemasan berjaya disimpan',
        zh: '紧急配置已成功保存',
        ta: 'அவசர கட்டமைப்பு வெற்றிகரமாக சேமிக்கப்பட்டது'
      };

      Alert.alert('Success', successMessages[language as keyof typeof successMessages] || successMessages.en);
    } catch (error) {
      console.error('Failed to save emergency configuration:', error);
      const errorMessages = {
        en: 'Failed to save emergency configuration',
        ms: 'Gagal menyimpan konfigurasi kecemasan',
        zh: '无法保存紧急配置',
        ta: 'அவசர கட்டமைப்பை சேமிக்க முடியவில்லை'
      };
      Alert.alert('Error', errorMessages[language as keyof typeof errorMessages] || errorMessages.en);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleDetection = (enabled: boolean) => {
    if (!config) return;
    setConfig({
      ...config,
      detection: {
        ...config.detection,
        enabled
      }
    });
  };

  const handleAddTrigger = () => {
    if (!config || !newTrigger.name.trim()) {
      Alert.alert('Error', 'Please enter a trigger name');
      return;
    }

    const triggerId = `trigger_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

    const trigger: EmergencyTriggerCondition = {
      id: triggerId,
      name: newTrigger.name,
      type: newTrigger.type,
      severity: newTrigger.severity,
      triggerParams: {
        timeThreshold: newTrigger.timeThreshold,
        medicationCriticality: newTrigger.medicationCriticality,
        patientRiskProfile: 'moderate_risk'
      },
      detection: {
        enabled: newTrigger.enabled,
        detectionWindow: 5,
        maxDetectionTime: 2,
        requireConfirmation: false,
        autoResolve: false
      },
      escalation: {
        immediateEscalation: newTrigger.severity === 'critical',
        escalationDelay: newTrigger.severity === 'critical' ? 0 : 5,
        escalationLevels: [],
        stopOnPatientResponse: true,
        stopOnFamilyResponse: true
      },
      culturalAdaptations: {
        respectPrayerTimes: true,
        adaptForElderlyPatients: true,
        considerFamilyHierarchy: true,
        useCulturalMessaging: true,
        respectPrivacyNorms: true
      },
      createdAt: new Date(),
      triggerCount: 0,
      isActive: true
    };

    setConfig({
      ...config,
      triggers: [...config.triggers, trigger]
    });

    // Reset form
    setNewTrigger({
      name: '',
      type: 'missed_critical_medication',
      severity: 'high',
      timeThreshold: 15,
      medicationCriticality: 'critical',
      enabled: true
    });
  };

  const handleRemoveTrigger = (triggerId: string) => {
    if (!config) return;

    const confirmMessages = {
      en: 'Are you sure you want to remove this trigger?',
      ms: 'Adakah anda pasti mahu membuang pencetus ini?',
      zh: '您确定要删除此触发器吗？',
      ta: 'இந்த தூண்டுதலை அகற்ற நீங்கள் உறுதியாக இருக்கிறீர்களா?'
    };

    Alert.alert(
      'Confirm Removal',
      confirmMessages[language as keyof typeof confirmMessages] || confirmMessages.en,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setConfig({
              ...config,
              triggers: config.triggers.filter(t => t.id !== triggerId)
            });
          }
        }
      ]
    );
  };

  const handleToggleTrigger = (triggerId: string, enabled: boolean) => {
    if (!config) return;

    setConfig({
      ...config,
      triggers: config.triggers.map(trigger =>
        trigger.id === triggerId
          ? { ...trigger, detection: { ...trigger.detection, enabled } }
          : trigger
      )
    });
  };

  const handleUpdateCulturalSettings = (key: string, value: any) => {
    if (!config) return;

    setConfig({
      ...config,
      culturalSettings: {
        ...config.culturalSettings,
        [key]: value
      }
    });
  };

  const handleUpdateEmergencyServices = (key: string, value: any) => {
    if (!config) return;

    setConfig({
      ...config,
      emergencyServices: {
        ...config.emergencyServices,
        [key]: value
      }
    });
  };

  const renderDetectionTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>
        {language === 'ms' ? 'Tetapan Pengesanan' :
         language === 'zh' ? '检测设置' :
         language === 'ta' ? 'கண்டறிதல் அமைப்புகள்' :
         'Detection Settings'}
      </Text>

      <View style={styles.settingRow}>
        <Text style={styles.settingLabel}>
          {language === 'ms' ? 'Dayakan Pengesanan Kecemasan' :
           language === 'zh' ? '启用紧急检测' :
           language === 'ta' ? 'அவசர கண்டறிதலை இயக்கவும்' :
           'Enable Emergency Detection'}
        </Text>
        <Switch
          value={config?.detection.enabled || false}
          onValueChange={handleToggleDetection}
          trackColor={{ false: COLORS.gray[300], true: COLORS.primary }}
          thumbColor={config?.detection.enabled ? COLORS.white : COLORS.gray[400]}
        />
      </View>

      <View style={styles.settingRow}>
        <Text style={styles.settingLabel}>
          {language === 'ms' ? 'Masa Pengesanan Maksimum (minit)' :
           language === 'zh' ? '最大检测时间（分钟）' :
           language === 'ta' ? 'அதிகபட்ச கண்டறிதல் நேரம் (நிமிடங்கள்)' :
           'Maximum Detection Time (minutes)'}
        </Text>
        <TextInput
          style={styles.numberInput}
          value={config?.detection.maxDetectionTime?.toString() || '2'}
          onChangeText={(text) => {
            const minutes = parseInt(text) || 2;
            if (config) {
              setConfig({
                ...config,
                detection: { ...config.detection, maxDetectionTime: minutes }
              });
            }
          }}
          keyboardType="numeric"
          placeholder="2"
        />
      </View>

      <View style={styles.settingRow}>
        <Text style={styles.settingLabel}>
          {language === 'ms' ? 'Pemantauan Latar Belakang' :
           language === 'zh' ? '后台监控' :
           language === 'ta' ? 'பின்னணி கண்காணிப்பு' :
           'Background Monitoring'}
        </Text>
        <Switch
          value={config?.detection.backgroundMonitoring || false}
          onValueChange={(enabled) => {
            if (config) {
              setConfig({
                ...config,
                detection: { ...config.detection, backgroundMonitoring: enabled }
              });
            }
          }}
          trackColor={{ false: COLORS.gray[300], true: COLORS.primary }}
          thumbColor={config?.detection.backgroundMonitoring ? COLORS.white : COLORS.gray[400]}
        />
      </View>
    </View>
  );

  const renderTriggersTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>
        {language === 'ms' ? 'Pencetus Kecemasan' :
         language === 'zh' ? '紧急触发器' :
         language === 'ta' ? 'அவசர தூண்டுதல்கள்' :
         'Emergency Triggers'}
      </Text>

      {/* Add New Trigger Form */}
      <View style={styles.addTriggerForm}>
        <Text style={styles.formTitle}>
          {language === 'ms' ? 'Tambah Pencetus Baru' :
           language === 'zh' ? '添加新触发器' :
           language === 'ta' ? 'புதிய தூண்டுதலை சேர்க்கவும்' :
           'Add New Trigger'}
        </Text>

        <TextInput
          style={styles.textInput}
          placeholder={language === 'ms' ? 'Nama Pencetus' :
                      language === 'zh' ? '触发器名称' :
                      language === 'ta' ? 'தூண்டுதல் பெயர்' :
                      'Trigger Name'}
          value={newTrigger.name}
          onChangeText={(text) => setNewTrigger({ ...newTrigger, name: text })}
        />

        <View style={styles.pickerContainer}>
          <Text style={styles.pickerLabel}>
            {language === 'ms' ? 'Jenis' : language === 'zh' ? '类型' : language === 'ta' ? 'வகை' : 'Type'}
          </Text>
          <Picker
            selectedValue={newTrigger.type}
            style={styles.picker}
            onValueChange={(value) => setNewTrigger({ ...newTrigger, type: value })}
          >
            <Picker.Item
              label={language === 'ms' ? 'Ubat Kritikal Terlepas' :
                     language === 'zh' ? '错过关键药物' :
                     language === 'ta' ? 'முக்கியமான மருந்து தவறவிட்டது' :
                     'Missed Critical Medication'}
              value="missed_critical_medication"
            />
            <Picker.Item
              label={language === 'ms' ? 'Tiada Aktiviti App' :
                     language === 'zh' ? '无应用活动' :
                     language === 'ta' ? 'பயன்பாடு செயல்பாடு இல்லை' :
                     'No App Activity'}
              value="no_app_activity"
            />
            <Picker.Item
              label={language === 'ms' ? 'Kecemasan Manual' :
                     language === 'zh' ? '手动紧急' :
                     language === 'ta' ? 'கைமுறை அவசரநிலை' :
                     'Manual Emergency'}
              value="manual_emergency"
            />
          </Picker>
        </View>

        <View style={styles.pickerContainer}>
          <Text style={styles.pickerLabel}>
            {language === 'ms' ? 'Keterukan' : language === 'zh' ? '严重程度' : language === 'ta' ? 'தீவிரம்' : 'Severity'}
          </Text>
          <Picker
            selectedValue={newTrigger.severity}
            style={styles.picker}
            onValueChange={(value) => setNewTrigger({ ...newTrigger, severity: value })}
          >
            <Picker.Item label="Low" value="low" />
            <Picker.Item label="Medium" value="medium" />
            <Picker.Item label="High" value="high" />
            <Picker.Item label="Critical" value="critical" />
          </Picker>
        </View>

        <View style={styles.numberInputContainer}>
          <Text style={styles.pickerLabel}>
            {language === 'ms' ? 'Ambang Masa (minit)' :
             language === 'zh' ? '时间阈值（分钟）' :
             language === 'ta' ? 'நேர வரம்பு (நிமிடங்கள்)' :
             'Time Threshold (minutes)'}
          </Text>
          <TextInput
            style={styles.numberInput}
            value={newTrigger.timeThreshold.toString()}
            onChangeText={(text) => setNewTrigger({ ...newTrigger, timeThreshold: parseInt(text) || 15 })}
            keyboardType="numeric"
          />
        </View>

        <TouchableOpacity style={styles.addButton} onPress={handleAddTrigger}>
          <Text style={styles.addButtonText}>
            {language === 'ms' ? 'Tambah Pencetus' :
             language === 'zh' ? '添加触发器' :
             language === 'ta' ? 'தூண்டுதலை சேர்க்கவும்' :
             'Add Trigger'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Existing Triggers List */}
      <View style={styles.triggersList}>
        <Text style={styles.formTitle}>
          {language === 'ms' ? 'Pencetus Sedia Ada' :
           language === 'zh' ? '现有触发器' :
           language === 'ta' ? 'தற்போதுள்ள தூண்டுதல்கள்' :
           'Existing Triggers'}
        </Text>

        {config?.triggers.map((trigger) => (
          <View key={trigger.id} style={styles.triggerItem}>
            <View style={styles.triggerHeader}>
              <Text style={styles.triggerName}>{trigger.name}</Text>
              <View style={styles.triggerActions}>
                <Switch
                  value={trigger.detection.enabled}
                  onValueChange={(enabled) => handleToggleTrigger(trigger.id, enabled)}
                  trackColor={{ false: COLORS.gray[300], true: COLORS.primary }}
                  thumbColor={trigger.detection.enabled ? COLORS.white : COLORS.gray[400]}
                />
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => handleRemoveTrigger(trigger.id)}
                >
                  <Text style={styles.removeButtonText}>×</Text>
                </TouchableOpacity>
              </View>
            </View>

            <Text style={styles.triggerDetails}>
              {trigger.type.replace(/_/g, ' ')} • {trigger.severity} • {trigger.triggerParams.timeThreshold}min
            </Text>
          </View>
        ))}
      </View>
    </View>
  );

  const renderCulturalTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>
        {language === 'ms' ? 'Tetapan Budaya' :
         language === 'zh' ? '文化设置' :
         language === 'ta' ? 'கலாசார அமைப்புகள்' :
         'Cultural Settings'}
      </Text>

      <View style={styles.settingRow}>
        <Text style={styles.settingLabel}>
          {language === 'ms' ? 'Hormati Norma Budaya' :
           language === 'zh' ? '尊重文化规范' :
           language === 'ta' ? 'கலாசார விதிமுறைகளை மதிக்கவும்' :
           'Respect Cultural Norms'}
        </Text>
        <Switch
          value={config?.culturalSettings.respectCulturalNorms || false}
          onValueChange={(value) => handleUpdateCulturalSettings('respectCulturalNorms', value)}
          trackColor={{ false: COLORS.gray[300], true: COLORS.primary }}
          thumbColor={config?.culturalSettings.respectCulturalNorms ? COLORS.white : COLORS.gray[400]}
        />
      </View>

      <View style={styles.settingRow}>
        <Text style={styles.settingLabel}>
          {language === 'ms' ? 'Pertimbangkan Amalan Agama' :
           language === 'zh' ? '考虑宗教习俗' :
           language === 'ta' ? 'மத நடைமுறைகளை கருத்தில் கொள்ளுங்கள்' :
           'Consider Religious Practices'}
        </Text>
        <Switch
          value={config?.culturalSettings.considerReligiousPractices || false}
          onValueChange={(value) => handleUpdateCulturalSettings('considerReligiousPractices', value)}
          trackColor={{ false: COLORS.gray[300], true: COLORS.primary }}
          thumbColor={config?.culturalSettings.considerReligiousPractices ? COLORS.white : COLORS.gray[400]}
        />
      </View>

      <View style={styles.settingRow}>
        <Text style={styles.settingLabel}>
          {language === 'ms' ? 'Sesuaikan Gaya Mesej' :
           language === 'zh' ? '适应消息样式' :
           language === 'ta' ? 'செய்தி பாணியை தழுவுங்கள்' :
           'Adapt Messaging Style'}
        </Text>
        <Switch
          value={config?.culturalSettings.adaptMessagingStyle || false}
          onValueChange={(value) => handleUpdateCulturalSettings('adaptMessagingStyle', value)}
          trackColor={{ false: COLORS.gray[300], true: COLORS.primary }}
          thumbColor={config?.culturalSettings.adaptMessagingStyle ? COLORS.white : COLORS.gray[400]}
        />
      </View>

      <View style={styles.pickerContainer}>
        <Text style={styles.pickerLabel}>
          {language === 'ms' ? 'Bahasa Lalai' :
           language === 'zh' ? '默认语言' :
           language === 'ta' ? 'இயல்புநிலை மொழி' :
           'Default Language'}
        </Text>
        <Picker
          selectedValue={config?.culturalSettings.defaultLanguage || 'ms'}
          style={styles.picker}
          onValueChange={(value) => handleUpdateCulturalSettings('defaultLanguage', value)}
        >
          <Picker.Item label="Bahasa Melayu" value="ms" />
          <Picker.Item label="English" value="en" />
          <Picker.Item label="中文" value="zh" />
          <Picker.Item label="தமிழ்" value="ta" />
        </Picker>
      </View>
    </View>
  );

  const renderEmergencyServicesTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>
        {language === 'ms' ? 'Perkhidmatan Kecemasan' :
         language === 'zh' ? '紧急服务' :
         language === 'ta' ? 'அவசர சேவைகள்' :
         'Emergency Services'}
      </Text>

      <View style={styles.settingRow}>
        <Text style={styles.settingLabel}>
          {language === 'ms' ? 'Dayakan Hubungan Perkhidmatan Kecemasan' :
           language === 'zh' ? '启用紧急服务联系' :
           language === 'ta' ? 'அவசர சேவை தொடர்பை இயக்கவும்' :
           'Enable Emergency Service Contact'}
        </Text>
        <Switch
          value={config?.emergencyServices.enableEmergencyServiceContact || false}
          onValueChange={(value) => handleUpdateEmergencyServices('enableEmergencyServiceContact', value)}
          trackColor={{ false: COLORS.gray[300], true: COLORS.primary }}
          thumbColor={config?.emergencyServices.enableEmergencyServiceContact ? COLORS.white : COLORS.gray[400]}
        />
      </View>

      <View style={styles.settingRow}>
        <Text style={styles.settingLabel}>
          {language === 'ms' ? 'Nombor Kecemasan' :
           language === 'zh' ? '紧急号码' :
           language === 'ta' ? 'அவசர எண்' :
           'Emergency Number'}
        </Text>
        <TextInput
          style={styles.emergencyNumberInput}
          value={config?.emergencyServices.emergencyNumber || '999'}
          onChangeText={(text) => handleUpdateEmergencyServices('emergencyNumber', text)}
          keyboardType="phone-pad"
          placeholder="999"
        />
      </View>

      <View style={styles.settingRow}>
        <Text style={styles.settingLabel}>
          {language === 'ms' ? 'Memerlukan Kelulusan Manual' :
           language === 'zh' ? '需要手动批准' :
           language === 'ta' ? 'கைமுறை ஒப்புதல் தேவை' :
           'Require Manual Approval'}
        </Text>
        <Switch
          value={config?.emergencyServices.requireManualApproval || false}
          onValueChange={(value) => handleUpdateEmergencyServices('requireManualApproval', value)}
          trackColor={{ false: COLORS.gray[300], true: COLORS.primary }}
          thumbColor={config?.emergencyServices.requireManualApproval ? COLORS.white : COLORS.gray[400]}
        />
      </View>

      <View style={styles.numberInputContainer}>
        <Text style={styles.pickerLabel}>
          {language === 'ms' ? 'Ambang Peningkatan (1-5)' :
           language === 'zh' ? '升级阈值 (1-5)' :
           language === 'ta' ? 'அதிகரிப்பு வரம்பு (1-5)' :
           'Escalation Threshold (1-5)'}
        </Text>
        <TextInput
          style={styles.numberInput}
          value={config?.emergencyServices.escalationThreshold?.toString() || '4'}
          onChangeText={(text) => {
            const threshold = Math.max(1, Math.min(5, parseInt(text) || 4));
            handleUpdateEmergencyServices('escalationThreshold', threshold);
          }}
          keyboardType="numeric"
          placeholder="4"
        />
      </View>
    </View>
  );

  const renderTabButton = (
    tabKey: typeof activeTab,
    title: string,
    icon: string
  ) => (
    <TouchableOpacity
      style={[styles.tabButton, activeTab === tabKey && styles.activeTabButton]}
      onPress={() => setActiveTab(tabKey)}
    >
      <Text style={styles.tabIcon}>{icon}</Text>
      <Text style={[styles.tabButtonText, activeTab === tabKey && styles.activeTabButtonText]}>
        {title}
      </Text>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>
          {language === 'ms' ? 'Memuatkan konfigurasi...' :
           language === 'zh' ? '加载配置中...' :
           language === 'ta' ? 'கட்டமைப்பை ஏற்றுகிறது...' :
           'Loading configuration...'}
        </Text>
      </View>
    );
  }

  if (!config) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>
          {language === 'ms' ? 'Gagal memuatkan konfigurasi' :
           language === 'zh' ? '无法加载配置' :
           language === 'ta' ? 'கட்டமைப்பை ஏற்ற முடியவில்லை' :
           'Failed to load configuration'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Tab Navigation */}
      <View style={styles.tabNavigation}>
        {renderTabButton('detection',
          language === 'ms' ? 'Pengesanan' :
          language === 'zh' ? '检测' :
          language === 'ta' ? 'கண்டறிதல்' :
          'Detection', '🔍')}
        {renderTabButton('triggers',
          language === 'ms' ? 'Pencetus' :
          language === 'zh' ? '触发器' :
          language === 'ta' ? 'தூண்டுதல்கள்' :
          'Triggers', '⚡')}
        {renderTabButton('cultural',
          language === 'ms' ? 'Budaya' :
          language === 'zh' ? '文化' :
          language === 'ta' ? 'கலாசாரம்' :
          'Cultural', '🕌')}
        {renderTabButton('emergency',
          language === 'ms' ? 'Perkhidmatan' :
          language === 'zh' ? '服务' :
          language === 'ta' ? 'சேவைகள்' :
          'Services', '🚨')}
      </View>

      {/* Tab Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === 'detection' && renderDetectionTab()}
        {activeTab === 'triggers' && renderTriggersTab()}
        {activeTab === 'cultural' && renderCulturalTab()}
        {activeTab === 'emergency' && renderEmergencyServicesTab()}
      </ScrollView>

      {/* Save Button */}
      <TouchableOpacity
        style={[styles.saveButton, isSaving && styles.disabledSaveButton]}
        onPress={handleSaveConfiguration}
        disabled={isSaving}
      >
        {isSaving ? (
          <ActivityIndicator size="small" color={COLORS.white} />
        ) : (
          <Text style={styles.saveButtonText}>
            {language === 'ms' ? 'Simpan Konfigurasi' :
             language === 'zh' ? '保存配置' :
             language === 'ta' ? 'கட்டமைப்பைச் சேமிக்கவும்' :
             'Save Configuration'}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: TYPOGRAPHY.fontSizes.base,
    color: COLORS.gray[600],
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: TYPOGRAPHY.fontSizes.base,
    color: COLORS.error,
    textAlign: 'center',
  },
  tabNavigation: {
    flexDirection: 'row',
    backgroundColor: COLORS.gray[100],
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  activeTabButton: {
    backgroundColor: COLORS.white,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabIcon: {
    fontSize: 20,
    marginBottom: 4,
  },
  tabButtonText: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    color: COLORS.gray[600],
    fontWeight: TYPOGRAPHY.fontWeights.medium,
  },
  activeTabButtonText: {
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.fontWeights.semibold,
  },
  content: {
    flex: 1,
  },
  tabContent: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.fontSizes.lg,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: COLORS.secondary,
    marginBottom: 20,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  settingLabel: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSizes.base,
    color: COLORS.secondary,
    marginRight: 16,
  },
  textInput: {
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: TYPOGRAPHY.fontSizes.base,
    marginBottom: 12,
  },
  numberInput: {
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: TYPOGRAPHY.fontSizes.base,
    width: 80,
    textAlign: 'center',
  },
  numberInputContainer: {
    marginBottom: 16,
  },
  emergencyNumberInput: {
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: TYPOGRAPHY.fontSizes.base,
    width: 100,
    textAlign: 'center',
  },
  pickerContainer: {
    marginBottom: 16,
  },
  pickerLabel: {
    fontSize: TYPOGRAPHY.fontSizes.base,
    color: COLORS.secondary,
    marginBottom: 8,
    fontWeight: TYPOGRAPHY.fontWeights.medium,
  },
  picker: {
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 8,
    backgroundColor: COLORS.white,
  },
  addTriggerForm: {
    backgroundColor: COLORS.gray[50],
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  formTitle: {
    fontSize: TYPOGRAPHY.fontSizes.base,
    fontWeight: TYPOGRAPHY.fontWeights.semibold,
    color: COLORS.secondary,
    marginBottom: 16,
  },
  addButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  addButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSizes.base,
    fontWeight: TYPOGRAPHY.fontWeights.semibold,
  },
  triggersList: {
    marginTop: 8,
  },
  triggerItem: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  triggerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  triggerName: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSizes.base,
    fontWeight: TYPOGRAPHY.fontWeights.semibold,
    color: COLORS.secondary,
  },
  triggerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  removeButton: {
    backgroundColor: COLORS.error,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeButtonText: {
    color: COLORS.white,
    fontSize: 18,
    fontWeight: 'bold',
  },
  triggerDetails: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    color: COLORS.gray[600],
    textTransform: 'capitalize',
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    margin: 16,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  disabledSaveButton: {
    backgroundColor: COLORS.gray[400],
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSizes.base,
    fontWeight: TYPOGRAPHY.fontWeights.semibold,
  },
});

export default EmergencyConfiguration;