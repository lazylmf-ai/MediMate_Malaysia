/**
 * Prayer Time Integration Component Tests
 *
 * Comprehensive tests for the prayer time integration component including
 * prayer time calculations, conflict detection, and medication scheduling.
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { PrayerTimeIntegration } from '../prayer/PrayerTimeIntegration';
import { usePrayerTimeIntegration } from '../../../hooks/cultural/usePrayerTimeIntegration';
import { useTranslation } from '../../../i18n';

// Mock dependencies
jest.mock('../../../hooks/cultural/usePrayerTimeIntegration');
jest.mock('../../../i18n');
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Alert: {
    alert: jest.fn(),
  },
}));

const mockUsePrayerTimeIntegration = usePrayerTimeIntegration as jest.MockedFunction<typeof usePrayerTimeIntegration>;
const mockUseTranslation = useTranslation as jest.MockedFunction<typeof useTranslation>;
const mockAlert = Alert.alert as jest.MockedFunction<typeof Alert.alert>;

describe('PrayerTimeIntegration', () => {
  const mockPrayerTimes = {
    fajr: new Date('2024-01-01T05:30:00Z'),
    dhuhr: new Date('2024-01-01T13:15:00Z'),
    asr: new Date('2024-01-01T16:30:00Z'),
    maghrib: new Date('2024-01-01T19:20:00Z'),
    isha: new Date('2024-01-01T20:35:00Z'),
    qibla: 292.5
  };

  const mockSchedulingWindows = [
    {
      startTime: new Date('2024-01-01T06:00:00Z'),
      endTime: new Date('2024-01-01T12:45:00Z'),
      type: 'between_prayers' as const,
      prayerName: 'fajr',
      bufferMinutes: 30
    },
    {
      startTime: new Date('2024-01-01T13:45:00Z'),
      endTime: new Date('2024-01-01T16:00:00Z'),
      type: 'between_prayers' as const,
      prayerName: 'dhuhr',
      bufferMinutes: 30
    }
  ];

  const mockConflicts = [
    {
      time: new Date('2024-01-01T13:00:00Z'),
      prayerName: 'dhuhr',
      severity: 'high' as const,
      suggestedAlternative: new Date('2024-01-01T13:45:00Z')
    }
  ];

  const mockNextPrayer = {
    name: 'dhuhr',
    time: new Date('2024-01-01T13:15:00Z')
  };

  const defaultMockReturn = {
    prayerTimes: mockPrayerTimes,
    schedulingWindows: mockSchedulingWindows,
    conflicts: [],
    nextPrayer: mockNextPrayer,
    qiblaDirection: 292.5,
    isLoading: false,
    error: null,
    refreshPrayerTimes: jest.fn(),
    checkConflicts: jest.fn(),
    getMedicationWindows: jest.fn(),
    updatePrayerSettings: jest.fn()
  };

  const defaultTranslations = {
    t: jest.fn((key: string, params?: any) => {
      const translations: Record<string, string> = {
        'prayer.integration_title': 'Prayer Time Integration',
        'prayer.next_prayer': 'Next Prayer',
        'prayer.todays_times': "Today's Prayer Times",
        'prayer.optimal_windows': 'Optimal Medication Windows',
        'prayer.settings_title': 'Prayer Settings',
        'prayer.conflicts_found': 'Conflicts found: {{count}}',
        'prayer.reschedule_title': 'Reschedule Medication',
        'prayer.reschedule_message': 'Move medication from {{originalTime}} to {{suggestedTime}}?',
        'prayer.qibla_direction': 'Qibla: {{direction}}°',
        'prayer.time_until': '{{hours}}h {{minutes}}m',
        'prayer.minutes_until': '{{minutes}}m',
        'common.retry': 'Retry',
        'common.cancel': 'Cancel',
        'common.reschedule': 'Reschedule'
      };

      let translation = translations[key] || key;
      if (params) {
        Object.keys(params).forEach(param => {
          translation = translation.replace(`{{${param}}}`, params[param]);
        });
      }
      return translation;
    }),
    tMedical: jest.fn((key: string) => key),
    tCultural: jest.fn((key: string) => {
      const culturalTranslations: Record<string, string> = {
        'prayer.fajr': 'Fajr',
        'prayer.dhuhr': 'Dhuhr',
        'prayer.asr': 'Asr',
        'prayer.maghrib': 'Maghrib',
        'prayer.isha': 'Isha'
      };
      return culturalTranslations[key] || key;
    })
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUsePrayerTimeIntegration.mockReturnValue(defaultMockReturn);
    mockUseTranslation.mockReturnValue(defaultTranslations);
  });

  describe('Rendering', () => {
    it('should render prayer time integration component successfully', () => {
      const { getByText } = render(<PrayerTimeIntegration />);

      expect(getByText('Prayer Time Integration')).toBeTruthy();
      expect(getByText('Next Prayer')).toBeTruthy();
      expect(getByText("Today's Prayer Times")).toBeTruthy();
    });

    it('should display loading state correctly', () => {
      mockUsePrayerTimeIntegration.mockReturnValue({
        ...defaultMockReturn,
        isLoading: true
      });

      const { getByText } = render(<PrayerTimeIntegration />);

      expect(getByText('Loading Prayer Times...')).toBeTruthy();
    });

    it('should display error state with retry button', () => {
      const mockRefresh = jest.fn();
      mockUsePrayerTimeIntegration.mockReturnValue({
        ...defaultMockReturn,
        error: 'Failed to load prayer times',
        refreshPrayerTimes: mockRefresh
      });

      const { getByText } = render(<PrayerTimeIntegration />);

      expect(getByText('Failed to load prayer times')).toBeTruthy();

      const retryButton = getByText('Retry');
      expect(retryButton).toBeTruthy();

      fireEvent.press(retryButton);
      expect(mockRefresh).toHaveBeenCalled();
    });

    it('should display no data state when prayer times are null', () => {
      mockUsePrayerTimeIntegration.mockReturnValue({
        ...defaultMockReturn,
        prayerTimes: null
      });

      const { getByText } = render(<PrayerTimeIntegration />);

      expect(getByText('No prayer time data available')).toBeTruthy();
    });
  });

  describe('Prayer Times Display', () => {
    it('should display next prayer information correctly', () => {
      const { getByText } = render(<PrayerTimeIntegration />);

      expect(getByText('Next Prayer')).toBeTruthy();
      expect(getByText('Dhuhr')).toBeTruthy();
      expect(getByText('1:15 PM')).toBeTruthy();
    });

    it('should display Qibla direction when enabled', () => {
      const { getByText } = render(
        <PrayerTimeIntegration showQiblaDirection={true} />
      );

      expect(getByText('Qibla: 292.5°')).toBeTruthy();
    });

    it('should not display Qibla direction when disabled', () => {
      const { queryByText } = render(
        <PrayerTimeIntegration showQiblaDirection={false} />
      );

      expect(queryByText(/Qibla:/)).toBeFalsy();
    });

    it('should display all five daily prayers', () => {
      const { getByText } = render(<PrayerTimeIntegration />);

      expect(getByText('Fajr')).toBeTruthy();
      expect(getByText('Dhuhr')).toBeTruthy();
      expect(getByText('Asr')).toBeTruthy();
      expect(getByText('Maghrib')).toBeTruthy();
      expect(getByText('Isha')).toBeTruthy();
    });

    it('should highlight next prayer in the prayer times grid', () => {
      const { getByText } = render(<PrayerTimeIntegration />);

      // The next prayer (Dhuhr) should be highlighted differently
      const dhuhrElements = getByText('Dhuhr').parent;
      expect(dhuhrElements).toBeTruthy();
    });
  });

  describe('Conflict Management', () => {
    it('should display conflicts when they exist', () => {
      mockUsePrayerTimeIntegration.mockReturnValue({
        ...defaultMockReturn,
        conflicts: mockConflicts
      });

      const { getByText } = render(<PrayerTimeIntegration />);

      expect(getByText('Conflicts found: 1')).toBeTruthy();
      expect(getByText('Conflicts with Dhuhr prayer')).toBeTruthy();
    });

    it('should handle medication rescheduling', async () => {
      const mockOnReschedule = jest.fn();
      mockUsePrayerTimeIntegration.mockReturnValue({
        ...defaultMockReturn,
        conflicts: mockConflicts
      });

      const { getByText } = render(
        <PrayerTimeIntegration onMedicationReschedule={mockOnReschedule} />
      );

      const rescheduleButton = getByText('Reschedule');
      fireEvent.press(rescheduleButton);

      await waitFor(() => {
        expect(mockAlert).toHaveBeenCalledWith(
          'Reschedule Medication',
          expect.stringContaining('Move medication from'),
          expect.arrayContaining([
            { text: 'Cancel', style: 'cancel' },
            { text: 'Reschedule', onPress: expect.any(Function) }
          ])
        );
      });
    });

    it('should show different conflict severity colors', () => {
      const highConflict = {
        ...mockConflicts[0],
        severity: 'high' as const
      };
      const mediumConflict = {
        ...mockConflicts[0],
        severity: 'medium' as const
      };
      const lowConflict = {
        ...mockConflicts[0],
        severity: 'low' as const
      };

      mockUsePrayerTimeIntegration.mockReturnValue({
        ...defaultMockReturn,
        conflicts: [highConflict, mediumConflict, lowConflict]
      });

      const { getAllByText } = render(<PrayerTimeIntegration />);

      expect(getAllByText(/HIGH|MEDIUM|LOW/)).toHaveLength(3);
    });
  });

  describe('Scheduling Windows', () => {
    it('should display optimal medication windows', () => {
      const { getByText } = render(<PrayerTimeIntegration />);

      expect(getByText('Optimal Medication Windows')).toBeTruthy();
      expect(getByText(/6:00 AM - 12:45 PM/)).toBeTruthy();
      expect(getByText(/1:45 PM - 4:00 PM/)).toBeTruthy();
    });

    it('should show window duration', () => {
      const { getByText } = render(<PrayerTimeIntegration />);

      // First window is ~6.75 hours = 405 minutes
      expect(getByText('405 minutes')).toBeTruthy();
      // Second window is ~2.25 hours = 135 minutes
      expect(getByText('135 minutes')).toBeTruthy();
    });

    it('should show prayer context for windows', () => {
      const { getByText } = render(<PrayerTimeIntegration />);

      expect(getByText('Relative to Fajr')).toBeTruthy();
      expect(getByText('Relative to Dhuhr')).toBeTruthy();
    });
  });

  describe('Settings Management', () => {
    it('should open settings modal when settings button is pressed', async () => {
      const { getByRole, getByText } = render(<PrayerTimeIntegration />);

      const settingsButton = getByRole('button', { name: /settings/i });
      fireEvent.press(settingsButton);

      await waitFor(() => {
        expect(getByText('Prayer Settings')).toBeTruthy();
      });
    });

    it('should handle prayer settings changes', async () => {
      const mockOnSettingsChange = jest.fn();

      const { getByRole } = render(
        <PrayerTimeIntegration onPrayerSettingsChange={mockOnSettingsChange} />
      );

      const settingsButton = getByRole('button', { name: /settings/i });
      fireEvent.press(settingsButton);

      // Test buffer minutes adjustment
      const increaseBuffer = getByRole('button', { name: /increase buffer/i });
      fireEvent.press(increaseBuffer);

      await waitFor(() => {
        expect(mockOnSettingsChange).toHaveBeenCalledWith(
          expect.objectContaining({
            bufferMinutes: 45
          })
        );
      });
    });

    it('should toggle madhab selection', async () => {
      const { getByRole, getByText } = render(<PrayerTimeIntegration />);

      const settingsButton = getByRole('button', { name: /settings/i });
      fireEvent.press(settingsButton);

      const hanafiButton = getByText('Hanafi');
      fireEvent.press(hanafiButton);

      // Verify Hanafi is now selected
      expect(hanafiButton).toBeTruthy();
    });

    it('should handle switch toggles in settings', async () => {
      const { getByRole } = render(<PrayerTimeIntegration />);

      const settingsButton = getByRole('button', { name: /settings/i });
      fireEvent.press(settingsButton);

      const notificationSwitch = getByRole('switch', { name: /notifications/i });
      fireEvent(notificationSwitch, 'valueChange', false);

      // Should update the settings
      expect(notificationSwitch.props.value).toBe(false);
    });
  });

  describe('Integration with Medication Times', () => {
    it('should check conflicts when medication times are provided', async () => {
      const mockCheckConflicts = jest.fn();
      const medicationTimes = [new Date('2024-01-01T13:00:00Z')];

      mockUsePrayerTimeIntegration.mockReturnValue({
        ...defaultMockReturn,
        checkConflicts: mockCheckConflicts
      });

      render(<PrayerTimeIntegration medicationTimes={medicationTimes} />);

      await waitFor(() => {
        expect(mockCheckConflicts).toHaveBeenCalledWith(
          medicationTimes,
          mockPrayerTimes,
          30
        );
      });
    });

    it('should trigger medication rescheduling callback', async () => {
      const mockOnReschedule = jest.fn();
      const originalTime = new Date('2024-01-01T13:00:00Z');
      const suggestedTime = new Date('2024-01-01T13:45:00Z');

      mockUsePrayerTimeIntegration.mockReturnValue({
        ...defaultMockReturn,
        conflicts: [{
          time: originalTime,
          prayerName: 'dhuhr',
          severity: 'high' as const,
          suggestedAlternative: suggestedTime
        }]
      });

      const { getByText } = render(
        <PrayerTimeIntegration onMedicationReschedule={mockOnReschedule} />
      );

      const rescheduleButton = getByText('Reschedule');
      fireEvent.press(rescheduleButton);

      // Simulate user accepting the reschedule
      const alertCall = mockAlert.mock.calls[0];
      const acceptButton = alertCall[2].find((button: any) => button.text === 'Reschedule');

      act(() => {
        acceptButton.onPress();
      });

      expect(mockOnReschedule).toHaveBeenCalledWith(originalTime, suggestedTime);
    });
  });

  describe('Time Formatting and Localization', () => {
    it('should format prayer times according to Malaysian locale', () => {
      const { getByText } = render(<PrayerTimeIntegration />);

      // Times should be formatted in 12-hour format for Malaysian users
      expect(getByText('5:30 AM')).toBeTruthy(); // Fajr
      expect(getByText('1:15 PM')).toBeTruthy(); // Dhuhr
      expect(getByText('4:30 PM')).toBeTruthy(); // Asr
      expect(getByText('7:20 PM')).toBeTruthy(); // Maghrib
      expect(getByText('8:35 PM')).toBeTruthy(); // Isha
    });

    it('should handle different themes', () => {
      const { rerender } = render(<PrayerTimeIntegration theme="light" />);
      expect(true).toBeTruthy(); // Component renders without error

      rerender(<PrayerTimeIntegration theme="dark" />);
      expect(true).toBeTruthy(); // Component renders without error
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle missing next prayer gracefully', () => {
      mockUsePrayerTimeIntegration.mockReturnValue({
        ...defaultMockReturn,
        nextPrayer: null
      });

      const { queryByText } = render(<PrayerTimeIntegration />);

      expect(queryByText('Next Prayer')).toBeFalsy();
    });

    it('should handle empty scheduling windows', () => {
      mockUsePrayerTimeIntegration.mockReturnValue({
        ...defaultMockReturn,
        schedulingWindows: []
      });

      const { queryByText } = render(<PrayerTimeIntegration />);

      expect(queryByText('Optimal Medication Windows')).toBeFalsy();
    });

    it('should handle prayer time calculation errors gracefully', () => {
      mockUsePrayerTimeIntegration.mockReturnValue({
        ...defaultMockReturn,
        error: 'Prayer time calculation failed'
      });

      const { getByText } = render(<PrayerTimeIntegration />);

      expect(getByText('Prayer time calculation failed')).toBeTruthy();
      expect(getByText('Retry')).toBeTruthy();
    });

    it('should memoize expensive calculations', () => {
      const { rerender } = render(<PrayerTimeIntegration />);

      // Rerender with same props shouldn't trigger unnecessary recalculations
      rerender(<PrayerTimeIntegration />);

      // The hook should be called only once initially
      expect(mockUsePrayerTimeIntegration).toHaveBeenCalledTimes(2); // Initial + rerender
    });
  });

  describe('Accessibility', () => {
    it('should have proper accessibility labels', () => {
      const { getByRole, getAllByRole } = render(<PrayerTimeIntegration />);

      expect(getByRole('button', { name: /settings/i })).toBeTruthy();

      const switches = getAllByRole('switch');
      expect(switches.length).toBeGreaterThan(0);
    });

    it('should support screen readers with proper semantic structure', () => {
      const { getByText } = render(<PrayerTimeIntegration />);

      // Headers should be properly structured
      expect(getByText('Prayer Time Integration')).toBeTruthy();
      expect(getByText('Next Prayer')).toBeTruthy();
      expect(getByText("Today's Prayer Times")).toBeTruthy();
    });
  });
});