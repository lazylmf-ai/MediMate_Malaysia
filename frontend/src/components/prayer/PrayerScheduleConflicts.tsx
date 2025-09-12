/**
 * Prayer Schedule Conflicts Component
 * 
 * Shows medication schedule conflicts with prayer times:
 * - Conflict visualization
 * - Suggested alternatives
 * - Schedule optimization options
 * - Cultural guidance
 */

import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  ScrollView,
  Alert 
} from 'react-native';
import { usePrayerScheduling } from '../../hooks/prayer';
import { useAppSelector } from '../../store/hooks';
import { selectCulturalPreferences } from '../../store/slices/culturalSlice';
import { PrayerConflict, ScheduleOptimizationResult } from '../../services/prayer-scheduling';

interface PrayerScheduleConflictsProps {
  medicationTimes: Date[];
  medicationName?: string;
  onOptimizedSchedule?: (optimizedTimes: Date[], conflicts: PrayerConflict[]) => void;
  onScheduleAccept?: (schedule: Date[]) => void;
  style?: any;
  showAutoOptimize?: boolean;
}

const PrayerScheduleConflicts: React.FC<PrayerScheduleConflictsProps> = ({
  medicationTimes,
  medicationName,
  onOptimizedSchedule,
  onScheduleAccept,
  style,
  showAutoOptimize = true
}) => {
  const culturalPreferences = useAppSelector(selectCulturalPreferences);
  const [optimizationResult, setOptimizationResult] = useState<ScheduleOptimizationResult | null>(null);
  const [isOptimizing, setIsOptimizing] = useState(false);

  const {
    optimizeSchedule,
    validateSchedule,
    isCurrentlyAvoidableTime,
    config
  } = usePrayerScheduling({
    enabled: culturalPreferences?.prayerTimes?.enabled ?? true,
    bufferMinutes: culturalPreferences?.prayerTimes?.buffer ?? 30,
    madhab: culturalPreferences?.prayerTimes?.madhab ?? 'shafi'
  });

  // Auto-check for conflicts when medication times change
  useEffect(() => {
    if (medicationTimes.length > 0 && config.enabled) {
      handleOptimizeSchedule();
    }
  }, [medicationTimes]);

  const handleOptimizeSchedule = async () => {
    if (medicationTimes.length === 0) return;

    setIsOptimizing(true);
    try {
      const result = await optimizeSchedule(medicationTimes);
      setOptimizationResult(result);
      
      if (onOptimizedSchedule) {
        onOptimizedSchedule(result.optimizedTimes, result.conflicts);
      }
    } catch (error) {
      console.error('Failed to optimize schedule:', error);
      Alert.alert(
        culturalPreferences?.language === 'ms' ? 'Ralat' : 'Error',
        culturalPreferences?.language === 'ms' 
          ? 'Tidak dapat mengoptimumkan jadual ubat'
          : 'Unable to optimize medication schedule'
      );
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleAcceptSchedule = () => {
    if (optimizationResult && onScheduleAccept) {
      onScheduleAccept(optimizationResult.optimizedTimes);
    }
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-MY', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const getSeverityColor = (severity: 'high' | 'medium' | 'low'): string => {
    switch (severity) {
      case 'high': return '#e74c3c';
      case 'medium': return '#f39c12';
      case 'low': return '#f1c40f';
      default: return '#95a5a6';
    }
  };

  const getSeverityText = (severity: 'high' | 'medium' | 'low'): string => {
    if (culturalPreferences?.language === 'ms') {
      switch (severity) {
        case 'high': return 'Tinggi';
        case 'medium': return 'Sederhana';
        case 'low': return 'Rendah';
        default: return 'Tidak diketahui';
      }
    } else {
      switch (severity) {
        case 'high': return 'High';
        case 'medium': return 'Medium';
        case 'low': return 'Low';
        default: return 'Unknown';
      }
    }
  };

  const renderConflictItem = (conflict: PrayerConflict, index: number) => {
    return (
      <View key={index} style={styles.conflictItem}>
        <View style={styles.conflictHeader}>
          <View style={styles.conflictInfo}>
            <Text style={styles.conflictTime}>
              {formatTime(conflict.time)}
            </Text>
            <Text style={styles.conflictPrayer}>
              {culturalPreferences?.language === 'ms' 
                ? `Konflik dengan ${conflict.prayerName}` 
                : `Conflicts with ${conflict.prayerName}`}
            </Text>
          </View>
          <View style={[
            styles.severityBadge,
            { backgroundColor: getSeverityColor(conflict.severity) }
          ]}>
            <Text style={styles.severityText}>
              {getSeverityText(conflict.severity)}
            </Text>
          </View>
        </View>
        
        {conflict.suggestedAlternative && (
          <View style={styles.suggestionBox}>
            <Text style={styles.suggestionLabel}>
              {culturalPreferences?.language === 'ms' 
                ? 'Cadangan masa:' 
                : 'Suggested time:'}
            </Text>
            <Text style={styles.suggestionTime}>
              {formatTime(conflict.suggestedAlternative)}
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderOptimizationSummary = () => {
    if (!optimizationResult) return null;

    const { optimizedTimes, conflicts, warnings, culturalNotes } = optimizationResult;
    const hasConflicts = conflicts.length > 0;
    const scheduleChanged = optimizedTimes.some((time, index) => 
      medicationTimes[index] && time.getTime() !== medicationTimes[index].getTime()
    );

    return (
      <View style={styles.summaryContainer}>
        <View style={styles.summaryHeader}>
          <Text style={styles.summaryTitle}>
            {culturalPreferences?.language === 'ms' 
              ? 'Ringkasan Pengoptimuman' 
              : 'Optimization Summary'}
          </Text>
          <View style={[
            styles.statusBadge,
            { backgroundColor: hasConflicts ? '#e17055' : '#00b894' }
          ]}>
            <Text style={styles.statusText}>
              {hasConflicts 
                ? (culturalPreferences?.language === 'ms' ? 'Ada Konflik' : 'Has Conflicts')
                : (culturalPreferences?.language === 'ms' ? 'Optimum' : 'Optimized')
              }
            </Text>
          </View>
        </View>

        {scheduleChanged && (
          <View style={styles.scheduleComparison}>
            <Text style={styles.comparisonTitle}>
              {culturalPreferences?.language === 'ms' 
                ? 'Perubahan Jadual:' 
                : 'Schedule Changes:'}
            </Text>
            
            <View style={styles.scheduleColumns}>
              <View style={styles.scheduleColumn}>
                <Text style={styles.scheduleColumnTitle}>
                  {culturalPreferences?.language === 'ms' ? 'Asal' : 'Original'}
                </Text>
                {medicationTimes.map((time, index) => (
                  <Text key={index} style={styles.scheduleTime}>
                    {formatTime(time)}
                  </Text>
                ))}
              </View>
              
              <View style={styles.scheduleColumn}>
                <Text style={styles.scheduleColumnTitle}>
                  {culturalPreferences?.language === 'ms' ? 'Optimum' : 'Optimized'}
                </Text>
                {optimizedTimes.map((time, index) => (
                  <Text key={index} style={[
                    styles.scheduleTime,
                    { color: time.getTime() !== medicationTimes[index]?.getTime() ? '#00b894' : '#2d3436' }
                  ]}>
                    {formatTime(time)}
                  </Text>
                ))}
              </View>
            </View>
          </View>
        )}

        {culturalNotes.length > 0 && (
          <View style={styles.culturalNotes}>
            <Text style={styles.notesTitle}>
              {culturalPreferences?.language === 'ms' 
                ? 'Nota Budaya:' 
                : 'Cultural Notes:'}
            </Text>
            {culturalNotes.map((note, index) => (
              <Text key={index} style={styles.noteText}>
                • {note}
              </Text>
            ))}
          </View>
        )}

        {warnings.length > 0 && (
          <View style={styles.warnings}>
            <Text style={styles.warningsTitle}>
              {culturalPreferences?.language === 'ms' 
                ? 'Amaran:' 
                : 'Warnings:'}
            </Text>
            {warnings.map((warning, index) => (
              <Text key={index} style={styles.warningText}>
                ⚠️ {warning}
              </Text>
            ))}
          </View>
        )}
      </View>
    );
  };

  if (!config.enabled) {
    return (
      <View style={[styles.container, styles.disabledContainer, style]}>
        <Text style={styles.disabledText}>
          {culturalPreferences?.language === 'ms' 
            ? 'Integrasi waktu solat tidak diaktifkan' 
            : 'Prayer time integration is disabled'}
        </Text>
      </View>
    );
  }

  if (medicationTimes.length === 0) {
    return null;
  }

  return (
    <ScrollView style={[styles.container, style]}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {culturalPreferences?.language === 'ms' 
            ? 'Analisis Waktu Solat' 
            : 'Prayer Time Analysis'}
        </Text>
        {medicationName && (
          <Text style={styles.medicationName}>
            {medicationName}
          </Text>
        )}
      </View>

      {isOptimizing ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>
            {culturalPreferences?.language === 'ms' 
              ? 'Menganalisis jadual...' 
              : 'Analyzing schedule...'}
          </Text>
        </View>
      ) : (
        <>
          {optimizationResult && optimizationResult.conflicts.length > 0 && (
            <View style={styles.conflictsSection}>
              <Text style={styles.sectionTitle}>
                {culturalPreferences?.language === 'ms' 
                  ? `${optimizationResult.conflicts.length} Konflik Dijumpai` 
                  : `${optimizationResult.conflicts.length} Conflicts Found`}
              </Text>
              
              {optimizationResult.conflicts.map((conflict, index) => 
                renderConflictItem(conflict, index)
              )}
            </View>
          )}

          {renderOptimizationSummary()}

          <View style={styles.actionButtons}>
            {showAutoOptimize && (
              <TouchableOpacity 
                style={styles.optimizeButton}
                onPress={handleOptimizeSchedule}
                disabled={isOptimizing}
              >
                <Text style={styles.optimizeButtonText}>
                  {culturalPreferences?.language === 'ms' 
                    ? 'Optimumkan Semula' 
                    : 'Re-optimize'}
                </Text>
              </TouchableOpacity>
            )}
            
            {optimizationResult && onScheduleAccept && (
              <TouchableOpacity 
                style={styles.acceptButton}
                onPress={handleAcceptSchedule}
              >
                <Text style={styles.acceptButtonText}>
                  {culturalPreferences?.language === 'ms' 
                    ? 'Terima Jadual' 
                    : 'Accept Schedule'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          {isCurrentlyAvoidableTime() && (
            <View style={styles.currentTimeWarning}>
              <Text style={styles.currentTimeWarningText}>
                ⏰ {culturalPreferences?.language === 'ms' 
                  ? 'Sekarang adalah waktu yang perlu dielakkan untuk mengambil ubat' 
                  : 'Current time should be avoided for taking medication'}
              </Text>
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    margin: 8
  },
  disabledContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
    backgroundColor: '#f8f9fa'
  },
  disabledText: {
    color: '#636e72',
    fontSize: 14,
    textAlign: 'center'
  },
  header: {
    marginBottom: 16,
    alignItems: 'center'
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2d3436',
    textAlign: 'center'
  },
  medicationName: {
    fontSize: 14,
    color: '#636e72',
    marginTop: 4,
    textAlign: 'center'
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40
  },
  loadingText: {
    color: '#636e72',
    fontSize: 16
  },
  conflictsSection: {
    marginBottom: 16
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#e17055',
    marginBottom: 12
  },
  conflictItem: {
    backgroundColor: '#fef2f2',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#e17055'
  },
  conflictHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8
  },
  conflictInfo: {
    flex: 1
  },
  conflictTime: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2d3436'
  },
  conflictPrayer: {
    fontSize: 14,
    color: '#636e72',
    marginTop: 2
  },
  severityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12
  },
  severityText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '600'
  },
  suggestionBox: {
    backgroundColor: '#ffffff',
    borderRadius: 6,
    padding: 8,
    borderWidth: 1,
    borderColor: '#00b894',
    borderStyle: 'dashed'
  },
  suggestionLabel: {
    fontSize: 12,
    color: '#636e72',
    marginBottom: 2
  },
  suggestionTime: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#00b894'
  },
  summaryContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2d3436'
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12
  },
  statusText: {
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '600'
  },
  scheduleComparison: {
    marginBottom: 12
  },
  comparisonTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2d3436',
    marginBottom: 8
  },
  scheduleColumns: {
    flexDirection: 'row',
    justifyContent: 'space-around'
  },
  scheduleColumn: {
    flex: 1,
    alignItems: 'center'
  },
  scheduleColumnTitle: {
    fontSize: 12,
    color: '#636e72',
    fontWeight: '600',
    marginBottom: 4
  },
  scheduleTime: {
    fontSize: 14,
    color: '#2d3436',
    marginBottom: 2
  },
  culturalNotes: {
    marginBottom: 12
  },
  notesTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#00b894',
    marginBottom: 4
  },
  noteText: {
    fontSize: 12,
    color: '#636e72',
    marginBottom: 2,
    lineHeight: 16
  },
  warnings: {
    marginBottom: 12
  },
  warningsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#f39c12',
    marginBottom: 4
  },
  warningText: {
    fontSize: 12,
    color: '#636e72',
    marginBottom: 2,
    lineHeight: 16
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 12
  },
  optimizeButton: {
    flex: 1,
    backgroundColor: '#00b894',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center'
  },
  optimizeButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600'
  },
  acceptButton: {
    flex: 1,
    backgroundColor: '#6c5ce7',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center'
  },
  acceptButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600'
  },
  currentTimeWarning: {
    backgroundColor: '#fff5e6',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#f39c12'
  },
  currentTimeWarningText: {
    fontSize: 12,
    color: '#8b5a00',
    lineHeight: 16
  }
});

export default PrayerScheduleConflicts;