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
import { RealtimeService } from '@/api/services/realtimeService';
import { FamilyCoordinationService } from '@/services/family/FamilyCoordinationService';

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
  const realtimeServiceRef = useRef<RealtimeService | null>(null);
  const familyServiceRef = useRef<FamilyCoordinationService | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const appStateRef = useRef<AppStateStatus>('active');

  // Initialize services
  useEffect(() => {
    familyServiceRef.current = new FamilyCoordinationService();
    realtimeServiceRef.current = new RealtimeService();

    return () => {
      familyServiceRef.current = null;
      realtimeServiceRef.current = null;
    };
  }, []);

  // Handle WebSocket messages
  const handleWebSocketMessage = useCallback((message: WebSocketFamilyMessage) => {
    try {
      const update: FamilyRealtimeUpdate = message.data;

      if (!familyId || update.familyId !== familyId) {
        return; // Not for our family
      }

      setWsState(prev => ({
        ...prev,
        lastMessageTime: new Date(),
      }));

      // Handle different update types
      switch (update.type) {
        case 'member_status':
          setDashboardData(prev => {
            if (!prev) return prev;

            const updatedMembers = prev.members.map(member => {
              if (member.id === update.memberId) {
                return {
                  ...member,
                  ...update.data,
                  lastSeen: new Date(),
                };
              }
              return member;
            });

            return {
              ...prev,
              members: updatedMembers,
              lastUpdated: new Date(),
            };
          });
          break;

        case 'medication_taken':
          setDashboardData(prev => {
            if (!prev) return prev;

            // Update medication status for the member
            const updatedMembers = prev.members.map(member => {
              if (member.id === update.memberId) {
                return {
                  ...member,
                  medicationStatus: {
                    ...member.medicationStatus,
                    takenToday: member.medicationStatus.takenToday + 1,
                    lastTaken: new Date(),
                  },
                };
              }
              return member;
            });

            return {
              ...prev,
              members: updatedMembers,
              lastUpdated: new Date(),
            };
          });
          break;

        case 'emergency_alert':
          // Add to active notifications
          setDashboardData(prev => {
            if (!prev) return prev;

            const newNotification = {
              ...update.data,
              id: `emergency_${Date.now()}`,
              familyId,
              createdAt: new Date(),
            };

            return {
              ...prev,
              activeNotifications: [newNotification, ...prev.activeNotifications],
              lastUpdated: new Date(),
            };
          });
          break;

        case 'family_activity':
          // Add to recent activity
          setDashboardData(prev => {
            if (!prev) return prev;

            const newActivity = {
              ...update.data,
              createdAt: new Date(),
            };

            return {
              ...prev,
              recentActivity: [newActivity, ...prev.recentActivity.slice(0, 19)], // Keep last 20
              lastUpdated: new Date(),
            };
          });
          break;
      }

      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      console.error('Error handling WebSocket message:', err);
      setError('Failed to process real-time update');
    }
  }, [familyId]);

  // WebSocket connection management
  const connectWebSocket = useCallback(async () => {
    if (!familyId || !realtimeServiceRef.current) {
      return;
    }

    try {
      setWsState(prev => ({ ...prev, connecting: true, error: null }));

      const wsConfig = {
        onConnect: () => {
          setWsState(prev => ({
            ...prev,
            connected: true,
            connecting: false,
            reconnectAttempts: 0,
            error: null,
          }));
        },
        onDisconnect: () => {
          setWsState(prev => ({
            ...prev,
            connected: false,
            connecting: false,
          }));

          // Auto-reconnect if in foreground
          if (appStateRef.current === 'active') {
            scheduleReconnect();
          }
        },
        onMessage: handleWebSocketMessage,
        onError: (error: Error) => {
          console.error('WebSocket error:', error);
          setWsState(prev => ({
            ...prev,
            connected: false,
            connecting: false,
            error: error.message,
          }));
          scheduleReconnect();
        },
        culturalContext,
      };

      await realtimeServiceRef.current.connect(wsConfig);

      // Subscribe to family channel
      await realtimeServiceRef.current.subscribe(`family:${familyId}`);

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
  }, [familyId, handleWebSocketMessage, culturalContext]);

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

  // Fetch initial dashboard data
  const fetchDashboardData = useCallback(async () => {
    if (!familyId || !familyServiceRef.current) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const startTime = Date.now();
      const data = await familyServiceRef.current.getFamilyDashboard(familyId);
      const loadTime = Date.now() - startTime;

      // Performance monitoring
      if (loadTime > FAMILY_UI_CONSTANTS.LOAD_TIME_TARGETS.DASHBOARD) {
        console.warn(`Family dashboard load time exceeded target: ${loadTime}ms`);
      }

      const dashboardData: FamilyDashboardData = {
        family: data.family,
        members: data.members.map(member => ({
          ...member,
          isOnline: false, // Will be updated via WebSocket
          emergencyStatus: 'normal', // Will be determined by medication status
          medicationStatus: {
            totalMedications: 0,
            takenToday: 0,
            missedToday: 0,
            criticalMissed: 0,
            adherenceRate: 0,
            emergencyMedications: 0,
          },
          healthScore: 85, // Default score, will be calculated
        })),
        recentActivity: data.recentActivity || [],
        activeNotifications: data.activeNotifications || [],
        medicationSummary: data.medicationSummary || [],
        lastUpdated: new Date(),
        connectionStatus: wsState.connected ? 'connected' : 'disconnected',
      };

      setDashboardData(dashboardData);
      setLastUpdate(new Date());
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load family data');
    } finally {
      setLoading(false);
    }
  }, [familyId, wsState.connected]);

  // Refresh data
  const refresh = useCallback(async () => {
    await fetchDashboardData();
  }, [fetchDashboardData]);

  // Disconnect WebSocket
  const disconnect = useCallback(() => {
    if (realtimeServiceRef.current) {
      realtimeServiceRef.current.disconnect();
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
  }, []);

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

      const status = wsState.connected ? 'connected' :
                   wsState.connecting ? 'connecting' : 'disconnected';

      return {
        ...prev,
        connectionStatus: status,
      };
    });
  }, [wsState.connected, wsState.connecting]);

  return {
    dashboardData,
    loading,
    error: error || wsState.error,
    connected: wsState.connected,
    lastUpdate,
    refresh,
    disconnect,
    reconnect,
  };
};