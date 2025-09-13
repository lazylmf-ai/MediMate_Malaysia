/**
 * Emergency Contact Management Screen
 *
 * Allows patients and family members to manage emergency contacts,
 * set up escalation preferences, and configure notification methods.
 * Provides culturally-aware interface for Malaysian families.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  SafeAreaView,
  ActivityIndicator,
  TextInput,
  Switch,
  Modal,
  RefreshControl,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Picker } from '@react-native-picker/picker';
import FamilyCoordinationService, {
  FamilyMember,
  PatientFamilyCircle
} from '@/services/family/FamilyCoordinationService';
import { COLORS, TYPOGRAPHY } from '@/constants/config';
import { useAppSelector } from '@/store/hooks';
import type { SupportedLanguage } from '@/i18n/translations';

interface EmergencyContactManagementProps {
  navigation: any;
  route: {
    params?: {
      patientId?: string;
    };
  };
}

interface ContactFormData {
  name: string;
  relationship: FamilyMember['relationship'];
  phoneNumber: string;
  email: string;
  language: SupportedLanguage;
  priority: number;
  notificationPreferences: FamilyMember['notificationPreferences'];
  culturalPreferences: FamilyMember['culturalPreferences'];
  permissions: FamilyMember['permissions'];
}

const ContactForm: React.FC<{
  visible: boolean;
  contact?: FamilyMember;
  onSave: (data: ContactFormData) => void;
  onCancel: () => void;
  language: string;
}> = ({ visible, contact, onSave, onCancel, language }) => {
  const [formData, setFormData] = useState<ContactFormData>({
    name: '',
    relationship: 'family',
    phoneNumber: '',
    email: '',
    language: 'en' as SupportedLanguage,
    priority: 5,
    notificationPreferences: {
      medicationReminders: false,
      missedDoses: true,
      emergencyAlerts: true,
      dailySummary: false,
      weeklyReports: false,
    },
    culturalPreferences: {
      respectPrayerTimes: true,
      useHonorifics: true,
      includePatientDetails: true,
      formalCommunication: true,
    },
    permissions: {
      canViewMedications: false,
      canReceiveAlerts: true,
      canMarkTaken: false,
      canUpdateSchedule: false,
      isPrimaryCaregiver: false,
    },
  });

  useEffect(() => {
    if (contact) {
      setFormData({
        name: contact.name,
        relationship: contact.relationship,
        phoneNumber: contact.phoneNumber,
        email: contact.email || '',
        language: contact.language,
        priority: contact.priority,
        notificationPreferences: contact.notificationPreferences,
        culturalPreferences: contact.culturalPreferences,
        permissions: contact.permissions,
      });
    } else {
      // Reset form for new contact
      setFormData({
        name: '',
        relationship: 'family',
        phoneNumber: '',
        email: '',
        language: 'en' as SupportedLanguage,
        priority: 5,
        notificationPreferences: {
          medicationReminders: false,
          missedDoses: true,
          emergencyAlerts: true,
          dailySummary: false,
          weeklyReports: false,
        },
        culturalPreferences: {
          respectPrayerTimes: true,
          useHonorifics: true,
          includePatientDetails: true,
          formalCommunication: true,
        },
        permissions: {
          canViewMedications: false,
          canReceiveAlerts: true,
          canMarkTaken: false,
          canUpdateSchedule: false,
          isPrimaryCaregiver: false,
        },
      });
    }
  }, [contact, visible]);

  const getLabels = () => {
    const labels = {
      en: {
        title: contact ? 'Edit Emergency Contact' : 'Add Emergency Contact',
        name: 'Name',
        relationship: 'Relationship',
        phoneNumber: 'Phone Number',
        email: 'Email (Optional)',
        language: 'Preferred Language',
        priority: 'Contact Priority',
        notificationPrefs: 'Notification Preferences',
        culturalPrefs: 'Cultural Preferences',
        permissions: 'Permissions',
        medicationReminders: 'Medication Reminders',
        missedDoses: 'Missed Doses',
        emergencyAlerts: 'Emergency Alerts',
        dailySummary: 'Daily Summary',
        weeklyReports: 'Weekly Reports',
        respectPrayerTimes: 'Respect Prayer Times',
        useHonorifics: 'Use Honorifics',
        includePatientDetails: 'Include Patient Details',
        formalCommunication: 'Formal Communication',
        canViewMedications: 'Can View Medications',
        canReceiveAlerts: 'Can Receive Alerts',
        canMarkTaken: 'Can Mark Medications Taken',
        canUpdateSchedule: 'Can Update Schedule',
        isPrimaryCaregiver: 'Primary Caregiver',
        save: 'Save',
        cancel: 'Cancel',
        spouse: 'Spouse',
        child: 'Child',
        parent: 'Parent',
        sibling: 'Sibling',
        caregiver: 'Caregiver',
        guardian: 'Guardian',
      },
      ms: {
        title: contact ? 'Edit Kenalan Kecemasan' : 'Tambah Kenalan Kecemasan',
        name: 'Nama',
        relationship: 'Hubungan',
        phoneNumber: 'Nombor Telefon',
        email: 'Emel (Pilihan)',
        language: 'Bahasa Pilihan',
        priority: 'Keutamaan Kenalan',
        notificationPrefs: 'Keutamaan Pemberitahuan',
        culturalPrefs: 'Keutamaan Budaya',
        permissions: 'Kebenaran',
        medicationReminders: 'Peringatan Ubat',
        missedDoses: 'Dos Terlepas',
        emergencyAlerts: 'Amaran Kecemasan',
        dailySummary: 'Ringkasan Harian',
        weeklyReports: 'Laporan Mingguan',
        respectPrayerTimes: 'Hormati Waktu Solat',
        useHonorifics: 'Gunakan Gelaran',
        includePatientDetails: 'Sertakan Butiran Pesakit',
        formalCommunication: 'Komunikasi Formal',
        canViewMedications: 'Boleh Lihat Ubat',
        canReceiveAlerts: 'Boleh Terima Amaran',
        canMarkTaken: 'Boleh Tandakan Ubat Diambil',
        canUpdateSchedule: 'Boleh Kemaskini Jadual',
        isPrimaryCaregiver: 'Penjaga Utama',
        save: 'Simpan',
        cancel: 'Batal',
        spouse: 'Pasangan',
        child: 'Anak',
        parent: 'Ibu Bapa',
        sibling: 'Adik Beradik',
        caregiver: 'Penjaga',
        guardian: 'Penjaga',
      },
      zh: {
        title: contact ? '编辑紧急联系人' : '添加紧急联系人',
        name: '姓名',
        relationship: '关系',
        phoneNumber: '电话号码',
        email: '电子邮件（可选）',
        language: '首选语言',
        priority: '联系优先级',
        notificationPrefs: '通知偏好',
        culturalPrefs: '文化偏好',
        permissions: '权限',
        medicationReminders: '药物提醒',
        missedDoses: '错过剂量',
        emergencyAlerts: '紧急警报',
        dailySummary: '每日摘要',
        weeklyReports: '每周报告',
        respectPrayerTimes: '尊重祷告时间',
        useHonorifics: '使用敬语',
        includePatientDetails: '包含患者详情',
        formalCommunication: '正式沟通',
        canViewMedications: '可查看药物',
        canReceiveAlerts: '可接收警报',
        canMarkTaken: '可标记药物已服用',
        canUpdateSchedule: '可更新时间表',
        isPrimaryCaregiver: '主要护理人员',
        save: '保存',
        cancel: '取消',
        spouse: '配偶',
        child: '子女',
        parent: '父母',
        sibling: '兄弟姐妹',
        caregiver: '护理人员',
        guardian: '监护人',
      },
      ta: {
        title: contact ? 'அவசர தொடர்பைத் திருத்தவும்' : 'அவசர தொடர்பைச் சேர்க்கவும்',
        name: 'பெயர்',
        relationship: 'உறவு',
        phoneNumber: 'தொலைபேசி எண்',
        email: 'மின்னஞ்சல் (விருப்பமானது)',
        language: 'விருப்பமான மொழி',
        priority: 'தொடர்பு முன்னுரிமை',
        notificationPrefs: 'அறிவிப்பு விருப்பங்கள்',
        culturalPrefs: 'கலாச்சார விருப்பங்கள்',
        permissions: 'அனுமதிகள்',
        medicationReminders: 'மருந்து நினைவூட்டல்கள்',
        missedDoses: 'தவறவிட்ட அளவுகள்',
        emergencyAlerts: 'அவசர எச்சரிக்கைகள்',
        dailySummary: 'தினசரி சுருக்கம்',
        weeklyReports: 'வாராந்திர அறிக்கைகள்',
        respectPrayerTimes: 'பிரார்த்தனை நேரங்களை மதிக்கவும்',
        useHonorifics: 'மரியாதைக்குரிய வார்த்தைகளைப் பயன்படுத்தவும்',
        includePatientDetails: 'நோயாளி விவரங்களைச் சேர்க்கவும்',
        formalCommunication: 'முறையான தகவல்தொடர்பு',
        canViewMedications: 'மருந்துகளைப் பார்க்க முடியும்',
        canReceiveAlerts: 'எச்சரிக்கைகளைப் பெற முடியும்',
        canMarkTaken: 'மருந்துகள் எடுத்துக்கொள்ளப்பட்டதாகக் குறிக்க முடியும்',
        canUpdateSchedule: 'அட்டவணையைப் புதுப்பிக்க முடியும்',
        isPrimaryCaregiver: 'முதன்மை பராமரிப்பாளர்',
        save: 'சேமிக்கவும்',
        cancel: 'ரத்துசெய்யவும்',
        spouse: 'மனைவி/கணவர்',
        child: 'குழந்தை',
        parent: 'பெற்றோர்',
        sibling: 'உடன்பிறந்தவர்',
        caregiver: 'பராமரிப்பாளர்',
        guardian: 'பாதுகாவலர்',
      }
    };
    return labels[language as keyof typeof labels] || labels.en;
  };

  const labels = getLabels();

  const handleSave = () => {
    if (!formData.name.trim() || !formData.phoneNumber.trim()) {
      Alert.alert('Error', 'Name and phone number are required');
      return;
    }

    onSave(formData);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <SafeAreaView style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onCancel}>
            <Text style={styles.modalCancelButton}>{labels.cancel}</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>{labels.title}</Text>
          <TouchableOpacity onPress={handleSave}>
            <Text style={styles.modalSaveButton}>{labels.save}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          {/* Basic Information */}
          <View style={styles.formSection}>
            <Text style={styles.formSectionTitle}>Basic Information</Text>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>{labels.name}</Text>
              <TextInput
                style={styles.formInput}
                value={formData.name}
                onChangeText={(text) => setFormData(prev => ({ ...prev, name: text }))}
                placeholder="Enter full name"
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>{labels.relationship}</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.relationship}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, relationship: value }))}
                  style={styles.picker}
                >
                  <Picker.Item label={labels.spouse} value="spouse" />
                  <Picker.Item label={labels.child} value="child" />
                  <Picker.Item label={labels.parent} value="parent" />
                  <Picker.Item label={labels.sibling} value="sibling" />
                  <Picker.Item label={labels.caregiver} value="caregiver" />
                  <Picker.Item label={labels.guardian} value="guardian" />
                </Picker>
              </View>
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>{labels.phoneNumber}</Text>
              <TextInput
                style={styles.formInput}
                value={formData.phoneNumber}
                onChangeText={(text) => setFormData(prev => ({ ...prev, phoneNumber: text }))}
                placeholder="+60123456789"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>{labels.email}</Text>
              <TextInput
                style={styles.formInput}
                value={formData.email}
                onChangeText={(text) => setFormData(prev => ({ ...prev, email: text }))}
                placeholder="email@example.com"
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>{labels.language}</Text>
              <View style={styles.pickerContainer}>
                <Picker
                  selectedValue={formData.language}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, language: value }))}
                  style={styles.picker}
                >
                  <Picker.Item label="English" value="en" />
                  <Picker.Item label="Bahasa Malaysia" value="ms" />
                  <Picker.Item label="中文" value="zh" />
                  <Picker.Item label="தமிழ்" value="ta" />
                </Picker>
              </View>
            </View>

            <View style={styles.formField}>
              <Text style={styles.formLabel}>{labels.priority} (1-10)</Text>
              <TextInput
                style={styles.formInput}
                value={formData.priority.toString()}
                onChangeText={(text) => {
                  const priority = parseInt(text) || 1;
                  setFormData(prev => ({ ...prev, priority: Math.min(10, Math.max(1, priority)) }));
                }}
                keyboardType="numeric"
                maxLength={2}
              />
            </View>
          </View>

          {/* Notification Preferences */}
          <View style={styles.formSection}>
            <Text style={styles.formSectionTitle}>{labels.notificationPrefs}</Text>

            <View style={styles.switchField}>
              <Text style={styles.switchLabel}>{labels.emergencyAlerts}</Text>
              <Switch
                value={formData.notificationPreferences.emergencyAlerts}
                onValueChange={(value) => setFormData(prev => ({
                  ...prev,
                  notificationPreferences: { ...prev.notificationPreferences, emergencyAlerts: value }
                }))}
                trackColor={{ false: COLORS.gray[300], true: COLORS.primary }}
              />
            </View>

            <View style={styles.switchField}>
              <Text style={styles.switchLabel}>{labels.missedDoses}</Text>
              <Switch
                value={formData.notificationPreferences.missedDoses}
                onValueChange={(value) => setFormData(prev => ({
                  ...prev,
                  notificationPreferences: { ...prev.notificationPreferences, missedDoses: value }
                }))}
                trackColor={{ false: COLORS.gray[300], true: COLORS.primary }}
              />
            </View>

            <View style={styles.switchField}>
              <Text style={styles.switchLabel}>{labels.medicationReminders}</Text>
              <Switch
                value={formData.notificationPreferences.medicationReminders}
                onValueChange={(value) => setFormData(prev => ({
                  ...prev,
                  notificationPreferences: { ...prev.notificationPreferences, medicationReminders: value }
                }))}
                trackColor={{ false: COLORS.gray[300], true: COLORS.primary }}
              />
            </View>

            <View style={styles.switchField}>
              <Text style={styles.switchLabel}>{labels.dailySummary}</Text>
              <Switch
                value={formData.notificationPreferences.dailySummary}
                onValueChange={(value) => setFormData(prev => ({
                  ...prev,
                  notificationPreferences: { ...prev.notificationPreferences, dailySummary: value }
                }))}
                trackColor={{ false: COLORS.gray[300], true: COLORS.primary }}
              />
            </View>

            <View style={styles.switchField}>
              <Text style={styles.switchLabel}>{labels.weeklyReports}</Text>
              <Switch
                value={formData.notificationPreferences.weeklyReports}
                onValueChange={(value) => setFormData(prev => ({
                  ...prev,
                  notificationPreferences: { ...prev.notificationPreferences, weeklyReports: value }
                }))}
                trackColor={{ false: COLORS.gray[300], true: COLORS.primary }}
              />
            </View>
          </View>

          {/* Cultural Preferences */}
          <View style={styles.formSection}>
            <Text style={styles.formSectionTitle}>{labels.culturalPrefs}</Text>

            <View style={styles.switchField}>
              <Text style={styles.switchLabel}>{labels.respectPrayerTimes}</Text>
              <Switch
                value={formData.culturalPreferences.respectPrayerTimes}
                onValueChange={(value) => setFormData(prev => ({
                  ...prev,
                  culturalPreferences: { ...prev.culturalPreferences, respectPrayerTimes: value }
                }))}
                trackColor={{ false: COLORS.gray[300], true: COLORS.islamic }}
              />
            </View>

            <View style={styles.switchField}>
              <Text style={styles.switchLabel}>{labels.useHonorifics}</Text>
              <Switch
                value={formData.culturalPreferences.useHonorifics}
                onValueChange={(value) => setFormData(prev => ({
                  ...prev,
                  culturalPreferences: { ...prev.culturalPreferences, useHonorifics: value }
                }))}
                trackColor={{ false: COLORS.gray[300], true: COLORS.primary }}
              />
            </View>

            <View style={styles.switchField}>
              <Text style={styles.switchLabel}>{labels.includePatientDetails}</Text>
              <Switch
                value={formData.culturalPreferences.includePatientDetails}
                onValueChange={(value) => setFormData(prev => ({
                  ...prev,
                  culturalPreferences: { ...prev.culturalPreferences, includePatientDetails: value }
                }))}
                trackColor={{ false: COLORS.gray[300], true: COLORS.primary }}
              />
            </View>

            <View style={styles.switchField}>
              <Text style={styles.switchLabel}>{labels.formalCommunication}</Text>
              <Switch
                value={formData.culturalPreferences.formalCommunication}
                onValueChange={(value) => setFormData(prev => ({
                  ...prev,
                  culturalPreferences: { ...prev.culturalPreferences, formalCommunication: value }
                }))}
                trackColor={{ false: COLORS.gray[300], true: COLORS.primary }}
              />
            </View>
          </View>

          {/* Permissions */}
          <View style={styles.formSection}>
            <Text style={styles.formSectionTitle}>{labels.permissions}</Text>

            <View style={styles.switchField}>
              <Text style={styles.switchLabel}>{labels.canReceiveAlerts}</Text>
              <Switch
                value={formData.permissions.canReceiveAlerts}
                onValueChange={(value) => setFormData(prev => ({
                  ...prev,
                  permissions: { ...prev.permissions, canReceiveAlerts: value }
                }))}
                trackColor={{ false: COLORS.gray[300], true: COLORS.primary }}
              />
            </View>

            <View style={styles.switchField}>
              <Text style={styles.switchLabel}>{labels.isPrimaryCaregiver}</Text>
              <Switch
                value={formData.permissions.isPrimaryCaregiver}
                onValueChange={(value) => setFormData(prev => ({
                  ...prev,
                  permissions: { ...prev.permissions, isPrimaryCaregiver: value }
                }))}
                trackColor={{ false: COLORS.gray[300], true: COLORS.primary }}
              />
            </View>

            <View style={styles.switchField}>
              <Text style={styles.switchLabel}>{labels.canViewMedications}</Text>
              <Switch
                value={formData.permissions.canViewMedications}
                onValueChange={(value) => setFormData(prev => ({
                  ...prev,
                  permissions: { ...prev.permissions, canViewMedications: value }
                }))}
                trackColor={{ false: COLORS.gray[300], true: COLORS.primary }}
              />
            </View>

            <View style={styles.switchField}>
              <Text style={styles.switchLabel}>{labels.canMarkTaken}</Text>
              <Switch
                value={formData.permissions.canMarkTaken}
                onValueChange={(value) => setFormData(prev => ({
                  ...prev,
                  permissions: { ...prev.permissions, canMarkTaken: value }
                }))}
                trackColor={{ false: COLORS.gray[300], true: COLORS.primary }}
              />
            </View>

            <View style={styles.switchField}>
              <Text style={styles.switchLabel}>{labels.canUpdateSchedule}</Text>
              <Switch
                value={formData.permissions.canUpdateSchedule}
                onValueChange={(value) => setFormData(prev => ({
                  ...prev,
                  permissions: { ...prev.permissions, canUpdateSchedule: value }
                }))}
                trackColor={{ false: COLORS.gray[300], true: COLORS.primary }}
              />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
};

