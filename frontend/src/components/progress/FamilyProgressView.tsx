/**
 * Family Progress View Component
 *
 * Provides family-friendly progress sharing and caregiver view
 * with privacy controls, cultural considerations, and elderly care features.
 * Designed for Malaysian family structures and care traditions.
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Switch,
  ScrollView,
  Modal,
} from 'react-native';
import { useCulturalTheme, useCulturalStyles } from '@/components/language/ui/CulturalThemeProvider';
import { useTranslation } from '@/i18n/hooks/useTranslation';
import {
  ProgressMetrics,
  AdherenceRecord,
  StreakData,
} from '@/types/adherence';

interface FamilyMember {
  id: string;
  name: string;
  relationship: 'spouse' | 'child' | 'parent' | 'sibling' | 'caregiver' | 'other';
  role: 'primary_caregiver' | 'secondary_caregiver' | 'emergency_contact' | 'viewer';
  permissions: {
    viewProgress: boolean;
    receiveAlerts: boolean;
    manageReminders: boolean;
    emergencyAccess: boolean;
  };
  culturalContext?: {
    language: string;
    respectLevel: 'elder' | 'peer' | 'younger';
    communicationStyle: 'direct' | 'respectful' | 'formal';
  };
}

interface FamilyProgressViewProps {
  patientId: string;
  progressMetrics: ProgressMetrics;
  onFamilyShare?: (data: FamilyShareData) => void;
  showPrivacyControls?: boolean;
}

interface FamilyShareData {
  summary: string;
  metrics: {
    adherenceRate: number;
    currentStreak: number;
    improvements: string[];
    concerns: string[];
  };
  privacy: {
    level: 'basic' | 'detailed' | 'full';
    recipients: string[];
    includeRecommendations: boolean;
  };
}

export const FamilyProgressView: React.FC<FamilyProgressViewProps> = ({
  patientId,
  progressMetrics,
  onFamilyShare,
  showPrivacyControls = true,
}) => {
  const { theme, isElderlyMode } = useCulturalTheme();
  const { getCardStyle, getTextStyle, getButtonStyle } = useCulturalStyles();
  const { t } = useTranslation();

  // State management
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>(getMockFamilyMembers());
  const [shareSettings, setShareSettings] = useState({
    level: 'basic' as 'basic' | 'detailed' | 'full',
    includeRecommendations: false,
    autoShare: false,
    frequency: 'weekly' as 'daily' | 'weekly' | 'monthly',
  });
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);

  // Generate family-appropriate summary
  const familySummary = useMemo(() => {
    const { overallAdherence, streaks } = progressMetrics;

    let status: 'excellent' | 'good' | 'needs_attention' = 'good';
    if (overallAdherence >= 80) status = 'excellent';
    else if (overallAdherence < 60) status = 'needs_attention';

    const improvements: string[] = [];
    const concerns: string[] = [];

    // Analyze trends for family communication
    if (streaks.currentStreak >= 7) {
      improvements.push(t('family.improvements.streak', { days: streaks.currentStreak }));
    }

    if (overallAdherence >= 80) {
      improvements.push(t('family.improvements.adherence'));
    }

    if (overallAdherence < 70) {
      concerns.push(t('family.concerns.adherence'));
    }

    const missedDoses = progressMetrics.medications.reduce((total, med) => total + med.missedDoses, 0);
    if (missedDoses > 5) {
      concerns.push(t('family.concerns.missedDoses'));
    }

    return {
      status,
      summary: t(`family.summary.${status}`, {
        adherence: Math.round(overallAdherence),
        streak: streaks.currentStreak,
      }),
      improvements,
      concerns,
    };
  }, [progressMetrics, t]);

  const handleFamilyMemberToggle = useCallback((memberId: string) => {
    setSelectedRecipients(prev => {
      if (prev.includes(memberId)) {
        return prev.filter(id => id !== memberId);
      } else {
        return [...prev, memberId];
      }
    });
  }, []);

  const handlePrivacyLevelChange = useCallback((level: 'basic' | 'detailed' | 'full') => {
    setShareSettings(prev => ({ ...prev, level }));
  }, []);

  const handleShareProgress = useCallback(() => {
    if (selectedRecipients.length === 0) {
      Alert.alert(
        t('family.share.noRecipients.title'),
        t('family.share.noRecipients.message'),
        [{ text: t('common.ok') }]
      );
      return;
    }

    const shareData: FamilyShareData = {
      summary: familySummary.summary,
      metrics: {
        adherenceRate: progressMetrics.overallAdherence,
        currentStreak: progressMetrics.streaks.currentStreak,
        improvements: familySummary.improvements,
        concerns: familySummary.concerns,
      },
      privacy: {
        level: shareSettings.level,
        recipients: selectedRecipients,
        includeRecommendations: shareSettings.includeRecommendations,
      },
    };

    if (onFamilyShare) {
      onFamilyShare(shareData);
    } else {
      // Default sharing behavior
      Alert.alert(
        t('family.share.success.title'),
        t('family.share.success.message', { count: selectedRecipients.length }),
        [{ text: t('common.ok') }]
      );
    }

    setShowShareModal(false);
  }, [
    selectedRecipients,
    familySummary,
    progressMetrics,
    shareSettings,
    onFamilyShare,
    t,
  ]);

  const renderFamilyMemberCard = (member: FamilyMember) => {
    const isSelected = selectedRecipients.includes(member.id);
    const canViewProgress = member.permissions.viewProgress;

    return (
      <View
        key={member.id}
        style={[
          styles.memberCard,
          getCardStyle(),
          isSelected && { borderColor: theme.colors.primary, borderWidth: 2 },
        ]}
      >
        <TouchableOpacity
          style={styles.memberCardContent}
          onPress={() => canViewProgress && handleFamilyMemberToggle(member.id)}
          disabled={!canViewProgress}
          accessibilityRole="button"
          accessibilityLabel={`${t('family.selectMember')} ${member.name}`}
        >
          <View style={styles.memberInfo}>
            <Text style={[styles.memberName, getTextStyle('heading')]}>
              {member.name}
            </Text>
            <Text style={[styles.memberRelationship, getTextStyle('caption')]}>
              {t(`family.relationships.${member.relationship}`)} • {t(`family.roles.${member.role}`)}
            </Text>

            {member.culturalContext && (
              <Text style={[styles.culturalContext, getTextStyle('caption')]}>
                {t(`family.respectLevels.${member.culturalContext.respectLevel}`)} •
                {t(`family.communicationStyles.${member.culturalContext.communicationStyle}`)}
              </Text>
            )}
          </View>

          <View style={styles.memberControls}>
            {canViewProgress && (
              <Switch
                value={isSelected}
                onValueChange={() => handleFamilyMemberToggle(member.id)}
                trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
                thumbColor={isSelected ? theme.colors.surface : theme.colors.textSecondary}
              />
            )}

            {!canViewProgress && (
              <Text style={[styles.noPermission, getTextStyle('caption')]}>
                {t('family.noViewPermission')}
              </Text>
            )}
          </View>
        </TouchableOpacity>

        <View style={styles.permissionsList}>
          {member.permissions.receiveAlerts && (
            <Text style={[styles.permissionItem, getTextStyle('caption')]}>
              🔔 {t('family.permissions.alerts')}
            </Text>
          )}
          {member.permissions.manageReminders && (
            <Text style={[styles.permissionItem, getTextStyle('caption')]}>
              ⏰ {t('family.permissions.reminders')}
            </Text>
          )}
          {member.permissions.emergencyAccess && (
            <Text style={[styles.permissionItem, getTextStyle('caption')]}>
              🚨 {t('family.permissions.emergency')}
            </Text>
          )}
        </View>
      </View>
    );
  };

  const renderProgressSummary = () => (
    <View style={[styles.summarySection, getCardStyle()]}>
      <Text style={[styles.summaryTitle, getTextStyle('heading')]}>
        {t('family.progressSummary')}
      </Text>

      <View style={styles.summaryMetrics}>
        <View style={styles.metricItem}>
          <Text style={[styles.metricValue, getTextStyle('heading'), { color: getStatusColor(familySummary.status) }]}>
            {Math.round(progressMetrics.overallAdherence)}%
          </Text>
          <Text style={[styles.metricLabel, getTextStyle('caption')]}>
            {t('family.metrics.adherence')}
          </Text>
        </View>

        <View style={styles.metricItem}>
          <Text style={[styles.metricValue, getTextStyle('heading'), { color: theme.colors.success }]}>
            {progressMetrics.streaks.currentStreak}
          </Text>
          <Text style={[styles.metricLabel, getTextStyle('caption')]}>
            {t('family.metrics.streak')}
          </Text>
        </View>

        <View style={styles.metricItem}>
          <Text style={[styles.metricValue, getTextStyle('heading'), { color: theme.colors.primary }]}>
            {progressMetrics.medications.length}
          </Text>
          <Text style={[styles.metricLabel, getTextStyle('caption')]}>
            {t('family.metrics.medications')}
          </Text>
        </View>
      </View>

      <Text style={[styles.summaryText, getTextStyle('body')]}>
        {familySummary.summary}
      </Text>

      {familySummary.improvements.length > 0 && (
        <View style={styles.improvementsSection}>
          <Text style={[styles.improvementsTitle, getTextStyle('body'), { color: theme.colors.success }]}>
            ✅ {t('family.improvements.title')}
          </Text>
          {familySummary.improvements.map((improvement, index) => (
            <Text key={index} style={[styles.improvementItem, getTextStyle('caption')]}>
              • {improvement}
            </Text>
          ))}
        </View>
      )}

      {familySummary.concerns.length > 0 && (
        <View style={styles.concernsSection}>
          <Text style={[styles.concernsTitle, getTextStyle('body'), { color: theme.colors.warning }]}>
            ⚠️ {t('family.concerns.title')}
          </Text>
          {familySummary.concerns.map((concern, index) => (
            <Text key={index} style={[styles.concernItem, getTextStyle('caption')]}>
              • {concern}
            </Text>
          ))}
        </View>
      )}
    </View>
  );

  const renderPrivacyControls = () => (
    <View style={[styles.privacySection, getCardStyle()]}>
      <Text style={[styles.privacyTitle, getTextStyle('heading')]}>
        {t('family.privacy.title')}
      </Text>

      <View style={styles.privacyLevels}>
        {(['basic', 'detailed', 'full'] as const).map((level) => (
          <TouchableOpacity
            key={level}
            style={[
              styles.privacyLevel,
              shareSettings.level === level && styles.activePrivacyLevel,
              { borderColor: theme.colors.border },
            ]}
            onPress={() => handlePrivacyLevelChange(level)}
            accessibilityRole="button"
            accessibilityLabel={t(`family.privacy.levels.${level}.title`)}
          >
            <Text
              style={[
                styles.privacyLevelTitle,
                getTextStyle('body'),
                shareSettings.level === level && { color: theme.colors.primary },
              ]}
            >
              {t(`family.privacy.levels.${level}.title`)}
            </Text>
            <Text style={[styles.privacyLevelDescription, getTextStyle('caption')]}>
              {t(`family.privacy.levels.${level}.description`)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.privacyOptions}>
        <View style={styles.privacyOption}>
          <Text style={[styles.privacyOptionLabel, getTextStyle('body')]}>
            {t('family.privacy.includeRecommendations')}
          </Text>
          <Switch
            value={shareSettings.includeRecommendations}
            onValueChange={(value) =>
              setShareSettings(prev => ({ ...prev, includeRecommendations: value }))
            }
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            thumbColor={shareSettings.includeRecommendations ? theme.colors.surface : theme.colors.textSecondary}
          />
        </View>

        <View style={styles.privacyOption}>
          <Text style={[styles.privacyOptionLabel, getTextStyle('body')]}>
            {t('family.privacy.autoShare')}
          </Text>
          <Switch
            value={shareSettings.autoShare}
            onValueChange={(value) =>
              setShareSettings(prev => ({ ...prev, autoShare: value }))
            }
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
            thumbColor={shareSettings.autoShare ? theme.colors.surface : theme.colors.textSecondary}
          />
        </View>
      </View>
    </View>
  );

  const renderShareModal = () => (
    <Modal
      visible={showShareModal}
      animationType="slide"
      transparent={true}
      onRequestClose={() => setShowShareModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalContent, getCardStyle()]}>
          <Text style={[styles.modalTitle, getTextStyle('heading')]}>
            {t('family.share.confirmTitle')}
          </Text>

          <ScrollView style={styles.modalBody}>
            <Text style={[styles.modalDescription, getTextStyle('body')]}>
              {t('family.share.confirmDescription')}
            </Text>

            <View style={styles.sharePreview}>
              <Text style={[styles.previewTitle, getTextStyle('body')]}>
                {t('family.share.preview')}:
              </Text>
              <Text style={[styles.previewContent, getTextStyle('caption')]}>
                {familySummary.summary}
              </Text>
            </View>

            <View style={styles.recipientsList}>
              <Text style={[styles.recipientsTitle, getTextStyle('body')]}>
                {t('family.share.recipients')}:
              </Text>
              {selectedRecipients.map(id => {
                const member = familyMembers.find(m => m.id === id);
                return member ? (
                  <Text key={id} style={[styles.recipientName, getTextStyle('caption')]}>
                    • {member.name} ({t(`family.relationships.${member.relationship}`)})
                  </Text>
                ) : null;
              })}
            </View>
          </ScrollView>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={[styles.modalButton, getButtonStyle('tertiary')]}
              onPress={() => setShowShareModal(false)}
              accessibilityRole="button"
              accessibilityLabel={t('common.cancel')}
            >
              <Text style={[styles.modalButtonText, getTextStyle('body')]}>
                {t('common.cancel')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.modalButton, getButtonStyle('primary')]}
              onPress={handleShareProgress}
              accessibilityRole="button"
              accessibilityLabel={t('family.share.confirm')}
            >
              <Text style={[styles.modalButtonText, getTextStyle('body'), { color: theme.colors.surface }]}>
                {t('family.share.confirm')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );

  const getStatusColor = (status: 'excellent' | 'good' | 'needs_attention'): string => {
    switch (status) {
      case 'excellent':
        return theme.colors.success;
      case 'good':
        return theme.colors.primary;
      case 'needs_attention':
        return theme.colors.warning;
      default:
        return theme.colors.textSecondary;
    }
  };

  // Mock family members data
  function getMockFamilyMembers(): FamilyMember[] {
    return [
      {
        id: 'spouse-001',
        name: 'Siti Abdullah',
        relationship: 'spouse',
        role: 'primary_caregiver',
        permissions: {
          viewProgress: true,
          receiveAlerts: true,
          manageReminders: true,
          emergencyAccess: true,
        },
        culturalContext: {
          language: 'ms',
          respectLevel: 'peer',
          communicationStyle: 'direct',
        },
      },
      {
        id: 'child-001',
        name: 'Ahmad Abdullah',
        relationship: 'child',
        role: 'secondary_caregiver',
        permissions: {
          viewProgress: true,
          receiveAlerts: true,
          manageReminders: false,
          emergencyAccess: true,
        },
        culturalContext: {
          language: 'en',
          respectLevel: 'younger',
          communicationStyle: 'respectful',
        },
      },
      {
        id: 'parent-001',
        name: 'Puan Fatimah',
        relationship: 'parent',
        role: 'viewer',
        permissions: {
          viewProgress: false,
          receiveAlerts: false,
          manageReminders: false,
          emergencyAccess: false,
        },
        culturalContext: {
          language: 'ms',
          respectLevel: 'elder',
          communicationStyle: 'formal',
        },
      },
    ];
  }

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {renderProgressSummary()}

      <View style={[styles.familyMembersSection, getCardStyle()]}>
        <Text style={[styles.sectionTitle, getTextStyle('heading')]}>
          {t('family.members.title')}
        </Text>
        <Text style={[styles.sectionDescription, getTextStyle('caption')]}>
          {t('family.members.description')}
        </Text>

        {familyMembers.map(renderFamilyMemberCard)}
      </View>

      {showPrivacyControls && renderPrivacyControls()}

      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.shareButton, getButtonStyle('primary')]}
          onPress={() => setShowShareModal(true)}
          disabled={selectedRecipients.length === 0}
          accessibilityRole="button"
          accessibilityLabel={t('family.share.button')}
        >
          <Text style={[styles.shareButtonText, getTextStyle('body'), { color: theme.colors.surface }]}>
            {t('family.share.button')} ({selectedRecipients.length})
          </Text>
        </TouchableOpacity>
      </View>

      {renderShareModal()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  summarySection: {
    marginBottom: 16,
    padding: 16,
  },
  summaryTitle: {
    marginBottom: 12,
  },
  summaryMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  metricItem: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  metricLabel: {
    marginTop: 4,
    textAlign: 'center',
  },
  summaryText: {
    marginBottom: 12,
    lineHeight: 24,
  },
  improvementsSection: {
    marginBottom: 12,
  },
  improvementsTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  improvementItem: {
    marginLeft: 8,
    marginBottom: 4,
  },
  concernsSection: {
    marginBottom: 12,
  },
  concernsTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  concernItem: {
    marginLeft: 8,
    marginBottom: 4,
  },
  familyMembersSection: {
    marginBottom: 16,
    padding: 16,
  },
  sectionTitle: {
    marginBottom: 8,
  },
  sectionDescription: {
    marginBottom: 16,
    opacity: 0.7,
  },
  memberCard: {
    marginBottom: 12,
    padding: 12,
  },
  memberCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  memberRelationship: {
    marginBottom: 2,
  },
  culturalContext: {
    opacity: 0.6,
    fontStyle: 'italic',
  },
  memberControls: {
    alignItems: 'center',
  },
  noPermission: {
    opacity: 0.5,
    fontStyle: 'italic',
  },
  permissionsList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  permissionItem: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    fontSize: 10,
  },
  privacySection: {
    marginBottom: 16,
    padding: 16,
  },
  privacyTitle: {
    marginBottom: 12,
  },
  privacyLevels: {
    marginBottom: 16,
  },
  privacyLevel: {
    padding: 12,
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 8,
  },
  activePrivacyLevel: {
    backgroundColor: '#E3F2FD',
  },
  privacyLevelTitle: {
    fontWeight: '600',
    marginBottom: 4,
  },
  privacyLevelDescription: {
    opacity: 0.7,
  },
  privacyOptions: {
    gap: 12,
  },
  privacyOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  privacyOptionLabel: {
    flex: 1,
  },
  actionButtons: {
    padding: 16,
    paddingBottom: 32,
  },
  shareButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  shareButtonText: {
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxHeight: '80%',
    padding: 20,
  },
  modalTitle: {
    marginBottom: 16,
    textAlign: 'center',
  },
  modalBody: {
    maxHeight: 300,
    marginBottom: 20,
  },
  modalDescription: {
    marginBottom: 16,
    lineHeight: 24,
  },
  sharePreview: {
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  previewTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  previewContent: {
    fontStyle: 'italic',
  },
  recipientsList: {
    marginBottom: 16,
  },
  recipientsTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  recipientName: {
    marginLeft: 8,
    marginBottom: 4,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
  },
  modalButtonText: {
    fontWeight: '600',
  },
});

export default FamilyProgressView;