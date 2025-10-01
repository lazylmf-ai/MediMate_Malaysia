/**
 * Family Dashboard Component
 *
 * Main dashboard for family circle management with real-time medication status,
 * emergency alerts, and multi-generational accessibility for Malaysian families.
 * Supports up to 20 family members with <2 second load times.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ActivityIndicator,
  Dimensions,
  SafeAreaView,
} from 'react-native';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { useCulturalTheme, useCulturalStyles } from '@/components/language/ui/CulturalThemeProvider';
import { useTranslation } from '@/i18n/hooks/useTranslation';
import {
  FamilyDashboardProps,
  FamilyDashboardData,
  FamilyMemberWithStatus,
  FamilyNotification,
  FAMILY_UI_CONSTANTS,
} from '@/types/family';
import { useFamilyUpdates } from '@/hooks/family/useFamilyUpdates';
import { useEmergencyDetection } from '@/hooks/emergency/useEmergencyDetection';
import { useFamilyEmergencyCoordination } from '@/hooks/emergency/useFamilyEmergencyCoordination';
import MemberStatusCard from './MemberStatusCard';
import MedicationStatusGrid from './MedicationStatusGrid';
import EmergencyAlerts from './EmergencyAlerts';
import FamilyActivityFeed from './FamilyActivityFeed';
import HealthInsights from './HealthInsights';
import EmergencyConfiguration from '../emergency/EmergencyConfiguration';
import EscalationRules from '../emergency/EscalationRules';
import EscalationPanel from '../emergency/EscalationPanel';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export const FamilyDashboard: React.FC<FamilyDashboardProps> = ({
  familyId,
  onMemberSelect,
  onEmergencyAlert,
  onRefresh,
  refreshing = false,
  culturalSettings = {
    language: 'en',
    showPrayerTimes: false,
    largeText: false,
    highContrast: false,
  },
}) => {
  const dispatch = useAppDispatch();
  const { t } = useTranslation();
  const { currentTheme } = useCulturalTheme();
  const culturalStyles = useCulturalStyles();

  // State management
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | '7d' | '30d'>('today');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showEmergencyOnly, setShowEmergencyOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showEmergencyConfig, setShowEmergencyConfig] = useState(false);
  const [showEscalationRules, setShowEscalationRules] = useState(false);

  // Real-time family data hook
  const {
    dashboardData,
    loading: wsLoading,
    error: wsError,
    connected,
    lastUpdate,
    refresh: refreshData,
    disconnect,
    reconnect,
  } = useFamilyUpdates({
    familyId,
    autoConnect: true,
    culturalContext: {
      respectPrayerTimes: culturalSettings.showPrayerTimes,
      urgencyOverride: true,
      language: culturalSettings.language,
    },
  });

  // Emergency detection for family patients
  const [emergencyState, emergencyActions] = useEmergencyDetection(
    dashboardData?.patientId || '',
    {
      enableBackgroundMonitoring: true,
      autoStart: true,
      culturalConstraints: culturalSettings.showPrayerTimes,
      familyIntegration: true,
      onEmergencyDetected: (emergency) => {
        console.log('Emergency detected on family dashboard:', emergency.id);
        // Emergency will be shown in the EmergencyAlerts component
      },
      onEmergencyResolved: (emergencyId) => {
        console.log('Emergency resolved on family dashboard:', emergencyId);
      },
      onError: (error) => {
        console.error('Emergency detection error:', error);
      }
    }
  );

  // Family emergency coordination
  const [familyEmergencyState, familyEmergencyActions] = useFamilyEmergencyCoordination(
    familyId,
    {
      enableQuickDial: true,
      enableRealTimeUpdates: true,
      respectCulturalConstraints: culturalSettings.showPrayerTimes,
      useFormalLanguage: true,
      onNotificationReceived: (notification) => {
        console.log('Family emergency notification received:', notification.id);
      },
      onEmergencyResolved: (notificationId) => {
        console.log('Family emergency resolved:', notificationId);
      },
      onError: (error) => {
        console.error('Family emergency coordination error:', error);
      }
    }
  );

  // Accessibility settings based on cultural preferences
  const accessibilityMode = useMemo(() => ({
    largeText: culturalSettings.largeText,
    highContrast: culturalSettings.highContrast,
    screenReader: false, // Would be detected from system
    touchTargetSize: culturalSettings.largeText ? 'large' : 'standard',
  }), [culturalSettings]);

  // Filter members based on current view settings
  const filteredMembers = useMemo(() => {
    if (!dashboardData?.members) return [];

    if (showEmergencyOnly) {
      return dashboardData.members.filter(
        member => member.emergencyStatus !== 'normal' ||
                 member.medicationStatus.criticalMissed > 0
      );
    }

    return dashboardData.members;
  }, [dashboardData?.members, showEmergencyOnly]);

  // Emergency notifications requiring immediate attention
  const criticalNotifications = useMemo(() => {
    const dashboardNotifications = dashboardData?.activeNotifications || [];
    const familyNotifications = familyEmergencyState.activeNotifications || [];

    // Combine dashboard notifications and family emergency notifications
    const allNotifications = [
      ...dashboardNotifications.filter(
        notification => notification.severity === 'critical' ||
                       notification.severity === 'high'
      ),
      // Map family emergency notifications to dashboard format
      ...familyNotifications
        .filter(notification => notification.severity === 'critical' || notification.severity === 'high')
        .map(notification => ({
          id: notification.id,
          type: notification.type,
          severity: notification.severity,
          message: notification.content.body[culturalSettings.language] || notification.content.body.en,
          timestamp: notification.tracking.createdAt,
          patientId: notification.patientId,
          isEmergency: true
        }))
    ];

    return allNotifications;
  }, [dashboardData?.activeNotifications, familyEmergencyState.activeNotifications, culturalSettings.language]);

  // Handle member selection
  const handleMemberSelect = useCallback((member: FamilyMemberWithStatus) => {
    onMemberSelect?.(member);
  }, [onMemberSelect]);

  // Handle emergency alert actions
  const handleEmergencyAlert = useCallback((notification: FamilyNotification) => {
    onEmergencyAlert?.(notification);
  }, [onEmergencyAlert]);

  // Handle emergency response actions
  const handleEmergencyResponse = useCallback(async (
    notificationId: string,
    responseType: 'safe' | 'need_help' | 'acknowledge' | 'false_alarm'
  ) => {
    try {
      await familyEmergencyActions.respondToNotification(
        notificationId,
        responseType === 'safe' ? 'patient_safe' :
        responseType === 'need_help' ? 'need_help' :
        responseType === 'acknowledge' ? 'acknowledged' :
        'false_alarm'
      );
    } catch (error) {
      console.error('Failed to respond to emergency:', error);
      Alert.alert(
        t('emergency.response.error.title'),
        t('emergency.response.error.message')
      );
    }
  }, [familyEmergencyActions, t]);

  // Handle quick dial emergency contact
  const handleQuickDial = useCallback(async (contactId: string) => {
    try {
      await familyEmergencyActions.quickDialEmergency(contactId, 'voice');
    } catch (error) {
      console.error('Failed to quick dial emergency contact:', error);
      Alert.alert(
        t('emergency.dial.error.title'),
        t('emergency.dial.error.message')
      );
    }
  }, [familyEmergencyActions, t]);

  // Handle emergency configuration
  const handleEmergencyConfigSaved = useCallback((config: any) => {
    console.log('Emergency configuration saved:', config);
    setShowEmergencyConfig(false);
  }, []);

  // Handle escalation rules saved
  const handleEscalationRulesSaved = useCallback((rules: any) => {
    console.log('Escalation rules saved:', rules);
    setShowEscalationRules(false);
  }, []);

  // Handle refresh
  const handleRefresh = useCallback(async () => {
    setLoading(true);
    try {
      await refreshData();
      await onRefresh?.();
    } catch (error) {
      console.error('Failed to refresh family dashboard:', error);
      Alert.alert(
        t('dashboard.refresh.error.title'),
        t('dashboard.refresh.error.message'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('common.retry'), onPress: handleRefresh },
        ]
      );
    } finally {
      setLoading(false);
    }
  }, [refreshData, onRefresh, t]);

  // Toggle between emergency-only and all members view
  const toggleEmergencyView = useCallback(() => {
    setShowEmergencyOnly(!showEmergencyOnly);
  }, [showEmergencyOnly]);

  // Connection status indicator
  const renderConnectionStatus = () => {
    if (!connected && !wsLoading) {
      return (
        <View style={[styles.connectionStatus, styles.disconnected]}>
          <Text style={[styles.connectionText, culturalStyles.text]}>
            {t('dashboard.connection.disconnected')}
          </Text>
          <TouchableOpacity onPress={reconnect} style={styles.reconnectButton}>
            <Text style={styles.reconnectButtonText}>
              {t('dashboard.connection.reconnect')}
            </Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (wsLoading) {
      return (
        <View style={[styles.connectionStatus, styles.connecting]}>
          <ActivityIndicator size="small" color={currentTheme.colors.primary} />
          <Text style={[styles.connectionText, culturalStyles.text]}>
            {t('dashboard.connection.connecting')}
          </Text>
        </View>
      );
    }

    return null;
  };

  // Dashboard header with controls
  const renderHeader = () => (
    <View style={[styles.header, culturalStyles.cardBackground]}>
      <View style={styles.headerTop}>
        <Text style={[
          styles.familyName,
          culturalStyles.heading,
          accessibilityMode.largeText && styles.largeText
        ]}>
          {dashboardData?.family?.name || t('dashboard.family.loading')}
        </Text>
        <TouchableOpacity
          onPress={toggleEmergencyView}
          style={[
            styles.emergencyToggle,
            showEmergencyOnly && styles.emergencyToggleActive,
            accessibilityMode.touchTargetSize === 'large' && styles.largeTouchTarget
          ]}
          accessibilityLabel={t('dashboard.emergencyView.toggle')}
        >
          <Text style={[
            styles.emergencyToggleText,
            showEmergencyOnly && styles.emergencyToggleTextActive
          ]}>
            {showEmergencyOnly ? t('dashboard.view.all') : t('dashboard.view.emergency')}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={[styles.statNumber, culturalStyles.text]}>
            {filteredMembers.length}
          </Text>
          <Text style={[styles.statLabel, culturalStyles.subtleText]}>
            {t('dashboard.stats.members')}
          </Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statNumber, culturalStyles.text,
            criticalNotifications.length > 0 && styles.emergencyNumber]}>
            {criticalNotifications.length}
          </Text>
          <Text style={[styles.statLabel, culturalStyles.subtleText]}>
            {t('dashboard.stats.alerts')}
          </Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statNumber, culturalStyles.text]}>
            {dashboardData?.medicationSummary.reduce((sum, member) =>
              sum + member.medicationCount, 0) || 0}
          </Text>
          <Text style={[styles.statLabel, culturalStyles.subtleText]}>
            {t('dashboard.stats.medications')}
          </Text>
        </View>
      </View>

      {lastUpdate && (
        <Text style={[styles.lastUpdate, culturalStyles.subtleText]}>
          {t('dashboard.lastUpdate', {
            time: new Date(lastUpdate).toLocaleTimeString(culturalSettings.language)
          })}
        </Text>
      )}
    </View>
  );

  // Loading state
  if (loading || (!dashboardData && wsLoading)) {
    return (
      <SafeAreaView style={[styles.container, culturalStyles.background]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={currentTheme.colors.primary} />
          <Text style={[styles.loadingText, culturalStyles.text]}>
            {t('dashboard.loading')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // Error state
  if (wsError && !dashboardData) {
    return (
      <SafeAreaView style={[styles.container, culturalStyles.background]}>
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, culturalStyles.text]}>
            {t('dashboard.error.message')}
          </Text>
          <TouchableOpacity onPress={handleRefresh} style={styles.retryButton}>
            <Text style={styles.retryButtonText}>
              {t('common.retry')}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, culturalStyles.background]}>
      {renderConnectionStatus()}

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || loading}
            onRefresh={handleRefresh}
            tintColor={currentTheme.colors.primary}
            colors={[currentTheme.colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {renderHeader()}

        {/* Emergency Alerts Section */}
        {criticalNotifications.length > 0 && (
          <View style={styles.section}>
            <EmergencyAlerts
              notifications={criticalNotifications}
              onAlertAction={(notificationId, action) => {
                handleEmergencyResponse(notificationId, action);
              }}
              onCallEmergency={(memberId) => {
                handleQuickDial(memberId);
              }}
              culturalEmergencyProtocol={true}
              maxAlertsDisplayed={5}
            />
          </View>
        )}

        {/* Emergency Management Panel */}
        {(emergencyState.activeEmergencies.length > 0 || familyEmergencyState.unreadCount > 0) && (
          <View style={styles.section}>
            <EscalationPanel
              activeEmergencies={emergencyState.activeEmergencies}
              familyNotifications={familyEmergencyState.activeNotifications}
              emergencyContacts={familyEmergencyState.emergencyContacts}
              onQuickDial={handleQuickDial}
              onEmergencyResponse={handleEmergencyResponse}
              onConfigureEmergency={() => setShowEmergencyConfig(true)}
              culturalSettings={culturalSettings}
            />
          </View>
        )}

        {/* Family Members Grid/List */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, culturalStyles.heading]}>
              {t('dashboard.members.title')}
            </Text>
            <TouchableOpacity
              onPress={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
              style={styles.viewToggle}
            >
              <Text style={[styles.viewToggleText, culturalStyles.text]}>
                {viewMode === 'grid' ? t('dashboard.view.list') : t('dashboard.view.grid')}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={viewMode === 'grid' ? styles.membersGrid : styles.membersList}>
            {filteredMembers.map((member) => (
              <MemberStatusCard
                key={member.id}
                member={member}
                onPress={() => handleMemberSelect(member)}
                onEmergencyContact={() => {
                  // Handle emergency contact
                  console.log('Emergency contact for:', member.id);
                }}
                showFullDetails={viewMode === 'list'}
                compactMode={viewMode === 'grid'}
                accessibilityMode={accessibilityMode.largeText}
              />
            ))}
          </View>
        </View>

        {/* Medication Status Overview */}
        {dashboardData?.medicationSummary && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, culturalStyles.heading]}>
              {t('dashboard.medications.title')}
            </Text>
            <MedicationStatusGrid
              medications={dashboardData.medicationSummary}
              onMedicationPress={(userId, medicationId) => {
                // Handle medication press
                console.log('Medication press:', userId, medicationId);
              }}
              gridLayout={viewMode}
              showEmergencyOnly={showEmergencyOnly}
              culturalContext={{
                language: culturalSettings.language,
                prayerAware: culturalSettings.showPrayerTimes,
              }}
            />
          </View>
        )}

        {/* Health Insights */}
        {dashboardData && (
          <View style={styles.section}>
            <HealthInsights
              familyData={dashboardData}
              timeRange={selectedPeriod === 'today' ? '24h' : selectedPeriod}
              onInsightPress={(insight) => {
                // Handle insight press
                console.log('Insight press:', insight);
              }}
              showTrends={true}
              culturalHealthMetrics={true}
            />
          </View>
        )}

        {/* Recent Activity Feed */}
        {dashboardData?.recentActivity && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, culturalStyles.heading]}>
              {t('dashboard.activity.title')}
            </Text>
            <FamilyActivityFeed
              activities={dashboardData.recentActivity}
              onActivityPress={(activity) => {
                // Handle activity press
                console.log('Activity press:', activity);
              }}
              maxActivities={FAMILY_UI_CONSTANTS.MAX_RECENT_ACTIVITIES}
              showAvatars={true}
              compactMode={false}
              filterByType={showEmergencyOnly ? ['emergency_triggered', 'medication_missed'] : undefined}
            />
          </View>
        )}
      </ScrollView>

      {/* Emergency Configuration Modal */}
      {showEmergencyConfig && (
        <EmergencyConfiguration
          patientId={dashboardData?.patientId || ''}
          onConfigSaved={handleEmergencyConfigSaved}
          onError={(error) => {
            console.error('Emergency configuration error:', error);
            Alert.alert(
              t('emergency.config.error.title'),
              t('emergency.config.error.message')
            );
          }}
        />
      )}

      {/* Escalation Rules Modal */}
      {showEscalationRules && (
        <EscalationRules
          patientId={dashboardData?.patientId || ''}
          onRulesSaved={handleEscalationRulesSaved}
          onError={(error) => {
            console.error('Escalation rules error:', error);
            Alert.alert(
              t('emergency.escalation.error.title'),
              t('emergency.escalation.error.message')
            );
          }}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  connecting: {
    backgroundColor: '#FEF3C7',
  },
  disconnected: {
    backgroundColor: '#FEE2E2',
  },
  connectionText: {
    fontSize: 14,
    marginLeft: 8,
  },
  reconnectButton: {
    marginLeft: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
    backgroundColor: '#3B82F6',
    borderRadius: 4,
  },
  reconnectButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  header: {
    margin: 16,
    padding: 20,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  familyName: {
    fontSize: 24,
    fontWeight: 'bold',
    flex: 1,
  },
  largeText: {
    fontSize: 32,
  },
  emergencyToggle: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    minHeight: 44,
    justifyContent: 'center',
  },
  emergencyToggleActive: {
    backgroundColor: '#EF4444',
  },
  emergencyToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  emergencyToggleTextActive: {
    color: '#FFFFFF',
  },
  largeTouchTarget: {
    minHeight: 64,
    paddingHorizontal: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 12,
  },
  stat: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  emergencyNumber: {
    color: '#EF4444',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 4,
  },
  lastUpdate: {
    fontSize: 12,
    textAlign: 'center',
  },
  section: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  viewToggle: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
  },
  viewToggleText: {
    fontSize: 14,
    fontWeight: '500',
  },
  membersGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  membersList: {
    gap: 12,
  },
});

export default FamilyDashboard;