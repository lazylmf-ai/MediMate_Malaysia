/**
 * Education Integration Service
 *
 * Handles integration between Education Hub and other modules
 * (medications, family circle, adherence tracking, etc.)
 */

import educationService from './educationService';
import { EducationContent } from '@/types/education';
import { store } from '@/store';
import { fetchRecommendations } from '@/store/slices/educationSlice';

class EducationIntegrationService {
  /**
   * Get educational content related to a specific medication
   * @param medicationId - ID of the medication
   * @param medicationName - Name of the medication (optional, for fallback search)
   * @param genericName - Generic name of the medication (optional)
   */
  async getContentByMedication(
    medicationId: string,
    medicationName?: string,
    genericName?: string
  ): Promise<EducationContent[]> {
    try {
      // Try to get content by medication ID first
      const contentById = await educationService.getContentByMedication(medicationId);

      if (contentById && contentById.length > 0) {
        return contentById;
      }

      // Fallback: search by medication name or generic name
      if (medicationName || genericName) {
        const searchQuery = genericName || medicationName || '';
        const searchResults = await educationService.searchContent({
          query: searchQuery,
          type: 'article',
          limit: 5,
        });

        return searchResults.results;
      }

      return [];
    } catch (error) {
      console.error('[EducationIntegration] Error fetching content by medication:', error);
      return [];
    }
  }

  /**
   * Get educational content for a medical condition
   * @param conditionId - ID of the medical condition
   */
  async getContentByCondition(conditionId: string): Promise<EducationContent[]> {
    try {
      return await educationService.getContentByCondition(conditionId);
    } catch (error) {
      console.error('[EducationIntegration] Error fetching content by condition:', error);
      return [];
    }
  }

  /**
   * Called when user adds or updates medications
   * Triggers recommendation refresh and checks for new content
   * @param userId - User ID
   * @param medicationIds - Array of medication IDs
   */
  async onMedicationChange(userId: string, medicationIds: string[]): Promise<void> {
    try {
      console.log('[EducationIntegration] Medication change detected, refreshing recommendations');

      // Refresh personalized recommendations
      await store.dispatch(fetchRecommendations());

      // Check if new educational content is available for these medications
      const newContent = await this.getNewContentForMedications(medicationIds);

      if (newContent.length > 0) {
        console.log(`[EducationIntegration] Found ${newContent.length} new educational content items`);

        // In a full implementation, this would trigger a notification
        // For now, just log it
        // await notificationService.send({
        //   userId,
        //   type: 'EDUCATION_NEW_CONTENT',
        //   title: 'New Learning Content Available',
        //   body: `We've added educational materials about your medications.`,
        //   data: {
        //     screen: 'Education',
        //     params: { tab: 'recommended' }
        //   }
        // });
      }
    } catch (error) {
      console.error('[EducationIntegration] Error handling medication change:', error);
    }
  }

  /**
   * Get new educational content for medications that user hasn't seen
   * @param medicationIds - Array of medication IDs
   */
  async getNewContentForMedications(medicationIds: string[]): Promise<EducationContent[]> {
    try {
      const allContent: EducationContent[] = [];

      // Fetch content for each medication
      for (const medId of medicationIds) {
        const content = await educationService.getContentByMedication(medId);
        allContent.push(...content);
      }

      // TODO: Filter out content user has already viewed
      // This would require tracking viewed content IDs
      // For now, return all content

      // Remove duplicates
      const uniqueContent = allContent.filter(
        (content, index, self) =>
          index === self.findIndex((c) => c.id === content.id)
      );

      return uniqueContent;
    } catch (error) {
      console.error('[EducationIntegration] Error getting new content for medications:', error);
      return [];
    }
  }

  /**
   * Share educational content with family circle members
   * @param contentId - Content ID to share
   * @param memberIds - Array of family member IDs
   */
  async shareContentWithFamily(
    contentId: string,
    memberIds: string[]
  ): Promise<{ success: boolean; error?: string }> {
    try {
      console.log(`[EducationIntegration] Sharing content ${contentId} with ${memberIds.length} family members`);

      // In a full implementation, this would:
      // 1. Create sharing records in the database
      // 2. Send notifications to family members
      // 3. Track sharing analytics

      // For now, just return success
      // TODO: Implement actual sharing logic when family circle API is ready

      return { success: true };
    } catch (error) {
      console.error('[EducationIntegration] Error sharing content:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to share content',
      };
    }
  }

  /**
   * Get family member's learning progress
   * @param memberId - Family member ID
   */
  async getFamilyMemberProgress(memberId: string): Promise<any> {
    try {
      // In a full implementation, this would fetch from family circle API
      // For now, return mock data structure

      return {
        memberId,
        contentViewed: 0,
        quizzesPassed: 0,
        currentStreak: 0,
        achievements: [],
      };
    } catch (error) {
      console.error('[EducationIntegration] Error getting family member progress:', error);
      return null;
    }
  }

  /**
   * Trigger educational intervention for low adherence
   * @param userId - User ID
   * @param adherenceRate - Current adherence rate (0-1)
   */
  async triggerAdherenceIntervention(
    userId: string,
    adherenceRate: number
  ): Promise<{ content: EducationContent | null; triggered: boolean }> {
    try {
      console.log(`[EducationIntegration] Checking adherence intervention for rate: ${(adherenceRate * 100).toFixed(1)}%`);

      // Threshold: 60%
      if (adherenceRate < 0.6) {
        // Get intervention content
        const content = await educationService.getAdherenceInterventionContent();

        if (content.length > 0) {
          console.log('[EducationIntegration] Adherence intervention content found');

          // In a full implementation, this would trigger a notification
          // For now, just return the content

          return {
            content: content[0],
            triggered: true,
          };
        }
      }

      return {
        content: null,
        triggered: false,
      };
    } catch (error) {
      console.error('[EducationIntegration] Error triggering adherence intervention:', error);
      return {
        content: null,
        triggered: false,
      };
    }
  }
}

// Export singleton instance
export default new EducationIntegrationService();
