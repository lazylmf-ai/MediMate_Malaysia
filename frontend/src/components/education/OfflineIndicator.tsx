/**
 * Offline Indicator Component
 *
 * Badge/pill UI element showing online/offline status with:
 * - Uses NetInfo for network detection (via syncUtils.isOnline())
 * - Shows sync queue count when offline
 * - Auto-updates when network state changes
 * - Multi-language support
 * - Color-coded (green for online, red for offline)
 * - Real-time updates
 */

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { backgroundSyncService } from '@/services/backgroundSyncService';
import { COLORS, TYPOGRAPHY } from '@/constants/config';

interface OfflineIndicatorProps {
  language?: 'ms' | 'en' | 'zh' | 'ta';
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  language = 'en',
}) => {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    // Check initial network status
    checkNetworkStatus();

    // Subscribe to network changes
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(state.isConnected ?? false);

      // Update pending count when network state changes
      if (state.isConnected) {
        updatePendingCount();
      }
    });

    // Update pending count on mount
    updatePendingCount();

    // Set up interval to update pending count every 10 seconds when offline
    const interval = setInterval(() => {
      if (!isOnline) {
        updatePendingCount();
      }
    }, 10000);

    // Cleanup
    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [isOnline]);

  const checkNetworkStatus = async () => {
    try {
      const state = await NetInfo.fetch();
      setIsOnline(state.isConnected ?? false);
    } catch (error) {
      console.error('[OfflineIndicator] Failed to check network status:', error);
      setIsOnline(false);
    }
  };

  const updatePendingCount = async () => {
    try {
      const queueStatus = await backgroundSyncService.getQueueStatus();
      setPendingCount(queueStatus.total);
    } catch (error) {
      console.error('[OfflineIndicator] Failed to get queue status:', error);
      setPendingCount(0);
    }
  };

  // Multi-language text functions
  const getOnlineText = () => {
    switch (language) {
      case 'ms':
        return 'Dalam talian';
      case 'zh':
        return '在线';
      case 'ta':
        return 'ஆன்லைன்';
      default:
        return 'Online';
    }
  };

  const getOfflineText = () => {
    switch (language) {
      case 'ms':
        return 'Luar talian';
      case 'zh':
        return '离线';
      case 'ta':
        return 'ஆஃப்லைன்';
      default:
        return 'Offline';
    }
  };

  const getPendingText = () => {
    switch (language) {
      case 'ms':
        return 'menunggu';
      case 'zh':
        return '待处理';
      case 'ta':
        return 'நிலுவையில்';
      default:
        return 'pending';
    }
  };

  // Determine display text
  const getDisplayText = () => {
    if (isOnline) {
      return getOnlineText();
    } else {
      if (pendingCount > 0) {
        return `${getOfflineText()} (${pendingCount} ${getPendingText()})`;
      }
      return getOfflineText();
    }
  };

  return (
    <View
      style={[
        styles.container,
        isOnline ? styles.containerOnline : styles.containerOffline,
      ]}
    >
      <Icon
        name={isOnline ? 'cloud-done' : 'cloud-off'}
        size={16}
        color={COLORS.white}
        style={styles.icon}
      />
      <Text style={styles.text}>{getDisplayText()}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  containerOnline: {
    backgroundColor: COLORS.success,
  },
  containerOffline: {
    backgroundColor: COLORS.error,
  },
  icon: {
    marginRight: 6,
  },
  text: {
    fontSize: TYPOGRAPHY.fontSizes.sm,
    fontWeight: TYPOGRAPHY.fontWeights.medium,
    color: COLORS.white,
  },
});
