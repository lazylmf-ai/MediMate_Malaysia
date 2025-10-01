/**
 * Cultural Scheduling Interface Component Tests
 *
 * Comprehensive tests for the cultural scheduling engine interface including
 * scheduling optimization, cultural adaptations, and medication timing.
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { CulturalSchedulingInterface } from '../scheduling/CulturalSchedulingInterface';
import { useCulturalScheduling } from '../../../hooks/cultural';
import { useTranslation, useCulturalFormatting } from '../../../i18n';

// Mock dependencies
jest.mock('../../../hooks/cultural');
jest.mock('../../../i18n');
jest.mock('react-native', () => ({
  ...jest.requireActual('react-native'),
  Alert: {
    alert: jest.fn(),
  },
}));

const mockUseCulturalScheduling = useCulturalScheduling as jest.MockedFunction<typeof useCulturalScheduling>;
const mockUseTranslation = useTranslation as jest.MockedFunction<typeof useTranslation>;
const mockUseCulturalFormatting = useCulturalFormatting as jest.MockedFunction<typeof useCulturalFormatting>;
const mockAlert = Alert.alert as jest.MockedFunction<typeof Alert.alert>;

describe('CulturalSchedulingInterface', () => {
  const mockCurrentSchedule = {
    id: 'med-1',
    medicationName: 'Test Medication',
    frequency: 'twice_daily' as const,
    timingPreference: 'with_meals' as const,
    currentTimes: [
      new Date('2024-01-01T08:00:00Z'),
      new Date('2024-01-01T20:00:00Z')
    ]
  };

  const mockOptimizedSchedule = {
    originalSchedule: mockCurrentSchedule,
    optimizedTimes: [
      new Date('2024-01-01T07:30:00Z'),
      new Date('2024-01-01T19:45:00Z')
    ],
    culturalAdaptations: [
      {
        type: 'prayer_avoidance' as const,
        description: 'Adjusted to avoid Fajr prayer time',
        timeAdjustment: -30,
        culturalReason: 'Respecting prayer schedule',
        priority: 'high' as const
      },
      {
        type: 'meal_alignment' as const,
        description: 'Aligned with traditional Malaysian dinner time',
        timeAdjustment: -15,
        culturalReason: 'Better absorption with family meal',
        priority: 'medium' as const
      }
    ],
    mealTimingAlignment: [
      {
        mealType: 'breakfast' as const,
        traditionalTime: '7:30 AM',
        culturalContext: 'malay' as const,
        familyPattern: true
      },
      {
        mealType: 'dinner' as const,
        traditionalTime: '7:45 PM',
        culturalContext: 'malay' as const,
        familyPattern: true
      }
    ],
    familyConsiderations: [
      {
        type: 'elderly_care' as const,
        description: 'Timing allows for elder supervision',
        impact: 'positive' as const,
        suggestion: 'Take medication during family breakfast'
      }
    ],
    conflictResolutions: [
      {
        originalTime: new Date('2024-01-01T08:00:00Z'),
        conflictType: 'prayer_time' as const,
        resolvedTime: new Date('2024-01-01T07:30:00Z'),
        reasoning: 'Moved before Fajr prayer time'
      }
    ],
    adherenceScore: 0.85
  };

  const mockPreferences = {
    enableMealAlignment: true,
    enablePrayerAvoidance: true,
    enableFamilyConsideration: true,
    mealPatternPreference: 'traditional' as const,
    familyStructureType: 'multi_generational' as const,
    workScheduleType: 'standard' as const,
    festivalAdjustments: true,
    elderlyOptimizations: true
  };

  const defaultMockReturn = {
    optimizedSchedule: mockOptimizedSchedule,
    culturalInsights: [],
    familyPatterns: [],
    mealPatterns: [],
    preferences: mockPreferences,
    isOptimizing: false,
    error: null,
    optimizeSchedule: jest.fn(),
    updatePreferences: jest.fn(),
    applyOptimizations: jest.fn(),
    getAdherencePreview: jest.fn()
  };

  const defaultTranslations = {
    t: jest.fn((key: string, params?: any) => {
      const translations: Record<string, string> = {
        'scheduling.cultural_optimization': 'Cultural Optimization',
        'scheduling.adherence_score': 'Adherence Score',
        'scheduling.schedule_comparison': 'Schedule Comparison',
        'scheduling.original': 'Original',
        'scheduling.optimized': 'Optimized',
        'scheduling.cultural_adaptations': 'Cultural Adaptations',
        'scheduling.meal_alignment': 'Meal Alignment',
        'scheduling.family_considerations': 'Family Considerations',
        'scheduling.apply_title': 'Apply Optimization',
        'scheduling.apply_confirmation': 'Apply {{adaptations}} adaptations with {{adherenceScore}}% adherence score?',
        'scheduling.applied_title': 'Optimization Applied',
        'scheduling.applied_message': 'Your medication schedule has been optimized',
        'scheduling.apply_optimization': 'Apply Optimization',
        'scheduling.preview_changes': 'Preview Changes',
        'scheduling.exit_preview': 'Exit Preview',
        'scheduling.preferences_title': 'Scheduling Preferences',
        'scheduling.enable_meal_alignment': 'Enable Meal Alignment',
        'scheduling.enable_prayer_avoidance': 'Enable Prayer Avoidance',
        'scheduling.enable_family_consideration': 'Enable Family Consideration',
        'scheduling.festival_adjustments': 'Festival Adjustments',
        'scheduling.elderly_optimizations': 'Elderly Optimizations',
        'scheduling.optimizing': 'Optimizing Schedule...',
        'scheduling.analyzing_patterns': 'Analyzing cultural patterns',
        'scheduling.no_schedule': 'No medication schedule available',
        'scheduling.adherence_excellent': 'Excellent adherence predicted',
        'scheduling.adherence_good': 'Good adherence predicted',
        'common.cancel': 'Cancel',
        'common.apply': 'Apply',
        'common.retry': 'Retry',
        'common.error': 'Error',
        'common.close': 'Close'
      };

      let translation = translations[key] || key;
      if (params) {
        Object.keys(params).forEach(param => {
          translation = translation.replace(`{{${param}}}`, params[param]);
        });
      }
      return translation;
    }),
    tCultural: jest.fn((key: string) => {
      const culturalTranslations: Record<string, string> = {
        'adaptation.prayer_avoidance': 'Prayer Time Avoidance',
        'adaptation.meal_alignment': 'Meal Time Alignment',
        'adaptation.family_routine': 'Family Routine Consideration',
        'meal.breakfast': 'Breakfast',
        'meal.dinner': 'Dinner',
        'culture.malay': 'Malay',
        'family.elderly_care': 'Elderly Care',
        'culture.chinese': 'Chinese',
        'culture.indian': 'Indian'
      };
      return culturalTranslations[key] || key;
    })
  };

  const defaultFormatting = {
    formatTime: jest.fn((time: Date) => time.toLocaleTimeString('en-MY', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    }))
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseCulturalScheduling.mockReturnValue(defaultMockReturn);
    mockUseTranslation.mockReturnValue(defaultTranslations);
    mockUseCulturalFormatting.mockReturnValue(defaultFormatting);
  });

  describe('Rendering', () => {
    it('should render cultural scheduling interface successfully', () => {
      const { getByText } = render(
        <CulturalSchedulingInterface
          currentSchedule={mockCurrentSchedule}
          medicationId="med-1"
        />
      );

      expect(getByText('Cultural Optimization')).toBeTruthy();
      expect(getByText('Adherence Score')).toBeTruthy();
      expect(getByText('85%')).toBeTruthy();
    });

    it('should display loading state while optimizing', () => {
      mockUseCulturalScheduling.mockReturnValue({
        ...defaultMockReturn,
        isOptimizing: true
      });

      const { getByText } = render(
        <CulturalSchedulingInterface
          currentSchedule={mockCurrentSchedule}
          medicationId="med-1"
        />
      );

      expect(getByText('Optimizing Schedule...')).toBeTruthy();
      expect(getByText('Analyzing cultural patterns')).toBeTruthy();
    });

    it('should display error state with retry option', () => {
      const mockOptimizeSchedule = jest.fn();
      mockUseCulturalScheduling.mockReturnValue({
        ...defaultMockReturn,
        error: 'Failed to optimize schedule',
        optimizeSchedule: mockOptimizeSchedule,
        optimizedSchedule: null
      });

      const { getByText } = render(
        <CulturalSchedulingInterface
          currentSchedule={mockCurrentSchedule}
          medicationId="med-1"
        />
      );

      expect(getByText('Failed to optimize schedule')).toBeTruthy();

      const retryButton = getByText('Retry');
      fireEvent.press(retryButton);

      expect(mockOptimizeSchedule).toHaveBeenCalledWith(mockCurrentSchedule, 'med-1');
    });

    it('should display empty state when no schedule provided', () => {
      const { getByText } = render(<CulturalSchedulingInterface />);

      expect(getByText('No medication schedule available')).toBeTruthy();
    });
  });

  describe('Schedule Comparison', () => {
    it('should display original vs optimized times', () => {
      const { getByText } = render(
        <CulturalSchedulingInterface
          currentSchedule={mockCurrentSchedule}
          medicationId="med-1"
        />
      );

      expect(getByText('Schedule Comparison')).toBeTruthy();
      expect(getByText('Original')).toBeTruthy();
      expect(getByText('Optimized')).toBeTruthy();

      // Should show formatted times
      expect(getByText('8:00 AM')).toBeTruthy(); // Original morning time
      expect(getByText('7:30 AM')).toBeTruthy(); // Optimized morning time
      expect(getByText('8:00 PM')).toBeTruthy(); // Original evening time
      expect(getByText('7:45 PM')).toBeTruthy(); // Optimized evening time
    });

    it('should highlight optimized times that changed significantly', () => {
      const { getByText } = render(
        <CulturalSchedulingInterface
          currentSchedule={mockCurrentSchedule}
          medicationId="med-1"
        />
      );

      // Both times changed by more than 15 minutes, should show optimization indicators
      expect(getByText('7:30 AM')).toBeTruthy();
      expect(getByText('7:45 PM')).toBeTruthy();
    });
  });

  describe('Cultural Adaptations', () => {
    it('should display cultural adaptations with details', () => {
      const { getByText } = render(
        <CulturalSchedulingInterface
          currentSchedule={mockCurrentSchedule}
          medicationId="med-1"
        />
      );

      expect(getByText('Cultural Adaptations')).toBeTruthy();
      expect(getByText('Prayer Time Avoidance')).toBeTruthy();
      expect(getByText('Adjusted to avoid Fajr prayer time')).toBeTruthy();
      expect(getByText('Respecting prayer schedule')).toBeTruthy();
      expect(getByText('-30min')).toBeTruthy();

      expect(getByText('Meal Time Alignment')).toBeTruthy();
      expect(getByText('Aligned with traditional Malaysian dinner time')).toBeTruthy();
      expect(getByText('Better absorption with family meal')).toBeTruthy();
      expect(getByText('-15min')).toBeTruthy();
    });

    it('should show different priority colors for adaptations', () => {
      const { getByText } = render(
        <CulturalSchedulingInterface
          currentSchedule={mockCurrentSchedule}
          medicationId="med-1"
        />
      );

      // High priority adaptation should be visible
      expect(getByText('Prayer Time Avoidance')).toBeTruthy();
      // Medium priority adaptation should be visible
      expect(getByText('Meal Time Alignment')).toBeTruthy();
    });

    it('should open adaptation details when tapped', async () => {
      const { getByText } = render(
        <CulturalSchedulingInterface
          currentSchedule={mockCurrentSchedule}
          medicationId="med-1"
        />
      );

      const adaptationItem = getByText('Prayer Time Avoidance');
      fireEvent.press(adaptationItem);

      await waitFor(() => {
        expect(getByText('Adjusted to avoid Fajr prayer time')).toBeTruthy();
        expect(getByText('Respecting prayer schedule')).toBeTruthy();
      });
    });
  });

  describe('Meal Alignment', () => {
    it('should display meal timing alignments', () => {
      const { getByText } = render(
        <CulturalSchedulingInterface
          currentSchedule={mockCurrentSchedule}
          medicationId="med-1"
        />
      );

      expect(getByText('Meal Alignment')).toBeTruthy();
      expect(getByText('Breakfast')).toBeTruthy();
      expect(getByText('7:30 AM')).toBeTruthy();
      expect(getByText('Malay • Family Pattern')).toBeTruthy();

      expect(getByText('Dinner')).toBeTruthy();
      expect(getByText('7:45 PM')).toBeTruthy();
    });
  });

  describe('Family Considerations', () => {
    it('should display family considerations with suggestions', () => {
      const { getByText } = render(
        <CulturalSchedulingInterface
          currentSchedule={mockCurrentSchedule}
          medicationId="med-1"
        />
      );

      expect(getByText('Family Considerations')).toBeTruthy();
      expect(getByText('Elderly Care')).toBeTruthy();
      expect(getByText('Timing allows for elder supervision')).toBeTruthy();
      expect(getByText('💡 Take medication during family breakfast')).toBeTruthy();
    });
  });

  describe('Preferences Management', () => {
    it('should open preferences modal when settings is tapped', async () => {
      const { getByText, getByRole } = render(
        <CulturalSchedulingInterface
          currentSchedule={mockCurrentSchedule}
          medicationId="med-1"
        />
      );

      const settingsButton = getByRole('button', { name: /settings/i });
      fireEvent.press(settingsButton);

      await waitFor(() => {
        expect(getByText('Scheduling Preferences')).toBeTruthy();
      });
    });

    it('should display preference switches in modal', async () => {
      const { getByText, getByRole } = render(
        <CulturalSchedulingInterface
          currentSchedule={mockCurrentSchedule}
          medicationId="med-1"
        />
      );

      const settingsButton = getByRole('button', { name: /settings/i });
      fireEvent.press(settingsButton);

      await waitFor(() => {
        expect(getByText('Enable Meal Alignment')).toBeTruthy();
        expect(getByText('Enable Prayer Avoidance')).toBeTruthy();
        expect(getByText('Enable Family Consideration')).toBeTruthy();
        expect(getByText('Festival Adjustments')).toBeTruthy();
        expect(getByText('Elderly Optimizations')).toBeTruthy();
      });
    });

    it('should handle preference changes', async () => {
      const mockUpdatePreferences = jest.fn();
      const mockOnPreferencesChange = jest.fn();

      mockUseCulturalScheduling.mockReturnValue({
        ...defaultMockReturn,
        updatePreferences: mockUpdatePreferences
      });

      const { getByText, getByRole } = render(
        <CulturalSchedulingInterface
          currentSchedule={mockCurrentSchedule}
          medicationId="med-1"
          onPreferencesChange={mockOnPreferencesChange}
        />
      );

      const settingsButton = getByRole('button', { name: /settings/i });
      fireEvent.press(settingsButton);

      await waitFor(() => {
        const mealAlignmentSwitch = getByRole('switch', { name: /meal alignment/i });
        fireEvent(mealAlignmentSwitch, 'valueChange', false);
      });

      expect(mockUpdatePreferences).toHaveBeenCalledWith(
        expect.objectContaining({
          enableMealAlignment: false
        })
      );
      expect(mockOnPreferencesChange).toHaveBeenCalled();
    });
  });

  describe('Schedule Application', () => {
    it('should show confirmation when applying optimization', async () => {
      const { getByText } = render(
        <CulturalSchedulingInterface
          currentSchedule={mockCurrentSchedule}
          medicationId="med-1"
        />
      );

      const applyButton = getByText('Apply Optimization');
      fireEvent.press(applyButton);

      expect(mockAlert).toHaveBeenCalledWith(
        'Apply Optimization',
        'Apply 2 adaptations with 85% adherence score?',
        expect.arrayContaining([
          { text: 'Cancel', style: 'cancel' },
          { text: 'Apply', onPress: expect.any(Function) }
        ])
      );
    });

    it('should apply optimization when confirmed', async () => {
      const mockApplyOptimizations = jest.fn().mockResolvedValue(undefined);
      const mockOnScheduleUpdate = jest.fn();

      mockUseCulturalScheduling.mockReturnValue({
        ...defaultMockReturn,
        applyOptimizations: mockApplyOptimizations
      });

      const { getByText } = render(
        <CulturalSchedulingInterface
          currentSchedule={mockCurrentSchedule}
          medicationId="med-1"
          onScheduleUpdate={mockOnScheduleUpdate}
        />
      );

      const applyButton = getByText('Apply Optimization');
      fireEvent.press(applyButton);

      // Simulate user confirmation
      const alertCall = mockAlert.mock.calls[0];
      const confirmButton = alertCall[2].find((button: any) => button.text === 'Apply');

      await act(async () => {
        await confirmButton.onPress();
      });

      expect(mockApplyOptimizations).toHaveBeenCalledWith(mockOptimizedSchedule);
      expect(mockOnScheduleUpdate).toHaveBeenCalledWith(mockOptimizedSchedule);

      // Should show success message
      expect(mockAlert).toHaveBeenCalledWith(
        'Optimization Applied',
        'Your medication schedule has been optimized'
      );
    });

    it('should handle application errors gracefully', async () => {
      const mockApplyOptimizations = jest.fn().mockRejectedValue(new Error('Apply failed'));

      mockUseCulturalScheduling.mockReturnValue({
        ...defaultMockReturn,
        applyOptimizations: mockApplyOptimizations
      });

      const { getByText } = render(
        <CulturalSchedulingInterface
          currentSchedule={mockCurrentSchedule}
          medicationId="med-1"
        />
      );

      const applyButton = getByText('Apply Optimization');
      fireEvent.press(applyButton);

      // Simulate user confirmation
      const alertCall = mockAlert.mock.calls[0];
      const confirmButton = alertCall[2].find((button: any) => button.text === 'Apply');

      await act(async () => {
        await confirmButton.onPress();
      });

      expect(mockAlert).toHaveBeenCalledWith('Error', 'Failed to apply optimization');
    });
  });

  describe('Preview Mode', () => {
    it('should toggle preview mode', () => {
      const { getByText } = render(
        <CulturalSchedulingInterface
          currentSchedule={mockCurrentSchedule}
          medicationId="med-1"
        />
      );

      const previewButton = getByText('Preview Changes');
      fireEvent.press(previewButton);

      expect(getByText('Exit Preview')).toBeTruthy();

      fireEvent.press(getByText('Exit Preview'));
      expect(getByText('Preview Changes')).toBeTruthy();
    });
  });

  describe('Adherence Score', () => {
    it('should display adherence score with appropriate indicator', () => {
      const { getByText } = render(
        <CulturalSchedulingInterface
          currentSchedule={mockCurrentSchedule}
          medicationId="med-1"
        />
      );

      expect(getByText('85%')).toBeTruthy();
      expect(getByText('Excellent adherence predicted')).toBeTruthy();
    });

    it('should show warning for low adherence scores', () => {
      const lowScoreSchedule = {
        ...mockOptimizedSchedule,
        adherenceScore: 0.65
      };

      mockUseCulturalScheduling.mockReturnValue({
        ...defaultMockReturn,
        optimizedSchedule: lowScoreSchedule
      });

      const { getByText } = render(
        <CulturalSchedulingInterface
          currentSchedule={mockCurrentSchedule}
          medicationId="med-1"
        />
      );

      expect(getByText('65%')).toBeTruthy();
      expect(getByText('Good adherence predicted')).toBeTruthy();
    });
  });

  describe('Theme Support', () => {
    it('should render correctly with light theme', () => {
      const { getByText } = render(
        <CulturalSchedulingInterface
          currentSchedule={mockCurrentSchedule}
          medicationId="med-1"
          theme="light"
        />
      );

      expect(getByText('Cultural Optimization')).toBeTruthy();
    });

    it('should render correctly with dark theme', () => {
      const { getByText } = render(
        <CulturalSchedulingInterface
          currentSchedule={mockCurrentSchedule}
          medicationId="med-1"
          theme="dark"
        />
      );

      expect(getByText('Cultural Optimization')).toBeTruthy();
    });
  });

  describe('Integration', () => {
    it('should optimize schedule on mount with provided medication', async () => {
      const mockOptimizeSchedule = jest.fn();

      mockUseCulturalScheduling.mockReturnValue({
        ...defaultMockReturn,
        optimizeSchedule: mockOptimizeSchedule
      });

      render(
        <CulturalSchedulingInterface
          currentSchedule={mockCurrentSchedule}
          medicationId="med-1"
        />
      );

      expect(mockOptimizeSchedule).toHaveBeenCalledWith(mockCurrentSchedule, 'med-1');
    });

    it('should not optimize if no current schedule provided', () => {
      const mockOptimizeSchedule = jest.fn();

      mockUseCulturalScheduling.mockReturnValue({
        ...defaultMockReturn,
        optimizeSchedule: mockOptimizeSchedule
      });

      render(<CulturalSchedulingInterface />);

      expect(mockOptimizeSchedule).not.toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have proper accessibility labels for buttons', () => {
      const { getByRole } = render(
        <CulturalSchedulingInterface
          currentSchedule={mockCurrentSchedule}
          medicationId="med-1"
        />
      );

      expect(getByRole('button', { name: /settings/i })).toBeTruthy();
      expect(getByRole('button', { name: /preview/i })).toBeTruthy();
      expect(getByRole('button', { name: /apply/i })).toBeTruthy();
    });

    it('should provide clear section headings', () => {
      const { getByText } = render(
        <CulturalSchedulingInterface
          currentSchedule={mockCurrentSchedule}
          medicationId="med-1"
        />
      );

      expect(getByText('Cultural Optimization')).toBeTruthy();
      expect(getByText('Adherence Score')).toBeTruthy();
      expect(getByText('Schedule Comparison')).toBeTruthy();
      expect(getByText('Cultural Adaptations')).toBeTruthy();
    });
  });
});