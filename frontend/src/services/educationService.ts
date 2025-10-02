/**
 * Education Service
 *
 * Service layer for all educational content API calls with proper error handling,
 * retry logic, and timeout handling. Follows the existing service patterns from
 * the codebase.
 */

import { CONFIG } from '@/constants/config';
import { storageService } from './storage';
import type {
  EducationContent,
  Category,
  UserProgress,
  QuizSubmission,
  Achievement,
  Recommendation,
  UserStats,
  QuizStats,
  ContentAnalytics,
  QuizAnalytics,
  CreateContentDTO,
  UpdateContentDTO,
  ContentFilters,
  SearchFilters,
  TrackProgressDTO,
  SubmitQuizDTO,
  QuizResult,
  UserContext,
  SearchResult,
  ApiResponse,
  MediaUploadResult,
  PaginatedResponse,
} from '@/types/education';

// Education API endpoints
const EDUCATION_ENDPOINTS = {
  // Content endpoints
  CONTENT: `${CONFIG.apiUrl}/education/content`,
  CONTENT_BY_ID: (id: string) => `${CONFIG.apiUrl}/education/content/${id}`,
  CONTENT_BY_CATEGORY: (category: string) => `${CONFIG.apiUrl}/education/content/category/${category}`,
  CONTENT_BY_MEDICATION: (medicationId: string) => `${CONFIG.apiUrl}/education/content/medication/${medicationId}`,
  CONTENT_BY_CONDITION: (conditionCode: string) => `${CONFIG.apiUrl}/education/content/condition/${conditionCode}`,
  PUBLISH_CONTENT: (id: string) => `${CONFIG.apiUrl}/education/content/${id}/publish`,
  UNPUBLISH_CONTENT: (id: string) => `${CONFIG.apiUrl}/education/content/${id}/unpublish`,
  MEDIA_UPLOAD: `${CONFIG.apiUrl}/education/content/media`,
  MEDIA_URL: (key: string) => `${CONFIG.apiUrl}/education/content/media/${key}`,

  // Search endpoints
  SEARCH: `${CONFIG.apiUrl}/education/search`,
  SEARCH_BY_LANGUAGE: (language: string) => `${CONFIG.apiUrl}/education/search/language/${language}`,
  SEARCH_BY_TAGS: `${CONFIG.apiUrl}/education/search/tags`,
  POPULAR_CONTENT: `${CONFIG.apiUrl}/education/search/popular`,
  TRENDING_CONTENT: `${CONFIG.apiUrl}/education/search/trending`,

  // Recommendation endpoints
  RECOMMENDATIONS_GENERATE: `${CONFIG.apiUrl}/education/recommendations/generate`,
  RECOMMENDATIONS: `${CONFIG.apiUrl}/education/recommendations`,
  RECOMMENDATIONS_MEDICATION: (medicationId: string) => `${CONFIG.apiUrl}/education/recommendations/medication/${medicationId}`,
  RECOMMENDATIONS_CONDITION: (conditionCode: string) => `${CONFIG.apiUrl}/education/recommendations/condition/${conditionCode}`,
  ADHERENCE_INTERVENTION: `${CONFIG.apiUrl}/education/recommendations/adherence-intervention`,

  // Progress endpoints
  PROGRESS_VIEW: `${CONFIG.apiUrl}/education/progress/view`,
  PROGRESS_COMPLETE: `${CONFIG.apiUrl}/education/progress/complete`,
  PROGRESS_BY_CONTENT: (contentId: string) => `${CONFIG.apiUrl}/education/progress/${contentId}`,
  PROGRESS_LIST: `${CONFIG.apiUrl}/education/progress`,
  PROGRESS_STATS: `${CONFIG.apiUrl}/education/progress/stats`,

  // Achievement endpoints
  ACHIEVEMENTS: `${CONFIG.apiUrl}/education/achievements`,
  ACHIEVEMENTS_CHECK_STREAKS: `${CONFIG.apiUrl}/education/achievements/check-streaks`,

  // Quiz endpoints
  QUIZ_SUBMIT: `${CONFIG.apiUrl}/education/quiz/submit`,
  QUIZ_SUBMISSION: (id: string) => `${CONFIG.apiUrl}/education/quiz/submission/${id}`,
  QUIZ_SUBMISSIONS_BY_QUIZ: (quizId: string) => `${CONFIG.apiUrl}/education/quiz/${quizId}/submissions`,
  QUIZ_ALL_SUBMISSIONS: `${CONFIG.apiUrl}/education/quiz/submissions`,
  QUIZ_BEST_SCORE: (quizId: string) => `${CONFIG.apiUrl}/education/quiz/${quizId}/best-score`,
  QUIZ_PASSED: (quizId: string) => `${CONFIG.apiUrl}/education/quiz/${quizId}/passed`,
  QUIZ_STATS: `${CONFIG.apiUrl}/education/quiz/stats`,
  QUIZ_ANALYTICS: (quizId: string) => `${CONFIG.apiUrl}/education/quiz/${quizId}/analytics`,

  // Analytics endpoints
  CONTENT_ANALYTICS: (contentId: string) => `${CONFIG.apiUrl}/education/analytics/content/${contentId}`,
};

