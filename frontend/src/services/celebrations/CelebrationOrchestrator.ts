/**
 * Celebration Orchestrator
 *
 * Manages the complete celebration lifecycle for medication adherence milestones.
 * Orchestrates animations, notifications, family sharing, and cultural-appropriate
 * celebrations based on Malaysian traditions and festivals.
 */

import {
  AdherenceMilestone,
  CulturalTheme
} from '../../types/adherence';
import { CulturalMilestoneEngine, MilestoneDetection } from '../milestones/CulturalMilestoneEngine';
import { FestivalEvent } from '../festivals/FestivalCalendarService';

export interface CelebrationConfig {
  enableAnimations: boolean;
  enableSounds: boolean;
  enableHapticFeedback: boolean;
  enableFamilySharing: boolean;
  animationIntensity: 'subtle' | 'moderate' | 'enthusiastic';
  celebrationDuration: number; // milliseconds
  autoShare: boolean;
  respectQuietHours: boolean;
  culturalSensitivity: 'high' | 'medium' | 'low';
}

export interface CelebrationSequence {
  id: string;
  milestone: AdherenceMilestone;
  phases: CelebrationPhase[];
  totalDuration: number;
  culturalContext?: FestivalEvent;
  familyNotification?: boolean;
}

export interface CelebrationPhase {
  type: 'intro' | 'main' | 'message' | 'sharing' | 'outro';
  duration: number;
  animations: AnimationStep[];
  sounds?: SoundEffect[];
  haptics?: HapticPattern[];
}

export interface AnimationStep {
  element: string;
  animation: string;
  duration: number;
  delay: number;
  properties: Record<string, any>;
}

export interface SoundEffect {
  name: string;
  volume: number;
  delay: number;
  culturalTheme?: string;
}

export interface HapticPattern {
  pattern: 'success' | 'celebration' | 'gentle' | 'emphasis';
  intensity: number;
  duration: number;
}

export interface CelebrationResult {
  celebrationId: string;
  milestone: AdherenceMilestone;
  wasShown: boolean;
  userEngagement: 'dismissed' | 'watched' | 'shared' | 'saved';
  duration: number;
  culturalAppropriate: boolean;
}

export interface FamilyNotification {
  recipientId: string;
  relationship: string;
  notificationType: 'milestone' | 'encouragement' | 'celebration';
  message: string;
  culturalContext: string;
  shareableCard?: string;
}

export class CelebrationOrchestrator {
  private config: CelebrationConfig;
  private activeSequences: Map<string, CelebrationSequence> = new Map();
  private celebrationHistory: Map<string, CelebrationResult[]> = new Map();
  private familyNotificationQueue: FamilyNotification[] = [];

  constructor(config?: Partial<CelebrationConfig>) {
    this.config = {
      enableAnimations: true,
      enableSounds: true,
      enableHapticFeedback: true,
      enableFamilySharing: true,
      animationIntensity: 'moderate',
      celebrationDuration: 5000,
      autoShare: false,
      respectQuietHours: true,
      culturalSensitivity: 'high',
      ...config
    };
  }

  /**
   * Orchestrate celebration for detected milestones
   */
  async orchestrateCelebration(
    detection: MilestoneDetection,
    patientId: string
  ): Promise<CelebrationSequence | null> {
    if (!detection.triggerCelebration) {
      return null;
    }

    // Check if celebration is appropriate at this time
    if (!await this.isCelebrationAppropriate(detection.milestone)) {
      // Queue for later if not appropriate now
      await this.queueCelebration(detection, patientId);
      return null;
    }

    // Create celebration sequence
    const sequence = await this.createCelebrationSequence(detection, patientId);

    // Register and start the sequence
    this.activeSequences.set(sequence.id, sequence);

    // Schedule family notification if appropriate
    if (sequence.familyNotification) {
      await this.scheduleFamilyNotification(detection.milestone, patientId);
    }

    return sequence;
  }

  /**
   * Create culturally-appropriate celebration sequence
   */
  private async createCelebrationSequence(
    detection: MilestoneDetection,
    patientId: string
  ): Promise<CelebrationSequence> {
    const milestone = detection.milestone;
    const culturalTheme = milestone.culturalTheme;

    // Build celebration phases
    const phases: CelebrationPhase[] = [];

    // 1. Intro phase
    phases.push(this.createIntroPhase(culturalTheme));

    // 2. Main celebration phase
    phases.push(this.createMainCelebrationPhase(milestone, detection.festivalTheme));

    // 3. Message phase
    phases.push(this.createMessagePhase(detection.contextualMessage, culturalTheme));

    // 4. Sharing phase (if enabled)
    if (this.config.enableFamilySharing && milestone.shareable) {
      phases.push(this.createSharingPhase(milestone));
    }

    // 5. Outro phase
    phases.push(this.createOutroPhase(culturalTheme));

    const totalDuration = phases.reduce((sum, phase) => sum + phase.duration, 0);

    return {
      id: `celebration_${milestone.id}_${Date.now()}`,
      milestone,
      phases,
      totalDuration,
      culturalContext: detection.festivalTheme,
      familyNotification: this.shouldNotifyFamily(milestone)
    };
  }

