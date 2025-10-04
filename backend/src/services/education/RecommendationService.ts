/**
 * Recommendation Service
 *
 * Rule-based recommendation engine for personalized educational content.
 * Matches content to user based on medications, conditions, adherence patterns, and popularity.
 */

import { DatabaseService } from '../database/databaseService';
import { EducationContentModel } from '../../models/education/EducationContent.model';
import { UserProgressModel } from '../../models/education/UserProgress.model';
import { EducationContent, Recommendation, RecommendationReason } from '../../types/education/education.types';

export interface UserContext {
  userId: string;
  medications?: string[]; // Medication IDs
  conditions?: string[]; // ICD-10 codes
  adherenceRate?: number; // 0-100 percentage
  language?: 'ms' | 'en' | 'zh' | 'ta';
}

export interface RecommendationScore {
  contentId: string;
  score: number;
  reason: RecommendationReason;
}

export class RecommendationService {
  private static instance: RecommendationService;
  private db: DatabaseService;
  private contentModel: EducationContentModel;
  private progressModel: UserProgressModel;

  constructor() {
    this.db = DatabaseService.getInstance();
    this.contentModel = EducationContentModel.getInstance();
    this.progressModel = UserProgressModel.getInstance();
  }

  public static getInstance(): RecommendationService {
    if (!RecommendationService.instance) {
      RecommendationService.instance = new RecommendationService();
    }
    return RecommendationService.instance;
  }

  /**
   * Generate personalized recommendations for user
   */
  async generateRecommendations(
    context: UserContext,
    limit: number = 10
  ): Promise<EducationContent[]> {
    // Get all candidate content
    const allContent = await this.getAllPublishedContent();

    // Get user's already-viewed content
    const { progress } = await this.progressModel.getUserProgressList(context.userId, undefined, 10000);
    const viewedContentIds = new Set(progress.map((p) => p.contentId));

    // Filter out already-viewed content
    const unseenContent = allContent.filter((c) => !viewedContentIds.has(c.id));

    // Calculate scores for each content
    const scoredContent = unseenContent.map((content) => this.scoreContent(content, context));

    // Sort by score descending
    scoredContent.sort((a, b) => b.score - a.score);

    // Take top N
    const topRecommendations = scoredContent.slice(0, limit);

    // Cache recommendations
    await this.cacheRecommendations(context.userId, topRecommendations);

    // Return content objects
    return topRecommendations.map((rec) => {
      const content = allContent.find((c) => c.id === rec.contentId)!;
      return content;
    });
  }

  /**
   * Get cached recommendations for user
   */
  async getCachedRecommendations(userId: string, limit: number = 10): Promise<EducationContent[]> {
    const query = `
      SELECT ec.*
      FROM education_recommendations er
      JOIN education_content ec ON er.content_id = ec.id
      WHERE er.user_id = $1
      ORDER BY er.score DESC
      LIMIT $2
    `;

    try {
      const conn = this.db.getConnection();
      const results = await conn.query(query, [userId, limit]);

      return results.map((row: any) => this.transformContent(row));
    } catch (error: any) {
      throw new Error(`Failed to get cached recommendations: ${error.message}`);
    }
  }

  /**
   * Get medication-related content
   */
  async getContentForMedication(medicationId: string, limit: number = 5): Promise<EducationContent[]> {
    const result = await this.contentModel.getContent({
      relatedMedication: medicationId,
      isPublished: true,
      limit,
    });

    return result.content;
  }

  /**
   * Get condition-related content
   */
  async getContentForCondition(conditionCode: string, limit: number = 5): Promise<EducationContent[]> {
    const result = await this.contentModel.getContent({
      relatedCondition: conditionCode,
      isPublished: true,
      limit,
    });

    return result.content;
  }

  /**
   * Get adherence intervention content
   * Recommends content based on low adherence patterns
   */
  async getAdherenceInterventionContent(userId: string, adherenceRate: number): Promise<EducationContent[]> {
    // If adherence is low (<70%), recommend adherence-focused content
    if (adherenceRate < 70) {
      const result = await this.contentModel.getContent({
        tags: ['adherence', 'medication_reminders', 'adherence_tips'],
        isPublished: true,
        limit: 5,
      });

      return result.content;
    }

    return [];
  }

