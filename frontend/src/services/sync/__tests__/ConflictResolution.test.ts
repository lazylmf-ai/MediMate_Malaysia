/**
 * Conflict Resolution Tests
 *
 * Comprehensive tests for ConflictResolver
 * Part of Issue #27 Stream B
 */

import ConflictResolver, { ConflictData } from '../../conflict/ConflictResolver';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage');

describe('ConflictResolver', () => {
  let conflictResolver: ConflictResolver;

  beforeEach(async () => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

    conflictResolver = ConflictResolver.getInstance();
    await conflictResolver.initialize();
  });

  describe('Last-Write-Wins Strategy', () => {
    it('should resolve conflict with newer local version', async () => {
      const conflict: ConflictData = {
        entityId: 'med_123',
        entityType: 'medication',
        localVersion: { id: 'med_123', dosage: '100mg', name: 'Medicine A' },
        serverVersion: { id: 'med_123', dosage: '50mg', name: 'Medicine A' },
        localTimestamp: new Date('2025-09-30T12:00:00Z'),
        serverTimestamp: new Date('2025-09-30T11:00:00Z'),
        conflictType: 'update_update'
      };

      const resolution = await conflictResolver.resolveConflict(conflict);

      expect(resolution.strategy).toBe('last_write_wins');
      expect(resolution.resolvedData).toEqual(conflict.localVersion);
      expect(resolution.confidence).toBeGreaterThan(0.5);
      expect(resolution.reasoning).toContain('Local');
    });

    it('should resolve conflict with newer server version', async () => {
      const conflict: ConflictData = {
        entityId: 'med_123',
        entityType: 'medication',
        localVersion: { id: 'med_123', dosage: '100mg' },
        serverVersion: { id: 'med_123', dosage: '50mg' },
        localTimestamp: new Date('2025-09-30T11:00:00Z'),
        serverTimestamp: new Date('2025-09-30T12:00:00Z'),
        conflictType: 'update_update'
      };

      const resolution = await conflictResolver.resolveConflict(conflict);

      expect(resolution.strategy).toBe('last_write_wins');
      expect(resolution.resolvedData).toEqual(conflict.serverVersion);
      expect(resolution.reasoning).toContain('Server');
    });

    it('should require user review for very close timestamps', async () => {
      const baseTime = Date.now();
      const conflict: ConflictData = {
        entityId: 'med_123',
        entityType: 'medication',
        localVersion: { id: 'med_123', dosage: '100mg' },
        serverVersion: { id: 'med_123', dosage: '50mg' },
        localTimestamp: new Date(baseTime),
        serverTimestamp: new Date(baseTime + 2000), // 2 seconds difference
        conflictType: 'update_update'
      };

      const resolution = await conflictResolver.resolveConflict(conflict);

      expect(resolution.requiresUserReview).toBe(true);
      expect(resolution.confidence).toBeLessThan(0.5);
      expect(resolution.reasoning).toContain('too close');
    });
  });

  describe('Three-Way Merge Strategy', () => {
    it('should merge non-conflicting changes', async () => {
      await conflictResolver.initialize({
        defaultStrategy: 'three_way_merge'
      });

      const conflict: ConflictData = {
        entityId: 'med_123',
        entityType: 'medication',
        baseVersion: { id: 'med_123', dosage: '50mg', frequency: 'daily', notes: 'original' },
        localVersion: { id: 'med_123', dosage: '100mg', frequency: 'daily', notes: 'original' },
        serverVersion: { id: 'med_123', dosage: '50mg', frequency: 'twice daily', notes: 'original' },
        localTimestamp: new Date(),
        serverTimestamp: new Date(),
        conflictType: 'update_update'
      };

      const resolution = await conflictResolver.resolveConflict(conflict);

      expect(resolution.strategy).toBe('three_way_merge');
      expect(resolution.resolvedData.dosage).toBe('100mg'); // From local
      expect(resolution.resolvedData.frequency).toBe('twice daily'); // From server
      expect(resolution.confidence).toBeGreaterThan(0.7);
    });

    it('should detect conflicting changes', async () => {
      await conflictResolver.initialize({
        defaultStrategy: 'three_way_merge'
      });

      const conflict: ConflictData = {
        entityId: 'med_123',
        entityType: 'medication',
        baseVersion: { id: 'med_123', dosage: '50mg' },
        localVersion: { id: 'med_123', dosage: '100mg' },
        serverVersion: { id: 'med_123', dosage: '75mg' },
        localTimestamp: new Date(),
        serverTimestamp: new Date(),
        conflictType: 'update_update'
      };

      const resolution = await conflictResolver.resolveConflict(conflict);

      expect(resolution.strategy).toBe('three_way_merge');
      expect(resolution.requiresUserReview).toBe(true);
      expect(resolution.reasoning).toContain('unresolved conflicts');
    });

    it('should handle missing base version by falling back to last-write-wins', async () => {
      await conflictResolver.initialize({
        defaultStrategy: 'three_way_merge'
      });

      const conflict: ConflictData = {
        entityId: 'med_123',
        entityType: 'medication',
        localVersion: { id: 'med_123', dosage: '100mg' },
        serverVersion: { id: 'med_123', dosage: '50mg' },
        localTimestamp: new Date('2025-09-30T12:00:00Z'),
        serverTimestamp: new Date('2025-09-30T11:00:00Z'),
        conflictType: 'update_update'
      };

      const resolution = await conflictResolver.resolveConflict(conflict);

      expect(resolution.strategy).toBe('last_write_wins');
      expect(resolution.resolvedData).toEqual(conflict.localVersion);
    });
  });

  describe('Medication Safety Priority', () => {
    it('should require user review for safety-critical fields', async () => {
      await conflictResolver.initialize({
        medicationSafetyPriority: true
      });

      const conflict: ConflictData = {
        entityId: 'med_123',
        entityType: 'medication',
        localVersion: {
          id: 'med_123',
          dosage: '100mg',
          warnings: ['Do not take with alcohol']
        },
        serverVersion: {
          id: 'med_123',
          dosage: '50mg',
          warnings: ['Do not take with dairy']
        },
        localTimestamp: new Date(),
        serverTimestamp: new Date(),
        conflictType: 'update_update'
      };

      const resolution = await conflictResolver.resolveConflict(conflict);

      expect(resolution.strategy).toBe('medication_safety_priority');
      expect(resolution.requiresUserReview).toBe(true);
      expect(resolution.confidence).toBe(0);
      expect(resolution.reasoning).toContain('safety-critical');
    });

    it('should allow non-safety field changes without review', async () => {
      await conflictResolver.initialize({
        medicationSafetyPriority: true
      });

      const conflict: ConflictData = {
        entityId: 'med_123',
        entityType: 'medication',
        baseVersion: { id: 'med_123', notes: 'original', color: 'blue' },
        localVersion: { id: 'med_123', notes: 'updated locally', color: 'blue' },
        serverVersion: { id: 'med_123', notes: 'original', color: 'red' },
        localTimestamp: new Date(),
        serverTimestamp: new Date(),
        conflictType: 'update_update'
      };

      const resolution = await conflictResolver.resolveConflict(conflict);

      // Should use three-way merge for non-safety fields
      expect(resolution.strategy).toBe('three_way_merge');
      expect(resolution.resolvedData.notes).toBe('updated locally');
      expect(resolution.resolvedData.color).toBe('red');
    });
  });

  describe('User Choice Resolution', () => {
    it('should allow user to resolve pending conflict', async () => {
      const conflict: ConflictData = {
        entityId: 'med_123',
        entityType: 'medication',
        localVersion: { id: 'med_123', dosage: '100mg' },
        serverVersion: { id: 'med_123', dosage: '50mg' },
        localTimestamp: new Date(),
        serverTimestamp: new Date(),
        conflictType: 'update_update'
      };

      // Create a conflict that requires user review
      const resolution = await conflictResolver.resolveConflict({
        ...conflict,
        localTimestamp: new Date(Date.now()),
        serverTimestamp: new Date(Date.now() + 1000) // Very close timestamps
      });

      expect(resolution.requiresUserReview).toBe(true);

      // User chooses a resolution
      const userChoice = { id: 'med_123', dosage: '75mg' }; // Compromise
      const result = await conflictResolver.resolveWithUserChoice(
        resolution.conflictId,
        userChoice,
        'Chose compromise dosage after consulting doctor'
      );

      expect(result.success).toBe(true);

      // Should no longer be in pending conflicts
      const pendingConflicts = conflictResolver.getPendingConflicts();
      expect(pendingConflicts.find(c => c.entityId === 'med_123')).toBeUndefined();
    });

    it('should handle non-existent conflict ID', async () => {
      const result = await conflictResolver.resolveWithUserChoice(
        'non_existent_conflict',
        { some: 'data' },
        'Test'
      );

      expect(result.success).toBe(false);
      expect(result.error).toContain('not found');
    });
  });

  describe('Audit Trail', () => {
    it('should create audit trail entries for resolved conflicts', async () => {
      await conflictResolver.initialize({
        auditTrailEnabled: true
      });

      const conflict: ConflictData = {
        entityId: 'med_123',
        entityType: 'medication',
        localVersion: { id: 'med_123', dosage: '100mg' },
        serverVersion: { id: 'med_123', dosage: '50mg' },
        localTimestamp: new Date('2025-09-30T12:00:00Z'),
        serverTimestamp: new Date('2025-09-30T11:00:00Z'),
        conflictType: 'update_update'
      };

      await conflictResolver.resolveConflict(conflict);

      const auditTrail = conflictResolver.getAuditTrail(10);

      expect(auditTrail.length).toBeGreaterThan(0);
      const entry = auditTrail[auditTrail.length - 1];
      expect(entry.entityId).toBe('med_123');
      expect(entry.strategy).toBe('last_write_wins');
      expect(entry.localData).toEqual(conflict.localVersion);
      expect(entry.serverData).toEqual(conflict.serverVersion);
    });

    it('should not create audit trail when disabled', async () => {
      await conflictResolver.initialize({
        auditTrailEnabled: false
      });

      const conflict: ConflictData = {
        entityId: 'med_123',
        entityType: 'medication',
        localVersion: { id: 'med_123', dosage: '100mg' },
        serverVersion: { id: 'med_123', dosage: '50mg' },
        localTimestamp: new Date('2025-09-30T12:00:00Z'),
        serverTimestamp: new Date('2025-09-30T11:00:00Z'),
        conflictType: 'update_update'
      };

      await conflictResolver.resolveConflict(conflict);

      const auditTrail = conflictResolver.getAuditTrail();
      expect(auditTrail.length).toBe(0);
    });
  });

  describe('Batch Conflict Resolution', () => {
    it('should resolve multiple conflicts', async () => {
      const conflicts: ConflictData[] = [
        {
          entityId: 'med_1',
          entityType: 'medication',
          localVersion: { id: 'med_1', dosage: '100mg' },
          serverVersion: { id: 'med_1', dosage: '50mg' },
          localTimestamp: new Date('2025-09-30T12:00:00Z'),
          serverTimestamp: new Date('2025-09-30T11:00:00Z'),
          conflictType: 'update_update'
        },
        {
          entityId: 'med_2',
          entityType: 'medication',
          localVersion: { id: 'med_2', frequency: 'daily' },
          serverVersion: { id: 'med_2', frequency: 'twice daily' },
          localTimestamp: new Date('2025-09-30T11:30:00Z'),
          serverTimestamp: new Date('2025-09-30T12:00:00Z'),
          conflictType: 'update_update'
        }
      ];

      const resolutions = await conflictResolver.resolveConflicts(conflicts);

      expect(resolutions.length).toBe(2);
      expect(resolutions[0].resolvedData).toEqual(conflicts[0].localVersion); // Local newer
      expect(resolutions[1].resolvedData).toEqual(conflicts[1].serverVersion); // Server newer
    });
  });

  describe('Persistence', () => {
    it('should persist and load audit trail', async () => {
      await conflictResolver.initialize({
        auditTrailEnabled: true
      });

      const conflict: ConflictData = {
        entityId: 'med_123',
        entityType: 'medication',
        localVersion: { id: 'med_123', dosage: '100mg' },
        serverVersion: { id: 'med_123', dosage: '50mg' },
        localTimestamp: new Date('2025-09-30T12:00:00Z'),
        serverTimestamp: new Date('2025-09-30T11:00:00Z'),
        conflictType: 'update_update'
      };

      await conflictResolver.resolveConflict(conflict);

      // Verify save was called
      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        expect.stringContaining('audit_trail'),
        expect.any(String)
      );
    });

    it('should persist pending conflicts', async () => {
      const conflict: ConflictData = {
        entityId: 'med_123',
        entityType: 'medication',
        localVersion: { id: 'med_123', dosage: '100mg' },
        serverVersion: { id: 'med_123', dosage: '50mg' },
        localTimestamp: new Date(Date.now()),
        serverTimestamp: new Date(Date.now() + 1000),
        conflictType: 'update_update'
      };

      const resolution = await conflictResolver.resolveConflict(conflict);

      if (resolution.requiresUserReview) {
        expect(AsyncStorage.setItem).toHaveBeenCalledWith(
          expect.stringContaining('pending_conflicts'),
          expect.any(String)
        );
      }
    });
  });

  describe('Confidence Levels', () => {
    it('should have high confidence for clear last-write-wins', async () => {
      const conflict: ConflictData = {
        entityId: 'med_123',
        entityType: 'medication',
        localVersion: { id: 'med_123', dosage: '100mg' },
        serverVersion: { id: 'med_123', dosage: '50mg' },
        localTimestamp: new Date('2025-09-30T12:00:00Z'),
        serverTimestamp: new Date('2025-09-30T10:00:00Z'), // 2 hours difference
        conflictType: 'update_update'
      };

      const resolution = await conflictResolver.resolveConflict(conflict);

      expect(resolution.confidence).toBeGreaterThan(0.8);
      expect(resolution.requiresUserReview).toBe(false);
    });

    it('should have low confidence for ambiguous conflicts', async () => {
      const conflict: ConflictData = {
        entityId: 'med_123',
        entityType: 'medication',
        localVersion: { id: 'med_123', dosage: '100mg' },
        serverVersion: { id: 'med_123', dosage: '50mg' },
        localTimestamp: new Date(Date.now()),
        serverTimestamp: new Date(Date.now() + 2000), // 2 seconds
        conflictType: 'update_update'
      };

      const resolution = await conflictResolver.resolveConflict(conflict);

      expect(resolution.confidence).toBeLessThan(0.5);
      expect(resolution.requiresUserReview).toBe(true);
    });
  });
});