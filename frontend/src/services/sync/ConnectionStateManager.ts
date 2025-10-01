/**
 * Connection State Manager
 *
 * Manages network connection state and triggers intelligent sync operations.
 * Part of Issue #27 Stream B - Intelligent Synchronization & Conflict Resolution
 *
 * Features:
 * - Network state detection and monitoring
 * - Connection quality assessment
 * - Smart sync triggering based on connection state
 * - Offline-to-online transition handling
 */

import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ConnectionState {
  isConnected: boolean;
  connectionType: string;
  connectionQuality: 'excellent' | 'good' | 'poor' | 'offline';
  signalStrength: number;
  isMetered: boolean;
  lastStateChange: Date;
  stableConnection: boolean;
}

export interface ConnectionStateManagerConfig {
  stabilityCheckWindow: number; // milliseconds to wait before considering connection stable
  poorConnectionThreshold: number; // signal strength below this is considered poor
  syncTriggerDelay: number; // delay before triggering sync on connection restore
  monitoringInterval: number; // interval for checking connection quality
}

class ConnectionStateManager {
  private static instance: ConnectionStateManager;
  private config: ConnectionStateManagerConfig;
  private currentState: ConnectionState;
  private stateListeners: Array<(state: ConnectionState) => void> = [];
  private networkUnsubscribe?: () => void;
  private stabilityTimer?: NodeJS.Timeout;
  private lastStateChangeTime: number = 0;
  private stateHistory: Array<{ state: ConnectionState; timestamp: Date }> = [];

  private readonly STORAGE_KEY = 'connection_state_history';
  private readonly MAX_HISTORY_SIZE = 100;

  private constructor() {
    this.config = this.getDefaultConfig();
    this.currentState = this.getDefaultState();
  }

  static getInstance(): ConnectionStateManager {
    if (!ConnectionStateManager.instance) {
      ConnectionStateManager.instance = new ConnectionStateManager();
    }
    return ConnectionStateManager.instance;
  }

  /**
   * Initialize connection state monitoring
   */
  async initialize(config?: Partial<ConnectionStateManagerConfig>): Promise<void> {
    if (config) {
      this.config = { ...this.config, ...config };
    }

    // Load historical state
    await this.loadStateHistory();

    // Get initial network state
    const initialState = await NetInfo.fetch();
    await this.updateConnectionState(initialState);

    // Subscribe to network state changes
    this.networkUnsubscribe = NetInfo.addEventListener(state => {
      this.handleNetworkStateChange(state);
    });

    console.log('ConnectionStateManager initialized');
  }

  /**
   * Get current connection state
   */
  getConnectionState(): ConnectionState {
    return { ...this.currentState };
  }

  /**
   * Check if connection is suitable for sync
   */
  isSyncRecommended(): boolean {
    if (!this.currentState.isConnected) {
      return false;
    }

    if (!this.currentState.stableConnection) {
      return false;
    }

    if (this.currentState.connectionQuality === 'poor') {
      return false;
    }

    // If metered connection, only recommend sync for excellent quality
    if (this.currentState.isMetered && this.currentState.connectionQuality !== 'excellent') {
      return false;
    }

    return true;
  }

  /**
   * Get time since last state change
   */
  getTimeSinceLastChange(): number {
    return Date.now() - this.currentState.lastStateChange.getTime();
  }

  /**
   * Subscribe to connection state changes
   */
  onStateChange(listener: (state: ConnectionState) => void): () => void {
    this.stateListeners.push(listener);

    // Return unsubscribe function
    return () => {
      const index = this.stateListeners.indexOf(listener);
      if (index > -1) {
        this.stateListeners.splice(index, 1);
      }
    };
  }

  /**
   * Get connection state history
   */
  getStateHistory(limit: number = 10): Array<{ state: ConnectionState; timestamp: Date }> {
    return this.stateHistory
      .slice(-limit)
      .map(entry => ({
        state: { ...entry.state },
        timestamp: new Date(entry.timestamp)
      }));
  }

  /**
   * Calculate connection stability score (0-1)
   */
  getStabilityScore(): number {
    if (this.stateHistory.length < 2) {
      return this.currentState.isConnected ? 1 : 0;
    }

    const recentHistory = this.stateHistory.slice(-10);
    const connectionChanges = recentHistory.filter((entry, index) => {
      if (index === 0) return false;
      return entry.state.isConnected !== recentHistory[index - 1].state.isConnected;
    }).length;

    // More changes = less stable
    return Math.max(0, 1 - (connectionChanges / 10));
  }

  /**
   * Private methods
   */

  private async handleNetworkStateChange(state: NetInfoState): Promise<void> {
    const wasConnected = this.currentState.isConnected;
    const now = Date.now();

    // Debounce rapid state changes
    if (now - this.lastStateChangeTime < 1000) {
      return;
    }

    this.lastStateChangeTime = now;

    await this.updateConnectionState(state);

    const isConnected = this.currentState.isConnected;

    // Detect offline-to-online transition
    if (!wasConnected && isConnected) {
      console.log('Connection restored - triggering stability check');
      this.startStabilityCheck();
    } else if (wasConnected && !isConnected) {
      console.log('Connection lost');
      this.clearStabilityCheck();
      this.currentState.stableConnection = false;
    }

    // Notify listeners
    this.notifyListeners();

    // Save to history
    await this.saveStateHistory();
  }

