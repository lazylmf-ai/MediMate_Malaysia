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
   * Generate sandbox test data for developers
   */
  public async generateSandboxData(
    developerId: string,
    dataType: 'patients' | 'appointments' | 'medications' | 'cultural_events' | 'prayer_times',
    options: {
      count?: number;
      malaysianProfiles?: {
        includeRaces?: string[];
        includeReligions?: string[];
        states?: string[];
        languages?: string[];
      };
      culturalConsiderations?: {
        includePrayerTimes?: boolean;
        includeHalalPreferences?: boolean;
        includeRamadanAdjustments?: boolean;
        includeCulturalEvents?: boolean;
      };
    } = {}
  ): Promise<{
    success: boolean;
    data: {
      generatedCount: number;
      dataType: string;
      generatedData: any[];
      culturalMetadata: {
        racialDistribution: Record<string, number>;
        religiousDistribution: Record<string, number>;
        languageDistribution: Record<string, number>;
        stateDistribution: Record<string, number>;
      };
      usageNotes: string[];
    };
    error?: string;
  }> {
    const developer = this.developers.get(developerId);
    if (!developer) {
      return { success: false, data: {} as any, error: 'Developer not found' };
    }

    const count = Math.min(options.count || 10, 100); // Max 100 items
    const generatedData: any[] = [];
    const culturalMetadata = {
      racialDistribution: {} as Record<string, number>,
      religiousDistribution: {} as Record<string, number>,
      languageDistribution: {} as Record<string, number>,
      stateDistribution: {} as Record<string, number>
    };

    // Malaysian data sets
    const malaysianRaces = options.malaysianProfiles?.includeRaces || ['Malay', 'Chinese', 'Indian', 'Iban', 'Kadazan'];
    const malaysianReligions = options.malaysianProfiles?.includeReligions || ['Islam', 'Buddhism', 'Christianity', 'Hinduism'];
    const malaysianStates = options.malaysianProfiles?.states || ['KUL', 'SGR', 'JHR', 'PNG', 'PRK', 'PHG', 'TRG', 'KTN', 'PLS', 'KDH', 'MLK', 'NSN', 'SWK'];
    const malaysianLanguages = options.malaysianProfiles?.languages || ['ms', 'en', 'zh', 'ta'];

    // Generate data based on type
    for (let i = 0; i < count; i++) {
      let item: any = {};

      // Randomly select Malaysian characteristics
      const race = malaysianRaces[Math.floor(Math.random() * malaysianRaces.length)];
      const religion = malaysianReligions[Math.floor(Math.random() * malaysianReligions.length)];
      const state = malaysianStates[Math.floor(Math.random() * malaysianStates.length)];
      const language = malaysianLanguages[Math.floor(Math.random() * malaysianLanguages.length)];

      // Update metadata
      culturalMetadata.racialDistribution[race] = (culturalMetadata.racialDistribution[race] || 0) + 1;
      culturalMetadata.religiousDistribution[religion] = (culturalMetadata.religiousDistribution[religion] || 0) + 1;
      culturalMetadata.languageDistribution[language] = (culturalMetadata.languageDistribution[language] || 0) + 1;
      culturalMetadata.stateDistribution[state] = (culturalMetadata.stateDistribution[state] || 0) + 1;

      switch (dataType) {
        case 'patients':
          item = this.generateMalaysianPatient(race, religion, state, language, options.culturalConsiderations);
          break;
        case 'appointments':
          item = this.generateMalaysianAppointment(state, language, options.culturalConsiderations);
          break;
        case 'medications':
          item = this.generateHalalMedication(religion === 'Islam');
          break;
        case 'cultural_events':
          item = this.generateCulturalEvent(state, religion);
          break;
        case 'prayer_times':
          item = this.generatePrayerTimeData(state);
          break;
      }

      generatedData.push(item);
    }

    const usageNotes = [
      'This is synthetic test data for development purposes only',
      'Data follows Malaysian healthcare patterns and cultural norms',
      'PDPA compliance features are included for testing',
      'Cultural considerations are embedded throughout the data',
      'Use this data to test integration scenarios safely'
    ];

    console.log(`🧪 Generated ${count} ${dataType} test items for developer ${developerId}`);

    return {
      success: true,
      data: {
        generatedCount: count,
        dataType,
        generatedData,
        culturalMetadata,
        usageNotes
      }
    };
  }

  /**
   * Generate Malaysian patient test data
   */
  private generateMalaysianPatient(race: string, religion: string, state: string, language: string, culturalOptions?: any): any {
    const malaysianNames = {
      Malay: { male: ['Ahmad', 'Ali', 'Hassan', 'Ibrahim'], female: ['Siti', 'Fatimah', 'Aminah', 'Khadijah'] },
      Chinese: { male: ['Wei Ming', 'Jia Wei', 'Kai Xin', 'Zhi Hao'], female: ['Li Hua', 'Mei Ling', 'Xiao Yu', 'Jing Yi'] },
      Indian: { male: ['Raj', 'Kumar', 'Suresh', 'Raman'], female: ['Priya', 'Kavitha', 'Meera', 'Asha'] }
    };

    const gender = Math.random() > 0.5 ? 'male' : 'female';
    const namePool = (malaysianNames as any)[race] || malaysianNames.Malay;
    const firstName = namePool[gender][Math.floor(Math.random() * namePool[gender].length)];

    return {
      patient_id: uuidv4(),
      personal_info: {
        name: `${firstName} ${race === 'Chinese' ? 'Tan' : race === 'Indian' ? 'Sharma' : 'bin Abdullah'}`,
        mykad_number: this.generateMyKadNumber(),
        date_of_birth: this.generateRandomDate(new Date('1950-01-01'), new Date('2005-12-31')),
        gender,
        race,
        religion,
        nationality: 'Malaysian'
      },
      contact_info: {
        phone: `+60${Math.floor(100000000 + Math.random() * 900000000)}`,
        email: `${firstName.toLowerCase().replace(' ', '')}@email.com`,
        address: {
          street: `${Math.floor(1 + Math.random() * 999)} Jalan ${race === 'Malay' ? 'Ampang' : race === 'Chinese' ? 'Petaling' : 'Brickfields'}`,
          city: this.getStateCapital(state),
          state: this.getStateName(state),
          postcode: `${Math.floor(10000 + Math.random() * 90000)}`,
          country: 'Malaysia'
        }
      },
      cultural_preferences: {
        primary_language: language,
        secondary_languages: language === 'ms' ? ['en'] : ['ms'],
        prayer_time_notifications: religion === 'Islam',
        halal_medication_only: religion === 'Islam',
        preferred_gender_provider: religion === 'Islam' ? 'same' : 'no_preference',
        ramadan_considerations: religion === 'Islam'
      },
      pdpa_consent: {
        data_processing: true,
        marketing: Math.random() > 0.5,
        third_party_sharing: false,
        consent_date: new Date().toISOString()
      },
      test_data_metadata: {
        generated_for_sandbox: true,
        cultural_profile: { race, religion, state, language }
      }
    };
  }

  /**
   * Generate Malaysian appointment test data
   */
  private generateMalaysianAppointment(state: string, language: string, culturalOptions?: any): any {
    const appointmentTypes = ['consultation', 'followup', 'procedure', 'emergency', 'telemedicine'];
    const providers = ['Dr. Ahmad Rahman', 'Dr. Li Wei', 'Dr. Priya Sharma'];
    
    return {
      appointment_id: uuidv4(),
      patient_id: uuidv4(),
      provider_id: uuidv4(),
      appointment_date: this.generateFutureDate(),
      appointment_time: this.generateAppointmentTime(culturalOptions?.includePrayerTimes),
      duration_minutes: [15, 30, 45, 60][Math.floor(Math.random() * 4)],
      appointment_type: appointmentTypes[Math.floor(Math.random() * appointmentTypes.length)],
      cultural_considerations: {
        avoid_prayer_times: true,
        ramadan_friendly: culturalOptions?.includeRamadanAdjustments || false,
        preferred_language: language,
        state_context: state
      },
      prayer_time_analysis: culturalOptions?.includePrayerTimes ? {
        conflicts_with_prayer: Math.random() > 0.8,
        recommended_adjustments: ['Consider scheduling 30 minutes after Dhuhr prayer']
      } : undefined,
      test_data_metadata: {
        generated_for_sandbox: true,
        cultural_context: { state, language }
      }
    };
  }

  /**
   * Generate Halal medication test data
   */
  private generateHalalMedication(isMuslim: boolean): any {
    const medications = [
      { name: 'Paracetamol 500mg', halal: true, manufacturer: 'Duopharma Biotech' },
      { name: 'Ibuprofen 200mg', halal: true, manufacturer: 'CCM Pharmaceuticals' },
      { name: 'Amoxicillin 250mg', halal: true, manufacturer: 'Pharmaniaga' },
      { name: 'Metformin 500mg', halal: true, manufacturer: 'Hovid' }
    ];

    const med = medications[Math.floor(Math.random() * medications.length)];
    
    return {
      medication_id: uuidv4(),
      name: med.name,
      generic_name: med.name.split(' ')[0],
      manufacturer: med.manufacturer,
      halal_status: med.halal ? 'halal' : 'mushbooh',
      halal_certification: med.halal ? {
        certified: true,
        authority: 'JAKIM',
        certificate_number: `MY-${Math.floor(100000 + Math.random() * 900000)}`,
        expiry_date: this.generateFutureDate()
      } : null,
      moh_approved: true,
      active_ingredients: [med.name.split(' ')[0].toLowerCase()],
      available_forms: ['tablet', 'capsule'],
      test_data_metadata: {
        generated_for_sandbox: true,
        patient_preference: { requires_halal: isMuslim }
      }
    };
  }

  /**
   * Generate cultural event test data
   */
  private generateCulturalEvent(state: string, religion: string): any {
    const events = {
      Islam: ['Eid al-Fitr', 'Eid al-Adha', 'Ramadan', 'Maulud Nabi'],
      Buddhism: ['Vesak Day', 'Chinese New Year'],
      Christianity: ['Christmas', 'Easter'],
      Hinduism: ['Deepavali', 'Thaipusam']
    };

    const religionEvents = (events as any)[religion] || events.Islam;
    const event = religionEvents[Math.floor(Math.random() * religionEvents.length)];

    return {
      event_id: uuidv4(),
      name: event,
      religion,
      date: this.generateFutureDate(),
      state,
      healthcare_considerations: {
        fasting_involved: event === 'Ramadan',
        special_dietary_requirements: event.includes('Eid') || event === 'Deepavali',
        recommended_schedule_adjustments: ['Avoid early morning appointments', 'Consider cultural sensitivities']
      },
      test_data_metadata: {
        generated_for_sandbox: true,
        cultural_context: { state, religion }
      }
    };
  }

  /**
   * Generate prayer time test data
   */
  private generatePrayerTimeData(state: string): any {
    const today = new Date();
    return {
      state_code: state,
      state_name: this.getStateName(state),
      date: today.toISOString().split('T')[0],
      prayer_times: {
        fajr: '05:45',
        sunrise: '07:15',
        dhuhr: '13:15',
        asr: '16:30',
        maghrib: '19:25',
        isha: '20:35'
      },
      healthcare_considerations: {
        avoid_times: [
          { prayer: 'Dhuhr', time_range: { start: '13:10', end: '13:30' } },
          { prayer: 'Asr', time_range: { start: '16:25', end: '16:45' } }
        ],
        optimal_appointment_windows: [
          { start: '08:00', end: '12:00', description: 'Morning - after Fajr' },
          { start: '14:00', end: '16:00', description: 'Afternoon - between Dhuhr and Asr' }
        ]
      },
      test_data_metadata: {
        generated_for_sandbox: true,
        state_context: state
      }
    };
  }

  // Helper methods for data generation
  private generateMyKadNumber(): string {
    const year = Math.floor(Math.random() * 50) + 60; // 60-110 (representing years 1960-2010)
    const month = Math.floor(Math.random() * 12) + 1;
    const day = Math.floor(Math.random() * 28) + 1;
    const location = Math.floor(Math.random() * 99) + 1;
    const serial = Math.floor(Math.random() * 9999) + 1000;
    
    return `${year.toString().padStart(2, '0')}${month.toString().padStart(2, '0')}${day.toString().padStart(2, '0')}-${location.toString().padStart(2, '0')}-${serial}`;
  }

  private generateRandomDate(start: Date, end: Date): string {
    const date = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
    return date.toISOString().split('T')[0];
  }

  private generateFutureDate(): string {
    const today = new Date();
    const futureDate = new Date(today.getTime() + Math.random() * 365 * 24 * 60 * 60 * 1000);
    return futureDate.toISOString().split('T')[0];
  }

  private generateAppointmentTime(avoidPrayer?: boolean): string {
    const hours = [8, 9, 10, 11, 14, 15, 16, 17]; // Avoiding prayer times
    const hour = hours[Math.floor(Math.random() * hours.length)];
    const minutes = ['00', '15', '30', '45'][Math.floor(Math.random() * 4)];
    return `${hour.toString().padStart(2, '0')}:${minutes}`;
  }

  private getStateCapital(stateCode: string): string {
    const capitals: Record<string, string> = {
      'KUL': 'Kuala Lumpur', 'SGR': 'Shah Alam', 'JHR': 'Johor Bahru',
      'PNG': 'George Town', 'PRK': 'Ipoh', 'PHG': 'Kuantan',
      'TRG': 'Kuala Terengganu', 'KTN': 'Kota Bharu', 'PLS': 'Kangar',
      'KDH': 'Alor Setar', 'MLK': 'Malacca City', 'NSN': 'Seremban', 'SWK': 'Kuching'
    };
    return capitals[stateCode] || 'Kuala Lumpur';
  }

  private getStateName(stateCode: string): string {
    const states: Record<string, string> = {
      'KUL': 'Kuala Lumpur', 'SGR': 'Selangor', 'JHR': 'Johor',
      'PNG': 'Penang', 'PRK': 'Perak', 'PHG': 'Pahang',
      'TRG': 'Terengganu', 'KTN': 'Kelantan', 'PLS': 'Perlis',
      'KDH': 'Kedah', 'MLK': 'Melaka', 'NSN': 'Negeri Sembilan', 'SWK': 'Sarawak'
    };
    return states[stateCode] || 'Kuala Lumpur';
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
      sandboxDataGenerated: number;
      culturalApiUsage: number;
    };
  } {
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentRequests = this.usageLog.filter(usage => usage.timestamp > oneHourAgo);
    const culturalRequests = this.usageLog.filter(usage => 
      usage.endpoint.includes('/cultural/') || usage.culturalFeature
    );

    return {
      status: 'healthy',
      statistics: {
        totalDevelopers: this.developers.size,
        totalApiKeys: this.apiKeys.size,
        activeApiKeys: Array.from(this.apiKeys.values()).filter(key => key.isActive).length,
        totalRequests: this.usageLog.length,
        requestsLastHour: recentRequests.length,
        sandboxDataGenerated: 0, // Would track from database
        culturalApiUsage: culturalRequests.length
      }
    };
  }
}

export default ApiKeyService;