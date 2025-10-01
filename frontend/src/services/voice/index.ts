/**
 * Voice Services Index
 * 
 * Central export point for voice-related services in Issue #24 Stream B.
 */

export { default as VoiceReminderService } from './VoiceReminderService';

export type {
  VoiceConfig,
  VoiceMessage,
  VoiceDeliveryResult,
  VoiceAnalytics
} from './VoiceReminderService';