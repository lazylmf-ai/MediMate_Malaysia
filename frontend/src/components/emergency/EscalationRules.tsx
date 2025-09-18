/**
 * Emergency Escalation Rules Component
 *
 * Advanced management of emergency escalation rules with cultural awareness:
 * - Multi-level escalation configuration
 * - Malaysian family hierarchy-aware escalation
 * - Time-based and condition-based escalation rules
 * - Cultural timing and messaging preferences
 * - Emergency contact role management
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
  Modal,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import EmergencyEngine, {
  EmergencyEscalationLevel,
  EmergencyEscalationAction,
  EmergencyStopCondition
} from '@/services/emergency/EmergencyEngine';
import CulturalEmergencyHandler, {
  MalaysianEmergencyContact,
  MalaysianFamilyStructure
} from '@/services/emergency/CulturalEmergencyHandler';
import { COLORS, TYPOGRAPHY } from '@/constants/config';
import { useAppSelector } from '@/store/hooks';
import type { SupportedLanguage } from '@/i18n/translations';

interface EscalationRulesProps {
  patientId: string;
  onRulesSaved?: (rules: EmergencyEscalationLevel[]) => void;
  onError?: (error: string) => void;
}

interface EscalationLevelForm {
  level: number;
  name: string;
  delay: number;
  actions: EmergencyEscalationAction[];
  stopConditions: EmergencyStopCondition[];
}

interface ActionForm {
  type: EmergencyEscalationAction['type'];
  deliveryMethods: ('push' | 'sms' | 'voice' | 'email')[];
  timeout: number;
  maxRetries: number;
  retryDelay: number;
}

export const EscalationRules: React.FC<EscalationRulesProps> = ({
  patientId,
  onRulesSaved,
  onError
}) => {
  const [escalationLevels, setEscalationLevels] = useState<EmergencyEscalationLevel[]>([]);
  const [familyStructure, setFamilyStructure] = useState<MalaysianFamilyStructure | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
  const [showActionModal, setShowActionModal] = useState(false);
  const [editingAction, setEditingAction] = useState<ActionForm | null>(null);

  const { profile } = useAppSelector((state) => state.cultural);
  const language = profile?.language || 'en';

  const emergencyEngine = EmergencyEngine.getInstance();
  const culturalHandler = CulturalEmergencyHandler.getInstance();

  const loadEscalationRules = useCallback(async () => {
    try {
      setIsLoading(true);

      // Load current configuration
      const config = emergencyEngine.getConfiguration();
      const triggers = config.triggers.filter(t => t.detection.enabled);

      if (triggers.length > 0) {
        setEscalationLevels(triggers[0].escalation.escalationLevels);
      }

      // Load family structure for cultural escalation
      const structure = culturalHandler.getFamilyStructure(patientId);
      setFamilyStructure(structure || null);

      console.log('Loaded escalation rules for patient:', patientId);
    } catch (error) {
      console.error('Failed to load escalation rules:', error);
      onError?.('Failed to load escalation rules');
    } finally {
      setIsLoading(false);
    }
  }, [patientId, emergencyEngine, culturalHandler, onError]);

  useEffect(() => {
    loadEscalationRules();
  }, [loadEscalationRules]);

  const handleSaveRules = async () => {
    try {
      setIsSaving(true);

      // Update configuration with new escalation levels
      const config = emergencyEngine.getConfiguration();
      const updatedTriggers = config.triggers.map(trigger => ({
        ...trigger,
        escalation: {
          ...trigger.escalation,
          escalationLevels
        }
      }));

      await emergencyEngine.updateConfiguration({
        ...config,
        triggers: updatedTriggers
      });

      onRulesSaved?.(escalationLevels);

      const successMessages = {
        en: 'Escalation rules saved successfully',
        ms: 'Peraturan peningkatan berjaya disimpan',
        zh: '升级规则已成功保存',
        ta: 'அதிகரிப்பு விதிகள் வெற்றிகரமாக சேமிக்கப்பட்டன'
      };

      Alert.alert('Success', successMessages[language as keyof typeof successMessages] || successMessages.en);
    } catch (error) {
      console.error('Failed to save escalation rules:', error);
      const errorMessages = {
        en: 'Failed to save escalation rules',
        ms: 'Gagal menyimpan peraturan peningkatan',
        zh: '无法保存升级规则',
        ta: 'அதிகரிப்பு விதிகளை சேமிக்க முடியவில்லை'
      };
      Alert.alert('Error', errorMessages[language as keyof typeof errorMessages] || errorMessages.en);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddLevel = () => {
    const newLevel: EmergencyEscalationLevel = {
      level: escalationLevels.length + 1,
      name: `Level ${escalationLevels.length + 1}`,
      delay: escalationLevels.length * 10, // 10 minutes per level
      actions: [],
      stopConditions: [
        { type: 'patient_response', description: 'Patient responds to notification', autoApply: true },
        { type: 'family_confirmation', description: 'Family confirms patient safety', autoApply: true }
      ],
      culturalOverrides: {
        ms: {
          messageStyle: 'respectful',
          additionalRecipients: []
        },
        en: {
          messageStyle: 'formal',
          additionalRecipients: []
        }
      }
    };

    setEscalationLevels([...escalationLevels, newLevel]);
  };

  const handleRemoveLevel = (levelNumber: number) => {
    const confirmMessages = {
      en: 'Are you sure you want to remove this escalation level?',
      ms: 'Adakah anda pasti mahu membuang tahap peningkatan ini?',
      zh: '您确定要删除此升级级别吗？',
      ta: 'இந்த அதிகரிப்பு நிலையை அகற்ற நீங்கள் உறுதியாக இருக்கிறீர்களா?'
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
            const updatedLevels = escalationLevels
              .filter(level => level.level !== levelNumber)
              .map((level, index) => ({
                ...level,
                level: index + 1
              }));
            setEscalationLevels(updatedLevels);
          }
        }
      ]
    );
  };

  const handleUpdateLevel = (levelNumber: number, updates: Partial<EmergencyEscalationLevel>) => {
    setEscalationLevels(prev =>
      prev.map(level =>
        level.level === levelNumber ? { ...level, ...updates } : level
      )
    );
  };

  const handleAddAction = (levelNumber: number) => {
    setSelectedLevel(levelNumber);
    setEditingAction({
      type: 'notify_family',
      deliveryMethods: ['push', 'sms'],
      timeout: 10,
      maxRetries: 3,
      retryDelay: 5
    });
    setShowActionModal(true);
  };

  const handleSaveAction = () => {
    if (!editingAction || selectedLevel === null) return;

    const newAction: EmergencyEscalationAction = {
      type: editingAction.type,
      recipients: [], // Will be populated based on family structure
      deliveryMethods: editingAction.deliveryMethods,
      message: {
        templates: {
          en: {
            title: 'Emergency Alert',
            body: 'Patient requires immediate attention',
            urgencyLevel: 'High'
          },
          ms: {
            title: 'Amaran Kecemasan',
            body: 'Pesakit memerlukan perhatian segera',
            urgencyLevel: 'Tinggi'
          },
          zh: {
            title: '紧急警报',
            body: '患者需要立即关注',
            urgencyLevel: '高'
          },
          ta: {
            title: 'அவசர எச்சரிக்கை',
            body: 'நோயாளிக்கு உடனடி கவனம் தேவை',
            urgencyLevel: 'உயர்'
          }
        },
        includePatientDetails: true,
        includeMedicationDetails: true,
        includeTimestamp: true,
        includeLocationInfo: false,
        includeEmergencyInstructions: true
      },
      timeout: editingAction.timeout,
      retryPolicy: {
        maxRetries: editingAction.maxRetries,
        retryDelay: editingAction.retryDelay,
        backoffMultiplier: 1.5
      }
    };

    handleUpdateLevel(selectedLevel, {
      actions: [
        ...escalationLevels.find(l => l.level === selectedLevel)?.actions || [],
        newAction
      ]
    });

    setShowActionModal(false);
    setEditingAction(null);
    setSelectedLevel(null);
  };

  const handleRemoveAction = (levelNumber: number, actionIndex: number) => {
    const level = escalationLevels.find(l => l.level === levelNumber);
    if (!level) return;

    const updatedActions = level.actions.filter((_, index) => index !== actionIndex);
    handleUpdateLevel(levelNumber, { actions: updatedActions });
  };

  const renderEscalationLevel = (level: EmergencyEscalationLevel) => (
    <View key={level.level} style={styles.levelContainer}>
      <View style={styles.levelHeader}>
        <Text style={styles.levelTitle}>
          {language === 'ms' ? `Tahap ${level.level}: ${level.name}` :
           language === 'zh' ? `级别 ${level.level}: ${level.name}` :
           language === 'ta' ? `நிலை ${level.level}: ${level.name}` :
           `Level ${level.level}: ${level.name}`}
        </Text>
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => handleRemoveLevel(level.level)}
        >
          <Text style={styles.removeButtonText}>×</Text>
        </TouchableOpacity>
      </View>

      {/* Level Settings */}
      <View style={styles.levelSettings}>
        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>
            {language === 'ms' ? 'Nama Tahap' :
             language === 'zh' ? '级别名称' :
             language === 'ta' ? 'நிலை பெயர்' :
             'Level Name'}
          </Text>
          <TextInput
            style={styles.textInput}
            value={level.name}
            onChangeText={(text) => handleUpdateLevel(level.level, { name: text })}
            placeholder="Enter level name"
          />
        </View>

        <View style={styles.settingRow}>
          <Text style={styles.settingLabel}>
            {language === 'ms' ? 'Kelewatan (minit)' :
             language === 'zh' ? '延迟（分钟）' :
             language === 'ta' ? 'தாமதம் (நிமிடங்கள்)' :
             'Delay (minutes)'}
          </Text>
          <TextInput
            style={styles.numberInput}
            value={level.delay.toString()}
            onChangeText={(text) => {
              const delay = parseInt(text) || 0;
              handleUpdateLevel(level.level, { delay });
            }}
            keyboardType="numeric"
            placeholder="0"
          />
        </View>
      </View>

      {/* Actions */}
      <View style={styles.actionsSection}>
        <View style={styles.actionHeader}>
          <Text style={styles.sectionTitle}>
            {language === 'ms' ? 'Tindakan' :
             language === 'zh' ? '操作' :
             language === 'ta' ? 'நடவடிக்கைகள்' :
             'Actions'}
          </Text>
          <TouchableOpacity
            style={styles.addActionButton}
            onPress={() => handleAddAction(level.level)}
          >
            <Text style={styles.addActionButtonText}>
              {language === 'ms' ? 'Tambah' :
               language === 'zh' ? '添加' :
               language === 'ta' ? 'சேர்க்கவும்' :
               'Add'}
            </Text>
          </TouchableOpacity>
        </View>

        {level.actions.map((action, actionIndex) => (
          <View key={actionIndex} style={styles.actionItem}>
            <View style={styles.actionContent}>
              <Text style={styles.actionType}>
                {action.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </Text>
              <Text style={styles.actionDetails}>
                {action.deliveryMethods.join(', ')} • {action.timeout}min timeout
              </Text>
            </View>
            <TouchableOpacity
              style={styles.removeActionButton}
              onPress={() => handleRemoveAction(level.level, actionIndex)}
            >
              <Text style={styles.removeActionButtonText}>×</Text>
            </TouchableOpacity>
          </View>
        ))}

        {level.actions.length === 0 && (
          <Text style={styles.noActionsText}>
            {language === 'ms' ? 'Tiada tindakan ditambah' :
             language === 'zh' ? '未添加操作' :
             language === 'ta' ? 'எந்த நடவடிக்கையும் சேர்க்கப்படவில்லை' :
             'No actions added'}
          </Text>
        )}
      </View>

      {/* Stop Conditions */}
      <View style={styles.stopConditionsSection}>
        <Text style={styles.sectionTitle}>
          {language === 'ms' ? 'Syarat Pemberhentian' :
           language === 'zh' ? '停止条件' :
           language === 'ta' ? 'நிறுத்த நிபந்தனைகள்' :
           'Stop Conditions'}
        </Text>

        {level.stopConditions.map((condition, conditionIndex) => (
          <View key={conditionIndex} style={styles.conditionItem}>
            <Text style={styles.conditionType}>
              {condition.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
            </Text>
            <Text style={styles.conditionDescription}>{condition.description}</Text>
          </View>
        ))}
      </View>
    </View>
  );

  const renderActionModal = () => (
    <Modal
      visible={showActionModal}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={() => setShowActionModal(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>
            {language === 'ms' ? 'Tambah Tindakan' :
             language === 'zh' ? '添加操作' :
             language === 'ta' ? 'நடவடிக்கை சேர்க்கவும்' :
             'Add Action'}
          </Text>
          <TouchableOpacity
            style={styles.modalCloseButton}
            onPress={() => setShowActionModal(false)}
          >
            <Text style={styles.modalCloseButtonText}>×</Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.modalContent}>
          {editingAction && (
            <>
              <View style={styles.modalField}>
                <Text style={styles.modalFieldLabel}>
                  {language === 'ms' ? 'Jenis Tindakan' :
                   language === 'zh' ? '操作类型' :
                   language === 'ta' ? 'நடவடிக்கை வகை' :
                   'Action Type'}
                </Text>
                <Picker
                  selectedValue={editingAction.type}
                  style={styles.picker}
                  onValueChange={(value) =>
                    setEditingAction({ ...editingAction, type: value })
                  }
                >
                  <Picker.Item
                    label={language === 'ms' ? 'Maklumkan Keluarga' :
                           language === 'zh' ? '通知家人' :
                           language === 'ta' ? 'குடும்பத்திற்கு தெரிவிக்கவும்' :
                           'Notify Family'}
                    value="notify_family"
                  />
                  <Picker.Item
                    label={language === 'ms' ? 'Panggil Kontak Kecemasan' :
                           language === 'zh' ? '呼叫紧急联系人' :
                           language === 'ta' ? 'அவசர தொடர்பை அழைக்கவும்' :
                           'Call Emergency Contact'}
                    value="call_emergency_contact"
                  />
                  <Picker.Item
                    label={language === 'ms' ? 'Hantar SMS Beramai-ramai' :
                           language === 'zh' ? '群发短信' :
                           language === 'ta' ? 'குழு எஸ்எம்எஸ் அனுப்பவும்' :
                           'SMS Blast'}
                    value="sms_blast"
                  />
                  <Picker.Item
                    label={language === 'ms' ? 'Panggilan Suara' :
                           language === 'zh' ? '语音通话' :
                           language === 'ta' ? 'குரல் அழைப்பு' :
                           'Voice Call'}
                    value="voice_call"
                  />
                </Picker>
              </View>

              <View style={styles.modalField}>
                <Text style={styles.modalFieldLabel}>
                  {language === 'ms' ? 'Kaedah Penghantaran' :
                   language === 'zh' ? '投递方式' :
                   language === 'ta' ? 'விநியோக முறைகள்' :
                   'Delivery Methods'}
                </Text>
                <View style={styles.checkboxGroup}>
                  {['push', 'sms', 'voice', 'email'].map((method) => (
                    <TouchableOpacity
                      key={method}
                      style={styles.checkboxItem}
                      onPress={() => {
                        const methods = editingAction.deliveryMethods.includes(method as any)
                          ? editingAction.deliveryMethods.filter(m => m !== method)
                          : [...editingAction.deliveryMethods, method as any];
                        setEditingAction({ ...editingAction, deliveryMethods: methods });
                      }}
                    >
                      <View style={[
                        styles.checkbox,
                        editingAction.deliveryMethods.includes(method as any) && styles.checkedCheckbox
                      ]}>
                        {editingAction.deliveryMethods.includes(method as any) && (
                          <Text style={styles.checkboxCheck}>✓</Text>
                        )}
                      </View>
                      <Text style={styles.checkboxLabel}>
                        {method.charAt(0).toUpperCase() + method.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.modalField}>
                <Text style={styles.modalFieldLabel}>
                  {language === 'ms' ? 'Masa Tamat (minit)' :
                   language === 'zh' ? '超时时间（分钟）' :
                   language === 'ta' ? 'காலாவதி நேரம் (நிமிடங்கள்)' :
                   'Timeout (minutes)'}
                </Text>
                <TextInput
                  style={styles.numberInput}
                  value={editingAction.timeout.toString()}
                  onChangeText={(text) =>
                    setEditingAction({ ...editingAction, timeout: parseInt(text) || 10 })
                  }
                  keyboardType="numeric"
                  placeholder="10"
                />
              </View>

              <View style={styles.modalField}>
                <Text style={styles.modalFieldLabel}>
                  {language === 'ms' ? 'Percubaan Maksimum' :
                   language === 'zh' ? '最大重试次数' :
                   language === 'ta' ? 'அதிகபட்ச மறு முயற்சிகள்' :
                   'Maximum Retries'}
                </Text>
                <TextInput
                  style={styles.numberInput}
                  value={editingAction.maxRetries.toString()}
                  onChangeText={(text) =>
                    setEditingAction({ ...editingAction, maxRetries: parseInt(text) || 3 })
                  }
                  keyboardType="numeric"
                  placeholder="3"
                />
              </View>
            </>
          )}
        </ScrollView>

        <View style={styles.modalActions}>
          <TouchableOpacity
            style={styles.modalCancelButton}
            onPress={() => setShowActionModal(false)}
          >
            <Text style={styles.modalCancelButtonText}>
              {language === 'ms' ? 'Batal' :
               language === 'zh' ? '取消' :
               language === 'ta' ? 'ரத்துசெய்யவும்' :
               'Cancel'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.modalSaveButton}
            onPress={handleSaveAction}
          >
            <Text style={styles.modalSaveButtonText}>
              {language === 'ms' ? 'Simpan' :
               language === 'zh' ? '保存' :
               language === 'ta' ? 'சேமிக்கவும்' :
               'Save'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>
          {language === 'ms' ? 'Memuatkan peraturan peningkatan...' :
           language === 'zh' ? '加载升级规则中...' :
           language === 'ta' ? 'அதிகரிப்பு விதிகளை ஏற்றுகிறது...' :
           'Loading escalation rules...'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>
            {language === 'ms' ? 'Peraturan Peningkatan Kecemasan' :
             language === 'zh' ? '紧急升级规则' :
             language === 'ta' ? 'அவசர அதிகரிப்பு விதிகள்' :
             'Emergency Escalation Rules'}
          </Text>
          <Text style={styles.subtitle}>
            {language === 'ms' ? 'Konfigurasi cara sistem mengendalikan situasi kecemasan' :
             language === 'zh' ? '配置系统如何处理紧急情况' :
             language === 'ta' ? 'அவசர சூழ்நிலைகளை கணினி எவ்வாறு கையாளுகிறது என்பதை கட்டமைக்கவும்' :
             'Configure how the system handles emergency situations'}
          </Text>
        </View>

        {escalationLevels.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              {language === 'ms' ? 'Tiada tahap peningkatan dikonfigurasi' :
               language === 'zh' ? '未配置升级级别' :
               language === 'ta' ? 'அதிகரிப்பு நிலைகள் கட்டமைக்கப்படவில்லை' :
               'No escalation levels configured'}
            </Text>
          </View>
        ) : (
          escalationLevels.map(renderEscalationLevel)
        )}

        <TouchableOpacity style={styles.addLevelButton} onPress={handleAddLevel}>
          <Text style={styles.addLevelButtonText}>
            {language === 'ms' ? 'Tambah Tahap Peningkatan' :
             language === 'zh' ? '添加升级级别' :
             language === 'ta' ? 'அதிகரிப்பு நிலை சேர்க்கவும்' :
             'Add Escalation Level'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <TouchableOpacity
        style={[styles.saveButton, isSaving && styles.disabledSaveButton]}
        onPress={handleSaveRules}
        disabled={isSaving}
      >
        {isSaving ? (
          <ActivityIndicator size="small" color={COLORS.white} />
        ) : (
          <Text style={styles.saveButtonText}>
            {language === 'ms' ? 'Simpan Peraturan' :
             language === 'zh' ? '保存规则' :
             language === 'ta' ? 'விதிகளைச் சேமிக்கவும்' :
             'Save Rules'}
          </Text>
        )}
      </TouchableOpacity>

      {renderActionModal()}
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
  content: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSizes.xl,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: COLORS.secondary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.fontSizes.base,
    color: COLORS.gray[600],
    lineHeight: 22,
  },
  emptyState: {
    padding: 32,
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: TYPOGRAPHY.fontSizes.base,
    color: COLORS.gray[500],
    textAlign: 'center',
  },
  levelContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  levelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  levelTitle: {
    fontSize: TYPOGRAPHY.fontSizes.lg,
    fontWeight: TYPOGRAPHY.fontWeights.semibold,
    color: COLORS.secondary,
    flex: 1,
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
  levelSettings: {
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  settingLabel: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSizes.base,
    color: COLORS.secondary,
    marginRight: 12,
  },
  textInput: {
    flex: 2,
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: TYPOGRAPHY.fontSizes.base,
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
  actionsSection: {
    marginBottom: 16,
  },
  actionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.fontSizes.base,
    fontWeight: TYPOGRAPHY.fontWeights.semibold,
    color: COLORS.secondary,
  },
  addActionButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  addActionButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSizes.sm,
    fontWeight: TYPOGRAPHY.fontWeights.medium,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.gray[50],
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  actionContent: {
    flex: 1,
  },
  actionType: {
    fontSize: TYPOGRAPHY.fontSizes.base,
    fontWeight: TYPOGRAPHY.fontWeights.medium,
    color: COLORS.secondary,
    marginBottom: 4,
  },
  actionDetails: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    color: COLORS.gray[600],
  },
  removeActionButton: {
    backgroundColor: COLORS.error,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeActionButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
  noActionsText: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    color: COLORS.gray[500],
    fontStyle: 'italic',
    textAlign: 'center',
    padding: 16,
  },
  stopConditionsSection: {
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
    paddingTop: 16,
  },
  conditionItem: {
    marginBottom: 8,
  },
  conditionType: {
    fontSize: TYPOGRAPHY.fontSizes.base,
    fontWeight: TYPOGRAPHY.fontWeights.medium,
    color: COLORS.secondary,
    marginBottom: 2,
  },
  conditionDescription: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    color: COLORS.gray[600],
  },
  addLevelButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginVertical: 16,
  },
  addLevelButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSizes.base,
    fontWeight: TYPOGRAPHY.fontWeights.semibold,
  },
  saveButton: {
    backgroundColor: COLORS.success,
    margin: 16,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  disabledSaveButton: {
    backgroundColor: COLORS.gray[400],
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSizes.base,
    fontWeight: TYPOGRAPHY.fontWeights.semibold,
  },
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
  modalCloseButton: {
    backgroundColor: COLORS.gray[200],
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseButtonText: {
    color: COLORS.gray[600],
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  modalField: {
    marginBottom: 20,
  },
  modalFieldLabel: {
    fontSize: TYPOGRAPHY.fontSizes.base,
    fontWeight: TYPOGRAPHY.fontWeights.medium,
    color: COLORS.secondary,
    marginBottom: 8,
  },
  picker: {
    borderWidth: 1,
    borderColor: COLORS.gray[300],
    borderRadius: 8,
    backgroundColor: COLORS.white,
  },
  checkboxGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  checkboxItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: COLORS.gray[300],
    borderRadius: 4,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkedCheckbox: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkboxCheck: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: TYPOGRAPHY.fontSizes.base,
    color: COLORS.secondary,
  },
  modalActions: {
    flexDirection: 'row',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
    gap: 12,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: COLORS.gray[200],
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    color: COLORS.gray[700],
    fontSize: TYPOGRAPHY.fontSizes.base,
    fontWeight: TYPOGRAPHY.fontWeights.medium,
  },
  modalSaveButton: {
    flex: 1,
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalSaveButtonText: {
    color: COLORS.white,
    fontSize: TYPOGRAPHY.fontSizes.base,
    fontWeight: TYPOGRAPHY.fontWeights.semibold,
  },
});

export default EscalationRules;