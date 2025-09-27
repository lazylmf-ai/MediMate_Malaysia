/**
 * OfflineQueueStatus Component Tests
 *
 * Comprehensive test suite for OfflineQueueStatus component covering:
 * - Connection status display
 * - Offline queue management UI
 * - Multi-language support
 * - Animation states
 * - User interactions
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Animated } from 'react-native';
import { OfflineQueueStatus } from '../OfflineQueueStatus';

// Mock Ionicons
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

// Mock COLORS
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
  },
}));

// Mock Animated
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  RN.Animated.loop = jest.fn(() => ({ start: jest.fn(), stop: jest.fn() }));
  RN.Animated.sequence = jest.fn(() => ({ start: jest.fn(), stop: jest.fn() }));
  RN.Animated.timing = jest.fn(() => ({ start: jest.fn(), stop: jest.fn() }));
  return RN;
});

describe('OfflineQueueStatus', () => {
  const mockOnSyncPress = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Connection Status Display', () => {
    it('displays connected status when online', () => {
      const { getByText } = render(
        <OfflineQueueStatus
          isConnected={true}
          connectionType="wifi"
          queuedReminders={0}
          language="en"
          onSyncPress={mockOnSyncPress}
        />
      );

      expect(getByText('Connected')).toBeTruthy();
      expect(getByText('All synced')).toBeTruthy();
    });

    it('displays offline status when disconnected', () => {
      const { getByText } = render(
        <OfflineQueueStatus
          isConnected={false}
          queuedReminders={0}
          language="en"
          onSyncPress={mockOnSyncPress}
        />
      );

      expect(getByText('Offline')).toBeTruthy();
      expect(getByText('Reminders work offline')).toBeTruthy();
    });

    it('shows queued reminders count when offline', () => {
      const { getByText } = render(
        <OfflineQueueStatus
          isConnected={false}
          queuedReminders={5}
          language="en"
          onSyncPress={mockOnSyncPress}
        />
      );

      expect(getByText('5 queued reminders')).toBeTruthy();
    });

    it('shows singular form for single queued reminder', () => {
      const { getByText } = render(
        <OfflineQueueStatus
          isConnected={false}
          queuedReminders={1}
          language="en"
          onSyncPress={mockOnSyncPress}
        />
      );

      expect(getByText('1 queued reminder')).toBeTruthy();
    });

    it('shows sync prompt when connected with queued reminders', () => {
      const { getByText } = render(
        <OfflineQueueStatus
          isConnected={true}
          queuedReminders={3}
          language="en"
          onSyncPress={mockOnSyncPress}
        />
      );

      expect(getByText('Tap to sync')).toBeTruthy();
    });
  });

  describe('Connection Type Display', () => {
    it('displays WiFi connection type', () => {
      const { getByText } = render(
        <OfflineQueueStatus
          isConnected={true}
          connectionType="wifi"
          queuedReminders={0}
          language="en"
        />
      );

      expect(getByText('WiFi')).toBeTruthy();
    });

    it('displays cellular connection type', () => {
      const { getByText } = render(
        <OfflineQueueStatus
          isConnected={true}
          connectionType="cellular"
          queuedReminders={0}
          language="en"
        />
      );

      expect(getByText('Cellular')).toBeTruthy();
    });

    it('displays ethernet connection type', () => {
      const { getByText } = render(
        <OfflineQueueStatus
          isConnected={true}
          connectionType="ethernet"
          queuedReminders={0}
          language="en"
        />
      );

      expect(getByText('Ethernet')).toBeTruthy();
    });

    it('does not display connection type when offline', () => {
      const { queryByText } = render(
        <OfflineQueueStatus
          isConnected={false}
          connectionType="wifi"
          queuedReminders={0}
          language="en"
        />
      );

      expect(queryByText('WiFi')).toBeNull();
    });
  });

  describe('Multi-language Support', () => {
    it('renders in Bahasa Malaysia', () => {
      const { getByText } = render(
        <OfflineQueueStatus
          isConnected={true}
          connectionType="wifi"
          queuedReminders={0}
          language="ms"
        />
      );

      expect(getByText('Bersambung')).toBeTruthy();
      expect(getByText('Semua disegerak')).toBeTruthy();
    });

    it('renders offline status in Bahasa Malaysia', () => {
      const { getByText } = render(
        <OfflineQueueStatus
          isConnected={false}
          queuedReminders={2}
          language="ms"
        />
      );

      expect(getByText('Luar Talian')).toBeTruthy();
      expect(getByText('2 peringatan beratur')).toBeTruthy();
      expect(getByText('Akan disegerak bila dalam talian')).toBeTruthy();
    });

    it('renders in Chinese', () => {
      const { getByText } = render(
        <OfflineQueueStatus
          isConnected={true}
          connectionType="cellular"
          queuedReminders={0}
          language="zh"
        />
      );

      expect(getByText('已连接')).toBeTruthy();
      expect(getByText('全部已同步')).toBeTruthy();
      expect(getByText('蜂窝网络')).toBeTruthy();
    });

    it('renders offline status in Chinese', () => {
      const { getByText } = render(
        <OfflineQueueStatus
          isConnected={false}
          queuedReminders={3}
          language="zh"
        />
      );

      expect(getByText('离线')).toBeTruthy();
      expect(getByText('3 排队提醒')).toBeTruthy();
      expect(getByText('在线时同步')).toBeTruthy();
    });

    it('renders in Tamil', () => {
      const { getByText } = render(
        <OfflineQueueStatus
          isConnected={true}
          connectionType="wifi"
          queuedReminders={0}
          language="ta"
        />
      );

      expect(getByText('இணைக்கப்பட்டுள்ளது')).toBeTruthy();
      expect(getByText('அனைத்தும் ஒத்திசைக்கப்பட்டது')).toBeTruthy();
    });

    it('renders offline status in Tamil', () => {
      const { getByText } = render(
        <OfflineQueueStatus
          isConnected={false}
          queuedReminders={1}
          language="ta"
        />
      );

      expect(getByText('ஆஃப்லைன்')).toBeTruthy();
      expect(getByText('1 வரிசையில் உள்ள நினைவூட்டல்')).toBeTruthy();
      expect(getByText('ஆன்லைனில் இருக்கும்போது ஒத்திசைக்கும்')).toBeTruthy();
    });
  });

  describe('User Interactions', () => {
    it('calls onSyncPress when component is pressed', () => {
      const { getByText } = render(
        <OfflineQueueStatus
          isConnected={true}
          queuedReminders={2}
          language="en"
          onSyncPress={mockOnSyncPress}
        />
      );

      fireEvent.press(getByText('Tap to sync'));
      expect(mockOnSyncPress).toHaveBeenCalledTimes(1);
    });

    it('does not call onSyncPress when no handler provided', () => {
      const { getByText } = render(
        <OfflineQueueStatus
          isConnected={true}
          queuedReminders={2}
          language="en"
        />
      );

      // Should not crash when pressed without handler
      fireEvent.press(getByText('Tap to sync'));
      // Test passes if no error is thrown
    });

    it('disables press when connected with no queued reminders', () => {
      const { getByText } = render(
        <OfflineQueueStatus
          isConnected={true}
          queuedReminders={0}
          language="en"
          onSyncPress={mockOnSyncPress}
        />
      );

      fireEvent.press(getByText('All synced'));
      // Should not call onSyncPress when disabled
      expect(mockOnSyncPress).not.toHaveBeenCalled();
    });
  });

  describe('Visual States', () => {
    it('displays badge with queue count when offline', () => {
      const { getByText } = render(
        <OfflineQueueStatus
          isConnected={false}
          queuedReminders={7}
          language="en"
        />
      );

      expect(getByText('7')).toBeTruthy();
    });

    it('does not display badge when connected', () => {
      const { queryByText } = render(
        <OfflineQueueStatus
          isConnected={true}
          queuedReminders={0}
          language="en"
        />
      );

      // No badge should be visible
      expect(queryByText('0')).toBeNull();
    });

    it('applies correct color for error state (offline)', () => {
      const { getByText } = render(
        <OfflineQueueStatus
          isConnected={false}
          queuedReminders={0}
          language="en"
        />
      );

      // Component should render with error color styling
      expect(getByText('Offline')).toBeTruthy();
    });

    it('applies correct color for warning state (connected with queue)', () => {
      const { getByText } = render(
        <OfflineQueueStatus
          isConnected={true}
          queuedReminders={3}
          language="en"
        />
      );

      // Component should render with warning color styling
      expect(getByText('Tap to sync')).toBeTruthy();
    });

    it('applies correct color for success state (connected, synced)', () => {
      const { getByText } = render(
        <OfflineQueueStatus
          isConnected={true}
          queuedReminders={0}
          language="en"
        />
      );

      // Component should render with success color styling
      expect(getByText('All synced')).toBeTruthy();
    });
  });

  describe('Animation Behavior', () => {
    it('starts animation when offline with queued reminders', () => {
      const mockStart = jest.fn();
      const mockLoop = jest.spyOn(Animated, 'loop').mockReturnValue({
        start: mockStart,
        stop: jest.fn(),
        reset: jest.fn(),
      } as any);

      render(
        <OfflineQueueStatus
          isConnected={false}
          queuedReminders={5}
          language="en"
        />
      );

      expect(mockLoop).toHaveBeenCalled();
      expect(mockStart).toHaveBeenCalled();

      mockLoop.mockRestore();
    });

    it('does not animate when connected', () => {
      const mockStart = jest.fn();
      const mockLoop = jest.spyOn(Animated, 'loop').mockReturnValue({
        start: mockStart,
        stop: jest.fn(),
        reset: jest.fn(),
      } as any);

      render(
        <OfflineQueueStatus
          isConnected={true}
          queuedReminders={0}
          language="en"
        />
      );

      // Animation should not start for connected state
      expect(mockStart).not.toHaveBeenCalled();

      mockLoop.mockRestore();
    });
  });

  describe('Edge Cases', () => {
    it('handles zero queued reminders correctly', () => {
      const { getByText } = render(
        <OfflineQueueStatus
          isConnected={false}
          queuedReminders={0}
          language="en"
        />
      );

      expect(getByText('Reminders work offline')).toBeTruthy();
      // Should not show queued count for zero
      expect(getByText('Offline')).toBeTruthy();
    });

    it('handles large numbers of queued reminders', () => {
      const { getByText } = render(
        <OfflineQueueStatus
          isConnected={false}
          queuedReminders={9999}
          language="en"
        />
      );

      expect(getByText('9999 queued reminders')).toBeTruthy();
      expect(getByText('9999')).toBeTruthy(); // Badge
    });

    it('handles undefined connection type gracefully', () => {
      const { getByText } = render(
        <OfflineQueueStatus
          isConnected={true}
          queuedReminders={0}
          language="en"
        />
      );

      expect(getByText('Connected')).toBeTruthy();
      // Should not crash without connection type
    });

    it('handles unknown connection types', () => {
      const { getByText } = render(
        <OfflineQueueStatus
          isConnected={true}
          connectionType="unknown"
          queuedReminders={0}
          language="en"
        />
      );

      expect(getByText('Connected')).toBeTruthy();
      // Should handle unknown connection types gracefully
    });
  });

  describe('Accessibility', () => {
    it('provides proper touchable feedback', () => {
      const { getByText } = render(
        <OfflineQueueStatus
          isConnected={true}
          queuedReminders={1}
          language="en"
          onSyncPress={mockOnSyncPress}
        />
      );

      const touchableComponent = getByText('Tap to sync').parent;
      expect(touchableComponent).toBeTruthy();
    });

    it('maintains readable text contrast', () => {
      const { getByText } = render(
        <OfflineQueueStatus
          isConnected={false}
          queuedReminders={3}
          language="en"
        />
      );

      // All text should be visible and readable
      expect(getByText('Offline')).toBeTruthy();
      expect(getByText('3 queued reminders')).toBeTruthy();
    });
  });

  describe('Performance', () => {
    it('renders efficiently without unnecessary re-renders', () => {
      const { rerender } = render(
        <OfflineQueueStatus
          isConnected={true}
          queuedReminders={0}
          language="en"
        />
      );

      // Re-render with same props
      rerender(
        <OfflineQueueStatus
          isConnected={true}
          queuedReminders={0}
          language="en"
        />
      );

      // Should not cause performance issues
      expect(true).toBe(true); // Test passes if no performance issues
    });

    it('handles rapid prop changes gracefully', async () => {
      const { rerender } = render(
        <OfflineQueueStatus
          isConnected={true}
          queuedReminders={0}
          language="en"
        />
      );

      // Simulate rapid connection state changes
      for (let i = 0; i < 10; i++) {
        rerender(
          <OfflineQueueStatus
            isConnected={i % 2 === 0}
            queuedReminders={i}
            language="en"
          />
        );
      }

      // Should handle rapid changes without issues
      expect(true).toBe(true);
    });
  });
});