/**
 * Family Management Types for MediMate Malaysia
 * Comprehensive TypeScript interfaces for family circles and remote monitoring
 */

// ============================================================================
// CORE FAMILY INTERFACES
// ============================================================================

export interface FamilyCircle {
  id: string;
  name: string;
  createdBy: string;
  settings: FamilySettings;
  emergencyContacts: EmergencyContact[];
  culturalPreferences: CulturalPreferences;
  active: boolean;
  archivedReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FamilySettings {
  maxMembers: number;
  emergencyNotificationDelay: number; // minutes
  defaultPrivacyLevel: 'private' | 'family' | 'extended';
  culturalSettings: {
    language: 'ms' | 'en' | 'zh' | 'ta';
    prayerTimeAware: boolean;
    festivalNotifications: boolean;
  };
}

export interface CulturalPreferences {
  primaryLanguage: 'ms' | 'en' | 'zh' | 'ta';
  religiousObservance: 'islamic' | 'christian' | 'buddhist' | 'hindu' | 'none';
  familyHierarchy: 'traditional' | 'modern' | 'flexible';
  decisionMaking: 'collective' | 'individual' | 'hierarchical';
}

export interface EmergencyContact {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  email?: string;
  priority: number;
  contactMethods: ContactMethod[];
}

// ============================================================================
// FAMILY MEMBER INTERFACES
// ============================================================================

export interface FamilyMember {
  id: string;
  familyId: string;
  userId: string;
  role: FamilyRole;
  displayName?: string;
  relationship: string;
  permissions: FamilyPermissions;
  privacySettings: PrivacySettings;
  status: FamilyMemberStatus;
  invitedBy?: string;
  joinedAt?: Date;
  culturalContext: CulturalContext;
  createdAt: Date;
  updatedAt: Date;
}

export type FamilyRole = 'admin' | 'caregiver' | 'viewer' | 'emergency';

export type FamilyMemberStatus = 'active' | 'invited' | 'suspended' | 'left';

export interface FamilyPermissions {
  viewMedications: boolean;
  viewAdherence: boolean;
  receiveEmergencyAlerts: boolean;
  manageSettings: boolean;
  inviteMembers: boolean;
  viewHealthData: boolean;
}

export interface PrivacySettings {
  shareMedications: boolean;
  shareAdherence: boolean;
  shareHealthMetrics: boolean;
  shareLocation: boolean;
  emergencyOverride: boolean;
}

export interface CulturalContext {
  respectLevel: 'high' | 'standard' | 'casual';
  communicationPreference: 'direct' | 'indirect' | 'formal';
  emergencyContactPriority: number;
}

// ============================================================================
// FAMILY INVITATION INTERFACES
// ============================================================================

export interface FamilyInvitation {
  id: string;
  familyId: string;
  invitedBy: string;
  invitedEmail: string;
  invitedPhone?: string;
  role: FamilyRole;
  relationship: string;
  personalMessage?: string;
  inviteCode: string;
  qrCodeData?: string;
  expiresAt: Date;
  usedAt?: Date;
  revokedAt?: Date;
  revokedBy?: string;
  revokeReason?: string;
  status: InvitationStatus;
  viewCount: number;
  lastViewedAt?: Date;
  acceptAttempts: number;
  lastAttemptAt?: Date;
  lastAttemptIp?: string;
  culturalGreeting: CulturalGreeting;
  createdAt: Date;
}

export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'revoked' | 'failed';

export interface CulturalGreeting {
  language: 'ms' | 'en' | 'zh' | 'ta';
  formality: 'casual' | 'standard' | 'formal';
  religiousGreeting: boolean;
}

// ============================================================================
// FAMILY NOTIFICATION INTERFACES
// ============================================================================

export interface FamilyNotification {
  id: string;
  familyId: string;
  senderId?: string;
  notificationType: NotificationType;
  title: string;
  message: string;
  severity: NotificationSeverity;
  targetMembers: string[];
  deliveryChannels: DeliveryChannel[];
  metadata: Record<string, any>;
  culturalContext: NotificationCulturalContext;
  deliveryStatus: Record<string, DeliveryStatus>;
  deliveryAttempts: number;
  lastDeliveryAttempt?: Date;
  resolvedAt?: Date;
  resolvedBy?: string;
  resolutionNotes?: string;
  createdAt: Date;
}

export type NotificationType =
  | 'medication_missed'
  | 'emergency_alert'
  | 'family_update'
  | 'member_joined'
  | 'member_left'
  | 'medication_taken'
  | 'health_update';

export type NotificationSeverity = 'low' | 'medium' | 'high' | 'critical';

export type DeliveryChannel = 'push' | 'sms' | 'email' | 'voice';

export interface NotificationCulturalContext {
  prayerTimeAware: boolean;
  urgencyOverridesPrayer: boolean;
  languagePreference: 'auto' | 'ms' | 'en' | 'zh' | 'ta';
}

export interface DeliveryStatus {
  channel: DeliveryChannel;
  status: 'pending' | 'delivered' | 'failed' | 'read';
  attemptCount: number;
  lastAttempt: Date;
  errorMessage?: string;
}

// ============================================================================
// FAMILY ACTIVITY LOG INTERFACES
// ============================================================================

export interface FamilyActivityLog {
  id: string;
  familyId: string;
  userId: string;
  actionType: FamilyActionType;
  resourceType?: string;
  resourceId?: string;
  actionDescription: string;
  previousValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  deviceInfo?: Record<string, any>;
  culturalContext: Record<string, any>;
  locationContext: Record<string, any>;
  createdAt: Date;
}

export type FamilyActionType =
  | 'joined_family'
  | 'left_family'
  | 'medication_taken'
  | 'medication_missed'
  | 'emergency_triggered'
  | 'settings_updated'
  | 'member_invited'
  | 'invitation_accepted'
  | 'permission_changed'
  | 'privacy_updated';

// ============================================================================
// MEDICATION SHARING INTERFACES
// ============================================================================

export interface FamilyMedicationSharing {
  id: string;
  familyId: string;
  medicationOwnerId: string;
  medicationId: string;
  sharedWith: string[];
  sharingLevel: SharingLevel;
  sharedData: SharedDataConfig;
  emergencyOverride: boolean;
  emergencyShareLevel: SharingLevel;
  activeFrom?: Date;
  activeUntil?: Date;
  sharedBy: string;
  sharingReason?: string;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type SharingLevel = 'none' | 'basic' | 'full' | 'emergency_only';

export interface SharedDataConfig {
  medicationName: boolean;
  dosage: boolean;
  schedule: boolean;
  adherenceStatus: boolean;
  sideEffects: boolean;
  notes: boolean;
}

// ============================================================================
// EMERGENCY RULE INTERFACES
// ============================================================================

export interface FamilyEmergencyRule {
  id: string;
  familyId: string;
  createdBy: string;
  ruleName: string;
  triggerConditions: TriggerCondition[];
  escalationSteps: EscalationStep[];
  culturalEscalation: CulturalEscalationSettings;
  active: boolean;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TriggerCondition {
  type: 'missed_medication' | 'no_app_activity' | 'manual_trigger' | 'health_alert';
  parameters: Record<string, any>;
  severity: NotificationSeverity;
}

export interface EscalationStep {
  delay: number; // minutes
  methods: DeliveryChannel[];
  recipients: 'primary_caregivers' | 'all_family' | 'emergency_contacts' | string[];
  message: string;
  culturallyAdapted: boolean;
}

export interface CulturalEscalationSettings {
  respectPrayerTimes: boolean;
  emergencyOverride: boolean;
  familyHierarchyAware: boolean;
  languagePreferences: 'auto' | string;
}

// ============================================================================
// VIEW INTERFACES (Database Views)
// ============================================================================

export interface FamilyMemberDetails extends FamilyMember {
  familyName: string;
  fullName: string;
  email: string;
  phone?: string;
}

export interface ActiveFamilyInvitation extends FamilyInvitation {
  familyName: string;
  invitedByName: string;
}

export interface FamilyEmergencyContact {
  familyId: string;
  familyName: string;
  userId: string;
  fullName: string;
  phone?: string;
  email: string;
  role: FamilyRole;
  relationship: string;
  contactPriority: number;
  permissions: FamilyPermissions;
  culturalContext: CulturalContext;
}

// ============================================================================
// API REQUEST/RESPONSE INTERFACES
// ============================================================================

export interface CreateFamilyRequest {
  name: string;
  settings?: Partial<FamilySettings>;
  culturalPreferences?: Partial<CulturalPreferences>;
  emergencyContacts?: EmergencyContact[];
}

export interface UpdateFamilyRequest {
  name?: string;
  settings?: Partial<FamilySettings>;
  culturalPreferences?: Partial<CulturalPreferences>;
  emergencyContacts?: EmergencyContact[];
}

export interface InviteFamilyMemberRequest {
  email: string;
  phone?: string;
  role: FamilyRole;
  relationship: string;
  personalMessage?: string;
  permissions?: Partial<FamilyPermissions>;
  culturalGreeting?: Partial<CulturalGreeting>;
}

export interface AcceptFamilyInvitationRequest {
  inviteCode: string;
  displayName?: string;
  privacySettings?: Partial<PrivacySettings>;
  culturalContext?: Partial<CulturalContext>;
}

export interface UpdateFamilyMemberRequest {
  displayName?: string;
  relationship?: string;
  permissions?: Partial<FamilyPermissions>;
  privacySettings?: Partial<PrivacySettings>;
  culturalContext?: Partial<CulturalContext>;
}

export interface ShareMedicationRequest {
  medicationId: string;
  sharedWith?: string[];
  sharingLevel: SharingLevel;
  sharedData?: Partial<SharedDataConfig>;
  sharingReason?: string;
  activeFrom?: Date;
  activeUntil?: Date;
}

export interface CreateEmergencyRuleRequest {
  ruleName: string;
  triggerConditions: TriggerCondition[];
  escalationSteps: EscalationStep[];
  culturalEscalation?: Partial<CulturalEscalationSettings>;
  priority?: number;
}

// ============================================================================
// API RESPONSE INTERFACES
// ============================================================================

export interface FamilyResponse {
  family: FamilyCircle;
  members: FamilyMemberDetails[];
  invitations: ActiveFamilyInvitation[];
  emergencyContacts: FamilyEmergencyContact[];
  memberCount: number;
}

export interface FamilyDashboardResponse {
  family: FamilyCircle;
  members: FamilyMemberDetails[];
  recentActivity: FamilyActivityLog[];
  activeNotifications: FamilyNotification[];
  medicationSummary: FamilyMedicationSummary[];
  emergencyRules: FamilyEmergencyRule[];
}

export interface FamilyMedicationSummary {
  userId: string;
  userName: string;
  medicationCount: number;
  adherenceRate: number;
  lastTaken?: Date;
  missedToday: number;
  criticalMissed: number;
  sharingLevel: SharingLevel;
}

export interface InvitationResponse {
  invitation: FamilyInvitation;
  qrCodeUrl?: string;
  expiresIn: number; // seconds until expiration
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type ContactMethod = 'phone' | 'sms' | 'email' | 'whatsapp';

export interface FamilyPermissionCheck {
  userId: string;
  familyId: string;
  permission: keyof FamilyPermissions;
  granted: boolean;
  reason?: string;
}

export interface FamilyMembershipSummary {
  familyId: string;
  familyName: string;
  role: FamilyRole;
  memberCount: number;
  joinedAt: Date;
  lastActive: Date;
}

// ============================================================================
// ERROR INTERFACES
// ============================================================================

export interface FamilyError {
  code: string;
  message: string;
  details?: Record<string, any>;
}

export type FamilyErrorCode =
  | 'FAMILY_NOT_FOUND'
  | 'MEMBER_NOT_FOUND'
  | 'INVITATION_NOT_FOUND'
  | 'INVITATION_EXPIRED'
  | 'INVITATION_ALREADY_USED'
  | 'FAMILY_FULL'
  | 'INSUFFICIENT_PERMISSIONS'
  | 'ALREADY_FAMILY_MEMBER'
  | 'INVALID_INVITE_CODE'
  | 'CULTURAL_CONFLICT'
  | 'EMERGENCY_RULE_CONFLICT';

// ============================================================================
// CONSTANTS
// ============================================================================

export const FAMILY_CONSTANTS = {
  MAX_MEMBERS_DEFAULT: 20,
  INVITATION_EXPIRY_DAYS: 7,
  INVITE_CODE_LENGTH: 8,
  MAX_EMERGENCY_CONTACTS: 5,
  EMERGENCY_NOTIFICATION_DELAY_DEFAULT: 5, // minutes

  ROLES: {
    ADMIN: 'admin' as const,
    CAREGIVER: 'caregiver' as const,
    VIEWER: 'viewer' as const,
    EMERGENCY: 'emergency' as const,
  },

  SHARING_LEVELS: {
    NONE: 'none' as const,
    BASIC: 'basic' as const,
    FULL: 'full' as const,
    EMERGENCY_ONLY: 'emergency_only' as const,
  },

  NOTIFICATION_SEVERITIES: {
    LOW: 'low' as const,
    MEDIUM: 'medium' as const,
    HIGH: 'high' as const,
    CRITICAL: 'critical' as const,
  },

  DELIVERY_CHANNELS: {
    PUSH: 'push' as const,
    SMS: 'sms' as const,
    EMAIL: 'email' as const,
    VOICE: 'voice' as const,
  },
} as const;