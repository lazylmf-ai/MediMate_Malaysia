/**
 * Conflict Resolver Service
 *
 * Implements intelligent conflict resolution strategies for data synchronization.
 * Part of Issue #27 Stream B - Intelligent Synchronization & Conflict Resolution
 *
 * Features:
 * - Last-write-wins strategy with timestamp comparison
 * - Three-way merge for complex data structures
 * - User preference preservation
 * - Medication safety priority
 * - Audit trail for all resolutions
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ConflictData {
  entityId: string;
  entityType: 'medication' | 'schedule' | 'adherence' | 'preference' | 'family_member';
  localVersion: any;
  serverVersion: any;
  baseVersion?: any; // For three-way merge
  localTimestamp: Date;
  serverTimestamp: Date;
  conflictType: 'update_update' | 'update_delete' | 'delete_update' | 'structure_change';
}

export interface ConflictResolution {
  conflictId: string;
  strategy: ResolutionStrategy;
  resolvedData: any;
  confidence: number; // 0-1, how confident we are in the resolution
  requiresUserReview: boolean;
  reasoning: string;
  appliedAt: Date;
}

export type ResolutionStrategy =
  | 'last_write_wins'
  | 'three_way_merge'
  | 'local_preference'
  | 'server_preference'
  | 'medication_safety_priority'
  | 'user_choice_required';

export interface ConflictResolverConfig {
  defaultStrategy: ResolutionStrategy;
  userReviewThreshold: number; // Confidence below this requires user review
  medicationSafetyPriority: boolean;
  preserveLocalPreferences: boolean;
  auditTrailEnabled: boolean;
}

export interface ConflictAuditEntry {
  conflictId: string;
  entityId: string;
  entityType: string;
  strategy: ResolutionStrategy;
  localData: any;
  serverData: any;
  resolvedData: any;
  confidence: number;
  timestamp: Date;
  userId?: string;
}

class ConflictResolver {
  private static instance: ConflictResolver;
  private config: ConflictResolverConfig;
  private auditTrail: ConflictAuditEntry[] = [];
  private pendingConflicts: Map<string, ConflictData> = new Map();

  private readonly STORAGE_KEYS = {
    AUDIT_TRAIL: 'conflict_audit_trail',
    PENDING_CONFLICTS: 'pending_conflicts',
    CONFIG: 'conflict_resolver_config'
  };

  private constructor() {
    this.config = this.getDefaultConfig();
  }

  static getInstance(): ConflictResolver {
    if (!ConflictResolver.instance) {
      ConflictResolver.instance = new ConflictResolver();
    }
    return ConflictResolver.instance;
  }

  /**
   * Initialize the conflict resolver
   */
  async initialize(config?: Partial<ConflictResolverConfig>): Promise<void> {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    await this.loadAuditTrail();
    await this.loadPendingConflicts();

    console.log('ConflictResolver initialized');
  }

  /**
   * Resolve a conflict using appropriate strategy
   */
  async resolveConflict(conflict: ConflictData): Promise<ConflictResolution> {
    const conflictId = `conflict_${conflict.entityId}_${Date.now()}`;

    // Select resolution strategy
    const strategy = this.selectStrategy(conflict);

    let resolution: ConflictResolution;

    try {
      switch (strategy) {
        case 'last_write_wins':
          resolution = await this.applyLastWriteWins(conflictId, conflict);
          break;

        case 'three_way_merge':
          resolution = await this.applyThreeWayMerge(conflictId, conflict);
          break;

        case 'medication_safety_priority':
          resolution = await this.applyMedicationSafetyPriority(conflictId, conflict);
          break;

        case 'local_preference':
          resolution = await this.applyLocalPreference(conflictId, conflict);
          break;

        case 'server_preference':
          resolution = await this.applyServerPreference(conflictId, conflict);
          break;

        default:
          resolution = {
            conflictId,
            strategy: 'user_choice_required',
            resolvedData: null,
            confidence: 0,
            requiresUserReview: true,
            reasoning: 'No automatic resolution strategy available',
            appliedAt: new Date()
          };
      }

      // Add to audit trail if enabled
      if (this.config.auditTrailEnabled) {
        await this.addToAuditTrail({
          conflictId,
          entityId: conflict.entityId,
          entityType: conflict.entityType,
          strategy: resolution.strategy,
          localData: conflict.localVersion,
          serverData: conflict.serverVersion,
          resolvedData: resolution.resolvedData,
          confidence: resolution.confidence,
          timestamp: new Date()
        });
      }

      // Store if requires user review
      if (resolution.requiresUserReview) {
        this.pendingConflicts.set(conflictId, conflict);
        await this.savePendingConflicts();
      }

      return resolution;

    } catch (error) {
      console.error('Conflict resolution failed:', error);
      return {
        conflictId,
        strategy: 'user_choice_required',
        resolvedData: null,
        confidence: 0,
        requiresUserReview: true,
        reasoning: `Resolution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        appliedAt: new Date()
      };
    }
  }

  /**
   * Batch resolve multiple conflicts
   */
  async resolveConflicts(conflicts: ConflictData[]): Promise<ConflictResolution[]> {
    const resolutions: ConflictResolution[] = [];

    for (const conflict of conflicts) {
      const resolution = await this.resolveConflict(conflict);
      resolutions.push(resolution);
    }

    return resolutions;
  }

  /**
   * Get pending conflicts requiring user review
   */
  getPendingConflicts(): ConflictData[] {
    return Array.from(this.pendingConflicts.values());
  }

  /**
   * Resolve pending conflict with user choice
   */
  async resolveWithUserChoice(
    conflictId: string,
    chosenData: any,
    reasoning: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const conflict = this.pendingConflicts.get(conflictId);
      if (!conflict) {
        throw new Error(`Conflict not found: ${conflictId}`);
      }

      // Add to audit trail
      if (this.config.auditTrailEnabled) {
        await this.addToAuditTrail({
          conflictId,
          entityId: conflict.entityId,
          entityType: conflict.entityType,
          strategy: 'user_choice_required',
          localData: conflict.localVersion,
          serverData: conflict.serverVersion,
          resolvedData: chosenData,
          confidence: 1.0, // User choice is always confident
          timestamp: new Date()
        });
      }

      // Remove from pending
      this.pendingConflicts.delete(conflictId);
      await this.savePendingConflicts();

      return { success: true };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Resolution failed'
      };
    }
  }

  /**
   * Get conflict resolution audit trail
   */
  getAuditTrail(limit: number = 50): ConflictAuditEntry[] {
    return this.auditTrail
      .slice(-limit)
      .map(entry => ({ ...entry }));
  }

  /**
   * Private resolution strategies
   */

  private async applyLastWriteWins(
    conflictId: string,
    conflict: ConflictData
  ): Promise<ConflictResolution> {
    const localTime = conflict.localTimestamp.getTime();
    const serverTime = conflict.serverTimestamp.getTime();

    const timeDifference = Math.abs(localTime - serverTime);

    // If timestamps are very close (within 5 seconds), require user review
    if (timeDifference < 5000) {
      return {
        conflictId,
        strategy: 'last_write_wins',
        resolvedData: null,
        confidence: 0.3,
        requiresUserReview: true,
        reasoning: 'Timestamps too close to confidently determine last write',
        appliedAt: new Date()
      };
    }

    const useLocal = localTime > serverTime;
    const confidence = Math.min(0.95, 0.5 + (timeDifference / 60000)); // Higher confidence with larger time difference

    return {
      conflictId,
      strategy: 'last_write_wins',
      resolvedData: useLocal ? conflict.localVersion : conflict.serverVersion,
      confidence,
      requiresUserReview: confidence < this.config.userReviewThreshold,
      reasoning: `${useLocal ? 'Local' : 'Server'} version is newer (${timeDifference}ms difference)`,
      appliedAt: new Date()
    };
  }

  private async applyThreeWayMerge(
    conflictId: string,
    conflict: ConflictData
  ): Promise<ConflictResolution> {
    if (!conflict.baseVersion) {
      // Fallback to last-write-wins if no base version
      return this.applyLastWriteWins(conflictId, conflict);
    }

    try {
      const merged = this.performThreeWayMerge(
        conflict.baseVersion,
        conflict.localVersion,
        conflict.serverVersion
      );

      // Calculate confidence based on merge complexity
      const hasConflicts = merged.conflicts && merged.conflicts.length > 0;
      const confidence = hasConflicts ? 0.5 : 0.9;

      return {
        conflictId,
        strategy: 'three_way_merge',
        resolvedData: merged.result,
        confidence,
        requiresUserReview: confidence < this.config.userReviewThreshold || hasConflicts,
        reasoning: hasConflicts
          ? `Merged with ${merged.conflicts.length} unresolved conflicts`
          : 'Successfully merged all changes',
        appliedAt: new Date()
      };

    } catch (error) {
      console.error('Three-way merge failed:', error);
      return this.applyLastWriteWins(conflictId, conflict);
    }
  }

  private performThreeWayMerge(
    base: any,
    local: any,
    server: any
  ): { result: any; conflicts: string[] } {
    const result: any = {};
    const conflicts: string[] = [];

    // Get all keys from all versions
    const allKeys = new Set([
      ...Object.keys(base || {}),
      ...Object.keys(local || {}),
      ...Object.keys(server || {})
    ]);

    for (const key of allKeys) {
      const baseValue = base?.[key];
      const localValue = local?.[key];
      const serverValue = server?.[key];

      // If both changed from base and are different
      if (localValue !== baseValue && serverValue !== baseValue && localValue !== serverValue) {
        // Handle specific types intelligently
        if (Array.isArray(localValue) && Array.isArray(serverValue)) {
          // Merge arrays by combining unique items
          result[key] = [...new Set([...localValue, ...serverValue])];
        } else if (typeof localValue === 'object' && typeof serverValue === 'object') {
          // Recursively merge objects
          const subMerge = this.performThreeWayMerge(baseValue, localValue, serverValue);
          result[key] = subMerge.result;
          conflicts.push(...subMerge.conflicts.map(c => `${key}.${c}`));
        } else {
          // Conflict - prefer local by default
          result[key] = localValue;
          conflicts.push(key);
        }
      } else if (localValue !== baseValue) {
        // Only local changed
        result[key] = localValue;
      } else if (serverValue !== baseValue) {
        // Only server changed
        result[key] = serverValue;
      } else {
        // No change or both changed to same value
        result[key] = baseValue;
      }
    }

    return { result, conflicts };
  }

  private async applyMedicationSafetyPriority(
    conflictId: string,
    conflict: ConflictData
  ): Promise<ConflictResolution> {
    // For medication-related data, prioritize safety
    const localData = conflict.localVersion;
    const serverData = conflict.serverVersion;

    // Check for critical medication fields
    const criticalFields = ['dosage', 'frequency', 'timing', 'warnings', 'interactions'];
    let safetyIssueDetected = false;

    for (const field of criticalFields) {
      if (localData[field] !== serverData[field]) {
        safetyIssueDetected = true;
        break;
      }
    }

    if (safetyIssueDetected) {
      // Require user/medical professional review for safety-critical changes
      return {
        conflictId,
        strategy: 'medication_safety_priority',
        resolvedData: null,
        confidence: 0,
        requiresUserReview: true,
        reasoning: 'Safety-critical medication fields differ - requires medical review',
        appliedAt: new Date()
      };
    }

    // For non-critical changes, use three-way merge
    return this.applyThreeWayMerge(conflictId, conflict);
  }

  private async applyLocalPreference(
    conflictId: string,
    conflict: ConflictData
  ): Promise<ConflictResolution> {
    return {
      conflictId,
      strategy: 'local_preference',
      resolvedData: conflict.localVersion,
      confidence: 0.8,
      requiresUserReview: false,
      reasoning: 'Local version preferred by configuration',
      appliedAt: new Date()
    };
  }

  private async applyServerPreference(
    conflictId: string,
    conflict: ConflictData
  ): Promise<ConflictResolution> {
    return {
      conflictId,
      strategy: 'server_preference',
      resolvedData: conflict.serverVersion,
      confidence: 0.8,
      requiresUserReview: false,
      reasoning: 'Server version preferred by configuration',
      appliedAt: new Date()
    };
  }

  /**
   * Strategy selection logic
   */

  private selectStrategy(conflict: ConflictData): ResolutionStrategy {
    // Medication safety always takes priority
    if (this.config.medicationSafetyPriority && conflict.entityType === 'medication') {
      return 'medication_safety_priority';
    }

    // Use three-way merge if base version available
    if (conflict.baseVersion) {
      return 'three_way_merge';
    }

    // For preferences, use local preference if configured
    if (this.config.preserveLocalPreferences && conflict.entityType === 'preference') {
      return 'local_preference';
    }

    // Handle delete conflicts
    if (conflict.conflictType === 'update_delete' || conflict.conflictType === 'delete_update') {
      // Require user review for delete conflicts
      return 'user_choice_required';
    }

    // Default to last-write-wins
    return this.config.defaultStrategy;
  }

  /**
   * Storage and audit methods
   */

  private async addToAuditTrail(entry: ConflictAuditEntry): Promise<void> {
    this.auditTrail.push(entry);

    // Keep only last 500 entries
    if (this.auditTrail.length > 500) {
      this.auditTrail = this.auditTrail.slice(-500);
    }

    await this.saveAuditTrail();
  }

  private async loadAuditTrail(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEYS.AUDIT_TRAIL);
      if (stored) {
        const entries = JSON.parse(stored);
        this.auditTrail = entries.map((entry: any) => ({
          ...entry,
          timestamp: new Date(entry.timestamp)
        }));
      }
    } catch (error) {
      console.error('Failed to load audit trail:', error);
    }
  }

  private async saveAuditTrail(): Promise<void> {
    try {
      await AsyncStorage.setItem(
        this.STORAGE_KEYS.AUDIT_TRAIL,
        JSON.stringify(this.auditTrail)
      );
    } catch (error) {
      console.error('Failed to save audit trail:', error);
    }
  }

  private async loadPendingConflicts(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEYS.PENDING_CONFLICTS);
      if (stored) {
        const conflicts = JSON.parse(stored);
        this.pendingConflicts = new Map(
          conflicts.map((c: any) => [
            c.id,
            {
              ...c,
              localTimestamp: new Date(c.localTimestamp),
              serverTimestamp: new Date(c.serverTimestamp)
            }
          ])
        );
      }
    } catch (error) {
      console.error('Failed to load pending conflicts:', error);
    }
  }

  private async savePendingConflicts(): Promise<void> {
    try {
      const conflicts = Array.from(this.pendingConflicts.entries()).map(([id, conflict]) => ({
        id,
        ...conflict
      }));
      await AsyncStorage.setItem(
        this.STORAGE_KEYS.PENDING_CONFLICTS,
        JSON.stringify(conflicts)
      );
    } catch (error) {
      console.error('Failed to save pending conflicts:', error);
    }
  }

  private getDefaultConfig(): ConflictResolverConfig {
    return {
      defaultStrategy: 'last_write_wins',
      userReviewThreshold: 0.7,
      medicationSafetyPriority: true,
      preserveLocalPreferences: true,
      auditTrailEnabled: true
    };
  }

  /**
   * Cleanup
   */
  async cleanup(): Promise<void> {
    await this.saveAuditTrail();
    await this.savePendingConflicts();
  }
}

export default ConflictResolver;