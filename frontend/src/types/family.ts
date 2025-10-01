/**
 * Family Management Types for Frontend Components
 * React Native UI-specific types extending backend family types
 */

// Re-export core types from backend
export type {
  FamilyCircle,
  FamilyMember,
  FamilyRole,
  FamilyMemberStatus,
  FamilyPermissions,
  PrivacySettings,
  FamilySettings,
  CulturalPreferences,
  EmergencyContact,
  FamilyNotification,
  NotificationType,
  NotificationSeverity,
  DeliveryChannel,
  FamilyActivityLog,
  FamilyActionType,
  FamilyMedicationSummary,
  FamilyDashboardResponse,
  InvitationStatus,
  SharingLevel,
  FAMILY_CONSTANTS
} from '../../../backend/src/types/family/family.types';

// ============================================================================
// UI-SPECIFIC FAMILY TYPES
// ============================================================================

export interface FamilyDashboardData {
  family: FamilyCircle;
  members: FamilyMemberWithStatus[];
  recentActivity: FamilyActivityLog[];
  activeNotifications: FamilyNotification[];
  medicationSummary: FamilyMedicationSummary[];
  lastUpdated: Date;
  connectionStatus: 'connected' | 'connecting' | 'disconnected';
}

export interface FamilyMemberWithStatus extends FamilyMember {
  fullName: string;
  email: string;
  phone?: string;
  isOnline: boolean;
  lastSeen?: Date;
  currentLocation?: string;
  emergencyStatus: 'normal' | 'warning' | 'emergency';
  medicationStatus: MemberMedicationStatus;
  healthScore: number; // 0-100
}

export interface MemberMedicationStatus {
  totalMedications: number;
  takenToday: number;
  missedToday: number;
  criticalMissed: number;
  adherenceRate: number;
  lastTaken?: Date;
  nextDue?: Date;
  emergencyMedications: number;
}

// ============================================================================
// DASHBOARD COMPONENT PROPS
// ============================================================================

export interface FamilyDashboardProps {
  familyId?: string;
  onMemberSelect?: (member: FamilyMemberWithStatus) => void;
  onEmergencyAlert?: (notification: FamilyNotification) => void;
  onRefresh?: () => Promise<void>;
  refreshing?: boolean;
  culturalSettings?: {
    language: 'ms' | 'en' | 'zh' | 'ta';
    showPrayerTimes: boolean;
    largeText: boolean;
    highContrast: boolean;
  };
}

export interface MemberStatusCardProps {
  member: FamilyMemberWithStatus;
  onPress?: () => void;
  onEmergencyContact?: () => void;
  showFullDetails?: boolean;
  compactMode?: boolean;
  accessibilityMode?: boolean;
}

export interface MedicationStatusGridProps {
  medications: FamilyMedicationSummary[];
  onMedicationPress?: (userId: string, medicationId?: string) => void;
  gridLayout?: 'grid' | 'list';
  showEmergencyOnly?: boolean;
  culturalContext?: {
    language: 'ms' | 'en' | 'zh' | 'ta';
    prayerAware: boolean;
  };
}

export interface EmergencyAlertsProps {
  notifications: FamilyNotification[];
  onAlertAction?: (notificationId: string, action: 'acknowledge' | 'resolve' | 'escalate') => void;
  onCallEmergency?: (memberId: string) => void;
  culturalEmergencyProtocol?: boolean;
  maxAlertsDisplayed?: number;
}

export interface FamilyActivityFeedProps {
  activities: FamilyActivityLog[];
  onActivityPress?: (activity: FamilyActivityLog) => void;
  maxActivities?: number;
  showAvatars?: boolean;
  compactMode?: boolean;
  filterByType?: FamilyActionType[];
}

export interface HealthInsightsProps {
  familyData: FamilyDashboardData;
  timeRange?: '24h' | '7d' | '30d';
  onInsightPress?: (insight: HealthInsight) => void;
  showTrends?: boolean;
  culturalHealthMetrics?: boolean;
}

// ============================================================================
// REAL-TIME UPDATE TYPES
// ============================================================================

