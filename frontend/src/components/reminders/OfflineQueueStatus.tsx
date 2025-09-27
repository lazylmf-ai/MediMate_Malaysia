/**
 * Offline Queue Status Component
 *
 * Displays connection status and offline reminder queue information:
 * - Connection status indicator
 * - Offline queue count
 * - Cultural-aware status messages
 * - Auto-sync status
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '@/constants/config';

interface OfflineQueueStatusProps {
  isConnected: boolean;
  connectionType?: string;
  queuedReminders: number;
  language: 'en' | 'ms' | 'zh' | 'ta';
  onSyncPress?: () => void;
}

export const OfflineQueueStatus: React.FC<OfflineQueueStatusProps> = ({
  isConnected,
  connectionType,
  queuedReminders,
  language,
  onSyncPress,
}) => {
  const [syncAnimation] = useState(new Animated.Value(0));

  // Animate sync icon when syncing
  useEffect(() => {
    if (!isConnected && queuedReminders > 0) {
      // Start pulsing animation for offline mode
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(syncAnimation, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(syncAnimation, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();

      return () => pulse.stop();
    } else {
      syncAnimation.setValue(0);
    }
  }, [isConnected, queuedReminders, syncAnimation]);

  // Get localized text
  const getLocalizedText = (key: string, defaultText: string): string => {
    const translations: Record<string, Record<string, string>> = {
      en: {
        connected: 'Connected',
        offline: 'Offline',
        syncing: 'Syncing...',
        queuedReminders: 'queued reminders',
        queuedReminder: 'queued reminder',
        tapToSync: 'Tap to sync',
        allSynced: 'All synced',
        connectionWifi: 'WiFi',
        connectionCellular: 'Cellular',
        connectionEthernet: 'Ethernet',
        connectionBluetooth: 'Bluetooth',
        connectionNone: 'No connection',
        remindersOffline: 'Reminders work offline',
        syncWhenOnline: 'Will sync when online',
      },
      ms: {
        connected: 'Bersambung',
        offline: 'Luar Talian',
        syncing: 'Menyegerak...',
        queuedReminders: 'peringatan beratur',
        queuedReminder: 'peringatan beratur',
        tapToSync: 'Ketik untuk segerak',
        allSynced: 'Semua disegerak',
        connectionWifi: 'WiFi',
        connectionCellular: 'Selular',
        connectionEthernet: 'Ethernet',
        connectionBluetooth: 'Bluetooth',
        connectionNone: 'Tiada sambungan',
        remindersOffline: 'Peringatan berfungsi luar talian',
        syncWhenOnline: 'Akan disegerak bila dalam talian',
      },
      zh: {
        connected: '已连接',
        offline: '离线',
        syncing: '同步中...',
        queuedReminders: '排队提醒',
        queuedReminder: '排队提醒',
        tapToSync: '点击同步',
        allSynced: '全部已同步',
        connectionWifi: 'WiFi',
        connectionCellular: '蜂窝网络',
        connectionEthernet: '以太网',
        connectionBluetooth: '蓝牙',
        connectionNone: '无连接',
        remindersOffline: '提醒离线工作',
        syncWhenOnline: '在线时同步',
      },
      ta: {
        connected: 'இணைக்கப்பட்டுள்ளது',
        offline: 'ஆஃப்லைன்',
        syncing: 'ஒத்திசைக்கிறது...',
        queuedReminders: 'வரிசையில் உள்ள நினைவூட்டல்கள்',
        queuedReminder: 'வரிசையில் உள்ள நினைவூட்டல்',
        tapToSync: 'ஒத்திசைக்க தட்டவும்',
        allSynced: 'அனைத்தும் ஒத்திசைக்கப்பட்டது',
        connectionWifi: 'WiFi',
        connectionCellular: 'செல்லுலார்',
        connectionEthernet: 'ஈதர்நெட்',
        connectionBluetooth: 'ப்ளூடூத்',
        connectionNone: 'இணைப்பு இல்லை',
        remindersOffline: 'நினைவூட்டல்கள் ஆஃப்லைனில் வேலை செய்யும்',
        syncWhenOnline: 'ஆன்லைனில் இருக்கும்போது ஒத்திசைக்கும்',
      },
    };

    return translations[language]?.[key] || defaultText;
  };

  // Get connection icon
  const getConnectionIcon = (): string => {
    if (!isConnected) return 'cloud-offline';

    switch (connectionType?.toLowerCase()) {
      case 'wifi':
        return 'wifi';
      case 'cellular':
        return 'cellular';
      case 'ethernet':
        return 'link';
      case 'bluetooth':
        return 'bluetooth';
      default:
        return 'cloud-done';
    }
  };

  // Get connection color
  const getConnectionColor = (): string => {
    if (!isConnected) return COLORS.error;
    if (queuedReminders > 0) return COLORS.warning;
    return COLORS.success;
  };

  // Get status message
  const getStatusMessage = (): string => {
    if (!isConnected) {
      if (queuedReminders > 0) {
        const reminderText = queuedReminders === 1
          ? getLocalizedText('queuedReminder', 'queued reminder')
          : getLocalizedText('queuedReminders', 'queued reminders');
        return `${queuedReminders} ${reminderText}`;
      }
      return getLocalizedText('remindersOffline', 'Reminders work offline');
    }

    if (queuedReminders > 0) {
      return getLocalizedText('tapToSync', 'Tap to sync');
    }

    return getLocalizedText('allSynced', 'All synced');
  };

  const connectionColor = getConnectionColor();
  const connectionIcon = getConnectionIcon();
  const statusMessage = getStatusMessage();

  const animatedStyle = {
    opacity: syncAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [0.5, 1],
    }),
    transform: [
      {
        scale: syncAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 1.1],
        }),
      },
    ],
  };

  return (
    <TouchableOpacity
      style={[styles.container, { borderColor: connectionColor }]}
      onPress={onSyncPress}
      activeOpacity={0.7}
      disabled={!onSyncPress || (isConnected && queuedReminders === 0)}
    >
      <View style={styles.content}>
        <Animated.View style={!isConnected && queuedReminders > 0 ? animatedStyle : undefined}>
          <Ionicons
            name={connectionIcon as any}
            size={20}
            color={connectionColor}
          />
        </Animated.View>

        <View style={styles.textContainer}>
          <Text style={[styles.statusText, { color: connectionColor }]}>
            {isConnected ? getLocalizedText('connected', 'Connected') : getLocalizedText('offline', 'Offline')}
          </Text>
          <Text style={styles.messageText} numberOfLines={2}>
            {statusMessage}
          </Text>
        </View>

        {!isConnected && queuedReminders > 0 && (
          <View style={[styles.badge, { backgroundColor: connectionColor }]}>
            <Text style={styles.badgeText}>{queuedReminders}</Text>
          </View>
        )}
      </View>

      {/* Connection type indicator */}
      {isConnected && connectionType && (
        <Text style={styles.connectionType}>
          {getLocalizedText(`connection${connectionType.charAt(0).toUpperCase() + connectionType.slice(1)}`, connectionType)}
        </Text>
      )}

      {/* Helpful message for offline mode */}
      {!isConnected && (
        <Text style={styles.offlineMessage}>
          {getLocalizedText('syncWhenOnline', 'Will sync when online')}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    borderRadius: 8,
    borderWidth: 1,
    padding: 12,
    marginTop: 8,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
    marginLeft: 12,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  messageText: {
    fontSize: 12,
    color: COLORS.textLight,
    lineHeight: 16,
  },
  badge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  badgeText: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '600',
  },
  connectionType: {
    fontSize: 10,
    color: COLORS.textLight,
    marginTop: 4,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  offlineMessage: {
    fontSize: 10,
    color: COLORS.textLight,
    marginTop: 4,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});