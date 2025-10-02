/**
 * Education Hub Type Definitions
 *
 * TypeScript interfaces for educational content management with multi-language support
 * for Malaysian healthcare context (MS, EN, ZH, TA). These types match the backend API
 * structure from Task 30.
 */

// Multi-language support
export interface MultiLanguageText {
  ms: string; // Malay
  en: string; // English
  zh: string; // Chinese
  ta: string; // Tamil
}

// Content types
export type ContentType = 'article' | 'video' | 'infographic' | 'quiz';
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

// Educational content
export interface EducationContent {
  id: string;
  type: ContentType;
  category: string;

  // Multi-language fields
  title: MultiLanguageText;
  description: MultiLanguageText;
  content: MultiLanguageText;

  // Metadata
  tags: string[];
  relatedMedications: string[];
  relatedConditions: string[]; // ICD-10 codes
  difficulty: DifficultyLevel;
  estimatedReadTime: number; // in minutes

  // Medical review
  medicalReviewer?: string;
  reviewDate?: string; // ISO date string

  // Publishing
  publishedAt?: string; // ISO date string
  updatedAt: string; // ISO date string
  isPublished: boolean;

  // Analytics (denormalized for performance)
  viewCount: number;
  completionCount: number;
  averageRating?: number;
}

// Category
export interface Category {
  id: string;
  name: MultiLanguageText;
  description: MultiLanguageText;
  icon?: string;
  contentCount: number;
}

// User progress tracking
export interface UserProgress {
  id: string;
  userId: string;
  contentId: string;

  viewedAt?: string; // ISO date string
  completedAt?: string; // ISO date string
  timeSpent: number; // in seconds
}

// Quiz submission
export interface QuizSubmission {
  id: string;
  userId: string;
  quizId: string;

  answers: Record<string, any>; // JSONB - flexible answer structure
  score: number; // 0-100 percentage
  passed: boolean;
  submittedAt: string; // ISO date string
}

// Achievement/Badge
export type BadgeId =
  | 'first_content'
  | '7_day_streak'
  | 'quiz_master'
  | '10_articles'
  | '5_videos'
  | 'perfect_score'
  | 'medication_expert'
  | 'condition_expert';

export interface Achievement {
  id: string;
  userId: string;
  badgeId: BadgeId | string; // Allow custom badges
  earnedAt: string; // ISO date string
}

// Recommendation
export type RecommendationReason = 'medication' | 'condition' | 'adherence' | 'popular';

export interface Recommendation {
  userId: string;
  contentId: string;
  content?: EducationContent; // Populated content object
  score: number; // 0-100 relevance score
  reason: RecommendationReason;
  generatedAt: string; // ISO date string
}

// User statistics
export interface UserStats {
  totalContentViewed: number;
  totalContentCompleted: number;
  totalTimeSpent: number; // in seconds
  totalQuizzesTaken: number;
  totalQuizzesPassed: number;
  averageQuizScore: number;
  currentStreak: number; // days
  longestStreak: number; // days
  achievementCount: number;
  lastActivityAt?: string; // ISO date string
}

// Quiz statistics
export interface QuizStats {
  totalQuizzesTaken: number;
  totalQuizzesPassed: number;
  averageScore: number;
  bestScore: number;
  totalTimeSpent: number; // in seconds
}

// Content analytics (admin view)
export interface ContentAnalytics {
  contentId: string;
  totalViews: number;
  totalCompletions: number;
  averageTimeSpent: number; // in seconds
  completionRate: number; // 0-100 percentage
  uniqueViewers: number;
  averageRating?: number;
  ratingCount: number;
}

// Quiz analytics (admin view)
export interface QuizAnalytics {
  quizId: string;
  totalAttempts: number;
  totalPassed: number;
  averageScore: number;
  passRate: number; // 0-100 percentage
  averageTimeSpent: number; // in seconds
  questionAnalytics: Array<{
    questionId: string;
    correctRate: number;
    averageTimeSpent: number;
  }>;
}

// DTOs for API requests

export interface CreateContentDTO {
  type: ContentType;
  category: string;
  title: MultiLanguageText;
  description: MultiLanguageText;
  content: MultiLanguageText;
  tags?: string[];
  relatedMedications?: string[];
  relatedConditions?: string[];
  difficulty?: DifficultyLevel;
  estimatedReadTime?: number;
  medicalReviewer?: string;
  reviewDate?: string;
}

export interface UpdateContentDTO {
  type?: ContentType;
  category?: string;
  title?: MultiLanguageText;
  description?: MultiLanguageText;
  content?: MultiLanguageText;
  tags?: string[];
  relatedMedications?: string[];
  relatedConditions?: string[];
  difficulty?: DifficultyLevel;
  estimatedReadTime?: number;
  medicalReviewer?: string;
  reviewDate?: string;
  isPublished?: boolean;
}

export interface ContentFilters {
  type?: ContentType;
  category?: string;
  tags?: string[];
  difficulty?: DifficultyLevel;
  isPublished?: boolean;
  relatedMedication?: string;
  relatedCondition?: string;
  limit?: number;
  offset?: number;
}

export interface SearchFilters {
  type?: ContentType;
  category?: string;
  tags?: string[];
  difficulty?: DifficultyLevel;
  limit?: number;
  offset?: number;
}

export interface TrackProgressDTO {
  contentId: string;
  timeSpent?: number; // in seconds
}

export interface SubmitQuizDTO {
  quizId: string;
  answers: Record<string, any>;
}

export interface QuizResult {
  submission: QuizSubmission;
  correctAnswers: Record<string, any>;
  explanations?: Record<string, string>;
}

// User context for recommendations
export interface UserContext {
  userId: string;
  medications?: string[];
  conditions?: string[];
  adherenceRate?: number;
  language?: 'ms' | 'en' | 'zh' | 'ta';
}

// Search result
export interface SearchResult {
  content: EducationContent[];
  query: string;
  total: number;
  limit: number;
  offset: number;
}

// Pagination
export interface PaginationParams {
  limit?: number;
  offset?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
  };
}

// API response wrapper
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Media upload
export interface MediaUploadResult {
  url: string;
  key: string;
  size: number;
  contentType: string;
}