  /**
   * Create intro animation phase
   */
  private createIntroPhase(theme: CulturalTheme): CelebrationPhase {
    const duration = 800;

    return {
      type: 'intro',
      duration,
      animations: [
        {
          element: 'celebration-container',
          animation: 'fadeIn',
          duration: 300,
          delay: 0,
          properties: { opacity: 1 }
        },
        {
          element: 'cultural-icon',
          animation: 'bounceIn',
          duration: 500,
          delay: 100,
          properties: {
            scale: 1,
            color: theme.primaryColor
          }
        },
        {
          element: 'background-pattern',
          animation: 'slideInFromTop',
          duration: 600,
          delay: 200,
          properties: {
            transform: 'translateY(0)',
            opacity: 0.3
          }
        }
      ],
      sounds: this.config.enableSounds ? [
        {
          name: theme.soundEffect || 'celebration_chime',
          volume: 0.6,
          delay: 100,
          culturalTheme: theme.name
        }
      ] : [],
      haptics: this.config.enableHapticFeedback ? [
        {
          pattern: 'gentle',
          intensity: 0.5,
          duration: 200
        }
      ] : []
    };
  }

  /**
   * Create main celebration phase
   */
  private createMainCelebrationPhase(
    milestone: AdherenceMilestone,
    festivalContext?: FestivalEvent
  ): CelebrationPhase {
    const theme = milestone.culturalTheme;
    const duration = this.getCelebrationDuration(milestone.type);

    const animations: AnimationStep[] = [
      {
        element: 'milestone-badge',
        animation: 'zoomIn',
        duration: 600,
        delay: 0,
        properties: {
          scale: 1,
          rotation: '0deg'
        }
      },
      {
        element: 'achievement-title',
        animation: 'slideInFromLeft',
        duration: 500,
        delay: 200,
        properties: {
          transform: 'translateX(0)',
          opacity: 1
        }
      },
      {
        element: 'cultural-pattern',
        animation: this.getCulturalPatternAnimation(theme.name),
        duration: duration,
        delay: 300,
        properties: {
          opacity: 1,
          transform: 'scale(1)'
        }
      }
    ];

    // Add festival-specific animations
    if (festivalContext) {
      animations.push(...this.getFestivalAnimations(festivalContext, duration));
    }

    // Add celebration particles based on intensity
    if (this.config.animationIntensity !== 'subtle') {
      animations.push({
        element: 'celebration-particles',
        animation: 'particleExplosion',
        duration: duration,
        delay: 400,
        properties: {
          particleCount: this.getParticleCount(),
          colors: [theme.primaryColor, theme.secondaryColor]
        }
      });
    }

    return {
      type: 'main',
      duration,
      animations,
      sounds: this.config.enableSounds ? [
        {
          name: this.getCelebrationSound(milestone.type, theme.name),
          volume: 0.8,
          delay: 0
        }
      ] : [],
      haptics: this.config.enableHapticFeedback ? [
        {
          pattern: 'celebration',
          intensity: this.getHapticIntensity(milestone.type),
          duration: 300
        }
      ] : []
    };
  }

  /**
   * Create message display phase
   */
  private createMessagePhase(message: string, theme: CulturalTheme): CelebrationPhase {
    return {
      type: 'message',
      duration: 2000,
      animations: [
        {
          element: 'celebration-message',
          animation: 'typeWriter',
          duration: 1500,
          delay: 0,
          properties: {
            text: message,
            color: theme.primaryColor
          }
        },
        {
          element: 'cultural-accent',
          animation: 'pulse',
          duration: 2000,
          delay: 500,
          properties: {
            color: theme.secondaryColor,
            opacity: 0.7
          }
        }
      ],
      sounds: this.config.enableSounds ? [
        {
          name: 'message_chime',
          volume: 0.4,
          delay: 1000
        }
      ] : []
    };
  }

