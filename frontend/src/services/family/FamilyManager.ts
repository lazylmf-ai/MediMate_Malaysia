/**
 * Family Manager Service
 * Frontend service for family management integration with backend APIs
 * Provides real-time family data management and WebSocket integration
 */

import { EventEmitter } from 'events';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiClient } from '../../api/client';
import { authService } from '../auth/authService';
import { realtimeService } from '../../api/services/realtimeService';
import { privacyManager } from './PrivacyManager';
import { culturalIntelligenceService } from '../cultural/CulturalIntelligenceService';
import {
  FamilyCircle,
  FamilyMemberDetails,
  ActiveFamilyInvitation,
  FamilyDashboardData,
  FamilyMemberWithStatus,
  FamilyNotification,
  FamilyResponse,
  FamilyDashboardResponse,
  FamilyMembershipSummary,
  CreateFamilyRequest,
  UpdateFamilyRequest,
  InviteFamilyMemberRequest,
  AcceptFamilyInvitationRequest,
  UpdateFamilyMemberRequest,
  FamilyRole,
  FAMILY_CONSTANTS
} from '../../types/family';

interface FamilyManagerConfig {
  autoConnectWebSocket: boolean;
  cacheTimeout: number;
  retryAttempts: number;
  culturalAware: boolean;
}

interface WebSocketSubscription {
  familyId: string;
  handlers: Set<(data: any) => void>;
  lastUpdate: Date;
  connected: boolean;
}

class FamilyManager extends EventEmitter {
  private static instance: FamilyManager;
  private config: FamilyManagerConfig;
  private familyCache: Map<string, FamilyResponse> = new Map();
  private dashboardCache: Map<string, FamilyDashboardResponse> = new Map();
  private wsSubscriptions: Map<string, WebSocketSubscription> = new Map();
  private cacheTimestamps: Map<string, number> = new Map();
  private readonly CACHE_KEY = '@MediMate:family_cache';
  private readonly DEFAULT_CACHE_TIMEOUT = 30000; // 30 seconds
  private readonly API_TIMEOUT = 2000; // 2 seconds target

  private constructor(config: Partial<FamilyManagerConfig> = {}) {
    super();
    this.config = {
      autoConnectWebSocket: true,
      cacheTimeout: this.DEFAULT_CACHE_TIMEOUT,
      retryAttempts: 3,
      culturalAware: true,
      ...config
    };
    this.initialize();
  }

  static getInstance(config?: Partial<FamilyManagerConfig>): FamilyManager {
    if (!FamilyManager.instance) {
      FamilyManager.instance = new FamilyManager(config);
    }
    return FamilyManager.instance;
  }

  private async initialize(): Promise<void> {
    await this.loadCache();
    this.setupEventListeners();

    if (this.config.autoConnectWebSocket) {
      await this.initializeWebSocketConnections();
    }
  }

  private async loadCache(): Promise<void> {
    try {
      const cached = await AsyncStorage.getItem(this.CACHE_KEY);
      if (cached) {
        const { families, dashboards, timestamps } = JSON.parse(cached);

        // Restore family cache
        Object.entries(families || {}).forEach(([key, value]) => {
          this.familyCache.set(key, value as FamilyResponse);
        });

        // Restore dashboard cache
        Object.entries(dashboards || {}).forEach(([key, value]) => {
          this.dashboardCache.set(key, value as FamilyDashboardResponse);
        });

        // Restore timestamps
        Object.entries(timestamps || {}).forEach(([key, value]) => {
          this.cacheTimestamps.set(key, value as number);
        });

        // Clean expired cache entries
        await this.cleanExpiredCache();
      }
    } catch (error) {
      console.error('Failed to load family cache:', error);
    }
  }

  private setupEventListeners(): void {
    // Listen for authentication changes
    authService.on('logout', () => {
      this.clearAllData();
    });

    // Listen for privacy changes
    privacyManager.on('privacy:updated', (settings) => {
      this.handlePrivacyUpdate(settings);
    });

    // Listen for cultural context changes
    if (this.config.culturalAware) {
      culturalIntelligenceService.on('context:updated', (context) => {
        this.handleCulturalContextUpdate(context);
      });
    }

    // Listen for app state changes
    if (typeof window !== 'undefined' && window.addEventListener) {
      window.addEventListener('beforeunload', () => {
        this.cleanup();
      });
    }
  }