// Request timeout
const REQUEST_TIMEOUT = 10000; // 10 seconds

// Retry configuration
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

class EducationService {
  /**
   * Make authenticated HTTP request with automatic token refresh and retry logic
   */
  private async makeRequest<T>(
    endpoint: string,
    options: RequestInit = {},
    retryCount = 0
  ): Promise<ApiResponse<T>> {
    const url = endpoint.startsWith('http') ? endpoint : `${CONFIG.apiUrl}${endpoint}`;

    // Add authentication headers
    const accessToken = await storageService.getAccessToken();
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle token expiration
      if (response.status === 401 && accessToken) {
        const refreshed = await this.refreshToken();
        if (refreshed) {
          // Retry request with new token
          return this.makeRequest<T>(endpoint, options, retryCount);
        }
        // If refresh failed, clear stored data and require re-login
        await storageService.clearAllData();
        return {
          success: false,
          error: 'Authentication required',
        };
      }

      return this.handleResponse<T>(response);
    } catch (error) {
      // Retry on network errors
      if (retryCount < MAX_RETRIES && this.isRetryableError(error)) {
        await this.delay(RETRY_DELAY * (retryCount + 1));
        return this.makeRequest<T>(endpoint, options, retryCount + 1);
      }

      console.error('API request failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  /**
   * Handle API response and parse JSON
   */
  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    try {
      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          error: data.message || data.error || `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      return {
        success: true,
        data: data.data || data,
        message: data.message,
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to parse response',
      };
    }
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: unknown): boolean {
    if (error instanceof Error) {
      // Network errors, timeouts
      return error.name === 'AbortError' || error.message.includes('network');
    }
    return false;
  }

  /**
   * Delay helper for retry logic
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Refresh authentication token
   */
  private async refreshToken(): Promise<boolean> {
    const refreshToken = await storageService.getRefreshToken();
    if (!refreshToken) return false;

    try {
      const response = await fetch(`${CONFIG.apiUrl}/auth/refresh-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.tokens) {
          await storageService.storeTokens(data.tokens);
          return true;
        }
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
    }

    return false;
  }

  // Content Management Methods

  /**
   * Get content by ID
   */
  async getContentById(id: string, incrementView = false): Promise<ApiResponse<EducationContent>> {
    const url = `${EDUCATION_ENDPOINTS.CONTENT_BY_ID(id)}${incrementView ? '?incrementView=true' : ''}`;
    return this.makeRequest<EducationContent>(url);
  }

