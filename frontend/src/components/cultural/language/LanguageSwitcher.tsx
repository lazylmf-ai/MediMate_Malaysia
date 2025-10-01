/**
 * Language Switcher Component
 *
 * Multi-language interface component for switching between Malay, English,
 * Chinese (Simplified), and Tamil languages with cultural context awareness.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation, useLanguageSwitcher } from '../../../i18n';
import type { SupportedLanguage } from '../../../i18n/translations';

export interface LanguageSwitcherProps {
  onLanguageChange?: (language: SupportedLanguage) => void;
  showModal?: boolean;
  compact?: boolean;
  theme?: 'light' | 'dark';
}

interface LanguageOption {
  code: SupportedLanguage;
  name: string;
  nativeName: string;
  flag: string;
  rtl: boolean;
  description: string;
}

const LANGUAGE_OPTIONS: LanguageOption[] = [
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇬🇧',
    rtl: false,
    description: 'English (International)'
  },
  {
    code: 'ms',
    name: 'Malay',
    nativeName: 'Bahasa Melayu',
    flag: '🇲🇾',
    rtl: false,
    description: 'Bahasa Malaysia'
  },
  {
    code: 'zh',
    name: 'Chinese',
    nativeName: '中文',
    flag: '🇨🇳',
    rtl: false,
    description: '中文 (简体)'
  },
  {
    code: 'ta',
    name: 'Tamil',
    nativeName: 'தமிழ்',
    flag: '🇮🇳',
    rtl: false,
    description: 'தமிழ்'
  }
];

export const LanguageSwitcher: React.FC<LanguageSwitcherProps> = ({
  onLanguageChange,
  showModal = false,
  compact = false,
  theme = 'light'
}) => {
  const { t, currentLanguage } = useTranslation();
  const {
    isChanging,
    error,
    changeLanguage,
    preloadLanguage,
    getLanguageProgress
  } = useLanguageSwitcher();

  const [modalVisible, setModalVisible] = useState(showModal);
  const [loadingLanguage, setLoadingLanguage] = useState<SupportedLanguage | null>(null);

  const styles = createStyles(theme);

  const currentLanguageOption = LANGUAGE_OPTIONS.find(lang => lang.code === currentLanguage);

  /**
   * Handle language selection
   */
  const handleLanguageSelect = useCallback(async (language: SupportedLanguage) => {
    if (language === currentLanguage) {
      setModalVisible(false);
      return;
    }

    try {
      setLoadingLanguage(language);

      // Show confirmation for language change
      const languageOption = LANGUAGE_OPTIONS.find(lang => lang.code === language);
      if (!languageOption) return;

      Alert.alert(
        t('language.change_title'),
        t('language.change_confirmation', {
          language: languageOption.name,
          nativeName: languageOption.nativeName
        }),
        [
          {
            text: t('common.cancel'),
            style: 'cancel',
            onPress: () => setLoadingLanguage(null)
          },
          {
            text: t('common.change'),
            onPress: async () => {
              try {
                await changeLanguage(language);
                onLanguageChange?.(language);
                setModalVisible(false);

                // Show success message in new language
                setTimeout(() => {
                  Alert.alert(
                    t('language.changed_title'),
                    t('language.changed_message', {
                      language: languageOption.name
                    })
                  );
                }, 500);
              } catch (err) {
                console.error('Failed to change language:', err);
                Alert.alert(
                  t('language.error_title'),
                  t('language.error_message')
                );
              } finally {
                setLoadingLanguage(null);
              }
            }
          }
        ]
      );
    } catch (err) {
      console.error('Error in language selection:', err);
      setLoadingLanguage(null);
    }
  }, [currentLanguage, changeLanguage, onLanguageChange, t]);

  /**
   * Handle preload language on focus
   */
  const handleLanguagePreload = useCallback(async (language: SupportedLanguage) => {
    if (language !== currentLanguage) {
      try {
        await preloadLanguage(language);
      } catch (err) {
        console.error('Failed to preload language:', err);
      }
    }
  }, [currentLanguage, preloadLanguage]);

  /**
   * Render compact version (just the current language button)
   */
  if (compact) {
    return (
      <TouchableOpacity
        style={styles.compactButton}
        onPress={() => setModalVisible(true)}
        disabled={isChanging}
      >
        <Text style={styles.compactFlag}>{currentLanguageOption?.flag}</Text>
        <Text style={styles.compactCode}>{currentLanguage.toUpperCase()}</Text>
        {isChanging && (
          <ActivityIndicator size="small" color={theme === 'dark' ? '#FFFFFF' : '#2C2C2E'} style={styles.compactLoader} />
        )}
        <Ionicons name="chevron-down" size={12} color={theme === 'dark' ? '#8E8E93' : '#8E8E93'} />
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.container}>
      {/* Current Language Display */}
      <TouchableOpacity
        style={styles.currentLanguageButton}
        onPress={() => setModalVisible(true)}
        disabled={isChanging}
      >
        <View style={styles.languageInfo}>
          <Text style={styles.languageFlag}>{currentLanguageOption?.flag}</Text>
          <View style={styles.languageText}>
            <Text style={styles.languageName}>{currentLanguageOption?.name}</Text>
            <Text style={styles.languageNative}>{currentLanguageOption?.nativeName}</Text>
          </View>
        </View>
        <View style={styles.languageAction}>
          {isChanging ? (
            <ActivityIndicator size="small" color="#007BFF" />
          ) : (
            <Ionicons name="language" size={24} color="#007BFF" />
          )}
        </View>
      </TouchableOpacity>

      {/* Error Display */}
      {error && (
        <View style={styles.errorContainer}>
          <Ionicons name="warning" size={16} color="#DC3545" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Language Selection Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="formSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t('language.select_title')}</Text>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Ionicons name="close" size={24} color={theme === 'dark' ? '#FFFFFF' : '#2C2C2E'} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalDescription}>
              {t('language.select_description')}
            </Text>

            {LANGUAGE_OPTIONS.map((language) => {
              const isSelected = language.code === currentLanguage;
              const isLoading = loadingLanguage === language.code;
              const progress = getLanguageProgress(language.code);

              return (
                <TouchableOpacity
                  key={language.code}
                  style={[
                    styles.languageOption,
                    isSelected && styles.selectedLanguageOption
                  ]}
                  onPress={() => handleLanguageSelect(language.code)}
                  onPressIn={() => handleLanguagePreload(language.code)}
                  disabled={isLoading || isChanging}
                >
                  <View style={styles.languageOptionContent}>
                    <Text style={styles.optionFlag}>{language.flag}</Text>
                    <View style={styles.optionText}>
                      <Text style={[
                        styles.optionName,
                        isSelected && styles.selectedOptionText
                      ]}>
                        {language.name}
                      </Text>
                      <Text style={[
                        styles.optionNative,
                        isSelected && styles.selectedOptionSubtext
                      ]}>
                        {language.nativeName}
                      </Text>
                      <Text style={styles.optionDescription}>
                        {language.description}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.optionStatus}>
                    {isLoading ? (
                      <ActivityIndicator size="small" color="#007BFF" />
                    ) : isSelected ? (
                      <Ionicons name="checkmark-circle" size={24} color="#28A745" />
                    ) : progress > 0 ? (
                      <View style={styles.progressContainer}>
                        <View style={[styles.progressBar, { width: `${progress}%` }]} />
                      </View>
                    ) : (
                      <Ionicons name="chevron-forward" size={20} color="#8E8E93" />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}

            {/* Cultural Context Note */}
            <View style={styles.contextNote}>
              <Ionicons name="information-circle" size={16} color="#007BFF" />
              <Text style={styles.contextText}>
                {t('language.cultural_context_note')}
              </Text>
            </View>

            {/* Language Support Info */}
            <View style={styles.supportInfo}>
              <Text style={styles.supportTitle}>{t('language.support_title')}</Text>
              <Text style={styles.supportText}>
                • {t('language.support_medical_terms')}
              </Text>
              <Text style={styles.supportText}>
                • {t('language.support_cultural_events')}
              </Text>
              <Text style={styles.supportText}>
                • {t('language.support_prayer_times')}
              </Text>
              <Text style={styles.supportText}>
                • {t('language.support_family_features')}
              </Text>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
};

const createStyles = (theme: 'light' | 'dark') => StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  compactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme === 'dark' ? '#2C2C2E' : '#F2F2F7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 80,
  },
  compactFlag: {
    fontSize: 16,
    marginRight: 4,
  },
  compactCode: {
    fontSize: 12,
    fontWeight: '600',
    color: theme === 'dark' ? '#FFFFFF' : '#2C2C2E',
    marginRight: 4,
  },
  compactLoader: {
    marginRight: 4,
  },
  currentLanguageButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme === 'dark' ? '#2C2C2E' : '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  languageInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  languageFlag: {
    fontSize: 24,
    marginRight: 12,
  },
  languageText: {
    flex: 1,
  },
  languageName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme === 'dark' ? '#FFFFFF' : '#2C2C2E',
  },
  languageNative: {
    fontSize: 14,
    color: theme === 'dark' ? '#8E8E93' : '#8E8E93',
    marginTop: 2,
  },
  languageAction: {
    marginLeft: 16,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  errorText: {
    fontSize: 14,
    color: '#DC3545',
    marginLeft: 8,
    flex: 1,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: theme === 'dark' ? '#1C1C1E' : '#F2F2F7',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: theme === 'dark' ? '#2C2C2E' : '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: theme === 'dark' ? '#3C3C3E' : '#E5E5EA',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme === 'dark' ? '#FFFFFF' : '#2C2C2E',
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  modalDescription: {
    fontSize: 14,
    color: theme === 'dark' ? '#8E8E93' : '#8E8E93',
    marginBottom: 24,
    lineHeight: 20,
  },
  languageOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme === 'dark' ? '#2C2C2E' : '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  selectedLanguageOption: {
    borderWidth: 2,
    borderColor: '#28A745',
    backgroundColor: theme === 'dark' ? '#1E2A1E' : '#F0F9F0',
  },
  languageOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionFlag: {
    fontSize: 28,
    marginRight: 16,
  },
  optionText: {
    flex: 1,
  },
  optionName: {
    fontSize: 16,
    fontWeight: '600',
    color: theme === 'dark' ? '#FFFFFF' : '#2C2C2E',
  },
  optionNative: {
    fontSize: 14,
    color: theme === 'dark' ? '#8E8E93' : '#8E8E93',
    marginTop: 2,
  },
  optionDescription: {
    fontSize: 12,
    color: theme === 'dark' ? '#8E8E93' : '#8E8E93',
    marginTop: 4,
  },
  selectedOptionText: {
    color: '#28A745',
  },
  selectedOptionSubtext: {
    color: '#28A745',
    opacity: 0.8,
  },
  optionStatus: {
    marginLeft: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressContainer: {
    width: 24,
    height: 4,
    backgroundColor: theme === 'dark' ? '#3C3C3E' : '#E5E5EA',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#007BFF',
  },
  contextNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#E3F2FD',
    padding: 16,
    borderRadius: 12,
    marginTop: 24,
    marginBottom: 16,
  },
  contextText: {
    fontSize: 14,
    color: '#1976D2',
    marginLeft: 12,
    lineHeight: 20,
    flex: 1,
  },
  supportInfo: {
    backgroundColor: theme === 'dark' ? '#2C2C2E' : '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  supportTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme === 'dark' ? '#FFFFFF' : '#2C2C2E',
    marginBottom: 12,
  },
  supportText: {
    fontSize: 14,
    color: theme === 'dark' ? '#8E8E93' : '#8E8E93',
    marginBottom: 8,
    lineHeight: 18,
  },
});

export default LanguageSwitcher;