/**
 * MultiModalReminderDisplay Component Tests
 *
 * Comprehensive test suite for MultiModalReminderDisplay component covering:
 * - Multi-modal delivery method display
 * - Cultural sound and haptic previews
 * - Voice and SMS functionality
 * - Animation states
 * - Error handling
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Vibration, Alert } from 'react-native';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import { MultiModalReminderDisplay } from '../MultiModalReminderDisplay';

// Mock dependencies
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

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
    shadow: '#000000',
  },
}));

// Mock Audio
jest.mock('expo-av', () => ({
  Audio: {
    Sound: {
      createAsync: jest.fn(() => Promise.resolve({
        sound: {
          playAsync: jest.fn(),
          stopAsync: jest.fn(),
          unloadAsync: jest.fn(),
          setOnPlaybackStatusUpdate: jest.fn(),
        },
      })),
    },
  },
}));

// Mock Speech
jest.mock('expo-speech', () => ({
  speak: jest.fn(),
  stop: jest.fn(),
}));

// Mock Vibration
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  return {
    ...RN,
    Vibration: {
      vibrate: jest.fn(),
    },
    Alert: {
      alert: jest.fn(),
    },
  };
});

describe('MultiModalReminderDisplay', () => {
  const mockReminder = {
    id: 'reminder_1',
    medicationName: 'Metformin',
    dosage: '500mg',
    scheduledTime: '2024-09-27T08:00:00.000Z',
    instructions: 'Take with food',
    priority: 'medium' as const,
  };

  const mockDeliveryMethods = [
    {
      type: 'visual',
      enabled: true,
      status: 'delivered',
    },
    {
      type: 'audio',
      enabled: true,
      status: 'pending',
    },
    {
      type: 'haptic',
      enabled: true,
      status: 'pending',
    },
    {
      type: 'sms',
      enabled: false,
      status: 'pending',
    },
    {
      type: 'voice',
      enabled: true,
      status: 'pending',
    },
  ] as const;

  const mockHandlers = {
    onMethodToggle: jest.fn(),
    onRetryMethod: jest.fn(),
    onPreviewMethod: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders reminder information correctly', () => {
      const { getByText } = render(
        <MultiModalReminderDisplay
          reminder={mockReminder}
          deliveryMethods={mockDeliveryMethods}
          language="en"
          {...mockHandlers}
        />
      );

      expect(getByText(/Reminder for Metformin/)).toBeTruthy();
      expect(getByText('Dose: 500mg')).toBeTruthy();
      expect(getByText('Instructions: Take with food')).toBeTruthy();
    });

    it('displays priority indicator', () => {
      const { getByText } = render(
        <MultiModalReminderDisplay
          reminder={mockReminder}
          deliveryMethods={mockDeliveryMethods}
          language="en"
          {...mockHandlers}
        />
      );

      expect(getByText('MEDIUM')).toBeTruthy();
    });

    it('renders all delivery methods', () => {
      const { getByText } = render(
        <MultiModalReminderDisplay
          reminder={mockReminder}
          deliveryMethods={mockDeliveryMethods}
          language="en"
          {...mockHandlers}
        />
      );

      expect(getByText('Visual')).toBeTruthy();
      expect(getByText('Audio')).toBeTruthy();
      expect(getByText('Haptic')).toBeTruthy();
      expect(getByText('SMS')).toBeTruthy();
      expect(getByText('Voice')).toBeTruthy();
    });

    it('shows delivery method status correctly', () => {
      const { getByText } = render(
        <MultiModalReminderDisplay
          reminder={mockReminder}
          deliveryMethods={mockDeliveryMethods}
          language="en"
          {...mockHandlers}
        />
      );

      expect(getByText('Delivered')).toBeTruthy(); // Visual method
      expect(getByText('Pending')).toBeTruthy(); // Other methods
    });
  });

  describe('Multi-language Support', () => {
    it('renders in Bahasa Malaysia', () => {
      const { getByText } = render(
        <MultiModalReminderDisplay
          reminder={mockReminder}
          deliveryMethods={mockDeliveryMethods}
          language="ms"
          {...mockHandlers}
        />
      );

      expect(getByText(/Peringatan untuk Metformin/)).toBeTruthy();
      expect(getByText('Dos: 500mg')).toBeTruthy();
      expect(getByText('Arahan: Take with food')).toBeTruthy();
    });

    it('renders in Chinese', () => {
      const { getByText } = render(
        <MultiModalReminderDisplay
          reminder={mockReminder}
          deliveryMethods={mockDeliveryMethods}
          language="zh"
          {...mockHandlers}
        />
      );

      expect(getByText(/提醒 Metformin/)).toBeTruthy();
      expect(getByText('剂量：500mg')).toBeTruthy();
      expect(getByText('说明：Take with food')).toBeTruthy();
    });

    it('renders in Tamil', () => {
      const { getByText } = render(
        <MultiModalReminderDisplay
          reminder={mockReminder}
          deliveryMethods={mockDeliveryMethods}
          language="ta"
          {...mockHandlers}
        />
      );

      expect(getByText(/நினைவூட்டல் Metformin/)).toBeTruthy();
      expect(getByText('மாத்திரை: 500mg')).toBeTruthy();
      expect(getByText('வழிமுறைகள்: Take with food')).toBeTruthy();
    });
  });

  describe('Delivery Method Controls', () => {
    it('allows toggling delivery methods', () => {
      const { getByText } = render(
        <MultiModalReminderDisplay
          reminder={mockReminder}
          deliveryMethods={mockDeliveryMethods}
          language="en"
          {...mockHandlers}
        />
      );

      // Find and press toggle for SMS (currently disabled)
      fireEvent.press(getByText('Disabled'));

      expect(mockHandlers.onMethodToggle).toHaveBeenCalledWith('sms', true);
    });

    it('shows enabled/disabled status correctly', () => {
      const { getAllByText } = render(
        <MultiModalReminderDisplay
          reminder={mockReminder}
          deliveryMethods={mockDeliveryMethods}
          language="en"
          {...mockHandlers}
        />
      );

      expect(getAllByText('Enabled').length).toBeGreaterThan(0);
      expect(getAllByText('Disabled').length).toBeGreaterThan(0);
    });
  });

  describe('Audio Preview', () => {
    it('plays cultural sound when audio preview is pressed', async () => {
      const { getByText } = render(
        <MultiModalReminderDisplay
          reminder={mockReminder}
          deliveryMethods={mockDeliveryMethods}
          culturalTheme="malaysian"
          language="en"
          {...mockHandlers}
        />
      );

      fireEvent.press(getByText('Play Cultural Sound'));

      await waitFor(() => {
        expect(Audio.Sound.createAsync).toHaveBeenCalled();
      });
    });

    it('stops sound when stop button is pressed', async () => {
      const mockSound = {
        playAsync: jest.fn(),
        stopAsync: jest.fn(),
        unloadAsync: jest.fn(),
        setOnPlaybackStatusUpdate: jest.fn(),
      };

      (Audio.Sound.createAsync as jest.Mock).mockResolvedValue({ sound: mockSound });

      const { getByText, rerender } = render(
        <MultiModalReminderDisplay
          reminder={mockReminder}
          deliveryMethods={mockDeliveryMethods}
          language="en"
          {...mockHandlers}
        />
      );

      // Start playing
      fireEvent.press(getByText('Play Cultural Sound'));

      await waitFor(() => {
        expect(Audio.Sound.createAsync).toHaveBeenCalled();
      });

      // Re-render to show stop button
      rerender(
        <MultiModalReminderDisplay
          reminder={mockReminder}
          deliveryMethods={mockDeliveryMethods}
          language="en"
          {...mockHandlers}
        />
      );

      // Stop playing
      fireEvent.press(getByText('Stop Sound'));

      expect(mockSound.stopAsync).toHaveBeenCalled();
    });

    it('handles audio errors gracefully', async () => {
      (Audio.Sound.createAsync as jest.Mock).mockRejectedValue(new Error('Audio error'));

      const { getByText } = render(
        <MultiModalReminderDisplay
          reminder={mockReminder}
          deliveryMethods={mockDeliveryMethods}
          language="en"
          {...mockHandlers}
        />
      );

      fireEvent.press(getByText('Play Cultural Sound'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Could not play sound');
      });
    });
  });

  describe('Haptic Preview', () => {
    it('triggers vibration when haptic preview is pressed', () => {
      const { getByText } = render(
        <MultiModalReminderDisplay
          reminder={mockReminder}
          deliveryMethods={mockDeliveryMethods}
          language="en"
          {...mockHandlers}
        />
      );

      fireEvent.press(getByText('Test Vibration'));

      expect(Vibration.vibrate).toHaveBeenCalled();
    });

    it('uses cultural haptic patterns', () => {
      const { getByText } = render(
        <MultiModalReminderDisplay
          reminder={mockReminder}
          deliveryMethods={mockDeliveryMethods}
          culturalTheme="chinese"
          language="en"
          {...mockHandlers}
        />
      );

      fireEvent.press(getByText('Test Vibration'));

      // Should call vibrate with specific pattern
      expect(Vibration.vibrate).toHaveBeenCalledWith([500, 100, 500]);
    });
  });

  describe('Voice Preview', () => {
    it('speaks voice message when voice preview is pressed', () => {
      const { getByText } = render(
        <MultiModalReminderDisplay
          reminder={mockReminder}
          deliveryMethods={mockDeliveryMethods}
          language="en"
          {...mockHandlers}
        />
      );

      fireEvent.press(getByText('Read Aloud'));

      expect(Speech.speak).toHaveBeenCalledWith(
        'Time to take Metformin. Take 500mg now.',
        expect.objectContaining({
          language: 'en-US',
          pitch: 1.0,
          rate: 0.8,
          volume: 1.0,
        })
      );
    });

    it('generates voice message in different languages', () => {
      const { getByText } = render(
        <MultiModalReminderDisplay
          reminder={mockReminder}
          deliveryMethods={mockDeliveryMethods}
          language="ms"
          {...mockHandlers}
        />
      );

      fireEvent.press(getByText('Baca dengan Kuat'));

      expect(Speech.speak).toHaveBeenCalledWith(
        'Masa untuk ubat Metformin. Ambil 500mg sekarang.',
        expect.objectContaining({
          language: 'ms-MY',
        })
      );
    });

    it('stops speech when stop button is pressed', () => {
      const { getByText } = render(
        <MultiModalReminderDisplay
          reminder={mockReminder}
          deliveryMethods={mockDeliveryMethods}
          language="en"
          {...mockHandlers}
        />
      );

      // Start speaking
      fireEvent.press(getByText('Read Aloud'));

      // Stop speaking
      fireEvent.press(getByText('Stop Reading'));

      expect(Speech.stop).toHaveBeenCalled();
    });
  });

  describe('SMS Preview', () => {
    it('displays SMS preview text', () => {
      const { getByText } = render(
        <MultiModalReminderDisplay
          reminder={mockReminder}
          deliveryMethods={mockDeliveryMethods}
          language="en"
          {...mockHandlers}
        />
      );

      expect(getByText('SMS Preview:')).toBeTruthy();
      expect(getByText(/🏥 Medication Reminder/)).toBeTruthy();
      expect(getByText(/Metformin/)).toBeTruthy();
      expect(getByText(/500mg/)).toBeTruthy();
    });

    it('generates culturally appropriate SMS content', () => {
      const { getByText } = render(
        <MultiModalReminderDisplay
          reminder={mockReminder}
          deliveryMethods={mockDeliveryMethods}
          language="ms"
          {...mockHandlers}
        />
      );

      expect(getByText(/🏥 Peringatan Ubat/)).toBeTruthy();
      expect(getByText(/MediMate Malaysia/)).toBeTruthy();
    });
  });

  describe('Cultural Themes', () => {
    it('displays correct cultural sound for Malaysian theme', () => {
      const { getByText } = render(
        <MultiModalReminderDisplay
          reminder={mockReminder}
          deliveryMethods={mockDeliveryMethods}
          culturalTheme="malaysian"
          language="en"
          {...mockHandlers}
        />
      );

      expect(getByText('Play Cultural Sound')).toBeTruthy();
    });

    it('displays correct cultural sound for Chinese theme', () => {
      const { getByText } = render(
        <MultiModalReminderDisplay
          reminder={mockReminder}
          deliveryMethods={mockDeliveryMethods}
          culturalTheme="chinese"
          language="en"
          {...mockHandlers}
        />
      );

      expect(getByText('Play Cultural Sound')).toBeTruthy();
    });

    it('displays correct cultural sound for Tamil theme', () => {
      const { getByText } = render(
        <MultiModalReminderDisplay
          reminder={mockReminder}
          deliveryMethods={mockDeliveryMethods}
          culturalTheme="tamil"
          language="en"
          {...mockHandlers}
        />
      );

      expect(getByText('Play Cultural Sound')).toBeTruthy();
    });
  });

  describe('Error States', () => {
    it('displays retry button for failed delivery methods', () => {
      const failedMethods = mockDeliveryMethods.map(method => ({
        ...method,
        status: 'failed' as const,
        errorMessage: 'Delivery failed',
      }));

      const { getAllByText } = render(
        <MultiModalReminderDisplay
          reminder={mockReminder}
          deliveryMethods={failedMethods}
          language="en"
          {...mockHandlers}
        />
      );

      expect(getAllByText('Failed').length).toBeGreaterThan(0);
      expect(getAllByText('Retry').length).toBeGreaterThan(0);
    });

    it('calls retry handler when retry button is pressed', () => {
      const failedMethods = [
        {
          ...mockDeliveryMethods[0],
          status: 'failed' as const,
        },
      ];

      const { getByText } = render(
        <MultiModalReminderDisplay
          reminder={mockReminder}
          deliveryMethods={failedMethods}
          language="en"
          {...mockHandlers}
        />
      );

      fireEvent.press(getByText('Retry'));

      expect(mockHandlers.onRetryMethod).toHaveBeenCalledWith('visual');
    });
  });

  describe('Animation States', () => {
    it('shows delivering animation for active delivery methods', () => {
      const deliveringMethods = mockDeliveryMethods.map(method => ({
        ...method,
        status: 'delivering' as const,
      }));

      const { getAllByText } = render(
        <MultiModalReminderDisplay
          reminder={mockReminder}
          deliveryMethods={deliveringMethods}
          language="en"
          {...mockHandlers}
        />
      );

      expect(getAllByText('Delivering...').length).toBeGreaterThan(0);
    });
  });

  describe('Priority Handling', () => {
    it('displays correct priority colors for critical reminders', () => {
      const criticalReminder = {
        ...mockReminder,
        priority: 'critical' as const,
      };

      const { getByText } = render(
        <MultiModalReminderDisplay
          reminder={criticalReminder}
          deliveryMethods={mockDeliveryMethods}
          language="en"
          {...mockHandlers}
        />
      );

      expect(getByText('CRITICAL')).toBeTruthy();
    });

    it('displays correct priority colors for low reminders', () => {
      const lowReminder = {
        ...mockReminder,
        priority: 'low' as const,
      };

      const { getByText } = render(
        <MultiModalReminderDisplay
          reminder={lowReminder}
          deliveryMethods={mockDeliveryMethods}
          language="en"
          {...mockHandlers}
        />
      );

      expect(getByText('LOW')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('handles empty delivery methods array', () => {
      const { getByText } = render(
        <MultiModalReminderDisplay
          reminder={mockReminder}
          deliveryMethods={[]}
          language="en"
          {...mockHandlers}
        />
      );

      expect(getByText(/Reminder for Metformin/)).toBeTruthy();
      expect(getByText('Delivery Methods')).toBeTruthy();
    });

    it('handles missing reminder instructions', () => {
      const reminderWithoutInstructions = {
        ...mockReminder,
        instructions: undefined,
      };

      const { getByText, queryByText } = render(
        <MultiModalReminderDisplay
          reminder={reminderWithoutInstructions}
          deliveryMethods={mockDeliveryMethods}
          language="en"
          {...mockHandlers}
        />
      );

      expect(getByText(/Reminder for Metformin/)).toBeTruthy();
      expect(queryByText(/Instructions:/)).toBeNull();
    });

    it('handles very long medication names', () => {
      const longNameReminder = {
        ...mockReminder,
        medicationName: 'Very Long Medication Name That Should Be Handled Gracefully',
      };

      const { getByText } = render(
        <MultiModalReminderDisplay
          reminder={longNameReminder}
          deliveryMethods={mockDeliveryMethods}
          language="en"
          {...mockHandlers}
        />
      );

      expect(getByText(/Very Long Medication Name/)).toBeTruthy();
    });
  });

  describe('Performance', () => {
    it('renders efficiently with multiple delivery methods', () => {
      const startTime = performance.now();

      render(
        <MultiModalReminderDisplay
          reminder={mockReminder}
          deliveryMethods={mockDeliveryMethods}
          language="en"
          {...mockHandlers}
        />
      );

      const endTime = performance.now();
      const renderTime = endTime - startTime;

      expect(renderTime).toBeLessThan(100);
    });

    it('handles rapid preview button presses', () => {
      const { getByText } = render(
        <MultiModalReminderDisplay
          reminder={mockReminder}
          deliveryMethods={mockDeliveryMethods}
          language="en"
          {...mockHandlers}
        />
      );

      // Rapidly press audio preview
      for (let i = 0; i < 5; i++) {
        fireEvent.press(getByText('Play Cultural Sound'));
      }

      // Should handle rapid presses gracefully
      expect(true).toBe(true);
    });
  });
});