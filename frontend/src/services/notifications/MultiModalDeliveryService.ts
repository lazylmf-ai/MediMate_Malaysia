/**
 * Multi-Modal Delivery Service
 * 
 * Integrates Stream B multi-modal delivery with Stream A scheduling engine.
 * Coordinates all notification delivery methods with cultural awareness.
 */

import { ReminderSchedulingService, CulturalConstraintEngine } from '../reminder';
import SMSService from '../sms/SMSService';
import VoiceReminderService from '../voice/VoiceReminderService';
import CulturalNotificationService from './CulturalNotificationService';
import NotificationPriorityService from './NotificationPriorityService';
import type { SupportedLanguage } from '@/i18n/translations';
import type { ReminderSchedule, DeliveryMethod } from '../reminder/ReminderSchedulingService';

export interface MultiModalDeliveryConfig {
  // Delivery method preferences
  deliveryMethods: {
    push: { enabled: boolean; priority: number; culturalPreferences: Record<SupportedLanguage, any> };
    sms: { enabled: boolean; priority: number; culturalPreferences: Record<SupportedLanguage, any> };
    voice: { enabled: boolean; priority: number; culturalPreferences: Record<SupportedLanguage, any> };
    visual: { enabled: boolean; priority: number; culturalPreferences: Record<SupportedLanguage, any> };
  };

  // Coordination settings
  coordination: {
    simultaneousDelivery: boolean;
    sequentialDelay: number; // milliseconds between methods
    failoverEnabled: boolean;
    confirmationRequired: boolean;
    timeoutPeriod: number; // milliseconds to wait for user response
  };

  // Cultural integration
  culturalIntegration: {
    respectSchedulingConstraints: boolean;
    adaptDeliveryTiming: boolean;
    useCulturalContent: boolean;
    includeMultilingualSupport: boolean;
  };

  // Analytics and monitoring
  monitoring: {
    trackDeliverySuccess: boolean;
    analyzeUserPreferences: boolean;
    adaptBasedOnFeedback: boolean;
    generateReports: boolean;
  };
}

export interface DeliveryRequest {
  id: string;
  reminderSchedule: ReminderSchedule;
  
  // Content
  content: {
    medicationName: string;
    dosage: string;
    instructions?: string;
    language: SupportedLanguage;
  };

  // Delivery preferences
  deliveryPreferences: {
    methods: DeliveryMethod[];
    priority: 'low' | 'medium' | 'high' | 'critical';
    culturalAdaptations: boolean;
    elderlyMode: boolean;
  };

  // Context
  context: {
    patientId: string;
    medicationId: string;
    scheduledTime: Date;
    culturalProfile?: any;
    emergencyContacts?: any[];
  };

  // Metadata
  metadata?: Record<string, any>;
}

export interface DeliveryResult {
  requestId: string;
  deliveryTime: Date;
  results: {
    method: DeliveryMethod;
    success: boolean;
    messageId?: string;
    error?: string;
    culturalAdaptations?: string[];
    deliveredAt?: Date;
    userResponse?: 'taken' | 'snoozed' | 'skipped' | 'no_response';
    responseTime?: Date;
  }[];
  overallSuccess: boolean;
  escalationTriggered?: boolean;
  analytics: {
    totalAttempts: number;
    successfulDeliveries: number;
    preferredMethod?: DeliveryMethod;
    culturalOptimizations: string[];
  };
}

export interface DeliveryAnalytics {
  period: { start: Date; end: Date };
  totalDeliveries: number;
  successRate: number;
  
  // Method performance
  methodPerformance: Record<DeliveryMethod, {
    attempts: number;
    successes: number;
    averageResponseTime: number;
    userPreference: number; // percentage of users who prefer this method
  }>;

  // Cultural insights
  culturalInsights: Record<SupportedLanguage, {
    preferredMethods: DeliveryMethod[];
    successRate: number;
    culturalAdaptations: string[];
    userFeedback: any[];
  }>;

  // Integration performance
  integrationMetrics: {
    schedulingAccuracy: number; // how often deliveries match scheduled times
    culturalConstraintRespect: number; // how often cultural constraints were respected
    escalationRate: number; // percentage of deliveries that triggered escalation
  };
}

class MultiModalDeliveryService {
  private static instance: MultiModalDeliveryService;
  private config: MultiModalDeliveryConfig;
  
