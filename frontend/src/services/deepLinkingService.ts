/**
 * Deep Linking Service
 *
 * Handles deep link navigation and URL generation for the app.
 */

import { Linking } from 'react-native';
import { EducationDeepLinkGenerator } from '@/navigation/DeepLinkingConfig';

class DeepLinkingService {
  /**
   * Open a deep link URL
   * @param url - The deep link URL to open
   */
  async openDeepLink(url: string): Promise<void> {
    try {
      const canOpen = await Linking.canOpenURL(url);

      if (canOpen) {
        await Linking.openURL(url);
      } else {
        console.warn(`Cannot open URL: ${url}`);
      }
    } catch (error) {
      console.error('Error opening deep link:', error);
      throw error;
    }
  }

  /**
   * Generate and open a content deep link
   * @param contentId - Content ID
   * @param language - Optional language preference
   */
  async openContent(contentId: string, language?: 'ms' | 'en' | 'zh' | 'ta'): Promise<void> {
    const url = EducationDeepLinkGenerator.generateContentLink(contentId, language);
    await this.openDeepLink(url);
  }

  /**
   * Generate and open a quiz deep link
   * @param quizId - Quiz ID
   */
  async openQuiz(quizId: string): Promise<void> {
    const url = EducationDeepLinkGenerator.generateQuizLink(quizId);
    await this.openDeepLink(url);
  }

  /**
   * Generate and open a category deep link
   * @param category - Category name
   */
  async openCategory(category: string): Promise<void> {
    const url = EducationDeepLinkGenerator.generateCategoryLink(category);
    await this.openDeepLink(url);
  }

  /**
   * Generate and open a shared content deep link
   * @param contentId - Content ID
   * @param sharedBy - Family member ID who shared
   */
  async openSharedContent(contentId: string, sharedBy: string): Promise<void> {
    const url = EducationDeepLinkGenerator.generateSharedContentLink(contentId, sharedBy);
    await this.openDeepLink(url);
  }

  /**
   * Generate and open an intervention content deep link
   * @param contentId - Content ID
   * @param type - Intervention type
   */
  async openInterventionContent(
    contentId: string,
    type: 'adherence' | 'medication_change'
  ): Promise<void> {
    const url = EducationDeepLinkGenerator.generateInterventionLink(contentId, type);
    await this.openDeepLink(url);
  }

  /**
   * Share a content link via native share dialog
   * @param contentId - Content ID
   * @param contentTitle - Content title
   */
  async shareContent(contentId: string, contentTitle: string): Promise<void> {
    try {
      const url = EducationDeepLinkGenerator.generateContentLink(contentId);

      // In a full implementation, this would use React Native's Share API
      // For now, just log
      console.log('Sharing content:', { url, contentTitle });

      // TODO: Implement native sharing
      // const result = await Share.share({
      //   message: `Check out this health education content: ${contentTitle}`,
      //   url: url,
      //   title: contentTitle,
      // });
    } catch (error) {
      console.error('Error sharing content:', error);
      throw error;
    }
  }

  /**
   * Get the initial URL that opened the app
   */
  async getInitialURL(): Promise<string | null> {
    try {
      return await Linking.getInitialURL();
    } catch (error) {
      console.error('Error getting initial URL:', error);
      return null;
    }
  }

  /**
   * Add a listener for deep link events
   * @param callback - Function to call when a deep link is received
   * @returns Unsubscribe function
   */
  addDeepLinkListener(callback: (url: string) => void): () => void {
    const subscription = Linking.addEventListener('url', (event) => {
      callback(event.url);
    });

    return () => {
      subscription.remove();
    };
  }
}

// Export singleton instance
export default new DeepLinkingService();
