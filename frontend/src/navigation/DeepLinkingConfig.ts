/**
 * Deep Linking Configuration
 * 
 * Comprehensive deep linking setup for cultural events, medication reminders,
 * and family dashboard access with Malaysian cultural intelligence.
 */

import { LinkingOptions } from '@react-navigation/native';
import type { RootStackParamList } from '@/types/navigation';

export const DEEP_LINK_PREFIXES = {
  development: ['medimate://'],
  production: [
    'medimate://',
    'https://medimate.my',
    'https://app.medimate.my',
  ],
};

export const DEEP_LINK_CONFIG: LinkingOptions<RootStackParamList>['config'] = {
  screens: {
    Auth: {
      screens: {
        Login: 'auth/login',
        Register: 'auth/register',
        ForgotPassword: 'auth/forgot-password',
        MFAChallenge: 'auth/mfa/:challengeId',
      },
    },
    Main: {
      screens: {
        Home: {
          path: '/home',
          screens: {
            HomeMain: '',
            CulturalInsights: 'insights',
            PrayerTimes: 'prayer-times',
            TodaysReminders: 'reminders',
          },
        },
        Medications: {
          path: '/medications',
          screens: {
            MedicationsList: '',
            AddMedication: 'add',
            MedicationDetails: 'details/:medicationId',
            MedicationSchedule: 'schedule/:medicationId',
            MedicationReminder: 'reminder/:reminderId',
          },
        },
        Family: {
          path: '/family',
          screens: {
            FamilyDashboard: '',
            FamilyMember: 'member/:memberId',
            AddFamilyMember: 'add-member',
            FamilyEmergency: 'emergency',
            FamilyMedications: 'medications/:memberId',
          },
        },
        Profile: {
          path: '/profile',
          screens: {
            ProfileMain: '',
            CulturalSettings: 'cultural',
            LanguagePreferences: 'language',
            PrayerTimeSettings: 'prayer-times',
            FamilyStructure: 'family-structure',
            NotificationSettings: 'notifications',
          },
        },
        Education: {
          path: '/education',
          screens: {
            EducationHome: '',
            ContentDetail: 'content/:id',
            ContentSearch: 'search',
            CategoryBrowse: 'category/:category',
            QuizScreen: 'quiz/:quizId',
            LearningProgress: 'progress',
          },
        },
      },
    },
  },
};

/**
 * Cultural Event Deep Link Handlers
 */
export interface CulturalDeepLink {
  type: 'prayer_time' | 'festival' | 'family_event' | 'cultural_insight';
  data: {
    eventId?: string;
    prayerName?: 'fajr' | 'dhuhr' | 'asr' | 'maghrib' | 'isha';
    festivalName?: string;
    culturalContext?: string;
    familyMemberId?: string;
    timestamp?: number;
  };
  action: 'view' | 'remind' | 'schedule' | 'celebrate';
}

/**
 * Medication Deep Link Handlers
 */
export interface MedicationDeepLink {
  type: 'reminder' | 'schedule' | 'emergency' | 'adherence';
  data: {
    medicationId?: string;
    reminderId?: string;
    scheduleId?: string;
    emergencyType?: 'missed' | 'overdose' | 'interaction';
    familyMemberId?: string;
    timestamp?: number;
  };
  action: 'take' | 'skip' | 'reschedule' | 'emergency_contact';
}

/**
 * Family Deep Link Handlers
 */
export interface FamilyDeepLink {
  type: 'dashboard' | 'member' | 'emergency' | 'medication_status';
  data: {
    familyMemberId?: string;
    emergencyType?: 'medical' | 'medication' | 'prayer_conflict';
    medicationStatus?: 'missed' | 'taken' | 'overdue';
    culturalContext?: string;
    timestamp?: number;
  };
  action: 'view' | 'contact' | 'assist' | 'monitor';
}

/**
 * Deep Link URL Generator
 */
export class DeepLinkGenerator {
  private static baseUrl = __DEV__ 
    ? 'medimate://' 
    : 'https://app.medimate.my/';

