/**
 * Privacy Control Service
 * Manages granular family data sharing permissions with PDPA compliance
 * Supports Malaysian cultural family hierarchies and privacy expectations
 */

import { Service, Inject } from 'typedi';
import { Logger } from 'winston';
import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { DatabaseService } from '../database/database.service';
import { AuditService } from '../audit/audit.service';
import { CulturalService } from '../cultural/cultural.service';
import { PDPAComplianceService } from '../pdpa-compliance.service';

export interface PrivacySettings {
  id: string;
  userId: string;
  familyId: string;
  dataCategories: DataCategoryPermission[];
  familyMemberPermissions: FamilyMemberPermission[];
  culturalPreferences: CulturalPrivacyPreferences;
  pdpaConsent: PDPAConsent;
  createdAt: Date;
  updatedAt: Date;
}

export interface DataCategoryPermission {
  category: DataCategory;
  visibility: VisibilityLevel;
  shareWithHealthcareProviders: boolean;
  shareWithFamilyMembers: string[]; // Specific member IDs
  culturalRestrictions?: CulturalRestriction[];
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
  | 'cultural_preferences';

export type VisibilityLevel =
  | 'private'
  | 'family_only'
  | 'caregivers_only'
  | 'healthcare_providers'
  | 'public';

export interface FamilyMemberPermission {
  memberId: string;
  relationship: MalaysianFamilyRelationship;
  permissions: Permission[];
  culturalRole?: CulturalFamilyRole;
  validUntil?: Date;
  restrictions?: PermissionRestriction[];
}

export type MalaysianFamilyRelationship =
  | 'spouse'
  | 'parent'
  | 'child'
  | 'grandparent'
  | 'grandchild'
  | 'sibling'
  | 'elder_sibling' // Abang/Kakak
  | 'younger_sibling' // Adik
  | 'aunt_uncle' // Mak Cik/Pak Cik
  | 'cousin'
  | 'in_law'
  | 'extended_family';

export type CulturalFamilyRole =
  | 'family_head' // Ketua Keluarga
  | 'elder' // Respected elder with advisory role
  | 'primary_caregiver'
  | 'decision_maker'
  | 'support_member';

export interface Permission {
  resource: string;
  actions: ('view' | 'edit' | 'share' | 'delete')[];
  conditions?: PermissionCondition[];
  culturalOverride?: boolean; // For emergency situations
}

export interface PermissionCondition {
  type: 'time_based' | 'location_based' | 'emergency' | 'cultural_event';
  parameters: Record<string, any>;
}

export interface CulturalPrivacyPreferences {
  respectElderHierarchy: boolean;
  genderBasedRestrictions?: GenderRestriction[];
  religiousConsiderations?: ReligiousPrivacyConsideration[];
  collectiveDecisionMaking: boolean;
  extendedFamilyInclusion: boolean;
}

export interface GenderRestriction {
  dataCategory: DataCategory;
  restrictedGender?: 'male' | 'female';
  exceptions?: string[]; // Member IDs exempt from restriction
}

export interface ReligiousPrivacyConsideration {
  type: 'islamic' | 'buddhist' | 'hindu' | 'christian' | 'other';
  restrictions: string[];
  specialHandling?: string;
}

export interface PDPAConsent {
  consentId: string;
  consentDate: Date;
  consentVersion: string;
  purposes: ConsentPurpose[];
  dataRetentionPeriod: number; // Days
  withdrawalRights: WithdrawalRights;
  thirdPartySharing?: ThirdPartyConsent[];
  lastReviewDate: Date;
  nextReviewDate: Date;
}

export interface ConsentPurpose {
  purpose: string;
  description: string;
  isRequired: boolean;
  consented: boolean;
  consentDate?: Date;
}

export interface WithdrawalRights {
  canWithdrawConsent: boolean;
  withdrawalProcess: string;
  dataPortability: boolean;
  deletionRights: boolean;
}

export interface ThirdPartyConsent {
  organizationId: string;
  organizationName: string;
  purpose: string;
  consentGiven: boolean;
  validUntil: Date;
}

export interface CulturalRestriction {
  type: 'age_based' | 'relationship_based' | 'religious' | 'custom';
  description: string;
  appliesTo: string[]; // Member IDs or roles
}

export interface PermissionRestriction {
  type: 'temporal' | 'conditional' | 'cultural';
  details: Record<string, any>;
}

export interface PrivacyAuditEntry {
  id: string;
  userId: string;
  familyId: string;
  action: PrivacyAction;
  resourceType: DataCategory;
  resourceId?: string;
  accessorId: string;
  accessorRelationship?: MalaysianFamilyRelationship;
  timestamp: Date;
  ipAddress?: string;
  userAgent?: string;
  justification?: string;
  culturalContext?: string;
  pdpaCompliant: boolean;
}

export type PrivacyAction =
  | 'data_accessed'
  | 'data_shared'
  | 'permission_granted'
  | 'permission_revoked'
  | 'consent_given'
  | 'consent_withdrawn'
  | 'privacy_settings_updated'
  | 'emergency_override'
  | 'cultural_exception';

@Service()
export class PrivacyControlService extends EventEmitter {
  private readonly PRIVACY_UPDATE_TIMEOUT = 300; // 300ms performance target
  private readonly AUDIT_GENERATION_TIMEOUT = 100; // 100ms performance target
  private privacyCache: Map<string, PrivacySettings> = new Map();

