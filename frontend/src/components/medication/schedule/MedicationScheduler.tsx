/**
 * Medication Scheduler Component
 * 
 * Flexible scheduling system supporting:
 * - Daily, weekly, as-needed patterns with cultural adjustments
 * - Prayer time and meal time considerations
 * - Ramadan-aware scheduling
 * - Multilingual support for Malaysian users
 * - Elderly-friendly UI with large buttons and clear instructions
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useMedicationScheduling } from '../../../hooks/medication/useMedicationScheduling';
import { MedicationSchedule } from '../../../types/medication';

// Component imports
import TimePickerModal from '../../common/TimePickerModal';
import CulturalNote from '../../common/CulturalNote';
import FrequencySelector from './FrequencySelector';
import TimeSlotsManager from './TimeSlotsManager';
import CulturalAdjustments from './CulturalAdjustments';

interface MedicationSchedulerProps {
  medicationId: string;
  existingSchedule?: MedicationSchedule;
  onScheduleChange: (schedule: MedicationSchedule) => void;
  onValidationChange: (isValid: boolean) => void;
}

interface SchedulerState {
  frequency: MedicationSchedule['frequency'];
  selectedTimes: string[];
  culturalSettings: {
    considerPrayerTimes: boolean;
    avoidMealTimes: boolean;
    adaptForRamadan: boolean;
    bufferMinutes: number;
  };
  showTimePickerFor: number | null;
  showAdvancedOptions: boolean;
}

const MedicationScheduler: React.FC<MedicationSchedulerProps> = ({
  medicationId,
  existingSchedule,
  onScheduleChange,
  onValidationChange,
}) => {
  const {
    culturalPreferences,
    schedulingOptions,
    getScheduleRecommendation,
    validateSchedule,
    createSchedule,
    updateSchedulingOptions,
  } = useMedicationScheduling();

  const [state, setState] = useState<SchedulerState>({
    frequency: existingSchedule?.frequency || 'daily',
    selectedTimes: existingSchedule?.times || [],
    culturalSettings: {
      considerPrayerTimes: schedulingOptions.considerPrayerTimes,
      avoidMealTimes: schedulingOptions.avoidMealTimes,
      adaptForRamadan: schedulingOptions.adaptForRamadan,
      bufferMinutes: schedulingOptions.bufferMinutes,
    },
    showTimePickerFor: null,
    showAdvancedOptions: false,
  });

  // Update schedule when state changes
  useEffect(() => {
    const schedule = createSchedule(medicationId, state.frequency, state.selectedTimes);
    const validation = validateSchedule(schedule);
    
    onScheduleChange(schedule);
    onValidationChange(validation.valid);
  }, [
    medicationId,
    state.frequency,
    state.selectedTimes,
    state.culturalSettings,
    createSchedule,
    validateSchedule,
    onScheduleChange,
    onValidationChange,
  ]);

  // Handle frequency change
  const handleFrequencyChange = useCallback((frequency: MedicationSchedule['frequency']) => {
    setState(prev => ({ ...prev, frequency }));

    // Get recommended times for new frequency
    const recommendation = getScheduleRecommendation(frequency, state.culturalSettings);
    setState(prev => ({ 
      ...prev, 
      selectedTimes: recommendation.recommendedTimes 
    }));
  }, [getScheduleRecommendation, state.culturalSettings]);

  // Handle time selection
  const handleTimeSelect = useCallback((timeIndex: number, time: string) => {
    setState(prev => {
      const newTimes = [...prev.selectedTimes];
      newTimes[timeIndex] = time;
      return { ...prev, selectedTimes: newTimes };
    });
  }, []);

  // Add new time slot
  const handleAddTimeSlot = useCallback(() => {
    setState(prev => ({
      ...prev,
      selectedTimes: [...prev.selectedTimes, '09:00'],
      showTimePickerFor: prev.selectedTimes.length,
    }));
  }, []);

  // Remove time slot
  const handleRemoveTimeSlot = useCallback((index: number) => {
    setState(prev => ({
      ...prev,
      selectedTimes: prev.selectedTimes.filter((_, i) => i !== index),
    }));
  }, []);

  // Handle cultural setting changes
  const handleCulturalSettingChange = useCallback((
    setting: keyof SchedulerState['culturalSettings'],
    value: any
  ) => {
    setState(prev => ({
      ...prev,
      culturalSettings: { ...prev.culturalSettings, [setting]: value },
    }));

    // Update global scheduling options
    updateSchedulingOptions({ [setting]: value });
  }, [updateSchedulingOptions]);

  // Get smart recommendations
  const getSmartRecommendations = useCallback(() => {
    const recommendation = getScheduleRecommendation(state.frequency, state.culturalSettings);
    
    if (recommendation.conflicts.length > 0) {
      Alert.alert(
        culturalPreferences.language === 'ms' ? 'Konflik Masa' : 'Time Conflicts',
        culturalPreferences.language === 'ms' 
          ? 'Terdapat konflik dengan waktu solat atau makan. Adakah anda ingin menggunakan masa yang dicadangkan?'
          : 'There are conflicts with prayer or meal times. Would you like to use the recommended times?',
        [
          { text: culturalPreferences.language === 'ms' ? 'Batal' : 'Cancel' },
          {
            text: culturalPreferences.language === 'ms' ? 'Gunakan Cadangan' : 'Use Recommendations',
            onPress: () => {
              setState(prev => ({
                ...prev,
                selectedTimes: recommendation.alternativeTimes || recommendation.recommendedTimes,
              }));
            },
          },
        ]
      );
    } else {
      setState(prev => ({
        ...prev,
        selectedTimes: recommendation.recommendedTimes,
      }));
    }
  }, [getScheduleRecommendation, state.frequency, state.culturalSettings, culturalPreferences]);

  // Render frequency selector
  const renderFrequencySelector = () => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>
        {culturalPreferences.language === 'ms' ? 'Kekerapan' : 'Frequency'}
      </Text>
      
      <FrequencySelector
        selectedFrequency={state.frequency}
        onFrequencySelect={handleFrequencyChange}
        language={culturalPreferences.language}
      />
    </View>
  );

  // Render time slots manager
  const renderTimeSlots = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          {culturalPreferences.language === 'ms' ? 'Masa Pengambilan' : 'Medication Times'}
        </Text>
        
        <TouchableOpacity
          style={styles.smartButton}
          onPress={getSmartRecommendations}
        >
          <Ionicons name="bulb-outline" size={20} color="#007AFF" />
          <Text style={styles.smartButtonText}>
            {culturalPreferences.language === 'ms' ? 'Pandai' : 'Smart'}
          </Text>
        </TouchableOpacity>
      </View>

      <TimeSlotsManager
        times={state.selectedTimes}
        frequency={state.frequency}
        onTimeChange={handleTimeSelect}
        onAddTime={handleAddTimeSlot}
        onRemoveTime={handleRemoveTimeSlot}
        culturalPreferences={culturalPreferences}
      />

      {/* Show time picker modal */}
      {state.showTimePickerFor !== null && (
        <TimePickerModal
          isVisible={true}
          initialTime={state.selectedTimes[state.showTimePickerFor]}
          onTimeSelect={(time) => {
            handleTimeSelect(state.showTimePickerFor!, time);
            setState(prev => ({ ...prev, showTimePickerFor: null }));
          }}
          onCancel={() => setState(prev => ({ ...prev, showTimePickerFor: null }))}
          title={
            culturalPreferences.language === 'ms'
              ? 'Pilih Masa'
              : 'Select Time'
          }
        />
      )}
    </View>
  );

  // Render cultural adjustments
  const renderCulturalAdjustments = () => (
    <View style={styles.section}>
      <TouchableOpacity
        style={styles.advancedToggle}
        onPress={() => setState(prev => ({ 
          ...prev, 
          showAdvancedOptions: !prev.showAdvancedOptions 
        }))}
      >
        <Text style={styles.sectionTitle}>
          {culturalPreferences.language === 'ms' ? 'Pelarasan Budaya' : 'Cultural Adjustments'}
        </Text>
        <Ionicons 
          name={state.showAdvancedOptions ? "chevron-up" : "chevron-down"} 
          size={24} 
          color="#666" 
        />
      </TouchableOpacity>

      {state.showAdvancedOptions && (
        <CulturalAdjustments
          settings={state.culturalSettings}
          onSettingChange={handleCulturalSettingChange}
          culturalPreferences={culturalPreferences}
        />
      )}
    </View>
  );

  // Render schedule validation warnings
  const renderValidationWarnings = () => {
    const schedule = createSchedule(medicationId, state.frequency, state.selectedTimes);
    const validation = validateSchedule(schedule);

    if (validation.warnings.length === 0 && validation.errors.length === 0) {
      return null;
    }

    return (
      <View style={styles.section}>
        {validation.errors.length > 0 && (
          <CulturalNote
            messages={validation.errors}
            type="error"
            title={
              culturalPreferences.language === 'ms' 
                ? 'Ralat Jadual' 
                : 'Schedule Errors'
            }
          />
        )}
        
        {validation.warnings.length > 0 && (
          <CulturalNote
            messages={validation.warnings}
            type="warning"
            title={
              culturalPreferences.language === 'ms' 
                ? 'Amaran Jadual' 
                : 'Schedule Warnings'
            }
          />
        )}
      </View>
    );
  };

  // Render schedule preview
  const renderSchedulePreview = () => {
    const schedule = createSchedule(medicationId, state.frequency, state.selectedTimes);
    
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          {culturalPreferences.language === 'ms' ? 'Ringkasan Jadual' : 'Schedule Summary'}
        </Text>
        
        <View style={styles.previewContainer}>
          <View style={styles.previewItem}>
            <Text style={styles.previewLabel}>
              {culturalPreferences.language === 'ms' ? 'Kekerapan:' : 'Frequency:'}
            </Text>
            <Text style={styles.previewValue}>
              {getFrequencyDisplayName(schedule.frequency)}
            </Text>
          </View>

          <View style={styles.previewItem}>
            <Text style={styles.previewLabel}>
              {culturalPreferences.language === 'ms' ? 'Masa:' : 'Times:'}
            </Text>
            <Text style={styles.previewValue}>
              {schedule.times.join(', ')}
            </Text>
          </View>

          {schedule.nextDue && (
            <View style={styles.previewItem}>
              <Text style={styles.previewLabel}>
                {culturalPreferences.language === 'ms' ? 'Seterusnya:' : 'Next:'}
              </Text>
              <Text style={styles.previewValue}>
                {new Date(schedule.nextDue).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  // Helper function to get frequency display name
  const getFrequencyDisplayName = (frequency: MedicationSchedule['frequency']): string => {
    const names = {
      daily: culturalPreferences.language === 'ms' ? 'Setiap Hari' : 'Daily',
      twice_daily: culturalPreferences.language === 'ms' ? 'Dua Kali Sehari' : 'Twice Daily',
      three_times: culturalPreferences.language === 'ms' ? 'Tiga Kali Sehari' : 'Three Times Daily',
      four_times: culturalPreferences.language === 'ms' ? 'Empat Kali Sehari' : 'Four Times Daily',
      weekly: culturalPreferences.language === 'ms' ? 'Mingguan' : 'Weekly',
      as_needed: culturalPreferences.language === 'ms' ? 'Bila Perlu' : 'As Needed',
      custom: culturalPreferences.language === 'ms' ? 'Tersuai' : 'Custom',
    };
    return names[frequency];
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {renderFrequencySelector()}
      
      {state.frequency !== 'as_needed' && renderTimeSlots()}
      
      {renderCulturalAdjustments()}
      
      {renderValidationWarnings()}
      
      {renderSchedulePreview()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    padding: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  advancedToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  smartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f0f8ff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#007AFF',
  },
  smartButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
    marginLeft: 4,
  },
  previewContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
  },
  previewItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  previewLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  previewValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
});

export default MedicationScheduler;