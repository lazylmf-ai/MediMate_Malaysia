/**
 * Emergency Alerts Component
 *
 * Displays critical family notifications with cultural emergency protocols,
 * immediate action buttons, and escalation capabilities for Malaysian families.
 * Optimized for high-stress situations with clear visual hierarchy.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Animated,
  Vibration,
  Linking,
  Platform,
} from 'react-native';
import { useCulturalTheme, useCulturalStyles } from '@/components/language/ui/CulturalThemeProvider';
import { useTranslation } from '@/i18n/hooks/useTranslation';
import {
  EmergencyAlertsProps,
  FamilyNotification,
  NotificationSeverity,
  FAMILY_UI_CONSTANTS,
} from '@/types/family';

interface AlertActionState {
  [alertId: string]: {
    acknowledged: boolean;
    processing: boolean;
    resolved: boolean;
  };
}

const EMERGENCY_PHONE = '999'; // Malaysia emergency number
const PULSE_ANIMATION_DURATION = 1000;

export const EmergencyAlerts: React.FC<EmergencyAlertsProps> = ({
  notifications,
  onAlertAction,
  onCallEmergency,
  culturalEmergencyProtocol = true,
  maxAlertsDisplayed = 5,
}) => {
  const { t } = useTranslation();
  const { currentTheme } = useCulturalTheme();
  const culturalStyles = useCulturalStyles();

  // State for alert actions
  const [alertStates, setAlertStates] = useState<AlertActionState>({});
  const [expandedAlerts, setExpandedAlerts] = useState<Set<string>>(new Set());

  // Animation values for pulsing critical alerts
  const pulseAnimations = useMemo(() => {
    const animations: { [key: string]: Animated.Value } = {};
    notifications.forEach(notification => {
      if (notification.severity === 'critical') {
        animations[notification.id] = new Animated.Value(1);
      }
    });
    return animations;
  }, [notifications]);

  // Start pulse animation for critical alerts
  useEffect(() => {
    Object.entries(pulseAnimations).forEach(([alertId, animatedValue]) => {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(animatedValue, {
            toValue: 1.1,
            duration: PULSE_ANIMATION_DURATION / 2,
            useNativeDriver: true,
          }),
          Animated.timing(animatedValue, {
            toValue: 1,
            duration: PULSE_ANIMATION_DURATION / 2,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();

      return () => pulse.stop();
    });
  }, [pulseAnimations]);

  // Trigger vibration for critical alerts
  useEffect(() => {
    const criticalAlerts = notifications.filter(n => n.severity === 'critical');
    if (criticalAlerts.length > 0 && Platform.OS !== 'web') {
      // Malaysian emergency vibration pattern: 3 long, 3 short, 3 long (SOS)
      Vibration.vibrate([100, 100, 100, 100, 100, 100, 300, 100, 300, 100, 300]);
    }
  }, [notifications]);

  // Sort alerts by severity and timestamp
  const sortedAlerts = useMemo(() => {
    const severityOrder: Record<NotificationSeverity, number> = {
      critical: 0,
      high: 1,
      medium: 2,
      low: 3,
    };

    return notifications
      .slice(0, maxAlertsDisplayed)
      .sort((a, b) => {
        const severityDiff = severityOrder[a.severity] - severityOrder[b.severity];
        if (severityDiff !== 0) return severityDiff;

        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [notifications, maxAlertsDisplayed]);

  // Get alert styling based on severity
  const getAlertStyle = useCallback((severity: NotificationSeverity) => {
    switch (severity) {
      case 'critical':
        return {
          backgroundColor: FAMILY_UI_CONSTANTS.EMERGENCY_COLORS.CRITICAL,
          borderColor: '#B91C1C',
          textColor: '#FFFFFF',
        };
      case 'high':
        return {
          backgroundColor: FAMILY_UI_CONSTANTS.EMERGENCY_COLORS.EMERGENCY,
          borderColor: '#B45309',
          textColor: '#FFFFFF',
        };
      case 'medium':
        return {
          backgroundColor: FAMILY_UI_CONSTANTS.EMERGENCY_COLORS.WARNING,
          borderColor: '#A16207',
          textColor: '#000000',
        };
      default:
        return {
          backgroundColor: '#F3F4F6',
          borderColor: '#D1D5DB',
          textColor: '#374151',
        };
    }
  }, []);

  // Handle alert action
  const handleAlertAction = useCallback(async (
    notificationId: string,
    action: 'acknowledge' | 'resolve' | 'escalate'
  ) => {
    setAlertStates(prev => ({
      ...prev,
      [notificationId]: {
        ...prev[notificationId],
        processing: true,
      }
    }));

    try {
      await onAlertAction?.(notificationId, action);

      setAlertStates(prev => ({
        ...prev,
        [notificationId]: {
          ...prev[notificationId],
          processing: false,
          acknowledged: action === 'acknowledge',
          resolved: action === 'resolve',
        }
      }));

      if (action === 'resolve') {
        // Auto-collapse resolved alerts after 2 seconds
        setTimeout(() => {
          setExpandedAlerts(prev => {
            const newSet = new Set(prev);
            newSet.delete(notificationId);
            return newSet;
          });
        }, 2000);
      }
    } catch (error) {
      console.error('Failed to handle alert action:', error);
      setAlertStates(prev => ({
        ...prev,
        [notificationId]: {
          ...prev[notificationId],
          processing: false,
        }
      }));

      Alert.alert(
        t('emergency.action.error.title'),
        t('emergency.action.error.message'),
        [{ text: t('common.ok') }]
      );
    }
  }, [onAlertAction, t]);

  // Handle emergency call
  const handleEmergencyCall = useCallback((memberId?: string) => {
    const alertTitle = culturalEmergencyProtocol
      ? t('emergency.call.title.cultural')
      : t('emergency.call.title.standard');

    const alertMessage = culturalEmergencyProtocol
      ? t('emergency.call.message.cultural')
      : t('emergency.call.message.standard');

    Alert.alert(
      alertTitle,
      alertMessage,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('emergency.call.family'),
          onPress: () => onCallEmergency?.(memberId || ''),
        },
        {
          text: t('emergency.call.services', { number: EMERGENCY_PHONE }),
          style: 'destructive',
          onPress: () => Linking.openURL(`tel:${EMERGENCY_PHONE}`),
        },
      ]
    );
  }, [culturalEmergencyProtocol, onCallEmergency, t]);

  // Toggle alert expansion
  const toggleAlertExpansion = useCallback((alertId: string) => {
    setExpandedAlerts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(alertId)) {
        newSet.delete(alertId);
      } else {
        newSet.add(alertId);
      }
      return newSet;
    });
  }, []);

  // Format time for display
  const formatAlertTime = useCallback((date: Date) => {
    const now = new Date();
    const alertTime = new Date(date);
    const diffMinutes = Math.floor((now.getTime() - alertTime.getTime()) / (1000 * 60));

    if (diffMinutes < 1) return t('emergency.time.now');
    if (diffMinutes < 60) return t('emergency.time.minutes', { minutes: diffMinutes });

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return t('emergency.time.hours', { hours: diffHours });

    return alertTime.toLocaleDateString();
  }, [t]);

  // Render individual alert
  const renderAlert = useCallback((notification: FamilyNotification) => {
    const alertStyle = getAlertStyle(notification.severity);
    const isExpanded = expandedAlerts.has(notification.id);
    const alertState = alertStates[notification.id] || {};
    const animatedValue = pulseAnimations[notification.id];

    const alertContainer = (
      <View
        style={[
          styles.alertCard,
          {
            backgroundColor: alertStyle.backgroundColor,
            borderColor: alertStyle.borderColor,
          },
          alertState.resolved && styles.resolvedAlert,
        ]}
      >
        {/* Alert Header */}
        <TouchableOpacity
          style={styles.alertHeader}
          onPress={() => toggleAlertExpansion(notification.id)}
          activeOpacity={0.7}
        >
          <View style={styles.alertHeaderContent}>
            <View style={styles.alertTitleRow}>
              <Text style={[
                styles.alertTitle,
                { color: alertStyle.textColor },
                notification.severity === 'critical' && styles.criticalTitle,
              ]}>
                {notification.title}
              </Text>

              <View style={styles.alertMeta}>
                <Text style={[
                  styles.alertTime,
                  { color: alertStyle.textColor },
                  styles.alertTimeOpacity,
                ]}>
                  {formatAlertTime(notification.createdAt)}
                </Text>

                <View style={[
                  styles.severityBadge,
                  notification.severity === 'critical' && styles.criticalBadge,
                ]}>
                  <Text style={[
                    styles.severityText,
                    { color: alertStyle.textColor },
                  ]}>
                    {t(`emergency.severity.${notification.severity}`)}
                  </Text>
                </View>
              </View>
            </View>

            <Text style={[
              styles.alertMessage,
              { color: alertStyle.textColor },
              styles.alertMessageOpacity,
            ]} numberOfLines={isExpanded ? undefined : 2}>
              {notification.message}
            </Text>
          </View>

          <Text style={[
            styles.expandIcon,
            { color: alertStyle.textColor },
          ]}>
            {isExpanded ? '▼' : '▶'}
          </Text>
        </TouchableOpacity>

        {/* Alert Actions - Shown when expanded */}
        {isExpanded && (
          <View style={styles.alertActions}>
            {!alertState.acknowledged && !alertState.resolved && (
              <TouchableOpacity
                style={[styles.actionButton, styles.acknowledgeButton]}
                onPress={() => handleAlertAction(notification.id, 'acknowledge')}
                disabled={alertState.processing}
              >
                <Text style={styles.actionButtonText}>
                  {alertState.processing
                    ? t('emergency.action.processing')
                    : t('emergency.action.acknowledge')
                  }
                </Text>
              </TouchableOpacity>
            )}

            {!alertState.resolved && (
              <TouchableOpacity
                style={[styles.actionButton, styles.resolveButton]}
                onPress={() => handleAlertAction(notification.id, 'resolve')}
                disabled={alertState.processing}
              >
                <Text style={styles.actionButtonText}>
                  {t('emergency.action.resolve')}
                </Text>
              </TouchableOpacity>
            )}

            {notification.severity === 'critical' && (
              <TouchableOpacity
                style={[styles.actionButton, styles.escalateButton]}
                onPress={() => handleAlertAction(notification.id, 'escalate')}
                disabled={alertState.processing}
              >
                <Text style={styles.actionButtonText}>
                  {t('emergency.action.escalate')}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.actionButton, styles.callButton]}
              onPress={() => handleEmergencyCall(notification.metadata?.memberId)}
            >
              <Text style={styles.actionButtonText}>
                {t('emergency.action.call')}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Status Indicators */}
        {(alertState.acknowledged || alertState.resolved) && (
          <View style={styles.statusIndicators}>
            {alertState.acknowledged && (
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>
                  ✓ {t('emergency.status.acknowledged')}
                </Text>
              </View>
            )}
            {alertState.resolved && (
              <View style={[styles.statusBadge, styles.resolvedBadge]}>
                <Text style={[styles.statusText, styles.resolvedText]}>
                  ✓ {t('emergency.status.resolved')}
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    );

    // Wrap critical alerts with pulse animation
    if (notification.severity === 'critical' && animatedValue && !alertState.resolved) {
      return (
        <Animated.View
          key={notification.id}
          style={[
            styles.alertWrapper,
            { transform: [{ scale: animatedValue }] }
          ]}
        >
          {alertContainer}
        </Animated.View>
      );
    }

    return (
      <View key={notification.id} style={styles.alertWrapper}>
        {alertContainer}
      </View>
    );
  }, [
    getAlertStyle,
    expandedAlerts,
    alertStates,
    pulseAnimations,
    toggleAlertExpansion,
    formatAlertTime,
    handleAlertAction,
    handleEmergencyCall,
    t,
  ]);

  if (sortedAlerts.length === 0) {
    return null;
  }

  return (
    <View style={[styles.container, culturalStyles.cardBackground]}>
      <View style={styles.header}>
        <Text style={[styles.headerTitle, culturalStyles.heading]}>
          {t('emergency.alerts.title')}
        </Text>
        <View style={styles.alertCount}>
          <Text style={[styles.alertCountText, culturalStyles.text]}>
            {sortedAlerts.length}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.alertsList}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
      >
        {sortedAlerts.map(renderAlert)}
      </ScrollView>

      {/* Cultural Emergency Info */}
      {culturalEmergencyProtocol && (
        <View style={styles.culturalInfo}>
          <Text style={[styles.culturalInfoText, culturalStyles.subtleText]}>
            {t('emergency.cultural.info')}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  alertCount: {
    backgroundColor: '#EF4444',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertCountText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  alertsList: {
    maxHeight: 400,
  },
  alertWrapper: {
    marginBottom: 12,
  },
  alertCard: {
    borderRadius: 8,
    borderWidth: 2,
    overflow: 'hidden',
  },
  resolvedAlert: {
    opacity: 0.7,
  },
  alertHeader: {
    flexDirection: 'row',
    padding: 16,
  },
  alertHeaderContent: {
    flex: 1,
  },
  alertTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  alertTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 12,
  },
  criticalTitle: {
    fontSize: 18,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  alertMeta: {
    alignItems: 'flex-end',
  },
  alertTime: {
    fontSize: 12,
    marginBottom: 4,
  },
  alertTimeOpacity: {
    opacity: 0.8,
  },
  severityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  criticalBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  severityText: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  alertMessage: {
    fontSize: 14,
    lineHeight: 20,
  },
  alertMessageOpacity: {
    opacity: 0.9,
  },
  expandIcon: {
    fontSize: 16,
    marginLeft: 8,
    alignSelf: 'center',
  },
  alertActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    padding: 16,
    paddingTop: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  actionButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
  acknowledgeButton: {
    backgroundColor: '#3B82F6',
  },
  resolveButton: {
    backgroundColor: '#10B981',
  },
  escalateButton: {
    backgroundColor: '#DC2626',
  },
  callButton: {
    backgroundColor: '#7C3AED',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  statusIndicators: {
    flexDirection: 'row',
    gap: 8,
    padding: 16,
    paddingTop: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: '#3B82F6',
  },
  resolvedBadge: {
    backgroundColor: '#10B981',
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  resolvedText: {
    color: '#FFFFFF',
  },
  culturalInfo: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#F0F9FF',
    borderRadius: 6,
  },
  culturalInfoText: {
    fontSize: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});

export default EmergencyAlerts;