/**
 * Time Slots Manager Component
 * 
 * Component for managing medication time slots with:
 * - Add/remove time slots
 * - Visual time picker integration
 * - Prayer time conflict detection
 * - Elderly-friendly time display
 * - Cultural time format support
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { MedicationSchedule } from '../../../types/medication';

interface TimeSlotsManagerProps {
  times: string[];
  frequency: MedicationSchedule['frequency'];
  onTimeChange: (index: number, time: string) => void;
  onAddTime: () => void;
  onRemoveTime: (index: number) => void;
  culturalPreferences: {
    language: 'ms' | 'en' | 'zh' | 'ta';
    observesPrayerTimes: boolean;
    observesRamadan: boolean;
  };
  maxSlots?: number;
  minSlots?: number;
}

const TimeSlotsManager: React.FC<TimeSlotsManagerProps> = ({
  times,
  frequency,
  onTimeChange,
  onAddTime,
  onRemoveTime,
  culturalPreferences,
  maxSlots = 8,
  minSlots = 1,
}) => {

  // Prayer times for conflict detection (simplified)
  const prayerTimes = {
    fajr: '06:00',
    dhuhr: '13:15',
    asr: '16:30',
    maghrib: '19:20',
    isha: '20:35',
  };

  // Check if time conflicts with prayer times
  const checkPrayerTimeConflict = (time: string): string | null => {
    if (!culturalPreferences.observesPrayerTimes) return null;

    const timeMinutes = timeToMinutes(time);
    const bufferMinutes = 15; // 15-minute buffer

    for (const [prayer, prayerTime] of Object.entries(prayerTimes)) {
      const prayerMinutes = timeToMinutes(prayerTime);
      const timeDiff = Math.abs(timeMinutes - prayerMinutes);
      
      if (timeDiff <= bufferMinutes) {
        return prayer;
      }
    }
    
    return null;
  };

  // Format time for display based on cultural preferences
  const formatTimeDisplay = (time: string): string => {
    const [hours, minutes] = time.split(':');
    const hour24 = parseInt(hours);
    
    // Use 24-hour format for Malaysian context, 12-hour for others
    if (culturalPreferences.language === 'ms') {
      return `${hours}:${minutes}`;
    } else {
      const hour12 = hour24 === 0 ? 12 : hour24 > 12 ? hour24 - 12 : hour24;
      const period = hour24 >= 12 ? 'PM' : 'AM';
      return `${hour12}:${minutes} ${period}`;
    }
  };

  // Get recommended time based on slot index
  const getRecommendedTime = (slotIndex: number): string => {
    const recommendedTimes: Record<MedicationSchedule['frequency'], string[]> = {
      daily: ['09:00'],
      twice_daily: ['08:00', '20:00'],
      three_times: ['08:00', '14:00', '20:00'],
      four_times: ['08:00', '13:00', '17:00', '21:00'],
      weekly: ['09:00'],
      as_needed: [],
      custom: ['09:00'],
    };

    const defaults = recommendedTimes[frequency] || ['09:00'];
    return defaults[slotIndex] || '09:00';
  };

  // Handle time slot removal with confirmation
  const handleRemoveTime = (index: number) => {
    if (times.length <= minSlots) {
      Alert.alert(
        culturalPreferences.language === 'ms' ? 'Tidak Boleh Padam' : 'Cannot Remove',
        culturalPreferences.language === 'ms'
          ? 'Sekurang-kurangnya satu masa diperlukan'
          : 'At least one time is required'
      );
      return;
    }

    Alert.alert(
      culturalPreferences.language === 'ms' ? 'Padam Masa' : 'Remove Time',
      culturalPreferences.language === 'ms'
        ? `Adakah anda pasti ingin memadam masa ${formatTimeDisplay(times[index])}?`
        : `Are you sure you want to remove time ${formatTimeDisplay(times[index])}?`,
      [
        {
          text: culturalPreferences.language === 'ms' ? 'Batal' : 'Cancel',
          style: 'cancel',
        },
        {
          text: culturalPreferences.language === 'ms' ? 'Padam' : 'Remove',
          style: 'destructive',
          onPress: () => onRemoveTime(index),
        },
      ]
    );
  };

  // Handle adding new time slot
  const handleAddTime = () => {
    if (times.length >= maxSlots) {
      Alert.alert(
        culturalPreferences.language === 'ms' ? 'Had Maksimum' : 'Maximum Limit',
        culturalPreferences.language === 'ms'
          ? `Maksimum ${maxSlots} masa sahaja dibenarkan`
          : `Maximum of ${maxSlots} times allowed`
      );
      return;
    }

    onAddTime();
  };

  // Convert time string to minutes for calculations
  const timeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  };

  // Render individual time slot
  const renderTimeSlot = (time: string, index: number) => {
    const prayerConflict = checkPrayerTimeConflict(time);
    const hasConflict = !!prayerConflict;

    return (
      <View 
        key={index} 
        style={[
          styles.timeSlot,
          hasConflict && styles.conflictTimeSlot,
        ]}
      >
        <TouchableOpacity
          style={styles.timeButton}
          onPress={() => {
            // This would open a time picker modal
            // For now, we'll just cycle through common times
            const commonTimes = ['08:00', '13:00', '18:00', '21:00'];
            const currentIndex = commonTimes.indexOf(time);
            const nextTime = commonTimes[(currentIndex + 1) % commonTimes.length];
            onTimeChange(index, nextTime);
          }}
        >
          <Ionicons 
            name="time-outline" 
            size={24} 
            color={hasConflict ? '#ff4444' : '#007AFF'} 
          />
          <Text style={[
            styles.timeText,
            hasConflict && styles.conflictTimeText,
          ]}>
            {formatTimeDisplay(time)}
          </Text>
        </TouchableOpacity>

        {/* Prayer time conflict warning */}
        {hasConflict && (
          <View style={styles.conflictWarning}>
            <Ionicons name="warning" size={16} color="#ff4444" />
            <Text style={styles.conflictText}>
              {culturalPreferences.language === 'ms'
                ? `Dekat waktu ${getPrayerNameMs(prayerConflict)}`
                : `Near ${prayerConflict} prayer time`
              }
            </Text>
          </View>
        )}

        {/* Remove button */}
        {times.length > minSlots && (
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => handleRemoveTime(index)}
          >
            <Ionicons name="close-circle" size={24} color="#ff4444" />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  // Get prayer name in Malay
  const getPrayerNameMs = (prayer: string): string => {
    const names: Record<string, string> = {
      fajr: 'Subuh',
      dhuhr: 'Zohor',
      asr: 'Asar',
      maghrib: 'Maghrib',
      isha: 'Isyak',
    };
    return names[prayer] || prayer;
  };

  // Render add time button
  const renderAddTimeButton = () => {
    if (times.length >= maxSlots || frequency === 'as_needed') {
      return null;
    }

    return (
      <TouchableOpacity
        style={styles.addTimeButton}
        onPress={handleAddTime}
      >
        <Ionicons name="add-circle-outline" size={32} color="#007AFF" />
        <Text style={styles.addTimeText}>
          {culturalPreferences.language === 'ms'
            ? 'Tambah Masa'
            : 'Add Time'
          }
        </Text>
      </TouchableOpacity>
    );
  };

  // Render frequency-specific guidance
  const renderGuidance = () => {
    const guidance: Record<MedicationSchedule['frequency'], { ms: string; en: string }> = {
      daily: {
        ms: 'Pilih masa yang sama setiap hari untuk keberkesanan terbaik',
        en: 'Choose the same time each day for best effectiveness',
      },
      twice_daily: {
        ms: 'Jarak 12 jam antara dos untuk hasil terbaik',
        en: 'Space doses 12 hours apart for best results',
      },
      three_times: {
        ms: 'Ambil dengan makanan jika disarankan',
        en: 'Take with meals if recommended',
      },
      four_times: {
        ms: 'Jarak masa yang seragam diperlukan',
        en: 'Even spacing between doses required',
      },
      weekly: {
        ms: 'Pilih hari dan masa yang mudah diingati',
        en: 'Choose a day and time easy to remember',
      },
      as_needed: {
        ms: 'Ikut arahan doktor atau farmasi',
        en: 'Follow doctor or pharmacist instructions',
      },
      custom: {
        ms: 'Sesuaikan mengikut keperluan anda',
        en: 'Customize according to your needs',
      },
    };

    const text = guidance[frequency]?.[culturalPreferences.language] || guidance[frequency]?.en || '';

    if (!text) return null;

    return (
      <View style={styles.guidanceContainer}>
        <Ionicons name="information-circle-outline" size={20} color="#0066cc" />
        <Text style={styles.guidanceText}>{text}</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Time Slots */}
      {times.map((time, index) => renderTimeSlot(time, index))}
      
      {/* Add Time Button */}
      {renderAddTimeButton()}
      
      {/* Guidance */}
      {renderGuidance()}
      
      {/* Time Summary */}
      {times.length > 0 && (
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryLabel}>
            {culturalPreferences.language === 'ms'
              ? 'Ringkasan Masa:'
              : 'Time Summary:'
            }
          </Text>
          <Text style={styles.summaryText}>
            {times.map(formatTimeDisplay).join(' • ')}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  timeSlot: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e1e5e9',
  },
  conflictTimeSlot: {
    backgroundColor: '#ffe6e6',
    borderColor: '#ff4444',
  },
  timeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  timeText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1a1a1a',
    minWidth: 100,
  },
  conflictTimeText: {
    color: '#cc0000',
  },
  conflictWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 68, 68, 0.2)',
  },
  conflictText: {
    fontSize: 12,
    color: '#cc0000',
    fontWeight: '500',
  },
  removeButton: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  addTimeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    backgroundColor: '#f0f8ff',
    borderRadius: 12,
    padding: 20,
    borderWidth: 2,
    borderColor: '#007AFF',
    borderStyle: 'dashed',
  },
  addTimeText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  guidanceContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#e6f3ff',
    borderRadius: 8,
    padding: 16,
  },
  guidanceText: {
    flex: 1,
    fontSize: 14,
    color: '#0066cc',
    lineHeight: 18,
  },
  summaryContainer: {
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
    padding: 16,
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0066cc',
    marginBottom: 4,
  },
  summaryText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#004499',
  },
});

export default TimeSlotsManager;