export interface FamilyRealtimeUpdate {
  type: 'member_status' | 'medication_taken' | 'emergency_alert' | 'family_activity';
  familyId: string;
  memberId?: string;
  timestamp: Date;
  data: any;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface WebSocketFamilyMessage {
  channel: string;
  event: string;
  data: FamilyRealtimeUpdate;
  messageId: string;
  timestamp: string;
}

// ============================================================================
// HOOK TYPES
// ============================================================================

export interface UseFamilyUpdatesConfig {
  familyId?: string;
  autoConnect?: boolean;
  reconnectAttempts?: number;
  updateInterval?: number;
  culturalContext?: {
    respectPrayerTimes: boolean;
    urgencyOverride: boolean;
    language: 'ms' | 'en' | 'zh' | 'ta';
  };
}

export interface FamilyHookReturn {
  dashboardData: FamilyDashboardData | null;
  loading: boolean;
  error: string | null;
  connected: boolean;
  lastUpdate: Date | null;
  refresh: () => Promise<void>;
  disconnect: () => void;
  reconnect: () => void;
}

// ============================================================================
// ACCESSIBILITY TYPES
// ============================================================================

export interface AccessibilitySettings {
  largeText: boolean;
  highContrast: boolean;
  reduceMotion: boolean;
  screenReader: boolean;
  voiceNavigation: boolean;
  hapticFeedback: boolean;
  colorBlindFriendly: boolean;
}

export interface ElderlyUserSettings extends AccessibilitySettings {
  simplifiedInterface: boolean;
  emergencyButtonSize: 'standard' | 'large' | 'extra-large';
  fontScale: number; // 1.0 - 3.0
  touchTargetSize: 'standard' | 'large' | 'extra-large';
  confirmationDialogs: boolean;
  voiceInstructions: boolean;
  medicalTermTranslation: boolean;
}

// ============================================================================
// NAVIGATION TYPES
// ============================================================================

export interface FamilyNavigationParams {
  FamilyDashboard: {
    familyId?: string;
    highlightMember?: string;
    emergencyAlert?: string;
  };
  MemberDetails: {
    memberId: string;
    familyId: string;
    showMedications?: boolean;
  };
  FamilySettings: {
    familyId: string;
    section?: 'general' | 'privacy' | 'emergency' | 'cultural';
  };
  InviteFamily: {
    familyId: string;
    prefilledEmail?: string;
    suggestedRole?: FamilyRole;
  };
  EmergencyContacts: {
    familyId: string;
    emergencyType?: 'medical' | 'family' | 'local';
  };
}

// ============================================================================
// HEALTH INSIGHTS TYPES
// ============================================================================

export interface HealthInsight {
  id: string;
  type: 'trend' | 'alert' | 'recommendation' | 'celebration';
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'success' | 'error';
  data: Record<string, any>;
  actionable: boolean;
  culturalContext?: {
    appropriate: boolean;
    reason?: string;
    alternative?: string;
  };
  createdAt: Date;
}

export interface FamilyHealthTrend {
  metric: string;
  period: '24h' | '7d' | '30d';
  values: number[];
  labels: string[];
  improvement: number; // percentage change
  benchmark?: number;
  culturallyRelevant: boolean;
}

// ============================================================================
// PERFORMANCE MONITORING TYPES
// ============================================================================

export interface FamilyDashboardMetrics {
  loadTime: number;
  updateLatency: number;
  memberCount: number;
  lastSync: Date;
  errorCount: number;
  wsConnectionStable: boolean;
}

// ============================================================================
// ERROR HANDLING TYPES
// ============================================================================

export interface FamilyUIError {
  code: string;
  message: string;
  component: string;
  recoverable: boolean;
  culturallyAdapted: boolean;
  retryAction?: () => void;
}

export type FamilyUIErrorCode =
  | 'DASHBOARD_LOAD_FAILED'
  | 'REALTIME_CONNECTION_LOST'
  | 'MEMBER_DATA_UNAVAILABLE'
  | 'EMERGENCY_ALERT_FAILED'
  | 'CULTURAL_CONTEXT_MISSING'
  | 'ACCESSIBILITY_NOT_SUPPORTED';

// ============================================================================
// CONSTANTS FOR UI
// ============================================================================

export const FAMILY_UI_CONSTANTS = {
  DASHBOARD_REFRESH_INTERVAL: 30000, // 30 seconds
  EMERGENCY_ALERT_TIMEOUT: 10000, // 10 seconds
  MAX_MEMBERS_DISPLAYED: 12,
  MAX_RECENT_ACTIVITIES: 20,
  MEMBER_STATUS_UPDATE_DEBOUNCE: 2000, // 2 seconds

  LOAD_TIME_TARGETS: {
    DASHBOARD: 2000, // 2 seconds
    MEMBER_LIST: 300, // 300ms
    WEBSOCKET_CONNECTION: 1000, // 1 second
  },

  ACCESSIBILITY_SCALES: {
    FONT_MIN: 1.0,
    FONT_MAX: 3.0,
    TOUCH_TARGET_MIN: 44, // iOS HIG minimum
    TOUCH_TARGET_LARGE: 64,
    TOUCH_TARGET_EXTRA_LARGE: 88,
  },

  CULTURAL_LANGUAGES: {
    MALAY: 'ms',
    ENGLISH: 'en',
    CHINESE: 'zh',
    TAMIL: 'ta',
  },

  EMERGENCY_COLORS: {
    NORMAL: '#10B981', // Green
    WARNING: '#F59E0B', // Amber
    EMERGENCY: '#EF4444', // Red
    CRITICAL: '#DC2626', // Dark Red
  },
} as const;