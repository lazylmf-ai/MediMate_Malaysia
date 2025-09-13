/**
 * Notification Center Component
 * 
 * Displays and manages all notifications with cultural themes and multi-modal delivery indicators.
 * Integrates with the Stream B multi-modal delivery system.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Animated,
  Dimensions,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCulturalTheme } from '../language/ui/CulturalThemeProvider';
import { useTranslation } from '@/i18n/hooks/useTranslation';
import CulturalNotificationCard, { CulturalNotificationData, NotificationAction } from './CulturalNotificationCard';
import type { SupportedLanguage } from '@/i18n/translations';

const { height: screenHeight } = Dimensions.get('window');

interface NotificationFilterOptions {
  priority: ('low' | 'medium' | 'high' | 'critical')[];
  type: ('medication' | 'adherence_check' | 'emergency' | 'family_alert')[];
  timeRange: 'today' | 'week' | 'month' | 'all';
  language: SupportedLanguage | 'all';
  deliveryMethod: ('push' | 'sms' | 'voice' | 'visual')[];
}

interface NotificationStats {
  total: number;
  unread: number;
  byPriority: Record<string, number>;
  byType: Record<string, number>;
  byDeliveryMethod: Record<string, number>;
}

interface NotificationCenterProps {
  notifications: CulturalNotificationData[];
  onNotificationTap?: (notification: CulturalNotificationData) => void;
  onNotificationDismiss?: (notification: CulturalNotificationData) => void;
  onNotificationAction?: (notification: CulturalNotificationData, action: NotificationAction) => void;
  onClearAll?: () => void;
  onRefresh?: () => Promise<void>;
  showStats?: boolean;
  showFilters?: boolean;
  initialFilter?: Partial<NotificationFilterOptions>;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  notifications = [],
  onNotificationTap,
  onNotificationDismiss,
  onNotificationAction,
  onClearAll,
  onRefresh,
  showStats = true,
  showFilters = true,
  initialFilter = {}
}) => {
  const { theme, isElderlyMode } = useCulturalTheme();
  const { currentLanguage, t } = useTranslation();
  
  const [refreshing, setRefreshing] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<NotificationFilterOptions>({
    priority: ['low', 'medium', 'high', 'critical'],
    type: ['medication', 'adherence_check', 'emergency', 'family_alert'],
    timeRange: 'week',
    language: 'all',
    deliveryMethod: ['push', 'sms', 'voice', 'visual'],
    ...initialFilter
  });
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [expandedNotifications, setExpandedNotifications] = useState(new Set<string>());

  // Animation values
  const fadeAnim = React.useRef(new Animated.Value(1)).current;

  // Filter notifications based on current filters
  const filteredNotifications = useMemo(() => {
    return notifications.filter(notification => {
      // Priority filter
      if (!selectedFilter.priority.includes(notification.priority)) {
        return false;
      }

      // Type filter
      if (!selectedFilter.type.includes(notification.reminderType)) {
        return false;
      }

      // Language filter
      if (selectedFilter.language !== 'all' && notification.language !== selectedFilter.language) {
        return false;
      }

      // Time range filter
      const now = new Date();
      const notificationDate = notification.timestamp;
      
      switch (selectedFilter.timeRange) {
        case 'today':
          return notificationDate.toDateString() === now.toDateString();
        case 'week':
          const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          return notificationDate >= weekAgo;
        case 'month':
          const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          return notificationDate >= monthAgo;
        case 'all':
          return true;
        default:
          return true;
      }
    });
  }, [notifications, selectedFilter]);

  // Calculate notification statistics
  const notificationStats = useMemo((): NotificationStats => {
    const stats: NotificationStats = {
      total: filteredNotifications.length,
      unread: filteredNotifications.filter(n => !n.metadata?.read).length,
      byPriority: {},
      byType: {},
      byDeliveryMethod: {}
    };

    filteredNotifications.forEach(notification => {
      // Priority stats
      stats.byPriority[notification.priority] = (stats.byPriority[notification.priority] || 0) + 1;
      
      // Type stats
      stats.byType[notification.reminderType] = (stats.byType[notification.reminderType] || 0) + 1;
      
      // Delivery method stats (mock data - would come from actual delivery records)
      const deliveryMethods = notification.metadata?.deliveryMethods || ['push'];
      deliveryMethods.forEach((method: string) => {
        stats.byDeliveryMethod[method] = (stats.byDeliveryMethod[method] || 0) + 1;
      });
    });

    return stats;
  }, [filteredNotifications]);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await onRefresh?.();
    } finally {
      setRefreshing(false);
    }
  }, [onRefresh]);

  // Handle notification tap
  const handleNotificationTap = useCallback((notification: CulturalNotificationData) => {
    // Toggle expanded state for long notifications
    if (notification.body.length > 100) {
      setExpandedNotifications(prev => {
        const newSet = new Set(prev);
        if (newSet.has(notification.id)) {
          newSet.delete(notification.id);
        } else {
          newSet.add(notification.id);
        }
        return newSet;
      });
    }
    
    onNotificationTap?.(notification);
  }, [onNotificationTap]);

  // Handle notification dismiss with animation
  const handleNotificationDismiss = useCallback((notification: CulturalNotificationData) => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onNotificationDismiss?.(notification);
      fadeAnim.setValue(1);
    });
  }, [onNotificationDismiss, fadeAnim]);

  // Get priority indicator color
  const getPriorityColor = (priority: string) => {
    const colors = {
      low: theme.colors.textSecondary,
      medium: theme.colors.info,
      high: theme.colors.warning,
      critical: theme.colors.error
    };
    return colors[priority as keyof typeof colors] || theme.colors.textSecondary;
  };

  // Get delivery method icon
  const getDeliveryMethodIcon = (method: string): keyof typeof Ionicons.glyphMap => {
    const icons = {
      push: 'notifications',
      sms: 'chatbox-ellipses',
      voice: 'volume-high',
      visual: 'eye'
    };
    return icons[method as keyof typeof icons] || 'notifications';
  };

  // Render notification with cultural adaptations
  const renderNotification = ({ item, index }: { item: CulturalNotificationData; index: number }) => {
    const isExpanded = expandedNotifications.has(item.id);
    const truncatedBody = item.body.length > 100 && !isExpanded 
      ? item.body.substring(0, 100) + '...'
      : item.body;

    // Create culturally appropriate action buttons
    const actionButtons: NotificationAction[] = [];

    if (item.reminderType === 'medication') {
      actionButtons.push({
        id: 'take_medication',
        label: 'Taken',
        labelTranslations: {
          en: 'Taken',
          ms: 'Diambil',
          zh: '已服用',
          ta: 'எடுத்தேன்'
        },
        action: () => console.log('Medication taken'),
        style: 'success',
        icon: 'checkmark-circle'
      });

      actionButtons.push({
        id: 'snooze',
        label: 'Snooze',
        labelTranslations: {
          en: 'Snooze',
          ms: 'Tunda',
          zh: '暂停',
          ta: 'தாமதம்'
        },
        action: () => console.log('Snoozed'),
        style: 'secondary',
        icon: 'time'
      });
    } else if (item.reminderType === 'emergency') {
      actionButtons.push({
        id: 'confirm_safe',
        label: "I'm Safe",
        labelTranslations: {
          en: "I'm Safe",
          ms: 'Saya Selamat',
          zh: '我安全',
          ta: 'நான் பாதுகாப்பானவன்'
        },
        action: () => console.log('Confirmed safe'),
        style: 'success',
        icon: 'shield-checkmark'
      });

      actionButtons.push({
        id: 'need_help',
        label: 'Need Help',
        labelTranslations: {
          en: 'Need Help',
          ms: 'Perlukan Bantuan',
          zh: '需要帮助',
          ta: 'உதவி வேண்டும்'
        },
        action: () => console.log('Help requested'),
        style: 'danger',
        icon: 'medical'
      });
    }

    const adaptedNotification: CulturalNotificationData = {
      ...item,
      body: truncatedBody,
      actionButtons
    };

    return (
      <View style={{ marginBottom: 8 }}>
        <CulturalNotificationCard
          notification={adaptedNotification}
          onTap={handleNotificationTap}
          onDismiss={handleNotificationDismiss}
          onAction={onNotificationAction}
        />
        
        {/* Delivery methods indicator */}
        <View style={[styles.deliveryIndicator, { backgroundColor: theme.colors.surface }]}>
          {(item.metadata?.deliveryMethods || ['push']).map((method: string) => (
            <View key={method} style={styles.deliveryMethodBadge}>
              <Ionicons
                name={getDeliveryMethodIcon(method)}
                size={12}
                color={theme.colors.textSecondary}
              />
            </View>
          ))}
        </View>
      </View>
    );
  };

  // Render statistics header
  const renderStatsHeader = () => {
    if (!showStats) return null;

    return (
      <View style={[styles.statsContainer, { backgroundColor: theme.colors.surface }]}>
        <Text style={[
          styles.statsTitle,
          {
            color: theme.colors.text,
            fontSize: isElderlyMode ? 18 : 16,
            fontFamily: theme.fonts.display,
            marginBottom: theme.spacing.sm
          }
        ]}>
          {currentLanguage === 'ms' ? 'Statistik Notifikasi' :
           currentLanguage === 'zh' ? '通知统计' :
           currentLanguage === 'ta' ? 'அறிவிப்பு புள்ளிவிவரங்கள்' :
           'Notification Statistics'}
        </Text>
        
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: theme.colors.primary }]}>
              {notificationStats.total}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              {currentLanguage === 'ms' ? 'Jumlah' :
               currentLanguage === 'zh' ? '总计' :
               currentLanguage === 'ta' ? 'மொத்தம்' :
               'Total'}
            </Text>
          </View>
          
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: theme.colors.warning }]}>
              {notificationStats.unread}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              {currentLanguage === 'ms' ? 'Belum Baca' :
               currentLanguage === 'zh' ? '未读' :
               currentLanguage === 'ta' ? 'படிக்கவில்லை' :
               'Unread'}
            </Text>
          </View>

          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: theme.colors.error }]}>
              {notificationStats.byPriority.critical || 0}
            </Text>
            <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
              {currentLanguage === 'ms' ? 'Kritikal' :
               currentLanguage === 'zh' ? '紧急' :
               currentLanguage === 'ta' ? 'அவசரம்' :
               'Critical'}
            </Text>
          </View>
        </View>

        {/* Delivery method distribution */}
        <View style={styles.deliveryMethodStats}>
          {Object.entries(notificationStats.byDeliveryMethod).map(([method, count]) => (
            <View key={method} style={styles.deliveryMethodStat}>
              <Ionicons
                name={getDeliveryMethodIcon(method)}
                size={16}
                color={theme.colors.primary}
              />
              <Text style={[styles.deliveryMethodCount, { color: theme.colors.text }]}>
                {count}
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  // Render filter controls
  const renderFilterControls = () => {
    if (!showFilters) return null;

    return (
      <View style={[styles.filterContainer, { backgroundColor: theme.colors.surface }]}>
        <TouchableOpacity
          onPress={() => setShowFilterModal(true)}
          style={[
            styles.filterButton,
            {
              backgroundColor: theme.colors.primary + '20',
              borderColor: theme.colors.primary,
              borderRadius: theme.borderRadius.md
            }
          ]}
        >
          <Ionicons
            name="filter"
            size={16}
            color={theme.colors.primary}
          />
          <Text style={[
            styles.filterButtonText,
            {
              color: theme.colors.primary,
              fontFamily: theme.fonts.primary
            }
          ]}>
            {currentLanguage === 'ms' ? 'Tapis' :
             currentLanguage === 'zh' ? '筛选' :
             currentLanguage === 'ta' ? 'வடிகட்டு' :
             'Filter'}
          </Text>
        </TouchableOpacity>

        {onClearAll && (
          <TouchableOpacity
            onPress={onClearAll}
            style={[
              styles.clearAllButton,
              {
                backgroundColor: theme.colors.error + '20',
                borderColor: theme.colors.error,
                borderRadius: theme.borderRadius.md
              }
            ]}
          >
            <Ionicons
              name="trash"
              size={16}
              color={theme.colors.error}
            />
            <Text style={[
              styles.clearAllButtonText,
              {
                color: theme.colors.error,
                fontFamily: theme.fonts.primary
              }
            ]}>
              {currentLanguage === 'ms' ? 'Padam Semua' :
               currentLanguage === 'zh' ? '清除全部' :
               currentLanguage === 'ta' ? 'அனைத்தையும் அழிக்கவும்' :
               'Clear All'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // Render empty state
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Ionicons
        name="notifications-off"
        size={64}
        color={theme.colors.textSecondary}
      />
      <Text style={[
        styles.emptyStateText,
        {
          color: theme.colors.textSecondary,
          fontSize: isElderlyMode ? 18 : 16,
          fontFamily: theme.fonts.primary,
          marginTop: theme.spacing.lg,
          textAlign: 'center'
        }
      ]}>
        {currentLanguage === 'ms' ? 'Tiada notifikasi' :
         currentLanguage === 'zh' ? '暂无通知' :
         currentLanguage === 'ta' ? 'அறிவிப்புகள் இல்லை' :
         'No notifications'}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {renderStatsHeader()}
      {renderFilterControls()}
      
      <FlatList
        data={filteredNotifications}
        renderItem={renderNotification}
        keyExtractor={(item) => item.id}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={theme.colors.primary}
              colors={[theme.colors.primary]}
            />
          ) : undefined
        }
        contentContainerStyle={[
          styles.listContainer,
          filteredNotifications.length === 0 && styles.emptyListContainer
        ]}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={renderEmptyState}
      />

      {/* Filter Modal - Simplified for brevity */}
      <Modal
        visible={showFilterModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.colors.background }]}>
          <Text style={[
            styles.modalTitle,
            { color: theme.colors.text, fontFamily: theme.fonts.display }
          ]}>
            {currentLanguage === 'ms' ? 'Penapis Notifikasi' :
             currentLanguage === 'zh' ? '通知筛选器' :
             currentLanguage === 'ta' ? 'அறிவிப்பு வடிப்பான்' :
             'Notification Filters'}
          </Text>
          
          <TouchableOpacity
            onPress={() => setShowFilterModal(false)}
            style={[
              styles.closeModalButton,
              {
                backgroundColor: theme.colors.primary,
                borderRadius: theme.borderRadius.md
              }
            ]}
          >
            <Text style={[
              styles.closeModalButtonText,
              { color: theme.colors.surface, fontFamily: theme.fonts.primary }
            ]}>
              {currentLanguage === 'ms' ? 'Tutup' :
               currentLanguage === 'zh' ? '关闭' :
               currentLanguage === 'ta' ? 'மூடு' :
               'Close'}
            </Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statsContainer: {
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  deliveryMethodStats: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  deliveryMethodStat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  deliveryMethodCount: {
    fontSize: 14,
    fontWeight: '500',
  },
  filterContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 12,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    gap: 8,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  clearAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    gap: 8,
  },
  clearAllButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  listContainer: {
    paddingVertical: 16,
  },
  emptyListContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyStateText: {
    textAlign: 'center',
    lineHeight: 24,
  },
  deliveryIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginHorizontal: 16,
    marginTop: -8,
    marginBottom: 8,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    gap: 8,
  },
  deliveryMethodBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  modalContainer: {
    flex: 1,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  closeModalButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    alignSelf: 'center',
    marginTop: 'auto',
  },
  closeModalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default NotificationCenter;