const ContactCard: React.FC<{
  contact: FamilyMember;
  language: string;
  isEmergencyContact: boolean;
  isPrimary: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onToggleEmergency: () => void;
  onSetPrimary: () => void;
}> = ({ contact, language, isEmergencyContact, isPrimary, onEdit, onDelete, onToggleEmergency, onSetPrimary }) => {
  const getRelationshipText = (relationship: FamilyMember['relationship']) => {
    const relationships = {
      en: {
        spouse: 'Spouse',
        child: 'Child',
        parent: 'Parent',
        sibling: 'Sibling',
        caregiver: 'Caregiver',
        guardian: 'Guardian'
      },
      ms: {
        spouse: 'Pasangan',
        child: 'Anak',
        parent: 'Ibu Bapa',
        sibling: 'Adik Beradik',
        caregiver: 'Penjaga',
        guardian: 'Penjaga'
      },
      zh: {
        spouse: '配偶',
        child: '子女',
        parent: '父母',
        sibling: '兄弟姐妹',
        caregiver: '护理人员',
        guardian: '监护人'
      },
      ta: {
        spouse: 'மனைவி/கணவர்',
        child: 'குழந்தை',
        parent: 'பெற்றோர்',
        sibling: 'உடன்பிறந்தவர்',
        caregiver: 'பராமரிப்பாளர்',
        guardian: 'பாதுகாவலர்'
      }
    };

    return relationships[language as keyof typeof relationships]?.[relationship] || relationship;
  };

  const getLabels = () => {
    const labels = {
      en: {
        priority: 'Priority',
        emergencyContact: 'Emergency Contact',
        primaryCaregiver: 'Primary Caregiver',
        edit: 'Edit',
        delete: 'Delete',
        setPrimary: 'Set as Primary',
        removePrimary: 'Remove Primary',
        addToEmergency: 'Add to Emergency',
        removeFromEmergency: 'Remove from Emergency'
      },
      ms: {
        priority: 'Keutamaan',
        emergencyContact: 'Kenalan Kecemasan',
        primaryCaregiver: 'Penjaga Utama',
        edit: 'Edit',
        delete: 'Padam',
        setPrimary: 'Tetapkan Sebagai Utama',
        removePrimary: 'Buang Utama',
        addToEmergency: 'Tambah ke Kecemasan',
        removeFromEmergency: 'Buang dari Kecemasan'
      },
      zh: {
        priority: '优先级',
        emergencyContact: '紧急联系人',
        primaryCaregiver: '主要护理人员',
        edit: '编辑',
        delete: '删除',
        setPrimary: '设为主要',
        removePrimary: '移除主要',
        addToEmergency: '添加到紧急',
        removeFromEmergency: '从紧急中移除'
      },
      ta: {
        priority: 'முன்னுரிமை',
        emergencyContact: 'அவசர தொடர்பு',
        primaryCaregiver: 'முதன்மை பராமரிப்பாளர்',
        edit: 'திருத்தவும்',
        delete: 'நீக்கவும்',
        setPrimary: 'முதன்மையாக அமைக்கவும்',
        removePrimary: 'முதன்மையை நீக்கவும்',
        addToEmergency: 'அவசரத்தில் சேர்க்கவும்',
        removeFromEmergency: 'அவசரத்திலிருந்து நீக்கவும்'
      }
    };
    return labels[language as keyof typeof labels] || labels.en;
  };

  const labels = getLabels();

  return (
    <View style={[styles.contactCard, isPrimary && styles.primaryContactCard]}>
      <View style={styles.contactHeader}>
        <View style={styles.contactInfo}>
          <Text style={styles.contactName}>{contact.name}</Text>
          <Text style={styles.contactRelationship}>{getRelationshipText(contact.relationship)}</Text>
          <Text style={styles.contactPhone}>{contact.phoneNumber}</Text>
        </View>

        <View style={styles.contactBadges}>
          {isPrimary && (
            <View style={styles.primaryBadge}>
              <Text style={styles.primaryBadgeText}>{labels.primaryCaregiver}</Text>
            </View>
          )}
          {isEmergencyContact && (
            <View style={styles.emergencyBadge}>
              <Text style={styles.emergencyBadgeText}>{labels.emergencyContact}</Text>
            </View>
          )}
          <View style={styles.priorityBadge}>
            <Text style={styles.priorityBadgeText}>{labels.priority}: {contact.priority}</Text>
          </View>
        </View>
      </View>

      <View style={styles.contactActions}>
        <TouchableOpacity style={styles.actionButton} onPress={onEdit}>
          <Text style={styles.actionButtonText}>{labels.edit}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, isPrimary ? styles.removePrimaryButton : styles.setPrimaryButton]}
          onPress={onSetPrimary}
        >
          <Text style={[styles.actionButtonText, isPrimary ? styles.removePrimaryText : styles.setPrimaryText]}>
            {isPrimary ? labels.removePrimary : labels.setPrimary}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, isEmergencyContact ? styles.removeEmergencyButton : styles.addEmergencyButton]}
          onPress={onToggleEmergency}
        >
          <Text style={[styles.actionButtonText, isEmergencyContact ? styles.removeEmergencyText : styles.addEmergencyText]}>
            {isEmergencyContact ? labels.removeFromEmergency : labels.addToEmergency}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.actionButton, styles.deleteButton]} onPress={onDelete}>
          <Text style={[styles.actionButtonText, styles.deleteButtonText]}>{labels.delete}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export const EmergencyContactManagement: React.FC<EmergencyContactManagementProps> = ({ navigation, route }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [familyCircle, setFamilyCircle] = useState<PatientFamilyCircle | null>(null);
  const [showContactForm, setShowContactForm] = useState(false);
  const [editingContact, setEditingContact] = useState<FamilyMember | undefined>();

  const { profile } = useAppSelector((state) => state.cultural);
  const language = profile?.language || 'en';
  const patientId = route.params?.patientId || 'default_patient';

  const familyService = FamilyCoordinationService.getInstance();

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);

      if (!familyService.isServiceInitialized()) {
        await familyService.initialize();
      }

      const circle = familyService.getFamilyCircle(patientId);
      setFamilyCircle(circle);

    } catch (error) {
      console.error('Failed to load emergency contacts:', error);
      Alert.alert('Error', 'Failed to load emergency contacts. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [patientId, familyService]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleSaveContact = useCallback(async (contactData: ContactFormData) => {
    try {
      if (editingContact) {
        // Update existing contact
        await familyService.updateFamilyMemberPreferences(
          patientId,
          editingContact.id,
          {
            notificationPreferences: contactData.notificationPreferences,
            culturalPreferences: contactData.culturalPreferences,
            permissions: contactData.permissions,
          }
        );
      } else {
        // Add new contact
        const result = await familyService.registerFamilyMember(patientId, {
          name: contactData.name,
          relationship: contactData.relationship,
          phoneNumber: contactData.phoneNumber,
          email: contactData.email,
          language: contactData.language,
          notificationPreferences: contactData.notificationPreferences,
          culturalPreferences: contactData.culturalPreferences,
          permissions: contactData.permissions,
          priority: contactData.priority,
          timeZone: 'Asia/Kuala_Lumpur',
          isEnabled: true,
        });

        if (!result.success) {
          throw new Error(result.error);
        }
      }

      setShowContactForm(false);
      setEditingContact(undefined);
      await loadData();

      Alert.alert('Success', editingContact ? 'Contact updated successfully' : 'Contact added successfully');

    } catch (error) {
      console.error('Failed to save contact:', error);
      Alert.alert('Error', 'Failed to save contact. Please try again.');
    }
  }, [editingContact, familyService, patientId, loadData]);

  const handleEditContact = useCallback((contact: FamilyMember) => {
    setEditingContact(contact);
    setShowContactForm(true);
  }, []);

  const handleDeleteContact = useCallback(async (contact: FamilyMember) => {
    Alert.alert(
      'Delete Contact',
      `Are you sure you want to delete ${contact.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            // In real app, this would call a delete API
            console.log(`Deleting contact: ${contact.id}`);
            Alert.alert('Info', 'Delete functionality would be implemented here');
          }
        }
      ]
    );
  }, []);

  const handleToggleEmergencyContact = useCallback(async (contact: FamilyMember) => {
    // In real app, this would update the emergency contact list
    console.log(`Toggling emergency status for: ${contact.id}`);
    Alert.alert('Info', 'Emergency contact toggle functionality would be implemented here');
  }, []);

  const handleSetPrimary = useCallback(async (contact: FamilyMember) => {
    // In real app, this would update the primary caregiver
    console.log(`Setting primary caregiver: ${contact.id}`);
    Alert.alert('Info', 'Primary caregiver setting functionality would be implemented here');
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const getScreenTitle = () => {
    const titles = {
      en: 'Emergency Contacts',
      ms: 'Kenalan Kecemasan',
      zh: '紧急联系人',
      ta: 'அவசர தொடர்புகள்'
    };
    return titles[language as keyof typeof titles] || titles.en;
  };

  const getAddButtonText = () => {
    const texts = {
      en: 'Add Emergency Contact',
      ms: 'Tambah Kenalan Kecemasan',
      zh: '添加紧急联系人',
      ta: 'அவசர தொடர்பைச் சேர்க்கவும்'
    };
    return texts[language as keyof typeof texts] || texts.en;
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="dark" />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingText}>
            {language === 'ms' ? 'Memuatkan...' :
             language === 'zh' ? '加载中...' :
             language === 'ta' ? 'ஏற்றுகிறது...' :
             'Loading...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.screenTitle}>{getScreenTitle()}</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            setEditingContact(undefined);
            setShowContactForm(true);
          }}
        >
          <Text style={styles.addButtonText}>+</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[COLORS.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {familyCircle?.familyMembers.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateTitle}>No Emergency Contacts</Text>
            <Text style={styles.emptyStateSubtitle}>
              Add family members to receive emergency notifications
            </Text>
            <TouchableOpacity
              style={styles.emptyStateButton}
              onPress={() => {
                setEditingContact(undefined);
                setShowContactForm(true);
              }}
            >
              <Text style={styles.emptyStateButtonText}>{getAddButtonText()}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          familyCircle?.familyMembers.map((contact) => (
            <ContactCard
              key={contact.id}
              contact={contact}
              language={language}
              isEmergencyContact={familyCircle.emergencyContacts.includes(contact.id)}
              isPrimary={familyCircle.primaryCaregiver === contact.id}
              onEdit={() => handleEditContact(contact)}
              onDelete={() => handleDeleteContact(contact)}
              onToggleEmergency={() => handleToggleEmergencyContact(contact)}
              onSetPrimary={() => handleSetPrimary(contact)}
            />
          ))
        )}
      </ScrollView>

      <ContactForm
        visible={showContactForm}
        contact={editingContact}
        onSave={handleSaveContact}
        onCancel={() => {
          setShowContactForm(false);
          setEditingContact(undefined);
        }}
        language={language}
      />
    </SafeAreaView>
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
  loadingText: {
    marginTop: 12,
    fontSize: TYPOGRAPHY.fontSizes.base,
    color: COLORS.gray[600],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontSize: TYPOGRAPHY.fontSizes['2xl'],
    color: COLORS.primary,
  },
  screenTitle: {
    fontSize: TYPOGRAPHY.fontSizes.xl,
    fontWeight: TYPOGRAPHY.fontWeights.semibold,
    color: COLORS.secondary,
  },
  addButton: {
    backgroundColor: COLORS.primary,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: TYPOGRAPHY.fontSizes.xl,
    color: COLORS.white,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    marginTop: 100,
  },
  emptyStateTitle: {
    fontSize: TYPOGRAPHY.fontSizes.lg,
    fontWeight: TYPOGRAPHY.fontWeights.semibold,
    color: COLORS.secondary,
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: TYPOGRAPHY.fontSizes.base,
    color: COLORS.gray[600],
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyStateButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    fontSize: TYPOGRAPHY.fontSizes.base,
    fontWeight: TYPOGRAPHY.fontWeights.medium,
    color: COLORS.white,
  },
  contactCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryContactCard: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  contactHeader: {
    marginBottom: 12,
  },
  contactInfo: {
    marginBottom: 8,
  },
  contactName: {
    fontSize: TYPOGRAPHY.fontSizes.lg,
    fontWeight: TYPOGRAPHY.fontWeights.semibold,
    color: COLORS.secondary,
    marginBottom: 2,
  },
  contactRelationship: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    color: COLORS.gray[600],
    marginBottom: 2,
  },
  contactPhone: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    color: COLORS.gray[700],
  },
  contactBadges: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  primaryBadge: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  primaryBadgeText: {
    fontSize: TYPOGRAPHY.fontSizes.xs,
    color: COLORS.white,
    fontWeight: TYPOGRAPHY.fontWeights.medium,
  },
  emergencyBadge: {
    backgroundColor: COLORS.error,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  emergencyBadgeText: {
    fontSize: TYPOGRAPHY.fontSizes.xs,
    color: COLORS.white,
    fontWeight: TYPOGRAPHY.fontWeights.medium,
  },
  priorityBadge: {
    backgroundColor: COLORS.gray[200],
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  priorityBadgeText: {
    fontSize: TYPOGRAPHY.fontSizes.xs,
    color: COLORS.gray[700],
    fontWeight: TYPOGRAPHY.fontWeights.medium,
  },
  contactActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: COLORS.gray[200],
  },
  actionButtonText: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    fontWeight: TYPOGRAPHY.fontWeights.medium,
    color: COLORS.gray[700],
  },
  setPrimaryButton: {
    backgroundColor: COLORS.primary,
  },
  setPrimaryText: {
    color: COLORS.white,
  },
  removePrimaryButton: {
    backgroundColor: COLORS.gray[400],
  },
  removePrimaryText: {
    color: COLORS.white,
  },
  addEmergencyButton: {
    backgroundColor: COLORS.error,
  },
  addEmergencyText: {
    color: COLORS.white,
  },
  removeEmergencyButton: {
    backgroundColor: COLORS.gray[400],
  },
  removeEmergencyText: {
    color: COLORS.white,
  },
  deleteButton: {
    backgroundColor: COLORS.error,
  },
  deleteButtonText: {
    color: COLORS.white,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  modalTitle: {
    fontSize: TYPOGRAPHY.fontSizes.lg,
    fontWeight: TYPOGRAPHY.fontWeights.semibold,
    color: COLORS.secondary,
  },
  modalCancelButton: {
    fontSize: TYPOGRAPHY.fontSizes.base,
    color: COLORS.gray[600],
  },
  modalSaveButton: {
    fontSize: TYPOGRAPHY.fontSizes.base,
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.fontWeights.medium,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  formSection: {
    marginBottom: 24,
  },
  formSectionTitle: {
    fontSize: TYPOGRAPHY.fontSizes.lg,
    fontWeight: TYPOGRAPHY.fontWeights.semibold,
    color: COLORS.secondary,
    marginBottom: 16,
  },
  formField: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    fontWeight: TYPOGRAPHY.fontWeights.medium,
    color: COLORS.gray[700],
    marginBottom: 6,
  },
  formInput: {
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: TYPOGRAPHY.fontSizes.base,
    backgroundColor: COLORS.white,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 8,
    backgroundColor: COLORS.white,
  },
  picker: {
    height: 50,
  },
  switchField: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  switchLabel: {
    fontSize: TYPOGRAPHY.fontSizes.base,
    color: COLORS.gray[700],
    flex: 1,
    marginRight: 16,
  },
});

export default EmergencyContactManagement;