/**
 * Cultural Persistence Middleware
 * 
 * Handles automatic saving and synchronization of cultural profile data
 * with smart batching and offline support.
 */

import { Middleware, MiddlewareAPI, Dispatch, AnyAction } from '@reduxjs/toolkit';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { RootState } from '../index';
import type { CulturalProfile } from '@/types/cultural';

interface CulturalPersistenceConfig {
  autoSave: boolean;
  syncInterval: number; // milliseconds
}

interface PersistenceQueueItem {
  action: AnyAction;
  timestamp: number;
  retryCount: number;
}

/**
 * Cultural Data Persistence Manager
 */
export class CulturalPersistenceManager {
  private static syncTimer: NodeJS.Timeout | null = null;
  private static pendingChanges: Map<string, any> = new Map();
  private static syncQueue: PersistenceQueueItem[] = [];
  private static isOnline: boolean = true;
  private static lastSyncTime: number = 0;

  static async initialize() {
    // Load persisted cultural data on startup
    await this.loadPersistedData();
    
    // Set up periodic sync
    this.startPeriodicSync();
  }

  static setOnlineStatus(online: boolean) {
    const wasOffline = !this.isOnline;
    this.isOnline = online;

    // If coming back online, sync pending changes
    if (wasOffline && online) {
      this.processSyncQueue();
    }
  }

  static async persistCulturalChange(key: string, data: any, immediate: boolean = false) {
    // Store locally immediately
    await this.saveToLocalStorage(key, data);
    
    // Add to pending changes
    this.pendingChanges.set(key, {
      data,
      timestamp: Date.now(),
    });

    // Sync immediately if requested and online
    if (immediate && this.isOnline) {
      await this.syncToBackend();
    }
  }

  private static async saveToLocalStorage(key: string, data: any) {
    try {
      const storageKey = `cultural_${key}`;
      await AsyncStorage.setItem(storageKey, JSON.stringify({
        data,
        timestamp: Date.now(),
      }));
    } catch (error) {
      console.error('Failed to save cultural data to local storage:', error);
    }
  }

  private static async loadPersistedData() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const culturalKeys = keys.filter(key => key.startsWith('cultural_'));
      
      const culturalData: Record<string, any> = {};
      
      for (const key of culturalKeys) {
        const rawData = await AsyncStorage.getItem(key);
        if (rawData) {
          const parsedData = JSON.parse(rawData);
          const dataKey = key.replace('cultural_', '');
          culturalData[dataKey] = parsedData;
        }
      }

      return culturalData;
    } catch (error) {
      console.error('Failed to load persisted cultural data:', error);
      return {};
    }
  }

  private static startPeriodicSync() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
    }

    // Default sync every 30 seconds
    this.syncTimer = setInterval(() => {
      if (this.isOnline && this.pendingChanges.size > 0) {
        this.syncToBackend();
      }
    }, 30000);
  }

  private static async syncToBackend() {
    if (!this.isOnline || this.pendingChanges.size === 0) {
      return;
    }

    try {
      const changesToSync = new Map(this.pendingChanges);
      this.pendingChanges.clear();

      // Prepare sync payload
      const syncPayload = {
        timestamp: Date.now(),
        changes: Array.from(changesToSync.entries()).map(([key, value]) => ({
          key,
          data: value.data,
          timestamp: value.timestamp,
        })),
      };

      // This would integrate with your actual API
      const response = await fetch('/api/cultural/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Add auth headers here
        },
        body: JSON.stringify(syncPayload),
      });

      if (response.ok) {
        this.lastSyncTime = Date.now();
        console.log('Cultural data synced successfully');
      } else {
        // Re-add changes to queue for retry
        changesToSync.forEach((value, key) => {
          this.pendingChanges.set(key, value);
        });
        throw new Error(`Sync failed: ${response.status}`);
      }
    } catch (error) {
      console.error('Cultural data sync failed:', error);
      
      // Add to sync queue for retry
      this.addToSyncQueue(Array.from(this.pendingChanges.entries()));
    }
  }

  private static addToSyncQueue(changes: Array<[string, any]>) {
    const queueItems: PersistenceQueueItem[] = changes.map(([key, value]) => ({
      action: {
        type: 'cultural/sync',
        payload: { key, data: value.data },
      },
      timestamp: Date.now(),
      retryCount: 0,
    }));

    this.syncQueue.push(...queueItems);

    // Limit queue size
    if (this.syncQueue.length > 100) {
      this.syncQueue.splice(0, this.syncQueue.length - 100);
    }
  }

  private static async processSyncQueue() {
    if (!this.isOnline || this.syncQueue.length === 0) {
      return;
    }

    const maxRetries = 3;
    const itemsToProcess = [...this.syncQueue];
    this.syncQueue = [];

    for (const item of itemsToProcess) {
      try {
        if (item.retryCount >= maxRetries) {
          console.warn('Dropping sync item after max retries:', item);
          continue;
        }

        await this.retrySyncItem(item);
      } catch (error) {
        console.error('Failed to process sync queue item:', error);
        
        // Re-add to queue with incremented retry count
        item.retryCount++;
        this.syncQueue.push(item);
      }
    }
  }

  private static async retrySyncItem(item: PersistenceQueueItem) {
    // This would implement the actual retry logic
    console.log('Retrying sync item:', item);
  }

  static getPendingChanges() {
    return new Map(this.pendingChanges);
  }

  static getSyncQueueSize(): number {
    return this.syncQueue.length;
  }

  static getLastSyncTime(): number {
    return this.lastSyncTime;
  }

  static forceSync(): Promise<void> {
    return this.syncToBackend();
  }

  static cleanup() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
  }
}

