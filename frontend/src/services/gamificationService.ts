/**
 * Gamification Service
 *
 * Service layer for gamification features including achievements, badges, and streaks.
 * Provides achievement logic with multi-language support for elderly Malaysian users.
 */

import { educationService } from './educationService';
import type { Badge, Achievement, UserStats, MultiLanguageText } from '@/types/education';

/**
 * Achievement definition structure
 */
interface AchievementDefinition {
  id: string;
  name: MultiLanguageText;
  description: MultiLanguageText;
  icon: string;
  condition: (progress: UserStats) => boolean;
}

/**
 * Achievement definitions with culturally neutral icons and dignified language
 * Icons selected to be universally understood and appropriate for elderly users
 */
const ACHIEVEMENT_DEFINITIONS: Record<string, AchievementDefinition> = {
  first_content: {
    id: 'first_content',
    name: {
      ms: 'Permulaan',
      en: 'First Steps',
      zh: '初学者',
      ta: 'முதல் படி',
    },
    description: {
      ms: 'Anda telah melihat kandungan pertama anda',
      en: 'You have viewed your first content',
      zh: '您已查看第一个内容',
      ta: 'நீங்கள் உங்கள் முதல் உள்ளடக்கத்தைப் பார்த்தீர்கள்',
    },
    icon: '🌱',
    condition: (progress) => progress.totalContentViewed >= 1,
  },

  learner_10: {
    id: 'learner_10',
    name: {
      ms: 'Pelajar Berdedikasi',
      en: 'Dedicated Learner',
      zh: '专心学习者',
      ta: 'அர்ப்பணிப்புள்ள கற்பவர்',
    },
    description: {
      ms: 'Anda telah menyelesaikan 10 kandungan pembelajaran',
      en: 'You have completed 10 learning contents',
      zh: '您已完成10个学习内容',
      ta: 'நீங்கள் 10 கற்றல் உள்ளடக்கங்களை முடித்துள்ளீர்கள்',
    },
    icon: '📚',
    condition: (progress) => progress.totalContentCompleted >= 10,
  },

  learner_50: {
    id: 'learner_50',
    name: {
      ms: 'Pelajar Cemerlang',
      en: 'Excellent Learner',
      zh: '优秀学习者',
      ta: 'சிறந்த கற்பவர்',
    },
    description: {
      ms: 'Anda telah menyelesaikan 50 kandungan pembelajaran',
      en: 'You have completed 50 learning contents',
      zh: '您已完成50个学习内容',
      ta: 'நீங்கள் 50 கற்றல் உள்ளடக்கங்களை முடித்துள்ளீர்கள்',
    },
    icon: '📖',
    condition: (progress) => progress.totalContentCompleted >= 50,
  },

  quiz_master: {
    id: 'quiz_master',
    name: {
      ms: 'Pakar Kuiz',
      en: 'Quiz Expert',
      zh: '测验专家',
      ta: 'வினாடி வினா வல்லுநர்',
    },
    description: {
      ms: 'Anda telah lulus 5 kuiz',
      en: 'You have passed 5 quizzes',
      zh: '您已通过5次测验',
      ta: 'நீங்கள் 5 வினாடி வினாக்களில் தேர்ச்சி பெற்றுள்ளீர்கள்',
    },
    icon: '🎓',
    condition: (progress) => progress.totalQuizzesPassed >= 5,
  },

  perfect_score: {
    id: 'perfect_score',
    name: {
      ms: 'Cemerlang',
      en: 'Perfect Score',
      zh: '满分',
      ta: 'முழு மதிப்பெண்',
    },
    description: {
      ms: 'Anda mendapat 100% dalam kuiz',
      en: 'You scored 100% on a quiz',
      zh: '您在测验中获得100分',
      ta: 'நீங்கள் ஒரு வினாடி வினாவில் 100% பெற்றீர்கள்',
    },
    icon: '⭐',
    condition: (progress) => progress.averageQuizScore === 100,
  },

  '7_day_streak': {
    id: '7_day_streak',
    name: {
      ms: 'Komited 7 Hari',
      en: '7-Day Commitment',
      zh: '7天坚持',
      ta: '7 நாள் உறுதி',
    },
    description: {
      ms: 'Anda belajar selama 7 hari berturut-turut',
      en: 'You have learned for 7 consecutive days',
      zh: '您已连续学习7天',
      ta: 'நீங்கள் தொடர்ந்து 7 நாட்கள் கற்றுள்ளீர்கள்',
    },
    icon: '🔥',
    condition: (progress) => progress.currentStreak >= 7,
  },

  '30_day_streak': {
    id: '30_day_streak',
    name: {
      ms: 'Komited 30 Hari',
      en: '30-Day Commitment',
      zh: '30天坚持',
      ta: '30 நாள் உறுதி',
    },
    description: {
      ms: 'Anda belajar selama 30 hari berturut-turut',
      en: 'You have learned for 30 consecutive days',
      zh: '您已连续学习30天',
      ta: 'நீங்கள் தொடர்ந்து 30 நாட்கள் கற்றுள்ளீர்கள்',
    },
    icon: '💪',
    condition: (progress) => progress.currentStreak >= 30,
  },

  diabetes_expert: {
    id: 'diabetes_expert',
    name: {
      ms: 'Pakar Diabetes',
      en: 'Diabetes Expert',
      zh: '糖尿病专家',
      ta: 'நீரிழிவு வல்லுநர்',
    },
    description: {
      ms: 'Anda telah menyelesaikan semua modul diabetes',
      en: 'You have completed all diabetes modules',
      zh: '您已完成所有糖尿病模块',
      ta: 'நீங்கள் அனைத்து நீரிழிவு தொகுதிகளையும் முடித்துள்ளீர்கள்',
    },
    icon: '💙',
    condition: (progress) => {
      // This requires custom tracking per category
      // We'll implement this through API once category progress is available
      return false;
    },
  },

  medication_expert: {
    id: 'medication_expert',
    name: {
      ms: 'Pakar Ubat',
      en: 'Medication Expert',
      zh: '药物专家',
      ta: 'மருந்து வல்லுநர்',
    },
    description: {
      ms: 'Anda telah menyelesaikan semua modul ubat-ubatan',
      en: 'You have completed all medication modules',
      zh: '您已完成所有药物模块',
      ta: 'நீங்கள் அனைத்து மருந்து தொகுதிகளையும் முடித்துள்ளீர்கள்',
    },
    icon: '💊',
    condition: (progress) => {
      // This requires custom tracking per category
      // We'll implement this through API once category progress is available
      return false;
    },
  },

  condition_expert: {
    id: 'condition_expert',
    name: {
      ms: 'Pakar Penyakit',
      en: 'Health Condition Expert',
      zh: '健康状况专家',
      ta: 'உடல்நலம் வல்லுநர்',
    },
    description: {
      ms: 'Anda telah menyelesaikan semua modul penyakit kronik',
      en: 'You have completed all chronic condition modules',
      zh: '您已完成所有慢性病模块',
      ta: 'நீங்கள் அனைத்து நாள்பட்ட நோய் தொகுதிகளையும் முடித்துள்ளீர்கள்',
    },
    icon: '🩺',
    condition: (progress) => {
      // This requires custom tracking per category
      // We'll implement this through API once category progress is available
      return false;
    },
  },
};

