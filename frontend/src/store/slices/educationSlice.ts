/**
 * Education Store Slice
 *
 * Redux store slice for education hub management with:
 * - Content browsing and search state
 * - Personalized recommendations
 * - User progress tracking
 * - Quiz submissions and statistics
 * - Achievements and badges
 * - Multi-language content support
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { educationService } from '@/services/educationService';
import type {
  EducationContent,
  Category,
  UserProgress,
  QuizSubmission,
  Achievement,
  Recommendation,
  UserStats,
  QuizStats,
  SearchFilters,
  ContentFilters,
  UserContext,
  QuizResult,
  SearchResult,
} from '@/types/education';

// State interface
export interface EducationState {
  // Content state
  content: EducationContent[];
  currentContent: EducationContent | null;
  contentLoading: boolean;
  contentError: string | null;

  // Recommendations state
  recommendations: Recommendation[];
  recommendationsLoading: boolean;
  recommendationsError: string | null;

  // Categories state
  categories: Category[];
  categoriesLoading: boolean;
  categoriesError: string | null;

  // Search state
  searchResults: SearchResult | null;
  searchQuery: string;
  searchFilters: SearchFilters;
  searchLoading: boolean;
  searchError: string | null;

  // Popular and trending content
  popularContent: EducationContent[];
  trendingContent: EducationContent[];

  // Progress state
  userProgress: UserProgress[];
  currentProgress: UserProgress | null;
  progressLoading: boolean;
  progressError: string | null;

  // Statistics state
  userStats: UserStats | null;
  statsLoading: boolean;
  statsError: string | null;

  // Quiz state
  quizSubmissions: QuizSubmission[];
  currentQuizResult: QuizResult | null;
  quizStats: QuizStats | null;
  quizLoading: boolean;
  quizError: string | null;

  // Achievement state
  achievements: Achievement[];
  achievementsLoading: boolean;
  achievementsError: string | null;

  // UI state
  ui: {
    selectedContentId: string | null;
    selectedCategory: string | null;
    showQuizResult: boolean;
    showAchievementNotification: boolean;
    newAchievement: Achievement | null;
  };
}

const initialState: EducationState = {
  // Content state
  content: [],
  currentContent: null,
  contentLoading: false,
  contentError: null,

  // Recommendations state
  recommendations: [],
  recommendationsLoading: false,
  recommendationsError: null,

  // Categories state
  categories: [],
  categoriesLoading: false,
  categoriesError: null,

  // Search state
  searchResults: null,
  searchQuery: '',
  searchFilters: {},
  searchLoading: false,
  searchError: null,

  // Popular and trending content
  popularContent: [],
  trendingContent: [],

  // Progress state
  userProgress: [],
  currentProgress: null,
  progressLoading: false,
  progressError: null,

  // Statistics state
  userStats: null,
  statsLoading: false,
  statsError: null,

  // Quiz state
  quizSubmissions: [],
  currentQuizResult: null,
  quizStats: null,
  quizLoading: false,
  quizError: null,

  // Achievement state
  achievements: [],
  achievementsLoading: false,
  achievementsError: null,

  // UI state
  ui: {
    selectedContentId: null,
    selectedCategory: null,
    showQuizResult: false,
    showAchievementNotification: false,
    newAchievement: null,
  },
};

// Async thunks

// Content thunks
export const fetchContent = createAsyncThunk(
  'education/fetchContent',
  async (filters: ContentFilters = {}, { rejectWithValue }) => {
    try {
      const response = await educationService.getContent(filters);

      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to fetch content');
      }

      return response.data!;
    } catch (error) {
      return rejectWithValue('Failed to fetch content due to network error');
    }
  }
);

export const fetchContentById = createAsyncThunk(
  'education/fetchContentById',
  async ({ id, incrementView = false }: { id: string; incrementView?: boolean }, { rejectWithValue }) => {
    try {
      const response = await educationService.getContentById(id, incrementView);

      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to fetch content');
      }

      return response.data!;
    } catch (error) {
      return rejectWithValue('Failed to fetch content due to network error');
    }
  }
);

export const fetchContentByCategory = createAsyncThunk(
  'education/fetchContentByCategory',
  async ({ category, limit = 10 }: { category: string; limit?: number }, { rejectWithValue }) => {
    try {
      const response = await educationService.getContentByCategory(category, limit);

      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to fetch content');
      }

      return response.data!;
    } catch (error) {
      return rejectWithValue('Failed to fetch content due to network error');
    }
  }
);

export const fetchContentByMedication = createAsyncThunk(
  'education/fetchContentByMedication',
  async ({ medicationId, limit = 10 }: { medicationId: string; limit?: number }, { rejectWithValue }) => {
    try {
      const response = await educationService.getContentByMedication(medicationId, limit);

      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to fetch content');
      }

      return response.data!;
    } catch (error) {
      return rejectWithValue('Failed to fetch content due to network error');
    }
  }
);

export const fetchContentByCondition = createAsyncThunk(
  'education/fetchContentByCondition',
  async ({ conditionCode, limit = 10 }: { conditionCode: string; limit?: number }, { rejectWithValue }) => {
    try {
      const response = await educationService.getContentByCondition(conditionCode, limit);

      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to fetch content');
      }

      return response.data!;
    } catch (error) {
      return rejectWithValue('Failed to fetch content due to network error');
    }
  }
);

// Recommendation thunks
export const fetchRecommendations = createAsyncThunk(
  'education/fetchRecommendations',
  async (limit = 10, { rejectWithValue }) => {
    try {
      const response = await educationService.getRecommendations(limit);

      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to fetch recommendations');
      }

      return response.data!;
    } catch (error) {
      return rejectWithValue('Failed to fetch recommendations due to network error');
    }
  }
);

export const generateRecommendations = createAsyncThunk(
  'education/generateRecommendations',
  async ({ context, limit = 10 }: { context: UserContext; limit?: number }, { rejectWithValue }) => {
    try {
      const response = await educationService.generateRecommendations(context, limit);

      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to generate recommendations');
      }

      return response.data!;
    } catch (error) {
      return rejectWithValue('Failed to generate recommendations due to network error');
    }
  }
);

export const fetchAdherenceInterventionContent = createAsyncThunk(
  'education/fetchAdherenceInterventionContent',
  async (adherenceRate: number, { rejectWithValue }) => {
    try {
      const response = await educationService.getAdherenceInterventionContent(adherenceRate);

      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to fetch intervention content');
      }

      return response.data!;
    } catch (error) {
      return rejectWithValue('Failed to fetch intervention content due to network error');
    }
  }
);

// Search thunks
export const searchContent = createAsyncThunk(
  'education/searchContent',
  async ({ query, filters = {} }: { query: string; filters?: SearchFilters }, { rejectWithValue }) => {
    try {
      const response = await educationService.searchContent(query, filters);

      if (!response.success) {
        return rejectWithValue(response.error || 'Search failed');
      }

      return { results: response.data!, query, filters };
    } catch (error) {
      return rejectWithValue('Search failed due to network error');
    }
  }
);

export const searchByLanguage = createAsyncThunk(
  'education/searchByLanguage',
  async (
    { query, language, filters = {} }: { query: string; language: 'ms' | 'en' | 'zh' | 'ta'; filters?: SearchFilters },
    { rejectWithValue }
  ) => {
    try {
      const response = await educationService.searchByLanguage(query, language, filters);

      if (!response.success) {
        return rejectWithValue(response.error || 'Search failed');
      }

      return { results: response.data!, query, filters };
    } catch (error) {
      return rejectWithValue('Search failed due to network error');
    }
  }
);

export const searchByTags = createAsyncThunk(
  'education/searchByTags',
  async ({ tags, filters = {} }: { tags: string[]; filters?: Omit<SearchFilters, 'tags'> }, { rejectWithValue }) => {
    try {
      const response = await educationService.searchByTags(tags, filters);

      if (!response.success) {
        return rejectWithValue(response.error || 'Search failed');
      }

      return { results: response.data!, tags, filters };
    } catch (error) {
      return rejectWithValue('Search failed due to network error');
    }
  }
);

export const fetchPopularContent = createAsyncThunk(
  'education/fetchPopularContent',
  async ({ limit = 10, filters = {} }: { limit?: number; filters?: Partial<SearchFilters> }, { rejectWithValue }) => {
    try {
      const response = await educationService.getPopularContent(limit, filters);

      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to fetch popular content');
      }

      return response.data!;
    } catch (error) {
      return rejectWithValue('Failed to fetch popular content due to network error');
    }
  }
);

export const fetchTrendingContent = createAsyncThunk(
  'education/fetchTrendingContent',
  async ({ limit = 10, filters = {} }: { limit?: number; filters?: Partial<SearchFilters> }, { rejectWithValue }) => {
    try {
      const response = await educationService.getTrendingContent(limit, filters);

      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to fetch trending content');
      }

      return response.data!;
    } catch (error) {
      return rejectWithValue('Failed to fetch trending content due to network error');
    }
  }
);

// Progress thunks
export const trackContentView = createAsyncThunk(
  'education/trackContentView',
  async ({ contentId, timeSpent = 0 }: { contentId: string; timeSpent?: number }, { rejectWithValue }) => {
    try {
      const response = await educationService.trackView(contentId, timeSpent);

      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to track view');
      }

      return response.data!;
    } catch (error) {
      return rejectWithValue('Failed to track view due to network error');
    }
  }
);

export const trackContentCompletion = createAsyncThunk(
  'education/trackContentCompletion',
  async ({ contentId, timeSpent = 0 }: { contentId: string; timeSpent?: number }, { rejectWithValue }) => {
    try {
      const response = await educationService.trackCompletion(contentId, timeSpent);

      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to track completion');
      }

      return response.data!;
    } catch (error) {
      return rejectWithValue('Failed to track completion due to network error');
    }
  }
);

export const fetchUserProgress = createAsyncThunk(
  'education/fetchUserProgress',
  async (contentId: string, { rejectWithValue }) => {
    try {
      const response = await educationService.getUserProgress(contentId);

      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to fetch progress');
      }

      return response.data!;
    } catch (error) {
      return rejectWithValue('Failed to fetch progress due to network error');
    }
  }
);

export const fetchUserProgressList = createAsyncThunk(
  'education/fetchUserProgressList',
  async (
    { completed, limit = 20, offset = 0 }: { completed?: boolean; limit?: number; offset?: number },
    { rejectWithValue }
  ) => {
    try {
      const response = await educationService.getUserProgressList(completed, limit, offset);

      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to fetch progress list');
      }

      return response.data!;
    } catch (error) {
      return rejectWithValue('Failed to fetch progress list due to network error');
    }
  }
);

export const fetchUserStats = createAsyncThunk('education/fetchUserStats', async (_, { rejectWithValue }) => {
  try {
    const response = await educationService.getUserStats();

    if (!response.success) {
      return rejectWithValue(response.error || 'Failed to fetch stats');
    }

    return response.data!;
  } catch (error) {
    return rejectWithValue('Failed to fetch stats due to network error');
  }
});

// Quiz thunks
export const submitQuiz = createAsyncThunk(
  'education/submitQuiz',
  async ({ quizId, answers }: { quizId: string; answers: Record<string, any> }, { rejectWithValue, dispatch }) => {
    try {
      const response = await educationService.submitQuiz(quizId, answers);

      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to submit quiz');
      }

      // Check for achievements after quiz submission
      dispatch(checkStreakAchievements());

      return response.data!;
    } catch (error) {
      return rejectWithValue('Failed to submit quiz due to network error');
    }
  }
);

export const fetchQuizSubmissions = createAsyncThunk(
  'education/fetchQuizSubmissions',
  async ({ quizId, limit = 10 }: { quizId: string; limit?: number }, { rejectWithValue }) => {
    try {
      const response = await educationService.getUserQuizSubmissions(quizId, limit);

      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to fetch quiz submissions');
      }

      return response.data!;
    } catch (error) {
      return rejectWithValue('Failed to fetch quiz submissions due to network error');
    }
  }
);

export const fetchAllQuizSubmissions = createAsyncThunk(
  'education/fetchAllQuizSubmissions',
  async (limit = 20, { rejectWithValue }) => {
    try {
      const response = await educationService.getAllUserQuizSubmissions(limit);

      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to fetch all quiz submissions');
      }

      return response.data!;
    } catch (error) {
      return rejectWithValue('Failed to fetch all quiz submissions due to network error');
    }
  }
);

export const fetchUserQuizStats = createAsyncThunk('education/fetchUserQuizStats', async (_, { rejectWithValue }) => {
  try {
    const response = await educationService.getUserQuizStats();

    if (!response.success) {
      return rejectWithValue(response.error || 'Failed to fetch quiz stats');
    }

    return response.data!;
  } catch (error) {
    return rejectWithValue('Failed to fetch quiz stats due to network error');
  }
});

export const checkQuizPassed = createAsyncThunk(
  'education/checkQuizPassed',
  async (quizId: string, { rejectWithValue }) => {
    try {
      const response = await educationService.hasUserPassedQuiz(quizId);

      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to check quiz status');
      }

      return { quizId, ...response.data! };
    } catch (error) {
      return rejectWithValue('Failed to check quiz status due to network error');
    }
  }
);

// Achievement thunks
export const fetchUserAchievements = createAsyncThunk(
  'education/fetchUserAchievements',
  async (limit = 50, { rejectWithValue }) => {
    try {
      const response = await educationService.getUserAchievements(limit);

      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to fetch achievements');
      }

      return response.data!;
    } catch (error) {
      return rejectWithValue('Failed to fetch achievements due to network error');
    }
  }
);

export const checkStreakAchievements = createAsyncThunk(
  'education/checkStreakAchievements',
  async (_, { rejectWithValue }) => {
    try {
      const response = await educationService.checkStreakAchievements();

      if (!response.success) {
        return rejectWithValue(response.error || 'Failed to check achievements');
      }

      return response.data;
    } catch (error) {
      return rejectWithValue('Failed to check achievements due to network error');
    }
  }
);

// Create the slice
const educationSlice = createSlice({
  name: 'education',
  initialState,
  reducers: {
    // Content actions
    setCurrentContent: (state, action: PayloadAction<EducationContent | null>) => {
      state.currentContent = action.payload;
      state.ui.selectedContentId = action.payload?.id || null;
    },

    clearContent: state => {
      state.content = [];
      state.currentContent = null;
      state.contentError = null;
    },

    // Search actions
    setSearchQuery: (state, action: PayloadAction<string>) => {
      state.searchQuery = action.payload;
    },

    setSearchFilters: (state, action: PayloadAction<SearchFilters>) => {
      state.searchFilters = action.payload;
    },

    clearSearchResults: state => {
      state.searchResults = null;
      state.searchQuery = '';
      state.searchFilters = {};
      state.searchError = null;
    },

    // Progress actions
    clearProgress: state => {
      state.currentProgress = null;
      state.progressError = null;
    },

    // Quiz actions
    setShowQuizResult: (state, action: PayloadAction<boolean>) => {
      state.ui.showQuizResult = action.payload;
    },

    clearQuizResult: state => {
      state.currentQuizResult = null;
      state.ui.showQuizResult = false;
      state.quizError = null;
    },

    // Achievement actions
    showAchievementNotification: (state, action: PayloadAction<Achievement>) => {
      state.ui.showAchievementNotification = true;
      state.ui.newAchievement = action.payload;
    },

    hideAchievementNotification: state => {
      state.ui.showAchievementNotification = false;
      state.ui.newAchievement = null;
    },

    // UI actions
    setSelectedCategory: (state, action: PayloadAction<string | null>) => {
      state.ui.selectedCategory = action.payload;
    },

    // Reset state
    resetEducationState: () => initialState,
  },
  extraReducers: builder => {
    // Fetch content
    builder
      .addCase(fetchContent.pending, state => {
        state.contentLoading = true;
        state.contentError = null;
      })
      .addCase(fetchContent.fulfilled, (state, action) => {
        state.contentLoading = false;
        state.content = action.payload.data;
      })
      .addCase(fetchContent.rejected, (state, action) => {
        state.contentLoading = false;
        state.contentError = action.payload as string;
      });

    // Fetch content by ID
    builder
      .addCase(fetchContentById.pending, state => {
        state.contentLoading = true;
        state.contentError = null;
      })
      .addCase(fetchContentById.fulfilled, (state, action) => {
        state.contentLoading = false;
        state.currentContent = action.payload;
        state.ui.selectedContentId = action.payload.id;
      })
      .addCase(fetchContentById.rejected, (state, action) => {
        state.contentLoading = false;
        state.contentError = action.payload as string;
      });

    // Fetch content by category
    builder
      .addCase(fetchContentByCategory.pending, state => {
        state.contentLoading = true;
        state.contentError = null;
      })
      .addCase(fetchContentByCategory.fulfilled, (state, action) => {
        state.contentLoading = false;
        state.content = action.payload;
      })
      .addCase(fetchContentByCategory.rejected, (state, action) => {
        state.contentLoading = false;
        state.contentError = action.payload as string;
      });

    // Fetch content by medication
    builder
      .addCase(fetchContentByMedication.pending, state => {
        state.contentLoading = true;
        state.contentError = null;
      })
      .addCase(fetchContentByMedication.fulfilled, (state, action) => {
        state.contentLoading = false;
        state.content = action.payload;
      })
      .addCase(fetchContentByMedication.rejected, (state, action) => {
        state.contentLoading = false;
        state.contentError = action.payload as string;
      });

    // Fetch content by condition
    builder
      .addCase(fetchContentByCondition.pending, state => {
        state.contentLoading = true;
        state.contentError = null;
      })
      .addCase(fetchContentByCondition.fulfilled, (state, action) => {
        state.contentLoading = false;
        state.content = action.payload;
      })
      .addCase(fetchContentByCondition.rejected, (state, action) => {
        state.contentLoading = false;
        state.contentError = action.payload as string;
      });

    // Fetch recommendations
    builder
      .addCase(fetchRecommendations.pending, state => {
        state.recommendationsLoading = true;
        state.recommendationsError = null;
      })
      .addCase(fetchRecommendations.fulfilled, (state, action) => {
        state.recommendationsLoading = false;
        state.recommendations = action.payload;
      })
      .addCase(fetchRecommendations.rejected, (state, action) => {
        state.recommendationsLoading = false;
        state.recommendationsError = action.payload as string;
      });

    // Generate recommendations
    builder
      .addCase(generateRecommendations.pending, state => {
        state.recommendationsLoading = true;
        state.recommendationsError = null;
      })
      .addCase(generateRecommendations.fulfilled, (state, action) => {
        state.recommendationsLoading = false;
        state.recommendations = action.payload;
      })
      .addCase(generateRecommendations.rejected, (state, action) => {
        state.recommendationsLoading = false;
        state.recommendationsError = action.payload as string;
      });

    // Fetch adherence intervention content
    builder
      .addCase(fetchAdherenceInterventionContent.pending, state => {
        state.contentLoading = true;
        state.contentError = null;
      })
      .addCase(fetchAdherenceInterventionContent.fulfilled, (state, action) => {
        state.contentLoading = false;
        state.content = action.payload;
      })
      .addCase(fetchAdherenceInterventionContent.rejected, (state, action) => {
        state.contentLoading = false;
        state.contentError = action.payload as string;
      });

    // Search content
    builder
      .addCase(searchContent.pending, state => {
        state.searchLoading = true;
        state.searchError = null;
      })
      .addCase(searchContent.fulfilled, (state, action) => {
        state.searchLoading = false;
        state.searchResults = action.payload.results;
        state.searchQuery = action.payload.query;
        state.searchFilters = action.payload.filters;
      })
      .addCase(searchContent.rejected, (state, action) => {
        state.searchLoading = false;
        state.searchError = action.payload as string;
      });

    // Search by language
    builder
      .addCase(searchByLanguage.pending, state => {
        state.searchLoading = true;
        state.searchError = null;
      })
      .addCase(searchByLanguage.fulfilled, (state, action) => {
        state.searchLoading = false;
        state.searchResults = action.payload.results;
        state.searchQuery = action.payload.query;
        state.searchFilters = action.payload.filters;
      })
      .addCase(searchByLanguage.rejected, (state, action) => {
        state.searchLoading = false;
        state.searchError = action.payload as string;
      });

    // Search by tags
    builder
      .addCase(searchByTags.pending, state => {
        state.searchLoading = true;
        state.searchError = null;
      })
      .addCase(searchByTags.fulfilled, (state, action) => {
        state.searchLoading = false;
        state.searchResults = action.payload.results;
      })
      .addCase(searchByTags.rejected, (state, action) => {
        state.searchLoading = false;
        state.searchError = action.payload as string;
      });

    // Fetch popular content
    builder
      .addCase(fetchPopularContent.pending, state => {
        state.contentLoading = true;
        state.contentError = null;
      })
      .addCase(fetchPopularContent.fulfilled, (state, action) => {
        state.contentLoading = false;
        state.popularContent = action.payload;
      })
      .addCase(fetchPopularContent.rejected, (state, action) => {
        state.contentLoading = false;
        state.contentError = action.payload as string;
      });

    // Fetch trending content
    builder
      .addCase(fetchTrendingContent.pending, state => {
        state.contentLoading = true;
        state.contentError = null;
      })
      .addCase(fetchTrendingContent.fulfilled, (state, action) => {
        state.contentLoading = false;
        state.trendingContent = action.payload;
      })
      .addCase(fetchTrendingContent.rejected, (state, action) => {
        state.contentLoading = false;
        state.contentError = action.payload as string;
      });

    // Track content view
    builder
      .addCase(trackContentView.pending, state => {
        state.progressLoading = true;
        state.progressError = null;
      })
      .addCase(trackContentView.fulfilled, (state, action) => {
        state.progressLoading = false;
        state.currentProgress = action.payload;
      })
      .addCase(trackContentView.rejected, (state, action) => {
        state.progressLoading = false;
        state.progressError = action.payload as string;
      });

    // Track content completion
    builder
      .addCase(trackContentCompletion.pending, state => {
        state.progressLoading = true;
        state.progressError = null;
      })
      .addCase(trackContentCompletion.fulfilled, (state, action) => {
        state.progressLoading = false;
        state.currentProgress = action.payload;

        // Check for achievements after completion
        // This will be handled by a separate action
      })
      .addCase(trackContentCompletion.rejected, (state, action) => {
        state.progressLoading = false;
        state.progressError = action.payload as string;
      });

    // Fetch user progress
    builder
      .addCase(fetchUserProgress.pending, state => {
        state.progressLoading = true;
        state.progressError = null;
      })
      .addCase(fetchUserProgress.fulfilled, (state, action) => {
        state.progressLoading = false;
        state.currentProgress = action.payload;
      })
      .addCase(fetchUserProgress.rejected, (state, action) => {
        state.progressLoading = false;
        state.progressError = action.payload as string;
      });

    // Fetch user progress list
    builder
      .addCase(fetchUserProgressList.pending, state => {
        state.progressLoading = true;
        state.progressError = null;
      })
      .addCase(fetchUserProgressList.fulfilled, (state, action) => {
        state.progressLoading = false;
        state.userProgress = action.payload.data;
      })
      .addCase(fetchUserProgressList.rejected, (state, action) => {
        state.progressLoading = false;
        state.progressError = action.payload as string;
      });

    // Fetch user stats
    builder
      .addCase(fetchUserStats.pending, state => {
        state.statsLoading = true;
        state.statsError = null;
      })
      .addCase(fetchUserStats.fulfilled, (state, action) => {
        state.statsLoading = false;
        state.userStats = action.payload;
      })
      .addCase(fetchUserStats.rejected, (state, action) => {
        state.statsLoading = false;
        state.statsError = action.payload as string;
      });

    // Submit quiz
    builder
      .addCase(submitQuiz.pending, state => {
        state.quizLoading = true;
        state.quizError = null;
      })
      .addCase(submitQuiz.fulfilled, (state, action) => {
        state.quizLoading = false;
        state.currentQuizResult = action.payload;
        state.ui.showQuizResult = true;

        // Add to submissions list
        state.quizSubmissions.unshift(action.payload.submission);
      })
      .addCase(submitQuiz.rejected, (state, action) => {
        state.quizLoading = false;
        state.quizError = action.payload as string;
      });

    // Fetch quiz submissions
    builder
      .addCase(fetchQuizSubmissions.pending, state => {
        state.quizLoading = true;
        state.quizError = null;
      })
      .addCase(fetchQuizSubmissions.fulfilled, (state, action) => {
        state.quizLoading = false;
        state.quizSubmissions = action.payload;
      })
      .addCase(fetchQuizSubmissions.rejected, (state, action) => {
        state.quizLoading = false;
        state.quizError = action.payload as string;
      });

    // Fetch all quiz submissions
    builder
      .addCase(fetchAllQuizSubmissions.pending, state => {
        state.quizLoading = true;
        state.quizError = null;
      })
      .addCase(fetchAllQuizSubmissions.fulfilled, (state, action) => {
        state.quizLoading = false;
        state.quizSubmissions = action.payload;
      })
      .addCase(fetchAllQuizSubmissions.rejected, (state, action) => {
        state.quizLoading = false;
        state.quizError = action.payload as string;
      });

    // Fetch user quiz stats
    builder
      .addCase(fetchUserQuizStats.pending, state => {
        state.quizLoading = true;
        state.quizError = null;
      })
      .addCase(fetchUserQuizStats.fulfilled, (state, action) => {
        state.quizLoading = false;
        state.quizStats = action.payload;
      })
      .addCase(fetchUserQuizStats.rejected, (state, action) => {
        state.quizLoading = false;
        state.quizError = action.payload as string;
      });

    // Fetch user achievements
    builder
      .addCase(fetchUserAchievements.pending, state => {
        state.achievementsLoading = true;
        state.achievementsError = null;
      })
      .addCase(fetchUserAchievements.fulfilled, (state, action) => {
        state.achievementsLoading = false;
        state.achievements = action.payload;
      })
      .addCase(fetchUserAchievements.rejected, (state, action) => {
        state.achievementsLoading = false;
        state.achievementsError = action.payload as string;
      });
  },
});

// Export actions
export const {
  setCurrentContent,
  clearContent,
  setSearchQuery,
  setSearchFilters,
  clearSearchResults,
  clearProgress,
  setShowQuizResult,
  clearQuizResult,
  showAchievementNotification,
  hideAchievementNotification,
  setSelectedCategory,
  resetEducationState,
} = educationSlice.actions;

// Selectors
export const selectContent = (state: { education: EducationState }) => state.education.content;
export const selectCurrentContent = (state: { education: EducationState }) => state.education.currentContent;
export const selectContentLoading = (state: { education: EducationState }) => state.education.contentLoading;

export const selectRecommendations = (state: { education: EducationState }) => state.education.recommendations;
export const selectRecommendationsLoading = (state: { education: EducationState }) =>
  state.education.recommendationsLoading;

export const selectSearchResults = (state: { education: EducationState }) => state.education.searchResults;
export const selectSearchLoading = (state: { education: EducationState }) => state.education.searchLoading;
export const selectSearchQuery = (state: { education: EducationState }) => state.education.searchQuery;

export const selectPopularContent = (state: { education: EducationState }) => state.education.popularContent;
export const selectTrendingContent = (state: { education: EducationState }) => state.education.trendingContent;

export const selectUserProgress = (state: { education: EducationState }) => state.education.userProgress;
export const selectCurrentProgress = (state: { education: EducationState }) => state.education.currentProgress;
export const selectUserStats = (state: { education: EducationState }) => state.education.userStats;

export const selectQuizSubmissions = (state: { education: EducationState }) => state.education.quizSubmissions;
export const selectCurrentQuizResult = (state: { education: EducationState }) => state.education.currentQuizResult;
export const selectQuizStats = (state: { education: EducationState }) => state.education.quizStats;

export const selectAchievements = (state: { education: EducationState }) => state.education.achievements;

export const selectUIState = (state: { education: EducationState }) => state.education.ui;

export default educationSlice.reducer;
