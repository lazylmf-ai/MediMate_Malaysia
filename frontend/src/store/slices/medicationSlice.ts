/**
 * Medication Store Slice
 * 
 * Redux store slice for medication management with:
 * - Medication search and autocomplete state
 * - Drug interaction monitoring
 * - Offline sync status tracking
 * - Cultural preferences integration
 * - Malaysian pharmaceutical database state
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { medicationDatabaseService } from '../../services/medication/databaseService';
import { medicationSearchService } from '../../services/medication/searchService';
import { drugInteractionService } from '../../services/medication/interactionService';
import {
  MalaysianMedicationInfo,
  MedicationSearchResult,
  ApiResponse,
} from '../../types/medication';
import type {
  AutocompleteResult,
  SearchOptions,
} from '../../services/medication/searchService';
import type {
  InteractionCheckResult,
  InteractionCheckRequest,
} from '../../services/medication/interactionService';
import type {
  OfflineSyncStatus,
} from '../../services/medication/databaseService';

// State interface
export interface MedicationState {
  // Search state
  searchResults: MedicationSearchResult | null;
  searchLoading: boolean;
  searchError: string | null;
  searchQuery: string;
  searchFilters: SearchOptions;

  // Autocomplete state
  autocompleteResults: AutocompleteResult | null;
  autocompleteLoading: boolean;
  autocompleteQuery: string;

  // Medication details
  currentMedication: (MalaysianMedicationInfo & { interactions?: any; culturalInfo?: any }) | null;
  medicationDetailsLoading: boolean;
  medicationDetailsError: string | null;

  // Drug interactions
  interactionCheck: InteractionCheckResult | null;
  interactionCheckLoading: boolean;
  interactionCheckError: string | null;
  activeInteractions: string[]; // List of interaction IDs being monitored

  // Offline sync
  syncStatus: OfflineSyncStatus | null;
  syncLoading: boolean;
  syncError: string | null;
  syncProgress: number; // 0-100

  // User preferences
  culturalPreferences: {
    halalOnly: boolean;
    language: 'ms' | 'en' | 'zh' | 'ta';
    religion: string;
    observesPrayerTimes: boolean;
    observesRamadan: boolean;
  };

  // Recent searches and history
  recentSearches: string[];
  searchHistory: Array<{
    query: string;
    timestamp: number;
    resultsCount: number;
    filters?: SearchOptions;
  }>;

  // Popular medications cache
  popularMedications: MalaysianMedicationInfo[];
  popularMedicationsLastUpdated: number | null;

  // UI state
  ui: {
    selectedMedicationId: string | null;
    showInteractionAlert: boolean;
    interactionAlertSeverity: 'low' | 'moderate' | 'high' | 'critical';
    showSyncStatus: boolean;
  };
}

const initialState: MedicationState = {
  // Search state
  searchResults: null,
  searchLoading: false,
  searchError: null,
  searchQuery: '',
  searchFilters: {},

  // Autocomplete state
  autocompleteResults: null,
  autocompleteLoading: false,
  autocompleteQuery: '',

  // Medication details
  currentMedication: null,
  medicationDetailsLoading: false,
  medicationDetailsError: null,

  // Drug interactions
  interactionCheck: null,
  interactionCheckLoading: false,
  interactionCheckError: null,
  activeInteractions: [],

  // Offline sync
  syncStatus: null,
  syncLoading: false,
  syncError: null,
  syncProgress: 0,

  // User preferences
  culturalPreferences: {
    halalOnly: false,
    language: 'en',
    religion: '',
    observesPrayerTimes: false,
    observesRamadan: false,
  },

  // Recent searches and history
  recentSearches: [],
  searchHistory: [],

  // Popular medications cache
  popularMedications: [],
  popularMedicationsLastUpdated: null,

  // UI state
  ui: {
    selectedMedicationId: null,
    showInteractionAlert: false,
    interactionAlertSeverity: 'low',
    showSyncStatus: false,
  },
};

// Async thunks
export const searchMedications = createAsyncThunk(
  'medication/searchMedications',
  async (
    { query, options = {} }: { query: string; options?: SearchOptions },
    { getState, rejectWithValue }
  ) => {
    try {
      const state = getState() as { medication: MedicationState };
      const culturalPreferences = state.medication.culturalPreferences;

      // Apply cultural preferences to search options
      const enhancedOptions: SearchOptions = {
        ...options,
        halalOnly: options.halalOnly ?? culturalPreferences.halalOnly,
        language: options.language ?? culturalPreferences.language,
        culturalContext: {
          religion: culturalPreferences.religion,
          dietaryRestrictions: culturalPreferences.halalOnly ? ['haram'] : [],
        },
      };

      const response = await medicationSearchService.search(query, enhancedOptions);
      
      if (!response.success) {
        return rejectWithValue(response.error || 'Search failed');
      }

      return {
        results: response.data!,
        query,
        options: enhancedOptions,
      };
    } catch (error) {
      return rejectWithValue('Search failed due to network error');
    }
  }
);

export const getAutocompleteSuggestions = createAsyncThunk(
  'medication/getAutocompleteSuggestions',
  async (
    { query, options = {} }: { query: string; options?: Partial<SearchOptions> },
    { getState, rejectWithValue }
  ) => {
    try {
      const state = getState() as { medication: MedicationState };
      const culturalPreferences = state.medication.culturalPreferences;

      const enhancedOptions = {
        ...options,
        halalOnly: options.halalOnly ?? culturalPreferences.halalOnly,
        language: options.language ?? culturalPreferences.language,
      };

      const response = await medicationSearchService.getAutocompleteSuggestions(query, enhancedOptions);
      
      if (!response.success) {
        return rejectWithValue(response.error || 'Autocomplete failed');
      }

      return { results: response.data!, query };
    } catch (error) {
      return rejectWithValue('Autocomplete failed due to network error');
    }
  }
);

export const getMedicationDetails = createAsyncThunk(
  'medication/getMedicationDetails',
  async (
    { medicationId, options = {} }: { 
      medicationId: string; 
      options?: { 
        includeDosages?: boolean;
        includeInteractions?: boolean;
        includeSideEffects?: boolean;
        includeContraindications?: boolean;
        includeCulturalInfo?: boolean;
        language?: 'ms' | 'en' | 'zh' | 'ta';
      };
    },
    { getState, rejectWithValue }
  ) => {
    try {
      const state = getState() as { medication: MedicationState };
      const culturalPreferences = state.medication.culturalPreferences;

      const enhancedOptions = {
        includeDosages: true,
        includeInteractions: true,
        includeSideEffects: true,
        includeContraindications: true,
        includeCulturalInfo: true,
        language: culturalPreferences.language,
        ...options,
      };

      const response = await medicationDatabaseService.getMedicationDetails(medicationId, enhancedOptions);
      
      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to get medication details');
      }

      return response.data!;
    } catch (error) {
      return rejectWithValue('Failed to get medication details due to network error');
    }
  }
);

export const checkDrugInteractions = createAsyncThunk(
  'medication/checkDrugInteractions',
  async (
    { medications, patientProfile }: {
      medications: Array<{ id: string; name: string; dosage?: string }>;
      patientProfile?: any;
    },
    { getState, rejectWithValue }
  ) => {
    try {
      const state = getState() as { medication: MedicationState };
      const culturalPreferences = state.medication.culturalPreferences;

      const checkRequest: InteractionCheckRequest = {
        medications,
        patientProfile: {
          ...patientProfile,
          culturalProfile: {
            religion: culturalPreferences.religion,
            observesPrayerTimes: culturalPreferences.observesPrayerTimes,
            observesRamadan: culturalPreferences.observesRamadan,
            dietaryRestrictions: culturalPreferences.halalOnly ? ['haram'] : [],
          },
        },
        checkOptions: {
          includeFoodInteractions: true,
          includeSupplements: true,
          includeOTCMedications: true,
          includeCulturalConsiderations: true,
          severityThreshold: 'all',
        },
      };

      const response = await drugInteractionService.checkInteractions(checkRequest);
      
      if (!response.success) {
        return rejectWithValue(response.error || 'Interaction check failed');
      }

      return response.data!;
    } catch (error) {
      return rejectWithValue('Interaction check failed due to network error');
    }
  }
);

export const syncOfflineDatabase = createAsyncThunk(
  'medication/syncOfflineDatabase',
  async (
    { forceRefresh = false }: { forceRefresh?: boolean } = {},
    { getState, dispatch, rejectWithValue }
  ) => {
    try {
      const state = getState() as { medication: MedicationState };
      const culturalPreferences = state.medication.culturalPreferences;

      const response = await medicationDatabaseService.syncOfflineDatabase({
        halalOnly: culturalPreferences.halalOnly,
        forceRefresh,
        syncCallback: (progress: number) => {
          dispatch(updateSyncProgress(progress));
        },
      });

      if (!response.success) {
        return rejectWithValue(response.error || 'Sync failed');
      }

      return response.data!;
    } catch (error) {
      return rejectWithValue('Sync failed due to network error');
    }
  }
);

export const getPopularMedications = createAsyncThunk(
  'medication/getPopularMedications',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState() as { medication: MedicationState };
      const culturalPreferences = state.medication.culturalPreferences;

      // Check if we need to refresh popular medications
      const lastUpdated = state.medication.popularMedicationsLastUpdated;
      const now = Date.now();
      const oneHour = 60 * 60 * 1000;

      if (lastUpdated && (now - lastUpdated) < oneHour) {
        // Return cached popular medications
        return {
          medications: state.medication.popularMedications,
          fromCache: true,
        };
      }

      const response = await medicationSearchService.getPopularMedications({
        halalOnly: culturalPreferences.halalOnly,
        language: culturalPreferences.language,
        limit: 20,
      });

      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to get popular medications');
      }

      return {
        medications: response.data!.medications,
        fromCache: false,
      };
    } catch (error) {
      return rejectWithValue('Failed to get popular medications due to network error');
    }
  }
);

export const getSyncStatus = createAsyncThunk(
  'medication/getSyncStatus',
  async (_, { rejectWithValue }) => {
    try {
      const response = await medicationDatabaseService.getOfflineSyncStatus();
      
      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to get sync status');
      }

      return response.data!;
    } catch (error) {
      return rejectWithValue('Failed to get sync status due to network error');
    }
  }
);

// Create the slice
const medicationSlice = createSlice({
  name: 'medication',
  initialState,
  reducers: {
    // Search actions
    clearSearchResults: (state) => {
      state.searchResults = null;
      state.searchError = null;
      state.searchQuery = '';
    },

    setSearchFilters: (state, action: PayloadAction<SearchOptions>) => {
      state.searchFilters = action.payload;
    },

    // Autocomplete actions
    clearAutocompleteResults: (state) => {
      state.autocompleteResults = null;
      state.autocompleteQuery = '';
    },

    // Medication details actions
    clearMedicationDetails: (state) => {
      state.currentMedication = null;
      state.medicationDetailsError = null;
    },

    // Interaction actions
    clearInteractionCheck: (state) => {
      state.interactionCheck = null;
      state.interactionCheckError = null;
    },

    addActiveInteraction: (state, action: PayloadAction<string>) => {
      if (!state.activeInteractions.includes(action.payload)) {
        state.activeInteractions.push(action.payload);
      }
    },

    removeActiveInteraction: (state, action: PayloadAction<string>) => {
      state.activeInteractions = state.activeInteractions.filter(
        id => id !== action.payload
      );
    },

    // Sync actions
    updateSyncProgress: (state, action: PayloadAction<number>) => {
      state.syncProgress = action.payload;
    },

    clearSyncError: (state) => {
      state.syncError = null;
    },

    // Cultural preferences
    updateCulturalPreferences: (state, action: PayloadAction<Partial<MedicationState['culturalPreferences']>>) => {
      state.culturalPreferences = {
        ...state.culturalPreferences,
        ...action.payload,
      };
    },

    // Search history
    addSearchToHistory: (state, action: PayloadAction<{
      query: string;
      resultsCount: number;
      filters?: SearchOptions;
    }>) => {
      const { query, resultsCount, filters } = action.payload;
      
      // Add to recent searches
      if (!state.recentSearches.includes(query)) {
        state.recentSearches.unshift(query);
        state.recentSearches = state.recentSearches.slice(0, 10); // Keep last 10
      }

      // Add to detailed history
      state.searchHistory.unshift({
        query,
        timestamp: Date.now(),
        resultsCount,
        filters,
      });
      state.searchHistory = state.searchHistory.slice(0, 100); // Keep last 100
    },

    clearSearchHistory: (state) => {
      state.recentSearches = [];
      state.searchHistory = [];
    },

    // UI actions
    setSelectedMedication: (state, action: PayloadAction<string | null>) => {
      state.ui.selectedMedicationId = action.payload;
    },

    showInteractionAlert: (state, action: PayloadAction<{
      severity: 'low' | 'moderate' | 'high' | 'critical';
    }>) => {
      state.ui.showInteractionAlert = true;
      state.ui.interactionAlertSeverity = action.payload.severity;
    },

    hideInteractionAlert: (state) => {
      state.ui.showInteractionAlert = false;
    },

    toggleSyncStatusDisplay: (state) => {
      state.ui.showSyncStatus = !state.ui.showSyncStatus;
    },
  },
  extraReducers: (builder) => {
    // Search medications
    builder
      .addCase(searchMedications.pending, (state) => {
        state.searchLoading = true;
        state.searchError = null;
      })
      .addCase(searchMedications.fulfilled, (state, action) => {
        state.searchLoading = false;
        state.searchResults = action.payload.results;
        state.searchQuery = action.payload.query;
        state.searchFilters = action.payload.options;

        // Add to search history
        medicationSlice.caseReducers.addSearchToHistory(state, {
          payload: {
            query: action.payload.query,
            resultsCount: action.payload.results.medications.length,
            filters: action.payload.options,
          },
          type: 'medication/addSearchToHistory',
        });
      })
      .addCase(searchMedications.rejected, (state, action) => {
        state.searchLoading = false;
        state.searchError = action.payload as string;
      });

    // Autocomplete suggestions
    builder
      .addCase(getAutocompleteSuggestions.pending, (state) => {
        state.autocompleteLoading = true;
      })
      .addCase(getAutocompleteSuggestions.fulfilled, (state, action) => {
        state.autocompleteLoading = false;
        state.autocompleteResults = action.payload.results;
        state.autocompleteQuery = action.payload.query;
      })
      .addCase(getAutocompleteSuggestions.rejected, (state) => {
        state.autocompleteLoading = false;
        state.autocompleteResults = null;
      });

    // Medication details
    builder
      .addCase(getMedicationDetails.pending, (state) => {
        state.medicationDetailsLoading = true;
        state.medicationDetailsError = null;
      })
      .addCase(getMedicationDetails.fulfilled, (state, action) => {
        state.medicationDetailsLoading = false;
        state.currentMedication = action.payload;
      })
      .addCase(getMedicationDetails.rejected, (state, action) => {
        state.medicationDetailsLoading = false;
        state.medicationDetailsError = action.payload as string;
      });

    // Drug interaction check
    builder
      .addCase(checkDrugInteractions.pending, (state) => {
        state.interactionCheckLoading = true;
        state.interactionCheckError = null;
      })
      .addCase(checkDrugInteractions.fulfilled, (state, action) => {
        state.interactionCheckLoading = false;
        state.interactionCheck = action.payload;

        // Show alert if high-risk interactions found
        if (action.payload.overallRisk === 'high' || action.payload.overallRisk === 'critical') {
          state.ui.showInteractionAlert = true;
          state.ui.interactionAlertSeverity = action.payload.overallRisk;
        }
      })
      .addCase(checkDrugInteractions.rejected, (state, action) => {
        state.interactionCheckLoading = false;
        state.interactionCheckError = action.payload as string;
      });

    // Offline sync
    builder
      .addCase(syncOfflineDatabase.pending, (state) => {
        state.syncLoading = true;
        state.syncError = null;
        state.syncProgress = 0;
      })
      .addCase(syncOfflineDatabase.fulfilled, (state, action) => {
        state.syncLoading = false;
        state.syncStatus = action.payload;
        state.syncProgress = 100;
      })
      .addCase(syncOfflineDatabase.rejected, (state, action) => {
        state.syncLoading = false;
        state.syncError = action.payload as string;
        state.syncProgress = 0;
      });

    // Popular medications
    builder
      .addCase(getPopularMedications.pending, (state) => {
        // Don't show loading if we have cached data
        if (!state.popularMedications.length) {
          state.searchLoading = true;
        }
      })
      .addCase(getPopularMedications.fulfilled, (state, action) => {
        state.searchLoading = false;
        state.popularMedications = action.payload.medications;
        if (!action.payload.fromCache) {
          state.popularMedicationsLastUpdated = Date.now();
        }
      })
      .addCase(getPopularMedications.rejected, (state) => {
        state.searchLoading = false;
      });

    // Sync status
    builder
      .addCase(getSyncStatus.fulfilled, (state, action) => {
        state.syncStatus = action.payload;
      });
  },
});

// Export actions
export const {
  clearSearchResults,
  setSearchFilters,
  clearAutocompleteResults,
  clearMedicationDetails,
  clearInteractionCheck,
  addActiveInteraction,
  removeActiveInteraction,
  updateSyncProgress,
  clearSyncError,
  updateCulturalPreferences,
  addSearchToHistory,
  clearSearchHistory,
  setSelectedMedication,
  showInteractionAlert,
  hideInteractionAlert,
  toggleSyncStatusDisplay,
} = medicationSlice.actions;

// Selectors
export const selectSearchResults = (state: { medication: MedicationState }) => 
  state.medication.searchResults;

export const selectSearchLoading = (state: { medication: MedicationState }) => 
  state.medication.searchLoading;

export const selectAutocompleteResults = (state: { medication: MedicationState }) => 
  state.medication.autocompleteResults;

export const selectCurrentMedication = (state: { medication: MedicationState }) => 
  state.medication.currentMedication;

export const selectInteractionCheck = (state: { medication: MedicationState }) => 
  state.medication.interactionCheck;

export const selectSyncStatus = (state: { medication: MedicationState }) => 
  state.medication.syncStatus;

export const selectCulturalPreferences = (state: { medication: MedicationState }) => 
  state.medication.culturalPreferences;

export const selectRecentSearches = (state: { medication: MedicationState }) => 
  state.medication.recentSearches;

export const selectPopularMedications = (state: { medication: MedicationState }) => 
  state.medication.popularMedications;

export const selectUIState = (state: { medication: MedicationState }) => 
  state.medication.ui;

export default medicationSlice.reducer;