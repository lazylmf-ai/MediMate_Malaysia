/**
 * API Key Management Service for MediMate Malaysia Developer Portal
 * Handles generation, validation, and management of developer API keys
 */

import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

export interface ApiKey {
  id: string;
  name: string;
  key: string;
  keyHash: string;
  developerId: string;
  permissions: string[];
  isActive: boolean;
  usageCount: number;
  lastUsed: Date | null;
  rateLimits: {
    requestsPerMinute: number;
    requestsPerDay: number;
    burstLimit: number;
  };
  culturalFeatures: {
    prayerTimeAccess: boolean;
    halalValidationAccess: boolean;
    translationAccess: boolean;
    culturalCalendarAccess: boolean;
  };
  malaysianCompliance: {
    pdpaCompliant: boolean;
    mohApproved: boolean;
    auditTrail: boolean;
  };
  metadata: {
    environment: 'development' | 'staging' | 'production';
    ipWhitelist: string[];
    webhookUrls: string[];
    sdkVersion?: string;
    applicationName?: string;
  };
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date | null;
}

export interface ApiKeyUsage {
  keyId: string;
  timestamp: Date;
  endpoint: string;
  method: string;
  responseTime: number;
  statusCode: number;
  culturalFeature?: string;
  malaysianState?: string;
  language?: string;
  userAgent?: string;
  ipAddress: string;
}

export interface DeveloperAccount {
  id: string;
  email: string;
  name: string;
  organization?: string;
  malaysianHealthcareProvider: boolean;
  mohRegistrationNumber?: string;
  verificationStatus: 'pending' | 'verified' | 'suspended';
  subscriptionTier: 'free' | 'basic' | 'professional' | 'enterprise';
  culturalPreferences: {
    defaultLanguage: string;
    preferredStates: string[];
    halalRequirements: boolean;
  };
  createdAt: Date;
  lastLoginAt: Date;
}

export class ApiKeyService {
  private static instance: ApiKeyService;
  private apiKeys: Map<string, ApiKey> = new Map();
  private developers: Map<string, DeveloperAccount> = new Map();
  private usageLog: ApiKeyUsage[] = [];
  private keyPrefix = 'mk'; // MediMate Key prefix

  public static getInstance(): ApiKeyService {
    if (!ApiKeyService.instance) {
      ApiKeyService.instance = new ApiKeyService();
    }
    return ApiKeyService.instance;
  }

