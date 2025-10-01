/**
 * Incremental Sync Engine Tests
 *
 * Comprehensive tests for IncrementalSyncEngine
 * Part of Issue #27 Stream B
 */

import IncrementalSyncEngine, { SyncEntity } from '../IncrementalSyncEngine';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage');

describe('IncrementalSyncEngine', () => {
  let syncEngine: IncrementalSyncEngine;

  beforeEach(async () => {
    jest.clearAllMocks();
    (AsyncStorage.getItem as jest.Mock).mockResolvedValue(null);
    (AsyncStorage.setItem as jest.Mock).mockResolvedValue(undefined);

    syncEngine = IncrementalSyncEngine.getInstance();
    await syncEngine.initialize();
  });

  describe('Entity Change Tracking', () => {
    it('should track entity changes', async () => {
      await syncEngine.trackEntityChange('med_123', 'medication', {
        id: 'med_123',
        name: 'Medicine A',
        dosage: '100mg'
      });

      const pendingChanges = syncEngine.getPendingChangesCount();
      expect(pendingChanges).toBe(1);
    });

    it('should update existing entity in pending changes', async () => {
      await syncEngine.trackEntityChange('med_123', 'medication', {
        id: 'med_123',
        dosage: '100mg'
      });

      await syncEngine.trackEntityChange('med_123', 'medication', {
        id: 'med_123',
        dosage: '200mg'
      });

      const pendingChanges = syncEngine.getPendingChangesCount();
      expect(pendingChanges).toBe(1); // Should still be 1, not 2

      const entities = syncEngine.getModifiedEntities();
      expect(entities[0].data.dosage).toBe('200mg');
    });

    it('should increment version on each change', async () => {
      await syncEngine.trackEntityChange('med_123', 'medication', {
        id: 'med_123',
        dosage: '100mg'
      });

      const entities1 = syncEngine.getModifiedEntities();
      const version1 = entities1[0].version;

      await syncEngine.trackEntityChange('med_123', 'medication', {
        id: 'med_123',
        dosage: '200mg'
      });

      const entities2 = syncEngine.getModifiedEntities();
      const version2 = entities2[0].version;

      expect(version2).toBeGreaterThan(version1);
    });

    it('should track multiple entity types', async () => {
      await syncEngine.trackEntityChange('med_123', 'medication', { id: 'med_123' });
      await syncEngine.trackEntityChange('sched_456', 'schedule', { id: 'sched_456' });
      await syncEngine.trackEntityChange('adh_789', 'adherence', { id: 'adh_789' });

      const pendingChanges = syncEngine.getPendingChangesCount();
      expect(pendingChanges).toBe(3);
    });
  });

  describe('Modified Entities Retrieval', () => {
    beforeEach(async () => {
      const baseTime = Date.now();

      await syncEngine.trackEntityChange('med_1', 'medication', { id: 'med_1' });
      await new Promise(resolve => setTimeout(resolve, 10));

      await syncEngine.trackEntityChange('med_2', 'medication', { id: 'med_2' });
      await new Promise(resolve => setTimeout(resolve, 10));

      await syncEngine.trackEntityChange('med_3', 'medication', { id: 'med_3' });
    });

    it('should get all modified entities since epoch', () => {
      const entities = syncEngine.getModifiedEntities(new Date(0));
      expect(entities.length).toBe(3);
    });

    it('should filter entities by timestamp', async () => {
      const midpoint = new Date(Date.now() - 5);
      const entities = syncEngine.getModifiedEntities(midpoint);

      // Should get only recent entities
      expect(entities.length).toBeGreaterThan(0);
      expect(entities.length).toBeLessThanOrEqual(3);
    });
  });

  describe('Incremental Sync Process', () => {
    it('should upload modified entities', async () => {
      await syncEngine.trackEntityChange('med_123', 'medication', {
        id: 'med_123',
        dosage: '100mg'
      });

      await syncEngine.trackEntityChange('med_456', 'medication', {
        id: 'med_456',
        dosage: '50mg'
      });

      const uploadedEntities: SyncEntity[] = [];
      const uploadFn = jest.fn(async (entities: SyncEntity[]) => {
        uploadedEntities.push(...entities);
        return entities;
      });

      const downloadFn = jest.fn(async () => []);

      const result = await syncEngine.performIncrementalSync(uploadFn, downloadFn);

      expect(result.uploaded.length).toBe(2);
      expect(uploadFn).toHaveBeenCalledWith(expect.arrayContaining([
        expect.objectContaining({ id: 'med_123' }),
        expect.objectContaining({ id: 'med_456' })
      ]));
    });

    it('should download server changes', async () => {
      const serverEntities: SyncEntity[] = [
        {
          id: 'med_server_1',
          type: 'medication',
          data: { id: 'med_server_1', dosage: '25mg' },
          timestamp: new Date(),
          checksum: 'server_checksum_1',
          version: 1
        },
        {
          id: 'med_server_2',
          type: 'medication',
          data: { id: 'med_server_2', dosage: '75mg' },
          timestamp: new Date(),
          checksum: 'server_checksum_2',
          version: 1
        }
      ];

      const uploadFn = jest.fn(async () => []);
      const downloadFn = jest.fn(async () => serverEntities);

      const result = await syncEngine.performIncrementalSync(uploadFn, downloadFn);

      expect(result.downloaded.length).toBe(2);
      expect(downloadFn).toHaveBeenCalled();
    });

    it('should detect conflicts when both local and server modified', async () => {
      await syncEngine.trackEntityChange('med_conflict', 'medication', {
        id: 'med_conflict',
        dosage: '100mg'
      });

      const serverEntity: SyncEntity = {
        id: 'med_conflict',
        type: 'medication',
        data: { id: 'med_conflict', dosage: '50mg' },
        timestamp: new Date(),
        checksum: 'server_checksum',
        version: 2
      };

      const uploadFn = jest.fn(async (entities: SyncEntity[]) => entities);
      const downloadFn = jest.fn(async () => [serverEntity]);

      const result = await syncEngine.performIncrementalSync(uploadFn, downloadFn);

      expect(result.conflicts.length).toBe(1);
      expect(result.conflicts[0]).toBe('med_conflict');
    });

    it('should skip unchanged entities using checksum', async () => {
      // First, establish a known checksum
      const entityData = { id: 'med_123', dosage: '100mg' };
      await syncEngine.trackEntityChange('med_123', 'medication', entityData);

      // Perform initial sync
      const uploadFn1 = jest.fn(async (entities: SyncEntity[]) => entities);
      const downloadFn1 = jest.fn(async () => []);

      await syncEngine.performIncrementalSync(uploadFn1, downloadFn1);

      // Now server returns same entity with same checksum
      const status = syncEngine.getEntitySyncStatus('med_123');
      const serverEntity: SyncEntity = {
        id: 'med_123',
        type: 'medication',
        data: entityData,
        timestamp: new Date(),
        checksum: status.checksum!,
        version: 1
      };

      const uploadFn2 = jest.fn(async () => []);
      const downloadFn2 = jest.fn(async () => [serverEntity]);

      const result = await syncEngine.performIncrementalSync(uploadFn2, downloadFn2);

      expect(result.unchanged.length).toBe(1);
      expect(result.unchanged[0]).toBe('med_123');
      expect(result.downloaded.length).toBe(0);
    });

    it('should batch uploads according to batch size', async () => {
      // Create more entities than batch size
      for (let i = 0; i < 75; i++) {
        await syncEngine.trackEntityChange(`med_${i}`, 'medication', {
          id: `med_${i}`,
          dosage: '100mg'
        });
      }

      const uploadCalls: SyncEntity[][] = [];
      const uploadFn = jest.fn(async (entities: SyncEntity[]) => {
        uploadCalls.push(entities);
        return entities;
      });

      const downloadFn = jest.fn(async () => []);

      await syncEngine.performIncrementalSync(uploadFn, downloadFn);

      // Should be called multiple times with batches
      expect(uploadFn.mock.calls.length).toBeGreaterThan(1);

      // Each batch should respect the batch size limit (default 50)
      for (const call of uploadCalls) {
        expect(call.length).toBeLessThanOrEqual(50);
      }
    });

    it('should track bytes transferred', async () => {
      await syncEngine.trackEntityChange('med_123', 'medication', {
        id: 'med_123',
        dosage: '100mg',
        name: 'Medicine A'
      });

      const uploadFn = jest.fn(async (entities: SyncEntity[]) => entities);
      const downloadFn = jest.fn(async () => []);

      const result = await syncEngine.performIncrementalSync(uploadFn, downloadFn);

      expect(result.bytesTransferred).toBeGreaterThan(0);
    });

    it('should measure sync duration', async () => {
      await syncEngine.trackEntityChange('med_123', 'medication', {
        id: 'med_123',
        dosage: '100mg'
      });

      const uploadFn = jest.fn(async (entities: SyncEntity[]) => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return entities;
      });

      const downloadFn = jest.fn(async () => []);

      const result = await syncEngine.performIncrementalSync(uploadFn, downloadFn);

      expect(result.syncDuration).toBeGreaterThan(0);
    });

    it('should clear pending changes after successful upload', async () => {
      await syncEngine.trackEntityChange('med_123', 'medication', {
        id: 'med_123',
        dosage: '100mg'
      });

      expect(syncEngine.getPendingChangesCount()).toBe(1);

      const uploadFn = jest.fn(async (entities: SyncEntity[]) => entities);
      const downloadFn = jest.fn(async () => []);

      await syncEngine.performIncrementalSync(uploadFn, downloadFn);

      expect(syncEngine.getPendingChangesCount()).toBe(0);
    });

    it('should handle upload failures gracefully', async () => {
      await syncEngine.trackEntityChange('med_123', 'medication', {
        id: 'med_123',
        dosage: '100mg'
      });

      const uploadFn = jest.fn(async () => {
        throw new Error('Upload failed');
      });

      const downloadFn = jest.fn(async () => []);

      await expect(
        syncEngine.performIncrementalSync(uploadFn, downloadFn)
      ).rejects.toThrow('Upload failed');

      // Pending changes should still be there for retry
      expect(syncEngine.getPendingChangesCount()).toBe(1);
    });
  });

  describe('Entity Sync Status', () => {
    it('should track when entity was last synced', async () => {
      await syncEngine.trackEntityChange('med_123', 'medication', {
        id: 'med_123',
        dosage: '100mg'
      });

      const status = syncEngine.getEntitySyncStatus('med_123');

      expect(status.hasPendingChanges).toBe(true);
      expect(status.lastSynced).toBeDefined();
      expect(status.checksum).toBeDefined();
      expect(status.version).toBeGreaterThan(0);
    });

    it('should indicate no pending changes after sync', async () => {
      await syncEngine.trackEntityChange('med_123', 'medication', {
        id: 'med_123',
        dosage: '100mg'
      });

      const uploadFn = jest.fn(async (entities: SyncEntity[]) => entities);
      const downloadFn = jest.fn(async () => []);

      await syncEngine.performIncrementalSync(uploadFn, downloadFn);

      const status = syncEngine.getEntitySyncStatus('med_123');
      expect(status.hasPendingChanges).toBe(false);
    });
  });

  describe('Failed Syncs', () => {
    it('should track failed sync attempts', async () => {
      await syncEngine.trackEntityChange('med_123', 'medication', {
        id: 'med_123',
        dosage: '100mg'
      });

      let attemptCount = 0;
      const uploadFn = jest.fn(async (entities: SyncEntity[]) => {
        attemptCount++;
        if (attemptCount <= 2) {
          throw new Error('Upload failed');
        }
        return entities;
      });

      const downloadFn = jest.fn(async () => []);

      // First attempt - should fail
      await expect(
        syncEngine.performIncrementalSync(uploadFn, downloadFn)
      ).rejects.toThrow();

      expect(syncEngine.getFailedSyncs().length).toBeGreaterThan(0);
    });

    it('should allow retry of failed syncs', async () => {
      await syncEngine.trackEntityChange('med_123', 'medication', {
        id: 'med_123',
        dosage: '100mg'
      });

      const uploadFn = jest.fn(async () => {
        throw new Error('Upload failed');
      });

      const downloadFn = jest.fn(async () => []);

      // Fail the sync
      try {
        await syncEngine.performIncrementalSync(uploadFn, downloadFn);
      } catch (error) {
        // Expected to fail
      }

      const failedBefore = syncEngine.getFailedSyncs().length;

      // Retry failed syncs
      syncEngine.retryFailedSyncs();

      // Should move back to pending
      expect(syncEngine.getPendingChangesCount()).toBeGreaterThan(0);
    });
  });

  describe('Persistence', () => {
    it('should persist sync state', async () => {
      await syncEngine.trackEntityChange('med_123', 'medication', {
        id: 'med_123',
        dosage: '100mg'
      });

      expect(AsyncStorage.setItem).toHaveBeenCalledWith(
        expect.stringContaining('sync_state'),
        expect.any(String)
      );
    });

    it('should clear sync state', async () => {
      await syncEngine.trackEntityChange('med_123', 'medication', {
        id: 'med_123',
        dosage: '100mg'
      });

      expect(syncEngine.getPendingChangesCount()).toBeGreaterThan(0);

      await syncEngine.clearSyncState();

      expect(syncEngine.getPendingChangesCount()).toBe(0);
    });
  });

  describe('Configuration', () => {
    it('should respect custom batch size', async () => {
      await syncEngine.initialize({
        batchSize: 10
      });

      // Create 25 entities
      for (let i = 0; i < 25; i++) {
        await syncEngine.trackEntityChange(`med_${i}`, 'medication', {
          id: `med_${i}`
        });
      }

      const uploadCalls: SyncEntity[][] = [];
      const uploadFn = jest.fn(async (entities: SyncEntity[]) => {
        uploadCalls.push(entities);
        return entities;
      });

      const downloadFn = jest.fn(async () => []);

      await syncEngine.performIncrementalSync(uploadFn, downloadFn);

      // Check that batches respect custom size
      for (const call of uploadCalls) {
        expect(call.length).toBeLessThanOrEqual(10);
      }
    });

    it('should disable conflict detection when configured', async () => {
      await syncEngine.initialize({
        conflictDetectionEnabled: false
      });

      await syncEngine.trackEntityChange('med_conflict', 'medication', {
        id: 'med_conflict',
        dosage: '100mg'
      });

      const serverEntity: SyncEntity = {
        id: 'med_conflict',
        type: 'medication',
        data: { id: 'med_conflict', dosage: '50mg' },
        timestamp: new Date(),
        checksum: 'different_checksum',
        version: 2
      };

      const uploadFn = jest.fn(async (entities: SyncEntity[]) => entities);
      const downloadFn = jest.fn(async () => [serverEntity]);

      const result = await syncEngine.performIncrementalSync(uploadFn, downloadFn);

      // Should not detect conflicts
      expect(result.conflicts.length).toBe(0);
      expect(result.downloaded.length).toBe(1);
    });
  });
});