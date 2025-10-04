/**
 * Recent Activity List Component
 *
 * Timeline of recent learning activities (content viewed, quizzes completed).
 * Shows activity type, title, and timestamp.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS, TYPOGRAPHY } from '@/constants/config';

interface Activity {
  id: string;
  type: 'content' | 'quiz';
  title: string;
  timestamp: Date | string;
}

interface RecentActivityListProps {
  activities: Activity[];
  language?: 'ms' | 'en' | 'zh' | 'ta';
  maxItems?: number;
}

export const RecentActivityList: React.FC<RecentActivityListProps> = ({
  activities,
  language = 'en',
  maxItems = 10,
}) => {
  const getTitle = () => {
    switch (language) {
      case 'ms':
        return 'Aktiviti Terkini';
      case 'zh':
        return '最近活动';
      case 'ta':
        return 'சமீபத்திய செயல்பாடுகள்';
      default:
        return 'Recent Activity';
    }
  };

  const getEmptyMessage = () => {
    switch (language) {
      case 'ms':
        return 'Tiada aktiviti lagi';
      case 'zh':
        return '暂无活动';
      case 'ta':
        return 'இன்னும் செயல்பாடுகள் இல்லை';
      default:
        return 'No activities yet';
    }
  };

  const getActivityIcon = (type: string) => {
    return type === 'quiz' ? '📝' : '📖';
  };

  const formatTimestamp = (timestamp: Date | string) => {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) {
      return language === 'ms' ? `${diffMins} minit lalu` : language === 'zh' ? `${diffMins}分钟前` : language === 'ta' ? `${diffMins} நிமிடங்களுக்கு முன்` : `${diffMins} min ago`;
    } else if (diffHours < 24) {
      return language === 'ms' ? `${diffHours} jam lalu` : language === 'zh' ? `${diffHours}小时前` : language === 'ta' ? `${diffHours} மணிநேரங்களுக்கு முன்` : `${diffHours} hr ago`;
    } else {
      return language === 'ms' ? `${diffDays} hari lalu` : language === 'zh' ? `${diffDays}天前` : language === 'ta' ? `${diffDays} நாட்களுக்கு முன்` : `${diffDays} days ago`;
    }
  };

  const displayActivities = activities.slice(0, maxItems);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{getTitle()}</Text>

      {displayActivities.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{getEmptyMessage()}</Text>
        </View>
      ) : (
        <View style={styles.activityList}>
          {displayActivities.map((activity) => (
            <View key={activity.id} style={styles.activityItem}>
              <View style={styles.activityIcon}>
                <Text style={styles.iconText}>{getActivityIcon(activity.type)}</Text>
              </View>
              <View style={styles.activityContent}>
                <Text style={styles.activityTitle} numberOfLines={2}>
                  {activity.title}
                </Text>
                <Text style={styles.activityTime}>{formatTimestamp(activity.timestamp)}</Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSizes.lg,
    fontWeight: TYPOGRAPHY.fontWeights.bold,
    color: COLORS.gray[900],
    marginBottom: 16,
  },
  activityList: {
    gap: 12,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    backgroundColor: COLORS.white,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.gray[200],
  },
  activityIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.gray[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  iconText: {
    fontSize: 20,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: TYPOGRAPHY.fontSizes.base,
    fontWeight: TYPOGRAPHY.fontWeights.medium,
    color: COLORS.gray[900],
    marginBottom: 4,
  },
  activityTime: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    color: COLORS.gray[600],
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: TYPOGRAPHY.fontSizes.base,
    color: COLORS.gray[500],
  },
});