  // Service dependencies
  private reminderSchedulingService: ReminderSchedulingService;
  private culturalConstraintEngine: CulturalConstraintEngine;
  private smsService: SMSService;
  private voiceService: VoiceReminderService;
  private culturalNotificationService: CulturalNotificationService;
  private priorityService: NotificationPriorityService;

  // Delivery tracking
  private activeDeliveries: Map<string, DeliveryRequest> = new Map();
  private deliveryHistory: Map<string, DeliveryResult> = new Map();
  private userResponses: Map<string, { method: DeliveryMethod; response: string; timestamp: Date }> = new Map();

  private isInitialized = false;

  private constructor() {
    this.config = this.getDefaultConfig();
    
    // Initialize service dependencies
    this.reminderSchedulingService = ReminderSchedulingService.getInstance();
    this.culturalConstraintEngine = CulturalConstraintEngine.getInstance();
    this.smsService = SMSService.getInstance();
    this.voiceService = VoiceReminderService.getInstance();
    this.culturalNotificationService = CulturalNotificationService.getInstance();
    this.priorityService = NotificationPriorityService.getInstance();
  }

  static getInstance(): MultiModalDeliveryService {
    if (!MultiModalDeliveryService.instance) {
      MultiModalDeliveryService.instance = new MultiModalDeliveryService();
    }
    return MultiModalDeliveryService.instance;
  }

  /**
   * Initialize multi-modal delivery service
   */
  async initialize(config?: Partial<MultiModalDeliveryConfig>): Promise<{ success: boolean; error?: string }> {
    try {
      // Load saved configuration
      const savedConfig = await this.loadConfiguration();
      this.config = { ...this.config, ...savedConfig, ...config };

      // Initialize all dependent services
      const initResults = await Promise.allSettled([
        this.smsService.initialize(),
        this.voiceService.initialize(),
        this.culturalNotificationService.initialize(),
        this.priorityService.initialize()
      ]);

      // Check for initialization failures
      const failures = initResults
        .map((result, index) => ({ result, service: ['SMS', 'Voice', 'Cultural', 'Priority'][index] }))
        .filter(({ result }) => result.status === 'rejected')
        .map(({ service, result }) => `${service}: ${(result as PromiseRejectedResult).reason}`);

      if (failures.length > 0) {
        console.warn('Some services failed to initialize:', failures);
      }

      // Set up integration with Stream A scheduling
      await this.setupSchedulingIntegration();

      // Load delivery history and user preferences
      await this.loadDeliveryHistory();
      await this.loadUserPreferences();

      // Start monitoring services
      this.startDeliveryMonitor();
      this.startUserResponseTracker();

      this.isInitialized = true;
      console.log('Multi-Modal Delivery Service initialized successfully');
      return { success: true };

    } catch (error) {
      console.error('Failed to initialize multi-modal delivery service:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Initialization failed' 
      };
    }
  }

  /**
   * Process delivery request from Stream A scheduling
   */
  async processDeliveryRequest(request: DeliveryRequest): Promise<DeliveryResult> {
    if (!this.isInitialized) {
      throw new Error('Multi-modal delivery service not initialized');
    }

    try {
      console.log(`Processing delivery request ${request.id} for medication ${request.content.medicationName}`);

      // Store active delivery
      this.activeDeliveries.set(request.id, request);

      // Evaluate cultural constraints
      const culturalConstraints = await this.evaluateCulturalConstraints(request);
      
      // Determine optimal delivery methods based on user preferences and cultural factors
      const optimizedMethods = await this.optimizeDeliveryMethods(request, culturalConstraints);

      // Execute delivery based on coordination settings
      const deliveryResults = this.config.coordination.simultaneousDelivery
        ? await this.executeSimultaneousDelivery(request, optimizedMethods)
        : await this.executeSequentialDelivery(request, optimizedMethods);

      // Process results and handle escalation if needed
      const result = await this.processDeliveryResults(request, deliveryResults);

      // Store result for analytics
      this.deliveryHistory.set(request.id, result);
      await this.saveDeliveryHistory();

      // Clean up active delivery
      this.activeDeliveries.delete(request.id);

      console.log(`Delivery request ${request.id} processed with overall success: ${result.overallSuccess}`);
      return result;

    } catch (error) {
      console.error(`Failed to process delivery request ${request.id}:`, error);
      
      // Create error result
      const errorResult: DeliveryResult = {
        requestId: request.id,
        deliveryTime: new Date(),
        results: [],
        overallSuccess: false,
        analytics: {
          totalAttempts: 0,
          successfulDeliveries: 0,
          culturalOptimizations: []
        }
      };

      this.deliveryHistory.set(request.id, errorResult);
      this.activeDeliveries.delete(request.id);
      
      return errorResult;
    }
  }