  /**
   * Generate a new API key for a developer
   */
  public async generateApiKey(
    developerId: string,
    keyName: string,
    options: {
      environment?: 'development' | 'staging' | 'production';
      permissions?: string[];
      culturalFeatures?: Partial<ApiKey['culturalFeatures']>;
      rateLimits?: Partial<ApiKey['rateLimits']>;
      expiresInDays?: number;
      applicationName?: string;
    } = {}
  ): Promise<{ apiKey: ApiKey; plainKey: string }> {
    const developer = this.developers.get(developerId);
    if (!developer) {
      throw new Error('Developer not found');
    }

    // Generate secure API key
    const keyId = uuidv4();
    const environment = options.environment || 'development';
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(16).toString('hex');
    
    const plainKey = `${this.keyPrefix}_${environment === 'development' ? 'test' : 'live'}_${timestamp}${random}`;
    const keyHash = await bcrypt.hash(plainKey, 12);

    // Set default permissions based on subscription tier
    const defaultPermissions = this.getDefaultPermissions(developer.subscriptionTier);
    const permissions = options.permissions || defaultPermissions;

    // Set default rate limits based on subscription tier
    const defaultRateLimits = this.getDefaultRateLimits(developer.subscriptionTier);
    const rateLimits = {
      ...defaultRateLimits,
      ...options.rateLimits
    };

    // Set default cultural features
    const culturalFeatures = {
      prayerTimeAccess: true,
      halalValidationAccess: developer.culturalPreferences.halalRequirements,
      translationAccess: true,
      culturalCalendarAccess: true,
      ...options.culturalFeatures
    };

    // Set Malaysian compliance features
    const malaysianCompliance = {
      pdpaCompliant: true,
      mohApproved: developer.malaysianHealthcareProvider,
      auditTrail: true
    };

    const expiresAt = options.expiresInDays 
      ? new Date(Date.now() + options.expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    const apiKey: ApiKey = {
      id: keyId,
      name: keyName,
      key: plainKey, // Only for response, not stored
      keyHash,
      developerId,
      permissions,
      isActive: true,
      usageCount: 0,
      lastUsed: null,
      rateLimits,
      culturalFeatures,
      malaysianCompliance,
      metadata: {
        environment,
        ipWhitelist: [],
        webhookUrls: [],
        applicationName: options.applicationName
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      expiresAt
    };

    // Store API key (without plain key)
    const storedKey = { ...apiKey };
    delete (storedKey as any).key;
    this.apiKeys.set(keyId, storedKey);

    // Log key generation
    console.log(`🔑 API Key generated for developer ${developer.email}: ${keyName}`);
    
    // In production, you would also:
    // 1. Store in database
    // 2. Send notification to developer
    // 3. Log security event
    // 4. Update developer's key quota

    return { apiKey: storedKey, plainKey };
  }

  /**
   * Validate API key and return key information
   */
  public async validateApiKey(plainKey: string): Promise<{
    isValid: boolean;
    apiKey?: ApiKey;
    error?: string;
  }> {
    try {
      // Find the key by checking all stored keys
      for (const [keyId, apiKey] of this.apiKeys) {
        const isMatch = await bcrypt.compare(plainKey, apiKey.keyHash);
        
        if (isMatch) {
          // Check if key is active
          if (!apiKey.isActive) {
            return { isValid: false, error: 'API key is inactive' };
          }

          // Check if key is expired
          if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
            return { isValid: false, error: 'API key has expired' };
          }

          // Check developer status
          const developer = this.developers.get(apiKey.developerId);
          if (!developer || developer.verificationStatus === 'suspended') {
            return { isValid: false, error: 'Developer account is suspended' };
          }

          return { isValid: true, apiKey };
        }
      }

      return { isValid: false, error: 'Invalid API key' };
    } catch (error) {
      console.error('Error validating API key:', error);
      return { isValid: false, error: 'API key validation failed' };
    }
  }

  /**
   * Log API key usage
   */
  public async logApiKeyUsage(
    apiKey: ApiKey,
    usage: Omit<ApiKeyUsage, 'keyId' | 'timestamp'>
  ): Promise<void> {
    const usageRecord: ApiKeyUsage = {
      keyId: apiKey.id,
      timestamp: new Date(),
      ...usage
    };

    this.usageLog.push(usageRecord);

    // Update key usage statistics
    apiKey.usageCount += 1;
    apiKey.lastUsed = new Date();
    apiKey.updatedAt = new Date();

    // Store updated key
    this.apiKeys.set(apiKey.id, apiKey);

    // In production, you would:
    // 1. Store usage in database
    // 2. Update real-time analytics
    // 3. Check rate limits
    // 4. Send usage alerts if needed

    console.log(`📊 API usage logged: ${usage.method} ${usage.endpoint} (${usage.statusCode})`);
  }

  /**
   * Get API key usage statistics
   */
  public getApiKeyUsage(
    keyId: string,
    options: {
      startDate?: Date;
      endDate?: Date;
      endpoint?: string;
      culturalFeature?: string;
    } = {}
  ): {
    totalRequests: number;
    requestsByDay: Record<string, number>;
    requestsByEndpoint: Record<string, number>;
    requestsByCulturalFeature: Record<string, number>;
    averageResponseTime: number;
    errorRate: number;
  } {
    const keyUsage = this.usageLog.filter(usage => {
      if (usage.keyId !== keyId) return false;
      if (options.startDate && usage.timestamp < options.startDate) return false;
      if (options.endDate && usage.timestamp > options.endDate) return false;
      if (options.endpoint && !usage.endpoint.includes(options.endpoint)) return false;
      if (options.culturalFeature && usage.culturalFeature !== options.culturalFeature) return false;
      return true;
    });

    const totalRequests = keyUsage.length;
    const requestsByDay: Record<string, number> = {};
    const requestsByEndpoint: Record<string, number> = {};
    const requestsByCulturalFeature: Record<string, number> = {};
    let totalResponseTime = 0;
    let errorCount = 0;

    keyUsage.forEach(usage => {
      // Group by day
      const day = usage.timestamp.toISOString().split('T')[0];
      requestsByDay[day] = (requestsByDay[day] || 0) + 1;

      // Group by endpoint
      requestsByEndpoint[usage.endpoint] = (requestsByEndpoint[usage.endpoint] || 0) + 1;

      // Group by cultural feature
      if (usage.culturalFeature) {
        requestsByCulturalFeature[usage.culturalFeature] = (requestsByCulturalFeature[usage.culturalFeature] || 0) + 1;
      }

      // Calculate averages and errors
      totalResponseTime += usage.responseTime;
      if (usage.statusCode >= 400) {
        errorCount += 1;
      }
    });

    return {
      totalRequests,
      requestsByDay,
      requestsByEndpoint,
      requestsByCulturalFeature,
      averageResponseTime: totalRequests > 0 ? totalResponseTime / totalRequests : 0,
      errorRate: totalRequests > 0 ? (errorCount / totalRequests) * 100 : 0
    };
  }

  /**
   * List API keys for a developer
   */
  public listApiKeys(developerId: string): ApiKey[] {
    return Array.from(this.apiKeys.values())
      .filter(key => key.developerId === developerId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Revoke an API key
   */
  public async revokeApiKey(keyId: string, developerId: string): Promise<boolean> {
    const apiKey = this.apiKeys.get(keyId);
    
    if (!apiKey || apiKey.developerId !== developerId) {
      return false;
    }

    apiKey.isActive = false;
    apiKey.updatedAt = new Date();
    
    this.apiKeys.set(keyId, apiKey);

    console.log(`🔒 API Key revoked: ${apiKey.name} for developer ${developerId}`);
    return true;
  }

  /**
   * Update API key settings
   */
  public async updateApiKey(
    keyId: string,
    developerId: string,
    updates: Partial<Pick<ApiKey, 'name' | 'metadata' | 'rateLimits' | 'culturalFeatures'>>
  ): Promise<ApiKey | null> {
    const apiKey = this.apiKeys.get(keyId);
    
    if (!apiKey || apiKey.developerId !== developerId) {
      return null;
    }

    const updatedKey = {
      ...apiKey,
      ...updates,
      updatedAt: new Date()
    };

    this.apiKeys.set(keyId, updatedKey);
    return updatedKey;
  }

  /**
   * Register a new developer account
   */
  public async registerDeveloper(
    email: string,
    name: string,
    options: {
      organization?: string;
      malaysianHealthcareProvider?: boolean;
      mohRegistrationNumber?: string;
      culturalPreferences?: Partial<DeveloperAccount['culturalPreferences']>;
    } = {}
  ): Promise<DeveloperAccount> {
    const developerId = uuidv4();

    const developer: DeveloperAccount = {
      id: developerId,
      email,
      name,
      organization: options.organization,
      malaysianHealthcareProvider: options.malaysianHealthcareProvider || false,
      mohRegistrationNumber: options.mohRegistrationNumber,
      verificationStatus: 'pending',
      subscriptionTier: 'free',
      culturalPreferences: {
        defaultLanguage: 'en',
        preferredStates: [],
        halalRequirements: false,
        ...options.culturalPreferences
      },
      createdAt: new Date(),
      lastLoginAt: new Date()
    };

    this.developers.set(developerId, developer);

    console.log(`👤 Developer registered: ${email}`);
    return developer;
  }

  /**
   * Get default permissions based on subscription tier
   */
  private getDefaultPermissions(tier: DeveloperAccount['subscriptionTier']): string[] {
    const permissions = {
      free: ['read:basic', 'read:cultural', 'read:prayer-times'],
      basic: ['read:*', 'write:basic', 'read:halal-validation'],
      professional: ['read:*', 'write:*', 'read:analytics', 'webhook:basic'],
      enterprise: ['*']
    };

    return permissions[tier] || permissions.free;
  }

  /**
   * Get default rate limits based on subscription tier
   */
  private getDefaultRateLimits(tier: DeveloperAccount['subscriptionTier']): ApiKey['rateLimits'] {
    const rateLimits = {
      free: { requestsPerMinute: 30, requestsPerDay: 1000, burstLimit: 5 },
      basic: { requestsPerMinute: 100, requestsPerDay: 10000, burstLimit: 20 },
      professional: { requestsPerMinute: 500, requestsPerDay: 100000, burstLimit: 50 },
      enterprise: { requestsPerMinute: 2000, requestsPerDay: 1000000, burstLimit: 100 }
    };

    return rateLimits[tier] || rateLimits.free;
  }

  /**
   * Check rate limits for an API key
   */
  public async checkRateLimit(apiKey: ApiKey): Promise<{
    allowed: boolean;
    limits: {
      requestsPerMinute: { limit: number; current: number; resetTime: Date };
      requestsPerDay: { limit: number; current: number; resetTime: Date };
    };
  }> {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Count requests in the last minute and day
    const recentUsage = this.usageLog.filter(usage => 
      usage.keyId === apiKey.id && usage.timestamp > oneMinuteAgo
    );
    const dailyUsage = this.usageLog.filter(usage => 
      usage.keyId === apiKey.id && usage.timestamp > oneDayAgo
    );

    const minuteCount = recentUsage.length;
    const dayCount = dailyUsage.length;

    const allowed = minuteCount < apiKey.rateLimits.requestsPerMinute && 
                   dayCount < apiKey.rateLimits.requestsPerDay;

    return {
      allowed,
      limits: {
        requestsPerMinute: {
          limit: apiKey.rateLimits.requestsPerMinute,
          current: minuteCount,
          resetTime: new Date(now.getTime() + 60 * 1000)
        },
        requestsPerDay: {
          limit: apiKey.rateLimits.requestsPerDay,
          current: dayCount,
          resetTime: new Date(now.getTime() + 24 * 60 * 60 * 1000)
        }
      }
    };
  }

  /**
   * Get service health status
   */
  public getServiceStatus(): {
    status: 'healthy' | 'degraded' | 'error';
    statistics: {
      totalDevelopers: number;
      totalApiKeys: number;
      activeApiKeys: number;
      totalRequests: number;
      requestsLastHour: number;
    };
  } {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentRequests = this.usageLog.filter(usage => usage.timestamp > oneHourAgo);

    return {
      status: 'healthy',
      statistics: {
        totalDevelopers: this.developers.size,
        totalApiKeys: this.apiKeys.size,
        activeApiKeys: Array.from(this.apiKeys.values()).filter(key => key.isActive).length,
        totalRequests: this.usageLog.length,
        requestsLastHour: recentRequests.length
      }
    };
  }
}

export default ApiKeyService;