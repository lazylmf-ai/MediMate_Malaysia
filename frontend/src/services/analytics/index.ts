/**
 * Analytics Services Export
 *
 * Centralized export for Issue #24 Stream C analytics and monitoring services
 */

export { default as PerformanceAnalytics } from './PerformanceAnalytics';
export type {
  PerformanceMetrics,
  SystemHealth,
  PerformanceReport,
  AlertConfig
} from './PerformanceAnalytics';