  /**
   * Setup integration with Stream A scheduling engine
   */
  private async setupSchedulingIntegration(): Promise<void> {
    try {
      // Register as delivery handler with the reminder scheduling service
      console.log('Setting up integration with Stream A scheduling engine...');
      
      // In a real implementation, this would register callbacks or event listeners
      // with the ReminderSchedulingService to receive delivery requests
      
      console.log('Stream A scheduling integration configured');
    } catch (error) {
      console.error('Failed to setup scheduling integration:', error);
      throw error;
    }
  }

  /**
   * Evaluate cultural constraints for delivery
   */
  private async evaluateCulturalConstraints(request: DeliveryRequest): Promise<any> {
    try {
      if (!this.config.culturalIntegration.respectSchedulingConstraints) {
        return null;
      }

      // Use the cultural constraint engine from Stream A
      const constraints = await this.culturalConstraintEngine.evaluateConstraints(
        request.reminderSchedule.culturalConstraints,
        request.context.scheduledTime,
        request.content.language
      );

      return constraints;

    } catch (error) {
      console.error('Failed to evaluate cultural constraints:', error);
      return null;
    }
  }

  /**
   * Optimize delivery methods based on context
   */
  private async optimizeDeliveryMethods(
    request: DeliveryRequest,
    culturalConstraints: any
  ): Promise<DeliveryMethod[]> {
    try {
      let methods = [...request.deliveryPreferences.methods];

      // Apply cultural optimizations
      if (this.config.culturalIntegration.adaptDeliveryTiming && culturalConstraints) {
        methods = this.applyCulturalMethodOptimizations(methods, culturalConstraints, request.content.language);
      }

      // Apply user preference learning
      if (this.config.monitoring.adaptBasedOnFeedback) {
        methods = await this.applyUserPreferenceLearning(methods, request.context.patientId);
      }

      // Sort by priority and effectiveness
      methods.sort((a, b) => {
        const aPriority = this.config.deliveryMethods[a].priority;
        const bPriority = this.config.deliveryMethods[b].priority;
        return bPriority - aPriority;
      });

      console.log(`Optimized delivery methods for ${request.id}:`, methods);
      return methods;

    } catch (error) {
      console.error('Failed to optimize delivery methods:', error);
      return request.deliveryPreferences.methods;
    }
  }

  /**
   * Execute simultaneous delivery across all methods
   */
  private async executeSimultaneousDelivery(
    request: DeliveryRequest,
    methods: DeliveryMethod[]
  ): Promise<any[]> {
    console.log(`Executing simultaneous delivery for ${request.id} across methods:`, methods);

    const deliveryPromises = methods.map(method => 
      this.executeDeliveryMethod(request, method)
    );

    const results = await Promise.allSettled(deliveryPromises);
    
    return results.map((result, index) => ({
      method: methods[index],
      success: result.status === 'fulfilled' && result.value.success,
      ...(result.status === 'fulfilled' ? result.value : { error: (result.reason as Error).message })
    }));
  }

  /**
   * Execute sequential delivery with delays
   */
  private async executeSequentialDelivery(
    request: DeliveryRequest,
    methods: DeliveryMethod[]
  ): Promise<any[]> {
    console.log(`Executing sequential delivery for ${request.id} across methods:`, methods);

    const results: any[] = [];

    for (let i = 0; i < methods.length; i++) {
      const method = methods[i];
      
      try {
        const result = await this.executeDeliveryMethod(request, method);
        results.push({
          method,
          success: result.success,
          ...result
        });

        // If confirmation required and delivery succeeded, wait for response
        if (this.config.coordination.confirmationRequired && result.success) {
          const userResponse = await this.waitForUserResponse(request.id, method);
          if (userResponse && userResponse.response === 'taken') {
            console.log(`User confirmed medication taken via ${method}, stopping sequential delivery`);
            break;
          }
        }

        // Add delay before next method (except for last method)
        if (i < methods.length - 1 && this.config.coordination.sequentialDelay > 0) {
          await this.delay(this.config.coordination.sequentialDelay);
        }

      } catch (error) {
        console.error(`Sequential delivery failed for method ${method}:`, error);
        results.push({
          method,
          success: false,
          error: error instanceof Error ? error.message : 'Delivery failed'
        });

        // Continue to next method on failure if failover enabled
        if (!this.config.coordination.failoverEnabled) {
          break;
        }
      }
    }

    return results;
  }

