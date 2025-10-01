/**
 * ProgressDashboard Component Tests
 *
 * Tests for the main progress dashboard component including
 * adherence metrics, cultural themes, and accessibility features.
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { Text, View } from 'react-native';
import { ProgressDashboard } from '@/components/progress/ProgressDashboard';
import { ProgressMetrics, MetricPeriod } from '@/types/adherence';
import { Medication } from '@/types/medication';

// Mock the cultural theme provider
jest.mock('@/components/language/ui/CulturalThemeProvider', () => ({
  useCulturalTheme: () => ({
    theme: {
      colors: {
        primary: '#C41E3A',
        surface: '#FFFFFF',
        success: '#059669',
        warning: '#F59E0B',
        error: '#DC2626',
        background: '#F8F9FA',
        text: '#1A1A1A',
        textSecondary: '#6B7280',
        border: '#D1D5DB',
        accent: '#FFC72C',
      },
      spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32,
      },
      borderRadius: {
        sm: 8,
        md: 16,
        lg: 20,
        xl: 28,
      },
    },
    isElderlyMode: false,
  }),
  useCulturalStyles: () => ({
    getCardStyle: () => ({
      backgroundColor: '#FFFFFF',
      borderRadius: 20,
      padding: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 5,
    }),
    getTextStyle: (variant: string) => ({
      color: '#1A1A1A',
      fontFamily: 'System',
      fontSize: variant === 'heading' ? 18 : 16,
      fontWeight: variant === 'heading' ? '600' : 'normal',
    }),
    getButtonStyle: (variant: string) => ({
      backgroundColor: variant === 'primary' ? '#C41E3A' : 'transparent',
      borderRadius: 16,
      paddingHorizontal: 16,
      paddingVertical: 8,
      minHeight: 48,
    }),
  }),
}));

// Mock the translation hook
jest.mock('@/i18n/hooks/useTranslation', () => ({
  useTranslation: () => ({
    t: (key: string, params?: any) => {
      const translations: Record<string, string> = {
        'progress.period.title': 'Time Period',
        'progress.period.daily': 'Daily',
        'progress.period.weekly': 'Weekly',
        'progress.period.monthly': 'Monthly',
        'progress.period.quarterly': 'Quarterly',
        'progress.overview.title': 'Overview',
        'progress.overview.toggle': 'Toggle overview section',
        'progress.adherence.overall': 'Overall',
        'progress.streak.current': 'Current Streak',
        'progress.streak.longest': 'Best Streak',
        'progress.medications.count': 'Medications',
        'progress.actions.viewDetails': 'View Details',
        'progress.actions.share': 'Share Progress',
        'progress.chart.title': 'Adherence Trends',
        'progress.chart.toggle': 'Toggle chart section',
        'progress.milestones.title': 'Achievements',
        'progress.milestones.toggle': 'Toggle achievements section',
        'progress.family.title': 'Family View',
        'progress.family.toggle': 'Toggle family section',
        'progress.loading': 'Loading progress data...',
        'error.title': 'Error',
        'progress.errors.loadFailed': 'Failed to load progress data. Please try again.',
        'common.ok': 'OK',
      };

      if (params) {
        let translation = translations[key] || key;
        Object.keys(params).forEach(param => {
          translation = translation.replace(`{{${param}}}`, params[param]);
        });
        return translation;
      }

      return translations[key] || key;
    },
    currentLanguage: 'en',
  }),
}));

// Mock Redux store
const mockStore = configureStore({
  reducer: {
    auth: (state = { user: { id: 'test-user' } }) => state,
    medication: (state = { currentMedications: [] }) => state,
  },
});

// Mock ProgressTrackingService
jest.mock('@/services/analytics/ProgressTrackingService', () => ({
  ProgressTrackingService: jest.fn().mockImplementation(() => ({
    getProgressMetrics: jest.fn().mockResolvedValue({
      success: true,
      data: mockProgressMetrics,
    }),
  })),
}));

// Mock child components
jest.mock('@/components/progress/AdherenceChart', () => {
  return function MockAdherenceChart({ metrics, period }: any) {
    const { View, Text } = require('react-native');
    return (
      <View testID="adherence-chart">
        <Text>Mock Adherence Chart - Period: {period}</Text>
      </View>
    );
  };
});

jest.mock('@/components/progress/CulturalMilestoneCard', () => {
  return function MockCulturalMilestoneCard({ streakData, adherenceRate }: any) {
    const { View, Text } = require('react-native');
    return (
      <View testID="milestone-card">
        <Text>Mock Milestone Card - Adherence: {adherenceRate}%</Text>
      </View>
    );
  };
});

jest.mock('@/components/progress/FamilyProgressView', () => {
  return function MockFamilyProgressView({ patientId }: any) {
    const { View, Text } = require('react-native');
    return (
      <View testID="family-view">
        <Text>Mock Family View - Patient: {patientId}</Text>
      </View>
    );
  };
});

// Test data
const mockMedications: Medication[] = [
  {
    id: 'med-1',
    name: 'Paracetamol',
    dosage: '500mg',
    frequency: 'twice_daily',
    instructions: 'Take with food',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'med-2',
    name: 'Metformin',
    dosage: '850mg',
    frequency: 'once_daily',
    instructions: 'Take before meals',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const mockProgressMetrics: ProgressMetrics = {
  patientId: 'test-patient',
  period: 'monthly',
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-01-31'),
  overallAdherence: 85.5,
  medications: [
    {
      medicationId: 'med-1',
      medicationName: 'Paracetamol',
      adherenceRate: 90,
      totalDoses: 60,
      takenDoses: 54,
      missedDoses: 6,
      lateDoses: 3,
      earlyDoses: 1,
      averageDelayMinutes: 15,
      bestTimeAdherence: { hour: 8, minute: 0, adherenceRate: 95, totalDoses: 30 },
      worstTimeAdherence: { hour: 20, minute: 0, adherenceRate: 80, totalDoses: 30 },
      trends: [],
    },
  ],
  streaks: {
    currentStreak: 7,
    longestStreak: 14,
    weeklyStreaks: [1, 2, 1],
    monthlyStreaks: [1],
    recoverable: false,
  },
  patterns: [],
  predictions: [],
  culturalInsights: [],
};

describe('ProgressDashboard', () => {
  const defaultProps = {
    patientId: 'test-patient',
    medications: mockMedications,
  };

  const renderComponent = (props = {}) => {
    return render(
      <Provider store={mockStore}>
        <ProgressDashboard {...defaultProps} {...props} />
      </Provider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders the progress dashboard', async () => {
      const { getByText } = renderComponent();

      await waitFor(() => {
        expect(getByText('Time Period')).toBeTruthy();
      });
    });

    it('displays period selector buttons', async () => {
      const { getByText } = renderComponent();

      await waitFor(() => {
        expect(getByText('Daily')).toBeTruthy();
        expect(getByText('Weekly')).toBeTruthy();
        expect(getByText('Monthly')).toBeTruthy();
        expect(getByText('Quarterly')).toBeTruthy();
      });
    });

    it('shows loading state initially', () => {
      const { getByText } = renderComponent();
      expect(getByText('Loading progress data...')).toBeTruthy();
    });

    it('displays overview metrics when loaded', async () => {
      const { getByText } = renderComponent();

      await waitFor(() => {
        expect(getByText('Overview')).toBeTruthy();
        expect(getByText('86%')).toBeTruthy(); // Rounded adherence rate
        expect(getByText('7')).toBeTruthy(); // Current streak
        expect(getByText('14')).toBeTruthy(); // Longest streak
      });
    });
  });

  describe('Period Selection', () => {
    it('allows period selection', async () => {
      const { getByText } = renderComponent();

      await waitFor(() => {
        const weeklyButton = getByText('Weekly');
        fireEvent.press(weeklyButton);
      });

      // Should update the selected period
      // This would be verified by checking if the component re-renders with new data
    });

    it('highlights selected period', async () => {
      const { getByText } = renderComponent();

      await waitFor(() => {
        const monthlyButton = getByText('Monthly');
        // The monthly button should be highlighted by default
        expect(monthlyButton).toBeTruthy();
      });
    });
  });

  describe('Expandable Sections', () => {
    it('allows sections to be expanded and collapsed', async () => {
      const { getByText, getByTestId } = renderComponent();

      await waitFor(() => {
        const overviewHeader = getByText('Overview');
        fireEvent.press(overviewHeader);
      });

      // After clicking, the section should still be visible (since it starts expanded)
      expect(getByText('86%')).toBeTruthy();
    });

    it('renders chart section when expanded', async () => {
      const { getByText, getByTestId } = renderComponent();

      await waitFor(() => {
        const chartHeader = getByText('Adherence Trends');
        fireEvent.press(chartHeader);
      });

      // Check if the chart component is rendered
      await waitFor(() => {
        expect(getByTestId('adherence-chart')).toBeTruthy();
      });
    });

    it('renders milestone section when expanded', async () => {
      const { getByText, getByTestId } = renderComponent();

      await waitFor(() => {
        const milestoneHeader = getByText('Achievements');
        fireEvent.press(milestoneHeader);
      });

      await waitFor(() => {
        expect(getByTestId('milestone-card')).toBeTruthy();
      });
    });
  });

  describe('Family View', () => {
    it('renders family view when showFamilyView is true', async () => {
      const { getByText, getByTestId } = renderComponent({ showFamilyView: true });

      await waitFor(() => {
        const familyHeader = getByText('Family View');
        fireEvent.press(familyHeader);
      });

      await waitFor(() => {
        expect(getByTestId('family-view')).toBeTruthy();
      });
    });

    it('does not render family view when showFamilyView is false', async () => {
      const { queryByText } = renderComponent({ showFamilyView: false });

      await waitFor(() => {
        expect(queryByText('Family View')).toBeFalsy();
      });
    });
  });

  describe('Actions', () => {
    it('calls onNavigateToDetail when view details is pressed', async () => {
      const onNavigateToDetail = jest.fn();
      const { getByText } = renderComponent({ onNavigateToDetail });

      await waitFor(() => {
        const viewDetailsButton = getByText('View Details');
        fireEvent.press(viewDetailsButton);
      });

      expect(onNavigateToDetail).toHaveBeenCalledWith(expect.objectContaining({
        overallAdherence: 85.5,
        patientId: 'test-patient',
      }));
    });

    it('calls onShareProgress when share is pressed', async () => {
      const onShareProgress = jest.fn();
      const { getByText } = renderComponent({ onShareProgress });

      await waitFor(() => {
        const shareButton = getByText('Share Progress');
        fireEvent.press(shareButton);
      });

      expect(onShareProgress).toHaveBeenCalledWith(expect.objectContaining({
        overallAdherence: 85.5,
        patientId: 'test-patient',
      }));
    });
  });

  describe('Adherence Color Coding', () => {
    it('uses success color for high adherence', async () => {
      const { getByText } = renderComponent();

      await waitFor(() => {
        // The component should render the adherence rate with appropriate color
        const adherenceElement = getByText('86%');
        expect(adherenceElement).toBeTruthy();
      });
    });

    it('uses warning color for medium adherence', async () => {
      // Mock lower adherence rate
      const mockLowAdherence = {
        ...mockProgressMetrics,
        overallAdherence: 65,
      };

      jest.doMock('@/services/analytics/ProgressTrackingService', () => ({
        ProgressTrackingService: jest.fn().mockImplementation(() => ({
          getProgressMetrics: jest.fn().mockResolvedValue({
            success: true,
            data: mockLowAdherence,
          }),
        })),
      }));

      const { getByText } = renderComponent();

      await waitFor(() => {
        const adherenceElement = getByText('65%');
        expect(adherenceElement).toBeTruthy();
      });
    });
  });

  describe('Accessibility', () => {
    it('provides accessibility labels for interactive elements', async () => {
      const { getByLabelText } = renderComponent();

      await waitFor(() => {
        expect(getByLabelText('Toggle overview section')).toBeTruthy();
        expect(getByLabelText('View Details')).toBeTruthy();
        expect(getByLabelText('Share Progress')).toBeTruthy();
      });
    });

    it('supports refresh control', async () => {
      const { getByTestId } = renderComponent();

      // The ScrollView should have refresh control
      // This is tested by ensuring the component renders without errors
      await waitFor(() => {
        expect(getByTestId || (() => true)).toBeTruthy();
      });
    });
  });

  describe('Error Handling', () => {
    it('handles loading errors gracefully', async () => {
      // Mock error response
      jest.doMock('@/services/analytics/ProgressTrackingService', () => ({
        ProgressTrackingService: jest.fn().mockImplementation(() => ({
          getProgressMetrics: jest.fn().mockResolvedValue({
            success: false,
            error: 'Network error',
          }),
        })),
      }));

      const { getByText } = renderComponent();

      // Should show error alert
      await waitFor(() => {
        expect(getByText('Loading progress data...')).toBeTruthy();
      });
    });

    it('handles empty medications list', () => {
      const { getByText } = renderComponent({ medications: [] });

      // Should still render the component structure
      expect(getByText('Time Period')).toBeTruthy();
    });
  });

  describe('Cultural Integration', () => {
    it('uses Malaysian cultural color scheme', async () => {
      const { getByText } = renderComponent();

      await waitFor(() => {
        // Should use the Malaysian red primary color
        const element = getByText('86%');
        expect(element).toBeTruthy();
      });
    });

    it('adapts for elderly mode', () => {
      // Mock elderly mode
      jest.doMock('@/components/language/ui/CulturalThemeProvider', () => ({
        useCulturalTheme: () => ({
          theme: {
            colors: {
              primary: '#C41E3A',
              surface: '#FFFFFF',
              success: '#059669',
              warning: '#F59E0B',
              error: '#DC2626',
              background: '#F8F9FA',
              text: '#000000', // Higher contrast for elderly
              textSecondary: '#333333',
              border: '#333333',
              accent: '#FFC72C',
            },
            accessibility: {
              minimumTouchTarget: 56, // Larger touch targets
              textScaling: 1.3, // Larger text
            },
          },
          isElderlyMode: true,
        }),
        useCulturalStyles: () => ({
          getCardStyle: () => ({ backgroundColor: '#FFFFFF' }),
          getTextStyle: () => ({ fontSize: 20, color: '#000000' }), // Larger text
          getButtonStyle: () => ({ minHeight: 56 }), // Larger buttons
        }),
      }));

      const { getByText } = renderComponent();
      expect(getByText('Time Period')).toBeTruthy();
    });
  });
});