  /**
   * Create sharing phase
   */
  private createSharingPhase(milestone: AdherenceMilestone): CelebrationPhase {
    return {
      type: 'sharing',
      duration: 1500,
      animations: [
        {
          element: 'share-options',
          animation: 'slideInFromBottom',
          duration: 400,
          delay: 0,
          properties: {
            transform: 'translateY(0)',
            opacity: 1
          }
        },
        {
          element: 'family-icon',
          animation: 'bounce',
          duration: 600,
          delay: 200,
          properties: {
            scale: 1.1,
            color: milestone.culturalTheme.primaryColor
          }
        }
      ]
    };
  }

  /**
   * Create outro phase
   */
  private createOutroPhase(theme: CulturalTheme): CelebrationPhase {
    return {
      type: 'outro',
      duration: 800,
      animations: [
        {
          element: 'celebration-container',
          animation: 'fadeOut',
          duration: 500,
          delay: 300,
          properties: { opacity: 0 }
        },
        {
          element: 'final-sparkle',
          animation: 'sparkle',
          duration: 400,
          delay: 0,
          properties: {
            color: theme.primaryColor,
            opacity: 0.8
          }
        }
      ],
      sounds: this.config.enableSounds ? [
        {
          name: 'celebration_end',
          volume: 0.3,
          delay: 300
        }
      ] : [],
      haptics: this.config.enableHapticFeedback ? [
        {
          pattern: 'gentle',
          intensity: 0.3,
          duration: 100
        }
      ] : []
    };
  }

  /**
   * Check if celebration is appropriate at current time
   */
  private async isCelebrationAppropriate(milestone: AdherenceMilestone): Promise<boolean> {
    // Check quiet hours if enabled
    if (this.config.respectQuietHours && this.isQuietHours()) {
      return false;
    }

    // Check cultural sensitivity
    if (this.config.culturalSensitivity === 'high') {
      const currentlyPrayerTime = await this.isCurrentlyPrayerTime();
      if (currentlyPrayerTime) {
        return false;
      }
    }

    // Check if user is in Do Not Disturb mode
    if (await this.isDoNotDisturbMode()) {
      return false;
    }

    return true;
  }

  /**
   * Schedule family notification for milestone achievement
   */
  private async scheduleFamilyNotification(
    milestone: AdherenceMilestone,
    patientId: string
  ): Promise<void> {
    // Get family members who should be notified
    const familyMembers = await this.getFamilyMembers(patientId);

    for (const member of familyMembers) {
      const notification: FamilyNotification = {
        recipientId: member.id,
        relationship: member.relationship,
        notificationType: 'milestone',
        message: await this.createFamilyNotificationMessage(milestone, member.relationship),
        culturalContext: milestone.culturalTheme.name,
        shareableCard: await this.generateShareableCard(milestone)
      };

      this.familyNotificationQueue.push(notification);
    }

    // Process the notification queue
    await this.processFamilyNotifications();
  }

  /**
   * Create family notification message
   */
  private async createFamilyNotificationMessage(
    milestone: AdherenceMilestone,
    relationship: string
  ): Promise<string> {
    const relationshipMessages = {
      spouse: {
        en: `🎉 Your spouse just achieved ${milestone.name}! Their dedication to health is inspiring.`,
        ms: `🎉 Pasangan anda baru sahaja mencapai ${milestone.name}! Dedikasi mereka terhadap kesihatan sangat menginspirasi.`,
        zh: `🎉 您的配偶刚刚达到了${milestone.name}！他们对健康的投入令人鼓舞。`,
        ta: `🎉 உங்கள் துணை ${milestone.name} அடைந்துள்ளார்! அவர்களின் ஆரோக்கிய அர்ப்பணிப்பு ஊக்கமளிக்கிறது.`
      },
      child: {
        en: `🌟 Your parent achieved ${milestone.name}! They're taking great care of their health.`,
        ms: `🌟 Ibu bapa anda mencapai ${milestone.name}! Mereka menjaga kesihatan dengan baik.`,
        zh: `🌟 您的父母达到了${milestone.name}！他们很好地照顾着自己的健康。`,
        ta: `🌟 உங்கள் பெற்றோர் ${milestone.name} அடைந்துள்ளார்! அவர்கள் தங்கள் ஆரோக்கியத்தை நன்றாகப் பராமரிக்கிறார்கள்.`
      },
      parent: {
        en: `💙 Your child achieved ${milestone.name}! You can be proud of their health commitment.`,
        ms: `💙 Anak anda mencapai ${milestone.name}! Anda boleh berbangga dengan komitmen kesihatan mereka.`,
        zh: `💙 您的孩子达到了${milestone.name}！您可以为他们对健康的承诺感到自豪。`,
        ta: `💙 உங்கள் குழந்தை ${milestone.name} அடைந்துள்ளது! அவர்களின் ஆரோக்கிய உறுதிப்பாட்டிற்காக நீங்கள் பெருமைப்படலாம்.`
      },
      sibling: {
        en: `🎊 Your sibling achieved ${milestone.name}! Family health goals are being met!`,
        ms: `🎊 Adik beradik anda mencapai ${milestone.name}! Matlamat kesihatan keluarga sedang dicapai!`,
        zh: `🎊 您的兄弟姐妹达到了${milestone.name}！家庭健康目标正在实现！`,
        ta: `🎊 உங்கள் உடன்பிறந்தவர் ${milestone.name} அடைந்துள்ளார்! குடும்ப ஆரோக்கிய இலக்குகள் நிறைவேற்றப்படுகின்றன!`
      }
    };

    const messages = relationshipMessages[relationship as keyof typeof relationshipMessages] ||
                    relationshipMessages.sibling;

    // Default to English if preferred language not available
    return messages.en; // In real implementation, would use user's preferred language
  }