  /**
   * Detect ICD-10 conditions from medication list
   * This is a simplified version - in production, would integrate with medication database
   */
  private async detectConditionsFromMedications(medications: string[]): Promise<string[]> {
    // In a real implementation, this would query the medication database
    // to get associated conditions (ICD-10 codes) for each medication

    // For now, return empty array - this would be populated by actual medication->condition mapping
    const conditions: string[] = [];

    // Example mapping logic (simplified):
    // if (medications.includes('metformin')) conditions.push('E11'); // Type 2 Diabetes
    // if (medications.includes('lisinopril')) conditions.push('I10'); // Hypertension

    return conditions;
  }

  /**
   * Score content based on user context
   */
  private scoreContent(content: EducationContent, context: UserContext): RecommendationScore {
    let score = 0;
    let reason: RecommendationReason = 'popular';

    // Score based on medication relevance (highest priority)
    if (context.medications && context.medications.length > 0) {
      const medicationMatch = content.relatedMedications.some((med) =>
        context.medications!.includes(med)
      );

      if (medicationMatch) {
        score += 50;
        reason = 'medication';
      }
    }

    // Score based on condition relevance
    if (context.conditions && context.conditions.length > 0) {
      const conditionMatch = content.relatedConditions.some((cond) =>
        context.conditions!.includes(cond)
      );

      if (conditionMatch) {
        score += 40;
        if (reason === 'popular') {
          reason = 'condition';
        }
      }
    }

    // Score based on adherence intervention need
    if (context.adherenceRate !== undefined && context.adherenceRate < 70) {
      const isAdherenceContent =
        content.tags.includes('adherence') ||
        content.tags.includes('medication_reminders') ||
        content.tags.includes('adherence_tips');

      if (isAdherenceContent) {
        score += 30;
        if (reason === 'popular') {
          reason = 'adherence';
        }
      }
    }

    // Score based on content popularity (view count and completion rate)
    const popularityScore = Math.min(20, content.viewCount / 10);
    score += popularityScore;

    const completionRate =
      content.viewCount > 0
        ? (content.completionCount / content.viewCount) * 10
        : 0;
    score += completionRate;

    // Bonus for recently published content
    if (content.publishedAt) {
      const daysSincePublished =
        (new Date().getTime() - content.publishedAt.getTime()) / (1000 * 60 * 60 * 24);

      if (daysSincePublished < 30) {
        score += 5;
      }
    }

    return {
      contentId: content.id,
      score: Math.round(score),
      reason,
    };
  }

  /**
   * Cache recommendations in database
   */
  private async cacheRecommendations(userId: string, recommendations: RecommendationScore[]): Promise<void> {
    if (recommendations.length === 0) {
      return;
    }

    // Clear old recommendations first
    const deleteQuery = `
      DELETE FROM education_recommendations
      WHERE user_id = $1
    `;

    // Insert new recommendations
    const insertQuery = `
      INSERT INTO education_recommendations (user_id, content_id, score, reason, generated_at)
      VALUES ${recommendations.map((_, i) => `($1, $${i * 3 + 2}, $${i * 3 + 3}, $${i * 3 + 4}, $${i * 3 + 5})`).join(', ')}
    `;

    const now = new Date();
    const params: any[] = [userId];

    for (const rec of recommendations) {
      params.push(rec.contentId, rec.score, rec.reason, now.toISOString());
    }

    try {
      const conn = this.db.getConnection();

      // Use transaction to ensure atomic operation
      await conn.tx(async (t: any) => {
        await t.none(deleteQuery, [userId]);
        await t.none(insertQuery, params);
      });
    } catch (error: any) {
      throw new Error(`Failed to cache recommendations: ${error.message}`);
    }
  }

  /**
   * Get all published content
   */
  private async getAllPublishedContent(): Promise<EducationContent[]> {
    const result = await this.contentModel.getContent({
      isPublished: true,
      limit: 10000,
    });

    return result.content;
  }

  /**
   * Transform database row to EducationContent type
   */
  private transformContent(row: any): EducationContent {
    return {
      id: row.id,
      type: row.type,
      category: row.category,
      title: JSON.parse(row.title),
      description: JSON.parse(row.description),
      content: JSON.parse(row.content),
      tags: row.tags || [],
      relatedMedications: row.related_medications || [],
      relatedConditions: row.related_conditions || [],
      difficulty: row.difficulty,
      estimatedReadTime: row.estimated_read_time,
      medicalReviewer: row.medical_reviewer,
      reviewDate: row.review_date ? new Date(row.review_date) : undefined,
      publishedAt: row.published_at ? new Date(row.published_at) : undefined,
      updatedAt: new Date(row.updated_at),
      isPublished: row.is_published,
      viewCount: row.view_count,
      completionCount: row.completion_count,
      averageRating: row.average_rating,
    };
  }
}
