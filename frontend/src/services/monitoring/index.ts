/**
 * Monitoring Services Exports
 *
 * Issue #27 Stream D - Battery & Storage Optimization
 * Issue #28 Stream D - Production Monitoring & Analytics
 */

// Task 027 - Resource Monitoring
export { default as ResourceMonitor } from './ResourceMonitor';
export type {
  CPUMetrics,
  MemoryMetrics,
  NetworkMetrics,
  BatteryMetrics,
  PerformanceMetrics,
  ResourceSnapshot,
  ResourceAlert,
  ResourceThresholds,
  MonitoringConfig,
} from './ResourceMonitor';

// Task 028 - Production Monitoring Services
export { default as ProductionMonitoringService } from './ProductionMonitoringService';
export type {
  PerformanceMetric,
  SystemHealthStatus,
  ComponentHealth,
  Alert,
} from './ProductionMonitoringService';

export { default as AnalyticsCollectionService } from './AnalyticsCollectionService';
export type {
  UserEvent,
  FeatureUsage,
  UserSession,
  EngagementMetrics,
} from './AnalyticsCollectionService';

export { default as ErrorReportingService } from './ErrorReportingService';
export type {
  ErrorReport,
  ErrorContext,
  UserContext,
  DeviceContext,
  ErrorStatistics,
} from './ErrorReportingService';

export { default as PerformanceTrackingService } from './PerformanceTrackingService';
export type {
  PerformanceTrace,
  RenderMetrics,
  NetworkMetrics as NetworkPerformanceMetrics,
  ResourceUsage,
} from './PerformanceTrackingService';

export { default as UserEngagementAnalytics } from './UserEngagementAnalytics';
export type {
  UserEngagement,
  EngagementCohort,
  UserJourney,
  JourneyStep,
} from './UserEngagementAnalytics';

export { default as HealthOutcomeTracker } from './HealthOutcomeTracker';
export type {
  HealthOutcome,
  AdherencePattern,
  MedicationEffectiveness,
  ClinicalInsight,
} from './HealthOutcomeTracker';