  static generateCulturalEventLink(link: CulturalDeepLink): string {
    const { type, data, action } = link;
    let path = '';

    switch (type) {
      case 'prayer_time':
        path = `/home/prayer-times?prayer=${data.prayerName}&action=${action}`;
        if (data.timestamp) {
          path += `&time=${data.timestamp}`;
        }
        break;

      case 'festival':
        path = `/home/insights?festival=${data.festivalName}&action=${action}`;
        if (data.culturalContext) {
          path += `&context=${data.culturalContext}`;
        }
        break;

      case 'family_event':
        path = `/family/member/${data.familyMemberId}?event=${data.eventId}&action=${action}`;
        break;

      case 'cultural_insight':
        path = `/home/insights?insight=${data.eventId}&context=${data.culturalContext}`;
        break;
    }

    return `${this.baseUrl}${path}`;
  }

  static generateMedicationLink(link: MedicationDeepLink): string {
    const { type, data, action } = link;
    let path = '';

    switch (type) {
      case 'reminder':
        path = `/medications/reminder/${data.reminderId}?action=${action}`;
        if (data.familyMemberId) {
          path += `&member=${data.familyMemberId}`;
        }
        break;

      case 'schedule':
        path = `/medications/schedule/${data.medicationId}?action=${action}`;
        break;

      case 'emergency':
        path = `/medications/details/${data.medicationId}?emergency=${data.emergencyType}&action=${action}`;
        break;

      case 'adherence':
        path = `/family/medications/${data.familyMemberId}?view=adherence`;
        break;
    }

    return `${this.baseUrl}${path}`;
  }

  static generateFamilyLink(link: FamilyDeepLink): string {
    const { type, data, action } = link;
    let path = '';

    switch (type) {
      case 'dashboard':
        path = `/family?view=dashboard&action=${action}`;
        break;

      case 'member':
        path = `/family/member/${data.familyMemberId}?action=${action}`;
        break;

      case 'emergency':
        path = `/family/emergency?type=${data.emergencyType}&member=${data.familyMemberId}`;
        break;

      case 'medication_status':
        path = `/family/medications/${data.familyMemberId}?status=${data.medicationStatus}&action=${action}`;
        break;
    }

    return `${this.baseUrl}${path}`;
  }
}

/**
 * Deep Link Parser
 */
export class DeepLinkParser {
  static parseCulturalEventLink(url: string): CulturalDeepLink | null {
    try {
      const urlObj = new URL(url.replace('medimate://', 'https://temp/'));
      const params = new URLSearchParams(urlObj.search);
      
      if (urlObj.pathname.includes('/prayer-times')) {
        return {
          type: 'prayer_time',
          data: {
            prayerName: params.get('prayer') as any,
            timestamp: params.get('time') ? parseInt(params.get('time')!) : undefined,
          },
          action: (params.get('action') as any) || 'view',
        };
      }

      if (urlObj.pathname.includes('/insights')) {
        return {
          type: params.has('festival') ? 'festival' : 'cultural_insight',
          data: {
            festivalName: params.get('festival') || undefined,
            eventId: params.get('insight') || undefined,
            culturalContext: params.get('context') || undefined,
          },
          action: (params.get('action') as any) || 'view',
        };
      }

      return null;
    } catch (error) {
      console.error('Failed to parse cultural event deep link:', error);
      return null;
    }
  }

  static parseMedicationLink(url: string): MedicationDeepLink | null {
    try {
      const urlObj = new URL(url.replace('medimate://', 'https://temp/'));
      const params = new URLSearchParams(urlObj.search);
      const pathParts = urlObj.pathname.split('/');

      if (pathParts.includes('reminder')) {
        return {
          type: 'reminder',
          data: {
            reminderId: pathParts[pathParts.indexOf('reminder') + 1],
            familyMemberId: params.get('member') || undefined,
          },
          action: (params.get('action') as any) || 'view',
        };
      }

      if (pathParts.includes('schedule')) {
        return {
          type: 'schedule',
          data: {
            medicationId: pathParts[pathParts.indexOf('schedule') + 1],
          },
          action: (params.get('action') as any) || 'view',
        };
      }

      return null;
    } catch (error) {
      console.error('Failed to parse medication deep link:', error);
      return null;
    }
  }

