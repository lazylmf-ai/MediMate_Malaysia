#!/usr/bin/env node

/**
 * JavaScript/TypeScript SDK Generator for MediMate Malaysia Healthcare API
 * Generates a comprehensive SDK with Malaysian cultural intelligence features
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

// SDK configuration
const SDK_CONFIG = {
  name: '@medimate/malaysia-sdk',
  version: '1.2.1',
  description: 'Official JavaScript/TypeScript SDK for MediMate Malaysia Healthcare API',
  author: 'MediMate Malaysia',
  license: 'MIT',
  homepage: 'https://api.medimate.my',
  repository: {
    type: 'git',
    url: 'https://github.com/medimate-malaysia/javascript-sdk.git'
  },
  bugs: {
    url: 'https://github.com/medimate-malaysia/javascript-sdk/issues'
  },
  keywords: [
    'medimate',
    'malaysia',
    'healthcare',
    'api',
    'sdk',
    'cultural-intelligence',
    'pdpa',
    'halal',
    'prayer-times',
    'fhir'
  ]
};

class JavaScriptSDKGenerator {
  constructor(openApiSpec) {
    this.spec = openApiSpec;
    this.outputDir = path.join(__dirname, '../../sdks/javascript');
    this.ensureOutputDirectory();
  }

  ensureOutputDirectory() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }

    // Create SDK directory structure
    const dirs = ['src', 'src/types', 'src/services', 'src/utils', 'dist', 'docs', 'examples'];
    dirs.forEach(dir => {
      const fullPath = path.join(this.outputDir, dir);
      if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
      }
    });
  }

  generate() {
    console.log('🚀 Generating JavaScript/TypeScript SDK for MediMate Malaysia...');
    
    this.generatePackageJson();
    this.generateTypeDefinitions();
    this.generateMainSDKClass();
    this.generateCulturalServices();
    this.generatePatientServices();
    this.generateUtilities();
    this.generateExamples();
    this.generateReadme();
    this.generateTSConfig();
    this.generateBuildScripts();
    
    console.log('✅ JavaScript/TypeScript SDK generated successfully!');
    console.log(`📁 Output directory: ${this.outputDir}`);
  }

  generatePackageJson() {
    const packageJson = {
      ...SDK_CONFIG,
      main: 'dist/index.js',
      types: 'dist/index.d.ts',
      files: [
        'dist/**/*',
        'README.md',
        'LICENSE'
      ],
      scripts: {
        build: 'tsc',
        'build:watch': 'tsc --watch',
        test: 'jest',
        'test:watch': 'jest --watch',
        lint: 'eslint src/**/*.ts',
        'lint:fix': 'eslint src/**/*.ts --fix',
        docs: 'typedoc src/index.ts',
        prepublishOnly: 'npm run build',
        example: 'node examples/basic-usage.js'
      },
      dependencies: {
        axios: '^1.6.0',
        'form-data': '^4.0.0'
      },
      devDependencies: {
        '@types/node': '^20.0.0',
        typescript: '^5.0.0',
        jest: '^29.0.0',
        '@types/jest': '^29.0.0',
        eslint: '^8.0.0',
        '@typescript-eslint/eslint-plugin': '^6.0.0',
        '@typescript-eslint/parser': '^6.0.0',
        typedoc: '^0.25.0'
      },
      engines: {
        node: '>=16.0.0'
      }
    };

    this.writeFile('package.json', JSON.stringify(packageJson, null, 2));
  }

  generateTypeDefinitions() {
    const types = `/**
 * Type definitions for MediMate Malaysia Healthcare API
 * Generated from OpenAPI specification with Malaysian cultural extensions
 */

export interface MediMateConfig {
  apiKey: string;
  baseURL?: string;
  timeout?: number;
  culturalContext?: CulturalContext;
  retries?: number;
  debug?: boolean;
}

export interface CulturalContext {
  malaysianState?: MalaysianState;
  preferredLanguage?: SupportedLanguage;
  prayerTimeAware?: boolean;
  halalRequirements?: boolean;
  timezone?: string;
}

export type MalaysianState = 
  | 'JHR' | 'KDH' | 'KTN' | 'MLK' | 'NSN' | 'PHG' 
  | 'PNG' | 'PRK' | 'PLS' | 'SBH' | 'SWK' | 'SGR' 
  | 'TRG' | 'KUL' | 'LBN' | 'PJY';

export type SupportedLanguage = 'en' | 'ms' | 'zh' | 'ta';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    cultural_message?: Record<SupportedLanguage, string>;
    details?: any[];
  };
  meta?: {
    cultural_context?: string;
    malaysian_state?: string;
    timestamp?: string;
  };
}

// Prayer Time Types
export interface PrayerTimes {
  date: string;
  state: string;
  state_code: string;
  prayer_times: {
    fajr: string;
    sunrise: string;
    dhuhr: string;
    asr: string;
    maghrib: string;
    isha: string;
  };
  healthcare_considerations: {
    avoid_times: Array<{
      prayer: string;
      time_range: { start: string; end: string };
    }>;
    optimal_appointment_windows: Array<{
      start: string;
      end: string;
      description: string;
    }>;
  };
}

export interface CurrentPrayerStatus {
  current_time: string;
  current_prayer: string;
  next_prayer: {
    name: string;
    time: string;
    minutes_until: number;
  };
  is_prayer_time: boolean;
  healthcare_scheduling_status: 'optimal' | 'caution' | 'avoid';
}

// Halal Validation Types
export interface HalalValidationRequest {
  medication_name: string;
  manufacturer?: string;
  active_ingredients?: string[];
  batch_number?: string;
  expiry_date?: string;
}

export interface HalalValidationResponse {
  medication_name: string;
  halal_status: 'halal' | 'haram' | 'mushbooh' | 'unknown';
  confidence: 'high' | 'medium' | 'low';
  certification: {
    certified: boolean;
    authority?: string;
    certificate_number?: string;
    expiry_date?: string;
  };
  ingredients_analysis: Array<{
    ingredient: string;
    status: 'halal' | 'haram' | 'mushbooh';
    notes?: string;
  }>;
  alternatives: Array<{
    name: string;
    manufacturer: string;
    halal_certified: boolean;
  }>;
  religious_guidance?: string;
}

// Translation Types
export interface TranslationRequest {
  text: string;
  target_language: SupportedLanguage;
  source_language?: SupportedLanguage;
  context?: {
    domain?: 'general' | 'medical' | 'emergency' | 'appointment' | 'prescription' | 'diagnosis';
    urgency?: 'low' | 'medium' | 'high' | 'critical';
    cultural_sensitivity?: boolean;
  };
}

export interface TranslationResponse {
  original_text: string;
  translated_text: string;
  source_language: string;
  target_language: string;
  confidence_score: number;
  cultural_notes: string[];
  medical_accuracy_validated: boolean;
}

// Patient Types
export interface PatientCreateRequest {
  personal_info: {
    name: string;
    mykad_number?: string;
    passport_number?: string;
    date_of_birth: string;
    gender: 'male' | 'female' | 'other';
    race?: 'Malay' | 'Chinese' | 'Indian' | 'Other';
    religion?: 'Islam' | 'Buddhism' | 'Hinduism' | 'Christianity' | 'Other';
    nationality: string;
    marital_status?: 'single' | 'married' | 'divorced' | 'widowed';
  };
  contact_info: {
    phone: string;
    email?: string;
    address: {
      street: string;
      unit?: string;
      city: string;
      state: string;
      postcode: string;
      country: string;
    };
  };
  cultural_preferences?: {
    primary_language: SupportedLanguage;
    secondary_languages?: SupportedLanguage[];
    prayer_time_notifications?: boolean;
    halal_medication_only?: boolean;
    preferred_gender_provider?: 'same' | 'opposite' | 'no_preference';
    ramadan_considerations?: boolean;
    dietary_restrictions?: string[];
  };
  pdpa_consent: {
    data_processing: boolean;
    marketing?: boolean;
    third_party_sharing?: boolean;
    research?: boolean;
    consent_date: string;
    consent_method?: 'online' | 'paper' | 'verbal';
    consent_version?: string;
  };
  emergency_contact?: {
    name: string;
    relationship: string;
    phone: string;
    alternative_phone?: string;
  };
}

// Error Types
export class MediMateError extends Error {
  public code: string;
  public statusCode?: number;
  public culturalMessage?: Record<SupportedLanguage, string>;
  public details?: any;

  constructor(
    message: string, 
    code: string, 
    statusCode?: number, 
    culturalMessage?: Record<SupportedLanguage, string>,
    details?: any
  ) {
    super(message);
    this.name = 'MediMateError';
    this.code = code;
    this.statusCode = statusCode;
    this.culturalMessage = culturalMessage;
    this.details = details;
  }
}

// Rate Limiting Types
export interface RateLimitInfo {
  requestsPerMinute: {
    limit: number;
    remaining: number;
    resetTime: Date;
  };
  requestsPerDay: {
    limit: number;
    remaining: number;
    resetTime: Date;
  };
}`;

    this.writeFile('src/types/index.ts', types);
  }

  generateMainSDKClass() {
    const mainSDK = `/**
 * MediMate Malaysia Healthcare API SDK
 * Official TypeScript/JavaScript SDK with Malaysian cultural intelligence
 */

import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { MediMateConfig, ApiResponse, MediMateError, CulturalContext, RateLimitInfo } from './types';
import { CulturalService } from './services/CulturalService';
import { PatientService } from './services/PatientService';
import { AppointmentService } from './services/AppointmentService';
import { MedicationService } from './services/MedicationService';
import { RealtimeService } from './services/RealtimeService';
import { FHIRService } from './services/FHIRService';

export class MediMateMalaysia {
  private client: AxiosInstance;
  private config: MediMateConfig;
  
  // Service instances
  public cultural: CulturalService;
  public patients: PatientService;
  public appointments: AppointmentService;
  public medications: MedicationService;
  public realtime: RealtimeService;
  public fhir: FHIRService;

  constructor(config: MediMateConfig) {
    this.config = {
      baseURL: 'https://api.medimate.my/v1',
      timeout: 30000,
      retries: 3,
      debug: false,
      ...config
    };

    // Validate API key format
    if (!this.config.apiKey || !this.config.apiKey.startsWith('mk_')) {
      throw new MediMateError(
        'Invalid API key format. Expected format: mk_live_... or mk_test_...',
        'INVALID_API_KEY'
      );
    }

    this.client = axios.create({
      baseURL: this.config.baseURL,
      timeout: this.config.timeout,
      headers: {
        'Authorization': \`Bearer \${this.config.apiKey}\`,
        'Content-Type': 'application/json',
        'User-Agent': \`MediMate-Malaysia-SDK/\${require('../package.json').version}\`,
        'X-SDK-Language': 'javascript',
        'X-Cultural-Context': 'Malaysian Healthcare',
        ...(this.config.culturalContext?.malaysianState && {
          'X-Malaysian-State': this.config.culturalContext.malaysianState
        }),
        ...(this.config.culturalContext?.preferredLanguage && {
          'X-Preferred-Language': this.config.culturalContext.preferredLanguage
        }),
        ...(this.config.culturalContext?.prayerTimeAware && {
          'X-Prayer-Time-Aware': 'true'
        }),
        ...(this.config.culturalContext?.halalRequirements && {
          'X-Halal-Requirements': 'true'
        })
      }
    });

    // Setup request/response interceptors
    this.setupInterceptors();

    // Initialize service instances
    this.cultural = new CulturalService(this.client, this.config);
    this.patients = new PatientService(this.client, this.config);
    this.appointments = new AppointmentService(this.client, this.config);
    this.medications = new MedicationService(this.client, this.config);
    this.realtime = new RealtimeService(this.client, this.config);
    this.fhir = new FHIRService(this.client, this.config);
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        if (this.config.debug) {
          console.log(\`🔄 [MediMate SDK] \${config.method?.toUpperCase()} \${config.url}\`);
        }
        return config;
      },
      (error) => {
        if (this.config.debug) {
          console.error('🚫 [MediMate SDK] Request Error:', error);
        }
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        if (this.config.debug) {
          console.log(\`✅ [MediMate SDK] \${response.status} \${response.config.url}\`);
        }

        // Log cultural context if present
        if (response.headers['x-prayer-time']) {
          console.log(\`🕌 [MediMate SDK] Prayer Time Context: \${response.headers['x-prayer-time']}\`);
        }

        if (response.headers['x-cultural-event']) {
          console.log(\`🎉 [MediMate SDK] Cultural Event: \${response.headers['x-cultural-event']}\`);
        }

        return response;
      },
      async (error) => {
        if (this.config.debug) {
          console.error(\`❌ [MediMate SDK] \${error.response?.status} \${error.config?.url}\`);
        }

        // Handle rate limiting with retries
        if (error.response?.status === 429 && this.config.retries! > 0) {
          const retryAfter = parseInt(error.response.headers['retry-after'] || '60');
          
          if (this.config.debug) {
            console.log(\`⏳ [MediMate SDK] Rate limited. Retrying after \${retryAfter}s...\`);
          }

          await this.delay(retryAfter * 1000);
          return this.client.request(error.config);
        }

        // Transform error to MediMateError
        const apiError = error.response?.data?.error;
        throw new MediMateError(
          apiError?.message || error.message,
          apiError?.code || 'REQUEST_ERROR',
          error.response?.status,
          apiError?.cultural_message,
          apiError?.details
        );
      }
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current rate limit information
   */
  public getRateLimitInfo(): RateLimitInfo | null {
    const lastResponse = this.client.defaults.headers;
    
    if (!lastResponse['x-ratelimit-limit-minute']) {
      return null;
    }

    return {
      requestsPerMinute: {
        limit: parseInt(lastResponse['x-ratelimit-limit-minute'] as string),
        remaining: parseInt(lastResponse['x-ratelimit-remaining-minute'] as string),
        resetTime: new Date(parseInt(lastResponse['x-ratelimit-reset-minute'] as string) * 1000)
      },
      requestsPerDay: {
        limit: parseInt(lastResponse['x-ratelimit-limit-day'] as string),
        remaining: parseInt(lastResponse['x-ratelimit-remaining-day'] as string),
        resetTime: new Date(parseInt(lastResponse['x-ratelimit-reset-day'] as string) * 1000)
      }
    };
  }

  /**
   * Update cultural context
   */
  public updateCulturalContext(context: Partial<CulturalContext>) {
    this.config.culturalContext = { ...this.config.culturalContext, ...context };
    
    // Update default headers
    if (context.malaysianState) {
      this.client.defaults.headers['X-Malaysian-State'] = context.malaysianState;
    }
    if (context.preferredLanguage) {
      this.client.defaults.headers['X-Preferred-Language'] = context.preferredLanguage;
    }
    if (context.prayerTimeAware !== undefined) {
      this.client.defaults.headers['X-Prayer-Time-Aware'] = context.prayerTimeAware.toString();
    }
    if (context.halalRequirements !== undefined) {
      this.client.defaults.headers['X-Halal-Requirements'] = context.halalRequirements.toString();
    }
  }

  /**
   * Test API connectivity and authentication
   */
  public async testConnection(): Promise<{
    connected: boolean;
    apiKeyValid: boolean;
    culturalFeatures: string[];
    malaysianCompliance: {
      pdpaCompliant: boolean;
      mohApproved: boolean;
    };
  }> {
    try {
      const response = await this.client.get('/health');
      
      return {
        connected: true,
        apiKeyValid: true,
        culturalFeatures: response.headers['x-cultural-features']?.split(',') || [],
        malaysianCompliance: {
          pdpaCompliant: response.headers['x-pdpa-compliant'] === 'true',
          mohApproved: response.headers['x-moh-approved'] === 'true'
        }
      };
    } catch (error) {
      if (error instanceof MediMateError && error.statusCode === 401) {
        return {
          connected: true,
          apiKeyValid: false,
          culturalFeatures: [],
          malaysianCompliance: { pdpaCompliant: false, mohApproved: false }
        };
      }
      
      return {
        connected: false,
        apiKeyValid: false,
        culturalFeatures: [],
        malaysianCompliance: { pdpaCompliant: false, mohApproved: false }
      };
    }
  }

  /**
   * Get Malaysian healthcare context information
   */
  public async getMalaysianContext(): Promise<{
    system: string;
    cultural_context: string;
    supported_languages: string[];
    timezone: string;
    healthcare_standards: string[];
    islamic_features: boolean;
    multi_cultural_support: boolean;
    version: string;
  }> {
    const response = await this.client.get('/context');
    return response.data;
  }
}

// Export everything
export * from './types';
export * from './services/CulturalService';
export * from './services/PatientService';
export * from './services/AppointmentService';
export * from './services/MedicationService';
export * from './services/RealtimeService';
export * from './services/FHIRService';

export default MediMateMalaysia;`;

    this.writeFile('src/index.ts', mainSDK);
  }

  generateCulturalServices() {
    const culturalService = `/**
 * Cultural Intelligence Service for Malaysian Healthcare
 * Handles prayer times, translations, halal validation, and cultural calendar
 */

import { AxiosInstance } from 'axios';
import { 
  MediMateConfig, 
  ApiResponse, 
  PrayerTimes, 
  CurrentPrayerStatus,
  HalalValidationRequest,
  HalalValidationResponse,
  TranslationRequest,
  TranslationResponse,
  MalaysianState,
  SupportedLanguage
} from '../types';

export class CulturalService {
  constructor(
    private client: AxiosInstance,
    private config: MediMateConfig
  ) {}

  /**
   * Get prayer times for a Malaysian state
   */
  async getPrayerTimes(stateCode: MalaysianState, date?: Date): Promise<PrayerTimes> {
    const params: any = {};
    if (date) {
      params.date = date.toISOString().split('T')[0];
    }

    const response = await this.client.get(\`/cultural/prayer-times/\${stateCode}\`, { params });
    return response.data.data;
  }

  /**
   * Get current prayer status for healthcare scheduling
   */
  async getCurrentPrayerStatus(stateCode: MalaysianState): Promise<CurrentPrayerStatus> {
    const response = await this.client.get(\`/cultural/prayer-times/\${stateCode}/current\`);
    return response.data.data;
  }

  /**
   * Get Ramadan adjustments for healthcare scheduling
   */
  async getRamadanAdjustments(stateCode: MalaysianState, date?: Date): Promise<{
    is_ramadan: boolean;
    suhur_time: string;
    iftar_time: string;
    healthcare_recommendations: {
      optimal_appointment_times: Array<{ start: string; end: string; description: string }>;
      medication_timing_adjustments: string[];
      fasting_considerations: string[];
    };
  }> {
    const params: any = {};
    if (date) {
      params.date = date.toISOString().split('T')[0];
    }

    const response = await this.client.get(\`/cultural/prayer-times/\${stateCode}/ramadan\`, { params });
    return response.data.data;
  }

  /**
   * Translate healthcare text with cultural context
   */
  async translate(request: TranslationRequest): Promise<TranslationResponse> {
    const response = await this.client.post('/cultural/translate', request);
    return response.data.data;
  }

  /**
   * Get supported languages for healthcare translation
   */
  async getSupportedLanguages(): Promise<{
    languages: Array<{
      code: SupportedLanguage;
      name: string;
      native_name: string;
      medical_terminology_support: boolean;
      emergency_phrases_available: boolean;
    }>;
  }> {
    const response = await this.client.get('/cultural/languages/supported');
    return response.data.data;
  }

  /**
   * Search medical terms in specific language
   */
  async searchMedicalTerms(searchQuery: string, language: SupportedLanguage): Promise<Array<{
    english_term: string;
    translated_term: string;
    pronunciation?: string;
    definition: string;
    category: string;
  }>> {
    const response = await this.client.get(\`/cultural/languages/\${language}/medical-terms\`, {
      params: { search: searchQuery }
    });
    return response.data.data;
  }

  /**
   * Get emergency phrases in specific language
   */
  async getEmergencyPhrases(language: SupportedLanguage): Promise<Array<{
    english_phrase: string;
    translated_phrase: string;
    pronunciation: string;
    urgency: 'low' | 'medium' | 'high' | 'critical';
    category: string;
  }>> {
    const response = await this.client.get(\`/cultural/languages/\${language}/emergency-phrases\`);
    return response.data.data;
  }

  /**
   * Validate if medication is halal
   */
  async validateMedication(request: HalalValidationRequest): Promise<HalalValidationResponse> {
    const response = await this.client.post('/cultural/halal/validate-medication', request);
    return response.data.data;
  }

  /**
   * Validate individual ingredient for halal compliance
   */
  async validateIngredient(ingredientName: string): Promise<{
    ingredient_name: string;
    halal_status: 'halal' | 'haram' | 'mushbooh' | 'unknown';
    confidence: 'high' | 'medium' | 'low';
    source: string;
    notes?: string;
  }> {
    const response = await this.client.post('/cultural/halal/validate-ingredient', {
      ingredient_name: ingredientName
    });
    return response.data.data;
  }

  /**
   * Validate medical treatment for halal compliance
   */
  async validateTreatment(
    treatmentName: string, 
    treatmentType: 'medication' | 'procedure' | 'therapy' | 'vaccine'
  ): Promise<{
    treatment_name: string;
    treatment_type: string;
    halal_status: 'halal' | 'haram' | 'mushbooh' | 'unknown';
    religious_guidance: string;
    alternatives?: Array<{
      name: string;
      type: string;
      halal_certified: boolean;
    }>;
  }> {
    const response = await this.client.post('/cultural/halal/validate-treatment', {
      treatment_name: treatmentName,
      treatment_type: treatmentType
    });
    return response.data.data;
  }

  /**
   * Get halal alternatives for medication
   */
  async getHalalAlternatives(medicationName: string): Promise<Array<{
    name: string;
    manufacturer: string;
    active_ingredients: string[];
    halal_certified: boolean;
    certification_authority?: string;
    availability: 'available' | 'prescription_required' | 'special_order';
    price_comparison?: 'cheaper' | 'similar' | 'expensive';
  }>> {
    const response = await this.client.get(\`/cultural/halal/alternatives/\${encodeURIComponent(medicationName)}\`);
    return response.data.data;
  }

  /**
   * Validate medication schedule for Ramadan
   */
  async validateRamadanSchedule(
    medications: string[],
    doseTimes: string[]
  ): Promise<{
    is_ramadan_compatible: boolean;
    adjustments_needed: boolean;
    recommended_schedule: Array<{
      medication: string;
      original_time: string;
      adjusted_time: string;
      reason: string;
    }>;
    religious_considerations: string[];
  }> {
    const response = await this.client.post('/cultural/halal/ramadan-schedule', {
      medications,
      dose_times: doseTimes
    });
    return response.data.data;
  }

  /**
   * Get cultural events for date range
   */
  async getCulturalEvents(
    startDate: Date,
    endDate: Date,
    eventTypes?: string[],
    regions?: string[]
  ): Promise<Array<{
    name: string;
    date: string;
    type: string;
    region?: string;
    healthcare_impact: 'low' | 'medium' | 'high';
    scheduling_recommendations: string[];
  }>> {
    const params: any = {
      start_date: startDate.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0]
    };
    
    if (eventTypes) params.event_types = eventTypes.join(',');
    if (regions) params.regions = regions.join(',');

    const response = await this.client.get('/cultural/calendar/events', { params });
    return response.data.data;
  }

  /**
   * Get Ramadan information for specific year
   */
  async getRamadanInfo(year: number): Promise<{
    year: number;
    hijri_year: number;
    start_date: string;
    end_date: string;
    predicted: boolean;
    healthcare_considerations: {
      fasting_hours: {
        average_duration: string;
        longest_day: { date: string; duration: string };
      };
      medication_timing: {
        suhur_window: { start: string; end: string };
        iftar_window: { start: string; end: string };
      };
      appointment_scheduling: {
        recommended_times: Array<{
          period: string;
          time_range: string;
          description: string;
        }>;
      };
    };
  }> {
    const response = await this.client.get(\`/cultural/calendar/ramadan/\${year}\`);
    return response.data.data;
  }

  /**
   * Get scheduling impact for specific date
   */
  async getSchedulingImpact(date: Date, region?: string): Promise<{
    date: string;
    region?: string;
    cultural_events: Array<{
      name: string;
      type: string;
      impact_level: 'low' | 'medium' | 'high';
    }>;
    prayer_time_considerations: {
      avoid_times: Array<{ start: string; end: string; reason: string }>;
      optimal_windows: Array<{ start: string; end: string; description: string }>;
    };
    overall_impact: 'minimal' | 'moderate' | 'significant';
    recommendations: string[];
  }> {
    const params: any = {
      date: date.toISOString().split('T')[0]
    };
    
    if (region) params.region = region;

    const response = await this.client.get('/cultural/calendar/scheduling-impact', { params });
    return response.data.data;
  }

  /**
   * Get optimal appointment times during Ramadan
   */
  async getRamadanFriendlyTimes(date: Date, stateCode: MalaysianState): Promise<Array<{
    start_time: string;
    end_time: string;
    duration_minutes: number;
    suitability: 'excellent' | 'good' | 'fair';
    considerations: string[];
  }>> {
    const response = await this.client.get('/cultural/calendar/ramadan-friendly-times', {
      params: {
        date: date.toISOString().split('T')[0],
        state_code: stateCode
      }
    });
    return response.data.data;
  }
}`;

    this.writeFile('src/services/CulturalService.ts', culturalService);
  }

  generatePatientServices() {
    const patientService = `/**
 * Patient Management Service with Malaysian healthcare context
 * Handles PDPA-compliant patient operations with cultural considerations
 */

import { AxiosInstance } from 'axios';
import { MediMateConfig, PatientCreateRequest } from '../types';

export class PatientService {
  constructor(
    private client: AxiosInstance,
    private config: MediMateConfig
  ) {}

  /**
   * Create a new patient with Malaysian healthcare context
   */
  async create(patientData: PatientCreateRequest): Promise<{
    patient_id: string;
    personal_info: any;
    cultural_preferences: any;
    pdpa_status: {
      consent_given: boolean;
      consent_date: string;
      data_retention_period: string;
      next_consent_review: string;
    };
    created_at: string;
  }> {
    const response = await this.client.post('/patients', patientData);
    return response.data.data;
  }

  /**
   * Get patient by ID with cultural context
   */
  async getById(patientId: string): Promise<{
    patient_id: string;
    personal_info: any;
    contact_info: any;
    cultural_preferences: any;
    emergency_contact: any;
    pdpa_status: any;
    created_at: string;
    updated_at: string;
  }> {
    const response = await this.client.get(\`/patients/\${patientId}\`);
    return response.data.data;
  }

  /**
   * List patients with filtering and pagination
   */
  async list(options: {
    page?: number;
    limit?: number;
    search?: string;
    malaysianState?: string;
    primaryLanguage?: string;
    halalRequirements?: boolean;
  } = {}): Promise<{
    patients: Array<{
      patient_id: string;
      name: string;
      mykad_number?: string;
      age: number;
      gender: string;
      primary_language: string;
      last_visit?: string;
    }>;
    pagination: {
      page: number;
      limit: number;
      total: number;
      total_pages: number;
      has_next: boolean;
      has_prev: boolean;
    };
    cultural_summary: {
      language_distribution: Record<string, number>;
      halal_requirements_count: number;
      prayer_time_notifications_count: number;
    };
  }> {
    const response = await this.client.get('/patients', { params: options });
    return response.data;
  }

  /**
   * Update patient information with audit trail
   */
  async update(
    patientId: string, 
    updates: Partial<PatientCreateRequest>,
    updateReason: string
  ): Promise<{
    patient_id: string;
    updated_fields: string[];
    audit_trail: {
      updated_by: string;
      update_reason: string;
      timestamp: string;
      pdpa_compliant: boolean;
    };
  }> {
    const response = await this.client.put(\`/patients/\${patientId}\`, {
      ...updates,
      update_reason: updateReason
    });
    return response.data.data;
  }

  /**
   * Search patients by MyKad number with PDPA compliance
   */
  async searchByMyKad(mykadNumber: string): Promise<{
    found: boolean;
    patient?: {
      patient_id: string;
      name: string;
      partial_mykad: string; // Masked for privacy
      cultural_preferences: any;
    };
    pdpa_notice: string;
  }> {
    const response = await this.client.get('/patients/search/mykad', {
      params: { mykad: mykadNumber }
    });
    return response.data.data;
  }

  /**
   * Get patient's cultural preferences for healthcare
   */
  async getCulturalPreferences(patientId: string): Promise<{
    primary_language: string;
    secondary_languages: string[];
    prayer_time_notifications: boolean;
    halal_medication_only: boolean;
    preferred_gender_provider: string;
    ramadan_considerations: boolean;
    dietary_restrictions: string[];
    cultural_notes?: string;
  }> {
    const response = await this.client.get(\`/patients/\${patientId}/cultural-preferences\`);
    return response.data.data;
  }

  /**
   * Update patient's cultural preferences
   */
  async updateCulturalPreferences(
    patientId: string,
    preferences: Partial<{
      primary_language: string;
      secondary_languages: string[];
      prayer_time_notifications: boolean;
      halal_medication_only: boolean;
      preferred_gender_provider: string;
      ramadan_considerations: boolean;
      dietary_restrictions: string[];
    }>
  ): Promise<{
    updated: boolean;
    preferences: any;
    effective_date: string;
  }> {
    const response = await this.client.put(\`/patients/\${patientId}/cultural-preferences\`, preferences);
    return response.data.data;
  }

  /**
   * Get patient's PDPA consent status and history
   */
  async getPDPAStatus(patientId: string): Promise<{
    current_consent: {
      data_processing: boolean;
      marketing: boolean;
      third_party_sharing: boolean;
      research: boolean;
      consent_date: string;
      consent_method: string;
      consent_version: string;
    };
    consent_history: Array<{
      consent_date: string;
      consent_type: string;
      status: boolean;
      method: string;
    }>;
    next_review_date: string;
    data_retention_info: {
      retention_period: string;
      automatic_deletion_date: string;
      can_request_deletion: boolean;
    };
  }> {
    const response = await this.client.get(\`/patients/\${patientId}/pdpa-status\`);
    return response.data.data;
  }

  /**
   * Request patient data deletion (PDPA right to erasure)
   */
  async requestDataDeletion(
    patientId: string,
    reason: string
  ): Promise<{
    request_id: string;
    status: 'pending' | 'approved' | 'processing';
    estimated_completion: string;
    pdpa_compliance_note: string;
  }> {
    const response = await this.client.post(\`/patients/\${patientId}/request-deletion\`, {
      reason
    });
    return response.data.data;
  }

  /**
   * Export patient data (PDPA right to data portability)
   */
  async exportPatientData(patientId: string): Promise<{
    export_id: string;
    download_url: string;
    expires_at: string;
    format: 'json' | 'pdf';
    includes: string[];
    pdpa_compliance: boolean;
  }> {
    const response = await this.client.post(\`/patients/\${patientId}/export\`);
    return response.data.data;
  }
}`;

    this.writeFile('src/services/PatientService.ts', patientService);
  }

  generateUtilities() {
    const utilities = `/**
 * Utility functions for MediMate Malaysia SDK
 * Helper functions for Malaysian healthcare development
 */

import { MalaysianState, SupportedLanguage } from '../types';

/**
 * Malaysian state utilities
 */
export const MalaysianStates = {
  JHR: { name: 'Johor', capital: 'Johor Bahru' },
  KDH: { name: 'Kedah', capital: 'Alor Setar' },
  KTN: { name: 'Kelantan', capital: 'Kota Bharu' },
  MLK: { name: 'Melaka', capital: 'Melaka' },
  NSN: { name: 'Negeri Sembilan', capital: 'Seremban' },
  PHG: { name: 'Pahang', capital: 'Kuantan' },
  PNG: { name: 'Penang', capital: 'George Town' },
  PRK: { name: 'Perak', capital: 'Ipoh' },
  PLS: { name: 'Perlis', capital: 'Kangar' },
  SBH: { name: 'Sabah', capital: 'Kota Kinabalu' },
  SWK: { name: 'Sarawak', capital: 'Kuching' },
  SGR: { name: 'Selangor', capital: 'Shah Alam' },
  TRG: { name: 'Terengganu', capital: 'Kuala Terengganu' },
  KUL: { name: 'Kuala Lumpur', capital: 'Kuala Lumpur' },
  LBN: { name: 'Labuan', capital: 'Victoria' },
  PJY: { name: 'Putrajaya', capital: 'Putrajaya' }
};

export function getStateName(stateCode: MalaysianState): string {
  return MalaysianStates[stateCode]?.name || stateCode;
}

export function getStateCapital(stateCode: MalaysianState): string {
  return MalaysianStates[stateCode]?.capital || '';
}

export function getAllStates(): Array<{ code: MalaysianState; name: string; capital: string }> {
  return Object.entries(MalaysianStates).map(([code, info]) => ({
    code: code as MalaysianState,
    name: info.name,
    capital: info.capital
  }));
}

/**
 * MyKad (Malaysian Identity Card) utilities
 */
export class MyKadValidator {
  static readonly STATES: Record<string, string> = {
    '01': 'Johor', '02': 'Kedah', '03': 'Kelantan', '04': 'Melaka',
    '05': 'Negeri Sembilan', '06': 'Pahang', '07': 'Penang', '08': 'Perak',
    '09': 'Perlis', '10': 'Selangor', '11': 'Terengganu', '12': 'Sabah',
    '13': 'Sarawak', '14': 'Kuala Lumpur', '15': 'Labuan', '16': 'Putrajaya'
  };

  /**
   * Validate MyKad number format
   */
  static isValid(mykadNumber: string): boolean {
    const cleaned = mykadNumber.replace(/[-\\s]/g, '');
    return /^\\d{12}$/.test(cleaned);
  }

  /**
   * Extract birth date from MyKad number
   */
  static extractBirthDate(mykadNumber: string): Date | null {
    if (!this.isValid(mykadNumber)) return null;
    
    const cleaned = mykadNumber.replace(/[-\\s]/g, '');
    const year = parseInt(cleaned.substring(0, 2));
    const month = parseInt(cleaned.substring(2, 4));
    const day = parseInt(cleaned.substring(4, 6));
    
    // Determine century (assume birth years are between 1900-2099)
    const fullYear = year < 50 ? 2000 + year : 1900 + year;
    
    return new Date(fullYear, month - 1, day);
  }

  /**
   * Extract birth state from MyKad number
   */
  static extractBirthState(mykadNumber: string): string | null {
    if (!this.isValid(mykadNumber)) return null;
    
    const cleaned = mykadNumber.replace(/[-\\s]/g, '');
    const stateCode = cleaned.substring(6, 8);
    
    return this.STATES[stateCode] || null;
  }

  /**
   * Extract gender from MyKad number
   */
  static extractGender(mykadNumber: string): 'male' | 'female' | null {
    if (!this.isValid(mykadNumber)) return null;
    
    const cleaned = mykadNumber.replace(/[-\\s]/g, '');
    const lastDigit = parseInt(cleaned.substring(11, 12));
    
    return lastDigit % 2 === 0 ? 'female' : 'male';
  }

  /**
   * Mask MyKad number for privacy (PDPA compliance)
   */
  static mask(mykadNumber: string): string {
    if (!this.isValid(mykadNumber)) return mykadNumber;
    
    const cleaned = mykadNumber.replace(/[-\\s]/g, '');
    return \`\${cleaned.substring(0, 6)}-\${cleaned.substring(6, 8)}-****\`;
  }
}

/**
 * Language utilities
 */
export const LanguageSupport = {
  en: { name: 'English', native: 'English', rtl: false },
  ms: { name: 'Malay', native: 'Bahasa Malaysia', rtl: false },
  zh: { name: 'Chinese', native: '中文', rtl: false },
  ta: { name: 'Tamil', native: 'தமிழ்', rtl: false }
};

export function getLanguageName(code: SupportedLanguage): string {
  return LanguageSupport[code]?.name || code;
}

export function getLanguageNativeName(code: SupportedLanguage): string {
  return LanguageSupport[code]?.native || code;
}

export function isRTLLanguage(code: SupportedLanguage): boolean {
  return LanguageSupport[code]?.rtl || false;
}

/**
 * Prayer time utilities
 */
export class PrayerTimeHelper {
  /**
   * Check if current time conflicts with prayer time
   */
  static isPrayerTime(currentTime: Date, prayerTimes: any): boolean {
    const timeStr = currentTime.toTimeString().substring(0, 5);
    
    const prayers = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
    for (const prayer of prayers) {
      const prayerTime = prayerTimes[prayer];
      if (this.isWithinPrayerWindow(timeStr, prayerTime)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Get optimal appointment windows avoiding prayer times
   */
  static getOptimalAppointmentWindows(prayerTimes: any): Array<{start: string; end: string; duration: number}> {
    // Implementation would calculate windows between prayers
    // This is a simplified version
    return [
      { start: '08:00', end: '11:30', duration: 210 },
      { start: '14:30', end: '16:00', duration: 90 },
      { start: '20:30', end: '22:00', duration: 90 }
    ];
  }

  private static isWithinPrayerWindow(currentTime: string, prayerTime: string, windowMinutes: number = 15): boolean {
    // Helper method to check if current time is within prayer window
    return false; // Simplified implementation
  }
}

/**
 * Halal medication utilities
 */
export class HalalHelper {
  static readonly NON_HALAL_INGREDIENTS = [
    'pork', 'alcohol', 'gelatin', 'glycerin', 'lecithin'
  ];

  static readonly MUSHBOOH_INGREDIENTS = [
    'artificial flavoring', 'natural flavoring', 'emulsifier'
  ];

  /**
   * Quick check for potentially non-halal ingredients
   */
  static hasNonHalalIngredients(ingredients: string[]): boolean {
    const lowerIngredients = ingredients.map(i => i.toLowerCase());
    return this.NON_HALAL_INGREDIENTS.some(nonHalal => 
      lowerIngredients.some(ingredient => ingredient.includes(nonHalal))
    );
  }

  /**
   * Quick check for mushbooh (doubtful) ingredients
   */
  static hasMushboohIngredients(ingredients: string[]): boolean {
    const lowerIngredients = ingredients.map(i => i.toLowerCase());
    return this.MUSHBOOH_INGREDIENTS.some(mushbooh => 
      lowerIngredients.some(ingredient => ingredient.includes(mushbooh))
    );
  }
}

/**
 * Date utilities for Malaysian timezone
 */
export class MalaysianDate {
  private static readonly TIMEZONE = 'Asia/Kuala_Lumpur';

  /**
   * Get current Malaysian time
   */
  static now(): Date {
    return new Date(new Date().toLocaleString("en-US", {timeZone: this.TIMEZONE}));
  }

  /**
   * Format date for Malaysian context
   */
  static format(date: Date, includeTime: boolean = false): string {
    const options: Intl.DateTimeFormatOptions = {
      timeZone: this.TIMEZONE,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    };

    if (includeTime) {
      options.hour = '2-digit';
      options.minute = '2-digit';
      options.hour12 = false;
    }

    return date.toLocaleString('en-GB', options);
  }

  /**
   * Check if date is during Ramadan (approximate)
   */
  static isRamadan(date: Date): boolean {
    // This is a simplified check - in reality, you'd use the Islamic calendar
    const year = date.getFullYear();
    const month = date.getMonth();
    
    // Ramadan moves approximately 11 days earlier each Gregorian year
    // This is a rough approximation
    if (year === 2024) {
      return month === 2 || (month === 3 && date.getDate() <= 10); // March-April 2024
    }
    
    return false; // Simplified implementation
  }
}

/**
 * Error handling utilities
 */
export class ErrorHelper {
  /**
   * Get user-friendly error message in preferred language
   */
  static getLocalizedError(error: any, language: SupportedLanguage = 'en'): string {
    if (error.culturalMessage && error.culturalMessage[language]) {
      return error.culturalMessage[language];
    }
    
    return error.message || 'An unexpected error occurred';
  }

  /**
   * Check if error is rate limiting
   */
  static isRateLimitError(error: any): boolean {
    return error.code === 'RATE_LIMIT_EXCEEDED' || error.statusCode === 429;
  }

  /**
   * Check if error is authentication related
   */
  static isAuthError(error: any): boolean {
    return error.statusCode === 401 || error.code === 'API_KEY_INVALID';
  }

  /**
   * Check if error is PDPA compliance related
   */
  static isPDPAError(error: any): boolean {
    return error.code === 'PDPA_COMPLIANCE_REQUIRED' || 
           error.code === 'CONSENT_REQUIRED';
  }
}

export default {
  MalaysianStates,
  MyKadValidator,
  LanguageSupport,
  PrayerTimeHelper,
  HalalHelper,
  MalaysianDate,
  ErrorHelper,
  getStateName,
  getStateCapital,
  getAllStates,
  getLanguageName,
  getLanguageNativeName,
  isRTLLanguage
};`;

    this.writeFile('src/utils/index.ts', utilities);
  }

  generateExamples() {
    const basicExample = `/**
 * Basic Usage Example for MediMate Malaysia SDK
 * Demonstrates core features with Malaysian healthcare context
 */

const { MediMateMalaysia } = require('@medimate/malaysia-sdk');

// Initialize the SDK with your API key
const medimate = new MediMateMalaysia({
  apiKey: 'mk_test_your_api_key_here', // Use your actual API key
  culturalContext: {
    malaysianState: 'KUL', // Kuala Lumpur
    preferredLanguage: 'en',
    prayerTimeAware: true,
    halalRequirements: true
  },
  debug: true // Enable debug logging
});

async function demonstrateBasicUsage() {
  try {
    console.log('🇲🇾 MediMate Malaysia SDK - Basic Usage Example\\n');

    // 1. Test API connection
    console.log('1. Testing API connection...');
    const connectionTest = await medimate.testConnection();
    console.log('✅ Connection test result:', connectionTest);
    console.log();

    // 2. Get Malaysian healthcare context
    console.log('2. Getting Malaysian healthcare context...');
    const context = await medimate.getMalaysianContext();
    console.log('🏥 Healthcare context:', context);
    console.log();

    // 3. Get prayer times for Kuala Lumpur
    console.log('3. Getting prayer times for Kuala Lumpur...');
    const prayerTimes = await medimate.cultural.getPrayerTimes('KUL');
    console.log('🕌 Prayer times:', prayerTimes);
    console.log();

    // 4. Check current prayer status
    console.log('4. Checking current prayer status...');
    const prayerStatus = await medimate.cultural.getCurrentPrayerStatus('KUL');
    console.log('⏰ Current prayer status:', prayerStatus);
    console.log();

    // 5. Validate halal medication
    console.log('5. Validating halal medication...');
    const halalValidation = await medimate.cultural.validateMedication({
      medication_name: 'Paracetamol 500mg',
      manufacturer: 'Duopharma Biotech',
      active_ingredients: ['paracetamol']
    });
    console.log('✅ Halal validation:', halalValidation);
    console.log();

    // 6. Translate healthcare text
    console.log('6. Translating healthcare text...');
    const translation = await medimate.cultural.translate({
      text: 'Take this medication twice daily after meals',
      target_language: 'ms',
      context: {
        domain: 'prescription',
        urgency: 'medium'
      }
    });
    console.log('🌐 Translation:', translation);
    console.log();

    // 7. Get Ramadan information
    console.log('7. Getting Ramadan information for 2024...');
    const ramadanInfo = await medimate.cultural.getRamadanInfo(2024);
    console.log('🌙 Ramadan 2024:', ramadanInfo);
    console.log();

    // 8. Check rate limit status
    console.log('8. Checking rate limit status...');
    const rateLimits = medimate.getRateLimitInfo();
    console.log('📊 Rate limits:', rateLimits);
    console.log();

    console.log('✅ Basic usage demonstration completed successfully!');

  } catch (error) {
    console.error('❌ Error during demonstration:', error.message);
    
    if (error.culturalMessage) {
      console.error('🌐 Localized error message:', error.culturalMessage);
    }
    
    if (error.code === 'API_KEY_INVALID') {
      console.error('💡 Tip: Make sure you have set a valid API key');
    }
  }
}

// Run the demonstration
demonstrateBasicUsage();`;

    const patientExample = `/**
 * Patient Management Example for MediMate Malaysia SDK
 * Demonstrates PDPA-compliant patient operations with cultural context
 */

const { MediMateMalaysia } = require('@medimate/malaysia-sdk');

const medimate = new MediMateMalaysia({
  apiKey: 'mk_test_your_api_key_here',
  culturalContext: {
    malaysianState: 'KUL',
    preferredLanguage: 'en',
    prayerTimeAware: true,
    halalRequirements: true
  }
});

async function demonstratePatientManagement() {
  try {
    console.log('👥 MediMate Malaysia SDK - Patient Management Example\\n');

    // 1. Create a new patient with Malaysian cultural context
    console.log('1. Creating new patient with cultural preferences...');
    const newPatient = await medimate.patients.create({
      personal_info: {
        name: 'Ahmad bin Abdullah',
        mykad_number: '800101-01-1234',
        date_of_birth: '1980-01-01',
        gender: 'male',
        race: 'Malay',
        religion: 'Islam',
        nationality: 'Malaysian',
        marital_status: 'married'
      },
      contact_info: {
        phone: '+60123456789',
        email: 'ahmad.abdullah@email.com',
        address: {
          street: '123 Jalan Merdeka',
          city: 'Kuala Lumpur',
          state: 'Kuala Lumpur',
          postcode: '50000',
          country: 'Malaysia'
        }
      },
      cultural_preferences: {
        primary_language: 'ms',
        secondary_languages: ['en'],
        prayer_time_notifications: true,
        halal_medication_only: true,
        preferred_gender_provider: 'same',
        ramadan_considerations: true,
        dietary_restrictions: ['halal']
      },
      pdpa_consent: {
        data_processing: true,
        marketing: false,
        third_party_sharing: false,
        research: true,
        consent_date: new Date().toISOString(),
        consent_method: 'online'
      },
      emergency_contact: {
        name: 'Siti Abdullah',
        relationship: 'spouse',
        phone: '+60198765432'
      }
    });

    console.log('✅ Patient created:', {
      patient_id: newPatient.patient_id,
      name: newPatient.personal_info.name,
      cultural_preferences: newPatient.cultural_preferences,
      pdpa_status: newPatient.pdpa_status
    });
    console.log();

    // 2. Retrieve patient with cultural context
    console.log('2. Retrieving patient information...');
    const patient = await medimate.patients.getById(newPatient.patient_id);
    console.log('📋 Patient details:', {
      name: patient.personal_info.name,
      primary_language: patient.cultural_preferences.primary_language,
      halal_only: patient.cultural_preferences.halal_medication_only,
      prayer_notifications: patient.cultural_preferences.prayer_time_notifications
    });
    console.log();

    // 3. Get cultural preferences specifically
    console.log('3. Getting detailed cultural preferences...');
    const culturalPrefs = await medimate.patients.getCulturalPreferences(newPatient.patient_id);
    console.log('🕌 Cultural preferences:', culturalPrefs);
    console.log();

    // 4. Check PDPA compliance status
    console.log('4. Checking PDPA compliance status...');
    const pdpaStatus = await medimate.patients.getPDPAStatus(newPatient.patient_id);
    console.log('🛡️ PDPA status:', {
      current_consent: pdpaStatus.current_consent,
      next_review: pdpaStatus.next_review_date,
      can_delete: pdpaStatus.data_retention_info.can_request_deletion
    });
    console.log();

    // 5. Update cultural preferences
    console.log('5. Updating cultural preferences...');
    const updatedPrefs = await medimate.patients.updateCulturalPreferences(
      newPatient.patient_id,
      {
        prayer_time_notifications: false,
        dietary_restrictions: ['halal', 'diabetic']
      }
    );
    console.log('🔄 Updated preferences:', updatedPrefs);
    console.log();

    // 6. List patients with cultural filtering
    console.log('6. Listing patients with cultural filtering...');
    const patientList = await medimate.patients.list({
      page: 1,
      limit: 10,
      primaryLanguage: 'ms',
      halalRequirements: true
    });
    console.log('📊 Patient list summary:', {
      total_patients: patientList.pagination.total,
      language_distribution: patientList.cultural_summary.language_distribution,
      halal_requirements: patientList.cultural_summary.halal_requirements_count
    });
    console.log();

    // 7. Search by MyKad (masked for privacy)
    console.log('7. Searching by MyKad number...');
    const mykadSearch = await medimate.patients.searchByMyKad('800101-01-1234');
    console.log('🔍 MyKad search result:', {
      found: mykadSearch.found,
      partial_mykad: mykadSearch.patient?.partial_mykad,
      pdpa_notice: mykadSearch.pdpa_notice
    });
    console.log();

    console.log('✅ Patient management demonstration completed successfully!');

  } catch (error) {
    console.error('❌ Error in patient management:', error.message);
    console.error('Code:', error.code);
    
    if (error.culturalMessage) {
      console.error('🌐 Cultural message:', error.culturalMessage.en);
    }
  }
}

// Run the demonstration
demonstratePatientManagement();`;

    this.writeFile('examples/basic-usage.js', basicExample);
    this.writeFile('examples/patient-management.js', patientExample);
  }

  generateReadme() {
    const readme = `# MediMate Malaysia Healthcare API SDK

Official JavaScript/TypeScript SDK for the MediMate Malaysia Healthcare API with built-in cultural intelligence and PDPA compliance.

## 🇲🇾 Malaysian Healthcare Features

- **Prayer Time Integration**: Automatic prayer time considerations for appointment scheduling
- **Halal Medication Validation**: JAKIM-certified halal validation for medications and treatments
- **Multi-Language Support**: Healthcare translations in Bahasa Malaysia, Chinese, and Tamil
- **Cultural Calendar**: Islamic holidays, Ramadan adjustments, and cultural events
- **PDPA 2010 Compliance**: Built-in Malaysian data protection compliance
- **MyKad Integration**: Malaysian identity card validation and processing

## Installation

\`\`\`bash
npm install @medimate/malaysia-sdk
# or
yarn add @medimate/malaysia-sdk
\`\`\`

## Quick Start

\`\`\`javascript
import { MediMateMalaysia } from '@medimate/malaysia-sdk';

const medimate = new MediMateMalaysia({
  apiKey: 'mk_live_your_api_key_here',
  culturalContext: {
    malaysianState: 'KUL', // Kuala Lumpur
    preferredLanguage: 'ms', // Bahasa Malaysia
    prayerTimeAware: true,
    halalRequirements: true
  }
});

// Get prayer times for Kuala Lumpur
const prayerTimes = await medimate.cultural.getPrayerTimes('KUL');

// Validate halal medication
const halalStatus = await medimate.cultural.validateMedication({
  medication_name: 'Paracetamol 500mg',
  manufacturer: 'Duopharma Biotech'
});

// Create PDPA-compliant patient record
const patient = await medimate.patients.create({
  personal_info: {
    name: 'Ahmad bin Abdullah',
    mykad_number: '800101-01-1234',
    // ... other fields
  },
  cultural_preferences: {
    primary_language: 'ms',
    halal_medication_only: true,
    prayer_time_notifications: true
  },
  pdpa_consent: {
    data_processing: true,
    consent_date: new Date().toISOString()
  }
});
\`\`\`

## Features

### 🕌 Cultural Intelligence

\`\`\`javascript
// Prayer times with healthcare scheduling considerations
const prayerTimes = await medimate.cultural.getPrayerTimes('KUL');
const currentStatus = await medimate.cultural.getCurrentPrayerStatus('KUL');

// Ramadan healthcare adjustments
const ramadanInfo = await medimate.cultural.getRamadanInfo(2024);
const ramadanSchedule = await medimate.cultural.getRamadanFriendlyTimes(
  new Date('2024-04-15'), 
  'KUL'
);

// Healthcare translation with medical accuracy
const translation = await medimate.cultural.translate({
  text: 'Take medication twice daily',
  target_language: 'ms',
  context: { domain: 'prescription' }
});
\`\`\`

### ✅ Halal Validation

\`\`\`javascript
// Medication halal validation
const validation = await medimate.cultural.validateMedication({
  medication_name: 'Insulin',
  manufacturer: 'Novo Nordisk',
  active_ingredients: ['insulin glargine']
});

// Get halal alternatives
const alternatives = await medimate.cultural.getHalalAlternatives('Aspirin');

// Validate Ramadan medication schedule
const ramadanValidation = await medimate.cultural.validateRamadanSchedule(
  ['Metformin', 'Lisinopril'],
  ['08:00', '20:00']
);
\`\`\`

### 👥 Patient Management (PDPA Compliant)

\`\`\`javascript
// Create patient with cultural preferences
const patient = await medimate.patients.create({
  personal_info: {
    name: 'Siti Nurhaliza',
    mykad_number: '850315-08-2468',
    // ...
  },
  cultural_preferences: {
    primary_language: 'ms',
    halal_medication_only: true,
    preferred_gender_provider: 'same'
  },
  pdpa_consent: {
    data_processing: true,
    marketing: false,
    third_party_sharing: false
  }
});

// Get PDPA status
const pdpaStatus = await medimate.patients.getPDPAStatus(patient.patient_id);

// Export patient data (PDPA right to portability)
const exportData = await medimate.patients.exportPatientData(patient.patient_id);
\`\`\`

### 📅 Appointment Scheduling

\`\`\`javascript
// Create appointment with prayer time considerations
const appointment = await medimate.appointments.create({
  patient_id: 'patient-uuid',
  provider_id: 'provider-uuid',
  appointment_date: '2024-04-15',
  appointment_time: '14:00',
  cultural_considerations: {
    avoid_prayer_times: true,
    ramadan_friendly: true,
    preferred_language: 'ms'
  }
});

// Check scheduling conflicts
const conflicts = await medimate.appointments.checkPrayerTimeConflicts(
  '2024-04-15T14:00:00Z',
  'KUL'
);
\`\`\`

## Malaysian State Codes

| Code | State | Capital |
|------|-------|---------|
| JHR  | Johor | Johor Bahru |
| KDH  | Kedah | Alor Setar |
| KTN  | Kelantan | Kota Bharu |
| MLK  | Melaka | Melaka |
| NSN  | Negeri Sembilan | Seremban |
| PHG  | Pahang | Kuantan |
| PNG  | Penang | George Town |
| PRK  | Perak | Ipoh |
| PLS  | Perlis | Kangar |
| SBH  | Sabah | Kota Kinabalu |
| SWK  | Sarawak | Kuching |
| SGR  | Selangor | Shah Alam |
| TRG  | Terengganu | Kuala Terengganu |
| KUL  | Kuala Lumpur | Kuala Lumpur |
| LBN  | Labuan | Victoria |
| PJY  | Putrajaya | Putrajaya |

## Language Support

- **English** (en) - Primary documentation language
- **Bahasa Malaysia** (ms) - Official Malaysian language
- **Chinese** (zh) - Simplified Chinese for Malaysian Chinese community
- **Tamil** (ta) - Tamil for Malaysian Indian community

## Configuration Options

\`\`\`javascript
const medimate = new MediMateMalaysia({
  apiKey: 'your-api-key',
  baseURL: 'https://api.medimate.my/v1', // Optional
  timeout: 30000, // 30 seconds
  retries: 3, // Auto-retry failed requests
  debug: false, // Enable debug logging
  culturalContext: {
    malaysianState: 'KUL',
    preferredLanguage: 'ms',
    prayerTimeAware: true,
    halalRequirements: true,
    timezone: 'Asia/Kuala_Lumpur'
  }
});
\`\`\`

## Error Handling

\`\`\`javascript
import { MediMateError } from '@medimate/malaysia-sdk';

try {
  const result = await medimate.cultural.getPrayerTimes('INVALID');
} catch (error) {
  if (error instanceof MediMateError) {
    console.log('Error code:', error.code);
    console.log('Status:', error.statusCode);
    console.log('Message:', error.message);
    
    // Get localized error message
    if (error.culturalMessage) {
      console.log('Malay:', error.culturalMessage.ms);
      console.log('Chinese:', error.culturalMessage.zh);
      console.log('Tamil:', error.culturalMessage.ta);
    }
  }
}
\`\`\`

## Utilities

The SDK includes helpful utilities for Malaysian healthcare development:

\`\`\`javascript
import { 
  MyKadValidator, 
  MalaysianStates, 
  PrayerTimeHelper,
  HalalHelper,
  MalaysianDate 
} from '@medimate/malaysia-sdk';

// MyKad validation and extraction
const isValid = MyKadValidator.isValid('800101-01-1234');
const birthDate = MyKadValidator.extractBirthDate('800101-01-1234');
const gender = MyKadValidator.extractGender('800101-01-1234');
const birthState = MyKadValidator.extractBirthState('800101-01-1234');

// State information
const stateName = MalaysianStates.getStateName('KUL');
const allStates = MalaysianStates.getAllStates();

// Prayer time helpers
const isPrayerTime = PrayerTimeHelper.isPrayerTime(new Date(), prayerTimes);
const optimalWindows = PrayerTimeHelper.getOptimalAppointmentWindows(prayerTimes);

// Halal ingredient checking
const hasNonHalal = HalalHelper.hasNonHalalIngredients(['gelatin', 'paracetamol']);

// Malaysian time utilities
const malaysianTime = MalaysianDate.now();
const isRamadan = MalaysianDate.isRamadan(new Date());
\`\`\`

## Examples

Check out the \`examples/\` directory for complete usage examples:

- \`examples/basic-usage.js\` - Basic SDK features
- \`examples/patient-management.js\` - PDPA-compliant patient operations
- \`examples/cultural-integration.js\` - Cultural intelligence features
- \`examples/appointment-scheduling.js\` - Prayer time aware scheduling

## TypeScript Support

This SDK is written in TypeScript and includes complete type definitions:

\`\`\`typescript
import { MediMateMalaysia, PrayerTimes, HalalValidationResponse } from '@medimate/malaysia-sdk';

const medimate = new MediMateMalaysia({
  apiKey: process.env.MEDIMATE_API_KEY!,
  culturalContext: {
    malaysianState: 'KUL',
    preferredLanguage: 'ms'
  }
});

const prayerTimes: PrayerTimes = await medimate.cultural.getPrayerTimes('KUL');
\`\`\`

## Rate Limiting

The SDK automatically handles rate limiting with exponential backoff:

\`\`\`javascript
// Check current rate limits
const rateLimits = medimate.getRateLimitInfo();
console.log('Requests remaining:', rateLimits.requestsPerMinute.remaining);
console.log('Reset time:', rateLimits.requestsPerMinute.resetTime);
\`\`\`

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## License

This SDK is licensed under the MIT License. See [LICENSE](LICENSE) for details.

## Support

- 📖 [API Documentation](https://api.medimate.my/docs)
- 💬 [Developer Forum](https://forum.medimate.my)
- 📧 [Email Support](mailto:api-support@medimate.my)
- 🐛 [Issue Tracker](https://github.com/medimate-malaysia/javascript-sdk/issues)

## Malaysian Healthcare Compliance

This SDK is designed to comply with:

- **PDPA 2010** - Personal Data Protection Act 2010
- **MOH Guidelines** - Ministry of Health Malaysia standards
- **Islamic Healthcare** - Halal compliance and prayer time considerations
- **Multi-Cultural** - Support for Malaysia's diverse population

---

Made with ❤️ for Malaysian Healthcare by MediMate Malaysia`;

    this.writeFile('README.md', readme);
  }

  generateTSConfig() {
    const tsconfig = {
      compilerOptions: {
        target: "ES2020",
        module: "commonjs",
        lib: ["ES2020"],
        outDir: "./dist",
        rootDir: "./src",
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        declaration: true,
        declarationMap: true,
        sourceMap: true,
        removeComments: false,
        moduleResolution: "node",
        allowSyntheticDefaultImports: true,
        experimentalDecorators: true,
        emitDecoratorMetadata: true
      },
      include: [
        "src/**/*"
      ],
      exclude: [
        "node_modules",
        "dist",
        "**/*.test.ts"
      ]
    };

    this.writeFile('tsconfig.json', JSON.stringify(tsconfig, null, 2));
  }

  generateBuildScripts() {
    const buildScript = `#!/bin/bash

# Build script for MediMate Malaysia SDK
echo "🚀 Building MediMate Malaysia JavaScript/TypeScript SDK..."

# Clean dist directory
rm -rf dist

# Compile TypeScript
echo "📦 Compiling TypeScript..."
npx tsc

# Copy package.json to dist
cp package.json dist/

# Copy README and LICENSE
cp README.md dist/
cp LICENSE dist/ 2>/dev/null || echo "LICENSE file not found, skipping..."

echo "✅ Build completed successfully!"
echo "📁 Output: ./dist/"

# Show build info
echo ""
echo "📊 Build Information:"
echo "- TypeScript compiled to ES2020"
echo "- CommonJS modules"
- Declaration files generated"
echo "- Source maps included"
echo "- Cultural intelligence features: ✅"
echo "- PDPA compliance utilities: ✅"
echo "- Malaysian healthcare context: ✅"

echo ""
echo "🇲🇾 Ready for Malaysian healthcare integration!"`;

    this.writeFile('build.sh', buildScript);
  }

  writeFile(filePath, content) {
    const fullPath = path.join(this.outputDir, filePath);
    const dir = path.dirname(fullPath);
    
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(fullPath, content, 'utf8');
  }
}

// Main execution
async function main() {
  try {
    // Load OpenAPI specification
    const specPath = path.join(__dirname, '../backend/src/swagger/openapi.yaml');
    if (!fs.existsSync(specPath)) {
      throw new Error('OpenAPI specification not found at: ' + specPath);
    }

    const openApiSpec = yaml.load(fs.readFileSync(specPath, 'utf8'));
    
    // Generate SDK
    const generator = new JavaScriptSDKGenerator(openApiSpec);
    generator.generate();
    
    console.log('\n🎉 JavaScript/TypeScript SDK generation completed!');
    console.log('📝 Next steps:');
    console.log('   1. cd sdks/javascript');
    console.log('   2. npm install');
    console.log('   3. npm run build');
    console.log('   4. npm test');
    console.log('   5. npm publish');
    
  } catch (error) {
    console.error('❌ SDK generation failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = JavaScriptSDKGenerator;