  private async updateConnectionState(state: NetInfoState): Promise<void> {
    const isConnected = state.isConnected ?? false;
    const connectionType = state.type || 'unknown';
    const isMetered = state.type === 'cellular';

    // Calculate signal strength and quality
    const signalStrength = this.calculateSignalStrength(state);
    const connectionQuality = this.assessConnectionQuality(signalStrength, connectionType, isConnected);

    this.currentState = {
      isConnected,
      connectionType,
      connectionQuality,
      signalStrength,
      isMetered,
      lastStateChange: new Date(),
      stableConnection: this.currentState.stableConnection // Preserve until stability check completes
    };

    // Add to history
    this.stateHistory.push({
      state: { ...this.currentState },
      timestamp: new Date()
    });

    // Trim history
    if (this.stateHistory.length > this.MAX_HISTORY_SIZE) {
      this.stateHistory = this.stateHistory.slice(-this.MAX_HISTORY_SIZE);
    }
  }

  private calculateSignalStrength(state: NetInfoState): number {
    // Calculate signal strength on scale of 0-1
    if (!state.isConnected) {
      return 0;
    }

    // For wifi, use details if available
    if (state.type === 'wifi' && state.details) {
      const details = state.details as any;
      if (details.strength !== undefined) {
        return details.strength / 100;
      }
      // Wifi is generally good
      return 0.9;
    }

    // For cellular, use details if available
    if (state.type === 'cellular' && state.details) {
      const details = state.details as any;
      if (details.cellularGeneration) {
        // 5G = 1.0, 4G = 0.8, 3G = 0.5, 2G = 0.3
        switch (details.cellularGeneration) {
          case '5g': return 1.0;
          case '4g': return 0.8;
          case '3g': return 0.5;
          case '2g': return 0.3;
          default: return 0.6;
        }
      }
      return 0.7; // Default cellular
    }

    // Ethernet is excellent
    if (state.type === 'ethernet') {
      return 1.0;
    }

    // Default for unknown connected states
    return 0.5;
  }

  private assessConnectionQuality(
    signalStrength: number,
    connectionType: string,
    isConnected: boolean
  ): 'excellent' | 'good' | 'poor' | 'offline' {
    if (!isConnected) {
      return 'offline';
    }

    if (signalStrength >= 0.8) {
      return 'excellent';
    } else if (signalStrength >= 0.5) {
      return 'good';
    } else {
      return 'poor';
    }
  }

  private startStabilityCheck(): void {
    // Clear any existing timer
    this.clearStabilityCheck();

    // Mark as unstable initially
    this.currentState.stableConnection = false;

    // Wait for stability window
    this.stabilityTimer = setTimeout(() => {
      if (this.currentState.isConnected) {
        console.log('Connection stable - ready for sync');
        this.currentState.stableConnection = true;
        this.notifyListeners();
      }
    }, this.config.stabilityCheckWindow);
  }

  private clearStabilityCheck(): void {
    if (this.stabilityTimer) {
      clearTimeout(this.stabilityTimer);
      this.stabilityTimer = undefined;
    }
  }

  private notifyListeners(): void {
    const state = { ...this.currentState };
    for (const listener of this.stateListeners) {
      try {
        listener(state);
      } catch (error) {
        console.error('Error in connection state listener:', error);
      }
    }
  }

  private async loadStateHistory(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const history = JSON.parse(stored);
        this.stateHistory = history.map((entry: any) => ({
          state: entry.state,
          timestamp: new Date(entry.timestamp)
        }));
      }
    } catch (error) {
      console.error('Failed to load connection state history:', error);
    }
  }

  private async saveStateHistory(): Promise<void> {
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.stateHistory));
    } catch (error) {
      console.error('Failed to save connection state history:', error);
    }
  }

  private getDefaultConfig(): ConnectionStateManagerConfig {
    return {
      stabilityCheckWindow: 3000, // 3 seconds
      poorConnectionThreshold: 0.3,
      syncTriggerDelay: 2000, // 2 seconds
      monitoringInterval: 30000 // 30 seconds
    };
  }

  private getDefaultState(): ConnectionState {
    return {
      isConnected: false,
      connectionType: 'unknown',
      connectionQuality: 'offline',
      signalStrength: 0,
      isMetered: false,
      lastStateChange: new Date(),
      stableConnection: false
    };
  }

  /**
   * Cleanup
   */
  async cleanup(): Promise<void> {
    if (this.networkUnsubscribe) {
      this.networkUnsubscribe();
    }
    this.clearStabilityCheck();
    this.stateListeners = [];
    await this.saveStateHistory();
  }
}

export default ConnectionStateManager;