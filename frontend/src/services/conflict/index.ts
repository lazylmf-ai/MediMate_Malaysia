/**
 * Conflict Resolution Services Export
 *
 * Centralized export for Issue #27 Stream B conflict resolution services
 */

export { default as ConflictResolver } from './ConflictResolver';
export type {
  ConflictData,
  ConflictResolution,
  ResolutionStrategy,
  ConflictResolverConfig,
  ConflictAuditEntry
} from './ConflictResolver';