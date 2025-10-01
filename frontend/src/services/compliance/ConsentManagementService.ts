/**
 * Consent Management Service
 *
 * Manages user consent preferences for PDPA compliance.
 * Handles consent versioning, granular controls, and withdrawal.
 */

export enum ConsentType {
  MEDICATION_DATA = 'medication_data',
  ADHERENCE_TRACKING = 'adherence_tracking',
  HEALTH_METRICS = 'health_metrics',
  LOCATION_SERVICES = 'location_services',
  FAMILY_SHARING = 'family_sharing',
  PROVIDER_SHARING = 'provider_sharing',
  ANALYTICS = 'analytics',
  MARKETING = 'marketing',
  THIRD_PARTY_SHARING = 'third_party_sharing',
}

export interface ConsentRecord {
  id: string;
  userId: string;
  consentType: ConsentType;
  granted: boolean;
  version: string;
  grantedAt?: Date;
  revokedAt?: Date;
  expiresAt?: Date;
  source: 'user' | 'system' | 'migration';
  metadata?: Record<string, any>;
}

export interface ConsentVersion {
  version: string;
  effectiveDate: Date;
  changes: string[];
  requiresReConsent: boolean;
}

export interface ConsentStatus {
  consentType: ConsentType;
  granted: boolean;
  currentVersion: string;
  userVersion?: string;
  requiresUpdate: boolean;
  lastUpdated?: Date;
}

export class ConsentManagementService {
  private static instance: ConsentManagementService;

  private readonly CURRENT_VERSION = '1.0.0';
  private readonly consentVersions: ConsentVersion[] = [
    {
      version: '1.0.0',
      effectiveDate: new Date('2025-01-01'),
      changes: ['Initial consent framework'],
      requiresReConsent: false,
    },
  ];

  private consents: ConsentRecord[] = [];

  private constructor() {
    this.initializeDefaultConsents();
  }

  public static getInstance(): ConsentManagementService {
    if (!ConsentManagementService.instance) {
      ConsentManagementService.instance = new ConsentManagementService();
    }
    return ConsentManagementService.instance;
  }

  /**
   * Initialize default consent records (all denied initially)
   */
  private initializeDefaultConsents(): void {
    // User must explicitly grant consent for each type
  }

  /**
   * Grant consent for a specific type
   */
  public async grantConsent(
    userId: string,
    consentType: ConsentType,
    metadata?: Record<string, any>
  ): Promise<ConsentRecord> {
    // Check if consent already exists
    const existing = await this.getConsentRecord(userId, consentType);

    if (existing && existing.granted) {
      // Already granted, update timestamp
      existing.grantedAt = new Date();
      existing.version = this.CURRENT_VERSION;
      existing.metadata = { ...existing.metadata, ...metadata };
      return existing;
    }

    // Create new consent record
    const consent: ConsentRecord = {
      id: this.generateConsentId(),
      userId,
      consentType,
      granted: true,
      version: this.CURRENT_VERSION,
      grantedAt: new Date(),
      source: 'user',
      metadata,
    };

    this.consents.push(consent);

    // Track in compliance monitoring
    await this.trackConsentChange(consent, 'granted');

    // Store in database
    await this.storeConsent(consent);

    return consent;
  }

  /**
   * Revoke consent (PDPA right to withdraw consent)
   */
  public async revokeConsent(
    userId: string,
    consentType: ConsentType,
    reason?: string
  ): Promise<ConsentRecord> {
    const consent = await this.getConsentRecord(userId, consentType);

    if (!consent) {
      throw new Error(`No consent record found for ${consentType}`);
    }

    consent.granted = false;
    consent.revokedAt = new Date();
    consent.metadata = { ...consent.metadata, revokeReason: reason };

    // Track in compliance monitoring
    await this.trackConsentChange(consent, 'revoked');

    // Store updated consent
    await this.storeConsent(consent);

    // Trigger data cleanup if necessary
    await this.handleConsentRevocation(userId, consentType);

    return consent;
  }

  /**
   * Check if consent is granted
   */
  public async hasConsent(userId: string, consentType: ConsentType): Promise<boolean> {
    const consent = await this.getConsentRecord(userId, consentType);

    if (!consent || !consent.granted) {
      return false;
    }

    // Check if consent has expired
    if (consent.expiresAt && consent.expiresAt < new Date()) {
      return false;
    }

    // Check if consent version is current
    if (this.requiresVersionUpdate(consent)) {
      return false;
    }

    return true;
  }

  /**
   * Get consent status for all types
   */
  public async getAllConsentStatuses(userId: string): Promise<ConsentStatus[]> {
    const statuses: ConsentStatus[] = [];

    for (const consentType of Object.values(ConsentType)) {
      const consent = await this.getConsentRecord(userId, consentType);
      const requiresUpdate = consent ? this.requiresVersionUpdate(consent) : true;

      statuses.push({
        consentType,
        granted: consent?.granted || false,
        currentVersion: this.CURRENT_VERSION,
        userVersion: consent?.version,
        requiresUpdate,
        lastUpdated: consent?.grantedAt || consent?.revokedAt,
      });
    }

    return statuses;
  }