class GamificationService {
  /**
   * Check user achievements against progress and return newly earned badges
   */
  async checkAchievements(): Promise<Badge[]> {
    try {
      // Get user progress stats
      const statsResponse = await educationService.getUserStats();
      if (!statsResponse.success || !statsResponse.data) {
        console.error('Failed to get user stats:', statsResponse.error);
        return [];
      }

      const userProgress = statsResponse.data;

      // Get already earned achievements
      const earnedResponse = await educationService.getUserAchievements();
      if (!earnedResponse.success || !earnedResponse.data) {
        console.error('Failed to get user achievements:', earnedResponse.error);
        return [];
      }

      const earnedBadgeIds = new Set(
        earnedResponse.data.map((achievement) => achievement.badgeId)
      );

      const newBadges: Badge[] = [];

      // Check each achievement definition
      for (const definition of Object.values(ACHIEVEMENT_DEFINITIONS)) {
        // Skip if already earned
        if (earnedBadgeIds.has(definition.id)) {
          continue;
        }

        // Check if condition is met
        if (definition.condition(userProgress)) {
          // Award badge via API
          const awardResponse = await this.awardBadge(definition.id);
          if (awardResponse.success && awardResponse.data) {
            newBadges.push({
              id: definition.id,
              name: definition.name,
              description: definition.description,
              icon: definition.icon,
              earnedAt: awardResponse.data.earnedAt,
            });
          }
        }
      }

      return newBadges;
    } catch (error) {
      console.error('Error checking achievements:', error);
      return [];
    }
  }

