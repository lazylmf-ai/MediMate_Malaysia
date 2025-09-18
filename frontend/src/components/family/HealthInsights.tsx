/**
 * Health Insights Component
 *
 * Displays family health analytics, trends, and culturally-appropriate
 * recommendations for Malaysian families. Includes adherence patterns,
 * health scores, and celebration of positive milestones.
 */

import React, { useMemo, useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useCulturalTheme, useCulturalStyles } from '@/components/language/ui/CulturalThemeProvider';
import { useTranslation } from '@/i18n/hooks/useTranslation';
import {
  HealthInsightsProps,
  HealthInsight,
  FamilyHealthTrend,
  FamilyDashboardData,
} from '@/types/family';

const { width: screenWidth } = Dimensions.get('window');

interface InsightCardData {
  insight: HealthInsight;
  trend?: FamilyHealthTrend;
  priority: number;
  culturallyRelevant: boolean;
}

export const HealthInsights: React.FC<HealthInsightsProps> = ({
  familyData,
  timeRange = '7d',
  onInsightPress,
  showTrends = true,
  culturalHealthMetrics = true,
}) => {
  const { t } = useTranslation();
  const { currentTheme } = useCulturalTheme();
  const culturalStyles = useCulturalStyles();

  // State for expanded insights
  const [expandedInsights, setExpandedInsights] = useState<Set<string>>(new Set());

  // Generate health insights from family data
  const generatedInsights = useMemo((): InsightCardData[] => {
    const insights: InsightCardData[] = [];

    if (!familyData) return insights;

    const { members, medicationSummary, recentActivity } = familyData;

    // Calculate family-wide metrics
    const totalMembers = members.length;
    const totalMedications = medicationSummary.reduce((sum, member) => sum + member.medicationCount, 0);
    const averageAdherence = medicationSummary.reduce((sum, member) => sum + member.adherenceRate, 0) / totalMembers;
    const totalMissed = medicationSummary.reduce((sum, member) => sum + member.missedToday, 0);
    const totalCriticalMissed = medicationSummary.reduce((sum, member) => sum + member.criticalMissed, 0);

    // Adherence Celebration Insight
    if (averageAdherence >= 95) {
      insights.push({
        insight: {
          id: 'adherence_celebration',
          type: 'celebration',
          title: t('insights.adherence.excellent.title'),
          description: t('insights.adherence.excellent.description', {
            percentage: Math.round(averageAdherence),
            family: familyData.family.name,
          }),
          severity: 'success',
          data: { adherence: averageAdherence, members: totalMembers },
          actionable: true,
          culturalContext: {
            appropriate: true,
            reason: t('insights.cultural.family_harmony'),
          },
          createdAt: new Date(),
        },
        priority: 1,
        culturallyRelevant: true,
      });
    }

    // Family Adherence Trend
    if (showTrends) {
      const adherenceTrend = calculateAdherenceTrend(medicationSummary, timeRange);
      if (adherenceTrend) {
        insights.push({
          insight: {
            id: 'adherence_trend',
            type: 'trend',
            title: t('insights.trend.adherence.title'),
            description: t('insights.trend.adherence.description', {
              improvement: adherenceTrend.improvement,
              period: timeRange,
            }),
            severity: adherenceTrend.improvement > 0 ? 'success' : 'warning',
            data: adherenceTrend,
            actionable: adherenceTrend.improvement < 0,
            culturalContext: {
              appropriate: culturalHealthMetrics,
              reason: t('insights.cultural.collective_responsibility'),
            },
            createdAt: new Date(),
          },
          trend: adherenceTrend,
          priority: 2,
          culturallyRelevant: culturalHealthMetrics,
        });
      }
    }

    // Critical Medication Alert
    if (totalCriticalMissed > 0) {
      insights.push({
        insight: {
          id: 'critical_missed',
          type: 'alert',
          title: t('insights.critical.title'),
          description: t('insights.critical.description', {
            count: totalCriticalMissed,
            members: medicationSummary.filter(m => m.criticalMissed > 0).length,
          }),
          severity: 'error',
          data: { criticalMissed: totalCriticalMissed },
          actionable: true,
          culturalContext: {
            appropriate: true,
            reason: t('insights.cultural.elder_care'),
          },
          createdAt: new Date(),
        },
        priority: 0, // Highest priority
        culturallyRelevant: true,
      });
    }

    // Family Support Recommendation
    if (averageAdherence < 80 && totalMembers > 1) {
      insights.push({
        insight: {
          id: 'family_support',
          type: 'recommendation',
          title: t('insights.support.title'),
          description: t('insights.support.description', {
            weakestMember: findWeakestMember(medicationSummary)?.userName || t('insights.support.member'),
          }),
          severity: 'warning',
          data: { averageAdherence, needsSupport: true },
          actionable: true,
          culturalContext: {
            appropriate: culturalHealthMetrics,
            reason: t('insights.cultural.mutual_care'),
          },
          createdAt: new Date(),
        },
        priority: 3,
        culturallyRelevant: culturalHealthMetrics,
      });
    }

    // Ramadan Medication Adjustment (Cultural)
    if (culturalHealthMetrics && isRamadanPeriod()) {
      insights.push({
        insight: {
          id: 'ramadan_adjustment',
          type: 'recommendation',
          title: t('insights.ramadan.title'),
          description: t('insights.ramadan.description'),
          severity: 'info',
          data: { ramadan: true, membersAffected: totalMembers },
          actionable: true,
          culturalContext: {
            appropriate: true,
            reason: t('insights.cultural.religious_observance'),
          },
          createdAt: new Date(),
        },
        priority: 2,
        culturallyRelevant: true,
      });
    }

    // Family Health Score
    const familyHealthScore = calculateFamilyHealthScore(medicationSummary, recentActivity);
    insights.push({
      insight: {
        id: 'family_health_score',
        type: 'trend',
        title: t('insights.health_score.title'),
        description: t('insights.health_score.description', {
          score: familyHealthScore,
          family: familyData.family.name,
        }),
        severity: familyHealthScore >= 80 ? 'success' : familyHealthScore >= 60 ? 'warning' : 'error',
        data: { healthScore: familyHealthScore },
        actionable: familyHealthScore < 80,
        culturalContext: {
          appropriate: culturalHealthMetrics,
          reason: t('insights.cultural.holistic_health'),
        },
        createdAt: new Date(),
      },
      priority: 4,
      culturallyRelevant: culturalHealthMetrics,
    });

    // Sort by priority and cultural relevance
    return insights.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      if (a.culturallyRelevant && !b.culturallyRelevant) return -1;
      if (!a.culturallyRelevant && b.culturallyRelevant) return 1;
      return 0;
    });
  }, [familyData, timeRange, showTrends, culturalHealthMetrics, t]);

  // Calculate adherence trend
  const calculateAdherenceTrend = useCallback((medicationSummary: any[], period: string): FamilyHealthTrend | null => {
    // Simplified trend calculation - in real implementation, this would use historical data
    const averageAdherence = medicationSummary.reduce((sum, member) => sum + member.adherenceRate, 0) / medicationSummary.length;

    // Mock historical data for demonstration
    const mockValues = Array.from({ length: period === '24h' ? 24 : period === '7d' ? 7 : 30 }, (_, i) => {
      return averageAdherence + (Math.random() - 0.5) * 10; // ±5% variation
    });

    const improvement = mockValues[mockValues.length - 1] - mockValues[0];

    return {
      metric: 'adherence_rate',
      period: period,
      values: mockValues,
      labels: mockValues.map((_, i) => `${i + 1}`),
      improvement: Math.round(improvement * 100) / 100,
      benchmark: 85,
      culturallyRelevant: true,
    };
  }, []);

  // Find member with lowest adherence
  const findWeakestMember = useCallback((medicationSummary: any[]) => {
    return medicationSummary.reduce((weakest, current) =>
      (current.adherenceRate < weakest.adherenceRate) ? current : weakest
    );
  }, []);

  // Check if it's Ramadan period (simplified)
  const isRamadanPeriod = useCallback(() => {
    // In real implementation, this would check against actual Islamic calendar
    const now = new Date();
    const month = now.getMonth();
    return month === 3 || month === 4; // Approximate Ramadan months
  }, []);

  // Calculate family health score
  const calculateFamilyHealthScore = useCallback((medicationSummary: any[], recentActivity: any[]) => {
    const adherenceScore = medicationSummary.reduce((sum, member) => sum + member.adherenceRate, 0) / medicationSummary.length;
    const activityScore = Math.min(recentActivity.length * 5, 100); // Activity engagement
    const consistencyScore = 100 - (medicationSummary.reduce((sum, member) => sum + member.missedToday, 0) * 10);

    return Math.round((adherenceScore * 0.5 + activityScore * 0.2 + consistencyScore * 0.3));
  }, []);

  // Handle insight press
  const handleInsightPress = useCallback((insight: HealthInsight) => {
    onInsightPress?.(insight);
  }, [onInsightPress]);

  // Toggle insight expansion
  const toggleInsightExpansion = useCallback((insightId: string) => {
    setExpandedInsights(prev => {
      const newSet = new Set(prev);
      if (newSet.has(insightId)) {
        newSet.delete(insightId);
      } else {
        newSet.add(insightId);
      }
      return newSet;
    });
  }, []);

  // Get insight styling
  const getInsightStyle = useCallback((severity: HealthInsight['severity']) => {
    switch (severity) {
      case 'success':
        return {
          backgroundColor: '#ECFDF5',
          borderColor: '#10B981',
          iconColor: '#10B981',
          textColor: '#065F46',
        };
      case 'warning':
        return {
          backgroundColor: '#FFFBEB',
          borderColor: '#F59E0B',
          iconColor: '#F59E0B',
          textColor: '#92400E',
        };
      case 'error':
        return {
          backgroundColor: '#FEF2F2',
          borderColor: '#EF4444',
          iconColor: '#EF4444',
          textColor: '#991B1B',
        };
      default:
        return {
          backgroundColor: '#F0F9FF',
          borderColor: '#3B82F6',
          iconColor: '#3B82F6',
          textColor: '#1E40AF',
        };
    }
  }, []);

  // Get insight icon
  const getInsightIcon = useCallback((type: HealthInsight['type'], severity: HealthInsight['severity']) => {
    switch (type) {
      case 'celebration':
        return '🎉';
      case 'trend':
        return severity === 'success' ? '📈' : '📊';
      case 'alert':
        return '⚠️';
      case 'recommendation':
        return '💡';
      default:
        return '📋';
    }
  }, []);

  // Render insight card
  const renderInsightCard = useCallback((insightData: InsightCardData, index: number) => {
    const { insight } = insightData;
    const style = getInsightStyle(insight.severity);
    const icon = getInsightIcon(insight.type, insight.severity);
    const isExpanded = expandedInsights.has(insight.id);

    return (
      <TouchableOpacity
        key={insight.id}
        style={[
          styles.insightCard,
          {
            backgroundColor: style.backgroundColor,
            borderColor: style.borderColor,
          },
          insightData.culturallyRelevant && styles.culturallyRelevantCard,
        ]}
        onPress={() => toggleInsightExpansion(insight.id)}
        activeOpacity={0.7}
        accessibilityLabel={t('insights.accessibility.card', {
          title: insight.title,
          type: insight.type,
        })}
        accessibilityRole="button"
      >
        {/* Card Header */}
        <View style={styles.cardHeader}>
          <View style={styles.headerLeft}>
            <Text style={[styles.insightIcon, { color: style.iconColor }]}>
              {icon}
            </Text>
            <View style={styles.titleContainer}>
              <Text style={[
                styles.insightTitle,
                { color: style.textColor },
              ]}>
                {insight.title}
              </Text>

              {insightData.culturallyRelevant && (
                <View style={styles.culturalBadge}>
                  <Text style={styles.culturalBadgeText}>
                    {t('insights.cultural.badge')}
                  </Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.headerRight}>
            <Text style={[styles.expandIcon, { color: style.textColor }]}>
              {isExpanded ? '▼' : '▶'}
            </Text>
          </View>
        </View>

        {/* Card Description */}
        <Text style={[
          styles.insightDescription,
          { color: style.textColor },
        ]} numberOfLines={isExpanded ? undefined : 2}>
          {insight.description}
        </Text>

        {/* Expanded Content */}
        {isExpanded && (
          <View style={styles.expandedContent}>
            {/* Cultural Context */}
            {insight.culturalContext && (
              <View style={styles.culturalContext}>
                <Text style={[styles.culturalContextTitle, { color: style.textColor }]}>
                  {t('insights.cultural.context')}:
                </Text>
                <Text style={[styles.culturalContextText, { color: style.textColor }]}>
                  {insight.culturalContext.reason}
                </Text>
              </View>
            )}

            {/* Trend Data */}
            {insightData.trend && (
              <View style={styles.trendContainer}>
                <Text style={[styles.trendTitle, { color: style.textColor }]}>
                  {t('insights.trend.title')}:
                </Text>
                <View style={styles.trendData}>
                  <Text style={[styles.trendValue, { color: style.textColor }]}>
                    {insightData.trend.improvement > 0 ? '+' : ''}{insightData.trend.improvement}%
                  </Text>
                  <Text style={[styles.trendPeriod, { color: style.textColor }]}>
                    ({insightData.trend.period})
                  </Text>
                </View>
              </View>
            )}

            {/* Action Button */}
            {insight.actionable && (
              <TouchableOpacity
                style={[styles.actionButton, { borderColor: style.borderColor }]}
                onPress={() => handleInsightPress(insight)}
                activeOpacity={0.7}
              >
                <Text style={[styles.actionButtonText, { color: style.iconColor }]}>
                  {t('insights.action.view')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  }, [
    expandedInsights,
    getInsightStyle,
    getInsightIcon,
    toggleInsightExpansion,
    handleInsightPress,
    t,
  ]);

  // Render empty state
  if (generatedInsights.length === 0) {
    return (
      <View style={[styles.emptyContainer, culturalStyles.cardBackground]}>
        <Text style={styles.emptyIcon}>📊</Text>
        <Text style={[styles.emptyTitle, culturalStyles.text]}>
          {t('insights.empty.title')}
        </Text>
        <Text style={[styles.emptySubtitle, culturalStyles.subtleText]}>
          {t('insights.empty.subtitle')}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, culturalStyles.heading]}>
          {t('insights.title')}
        </Text>
        <View style={styles.insightCount}>
          <Text style={[styles.insightCountText, culturalStyles.text]}>
            {generatedInsights.length}
          </Text>
        </View>
      </View>

      {/* Insights List */}
      <ScrollView
        style={styles.insightsList}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled={true}
      >
        {generatedInsights.map(renderInsightCard)}
      </ScrollView>

      {/* Cultural Information */}
      {culturalHealthMetrics && (
        <View style={styles.culturalInfo}>
          <Text style={[styles.culturalInfoText, culturalStyles.subtleText]}>
            {t('insights.cultural.info')}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  insightCount: {
    backgroundColor: '#3B82F6',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  insightCountText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
  insightsList: {
    flex: 1,
  },
  insightCard: {
    borderRadius: 8,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  culturallyRelevantCard: {
    borderLeftWidth: 4,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  insightIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  titleContainer: {
    flex: 1,
  },
  insightTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  culturalBadge: {
    backgroundColor: '#3B82F6',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  culturalBadgeText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: 'bold',
    textTransform: 'uppercase',
  },
  headerRight: {
    marginLeft: 12,
  },
  expandIcon: {
    fontSize: 14,
  },
  insightDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  expandedContent: {
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.1)',
    paddingTop: 12,
  },
  culturalContext: {
    marginBottom: 12,
  },
  culturalContextTitle: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 4,
  },
  culturalContextText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  trendContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  trendTitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  trendData: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  trendValue: {
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 4,
  },
  trendPeriod: {
    fontSize: 11,
  },
  actionButton: {
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignSelf: 'flex-start',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
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
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    borderRadius: 8,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
  },
});

export default HealthInsights;