  /**
   * Get multiple content items with filters
   */
  async getContent(filters: ContentFilters = {}): Promise<ApiResponse<PaginatedResponse<EducationContent>>> {
    const queryParams = new URLSearchParams();

    if (filters.type) queryParams.append('type', filters.type);
    if (filters.category) queryParams.append('category', filters.category);
    if (filters.difficulty) queryParams.append('difficulty', filters.difficulty);
    if (filters.isPublished !== undefined) queryParams.append('isPublished', String(filters.isPublished));
    if (filters.limit) queryParams.append('limit', String(filters.limit));
    if (filters.offset) queryParams.append('offset', String(filters.offset));
    if (filters.tags) {
      filters.tags.forEach(tag => queryParams.append('tags', tag));
    }

    const url = `${EDUCATION_ENDPOINTS.CONTENT}?${queryParams.toString()}`;
    return this.makeRequest<PaginatedResponse<EducationContent>>(url);
  }

  /**
   * Get content by category
   */
  async getContentByCategory(category: string, limit = 10): Promise<ApiResponse<EducationContent[]>> {
    const url = `${EDUCATION_ENDPOINTS.CONTENT_BY_CATEGORY(category)}?limit=${limit}`;
    return this.makeRequest<EducationContent[]>(url);
  }

  /**
   * Get content by medication
   */
  async getContentByMedication(medicationId: string, limit = 10): Promise<ApiResponse<EducationContent[]>> {
    const url = `${EDUCATION_ENDPOINTS.CONTENT_BY_MEDICATION(medicationId)}?limit=${limit}`;
    return this.makeRequest<EducationContent[]>(url);
  }

  /**
   * Get content by condition
   */
  async getContentByCondition(conditionCode: string, limit = 10): Promise<ApiResponse<EducationContent[]>> {
    const url = `${EDUCATION_ENDPOINTS.CONTENT_BY_CONDITION(conditionCode)}?limit=${limit}`;
    return this.makeRequest<EducationContent[]>(url);
  }

