/**
 * Cultural Formatter Component
 *
 * Handles cultural-specific formatting for numbers, dates, times, and cultural events
 * with support for Malaysian, Chinese, Tamil, and English formatting preferences.
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useCulturalFormatting, useTranslation } from '../../../i18n';
import type { SupportedLanguage } from '../../../i18n/translations';

export interface CulturalFormatterProps {
  children?: React.ReactNode;
  theme?: 'light' | 'dark';
}

export interface FormattedDateProps {
  date: Date;
  format?: 'short' | 'medium' | 'long' | 'full';
  includeLunar?: boolean;
  culturalContext?: boolean;
  style?: any;
  theme?: 'light' | 'dark';
}

export interface FormattedNumberProps {
  number: number;
  type?: 'decimal' | 'currency' | 'percent' | 'ordinal';
  currency?: 'MYR' | 'USD' | 'CNY' | 'INR';
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  style?: any;
  theme?: 'light' | 'dark';
}

export interface FormattedTimeProps {
  time: Date;
  format?: '12h' | '24h' | 'auto';
  includePrayerContext?: boolean;
  style?: any;
  theme?: 'light' | 'dark';
}

export interface FormattedCulturalEventProps {
  eventName: string;
  eventType: 'islamic' | 'chinese' | 'hindu' | 'malaysian';
  date: Date;
  description?: string;
  compact?: boolean;
  style?: any;
  theme?: 'light' | 'dark';
}

/**
 * Formatted Date Component with Cultural Context
 */
export const FormattedDate: React.FC<FormattedDateProps> = ({
  date,
  format = 'medium',
  includeLunar = false,
  culturalContext = false,
  style,
  theme = 'light'
}) => {
  const { formatCulturalDate, formatLunarDate, currentLanguage } = useCulturalFormatting();
  const { t } = useTranslation();

  const formattedDate = useMemo(() => {
    const baseFormatted = formatCulturalDate(date, format, currentLanguage);
    const lunarInfo = includeLunar ? formatLunarDate(date, currentLanguage) : null;

    return { baseFormatted, lunarInfo };
  }, [date, format, currentLanguage, includeLunar, formatCulturalDate, formatLunarDate]);

  const styles = createDateStyles(theme);

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.primaryDate}>
        {formattedDate.baseFormatted}
      </Text>
      {formattedDate.lunarInfo && (
        <Text style={styles.lunarDate}>
          {formattedDate.lunarInfo}
        </Text>
      )}
      {culturalContext && (
        <Text style={styles.culturalContext}>
          {t('date.cultural_context', {
            weekday: date.toLocaleDateString(getLocaleForLanguage(currentLanguage), { weekday: 'long' })
          })}
        </Text>
      )}
    </View>
  );
};

/**
 * Formatted Number Component with Cultural Preferences
 */
export const FormattedNumber: React.FC<FormattedNumberProps> = ({
  number,
  type = 'decimal',
  currency = 'MYR',
  minimumFractionDigits,
  maximumFractionDigits,
  style,
  theme = 'light'
}) => {
  const { formatNumber, currentLanguage } = useCulturalFormatting();

  const formattedNumber = useMemo(() => {
    return formatNumber(number, {
      type,
      currency,
      minimumFractionDigits,
      maximumFractionDigits,
      locale: getLocaleForLanguage(currentLanguage)
    });
  }, [number, type, currency, minimumFractionDigits, maximumFractionDigits, currentLanguage, formatNumber]);

  const styles = createNumberStyles(theme);

  return (
    <Text style={[styles.number, style]}>
      {formattedNumber}
    </Text>
  );
};

/**
 * Formatted Time Component with Prayer Context
 */
export const FormattedTime: React.FC<FormattedTimeProps> = ({
  time,
  format = 'auto',
  includePrayerContext = false,
  style,
  theme = 'light'
}) => {
  const { formatTime, formatPrayerTime, currentLanguage } = useCulturalFormatting();
  const { t } = useTranslation();

  const formattedTime = useMemo(() => {
    const baseTime = formatTime(time, format, currentLanguage);
    const prayerContext = includePrayerContext ? formatPrayerTime(time, currentLanguage) : null;

    return { baseTime, prayerContext };
  }, [time, format, currentLanguage, includePrayerContext, formatTime, formatPrayerTime]);

  const styles = createTimeStyles(theme);

  return (
    <View style={[styles.container, style]}>
      <Text style={styles.primaryTime}>
        {formattedTime.baseTime}
      </Text>
      {formattedTime.prayerContext && (
        <Text style={styles.prayerContext}>
          {t('time.prayer_context', { context: formattedTime.prayerContext })}
        </Text>
      )}
    </View>
  );
};

/**
 * Formatted Cultural Event Component
 */
