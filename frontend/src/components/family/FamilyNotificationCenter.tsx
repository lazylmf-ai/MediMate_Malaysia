/**
 * Family Notification Center Component
 *
 * Displays real-time family notifications including missed doses,
 * emergency alerts, and daily summaries.
 * Provides culturally-aware notification management interface.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Modal,
} from 'react-native';
import { format, isToday, isYesterday, differenceInMinutes } from 'date-fns';
import FamilyCoordinationService, {
  FamilyNotification,
  PatientFamilyCircle
} from '@/services/family/FamilyCoordinationService';
import { COLORS, TYPOGRAPHY } from '@/constants/config';
import { useAppSelector } from '@/store/hooks';

interface FamilyNotificationCenterProps {
  patientId?: string;
  familyMemberId?: string;
  maxNotifications?: number;
  showFilters?: boolean;
  onNotificationPress?: (notification: FamilyNotification) => void;
}

interface NotificationFilters {
  types: FamilyNotification['type'][];
  priorities: FamilyNotification['priority'][];
  timeRange: 'today' | 'week' | 'month' | 'all';
  status: 'all' | 'delivered' | 'pending' | 'failed';
}

interface NotificationItemProps {
  notification: FamilyNotification;
  onPress?: () => void;
  onMarkAsRead?: (id: string) => void;
  onRespond?: (id: string, response: string) => void;
  language: string;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onPress,
  onMarkAsRead,
  onRespond,
  language
}) => {
  const getTypeIcon = (type: FamilyNotification['type']) => {
    // In a real app, these would be actual icons
    const icons = {
      missed_dose: '💊',
      emergency_alert: '🚨',
      daily_summary: '📊',
      weekly_report: '📈',
      medication_taken: '✅',
      general_update: 'ℹ️'
    };
    return icons[type] || 'ℹ️';
  };

  const getPriorityColor = (priority: FamilyNotification['priority']) => {
    switch (priority) {
      case 'urgent': return COLORS.error;
      case 'high': return COLORS.orange;
      case 'medium': return COLORS.warning;
      case 'low': return COLORS.gray[500];
      default: return COLORS.gray[500];
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return COLORS.success;
      case 'pending': return COLORS.warning;
      case 'failed': return COLORS.error;
      default: return COLORS.gray[500];
    }
  };

  const getTypeText = (type: FamilyNotification['type']) => {
    const typeTexts = {
      en: {
        missed_dose: 'Missed Dose',
        emergency_alert: 'Emergency Alert',
        daily_summary: 'Daily Summary',
        weekly_report: 'Weekly Report',
        medication_taken: 'Medication Taken',
        general_update: 'General Update'
      },
      ms: {
        missed_dose: 'Dos Terlepas',
        emergency_alert: 'Amaran Kecemasan',
        daily_summary: 'Ringkasan Harian',
        weekly_report: 'Laporan Mingguan',
        medication_taken: 'Ubat Diambil',
        general_update: 'Kemaskini Am'
      },
      zh: {
        missed_dose: '错过剂量',
        emergency_alert: '紧急警报',
        daily_summary: '每日摘要',
        weekly_report: '每周报告',
        medication_taken: '药物已服用',
        general_update: '一般更新'
      },
      ta: {
        missed_dose: 'தவறவிட்ட அளவு',
        emergency_alert: 'அவசர எச்சரிக்கை',
        daily_summary: 'தினசரி சுருக்கம்',
        weekly_report: 'வாராந்திர அறிக்கை',
        medication_taken: 'மருந்து எடுத்துக்கொண்டது',
        general_update: 'பொது புதுப்பிப்பு'
      }
    };

    return typeTexts[language as keyof typeof typeTexts]?.[type] || type;
  };

  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMinutes = differenceInMinutes(now, date);

    if (diffMinutes < 1) {
      return language === 'ms' ? 'Baru sahaja' :
             language === 'zh' ? '刚刚' :
             language === 'ta' ? 'இப்போது தான்' :
             'Just now';
    }

    if (diffMinutes < 60) {
      return language === 'ms' ? `${diffMinutes} minit lalu` :
             language === 'zh' ? `${diffMinutes}分钟前` :
             language === 'ta' ? `${diffMinutes} நிமிடங்களுக்கு முன்பு` :
             `${diffMinutes}m ago`;
    }

    if (isToday(date)) {
      return format(date, 'HH:mm');
    }

    if (isYesterday(date)) {
      return language === 'ms' ? 'Semalam' :
             language === 'zh' ? '昨天' :
             language === 'ta' ? 'நேற்று' :
             'Yesterday';
    }

    return format(date, 'MMM dd');
  };

  const getActionButtons = () => {
    const buttons = [];

    if (notification.type === 'missed_dose' || notification.type === 'emergency_alert') {
      buttons.push({
        text: language === 'ms' ? 'Balas' :
              language === 'zh' ? '回复' :
              language === 'ta' ? 'பதிலளிக்கவும்' :
              'Respond',
        onPress: () => onRespond?.(notification.id, 'acknowledged'),
        style: styles.respondButton
      });
    }

    return buttons;
  };

  return (
    <TouchableOpacity
      style={[
        styles.notificationItem,
        notification.priority === 'urgent' && styles.urgentNotification
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.notificationHeader}>
        <View style={styles.notificationMeta}>
          <Text style={styles.notificationIcon}>{getTypeIcon(notification.type)}</Text>
          <View style={styles.notificationInfo}>
            <Text style={styles.notificationTitle}>{notification.content.title}</Text>
            <Text style={styles.notificationSubtitle}>{getTypeText(notification.type)}</Text>
          </View>
        </View>

        <View style={styles.notificationStatus}>
          <Text style={styles.notificationTime}>{getTimeAgo(notification.createdAt)}</Text>
          <View style={styles.statusIndicators}>
            <View style={[
              styles.priorityIndicator,
              { backgroundColor: getPriorityColor(notification.priority) }
            ]} />
            <View style={[
              styles.deliveryIndicator,
              { backgroundColor: getStatusColor(notification.delivery.status) }
            ]} />
          </View>
        </View>
      </View>

      <Text style={styles.notificationBody} numberOfLines={3}>
        {notification.content.body}
      </Text>

      {notification.content.medicationName && (
        <View style={styles.medicationInfo}>
          <Text style={styles.medicationLabel}>
            {language === 'ms' ? 'Ubat' :
             language === 'zh' ? '药物' :
             language === 'ta' ? 'மருந்து' :
             'Medication'}:
          </Text>
          <Text style={styles.medicationName}>{notification.content.medicationName}</Text>
          {notification.content.dosage && (
            <Text style={styles.medicationDosage}>({notification.content.dosage})</Text>
          )}
        </View>
      )}

      <View style={styles.notificationActions}>
        <View style={styles.deliveryMethods}>
          {notification.delivery.methods.map((method, index) => (
            <View key={index} style={[
              styles.methodBadge,
              { backgroundColor: notification.delivery.status === 'delivered' ? COLORS.success : COLORS.gray[400] }
            ]}>
              <Text style={styles.methodText}>{method.toUpperCase()}</Text>
            </View>
          ))}
        </View>

        <View style={styles.actionButtons}>
          {getActionButtons().map((button, index) => (
            <TouchableOpacity
              key={index}
              style={button.style}
              onPress={button.onPress}
            >
              <Text style={styles.actionButtonText}>{button.text}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </TouchableOpacity>
  );
};

const FilterModal: React.FC<{
  visible: boolean;
  filters: NotificationFilters;
  onFiltersChange: (filters: NotificationFilters) => void;
  onClose: () => void;
  language: string;
}> = ({ visible, filters, onFiltersChange, onClose, language }) => {
  const [localFilters, setLocalFilters] = useState<NotificationFilters>(filters);

  const getFilterLabels = () => {
    const labels = {
      en: {
        title: 'Filter Notifications',
        types: 'Notification Types',
        priorities: 'Priority Levels',
        timeRange: 'Time Range',
        status: 'Delivery Status',
        apply: 'Apply Filters',
        reset: 'Reset',
        cancel: 'Cancel'
      },
      ms: {
        title: 'Tapis Pemberitahuan',
        types: 'Jenis Pemberitahuan',
        priorities: 'Tahap Keutamaan',
        timeRange: 'Julat Masa',
        status: 'Status Penghantaran',
        apply: 'Gunakan Penapis',
        reset: 'Tetap Semula',
        cancel: 'Batal'
      },
      zh: {
        title: '筛选通知',
        types: '通知类型',
        priorities: '优先级',
        timeRange: '时间范围',
        status: '投递状态',
        apply: '应用筛选',
        reset: '重置',
        cancel: '取消'
      },
      ta: {
        title: 'அறிவிப்புகளை வடிகட்டவும்',
        types: 'அறிவிப்பு வகைகள்',
        priorities: 'முன்னுரிமை நிலைகள்',
        timeRange: 'நேர வரம்பு',
        status: 'விநியோக நிலை',
        apply: 'வடிகட்டிகளைப் பயன்படுத்தவும்',
        reset: 'மீட்டமைக்கவும்',
        cancel: 'ரத்துசெய்யவும்'
      }
    };
    return labels[language as keyof typeof labels] || labels.en;
  };

  const labels = getFilterLabels();

  const handleApply = () => {
    onFiltersChange(localFilters);
    onClose();
  };

  const handleReset = () => {
    const defaultFilters: NotificationFilters = {
      types: [],
      priorities: [],
      timeRange: 'all',
      status: 'all'
    };
    setLocalFilters(defaultFilters);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.modalCancelButton}>{labels.cancel}</Text>
          </TouchableOpacity>
          <Text style={styles.modalTitle}>{labels.title}</Text>
          <TouchableOpacity onPress={handleReset}>
            <Text style={styles.modalResetButton}>{labels.reset}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.modalContent}>
          {/* Filter options would be implemented here */}
          <Text style={styles.filterSectionTitle}>{labels.types}</Text>
          <Text style={styles.filterSectionTitle}>{labels.priorities}</Text>
          <Text style={styles.filterSectionTitle}>{labels.timeRange}</Text>
          <Text style={styles.filterSectionTitle}>{labels.status}</Text>
        </View>

        <View style={styles.modalFooter}>
          <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
            <Text style={styles.applyButtonText}>{labels.apply}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