/**
 * Cultural Change Detector
 */
export class CulturalChangeDetector {
  private static previousProfile: CulturalProfile | null = null;
  private static changeHistory: Array<{
    field: string;
    oldValue: any;
    newValue: any;
    timestamp: number;
  }> = [];

  static detectChanges(newProfile: CulturalProfile): Array<{
    field: string;
    oldValue: any;
    newValue: any;
    priority: 'high' | 'medium' | 'low';
  }> {
    if (!this.previousProfile) {
      this.previousProfile = { ...newProfile };
      return [];
    }

    const changes = [];
    const fields = Object.keys(newProfile) as Array<keyof CulturalProfile>;

    for (const field of fields) {
      const oldValue = this.previousProfile[field];
      const newValue = newProfile[field];

      if (!this.isEqual(oldValue, newValue)) {
        const priority = this.getChangePriority(field);
        
        changes.push({
          field,
          oldValue,
          newValue,
          priority,
        });

        // Add to change history
        this.changeHistory.push({
          field,
          oldValue,
          newValue,
          timestamp: Date.now(),
        });
      }
    }

    // Update previous profile
    this.previousProfile = { ...newProfile };

    // Limit change history size
    if (this.changeHistory.length > 1000) {
      this.changeHistory.splice(0, this.changeHistory.length - 1000);
    }

    return changes;
  }

  private static isEqual(a: any, b: any): boolean {
    try {
      return JSON.stringify(a) === JSON.stringify(b);
    } catch {
      return a === b;
    }
  }

  private static getChangePriority(field: string): 'high' | 'medium' | 'low' {
    const highPriorityFields = ['language', 'timezone'];
    const mediumPriorityFields = ['prayerTimes', 'familyStructure'];
    
    if (highPriorityFields.includes(field)) {
      return 'high';
    } else if (mediumPriorityFields.includes(field)) {
      return 'medium';
    }
    
    return 'low';
  }

  static getChangeHistory() {
    return [...this.changeHistory];
  }

  static getRecentChanges(minutes: number = 30) {
    const cutoff = Date.now() - (minutes * 60 * 1000);
    return this.changeHistory.filter(change => change.timestamp > cutoff);
  }

  static clearChangeHistory() {
    this.changeHistory = [];
  }
}

/**
 * Smart Batching Manager
 */
export class SmartBatchingManager {
  private static batchedChanges: Map<string, any> = new Map();
  private static batchTimer: NodeJS.Timeout | null = null;
  private static batchInterval: number = 5000; // 5 seconds

  static addToBatch(key: string, data: any, priority: 'high' | 'medium' | 'low' = 'medium') {
    this.batchedChanges.set(key, {
      data,
      priority,
      timestamp: Date.now(),
    });

    // High priority changes should be persisted immediately
    if (priority === 'high') {
      this.flushBatch();
      return;
    }

    // Start batch timer if not already running
    if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => {
        this.flushBatch();
      }, this.batchInterval);
    }
  }

  private static async flushBatch() {
    if (this.batchedChanges.size === 0) {
      return;
    }

    const changesToFlush = new Map(this.batchedChanges);
    this.batchedChanges.clear();

    // Clear timer
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    // Persist all batched changes
    try {
      const promises = Array.from(changesToFlush.entries()).map(([key, value]) =>
        CulturalPersistenceManager.persistCulturalChange(key, value.data, value.priority === 'high')
      );

      await Promise.all(promises);
      console.log(`Flushed ${changesToFlush.size} cultural changes`);
    } catch (error) {
      console.error('Failed to flush cultural changes batch:', error);
      
      // Re-add failed changes to batch
      changesToFlush.forEach((value, key) => {
        this.batchedChanges.set(key, value);
      });
    }
  }

  static getBatchedChangesCount(): number {
    return this.batchedChanges.size;
  }

  static forceBatchFlush(): Promise<void> {
    return this.flushBatch();
  }
}

/**
 * Cultural Persistence Middleware Factory
 */
