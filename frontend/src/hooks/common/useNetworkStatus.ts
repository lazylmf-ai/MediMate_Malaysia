/**
 * Network Status Hook
 *
 * Hook for monitoring network connectivity status:
 * - Connection state monitoring
 * - Connection type detection
 * - Offline queue management awareness
 * - Cultural-aware network messaging
 */

import { useState, useEffect, useCallback } from 'react';
import NetInfo, { NetInfoState, NetInfoStateType } from '@react-native-community/netinfo';

interface NetworkStatus {
  isConnected: boolean;
  connectionType: string;
  isInternetReachable: boolean | null;
  lastConnectedAt: Date | null;
  offlineDuration: number; // in milliseconds
}

export const useNetworkStatus = () => {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus>({
    isConnected: true,
    connectionType: 'unknown',
    isInternetReachable: null,
    lastConnectedAt: null,
    offlineDuration: 0,
  });

  const [offlineStartTime, setOfflineStartTime] = useState<Date | null>(null);

  // Update network status
  const updateNetworkStatus = useCallback((state: NetInfoState) => {
    const isConnected = state.isConnected && state.isInternetReachable !== false;
    const connectionType = getConnectionTypeString(state.type);

    setNetworkStatus(prev => {
      const now = new Date();

      // If going from offline to online
      if (!prev.isConnected && isConnected) {
        setOfflineStartTime(null);
        return {
          ...prev,
          isConnected,
          connectionType,
          isInternetReachable: state.isInternetReachable,
          lastConnectedAt: now,
          offlineDuration: 0,
        };
      }

      // If going from online to offline
      if (prev.isConnected && !isConnected) {
        setOfflineStartTime(now);
        return {
          ...prev,
          isConnected,
          connectionType,
          isInternetReachable: state.isInternetReachable,
        };
      }

      // Update offline duration if currently offline
      let offlineDuration = prev.offlineDuration;
      if (!isConnected && offlineStartTime) {
        offlineDuration = now.getTime() - offlineStartTime.getTime();
      }

      return {
        ...prev,
        isConnected,
        connectionType,
        isInternetReachable: state.isInternetReachable,
        offlineDuration,
      };
    });
  }, [offlineStartTime]);

  // Initialize network monitoring
  useEffect(() => {
    // Get initial state
    NetInfo.fetch().then(updateNetworkStatus);

    // Subscribe to network state changes
    const unsubscribe = NetInfo.addEventListener(updateNetworkStatus);

    return () => {
      unsubscribe();
    };
  }, [updateNetworkStatus]);

  // Update offline duration periodically when offline
  useEffect(() => {
    if (!networkStatus.isConnected && offlineStartTime) {
      const interval = setInterval(() => {
        const now = new Date();
        const duration = now.getTime() - offlineStartTime.getTime();

        setNetworkStatus(prev => ({
          ...prev,
          offlineDuration: duration,
        }));
      }, 1000); // Update every second

      return () => clearInterval(interval);
    }
  }, [networkStatus.isConnected, offlineStartTime]);

  // Convert connection type to readable string
  const getConnectionTypeString = (type: NetInfoStateType): string => {
    switch (type) {
      case 'wifi':
        return 'wifi';
      case 'cellular':
        return 'cellular';
      case 'ethernet':
        return 'ethernet';
      case 'bluetooth':
        return 'bluetooth';
      case 'wimax':
        return 'wimax';
      case 'vpn':
        return 'vpn';
      case 'other':
        return 'other';
      case 'unknown':
        return 'unknown';
      case 'none':
        return 'none';
      default:
        return 'unknown';
    }
  };

  // Format offline duration for display
  const getFormattedOfflineDuration = useCallback((language: 'en' | 'ms' | 'zh' | 'ta' = 'en'): string => {
    const { offlineDuration } = networkStatus;

    if (offlineDuration === 0) return '';

    const seconds = Math.floor(offlineDuration / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    const translations = {
      en: {
        seconds: 'seconds',
        minutes: 'minutes',
        hours: 'hours',
        days: 'days',
        ago: 'ago',
      },
      ms: {
        seconds: 'saat',
        minutes: 'minit',
        hours: 'jam',
        days: 'hari',
        ago: 'yang lalu',
      },
      zh: {
        seconds: '秒',
        minutes: '分钟',
        hours: '小时',
        days: '天',
        ago: '前',
      },
      ta: {
        seconds: 'விநாடிகள்',
        minutes: 'நிமிடங்கள்',
        hours: 'மணி',
        days: 'நாட்கள்',
        ago: 'முன்பு',
      },
    };

    const t = translations[language];

    if (days > 0) {
      return `${days} ${t.days} ${t.ago}`;
    } else if (hours > 0) {
      return `${hours} ${t.hours} ${t.ago}`;
    } else if (minutes > 0) {
      return `${minutes} ${t.minutes} ${t.ago}`;
    } else {
      return `${seconds} ${t.seconds} ${t.ago}`;
    }
  }, [networkStatus.offlineDuration]);

  // Check if connection is stable
  const isConnectionStable = useCallback((): boolean => {
    const { isConnected, lastConnectedAt } = networkStatus;

    if (!isConnected) return false;
    if (!lastConnectedAt) return true; // First connection

    // Consider connection stable if connected for more than 30 seconds
    const now = new Date();
    const connectionDuration = now.getTime() - lastConnectedAt.getTime();
    return connectionDuration > 30000; // 30 seconds
  }, [networkStatus]);

  // Get connection quality indicator
  const getConnectionQuality = useCallback((): 'excellent' | 'good' | 'poor' | 'offline' => {
    const { isConnected, connectionType } = networkStatus;

    if (!isConnected) return 'offline';

    switch (connectionType) {
      case 'wifi':
      case 'ethernet':
        return 'excellent';
      case 'cellular':
        return 'good';
      case 'bluetooth':
      case 'other':
        return 'poor';
      default:
        return 'poor';
    }
  }, [networkStatus]);

  // Get localized connection status message
  const getConnectionStatusMessage = useCallback((language: 'en' | 'ms' | 'zh' | 'ta' = 'en'): string => {
    const { isConnected, connectionType } = networkStatus;

    const translations = {
      en: {
        connected: 'Connected',
        offline: 'Offline',
        wifi: 'via WiFi',
        cellular: 'via Cellular',
        ethernet: 'via Ethernet',
        bluetooth: 'via Bluetooth',
        unknown: 'Connection Available',
      },
      ms: {
        connected: 'Bersambung',
        offline: 'Luar Talian',
        wifi: 'melalui WiFi',
        cellular: 'melalui Selular',
        ethernet: 'melalui Ethernet',
        bluetooth: 'melalui Bluetooth',
        unknown: 'Sambungan Tersedia',
      },
      zh: {
        connected: '已连接',
        offline: '离线',
        wifi: '通过WiFi',
        cellular: '通过蜂窝网络',
        ethernet: '通过以太网',
        bluetooth: '通过蓝牙',
        unknown: '连接可用',
      },
      ta: {
        connected: 'இணைக்கப்பட்டுள்ளது',
        offline: 'ஆஃப்லைன்',
        wifi: 'WiFi வழியாக',
        cellular: 'செல்லுலார் வழியாக',
        ethernet: 'ஈதர்நெட் வழியாக',
        bluetooth: 'ப்ளூடூத் வழியாக',
        unknown: 'இணைப்பு கிடைக்கிறது',
      },
    };

    const t = translations[language];

    if (!isConnected) {
      return t.offline;
    }

    const connectionText = t[connectionType as keyof typeof t] || t.unknown;
    return `${t.connected} ${connectionText}`;
  }, [networkStatus]);

  return {
    // Status
    isConnected: networkStatus.isConnected,
    connectionType: networkStatus.connectionType,
    isInternetReachable: networkStatus.isInternetReachable,
    lastConnectedAt: networkStatus.lastConnectedAt,
    offlineDuration: networkStatus.offlineDuration,

    // Utility functions
    isConnectionStable: isConnectionStable(),
    connectionQuality: getConnectionQuality(),
    getFormattedOfflineDuration,
    getConnectionStatusMessage,

    // Full status object
    networkStatus,
  };
};