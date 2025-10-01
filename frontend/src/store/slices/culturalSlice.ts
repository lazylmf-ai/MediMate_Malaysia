/**
 * Cultural Profile Redux Slice
 * 
 * Manages cultural preferences, prayer times, language settings,
 * and family structure for Malaysian cultural intelligence.
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiService } from '@/services/api';
import { storageService } from '@/services/storage';
import type { CulturalProfile } from '@/types/auth';
import { APP_SETTINGS } from '@/constants/config';

interface CulturalState {
  profile: CulturalProfile | null;
  prayerTimes: any | null;
  festivals: any[] | null;
  isLoading: boolean;
  error: string | null;
  lastUpdated: string | null;
}

const initialState: CulturalState = {
  profile: null,
  prayerTimes: null,
  festivals: null,
  isLoading: false,
  error: null,
  lastUpdated: null,
};

// Async thunks
export const loadCulturalProfile = createAsyncThunk(
  'cultural/loadProfile',
  async (_, { rejectWithValue }) => {
    try {
      // Try to load from local storage first
      const storedProfile = await storageService.getCulturalProfile();
      if (storedProfile) {
        return storedProfile;
      }

      // Fetch from API if not in storage
      const response = await apiService.getCulturalSettings();
      if (response.success && response.data) {
        await storageService.storeCulturalProfile(response.data);
        return response.data;
      }

      return rejectWithValue(response.error || 'Failed to load cultural profile');
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to load cultural profile');
    }
  }
);

export const updateCulturalProfile = createAsyncThunk(
  'cultural/updateProfile',
  async (updates: Partial<CulturalProfile>, { rejectWithValue, getState }) => {
    try {
      const response = await apiService.updateCulturalSettings(updates);
      
      if (response.success && response.data) {
        // Store updated profile locally
        await storageService.storeCulturalProfile(response.data);
        return response.data;
      }
      
      return rejectWithValue(response.error || 'Failed to update cultural profile');
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to update cultural profile');
    }
  }
);

export const fetchPrayerTimes = createAsyncThunk(
  'cultural/fetchPrayerTimes',
  async ({ latitude, longitude }: { latitude: number; longitude: number }, { rejectWithValue }) => {
    try {
      const response = await apiService.getPrayerTimes(latitude, longitude);
      
      if (response.success && response.data) {
        return response.data;
      }
      
      return rejectWithValue(response.error || 'Failed to fetch prayer times');
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch prayer times');
    }
  }
);

export const fetchFestivals = createAsyncThunk(
  'cultural/fetchFestivals',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiService.getFestivals();
      
      if (response.success && response.data) {
        return response.data;
      }
      
      return rejectWithValue(response.error || 'Failed to fetch festivals');
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : 'Failed to fetch festivals');
    }
  }
);

// Cultural slice
const culturalSlice = createSlice({
  name: 'cultural',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setLanguage: (state, action: PayloadAction<'ms' | 'en' | 'zh' | 'ta'>) => {
      if (state.profile) {
        state.profile.language = action.payload;
      }
    },
    setPrayerTimeEnabled: (state, action: PayloadAction<boolean>) => {
      if (state.profile) {
        state.profile.prayerTimes.enabled = action.payload;
      }
    },
    updatePrayerTimeAdjustments: (state, action: PayloadAction<Partial<typeof state.profile.prayerTimes.adjustments>>) => {
      if (state.profile) {
        state.profile.prayerTimes.adjustments = {
          ...state.profile.prayerTimes.adjustments,
          ...action.payload,
        };
      }
    },
    updateFamilyStructure: (state, action: PayloadAction<Partial<typeof state.profile.familyStructure>>) => {
      if (state.profile) {
        state.profile.familyStructure = {
          ...state.profile.familyStructure,
          ...action.payload,
        };
      }
    },
    updateFestivalPreferences: (state, action: PayloadAction<Partial<typeof state.profile.festivals>>) => {
      if (state.profile) {
        state.profile.festivals = {
          ...state.profile.festivals,
          ...action.payload,
        };
      }
    },
    clearCulturalData: (state) => {
      state.profile = null;
      state.prayerTimes = null;
      state.festivals = null;
      state.lastUpdated = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // Load Cultural Profile
    builder
      .addCase(loadCulturalProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loadCulturalProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.profile = action.payload;
        state.lastUpdated = new Date().toISOString();
        state.error = null;
      })
      .addCase(loadCulturalProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Update Cultural Profile
    builder
      .addCase(updateCulturalProfile.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(updateCulturalProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.profile = action.payload;
        state.lastUpdated = new Date().toISOString();
        state.error = null;
      })
      .addCase(updateCulturalProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch Prayer Times
    builder
      .addCase(fetchPrayerTimes.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchPrayerTimes.fulfilled, (state, action) => {
        state.isLoading = false;
        state.prayerTimes = action.payload;
        state.error = null;
      })
      .addCase(fetchPrayerTimes.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Fetch Festivals
    builder
      .addCase(fetchFestivals.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchFestivals.fulfilled, (state, action) => {
        state.isLoading = false;
        state.festivals = action.payload;
        state.error = null;
      })
      .addCase(fetchFestivals.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  clearError,
  setLanguage,
  setPrayerTimeEnabled,
  updatePrayerTimeAdjustments,
  updateFamilyStructure,
  updateFestivalPreferences,
  clearCulturalData,
} = culturalSlice.actions;

// Selectors
export const selectCulturalPreferences = (state: any) => state.cultural.profile;
export const selectPrayerTimes = (state: any) => state.cultural.prayerTimes;
export const selectFestivals = (state: any) => state.cultural.festivals;
export const selectCulturalLoading = (state: any) => state.cultural.isLoading;
export const selectCulturalError = (state: any) => state.cultural.error;
export const selectLastUpdated = (state: any) => state.cultural.lastUpdated;

// Prayer time specific selectors
export const selectPrayerTimeEnabled = (state: any) => 
  state.cultural.profile?.prayerTimes?.enabled ?? false;
export const selectPrayerTimeMadhab = (state: any) => 
  state.cultural.profile?.prayerTimes?.madhab ?? 'shafi';
export const selectPrayerTimeAdjustments = (state: any) => 
  state.cultural.profile?.prayerTimes?.adjustments;

// Location selectors
export const selectUserLocation = (state: any) => 
  state.cultural.profile?.location;
export const selectUserLanguage = (state: any) => 
  state.cultural.profile?.language ?? 'en';

// Enhanced selectors for i18n integration
export const selectLanguagePreferences = (state: any) => ({
  language: state.cultural.profile?.language ?? 'en',
  fallbackLanguage: 'en',
  culturalContext: {
    religion: state.cultural.profile?.religion,
    primaryCulture: state.cultural.profile?.primaryCulture,
    region: state.cultural.profile?.location?.state,
  },
});

export const selectAccessibilitySettings = (state: any) => ({
  elderlyMode: state.cultural.profile?.accessibility?.elderlyOptimizations?.largeButtons ?? false,
  highContrast: state.cultural.profile?.accessibility?.highContrast ?? false,
  textScaling: state.cultural.profile?.accessibility?.textSize === 'large' ? 1.2 : 1.0,
  voiceGuidance: state.cultural.profile?.accessibility?.voiceGuidance ?? false,
});

export const selectCulturalThemePreferences = (state: any) => ({
  language: state.cultural.profile?.language ?? 'en',
  primaryCulture: state.cultural.profile?.primaryCulture ?? 'mixed',
  elderlyMode: state.cultural.profile?.accessibility?.elderlyOptimizations?.largeButtons ?? false,
  highContrast: state.cultural.profile?.accessibility?.highContrast ?? false,
});

export const selectMedicationCulturalContext = (state: any) => ({
  language: state.cultural.profile?.language ?? 'en',
  religion: state.cultural.profile?.religion,
  prayerTimesEnabled: state.cultural.profile?.prayerTimes?.enabled ?? false,
  madhab: state.cultural.profile?.prayerTimes?.madhab ?? 'shafi',
  halalValidationEnabled: state.cultural.profile?.dietary?.halal ?? false,
  elderlyMode: state.cultural.profile?.accessibility?.elderlyOptimizations?.largeButtons ?? false,
  familyStructure: state.cultural.profile?.familyStructure,
});

export default culturalSlice.reducer;