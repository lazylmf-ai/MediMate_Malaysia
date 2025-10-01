/**
 * Progress Dashboard Component
 *
 * Main dashboard displaying comprehensive medication adherence progress
 * with cultural themes, interactive metrics, and family sharing capabilities.
 * Optimized for elderly users with accessibility compliance.
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
} from 'react-native';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { useCulturalTheme, useCulturalStyles } from '@/components/language/ui/CulturalThemeProvider';
import { useTranslation } from '@/i18n/hooks/useTranslation';
import {
  ProgressMetrics,
  MetricPeriod,
  AdherenceRecord,
  StreakData,
  AdherencePattern,
  CulturalInsight,
} from '@/types/adherence';
import { Medication } from '@/types/medication';
import { ProgressTrackingService } from '@/services/analytics/ProgressTrackingService';
import AdherenceChart from './AdherenceChart';
import CulturalMilestoneCard from './CulturalMilestoneCard';
import FamilyProgressView from './FamilyProgressView';

const { width: screenWidth } = Dimensions.get('window');

interface ProgressDashboardProps {
  patientId: string;
  medications: Medication[];
  onNavigateToDetail?: (metric: ProgressMetrics) => void;
  onShareProgress?: (metrics: ProgressMetrics) => void;
  showFamilyView?: boolean;
}

export const ProgressDashboard: React.FC<ProgressDashboardProps> = ({
  patientId,
  medications,
  onNavigateToDetail,
  onShareProgress,
  showFamilyView = false,
}) => {
  const dispatch = useAppDispatch();
  const { theme, isElderlyMode } = useCulturalTheme();
  const { getCardStyle, getTextStyle, getButtonStyle } = useCulturalStyles();
  const { t } = useTranslation();

  // State management
  const [progressMetrics, setProgressMetrics] = useState<ProgressMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<MetricPeriod>('monthly');
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['overview']));
  const [progressService] = useState(() => new ProgressTrackingService());

  // Load progress data
  useEffect(() => {
    loadProgressData();
  }, [patientId, medications, selectedPeriod]);

  const loadProgressData = useCallback(async () => {
    if (!patientId || medications.length === 0) return;

    try {
      setIsLoading(true);

      // In a real app, this would fetch from a database
      // For now, we'll generate sample data
      const mockRecords: AdherenceRecord[] = generateMockRecords(patientId, medications);

      const response = await progressService.getProgressMetrics(
        patientId,
        medications,
        mockRecords,
        selectedPeriod
      );

      if (response.success && response.data) {
        setProgressMetrics(response.data);
      } else {
        throw new Error(response.error || 'Failed to load progress data');
      }
    } catch (error) {
      console.error('Error loading progress data:', error);
      Alert.alert(
        t('error.title'),
        t('progress.errors.loadFailed'),
        [{ text: t('common.ok') }]
      );
    } finally {
      setIsLoading(false);
    }
  }, [patientId, medications, selectedPeriod, progressService, t]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadProgressData();
    setRefreshing(false);
  }, [loadProgressData]);

  const handlePeriodChange = useCallback((period: MetricPeriod) => {
    setSelectedPeriod(period);
  }, []);

  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  }, []);

  const handleShareProgress = useCallback(() => {
    if (progressMetrics && onShareProgress) {
      onShareProgress(progressMetrics);
    } else {
      Alert.alert(
        t('progress.share.title'),
        t('progress.share.description'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('progress.share.confirm'), onPress: () => console.log('Share progress') },
        ]
      );
    }
  }, [progressMetrics, onShareProgress, t]);

  const renderPeriodSelector = () => {
    const periods: MetricPeriod[] = ['daily', 'weekly', 'monthly', 'quarterly'];

    return (
      <View style={[styles.periodSelector, getCardStyle()]}>
        <Text style={[styles.selectorTitle, getTextStyle('heading')]}>
          {t('progress.period.title')}
        </Text>
        <View style={styles.periodButtons}>
          {periods.map((period) => (
            <TouchableOpacity
              key={period}
              style={[
                styles.periodButton,
                getButtonStyle(selectedPeriod === period ? 'primary' : 'tertiary'),
                selectedPeriod === period && styles.activePeriod,
              ]}
              onPress={() => handlePeriodChange(period)}
              accessibilityRole="button"
              accessibilityLabel={t(`progress.period.${period}`)}
            >
              <Text
                style={[
                  styles.periodButtonText,
                  getTextStyle('body'),
                  { color: selectedPeriod === period ? theme.colors.surface : theme.colors.text },
                ]}
              >
                {t(`progress.period.${period}`)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  const renderOverviewMetrics = () => {
    if (!progressMetrics) return null;

    const isExpanded = expandedSections.has('overview');

    return (
      <View style={[styles.section, getCardStyle()]}>
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => toggleSection('overview')}
          accessibilityRole="button"
          accessibilityLabel={t('progress.overview.toggle')}
        >
          <Text style={[styles.sectionTitle, getTextStyle('heading')]}>
            {t('progress.overview.title')}
          </Text>
          <Text style={[styles.expandIcon, getTextStyle('heading')]}>
            {isExpanded ? '−' : '+'}
          </Text>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.sectionContent}>
            {/* Overall Adherence */}
            <View style={styles.metricRow}>
              <View style={styles.circularProgress}>
                <View
                  style={[
                    styles.progressCircle,
                    {
                      backgroundColor: theme.colors.surface,
                      borderColor: getAdherenceColor(progressMetrics.overallAdherence),
                      borderWidth: 6,
                    },
                  ]}
                >
                  <Text style={[styles.progressValue, getTextStyle('heading')]}>
                    {Math.round(progressMetrics.overallAdherence)}%
                  </Text>
                  <Text style={[styles.progressLabel, getTextStyle('caption')]}>
                    {t('progress.adherence.overall')}
                  </Text>
                </View>
              </View>

              <View style={styles.metricsGrid}>
                <View style={styles.metricItem}>
                  <Text style={[styles.metricValue, getTextStyle('heading'), { color: theme.colors.success }]}>
                    {progressMetrics.streaks.currentStreak}
                  </Text>
                  <Text style={[styles.metricLabel, getTextStyle('caption')]}>
                    {t('progress.streak.current')}
                  </Text>
                </View>

                <View style={styles.metricItem}>
                  <Text style={[styles.metricValue, getTextStyle('heading'), { color: theme.colors.accent }]}>
                    {progressMetrics.streaks.longestStreak}
                  </Text>
                  <Text style={[styles.metricLabel, getTextStyle('caption')]}>
                    {t('progress.streak.longest')}
                  </Text>
                </View>

                <View style={styles.metricItem}>
                  <Text style={[styles.metricValue, getTextStyle('heading'), { color: theme.colors.primary }]}>
                    {progressMetrics.medications.length}
                  </Text>
                  <Text style={[styles.metricLabel, getTextStyle('caption')]}>
                    {t('progress.medications.count')}
                  </Text>
                </View>
              </View>
            </View>

            {/* Quick Actions */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.actionButton, getButtonStyle('secondary')]}
                onPress={() => onNavigateToDetail?.(progressMetrics)}
                accessibilityRole="button"
                accessibilityLabel={t('progress.actions.viewDetails')}
              >
                <Text style={[styles.actionButtonText, getTextStyle('body'), { color: theme.colors.surface }]}>
                  {t('progress.actions.viewDetails')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, getButtonStyle('tertiary')]}
                onPress={handleShareProgress}
                accessibilityRole="button"
                accessibilityLabel={t('progress.actions.share')}
              >
                <Text style={[styles.actionButtonText, getTextStyle('body')]}>
                  {t('progress.actions.share')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    );
  };

  const renderAdherenceChart = () => {
    if (!progressMetrics) return null;

    const isExpanded = expandedSections.has('chart');

    return (
      <View style={[styles.section, getCardStyle()]}>
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => toggleSection('chart')}
          accessibilityRole="button"
          accessibilityLabel={t('progress.chart.toggle')}
        >
          <Text style={[styles.sectionTitle, getTextStyle('heading')]}>
            {t('progress.chart.title')}
          </Text>
          <Text style={[styles.expandIcon, getTextStyle('heading')]}>
            {isExpanded ? '−' : '+'}
          </Text>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.sectionContent}>
            <AdherenceChart
              metrics={progressMetrics}
              period={selectedPeriod}
              height={200}
              culturalTheme={true}
            />
          </View>
        )}
      </View>
    );
  };

  const renderMilestones = () => {
    if (!progressMetrics?.patterns) return null;

    const isExpanded = expandedSections.has('milestones');

    return (
      <View style={[styles.section, getCardStyle()]}>
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => toggleSection('milestones')}
          accessibilityRole="button"
          accessibilityLabel={t('progress.milestones.toggle')}
        >
          <Text style={[styles.sectionTitle, getTextStyle('heading')]}>
            {t('progress.milestones.title')}
          </Text>
          <Text style={[styles.expandIcon, getTextStyle('heading')]}>
            {isExpanded ? '−' : '+'}
          </Text>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.sectionContent}>
            <CulturalMilestoneCard
              streakData={progressMetrics.streaks}
              adherenceRate={progressMetrics.overallAdherence}
              culturalInsights={progressMetrics.culturalInsights}
              onMilestoneAchieved={(milestone) => {
                console.log('Milestone achieved:', milestone);
              }}
            />
          </View>
        )}
      </View>
    );
  };

  const renderFamilyView = () => {
    if (!showFamilyView || !progressMetrics) return null;

    const isExpanded = expandedSections.has('family');

    return (
      <View style={[styles.section, getCardStyle()]}>
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => toggleSection('family')}
          accessibilityRole="button"
          accessibilityLabel={t('progress.family.toggle')}
        >
          <Text style={[styles.sectionTitle, getTextStyle('heading')]}>
            {t('progress.family.title')}
          </Text>
          <Text style={[styles.expandIcon, getTextStyle('heading')]}>
            {isExpanded ? '−' : '+'}
          </Text>
        </TouchableOpacity>

        {isExpanded && (
          <View style={styles.sectionContent}>
            <FamilyProgressView
              patientId={patientId}
              progressMetrics={progressMetrics}
              onFamilyShare={(data) => {
                console.log('Family share:', data);
              }}
            />
          </View>
        )}
      </View>
    );
  };

  const getAdherenceColor = (adherence: number): string => {
    if (adherence >= 80) return theme.colors.success;
    if (adherence >= 60) return theme.colors.warning;
    return theme.colors.error;
  };

  // Mock data generator for demonstration
  const generateMockRecords = (patientId: string, medications: Medication[]): AdherenceRecord[] => {
    const records: AdherenceRecord[] = [];
    const now = new Date();

    medications.forEach((medication) => {
      for (let i = 0; i < 30; i++) {
        const scheduledTime = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const adherenceRate = Math.random();

        let status: AdherenceRecord['status'];
        let delayMinutes: number | undefined;

        if (adherenceRate > 0.8) {
          status = 'taken_on_time';
        } else if (adherenceRate > 0.6) {
          status = 'taken_late';
          delayMinutes = Math.floor(Math.random() * 120);
        } else if (adherenceRate > 0.4) {
          status = 'taken_early';
          delayMinutes = Math.floor(Math.random() * 30);
        } else {
          status = 'missed';
        }

        records.push({
          id: `${medication.id}_${i}`,
          medicationId: medication.id,
          patientId,
          scheduledTime,
          takenTime: status !== 'missed' ? new Date(scheduledTime.getTime() + (delayMinutes || 0) * 60 * 1000) : undefined,
          status,
          adherenceScore: status === 'taken_on_time' ? 100 : status === 'missed' ? 0 : 70,
          method: 'manual',
          delayMinutes,
          createdAt: scheduledTime,
          updatedAt: scheduledTime,
        });
      }
    });

    return records;
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, getTextStyle('body')]}>
          {t('progress.loading')}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          colors={[theme.colors.primary]}
        />
      }
      showsVerticalScrollIndicator={false}
      accessibilityRole="scrollbar"
    >
      {renderPeriodSelector()}
      {renderOverviewMetrics()}
      {renderAdherenceChart()}
      {renderMilestones()}
      {renderFamilyView()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    textAlign: 'center',
  },
  periodSelector: {
    margin: 16,
  },
  selectorTitle: {
    marginBottom: 12,
  },
  periodButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  periodButton: {
    flex: 1,
    minWidth: 70,
    alignItems: 'center',
  },
  activePeriod: {
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  periodButtonText: {
    textAlign: 'center',
  },
  section: {
    margin: 16,
    marginTop: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
  },
  sectionTitle: {
    flex: 1,
  },
  expandIcon: {
    width: 30,
    textAlign: 'center',
    fontSize: 20,
  },
  sectionContent: {
    paddingTop: 8,
  },
  metricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  circularProgress: {
    marginRight: 20,
  },
  progressCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressValue: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  progressLabel: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 2,
  },
  metricsGrid: {
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricItem: {
    flex: 1,
    minWidth: 80,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  metricLabel: {
    textAlign: 'center',
    marginTop: 4,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
  },
  actionButtonText: {
    fontWeight: '600',
  },
});

export default ProgressDashboard;