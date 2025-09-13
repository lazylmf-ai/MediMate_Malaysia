/**
 * SMS Services Index
 * 
 * Central export point for SMS-related services in Issue #24 Stream B.
 */

export { default as SMSService } from './SMSService';

export type {
  SMSConfig,
  SMSMessage,
  SMSDeliveryResult,
  SMSQueueItem,
  SMSAnalytics
} from './SMSService';