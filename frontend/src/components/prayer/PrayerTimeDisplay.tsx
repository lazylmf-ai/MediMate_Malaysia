/**
 * Prayer Time Display Component
 * 
 * Shows current prayer times with:
 * - Real-time prayer time display
 * - Next prayer countdown
 * - Prayer time adjustments
 * - Cultural formatting
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { usePrayerTimes } from '../../hooks/prayer';
import { useAppSelector } from '../../store/hooks';
import { selectCulturalPreferences } from '../../store/slices/culturalSlice';

interface PrayerTimeDisplayProps {
  style?: any;
  showNextPrayer?: boolean;
  onPrayerPress?: (prayerName: string, time: Date) => void;
  compact?: boolean;
}

const PrayerTimeDisplay: React.FC<PrayerTimeDisplayProps> = ({
  style,
  showNextPrayer = true,
  onPrayerPress,
  compact = false
}) => {
  const culturalPreferences = useAppSelector(selectCulturalPreferences);
  const {
    prayerTimes,
    nextPrayer,
    currentPrayer,
    isLoading,
    error,
    refreshPrayerTimes
  } = usePrayerTimes({
    autoUpdate: true,
    madhab: culturalPreferences?.prayerTimes?.madhab || 'shafi'
  });

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-MY', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const formatPrayerName = (prayerName: string): string => {
    const names: Record<string, string> = {
      fajr: culturalPreferences?.language === 'ms' ? 'Subuh' : 'Fajr',
      dhuhr: culturalPreferences?.language === 'ms' ? 'Zohor' : 'Dhuhr',
      asr: culturalPreferences?.language === 'ms' ? 'Asar' : 'Asr',
      maghrib: culturalPreferences?.language === 'ms' ? 'Maghrib' : 'Maghrib',
      isha: culturalPreferences?.language === 'ms' ? 'Isyak' : 'Isha'
    };
    return names[prayerName] || prayerName;
  };

  const getTimeUntilText = (minutes: number): string => {
    if (culturalPreferences?.language === 'ms') {
      if (minutes < 60) {
        return `${minutes} minit lagi`;
      } else {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours} jam ${mins} minit lagi` : `${hours} jam lagi`;
      }
    } else {
      if (minutes < 60) {
        return `in ${minutes} min`;
      } else {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `in ${hours}h ${mins}m` : `in ${hours}h`;
      }
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, style]}>
        <Text style={styles.loadingText}>
          {culturalPreferences?.language === 'ms' ? 'Mengira waktu solat...' : 'Loading prayer times...'}
        </Text>
      </View>
    );
  }

  if (error || !prayerTimes) {
    return (
      <View style={[styles.container, style]}>
        <Text style={styles.errorText}>
          {culturalPreferences?.language === 'ms' 
            ? 'Tidak dapat mengira waktu solat' 
            : 'Unable to calculate prayer times'}
        </Text>
        <TouchableOpacity onPress={refreshPrayerTimes} style={styles.retryButton}>
          <Text style={styles.retryText}>
            {culturalPreferences?.language === 'ms' ? 'Cuba lagi' : 'Retry'}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  const prayers = [
    { name: 'fajr', time: prayerTimes.fajr },
    { name: 'dhuhr', time: prayerTimes.dhuhr },
    { name: 'asr', time: prayerTimes.asr },
    { name: 'maghrib', time: prayerTimes.maghrib },
    { name: 'isha', time: prayerTimes.isha }
  ];

  if (compact) {
    return (
      <View style={[styles.container, styles.compactContainer, style]}>
        {showNextPrayer && nextPrayer && (
          <View style={styles.nextPrayerCompact}>
            <Text style={styles.nextPrayerLabel}>
              {culturalPreferences?.language === 'ms' ? 'Seterusnya:' : 'Next:'}
            </Text>
            <Text style={styles.nextPrayerName}>
              {formatPrayerName(nextPrayer.name)}
            </Text>
            <Text style={styles.nextPrayerTime}>
              {formatTime(nextPrayer.time)}
            </Text>
            <Text style={styles.nextPrayerCountdown}>
              {getTimeUntilText(nextPrayer.minutesUntil)}
            </Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.title}>
        {culturalPreferences?.language === 'ms' ? 'Waktu Solat' : 'Prayer Times'}
      </Text>
      
      {showNextPrayer && nextPrayer && (
        <View style={styles.nextPrayerSection}>
          <Text style={styles.nextPrayerLabel}>
            {culturalPreferences?.language === 'ms' ? 'Solat Seterusnya' : 'Next Prayer'}
          </Text>
          <View style={styles.nextPrayerInfo}>
            <Text style={styles.nextPrayerName}>
              {formatPrayerName(nextPrayer.name)}
            </Text>
            <Text style={styles.nextPrayerTime}>
              {formatTime(nextPrayer.time)}
            </Text>
          </View>
          <Text style={styles.nextPrayerCountdown}>
            {getTimeUntilText(nextPrayer.minutesUntil)}
          </Text>
        </View>
      )}

      <View style={styles.prayerTimesGrid}>
        {prayers.map((prayer) => {
          const isCurrentPrayer = currentPrayer?.name === prayer.name;
          const isPastPrayer = prayer.time < new Date();
          
          return (
            <TouchableOpacity
              key={prayer.name}
              style={[
                styles.prayerTimeItem,
                isCurrentPrayer && styles.currentPrayerItem,
                isPastPrayer && styles.pastPrayerItem
              ]}
              onPress={() => onPrayerPress?.(prayer.name, prayer.time)}
              disabled={!onPrayerPress}
            >
              <Text style={[
                styles.prayerName,
                isCurrentPrayer && styles.currentPrayerText,
                isPastPrayer && styles.pastPrayerText
              ]}>
                {formatPrayerName(prayer.name)}
              </Text>
              <Text style={[
                styles.prayerTime,
                isCurrentPrayer && styles.currentPrayerText,
                isPastPrayer && styles.pastPrayerText
              ]}>
                {formatTime(prayer.time)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {culturalPreferences?.prayerTimes?.madhab && (
        <Text style={styles.madhabText}>
          {culturalPreferences?.language === 'ms' 
            ? `Mazhab: ${culturalPreferences.prayerTimes.madhab === 'shafi' ? 'Syafi\'i' : 'Hanafi'}`
            : `Madhab: ${culturalPreferences.prayerTimes.madhab === 'shafi' ? 'Shafi\'i' : 'Hanafi'}`}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    margin: 8
  },
  compactContainer: {
    padding: 12,
    margin: 4
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2d3436',
    textAlign: 'center',
    marginBottom: 16
  },
  nextPrayerSection: {
    backgroundColor: '#00b894',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    alignItems: 'center'
  },
  nextPrayerCompact: {
    alignItems: 'center'
  },
  nextPrayerLabel: {
    fontSize: 12,
    color: '#636e72',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4
  },
  nextPrayerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 4
  },
  nextPrayerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff'
  },
  nextPrayerTime: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff'
  },
  nextPrayerCountdown: {
    fontSize: 14,
    color: '#ffffff',
    opacity: 0.9
  },
  prayerTimesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between'
  },
  prayerTimeItem: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    width: '48%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef'
  },
  currentPrayerItem: {
    backgroundColor: '#00b894',
    borderColor: '#00a085'
  },
  pastPrayerItem: {
    backgroundColor: '#f1f3f4',
    borderColor: '#e9ecef'
  },
  prayerName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2d3436',
    marginBottom: 4
  },
  prayerTime: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#636e72'
  },
  currentPrayerText: {
    color: '#ffffff'
  },
  pastPrayerText: {
    color: '#95a5a6'
  },
  madhabText: {
    fontSize: 12,
    color: '#636e72',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic'
  },
  loadingText: {
    textAlign: 'center',
    color: '#636e72',
    fontSize: 16
  },
  errorText: {
    textAlign: 'center',
    color: '#e17055',
    fontSize: 14,
    marginBottom: 8
  },
  retryButton: {
    backgroundColor: '#00b894',
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignSelf: 'center'
  },
  retryText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600'
  }
});

export default PrayerTimeDisplay;