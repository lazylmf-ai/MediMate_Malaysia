/**
 * Privacy Control Validator
 *
 * Validates privacy settings before operations, enforces data minimization,
 * and checks user consent before data collection (PDPA compliance).
 */

export enum PrivacyLevel {
  PUBLIC = 'public',
  FAMILY = 'family',
  PRIVATE = 'private',
  HEALTHCARE_PROVIDER = 'healthcare_provider',
}

export enum DataCategory {
  MEDICATION = 'medication',
  ADHERENCE = 'adherence',
  HEALTH_METRICS = 'health_metrics',
  LOCATION = 'location',
  FAMILY_SHARING = 'family_sharing',
  PROVIDER_SHARING = 'provider_sharing',
  ANALYTICS = 'analytics',
  CULTURAL_PREFERENCES = 'cultural_preferences',
}

export interface PrivacySettings {
  userId: string;
  dataSharing: Record<DataCategory, PrivacyLevel>;
  consentGiven: Record<DataCategory, boolean>;
  locationTracking: boolean;
  analyticsEnabled: boolean;
  familySharingEnabled: boolean;
  providerSharingEnabled: boolean;
  culturalDataSharing: boolean;
  lastUpdated: Date;
}

export interface ValidationResult {
  allowed: boolean;
  reason?: string;
  requiresConsent?: boolean;
  privacyLevel?: PrivacyLevel;
}

export class PrivacyControlValidator {
  private static instance: PrivacyControlValidator;
  private defaultSettings: Omit<PrivacySettings, 'userId' | 'lastUpdated'> = {
    dataSharing: {
      [DataCategory.MEDICATION]: PrivacyLevel.PRIVATE,
      [DataCategory.ADHERENCE]: PrivacyLevel.PRIVATE,
      [DataCategory.HEALTH_METRICS]: PrivacyLevel.PRIVATE,
      [DataCategory.LOCATION]: PrivacyLevel.PRIVATE,
      [DataCategory.FAMILY_SHARING]: PrivacyLevel.FAMILY,
      [DataCategory.PROVIDER_SHARING]: PrivacyLevel.HEALTHCARE_PROVIDER,
      [DataCategory.ANALYTICS]: PrivacyLevel.PUBLIC,
      [DataCategory.CULTURAL_PREFERENCES]: PrivacyLevel.FAMILY,
    },
    consentGiven: {
      [DataCategory.MEDICATION]: false,
      [DataCategory.ADHERENCE]: false,
      [DataCategory.HEALTH_METRICS]: false,
      [DataCategory.LOCATION]: false,
      [DataCategory.FAMILY_SHARING]: false,
      [DataCategory.PROVIDER_SHARING]: false,
      [DataCategory.ANALYTICS]: false,
      [DataCategory.CULTURAL_PREFERENCES]: false,
    },
    locationTracking: false,
    analyticsEnabled: false,
    familySharingEnabled: false,
    providerSharingEnabled: false,
    culturalDataSharing: false,
  };

  private constructor() {}

  public static getInstance(): PrivacyControlValidator {
    if (!PrivacyControlValidator.instance) {
      PrivacyControlValidator.instance = new PrivacyControlValidator();
    }
    return PrivacyControlValidator.instance;
  }

  /**
   * Validate if data collection is allowed
   */
  public async validateDataCollection(
    userId: string,
    dataCategory: DataCategory,
    purpose: string
  ): Promise<ValidationResult> {
    const settings = await this.getPrivacySettings(userId);

    // Check if consent has been given
    if (!settings.consentGiven[dataCategory]) {
      return {
        allowed: false,
        reason: `User has not consented to ${dataCategory} data collection`,
        requiresConsent: true,
      };
    }

    // Check privacy level
    const privacyLevel = settings.dataSharing[dataCategory];

    return {
      allowed: true,
      privacyLevel,
    };
  }

  /**
   * Validate if data sharing is allowed
   */
  public async validateDataSharing(
    userId: string,
    dataCategory: DataCategory,
    recipient: 'family' | 'provider' | 'analytics' | 'third_party'
  ): Promise<ValidationResult> {
    const settings = await this.getPrivacySettings(userId);
    const privacyLevel = settings.dataSharing[dataCategory];

    // Check if sharing is enabled for this recipient type
    switch (recipient) {
      case 'family':
        if (!settings.familySharingEnabled) {
          return {
            allowed: false,
            reason: 'Family sharing is disabled',
          };
        }
        if (privacyLevel !== PrivacyLevel.FAMILY && privacyLevel !== PrivacyLevel.PUBLIC) {
          return {
            allowed: false,
            reason: `Data category ${dataCategory} is set to ${privacyLevel}`,
          };
        }
        break;

      case 'provider':
        if (!settings.providerSharingEnabled) {
          return {
            allowed: false,
            reason: 'Provider sharing is disabled',
          };
        }
        if (
          privacyLevel !== PrivacyLevel.HEALTHCARE_PROVIDER &&
          privacyLevel !== PrivacyLevel.PUBLIC
        ) {
          return {
            allowed: false,
            reason: `Data category ${dataCategory} is set to ${privacyLevel}`,
          };
        }
        break;

      case 'analytics':
        if (!settings.analyticsEnabled) {
          return {
            allowed: false,
            reason: 'Analytics is disabled',
          };
        }
        break;

      case 'third_party':
        // By default, no third-party sharing unless explicitly public
        if (privacyLevel !== PrivacyLevel.PUBLIC) {
          return {
            allowed: false,
            reason: 'Third-party sharing requires public privacy level',
          };
        }
        break;
    }

    return {
      allowed: true,
      privacyLevel,
    };
  }

