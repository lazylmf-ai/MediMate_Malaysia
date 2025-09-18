/**
 * Family Activity Feed Component
 *
 * Displays chronological family health activities with cultural timestamps,
 * member avatars, and activity filtering. Optimized for Malaysian family
 * interaction patterns with prayer time and cultural event awareness.
 */

import React, { useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useCulturalTheme, useCulturalStyles } from '@/components/language/ui/CulturalThemeProvider';
import { useTranslation } from '@/i18n/hooks/useTranslation';
import {
  FamilyActivityFeedProps,
  FamilyActivityLog,
  FamilyActionType,
} from '@/types/family';

const { width: screenWidth } = Dimensions.get('window');

interface ProcessedActivity extends FamilyActivityLog {
  displayIcon: string;
  displayColor: string;
  displayTitle: string;
  displayMessage: string;
  relativeTime: string;
  priority: 'low' | 'medium' | 'high';
  culturallySignificant: boolean;
}

export const FamilyActivityFeed: React.FC<FamilyActivityFeedProps> = ({
  activities,
  onActivityPress,
  maxActivities = 20,
  showAvatars = true,
  compactMode = false,
  filterByType,
}) => {
  const { t } = useTranslation();
  const { currentTheme } = useCulturalTheme();
  const culturalStyles = useCulturalStyles();

  // Activity type configurations
  const activityConfig = useMemo(() => ({
    medication_taken: {
      icon: '💊',
      color: '#10B981',
      priority: 'low' as const,
      cultural: false,
    },
    medication_missed: {
      icon: '⚠️',
      color: '#F59E0B',
      priority: 'medium' as const,
      cultural: false,
    },
    emergency_triggered: {
      icon: '🚨',
      color: '#EF4444',
      priority: 'high' as const,
      cultural: false,
    },
    joined_family: {
      icon: '👋',
      color: '#3B82F6',
      priority: 'medium' as const,
      cultural: true,
    },
    left_family: {
      icon: '👋',
      color: '#6B7280',
      priority: 'medium' as const,
      cultural: true,
    },
    settings_updated: {
      icon: '⚙️',
      color: '#8B5CF6',
      priority: 'low' as const,
      cultural: false,
    },
    member_invited: {
      icon: '✉️',
      color: '#06B6D4',
      priority: 'low' as const,
      cultural: true,
    },
    invitation_accepted: {
      icon: '✅',
      color: '#10B981',
      priority: 'medium' as const,
      cultural: true,
    },
    permission_changed: {
      icon: '🔐',
      color: '#F59E0B',
      priority: 'medium' as const,
      cultural: false,
    },
    privacy_updated: {
      icon: '🛡️',
      color: '#8B5CF6',
      priority: 'low' as const,
      cultural: false,
    },
  }), []);

  // Process activities with cultural context
  const processedActivities = useMemo((): ProcessedActivity[] => {
    let filteredActivities = activities;

    // Apply type filter if specified
    if (filterByType && filterByType.length > 0) {
      filteredActivities = activities.filter(activity =>
        filterByType.includes(activity.actionType)
      );
    }

    // Limit to max activities
    filteredActivities = filteredActivities.slice(0, maxActivities);

    return filteredActivities.map(activity => {
      const config = activityConfig[activity.actionType] || {
        icon: '📝',
        color: '#6B7280',
        priority: 'low' as const,
        cultural: false,
      };

      // Generate display title and message
      const displayTitle = t(`activity.${activity.actionType}.title`);
      const displayMessage = activity.actionDescription ||
        t(`activity.${activity.actionType}.description`, {
          user: activity.userId,
          resource: activity.resourceId,
        });

      // Calculate relative time with cultural awareness
      const relativeTime = formatRelativeTime(activity.createdAt);

      return {
        ...activity,
        displayIcon: config.icon,
        displayColor: config.color,
        displayTitle,
        displayMessage,
        relativeTime,
        priority: config.priority,
        culturallySignificant: config.cultural,
      };
    });
  }, [activities, filterByType, maxActivities, activityConfig, t]);

  // Format relative time with Malaysian cultural context
  const formatRelativeTime = useCallback((date: Date) => {
    const now = new Date();
    const activityTime = new Date(date);
    const diffMinutes = Math.floor((now.getTime() - activityTime.getTime()) / (1000 * 60));

    if (diffMinutes < 1) return t('activity.time.now');
    if (diffMinutes < 60) return t('activity.time.minutes', { minutes: diffMinutes });

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) {
      // Check if it's during prayer time (cultural context)
      const hour = activityTime.getHours();
      if (hour >= 5 && hour <= 6) return t('activity.time.fajr');
      if (hour >= 12 && hour <= 13) return t('activity.time.dhuhr');
      if (hour >= 15 && hour <= 16) return t('activity.time.asr');
      if (hour >= 18 && hour <= 19) return t('activity.time.maghrib');
      if (hour >= 19 && hour <= 21) return t('activity.time.isha');

      return t('activity.time.hours', { hours: diffHours });
    }

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return t('activity.time.days', { days: diffDays });

    return activityTime.toLocaleDateString();
  }, [t]);

  // Handle activity press
  const handleActivityPress = useCallback((activity: ProcessedActivity) => {
    onActivityPress?.(activity);
  }, [onActivityPress]);

  // Generate avatar for user
  const generateUserAvatar = useCallback((userId: string) => {
    // Simple avatar generation based on user ID
    const avatarEmojis = ['👤', '👨', '👩', '👴', '👵', '👦', '👧'];
    const index = userId.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0) % avatarEmojis.length;
    return avatarEmojis[index];
  }, []);

  // Render individual activity item
  const renderActivityItem = useCallback((activity: ProcessedActivity, index: number) => {
    const isFirst = index === 0;
    const isLast = index === processedActivities.length - 1;

    return (
      <View key={activity.id} style={styles.activityItemWrapper}>
        {/* Timeline Line */}
        <View style={styles.timelineContainer}>
          <View style={[
            styles.timelineIcon,
            { backgroundColor: activity.displayColor },
            activity.priority === 'high' && styles.highPriorityIcon,
          ]}>
            <Text style={styles.timelineIconText}>
              {activity.displayIcon}
            </Text>
          </View>

          {!isLast && (
            <View style={[
              styles.timelineLine,
              activity.culturallySignificant && styles.culturalLine,
            ]} />
          )}
        </View>

        {/* Activity Content */}
        <TouchableOpacity
          style={[
            styles.activityContent,
            compactMode && styles.compactContent,
            culturalStyles.cardBackground,
            activity.priority === 'high' && styles.highPriorityContent,
          ]}
          onPress={() => handleActivityPress(activity)}
          activeOpacity={0.7}
          accessibilityLabel={t('activity.accessibility.item', {
            title: activity.displayTitle,
            time: activity.relativeTime,
          })}
          accessibilityRole="button"
        >
          {/* Activity Header */}
          <View style={styles.activityHeader}>
            <View style={styles.activityTitle}>
              <Text style={[
                styles.titleText,
                culturalStyles.text,
                activity.priority === 'high' && styles.highPriorityText,
                compactMode && styles.compactTitleText,
              ]}>
                {activity.displayTitle}
              </Text>

              {activity.culturallySignificant && (
                <View style={styles.culturalBadge}>
                  <Text style={styles.culturalBadgeText}>
                    {t('activity.cultural.badge')}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.activityMeta}>
              <Text style={[
                styles.timeText,
                culturalStyles.subtleText,
                compactMode && styles.compactTimeText,
              ]}>
                {activity.relativeTime}
              </Text>

              {showAvatars && (
                <Text style={styles.userAvatar}>
                  {generateUserAvatar(activity.userId)}
                </Text>
              )}
            </View>
          </View>

          {/* Activity Message */}
          {!compactMode && (
            <Text style={[
              styles.messageText,
              culturalStyles.subtleText,
            ]} numberOfLines={2}>
              {activity.displayMessage}
            </Text>
          )}

          {/* Activity Context */}
          {activity.locationContext && Object.keys(activity.locationContext).length > 0 && (
            <View style={styles.contextContainer}>
              <Text style={[styles.contextText, culturalStyles.subtleText]}>
                📍 {activity.locationContext.city || t('activity.context.location')}
              </Text>
            </View>
          )}

          {/* Cultural Context */}
          {activity.culturalContext && Object.keys(activity.culturalContext).length > 0 && (
            <View style={styles.contextContainer}>
              <Text style={[styles.contextText, culturalStyles.subtleText]}>
                🏛️ {t('activity.context.cultural')}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
    );
  }, [
    processedActivities.length,
    compactMode,
    culturalStyles,
    showAvatars,
    handleActivityPress,
    generateUserAvatar,
    t,
  ]);

  // Group activities by date for better organization
  const groupedActivities = useMemo(() => {
    const groups: { date: string; activities: ProcessedActivity[] }[] = [];
    let currentDate = '';
    let currentGroup: ProcessedActivity[] = [];

    processedActivities.forEach(activity => {
      const activityDate = new Date(activity.createdAt).toDateString();

      if (activityDate !== currentDate) {
        if (currentGroup.length > 0) {
          groups.push({ date: currentDate, activities: currentGroup });
        }
        currentDate = activityDate;
        currentGroup = [activity];
      } else {
        currentGroup.push(activity);
      }
    });

    if (currentGroup.length > 0) {
      groups.push({ date: currentDate, activities: currentGroup });
    }

    return groups;
  }, [processedActivities]);

  // Render empty state
  if (processedActivities.length === 0) {
    return (
      <View style={[styles.emptyContainer, culturalStyles.cardBackground]}>
        <Text style={styles.emptyIcon}>📝</Text>
        <Text style={[styles.emptyTitle, culturalStyles.text]}>
          {filterByType && filterByType.length > 0
            ? t('activity.empty.filtered')
            : t('activity.empty.noActivity')
          }
        </Text>
        <Text style={[styles.emptySubtitle, culturalStyles.subtleText]}>
          {t('activity.empty.subtitle')}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
      >
        {compactMode ? (
          // Simple list for compact mode
          <View style={styles.activitiesList}>
            {processedActivities.map(renderActivityItem)}
          </View>
        ) : (
          // Grouped by date for full mode
          <View style={styles.activitiesList}>
            {groupedActivities.map(group => (
              <View key={group.date} style={styles.dateGroup}>
                <View style={styles.dateHeader}>
                  <Text style={[styles.dateText, culturalStyles.text]}>
                    {formatGroupDate(group.date)}
                  </Text>
                </View>
                {group.activities.map((activity, index) =>
                  renderActivityItem(activity, index)
                )}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );

  function formatGroupDate(dateString: string): string {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return t('activity.date.today');
    } else if (date.toDateString() === yesterday.toDateString()) {
      return t('activity.date.yesterday');
    } else {
      return date.toLocaleDateString();
    }
  }
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  activitiesList: {
    paddingBottom: 16,
  },
  dateGroup: {
    marginBottom: 16,
  },
  dateHeader: {
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    marginBottom: 8,
    marginHorizontal: 8,
  },
  dateText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  activityItemWrapper: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  timelineContainer: {
    alignItems: 'center',
    marginRight: 12,
    width: 24,
  },
  timelineIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  highPriorityIcon: {
    borderWidth: 2,
    borderColor: '#FFFFFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  timelineIconText: {
    fontSize: 12,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: '#E5E7EB',
    marginTop: 4,
  },
  culturalLine: {
    backgroundColor: '#3B82F6',
    width: 3,
  },
  activityContent: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  compactContent: {
    padding: 8,
  },
  highPriorityContent: {
    borderLeftWidth: 3,
    borderLeftColor: '#EF4444',
  },
  activityHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  activityTitle: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  titleText: {
    fontSize: 14,
    fontWeight: '600',
    marginRight: 8,
  },
  compactTitleText: {
    fontSize: 13,
  },
  highPriorityText: {
    color: '#EF4444',
  },
  culturalBadge: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  culturalBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  activityMeta: {
    alignItems: 'flex-end',
    gap: 4,
  },
  timeText: {
    fontSize: 12,
  },
  compactTimeText: {
    fontSize: 11,
  },
  userAvatar: {
    fontSize: 16,
  },
  messageText: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },
  contextContainer: {
    marginTop: 4,
  },
  contextText: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    borderRadius: 8,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
});

export default FamilyActivityFeed;