  static parseFamilyLink(url: string): FamilyDeepLink | null {
    try {
      const urlObj = new URL(url.replace('medimate://', 'https://temp/'));
      const params = new URLSearchParams(urlObj.search);
      const pathParts = urlObj.pathname.split('/');

      if (pathParts.includes('emergency')) {
        return {
          type: 'emergency',
          data: {
            emergencyType: params.get('type') as any,
            familyMemberId: params.get('member') || undefined,
          },
          action: 'contact',
        };
      }

      if (pathParts.includes('member')) {
        return {
          type: 'member',
          data: {
            familyMemberId: pathParts[pathParts.indexOf('member') + 1],
          },
          action: (params.get('action') as any) || 'view',
        };
      }

      return null;
    } catch (error) {
      console.error('Failed to parse family deep link:', error);
      return null;
    }
  }
}

/**
 * Cultural Context Deep Link Validator
 */
export class CulturalDeepLinkValidator {
  static validatePrayerTimeLink(link: CulturalDeepLink): boolean {
    if (link.type !== 'prayer_time') return false;
    
    const validPrayers = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
    return validPrayers.includes(link.data.prayerName || '');
  }

  static validateFestivalLink(link: CulturalDeepLink): boolean {
    if (link.type !== 'festival') return false;
    return !!link.data.festivalName;
  }

  static validateFamilyEventLink(link: CulturalDeepLink): boolean {
    if (link.type !== 'family_event') return false;
    return !!link.data.familyMemberId && !!link.data.eventId;
  }

  static validateCulturalInsightLink(link: CulturalDeepLink): boolean {
    if (link.type !== 'cultural_insight') return false;
    return !!link.data.eventId;
  }
}

/**
 * Deep Link Analytics
 */
export class DeepLinkAnalytics {
  static trackDeepLinkOpen(url: string, successful: boolean, context?: any): void {
    // Implementation will be added with analytics service
    console.log('Deep link tracked:', {
      url,
      successful,
      context,
      timestamp: new Date().toISOString(),
    });
  }

  static trackCulturalEventNavigation(link: CulturalDeepLink): void {
    console.log('Cultural event navigation:', {
      type: link.type,
      action: link.action,
      hasContext: !!link.data.culturalContext,
      timestamp: new Date().toISOString(),
    });
  }

  static trackMedicationNavigation(link: MedicationDeepLink): void {
    console.log('Medication navigation:', {
      type: link.type,
      action: link.action,
      hasFamilyContext: !!link.data.familyMemberId,
      timestamp: new Date().toISOString(),
    });
  }

  static trackFamilyNavigation(link: FamilyDeepLink): void {
    console.log('Family navigation:', {
      type: link.type,
      action: link.action,
      isEmergency: link.type === 'emergency',
      timestamp: new Date().toISOString(),
    });
  }

  static trackEducationNavigation(link: EducationDeepLink): void {
    console.log('Education navigation:', {
      type: link.type,
      action: link.action,
      hasSharing: !!link.data.sharedBy,
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Education Deep Link Handlers
 */
export interface EducationDeepLink {
  type: 'content' | 'quiz' | 'achievement' | 'shared_content' | 'intervention';
  data: {
    contentId?: string;
    quizId?: string;
    category?: string;
    achievementId?: string;
    sharedBy?: string; // Family member ID who shared
    interventionType?: 'adherence' | 'medication_change';
    medicationId?: string;
    language?: 'ms' | 'en' | 'zh' | 'ta';
    timestamp?: number;
  };
  action: 'view' | 'take_quiz' | 'share' | 'bookmark';
}

export class EducationDeepLinkGenerator {
  private static baseUrl = __DEV__
    ? 'medimate://'
    : 'https://app.medimate.my/';

  static generateContentLink(contentId: string, language?: string): string {
    let path = `/education/content/${contentId}`;
    if (language) {
      path += `?lang=${language}`;
    }
    return `${this.baseUrl}${path}`;
  }

  static generateQuizLink(quizId: string): string {
    return `${this.baseUrl}/education/quiz/${quizId}`;
  }

  static generateCategoryLink(category: string): string {
    return `${this.baseUrl}/education/category/${category}`;
  }

  static generateSharedContentLink(contentId: string, sharedBy: string): string {
    return `${this.baseUrl}/education/content/${contentId}?shared_by=${sharedBy}`;
  }

  static generateInterventionLink(contentId: string, type: 'adherence' | 'medication_change'): string {
    return `${this.baseUrl}/education/content/${contentId}?intervention=${type}`;
  }
}