  private async initializeWebSocketConnections(): Promise<void> {
    try {
      // Get user's families and establish WebSocket connections
      const userId = authService.getCurrentUserId();
      if (!userId) return;

      const families = await this.getUserFamilies();
      for (const family of families) {
        await this.subscribeToFamilyUpdates(family.familyId);
      }
    } catch (error) {
      console.error('Failed to initialize WebSocket connections:', error);
    }
  }

  /**
   * Create a new family circle
   */
  async createFamily(familyData: CreateFamilyRequest): Promise<FamilyResponse | null> {
    const startTime = Date.now();

    try {
      const response = await apiClient.post('/api/family/create', familyData);

      if (response.data.success) {
        const familyResponse = response.data.family;

        // Cache the new family
        this.familyCache.set(familyResponse.family.id, familyResponse);
        this.cacheTimestamps.set(familyResponse.family.id, Date.now());
        await this.saveCache();

        // Subscribe to WebSocket updates
        if (this.config.autoConnectWebSocket) {
          await this.subscribeToFamilyUpdates(familyResponse.family.id);
        }

        // Emit event
        this.emit('family:created', familyResponse);

        const elapsed = Date.now() - startTime;
        if (elapsed > this.API_TIMEOUT) {
          console.warn(`Family creation took ${elapsed}ms, exceeding target`);
        }

        return familyResponse;
      }

      return null;
    } catch (error) {
      console.error('Failed to create family:', error);
      this.emit('family:error', { action: 'create', error });
      return null;
    }
  }

  /**
   * Get family details with caching
   */
  async getFamilyDetails(familyId: string, forceRefresh = false): Promise<FamilyResponse | null> {
    const startTime = Date.now();

    try {
      // Check cache first (unless force refresh)
      if (!forceRefresh && this.isCacheValid(familyId)) {
        const cached = this.familyCache.get(familyId);
        if (cached) {
          this.emit('family:loaded', { familyId, source: 'cache' });
          return cached;
        }
      }

      // Fetch from API
      const response = await apiClient.get(`/api/family/${familyId}`);

      if (response.data.success) {
        const familyResponse = response.data.family;

        // Update cache
        this.familyCache.set(familyId, familyResponse);
        this.cacheTimestamps.set(familyId, Date.now());
        await this.saveCache();

        // Emit event
        this.emit('family:loaded', { familyId, source: 'api' });

        const elapsed = Date.now() - startTime;
        if (elapsed > this.API_TIMEOUT) {
          console.warn(`Family fetch took ${elapsed}ms, exceeding target`);
        }

        return familyResponse;
      }

      return null;
    } catch (error) {
      console.error('Failed to get family details:', error);
      this.emit('family:error', { action: 'fetch', familyId, error });

      // Return cached version if available
      return this.familyCache.get(familyId) || null;
    }
  }

  /**
   * Get family dashboard data with real-time integration
   */
  async getFamilyDashboard(familyId: string, forceRefresh = false): Promise<FamilyDashboardData | null> {
    const startTime = Date.now();

    try {
      // Check cache first
      const cacheKey = `dashboard:${familyId}`;
      if (!forceRefresh && this.isCacheValid(cacheKey)) {
        const cached = this.dashboardCache.get(familyId);
        if (cached) {
          return this.transformDashboardResponse(cached);
        }
      }

      // Fetch from API
      const response = await apiClient.get(`/api/family/${familyId}/dashboard`);

      if (response.data.success) {
        const dashboardResponse = response.data.dashboard;

        // Update cache
        this.dashboardCache.set(familyId, dashboardResponse);
        this.cacheTimestamps.set(cacheKey, Date.now());
        await this.saveCache();

        // Subscribe to real-time updates if not already subscribed
        if (!this.wsSubscriptions.has(familyId)) {
          await this.subscribeToFamilyUpdates(familyId);
        }

        // Emit event
        this.emit('dashboard:loaded', { familyId, source: 'api' });

        const elapsed = Date.now() - startTime;
        if (elapsed > this.API_TIMEOUT) {
          console.warn(`Dashboard fetch took ${elapsed}ms, exceeding target`);
        }

        return this.transformDashboardResponse(dashboardResponse);
      }

      return null;
    } catch (error) {
      console.error('Failed to get family dashboard:', error);
      this.emit('dashboard:error', { familyId, error });

      // Return cached version if available
      const cached = this.dashboardCache.get(familyId);
      return cached ? this.transformDashboardResponse(cached) : null;
    }
  }

