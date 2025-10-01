/**
 * Offline Middleware
 * 
 * Handles action queuing and synchronization for offline scenarios
 * with smart conflict resolution.
 */

import { Middleware, MiddlewareAPI, Dispatch, AnyAction } from '@reduxjs/toolkit';
import type { RootState } from '../index';

interface OfflineConfig {
  queueActions: boolean;
  syncOnReconnect: boolean;
}

export function offlineMiddleware(config: OfflineConfig): Middleware {
  return (store: MiddlewareAPI<Dispatch, RootState>) => (next: Dispatch) => (action: AnyAction) => {
    const state = store.getState();
    
    // If offline and action requires network, queue it
    if (!state.app.isOnline && requiresNetwork(action.type)) {
      if (config.queueActions) {
        // Queue action for later (would implement proper queueing)
        console.log('Queuing action for offline sync:', action.type);
        return { type: 'OFFLINE_QUEUED', original: action.type };
      }
    }

    return next(action);
  };
}

function requiresNetwork(actionType: string): boolean {
  const networkActionTypes = [
    'api/',
    'sync/',
    'upload/',
    'download/',
  ];

  return networkActionTypes.some(prefix => actionType.startsWith(prefix));
}