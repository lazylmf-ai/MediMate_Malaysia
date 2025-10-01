/**
 * Cultural Scheduling Engine Interface
 *
 * Mobile interface for the cultural scheduling engine that adapts medication
 * timing to Malaysian cultural practices, meal patterns, and family traditions.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Switch,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useCulturalScheduling } from '../../../hooks/cultural';
import { useTranslation, useCulturalFormatting } from '../../../i18n';
import { FormattedTime, FormattedDate } from '../language';

export interface CulturalSchedulingInterfaceProps {
  medicationId?: string;
  currentSchedule?: MedicationSchedule;
  onScheduleUpdate?: (schedule: OptimizedSchedule) => void;
  onPreferencesChange?: (preferences: CulturalSchedulingPreferences) => void;
  theme?: 'light' | 'dark';
}

interface MedicationSchedule {
  id: string;
  medicationName: string;
  frequency: 'once_daily' | 'twice_daily' | 'three_times' | 'four_times' | 'as_needed';
  timingPreference: 'with_meals' | 'before_meals' | 'after_meals' | 'empty_stomach' | 'bedtime';
  currentTimes: Date[];
}

interface OptimizedSchedule {
  originalSchedule: MedicationSchedule;
  optimizedTimes: Date[];
  culturalAdaptations: CulturalAdaptation[];
  mealTimingAlignment: MealAlignment[];
  familyConsiderations: FamilyConsideration[];
  conflictResolutions: ConflictResolution[];
  adherenceScore: number;
}

interface CulturalAdaptation {
  type: 'prayer_avoidance' | 'meal_alignment' | 'family_routine' | 'festival_adjustment' | 'fasting_accommodation';
  description: string;
  timeAdjustment: number; // minutes
  culturalReason: string;
  priority: 'high' | 'medium' | 'low';
}

interface MealAlignment {
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'supper';
  traditionalTime: string;
  culturalContext: 'malay' | 'chinese' | 'indian' | 'mixed';
  familyPattern: boolean;
}

interface FamilyConsideration {
  type: 'elderly_care' | 'child_supervision' | 'caregiver_availability' | 'family_meals' | 'work_schedule';
  description: string;
  impact: 'positive' | 'neutral' | 'challenging';
  suggestion: string;
}

interface ConflictResolution {
  originalTime: Date;
  conflictType: 'prayer_time' | 'meal_time' | 'family_event' | 'work_schedule' | 'sleep_time';
  resolvedTime: Date;
  reasoning: string;
}

interface CulturalSchedulingPreferences {
  enableMealAlignment: boolean;
  enablePrayerAvoidance: boolean;
  enableFamilyConsideration: boolean;
  mealPatternPreference: 'traditional' | 'modern' | 'flexible';
  familyStructureType: 'nuclear' | 'extended' | 'multi_generational';
  workScheduleType: 'standard' | 'shift' | 'flexible' | 'retired';
  festivalAdjustments: boolean;
  elderlyOptimizations: boolean;
}

export const CulturalSchedulingInterface: React.FC<CulturalSchedulingInterfaceProps> = ({
  medicationId,
  currentSchedule,
  onScheduleUpdate,
  onPreferencesChange,
  theme = 'light'
}) => {
  const {
    optimizedSchedule,
    culturalInsights,
    familyPatterns,
    mealPatterns,
    preferences,
    isOptimizing,
    error,
    optimizeSchedule,
    updatePreferences,
    applyOptimizations,
    getAdherencePreview
  } = useCulturalScheduling();

  const { t, tCultural } = useTranslation();
  const { formatTime } = useCulturalFormatting();

  const [showPreferences, setShowPreferences] = useState(false);
  const [showInsights, setShowInsights] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [selectedAdaptation, setSelectedAdaptation] = useState<CulturalAdaptation | null>(null);

  const styles = createStyles(theme);

  useEffect(() => {
    if (currentSchedule && medicationId) {
      optimizeSchedule(currentSchedule, medicationId);
    }
  }, [currentSchedule, medicationId, optimizeSchedule]);

  /**
   * Handle preference changes
   */
  const handlePreferenceChange = useCallback((key: keyof CulturalSchedulingPreferences, value: any) => {
    const newPreferences = { ...preferences, [key]: value };
    updatePreferences(newPreferences);
    onPreferencesChange?.(newPreferences);
  }, [preferences, updatePreferences, onPreferencesChange]);

  /**
   * Apply optimized schedule
   */
  const handleApplySchedule = useCallback(async () => {
    if (!optimizedSchedule) return;

    Alert.alert(
      t('scheduling.apply_title'),
      t('scheduling.apply_confirmation', {
        adaptations: optimizedSchedule.culturalAdaptations.length,
        adherenceScore: Math.round(optimizedSchedule.adherenceScore * 100)
      }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.apply'),
          onPress: async () => {
            try {
              await applyOptimizations(optimizedSchedule);
              onScheduleUpdate?.(optimizedSchedule);
              Alert.alert(t('scheduling.applied_title'), t('scheduling.applied_message'));
            } catch (err) {
              Alert.alert(t('common.error'), t('scheduling.apply_error'));
            }
          }
        }
      ]
    );
  }, [optimizedSchedule, applyOptimizations, onScheduleUpdate, t]);

  /**
   * Get adaptation type icon
   */
  const getAdaptationIcon = useCallback((type: string): string => {
    switch (type) {
      case 'prayer_avoidance': return 'moon';
      case 'meal_alignment': return 'restaurant';
      case 'family_routine': return 'people';
      case 'festival_adjustment': return 'calendar';
      case 'fasting_accommodation': return 'time';
      default: return 'settings';
    }
  }, []);

  /**
   * Get adaptation priority color
   */
  const getPriorityColor = useCallback((priority: string): string => {
    switch (priority) {
      case 'high': return '#DC3545';
      case 'medium': return '#FD7E14';
      case 'low': return '#28A745';
      default: return '#6C757D';
    }
  }, []);

  if (isOptimizing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007BFF" />
        <Text style={styles.loadingText}>{t('scheduling.optimizing')}</Text>
        <Text style={styles.loadingSubtext}>{t('scheduling.analyzing_patterns')}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#DC3545" />
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity
          style={styles.retryButton}
          onPress={() => currentSchedule && optimizeSchedule(currentSchedule, medicationId || '')}
        >
          <Text style={styles.retryText}>{t('common.retry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!currentSchedule || !optimizedSchedule) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="calendar-outline" size={48} color="#8E8E93" />
        <Text style={styles.emptyText}>{t('scheduling.no_schedule')}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <Ionicons name="calendar-outline" size={24} color="#007BFF" />
          <Text style={styles.title}>{t('scheduling.cultural_optimization')}</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowInsights(true)}
          >
            <Ionicons name="analytics-outline" size={20} color={theme === 'dark' ? '#FFFFFF' : '#2C2C2E'} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowPreferences(true)}
          >
            <Ionicons name="settings-outline" size={20} color={theme === 'dark' ? '#FFFFFF' : '#2C2C2E'} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Adherence Score Card */}
      <View style={styles.scoreCard}>
        <View style={styles.scoreHeader}>
          <Text style={styles.scoreLabel}>{t('scheduling.adherence_score')}</Text>
          <View style={styles.scoreContainer}>
            <Text style={styles.scoreValue}>
              {Math.round(optimizedSchedule.adherenceScore * 100)}%
            </Text>
            <Ionicons
              name={optimizedSchedule.adherenceScore > 0.8 ? 'checkmark-circle' : 'warning'}
              size={20}
              color={optimizedSchedule.adherenceScore > 0.8 ? '#28A745' : '#FD7E14'}
            />
          </View>
        </View>
        <Text style={styles.scoreDescription}>
          {t(`scheduling.adherence_${optimizedSchedule.adherenceScore > 0.8 ? 'excellent' : 'good'}`)}
        </Text>
      </View>

      {/* Original vs Optimized Schedule */}
      <View style={styles.scheduleComparison}>
        <Text style={styles.sectionTitle}>{t('scheduling.schedule_comparison')}</Text>

        <View style={styles.scheduleRow}>
          <View style={styles.scheduleColumn}>
            <Text style={styles.scheduleColumnTitle}>{t('scheduling.original')}</Text>
            {currentSchedule.currentTimes.map((time, index) => (
              <View key={index} style={styles.timeItem}>
                <FormattedTime time={time} format="12h" theme={theme} />
              </View>
            ))}
          </View>

          <View style={styles.scheduleArrow}>
            <Ionicons name="arrow-forward" size={24} color="#007BFF" />
          </View>

          <View style={styles.scheduleColumn}>
            <Text style={styles.scheduleColumnTitle}>{t('scheduling.optimized')}</Text>
            {optimizedSchedule.optimizedTimes.map((time, index) => (
              <View key={index} style={styles.timeItem}>
                <FormattedTime time={time} format="12h" theme={theme} />
                {Math.abs(time.getTime() - currentSchedule.currentTimes[index]?.getTime()) > 15 * 60 * 1000 && (
                  <Ionicons name="sparkles" size={12} color="#007BFF" style={styles.optimizedIcon} />
                )}
              </View>
            ))}
          </View>
        </View>
      </View>

      {/* Cultural Adaptations */}
      {optimizedSchedule.culturalAdaptations.length > 0 && (
        <View style={styles.adaptationsSection}>
          <Text style={styles.sectionTitle}>{t('scheduling.cultural_adaptations')}</Text>
          {optimizedSchedule.culturalAdaptations.map((adaptation, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.adaptationItem, {
                borderLeftColor: getPriorityColor(adaptation.priority)
              }]}
              onPress={() => setSelectedAdaptation(adaptation)}
            >
              <View style={styles.adaptationIcon}>
                <Ionicons
                  name={getAdaptationIcon(adaptation.type) as any}
                  size={20}
                  color={getPriorityColor(adaptation.priority)}
                />
              </View>
              <View style={styles.adaptationContent}>
                <Text style={styles.adaptationTitle}>
                  {tCultural(`adaptation.${adaptation.type}`)}
                </Text>
                <Text style={styles.adaptationDescription}>
                  {adaptation.description}
                </Text>
                <Text style={styles.adaptationReason}>
                  {adaptation.culturalReason}
                </Text>
              </View>
              <View style={styles.adaptationAdjustment}>
                <Text style={[styles.adjustmentText, {
                  color: adaptation.timeAdjustment > 0 ? '#28A745' : '#DC3545'
                }]}>
                  {adaptation.timeAdjustment > 0 ? '+' : ''}{adaptation.timeAdjustment}min
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Meal Alignment */}
      {optimizedSchedule.mealTimingAlignment.length > 0 && (
        <View style={styles.mealAlignmentSection}>
          <Text style={styles.sectionTitle}>{t('scheduling.meal_alignment')}</Text>
          {optimizedSchedule.mealTimingAlignment.map((meal, index) => (
            <View key={index} style={styles.mealItem}>
              <View style={styles.mealIcon}>
                <Ionicons name="restaurant-outline" size={16} color="#FD7E14" />
              </View>
              <View style={styles.mealContent}>
                <Text style={styles.mealType}>
                  {tCultural(`meal.${meal.mealType}`)}
                </Text>
                <Text style={styles.mealTime}>{meal.traditionalTime}</Text>
                <Text style={styles.mealContext}>
                  {tCultural(`culture.${meal.culturalContext}`)} {meal.familyPattern ? '• Family Pattern' : ''}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Family Considerations */}
      {optimizedSchedule.familyConsiderations.length > 0 && (
        <View style={styles.familySection}>
          <Text style={styles.sectionTitle}>{t('scheduling.family_considerations')}</Text>
          {optimizedSchedule.familyConsiderations.map((consideration, index) => (
            <View key={index} style={styles.familyItem}>
              <View style={styles.familyIcon}>
                <Ionicons
                  name="people-outline"
                  size={16}
                  color={consideration.impact === 'positive' ? '#28A745' :
                         consideration.impact === 'challenging' ? '#DC3545' : '#8E8E93'}
                />
              </View>
              <View style={styles.familyContent}>
                <Text style={styles.familyType}>
                  {tCultural(`family.${consideration.type}`)}
                </Text>
                <Text style={styles.familyDescription}>
                  {consideration.description}
                </Text>
                <Text style={styles.familySuggestion}>
                  💡 {consideration.suggestion}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Apply Button */}
      <View style={styles.actionContainer}>
        <TouchableOpacity
          style={styles.previewButton}
          onPress={() => setPreviewMode(!previewMode)}
        >
          <Ionicons name="eye-outline" size={20} color="#007BFF" />
          <Text style={styles.previewButtonText}>
            {previewMode ? t('scheduling.exit_preview') : t('scheduling.preview_changes')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.applyButton}
          onPress={handleApplySchedule}
        >
          <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
          <Text style={styles.applyButtonText}>{t('scheduling.apply_optimization')}</Text>
        </TouchableOpacity>
      </View>

      {/* Preferences Modal */}
      <Modal
        visible={showPreferences}
        animationType="slide"
        presentationStyle="formSheet"
        onRequestClose={() => setShowPreferences(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('scheduling.preferences_title')}</Text>
            <TouchableOpacity onPress={() => setShowPreferences(false)}>
              <Ionicons name="close" size={24} color={theme === 'dark' ? '#FFFFFF' : '#2C2C2E'} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Meal Alignment */}
            <View style={styles.preferenceRow}>
              <Text style={styles.preferenceLabel}>{t('scheduling.enable_meal_alignment')}</Text>
              <Switch
                value={preferences.enableMealAlignment}
                onValueChange={(value) => handlePreferenceChange('enableMealAlignment', value)}
                trackColor={{ false: '#767577', true: '#007BFF' }}
                thumbColor={preferences.enableMealAlignment ? '#FFFFFF' : '#f4f3f4'}
              />
            </View>

            {/* Prayer Avoidance */}
            <View style={styles.preferenceRow}>
              <Text style={styles.preferenceLabel}>{t('scheduling.enable_prayer_avoidance')}</Text>
              <Switch
                value={preferences.enablePrayerAvoidance}
                onValueChange={(value) => handlePreferenceChange('enablePrayerAvoidance', value)}
                trackColor={{ false: '#767577', true: '#007BFF' }}
                thumbColor={preferences.enablePrayerAvoidance ? '#FFFFFF' : '#f4f3f4'}
              />
            </View>

            {/* Family Consideration */}
            <View style={styles.preferenceRow}>
              <Text style={styles.preferenceLabel}>{t('scheduling.enable_family_consideration')}</Text>
              <Switch
                value={preferences.enableFamilyConsideration}
                onValueChange={(value) => handlePreferenceChange('enableFamilyConsideration', value)}
                trackColor={{ false: '#767577', true: '#007BFF' }}
                thumbColor={preferences.enableFamilyConsideration ? '#FFFFFF' : '#f4f3f4'}
              />
            </View>

            {/* Festival Adjustments */}
            <View style={styles.preferenceRow}>
              <Text style={styles.preferenceLabel}>{t('scheduling.festival_adjustments')}</Text>
              <Switch
                value={preferences.festivalAdjustments}
                onValueChange={(value) => handlePreferenceChange('festivalAdjustments', value)}
                trackColor={{ false: '#767577', true: '#007BFF' }}
                thumbColor={preferences.festivalAdjustments ? '#FFFFFF' : '#f4f3f4'}
              />
            </View>

            {/* Elderly Optimizations */}
            <View style={styles.preferenceRow}>
              <Text style={styles.preferenceLabel}>{t('scheduling.elderly_optimizations')}</Text>
              <Switch
                value={preferences.elderlyOptimizations}
                onValueChange={(value) => handlePreferenceChange('elderlyOptimizations', value)}
                trackColor={{ false: '#767577', true: '#007BFF' }}
                thumbColor={preferences.elderlyOptimizations ? '#FFFFFF' : '#f4f3f4'}
              />
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Adaptation Detail Modal */}
      <Modal
        visible={!!selectedAdaptation}
        animationType="slide"
        presentationStyle="formSheet"
        onRequestClose={() => setSelectedAdaptation(null)}
      >
        {selectedAdaptation && (
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {tCultural(`adaptation.${selectedAdaptation.type}`)}
              </Text>
              <TouchableOpacity onPress={() => setSelectedAdaptation(null)}>
                <Ionicons name="close" size={24} color={theme === 'dark' ? '#FFFFFF' : '#2C2C2E'} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              <View style={styles.adaptationDetail}>
                <Text style={styles.adaptationDetailDescription}>
                  {selectedAdaptation.description}
                </Text>
                <Text style={styles.adaptationDetailReason}>
                  {selectedAdaptation.culturalReason}
                </Text>
                <View style={styles.adaptationDetailMeta}>
                  <Text style={styles.metaLabel}>Priority:</Text>
                  <Text style={[styles.metaValue, { color: getPriorityColor(selectedAdaptation.priority) }]}>
                    {selectedAdaptation.priority.toUpperCase()}
                  </Text>
                </View>
                <View style={styles.adaptationDetailMeta}>
                  <Text style={styles.metaLabel}>Time Adjustment:</Text>
                  <Text style={styles.metaValue}>
                    {selectedAdaptation.timeAdjustment > 0 ? '+' : ''}{selectedAdaptation.timeAdjustment} minutes
                  </Text>
                </View>
              </View>
            </ScrollView>
          </View>
        )}
      </Modal>
    </ScrollView>
  );
};

const createStyles = (theme: 'light' | 'dark') => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme === 'dark' ? '#1C1C1E' : '#F2F2F7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme === 'dark' ? '#1C1C1E' : '#F2F2F7',
    padding: 20,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: theme === 'dark' ? '#FFFFFF' : '#2C2C2E',
    marginTop: 16,
  },
  loadingSubtext: {
    fontSize: 14,
    color: theme === 'dark' ? '#8E8E93' : '#8E8E93',
    marginTop: 8,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme === 'dark' ? '#1C1C1E' : '#F2F2F7',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#DC3545',
    textAlign: 'center',
    marginVertical: 16,
  },
  retryButton: {
    backgroundColor: '#007BFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme === 'dark' ? '#1C1C1E' : '#F2F2F7',
    padding: 20,
  },
  emptyText: {
    fontSize: 16,
    color: theme === 'dark' ? '#8E8E93' : '#8E8E93',
    textAlign: 'center',
    marginTop: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: theme === 'dark' ? '#2C2C2E' : '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: theme === 'dark' ? '#3C3C3E' : '#E5E5EA',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme === 'dark' ? '#FFFFFF' : '#2C2C2E',
    marginLeft: 12,
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerButton: {
    padding: 8,
    marginLeft: 8,
  },
  scoreCard: {
    margin: 16,
    padding: 16,
    backgroundColor: theme === 'dark' ? '#2C2C2E' : '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  scoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  scoreLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: theme === 'dark' ? '#FFFFFF' : '#2C2C2E',
  },
  scoreContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scoreValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#007BFF',
    marginRight: 8,
  },
  scoreDescription: {
    fontSize: 14,
    color: theme === 'dark' ? '#8E8E93' : '#8E8E93',
  },
  scheduleComparison: {
    margin: 16,
    marginTop: 8,
    padding: 16,
    backgroundColor: theme === 'dark' ? '#2C2C2E' : '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme === 'dark' ? '#FFFFFF' : '#2C2C2E',
    marginBottom: 16,
  },
  scheduleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  scheduleColumn: {
    flex: 1,
  },
  scheduleColumnTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: theme === 'dark' ? '#8E8E93' : '#8E8E93',
    marginBottom: 8,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  scheduleArrow: {
    paddingHorizontal: 16,
    paddingTop: 30,
  },
  timeItem: {
    backgroundColor: theme === 'dark' ? '#3C3C3E' : '#F2F2F7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
    position: 'relative',
  },
  optimizedIcon: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  adaptationsSection: {
    margin: 16,
    marginTop: 8,
  },
  adaptationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme === 'dark' ? '#2C2C2E' : '#FFFFFF',
    padding: 16,
    borderRadius: 8,
    marginBottom: 8,
    borderLeftWidth: 4,
  },
  adaptationIcon: {
    marginRight: 12,
  },
  adaptationContent: {
    flex: 1,
  },
  adaptationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme === 'dark' ? '#FFFFFF' : '#2C2C2E',
    marginBottom: 4,
  },
  adaptationDescription: {
    fontSize: 14,
    color: theme === 'dark' ? '#8E8E93' : '#8E8E93',
    marginBottom: 4,
  },
  adaptationReason: {
    fontSize: 12,
    color: '#007BFF',
    fontStyle: 'italic',
  },
  adaptationAdjustment: {
    marginLeft: 12,
  },
  adjustmentText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  mealAlignmentSection: {
    margin: 16,
    marginTop: 8,
  },
  mealItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme === 'dark' ? '#2C2C2E' : '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  mealIcon: {
    marginRight: 12,
  },
  mealContent: {
    flex: 1,
  },
  mealType: {
    fontSize: 14,
    fontWeight: '600',
    color: theme === 'dark' ? '#FFFFFF' : '#2C2C2E',
  },
  mealTime: {
    fontSize: 12,
    color: theme === 'dark' ? '#8E8E93' : '#8E8E93',
  },
  mealContext: {
    fontSize: 11,
    color: '#FD7E14',
    marginTop: 2,
  },
  familySection: {
    margin: 16,
    marginTop: 8,
  },
  familyItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: theme === 'dark' ? '#2C2C2E' : '#FFFFFF',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  familyIcon: {
    marginRight: 12,
    paddingTop: 2,
  },
  familyContent: {
    flex: 1,
  },
  familyType: {
    fontSize: 14,
    fontWeight: '600',
    color: theme === 'dark' ? '#FFFFFF' : '#2C2C2E',
    marginBottom: 4,
  },
  familyDescription: {
    fontSize: 12,
    color: theme === 'dark' ? '#8E8E93' : '#8E8E93',
    marginBottom: 4,
  },
  familySuggestion: {
    fontSize: 11,
    color: '#28A745',
  },
  actionContainer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  previewButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#007BFF',
    paddingVertical: 12,
    borderRadius: 8,
  },
  previewButtonText: {
    color: '#007BFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  applyButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#007BFF',
    paddingVertical: 12,
    borderRadius: 8,
  },
  applyButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: theme === 'dark' ? '#1C1C1E' : '#F2F2F7',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: theme === 'dark' ? '#2C2C2E' : '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: theme === 'dark' ? '#3C3C3E' : '#E5E5EA',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme === 'dark' ? '#FFFFFF' : '#2C2C2E',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  preferenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme === 'dark' ? '#3C3C3E' : '#E5E5EA',
  },
  preferenceLabel: {
    fontSize: 16,
    color: theme === 'dark' ? '#FFFFFF' : '#2C2C2E',
    flex: 1,
    marginRight: 16,
  },
  adaptationDetail: {
    padding: 16,
  },
  adaptationDetailDescription: {
    fontSize: 16,
    color: theme === 'dark' ? '#FFFFFF' : '#2C2C2E',
    lineHeight: 24,
    marginBottom: 16,
  },
  adaptationDetailReason: {
    fontSize: 14,
    color: '#007BFF',
    fontStyle: 'italic',
    marginBottom: 20,
  },
  adaptationDetailMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: theme === 'dark' ? '#3C3C3E' : '#E5E5EA',
  },
  metaLabel: {
    fontSize: 14,
    color: theme === 'dark' ? '#8E8E93' : '#8E8E93',
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '600',
    color: theme === 'dark' ? '#FFFFFF' : '#2C2C2E',
  },
});

export default CulturalSchedulingInterface;