  /**
   * Validate location tracking permission
   */
  public async validateLocationTracking(userId: string): Promise<ValidationResult> {
    const settings = await this.getPrivacySettings(userId);

    if (!settings.locationTracking) {
      return {
        allowed: false,
        reason: 'Location tracking is disabled',
        requiresConsent: true,
      };
    }

    // Also check device-level permission
    const hasDevicePermission = await this.checkDeviceLocationPermission();
    if (!hasDevicePermission) {
      return {
        allowed: false,
        reason: 'Device location permission not granted',
      };
    }

    return { allowed: true };
  }

  /**
   * Enforce data minimization principle (PDPA requirement)
   */
  public async enforceDataMinimization<T extends Record<string, any>>(
    data: T,
    userId: string,
    purpose: string
  ): Promise<Partial<T>> {
    // Remove unnecessary fields based on purpose
    const minimizedData: Partial<T> = {};

    for (const [key, value] of Object.entries(data)) {
      if (await this.isFieldNecessary(key, purpose, userId)) {
        minimizedData[key as keyof T] = value;
      }
    }

    return minimizedData;
  }

  /**
   * Check if a specific field is necessary for the given purpose
   */
  private async isFieldNecessary(
    fieldName: string,
    purpose: string,
    userId: string
  ): Promise<boolean> {
    // Define necessary fields for different purposes
    const necessaryFields: Record<string, string[]> = {
      medication_reminder: ['medicationId', 'time', 'dosage'],
      adherence_tracking: ['medicationId', 'timestamp', 'taken'],
      family_notification: ['patientId', 'status', 'timestamp'],
      provider_report: ['patientId', 'medicationId', 'adherence', 'timestamp'],
      analytics: ['anonymizedId', 'eventType', 'timestamp'],
    };

    const required = necessaryFields[purpose] || [];
    return required.includes(fieldName);
  }

  /**
   * Get user privacy settings
   */
  private async getPrivacySettings(userId: string): Promise<PrivacySettings> {
    // Load from database or storage
    // For now, return default settings
    return {
      ...this.defaultSettings,
      userId,
      lastUpdated: new Date(),
    };
  }

  /**
   * Check device-level location permission
   */
  private async checkDeviceLocationPermission(): Promise<boolean> {
    // Check React Native permission
    // Implementation would use expo-location or react-native-permissions
    return false; // Placeholder
  }

  /**
   * Update privacy settings
   */
  public async updatePrivacySettings(
    userId: string,
    updates: Partial<Omit<PrivacySettings, 'userId' | 'lastUpdated'>>
  ): Promise<void> {
    // Update settings in database
    // Track change in ComplianceMonitoringService
  }

  /**
   * Grant consent for data category
   */
  public async grantConsent(
    userId: string,
    dataCategory: DataCategory,
    version: string
  ): Promise<void> {
    const settings = await this.getPrivacySettings(userId);
    settings.consentGiven[dataCategory] = true;
    settings.lastUpdated = new Date();

    // Save updated settings
    // Track consent change in ComplianceMonitoringService
  }

  /**
   * Revoke consent for data category (PDPA right to withdraw consent)
   */
  public async revokeConsent(userId: string, dataCategory: DataCategory): Promise<void> {
    const settings = await this.getPrivacySettings(userId);
    settings.consentGiven[dataCategory] = false;
    settings.lastUpdated = new Date();

    // Save updated settings
    // Track consent revocation in ComplianceMonitoringService
    // Trigger data deletion if required
  }

  /**
   * Check if user has given all required consents
   */
  public async checkRequiredConsents(userId: string): Promise<{
    hasAllRequired: boolean;
    missing: DataCategory[];
  }> {
    const settings = await this.getPrivacySettings(userId);
    const requiredCategories = [
      DataCategory.MEDICATION,
      DataCategory.ADHERENCE,
      DataCategory.HEALTH_METRICS,
    ];

    const missing = requiredCategories.filter(
      category => !settings.consentGiven[category]
    );

    return {
      hasAllRequired: missing.length === 0,
      missing,
    };
  }
}

export default PrivacyControlValidator.getInstance();