export function culturalPersistenceMiddleware(config: CulturalPersistenceConfig): Middleware {
  // Initialize persistence manager
  CulturalPersistenceManager.initialize();

  return (store: MiddlewareAPI<Dispatch, RootState>) => (next: Dispatch) => (action: AnyAction) => {
    const prevState = store.getState();
    const result = next(action);
    const newState = store.getState();

    // Check if cultural state changed
    if (isCulturalAction(action) || prevState.cultural !== newState.cultural) {
      handleCulturalStateChange(prevState, newState, action, config);
    }

    // Handle online/offline state changes
    if (action.type === 'app/setOnlineStatus') {
      CulturalPersistenceManager.setOnlineStatus(action.payload);
    }

    return result;
  };
}

/**
 * Cultural State Change Handler
 */
async function handleCulturalStateChange(
  prevState: RootState,
  newState: RootState,
  action: AnyAction,
  config: CulturalPersistenceConfig
) {
  const prevProfile = prevState.cultural.profile;
  const newProfile = newState.cultural.profile;

  // Detect what changed
  if (newProfile && (prevProfile !== newProfile)) {
    const changes = CulturalChangeDetector.detectChanges(newProfile);
    
    if (changes.length > 0) {
      console.log('Cultural changes detected:', changes.map(c => c.field));

      if (config.autoSave) {
        // Process changes with smart batching
        for (const change of changes) {
          SmartBatchingManager.addToBatch(
            `profile.${change.field}`,
            change.newValue,
            change.priority
          );
        }
      }
    }
  }

  // Handle specific cultural actions that need immediate persistence
  if (shouldPersistImmediately(action)) {
    await CulturalPersistenceManager.persistCulturalChange(
      action.type,
      action.payload,
      true
    );
  }
}

/**
 * Action Type Checkers
 */
function isCulturalAction(action: AnyAction): boolean {
  const culturalActionTypes = [
    'cultural/',
    'CULTURAL_',
    'SET_LANGUAGE',
    'UPDATE_PRAYER_TIMES',
    'SET_FAMILY_STRUCTURE',
    'UPDATE_FESTIVAL_PREFERENCES',
  ];

  return culturalActionTypes.some(prefix => action.type.startsWith(prefix));
}

function shouldPersistImmediately(action: AnyAction): boolean {
  const immediateActionTypes = [
    'cultural/setLanguage',
    'cultural/updatePrayerTimes',
    'cultural/setEmergencyContact',
    'cultural/updateFamilyStructure',
  ];

  return immediateActionTypes.includes(action.type);
}

/**
 * Cultural Persistence Analytics
 */
export class CulturalPersistenceAnalytics {
  private static persistenceEvents: Array<{
    type: 'save' | 'sync' | 'error';
    timestamp: number;
    data: any;
  }> = [];

  static trackEvent(type: 'save' | 'sync' | 'error', data?: any) {
    this.persistenceEvents.push({
      type,
      timestamp: Date.now(),
      data,
    });

    // Limit events array size
    if (this.persistenceEvents.length > 1000) {
      this.persistenceEvents.shift();
    }
  }

  static getAnalytics() {
    const now = Date.now();
    const oneHour = 60 * 60 * 1000;
    const recentEvents = this.persistenceEvents.filter(
      e => now - e.timestamp < oneHour
    );

    return {
      totalEvents: this.persistenceEvents.length,
      recentEvents: recentEvents.length,
      eventsByType: {
        save: recentEvents.filter(e => e.type === 'save').length,
        sync: recentEvents.filter(e => e.type === 'sync').length,
        error: recentEvents.filter(e => e.type === 'error').length,
      },
      pendingChanges: CulturalPersistenceManager.getPendingChanges().size,
      syncQueueSize: CulturalPersistenceManager.getSyncQueueSize(),
      lastSyncTime: CulturalPersistenceManager.getLastSyncTime(),
      batchedChanges: SmartBatchingManager.getBatchedChangesCount(),
    };
  }

  static generatePersistenceReport() {
    const analytics = this.getAnalytics();
    const changeHistory = CulturalChangeDetector.getRecentChanges(60); // Last hour

    return {
      timestamp: new Date().toISOString(),
      analytics,
      recentChanges: changeHistory.length,
      mostChangedFields: this.getMostChangedFields(changeHistory),
      recommendations: this.getRecommendations(analytics),
    };
  }

  private static getMostChangedFields(changes: any[]) {
    const fieldCounts: Record<string, number> = {};
    
    for (const change of changes) {
      fieldCounts[change.field] = (fieldCounts[change.field] || 0) + 1;
    }

    return Object.entries(fieldCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);
  }

  private static getRecommendations(analytics: any) {
    const recommendations = [];

    if (analytics.eventsByType.error > analytics.eventsByType.save * 0.1) {
      recommendations.push('High error rate in cultural persistence - review sync logic');
    }

    if (analytics.pendingChanges > 10) {
      recommendations.push('Many pending changes - consider reducing sync interval');
    }

    if (analytics.batchedChanges > 20) {
      recommendations.push('Large batch size - consider more frequent flushing');
    }

    return recommendations;
  }
}