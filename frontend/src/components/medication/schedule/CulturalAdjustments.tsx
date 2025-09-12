/**
 * Cultural Adjustments Component
 * 
 * Component for cultural scheduling adjustments with:
 * - Prayer time considerations
 * - Meal time preferences 
 * - Ramadan adaptations
 * - Buffer time settings
 * - Malaysian cultural context
 */

import React from 'react';
import {
  View,
  Text,
  Switch,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import Slider from '@react-native-community/slider';

interface CulturalAdjustmentsProps {
  settings: {
    considerPrayerTimes: boolean;
    avoidMealTimes: boolean;
    adaptForRamadan: boolean;
    bufferMinutes: number;
  };
  onSettingChange: (setting: string, value: any) => void;
  culturalPreferences: {
    language: 'ms' | 'en' | 'zh' | 'ta';
    observesPrayerTimes: boolean;
    observesRamadan: boolean;
    religion: string;
  };
}

const CulturalAdjustments: React.FC<CulturalAdjustmentsProps> = ({
  settings,
  onSettingChange,
  culturalPreferences,
}) => {

  // Cultural adjustment options based on user's preferences
  const adjustmentOptions = [
    {
      key: 'considerPrayerTimes',
      icon: 'moon-outline',
      title: {
        ms: 'Pertimbangkan Waktu Solat',
        en: 'Consider Prayer Times',
      },
      description: {
        ms: 'Elakkan mengambil ubat semasa waktu solat',
        en: 'Avoid taking medication during prayer times',
      },
      value: settings.considerPrayerTimes,
      enabled: culturalPreferences.observesPrayerTimes,
      type: 'switch' as const,
      culturalNote: {
        ms: 'Berdasarkan waktu solat Malaysia (JAKIM)',
        en: 'Based on Malaysian prayer times (JAKIM)',
      },
    },
    {
      key: 'avoidMealTimes',
      icon: 'restaurant-outline',
      title: {
        ms: 'Sesuaikan dengan Waktu Makan',
        en: 'Adjust for Meal Times',
      },
      description: {
        ms: 'Sesuaikan dengan waktu makan Malaysia',
        en: 'Adjust for Malaysian meal times',
      },
      value: settings.avoidMealTimes,
      enabled: true,
      type: 'switch' as const,
      culturalNote: {
        ms: 'Sarapan (7:30), Makan tengah hari (12:30), Makan malam (18:30)',
        en: 'Breakfast (7:30), Lunch (12:30), Dinner (18:30)',
      },
    },
    {
      key: 'adaptForRamadan',
      icon: 'moon',
      title: {
        ms: 'Adaptasi Ramadan',
        en: 'Ramadan Adaptation',
      },
      description: {
        ms: 'Sesuaikan jadual semasa bulan Ramadan',
        en: 'Adjust schedule during Ramadan',
      },
      value: settings.adaptForRamadan,
      enabled: culturalPreferences.observesRamadan,
      type: 'switch' as const,
      culturalNote: {
        ms: 'Ubat akan disesuaikan mengikut waktu sahur dan berbuka',
        en: 'Medications adjusted for pre-dawn and breaking fast times',
      },
    },
    {
      key: 'bufferMinutes',
      icon: 'timer-outline',
      title: {
        ms: 'Masa Penampan',
        en: 'Buffer Time',
      },
      description: {
        ms: 'Masa penampan sebelum/selepas waktu solat',
        en: 'Buffer time before/after prayer times',
      },
      value: settings.bufferMinutes,
      enabled: settings.considerPrayerTimes,
      type: 'slider' as const,
      min: 5,
      max: 60,
      step: 5,
      unit: {
        ms: 'minit',
        en: 'minutes',
      },
    },
  ];

  // Render switch control
  const renderSwitch = (option: any) => (
    <View style={[styles.adjustmentItem, !option.enabled && styles.disabledItem]}>
      <View style={styles.iconContainer}>
        <Ionicons 
          name={option.icon} 
          size={24} 
          color={option.enabled ? '#007AFF' : '#ccc'} 
        />
      </View>

      <View style={styles.contentContainer}>
        <Text style={[
          styles.title,
          !option.enabled && styles.disabledText,
        ]}>
          {option.title[culturalPreferences.language] || option.title.en}
        </Text>
        
        <Text style={[
          styles.description,
          !option.enabled && styles.disabledText,
        ]}>
          {option.description[culturalPreferences.language] || option.description.en}
        </Text>

        {option.culturalNote && option.value && option.enabled && (
          <View style={styles.culturalNote}>
            <Ionicons name="information-circle-outline" size={16} color="#0066cc" />
            <Text style={styles.culturalNoteText}>
              {option.culturalNote[culturalPreferences.language] || option.culturalNote.en}
            </Text>
          </View>
        )}
      </View>

      <Switch
        value={option.value}
        onValueChange={(value) => onSettingChange(option.key, value)}
        disabled={!option.enabled}
        trackColor={{ false: '#e1e5e9', true: '#007AFF' }}
        thumbColor={option.value ? '#fff' : '#f4f3f4'}
      />
    </View>
  );

  // Render slider control
  const renderSlider = (option: any) => (
    <View style={[styles.adjustmentItem, !option.enabled && styles.disabledItem]}>
      <View style={styles.iconContainer}>
        <Ionicons 
          name={option.icon} 
          size={24} 
          color={option.enabled ? '#007AFF' : '#ccc'} 
        />
      </View>

      <View style={styles.contentContainer}>
        <View style={styles.sliderHeader}>
          <Text style={[
            styles.title,
            !option.enabled && styles.disabledText,
          ]}>
            {option.title[culturalPreferences.language] || option.title.en}
          </Text>
          
          <Text style={[
            styles.sliderValue,
            !option.enabled && styles.disabledText,
          ]}>
            {option.value} {option.unit[culturalPreferences.language] || option.unit.en}
          </Text>
        </View>
        
        <Text style={[
          styles.description,
          !option.enabled && styles.disabledText,
        ]}>
          {option.description[culturalPreferences.language] || option.description.en}
        </Text>

        <Slider
          style={styles.slider}
          minimumValue={option.min}
          maximumValue={option.max}
          step={option.step}
          value={option.value}
          onValueChange={(value) => onSettingChange(option.key, value)}
          disabled={!option.enabled}
          minimumTrackTintColor="#007AFF"
          maximumTrackTintColor="#e1e5e9"
          thumbStyle={styles.sliderThumb}
        />

        {/* Slider labels */}
        <View style={styles.sliderLabels}>
          <Text style={styles.sliderLabelText}>
            {option.min} {option.unit[culturalPreferences.language] || option.unit.en}
          </Text>
          <Text style={styles.sliderLabelText}>
            {option.max} {option.unit[culturalPreferences.language] || option.unit.en}
          </Text>
        </View>
      </View>
    </View>
  );

  // Show cultural context information
  const renderCulturalContext = () => {
    if (!culturalPreferences.observesPrayerTimes && !culturalPreferences.observesRamadan) {
      return null;
    }

    return (
      <View style={styles.contextContainer}>
        <View style={styles.contextHeader}>
          <Ionicons name="globe-outline" size={20} color="#0066cc" />
          <Text style={styles.contextTitle}>
            {culturalPreferences.language === 'ms'
              ? 'Konteks Budaya'
              : 'Cultural Context'
            }
          </Text>
        </View>

        <View style={styles.contextContent}>
          {culturalPreferences.observesPrayerTimes && (
            <View style={styles.contextItem}>
              <Ionicons name="moon" size={16} color="#0066cc" />
              <Text style={styles.contextText}>
                {culturalPreferences.language === 'ms'
                  ? 'Mengikut waktu solat Malaysia'
                  : 'Following Malaysian prayer times'
                }
              </Text>
            </View>
          )}

          {culturalPreferences.observesRamadan && (
            <View style={styles.contextItem}>
              <Ionicons name="moon-outline" size={16} color="#0066cc" />
              <Text style={styles.contextText}>
                {culturalPreferences.language === 'ms'
                  ? 'Adaptasi khusus bulan Ramadan'
                  : 'Special Ramadan adaptations'
                }
              </Text>
            </View>
          )}

          <View style={styles.contextItem}>
            <Ionicons name="location" size={16} color="#0066cc" />
            <Text style={styles.contextText}>
              {culturalPreferences.language === 'ms'
                ? 'Disesuaikan untuk Malaysia'
                : 'Adapted for Malaysia'
              }
            </Text>
          </View>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {adjustmentOptions.map((option) => (
        <View key={option.key}>
          {option.type === 'switch' && renderSwitch(option)}
          {option.type === 'slider' && renderSlider(option)}
        </View>
      ))}
      
      {renderCulturalContext()}
      
      {/* Help text */}
      <View style={styles.helpContainer}>
        <Ionicons name="help-circle-outline" size={20} color="#666" />
        <Text style={styles.helpText}>
          {culturalPreferences.language === 'ms'
            ? 'Tetapan ini akan membantu menyesuaikan jadual ubat anda dengan amalan budaya dan agama'
            : 'These settings help adjust your medication schedule to cultural and religious practices'
          }
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  adjustmentItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
  },
  disabledItem: {
    opacity: 0.5,
  },
  iconContainer: {
    width: 32,
    alignItems: 'center',
    paddingTop: 2,
  },
  contentContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
  disabledText: {
    color: '#999',
  },
  culturalNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 8,
    padding: 12,
    backgroundColor: '#e6f3ff',
    borderRadius: 8,
  },
  culturalNoteText: {
    flex: 1,
    fontSize: 13,
    color: '#0066cc',
    fontStyle: 'italic',
    lineHeight: 16,
  },
  sliderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sliderValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  slider: {
    width: '100%',
    height: 40,
    marginTop: 8,
  },
  sliderThumb: {
    backgroundColor: '#007AFF',
  },
  sliderLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -8,
  },
  sliderLabelText: {
    fontSize: 12,
    color: '#999',
  },
  contextContainer: {
    backgroundColor: '#f0f8ff',
    borderRadius: 12,
    padding: 16,
  },
  contextHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  contextTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0066cc',
  },
  contextContent: {
    gap: 8,
  },
  contextItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  contextText: {
    fontSize: 14,
    color: '#0066cc',
    lineHeight: 18,
  },
  helpContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 16,
  },
  helpText: {
    flex: 1,
    fontSize: 14,
    color: '#666',
    lineHeight: 18,
  },
});

export default CulturalAdjustments;