  /**
   * Get user's family memberships
   */
  async getUserFamilies(): Promise<FamilyMembershipSummary[]> {
    try {
      const response = await apiClient.get('/api/family/user');

      if (response.data.success) {
        const families = response.data.families;
        this.emit('families:loaded', { count: families.length });
        return families;
      }

      return [];
    } catch (error) {
      console.error('Failed to get user families:', error);
      this.emit('families:error', { error });
      return [];
    }
  }

  /**
   * Invite a member to family
   */
  async inviteMember(
    familyId: string,
    invitationData: InviteFamilyMemberRequest
  ): Promise<{ invitation: ActiveFamilyInvitation; qrCodeUrl?: string } | null> {
    try {
      const response = await apiClient.post(`/api/family/${familyId}/invite`, invitationData);

      if (response.data.success) {
        const result = response.data.invitation;

        // Refresh family data to include new invitation
        await this.getFamilyDetails(familyId, true);

        this.emit('member:invited', { familyId, invitation: result.invitation });
        return result;
      }

      return null;
    } catch (error) {
      console.error('Failed to invite family member:', error);
      this.emit('member:invite_error', { familyId, error });
      return null;
    }
  }

  /**
   * Accept family invitation
   */
  async acceptInvitation(
    inviteCode: string,
    acceptanceData: AcceptFamilyInvitationRequest
  ): Promise<{ success: boolean; familyId: string } | null> {
    try {
      const response = await apiClient.post('/api/family/accept-invitation', {
        inviteCode,
        ...acceptanceData
      });

      if (response.data.success) {
        const result = response.data.result;

        // Subscribe to the new family's updates
        if (this.config.autoConnectWebSocket) {
          await this.subscribeToFamilyUpdates(result.familyId);
        }

        this.emit('invitation:accepted', result);
        return result;
      }

      return null;
    } catch (error) {
      console.error('Failed to accept family invitation:', error);
      this.emit('invitation:error', { inviteCode, error });
      return null;
    }
  }

