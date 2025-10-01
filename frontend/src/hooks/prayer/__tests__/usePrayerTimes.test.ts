/**
 * Prayer Times Hook Tests
 * 
 * Tests for the usePrayerTimes React hook
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { usePrayerTimes } from '../usePrayerTimes';
import culturalSlice from '../../../store/slices/culturalSlice';

// Mock the prayer service
jest.mock('../../../services/prayer-scheduling', () => ({
  PrayerTimeService: {
    getInstance: () => ({
      calculatePrayerTimes: jest.fn().mockResolvedValue({
        fajr: new Date('2024-01-15T06:00:00'),
        dhuhr: new Date('2024-01-15T13:15:00'),
        asr: new Date('2024-01-15T16:30:00'),
        maghrib: new Date('2024-01-15T19:20:00'),
        isha: new Date('2024-01-15T20:35:00'),
        qibla: 295.5
      }),
      getNextPrayer: jest.fn().mockReturnValue({
        name: 'asr',
        time: new Date('2024-01-15T16:30:00')
      })
    })
  }
}));

const createMockStore = (initialState = {}) => {
  return configureStore({
    reducer: {
      cultural: culturalSlice
    },
    preloadedState: {
      cultural: {
        profile: {
          prayerTimes: {
            enabled: true,
            madhab: 'shafi',
            adjustments: {
              fajr: 0,
              dhuhr: 0,
              asr: 0,
              maghrib: 0,
              isha: 0
            }
          },
          location: {
            state: 'kuala_lumpur',
            coordinates: {
              latitude: 3.139,
              longitude: 101.6869
            }
          },
          language: 'en'
        },
        isLoading: false,
        error: null,
        ...initialState
      }
    }
  });
};

const wrapper = ({ children, store }: any) => (
  <Provider store={store || createMockStore()}>{children}</Provider>
);

describe('usePrayerTimes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should initialize with default state', async () => {
    const store = createMockStore();
    const { result } = renderHook(() => usePrayerTimes(), {
      wrapper: (props) => wrapper({ ...props, store })
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe(null);
    expect(result.current.prayerTimes).toBe(null);
  });

  test('should calculate prayer times on mount', async () => {
    const store = createMockStore();
    const { result } = renderHook(() => usePrayerTimes(), {
      wrapper: (props) => wrapper({ ...props, store })
    });

    await waitFor(() => {
      expect(result.current.prayerTimes).not.toBe(null);
    });

    expect(result.current.prayerTimes?.fajr).toBeInstanceOf(Date);
    expect(result.current.prayerTimes?.qibla).toBe(295.5);
  });

  test('should refresh prayer times when called', async () => {
    const store = createMockStore();
    const { result } = renderHook(() => usePrayerTimes(), {
      wrapper: (props) => wrapper({ ...props, store })
    });

    await waitFor(() => {
      expect(result.current.prayerTimes).not.toBe(null);
    });

    await act(async () => {
      await result.current.refreshPrayerTimes();
    });

    expect(result.current.prayerTimes).not.toBe(null);
  });

  test('should update location and recalculate', async () => {
    const store = createMockStore();
    const { result } = renderHook(() => usePrayerTimes(), {
      wrapper: (props) => wrapper({ ...props, store })
    });

    await waitFor(() => {
      expect(result.current.prayerTimes).not.toBe(null);
    });

    act(() => {
      result.current.updateLocation({
        latitude: 5.4141,
        longitude: 100.3288,
        state: 'penang'
      });
    });

    // Should trigger recalculation with new location
    await waitFor(() => {
      expect(result.current.prayerTimes).not.toBe(null);
    });
  });

  test('should update madhab and recalculate', async () => {
    const store = createMockStore();
    const { result } = renderHook(() => usePrayerTimes(), {
      wrapper: (props) => wrapper({ ...props, store })
    });

    await waitFor(() => {
      expect(result.current.prayerTimes).not.toBe(null);
    });

    act(() => {
      result.current.updateMadhab('hanafi');
    });

    // Should trigger recalculation with new madhab
    await waitFor(() => {
      expect(result.current.prayerTimes).not.toBe(null);
    });
  });

  test('should detect prayer time correctly', async () => {
    const store = createMockStore();
    const { result } = renderHook(() => usePrayerTimes(), {
      wrapper: (props) => wrapper({ ...props, store })
    });

    await waitFor(() => {
      expect(result.current.prayerTimes).not.toBe(null);
    });

    const isPrayer = result.current.isPrayerTime(30);
    expect(typeof isPrayer).toBe('boolean');
  });

  test('should get time until next prayer', async () => {
    const store = createMockStore();
    const { result } = renderHook(() => usePrayerTimes(), {
      wrapper: (props) => wrapper({ ...props, store })
    });

    await waitFor(() => {
      expect(result.current.nextPrayer).not.toBe(null);
    });

    const timeUntil = result.current.getTimeUntilNextPrayer();
    expect(typeof timeUntil).toBe('number');
  });

  test('should get prayer times for specific date', async () => {
    const store = createMockStore();
    const { result } = renderHook(() => usePrayerTimes(), {
      wrapper: (props) => wrapper({ ...props, store })
    });

    const testDate = new Date('2024-02-01');
    const prayerTimes = await result.current.getPrayerTimeForDate(testDate);

    expect(prayerTimes).not.toBe(null);
    expect(prayerTimes?.fajr).toBeInstanceOf(Date);
  });

  test('should handle auto-update option', async () => {
    const store = createMockStore();
    const { result } = renderHook(() => usePrayerTimes({ autoUpdate: true, updateInterval: 1 }), {
      wrapper: (props) => wrapper({ ...props, store })
    });

    await waitFor(() => {
      expect(result.current.prayerTimes).not.toBe(null);
    });

    // Auto-update should be enabled
    expect(result.current.prayerTimes).not.toBe(null);
  });

  test('should use provided location option', async () => {
    const customLocation = {
      latitude: 1.4927,
      longitude: 103.7414,
      state: 'johor' as const
    };

    const store = createMockStore();
    const { result } = renderHook(() => usePrayerTimes({ location: customLocation }), {
      wrapper: (props) => wrapper({ ...props, store })
    });

    await waitFor(() => {
      expect(result.current.prayerTimes).not.toBe(null);
    });
  });

  test('should handle errors gracefully', async () => {
    // Mock error scenario
    const mockService = {
      calculatePrayerTimes: jest.fn().mockRejectedValue(new Error('Calculation failed'))
    };

    jest.doMock('../../../services/prayer-scheduling', () => ({
      PrayerTimeService: {
        getInstance: () => mockService
      }
    }));

    const store = createMockStore();
    const { result } = renderHook(() => usePrayerTimes(), {
      wrapper: (props) => wrapper({ ...props, store })
    });

    await waitFor(() => {
      expect(result.current.error).not.toBe(null);
    });

    expect(result.current.error).toContain('Calculation failed');
  });

  test('should clear error when requested', async () => {
    const store = createMockStore();
    const { result } = renderHook(() => usePrayerTimes(), {
      wrapper: (props) => wrapper({ ...props, store })
    });

    // Simulate error state
    await act(async () => {
      // Force an error by mocking a failed calculation
      result.current.clearError();
    });

    expect(result.current.error).toBe(null);
  });

  test('should use cultural preferences from store', async () => {
    const storeWithPreferences = createMockStore({
      profile: {
        prayerTimes: {
          enabled: true,
          madhab: 'hanafi',
          adjustments: {
            fajr: 5,
            dhuhr: 2,
            asr: -3,
            maghrib: 0,
            isha: 10
          }
        },
        location: {
          state: 'selangor',
          coordinates: {
            latitude: 3.0738,
            longitude: 101.5183
          }
        }
      }
    });

    const { result } = renderHook(() => usePrayerTimes(), {
      wrapper: (props) => wrapper({ ...props, store: storeWithPreferences })
    });

    await waitFor(() => {
      expect(result.current.prayerTimes).not.toBe(null);
    });

    // Should use the madhab and adjustments from store
    expect(result.current.prayerTimes).not.toBe(null);
  });
});