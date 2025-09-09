/**
 * OAuth 2.0 Provider Configurations
 * 
 * Centralized configuration for OAuth providers (Google, Microsoft, Local)
 * with Malaysian healthcare-specific settings and security requirements.
 */

export interface OAuthProviderConfig {
    name: string;
    code: string;
    displayName: string;
    clientId: string;
    clientSecret: string;
    authorizationEndpoint: string;
    tokenEndpoint: string;
    userInfoEndpoint: string;
    scopes: string[];
    pkceRequired: boolean;
    supportedFeatures: {
        emailVerification: boolean;
        profilePicture: boolean;
        organizationalInfo: boolean;
        mfaIntegration: boolean;
    };
    healthcareCompliance: {
        hipaaCompliant: boolean;
        pdpaCompliant: boolean;
        dataResidency: 'malaysia' | 'singapore' | 'global';
        encryptionRequired: boolean;
    };
}

/**
 * OAuth provider configurations
 */
export const OAUTH_PROVIDERS: Record<string, OAuthProviderConfig> = {
    google: {
        name: 'google',
        code: 'GOOGLE',
        displayName: 'Google',
        clientId: process.env.GOOGLE_OAUTH_CLIENT_ID || '',
        clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET || '',
        authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
        tokenEndpoint: 'https://oauth2.googleapis.com/token',
        userInfoEndpoint: 'https://www.googleapis.com/oauth2/v2/userinfo',
        scopes: [
            'openid',
            'email',
            'profile'
        ],
        pkceRequired: true,
        supportedFeatures: {
            emailVerification: true,
            profilePicture: true,
            organizationalInfo: true,
            mfaIntegration: false
        },
        healthcareCompliance: {
            hipaaCompliant: false, // Google Workspace can be HIPAA compliant with BAA
            pdpaCompliant: true,
            dataResidency: 'global',
            encryptionRequired: true
        }
    },
    
    microsoft: {
        name: 'microsoft',
        code: 'MSFT',
        displayName: 'Microsoft',
        clientId: process.env.MICROSOFT_OAUTH_CLIENT_ID || '',
        clientSecret: process.env.MICROSOFT_OAUTH_CLIENT_SECRET || '',
        authorizationEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize',
        tokenEndpoint: 'https://login.microsoftonline.com/common/oauth2/v2.0/token',
        userInfoEndpoint: 'https://graph.microsoft.com/v1.0/me',
        scopes: [
            'openid',
            'email',
            'profile',
            'User.Read'
        ],
        pkceRequired: true,
        supportedFeatures: {
            emailVerification: true,
            profilePicture: true,
            organizationalInfo: true,
            mfaIntegration: true
        },
        healthcareCompliance: {
            hipaaCompliant: true, // Microsoft 365 is HIPAA compliant
            pdpaCompliant: true,
            dataResidency: 'singapore', // Microsoft has Singapore data center
            encryptionRequired: true
        }
    },
    
    local: {
        name: 'local',
        code: 'LOCAL',
        displayName: 'MediMate Malaysia',
        clientId: process.env.LOCAL_OAUTH_CLIENT_ID || 'medimate-local',
        clientSecret: process.env.LOCAL_OAUTH_CLIENT_SECRET || '',
        authorizationEndpoint: '/auth/local/authorize',
        tokenEndpoint: '/auth/local/token',
        userInfoEndpoint: '/auth/local/userinfo',
        scopes: [
            'openid',
            'email',
            'profile',
            'medical_records',
            'healthcare_provider'
        ],
        pkceRequired: false,
        supportedFeatures: {
            emailVerification: true,
            profilePicture: true,
            organizationalInfo: true,
            mfaIntegration: true
        },
        healthcareCompliance: {
            hipaaCompliant: true,
            pdpaCompliant: true,
            dataResidency: 'malaysia',
            encryptionRequired: true
        }
    }
};

/**
 * Gets OAuth provider configuration by name
 */
export function getOAuthProvider(providerName: string): OAuthProviderConfig | null {
    return OAUTH_PROVIDERS[providerName] || null;
}

/**
 * Gets all available OAuth providers
 */
export function getAllOAuthProviders(): OAuthProviderConfig[] {
    return Object.values(OAUTH_PROVIDERS);
}

/**
 * Gets OAuth providers that meet specific compliance requirements
 */
