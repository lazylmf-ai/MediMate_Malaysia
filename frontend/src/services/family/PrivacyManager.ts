/**
 * Privacy Manager Service
 * Manages granular family privacy controls with Malaysian cultural awareness
 * Supports PDPA compliance and FHIR integration for healthcare providers
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { EventEmitter } from 'events';
import { culturalIntelligenceService } from '../cultural/CulturalIntelligenceService';
import { authService } from '../auth/authService';
import { apiClient } from '../../api/client';

// Types
export interface PrivacySettings {
  id: string;
  userId: string;
  familyId: string;
  dataCategories: DataCategoryPermission[];
  familyMemberPermissions: FamilyMemberPermission[];
  culturalPreferences: CulturalPrivacyPreferences;
  pdpaConsent: PDPAConsent;
  fhirIntegration?: FHIRSharingSettings;
  lastUpdated: Date;
  version: string;
}

export interface DataCategoryPermission {
  category: DataCategory;
  visibility: VisibilityLevel;
  shareWithHealthcareProviders: boolean;
  shareWithFamilyMembers: string[];
  culturalRestrictions?: CulturalRestriction[];
  emergencyOverride: boolean;
}

export type DataCategory =
  | 'medications'
  | 'adherence_history'
  | 'health_metrics'
  | 'emergency_contacts'
  | 'medical_conditions'
  | 'allergies'
  | 'appointments'
  | 'insurance_details'
  | 'cultural_preferences'
  | 'prayer_schedule'
  | 'dietary_restrictions';

export type VisibilityLevel =
  | 'private'
  | 'family_only'
  | 'caregivers_only'
  | 'healthcare_providers'
  | 'emergency_only'
  | 'custom';

export interface FamilyMemberPermission {
  memberId: string;
  memberName: string;
  relationship: MalaysianFamilyRelationship;
  permissions: Permission[];
  culturalRole?: CulturalFamilyRole;
  validUntil?: Date;
  restrictions?: PermissionRestriction[];
  notificationPreferences?: NotificationPreference;
}

export type MalaysianFamilyRelationship =
  | 'spouse'
  | 'parent'
  | 'child'
  | 'grandparent'
  | 'grandchild'
  | 'sibling'
  | 'elder_sibling'
  | 'younger_sibling'
  | 'aunt_uncle'
  | 'cousin'
  | 'in_law'
  | 'extended_family';

export type CulturalFamilyRole =
  | 'family_head'
  | 'elder'
  | 'primary_caregiver'
  | 'decision_maker'
  | 'support_member';

export interface Permission {
  resource: string;
  actions: ('view' | 'edit' | 'share' | 'delete' | 'emergency_access')[];
  conditions?: PermissionCondition[];
  culturalOverride?: boolean;
}

export interface PermissionCondition {
  type: 'time_based' | 'location_based' | 'emergency' | 'cultural_event' | 'prayer_time';
  parameters: Record<string, any>;
}

export interface CulturalPrivacyPreferences {
  respectElderHierarchy: boolean;
  genderBasedRestrictions?: GenderRestriction[];
  religiousConsiderations?: ReligiousPrivacyConsideration[];
  collectiveDecisionMaking: boolean;
  extendedFamilyInclusion: boolean;
  prayerTimePrivacy: boolean;
  culturalEventSharing: boolean;
}

export interface GenderRestriction {
  dataCategory: DataCategory;
  restrictedGender?: 'male' | 'female';
  exceptions?: string[];
  culturalReason?: string;
}

export interface ReligiousPrivacyConsideration {
  type: 'islamic' | 'buddhist' | 'hindu' | 'christian' | 'other';
  restrictions: string[];
  specialHandling?: string;
  prayerTimeRestrictions?: boolean;
}

export interface PDPAConsent {
  consentId: string;
  consentDate: Date;
  consentVersion: string;
  purposes: ConsentPurpose[];
  dataRetentionPeriod: number;
  withdrawalRights: WithdrawalRights;
  thirdPartySharing?: ThirdPartyConsent[];
  lastReviewDate: Date;
  nextReviewDate: Date;
  malayLanguageVersion: boolean;
}

export interface ConsentPurpose {
  purpose: string;
  description: string;
  descriptionMalay?: string;
  isRequired: boolean;
  consented: boolean;
  consentDate?: Date;
}

export interface WithdrawalRights {
  canWithdrawConsent: boolean;
  withdrawalProcess: string;
  dataPortability: boolean;
  deletionRights: boolean;
  contactInfo: string;
}

export interface ThirdPartyConsent {
  organizationId: string;
  organizationName: string;
  organizationType: 'healthcare_provider' | 'insurance' | 'government' | 'research';
  purpose: string;
  consentGiven: boolean;
  validUntil: Date;
  dataCategories: DataCategory[];
}

export interface CulturalRestriction {
  type: 'age_based' | 'relationship_based' | 'religious' | 'custom';
  description: string;
  appliesTo: string[];
  culturalContext?: string;
}

export interface PermissionRestriction {
  type: 'temporal' | 'conditional' | 'cultural' | 'emergency_only';
  details: Record<string, any>;
}

export interface NotificationPreference {
  allowNotifications: boolean;
  notificationTypes: NotificationType[];
  quietHours?: { start: string; end: string };
  prayerTimeRespect: boolean;
  language: 'ms' | 'en' | 'zh' | 'ta';
}

export type NotificationType =
  | 'medication_taken'
  | 'medication_missed'
  | 'emergency'
  | 'health_update'
  | 'appointment'
  | 'family_activity';

// FHIR Integration Types
export interface FHIRSharingSettings {
  enabled: boolean;
  providerId?: string;
  providerName?: string;
  consentReference?: string;
  sharingLevel: 'full' | 'summary' | 'emergency_only';
  resourceTypes: FHIRResourceType[];
  lastSync?: Date;
  syncFrequency?: 'real_time' | 'hourly' | 'daily' | 'manual';
}

export type FHIRResourceType =
  | 'Patient'
  | 'RelatedPerson'
  | 'FamilyMemberHistory'
  | 'MedicationStatement'
  | 'MedicationAdministration'
  | 'AllergyIntolerance'
  | 'Condition'
  | 'Observation';

// Privacy Update Request
export interface PrivacyUpdateRequest {
  userId: string;
  familyId: string;
  updates: Partial<PrivacySettings>;
  reason?: string;
  culturalContext?: any;
}

// Privacy Audit Entry
export interface PrivacyAuditEntry {
  id: string;
  timestamp: Date;
  userId: string;
  action: PrivacyAction;
  resourceType?: DataCategory;
  details?: string;
  ipAddress?: string;
  pdpaCompliant: boolean;
}

export type PrivacyAction =
  | 'settings_updated'
  | 'consent_given'
  | 'consent_withdrawn'
  | 'data_shared'
  | 'emergency_access'
  | 'fhir_sync';

class PrivacyManager extends EventEmitter {
  private static instance: PrivacyManager;
  private privacySettings: Map<string, PrivacySettings> = new Map();
  private auditLog: PrivacyAuditEntry[] = [];
  private syncInterval?: NodeJS.Timeout;
  private readonly CACHE_KEY = '@MediMate:privacy_settings';
  private readonly UPDATE_TIMEOUT = 300; // 300ms target
  private readonly SYNC_TIMEOUT = 2000; // 2 seconds for FHIR sync

  private constructor() {
    super();
    this.initialize();
  }

  static getInstance(): PrivacyManager {
    if (!PrivacyManager.instance) {
      PrivacyManager.instance = new PrivacyManager();
    }
    return PrivacyManager.instance;
  }

  private async initialize(): Promise<void> {
    await this.loadCachedSettings();
    this.setupEventListeners();
    this.startPeriodicSync();
  }

  private async loadCachedSettings(): Promise<void> {
    try {
      const cached = await AsyncStorage.getItem(this.CACHE_KEY);
      if (cached) {
        const settings = JSON.parse(cached);
        Object.entries(settings).forEach(([key, value]) => {
          this.privacySettings.set(key, value as PrivacySettings);
        });
      }
    } catch (error) {
      console.error('Failed to load cached privacy settings:', error);
    }
  }

  private setupEventListeners(): void {
    // Listen for authentication changes
    authService.on('logout', () => {
      this.clearSettings();
    });

    // Listen for cultural context changes
    culturalIntelligenceService.on('context:updated', async (context) => {
      await this.updateCulturalPreferences(context);
    });
  }

  private startPeriodicSync(): void {
    // Sync privacy settings every 5 minutes
    this.syncInterval = setInterval(async () => {
      await this.syncWithBackend();
    }, 5 * 60 * 1000);
  }

  /**
   * Get privacy settings for a user in a family
   */
  async getPrivacySettings(userId: string, familyId: string): Promise<PrivacySettings | null> {
    const key = `${userId}:${familyId}`;

    // Check cache first
    if (this.privacySettings.has(key)) {
      return this.privacySettings.get(key)!;
    }

    // Fetch from backend
    try {
      const response = await apiClient.get(`/api/privacy/settings/${userId}/${familyId}`);
      const settings = response.data;

      // Cache for performance
      this.privacySettings.set(key, settings);
      await this.saveToCache();

      return settings;
    } catch (error) {
      console.error('Failed to fetch privacy settings:', error);
      return null;
    }
  }

  /**
   * Update privacy settings with performance optimization
   */
  async updatePrivacySettings(request: PrivacyUpdateRequest): Promise<boolean> {
    const startTime = Date.now();
    const key = `${request.userId}:${request.familyId}`;

    try {
      // Optimistic update for UI responsiveness
      const currentSettings = this.privacySettings.get(key);
      if (currentSettings) {
        const updatedSettings = {
          ...currentSettings,
          ...request.updates,
          lastUpdated: new Date(),
          version: this.incrementVersion(currentSettings.version)
        };
        this.privacySettings.set(key, updatedSettings);
        this.emit('privacy:updated', updatedSettings);
      }

      // Send to backend
      const response = await apiClient.put('/api/privacy/settings', request);

      if (response.data.success) {
        // Update cache with server response
        this.privacySettings.set(key, response.data.settings);
        await this.saveToCache();

        // Audit the change
        await this.auditPrivacyChange({
          userId: request.userId,
          action: 'settings_updated',
          details: request.reason,
          pdpaCompliant: true
        });

        const elapsed = Date.now() - startTime;
        if (elapsed > this.UPDATE_TIMEOUT) {
          console.warn(`Privacy update took ${elapsed}ms, exceeding target`);
        }

        return true;
      }

      // Rollback optimistic update on failure
      if (currentSettings) {
        this.privacySettings.set(key, currentSettings);
        this.emit('privacy:update_failed', { key, error: 'Server rejected update' });
      }

      return false;
    } catch (error) {
      console.error('Failed to update privacy settings:', error);

      // Rollback optimistic update
      const currentSettings = this.privacySettings.get(key);
      if (currentSettings) {
        this.privacySettings.set(key, currentSettings);
        this.emit('privacy:update_failed', { key, error });
      }

      return false;
    }
  }

  /**
   * Grant permission to a family member with cultural validation
   */
  async grantFamilyPermission(
    userId: string,
    familyId: string,
    memberId: string,
    permission: Permission
  ): Promise<boolean> {
    const settings = await this.getPrivacySettings(userId, familyId);
    if (!settings) return false;

    // Validate cultural appropriateness
    const culturalValidation = await culturalIntelligenceService.validateFamilyPermission(
      settings.culturalPreferences,
      permission
    );

    if (!culturalValidation.isValid && !permission.culturalOverride) {
      this.emit('privacy:cultural_restriction', {
        userId,
        memberId,
        reason: culturalValidation.reason
      });
      return false;
    }

    // Update permissions
    const memberPermission = settings.familyMemberPermissions.find(
      p => p.memberId === memberId
    );

    if (memberPermission) {
      memberPermission.permissions.push(permission);
    } else {
      settings.familyMemberPermissions.push({
        memberId,
        memberName: '', // Will be fetched from family service
        relationship: 'extended_family',
        permissions: [permission],
        notificationPreferences: {
          allowNotifications: true,
          notificationTypes: ['emergency'],
          prayerTimeRespect: true,
          language: 'ms'
        }
      });
    }

    return await this.updatePrivacySettings({
      userId,
      familyId,
      updates: { familyMemberPermissions: settings.familyMemberPermissions },
      reason: `Permission granted to member ${memberId}`
    });
  }

  /**
   * Revoke permission from a family member
   */
  async revokeFamilyPermission(
    userId: string,
    familyId: string,
    memberId: string,
    resource: string
  ): Promise<boolean> {
    const settings = await this.getPrivacySettings(userId, familyId);
    if (!settings) return false;

    const memberPermission = settings.familyMemberPermissions.find(
      p => p.memberId === memberId
    );

    if (!memberPermission) return false;

    // Remove the specific permission
    memberPermission.permissions = memberPermission.permissions.filter(
      p => p.resource !== resource
    );

    return await this.updatePrivacySettings({
      userId,
      familyId,
      updates: { familyMemberPermissions: settings.familyMemberPermissions },
      reason: `Permission revoked from member ${memberId} for resource ${resource}`
    });
  }

  /**
   * Update PDPA consent with Malaysian compliance
   */
  async updatePDPAConsent(
    userId: string,
    familyId: string,
    consent: Partial<PDPAConsent>
  ): Promise<boolean> {
    const settings = await this.getPrivacySettings(userId, familyId);
    if (!settings) return false;

    const updatedConsent = {
      ...settings.pdpaConsent,
      ...consent,
      lastReviewDate: new Date(),
      nextReviewDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year
    };

    return await this.updatePrivacySettings({
      userId,
      familyId,
      updates: { pdpaConsent: updatedConsent },
      reason: 'PDPA consent updated'
    });
  }

  /**
   * Enable FHIR integration for healthcare provider sharing
   */
  async enableFHIRIntegration(
    userId: string,
    familyId: string,
    settings: FHIRSharingSettings
  ): Promise<boolean> {
    const privacySettings = await this.getPrivacySettings(userId, familyId);
    if (!privacySettings) return false;

    // Validate provider and get consent reference
    const consentRef = await this.createFHIRConsent(userId, settings);
    if (!consentRef) return false;

    settings.consentReference = consentRef;
    settings.lastSync = new Date();

    return await this.updatePrivacySettings({
      userId,
      familyId,
      updates: { fhirIntegration: settings },
      reason: `FHIR integration enabled with provider ${settings.providerName}`
    });
  }

  /**
   * Sync FHIR resources with healthcare provider
   */
  async syncFHIRResources(userId: string, familyId: string): Promise<boolean> {
    const startTime = Date.now();
    const settings = await this.getPrivacySettings(userId, familyId);

    if (!settings?.fhirIntegration?.enabled) {
      return false;
    }

    try {
      const response = await apiClient.post('/api/fhir/sync', {
        userId,
        familyId,
        providerId: settings.fhirIntegration.providerId,
        resourceTypes: settings.fhirIntegration.resourceTypes,
        sharingLevel: settings.fhirIntegration.sharingLevel
      });

      if (response.data.success) {
        // Update last sync time
        settings.fhirIntegration.lastSync = new Date();
        await this.updatePrivacySettings({
          userId,
          familyId,
          updates: { fhirIntegration: settings.fhirIntegration },
          reason: 'FHIR sync completed'
        });

        const elapsed = Date.now() - startTime;
        if (elapsed > this.SYNC_TIMEOUT) {
          console.warn(`FHIR sync took ${elapsed}ms, exceeding target`);
        }

        this.emit('fhir:sync_completed', { userId, familyId, elapsed });
        return true;
      }

      return false;
    } catch (error) {
      console.error('FHIR sync failed:', error);
      this.emit('fhir:sync_failed', { userId, familyId, error });
      return false;
    }
  }

  /**
   * Handle emergency access override
   */
  async grantEmergencyAccess(
    userId: string,
    familyId: string,
    requesterId: string,
    reason: string
  ): Promise<boolean> {
    // Emergency access bypasses normal restrictions
    const emergencyPermission: Permission = {
      resource: '*',
      actions: ['view', 'emergency_access'],
      conditions: [{
        type: 'emergency',
        parameters: {
          grantedAt: new Date(),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          reason
        }
      }],
      culturalOverride: true
    };

    const granted = await this.grantFamilyPermission(
      userId,
      familyId,
      requesterId,
      emergencyPermission
    );

    if (granted) {
      // Audit emergency access
      await this.auditPrivacyChange({
        userId,
        action: 'emergency_access',
        details: `Emergency access granted to ${requesterId}: ${reason}`,
        pdpaCompliant: true // Emergency access is compliant under PDPA
      });

      this.emit('privacy:emergency_access', {
        userId,
        familyId,
        requesterId,
        reason
      });
    }

    return granted;
  }

  /**
   * Get privacy audit trail for PDPA compliance
   */
  async getAuditTrail(
    userId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<PrivacyAuditEntry[]> {
    try {
      const response = await apiClient.get('/api/privacy/audit', {
        params: { userId, startDate, endDate }
      });
      return response.data.entries;
    } catch (error) {
      console.error('Failed to fetch audit trail:', error);
      return [];
    }
  }

  /**
   * Check if a family member has permission for a resource
   */
  hasPermission(
    settings: PrivacySettings,
    memberId: string,
    resource: string,
    action: string
  ): boolean {
    const memberPermission = settings.familyMemberPermissions.find(
      p => p.memberId === memberId
    );

    if (!memberPermission) return false;

    return memberPermission.permissions.some(p => {
      if (p.resource !== resource && p.resource !== '*') return false;
      if (!p.actions.includes(action as any)) return false;

      // Check conditions
      if (p.conditions) {
        for (const condition of p.conditions) {
          if (!this.evaluateCondition(condition)) return false;
        }
      }

      return true;
    });
  }

  /**
   * Update cultural preferences for privacy
   */
  private async updateCulturalPreferences(context: any): Promise<void> {
    // Update all cached settings with new cultural context
    for (const [key, settings] of this.privacySettings) {
      if (context.prayerTimeActive) {
        settings.culturalPreferences.prayerTimePrivacy = true;
      }

      // Update based on cultural events
      if (context.currentEvent) {
        settings.culturalPreferences.culturalEventSharing = true;
      }
    }

    await this.saveToCache();
  }

  /**
   * Evaluate permission conditions
   */
  private evaluateCondition(condition: PermissionCondition): boolean {
    switch (condition.type) {
      case 'time_based':
        const now = new Date();
        const start = new Date(condition.parameters.start);
        const end = new Date(condition.parameters.end);
        return now >= start && now <= end;

      case 'emergency':
        return condition.parameters.active === true;

      case 'prayer_time':
        return !culturalIntelligenceService.isPrayerTime();

      case 'cultural_event':
        return culturalIntelligenceService.isCulturalEvent(
          condition.parameters.eventType
        );

      default:
        return true;
    }
  }

  /**
   * Create FHIR consent resource
   */
  private async createFHIRConsent(
    userId: string,
    settings: FHIRSharingSettings
  ): Promise<string | null> {
    try {
      const response = await apiClient.post('/api/fhir/consent', {
        userId,
        providerId: settings.providerId,
        resourceTypes: settings.resourceTypes,
        sharingLevel: settings.sharingLevel
      });
      return response.data.consentReference;
    } catch (error) {
      console.error('Failed to create FHIR consent:', error);
      return null;
    }
  }

  /**
   * Audit privacy-related actions
   */
  private async auditPrivacyChange(entry: Partial<PrivacyAuditEntry>): Promise<void> {
    const auditEntry: PrivacyAuditEntry = {
      id: `audit_${Date.now()}`,
      timestamp: new Date(),
      userId: entry.userId || '',
      action: entry.action || 'settings_updated',
      details: entry.details,
      pdpaCompliant: entry.pdpaCompliant ?? true
    };

    this.auditLog.push(auditEntry);

    // Send to backend for persistent storage
    try {
      await apiClient.post('/api/privacy/audit', auditEntry);
    } catch (error) {
      console.error('Failed to save audit entry:', error);
    }

    // Keep only last 100 entries in memory
    if (this.auditLog.length > 100) {
      this.auditLog = this.auditLog.slice(-100);
    }
  }

  /**
   * Save settings to local cache
   */
  private async saveToCache(): Promise<void> {
    try {
      const settings: Record<string, PrivacySettings> = {};
      this.privacySettings.forEach((value, key) => {
        settings[key] = value;
      });
      await AsyncStorage.setItem(this.CACHE_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save privacy settings to cache:', error);
    }
  }

  /**
   * Sync with backend
   */
  private async syncWithBackend(): Promise<void> {
    try {
      const userId = authService.getCurrentUserId();
      if (!userId) return;

      const response = await apiClient.get('/api/privacy/settings/sync', {
        params: { userId }
      });

      if (response.data.settings) {
        response.data.settings.forEach((setting: PrivacySettings) => {
          const key = `${setting.userId}:${setting.familyId}`;
          this.privacySettings.set(key, setting);
        });

        await this.saveToCache();
        this.emit('privacy:synced', { count: response.data.settings.length });
      }
    } catch (error) {
      console.error('Privacy sync failed:', error);
    }
  }

  /**
   * Clear all settings
   */
  private async clearSettings(): Promise<void> {
    this.privacySettings.clear();
    this.auditLog = [];
    await AsyncStorage.removeItem(this.CACHE_KEY);

    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
  }

  /**
   * Increment version number
   */
  private incrementVersion(version: string): string {
    const parts = version.split('.');
    const patch = parseInt(parts[2] || '0') + 1;
    return `${parts[0]}.${parts[1]}.${patch}`;
  }

  /**
   * Cleanup on destroy
   */
  destroy(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
    this.removeAllListeners();
  }
}

// Export singleton instance
export const privacyManager = PrivacyManager.getInstance();
export default privacyManager;