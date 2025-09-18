/**
 * Family Emergency Coordination Hook
 *
 * React Native hook for family emergency coordination:
 * - Real-time family emergency status updates
 * - Emergency response tracking
 * - Cultural-aware family communication
 * - Quick dial emergency contacts
 * - Family emergency analytics
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Alert, Linking } from 'react-native';
import FamilyNotificationService, {
  FamilyEmergencyNotification,
  FamilyEmergencyResponse,
  FamilyNotificationMetrics
} from '@/services/notifications/FamilyNotificationService';
import { quickDialEmergencyContact } from '@/utils/emergency/emergencyUtils';
import { useAppSelector } from '@/store/hooks';
import type { QuickDialContact } from '@/utils/emergency/emergencyUtils';

export interface FamilyEmergencyState {
  // Notifications
  activeNotifications: FamilyEmergencyNotification[];
  notificationHistory: FamilyEmergencyNotification[];
  unreadCount: number;
  criticalCount: number;

  // Responses
  pendingResponses: FamilyEmergencyNotification[];
  familyResponses: Map<string, FamilyEmergencyResponse[]>;
  responseRate: number;
  averageResponseTime: number;

  // Quick dial
  emergencyContacts: QuickDialContact[];
  quickDialEnabled: boolean;
  lastDialed: QuickDialContact | null;

  // Status
  isCoordinationActive: boolean;
  familyOnlineStatus: Map<string, boolean>;
  coordinationMetrics: FamilyNotificationMetrics | null;

  // Error handling
  error: string | null;
  isLoading: boolean;
  connectionStatus: 'connected' | 'disconnected' | 'reconnecting';
}

export interface FamilyEmergencyActions {
  // Response actions
  respondToNotification: (
    notificationId: string,
    responseType: FamilyEmergencyResponse['response']['type'],
    message?: string,
    location?: any
  ) => Promise<void>;

  acknowledgeNotification: (notificationId: string) => Promise<void>;
  markPatientSafe: (notificationId: string, message?: string) => Promise<void>;
  requestHelp: (notificationId: string, message?: string) => Promise<void>;

  // Quick dial actions
  quickDialPatient: (patientId: string) => Promise<void>;
  quickDialEmergency: (contactId: string, method?: 'voice' | 'sms') => Promise<void>;
  callEmergencyServices: () => Promise<void>;

  // Coordination actions
  broadcastFamilyUpdate: (message: string, urgency: 'low' | 'medium' | 'high') => Promise<void>;
  updateFamilyStatus: (status: 'available' | 'busy' | 'responding') => Promise<void>;

  // Management actions
  loadNotifications: () => Promise<void>;
  refreshMetrics: () => Promise<void>;
  clearNotifications: () => Promise<void>;
  clearError: () => void;
}

export interface FamilyEmergencyOptions {
  // Auto-response settings
  autoAcknowledge?: boolean;
  responseTimeout?: number; // minutes
  enableQuickDial?: boolean;

  // Real-time settings
  enableRealTimeUpdates?: boolean;
  updateInterval?: number; // milliseconds

  // Cultural settings
  respectCulturalConstraints?: boolean;
  useFormalLanguage?: boolean;

  // Callbacks
  onNotificationReceived?: (notification: FamilyEmergencyNotification) => void;
  onEmergencyResolved?: (notificationId: string) => void;
  onFamilyResponseReceived?: (response: FamilyEmergencyResponse) => void;
  onError?: (error: string) => void;
}

export const useFamilyEmergencyCoordination = (
  familyMemberId: string,
  options: FamilyEmergencyOptions = {}
): [FamilyEmergencyState, FamilyEmergencyActions] => {
  // Services
  const familyNotificationService = FamilyNotificationService.getInstance();

  // Redux state
  const { profile } = useAppSelector((state) => state.cultural);
  const language = profile?.language || 'en';

  // Local state
  const [state, setState] = useState<FamilyEmergencyState>({
    activeNotifications: [],
    notificationHistory: [],
    unreadCount: 0,
    criticalCount: 0,
    pendingResponses: [],
    familyResponses: new Map(),
    responseRate: 0,
    averageResponseTime: 0,
    emergencyContacts: [],
    quickDialEnabled: options.enableQuickDial ?? true,
    lastDialed: null,
    isCoordinationActive: false,
    familyOnlineStatus: new Map(),
    coordinationMetrics: null,
    error: null,
    isLoading: false,
    connectionStatus: 'disconnected'
  });

  // Refs for intervals and cleanup
  const updateInterval = useRef<NodeJS.Timeout | null>(null);
  const lastUpdateRef = useRef<Date>(new Date());

  // Configuration
  const config = {
    autoAcknowledge: options.autoAcknowledge ?? false,
    responseTimeout: options.responseTimeout ?? 10,
    enableQuickDial: options.enableQuickDial ?? true,
    enableRealTimeUpdates: options.enableRealTimeUpdates ?? true,
    updateInterval: options.updateInterval ?? 30000, // 30 seconds
    respectCulturalConstraints: options.respectCulturalConstraints ?? true,
    useFormalLanguage: options.useFormalLanguage ?? true
  };

  /**
   * Initialize family emergency coordination
   */
  const initialize = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));

      // Initialize family notification service
      const initResult = await familyNotificationService.initialize();
      if (!initResult.success) {
        throw new Error(initResult.error || 'Failed to initialize family notification service');
      }

      // Load initial data
      await loadNotifications();
      await loadEmergencyContacts();
      await loadCoordinationMetrics();

      setState(prev => ({
        ...prev,
        isCoordinationActive: true,
        connectionStatus: 'connected',
        isLoading: false
      }));

      // Start real-time updates
      if (config.enableRealTimeUpdates) {
        startRealTimeUpdates();
      }

      console.log('Family emergency coordination initialized for member:', familyMemberId);

    } catch (error) {
      console.error('Failed to initialize family emergency coordination:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Initialization failed',
        isLoading: false,
        connectionStatus: 'disconnected'
      }));
      options.onError?.(error instanceof Error ? error.message : 'Initialization failed');
    }
  }, [familyMemberId, familyNotificationService, config.enableRealTimeUpdates, options]);

  /**
   * Load emergency notifications
   */
  const loadNotifications = useCallback(async () => {
    try {
      // Get family notifications for the current family member's patients
      const notifications = familyNotificationService.getFamilyNotifications(familyMemberId);

      const activeNotifications = notifications.filter(n =>
        n.tracking.deliveryStatus === 'delivered' && !n.tracking.resolvedAt
      );

      const criticalNotifications = activeNotifications.filter(n =>
        n.severity === 'critical'
      );

      const pendingResponses = activeNotifications.filter(n =>
        !n.tracking.responses.some(r => r.responderId === familyMemberId)
      );

      // Load responses for each notification
      const responsesMap = new Map<string, FamilyEmergencyResponse[]>();
      for (const notification of notifications) {
        const responses = familyNotificationService.getNotificationResponses(notification.id);
        responsesMap.set(notification.id, responses);
      }

      setState(prev => ({
        ...prev,
        activeNotifications,
        notificationHistory: notifications,
        unreadCount: pendingResponses.length,
        criticalCount: criticalNotifications.length,
        pendingResponses,
        familyResponses: responsesMap
      }));

      // Auto-acknowledge if enabled
      if (config.autoAcknowledge) {
        for (const notification of pendingResponses) {
          if (notification.priority !== 'emergency') {
            await acknowledgeNotification(notification.id);
          }
        }
      }

    } catch (error) {
      console.error('Failed to load notifications:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load notifications'
      }));
    }
  }, [familyMemberId, familyNotificationService, config.autoAcknowledge]);

  /**
   * Load emergency contacts
   */
  const loadEmergencyContacts = useCallback(async () => {
    try {
      // Load quick dial contacts for emergency situations
      const contacts: QuickDialContact[] = [
        {
          id: 'emergency_999',
          name: 'Emergency Services (999)',
          phoneNumber: '999',
          relationship: 'emergency_services',
          priority: 10,
          isEmergencyContact: true,
          responseHistory: {
            totalCalls: 0,
            successfulContact: 0,
            averageResponseTime: 0
          }
        },
        // Additional contacts would be loaded from family data
      ];

      setState(prev => ({ ...prev, emergencyContacts: contacts }));

    } catch (error) {
      console.error('Failed to load emergency contacts:', error);
    }
  }, []);

  /**
   * Load coordination metrics
   */
  const loadCoordinationMetrics = useCallback(async () => {
    try {
      const metrics = await familyNotificationService.getFamilyNotificationMetrics(
        familyMemberId
      );

      setState(prev => ({
        ...prev,
        coordinationMetrics: metrics,
        responseRate: metrics.emergencyNotifications.familyEngagementRate,
        averageResponseTime: metrics.emergencyNotifications.averageResponseTime
      }));

    } catch (error) {
      console.error('Failed to load coordination metrics:', error);
    }
  }, [familyMemberId, familyNotificationService]);

  /**
   * Start real-time updates
   */
  const startRealTimeUpdates = useCallback(() => {
    if (updateInterval.current) {
      clearInterval(updateInterval.current);
    }

    updateInterval.current = setInterval(async () => {
      await loadNotifications();
      lastUpdateRef.current = new Date();
    }, config.updateInterval);

    console.log('Real-time family emergency updates started');
  }, [loadNotifications, config.updateInterval]);

  /**
   * Stop real-time updates
   */
  const stopRealTimeUpdates = useCallback(() => {
    if (updateInterval.current) {
      clearInterval(updateInterval.current);
      updateInterval.current = null;
    }

    console.log('Real-time family emergency updates stopped');
  }, []);

  /**
   * Show emergency notification alert
   */
  const showNotificationAlert = useCallback((notification: FamilyEmergencyNotification) => {
    const alertMessages = {
      en: {
        title: 'Family Emergency Alert',
        message: notification.content.body.en,
        safe: 'Patient is Safe',
        help: 'Need Help',
        acknowledge: 'Acknowledge',
        call: 'Call Patient'
      },
      ms: {
        title: 'Amaran Kecemasan Keluarga',
        message: notification.content.body.ms,
        safe: 'Pesakit Selamat',
        help: 'Perlukan Bantuan',
        acknowledge: 'Akui',
        call: 'Panggil Pesakit'
      },
      zh: {
        title: '家庭紧急警报',
        message: notification.content.body.zh,
        safe: '患者安全',
        help: '需要帮助',
        acknowledge: '确认',
        call: '呼叫患者'
      },
      ta: {
        title: 'குடும்ப அவசர எச்சரிக்கை',
        message: notification.content.body.ta,
        safe: 'நோயாளி பாதுகாப்பாக இருக்கிறார்',
        help: 'உதவி தேவை',
        acknowledge: 'ஒப்புக்கொள்ளுங்கள்',
        call: 'நோயாளியை அழைக்கவும்'
      }
    };

    const messages = alertMessages[language as keyof typeof alertMessages] || alertMessages.en;

    const buttons = [
      {
        text: messages.acknowledge,
        onPress: () => acknowledgeNotification(notification.id)
      }
    ];

    if (notification.severity === 'critical' || notification.severity === 'high') {
      buttons.unshift(
        {
          text: messages.safe,
          onPress: () => markPatientSafe(notification.id)
        },
        {
          text: messages.help,
          style: 'destructive' as const,
          onPress: () => requestHelp(notification.id)
        },
        {
          text: messages.call,
          onPress: () => quickDialPatient(notification.patientId)
        }
      );
    }

    Alert.alert(messages.title, messages.message, buttons);
  }, [language]);

  /**
   * Actions object
   */
  const actions: FamilyEmergencyActions = {
    respondToNotification: useCallback(async (
      notificationId: string,
      responseType: FamilyEmergencyResponse['response']['type'],
      message?: string,
      location?: any
    ) => {
      try {
        await familyNotificationService.recordFamilyResponse(
          notificationId,
          familyMemberId,
          'family_member',
          responseType,
          { message, location }
        );

        // Refresh notifications
        await loadNotifications();

        // Check if emergency was resolved
        const notification = state.activeNotifications.find(n => n.id === notificationId);
        if (notification && (responseType === 'patient_safe' || responseType === 'false_alarm')) {
          options.onEmergencyResolved?.(notificationId);
        }

      } catch (error) {
        console.error('Failed to respond to notification:', error);
        setState(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Failed to respond'
        }));
      }
    }, [familyNotificationService, familyMemberId, loadNotifications, state.activeNotifications, options]),

    acknowledgeNotification: useCallback(async (notificationId: string) => {
      await actions.respondToNotification(notificationId, 'acknowledged');
    }, []),

    markPatientSafe: useCallback(async (notificationId: string, message?: string) => {
      await actions.respondToNotification(notificationId, 'patient_safe', message);
    }, []),

    requestHelp: useCallback(async (notificationId: string, message?: string) => {
      await actions.respondToNotification(notificationId, 'need_help', message);
    }, []),

    quickDialPatient: useCallback(async (patientId: string) => {
      try {
        // In real implementation, get patient contact from family data
        const patientContact: QuickDialContact = {
          id: patientId,
          name: 'Patient',
          phoneNumber: '+60123456789', // Would be loaded from family data
          relationship: 'patient',
          priority: 10,
          isEmergencyContact: true,
          responseHistory: {
            totalCalls: 0,
            successfulContact: 0,
            averageResponseTime: 0
          }
        };

        const result = await quickDialEmergencyContact(patientContact, 'voice', {
          emergencyId: 'family_call',
          urgency: 'high',
          message: 'Family member calling to check on you'
        });

        if (result.success) {
          setState(prev => ({ ...prev, lastDialed: patientContact }));
        } else {
          throw new Error(result.error || 'Failed to dial patient');
        }

      } catch (error) {
        console.error('Failed to quick dial patient:', error);
        setState(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Failed to dial patient'
        }));
      }
    }, []),

    quickDialEmergency: useCallback(async (contactId: string, method = 'voice' as const) => {
      try {
        const contact = state.emergencyContacts.find(c => c.id === contactId);
        if (!contact) {
          throw new Error('Emergency contact not found');
        }

        const result = await quickDialEmergencyContact(contact, method, {
          emergencyId: 'family_emergency',
          urgency: 'critical',
          message: 'Family emergency - patient may need assistance'
        });

        if (result.success) {
          setState(prev => ({ ...prev, lastDialed: contact }));
        } else {
          throw new Error(result.error || 'Failed to dial emergency contact');
        }

      } catch (error) {
        console.error('Failed to quick dial emergency contact:', error);
        setState(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Failed to dial emergency contact'
        }));
      }
    }, [state.emergencyContacts]),

    callEmergencyServices: useCallback(async () => {
      try {
        const emergencyNumber = 'tel:999';
        const canCall = await Linking.canOpenURL(emergencyNumber);

        if (canCall) {
          await Linking.openURL(emergencyNumber);
        } else {
          throw new Error('Cannot make emergency call');
        }

      } catch (error) {
        console.error('Failed to call emergency services:', error);
        setState(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Failed to call emergency services'
        }));
      }
    }, []),

    broadcastFamilyUpdate: useCallback(async (message: string, urgency: 'low' | 'medium' | 'high') => {
      try {
        // Implementation would send update to all family members
        console.log('Broadcasting family update:', message, urgency);
      } catch (error) {
        console.error('Failed to broadcast family update:', error);
      }
    }, []),

    updateFamilyStatus: useCallback(async (status: 'available' | 'busy' | 'responding') => {
      try {
        // Implementation would update family member status
        console.log('Updating family status:', status);
      } catch (error) {
        console.error('Failed to update family status:', error);
      }
    }, []),

    loadNotifications,
    refreshMetrics: loadCoordinationMetrics,

    clearNotifications: useCallback(async () => {
      try {
        await familyNotificationService.clearNotificationHistory();
        await loadNotifications();
      } catch (error) {
        console.error('Failed to clear notifications:', error);
      }
    }, [familyNotificationService, loadNotifications]),

    clearError: useCallback(() => {
      setState(prev => ({ ...prev, error: null }));
    }, [])
  };

  // Initialize on mount
  useEffect(() => {
    initialize();

    return () => {
      stopRealTimeUpdates();
    };
  }, [initialize, stopRealTimeUpdates]);

  // Handle new notifications
  useEffect(() => {
    if (state.activeNotifications.length > 0) {
      const latestNotification = state.activeNotifications
        .sort((a, b) => b.tracking.createdAt.getTime() - a.tracking.createdAt.getTime())[0];

      // Show alert for new critical notifications
      if (latestNotification.severity === 'critical' &&
          !state.familyResponses.get(latestNotification.id)?.some(r => r.responderId === familyMemberId)) {
        showNotificationAlert(latestNotification);
      }

      options.onNotificationReceived?.(latestNotification);
    }
  }, [state.activeNotifications, state.familyResponses, familyMemberId, showNotificationAlert, options]);

  return [state, actions];
};

export default useFamilyEmergencyCoordination;