/**
 * Festival Medication Impact Component
 * 
 * Shows how upcoming festivals will impact medication schedules
 * with cultural guidance and timing recommendations
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator
} from 'react-native';
import { useFestivalCalendar } from '../../../hooks/cultural';
import type { FestivalEvent } from '../../../services/festivals/FestivalCalendarService';

export interface FestivalMedicationImpactProps {
  medications?: Array<{
    id: string;
    name: string;
    schedule: string[];
    type?: 'before_meals' | 'after_meals' | 'with_food' | 'empty_stomach' | 'as_needed';
  }>;
  daysAhead?: number;
  showCulturalGuidance?: boolean;
  onImpactSelect?: (festival: FestivalEvent, impact: any) => void;
  theme?: 'light' | 'dark';
}

interface FestivalImpact {
  festival: FestivalEvent;
  impactLevel: 'none' | 'low' | 'medium' | 'high';
  affectedMedications: string[];
  recommendations: string[];
  culturalConsiderations: string[];
  timingAdjustments: Array<{
    medicationId: string;
    originalTime: string;
    suggestedTime: string;
    reason: string;
  }>;
}

export const FestivalMedicationImpact: React.FC<FestivalMedicationImpactProps> = ({
  medications = [],
  daysAhead = 30,
  showCulturalGuidance = true,
  onImpactSelect,
  theme = 'light'
}) => {
  const {
    upcomingFestivals,
    checkFestivalConflict,
    getFestivalMedicationGuidance,
    isLoading,
    error
  } = useFestivalCalendar({ daysAhead });

  const [festivalImpacts, setFestivalImpacts] = useState<FestivalImpact[]>([]);
  const [expandedFestival, setExpandedFestival] = useState<string | null>(null);
  const [isCalculating, setIsCalculating] = useState(false);

  const styles = createStyles(theme);

  /**
   * Calculate festival impacts on medications
   */
  const calculateFestivalImpacts = useCallback(async () => {
    if (upcomingFestivals.length === 0 || medications.length === 0) {
      setFestivalImpacts([]);
      return;
    }

    setIsCalculating(true);
    
    try {
      const impacts: FestivalImpact[] = [];

      for (const festival of upcomingFestivals) {
        const affectedMedications: string[] = [];
        const recommendations: string[] = [];
        const timingAdjustments: FestivalImpact['timingAdjustments'] = [];

        let impactLevel: FestivalImpact['impactLevel'] = 'none';

        // Check each medication against festival
        for (const medication of medications) {
          const guidance = await getFestivalMedicationGuidance(
            festival.id,
            medication.type || 'as_needed'
          );

          if (guidance || festival.medicationImpact.timingAdjustments) {
            affectedMedications.push(medication.name);

            // Calculate timing adjustments
            for (const originalTime of medication.schedule) {
              const adjustment = calculateTimingAdjustment(
                originalTime,
                festival,
                medication.type
              );
              
              if (adjustment.suggestedTime !== originalTime) {
                timingAdjustments.push({
                  medicationId: medication.id,
                  originalTime,
                  suggestedTime: adjustment.suggestedTime,
                  reason: adjustment.reason
                });
              }
            }
          }

          // Determine impact level
          if (festival.medicationImpact.fasting) {
            impactLevel = 'high';
          } else if (festival.medicationImpact.timingAdjustments) {
            impactLevel = impactLevel === 'none' ? 'medium' : impactLevel;
          } else if (guidance?.warnings?.length > 0) {
            impactLevel = impactLevel === 'none' ? 'low' : impactLevel;
          }
        }

        // Add festival-specific recommendations
        recommendations.push(...festival.medicationImpact.recommendedScheduling);
        
        if (festival.medicationImpact.fasting) {
          recommendations.push('Consult healthcare provider about fasting adjustments');
          recommendations.push('Stay hydrated during permitted hours');
        }

        const culturalConsiderations = [
          ...festival.culturalGuidance.preparation,
          ...festival.culturalGuidance.observance
        ];

        impacts.push({
          festival,
          impactLevel,
          affectedMedications,
          recommendations,
          culturalConsiderations,
          timingAdjustments
        });
      }

      // Sort by impact level and proximity
      impacts.sort((a, b) => {
        const impactOrder = { high: 3, medium: 2, low: 1, none: 0 };
        const impactDiff = impactOrder[b.impactLevel] - impactOrder[a.impactLevel];
        
        if (impactDiff !== 0) return impactDiff;
        
        // If same impact, sort by date
        return a.festival.date.getTime() - b.festival.date.getTime();
      });

      setFestivalImpacts(impacts);
    } catch (err) {
      console.error('Error calculating festival impacts:', err);
    } finally {
      setIsCalculating(false);
    }
  }, [upcomingFestivals, medications, getFestivalMedicationGuidance]);

  /**
   * Calculate timing adjustment for a medication
   */
  const calculateTimingAdjustment = (
    originalTime: string,
    festival: FestivalEvent,
    medicationType?: string
  ) => {
    const hour = parseInt(originalTime.split(':')[0]);
    
    if (!festival.medicationImpact.timingAdjustments) {
      return { suggestedTime: originalTime, reason: 'No adjustment needed' };
    }

    // Ramadan/Islamic fasting adjustments
    if (festival.type === 'islamic' && festival.medicationImpact.fasting) {
      if (hour >= 6 && hour <= 19) {
        if (medicationType === 'with_food' || medicationType === 'after_meals') {
          if (hour < 12) {
            return {
              suggestedTime: '04:30',
              reason: 'Take with Suhoor (pre-dawn meal)'
            };
          } else {
            return {
              suggestedTime: '19:45',
              reason: 'Take with Iftar (breaking fast meal)'
            };
          }
        } else {
          return {
            suggestedTime: hour < 12 ? '03:30' : '20:30',
            reason: 'Avoid daytime fasting hours'
          };
        }
      }
    }

    // Chinese New Year family meal adjustments
    if (festival.type === 'chinese' && festival.name.includes('New Year')) {
      if (hour >= 11 && hour <= 14) {
        return {
          suggestedTime: '09:30',
          reason: 'Before family reunion preparations'
        };
      }
      if (hour >= 17 && hour <= 20) {
        return {
          suggestedTime: '21:30',
          reason: 'After reunion dinner'
        };
      }
    }

    // Hindu festival fasting adjustments
    if (festival.type === 'hindu' && festival.medicationImpact.fasting) {
      if (festival.medicationImpact.fastingType === 'partial') {
        if (hour >= 8 && hour <= 16) {
          return {
            suggestedTime: hour < 12 ? '07:00' : '17:30',
            reason: 'Outside partial fasting period'
          };
        }
      }
    }

    return { suggestedTime: originalTime, reason: 'No adjustment needed' };
  };

  /**
   * Toggle festival expansion
   */
  const toggleFestivalExpansion = useCallback((festivalId: string) => {
    setExpandedFestival(expandedFestival === festivalId ? null : festivalId);
  }, [expandedFestival]);

  /**
   * Get impact color
   */
  const getImpactColor = (level: FestivalImpact['impactLevel']): string => {
    switch (level) {
      case 'high': return '#DC3545';
      case 'medium': return '#FD7E14';
      case 'low': return '#FFC107';
      case 'none': return '#6C757D';
    }
  };

  /**
   * Get festival type icon
   */
  const getFestivalIcon = (type: string): string => {
    switch (type) {
      case 'islamic': return '🕌';
      case 'chinese': return '🏮';
      case 'hindu': return '🪔';
      case 'malaysian': return '🇲🇾';
      case 'public_holiday': return '📅';
      default: return '🎉';
    }
  };

  /**
   * Show detailed impact information
   */
  const showDetailedImpact = useCallback((impact: FestivalImpact) => {
    const adjustmentText = impact.timingAdjustments.length > 0 ?
      `\n\nTiming Adjustments:\n${impact.timingAdjustments.map(adj => 
        `• ${adj.originalTime} → ${adj.suggestedTime} (${adj.reason})`
      ).join('\n')}` : '';

    const recommendationText = impact.recommendations.length > 0 ?
      `\n\nRecommendations:\n${impact.recommendations.map(rec => `• ${rec}`).join('\n')}` : '';

    Alert.alert(
      `${impact.festival.name} - Medication Impact`,
      `Impact Level: ${impact.impactLevel.toUpperCase()}\n\nAffected Medications: ${impact.affectedMedications.join(', ')}${adjustmentText}${recommendationText}`,
      [
        { text: 'Close', style: 'cancel' },
        ...(onImpactSelect ? [
          { text: 'View Details', onPress: () => onImpactSelect(impact.festival, impact) }
        ] : [])
      ]
    );
  }, [onImpactSelect]);

  // Calculate impacts when festivals or medications change
  useEffect(() => {
    calculateFestivalImpacts();
  }, [calculateFestivalImpacts]);

  if (isLoading || isCalculating) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007BFF" />
        <Text style={styles.loadingText}>
          {isLoading ? 'Loading festivals...' : 'Calculating medication impacts...'}
        </Text>
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

  if (festivalImpacts.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>🎉 No Festival Impacts</Text>
        <Text style={styles.emptyText}>
          {medications.length === 0 
            ? 'Add medications to see festival impacts'
            : 'No upcoming festivals will affect your medication schedule'}
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.headerContainer}>
        <Text style={styles.headerTitle}>Festival Medication Impacts</Text>
        <Text style={styles.headerSubtitle}>
          Upcoming festivals that may affect your medication schedule
        </Text>
      </View>

      {festivalImpacts.map(impact => {
        const isExpanded = expandedFestival === impact.festival.id;
        const daysUntil = Math.ceil(
          (impact.festival.date.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        );

        return (
          <View key={impact.festival.id} style={styles.impactCard}>
            <TouchableOpacity
              style={styles.impactHeader}
              onPress={() => toggleFestivalExpansion(impact.festival.id)}
            >
              <View style={styles.festivalInfo}>
                <View style={styles.festivalTitleRow}>
                  <Text style={styles.festivalIcon}>
                    {getFestivalIcon(impact.festival.type)}
                  </Text>
                  <View style={styles.festivalTitleContainer}>
                    <Text style={styles.festivalName}>{impact.festival.name}</Text>
                    <Text style={styles.festivalDate}>
                      {impact.festival.date.toLocaleDateString('en-MY')} • {daysUntil} day{daysUntil !== 1 ? 's' : ''} away
                    </Text>
                  </View>
                </View>
                
                <View style={[styles.impactBadge, {
                  backgroundColor: getImpactColor(impact.impactLevel)
                }]}>
                  <Text style={styles.impactBadgeText}>
                    {impact.impactLevel.toUpperCase()} IMPACT
                  </Text>
                </View>
              </View>
              
              <Text style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</Text>
            </TouchableOpacity>

            {isExpanded && (
              <View style={styles.impactContent}>
                {/* Affected Medications */}
                {impact.affectedMedications.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Affected Medications</Text>
                    <View style={styles.medicationList}>
                      {impact.affectedMedications.map((medName, index) => (
                        <View key={index} style={styles.medicationItem}>
                          <Text style={styles.medicationName}>• {medName}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Timing Adjustments */}
                {impact.timingAdjustments.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Suggested Timing Adjustments</Text>
                    {impact.timingAdjustments.map((adjustment, index) => (
                      <View key={index} style={styles.adjustmentItem}>
                        <Text style={styles.timeChange}>
                          {adjustment.originalTime} → {adjustment.suggestedTime}
                        </Text>
                        <Text style={styles.adjustmentReason}>{adjustment.reason}</Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Recommendations */}
                {impact.recommendations.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Recommendations</Text>
                    {impact.recommendations.map((rec, index) => (
                      <Text key={index} style={styles.recommendationItem}>
                        • {rec}
                      </Text>
                    ))}
                  </View>
                )}

                {/* Cultural Considerations */}
                {showCulturalGuidance && impact.culturalConsiderations.length > 0 && (
                  <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Cultural Considerations</Text>
                    {impact.culturalConsiderations.slice(0, 3).map((consideration, index) => (
                      <Text key={index} style={styles.culturalItem}>
                        • {consideration}
                      </Text>
                    ))}
                  </View>
                )}

                {/* Action Button */}
                <TouchableOpacity
                  style={[styles.actionButton, {
                    backgroundColor: getImpactColor(impact.impactLevel)
                  }]}
                  onPress={() => showDetailedImpact(impact)}
                >
                  <Text style={styles.actionButtonText}>View Detailed Impact</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        );
      })}

      {/* Summary */}
      <View style={styles.summaryContainer}>
        <Text style={styles.summaryTitle}>Summary</Text>
        <Text style={styles.summaryText}>
          {festivalImpacts.filter(i => i.impactLevel === 'high').length} high impact, {' '}
          {festivalImpacts.filter(i => i.impactLevel === 'medium').length} medium impact, {' '}
          {festivalImpacts.filter(i => i.impactLevel === 'low').length} low impact festivals
        </Text>
        <Text style={styles.summaryNote}>
          Consult your healthcare provider for significant medication schedule changes.
        </Text>
      </View>
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
    padding: 40,
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
  emptyContainer: {
    backgroundColor: theme === 'dark' ? '#2C2C2E' : '#FFFFFF',
    margin: 16,
    padding: 40,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme === 'dark' ? '#FFFFFF' : '#2C2C2E',
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: theme === 'dark' ? '#8E8E93' : '#8E8E93',
    textAlign: 'center',
    lineHeight: 20,
  },
  headerContainer: {
    backgroundColor: theme === 'dark' ? '#2C2C2E' : '#FFFFFF',
    margin: 16,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme === 'dark' ? '#FFFFFF' : '#2C2C2E',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: theme === 'dark' ? '#8E8E93' : '#8E8E93',
    lineHeight: 20,
  },
  impactCard: {
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
  impactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  festivalInfo: {
    flex: 1,
  },
  festivalTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  festivalIcon: {
    fontSize: 24,
    marginRight: 12,
  },
  festivalTitleContainer: {
    flex: 1,
  },
  festivalName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme === 'dark' ? '#FFFFFF' : '#2C2C2E',
    marginBottom: 4,
  },
  festivalDate: {
    fontSize: 14,
    color: theme === 'dark' ? '#8E8E93' : '#8E8E93',
  },
  impactBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  impactBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  expandIcon: {
    fontSize: 16,
    color: theme === 'dark' ? '#8E8E93' : '#8E8E93',
    marginLeft: 16,
  },
  impactContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: theme === 'dark' ? '#FFFFFF' : '#2C2C2E',
    marginBottom: 8,
  },
  medicationList: {
    paddingLeft: 8,
  },
  medicationItem: {
    marginBottom: 4,
  },
  medicationName: {
    fontSize: 14,
    color: theme === 'dark' ? '#8E8E93' : '#8E8E93',
  },
  adjustmentItem: {
    backgroundColor: theme === 'dark' ? '#1C1C1E' : '#F2F2F7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  timeChange: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#007BFF',
    marginBottom: 4,
  },
  adjustmentReason: {
    fontSize: 12,
    color: theme === 'dark' ? '#8E8E93' : '#8E8E93',
  },
  recommendationItem: {
    fontSize: 14,
    color: theme === 'dark' ? '#8E8E93' : '#8E8E93',
    marginBottom: 6,
    lineHeight: 20,
  },
  culturalItem: {
    fontSize: 14,
    color: theme === 'dark' ? '#8E8E93' : '#8E8E93',
    marginBottom: 6,
    lineHeight: 20,
  },
  actionButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  summaryContainer: {
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
  summaryTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme === 'dark' ? '#FFFFFF' : '#2C2C2E',
    marginBottom: 8,
  },
  summaryText: {
    fontSize: 14,
    color: theme === 'dark' ? '#8E8E93' : '#8E8E93',
    marginBottom: 8,
  },
  summaryNote: {
    fontSize: 12,
    color: '#FD7E14',
    fontStyle: 'italic',
  },
});

export default FestivalMedicationImpact;