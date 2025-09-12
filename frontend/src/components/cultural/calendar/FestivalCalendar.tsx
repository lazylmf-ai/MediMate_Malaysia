/**
 * Festival Calendar Component
 * 
 * Interactive calendar showing Malaysian festivals with medication impact indicators
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useFestivalCalendar } from '../../../hooks/cultural';
import type { FestivalEvent } from '../../../services/festivals/FestivalCalendarService';

export interface FestivalCalendarProps {
  onFestivalSelect?: (festival: FestivalEvent) => void;
  onDatePress?: (date: string, festivals: FestivalEvent[]) => void;
  showMedicationImpact?: boolean;
  culturalFilter?: Array<'islamic' | 'chinese' | 'hindu' | 'malaysian' | 'public_holiday'>;
  theme?: 'light' | 'dark';
}

export const FestivalCalendar: React.FC<FestivalCalendarProps> = ({
  onFestivalSelect,
  onDatePress,
  showMedicationImpact = true,
  culturalFilter = ['islamic', 'chinese', 'hindu', 'malaysian', 'public_holiday'],
  theme = 'light'
}) => {
  const {
    festivals,
    upcomingFestivals,
    currentFestival,
    isCurrentlyRamadan,
    ramadanDaysRemaining,
    isLoading,
    isRefreshing,
    error,
    refreshCalendar,
    checkFestivalConflict
  } = useFestivalCalendar();

  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedFestivals, setSelectedFestivals] = useState<FestivalEvent[]>([]);

  const styles = createStyles(theme);

  /**
   * Filter festivals based on cultural preferences
   */
  const filteredFestivals = festivals.filter(festival => 
    culturalFilter.includes(festival.type)
  );

  /**
   * Create calendar marked dates from festivals
   */
  const markedDates = filteredFestivals.reduce((acc, festival) => {
    const dateString = festival.date.toISOString().split('T')[0];
    const isMultiDay = festival.duration > 1;
    
    // Create date range for multi-day festivals
    for (let i = 0; i < festival.duration; i++) {
      const currentDate = new Date(festival.date);
      currentDate.setDate(currentDate.getDate() + i);
      const currentDateString = currentDate.toISOString().split('T')[0];
      
      const dotColor = getFestivalColor(festival.type);
      const hasMedicationImpact = festival.medicationImpact.fasting || 
                                 festival.medicationImpact.timingAdjustments;
      
      acc[currentDateString] = {
        ...acc[currentDateString],
        marked: true,
        dots: [
          ...(acc[currentDateString]?.dots || []),
          {
            key: festival.id,
            color: dotColor,
            selectedDotColor: dotColor,
          }
        ],
        customStyles: {
          container: {
            backgroundColor: hasMedicationImpact ? '#FFF3CD' : undefined,
            borderColor: isMultiDay ? dotColor : undefined,
            borderWidth: isMultiDay ? 1 : 0,
          },
          text: {
            color: hasMedicationImpact ? '#856404' : undefined,
            fontWeight: hasMedicationImpact ? 'bold' : 'normal',
          }
        }
      };
    }
    
    return acc;
  }, {} as any);

  /**
   * Handle date selection
   */
  const handleDatePress = useCallback(async (day: any) => {
    const dateString = day.dateString;
    setSelectedDate(dateString);
    
    try {
      const date = new Date(dateString);
      const conflictData = await checkFestivalConflict(date);
      
      setSelectedFestivals(conflictData.festivals);
      
      if (onDatePress) {
        onDatePress(dateString, conflictData.festivals);
      }
      
      if (conflictData.hasFestival && conflictData.festivals.length > 0) {
        showFestivalDetails(conflictData.festivals[0]);
      }
    } catch (err) {
      console.error('Error checking festival conflict:', err);
    }
  }, [checkFestivalConflict, onDatePress]);

  /**
   * Show festival details modal
   */
  const showFestivalDetails = useCallback((festival: FestivalEvent) => {
    const medicationWarning = festival.medicationImpact.fasting ? 
      '\n\n⚠️ This festival involves fasting - medication timing may need adjustment.' : '';
    
    const culturalGuidance = festival.culturalGuidance.observance.length > 0 ?
      '\n\nCultural Guidance:\n' + festival.culturalGuidance.observance.join('\n• ') : '';
    
    Alert.alert(
      `${festival.name} (${festival.nameMs})`,
      `${festival.description}\n\nDuration: ${festival.duration} day${festival.duration > 1 ? 's' : ''}${medicationWarning}${culturalGuidance}`,
      [
        { text: 'Close', style: 'cancel' },
        ...(showMedicationImpact && festival.medicationImpact.timingAdjustments ? 
          [{ text: 'View Medication Guidance', onPress: () => onFestivalSelect?.(festival) }] : 
          [])
      ]
    );
  }, [onFestivalSelect, showMedicationImpact]);

  /**
   * Get color for festival type
   */
  const getFestivalColor = (type: string): string => {
    switch (type) {
      case 'islamic': return '#28A745';
      case 'chinese': return '#DC3545';
      case 'hindu': return '#FD7E14';
      case 'malaysian': return '#007BFF';
      case 'public_holiday': return '#6C757D';
      default: return '#6C757D';
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007BFF" />
        <Text style={styles.loadingText}>Loading Festival Calendar...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={refreshCalendar}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={refreshCalendar} />
      }
    >
      {/* Ramadan Status Banner */}
      {isCurrentlyRamadan && (
        <View style={styles.ramadanBanner}>
          <Text style={styles.ramadanTitle}>🌙 Ramadan Kareem</Text>
          <Text style={styles.ramadanText}>
            {ramadanDaysRemaining} days remaining
          </Text>
          <Text style={styles.ramadanSubtext}>
            Medication schedules adjusted for fasting
          </Text>
        </View>
      )}

      {/* Current Festival Banner */}
      {currentFestival && (
        <TouchableOpacity 
          style={[styles.currentFestivalBanner, { 
            borderLeftColor: getFestivalColor(currentFestival.type) 
          }]}
          onPress={() => showFestivalDetails(currentFestival)}
        >
          <Text style={styles.currentFestivalTitle}>
            🎉 {currentFestival.name}
          </Text>
          <Text style={styles.currentFestivalText}>
            Currently celebrating • Tap for details
          </Text>
          {currentFestival.medicationImpact.timingAdjustments && (
            <Text style={styles.medicationWarning}>
              ⚠️ Medication timing adjustments may be needed
            </Text>
          )}
        </TouchableOpacity>
      )}

      {/* Calendar */}
      <View style={styles.calendarContainer}>
        <Calendar
          markingType="multi-dot"
          markedDates={markedDates}
          onDayPress={handleDatePress}
          theme={{
            backgroundColor: theme === 'dark' ? '#2C2C2E' : '#FFFFFF',
            calendarBackground: theme === 'dark' ? '#2C2C2E' : '#FFFFFF',
            textSectionTitleColor: theme === 'dark' ? '#FFFFFF' : '#2C2C2E',
            dayTextColor: theme === 'dark' ? '#FFFFFF' : '#2C2C2E',
            todayTextColor: '#007BFF',
            selectedDayBackgroundColor: '#007BFF',
            selectedDayTextColor: '#FFFFFF',
            monthTextColor: theme === 'dark' ? '#FFFFFF' : '#2C2C2E',
            textDisabledColor: theme === 'dark' ? '#8E8E93' : '#C7C7CC'
          }}
          firstDay={1} // Monday as first day (common in Malaysia)
        />
      </View>

      {/* Legend */}
      <View style={styles.legendContainer}>
        <Text style={styles.legendTitle}>Festival Types</Text>
        <View style={styles.legendItems}>
          {culturalFilter.map(type => (
            <View key={type} style={styles.legendItem}>
              <View style={[styles.legendDot, { backgroundColor: getFestivalColor(type) }]} />
              <Text style={styles.legendText}>
                {type === 'islamic' ? 'Islamic' :
                 type === 'chinese' ? 'Chinese' :
                 type === 'hindu' ? 'Hindu' :
                 type === 'malaysian' ? 'Malaysian' :
                 'Public Holiday'}
              </Text>
            </View>
          ))}
        </View>
        {showMedicationImpact && (
          <View style={styles.medicationLegend}>
            <View style={styles.medicationIndicator} />
            <Text style={styles.legendText}>Has medication timing impact</Text>
          </View>
        )}
      </View>

      {/* Upcoming Festivals */}
      {upcomingFestivals.length > 0 && (
        <View style={styles.upcomingContainer}>
          <Text style={styles.upcomingTitle}>Upcoming Festivals</Text>
          {upcomingFestivals.slice(0, 5).map(festival => {
            const daysUntil = Math.ceil(
              (festival.date.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
            );
            
            return (
              <TouchableOpacity
                key={festival.id}
                style={[styles.upcomingItem, {
                  borderLeftColor: getFestivalColor(festival.type)
                }]}
                onPress={() => showFestivalDetails(festival)}
              >
                <View style={styles.upcomingContent}>
                  <Text style={styles.upcomingName}>{festival.name}</Text>
                  <Text style={styles.upcomingDate}>
                    {festival.date.toLocaleDateString('en-MY')} • {daysUntil} day{daysUntil !== 1 ? 's' : ''} away
                  </Text>
                  {festival.medicationImpact.fasting && (
                    <Text style={styles.fastingIndicator}>🕌 Involves fasting</Text>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {/* Selected Date Festivals */}
      {selectedFestivals.length > 0 && (
        <View style={styles.selectedContainer}>
          <Text style={styles.selectedTitle}>
            Festivals on {new Date(selectedDate).toLocaleDateString('en-MY')}
          </Text>
          {selectedFestivals.map(festival => (
            <TouchableOpacity
              key={festival.id}
              style={[styles.selectedItem, {
                borderLeftColor: getFestivalColor(festival.type)
              }]}
              onPress={() => showFestivalDetails(festival)}
            >
              <Text style={styles.selectedName}>{festival.name}</Text>
              <Text style={styles.selectedDescription}>{festival.description}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
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
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: theme === 'dark' ? '#FFFFFF' : '#2C2C2E',
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
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#007BFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  ramadanBanner: {
    backgroundColor: '#28A745',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  ramadanTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  ramadanText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  ramadanSubtext: {
    color: '#FFFFFF',
    fontSize: 12,
    opacity: 0.9,
    marginTop: 4,
  },
  currentFestivalBanner: {
    backgroundColor: theme === 'dark' ? '#2C2C2E' : '#FFFFFF',
    margin: 16,
    marginTop: 8,
    padding: 16,
    borderRadius: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  currentFestivalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme === 'dark' ? '#FFFFFF' : '#2C2C2E',
    marginBottom: 4,
  },
  currentFestivalText: {
    fontSize: 14,
    color: theme === 'dark' ? '#8E8E93' : '#8E8E93',
  },
  medicationWarning: {
    fontSize: 12,
    color: '#FD7E14',
    marginTop: 4,
    fontWeight: '500',
  },
  calendarContainer: {
    margin: 16,
    backgroundColor: theme === 'dark' ? '#2C2C2E' : '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  legendContainer: {
    margin: 16,
    marginTop: 8,
    backgroundColor: theme === 'dark' ? '#2C2C2E' : '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  legendTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme === 'dark' ? '#FFFFFF' : '#2C2C2E',
    marginBottom: 12,
  },
  legendItems: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 14,
    color: theme === 'dark' ? '#FFFFFF' : '#2C2C2E',
  },
  medicationLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: theme === 'dark' ? '#3C3C3E' : '#E5E5EA',
  },
  medicationIndicator: {
    width: 20,
    height: 12,
    backgroundColor: '#FFF3CD',
    borderRadius: 6,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#FD7E14',
  },
  upcomingContainer: {
    margin: 16,
    marginTop: 8,
    backgroundColor: theme === 'dark' ? '#2C2C2E' : '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  upcomingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme === 'dark' ? '#FFFFFF' : '#2C2C2E',
    marginBottom: 12,
  },
  upcomingItem: {
    borderLeftWidth: 4,
    paddingLeft: 12,
    paddingVertical: 8,
    marginBottom: 8,
  },
  upcomingContent: {
    flex: 1,
  },
  upcomingName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme === 'dark' ? '#FFFFFF' : '#2C2C2E',
    marginBottom: 2,
  },
  upcomingDate: {
    fontSize: 12,
    color: theme === 'dark' ? '#8E8E93' : '#8E8E93',
  },
  fastingIndicator: {
    fontSize: 12,
    color: '#28A745',
    marginTop: 2,
  },
  selectedContainer: {
    margin: 16,
    marginTop: 8,
    backgroundColor: theme === 'dark' ? '#2C2C2E' : '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  selectedTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme === 'dark' ? '#FFFFFF' : '#2C2C2E',
    marginBottom: 12,
  },
  selectedItem: {
    borderLeftWidth: 4,
    paddingLeft: 12,
    paddingVertical: 8,
    marginBottom: 8,
  },
  selectedName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme === 'dark' ? '#FFFFFF' : '#2C2C2E',
    marginBottom: 4,
  },
  selectedDescription: {
    fontSize: 12,
    color: theme === 'dark' ? '#8E8E93' : '#8E8E93',
  },
});

export default FestivalCalendar;