export function getCompliantOAuthProviders(requirements: {
    hipaaCompliant?: boolean;
    pdpaCompliant?: boolean;
    dataResidency?: string;
}): OAuthProviderConfig[] {
    return Object.values(OAUTH_PROVIDERS).filter(provider => {
        if (requirements.hipaaCompliant && !provider.healthcareCompliance.hipaaCompliant) {
            return false;
        }
        if (requirements.pdpaCompliant && !provider.healthcareCompliance.pdpaCompliant) {
            return false;
        }
        if (requirements.dataResidency && provider.healthcareCompliance.dataResidency !== requirements.dataResidency) {
            return false;
        }
        return true;
    });
}

/**
 * Validates OAuth provider configuration
 */
export function validateOAuthConfig(provider: OAuthProviderConfig): string[] {
    const errors: string[] = [];
    
    if (!provider.clientId) {
        errors.push(`Missing client ID for ${provider.name}`);
    }
    
    if (!provider.clientSecret && provider.name !== 'local') {
        errors.push(`Missing client secret for ${provider.name}`);
    }
    
    if (!provider.authorizationEndpoint) {
        errors.push(`Missing authorization endpoint for ${provider.name}`);
    }
    
    if (!provider.tokenEndpoint) {
        errors.push(`Missing token endpoint for ${provider.name}`);
    }
    
    if (!provider.userInfoEndpoint) {
        errors.push(`Missing user info endpoint for ${provider.name}`);
    }
    
    if (!provider.scopes || provider.scopes.length === 0) {
        errors.push(`Missing scopes for ${provider.name}`);
    }
    
    return errors;
}

/**
 * Gets OAuth scopes for healthcare applications
 */
export function getHealthcareScopes(providerName: string, userRole: string): string[] {
    const provider = getOAuthProvider(providerName);
    if (!provider) {
        return [];
    }
    
    const scopes = [...provider.scopes];
    
    // Add healthcare-specific scopes based on user role
    if (providerName === 'local') {
        switch (userRole) {
            case 'doctor':
            case 'specialist_doctor':
                scopes.push('prescribe_medications', 'access_full_records', 'create_diagnoses');
                break;
            case 'nurse':
            case 'specialist_nurse':
                scopes.push('view_patient_records', 'update_medical_notes');
                break;
            case 'pharmacist':
                scopes.push('dispense_medications', 'view_prescriptions');
                break;
            case 'admin':
            case 'system_admin':
                scopes.push('manage_users', 'system_administration');
                break;
        }
    }
    
    return scopes;
}

/**
 * OAuth configuration validation on startup
 */
export function validateAllOAuthConfigs(): { valid: boolean; errors: string[] } {
    const allErrors: string[] = [];
    
    for (const provider of Object.values(OAUTH_PROVIDERS)) {
        const errors = validateOAuthConfig(provider);
        allErrors.push(...errors);
    }
    
    return {
        valid: allErrors.length === 0,
        errors: allErrors
    };
}

/**
 * Malaysian-specific OAuth configurations
 */
export const MALAYSIAN_OAUTH_SETTINGS = {
    // Time zone for OAuth flows
    timezone: 'Asia/Kuala_Lumpur',
    
    // Supported languages
    supportedLanguages: ['ms', 'en', 'zh', 'ta'],
    
    // Malaysian regulatory compliance
    regulatoryCompliance: {
        pdpaRequired: true,
        dataLocalisation: true,
        auditLoggingRequired: true,
        encryptionAtRest: true,
        encryptionInTransit: true
    },
    
    // Session configuration
    session: {
        maxDurationHours: 8, // Malaysian working hours
        extendOnActivity: true,
        requireReauthForSensitive: true,
        culturalTimeouts: {
            duringPrayerTimes: true,
            duringRamadan: true
        }
    },
    
    // Mobile optimization for Malaysian networks
    mobile: {
        optimizedForMaxis: true,
        optimizedForCelcom: true,
        optimizedForDigi: true,
        smsTimeout: 300, // 5 minutes for Malaysian SMS delivery
        fallbackToEmail: true
    }
};

export default {
    OAUTH_PROVIDERS,
    getOAuthProvider,
    getAllOAuthProviders,
    getCompliantOAuthProviders,
    validateOAuthConfig,
    getHealthcareScopes,
    validateAllOAuthConfigs,
    MALAYSIAN_OAUTH_SETTINGS
};