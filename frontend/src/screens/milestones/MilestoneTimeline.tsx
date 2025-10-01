/**
 * Milestone Timeline Screen
 *
 * Displays a comprehensive timeline of medication adherence milestones
 * with Malaysian cultural themes, family sharing capabilities, and
 * interactive achievement exploration. Supports multiple viewing modes
 * and accessibility features.
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Alert,
  Dimensions,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import {
  AdherenceMilestone,
  ProgressMetrics,
  CulturalInsight,
  MilestoneType,
} from '../../types/adherence';
import {
  CulturalMilestoneEngine,
  MilestoneDetection,
  CulturalMilestoneConfig,
} from '../../services/milestones/CulturalMilestoneEngine';
import {
  CelebrationOrchestrator,
  CelebrationSequence,
} from '../../services/celebrations/CelebrationOrchestrator';
import AchievementBadge from '../../components/milestones/AchievementBadge';
import MilestoneCelebration from '../../components/celebrations/MilestoneCelebration';
import { useCulturalTheme, useCulturalStyles } from '@/components/language/ui/CulturalThemeProvider';
import { useTranslation } from '@/i18n/hooks/useTranslation';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface MilestoneTimelineProps {
  patientId: string;
  progressMetrics?: ProgressMetrics;
  onMilestoneShare?: (milestone: AdherenceMilestone) => void;
  onFamilyNotification?: (milestone: AdherenceMilestone) => void;
}

interface TimelineSection {
  title: string;
  period: string;
  milestones: AdherenceMilestone[];
  culturalContext?: string;
}

interface FilterOptions {
  type: MilestoneType | 'all';
  period: 'week' | 'month' | 'quarter' | 'year' | 'all';
  category: 'achieved' | 'upcoming' | 'all';
}

interface ViewMode {
  mode: 'timeline' | 'grid' | 'calendar';
  sortBy: 'date' | 'type' | 'achievement';
  groupBy: 'month' | 'type' | 'none';
}

const MilestoneTimeline: React.FC<MilestoneTimelineProps> = ({
  patientId,
  progressMetrics,
  onMilestoneShare,
  onFamilyNotification,
}) => {
  const { theme, isElderlyMode } = useCulturalTheme();
  const { getCardStyle, getTextStyle, getButtonStyle } = useCulturalStyles();
  const { t, currentLanguage } = useTranslation();

  // Service instances
  const [milestoneEngine] = useState(() => new CulturalMilestoneEngine({
    preferredLanguage: currentLanguage as any,
    enableFestivalThemes: true,
    enableFamilySharing: true,
    culturalCelebrationLevel: 'enhanced',
  }));

  const [celebrationOrchestrator] = useState(() => new CelebrationOrchestrator({
    enableAnimations: true,
    enableSounds: true,
    enableHapticFeedback: true,
    enableFamilySharing: true,
    animationIntensity: 'moderate',
    culturalSensitivity: 'high',
  }));

  // State management
  const [milestones, setMilestones] = useState<AdherenceMilestone[]>([]);
  const [timelineSections, setTimelineSections] = useState<TimelineSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMilestone, setSelectedMilestone] = useState<AdherenceMilestone | null>(null);
  const [celebrationSequence, setCelebrationSequence] = useState<CelebrationSequence | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);

  // Filter and view state
  const [filters, setFilters] = useState<FilterOptions>({
    type: 'all',
    period: 'all',
    category: 'all',
  });

  const [viewMode, setViewMode] = useState<ViewMode>({
    mode: 'timeline',
    sortBy: 'date',
    groupBy: 'month',
  });

  // Load milestones on component mount and when progress metrics change
  useEffect(() => {
    loadMilestones();
  }, [patientId, progressMetrics]);

  // Update timeline sections when milestones or filters change
  useEffect(() => {
    updateTimelineSections();
  }, [milestones, filters, viewMode]);

  const loadMilestones = useCallback(async () => {
    try {
      setLoading(true);

      if (progressMetrics) {
        // Detect new milestones from progress metrics
        const detections = await milestoneEngine.detectMilestones(progressMetrics, patientId);

        // Process new achievements
        const newMilestones: AdherenceMilestone[] = [];
        for (const detection of detections) {
          if (detection.isNewAchievement) {
            newMilestones.push(detection.milestone);

            // Trigger celebration if appropriate
            if (detection.triggerCelebration) {
              const sequence = await celebrationOrchestrator.orchestrateCelebration(detection, patientId);
              if (sequence) {
                setCelebrationSequence(sequence);
                setShowCelebration(true);
              }
            }
          }
        }

        // Get all achieved milestones
        const allMilestones = milestoneEngine.getAchievedMilestones();
        setMilestones(allMilestones);
      }
    } catch (error) {
      console.error('Error loading milestones:', error);
      Alert.alert(t('error.loadMilestonesTitle'), t('error.loadMilestonesMessage'));
    } finally {
      setLoading(false);
    }
  }, [patientId, progressMetrics, milestoneEngine, celebrationOrchestrator, t]);

  const updateTimelineSections = useCallback(() => {
    const filteredMilestones = applyFilters(milestones);
    const sortedMilestones = sortMilestones(filteredMilestones);
    const sections = groupMilestones(sortedMilestones);
    setTimelineSections(sections);
  }, [milestones, filters, viewMode]);

  const applyFilters = useCallback((allMilestones: AdherenceMilestone[]): AdherenceMilestone[] => {
    return allMilestones.filter(milestone => {
      // Type filter
      if (filters.type !== 'all' && milestone.type !== filters.type) {
        return false;
      }

      // Period filter
      if (filters.period !== 'all' && milestone.achievedDate) {
        const now = new Date();
        const milestoneDate = new Date(milestone.achievedDate);
        const daysDiff = Math.floor((now.getTime() - milestoneDate.getTime()) / (1000 * 60 * 60 * 24));

        switch (filters.period) {
          case 'week':
            if (daysDiff > 7) return false;
            break;
          case 'month':
            if (daysDiff > 30) return false;
            break;
          case 'quarter':
            if (daysDiff > 90) return false;
            break;
          case 'year':
            if (daysDiff > 365) return false;
            break;
        }
      }

      // Category filter
      if (filters.category !== 'all') {
        if (filters.category === 'achieved' && !milestone.achievedDate) {
          return false;
        }
        if (filters.category === 'upcoming' && milestone.achievedDate) {
          return false;
        }
      }

      return true;
    });
  }, [filters]);

  const sortMilestones = useCallback((filteredMilestones: AdherenceMilestone[]): AdherenceMilestone[] => {
    return [...filteredMilestones].sort((a, b) => {
      switch (viewMode.sortBy) {
        case 'date':
          const dateA = a.achievedDate?.getTime() || 0;
          const dateB = b.achievedDate?.getTime() || 0;
          return dateB - dateA; // Most recent first
        case 'type':
          return a.type.localeCompare(b.type);
        case 'achievement':
          return (b.rewardPoints || 0) - (a.rewardPoints || 0);
        default:
          return 0;
      }
    });
  }, [viewMode.sortBy]);

  const groupMilestones = useCallback((sortedMilestones: AdherenceMilestone[]): TimelineSection[] => {
    if (viewMode.groupBy === 'none') {
      return [{
        title: t('milestones.allAchievements'),
        period: '',
        milestones: sortedMilestones,
      }];
    }

    const groups = new Map<string, AdherenceMilestone[]>();

    sortedMilestones.forEach(milestone => {
      let groupKey: string;

      if (viewMode.groupBy === 'month') {
        if (milestone.achievedDate) {
          const date = new Date(milestone.achievedDate);
          groupKey = `${date.getFullYear()}-${date.getMonth()}`;
        } else {
          groupKey = 'upcoming';
        }
      } else if (viewMode.groupBy === 'type') {
        groupKey = milestone.type;
      } else {
        groupKey = 'all';
      }

      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      groups.get(groupKey)!.push(milestone);
    });

    const sections: TimelineSection[] = [];
    groups.forEach((milestones, key) => {
      let title: string;
      let period: string;

      if (viewMode.groupBy === 'month') {
        if (key === 'upcoming') {
          title = t('milestones.upcomingAchievements');
          period = '';
        } else {
          const [year, month] = key.split('-');
          const date = new Date(parseInt(year), parseInt(month));
          title = date.toLocaleDateString(currentLanguage, { year: 'numeric', month: 'long' });
          period = t('milestones.monthlyAchievements');
        }
      } else if (viewMode.groupBy === 'type') {
        title = getMilestoneTypeDisplayName(key as MilestoneType);
        period = t('milestones.byType');
      } else {
        title = t('milestones.allAchievements');
        period = '';
      }

      sections.push({
        title,
        period,
        milestones,
        culturalContext: getCulturalContextForPeriod(key),
      });
    });

    return sections;
  }, [viewMode.groupBy, currentLanguage, t]);

  const getMilestoneTypeDisplayName = (type: MilestoneType): string => {
    const typeNames = {
      streak_days: t('milestones.types.streakDays'),
      adherence_rate: t('milestones.types.adherenceRate'),
      consistency: t('milestones.types.consistency'),
      improvement: t('milestones.types.improvement'),
      perfect_week: t('milestones.types.perfectWeek'),
      perfect_month: t('milestones.types.perfectMonth'),
      recovery: t('milestones.types.recovery'),
      family_support: t('milestones.types.familySupport'),
    };

    return typeNames[type] || type;
  };

  const getCulturalContextForPeriod = (period: string): string | undefined => {
    // Add cultural context based on period
    // This could include festival information, seasonal context, etc.
    return undefined;
  };

  const handleMilestonePress = useCallback((milestone: AdherenceMilestone) => {
    setSelectedMilestone(milestone);
    // Show milestone details modal or navigate to details screen
    showMilestoneDetails(milestone);
  }, []);

  const showMilestoneDetails = (milestone: AdherenceMilestone) => {
    Alert.alert(
      milestone.name,
      `${milestone.description}\n\n${t('milestones.achievedOn')}: ${milestone.achievedDate?.toLocaleDateString()}\n${t('milestones.points')}: ${milestone.rewardPoints}`,
      [
        { text: t('common.close'), style: 'cancel' },
        ...(milestone.shareable ? [{
          text: t('milestones.share'),
          onPress: () => handleMilestoneShare(milestone),
        }] : []),
      ]
    );
  };

  const handleMilestoneShare = useCallback((milestone: AdherenceMilestone) => {
    if (onMilestoneShare) {
      onMilestoneShare(milestone);
    } else {
      // Default sharing behavior
      const shareableCard = celebrationOrchestrator.createShareableAchievement(milestone);
      Alert.alert(
        t('milestones.shareAchievement'),
        shareableCard.culturalMessage,
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('common.share'), onPress: () => console.log('Share milestone:', milestone.name) },
        ]
      );
    }
  }, [onMilestoneShare, celebrationOrchestrator, t]);

  const handleCelebrationComplete = useCallback((
    celebrationId: string,
    userEngagement: 'dismissed' | 'watched' | 'shared' | 'saved'
  ) => {
    celebrationOrchestrator.completeCelebration(celebrationId, userEngagement);
    setShowCelebration(false);
    setCelebrationSequence(null);
  }, [celebrationOrchestrator]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadMilestones();
    setRefreshing(false);
  }, [loadMilestones]);

  const renderFilterBar = () => (
    <View style={[styles.filterBar, getCardStyle()]}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <TouchableOpacity
          style={[
            styles.filterButton,
            filters.type === 'all' && styles.filterButtonActive,
            getButtonStyle(filters.type === 'all' ? 'primary' : 'secondary'),
          ]}
          onPress={() => setFilters(prev => ({ ...prev, type: 'all' }))}
        >
          <Text style={[styles.filterButtonText, getTextStyle('caption')]}>
            {t('common.all')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterButton,
            filters.period === 'month' && styles.filterButtonActive,
            getButtonStyle(filters.period === 'month' ? 'primary' : 'secondary'),
          ]}
          onPress={() => setFilters(prev => ({ ...prev, period: 'month' }))}
        >
          <Text style={[styles.filterButtonText, getTextStyle('caption')]}>
            {t('milestones.thisMonth')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterButton,
            filters.category === 'achieved' && styles.filterButtonActive,
            getButtonStyle(filters.category === 'achieved' ? 'primary' : 'secondary'),
          ]}
          onPress={() => setFilters(prev => ({ ...prev, category: 'achieved' }))}
        >
          <Text style={[styles.filterButtonText, getTextStyle('caption')]}>
            {t('milestones.achieved')}
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  const renderViewModeSelector = () => (
    <View style={styles.viewModeSelector}>
      <TouchableOpacity
        style={[
          styles.viewModeButton,
          viewMode.mode === 'timeline' && styles.viewModeButtonActive,
        ]}
        onPress={() => setViewMode(prev => ({ ...prev, mode: 'timeline' }))}
      >
        <Text style={styles.viewModeButtonText}>📅</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[
          styles.viewModeButton,
          viewMode.mode === 'grid' && styles.viewModeButtonActive,
        ]}
        onPress={() => setViewMode(prev => ({ ...prev, mode: 'grid' }))}
      >
        <Text style={styles.viewModeButtonText}>⊞</Text>
      </TouchableOpacity>
    </View>
  );

  const renderTimelineSection = ({ item: section }: { item: TimelineSection }) => (
    <View style={[styles.timelineSection, getCardStyle()]}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, getTextStyle('heading')]}>
          {section.title}
        </Text>
        {section.period && (
          <Text style={[styles.sectionPeriod, getTextStyle('caption')]}>
            {section.period}
          </Text>
        )}
      </View>

      <View style={styles.milestonesContainer}>
        {section.milestones.map((milestone, index) => (
          <View key={milestone.id} style={styles.milestoneItem}>
            <AchievementBadge
              milestone={milestone}
              size="medium"
              onPress={handleMilestonePress}
              animated={true}
              showDetails={false}
              variant="default"
            />
            <View style={styles.milestoneInfo}>
              <Text style={[styles.milestoneName, getTextStyle('body')]}>
                {milestone.name}
              </Text>
              {milestone.achievedDate && (
                <Text style={[styles.milestoneDate, getTextStyle('caption')]}>
                  {milestone.achievedDate.toLocaleDateString()}
                </Text>
              )}
            </View>
            {index < section.milestones.length - 1 && (
              <View style={styles.timelineConnector} />
            )}
          </View>
        ))}
      </View>
    </View>
  );

  const renderGridView = () => (
    <FlatList
      data={milestones}
      numColumns={3}
      keyExtractor={(item) => item.id}
      renderItem={({ item: milestone }) => (
        <View style={styles.gridItem}>
          <AchievementBadge
            milestone={milestone}
            size="small"
            onPress={handleMilestonePress}
            animated={true}
            showDetails={false}
            variant="compact"
          />
        </View>
      )}
      contentContainerStyle={styles.gridContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
    />
  );

  const renderTimelineView = () => (
    <FlatList
      data={timelineSections}
      keyExtractor={(item, index) => `section_${index}`}
      renderItem={renderTimelineSection}
      contentContainerStyle={styles.timelineContainer}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
      }
      showsVerticalScrollIndicator={false}
    />
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={[styles.emptyStateIcon, { color: theme.colors.primary }]}>
        🏆
      </Text>
      <Text style={[styles.emptyStateTitle, getTextStyle('heading')]}>
        {t('milestones.noAchievements')}
      </Text>
      <Text style={[styles.emptyStateDescription, getTextStyle('body')]}>
        {t('milestones.startJourney')}
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, getTextStyle('body')]}>
          {t('milestones.loading')}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {renderFilterBar()}
      {renderViewModeSelector()}

      {timelineSections.length === 0 ? (
        renderEmptyState()
      ) : (
        <>
          {viewMode.mode === 'grid' ? renderGridView() : renderTimelineView()}
        </>
      )}

      {/* Celebration Modal */}
      <MilestoneCelebration
        sequence={celebrationSequence}
        onCelebrationComplete={handleCelebrationComplete}
        celebrationOrchestrator={celebrationOrchestrator}
        isVisible={showCelebration}
        enableHaptics={true}
        enableSounds={true}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
  },
  filterBar: {
    margin: 16,
    paddingVertical: 12,
    paddingHorizontal: 8,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 20,
  },
  filterButtonActive: {
    // Styles will be applied by getButtonStyle
  },
  filterButtonText: {
    fontWeight: '600',
  },
  viewModeSelector: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 16,
  },
  viewModeButton: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#E9ECEF',
  },
  viewModeButtonActive: {
    backgroundColor: '#007BFF',
  },
  viewModeButtonText: {
    fontSize: 18,
  },
  timelineContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  timelineSection: {
    marginBottom: 24,
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E9ECEF',
    paddingBottom: 12,
  },
  sectionTitle: {
    fontWeight: 'bold',
    marginBottom: 4,
  },
  sectionPeriod: {
    opacity: 0.6,
  },
  milestonesContainer: {
    paddingLeft: 8,
  },
  milestoneItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  milestoneInfo: {
    marginLeft: 16,
    flex: 1,
  },
  milestoneName: {
    fontWeight: '600',
    marginBottom: 4,
  },
  milestoneDate: {
    opacity: 0.6,
  },
  timelineConnector: {
    position: 'absolute',
    left: 45,
    top: 90,
    width: 2,
    height: 40,
    backgroundColor: '#DEE2E6',
    zIndex: -1,
  },
  gridContainer: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  gridItem: {
    flex: 1,
    margin: 8,
    alignItems: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyStateIcon: {
    fontSize: 80,
    marginBottom: 24,
  },
  emptyStateTitle: {
    textAlign: 'center',
    marginBottom: 12,
  },
  emptyStateDescription: {
    textAlign: 'center',
    opacity: 0.6,
  },
});

export default MilestoneTimeline;