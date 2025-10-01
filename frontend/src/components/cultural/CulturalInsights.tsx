/**
 * Cultural Insights Component
 * 
 * Provides intelligent cultural insights based on user behavior patterns,
 * prayer times, festivals, and family care traditions for Malaysian users.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { fetchPrayerTimes, fetchFestivals } from '@/store/slices/culturalSlice';
import { 
  CulturalInsight, 
  UserBehaviorPattern, 
  CulturalCalendarEvent,
  MalaysianState,
  MALAYSIAN_STATES_DATA 
} from '@/types/cultural';

interface CulturalInsightsProps {
  showDetailed?: boolean;
  maxInsights?: number;
  onInsightAction?: (insight: CulturalInsight) => void;
}

export const CulturalInsights: React.FC<CulturalInsightsProps> = ({
  showDetailed = true,
  maxInsights = 5,
  onInsightAction,
}) => {
  const dispatch = useAppDispatch();
  const { profile, prayerTimes, festivals, isLoading } = useAppSelector((state) => state.cultural);
  const { user } = useAppSelector((state) => state.auth);

  const [insights, setInsights] = useState<CulturalInsight[]>([]);
  const [behaviorPatterns, setBehaviorPatterns] = useState<UserBehaviorPattern[]>([]);
  const [upcomingEvents, setUpcomingEvents] = useState<CulturalCalendarEvent[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedInsights, setExpandedInsights] = useState<Set<string>>(new Set());

  useEffect(() => {
    generateInsights();
  }, [profile, prayerTimes, festivals]);

  useEffect(() => {
    loadUserLocation();
  }, []);

  const loadUserLocation = async () => {
    if (profile?.locationDefaults) {
      // Load prayer times for current location
      const { coordinates } = profile.locationDefaults;
      dispatch(fetchPrayerTimes({
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
      }));
    }
    
    // Load festivals
    dispatch(fetchFestivals());
  };

  const generateInsights = () => {
    const newInsights: CulturalInsight[] = [];

    // Prayer time insights
    if (profile?.prayerTimes?.enabled && prayerTimes) {
      newInsights.push(...generatePrayerTimeInsights());
    }

    // Festival insights
    if (festivals && festivals.length > 0) {
      newInsights.push(...generateFestivalInsights());
    }

    // Family care insights
    if (profile?.familyStructure?.elderlyMembers && profile.familyStructure.elderlyMembers > 0) {
      newInsights.push(...generateFamilyCareInsights());
    }

    // Language insights
    if (profile?.language) {
      newInsights.push(...generateLanguageInsights());
    }

    // Location-specific insights
    if (profile?.locationDefaults) {
      newInsights.push(...generateLocationInsights());
    }

    // Sort by priority and limit
    const sortedInsights = newInsights
      .sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      })
      .slice(0, maxInsights);

    setInsights(sortedInsights);
  };

  const generatePrayerTimeInsights = (): CulturalInsight[] => {
    const insights: CulturalInsight[] = [];
    
    if (prayerTimes) {
      const now = new Date();
      const currentHour = now.getHours();

      // Check for upcoming prayer time
      const upcomingPrayer = findUpcomingPrayer(prayerTimes, currentHour);
      if (upcomingPrayer) {
        insights.push({
          id: 'upcoming_prayer',
          type: 'prayer_time',
          message: `${upcomingPrayer.name} prayer is coming up at ${upcomingPrayer.time}. Consider planning medication timing accordingly.`,
          actionable: true,
          priority: 'high',
        });
      }

      // Medication timing recommendations
      if (profile?.familyStructure?.elderlyMembers && profile.familyStructure.elderlyMembers > 0) {
        insights.push({
          id: 'medication_prayer_timing',
          type: 'medication',
          message: 'Schedule elderly family members\' medications between prayer times for better adherence.',
          actionable: true,
          priority: 'medium',
        });
      }

      // Friday prayer consideration
      if (now.getDay() === 5) { // Friday
        insights.push({
          id: 'friday_prayer',
          type: 'prayer_time',
          message: 'It\'s Friday - Jummah prayer may affect afternoon medication schedules.',
          actionable: true,
          priority: 'medium',
        });
      }
    }

    return insights;
  };

  const generateFestivalInsights = (): CulturalInsight[] => {
    const insights: CulturalInsight[] = [];
    
    if (festivals) {
      const upcomingFestivals = festivals
        .filter(festival => new Date(festival.date) > new Date())
        .slice(0, 2);

      upcomingFestivals.forEach(festival => {
        // Fasting considerations
        if (festival.type === 'islamic' && festival.name.toLowerCase().includes('ramadan')) {
          insights.push({
            id: `festival_${festival.id}`,
            type: 'festival',
            message: `Ramadan is approaching. Adjust medication schedules for fasting hours and consult healthcare providers.`,
            actionable: true,
            priority: 'high',
            expiresAt: festival.date,
          });
        }

        // General festival preparation
        insights.push({
          id: `festival_prep_${festival.id}`,
          type: 'festival',
          message: `${festival.name} is coming up. Ensure adequate medication supply for the celebration period.`,
          actionable: true,
          priority: 'medium',
          expiresAt: festival.date,
        });
      });
    }

    return insights;
  };

  const generateFamilyCareInsights = (): CulturalInsight[] => {
    const insights: CulturalInsight[] = [];

    if (profile?.familyStructure) {
      const { elderlyMembers, primaryCaregiver } = profile.familyStructure;

      if (elderlyMembers > 0) {
        insights.push({
          id: 'elderly_care_reminder',
          type: 'family_care',
          message: `You're caring for ${elderlyMembers} elderly family member(s). Set up medication reminders and emergency contacts.`,
          actionable: true,
          priority: 'high',
        });

        if (primaryCaregiver) {
          insights.push({
            id: 'caregiver_support',
            type: 'family_care',
            message: 'As a primary caregiver, remember to take care of your own health and medication needs too.',
            actionable: true,
            priority: 'medium',
          });
        }

        // Cultural care recommendations
        if (profile.locationDefaults?.culturalContext.elderlyCareTraditions.length > 0) {
          const tradition = profile.locationDefaults.culturalContext.elderlyCareTraditions[0];
          insights.push({
            id: 'cultural_care_tradition',
            type: 'family_care',
            message: `Consider incorporating ${tradition.name} practices in your elderly care routine.`,
            actionable: true,
            priority: 'low',
          });
        }
      }
    }

    return insights;
  };

  const generateLanguageInsights = (): CulturalInsight[] => {
    const insights: CulturalInsight[] = [];

    if (profile?.language && profile.language !== 'en') {
      insights.push({
        id: 'language_support',
        type: 'language',
        message: `Medication labels and instructions are available in your preferred language (${profile.language.toUpperCase()}).`,
        actionable: true,
        priority: 'low',
      });
    }

    return insights;
  };

  const generateLocationInsights = (): CulturalInsight[] => {
    const insights: CulturalInsight[] = [];

    if (profile?.locationDefaults) {
      const { state, culturalContext } = profile.locationDefaults;
      const stateData = MALAYSIAN_STATES_DATA[state];

      // Weather-based medication insights for certain states
      if (['sabah', 'sarawak'].includes(state)) {
        insights.push({
          id: 'tropical_medication',
          type: 'medication',
          message: 'Store medications in cool, dry places due to high humidity in East Malaysia.',
          actionable: true,
          priority: 'medium',
        });
      }

      // Urban vs rural healthcare access
      if (state === 'kuala_lumpur') {
        insights.push({
          id: 'urban_healthcare',
          type: 'medication',
          message: 'Take advantage of 24/7 pharmacies and healthcare facilities available in KL.',
          actionable: false,
          priority: 'low',
        });
      }

      // Cultural diversity insights
      if (culturalContext.predominantReligion === 'mixed') {
        insights.push({
          id: 'multicultural_care',
          type: 'family_care',
          message: 'Your area has diverse cultural practices. Be sensitive to different family care traditions.',
          actionable: false,
          priority: 'low',
        });
      }
    }

    return insights;
  };

  const findUpcomingPrayer = (prayers: any, currentHour: number) => {
    // This would typically parse actual prayer time data
    // For now, using approximate times
    const prayerSchedule = [
      { name: 'Fajr', time: '06:00', hour: 6 },
      { name: 'Dhuhr', time: '13:00', hour: 13 },
      { name: 'Asr', time: '16:30', hour: 16 },
      { name: 'Maghrib', time: '19:15', hour: 19 },
      { name: 'Isha', time: '20:30', hour: 20 },
    ];

    return prayerSchedule.find(prayer => prayer.hour > currentHour) || prayerSchedule[0];
  };

  const handleInsightAction = (insight: CulturalInsight) => {
    if (onInsightAction) {
      onInsightAction(insight);
    } else {
      // Default actions based on insight type
      switch (insight.type) {
        case 'prayer_time':
          Alert.alert(
            'Prayer Time Reminder',
            'Would you like to set up automatic medication reminders that respect prayer times?',
            [
              { text: 'Not Now', style: 'cancel' },
              { text: 'Set Up', onPress: () => console.log('Setup prayer-aware reminders') },
            ]
          );
          break;
        case 'festival':
          Alert.alert(
            'Festival Preparation',
            'Would you like to receive festival-specific medication guidance?',
            [
              { text: 'No Thanks', style: 'cancel' },
              { text: 'Yes', onPress: () => console.log('Setup festival medication guidance') },
            ]
          );
          break;
        case 'family_care':
          Alert.alert(
            'Family Care Support',
            'Would you like to explore family care features and emergency contacts?',
            [
              { text: 'Later', style: 'cancel' },
              { text: 'Explore', onPress: () => console.log('Navigate to family care') },
            ]
          );
          break;
        default:
          console.log('Insight action:', insight.id);
      }
    }
  };

  const toggleInsightExpansion = (insightId: string) => {
    setExpandedInsights(prev => {
      const newSet = new Set(prev);
      if (newSet.has(insightId)) {
        newSet.delete(insightId);
      } else {
        newSet.add(insightId);
      }
      return newSet;
    });
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUserLocation();
    generateInsights();
    setRefreshing(false);
  };

  const renderInsight = (insight: CulturalInsight) => {
    const isExpanded = expandedInsights.has(insight.id);
    const priorityColor = {
      high: '#dc3545',
      medium: '#ffc107',
      low: '#28a745',
    }[insight.priority];

    return (
      <View key={insight.id} style={styles.insightCard}>
        <View style={styles.insightHeader}>
          <View style={[styles.priorityIndicator, { backgroundColor: priorityColor }]} />
          <Text style={styles.insightType}>
            {insight.type.replace('_', ' ').toUpperCase()}
          </Text>
          <Text style={styles.priorityText}>{insight.priority.toUpperCase()}</Text>
        </View>

        <TouchableOpacity
          onPress={() => toggleInsightExpansion(insight.id)}
          activeOpacity={0.8}
        >
          <Text style={styles.insightMessage}>{insight.message}</Text>
        </TouchableOpacity>

        {insight.actionable && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleInsightAction(insight)}
          >
            <Text style={styles.actionButtonText}>Take Action</Text>
          </TouchableOpacity>
        )}

        {insight.expiresAt && (
          <Text style={styles.expiryText}>
            Expires: {new Date(insight.expiresAt).toLocaleDateString()}
          </Text>
        )}
      </View>
    );
  };

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateTitle}>No Cultural Insights Available</Text>
      <Text style={styles.emptyStateMessage}>
        Complete your cultural profile to receive personalized insights for Malaysian healthcare.
      </Text>
      <TouchableOpacity style={styles.setupButton} onPress={() => console.log('Setup cultural profile')}>
        <Text style={styles.setupButtonText}>Complete Profile</Text>
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007bff" />
        <Text style={styles.loadingText}>Generating Cultural Insights...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Cultural Insights</Text>
        <Text style={styles.subtitle}>
          Personalized recommendations for Malaysian healthcare
        </Text>
      </View>

      {insights.length > 0 ? (
        <View style={styles.insightsContainer}>
          {insights.map(renderInsight)}
          
          {insights.length === maxInsights && (
            <TouchableOpacity 
              style={styles.viewMoreButton}
              onPress={() => console.log('View more insights')}
            >
              <Text style={styles.viewMoreButtonText}>View More Insights</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : (
        renderEmptyState()
      )}

      {showDetailed && upcomingEvents.length > 0 && (
        <View style={styles.eventsSection}>
          <Text style={styles.sectionTitle}>Upcoming Cultural Events</Text>
          {upcomingEvents.slice(0, 3).map((event, index) => (
            <View key={index} style={styles.eventCard}>
              <Text style={styles.eventName}>{event.name}</Text>
              <Text style={styles.eventDate}>
                {new Date(event.date).toLocaleDateString()}
              </Text>
              {event.medicationImpact?.fasting && (
                <Text style={styles.medicationImpact}>
                  ⚠️ May affect medication timing due to fasting
                </Text>
              )}
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#6c757d',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
  },
  insightsContainer: {
    padding: 20,
  },
  insightCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  insightHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  priorityIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  insightType: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6c757d',
    flex: 1,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#6c757d',
  },
  insightMessage: {
    fontSize: 16,
    color: '#2c3e50',
    lineHeight: 24,
    marginBottom: 10,
  },
  actionButton: {
    backgroundColor: '#007bff',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 5,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  expiryText: {
    fontSize: 12,
    color: '#6c757d',
    fontStyle: 'italic',
  },
  viewMoreButton: {
    backgroundColor: '#e9ecef',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 10,
  },
  viewMoreButtonText: {
    color: '#495057',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 10,
  },
  emptyStateMessage: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 20,
  },
  setupButton: {
    backgroundColor: '#28a745',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  setupButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  eventsSection: {
    padding: 20,
    backgroundColor: '#fff',
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
  },
  eventCard: {
    backgroundColor: '#f0f8f7',
    borderRadius: 6,
    padding: 12,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#28a745',
  },
  eventName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2c3e50',
    marginBottom: 4,
  },
  eventDate: {
    fontSize: 14,
    color: '#6c757d',
    marginBottom: 4,
  },
  medicationImpact: {
    fontSize: 13,
    color: '#856404',
    fontStyle: 'italic',
  },
});