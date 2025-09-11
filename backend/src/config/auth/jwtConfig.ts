/**
 * JWT Configuration
 * 
 * JWT token configuration for Malaysian healthcare authentication
 * with security best practices and cultural considerations.
 */

export interface JWTConfig {
    secret: string;
    refreshSecret: string;
    issuer: string;
    audience: string;
    accessTokenExpiry: string;
    refreshTokenExpiry: string;
    algorithmn: string;
    clockTolerance: number;
}

export interface TokenClaims {
    userId: string;
    sessionId: string;
    role: string;
    permissions: string[];
    healthcareRole?: string;
    licenseNumber?: string;
    
    // Cultural preferences
    language: string;
    timezone: string;
    culturalProfile?: {
        prayerTimes: boolean;
        fasting: boolean;
        culturalHolidays: string[];
    };
    
    // Standard JWT claims
    iss: string; // Issuer
    aud: string; // Audience
    sub: string; // Subject (user ID)
    iat: number; // Issued at
    exp: number; // Expires at
    nbf?: number; // Not before
    jti: string; // JWT ID
}

/**
 * JWT Configuration with Malaysian healthcare optimization
 */
export const JWT_CONFIG: JWTConfig = {
    secret: process.env.JWT_SECRET || 'medimate-malaysia-jwt-secret-change-in-production',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'medimate-malaysia-refresh-secret-change-in-production',
    issuer: process.env.JWT_ISSUER || 'medimate-malaysia',
    audience: process.env.JWT_AUDIENCE || 'medimate-malaysia-users',
    
    // Token expiry optimized for Malaysian healthcare workflows
    accessTokenExpiry: '8h', // 8-hour shifts for healthcare workers
    refreshTokenExpiry: '7d', // Weekly refresh for security
    
    algorithmn: 'HS256',
    clockTolerance: 60 // 1 minute tolerance for clock skew
};

/**
 * Default token permissions for healthcare roles
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
    'patient': [
        'view_own_records',
        'update_profile',
        'view_appointments',
        'manage_medications'
    ],
    
    'nurse': [
        'view_patient_records',
        'update_medical_notes',
        'manage_appointments',
        'view_prescriptions',
        'record_vital_signs'
    ],
    
    'specialist_nurse': [
        'view_patient_records',
        'update_medical_notes',
        'manage_appointments',
        'view_prescriptions',
        'record_vital_signs',
        'create_care_plans',
        'supervise_care'
    ],
    
    'doctor': [
        'view_full_records',
        'create_diagnoses',
        'prescribe_medications',
        'order_diagnostics',
        'manage_appointments',
        'access_lab_results',
        'emergency_access'
    ],
    
    'specialist_doctor': [
        'view_full_records',
        'create_diagnoses',
        'prescribe_medications',
        'order_diagnostics',
        'manage_appointments',
        'access_lab_results',
        'emergency_access',
        'consult_referrals',
        'supervise_residents'
    ],
    
    'pharmacist': [
        'view_prescriptions',
        'dispense_medications',
        'medication_counseling',
        'drug_interaction_check',
        'inventory_management'
    ],
    
    'admin': [
        'manage_appointments',
        'view_reports',
        'user_management',
        'system_configuration',
        'billing_management'
    ],
    
    'system_admin': [
        'full_system_access',
        'user_management',
        'system_configuration',
        'audit_access',
        'emergency_override'
    ]
};

/**
 * Cultural-aware token configuration
 */
export const CULTURAL_TOKEN_SETTINGS = {
    // Prayer time adjustments for token refresh
    prayerTimeAdjustment: {
        enabled: true,
        extendTokenNearPrayerTime: true,
        bufferMinutes: 15
    },
    
    // Ramadan considerations
    ramadanSettings: {
        adjustedWorkingHours: true,
        extendedBreakTimes: true,
        modifiedSessionLengths: true
    },
    
    // Language-specific token settings
    languageSettings: {
        supportedLanguages: ['ms', 'en', 'zh', 'ta'],
        defaultLanguage: 'ms',
        includeInToken: true
    },
    
    // Malaysian time zone handling
    timezoneSettings: {
        defaultTimezone: 'Asia/Kuala_Lumpur',
        enforceLocalTime: true,
        adjustForDST: false // Malaysia doesn't observe DST
    }
};

/**
 * Token security settings for healthcare compliance
 */
export const SECURITY_SETTINGS = {
    // Encryption requirements
    encryption: {
        required: true,
        algorithm: 'aes-256-gcm',
        keyRotationDays: 30
    },
    
    // Audit requirements
    audit: {
        logAllTokenOperations: true,
        retentionDays: 2555, // 7 years for medical records
        sensitiveDataMasking: true
    },
    
    // Rate limiting
    rateLimiting: {
        tokensPerUser: 5, // Maximum concurrent tokens
        requestsPerMinute: 100,
        burstAllowance: 20
    },
    
    // IP restrictions
    ipSecurity: {
        allowMultipleIPs: true, // Healthcare workers move between locations
        suspiciousIPBlocking: true,
        geoLocationChecking: false // Disabled for Malaysia focus
    },
    
    // Device fingerprinting
    deviceSecurity: {
        trackDevices: true,
        maxDevices: 3,
        requireReauthOnNewDevice: true
    }
};

/**
 * Emergency access token configuration
 */
export const EMERGENCY_ACCESS_CONFIG = {
    // Emergency token settings
    emergencyTokenExpiry: '4h', // Limited time for emergency access
    requiresJustification: true,
    requiresApproval: false, // Can be granted immediately in true emergencies
    auditLevel: 'maximum',
    
    // Break-glass access
    breakGlassAccess: {
        enabled: true,
        autoExpireMinutes: 240, // 4 hours
        requiresManagerApproval: false,
        immediateAuditNotification: true
    },
    
    // Emergency roles with special access
    emergencyRoles: [
        'emergency_doctor',
        'trauma_surgeon', 
        'icu_specialist',
        'emergency_nurse'
    ]
};

export default {
    JWT_CONFIG,
    DEFAULT_ROLE_PERMISSIONS,
    CULTURAL_TOKEN_SETTINGS,
    SECURITY_SETTINGS,
    EMERGENCY_ACCESS_CONFIG
};