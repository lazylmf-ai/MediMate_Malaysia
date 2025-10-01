/**
 * Adherence Analytics Component
 *
 * Interactive charts and analytics for medication adherence with Malaysian cultural context.
 * Supports multiple visualization types, family pattern analysis, and cultural insights.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LineChart, BarChart, PieChart } from 'react-native-chart-kit';
import * as Animatable from 'react-native-animatable';
import { useCulturalTheme, useCulturalStyles } from '@/components/language/ui/CulturalThemeProvider';
import { useTranslation } from '@/i18n/hooks/useTranslation';
import {
  ProgressMetrics,
  AdherencePattern,
  CulturalInsight,
  MetricPeriod,
  AdherenceTrend,
  MedicationAdherenceMetric,
} from '@/types/adherence';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface AdherenceAnalyticsProps {
  patientId: string;
  metrics: ProgressMetrics;
  period: MetricPeriod;
  showCulturalInsights?: boolean;
  showFamilyPatterns?: boolean;
  onPatternSelect?: (pattern: AdherencePattern) => void;
  onInsightSelect?: (insight: CulturalInsight) => void;
}

type AnalyticsView = 'trends' | 'patterns' | 'cultural' | 'comparison' | 'heatmap';

export const AdherenceAnalytics: React.FC<AdherenceAnalyticsProps> = ({
  patientId,
  metrics,
  period,
  showCulturalInsights = true,
  showFamilyPatterns = false,
  onPatternSelect,
  onInsightSelect,
}) => {
  const { theme, isElderlyMode } = useCulturalTheme();
  const { getCardStyle, getTextStyle, getButtonStyle } = useCulturalStyles();
  const { t } = useTranslation();

  const [activeView, setActiveView] = useState<AnalyticsView>('trends');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState<number>(30);
  const [selectedMedications, setSelectedMedications] = useState<string[]>([]);

  const chartConfig = {
    backgroundColor: theme.colors.surface,
    backgroundGradientFrom: theme.colors.surface,
    backgroundGradientTo: theme.colors.surface,
    decimalPlaces: 1,
    color: (opacity = 1) => `rgba(59, 130, 246, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
    style: {
      borderRadius: 8,
    },
    propsForDots: {
      r: '4',
      strokeWidth: '2',
      stroke: theme.colors.primary,
    },
  };

  const malaysianColors = {
    primary: '#DC143C', // Malaysian red
    secondary: '#FFD700', // Gold
    accent: '#228B22', // Green
    warning: '#FF8C00', // Orange
    cultural: '#4B0082', // Indigo for cultural elements
  };

  // Process data for analytics
  const analyticsData = useMemo(() => {
    const filteredMedications = selectedMedications.length > 0
      ? metrics.medications.filter(m => selectedMedications.includes(m.medicationId))
      : metrics.medications;

    return {
      adherenceTrends: generateTrendData(filteredMedications),
      culturalPatterns: analyzeCulturalPatterns(metrics.patterns),
      timingAnalysis: analyzeTimingPatterns(filteredMedications),
      comparisonData: generateComparisonData(filteredMedications),
      heatmapData: generateHeatmapData(filteredMedications),
    };
  }, [metrics, selectedMedications]);

  const generateTrendData = (medications: MedicationAdherenceMetric[]) => {
    const allTrends: AdherenceTrend[] = [];
    medications.forEach(med => {
      allTrends.push(...med.trends);
    });

    // Group by date and calculate average
    const grouped = allTrends.reduce((acc, trend) => {
      const dateKey = trend.date.toDateString();
      if (!acc[dateKey]) {
        acc[dateKey] = { rates: [], date: trend.date };
      }
      acc[dateKey].rates.push(trend.adherenceRate);
      return acc;
    }, {} as Record<string, { rates: number[], date: Date }>);

    return Object.values(grouped).map(group => ({
      date: group.date,
      adherenceRate: group.rates.reduce((sum, rate) => sum + rate, 0) / group.rates.length,
      dosesScheduled: group.rates.length,
      dosesTaken: Math.round(group.rates.length * group.rates.reduce((sum, rate) => sum + rate, 0) / (group.rates.length * 100)),
      confidence: 0.9,
    })).sort((a, b) => a.date.getTime() - b.date.getTime());
  };

  const analyzeCulturalPatterns = (patterns: AdherencePattern[]) => {
    return patterns.filter(pattern =>
      pattern.culturalFactors && pattern.culturalFactors.length > 0
    ).map(pattern => ({
      ...pattern,
      culturalImpact: calculateCulturalImpact(pattern),
      recommendations: generateCulturalRecommendations(pattern),
    }));
  };

  const calculateCulturalImpact = (pattern: AdherencePattern): number => {
    const culturalTypes = ['prayer_time_conflict', 'fasting_adjustment', 'festival_period_change'];
    return culturalTypes.includes(pattern.type) ? pattern.confidence * 100 : 0;
  };

  const generateCulturalRecommendations = (pattern: AdherencePattern): string[] => {
    const recommendations: string[] = [];

    if (pattern.type === 'prayer_time_conflict') {
      recommendations.push('Adjust medication timing to avoid prayer periods');
      recommendations.push('Use 30-minute buffer around prayer times');
    }

    if (pattern.type === 'fasting_adjustment') {
      recommendations.push('Coordinate with Sahur and Iftar times during Ramadan');
      recommendations.push('Consider extended-release formulations');
    }

    if (pattern.type === 'festival_period_change') {
      recommendations.push('Plan ahead for festival disruptions');
      recommendations.push('Involve family in medication reminders');
    }

    return recommendations;
  };

  const analyzeTimingPatterns = (medications: MedicationAdherenceMetric[]) => {
    const timingData = Array.from({ length: 24 }, (_, hour) => ({
      hour,
      adherenceRate: 0,
      totalDoses: 0,
      culturalSignificance: getCulturalSignificance(hour),
    }));

    medications.forEach(med => {
      med.trends.forEach(trend => {
        const hour = trend.date.getHours();
        timingData[hour].adherenceRate += trend.adherenceRate;
        timingData[hour].totalDoses += trend.dosesScheduled;
      });
    });

    return timingData.map(data => ({
      ...data,
      adherenceRate: data.totalDoses > 0 ? data.adherenceRate / data.totalDoses : 0,
    }));
  };

  const getCulturalSignificance = (hour: number): string => {
    if (hour >= 5 && hour <= 6) return 'Fajr Prayer Time';
    if (hour >= 12 && hour <= 13) return 'Zohor Prayer Time';
    if (hour >= 15 && hour <= 16) return 'Asr Prayer Time';
    if (hour >= 18 && hour <= 19) return 'Maghrib Prayer Time';
    if (hour >= 20 && hour <= 21) return 'Isha Prayer Time';
    if (hour >= 7 && hour <= 9) return 'Morning Routine';
    if (hour >= 19 && hour <= 22) return 'Family Time';
    return '';
  };

  const generateComparisonData = (medications: MedicationAdherenceMetric[]) => {
    return medications.map(med => ({
      medicationName: med.medicationName,
      adherenceRate: med.adherenceRate,
      improvement: calculateImprovement(med),
      culturalAlignment: calculateCulturalAlignment(med),
    }));
  };

  const calculateImprovement = (medication: MedicationAdherenceMetric): number => {
    if (medication.trends.length < 2) return 0;
    const recent = medication.trends.slice(-7);
    const older = medication.trends.slice(-14, -7);

    const recentAvg = recent.reduce((sum, t) => sum + t.adherenceRate, 0) / recent.length;
    const olderAvg = older.reduce((sum, t) => sum + t.adherenceRate, 0) / older.length;

    return recentAvg - olderAvg;
  };

  const calculateCulturalAlignment = (medication: MedicationAdherenceMetric): number => {
    // Calculate based on prayer time conflicts and cultural considerations
    const conflicts = medication.trends.filter(trend => {
      const hour = trend.date.getHours();
      return [5, 6, 12, 13, 15, 16, 18, 19, 20, 21].includes(hour);
    });

    return conflicts.length > 0 ?
      conflicts.reduce((sum, t) => sum + t.adherenceRate, 0) / conflicts.length :
      medication.adherenceRate;
  };

  const generateHeatmapData = (medications: MedicationAdherenceMetric[]) => {
    const heatmap = Array.from({ length: 7 }, () =>
      Array.from({ length: 24 }, () => ({ value: 0, count: 0 }))
    );

    medications.forEach(med => {
      med.trends.forEach(trend => {
        const dayOfWeek = trend.date.getDay();
        const hour = trend.date.getHours();
        heatmap[dayOfWeek][hour].value += trend.adherenceRate;
        heatmap[dayOfWeek][hour].count += 1;
      });
    });

    return heatmap.map(day =>
      day.map(hour => ({
        adherenceRate: hour.count > 0 ? hour.value / hour.count : 0,
        dosesCount: hour.count,
      }))
    );
  };

  const renderViewSelector = () => {
    const views: { key: AnalyticsView; label: string }[] = [
      { key: 'trends', label: t('analytics.views.trends') },
      { key: 'patterns', label: t('analytics.views.patterns') },
      { key: 'cultural', label: t('analytics.views.cultural') },
      { key: 'comparison', label: t('analytics.views.comparison') },
      { key: 'heatmap', label: t('analytics.views.heatmap') },
    ];

    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.viewSelector}
      >
        {views.map(view => (
          <TouchableOpacity
            key={view.key}
            style={[
              styles.viewButton,
              getButtonStyle(activeView === view.key ? 'primary' : 'tertiary'),
              activeView === view.key && { backgroundColor: malaysianColors.primary },
            ]}
            onPress={() => setActiveView(view.key)}
            accessibilityRole="button"
            accessibilityLabel={view.label}
          >
            <Text
              style={[
                styles.viewButtonText,
                getTextStyle('body'),
                { color: activeView === view.key ? theme.colors.surface : theme.colors.text },
              ]}
            >
              {view.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    );
  };

  const renderTrendsView = () => {
    const chartData = {
      labels: analyticsData.adherenceTrends.slice(-7).map(trend =>
        trend.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      ),
      datasets: [
        {
          data: analyticsData.adherenceTrends.slice(-7).map(trend => trend.adherenceRate),
          color: (opacity = 1) => `rgba(220, 20, 60, ${opacity})`, // Malaysian red
          strokeWidth: 3,
        },
      ],
    };

    return (
      <Animatable.View animation="fadeInUp" duration={600} style={styles.analyticsSection}>
        <Text style={[styles.sectionTitle, getTextStyle('heading')]}>
          {t('analytics.trends.title')}
        </Text>

        <View style={[styles.chartContainer, getCardStyle()]}>
          <LineChart
            data={chartData}
            width={screenWidth - 60}
            height={220}
            chartConfig={{
              ...chartConfig,
              color: (opacity = 1) => `rgba(220, 20, 60, ${opacity})`,
            }}
            bezier
            style={styles.chart}
          />
        </View>

        <View style={[styles.trendsInsights, getCardStyle()]}>
          <Text style={[styles.insightTitle, getTextStyle('subheading')]}>
            {t('analytics.trends.insights')}
          </Text>

          <View style={styles.insightGrid}>
            <View style={styles.insightCard}>
              <Text style={[styles.insightValue, getTextStyle('heading'), { color: malaysianColors.primary }]}>
                {metrics.overallAdherence.toFixed(1)}%
              </Text>
              <Text style={[styles.insightLabel, getTextStyle('caption')]}>
                {t('analytics.trends.overallAdherence')}
              </Text>
            </View>

            <View style={styles.insightCard}>
              <Text style={[styles.insightValue, getTextStyle('heading'), { color: malaysianColors.secondary }]}>
                {calculateTrend(analyticsData.adherenceTrends)}%
              </Text>
              <Text style={[styles.insightLabel, getTextStyle('caption')]}>
                {t('analytics.trends.weeklyChange')}
              </Text>
            </View>

            <View style={styles.insightCard}>
              <Text style={[styles.insightValue, getTextStyle('heading'), { color: malaysianColors.accent }]}>
                {metrics.streaks.currentStreak}
              </Text>
              <Text style={[styles.insightLabel, getTextStyle('caption')]}>
                {t('analytics.trends.currentStreak')}
              </Text>
            </View>
          </View>
        </View>
      </Animatable.View>
    );
  };

  const calculateTrend = (trends: AdherenceTrend[]): number => {
    if (trends.length < 2) return 0;
    const recent = trends.slice(-3);
    const older = trends.slice(-6, -3);

    const recentAvg = recent.reduce((sum, t) => sum + t.adherenceRate, 0) / recent.length;
    const olderAvg = older.reduce((sum, t) => sum + t.adherenceRate, 0) / older.length;

    return Number((recentAvg - olderAvg).toFixed(1));
  };

  const renderPatternsView = () => {
    const patterns = analyticsData.culturalPatterns;

    return (
      <Animatable.View animation="fadeInUp" duration={600} style={styles.analyticsSection}>
        <Text style={[styles.sectionTitle, getTextStyle('heading')]}>
          {t('analytics.patterns.title')}
        </Text>

        <ScrollView style={styles.patternsList}>
          {patterns.map((pattern, index) => (
            <TouchableOpacity
              key={pattern.id}
              style={[styles.patternCard, getCardStyle()]}
              onPress={() => onPatternSelect?.(pattern)}
              accessibilityRole="button"
            >
              <View style={styles.patternHeader}>
                <Text style={[styles.patternType, getTextStyle('subheading')]}>
                  {t(`analytics.patterns.types.${pattern.type}`)}
                </Text>
                <View style={[
                  styles.confidenceBadge,
                  { backgroundColor: getConfidenceColor(pattern.confidence) }
                ]}>
                  <Text style={[styles.confidenceText, { color: theme.colors.surface }]}>
                    {Math.round(pattern.confidence * 100)}%
                  </Text>
                </View>
              </View>

              <Text style={[styles.patternDescription, getTextStyle('body')]}>
                {pattern.description}
              </Text>

              <View style={styles.patternMetrics}>
                <Text style={[styles.patternMetric, getTextStyle('caption')]}>
                  {t('analytics.patterns.occurrences')}: {pattern.occurrences}
                </Text>
                <Text style={[styles.patternMetric, getTextStyle('caption')]}>
                  {t('analytics.patterns.lastOccurred')}: {pattern.lastOccurred.toLocaleDateString()}
                </Text>
              </View>

              {pattern.culturalFactors && pattern.culturalFactors.length > 0 && (
                <View style={styles.culturalFactors}>
                  <Text style={[styles.factorsLabel, getTextStyle('caption')]}>
                    {t('analytics.patterns.culturalFactors')}:
                  </Text>
                  {pattern.culturalFactors.map((factor, idx) => (
                    <Text key={idx} style={[styles.culturalFactor, getTextStyle('caption')]}>
                      • {factor}
                    </Text>
                  ))}
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animatable.View>
    );
  };

  const getConfidenceColor = (confidence: number): string => {
    if (confidence > 0.8) return malaysianColors.accent;
    if (confidence > 0.6) return malaysianColors.secondary;
    return malaysianColors.warning;
  };

  const renderCulturalView = () => {
    if (!showCulturalInsights) return null;

    return (
      <Animatable.View animation="fadeInUp" duration={600} style={styles.analyticsSection}>
        <Text style={[styles.sectionTitle, getTextStyle('heading')]}>
          {t('analytics.cultural.title')}
        </Text>

        <View style={[styles.culturalInsightsContainer, getCardStyle()]}>
          {metrics.culturalInsights.map((insight, index) => (
            <TouchableOpacity
              key={index}
              style={styles.culturalInsight}
              onPress={() => onInsightSelect?.(insight)}
              accessibilityRole="button"
            >
              <View style={styles.insightIcon}>
                <Text style={styles.insightEmoji}>{getCulturalEmoji(insight.type)}</Text>
              </View>

              <View style={styles.insightContent}>
                <Text style={[styles.insightType, getTextStyle('subheading')]}>
                  {t(`analytics.cultural.types.${insight.type}`)}
                </Text>
                <Text style={[styles.insightDescription, getTextStyle('body')]}>
                  {insight.description}
                </Text>

                <View style={styles.insightImpact}>
                  <Text style={[styles.impactLabel, getTextStyle('caption')]}>
                    {t('analytics.cultural.impact')}:
                  </Text>
                  <Text style={[
                    styles.impactValue,
                    getTextStyle('caption'),
                    { color: getImpactColor(insight.adherenceImpact) }
                  ]}>
                    {insight.adherenceImpact > 0 ? '+' : ''}{insight.adherenceImpact}%
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </Animatable.View>
    );
  };

  const getCulturalEmoji = (type: string): string => {
    const emojiMap: Record<string, string> = {
      prayer_time_optimization: '🕌',
      ramadan_adjustment: '🌙',
      festival_period_pattern: '🎉',
      family_support_benefit: '👨‍👩‍👧‍👦',
      traditional_medicine_conflict: '🌿',
      meal_timing_preference: '🍽️',
      cultural_celebration_impact: '🎊',
    };
    return emojiMap[type] || '📊';
  };

  const getImpactColor = (impact: number): string => {
    if (impact > 0) return malaysianColors.accent;
    if (impact < 0) return malaysianColors.primary;
    return theme.colors.text;
  };

  const renderComparisonView = () => {
    const comparisonData = analyticsData.comparisonData;

    const chartData = {
      labels: comparisonData.slice(0, 5).map(med =>
        med.medicationName.length > 10 ?
        med.medicationName.substring(0, 10) + '...' :
        med.medicationName
      ),
      datasets: [
        {
          data: comparisonData.slice(0, 5).map(med => med.adherenceRate),
          color: (opacity = 1) => `rgba(220, 20, 60, ${opacity})`,
        },
      ],
    };

    return (
      <Animatable.View animation="fadeInUp" duration={600} style={styles.analyticsSection}>
        <Text style={[styles.sectionTitle, getTextStyle('heading')]}>
          {t('analytics.comparison.title')}
        </Text>

        <View style={[styles.chartContainer, getCardStyle()]}>
          <BarChart
            data={chartData}
            width={screenWidth - 60}
            height={220}
            chartConfig={{
              ...chartConfig,
              color: (opacity = 1) => `rgba(220, 20, 60, ${opacity})`,
            }}
            style={styles.chart}
            showValuesOnTopOfBars
          />
        </View>

        <ScrollView style={styles.comparisonList}>
          {comparisonData.map((med, index) => (
            <View key={index} style={[styles.comparisonCard, getCardStyle()]}>
              <Text style={[styles.medicationName, getTextStyle('subheading')]}>
                {med.medicationName}
              </Text>

              <View style={styles.comparisonMetrics}>
                <View style={styles.comparisonMetric}>
                  <Text style={[styles.metricLabel, getTextStyle('caption')]}>
                    {t('analytics.comparison.adherence')}
                  </Text>
                  <Text style={[styles.metricValue, getTextStyle('body'), { color: malaysianColors.primary }]}>
                    {med.adherenceRate.toFixed(1)}%
                  </Text>
                </View>

                <View style={styles.comparisonMetric}>
                  <Text style={[styles.metricLabel, getTextStyle('caption')]}>
                    {t('analytics.comparison.improvement')}
                  </Text>
                  <Text style={[
                    styles.metricValue,
                    getTextStyle('body'),
                    { color: med.improvement > 0 ? malaysianColors.accent : malaysianColors.warning }
                  ]}>
                    {med.improvement > 0 ? '+' : ''}{med.improvement.toFixed(1)}%
                  </Text>
                </View>

                <View style={styles.comparisonMetric}>
                  <Text style={[styles.metricLabel, getTextStyle('caption')]}>
                    {t('analytics.comparison.culturalAlignment')}
                  </Text>
                  <Text style={[styles.metricValue, getTextStyle('body'), { color: malaysianColors.cultural }]}>
                    {med.culturalAlignment.toFixed(1)}%
                  </Text>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      </Animatable.View>
    );
  };

  const renderHeatmapView = () => {
    const heatmapData = analyticsData.heatmapData;
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
      <Animatable.View animation="fadeInUp" duration={600} style={styles.analyticsSection}>
        <Text style={[styles.sectionTitle, getTextStyle('heading')]}>
          {t('analytics.heatmap.title')}
        </Text>

        <View style={[styles.heatmapContainer, getCardStyle()]}>
          <View style={styles.heatmapHeader}>
            <View style={styles.heatmapTimeLabels}>
              {Array.from({ length: 24 }, (_, hour) => (
                <Text key={hour} style={[styles.timeLabel, getTextStyle('caption')]}>
                  {hour}
                </Text>
              ))}
            </View>
          </View>

          {heatmapData.map((dayData, dayIndex) => (
            <View key={dayIndex} style={styles.heatmapRow}>
              <Text style={[styles.dayLabel, getTextStyle('caption')]}>
                {dayNames[dayIndex]}
              </Text>
              <View style={styles.heatmapCells}>
                {dayData.map((hourData, hourIndex) => (
                  <View
                    key={hourIndex}
                    style={[
                      styles.heatmapCell,
                      {
                        backgroundColor: getHeatmapColor(hourData.adherenceRate),
                        opacity: hourData.dosesCount > 0 ? 1 : 0.3,
                      }
                    ]}
                  />
                ))}
              </View>
            </View>
          ))}

          <View style={styles.heatmapLegend}>
            <Text style={[styles.legendLabel, getTextStyle('caption')]}>
              {t('analytics.heatmap.legend')}
            </Text>
            <View style={styles.legendColors}>
              {[0, 25, 50, 75, 100].map(value => (
                <View key={value} style={styles.legendItem}>
                  <View style={[
                    styles.legendColor,
                    { backgroundColor: getHeatmapColor(value) }
                  ]} />
                  <Text style={[styles.legendValue, getTextStyle('caption')]}>
                    {value}%
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      </Animatable.View>
    );
  };

  const getHeatmapColor = (adherenceRate: number): string => {
    const intensity = adherenceRate / 100;
    const red = Math.round(220 * (1 - intensity) + 34 * intensity);
    const green = Math.round(20 * (1 - intensity) + 139 * intensity);
    const blue = Math.round(60 * (1 - intensity) + 34 * intensity);
    return `rgb(${red}, ${green}, ${blue})`;
  };

  const renderActiveView = () => {
    switch (activeView) {
      case 'trends':
        return renderTrendsView();
      case 'patterns':
        return renderPatternsView();
      case 'cultural':
        return renderCulturalView();
      case 'comparison':
        return renderComparisonView();
      case 'heatmap':
        return renderHeatmapView();
      default:
        return renderTrendsView();
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={malaysianColors.primary} />
        <Text style={[styles.loadingText, getTextStyle('body')]}>
          {t('analytics.loading')}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {renderViewSelector()}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {renderActiveView()}
      </ScrollView>
    </View>
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
  viewSelector: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  viewButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
  },
  viewButtonText: {
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  analyticsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    marginBottom: 16,
    fontWeight: 'bold',
  },
  chartContainer: {
    padding: 16,
    marginBottom: 16,
    alignItems: 'center',
  },
  chart: {
    borderRadius: 8,
  },
  trendsInsights: {
    padding: 16,
  },
  insightTitle: {
    marginBottom: 12,
    fontWeight: '600',
  },
  insightGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  insightCard: {
    alignItems: 'center',
    flex: 1,
  },
  insightValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  insightLabel: {
    textAlign: 'center',
    opacity: 0.7,
  },
  patternsList: {
    maxHeight: 400,
  },
  patternCard: {
    padding: 16,
    marginBottom: 12,
  },
  patternHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  patternType: {
    flex: 1,
    fontWeight: '600',
  },
  confidenceBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  confidenceText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  patternDescription: {
    marginBottom: 8,
    opacity: 0.8,
  },
  patternMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  patternMetric: {
    opacity: 0.6,
  },
  culturalFactors: {
    marginTop: 8,
  },
  factorsLabel: {
    fontWeight: '600',
    marginBottom: 4,
  },
  culturalFactor: {
    marginLeft: 8,
    opacity: 0.7,
  },
  culturalInsightsContainer: {
    padding: 16,
  },
  culturalInsight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  insightIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: '#F3F4F6',
  },
  insightEmoji: {
    fontSize: 20,
  },
  insightContent: {
    flex: 1,
  },
  insightType: {
    fontWeight: '600',
    marginBottom: 4,
  },
  insightDescription: {
    marginBottom: 4,
    opacity: 0.8,
  },
  insightImpact: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  impactLabel: {
    marginRight: 8,
  },
  impactValue: {
    fontWeight: 'bold',
  },
  comparisonList: {
    maxHeight: 400,
  },
  comparisonCard: {
    padding: 16,
    marginBottom: 12,
  },
  medicationName: {
    fontWeight: '600',
    marginBottom: 12,
  },
  comparisonMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  comparisonMetric: {
    flex: 1,
    alignItems: 'center',
  },
  metricLabel: {
    textAlign: 'center',
    marginBottom: 4,
  },
  metricValue: {
    fontWeight: 'bold',
  },
  heatmapContainer: {
    padding: 16,
  },
  heatmapHeader: {
    marginBottom: 8,
  },
  heatmapTimeLabels: {
    flexDirection: 'row',
    marginLeft: 40,
  },
  timeLabel: {
    width: 12,
    textAlign: 'center',
    fontSize: 8,
  },
  heatmapRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  dayLabel: {
    width: 35,
    textAlign: 'right',
    marginRight: 5,
  },
  heatmapCells: {
    flexDirection: 'row',
  },
  heatmapCell: {
    width: 12,
    height: 12,
    marginRight: 1,
    borderRadius: 2,
  },
  heatmapLegend: {
    marginTop: 16,
    alignItems: 'center',
  },
  legendLabel: {
    marginBottom: 8,
    fontWeight: '600',
  },
  legendColors: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 2,
    marginRight: 4,
  },
  legendValue: {
    fontSize: 10,
  },
});

export default AdherenceAnalytics;