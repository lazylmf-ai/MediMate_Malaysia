/**
 * Language Tab Bar Component
 *
 * Allows switching between the 4 supported languages (ms, en, zh, ta)
 * with visual indicators for translation status.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet
} from 'react-native';

export type Language = 'ms' | 'en' | 'zh' | 'ta';

export type TranslationStatus = 'missing' | 'draft' | 'review' | 'approved';

interface TranslationStatusMap {
  ms: TranslationStatus;
  en: TranslationStatus;
  zh: TranslationStatus;
  ta: TranslationStatus;
}

interface LanguageTabBarProps {
  currentLanguage: Language;
  onLanguageChange: (language: Language) => void;
  translationStatus?: TranslationStatusMap;
  showStatus?: boolean;
}

const LANGUAGE_LABELS: Record<Language, string> = {
  ms: 'Malay',
  en: 'English',
  zh: 'Chinese',
  ta: 'Tamil'
};

const STATUS_COLORS: Record<TranslationStatus, string> = {
  missing: '#FF3B30',
  draft: '#FF9500',
  review: '#FFCC00',
  approved: '#34C759'
};

export const LanguageTabBar: React.FC<LanguageTabBarProps> = ({
  currentLanguage,
  onLanguageChange,
  translationStatus,
  showStatus = true
}) => {
  const languages: Language[] = ['ms', 'en', 'zh', 'ta'];

  const getStatusColor = (lang: Language): string => {
    if (!translationStatus || !showStatus) {
      return '#666';
    }
    return STATUS_COLORS[translationStatus[lang]];
  };

  const getStatusLabel = (lang: Language): string => {
    if (!translationStatus || !showStatus) {
      return '';
    }
    const status = translationStatus[lang];
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  return (
    <View style={styles.container}>
      {languages.map((lang) => {
        const isActive = lang === currentLanguage;
        const statusColor = getStatusColor(lang);

        return (
          <TouchableOpacity
            key={lang}
            style={[
              styles.tab,
              isActive && styles.tabActive
            ]}
            onPress={() => onLanguageChange(lang)}
            activeOpacity={0.7}
          >
            {/* Status indicator dot */}
            {showStatus && translationStatus && (
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: statusColor }
                ]}
              />
            )}

            {/* Language label */}
            <Text
              style={[
                styles.tabText,
                isActive && styles.tabTextActive
              ]}
            >
              {LANGUAGE_LABELS[lang]}
            </Text>

            {/* Status label */}
            {showStatus && translationStatus && (
              <Text
                style={[
                  styles.statusText,
                  isActive && styles.statusTextActive
                ]}
              >
                {getStatusLabel(lang)}
              </Text>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 4,
    marginVertical: 12
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginHorizontal: 2,
    position: 'relative'
  },
  tabActive: {
    backgroundColor: '#007AFF',
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center'
  },
  tabTextActive: {
    color: '#fff'
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6
  },
  statusText: {
    fontSize: 10,
    color: '#666',
    marginLeft: 4,
    position: 'absolute',
    bottom: 2,
    right: 4
  },
  statusTextActive: {
    color: '#fff',
    opacity: 0.8
  }
});