export const FamilyNotificationCenter: React.FC<FamilyNotificationCenterProps> = ({
  patientId,
  familyMemberId,
  maxNotifications = 50,
  showFilters = true,
  onNotificationPress
}) => {
  const [notifications, setNotifications] = useState<FamilyNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState<NotificationFilters>({
    types: [],
    priorities: [],
    timeRange: 'all',
    status: 'all'
  });
  const [showFilterModal, setShowFilterModal] = useState(false);

  const { profile } = useAppSelector((state) => state.cultural);
  const language = profile?.language || 'en';

  const familyService = FamilyCoordinationService.getInstance();

  const loadNotifications = useCallback(async () => {
    try {
      setIsLoading(true);

      // Initialize service if needed
      if (!familyService.isServiceInitialized()) {
        await familyService.initialize();
      }

      // Load notifications
      let notificationHistory = familyService.getNotificationHistory(patientId, maxNotifications);

      // Apply filters
      if (familyMemberId) {
        notificationHistory = notificationHistory.filter(n => n.familyMemberId === familyMemberId);
      }

      if (filters.types.length > 0) {
        notificationHistory = notificationHistory.filter(n => filters.types.includes(n.type));
      }

      if (filters.priorities.length > 0) {
        notificationHistory = notificationHistory.filter(n => filters.priorities.includes(n.priority));
      }

      if (filters.status !== 'all') {
        notificationHistory = notificationHistory.filter(n => n.delivery.status === filters.status);
      }

      // Apply time range filter
      if (filters.timeRange !== 'all') {
        const now = new Date();
        let cutoff: Date;

        switch (filters.timeRange) {
          case 'today':
            cutoff = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            break;
          case 'week':
            cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
          case 'month':
            cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
          default:
            cutoff = new Date(0);
        }

        notificationHistory = notificationHistory.filter(n => n.createdAt >= cutoff);
      }

      setNotifications(notificationHistory);

    } catch (error) {
      console.error('Failed to load notifications:', error);
      const errorMessages = {
        en: 'Failed to load notifications. Please try again.',
        ms: 'Gagal memuatkan pemberitahuan. Sila cuba lagi.',
        zh: '无法加载通知。请重试。',
        ta: 'அறிவிப்புகளை ஏற்ற முடியவில்லை. மீண்டும் முயற்சிக்கவும்.'
      };
      Alert.alert('Error', errorMessages[language as keyof typeof errorMessages] || errorMessages.en);
    } finally {
      setIsLoading(false);
    }
  }, [patientId, familyMemberId, maxNotifications, filters, familyService, language]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadNotifications();
    setRefreshing(false);
  }, [loadNotifications]);

  const handleMarkAsRead = useCallback(async (notificationId: string) => {
    try {
      // Update local state
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId
            ? { ...n, metadata: { ...n.metadata, read: true } }
            : n
        )
      );

      // In real app, this would update the backend
      console.log(`Marked notification as read: ${notificationId}`);

    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  }, []);

  const handleRespond = useCallback(async (notificationId: string, response: string) => {
    try {
      // Update local state
      setNotifications(prev =>
        prev.map(n =>
          n.id === notificationId
            ? { ...n, metadata: { ...n.metadata, response, respondedAt: new Date() } }
            : n
        )
      );

      const responseMessages = {
        en: 'Response recorded successfully',
        ms: 'Respons direkodkan dengan jayanya',
        zh: '响应记录成功',
        ta: 'பதில் வெற்றிகரமாக பதிவு செய்யப்பட்டது'
      };

      Alert.alert(
        'Success',
        responseMessages[language as keyof typeof responseMessages] || responseMessages.en
      );

    } catch (error) {
      console.error('Failed to record response:', error);
      const errorMessages = {
        en: 'Failed to record response. Please try again.',
        ms: 'Gagal merekodkan respons. Sila cuba lagi.',
        zh: '无法记录响应。请重试。',
        ta: 'பதிலை பதிவு செய்ய முடியவில்லை. மீண்டும் முயற்சிக்கவும்.'
      };
      Alert.alert('Error', errorMessages[language as keyof typeof errorMessages] || errorMessages.en);
    }
  }, [language]);

  const handleNotificationPress = useCallback((notification: FamilyNotification) => {
    handleMarkAsRead(notification.id);
    onNotificationPress?.(notification);
  }, [handleMarkAsRead, onNotificationPress]);

  const handleFiltersChange = useCallback((newFilters: NotificationFilters) => {
    setFilters(newFilters);
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Auto-refresh every 30 seconds
  useEffect(() => {
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  const getEmptyStateMessage = () => {
    const messages = {
      en: {
        title: 'No Notifications',
        subtitle: 'No family notifications to display'
      },
      ms: {
        title: 'Tiada Pemberitahuan',
        subtitle: 'Tiada pemberitahuan keluarga untuk dipaparkan'
      },
      zh: {
        title: '无通知',
        subtitle: '没有家庭通知显示'
      },
      ta: {
        title: 'அறிவிப்புகள் இல்லை',
        subtitle: 'காண்பிக்க குடும்ப அறிவிப்புகள் இல்லை'
      }
    };

    return messages[language as keyof typeof messages] || messages.en;
  };

  const renderNotificationItem = ({ item }: { item: FamilyNotification }) => (
    <NotificationItem
      notification={item}
      onPress={() => handleNotificationPress(item)}
      onMarkAsRead={handleMarkAsRead}
      onRespond={handleRespond}
      language={language}
    />
  );

  const renderEmptyState = () => {
    const emptyMessage = getEmptyStateMessage();
    return (
      <View style={styles.emptyState}>
        <Text style={styles.emptyStateTitle}>{emptyMessage.title}</Text>
        <Text style={styles.emptyStateSubtitle}>{emptyMessage.subtitle}</Text>
      </View>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <Text style={styles.headerTitle}>
        {language === 'ms' ? 'Pemberitahuan Keluarga' :
         language === 'zh' ? '家庭通知' :
         language === 'ta' ? 'குடும்ப அறிவிப்புகள்' :
         'Family Notifications'}
      </Text>
      {showFilters && (
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilterModal(true)}
        >
          <Text style={styles.filterButtonText}>
            {language === 'ms' ? 'Tapis' :
             language === 'zh' ? '筛选' :
             language === 'ta' ? 'வடிகட்டவும்' :
             'Filter'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>
          {language === 'ms' ? 'Memuatkan pemberitahuan...' :
           language === 'zh' ? '加载通知中...' :
           language === 'ta' ? 'அறிவிப்புகளை ஏற்றுகிறது...' :
           'Loading notifications...'}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderHeader()}
      <FlatList
        data={notifications}
        renderItem={renderNotificationItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[COLORS.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmptyState}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      <FilterModal
        visible={showFilterModal}
        filters={filters}
        onFiltersChange={handleFiltersChange}
        onClose={() => setShowFilterModal(false)}
        language={language}
      />
    </View>
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
    padding: 20,
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
    padding: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.fontSizes.lg,
    fontWeight: TYPOGRAPHY.fontWeights.semibold,
    color: COLORS.secondary,
  },
  filterButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  filterButtonText: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    fontWeight: TYPOGRAPHY.fontWeights.medium,
    color: COLORS.white,
  },
  listContainer: {
    padding: 16,
    flexGrow: 1,
  },
  separator: {
    height: 12,
  },
  notificationItem: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  urgentNotification: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.error,
  },
  notificationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  notificationMeta: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  notificationIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  notificationInfo: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: TYPOGRAPHY.fontSizes.base,
    fontWeight: TYPOGRAPHY.fontWeights.semibold,
    color: COLORS.secondary,
    marginBottom: 2,
  },
  notificationSubtitle: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    color: COLORS.gray[600],
  },
  notificationStatus: {
    alignItems: 'flex-end',
  },
  notificationTime: {
    fontSize: TYPOGRAPHY.fontSizes.xs,
    color: COLORS.gray[500],
    marginBottom: 4,
  },
  statusIndicators: {
    flexDirection: 'row',
    gap: 4,
  },
  priorityIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  deliveryIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  notificationBody: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    color: COLORS.gray[700],
    lineHeight: 20,
    marginBottom: 12,
  },
  medicationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    padding: 8,
    backgroundColor: COLORS.gray[50],
    borderRadius: 6,
  },
  medicationLabel: {
    fontSize: TYPOGRAPHY.fontSizes.xs,
    color: COLORS.gray[600],
    marginRight: 4,
  },
  medicationName: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    fontWeight: TYPOGRAPHY.fontWeights.medium,
    color: COLORS.secondary,
    marginRight: 4,
  },
  medicationDosage: {
    fontSize: TYPOGRAPHY.fontSizes.xs,
    color: COLORS.gray[600],
  },
  notificationActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  deliveryMethods: {
    flexDirection: 'row',
    gap: 4,
  },
  methodBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  methodText: {
    fontSize: TYPOGRAPHY.fontSizes.xs,
    fontWeight: TYPOGRAPHY.fontWeights.medium,
    color: COLORS.white,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  respondButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  actionButtonText: {
    fontSize: TYPOGRAPHY.fontSizes.xs,
    fontWeight: TYPOGRAPHY.fontWeights.medium,
    color: COLORS.white,
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
  modalResetButton: {
    fontSize: TYPOGRAPHY.fontSizes.base,
    color: COLORS.primary,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  filterSectionTitle: {
    fontSize: TYPOGRAPHY.fontSizes.base,
    fontWeight: TYPOGRAPHY.fontWeights.semibold,
    color: COLORS.secondary,
    marginBottom: 12,
    marginTop: 16,
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[200],
  },
  applyButton: {
    backgroundColor: COLORS.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  applyButtonText: {
    fontSize: TYPOGRAPHY.fontSizes.base,
    fontWeight: TYPOGRAPHY.fontWeights.medium,
    color: COLORS.white,
  },
});

export default FamilyNotificationCenter;