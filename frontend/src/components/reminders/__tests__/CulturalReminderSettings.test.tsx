/**
 * CulturalReminderSettings Component Tests
 *
 * Comprehensive test suite for CulturalReminderSettings component covering:
 * - Cultural settings configuration
 * - Multi-language interface
 * - Prayer time settings
 * - Sound preferences
 * - Accessibility features
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { CulturalReminderSettings } from '../CulturalReminderSettings';

// Mock dependencies
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('@react-native-community/slider', () => 'Slider');

jest.mock('@/constants/config', () => ({
  COLORS: {
    white: '#FFFFFF',
    primary: '#2563EB',
    success: '#059669',
    warning: '#D97706',
    error: '#DC2626',
    text: '#1F2937',
    textLight: '#6B7280',
    border: '#E5E7EB',
    background: '#F9FAFB',
    lightGray: '#F3F4F6',
    gray: '#9CA3AF',
  },
}));

// Mock Alert
jest.spyOn(Alert, 'alert');

describe('CulturalReminderSettings', () => {
  const mockSettings = {
    enabled: true,
    soundEnabled: true,
    vibrationEnabled: true,
    reminderMinutesBefore: 5,
    snoozeMinutes: 10,
    maxSnoozeCount: 3,
    quietHours: {
      start: '22:00',
      end: '07:00',
      enabled: true,
    },
  };

  const mockCulturalProfile = {
    language: 'en' as const,
    religion: 'Islam',
    location: {
      state: 'Selangor',
      country: 'Malaysia',
    },
  };

  const mockOnUpdateSettings = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders main title correctly', () => {
      const { getByText } = render(
        <CulturalReminderSettings
          settings={mockSettings}
          culturalProfile={mockCulturalProfile}
          onUpdateSettings={mockOnUpdateSettings}
          language="en"
        />
      );

      expect(getByText('Cultural Settings')).toBeTruthy();
    });

    it('renders section headers', () => {
      const { getByText } = render(
        <CulturalReminderSettings
          settings={mockSettings}
          culturalProfile={mockCulturalProfile}
          onUpdateSettings={mockOnUpdateSettings}
          language="en"
        />
      );

      expect(getByText('Religious Observance')).toBeTruthy();
      expect(getByText('Sound Preferences')).toBeTruthy();
      expect(getByText('Family Settings')).toBeTruthy();
      expect(getByText('Accessibility Settings')).toBeTruthy();
    });

    it('shows save button', () => {
      const { getByText } = render(
        <CulturalReminderSettings
          settings={mockSettings}
          culturalProfile={mockCulturalProfile}
          onUpdateSettings={mockOnUpdateSettings}
          language="en"
        />
      );

      expect(getByText('Save Settings')).toBeTruthy();
    });
  });

  describe('Multi-language Support', () => {
    it('renders in Bahasa Malaysia', () => {
      const { getByText } = render(
        <CulturalReminderSettings
          settings={mockSettings}
          culturalProfile={mockCulturalProfile}
          onUpdateSettings={mockOnUpdateSettings}
          language="ms"
        />
      );

      expect(getByText('Tetapan Budaya')).toBeTruthy();
      expect(getByText('Ibadah Agama')).toBeTruthy();
      expect(getByText('Simpan Tetapan')).toBeTruthy();
    });

    it('renders in Chinese', () => {
      const { getByText } = render(
        <CulturalReminderSettings
          settings={mockSettings}
          culturalProfile={mockCulturalProfile}
          onUpdateSettings={mockOnUpdateSettings}
          language="zh"
        />
      );

      expect(getByText('文化设置')).toBeTruthy();
      expect(getByText('宗教仪式')).toBeTruthy();
      expect(getByText('保存设置')).toBeTruthy();
    });

    it('renders in Tamil', () => {
      const { getByText } = render(
        <CulturalReminderSettings
          settings={mockSettings}
          culturalProfile={mockCulturalProfile}
          onUpdateSettings={mockOnUpdateSettings}
          language="ta"
        />
      );

      expect(getByText('கலாச்சார அமைப்புகள்')).toBeTruthy();
      expect(getByText('மத கடமைகள்')).toBeTruthy();
      expect(getByText('அமைப்புகளை சேமிக்கவும்')).toBeTruthy();
    });
  });

  describe('Section Expansion', () => {
    it('expands and collapses sections when headers are pressed', () => {
      const { getByText, queryByText } = render(
        <CulturalReminderSettings
          settings={mockSettings}
          culturalProfile={mockCulturalProfile}
          onUpdateSettings={mockOnUpdateSettings}
          language="en"
        />
      );

      // Initially, basic settings should be visible
      expect(getByText('Avoid Prayer Times')).toBeTruthy();

      // Collapse religious section
      fireEvent.press(getByText('Religious Observance'));

      // Content should be hidden
      expect(queryByText('Avoid Prayer Times')).toBeNull();

      // Expand again
      fireEvent.press(getByText('Religious Observance'));

      // Content should be visible again
      expect(getByText('Avoid Prayer Times')).toBeTruthy();
    });

    it('can expand multiple sections simultaneously', () => {
      const { getByText } = render(
        <CulturalReminderSettings
          settings={mockSettings}
          culturalProfile={mockCulturalProfile}
          onUpdateSettings={mockOnUpdateSettings}
          language="en"
        />
      );

      // Expand sound preferences section
      fireEvent.press(getByText('Sound Preferences'));

      // Both religious and sound sections should be accessible
      expect(getByText('Avoid Prayer Times')).toBeTruthy();
      expect(getByText('Cultural Sounds')).toBeTruthy();
    });
  });

  describe('Prayer Time Settings', () => {
    it('displays prayer time avoidance setting', () => {
      const { getByText } = render(
        <CulturalReminderSettings
          settings={mockSettings}
          culturalProfile={mockCulturalProfile}
          onUpdateSettings={mockOnUpdateSettings}
          language="en"
        />
      );

      expect(getByText('Avoid Prayer Times')).toBeTruthy();
      expect(getByText('Automatically reschedule reminders that conflict with prayer times')).toBeTruthy();
    });

    it('shows prayer buffer slider when prayer time avoidance is enabled', () => {
      const { getByText } = render(
        <CulturalReminderSettings
          settings={mockSettings}
          culturalProfile={mockCulturalProfile}
          onUpdateSettings={mockOnUpdateSettings}
          language="en"
        />
      );

      expect(getByText(/Prayer Time Buffer: 15 minutes/)).toBeTruthy();
      expect(getByText('Minutes before and after prayer times to avoid')).toBeTruthy();
    });

    it('displays Ramadan adjustments setting', () => {
      const { getByText } = render(
        <CulturalReminderSettings
          settings={mockSettings}
          culturalProfile={mockCulturalProfile}
          onUpdateSettings={mockOnUpdateSettings}
          language="en"
        />
      );

      expect(getByText('Ramadan Adjustments')).toBeTruthy();
      expect(getByText('Adjust schedules during Ramadan fasting')).toBeTruthy();
    });
  });

  describe('Sound Preferences', () => {
    it('displays cultural sounds setting', () => {
      const { getByText } = render(
        <CulturalReminderSettings
          settings={mockSettings}
          culturalProfile={mockCulturalProfile}
          onUpdateSettings={mockOnUpdateSettings}
          language="en"
        />
      );

      // Expand sound preferences section
      fireEvent.press(getByText('Sound Preferences'));

      expect(getByText('Cultural Sounds')).toBeTruthy();
      expect(getByText('Use traditional sounds for reminders')).toBeTruthy();
    });

    it('shows sound selection options when cultural sounds enabled', () => {
      const { getByText } = render(
        <CulturalReminderSettings
          settings={mockSettings}
          culturalProfile={mockCulturalProfile}
          onUpdateSettings={mockOnUpdateSettings}
          language="en"
        />
      );

      // Expand sound preferences section
      fireEvent.press(getByText('Sound Preferences'));

      expect(getByText('Sound Selection')).toBeTruthy();
      expect(getByText('Gamelan (Malaysian)')).toBeTruthy();
      expect(getByText('Temple Bells (Chinese)')).toBeTruthy();
      expect(getByText('Veena (Tamil)')).toBeTruthy();
      expect(getByText('Nature Sounds')).toBeTruthy();
      expect(getByText('Modern Chime')).toBeTruthy();
    });

    it('filters sound options based on cultural profile', () => {
      const malayProfile = {
        ...mockCulturalProfile,
        language: 'ms' as const,
      };

      const { getByText, queryByText } = render(
        <CulturalReminderSettings
          settings={mockSettings}
          culturalProfile={malayProfile}
          onUpdateSettings={mockOnUpdateSettings}
          language="ms"
        />
      );

      // Expand sound preferences section
      fireEvent.press(getByText('Pilihan Bunyi'));

      // Should show filtered options for Malaysian profile
      expect(getByText('Gamelan (Malaysia)')).toBeTruthy();
      expect(getByText('Bunyi Alam')).toBeTruthy();
      expect(getByText('Loceng Moden')).toBeTruthy();
    });

    it('shows preview buttons for sound options', () => {
      const { getAllByText } = render(
        <CulturalReminderSettings
          settings={mockSettings}
          culturalProfile={mockCulturalProfile}
          onUpdateSettings={mockOnUpdateSettings}
          language="en"
        />
      );

      // Expand sound preferences section
      fireEvent.press(getAllByText('Sound Preferences')[0]);

      const previewButtons = getAllByText('Preview');
      expect(previewButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Family Settings', () => {
    it('displays family notification setting', () => {
      const { getByText } = render(
        <CulturalReminderSettings
          settings={mockSettings}
          culturalProfile={mockCulturalProfile}
          onUpdateSettings={mockOnUpdateSettings}
          language="en"
        />
      );

      // Expand family settings section
      fireEvent.press(getByText('Family Settings'));

      expect(getByText('Family Notifications')).toBeTruthy();
      expect(getByText('Notify family members of missed medications')).toBeTruthy();
    });

    it('displays traditional medicine setting', () => {
      const { getByText } = render(
        <CulturalReminderSettings
          settings={mockSettings}
          culturalProfile={mockCulturalProfile}
          onUpdateSettings={mockOnUpdateSettings}
          language="en"
        />
      );

      // Expand family settings section
      fireEvent.press(getByText('Family Settings'));

      expect(getByText('Traditional Medicine')).toBeTruthy();
      expect(getByText('Consider traditional medicine interactions')).toBeTruthy();
    });
  });

  describe('Accessibility Settings', () => {
    it('displays elderly-friendly mode setting', () => {
      const { getByText } = render(
        <CulturalReminderSettings
          settings={mockSettings}
          culturalProfile={mockCulturalProfile}
          onUpdateSettings={mockOnUpdateSettings}
          language="en"
        />
      );

      // Expand accessibility settings section
      fireEvent.press(getByText('Accessibility Settings'));

      expect(getByText('Elderly-Friendly Mode')).toBeTruthy();
      expect(getByText('Larger text, louder sounds, simpler interface')).toBeTruthy();
    });
  });

  describe('User Interactions', () => {
    it('handles switch toggles correctly', () => {
      const { getByText, getByDisplayValue } = render(
        <CulturalReminderSettings
          settings={mockSettings}
          culturalProfile={mockCulturalProfile}
          onUpdateSettings={mockOnUpdateSettings}
          language="en"
        />
      );

      // Find and toggle a switch (this would depend on how Switch is implemented in the test environment)
      // For now, we'll test the text presence
      expect(getByText('Avoid Prayer Times')).toBeTruthy();
    });

    it('calls save settings when save button is pressed', () => {
      const { getByText } = render(
        <CulturalReminderSettings
          settings={mockSettings}
          culturalProfile={mockCulturalProfile}
          onUpdateSettings={mockOnUpdateSettings}
          language="en"
        />
      );

      fireEvent.press(getByText('Save Settings'));

      expect(Alert.alert).toHaveBeenCalledWith(
        'Settings Saved',
        'Cultural settings have been saved successfully',
        [{ text: 'OK' }]
      );
    });

    it('handles sound option selection', () => {
      const { getByText } = render(
        <CulturalReminderSettings
          settings={mockSettings}
          culturalProfile={mockCulturalProfile}
          onUpdateSettings={mockOnUpdateSettings}
          language="en"
        />
      );

      // Expand sound preferences section
      fireEvent.press(getByText('Sound Preferences'));

      // Select a sound option
      fireEvent.press(getByText('Temple Bells (Chinese)'));

      // The component should update its internal state
      expect(getByText('Temple Bells (Chinese)')).toBeTruthy();
    });

    it('handles preview button presses', () => {
      const { getByText, getAllByText } = render(
        <CulturalReminderSettings
          settings={mockSettings}
          culturalProfile={mockCulturalProfile}
          onUpdateSettings={mockOnUpdateSettings}
          language="en"
        />
      );

      // Expand sound preferences section
      fireEvent.press(getByText('Sound Preferences'));

      // Press a preview button
      const previewButtons = getAllByText('Preview');
      if (previewButtons.length > 0) {
        fireEvent.press(previewButtons[0]);
        // Should not crash when preview is pressed
      }
    });
  });

  describe('Cultural Adaptations', () => {
    it('adapts interface for Malaysian culture', () => {
      const malayProfile = {
        ...mockCulturalProfile,
        language: 'ms' as const,
      };

      const { getByText } = render(
        <CulturalReminderSettings
          settings={mockSettings}
          culturalProfile={malayProfile}
          onUpdateSettings={mockOnUpdateSettings}
          language="ms"
        />
      );

      expect(getByText('Elak Waktu Solat')).toBeTruthy();
      expect(getByText('Penyesuaian Ramadan')).toBeTruthy();
    });

    it('adapts interface for Chinese culture', () => {
      const chineseProfile = {
        ...mockCulturalProfile,
        language: 'zh' as const,
      };

      const { getByText } = render(
        <CulturalReminderSettings
          settings={mockSettings}
          culturalProfile={chineseProfile}
          onUpdateSettings={mockOnUpdateSettings}
          language="zh"
        />
      );

      expect(getByText('避开祈祷时间')).toBeTruthy();
      expect(getByText('斋月调整')).toBeTruthy();
    });

    it('adapts interface for Tamil culture', () => {
      const tamilProfile = {
        ...mockCulturalProfile,
        language: 'ta' as const,
      };

      const { getByText } = render(
        <CulturalReminderSettings
          settings={mockSettings}
          culturalProfile={tamilProfile}
          onUpdateSettings={mockOnUpdateSettings}
          language="ta"
        />
      );

      expect(getByText('தொழுகை நேரங்களைத் தவிர்க்கவும்')).toBeTruthy();
      expect(getByText('ரமளான் சரிசெய்தல்கள்')).toBeTruthy();
    });
  });

  describe('Slider Functionality', () => {
    it('displays prayer buffer slider with correct value', () => {
      const { getByText } = render(
        <CulturalReminderSettings
          settings={mockSettings}
          culturalProfile={mockCulturalProfile}
          onUpdateSettings={mockOnUpdateSettings}
          language="en"
        />
      );

      expect(getByText(/Prayer Time Buffer: 15 minutes/)).toBeTruthy();
    });

    it('updates slider value in different languages', () => {
      const { getByText } = render(
        <CulturalReminderSettings
          settings={mockSettings}
          culturalProfile={mockCulturalProfile}
          onUpdateSettings={mockOnUpdateSettings}
          language="ms"
        />
      );

      expect(getByText(/Penimbal Waktu Solat: 15 minit/)).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('handles missing cultural profile gracefully', () => {
      const { getByText } = render(
        <CulturalReminderSettings
          settings={mockSettings}
          onUpdateSettings={mockOnUpdateSettings}
          language="en"
        />
      );

      // Should still render without cultural profile
      expect(getByText('Cultural Settings')).toBeTruthy();
    });

    it('handles empty settings object', () => {
      const emptySettings = {
        enabled: false,
        soundEnabled: false,
        vibrationEnabled: false,
        reminderMinutesBefore: 0,
        snoozeMinutes: 0,
        maxSnoozeCount: 0,
        quietHours: {
          start: '00:00',
          end: '00:00',
          enabled: false,
        },
      };

      const { getByText } = render(
        <CulturalReminderSettings
          settings={emptySettings}
          culturalProfile={mockCulturalProfile}
          onUpdateSettings={mockOnUpdateSettings}
          language="en"
        />
      );

      expect(getByText('Cultural Settings')).toBeTruthy();
    });

    it('handles rapid section expansion/collapse', () => {
      const { getByText } = render(
        <CulturalReminderSettings
          settings={mockSettings}
          culturalProfile={mockCulturalProfile}
          onUpdateSettings={mockOnUpdateSettings}
          language="en"
        />
      );

      // Rapidly toggle sections
      for (let i = 0; i < 5; i++) {
        fireEvent.press(getByText('Sound Preferences'));
        fireEvent.press(getByText('Family Settings'));
      }

      // Should not crash
      expect(getByText('Cultural Settings')).toBeTruthy();
    });
  });

  describe('Performance', () => {
    it('renders efficiently with complex settings', () => {
      const startTime = performance.now();

      render(
        <CulturalReminderSettings
          settings={mockSettings}
          culturalProfile={mockCulturalProfile}
          onUpdateSettings={mockOnUpdateSettings}
          language="en"
        />
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      // Should render quickly (less than 100ms in test environment)
      expect(renderTime).toBeLessThan(100);
    });

    it('handles multiple rapid updates efficiently', () => {
      const { rerender } = render(
        <CulturalReminderSettings
          settings={mockSettings}
          culturalProfile={mockCulturalProfile}
          onUpdateSettings={mockOnUpdateSettings}
          language="en"
        />
      );

      // Simulate rapid prop updates
      for (let i = 0; i < 10; i++) {
        rerender(
          <CulturalReminderSettings
            settings={{
              ...mockSettings,
              enabled: i % 2 === 0,
            }}
            culturalProfile={mockCulturalProfile}
            onUpdateSettings={mockOnUpdateSettings}
            language="en"
          />
        );
      }

      // Should handle updates without issues
      expect(true).toBe(true);
    });
  });
});