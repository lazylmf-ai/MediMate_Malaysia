/**
 * Admin Service
 *
 * API client for admin content management operations.
 * Handles CRUD operations for educational content, reviews, and analytics.
 */

import { apiClient } from '@/api/client';
import type { ApiResponse } from '@/api/types';

// Type definitions
export type Language = 'ms' | 'en' | 'zh' | 'ta';
export type ContentType = 'article' | 'video' | 'quiz' | 'interactive';
export type ContentStatus = 'draft' | 'in_review' | 'approved' | 'published' | 'archived';
export type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced';
export type TranslationStatus = 'missing' | 'draft' | 'review' | 'approved';

export interface MultiLanguageText {
  ms: string;
  en: string;
  zh: string;
  ta: string;
}

export interface ContentMetadata {
  estimatedReadTime: number;
  difficulty: DifficultyLevel;
  tags: string[];
  relatedMedications?: string[];
  relatedConditions?: string[];
}

export interface EducationContent {
  id: string;
  type: ContentType;
  category: string;
  title: MultiLanguageText;
  description: MultiLanguageText;
  body: MultiLanguageText;
  metadata: ContentMetadata;
  status: ContentStatus;
  author_id?: string;
  reviewer_id?: string;
  review_notes?: string;
  version: number;
  view_count: number;
  completion_count: number;
  published_at?: string;
  archived_at?: string;
  created_at: string;
  updated_at: string;
}

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
  created_at: string;
  updated_at: string;
  published_at?: string;
}

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

