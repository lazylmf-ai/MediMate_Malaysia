/**
 * Emergency Escalation Panel Component
 *
 * Displays active emergency escalations with real-time status updates.
 * Integrates with NotificationPriorityService for escalation management.
 * Provides cultural-aware UI for Malaysian users.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { format } from 'date-fns';
import NotificationPriorityService, {
  PriorityEscalationRecord,
  EmergencyContact
} from '@/services/notifications/NotificationPriorityService';
import { COLORS, TYPOGRAPHY } from '@/constants/config';
import { useAppSelector } from '@/store/hooks';

interface EscalationPanelProps {
  patientId?: string;
  onEscalationPress?: (escalation: PriorityEscalationRecord) => void;
  compact?: boolean;
}

interface EscalationItemProps {
  escalation: PriorityEscalationRecord;
  onPress?: () => void;
  onResolve?: (id: string) => void;
  compact?: boolean;
  language?: string;
}

const EscalationItem: React.FC<EscalationItemProps> = ({
  escalation,
  onPress,
  onResolve,
  compact = false,
  language = 'en'
}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return COLORS.error;
      case 'resolved': return COLORS.success;
      case 'cancelled': return COLORS.gray[500];
      default: return COLORS.warning;
    }
  };

  const getStatusText = (status: string) => {
    const statusTexts = {
      en: {
        active: 'Active',
        resolved: 'Resolved',
        cancelled: 'Cancelled'
      },
      ms: {
        active: 'Aktif',
        resolved: 'Diselesaikan',
        cancelled: 'Dibatalkan'
      },
      zh: {
        active: '活跃',
        resolved: '已解决',
        cancelled: '已取消'
      },
      ta: {
        active: 'செயலில்',
        resolved: 'தீர்க்கப்பட்டது',
        cancelled: 'ரத்துசெய்யப்பட்டது'
      }
    };

    return statusTexts[language as keyof typeof statusTexts]?.[status as keyof typeof statusTexts.en] || status;
  };

  const getTriggerTypeText = (type: string) => {
    const triggerTexts = {
      en: {
        missed_doses: 'Missed Doses',
        failed_deliveries: 'Failed Deliveries',
        no_response: 'No Response',
        time_based: 'Time-based',
        manual: 'Manual Trigger'
      },
      ms: {
        missed_doses: 'Dos Terlepas',
        failed_deliveries: 'Penghantaran Gagal',
        no_response: 'Tiada Respons',
        time_based: 'Berdasarkan Masa',
        manual: 'Pencetus Manual'
      },
      zh: {
        missed_doses: '错过剂量',
        failed_deliveries: '投递失败',
        no_response: '无响应',
        time_based: '基于时间',
        manual: '手动触发'
      },
      ta: {
        missed_doses: 'தவறவிட்ட அளவுகள்',
        failed_deliveries: 'தோல்வியுற்ற விநியோகம்',
        no_response: 'பதிலளிக்கவில்லை',
        time_based: 'நேரம் அடிப்படையில்',
        manual: 'கைமுறை தூண்டுதல்'
      }
    };

    return triggerTexts[language as keyof typeof triggerTexts]?.[type as keyof typeof triggerTexts.en] || type;
  };

  const handleResolve = () => {
    const resolveTexts = {
      en: {
        title: 'Resolve Escalation',
        message: 'Are you sure you want to mark this escalation as resolved?',
        resolve: 'Resolve',
        cancel: 'Cancel'
      },
      ms: {
        title: 'Selesaikan Peningkatan',
        message: 'Adakah anda pasti mahu menandakan peningkatan ini sebagai diselesaikan?',
        resolve: 'Selesaikan',
        cancel: 'Batal'
      },
      zh: {
        title: '解决升级',
        message: '您确定要将此升级标记为已解决吗？',
        resolve: '解决',
        cancel: '取消'
      },
      ta: {
        title: 'அதிகரிப்பை தீர்க்கவும்',
        message: 'இந்த அதிகரிப்பை தீர்க்கப்பட்டதாக குறிக்க நீங்கள் உறுதியாக இருக்கிறீர்களா?',
        resolve: 'தீர்க்கவும்',
        cancel: 'ரத்துசெய்யவும்'
      }
    };

    const texts = resolveTexts[language as keyof typeof resolveTexts] || resolveTexts.en;

    Alert.alert(
      texts.title,
      texts.message,
      [
        { text: texts.cancel, style: 'cancel' },
        {
          text: texts.resolve,
          style: 'destructive',
          onPress: () => onResolve?.(escalation.id)
        }
      ]
    );
  };

  return (
    <TouchableOpacity
      style={[styles.escalationItem, compact && styles.escalationItemCompact]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.escalationHeader}>
        <View style={styles.escalationMeta}>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(escalation.currentStatus) }]}>
            <Text style={styles.statusText}>{getStatusText(escalation.currentStatus)}</Text>
          </View>
          <Text style={styles.escalationTime}>
            {format(escalation.triggerTime, 'MMM dd, HH:mm')}
          </Text>
        </View>

        {escalation.currentStatus === 'active' && (
          <TouchableOpacity
            style={styles.resolveButton}
            onPress={handleResolve}
          >
            <Text style={styles.resolveButtonText}>
              {language === 'ms' ? 'Selesai' : language === 'zh' ? '解决' : language === 'ta' ? 'தீர்க்கவும்' : 'Resolve'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.escalationContent}>
        <Text style={styles.triggerType}>{getTriggerTypeText(escalation.triggerType)}</Text>
        <Text style={styles.escalationLevel}>
          {language === 'ms' ? 'Tahap' : language === 'zh' ? '级别' : language === 'ta' ? 'நிலை' : 'Level'} {escalation.escalationLevel}
        </Text>
      </View>

      {!compact && (
        <View style={styles.escalationActions}>
          <Text style={styles.actionsLabel}>
            {language === 'ms' ? 'Tindakan Dilaksanakan' :
             language === 'zh' ? '已执行的操作' :
             language === 'ta' ? 'செயல்படுத்தப்பட்ட நடவடிக்கைகள்' :
             'Actions Executed'}: {escalation.actionsExecuted.length}
          </Text>
          <View style={styles.actionsList}>
            {escalation.actionsExecuted.slice(0, 2).map((action, index) => (
              <View key={index} style={styles.actionItem}>
                <View style={[
                  styles.actionStatus,
                  { backgroundColor: action.result === 'success' ? COLORS.success :
                                   action.result === 'failed' ? COLORS.error : COLORS.warning }
                ]} />
                <Text style={styles.actionText}>
                  {action.action.type.replace('_', ' ')}
                </Text>
              </View>
            ))}
            {escalation.actionsExecuted.length > 2 && (
              <Text style={styles.moreActions}>
                +{escalation.actionsExecuted.length - 2} more
              </Text>
            )}
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
};

export const EscalationPanel: React.FC<EscalationPanelProps> = ({
  patientId,
  onEscalationPress,
  compact = false
}) => {
  const [escalations, setEscalations] = useState<PriorityEscalationRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const { profile } = useAppSelector((state) => state.cultural);
  const language = profile?.language || 'en';

  const priorityService = NotificationPriorityService.getInstance();

  const loadEscalations = useCallback(async () => {
    try {
      setIsLoading(true);
      let allEscalations = priorityService.getActiveEscalations();

      // Filter by patient if specified
      if (patientId) {
        allEscalations = allEscalations.filter(e => e.patientId === patientId);
      }

      // Sort by trigger time (newest first)
      allEscalations.sort((a, b) => b.triggerTime.getTime() - a.triggerTime.getTime());

      setEscalations(allEscalations);
    } catch (error) {
      console.error('Failed to load escalations:', error);
      // Show culturally appropriate error message
      const errorMessages = {
        en: 'Failed to load emergency escalations. Please try again.',
        ms: 'Gagal memuatkan peningkatan kecemasan. Sila cuba lagi.',
        zh: '无法加载紧急升级。请重试。',
        ta: 'அவசர அதிகரிப்புகளை ஏற்ற முடியவில்லை. மீண்டும் முயற்சிக்கவும்.'
      };
      Alert.alert('Error', errorMessages[language as keyof typeof errorMessages] || errorMessages.en);
    } finally {
      setIsLoading(false);
    }
  }, [patientId, priorityService, language]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadEscalations();
    setRefreshing(false);
  }, [loadEscalations]);

  const handleResolveEscalation = useCallback(async (escalationId: string) => {
    try {
      const success = await priorityService.resolveEscalation(escalationId, 'user');
      if (success) {
        await loadEscalations(); // Reload to reflect changes

        const successMessages = {
          en: 'Escalation resolved successfully',
          ms: 'Peningkatan berjaya diselesaikan',
          zh: '升级已成功解决',
          ta: 'அதிகரிப்பு வெற்றிகரமாக தீர்க்கப்பட்டது'
        };
        Alert.alert('Success', successMessages[language as keyof typeof successMessages] || successMessages.en);
      } else {
        throw new Error('Failed to resolve escalation');
      }
    } catch (error) {
      console.error('Failed to resolve escalation:', error);
      const errorMessages = {
        en: 'Failed to resolve escalation. Please try again.',
        ms: 'Gagal menyelesaikan peningkatan. Sila cuba lagi.',
        zh: '无法解决升级。请重试。',
        ta: 'அதிகரிப்பை தீர்க்க முடியவில்லை. மீண்டும் முயற்சிக்கவும்.'
      };
      Alert.alert('Error', errorMessages[language as keyof typeof errorMessages] || errorMessages.en);
    }
  }, [priorityService, loadEscalations, language]);

  useEffect(() => {
    loadEscalations();
  }, [loadEscalations]);

  // Auto-refresh every 30 seconds for real-time updates
  useEffect(() => {
    const interval = setInterval(loadEscalations, 30000);
    return () => clearInterval(interval);
  }, [loadEscalations]);

  const getEmptyStateMessage = () => {
    const messages = {
      en: {
        title: 'No Emergency Escalations',
        subtitle: 'All medication reminders are being delivered successfully'
      },
      ms: {
        title: 'Tiada Peningkatan Kecemasan',
        subtitle: 'Semua peringatan ubat sedang dihantar dengan jayanya'
      },
      zh: {
        title: '无紧急升级',
        subtitle: '所有药物提醒都已成功投递'
      },
      ta: {
        title: 'அவசர அதிகரிப்பு இல்லை',
        subtitle: 'அனைத்து மருந்து நினைவூட்டல்களும் வெற்றிகரமாக வழங்கப்படுகின்றன'
      }
    };

    return messages[language as keyof typeof messages] || messages.en;
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>
          {language === 'ms' ? 'Memuatkan...' :
           language === 'zh' ? '加载中...' :
           language === 'ta' ? 'ஏற்றுகிறது...' :
           'Loading...'}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, compact && styles.containerCompact]}>
      {escalations.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateTitle}>{getEmptyStateMessage().title}</Text>
          <Text style={styles.emptyStateSubtitle}>{getEmptyStateMessage().subtitle}</Text>
        </View>
      ) : (
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
          {escalations.map((escalation) => (
            <EscalationItem
              key={escalation.id}
              escalation={escalation}
              onPress={() => onEscalationPress?.(escalation)}
              onResolve={handleResolveEscalation}
              compact={compact}
              language={language}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  containerCompact: {
    maxHeight: 300,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: TYPOGRAPHY.fontSizes.sm,
    color: COLORS.gray[600],
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  escalationItem: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.error,
  },
  escalationItemCompact: {
    padding: 12,
    marginBottom: 8,
  },
  escalationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  escalationMeta: {
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  statusText: {
    fontSize: TYPOGRAPHY.fontSizes.xs,
    fontWeight: TYPOGRAPHY.fontWeights.medium,
    color: COLORS.white,
    textTransform: 'uppercase',
  },
  escalationTime: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    color: COLORS.gray[600],
  },
  resolveButton: {
    backgroundColor: COLORS.success,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  resolveButtonText: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    fontWeight: TYPOGRAPHY.fontWeights.medium,
    color: COLORS.white,
  },
  escalationContent: {
    marginBottom: 12,
  },
  triggerType: {
    fontSize: TYPOGRAPHY.fontSizes.base,
    fontWeight: TYPOGRAPHY.fontWeights.semibold,
    color: COLORS.secondary,
    marginBottom: 4,
  },
  escalationLevel: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    color: COLORS.gray[700],
  },
  escalationActions: {
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
    paddingTop: 12,
  },
  actionsLabel: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    fontWeight: TYPOGRAPHY.fontWeights.medium,
    color: COLORS.gray[700],
    marginBottom: 8,
  },
  actionsList: {
    flexDirection: 'column',
    gap: 4,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionStatus: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  actionText: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    color: COLORS.gray[600],
    textTransform: 'capitalize',
  },
  moreActions: {
    fontSize: TYPOGRAPHY.fontSizes.xs,
    color: COLORS.gray[500],
    fontStyle: 'italic',
    marginLeft: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
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
    lineHeight: 22,
  },
});

export default EscalationPanel;