/**
 * Background Processing Services Export
 *
 * Centralized export for Issue #24 Stream C background processing services
 */

export { default as BackgroundProcessorService } from './BackgroundProcessorService';
export type {
  BackgroundTask,
  BackgroundProcessingResult,
  BackgroundProcessingStats,
  ProcessingConfig
} from './BackgroundProcessorService';