  constructor(
    @Inject('logger') private logger: Logger,
    @Inject() private db: DatabaseService,
    @Inject() private audit: AuditService,
    @Inject() private cultural: CulturalService,
    @Inject() private pdpa: PDPAComplianceService
  ) {
    super();
    this.initializePrivacyCache();
    this.setupEventHandlers();
  }

  /**
   * Initialize privacy settings cache for performance optimization
   */
  private async initializePrivacyCache(): Promise<void> {
    try {
      const settings = await this.db.query(
        'SELECT * FROM privacy_settings WHERE active = true'
      );

      settings.forEach((setting: any) => {
        this.privacyCache.set(
          `${setting.user_id}:${setting.family_id}`,
          this.parsePrivacySettings(setting)
        );
      });

      this.logger.info(`Privacy cache initialized with ${this.privacyCache.size} entries`);
    } catch (error) {
      this.logger.error('Failed to initialize privacy cache', error);
    }
  }

  /**
   * Setup event handlers for real-time privacy updates
   */
  private setupEventHandlers(): void {
    this.on('privacy:updated', async (data) => {
      await this.handlePrivacyUpdate(data);
    });

    this.on('consent:withdrawn', async (data) => {
      await this.handleConsentWithdrawal(data);
    });

    this.on('emergency:override', async (data) => {
      await this.handleEmergencyOverride(data);
    });

    this.on('family:member_added', async (data) => {
      await this.handleFamilyMemberAdded(data);
    });

    this.on('pdpa:review_required', async (data) => {
      await this.handlePDPAReview(data);
    });
  }