export const FormattedCulturalEvent: React.FC<FormattedCulturalEventProps> = ({
  eventName,
  eventType,
  date,
  description,
  compact = false,
  style,
  theme = 'light'
}) => {
  const { formatCulturalEvent, currentLanguage } = useCulturalFormatting();
  const { t } = useTranslation();

  const formattedEvent = useMemo(() => {
    return formatCulturalEvent({
      name: eventName,
      type: eventType,
      date,
      description
    }, currentLanguage, compact);
  }, [eventName, eventType, date, description, currentLanguage, compact, formatCulturalEvent]);

  const styles = createEventStyles(theme);
  const eventColor = getEventTypeColor(eventType);

  if (compact) {
    return (
      <View style={[styles.compactContainer, { borderLeftColor: eventColor }, style]}>
        <Text style={styles.compactName}>{formattedEvent.name}</Text>
        <Text style={styles.compactDate}>{formattedEvent.date}</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { borderLeftColor: eventColor }, style]}>
      <View style={styles.header}>
        <Text style={styles.eventName}>{formattedEvent.name}</Text>
        <Text style={styles.eventType}>{t(`events.type_${eventType}`)}</Text>
      </View>
      <Text style={styles.eventDate}>{formattedEvent.date}</Text>
      {formattedEvent.description && (
        <Text style={styles.eventDescription}>{formattedEvent.description}</Text>
      )}
      {formattedEvent.culturalNotes && (
        <Text style={styles.culturalNotes}>{formattedEvent.culturalNotes}</Text>
      )}
    </View>
  );
};

/**
 * Main Cultural Formatter Provider Component
 */
export const CulturalFormatter: React.FC<CulturalFormatterProps> = ({
  children,
  theme = 'light'
}) => {
  const { currentLanguage, isRTL } = useCulturalFormatting();

  const containerStyle = useMemo(() => ({
    writingDirection: isRTL ? 'rtl' as const : 'ltr' as const,
    textAlign: isRTL ? 'right' as const : 'left' as const,
  }), [isRTL]);

  return (
    <View style={[containerStyle, { flex: 1 }]}>
      {children}
    </View>
  );
};

/**
 * Helper function to get locale for language
 */
const getLocaleForLanguage = (language: SupportedLanguage): string => {
  switch (language) {
    case 'ms': return 'ms-MY';
    case 'en': return 'en-MY';
    case 'zh': return 'zh-CN';
    case 'ta': return 'ta-IN';
    default: return 'en-MY';
  }
};

/**
 * Helper function to get event type color
 */
const getEventTypeColor = (eventType: string): string => {
  switch (eventType) {
    case 'islamic': return '#28A745';
    case 'chinese': return '#DC3545';
    case 'hindu': return '#FD7E14';
    case 'malaysian': return '#007BFF';
    default: return '#6C757D';
  }
};

const createDateStyles = (theme: 'light' | 'dark') => StyleSheet.create({
  container: {
    flexDirection: 'column',
  },
  primaryDate: {
    fontSize: 16,
    fontWeight: '600',
    color: theme === 'dark' ? '#FFFFFF' : '#2C2C2E',
  },
  lunarDate: {
    fontSize: 12,
    color: theme === 'dark' ? '#8E8E93' : '#8E8E93',
    marginTop: 2,
    fontStyle: 'italic',
  },
  culturalContext: {
    fontSize: 11,
    color: theme === 'dark' ? '#8E8E93' : '#8E8E93',
    marginTop: 4,
  },
});

const createNumberStyles = (theme: 'light' | 'dark') => StyleSheet.create({
  number: {
    fontSize: 16,
    fontWeight: '500',
    color: theme === 'dark' ? '#FFFFFF' : '#2C2C2E',
  },
});

const createTimeStyles = (theme: 'light' | 'dark') => StyleSheet.create({
  container: {
    flexDirection: 'column',
  },
  primaryTime: {
    fontSize: 16,
    fontWeight: '600',
    color: theme === 'dark' ? '#FFFFFF' : '#2C2C2E',
  },
  prayerContext: {
    fontSize: 12,
    color: '#28A745',
    marginTop: 2,
  },
});

const createEventStyles = (theme: 'light' | 'dark') => StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: theme === 'dark' ? '#2C2C2E' : '#FFFFFF',
    borderLeftWidth: 4,
    borderRadius: 8,
    marginVertical: 4,
  },
  compactContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: theme === 'dark' ? '#2C2C2E' : '#FFFFFF',
    borderLeftWidth: 3,
    borderRadius: 6,
    marginVertical: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  eventName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: theme === 'dark' ? '#FFFFFF' : '#2C2C2E',
    flex: 1,
  },
  eventType: {
    fontSize: 12,
    color: theme === 'dark' ? '#8E8E93' : '#8E8E93',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  eventDate: {
    fontSize: 14,
    color: theme === 'dark' ? '#FFFFFF' : '#2C2C2E',
    marginBottom: 8,
  },
  eventDescription: {
    fontSize: 14,
    color: theme === 'dark' ? '#8E8E93' : '#8E8E93',
    lineHeight: 20,
    marginBottom: 8,
  },
  culturalNotes: {
    fontSize: 12,
    color: '#007BFF',
    fontStyle: 'italic',
  },
  compactName: {
    fontSize: 14,
    fontWeight: '600',
    color: theme === 'dark' ? '#FFFFFF' : '#2C2C2E',
    flex: 1,
  },
  compactDate: {
    fontSize: 12,
    color: theme === 'dark' ? '#8E8E93' : '#8E8E93',
  },
});

export default CulturalFormatter;