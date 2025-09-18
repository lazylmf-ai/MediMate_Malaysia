/**
 * Emergency Detection Hook
 *
 * React Native hook for emergency detection integration:
 * - Real-time emergency detection monitoring
 * - Emergency event state management
 * - Cultural-aware emergency responses
 * - Family emergency coordination
 * - Performance-optimized emergency handling
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { Alert, AppState, AppStateStatus } from 'react-native';
import EmergencyEngine, {
  EmergencyEvent,
  EmergencyDetectionConfig,
  EmergencyTriggerCondition
} from '@/services/emergency/EmergencyEngine';
import CulturalEmergencyHandler from '@/services/emergency/CulturalEmergencyHandler';
import FamilyNotificationService from '@/services/notifications/FamilyNotificationService';
import { useAppSelector } from '@/store/hooks';

export interface EmergencyDetectionState {
  // Detection status
  isEnabled: boolean;
  isMonitoring: boolean;
  isInitialized: boolean;
  lastCheck: Date | null;

  // Active emergencies
  activeEmergencies: EmergencyEvent[];
  emergencyCount: number;
  criticalEmergencies: EmergencyEvent[];

  // Configuration
  config: EmergencyDetectionConfig | null;
  triggers: EmergencyTriggerCondition[];

  // Performance metrics
  detectionLatency: number; // milliseconds
  lastDetectionTime: number;
  emergencyResponseTime: number;

  // Cultural integration
  respectsPrayerTimes: boolean;
  culturalConstraintsActive: boolean;
  nextAllowedTime: Date | null;

  // Error handling
  error: string | null;
  isRetrying: boolean;
  retryCount: number;
}

export interface EmergencyDetectionActions {
  // Core actions
  enableDetection: () => Promise<void>;
  disableDetection: () => Promise<void>;
  triggerManualEmergency: (context?: any) => Promise<void>;
  resolveEmergency: (emergencyId: string, reason?: string) => Promise<void>;

  // Configuration
  updateConfig: (config: Partial<EmergencyDetectionConfig>) => Promise<void>;
  addTrigger: (trigger: Omit<EmergencyTriggerCondition, 'id' | 'createdAt'>) => Promise<void>;
  removeTrigger: (triggerId: string) => Promise<void>;

  // Response actions
  respondToEmergency: (
    emergencyId: string,
    responseType: 'safe' | 'need_help' | 'false_alarm',
    message?: string
  ) => Promise<void>;

  // Family coordination
  notifyFamily: (emergencyId: string) => Promise<void>;
  getFamilyResponses: (emergencyId: string) => any[];

  // Utilities
  checkEmergencyConditions: () => Promise<void>;
  refreshDetection: () => Promise<void>;
  clearError: () => void;
}

export interface EmergencyDetectionOptions {
  // Detection settings
  enableBackgroundMonitoring?: boolean;
  autoStart?: boolean;
  culturalConstraints?: boolean;
  familyIntegration?: boolean;

  // Performance settings
  checkInterval?: number; // milliseconds
  maxRetries?: number;
  retryDelay?: number;

  // Callbacks
  onEmergencyDetected?: (emergency: EmergencyEvent) => void;
  onEmergencyResolved?: (emergencyId: string) => void;
  onError?: (error: string) => void;
  onConfigurationChanged?: (config: EmergencyDetectionConfig) => void;
}

export const useEmergencyDetection = (
  patientId: string,
  options: EmergencyDetectionOptions = {}
): [EmergencyDetectionState, EmergencyDetectionActions] => {
  // Services
  const emergencyEngine = EmergencyEngine.getInstance();
  const culturalHandler = CulturalEmergencyHandler.getInstance();
  const familyNotificationService = FamilyNotificationService.getInstance();

  // Redux state
  const { profile } = useAppSelector((state) => state.cultural);
  const language = profile?.language || 'en';

  // Local state
  const [state, setState] = useState<EmergencyDetectionState>({
    isEnabled: false,
    isMonitoring: false,
    isInitialized: false,
    lastCheck: null,
    activeEmergencies: [],
    emergencyCount: 0,
    criticalEmergencies: [],
    config: null,
    triggers: [],
    detectionLatency: 0,
    lastDetectionTime: 0,
    emergencyResponseTime: 0,
    respectsPrayerTimes: true,
    culturalConstraintsActive: false,
    nextAllowedTime: null,
    error: null,
    isRetrying: false,
    retryCount: 0
  });

  // Refs for intervals and cleanup
  const detectionInterval = useRef<NodeJS.Timeout | null>(null);
  const appStateRef = useRef<AppStateStatus>('active');
  const lastActivityRef = useRef<Date>(new Date());

  // Configuration
  const config = {
    enableBackgroundMonitoring: options.enableBackgroundMonitoring ?? true,
    autoStart: options.autoStart ?? true,
    culturalConstraints: options.culturalConstraints ?? true,
    familyIntegration: options.familyIntegration ?? true,
    checkInterval: options.checkInterval ?? 30000, // 30 seconds
    maxRetries: options.maxRetries ?? 3,
    retryDelay: options.retryDelay ?? 5000 // 5 seconds
  };

  /**
   * Initialize emergency detection
   */
  const initialize = useCallback(async () => {
    try {
      console.log('Initializing emergency detection for patient:', patientId);

      // Initialize services
      await emergencyEngine.initialize();
      await culturalHandler.initialize();
      await familyNotificationService.initialize();

      // Load configuration
      const emergencyConfig = emergencyEngine.getConfiguration();
      const activeTriggers = emergencyConfig.triggers.filter(t => t.detection.enabled);

      setState(prev => ({
        ...prev,
        isInitialized: true,
        config: emergencyConfig,
        triggers: activeTriggers,
        isEnabled: emergencyConfig.detection.enabled,
        respectsPrayerTimes: emergencyConfig.culturalSettings.considerReligiousPractices,
        error: null
      }));

      // Auto-start if enabled
      if (config.autoStart && emergencyConfig.detection.enabled) {
        await startMonitoring();
      }

      console.log('Emergency detection initialized successfully');

    } catch (error) {
      console.error('Failed to initialize emergency detection:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Initialization failed',
        isInitialized: false
      }));
      options.onError?.(error instanceof Error ? error.message : 'Initialization failed');
    }
  }, [patientId, emergencyEngine, culturalHandler, familyNotificationService, config.autoStart, options]);

  /**
   * Start emergency monitoring
   */
  const startMonitoring = useCallback(async () => {
    try {
      if (!state.isInitialized) {
        await initialize();
        return;
      }

      setState(prev => ({ ...prev, isMonitoring: true, lastCheck: new Date() }));

      // Start periodic checks
      if (detectionInterval.current) {
        clearInterval(detectionInterval.current);
      }

      detectionInterval.current = setInterval(async () => {
        await checkEmergencyConditions();
      }, config.checkInterval);

      // Set up app state monitoring
      AppState.addEventListener('change', handleAppStateChange);

      console.log('Emergency monitoring started');

    } catch (error) {
      console.error('Failed to start emergency monitoring:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to start monitoring',
        isMonitoring: false
      }));
    }
  }, [state.isInitialized, initialize, config.checkInterval]);

  /**
   * Stop emergency monitoring
   */
  const stopMonitoring = useCallback(() => {
    if (detectionInterval.current) {
      clearInterval(detectionInterval.current);
      detectionInterval.current = null;
    }

    AppState.removeEventListener('change', handleAppStateChange);

    setState(prev => ({ ...prev, isMonitoring: false }));
    console.log('Emergency monitoring stopped');
  }, []);

  /**
   * Handle app state changes
   */
  const handleAppStateChange = useCallback((nextAppState: AppStateStatus) => {
    appStateRef.current = nextAppState;

    if (nextAppState === 'active') {
      lastActivityRef.current = new Date();
      // Check for emergencies when app becomes active
      checkEmergencyConditions();
    }
  }, []);

  /**
   * Check for emergency conditions
   */
  const checkEmergencyConditions = useCallback(async () => {
    try {
      const startTime = Date.now();

      // Update last check time
      setState(prev => ({ ...prev, lastCheck: new Date() }));

      // Check cultural constraints
      let culturalDelay = null;
      if (config.culturalConstraints) {
        const prayerCheck = await culturalHandler.shouldRespectPrayerTime(patientId);
        if (prayerCheck.isPrayerTime) {
          setState(prev => ({
            ...prev,
            culturalConstraintsActive: true,
            nextAllowedTime: prayerCheck.nextAllowedTime || null
          }));
          return; // Skip detection during prayer time
        } else {
          setState(prev => ({
            ...prev,
            culturalConstraintsActive: false,
            nextAllowedTime: null
          }));
        }
      }

      // Check for app inactivity
      const inactivityMinutes = (Date.now() - lastActivityRef.current.getTime()) / (1000 * 60);
      if (inactivityMinutes > 30) { // 30 minutes of inactivity
        await detectEmergency('no_app_activity', {
          inactivityPeriod: inactivityMinutes,
          lastActivity: lastActivityRef.current
        });
      }

      // Get active emergencies
      const activeEmergencies = emergencyEngine.getActiveEmergencies();
      const criticalEmergencies = activeEmergencies.filter(e => e.eventData.severity === 'critical');

      const detectionLatency = Date.now() - startTime;

      setState(prev => ({
        ...prev,
        activeEmergencies,
        emergencyCount: activeEmergencies.length,
        criticalEmergencies,
        detectionLatency,
        lastDetectionTime: Date.now()
      }));

    } catch (error) {
      console.error('Failed to check emergency conditions:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Detection check failed'
      }));
    }
  }, [patientId, config.culturalConstraints, culturalHandler, emergencyEngine]);

  /**
   * Detect emergency condition
   */
  const detectEmergency = useCallback(async (
    type: EmergencyTriggerCondition['type'],
    context: any
  ) => {
    try {
      const result = await emergencyEngine.detectEmergency(patientId, type, context);

      if (result.success && result.emergencyId) {
        const emergency = emergencyEngine.getActiveEmergencies()
          .find(e => e.id === result.emergencyId);

        if (emergency) {
          // Notify callback
          options.onEmergencyDetected?.(emergency);

          // Send family notifications if enabled
          if (config.familyIntegration) {
            await notifyFamily(result.emergencyId);
          }

          // Show alert for critical emergencies
          if (emergency.eventData.severity === 'critical') {
            showEmergencyAlert(emergency);
          }

          setState(prev => ({
            ...prev,
            activeEmergencies: emergencyEngine.getActiveEmergencies(),
            emergencyCount: prev.emergencyCount + 1
          }));
        }
      }

    } catch (error) {
      console.error('Failed to detect emergency:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Emergency detection failed'
      }));
    }
  }, [patientId, emergencyEngine, config.familyIntegration, options]);

  /**
   * Show emergency alert
   */
  const showEmergencyAlert = useCallback((emergency: EmergencyEvent) => {
    const alertMessages = {
      en: {
        title: 'Emergency Alert',
        message: 'A critical medication emergency has been detected. Your family has been notified.',
        ok: 'OK',
        safe: "I'm Safe",
        help: 'Need Help'
      },
      ms: {
        title: 'Amaran Kecemasan',
        message: 'Kecemasan ubat kritikal telah dikesan. Keluarga anda telah diberitahu.',
        ok: 'OK',
        safe: 'Saya Selamat',
        help: 'Perlukan Bantuan'
      },
      zh: {
        title: '紧急警报',
        message: '检测到关键药物紧急情况。您的家人已收到通知。',
        ok: '确定',
        safe: '我很安全',
        help: '需要帮助'
      },
      ta: {
        title: 'அவசர எச்சரிக்கை',
        message: 'முக்கியமான மருந்து அவசரநிலை கண்டறியப்பட்டது. உங்கள் குடும்பத்திற்கு அறிவிக்கப்பட்டது.',
        ok: 'சரி',
        safe: 'நான் பாதுகாப்பாக இருக்கிறேன்',
        help: 'உதவி தேவை'
      }
    };

    const messages = alertMessages[language as keyof typeof alertMessages] || alertMessages.en;

    Alert.alert(
      messages.title,
      messages.message,
      [
        {
          text: messages.safe,
          onPress: () => respondToEmergency(emergency.id, 'safe')
        },
        {
          text: messages.help,
          style: 'destructive',
          onPress: () => respondToEmergency(emergency.id, 'need_help')
        },
        {
          text: messages.ok,
          style: 'cancel'
        }
      ]
    );
  }, [language]);

  /**
   * Actions object
   */
  const actions: EmergencyDetectionActions = {
    enableDetection: useCallback(async () => {
      setState(prev => ({ ...prev, isEnabled: true }));
      await startMonitoring();
    }, [startMonitoring]),

    disableDetection: useCallback(async () => {
      setState(prev => ({ ...prev, isEnabled: false }));
      stopMonitoring();
    }, [stopMonitoring]),

    triggerManualEmergency: useCallback(async (context = {}) => {
      await detectEmergency('manual_emergency', {
        ...context,
        triggeredAt: new Date(),
        manualTrigger: true
      });
    }, [detectEmergency]),

    resolveEmergency: useCallback(async (emergencyId: string, reason?: string) => {
      try {
        await emergencyEngine.recordEmergencyResponse(
          emergencyId,
          patientId,
          'patient',
          'medication_taken',
          reason
        );

        setState(prev => ({
          ...prev,
          activeEmergencies: emergencyEngine.getActiveEmergencies()
        }));

        options.onEmergencyResolved?.(emergencyId);

      } catch (error) {
        console.error('Failed to resolve emergency:', error);
        setState(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Failed to resolve emergency'
        }));
      }
    }, [emergencyEngine, patientId, options]),

    updateConfig: useCallback(async (configUpdates: Partial<EmergencyDetectionConfig>) => {
      try {
        await emergencyEngine.updateConfiguration(configUpdates);
        const newConfig = emergencyEngine.getConfiguration();

        setState(prev => ({
          ...prev,
          config: newConfig,
          triggers: newConfig.triggers.filter(t => t.detection.enabled)
        }));

        options.onConfigurationChanged?.(newConfig);

      } catch (error) {
        console.error('Failed to update configuration:', error);
        setState(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Failed to update configuration'
        }));
      }
    }, [emergencyEngine, options]),

    addTrigger: useCallback(async (triggerData) => {
      try {
        const newTrigger: EmergencyTriggerCondition = {
          ...triggerData,
          id: `trigger_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          createdAt: new Date(),
          triggerCount: 0,
          isActive: true
        };

        const currentConfig = state.config;
        if (currentConfig) {
          await emergencyEngine.updateConfiguration({
            ...currentConfig,
            triggers: [...currentConfig.triggers, newTrigger]
          });

          setState(prev => ({
            ...prev,
            triggers: [...prev.triggers, newTrigger]
          }));
        }

      } catch (error) {
        console.error('Failed to add trigger:', error);
        setState(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Failed to add trigger'
        }));
      }
    }, [state.config, emergencyEngine]),

    removeTrigger: useCallback(async (triggerId: string) => {
      try {
        const currentConfig = state.config;
        if (currentConfig) {
          const updatedTriggers = currentConfig.triggers.filter(t => t.id !== triggerId);

          await emergencyEngine.updateConfiguration({
            ...currentConfig,
            triggers: updatedTriggers
          });

          setState(prev => ({
            ...prev,
            triggers: prev.triggers.filter(t => t.id !== triggerId)
          }));
        }

      } catch (error) {
        console.error('Failed to remove trigger:', error);
        setState(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Failed to remove trigger'
        }));
      }
    }, [state.config, emergencyEngine]),

    respondToEmergency: useCallback(async (
      emergencyId: string,
      responseType: 'safe' | 'need_help' | 'false_alarm',
      message?: string
    ) => {
      try {
        const mappedResponseType = responseType === 'safe' ? 'patient_safe' :
                                  responseType === 'need_help' ? 'need_help' :
                                  'false_alarm';

        await emergencyEngine.recordEmergencyResponse(
          emergencyId,
          patientId,
          'patient',
          mappedResponseType as any,
          message
        );

        setState(prev => ({
          ...prev,
          activeEmergencies: emergencyEngine.getActiveEmergencies()
        }));

      } catch (error) {
        console.error('Failed to respond to emergency:', error);
        setState(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Failed to respond to emergency'
        }));
      }
    }, [emergencyEngine, patientId]),

    notifyFamily: useCallback(async (emergencyId: string) => {
      try {
        const emergency = state.activeEmergencies.find(e => e.id === emergencyId);
        if (!emergency || !emergency.familyCoordination.familyCircle) return;

        await familyNotificationService.sendFamilyEmergencyNotification(
          emergency,
          emergency.familyCoordination.familyCircle,
          'emergency_alert'
        );

      } catch (error) {
        console.error('Failed to notify family:', error);
        setState(prev => ({
          ...prev,
          error: error instanceof Error ? error.message : 'Failed to notify family'
        }));
      }
    }, [state.activeEmergencies, familyNotificationService]),

    getFamilyResponses: useCallback((emergencyId: string) => {
      return familyNotificationService.getNotificationResponses(emergencyId);
    }, [familyNotificationService]),

    checkEmergencyConditions,

    refreshDetection: useCallback(async () => {
      await checkEmergencyConditions();
    }, [checkEmergencyConditions]),

    clearError: useCallback(() => {
      setState(prev => ({ ...prev, error: null, retryCount: 0, isRetrying: false }));
    }, [])
  };

  // Initialize on mount
  useEffect(() => {
    initialize();

    return () => {
      stopMonitoring();
    };
  }, [initialize, stopMonitoring]);

  // Auto-retry on errors
  useEffect(() => {
    if (state.error && !state.isRetrying && state.retryCount < config.maxRetries) {
      setState(prev => ({ ...prev, isRetrying: true }));

      setTimeout(async () => {
        try {
          await initialize();
          setState(prev => ({ ...prev, error: null, isRetrying: false }));
        } catch (error) {
          setState(prev => ({
            ...prev,
            retryCount: prev.retryCount + 1,
            isRetrying: false
          }));
        }
      }, config.retryDelay);
    }
  }, [state.error, state.isRetrying, state.retryCount, config.maxRetries, config.retryDelay, initialize]);

  return [state, actions];
};

export default useEmergencyDetection;