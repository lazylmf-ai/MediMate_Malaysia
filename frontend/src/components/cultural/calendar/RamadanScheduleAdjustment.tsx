/**
 * Ramadan Schedule Adjustment Component
 * 
 * Specialized component for adjusting medication schedules during Ramadan
 * with fasting-aware recommendations and cultural guidance
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Switch,
  ActivityIndicator
} from 'react-native';
import { useRamadanScheduling } from '../../../hooks/cultural';
import type { RamadanMedicationSchedule, RamadanConflict } from '../../../hooks/cultural';

export interface RamadanScheduleAdjustmentProps {
  medications: Array<{
    id: string;
    name: string;
    schedule: string[];
    type?: 'before_meals' | 'after_meals' | 'with_food' | 'empty_stomach' | 'as_needed';
    dosage?: string;
    frequency?: string;
  }>;
  onScheduleUpdate?: (adjustedSchedules: RamadanMedicationSchedule[]) => void;
  onConflictResolved?: (medicationId: string, resolution: string) => void;
  theme?: 'light' | 'dark';
  showGuidance?: boolean;
}

export const RamadanScheduleAdjustment: React.FC<RamadanScheduleAdjustmentProps> = ({
  medications,
  onScheduleUpdate,
  onConflictResolved,
  theme = 'light',
  showGuidance = true
}) => {
  const {
    isRamadan,
    daysRemaining,
    currentPhase,
    ramadanSchedule,
    adjustedSchedules,
    fastingHours,
    medicationWindows,
    adjustScheduleForRamadan,
    checkRamadanConflicts,
    getSuhoorIftarTimes,
    getMedicationGuidance,
    isLoading,
    error
  } = useRamadanScheduling();

  const [isAdjustmentEnabled, setIsAdjustmentEnabled] = useState(true);
  const [expandedMedication, setExpandedMedication] = useState<string | null>(null);
  const [showAllGuidance, setShowAllGuidance] = useState(false);

  const styles = createStyles(theme);

  /**
   * Apply Ramadan adjustments when medications change
   */
  useEffect(() => {
    if (isRamadan && isAdjustmentEnabled && medications.length > 0) {
      adjustScheduleForRamadan(medications).then(schedules => {
        onScheduleUpdate?.(schedules);
      });
    }
  }, [medications, isRamadan, isAdjustmentEnabled, adjustScheduleForRamadan, onScheduleUpdate]);

  /**
   * Toggle medication expansion
   */
  const toggleMedicationExpansion = useCallback((medicationId: string) => {
    setExpandedMedication(expandedMedication === medicationId ? null : medicationId);
  }, [expandedMedication]);

  /**
   * Get severity color for conflicts
   */
  const getConflictColor = (severity: 'low' | 'medium' | 'high' | 'critical'): string => {
    switch (severity) {
      case 'low': return '#FFC107';
      case 'medium': return '#FD7E14';
      case 'high': return '#DC3545';
      case 'critical': return '#6F42C1';
      default: return '#6C757D';
    }
  };

  /**
   * Get window display name
   */
  const getWindowDisplayName = (window: string): string => {
    switch (window) {
      case 'pre_suhoor': return 'Pre-Suhoor';
      case 'post_iftar': return 'Post-Iftar';
      case 'night': return 'Night';
      case 'normal': return 'Normal';
      default: return window;
    }
  };

  /**
   * Show conflict resolution options
   */
  const showConflictResolution = useCallback((
    medicationId: string,
    medicationName: string,
    conflicts: RamadanConflict[]
  ) => {
    const conflictMessages = conflicts.map(c => `• ${c.suggestion}`).join('\n');
    
    Alert.alert(
      `Ramadan Conflicts - ${medicationName}`,
      `The following conflicts were detected:\n\n${conflictMessages}\n\nWould you like to apply the suggested adjustments?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Learn More', onPress: () => showMedicationGuidance() },
        { 
          text: 'Apply Changes', 
          onPress: () => {
            onConflictResolved?.(medicationId, 'applied_suggestions');
            Alert.alert('Adjustments Applied', 'Medication schedule has been adjusted for Ramadan fasting periods.');
          }
        }
      ]
    );
  }, [onConflictResolved]);

  /**
   * Show comprehensive medication guidance
   */
  const showMedicationGuidance = useCallback(() => {
    const guidance = getMedicationGuidance();
    const times = getSuhoorIftarTimes();
    
    let message = guidance.join('\n• ');
    
    if (times) {
      message += `\n\nRecommended Timing:\n• Suhoor: ${times.suhoor}\n• Iftar: ${times.iftar}`;
    }
    
    Alert.alert(
      'Ramadan Medication Guidance',
      message,
      [{ text: 'Got it', style: 'default' }]
    );
  }, [getMedicationGuidance, getSuhoorIftarTimes]);

  if (!isRamadan) {
    return (
      <View style={styles.inactiveContainer}>
        <Text style={styles.inactiveTitle}>🌙 Ramadan Schedule Adjustment</Text>
        <Text style={styles.inactiveText}>
          This feature will be available during Ramadan to help adjust medication schedules for fasting periods.
        </Text>
      </View>
    );
  }

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#28A745" />
        <Text style={styles.loadingText}>Calculating Ramadan adjustments...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error: {error}</Text>
      </View>
    );
  }

  const times = getSuhoorIftarTimes();
  const guidance = getMedicationGuidance();

  return (
    <ScrollView style={styles.container}>
      {/* Ramadan Status Header */}
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>🌙 Ramadan Schedule Adjustment</Text>
        <Text style={styles.headerSubtitle}>
          {daysRemaining} days remaining • {currentPhase?.charAt(0).toUpperCase()}{currentPhase?.slice(1)} phase
        </Text>
        
        <View style={styles.enableContainer}>
          <Text style={styles.enableLabel}>Enable Ramadan adjustments</Text>
          <Switch
            value={isAdjustmentEnabled}
            onValueChange={setIsAdjustmentEnabled}
            trackColor={{ false: '#767577', true: '#28A745' }}
            thumbColor={isAdjustmentEnabled ? '#FFFFFF' : '#f4f3f4'}
          />
        </View>
      </View>

      {isAdjustmentEnabled && (
        <>
          {/* Timing Information */}
          {times && fastingHours && (
            <View style={styles.timingContainer}>
              <Text style={styles.timingTitle}>Fasting Schedule</Text>
              <View style={styles.timingRow}>
                <Text style={styles.timingLabel}>Suhoor (Pre-dawn meal):</Text>
                <Text style={styles.timingValue}>{times.suhoor}</Text>
              </View>
              <View style={styles.timingRow}>
                <Text style={styles.timingLabel}>Iftar (Breaking fast):</Text>
                <Text style={styles.timingValue}>{times.iftar}</Text>
              </View>
              <View style={styles.timingRow}>
                <Text style={styles.timingLabel}>Fasting hours:</Text>
                <Text style={styles.timingValue}>{fastingHours.start} - {fastingHours.end}</Text>
              </View>
            </View>
          )}

          {/* Medication Windows */}
          {medicationWindows && (
            <View style={styles.windowsContainer}>
              <Text style={styles.windowsTitle}>Medication Windows</Text>
              <View style={styles.windowItem}>
                <Text style={styles.windowName}>Pre-Suhoor</Text>
                <Text style={styles.windowTime}>
                  {medicationWindows.preSuhoor.start} - {medicationWindows.preSuhoor.end}
                </Text>
                <Text style={styles.windowDescription}>
                  {medicationWindows.preSuhoor.description}
                </Text>
              </View>
              <View style={styles.windowItem}>
                <Text style={styles.windowName}>Post-Iftar</Text>
                <Text style={styles.windowTime}>
                  {medicationWindows.postIftar.start} - {medicationWindows.postIftar.end}
                </Text>
                <Text style={styles.windowDescription}>
                  {medicationWindows.postIftar.description}
                </Text>
              </View>
              <View style={styles.windowItem}>
                <Text style={styles.windowName}>Night</Text>
                <Text style={styles.windowTime}>
                  {medicationWindows.night.start} - {medicationWindows.night.end}
                </Text>
                <Text style={styles.windowDescription}>
                  {medicationWindows.night.description}
                </Text>
              </View>
            </View>
          )}

          {/* Medication Adjustments */}
          {adjustedSchedules.length > 0 && (
            <View style={styles.adjustmentsContainer}>
              <Text style={styles.adjustmentsTitle}>Medication Adjustments</Text>
              
              {adjustedSchedules.map(schedule => {
                const hasConflicts = schedule.conflicts.length > 0;
                const isExpanded = expandedMedication === schedule.medicationId;
                
                return (
                  <View key={schedule.medicationId} style={styles.medicationCard}>
                    <TouchableOpacity
                      style={styles.medicationHeader}
                      onPress={() => toggleMedicationExpansion(schedule.medicationId)}
                    >
                      <View style={styles.medicationTitleContainer}>
                        <Text style={styles.medicationName}>{schedule.medicationName}</Text>
                        {hasConflicts && (
                          <View style={[styles.conflictBadge, {
                            backgroundColor: getConflictColor(
                              schedule.conflicts.reduce((max, c) => 
                                ['low', 'medium', 'high', 'critical'].indexOf(c.severity) > 
                                ['low', 'medium', 'high', 'critical'].indexOf(max) ? c.severity : max, 
                                'low'
                              )
                            )
                          }]}>
                            <Text style={styles.conflictBadgeText}>
                              {schedule.conflicts.length} conflict{schedule.conflicts.length !== 1 ? 's' : ''}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</Text>
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={styles.medicationContent}>
                        {/* Original Schedule */}
                        <View style={styles.scheduleSection}>
                          <Text style={styles.scheduleLabel}>Original Schedule:</Text>
                          <Text style={styles.scheduleValue}>
                            {schedule.originalSchedule.join(', ')}
                          </Text>
                        </View>

                        {/* Adjusted Schedule */}
                        <View style={styles.scheduleSection}>
                          <Text style={styles.scheduleLabel}>Adjusted Schedule:</Text>
                          {schedule.adjustedSchedule.map((timing, index) => (
                            <View key={index} style={styles.adjustedTiming}>
                              <Text style={styles.adjustedTime}>{timing.time}</Text>
                              <Text style={styles.adjustedWindow}>
                                {getWindowDisplayName(timing.window)}
                              </Text>
                              <Text style={styles.adjustedDescription}>
                                {timing.description}
                              </Text>
                              <Text style={styles.adjustedNote}>
                                {timing.culturalNote}
                              </Text>
                            </View>
                          ))}
                        </View>

                        {/* Conflicts */}
                        {hasConflicts && (
                          <View style={styles.conflictsSection}>
                            <Text style={styles.conflictsLabel}>Conflicts Detected:</Text>
                            {schedule.conflicts.map((conflict, index) => (
                              <View key={index} style={styles.conflictItem}>
                                <View style={[styles.conflictSeverity, {
                                  backgroundColor: getConflictColor(conflict.severity)
                                }]} />
                                <View style={styles.conflictContent}>
                                  <Text style={styles.conflictTime}>
                                    {conflict.originalTime} - {conflict.conflict.replace('_', ' ')}
                                  </Text>
                                  <Text style={styles.conflictSuggestion}>
                                    {conflict.suggestion}
                                  </Text>
                                </View>
                              </View>
                            ))}
                            <TouchableOpacity
                              style={styles.resolveButton}
                              onPress={() => showConflictResolution(
                                schedule.medicationId,
                                schedule.medicationName,
                                schedule.conflicts
                              )}
                            >
                              <Text style={styles.resolveButtonText}>Resolve Conflicts</Text>
                            </TouchableOpacity>
                          </View>
                        )}

                        {/* Recommendations */}
                        {schedule.recommendations.length > 0 && (
                          <View style={styles.recommendationsSection}>
                            <Text style={styles.recommendationsLabel}>Recommendations:</Text>
                            {schedule.recommendations.map((rec, index) => (
                              <Text key={index} style={styles.recommendationItem}>
                                • {rec}
                              </Text>
                            ))}
                          </View>
                        )}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          )}

          {/* General Guidance */}
          {showGuidance && guidance.length > 0 && (
            <View style={styles.guidanceContainer}>
              <TouchableOpacity
                style={styles.guidanceHeader}
                onPress={() => setShowAllGuidance(!showAllGuidance)}
              >
                <Text style={styles.guidanceTitle}>General Ramadan Guidance</Text>
                <Text style={styles.expandIcon}>{showAllGuidance ? '▼' : '▶'}</Text>
              </TouchableOpacity>
              
              {showAllGuidance && (
                <View style={styles.guidanceContent}>
                  {guidance.map((item, index) => (
                    <Text key={index} style={styles.guidanceItem}>
                      • {item}
                    </Text>
                  ))}
                  <TouchableOpacity
                    style={styles.moreGuidanceButton}
                    onPress={showMedicationGuidance}
                  >
                    <Text style={styles.moreGuidanceText}>View Detailed Guidance</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
};

const createStyles = (theme: 'light' | 'dark') => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme === 'dark' ? '#1C1C1E' : '#F2F2F7',
  },
  inactiveContainer: {
    backgroundColor: theme === 'dark' ? '#2C2C2E' : '#FFFFFF',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  inactiveTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme === 'dark' ? '#FFFFFF' : '#2C2C2E',
    marginBottom: 12,
  },
  inactiveText: {
    fontSize: 14,
    color: theme === 'dark' ? '#8E8E93' : '#8E8E93',
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingContainer: {
    backgroundColor: theme === 'dark' ? '#2C2C2E' : '#FFFFFF',
    margin: 16,
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme === 'dark' ? '#FFFFFF' : '#2C2C2E',
  },
  errorContainer: {
    backgroundColor: theme === 'dark' ? '#2C2C2E' : '#FFFFFF',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#DC3545',
    textAlign: 'center',
  },
  headerContainer: {
    backgroundColor: '#28A745',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  headerSubtitle: {
    color: '#FFFFFF',
    fontSize: 14,
    opacity: 0.9,
    marginBottom: 16,
  },
  enableContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  enableLabel: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  timingContainer: {
    backgroundColor: theme === 'dark' ? '#2C2C2E' : '#FFFFFF',
    margin: 16,
    marginTop: 8,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  timingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme === 'dark' ? '#FFFFFF' : '#2C2C2E',
    marginBottom: 12,
  },
  timingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  timingLabel: {
    fontSize: 14,
    color: theme === 'dark' ? '#8E8E93' : '#8E8E93',
  },
  timingValue: {
    fontSize: 14,
    fontWeight: '600',
    color: theme === 'dark' ? '#FFFFFF' : '#2C2C2E',
  },
  windowsContainer: {
    backgroundColor: theme === 'dark' ? '#2C2C2E' : '#FFFFFF',
    margin: 16,
    marginTop: 8,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  windowsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme === 'dark' ? '#FFFFFF' : '#2C2C2E',
    marginBottom: 12,
  },
  windowItem: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme === 'dark' ? '#3C3C3E' : '#E5E5EA',
  },
  windowName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme === 'dark' ? '#FFFFFF' : '#2C2C2E',
    marginBottom: 4,
  },
  windowTime: {
    fontSize: 14,
    color: '#28A745',
    fontWeight: '500',
    marginBottom: 2,
  },
  windowDescription: {
    fontSize: 12,
    color: theme === 'dark' ? '#8E8E93' : '#8E8E93',
  },
  adjustmentsContainer: {
    margin: 16,
    marginTop: 8,
  },
  adjustmentsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme === 'dark' ? '#FFFFFF' : '#2C2C2E',
    marginBottom: 12,
  },
  medicationCard: {
    backgroundColor: theme === 'dark' ? '#2C2C2E' : '#FFFFFF',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  medicationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  medicationTitleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  medicationName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme === 'dark' ? '#FFFFFF' : '#2C2C2E',
    marginRight: 12,
  },
  conflictBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  conflictBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  expandIcon: {
    fontSize: 16,
    color: theme === 'dark' ? '#8E8E93' : '#8E8E93',
  },
  medicationContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  scheduleSection: {
    marginBottom: 16,
  },
  scheduleLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme === 'dark' ? '#FFFFFF' : '#2C2C2E',
    marginBottom: 8,
  },
  scheduleValue: {
    fontSize: 14,
    color: theme === 'dark' ? '#8E8E93' : '#8E8E93',
  },
  adjustedTiming: {
    backgroundColor: theme === 'dark' ? '#1C1C1E' : '#F2F2F7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  adjustedTime: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#28A745',
    marginBottom: 4,
  },
  adjustedWindow: {
    fontSize: 14,
    fontWeight: '600',
    color: theme === 'dark' ? '#FFFFFF' : '#2C2C2E',
    marginBottom: 4,
  },
  adjustedDescription: {
    fontSize: 13,
    color: theme === 'dark' ? '#8E8E93' : '#8E8E93',
    marginBottom: 4,
  },
  adjustedNote: {
    fontSize: 12,
    color: '#FD7E14',
    fontStyle: 'italic',
  },
  conflictsSection: {
    marginBottom: 16,
  },
  conflictsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#DC3545',
    marginBottom: 8,
  },
  conflictItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  conflictSeverity: {
    width: 4,
    height: '100%',
    marginRight: 12,
    borderRadius: 2,
    minHeight: 40,
  },
  conflictContent: {
    flex: 1,
  },
  conflictTime: {
    fontSize: 13,
    fontWeight: '600',
    color: theme === 'dark' ? '#FFFFFF' : '#2C2C2E',
    marginBottom: 4,
  },
  conflictSuggestion: {
    fontSize: 12,
    color: theme === 'dark' ? '#8E8E93' : '#8E8E93',
  },
  resolveButton: {
    backgroundColor: '#DC3545',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  resolveButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  recommendationsSection: {
    marginBottom: 16,
  },
  recommendationsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme === 'dark' ? '#FFFFFF' : '#2C2C2E',
    marginBottom: 8,
  },
  recommendationItem: {
    fontSize: 13,
    color: theme === 'dark' ? '#8E8E93' : '#8E8E93',
    marginBottom: 4,
    paddingLeft: 8,
  },
  guidanceContainer: {
    backgroundColor: theme === 'dark' ? '#2C2C2E' : '#FFFFFF',
    margin: 16,
    marginTop: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  guidanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  guidanceTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme === 'dark' ? '#FFFFFF' : '#2C2C2E',
  },
  guidanceContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  guidanceItem: {
    fontSize: 14,
    color: theme === 'dark' ? '#8E8E93' : '#8E8E93',
    marginBottom: 8,
    lineHeight: 20,
  },
  moreGuidanceButton: {
    backgroundColor: '#28A745',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  moreGuidanceText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default RamadanScheduleAdjustment;