/**
 * Education Hub Type Definitions
 *
 * Type definitions for educational content management with multi-language support
 * for Malaysian healthcare context (MS, EN, ZH, TA).
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
  reviewDate?: Date;

  // Publishing
  publishedAt?: Date;
  updatedAt: Date;
  isPublished: boolean;

  // Analytics (denormalized for performance)
  viewCount: number;
  completionCount: number;
  averageRating?: number;

  // Search (not stored in TypeScript, managed by database trigger)
  // searchVector: tsvector (PostgreSQL only)
}

// User progress tracking
export interface UserProgress {
  id: string;
  userId: string;
  contentId: string;

  viewedAt?: Date;
  completedAt?: Date;
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
  submittedAt: Date;
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
  earnedAt: Date;
}

// Recommendation
export type RecommendationReason = 'medication' | 'condition' | 'adherence' | 'popular';

export interface Recommendation {
  userId: string;
  contentId: string;
  score: number; // 0-100 relevance score
  reason: RecommendationReason;
  generatedAt: Date;
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
  reviewDate?: Date;
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
  reviewDate?: Date;
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

export interface TrackProgressDTO {
  userId: string;
  contentId: string;
  viewed?: boolean;
  completed?: boolean;
  timeSpent?: number; // in seconds
}

export interface SubmitQuizDTO {
  userId: string;
  quizId: string;
  answers: Record<string, any>;
}

export interface QuizResult {
  submission: QuizSubmission;
  correctAnswers: Record<string, any>;
  explanations?: Record<string, string>;
}