export interface ContentListResponse {
  items: ContentListItem[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface CreateContentRequest {
  type: ContentType;
  category: string;
  title: Partial<MultiLanguageText>;
  description: Partial<MultiLanguageText>;
  body: Partial<MultiLanguageText>;
  metadata: Partial<ContentMetadata>;
  status?: ContentStatus;
}

export interface UpdateContentRequest {
  title?: Partial<MultiLanguageText>;
  description?: Partial<MultiLanguageText>;
  body?: Partial<MultiLanguageText>;
  metadata?: Partial<ContentMetadata>;
  category?: string;
  status?: ContentStatus;
  change_note?: string;
}

export interface TranslationStatusMap {
  ms: TranslationStatus;
  en: TranslationStatus;
  zh: TranslationStatus;
  ta: TranslationStatus;
}

class AdminService {
  private readonly baseUrl = '/api/admin/education';

  /**
   * List content with search and filters
   */
  async listContent(params: ContentSearchParams = {}): Promise<ContentListResponse> {
    const queryParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach(v => queryParams.append(key, String(v)));
        } else {
          queryParams.append(key, String(value));
        }
      }
    });

    const response = await apiClient.request<ContentListResponse>(
      `${this.baseUrl}/content?${queryParams.toString()}`,
      { method: 'GET' }
    );

    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch content list');
    }

    return response.data!;
  }

  /**
   * Get content by ID
   */
  async getContent(contentId: string): Promise<EducationContent> {
    const response = await apiClient.request<EducationContent>(
      `${this.baseUrl}/content/${contentId}`,
      { method: 'GET' }
    );

    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch content');
    }

    return response.data!;
  }

  /**
   * Create new content
   */
  async createContent(data: CreateContentRequest): Promise<EducationContent> {
    const response = await apiClient.request<EducationContent>(
      `${this.baseUrl}/content`,
      {
        method: 'POST',
        body: JSON.stringify(data)
      }
    );

    if (!response.success) {
      throw new Error(response.error || 'Failed to create content');
    }

    return response.data!;
  }

  /**
   * Update existing content
   */
  async updateContent(contentId: string, data: UpdateContentRequest): Promise<EducationContent> {
    const response = await apiClient.request<EducationContent>(
      `${this.baseUrl}/content/${contentId}`,
      {
        method: 'PUT',
        body: JSON.stringify(data)
      }
    );

    if (!response.success) {
      throw new Error(response.error || 'Failed to update content');
    }

    return response.data!;
  }

  /**
   * Delete content
   */
  async deleteContent(contentId: string): Promise<boolean> {
    const response = await apiClient.request(
      `${this.baseUrl}/content/${contentId}`,
      { method: 'DELETE' }
    );

    return response.success;
  }

  /**
   * Submit content for review
   */
  async submitForReview(contentId: string): Promise<EducationContent> {
    const response = await apiClient.request<EducationContent>(
      `${this.baseUrl}/content/${contentId}/submit-review`,
      { method: 'POST' }
    );

    if (!response.success) {
      throw new Error(response.error || 'Failed to submit for review');
    }

    return response.data!;
  }

  /**
   * Assign reviewer to content
   */
  async assignReviewer(contentId: string, reviewerId: string): Promise<EducationContent> {
    const response = await apiClient.request<EducationContent>(
      `${this.baseUrl}/content/${contentId}/assign-reviewer`,
      {
        method: 'POST',
        body: JSON.stringify({ reviewerId })
      }
    );

    if (!response.success) {
      throw new Error(response.error || 'Failed to assign reviewer');
    }

    return response.data!;
  }

  /**
   * Approve content
   */
  async approveContent(contentId: string, comment?: string): Promise<EducationContent> {
    const response = await apiClient.request<EducationContent>(
      `${this.baseUrl}/content/${contentId}/approve`,
      {
        method: 'POST',
        body: JSON.stringify({ comment })
      }
    );

    if (!response.success) {
      throw new Error(response.error || 'Failed to approve content');
    }

    return response.data!;
  }

  /**
   * Request changes to content
   */
  async requestChanges(contentId: string, comment: string): Promise<EducationContent> {
    const response = await apiClient.request<EducationContent>(
      `${this.baseUrl}/content/${contentId}/request-changes`,
      {
        method: 'POST',
        body: JSON.stringify({ comment })
      }
    );

    if (!response.success) {
      throw new Error(response.error || 'Failed to request changes');
    }

    return response.data!;
  }

  /**
   * Publish content
   */
  async publishContent(contentId: string): Promise<EducationContent> {
    const response = await apiClient.request<EducationContent>(
      `${this.baseUrl}/content/${contentId}/publish`,
      { method: 'POST' }
    );

    if (!response.success) {
      throw new Error(response.error || 'Failed to publish content');
    }

    return response.data!;
  }

  /**
   * Unpublish content
   */
  async unpublishContent(contentId: string): Promise<EducationContent> {
    const response = await apiClient.request<EducationContent>(
      `${this.baseUrl}/content/${contentId}/unpublish`,
      { method: 'POST' }
    );

    if (!response.success) {
      throw new Error(response.error || 'Failed to unpublish content');
    }

    return response.data!;
  }

  /**
   * Archive content
   */
  async archiveContent(contentId: string): Promise<EducationContent> {
    const response = await apiClient.request<EducationContent>(
      `${this.baseUrl}/content/${contentId}/archive`,
      { method: 'POST' }
    );

    if (!response.success) {
      throw new Error(response.error || 'Failed to archive content');
    }

    return response.data!;
  }

  /**
   * Get translation status for content
   */
  async getTranslationStatus(contentId: string): Promise<TranslationStatusMap> {
    const response = await apiClient.request<TranslationStatusMap>(
      `${this.baseUrl}/content/${contentId}/translations`,
      { method: 'GET' }
    );

    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch translation status');
    }

    return response.data!;
  }

  /**
   * Update translation for specific language
   */
  async updateTranslation(
    contentId: string,
    language: Language,
    data: {
      title: string;
      description: string;
      body: string;
    }
  ): Promise<EducationContent> {
    const response = await apiClient.request<EducationContent>(
      `${this.baseUrl}/content/${contentId}/translations/${language}`,
      {
        method: 'PUT',
        body: JSON.stringify(data)
      }
    );

    if (!response.success) {
      throw new Error(response.error || 'Failed to update translation');
    }

    return response.data!;
  }

  /**
   * Get pending reviews
   */
  async getPendingReviews(): Promise<ContentListItem[]> {
    const response = await apiClient.request<ContentListItem[]>(
      `${this.baseUrl}/content?status=in_review`,
      { method: 'GET' }
    );

    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch pending reviews');
    }

    return response.data!;
  }

  /**
   * Get my assigned reviews
   */
  async getMyAssignedReviews(): Promise<ContentListItem[]> {
    const response = await apiClient.request<ContentListItem[]>(
      `${this.baseUrl}/my-reviews`,
      { method: 'GET' }
    );

    if (!response.success) {
      throw new Error(response.error || 'Failed to fetch assigned reviews');
    }

    return response.data!;
  }
}

export const adminService = new AdminService();
