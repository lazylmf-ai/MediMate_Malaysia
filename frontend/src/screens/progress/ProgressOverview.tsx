/**
 * Progress Overview Screen
 *
 * Main screen for viewing comprehensive medication adherence progress,
 * cultural milestones, and family sharing. Integrates all progress components
 * with navigation and accessibility features for elderly users.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Alert,
  StatusBar,
  RefreshControl,
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { useCulturalTheme, useCulturalStyles } from '@/components/language/ui/CulturalThemeProvider';
import { useTranslation } from '@/i18n/hooks/useTranslation';
import {
  ProgressMetrics,
  MetricPeriod,
  AdherenceRecord,
  AdherenceMilestone,
} from '@/types/adherence';
import { Medication } from '@/types/medication';
import { ProgressTrackingService } from '@/services/analytics/ProgressTrackingService';
import ProgressDashboard from '@/components/progress/ProgressDashboard';

// Navigation types
type RootStackParamList = {
  ProgressOverview: {
    patientId?: string;
    initialPeriod?: MetricPeriod;
    showFamilyView?: boolean;
  };
  ProgressDetail: {
    metrics: ProgressMetrics;
    medication?: Medication;
  };
  MilestoneDetail: {
    milestone: AdherenceMilestone;
  };
  FamilySettings: {
    patientId: string;
  };
  ProgressSettings: undefined;
};

type ProgressOverviewNavigationProp = StackNavigationProp<RootStackParamList, 'ProgressOverview'>;
type ProgressOverviewRouteProp = RouteProp<RootStackParamList, 'ProgressOverview'>;

interface ProgressOverviewProps {}

export const ProgressOverview: React.FC<ProgressOverviewProps> = () => {
  const navigation = useNavigation<ProgressOverviewNavigationProp>();
  const route = useRoute<ProgressOverviewRouteProp>();
  const dispatch = useAppDispatch();
  const { theme, isElderlyMode } = useCulturalTheme();
  const { getCardStyle, getTextStyle, getButtonStyle } = useCulturalStyles();
  const { t } = useTranslation();

  // Route parameters
  const {
    patientId = 'current-user',
    initialPeriod = 'monthly',
    showFamilyView = false,
  } = route.params || {};

  // Redux state
  const { user } = useAppSelector(state => state.auth);
  const { currentMedications } = useAppSelector(state => state.medication);

  // Local state
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [progressService] = useState(() => new ProgressTrackingService());
  const [currentPatientId, setCurrentPatientId] = useState(patientId);

  // Memoized medications list
  const medications = useMemo(() => {
    return currentMedications || [];
  }, [currentMedications]);

  // Navigation handlers
  const handleNavigateToDetail = useCallback((metrics: ProgressMetrics) => {
    navigation.navigate('ProgressDetail', { metrics });
  }, [navigation]);

  const handleNavigateToMilestoneDetail = useCallback((milestone: AdherenceMilestone) => {
    navigation.navigate('MilestoneDetail', { milestone });
  }, [navigation]);

  const handleNavigateToFamilySettings = useCallback(() => {
    navigation.navigate('FamilySettings', { patientId: currentPatientId });
  }, [navigation, currentPatientId]);

  const handleNavigateToSettings = useCallback(() => {
    navigation.navigate('ProgressSettings');
  }, [navigation]);

  // Progress sharing handler
  const handleShareProgress = useCallback((metrics: ProgressMetrics) => {
    Alert.alert(
      t('progress.share.title'),
      t('progress.share.description'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('progress.share.toFamily'),
          onPress: () => {
            // Navigate to family sharing
            handleNavigateToFamilySettings();
          },
        },
        {
          text: t('progress.share.toProvider'),
          onPress: () => {
            // Handle provider sharing
            handleProviderShare(metrics);
          },
        },
        {
          text: t('progress.share.export'),
          onPress: () => {
            // Handle export
            handleExportProgress(metrics);
          },
        },
      ]
    );
  }, [t, handleNavigateToFamilySettings]);

  const handleProviderShare = useCallback(async (metrics: ProgressMetrics) => {
    try {
      // Generate provider report
      const reportResponse = await progressService.generateProviderReport(
        currentPatientId,
        medications,
        [], // Records would be fetched here
        new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        new Date()
      );

      if (reportResponse.success && reportResponse.data) {
        Alert.alert(
          t('progress.share.provider.success.title'),
          t('progress.share.provider.success.message'),
          [{ text: t('common.ok') }]
        );
      } else {
        throw new Error(reportResponse.error);
      }
    } catch (error) {
      Alert.alert(
        t('error.title'),
        t('progress.share.provider.error'),
        [{ text: t('common.ok') }]
      );
    }
  }, [progressService, currentPatientId, medications, t]);

  const handleExportProgress = useCallback((metrics: ProgressMetrics) => {
    Alert.alert(
      t('progress.export.title'),
      t('progress.export.description'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('progress.export.pdf'),
          onPress: () => console.log('Export as PDF'),
        },
        {
          text: t('progress.export.csv'),
          onPress: () => console.log('Export as CSV'),
        },
      ]
    );
  }, [t]);

  // Family sharing handler
  const handleFamilyShare = useCallback((data: any) => {
    Alert.alert(
      t('family.share.success.title'),
      t('family.share.success.message', { count: data.privacy.recipients.length }),
      [{ text: t('common.ok') }]
    );
  }, [t]);

  // Milestone achievement handler
  const handleMilestoneAchieved = useCallback((milestone: AdherenceMilestone) => {
    // Track milestone achievement
    console.log('Milestone achieved:', milestone);

    // Show cultural celebration
    if (milestone.culturalTheme) {
      Alert.alert(
        `🎉 ${milestone.name}`,
        milestone.culturalTheme.message.en,
        [
          { text: t('common.great'), style: 'default' },
          {
            text: t('milestones.viewDetails'),
            onPress: () => handleNavigateToMilestoneDetail(milestone),
          },
        ]
      );
    }
  }, [t, handleNavigateToMilestoneDetail]);

  // Refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // In a real implementation, this would refresh all data
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  }, []);

  // Header component
  const renderHeader = () => (
    <View style={[styles.header, { backgroundColor: theme.colors.primary }]}>
      <StatusBar barStyle="light-content" backgroundColor={theme.colors.primary} />

      <View style={styles.headerContent}>
        <View style={styles.headerLeft}>
          <Text style={[styles.headerTitle, getTextStyle('heading'), { color: theme.colors.surface }]}>
            {t('progress.title')}
          </Text>
          <Text style={[styles.headerSubtitle, getTextStyle('caption'), { color: theme.colors.surface, opacity: 0.8 }]}>
            {t('progress.subtitle')}
          </Text>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity
            style={[styles.headerButton, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}
            onPress={handleNavigateToFamilySettings}
            accessibilityRole="button"
            accessibilityLabel={t('progress.familySettings')}
          >
            <Text style={[styles.headerButtonText, { color: theme.colors.surface }]}>
              👨‍👩‍👧‍👦
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.headerButton, { backgroundColor: 'rgba(255, 255, 255, 0.2)' }]}
            onPress={handleNavigateToSettings}
            accessibilityRole="button"
            accessibilityLabel={t('progress.settings')}
          >
            <Text style={[styles.headerButtonText, { color: theme.colors.surface }]}>
              ⚙️
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  // Quick stats component
  const renderQuickStats = () => (
    <View style={[styles.quickStats, getCardStyle()]}>
      <View style={styles.quickStatsHeader}>
        <Text style={[styles.quickStatsTitle, getTextStyle('heading')]}>
          {t('progress.quickStats.title')}
        </Text>
      </View>

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={[styles.statValue, getTextStyle('heading'), { color: theme.colors.success }]}>
            {medications.length}
          </Text>
          <Text style={[styles.statLabel, getTextStyle('caption')]}>
            {t('progress.quickStats.activeMedications')}
          </Text>
        </View>

        <View style={styles.statItem}>
          <Text style={[styles.statValue, getTextStyle('heading'), { color: theme.colors.primary }]}>
            7
          </Text>
          <Text style={[styles.statLabel, getTextStyle('caption')]}>
            {t('progress.quickStats.weeklyDoses')}
          </Text>
        </View>

        <View style={styles.statItem}>
          <Text style={[styles.statValue, getTextStyle('heading'), { color: theme.colors.warning }]}>
            2
          </Text>
          <Text style={[styles.statLabel, getTextStyle('caption')]}>
            {t('progress.quickStats.upcomingDoses')}
          </Text>
        </View>
      </View>
    </View>
  );

  // Empty state component
  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={[styles.emptyStateIcon, { fontSize: isElderlyMode ? 80 : 60 }]}>
        📊
      </Text>
      <Text style={[styles.emptyStateTitle, getTextStyle('heading')]}>
        {t('progress.empty.title')}
      </Text>
      <Text style={[styles.emptyStateMessage, getTextStyle('body')]}>
        {t('progress.empty.message')}
      </Text>
      <TouchableOpacity
        style={[styles.emptyStateButton, getButtonStyle('primary')]}
        onPress={() => navigation.navigate('MedicationScheduler' as any)}
        accessibilityRole="button"
        accessibilityLabel={t('progress.empty.addMedication')}
      >
        <Text style={[styles.emptyStateButtonText, getTextStyle('body'), { color: theme.colors.surface }]}>
          {t('progress.empty.addMedication')}
        </Text>
      </TouchableOpacity>
    </View>
  );

  // Error state component
  const renderErrorState = () => (
    <View style={styles.errorState}>
      <Text style={[styles.errorStateIcon, { fontSize: isElderlyMode ? 80 : 60 }]}>
        ⚠️
      </Text>
      <Text style={[styles.errorStateTitle, getTextStyle('heading')]}>
        {t('progress.error.title')}
      </Text>
      <Text style={[styles.errorStateMessage, getTextStyle('body')]}>
        {t('progress.error.message')}
      </Text>
      <TouchableOpacity
        style={[styles.errorStateButton, getButtonStyle('primary')]}
        onPress={onRefresh}
        accessibilityRole="button"
        accessibilityLabel={t('progress.error.retry')}
      >
        <Text style={[styles.errorStateButtonText, getTextStyle('body'), { color: theme.colors.surface }]}>
          {t('progress.error.retry')}
        </Text>
      </TouchableOpacity>
    </View>
  );

  // Main content
  const renderContent = () => {
    if (medications.length === 0) {
      return renderEmptyState();
    }

    return (
      <ProgressDashboard
        patientId={currentPatientId}
        medications={medications}
        onNavigateToDetail={handleNavigateToDetail}
        onShareProgress={handleShareProgress}
        showFamilyView={showFamilyView}
      />
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {renderHeader()}

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        showsVerticalScrollIndicator={false}
      >
        {renderQuickStats()}
        {renderContent()}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: StatusBar.currentHeight || 0,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerButtonText: {
    fontSize: 20,
  },
  content: {
    flex: 1,
  },
  quickStats: {
    margin: 16,
    padding: 16,
  },
  quickStatsHeader: {
    marginBottom: 16,
  },
  quickStatsTitle: {
    fontWeight: 'bold',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    textAlign: 'center',
    lineHeight: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    minHeight: 400,
  },
  emptyStateIcon: {
    marginBottom: 20,
  },
  emptyStateTitle: {
    textAlign: 'center',
    marginBottom: 12,
    fontWeight: 'bold',
  },
  emptyStateMessage: {
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
    opacity: 0.7,
  },
  emptyStateButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    alignItems: 'center',
  },
  emptyStateButtonText: {
    fontWeight: '600',
  },
  errorState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
    minHeight: 400,
  },
  errorStateIcon: {
    marginBottom: 20,
  },
  errorStateTitle: {
    textAlign: 'center',
    marginBottom: 12,
    fontWeight: 'bold',
  },
  errorStateMessage: {
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
    opacity: 0.7,
  },
  errorStateButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    alignItems: 'center',
  },
  errorStateButtonText: {
    fontWeight: '600',
  },
});

export default ProgressOverview;