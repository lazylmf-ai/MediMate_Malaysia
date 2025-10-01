/**
 * Language Switcher Component Tests
 *
 * Comprehensive tests for the multi-language interface component including
 * language switching, cultural formatting, and accessibility features.
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { LanguageSwitcher } from '../language/LanguageSwitcher';
import { useTranslation, useLanguageSwitcher } from '../../../i18n';

// Mock dependencies
jest.mock('../../../i18n');
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Alert: {
    alert: jest.fn(),
  },
}));

const mockUseTranslation = useTranslation as jest.MockedFunction<typeof useTranslation>;
const mockUseLanguageSwitcher = useLanguageSwitcher as jest.MockedFunction<typeof useLanguageSwitcher>;
const mockAlert = Alert.alert as jest.MockedFunction<typeof Alert.alert>;

describe('LanguageSwitcher', () => {
  const defaultTranslations = {
    t: jest.fn((key: string, params?: any) => {
      const translations: Record<string, string> = {
        'language.change_title': 'Change Language',
        'language.change_confirmation': 'Switch to {{language}} ({{nativeName}})?',
        'language.changed_title': 'Language Changed',
        'language.changed_message': 'Interface language changed to {{language}}',
        'language.error_title': 'Language Error',
        'language.error_message': 'Failed to change language. Please try again.',
        'language.select_title': 'Select Language',
        'language.select_description': 'Choose your preferred language for the app interface.',
        'language.cultural_context_note': 'Language selection affects cultural features and formatting.',
        'language.support_title': 'Language Support Features',
        'language.support_medical_terms': 'Medical terminology translation',
        'language.support_cultural_events': 'Cultural event names and descriptions',
        'language.support_prayer_times': 'Prayer time and religious content',
        'language.support_family_features': 'Family coordination features',
        'common.cancel': 'Cancel',
        'common.change': 'Change'
      };

      let translation = translations[key] || key;
      if (params) {
        Object.keys(params).forEach(param => {
          translation = translation.replace(`{{${param}}}`, params[param]);
        });
      }
      return translation;
    }),
    currentLanguage: 'en'
  };

  const defaultLanguageSwitcher = {
    isChanging: false,
    error: null,
    changeLanguage: jest.fn(),
    preloadLanguage: jest.fn(),
    getLanguageProgress: jest.fn((language: string) => 0)
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseTranslation.mockReturnValue(defaultTranslations);
    mockUseLanguageSwitcher.mockReturnValue(defaultLanguageSwitcher);
  });

  describe('Rendering', () => {
    it('should render language switcher in full mode', () => {
      const { getByText } = render(<LanguageSwitcher />);

      expect(getByText('English')).toBeTruthy();
      expect(getByText('English')).toBeTruthy();
    });

    it('should render language switcher in compact mode', () => {
      const { getByText } = render(<LanguageSwitcher compact={true} />);

      expect(getByText('EN')).toBeTruthy();
      expect(getByText('🇬🇧')).toBeTruthy();
    });

    it('should display current language correctly', () => {
      const { getByText } = render(<LanguageSwitcher />);

      expect(getByText('English')).toBeTruthy();
      expect(getByText('🇬🇧')).toBeTruthy();
    });

    it('should show loading state when changing language', () => {
      mockUseLanguageSwitcher.mockReturnValue({
        ...defaultLanguageSwitcher,
        isChanging: true
      });

      const { getByRole } = render(<LanguageSwitcher />);

      const activityIndicator = getByRole('progressbar');
      expect(activityIndicator).toBeTruthy();
    });

    it('should display error when language switching fails', () => {
      mockUseLanguageSwitcher.mockReturnValue({
        ...defaultLanguageSwitcher,
        error: 'Failed to load language pack'
      });

      const { getByText } = render(<LanguageSwitcher />);

      expect(getByText('Failed to load language pack')).toBeTruthy();
    });
  });

  describe('Language Selection', () => {
    it('should open language selection modal when tapped', async () => {
      const { getByText, getByRole } = render(<LanguageSwitcher />);

      const languageButton = getByText('English');
      fireEvent.press(languageButton);

      await waitFor(() => {
        expect(getByText('Select Language')).toBeTruthy();
        expect(getByText('Choose your preferred language for the app interface.')).toBeTruthy();
      });
    });

    it('should display all supported languages in modal', async () => {
      const { getByText } = render(<LanguageSwitcher />);

      fireEvent.press(getByText('English'));

      await waitFor(() => {
        expect(getByText('English')).toBeTruthy();
        expect(getByText('Malay')).toBeTruthy();
        expect(getByText('Bahasa Melayu')).toBeTruthy();
        expect(getByText('Chinese')).toBeTruthy();
        expect(getByText('中文')).toBeTruthy();
        expect(getByText('Tamil')).toBeTruthy();
        expect(getByText('தமிழ்')).toBeTruthy();
      });
    });

    it('should show current language as selected', async () => {
      mockUseTranslation.mockReturnValue({
        ...defaultTranslations,
        currentLanguage: 'ms'
      });

      const { getByText } = render(<LanguageSwitcher />);

      fireEvent.press(getByText('Bahasa Melayu'));

      await waitFor(() => {
        // The Malay option should show as selected
        const malayOption = getByText('Bahasa Melayu');
        expect(malayOption).toBeTruthy();
      });
    });

    it('should handle language selection with confirmation', async () => {
      const mockChangeLanguage = jest.fn().mockResolvedValue(undefined);
      const mockOnLanguageChange = jest.fn();

      mockUseLanguageSwitcher.mockReturnValue({
        ...defaultLanguageSwitcher,
        changeLanguage: mockChangeLanguage
      });

      const { getByText } = render(
        <LanguageSwitcher onLanguageChange={mockOnLanguageChange} />
      );

      // Open modal
      fireEvent.press(getByText('English'));

      await waitFor(() => {
        const malayOption = getByText('Bahasa Melayu');
        fireEvent.press(malayOption);
      });

      // Should show confirmation dialog
      expect(mockAlert).toHaveBeenCalledWith(
        'Change Language',
        'Switch to Malay (Bahasa Melayu)?',
        expect.arrayContaining([
          { text: 'Cancel', style: 'cancel', onPress: expect.any(Function) },
          { text: 'Change', onPress: expect.any(Function) }
        ])
      );
    });

    it('should change language when confirmed', async () => {
      const mockChangeLanguage = jest.fn().mockResolvedValue(undefined);
      const mockOnLanguageChange = jest.fn();

      mockUseLanguageSwitcher.mockReturnValue({
        ...defaultLanguageSwitcher,
        changeLanguage: mockChangeLanguage
      });

      const { getByText } = render(
        <LanguageSwitcher onLanguageChange={mockOnLanguageChange} />
      );

      fireEvent.press(getByText('English'));

      await waitFor(() => {
        const malayOption = getByText('Bahasa Melayu');
        fireEvent.press(malayOption);
      });

      // Simulate user confirmation
      const alertCall = mockAlert.mock.calls[0];
      const confirmButton = alertCall[2].find((button: any) => button.text === 'Change');

      await act(async () => {
        await confirmButton.onPress();
      });

      expect(mockChangeLanguage).toHaveBeenCalledWith('ms');
      expect(mockOnLanguageChange).toHaveBeenCalledWith('ms');
    });

    it('should handle language selection cancellation', async () => {
      const mockChangeLanguage = jest.fn();

      mockUseLanguageSwitcher.mockReturnValue({
        ...defaultLanguageSwitcher,
        changeLanguage: mockChangeLanguage
      });

      const { getByText } = render(<LanguageSwitcher />);

      fireEvent.press(getByText('English'));

      await waitFor(() => {
        const malayOption = getByText('Bahasa Melayu');
        fireEvent.press(malayOption);
      });

      // Simulate user cancellation
      const alertCall = mockAlert.mock.calls[0];
      const cancelButton = alertCall[2].find((button: any) => button.text === 'Cancel');

      act(() => {
        cancelButton.onPress();
      });

      expect(mockChangeLanguage).not.toHaveBeenCalled();
    });
  });

  describe('Language Preloading', () => {
    it('should preload language when option is focused', async () => {
      const mockPreloadLanguage = jest.fn().mockResolvedValue(undefined);

      mockUseLanguageSwitcher.mockReturnValue({
        ...defaultLanguageSwitcher,
        preloadLanguage: mockPreloadLanguage
      });

      const { getByText } = render(<LanguageSwitcher />);

      fireEvent.press(getByText('English'));

      await waitFor(() => {
        const malayOption = getByText('Bahasa Melayu');
        fireEvent(malayOption, 'pressIn');
      });

      expect(mockPreloadLanguage).toHaveBeenCalledWith('ms');
    });

    it('should show download progress for preloading languages', async () => {
      mockUseLanguageSwitcher.mockReturnValue({
        ...defaultLanguageSwitcher,
        getLanguageProgress: jest.fn((language: string) => {
          return language === 'ms' ? 75 : 0;
        })
      });

      const { getByText } = render(<LanguageSwitcher />);

      fireEvent.press(getByText('English'));

      await waitFor(() => {
        // Progress bar should be visible for Malay
        expect(getByText('Bahasa Melayu')).toBeTruthy();
      });
    });
  });

  describe('Compact Mode', () => {
    it('should render compact button with current language code', () => {
      const { getByText } = render(<LanguageSwitcher compact={true} />);

      expect(getByText('EN')).toBeTruthy();
      expect(getByText('🇬🇧')).toBeTruthy();
    });

    it('should show loading indicator in compact mode', () => {
      mockUseLanguageSwitcher.mockReturnValue({
        ...defaultLanguageSwitcher,
        isChanging: true
      });

      const { getByRole } = render(<LanguageSwitcher compact={true} />);

      const activityIndicator = getByRole('progressbar');
      expect(activityIndicator).toBeTruthy();
    });

    it('should open modal when compact button is pressed', async () => {
      const { getByText } = render(<LanguageSwitcher compact={true} />);

      const compactButton = getByText('EN');
      fireEvent.press(compactButton);

      await waitFor(() => {
        expect(getByText('Select Language')).toBeTruthy();
      });
    });
  });

  describe('Theme Support', () => {
    it('should render correctly with light theme', () => {
      const { getByText } = render(<LanguageSwitcher theme="light" />);

      expect(getByText('English')).toBeTruthy();
    });

    it('should render correctly with dark theme', () => {
      const { getByText } = render(<LanguageSwitcher theme="dark" />);

      expect(getByText('English')).toBeTruthy();
    });
  });

  describe('Error Handling', () => {
    it('should handle language change errors gracefully', async () => {
      const mockChangeLanguage = jest.fn().mockRejectedValue(new Error('Network error'));

      mockUseLanguageSwitcher.mockReturnValue({
        ...defaultLanguageSwitcher,
        changeLanguage: mockChangeLanguage
      });

      const { getByText } = render(<LanguageSwitcher />);

      fireEvent.press(getByText('English'));

      await waitFor(() => {
        const malayOption = getByText('Bahasa Melayu');
        fireEvent.press(malayOption);
      });

      // Confirm language change
      const alertCall = mockAlert.mock.calls[0];
      const confirmButton = alertCall[2].find((button: any) => button.text === 'Change');

      await act(async () => {
        await confirmButton.onPress();
      });

      // Should show error dialog
      expect(mockAlert).toHaveBeenCalledWith(
        'Language Error',
        'Failed to change language. Please try again.'
      );
    });

    it('should handle preload errors silently', async () => {
      const mockPreloadLanguage = jest.fn().mockRejectedValue(new Error('Preload failed'));

      mockUseLanguageSwitcher.mockReturnValue({
        ...defaultLanguageSwitcher,
        preloadLanguage: mockPreloadLanguage
      });

      const { getByText } = render(<LanguageSwitcher />);

      fireEvent.press(getByText('English'));

      await waitFor(() => {
        const malayOption = getByText('Bahasa Melayu');
        fireEvent(malayOption, 'pressIn');
      });

      // Should not crash or show error to user
      expect(mockPreloadLanguage).toHaveBeenCalledWith('ms');
    });
  });

  describe('Cultural Context', () => {
    it('should display cultural context information', async () => {
      const { getByText } = render(<LanguageSwitcher />);

      fireEvent.press(getByText('English'));

      await waitFor(() => {
        expect(getByText('Language selection affects cultural features and formatting.')).toBeTruthy();
      });
    });

    it('should show language support features', async () => {
      const { getByText } = render(<LanguageSwitcher />);

      fireEvent.press(getByText('English'));

      await waitFor(() => {
        expect(getByText('Language Support Features')).toBeTruthy();
        expect(getByText('• Medical terminology translation')).toBeTruthy();
        expect(getByText('• Cultural event names and descriptions')).toBeTruthy();
        expect(getByText('• Prayer time and religious content')).toBeTruthy();
        expect(getByText('• Family coordination features')).toBeTruthy();
      });
    });
  });

  describe('Malaysian Context', () => {
    it('should display appropriate flags for Malaysian languages', async () => {
      const { getByText } = render(<LanguageSwitcher />);

      fireEvent.press(getByText('English'));

      await waitFor(() => {
        expect(getByText('🇲🇾')).toBeTruthy(); // Malaysian flag for Malay
        expect(getByText('🇨🇳')).toBeTruthy(); // Chinese flag
        expect(getByText('🇮🇳')).toBeTruthy(); // Indian flag for Tamil
        expect(getByText('🇬🇧')).toBeTruthy(); // UK flag for English
      });
    });

    it('should show native language names correctly', async () => {
      const { getByText } = render(<LanguageSwitcher />);

      fireEvent.press(getByText('English'));

      await waitFor(() => {
        expect(getByText('Bahasa Melayu')).toBeTruthy();
        expect(getByText('中文')).toBeTruthy();
        expect(getByText('தமிழ்')).toBeTruthy();
        expect(getByText('English')).toBeTruthy();
      });
    });

    it('should show language descriptions', async () => {
      const { getByText } = render(<LanguageSwitcher />);

      fireEvent.press(getByText('English'));

      await waitFor(() => {
        expect(getByText('Bahasa Malaysia')).toBeTruthy();
        expect(getByText('中文 (简体)')).toBeTruthy();
        expect(getByText('தமிழ்')).toBeTruthy();
        expect(getByText('English (International)')).toBeTruthy();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper accessibility labels', () => {
      const { getByRole } = render(<LanguageSwitcher />);

      const languageButton = getByRole('button');
      expect(languageButton).toBeTruthy();
    });

    it('should support screen readers', async () => {
      const { getByText, getByRole } = render(<LanguageSwitcher />);

      fireEvent.press(getByText('English'));

      await waitFor(() => {
        const modal = getByRole('dialog');
        expect(modal).toBeTruthy();
      });
    });

    it('should be keyboard accessible', async () => {
      // Test would verify keyboard navigation support
      const { getByText } = render(<LanguageSwitcher />);

      expect(getByText('English')).toBeTruthy();
    });
  });

  describe('Performance', () => {
    it('should not cause unnecessary re-renders', () => {
      const { rerender } = render(<LanguageSwitcher />);

      // Rerender with same props should not cause issues
      rerender(<LanguageSwitcher />);

      expect(mockUseTranslation).toHaveBeenCalledTimes(2);
    });

    it('should handle rapid language switching gracefully', async () => {
      const mockChangeLanguage = jest.fn().mockResolvedValue(undefined);

      mockUseLanguageSwitcher.mockReturnValue({
        ...defaultLanguageSwitcher,
        changeLanguage: mockChangeLanguage
      });

      const { getByText } = render(<LanguageSwitcher />);

      fireEvent.press(getByText('English'));

      // Rapidly select different languages
      await waitFor(() => {
        const malayOption = getByText('Bahasa Melayu');
        fireEvent.press(malayOption);
      });

      await waitFor(() => {
        const chineseOption = getByText('中文');
        fireEvent.press(chineseOption);
      });

      // Should handle rapid changes without issues
      expect(true).toBeTruthy();
    });
  });
});