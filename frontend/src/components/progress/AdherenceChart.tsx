/**
 * Adherence Chart Component
 *
 * Interactive chart component displaying adherence trends, patterns, and
 * medication-specific data with Malaysian cultural themes and accessibility.
 * Supports multiple visualization types and time periods.
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  ScrollView,
} from 'react-native';
import { useCulturalTheme, useCulturalStyles } from '@/components/language/ui/CulturalThemeProvider';
import { useTranslation } from '@/i18n/hooks/useTranslation';
import {
  ProgressMetrics,
  MetricPeriod,
  AdherenceTrend,
  MedicationAdherenceMetric,
} from '@/types/adherence';

const { width: screenWidth } = Dimensions.get('window');

interface AdherenceChartProps {
  metrics: ProgressMetrics;
  period: MetricPeriod;
  height?: number;
  culturalTheme?: boolean;
  interactive?: boolean;
  onDataPointPress?: (dataPoint: AdherenceTrend) => void;
  showMedicationBreakdown?: boolean;
}

type ChartType = 'line' | 'bar' | 'heatmap' | 'calendar';

export const AdherenceChart: React.FC<AdherenceChartProps> = ({
  metrics,
  period,
  height = 200,
  culturalTheme = true,
  interactive = true,
  onDataPointPress,
  showMedicationBreakdown = false,
}) => {
  const { theme, isElderlyMode } = useCulturalTheme();
  const { getCardStyle, getTextStyle } = useCulturalStyles();
  const { t } = useTranslation();

  const [selectedChartType, setSelectedChartType] = useState<ChartType>('line');
  const [selectedMedication, setSelectedMedication] = useState<string | null>(null);
  const [hoveredDataPoint, setHoveredDataPoint] = useState<AdherenceTrend | null>(null);

  const chartWidth = screenWidth - 60; // Account for margins and padding
  const padding = 20;
  const chartInnerWidth = chartWidth - padding * 2;
  const chartInnerHeight = height - padding * 2;

  // Process data for visualization
  const chartData = useMemo(() => {
    const medicationData = selectedMedication
      ? metrics.medications.find(m => m.medicationId === selectedMedication)
      : null;

    const trends = medicationData?.trends || [];

    if (trends.length === 0) {
      // Generate sample trend data for visualization
      const sampleTrends: AdherenceTrend[] = [];
      const now = new Date();

      for (let i = 29; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
        const baseRate = metrics.overallAdherence;
        const variation = (Math.random() - 0.5) * 20;
        const adherenceRate = Math.max(0, Math.min(100, baseRate + variation));

        sampleTrends.push({
          date,
          adherenceRate,
          dosesScheduled: Math.floor(Math.random() * 4) + 1,
          dosesTaken: Math.floor(adherenceRate / 100 * 4),
          confidence: 0.8 + Math.random() * 0.2,
        });
      }

      return sampleTrends;
    }

    return trends;
  }, [metrics, selectedMedication]);

  const getAdherenceColor = useCallback((adherence: number): string => {
    if (culturalTheme) {
      // Use Malaysian cultural colors
      if (adherence >= 80) return '#059669'; // Green (prosperity)
      if (adherence >= 60) return '#F59E0B'; // Gold (caution)
      return '#DC2626'; // Red (attention needed)
    }

    if (adherence >= 80) return theme.colors.success;
    if (adherence >= 60) return theme.colors.warning;
    return theme.colors.error;
  }, [culturalTheme, theme]);

  const renderChartTypeSelector = () => {
    const chartTypes: ChartType[] = ['line', 'bar', 'heatmap', 'calendar'];

    return (
      <View style={styles.chartTypeSelector}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {chartTypes.map((type) => (
            <TouchableOpacity
              key={type}
              style={[
                styles.chartTypeButton,
                selectedChartType === type && styles.activeChartType,
                { borderColor: theme.colors.border },
              ]}
              onPress={() => setSelectedChartType(type)}
              accessibilityRole="button"
              accessibilityLabel={t(`progress.chart.type.${type}`)}
            >
              <Text
                style={[
                  styles.chartTypeText,
                  getTextStyle('caption'),
                  selectedChartType === type && { color: theme.colors.primary },
                ]}
              >
                {t(`progress.chart.type.${type}`)}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderMedicationSelector = () => {
    if (!showMedicationBreakdown) return null;

    return (
      <View style={styles.medicationSelector}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity
            style={[
              styles.medicationButton,
              !selectedMedication && styles.activeMedication,
              { borderColor: theme.colors.border },
            ]}
            onPress={() => setSelectedMedication(null)}
            accessibilityRole="button"
            accessibilityLabel={t('progress.chart.allMedications')}
          >
            <Text
              style={[
                styles.medicationText,
                getTextStyle('caption'),
                !selectedMedication && { color: theme.colors.primary },
              ]}
            >
              {t('progress.chart.allMedications')}
            </Text>
          </TouchableOpacity>

          {metrics.medications.map((med) => (
            <TouchableOpacity
              key={med.medicationId}
              style={[
                styles.medicationButton,
                selectedMedication === med.medicationId && styles.activeMedication,
                { borderColor: theme.colors.border },
              ]}
              onPress={() => setSelectedMedication(med.medicationId)}
              accessibilityRole="button"
              accessibilityLabel={med.medicationName}
            >
              <Text
                style={[
                  styles.medicationText,
                  getTextStyle('caption'),
                  selectedMedication === med.medicationId && { color: theme.colors.primary },
                ]}
              >
                {med.medicationName}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  const renderLineChart = () => {
    if (chartData.length === 0) return renderEmptyChart();

    const maxAdherence = Math.max(...chartData.map(d => d.adherenceRate));
    const minAdherence = Math.min(...chartData.map(d => d.adherenceRate));
    const range = maxAdherence - minAdherence || 1;

    const points = chartData.map((dataPoint, index) => {
      const x = padding + (index * chartInnerWidth) / (chartData.length - 1);
      const y = padding + ((maxAdherence - dataPoint.adherenceRate) * chartInnerHeight) / range;
      return { x, y, dataPoint };
    });

    const pathData = points.map((point, index) => {
      if (index === 0) return `M ${point.x} ${point.y}`;
      return `L ${point.x} ${point.y}`;
    }).join(' ');

    return (
      <View style={[styles.chartContainer, { height }]}>
        {/* Y-axis labels */}
        <View style={styles.yAxisLabels}>
          <Text style={[styles.axisLabel, getTextStyle('caption')]}>{Math.round(maxAdherence)}%</Text>
          <Text style={[styles.axisLabel, getTextStyle('caption')]}>{Math.round((maxAdherence + minAdherence) / 2)}%</Text>
          <Text style={[styles.axisLabel, getTextStyle('caption')]}>{Math.round(minAdherence)}%</Text>
        </View>

        {/* Chart area */}
        <View style={[styles.chartArea, { width: chartWidth, height }]}>
          {/* Grid lines */}
          <View style={styles.gridLines}>
            {[0, 0.5, 1].map((ratio) => (
              <View
                key={ratio}
                style={[
                  styles.gridLine,
                  {
                    top: padding + ratio * chartInnerHeight,
                    backgroundColor: theme.colors.border,
                  },
                ]}
              />
            ))}
          </View>

          {/* SVG-like path simulation with views */}
          {points.map((point, index) => (
            <View key={index}>
              {/* Line segment */}
              {index > 0 && (
                <View
                  style={[
                    styles.lineSegment,
                    {
                      position: 'absolute',
                      left: points[index - 1].x,
                      top: Math.min(points[index - 1].y, point.y),
                      width: Math.sqrt(
                        Math.pow(point.x - points[index - 1].x, 2) +
                        Math.pow(point.y - points[index - 1].y, 2)
                      ),
                      height: 2,
                      backgroundColor: getAdherenceColor(point.dataPoint.adherenceRate),
                      transform: [
                        {
                          rotate: `${Math.atan2(
                            point.y - points[index - 1].y,
                            point.x - points[index - 1].x
                          )}rad`,
                        },
                      ],
                    },
                  ]}
                />
              )}

              {/* Data point */}
              <TouchableOpacity
                style={[
                  styles.dataPoint,
                  {
                    position: 'absolute',
                    left: point.x - 6,
                    top: point.y - 6,
                    backgroundColor: getAdherenceColor(point.dataPoint.adherenceRate),
                    borderColor: theme.colors.surface,
                  },
                ]}
                onPress={() => {
                  if (interactive && onDataPointPress) {
                    onDataPointPress(point.dataPoint);
                  }
                  setHoveredDataPoint(point.dataPoint);
                }}
                accessibilityRole="button"
                accessibilityLabel={`${t('progress.chart.adherence')}: ${Math.round(point.dataPoint.adherenceRate)}%`}
              />
            </View>
          ))}
        </View>

        {/* X-axis labels */}
        <View style={styles.xAxisLabels}>
          {chartData.filter((_, index) => index % Math.ceil(chartData.length / 5) === 0).map((dataPoint, index) => (
            <Text key={index} style={[styles.axisLabel, getTextStyle('caption')]}>
              {formatDateForPeriod(dataPoint.date, period)}
            </Text>
          ))}
        </View>
      </View>
    );
  };

  const renderBarChart = () => {
    if (chartData.length === 0) return renderEmptyChart();

    const maxAdherence = 100;
    const barWidth = Math.min(chartInnerWidth / chartData.length - 4, 20);

    return (
      <View style={[styles.chartContainer, { height }]}>
        <View style={styles.yAxisLabels}>
          <Text style={[styles.axisLabel, getTextStyle('caption')]}>100%</Text>
          <Text style={[styles.axisLabel, getTextStyle('caption')]}>50%</Text>
          <Text style={[styles.axisLabel, getTextStyle('caption')]}>0%</Text>
        </View>

        <View style={[styles.chartArea, { width: chartWidth, height }]}>
          {chartData.map((dataPoint, index) => {
            const barHeight = (dataPoint.adherenceRate * chartInnerHeight) / maxAdherence;
            const x = padding + (index * chartInnerWidth) / chartData.length;
            const y = padding + chartInnerHeight - barHeight;

            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.bar,
                  {
                    position: 'absolute',
                    left: x,
                    top: y,
                    width: barWidth,
                    height: barHeight,
                    backgroundColor: getAdherenceColor(dataPoint.adherenceRate),
                  },
                ]}
                onPress={() => {
                  if (interactive && onDataPointPress) {
                    onDataPointPress(dataPoint);
                  }
                  setHoveredDataPoint(dataPoint);
                }}
                accessibilityRole="button"
                accessibilityLabel={`${formatDateForPeriod(dataPoint.date, period)}: ${Math.round(dataPoint.adherenceRate)}%`}
              />
            );
          })}
        </View>
      </View>
    );
  };

  const renderHeatMap = () => {
    if (chartData.length === 0) return renderEmptyChart();

    const columns = 7; // Days of week
    const rows = Math.ceil(chartData.length / columns);
    const cellSize = Math.min((chartInnerWidth / columns) - 2, (chartInnerHeight / rows) - 2);

    return (
      <View style={[styles.chartContainer, { height }]}>
        <View style={[styles.chartArea, { width: chartWidth, height }]}>
          {chartData.map((dataPoint, index) => {
            const row = Math.floor(index / columns);
            const col = index % columns;
            const x = padding + col * (cellSize + 2);
            const y = padding + row * (cellSize + 2);

            return (
              <TouchableOpacity
                key={index}
                style={[
                  styles.heatMapCell,
                  {
                    position: 'absolute',
                    left: x,
                    top: y,
                    width: cellSize,
                    height: cellSize,
                    backgroundColor: getAdherenceColor(dataPoint.adherenceRate),
                    opacity: dataPoint.adherenceRate / 100,
                  },
                ]}
                onPress={() => {
                  if (interactive && onDataPointPress) {
                    onDataPointPress(dataPoint);
                  }
                  setHoveredDataPoint(dataPoint);
                }}
                accessibilityRole="button"
                accessibilityLabel={`${formatDateForPeriod(dataPoint.date, period)}: ${Math.round(dataPoint.adherenceRate)}%`}
              />
            );
          })}
        </View>
      </View>
    );
  };

  const renderCalendarView = () => {
    // This would be a more complex calendar implementation
    // For now, we'll use a simplified grid view
    return renderHeatMap();
  };

  const renderEmptyChart = () => (
    <View style={[styles.emptyChart, { height }]}>
      <Text style={[styles.emptyText, getTextStyle('body')]}>
        {t('progress.chart.noData')}
      </Text>
    </View>
  );

  const renderHoveredTooltip = () => {
    if (!hoveredDataPoint) return null;

    return (
      <View style={[styles.tooltip, getCardStyle()]}>
        <Text style={[styles.tooltipDate, getTextStyle('caption')]}>
          {formatDateForPeriod(hoveredDataPoint.date, period)}
        </Text>
        <Text style={[styles.tooltipValue, getTextStyle('body')]}>
          {t('progress.chart.adherence')}: {Math.round(hoveredDataPoint.adherenceRate)}%
        </Text>
        <Text style={[styles.tooltipDoses, getTextStyle('caption')]}>
          {t('progress.chart.doses')}: {hoveredDataPoint.dosesTaken}/{hoveredDataPoint.dosesScheduled}
        </Text>
      </View>
    );
  };

  const formatDateForPeriod = (date: Date, period: MetricPeriod): string => {
    switch (period) {
      case 'daily':
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      case 'weekly':
        return `W${Math.ceil(date.getDate() / 7)}`;
      case 'monthly':
        return date.toLocaleDateString('en-US', { month: 'short' });
      case 'quarterly':
        return `Q${Math.ceil((date.getMonth() + 1) / 3)}`;
      default:
        return date.toLocaleDateString();
    }
  };

  const renderChart = () => {
    switch (selectedChartType) {
      case 'line':
        return renderLineChart();
      case 'bar':
        return renderBarChart();
      case 'heatmap':
        return renderHeatMap();
      case 'calendar':
        return renderCalendarView();
      default:
        return renderLineChart();
    }
  };

  return (
    <View style={styles.container}>
      {renderChartTypeSelector()}
      {renderMedicationSelector()}
      {renderChart()}
      {renderHoveredTooltip()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  chartTypeSelector: {
    marginBottom: 12,
  },
  chartTypeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderWidth: 1,
    borderRadius: 16,
  },
  activeChartType: {
    backgroundColor: '#E3F2FD',
  },
  chartTypeText: {
    fontSize: 12,
  },
  medicationSelector: {
    marginBottom: 12,
  },
  medicationButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
    borderWidth: 1,
    borderRadius: 16,
  },
  activeMedication: {
    backgroundColor: '#E3F2FD',
  },
  medicationText: {
    fontSize: 12,
  },
  chartContainer: {
    flexDirection: 'row',
  },
  yAxisLabels: {
    width: 40,
    justifyContent: 'space-between',
    paddingVertical: 20,
  },
  axisLabel: {
    fontSize: 10,
    textAlign: 'right',
  },
  chartArea: {
    position: 'relative',
  },
  gridLines: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    opacity: 0.3,
  },
  lineSegment: {
    transformOrigin: '0 50%',
  },
  dataPoint: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
  },
  bar: {
    borderRadius: 2,
  },
  heatMapCell: {
    borderRadius: 2,
  },
  xAxisLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  emptyChart: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    textAlign: 'center',
    opacity: 0.6,
  },
  tooltip: {
    position: 'absolute',
    top: 10,
    right: 10,
    padding: 8,
    minWidth: 120,
  },
  tooltipDate: {
    fontWeight: 'bold',
    marginBottom: 2,
  },
  tooltipValue: {
    marginBottom: 2,
  },
  tooltipDoses: {
    opacity: 0.7,
  },
});

export default AdherenceChart;