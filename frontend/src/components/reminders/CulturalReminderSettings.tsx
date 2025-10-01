/**
 * Cultural Reminder Settings Component
 *
 * Cultural-aware reminder configuration interface:
 * - Prayer time avoidance settings
 * - Ramadan schedule adjustments
 * - Cultural sound preferences
 * - Language-specific settings
 * - Traditional medicine considerations
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ScrollView,
  Alert,
  Picker,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Slider from '@react-native-community/slider';
import { COLORS } from '@/constants/config';

interface CulturalProfile {
  language: 'en' | 'ms' | 'zh' | 'ta';
  religion?: string;
  location?: {
    state: string;
    country: string;
  };
}

interface ReminderSettings {
  enabled: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  reminderMinutesBefore: number;
  snoozeMinutes: number;
  maxSnoozeCount: number;
  quietHours: {
    start: string;
    end: string;
    enabled: boolean;
  };
}

interface CulturalReminderSettingsProps {
  settings: ReminderSettings;
  culturalProfile?: CulturalProfile;
  onUpdateSettings: (updates: Partial<ReminderSettings>) => void;
  language: 'en' | 'ms' | 'zh' | 'ta';
}

interface CulturalSettings {
  avoidPrayerTimes: boolean;
  prayerBufferMinutes: number;
  ramadanAdjustments: boolean;
  culturalSounds: boolean;
  selectedCulturalSound: string;
  respectTraditionalMedicine: boolean;
  elderlyfriendlyMode: boolean;
  familyNotifications: boolean;
}

export const CulturalReminderSettings: React.FC<CulturalReminderSettingsProps> = ({
  settings,
  culturalProfile,
  onUpdateSettings,
  language,
}) => {
  const [culturalSettings, setCulturalSettings] = useState<CulturalSettings>({
    avoidPrayerTimes: true,
    prayerBufferMinutes: 15,
    ramadanAdjustments: true,
    culturalSounds: true,
    selectedCulturalSound: 'gamelan',
    respectTraditionalMedicine: true,
    elderlyfriendlyMode: false,
    familyNotifications: true,
  });

  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['basic']));

  // Get localized text
  const getLocalizedText = (key: string, defaultText: string): string => {
    const translations: Record<string, Record<string, string>> = {
      en: {
        culturalSettings: 'Cultural Settings',
        religiousObservance: 'Religious Observance',
        soundPreferences: 'Sound Preferences',
        familySettings: 'Family Settings',
        accessibilitySettings: 'Accessibility Settings',
        avoidPrayerTimes: 'Avoid Prayer Times',
        prayerTimeDesc: 'Automatically reschedule reminders that conflict with prayer times',
        prayerBufferMinutes: 'Prayer Time Buffer',
        bufferDesc: 'Minutes before and after prayer times to avoid',
        ramadanAdjustments: 'Ramadan Adjustments',
        ramadanDesc: 'Adjust schedules during Ramadan fasting',
        culturalSounds: 'Cultural Sounds',
        culturalSoundDesc: 'Use traditional sounds for reminders',
        soundSelection: 'Sound Selection',
        gamelan: 'Gamelan (Malaysian)',
        templeBells: 'Temple Bells (Chinese)',
        veena: 'Veena (Tamil)',
        nature: 'Nature Sounds',
        modern: 'Modern Chime',
        respectTraditionalMedicine: 'Traditional Medicine',
        traditionalMedDesc: 'Consider traditional medicine interactions',
        elderlyMode: 'Elderly-Friendly Mode',
        elderlyModeDesc: 'Larger text, louder sounds, simpler interface',
        familyNotifications: 'Family Notifications',
        familyNotifDesc: 'Notify family members of missed medications',
        minutes: 'minutes',
        preview: 'Preview',
        save: 'Save Settings',
        saved: 'Settings Saved',
        settingsSaved: 'Cultural settings have been saved successfully',
      },
      ms: {
        culturalSettings: 'Tetapan Budaya',
        religiousObservance: 'Ibadah Agama',
        soundPreferences: 'Pilihan Bunyi',
        familySettings: 'Tetapan Keluarga',
        accessibilitySettings: 'Tetapan Kebolehaksesan',
        avoidPrayerTimes: 'Elak Waktu Solat',
        prayerTimeDesc: 'Jadual semula peringatan yang bertembung dengan waktu solat',
        prayerBufferMinutes: 'Penimbal Waktu Solat',
        bufferDesc: 'Minit sebelum dan selepas waktu solat untuk dielakkan',
        ramadanAdjustments: 'Penyesuaian Ramadan',
        ramadanDesc: 'Sesuaikan jadual semasa puasa Ramadan',
        culturalSounds: 'Bunyi Budaya',
        culturalSoundDesc: 'Gunakan bunyi tradisional untuk peringatan',
        soundSelection: 'Pemilihan Bunyi',
        gamelan: 'Gamelan (Malaysia)',
        templeBells: 'Loceng Tokong (Cina)',
        veena: 'Veena (Tamil)',
        nature: 'Bunyi Alam',
        modern: 'Loceng Moden',
        respectTraditionalMedicine: 'Ubat Tradisional',
        traditionalMedDesc: 'Pertimbangkan interaksi ubat tradisional',
        elderlyMode: 'Mod Warga Emas',
        elderlyModeDesc: 'Teks lebih besar, bunyi lebih kuat, antara muka mudah',
        familyNotifications: 'Pemberitahuan Keluarga',
        familyNotifDesc: 'Beritahu ahli keluarga tentang ubat yang terlepas',
        minutes: 'minit',
        preview: 'Pratonton',
        save: 'Simpan Tetapan',
        saved: 'Tetapan Disimpan',
        settingsSaved: 'Tetapan budaya telah berjaya disimpan',
      },
      zh: {
        culturalSettings: '文化设置',
        religiousObservance: '宗教仪式',
        soundPreferences: '声音偏好',
        familySettings: '家庭设置',
        accessibilitySettings: '无障碍设置',
        avoidPrayerTimes: '避开祈祷时间',
        prayerTimeDesc: '自动重新安排与祈祷时间冲突的提醒',
        prayerBufferMinutes: '祈祷时间缓冲',
        bufferDesc: '祈祷时间前后要避开的分钟数',
        ramadanAdjustments: '斋月调整',
        ramadanDesc: '在斋月禁食期间调整时间表',
        culturalSounds: '文化声音',
        culturalSoundDesc: '使用传统声音进行提醒',
        soundSelection: '声音选择',
        gamelan: '甘美兰（马来西亚）',
        templeBells: '寺庙钟声（中国）',
        veena: '维纳琴（泰米尔）',
        nature: '自然声音',
        modern: '现代钟声',
        respectTraditionalMedicine: '传统医学',
        traditionalMedDesc: '考虑传统药物相互作用',
        elderlyMode: '老年友好模式',
        elderlyModeDesc: '更大的文字，更响的声音，更简单的界面',
        familyNotifications: '家庭通知',
        familyNotifDesc: '通知家庭成员错过的药物',
        minutes: '分钟',
        preview: '预览',
        save: '保存设置',
        saved: '设置已保存',
        settingsSaved: '文化设置已成功保存',
      },
      ta: {
        culturalSettings: 'கலாச்சார அமைப்புகள்',
        religiousObservance: 'மத கடமைகள்',
        soundPreferences: 'ஒலி விருப்பத்தேர்வுகள்',
        familySettings: 'குடும்ப அமைப்புகள்',
        accessibilitySettings: 'அணுகல் அமைப்புகள்',
        avoidPrayerTimes: 'தொழுகை நேரங்களைத் தவிர்க்கவும்',
        prayerTimeDesc: 'தொழுகை நேரங்களுடன் முரண்படும் நினைவூட்டல்களை தானாக மறுசீரமைக்கவும்',
        prayerBufferMinutes: 'தொழுகை நேர இடைவெளி',
        bufferDesc: 'தொழுகை நேரத்திற்கு முன்னும் பின்னும் தவிர்க்க வேண்டிய நிமிடங்கள்',
        ramadanAdjustments: 'ரமளான் சரிசெய்தல்கள்',
        ramadanDesc: 'ரமளான் உபவாசத்தின் போது கால அட்டவணையை சரிசெய்யவும்',
        culturalSounds: 'கலாச்சார ஒலிகள்',
        culturalSoundDesc: 'நினைவூட்டல்களுக்கு பாரம்பரிய ஒலிகளை பயன்படுத்தவும்',
        soundSelection: 'ஒலி தேர்வு',
        gamelan: 'கமலான் (மலேசிய)',
        templeBells: 'கோயில் மணிகள் (சீன)',
        veena: 'வீணை (தமிழ்)',
        nature: 'இயற்கை ஒலிகள்',
        modern: 'நவீன மணி',
        respectTraditionalMedicine: 'பாரம்பரிய மருத்துவம்',
        traditionalMedDesc: 'பாரம்பரிய மருந்து தொடர்புகளைக் கவனியுங்கள்',
        elderlyMode: 'முதியோர் நட்பு பயன்முறை',
        elderlyModeDesc: 'பெரிய உரை, அதிக ஒலி, எளிய இடைமுகம்',
        familyNotifications: 'குடும்ப அறிவிப்புகள்',
        familyNotifDesc: 'தவறவிட்ட மருந்துகளை குடும்ப உறுப்பினர்களுக்கு தெரிவிக்கவும்',
        minutes: 'நிமிடங்கள்',
        preview: 'முன்னோட்டம்',
        save: 'அமைப்புகளை சேமிக்கவும்',
        saved: 'அமைப்புகள் சேமிக்கப்பட்டன',
        settingsSaved: 'கலாச்சார அமைப்புகள் வெற்றிகரமாக சேமிக்கப்பட்டன',
      },
    };

    return translations[language]?.[key] || defaultText;
  };

  // Toggle section expansion
  const toggleSection = useCallback((section: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(section)) {
        newSet.delete(section);
      } else {
        newSet.add(section);
      }
      return newSet;
    });
  }, []);

  // Update cultural setting
  const updateCulturalSetting = useCallback(<K extends keyof CulturalSettings>(
    key: K,
    value: CulturalSettings[K]
  ) => {
    setCulturalSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  // Save settings
  const saveSettings = useCallback(() => {
    // Here you would typically save to storage or send to server
    Alert.alert(
      getLocalizedText('saved', 'Settings Saved'),
      getLocalizedText('settingsSaved', 'Cultural settings have been saved successfully'),
      [{ text: getLocalizedText('ok', 'OK') }]
    );
  }, []);

  // Get cultural sound options
  const getCulturalSoundOptions = () => {
    const options = [
      { value: 'gamelan', label: getLocalizedText('gamelan', 'Gamelan (Malaysian)') },
      { value: 'templeBells', label: getLocalizedText('templeBells', 'Temple Bells (Chinese)') },
      { value: 'veena', label: getLocalizedText('veena', 'Veena (Tamil)') },
      { value: 'nature', label: getLocalizedText('nature', 'Nature Sounds') },
      { value: 'modern', label: getLocalizedText('modern', 'Modern Chime') },
    ];

    // Filter based on cultural profile
    if (culturalProfile?.language === 'ms') {
      return [options[0], options[3], options[4]]; // Gamelan, Nature, Modern
    } else if (culturalProfile?.language === 'zh') {
      return [options[1], options[3], options[4]]; // Temple Bells, Nature, Modern
    } else if (culturalProfile?.language === 'ta') {
      return [options[2], options[3], options[4]]; // Veena, Nature, Modern
    }

    return options;
  };

  // Render section header
  const renderSectionHeader = (section: string, title: string, icon: string) => (
    <TouchableOpacity
      style={styles.sectionHeader}
      onPress={() => toggleSection(section)}
      activeOpacity={0.7}
    >
      <View style={styles.sectionHeaderContent}>
        <Ionicons name={icon as any} size={20} color={COLORS.primary} />
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      <Ionicons
        name={expandedSections.has(section) ? 'chevron-up' : 'chevron-down'}
        size={20}
        color={COLORS.textLight}
      />
    </TouchableOpacity>
  );

  // Render setting item
  const renderSettingItem = (
    title: string,
    description: string,
    value: boolean,
    onToggle: (value: boolean) => void
  ) => (
    <View style={styles.settingItem}>
      <View style={styles.settingContent}>
        <Text style={styles.settingTitle}>{title}</Text>
        <Text style={styles.settingDescription}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: COLORS.lightGray, true: COLORS.primary }}
        thumbColor={value ? COLORS.white : COLORS.gray}
      />
    </View>
  );

  return (
    <View style={styles.container}>
      <Text style={styles.mainTitle}>
        {getLocalizedText('culturalSettings', 'Cultural Settings')}
      </Text>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Religious Observance Section */}
        {renderSectionHeader('religious', getLocalizedText('religiousObservance', 'Religious Observance'), 'moon')}
        {expandedSections.has('religious') && (
          <View style={styles.sectionContent}>
            {renderSettingItem(
              getLocalizedText('avoidPrayerTimes', 'Avoid Prayer Times'),
              getLocalizedText('prayerTimeDesc', 'Automatically reschedule reminders that conflict with prayer times'),
              culturalSettings.avoidPrayerTimes,
              (value) => updateCulturalSetting('avoidPrayerTimes', value)
            )}

            {culturalSettings.avoidPrayerTimes && (
              <View style={styles.sliderContainer}>
                <Text style={styles.sliderLabel}>
                  {getLocalizedText('prayerBufferMinutes', 'Prayer Time Buffer')}: {culturalSettings.prayerBufferMinutes} {getLocalizedText('minutes', 'minutes')}
                </Text>
                <Text style={styles.sliderDescription}>
                  {getLocalizedText('bufferDesc', 'Minutes before and after prayer times to avoid')}
                </Text>
                <Slider
                  style={styles.slider}
                  minimumValue={5}
                  maximumValue={30}
                  step={5}
                  value={culturalSettings.prayerBufferMinutes}
                  onValueChange={(value) => updateCulturalSetting('prayerBufferMinutes', value)}
                  minimumTrackTintColor={COLORS.primary}
                  maximumTrackTintColor={COLORS.lightGray}
                  thumbStyle={{ backgroundColor: COLORS.primary }}
                />
              </View>
            )}

            {renderSettingItem(
              getLocalizedText('ramadanAdjustments', 'Ramadan Adjustments'),
              getLocalizedText('ramadanDesc', 'Adjust schedules during Ramadan fasting'),
              culturalSettings.ramadanAdjustments,
              (value) => updateCulturalSetting('ramadanAdjustments', value)
            )}
          </View>
        )}

        {/* Sound Preferences Section */}
        {renderSectionHeader('sounds', getLocalizedText('soundPreferences', 'Sound Preferences'), 'musical-notes')}
        {expandedSections.has('sounds') && (
          <View style={styles.sectionContent}>
            {renderSettingItem(
              getLocalizedText('culturalSounds', 'Cultural Sounds'),
              getLocalizedText('culturalSoundDesc', 'Use traditional sounds for reminders'),
              culturalSettings.culturalSounds,
              (value) => updateCulturalSetting('culturalSounds', value)
            )}

            {culturalSettings.culturalSounds && (
              <View style={styles.soundSelection}>
                <Text style={styles.soundSelectionLabel}>
                  {getLocalizedText('soundSelection', 'Sound Selection')}
                </Text>
                {getCulturalSoundOptions().map((option) => (
                  <TouchableOpacity
                    key={option.value}
                    style={[
                      styles.soundOption,
                      culturalSettings.selectedCulturalSound === option.value && styles.selectedSoundOption
                    ]}
                    onPress={() => updateCulturalSetting('selectedCulturalSound', option.value)}
                  >
                    <Text style={[
                      styles.soundOptionText,
                      culturalSettings.selectedCulturalSound === option.value && styles.selectedSoundOptionText
                    ]}>
                      {option.label}
                    </Text>
                    <TouchableOpacity style={styles.previewButton}>
                      <Text style={styles.previewButtonText}>
                        {getLocalizedText('preview', 'Preview')}
                      </Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Family Settings Section */}
        {renderSectionHeader('family', getLocalizedText('familySettings', 'Family Settings'), 'people')}
        {expandedSections.has('family') && (
          <View style={styles.sectionContent}>
            {renderSettingItem(
              getLocalizedText('familyNotifications', 'Family Notifications'),
              getLocalizedText('familyNotifDesc', 'Notify family members of missed medications'),
              culturalSettings.familyNotifications,
              (value) => updateCulturalSetting('familyNotifications', value)
            )}

            {renderSettingItem(
              getLocalizedText('respectTraditionalMedicine', 'Traditional Medicine'),
              getLocalizedText('traditionalMedDesc', 'Consider traditional medicine interactions'),
              culturalSettings.respectTraditionalMedicine,
              (value) => updateCulturalSetting('respectTraditionalMedicine', value)
            )}
          </View>
        )}

        {/* Accessibility Settings Section */}
        {renderSectionHeader('accessibility', getLocalizedText('accessibilitySettings', 'Accessibility Settings'), 'accessibility')}
        {expandedSections.has('accessibility') && (
          <View style={styles.sectionContent}>
            {renderSettingItem(
              getLocalizedText('elderlyMode', 'Elderly-Friendly Mode'),
              getLocalizedText('elderlyModeDesc', 'Larger text, louder sounds, simpler interface'),
              culturalSettings.elderlyfriendlyMode,
              (value) => updateCulturalSetting('elderlyfriendlyMode', value)
            )}
          </View>
        )}

        {/* Save Button */}
        <TouchableOpacity style={styles.saveButton} onPress={saveSettings}>
          <Ionicons name="checkmark" size={20} color={COLORS.white} />
          <Text style={styles.saveButtonText}>
            {getLocalizedText('save', 'Save Settings')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  mainTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: 8,
  },
  sectionHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.text,
    marginLeft: 8,
  },
  sectionContent: {
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  settingContent: {
    flex: 1,
    marginRight: 12,
  },
  settingTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 12,
    color: COLORS.textLight,
    lineHeight: 16,
  },
  sliderContainer: {
    paddingTop: 12,
    paddingBottom: 8,
  },
  sliderLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 4,
  },
  sliderDescription: {
    fontSize: 12,
    color: COLORS.textLight,
    marginBottom: 12,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  soundSelection: {
    marginTop: 12,
  },
  soundSelectionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: COLORS.text,
    marginBottom: 8,
  },
  soundOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: 8,
  },
  selectedSoundOption: {
    borderColor: COLORS.primary,
    backgroundColor: '#F0F7FF',
  },
  soundOptionText: {
    fontSize: 14,
    color: COLORS.text,
    flex: 1,
  },
  selectedSoundOptionText: {
    color: COLORS.primary,
    fontWeight: '500',
  },
  previewButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  previewButtonText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '500',
  },
  saveButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingVertical: 14,
    borderRadius: 8,
    marginTop: 24,
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});