/**
 * Shared Type Definitions for Education Content Management
 * Used across services, controllers, and API responses
 */

export type Language = 'ms' | 'en' | 'zh' | 'ta';

export type ContentType = 'article' | 'video' | 'quiz' | 'interactive';

export type ContentStatus = 'draft' | 'in_review' | 'approved' | 'published' | 'archived';

export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';

export type TranslationStatus = 'missing' | 'draft' | 'review' | 'approved';

export type ReviewCommentSeverity = 'info' | 'suggestion' | 'required' | 'critical';

export type ReviewCommentStatus = 'pending' | 'addressed' | 'resolved' | 'wont_fix';

/**
 * Multi-language text field
 */
export interface MultiLanguageText {
  ms: string;
  en: string;
  zh: string;
  ta: string;
}

/**
 * Education content metadata
 */
export interface ContentMetadata {
  estimatedReadTime: number; // in minutes
  difficulty: DifficultyLevel;
  tags: string[];
  relatedMedications?: string[];
  relatedConditions?: string[];
  author?: string;
  reviewedBy?: string;
}

/**
 * Complete education content entity
 */
export interface EducationContent {
  id: string;
  type: ContentType;
  category: string;

  // Multi-language fields
  title: MultiLanguageText;
  description: MultiLanguageText;
  body: MultiLanguageText;

  // Metadata
  metadata: ContentMetadata;

  // Workflow status
  status: ContentStatus;
  author_id?: string;
  reviewer_id?: string;
  review_notes?: string;

  // Version control
  version: number;

  // Analytics
  view_count: number;
  completion_count: number;

  // Timestamps
  published_at?: Date;
  archived_at?: Date;
  created_at: Date;
  updated_at: Date;
}

/**
 * Draft content for creation/editing
 */
export interface EducationContentDraft {
  type: ContentType;
  category: string;
  title: Partial<MultiLanguageText>;
  description: Partial<MultiLanguageText>;
  body: Partial<MultiLanguageText>;
  metadata: Partial<ContentMetadata>;
}

/**
 * Content list item (summary view)
 */
export interface ContentListItem {
  id: string;
  type: ContentType;
  category: string;
  title: MultiLanguageText;
  description: MultiLanguageText;
  status: ContentStatus;
  version: number;
  author_id?: string;
  reviewer_id?: string;
  view_count: number;
  completion_count: number;
  created_at: Date;
  updated_at: Date;
  published_at?: Date;
}

/**
 * Translation status per language
 */
export interface LanguageTranslationStatus {
  language: Language;
  status: TranslationStatus;
  translator_id?: string;
  reviewer_id?: string;
  word_count: number;
  quality_score?: number;
  last_updated: Date;
}

/**
 * Content version history entry
 */
export interface ContentVersion {
  id: string;
  content_id: string;
  version: number;
  title: MultiLanguageText;
  description: MultiLanguageText;
  body: MultiLanguageText;
  metadata: ContentMetadata;
  changed_by: string;
  changed_at: Date;
  change_note?: string;
  change_type: 'created' | 'updated' | 'translated' | 'reviewed' | 'published' | 'unpublished' | 'archived' | 'restored';
  status_at_version: ContentStatus;
}

/**
 * Review comment
 */
export interface ReviewComment {
  id: string;
  content_id: string;
  version?: number;
  reviewer_id: string;
  comment: string;
  section?: string;
  severity: ReviewCommentSeverity;
  status: ReviewCommentStatus;
  parent_comment_id?: string;
  created_at: Date;
  updated_at: Date;
  resolved_at?: Date;
  resolved_by?: string;
}

/**
 * Content search/filter parameters
 */
export interface ContentSearchParams {
  search?: string;
  status?: ContentStatus | ContentStatus[];
  category?: string | string[];
  type?: ContentType | ContentType[];
  author_id?: string;
  reviewer_id?: string;
  language?: Language;
  tags?: string[];
  sortBy?: 'created_at' | 'updated_at' | 'published_at' | 'view_count' | 'title';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

/**
 * Paginated content list response
 */
export interface ContentListResponse {
  items: ContentListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Content analytics data
 */
export interface ContentAnalytics {
  content_id: string;
  views: number;
  completions: number;
  completion_rate: number;
  average_time_spent: number;
  average_rating: number;
  share_count: number;
  views_by_language: Record<Language, number>;
  views_by_date: Array<{ date: string; count: number }>;
}

/**
 * Analytics overview
 */
export interface AnalyticsOverview {
  total_content: number;
  total_views: number;
  total_completions: number;
  average_engagement: number;
  top_content: Array<{
    id: string;
    title: string;
    views: number;
    completions: number;
  }>;
  content_by_status: Record<ContentStatus, number>;
  views_by_month: Array<{ month: string; count: number }>;
}

/**
 * Content creation request
 */
export interface CreateContentRequest {
  type: ContentType;
  category: string;
  title: Partial<MultiLanguageText>;
  description: Partial<MultiLanguageText>;
  body: Partial<MultiLanguageText>;
  metadata: Partial<ContentMetadata>;
  status?: ContentStatus;
}

/**
 * Content update request
 */
export interface UpdateContentRequest {
  title?: Partial<MultiLanguageText>;
  description?: Partial<MultiLanguageText>;
  body?: Partial<MultiLanguageText>;
  metadata?: Partial<ContentMetadata>;
  category?: string;
  status?: ContentStatus;
  change_note?: string;
}

/**
 * Translation update request
 */
export interface UpdateTranslationRequest {
  title: string;
  description: string;
  body: string;
  translator_notes?: string;
}

/**
 * Review submission request
 */
export interface SubmitReviewRequest {
  content_id: string;
  reviewer_id?: string; // If admin is assigning
}

/**
 * Review action request
 */
export interface ReviewActionRequest {
  content_id: string;
  comment?: string;
  severity?: ReviewCommentSeverity;
  section?: string;
}