  /**
   * Create new content (admin)
   */
  async createContent(data: CreateContentDTO): Promise<ApiResponse<EducationContent>> {
    return this.makeRequest<EducationContent>(EDUCATION_ENDPOINTS.CONTENT, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  /**
   * Update content (admin)
   */
  async updateContent(id: string, data: UpdateContentDTO): Promise<ApiResponse<EducationContent>> {
    return this.makeRequest<EducationContent>(EDUCATION_ENDPOINTS.CONTENT_BY_ID(id), {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  /**
   * Delete content (admin)
   */
  async deleteContent(id: string): Promise<ApiResponse<void>> {
    return this.makeRequest<void>(EDUCATION_ENDPOINTS.CONTENT_BY_ID(id), {
      method: 'DELETE',
    });
  }

  /**
   * Publish content (admin)
   */
  async publishContent(id: string): Promise<ApiResponse<EducationContent>> {
    return this.makeRequest<EducationContent>(EDUCATION_ENDPOINTS.PUBLISH_CONTENT(id), {
      method: 'POST',
    });
  }

  /**
   * Unpublish content (admin)
   */
  async unpublishContent(id: string): Promise<ApiResponse<EducationContent>> {
    return this.makeRequest<EducationContent>(EDUCATION_ENDPOINTS.UNPUBLISH_CONTENT(id), {
      method: 'POST',
    });
  }

  // Search Methods

  /**
   * Search educational content
   */
  async searchContent(query: string, filters: SearchFilters = {}): Promise<ApiResponse<SearchResult>> {
    const queryParams = new URLSearchParams({ q: query });

    if (filters.type) queryParams.append('type', filters.type);
    if (filters.category) queryParams.append('category', filters.category);
    if (filters.difficulty) queryParams.append('difficulty', filters.difficulty);
    if (filters.limit) queryParams.append('limit', String(filters.limit));
    if (filters.offset) queryParams.append('offset', String(filters.offset));
    if (filters.tags) {
      filters.tags.forEach(tag => queryParams.append('tags', tag));
    }

    const url = `${EDUCATION_ENDPOINTS.SEARCH}?${queryParams.toString()}`;
    return this.makeRequest<SearchResult>(url);
  }

  /**
   * Search by specific language
   */
  async searchByLanguage(
    query: string,
    language: 'ms' | 'en' | 'zh' | 'ta',
    filters: SearchFilters = {}
  ): Promise<ApiResponse<SearchResult>> {
    const queryParams = new URLSearchParams({ q: query });

    if (filters.type) queryParams.append('type', filters.type);
    if (filters.category) queryParams.append('category', filters.category);
    if (filters.difficulty) queryParams.append('difficulty', filters.difficulty);
    if (filters.limit) queryParams.append('limit', String(filters.limit));
    if (filters.offset) queryParams.append('offset', String(filters.offset));
    if (filters.tags) {
      filters.tags.forEach(tag => queryParams.append('tags', tag));
    }

    const url = `${EDUCATION_ENDPOINTS.SEARCH_BY_LANGUAGE(language)}?${queryParams.toString()}`;
    return this.makeRequest<SearchResult>(url);
  }

  /**
   * Search by tags
   */
  async searchByTags(tags: string[], filters: Omit<SearchFilters, 'tags'> = {}): Promise<ApiResponse<SearchResult>> {
    const queryParams = new URLSearchParams();

    tags.forEach(tag => queryParams.append('tags', tag));
    if (filters.type) queryParams.append('type', filters.type);
    if (filters.category) queryParams.append('category', filters.category);
    if (filters.difficulty) queryParams.append('difficulty', filters.difficulty);
    if (filters.limit) queryParams.append('limit', String(filters.limit));
    if (filters.offset) queryParams.append('offset', String(filters.offset));

    const url = `${EDUCATION_ENDPOINTS.SEARCH_BY_TAGS}?${queryParams.toString()}`;
    return this.makeRequest<SearchResult>(url);
  }

  /**
   * Get popular content
   */
  async getPopularContent(limit = 10, filters: Partial<SearchFilters> = {}): Promise<ApiResponse<EducationContent[]>> {
    const queryParams = new URLSearchParams({ limit: String(limit) });

    if (filters.type) queryParams.append('type', filters.type);
    if (filters.category) queryParams.append('category', filters.category);

    const url = `${EDUCATION_ENDPOINTS.POPULAR_CONTENT}?${queryParams.toString()}`;
    return this.makeRequest<EducationContent[]>(url);
  }

  /**
   * Get trending content
   */
  async getTrendingContent(limit = 10, filters: Partial<SearchFilters> = {}): Promise<ApiResponse<EducationContent[]>> {
    const queryParams = new URLSearchParams({ limit: String(limit) });

    if (filters.type) queryParams.append('type', filters.type);
    if (filters.category) queryParams.append('category', filters.category);

    const url = `${EDUCATION_ENDPOINTS.TRENDING_CONTENT}?${queryParams.toString()}`;
    return this.makeRequest<EducationContent[]>(url);
  }

  // Recommendation Methods

  /**
   * Generate personalized recommendations
   */
  async generateRecommendations(context: UserContext, limit = 10): Promise<ApiResponse<Recommendation[]>> {
    return this.makeRequest<Recommendation[]>(EDUCATION_ENDPOINTS.RECOMMENDATIONS_GENERATE, {
      method: 'POST',
      body: JSON.stringify({ ...context, limit }),
    });
  }

  /**
   * Get cached recommendations
   */
  async getRecommendations(limit = 10): Promise<ApiResponse<Recommendation[]>> {
    const url = `${EDUCATION_ENDPOINTS.RECOMMENDATIONS}?limit=${limit}`;
    return this.makeRequest<Recommendation[]>(url);
  }

  /**
   * Get content for specific medication
   */
  async getContentForMedication(medicationId: string, limit = 5): Promise<ApiResponse<EducationContent[]>> {
    const url = `${EDUCATION_ENDPOINTS.RECOMMENDATIONS_MEDICATION(medicationId)}?limit=${limit}`;
    return this.makeRequest<EducationContent[]>(url);
  }

  /**
   * Get content for specific condition
   */
  async getContentForCondition(conditionCode: string, limit = 5): Promise<ApiResponse<EducationContent[]>> {
    const url = `${EDUCATION_ENDPOINTS.RECOMMENDATIONS_CONDITION(conditionCode)}?limit=${limit}`;
    return this.makeRequest<EducationContent[]>(url);
  }

  /**
   * Get adherence intervention content
   */
  async getAdherenceInterventionContent(adherenceRate: number): Promise<ApiResponse<EducationContent[]>> {
    return this.makeRequest<EducationContent[]>(EDUCATION_ENDPOINTS.ADHERENCE_INTERVENTION, {
      method: 'POST',
      body: JSON.stringify({ adherenceRate }),
    });
  }

  // Progress Tracking Methods

  /**
   * Track content view
   */
  async trackView(contentId: string, timeSpent = 0): Promise<ApiResponse<UserProgress>> {
    return this.makeRequest<UserProgress>(EDUCATION_ENDPOINTS.PROGRESS_VIEW, {
      method: 'POST',
      body: JSON.stringify({ contentId, timeSpent }),
    });
  }

  /**
   * Track content completion
   */
  async trackCompletion(contentId: string, timeSpent = 0): Promise<ApiResponse<UserProgress>> {
    return this.makeRequest<UserProgress>(EDUCATION_ENDPOINTS.PROGRESS_COMPLETE, {
      method: 'POST',
      body: JSON.stringify({ contentId, timeSpent }),
    });
  }

  /**
   * Get user progress for specific content
   */
  async getUserProgress(contentId: string): Promise<ApiResponse<UserProgress>> {
    return this.makeRequest<UserProgress>(EDUCATION_ENDPOINTS.PROGRESS_BY_CONTENT(contentId));
  }

  /**
   * Get all user progress
   */
  async getUserProgressList(
    completed?: boolean,
    limit = 20,
    offset = 0
  ): Promise<ApiResponse<PaginatedResponse<UserProgress>>> {
    const queryParams = new URLSearchParams({ limit: String(limit), offset: String(offset) });

    if (completed !== undefined) {
      queryParams.append('completed', String(completed));
    }

    const url = `${EDUCATION_ENDPOINTS.PROGRESS_LIST}?${queryParams.toString()}`;
    return this.makeRequest<PaginatedResponse<UserProgress>>(url);
  }

  /**
   * Get user statistics
   */
  async getUserStats(): Promise<ApiResponse<UserStats>> {
    return this.makeRequest<UserStats>(EDUCATION_ENDPOINTS.PROGRESS_STATS);
  }

  // Achievement Methods

  /**
   * Get user achievements
   */
  async getUserAchievements(limit = 50): Promise<ApiResponse<Achievement[]>> {
    const url = `${EDUCATION_ENDPOINTS.ACHIEVEMENTS}?limit=${limit}`;
    return this.makeRequest<Achievement[]>(url);
  }

  /**
   * Award achievement to user (admin)
   */
  async awardAchievement(userId: string, badgeId: string): Promise<ApiResponse<Achievement>> {
    return this.makeRequest<Achievement>(EDUCATION_ENDPOINTS.ACHIEVEMENTS, {
      method: 'POST',
      body: JSON.stringify({ userId, badgeId }),
    });
  }

  /**
   * Check and award streak achievements
   */
  async checkStreakAchievements(): Promise<ApiResponse<void>> {
    return this.makeRequest<void>(EDUCATION_ENDPOINTS.ACHIEVEMENTS_CHECK_STREAKS, {
      method: 'POST',
    });
  }

  // Quiz Methods

  /**
   * Submit quiz
   */
  async submitQuiz(quizId: string, answers: Record<string, any>): Promise<ApiResponse<QuizResult>> {
    return this.makeRequest<QuizResult>(EDUCATION_ENDPOINTS.QUIZ_SUBMIT, {
      method: 'POST',
      body: JSON.stringify({ quizId, answers }),
    });
  }

  /**
   * Get quiz submission by ID
   */
  async getQuizSubmission(id: string): Promise<ApiResponse<QuizSubmission>> {
    return this.makeRequest<QuizSubmission>(EDUCATION_ENDPOINTS.QUIZ_SUBMISSION(id));
  }

  /**
   * Get user submissions for a quiz
   */
  async getUserQuizSubmissions(quizId: string, limit = 10): Promise<ApiResponse<QuizSubmission[]>> {
    const url = `${EDUCATION_ENDPOINTS.QUIZ_SUBMISSIONS_BY_QUIZ(quizId)}?limit=${limit}`;
    return this.makeRequest<QuizSubmission[]>(url);
  }

  /**
   * Get all quiz submissions for user
   */
  async getAllUserQuizSubmissions(limit = 20): Promise<ApiResponse<QuizSubmission[]>> {
    const url = `${EDUCATION_ENDPOINTS.QUIZ_ALL_SUBMISSIONS}?limit=${limit}`;
    return this.makeRequest<QuizSubmission[]>(url);
  }

  /**
   * Get best score for user on a quiz
   */
  async getBestScore(quizId: string): Promise<ApiResponse<{ bestScore: number }>> {
    return this.makeRequest<{ bestScore: number }>(EDUCATION_ENDPOINTS.QUIZ_BEST_SCORE(quizId));
  }

  /**
   * Check if user passed quiz
   */
  async hasUserPassedQuiz(quizId: string): Promise<ApiResponse<{ passed: boolean }>> {
    return this.makeRequest<{ passed: boolean }>(EDUCATION_ENDPOINTS.QUIZ_PASSED(quizId));
  }

  /**
   * Get user quiz statistics
   */
  async getUserQuizStats(): Promise<ApiResponse<QuizStats>> {
    return this.makeRequest<QuizStats>(EDUCATION_ENDPOINTS.QUIZ_STATS);
  }

  /**
   * Get quiz analytics (admin)
   */
  async getQuizAnalytics(quizId: string): Promise<ApiResponse<QuizAnalytics>> {
    return this.makeRequest<QuizAnalytics>(EDUCATION_ENDPOINTS.QUIZ_ANALYTICS(quizId));
  }

  // Analytics Methods

  /**
   * Get content analytics (admin)
   */
  async getContentAnalytics(contentId: string): Promise<ApiResponse<ContentAnalytics>> {
    return this.makeRequest<ContentAnalytics>(EDUCATION_ENDPOINTS.CONTENT_ANALYTICS(contentId));
  }

  // Media Methods

  /**
   * Upload media file
   */
  async uploadMedia(file: File | Blob, fileName: string): Promise<ApiResponse<MediaUploadResult>> {
    const formData = new FormData();
    formData.append('file', file, fileName);

    const accessToken = await storageService.getAccessToken();
    const headers: HeadersInit = {};

    if (accessToken) {
      headers.Authorization = `Bearer ${accessToken}`;
    }

    try {
      const response = await fetch(EDUCATION_ENDPOINTS.MEDIA_UPLOAD, {
        method: 'POST',
        headers,
        body: formData,
      });

      return this.handleResponse<MediaUploadResult>(response);
    } catch (error) {
      console.error('Media upload failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed',
      };
    }
  }

  /**
   * Get presigned URL for media
   */
  async getMediaUrl(key: string, expiresIn = 3600): Promise<ApiResponse<{ url: string; expiresIn: number }>> {
    const url = `${EDUCATION_ENDPOINTS.MEDIA_URL(key)}?expiresIn=${expiresIn}`;
    return this.makeRequest<{ url: string; expiresIn: number }>(url);
  }
}

export const educationService = new EducationService();