  /**
   * Update family member details
   */
  async updateMember(
    familyId: string,
    targetUserId: string,
    updateData: UpdateFamilyMemberRequest
  ): Promise<boolean> {
    try {
      const response = await apiClient.put(`/api/family/${familyId}/member/${targetUserId}`, updateData);

      if (response.data.success) {
        // Refresh family data
        await this.getFamilyDetails(familyId, true);

        this.emit('member:updated', { familyId, targetUserId, updateData });
        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to update family member:', error);
      this.emit('member:update_error', { familyId, targetUserId, error });
      return false;
    }
  }

  /**
   * Subscribe to real-time family updates
   */
  async subscribeToFamilyUpdates(familyId: string): Promise<boolean> {
    try {
      if (this.wsSubscriptions.has(familyId)) {
        return true; // Already subscribed
      }

      const subscription: WebSocketSubscription = {
        familyId,
        handlers: new Set(),
        lastUpdate: new Date(),
        connected: false
      };

      // Subscribe to family channel
      const channelName = `family:${familyId}`;
      const success = await realtimeService.subscribeToChannel(channelName, (data) => {
        this.handleFamilyUpdate(familyId, data);
      });

      if (success) {
        subscription.connected = true;
        this.wsSubscriptions.set(familyId, subscription);
        this.emit('websocket:subscribed', { familyId, channel: channelName });
        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to subscribe to family updates:', error);
      this.emit('websocket:error', { familyId, error });
      return false;
    }
  }

  /**
   * Unsubscribe from family updates
   */
  async unsubscribeFromFamilyUpdates(familyId: string): Promise<boolean> {
    try {
      const subscription = this.wsSubscriptions.get(familyId);
      if (!subscription) {
        return true; // Not subscribed
      }

      const channelName = `family:${familyId}`;
      await realtimeService.unsubscribeFromChannel(channelName);

      this.wsSubscriptions.delete(familyId);
      this.emit('websocket:unsubscribed', { familyId });
      return true;
    } catch (error) {
      console.error('Failed to unsubscribe from family updates:', error);
      return false;
    }
  }

  /**
   * Add handler for family updates
   */
  onFamilyUpdate(familyId: string, handler: (data: any) => void): () => void {
    const subscription = this.wsSubscriptions.get(familyId);
    if (subscription) {
      subscription.handlers.add(handler);

      return () => {
        subscription.handlers.delete(handler);
      };
    }

    // Return no-op function if not subscribed
    return () => {};
  }

  /**
   * Get connection status for a family
   */
  isConnected(familyId: string): boolean {
    const subscription = this.wsSubscriptions.get(familyId);
    return subscription?.connected || false;
  }

  /**
   * Get last update time for a family
   */
  getLastUpdate(familyId: string): Date | null {
    const subscription = this.wsSubscriptions.get(familyId);
    return subscription?.lastUpdate || null;
  }

  /**
   * Refresh family data manually
   */
  async refreshFamily(familyId: string): Promise<FamilyDashboardData | null> {
    return await this.getFamilyDashboard(familyId, true);
  }

  /**
   * Handle real-time family updates
   */
  private handleFamilyUpdate(familyId: string, data: any): void {
    const subscription = this.wsSubscriptions.get(familyId);
    if (!subscription) return;

    subscription.lastUpdate = new Date();

    // Update caches based on update type
    switch (data.type) {
      case 'member_status_changed':
        this.updateMemberStatus(familyId, data.memberId, data.status);
        break;

      case 'medication_taken':
      case 'medication_missed':
        this.updateMedicationStatus(familyId, data.memberId, data.medication);
        break;

      case 'emergency_triggered':
        this.handleEmergencyUpdate(familyId, data.emergency);
        break;

      case 'member_joined':
        this.invalidateCache(familyId);
        break;

      case 'family_settings_updated':
        this.invalidateCache(familyId);
        break;
    }

    // Notify handlers
    subscription.handlers.forEach(handler => {
      try {
        handler(data);
      } catch (error) {
        console.error('Error in family update handler:', error);
      }
    });

    // Emit general update event
    this.emit('family:updated', { familyId, updateType: data.type, data });
  }

  /**
   * Update member status in cache
   */
  private updateMemberStatus(familyId: string, memberId: string, status: any): void {
    const dashboard = this.dashboardCache.get(familyId);
    if (dashboard) {
      const member = dashboard.members.find(m => m.id === memberId);
      if (member) {
        Object.assign(member, status);
        this.emit('member:status_updated', { familyId, memberId, status });
      }
    }
  }

  /**
   * Update medication status in cache
   */
  private updateMedicationStatus(familyId: string, memberId: string, medication: any): void {
    const dashboard = this.dashboardCache.get(familyId);
    if (dashboard) {
      const memberMedication = dashboard.medicationSummary.find(
        m => m.userId === memberId
      );
      if (memberMedication) {
        // Update medication status
        Object.assign(memberMedication, medication);
        this.emit('medication:status_updated', { familyId, memberId, medication });
      }
    }
  }

  /**
   * Handle emergency updates
   */
  private handleEmergencyUpdate(familyId: string, emergency: any): void {
    const dashboard = this.dashboardCache.get(familyId);
    if (dashboard) {
      // Add to active notifications
      dashboard.activeNotifications = dashboard.activeNotifications || [];
      dashboard.activeNotifications.unshift({
        id: emergency.id,
        type: emergency.type,
        severity: emergency.severity,
        message: emergency.message,
        timestamp: new Date(emergency.timestamp),
        patientId: emergency.patientId,
        isEmergency: true
      });

      // Keep only last 10 notifications
      dashboard.activeNotifications = dashboard.activeNotifications.slice(0, 10);

      this.emit('emergency:triggered', { familyId, emergency });
    }
  }

  /**
   * Handle privacy setting updates
   */
  private handlePrivacyUpdate(settings: any): void {
    // Refresh affected family data
    if (settings.familyId) {
      this.invalidateCache(settings.familyId);
    }
  }

  /**
   * Handle cultural context updates
   */
  private handleCulturalContextUpdate(context: any): void {
    // Update all families with cultural context
    this.wsSubscriptions.forEach((subscription, familyId) => {
      this.emit('cultural:context_updated', { familyId, context });
    });
  }

  /**
   * Transform backend dashboard response to frontend format
   */
  private transformDashboardResponse(response: FamilyDashboardResponse): FamilyDashboardData {
    return {
      family: response.family,
      members: response.members.map(member => ({
        ...member,
        emergencyStatus: member.emergencyStatus || 'normal',
        medicationStatus: member.medicationStatus || {
          totalMedications: 0,
          takenToday: 0,
          missedToday: 0,
          criticalMissed: 0,
          adherenceRate: 100
        }
      })),
      recentActivity: response.recentActivity || [],
      activeNotifications: response.activeNotifications || [],
      medicationSummary: response.medicationSummary || [],
      patientId: response.family.members?.[0]?.userId || '',
      lastSync: new Date()
    };
  }

  /**
   * Check if cache is valid
   */
  private isCacheValid(key: string): boolean {
    const timestamp = this.cacheTimestamps.get(key);
    if (!timestamp) return false;

    return Date.now() - timestamp < this.config.cacheTimeout;
  }

  /**
   * Invalidate cache for a family
   */
  private invalidateCache(familyId: string): void {
    this.familyCache.delete(familyId);
    this.dashboardCache.delete(familyId);
    this.cacheTimestamps.delete(familyId);
    this.cacheTimestamps.delete(`dashboard:${familyId}`);
  }

  /**
   * Clean expired cache entries
   */
  private async cleanExpiredCache(): Promise<void> {
    const now = Date.now();
    const expired: string[] = [];

    this.cacheTimestamps.forEach((timestamp, key) => {
      if (now - timestamp > this.config.cacheTimeout) {
        expired.push(key);
      }
    });

    expired.forEach(key => {
      this.cacheTimestamps.delete(key);

      if (key.startsWith('dashboard:')) {
        const familyId = key.replace('dashboard:', '');
        this.dashboardCache.delete(familyId);
      } else {
        this.familyCache.delete(key);
      }
    });

    if (expired.length > 0) {
      await this.saveCache();
    }
  }

  /**
   * Save cache to storage
   */
  private async saveCache(): Promise<void> {
    try {
      const families: Record<string, FamilyResponse> = {};
      const dashboards: Record<string, FamilyDashboardResponse> = {};
      const timestamps: Record<string, number> = {};

      this.familyCache.forEach((value, key) => {
        families[key] = value;
      });

      this.dashboardCache.forEach((value, key) => {
        dashboards[key] = value;
      });

      this.cacheTimestamps.forEach((value, key) => {
        timestamps[key] = value;
      });

      await AsyncStorage.setItem(this.CACHE_KEY, JSON.stringify({
        families,
        dashboards,
        timestamps
      }));
    } catch (error) {
      console.error('Failed to save family cache:', error);
    }
  }

  /**
   * Clear all data
   */
  private async clearAllData(): Promise<void> {
    // Clear caches
    this.familyCache.clear();
    this.dashboardCache.clear();
    this.cacheTimestamps.clear();

    // Unsubscribe from all WebSocket connections
    for (const familyId of this.wsSubscriptions.keys()) {
      await this.unsubscribeFromFamilyUpdates(familyId);
    }

    // Clear storage
    await AsyncStorage.removeItem(this.CACHE_KEY);
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    await this.clearAllData();
    this.removeAllListeners();
  }

  /**
   * Get performance metrics
   */
  getMetrics(): any {
    return {
      cachedFamilies: this.familyCache.size,
      cachedDashboards: this.dashboardCache.size,
      activeSubscriptions: this.wsSubscriptions.size,
      connectedSubscriptions: Array.from(this.wsSubscriptions.values())
        .filter(s => s.connected).length
    };
  }
}

// Export singleton instance
export const familyManager = FamilyManager.getInstance({
  autoConnectWebSocket: true,
  cacheTimeout: 30000,
  retryAttempts: 3,
  culturalAware: true
});

export default familyManager;