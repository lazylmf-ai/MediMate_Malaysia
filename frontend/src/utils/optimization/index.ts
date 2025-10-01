/**
 * Optimization Utilities Export
 *
 * Centralized export for Issue #24 Stream C & Issue #27 Stream D optimization utilities
 */

export { default as BatteryOptimizer } from './BatteryOptimizer';
export type {
  BatteryState,
  BatteryOptimization,
  BatteryUsageStats,
  OptimizationConfig
} from './BatteryOptimizer';

export { default as BatteryOptimizationEngine } from './BatteryOptimizationEngine';
export { default as DozeCompatibility } from './DozeCompatibility';
export type {
  BatteryUsagePattern,
  EnergyPredictionModel,
  OptimizationStrategy,
  SchedulingDecision,
  BatteryOptimizationConfig,
  BatteryOptimizationResult,
} from './BatteryOptimizationEngine';
export type {
  DozeStatus,
  MaintenanceWindow,
  MaintenanceTask,
  DozeConstraint,
  AlarmSchedule,
  DozeConfig,
} from './DozeCompatibility';