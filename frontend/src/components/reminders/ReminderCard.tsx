/**
 * Reminder Card Component
 *
 * Individual reminder display card with:
 * - Medication information
 * - Cultural-aware time formatting
 * - Multi-language support
 * - Action buttons (acknowledge, snooze)
 * - Visual priority indicators
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY } from '@/constants/config';

interface ReminderCardProps {
  reminder: {
    id: string;
    medicationId: string;
    medicationName: string;
    scheduledTime: string;
    status: 'pending' | 'sent' | 'acknowledged' | 'snoozed' | 'missed';
    snoozeCount: number;
  };
  onAcknowledge: () => void;
  onSnooze: () => void;
  language: 'en' | 'ms' | 'zh' | 'ta';
  isMissed?: boolean;
}

export const ReminderCard: React.FC<ReminderCardProps> = ({
  reminder,
  onAcknowledge,
  onSnooze,
  language,
  isMissed = false,
}) => {
  // Get localized text
  const getLocalizedText = (key: string, defaultText: string): string => {
    const translations: Record<string, Record<string, string>> = {
      en: {
        takeNow: 'Take Now',
        snooze: 'Snooze',
        taken: 'Taken',
        missed: 'Missed',
        snoozed: 'Snoozed',
        ago: 'ago',
        at: 'at',
        minutes: 'minutes',
        hour: 'hour',
        hours: 'hours',
        day: 'day',
        days: 'days',
        timesLeft: 'times left',
        maxSnoozed: 'Max snoozed',
      },
      ms: {
        takeNow: 'Ambil Sekarang',
        snooze: 'Tunda',
        taken: 'Telah Diambil',
        missed: 'Terlepas',
        snoozed: 'Ditunda',
        ago: 'yang lalu',
        at: 'pada',
        minutes: 'minit',
        hour: 'jam',
        hours: 'jam',
        day: 'hari',
        days: 'hari',
        timesLeft: 'kali lagi',
        maxSnoozed: 'Maksimum ditunda',
      },
      zh: {
        takeNow: '现在服用',
        snooze: '延迟',
        taken: '已服用',
        missed: '错过',
        snoozed: '已延迟',
        ago: '前',
        at: '在',
        minutes: '分钟',
        hour: '小时',
        hours: '小时',
        day: '天',
        days: '天',
        timesLeft: '次剩余',
        maxSnoozed: '最大延迟',
      },
      ta: {
        takeNow: 'இப்போது எடு',
        snooze: 'ஒத்திவை',
        taken: 'எடுக்கப்பட்டது',
        missed: 'தவறவிட்டது',
        snoozed: 'ஒத்திவைக்கப்பட்டது',
        ago: 'முன்பு',
        at: 'இல்',
        minutes: 'நிமிடங்கள்',
        hour: 'மணி',
        hours: 'மணி',
        day: 'நாள்',
        days: 'நாட்கள்',
        timesLeft: 'முறை மீதம்',
        maxSnoozed: 'அதிகபட்ச ஒத்திவைப்பு',
      },
    };

    return translations[language]?.[key] || defaultText;
  };

  // Format time for display
  const formatTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    // Format time based on language
    const timeOptions: Intl.DateTimeFormatOptions = {
      hour: '2-digit',
      minute: '2-digit',
      hour12: language === 'en',
    };

    const timeString = date.toLocaleTimeString(
      language === 'ms' ? 'ms-MY' :
      language === 'zh' ? 'zh-CN' :
      language === 'ta' ? 'ta-IN' : 'en-US',
      timeOptions
    );

    // If it's today, show relative time
    if (diffDays === 0) {
      if (diffMinutes < 60) {
        if (diffMinutes <= 0) {
          return timeString;
        }
        return `${diffMinutes} ${getLocalizedText('minutes', 'minutes')} ${getLocalizedText('ago', 'ago')}`;
      } else if (diffHours < 24) {
        return `${diffHours} ${diffHours === 1 ? getLocalizedText('hour', 'hour') : getLocalizedText('hours', 'hours')} ${getLocalizedText('ago', 'ago')}`;
      }
    }

    // For other days, show date and time
    const dateString = date.toLocaleDateString(
      language === 'ms' ? 'ms-MY' :
      language === 'zh' ? 'zh-CN' :
      language === 'ta' ? 'ta-IN' : 'en-US'
    );

    return `${dateString} ${getLocalizedText('at', 'at')} ${timeString}`;
  };

  // Get card style based on status
  const getCardStyle = () => {
    const baseStyle = [styles.card];

    switch (reminder.status) {
      case 'missed':
        return [...baseStyle, styles.missedCard];
      case 'snoozed':
        return [...baseStyle, styles.snoozedCard];
      case 'acknowledged':
        return [...baseStyle, styles.acknowledgedCard];
      default:
        return [...baseStyle, isMissed && styles.missedCard].filter(Boolean);
    }
  };

  // Get status icon and color
  const getStatusDisplay = () => {
    switch (reminder.status) {
      case 'missed':
        return {
          icon: 'alert-circle',
          color: COLORS.error,
          text: getLocalizedText('missed', 'Missed'),
        };
      case 'snoozed':
        return {
          icon: 'time',
          color: COLORS.warning,
          text: getLocalizedText('snoozed', 'Snoozed'),
        };
      case 'acknowledged':
        return {
          icon: 'checkmark-circle',
          color: COLORS.success,
          text: getLocalizedText('taken', 'Taken'),
        };
      default:
        return {
          icon: 'notifications',
          color: COLORS.primary,
          text: 'Pending',
        };
    }
  };

  const statusDisplay = getStatusDisplay();
  const maxSnoozeCount = 3; // This should come from settings
  const canSnooze = reminder.snoozeCount < maxSnoozeCount && reminder.status !== 'acknowledged';

  return (
    <View style={getCardStyle()}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.medicationInfo}>
          <Text style={styles.medicationName} numberOfLines={1}>
            {reminder.medicationName}
          </Text>
          <Text style={styles.timeText}>
            {formatTime(reminder.scheduledTime)}
          </Text>
        </View>

        <View style={styles.statusContainer}>
          <Ionicons
            name={statusDisplay.icon as any}
            size={20}
            color={statusDisplay.color}
          />
          <Text style={[styles.statusText, { color: statusDisplay.color }]}>
            {statusDisplay.text}
          </Text>
        </View>
      </View>

      {/* Snooze information */}
      {reminder.snoozeCount > 0 && (
        <View style={styles.snoozeInfo}>
          <Ionicons name="time" size={14} color={COLORS.warning} />
          <Text style={styles.snoozeText}>
            {reminder.snoozeCount} / {maxSnoozeCount} {getLocalizedText('timesLeft', 'times left')}
          </Text>
        </View>
      )}

      {/* Actions */}
      {reminder.status === 'pending' || (isMissed && reminder.status !== 'acknowledged') ? (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.primaryAction]}
            onPress={onAcknowledge}
            activeOpacity={0.7}
          >
            <Ionicons name="checkmark" size={18} color={COLORS.white} />
            <Text style={styles.primaryActionText}>
              {getLocalizedText('takeNow', 'Take Now')}
            </Text>
          </TouchableOpacity>

          {canSnooze && (
            <TouchableOpacity
              style={[styles.actionButton, styles.secondaryAction]}
              onPress={onSnooze}
              activeOpacity={0.7}
            >
              <Ionicons name="time" size={18} color={COLORS.primary} />
              <Text style={styles.secondaryActionText}>
                {getLocalizedText('snooze', 'Snooze')}
              </Text>
            </TouchableOpacity>
          )}

          {!canSnooze && reminder.snoozeCount >= maxSnoozeCount && (
            <View style={styles.maxSnoozeIndicator}>
              <Text style={styles.maxSnoozeText}>
                {getLocalizedText('maxSnoozed', 'Max snoozed')}
              </Text>
            </View>
          )}
        </View>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  missedCard: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.error,
    backgroundColor: '#FFF5F5',
  },
  snoozedCard: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.warning,
    backgroundColor: '#FFFBF0',
  },
  acknowledgedCard: {
    borderLeftWidth: 4,
    borderLeftColor: COLORS.success,
    backgroundColor: '#F0FDF4',
    opacity: 0.7,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  medicationInfo: {
    flex: 1,
    marginRight: 12,
  },
  medicationName: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.text,
    marginBottom: 4,
  },
  timeText: {
    fontSize: 14,
    color: COLORS.textLight,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
  },
  snoozeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#FFF3CD',
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  snoozeText: {
    fontSize: 12,
    color: COLORS.warning,
    marginLeft: 4,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginRight: 8,
    minWidth: 100,
  },
  primaryAction: {
    backgroundColor: COLORS.primary,
    flex: 1,
  },
  secondaryAction: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.primary,
    flex: 1,
  },
  primaryActionText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  secondaryActionText: {
    color: COLORS.primary,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  maxSnoozeIndicator: {
    padding: 8,
    backgroundColor: COLORS.lightGray,
    borderRadius: 6,
    alignSelf: 'center',
  },
  maxSnoozeText: {
    fontSize: 12,
    color: COLORS.textLight,
    fontStyle: 'italic',
  },
});