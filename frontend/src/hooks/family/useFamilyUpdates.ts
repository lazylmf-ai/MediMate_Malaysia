/**
 * Family Updates Hook
 *
 * Real-time WebSocket hook for family dashboard updates, medication status,
 * and emergency notifications. Optimized for Malaysian cultural contexts
 * with prayer time awareness and multi-generational accessibility.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import {
  FamilyDashboardData,
  FamilyHookReturn,
  UseFamilyUpdatesConfig,
  FamilyRealtimeUpdate,
  WebSocketFamilyMessage,
  FAMILY_UI_CONSTANTS,
} from '@/types/family';
import { realtimeService } from '@/api/services/realtimeService';
import { familyManager } from '@/services/family/FamilyManager';

interface WebSocketState {
  connected: boolean;
  connecting: boolean;
  error: string | null;
  reconnectAttempts: number;
  lastMessageTime: Date | null;
}

export const useFamilyUpdates = (config: UseFamilyUpdatesConfig = {}): FamilyHookReturn => {
  const {
    familyId,
    autoConnect = true,
    reconnectAttempts = 5,
    updateInterval = FAMILY_UI_CONSTANTS.DASHBOARD_REFRESH_INTERVAL,
    culturalContext = {
      respectPrayerTimes: false,
      urgencyOverride: true,
      language: 'en',
    },
  } = config;

  // State
  const [dashboardData, setDashboardData] = useState<FamilyDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [wsState, setWsState] = useState<WebSocketState>({
    connected: false,
    connecting: false,
    error: null,
    reconnectAttempts: 0,
    lastMessageTime: null,
  });

  // Refs
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const appStateRef = useRef<AppStateStatus>('active');
  const unsubscribeRef = useRef<(() => void) | null>(null);

  // Handle WebSocket messages from FamilyManager
  const handleWebSocketMessage = useCallback((data: any) => {
    try {
      if (!familyId || data.familyId !== familyId) {
        return; // Not for our family
      }

      setWsState(prev => ({
        ...prev,
        lastMessageTime: new Date(),
      }));

      // Handle different update types
      switch (data.type) {
        case 'member_status_changed':
          setDashboardData(prev => {
            if (!prev) return prev;

            const updatedMembers = prev.members.map(member => {
              if (member.id === data.memberId) {
                return {
                  ...member,
                  ...data.status,
                  lastSeen: new Date(),
                };
              }
              return member;
            });

            return {
              ...prev,
              members: updatedMembers,
              lastSync: new Date(),
            };
          });
          break;

        case 'medication_taken':
        case 'medication_missed':
          setDashboardData(prev => {
            if (!prev) return prev;

            // Update medication status for the member
            const updatedMembers = prev.members.map(member => {
              if (member.id === data.memberId) {
                const newStatus = data.type === 'medication_taken'
                  ? {
                      ...member.medicationStatus,
                      takenToday: member.medicationStatus.takenToday + 1,
                      lastTaken: new Date(),
                    }
                  : {
                      ...member.medicationStatus,
                      missedToday: member.medicationStatus.missedToday + 1,
                    };

                return {
                  ...member,
                  medicationStatus: newStatus,
                };
              }
              return member;
            });

            return {
              ...prev,
              members: updatedMembers,
              lastSync: new Date(),
            };
          });
          break;

        case 'emergency_triggered':
          // Add to active notifications
          setDashboardData(prev => {
            if (!prev) return prev;

            const newNotification = {
              id: data.emergency.id,
              type: data.emergency.type,
              severity: data.emergency.severity,
              message: data.emergency.message,
              timestamp: new Date(data.emergency.timestamp),
              patientId: data.emergency.patientId,
              isEmergency: true,
            };

            return {
              ...prev,
              activeNotifications: [newNotification, ...prev.activeNotifications],
              lastSync: new Date(),
            };
          });
          break;

        case 'member_joined':
        case 'family_settings_updated':
          // Refresh full family data
          refresh();
          break;
      }

      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      console.error('Error handling WebSocket message:', err);
      setError('Failed to process real-time update');
    }
  }, [familyId]);

  // WebSocket connection management using FamilyManager
  const connectWebSocket = useCallback(async () => {
    if (!familyId) {
      return;
    }

    try {
      setWsState(prev => ({ ...prev, connecting: true, error: null }));

      // Subscribe to family updates through FamilyManager
      const success = await familyManager.subscribeToFamilyUpdates(familyId);

      if (success) {
        // Set up update handler
        const unsubscribe = familyManager.onFamilyUpdate(familyId, handleWebSocketMessage);
        unsubscribeRef.current = unsubscribe;

        setWsState(prev => ({
          ...prev,
          connected: true,
          connecting: false,
          reconnectAttempts: 0,
          error: null,
        }));
      } else {
        throw new Error('Failed to subscribe to family updates');
      }

    } catch (err) {
      console.error('Failed to connect WebSocket:', err);
      setWsState(prev => ({
        ...prev,
        connected: false,
        connecting: false,
        error: err instanceof Error ? err.message : 'Connection failed',
      }));
      scheduleReconnect();
    }
  }, [familyId, handleWebSocketMessage]);

  // Schedule reconnection attempts
  const scheduleReconnect = useCallback(() => {
    if (wsState.reconnectAttempts >= reconnectAttempts) {
      setError('Maximum reconnection attempts reached');
      return;
    }

    const delay = Math.min(1000 * Math.pow(2, wsState.reconnectAttempts), 30000); // Exponential backoff, max 30s

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    reconnectTimeoutRef.current = setTimeout(() => {
      setWsState(prev => ({
        ...prev,
        reconnectAttempts: prev.reconnectAttempts + 1,
      }));
      connectWebSocket();
    }, delay);
  }, [wsState.reconnectAttempts, reconnectAttempts, connectWebSocket]);

  // Fetch initial dashboard data using FamilyManager
  const fetchDashboardData = useCallback(async () => {
    if (!familyId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const startTime = Date.now();
      const data = await familyManager.getFamilyDashboard(familyId);
      const loadTime = Date.now() - startTime;

      // Performance monitoring
      if (loadTime > FAMILY_UI_CONSTANTS.LOAD_TIME_TARGETS.DASHBOARD) {
        console.warn(`Family dashboard load time exceeded target: ${loadTime}ms`);
      }

      if (data) {
        setDashboardData(data);
        setLastUpdate(new Date());
      } else {
        throw new Error('No family dashboard data received');
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load family data');
    } finally {
      setLoading(false);
    }
  }, [familyId]);

  // Refresh data
  const refresh = useCallback(async () => {
    await fetchDashboardData();
  }, [fetchDashboardData]);

  // Disconnect WebSocket
  const disconnect = useCallback(() => {
    if (familyId) {
      familyManager.unsubscribeFromFamilyUpdates(familyId);
    }

    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    setWsState({
      connected: false,
      connecting: false,
      error: null,
      reconnectAttempts: 0,
      lastMessageTime: null,
    });
  }, [familyId]);

  // Reconnect WebSocket
  const reconnect = useCallback(() => {
    disconnect();
    setWsState(prev => ({ ...prev, reconnectAttempts: 0 }));
    connectWebSocket();
  }, [disconnect, connectWebSocket]);

  // Handle app state changes
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      appStateRef.current = nextAppState;

      if (nextAppState === 'active' && !wsState.connected && familyId) {
        // Reconnect when app becomes active
        connectWebSocket();
      } else if (nextAppState === 'background') {
        // Consider disconnecting to save battery
        // Keep connected for emergency notifications
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
    };
  }, [wsState.connected, familyId, connectWebSocket]);

  // Initialize connection and data fetching
  useEffect(() => {
    if (familyId && autoConnect) {
      fetchDashboardData();
      connectWebSocket();
    }

    return () => {
      disconnect();
      if (updateIntervalRef.current) {
        clearInterval(updateIntervalRef.current);
      }
    };
  }, [familyId, autoConnect, fetchDashboardData, connectWebSocket, disconnect]);

  // Periodic data refresh
  useEffect(() => {
    if (familyId && updateInterval > 0) {
      updateIntervalRef.current = setInterval(() => {
        if (appStateRef.current === 'active') {
          refresh();
        }
      }, updateInterval);

      return () => {
        if (updateIntervalRef.current) {
          clearInterval(updateIntervalRef.current);
        }
      };
    }
  }, [familyId, updateInterval, refresh]);

  // Update connection status in dashboard data
  useEffect(() => {
    setDashboardData(prev => {
      if (!prev) return prev;

      return {
        ...prev,
        connectionStatus: wsState.connected ? 'connected' :
                         wsState.connecting ? 'connecting' : 'disconnected',
        lastSync: wsState.connected ? new Date() : prev.lastSync,
      };
    });
  }, [wsState.connected, wsState.connecting]);

  return {
    dashboardData,
    loading,
    error: error || wsState.error,
    connected: familyId ? familyManager.isConnected(familyId) : false,
    lastUpdate: familyId ? familyManager.getLastUpdate(familyId) : lastUpdate,
    refresh,
    disconnect,
    reconnect,
  };
};