  /**
   * Generate shareable card for milestone
   */
  private async generateShareableCard(milestone: AdherenceMilestone): Promise<string> {
    // This would generate a visual card image/data
    // For now, return a placeholder identifier
    return `shareable_card_${milestone.id}`;
  }

  /**
   * Process queued family notifications
   */
  private async processFamilyNotifications(): Promise<void> {
    while (this.familyNotificationQueue.length > 0) {
      const notification = this.familyNotificationQueue.shift()!;

      try {
        await this.sendFamilyNotification(notification);
      } catch (error) {
        console.error('Failed to send family notification:', error);
        // Could implement retry logic here
      }
    }
  }

  /**
   * Send family notification
   */
  private async sendFamilyNotification(notification: FamilyNotification): Promise<void> {
    // Implementation would integrate with notification service
    console.log('Sending family notification:', notification);

    // In real implementation, this would:
    // 1. Send push notification to family member
    // 2. Update family dashboard
    // 3. Create shareable content
    // 4. Log the notification for tracking
  }

  // Helper methods for cultural and contextual awareness

  private getCelebrationDuration(milestoneType: string): number {
    const baseDuration = this.config.celebrationDuration;

    switch (this.config.animationIntensity) {
      case 'subtle':
        return baseDuration * 0.6;
      case 'enthusiastic':
        return baseDuration * 1.4;
      default:
        return baseDuration;
    }
  }

  private getCulturalPatternAnimation(themeName: string): string {
    const animations = {
      'Batik Harmony': 'flowingWaves',
      'Hibiscus Bloom': 'blooming',
      'Wau Soaring': 'kiteFlying',
      'Songket Gold': 'goldenShimmer',
      'Peranakan Heritage': 'tilesRipple',
      'Raya Celebration': 'crescentGlow',
      'CNY Prosperity': 'dragonDance',
      'Deepavali Light': 'lampFlicker'
    };

    return animations[themeName as keyof typeof animations] || 'gentlePulse';
  }

  private getFestivalAnimations(festival: FestivalEvent, duration: number): AnimationStep[] {
    const animations: AnimationStep[] = [];

    switch (festival.type) {
      case 'islamic':
        animations.push({
          element: 'crescent-moon',
          animation: 'crescentGlow',
          duration: duration,
          delay: 100,
          properties: { opacity: 0.8, color: '#228B22' }
        });
        break;
      case 'chinese':
        animations.push({
          element: 'dragon-pattern',
          animation: 'dragonDance',
          duration: duration,
          delay: 150,
          properties: { opacity: 0.6, color: '#FF0000' }
        });
        break;
      case 'hindu':
        animations.push({
          element: 'oil-lamps',
          animation: 'lampFlicker',
          duration: duration,
          delay: 200,
          properties: { opacity: 0.7, color: '#FF4500' }
        });
        break;
    }

    return animations;
  }

  private getParticleCount(): number {
    switch (this.config.animationIntensity) {
      case 'subtle':
        return 15;
      case 'enthusiastic':
        return 50;
      default:
        return 30;
    }
  }