  /**
   * Create default privacy settings for a new family member
   */
  async createDefaultPrivacySettings(
    userId: string,
    familyId: string,
    relationship: MalaysianFamilyRelationship,
    culturalProfile?: any
  ): Promise<PrivacySettings> {
    const startTime = Date.now();

    try {
      // Get cultural defaults based on Malaysian family patterns
      const culturalDefaults = await this.cultural.getFamilyPrivacyDefaults(
        relationship,
        culturalProfile
      );

      const settings: PrivacySettings = {
        id: uuidv4(),
        userId,
        familyId,
        dataCategories: this.getDefaultDataPermissions(relationship, culturalDefaults),
        familyMemberPermissions: [],
        culturalPreferences: this.getDefaultCulturalPreferences(culturalDefaults),
        pdpaConsent: await this.createDefaultPDPAConsent(userId),
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Save to database
      await this.savePrivacySettings(settings);

      // Cache for performance
      this.privacyCache.set(`${userId}:${familyId}`, settings);

      // Audit creation
      await this.auditPrivacyAction({
        userId,
        familyId,
        action: 'privacy_settings_updated',
        resourceType: 'medications',
        timestamp: new Date(),
        pdpaCompliant: true
      });

      const elapsed = Date.now() - startTime;
      if (elapsed > this.PRIVACY_UPDATE_TIMEOUT) {
        this.logger.warn(`Privacy settings creation took ${elapsed}ms, exceeding target`);
      }

      this.emit('privacy:created', settings);
      return settings;

    } catch (error) {
      this.logger.error('Failed to create default privacy settings', error);
      throw error;
    }
  }

  /**
   * Update privacy settings with PDPA compliance
   */
  async updatePrivacySettings(
    userId: string,
    familyId: string,
    updates: Partial<PrivacySettings>,
    justification?: string
  ): Promise<PrivacySettings> {
    const startTime = Date.now();

    try {
      // Validate PDPA compliance
      await this.pdpa.validatePrivacyUpdate(userId, updates);

      // Get current settings
      const current = await this.getPrivacySettings(userId, familyId);
      if (!current) {
        throw new Error('Privacy settings not found');
      }

      // Apply cultural validation
      const culturallyValidated = await this.cultural.validatePrivacyChanges(
        current,
        updates,
        current.culturalPreferences
      );

      // Merge updates
      const updated: PrivacySettings = {
        ...current,
        ...culturallyValidated,
        updatedAt: new Date()
      };

      // Save to database
      await this.savePrivacySettings(updated);

      // Update cache
      this.privacyCache.set(`${userId}:${familyId}`, updated);

      // Audit the change
      await this.auditPrivacyAction({
        userId,
        familyId,
        action: 'privacy_settings_updated',
        resourceType: 'medications',
        timestamp: new Date(),
        justification,
        pdpaCompliant: true
      });

      const elapsed = Date.now() - startTime;
      if (elapsed > this.PRIVACY_UPDATE_TIMEOUT) {
        this.logger.warn(`Privacy settings update took ${elapsed}ms, exceeding target`);
      }

      this.emit('privacy:updated', updated);
      return updated;

    } catch (error) {
      this.logger.error('Failed to update privacy settings', error);
      throw error;
    }
  }

  /**
   * Check if a family member has permission to access specific data
   */
  async checkDataAccess(
    requestorId: string,
    targetUserId: string,
    familyId: string,
    dataCategory: DataCategory,
    context?: AccessContext
  ): Promise<AccessDecision> {
    try {
      // Get privacy settings for target user
      const settings = await this.getPrivacySettings(targetUserId, familyId);
      if (!settings) {
        return { allowed: false, reason: 'No privacy settings found' };
      }

      // Check emergency override
      if (context?.isEmergency) {
        return await this.handleEmergencyAccess(
          requestorId,
          targetUserId,
          dataCategory,
          context
        );
      }

      // Find category permissions
      const categoryPerm = settings.dataCategories.find(
        dc => dc.category === dataCategory
      );

      if (!categoryPerm) {
        return { allowed: false, reason: 'Category not configured' };
      }

      // Check visibility level
      const visibilityCheck = await this.checkVisibilityLevel(
        requestorId,
        targetUserId,
        familyId,
        categoryPerm.visibility
      );

      if (!visibilityCheck.allowed) {
        return visibilityCheck;
      }

      // Check family member specific permissions
      const memberPerm = settings.familyMemberPermissions.find(
        fmp => fmp.memberId === requestorId
      );

      if (memberPerm) {
        // Apply cultural role considerations
        const culturalCheck = await this.applyCulturalRolePermissions(
          memberPerm,
          dataCategory,
          settings.culturalPreferences
        );

        if (!culturalCheck.allowed) {
          return culturalCheck;
        }

        // Check specific permissions
        const hasPermission = this.checkMemberPermissions(
          memberPerm,
          dataCategory,
          'view',
          context
        );

        if (!hasPermission) {
          return { allowed: false, reason: 'Insufficient permissions' };
        }
      }

      // Audit successful access
      await this.auditDataAccess(
        requestorId,
        targetUserId,
        familyId,
        dataCategory,
        context
      );

      return {
        allowed: true,
        conditions: this.getAccessConditions(memberPerm, context)
      };

    } catch (error) {
      this.logger.error('Failed to check data access', error);
      return { allowed: false, reason: 'Access check failed' };
    }
  }

  /**
   * Grant permission to a family member with cultural validation
   */
  async grantPermission(
    grantorId: string,
    familyId: string,
    memberId: string,
    permission: Permission,
    relationship: MalaysianFamilyRelationship,
    culturalRole?: CulturalFamilyRole
  ): Promise<void> {
    const startTime = Date.now();

    try {
      // Validate grantor has authority
      const hasAuthority = await this.validateGrantorAuthority(
        grantorId,
        familyId,
        permission,
        relationship
      );

      if (!hasAuthority) {
        throw new Error('Insufficient authority to grant permission');
      }

      // Apply cultural validation
      const culturallyApproved = await this.cultural.validatePermissionGrant(
        relationship,
        culturalRole,
        permission
      );

      if (!culturallyApproved) {
        throw new Error('Permission grant violates cultural norms');
      }

      // Get current settings
      const settings = await this.getPrivacySettings(grantorId, familyId);
      if (!settings) {
        throw new Error('Privacy settings not found');
      }

      // Add or update member permission
      const existingIndex = settings.familyMemberPermissions.findIndex(
        fmp => fmp.memberId === memberId
      );

      const memberPermission: FamilyMemberPermission = {
        memberId,
        relationship,
        permissions: [permission],
        culturalRole,
        validUntil: this.calculatePermissionExpiry(permission)
      };

      if (existingIndex >= 0) {
        settings.familyMemberPermissions[existingIndex].permissions.push(permission);
      } else {
        settings.familyMemberPermissions.push(memberPermission);
      }

      // Save updated settings
      await this.savePrivacySettings(settings);

      // Audit the grant
      await this.auditPrivacyAction({
        userId: grantorId,
        familyId,
        action: 'permission_granted',
        resourceType: 'medications',
        accessorId: memberId,
        accessorRelationship: relationship,
        timestamp: new Date(),
        culturalContext: culturalRole,
        pdpaCompliant: true
      });

      const elapsed = Date.now() - startTime;
      if (elapsed > this.PRIVACY_UPDATE_TIMEOUT) {
        this.logger.warn(`Permission grant took ${elapsed}ms, exceeding target`);
      }

      this.emit('permission:granted', {
        grantorId,
        memberId,
        permission,
        relationship
      });

    } catch (error) {
      this.logger.error('Failed to grant permission', error);
      throw error;
    }
  }

  /**
   * Revoke permission from a family member
   */
  async revokePermission(
    revokerId: string,
    familyId: string,
    memberId: string,
    resource: string,
    reason?: string
  ): Promise<void> {
    try {
      // Get current settings
      const settings = await this.getPrivacySettings(revokerId, familyId);
      if (!settings) {
        throw new Error('Privacy settings not found');
      }

      // Find and update member permissions
      const memberPermIndex = settings.familyMemberPermissions.findIndex(
        fmp => fmp.memberId === memberId
      );

      if (memberPermIndex >= 0) {
        const memberPerms = settings.familyMemberPermissions[memberPermIndex];
        memberPerms.permissions = memberPerms.permissions.filter(
          p => p.resource !== resource
        );

        // Remove member if no permissions left
        if (memberPerms.permissions.length === 0) {
          settings.familyMemberPermissions.splice(memberPermIndex, 1);
        }
      }

      // Save updated settings
      await this.savePrivacySettings(settings);

      // Audit the revocation
      await this.auditPrivacyAction({
        userId: revokerId,
        familyId,
        action: 'permission_revoked',
        resourceType: 'medications',
        accessorId: memberId,
        timestamp: new Date(),
        justification: reason,
        pdpaCompliant: true
      });

      this.emit('permission:revoked', {
        revokerId,
        memberId,
        resource,
        reason
      });

    } catch (error) {
      this.logger.error('Failed to revoke permission', error);
      throw error;
    }
  }

  /**
   * Handle PDPA consent management
   */
  async updatePDPAConsent(
    userId: string,
    familyId: string,
    consentUpdates: Partial<PDPAConsent>
  ): Promise<PDPAConsent> {
    try {
      // Validate consent updates with PDPA service
      const validatedConsent = await this.pdpa.validateConsent(
        userId,
        consentUpdates
      );

      // Get current settings
      const settings = await this.getPrivacySettings(userId, familyId);
      if (!settings) {
        throw new Error('Privacy settings not found');
      }

      // Update consent
      settings.pdpaConsent = {
        ...settings.pdpaConsent,
        ...validatedConsent,
        consentDate: new Date(),
        lastReviewDate: new Date(),
        nextReviewDate: this.calculateNextReviewDate()
      };

      // Save updated settings
      await this.savePrivacySettings(settings);

      // Audit consent update
      await this.auditPrivacyAction({
        userId,
        familyId,
        action: 'consent_given',
        resourceType: 'medications',
        timestamp: new Date(),
        pdpaCompliant: true
      });

      this.emit('consent:updated', settings.pdpaConsent);
      return settings.pdpaConsent;

    } catch (error) {
      this.logger.error('Failed to update PDPA consent', error);
      throw error;
    }
  }

  /**
   * Generate privacy audit report for PDPA compliance
   */
  async generatePrivacyAuditReport(
    userId: string,
    familyId: string,
    startDate: Date,
    endDate: Date
  ): Promise<PrivacyAuditReport> {
    const startTime = Date.now();

    try {
      // Fetch audit entries
      const auditEntries = await this.db.query(
        `SELECT * FROM privacy_audit_log
         WHERE user_id = ? AND family_id = ?
         AND timestamp BETWEEN ? AND ?
         ORDER BY timestamp DESC`,
        [userId, familyId, startDate, endDate]
      );

      // Categorize entries
      const categorizedEntries = this.categorizeAuditEntries(auditEntries);

      // Generate statistics
      const statistics = this.calculateAuditStatistics(categorizedEntries);

      // Check PDPA compliance
      const complianceStatus = await this.pdpa.assessComplianceStatus(
        userId,
        categorizedEntries
      );

      const report: PrivacyAuditReport = {
        reportId: uuidv4(),
        userId,
        familyId,
        period: { startDate, endDate },
        entries: categorizedEntries,
        statistics,
        complianceStatus,
        generatedAt: new Date(),
        recommendations: this.generatePrivacyRecommendations(statistics, complianceStatus)
      };

      const elapsed = Date.now() - startTime;
      if (elapsed > this.AUDIT_GENERATION_TIMEOUT) {
        this.logger.warn(`Audit report generation took ${elapsed}ms, exceeding target`);
      }

      return report;

    } catch (error) {
      this.logger.error('Failed to generate privacy audit report', error);
      throw error;
    }
  }

  // Private helper methods

  private async getPrivacySettings(
    userId: string,
    familyId: string
  ): Promise<PrivacySettings | null> {
    // Check cache first
    const cacheKey = `${userId}:${familyId}`;
    if (this.privacyCache.has(cacheKey)) {
      return this.privacyCache.get(cacheKey)!;
    }

    // Fetch from database
    const result = await this.db.query(
      'SELECT * FROM privacy_settings WHERE user_id = ? AND family_id = ?',
      [userId, familyId]
    );

    if (result.length === 0) {
      return null;
    }

    const settings = this.parsePrivacySettings(result[0]);
    this.privacyCache.set(cacheKey, settings);
    return settings;
  }

  private async savePrivacySettings(settings: PrivacySettings): Promise<void> {
    await this.db.query(
      `INSERT OR REPLACE INTO privacy_settings
       (id, user_id, family_id, data_categories, family_member_permissions,
        cultural_preferences, pdpa_consent, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        settings.id,
        settings.userId,
        settings.familyId,
        JSON.stringify(settings.dataCategories),
        JSON.stringify(settings.familyMemberPermissions),
        JSON.stringify(settings.culturalPreferences),
        JSON.stringify(settings.pdpaConsent),
        settings.createdAt,
        settings.updatedAt
      ]
    );
  }

  private parsePrivacySettings(row: any): PrivacySettings {
    return {
      id: row.id,
      userId: row.user_id,
      familyId: row.family_id,
      dataCategories: JSON.parse(row.data_categories),
      familyMemberPermissions: JSON.parse(row.family_member_permissions),
      culturalPreferences: JSON.parse(row.cultural_preferences),
      pdpaConsent: JSON.parse(row.pdpa_consent),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  private getDefaultDataPermissions(
    relationship: MalaysianFamilyRelationship,
    culturalDefaults: any
  ): DataCategoryPermission[] {
    // Define default permissions based on relationship and cultural norms
    const defaultCategories: DataCategoryPermission[] = [
      {
        category: 'medications',
        visibility: this.getDefaultVisibility(relationship),
        shareWithHealthcareProviders: true,
        shareWithFamilyMembers: [],
        culturalRestrictions: culturalDefaults.restrictions
      },
      {
        category: 'adherence_history',
        visibility: relationship === 'spouse' || relationship === 'parent'
          ? 'family_only'
          : 'private',
        shareWithHealthcareProviders: true,
        shareWithFamilyMembers: []
      },
      {
        category: 'health_metrics',
        visibility: 'caregivers_only',
        shareWithHealthcareProviders: true,
        shareWithFamilyMembers: []
      },
      {
        category: 'emergency_contacts',
        visibility: 'family_only',
        shareWithHealthcareProviders: true,
        shareWithFamilyMembers: []
      }
    ];

    return defaultCategories;
  }

  private getDefaultVisibility(relationship: MalaysianFamilyRelationship): VisibilityLevel {
    // Malaysian cultural norms for default visibility
    switch (relationship) {
      case 'spouse':
      case 'parent':
      case 'child':
        return 'family_only';
      case 'grandparent':
      case 'elder_sibling':
        return 'caregivers_only';
      default:
        return 'private';
    }
  }

  private getDefaultCulturalPreferences(culturalDefaults: any): CulturalPrivacyPreferences {
    return {
      respectElderHierarchy: true, // Malaysian culture respects elders
      genderBasedRestrictions: culturalDefaults.genderRestrictions,
      religiousConsiderations: culturalDefaults.religiousConsiderations,
      collectiveDecisionMaking: true, // Common in Malaysian families
      extendedFamilyInclusion: true // Extended family important in Malaysia
    };
  }

  private async createDefaultPDPAConsent(userId: string): Promise<PDPAConsent> {
    return {
      consentId: uuidv4(),
      consentDate: new Date(),
      consentVersion: '1.0',
      purposes: [
        {
          purpose: 'medication_management',
          description: 'Managing and tracking medication adherence',
          isRequired: true,
          consented: true,
          consentDate: new Date()
        },
        {
          purpose: 'family_sharing',
          description: 'Sharing health information with family members',
          isRequired: false,
          consented: true,
          consentDate: new Date()
        },
        {
          purpose: 'healthcare_coordination',
          description: 'Coordinating with healthcare providers',
          isRequired: false,
          consented: true,
          consentDate: new Date()
        }
      ],
      dataRetentionPeriod: 365, // 1 year default
      withdrawalRights: {
        canWithdrawConsent: true,
        withdrawalProcess: 'Contact support or use privacy settings',
        dataPortability: true,
        deletionRights: true
      },
      lastReviewDate: new Date(),
      nextReviewDate: this.calculateNextReviewDate()
    };
  }

  private calculateNextReviewDate(): Date {
    const date = new Date();
    date.setMonth(date.getMonth() + 6); // Review every 6 months
    return date;
  }

  private calculatePermissionExpiry(permission: Permission): Date | undefined {
    // Set default expiry based on permission type
    if (permission.conditions?.some(c => c.type === 'time_based')) {
      const timeCondition = permission.conditions.find(c => c.type === 'time_based');
      return new Date(timeCondition!.parameters.expiryDate);
    }

    // Default 1 year expiry
    const expiry = new Date();
    expiry.setFullYear(expiry.getFullYear() + 1);
    return expiry;
  }

  private async checkVisibilityLevel(
    requestorId: string,
    targetUserId: string,
    familyId: string,
    visibility: VisibilityLevel
  ): Promise<AccessDecision> {
    // Implementation would check requestor's role against visibility level
    // This is a simplified version
    return { allowed: true };
  }

  private async applyCulturalRolePermissions(
    memberPerm: FamilyMemberPermission,
    dataCategory: DataCategory,
    culturalPrefs: CulturalPrivacyPreferences
  ): Promise<AccessDecision> {
    // Apply cultural role-based access rules
    if (culturalPrefs.respectElderHierarchy && memberPerm.culturalRole === 'elder') {
      // Elders may have special access in Malaysian culture
      return { allowed: true, reason: 'Elder privilege' };
    }

    return { allowed: true };
  }

  private checkMemberPermissions(
    memberPerm: FamilyMemberPermission,
    dataCategory: DataCategory,
    action: string,
    context?: AccessContext
  ): boolean {
    // Check if member has required permission
    const relevantPerms = memberPerm.permissions.filter(
      p => p.resource === dataCategory || p.resource === '*'
    );

    for (const perm of relevantPerms) {
      if (perm.actions.includes(action as any)) {
        // Check conditions if any
        if (perm.conditions) {
          return this.evaluateConditions(perm.conditions, context);
        }
        return true;
      }
    }

    return false;
  }

  private evaluateConditions(
    conditions: PermissionCondition[],
    context?: AccessContext
  ): boolean {
    // Evaluate all conditions
    for (const condition of conditions) {
      switch (condition.type) {
        case 'time_based':
          if (!this.evaluateTimeCondition(condition.parameters)) {
            return false;
          }
          break;
        case 'emergency':
          if (!context?.isEmergency) {
            return false;
          }
          break;
        // Add more condition evaluations as needed
      }
    }
    return true;
  }

  private evaluateTimeCondition(parameters: Record<string, any>): boolean {
    const now = new Date();
    if (parameters.startTime && new Date(parameters.startTime) > now) {
      return false;
    }
    if (parameters.endTime && new Date(parameters.endTime) < now) {
      return false;
    }
    return true;
  }

  private async handleEmergencyAccess(
    requestorId: string,
    targetUserId: string,
    dataCategory: DataCategory,
    context: AccessContext
  ): Promise<AccessDecision> {
    // Log emergency access
    await this.auditPrivacyAction({
      userId: targetUserId,
      familyId: context.familyId!,
      action: 'emergency_override',
      resourceType: dataCategory,
      accessorId: requestorId,
      timestamp: new Date(),
      justification: context.emergencyReason,
      pdpaCompliant: true
    });

    return {
      allowed: true,
      reason: 'Emergency access granted',
      conditions: ['Emergency access logged for audit']
    };
  }

  private getAccessConditions(
    memberPerm?: FamilyMemberPermission,
    context?: AccessContext
  ): string[] {
    const conditions: string[] = [];

    if (memberPerm?.validUntil) {
      conditions.push(`Valid until ${memberPerm.validUntil.toISOString()}`);
    }

    if (context?.isEmergency) {
      conditions.push('Emergency access - logged for audit');
    }

    return conditions;
  }

  private async auditDataAccess(
    requestorId: string,
    targetUserId: string,
    familyId: string,
    dataCategory: DataCategory,
    context?: AccessContext
  ): Promise<void> {
    const entry: PrivacyAuditEntry = {
      id: uuidv4(),
      userId: targetUserId,
      familyId,
      action: 'data_accessed',
      resourceType: dataCategory,
      accessorId: requestorId,
      timestamp: new Date(),
      ipAddress: context?.ipAddress,
      userAgent: context?.userAgent,
      pdpaCompliant: true
    };

    await this.audit.logPrivacyAction(entry);
  }

  private async auditPrivacyAction(entry: Partial<PrivacyAuditEntry>): Promise<void> {
    const fullEntry: PrivacyAuditEntry = {
      id: uuidv4(),
      timestamp: new Date(),
      pdpaCompliant: true,
      ...entry
    } as PrivacyAuditEntry;

    await this.audit.logPrivacyAction(fullEntry);
  }

  private async validateGrantorAuthority(
    grantorId: string,
    familyId: string,
    permission: Permission,
    relationship: MalaysianFamilyRelationship
  ): Promise<boolean> {
    // Check if grantor has authority to grant permissions
    // This would involve checking their role and existing permissions
    return true; // Simplified for now
  }

  private categorizeAuditEntries(entries: any[]): CategorizedAuditEntries {
    // Categorize audit entries by type
    return {
      dataAccess: entries.filter(e => e.action === 'data_accessed'),
      permissionChanges: entries.filter(e =>
        e.action === 'permission_granted' || e.action === 'permission_revoked'
      ),
      consentUpdates: entries.filter(e =>
        e.action === 'consent_given' || e.action === 'consent_withdrawn'
      ),
      emergencyAccess: entries.filter(e => e.action === 'emergency_override')
    };
  }

  private calculateAuditStatistics(entries: CategorizedAuditEntries): AuditStatistics {
    return {
      totalAccesses: entries.dataAccess.length,
      uniqueAccessors: new Set(entries.dataAccess.map(e => e.accessor_id)).size,
      permissionGrants: entries.permissionChanges.filter(e => e.action === 'permission_granted').length,
      permissionRevocations: entries.permissionChanges.filter(e => e.action === 'permission_revoked').length,
      emergencyOverrides: entries.emergencyAccess.length
    };
  }

  private generatePrivacyRecommendations(
    statistics: AuditStatistics,
    complianceStatus: any
  ): string[] {
    const recommendations: string[] = [];

    if (statistics.emergencyOverrides > 5) {
      recommendations.push('Review emergency access patterns - high number of overrides detected');
    }

    if (!complianceStatus.fullyCompliant) {
      recommendations.push('Update privacy settings to ensure full PDPA compliance');
    }

    return recommendations;
  }

  private async handlePrivacyUpdate(data: any): Promise<void> {
    // Handle real-time privacy updates
    this.logger.info('Privacy settings updated', data);
  }

  private async handleConsentWithdrawal(data: any): Promise<void> {
    // Handle consent withdrawal
    this.logger.info('Consent withdrawn', data);
  }

  private async handleEmergencyOverride(data: any): Promise<void> {
    // Handle emergency override
    this.logger.warn('Emergency override activated', data);

    // Audit the emergency override
    await this.auditPrivacyAction({
      userId: data.userId,
      familyId: data.familyId,
      action: 'emergency_override',
      resourceType: data.resourceType,
      accessorId: data.accessorId,
      timestamp: new Date(),
      justification: data.emergencyReason,
      pdpaCompliant: true // Emergency overrides are compliant under PDPA for critical situations
    });
  }

  /**
   * Handle new family member addition - create default privacy settings
   */
  private async handleFamilyMemberAdded(data: {
    userId: string;
    familyId: string;
    relationship: MalaysianFamilyRelationship;
    culturalProfile?: any;
  }): Promise<void> {
    try {
      this.logger.info('Creating privacy settings for new family member', data);

      await this.createDefaultPrivacySettings(
        data.userId,
        data.familyId,
        data.relationship,
        data.culturalProfile
      );

      // Notify family administrators about new member privacy settings
      this.emit('privacy:member_initialized', {
        userId: data.userId,
        familyId: data.familyId,
        timestamp: new Date()
      });
    } catch (error) {
      this.logger.error('Failed to create privacy settings for new member', error);
      throw error;
    }
  }

  /**
   * Handle PDPA consent review requirements
   */
  private async handlePDPAReview(data: {
    userId: string;
    familyId: string;
    reviewType: 'periodic' | 'regulatory_change' | 'user_requested';
  }): Promise<void> {
    try {
      this.logger.info('PDPA review required', data);

      const settings = await this.getPrivacySettings(data.userId, data.familyId);
      if (!settings) {
        throw new Error('Privacy settings not found');
      }

      // Check if review is needed based on dates
      const nextReviewDate = new Date(settings.pdpaConsent.nextReviewDate);
      const now = new Date();

      if (now >= nextReviewDate || data.reviewType !== 'periodic') {
        // Update review dates
        settings.pdpaConsent.lastReviewDate = now;
        settings.pdpaConsent.nextReviewDate = new Date(
          now.getTime() + (90 * 24 * 60 * 60 * 1000) // 90 days
        );

        await this.updatePrivacySettings(data.userId, data.familyId, settings);

        // Notify user about review requirement
        this.emit('privacy:review_needed', {
          userId: data.userId,
          familyId: data.familyId,
          reviewType: data.reviewType,
          deadline: settings.pdpaConsent.nextReviewDate
        });
      }
    } catch (error) {
      this.logger.error('Failed to handle PDPA review', error);
      throw error;
    }
  }

  /**
   * Validate family member permissions based on cultural hierarchy
   */
  async validateCulturalPermissions(
    requestorId: string,
    targetUserId: string,
    familyId: string,
    requestedAction: string
  ): Promise<AccessDecision> {
    try {
      // Get family relationships and cultural roles
      const familyData = await this.db.query(
        `SELECT fm1.role as requestor_role, fm1.cultural_role as requestor_cultural_role,
                fm2.role as target_role, fm2.cultural_role as target_cultural_role
         FROM family_members fm1
         JOIN family_members fm2 ON fm2.family_id = fm1.family_id
         WHERE fm1.user_id = ? AND fm2.user_id = ? AND fm1.family_id = ?`,
        [requestorId, targetUserId, familyId]
      );

      if (!familyData || familyData.length === 0) {
        return {
          allowed: false,
          reason: 'Family relationship not found'
        };
      }

      const relationship = familyData[0];

      // Apply Malaysian cultural hierarchy rules
      const culturalValidation = await this.cultural.validateFamilyHierarchy(
        relationship.requestor_cultural_role,
        relationship.target_cultural_role,
        requestedAction
      );

      if (!culturalValidation.allowed) {
        return {
          allowed: false,
          reason: culturalValidation.reason,
          conditions: culturalValidation.conditions
        };
      }

      // Check PDPA compliance
      const pdpaCheck = await this.pdpa.validateDataAccess(
        requestorId,
        targetUserId,
        requestedAction
      );

      return {
        allowed: culturalValidation.allowed && pdpaCheck.compliant,
        reason: pdpaCheck.compliant ? undefined : 'PDPA compliance check failed',
        conditions: [...(culturalValidation.conditions || []), ...(pdpaCheck.conditions || [])]
      };
    } catch (error) {
      this.logger.error('Cultural permission validation failed', error);
      return {
        allowed: false,
        reason: 'Validation error occurred'
      };
    }
  }

  /**
   * Generate PDPA compliance report for family data sharing
   */
  async generatePDPAComplianceReport(
    familyId: string,
    startDate: Date,
    endDate: Date
  ): Promise<PDPAComplianceReport> {
    const reportId = uuidv4();

    try {
      // Gather all privacy settings for family
      const familyPrivacyData = await this.db.query(
        `SELECT * FROM privacy_settings
         WHERE family_id = ? AND updated_at BETWEEN ? AND ?`,
        [familyId, startDate, endDate]
      );

      // Gather audit entries
      const auditEntries = await this.db.query(
        `SELECT * FROM privacy_audit_log
         WHERE family_id = ? AND timestamp BETWEEN ? AND ?`,
        [familyId, startDate, endDate]
      );

      // Analyze compliance
      const complianceAnalysis = this.analyzePDPACompliance(familyPrivacyData, auditEntries);

      // Generate recommendations
      const recommendations = this.generateComplianceRecommendations(complianceAnalysis);

      const report: PDPAComplianceReport = {
        reportId,
        familyId,
        period: { startDate, endDate },
        complianceScore: complianceAnalysis.score,
        areas: complianceAnalysis.areas,
        violations: complianceAnalysis.violations,
        recommendations,
        generatedAt: new Date(),
        nextReviewDate: new Date(Date.now() + (30 * 24 * 60 * 60 * 1000)) // 30 days
      };

      // Store report
      await this.db.query(
        `INSERT INTO pdpa_compliance_reports
         (id, family_id, report_data, generated_at)
         VALUES (?, ?, ?, ?)`,
        [reportId, familyId, JSON.stringify(report), new Date()]
      );

      return report;
    } catch (error) {
      this.logger.error('Failed to generate PDPA compliance report', error);
      throw error;
    }
  }

  private analyzePDPACompliance(privacyData: any[], auditData: any[]): ComplianceAnalysis {
    const analysis: ComplianceAnalysis = {
      score: 0,
      areas: [],
      violations: []
    };

    // Check consent management
    const consentCompliance = this.checkConsentCompliance(privacyData);
    analysis.areas.push(consentCompliance);

    // Check data minimization
    const dataMinimization = this.checkDataMinimization(auditData);
    analysis.areas.push(dataMinimization);

    // Check purpose limitation
    const purposeLimitation = this.checkPurposeLimitation(auditData);
    analysis.areas.push(purposeLimitation);

    // Check data retention
    const dataRetention = this.checkDataRetention(privacyData);
    analysis.areas.push(dataRetention);

    // Calculate overall score
    analysis.score = analysis.areas.reduce((sum, area) => sum + area.score, 0) / analysis.areas.length;

    // Identify violations
    analysis.violations = analysis.areas
      .filter(area => area.score < 70)
      .map(area => ({
        area: area.name,
        severity: area.score < 50 ? 'high' : 'medium',
        description: area.issues.join('; ')
      }));

    return analysis;
  }

  private checkConsentCompliance(privacyData: any[]): ComplianceArea {
    const area: ComplianceArea = {
      name: 'Consent Management',
      score: 100,
      issues: []
    };

    privacyData.forEach(setting => {
      const consent = JSON.parse(setting.pdpa_consent || '{}');

      // Check if consent is up to date
      if (!consent.consentDate || new Date(consent.consentDate) < new Date(Date.now() - (365 * 24 * 60 * 60 * 1000))) {
        area.score -= 10;
        area.issues.push('Consent older than 1 year needs renewal');
      }

      // Check if all required purposes are consented
      const purposes = consent.purposes || [];
      const requiredNotConsented = purposes.filter((p: any) => p.isRequired && !p.consented);
      if (requiredNotConsented.length > 0) {
        area.score -= 20;
        area.issues.push('Required purposes not consented');
      }
    });

    return area;
  }

  private checkDataMinimization(auditData: any[]): ComplianceArea {
    const area: ComplianceArea = {
      name: 'Data Minimization',
      score: 100,
      issues: []
    };

    // Check for excessive data access patterns
    const accessByUser = new Map<string, number>();
    auditData.forEach(entry => {
      const count = accessByUser.get(entry.accessor_id) || 0;
      accessByUser.set(entry.accessor_id, count + 1);
    });

    accessByUser.forEach((count, userId) => {
      if (count > 100) {
        area.score -= 5;
        area.issues.push(`User ${userId} has excessive data access (${count} accesses)`);
      }
    });

    return area;
  }

  private checkPurposeLimitation(auditData: any[]): ComplianceArea {
    const area: ComplianceArea = {
      name: 'Purpose Limitation',
      score: 100,
      issues: []
    };

    // Check if data is accessed only for stated purposes
    const unauthorizedAccess = auditData.filter(entry =>
      !entry.justification && entry.action === 'data_accessed'
    );

    if (unauthorizedAccess.length > 0) {
      area.score -= (unauthorizedAccess.length * 2);
      area.issues.push(`${unauthorizedAccess.length} data accesses without justification`);
    }

    return area;
  }

  private checkDataRetention(privacyData: any[]): ComplianceArea {
    const area: ComplianceArea = {
      name: 'Data Retention',
      score: 100,
      issues: []
    };

    privacyData.forEach(setting => {
      const consent = JSON.parse(setting.pdpa_consent || '{}');

      // Check retention period
      if (!consent.dataRetentionPeriod || consent.dataRetentionPeriod > 2555) { // 7 years
        area.score -= 10;
        area.issues.push('Data retention period exceeds recommended maximum');
      }
    });

    return area;
  }

  private generateComplianceRecommendations(analysis: ComplianceAnalysis): string[] {
    const recommendations: string[] = [];

    analysis.violations.forEach(violation => {
      switch(violation.area) {
        case 'Consent Management':
          recommendations.push('Review and update user consent records');
          recommendations.push('Implement automated consent renewal reminders');
          break;
        case 'Data Minimization':
          recommendations.push('Review data access patterns and implement access limits');
          recommendations.push('Implement role-based access controls');
          break;
        case 'Purpose Limitation':
          recommendations.push('Enforce justification for all data access');
          recommendations.push('Implement purpose-based access controls');
          break;
        case 'Data Retention':
          recommendations.push('Review and update data retention policies');
          recommendations.push('Implement automated data purging');
          break;
      }
    });

    if (analysis.score >= 90) {
      recommendations.push('Maintain current excellent compliance practices');
    } else if (analysis.score >= 70) {
      recommendations.push('Schedule quarterly compliance reviews');
    } else {
      recommendations.push('Immediate compliance review and remediation required');
    }

    return [...new Set(recommendations)]; // Remove duplicates
  }
}

// Additional type definitions for PDPA compliance

export interface PDPAComplianceReport {
  reportId: string;
  familyId: string;
  period: {
    startDate: Date;
    endDate: Date;
  };
  complianceScore: number;
  areas: ComplianceArea[];
  violations: ComplianceViolation[];
  recommendations: string[];
  generatedAt: Date;
  nextReviewDate: Date;
}

export interface ComplianceAnalysis {
  score: number;
  areas: ComplianceArea[];
  violations: ComplianceViolation[];
}

export interface ComplianceArea {
  name: string;
  score: number;
  issues: string[];
}

export interface ComplianceViolation {
  area: string;
  severity: 'high' | 'medium' | 'low';
  description: string;
}

// Type definitions for better type safety

export interface AccessContext {
  familyId?: string;
  isEmergency?: boolean;
  emergencyReason?: string;
  ipAddress?: string;
  userAgent?: string;
  culturalContext?: any;
}

export interface AccessDecision {
  allowed: boolean;
  reason?: string;
  conditions?: string[];
}

export interface PrivacyAuditReport {
  reportId: string;
  userId: string;
  familyId: string;
  period: {
    startDate: Date;
    endDate: Date;
  };
  entries: CategorizedAuditEntries;
  statistics: AuditStatistics;
  complianceStatus: any;
  generatedAt: Date;
  recommendations: string[];
}

export interface CategorizedAuditEntries {
  dataAccess: any[];
  permissionChanges: any[];
  consentUpdates: any[];
  emergencyAccess: any[];
}

export interface AuditStatistics {
  totalAccesses: number;
  uniqueAccessors: number;
  permissionGrants: number;
  permissionRevocations: number;
  emergencyOverrides: number;
}