/**
 * Language Switcher Component
 * 
 * Dynamic language switching component with large buttons for elderly users,
 * cultural context awareness, and seamless app-wide language changes.
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Modal,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useTranslation, useLanguageSwitcher } from '@/i18n/hooks/useTranslation';
import { useAppSelector } from '@/store/hooks';
import type { SupportedLanguage } from '@/i18n/translations';

interface LanguageSwitcherProps {
  style?: any;
  showCurrentLanguage?: boolean;
  largeButtons?: boolean;
  modalMode?: boolean;
  onLanguageChanged?: (language: SupportedLanguage) => void;
  elderlyFriendly?: boolean;
}

const { width, height } = Dimensions.get('window');

export function LanguageSwitcher({
  style,
  showCurrentLanguage = true,
  largeButtons = false,
  modalMode = false,
  onLanguageChanged,
  elderlyFriendly = false,
}: LanguageSwitcherProps) {
  const { t } = useTranslation();
  const { currentLanguage, availableLanguages, switchLanguage, isChanging } = useLanguageSwitcher();
  const culturalProfile = useAppSelector(state => state.cultural.profile);
  
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage | null>(null);

  // Determine if we should use elderly-friendly settings
  const isElderlyMode = elderlyFriendly || culturalProfile?.accessibility?.elderlyOptimizations?.largeButtons;
  const isLargeButtons = largeButtons || isElderlyMode;

  const handleLanguageSelect = useCallback(async (language: SupportedLanguage) => {
    if (language === currentLanguage) {
      if (modalMode) setModalVisible(false);
      return;
    }

    setSelectedLanguage(language);

    try {
      await switchLanguage(language);
      
      // Show success message in the new language
      const successMessage = t('cultural.languages.languageChanged', {
        variables: { language: availableLanguages.find(l => l.code === language)?.nativeName || language }
      });

      if (isElderlyMode) {
        // Use simple alert for elderly users
        Alert.alert(t('success.settingsSaved'), successMessage);
      }

      onLanguageChanged?.(language);
      
      if (modalMode) {
        setModalVisible(false);
      }
    } catch (error) {
      Alert.alert(
        t('errors.unknown'),
        error instanceof Error ? error.message : t('errors.unknown')
      );
    } finally {
      setSelectedLanguage(null);
    }
  }, [currentLanguage, switchLanguage, t, availableLanguages, onLanguageChanged, modalMode, isElderlyMode]);

  const renderLanguageButton = useCallback((language: typeof availableLanguages[0]) => {
    const isSelected = language.code === currentLanguage;
    const isProcessing = selectedLanguage === language.code && isChanging;
    
    const buttonStyle = [
      styles.languageButton,
      isLargeButtons && styles.languageButtonLarge,
      isElderlyMode && styles.languageButtonElderly,
      isSelected && styles.selectedLanguageButton,
      isElderlyMode && isSelected && styles.selectedLanguageButtonElderly,
    ];

    const textStyle = [
      styles.languageText,
      isLargeButtons && styles.languageTextLarge,
      isElderlyMode && styles.languageTextElderly,
      isSelected && styles.selectedLanguageText,
    ];

    return (
      <TouchableOpacity
        key={language.code}
        style={buttonStyle}
        onPress={() => handleLanguageSelect(language.code)}
        disabled={isProcessing}
        activeOpacity={0.7}
      >
        <View style={styles.languageButtonContent}>
          <Text style={textStyle}>
            {language.nativeName}
          </Text>
          <Text style={[styles.languageSubtext, isLargeButtons && styles.languageSubtextLarge]}>
            {language.name}
          </Text>
          {isSelected && showCurrentLanguage && (
            <Text style={styles.currentIndicator}>
              {t('cultural.languages.currentLanguage', { variables: { language: '' } }).replace(': ', '')}
            </Text>
          )}
        </View>
        {isProcessing && (
          <ActivityIndicator 
            size={isLargeButtons ? "large" : "small"} 
            color="#007AFF" 
            style={styles.loadingIndicator}
          />
        )}
      </TouchableOpacity>
    );
  }, [currentLanguage, selectedLanguage, isChanging, isLargeButtons, isElderlyMode, showCurrentLanguage, handleLanguageSelect, t]);

  const renderInlineLanguageSwitcher = () => (
    <View style={[styles.container, style]}>
      <Text style={[styles.title, isLargeButtons && styles.titleLarge, isElderlyMode && styles.titleElderly]}>
        {t('cultural.languages.changeLanguage')}
      </Text>
      <ScrollView 
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {availableLanguages.map(renderLanguageButton)}
      </ScrollView>
    </View>
  );

  const renderModalLanguageSwitcher = () => (
    <Modal
      animationType="slide"
      transparent={true}
      visible={modalVisible}
      onRequestClose={() => setModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={[
          styles.modalContainer, 
          isElderlyMode && styles.modalContainerElderly
        ]}>
          <View style={styles.modalHeader}>
            <Text style={[
              styles.modalTitle,
              isElderlyMode && styles.modalTitleElderly
            ]}>
              {t('cultural.languages.changeLanguage')}
            </Text>
            <TouchableOpacity
              style={[styles.closeButton, isElderlyMode && styles.closeButtonElderly]}
              onPress={() => setModalVisible(false)}
            >
              <Text style={[styles.closeButtonText, isElderlyMode && styles.closeButtonTextElderly]}>
                {t('app.close')}
              </Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView 
            style={styles.modalScrollView}
            showsVerticalScrollIndicator={false}
          >
            {availableLanguages.map(renderLanguageButton)}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  if (modalMode) {
    return (
      <>
        <TouchableOpacity
          style={[styles.triggerButton, isLargeButtons && styles.triggerButtonLarge, style]}
          onPress={() => setModalVisible(true)}
          disabled={isChanging}
        >
          <Text style={[styles.triggerButtonText, isLargeButtons && styles.triggerButtonTextLarge]}>
            {availableLanguages.find(l => l.code === currentLanguage)?.nativeName || currentLanguage.toUpperCase()}
          </Text>
          {isChanging && (
            <ActivityIndicator size="small" color="#007AFF" style={styles.triggerLoadingIndicator} />
          )}
        </TouchableOpacity>
        {renderModalLanguageSwitcher()}
      </>
    );
  }

  return renderInlineLanguageSwitcher();
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
    color: '#333',
  },
  titleLarge: {
    fontSize: 22,
  },
  titleElderly: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#000',
  },
  scrollView: {
    maxHeight: height * 0.6,
  },
  scrollContent: {
    paddingBottom: 16,
  },
  languageButton: {
    backgroundColor: '#f8f8f8',
    borderRadius: 12,
    padding: 16,
    marginVertical: 6,
    borderWidth: 2,
    borderColor: 'transparent',
    minHeight: 70,
    justifyContent: 'center',
  },
  languageButtonLarge: {
    padding: 20,
    minHeight: 90,
    borderRadius: 16,
  },
  languageButtonElderly: {
    padding: 24,
    minHeight: 110,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedLanguageButton: {
    backgroundColor: '#007AFF',
    borderColor: '#0056CC',
  },
  selectedLanguageButtonElderly: {
    backgroundColor: '#4A90E2',
    shadowOpacity: 0.2,
  },
  languageButtonContent: {
    alignItems: 'center',
  },
  languageText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  languageTextLarge: {
    fontSize: 18,
  },
  languageTextElderly: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#000',
  },
  selectedLanguageText: {
    color: '#fff',
  },
  languageSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  languageSubtextLarge: {
    fontSize: 16,
  },
  currentIndicator: {
    fontSize: 12,
    color: '#fff',
    marginTop: 4,
    fontWeight: '500',
  },
  loadingIndicator: {
    position: 'absolute',
    right: 16,
    top: '50%',
    marginTop: -10,
  },
  
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 20,
    maxHeight: height * 0.8,
    width: '100%',
    maxWidth: 400,
  },
  modalContainerElderly: {
    borderRadius: 25,
    maxHeight: height * 0.85,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333',
  },
  modalTitleElderly: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  closeButton: {
    padding: 8,
  },
  closeButtonElderly: {
    padding: 12,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  closeButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  closeButtonTextElderly: {
    fontSize: 18,
    color: '#333',
    fontWeight: 'bold',
  },
  modalScrollView: {
    maxHeight: height * 0.6,
    padding: 20,
  },
  
  // Trigger button styles
  triggerButton: {
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#ddd',
  },
  triggerButtonLarge: {
    padding: 16,
    borderRadius: 12,
  },
  triggerButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  triggerButtonTextLarge: {
    fontSize: 18,
  },
  triggerLoadingIndicator: {
    marginLeft: 8,
  },
});

export default LanguageSwitcher;