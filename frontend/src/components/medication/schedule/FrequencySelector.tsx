/**
 * Frequency Selector Component
 * 
 * Component for selecting medication frequency with:
 * - Visual frequency options (daily, twice daily, etc.)
 * - Cultural considerations and multilingual support
 * - Elderly-friendly UI with large buttons
 * - Smart recommendations based on cultural context
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { MedicationSchedule } from '../../../types/medication';

interface FrequencySelectorProps {
  selectedFrequency: MedicationSchedule['frequency'];
  onFrequencySelect: (frequency: MedicationSchedule['frequency']) => void;
  language: 'ms' | 'en' | 'zh' | 'ta';
  disabled?: boolean;
}

interface FrequencyOption {
  value: MedicationSchedule['frequency'];
  label: {
    ms: string;
    en: string;
  };
  description: {
    ms: string;
    en: string;
  };
  icon: string;
  recommendedFor?: string[];
  culturalNote?: {
    ms: string;
    en: string;
  };
}

const FrequencySelector: React.FC<FrequencySelectorProps> = ({
  selectedFrequency,
  onFrequencySelect,
  language,
  disabled = false,
}) => {
  
  const frequencyOptions: FrequencyOption[] = [
    {
      value: 'daily',
      label: {
        ms: 'Sekali Sehari',
        en: 'Once Daily',
      },
      description: {
        ms: 'Ambil pada masa yang sama setiap hari',
        en: 'Take at the same time every day',
      },
      icon: 'sunny-outline',
      recommendedFor: ['maintenance', 'vitamins'],
      culturalNote: {
        ms: 'Sesuai dengan waktu solat subuh atau maghrib',
        en: 'Suitable with morning or evening prayers',
      },
    },
    {
      value: 'twice_daily',
      label: {
        ms: 'Dua Kali Sehari',
        en: 'Twice Daily',
      },
      description: {
        ms: 'Ambil pada pagi dan petang',
        en: 'Take in morning and evening',
      },
      icon: 'partly-sunny-outline',
      recommendedFor: ['antibiotics', 'blood_pressure'],
      culturalNote: {
        ms: 'Selepas solat subuh dan maghrib',
        en: 'After morning and evening prayers',
      },
    },
    {
      value: 'three_times',
      label: {
        ms: 'Tiga Kali Sehari',
        en: 'Three Times Daily',
      },
      description: {
        ms: 'Ambil dengan sarapan, makan tengah hari, dan makan malam',
        en: 'Take with breakfast, lunch, and dinner',
      },
      icon: 'restaurant-outline',
      recommendedFor: ['pain_relief', 'digestive'],
      culturalNote: {
        ms: 'Mengikut waktu makan Malaysia',
        en: 'Following Malaysian meal times',
      },
    },
    {
      value: 'four_times',
      label: {
        ms: 'Empat Kali Sehari',
        en: 'Four Times Daily',
      },
      description: {
        ms: 'Setiap 6 jam sekali',
        en: 'Every 6 hours',
      },
      icon: 'time-outline',
      recommendedFor: ['severe_infections'],
      culturalNote: {
        ms: 'Mungkin perlu mengambil waktu tengah malam',
        en: 'May require middle-of-night doses',
      },
    },
    {
      value: 'weekly',
      label: {
        ms: 'Mingguan',
        en: 'Weekly',
      },
      description: {
        ms: 'Ambil pada hari yang sama setiap minggu',
        en: 'Take on the same day every week',
      },
      icon: 'calendar-outline',
      recommendedFor: ['supplements', 'injections'],
      culturalNote: {
        ms: 'Sesuai pada hari Jumaat selepas solat',
        en: 'Suitable on Fridays after prayers',
      },
    },
    {
      value: 'as_needed',
      label: {
        ms: 'Bila Perlu',
        en: 'As Needed',
      },
      description: {
        ms: 'Ambil hanya apabila diperlukan',
        en: 'Take only when needed',
      },
      icon: 'help-circle-outline',
      recommendedFor: ['pain_relief', 'allergy'],
      culturalNote: {
        ms: 'Ikut nasihat doktor atau farmasi',
        en: 'Follow doctor or pharmacist advice',
      },
    },
  ];

  const renderFrequencyOption = (option: FrequencyOption) => {
    const isSelected = selectedFrequency === option.value;
    const label = option.label[language] || option.label.en;
    const description = option.description[language] || option.description.en;
    const culturalNote = option.culturalNote && (option.culturalNote[language] || option.culturalNote.en);

    return (
      <TouchableOpacity
        key={option.value}
        style={[
          styles.frequencyOption,
          isSelected && styles.selectedOption,
          disabled && styles.disabledOption,
        ]}
        onPress={() => !disabled && onFrequencySelect(option.value)}
        disabled={disabled}
        accessibilityLabel={`${label}: ${description}`}
        accessibilityRole="button"
        accessibilityState={{ selected: isSelected, disabled }}
      >
        <View style={styles.optionHeader}>
          <View style={styles.iconContainer}>
            <Ionicons 
              name={option.icon as any} 
              size={28} 
              color={isSelected ? '#fff' : '#007AFF'} 
            />
          </View>
          
          <View style={styles.labelContainer}>
            <Text style={[
              styles.optionLabel,
              isSelected && styles.selectedLabel,
            ]}>
              {label}
            </Text>
            
            <Text style={[
              styles.optionDescription,
              isSelected && styles.selectedDescription,
            ]}>
              {description}
            </Text>
          </View>

          {isSelected && (
            <View style={styles.checkmarkContainer}>
              <Ionicons name="checkmark-circle" size={24} color="#fff" />
            </View>
          )}
        </View>

        {/* Cultural note for selected option */}
        {isSelected && culturalNote && (
          <View style={styles.culturalNoteContainer}>
            <Ionicons name="information-circle-outline" size={16} color="#fff" />
            <Text style={styles.culturalNoteText}>
              {culturalNote}
            </Text>
          </View>
        )}

        {/* Recommended usage indicator */}
        {option.recommendedFor && option.recommendedFor.length > 0 && (
          <View style={styles.recommendedContainer}>
            <Text style={[
              styles.recommendedText,
              isSelected && styles.selectedRecommendedText,
            ]}>
              {language === 'ms' ? 'Sesuai untuk: ' : 'Recommended for: '}
              {option.recommendedFor.join(', ')}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {frequencyOptions.map(renderFrequencyOption)}
      
      {/* Helper text */}
      <View style={styles.helperContainer}>
        <Ionicons name="bulb-outline" size={20} color="#666" />
        <Text style={styles.helperText}>
          {language === 'ms' 
            ? 'Pilih kekerapan yang sesuai dengan gaya hidup dan keperluan ubat anda'
            : 'Choose a frequency that fits your lifestyle and medication needs'
          }
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  frequencyOption: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    borderWidth: 2,
    borderColor: '#e1e5e9',
    marginBottom: 4,
  },
  selectedOption: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  disabledOption: {
    opacity: 0.5,
  },
  optionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  labelContainer: {
    flex: 1,
    gap: 4,
  },
  optionLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  selectedLabel: {
    color: '#fff',
  },
  optionDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  selectedDescription: {
    color: '#e6f3ff',
  },
  checkmarkContainer: {
    marginLeft: 'auto',
  },
  culturalNoteContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  culturalNoteText: {
    flex: 1,
    fontSize: 13,
    color: '#e6f3ff',
    fontStyle: 'italic',
  },
  recommendedContainer: {
    marginTop: 8,
  },
  recommendedText: {
    fontSize: 12,
    color: '#999',
    fontWeight: '500',
  },
  selectedRecommendedText: {
    color: '#cce7ff',
  },
  helperContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
    padding: 16,
    marginTop: 8,
  },
  helperText: {
    flex: 1,
    fontSize: 14,
    color: '#0066cc',
    lineHeight: 18,
  },
});

export default FrequencySelector;