  /**
   * Update consent to new version
   */
  public async updateConsentVersion(
    userId: string,
    consentType: ConsentType
  ): Promise<ConsentRecord> {
    const consent = await this.getConsentRecord(userId, consentType);

    if (!consent) {
      throw new Error(`No consent record found for ${consentType}`);
    }

    consent.version = this.CURRENT_VERSION;
    consent.grantedAt = new Date();

    // Track version update
    await this.trackConsentChange(consent, 'version_updated');

    // Store updated consent
    await this.storeConsent(consent);

    return consent;
  }

  /**
   * Check if user has granted all required consents
   */
  public async checkRequiredConsents(userId: string): Promise<{
    hasAll: boolean;
    missing: ConsentType[];
  }> {
    const required: ConsentType[] = [
      ConsentType.MEDICATION_DATA,
      ConsentType.ADHERENCE_TRACKING,
      ConsentType.HEALTH_METRICS,
    ];

    const missing: ConsentType[] = [];

    for (const consentType of required) {
      const hasConsent = await this.hasConsent(userId, consentType);
      if (!hasConsent) {
        missing.push(consentType);
      }
    }

    return {
      hasAll: missing.length === 0,
      missing,
    };
  }

  /**
   * Bulk grant consents (for onboarding)
   */
  public async grantBulkConsents(
    userId: string,
    consentTypes: ConsentType[],
    metadata?: Record<string, any>
  ): Promise<ConsentRecord[]> {
    const granted: ConsentRecord[] = [];

    for (const consentType of consentTypes) {
      const consent = await this.grantConsent(userId, consentType, metadata);
      granted.push(consent);
    }

    return granted;
  }

  /**
   * Export user consent history (PDPA right to data portability)
   */
  public async exportConsentHistory(userId: string): Promise<ConsentRecord[]> {
    return this.consents.filter(c => c.userId === userId);
  }

  /**
   * Get consent record
   */
  private async getConsentRecord(
    userId: string,
    consentType: ConsentType
  ): Promise<ConsentRecord | undefined> {
    return this.consents.find(
      c => c.userId === userId && c.consentType === consentType
    );
  }

  /**
   * Check if consent requires version update
   */
  private requiresVersionUpdate(consent: ConsentRecord): boolean {
    if (consent.version !== this.CURRENT_VERSION) {
      const latestVersion = this.consentVersions.find(
        v => v.version === this.CURRENT_VERSION
      );
      return latestVersion?.requiresReConsent || false;
    }
    return false;
  }

  /**
   * Handle consent revocation (trigger data cleanup)
   */
  private async handleConsentRevocation(
    userId: string,
    consentType: ConsentType
  ): Promise<void> {
    // Map consent types to data categories
    const dataCategories: Record<ConsentType, string[]> = {
      [ConsentType.MEDICATION_DATA]: ['offline_medications'],
      [ConsentType.ADHERENCE_TRACKING]: ['offline_adherence'],
      [ConsentType.HEALTH_METRICS]: ['health_metrics'],
      [ConsentType.LOCATION_SERVICES]: ['location_data'],
      [ConsentType.FAMILY_SHARING]: ['family_shared_data'],
      [ConsentType.PROVIDER_SHARING]: ['provider_shared_data'],
      [ConsentType.ANALYTICS]: ['analytics_data'],
      [ConsentType.MARKETING]: ['marketing_data'],
      [ConsentType.THIRD_PARTY_SHARING]: ['third_party_data'],
    };

    const categories = dataCategories[consentType] || [];

    for (const category of categories) {
      // Request data deletion through DataRetentionManager
      // Implementation would integrate with DataRetentionManager
    }
  }

  /**
   * Track consent change in compliance monitoring
   */
  private async trackConsentChange(
    consent: ConsentRecord,
    action: 'granted' | 'revoked' | 'version_updated'
  ): Promise<void> {
    // Track in ComplianceMonitoringService
    console.log(`Consent ${action}:`, consent);
  }

  /**
   * Store consent in database
   */
  private async storeConsent(consent: ConsentRecord): Promise<void> {
    // Store in OfflineDatabase
  }

  /**
   * Generate unique consent ID
   */
  private generateConsentId(): string {
    return `consent_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Add new consent version
   */
  public addConsentVersion(version: ConsentVersion): void {
    this.consentVersions.push(version);
  }

  /**
   * Get current consent version
   */
  public getCurrentVersion(): string {
    return this.CURRENT_VERSION;
  }

  /**
   * Get all consent versions
   */
  public getConsentVersions(): ConsentVersion[] {
    return [...this.consentVersions];
  }
}

export default ConsentManagementService.getInstance();