  private getCelebrationSound(milestoneType: string, themeName: string): string {
    // Map milestone types and themes to appropriate sounds
    if (themeName.includes('Raya')) {
      return 'raya_celebration';
    }
    if (themeName.includes('CNY')) {
      return 'chinese_gong';
    }
    if (themeName.includes('Deepavali')) {
      return 'tabla_celebration';
    }

    switch (milestoneType) {
      case 'streak_days':
        return 'streak_achievement';
      case 'adherence_rate':
        return 'adherence_chime';
      case 'perfect_week':
      case 'perfect_month':
        return 'perfect_fanfare';
      default:
        return 'general_celebration';
    }
  }

  private getHapticIntensity(milestoneType: string): number {
    switch (milestoneType) {
      case 'perfect_week':
      case 'perfect_month':
        return 0.8;
      case 'streak_days':
        return 0.6;
      default:
        return 0.4;
    }
  }

  private isQuietHours(): boolean {
    const hour = new Date().getHours();
    return hour < 7 || hour > 22; // 10 PM to 7 AM
  }

  private async isCurrentlyPrayerTime(): Promise<boolean> {
    // This would integrate with prayer time service
    // For now, return false
    return false;
  }

  private async isDoNotDisturbMode(): Promise<boolean> {
    // This would check system/app DND settings
    return false;
  }

  private shouldNotifyFamily(milestone: AdherenceMilestone): boolean {
    if (!this.config.enableFamilySharing) return false;

    // Define which milestones are worth family notification
    const familyWorthyTypes = ['streak_days', 'perfect_week', 'perfect_month', 'improvement'];
    const familyWorthyThresholds = {
      streak_days: 7,
      adherence_rate: 85,
      perfect_week: 1,
      perfect_month: 1,
      improvement: 1
    };

    return familyWorthyTypes.includes(milestone.type) &&
           milestone.threshold >= (familyWorthyThresholds[milestone.type as keyof typeof familyWorthyThresholds] || 999);
  }

  private async getFamilyMembers(patientId: string): Promise<Array<{id: string, relationship: string}>> {
    // This would integrate with family/user service
    // For now, return empty array
    return [];
  }

  private async queueCelebration(detection: MilestoneDetection, patientId: string): Promise<void> {
    // This would queue celebrations for later display
    console.log('Queuing celebration for later:', detection.milestone.name);
  }

  /**
   * Complete a celebration sequence
   */
  async completeCelebration(
    celebrationId: string,
    userEngagement: 'dismissed' | 'watched' | 'shared' | 'saved'
  ): Promise<CelebrationResult> {
    const sequence = this.activeSequences.get(celebrationId);

    if (!sequence) {
      throw new Error(`Celebration sequence ${celebrationId} not found`);
    }

    const result: CelebrationResult = {
      celebrationId,
      milestone: sequence.milestone,
      wasShown: true,
      userEngagement,
      duration: sequence.totalDuration,
      culturalAppropriate: true
    };

    // Track celebration history
    const patientHistory = this.celebrationHistory.get(sequence.milestone.id) || [];
    patientHistory.push(result);
    this.celebrationHistory.set(sequence.milestone.id, patientHistory);

    // Clean up active sequence
    this.activeSequences.delete(celebrationId);

    // Mark milestone as celebration shown
    sequence.milestone.celebrationShown = true;

    return result;
  }

  /**
   * Get celebration analytics
   */
  getCelebrationAnalytics(patientId: string): {
    totalCelebrations: number;
    engagementRate: number;
    sharingRate: number;
    culturalAppropriatenessScore: number;
  } {
    const allResults = Array.from(this.celebrationHistory.values()).flat();

    if (allResults.length === 0) {
      return {
        totalCelebrations: 0,
        engagementRate: 0,
        sharingRate: 0,
        culturalAppropriatenessScore: 0
      };
    }

    const watchedOrShared = allResults.filter(r =>
      r.userEngagement === 'watched' || r.userEngagement === 'shared' || r.userEngagement === 'saved'
    ).length;

    const sharedCount = allResults.filter(r => r.userEngagement === 'shared').length;

    const culturallyAppropriate = allResults.filter(r => r.culturalAppropriate).length;

    return {
      totalCelebrations: allResults.length,
      engagementRate: (watchedOrShared / allResults.length) * 100,
      sharingRate: (sharedCount / allResults.length) * 100,
      culturalAppropriatenessScore: (culturallyAppropriate / allResults.length) * 100
    };
  }

  /**
   * Update celebration configuration
   */
  updateConfig(newConfig: Partial<CelebrationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current configuration
   */
  getConfig(): CelebrationConfig {
    return { ...this.config };
  }

  /**
   * Clear celebration history (for testing)
   */
  clearHistory(): void {
    this.celebrationHistory.clear();
    this.activeSequences.clear();
    this.familyNotificationQueue.length = 0;
  }
}