  /**
   * Award a badge to the current user
   */
  async awardBadge(badgeId: string): Promise<{ success: boolean; data?: Achievement; error?: string }> {
    try {
      // Note: The API expects userId, but educationService.awardAchievement
      // should extract userId from the auth token on the backend
      // For now, we'll use a placeholder - this should be updated when backend is ready
      const response = await educationService.awardAchievement('current', badgeId);
      return response;
    } catch (error) {
      console.error('Error awarding badge:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to award badge',
      };
    }
  }

  /**
   * Track learning activity and update streaks
   * This should be called whenever the user views or completes content
   */
  async trackLearningActivity(contentId: string, timeSpent = 0): Promise<void> {
    try {
      // Track the view/completion
      await educationService.trackView(contentId, timeSpent);

      // Update streaks (backend handles this automatically)
      await educationService.checkStreakAchievements();

      // Check for new achievements
      await this.checkAchievements();
    } catch (error) {
      console.error('Error tracking learning activity:', error);
    }
  }

  /**
   * Get all earned achievements as Badge objects
   */
  async getEarnedAchievements(): Promise<Badge[]> {
    try {
      const response = await educationService.getUserAchievements();
      if (!response.success || !response.data) {
        return [];
      }

      return response.data.map((achievement) => {
        const definition = ACHIEVEMENT_DEFINITIONS[achievement.badgeId];
        return {
          id: achievement.badgeId,
          name: definition?.name || { ms: '', en: '', zh: '', ta: '' },
          description: definition?.description || { ms: '', en: '', zh: '', ta: '' },
          icon: definition?.icon || '🏆',
          earnedAt: achievement.earnedAt,
        };
      });
    } catch (error) {
      console.error('Error getting earned achievements:', error);
      return [];
    }
  }

  /**
   * Get all achievements (both earned and locked) as Badge objects
   */
  async getAllAchievements(): Promise<Badge[]> {
    try {
      // Get earned achievements
      const earnedResponse = await educationService.getUserAchievements();
      const earnedBadgeIds = new Set(
        earnedResponse.success && earnedResponse.data
          ? earnedResponse.data.map((a) => a.badgeId)
          : []
      );

      const earnedMap = new Map(
        earnedResponse.success && earnedResponse.data
          ? earnedResponse.data.map((a) => [a.badgeId, a.earnedAt])
          : []
      );

      // Map all achievement definitions to Badge objects
      return Object.values(ACHIEVEMENT_DEFINITIONS).map((definition) => ({
        id: definition.id,
        name: definition.name,
        description: definition.description,
        icon: definition.icon,
        earnedAt: earnedMap.get(definition.id), // undefined if not earned (locked)
      }));
    } catch (error) {
      console.error('Error getting all achievements:', error);
      return [];
    }
  }

  /**
   * Get achievement definition by ID
   */
  getAchievementDefinition(badgeId: string): AchievementDefinition | undefined {
    return ACHIEVEMENT_DEFINITIONS[badgeId];
  }

  /**
   * Get all achievement definitions
   */
  getAllAchievementDefinitions(): AchievementDefinition[] {
    return Object.values(ACHIEVEMENT_DEFINITIONS);
  }
}

export const gamificationService = new GamificationService();
