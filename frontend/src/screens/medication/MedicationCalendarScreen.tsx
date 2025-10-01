/**
 * Medication Calendar Screen
 * 
 * Calendar view for medication scheduling with:
 * - Monthly and weekly calendar views
 * - Cultural scheduling visualization (prayer times, meal times)
 * - Medication adherence tracking
 * - Ramadan and festival considerations
 * - Elderly-friendly UI with large buttons and clear indicators
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Calendar, CalendarProps } from 'react-native-calendars';

import { useAppSelector } from '../../store/hooks';
import { selectCulturalPreferences } from '../../store/slices/medicationSlice';
import { useMedicationScheduling } from '../../hooks/medication/useMedicationScheduling';
import { useMedicationReminders } from '../../hooks/medication/useMedicationReminders';
import { Medication } from '../../types/medication';

// Calendar theme based on cultural preferences
const getCalendarTheme = (language: string) => ({
  backgroundColor: '#ffffff',
  calendarBackground: '#ffffff',
  textSectionTitleColor: '#b6c1cd',
  selectedDayBackgroundColor: '#007AFF',
  selectedDayTextColor: '#ffffff',
  todayTextColor: '#007AFF',
  dayTextColor: '#2d4150',
  textDisabledColor: '#d9e1e8',
  dotColor: '#007AFF',
  selectedDotColor: '#ffffff',
  arrowColor: '#007AFF',
  monthTextColor: '#2d4150',
  indicatorColor: '#007AFF',
  textDayFontFamily: 'System',
  textMonthFontFamily: 'System',
  textDayHeaderFontFamily: 'System',
  textDayFontWeight: '400',
  textMonthFontWeight: '700',
  textDayHeaderFontWeight: '400',
  textDayFontSize: 16,
  textMonthFontSize: 18,
  textDayHeaderFontSize: 14,
});

interface CalendarState {
  selectedDate: string;
  viewMode: 'month' | 'week' | 'day';
  medications: Medication[];
  markedDates: Record<string, any>;
  showPrayerTimes: boolean;
  isRefreshing: boolean;
}

const MedicationCalendarScreen: React.FC = () => {
  const navigation = useNavigation();
  const culturalPreferences = useAppSelector(selectCulturalPreferences);
  const { generatePrayerTimes } = useMedicationScheduling();
  const { getUpcomingReminders, getMissedReminders } = useMedicationReminders();

  const [state, setState] = useState<CalendarState>({
    selectedDate: new Date().toISOString().split('T')[0],
    viewMode: 'month',
    medications: [],
    markedDates: {},
    showPrayerTimes: culturalPreferences.observesPrayerTimes,
    isRefreshing: false,
  });

  // Load medications and generate calendar markers
  const loadCalendarData = useCallback(async () => {
    setState(prev => ({ ...prev, isRefreshing: true }));
    
    try {
      // In a real implementation, this would fetch from API
      const mockMedications: Medication[] = [
        {
          id: '1',
          userId: 'user1',
          name: 'Paracetamol',
          genericName: 'Paracetamol',
          brandName: 'Panadol',
          dosage: { amount: 500, unit: 'mg', form: 'tablet' },
          schedule: {
            frequency: 'twice_daily',
            times: ['08:00', '20:00'],
            culturalAdjustments: {
              takeWithFood: true,
              avoidDuringFasting: culturalPreferences.observesRamadan,
              prayerTimeConsiderations: [],
              prayerTimeBuffer: 30,
            },
            reminders: true,
          },
          cultural: {
            takeWithFood: true,
            avoidDuringFasting: culturalPreferences.observesRamadan,
            prayerTimeConsiderations: [],
          },
          category: 'prescription',
          status: 'active',
          images: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];

      const markedDates = generateMarkedDates(mockMedications);
      
      setState(prev => ({
        ...prev,
        medications: mockMedications,
        markedDates,
        isRefreshing: false,
      }));
    } catch (error) {
      console.error('Failed to load calendar data:', error);
      setState(prev => ({ ...prev, isRefreshing: false }));
    }
  }, [culturalPreferences.observesRamadan]);

  // Generate marked dates for calendar
  const generateMarkedDates = useCallback((medications: Medication[]): Record<string, any> => {
    const marked: Record<string, any> = {};
    const today = new Date();
    
    // Mark dates for the next 30 days
    for (let i = 0; i < 30; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dateString = date.toISOString().split('T')[0];
      
      const medicationsForDate = medications.filter(med => 
        med.schedule.reminders && med.status === 'active'
      );
      
      if (medicationsForDate.length > 0) {
        marked[dateString] = {
          dots: medicationsForDate.map(med => ({
            key: med.id,
            color: getMedicationColor(med.category),
            selectedDotColor: '#ffffff',
          })),
          marked: true,
        };
      }
      
      // Mark today
      if (dateString === today.toISOString().split('T')[0]) {
        marked[dateString] = {
          ...marked[dateString],
          selected: true,
          selectedColor: '#007AFF',
        };
      }
    }
    
    return marked;
  }, []);

  // Get color for medication category
  const getMedicationColor = useCallback((category: string): string => {
    const colors = {
      prescription: '#007AFF',
      otc: '#34C759',
      supplement: '#FF9500',
      traditional: '#AF52DE',
      emergency: '#FF3B30',
    };
    return colors[category as keyof typeof colors] || '#007AFF';
  }, []);

  // Handle date selection
  const handleDateSelect = useCallback((day: any) => {
    setState(prev => ({
      ...prev,
      selectedDate: day.dateString,
    }));
  }, []);

  // Get medications for selected date
  const getMedicationsForDate = useCallback((date: string): Array<{
    medication: Medication;
    times: string[];
  }> => {
    return state.medications
      .filter(med => med.status === 'active' && med.schedule.reminders)
      .map(medication => ({
        medication,
        times: medication.schedule.times,
      }));
  }, [state.medications]);

  // Get prayer times for selected date
  const getPrayerTimesForDate = useCallback((date: string) => {
    if (!culturalPreferences.observesPrayerTimes) return null;
    
    // In a real implementation, this would calculate actual prayer times
    return generatePrayerTimes();
  }, [culturalPreferences.observesPrayerTimes, generatePrayerTimes]);

  // Format time for display
  const formatTime = useCallback((time: string): string => {
    const [hours, minutes] = time.split(':');
    const hour24 = parseInt(hours);
    
    if (culturalPreferences.language === 'ms') {
      return `${hours}:${minutes}`;
    } else {
      const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
      const period = hour24 >= 12 ? 'PM' : 'AM';
      return `${hour12}:${minutes} ${period}`;
    }
  }, [culturalPreferences.language]);

  // Render calendar header
  const renderHeader = () => (
    <View style={styles.header}>
      <TouchableOpacity
        style={styles.headerButton}
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={24} color="#007AFF" />
      </TouchableOpacity>
      
      <Text style={styles.headerTitle}>
        {culturalPreferences.language === 'ms' 
          ? 'Kalendar Ubat'
          : 'Medication Calendar'
        }
      </Text>
      
      <TouchableOpacity
        style={styles.headerButton}
        onPress={() => {
          // Navigate to add medication
          navigation.navigate('MedicationEntry' as never);
        }}
      >
        <Ionicons name="add" size={24} color="#007AFF" />
      </TouchableOpacity>
    </View>
  );

  // Render view mode toggle
  const renderViewModeToggle = () => (
    <View style={styles.viewModeContainer}>
      {(['month', 'week', 'day'] as const).map((mode) => (
        <TouchableOpacity
          key={mode}
          style={[
            styles.viewModeButton,
            state.viewMode === mode && styles.activeViewMode,
          ]}
          onPress={() => setState(prev => ({ ...prev, viewMode: mode }))}
        >
          <Text style={[
            styles.viewModeText,
            state.viewMode === mode && styles.activeViewModeText,
          ]}>
            {culturalPreferences.language === 'ms' 
              ? { month: 'Bulan', week: 'Minggu', day: 'Hari' }[mode]
              : { month: 'Month', week: 'Week', day: 'Day' }[mode]
            }
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  // Render calendar
  const renderCalendar = () => {
    if (state.viewMode !== 'month') {
      // For week and day views, we'd implement custom components
      return renderDayView();
    }

    return (
      <Calendar
        current={state.selectedDate}
        onDayPress={handleDateSelect}
        markedDates={state.markedDates}
        markingType="multi-dot"
        theme={getCalendarTheme(culturalPreferences.language)}
        firstDay={1} // Start week on Monday (common in Malaysia)
        enableSwipeMonths={true}
        hideExtraDays={true}
        disableMonthChange={false}
        style={styles.calendar}
      />
    );
  };

  // Render day view (simplified)
  const renderDayView = () => {
    const medications = getMedicationsForDate(state.selectedDate);
    const prayerTimes = getPrayerTimesForDate(state.selectedDate);
    
    return (
      <ScrollView style={styles.dayView}>
        <Text style={styles.dateTitle}>
          {new Date(state.selectedDate).toLocaleDateString(
            culturalPreferences.language === 'ms' ? 'ms-MY' : 'en-US',
            { 
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            }
          )}
        </Text>

        {/* Prayer Times */}
        {prayerTimes && state.showPrayerTimes && (
          <View style={styles.prayerTimesContainer}>
            <Text style={styles.sectionTitle}>
              {culturalPreferences.language === 'ms' ? 'Waktu Solat' : 'Prayer Times'}
            </Text>
            {Object.entries(prayerTimes).map(([prayer, time]) => (
              <View key={prayer} style={styles.prayerTimeItem}>
                <Text style={styles.prayerName}>
                  {getPrayerNameDisplay(prayer)}
                </Text>
                <Text style={styles.prayerTime}>
                  {formatTime(time as string)}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Medications */}
        <View style={styles.medicationsContainer}>
          <Text style={styles.sectionTitle}>
            {culturalPreferences.language === 'ms' ? 'Ubat Hari Ini' : "Today's Medications"}
          </Text>
          
          {medications.length === 0 ? (
            <Text style={styles.noMedicationsText}>
              {culturalPreferences.language === 'ms' 
                ? 'Tiada ubat dijadualkan'
                : 'No medications scheduled'
              }
            </Text>
          ) : (
            medications.map(({ medication, times }) => (
              <View key={medication.id} style={styles.medicationCard}>
                <View style={styles.medicationHeader}>
                  <Text style={styles.medicationName}>{medication.name}</Text>
                  <View style={[
                    styles.categoryBadge,
                    { backgroundColor: getMedicationColor(medication.category) },
                  ]}>
                    <Text style={styles.categoryText}>{medication.category}</Text>
                  </View>
                </View>
                
                <Text style={styles.dosageText}>
                  {medication.dosage.amount}{medication.dosage.unit}
                </Text>
                
                <View style={styles.timesContainer}>
                  {times.map((time) => (
                    <View key={time} style={styles.timeChip}>
                      <Text style={styles.timeText}>{formatTime(time)}</Text>
                    </View>
                  ))}
                </View>
                
                {medication.cultural.takeWithFood && (
                  <Text style={styles.culturalNote}>
                    {culturalPreferences.language === 'ms'
                      ? 'Ambil bersama makanan'
                      : 'Take with food'
                    }
                  </Text>
                )}
              </View>
            ))
          )}
        </View>
      </ScrollView>
    );
  };

  // Get prayer name for display
  const getPrayerNameDisplay = (prayer: string): string => {
    if (culturalPreferences.language === 'ms') {
      const names: Record<string, string> = {
        fajr: 'Subuh',
        dhuhr: 'Zohor',
        asr: 'Asar',
        maghrib: 'Maghrib',
        isha: 'Isyak',
      };
      return names[prayer] || prayer;
    }
    return prayer.charAt(0).toUpperCase() + prayer.slice(1);
  };

  // Initialize calendar data
  useEffect(() => {
    loadCalendarData();
  }, [loadCalendarData]);

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      
      {renderViewModeToggle()}
      
      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={state.isRefreshing}
            onRefresh={loadCalendarData}
            tintColor="#007AFF"
          />
        }
      >
        {renderCalendar()}
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e1e5e9',
  },
  headerButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  viewModeContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    padding: 4,
  },
  viewModeButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeViewMode: {
    backgroundColor: '#007AFF',
  },
  viewModeText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#666',
  },
  activeViewModeText: {
    color: '#fff',
  },
  content: {
    flex: 1,
  },
  calendar: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  dayView: {
    flex: 1,
    padding: 20,
  },
  dateTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 24,
    textAlign: 'center',
  },
  prayerTimesContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  prayerTimeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  prayerName: {
    fontSize: 16,
    color: '#666',
  },
  prayerTime: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  medicationsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
  },
  noMedicationsText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 20,
    fontStyle: 'italic',
  },
  medicationCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  medicationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  medicationName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
  },
  categoryBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  dosageText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
  },
  timesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  timeChip: {
    backgroundColor: '#e6f3ff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  timeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#0066cc',
  },
  culturalNote: {
    fontSize: 12,
    color: '#0066cc',
    fontStyle: 'italic',
    marginTop: 4,
  },
});

export default MedicationCalendarScreen;