  /**
   * Execute specific delivery method
   */
  private async executeDeliveryMethod(request: DeliveryRequest, method: DeliveryMethod): Promise<any> {
    const startTime = Date.now();

    try {
      switch (method) {
        case 'push':
          return await this.deliverPushNotification(request);
        
        case 'sms':
          return await this.deliverSMS(request);
        
        case 'voice':
          return await this.deliverVoice(request);
        
        case 'visual':
          return await this.deliverVisual(request);
        
        default:
          throw new Error(`Unsupported delivery method: ${method}`);
      }

    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`Delivery method ${method} failed after ${duration}ms:`, error);
      throw error;
    }
  }

  /**
   * Deliver push notification
   */
  private async deliverPushNotification(request: DeliveryRequest): Promise<any> {
    const culturalAdaptations = this.config.culturalIntegration.useCulturalContent
      ? { adaptForElderly: request.deliveryPreferences.elderlyMode }
      : undefined;

    return await this.culturalNotificationService.sendMedicationReminder(
      request.content.medicationName,
      request.content.dosage,
      request.content.language,
      culturalAdaptations
    );
  }

  /**
   * Deliver SMS
   */
  private async deliverSMS(request: DeliveryRequest): Promise<any> {
    // Get patient phone number from context
    const phoneNumber = request.metadata?.phoneNumber || request.context.patientId; // Fallback

    return await this.smsService.sendMedicationReminder(
      phoneNumber,
      request.content.medicationName,
      request.content.dosage,
      request.content.language,
      request.deliveryPreferences.priority
    );
  }

  /**
   * Deliver voice reminder
   */
  private async deliverVoice(request: DeliveryRequest): Promise<any> {
    const culturalContext = request.deliveryPreferences.culturalAdaptations ? {
      adaptForElderly: request.deliveryPreferences.elderlyMode
    } : undefined;

    return await this.voiceService.generateMedicationReminder(
      request.content.medicationName,
      request.content.dosage,
      request.content.language,
      culturalContext
    );
  }

  /**
   * Deliver visual notification
   */
  private async deliverVisual(request: DeliveryRequest): Promise<any> {
    // This would update in-app notification displays
    console.log(`Delivering visual notification for ${request.content.medicationName}`);
    return {
      success: true,
      messageId: `visual_${request.id}`,
      deliveredAt: new Date()
    };
  }

  /**
   * Process delivery results and handle escalation
   */
  private async processDeliveryResults(request: DeliveryRequest, deliveryResults: any[]): Promise<DeliveryResult> {
    const successfulDeliveries = deliveryResults.filter(r => r.success).length;
    const overallSuccess = successfulDeliveries > 0;

    // Check if escalation should be triggered
    let escalationTriggered = false;
    
    if (!overallSuccess && request.deliveryPreferences.priority === 'critical') {
      try {
        console.log(`Triggering emergency escalation for critical medication ${request.content.medicationName}`);
        
        const escalationResult = await this.priorityService.triggerEmergencyEscalation(
          request.context.patientId,
          request.context.medicationId,
          'failed_deliveries',
          {
            patientName: request.metadata?.patientName || 'Patient',
            medicationName: request.content.medicationName,
            language: request.content.language,
            missedDoses: 1,
            additionalInfo: 'All delivery methods failed'
          }
        );

        escalationTriggered = escalationResult.success;

      } catch (error) {
        console.error('Failed to trigger escalation:', error);
      }
    }

    // Determine preferred method based on success and response time
    const preferredMethod = deliveryResults
      .filter(r => r.success)
      .sort((a, b) => (a.responseTime || 0) - (b.responseTime || 0))[0]?.method;

    // Compile cultural optimizations applied
    const culturalOptimizations: string[] = [];
    deliveryResults.forEach(result => {
      if (result.culturalAdaptations) {
        culturalOptimizations.push(...result.culturalAdaptations);
      }
    });

    const result: DeliveryResult = {
      requestId: request.id,
      deliveryTime: new Date(),
      results: deliveryResults.map(r => ({
        method: r.method,
        success: r.success,
        messageId: r.messageId,
        error: r.error,
        culturalAdaptations: r.culturalAdaptations,
        deliveredAt: r.deliveredAt
      })),
      overallSuccess,
      escalationTriggered,
      analytics: {
        totalAttempts: deliveryResults.length,
        successfulDeliveries,
        preferredMethod,
        culturalOptimizations: Array.from(new Set(culturalOptimizations))
      }
    };

    return result;
  }

  /**
   * Apply cultural method optimizations
   */
  private applyCulturalMethodOptimizations(
    methods: DeliveryMethod[],
    culturalConstraints: any,
    language: SupportedLanguage
  ): DeliveryMethod[] {
    // Example: SMS might be preferred during prayer times to avoid audio interruption
    if (culturalConstraints?.isPrayerTime) {
      const reordered = [...methods];
      const smsIndex = reordered.indexOf('sms');
      if (smsIndex > -1) {
        // Move SMS to front
        reordered.splice(smsIndex, 1);
        reordered.unshift('sms');
      }
      return reordered;
    }

    // Example: Voice might be preferred for elderly users
    if (culturalConstraints?.elderlyFriendly) {
      const reordered = [...methods];
      const voiceIndex = reordered.indexOf('voice');
      if (voiceIndex > -1) {
        reordered.splice(voiceIndex, 1);
        reordered.unshift('voice');
      }
      return reordered;
    }

    return methods;
  }

  /**
   * Apply user preference learning
   */
  private async applyUserPreferenceLearning(
    methods: DeliveryMethod[],
    patientId: string
  ): Promise<DeliveryMethod[]> {
    try {
      // Get user's historical response data
      const userHistory = Array.from(this.userResponses.entries())
        .filter(([key]) => key.includes(patientId))
        .map(([, response]) => response);

      if (userHistory.length === 0) {
        return methods;
      }

      // Calculate preference scores for each method
      const methodScores: Record<DeliveryMethod, number> = {
        push: 0,
        sms: 0,
        voice: 0,
        visual: 0
      };

      userHistory.forEach(response => {
        if (response.response === 'taken') {
          methodScores[response.method] += 1;
        }
      });

      // Sort methods by preference score
      const optimized = methods.sort((a, b) => {
        return methodScores[b] - methodScores[a];
      });

      console.log(`Applied user preference learning for ${patientId}:`, methodScores);
      return optimized;

    } catch (error) {
      console.error('Failed to apply user preference learning:', error);
      return methods;
    }
  }

  /**
   * Wait for user response
   */
  private async waitForUserResponse(
    requestId: string,
    method: DeliveryMethod
  ): Promise<{ method: DeliveryMethod; response: string; timestamp: Date } | null> {
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve(null);
      }, this.config.coordination.timeoutPeriod);

      // Set up response listener
      const responseKey = `${requestId}_${method}`;
      const checkResponse = () => {
        const response = this.userResponses.get(responseKey);
        if (response) {
          clearTimeout(timeout);
          resolve(response);
        } else {
          setTimeout(checkResponse, 1000); // Check every second
        }
      };

      checkResponse();
    });
  }

  /**
   * Record user response
   */
  async recordUserResponse(
    requestId: string,
    method: DeliveryMethod,
    response: 'taken' | 'snoozed' | 'skipped'
  ): Promise<void> {
    const responseKey = `${requestId}_${method}`;
    this.userResponses.set(responseKey, {
      method,
      response,
      timestamp: new Date()
    });

    // Update delivery result if it exists
    const deliveryResult = this.deliveryHistory.get(requestId);
    if (deliveryResult) {
      const methodResult = deliveryResult.results.find(r => r.method === method);
      if (methodResult) {
        methodResult.userResponse = response;
        methodResult.responseTime = new Date();
      }
      await this.saveDeliveryHistory();
    }

    console.log(`Recorded user response for ${requestId} via ${method}: ${response}`);
  }

  /**
   * Start delivery monitor
   */
  private startDeliveryMonitor(): void {
    setInterval(async () => {
      await this.monitorActiveDeliveries();
    }, 30000); // Check every 30 seconds
  }

  /**
   * Start user response tracker
   */
  private startUserResponseTracker(): void {
    setInterval(async () => {
      await this.cleanupOldResponses();
    }, 300000); // Clean up every 5 minutes
  }

  /**
   * Monitor active deliveries for timeouts
   */
  private async monitorActiveDeliveries(): Promise<void> {
    const now = Date.now();
    const timeoutPeriod = this.config.coordination.timeoutPeriod;

    for (const [requestId, request] of this.activeDeliveries.entries()) {
      const deliveryTime = request.context.scheduledTime.getTime();
      if (now - deliveryTime > timeoutPeriod) {
        console.warn(`Delivery request ${requestId} timed out`);
        // Handle timeout logic here
      }
    }
  }

  /**
   * Cleanup old user responses
   */
  private async cleanupOldResponses(): Promise<void> {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours ago
    
    for (const [key, response] of this.userResponses.entries()) {
      if (response.timestamp < cutoff) {
        this.userResponses.delete(key);
      }
    }
  }

  /**
   * Get delivery analytics
   */
  async getDeliveryAnalytics(days = 30): Promise<DeliveryAnalytics> {
    try {
      const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const recentDeliveries = Array.from(this.deliveryHistory.values())
        .filter(delivery => delivery.deliveryTime >= cutoff);

      const analytics: DeliveryAnalytics = {
        period: { start: cutoff, end: new Date() },
        totalDeliveries: recentDeliveries.length,
        successRate: 0,
        methodPerformance: {
          push: { attempts: 0, successes: 0, averageResponseTime: 0, userPreference: 0 },
          sms: { attempts: 0, successes: 0, averageResponseTime: 0, userPreference: 0 },
          voice: { attempts: 0, successes: 0, averageResponseTime: 0, userPreference: 0 },
          visual: { attempts: 0, successes: 0, averageResponseTime: 0, userPreference: 0 }
        },
        culturalInsights: {
          en: { preferredMethods: [], successRate: 0, culturalAdaptations: [], userFeedback: [] },
          ms: { preferredMethods: [], successRate: 0, culturalAdaptations: [], userFeedback: [] },
          zh: { preferredMethods: [], successRate: 0, culturalAdaptations: [], userFeedback: [] },
          ta: { preferredMethods: [], successRate: 0, culturalAdaptations: [], userFeedback: [] }
        },
        integrationMetrics: {
          schedulingAccuracy: 95, // Mock data
          culturalConstraintRespect: 98, // Mock data
          escalationRate: 2 // Mock data
        }
      };

      // Calculate actual analytics from delivery history
      let totalSuccessful = 0;
      recentDeliveries.forEach(delivery => {
        if (delivery.overallSuccess) {
          totalSuccessful++;
        }

        delivery.results.forEach(result => {
          const performance = analytics.methodPerformance[result.method];
          performance.attempts++;
          if (result.success) {
            performance.successes++;
          }
        });
      });

      analytics.successRate = recentDeliveries.length > 0 
        ? (totalSuccessful / recentDeliveries.length) * 100 
        : 0;

      // Calculate method success rates
      Object.keys(analytics.methodPerformance).forEach(method => {
        const performance = analytics.methodPerformance[method as DeliveryMethod];
        if (performance.attempts > 0) {
          performance.userPreference = (performance.successes / performance.attempts) * 100;
        }
      });

      return analytics;

    } catch (error) {
      console.error('Failed to generate delivery analytics:', error);
      // Return empty analytics on error
      return {
        period: { start: new Date(), end: new Date() },
        totalDeliveries: 0,
        successRate: 0,
        methodPerformance: {
          push: { attempts: 0, successes: 0, averageResponseTime: 0, userPreference: 0 },
          sms: { attempts: 0, successes: 0, averageResponseTime: 0, userPreference: 0 },
          voice: { attempts: 0, successes: 0, averageResponseTime: 0, userPreference: 0 },
          visual: { attempts: 0, successes: 0, averageResponseTime: 0, userPreference: 0 }
        },
        culturalInsights: {
          en: { preferredMethods: [], successRate: 0, culturalAdaptations: [], userFeedback: [] },
          ms: { preferredMethods: [], successRate: 0, culturalAdaptations: [], userFeedback: [] },
          zh: { preferredMethods: [], successRate: 0, culturalAdaptations: [], userFeedback: [] },
          ta: { preferredMethods: [], successRate: 0, culturalAdaptations: [], userFeedback: [] }
        },
        integrationMetrics: {
          schedulingAccuracy: 0,
          culturalConstraintRespect: 0,
          escalationRate: 0
        }
      };
    }
  }

  /**
   * Utility delay function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Load configuration from storage
   */
  private async loadConfiguration(): Promise<Partial<MultiModalDeliveryConfig>> {
    try {
      const stored = await AsyncStorage.getItem('multimodal_delivery_config');
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Failed to load multi-modal delivery configuration:', error);
      return {};
    }
  }

  /**
   * Save configuration to storage
   */
  async saveConfiguration(config: Partial<MultiModalDeliveryConfig>): Promise<void> {
    try {
      this.config = { ...this.config, ...config };
      await AsyncStorage.setItem('multimodal_delivery_config', JSON.stringify(this.config));
    } catch (error) {
      console.error('Failed to save multi-modal delivery configuration:', error);
      throw error;
    }
  }

  /**
   * Load delivery history from storage
   */
  private async loadDeliveryHistory(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('delivery_history');
      if (stored) {
        const historyData = JSON.parse(stored);
        this.deliveryHistory = new Map(Object.entries(historyData).map(([key, value]: [string, any]) => [
          key,
          {
            ...value,
            deliveryTime: new Date(value.deliveryTime),
            results: value.results.map((r: any) => ({
              ...r,
              deliveredAt: r.deliveredAt ? new Date(r.deliveredAt) : undefined,
              responseTime: r.responseTime ? new Date(r.responseTime) : undefined
            }))
          }
        ]));
      }
    } catch (error) {
      console.error('Failed to load delivery history:', error);
    }
  }

  /**
   * Save delivery history to storage
   */
  private async saveDeliveryHistory(): Promise<void> {
    try {
      const historyData = Object.fromEntries(this.deliveryHistory.entries());
      await AsyncStorage.setItem('delivery_history', JSON.stringify(historyData));
    } catch (error) {
      console.error('Failed to save delivery history:', error);
    }
  }

  /**
   * Load user preferences from storage
   */
  private async loadUserPreferences(): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem('user_delivery_preferences');
      if (stored) {
        const preferencesData = JSON.parse(stored);
        this.userResponses = new Map(Object.entries(preferencesData).map(([key, value]: [string, any]) => [
          key,
          {
            ...value,
            timestamp: new Date(value.timestamp)
          }
        ]));
      }
    } catch (error) {
      console.error('Failed to load user preferences:', error);
    }
  }

  /**
   * Get default configuration
   */
  private getDefaultConfig(): MultiModalDeliveryConfig {
    return {
      deliveryMethods: {
        push: { enabled: true, priority: 10, culturalPreferences: {} },
        sms: { enabled: true, priority: 8, culturalPreferences: {} },
        voice: { enabled: true, priority: 6, culturalPreferences: {} },
        visual: { enabled: true, priority: 4, culturalPreferences: {} }
      },
      coordination: {
        simultaneousDelivery: false,
        sequentialDelay: 300000, // 5 minutes
        failoverEnabled: true,
        confirmationRequired: true,
        timeoutPeriod: 1800000 // 30 minutes
      },
      culturalIntegration: {
        respectSchedulingConstraints: true,
        adaptDeliveryTiming: true,
        useCulturalContent: true,
        includeMultilingualSupport: true
      },
      monitoring: {
        trackDeliverySuccess: true,
        analyzeUserPreferences: true,
        adaptBasedOnFeedback: true,
        generateReports: true
      }
    };
  }

  // Public methods
  getConfiguration(): MultiModalDeliveryConfig {
    return { ...this.config };
  }

  getActiveDeliveries(): DeliveryRequest[] {
    return Array.from(this.activeDeliveries.values());
  }

  getDeliveryHistory(limit = 100): DeliveryResult[] {
    return Array.from(this.deliveryHistory.values())
      .sort((a, b) => b.deliveryTime.getTime() - a.deliveryTime.getTime())
      .slice(0, limit);
  }

  isServiceInitialized(): boolean {
    return this.isInitialized;
  }
}

export default MultiModalDeliveryService;